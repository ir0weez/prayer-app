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

export type TownMapId = "town" | "city" | "mall" | "school" | "well" | "reserve" | "forest" | "river";

export const TOWN_MAP_IDS: TownMapId[] = ["town", "city", "mall", "school", "well", "reserve", "forest", "river"];

export type MapInfo = {
  name: string;
  icon: string;
  description: string;
  unlockCost: number; // coins to unlock (0 = free)
  comingSoon: boolean;
};

export const MAP_INFO: Record<TownMapId, MapInfo> = {
  town:    { name: "Hometown", icon: "🏠", description: "Your starter town", unlockCost: 0, comingSoon: false },
  city:    { name: "City",     icon: "🏙️", description: "Bigger buildings, bigger earnings", unlockCost: 50000, comingSoon: false },
  // NOTE: the "mall" map id is legacy storage — it now renders the Garden of
  // Remembrance, a sacred memorial space. The id is kept so existing unlock
  // state carries over.
  mall:    { name: "Garden of Remembrance", icon: "🌸", description: "A sacred place to remember loved ones", unlockCost: 1000, comingSoon: false },
  school:  { name: "School",   icon: "🏫", description: "Buildings that earn XP", unlockCost: 1000, comingSoon: false },
  well:    { name: "The Well", icon: "💧", description: "Draw living water, once a day", unlockCost: 0, comingSoon: false },
  // The "reserve" map id now renders the Mission Field — send prayer lights
  // out on missions. The id is kept so existing unlock state carries over.
  reserve: { name: "Mission Field", icon: "🌾", description: "Send prayer lights out on missions", unlockCost: 500, comingSoon: false },
  forest:  { name: "Dark Forest", icon: "◆", description: "Battle demons in the dark wood", unlockCost: 1500, comingSoon: false },
  river:   { name: "River of Life", icon: "≋", description: "A riverside camp. Fish the waters and sell your catch.", unlockCost: 1000, comingSoon: false },
};

export const MAP_UNLOCKED_KEY = "prayercircle.hometown.maps.unlocked.v1";

/** Map unlock cost, scaled by the session economy scale. */
export function mapUnlockCost(id: TownMapId): number {
  return scaledCoins(MAP_INFO[id].unlockCost);
}

export function parseUnlockedMaps(value: unknown): TownMapId[] {
  if (!Array.isArray(value)) return ["town"];
  const valid = value.filter((v): v is TownMapId => typeof v === "string" && (TOWN_MAP_IDS as string[]).includes(v));
  if (!valid.includes("town")) valid.unshift("town");
  // Free maps are always available — no unlock tap needed.
  for (const id of TOWN_MAP_IDS) {
    if (!MAP_INFO[id].comingSoon && MAP_INFO[id].unlockCost === 0 && !valid.includes(id)) valid.push(id);
  }
  return valid;
}

// ---- Town ----

export type BuildingType =
  | "house"      // home for townsfolk
  | "villager-cottage" // home for the prayer lights — they sleep here at night
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
  | "apartments"
  | "city-market"
  | "theater"
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
  | "feast-hall"
  // The Marriage Supper — town banquet green where all lights gather
  | "banquet-table"
  // Interactive gathering places — everything is tappable and upgradeable.
  // Community Garden grows alongside the Garden of Remembrance: villagers
  // tend crops, Jonathan harvests for coins + XP.
  | "community-garden"
  // Amphitheater (city): villagers perform music and stories; attend a show.
  | "amphitheater"
  // Fountain Plaza (town): villagers gather, chat, and rest; a quiet refresh.
  | "fountain-plaza"
  // Hospital (town): care for the town. The pawn goes here for doctor
  // appointments; a checkup grants a healing blessing for Dark Forest battles.
  | "hospital"
  // Artisans' Row (town): artisan services along Artisans' Way, in the
  // southern extension below the hub district. All preset lots — unlock &
  // upgrade only, no designing. All have enterable interiors.
  | "inn"          // lodging: villagers rest, the pawn greets guests
  | "carpenter"    // woodworking shop: sawing, hammering, built furniture
  | "pottery"      // pottery studio: wheels, kiln, shaped clay
  | "music-hall"   // music hall: villagers play instruments (XP earner)
  | "tailor"       // tailor: sewing, fabric bolts, fitting room
  | "observatory"  // observatory: telescope, star charts (XP earner)
  | "bathhouse"    // bathhouse: steam, pools, restful waters
  | "apothecary"   // apothecary: herbs, potions, brewed remedies
  | "town-hall"    // civic center: grand hall, assemblies, notice board
  | "post-office" // mail: letters, parcels, the villager clerk's counter
  // City expansion — downtown cultural district (Library Row, Opera
  // District, Museum Quarter, Clock Tower Green, Embassy Row). All on
  // pre-placed plots: unlock & upgrade only, no free placement.
  | "grand-library" // towering shelves of books — the city's XP earner
  | "opera-house"   // grand stage, velvet seats, nightly performances
  | "museum"        // exhibits and artifacts from the town's story
  | "clock-tower"   // giant clock face, turning gears, the city's heartbeat
  | "embassy"       // flags and diplomats — greetings exchanged daily
  // Eastside expansion — the new right-hand column of the city grid
  // (x=8..9). Brand-new building types on pre-placed plots.
  | "music-studio"    // recording booth, instruments, villagers lay down tracks
  | "art-gallery"     // paintings and sculptures on quiet gallery walls
  | "flower-market"   // stalls of fresh blooms, the city's color corner
  | "coffee-roastery"; // roaster, bean sacks, and a warm tasting counter

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

/**
 * Fast-length gating + economy scaling.
 *
 * Hometown (and the pawn) unlock only on fasts longer than 40 days — a
 * town is a long-haul companion, not a weekend project.
 *
 * The economy scales with the selected fast's length so the math feels
 * fair: a 365-day fast uses the base numbers (scale 1.0); shorter fasts
 * scale costs AND income down together, so the relative pace is the
 * same with fewer earning days. Floor of 0.45 keeps short fasts
 * meaningful instead of trivial.
 */
export const HOMETOWN_MIN_FAST_DAYS = 40;

/** True when the given fast length unlocks Hometown. */
export function hometownUnlockedForFastLength(durationDays: number): boolean {
  return (durationDays || 0) > HOMETOWN_MIN_FAST_DAYS;
}

/** Economy scale for a fast length in days. 365+ days -> 1.0. */
export function economyScaleForFastLength(durationDays: number): number {
  const d = Math.max(0, durationDays || 0);
  const t = Math.min(d, 365) / 365;
  return 0.45 + 0.55 * t;
}

/** Session-cached economy scale, set once when Hometown loads. Defaults to 1. */
let cachedEconomyScale = 1;
export function setEconomyScale(scale: number): void {
  cachedEconomyScale = scale > 0 && Number.isFinite(scale) ? scale : 1;
}
export function getEconomyScale(): number {
  return cachedEconomyScale;
}

/** Scale a coin amount by the session economy scale, rounded to cents. */
export function scaledCoins(amount: number): number {
  return Math.round((amount || 0) * cachedEconomyScale * 100) / 100;
}

/** Scale an XP amount by the session economy scale, rounded to whole XP. */
export function scaledXP(amount: number): number {
  return Math.round((amount || 0) * cachedEconomyScale);
}

/** Active fast's durationDays from fasting storage (0 when none found). */
export async function loadActiveFastLength(): Promise<number> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const { getActiveFast } = await import("./prayercircle-fasting");
    const { getTodayISOString } = await import("./prayercircle-data");
    const raw = await AsyncStorage.getItem("prayercircle.fasts.v1");
    if (!raw) return 0;
    const fasts = JSON.parse(raw);
    if (!Array.isArray(fasts) || fasts.length === 0) return 0;
    const active = getActiveFast(fasts, getTodayISOString());
    const days = active?.durationDays ?? 0;
    return typeof days === "number" && days > 0 ? days : 0;
  } catch {
    return 0;
  }
}

// Houses upgrade through 5 tiers (Cottage -> Mansion), each level +1 townsman.
export const HOUSE_LEVEL_NAMES: Record<number, string> = {
  1: "Cottage", 2: "House", 3: "Townhouse", 4: "Villa", 5: "Mansion",
};
export const HOUSE_UPGRADE_COSTS: Record<number, number> = { 2: 75, 3: 400, 4: 750, 5: 1500 };

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
export const CHURCH_PRAYER_COINS_PER_HOUR = 20;

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
  if (type === "house") return scaledCoins(HOUSE_UPGRADE_COSTS[toLevel] ?? 0);
  const def = BUILDINGS[type];
  // City buildings are post-prestige endgame: upgrades are anchored to
  // ~60,000 (L2) / ~250,000 (L3) for a typical 600-coin city building,
  // scaled per building by its base cost.
  const isCityType = def.maps.length > 0 && def.maps.every((m) => m === "city");
  if (isCityType) {
    return scaledCoins(toLevel >= 3 ? def.cost * 400 : def.cost * 100);
  }
  // Town upgrades: L2 costs 5x the old price, L3 costs 10x the old price
  // (old prices were base x3 / base x5).
  return scaledCoins(def.cost * (toLevel >= 3 ? 50 : 15));
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

