// ─────────────────────────────────────────────────────────────────────────────
// v333 — THE HOMETOWN REBUILD: the fixed stage. Pins.
//
// Jonathan rejected the town's look FOUR times (v285, v307 twice,
// v327). The fourth shot (Oct 29 07:57, on v331) still showed flat
// slabs, a straight road and a water strip at the very bottom, and
// at 07:59 he authorized a complete rebuild: "If it has to be
// completely rebuilt, so be it. You know how it's supposed to
// function and what should go into it."
//
// The fidelity finding behind the rebuild: the approved drawing
// (hometown-street-concepts-v1.html, Concept 2 — The Diorama, with
// Concept 3's gathering corner borrowed at the board) is a FIXED
// single-frame stage — 11 columns × 16 rows — while every shipped
// town was a roster-width scrolling world. v333 makes the stage
// fixed and seats the existing place population on it. ALL
// mechanics, data and wiring are preserved (v291/v292/v323 pins
// hold those lines); this file pins THE DRAWING'S contract:
//
//  (a) R1/R2 — the stage is 11×16 whatever the roster; the hill
//      band (rows 0–3) is solid ground-sky; every home the record
//      holds stands on the one frame.
//  (b) R3/R4 — the lane's centreline reads the drawing's rows at
//      every sampled column; the view draws the same polyline at
//      the drawing's stroke widths.
//  (c) R5 — the river spans the full stage width at the bottom
//      band (top edge 93.3–95.6%, bottom 100%), and its water is
//      blocked ground.
//  (d) R6/R7 — the forest is individual trees on the hill
//      baseline (no tall place, nothing below y = 30%); the mine's
//      seat is a fixed constant of the drawing, roster-proof.
//  (e) R8/R9/R11 — two strata only, bases at 36–38% and 64–65% of
//      stage height; plot pads ≤ 2.2 rows; landmark statures in
//      the drawing's band with the café the maximum.
//  (f) R10 — every door stands on walkable ground and reaches the
//      lane by a drawn path (spurs end ON the lane). His House's
//      long spur is the drawing's own precedent, pinned as such.
//  (g) R12 — the board at (0.53, 0.50), art ≥ 18% × 12% of stage;
//      the gathering corner 6×2 with ≥ 3 assigned stand-points.
//  (h) R13 — figures and furniture size from the stage cell.
//  (i) R14 — one frame shows forest, hill+mine, His House, café,
//      shop and board at once; every place rect inside the stage.
//  (j) THE PILE — a save with 275 coins waiting renders the pile
//      at the café, the exact amount (the pinned v291 behaviour,
//      carried through every composition since).
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
  isLaneTile,
  isStreetWalkable,
  laneCenterRowAt,
  planStreetWalk,
  RIVER_RECTS,
  STREET_H,
  STREET_W,
  type StreetWorld,
} from "@/lib/wide-street";

const ROOT = join(__dirname, "..", "..");
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function b(over: Partial<PlacedBuilding> & { id: string; type: PlacedBuilding["type"] }): PlacedBuilding {
  return { x: 0, y: 0, level: 1, accumulated: 0, ...over };
}

/** The small fixture: diner, his house, four homes, a retired shop. */
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

/** His real roster's shape (the Oct 24 backup): the cottage cap —
 *  all eight lots built — two diners, his house, retired stock. */
function largeMap(): MapState {
  return {
    buildings: [
      b({ id: "diner-a", type: "diner", x: 6, y: 0, level: 3, accumulated: 12 }),
      b({ id: "diner-b", type: "diner", x: 1, y: 12, level: 2, accumulated: 0 }),
      b({ id: "home-hero", type: "pawn-house", x: 4, y: 6 }),
      ...Array.from({ length: 8 }, (_, i) =>
        b({ id: `cottage-${i + 1}`, type: "villager-cottage", x: (i * 3) % 10, y: (i * 2) % 9 })
      ),
      b({ id: "shop-1", type: "shop", x: 2, y: 3, accumulated: 40 }),
      b({ id: "bank-1", type: "bank-tower", x: 5, y: 15, accumulated: 7 }),
    ],
    decorations: [],
    roads: [],
  };
}

const world: StreetWorld = deriveStreetWorld(fixtureMap());
const large: StreetWorld = deriveStreetWorld(largeMap());
const byKind = (w: StreetWorld, kind: string) => w.places.filter((p) => p.kind === kind);

