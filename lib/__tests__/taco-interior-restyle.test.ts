// Taco Stand interior restyle — the style proof for all interiors.
// The taco room is DRAWN now (storybook language: outlines, rims, tile,
// tabletop life) instead of bare shapes, every level of it, with the
// level progression structural — more furniture and props per level,
// never just recolors. These are source guards in the repo's idiom:
// the scene components can't render under vitest, so the wiring and
// the drawn elements are pinned at the source, and the seat/diner +
// mini-game logic is guarded untouched.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readSrc(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

function between(src: string, start: string, end: string): string {
  const a = src.indexOf(start);
  expect(a, `start token missing: ${start}`).toBeGreaterThan(-1);
  const b = src.indexOf(end, a + start.length);
  expect(b, `end token missing: ${end}`).toBeGreaterThan(-1);
  return src.slice(a, b);
}

const themes = readSrc("components/cuisine-themes.tsx");
const screen = readSrc("app/restaurant-interior.tsx");

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

describe("taco scene — drawn elements, not bare shapes", () => {
  it("the signature cantina is built from drawn pieces: sun, steam, menu boards", () => {
    const cantina = between(themes, "function RetroCantina", "// ---------- taco: the cantina counter");
    expect(cantina).toContain("SunMedallion");
    expect(cantina).toContain("SteamWisps");
    expect(cantina).toContain("CantinaMenuBoard");
    // the sun's rays shimmer on a slow sine, native driver
    const sun = between(themes, "function SunMedallion", "// ============================================================\n// WALL DECOR");
    expect(sun).toContain("Easing.inOut(Easing.sin)");
    expect(sun).toContain("useNativeDriver: true");
  });

  it("the overhead band has a drawn frame and staggered twinkling bulbs", () => {
    const band = between(themes, "function RetroSunsetBand", "function PaperLanterns");
    expect(band).toContain("GlowPulse");
    // per-bulb stagger: the duration varies by bulb index
    expect(band).toContain("1500 + (i % 4) * 350");
  });

  it("the floor is tile texture now, not a flat fill with rings", () => {
    const floor = between(themes, "export function CuisineFloor", "export function CuisineCenterpiece");
    const taco = floor.slice(floor.indexOf('case "taco-stand":'));
    expect(taco).toContain("#463264"); // purple floor tiles
    expect(taco).toContain("flexWrap");
    // the medallion inlay survives on top of the tile
    expect(taco).toContain("#2EC4B6");
  });

  it("the counter is the cantina counter: drawn pots, tile front, ristra", () => {
    const counter = between(themes, "export function TacoCantinaCounter", "// ---------- sushi");
    expect(counter).toContain("#C22E2E"); // the chili ristra
    expect(counter).toContain("Cantina Kitchen");
    expect(counter).toContain("Cantina Counter");
    expect(EMOJI.test(counter)).toBe(false);
  });
});

describe("taco levels — structural progression at every tier", () => {
  it("building level dresses the signature: menu boards at L2, stripes deepen", () => {
    const cantina = between(themes, "function RetroCantina", "// ---------- taco: the cantina counter");
    expect(cantina).toContain("level >= 2 && <CantinaMenuBoard />");
    expect(cantina).toContain("level >= 3 ? 4 : level >= 2 ? 3 : 2");
  });

  it("kitchen tier deepens the counter: tile rows grow, ristra arrives at tier 2", () => {
    const counter = between(themes, "export function TacoCantinaCounter", "// ---------- sushi");
    expect(counter).toContain("tier >= 2 ? 3 : 2");
    expect(counter).toContain("tier >= 2 &&");
    // tier 0 is planks, tier 1+ is tile — a structural swap, not a recolor
    expect(counter).toContain("tier >= 1 ? (");
  });

  it("tables tier dresses the tabletop in stages: cups, then food, then service", () => {
    const table = between(screen, "function CantinaTable", "// ---------- banquet seating");
    expect(table).toContain("tablesTier >= 1"); // cups with straws
    expect(table).toContain("tablesTier >= 2"); // tacos + salsa + tile edge
    expect(table).toContain("tablesTier >= 3"); // serving tray + fringe
    expect(table).toContain("CantinaBench");
    expect(EMOJI.test(table)).toBe(false);
  });

  it("table count still scales with building level (2 → 3 → 4)", () => {
    expect(screen).toContain("bLevel >= 3 ? 4 : bLevel >= 2 ? 3 : 2");
  });
});

describe("the 'Home Kitchen' label fix", () => {
  it("the taco stand routes to its cantina counter before the generic label", () => {
    const kitchen = between(screen, "function KitchenCounter", "// ---------- string lights");
    const tacoBranch = kitchen.indexOf('cuisine === "taco-stand"');
    expect(tacoBranch).toBeGreaterThan(-1);
    expect(kitchen).toContain("return <TacoCantinaCounter tier={tier} />");
    // the generic fallback label still exists for other cuisines, but the
    // taco branch returns before it can ever render in the taco stand
    const genericLabel = kitchen.indexOf('"Home Kitchen"');
    expect(genericLabel).toBeGreaterThan(tacoBranch);
  });
});

describe("no regressions — seats, diners, mini-games, other cuisines", () => {
  it("the taco room uses CantinaTable; every other cuisine keeps DiningTable", () => {
    expect(screen).toContain('cuisine === "taco-stand" ? (');
    expect(screen).toContain("<CantinaTable");
    expect(screen).toContain("<DiningTable");
  });

  it("seat + diner logic is the same slicing as before, figures reused", () => {
    expect(screen).toContain("diners.forEach((p, i) => tableDiners[i % tableCount].push(p))");
    const table = between(screen, "function CantinaTable", "// ---------- banquet seating");
    expect(table).toContain("diners.slice(0, pawnFirst ? 1 : 2)");
    expect(table).toContain("diners.slice(2, 4)");
    expect(table).toContain("<PawnDiner");
    expect(table).toContain("<SeatedVillager");
  });

  it("Serve the Table still hosts through the shared mini-game host", () => {
    expect(screen).toContain('useMiniGameHost("serve"');
    expect(screen).toContain("<ServeGame");
    expect(screen).toContain("cuisine={cuisine}");
  });

  it("the taco palette is unchanged and the other signatures still stand", () => {
    expect(themes).toContain('accent: "#FF7BAC"');
    expect(themes).toContain('wall: "#3A2260"');
    for (const piece of ["BurgerCounter", "SushiCounter", "PieCase", "PizzaOven", "BreadOven"]) {
      expect(themes).toContain(piece);
    }
  });
});