// PACING (tuned Oct 2026 against a simulation of the live accrual model):
// town lot + building costs are scaled so one pre-prestige run lasts about
// a 365-day fast for an engaged player — first building on day 1, all lots
// built by ~day 60, and the L2/L3 upgrades as the long tail, with the full
// town (every lot, everything L3) landing around day 300-365. Pure-city
// building costs are NOT scaled — the city is post-prestige endgame and
// keeps its own prices. Upgrade costs derive from these base costs
// (see upgradeCostFor), so they scale with them.
export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  "house":      { name: "Cottage",    icon: "🏠", cost: 55,   tier: 1, incomePerDay: 0,  xpPerDay: 0, maps: ["town"], description: "A cozy home for your townsfolk." },
  "villager-cottage": { name: "Villager Cottage", icon: "", cost: 275, tier: 1, incomePerDay: 0, xpPerDay: 0, maps: ["town"], description: "A cozy home for the people you've prayed for. Villagers sleep here at night, rest here by day, and visit one another." },
  "pawn-house": { name: "Hero's House", icon: "🏡", cost: 110,  tier: 1, incomePerDay: 0,  xpPerDay: 0, maps: ["town"], description: "Your Hero's home. Tap to enter and decorate." },
  "farm":       { name: "Farm",       icon: "🌾", cost: 220,  tier: 1, incomePerDay: 20,  xpPerDay: 0, maps: ["town"], description: "+20 coins per day while your streak is alive." },
  "shop":       { name: "Shop",       icon: "🏪", cost: 440,  tier: 1, incomePerDay: 30,  xpPerDay: 0, maps: ["town"], description: "+30 coins per day while your streak is alive." },
  "bakery":     { name: "Bakery",     icon: "🥖", cost: 880,  tier: 2, incomePerDay: 50,  xpPerDay: 0, maps: ["town"], description: "+50 coins per day while your streak is alive." },
  "market":     { name: "Market",     icon: "🏬", cost: 1760, tier: 3, incomePerDay: 80,  xpPerDay: 0, maps: ["town"], description: "+80 coins per day while your streak is alive." },
  "bank":       { name: "Bank",       icon: "🏦", cost: 3850, tier: 4, incomePerDay: 120, xpPerDay: 0, maps: ["town"], description: "+120 coins per day while your streak is alive." },
  "barbershop": { name: "Barbershop", icon: "💈", cost: 660,  tier: 1, incomePerDay: 10,  xpPerDay: 0, maps: ["town"], description: "+10 coins/day. Boosts connected businesses +25%." },
  "clothes-shop": { name: "Clothes Shop", icon: "👕", cost: 715, tier: 1, incomePerDay: 10, xpPerDay: 0, maps: ["town"], description: "Buy outfits for your Hero. +10 coins/day." },
  "armory":       { name: "Armory",       icon: "🛡️", cost: 1155, tier: 1, incomePerDay: 20, xpPerDay: 0, maps: ["town"], description: "Buy armor for +hearts. +20 coins/day." },
  "weaponsmith":  { name: "Weaponsmith",  icon: "⚔️", cost: 1155, tier: 1, incomePerDay: 20, xpPerDay: 0, maps: ["town"], description: "Buy weapons for +XP. +20 coins/day." },
  "toolshop":     { name: "Tool Shop",    icon: "🔨", cost: 880, tier: 1, incomePerDay: 10, xpPerDay: 0, maps: ["town"], description: "Buy tools for +coins. +10 coins/day." },
  "church":       { name: "Chapel",       icon: "⛪", cost: 1100, tier: 1, incomePerDay: 240, xpPerDay: 0, maps: ["town"], description: "A house of prayer. +20 coins/hour for each person you've prayed for today." },
  // City — big buildings, big earnings
  "bank-tower":       { name: "Bank Tower",       icon: "🏦", cost: 650, tier: 1, incomePerDay: 250, xpPerDay: 0, maps: ["city"], description: "A towering bank. +250 coins/day." },
  "department-store": { name: "Department Store", icon: "🏬", cost: 525, tier: 1, incomePerDay: 200, xpPerDay: 0, maps: ["city"], description: "Everything under one roof. +200 coins/day." },
  "hotel":            { name: "Grand Hotel",      icon: "🏨", cost: 460, tier: 1, incomePerDay: 180, xpPerDay: 0, maps: ["city"], description: "Luxury suites downtown. +180 coins/day." },
  "office":           { name: "Office Tower",     icon: "🏢", cost: 400, tier: 1, incomePerDay: 150, xpPerDay: 0, maps: ["city"], description: "Busy professionals. +150 coins/day." },
  "apartments":       { name: "Apartment Complex", icon: "🏘️", cost: 700, tier: 1, incomePerDay: 280, xpPerDay: 0, maps: ["city"], description: "Homes for city workers. +280 coins/day." },
  "city-market":      { name: "City Market Hall", icon: "🏪", cost: 600, tier: 1, incomePerDay: 240, xpPerDay: 0, maps: ["city"], description: "The city's grand market. +240 coins/day." },
  "theater":          { name: "Grand Theater",    icon: "🎭", cost: 550, tier: 1, incomePerDay: 220, xpPerDay: 0, maps: ["city"], description: "Music and stories nightly. +220 coins/day." },
  // Mall (retired) — the map is now the Garden of Remembrance. Defs are kept
  // so old saves can be refunded at full price; maps: [] means unbuildable.
  "food-court": { name: "Food Court", icon: "🍔", cost: 1430, tier: 1, incomePerDay: 80,  xpPerDay: 0, maps: [], description: "Hungry shoppers. +80 coins/day." },
  "bookstore":  { name: "Bookstore",  icon: "📚", cost: 1155,  tier: 1, incomePerDay: 60,  xpPerDay: 0, maps: [], description: "Quiet readers. +60 coins/day." },
  "arcade":     { name: "Arcade",     icon: "🕹️", cost: 1760, tier: 1, incomePerDay: 100, xpPerDay: 0, maps: [], description: "Tokens and high scores. +100 coins/day." },
  "cinema":     { name: "Cinema",     icon: "🎬", cost: 2200, tier: 1, incomePerDay: 120, xpPerDay: 0, maps: [], description: "Now showing. +120 coins/day." },
  // School — XP earners
  "library":   { name: "Library",   icon: "📖", cost: 1430, tier: 1, incomePerDay: 0, xpPerDay: 50, maps: ["school"], description: "Quiet study earns wisdom. +50 XP/day." },
  "classroom": { name: "Classroom", icon: "📝", cost: 1155,  tier: 1, incomePerDay: 0, xpPerDay: 35, maps: ["school"], description: "Daily lessons. +35 XP/day." },
  "chapel":    { name: "Chapel",    icon: "⛪", cost: 1760, tier: 1, incomePerDay: 0, xpPerDay: 60, maps: ["school"], description: "A place of prayer. +60 XP/day." },
  // Restaurants — hometown food businesses
  "pizza-place":  { name: "Pizza Place",  icon: "🍕", cost: 880, tier: 1, incomePerDay: 30, xpPerDay: 0, maps: ["town"], description: "Wood-fired pies. +30 coins/day." },
  "burger-joint": { name: "Burger Joint", icon: "🍔", cost: 880, tier: 1, incomePerDay: 30, xpPerDay: 0, maps: ["town"], description: "Smash burgers & shakes. +30 coins/day." },
  "taco-stand":   { name: "Taco Stand",   icon: "🌮", cost: 660, tier: 1, incomePerDay: 20, xpPerDay: 0, maps: ["town"], description: "Street tacos to go. +20 coins/day." },
  "sushi-bar":    { name: "Sushi Bar",    icon: "🍣", cost: 1155, tier: 1, incomePerDay: 40, xpPerDay: 0, maps: ["town"], description: "Fresh daily. +40 coins/day." },
  "diner":        { name: "Pancake Diner", icon: "🥞", cost: 715, tier: 1, incomePerDay: 20, xpPerDay: 0, maps: ["town"], description: "Breakfast all day. +20 coins/day." },
  // Restaurant Row — city gathering spots where prayer villagers break bread
  "upper-room":  { name: "The Upper Room", icon: "🍞", cost: 300, tier: 1, incomePerDay: 220, xpPerDay: 0, maps: ["city"], description: "A warm communal dining hall. +220 coins/day." },
  "manna-house": { name: "Manna House",    icon: "🥐", cost: 300, tier: 1, incomePerDay: 200, xpPerDay: 0, maps: ["city"], description: "A cozy bakery for breaking bread. +200 coins/day." },
  "feast-hall":  { name: "The Banquet Table", icon: "🍷", cost: 300, tier: 1, incomePerDay: 240, xpPerDay: 0, maps: ["city"], description: "One long table where all gather. +240 coins/day." },
  // The Marriage Supper — a sacred town green, not a business. During The
  // Gathering (Mon/Wed/Fri 6–8pm) every prayer light gathers here instead of
  // the restaurants, for a bigger breaking-bread blessing. Upgrades grow the
  // table: more villagers, richer blessing. (icon is drawn as SVG, not emoji.)
  "banquet-table": { name: "The Marriage Supper", icon: "", cost: 1650, tier: 1, incomePerDay: 0, xpPerDay: 0, maps: ["town"], description: "One long table under open sky. During The Gathering, all gather here for a greater blessing." },
  // Interactive gathering places — tappable, upgradeable, never just decoration.
  "community-garden": { name: "Community Garden", icon: "", cost: 1100, tier: 1, incomePerDay: 0, xpPerDay: 0, maps: ["town"], description: "Villagers grow crops together. Tap to harvest when ripe — coins and XP, richer at higher levels." },
  "amphitheater": { name: "Amphitheater", icon: "", cost: 4400, tier: 1, incomePerDay: 0, xpPerDay: 0, maps: ["city", "town"], description: "Music and stories under open sky. Tap to attend a show — a blessing of XP and coins." },
  "fountain-plaza": { name: "Fountain Plaza", icon: "", cost: 1320, tier: 1, incomePerDay: 0, xpPerDay: 0, maps: ["town"], description: "A quiet plaza where villagers gather and rest. Tap to rest a while — a small refresh of coins and XP." },
  // Hospital — care for the town. Unlockable and upgradeable; the pawn comes
  // here for doctor appointments, and a checkup grants a healing blessing
  // for the next Dark Forest battle (bigger blessing at higher levels).
  "hospital": { name: "Hospital", icon: "", cost: 2750, tier: 2, incomePerDay: 30, xpPerDay: 0, maps: ["town"], description: "Care for the town. Tap for a checkup — a healing blessing for your next Dark Forest battle. +30 coins/day." },
  // Artisans' Row — artisan services in the southern extension. Icons are
  // drawn as SVG in the art switch, not emoji, so defs use empty icons.
  "inn":         { name: "Wayside Inn",       icon: "", cost: 1320, tier: 1, incomePerDay: 60,  xpPerDay: 0,  maps: ["town"], description: "A warm rest for weary travelers. Villagers rest here, and the Hero greets the guests. +60 coins/day." },
  "carpenter":   { name: "Carpenter's Workshop", icon: "", cost: 1210, tier: 1, incomePerDay: 40,  xpPerDay: 0,  maps: ["town"], description: "The sound of saws and hammers. Fine wooden goods, built to last. +40 coins/day." },
  "pottery":     { name: "Pottery Studio",    icon: "", cost: 1100, tier: 1, incomePerDay: 40,  xpPerDay: 0,  maps: ["town"], description: "Clay turned to beauty on the wheel. Kiln-fired vessels for the town. +40 coins/day." },
  "music-hall":  { name: "Music Hall",         icon: "", cost: 1760, tier: 1, incomePerDay: 0,  xpPerDay: 35, maps: ["town"], description: "Song rises from the hall — instruments, voices, and joy. Villagers play here. +35 XP/day." },
  "tailor":      { name: "Tailor",             icon: "", cost: 1100, tier: 1, incomePerDay: 40,  xpPerDay: 0,  maps: ["town"], description: "Clothes cut and sewn to measure. Bolts of fabric, needles flashing. +40 coins/day." },
  "observatory": { name: "Observatory",        icon: "", cost: 2200, tier: 2, incomePerDay: 0,  xpPerDay: 45, maps: ["town"], description: "A dome under the open sky. Villagers chart the stars the Lord set in place. +45 XP/day." },
  "bathhouse":   { name: "Bathhouse",          icon: "", cost: 1650, tier: 1, incomePerDay: 30,  xpPerDay: 0,  maps: ["town"], description: "Steam and warm pools for the weary. Rest in the waters and be refreshed. +30 coins/day." },
  "apothecary":  { name: "Apothecary",         icon: "", cost: 1430, tier: 1, incomePerDay: 50,  xpPerDay: 0,  maps: ["town"], description: "Herbs hung to dry, remedies brewed with care. The town's healing shelves. +50 coins/day." },
  "town-hall":   { name: "Town Hall",          icon: "", cost: 2750, tier: 2, incomePerDay: 100, xpPerDay: 0,  maps: ["town"], description: "The civic heart of town — assemblies, records, and the notice board. +100 coins/day." },
  "post-office": { name: "Post Office",        icon: "", cost: 990,  tier: 1, incomePerDay: 30,  xpPerDay: 0,  maps: ["town"], description: "Letters and parcels, sorted with care. The villager clerk never misses a delivery. +30 coins/day." },
  // City expansion — the downtown cultural district. Icons are drawn as SVG
  // in the art switch, not emoji, so defs use empty icons.
  "grand-library": { name: "Grand Library", icon: "", cost: 700, tier: 1, incomePerDay: 0,  xpPerDay: 120, maps: ["city"], description: "Towering shelves of wisdom in the heart of downtown. +120 XP/day." },
  "opera-house":   { name: "Opera House",   icon: "", cost: 800, tier: 1, incomePerDay: 380, xpPerDay: 0,   maps: ["city"], description: "A grand stage with velvet seats and nightly performances. +380 coins/day." },
  "museum":        { name: "Museum",        icon: "", cost: 750, tier: 1, incomePerDay: 320, xpPerDay: 0,   maps: ["city"], description: "Exhibits and artifacts telling the town's story. +320 coins/day." },
  "clock-tower":   { name: "Clock Tower",   icon: "", cost: 650, tier: 1, incomePerDay: 300, xpPerDay: 0,   maps: ["city"], description: "A giant clock face over downtown — the city's heartbeat, wound daily. +300 coins/day." },
  "embassy":       { name: "Embassy",       icon: "", cost: 700, tier: 1, incomePerDay: 340, xpPerDay: 0,   maps: ["city"], description: "Flags of many lands; diplomats exchange greetings daily. +340 coins/day." },
  // Eastside expansion — brand-new city buildings on the new right-side lots
  "music-studio":    { name: "Music Studio",    icon: "", cost: 600, tier: 1, incomePerDay: 200, xpPerDay: 0, maps: ["city"], description: "A warm recording studio where the city lays down tracks. +200 coins/day." },
  "art-gallery":     { name: "Art Gallery",     icon: "", cost: 550, tier: 1, incomePerDay: 160, xpPerDay: 0, maps: ["city"], description: "Paintings and sculptures on quiet gallery walls. +160 coins/day." },
  "flower-market":   { name: "Flower Market",   icon: "", cost: 400, tier: 1, incomePerDay: 140, xpPerDay: 0, maps: ["city"], description: "Stalls of fresh blooms — the city's corner of color. +140 coins/day." },
  "coffee-roastery": { name: "Coffee Roastery", icon: "", cost: 500, tier: 1, incomePerDay: 180, xpPerDay: 0, maps: ["city"], description: "The roaster hums, the tasting counter is warm. +180 coins/day." },
};

