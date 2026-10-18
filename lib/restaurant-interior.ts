// ---- Restaurant Interiors: enterable restaurants with tiered furniture ----
// Fixed-slot furniture pattern (same shape as pawn-house rooms): each slot has
// tiers 0 (not purchased) through 3, and each tier adds a small income bonus
// to its restaurant.

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BuildingType } from "./hometown";

/** Restaurant building types that have an enterable interior. */
export const RESTAURANT_INTERIOR_TYPES: BuildingType[] = [
  "pizza-place",
  "burger-joint",
  "taco-stand",
  "sushi-bar",
  "diner",
  "upper-room",
  "banquet-table",
  "manna-house",
  "feast-hall",
];

export function isEnterableRestaurant(type: BuildingType): boolean {
  return (RESTAURANT_INTERIOR_TYPES as string[]).includes(type);
}

export type RestaurantSlot = {
  id: string;
  name: string;
  icon: string;
  tierNames: [string, string, string];
  costs: [number, number, number];
  bonusPct: [number, number, number]; // income multiplier per tier, in percent
  blurb: string;
  decor?: boolean;
};

export const RESTAURANT_SLOTS: RestaurantSlot[] = [
  {
    id: "tables",
    name: "Tables",
    icon: "🍽️",
    tierNames: ["Wooden Tables", "Oak Tables", "Mahogany Tables"],
    costs: [30, 70, 130],
    bonusPct: [5, 10, 15],
    blurb: "Room for more guests to gather and break bread.",
  },
  {
    id: "kitchen",
    name: "Kitchen",
    icon: "🔥",
    tierNames: ["Home Kitchen", "Brick Oven", "Chef's Kitchen"],
    costs: [40, 90, 160],
    bonusPct: [5, 10, 15],
    blurb: "Better food, happier villagers, fuller baskets.",
  },
  {
    id: "chairs",
    name: "Chairs",
    icon: "🪑",
    tierNames: ["Stools", "Cushioned Chairs", "Banquet Chairs"],
    costs: [20, 55, 110],
    bonusPct: [3, 6, 10],
    blurb: "Comfort keeps guests a little longer.",
  },
  {
    id: "stringlights",
    name: "String Lights",
    icon: "✨",
    tierNames: ["String Lights", "Lantern Strings", "Golden Lanterns"],
    costs: [25, 60, 120],
    bonusPct: [2, 4, 6],
    blurb: "Warm light draws a crowd in the evening.",
    decor: true,
  },
  {
    id: "wallart",
    name: "Wall Art",
    icon: "🖼️",
    tierNames: ["Simple Mural", "Fresco Wall", "Stained-Glass Mural"],
    costs: [25, 60, 120],
    bonusPct: [2, 4, 6],
    blurb: "Stories on the wall people remember.",
    decor: true,
  },
];

export function restaurantSlot(id: string): RestaurantSlot {
  return RESTAURANT_SLOTS.find((s) => s.id === id)!;
}

// ---- State (per building) ----

export type RestaurantInteriorState = {
  furniture: Record<string, number>; // slotId -> tier 0..3
};

export function restaurantInteriorKey(buildingId: string): string {
  return `prayercircle.hometown.restaurant.${buildingId}.v1`;
}

export function parseRestaurantInterior(value: unknown): RestaurantInteriorState {
  const furniture: Record<string, number> = {};
  if (value && typeof value === "object") {
    const raw = (value as any).furniture;
    if (raw && typeof raw === "object") {
      for (const slot of RESTAURANT_SLOTS) {
        const t = raw[slot.id];
        if (typeof t === "number") furniture[slot.id] = Math.max(0, Math.min(3, Math.floor(t)));
      }
    }
  }
  return { furniture };
}

export async function loadRestaurantInterior(buildingId: string): Promise<RestaurantInteriorState> {
  try {
    const raw = await AsyncStorage.getItem(restaurantInteriorKey(buildingId));
    return parseRestaurantInterior(raw ? JSON.parse(raw) : null);
  } catch {
    return { furniture: {} };
  }
}

export async function saveRestaurantInterior(buildingId: string, state: RestaurantInteriorState): Promise<void> {
  try {
    await AsyncStorage.setItem(restaurantInteriorKey(buildingId), JSON.stringify(state));
  } catch {}
}

/** Income multiplier from interior furniture: 1 + sum(tier bonus %). */
export async function restaurantInteriorBonus(buildingId: string): Promise<{ mult: number }> {
  try {
    const state = await loadRestaurantInterior(buildingId);
    let bonusPct = 0;
    for (const slot of RESTAURANT_SLOTS) {
      const tier = state.furniture[slot.id] || 0;
      if (tier > 0) bonusPct += slot.bonusPct[tier - 1] ?? 0;
    }
    return { mult: 1 + bonusPct / 100 };
  } catch {
    return { mult: 1 };
  }
}
