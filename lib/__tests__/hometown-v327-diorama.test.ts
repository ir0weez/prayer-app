// ─────────────────────────────────────────────────────────────────────────────
// v327 — The Hometown Rebuild: the Diorama composition. Pins.
//
// Jonathan rejected the town's look three times; the last time
// (2026-10-28 22:27, screenshot 10882) the shot showed one giant
// building front filling half the frame, a wide empty street slab,
// villagers tiny and distant, and "Town Sh…" truncated. Eva drew
// three compositions; he approved Concept 2 — The Diorama
// (hometown-street-concepts-v1.html) on 2026-10-28 22:45 ("Go
// ahead I trust you"), with Concept 3's gathering corner borrowed
// into it: where the street bends, it widens around the Missions
// board so his people stand visibly together.
//
// v327 replaces the COMPOSITION ONLY: the derivation in
// lib/wide-street and the street's rendering. Mechanics, the
// migration, the café economy, the HUD and the era system are
// untouched (v291/v292/v323 pins hold those lines).
//
// Contracts pinned here:
//  (a) LANDMARKS — the Diorama's geography exists in the derived
//      world: river at the bottom-left (blocked water), forest
//      edge at the west, the mine in its hill at the north run's
//      east end, plots at two depths, the board mid-lane at the
//      bend with its gathering corner.
//  (b) SCALE — no building stands taller than ~30% of the world
//      height; every place keeps the three-tile stature.
//  (c) REACH — from the café door, a clean route reaches every
//      place's door, the corner included, crossing no footprint.
//  (d) LABELS — the named places carry their whole words, and no
//      label in the street's components carries a line limit that
//      could clip one to an ellipsis.
//  (e) THE PILE — a save with coins waiting at the café renders
//      the pile at the café in the new layout, the exact amount.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  emptyTownState,
  type MapState,
  type PlacedBuilding,
  type TownState,
} from "@/lib/hometown";
import {
  deriveStreetWorld,
  dioramaCenterY,
  isStreetWalkable,
  planStreetWalk,
  RIVER_RECTS,
  STREET_H,
  type StreetWorld,
} from "@/lib/wide-street";

const ROOT = join(__dirname, "..", "..");
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function b(over: Partial<PlacedBuilding> & { id: string; type: PlacedBuilding["type"] }): PlacedBuilding {
  return { x: 0, y: 0, level: 1, accumulated: 0, ...over };
}

/** The v291 (e) fixture town: a diner, his house, four homes, a
 *  retired shop — enough cast for both depths to show. */