// ---- Hospital: the Doctor's Blessing (healing buff for Dark Forest) ----
// A checkup at the hospital grants a one-battle blessing: bonus max HP
// (and at L3, bonus attack). Consumed when the next battle starts.

export const HOSPITAL_BUFF_KEY = "prayercircle.hometown.hospital-buff.v1";
export const HOSPITAL_CHECKUP_COOLDOWN_MS = 20 * 60 * 60 * 1000; // one checkup per 20h

export type HospitalBuff = {
  hpMult: number; // e.g. 1.5 = +50% max HP
  attackMult: number; // e.g. 1.1 = +10% attack
  grantedAt: string; // ISO
  level: number; // hospital level that granted it
};

export async function loadHospitalBuff(): Promise<HospitalBuff | null> {
  try {
    const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");
    const raw = await AsyncStorage.getItem(HOSPITAL_BUFF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<HospitalBuff>;
    if (typeof parsed.hpMult !== "number" || typeof parsed.attackMult !== "number") return null;
    return {
      hpMult: parsed.hpMult,
      attackMult: parsed.attackMult,
      grantedAt: typeof parsed.grantedAt === "string" ? parsed.grantedAt : new Date().toISOString(),
      level: typeof parsed.level === "number" ? parsed.level : 1,
    };
  } catch {
    return null;
  }
}

export async function saveHospitalBuff(buff: HospitalBuff | null): Promise<void> {
  try {
    const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");
    if (!buff) await AsyncStorage.removeItem(HOSPITAL_BUFF_KEY);
    else await AsyncStorage.setItem(HOSPITAL_BUFF_KEY, JSON.stringify(buff));
  } catch {}
}

/** Load the buff and clear it — called when a Dark Forest battle starts. */
export async function consumeHospitalBuff(): Promise<HospitalBuff | null> {
  const buff = await loadHospitalBuff();
  if (buff) await saveHospitalBuff(null);
  return buff;
}

/** Blessing granted by a checkup at the given hospital level. */
export function hospitalBlessingForLevel(level: number): { hpMult: number; attackMult: number; label: string } {
  const lv = Math.min(Math.max(level || 1, 1), 3);
  if (lv >= 3) return { hpMult: 1.5, attackMult: 1.1, label: "+50% max HP and +10% attack for your next battle" };
  if (lv >= 2) return { hpMult: 1.5, attackMult: 1, label: "+50% max HP for your next battle" };
  return { hpMult: 1.25, attackMult: 1, label: "+25% max HP for your next battle" };
}

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
  { id: "plot-city-1", x: 0, y: 0, buildingType: "bank-tower",       cost: 15000, name: "Financial District Lot" },
  { id: "plot-city-2", x: 6, y: 0, buildingType: "department-store", cost: 22500, name: "Retail Row Lot" },
  { id: "plot-city-3", x: 0, y: 6, buildingType: "hotel",            cost: 18750, name: "Hospitality Lot" },
  { id: "plot-city-4", x: 6, y: 6, buildingType: "office",           cost: 18750, name: "Business Park Lot" },
  { id: "plot-city-5", x: 3, y: 3, buildingType: "bank-tower",       cost: 30000, name: "Central Tower Lot" },
  { id: "plot-city-6", x: 3, y: 0, buildingType: "office",           cost: 26250, name: "Uptown Lot" },
  // Restaurant Row — where the prayer villagers gather to break bread
  { id: "plot-rest-1", x: 0, y: 3, buildingType: "upper-room",  cost: 15000, name: "Restaurant Row West" },
  { id: "plot-rest-2", x: 6, y: 3, buildingType: "manna-house", cost: 15000, name: "Restaurant Row East" },
  { id: "plot-rest-3", x: 3, y: 6, buildingType: "feast-hall",  cost: 15000, name: "Banquet Table Lot" },
  // Southern expansion — Midtown (y8-9) and Harbor (y11-12) districts.
  // More buildings, more income.
  { id: "plot-city-7",  x: 0, y: 8,  buildingType: "apartments",      cost: 32500, name: "Uptown Apartments" },
  { id: "plot-city-8",  x: 3, y: 8,  buildingType: "theater",         cost: 27500, name: "Theater District Lot" },
  { id: "plot-city-9",  x: 6, y: 8,  buildingType: "city-market",      cost: 30000, name: "City Market Lot" },
  { id: "plot-city-10", x: 0, y: 11, buildingType: "office",          cost: 25000, name: "South Office Lot" },
  { id: "plot-city-11", x: 3, y: 11, buildingType: "hotel",           cost: 28750, name: "South Hotel Lot" },
  { id: "plot-city-12", x: 6, y: 11, buildingType: "department-store", cost: 31250, name: "South Retail Lot" },
  // Eastside — the Amphitheater, where the city gathers for music and stories
  { id: "plot-city-13", x: 8, y: 3, buildingType: "amphitheater", cost: 22500, name: "Amphitheater Green" },
  // Downtown cultural district — Library Row, Opera District, and Museum
  // Quarter on the new y=14 terrace; Clock Tower Green and Embassy Row on
  // the y=16 terrace below. (x=6..9, y=14..17 left open for future growth.)
  { id: "plot-city-14", x: 0, y: 14, buildingType: "grand-library", cost: 35000, name: "Library Row Lot" },
  { id: "plot-city-15", x: 3, y: 14, buildingType: "opera-house",   cost: 40000, name: "Opera District Lot" },
  { id: "plot-city-16", x: 6, y: 14, buildingType: "museum",        cost: 37500, name: "Museum Quarter Lot" },
  { id: "plot-city-17", x: 0, y: 16, buildingType: "clock-tower",   cost: 32500, name: "Clock Tower Green" },
  { id: "plot-city-18", x: 3, y: 16, buildingType: "embassy",       cost: 35000, name: "Embassy Row Lot" },
  // Midtown Terrace (y=9) — fills the empty rows between Theater District
  // and the southern expansion. All unlock & upgrade, no free placement.
  { id: "plot-city-19", x: 0, y: 9, buildingType: "apartments", cost: 32500, name: "Midtown Residences" },
  { id: "plot-city-20", x: 3, y: 9, buildingType: "office",     cost: 30000, name: "Midtown Offices" },
  { id: "plot-city-21", x: 6, y: 9, buildingType: "hotel",       cost: 31250, name: "Midtown Hotel" },
  // Harbor Terrace east (y=16) — the "future growth" area on the south terrace.
  { id: "plot-city-22", x: 6, y: 16, buildingType: "department-store", cost: 35000, name: "Harbor Retail Lot" },
  // Eastside expansion — fills the bare right-hand columns (x=8..9). The
  // wishing fountain sits at (8,6) and the street performer at (8,1), so the
  // strip starts at y=8. Brand-new building types, all unlock & upgrade.
  { id: "plot-city-23", x: 8, y: 8,  buildingType: "music-studio",    cost: 30000, name: "Eastside Studio Lot" },
  { id: "plot-city-24", x: 8, y: 11, buildingType: "art-gallery",     cost: 27500, name: "Gallery Row Lot" },
  { id: "plot-city-25", x: 8, y: 14, buildingType: "flower-market",   cost: 22500, name: "Bloom Terrace Lot" },
  { id: "plot-city-26", x: 8, y: 16, buildingType: "coffee-roastery", cost: 25000, name: "Harbor Roastery Lot" },
];

