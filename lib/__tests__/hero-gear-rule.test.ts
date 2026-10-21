// The HERO GEAR RULE (Jonathan, 2026-10-21): the hero wears armor
// and weapons ONLY in the Dark Forest. Everywhere else — town/city
// wandering, interiors, schedule scenes, mood scenes, profile — he
// wears his normal clothes: equipped outfit/tunic, hair, beard.
//
// The distinction lives at the renderer level: HeroForPawn /
// PawnPreview take a `context` that DEFAULTS to "world" (clothes
// only — the safe default). Gear is opt-in: a surface must pass
// context="forest" explicitly. The Dark Forest's combat render
// (components/dark-forest.tsx) composes its own geared hero inline
// and keeps the full composition: sprite + armor + weapon + clothes
// + hair + beard with live growth.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readSrc(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const heroSprite = readSrc("components/hero-sprite.tsx");
const pawnPreview = readSrc("components/pawn-preview.tsx");
const darkForest = readSrc("components/dark-forest.tsx");
const hometown = readSrc("app/hometown.tsx");

describe("gear rule — the renderer defaults to clothes", () => {
  it("HeroForPawn takes a context that defaults to world", () => {
    expect(heroSprite).toContain('export type HeroContext = "world" | "forest"');
    expect(heroSprite).toContain('context = "world"');
    expect(heroSprite).toContain('const geared = context === "forest"');
  });

  it("armor + weapon reach the figure ONLY through the forest gate", () => {
    expect(heroSprite).toContain("armorId={geared ? (equipped?.armor ?? null) : null}");
    expect(heroSprite).toContain("weaponId={geared ? (equipped?.weapon ?? null) : null}");
    // the old unconditional composition (gear everywhere) is gone
    expect(heroSprite).not.toContain("armorId={equipped?.armor ?? null}");
    expect(heroSprite).not.toContain("weaponId={equipped?.weapon ?? null}");
  });

  it("clothes flow in BOTH contexts — the tunic is the world look", () => {
    expect(heroSprite).toContain("clothes?.visual.bodyColor ?? pawn.bodyColor");
  });

  it("PawnPreview defaults to world and forwards the context", () => {
    expect(pawnPreview).toContain('context = "world"');
    expect(pawnPreview).toContain("context={context}");
  });
});

describe("gear rule — the forest keeps its full composition", () => {
  it("DarkForest still composes sprite + armor + weapon + hair + beard", () => {
    expect(darkForest).toContain("ArmorShapes");
    expect(darkForest).toContain("WeaponShapes");
    expect(darkForest).toContain("HeroHair");
    expect(darkForest).toContain("HeroBeard");
  });

  it("hometown feeds the forest its equipped gear + live beard growth", () => {
    expect(hometown).toContain("armorId={forestArmor}");
    expect(hometown).toContain("weaponId={forestWeapon}");
    expect(hometown).toContain("beardLength={forestPawn ? beardGrowthFor(forestPawn) : 0}");
  });

  it("no world surface opts into the forest context", () => {
    // The town wanderer and the Today companion render the default —
    // neither may pass the forest context (or a weapon angle, the old
    // mood-scene habit of carrying his blade at rest).
    const wanderer = readSrc("components/player-pawn.tsx");
    const mood = readSrc("components/pawn-mood-scene.tsx");
    expect(wanderer).not.toContain('context="forest"');
    expect(mood).not.toContain('context="forest"');
    expect(mood).not.toContain('weaponAngle="8deg"');
  });

  it("the paper hero (paper kit) never draws armor or weapons", () => {
    const paperKit = readSrc("components/paper-interior.tsx");
    expect(paperKit).not.toContain("ArmorShapes");
    expect(paperKit).not.toContain("WeaponShapes");
    expect(paperKit).not.toContain("armorId");
    expect(paperKit).not.toContain("weaponId");
  });
});
