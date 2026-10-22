// Hometown missions: popup tasks that reward coins/XP.
// Generic enough for bank, school, and future building types.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { PEOPLE_STORAGE_KEY } from "./prayercircle-storage";
import { getPrayerCheckInPeople, type Person } from "./prayercircle-data";
import { applyCoinsDelta } from "./hometown";

// Daily popup missions ONLY. Field missions (lib/hometown.ts) used to
// share this exact key and both systems wiped each other's records on
// every save — they now live under "prayercircle.hometown.field-missions.v1".
export const MISSIONS_STORAGE_KEY = "prayercircle.hometown.missions.v1";

export type MissionType = "reach-out" | "bank-visit" | "school-study";

export type Mission = {
  id: string;
  type: MissionType;
  title: string;
  description: string;
  rewardCoins: number;
  rewardXP: number;
  createdAt: string; // ISO
  expiresAt: string; // ISO
  completed: boolean;
  // For reach-out: the person to contact
  personId?: string;
  personName?: string;
};

function parseMissions(value: unknown): Mission[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (m): m is Mission =>
      m && typeof m.id === "string" && typeof m.title === "string" && typeof m.completed === "boolean"
  );
}

export async function loadMissions(): Promise<Mission[]> {
  try {
    const raw = await AsyncStorage.getItem(MISSIONS_STORAGE_KEY);
    if (!raw) return [];
    // Drop expired missions
    const now = Date.now();
    const missions = parseMissions(JSON.parse(raw));
    const active = missions.filter((m) => new Date(m.expiresAt).getTime() > now || m.completed);
    return active;
  } catch {
    return [];
  }
}

async function saveMissions(missions: Mission[]): Promise<void> {
  try {
    await AsyncStorage.setItem(MISSIONS_STORAGE_KEY, JSON.stringify(missions));
  } catch {}
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function endOfDayISO(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function missionId(prefix: string, suffix: string): string {
  return `${prefix}-${todayISO()}-${suffix}`;
}

/**
 * Generate today's missions. Idempotent: won't duplicate missions already created today.
 * - reach-out: one per person not reached in 14+ days (max 3), 10 coins each
 * - bank-visit: open your bank interior, 5 coins
 * - school-study: open the school map, 25 XP
 */
export async function generateDailyMissions(): Promise<Mission[]> {
  const existing = await loadMissions();
  const today = todayISO();
  const hasToday = (prefix: string) => existing.some((m) => m.id.startsWith(`${prefix}-${today}`));

  const fresh: Mission[] = [];
  const expiresAt = endOfDayISO();

  // Reach-out missions from prayer check-in people (14+ days)
  if (!hasToday("reach-out")) {
    try {
      const peopleRaw = await AsyncStorage.getItem(PEOPLE_STORAGE_KEY);
      const people: Person[] = peopleRaw ? JSON.parse(peopleRaw) : [];
      const overdue = getPrayerCheckInPeople(people, today, 14).slice(0, 3);
      for (const p of overdue) {
        // Skip if already have a reach-out for this person today
        if (existing.some((m) => m.type === "reach-out" && m.personId === p.id && m.id.startsWith(`reach-out-${today}`))) continue;
        fresh.push({
          id: missionId("reach-out", p.id),
          type: "reach-out",
          title: `Reach out to ${p.name?.split(" ")[0] || "them"}`,
          description: `${p.name} hasn't been reached in 14+ days. Send a prayer, a text, or give them a call.`,
          rewardCoins: 100,
          rewardXP: 0,
          createdAt: new Date().toISOString(),
          expiresAt,
          completed: false,
          personId: p.id,
          personName: p.name,
        });
      }
    } catch {}
  }

  // Bank visit mission
  if (!hasToday("bank-visit")) {
    fresh.push({
      id: missionId("bank-visit", "daily"),
      type: "bank-visit",
      title: "Check in at your bank",
      description: "Open your bank interior and review your desk network.",
      rewardCoins: 50,
      rewardXP: 0,
      createdAt: new Date().toISOString(),
      expiresAt,
      completed: false,
    });
  }

  // School study mission
  if (!hasToday("school-study")) {
    fresh.push({
      id: missionId("school-study", "daily"),
      type: "school-study",
      title: "Study session",
      description: "Visit your school map and collect XP from your classrooms.",
      rewardCoins: 0,
      rewardXP: 25,
      createdAt: new Date().toISOString(),
      expiresAt,
      completed: false,
    });
  }

  if (fresh.length > 0) {
    const next = [...existing, ...fresh];
    await saveMissions(next);
    return next;
  }
  return existing;
}

export function pendingMissions(missions: Mission[]): Mission[] {
  const now = Date.now();
  return missions.filter((m) => !m.completed && new Date(m.expiresAt).getTime() > now);
}

/**
 * Mark a mission complete and award its coins/XP.
 * Returns the updated mission list.
 */
export async function completeMission(id: string): Promise<Mission[]> {
  const missions = await loadMissions();
  const mission = missions.find((m) => m.id === id);
  if (!mission || mission.completed) return missions;

  mission.completed = true;

  // Charisma boosts mission rewards (cached stat boosts; refresh best-effort).
  let missionMult = 0;
  try {
    const { refreshStatBoostCache } = await import("./character-stats");
    missionMult = (await refreshStatBoostCache()).missionMult;
  } catch {}

  // Award coins — via the canonical ledger (v167): a serialized delta
  // against the freshest stored record.
  if (mission.rewardCoins > 0) {
    try {
      const boostedCoins = Math.round(mission.rewardCoins * (1 + missionMult));
      await applyCoinsDelta(boostedCoins, "none");
    } catch {}
  }

  // Award XP via xp-engine (lazy import to avoid cycles)
  if (mission.rewardXP > 0) {
    try {
      const { awardCustomXP } = await import("./xp-engine");
      const boostedXP = Math.round(mission.rewardXP * (1 + missionMult));
      await awardCustomXP(boostedXP, `mission:${mission.id}`).catch(() => undefined);
    } catch {}
  }

  await saveMissions(missions);
  return missions;
}
