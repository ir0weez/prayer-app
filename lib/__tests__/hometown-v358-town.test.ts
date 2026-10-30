// ─────────────────────────────────────────────────────────────────────────────
// v358 — THE TOWN PASS: one label pass for chips AND plaques, the
// stone wall, layered hill terrain, the river's bank, the era
// zoom, and the street lots. Pins.
//
// Jonathan's v355 verdict (Oct 29 22:54): "Closer but still not
// what we agreed to" — the bottom cluster still collided across
// systems (the "Tide Pools · 3/3" chip sat ON the Garden of
// Remembrance plaque; "0 testimonies" crowded the Schoolhouse),
// the wall read as a pale rounded track, the hill was one flat
// ellipse, the river a sliver. And his three additions (22:56):
// the view zooms OUT era by era ("it's supposed to be smaller
// now too seeing as we are towards the end of my fast"), "there
// should be a lot more properties to buy", and money set by his
// fast (the money calibration is NOT this build — his word on
// the number is still pending, and no coin code changes here).
// The caves were explicitly freed ("you don't need to keep the
// caves and stuff") — the mine's front is redesignable like any
// building; this pass keeps its seat and door (the Deep Descent
// hangs off them) and redraws the hill it stands in as terrain.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  emptyTownState,
  ensureTownNeighborhood,
  STREET_LOTS,
  TOWN_LOTS,
  type MapState,
  type PlacedBuilding,
} from "@/lib/hometown";
import {
  deriveStreetWorld,
  eraZoomForIndex,
  isStreetWalkable,
  planStreetWalk,
  stageFit,
  streetArtRects,
  streetPileRect,
  streetPlaqueSeats,
  STREET_H,
  STREET_LOT_SEATS,
  STREET_W,
  type StreetWorld,
} from "@/lib/wide-street";
import { layoutStageLabels } from "@/lib/stage-labels";

const ROOT = join(__dirname, "..", "..");
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function b(over: Partial<PlacedBuilding> & { id: string; type: PlacedBuilding["type"] }): PlacedBuilding {
  return { x: 0, y: 0, level: 1, accumulated: 0, ...over };
}

function largeMap(): MapState {
  return {
    buildings: [
      b({ id: "diner-a", type: "diner", x: 6, y: 0, level: 3, accumulated: 12 }),
      b({ id: "home-hero", type: "pawn-house", x: 4, y: 6 }),
      ...Array.from({ length: 8 }, (_, i) =>
        b({ id: `cottage-${i + 1}`, type: "villager-cottage", x: (i * 3) % 10, y: (i * 2) % 9 }),
      ),
      b({ id: "shop-1", type: "shop", x: 2, y: 3, accumulated: 40 }),
      b({ id: "bank-1", type: "bank-tower", x: 5, y: 15, accumulated: 7 }),
    ],
    decorations: [],
    roads: [],
  };
}

const ERAS = [
  "village", "flood", "babel", "israel", "saul", "david",
  "ministry", "nero", "church-ages", "tribulation", "millennium", "new-earth",
] as const;

