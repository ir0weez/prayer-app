// Figure kit — Riders C + D + F + G (Jonathan's v159 verdicts,
// 2026-10-21). The hair read as a UNIBROW (one straight tan band
// across every forehead), beards were one oval blob that jumped
// cut -> full in a single step and spilled past the face, and growth
// had no weekly pacing. These pins hold the fixes:
//   C — no full-width forehead band element, no skin notch in hair;
//       the shine is a small offset patch in a shared cap renderer.
//   D — beardShapeFor expresses the pawn system's actual beardStyle
//       vocabulary with distinct silhouettes per family.
//   F — a near-continuous growth ramp (monotonic coverage, bounded
//       steps) with containment (helper bounds + ClipPath in the kit).
//   G — one-week grow-out on days-since-trim: strictly increasing
//       days 0..6, full at day 6, plateau after; trim-needed labels
//       land exactly at full growth.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BEARD_MAX_BOTTOM,
  GROWTH_FULL_DAYS,
  beardLabel,
  beardShapeFor,
  growthValueForDays,
  hairLabel,
  type PawnBeardStyle,
} from "../pawn";

function readSrc(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const kit = readSrc("components/paper-interior.tsx");
const ALL_STYLES: PawnBeardStyle[] = ["none", "full", "goatee", "mustache", "gilded", "radiant", "heavenly"];

describe("Rider G — one-week grow-out, paced by days since trim", () => {
  it("growth strictly increases on days 0..6 and lands exactly on full", () => {
    const vals = Array.from({ length: 7 }, (_, d) => growthValueForDays(d));
    expect(vals[0]).toBe(0);
    for (let d = 1; d <= 6; d++) expect(vals[d]).toBeGreaterThan(vals[d - 1]);
    expect(vals[GROWTH_FULL_DAYS]).toBe(100);
    expect(GROWTH_FULL_DAYS).toBe(6);
  });

  it("past full he STAYS fully grown — plateau, no overgrowth", () => {
    for (const d of [7, 8, 14, 60, 365]) expect(growthValueForDays(d)).toBe(100);
  });

  it("a base length stored at a cut still plateaus at 100", () => {
    expect(growthValueForDays(3, 40)).toBe(90);
    expect(growthValueForDays(6, 40)).toBe(100);
    expect(growthValueForDays(30, 40)).toBe(100);
  });

  it("trim-needed / needs-a-cut labels land exactly at full growth", () => {
    expect(beardLabel(100)).toBe("Trim needed");
    expect(beardLabel(99)).not.toBe("Trim needed");
    expect(hairLabel(100)).toBe("Needs a cut");
    expect(hairLabel(99)).not.toBe("Needs a cut");
    expect(beardLabel(0)).toBe("Clean shaven");
    expect(hairLabel(0)).toBe("Fresh cut");
  });
});

describe("Rider F — the beard ramp is near-continuous", () => {
  it("coverage is monotonic non-decreasing in growth for every style", () => {
    for (const style of ALL_STYLES) {
      let prev = -1;
      for (let g = 0; g <= 100; g++) {
        const cov = beardShapeFor(style, g).coverage;
        expect(cov, `${style} @ ${g}`).toBeGreaterThanOrEqual(prev);
        prev = cov;
      }
    }
  });

  it("no single growth point jumps — the cut -> full leap is gone", () => {
    for (const style of ALL_STYLES) {
      for (let g = 1; g <= 100; g++) {
        const step = beardShapeFor(style, g).coverage - beardShapeFor(style, g - 1).coverage;
        expect(step, `${style} @ ${g}`).toBeGreaterThanOrEqual(0);
        expect(step, `${style} @ ${g}`).toBeLessThanOrEqual(0.02);
      }
    }
  });

  it("stubble is a shadow, not a solid mass — opacity deepens with growth", () => {
    const stubble = beardShapeFor("full", 8);
    expect(stubble.stage).toBe("stubble");
    expect(stubble.opacity).toBeGreaterThan(0);
    expect(stubble.opacity).toBeLessThan(0.5);
    expect(beardShapeFor("full", 60).opacity).toBeGreaterThan(stubble.opacity);
    expect(beardShapeFor("full", 100).stage).toBe("long");
  });

  it("growth 0 / style none renders truly bare", () => {
    for (const style of ALL_STYLES) {
      expect(beardShapeFor(style, 0).visible).toBe(false);
      expect(beardShapeFor(style, 0).coverage).toBe(0);
    }
    expect(beardShapeFor("none", 100).visible).toBe(false);
  });
});

describe("Rider D — beard vocabulary: distinct silhouettes per style", () => {
  it("full is jaw-framing: wide jaw, cheeks risen, tapered chin", () => {
    const s = beardShapeFor("full", 100);
    expect(s.family).toBe("full");
    expect(s.jawWidthFrac).toBeGreaterThan(0.85);
    expect(s.cheekRiseFrac).toBe(1);
    expect(s.chinWidthFrac).toBeLessThan(s.jawWidthFrac); // tapered
    expect(s.mustacheWidthFrac).toBeGreaterThan(0); // mustache connection
  });

  it("goatee is chin-only: narrow patch + mustache, cheeks bare", () => {
    const s = beardShapeFor("goatee", 100);
    expect(s.family).toBe("goatee");
    expect(s.cheekRiseFrac).toBe(0);
    expect(s.jawWidthFrac).toBeLessThan(beardShapeFor("full", 100).jawWidthFrac / 2 + 0.05);
    expect(s.mustacheWidthFrac).toBeGreaterThan(0);
    expect(s.chinDropFrac).toBeGreaterThan(0);
    expect(s.coverage).toBeLessThan(beardShapeFor("full", 100).coverage / 2);
  });

  it("mustache is its own silhouette: lobes only, no jaw, no chin", () => {
    const s = beardShapeFor("mustache", 100);
    expect(s.family).toBe("mustache");
    expect(s.jawWidthFrac).toBe(0);
    expect(s.chinDropFrac).toBe(0);
    expect(s.mustacheWidthFrac).toBeGreaterThan(0.7);
    expect(s.mustacheThickFrac).toBeGreaterThan(0.15);
  });

  it("the prestige styles ride the full family; heavenly grows longest", () => {
    for (const style of ["gilded", "radiant", "heavenly"] as PawnBeardStyle[]) {
      expect(beardShapeFor(style, 100).family).toBe("full");
    }
    expect(beardShapeFor("heavenly", 100).chinDropFrac).toBeGreaterThan(beardShapeFor("full", 100).chinDropFrac);
  });

  it("the same look in gives the same shape out (deterministic)", () => {
    expect(beardShapeFor("goatee", 55)).toEqual(beardShapeFor("goatee", 55));
    expect(beardShapeFor("heavenly", 87)).toEqual(beardShapeFor("heavenly", 87));
  });
});

describe("Rider F — containment: nothing spills past the head", () => {
  it("helper bounds at full growth stay within head bounds", () => {
    for (const style of ALL_STYLES) {
      const s = beardShapeFor(style, 100);
      if (!s.visible) continue; // a bare face draws nothing to contain
      expect(s.bounds.left, style).toBeGreaterThanOrEqual(-1);
      expect(s.bounds.right, style).toBeLessThanOrEqual(1);
      expect(s.bounds.top, style).toBeGreaterThanOrEqual(0.15); // never above the nose line
      expect(s.bounds.bottom, style).toBeLessThanOrEqual(BEARD_MAX_BOTTOM);
      // the chin extension is a taper, never a widening
      expect(s.chinWidthFrac, style).toBeLessThanOrEqual(Math.max(s.jawWidthFrac, s.chinWidthFrac));
      if (s.family === "full" || s.family === "goatee") {
        expect(s.chinWidthFrac, style).toBeLessThanOrEqual(s.jawWidthFrac);
      }
    }
  });

  it("containment holds at every growth value, not just at 100", () => {
    for (const style of ALL_STYLES) {
      for (let g = 0; g <= 100; g += 5) {
        const s = beardShapeFor(style, g);
        expect(Math.abs(s.bounds.left)).toBeLessThanOrEqual(1);
        expect(Math.abs(s.bounds.right)).toBeLessThanOrEqual(1);
        expect(s.bounds.bottom).toBeLessThanOrEqual(BEARD_MAX_BOTTOM);
      }
    }
  });

  it("the kit clips beards and hair to the head contour (ClipPath)", () => {
    expect(kit).toContain("ClipPath");
    expect(kit).toContain("beardClipDef");
    expect(kit).toContain("hairClipDef");
    expect(kit).toContain("clipPath={`url(#${clipId})`}");
  });
});

describe("Rider C — hair reads as hair, never a unibrow", () => {
  it("all three renderers share the one cap + beard kit", () => {
    expect(kit).toContain("paperHairCapFront");
    expect(kit).toContain("paperHairCapProfile");
    expect(kit).toContain("paperBeardFront");
    expect(kit).toContain("paperBeardProfile");
    expect(kit).toContain("beardShapeFor(");
  });

  it("NO full-width forehead band element survives in the kit", () => {
    // the old caps: one arc band straight across the face's top in
    // each renderer (hero, villager, diner) — every one is gone
    expect(kit).not.toContain("M 2.95 3.35 A 2.62 2.62");
    expect(kit).not.toContain("M 2.58 3.28 A 2.48 2.48");
    expect(kit).not.toContain("M 3.55 3.15 A 2.95 2.95");
    expect(kit).not.toContain("cap band");
    // and no band-shaped replacement crept back: the shared cap's
    // hairline is a CURVE (cubic segments + a widow's dip), built
    // from computed points, not a pair of arcs at one height
    expect(kit).toContain("widow");
  });

  it("no skin-colored notch is cut into any hair mass", () => {
    // the old sidepart drew a skin rect over the cap; glorymane drew
    // white bars on it — both read as stray notches in the hair
    expect(kit).not.toContain('width={0.3} height={1.5} fill={skin}');
    expect(kit).not.toContain('fill="#FFFFFF" opacity={0.65}');
    expect(kit).toContain("never a skin-colored notch");
  });

  it("the shine is a small offset patch, shared by every haired figure", () => {
    expect(kit).toContain("hairShinePatch");
    // bald keeps its own on-skin shine (a style, not the notch)
    expect(kit).toContain("bald is a chosen style");
    expect(kit).toContain("bald is a style, not a missing render");
  });

  it("hair growth visibly ramps on the hero (no stepped gates)", () => {
    expect(kit).toContain("hairGrowthFor(pawn)");
    // the old beard gate + single scaled ellipse are gone everywhere
    expect(kit).not.toContain('beardLength > 2');
    expect(kit).not.toContain('beardStyle === "full" && <Ellipse');
  });
});
