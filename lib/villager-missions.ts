// Villager-driven missions: prayer lights get a "?" above their head and ask
// Jonathan for help. 2-5 requests spawn per day, spread across daylight hours —
// never all at once. A light with a waiting request stands still until helped.

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  COINS_STORAGE_KEY,
  parseCoins,
  isRestaurantType,
  type PlacedBuilding,
} from "./hometown";
import { getTimeOfDay } from "./daynight";

export const VILLAGER_MISSIONS_KEY = "prayercircle.hometown.villager-missions.v1";

export type VillagerMissionKind =
  | "church"
  | "barbershop"
  | "restaurant"
  | "garden"
  | "bank"
  | "well";

export type VillagerMissionStatus = "waiting" | "guiding" | "done";

export type VillagerMission = {
  id: string;
  personId: string;
  personName: string;
  kind: VillagerMissionKind;
  targetLabel: string;
  message: string;
  rewardCoins: number;
  rewardXP: number;
  createdAt: string; // ISO
  spawnedSlot: number; // epoch ms of the daily slot that spawned it
  status: VillagerMissionStatus;
};

export const VILLAGER_MISSION_KINDS: Record<
  VillagerMissionKind,
  { message: string; targetLabel: string; rewardCoins: number; rewardXP: number }
> = {
  church: {
    message: "Walk with me to the chapel? I'd like to sit with you a while.",
    targetLabel: "Chapel",
    rewardCoins: 100,
    rewardXP: 8,
  },
  barbershop: {
    message: "I could really use a haircut. Will you come with me to the barbershop?",
    targetLabel: "Barbershop",
    rewardCoins: 100,
    rewardXP: 8,
  },
  restaurant: {
    message: "I'm hungry — will you break bread with me?",
    targetLabel: "Restaurant",
    rewardCoins: 120,
    rewardXP: 8,
  },
  garden: {
    message: "There's someone I want to remember. Walk with me to the garden?",
    targetLabel: "Garden of Remembrance",
    rewardCoins: 140,
    rewardXP: 12,
  },
  bank: {
    message: "I need to stop by the bank. Walk with me?",
    targetLabel: "Bank",
    rewardCoins: 100,
    rewardXP: 8,
  },
  well: {
    message: "I'm thirsty in a deeper way. Come draw water with me at the well?",
    targetLabel: "The Well",
    rewardCoins: 140,
    rewardXP: 12,
  },
};

export type VillagerMissionState = {
  dateKey: string;
  spawnedSlots: number[];
  missions: VillagerMission[];
};

export function villagerMissionDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 2-5 spawn slots spread across 7am–9pm, deterministic per day so every
 * open agrees on today's schedule. Requests arrive through the day, not
 * all at once.
 */
export function rollDailySpawnSlots(dateKey: string, nowMs: number): number[] {
  const rand = mulberry32(hashStr("villager-missions:" + dateKey));
  const count = 2 + Math.floor(rand() * 4); // 2–5
  const d = new Date(nowMs);
  const base = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const slots: number[] = [];
  for (let i = 0; i < count; i++) {
    const hour = 7 + (14 * (i + 0.5)) / count + (rand() - 0.5) * 2;
    slots.push(Math.round(base + hour * 3600000));
  }
  return slots.sort((a, b) => a - b);
}

function isMissionShape(m: unknown): m is VillagerMission {
  return (
    !!m &&
    typeof (m as VillagerMission).id === "string" &&
    typeof (m as VillagerMission).personId === "string" &&
    typeof (m as VillagerMission).kind === "string" &&
    typeof (m as VillagerMission).status === "string"
  );
}

function parseState(value: unknown): VillagerMissionState | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<VillagerMissionState>;
  if (typeof v.dateKey !== "string" || !Array.isArray(v.missions)) return null;
  return {
    dateKey: v.dateKey,
    spawnedSlots: Array.isArray(v.spawnedSlots)
      ? v.spawnedSlots.filter((s): s is number => typeof s === "number")
      : [],
    missions: v.missions.filter(isMissionShape),
  };
}

export async function loadVillagerMissionState(): Promise<VillagerMissionState> {
  const dateKey = villagerMissionDateKey();
  try {
    const raw = await AsyncStorage.getItem(VILLAGER_MISSIONS_KEY);
    const parsed = raw ? parseState(JSON.parse(raw)) : null;
    if (parsed && parsed.dateKey === dateKey) return parsed;
  } catch {}
  return { dateKey, spawnedSlots: [], missions: [] };
}

export async function saveVillagerMissionState(state: VillagerMissionState): Promise<void> {
  try {
    await AsyncStorage.setItem(VILLAGER_MISSIONS_KEY, JSON.stringify(state));
  } catch {}
}

export type VillagerMissionAvailability = {
  church: boolean;
  barbershop: boolean;
  restaurant: boolean;
  garden: boolean;
  bank: boolean;
  well: boolean;
};

/** Find the town building a mission kind points at (null for off-map kinds). */
export function findVillagerTargetBuilding(
  kind: VillagerMissionKind,
  buildings: PlacedBuilding[]
): PlacedBuilding | null {
  switch (kind) {
    case "church":
      return buildings.find((b) => b.type === "church") ?? null;
    case "barbershop":
      return buildings.find((b) => b.type === "barbershop") ?? null;
    case "restaurant":
      return buildings.find((b) => isRestaurantType(b.type)) ?? null;
    case "bank":
      return (
        buildings.find((b) => b.type === "bank") ??
        buildings.find((b) => b.type === "bank-tower") ??
        null
      );
    case "garden":
    case "well":
      return null; // off-map targets — completed by visiting the map
  }
}

