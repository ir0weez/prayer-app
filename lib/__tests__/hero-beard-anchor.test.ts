// The hero's missing beard (Jonathan's verdict, 2026-10-21: "there's
// no beard… for the hero I mean").
//
// Root cause: the ORIGINAL pawn record (the first pawn creator)
// predates the growth system — it stored no beardStyle, no
// beardLength and NO lastTrim anchor at all. parseCustomPawn used to
// substitute "now" for a missing anchor, and since that substitution
// lived only in the parsed copy, every single load of a legacy
// record re-anchored the trim clock to the moment of loading:
// days-since-trim was always 0, the stored base length is 0, growth
// computed 0 forever, and beardShapeFor(growth 0) is invisible — a
// hero whose style said "full beard" stood permanently clean-shaven
// on every surface, because every surface faithfully renders the
// same parsed pawn (paper hero, house poses, forest hero).
//
// The fix (lib/pawn growthAnchorFor): an unreadable anchor resolves
// to the hero's creation date — fully grown by the weekly ramp's cap
// — and beardGrowthFor/hairGrowthFor treat an anchor they cannot
// read as fully grown rather than zero. A man who picked a beard
// style HAS a beard. The pacing contract is untouched: a real trim
// anchor still starts at day 0 and reaches full at day 6.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PAWN_BEARD_STYLES,
  beardGrowthFor,
  beardShapeFor,
  growthValueForDays,
  hairGrowthFor,
  parseCustomPawn,
  type CustomPawn,
} from "../pawn";

