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

// ---- Multi-map ----

export type TownMapId = "town" | "city" | "mall" | "school" | "reserve";

export const TOWN_MAP_IDS: TownMapId[] = ["town", "city", "mall", "school", "reserve"];

export type MapInfo = {
  name: string;
  icon: string;
  description: string;
  unlockCost: number; // coins to unlock (0 = free)
  comingSoon: boolean;
};

export const MAP_INFO: Record<TownMapId, MapInfo> = {
  town:    { name: "Hometown", icon: "🏠", description: "Your starter town", unlockCost: 0, comingSoon: false },
  city:    { name: "City",     icon: "🏙️", description: "Bigger buildings, bigger earnings", unlockCost: 1500, comingSoon: false },
  // NOTE: the "mall" map id is legacy storage — it now renders the Garden of
  // Remembrance, a sacred memorial space. The id is kept so existing unlock
  // state carries over.
  mall:    { name: "Garden of Remembrance", icon: "🌸", description: "A sacred place to remember loved ones", unlockCost: 1000, comingSoon: false },
  school:  { name: "School",   icon: "🏫", description: "Buildings that earn XP", unlockCost: 1000, comingSoon: false },
  reserve: { name: "???",      icon: "❓", description: "Coming soon", unlockCost: 0, comingSoon: true },
};

export const MAP_UNLOCKED_KEY = "prayercircle.hometown.maps.unlocked.v1";

export function parseUnlockedMaps(value: unknown): TownMapId[] {
  if (!Array.isArray(value)) return ["town"];
  const valid = value.filter((v): v is TownMapId => typeof v === "string" && (TOWN_MAP_IDS as string[]).includes(v));
  if (!valid.includes("town")) valid.unshift("town");
  return valid;
}

// ---- Town ----

export type BuildingType =
  | "house"      // home for townsfolk
  | "pawn-house" // your pawn's house (one per town)
  | "farm"       // business: +2 coins/day
  | "shop"       // business: +3 coins/day
  | "bakery"     // business: +5 coins/day (tier 2+)
  | "market"     // business: +8 coins/day (tier 3+)
  | "bank"       // business: +12 coins/day (tier 4)
  | "barbershop" // service: +1 coin/day, boosts connected businesses +25%
  | "clothes-shop" // gear: clothes shop
  | "armory"       // gear: armor shop
  | "weaponsmith"  // gear: weapon shop
  | "toolshop"     // gear: tool shop
  // City buildings (big earners)
  | "bank-tower"
  | "department-store"
  | "hotel"
  | "office"
  // Mall units (income properties)
  | "food-court"
  | "bookstore"
  | "arcade"
  | "cinema"
  // School buildings (earn XP)
  | "library"
  | "classroom"
  | "chapel"
  // Restaurants (hometown food businesses)
  | "pizza-place"
  | "burger-joint"
  | "taco-stand"
  | "sushi-bar"
  | "diner"
  // Church (prayer residents)
  | "church"
  // Restaurant Row (city gathering spots for breaking bread)
  | "upper-room"
  | "manna-house"
  | "feast-hall";

export type DecorationType = "fountain" | "statue" | "garden" | "lantern";

export const DECORATIONS: Record<DecorationType, {
  name: string;
  icon: string;
  shopId: string;
}> = {
  "fountain": { name: "Fountain", icon: "⛲", shopId: "dec-fountain" },
  "statue":   { name: "Statue",   icon: "🗽", shopId: "dec-statue" },
  "garden":   { name: "Garden",   icon: "🌷", shopId: "dec-garden" },
  "lantern":  { name: "Lantern",  icon: "🏮", shopId: "dec-lantern" },
};

// Upgrade costs: L1->L2 = 3x base, L2->L3 = 5x base. Income: L2 = 2.5x, L3 = 5x.
// Expensive on purpose — earned money, not easy money.
export const UPGRADE_COST_MULT = { 2: 3, 3: 5 };
export const UPGRADE_INCOME_MULT = { 1: 1, 2: 2.5, 3: 5 };

// Houses upgrade through 5 tiers (Cottage -> Mansion), each level +1 townsman.
export const HOUSE_LEVEL_NAMES: Record<number, string> = {
  1: "Cottage", 2: "House", 3: "Townhouse", 4: "Villa", 5: "Mansion",
};
export const HOUSE_UPGRADE_COSTS: Record<number, number> = { 2: 15, 3: 40, 4: 75, 5: 150 };

/** Max upgrade level for a building type (houses go to 5, everything else 3). */
export function maxLevelFor(type: BuildingType): number {
  return type === "house" ? 5 : 3;
}

/** Display name for a house at a given level. */
export function houseNameFor(level: number): string {
  return HOUSE_LEVEL_NAMES[Math.min(Math.max(level || 1, 1), 5)] ?? "Cottage";
}

// Church upgrades: Chapel -> Church -> Community Church, warmer at each tier.
export const CHURCH_LEVEL_NAMES: Record<number, string> = {
  1: "Chapel", 2: "Church", 3: "Community Church",
};

/** Display name for a church at a given level. */
export function churchNameFor(level: number): string {
  return CHURCH_LEVEL_NAMES[Math.min(Math.max(level || 1, 1), 3)] ?? "Chapel";
}

/** Coins/hour bonus per prayer contact prayed for today. */
export const CHURCH_PRAYER_COINS_PER_HOUR = 2;

/** Max blessed prayer villagers wandering town (also the prayer-star cap). */
export const PRAYER_VILLAGER_CAP = 40;

/**
 * Coin storage cap for a building's `accumulated` total, by level.
 * Hourly income stops accumulating when full — upgrading raises the cap.
 * Balanced for idle play: L1 fills in ~5-8hrs (a few check-ins/day, sleep is safe).
 * High-income buildings (city plots, bank towers) scale by their income multiplier.
 * Buildings with no income (houses) don't need caps.
 */
export const BUILDING_STORAGE_CAPS: Record<number, number> = {
  1: 25,
  2: 75,
  3: 200,
  4: 500,
  5: 1000,
};

/** Max coins a building can hold uncollected (level base × income multipliers). */
export function buildingStorageCap(b: PlacedBuilding): number {
  const level = Math.min(Math.max(b.level || 1, 1), 5);
  const base = BUILDING_STORAGE_CAPS[level] ?? 25;
  // Scale for high-income buildings so they don't fill instantly
  const incomeMult = plotIncomeMult(b) * (b.type === "bank-tower" ? bankFloorMultiplier(b.floors || 1) : 1);
  return Math.round(base * incomeMult);
}

/** True if a building's accumulated coins have hit its storage cap. */
export function isBuildingStorageFull(b: PlacedBuilding): boolean {
  return (b.accumulated || 0) >= buildingStorageCap(b) - 0.001;
}

/**
 * Daily prayer blessing: +3% coin income per prayer contact prayed for today.
 * Resets each day with the prayer list.
 */
export function prayerMult(prayedCount: number): number {
  return 1 + Math.min(Math.max(prayedCount || 0, 0), PRAYER_VILLAGER_CAP) * 0.03;
}

/**
 * Count of prayer contacts prayed for today (local date).
 * Reads prayercircle.people.v1 and checks lastPrayerCompletedDate.
 */
export async function prayedTodayCount(): Promise<number> {
  const people = await prayedTodayPeople();
  return people.length;
}

/** Minimal shape of a prayer contact prayed for today (for candle wall / pews). */
export type PrayedPerson = { id: string; name: string; accentColor?: string };

/**
 * Prayer contacts prayed for today (local date), with id + name.
 * Reads prayercircle.people.v1 and checks lastPrayerCompletedDate.
 */
export async function prayedTodayPeople(): Promise<PrayedPerson[]> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem("prayercircle.people.v1");
    if (!raw) return [];
    const people = JSON.parse(raw);
    if (!Array.isArray(people)) return [];
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return people
      .filter((p: any) => p?.lastPrayerCompletedDate === today)
      .map((p: any) => ({
        id: String(p?.id ?? p?.name ?? Math.random()),
        name: String(p?.name ?? "Friend"),
        accentColor: typeof p?.accentColor === "string" ? p.accentColor : undefined,
      }));
  } catch {
    return [];
  }
}

/** Townsfolk housed: L1=2, each level +1, L5 (Mansion)=6. (Legacy — houses removed.) */
export function townsfolkForHouse(level: number): number {
  return 1 + Math.min(Math.max(level || 1, 1), 5);
}

/**
 * Population economy: each prayer light (person prayed for today) = +2% income.
 * The town feels alive when Jonathan prays. Caps at 2x (50 lights).
 */
export function populationMult(prayedCount: number): number {
  return Math.min(2, 1 + Math.max(prayedCount || 0, 0) * 0.02);
}

export function upgradeCostFor(type: BuildingType, toLevel: number): number {
  if (type === "house") return HOUSE_UPGRADE_COSTS[toLevel] ?? 0;
  // Restaurant Row has fixed upgrade costs (the banquet gets grander).
  if (isRestaurantType(type)) return RESTAURANT_UPGRADE_COSTS[toLevel] ?? 0;
  const base = BUILDINGS[type].cost;
  return Math.round(base * (UPGRADE_COST_MULT as Record<number, number>)[toLevel]);
}

export function incomeFor(type: BuildingType, level: number): number {
  const base = BUILDINGS[type].incomePerDay;
  if (base === 0) return 0;
  const mult = UPGRADE_INCOME_MULT[Math.min(Math.max(level || 1, 1), 3) as 1 | 2 | 3];
  return Math.round(base * mult);
}

export type BuildingDef = {
  name: string;
  icon: string;
  cost: number;
  tier: HometownTier;
  incomePerDay: number; // coins per day (0 if XP-only)
  xpPerDay: number;     // XP per day (0 for coin buildings)
  maps: TownMapId[];    // which maps this building can be placed on
  description: string;
};

