// v343 — the frame contract (the rebuild brief's verification bar).
//
// The v333 device rejection was a framing failure: the stage filled
// only part of its frame (a letterbox of empty border below), the
// HUD chips overlaid the town and collided with it, and place labels
// ran off edges into each other. These pins hold the new contract:
//
//  - stageFit: the stage takes its box's FULL height on any aspect
//    — the cell fits the width, sky/ground bands absorb the slack,
//    and the street is never cropped;
//  - plaques: every plaque rect sits inside the world and no
//    two overlap — labels are sized whole, never truncated.
//    (v355 re-base: the layout engine is now lib/stage-labels'
//    one label system — whole-frame, per-glyph measurement —
//    superseding v343's layoutPlaques and its 0.60-em estimate,
//    which the v349 audit proved under-measured bold text.)
//  - the screen's seats: no border frame on the town world, the
//    header in flow above the world (never an overlay), the café
//    walk-up collecting nothing, the forest defeat waking at home,
//    the street derivation stamped with the era;
//  - the night contract at the lib level: the mock's phase windows
//    (dawn 5–8, day 8–17, dusk 17–20, night 20–5) and lit windows
//    at dusk and night.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  STREET_H,
  STREET_W,
  deriveStreetWorld,
  stageFit,
} from "../wide-street";
import { labelPillWidth, layoutStageLabels } from "../stage-labels";
import { phaseForHour, phaseWindowsLit } from "../welcoming-town";
import type { MapState } from "../hometown";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("v343 frame — stageFit fills its frame", () => {
  it("a tall phone box: the stage takes the box's full height, the street whole", () => {
    // A 1080×2400-class aspect in dp.
    const stage = stageFit(400, 860);
    expect(stage.stageH).toBe(860); // 100% of the frame — no letterbox
    expect(stage.cell).toBeCloseTo(400 / STREET_W, 8); // width-fit
    expect(stage.contentH).toBeCloseTo(stage.cell * STREET_H, 8);
    // The slack lives in the two elastic bands, the ground/river
    // band taking the larger share.
    expect(stage.extendTop).toBeGreaterThan(0);
    expect(stage.extendBottom).toBeGreaterThan(0);
    expect(stage.extendBottom).toBeGreaterThan(stage.extendTop);
    expect(stage.contentH + stage.extendTop + stage.extendBottom).toBeCloseTo(860, 6);
    expect(stage.offsetX).toBe(0);
  });

  it("a short box: the height rules instead, and the stage centres horizontally", () => {
    const stage = stageFit(400, 300);
    expect(stage.stageH).toBe(300);
    expect(stage.cell).toBeCloseTo(300 / STREET_H, 8); // height-fit
    expect(stage.contentH).toBeCloseTo(300, 8);
    expect(stage.extendTop).toBe(0);
    expect(stage.extendBottom).toBe(0);
    expect(stage.offsetX).toBeCloseTo((400 - stage.cell * STREET_W) / 2, 8);
    expect(stage.offsetX).toBeGreaterThan(0);
  });

  it("a square-ish box still fills its height exactly", () => {
    const stage = stageFit(500, 500);
    expect(stage.stageH).toBe(500);
    expect(stage.contentH + stage.extendTop + stage.extendBottom).toBeCloseTo(500, 6);
  });
});

