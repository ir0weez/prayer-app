// ─────────────────────────────────────────────────────────────────────────────
// v307 — The Town Rebuild. Pins.
//
// Jonathan authorized the walkable town Oct 27 ("I said I'll trust you
// to build the town and everything correctly") and re-flagged it Oct 28
// 11:25 (screenshot 10829): the v291 wide street still sat EMBEDDED in
// the old town page — the map chips row, the Town Shop card, the
// missions banner, the "Tap an empty plot to build…" explainer, the
// Testimony Plaza card, the nav signposts, the Play cards — and the
// street got only about half the screen.
//
// v307 re-hosts the screen: when the wide street stands, the Hometown
// screen IS the world. The frame fills the screen, the street is drawn
// at a cell size fitted to that space, the header block rides as a HUD
// overlay, and every retired page element's destination lives inside
// the world instead:
//
//   map chips        → the street's gates (school / garden / mission /
//                      well / river) + the forest edge + map switching
//                      from every other map's page, as before
//   Town Shop card   → the shop stall beside the café
//   missions banner  → the notice board on the north apron
//   Testimony card   → the testimony stones on the north apron
//   Play cards       → play points on the street's two empty lots,
//                      the games themselves full-screen while they run
//   MapSigns         → the gates ARE the signposts now
//
// Nothing mechanical moved: lib/hometown.ts, the café, the mine and
// forest screens, construction, presence, prestige and the v291
// migration are untouched (v291/v292 pins hold that line).
//
// Contracts pinned here:
//  (a) COMPOSITION — the world mode exists, the frame fills, the street
//      is sized to the space, the header has exactly two homes.
//  (b) RETIRED FURNITURE — the page elements are gated to the page;
//      they cannot render while the world stands.
//  (c) REACHABILITY — every retired destination is reachable in the
//      world: board → missions, stall → shop, stones → the count,
//      lots → the games, gates → their maps (behavioral, off the real
//      derivation), and the furniture's gap columns are real street.
//  (d) LABELS — name labels are fenced to fit: no fixed narrow strip
//      can clip a name to an ellipsis again (screenshot 10829's "Pe…").
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { emptyTownState, type PlacedBuilding, type TownState } from "@/lib/hometown";
import {
  deriveStreetWorld,
  dioramaCenterY,
  isStreetWalkable,
} from "@/lib/wide-street";

const ROOT = join(__dirname, "..", "..");
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}
const screen = read("app/hometown.tsx");
const border = read("components/seasonal-border.tsx");
const points = read("components/street-world-points.tsx");

function b(over: Partial<PlacedBuilding> & { id: string; type: PlacedBuilding["type"] }): PlacedBuilding {
  return { x: 0, y: 0, level: 1, accumulated: 0, ...over };
}

/** His town's shape: a diner (the café anchor), his house, cottages. */
function hisTown(): TownState {
  const town = emptyTownState();
  town.maps.town.buildings = [
    b({ id: "diner-a", type: "diner", x: 6, y: 0, level: 3, accumulated: 100 }),
    b({ id: "home-1", type: "pawn-house", x: 4, y: 6 }),
    b({ id: "cottage-1", type: "villager-cottage", x: 8, y: 0 }),
    b({ id: "cottage-2", type: "villager-cottage", x: 0, y: 6 }),
  ];
  return town;
}

describe("v307 (a) — composition: the town is the screen", () => {
  it("world mode is exactly: town map + the street standing", () => {
    expect(screen).toContain('const isTownWorld = activeMap === "town" && !!streetWorld;');
  });

  it("the page ScrollView becomes the world box: no scroll, no page padding, insets respected", () => {
    expect(screen).toContain("scrollEnabled={!isTownWorld}");
    expect(screen).toContain(
      "isTownWorld ? { flexGrow: 1, paddingTop: insets.top, paddingBottom: insets.bottom } : { padding: 16, paddingTop: insets.top + 16 }"
    );
  });

  it("the frame stretches to fill in world mode only", () => {
    expect(screen).toContain("fill={isTownWorld}");
    expect(border).toContain("fill?: boolean");
    expect(border).toContain("...(fill ? { flex: 1 } : null)");
  });

  it("the street is drawn at a cell size fitted to the frame's inner height, floored at today's 40", () => {
    // v333 re-pin: the fixed stage fits on BOTH axes (the whole
    // 11×16 stage in one viewport — the drawing's contract, R1);
    // the v307 height-only fit belonged to the roster-width world.
    // The floor is a legibility floor only (16), never a fit-breaker.
    expect(screen).toContain(
      "const streetCell = Math.max(16, Math.floor(Math.min(worldInnerW / STREET_W, worldInnerH / STREET_H)));"
    );
    expect(screen).toContain("streetWorld.w * streetCell");
    expect(screen).toContain("streetWorld.h * streetCell");
    expect(screen).toContain('viewportW={activeMap === "town" && streetWorld ? worldInnerW : gridW * cellSize}');
  });

  it("the walk math measures the pawn in street cells, not page cells", () => {
    expect(screen).toContain("Math.floor(heroPosRef.current.x / streetCell)");
    expect(screen).toContain("Math.floor(heroPosRef.current.y / streetCell)");
    const at = screen.indexOf("const tileFromWorldPx");
    const block = screen.slice(at, screen.indexOf("const handleCollectPilePress", at));
    expect(block).toContain("const cs = sw ? streetCell : cellSize;");
  });

  it("the header block has one definition and exactly two homes — page flow and the HUD overlay", () => {
    expect(screen).toContain("const renderTownHeader = () => (");
    expect(screen).toContain("{!isTownWorld && renderTownHeader()}");
    expect(screen.match(/renderTownHeader\(\)/g)?.length).toBe(2);
    // The HUD: tap-through sky, the header riding on top of the world.
    const hudAt = screen.indexOf("v307 HUD");
    const hud = screen.slice(hudAt, screen.indexOf("playingGarden", hudAt));
    expect(hud).toContain('pointerEvents="box-none"');
    expect(hud).toContain("{renderTownHeader()}");
  });
});