export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  "house":      { name: "Cottage",    icon: "🏠", cost: 5,   tier: 1, incomePerDay: 0,  xpPerDay: 0, maps: ["town"], description: "A cozy home for your townsfolk." },
  "pawn-house": { name: "Pawn House", icon: "🏡", cost: 10,  tier: 1, incomePerDay: 0,  xpPerDay: 0, maps: ["town"], description: "Your pawn's home. Tap to enter and decorate." },
  "farm":       { name: "Farm",       icon: "🌾", cost: 20,  tier: 1, incomePerDay: 2,  xpPerDay: 0, maps: ["town"], description: "+2 coins per day while your streak is alive." },
  "shop":       { name: "Shop",       icon: "🏪", cost: 40,  tier: 1, incomePerDay: 3,  xpPerDay: 0, maps: ["town"], description: "+3 coins per day while your streak is alive." },
  "bakery":     { name: "Bakery",     icon: "🥖", cost: 80,  tier: 2, incomePerDay: 5,  xpPerDay: 0, maps: ["town"], description: "+5 coins per day while your streak is alive." },
  "market":     { name: "Market",     icon: "🏬", cost: 160, tier: 3, incomePerDay: 8,  xpPerDay: 0, maps: ["town"], description: "+8 coins per day while your streak is alive." },
  "bank":       { name: "Bank",       icon: "🏦", cost: 350, tier: 4, incomePerDay: 12, xpPerDay: 0, maps: ["town"], description: "+12 coins per day while your streak is alive." },
  "barbershop": { name: "Barbershop", icon: "💈", cost: 60,  tier: 1, incomePerDay: 1,  xpPerDay: 0, maps: ["town"], description: "+1 coin/day. Boosts connected businesses +25%." },
  "clothes-shop": { name: "Clothes Shop", icon: "👕", cost: 65, tier: 1, incomePerDay: 1, xpPerDay: 0, maps: ["town"], description: "Buy outfits for your pawn. +1 coin/day." },
  "armory":       { name: "Armory",       icon: "🛡️", cost: 105, tier: 1, incomePerDay: 2, xpPerDay: 0, maps: ["town"], description: "Buy armor for +hearts. +2 coins/day." },
  "weaponsmith":  { name: "Weaponsmith",  icon: "⚔️", cost: 105, tier: 1, incomePerDay: 2, xpPerDay: 0, maps: ["town"], description: "Buy weapons for +XP. +2 coins/day." },
  "toolshop":     { name: "Tool Shop",    icon: "🔨", cost: 80, tier: 1, incomePerDay: 1, xpPerDay: 0, maps: ["town"], description: "Buy tools for +coins. +1 coin/day." },
  "church":       { name: "Chapel",       icon: "⛪", cost: 100, tier: 1, incomePerDay: 24, xpPerDay: 0, maps: ["town"], description: "A house of prayer. +2 coins/hour for each person you've prayed for today." },
  // City — big buildings, big earnings
  "bank-tower":       { name: "Bank Tower",       icon: "🏦", cost: 650, tier: 1, incomePerDay: 25, xpPerDay: 0, maps: ["city"], description: "A towering bank. +25 coins/day." },
  "department-store": { name: "Department Store", icon: "🏬", cost: 525, tier: 1, incomePerDay: 20, xpPerDay: 0, maps: ["city"], description: "Everything under one roof. +20 coins/day." },
  "hotel":            { name: "Grand Hotel",      icon: "🏨", cost: 460, tier: 1, incomePerDay: 18, xpPerDay: 0, maps: ["city"], description: "Luxury suites downtown. +18 coins/day." },
  "office":           { name: "Office Tower",     icon: "🏢", cost: 400, tier: 1, incomePerDay: 15, xpPerDay: 0, maps: ["city"], description: "Busy professionals. +15 coins/day." },
  // Mall (retired) — the map is now the Garden of Remembrance. Defs are kept
  // so old saves can be refunded at full price; maps: [] means unbuildable.
  "food-court": { name: "Food Court", icon: "🍔", cost: 130, tier: 1, incomePerDay: 8,  xpPerDay: 0, maps: [], description: "Hungry shoppers. +8 coins/day." },
  "bookstore":  { name: "Bookstore",  icon: "📚", cost: 105,  tier: 1, incomePerDay: 6,  xpPerDay: 0, maps: [], description: "Quiet readers. +6 coins/day." },
  "arcade":     { name: "Arcade",     icon: "🕹️", cost: 160, tier: 1, incomePerDay: 10, xpPerDay: 0, maps: [], description: "Tokens and high scores. +10 coins/day." },
  "cinema":     { name: "Cinema",     icon: "🎬", cost: 200, tier: 1, incomePerDay: 12, xpPerDay: 0, maps: [], description: "Now showing. +12 coins/day." },
  // School — XP earners
  "library":   { name: "Library",   icon: "📖", cost: 130, tier: 1, incomePerDay: 0, xpPerDay: 50, maps: ["school"], description: "Quiet study earns wisdom. +50 XP/day." },
  "classroom": { name: "Classroom", icon: "📝", cost: 105,  tier: 1, incomePerDay: 0, xpPerDay: 35, maps: ["school"], description: "Daily lessons. +35 XP/day." },
  "chapel":    { name: "Chapel",    icon: "⛪", cost: 160, tier: 1, incomePerDay: 0, xpPerDay: 60, maps: ["school"], description: "A place of prayer. +60 XP/day." },
  // Restaurants — hometown food businesses
  "pizza-place":  { name: "Pizza Place",  icon: "🍕", cost: 80, tier: 1, incomePerDay: 3, xpPerDay: 0, maps: ["town"], description: "Wood-fired pies. +3 coins/day." },
  "burger-joint": { name: "Burger Joint", icon: "🍔", cost: 80, tier: 1, incomePerDay: 3, xpPerDay: 0, maps: ["town"], description: "Smash burgers & shakes. +3 coins/day." },
  "taco-stand":   { name: "Taco Stand",   icon: "🌮", cost: 60, tier: 1, incomePerDay: 2, xpPerDay: 0, maps: ["town"], description: "Street tacos to go. +2 coins/day." },
  "sushi-bar":    { name: "Sushi Bar",    icon: "🍣", cost: 105, tier: 1, incomePerDay: 4, xpPerDay: 0, maps: ["town"], description: "Fresh daily. +4 coins/day." },
  "diner":        { name: "Pancake Diner", icon: "🥞", cost: 65, tier: 1, incomePerDay: 2, xpPerDay: 0, maps: ["town"], description: "Breakfast all day. +2 coins/day." },
  // Restaurant Row — city gathering spots where prayer villagers break bread
  "upper-room":  { name: "The Upper Room", icon: "🍞", cost: 300, tier: 1, incomePerDay: 22, xpPerDay: 0, maps: ["city"], description: "A warm communal dining hall. +22 coins/day." },
  "manna-house": { name: "Manna House",    icon: "🥐", cost: 300, tier: 1, incomePerDay: 20, xpPerDay: 0, maps: ["city"], description: "A cozy bakery for breaking bread. +20 coins/day." },
  "feast-hall":  { name: "Feast Hall",     icon: "🍷", cost: 300, tier: 1, incomePerDay: 24, xpPerDay: 0, maps: ["city"], description: "A grand banquet hall. +24 coins/day." },
};

// ---- City plots: pre-placed downtown lots (no free placement on the city map) ----
export type CityPlot = {
  id: string;
  x: number;
  y: number;
  buildingType: BuildingType;
  cost: number; // coins to purchase the plot
  name: string;
};

export const CITY_PLOTS: CityPlot[] = [
  { id: "plot-city-1", x: 0, y: 0, buildingType: "bank-tower",       cost: 300, name: "Financial District Lot" },
  { id: "plot-city-2", x: 6, y: 0, buildingType: "department-store", cost: 450, name: "Retail Row Lot" },
  { id: "plot-city-3", x: 0, y: 6, buildingType: "hotel",            cost: 375, name: "Hospitality Lot" },
  { id: "plot-city-4", x: 6, y: 6, buildingType: "office",           cost: 375, name: "Business Park Lot" },
  { id: "plot-city-5", x: 3, y: 3, buildingType: "bank-tower",       cost: 600, name: "Central Tower Lot" },
  { id: "plot-city-6", x: 3, y: 0, buildingType: "office",           cost: 525, name: "Uptown Lot" },
  // Restaurant Row — where the prayer villagers gather to break bread
  { id: "plot-rest-1", x: 0, y: 3, buildingType: "upper-room",  cost: 300, name: "Restaurant Row West" },
  { id: "plot-rest-2", x: 6, y: 3, buildingType: "manna-house", cost: 300, name: "Restaurant Row East" },
  { id: "plot-rest-3", x: 3, y: 6, buildingType: "feast-hall",  cost: 300, name: "Feast Hall Lot" },
];

/** Plot building income multipliers — aggressive endgame scaling (vs standard 1/2.5/5). */
export const CITY_PLOT_INCOME_MULT = { 1: 1, 2: 2, 3: 3.5 };

/** Income multiplier for a plot building (1 for non-plot buildings). */
export function plotIncomeMult(b: PlacedBuilding): number {
  if (!b.plotId) return 1;
  return CITY_PLOT_INCOME_MULT[Math.min(b.level || 1, 3) as 1 | 2 | 3] ?? 1;
}

/** Daily coin income for a placed building — plot-aware. */
export function effectiveIncomeFor(b: PlacedBuilding): number {
  const level = b.level || 1;
  const base = BUILDINGS[b.type].incomePerDay;
  if (base === 0) return 0;
  const clamped = Math.min(Math.max(level, 1), 3) as 1 | 2 | 3;
  const mult = b.plotId ? CITY_PLOT_INCOME_MULT[clamped] : UPGRADE_INCOME_MULT[clamped];
  return Math.round(base * mult);
}

export const CITY_PLOTS_STORAGE_KEY = "prayercircle.hometown.city.plots.v1";

export async function loadPurchasedPlots(): Promise<string[]> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem(CITY_PLOTS_STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch { return []; }
}

export async function savePurchasedPlots(ids: string[]): Promise<void> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.setItem(CITY_PLOTS_STORAGE_KEY, JSON.stringify(ids));
  } catch {}
}

export function plotAt(x: number, y: number): CityPlot | undefined {
  return CITY_PLOTS.find((p) => x >= p.x && x < p.x + 2 && y >= p.y && y < p.y + 2);
}

