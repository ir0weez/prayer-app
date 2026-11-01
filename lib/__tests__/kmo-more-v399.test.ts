// v399 — Keep Me Occupied climbs six more doors (Jonathan tapped
// "Add all six to the ladder", Oct 31 — Plinko Drop, Cave Flyer,
// Colour Rush, Rockfall, Mole Patrol, Slide 2048). His standing
// rule for every game on the ladder: a score with a best to beat,
// coins earned by playing, coins unlocking more games.
//
// These pins hold:
//   1. The ladder — fifteen priced games in his order, climbing
//      from Runner 2,000 through Drop Match 25,000 to Slide 2048
//      at 75,000; the pool registry carries all six new games; the
//      deal never deals a locked one; chapters stay never-locked.
//   2. Each game's scoring rules and core logic: Plinko's ten-ball
//      run and slot table, Cave Flyer's hold-to-rise / wall death /
//      rings, Colour Rush's ink rule / fast bonus / three lives /
//      shrinking clock, Rockfall's crack counts / garden lives /
//      the large splitting into fast smalls, Mole Patrol's chain /
//      golden / flower decoy / sixty-second run, Slide 2048's
//      merge scoring, spawn rates and no-moves game over.
//   3. Run-end settling — a run converts exactly once on its own
//      token, and best scores record for the new games.
//   4. The shelf lists the new games from the registry (source
//      pin), and the screen wires all six as run games.
//   5. Wave data is STILL never persisted (the v397 whitelist).

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
  KMO_DEFAULT_UNLOCKED,
  KMO_PROGRESSION_KEY,
  KMO_UNLOCK_PRICES,
  caveScoreFor,
  convertSessionScore,
  isItemUnlocked,
  loadKmoProgression,
  moleTapPoints,
  parseKmoProgression,
  plinkoScoreForSlot,
  recordBestScore,
  rockPointsForSize,
  rushAnswerPoints,
  unlockGame,
  unlockPrice,
  PLINKO_SLOT_VALUES,
} from "../kmo-progression";
import {
  CAVE_X,
  KMO_POOL,
  MOLE_RUN_SECONDS,
  PLINKO_BALLS_PER_RUN,
  PLINKO_SLOTS,
  ROCK_GARDEN_Y,
  ROCK_RADIUS,
  RUSH_COLORS,
  caveScore,
  caveStart,
  caveStep,
  dealItem,
  moleLifetime,
  moleStart,
  moleStep,
  moleTap,
  plinkoAim,
  plinkoDrop,
  plinkoScore,
  plinkoStart,
  plinkoStep,
  rockStart,
  rockStep,
  rockTap,
  rushAnswer,
  rushRound,
  rushStart,
  rushTimeLimitMs,
  rushTimeout,
  slideGameOver,
  slideMoveGrid,
  slideSpawn,
  slideStart,
  slideSwipe,
  type MoleState,
  type RockState,
} from "../keep-me-occupied";
import { COINS_STORAGE_KEY, applyCoinsDelta, loadCoinsRecord } from "../hometown";
import { XP_AWARDS_STORAGE_KEY, XP_STORAGE_KEY } from "../xp-engine";
import { STAT_POINTS_STORAGE_KEY } from "../character-stats";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const NEW_GAMES = ["plinko-drop", "cave-flyer", "colour-rush", "rockfall", "mole-patrol", "slide-2048"] as const;

beforeEach(() => {
  store.clear();
  writtenKeys.length = 0;
});

// ─── 1. The ladder ───────────────────────────────────────────────────────────

