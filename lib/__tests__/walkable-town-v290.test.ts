// ─────────────────────────────────────────────────────────────────────────────
// v290 — The Walkable Town, Part 1: pins.
//
// Jonathan's Oct 27 authorization (14:48): "I said I'll trust you to
// build the town and everything correctly. I'll trust you with the
// rebuild... and how it works." The rebuild is a new way to MOVE
// through the town he already owns — the book of record (lib/hometown)
// does not change shape, and what he owns carries over by identity.
// These pins hold the four contracts of Part 1:
//
//  (a) CARRY-OVER — the walkable derivation over a fixture save yields
//      the same buildings (ids, tiles, levels, waiting coins); the
//      derivation never writes back into the record.
//  (b) NO AUTO-COLLECT — income settles to waiting piles exactly as
//      before (accrueAwayIncome grows `accumulated`; the town record
//      holds no balance for it to leak into), and neither the walkable
//      lib nor the camera shell contains a collect or coin path. The
//      only new collect trigger is walking up to a building and
//      tapping it — the existing collect flow, in person.
//  (c) CAFÉ — the board the café scene serves is buildCafeBoard's own
//      output; the walkable layer passes the same people through
//      untouched and anchors the scene on the same diner record.
//  (d) PATHING — a tap plans a route over walkable tiles only: it
//      reaches a building's doorstep without crossing any footprint.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  accrueAwayIncome,
  emptyTownState,
  townPathRoads,
  type AwayAccrualInputs,
  type MapState,
  type PlacedBuilding,
  type TownState,
} from "@/lib/hometown";
import {
  cafeAnchorBuilding,
  deriveWalkSpots,
  findWalkPath,
  isWalkableTile,
  planWalkTo,
  walkBlockedTiles,
} from "@/lib/walkable-town";
import { deriveStreetWorld } from "@/lib/wide-street";
import { buildCafeBoard } from "@/lib/cafe-street";
import type { Person, PrayerItem } from "@/lib/prayercircle-data";

const ROOT = join(__dirname, "..", "..");
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

/** A fixture town standing on the real v285 lot geography, on the
 *  real lane (townPathRoads) — the same ground his save stands on. */
function fixtureTownMap(): MapState {
  const buildings: PlacedBuilding[] = [
    { id: "b-church", type: "church", x: 0, y: 0, level: 2, accumulated: 0, townLotId: "town-lot-church" },
    { id: "b-farm", type: "farm", x: 2, y: 0, level: 1, accumulated: 0 },
    { id: "b-diner", type: "diner", x: 6, y: 0, level: 3, accumulated: 132.5, townLotId: "town-lot-n1" },
    { id: "b-bakery", type: "bakery", x: 0, y: 3, level: 2, accumulated: 0, townLotId: "town-lot-s2" },
    { id: "b-shop", type: "shop", x: 2, y: 3, level: 1, accumulated: 40, townLotId: "town-lot-s1" },
    { id: "b-cottage", type: "villager-cottage", x: 8, y: 0, level: 1, accumulated: 0, townLotId: "town-lot-c1" },
  ];
  return { buildings, decorations: [], roads: townPathRoads() };
}

describe("v290 (a) — carry-over: the derivation is the record, by identity", () => {
  it("every building in the save appears on the walk, unchanged", () => {
    const map = fixtureTownMap();
    const spots = deriveWalkSpots(map);
    expect(spots).toHaveLength(map.buildings.length);
    expect(new Set(spots.map((s) => s.buildingId))).toEqual(
      new Set(map.buildings.map((b) => b.id))
    );
    for (const b of map.buildings) {
      const spot = spots.find((s) => s.buildingId === b.id)!;
      expect(spot.type).toBe(b.type);
      expect(spot.x).toBe(b.x);
      expect(spot.y).toBe(b.y);
      expect(spot.level).toBe(b.level || 1);
      expect(spot.accumulated).toBe(b.accumulated || 0);
      expect(spot.townLotId).toBe(b.townLotId);
    }
    // The diner's waiting coins ride along exactly — 132.5, unmoved.
    expect(spots.find((s) => s.buildingId === "b-diner")!.accumulated).toBe(132.5);
  });

  it("deriving and planning never write back into the record", () => {
    const map = fixtureTownMap();
    const before = JSON.stringify(map);
    deriveWalkSpots(map);
    walkBlockedTiles(map);
    planWalkTo(map, { x: 5, y: 5 }, { x: 6, y: 0 });
    expect(JSON.stringify(map)).toBe(before);
  });

  it("the derivation is deterministic — mounting twice derives the same town", () => {
    const map = fixtureTownMap();
    expect(deriveWalkSpots(map)).toEqual(deriveWalkSpots(map));
    expect(walkBlockedTiles(map)).toEqual(walkBlockedTiles(map));
  });
});

