// ─────────────────────────────────────────────────────────────────────────────
// v291 — The Walkable Town, Part 2: The Wide Street. Pins.
//
// Jonathan, Oct 27 15:08–15:12 (inside his 14:48 delegation): Part 2
// re-lays the town as a wide left-right street; the buildings are
// redesigned as places; for now the CAFÉ IS THE ONLY building that
// produces; the mine and the forest may be redesigned in look and
// format, but HOW THEY WORK carries over exactly.
//
// And his Oct 27 15:27 device verdict on v290 — "Nothing is really
// tappable on here" — with his instruction to make Part 2 match the
// walkable mockup's interaction: tap a spot → he walks there; tap a
// person/door/mine mouth → he walks there and it opens; inside the
// café, SERVE seats the person with a glow and coins fly to the
// register pile where they WAIT (Collect is the only mover). The
// tappability pins at the bottom hold the architecture that answers
// the verdict: every interactive element is a real Pressable inside
// the street subtree — v290's single ground Pressable, a sibling
// UNDER the map subtree, sat outside every tap's ancestor chain and
// could never be reached.
//
// Contracts pinned here:
//  (a) MIGRATION — coins waiting at retired buildings land on the
//      café register pile exactly; the balance is untouched; a
//      second settle moves nothing.
//  (b) CAFÉ-ONLY PRODUCTION — no non-café town place accrues; the
//      engine's arithmetic elsewhere (the city) is untouched.
//  (c) MINE MECHANICS — the constants at HEAD, spot-pinned.
//  (d) FOREST MECHANICS — heal cadence, hospital heals, defeat
//      outcome, the flames pool, at HEAD.
//  (e) STREET PATHING — the walk reaches the café, the mine, the
//      forest, his house and a home's doorstep without crossing a
//      footprint.
//  (f) TAPPABILITY — per-element Pressable wiring + the arrival
//      fallback that can never swallow a tap.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  accrueAwayIncome,
  dailyIncomeForMap,
  dailyIncomeForTown,
  emptyTownState,
  type AwayAccrualInputs,
  type MapState,
  type PlacedBuilding,
  type TownState,
} from "@/lib/hometown";
import {
  cafeRegisterPile,
  defaultWideStreetState,
  deriveStreetWorld,
  planStreetWalk,
  settleWideStreetMigration,
  streetPlaceAt,
  streetPlaceByBuildingId,
} from "@/lib/wide-street";
import {
  CAVE_IN_BURIAL_FRACTION,
  DEEP_DIAMOND_BASE_PRICE,
  DEPTH_BLESSING_MAX,
  DEPTH_BLESSING_PER_LEVEL,
  LEVELS_PER_STRATUM,
  MAX_LEVEL,
  MINE_STRATA,
  ORE_PRICES,
  PICKAXES,
  SATCHEL_BAGS,
  STRATA_COUNT,
  STRATUM_MULTIPLIERS,
  TINDERBOX_FLAMES,
} from "@/lib/mountain";
import {
  DEFEAT_WAKE_PCT,
  HOSPITAL_HEALS_PER_DAY,
  TRICKLE_MS,
  TRICKLE_PCT,
} from "@/lib/hero-health";
import { ENERGY_TRICKLE_MS, maxForestEnergy } from "@/lib/forest-energy";

const ROOT = join(__dirname, "..", "..");
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

const NOW = 1_800_000_000_000;
const NOW_ISO = new Date(NOW).toISOString();
const FIVE_MIN_AGO = new Date(NOW - 5 * 60000).toISOString();

function b(over: Partial<PlacedBuilding> & { id: string; type: PlacedBuilding["type"] }): PlacedBuilding {
  return { x: 0, y: 0, level: 1, accumulated: 0, ...over };
}

/** A town record carrying the old building set, coins waiting. */
function oldTown(): TownState {
  const town = emptyTownState();
  town.maps.town.buildings = [
    b({ id: "diner-a", type: "diner", x: 6, y: 0, level: 3, accumulated: 100 }),
    b({ id: "shop-1", type: "shop", x: 2, y: 3, accumulated: 40 }),
    b({ id: "bakery-1", type: "bakery", x: 0, y: 3, level: 2, accumulated: 25.5 }),
    b({ id: "church-1", type: "church", x: 0, y: 0, level: 2, accumulated: 10 }),
    b({ id: "diner-b", type: "diner", x: 0, y: 6, accumulated: 30 }),
    b({ id: "cottage-1", type: "villager-cottage", x: 8, y: 0, accumulated: 0 }),
    b({ id: "home-1", type: "pawn-house", x: 4, y: 6, accumulated: 0 }),
  ];
  return town;
}