describe("v358 — one label pass: chips and plaques together", () => {
  // The chip seats exactly as the screen builds them
  // (app/hometown.tsx's stageLabels memo), over the shared
  // plaque seats, with the art and the register pile reserved.
  function wholePass(world: StreetWorld, cs: number) {
    const scale = cs / 40;
    const seats = [...streetPlaqueSeats(world, cs)];
    const board = world.board!;
    const corner = world.corner;
    seats.push({
      key: "chip-board",
      label: "3 missions",
      cx: (board.x + board.w / 2) * cs,
      top: (board.y + board.h) * cs + 7 * scale,
      fontSize: Math.max(10, 9.5 * scale),
    });
    seats.push({
      key: "chip-testimony",
      label: "0 testimonies",
      cx: corner.x * cs + 2 + 52,
      top: (corner.y + corner.h) * cs - 20 * scale,
      fontSize: Math.max(10, 9.5 * scale),
    });
    const lots = world.places.filter((p) => p.kind === "empty-lot").sort((a, b2) => a.x - b2.x);
    lots.forEach((lot, i) => {
      seats.push({
        key: `lot-chip-${i}`,
        label: i === 0 ? "Garden Tending · 3/3" : "Tide Pools · 3/3",
        cx: (lot.x + lot.w / 2) * cs,
        top: (lot.y + lot.h / 2) * cs - 11,
        fontSize: Math.max(10, 10 * scale),
        widthBonus: Math.max(11, 12 * scale) + 8 * scale,
      });
    });
    const reserved = [...streetArtRects(world, cs)];
    const pile = streetPileRect(world, cs);
    if (pile) reserved.push(pile);
    return layoutStageLabels(seats, { w: STREET_W * cs, h: (STREET_H - 1) * cs }, reserved);
  }

  it("no chip sits on a plaque, in any era — the verdict's collision is impossible", () => {
    const cs = 33;
    for (const eraId of ERAS) {
      const world = deriveStreetWorld(largeMap(), { eraId });
      const rects = wholePass(world, cs);
      const plaques = rects.filter((r) => r.key.startsWith("plaque-"));
      const chips = rects.filter((r) => !r.key.startsWith("plaque-"));
      expect(chips.length, eraId).toBe(4);
      for (const chip of chips) {
        // In frame, never over the river.
        expect(chip.left, `${eraId} ${chip.label}`).toBeGreaterThanOrEqual(0);
        expect(chip.left + chip.width, `${eraId} ${chip.label}`).toBeLessThanOrEqual(STREET_W * cs);
        expect(chip.top + chip.height, `${eraId} ${chip.label} over the river`).toBeLessThanOrEqual((STREET_H - 1) * cs);
        for (const plaque of plaques) {
          const overlap =
            chip.left < plaque.left + plaque.width && chip.left + chip.width > plaque.left &&
            chip.top < plaque.top + plaque.height && chip.top + chip.height > plaque.top;
          expect(overlap, `${eraId}: ${chip.label} on ${plaque.label}`).toBe(false);
        }
      }
      // And the chips keep clear of each other too.
      for (let i = 0; i < chips.length; i++) {
        for (let j = i + 1; j < chips.length; j++) {
          const a = chips[i];
          const c = chips[j];
          const overlap =
            a.left < c.left + c.width && a.left + a.width > c.left &&
            a.top < c.top + c.height && a.top + a.height > c.top;
          expect(overlap, `${eraId}: ${a.label} × ${c.label}`).toBe(false);
        }
      }
    }
  });

  it("the screen deals the whole pass and hands the street its plaques", () => {
    const screen = read("app/hometown.tsx");
    expect(screen).toContain("streetPlaqueSeats(streetWorld, cs)");
    expect(screen).toContain("layoutStageLabels(seats, { w: streetWorld.w * cs, h: (STREET_H - 1) * cs }, reserved)");
    expect(screen).toContain("labelRects={stageLabels?.rects}");
    expect(screen).toContain('chipOffset("lot-chip-1")');
    expect(screen).toContain('chipOffset("chip-testimony")');
    const street = read("components/wide-street.tsx");
    expect(street).toContain("streetPlaqueSeats(world, cs)");
    expect(street).toContain('r.key.startsWith("plaque-")');
  });
});

describe("v358 — the era zoom", () => {
  it("steps out era by era: Village full frame, Tribulation ≈0.80, New Earth widest", () => {
    expect(eraZoomForIndex(0)).toBe(1);
    expect(eraZoomForIndex(9)).toBeCloseTo(0.8, 5);
    expect(eraZoomForIndex(9)).toBeGreaterThanOrEqual(0.78);
    expect(eraZoomForIndex(9)).toBeLessThanOrEqual(0.85);
    expect(eraZoomForIndex(11)).toBeLessThan(eraZoomForIndex(9));
    for (let i = 1; i < 12; i++) expect(eraZoomForIndex(i)).toBeLessThan(eraZoomForIndex(i - 1));
  });

  it("stageFit at the Village is the v343 fit exactly; later eras reveal land on both sides", () => {
    const village = stageFit(400, 860, 0);
    expect(village.cell).toBeCloseTo(400 / STREET_W, 8);
    expect(village.offsetX).toBe(0);
    expect(village.stageH).toBe(860);
    const trib = stageFit(400, 860, 9);
    expect(trib.cell).toBeCloseTo((400 / STREET_W) * 0.8, 5);
    expect(trib.offsetX).toBeGreaterThan(30);
    expect(trib.contentW + trib.offsetX * 2).toBeCloseTo(400, 5);
    // The stage still fills its box's full height — the zoom
    // never brings back the letterbox.
    expect(trib.contentH + trib.extendTop + trib.extendBottom).toBeCloseTo(860, 5);
    expect(trib.stageH).toBe(860);
  });

  it("the screen fits by the world's era and the street draws the margins", () => {
    const screen = read("app/hometown.tsx");
    expect(screen).toContain("stageFit(stageBoxW, stageBoxH, streetWorld?.eraIndex ?? 0)");
    expect(screen).toContain("marginX={stage.offsetX}");
    const street = read("components/wide-street.tsx");
    expect(street).toContain("marginX");
    expect(street).toContain("totalW");
  });
});

