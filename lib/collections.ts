// Collections for Hometown — fish species, demon bestiary, flower types.
//
// Completing a set pays a bonus (coins + XP + title). Uncaught entries show
// as silhouettes in the collection book.

export const COLLECTIONS_STORAGE_KEY = "prayercircle.hometown.collections.v1";

import { ALL_DEMON_NAMES } from "./dark-forest";

export type CollectionSetId = "fish" | "demons" | "flowers";

/* ---------------- Fish species (River of Life) ---------------- */

export type FishRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type FishSpecies = {
  id: string;
  name: string;
  rarity: FishRarity;
  /** Relative catch weight. */
  weight: number;
  color: string;
};

export const FISH_SPECIES: FishSpecies[] = [
  { id: "bluegill", name: "Bluegill", rarity: "common", weight: 30, color: "#60A5FA" },
  { id: "perch", name: "River Perch", rarity: "common", weight: 28, color: "#34D399" },
  { id: "catfish", name: "Catfish", rarity: "common", weight: 25, color: "#94A3B8" },
  { id: "bass", name: "Largemouth Bass", rarity: "uncommon", weight: 18, color: "#4ADE80" },
  { id: "trout", name: "Golden Trout", rarity: "uncommon", weight: 15, color: "#FBBF24" },
  { id: "salmon", name: "Silver Salmon", rarity: "rare", weight: 10, color: "#C0C7D1" },
  { id: "koi", name: "Crystal Koi", rarity: "rare", weight: 8, color: "#F9A8D4" },
  { id: "moonfish", name: "Moonfish", rarity: "epic", weight: 5, color: "#A78BFA" },
  { id: "riverking", name: "River King", rarity: "epic", weight: 3, color: "#F97316" },
  { id: "leviathan", name: "Leviathan's Kin", rarity: "legendary", weight: 1, color: "#22D3EE" },
];

export const FISH_BY_ID: Record<string, FishSpecies> = Object.fromEntries(FISH_SPECIES.map((f) => [f.id, f]));

export const RARITY_COLORS: Record<FishRarity, string> = {
  common: "#6B7280",
  uncommon: "#16A34A",
  rare: "#2563EB",
  epic: "#9333EA",
  legendary: "#D97706",
};

/** Weighted random species for a catch. */
export function randomFishSpecies(rng: () => number = Math.random): FishSpecies {
  const total = FISH_SPECIES.reduce((s, f) => s + f.weight, 0);
  let roll = rng() * total;
  for (const f of FISH_SPECIES) {
    roll -= f.weight;
    if (roll <= 0) return f;
  }
  return FISH_SPECIES[0];
}

/* ---------------- Flowers (Garden of Remembrance) ---------------- */

export const FLOWER_KINDS = [
  { kind: 0, name: "Rose" },
  { kind: 1, name: "Lily" },
  { kind: 2, name: "Sunflower" },
  { kind: 3, name: "Violet" },
  { kind: 4, name: "Carnation" },
  { kind: 5, name: "Forget-me-not" },
] as const;

/* ---------------- Set metadata ---------------- */

export type CollectionSetMeta = {
  id: CollectionSetId;
  name: string;
  icon: string; // MaterialIcons name
  total: number;
  rewardCoins: number;
  rewardXp: number;
  rewardTitle: string;
};

export const COLLECTION_SETS: Record<CollectionSetId, CollectionSetMeta> = {
  fish: { id: "fish", name: "River Fish", icon: "phishing", total: FISH_SPECIES.length, rewardCoins: 1500, rewardXp: 75, rewardTitle: "Master Angler" },
  demons: { id: "demons", name: "Demon Bestiary", icon: "bug-report", total: ALL_DEMON_NAMES.length, rewardCoins: 2000, rewardXp: 100, rewardTitle: "Demonbane" },
  flowers: { id: "flowers", name: "Garden Flowers", icon: "local-florist", total: FLOWER_KINDS.length, rewardCoins: 1000, rewardXp: 50, rewardTitle: "Master Gardener" },
};

/* ---------------- State ---------------- */

export type CollectionState = {
  fish: string[];
  demons: string[];
  flowers: number[];
  /** Set ids that already paid their completion reward. */
  completedSets: CollectionSetId[];
  /** Titles earned from completed sets. */
  titles: string[];
};

export function emptyCollections(): CollectionState {
  return { fish: [], demons: [], flowers: [], completedSets: [], titles: [] };
}

export async function loadCollections(): Promise<CollectionState> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem(COLLECTIONS_STORAGE_KEY);
    if (!raw) return emptyCollections();
    const s = JSON.parse(raw);
    const base = emptyCollections();
    return {
      fish: Array.isArray(s.fish) ? s.fish.filter((x: unknown) => typeof x === "string") : base.fish,
      demons: Array.isArray(s.demons) ? s.demons.filter((x: unknown) => typeof x === "string") : base.demons,
      flowers: Array.isArray(s.flowers) ? s.flowers.filter((x: unknown) => typeof x === "number") : base.flowers,
      completedSets: Array.isArray(s.completedSets) ? s.completedSets.filter((x: unknown) => x === "fish" || x === "demons" || x === "flowers") : [],
      titles: Array.isArray(s.titles) ? s.titles.filter((x: unknown) => typeof x === "string") : [],
    };
  } catch {
    return emptyCollections();
  }
}

export async function saveCollections(s: CollectionState): Promise<void> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

export type CollectionUpdate = {
  state: CollectionState;
  /** True when this entry was new (not already collected). */
  isNew: boolean;
  /** Set that just completed (reward not yet paid — caller pays it). */
  justCompleted: CollectionSetId | null;
};

function withCompletion(state: CollectionState, setId: CollectionSetId, count: number): CollectionUpdate {
  const meta = COLLECTION_SETS[setId];
  const justCompleted = count >= meta.total && !state.completedSets.includes(setId) ? setId : null;
  const next: CollectionState = justCompleted
    ? {
        ...state,
        completedSets: [...state.completedSets, setId],
        titles: state.titles.includes(meta.rewardTitle) ? state.titles : [...state.titles, meta.rewardTitle],
      }
    : state;
  return { state: next, isNew: true, justCompleted };
}

export async function recordFishCatch(speciesId: string): Promise<CollectionUpdate> {
  const state = await loadCollections();
  if (state.fish.includes(speciesId)) return { state, isNew: false, justCompleted: null };
  const next = { ...state, fish: [...state.fish, speciesId] };
  const result = withCompletion(next, "fish", next.fish.length);
  await saveCollections(result.state);
  return result;
}

export async function recordDemonDefeat(demonName: string): Promise<CollectionUpdate> {
  const state = await loadCollections();
  if (state.demons.includes(demonName)) return { state, isNew: false, justCompleted: null };
  const next = { ...state, demons: [...state.demons, demonName] };
  const result = withCompletion(next, "demons", next.demons.length);
  await saveCollections(result.state);
  return result;
}

export async function recordFlowerPlanted(kind: number): Promise<CollectionUpdate> {
  const state = await loadCollections();
  if (state.flowers.includes(kind)) return { state, isNew: false, justCompleted: null };
  const next = { ...state, flowers: [...state.flowers, kind] };
  const result = withCompletion(next, "flowers", next.flowers.length);
  await saveCollections(result.state);
  return result;
}
