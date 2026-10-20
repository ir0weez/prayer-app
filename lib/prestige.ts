// Prestige — "Begin Again".
//
// A prestige (a Crown) is earned only through fasting: once Jonathan has
// completed 365 total days of fasting he may reset his town — every
// building on both maps, his spendable coins, his shop stock — and begin
// again with a permanent income multiplier. Each Crown doubles all town
// income (2^level), forever.
//
// The City does not exist until the first Crown: at prestige 0 the city
// map is not rendered at all (unless a save already had it unlocked —
// existing unlocks are grandfathered, never taken away). After the first
// Crown the city becomes the post-prestige endgame: a 50,000-coin unlock,
// 15,000–40,000 plots, and upgrades anchored near 60,000 / 250,000.
//
// The prestige LEVEL lives in the long-standing integer key
// "prayercircle.hometown.prestige.v1" (read by the profile badge and the
// barbershop's new-pawn discount). The completed-fast-days accumulator
// lives in its own key so finished fasts are credited exactly once, even
// if a fast is later edited or deleted.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { isFastCompleted, type PersonalFast } from "./prayercircle-fasting";
import {
  CITY_PLOTS_STORAGE_KEY,
  COINS_STORAGE_KEY,
  MAP_UNLOCKED_KEY,
  TOWN_STORAGE_KEY,
  emptyTownState,
  parseCoins,
  parseUnlockedMaps,
  type HometownCoins,
  type TownMapId,
  type TownState,
} from "./hometown";

export const PRESTIGE_LEVEL_KEY = "prayercircle.hometown.prestige.v1";
export const PRESTIGE_PROGRESS_KEY = "prayercircle.hometown.prestige-days.v1";

/** Completed fast days required per Crown (365 for the first, 730 total for the second, ...). */
export const PRESTIGE_DAYS_PER_CROWN = 365;

/** One-time coin cost to unlock the City once it exists (prestige >= 1). */
export const CITY_UNLOCK_COST = 50000;

// ---- Level ----