describe("v399 the ladder", () => {
  it("fifteen priced games in his order, climbing to Slide 2048 at 75,000", () => {
    // v400 note: twelve more priced doors joined — twenty-seven
    // in all, the full table pinned in the v400 tests; the v399
    // fifteen keep their prices exactly, and the table now reads:
    expect(KMO_UNLOCK_PRICES).toEqual({
      runner: 2000,
      backbeat: 3000,
      "pipe-dreams": 4500,
      glide: 5000,
      jumper: 6500,
      tend: 7500,
      "block-fit": 8500,
      snake: 10000,
      crossroads: 12500,
      breakout: 15000,
      "lights-out": 18000,
      "drop-match": 25000,
      "plinko-drop": 30000,
      "cave-flyer": 35000,
      "colour-rush": 40000,
      "flood-it": 45000,
      rockfall: 50000,
      "mole-patrol": 60000,
      "slide-2048": 75000,
      "picross-mini": 85000,
      "knife-log": 90000,
      "bubble-pop": 110000,
      "mines-mini": 130000,
      "tile-tap": 135000,
      "paper-toss": 160000,
      "first-cast": 200000,
      "order-up": 250000,
    });
    expect(Object.keys(KMO_UNLOCK_PRICES)).toHaveLength(27);
    expect(unlockPrice("plinko-drop")).toBe(30000);
    expect(unlockPrice("slide-2048")).toBe(75000);
  });

  it("the pool registry carries all nineteen games; the six new ones sit after Drop Match", () => {
    // v400 note: the shelf order became the ladder order —
    // starters first, then every priced game in climbing price
    // order (the full 32 pinned in the v400 tests). The v399 six
    // stand in their price places in that order:
    expect(KMO_POOL.map((i) => i.id)).toEqual([
      "echo-lights", "sort-it-out", "stack",
      "runner", "backbeat", "pipe-dreams", "glide", "jumper", "tend", "block-fit",
      "snake", "crossroads", "breakout", "lights-out", "drop-match",
      "plinko-drop", "cave-flyer", "colour-rush", "flood-it", "rockfall", "mole-patrol", "slide-2048",
      "picross-mini", "knife-log", "bubble-pop", "mines-mini", "tile-tap", "paper-toss", "first-cast", "order-up",
      "word-dig", "chapter",
    ]);
    expect(KMO_POOL.filter((i) => i.kind === "game")).toHaveLength(30);
    for (const id of NEW_GAMES) {
      const item = KMO_POOL.find((i) => i.id === id)!;
      expect(item.kind).toBe("game");
      expect(item.chip).toBe("DEALT · A GAME");
    }
  });

  it("fresh store: the six are locked, the starters open, chapters never locked", () => {
    const fresh = parseKmoProgression(null);
    for (const id of NEW_GAMES) expect(isItemUnlocked(fresh, id)).toBe(false);
    for (const id of KMO_DEFAULT_UNLOCKED) expect(isItemUnlocked(fresh, id)).toBe(true);
    expect(isItemUnlocked(fresh, "chapter")).toBe(true);
    expect(unlockPrice("chapter")).toBeNull();
  });

  it("buying Slide 2048 spends 75,000 from the shared purse and persists", async () => {
    await applyCoinsDelta(150000, "none");
    const result = await unlockGame("slide-2048");
    expect(result).toMatchObject({ owned: true, bought: true, balance: 75000 });
    expect((await loadKmoProgression()).unlocked).toContain("slide-2048");
    const raw = JSON.parse(store.get(KMO_PROGRESSION_KEY)!);
    expect(Object.keys(raw).sort()).toEqual(["best", "unlocked"]);
  });

  it("an unaffordable Plinko buys nothing; a stored unlock list keeps the new ids", async () => {
    await applyCoinsDelta(100, "none");
    const poor = await unlockGame("plinko-drop");
    expect(poor).toMatchObject({ owned: false, bought: false, balance: 100 });
    const parsed = parseKmoProgression({ unlocked: ["colour-rush", "mole-patrol"], best: {} });
    expect(parsed.unlocked).toContain("colour-rush");
    expect(parsed.unlocked).toContain("mole-patrol");
  });

  it("the deal never deals a locked new game; with everything unlocked, they all appear", () => {
    const rng = lcg(99);
    const seen = new Set<string>();
    for (let i = 0; i < 2500; i++) seen.add(dealItem(rng, undefined, KMO_DEFAULT_UNLOCKED).id);
    for (const id of NEW_GAMES) expect(seen.has(id)).toBe(false);
    expect(seen.has("chapter")).toBe(true);

    const all = KMO_POOL.filter((i) => i.kind === "game").map((i) => i.id);
    const rng2 = lcg(100);
    const seenAll = new Set<string>();
    for (let i = 0; i < 4000; i++) seenAll.add(dealItem(rng2, undefined, all).id);
    for (const id of NEW_GAMES) expect(seenAll.has(id)).toBe(true);
  });
});

