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
