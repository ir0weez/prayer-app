// School Campus mini-games (Oct 20, 2026): the five campus rooms host the
// same mini-games as their town counterparts — one game, one daily cap,
// one payout pipeline, wherever it's played. Caps live ONLY in
// MINI_GAME_CAPS keyed by game id (lib/mini-games.ts); the shared host
// hook (components/mini-game-host.ts) runs scaledCoins/scaledXP →
// scaleMiniGamePayout → addCoins/awardCustomXP → recordPlay(id) for every
// host, town and campus alike. These guards fail if a campus room ever
// grows its own counter or a second payout path.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { MINI_GAME_CAPS, SERVE_MENUS } from "../mini-games";

function readApp(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

/** [file, game component, game id, extra needle] */
const CAMPUS_HOSTS: Array<[string, string, string, string]> = [
  ["app/classroom-interior.tsx", "VerseGame", "verse", "verseMult"],
  ["app/gymnasium-interior.tsx", "TrainingGame", "training", "grantTrainingBonus"],
  ["app/music-room-interior.tsx", "RhythmGame", "rhythm", "rhythmMult"],
  ["app/chapel-interior.tsx", "CandleGame", "candle", ""],
  ["app/cafeteria-interior.tsx", "ServeGame", "serve", 'cuisine="cafeteria"'],
];

describe("campus rooms host the shared mini-games", () => {
  for (const [file, component, gameId, extra] of CAMPUS_HOSTS) {
    it(`${file} hosts ${component} via the shared host hook (${gameId})`, () => {
      const src = readApp(file);
      expect(src).toContain(component);
      expect(src).toContain("useMiniGameHost");
      expect(src).toContain(`useMiniGameHost("${gameId}"`);
      expect(src).toContain("PlayCard");
      if (extra) expect(src).toContain(extra);
    });
  }

  it("town interiors use the same shared host hook (one pipeline)", () => {
    for (const file of [
      "app/bible-study-hall-interior.tsx",
      "app/gym-interior.tsx",
      "app/theater-interior.tsx",
      "app/fasting-house-interior.tsx",
      "app/restaurant-interior.tsx",
    ]) {
      expect(readApp(file)).toContain("useMiniGameHost");
    }
  });

  it("the host hook spends and records the SHARED daily counter by game id", () => {
    const src = readApp("components/mini-game-host.ts");
    expect(src).toContain("playsLeftToday(id)");
    expect(src).toContain("recordPlay(id)");
    expect(src).toContain("scaleMiniGamePayout");
    expect(src).toContain("awardCustomXP");
  });
});

describe("no new cap counters", () => {
  it("MINI_GAME_CAPS holds exactly the twelve game ids (eleven + arcade)", () => {
    expect(Object.keys(MINI_GAME_CAPS).sort()).toEqual(
      [
        "arcade",
        "candle",
        "garden",
        "grill",
        "packing",
        "popcorn",
        "rhythm",
        "serve",
        "tide",
        "training",
        "trim",
        "verse",
      ].sort()
    );
  });

  it("no campus-specific mini-game storage keys exist", () => {
    for (const [file] of CAMPUS_HOSTS) {
      const src = readApp(file);
      expect(src).not.toMatch(/campus.*plays|plays.*campus/i);
      expect(src).not.toContain("recordPlay("); // only the hook records
    }
  });
});

describe("cafeteria menu", () => {
  it("has a school cafeteria dish set using only valid dish icons", () => {
    const menu = SERVE_MENUS.cafeteria;
    expect(menu).toBeDefined();
    expect(menu).toHaveLength(6);
    const validIcons = new Set([
      "pizza", "burger", "fries", "taco", "burrito", "sushi", "soup",
      "salad", "bread", "drink", "shake", "pie", "coffee", "fish",
      "grapes", "bowl", "cake", "egg", "corn", "skewer",
    ]);
    for (const dish of menu) {
      expect(validIcons.has(dish.icon)).toBe(true);
      expect(dish.name.length).toBeGreaterThan(0);
    }
  });
});
