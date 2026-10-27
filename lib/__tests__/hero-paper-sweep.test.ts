/**
 * Hero paper sweep guard pins (Jonathan, 2026-10-21): "make my hero
 * match the paper everywhere except for the dark forest (obviously)".
 * Every world-context render of the hero routes to the paper figure;
 * the pixel hero (HeroFigure/HeroForPawn/HeroThumbnail) survives ONLY
 * in the Dark Forest composition, its definition file, the shelved
 * pixel kit, PawnPreview's unused forest branch, and FastPawnShape.
 *
 * v280 note: the board and its 24-piece collectible pawn catalog
 * were deleted with the board layer (Jonathan, Oct 26 19:00).
 * FastPawnShape moved into pawn-preview.tsx and now renders only
 * the Town Shop's three hero skins (Shadow/Rainbow/Diamond Pebble)
 * plus the base pebble — purchasable Hometown cosmetics, not a
 * collection. The board token (TodayPawn) is gone with the board.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

describe("world hero renders route to the paper figure", () => {
  it("PawnPreview renders the paper hero in the world context", () => {
    const src = read("components/pawn-preview.tsx");
    expect(src).toContain("PaperHeroFigure pawn={effPawn}");
    expect(src).toContain('context = "world"');
    // Clothes previews recolor the paper hero (fitting-room rule).
    expect(src).toContain("clothesItem?.visual.bodyColor ?? pawn.bodyColor");
  });

  it("creator + barbershop option grids preview with the paper thumbnail", () => {
    for (const f of ["app/pawn-creator.tsx", "app/barbershop.tsx"]) {
      const src = read(f);
      expect(src, f).toContain("PaperHeroThumbnail");
      expect(src, f).not.toContain("<HeroThumbnail");
    }
  });

  it("the fasting profile hero card goes through PawnPreview", () => {
    expect(read("app/profile.tsx")).toContain("<PawnPreview");
    expect(read("app/opera-house-interior.tsx")).toContain("<PawnPreview");
  });

  it("the map hero is a paper figure", () => {
    expect(read("components/player-pawn.tsx")).toContain("PaperHeroFigure");
  });
});

describe("no pixel hero renders remain in world surfaces", () => {
  const ALLOWED = new Set([
    "components/hero-sprite.tsx", // the pixel hero's definition (forest)
    "components/dark-forest.tsx", // the forest composition itself
    "components/pawn-preview.tsx", // the unused context=forest branch
    "components/pixel-taco-room.tsx", // shelved pixel kit, unreachable
    // v280: components/fast-board.tsx was deleted with the board;
    // FastPawnShape lives in pawn-preview.tsx now (already allowed
    // above for its forest branch).
  ]);
  const PIXEL_JSX = /<(HeroFigure|HeroForPawn|HeroThumbnail)[\s>]/;

  it("scan: no app/component file outside the allowlist renders a pixel hero", () => {
    const offenders: string[] = [];
    for (const dir of ["app", "components"]) {
      for (const f of readdirSync(join(ROOT, dir))) {
        if (!f.endsWith(".tsx")) continue;
        const rel = `${dir}/${f}`;
        if (ALLOWED.has(rel)) continue;
        if (PIXEL_JSX.test(read(rel))) offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("the Dark Forest keeps the pixel hero, untouched by paper", () => {
  const forest = read("components/dark-forest.tsx");

  it("contains no paper-hero routing", () => {
    expect(forest).not.toContain("PaperHeroFigure");
    expect(forest).not.toContain("PaperHeroThumbnail");
    expect(forest).not.toContain("PawnPreview");
  });

  it("still composes the geared pixel hero from the sprite primitives", () => {
    expect(forest).toContain("PixelSprite");
    expect(forest).toContain("ArmorShapes");
    expect(forest).toContain("WeaponShapes");
    expect(forest).toContain("HeroHair");
    expect(forest).toContain("HeroBeard");
  });
});