describe("v343 frame — plaques live inside the world and never collide", () => {
  const map: MapState = {
    buildings: [
      { id: "diner-a", type: "diner", x: 6, y: 0, level: 3, accumulated: 0 },
      { id: "home-1", type: "pawn-house", x: 4, y: 6, level: 1, accumulated: 0 },
      { id: "shop-1", type: "shop", x: 1, y: 3, level: 1, accumulated: 0 },
    ],
    decorations: [],
    roads: [],
  } as unknown as MapState;

  it("every rect is inside the world; no two overlap; long words are sized whole", () => {
    // On the real frame: a tall phone box, fitted by stageFit.
    const stage = stageFit(400, 860);
    const cell = stage.cell;
    const world = deriveStreetWorld(map, { eraId: "david" });
    const worldW = world.w * cell;
    // The seats exactly as the renderer builds them (wide-street.tsx).
    const fontSize = Math.max(10, 10.5 * (cell / 40));
    // v355 re-base (Oct 29): the ONE label system lays the plaques
    // out against the WHOLE frame — its bottom bound is the
    // river's top edge (a v343 plaque could hang into the river
    // band; the audit's frame said never over the water) — clear
    // of the places' art as well as of each other.
    const placeKey = (p: (typeof world.places)[number]) =>
      `place-${p.kind}-${p.buildingId ?? p.landmark?.id ?? `${p.x}-${p.y}`}`;
    // Reserved art = each place's walls band; bank places seat
    // above their doors — the renderer's own seats (v355).
    const reserved = world.places.map((p) => ({
      key: placeKey(p),
      left: p.x * cell,
      top: (p.y + p.h * 0.4) * cell,
      width: p.w * cell,
      height: p.h * 0.6 * cell,
    }));
    const pillH = Math.ceil(fontSize * 1.5) + 6;
    const riverTopPx = (STREET_H - 1) * cell;
    const seats = world.places
      .filter((p) => p.plaque)
      .map((p) => {
        const feetTop = (p.y + p.h) * cell + 3;
        return {
          key: `plaque-${p.kind}-${p.buildingId ?? p.landmark?.id ?? `${p.x}`}`,
          label: p.plaque!,
          cx: (p.x + p.w / 2) * cell,
          top: feetTop + pillH > riverTopPx ? p.y * cell - pillH - 3 : feetTop,
          fontSize,
          avoidKey: placeKey(p),
        };
      });
    const rects = layoutStageLabels(seats, { w: worldW, h: (STREET_H - 1) * cell }, reserved);
    expect(rects.length).toBeGreaterThan(5);
    for (const r of rects) {
      expect(r.left, r.label).toBeGreaterThanOrEqual(0);
      expect(r.top, r.label).toBeGreaterThanOrEqual(0);
      expect(r.left + r.width, r.label).toBeLessThanOrEqual(worldW);
      // The bottom bound is the river's top edge — nothing over
      // the water, ever (v355; v343 allowed the river band).
      expect(r.top + r.height, r.label).toBeLessThanOrEqual((STREET_H - 1) * cell);
      // The pill is exactly as wide as its whole word measures.
      expect(r.width, r.label).toBe(labelPillWidth(r.label, fontSize));
    }
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];
        const overlap =
          a.left < b.left + b.width && b.left < a.left + a.width &&
          a.top < b.top + b.height && b.top < a.top + a.height;
        expect(overlap, `${a.label} × ${b.label}`).toBe(false);
      }
    }
    // The longest words on the street ride along, whole.
    const labels = rects.map((r) => r.label);
    expect(labels).toContain("Garden of Remembrance");
    expect(labels).toContain("River of Life");
  });
});

describe("v343 frame — the screen's seats (source pins)", () => {
  const src = read("app/hometown.tsx");

  it("the town world wears no border frame; the other worlds keep theirs", () => {
    expect(src).toContain("function TownFrame(");
    expect(src).toContain("framed={!isTownWorld}");
    expect(src).toContain("if (!framed) return <>{children}</>;");
  });

  it("the header is a flow block above the world — the overlay is gone", () => {
    expect(src).toContain("{isTownWorld && (");
    expect(src).toContain("{renderTownHeader()}");
    expect(src).not.toContain("v307 HUD");
  });

  it("the café walk-up collects nothing; collecting is by hand at the pile", () => {
    const at = src.indexOf("const runStreetPlace");
    const block = src.slice(at, src.indexOf("const handleStreetPlacePress", at));
    const cafeCase = block.slice(block.indexOf('case "cafe":'), block.indexOf('case "mine":'));
    expect(cafeCase).not.toContain("handleCollectBuilding");
    expect(cafeCase).not.toContain("collectPendingRegister");
    expect(src).toContain("handleCollectPilePress");
  });

  it("a forest defeat wakes the hero at home", () => {
    expect(src).toContain('onDefeatWake={() => switchMap("town")}');
  });

  it("the street derivation is stamped with the live era", () => {
    expect(src).toContain("eraId: townEra?.id ?? null");
  });

  it("the school cafeteria wears its own route", () => {
    expect(src).toContain('"/school-cafeteria-interior"');
  });
});

describe("v343 night — the town sleeps, the hero walks", () => {
  it("the phase windows are the mock's: dawn 5–8, day 8–17, dusk 17–20, night 20–5", () => {
    expect(phaseForHour(4)).toBe("night");
    expect(phaseForHour(5)).toBe("dawn");
    expect(phaseForHour(7)).toBe("dawn");
    expect(phaseForHour(8)).toBe("day");
    expect(phaseForHour(16)).toBe("day");
    expect(phaseForHour(17)).toBe("dusk");
    expect(phaseForHour(19)).toBe("dusk");
    expect(phaseForHour(20)).toBe("night");
    expect(phaseForHour(23)).toBe("night");
  });

  it("windows light at dusk and night, never in the day", () => {
    expect(phaseWindowsLit("dusk")).toBe(true);
    expect(phaseWindowsLit("night")).toBe(true);
    expect(phaseWindowsLit("day")).toBe(false);
    expect(phaseWindowsLit("dawn")).toBe(false);
  });

  it("the villagers leave the street at night (they rest at their own doors)", () => {
    const villagers = read("components/street-villagers.tsx");
    expect(villagers).toContain('if (phase === "night") return null;');
  });

  it("the screen's phase derives from the date rule, refreshed on the 5-minute clock", () => {
    const src = read("app/hometown.tsx");
    expect(src).toContain("useState<DayPhase>(() => phaseForDate())");
    expect(src).toContain("setDayPhase(phaseForDate())");
  });
});
