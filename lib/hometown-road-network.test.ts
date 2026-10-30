/**
 * Golden equivalence tests for the shared road-network analysis
 * (perf fix, 2026-10-21).
 *
 * BACKGROUND: roadMultiplierForBuilding / barbershopBoostForBuilding each ran
 * a full BFS over the whole road network on EVERY call, and
 * shopAdjacencyBonusForBuilding re-parsed tile keys in its inner loop. The
 * hometown mount effect calls all three for every earning building on every
 * map, and dailyIncomeForTown re-runs them per building for missed-day
 * income — ~126k primitive checks for ONE building's road call on a modeled
 * town (61 buildings, 616 road tiles).
 *
 * The optimization (one shared analysis per map data version, tile indexes,
 * cached per-building results) must change NO numbers. The historical BFS
 * has a quirk that shipped income embodies: roads first reached through the
 * road-to-road shortcut are marked visited WITHOUT their adjacent buildings
 * being scanned, so the result is NOT a clean connected-components count
 * (see the "quirk pins" describe below — a building fronting only the far
 * road of a 2-road line is NOT counted as connected). The optimized code
 * replicates the traversal step-for-step; these tests pin that.
 *
 * The ref* functions below are VERBATIM copies of the pre-fix
 * implementations (frozen semantics). If they ever disagree with the
 * exported functions, the exported functions changed behavior — not the
 * references.
 */
import { describe, it, expect } from "vitest";
import {
  roadMultiplierForBuilding,
  barbershopBoostForBuilding,
  shopAdjacencyBonusForBuilding,
  dailyIncomeForMap,
  dailyIncomeForTown,
  roadAnalysisDiagnostics,
  buildingFootprint,
  hasFixedFootprint,
  effectiveIncomeFor,
  bankFloorMultiplier,
  workerMult,
  isStockedBuildingType,
  isUnderConstruction,
  STOCKED_INCOME_MULT,
  localDateStr,
  TOWN_MAP_IDS,
  type BuildingType,
  type MapState,
  type PlacedBuilding,
  type PlacedRoad,
  type TownState,
} from "./hometown";

// ---------------------------------------------------------------------------
// Verbatim pre-fix reference implementations (do not "fix" these).
// ---------------------------------------------------------------------------

