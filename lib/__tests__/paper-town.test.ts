// Paper Town guards (2026-10-21): the town/city/school maps render in
// the paper cutout language — every BuildingType has exactly one paper
// exterior renderer and its level ladder still climbs; map villagers
// are paper figures whose look IS the interior look for the same
// person; the villager-locations filter still gates rendering; the
// construction cover is paper and keeps its sine sway; night glass
// still glows; and the Dark Forest is never routed through paper.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PAPER_LANDMARKS,
  PAPER_SPECIAL_SCENES,
  PAPER_STORY_CONFIGS,
  PAPER_TOWER_CONFIGS,
  exteriorDressingFor,
  exteriorPieceScore,
  paperCityLookFor,
  paperEmbassyFlags,
  paperDecorationKind,
  paperMapLookFor,
  paperRendererFor,
  paperTowerRows,
  paperWindowLit,
} from "../paper-town";
import { paperDinerLookFor } from "../paper-interior";
import type { BuildingType } from "../hometown";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const hometownSrc = read("app/hometown.tsx");
const libSrc = read("lib/hometown.ts");
const npcsSrc = read("components/town-npcs.tsx");

// Parse every member of the BuildingType union out of lib/hometown.ts
// (same approach as building-art.test.ts).
const unionStart = libSrc.indexOf("export type BuildingType =");
const unionEnd = libSrc.indexOf("export type DecorationType", unionStart);
const unionBody = libSrc.slice(unionStart, unionEnd).replace(/\/\/[^\n]*/g, "");
const buildingTypes = [...unionBody.matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);

describe("paper town — renderer coverage", () => {
  it("parses the full BuildingType union", () => {
    expect(buildingTypes.length).toBeGreaterThan(50);
  });

  it("every BuildingType has exactly one paper renderer", () => {
    for (const t of buildingTypes) {
      const buckets = [
        t in PAPER_STORY_CONFIGS,
        t in PAPER_TOWER_CONFIGS,
        PAPER_SPECIAL_SCENES.has(t),
      ].filter(Boolean);
      expect(buckets.length, t).toBe(1);
      expect(paperRendererFor(t as BuildingType), t).not.toBeNull();
    }
    const total =
      Object.keys(PAPER_STORY_CONFIGS).length +
      Object.keys(PAPER_TOWER_CONFIGS).length +
      PAPER_SPECIAL_SCENES.size;
    expect(total).toBe(buildingTypes.length);
  });

  it("every special scene type has a drawn scene (no generic fallback)", () => {
    const artSrc = read("components/paper-building-art.tsx");
    for (const t of PAPER_SPECIAL_SCENES) {
      expect(artSrc, t).toContain(`case "${t}":`);
    }
  });

  it("the landmark scenes cover the five map gates", () => {
    expect([...PAPER_LANDMARKS].sort()).toEqual([
      "dark-forest",
      "garden-gate",
      "mission-field",
      "river-dock",
      "well",
    ]);
  });
});

describe("paper town — level ladders climb", () => {
  it("the storefront dressing score strictly climbs L1 < L2 < L3", () => {
    const s1 = exteriorPieceScore(exteriorDressingFor(1));
    const s2 = exteriorPieceScore(exteriorDressingFor(2));
    const s3 = exteriorPieceScore(exteriorDressingFor(3));
    expect(s1).toBeLessThan(s2);
    expect(s2).toBeLessThan(s3);
  });

  it("each rung adds named pieces, never just a tint", () => {
    const d1 = exteriorDressingFor(1);
    const d2 = exteriorDressingFor(2);
    const d3 = exteriorDressingFor(3);
    expect(d1.windows).toBe(1);
    expect(d2.windows).toBe(2);
    expect(d2.doorGlass).toBe(true);
    expect(d2.pots).toBe(true);
    expect(d3.flowerBoxes).toBe(true);
    expect(d3.banners).toBe(true);
    expect(d3.goldTrim).toBe(true);
    expect(d3.gildedRoof).toBe(true);
    expect(d3.stoneStep).toBe(true);
  });

  it("towers grow rows with level (and the bank tower with floors)", () => {
    expect(paperTowerRows("department-store", 3, 1)).toBeGreaterThan(
      paperTowerRows("department-store", 1, 1)
    );
    expect(paperTowerRows("grand-library", 3, 1)).toBeGreaterThan(
      paperTowerRows("grand-library", 1, 1)
    );
    expect(paperTowerRows("embassy", 3, 1)).toBeGreaterThan(paperTowerRows("embassy", 1, 1));
    expect(paperTowerRows("bank-tower", 1, 5)).toBe(5);
    expect(paperTowerRows("bank-tower", 3, 2)).toBe(2);
  });

  it("the embassy's flags multiply with every level", () => {
    expect(paperEmbassyFlags(1)).toBeLessThan(paperEmbassyFlags(2));
    expect(paperEmbassyFlags(2)).toBeLessThan(paperEmbassyFlags(3));
  });
});

