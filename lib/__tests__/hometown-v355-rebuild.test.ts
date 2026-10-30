// ─────────────────────────────────────────────────────────────────────────────
// v355 — THE HOMETOWN REBUILD: fixed composition, the wall, one
// label system, night wired, the era HUD chip, the Road's last
// badge. Pins.
//
// The v349 audit (Oct 29) found the shipped town failed the
// approved drawing structurally: the composition was PACKED from
// the building record (the shop migrated behind the board as
// cottages came and went; His House could vanish with its
// record), three label systems collided blind, the night rule
// never fired because the screen never passed the phase, the era
// was palette-deep only, and the HUD's "Day N" was a town-VISIT
// streak wearing a fast count's clothes. Jonathan then directed
// the growth law (Oct 29 20:39: the town grows era by era behind
// a WALL) and delegated four calls (20:41): the wall moves at era
// turns only; the day chip counts the day WITHIN the era; the
// five gates become doors set into the wall ring; the New Earth
// Road badge earns on day 365 itself. This file pins all of it.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  emptyTownState,
  type MapState,
  type PlacedBuilding,
} from "@/lib/hometown";
import {
  deriveStreetWorld,
  isStreetWalkable,
  laneWallCrossings,
  planStreetWalk,
  wallRectForEra,
  STREET_H,
  STREET_W,
  type StreetWorld,
} from "@/lib/wide-street";
import {
  layoutStageLabels,
  labelPillWidth,
  measureLabelText,
} from "@/lib/stage-labels";
import { eraProgressForDay } from "@/lib/hometown-eras";
import { erasFullyLivedThrough } from "@/lib/hometown-road";
import type { PersonalFast } from "@/lib/prayercircle-fasting";

const ROOT = join(__dirname, "..", "..");
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function b(over: Partial<PlacedBuilding> & { id: string; type: PlacedBuilding["type"] }): PlacedBuilding {
  return { x: 0, y: 0, level: 1, accumulated: 0, ...over };
}

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