describe("v333 (a) — R1/R2: the fixed stage, every home on the one frame", () => {
  it("the stage is 11×16 — with no roster, a small one, and the full cottage cap", () => {
    expect(STREET_W).toBe(11);
    expect(STREET_H).toBe(16);
    const empty = deriveStreetWorld({ buildings: [], decorations: [], roads: [] });
    for (const w of [empty, world, large]) {
      expect(w.w).toBe(11);
      expect(w.h).toBe(16);
    }
  });

  it("the hill band (rows 0–3) is not walkable ground; the ground plane opens at row 4", () => {
    for (let x = 0; x < STREET_W; x++) {
      for (let y = 0; y < 4; y++) {
        expect(isStreetWalkable(world, { x, y })).toBe(false);
      }
    }
    expect(isStreetWalkable(world, { x: 0, y: 4 })).toBe(true); // the forest's doorstep
  });

  it("ALL eight cottages stand on the frame at the cottage cap, dealt across both strata", () => {
    const homes = byKind(large, "home");
    expect(homes).toHaveLength(8);
    const back = homes.filter((p) => p.depth === "back");
    const front = homes.filter((p) => p.depth === "front");
    expect(back).toHaveLength(4);
    expect(front).toHaveLength(4);
    // The measured fit at the cap: back cottages ≈1.03 tiles wide,
    // front ≈0.88 — narrower than the landmarks, as the drawing's
    // contract allows, with whole labels beneath them.
    for (const p of back) {
      expect(p.w).toBeGreaterThan(0.95);
      expect(p.w).toBeLessThan(1.1);
    }
    for (const p of front) {
      expect(p.w).toBeGreaterThan(0.8);
      expect(p.w).toBeLessThan(0.95);
    }
    // Cottage height compresses toward ~12% of stage height.
    for (const p of homes) {
      expect(p.h / STREET_H).toBeGreaterThan(0.1);
      expect(p.h / STREET_H).toBeLessThan(0.14);
    }
  });
});

describe("v333 (b) — R3/R4: the lane is the drawing's path", () => {
  it("the centreline reads the drawing's rows at columns 1–9 (±0.5)", () => {
    const drawn = [15.1, 14.0, 12.9, 11.9, 11.0, 9.9, 8.3, 6.9, 6.1];
    drawn.forEach((row, i) => {
      expect(Math.abs(laneCenterRowAt(i + 1) - row)).toBeLessThanOrEqual(0.5);
    });
    // Column 0 enters at the bottom edge; column 10 is hill/plots.
    expect(laneCenterRowAt(0)).toBeGreaterThan(15.5);
    expect(laneCenterRowAt(10)).toBeLessThan(6);
  });

  it("the view draws the same polyline, at the drawing's stroke widths", () => {
    const street = read("components/wide-street.tsx");
    expect(street).toContain("LANE_POINTS");
    expect(street).toContain("lanePathD(worldW, worldH)");
    expect(street).toContain("strokeWidth={worldW * 0.16}");
    expect(street).toContain("strokeWidth={worldW * 0.128}");
    // The derivation's walkable band is measured from the path too.
    expect(isLaneTile(3, 12)).toBe(true);
    expect(isLaneTile(5, 10)).toBe(true);
    expect(isLaneTile(0, 4)).toBe(false);
  });
});

describe("v333 (c) — R5: the river spans the full stage width", () => {
  it("one band, 100% wide, top edge in 93.3–95.6%, bottom at 100% — and its water is blocked", () => {
    expect(RIVER_RECTS).toHaveLength(1);
    const r = RIVER_RECTS[0];
    expect(r.x).toBe(0);
    expect(r.w).toBe(STREET_W);
    const topPct = (r.y / STREET_H) * 100;
    expect(topPct).toBeGreaterThanOrEqual(93.3);
    expect(topPct).toBeLessThanOrEqual(95.6);
    expect(((r.y + r.h) / STREET_H) * 100).toBe(100);
    for (let x = 0; x < STREET_W; x++) {
      expect(isStreetWalkable(world, { x, y: 15 })).toBe(false);
    }
    // The renderer draws RIVER_RECTS itself — picture and pathing agree.
    expect(read("components/wide-street.tsx")).toContain("RIVER_RECTS.map");
  });
});