describe("v290 (b) — no auto-collect: income waits in piles, balance untouched", () => {
  const NOW = 1_800_000_000_000;
  const NOW_ISO = new Date(NOW).toISOString();

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

  function churchTown(): TownState {
    // v291 re-base: the fixture church stands on the CITY map — Part
    // 2 retired the town map's building set (the café alone earns
    // there now), so the settle contract is pinned where a church
    // still earns. The arithmetic and the contract are unchanged.
    const town = emptyTownState();
    town.maps.city.buildings = [
      {
        id: "church-1",
        type: "church",
        x: 2,
        y: 2,
        level: 1,
        accumulated: 0,
        // RE-BASED (v343): the day model settles whole LOCAL days —
        // the anchor stands 30 hours back so at least one local day
        // has turned in any timezone the suite runs in.
        lastTick: new Date(NOW - 30 * 3600 * 1000).toISOString(),
      },
    ];
    town.lastIncomeDate = "2027-01-12";
    return town;
  }

  it("the settle grows the building's pile and nothing else — the record holds no balance", () => {
    const { town: out, rates } = accrueAwayIncome(churchTown(), inputs());
    const b = out.maps.city.buildings[0];
    // The coins are all still AT the building, waiting.
    expect(b.accumulated).toBeGreaterThan(0);
    // The accrual result carries no wallet for them to leak into.
    expect(Object.keys(rates)).toContain("church-1");
    expect(out).not.toHaveProperty("balance");
    expect(out).not.toHaveProperty("coins");
    const totalWaiting = Object.values(out.maps).reduce(
      (sum, m) => sum + m.buildings.reduce((s, bb) => s + (bb.accumulated || 0), 0),
      0
    );
    expect(totalWaiting).toBeCloseTo(b.accumulated!, 6);
  });

  it("the walkable layers contain no collect, coin, or storage path at all", () => {
    for (const rel of ["lib/walkable-town.ts", "components/walkable-town.tsx"]) {
      const src = read(rel);
      expect(src).not.toContain("addCoins");
      expect(src).not.toContain("applyCoinsDelta");
      expect(src).not.toContain("handleCollectBuilding");
      expect(src).not.toContain("setItem");
      expect(src).not.toContain("saveTown");
      expect(src).not.toContain("saveMap");
    }
    const pawn = read("components/player-pawn.tsx");
    expect(pawn).not.toContain("addCoins");
    expect(pawn).not.toContain("handleCollectBuilding");
  });

  it("the café's arrival collects NOTHING — walking up just opens it (RE-BASED v343)", () => {
    // RE-BASED (v343): the walk-up auto-collect this test pinned
    // since v291 was an audit defect — arriving somewhere is not
    // collecting. Collecting is by hand only: the pile's own tap
    // (handleCollectPilePress) and the buildings' collect buttons.
    // The café's street arrival now opens the café and nothing else.
    const src = read("app/hometown.tsx");
    const at = src.indexOf("const runStreetPlace");
    expect(at).toBeGreaterThan(-1);
    const block = src.slice(at, src.indexOf("const handleStreetPlacePress", at));
    const cafeAt = block.indexOf('case "cafe":');
    const mineAt = block.indexOf('case "mine":', cafeAt);
    const cafeCase = block.slice(cafeAt, mineAt);
    expect(cafeCase).toContain("handleTownLotBuildingPress(anchor)");
    expect(cafeCase).not.toContain("handleCollectBuilding");
    expect(cafeCase).not.toContain("collectPendingRegister");
    // The by-hand path still exists on the screen.
    expect(src).toContain("handleCollectPilePress");
  });
});