describe("v291 (a) — migration: waiting coins land on the café register, exactly", () => {
  it("sums every non-anchor pile onto the anchor diner; sources stand at zero", () => {
    const town = oldTown();
    const { town: out, state, changed } = settleWideStreetMigration(town, defaultWideStreetState());
    expect(changed).toBe(true);
    expect(state).toEqual({ migrated: true, pendingRegister: 0 });
    const byId = new Map(out.maps.town.buildings.map((bb) => [bb.id, bb]));
    // 100 already waiting at the anchor + 40 + 25.5 + 10 + 30 swept.
    expect(byId.get("diner-a")!.accumulated).toBe(205.5);
    for (const id of ["shop-1", "bakery-1", "church-1", "diner-b"]) {
      expect(byId.get(id)!.accumulated).toBe(0);
    }
    // The register pile the café reads is exactly that sum.
    expect(cafeRegisterPile(out.maps.town, state.pendingRegister)).toBe(205.5);
    expect(deriveStreetWorld(out.maps.town, { pendingRegister: state.pendingRegister }).cafePile).toBe(205.5);
  });

  it("the balance is untouched — the sweep moves piles, never mints or absorbs", () => {
    const town = oldTown();
    const before = JSON.stringify(town);
    const { town: out } = settleWideStreetMigration(town, defaultWideStreetState());
    const totalBefore = [...town.maps.town.buildings].reduce((s, bb) => s + (bb.accumulated || 0), 0);
    const totalAfter = [...out.maps.town.buildings].reduce((s, bb) => s + (bb.accumulated || 0), 0);
    expect(totalAfter).toBe(totalBefore);
    expect(out).not.toHaveProperty("balance");
    expect(out).not.toHaveProperty("coins");
    // Every other map's record is the same object — untouched.
    for (const id of Object.keys(town.maps)) {
      if (id !== "town") expect(out.maps[id as keyof typeof town.maps]).toBe(town.maps[id as keyof typeof town.maps]);
    }
    expect(JSON.stringify(town)).toBe(before); // the settle never mutates its input
  });

  it("idempotent: a second settle changes nothing and doubles nothing", () => {
    const first = settleWideStreetMigration(oldTown(), defaultWideStreetState());
    const second = settleWideStreetMigration(first.town, first.state);
    expect(second.town).toBe(first.town);
    expect(second.changed).toBe(false);
    expect(second.state).toEqual(first.state);
  });

  it("with no diner standing, the sum waits as pendingRegister — visible at the café, folded in when a diner lands", () => {
    const town = emptyTownState();
    town.maps.town.buildings = [
      b({ id: "shop-1", type: "shop", x: 2, y: 3, accumulated: 40 }),
      b({ id: "bakery-1", type: "bakery", x: 0, y: 3, accumulated: 25.5 }),
    ];
    const first = settleWideStreetMigration(town, defaultWideStreetState());
    expect(first.state).toEqual({ migrated: true, pendingRegister: 65.5 });
    expect(
      first.town.maps.town.buildings.every((bb) => (bb.accumulated || 0) === 0)
    ).toBe(true);
    // The café's pile shows the waiting sum even with no diner.
    expect(cafeRegisterPile(first.town.maps.town, first.state.pendingRegister)).toBe(65.5);
    expect(
      deriveStreetWorld(first.town.maps.town, { pendingRegister: first.state.pendingRegister }).cafePile
    ).toBe(65.5);
    // A diner lands: the next settle folds the sum onto its pile.
    const withDiner: TownState = {
      ...first.town,
      maps: {
        ...first.town.maps,
        town: {
          ...first.town.maps.town,
          buildings: [...first.town.maps.town.buildings, b({ id: "diner-a", type: "diner", x: 6, y: 0 })],
        },
      },
    };
    const second = settleWideStreetMigration(withDiner, first.state);
    expect(second.state.pendingRegister).toBe(0);
    expect(second.town.maps.town.buildings.find((bb) => bb.id === "diner-a")!.accumulated).toBe(65.5);
  });
});