function fixtureMap(): MapState {
  return {
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
}

const world: StreetWorld = deriveStreetWorld(fixtureMap());
const byKind = (kind: string) => world.places.filter((p) => p.kind === kind);

describe("v327 (a) — the Diorama's landmarks stand in the derived world", () => {
  it("the river holds the bottom-left corner, and its water is blocked ground", () => {
    for (const r of RIVER_RECTS) {
      expect(r.x).toBe(0);
      expect(r.y + r.h).toBe(STREET_H); // flush with the world's foot
    }
    for (const r of RIVER_RECTS) {
      for (let dx = 0; dx < r.w; dx++) {
        for (let dy = 0; dy < r.h; dy++) {
          expect(world.blocked.has(`${r.x + dx},${r.y + dy}`)).toBe(true);
          expect(isStreetWalkable(world, { x: r.x + dx, y: r.y + dy })).toBe(false);
        }
      }
    }
    // The drawing the street view renders and the pathing agree:
    // the renderer draws RIVER_RECTS itself.
    expect(read("components/wide-street.tsx")).toContain("RIVER_RECTS.map");
  });

  it("the forest edge closes the west, standing over the river corner", () => {
    const forest = byKind("forest")[0];
    expect(forest.x).toBe(0);
    expect(forest.y).toBe(0);
    expect(forest.h).toBe(world.h - 2); // down to the river's bank
    expect(forest.door.x).toBe(forest.w); // its door on the lane's first column
    expect(isStreetWalkable(world, forest.door)).toBe(true);
  });

  it("the mine stands in its hill at the north run's east end", () => {
    const mine = byKind("mine")[0];
    expect(mine.y).toBe(0); // the hill rises into the skyline row
    const northKinds = ["house", "home", "gate"];
    const eastOfNorth = Math.max(
      ...world.places.filter((p) => northKinds.includes(p.kind) && p.door.y <= 5).map((p) => p.x + p.w),
      0
    );
    expect(mine.x).toBeGreaterThanOrEqual(eastOfNorth - 1);
    expect(mine.door.y).toBe(3); // its doorstep on the lane's high reach
    expect(isStreetWalkable(world, mine.door)).toBe(true);
  });

  it("plots stand at two depths — front on the lane, back behind a yard", () => {
    const depths = new Set(world.places.map((p) => p.depth));
    expect(depths).toContain("front");
    expect(depths).toContain("back");
    // His house stands back, first on the north run, as drawn.
    const house = byKind("house")[0];
    expect(house.depth).toBe("back");
    // A back plot's yard is real: its plot is deeper than its
    // footprint, its door stands off the lane on its spur, and
    // every spur tile is street the hero can walk.
    for (const p of world.places.filter((q) => q.depth === "back")) {
      expect(p.plot.h).toBeGreaterThan(p.h);
      expect(p.spur.length).toBeGreaterThan(1);
      for (const t of p.spur) expect(isStreetWalkable(world, t)).toBe(true);
    }
    // A front plot's door stands on the band itself. (The forest
    // and the mine are landmarks standing off the lane — their
    // doors are reached by their own short spurs.)
    for (const p of world.places.filter(
      (q) => q.depth === "front" && !["forest", "board", "mine"].includes(q.kind)
    )) {
      const [top, bottom] = [dioramaCenterY(p.door.x, world.w) - 1, dioramaCenterY(p.door.x, world.w) + 2];
      expect(p.door.y).toBeGreaterThanOrEqual(top);
      expect(p.door.y).toBeLessThanOrEqual(bottom);
    }
  });

  it("the board stands mid-lane at the bend; its corner is open street at its feet", () => {
    const board = world.board!;
    expect(board).not.toBeNull();
    expect(board.kind).toBe("board");
    // Mid-lane: the board's row is one of the band's street rows.
    const c = dioramaCenterY(board.x, world.w);
    expect(board.y).toBe(c);
    // Its feet are solid — nobody walks through the board.
    expect(world.blocked.has(`${board.x},${board.y}`)).toBe(true);
    // The corner: one row at the board's feet, six tiles, all
    // walkable, all on the road network (his people stand there).
    const corner = world.corner;
    expect(corner.y).toBe(board.y + 3);
    expect(corner.w).toBe(6);
    for (let dx = 0; dx < corner.w; dx++) {
      const t = { x: corner.x + dx, y: corner.y };
      expect(isStreetWalkable(world, t)).toBe(true);
      expect(world.roads).toContainEqual(t);
    }
    // The board's doorstep is a corner tile.
    expect(board.door.y).toBe(corner.y);
    expect(board.door.x).toBeGreaterThanOrEqual(corner.x);
    expect(board.door.x).toBeLessThan(corner.x + corner.w);
  });

  it("the lane climbs: its centreline runs from the river end (9) to the mine end (4)", () => {
    expect(dioramaCenterY(3, world.w)).toBe(9);
    expect(dioramaCenterY(world.w - 1, world.w)).toBe(4);
    // …and never steps more than the band can follow.
    for (let x = 4; x < world.w; x++) {
      expect(Math.abs(dioramaCenterY(x, world.w) - dioramaCenterY(x - 1, world.w))).toBeLessThanOrEqual(1);
    }
  });
});

describe("v327 (b) — scale: nothing towers", () => {
  it("every building place keeps the three-tile stature — under 30% of the world's height", () => {
    for (const p of world.places) {
      if (p.kind === "forest" || p.kind === "board") continue;
      expect(p.h).toBe(3);
      expect(p.h / world.h).toBeLessThan(0.3);
    }
    expect(world.h).toBe(STREET_H);
    expect(STREET_H).toBe(16);
  });
});

describe("v327 (c) — from the café door, every door is reached on foot", () => {
  it("a clean route reaches every place's door, the board's corner included", () => {
    const start = world.cafe!.door;
    for (const p of world.places) {
      const plan = planStreetWalk(world, start, p.door);
      expect(plan, `route to ${p.kind}`).not.toBeNull();
      expect(plan!.goal).toEqual(p.door);
      for (const t of plan!.tiles) {
        expect(world.blocked.has(`${t.x},${t.y}`)).toBe(false);
      }
    }
  });

  it("the road network is one connected ground (the pawn's stroll can roam it)", () => {
    const roadKeys = new Set(world.roads.map((t) => `${t.x},${t.y}`));
    const start = world.roads[0];
    const seen = new Set<string>([`${start.x},${start.y}`]);
    const queue = [start];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const n = { x: cur.x + dx, y: cur.y + dy };
        const k = `${n.x},${n.y}`;
        if (!roadKeys.has(k) || seen.has(k)) continue;
        seen.add(k);
        queue.push(n);
      }
    }
    expect(seen.size).toBe(roadKeys.size);
  });
});

