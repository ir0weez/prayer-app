// v397 — "Keep Me Occupied" grows a progression layer (Jonathan,
// Oct 31, after using v395 on his phone: "these should be games
// that at least [have] some sort of scoring system. I also feel
// like you should earn coins as you play, and that allows you to
// unlock more games and collect XP over time as well.").
//
// These pins hold:
//   1. Scoring — each game's per-game rule, incl. the Sort streak
//      reset and the Word Dig's 120→20 curve; a chapter read = 40.
//   2. One economy — a finished session's score converts into the
//      SAME coin purse (lib/hometown.ts) and the SAME XP track
//      (lib/xp-engine.ts), exactly once per session token.
//   3. Unlocks — Backbeat 3,000 and Tend 7,500, bought from the
//      shared purse and persisted; a chapter is never locked and
//      never priced; the deal never deals a locked game.
//   4. Best scores persist as arcade stats in the progression
//      store — whose record carries ONLY unlocked + best.
//   5. The shelf does not launch games (source pin).
//   6. Wave data is STILL never persisted: every storage write the
//      layer makes lands on a whitelisted key (the shared coin/XP
//      keys or the progression key), and nothing rating/minute/
//      session-shaped is among the values.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
const writtenKeys: string[] = [];
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      writtenKeys.push(k);
      store.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => { store.delete(k); }),
    multiSet: vi.fn(async () => {}),
    multiGet: vi.fn(async (keys: string[]) => keys.map((k) => [k, store.get(k) ?? null])),
    getAllKeys: vi.fn(async () => [...store.keys()]),
    clear: vi.fn(async () => { store.clear(); }),
  },
}));

import {
  CHAPTER_READ_SCORE,
  KMO_DEFAULT_UNLOCKED,
  KMO_PROGRESSION_KEY,
  KMO_UNLOCK_PRICES,
  beatTapPoints,
  convertSessionScore,
  digScoreForGuesses,
  echoRunPoints,
  isItemUnlocked,
  loadKmoProgression,
  parseKmoProgression,
  recordBestScore,
  scoreToCoins,
  scoreToXp,
  sortScored,
  stackLandingPoints,
  tendTapPoints,
  unlockGame,
  unlockPrice,
} from "../kmo-progression";
import { KMO_POOL, dealItem, sessionLine, startSession } from "../keep-me-occupied";
import { COINS_STORAGE_KEY, applyCoinsDelta, loadCoinsRecord } from "../hometown";
import { XP_AWARDS_STORAGE_KEY, XP_STORAGE_KEY, loadXPState } from "../xp-engine";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

beforeEach(() => {
  store.clear();
  writtenKeys.length = 0;
});

// ─── 1. Scoring ──────────────────────────────────────────────────────────────

describe("v397 scoring rules", () => {
  it("Sort It Out: +10 a sort, streak bonus past three, wrong bin resets the streak only", () => {
    let s = { streak: 0, score: 0 };
    s = sortScored(s, true);
    expect(s).toEqual({ streak: 1, score: 10 });
    s = sortScored(s, true);
    s = sortScored(s, true);
    expect(s).toEqual({ streak: 3, score: 30 });
    s = sortScored(s, true); // 4th in a row: 10 + 2
    expect(s).toEqual({ streak: 4, score: 42 });
    s = sortScored(s, true); // 5th: 10 + 4
    expect(s).toEqual({ streak: 5, score: 56 });
    s = sortScored(s, false); // wrong bin: streak dies, points stay
    expect(s).toEqual({ streak: 0, score: 56 });
    s = sortScored(s, true);
    expect(s).toEqual({ streak: 1, score: 66 });
  });

  it("Echo Lights: +15 per correct pad, +50 for the finished pattern, broken runs bank their pads", () => {
    expect(echoRunPoints([0, 1, 2], [0, 1, 2])).toBe(95);
    expect(echoRunPoints([0, 1, 2], [0, 1, 3])).toBe(30);
    expect(echoRunPoints([0, 1, 2], [3])).toBe(0);
    expect(echoRunPoints([2], [2])).toBe(65);
  });

  it("Stack: +10 a landing, +5 for a near-perfect one (≥98% of the width kept)", () => {
    expect(stackLandingPoints(150, 150)).toBe(15);
    expect(stackLandingPoints(150, 147)).toBe(15);
    expect(stackLandingPoints(150, 146)).toBe(10);
    expect(stackLandingPoints(150, 75)).toBe(10);
  });

  it("Backbeat: +10 on the step, +4 a step either side, nothing beyond", () => {
    expect(beatTapPoints(4, [1, 4])).toBe(10);
    expect(beatTapPoints(3, [1, 4])).toBe(4);
    expect(beatTapPoints(5, [1, 4])).toBe(4);
    expect(beatTapPoints(0, [1, 4])).toBe(4);
    expect(beatTapPoints(6, [1, 4])).toBe(0);
    expect(beatTapPoints(7, [1, 4])).toBe(0);
  });

  it("Tend: +5 for a weed cleared or a dry spot watered, nothing for the rest", () => {
    expect(tendTapPoints("weed")).toBe(5);
    expect(tendTapPoints("dry")).toBe(5);
    expect(tendTapPoints("sprout")).toBe(0);
    expect(tendTapPoints("bloom")).toBe(0);
  });

  it("Word Dig: the find curve runs 120 down to 20 across six guesses; a reveal scores 0", () => {
    expect(digScoreForGuesses(1, true)).toBe(120);
    expect(digScoreForGuesses(2, true)).toBe(100);
    expect(digScoreForGuesses(4, true)).toBe(60);
    expect(digScoreForGuesses(6, true)).toBe(20);
    expect(digScoreForGuesses(3, false)).toBe(0);
    expect(digScoreForGuesses(6, false)).toBe(0);
  });

  it("A Chapter read is a flat 40; conversion is coins = score, XP = ceil(score / 2)", () => {
    expect(CHAPTER_READ_SCORE).toBe(40);
    expect(scoreToCoins(137)).toBe(137);
    expect(scoreToXp(0)).toBe(0);
    expect(scoreToXp(1)).toBe(1);
    expect(scoreToXp(10)).toBe(5);
    expect(scoreToXp(11)).toBe(6);
    expect(scoreToXp(137)).toBe(69);
  });
});