/** Plot building income multipliers — aggressive endgame scaling (vs standard 1/2.5/5). */
export const CITY_PLOT_INCOME_MULT = { 1: 1, 2: 2, 3: 3.5 };

/** Income multiplier for a plot building (1 for non-plot buildings). */
export function plotIncomeMult(b: PlacedBuilding): number {
  if (!b.plotId) return 1;
  return CITY_PLOT_INCOME_MULT[Math.min(b.level || 1, 3) as 1 | 2 | 3] ?? 1;
}

/** Daily coin income for a placed building — plot-aware, economy-scaled. */
export function effectiveIncomeFor(b: PlacedBuilding): number {
  const level = b.level || 1;
  const base = BUILDINGS[b.type].incomePerDay;
  if (base === 0) return 0;
  const clamped = Math.min(Math.max(level, 1), 3) as 1 | 2 | 3;
  const mult = b.plotId ? CITY_PLOT_INCOME_MULT[clamped] : UPGRADE_INCOME_MULT[clamped];
  return scaledCoins(base * mult);
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

/**
 * Food-selling buildings: all cuisines, groceries, bakery, diner, the feast
 * halls, and the coffee roastery. These receive the supply-chain bonus when
 * a farm or community garden is staffed nearby (see lib/villager-work.ts).
 */
export const FOOD_BUILDING_TYPES: ReadonlySet<BuildingType> = new Set<BuildingType>([
  "pizza-place",
  "burger-joint",
  "taco-stand",
  "sushi-bar",
  "diner",
  "upper-room",
  "manna-house",
  "feast-hall",
  "banquet-table",
  "market",
  "city-market",
  "food-court",
  "bakery",
  "coffee-roastery",
]);

export function isFoodBuildingType(type: BuildingType | string): boolean {
  return (FOOD_BUILDING_TYPES as ReadonlySet<string>).has(type);
}

// ---- Stock: stocked shops hold inventory; staffed farms & gardens restock ----

/**
 * Stock capacities by upgrade level — bigger shops hold more.
 * (Levels 4–5 keep growing for the few buildings that reach them.)
 */
export const STOCK_CAP_BY_LEVEL: Record<number, number> = {
  1: 40,
  2: 90,
  3: 160,
  4: 240,
  5: 330,
};

export function stockCapForLevel(level: number): number {
  const lv = Math.max(1, Math.floor(level) || 1);
  return STOCK_CAP_BY_LEVEL[lv] ?? STOCK_CAP_BY_LEVEL[3];
}

/** Units of stock a stocked building burns per minute while it is earning. */
export const STOCK_DEPLETION_PER_MIN = 0.6;

/** Units of stock one staffed farm/garden produces per minute, shared by
 *  the stocked buildings in range (nearest first). */
export const STOCK_RESTOCK_PER_MIN = 2;

/** Retail building types that hold stock on top of the food set. */
const STOCKED_RETAIL_TYPES: ReadonlySet<string> = new Set(["shop", "department-store"]);

/**
 * Buildings that hold stock: every food type (restaurants, groceries,
 * bakery, diner, feast halls, coffee roastery) plus general retail.
 */
export function isStockedBuildingType(type: BuildingType | string): boolean {
  return isFoodBuildingType(type) || STOCKED_RETAIL_TYPES.has(type);
}

/**
 * Income multiplier from the stock on hand: full shelves = +50%,
 * empty shelves = the regular 1.0× — stock is a bonus, never a gate.
 */
export function stockMultiplierFor(stock: number, cap: number): number {
  if (!Number.isFinite(stock) || !Number.isFinite(cap) || cap <= 0) return 1;
  const ratio = Math.min(1, Math.max(0, stock / cap));
  return 1 + 0.5 * ratio;
}

/**
 * Current stock for a building. Untracked buildings (new placements and
 * older saved games) start at half capacity.
 */
export function stockForBuilding(
  stockByBuilding: Record<string, number> | undefined,
  buildingId: string,
  level: number,
): number {
  const v = stockByBuilding?.[buildingId];
  if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, v);
  return stockCapForLevel(level) / 2;
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

// ---- The Marriage Supper (town banquet green) ----

/** How many villagers can gather at the Marriage Supper, by level. */
export const BANQUET_GATHER_CAPS: Record<number, number> = { 1: 40, 2: 60, 3: 80 };

/** Fellowship bonus per gathered villager at the Marriage Supper — richer
 * than the restaurants, because the whole town breaks bread as one. */
export const BANQUET_FELLOWSHIP_RATES: Record<number, number> = { 1: 0.012, 2: 0.016, 3: 0.02 };

/** Find the built Marriage Supper on the town map, if any. */
export function findBanquetTable(town: TownState): PlacedBuilding | undefined {
  return town.maps.town?.buildings.find((b) => b.type === "banquet-table");
}

// ---- The Lighthouse ----

/** Coins granted for receiving the lighthouse blessing (once per day, × level). */
export const LIGHTHOUSE_BLESSING_COINS = 100;

/** Max lighthouse level. */
export const LIGHTHOUSE_MAX_LEVEL = 3;

/** Coins to upgrade FROM the given level to the next. */
export const LIGHTHOUSE_UPGRADE_COSTS: Record<number, number> = { 1: 150, 2: 400 };

export const LIGHTHOUSE_KEY = "prayercircle.hometown.lighthouse.v1";

export type LighthouseState = {
  /** 1-3. Taller tower, brighter beam. */
  level: number;
  /** Local date (YYYY-MM-DD) the blessing was last received. */
  lastBlessingDate: string | null;
};

export function emptyLighthouse(): LighthouseState {
  return { level: 1, lastBlessingDate: null };
}

export async function loadLighthouse(): Promise<LighthouseState> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem(LIGHTHOUSE_KEY);
    if (!raw) return emptyLighthouse();
    const s = JSON.parse(raw);
    const level = typeof s.level === "number" ? Math.min(Math.max(s.level, 1), LIGHTHOUSE_MAX_LEVEL) : 1;
    return { level, lastBlessingDate: typeof s.lastBlessingDate === "string" ? s.lastBlessingDate : null };
  } catch { return emptyLighthouse(); }
}

export async function saveLighthouse(s: LighthouseState): Promise<void> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.setItem(LIGHTHOUSE_KEY, JSON.stringify(s));
  } catch {}
}

/** Verses of light and guidance — one is shown each day at the lighthouse. */
export const LIGHTHOUSE_VERSES: Array<{ text: string; ref: string }> = [
  { text: "I am the light of the world: he that followeth me shall not walk in darkness, but shall have the light of life.", ref: "John 8:12" },
  { text: "Thy word is a lamp unto my feet, and a light unto my path.", ref: "Psalm 119:105" },
  { text: "The LORD is my light and my salvation; whom shall I fear?", ref: "Psalm 27:1" },
  { text: "Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven.", ref: "Matthew 5:16" },
  { text: "The light shineth in darkness; and the darkness comprehended it not.", ref: "John 1:5" },
  { text: "For thou wilt light my candle: the LORD my God will enlighten my darkness.", ref: "Psalm 18:28" },
];

/** Deterministic verse for a date — the same verse all day, rotates daily. */
export function lighthouseVerseForDate(date: Date = new Date()): { text: string; ref: string } {
  const seed = date.getFullYear() * 1000 + monthDayOrdinal(date);
  return LIGHTHOUSE_VERSES[seed % LIGHTHOUSE_VERSES.length];
}

function monthDayOrdinal(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
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

// ---------------------------------------------------------------------------
// The Well — a quiet map for drawing living water, once a day.
// Intentionally NOT an idle-game mechanic: no coins, no upgrades, no income.
// Just a daily moment of stillness and a verse.
// ---------------------------------------------------------------------------

export const WELL_STORAGE_KEY = "prayercircle.hometown.well.v1";

export type WellState = {
  /** Local "YYYY-MM-DD" of the last draw, or null if never. */
  lastDrawDate: string | null;
  /** Consecutive days drawn (resets when a day is missed). */
  streak: number;
  /** Lifetime draws. */
  totalDraws: number;
};

export function emptyWell(): WellState {
  return { lastDrawDate: null, streak: 0, totalDraws: 0 };
}

export function parseWell(value: unknown): WellState {
  const fallback = emptyWell();
  if (!value || typeof value !== "object") return fallback;
  const s = value as Partial<WellState>;
  return {
    lastDrawDate: typeof s.lastDrawDate === "string" ? s.lastDrawDate : null,
    streak: typeof s.streak === "number" && s.streak >= 0 ? Math.floor(s.streak) : 0,
    totalDraws: typeof s.totalDraws === "number" && s.totalDraws >= 0 ? Math.floor(s.totalDraws) : 0,
  };
}

export async function loadWell(): Promise<WellState> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem(WELL_STORAGE_KEY);
    if (!raw) return emptyWell();
    return parseWell(JSON.parse(raw));
  } catch { return emptyWell(); }
}