// ─── 2. Scoring rules ────────────────────────────────────────────────────────

describe("v399 scoring rules", () => {
  it("Plinko slots: edges 250/100, mid 50, near 25, dead centre 10 — and the two tables agree", () => {
    expect([...PLINKO_SLOTS]).toEqual([250, 100, 50, 25, 10, 25, 50, 100, 250]);
    expect([...PLINKO_SLOT_VALUES]).toEqual([...PLINKO_SLOTS]);
    expect(plinkoScoreForSlot(0)).toBe(250);
    expect(plinkoScoreForSlot(4)).toBe(10);
    expect(plinkoScoreForSlot(8)).toBe(250);
  });

  it("Cave Flyer a metre a point + 30 a ring · Colour Rush 15, or 20 inside a second", () => {
    expect(caveScoreFor(87.9, 3)).toBe(177);
    expect(rushAnswerPoints(400)).toBe(20);
    expect(rushAnswerPoints(999)).toBe(20);
    expect(rushAnswerPoints(1000)).toBe(15);
    expect(rushAnswerPoints(2400)).toBe(15);
  });

  it("Rockfall pays by size · Mole Patrol pays 10 plus 2 a chain step, gold a flat 100", () => {
    expect(rockPointsForSize("small")).toBe(10);
    expect(rockPointsForSize("medium")).toBe(20);
    expect(rockPointsForSize("large")).toBe(30);
    expect(moleTapPoints(0)).toBe(10);
    expect(moleTapPoints(3)).toBe(16);
  });
});

// ─── 3. Plinko logic ─────────────────────────────────────────────────────────

describe("v399 Plinko logic", () => {
  const settleBall = (state: ReturnType<typeof plinkoStart>, rng: () => number) => {
    let s = plinkoDrop(state);
    for (let i = 0; i < 12 && s.ball; i++) s = plinkoStep(s, rng);
    return s;
  };

  it("a ball hard-pushed right lands in the 250 edge slot; hard left the same", () => {
    expect(plinkoScore(settleBall(plinkoStart(), () => 0.9))).toBe(250);
    expect(plinkoScore(settleBall(plinkoStart(), () => 0.1))).toBe(250);
  });

  it("a perfectly balanced rattle lands dead centre for 10", () => {
    const seq = [0.1, 0.9];
    let i = 0;
    const s = settleBall(plinkoStart(), () => seq[i++ % 2]);
    expect(s.lastSlot).toBe(4);
    expect(plinkoScore(s)).toBe(10);
  });

  it("one ball at a time, and the run is exactly ten balls", () => {
    const rng = lcg(7);
    let s = plinkoStart();
    s = plinkoDrop(s);
    expect(plinkoDrop(s)).toBe(s); // a ball is already falling
    for (let ball = 0; ball < PLINKO_BALLS_PER_RUN; ball++) {
      s = settleBall(s, rng);
      if (ball === 4) {
        // Half-way: five banked, run still open, aim still slides.
        expect(s.dropped).toBe(5);
        expect(s.over).toBe(false);
        expect(plinkoAim(s, 99).aim).toBe(8);
        expect(plinkoAim(s, -3).aim).toBe(0);
      }
    }
    expect(s.dropped).toBe(PLINKO_BALLS_PER_RUN);
    expect(s.over).toBe(true);
    expect(plinkoDrop(s)).toBe(s); // no eleventh ball
    expect(s.score).toBeGreaterThan(0);
  });
});

// ─── 4. Cave Flyer logic ─────────────────────────────────────────────────────

