// ---- Pizza Place party features: the animatronic-party upgrades ----
// Per-building-instance feature store, same shape as the restaurant
// furniture pattern (lib/restaurant-interior.ts): three features, tiers
// 0 (not purchased) through 3, each tier adding a small % to THAT
// restaurant's daily income — folded into restaurantInteriorBonus, the
// one income hook every enterable restaurant already flows through.
//
//   stage  — the animatronic band: solo singer → duet → full band.
//            More performers take the stage (and move) per tier.
//   arcade — the cabinet row: 0 → 2 → 4 → 6 cabinets. Token Toss (the
//            arcade mini-game) requires tier ≥ 1.
//   prize  — the prize counter: more shelves of plush per tier.

import AsyncStorage from "@react-native-async-storage/async-storage";

export type PizzaFeatureId = "stage" | "arcade" | "prize";

export type PizzaFeatureDef = {
  id: PizzaFeatureId;
  name: string;
  /** MaterialIcons glyph name (no emoji art). */
  icon: string;
  tierNames: [string, string, string];
  costs: [number, number, number];
  bonusPct: [number, number, number]; // income bonus per tier, in percent
  blurb: string;
};

export const PIZZA_FEATURES: PizzaFeatureDef[] = [
  {
    id: "stage",
    name: "Animatronic Stage",
    icon: "music-note",
    tierNames: ["Solo Singer", "Duet Stage", "Full Band Stage"],
    costs: [250, 600, 1200],
    bonusPct: [4, 8, 12],
    blurb: "A band that plays all day and never takes a break. Each tier puts more performers on stage.",
  },
  {
    id: "arcade",
    name: "Arcade Row",
    icon: "sports-esports",
    tierNames: ["Two Cabinets", "Four Cabinets", "Six Cabinets"],
    costs: [200, 500, 1000],
    bonusPct: [3, 6, 10],
    blurb: "Cabinets humming with tokens, two more per tier. Token Toss opens with the first row.",
  },
  {
    id: "prize",
    name: "Prize Counter",
    icon: "card-giftcard",
    tierNames: ["Prize Shelf", "Prize Counter", "Grand Prize Wall"],
    costs: [150, 400, 800],
    bonusPct: [2, 5, 8],
    blurb: "Plush mountains behind glass. Winners redeem, everybody dreams.",
  },
];

export function pizzaFeature(id: PizzaFeatureId): PizzaFeatureDef {
  return PIZZA_FEATURES.find((f) => f.id === id)!;
}

/** Arcade cabinets standing at a tier: 0 → 0, then two per tier. */
export function arcadeCabinetsForTier(tier: number): number {
  const t = Math.max(0, Math.min(3, Math.floor(tier) || 0));
  return t * 2;
}

// ---- State (per building instance) ----

export type PizzaFeaturesState = {
  features: Record<string, number>; // featureId -> tier 0..3
};

export function pizzaFeaturesKey(buildingId: string): string {
  return `prayercircle.hometown.pizza.${buildingId}.v1`;
}

export function parsePizzaFeatures(value: unknown): PizzaFeaturesState {
  const features: Record<string, number> = {};
  if (value && typeof value === "object") {
    const raw = (value as { features?: unknown }).features;
    if (raw && typeof raw === "object") {
      for (const def of PIZZA_FEATURES) {
        const t = (raw as Record<string, unknown>)[def.id];
        if (typeof t === "number") features[def.id] = Math.max(0, Math.min(3, Math.floor(t)));
      }
    }
  }
  return { features };
}

export async function loadPizzaFeatures(buildingId: string): Promise<PizzaFeaturesState> {
  try {
    const raw = await AsyncStorage.getItem(pizzaFeaturesKey(buildingId));
    return parsePizzaFeatures(raw ? JSON.parse(raw) : null);
  } catch {
    return { features: {} };
  }
}

export async function savePizzaFeatures(buildingId: string, state: PizzaFeaturesState): Promise<void> {
  try {
    await AsyncStorage.setItem(pizzaFeaturesKey(buildingId), JSON.stringify(state));
  } catch {}
}

/** Total income bonus % from owned feature tiers (the one income hook). */
export function pizzaFeaturesBonusPct(state: PizzaFeaturesState): number {
  let pct = 0;
  for (const def of PIZZA_FEATURES) {
    const tier = state.features[def.id] || 0;
    if (tier > 0) pct += def.bonusPct[tier - 1] ?? 0;
  }
  return pct;
}
