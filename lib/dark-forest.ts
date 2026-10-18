// Dark Forest: a pixel-art demon-battling mini game.
// Your pawn's equipped gear is your power — better blades and armor
// let you push deeper into the wood. Demons scale per wave.

import AsyncStorage from "@react-native-async-storage/async-storage";

export const DARK_FOREST_KEY = "prayercircle.hometown.darkforest.v1";
export const DARK_FOREST_UNLOCK_COST = 1500;

export type DemonDef = {
  name: string;
  hp: number;
  attack: number;
  coins: number;
  xp: number;
  /** 0 = lesser, 1 = greater, 2 = nightmare — picks the sprite palette */
  tier: 0 | 1 | 2;
};

const LESSER_NAMES = [
  "Gloom Imp",
  "Murk Crawler",
  "Ash Sprite",
  "Dusk Nibbler",
  "Pale Whisper",
];
const GREATER_NAMES = [
  "Shadow Stalker",
  "Dread Hound",
  "Wail Wraith",
  "Thorn Mauler",
  "Grief Eater",
];
const NIGHTMARE_NAMES = [
  "Nightmare Lord",
  "Abyss Tyrant",
  "Eclipse Fiend",
  "The Hollow King",
  "Doombringer",
];

/** Wave 1 is the first demon. Everything scales from there. */
export function demonForWave(wave: number): DemonDef {
  const w = Math.max(1, Math.floor(wave));
  const tier: 0 | 1 | 2 = w >= 15 ? 2 : w >= 7 ? 1 : 0;
  const names = tier === 2 ? NIGHTMARE_NAMES : tier === 1 ? GREATER_NAMES : LESSER_NAMES;
  return {
    name: names[(w - 1) % names.length],
    hp: Math.round(30 * Math.pow(1.24, w - 1)),
    attack: Math.round(6 * Math.pow(1.14, w - 1)),
    coins: Math.round(6 + w * 4),
    xp: Math.round(12 + w * 6),
    tier,
  };
}

export type DarkForestState = {
  /** Highest wave cleared. Wave highestWave + 1 is the current challenge. */
  highestWave: number;
};

export function defaultDarkForestState(): DarkForestState {
  return { highestWave: 0 };
}

export async function loadDarkForestState(): Promise<DarkForestState> {
  try {
    const raw = await AsyncStorage.getItem(DARK_FOREST_KEY);
    if (!raw) return defaultDarkForestState();
    const parsed = JSON.parse(raw) as Partial<DarkForestState>;
    const highestWave =
      typeof parsed.highestWave === "number" && parsed.highestWave >= 0
        ? Math.floor(parsed.highestWave)
        : 0;
    return { highestWave };
  } catch {
    return defaultDarkForestState();
  }
}

export async function saveDarkForestState(state: DarkForestState): Promise<void> {
  try {
    await AsyncStorage.setItem(DARK_FOREST_KEY, JSON.stringify(state));
  } catch {
    // Progress loss is unfortunate but never fatal.
  }
}