describe("v399 Cave Flyer logic", () => {
  it("holding rises, letting go falls, and distance accrues", () => {
    const rng = lcg(11);
    const start = caveStart();
    const risen = caveStep(start, 0.05, true, rng);
    expect(risen.y).toBeLessThan(start.y);
    const fallen = caveStep(start, 0.05, false, rng);
    expect(fallen.y).toBeGreaterThan(start.y);
    expect(fallen.distance).toBeGreaterThan(0);
  });

  it("touching the ceiling or the floor ends the run", () => {
    const rng = lcg(12);
    const lowCeil = { ...caveStart(), ceil: caveStart().ceil.map(() => 290) };
    expect(caveStep(lowCeil, 0.05, false, rng).alive).toBe(false);
    const highFloor = { ...caveStart(), floor: caveStart().floor.map(() => 12) };
    expect(caveStep(highFloor, 0.05, false, rng).alive).toBe(false);
  });

  it("flying through a ring pays 30 on top of the metres", () => {
    const rng = lcg(13);
    const start = caveStart();
    const withRing = { ...start, rings: [{ id: 1, x: CAVE_X + 2, y: start.y, taken: false }] };
    const s = caveStep(withRing, 0.05, false, rng);
    expect(s.ringsCollected).toBe(1);
    expect(caveScore(s)).toBe(caveScoreFor(s.distance, 1));
  });
});

// ─── 5. Colour Rush logic ────────────────────────────────────────────────────

describe("v399 Colour Rush logic", () => {
  it("every round's ink is among its four swatches, and the clock shrinks as you climb", () => {
    const rng = lcg(21);
    for (let i = 0; i < 300; i++) {
      const round = rushRound(rng);
      expect(round.choices).toHaveLength(4);
      expect(round.choices).toContain(round.ink);
      expect(new Set(round.choices).size).toBe(4);
      expect(round.word).toBeGreaterThanOrEqual(0);
      expect(round.word).toBeLessThan(RUSH_COLORS.length);
    }
    expect(rushTimeLimitMs(0)).toBe(3000);
    expect(rushTimeLimitMs(10)).toBe(2200);
    expect(rushTimeLimitMs(100)).toBe(1200);
  });

  it("the ink pays — fast answers pay more — and the word itself is a trap", () => {
    const rng = lcg(22);
    const start = rushStart(rng);
    const fast = rushAnswer(start, start.round.ink, 300, rng);
    expect(fast.result).toBe("correct");
    expect(fast.state.score).toBe(20);
    expect(fast.state.correct).toBe(1);
    const slow = rushAnswer(start, start.round.ink, 1800, rng);
    expect(slow.state.score).toBe(15);
    // The word's colour, when it disagrees with the ink, is wrong.
    const trap = start.round.choices.find((c) => c !== start.round.ink)!;
    const wrong = rushAnswer(start, trap, 300, rng);
    expect(wrong.result).toBe("wrong");
    expect(wrong.state.lives).toBe(2);
    expect(wrong.state.score).toBe(0);
  });

  it("three lost lives — by taps or by the clock — end the run", () => {
    const rng = lcg(23);
    let s = rushStart(rng);
    for (let i = 0; i < 2; i++) {
      s = rushAnswer(s, s.round.choices.find((c) => c !== s.round.ink)!, 300, rng).state;
      expect(s.alive).toBe(true);
    }
    s = rushTimeout(s, rng);
    expect(s.lives).toBe(0);
    expect(s.alive).toBe(false);
    expect(rushTimeout(s, rng)).toBe(s);
  });
});

// ─── 6. Rockfall logic ───────────────────────────────────────────────────────