export async function saveWell(s: WellState): Promise<void> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.setItem(WELL_STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

/** Local date as "YYYY-MM-DD". */
export function localDateStr(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Shift a "YYYY-MM-DD" date by n days. */
export function shiftDateStr(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + n);
  return localDateStr(dt);
}

/** True if the well was already drawn on the given local date. */
export function wellDrawnOn(state: WellState, dateStr: string): boolean {
  return state.lastDrawDate === dateStr;
}

/**
 * Record a draw for the given local date. Streak continues only when the
 * previous draw was exactly yesterday; a missed day resets it to 1.
 */
export function recordWellDraw(prev: WellState, dateStr: string): WellState {
  if (prev.lastDrawDate === dateStr) return prev;
  const streak = prev.lastDrawDate === shiftDateStr(dateStr, -1) ? prev.streak + 1 : 1;
  return { lastDrawDate: dateStr, streak, totalDraws: prev.totalDraws + 1 };
}

/** Curated KJV verses about water, rest, and refreshment. Rotates daily. */
export const WELL_VERSES: { text: string; ref: string }[] = [
  { text: "But whosoever drinketh of the water that I shall give him shall never thirst; but the water that I shall give him shall be in him a well of water springing up into everlasting life.", ref: "John 4:14" },
  { text: "Ho, every one that thirsteth, come ye to the waters, and he that hath no money; come ye, buy, and eat.", ref: "Isaiah 55:1" },
  { text: "He maketh me to lie down in green pastures: he leadeth me beside the still waters.", ref: "Psalm 23:2" },
  { text: "And the Spirit and the bride say, Come. And let him that heareth say, Come. And let him that is athirst come. And whosoever will, let him take the water of life freely.", ref: "Revelation 22:17" },
  { text: "He that believeth on me, as the scripture hath said, out of his belly shall flow rivers of living water.", ref: "John 7:38" },
  { text: "When the poor and needy seek water, and there is none, and their tongue faileth for thirst, I the LORD will hear them, I the God of Israel will not forsake them.", ref: "Isaiah 41:17" },
  { text: "Come unto me, all ye that labour and are heavy laden, and I will give you rest.", ref: "Matthew 11:28" },
  { text: "As the hart panteth after the water brooks, so panteth my soul after thee, O God.", ref: "Psalm 42:1" },
  { text: "Therefore with joy shall ye draw water out of the wells of salvation.", ref: "Isaiah 12:3" },
  { text: "And he shall be like a tree planted by the rivers of water, that bringeth forth his fruit in his season.", ref: "Psalm 1:3" },
  { text: "I will give unto him that is athirst of the fountain of the water of life freely.", ref: "Revelation 21:6" },
  { text: "O God, thou art my God; early will I seek thee: my soul thirsteth for thee, my flesh longeth for thee in a dry and thirsty land, where no water is.", ref: "Psalm 63:1" },
  { text: "They shall be abundantly satisfied with the fatness of thy house; and thou shalt make them drink of the river of thy pleasures. For with thee is the fountain of life.", ref: "Psalm 36:8-9" },
  { text: "And he shewed me a pure river of water of life, clear as crystal, proceeding out of the throne of God and of the Lamb.", ref: "Revelation 22:1" },
];

/** Deterministic verse for a local date — same verse all day, rotates daily. */
export function wellVerseForDate(dateStr: string): { text: string; ref: string } {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) h = (Math.imul(h, 31) + dateStr.charCodeAt(i)) | 0;
  return WELL_VERSES[Math.abs(h) % WELL_VERSES.length];
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

// ---- Mission Field: send prayer lights out on missions ----
// A prayer light (someone prayed for today) can be sent on a mission —
// a short visit, a day trip, or a long journey. They leave town, and when
// the time is up they return with a blessing: coins, XP, sometimes a verse.

/**
 * Field missions live under their OWN key. They used to share
 * "prayercircle.hometown.missions.v1" with the daily popup missions in
 * lib/missions.ts — every save from either system overwrote the other's
 * records, and each parser silently dropped the other's entries, so an
 * in-flight field trip vanished from storage on the next hometown open
 * (or bank visit): the light reappeared in town and the trip looked like
 * it had "finished early". Daily missions keep the legacy key; field
 * missions moved here, and loadMissions() salvages any field missions
 * still stored under the legacy key.
 */
export const MISSION_STORAGE_KEY = "prayercircle.hometown.field-missions.v1";
const LEGACY_MISSION_STORAGE_KEY = "prayercircle.hometown.missions.v1";
/** Max concurrent uncollected missions. */
export const MAX_ACTIVE_MISSIONS = 10;

export type MissionDurationId = "short" | "day" | "long";

export type MissionDuration = {
  id: MissionDurationId;
  label: string;
  hours: number;
  coinsMin: number;
  coinsMax: number;
  xp: number;
  /** Chance (0-1) the blessing carries a verse. */
  verseChance: number;
  blurb: string;
};

export const MISSION_DURATIONS: Record<MissionDurationId, MissionDuration> = {
  short: { id: "short", label: "Short visit", hours: 1, coinsMin: 50, coinsMax: 100, xp: 0, verseChance: 0, blurb: "A quick visit to someone nearby who needs prayer." },
  day:   { id: "day",   label: "Day trip",    hours: 4, coinsMin: 150, coinsMax: 250, xp: 10, verseChance: 0.15, blurb: "A few hours out in the field, breaking bread." },
  long:  { id: "long",  label: "Long journey", hours: 8, coinsMin: 300, coinsMax: 500, xp: 25, verseChance: 0.5, blurb: "A full journey to the far edge — and back changed." },
};

export const MISSION_DURATION_ORDER: MissionDurationId[] = ["short", "day", "long"];

export type MissionVerse = { text: string; ref: string };

/** Verses a returning light may carry home. */
export const MISSION_VERSES: MissionVerse[] = [
  { text: "Go into all the world and preach the gospel to all creation.", ref: "Mark 16:15" },
  { text: "How beautiful are the feet of those who bring good news!", ref: "Romans 10:15" },
  { text: "The harvest is plentiful but the workers are few.", ref: "Matthew 9:37" },
  { text: "Do not forget to show hospitality to strangers.", ref: "Hebrews 13:2" },
  { text: "Let your light shine before others.", ref: "Matthew 5:16" },
  { text: "And they went out and preached everywhere.", ref: "Mark 16:20" },
];

export type FieldMission = {
  id: string;
  personId: string;
  name: string;
  accentColor?: string;
  duration: MissionDurationId;
  sentAt: string;   // ISO
  returnAt: string; // ISO
  coins: number;    // blessing, decided at send time (seeded)
  xp: number;
  verse?: MissionVerse;
  collected: boolean;
  collectedAt?: string;
};

/** "out" = still away, "returned" = back and waiting for Jonathan to collect. */
export function missionStatus(m: FieldMission, now: Date = new Date()): "out" | "returned" {
  if (m.collected) return "returned";
  return now.getTime() >= new Date(m.returnAt).getTime() ? "returned" : "out";
}

/** Minutes until return (0 when back). */
export function missionMinutesLeft(m: FieldMission, now: Date = new Date()): number {
  const ms = new Date(m.returnAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 60000));
}

/** Friendly countdown, e.g. "3h 12m" or "45m". */
export function missionCountdown(m: FieldMission, now: Date = new Date()): string {
  const mins = missionMinutesLeft(m, now);
  if (mins <= 0) return "back now";
  const h = Math.floor(mins / 60);
  const mm = mins % 60;
  if (h <= 0) return `${mm}m`;
  return mm === 0 ? `${h}h` : `${h}h ${mm}m`;
}

export function emptyMissions(): FieldMission[] {
  return [];
}

export function parseMissions(value: unknown): FieldMission[] {
  if (!Array.isArray(value)) return [];
  const out: FieldMission[] = [];
  for (const m of value) {
    if (!m || typeof m !== "object") continue;
    const r = m as Partial<FieldMission>;
    if (typeof r.id !== "string" || typeof r.personId !== "string" || typeof r.name !== "string") continue;
    if (typeof r.sentAt !== "string" || typeof r.returnAt !== "string") continue;
    const duration: MissionDurationId =
      r.duration === "day" || r.duration === "long" ? r.duration : "short";
    out.push({
      id: r.id,
      personId: r.personId,
      name: r.name,
      accentColor: typeof r.accentColor === "string" ? r.accentColor : undefined,
      duration,
      sentAt: r.sentAt,
      returnAt: r.returnAt,
      coins: typeof r.coins === "number" && r.coins >= 0 ? Math.round(r.coins) : 0,
      xp: typeof r.xp === "number" && r.xp >= 0 ? Math.round(r.xp) : 0,
      verse: r.verse && typeof r.verse.text === "string" && typeof r.verse.ref === "string"
        ? { text: r.verse.text, ref: r.verse.ref }
        : undefined,
      collected: r.collected === true,
      collectedAt: typeof r.collectedAt === "string" ? r.collectedAt : undefined,
    });
  }
  return out;
}

export async function loadMissions(): Promise<FieldMission[]> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem(MISSION_STORAGE_KEY);
    if (raw) return parseMissions(JSON.parse(raw));
    // One-time salvage: field missions saved before the key split live
    // under the legacy key, mixed in with daily popup missions.
    // parseMissions only accepts field-mission-shaped entries, so daily
    // missions are ignored here and left untouched in place.
    const legacy = await AsyncStorage.getItem(LEGACY_MISSION_STORAGE_KEY);
    if (!legacy) return [];
    const salvaged = parseMissions(JSON.parse(legacy));
    if (salvaged.length > 0) {
      try {
        await AsyncStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify(salvaged));
      } catch {}
    }
    return salvaged;
  } catch { return []; }
}

export async function saveMissions(missions: FieldMission[]): Promise<void> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify(missions));
  } catch {}
}

/** Drop collected missions older than 24h (keeps the board tidy). */
export function pruneMissions(missions: FieldMission[], now: Date = new Date()): FieldMission[] {
  const cutoff = now.getTime() - 24 * 3600000;
  return missions.filter((m) => {
    if (!m.collected) return true;
    const t = m.collectedAt ? new Date(m.collectedAt).getTime() : 0;
    return isNaN(t) || t >= cutoff;
  });
}

/**
 * Build a new mission blessing. Coins roll within the duration's range;
 * a verse may come along on longer journeys. Seeded by id so it's stable.
 */