// ---- Restaurant Row: breaking bread ----

/** True for the three Restaurant Row building types. */
export function isRestaurantType(type: BuildingType): boolean {
  return type === "upper-room" || type === "manna-house" || type === "feast-hall";
}

/** Fixed upgrade costs for restaurants: L1 purchase is the plot cost (300c). */
export const RESTAURANT_UPGRADE_COSTS: Record<number, number> = { 2: 500, 3: 800 };

/** How many villagers can gather at each restaurant level. */
export const RESTAURANT_GATHER_CAPS: Record<number, number> = { 1: 10, 2: 25, 3: 40 };

/** Fellowship bonus per gathered villager, by restaurant level. */
export const RESTAURANT_FELLOWSHIP_RATES: Record<number, number> = { 1: 0.005, 2: 0.0075, 3: 0.01 };

/**
 * The Gathering: Mon/Wed/Fri, 6–8pm. Prayer villagers path to Restaurant Row
 * to break bread together. A shared meal, not every night — so it feels special.
 */
export function isGatheringTime(date: Date = new Date()): boolean {
  const day = date.getDay(); // 1=Mon, 3=Wed, 5=Fri
  const hour = date.getHours();
  return (day === 1 || day === 3 || day === 5) && hour >= 18 && hour < 20;
}

/** Total gathering capacity across all purchased restaurants. */
export function totalGatherCapacity(buildings: PlacedBuilding[]): number {
  return buildings
    .filter((b) => isRestaurantType(b.type) && b.plotId)
    .reduce((sum, b) => sum + (RESTAURANT_GATHER_CAPS[b.level || 1] ?? 10), 0);
}

/** Fellowship rate = the rate of the highest-level restaurant (the flagship). */
export function fellowshipRate(buildings: PlacedBuilding[]): number {
  const levels = buildings
    .filter((b) => isRestaurantType(b.type) && b.plotId)
    .map((b) => b.level || 1);
  if (levels.length === 0) return 0;
  const best = Math.max(...levels);
  return RESTAURANT_FELLOWSHIP_RATES[best] ?? 0.005;
}

// ---- Fellowship bonus: persists 24h after each gathering ----

export const FELLOWSHIP_STORAGE_KEY = "prayercircle.hometown.fellowship.v1";

export type FellowshipState = {
  /** Villagers who broke bread at the last gathering. */
  villagers: number;
  /** Per-villager rate at the time. */
  rate: number;
  /** ISO timestamp of the gathering. */
  earnedAt: string;
};

export async function loadFellowship(): Promise<FellowshipState | null> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem(FELLOWSHIP_STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (typeof s.villagers !== "number" || typeof s.rate !== "number" || typeof s.earnedAt !== "string") return null;
    return s as FellowshipState;
  } catch { return null; }
}

export async function saveFellowship(s: FellowshipState): Promise<void> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.setItem(FELLOWSHIP_STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

/**
 * Fellowship income multiplier. The breaking-bread blessing lasts 24 hours
 * after each gathering: 1 + (villagers × rate).
 */
export function fellowshipMult(state: FellowshipState | null, now: Date = new Date()): number {
  if (!state || state.villagers <= 0 || state.rate <= 0) return 1;
  const earnedAt = new Date(state.earnedAt).getTime();
  if (isNaN(earnedAt)) return 1;
  const hoursSince = (now.getTime() - earnedAt) / 3600000;
  if (hoursSince < 0 || hoursSince >= 24) return 1;
  return 1 + state.villagers * state.rate;
}

// ---- Garden of Remembrance ----
// The old Mall map is now a sacred memorial garden. Loved ones are remembered
// here — each gets a flower and a place on the memorial wall. Their memory
// blesses the town: +0.5% income each.

export type RememberedPerson = {
  id: string;
  name: string;
  note: string;
  addedAt: string; // ISO timestamp
  flower: number; // flower style index 0-5
  /** ISO timestamp when a memory candle was lit (burns 24h). */
  candleLitAt?: string;
};

export type RemembranceState = {
  people: RememberedPerson[];
  level: 1 | 2 | 3;
};

export const REMEMBRANCE_STORAGE_KEY = "prayercircle.hometown.remembrance.v1";
export const REMEMBRANCE_MALL_REFUND_KEY = "prayercircle.hometown.mall-refund.v1";
export const HOUSE_REMOVAL_REFUND_KEY = "prayercircle.hometown.house-refund.v1";

/** Garden upgrade costs: L1 is the map unlock itself; L2/L3 upgrade the garden. */
export const REMEMBRANCE_UPGRADE_COSTS: Record<2 | 3, number> = { 2: 800, 3: 1200 };

/** Flower styles available for remembered loved ones. */
export const REMEMBRANCE_FLOWERS = [
  { name: "Rose", petal: "#E11D48", center: "#FDE68A" },
  { name: "Lily", petal: "#F8FAFC", center: "#FBBF24" },
  { name: "Sunflower", petal: "#F59E0B", center: "#78350F" },
  { name: "Violet", petal: "#8B5CF6", center: "#FDE68A" },
  { name: "Pink", petal: "#EC4899", center: "#FFF7ED" },
  { name: "Forget-me-not", petal: "#60A5FA", center: "#FEF3C7" },
] as const;

export function emptyRemembrance(): RemembranceState {
  return { people: [], level: 1 };
}

export function parseRemembrance(value: unknown): RemembranceState {
  const fallback = emptyRemembrance();
  if (!value || typeof value !== "object") return fallback;
  const s = value as Partial<RemembranceState>;
  const people = Array.isArray(s.people)
    ? s.people
        .filter((p) => p && typeof p.id === "string" && typeof p.name === "string")
        .map((p) => ({
          id: p.id,
          name: p.name,
          note: typeof p.note === "string" ? p.note : "",
          addedAt: typeof p.addedAt === "string" ? p.addedAt : new Date().toISOString(),
          flower: typeof p.flower === "number" ? Math.abs(Math.floor(p.flower)) % REMEMBRANCE_FLOWERS.length : 0,
          candleLitAt: typeof p.candleLitAt === "string" ? p.candleLitAt : undefined,
        }))
    : [];
  const level = s.level === 2 || s.level === 3 ? s.level : 1;
  return { people, level };
}

export async function loadRemembrance(): Promise<RemembranceState> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem(REMEMBRANCE_STORAGE_KEY);
    if (!raw) return emptyRemembrance();
    return parseRemembrance(JSON.parse(raw));
  } catch { return emptyRemembrance(); }
}