describe("v290 (c) — the café board is buildCafeBoard's own output, untouched by the walk", () => {
  const TODAY = "2026-10-21"; // a Wednesday
  const NOW = new Date(2026, 9, 21, 12, 0, 0);

  function person(over: Partial<Person> & { id: string; name: string }): Person {
    return {
      initials: over.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2),
      relationship: "Ministry",
      lastPrayedDate: null,
      reminderDaysOfWeek: [],
      accentColor: "#7C3AED",
      avatarColor: "#DDD6FE",
      prayerItems: [],
      ...over,
    };
  }
  function item(over: Partial<PrayerItem> & { id: string; title: string }): PrayerItem {
    return { isUrgent: false, isDone: false, ...over };
  }

  const people: Person[] = [
    person({
      id: "p-gabriel",
      name: "Gabriel Gutierrez",
      reminderDaysOfWeek: [3],
      prayerItems: [item({ id: "i-sick", title: "Sick", isUrgent: true })],
    }),
    person({
      id: "p-cody",
      name: "Cody",
      reminderDaysOfWeek: [3],
      prayerItems: [item({ id: "i-work", title: "Work" })],
    }),
  ];

  it("the board is identical before and after the walkable layer derives the town", () => {
    const before = buildCafeBoard(people, TODAY, NOW);
    expect(before.ordersTotal).toBe(2);
    expect(new Set(before.tickets.map((t) => t.personId))).toEqual(
      new Set(["p-gabriel", "p-cody"])
    );
    const peopleSnapshot = JSON.stringify(people);
    // Everything the walkable mount does with its day (v291: the
    // street derivation joins the Part 1 walk derivation):
    const map = fixtureTownMap();
    deriveWalkSpots(map);
    deriveStreetWorld(map);
    planWalkTo(map, { x: 5, y: 5 }, { x: 6, y: 0 });
    const after = buildCafeBoard(people, TODAY, NOW);
    expect(after).toEqual(before);
    expect(JSON.stringify(people)).toBe(peopleSnapshot);
  });

  it("the scene anchors on the same diner record the map's café anchor follows", () => {
    const map = fixtureTownMap();
    const anchor = cafeAnchorBuilding(map);
    expect(anchor?.id).toBe("b-diner");
    expect(anchor).toBe(map.buildings.find((b) => b.id === "b-diner"));
    // the walk derivation carries that same building by identity
    expect(deriveWalkSpots(map).some((s) => s.buildingId === anchor!.id)).toBe(true);
    // v291: the street derivation anchors its café on it too.
    expect(deriveStreetWorld(map).cafeBuildingId).toBe("b-diner");
  });
});

describe("v290 (d) — pathing reaches the door without crossing a footprint", () => {
  const map = fixtureTownMap();
  const blocked = walkBlockedTiles(map);

  function expectCleanRoute(tiles: { x: number; y: number }[]) {
    for (const t of tiles) {
      expect(isWalkableTile(blocked, t)).toBe(true);
    }
    for (let i = 1; i < tiles.length; i++) {
      const step =
        Math.abs(tiles[i].x - tiles[i - 1].x) + Math.abs(tiles[i].y - tiles[i - 1].y);
      expect(step).toBe(1); // a walked route: one tile at a time, no glides
    }
  }

  it("a tap on the diner's body lands the Hero at its doorstep", () => {
    const plan = planWalkTo(map, { x: 5, y: 5 }, { x: 6, y: 0 });
    expect(plan).not.toBeNull();
    expect(plan!.tiles[0]).toEqual({ x: 5, y: 5 });
    expectCleanRoute(plan!.tiles);
    // The goal stands on the diner's south doorstep (the lane side).
    expect(plan!.goal).toEqual({ x: 6, y: 2 });
    // And no route tile ever stands inside the diner (6..7, 0..1).
    for (const t of plan!.tiles) {
      expect(t.x >= 6 && t.x <= 7 && t.y >= 0 && t.y <= 1).toBe(false);
    }
  });

  it("a tap on the church crosses the whole town and stops at its door", () => {
    const plan = planWalkTo(map, { x: 5, y: 26 }, { x: 0, y: 0 });
    expect(plan).not.toBeNull();
    expectCleanRoute(plan!.tiles);
    const goal = plan!.goal;
    // Adjacent to the church footprint (0..1, 0..1), never inside it.
    const touchesChurch =
      (goal.y === 2 && goal.x >= 0 && goal.x <= 1) ||
      (goal.x === 2 && goal.y >= 0 && goal.y <= 1);
    expect(touchesChurch).toBe(true);
  });

  it("open ground is walked to directly, and the stream is never crossed off-bridge", () => {
    const plan = planWalkTo(map, { x: 0, y: 5 }, { x: 0, y: 16 });
    expect(plan).not.toBeNull();
    expect(plan!.goal).toEqual({ x: 0, y: 16 });
    expectCleanRoute(plan!.tiles);
    const direct = findWalkPath(blocked, { x: 0, y: 2 }, { x: 9, y: 2 });
    expect(direct).not.toBeNull();
    expectCleanRoute(direct!);
  });
});