describe("v291 (b) — café-only production on the town map", () => {
  function inputs(over: Partial<AwayAccrualInputs> = {}): AwayAccrualInputs {
    return {
      gearCoinMult: 1,
      generosityMult: 0,
      houseCoinMult: 0,
      milestoneMult: 1,
      prestigeMult: 1,
      prayerMultValue: 1,
      prayedCount: 8,
      fellowshipBonus: 1,
      remembranceBonus: 1,
      gardenVisitBonus: 1,
      interiorBonuses: {},
      restInteriorMult: {},
      presenceCounts: null,
      economyScale: 1,
      nowMs: NOW,
      nowIso: NOW_ISO,
      ...over,
    };
  }

  function producingTown(): TownState {
    const town = emptyTownState();
    town.maps.town.buildings = [
      b({ id: "diner-a", type: "diner", x: 6, y: 0, accumulated: 0, lastTick: FIVE_MIN_AGO }),
      b({ id: "shop-1", type: "shop", x: 2, y: 3, accumulated: 40, lastTick: FIVE_MIN_AGO }),
      b({ id: "church-1", type: "church", x: 0, y: 0, accumulated: 10, lastTick: FIVE_MIN_AGO }),
    ];
    town.lastIncomeDate = "2027-01-12";
    return town;
  }

  it("the away accrual grows ONLY the anchor diner's pile; retired piles stand exactly as they were", () => {
    const { town: out, rates } = accrueAwayIncome(producingTown(), inputs());
    const byId = new Map(out.maps.town.buildings.map((bb) => [bb.id, bb]));
    expect(byId.get("diner-a")!.accumulated).toBeGreaterThan(0);
    expect(byId.get("shop-1")!.accumulated).toBe(40);
    expect(byId.get("church-1")!.accumulated).toBe(10);
    expect(Object.keys(rates)).toContain("diner-a");
    expect(rates["shop-1"]).toBeUndefined();
    expect(rates["church-1"]).toBeUndefined();
    // The retired buildings' anchors still advance — their waiting
    // time can never convert into income later.
    expect(byId.get("shop-1")!.lastTick).toBe(NOW_ISO);
  });

  it("control: the same church on the CITY map still earns — the engine's arithmetic is untouched", () => {
    const town = emptyTownState();
    town.maps.city.buildings = [
      b({ id: "church-city", type: "church", x: 2, y: 2, accumulated: 0, lastTick: FIVE_MIN_AGO }),
    ];
    town.lastIncomeDate = "2027-01-12";
    const { town: out, rates } = accrueAwayIncome(town, inputs());
    expect(out.maps.city.buildings[0].accumulated).toBeGreaterThan(0);
    expect(rates["church-city"]).toBeDefined();
  });

  it("daily pricing: the town map contributes through the café alone; the map pricer itself is unchanged", () => {
    const town = producingTown();
    // Priced map-by-map, the town map still knows what a shop WOULD
    // earn — retirement lives in the aggregators, not the pricer.
    expect(dailyIncomeForMap(town.maps.town, town, 1, 1, 8, 1, 1, 1, NOW)).toBeGreaterThan(0);
    const onlyShop = emptyTownState();
    onlyShop.maps.town.buildings = [
      b({ id: "shop-1", type: "shop", x: 2, y: 3, accumulated: 40, lastTick: FIVE_MIN_AGO }),
    ];
    expect(dailyIncomeForTown(onlyShop, 1, 1, 1, 8, 1, 1, 1, NOW)).toBe(0);
  });

  it("the street lib itself never writes the ledger or the town record", () => {
    const src = read("lib/wide-street.ts");
    expect(src).not.toContain("addCoins");
    expect(src).not.toContain("applyCoinsDelta");
    expect(src).not.toContain("TOWN_STORAGE_KEY");
    expect(src).not.toContain("COINS_STORAGE_KEY");
    expect(src).not.toContain("writeCoinsRecord");
  });
});