describe("v307 (b) — retired furniture: gated to the page, absent from the world", () => {
  const gateAt = screen.indexOf("{!isTownWorld && (<>");
  const gate = screen.slice(gateAt, screen.indexOf("</>)}", gateAt));

  it("the gate exists and closes before the map branch renders", () => {
    expect(gateAt).toBeGreaterThan(-1);
    expect(screen.indexOf("</>)}", gateAt)).toBeLessThan(screen.indexOf('{activeMap === "mall" ? ('));
  });

  it("inside the gate: the map chips, the Town Shop card, the missions banner, the explainer, the Testimony card", () => {
    expect(gate).toContain("TOWN_MAP_IDS.map");
    expect(gate).toContain("Town Shop");
    expect(gate).toContain('router.push("/hometown-shop")');
    expect(gate).toContain("mission");
    expect(gate).toContain("Tap an empty plot to build");
    expect(gate).toContain("Testimony Plaza");
    expect(gate).toContain("monumentCount");
  });

  it("the signposts and the Play cards are page-only too", () => {
    expect(screen).toContain('activeMap === "town" && !isTownWorld && (\n          <MapSigns');
    const playAt = screen.indexOf('gameId="garden"');
    const playGate = screen.slice(screen.lastIndexOf("activeMap ===", playAt), playAt);
    expect(playGate).toContain("!isTownWorld");
  });
});