// ─── 2. One economy, credited exactly once ───────────────────────────────────

describe("v397 conversion into the shared purse and XP track", () => {
  it("credits the real coin ledger and the real XP engine, once per session token", async () => {
    await applyCoinsDelta(1000, "none");
    const xpBefore = (await loadXPState()).totalXP;
    const first = await convertSessionScore(100, "tok-alpha");
    expect(first).toEqual({ coins: 100, xp: 50 });
    expect((await loadCoinsRecord()).balance).toBe(1100);
    expect((await loadXPState()).totalXP).toBe(xpBefore + 50);

    // Same token again — a double-fired session-end — credits nothing more.
    const second = await convertSessionScore(100, "tok-alpha");
    expect(second).toEqual({ coins: 0, xp: 0 });
    expect((await loadCoinsRecord()).balance).toBe(1100);
    expect((await loadXPState()).totalXP).toBe(xpBefore + 50);

    // A different session converts on its own token.
    const third = await convertSessionScore(40, "tok-beta");
    expect(third).toEqual({ coins: 40, xp: 20 });
    expect((await loadCoinsRecord()).balance).toBe(1140);
  });

  it("a zero score converts nothing and writes nothing", async () => {
    await applyCoinsDelta(500, "none");
    writtenKeys.length = 0;
    const result = await convertSessionScore(0, "tok-zero");
    expect(result).toEqual({ coins: 0, xp: 0 });
    expect(writtenKeys).toEqual([]);
    expect((await loadCoinsRecord()).balance).toBe(500);
  });
});

// ─── 3. Unlocks ──────────────────────────────────────────────────────────────

describe("v397 unlocks", () => {
  it("the defaults: four starters open, Backbeat and Tend locked at his prices", () => {
    const fresh = parseKmoProgression(null);
    expect(fresh.unlocked).toEqual([...KMO_DEFAULT_UNLOCKED]);
    expect(fresh.best).toEqual({});
    expect(isItemUnlocked(fresh, "sort-it-out")).toBe(true);
    expect(isItemUnlocked(fresh, "backbeat")).toBe(false);
    expect(isItemUnlocked(fresh, "tend")).toBe(false);
    expect(KMO_UNLOCK_PRICES).toEqual({ backbeat: 3000, tend: 7500 });
    expect(unlockPrice("backbeat")).toBe(3000);
    expect(unlockPrice("tend")).toBe(7500);
  });

  it("a chapter is never locked and never priced — and neither is the dig", () => {
    const fresh = parseKmoProgression(null);
    expect(isItemUnlocked(fresh, "chapter")).toBe(true);
    expect(isItemUnlocked(fresh, "word-dig")).toBe(true);
    expect(unlockPrice("chapter")).toBeNull();
    expect(unlockPrice("word-dig")).toBeNull();
    expect(KMO_UNLOCK_PRICES.chapter).toBeUndefined();
  });

  it("buying Tend spends the shared purse and persists the unlock", async () => {
    await applyCoinsDelta(150000, "none");
    const result = await unlockGame("tend");
    expect(result.owned).toBe(true);
    expect(result.bought).toBe(true);
    expect(result.balance).toBe(142500);
    expect((await loadCoinsRecord()).balance).toBe(142500);
    const reloaded = await loadKmoProgression();
    expect(reloaded.unlocked).toContain("tend");
    // The store record carries ONLY the two lawful fields.
    const raw = JSON.parse(store.get(KMO_PROGRESSION_KEY)!);
    expect(Object.keys(raw).sort()).toEqual(["best", "unlocked"]);
  });

  it("an unaffordable unlock spends nothing and unlocks nothing; re-buying is free", async () => {
    await applyCoinsDelta(100, "none");
    const poor = await unlockGame("backbeat");
    expect(poor.owned).toBe(false);
    expect(poor.bought).toBe(false);
    expect((await loadCoinsRecord()).balance).toBe(100);
    expect((await loadKmoProgression()).unlocked).not.toContain("backbeat");

    await applyCoinsDelta(10000, "none");
    await unlockGame("backbeat");
    const again = await unlockGame("backbeat");
    expect(again.owned).toBe(true);
    expect(again.bought).toBe(false);
    expect((await loadCoinsRecord()).balance).toBe(10100 - 3000);
  });

  it("unlocking a chapter is a no-op that charges nothing", async () => {
    await applyCoinsDelta(5000, "none");
    const result = await unlockGame("chapter");
    expect(result.owned).toBe(true);
    expect(result.bought).toBe(false);
    expect(result.balance).toBe(5000);
  });

  it("the deal never deals a locked game, and chapters are always in the deck", () => {
    const rng = lcg(2024);
    const seen = new Set<string>();
    for (let i = 0; i < 1500; i++) {
      seen.add(dealItem(rng, undefined, KMO_DEFAULT_UNLOCKED).id);
    }
    expect(seen.has("backbeat")).toBe(false);
    expect(seen.has("tend")).toBe(false);
    expect(seen.has("chapter")).toBe(true);
    expect(seen.has("word-dig")).toBe(true);
    for (const id of KMO_DEFAULT_UNLOCKED) expect(seen.has(id)).toBe(true);
    expect(KMO_POOL).toHaveLength(7);

    const all = [...KMO_DEFAULT_UNLOCKED, "backbeat", "tend"] as const;
    const seenAll = new Set<string>();
    const rng2 = lcg(555);
    for (let i = 0; i < 1500; i++) seenAll.add(dealItem(rng2, undefined, [...all]).id);
    expect(seenAll.has("backbeat")).toBe(true);
    expect(seenAll.has("tend")).toBe(true);
  });
});

