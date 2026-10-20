// Pawn gear system: clothes, armor, weapons, tools.
// Purchasable/equipable items with visual + stat boosts.
// Gear shops come in four flavors, each a placeable Hometown building.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { badgeGearMultipliers, getCachedBadges } from "./badges";

export type GearType = "clothes" | "armor" | "weapon" | "tool";

export type GearBoost = {
  /** e.g. 0.15 = +15% XP */
  xpMult?: number;
  /** e.g. 0.25 = +25% coins */
  coinMult?: number;
  /** bonus max hearts */
  hearts?: number;
  /** Dark Forest combat: attack power (weapons) */
  attack?: number;
  /** Dark Forest combat: damage reduction (armor) */
  defense?: number;
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
  /** Prestige Crowns required to unlock (0/undefined = none) */
  unlockPrestige?: number;
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
  // ---- Armor (+hearts, +defense for the Dark Forest) ----
  {
    id: "cloth-guard",
    name: "Cloth Guard",
    type: "armor",
    icon: "shield",
    cost: 30,
    unlockDays: 0,
    minShopLevel: 1,
    description: "Padded cloth. +1 max heart.",
    boost: { hearts: 1, defense: 2 },
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
    boost: { hearts: 2, defense: 5 },
    visual: {},
  },
  {
    id: "chainmail-vest",
    name: "Chainmail Vest",
    type: "armor",
    icon: "shield",
    cost: 300,
    unlockDays: 100,
    minShopLevel: 2,
    description: "Rings of interlocked steel. +3 max hearts.",
    boost: { hearts: 3, defense: 9 },
    visual: {},
  },
  {
    id: "mithril-plate",
    name: "Mithril Plate",
    type: "armor",
    icon: "security",
    cost: 700,
    unlockDays: 200,
    minShopLevel: 3,
    description: "Light as faith, hard as truth. +4 max hearts.",
    boost: { hearts: 4, defense: 14 },
    visual: {},
  },
  {
    id: "celestial-bulwark",
    name: "Celestial Bulwark",
    type: "armor",
    icon: "workspace-premium",
    cost: 1400,
    unlockDays: 300,
    minShopLevel: 3,
    description: "A shield of heaven itself. +5 max hearts.",
    boost: { hearts: 5, defense: 20 },
    visual: {},
  },
  // ---- Weapons (+XP, +attack for the Dark Forest) ----
  {
    id: "wooden-staff",
    name: "Wooden Staff",
    type: "weapon",
    icon: "hiking",
    cost: 25,
    unlockDays: 0,
    minShopLevel: 1,
    description: "A pilgrim's staff. +5% XP.",
    boost: { xpMult: 0.05, attack: 8 },
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
    boost: { xpMult: 0.15, attack: 18 },
    visual: {},
  },
  {
    id: "iron-sword",
    name: "Iron Sword",
    type: "weapon",
    icon: "swords",
    cost: 250,
    unlockDays: 100,
    minShopLevel: 2,
    description: "A soldier's blade. +20% XP.",
    boost: { xpMult: 0.2, attack: 26 },
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
    boost: { xpMult: 0.3, attack: 34 },
    visual: {},
  },
  {
    id: "runeblade",
    name: "Runeblade",
    type: "weapon",
    icon: "bolt",
    cost: 600,
    unlockDays: 200,
    minShopLevel: 3,
    description: "Etched with words of power. +40% XP.",
    boost: { xpMult: 0.4, attack: 46 },
    visual: {},
  },
  {
    id: "seraphim-edge",
    name: "Seraphim Edge",
    type: "weapon",
    icon: "flare",
    cost: 1400,
    unlockDays: 300,
    minShopLevel: 3,
    description: "It burns with holy fire. +50% XP.",
    boost: { xpMult: 0.5, attack: 62 },
    visual: {},
  },
  // ---- Prestige tiers (Crown-gated, post-prestige endgame gear) ----
  // Crown 1 — Gilded: gold-trimmed, forged for those who began again.
  {
    id: "gilded-blade",
    name: "Gilded Blade",
    type: "weapon",
    icon: "swords",
    cost: 25000,
    unlockDays: 0,
    unlockPrestige: 1,
    minShopLevel: 3,
    description: "Gold along the edge, steel in the heart. +60% XP.",
    boost: { xpMult: 0.6, attack: 84 },
    visual: {},
  },
  {
    id: "gilded-aegis",
    name: "Gilded Aegis",
    type: "armor",
    icon: "shield",
    cost: 25000,
    unlockDays: 0,
    unlockPrestige: 1,
    minShopLevel: 3,
    description: "Trimmed in gold, proof against the dark. +6 max hearts.",
    boost: { hearts: 6, defense: 27 },
    visual: {},
  },
  {
    id: "gilded-raiment",
    name: "Gilded Raiment",
    type: "clothes",
    icon: "workspace-premium",
    cost: 25000,
    unlockDays: 0,
    unlockPrestige: 1,
    minShopLevel: 3,
    description: "Deep crimson, edged with gold thread. +20% town coins.",
    boost: { coinMult: 0.2 },
    visual: { bodyColor: "#7F1D1D", pattern: "belt" },
  },
  // Crown 2 — Radiant: glowing accents, light worked into the metal.
  {
    id: "radiant-blade",
    name: "Radiant Blade",
    type: "weapon",
    icon: "flare",
    cost: 120000,
    unlockDays: 0,
    unlockPrestige: 2,
    minShopLevel: 3,
    description: "It shines in the dark places. +75% XP.",
    boost: { xpMult: 0.75, attack: 118 },
    visual: {},
  },
  {
    id: "radiant-aegis",
    name: "Radiant Aegis",
    type: "armor",
    icon: "security",
    cost: 120000,
    unlockDays: 0,
    unlockPrestige: 2,
    minShopLevel: 3,
    description: "Light lives in this steel. +8 max hearts.",
    boost: { hearts: 8, defense: 38 },
    visual: {},
  },
  {
    id: "radiant-raiment",
    name: "Radiant Raiment",
    type: "clothes",
    icon: "flare",
    cost: 120000,
    unlockDays: 0,
    unlockPrestige: 2,
    minShopLevel: 3,
    description: "Sky-blue, luminous at the seams. +30% town coins, +10% XP.",
    boost: { coinMult: 0.3, xpMult: 0.1 },
    visual: { bodyColor: "#0EA5E9", pattern: "stripes" },
  },
  // Crown 3 — Heavenly: the summit. Nothing above this.
  {
    id: "heavenly-blade",
    name: "Heavenly Blade",
    type: "weapon",
    icon: "auto-awesome",
    cost: 500000,
    unlockDays: 0,
    unlockPrestige: 3,
    minShopLevel: 3,
    description: "A sword from the armory above. +100% XP.",
    boost: { xpMult: 1.0, attack: 165 },
    visual: {},
  },
  {
    id: "heavenly-aegis",
    name: "Heavenly Aegis",
    type: "armor",
    icon: "workspace-premium",
    cost: 500000,
    unlockDays: 0,
    unlockPrestige: 3,
    minShopLevel: 3,
    description: "The shield of the morning. +10 max hearts.",
    boost: { hearts: 10, defense: 54 },
    visual: {},
  },
  {
    id: "heavenly-raiment",
    name: "Heavenly Raiment",
    type: "clothes",
    icon: "auto-awesome",
    cost: 500000,
    unlockDays: 0,
    unlockPrestige: 3,
    minShopLevel: 3,
    description: "White and gold, like the city to come. +50% town coins, +25% XP.",
    boost: { coinMult: 0.5, xpMult: 0.25 },
    visual: { bodyColor: "#FFFBEB", pattern: "stripes" },
  },
  // Crown 4 — Powers: the ladder climbs past Heavenly. Each tier's stats
  // grow ~x1.35 over the last; prices triple per tier (income doubles per
  // Crown, so a tier is always a stretch, never a wall).
  {
    id: "powers-blade",
    name: "Powers Blade",
    type: "weapon",
    icon: "bolt",
    cost: 1500000,
    unlockDays: 0,
    unlockPrestige: 4,
    minShopLevel: 3,
    description: "Authority made edge. +120% XP.",
    boost: { xpMult: 1.2, attack: 223 },
    visual: {},
  },
  {
    id: "powers-aegis",
    name: "Powers Aegis",
    type: "armor",
    icon: "security",
    cost: 1500000,
    unlockDays: 0,
    unlockPrestige: 4,
    minShopLevel: 3,
    description: "Broad pauldrons, a ruler's crest. +12 max hearts.",
    boost: { hearts: 12, defense: 73 },
    visual: {},
  },
  {
    id: "powers-raiment",
    name: "Powers Raiment",
    type: "clothes",
    icon: "military-tech",
    cost: 1500000,
    unlockDays: 0,
    unlockPrestige: 4,
    minShopLevel: 3,
    description: "Deep violet, banded in bright steel. +65% town coins, +35% XP.",
    boost: { coinMult: 0.65, xpMult: 0.35 },
    visual: { bodyColor: "#4C1D95", pattern: "belt" },
  },
  // Crown 5 — Virtues.
  {
    id: "virtues-blade",
    name: "Virtues Blade",
    type: "weapon",
    icon: "flare",
    cost: 4500000,
    unlockDays: 0,
    unlockPrestige: 5,
    minShopLevel: 3,
    description: "It hums a clean note when swung. +145% XP.",
    boost: { xpMult: 1.45, attack: 301 },
    visual: {},
  },
  {
    id: "virtues-aegis",
    name: "Virtues Aegis",
    type: "armor",
    icon: "shield",
    cost: 4500000,
    unlockDays: 0,
    unlockPrestige: 5,
    minShopLevel: 3,
    description: "Tempered in mercy, proof against wrath. +14 max hearts.",
    boost: { hearts: 14, defense: 98 },
    visual: {},
  },
  {
    id: "virtues-raiment",
    name: "Virtues Raiment",
    type: "clothes",
    icon: "spa",
    cost: 4500000,
    unlockDays: 0,
    unlockPrestige: 5,
    minShopLevel: 3,
    description: "Sea-green, calm as still water. +80% town coins, +45% XP.",
    boost: { coinMult: 0.8, xpMult: 0.45 },
    visual: { bodyColor: "#065F46", pattern: "collar" },
  },
  // Crown 6 — Dominions.
  {
    id: "dominions-blade",
    name: "Dominions Blade",
    type: "weapon",
    icon: "swords",
    cost: 13500000,
    unlockDays: 0,
    unlockPrestige: 6,
    minShopLevel: 3,
    description: "Kingdoms have knelt to less. +170% XP.",
    boost: { xpMult: 1.7, attack: 406 },
    visual: {},
  },
  {
    id: "dominions-aegis",
    name: "Dominions Aegis",
    type: "armor",
    icon: "security",
    cost: 13500000,
    unlockDays: 0,
    unlockPrestige: 6,
    minShopLevel: 3,
    description: "A crowned helm over a lord's plate. +16 max hearts.",
    boost: { hearts: 16, defense: 133 },
    visual: {},
  },
  {
    id: "dominions-raiment",
    name: "Dominions Raiment",
    type: "clothes",
    icon: "workspace-premium",
    cost: 13500000,
    unlockDays: 0,
    unlockPrestige: 6,
    minShopLevel: 3,
    description: "Midnight blue under a mantle of rule. +100% town coins, +60% XP.",
    boost: { coinMult: 1.0, xpMult: 0.6 },
    visual: { bodyColor: "#1E3A8A", pattern: "belt" },
  },
  // Crown 7 — Thrones.
  {
    id: "thrones-blade",
    name: "Thrones Blade",
    type: "weapon",
    icon: "bolt",
    cost: 40500000,
    unlockDays: 0,
    unlockPrestige: 7,
    minShopLevel: 3,
    description: "Judgment, carried lightly. +200% XP.",
    boost: { xpMult: 2.0, attack: 549 },
    visual: {},
  },
  {
    id: "thrones-aegis",
    name: "Thrones Aegis",
    type: "armor",
    icon: "shield",
    cost: 40500000,
    unlockDays: 0,
    unlockPrestige: 7,
    minShopLevel: 3,
    description: "A high collar like a seat of judgment. +18 max hearts.",
    boost: { hearts: 18, defense: 179 },
    visual: {},
  },
  {
    id: "thrones-raiment",
    name: "Thrones Raiment",
    type: "clothes",
    icon: "military-tech",
    cost: 40500000,
    unlockDays: 0,
    unlockPrestige: 7,
    minShopLevel: 3,
    description: "Scarlet and gold, woven heavy. +120% town coins, +75% XP.",
    boost: { coinMult: 1.2, xpMult: 0.75 },
    visual: { bodyColor: "#7F1D1D", pattern: "stripes" },
  },
  // Crown 8 — Cherubim.
  {
    id: "cherubim-blade",
    name: "Cherubim Blade",
    type: "weapon",
    icon: "flare",
    cost: 121500000,
    unlockDays: 0,
    unlockPrestige: 8,
    minShopLevel: 3,
    description: "A winged guard for a blade of fire. +235% XP.",
    boost: { xpMult: 2.35, attack: 741 },
    visual: {},
  },
  {
    id: "cherubim-aegis",
    name: "Cherubim Aegis",
    type: "armor",
    icon: "security",
    cost: 121500000,
    unlockDays: 0,
    unlockPrestige: 8,
    minShopLevel: 3,
    description: "Feathered wings fold over the shoulders. +20 max hearts.",
    boost: { hearts: 20, defense: 242 },
    visual: {},
  },
  {
    id: "cherubim-raiment",
    name: "Cherubim Raiment",
    type: "clothes",
    icon: "auto-awesome",
    cost: 121500000,
    unlockDays: 0,
    unlockPrestige: 8,
    minShopLevel: 3,
    description: "Rose and pearl, bright at the edges. +145% town coins, +90% XP.",
    boost: { coinMult: 1.45, xpMult: 0.9 },
    visual: { bodyColor: "#9D174D", pattern: "dots" },
  },
  // Crown 9 — Seraphim.
  {
    id: "seraphim-blade",
    name: "Seraphim Blade",
    type: "weapon",
    icon: "flare",
    cost: 364500000,
    unlockDays: 0,
    unlockPrestige: 9,
    minShopLevel: 3,
    description: "Six wings of light along its length. It sings. +275% XP.",
    boost: { xpMult: 2.75, attack: 1000 },
    visual: {},
  },
  {
    id: "seraphim-aegis",
    name: "Seraphim Aegis",
    type: "armor",
    icon: "workspace-premium",
    cost: 364500000,
    unlockDays: 0,
    unlockPrestige: 9,
    minShopLevel: 3,
    description: "Wings upon wings, and a halo's ring. +22 max hearts.",
    boost: { hearts: 22, defense: 327 },
    visual: {},
  },
  {
    id: "seraphim-raiment",
    name: "Seraphim Raiment",
    type: "clothes",
    icon: "flare",
    cost: 364500000,
    unlockDays: 0,
    unlockPrestige: 9,
    minShopLevel: 3,
    description: "Burning white, fringed with fire. +170% town coins, +110% XP.",
    boost: { coinMult: 1.7, xpMult: 1.1 },
    visual: { bodyColor: "#FFF7ED", pattern: "stripes" },
  },
  // Crown 10 — Dragonbone: the summit of the ladder. Bone-white plates,
  // a horned helm — the armor of the last boss's own brood, claimed.
  {
    id: "dragonbone-blade",
    name: "Dragonbone Blade",
    type: "weapon",
    icon: "swords",
    cost: 1093500000,
    unlockDays: 0,
    unlockPrestige: 10,
    minShopLevel: 3,
    description: "Carved from a dragon's rib, serrated and singing. +325% XP.",
    boost: { xpMult: 3.25, attack: 1350 },
    visual: {},
  },
  {
    id: "dragonbone-plate",
    name: "Dragonbone Plate",
    type: "armor",
    icon: "security",
    cost: 1093500000,
    unlockDays: 0,
    unlockPrestige: 10,
    minShopLevel: 3,
    description: "Bone-white plates under a horned helm. Nothing above this. +24 max hearts.",
    boost: { hearts: 24, defense: 441 },
    visual: {},
  },
  {
    id: "dragonbone-raiment",
    name: "Dragonbone Raiment",
    type: "clothes",
    icon: "workspace-premium",
    cost: 1093500000,
    unlockDays: 0,
    unlockPrestige: 10,
    minShopLevel: 3,
    description: "Cream and bone, clasped with a dragon's tooth. +200% town coins, +135% XP.",
    boost: { coinMult: 2.0, xpMult: 1.35 },
    visual: { bodyColor: "#F5EFE0", pattern: "belt" },
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

/** True when the player's XP level meets the item's level requirement. */
export function isLevelUnlocked(item: GearItem, level: number): boolean {
  return level >= (item.unlockLevel || 0);
}

/** True when the player's prestige Crowns meet the item's Crown requirement. */
export function isPrestigeUnlocked(item: GearItem, prestigeLevel: number): boolean {
  return prestigeLevel >= (item.unlockPrestige || 0);
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

// ---- Dark Forest combat ----

export type CombatStats = {
  /** damage per strike */
  attack: number;
  /** flat damage reduction per enemy hit */
  defense: number;
  /** max hit points */
  maxHp: number;
};

/**
 * Combat power derived from equipped gear. Bare-handed faith still counts
 * for something — but a real blade and real armor change everything.
 */
export function combatStats(equipped: EquippedGear): CombatStats {
  const weapon = equipped.weapon ? GEAR_BY_ID[equipped.weapon] : undefined;
  const armor = equipped.armor ? GEAR_BY_ID[equipped.armor] : undefined;
  const clothes = equipped.clothes ? GEAR_BY_ID[equipped.clothes] : undefined;
  // Boss badges empower the gear itself (lib/badges): Gloaming/Throne
  // multiply every stat, Ember the weapon, Frost the armor, Fen the HP.
  // Prestige resets the gear — the badges are what carry over.
  const bm = badgeGearMultipliers(getCachedBadges());
  const attack = 5 + Math.round((weapon?.boost.attack || 0) * bm.all * bm.weaponAttack);
  const defense = Math.round(
    ((armor?.boost.defense || 0) * bm.armorDefense + (clothes?.boost.defense || 0)) * bm.all
  );
  const hearts =
    (armor?.boost.hearts || 0) + (clothes?.boost.hearts || 0) + (weapon?.boost.hearts || 0);
  return { attack, defense, maxHp: 100 + Math.round(hearts * 20 * bm.all * bm.maxHp) };
}
