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
  city:    { name: "City",     icon: "🏙️", description: "Bigger buildings, bigger earnings", unlockCost: 1000, comingSoon: false },
  mall:    { name: "Mall",     icon: "🏬", description: "Buy shop units as income properties", unlockCost: 750, comingSoon: false },
  school:  { name: "School",   icon: "🏫", description: "Buildings that earn XP", unlockCost: 750, comingSoon: false },
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
  | "diner";

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

export function upgradeCostFor(type: BuildingType, toLevel: 2 | 3): number {
  const base = BUILDINGS[type].cost;
  return Math.round(base * UPGRADE_COST_MULT[toLevel]);
}

export function incomeFor(type: BuildingType, level: 1 | 2 | 3): number {
  const base = BUILDINGS[type].incomePerDay;
  return Math.round(base * UPGRADE_INCOME_MULT[level]);
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
  "farm":       { name: "Farm",       icon: "🌾", cost: 15,  tier: 1, incomePerDay: 2,  xpPerDay: 0, maps: ["town"], description: "+2 coins per day while your streak is alive." },
  "shop":       { name: "Shop",       icon: "🏪", cost: 30,  tier: 1, incomePerDay: 3,  xpPerDay: 0, maps: ["town"], description: "+3 coins per day while your streak is alive." },
  "bakery":     { name: "Bakery",     icon: "🥖", cost: 60,  tier: 2, incomePerDay: 5,  xpPerDay: 0, maps: ["town"], description: "+5 coins per day while your streak is alive." },
  "market":     { name: "Market",     icon: "🏬", cost: 120, tier: 3, incomePerDay: 8,  xpPerDay: 0, maps: ["town"], description: "+8 coins per day while your streak is alive." },
  "bank":       { name: "Bank",       icon: "🏦", cost: 250, tier: 4, incomePerDay: 12, xpPerDay: 0, maps: ["town"], description: "+12 coins per day while your streak is alive." },
  "barbershop": { name: "Barbershop", icon: "💈", cost: 40,  tier: 1, incomePerDay: 1,  xpPerDay: 0, maps: ["town"], description: "+1 coin/day. Boosts connected businesses +25%." },
  "clothes-shop": { name: "Clothes Shop", icon: "👕", cost: 50, tier: 1, incomePerDay: 1, xpPerDay: 0, maps: ["town"], description: "Buy outfits for your pawn. +1 coin/day." },
  "armory":       { name: "Armory",       icon: "🛡️", cost: 80, tier: 1, incomePerDay: 2, xpPerDay: 0, maps: ["town"], description: "Buy armor for +hearts. +2 coins/day." },
  "weaponsmith":  { name: "Weaponsmith",  icon: "⚔️", cost: 80, tier: 1, incomePerDay: 2, xpPerDay: 0, maps: ["town"], description: "Buy weapons for +XP. +2 coins/day." },
  "toolshop":     { name: "Tool Shop",    icon: "🔨", cost: 60, tier: 1, incomePerDay: 1, xpPerDay: 0, maps: ["town"], description: "Buy tools for +coins. +1 coin/day." },
  // City — big buildings, big earnings
  "bank-tower":       { name: "Bank Tower",       icon: "🏦", cost: 500, tier: 1, incomePerDay: 25, xpPerDay: 0, maps: ["city"], description: "A towering bank. +25 coins/day." },
  "department-store": { name: "Department Store", icon: "🏬", cost: 400, tier: 1, incomePerDay: 20, xpPerDay: 0, maps: ["city"], description: "Everything under one roof. +20 coins/day." },
  "hotel":            { name: "Grand Hotel",      icon: "🏨", cost: 350, tier: 1, incomePerDay: 18, xpPerDay: 0, maps: ["city"], description: "Luxury suites downtown. +18 coins/day." },
  "office":           { name: "Office Tower",     icon: "🏢", cost: 300, tier: 1, incomePerDay: 15, xpPerDay: 0, maps: ["city"], description: "Busy professionals. +15 coins/day." },
  // Mall — income properties
  "food-court": { name: "Food Court", icon: "🍔", cost: 100, tier: 1, incomePerDay: 8,  xpPerDay: 0, maps: ["mall"], description: "Hungry shoppers. +8 coins/day." },
  "bookstore":  { name: "Bookstore",  icon: "📚", cost: 80,  tier: 1, incomePerDay: 6,  xpPerDay: 0, maps: ["mall"], description: "Quiet readers. +6 coins/day." },
  "arcade":     { name: "Arcade",     icon: "🕹️", cost: 120, tier: 1, incomePerDay: 10, xpPerDay: 0, maps: ["mall"], description: "Tokens and high scores. +10 coins/day." },
  "cinema":     { name: "Cinema",     icon: "🎬", cost: 150, tier: 1, incomePerDay: 12, xpPerDay: 0, maps: ["mall"], description: "Now showing. +12 coins/day." },
  // School — XP earners
  "library":   { name: "Library",   icon: "📖", cost: 100, tier: 1, incomePerDay: 0, xpPerDay: 50, maps: ["school"], description: "Quiet study earns wisdom. +50 XP/day." },
  "classroom": { name: "Classroom", icon: "📝", cost: 80,  tier: 1, incomePerDay: 0, xpPerDay: 35, maps: ["school"], description: "Daily lessons. +35 XP/day." },
  "chapel":    { name: "Chapel",    icon: "⛪", cost: 120, tier: 1, incomePerDay: 0, xpPerDay: 60, maps: ["school"], description: "A place of prayer. +60 XP/day." },
  // Restaurants — hometown food businesses
  "pizza-place":  { name: "Pizza Place",  icon: "🍕", cost: 60, tier: 1, incomePerDay: 3, xpPerDay: 0, maps: ["town"], description: "Wood-fired pies. +3 coins/day." },
  "burger-joint": { name: "Burger Joint", icon: "🍔", cost: 60, tier: 1, incomePerDay: 3, xpPerDay: 0, maps: ["town"], description: "Smash burgers & shakes. +3 coins/day." },
  "taco-stand":   { name: "Taco Stand",   icon: "🌮", cost: 45, tier: 1, incomePerDay: 2, xpPerDay: 0, maps: ["town"], description: "Street tacos to go. +2 coins/day." },
  "sushi-bar":    { name: "Sushi Bar",    icon: "🍣", cost: 80, tier: 1, incomePerDay: 4, xpPerDay: 0, maps: ["town"], description: "Fresh daily. +4 coins/day." },
  "diner":        { name: "Pancake Diner", icon: "🥞", cost: 50, tier: 1, incomePerDay: 2, xpPerDay: 0, maps: ["town"], description: "Breakfast all day. +2 coins/day." },
};