export function rollMissionBlessing(id: string, durationId: MissionDurationId): { coins: number; xp: number; verse?: MissionVerse } {
  const d = MISSION_DURATIONS[durationId];
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h >>>= 0;
  const rand = () => {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    return h / 4294967296;
  };
  const coins = d.coinsMin + Math.floor(rand() * (d.coinsMax - d.coinsMin + 1));
  const verse = rand() < d.verseChance
    ? MISSION_VERSES[Math.floor(rand() * MISSION_VERSES.length)]
    : undefined;
  return { coins, xp: d.xp, verse };
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
  { x: 2, y: 8 }, { x: 2, y: 9 }, { x: 2, y: 10 }, { x: 2, y: 11 },
  { x: 2, y: 12 }, { x: 2, y: 13 },
  // East Ave (x=5, full height)
  { x: 5, y: 0 }, { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 },
  { x: 5, y: 4 }, { x: 5, y: 5 }, { x: 5, y: 6 }, { x: 5, y: 7 },
  { x: 5, y: 8 }, { x: 5, y: 9 }, { x: 5, y: 10 }, { x: 5, y: 11 },
  { x: 5, y: 12 }, { x: 5, y: 13 },
  // North Blvd (y=2, skipping avenue intersections)
  { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 3, y: 2 },
  { x: 4, y: 2 }, { x: 6, y: 2 }, { x: 7, y: 2 },
  // South Blvd (y=5, skipping avenue intersections)
  { x: 0, y: 5 }, { x: 1, y: 5 }, { x: 3, y: 5 },
  { x: 4, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 },
  // Midtown Blvd (y=10) — serves the southern expansion; extends east to
  // give the new Eastside lots road frontage
  { x: 0, y: 10 }, { x: 1, y: 10 }, { x: 3, y: 10 },
  { x: 4, y: 10 }, { x: 6, y: 10 }, { x: 7, y: 10 },
  { x: 8, y: 10 }, { x: 9, y: 10 },
  // Harbor Blvd (y=13) — southern edge of the expanded city; extends east
  // for the Eastside lots
  { x: 0, y: 13 }, { x: 1, y: 13 }, { x: 3, y: 13 },
  { x: 4, y: 13 }, { x: 6, y: 13 }, { x: 7, y: 13 },
  { x: 8, y: 13 }, { x: 9, y: 13 },
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
  /** Fixed building for this lot — tap to unlock it directly, no choosing. */
  presetType?: BuildingType;
  /** Beach district lot — sandy visuals instead of the standard lot look. */
  beach?: boolean;
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
  { id: "town-lot-n1", x: 0, y: 0, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 825, name: "Chapel Shops", presetType: "diner" },
  // Chapel Hill — the church, prominent at the top of the neighborhood
  { id: "town-lot-church", x: 3, y: 0, w: 2, h: 2, allowedTypes: ["church"], cost: 550, name: "Chapel Hill" },
  // Hearthside — the pawn's home, near the church
  { id: "town-lot-pawn", x: 6, y: 0, w: 2, h: 2, allowedTypes: ["pawn-house"], cost: 275, name: "Hearthside" },
  // Sunny Acres — farm on the hilltop (moved from west side for the bigger grid)
  { id: "town-lot-farm", x: 8, y: 0, w: 2, h: 2, allowedTypes: ["farm"], cost: 550, name: "Sunny Acres" },
  // Main Street North — 5 preset commercial lots (unlock & upgrade)
  { id: "town-lot-s1", x: 0, y: 3, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 825, name: "Main Street West", presetType: "shop" },
  { id: "town-lot-s2", x: 2, y: 3, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 825, name: "Main Street", presetType: "bakery" },
  { id: "town-lot-s3", x: 4, y: 3, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 825, name: "Main Street Central", presetType: "market" },
  { id: "town-lot-s4", x: 6, y: 3, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 825, name: "Main Street East", presetType: "bank" },
  // Old Town South — 4 preset commercial lots (the 5th moved south to make
  // room for Chapel Avenue, the vertical spine connecting every street)
  { id: "town-lot-s6", x: 0, y: 6, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 825, name: "Old Town West", presetType: "barbershop" },
  { id: "town-lot-s7", x: 2, y: 6, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 825, name: "Old Town", presetType: "armory" },
  { id: "town-lot-s8", x: 4, y: 6, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 825, name: "Old Town Central", presetType: "weaponsmith" },
  { id: "town-lot-s9", x: 6, y: 6, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 825, name: "Old Town East", presetType: "toolshop" },
  // South End — Market Corner, Garden Corner, and the Marriage Supper green,
  // served by Old Town Lane (north) and Harbor Lane (south)
  { id: "town-lot-s5", x: 0, y: 9, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 825, name: "South End West", presetType: "clothes-shop" },
  { id: "town-lot-s10", x: 2, y: 9, w: 2, h: 2, allowedTypes: ["community-garden"], cost: 825, name: "South End Garden", presetType: "community-garden" },
  { id: "town-lot-banquet", x: 4, y: 9, w: 2, h: 2, allowedTypes: ["banquet-table"], cost: 2200, name: "Marriage Supper Green", presetType: "banquet-table" },
  // Fountain Plaza — a quiet gathering place in the South End, east of the garden
  { id: "town-lot-plaza", x: 6, y: 9, w: 2, h: 2, allowedTypes: ["fountain-plaza"], cost: 990, name: "Plaza Green", presetType: "fountain-plaza" },
  // Cottage Row — cozy 1x1 homes for the prayer lights along the east edge.
  // Each cottage gives villagers a place to belong: they sleep here at
  // night, rest here by day, and visit one another.
  { id: "town-lot-c1", x: 9, y: 3, w: 1, h: 1, allowedTypes: ["villager-cottage"], cost: 275, name: "Cottage Row North" },
  { id: "town-lot-c2", x: 9, y: 4, w: 1, h: 1, allowedTypes: ["villager-cottage"], cost: 275, name: "Cottage Row North East" },
  { id: "town-lot-c3", x: 9, y: 6, w: 1, h: 1, allowedTypes: ["villager-cottage"], cost: 275, name: "Cottage Row" },
  { id: "town-lot-c4", x: 9, y: 7, w: 1, h: 1, allowedTypes: ["villager-cottage"], cost: 275, name: "Cottage Row East" },
  { id: "town-lot-c5", x: 9, y: 9, w: 1, h: 1, allowedTypes: ["villager-cottage"], cost: 275, name: "Cottage Row South" },
  { id: "town-lot-c6", x: 9, y: 10, w: 1, h: 1, allowedTypes: ["villager-cottage"], cost: 275, name: "Cottage Row South East" },
  { id: "town-lot-c7", x: 9, y: 12, w: 1, h: 1, allowedTypes: ["villager-cottage"], cost: 275, name: "Cottage Row Shore" },
  { id: "town-lot-c8", x: 9, y: 13, w: 1, h: 1, allowedTypes: ["villager-cottage"], cost: 275, name: "Cottage Row Far Shore" },
  // Mercy's Shore — 4 beach-themed lots with preset beachside dining, now the
  // southernmost district with the waves right below.
  // (NPCs reach via Harbor Lane — no more floating over buildings)
  { id: "town-lot-s11", x: 0, y: 12, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 825, name: "Mercy's Shore West", presetType: "pizza-place", beach: true },
  { id: "town-lot-s12", x: 2, y: 12, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 825, name: "Mercy's Shore", presetType: "burger-joint", beach: true },
  { id: "town-lot-s13", x: 4, y: 12, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 825, name: "Mercy's Shore Central", presetType: "taco-stand", beach: true },
  { id: "town-lot-s14", x: 6, y: 12, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 825, name: "Mercy's Shore East", presetType: "sushi-bar", beach: true },
  // Southgate — the hospital (care for the town) and a town amphitheater
  // (for movie nights and shows with the villagers), in the southern
  // extension. Served by Southgate Lane, linked to Chapel Avenue.
  { id: "town-lot-hospital", x: 0, y: 14, w: 2, h: 2, allowedTypes: ["hospital"], cost: 1320, name: "Healing Hills", presetType: "hospital" },
  { id: "town-lot-amphi", x: 4, y: 14, w: 2, h: 2, allowedTypes: ["amphitheater"], cost: 1650, name: "Starlight Green", presetType: "amphitheater" },
  // Artisans' Row — five artisan services on Artisans' Way, the craft street
  // below the hub district. Preset lots: unlock & upgrade, no designing.
  { id: "town-lot-inn", x: 0, y: 28, w: 2, h: 2, allowedTypes: ["inn"], cost: 1320, name: "Wayside Inn", presetType: "inn" },
  { id: "town-lot-carpenter", x: 2, y: 28, w: 2, h: 2, allowedTypes: ["carpenter"], cost: 1210, name: "Carpenter's Workshop", presetType: "carpenter" },
  { id: "town-lot-pottery", x: 4, y: 28, w: 2, h: 2, allowedTypes: ["pottery"], cost: 1100, name: "Pottery Studio", presetType: "pottery" },
  { id: "town-lot-musichall", x: 6, y: 28, w: 2, h: 2, allowedTypes: ["music-hall"], cost: 1760, name: "Music Hall", presetType: "music-hall" },
  { id: "town-lot-tailor", x: 8, y: 28, w: 2, h: 2, allowedTypes: ["tailor"], cost: 1100, name: "Tailor", presetType: "tailor" },
  // Artisans' Row, south side — the observatory, bathhouse, apothecary,
  // town hall, and post office. Preset lots: unlock & upgrade, no designing.
  { id: "town-lot-observatory", x: 0, y: 31, w: 2, h: 2, allowedTypes: ["observatory"], cost: 2200, name: "Observatory", presetType: "observatory" },
  { id: "town-lot-bathhouse", x: 2, y: 31, w: 2, h: 2, allowedTypes: ["bathhouse"], cost: 1650, name: "Bathhouse", presetType: "bathhouse" },
  { id: "town-lot-apothecary", x: 4, y: 31, w: 2, h: 2, allowedTypes: ["apothecary"], cost: 1430, name: "Apothecary", presetType: "apothecary" },
  { id: "town-lot-townhall", x: 6, y: 31, w: 2, h: 2, allowedTypes: ["town-hall"], cost: 2750, name: "Town Hall", presetType: "town-hall" },
  { id: "town-lot-postoffice", x: 8, y: 31, w: 2, h: 2, allowedTypes: ["post-office"], cost: 990, name: "Post Office", presetType: "post-office" },
  // Southgate — fills the gap between the hospital/amphitheater row (y14-15)
  // and the hub district. All preset lots: unlock & upgrade, no designing.
  { id: "town-lot-s15", x: 2, y: 14, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 825, name: "Southgate West", presetType: "pizza-place" },
  { id: "town-lot-s16", x: 6, y: 14, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 825, name: "Southgate East", presetType: "sushi-bar" },
  // Pilgrim's Rest — fills the gap between the hub district (ends y24) and
  // Artisans' Way (y27). A rest stop for travelers on Pilgrim's Way.
  { id: "town-lot-p1", x: 0, y: 25, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 935, name: "Pilgrim's Way West", presetType: "burger-joint" },
  { id: "town-lot-p2", x: 3, y: 25, w: 2, h: 2, allowedTypes: ["fountain-plaza"], cost: 990, name: "Pilgrim Fountain", presetType: "fountain-plaza" },
  { id: "town-lot-p3", x: 5, y: 25, w: 2, h: 2, allowedTypes: TOWN_SHOP_TYPES, cost: 935, name: "Pilgrim's Way East", presetType: "taco-stand" },
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
  // Old Town Lane — between Old Town and the South End
  { x: 0, y: 8 }, { x: 1, y: 8 }, { x: 2, y: 8 }, { x: 3, y: 8 }, { x: 4, y: 8 },
  { x: 5, y: 8 }, { x: 6, y: 8 }, { x: 7, y: 8 }, { x: 8, y: 8 }, { x: 9, y: 8 },
  // Harbor Lane — between the South End and Mercy's Shore
  { x: 0, y: 11 }, { x: 1, y: 11 }, { x: 2, y: 11 }, { x: 3, y: 11 }, { x: 4, y: 11 },
  { x: 5, y: 11 }, { x: 6, y: 11 }, { x: 7, y: 11 }, { x: 8, y: 11 }, { x: 9, y: 11 },
  // Chapel Avenue — the vertical spine linking every street, so villagers
  // walk the roads instead of floating over buildings
  { x: 8, y: 3 }, { x: 8, y: 4 },
  { x: 8, y: 6 }, { x: 8, y: 7 },
  { x: 8, y: 9 }, { x: 8, y: 10 },
  { x: 8, y: 12 }, { x: 8, y: 13 },
  { x: 8, y: 14 }, { x: 8, y: 15 },
  // Southgate Lane — serves the hospital and amphitheater in the southern
  // extension, at the foot of the neighborhood
  { x: 0, y: 16 }, { x: 1, y: 16 }, { x: 2, y: 16 }, { x: 3, y: 16 }, { x: 4, y: 16 },
  { x: 5, y: 16 }, { x: 6, y: 16 }, { x: 7, y: 16 }, { x: 8, y: 16 }, { x: 9, y: 16 },
  // Pilgrim's Way — the southern hub district. Three east-west streets
  // linking the map landmarks (Well, Garden, Mission Field, Dark Forest,
  // River of Life), joined to Chapel Avenue.
  { x: 0, y: 18 }, { x: 1, y: 18 }, { x: 2, y: 18 }, { x: 3, y: 18 }, { x: 4, y: 18 },
  { x: 5, y: 18 }, { x: 6, y: 18 }, { x: 7, y: 18 }, { x: 8, y: 18 }, { x: 9, y: 18 },
  { x: 0, y: 21 }, { x: 1, y: 21 }, { x: 2, y: 21 }, { x: 3, y: 21 }, { x: 4, y: 21 },
  { x: 5, y: 21 }, { x: 6, y: 21 }, { x: 7, y: 21 }, { x: 8, y: 21 }, { x: 9, y: 21 },
  { x: 0, y: 24 }, { x: 1, y: 24 }, { x: 2, y: 24 }, { x: 3, y: 24 }, { x: 4, y: 24 },
  { x: 5, y: 24 }, { x: 6, y: 24 }, { x: 7, y: 24 }, { x: 8, y: 24 }, { x: 9, y: 24 },
  // Chapel Avenue south extension — joins Southgate Lane to Pilgrim's Way
  { x: 8, y: 17 },
  // Hub connector — north-south link between the landmark rows
  { x: 2, y: 17 }, { x: 2, y: 19 }, { x: 2, y: 20 },
  { x: 2, y: 22 }, { x: 2, y: 23 }, { x: 2, y: 25 },
  // Artisans' Spur — drops below the hub district to Artisans' Way
  { x: 2, y: 26 },
  // Artisans' Way — the craft street above the north Artisans' Row lots
  { x: 0, y: 27 }, { x: 1, y: 27 }, { x: 2, y: 27 }, { x: 3, y: 27 }, { x: 4, y: 27 },
  { x: 5, y: 27 }, { x: 6, y: 27 }, { x: 7, y: 27 }, { x: 8, y: 27 }, { x: 9, y: 27 },
  // Artisans' Lane — the middle street, between the two Artisans' Row lot rows
  { x: 0, y: 30 }, { x: 1, y: 30 }, { x: 2, y: 30 }, { x: 3, y: 30 }, { x: 4, y: 30 },
  { x: 5, y: 30 }, { x: 6, y: 30 }, { x: 7, y: 30 }, { x: 8, y: 30 }, { x: 9, y: 30 },
  // South Walk — the buffer street below the south Artisans' Row lots
  { x: 0, y: 33 }, { x: 1, y: 33 }, { x: 2, y: 33 }, { x: 3, y: 33 }, { x: 4, y: 33 },
  { x: 5, y: 33 }, { x: 6, y: 33 }, { x: 7, y: 33 }, { x: 8, y: 33 }, { x: 9, y: 33 },
];