describe("v291 (c) — mine mechanics unchanged (HEAD values)", () => {
  it("ore prices and the Deep diamond", () => {
    expect(ORE_PRICES).toEqual({
      stone: 3,
      coal: 6,
      copper: 10,
      iron: 14,
      silver: 26,
      gold: 45,
      diamond: 120,
    });
    expect(DEEP_DIAMOND_BASE_PRICE).toBe(220);
  });

  it("the haul ladder, strata, cave-in odds and regrow", () => {
    expect(STRATUM_MULTIPLIERS).toEqual([1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3]);
    expect(STRATA_COUNT).toBe(8);
    expect(LEVELS_PER_STRATUM).toBe(10);
    expect(MAX_LEVEL).toBe(80);
    expect(MINE_STRATA.map((s) => s.collapseChance)).toEqual([0, 0, 0, 0, 0, 0.12, 0.16, 0.2]);
    expect(MINE_STRATA.map((s) => s.regrowHours)).toEqual([2, 2.6, 3.1, 3.7, 4.3, 4.9, 5.4, 6]);
    expect(CAVE_IN_BURIAL_FRACTION).toBe(0.5);
  });

  it("picks Wood→Crown, carry Pockets→Crown Vault Hauler, Depth Blessing, tinderbox", () => {
    expect(PICKAXES.map((p) => p.cost)).toEqual([0, 250, 600, 1200, 2800, 5000, 25000, 100000]);
    expect(PICKAXES[0].name).toBe("Wood Pick");
    expect(PICKAXES[PICKAXES.length - 1].name).toBe("Crown Pick");
    expect(SATCHEL_BAGS[0]).toMatchObject({ name: "Pockets", capacity: 5, cost: 0 });
    expect(SATCHEL_BAGS[SATCHEL_BAGS.length - 1]).toMatchObject({
      name: "Crown Vault Hauler",
      capacity: 240,
      cost: 120000,
    });
    expect(DEPTH_BLESSING_PER_LEVEL).toBe(0.0025);
    expect(DEPTH_BLESSING_MAX).toBe(0.2);
    expect(TINDERBOX_FLAMES).toBe(3);
  });
});

describe("v291 (d) — forest mechanics unchanged (HEAD values)", () => {
  it("heal cadence, hospital, defeat", () => {
    expect(TRICKLE_MS).toBe(3600 * 1000);
    expect(TRICKLE_PCT).toBe(0.1);
    expect(HOSPITAL_HEALS_PER_DAY).toBe(2);
    expect(DEFEAT_WAKE_PCT).toBe(0.1);
  });

  it("the flames pool: max is the XP level, one back an hour", () => {
    expect(maxForestEnergy(15)).toBe(15);
    expect(maxForestEnergy(1)).toBe(1);
    expect(ENERGY_TRICKLE_MS).toBe(3600 * 1000);
  });
});