// ─── 4. Best scores ──────────────────────────────────────────────────────────

describe("v397 best scores", () => {
  it("records only improvements, and they persist across loads", async () => {
    expect(await recordBestScore("stack", 120)).toBe(120);
    expect(await recordBestScore("stack", 90)).toBe(120);
    expect(await recordBestScore("stack", 200)).toBe(200);
    const reloaded = await loadKmoProgression();
    expect(reloaded.best.stack).toBe(200);
    expect(reloaded.best["echo-lights"]).toBeUndefined();
  });
});

// ─── 5. The shelf does not launch ────────────────────────────────────────────

describe("v397 the shelf", () => {
  it("shows bests and prices but imports no game and pushes no route", () => {
    const src = read("components/keep-me-occupied/games-shelf.tsx");
    for (const game of ["EchoLightsGame", "SortItOutGame", "StackGame", "BackbeatGame", "TendGame", "WordDigGame"]) {
      expect(src, game).not.toContain(game);
    }
    expect(src).not.toContain("router");
    expect(src).not.toContain("bible-chapter");
    expect(src).toContain("Unlock");
    expect(src).toContain("Best");
    // The screen reaches it by a quiet text action, off the wave path:
    const screen = read("app/keep-me-occupied.tsx");
    expect(screen).toContain("All games — best scores &amp; unlocks");
    expect(screen).toContain("<GamesShelf");
  });

  it("the wave check carries the earnings line, shown only when something was earned", () => {
    const src = read("components/keep-me-occupied/wave-check.tsx");
    expect(src).toContain("coins · +");
    expect(src).toContain("XP");
    expect(src).toContain("earnings.coins > 0");
    const screen = read("app/keep-me-occupied.tsx");
    expect(screen).toContain("convertSessionScore");
    expect(screen).toContain("recordBestScore");
  });
});

// ─── 6. Wave data is still never persisted ───────────────────────────────────

describe("v397 wave data stays ledger-free", () => {
  it("every write the layer makes lands on a whitelisted key", async () => {
    await applyCoinsDelta(20000, "none");
    writtenKeys.length = 0;
    // A full game-data flow: convert a session, record a best, unlock a game.
    await convertSessionScore(40, "tok-wave");
    await recordBestScore("sort-it-out", 40);
    await unlockGame("backbeat");
    // The wave itself: a session with a rating is held and read — pure memory.
    const session = { ...startSession("sort-it-out", "Sort It Out", 1_000_000), entryRating: 7 };
    expect(sessionLine(session, 1_000_000 + 11 * 60000)).toContain("11 minutes");

    const allowed = new Set([COINS_STORAGE_KEY, XP_STORAGE_KEY, XP_AWARDS_STORAGE_KEY, KMO_PROGRESSION_KEY]);
    for (const key of writtenKeys) expect(allowed.has(key), key).toBe(true);
    // And no written value carries anything wave-shaped.
    for (const key of allowed) {
      const value = store.get(key);
      if (!value) continue;
      expect(value).not.toContain("entryRating");
      expect(value).not.toContain("rating");
      expect(value).not.toContain("startedAt");
    }
  });

  it("the progression record's shape is exactly { unlocked, best }", async () => {
    await recordBestScore("tend", 25);
    const raw = JSON.parse(store.get(KMO_PROGRESSION_KEY)!);
    expect(Object.keys(raw).sort()).toEqual(["best", "unlocked"]);
    expect(raw.best).toEqual({ tend: 25 });
  });
});