/** A hub landmark — a place on the town map that travels to another map. */
export type TownLandmark = {
  id: string;
  name: string;
  blurb: string;
  targetMap: TownMapId;
  x: number;
  y: number;
  w: number;
  h: number;
  art: "well" | "garden-gate" | "mission-field" | "dark-forest" | "river-dock";
};

/** The five gates of the hub district — each opens its map. */
export const TOWN_LANDMARKS: TownLandmark[] = [
  { id: "landmark-well",    name: "The Well",             blurb: "Draw living water, once a day",          targetMap: "well",    x: 0, y: 19, w: 2, h: 2, art: "well" },
  { id: "landmark-garden",  name: "Garden of Remembrance", blurb: "Remember those you love",               targetMap: "mall",    x: 3, y: 19, w: 2, h: 2, art: "garden-gate" },
  { id: "landmark-mission", name: "Mission Field",        blurb: "Send prayer lights on missions",         targetMap: "reserve", x: 5, y: 19, w: 2, h: 2, art: "mission-field" },
  { id: "landmark-forest",  name: "Dark Forest",          blurb: "Battle demons in the dark wood",         targetMap: "forest",  x: 0, y: 22, w: 2, h: 2, art: "dark-forest" },
  { id: "landmark-river",   name: "River of Life",        blurb: "Fish the waters, sell your catch",       targetMap: "river",   x: 3, y: 22, w: 2, h: 2, art: "river-dock" },
];

/** Find the landmark covering tile (x, y), if any. */
export function townLandmarkAt(x: number, y: number): TownLandmark | undefined {
  return TOWN_LANDMARKS.find((l) => x >= l.x && x < l.x + l.w && y >= l.y && y < l.y + l.h);
}

/**
 * Living Stream — winds through the hub district from the east hills down
 * to the southern waves. Purely decorative; villagers stroll its banks.
 */
export const TOWN_STREAM: Array<{ x: number; y: number }> = [
  { x: 9, y: 19 },
  { x: 9, y: 20 }, { x: 8, y: 20 }, { x: 7, y: 20 },
  { x: 7, y: 21 },
  { x: 7, y: 22 }, { x: 8, y: 22 }, { x: 9, y: 22 },
  { x: 9, y: 23 },
  { x: 9, y: 24 },
  { x: 9, y: 25 },
];

const TOWN_STREAM_SET = new Set(TOWN_STREAM.map((s) => `${s.x}-${s.y}`));
const TOWN_PATH_SET = new Set(TOWN_PATH.map((s) => `${s.x}-${s.y}`));

/** True if the tile is stream water. */
export function isStreamTile(x: number, y: number): boolean {
  return TOWN_STREAM_SET.has(`${x}-${y}`);
}

/** True if a bridge spans the stream here (path crosses water). */
export function isBridgeTile(x: number, y: number): boolean {
  return isStreamTile(x, y) && TOWN_PATH_SET.has(`${x}-${y}`);
}

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
/** Cottages in stable display order (top-to-bottom, left-to-right). */
export function townCottages(buildings: PlacedBuilding[]): PlacedBuilding[] {
  return buildings
    .filter((b) => b.type === "villager-cottage")
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

function hashPersonId(personId: string): number {
  let h = 0;
  for (let i = 0; i < personId.length; i++) h = (h * 31 + personId.charCodeAt(i)) >>> 0;
  return h;
}

/** Which cottage a prayer light calls home — stable hash of their id across
 *  the built cottages, so every light has a home no matter how the day's
 *  list is ordered or filtered. Null when no cottage is built (lights keep
 *  the church as home, as before). */
export function cottageHomeFor(buildings: PlacedBuilding[], personId: string): PlacedBuilding | null {
  const cottages = townCottages(buildings);
  if (cottages.length === 0) return null;
  return cottages[hashPersonId(String(personId)) % cottages.length];
}

/** The lights who live in one cottage. */
export function cottageResidents(
  buildings: PlacedBuilding[],
  cottageId: string,
  lights: { personId: string; name: string }[]
): { personId: string; name: string }[] {
  const cottages = townCottages(buildings);
  const idx = cottages.findIndex((c) => c.id === cottageId);
  if (idx < 0 || cottages.length === 0) return [];
  return lights.filter(
    (l) => hashPersonId(String(l.personId)) % cottages.length === idx
  );
}

export function ensureTownNeighborhood(map: MapState): MapState {
  // 1. Roads: drop non-path roads and stale path tiles (no longer in
  //    TOWN_PATH, e.g. after a grid resize), seed the winding path.
  const currentPathIds = new Set(townPathRoads().map((r) => r.id));
  const keptPath = (map.roads || []).filter(
    (r) => isTownPath(r) && currentPathIds.has(r.id)
  );
  const keptIds = new Set(keptPath.map((r) => r.id));
  const freshPath = townPathRoads().filter((r) => !keptIds.has(r.id));
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

  const staleDropped = (map.roads || []).length - keptPath.length - nonPathRoads.length;
  const roadsChanged = freshPath.length > 0 || nonPathRoads.length > 0 || staleDropped > 0;
  const buildingsChanged = moved.some((b, i) => b !== buildings[i]);
  // Lot buildings render at their lot's position — if a lot moved (taller map,
  // new streets), snap its building along so nothing is left behind.
  const synced = moved.map((b) => {
    if (!b.townLotId) return b;
    const lot = TOWN_LOTS.find((l) => l.id === b.townLotId);
    if (!lot || (b.x === lot.x && b.y === lot.y)) return b;
    return { ...b, x: lot.x, y: lot.y };
  });
  const syncedChanged = synced.some((b, i) => b !== moved[i]);
  if (!roadsChanged && !buildingsChanged && !syncedChanged) return map;
  return {
    ...map,
    roads: [...keptPath, ...freshPath],
    buildings: synced,
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
  /** Stock on hand per building id (only stocked building types use it).
   *  Optional so older saved games load cleanly — missing = half cap. */
  stockByBuilding?: Record<string, number>;
};

export const TOWN_GRID_SIZE = 10;
/** Town/city map dimensions — both grids are taller than wide so every
 *  district gets its own street. The town is 10 wide and 18 tall: the
 *  hospital and amphitheater sit in a southern extension (longer, not
 *  wider). Other maps (school, etc.) stay 10x10. */
export const TOWN_GRID_W = 10;
export const TOWN_GRID_H = 34;
export const CITY_GRID_W = 10;
export const CITY_GRID_H = 18;

/** Grid dimensions for a map — town is 10x26, city is 10x14; others are 10x10. */
export function mapGridSize(mapId: TownMapId): { w: number; h: number } {
  if (mapId === "town") return { w: TOWN_GRID_W, h: TOWN_GRID_H };
  if (mapId === "city") return { w: CITY_GRID_W, h: CITY_GRID_H };
  return { w: TOWN_GRID_SIZE, h: TOWN_GRID_SIZE };
}

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
      well: emptyMapState(),
      reserve: emptyMapState(),
      forest: emptyMapState(),
      river: emptyMapState(),
    },
    lastIncomeDate: null,
    stockByBuilding: {},
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

/** Sanitize a persisted stock record: building id -> finite units >= 0. */
function parseStockByBuilding(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const [id, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) out[id] = v;
  }
  return out;
}