function refRoadMultiplierForBuilding(map: MapState, buildingId: string): number {
  const roads = map.roads || [];
  const buildings = map.buildings;
  if (roads.length === 0) return 1;

  const building = buildings.find(b => b.id === buildingId);
  if (!building) return 1;

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
    for (const road of roads) {
      const roadKey = `${road.x},${road.y}`;
      if (roadVisited.has(roadKey)) continue;
      if (isAdjacent(current.x, current.y, road.x, road.y)) {
        roadVisited.add(roadKey);
        for (const b of buildings) {
          if (visited.has(b.id)) continue;
          if (isAdjacent(road.x, road.y, b.x, b.y)) {
            visited.add(b.id);
            connectedCount++;
            queue.push({ x: b.x, y: b.y, isBuilding: true, id: b.id });
          }
        }
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

function refBarbershopBoostForBuilding(map: MapState, buildingId: string): number {
  const roads = map.roads || [];
  const buildings = map.buildings;
  if (roads.length === 0) return 1;

  const building = buildings.find(b => b.id === buildingId);
  if (!building) return 1;
  if (building.type === "barbershop") return 1;

  const isAdjacent = (x1: number, y1: number, x2: number, y2: number) =>
    (Math.abs(x1 - x2) === 1 && y1 === y2) || (Math.abs(y1 - y2) === 1 && x1 === x2);

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

const REF_SHOP_TYPES: BuildingType[] = [
  "barbershop", "clothes-shop", "armory", "weaponsmith", "toolshop",
  "food-court", "bookstore", "arcade", "cinema",
  "bank-tower", "department-store", "hotel", "office",
  "pizza-place", "burger-joint", "taco-stand", "sushi-bar", "diner",
];

function refShopAdjacencyBonusForBuilding(map: MapState, buildingId: string): number {
  const buildings = map.buildings;
  const building = buildings.find(b => b.id === buildingId);
  if (!building) return 1;

  const fp = buildingFootprint(building.level || 1, building.type, hasFixedFootprint(building));
  const myTiles = new Set<string>();
  for (let dx = 0; dx < fp.w; dx++)
    for (let dy = 0; dy < fp.h; dy++)
      myTiles.add(`${building.x + dx},${building.y + dy}`);

  const isOrthogonal = (x1: number, y1: number, x2: number, y2: number) =>
    (Math.abs(x1 - x2) === 1 && y1 === y2) || (Math.abs(y1 - y2) === 1 && x1 === x2);

  let shopCount = 0;
  for (const other of buildings) {
    if (other.id === buildingId) continue;
    if (!REF_SHOP_TYPES.includes(other.type)) continue;
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

/** Reference daily income: the pre-fix composition (road mult × shop
 *  adjacency — note: NO barbershop boost, matching dailyIncomeForMap).
 *  RE-BASED (v343): the +2%-per-person population multiplier is
 *  deleted from the composition — prayer enters income exactly
 *  once, as prayerMult inside the accrual chain; the daily estimate
 *  carries no population factor (the lib's prayedCount parameter is
 *  inert). The reference drops it identically. */
function refDailyIncomeForMap(map: MapState, town?: TownState, milestoneMult: number = 1, fellowshipBonus: number = 1, prayedCount: number = 0, remembranceBonus: number = 1, gardenVisitBonus: number = 1, prestigeMult: number = 1, nowMs: number = Date.now()): number {
  void prayedCount;
  return map.buildings.reduce((sum, b) => {
    if (isUnderConstruction(b, nowMs)) return sum;
    const base = effectiveIncomeFor(b);
    const floorMult = b.type === "bank-tower" ? bankFloorMultiplier(b.floors || 1) : 1;
    let stockMult = 1;
    if (town && isStockedBuildingType(b.type)) {
      const stockedDate = town.stockedDateByBuilding?.[b.id];
      if (
        stockedDate &&
        (stockedDate === localDateStr(new Date(nowMs)) || stockedDate === town.lastIncomeDate)
      ) {
        stockMult = STOCKED_INCOME_MULT;
      }
    }
    const multiplier = refRoadMultiplierForBuilding(map, b.id) * refShopAdjacencyBonusForBuilding(map, b.id) * floorMult * workerMult(b) * milestoneMult * fellowshipBonus * remembranceBonus * gardenVisitBonus * prestigeMult * stockMult;
    return sum + (base * multiplier);
  }, 0);
}

function refDailyIncomeForTown(town: TownState, milestoneMult: number = 1, houseMult: number = 1, fellowshipBonus: number = 1, prayedCount: number = 0, remembranceBonus: number = 1, gardenVisitBonus: number = 1, prestigeMult: number = 1, nowMs: number = Date.now()): number {
  // v291 re-base: the production aggregator prices the TOWN map
  // through the café alone (the old building set retired; the café
  // is the town's only producer). The reference applies the same
  // rule independently: the town map contributes its first diner
  // (north-most, then west-most — the café's anchor) priced on a
  // map holding only it; every other map composes in full, as
  // before. The per-map pricer itself is unchanged (pinned above).
  return TOWN_MAP_IDS.reduce((sum, id) => {
    const map = town.maps[id];
    if (id !== "town") {
      return sum + refDailyIncomeForMap(map, town, milestoneMult, fellowshipBonus, prayedCount, remembranceBonus, gardenVisitBonus, prestigeMult, nowMs);
    }
    const anchor = [...map.buildings]
      .filter((b) => b.type === "diner")
      .sort((a, b) => a.y - b.y || a.x - b.x)[0];
    const cafeOnly: MapState = { ...map, buildings: anchor ? [anchor] : [] };
    return sum + refDailyIncomeForMap(cafeOnly, town, milestoneMult, fellowshipBonus, prayedCount, remembranceBonus, gardenVisitBonus, prestigeMult, nowMs);
  }, 0) * houseMult;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW = Date.parse("2026-10-21T19:00:00.000Z");
const rd = (x: number, y: number): PlacedRoad => ({ id: `r${x},${y}`, x, y });
const bd = (id: string, type: BuildingType, x: number, y: number, level: 1 | 2 | 3 = 1, extra?: Partial<PlacedBuilding>): PlacedBuilding =>
  ({ id, type, x, y, level, ...extra });

function emptyMap(): MapState {
  return { buildings: [], decorations: [], roads: [] };
}

/** Modeled town at the audit's scale: avenues + main streets, ~30 buildings. */
function modeledTownMap(): MapState {
  const roads: PlacedRoad[] = [];
  const seen = new Set<string>();
  const addRoad = (x: number, y: number) => {
    const k = `${x},${y}`;
    if (seen.has(k)) return;
    seen.add(k);
    roads.push(rd(x, y));
  };
  for (let y = 0; y < 34; y += 2) for (let x = 0; x < 10; x++) addRoad(x, y);
  for (let y = 0; y < 34; y++) { addRoad(4, y); addRoad(9, y); }

  const types: BuildingType[] = [
    "bakery", "church", "bank", "barbershop", "pizza-place", "diner",
    "bookstore", "market", "clothes-shop", "farm", "library", "hospital",
    "gym", "tailor", "carpenter", "pottery", "apothecary", "observatory",
    "music-hall", "inn",
  ];
  const buildings: PlacedBuilding[] = [];
  let i = 0;
  for (let y = 1; y < 34 && buildings.length < 30; y += 2) {
    for (const x of [1, 6]) {
      if (buildings.length >= 30) break;
      const type = types[i % types.length];
      buildings.push(bd(`town-b${i}`, type, x, y, ((i % 3) + 1) as 1 | 2 | 3, {
        workers: i % 4 === 0 ? 2 : 0,
      }));
      i++;
    }
  }
  // Specials: a floored bank-tower with workers, a building mid-construction.
  buildings.push(bd("town-banktower", "bank-tower", 7, 5, 2, { floors: 4, workers: 1 }));
  buildings.push(bd("town-building-site", "bakery", 2, 9, 1, {
    constructionEndsAt: NOW + 3600_000, constructionToLevel: 2,
  }));
  return { buildings, decorations: [], roads };
}

function modeledCityMap(): MapState {
  const roads: PlacedRoad[] = [];
  const seen = new Set<string>();
  const addRoad = (x: number, y: number) => {
    const k = `${x},${y}`;
    if (seen.has(k)) return;
    seen.add(k);
    roads.push(rd(x, y));
  };
  for (const x of [0, 3, 6, 9]) for (let y = 0; y < 18; y++) addRoad(x, y);
  for (const y of [0, 6, 12]) for (let x = 0; x < 10; x++) addRoad(x, y);

  const types: BuildingType[] = [
    "bank-tower", "department-store", "hotel", "office", "city-market",
    "apartments", "theater", "arcade", "cinema", "food-court",
  ];
  const buildings: PlacedBuilding[] = [];
  let i = 0;
  for (let y = 1; y < 17 && buildings.length < 20; y += 3) {
    for (const x of [1, 4, 7]) {
      if (buildings.length >= 20) break;
      buildings.push(bd(`city-b${i}`, types[i % types.length], x, y, ((i % 3) + 1) as 1 | 2 | 3, {
        plotId: `plot-${i}`,
        workers: i % 5 === 0 ? 3 : 0,
      }));
      i++;
    }
  }
  return { buildings, decorations: [], roads };
}

function modeledSchoolMap(): MapState {
  const roads: PlacedRoad[] = [];
  const seen = new Set<string>();
  const addRoad = (x: number, y: number) => {
    const k = `${x},${y}`;
    if (seen.has(k)) return;
    seen.add(k);
    roads.push(rd(x, y));
  };
  for (let x = 0; x < 10; x++) { addRoad(x, 0); addRoad(x, 9); }
  for (let y = 0; y < 10; y++) { addRoad(0, y); addRoad(9, y); }
  for (let x = 0; x < 10; x++) addRoad(x, 5);
  for (let y = 0; y < 10; y++) addRoad(5, y);

  const types: BuildingType[] = [
    "classroom", "chapel", "music-room", "science-lab", "art-studio",
    "gymnasium", "cafeteria", "school-workshop", "bell-tower",
    "main-office", "library",
  ];
  const buildings = types.map((t, i) =>
    bd(`school-b${i}`, t, 1 + (i % 4) * 2, 1 + Math.floor(i / 4) * 3, ((i % 3) + 1) as 1 | 2 | 3, {
      campusPlotId: `campus-${i}`,
    })
  );
  return { buildings, decorations: [], roads };
}

/** Dense standalone map: ~300 road tiles, 40 buildings (stress fixture). */
function denseMap(): MapState {
  const roads: PlacedRoad[] = [];
  const seen = new Set<string>();
  const addRoad = (x: number, y: number) => {
    const k = `${x},${y}`;
    if (seen.has(k)) return;
    seen.add(k);
    roads.push(rd(x, y));
  };
  for (let y = 0; y < 20; y += 2) for (let x = 0; x < 20; x++) addRoad(x, y);
  for (let x = 0; x < 20; x += 2) for (let y = 0; y < 20; y++) addRoad(x, y);

  const types: BuildingType[] = [
    "bakery", "barbershop", "diner", "bookstore", "market",
    "pizza-place", "church", "bank", "farm", "library",
  ];
  const buildings: PlacedBuilding[] = [];
  let i = 0;
  for (let y = 1; y < 20 && buildings.length < 40; y += 2) {
    for (let x = 1; x < 20 && buildings.length < 40; x += 2) {
      buildings.push(bd(`dense-b${i}`, types[i % types.length], x, y, ((i % 3) + 1) as 1 | 2 | 3));
      i++;
    }
  }
  return { buildings, decorations: [], roads };
}

function modeledTown(): TownState {
  const townMap = modeledTownMap();
  const maps = {} as Record<string, MapState>;
  for (const id of TOWN_MAP_IDS) maps[id] = emptyMap();
  maps.town = townMap;
  maps.city = modeledCityMap();
  maps.school = modeledSchoolMap();
  const todayKey = localDateStr(new Date(NOW));
  return {
    maps: maps as TownState["maps"],
    lastIncomeDate: "2026-10-19",
    stockByBuilding: {},
    stockAnchorsByBuilding: {},
    stockedDateByBuilding: {
      // Stocked today → ×1.5 branch; stocked on lastIncomeDate → ×1.5
      // catch-up branch; stocked long ago → no boost.
      "town-b0": todayKey,
      "town-b5": "2026-10-19",
      "town-b1": "2026-10-01",
    },
  };
}

// ---------------------------------------------------------------------------
// Equivalence sweeps
// ---------------------------------------------------------------------------

function expectMapEquivalence(map: MapState) {
  for (const b of map.buildings) {
    expect(roadMultiplierForBuilding(map, b.id), `roadMult ${b.id}`).toBe(refRoadMultiplierForBuilding(map, b.id));
    expect(barbershopBoostForBuilding(map, b.id), `barberBoost ${b.id}`).toBe(refBarbershopBoostForBuilding(map, b.id));
    expect(shopAdjacencyBonusForBuilding(map, b.id), `adjacency ${b.id}`).toBe(refShopAdjacencyBonusForBuilding(map, b.id));
  }
  // Unknown ids resolve to 1 everywhere.
  expect(roadMultiplierForBuilding(map, "no-such-building")).toBe(1);
  expect(barbershopBoostForBuilding(map, "no-such-building")).toBe(1);
  expect(shopAdjacencyBonusForBuilding(map, "no-such-building")).toBe(1);
}

describe("golden equivalence: modeled maps", () => {
  it("town map (avenues + streets, mixed levels, construction, bank-tower)", () => {
    expectMapEquivalence(modeledTownMap());
  });
  it("city map (plot buildings, fixed footprints, big types)", () => {
    expectMapEquivalence(modeledCityMap());
  });
  it("school map (campus plots)", () => {
    expectMapEquivalence(modeledSchoolMap());
  });
  it("dense map (stress)", () => {
    expectMapEquivalence(denseMap());
  });
});

describe("golden equivalence: daily income", () => {
  it("dailyIncomeForMap matches the reference composition on every modeled map", () => {
    const town = modeledTown();
    for (const id of TOWN_MAP_IDS) {
      const map = town.maps[id];
      expect(dailyIncomeForMap(map, town, 1.2, 1.05, 7, 1.01, 1.02, 1.3, NOW), `daily ${id}`)
        .toBe(refDailyIncomeForMap(map, town, 1.2, 1.05, 7, 1.01, 1.02, 1.3, NOW));
      // Also with defaulted bonus params and no town (stock branch off).
      expect(dailyIncomeForMap(map, undefined, 1, 1, 0, 1, 1, 1, NOW), `daily bare ${id}`)
        .toBe(refDailyIncomeForMap(map, undefined, 1, 1, 0, 1, 1, 1, NOW));
    }
  });
  it("dailyIncomeForTown matches the reference composition", () => {
    const town = modeledTown();
    expect(dailyIncomeForTown(town, 1.2, 1.1, 1.05, 7, 1.01, 1.02, 1.3, NOW))
      .toBe(refDailyIncomeForTown(town, 1.2, 1.1, 1.05, 7, 1.01, 1.02, 1.3, NOW));
    expect(dailyIncomeForTown(town, 1, 1, 1, 0, 1, 1, 1, NOW))
      .toBe(refDailyIncomeForTown(town, 1, 1, 1, 0, 1, 1, 1, NOW));
  });
});

// ---------------------------------------------------------------------------
// Complexity pins: one analysis per map data version, shared by all three
// functions and by dailyIncome; per-building traversals run at most once
// per building per mode, then come from the cache.
// ---------------------------------------------------------------------------

describe("complexity pins", () => {
  it("a full sweep over one map builds the analysis once and traverses at most once per building per mode", () => {
    const map = modeledTownMap();
    const before = roadAnalysisDiagnostics();
    for (const b of map.buildings) {
      roadMultiplierForBuilding(map, b.id);
      barbershopBoostForBuilding(map, b.id);
      shopAdjacencyBonusForBuilding(map, b.id);
    }
    // dailyIncome over the same map data must reuse the same analysis.
    dailyIncomeForMap(map, undefined, 1, 1, 0, 1, 1, 1, NOW);
    const mid = roadAnalysisDiagnostics();
    expect(mid.builds - before.builds).toBe(1);
    expect(mid.traversals - before.traversals).toBeLessThanOrEqual(map.buildings.length * 2);
    // A second full sweep is pure cache hits: no new builds, no new traversals.
    for (const b of map.buildings) {
      roadMultiplierForBuilding(map, b.id);
      barbershopBoostForBuilding(map, b.id);
      shopAdjacencyBonusForBuilding(map, b.id);
    }
    const after = roadAnalysisDiagnostics();
    expect(after.builds - mid.builds).toBe(0);
    expect(after.traversals - mid.traversals).toBe(0);
  });

  it("new map data (edited arrays) builds a fresh analysis — and only one", () => {
    const map = modeledTownMap();
    const before = roadAnalysisDiagnostics();
    roadMultiplierForBuilding(map, map.buildings[0].id);
    // An edit replaces the buildings array (immutable state update).
    const edited: MapState = { ...map, buildings: [...map.buildings] };
    roadMultiplierForBuilding(edited, edited.buildings[0].id);
    barbershopBoostForBuilding(edited, edited.buildings[0].id);
    const after = roadAnalysisDiagnostics();
    expect(after.builds - before.builds).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  it("empty map and buildings without roads", () => {
    expectMapEquivalence(emptyMap());
    const noRoads: MapState = {
      buildings: [bd("a", "bakery", 0, 0), bd("s", "bookstore", 1, 0), bd("bar", "barbershop", 0, 1)],
      decorations: [],
      roads: [],
    };
    expectMapEquivalence(noRoads);
    // Adjacency still applies with no roads; road/boost are 1.
    expect(shopAdjacencyBonusForBuilding(noRoads, "a")).toBe(1.3); // bookstore + barbershop adjacent
    expect(roadMultiplierForBuilding(noRoads, "a")).toBe(1);
  });

  it("disconnected road islands keep separate networks", () => {
    const roads = [rd(0, 0), rd(1, 0), rd(2, 0), rd(0, 5), rd(1, 5)];
    const map: MapState = {
      buildings: [
        bd("a1", "bakery", 0, 1), bd("a2", "church", 2, 1),
        bd("b1", "bakery", 0, 6), bd("bar", "barbershop", 1, 6),
      ],
      decorations: [],
      roads,
    };
    expectMapEquivalence(map);
    // The barbershop lives on island B: island A gets no boost.
    expect(barbershopBoostForBuilding(map, "a1")).toBe(1);
    expect(barbershopBoostForBuilding(map, "a2")).toBe(1);
  });

  it("barbershop next door without a road gives no boost", () => {
    const map: MapState = {
      buildings: [bd("a", "bakery", 0, 0), bd("bar", "barbershop", 1, 0)],
      decorations: [],
      roads: [rd(5, 5), rd(6, 5)],
    };
    expectMapEquivalence(map);
    expect(barbershopBoostForBuilding(map, "a")).toBe(1);
  });

  it("adjacency: diagonal shops do not count, cap is 4 shops", () => {
    const buildings: PlacedBuilding[] = [bd("core", "bakery", 5, 5)];
    // Four orthogonal shops.
    buildings.push(bd("s1", "bookstore", 5, 4), bd("s2", "diner", 5, 6), bd("s3", "arcade", 4, 5), bd("s4", "cinema", 6, 5));
    // A fifth shop stacked beyond s1 (adjacent to s1, not to core) + a diagonal shop.
    buildings.push(bd("s5", "hotel", 5, 3), bd("diag", "bookstore", 6, 6));
    const map: MapState = { buildings, decorations: [], roads: [] };
    expectMapEquivalence(map);
    expect(shopAdjacencyBonusForBuilding(map, "core")).toBe(1.6);
    // The core (a bakery — not a shop type) does not boost the shops back
    // beyond their own shop neighbors; s1 touches s5 only.
    expect(shopAdjacencyBonusForBuilding(map, "s1")).toBe(1.15);
  });

  it("large-footprint (L3) barbershop detected through a far footprint tile", () => {
    // Road line along y=0. Bakery at (0,1) fronts road (0,0). The L3
    // barbershop at (3,1) only touches the road network with its top row.
    const map: MapState = {
      buildings: [bd("a", "bakery", 0, 1), bd("bar", "barbershop", 3, 1, 3)],
      decorations: [],
      roads: [rd(0, 0), rd(1, 0), rd(2, 0), rd(3, 0), rd(4, 0)],
    };
    expectMapEquivalence(map);
  });
});

// ---------------------------------------------------------------------------
// Quirk pins — the historical BFS road-to-road shortcut skips building scans
// for roads it marks. These values are the SHIPPED behavior (verified
// against the pre-fix implementation); the optimized code must reproduce
// them exactly, however odd they look.
// ---------------------------------------------------------------------------

describe("quirk pins (historical BFS semantics)", () => {
  it("2-road line: a building fronting only the far road is not connected", () => {
    const map: MapState = {
      buildings: [bd("s", "bakery", 0, 1), bd("t", "bakery", 1, 1)],
      decorations: [],
      roads: [rd(0, 0), rd(1, 0)],
    };
    expect(roadMultiplierForBuilding(map, "s")).toBe(1);
    expect(roadMultiplierForBuilding(map, "t")).toBe(1);
    expectMapEquivalence(map);
  });

  it("3-road line: endpoints count each other, the middle building is skipped", () => {
    const map: MapState = {
      buildings: [bd("s", "bakery", 0, 1), bd("t", "bakery", 1, 1), bd("u", "bakery", 2, 1)],
      decorations: [],
      roads: [rd(0, 0), rd(1, 0), rd(2, 0)],
    };
    expect(roadMultiplierForBuilding(map, "s")).toBe(1.25);
    expect(roadMultiplierForBuilding(map, "t")).toBe(1);
    expect(roadMultiplierForBuilding(map, "u")).toBe(1.25);
    expectMapEquivalence(map);
  });

  it("barbershop fronting only a shortcut-marked road gives no boost", () => {
    const map: MapState = {
      buildings: [bd("s", "bakery", 0, 1), bd("bar", "barbershop", 1, 1)],
      decorations: [],
      roads: [rd(0, 0), rd(1, 0)],
    };
    expect(barbershopBoostForBuilding(map, "s")).toBe(1);
    expect(barbershopBoostForBuilding(map, "bar")).toBe(1);
    expectMapEquivalence(map);
  });
});
