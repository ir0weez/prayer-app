// Villager single-location: ONE villager exists on exactly ONE map at a
// time (Jonathan's ruling, 2026-10-21 — his whole roster was glowing on
// the School map at once, including people on work shifts in town).
//
// This module is the single source of truth for where everyone is:
//   - A villager on a work shift is PINNED to the shift's map (every work
//     site stands in town today) and renders nowhere else until the shift
//     is done. When it ends they stay on that map.
//   - A villager away on a field mission is at the Mission Field — their
//     location, for the mission's whole span.
//   - While a schedule event with villagers is live, its cast is summoned
//     to the event's map (town) for the event's span.
//   - Everyone else is an idle villager with a home-for-now: they render
//     only on their current map, and may *casually* drift to another map
//     every few hours — settled lazily from timestamps on load/render,
//     exactly like construction. NO background timers.
//   - The hero is exempt (he is the player; he renders where the player
//     is looking) and has no record here.
//
// Every consumer reads this truth: the per-map render lists in
// app/hometown.tsx, presence-gated income (live positions come only from
// the map being viewed; the time-away proxy counts villagers located on
// the building's own map), villager-request spawns, and the Main Office
// roster's plain-words status.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { TOWN_MAP_IDS, type FieldMission, type TownMapId } from "./hometown";
import type { VillagerWorkAssignment } from "./villager-work";

export const VILLAGER_LOCATIONS_KEY = "prayercircle.hometown.villager-locations.v1";

export type VillagerLocationRecord = {
  /** The one map this villager is on. */
  map: TownMapId;
  /** When they arrived on that map (epoch ms). */
  setAt: number;
  /** Earliest time an idle villager may casually drift on (epoch ms). */
  nextDriftAt: number;
};

export type VillagerLocations = Record<string, VillagerLocationRecord>;

/** Where a villager with no record yet belongs: home. */
export const HOME_MAP: TownMapId = "town";
/** Every work site (garden, farm, bank, restaurant, church route) stands
 *  on the town map — a shift pins its villager there. */
export const WORK_MAP: TownMapId = "town";
/** Field missions are sent from — and return to — the Mission Field. */
export const MISSION_MAP: TownMapId = "reserve";
/** Maps whose scenes render ambient villagers. A villager located on any
 *  other map is somewhere with its own scene (Mission Field, the Garden)
 *  and is never drawn wandering elsewhere. */
export const AMBIENT_MAPS: TownMapId[] = ["town", "city", "school"];

/** An idle villager stranded on a non-ambient map (no active reason to be
 *  there) strolls back to town after this long. */
export const RETURN_HOME_MS = 30 * 60 * 1000;

/** How long an idle villager stays put before a casual drift: 2–6 hours,
 *  seeded per villager + arrival so every settle agrees. */
export const DRIFT_MIN_MS = 2 * 60 * 60 * 1000;
export const DRIFT_SPAN_MS = 4 * 60 * 60 * 1000;
/** When a due drift roll says "stay", the next chance is 1–3 hours out. */
export const DRIFT_RETRY_MIN_MS = 60 * 60 * 1000;
export const DRIFT_RETRY_SPAN_MS = 2 * 60 * 60 * 1000;
/** Chance a due idle villager actually wanders off (vs. staying put). */
export const DRIFT_CHANCE = 0.6;

/** Where a drifting villager is likely to go, by map (town is home). */
const DRIFT_WEIGHTS: Partial<Record<TownMapId, number>> = {
  town: 55,
  city: 25,
  school: 20,
};