describe("v291 (e) — street pathing reaches every place's doorstep", () => {
  const map: MapState = {
    buildings: [
      b({ id: "diner-a", type: "diner", x: 6, y: 0, level: 3, accumulated: 12 }),
      b({ id: "home-hero", type: "pawn-house", x: 4, y: 6 }),
      b({ id: "cottage-1", type: "villager-cottage", x: 8, y: 0 }),
      b({ id: "cottage-2", type: "villager-cottage", x: 0, y: 3 }),
      b({ id: "house-1", type: "house", x: 2, y: 6 }),
      b({ id: "cottage-3", type: "villager-cottage", x: 9, y: 9 }),
      b({ id: "shop-1", type: "shop", x: 2, y: 3, accumulated: 40 }),
    ],
    decorations: [],
    roads: [],
  };
  const world = deriveStreetWorld(map);

  function expectCleanRoute(from: { x: number; y: number }, door: { x: number; y: number }) {
    const plan = planStreetWalk(world, from, door);
    expect(plan).not.toBeNull();
    expect(plan!.tiles[0]).toEqual(from);
    expect(plan!.goal).toEqual(door);
    expect(plan!.tiles[plan!.tiles.length - 1]).toEqual(door);
    for (const t of plan!.tiles) {
      expect(world.blocked.has(`${t.x},${t.y}`)).toBe(false);
    }
    for (let i = 1; i < plan!.tiles.length; i++) {
      const step =
        Math.abs(plan!.tiles[i].x - plan!.tiles[i - 1].x) +
        Math.abs(plan!.tiles[i].y - plan!.tiles[i - 1].y);
      expect(step).toBe(1);
    }
  }

  it("the street's cast of places stands: café, mine, forest, his house, homes, gates, open ground", () => {
    const kinds = world.places.map((p) => p.kind);
    expect(kinds).toContain("cafe");
    expect(kinds).toContain("mine");
    expect(kinds).toContain("forest");
    expect(kinds).toContain("house");
    // v327: the Missions board stands as a place of its own.
    expect(kinds).toContain("board");
    expect(kinds.filter((k) => k === "home")).toHaveLength(4);
    expect(kinds.filter((k) => k === "gate")).toHaveLength(5);
    expect(kinds.filter((k) => k === "empty-lot")).toHaveLength(2);
    // The forest closes the west edge; the mine caps the north
    // run's east end in its hill. (v327 re-pin: the mine's column
    // is the north run's end, not the world's — the south run can
    // run longer. Drawing: hometown-street-concepts-v1.html
    // Concept 2 — The Diorama, approved 2026-10-28 22:45.)
    const forest = world.places.find((p) => p.kind === "forest")!;
    expect(forest.x).toBe(0);
    const mine = world.places.find((p) => p.kind === "mine")!;
    expect(mine.y).toBe(0);
    expect(mine.door.y).toBe(3);
    const northEnds = world.places
      .filter((p) => p !== mine && (p.kind === "house" || p.kind === "home" || p.kind === "gate") && p.plot.y + p.plot.h <= 9)
      .map((p) => p.x + p.w);
    expect(Math.max(...northEnds)).toBeLessThanOrEqual(mine.x + 1);
    // The retired shop became NO place at all — it produces nothing
    // and stands nowhere on the street.
    expect(streetPlaceByBuildingId(world, "shop-1")).toBeNull();
    expect(world.cafeBuildingId).toBe("diner-a");
    expect(world.cafePile).toBe(12);
  });

  it("from the forest door, the walk reaches the café, the mine, his house and a home", () => {
    // v327 re-pin: the forest door is the derived one (on the lane
    // at the treeline's foot), not the old straight band's literal.
    const start = world.places.find((p) => p.kind === "forest")!.door;
    expectCleanRoute(start, world.cafe!.door);
    expectCleanRoute(start, world.places.find((p) => p.kind === "mine")!.door);
    expectCleanRoute(start, world.places.find((p) => p.kind === "house")!.door);
    expectCleanRoute(start, world.places.find((p) => p.kind === "home")!.door);
  });

  it("from the café door, the walk reaches the forest door and the far empty ground", () => {
    const start = world.cafe!.door;
    const forest = world.places.find((p) => p.kind === "forest")!;
    expectCleanRoute(start, forest.door);
    const far = world.places.filter((p) => p.kind === "empty-lot").pop()!;
    expectCleanRoute(start, far.door);
  });

  it("streetPlaceAt names the place under a tap — footprint and door frontage alike", () => {
    const cafe = world.cafe!;
    expect(streetPlaceAt(world, cafe.x + 1, cafe.y + 1)?.kind).toBe("cafe");
    expect(streetPlaceAt(world, cafe.door.x, cafe.door.y)?.kind).toBe("cafe");
    const mine = world.places.find((p) => p.kind === "mine")!;
    expect(streetPlaceAt(world, mine.door.x, mine.door.y)?.kind).toBe("mine");
    expect(streetPlaceAt(world, 1, 5)?.kind).toBe("forest");
    expect(streetPlaceAt(world, world.w - 1, 0)).toBeNull(); // the skyline row
  });
});