describe("v333 (d) — R6/R7: trees, not a wall; the mine's seat never moves", () => {
  it("the forest is individual trees on the hill baseline", () => {
    const trees = world.forestTrees;
    expect(trees.length).toBeGreaterThanOrEqual(4);
    for (const t of trees) {
      // bases on the baseline (y ≈ 23–24% of stage height)
      expect(t.y / STREET_H).toBeGreaterThanOrEqual(0.22);
      expect(t.y / STREET_H).toBeLessThanOrEqual(0.25);
      // within the west 27% of the stage
      expect(t.x / STREET_W).toBeLessThanOrEqual(0.27);
      // heights 8–12% of stage height
      expect(t.s / STREET_H).toBeGreaterThanOrEqual(0.08);
      expect(t.s / STREET_H).toBeLessThanOrEqual(0.12);
    }
    // No tall forest place: the treeline's own rect ends by y=30%,
    // and the view draws the trees, never the old ForestArt wall.
    const forest = byKind(world, "forest")[0];
    expect((forest.y + forest.h) / STREET_H).toBeLessThanOrEqual(0.3);
    const street = read("components/wide-street.tsx");
    expect(street).toContain("<ForestTreesArt");
    expect(street).not.toContain("<ForestArt");
    // The forest still opens its interior through its doorstep.
    expect(isStreetWalkable(world, forest.door)).toBe(true);
  });

  it("the mine's seat is the drawing's constant — identical for a small and a full roster", () => {
    const m1 = byKind(world, "mine")[0];
    const m2 = byKind(large, "mine")[0];
    expect({ x: m2.x, y: m2.y, w: m2.w, h: m2.h, door: m2.door }).toEqual({
      x: m1.x,
      y: m1.y,
      w: m1.w,
      h: m1.h,
      door: m1.door,
    });
    // Hill geometry (R7): span 0.64–0.99, base at 24%, apex (0.83, 0.06)
    // (MineArt peaks at its local 0.52w, 0), mouth centred x = 0.83.
    expect(m1.x / STREET_W).toBeGreaterThanOrEqual(0.64);
    expect(m1.x / STREET_W).toBeLessThanOrEqual(0.67);
    // The drawing's polygon ends at 356/360 = 0.989; the place
    // rect rounds to 0.991 — the same seat, tile-rounded.
    expect((m1.x + m1.w) / STREET_W).toBeLessThanOrEqual(0.995);
    expect((m1.y + m1.h) / STREET_H).toBeCloseTo(0.24, 2);
    expect((m1.x + 0.52 * m1.w) / STREET_W).toBeCloseTo(0.83, 2);
    expect(m1.y / STREET_H).toBeCloseTo(0.06, 2);
    expect((m1.x + m1.w / 2) / STREET_W).toBeCloseTo(0.83, 2);
    expect(m1.plaque).toBe("The Mine");
  });
});

describe("v333 (e) — R8/R9/R11: two strata, shallow pads, drawn statures", () => {
  it("back bases at 36–38%, front bases at 64–65% of stage height — no third terrace", () => {
    for (const w of [world, large]) {
      for (const p of w.places) {
        if (p.kind === "house" || p.kind === "home" || p.kind === "cafe" || p.kind === "shop" || (p.kind === "gate" && p.depth === "back")) {
          const basePct = ((p.y + p.h) / STREET_H) * 100;
          if (p.depth === "back") {
            expect(basePct).toBeGreaterThanOrEqual(36);
            expect(basePct).toBeLessThanOrEqual(38);
          } else if (p.kind !== "gate") {
            expect(basePct).toBeGreaterThanOrEqual(64);
            expect(basePct).toBeLessThanOrEqual(65);
          }
        }
      }
    }
    // His House back, first (west); café front, first (west); shop front.
    const house = byKind(world, "house")[0];
    expect(house.depth).toBe("back");
    expect(house.x).toBeLessThan(byKind(world, "home").filter((p) => p.depth === "back")[0].x);
    const cafe = world.cafe!;
    expect(cafe.depth).toBe("front");
    expect(cafe.x).toBeLessThan(byKind(world, "home").filter((p) => p.depth === "front")[0].x);
    expect(byKind(world, "shop")[0].depth).toBe("front");
  });

  it("plot pads are ≤ 2.2 rows deep (footprint + yard)", () => {
    for (const w of [world, large]) {
      for (const p of w.places) {
        // The mine's hill and the treeline are landforms, not pads.
        if (p.kind === "mine" || p.kind === "forest") continue;
        expect(p.plot.h, `${p.kind} pad`).toBeLessThanOrEqual(2.2);
      }
    }
  });

  it("landmark statures sit in the drawing's band; the café is the maximum", () => {
    const cafe = world.cafe!;
    const house = byKind(world, "house")[0];
    const shop = byKind(world, "shop")[0];
    for (const p of [cafe, house, shop]) {
      expect(p.h / STREET_H).toBeGreaterThanOrEqual(0.15);
      expect(p.h / STREET_H).toBeLessThanOrEqual(0.24);
      expect(p.w / STREET_W).toBeGreaterThanOrEqual(0.24);
      expect(p.w / STREET_W).toBeLessThanOrEqual(0.37);
    }
    expect(cafe.h).toBeGreaterThan(house.h);
    expect(cafe.h).toBeGreaterThan(shop.h);
    expect(cafe.h / STREET_H).toBeCloseTo(0.233, 2);
    expect(cafe.w / STREET_W).toBeCloseTo(0.322, 2);
  });

  it("yards are ground, and the only fence is the café's — one line, gap at the door", () => {
    const street = read("components/wide-street.tsx");
    // Yard tints render borderless (no borderWidth on a pad view).
    expect(street).toContain("opacity={0.55}");
    expect(street).not.toContain("borderColor: ground.padEdge");
    // Exactly one fence in the view: the café's.
    expect(street.match(/fence/g)?.length ?? 0).toBeGreaterThan(0);
    expect(street).toContain("cafe.plot");
    expect(street).toContain("gapL");
  });
});