// ---- deterministic randomness (same FNV + mulberry pattern as
// lib/villager-missions.ts, so settles on different screens agree) ----

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rand01(seed: string): number {
  let a = hashStr(seed) >>> 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Seeded 2–6h "stay a while" span for a villager who arrived at setAt. */
export function driftDelayMs(personId: string, setAt: number): number {
  return DRIFT_MIN_MS + Math.floor(rand01(`drift:${personId}:${setAt}`) * DRIFT_SPAN_MS);
}

function driftRetryMs(personId: string, setAt: number): number {
  return (
    DRIFT_RETRY_MIN_MS + Math.floor(rand01(`retry:${personId}:${setAt}`) * DRIFT_RETRY_SPAN_MS)
  );
}

function pickDriftDestination(
  personId: string,
  setAt: number,
  candidates: TownMapId[]
): TownMapId | null {
  if (candidates.length === 0) return null;
  const total = candidates.reduce((s, m) => s + (DRIFT_WEIGHTS[m] ?? 10), 0);
  let r = rand01(`dest:${personId}:${setAt}`) * total;
  for (const m of candidates) {
    r -= DRIFT_WEIGHTS[m] ?? 10;
    if (r <= 0) return m;
  }
  return candidates[candidates.length - 1];
}

// ---- storage ----

function isLocationRecord(v: unknown): v is VillagerLocationRecord {
  if (!v || typeof v !== "object") return false;
  const r = v as Partial<VillagerLocationRecord>;
  return (
    typeof r.map === "string" &&
    (TOWN_MAP_IDS as string[]).includes(r.map) &&
    typeof r.setAt === "number" &&
    Number.isFinite(r.setAt) &&
    typeof r.nextDriftAt === "number" &&
    Number.isFinite(r.nextDriftAt)
  );
}

export function parseVillagerLocations(value: unknown): VillagerLocations {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: VillagerLocations = {};
  for (const [personId, rec] of Object.entries(value as Record<string, unknown>)) {
    if (isLocationRecord(rec)) {
      out[personId] = { map: rec.map, setAt: rec.setAt, nextDriftAt: rec.nextDriftAt };
    }
  }
  return out;
}

export async function loadVillagerLocations(): Promise<VillagerLocations> {
  try {
    const raw = await AsyncStorage.getItem(VILLAGER_LOCATIONS_KEY);
    if (raw) return parseVillagerLocations(JSON.parse(raw));
  } catch {}
  return {};
}

export async function saveVillagerLocations(locations: VillagerLocations): Promise<void> {
  try {
    await AsyncStorage.setItem(VILLAGER_LOCATIONS_KEY, JSON.stringify(locations));
  } catch {}
}

// ---- reads ----

/** The one map this villager is on (no record yet = home in town). */
export function villagerMapOf(locations: VillagerLocations, personId: string): TownMapId {
  return locations[personId]?.map ?? HOME_MAP;
}

/** The render list for one map: only the lights who are actually there. */
export function lightsForMap<T extends { personId: string }>(
  lights: T[],
  locations: VillagerLocations,
  map: TownMapId
): T[] {
  return lights.filter((l) => villagerMapOf(locations, l.personId) === map);
}

/** How many of the given people are located on one map (the time-away
 *  presence proxy reads this — a building's villagers are its own map's). */
export function locatedCountOnMap(
  locations: VillagerLocations,
  personIds: Iterable<string>,
  map: TownMapId
): number {
  let n = 0;
  for (const id of personIds) {
    if (villagerMapOf(locations, id) === map) n++;
  }
  return n;
}

/** Plain-words place phrase for the roster: "in Town", "at School", … */
export function locationPhrase(map: TownMapId): string {
  switch (map) {
    case "town":
      return "in Town";
    case "city":
      return "in the City";
    case "school":
      return "at School";
    case "mall":
      return "at the Garden";
    case "reserve":
      return "at the Mission Field";
    case "well":
      return "at The Well";
    case "river":
      return "by the River";
    case "forest":
      return "in the Dark Forest";
  }
}

// ---- settle ----

export type VillagerLocationInputs = {
  /** Today's villagers (everyone with a possible record). */
  people: Array<{ personId: string }>;
  /** The shared work ledger (map + office write the same assignments). */
  assignments: VillagerWorkAssignment[];
  /** Field missions, collected ones included (they no longer pin). */
  fieldMissions: FieldMission[];
  /** While a schedule event with villagers is live: its cast (the event
   *  summons them to the event's map — town — for its span). */
  scenePersonIds?: Iterable<string> | null;
  /** When the live scene ends (keeps the cast put until then). */
  sceneEndsAtMs?: number;
  unlockedMaps: TownMapId[];
  nowMs: number;
  isNight: boolean;
};

function sameRecord(a: VillagerLocationRecord | undefined, b: VillagerLocationRecord): boolean {
  return !!a && a.map === b.map && a.setAt === b.setAt && a.nextDriftAt === b.nextDriftAt;
}

/**
 * Settle every villager's location from timestamps. Pure — the caller
 * saves when `changed`. Precedence: work shift > field mission > live
 * scene summons > casual drift. Records for people not prayed today are
 * carried through untouched (they resume where they were when prayed
 * again); a person with no record starts at home in town — except a
 * worker, whose first record is already their shift's map.
 */
export function settleVillagerLocations(
  stored: VillagerLocations,
  inputs: VillagerLocationInputs
): { locations: VillagerLocations; changed: boolean } {
  const { nowMs } = inputs;
  const out: VillagerLocations = { ...stored };
  let changed = false;

  const activeWork = new Map<string, VillagerWorkAssignment>();
  for (const a of inputs.assignments) {
    if (a.status !== "done") activeWork.set(a.personId, a);
  }
  const awayOnMission = new Map<string, FieldMission>();
  for (const m of inputs.fieldMissions) {
    if (!m.collected) awayOnMission.set(m.personId, m);
  }
  const sceneCast = inputs.scenePersonIds ? new Set(inputs.scenePersonIds) : null;
  const unlockedAmbient = AMBIENT_MAPS.filter((m) => inputs.unlockedMaps.includes(m));

  for (const person of inputs.people) {
    const pid = person.personId;
    const prev: VillagerLocationRecord | undefined = stored[pid];
    const base: VillagerLocationRecord =
      prev ?? { map: HOME_MAP, setAt: nowMs, nextDriftAt: nowMs + driftDelayMs(pid, nowMs) };
    let next: VillagerLocationRecord = base;

    const work = activeWork.get(pid);
    const mission = awayOnMission.get(pid);
    if (work) {
      // Pinned to the shift's map for the whole shift; the casual-drift
      // clock only starts when the shift ends.
      const driftAfter = work.endsAt + driftDelayMs(pid, base.setAt);
      next =
        base.map === WORK_MAP
          ? { ...base, nextDriftAt: driftAfter }
          : { map: WORK_MAP, setAt: nowMs, nextDriftAt: driftAfter };
    } else if (mission) {
      // Away at the Mission Field until the mission is collected; the
      // drift clock starts after they were due back.
      const returnMs = Date.parse(mission.returnAt);
      const driftAfter =
        (Number.isFinite(returnMs) ? returnMs : nowMs) + driftDelayMs(pid, base.setAt);
      next =
        base.map === MISSION_MAP
          ? { ...base, nextDriftAt: driftAfter }
          : { map: MISSION_MAP, setAt: nowMs, nextDriftAt: driftAfter };
    } else if (sceneCast && sceneCast.has(pid)) {
      // Summoned to the event (events gather in town): they are there for
      // the event's span, and stay there when it ends.
      const driftAfter = (inputs.sceneEndsAtMs ?? nowMs) + driftDelayMs(pid, base.setAt);
      next =
        base.map === HOME_MAP
          ? { ...base, nextDriftAt: Math.max(base.nextDriftAt, driftAfter) }
          : { map: HOME_MAP, setAt: nowMs, nextDriftAt: driftAfter };
    } else if (!AMBIENT_MAPS.includes(base.map)) {
      // Idle on a map with no ambient life and no reason to be there —
      // stroll home shortly after arriving (safety net; the pins above
      // are the only ways to land on such a map).
      if (nowMs - base.setAt >= RETURN_HOME_MS) {
        next = { map: HOME_MAP, setAt: nowMs, nextDriftAt: nowMs + driftDelayMs(pid, nowMs) };
      }
    } else if (!inputs.isNight && nowMs >= base.nextDriftAt) {
      // A casual crossing, maybe: hours, not minutes, and never at night
      // (the town is asleep — nobody relocates in the dark).
      const candidates = unlockedAmbient.filter((m) => m !== base.map);
      const roll = rand01(`roll:${pid}:${base.setAt}`);
      const dest = roll < DRIFT_CHANCE ? pickDriftDestination(pid, base.setAt, candidates) : null;
      next = dest
        ? { map: dest, setAt: nowMs, nextDriftAt: nowMs + driftDelayMs(pid, nowMs) }
        : { ...base, nextDriftAt: nowMs + driftRetryMs(pid, base.setAt) };
    }

    if (!sameRecord(prev, next)) {
      out[pid] = next;
      changed = true;
    }
  }

  return { locations: out, changed };
}

/** Load → settle → save (only when something moved). Every screen that
 *  shows villagers calls this with its freshest inputs, so the truth is
 *  the same wherever Jonathan looks. */
export async function settleAndSaveVillagerLocations(
  inputs: VillagerLocationInputs
): Promise<{ locations: VillagerLocations; changed: boolean }> {
  const stored = await loadVillagerLocations();
  const settled = settleVillagerLocations(stored, inputs);
  if (settled.changed) await saveVillagerLocations(settled.locations);
  return settled;
}
