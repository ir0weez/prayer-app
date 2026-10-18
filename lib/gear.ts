// Pawn gear system: clothes, armor, weapons, tools.
// Purchasable/equipable items with visual + stat boosts.
// Gear shops come in four flavors, each a placeable Hometown building.

import AsyncStorage from "@react-native-async-storage/async-storage";

export type GearType = "clothes" | "armor" | "weapon" | "tool";

export type GearBoost = {
  /** e.g. 0.15 = +15% XP */
  xpMult?: number;
  /** e.g. 0.25 = +25% coins */
  coinMult?: number;
  /** bonus max hearts */
  hearts?: number;
};

export type GearVisual = {
  bodyColor?: string;
  pattern?: "stripes" | "dots" | "belt" | "collar";
};

export type GearItem = {
  id: string;
  name: string;
  type: GearType;
  /** Material icon name */
  icon: string;
  /** cost in town coins (0 = free) */
  cost: number;
  /** fast days required to unlock (0 = none) */
  unlockDays: number;
  /** XP level required to unlock (0/undefined = none) */
  unlockLevel?: number;
  /** shop building level required for this item to appear (1-3) */
  minShopLevel: 1 | 2 | 3;
  description: string;
  boost: GearBoost;
  visual: GearVisual;
};

export const GEAR_INVENTORY_KEY = "prayercircle.gear.inventory.v1";
export const GEAR_EQUIPPED_KEY = "prayercircle.gear.equipped.v1";