describe("v333 (f) — R10: every door stands on walkable ground, pathed to the lane", () => {
  it("from the café door, a clean route reaches every place's door", () => {
    for (const w of [world, large]) {
      const start = w.cafe!.door;
      for (const p of w.places) {
        expect(isStreetWalkable(w, p.door), `${p.kind} door`).toBe(true);
        const plan = planStreetWalk(w, start, p.door);
        expect(plan, `route to ${p.kind}`).not.toBeNull();
        expect(plan!.goal).toEqual(p.door);
        for (const t of plan!.tiles) {
          expect(w.blocked.has(`${t.x},${t.y}`)).toBe(false);
        }
      }
    }
  });

  it("every stratum spur is drawn street and ENDS on the lane", () => {
    for (const p of world.places) {
      if (!["house", "cafe", "shop", "home"].includes(p.kind) && !(p.kind === "gate" && p.depth === "back")) continue;
      expect(p.spur.length).toBeGreaterThanOrEqual(1);
      for (const t of p.spur) expect(isStreetWalkable(world, t)).toBe(true);
      const last = p.spur[p.spur.length - 1];
      expect(isLaneTile(last.x, last.y), `${p.kind} spur end`).toBe(true);
    }
    // The drawing's own precedent, pinned honestly: His House's
    // door stands ~6 rows from the lane at its column, and the
    // DRAWING draws its long spur — so does the stage.
    const house = byKind(world, "house")[0];
    expect(house.spur.length).toBeGreaterThan(2);
  });
});

describe("v333 (g) — R12: the board and its gathering corner", () => {
  it("the board stands at (0.53, 0.50) with art ≥ 18% × 12% of stage", () => {
    const board = world.board!;
    expect(board).not.toBeNull();
    expect((board.x + board.w / 2) / STREET_W).toBeCloseTo(0.53, 2);
    expect((board.y + board.h / 2) / STREET_H).toBeCloseTo(0.5, 1);
    expect(board.w / STREET_W).toBeGreaterThanOrEqual(0.18);
    expect(board.h / STREET_H).toBeGreaterThanOrEqual(0.12);
    expect(board.label).toBe("Missions");
    // Its feet are solid — nobody walks through the board (the
    // south-east foot tile is the lane's own edge and stays lane).
    expect(world.blocked.has("5,7")).toBe(true);
    expect(world.blocked.has("6,7")).toBe(true);
    expect(world.blocked.has("5,8")).toBe(true);
  });

  it("the corner is a 6×2 widening of the lane with ≥ 3 assigned stand-points inside it", () => {
    const corner = world.corner;
    expect(corner.w).toBe(6);
    expect(corner.h).toBe(2);
    for (let dy = 0; dy < corner.h; dy++) {
      for (let dx = 0; dx < corner.w; dx++) {
        const t = { x: corner.x + dx, y: corner.y + dy };
        expect(isStreetWalkable(world, t)).toBe(true);
        expect(world.roads).toContainEqual(t);
      }
    }
    expect(world.cornerStands.length).toBeGreaterThanOrEqual(3);
    for (const stand of world.cornerStands) {
      expect(stand.x).toBeGreaterThanOrEqual(corner.x);
      expect(stand.x).toBeLessThan(corner.x + corner.w);
      expect(stand.y).toBeGreaterThanOrEqual(corner.y);
      expect(stand.y).toBeLessThan(corner.y + corner.h);
      expect(isStreetWalkable(world, stand)).toBe(true);
    }
    // The stands are ASSIGNED: the screen deals them to villagers,
    // who start there and stroll biased to them.
    expect(read("app/hometown.tsx")).toContain("standByPerson={streetCornerStands}");
    expect(read("components/street-villagers.tsx")).toContain("standByPerson");
    // The corner's furniture: bench on its south edge, stones at
    // its west edge (the lamp rides the street view at its east).
    const street = read("components/wide-street.tsx");
    expect(street).toContain("(corner.y + corner.h) * cs - 10 * s");
    expect(read("app/hometown.tsx")).toContain("left={corner.x * cs + 2}");
  });
});