describe("v358 — the street lots: a lot more properties to buy", () => {
  it("eight lots stand on the street, each paired with a real street lot", () => {
    expect(STREET_LOT_SEATS.length).toBe(8);
    expect(STREET_LOTS.length).toBe(8);
    // The neighborhood itself is untouched: its 45 lots stand as
    // v285 pinned them (the street lots are their own list).
    expect(TOWN_LOTS.length).toBe(45);
    const world = deriveStreetWorld(emptyTownState().maps.town, { eraId: "tribulation" });
    const plots = world.places.filter((p) => p.kind === "plot");
    expect(plots.length).toBe(8);
    for (const seat of STREET_LOT_SEATS) {
      const lot = STREET_LOTS.find((l) => l.id === seat.lotId);
      expect(lot, seat.lotId).toBeTruthy();
      expect(lot!.cost).toBeGreaterThan(0);
      expect(lot!.allowedTypes.length).toBeGreaterThan(0);
      // The diner is never a street-lot building — the café is the town's diner.
      expect(lot!.allowedTypes).not.toContain("diner");
      const place = plots.find((p) => p.lotId === seat.lotId);
      expect(place, seat.lotId).toBeTruthy();
      expect(place!.label).toContain("for sale");
    }
  });

  it("a street-lot building KEEPS its lot through the neighborhood migration", () => {
    // ensureTownNeighborhood re-homes unstamped buildings and
    // strips dangling lot stamps — a street stamp is neither: it
    // is valid, and the building stays exactly where its lot is.
    const map: MapState = {
      buildings: [
        b({ id: "lot-cottage", type: "villager-cottage", x: 6, y: 32, townLotId: "street-lot-bank-west" }),
        b({ id: "lot-bakery", type: "bakery", x: 0, y: 32, townLotId: "street-lot-strip-west" }),
        b({ id: "free-cottage", type: "villager-cottage", x: 0, y: 0 }),
      ],
      decorations: [],
      roads: [],
    };
    const out = ensureTownNeighborhood(map);
    const cottage = out.buildings.find((x) => x.id === "lot-cottage")!;
    expect(cottage.townLotId).toBe("street-lot-bank-west");
    expect({ x: cottage.x, y: cottage.y }).toEqual({ x: 6, y: 32 });
    const bakery = out.buildings.find((x) => x.id === "lot-bakery")!;
    expect(bakery.townLotId).toBe("street-lot-strip-west");
    // The unstamped cottage is re-homed to a NEIGHBORHOOD lot —
    // auto-assignment never claims a street lot.
    const free = out.buildings.find((x) => x.id === "free-cottage")!;
    expect(free.townLotId).toBeTruthy();
    expect(free.townLotId!.startsWith("town-lot-")).toBe(true);
  });

  it("no lot shares a door tile with any other place, in any era — and every door stands walkable", () => {
    // (The café and the schoolhouse's wall door have shared the
    // Village's (3,11) since v355 — each carries its own
    // Pressable, so both open; that pre-existing share is not
    // this pass's to move. The LOTS, new ground, must share with
    // nobody, and every door in town must stand on walkable
    // ground, as R10 has always required.)
    for (const eraId of ERAS) {
      const world = deriveStreetWorld(largeMap(), { eraId });
      const doors = new Map<string, string[]>();
      for (const p of world.places) {
        const key = `${p.door.x},${p.door.y}`;
        const who = `${p.kind}${p.lotId ? `:${p.lotId}` : ""}${p.landmark ? `:${p.landmark.id}` : ""}`;
        doors.set(key, [...(doors.get(key) ?? []), who]);
        expect(isStreetWalkable(world, p.door), `${eraId}: ${who} door walkable`).toBe(true);
      }
      for (const p of world.places.filter((x) => x.lotId)) {
        const key = `${p.door.x},${p.door.y}`;
        expect(doors.get(key)?.length, `${eraId}: lot door ${key} shared: ${doors.get(key)}`).toBe(1);
      }
    }
  });

  it("the café reaches every lot's door, in his era and the first", () => {
    for (const eraId of ["village", "tribulation"] as const) {
      const world = deriveStreetWorld(largeMap(), { eraId });
      const cafe = world.places.find((p) => p.kind === "cafe")!;
      for (const p of world.places.filter((x) => x.kind === "plot")) {
        expect(planStreetWalk(world, cafe.door, p.door), `${eraId} → ${p.lotId}`).toBeTruthy();
      }
    }
  });

  it("a bought lot stands its building on the lot — never on the strata", () => {
    const map = largeMap();
    map.buildings.push(
      b({ id: "lot-cottage", type: "villager-cottage", x: 6, y: 32, townLotId: "street-lot-bank-west" }),
      b({ id: "lot-bakery", type: "bakery", x: 0, y: 32, townLotId: "street-lot-strip-west" }),
    );
    const world = deriveStreetWorld(map, { eraId: "tribulation" });
    const cottage = world.places.find((p) => p.buildingId === "lot-cottage");
    expect(cottage).toBeTruthy();
    expect(cottage!.lotId).toBe("street-lot-bank-west");
    expect(cottage!.x).toBeCloseTo(0.15, 5);
    expect(cottage!.y).toBeCloseTo(13.45, 5);
    const bakery = world.places.find((p) => p.buildingId === "lot-bakery");
    expect(bakery).toBeTruthy();
    expect(bakery!.label).toBe("Bakery");
    expect(bakery!.x).toBeCloseTo(0.1, 5);
    // The remaining unsold lots still stand as plots.
    expect(world.places.filter((p) => p.kind === "plot").length).toBe(6);
    // And the lot cottage counts among his homes (it is one).
    expect(world.plotsTotal).toBe(9);
  });

  it("arriving at a plot opens the town's own lot purchase flow", () => {
    const screen = read("app/hometown.tsx");
    const at = screen.indexOf('case "plot":');
    expect(at).toBeGreaterThan(-1);
    const block = screen.slice(at, at + 500);
    expect(block).toContain("handleTownLotPress(lot)");
    const street = read("components/wide-street.tsx");
    expect(street).toContain("ForSaleSign");
  });
});