describe("v307 (c) — every retired destination, reachable in the world", () => {
  const streetAt = screen.indexOf("</StreetErrorBoundary>");
  const furniture = screen.slice(streetAt, screen.indexOf("</View>", streetAt));

  it("the furniture stands inside the street subtree, after the boundary", () => {
    expect(furniture).toContain("<NoticeBoardPoint");
    expect(furniture).toContain("<TestimonyStonesPoint");
    // v333 re-pin: the ShopStallPoint stood down — the Town Shop
    // is a street PLACE on the front stratum now, drawn by the
    // street view (ShopArt) and opened by its own doorstep.
    expect(furniture).not.toContain("<ShopStallPoint");
    expect(furniture.match(/<LotPlayPoint/g)?.length).toBe(2);
  });

  it("the notice board opens the missions surface and wears the pending count", () => {
    expect(furniture).toContain("pendingCount={pendingMissions(missions).length}");
    expect(furniture).toContain("onPress={() => setMissionsVisible(true)}");
  });

  it("the shop place opens the Town Shop; the stones carry the plaza's count", () => {
    // v333 re-pin: the stall's direct route became the shop
    // place's arrival action in runStreetPlace — same door, same
    // destination, reached by walking to the shop as drawn.
    const at = screen.indexOf("const runStreetPlace");
    const block = screen.slice(at, screen.indexOf("const handleStreetPlacePress", at));
    expect(block).toContain('case "shop":');
    expect(block).toContain('router.push("/hometown-shop")');
    expect(furniture).toContain("count={monumentCount}");
  });

  it("the lots open the two games, and in world mode the games take the whole screen", () => {
    expect(furniture).toContain('label="Garden Tending"');
    expect(furniture).toContain("setPlayingGarden(true)");
    expect(furniture).toContain('label="Tide Pools"');
    expect(furniture).toContain("setPlayingTide(true)");
    expect(screen).toContain("{isTownWorld && playingGarden && (");
    expect(screen).toContain("{isTownWorld && playingTide && (");
  });

  it("the missions surface is hoisted to the screen root — above the HUD, anchored to the screen", () => {
    expect(screen.indexOf("{missionsVisible && (")).toBeGreaterThan(screen.indexOf("\n    </ScrollView>"));
  });

  it("the furniture components answer real taps; the stones are display-only; no emoji art", () => {
    expect(points).toContain("export function NoticeBoardPoint");
    expect(points).toContain("export function ShopStallPoint");
    expect(points).toContain("export function TestimonyStonesPoint");
    expect(points).toContain("export function LotPlayPoint");
    const stones = points.slice(points.indexOf("export function TestimonyStonesPoint"), points.indexOf("export function LotPlayPoint"));
    expect(stones).toContain('pointerEvents="none"');
    expect(stones).not.toContain("Pressable");
    expect(points).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it("behavioral: the street derivation still carries every destination the chips used to offer", () => {
    const world = deriveStreetWorld(hisTown().maps.town);
    const gates = world.places.filter((p) => p.kind === "gate");
    const targets = gates.map((g) => g.landmark?.targetMap);
    // Garden of Remembrance is the "mall" map; Mission Field is "reserve".
    for (const t of ["school", "mall", "reserve", "well", "river"]) {
      expect(targets).toContain(t);
    }
    const kinds = world.places.map((p) => p.kind);
    for (const k of ["cafe", "mine", "forest", "house", "home"]) {
      expect(kinds).toContain(k);
    }
    expect(world.places.filter((p) => p.kind === "empty-lot").length).toBe(2);
  });

  it("behavioral: the furniture's seats are real, walkable street — free columns between neighbours", () => {
    // v327 re-pin: the straight band's two rows are gone; the
    // Diorama's seats are the board's place mid-lane, the corner
    // tiles at its feet (the stones), and the café's east gap
    // (the stall). What survives from the old pin: neighbours on
    // a side keep free columns between them, every door stands on
    // walkable street, and the corner is open ground.
    // Drawing: hometown-street-concepts-v1.html Concept 2 (+ the
    // Concept 3 corner), approved by Jonathan 2026-10-28 22:45.
    // v333 re-pin: the free-column rule belonged to the scrolling
    // world's packing. On the FIXED stage the cottages pack at a
    // sub-column pitch (the roster must fit the frame — that is
    // the contract now), so what survives is the walkability
    // heart of the pin: every door stands on walkable street, the
    // whole corner is open ground, and no two places' drawn rects
    // overlap. The full stage contract (pitch, strata, lane) is
    // pinned in hometown-v333-stage.test.ts. (Rebuild authorized
    // by Jonathan 2026-10-29 after the fourth rejection.)
    const world = deriveStreetWorld(hisTown().maps.town);
    expect(world.board).not.toBeNull();
    for (let dy = 0; dy < world.corner.h; dy++) {
      for (let dx = 0; dx < world.corner.w; dx++) {
        expect(isStreetWalkable(world, { x: world.corner.x + dx, y: world.corner.y + dy })).toBe(true);
      }
    }
    for (const p of world.places) {
      expect(isStreetWalkable(world, p.door)).toBe(true);
    }
    // Building masses never overlap (slim gate poles carry tap
    // rects wider than their posts, so gates stand outside this
    // pin — the back-stratum schoolhouse, a true building, is in).
    const buildings = world.places.filter(
      (p) => ["house", "home", "cafe", "shop", "mine"].includes(p.kind) || (p.kind === "gate" && p.depth === "back")
    );
    for (let i = 0; i < buildings.length; i++) {
      for (let j = i + 1; j < buildings.length; j++) {
        const a = buildings[i];
        const b2 = buildings[j];
        const overlap =
          a.x < b2.x + b2.w && b2.x < a.x + a.w && a.y < b2.y + b2.h && b2.y < a.y + a.h;
        expect(overlap, `${a.kind} vs ${b2.kind}`).toBe(false);
      }
    }
  });
});

describe("v307 (a2) — the walk keeps its tile pace at the fitted cell size", () => {
  it("the hero's and villagers' speeds scale with the cell — the v291 watchdog budget is sized in tiles", () => {
    const pawn = read("components/player-pawn.tsx");
    expect(pawn).toContain("WALK_PX_PER_SEC * (cellSize / WALK_REF_CELL)");
    const villagers = read("components/street-villagers.tsx");
    expect(villagers).toContain("STROLL_PX_PER_SEC * (cellSize / 40)");
    // At the legacy 40px cell both reduce to the pre-v307 pace exactly.
    expect(pawn).toContain("const WALK_REF_CELL = 40;");
  });
});

describe("v307 (d) — name labels are fenced to fit", () => {
  it("the pawn's name chip: the 64px clamp is gone; the label rides a 200px centred strip", () => {
    const pawn = read("components/player-pawn.tsx");
    expect(pawn).not.toContain("maxWidth: 64");
    expect(pawn).toContain("width: 200");
    expect(pawn).toContain('pawn.name || "You"');
  });

  it("the town NPC name label: widened from the 90px strip that clipped names", () => {
    const npcs = read("components/town-npcs.tsx");
    expect(npcs).toContain("left: -92");
    expect(npcs).toContain("width: 200");
  });
});