function largeMap(): MapState {
  return {
    buildings: [
      b({ id: "diner-a", type: "diner", x: 6, y: 0, level: 3, accumulated: 12 }),
      b({ id: "diner-b", type: "diner", x: 1, y: 12, level: 2, accumulated: 0 }),
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

const seat = (w: StreetWorld, kind: string) => w.places.find((p) => p.kind === kind);

describe("v355 — the fixed composition: anchors never move with the record", () => {
  it("His House stands at its seat even with NO pawn-house in the record", () => {
    const map = fixtureMap();
    map.buildings = map.buildings.filter((x) => x.type !== "pawn-house");
    const world = deriveStreetWorld(map, { eraId: "tribulation" });
    const house = seat(world, "house");
    expect(house, "His House must stand regardless of the record").toBeTruthy();
    expect(house!.x).toBeCloseTo(1.15, 5);
    expect(house!.plaque).toBe("His House");
    // The long spur is the drawing's own: more than a doorstep.
    expect(house!.spur.length).toBeGreaterThan(1);
  });

  it("café and shop seats are identical for an empty record and a full one", () => {
    const empty = deriveStreetWorld(emptyTownState().maps.town, { eraId: "tribulation" });
    const full = deriveStreetWorld(largeMap(), { eraId: "tribulation" });
    for (const world of [empty, full]) {
      expect(seat(world, "cafe")!.x).toBeCloseTo(0.15, 5);
      expect(seat(world, "shop")!.x).toBeCloseTo(7.8, 5);
      expect(seat(world, "house")!.x).toBeCloseTo(1.15, 5);
    }
    // The shop never migrates behind the board (the v349 failure):
    // its seat is east of the board's east edge in every record.
    expect(seat(full, "shop")!.x).toBeGreaterThan(full.board!.x + full.board!.w);
  });

  it("the record still decides WHOSE cottages stand, and how many", () => {
    const small = deriveStreetWorld(fixtureMap(), { eraId: "tribulation" });
    const large = deriveStreetWorld(largeMap(), { eraId: "tribulation" });
    expect(small.plotsTotal).toBe(4);
    expect(large.plotsTotal).toBe(8);
    // In his standing era nearly all plots are open — Tribulation
    // loses sight of NOTHING his record has (the lossless rule).
    expect(small.plotsOpen).toBe(small.plotsTotal);
    expect(large.plotsOpen).toBe(large.plotsTotal);
  });
});

describe("v355 — the wall and its doors", () => {
  it("the footprint grows monotonically with the era; the New Earth stands at the frame's edges", () => {
    const areas = Array.from({ length: 12 }, (_, i) => {
      const w = wallRectForEra(i);
      return w.w * w.h;
    });
    for (let i = 1; i < 12; i++) expect(areas[i]).toBeGreaterThan(areas[i - 1]);
    const ne = wallRectForEra(11);
    expect(ne.x).toBeLessThanOrEqual(0.15);
    expect(ne.y).toBeLessThanOrEqual(0.6);
    expect(ne.x + ne.w).toBeGreaterThanOrEqual(STREET_W - 0.15);
    expect(ne.y + ne.h).toBeGreaterThanOrEqual(14.5);
    // Village is genuinely small: less than half the New Earth's ground.
    expect(areas[0]).toBeLessThan(areas[11] * 0.5);
  });

  it("the five gates are doors set into the wall ring — in every era", () => {
    for (const eraId of ["village", "tribulation", "new-earth"] as const) {
      const world = deriveStreetWorld(largeMap(), { eraId });
      const doors = world.places.filter((p) => p.wallDoor);
      expect(doors.map((d) => d.landmark?.id).sort()).toEqual(
        ["landmark-garden", "landmark-mission", "landmark-river", "landmark-school", "landmark-well"].sort(),
      );
      for (const d of doors) {
        // Each door's rect straddles the ring it stands in.
        const { x, y, w, h } = world.wall;
        const onWest = Math.abs(d.x + d.w / 2 - x) < 0.6;
        const onEast = Math.abs(d.x + d.w / 2 - (x + w)) < 0.6;
        const onSouth = Math.abs(d.y + d.h / 2 - (y + h)) < 0.9;
        expect(onWest || onEast || onSouth, `${d.landmark?.id} in ${eraId}`).toBe(true);
        // …and none of them is a labelled building mid-street anymore:
        // the only mid-street gates left are none at all.
        expect(isStreetWalkable(world, d.door), `${d.landmark?.id} doorstep walkable`).toBe(true);
      }
    }
  });

  it("no mid-street gate buildings remain (the wall doors replaced them)", () => {
    const world = deriveStreetWorld(largeMap(), { eraId: "tribulation" });
    const gates = world.places.filter((p) => p.kind === "gate");
    expect(gates.length).toBe(5);
    expect(gates.every((g) => g.wallDoor)).toBe(true);
  });

  it("the hero can walk from the café door to every wall door", () => {
    const world = deriveStreetWorld(largeMap(), { eraId: "tribulation" });
    const cafe = seat(world, "cafe")!;
    for (const d of world.places.filter((p) => p.wallDoor)) {
      const plan = planStreetWalk(world, cafe.door, d.door);
      expect(plan, `café → ${d.landmark?.id}`).toBeTruthy();
    }
  });

  it("the lane passes through the wall (gate openings where the street crosses its ring)", () => {
    // Tribulation: the lane's head rests inside the ring and the
    // street leaves through the south edge — beside the well door.
    const trib = wallRectForEra(9);
    const crossings = laneWallCrossings(trib);
    expect(crossings.length).toBe(1);
    expect(crossings[0].y).toBeCloseTo(trib.y + trib.h, 5);
    // The Village's tighter ring is crossed twice (west + east).
    expect(laneWallCrossings(wallRectForEra(0)).length).toBe(2);
  });

  it("the world carries its era's footprint, derived (no storage)", () => {
    const village = deriveStreetWorld(largeMap(), { eraId: "village" });
    const trib = deriveStreetWorld(largeMap(), { eraId: "tribulation" });
    expect(village.eraIndex).toBe(0);
    expect(trib.eraIndex).toBe(9);
    expect(village.wall).toEqual(wallRectForEra(0));
    expect(trib.wall).toEqual(wallRectForEra(9));
    // Village is smaller: fewer of his plots stand in town there —
    // the rest wait outside as outskirts (still his, still drawn).
    expect(village.plotsOpen).toBeLessThan(trib.plotsOpen);
  });
});

describe("v355 — one label system", () => {
  it("measurement is per-glyph and beats the dead 0.60-em estimate on the audit's words", () => {
    for (const word of ["Garden of Remembrance", "River of Life", "Town Shop", "Mission Field"]) {
      // The old flat estimate the audit proved under-measured:
      const flat = Math.ceil(word.length * 0.6 * 10.5) + 18;
      expect(labelPillWidth(word, 10.5), word).toBeGreaterThanOrEqual(flat);
      expect(measureLabelText(word, 10.5)).toBeGreaterThan(word.length * 0.6 * 10.5);
    }
  });

  it("the stage's real plaques lay out whole: in-frame, non-overlapping, clear of art, never over the river", () => {
    const cs = 37;
    const world = deriveStreetWorld(largeMap(), { eraId: "tribulation" });
    const key = (p: StreetWorld["places"][number]) =>
      `place-${p.kind}-${p.buildingId ?? p.landmark?.id ?? `${p.x}-${p.y}`}`;
    // Reserved art = each place's WALLS band (lower 60%), and
    // bank places seat their plaques above their doors — exactly
    // the renderer's seats (components/wide-street.tsx).
    const reserved = world.places.map((p) => ({
      key: key(p),
      left: p.x * cs,
      top: (p.y + p.h * 0.4) * cs,
      width: p.w * cs,
      height: p.h * 0.6 * cs,
    }));
    const pillH = Math.ceil(10.5 * 1.5) + 6;
    const riverTop = (STREET_H - 1) * cs;
    const seatsIn = world.places
      .filter((p) => p.plaque)
      .map((p) => {
        const feetTop = (p.y + p.h) * cs + 3;
        return {
          key: `plaque-${p.kind}`,
          label: p.plaque!,
          cx: (p.x + p.w / 2) * cs,
          top: feetTop + pillH > riverTop ? p.y * cs - pillH - 3 : feetTop,
          fontSize: 10.5,
          avoidKey: key(p),
        };
      });
    const rects = layoutStageLabels(seatsIn, { w: STREET_W * cs, h: riverTop }, reserved);
    expect(rects.length).toBe(seatsIn.length);
    for (const r of rects) {
      expect(r.left, r.label).toBeGreaterThanOrEqual(0);
      expect(r.top, r.label).toBeGreaterThanOrEqual(0);
      expect(r.left + r.width, r.label).toBeLessThanOrEqual(STREET_W * cs);
      expect(r.top + r.height, `${r.label} over the river`).toBeLessThanOrEqual(riverTop);
      // Whole: the pill is exactly its measured width — no wrap,
      // no truncation, by construction.
      expect(r.width).toBe(labelPillWidth(r.label, 10.5));
    }
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];
        const overlap =
          a.left < b.left + b.width && a.left + a.width > b.left &&
          a.top < b.top + b.height && a.top + a.height > b.top;
        expect(overlap, `${a.label} × ${b.label}`).toBe(false);
      }
    }
    // Clear of OTHER places' art (a plaque may touch its own).
    for (const r of rects) {
      const seatOf = seatsIn.find((s) => s.label === r.label);
      for (const art of reserved) {
        if (seatOf?.avoidKey === art.key) continue;
        const overlap =
          r.left < art.left + art.width && r.left + r.width > art.left &&
          r.top < art.top + art.height && r.top + r.height > art.top;
        expect(overlap, `${r.label} over ${art.key}`).toBe(false);
      }
    }
  });
});