export async function saveRemembrance(s: RemembranceState): Promise<void> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.setItem(REMEMBRANCE_STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

/**
 * Remembrance income multiplier. Each remembered loved one's memory blesses
 * the town: +0.5% income per person. Small, meaningful, forever.
 */
export function remembranceMult(count: number): number {
  return 1 + Math.max(0, Math.floor(count || 0)) * 0.005;
}

/**
 * Full refund value for a retired mall building: base cost + all upgrade
 * costs paid. Used once during the Mall → Garden migration.
 */
export function remembranceRefundFor(b: PlacedBuilding): number {
  const def = BUILDINGS[b.type];
  if (!def) return 0;
  let total = def.cost;
  for (let l = 2; l <= (b.level || 1); l++) {
    try { total += upgradeCostFor(b.type, l as 2 | 3 | 4 | 5); } catch {}
  }
  return total;
}

// ---- Memory candles ----
// Jonathan can light a candle for a remembered loved one (5 coins, burns 24h).
// Lit candles glow in the garden — warmly by day, brightly at night.

export const MEMORY_CANDLE_COST = 5;
export const MEMORY_CANDLE_DURATION_MS = 24 * 3600000;

/** True when the person's memory candle is lit (burns 24 hours). */
export function candleLit(p: RememberedPerson, now: Date = new Date()): boolean {
  if (!p.candleLitAt) return false;
  const t = new Date(p.candleLitAt).getTime();
  if (isNaN(t)) return false;
  const age = now.getTime() - t;
  return age >= 0 && age < MEMORY_CANDLE_DURATION_MS;
}

// ---- Garden visits ----
// From time to time, prayer lights (golden villagers for everyone prayed for
// today) visit the Garden of Remembrance to pay their respects — 1-2 per
// hour, daytime only. Each visit blesses the town: +0.1% income for 24h.
// Small, meaningful, reverent.

export const GARDEN_VISIT_STORAGE_KEY = "prayercircle.hometown.garden-visits.v1";
/** +0.1% income per garden visit. */
export const GARDEN_VISIT_INCOME_PER_VISIT = 0.001;

export type GardenVisitState = {
  /** Hour slot ("YYYY-MM-DDTHH" local) → resident personIds who visited. */
  slots: Record<string, string[]>;
};

/** Local hour-slot key, e.g. "2026-10-17T14". */
export function gardenVisitHourKey(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}`;
}

/** Deterministic string hash → uint32 (FNV-1a). */
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Pick 1-2 prayer lights to visit the garden this hour. Deterministic per
 * hour slot so the same visitors linger all hour; empty at night (the town
 * sleeps) or when nobody was prayed for today.
 */
export function pickGardenVisitors(
  blessed: { personId: string; name: string }[],
  hourKey: string,
  night: boolean
): { personId: string; name: string }[] {
  if (night || blessed.length === 0) return [];
  const h = hashStr("garden-visit:" + hourKey);
  const count = 1 + (h % 2); // 1-2 visitors
  const pool = [...blessed];
  const out: { personId: string; name: string }[] = [];
  let seed = h;
  for (let i = 0; i < count && pool.length > 0; i++) {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    const idx = seed % pool.length;
    const picked = pool.splice(idx, 1)[0];
    if (picked) out.push(picked);
  }
  return out;
}

export function emptyGardenVisits(): GardenVisitState {
  return { slots: {} };
}

export function parseGardenVisits(value: unknown): GardenVisitState {
  const fallback = emptyGardenVisits();
  if (!value || typeof value !== "object") return fallback;
  const s = value as Partial<GardenVisitState>;
  const slots: Record<string, string[]> = {};
  if (s.slots && typeof s.slots === "object") {
    for (const [k, v] of Object.entries(s.slots)) {
      if (typeof k === "string" && Array.isArray(v)) {
        slots[k] = v.filter((x) => typeof x === "string").slice(0, 4);
      }
    }
  }
  return { slots };
}

export async function loadGardenVisits(): Promise<GardenVisitState> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem(GARDEN_VISIT_STORAGE_KEY);
    if (!raw) return emptyGardenVisits();
    return parseGardenVisits(JSON.parse(raw));
  } catch { return emptyGardenVisits(); }
}

export async function saveGardenVisits(s: GardenVisitState): Promise<void> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.setItem(GARDEN_VISIT_STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

/** Drop visit slots older than 24h. Returns a new state. */
export function pruneGardenVisits(s: GardenVisitState, now: Date = new Date()): GardenVisitState {
  const cutoff = now.getTime() - 24 * 3600000;
  const slots: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(s.slots)) {
    const t = new Date(k.length === 13 ? `${k}:00:00` : k).getTime();
    if (!isNaN(t) && t >= cutoff) slots[k] = v;
  }
  return { slots };
}

/**
 * Garden-visit income multiplier. Each resident visit to the Garden of
 * Remembrance in the last 24h blesses the town: +0.1% income per visit.
 */
export function gardenVisitMult(state: GardenVisitState | null, now: Date = new Date()): number {
  if (!state) return 1;
  const pruned = pruneGardenVisits(state, now);
  let visits = 0;
  for (const v of Object.values(pruned.slots)) visits += v.length;
  return 1 + visits * GARDEN_VISIT_INCOME_PER_VISIT;
}

// ---- City streets: proper downtown grid (permanent infrastructure) ----
// Vertical avenues at x=2 and x=5, horizontal boulevards at y=2 and y=5.
// This cuts the 8x8 map into nine 2x2 city blocks; each plot fills a block
// and is surrounded by streets on all sides.
/** Raw street tiles for the city map. */
export const CITY_STREETS: Array<{ x: number; y: number }> = [
  // West Ave (x=2, full height)
  { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 },
  { x: 2, y: 4 }, { x: 2, y: 5 }, { x: 2, y: 6 }, { x: 2, y: 7 },
  // East Ave (x=5, full height)
  { x: 5, y: 0 }, { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 },
  { x: 5, y: 4 }, { x: 5, y: 5 }, { x: 5, y: 6 }, { x: 5, y: 7 },
  // North Blvd (y=2, skipping avenue intersections)
  { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 3, y: 2 },
  { x: 4, y: 2 }, { x: 6, y: 2 }, { x: 7, y: 2 },
  // South Blvd (y=5, skipping avenue intersections)
  { x: 0, y: 5 }, { x: 1, y: 5 }, { x: 3, y: 5 },
  { x: 4, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 },
];

/** City streets as PlacedRoads with stable ids (idempotent seeding). */
export function cityStreetRoads(): PlacedRoad[] {
  return CITY_STREETS.map((s) => ({ id: `city-street-${s.x}-${s.y}`, x: s.x, y: s.y }));
}

/** True for road tiles that are permanent city infrastructure. */
export function isCityStreet(road: PlacedRoad): boolean {
  return typeof road.id === "string" && road.id.startsWith("city-street-");
}

/** Seed any missing city streets into a city MapState (idempotent). */
export function ensureCityStreets(map: MapState): MapState {
  // Migration: drop ALL old city-street roads (layout changed) so only the
  // current grid remains. Ids are stable per tile, so this is idempotent.
  const nonCityRoads = (map.roads || []).filter((r) => !isCityStreet(r));
  const existing = new Set(nonCityRoads.map((r) => r.id));
  const fresh = cityStreetRoads().filter((r) => !existing.has(r.id));
  let buildings = map.buildings || [];
  // Migration: plot buildings follow their plot to its new block position.
  const moved = buildings.map((b) => {
    const plotId = (b as PlacedBuilding).plotId;
    if (!plotId) return b;
    const plot = CITY_PLOTS.find((p) => p.id === plotId);
    if (!plot) return b;
    if (b.x === plot.x && b.y === plot.y) return b;
    return { ...b, x: plot.x, y: plot.y };
  });
  const streetsChanged = fresh.length > 0 || nonCityRoads.length !== (map.roads || []).length;
  const buildingsChanged = moved.some((b, i) => b !== buildings[i]);
  if (!streetsChanged && !buildingsChanged) return map;
  return { ...map, roads: [...nonCityRoads, ...fresh], buildings: moved };
}

// ---- Town neighborhood: heavenly hometown lots (no free placement on town map) ----
// A winding neighborhood — cul-de-sac cottages, Chapel Hill, Main Street shops.
// Lots are fixed and unlockable; buildings on lots can't be moved or sold (like city plots).

export type TownLot = {
  id: string;
  x: number;
  y: number;
  /** Lot footprint in tiles. Buildings on lots keep a fixed footprint (grow "better", not bigger). */
  w: number;
  h: number;
  allowedTypes: BuildingType[];
  cost: number; // coins for the lot (building cost is separate)
  name: string;
};

/** Commercial building types allowed on flexible Main Street shop lots. */
const TOWN_SHOP_TYPES: BuildingType[] = [
  "shop", "bakery", "market", "bank",
  "barbershop", "clothes-shop", "armory", "weaponsmith", "toolshop",
  "pizza-place", "burger-joint", "taco-stand", "sushi-bar", "diner",
];

export const TOWN_LOTS: TownLot[] = [
  // Chapel Hill shops (2x2 commercial — converted from cottage lots;
  // houses removed, prayer lights are the population now)
  { id: "town-lot-n1", x: 0, y: 0, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 75, name: "Chapel Shops" },
  // Chapel Hill — the church, prominent at the top of the neighborhood
  { id: "town-lot-church", x: 3, y: 0, w: 2, h: 2, allowedTypes: ["church"], cost: 50, name: "Chapel Hill" },
  // Hearthside — the pawn's home, near the church
  { id: "town-lot-pawn", x: 6, y: 0, w: 2, h: 2, allowedTypes: ["pawn-house"], cost: 25, name: "Hearthside" },
  // Sunny Acres — farm on the hilltop (moved from west side for the bigger grid)
  { id: "town-lot-farm", x: 8, y: 0, w: 2, h: 2, allowedTypes: ["farm"], cost: 50, name: "Sunny Acres" },
  // Main Street North — 5 flexible commercial lots
  { id: "town-lot-s1", x: 0, y: 3, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 75, name: "Main Street West" },
  { id: "town-lot-s2", x: 2, y: 3, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 75, name: "Main Street" },
  { id: "town-lot-s3", x: 4, y: 3, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 75, name: "Main Street Central" },
  { id: "town-lot-s4", x: 6, y: 3, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 75, name: "Main Street East" },
  { id: "town-lot-s5", x: 8, y: 3, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 75, name: "Market Corner" },
  // Old Town South — 5 flexible commercial lots
  { id: "town-lot-s6", x: 0, y: 6, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 75, name: "Old Town West" },
  { id: "town-lot-s7", x: 2, y: 6, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 75, name: "Old Town" },
  { id: "town-lot-s8", x: 4, y: 6, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 75, name: "Old Town Central" },
  { id: "town-lot-s9", x: 6, y: 6, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 75, name: "Old Town East" },
  { id: "town-lot-s10", x: 8, y: 6, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 75, name: "Garden Corner" },
  // Riverside District — 4 flexible commercial lots (a quieter stretch; NPCs reach
  // via the Main Street path using nearest-road fallback)
  { id: "town-lot-s11", x: 0, y: 8, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 75, name: "Riverside West" },
  { id: "town-lot-s12", x: 2, y: 8, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 75, name: "Riverside" },
  { id: "town-lot-s13", x: 4, y: 8, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 75, name: "Riverside Central" },
  { id: "town-lot-s14", x: 6, y: 8, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 75, name: "Sunset Corner" },
];

/** Winding neighborhood path tiles — permanent infrastructure (not a grid). */
export const TOWN_PATH: Array<{ x: number; y: number }> = [
  // Chapel Way — winds across the top of the hill, serving cottages, church, pawn house, farm
  { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 },
  { x: 5, y: 2 }, { x: 6, y: 2 }, { x: 7, y: 2 }, { x: 8, y: 2 }, { x: 9, y: 2 },
  // Cul-de-sac spur — tucks into the cottage cluster
  { x: 2, y: 0 }, { x: 2, y: 1 },
  // Chapel plaza spur — between church and pawn house
  { x: 5, y: 0 }, { x: 5, y: 1 },
  // Main Street — the bustling thoroughfare between the two market rows
  { x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 },
  { x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 }, { x: 8, y: 5 }, { x: 9, y: 5 },
];

/** Town path roads with stable ids (idempotent seeding). */
export function townPathRoads(): PlacedRoad[] {
  return TOWN_PATH.map((s) => ({ id: `town-path-${s.x}-${s.y}`, x: s.x, y: s.y }));
}

/** True for road tiles that are permanent neighborhood infrastructure. */
export function isTownPath(road: PlacedRoad): boolean {
  return typeof road.id === "string" && road.id.startsWith("town-path-");
}

/** Find the town lot containing tile (x, y), if any. */
export function townLotAt(x: number, y: number): TownLot | undefined {
  return TOWN_LOTS.find((l) => x >= l.x && x < l.x + l.w && y >= l.y && y < l.y + l.h);
}

/** True if a building sits on a town lot (fixed position, no move/sell). */
export function isTownLotBuilding(b: PlacedBuilding): boolean {
  return typeof b.townLotId === "string" && b.townLotId.length > 0;
}

/** True if a building has a fixed footprint (city plot or town lot). */
export function hasFixedFootprint(b: PlacedBuilding): boolean {
  return !!(b.plotId || b.townLotId);
}

/**
 * Migrate the town map to the heavenly neighborhood layout (idempotent).
 * - Assigns existing buildings to matching lots (first-come, first-served).
 * - Removes old user-placed roads; seeds the winding neighborhood path.
 * - Buildings that don't fit in lots stay as legacy free-placed buildings.
 * NPCs, prayer villagers, church mechanics, and income are untouched.
 */
export function ensureTownNeighborhood(map: MapState): MapState {
  // 1. Roads: drop non-path roads, seed the winding path.
  const existingPathIds = new Set(
    (map.roads || []).filter(isTownPath).map((r) => r.id)
  );
  const freshPath = townPathRoads().filter((r) => !existingPathIds.has(r.id));
  const nonPathRoads = (map.roads || []).filter((r) => !isTownPath(r));

  // 2. Buildings: assign unassigned buildings to empty lots by type.
  //    Buildings on lots that no longer exist (dangling townLotId) are
  //    treated as unassigned and re-homed to a free matching lot if possible.
  const validLotIds = new Set(TOWN_LOTS.map((l) => l.id));
  const buildings = map.buildings || [];
  const occupiedLotIds = new Set<string>();
  const normalized = buildings.map((b) => {
    if (b.townLotId && validLotIds.has(b.townLotId)) {
      occupiedLotIds.add(b.townLotId);
      return b;
    }
    return b.townLotId ? { ...b, townLotId: undefined } : b;
  });
  const moved = normalized.map((b) => {
    if (b.townLotId) return b; // already on a valid lot
    const lot = TOWN_LOTS.find(
      (l) => !occupiedLotIds.has(l.id) && l.allowedTypes.includes(b.type)
    );
    if (!lot) return b; // no fitting lot — stays as legacy free-placed
    occupiedLotIds.add(lot.id);
    if (b.x === lot.x && b.y === lot.y) return { ...b, townLotId: lot.id };
    return { ...b, x: lot.x, y: lot.y, townLotId: lot.id };
  });

  const roadsChanged = freshPath.length > 0 || nonPathRoads.length > 0;
  const buildingsChanged = moved.some((b, i) => b !== buildings[i]);
  if (!roadsChanged && !buildingsChanged) return map;
  return {
    ...map,
    roads: [...(map.roads || []).filter(isTownPath), ...freshPath],
    buildings: moved,
  };
}

export type PlacedBuilding = {
  id: string;
  type: BuildingType;
  x: number;
  y: number;
  level: 1 | 2 | 3 | 4 | 5;
  floors?: number; // bank-tower stories (default 1, max 5)
  plotId?: string; // city plot id — fixed-position plot building (no move/sell)
  townLotId?: string; // town neighborhood lot id — fixed-position lot building (no move/sell)
  workers?: number; // hired townsfolk (0-3), each +10% output
  accumulated?: number;
  lastTick?: string;
  /** NPC bank-visit bonus tracking: count of visit bonuses in the current hour bucket. */
  visitBonusCount?: number;
  /** Hour bucket (YYYY-MM-DDTHH) for visitBonusCount — max 5 visit bonuses per bank per hour. */
  visitBonusHour?: string;
};

export type PlacedDecoration = {
  id: string;
  type: DecorationType;
  x: number;
  y: number;
};

export type PlacedRoad = {
  id: string;
  x: number;
  y: number;
};

export type MapState = {
  buildings: PlacedBuilding[];
  decorations: PlacedDecoration[];
  roads: PlacedRoad[];
};

export type TownState = {
  maps: Record<TownMapId, MapState>;
  lastIncomeDate: string | null;
};

export const TOWN_GRID_SIZE = 10;

export function emptyMapState(): MapState {
  return { buildings: [], decorations: [], roads: [] };
}

export function emptyTownState(): TownState {
  return {
    maps: {
      town: emptyMapState(),
      city: ensureCityStreets(emptyMapState()),
      mall: emptyMapState(),
      school: emptyMapState(),
      reserve: emptyMapState(),
    },
    lastIncomeDate: null,
  };
}

function parseMapState(value: unknown): MapState {
  if (!value || typeof value !== "object") return emptyMapState();
  const m = value as Partial<MapState>;
  return {
    buildings: Array.isArray(m.buildings) ? m.buildings.filter(b => b && typeof b.id === "string").map(b => ({ ...b, level: [1, 2, 3, 4, 5].includes(b.level) ? b.level : 1 as const })) : [],
    decorations: Array.isArray(m.decorations) ? m.decorations.filter(d => d && typeof d.id === "string") : [],
    roads: Array.isArray(m.roads) ? m.roads.filter(r => r && typeof r.id === "string") : [],
  };
}

export function parseTown(value: unknown): TownState {
  if (!value || typeof value !== "object") return emptyTownState();
  const t = value as Partial<TownState> & { buildings?: unknown; decorations?: unknown; roads?: unknown };
  const lastIncomeDate = typeof t.lastIncomeDate === "string" ? t.lastIncomeDate : null;
  // New multi-map format
  if (t.maps && typeof t.maps === "object") {
    const raw = t.maps as Partial<Record<TownMapId, unknown>>;
    return {
      maps: {
        town: ensureTownNeighborhood(parseMapState(raw.town)),
        city: ensureCityStreets(parseMapState(raw.city)),
        mall: parseMapState(raw.mall),
        school: parseMapState(raw.school),
        reserve: parseMapState(raw.reserve),
      },
      lastIncomeDate,
    };
  }
  // Old single-map format: migrate everything into the town map
  return {
    maps: {
      town: ensureTownNeighborhood(parseMapState({ buildings: t.buildings, decorations: t.decorations, roads: t.roads })),
      city: ensureCityStreets(emptyMapState()),
      mall: emptyMapState(),
      school: emptyMapState(),
      reserve: emptyMapState(),
    },
    lastIncomeDate,
  };
}
/**
 * Highest level of any placed building of the given type across all maps.
 * Used for tiered shop inventory (better stock at higher shop levels).
 * Returns 0 when no matching building is placed.
 */
export async function shopBuildingLevel(type: BuildingType): Promise<number> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem(TOWN_STORAGE_KEY);
    if (!raw) return 0;
    const town = parseTown(JSON.parse(raw));
    let best = 0;
    for (const mapId of TOWN_MAP_IDS) {
      const map = town.maps[mapId];
      if (!map) continue;
      for (const b of map.buildings) {
        if (b.type === type && typeof b.level === "number" && b.level > best) {
          best = b.level;
        }
      }
    }
    return best;
  } catch {
    return 0;
  }
}


// Roads create a multiplier for connected buildings.
// Buildings connected via adjacent roads form a network.
// Multiplier = 1 + 0.25 * (networkSize - 1), so:
// 1 building (no network) = 1x, 2 connected = 1.25x, 3 = 1.5x, 4 = 1.75x, etc.
export function roadMultiplierForBuilding(map: MapState, buildingId: string): number {
  const roads = map.roads || [];
  const buildings = map.buildings;
  if (roads.length === 0) return 1;

  // Build adjacency: find all buildings connected via roads
  const building = buildings.find(b => b.id === buildingId);
  if (!building) return 1;

  // BFS from this building through roads to find connected buildings
  const visited = new Set<string>();
  const roadVisited = new Set<string>();
  const queue: Array<{x: number, y: number, isBuilding: boolean, id?: string}> = [
    { x: building.x, y: building.y, isBuilding: true, id: building.id }
  ];
  visited.add(building.id);

  const isAdjacent = (x1: number, y1: number, x2: number, y2: number) =>
    (Math.abs(x1 - x2) === 1 && y1 === y2) || (Math.abs(y1 - y2) === 1 && x1 === x2);

  let connectedCount = 1;

  while (queue.length > 0) {
    const current = queue.shift()!;
    // Find adjacent roads
    for (const road of roads) {
      const roadKey = `${road.x},${road.y}`;
      if (roadVisited.has(roadKey)) continue;
      if (isAdjacent(current.x, current.y, road.x, road.y)) {
        roadVisited.add(roadKey);
        // From this road, find adjacent buildings
        for (const b of buildings) {
          if (visited.has(b.id)) continue;
          if (isAdjacent(road.x, road.y, b.x, b.y)) {
            visited.add(b.id);
            connectedCount++;
            queue.push({ x: b.x, y: b.y, isBuilding: true, id: b.id });
          }
        }
        // Also continue through to other roads
        for (const r2 of roads) {
          const r2Key = `${r2.x},${r2.y}`;
          if (roadVisited.has(r2Key)) continue;
          if (isAdjacent(road.x, road.y, r2.x, r2.y)) {
            roadVisited.add(r2Key);
            queue.push({ x: r2.x, y: r2.y, isBuilding: false });
          }
        }
      }
    }
  }

  if (connectedCount <= 1) return 1;
  return 1 + 0.25 * (connectedCount - 1);
}

/** Returns 1.25 if the building is connected via roads to a barbershop, else 1. */
export function barbershopBoostForBuilding(map: MapState, buildingId: string): number {
  const roads = map.roads || [];
  const buildings = map.buildings;
  if (roads.length === 0) return 1;

  const building = buildings.find(b => b.id === buildingId);
  if (!building) return 1;
  // Barbershop doesn't boost itself
  if (building.type === "barbershop") return 1;

  const isAdjacent = (x1: number, y1: number, x2: number, y2: number) =>
    (Math.abs(x1 - x2) === 1 && y1 === y2) || (Math.abs(y1 - y2) === 1 && x1 === x2);

  // BFS through road network looking for a barbershop
  const visitedBuildings = new Set<string>([building.id]);
  const roadVisited = new Set<string>();
  const queue: Array<{ x: number; y: number }> = [{ x: building.x, y: building.y }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const road of roads) {
      const roadKey = `${road.x},${road.y}`;
      if (roadVisited.has(roadKey)) continue;
      if (isAdjacent(current.x, current.y, road.x, road.y)) {
        roadVisited.add(roadKey);
        for (const b of buildings) {
          if (visitedBuildings.has(b.id)) continue;
          // Check adjacency to any tile of the building's footprint
          const fp = buildingFootprint(b.level || 1, b.type);
          let adjacent = false;
          for (let dx = 0; dx < fp.w && !adjacent; dx++) {
            for (let dy = 0; dy < fp.h && !adjacent; dy++) {
              if (isAdjacent(road.x, road.y, b.x + dx, b.y + dy)) adjacent = true;
            }
          }
          if (adjacent) {
            if (b.type === "barbershop") return 1.25;
            visitedBuildings.add(b.id);
            queue.push({ x: b.x, y: b.y });
          }
        }
        for (const r2 of roads) {
          const r2Key = `${r2.x},${r2.y}`;
          if (roadVisited.has(r2Key)) continue;
          if (isAdjacent(road.x, road.y, r2.x, r2.y)) {
            roadVisited.add(r2Key);
            queue.push({ x: r2.x, y: r2.y });
          }
        }
      }
    }
  }
  return 1;
}

// Building footprint: level = size (L1=1x1, L2=2x2, L3=3x3).
// City buildings are big: minimum 2x2 at L1 (L1=2x2, L2=3x3, L3=4x4).
const CITY_BIG_TYPES: BuildingType[] = ["bank-tower", "department-store", "hotel", "office"];
export function buildingFootprint(level: number, type?: BuildingType, isPlot?: boolean): { w: number; h: number } {
  // City plot buildings are fixed 2x2 — upgrades grow taller, not wider
  if (isPlot) return { w: 2, h: 2 };
  // Houses stay 1x1 at every level — they get fancier, not bigger
  if (type === "house") return { w: 1, h: 1 };
  const s = Math.min(Math.max(level || 1, 1), 3);
  if (type && CITY_BIG_TYPES.includes(type)) {
    const big = s + 1; // L1=2, L2=3, L3=4
    return { w: big, h: big };
  }
  return { w: s, h: s };
}

/** XP per day for a building type/level (0 for coin buildings). */
export function xpIncomeFor(type: BuildingType, level: number): number {
  const base = BUILDINGS[type].xpPerDay;
  if (base === 0) return 0;
  const mult = UPGRADE_INCOME_MULT[Math.min(Math.max(level || 1, 1), 3) as 1 | 2 | 3];
  return Math.round(base * mult);
}

/** Shop types that give adjacency bonuses to neighboring income buildings. */
const SHOP_TYPES: BuildingType[] = [
  "barbershop", "clothes-shop", "armory", "weaponsmith", "toolshop",
  "food-court", "bookstore", "arcade", "cinema",
  "bank-tower", "department-store", "hotel", "office",
  "pizza-place", "burger-joint", "taco-stand", "sushi-bar", "diner",
];

/**
 * Commercial district bonus: income buildings adjacent to shops earn more.
 * +15% per adjacent shop, capped at +60% (4 shops).
 * Footprint-aware: checks all tiles of both buildings for orthogonal adjacency.
 */
export function shopAdjacencyBonusForBuilding(map: MapState, buildingId: string): number {
  const buildings = map.buildings;
  const building = buildings.find(b => b.id === buildingId);
  if (!building) return 1;

  const fp = buildingFootprint(building.level || 1, building.type, hasFixedFootprint(building));
  // Collect all tiles of the target building
  const myTiles = new Set<string>();
  for (let dx = 0; dx < fp.w; dx++)
    for (let dy = 0; dy < fp.h; dy++)
      myTiles.add(`${building.x + dx},${building.y + dy}`);

  const isOrthogonal = (x1: number, y1: number, x2: number, y2: number) =>
    (Math.abs(x1 - x2) === 1 && y1 === y2) || (Math.abs(y1 - y2) === 1 && x1 === x2);

  let shopCount = 0;
  for (const other of buildings) {
    if (other.id === buildingId) continue;
    if (!SHOP_TYPES.includes(other.type)) continue;
    const ofp = buildingFootprint(other.level || 1, other.type, hasFixedFootprint(other));
    let adjacent = false;
    for (let dx = 0; dx < ofp.w && !adjacent; dx++) {
      for (let dy = 0; dy < ofp.h && !adjacent; dy++) {
        const ox = other.x + dx, oy = other.y + dy;
        for (const t of myTiles) {
          const [tx, ty] = t.split(",").map(Number);
          if (isOrthogonal(ox, oy, tx, ty)) { adjacent = true; break; }
        }
      }
    }
    if (adjacent) shopCount++;
  }

  return 1 + Math.min(shopCount, 4) * 0.15;
}

// ---- Bank tower floors ----
// Bank-towers can grow upward: each added floor costs more but multiplies earnings.
export const BANK_MAX_FLOORS = 5;
/** Cost to add the next floor when the tower currently has `currentFloors` (1-4). */
export function bankFloorCost(currentFloors: number): number {
  const costs: Record<number, number> = { 1: 100, 2: 250, 3: 500, 4: 1000 };
  return costs[currentFloors] ?? 0;
}
/** Income multiplier for a bank-tower with `floors` stories: +50% per extra floor. */
export function bankFloorMultiplier(floors: number): number {
  const f = Math.min(Math.max(floors || 1, 1), BANK_MAX_FLOORS);
  return 1 + (f - 1) * 0.5;
}

/**
 * Buildings only earn if there are cottages (people) on the map.
 * No houses = no customers = no income. City counts town's houses via commuters.
 */
export function mapHasPopulation(map: MapState, town?: TownState): boolean {
  // Population is now the prayer lights (people prayed for today).
  // The prayer and population multipliers scale income by prayed count,
  // so no hard gate is needed — the town is alive when Jonathan prays.
  return true;
}

// ---- Idle mechanics: workers, coin milestones, tap frenzy ----

export const WORKER_HIRE_COST = 40;
export const MAX_WORKERS_PER_BUILDING = 3;
export const WORKER_INCOME_BOOST = 0.1; // +10% output per worker

/** Output multiplier from hired workers: 1 + 0.1 per worker. */
export function workerMult(b: PlacedBuilding): number {
  return 1 + WORKER_INCOME_BOOST * (b.workers || 0);
}

/** Total hired workers across all maps (for the NPC availability cap). */
export function totalHiredWorkers(town: TownState): number {
  return TOWN_MAP_IDS.reduce(
    (sum, id) => sum + town.maps[id].buildings.reduce((s, b) => s + (b.workers || 0), 0),
    0
  );
}

export type CoinMilestone = { threshold: number; mult: number; name: string };

export const COIN_MILESTONES: CoinMilestone[] = [
  { threshold: 500, mult: 1.05, name: "Bronze Merchant" },
  { threshold: 1500, mult: 1.10, name: "Silver Trader" },
  { threshold: 5000, mult: 1.20, name: "Gold Tycoon" },
  { threshold: 15000, mult: 1.35, name: "Platinum Magnate" },
];

/** Highest milestone reached for a lifetime earnings total (null if none). */
export function milestoneFor(lifetimeEarned: number): { current: CoinMilestone | null; next: CoinMilestone | null } {
  let current: CoinMilestone | null = null;
  let next: CoinMilestone | null = null;
  for (const m of COIN_MILESTONES) {
    if (lifetimeEarned >= m.threshold) current = m;
    else if (!next) next = m;
  }
  return { current, next };
}

/** Permanent coin-income multiplier from lifetime earnings milestones. */
export function milestoneMultiplier(lifetimeEarned: number): number {
  return milestoneFor(lifetimeEarned).current?.mult ?? 1;
}

// Tap frenzy: rapid-tap a coin 5+ times in 2s → 2x collects for 10s (5-min cooldown)
export const FRENZY_STORAGE_KEY = "prayercircle.hometown.frenzy.v1";
export const FRENZY_TAPS_NEEDED = 5;
export const FRENZY_WINDOW_MS = 2000;
export const FRENZY_DURATION_MS = 10000;
export const FRENZY_COOLDOWN_MS = 5 * 60 * 1000;
export const FRENZY_MULT = 2;

export function dailyIncomeForMap(map: MapState, town?: TownState, milestoneMult: number = 1, fellowshipBonus: number = 1, prayedCount: number = 0, remembranceBonus: number = 1, gardenVisitBonus: number = 1): number {
  if (!mapHasPopulation(map, town)) return 0;
  const popMult = populationMult(prayedCount);
  return map.buildings.reduce((sum, b) => {
    const base = effectiveIncomeFor(b);
    const floorMult = b.type === "bank-tower" ? bankFloorMultiplier(b.floors || 1) : 1;
    const multiplier = roadMultiplierForBuilding(map, b.id) * shopAdjacencyBonusForBuilding(map, b.id) * floorMult * workerMult(b) * milestoneMult * popMult * fellowshipBonus * remembranceBonus * gardenVisitBonus;
    return sum + (base * multiplier);
  }, 0);
}

export function dailyXPForMap(map: MapState): number {
  return map.buildings.reduce((sum, b) => sum + xpIncomeFor(b.type, b.level || 1) * workerMult(b), 0);
}

export function dailyIncomeForTown(town: TownState, milestoneMult: number = 1, houseMult: number = 1, fellowshipBonus: number = 1, prayedCount: number = 0, remembranceBonus: number = 1, gardenVisitBonus: number = 1): number {
  return TOWN_MAP_IDS.reduce((sum, id) => sum + dailyIncomeForMap(town.maps[id], town, milestoneMult, fellowshipBonus, prayedCount, remembranceBonus, gardenVisitBonus), 0) * houseMult;
}

export function dailyXPForTown(town: TownState): number {
  return TOWN_MAP_IDS.reduce((sum, id) => sum + dailyXPForMap(town.maps[id]), 0);
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
  { id: "pawn-shadow", name: "Shadow Pebble", icon: "🌑", cost: 120, tier: 2, type: "pawn-skin", description: "A mysterious pebble from the deep dark." },
  { id: "pawn-rainbow", name: "Rainbow Pebble", icon: "🌈", cost: 250, tier: 3, type: "pawn-skin", description: "Joy in every color." },
  { id: "pawn-diamond", name: "Diamond Pebble", icon: "💎", cost: 500, tier: 4, type: "pawn-skin", description: "Pure brilliance. For the truly committed." },
];

export const SHOP_OWNED_KEY = "prayercircle.hometown.shop-owned.v1";

export function parseOwnedItems(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

// ---- Bank Interior ----

export type BankInteriorItem = {
  id: string;
  kind: "desk" | "carpet";
  x: number;
  y: number;
  /** Price paid — used for full-refund sells. Legacy items omit this. */
  cost?: number;
};

export type BankFurnitureType = "teller" | "atm" | "vault" | "plant" | "chandelier" | "guard";

export type BankFurnitureItem = {
  id: string;
  type: BankFurnitureType;
  x: number;
  y: number;
  /** Price paid — sold back at full refund. */
  cost: number;
  /** Uncollected drip coins sitting on this item (ATMs & vaults). Tap in the interior to collect. */
  pending?: number;
  /** ISO timestamp of the last drip accrual for this item. */
  lastTick?: string;
  /** Storage upgrade level for ATMs & vaults (0, 1, 2). Higher = bigger coin cap. */
  storageLevel?: number;
};

/** One floor's layout inside a bank building. */
export type BankFloorInterior = {
  desks: BankInteriorItem[];
  carpets: BankInteriorItem[];
  furniture: BankFurnitureItem[];
};

export type BankInteriorState = {
  /** Keyed by floor number ("1", "2", ...). */
  floors: Record<string, BankFloorInterior>;
};

export const BANK_INTERIOR_GRID = { w: 8, h: 6 };
export const BANK_DESK_COST = 20;
export const BANK_CARPET_COST = 5;
export const BANK_MAX_DESKS = 6;

/** Floor themes: each bank story has its own decorating tier. */
export const BANK_FLOOR_THEMES = ["Lobby", "Executive", "Prestige", "Royal", "Penthouse"];
export function bankFloorTheme(floor: number): string {
  const i = Math.min(Math.max(floor, 1), 5) - 1;
  return BANK_FLOOR_THEMES[i];
}

/** Price multiplier per floor: 1x, 1.5x, 2x, 2.5x, 3x. */
export function bankFloorPriceMult(floor: number): number {
  const f = Math.min(Math.max(Math.round(floor) || 1, 1), 5);
  return 1 + (f - 1) * 0.5;
}

/** Desk cost scales by floor (20 / 30 / 40 / 50 / 60). */
export function bankDeskCost(floor: number): number {
  return Math.round(BANK_DESK_COST * bankFloorPriceMult(floor));
}

/** Carpet cost scales by floor. Floor 1 carpets are 1 coin. */
export function bankCarpetCost(floor: number): number {
  if (floor <= 1) return 1;
  return Math.max(1, Math.round(bankFloorPriceMult(floor)));
}

const DESK_TIER_NAMES = ["Desk", "Executive Desk", "Mahogany Desk", "Marble Desk", "Gold Desk"];
export function bankDeskName(floor: number): string {
  return DESK_TIER_NAMES[Math.min(Math.max(floor, 1), 5) - 1];
}

const CARPET_TIER_NAMES = ["Carpet", "Executive Carpet", "Marble Floor", "Silk Carpet", "Gold-Leaf Floor"];
export function bankCarpetName(floor: number): string {
  return CARPET_TIER_NAMES[Math.min(Math.max(floor, 1), 5) - 1];
}

/** Carpet tile tint per floor tier. */
const CARPET_TIER_COLORS = ["#E7DCC8", "#DCC9A3", "#EDE9E1", "#F1E3C6", "#F5DC8A"];
export function bankCarpetColor(floor: number): string {
  return CARPET_TIER_COLORS[Math.min(Math.max(floor, 1), 5) - 1];
}

/** Connected-desk network bonus per desk, per floor tier (25% → 45%). */
export function bankDeskBonusPerDesk(floor: number): number {
  return 0.25 + (Math.min(Math.max(floor, 1), 5) - 1) * 0.05;
}

// ---- Bank furniture catalog (per floor tier) ----

export type BankFurnitureDef = {
  type: BankFurnitureType;
  name: string;
  icon: string;
  cost: number;
  /** Max placeable per floor. */
  max: number;
  /** Additive % income bonus per item (e.g. 10 = +10%). */
  effectPct: number;
  /** Flat coins/day per item (ATMs). */
  flatPerHour: number;
  blurb: string;
};

type FurnitureTierSpec = {
  name: string;
  icon: string;
  cost: number;
  max: number;
  effectPct: number;
  flatPerHour: number;
  blurb: string;
};

/** [type, tier1..tier5 specs] */
const BANK_FURNITURE_SPECS: Array<{ type: BankFurnitureType; tiers: [FurnitureTierSpec, FurnitureTierSpec, FurnitureTierSpec, FurnitureTierSpec, FurnitureTierSpec] }> = [
  {
    type: "plant",
    tiers: [
      { name: "Potted Plant", icon: "🪴", cost: 10, max: 6, effectPct: 2, flatPerHour: 0, blurb: "+2% income" },
      { name: "Marble Planter", icon: "🌿", cost: 15, max: 6, effectPct: 3, flatPerHour: 0, blurb: "+3% income" },
      { name: "Topiary", icon: "🌳", cost: 20, max: 6, effectPct: 4, flatPerHour: 0, blurb: "+4% income" },
      { name: "Royal Garden Bed", icon: "🌺", cost: 25, max: 6, effectPct: 5, flatPerHour: 0, blurb: "+5% income" },
      { name: "Oasis Palm", icon: "🌴", cost: 30, max: 6, effectPct: 6, flatPerHour: 0, blurb: "+6% income" },
    ],
  },
  {
    type: "teller",
    tiers: [
      { name: "Teller Window", icon: "🖥️", cost: 50, max: 4, effectPct: 10, flatPerHour: 0, blurb: "+10% income" },
      { name: "Executive Teller", icon: "🖥️", cost: 75, max: 4, effectPct: 15, flatPerHour: 0, blurb: "+15% income" },
      { name: "Prestige Teller", icon: "🖥️", cost: 100, max: 4, effectPct: 20, flatPerHour: 0, blurb: "+20% income" },
      { name: "Royal Teller Suite", icon: "🖥️", cost: 125, max: 4, effectPct: 25, flatPerHour: 0, blurb: "+25% income" },
      { name: "Penthouse Concierge", icon: "🖥️", cost: 150, max: 4, effectPct: 30, flatPerHour: 0, blurb: "+30% income" },
    ],
  },
  {
    type: "guard",
    tiers: [
      { name: "Security Guard", icon: "🛡️", cost: 80, max: 2, effectPct: 12, flatPerHour: 0, blurb: "+12% income" },
      { name: "Elite Guard", icon: "🛡️", cost: 120, max: 2, effectPct: 18, flatPerHour: 0, blurb: "+18% income" },
      { name: "Tactical Guard", icon: "🛡️", cost: 160, max: 2, effectPct: 24, flatPerHour: 0, blurb: "+24% income" },
      { name: "Royal Guard", icon: "🛡️", cost: 200, max: 2, effectPct: 30, flatPerHour: 0, blurb: "+30% income" },
      { name: "Secret Service", icon: "🛡️", cost: 240, max: 2, effectPct: 36, flatPerHour: 0, blurb: "+36% income" },
    ],
  },
  {
    type: "atm",
    tiers: [
      { name: "ATM", icon: "🏧", cost: 150, max: 2, effectPct: 0, flatPerHour: 8, blurb: "+8 coins/hour" },
      { name: "Express ATM", icon: "🏧", cost: 230, max: 2, effectPct: 0, flatPerHour: 12, blurb: "+12 coins/hour" },
      { name: "Gold ATM", icon: "🏧", cost: 300, max: 2, effectPct: 0, flatPerHour: 16, blurb: "+16 coins/hour" },
      { name: "Platinum ATM", icon: "🏧", cost: 380, max: 2, effectPct: 0, flatPerHour: 20, blurb: "+20 coins/hour" },
      { name: "Diamond ATM", icon: "🏧", cost: 450, max: 2, effectPct: 0, flatPerHour: 25, blurb: "+25 coins/hour" },
    ],
  },
  {
    type: "chandelier",
    tiers: [
      { name: "Chandelier", icon: "💡", cost: 100, max: 2, effectPct: 15, flatPerHour: 0, blurb: "+15% income" },
      { name: "Crystal Chandelier", icon: "💡", cost: 150, max: 2, effectPct: 22, flatPerHour: 0, blurb: "+22% income" },
      { name: "Grand Chandelier", icon: "🕯️", cost: 200, max: 2, effectPct: 30, flatPerHour: 0, blurb: "+30% income" },
      { name: "Diamond Chandelier", icon: "💎", cost: 250, max: 2, effectPct: 38, flatPerHour: 0, blurb: "+38% income" },
      { name: "Starlight Chandelier", icon: "✨", cost: 300, max: 2, effectPct: 45, flatPerHour: 0, blurb: "+45% income" },
    ],
  },
  {
    type: "vault",
    tiers: [
      { name: "Vault", icon: "🔐", cost: 300, max: 1, effectPct: 25, flatPerHour: 0, blurb: "+25%/hr income" },
      { name: "Reinforced Vault", icon: "🔐", cost: 450, max: 1, effectPct: 35, flatPerHour: 0, blurb: "+35%/hr income" },
      { name: "Titanium Vault", icon: "🔐", cost: 600, max: 1, effectPct: 50, flatPerHour: 0, blurb: "+50%/hr income" },
      { name: "Crown Vault", icon: "👑", cost: 800, max: 1, effectPct: 65, flatPerHour: 0, blurb: "+65%/hr income" },
      { name: "Fort Knox Vault", icon: "💰", cost: 1000, max: 1, effectPct: 80, flatPerHour: 0, blurb: "+80%/hr income" },
    ],
  },
];

/** Furniture catalog for a given floor tier (1–5). */
export function bankFurnitureCatalog(floor: number): BankFurnitureDef[] {
  const i = Math.min(Math.max(Math.round(floor) || 1, 1), 5) - 1;
  return BANK_FURNITURE_SPECS.map((s) => ({ type: s.type, ...s.tiers[i] }));
}

/** Single furniture def lookup (for bonus math on placed items). */
export function bankFurnitureDef(type: BankFurnitureType, floor: number): BankFurnitureDef | undefined {
  return bankFurnitureCatalog(floor).find((d) => d.type === type);
}

export function bankInteriorKey(buildingId: string): string {
  return `prayercircle.hometown.bank.${buildingId}.v1`;
}

/** Storage caps for ATM/vault drip coins, per storage upgrade level (0, 1, 2). */
export const ATM_STORAGE_CAPS = [50, 150, 400];
export const VAULT_STORAGE_CAPS = [200, 500, 1200];
/** Cost to upgrade from level N to N+1. */
export const ATM_STORAGE_UPGRADE_COSTS = [60, 160];
export const VAULT_STORAGE_UPGRADE_COSTS = [200, 500];
export const MAX_STORAGE_LEVEL = 2;

/** Coin cap for an ATM/vault at a given storage upgrade level. */
export function storageCapFor(type: "atm" | "vault", storageLevel?: number): number {
  const lvl = Math.min(Math.max(storageLevel ?? 0, 0), MAX_STORAGE_LEVEL);
  return type === "atm" ? ATM_STORAGE_CAPS[lvl] : VAULT_STORAGE_CAPS[lvl];
}

/** Upgrade cost from the current storage level to the next (null when maxed). */
export function storageUpgradeCostFor(type: "atm" | "vault", storageLevel?: number): number | null {
  const lvl = Math.min(Math.max(storageLevel ?? 0, 0), MAX_STORAGE_LEVEL);
  if (lvl >= MAX_STORAGE_LEVEL) return null;
  return type === "atm" ? ATM_STORAGE_UPGRADE_COSTS[lvl] : VAULT_STORAGE_UPGRADE_COSTS[lvl];
}

export function parseBankInterior(value: unknown): BankInteriorState {
  const emptyFloor = (): BankFloorInterior => ({ desks: [], carpets: [], furniture: [] });
  if (!value || typeof value !== "object") return { floors: {} };
  const s = value as Partial<BankInteriorState> & { desks?: unknown; carpets?: unknown };
  const cleanItems = (arr: unknown): BankInteriorItem[] =>
    Array.isArray(arr)
      ? arr
          .filter((i) => i && typeof i.id === "string" && typeof i.x === "number" && typeof i.y === "number")
          .map((i) => ({
            id: i.id as string,
            kind: (i as { kind?: unknown }).kind === "carpet" ? ("carpet" as const) : ("desk" as const),
            x: i.x as number,
            y: i.y as number,
            ...(typeof (i as { cost?: unknown }).cost === "number" ? { cost: (i as { cost: number }).cost } : {}),
          }))
      : [];
  const cleanFurniture = (arr: unknown): BankFurnitureItem[] =>
    Array.isArray(arr)
      ? arr
          .filter(
            (i) =>
              i &&
              typeof i.id === "string" &&
              typeof i.type === "string" &&
              typeof i.x === "number" &&
              typeof i.y === "number" &&
              typeof i.cost === "number"
          )
          .map((i) => ({
            id: i.id as string,
            type: (i as { type: BankFurnitureType }).type,
            x: i.x as number,
            y: i.y as number,
            cost: (i as { cost: number }).cost,
            ...(typeof (i as { pending?: unknown }).pending === "number"
              ? { pending: (i as { pending: number }).pending }
              : {}),
            ...(typeof (i as { lastTick?: unknown }).lastTick === "string"
              ? { lastTick: (i as { lastTick: string }).lastTick }
              : {}),
            ...(typeof (i as { storageLevel?: unknown }).storageLevel === "number"
              ? { storageLevel: Math.min(Math.max((i as { storageLevel: number }).storageLevel, 0), 2) }
              : {}),
          }))
      : [];
  // Migrate legacy flat shape { desks, carpets } -> floors["1"]
  if (!s.floors && (Array.isArray(s.desks) || Array.isArray(s.carpets))) {
    return {
      floors: {
        "1": { desks: cleanItems(s.desks), carpets: cleanItems(s.carpets), furniture: [] },
      },
    };
  }
  const floors: Record<string, BankFloorInterior> = {};
  if (s.floors && typeof s.floors === "object") {
    for (const [k, v] of Object.entries(s.floors)) {
      const fv = (v || {}) as Partial<BankFloorInterior>;
      floors[k] = {
        desks: cleanItems(fv.desks),
        carpets: cleanItems(fv.carpets),
        furniture: cleanFurniture(fv.furniture),
      };
    }
  }
  return { floors };
}

/**
 * Desk network multiplier: a desk counts as "connected" if it can reach
 * another desk via orthogonally-adjacent carpet tiles (BFS through carpets + desks).
 * Each connected desk gives a per-floor-tier bonus (25% on floor 1, up to 45% on floor 5).
 */
export function connectedDeskCount(items: { desks: BankInteriorItem[]; carpets: BankInteriorItem[] }): number {
  const { desks, carpets } = items;
  if (desks.length < 2) return 0;

  const carpetSet = new Set(carpets.map(c => `${c.x},${c.y}`));
  const deskSet = new Set(desks.map(d => `${d.x},${d.y}`));
  // Walkable = carpet tiles + desk tiles
  const walkable = new Set([...carpetSet, ...deskSet]);

  const neighbors = (x: number, y: number) => [
    [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1],
  ];

  // BFS from each desk; a desk is connected if it reaches a different desk
  let connected = 0;
  for (const desk of desks) {
    const visited = new Set<string>([`${desk.x},${desk.y}`]);
    const queue: Array<[number, number]> = [[desk.x, desk.y]];
    let foundOther = false;
    while (queue.length > 0 && !foundOther) {
      const [cx, cy] = queue.shift()!;
      for (const [nx, ny] of neighbors(cx, cy)) {
        const key = `${nx},${ny}`;
        if (visited.has(key) || !walkable.has(key)) continue;
        visited.add(key);
        // Found a different desk?
        if (deskSet.has(key) && key !== `${desk.x},${desk.y}`) {
          foundOther = true;
          break;
        }
        queue.push([nx, ny]);
      }
    }
    if (foundOther) connected++;
  }
  return connected;
}

export type BankDripItem = { id: string; floor: number; perHour: number };

/**
 * Interior bonus for a bank building, split into two parts:
 * - `mult`: auto-applied multiplier (desk network + non-vault furniture %).
 *   This still feeds hourly coin accumulation directly.
 * - `vaultDrips` / `atmDrips`: per-item coin drips that accumulate as
 *   collectible `pending` coins ON the furniture inside the bank interior.
 *   ATMs drip their flat coins/hour; vaults drip their % as coins against the
 *   bank's hourly base income. Tapping the coin inside moves it to the
 *   building's tap-to-collect total.
 */
export async function bankInteriorBonus(buildingId: string): Promise<{
  mult: number;
  vaultDrips: BankDripItem[];
  atmDrips: BankDripItem[];
}> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem(bankInteriorKey(buildingId));
    if (!raw) return { mult: 1, vaultDrips: [], atmDrips: [] };
    const state = parseBankInterior(JSON.parse(raw));
    let mult = 1;
    const vaultDrips: BankDripItem[] = [];
    const atmDrips: BankDripItem[] = [];
    for (const [floorKey, floorInterior] of Object.entries(state.floors)) {
      const floor = parseInt(floorKey, 10) || 1;
      mult += connectedDeskCount(floorInterior) * bankDeskBonusPerDesk(floor);
      for (const item of floorInterior.furniture) {
        const def = bankFurnitureDef(item.type, floor);
        if (!def) continue;
        if (item.type === "vault") {
          // Vault % becomes a collectible drip instead of an auto multiplier.
          // perDay is resolved against the bank's base income at accrual time.
          vaultDrips.push({ id: item.id, floor, perHour: -1 });
        } else if (item.type === "atm") {
          atmDrips.push({ id: item.id, floor, perHour: def.flatPerHour });
        } else {
          mult += def.effectPct / 100;
        }
      }
    }
    return { mult, vaultDrips, atmDrips };
  } catch {
    return { mult: 1, vaultDrips: [], atmDrips: [] };
  }
}

/**
 * Accrue collectible drip coins onto a bank's ATM & vault furniture.
 * - `hoursElapsed`: whole hours since the last tick.
 * - `basePerHour`: the bank's hourly coin add BEFORE vault/atm bonuses
 *   (the full hourly chain minus the drip parts). Each vault drips
 *   basePerHour × its % per hour; each ATM drips flatPerHour per hour.
 * Writes `pending` onto each item in interior storage. No-op when there is
 * nothing to accrue.
 */
export async function accrueBankDrips(
  buildingId: string,
  minutesElapsed: number,
  basePerHour: number
): Promise<void> {
  if (minutesElapsed <= 0 || basePerHour <= 0) return;
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const key = bankInteriorKey(buildingId);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return;
    const state = parseBankInterior(JSON.parse(raw));
    let touched = false;
    const now = new Date().toISOString();
    for (const [floorKey, floorInterior] of Object.entries(state.floors)) {
      const floor = parseInt(floorKey, 10) || 1;
      let floorTouched = false;
      const nextFurniture = floorInterior.furniture.map((item) => {
        if (item.type !== "atm" && item.type !== "vault") return item;
        const def = bankFurnitureDef(item.type, floor);
        if (!def) return item;
        const cap = storageCapFor(item.type, item.storageLevel);
        const currentPending = item.pending || 0;
        if (currentPending >= cap) return item; // storage full — must collect first
        let drip = 0;
        if (item.type === "atm") {
          drip = (def.flatPerHour * minutesElapsed) / 60;
        } else {
          // vault: its % expressed as coins against the bank's hourly base
          drip = (basePerHour * (def.effectPct / 100) * minutesElapsed) / 60;
        }
        if (drip <= 0) return item;
        floorTouched = true;
        return {
          ...item,
          pending: Math.min(cap, Math.round((currentPending + drip) * 10) / 10),
          lastTick: now,
        };
      });
      if (floorTouched) {
        touched = true;
        state.floors[floorKey] = { ...floorInterior, furniture: nextFurniture };
      }
    }
    if (touched) {
      await AsyncStorage.setItem(key, JSON.stringify(state));
    }
  } catch {
    /* best effort */
  }
}

/** Interior multiplier only (desk network + furniture %, vaults excluded — they drip). Loads interior from storage by building ID. */
export async function bankDeskMultiplier(buildingId: string): Promise<number> {
  return (await bankInteriorBonus(buildingId)).mult;
}