export const GEAR_CATALOG: GearItem[] = [
  // ---- Clothes (visual on the cylindrical body) ----
  {
    id: "tunic",
    name: "Simple Tunic",
    type: "clothes",
    icon: "checkroom",
    cost: 0,
    unlockDays: 0,
    minShopLevel: 1,
    description: "A humble tunic. Every journey starts somewhere.",
    boost: {},
    visual: { bodyColor: "#D6C9A8" },
  },
  {
    id: "cloak",
    name: "Traveler's Cloak",
    type: "clothes",
    icon: "checkroom",
    cost: 20,
    unlockDays: 0,
    minShopLevel: 1,
    description: "A weathered cloak for the long road.",
    boost: {},
    visual: { bodyColor: "#4A5568", pattern: "collar" },
  },
  {
    id: "royal-robe",
    name: "Royal Robe",
    type: "clothes",
    icon: "workspace-premium",
    cost: 100,
    unlockDays: 40,
    minShopLevel: 2,
    description: "Fit for one who has walked 40 days in faith.",
    boost: {},
    visual: { bodyColor: "#6D28D9", pattern: "belt" },
  },
  {
    id: "shadow-garb",
    name: "Shadow Garb",
    type: "clothes",
    icon: "nightlight",
    cost: 200,
    unlockDays: 100,
    minShopLevel: 3,
    description: "Woven from a hundred days of discipline.",
    boost: {},
    visual: { bodyColor: "#1F2937", pattern: "stripes" },
  },
  // ---- Level-gated clothes (unlock by XP level) ----
  {
    id: "wayfarers-cloak",
    name: "Wayfarer's Cloak",
    type: "clothes",
    icon: "hiking",
    cost: 40,
    unlockDays: 0,
    unlockLevel: 10,
    minShopLevel: 1,
    description: "For the road ahead. +5% XP.",
    boost: { xpMult: 0.05 },
    visual: { bodyColor: "#8B5A2B", pattern: "collar" },
  },
  {
    id: "shepherds-robe",
    name: "Shepherd's Robe",
    type: "clothes",
    icon: "spa",
    cost: 80,
    unlockDays: 0,
    unlockLevel: 20,
    minShopLevel: 1,
    description: "Gentle and watchful. +1 max heart.",
    boost: { hearts: 1 },
    visual: { bodyColor: "#A8A29E", pattern: "belt" },
  },
  {
    id: "festival-garments",
    name: "Festival Garments",
    type: "clothes",
    icon: "celebration",
    cost: 150,
    unlockDays: 0,
    unlockLevel: 30,
    minShopLevel: 2,
    description: "Woven for days of joy. +10% town coins.",
    boost: { coinMult: 0.1 },
    visual: { bodyColor: "#EC4899", pattern: "dots" },
  },
  {
    id: "royal-blue-tunic",
    name: "Royal Blue Tunic",
    type: "clothes",
    icon: "workspace-premium",
    cost: 250,
    unlockDays: 0,
    unlockLevel: 40,
    minShopLevel: 2,
    description: "Bold as the deep sea. +10% XP.",
    boost: { xpMult: 0.1 },
    visual: { bodyColor: "#1D4ED8", pattern: "belt" },
  },
  {
    id: "white-linen-robe",
    name: "White Linen Robe",
    type: "clothes",
    icon: "wb-sunny",
    cost: 400,
    unlockDays: 0,
    unlockLevel: 50,
    minShopLevel: 2,
    description: "Pure and unburdened. +1 max heart, +5% XP.",
    boost: { hearts: 1, xpMult: 0.05 },
    visual: { bodyColor: "#FEFCE8", pattern: "collar" },
  },
  {
    id: "embroidered-vestments",
    name: "Embroidered Vestments",
    type: "clothes",
    icon: "auto-awesome",
    cost: 600,
    unlockDays: 0,
    unlockLevel: 60,
    minShopLevel: 3,
    description: "Every stitch a prayer. +15% town coins.",
    boost: { coinMult: 0.15 },
    visual: { bodyColor: "#7C3AED", pattern: "dots" },
  },
  {
    id: "golden-sash",
    name: "Golden Sash",
    type: "clothes",
    icon: "military-tech",
    cost: 900,
    unlockDays: 0,
    unlockLevel: 75,
    minShopLevel: 3,
    description: "Honor bound in gold. +15% XP, +10% town coins.",
    boost: { xpMult: 0.15, coinMult: 0.1 },
    visual: { bodyColor: "#F59E0B", pattern: "stripes" },
  },
  {
    id: "radiant-robes",
    name: "Radiant Robes",
    type: "clothes",
    icon: "flare",
    cost: 1500,
    unlockDays: 0,
    unlockLevel: 100,
    minShopLevel: 3,
    description: "Clothed in light itself. +2 max hearts, +20% XP, +15% town coins.",
    boost: { hearts: 2, xpMult: 0.2, coinMult: 0.15 },
    visual: { bodyColor: "#FDE68A", pattern: "stripes" },
  },
  // ---- Armor (+hearts) ----
  {
    id: "cloth-guard",
    name: "Cloth Guard",
    type: "armor",
    icon: "shield",
    cost: 30,
    unlockDays: 0,
    minShopLevel: 1,
    description: "Padded cloth. +1 max heart.",
    boost: { hearts: 1 },
    visual: {},
  },
  {
    id: "iron-plate",
    name: "Iron Plate",
    type: "armor",
    icon: "security",
    cost: 150,
    unlockDays: 40,
    minShopLevel: 2,
    description: "Forged resolve. +2 max hearts.",
    boost: { hearts: 2 },
    visual: {},
  },
  // ---- Weapons (+XP) ----
  {
    id: "wooden-staff",
    name: "Wooden Staff",
    type: "weapon",
    icon: "hiking",
    cost: 25,
    unlockDays: 0,
    minShopLevel: 1,
    description: "A pilgrim's staff. +5% XP.",
    boost: { xpMult: 0.05 },
    visual: {},
  },
  {
    id: "steel-sword",
    name: "Steel Sword",
    type: "weapon",
    icon: "swords",
    cost: 120,
    unlockDays: 40,
    minShopLevel: 2,
    description: "Sharpened by 40 days. +15% XP.",
    boost: { xpMult: 0.15 },
    visual: {},
  },
  {
    id: "dawnblade",
    name: "Dawnblade",
    type: "weapon",
    icon: "bolt",
    cost: 300,
    unlockDays: 100,
    minShopLevel: 3,
    description: "A blade of first light. +30% XP.",
    boost: { xpMult: 0.3 },
    visual: {},
  },
  // ---- Tools (+coins) ----
  {
    id: "copper-pick",
    name: "Copper Pick",
    type: "tool",
    icon: "construction",
    cost: 40,
    unlockDays: 0,
    minShopLevel: 1,
    description: "Digs a little deeper. +10% town coins.",
    boost: { coinMult: 0.1 },
    visual: {},
  },
  {
    id: "golden-trowel",
    name: "Golden Trowel",
    type: "tool",
    icon: "handyman",
    cost: 180,
    unlockDays: 40,
    minShopLevel: 2,
    description: "Builds with intention. +25% town coins.",
    boost: { coinMult: 0.25 },
    visual: {},
  },
];