export function parseTown(value: unknown): TownState {
  if (!value || typeof value !== "object") return emptyTownState();
  const t = value as Partial<TownState> & { buildings?: unknown; decorations?: unknown; roads?: unknown };
  const lastIncomeDate = typeof t.lastIncomeDate === "string" ? t.lastIncomeDate : null;
  // Stock must round-trip: dropping it here re-seeded every stocked
  // building at half cap on every app open.
  const stockByBuilding = parseStockByBuilding(t.stockByBuilding);
  // New multi-map format
  if (t.maps && typeof t.maps === "object") {
    const raw = t.maps as Partial<Record<TownMapId, unknown>>;
    return {
      maps: {
        town: ensureTownNeighborhood(parseMapState(raw.town)),
        city: ensureCityStreets(parseMapState(raw.city)),
        mall: parseMapState(raw.mall),
        school: parseMapState(raw.school),
        well: parseMapState(raw.well),
        reserve: parseMapState(raw.reserve),
        forest: parseMapState(raw.forest),
        river: parseMapState(raw.river),
      },
      lastIncomeDate,
      stockByBuilding,
    };
  }
  // Old single-map format: migrate everything into the town map
  return {
    maps: {
      town: ensureTownNeighborhood(parseMapState({ buildings: t.buildings, decorations: t.decorations, roads: t.roads })),
      city: ensureCityStreets(emptyMapState()),
      mall: emptyMapState(),
      school: emptyMapState(),
      well: emptyMapState(),
      reserve: emptyMapState(),
      forest: emptyMapState(),
      river: emptyMapState(),
    },
    lastIncomeDate,
    stockByBuilding,
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
  // Villager cottages are cozy 1x1 homes at every level, even on lots.
  if (type === "villager-cottage") return { w: 1, h: 1 };
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

/** XP per day for a building type/level (0 for coin buildings) — economy-scaled. */
export function xpIncomeFor(type: BuildingType, level: number): number {
  const base = BUILDINGS[type].xpPerDay;
  if (base === 0) return 0;
  const mult = UPGRADE_INCOME_MULT[Math.min(Math.max(level || 1, 1), 3) as 1 | 2 | 3];
  return scaledXP(base * mult);
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
  const costs: Record<number, number> = { 1: 10000, 2: 25000, 3: 50000, 4: 100000 };
  return scaledCoins(costs[currentFloors] ?? 0);
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

export function dailyIncomeForMap(map: MapState, town?: TownState, milestoneMult: number = 1, fellowshipBonus: number = 1, prayedCount: number = 0, remembranceBonus: number = 1, gardenVisitBonus: number = 1, prestigeMult: number = 1): number {
  if (!mapHasPopulation(map, town)) return 0;
  const popMult = populationMult(prayedCount);
  return map.buildings.reduce((sum, b) => {
    const base = effectiveIncomeFor(b);
    const floorMult = b.type === "bank-tower" ? bankFloorMultiplier(b.floors || 1) : 1;
    const multiplier = roadMultiplierForBuilding(map, b.id) * shopAdjacencyBonusForBuilding(map, b.id) * floorMult * workerMult(b) * milestoneMult * popMult * fellowshipBonus * remembranceBonus * gardenVisitBonus * prestigeMult;
    return sum + (base * multiplier);
  }, 0);
}

export function dailyXPForMap(map: MapState): number {
  return map.buildings.reduce((sum, b) => sum + xpIncomeFor(b.type, b.level || 1) * workerMult(b), 0);
}

export function dailyIncomeForTown(town: TownState, milestoneMult: number = 1, houseMult: number = 1, fellowshipBonus: number = 1, prayedCount: number = 0, remembranceBonus: number = 1, gardenVisitBonus: number = 1, prestigeMult: number = 1): number {
  return TOWN_MAP_IDS.reduce((sum, id) => sum + dailyIncomeForMap(town.maps[id], town, milestoneMult, fellowshipBonus, prayedCount, remembranceBonus, gardenVisitBonus, prestigeMult), 0) * houseMult;
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

/** Desk cost scales by floor (20 / 30 / 40 / 50 / 60) — economy-scaled. */
export function bankDeskCost(floor: number): number {
  return scaledCoins(BANK_DESK_COST * bankFloorPriceMult(floor));
}

/** Carpet cost scales by floor. Floor 1 carpets are 1 coin. */
export function bankCarpetCost(floor: number): number {
  if (floor <= 1) return 1;
  return Math.max(1, scaledCoins(bankFloorPriceMult(floor)));
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
      { name: "ATM", icon: "🏧", cost: 150, max: 2, effectPct: 0, flatPerHour: 80, blurb: "+80 coins/hour" },
      { name: "Express ATM", icon: "🏧", cost: 230, max: 2, effectPct: 0, flatPerHour: 120, blurb: "+120 coins/hour" },
      { name: "Gold ATM", icon: "🏧", cost: 300, max: 2, effectPct: 0, flatPerHour: 160, blurb: "+160 coins/hour" },
      { name: "Platinum ATM", icon: "🏧", cost: 380, max: 2, effectPct: 0, flatPerHour: 200, blurb: "+200 coins/hour" },
      { name: "Diamond ATM", icon: "🏧", cost: 450, max: 2, effectPct: 0, flatPerHour: 250, blurb: "+250 coins/hour" },
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
  return scaledCoins(type === "atm" ? ATM_STORAGE_UPGRADE_COSTS[lvl] : VAULT_STORAGE_UPGRADE_COSTS[lvl]);
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

// ---------------------------------------------------------------------------
// Gratitude coins — tap a prayer light once per hour for coins
// ---------------------------------------------------------------------------

/** Last-tap timestamps per light id. */
export const LIGHT_TAP_KEY = "prayercircle.hometown.light-taps.v1";
export const LIGHT_TAP_COOLDOWN_MS = 3600000; // 1 hour
export const LIGHT_TAP_COINS = 20;

export function parseLightTaps(value: unknown): Record<string, number> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (typeof v === "number") out[k] = v;
    }
    return out;
  }
  return {};
}

/** True if this light can be thanked right now (no tap in the last hour). */
export function canThankLight(taps: Record<string, number>, lightId: string, now = Date.now()): boolean {
  const last = taps[lightId] || 0;
  return now - last >= LIGHT_TAP_COOLDOWN_MS;
}

// ---------------------------------------------------------------------------
// Daily prayer bonus — thresholds for praying for people
// ---------------------------------------------------------------------------

export const PRAYER_BONUS_KEY = "prayercircle.hometown.prayer-bonus.v1";
export const PRAYER_COIN_BONUSES = [
  { threshold: 5, coins: 250 },
  { threshold: 10, coins: 500 },
  { threshold: 20, coins: 1000 },
] as const;

export type PrayerBonusState = { date: string; awarded: number[] };

export function parsePrayerBonus(value: unknown): PrayerBonusState {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const v = value as Record<string, unknown>;
    return {
      date: typeof v.date === "string" ? v.date : "",
      awarded: Array.isArray(v.awarded) ? v.awarded.filter(x => typeof x === "number") : [],
    };
  }
  return { date: "", awarded: [] };
}

// ---------------------------------------------------------------------------
// Work shifts — tap rapidly on a shop for 10 seconds to earn coins
// ---------------------------------------------------------------------------

export const WORK_SHIFT_KEY = "prayercircle.hometown.work-shifts.v1";
export const WORK_SHIFT_COOLDOWN_MS = 300000; // 5 minutes
export const WORK_SHIFT_TAPS_PER_COIN = 5;
export const WORK_SHIFT_MAX_COINS = 200;
export const WORK_SHIFT_DURATION_MS = 10000; // 10 seconds

export function parseWorkShifts(value: unknown): Record<string, number> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (typeof v === "number") out[k] = v;
    }
    return out;
  }
  return {};
}

/** True if this building is off work-shift cooldown. */
export function canWorkShift(shifts: Record<string, number>, buildingId: string, now = Date.now()): boolean {
  const last = shifts[buildingId] || 0;
  return now - last >= WORK_SHIFT_COOLDOWN_MS;
}

// ---------------------------------------------------------------------------
// Fast day green bonus — 50 coins per completed fast day
// ---------------------------------------------------------------------------

export const FAST_DAY_COIN_KEY = "prayercircle.hometown.fast-day-coins.v1";
export const FAST_DAY_COINS = 50;

/** Set of "fastId:date" keys already counted for coins. */
export function parseFastDayCoins(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(x => typeof x === "string");
  return [];
}