describe("v355 — night, wired", () => {
  it("the screen passes the phase and the hero's position to the street's people", () => {
    const screen = read("app/hometown.tsx");
    expect(screen).toContain("phase={dayPhase}");
    expect(screen).toContain("heroPosRef={heroPosRef}");
  });

  it("the villagers' night rule has no fallback left: phase is required and the doorstep rest is deleted", () => {
    const src = read("components/street-villagers.tsx");
    expect(src).toContain("phase: DayPhase;");
    expect(src).toContain('if (phase === "night") return null;');
    expect(src).not.toContain("getTimeOfDay");
    expect(src).not.toContain("Home for the night");
  });

  it("the villager name pill is the drawing's form: cream, above the head, from the one label system", () => {
    const src = read("components/street-villagers.tsx");
    expect(src).toContain('backgroundColor: "#FFF7ED"');
    expect(src).toContain("labelPillWidth");
    expect(src).toContain("clampedPillLeft");
  });
});

describe("v355 — the day chip counts the day within the era", () => {
  it("day 302 of his 365 stands at Day 28 of 31 in the Tribulation", () => {
    expect(eraProgressForDay(302, 365)).toEqual({ index: 9, dayInEra: 28, eraDays: 31 });
  });
  it("the Millennium turns on day 306, at Day 1", () => {
    expect(eraProgressForDay(306, 365)).toEqual({ index: 10, dayInEra: 1, eraDays: 30 });
  });
  it("day 1 is the Village's first day; day 365 is the New Earth's last", () => {
    const first = eraProgressForDay(1, 365);
    expect(first.index).toBe(0);
    expect(first.dayInEra).toBe(1);
    const last = eraProgressForDay(365, 365);
    expect(last.index).toBe(11);
    expect(last.dayInEra).toBe(last.eraDays);
  });
  it("the chip in the screen reads the era progress — and the visit streak is out of the HUD", () => {
    const screen = read("app/hometown.tsx");
    expect(screen).toContain("eraProgressForDay(getCurrentFastDay(cafeFast, cafeDay), cafeFast.durationDays)");
    expect(screen).toContain("Day {progress.dayInEra} of {progress.eraDays}");
    // The streak's HUD chip (its only opener) is gone from the
    // header row; the streak's own detail sheet keeps its count —
    // under its own honest name, behind no chip.
    expect(screen).not.toContain("setStreakDetailOpen(true)");
  });
});

