// Hometown: city-builder meta game tied to fasting.
// Phase 1: coins from fast green days + balance display.
// Future: town grid, businesses, pawn house, shop, heart-reset stakes.

export const COINS_STORAGE_KEY = "prayercircle.hometown.coins.v1";
export const TOWN_STORAGE_KEY = "prayercircle.hometown.town.v1";

export type HometownCoins = {
  balance: number;
  lifetimeEarned: number;
};

export function parseCoins(value: unknown): HometownCoins {
  if (!value || typeof value !== "object") return { balance: 0, lifetimeEarned: 0 };
  const c = value as Partial<HometownCoins>;
  return {
    balance: typeof c.balance === "number" && c.balance >= 0 ? Math.floor(c.balance) : 0,
    lifetimeEarned: typeof c.lifetimeEarned === "number" && c.lifetimeEarned >= 0 ? Math.floor(c.lifetimeEarned) : 0,
  };
}

// Unlock tiers scaled for a 365-day fast. Shorter fasts unlock less.
export type HometownTier = 1 | 2 | 3 | 4;
export function tierForFastDay(dayNum: number): HometownTier {
  if (dayNum >= 250) return 4;
  if (dayNum >= 100) return 3;
  if (dayNum >= 40) return 2;
  return 1;
}

// ---- Town ----

export type BuildingType =
  | "house"      // home for townsfolk
  | "pawn-house" // your pawn's house (one per town)
  | "farm"       // business: +2 coins/day
  | "shop"       // business: +3 coins/day
  | "bakery"     // business: +5 coins/day (tier 2+)
  | "market"     // business: +8 coins/day (tier 3+)
  | "bank";      // business: +12 coins/day (tier 4)

export const BUILDINGS: Record<BuildingType, {
  name: string;
  icon: string;
  cost: number;
  tier: HometownTier;
  incomePerDay: number;
  description: string;
}> = {
  "house":      { name: "Cottage",    icon: "🏠", cost: 5,   tier: 1, incomePerDay: 0,  description: "A cozy home for your townsfolk." },
  "pawn-house": { name: "Pawn House", icon: "🏡", cost: 10,  tier: 1, incomePerDay: 0,  description: "Your pawn's home. Tap to enter and decorate." },
  "farm":       { name: "Farm",       icon: "🌾", cost: 15,  tier: 1, incomePerDay: 2,  description: "+2 coins per day while your streak is alive." },
  "shop":       { name: "Shop",       icon: "🏪", cost: 30,  tier: 1, incomePerDay: 3,  description: "+3 coins per day while your streak is alive." },
  "bakery":     { name: "Bakery",     icon: "🥖", cost: 60,  tier: 2, incomePerDay: 5,  description: "+5 coins per day while your streak is alive." },
  "market":     { name: "Market",     icon: "🏬", cost: 120, tier: 3, incomePerDay: 8,  description: "+8 coins per day while your streak is alive." },
  "bank":       { name: "Bank",       icon: "🏦", cost: 250, tier: 4, incomePerDay: 12, description: "+12 coins per day while your streak is alive." },
};

export type PlacedBuilding = {
  id: string;
  type: BuildingType;
  x: number;
  y: number;
};

export type TownState = {
  buildings: PlacedBuilding[];
  lastIncomeDate: string | null;
};

export const TOWN_GRID_SIZE = 8;

export function parseTown(value: unknown): TownState {
  if (!value || typeof value !== "object") return { buildings: [], lastIncomeDate: null };
  const t = value as Partial<TownState>;
  return {
    buildings: Array.isArray(t.buildings) ? t.buildings.filter(b => b && typeof b.id === "string") : [],
    lastIncomeDate: typeof t.lastIncomeDate === "string" ? t.lastIncomeDate : null,
  };
}

export function dailyIncomeForTown(town: TownState): number {
  return town.buildings.reduce((sum, b) => {
    const def = BUILDINGS[b.type];
    return sum + (def ? def.incomePerDay : 0);
  }, 0);
}

// ---- Pawn House Interior ----

export type FurnitureType =
  | "bed"
  | "chair"
  | "table"
  | "lamp"
  | "rug"
  | "plant"
  | "bookshelf"
  | "fireplace";