describe("v327 (d) — labels: the whole word, always", () => {
  it("the named places carry their whole words", () => {
    expect(world.cafe!.plaque).toBe("Café");
    expect(byKind("house")[0].plaque).toBe("His House");
    expect(byKind("mine")[0].plaque).toBe("The Mine");
    expect(world.board!.label).toBe("Missions");
    for (const g of byKind("gate")) {
      expect(g.plaque).toBe(g.landmark!.name);
      expect(g.plaque!.length).toBeGreaterThan(0);
    }
    // The full set of words the town must never clip again.
    const words = world.places.map((p) => p.plaque).filter(Boolean);
    expect(words).toContain("Café");
    expect(words).toContain("His House");
    expect(words).toContain("The Mine");
  });

  it("the shop stall's word is a point label, spoken whole by its component", () => {
    const points = read("components/street-world-points.tsx");
    expect(points).toContain('label="Town Shop"');
    // No label in the points file carries a line limit — a label
    // may wrap inside its pill; it may never be cut to "Town Sh…".
    expect(points).not.toContain("numberOfLines");
  });

  it("the street's plaques carry no line limit either, and size by their text", () => {
    const street = read("components/wide-street.tsx");
    const plaqueAt = street.indexOf("function PlacePlaque");
    const plaque = street.slice(plaqueAt, street.indexOf("export const StreetWorldView", plaqueAt));
    expect(plaque).not.toContain("numberOfLines");
    // the v307 fence: the plaque rides a 200px centred strip
    expect(plaque).toContain("width: 200");
    expect(street).toContain("<PlacePlaque");
  });

  it("the points' stands fit their longest labels with slack (the v323 pattern, completed)", () => {
    const points = read("components/street-world-points.tsx");
    // "12 missions" / "Town Shop" / "12 testimonies" at 9.5px bold
    // plus the chip's padding — the v323 stands (76/64/84) still
    // clipped "Town Shop"; these leave room to spare.
    expect(points).toContain("export const NOTICE_BOARD_W = 92;");
    expect(points).toContain("export const SHOP_STALL_W = 84;");
    expect(points).toContain("export const TESTIMONY_STONES_W = 104;");
  });
});

describe("v327 (e) — a save with waiting coins renders its pile at the café", () => {
  it("the pile waits at the café place in the new layout, the exact amount", () => {
    const town: TownState = emptyTownState();
    town.maps.town.buildings = [
      b({ id: "diner-a", type: "diner", x: 6, y: 0, level: 3, accumulated: 275 }),
      b({ id: "home-1", type: "pawn-house", x: 4, y: 6 }),
    ];
    const w2 = deriveStreetWorld(town.maps.town, { pendingRegister: 0 });
    expect(w2.cafe).not.toBeNull();
    expect(w2.cafePile).toBe(275);
    expect(w2.cafeBuildingId).toBe("diner-a");
    // The pile renders at the café's door in the street view.
    const street = read("components/wide-street.tsx");
    expect(street).toContain("cafe.door.x * cs - 22");
    expect(street).toContain("world.cafePile > 0");
  });

  it("the era dress still reaches the recomposed street (v323's wiring, unbroken)", () => {
    const street = read("components/wide-street.tsx");
    expect(street).toContain("eraGroundFor(era, phase)");
    expect(street).toContain("era?.palette.river");
    expect(street).toContain("era?.palette.rain");
    expect(street).toContain("era?.palette.torn");
    expect(street).toContain("dress={dress}");
    // The centreline is shared: the view draws the lane the
    // derivation laid out (one street, never two).
    expect(street).toContain("dioramaCenterY");
  });
});