export const GEAR_BY_ID: Record<string, GearItem> = Object.fromEntries(
  GEAR_CATALOG.map((g) => [g.id, g])
);

/** Building type that sells each gear type. */
export const GEAR_SHOP_BUILDINGS: Record<GearType, "clothes-shop" | "armory" | "weaponsmith" | "toolshop"> = {
  clothes: "clothes-shop",
  armor: "armory",
  weapon: "weaponsmith",
  tool: "toolshop",
};

/**
 * Level of the placed shop building for a gear type across all maps (0 when none placed).
 * Better gear unlocks as the shop is upgraded.
 */
export async function shopLevelFor(type: GearType): Promise<number> {
  const { shopBuildingLevel } = await import("@/lib/hometown");
  return shopBuildingLevel(GEAR_SHOP_BUILDINGS[type]);
}

export const GEAR_TYPE_META: Record<GearType, { title: string; route: string }> = {
  clothes: { title: "Clothes Shop", route: "/gear-shop?type=clothes" },
  armor: { title: "Armory", route: "/gear-shop?type=armor" },
  weapon: { title: "Weaponsmith", route: "/gear-shop?type=weapon" },
  tool: { title: "Tool Shop", route: "/gear-shop?type=tool" },
};

export async function loadInventory(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(GEAR_INVENTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export async function saveInventory(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(GEAR_INVENTORY_KEY, JSON.stringify(ids));
}

export type EquippedGear = Record<GearType, string | null>;

export function defaultEquipped(): EquippedGear {
  return { clothes: null, armor: null, weapon: null, tool: null };
}

export async function loadEquipped(): Promise<EquippedGear> {
  try {
    const raw = await AsyncStorage.getItem(GEAR_EQUIPPED_KEY);
    if (!raw) return defaultEquipped();
    const parsed = JSON.parse(raw) as Partial<EquippedGear>;
    return {
      clothes: typeof parsed.clothes === "string" ? parsed.clothes : null,
      armor: typeof parsed.armor === "string" ? parsed.armor : null,
      weapon: typeof parsed.weapon === "string" ? parsed.weapon : null,
      tool: typeof parsed.tool === "string" ? parsed.tool : null,
    };
  } catch {
    return defaultEquipped();
  }
}

export async function saveEquipped(equipped: EquippedGear): Promise<void> {
  await AsyncStorage.setItem(GEAR_EQUIPPED_KEY, JSON.stringify(equipped));
}

/** True when the player's current fast day meets the item's unlock requirement. */
export function isUnlocked(item: GearItem, fastDay: number): boolean {
  return fastDay >= item.unlockDays;
}

export type TotalBoosts = { xpMult: number; coinMult: number; hearts: number };

/** Sums boosts across equipped items. Multipliers are additive (e.g. 0.05 + 0.15 = +20%). */
export function totalBoosts(equipped: EquippedGear): TotalBoosts {
  let xpMult = 0;
  let coinMult = 0;
  let hearts = 0;
  (Object.keys(equipped) as GearType[]).forEach((slot) => {
    const id = equipped[slot];
    if (!id) return;
    const item = GEAR_BY_ID[id];
    if (!item) return;
    xpMult += item.boost.xpMult || 0;
    coinMult += item.boost.coinMult || 0;
    hearts += item.boost.hearts || 0;
  });
  return { xpMult, coinMult, hearts };
}

// ---- Sync cache for hot paths (xp-engine, hometown income) ----
// These run in pure/sync contexts, so gear boosts are cached in memory and
// refreshed whenever inventory/equipment changes or the app boots.

let cachedBoosts: TotalBoosts = { xpMult: 0, coinMult: 0, hearts: 0 };

export function getCachedBoosts(): TotalBoosts {
  return cachedBoosts;
}

export async function refreshGearBoostCache(): Promise<TotalBoosts> {
  const equipped = await loadEquipped();
  cachedBoosts = totalBoosts(equipped);
  return cachedBoosts;
}