function readSrc(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const DAY = 86400000;
const isoDaysAgo = (days: number) => new Date(Date.now() - days * DAY).toISOString();

/** The original pawn record shape — the first creator's fields only:
 *  no beard fields, no trim anchors, no gender/hair fields. */
const ORIGINAL_RECORD = {
  id: "pawn-legacy",
  name: "Pebble",
  bodyColor: "#7C5CFF",
  eyeStyle: "round",
  mouthStyle: "smile",
  accessory: "none",
  createdAt: isoDaysAgo(90),
};

describe("legacy saves — a styled beard is VISIBLE, not locked at zero", () => {
  it("the original pre-beard record grows the default full beard to full", () => {
    const pawn = parseCustomPawn(ORIGINAL_RECORD);
    expect(pawn).not.toBeNull();
    expect(pawn!.beardStyle).toBe("full"); // the long-standing parse fallback
    const growth = beardGrowthFor(pawn!);
    expect(growth).toBe(100);
    const shape = beardShapeFor(pawn!.beardStyle, growth);
    expect(shape.visible).toBe(true);
    expect(shape.coverage).toBeGreaterThan(0.9);
  });

  it("a legacy record that kept its style but lost its anchor wears that style, full", () => {
    for (const style of ["full", "goatee", "mustache", "gilded", "radiant", "heavenly"] as const) {
      const pawn = parseCustomPawn({ ...ORIGINAL_RECORD, beardStyle: style });
      expect(pawn).not.toBeNull();
      const shape = beardShapeFor(pawn!.beardStyle, beardGrowthFor(pawn!));
      expect(shape.visible).toBe(true);
    }
    const goatee = parseCustomPawn({ ...ORIGINAL_RECORD, beardStyle: "goatee" })!;
    expect(beardShapeFor(goatee.beardStyle, beardGrowthFor(goatee)).family).toBe("goatee");
  });

  it("a numeric (wrong-type) anchor falls back to the creation date, not to now", () => {
    const pawn = parseCustomPawn({ ...ORIGINAL_RECORD, lastTrim: 1720000000000, lastHaircut: 1720000000000 });
    expect(pawn).not.toBeNull();
    expect(beardGrowthFor(pawn!)).toBe(100);
    expect(hairGrowthFor(pawn!)).toBe(100);
  });

  it("an unparseable anchor AND unparseable creation date still resolve fully grown", () => {
    const pawn = parseCustomPawn({ ...ORIGINAL_RECORD, createdAt: "not-a-date", lastTrim: "also-not-a-date" });
    expect(pawn).not.toBeNull();
    expect(beardGrowthFor(pawn!)).toBe(100);
  });

  it("style 'none' stays clean even on a legacy record — the fix grows only chosen beards", () => {
    const pawn = parseCustomPawn({ ...ORIGINAL_RECORD, beardStyle: "none" })!;
    expect(beardShapeFor(pawn.beardStyle, beardGrowthFor(pawn)).visible).toBe(false);
  });

  it("an anchor beardGrowthFor cannot read (unparsed record) is fully grown, never zero", () => {
    const pawn = parseCustomPawn(ORIGINAL_RECORD)!;
    const corrupt: CustomPawn = { ...pawn, lastTrim: "not-a-date", lastHaircut: "not-a-date" };
    expect(beardGrowthFor(corrupt)).toBe(100);
    expect(hairGrowthFor(corrupt)).toBe(100);
  });
});

describe("the pacing contract is untouched for real anchors", () => {
  const base = parseCustomPawn(ORIGINAL_RECORD)!;

  it("day 0 — the day of the trim itself — is clean, base length respected", () => {
    const fresh: CustomPawn = { ...base, lastTrim: new Date().toISOString(), beardLength: 0 };
    expect(beardGrowthFor(fresh)).toBe(0);
    const based: CustomPawn = { ...base, lastTrim: new Date().toISOString(), beardLength: 40 };
    expect(beardGrowthFor(based)).toBe(40);
  });

  it("mid-ramp grows, day 6 is exactly full, and it plateaus after", () => {
    const threeDays: CustomPawn = { ...base, lastTrim: isoDaysAgo(3), beardLength: 0 };
    const mid = beardGrowthFor(threeDays);
    expect(mid).toBeGreaterThanOrEqual(50);
    expect(mid).toBeLessThan(100);
    const sixDays: CustomPawn = { ...base, lastTrim: isoDaysAgo(6), beardLength: 0 };
    expect(beardGrowthFor(sixDays)).toBe(100);
    const longAgo: CustomPawn = { ...base, lastTrim: isoDaysAgo(60), beardLength: 0 };
    expect(beardGrowthFor(longAgo)).toBe(100);
  });
});

describe("day-1 growth renders a non-empty beard for every style (candidate b)", () => {
  it("one day after a trim, every non-none style has a visible shape with real coverage", () => {
    const dayOne = growthValueForDays(1);
    expect(dayOne).toBeGreaterThan(0);
    for (const { id } of PAWN_BEARD_STYLES) {
      const shape = beardShapeFor(id, dayOne);
      if (id === "none") {
        expect(shape.visible).toBe(false);
      } else {
        expect(shape.visible).toBe(true);
        expect(shape.coverage).toBeGreaterThan(0);
        expect(shape.opacity).toBeGreaterThan(0);
      }
    }
  });
});

describe("hero call sites pass the beard through (candidate c audit)", () => {
  it("the paper hero derives style + live growth from the pawn itself", () => {
    const kit = readSrc("components/paper-interior.tsx");
    expect(kit).toContain("beardGrowthFor(pawn)");
    expect(kit).toContain("beardShapeFor(beardStyle, beardLength)");
    expect(kit).toContain("paperBeardFront({");
  });

  it("the house pose heads use the same live growth + shape vocabulary", () => {
    const room = readSrc("components/paper-room.tsx");
    expect(room).toContain("beardGrowthFor(pawn)");
    expect(room).toContain("beardShapeFor(pawn.beardStyle, beardLength)");
  });

  it("the Dark Forest hero receives the pawn's style and its live-grown length", () => {
    const sprite = readSrc("components/hero-sprite.tsx");
    expect(sprite).toContain("beardGrowthFor(pawn)");
    expect(sprite).toContain("beardStyle={pawn.beardStyle}");
    expect(sprite).toContain("beardLength={beardLength}");
  });

  it("parse resolves trim anchors through the legacy-aware helper", () => {
    const pawn = readSrc("lib/pawn.ts");
    expect(pawn).toContain("growthAnchorFor(p.lastTrim, p.createdAt)");
    expect(pawn).toContain("growthAnchorFor(p.lastHaircut, p.createdAt)");
  });
});