describe("v355 — the Road's last badge earns on day 365 itself", () => {
  const fast: PersonalFast = {
    id: "fast-365",
    name: "365-Day Growth Fast",
    startDate: "2026-01-01",
    durationDays: 365,
    type: "Growth",
    focusItems: [],
    dayStatuses: {},
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  it("on the last day the whole road counts as lived", () => {
    expect(erasFullyLivedThrough(fast, "2026-12-31")).toBe(11);
  });
  it("the day before, the New Earth is still the era being lived", () => {
    expect(erasFullyLivedThrough(fast, "2026-12-30")).toBe(10);
  });
});

describe("v355 — era is the paper, phase is light on it", () => {
  it("the phase wash renders UNDER the era wash, and the torn edge frames the stage", () => {
    const src = read("components/wide-street.tsx");
    const phaseAt = src.indexOf("PHASE_WASH[phase]");
    const eraAt = src.indexOf("era.palette.wash");
    expect(phaseAt).toBeGreaterThan(-1);
    expect(eraAt).toBeGreaterThan(phaseAt);
    expect(src).toContain("TornFrame");
    expect(src).toContain("laneWallCrossings");
    expect(src).not.toContain("layoutPlaques");
  });

  it("no flat colour band remains: the sky and river bands are drawn", () => {
    const src = read("components/wide-street.tsx");
    expect(src).not.toContain('backgroundColor: "#47688C"');
    expect(src).toContain("riverBandH");
  });
});