describe("paper town — night glass (v145 carries over)", () => {
  it("every window glows at night", () => {
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 6; j++) expect(paperWindowLit(true, i, j, 2)).toBe(true);
  });

  it("by day the pattern is deterministic and level 3 lights more windows than level 1", () => {
    expect(paperWindowLit(false, 3, 4, 1)).toBe(paperWindowLit(false, 3, 4, 1));
    let l1 = 0;
    let l3 = 0;
    for (let i = 0; i < 10; i++)
      for (let j = 0; j < 10; j++) {
        if (paperWindowLit(false, i, j, 1)) l1++;
        if (paperWindowLit(false, i, j, 3)) l3++;
      }
    expect(l3).toBeGreaterThan(l1);
    expect(l1).toBeGreaterThan(0);
  });
});

describe("paper town — villager identity", () => {
  it("the map look IS the interior look for a fixed villager id", () => {
    const withAccent = { id: "person-42", accentColor: "#B91C1C" };
    expect(paperMapLookFor(withAccent)).toEqual(paperDinerLookFor(withAccent));
    const plain = { id: "person-7" };
    expect(paperMapLookFor(plain)).toEqual(paperDinerLookFor(plain));
  });

  it("the accent color is the shirt on the map, exactly as in the interiors", () => {
    expect(paperMapLookFor({ id: "x", accentColor: "#123456" }).shirt).toBe("#123456");
    expect(paperDinerLookFor({ id: "x", accentColor: "#123456" }).shirt).toBe("#123456");
  });

  it("city folk get synthetic identities — never a prayer person's look", () => {
    const city = paperCityLookFor("city-worker-1", "#3B82F6");
    expect(city.shirt).toBe("#3B82F6");
    expect(paperCityLookFor("city-worker-1", "#3B82F6")).toEqual(city);
    expect(city).not.toEqual(paperDinerLookFor({ id: "city-worker-1" }));
  });

  it("placed decorations map to paper decoration kinds", () => {
    expect(paperDecorationKind("fountain")).toBe("fountain");
    expect(paperDecorationKind("statue")).toBe("statue");
    expect(paperDecorationKind("garden")).toBe("garden");
    expect(paperDecorationKind("lantern")).toBe("lantern");
    expect(paperDecorationKind("unknown")).toBeNull();
  });
});

describe("paper town — wiring", () => {
  it("the map and the buy sheet render buildings through the paper renderer", () => {
    expect(hometownSrc).toContain("<PaperBuildingArt {...props} />");
    expect(hometownSrc).toContain("<PaperBuildingArt type={type} size={32} />");
    expect(hometownSrc).not.toContain("<MemoBuildingArt {...props}");
    expect(hometownSrc).toContain("<BuildingArtFX type={b.type}");
    expect(hometownSrc).toContain("night={isNight}");
  });

  it("landmarks route to the paper landmark scenes", () => {
    expect(hometownSrc).toContain("<PaperLandmarkArt art={art} size={size} />");
  });

  it("ground, roads and decorations use the paper language", () => {
    expect(hometownSrc).toContain("PAPER_GROUND.grass");
    expect(hometownSrc).toContain("PAPER_GROUND.road");
    expect(hometownSrc).toContain("<PaperDecoration");
  });

  it("the construction cover is a paper canvas and keeps its sine sway", () => {
    const start = hometownSrc.indexOf("const ConstructionSiteArt");
    const slice = hometownSrc.slice(start, start + 4200);
    expect(slice).toContain("PaperCanvas");
    expect(slice).toContain("Easing.inOut(Easing.sin)");
    expect(slice).not.toContain("spring");
  });

  it("map villagers render as paper figures carrying their own looks", () => {
    expect(npcsSrc).toContain("PaperStandingVillager");
    expect(npcsSrc).toContain(
      "paperMapLookFor({ id: npc.prayerId || npc.id, accentColor: npc.accentColor })"
    );
    expect(npcsSrc).toContain("paperCityLookFor(npc.id, npc.color)");
    expect(npcsSrc).not.toContain("💤");
  });

  it("the villager-locations filter still gates which lights each map receives", () => {
    expect(hometownSrc).toContain("lights={lightsForActiveMap}");
  });

  it("the hero on the map is the paper hero", () => {
    const pawnSrc = read("components/player-pawn.tsx");
    expect(pawnSrc).toContain("PaperHeroFigure");
    expect(pawnSrc).not.toContain("HeroForPawn");
  });

  it("the place scenes draw paper people too", () => {
    const garden = read("components/garden-of-remembrance.tsx");
    expect(garden).toContain("PaperStandingVillager");
    expect(garden).toContain("paperMapLookFor");
    const river = read("components/river.tsx");
    expect(river).toContain("PaperFigureGlyph");
    expect(river).toContain("villagerPeople");
    const mission = read("components/mission-field.tsx");
    expect(mission).toContain("PaperFigureGlyph");
    expect(mission).toContain("paperMapLookFor");
  });

  it("the Dark Forest is never routed through paper", () => {
    const forest = read("components/dark-forest.tsx");
    expect(forest).not.toContain("paper-interior");
    expect(forest).not.toContain("paper-building-art");
    expect(forest).not.toContain("paper-town");
    expect(forest).not.toContain("PaperHeroFigure");
  });
});
