// The October 2026 games wave: thirteen new mini-games (one per
// building that had none), timing surgery on the remaining JS-thread
// game loops (Rhythm of Worship, Popcorn Catch, Training Reps, Keep
// the Candle Lit, Tide Pools, Pack the Boxes' display clock), and the
// registry truth that every game lives in the ONE caps table.
// These guards pin: registry completeness, the payout envelope (via
// the lib reward helpers), data integrity, the timing standard in
// source (no setInterval loops, onPressIn capture, native driver),
// and the wiring of every new game into its building's interior via
// the shared host hook.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  BREW_INGREDIENTS,
  CONSTELLATIONS,
  HARVEST_CROPS,
  MINI_GAME_CAPS,
  SHELF_ITEMS,
  SHELVE_BOOK_TITLES,
  SHELVE_SECTIONS,
  beamReward,
  bellReward,
  brewReward,
  cascadeReward,
  clayReward,
  echoReward,
  harvestReward,
  hearthReward,
  needleReward,
  roundsReward,
  shelfReward,
  shelveReward,
  starsReward,
  type MiniGameId,
} from "../mini-games";

function readSrc(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const NEW_GAME_IDS: MiniGameId[] = [
  "bell", "rounds", "cascade", "shelf", "harvest", "shelve", "beam",
  "clay", "needle", "brew", "echo", "stars", "hearth",
];

describe("games wave — registry completeness", () => {
  it("registers all thirteen new games with daily caps in the shared band", () => {
    for (const id of NEW_GAME_IDS) {
      expect(MINI_GAME_CAPS[id], id).toBeGreaterThanOrEqual(2);
      expect(MINI_GAME_CAPS[id], id).toBeLessThanOrEqual(3);
    }
    expect(Object.keys(MINI_GAME_CAPS)).toHaveLength(25);
  });

  it("the lib header names the timing standard as applying to ALL games", () => {
    const lib = readSrc("lib/mini-games.ts");
    expect(lib).toContain("TIMING STANDARD");
    expect(lib).toContain("applies to ALL");
    expect(lib).toContain("onPressIn");
    expect(lib).toContain("stopAnimation");
  });
});

describe("games wave — payout envelope (reward helpers)", () => {
  it("bell + echo sequence rewards cap inside the band", () => {
    expect(bellReward(0, 0)).toEqual({ coins: 0, xp: 0 });
    expect(bellReward(5, 25)).toEqual({ coins: 30, xp: 90 });
    expect(echoReward(4, 22)).toEqual({ coins: 34, xp: 95 });
    expect(echoReward(99, 99).xp).toBeLessThanOrEqual(95);
  });

  it("rounds + cascade rewards cap inside the band", () => {
    expect(roundsReward(0)).toEqual({ coins: 0, xp: 0 });
    expect(roundsReward(50)).toEqual({ coins: 60, xp: 60 });
    expect(cascadeReward(0, 0)).toEqual({ coins: 0, xp: 0 });
    expect(cascadeReward(100, 100)).toEqual({ coins: 78, xp: 42 });
    expect(cascadeReward(10, 2)).toEqual({ coins: 30, xp: 14 });
  });

  it("shelf matches the packing envelope; harvest pays golden double", () => {
    expect(shelfReward(20)).toEqual({ coins: 80, xp: 40 });
    expect(shelfReward(3)).toEqual({ coins: 12, xp: 6 });
    expect(harvestReward(10, 0)).toEqual({ coins: 40, xp: 20 });
    expect(harvestReward(0, 5)).toEqual({ coins: 40, xp: 20 });
    expect(harvestReward(99, 99)).toEqual({ coins: 85, xp: 52 });
  });

  it("shelve, beam, needle rewards scale with performance and cap", () => {
    expect(shelveReward(12, true)).toEqual({ coins: 68, xp: 48 });
    expect(shelveReward(12, false)).toEqual({ coins: 60, xp: 48 });
    expect(beamReward(24)).toEqual({ coins: 25, xp: 85 });
    expect(beamReward(0)).toEqual({ coins: 0, xp: 0 });
    expect(needleReward(18)).toEqual({ coins: 21, xp: 84 });
    expect(needleReward(9)).toEqual({ coins: 11, xp: 42 });
  });

  it("clay, brew, stars, hearth rewards cap inside the band", () => {
    expect(clayReward(1)).toEqual({ coins: 20, xp: 80 });
    expect(clayReward(0.5)).toEqual({ coins: 10, xp: 40 });
    expect(clayReward(7)).toEqual({ coins: 20, xp: 80 });
    expect(brewReward(4, 0)).toEqual({ coins: 28, xp: 88 });
    expect(brewReward(0, 0)).toEqual({ coins: 0, xp: 0 });
    expect(starsReward(19, 3)).toEqual({ coins: 26, xp: 90 });
    expect(hearthReward(1, 4)).toEqual({ coins: 24, xp: 85 });
    expect(hearthReward(0, 0)).toEqual({ coins: 0, xp: 0 });
  });
});

describe("games wave — content data integrity", () => {
  it("shelf items cover all four market categories, four each", () => {
    const byCat = new Map<string, number>();
    for (const item of SHELF_ITEMS) {
      expect(item.name.length).toBeGreaterThan(0);
      expect(item.icon.length).toBeGreaterThan(0);
      byCat.set(item.category, (byCat.get(item.category) ?? 0) + 1);
    }
    expect([...byCat.keys()].sort()).toEqual(["bakery", "dairy", "dry-goods", "produce"]);
    for (const n of byCat.values()) expect(n).toBe(4);
  });

  it("shelve sections and book titles line up", () => {
    expect(SHELVE_SECTIONS).toHaveLength(4);
    for (const s of SHELVE_SECTIONS) {
      expect(SHELVE_BOOK_TITLES[s.id]?.length).toBeGreaterThanOrEqual(3);
    }
    expect(HARVEST_CROPS.length).toBeGreaterThanOrEqual(4);
  });

  it("brew has six jars; constellations are drawable in a unit scene", () => {
    expect(BREW_INGREDIENTS).toHaveLength(6);
    expect(new Set(BREW_INGREDIENTS.map((i) => i.id)).size).toBe(6);
    expect(CONSTELLATIONS).toHaveLength(3);
    for (const c of CONSTELLATIONS) {
      expect(c.stars.length).toBeGreaterThanOrEqual(5);
      expect(c.stars.length).toBeLessThanOrEqual(8);
      for (const s of c.stars) {
        expect(s.x).toBeGreaterThan(0);
        expect(s.x).toBeLessThan(1);
        expect(s.y).toBeGreaterThan(0);
        expect(s.y).toBeLessThan(1);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Timing standard — source guards. The rebuilt games and every new
// game must carry NO setInterval loop; the sweep games must capture on
// onPressIn and sample via stopAnimation; motion runs on the native
// driver.
// ---------------------------------------------------------------------------

const REBUILT_FILES = [
  "components/rhythm-game.tsx",
  "components/popcorn-game.tsx",
  "components/training-game.tsx",
  "components/candle-game.tsx",
  "components/packing-game.tsx",
  "components/tide-game.tsx",
];

const NEW_GAME_FILES: Array<[string, string]> = [
  ["components/bell-game.tsx", "bellReward"],
  ["components/rounds-game.tsx", "roundsReward"],
  ["components/cascade-game.tsx", "cascadeReward"],
  ["components/shelf-game.tsx", "shelfReward"],
  ["components/harvest-game.tsx", "harvestReward"],
  ["components/shelve-game.tsx", "shelveReward"],
  ["components/beam-game.tsx", "beamReward"],
  ["components/clay-game.tsx", "clayReward"],
  ["components/needle-game.tsx", "needleReward"],
  ["components/brew-game.tsx", "brewReward"],
  ["components/echo-game.tsx", "echoReward"],
  ["components/stars-game.tsx", "starsReward"],
  ["components/hearth-game.tsx", "hearthReward"],
];

describe("games wave — timing standard in source", () => {
  for (const file of REBUILT_FILES) {
    it(`${file} has no setInterval game loop left`, () => {
      expect(readSrc(file)).not.toContain("setInterval(");
    });
  }

  for (const [file, rewardFn] of NEW_GAME_FILES) {
    it(`${file} exists, is interval-free, and pays through ${rewardFn}`, () => {
      const src = readSrc(file);
      expect(src).not.toContain("setInterval(");
      expect(src).toContain(rewardFn);
      expect(src).toContain("onComplete");
    });
  }

  it("rhythm captures lane taps on finger DOWN and animates notes natively", () => {
    const src = readSrc("components/rhythm-game.tsx");
    expect(src).toContain("onPressIn");
    expect(src).not.toContain("onPress={() => tapLane");
    expect(src).toContain("useNativeDriver: true");
    // the judgement math is the original schedule math
    expect(src).toContain("PERFECT_WINDOW = 0.075");
    expect(src).toContain("GOOD_WINDOW = 0.17");
    expect(src).toContain("TRAVEL_MS = 2450");
    expect(src).toContain("TOTAL_NOTES = 30");
  });

  it("popcorn keeps its catch math and moves the bucket without frame state", () => {
    const src = readSrc("components/popcorn-game.tsx");
    expect(src).toContain("CATCH_HALF = 0.085");
    expect(src).toContain("DURATION_S = 45");
    expect(src).toContain("useNativeDriver: true");
    expect(src).not.toContain("setBucketX");
    expect(src).not.toContain("setKernels(next)");
  });

  it("training now meets the standard the Steady Trim set", () => {
    const src = readSrc("components/training-game.tsx");
    expect(src).toContain("onPressIn");
    expect(src).not.toContain("onPress={handleStop}");
    expect(src).toContain("stopAnimation(");
    expect(src).not.toContain("addListener");
    expect(src).not.toContain("useNativeDriver: false");
    // math untouched
    expect(src).toContain("GREEN");
    expect(src).toContain("1150");
  });

  it("the two new sweep games copy the Steady Trim pattern exactly", () => {
    for (const file of ["components/beam-game.tsx", "components/needle-game.tsx"]) {
      const src = readSrc(file);
      expect(src, file).toContain("onPressIn");
      expect(src, file).toContain("stopAnimation(");
      expect(src, file).toContain("useNativeDriver: true");
      expect(src, file).toContain("Easing.inOut(Easing.sin)");
    }
  });

  it("the new falling/keeping games run their motion on the native driver", () => {
    for (const file of ["components/cascade-game.tsx", "components/hearth-game.tsx", "components/clay-game.tsx"]) {
      expect(readSrc(file), file).toContain("useNativeDriver: true");
    }
  });
});

// ---------------------------------------------------------------------------
// Wiring — every new game is hosted by its building's interior through
// the shared host hook (one cap counter, one payout pipeline).
// ---------------------------------------------------------------------------

const HOSTS: Array<[string, string, string]> = [
  ["app/church-interior.tsx", "BellGame", "bell"],
  ["app/hospital-interior.tsx", "RoundsGame", "rounds"],
  ["app/bank-interior.tsx", "CascadeGame", "cascade"],
  ["app/market-interior.tsx", "ShelfGame", "shelf"],
  ["app/farm-interior.tsx", "HarvestGame", "harvest"],
  ["app/bookstore-interior.tsx", "ShelveGame", "shelve"],
  ["app/carpenter-interior.tsx", "BeamGame", "beam"],
  ["app/pottery-interior.tsx", "ClayGame", "clay"],
  ["app/tailor-interior.tsx", "NeedleGame", "needle"],
  ["app/apothecary-interior.tsx", "BrewGame", "brew"],
  ["app/music-hall-interior.tsx", "EchoGame", "echo"],
  ["app/observatory-interior.tsx", "StarsGame", "stars"],
  ["app/pawn-house.tsx", "HearthGame", "hearth"],
];

describe("games wave — every new game is hosted at its building", () => {
  for (const [file, component, gameId] of HOSTS) {
    it(`${file} hosts ${component} via the shared hook (${gameId})`, () => {
      const src = readSrc(file);
      expect(src).toContain(component);
      expect(src).toContain("useMiniGameHost");
      expect(src).toContain(`useMiniGameHost("${gameId}"`);
      expect(src).toContain("PlayCard");
      // Only the hook records plays for the new game (pawn-house's
      // legacy manual Grill pipeline predates the hook and is exempt).
      expect(src).not.toContain(`recordPlay("${gameId}")`);
    });
  }
});