/**
 * Spawn missions for any daily slots that have passed. Idempotent via
 * spawnedSlots. Pure w.r.t. persistence — the caller saves the result.
 * No new requests at night; the town is asleep.
 */
export function spawnDueVillagerMissions(args: {
  state: VillagerMissionState;
  nowMs: number;
  dateKey: string;
  lights: { personId: string; name: string }[];
  availability: VillagerMissionAvailability;
  maxActive?: number;
}): { state: VillagerMissionState; spawned: VillagerMission[] } {
  const { nowMs, dateKey, lights, availability } = args;
  const maxActive = args.maxActive ?? 5;
  const state: VillagerMissionState =
    args.state.dateKey === dateKey
      ? args.state
      : { dateKey, spawnedSlots: [], missions: [] };

  if (getTimeOfDay() === "night") return { state, spawned: [] };

  const slots = rollDailySpawnSlots(dateKey, nowMs);
  const due = slots.filter((s) => s <= nowMs && !state.spawnedSlots.includes(s));
  if (due.length === 0) return { state, spawned: [] };

  const spawnedSlots = [...state.spawnedSlots, ...due];
  const kinds = (Object.keys(VILLAGER_MISSION_KINDS) as VillagerMissionKind[]).filter(
    (k) => availability[k]
  );
  const missions = [...state.missions];
  const spawned: VillagerMission[] = [];
  if (kinds.length === 0 || lights.length === 0) {
    return { state: { dateKey, spawnedSlots, missions }, spawned };
  }

  const busyIds = new Set(missions.filter((m) => m.status !== "done").map((m) => m.personId));
  const rand = mulberry32(hashStr("vm-pick:" + dateKey + ":" + nowMs));
  for (const slot of due) {
    if (busyIds.size >= maxActive) continue;
    const eligible = lights.filter(
      (l) => !busyIds.has(l.personId) && !spawned.some((s) => s.personId === l.personId)
    );
    if (eligible.length === 0) continue;
    const light = eligible[Math.floor(rand() * eligible.length)];
    const kind = kinds[Math.floor(rand() * kinds.length)];
    const def = VILLAGER_MISSION_KINDS[kind];
    const mission: VillagerMission = {
      id: `vm-${dateKey}-${slot}-${light.personId}`,
      personId: light.personId,
      personName: light.name,
      kind,
      targetLabel: def.targetLabel,
      message: def.message,
      rewardCoins: def.rewardCoins,
      rewardXP: def.rewardXP,
      createdAt: new Date(nowMs).toISOString(),
      spawnedSlot: slot,
      status: "waiting",
    };
    missions.push(mission);
    spawned.push(mission);
    busyIds.add(light.personId);
  }
  return { state: { dateKey, spawnedSlots, missions }, spawned };
}

export function activeVillagerMissions(missions: VillagerMission[]): VillagerMission[] {
  return missions.filter((m) => m.status !== "done");
}

/** Mark a mission done and award its coins/XP (Charisma-boosted, like lib/missions). */
export async function completeVillagerMission(
  state: VillagerMissionState,
  id: string
): Promise<{ state: VillagerMissionState; mission: VillagerMission | null }> {
  const mission = state.missions.find((m) => m.id === id);
  if (!mission || mission.status === "done") return { state, mission: null };
  const next: VillagerMissionState = {
    ...state,
    missions: state.missions.map((m) => (m.id === id ? { ...m, status: "done" as const } : m)),
  };

  let missionMult = 0;
  try {
    const { refreshStatBoostCache } = await import("./character-stats");
    missionMult = (await refreshStatBoostCache()).missionMult;
  } catch {}

  if (mission.rewardCoins > 0) {
    try {
      const coinsRaw = await AsyncStorage.getItem(COINS_STORAGE_KEY);
      const coins = parseCoins(coinsRaw ? JSON.parse(coinsRaw) : {});
      const boosted = Math.round(mission.rewardCoins * (1 + missionMult));
      await AsyncStorage.setItem(
        COINS_STORAGE_KEY,
        JSON.stringify({
          balance: coins.balance + boosted,
          lifetimeEarned: coins.lifetimeEarned + boosted,
        })
      );
    } catch {}
  }
  if (mission.rewardXP > 0) {
    try {
      const { awardCustomXP } = await import("./xp-engine");
      await awardCustomXP(
        Math.round(mission.rewardXP * (1 + missionMult)),
        `villager-mission:${mission.id}`
      ).catch(() => undefined);
    } catch {}
  }

  await saveVillagerMissionState(next);
  return { state: next, mission: { ...mission, status: "done" } };
}

export async function setVillagerMissionStatus(
  state: VillagerMissionState,
  id: string,
  status: VillagerMissionStatus
): Promise<VillagerMissionState> {
  const next: VillagerMissionState = {
    ...state,
    missions: state.missions.map((m) => (m.id === id ? { ...m, status } : m)),
  };
  await saveVillagerMissionState(next);
  return next;
}
