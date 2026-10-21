// Building art direction: every BuildingType renders through BuildingArt
// in the one cohesive storybook style — no type may fall through to the
// gray default blob, no emoji glyphs stand in for drawn art, and the
// upgrade transformation (BuildingArtFX) stays wired at the map render.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const hometownSrc = readFileSync(join(process.cwd(), "app/hometown.tsx"), "utf8");
const libSrc = readFileSync(join(process.cwd(), "lib/hometown.ts"), "utf8");

// The BuildingArt switch spans from the function to its memoized wrapper.
const artStart = hometownSrc.indexOf("function BuildingArt(");
const artEnd = hometownSrc.indexOf("const MemoBuildingArt", artStart);
const art = hometownSrc.slice(artStart, artEnd);

// Parse every member of the BuildingType union out of lib/hometown.ts.
// (Slice to the next export and strip // comments first — a union comment
// contains a semicolon, so a naive ";" cut truncates the member list.)
const unionStart = libSrc.indexOf("export type BuildingType =");
const unionEnd = libSrc.indexOf("export type DecorationType", unionStart);
const unionBody = libSrc
  .slice(unionStart, unionEnd)
  .replace(/\/\/[^\n]*/g, "");
const buildingTypes = [...unionBody.matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);

describe("building art direction", () => {
  it("parses the full BuildingType union", () => {
    expect(buildingTypes.length).toBeGreaterThan(50);
    expect(buildingTypes).toContain("church");
    expect(buildingTypes).toContain("coffee-roastery");
  });

  it("every building type has a BuildingArt case — nothing falls to the blob", () => {
    const missing = buildingTypes.filter((t) => !art.includes(`case "${t}"`));
    expect(missing).toEqual([]);
  });

  it("no emoji glyphs are used as building art", () => {
    for (const glyph of ["🍔", "📚", "🕹️", "📖"]) {
      expect(art).not.toContain(glyph);
    }
  });

  it("the storybook kit is defined and is the shared style entry point", () => {
    expect(hometownSrc).toContain("function storybook(opts:");
    // Used broadly across the redrawn set (house alone calls it per tier).
    const calls = art.match(/storybook\(\{/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(30);
  });

  it("the upgrade transformation wraps the map render in sine ease", () => {
    expect(hometownSrc).toContain("const BuildingArtFX");
    expect(hometownSrc).toContain("<BuildingArtFX type={b.type}");
    const fxStart = hometownSrc.indexOf("const BuildingArtFX");
    const fx = hometownSrc.slice(fxStart, fxStart + 3000);
    expect(fx).toContain("Easing.inOut(Easing.sin)");
    expect(fx).toContain("useNativeDriver: true");
    expect(fx).not.toContain("spring");
  });
});