export function parsePrestigeLevel(raw: string | null | undefined): number {
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export async function loadPrestigeLevel(): Promise<number> {
  try {
    return parsePrestigeLevel(await AsyncStorage.getItem(PRESTIGE_LEVEL_KEY));
  } catch {
    return 0;
  }
}

export async function savePrestigeLevel(level: number): Promise<void> {
  try {
    await AsyncStorage.setItem(PRESTIGE_LEVEL_KEY, String(Math.max(0, Math.floor(level) || 0)));
  } catch {}
}

/** Permanent income multiplier from Crowns: Crown 1 = x2, Crown 2 = x4, ... */
export function prestigeMultiplier(level: number): number {
  const lv = Math.max(0, Math.floor(level) || 0);
  return Math.pow(2, lv);
}

/** Total completed fast days needed to earn the NEXT Crown at the given level. */
export function daysRequiredForNextCrown(level: number): number {
  return PRESTIGE_DAYS_PER_CROWN * (Math.max(0, Math.floor(level) || 0) + 1);
}

// ---- Completed fast days accumulator ----

export type PrestigeProgress = {
  /** Ids of completed fasts already credited (each fast counts once). */
  countedFastIds: string[];
  /** Sum of the lengths of all credited completed fasts. */
  totalCompletedFastDays: number;
};

export function emptyPrestigeProgress(): PrestigeProgress {
  return { countedFastIds: [], totalCompletedFastDays: 0 };
}

export function parsePrestigeProgress(value: unknown): PrestigeProgress {
  if (!value || typeof value !== "object") return emptyPrestigeProgress();
  const v = value as Partial<PrestigeProgress>;
  return {
    countedFastIds: Array.isArray(v.countedFastIds)
      ? v.countedFastIds.filter((x): x is string => typeof x === "string")
      : [],
    totalCompletedFastDays:
      typeof v.totalCompletedFastDays === "number" && v.totalCompletedFastDays > 0
        ? Math.floor(v.totalCompletedFastDays)
        : 0,
  };
}

export async function loadPrestigeProgress(): Promise<PrestigeProgress> {
  try {
    const raw = await AsyncStorage.getItem(PRESTIGE_PROGRESS_KEY);
    if (!raw) return emptyPrestigeProgress();
    return parsePrestigeProgress(JSON.parse(raw));
  } catch {
    return emptyPrestigeProgress();
  }
}

export async function savePrestigeProgress(p: PrestigeProgress): Promise<void> {
  try {
    await AsyncStorage.setItem(PRESTIGE_PROGRESS_KEY, JSON.stringify(p));
  } catch {}
}

/**
 * Credit any newly COMPLETED fasts (every day marked completed) into the
 * accumulator. Idempotent: a fast id is credited exactly once, so totals
 * only ever grow as more fasts are finished.
 */
export async function syncCompletedFastDays(fasts: PersonalFast[]): Promise<PrestigeProgress> {
  const progress = await loadPrestigeProgress();
  const counted = new Set(progress.countedFastIds);
  let total = progress.totalCompletedFastDays;
  let changed = false;
  for (const fast of fasts) {
    if (!fast || typeof fast.id !== "string" || counted.has(fast.id)) continue;
    if (!isFastCompleted(fast)) continue;
    counted.add(fast.id);
    total += Math.max(0, Math.floor(fast.durationDays) || 0);
    changed = true;
  }
  const next: PrestigeProgress = { countedFastIds: [...counted], totalCompletedFastDays: total };
  if (changed) await savePrestigeProgress(next);
  return next;
}

/** True when the accumulated completed fast days earn the next Crown. */
export function prestigeEligible(level: number, totalCompletedFastDays: number): boolean {
  return totalCompletedFastDays >= daysRequiredForNextCrown(level);
}

/**
 * Whether the City map exists for this player: it appears after the first
 * Crown — or immediately if the save already had it unlocked
 * (grandfathered: an unlocked city is never taken away).
 */
export function cityExists(prestigeLevel: number, unlockedMaps: TownMapId[]): boolean {
  return prestigeLevel >= 1 || unlockedMaps.includes("city");
}

// ---- The reset ----

export type PrestigeResetResult = {
  level: number;
  town: TownState;
  coins: HometownCoins;
  unlockedMaps: TownMapId[];
};

/**
 * Perform "Begin Again": level +1, and the run resets.
 *
 * RESET: every building on BOTH maps (plots back to run start), building
 * stock, purchased city plots, the spendable coin balance, and the City
 * unlock (it must be bought again at the post-prestige price).
 * KEPT: lifetime earnings (milestones), prayer streak, XP/level,
 * collections, Garden of Remembrance, prayer villagers, villager data,
 * owned gear and styles, the other map unlocks, and fast progress.
 */
export async function performPrestigeReset(): Promise<PrestigeResetResult> {
  const level = (await loadPrestigeLevel()) + 1;
  await savePrestigeLevel(level);

  let coins: HometownCoins = { balance: 0, lifetimeEarned: 0 };
  try {
    const raw = await AsyncStorage.getItem(COINS_STORAGE_KEY);
    const prev = parseCoins(raw ? JSON.parse(raw) : {});
    coins = { balance: 0, lifetimeEarned: prev.lifetimeEarned };
    await AsyncStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(coins));
  } catch {}

  const town = emptyTownState();
  try {
    await AsyncStorage.setItem(TOWN_STORAGE_KEY, JSON.stringify(town));
  } catch {}

  try {
    await AsyncStorage.setItem(CITY_PLOTS_STORAGE_KEY, JSON.stringify([]));
  } catch {}

  let unlockedMaps: TownMapId[] = ["town"];
  try {
    const raw = await AsyncStorage.getItem(MAP_UNLOCKED_KEY);
    unlockedMaps = parseUnlockedMaps(raw ? JSON.parse(raw) : null).filter((id) => id !== "city");
    await AsyncStorage.setItem(MAP_UNLOCKED_KEY, JSON.stringify(unlockedMaps));
  } catch {}

  return { level, town, coins, unlockedMaps };
}