describe("v290 — the mount: the town wears the walkable shell, the other maps don't change", () => {
  const src = read("app/hometown.tsx");

  it("the shell wraps the map only for the town; the street subtree carries the presses", () => {
    // v291 re-base (the v290 device verdict — "nothing is really
    // tappable"): the shell is the camera ONLY now. Its v290 ground
    // Pressable was a sibling under the map subtree — outside every
    // tap's ancestor chain, unreachable on device. The presses live
    // inside the street subtree (components/wide-street), each
    // element's own Pressable above its art.
    expect(src).toContain("<WalkableTownShell");
    expect(src).toContain('enabled={activeMap === "town"}');
    expect(src).toContain("followNonce={walkNonce}");
    expect(src).not.toContain("onTapWorld={handleWalkTapWorld}");
    expect(src).toContain("<StreetWorldView");
    expect(src).toContain("onGroundPress={handleWalkTapWorld}");
    expect(src).toContain("onPlacePress={handleStreetPlacePress}");
    expect(src).toContain("onCollectPile={handleCollectPilePress}");
  });

  it("the Hero takes commands, reports his position, and says when he's ready", () => {
    expect(src).toContain("commandPath={walkCmd}");
    expect(src).toContain("onCommandArrive={handleCommandArrive}");
    expect(src).toContain("positionRef={heroPosRef}");
    const pawn = read("components/player-pawn.tsx");
    expect(pawn).toContain("commandPath");
    expect(pawn).toContain("walkWaypointsRef");
    // commands walk the planned tiles, not the road-only path
    expect(pawn).toContain("commandPath.tiles.map");
  });

  it("villager taps carry where the villager stands, and the town walks to them", () => {
    const npcs = read("components/town-npcs.tsx");
    expect(npcs).toContain("tile: { x: Math.floor(npc.px / cellSize), y: Math.floor(npc.py / cellSize) }");
    expect(src).toContain("onVillagerTap={handleVillagerTapWalk}");
    expect(src).toContain("dispatchWalkTo(p.tile, () => handleVillagerTap(p))");
  });

  it("walking never swallows a tap: the fallbacks run the action immediately", () => {
    const at = src.indexOf("const dispatchWalkTo");
    const block = src.slice(at, src.indexOf("const tileFromWorldPx", at));
    expect(block).toContain("isNight || !heroReadyRef.current || movingBuilding");
    expect(block).toContain("action();");
    // the watchdog guarantees a lost arrival still lands the action
    expect(block).toContain("walkWatchdogRef");
    expect(block).toContain("firePendingWalk(seq)");
  });

  it("the mine stays a door: a place at the street's end, opening the cave mouth", () => {
    // v291 re-base: the above-map peak banner retired with the old
    // grid; the Mine is a place ON the street whose arrival opens
    // the same cave mouth (the mine's own screens, mechanics
    // untouched — wide-street-v291 (c)).
    expect(src).not.toContain("handlePeakPress");
    const at = src.indexOf("const runStreetPlace");
    const block = src.slice(at, src.indexOf("const handleStreetPlacePress", at));
    expect(block).toContain('router.push("/mine-mouth")');
    expect(deriveStreetWorld(fixtureTownMap()).places.some((p) => p.kind === "mine")).toBe(true);
  });
});