describe("v358 — stone wall, layered hill, the river's bank (source pins)", () => {
  const street = read("components/wide-street.tsx");

  it("the wall is drawn as stone: thickness, joints, posts, breaks", () => {
    expect(street).toContain("wall-post-");
    expect(street).toContain("wall-break-");
    expect(street).toContain("strokeDasharray");
    // The v355 doubled track line is gone.
    expect(street).not.toContain('stroke="#9A8D76" strokeWidth={cs * 0.1}');
  });

  it("the hill is layered ridges with contours — the flat ellipse is gone", () => {
    expect(street).not.toContain("<Ellipse cx={worldW * 0.3}");
    expect(street).toContain("hill-rock-");
    expect(street).toContain("contour");
  });

  it("the river wears its bank and deepens in bands", () => {
    expect(street).toContain("#C9B18C");
    expect(street).toContain("river-dress-");
  });
});

describe("v358 — the protected wiring stands", () => {
  it("the café still collects nothing on arrival; the pile waits for its own tap", () => {
    const screen = read("app/hometown.tsx");
    const at = screen.indexOf("const runStreetPlace");
    const block = screen.slice(at, screen.indexOf("const handleStreetPlacePress", at));
    const cafeCase = block.slice(block.indexOf('case "cafe":'), block.indexOf('case "mine":'));
    expect(cafeCase).not.toContain("handleCollectBuilding");
    expect(cafeCase).not.toContain("collectPendingRegister");
    expect(screen).toContain("handleCollectPilePress");
  });

  it("no coin-balance code moves in this build", () => {
    // The money calibration awaits Jonathan's word on the number:
    // this pass touches no balance, ledger, or restitution code.
    const street = read("lib/wide-street.ts");
    expect(street).not.toContain("addCoins");
    expect(street).not.toContain("applyCoinsDelta");
  });
});