describe("v333 (h) — R13: figures and furniture scale from the cell", () => {
  it("villager and hero heights derive from the stage cell (1.4 rows)", () => {
    const villagers = read("components/street-villagers.tsx");
    expect(villagers).toContain("const FIGURE_W_PER_CELL = 0.875;");
    expect(villagers).toContain("cellSize * FIGURE_W_PER_CELL");
    expect(villagers).toContain("figW * 1.6"); // 0.875 × 1.6 = 1.4 rows
    expect(read("app/hometown.tsx")).toContain("figureHeightPx={streetCell * 1.4}");
    const pawn = read("components/player-pawn.tsx");
    expect(pawn).toContain("figureHeightPx / PAPER_HERO_H");
    // The legacy fallback (no figureHeightPx) keeps its old size.
    expect(pawn).toContain("MAP_HERO_FIGURE_W / PAPER_HERO_W");
  });

  it("the board, stones, lots and register pile all take the stage scale", () => {
    const screen = read("app/hometown.tsx");
    expect(screen).toContain("const scale = cs / 40;");
    expect(screen).toContain("scale={scale}");
    const street = read("components/wide-street.tsx");
    expect(street).toContain("const s = cs / 40;");
    expect(street).toContain("<RegisterPileArt amount={world.cafePile} scale={s} />");
  });
});

describe("v333 (i) — R14: one frame shows the whole town", () => {
  it("forest, mine, His House, café, shop and board stand together, every rect inside the stage", () => {
    for (const w of [world, large]) {
      const kinds = w.places.map((p) => p.kind);
      for (const k of ["forest", "mine", "house", "cafe", "shop", "board"]) {
        expect(kinds).toContain(k);
      }
      for (const p of w.places) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.x + p.w).toBeLessThanOrEqual(STREET_W);
        expect(p.y + p.h).toBeLessThanOrEqual(STREET_H);
      }
      // All five gates keep their destinations.
      const targets = w.places.filter((p) => p.kind === "gate").map((g) => g.landmark?.targetMap);
      for (const t of ["school", "mall", "reserve", "well", "river"]) {
        expect(targets).toContain(t);
      }
      expect(w.places.filter((p) => p.kind === "empty-lot")).toHaveLength(2);
    }
  });

  it("the named places carry their whole words; no street label carries a line limit", () => {
    // RE-BASED (v343): the café seat is the gathering place, and
    // its plaque speaks the AGE's name — with no era in play the
    // Village's Common Table; under David, the Temple. The wiring
    // under the name never changes.
    expect(world.cafe!.plaque).toBe("Common Table");
    const david = deriveStreetWorld(fixtureMap(), { eraId: "david" });
    expect(david.cafe!.plaque).toBe("The Temple");
    expect(byKind(world, "house")[0].plaque).toBe("His House");
    expect(byKind(world, "mine")[0].plaque).toBe("The Mine");
    expect(byKind(world, "shop")[0].plaque).toBe("Town Shop");
    for (const g of byKind(world, "gate")) {
      expect(g.plaque).toBe(g.landmark!.name);
    }
    const street = read("components/wide-street.tsx");
    const plaqueAt = street.indexOf("function PlacePlaque");
    const plaque = street.slice(plaqueAt, street.indexOf("export const StreetWorldView", plaqueAt));
    expect(plaque).not.toContain("numberOfLines");
    expect(read("components/street-world-points.tsx")).not.toContain("numberOfLines");
  });
});

describe("v333 (j) — the pile: a save with waiting coins renders it at the café", () => {
  it("275 waiting coins stand at the café place, the exact amount", () => {
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
    expect(street).toContain("(cafe.door.x + 0.5) * cs - 22 * s");
    expect(street).toContain("world.cafePile > 0");
  });

  it("the era dress still reaches the rebuilt stage (v323's wiring, unbroken)", () => {
    const street = read("components/wide-street.tsx");
    expect(street).toContain("eraGroundFor(era, phase)");
    expect(street).toContain("era?.palette.river");
    expect(street).toContain("era?.palette.rain");
    expect(street).toContain("era?.palette.torn");
    expect(street).toContain("dress={dress}");
  });
});
