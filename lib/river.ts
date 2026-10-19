// River of Life: a riverside camp map where the pawn and villagers fish.
// Cast a line by hand (no auto-fishing), catch up to a daily limit, and
// sell the catch for coins. Upgrading the camp raises the daily catch cap
// and the price per fish.

import AsyncStorage from "@react-native-async-storage/async-storage";

export const RIVER_KEY = "prayercircle.hometown.river.v1";

export type RiverLevel = 1 | 2 | 3;

export type RiverState = {
  level: RiverLevel;
  /** Day the catch was last recorded, YYYY-MM-DD. */
  day: string;
  /** Fish caught today (resets at a new day). */
  caughtToday: number;
  /** Fish currently in the creel, ready to sell. */
  creel: number;
};

export type RiverLevelInfo = {
  /** How many fish may be caught per day. */
  fishPerDay: number;
  /** Coins paid per fish when sold. */
  coinPerFish: number;
  /** Cost to upgrade to the next level (0 = maxed). */
  upgradeCost: number;
};

export const RIVER_LEVELS: Record<RiverLevel, RiverLevelInfo> = {
  1: { fishPerDay: 5, coinPerFish: 3, upgradeCost: 800 },
  2: { fishPerDay: 8, coinPerFish: 5, upgradeCost: 1200 },
  3: { fishPerDay: 12, coinPerFish: 8, upgradeCost: 0 },
};

export const RIVER_LEVEL_NAMES: Record<RiverLevel, string> = {
  1: "Riverside Camp",
  2: "Fishing Outpost",
  3: "Riverside Retreat",
};

/** Flavor names for a caught fish. */
export const RIVER_FISH_NAMES = [
  "Bluegill",
  "Catfish",
  "Largemouth Bass",
  "Golden Trout",
  "River Perch",
] as const;

/** A fish name chosen at random for flavor on catch. */
export function randomFishName(): string {
  const i = Math.floor(Math.random() * RIVER_FISH_NAMES.length);
  return RIVER_FISH_NAMES[i];
}

export function todayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function defaultRiverState(): RiverState {
  return { level: 1, day: todayString(), caughtToday: 0, creel: 0 };
}

/** If the stored day is not today, reset the daily catch count. */
export function newDayCheck(state: RiverState): RiverState {
  const today = todayString();
  if (state.day !== today) {
    return { ...state, day: today, caughtToday: 0, creel: 0 };
  }
  return state;
}

export async function loadRiverState(): Promise<RiverState> {
  try {
    const raw = await AsyncStorage.getItem(RIVER_KEY);
    if (!raw) return defaultRiverState();
    const parsed = JSON.parse(raw) as Partial<RiverState>;
    const level: RiverLevel =
      parsed.level === 2 || parsed.level === 3 ? parsed.level : 1;
    const day =
      typeof parsed.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.day)
        ? parsed.day
        : todayString();
    const caughtToday =
      typeof parsed.caughtToday === "number" && parsed.caughtToday >= 0
        ? Math.floor(parsed.caughtToday)
        : 0;
    const creel =
      typeof parsed.creel === "number" && parsed.creel >= 0
        ? Math.floor(parsed.creel)
        : 0;
    return newDayCheck({ level, day, caughtToday, creel });
  } catch {
    return defaultRiverState();
  }
}

export async function saveRiverState(state: RiverState): Promise<void> {
  try {
    await AsyncStorage.setItem(RIVER_KEY, JSON.stringify(state));
  } catch {
    // Progress loss is unfortunate but never fatal.
  }
}