describe("v399 Rockfall logic", () => {
  const rock = (over: Partial<RockState["rocks"][number]>): RockState["rocks"][number] => ({
    id: 1, x: 100, y: 40, size: "small", hp: 1, speed: 58, fast: false, ...over,
  });

  it("crack counts: small 1 tap, medium 2, large 3 — paying 10 / 20 / 30", () => {
    const small = rockTap({ ...rockStart(), rocks: [rock({})] }, 1);
    expect(small.rocks).toHaveLength(0);
    expect(small.score).toBe(10);

    let medium = { ...rockStart(), rocks: [rock({ size: "medium", hp: 2 })] };
    medium = rockTap(medium, 1);
    expect(medium.rocks).toHaveLength(1);
    expect(medium.rocks[0].hp).toBe(1);
    expect(medium.score).toBe(0);
    medium = rockTap(medium, 1);
    expect(medium.rocks).toHaveLength(0);
    expect(medium.score).toBe(20);
  });

  it("a broken large pays its 30 and splits into two fast smalls", () => {
    const s = rockTap({ ...rockStart(), rocks: [rock({ size: "large", hp: 1, y: 90 })] }, 1);
    expect(s.score).toBe(30);
    expect(s.rocks).toHaveLength(2);
    for (const small of s.rocks) {
      expect(small.size).toBe("small");
      expect(small.fast).toBe(true);
      expect(small.hp).toBe(1);
      expect(small.speed).toBeGreaterThan(58);
    }
  });

  it("a rock reaching the garden costs a life; the third costs the run", () => {
    const rng = lcg(31);
    const landing: RockState = {
      ...rockStart(),
      rocks: [rock({ y: ROCK_GARDEN_Y - ROCK_RADIUS.small + 1, speed: 60 })],
    };
    const hit = rockStep(landing, 0.05, rng);
    expect(hit.lives).toBe(2);
    expect(hit.rocks).toHaveLength(0);
    expect(hit.alive).toBe(true);

    const last = rockStep({ ...landing, lives: 1 }, 0.05, rng);
    expect(last.lives).toBe(0);
    expect(last.alive).toBe(false);
  });
});

// ─── 7. Mole Patrol logic ────────────────────────────────────────────────────

describe("v399 Mole Patrol logic", () => {
  const withHole = (state: MoleState, index: number, kind: "mole" | "golden" | "flower"): MoleState => {
    const holes = [...state.holes];
    holes[index] = { kind, age: 0 };
    return { ...state, holes };
  };

  it("a mole pays 10, the next in the chain 12; the golden pays a flat 100", () => {
    let s = moleStart();
    s = moleTap(withHole(s, 0, "mole"), 0);
    expect(s.score).toBe(10);
    expect(s.chain).toBe(1);
    s = moleTap(withHole(s, 4, "mole"), 4);
    expect(s.score).toBe(22);
    expect(s.chain).toBe(2);
    s = moleTap(withHole(s, 8, "golden"), 8);
    expect(s.score).toBe(122);
  });

  it("an empty bed or the flower breaks the chain and pays nothing — never a life", () => {
    let s = moleTap(withHole(moleStart(), 0, "mole"), 0);
    expect(s.chain).toBe(1);
    s = moleTap(s, 5); // empty bed
    expect(s.chain).toBe(0);
    expect(s.score).toBe(10);
    s = moleTap(withHole(s, 2, "mole"), 2);
    s = moleTap(withHole(s, 3, "flower"), 3);
    expect(s.chain).toBe(0);
    expect(s.score).toBe(20);
    expect(s.over).toBe(false);
  });

  it("visitors duck back down on their own — gold fastest — and the chain cools", () => {
    const rng = lcg(41);
    // spawnIn parked far away: this step is about expiry, not arrivals.
    let s = { ...withHole(moleStart(), 0, "mole"), spawnIn: 99 };
    s = moleStep(s, moleLifetime("mole") + 0.05, rng);
    expect(s.holes[0]).toBeNull();
    expect(moleLifetime("golden")).toBeLessThan(moleLifetime("mole"));

    let chained = moleTap(withHole(moleStart(), 1, "mole"), 1);
    expect(chained.chain).toBe(1);
    chained = moleStep(chained, 1.7, rng);
    expect(chained.chain).toBe(0);
  });

  it("the run is sixty seconds: the clock, and only the clock, ends it", () => {
    const rng = lcg(42);
    let s = moleStart();
    expect(s.timeLeft).toBe(MOLE_RUN_SECONDS);
    for (let t = 0; t < 59; t++) s = moleStep(s, 1, rng);
    expect(s.over).toBe(false);
    s = moleStep(s, 1.5, rng);
    expect(s.over).toBe(true);
    expect(s.timeLeft).toBe(0);
    expect(moleTap(s, 0)).toBe(s); // a settled run takes no taps
  });
});

