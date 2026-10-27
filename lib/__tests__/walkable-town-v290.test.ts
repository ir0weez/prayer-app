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
    const town = emptyTownState();
    town.maps.town.buildings = [
      {
        id: "church-1",
        type: "church",
        x: 2,
        y: 2,
        level: 1,
        accumulated: 0,
        lastTick: new Date(NOW - 5 * 60000).toISOString(),
      },
    ];
    town.lastIncomeDate = "2027-01-12";
    return town;
  }

  it("the settle grows the building's pile and nothing else — the record holds no balance", () => {
    const { town: out, rates } = accrueAwayIncome(churchTown(), inputs());
    const b = out.maps.town.buildings[0];
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

  it("the one new collect trigger is in person: walk up, then the existing collect fires before the building opens", () => {
    const src = read("app/hometown.tsx");
    const tapAt = src.indexOf("const handleWalkTapWorld");
    expect(tapAt).toBeGreaterThan(-1);
    const block = src.slice(tapAt, src.indexOf("const handleWalkLongPressWorld", tapAt));
    const collectAt = block.indexOf("handleCollectBuilding(building.id)");
    const pressAt = block.indexOf("handleTilePress(x, y)");
    expect(collectAt).toBeGreaterThan(-1);
    expect(pressAt).toBeGreaterThan(collectAt);
    // And it only fires for a building actually holding a pile — the
    // guard rides in the same block.
    expect(block).toContain("(building.accumulated || 0) > 0");
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
    // Everything the walkable mount does with its day:
    const map = fixtureTownMap();
    deriveWalkSpots(map);
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

  it("the shell wraps the map only for the town, fed by the walk handlers", () => {
    expect(src).toContain("<WalkableTownShell");
    expect(src).toContain('enabled={activeMap === "town"}');
    expect(src).toContain("onTapWorld={handleWalkTapWorld}");
    expect(src).toContain("onLongPressWorld={handleWalkLongPressWorld}");
    expect(src).toContain("followNonce={walkNonce}");
    // the ground cells go quiet on the town — the shell hears the taps
    expect(src).toContain('pointerEvents={activeMap === "town" ? "none" : "auto"}');
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

  it("the mine stays a door: the peak sends the Hero up the lane, then opens the cave mouth", () => {
    expect(src).toContain("onPress={handlePeakPress}");
    expect(src).toContain('dispatchWalkTo({ x: 4, y: 2 }, () => router.push("/mine-mouth"))');
  });
});