export type PlacedBuilding = {
  id: string;
  type: BuildingType;
  x: number;
  y: number;
  level: 1 | 2 | 3;
  floors?: number; // bank-tower stories (default 1, max 5)
  accumulated?: number;
  lastTick?: string;
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

export const TOWN_GRID_SIZE = 8;

export function emptyMapState(): MapState {
  return { buildings: [], decorations: [], roads: [] };
}

export function emptyTownState(): TownState {
  return {
    maps: {
      town: emptyMapState(),
      city: emptyMapState(),
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
    buildings: Array.isArray(m.buildings) ? m.buildings.filter(b => b && typeof b.id === "string").map(b => ({ ...b, level: b.level === 2 || b.level === 3 ? b.level : 1 as const })) : [],
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
        town: parseMapState(raw.town),
        city: parseMapState(raw.city),
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
      town: parseMapState({ buildings: t.buildings, decorations: t.decorations, roads: t.roads }),
      city: emptyMapState(),
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
export function buildingFootprint(level: number, type?: BuildingType): { w: number; h: number } {
  const s = Math.min(Math.max(level || 1, 1), 3);
  if (type && CITY_BIG_TYPES.includes(type)) {
    const big = s + 1; // L1=2, L2=3, L3=4
    return { w: big, h: big };
  }
  return { w: s, h: s };
}

/** XP per day for a building type/level (0 for coin buildings). */
export function xpIncomeFor(type: BuildingType, level: 1 | 2 | 3): number {
  const base = BUILDINGS[type].xpPerDay;
  return Math.round(base * UPGRADE_INCOME_MULT[level]);
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

  const fp = buildingFootprint(building.level || 1, building.type);
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
    const ofp = buildingFootprint(other.level || 1, other.type);
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

export function dailyIncomeForMap(map: MapState): number {
  return map.buildings.reduce((sum, b) => {
    const base = incomeFor(b.type, b.level || 1);
    const floorMult = b.type === "bank-tower" ? bankFloorMultiplier(b.floors || 1) : 1;
    const multiplier = roadMultiplierForBuilding(map, b.id) * shopAdjacencyBonusForBuilding(map, b.id) * floorMult;
    return sum + (base * multiplier);
  }, 0);
}

export function dailyXPForMap(map: MapState): number {
  return map.buildings.reduce((sum, b) => sum + xpIncomeFor(b.type, b.level || 1), 0);
}

export function dailyIncomeForTown(town: TownState): number {
  return TOWN_MAP_IDS.reduce((sum, id) => sum + dailyIncomeForMap(town.maps[id]), 0);
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
};

export type BankInteriorState = {
  desks: BankInteriorItem[];
  carpets: BankInteriorItem[];
};

export const BANK_INTERIOR_GRID = { w: 8, h: 6 };
export const BANK_DESK_COST = 20;
export const BANK_CARPET_COST = 5;
export const BANK_MAX_DESKS = 6;

export function bankInteriorKey(buildingId: string): string {
  return `prayercircle.hometown.bank.${buildingId}.v1`;
}

export function parseBankInterior(value: unknown): BankInteriorState {
  if (!value || typeof value !== "object") return { desks: [], carpets: [] };
  const s = value as Partial<BankInteriorState>;
  const clean = (arr: unknown) =>
    Array.isArray(arr) ? arr.filter(i => i && typeof i.id === "string" && typeof i.x === "number" && typeof i.y === "number") : [];
  return { desks: clean(s.desks) as BankInteriorItem[], carpets: clean(s.carpets) as BankInteriorItem[] };
}

/**
 * Desk network multiplier: a desk counts as "connected" if it can reach
 * another desk via orthogonally-adjacent carpet tiles (BFS through carpets + desks).
 * Each connected desk gives +25% to the bank's earnings.
 */
export function connectedDeskCount(state: BankInteriorState): number {
  const { desks, carpets } = state;
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

/** 1 + 0.25 per connected desk. Loads interior from storage by building ID. */
export async function bankDeskMultiplier(buildingId: string): Promise<number> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem(bankInteriorKey(buildingId));
    if (!raw) return 1;
    const state = parseBankInterior(JSON.parse(raw));
    return 1 + connectedDeskCount(state) * 0.25;
  } catch {
    return 1;
  }
}