// ─── 8. Slide 2048 logic ─────────────────────────────────────────────────────

describe("v399 Slide 2048 logic", () => {
  const empty = () => Array(16).fill(0);
  const board = (rows: number[][]) => rows.flat();

  it("a new board holds exactly two tiles, each a 2 or a 4; spawns keep that promise", () => {
    const rng = lcg(51);
    const start = slideStart(rng);
    const tiles = start.grid.filter((v) => v > 0);
    expect(tiles).toHaveLength(2);
    for (const t of tiles) expect([2, 4]).toContain(t);
    expect(start.score).toBe(0);
    expect(start.over).toBe(false);
    for (let i = 0; i < 60; i++) {
      const spawned = slideSpawn(empty(), rng).filter((v) => v > 0);
      expect(spawned).toHaveLength(1);
      expect([2, 4]).toContain(spawned[0]);
    }
  });

  it("merges sum into the score, each pair merges once, and columns slide too", () => {
    const row = board([[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    const merged = slideMoveGrid(row, "left");
    expect(merged.gained).toBe(4);
    expect(merged.grid[0]).toBe(4);
    expect(merged.moved).toBe(true);

    const triple = board([[2, 2, 2, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    const t = slideMoveGrid(triple, "left");
    expect(t.gained).toBe(4); // the third 2 does NOT merge again this move
    expect(t.grid.slice(0, 4)).toEqual([4, 2, 0, 0]);

    const pairs = board([[4, 4, 8, 8], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    expect(slideMoveGrid(pairs, "left").gained).toBe(24);
    expect(slideMoveGrid(pairs, "right").grid.slice(0, 4)).toEqual([0, 0, 8, 16]);

    const col = board([[2, 0, 0, 0], [0, 0, 0, 0], [2, 0, 0, 0], [0, 0, 0, 0]]);
    const up = slideMoveGrid(col, "up");
    expect(up.gained).toBe(4);
    expect(up.grid[0]).toBe(4);
  });

  it("a swipe that moves nothing spawns nothing; a real swipe banks merges and tracks the best tile", () => {
    const rng = lcg(52);
    const stuck = board([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]]);
    const state = { grid: stuck, score: 40, bestTile: 4, over: false };
    expect(slideSwipe(state, "left", rng)).toBe(state);

    const open = { grid: board([[4, 4, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), score: 0, bestTile: 4, over: false };
    const swiped = slideSwipe(open, "left", rng);
    expect(swiped.score).toBe(8);
    expect(swiped.bestTile).toBe(8);
    expect(swiped.grid.filter((v) => v > 0)).toHaveLength(2); // the merged 8 + one spawn
  });

  it("game over is a full board with no equal neighbours — and a swipe can land it", () => {
    const rng = lcg(53);
    const full = board([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]]);
    expect(slideGameOver(full)).toBe(true);
    const withGap = [...full];
    withGap[15] = 0;
    expect(slideGameOver(withGap)).toBe(false);
    const withPair = [...full];
    withPair[1] = 2;
    expect(slideGameOver(withPair)).toBe(false);

    // One slide fills the last cell with a tile that matches nothing.
    const almost = {
      grid: board([[2, 4, 2, 4], [4, 2, 4, 2], [64, 4, 2, 4], [8, 16, 8, 0]]),
      score: 900, bestTile: 64, over: false,
    };
    const landed = slideSwipe(almost, "right", rng);
    expect(landed.grid.every((v) => v > 0)).toBe(true);
    expect(landed.over).toBe(true);
  });
});

// ─── 9. Run-end settling ─────────────────────────────────────────────────────

describe("v399 run-end settling", () => {
  it("each run converts exactly once on its own token — Again is a fresh segment, never a double", async () => {
    await applyCoinsDelta(500, "none");
    const run1 = await convertSessionScore(275, "v399-mole-run-1");
    expect(run1).toEqual({ coins: 275, xp: 138 });
    expect(await convertSessionScore(275, "v399-mole-run-1")).toEqual({ coins: 0, xp: 0 });
    const run2 = await convertSessionScore(90, "v399-mole-run-2");
    expect(run2).toEqual({ coins: 90, xp: 45 });
    expect((await loadCoinsRecord()).balance).toBe(865);
  });

  it("best scores record for the new games and survive a reload", async () => {
    expect(await recordBestScore("plinko-drop", 640)).toBe(640);
    expect(await recordBestScore("slide-2048", 4096)).toBe(4096);
    expect(await recordBestScore("plinko-drop", 100)).toBe(640);
    const reloaded = await loadKmoProgression();
    expect(reloaded.best["plinko-drop"]).toBe(640);
    expect(reloaded.best["slide-2048"]).toBe(4096);
    expect(reloaded.unlocked).not.toContain("rockfall");
  });
});

// ─── 10. The shelf and the screen ────────────────────────────────────────────

describe("v399 the shelf and screen", () => {
  it("the shelf lists from KMO_POOL and imports none of the eighteen games", () => {
    const src = read("components/keep-me-occupied/games-shelf.tsx");
    expect(src).toContain("KMO_POOL.map");
    for (const name of [
      "RunnerGame", "GlideGame", "JumperGame", "SnakeGame", "CrossroadsGame",
      "BreakoutGame", "DropMatchGame", "EchoLightsGame", "SortItOutGame",
      "StackGame", "BackbeatGame", "TendGame",
      "PlinkoDropGame", "CaveFlyerGame", "ColourRushGame", "RockfallGame",
      "MolePatrolGame", "Slide2048Game",
    ]) {
      expect(src, name).not.toContain(name);
    }
  });

  it("all six components carry the shared run-end card, and the screen wires them as run games", () => {
    for (const file of ["plinko-drop", "cave-flyer", "colour-rush", "rockfall", "mole-patrol", "slide-2048"]) {
      const src = read(`components/keep-me-occupied/${file}.tsx`);
      expect(src, file).toContain("RunEndCard");
      expect(src, file).toContain("onRunEnd");
    }
    const screen = read("app/keep-me-occupied.tsx");
    for (const name of ["PlinkoDropGame", "CaveFlyerGame", "ColourRushGame", "RockfallGame", "MolePatrolGame", "Slide2048Game"]) {
      expect(screen, name).toContain(name);
    }
    for (const id of NEW_GAMES) expect(screen, id).toContain(`"${id}"`);
  });

  it("Slide 2048's best tile rides the run-end card's extra line, not the store", () => {
    const src = read("components/keep-me-occupied/slide-2048.tsx");
    expect(src).toContain("extraLine");
    expect(src).toContain("Best tile this run");
  });
});

// ─── 11. Wave data still never persisted ─────────────────────────────────────

describe("v399 wave data stays ledger-free", () => {
  it("a full new-roster flow writes only whitelisted keys", async () => {
    await applyCoinsDelta(90000, "none");
    writtenKeys.length = 0;
    await convertSessionScore(720, "v399-wave-check");
    await recordBestScore("cave-flyer", 720);
    await unlockGame("plinko-drop");
    await unlockGame("colour-rush");
    const allowed = new Set([COINS_STORAGE_KEY, XP_STORAGE_KEY, XP_AWARDS_STORAGE_KEY, KMO_PROGRESSION_KEY, STAT_POINTS_STORAGE_KEY]);
    for (const key of writtenKeys) expect(allowed.has(key), key).toBe(true);
    for (const key of allowed) {
      const value = store.get(key);
      if (!value) continue;
      expect(value).not.toContain("entryRating");
      expect(value).not.toContain("startedAt");
    }
    const raw = JSON.parse(store.get(KMO_PROGRESSION_KEY)!);
    expect(Object.keys(raw).sort()).toEqual(["best", "unlocked"]);
    expect(raw.unlocked).toEqual(expect.arrayContaining(["plinko-drop", "colour-rush"]));
  });
});