describe("v291 (f) — tappability: every element a real Pressable, no tap swallowed", () => {
  const screen = read("app/hometown.tsx");
  const street = read("components/wide-street.tsx");
  const shell = read("components/walkable-town.tsx");
  const villagers = read("components/street-villagers.tsx");

  it("the camera shell owns NO press layer at all — nothing competes with the street's own Pressables", () => {
    expect(shell).not.toContain("<Pressable");
    expect(shell).not.toContain("onPress");
    expect(shell).not.toContain("onTapWorld");
    expect(shell).not.toContain("addCoins");
    expect(shell).not.toContain("setItem");
  });

  it("the street's ground Pressable is the street root's first child — inside the tap's ancestor chain", () => {
    const groundAt = street.indexOf("onGroundPress({");
    expect(groundAt).toBeGreaterThan(-1);
    // It renders before the skyline, the places and the pile.
    expect(groundAt).toBeLessThan(street.indexOf("<StreetSkyline"));
    expect(groundAt).toBeLessThan(street.indexOf("onPlacePress(p)"));
    expect(street).toContain("nativeEvent.locationX");
  });

  it("each place wears its OWN Pressable, wired straight to the place handler", () => {
    expect(street).toContain("onPress={() => onPlacePress(p)}");
    // The component itself never walks and never gates: it reports.
    expect(street).not.toContain("dispatchWalkTo");
    // The screen's place handler starts the walk on that same tap
    // and registers the place's opening as the arrival action.
    const at = screen.indexOf("const handleStreetPlacePress");
    const block = screen.slice(at, screen.indexOf("const handleCollectPilePress", at));
    expect(block).toContain("dispatchWalkTo(place.door");
    expect(block).toContain("runStreetPlace(place)");
  });

  it("the register pile collects DIRECTLY — its handler contains no walk", () => {
    expect(street).toContain("onPress={onCollectPile}");
    const at = screen.indexOf("const handleCollectPilePress");
    const block = screen.slice(at, screen.indexOf("const handleWalkTapWorld", at));
    expect(block).toContain("handleCollectBuilding(anchor.id)");
    expect(block).toContain("collectPendingRegister()");
    expect(block).not.toContain("dispatchWalkTo");
  });

  it("arrival actions route the places to their existing doors", () => {
    const at = screen.indexOf("const runStreetPlace");
    const block = screen.slice(at, screen.indexOf("const handleStreetPlacePress", at));
    expect(block).toContain('router.push("/mine-mouth")');
    expect(block).toContain('handleMapSignSelect("forest")');
    expect(block).toContain('router.push("/pawn-house")');
    expect(block).toContain('router.push("/cafe-street-scene")');
    // The café collects what waits BEFORE it opens (existing flow).
    expect(block.indexOf("handleCollectBuilding(anchor.id)")).toBeLessThan(
      block.indexOf("handleTownLotBuildingPress(anchor)")
    );
  });

  it("a villager's own Pressable reports where they stand; the sheet follows the walk", () => {
    expect(villagers).toContain("onPress");
    expect(villagers).toContain("tile: { ...tileRef.current }");
    expect(screen).toContain("onVillagerTap={handleVillagerTapWalk}");
    expect(screen).toContain("dispatchWalkTo(p.tile, () => handleVillagerTap(p))");
  });

  it("the arrival fallback can never swallow a tap: immediate-fire guards + a walk-sized watchdog", () => {
    const at = screen.indexOf("const dispatchWalkTo");
    const block = screen.slice(at, screen.indexOf("const tileFromWorldPx", at));
    // Walking impossible → the action runs at once.
    expect(block).toContain(
      'activeMap !== "town" || isNight || !heroReadyRef.current || movingBuilding || !sw'
    );
    expect(block).toContain("action();");
    // No route / already there → the action runs at once.
    expect(block).toContain("if (!plan || plan.tiles.length <= 1)");
    // Arrival lost → the watchdog runs it anyway, on a budget sized
    // to the walk (the v290 budget — tiles × 1400 + 5000 — is gone).
    expect(block).toContain("walkWatchdogRef");
    expect(block).toContain("firePendingWalk(seq)");
    expect(block).toContain("plan.tiles.length * 1050 + 2500");
    expect(block).not.toContain("1400");
  });

  it("the mount: shell is camera-only, the street subtree carries the handlers", () => {
    expect(screen).toContain("<WalkableTownShell");
    expect(screen).toContain('enabled={activeMap === "town"}');
    expect(screen).toContain("followNonce={walkNonce}");
    expect(screen).not.toContain("onTapWorld={handleWalkTapWorld}");
    expect(screen).toContain("<StreetWorldView");
    expect(screen).toContain("onGroundPress={handleWalkTapWorld}");
    expect(screen).toContain("onGroundLongPress={handleWalkLongPressWorld}");
    expect(screen).toContain("onPlacePress={handleStreetPlacePress}");
    expect(screen).toContain("onCollectPile={handleCollectPilePress}");
    expect(screen).toContain("<StreetVillagers");
  });
});