export const FURNITURE: Record<FurnitureType, {
  name: string;
  icon: string;
  cost: number;
  tier: HometownTier;
}> = {
  "bed":       { name: "Bed",       icon: "🛏️", cost: 8,  tier: 1 },
  "chair":     { name: "Chair",     icon: "🪑", cost: 5,  tier: 1 },
  "table":     { name: "Table",     icon: "🪟", cost: 10, tier: 1 },
  "lamp":      { name: "Lamp",      icon: "🪔", cost: 12, tier: 1 },
  "rug":       { name: "Rug",       icon: "🟫", cost: 6,  tier: 1 },
  "plant":     { name: "Plant",     icon: "🪴", cost: 7,  tier: 2 },
  "bookshelf": { name: "Bookshelf", icon: "📚", cost: 20, tier: 2 },
  "fireplace": { name: "Fireplace", icon: "🔥", cost: 35, tier: 3 },
};

export type PlacedFurniture = {
  id: string;
  type: FurnitureType;
  x: number;
  y: number;
};

export type PawnHouseState = {
  furniture: PlacedFurniture[];
  size: number; // grid size: 4, 6, or 8
};

export const PAWN_HOUSE_STORAGE_KEY = "prayercircle.hometown.pawnhouse.v1";
export const HOUSE_EXPAND_COSTS: Record<number, number> = {
  4: 50,  // 4x4 -> 6x6
  6: 150, // 6x6 -> 8x8
};

export function parsePawnHouse(value: unknown): PawnHouseState {
  if (!value || typeof value !== "object") return { furniture: [], size: 4 };
  const h = value as Partial<PawnHouseState>;
  return {
    furniture: Array.isArray(h.furniture) ? h.furniture.filter(f => f && typeof f.id === "string") : [],
    size: h.size === 6 || h.size === 8 ? h.size : 4,
  };
}

// ---- Shop ----

export type ShopItemType = "monument" | "decoration" | "pawn-skin";

export type ShopItem = {
  id: string;
  name: string;
  icon: string;
  cost: number;
  tier: HometownTier;
  type: ShopItemType;
  description: string;
};

export const SHOP_ITEMS: ShopItem[] = [
  // Premium monuments (tier 2+)
  { id: "mon-golden-altar", name: "Golden Altar", icon: "✨", cost: 100, tier: 2, type: "monument", description: "A radiant golden altar for your testimonies." },
  { id: "mon-crystal-pillar", name: "Crystal Pillar", icon: "💎", cost: 200, tier: 3, type: "monument", description: "A shimmering crystal memorial." },
  { id: "mon-ancient-well", name: "Ancient Well", icon: "🏺", cost: 350, tier: 4, type: "monument", description: "A well of living water, echoing Abraham." },
  // Town decorations
  { id: "dec-fountain", name: "Fountain", icon: "⛲", cost: 80, tier: 2, type: "decoration", description: "A beautiful centerpiece for your town." },
  { id: "dec-statue", name: "Statue", icon: "🗽", cost: 150, tier: 3, type: "decoration", description: "A monument to faithfulness." },
  { id: "dec-garden", name: "Garden", icon: "🌷", cost: 60, tier: 1, type: "decoration", description: "Flowers for your townsfolk." },
  { id: "dec-lantern", name: "Lantern Post", icon: "🏮", cost: 40, tier: 1, type: "decoration", description: "Light for the streets." },
  // Pawn skins (recolors — detailed faces coming)
  { id: "pawn-ember", name: "Ember Pawn", icon: "♟️", cost: 120, tier: 2, type: "pawn-skin", description: "A pawn wreathed in warm ember glow." },
  { id: "pawn-frost", name: "Frost Pawn", icon: "♟️", cost: 200, tier: 3, type: "pawn-skin", description: "A pawn touched by winter's breath." },
  { id: "pawn-gold", name: "Gilded Pawn", icon: "♟️", cost: 400, tier: 4, type: "pawn-skin", description: "A pawn of pure gold. For the committed." },
];

export const SHOP_OWNED_KEY = "prayercircle.hometown.shop-owned.v1";

export function parseOwnedItems(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}
