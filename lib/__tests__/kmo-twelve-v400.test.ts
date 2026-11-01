// v400 — Keep Me Occupied takes twelve more (Jonathan: "Add all
// 12 if you can", Oct 31): six action games (Knife Log, Bubble
// Pop Wrap, Tile Tap, Paper Toss, First Cast, Order Up) and six
// puzzles (Pipe Dreams, Block Fit, Lights Out, Flood It, Picross
// Mini, Mines Mini). His variety rules, stated while these
// queued: neverending games are the MAJORITY of the roster, no
// repeated mechanics (twelve new verbs), and different concepts
// AND different themes. Plus his mid-build addendum: a live coin
// readout on the dealt screen — purse now, "+N this visit" as he
// plays.
//
// These pins hold:
//   1. The ladder — thirty-one games in all: four open doors and
//      twenty-seven priced ones, puzzles woven between the action
//      prices, Order Up at 250,000 on top; the pool registry is
//      in ladder order; the deal never deals a locked game;
//      chapters stay never-locked.
//   2. Each game's scoring rules and core logic: Knife Log's
//      stages and steel-on-steel, Bubble Pop's chain rate and
//      refilling sheet, Tile Tap's ramp and miss rules, Paper
//      Toss's wind and streak, First Cast's meter/bite/reel and
//      three escapes, Order Up's tickets and patience, Pipe
//      Dreams' rotations and par, Block Fit's clears and combos,
//      Lights Out's toggles and par, Flood It's steps, Picross's
//      clues and mistakes, Mines' safe first tap and flood reveal.
//      The lib tables and the progression tables agree everywhere
//      they both speak.
//   3. Run-end settling — a run converts exactly once on its own
//      token; best scores record for the new games.
//   4. The coin readout — purse + accumulating, settlement moves
//      coins between the two without moving their story, whole
//      numbers only; the shelf carries the purse at its top.
//   5. The shelf lists from the registry; the screen wires all
//      twelve (ten run games with the shared run-end card, two
//      session puzzles without one).
//   6. Wave data is STILL never persisted (the v397 whitelist).

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
  blockFitClearPointsFor,
  bubbleMultiplierFor,
  bubblePopPoints,
  convertSessionScore,
  fishPointsForRarity,
  floodBoardScoreFor,
  isItemUnlocked,
  knifeScoreFor,
  lightsBoardScoreFor,
  loadKmoProgression,
  minesBoardScoreFor,
  orderServePointsFor,
  paperMakePointsFor,
  parseKmoProgression,
  picrossBoardScoreFor,
  pipeBoardScoreFor,
  recordBestScore,
  tileTapScoreFor,
  unlockGame,
  unlockPrice,
  visitReadout,
} from "../kmo-progression";
import {
  FISH_POINTS,
  FLOOD_COLORS,
  KMO_POOL,
  MINES_COUNT,
  ORDER_INGREDIENTS,
  PAPER_BIN_HALF,
  PIPE_E,
  PIPE_N,
  PIPE_S,
  PIPE_W,
  TILE_FIELD_H,
  blockCanPlace,
  blockFitClearPoints,
  blockFitsAnywhere,
  blockPlace,
  blockScore,
  blockStart,
  bubbleMultiplier,
  bubblePop,
  bubbleScore,
  bubbleStart,
  bubbleStep,
  castScore,
  castStart,
  castStep,
  castTap,
  dealItem,
  floodApply,
  floodBoardScore,
  floodRegion,
  floodScore,
  floodStart,
  knifeStageConfig,
  knifeStart,
  knifeStep,
  knifeThrow,
  lightsBoardScore,
  lightsPress,
  lightsScore,
  lightsStart,
  minesAdjacent,
  minesBoardScore,
  minesFlag,
  minesReveal,
  minesScore,
  minesStart,
  orderAdd,
  orderScore,
  orderServe,
  orderServePoints,
  orderStart,
  orderStep,
  paperLanding,
  paperMakePoints,
  paperScore,
  paperStart,
  paperStep,
  paperThrow,
  picrossBoardScore,
  picrossClues,
  picrossFill,
  picrossMark,
  picrossScore,
  picrossStart,
  pipeBoardScore,
  pipeDeal,
  pipeFlow,
  pipeRotate,
  pipeRotateBits,
  pipeScore,
  pipeSkip,
  pipeSolved,
  pipeStart,
  tileScore,
  tileSpeed,
  tileStart,
  tileStep,
  tileTapMiss,
  tileTapTile,
  type BlockState,
  type CastState,
  type KnifeState,
  type OrderState,
  type PipeBoard,
  type PipeState,
} from "../keep-me-occupied";
import { COINS_STORAGE_KEY, applyCoinsDelta, formatCoins, loadCoinsRecord } from "../hometown";
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

const NEW_GAMES = [
  "knife-log", "bubble-pop", "tile-tap", "paper-toss", "first-cast", "order-up",
  "pipe-dreams", "block-fit", "lights-out", "flood-it", "picross-mini", "mines-mini",
] as const;

const FULL_LADDER = {
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
};

beforeEach(() => {
  store.clear();
  writtenKeys.length = 0;
});

// ─── 1. The ladder ───────────────────────────────────────────────────────────

describe("v400 the ladder", () => {
  it("thirty-one games: twenty-seven priced doors woven and climbing to Order Up at 250,000", () => {
    expect(KMO_UNLOCK_PRICES).toEqual(FULL_LADDER);
    expect(Object.keys(KMO_UNLOCK_PRICES)).toHaveLength(27);
    expect(unlockPrice("order-up")).toBe(250000);
    expect(unlockPrice("pipe-dreams")).toBe(4500);
    expect(unlockPrice("block-fit")).toBe(8500);
    expect(unlockPrice("flood-it")).toBe(45000);
  });

  it("the pool is the full roster in ladder order — starters first, prices climbing", () => {
    expect(KMO_POOL.map((i) => i.id)).toEqual([
      "echo-lights", "sort-it-out", "stack",
      "runner", "backbeat", "pipe-dreams", "glide", "jumper", "tend", "block-fit",
      "snake", "crossroads", "breakout", "lights-out", "drop-match",
      "plinko-drop", "cave-flyer", "colour-rush", "flood-it", "rockfall", "mole-patrol", "slide-2048",
      "picross-mini", "knife-log", "bubble-pop", "mines-mini", "tile-tap", "paper-toss", "first-cast", "order-up",
      "word-dig", "chapter",
    ]);
    expect(KMO_POOL.filter((i) => i.kind === "game")).toHaveLength(30);
    // Shelf order IS ladder order: priced games climb monotonically.
    const prices = KMO_POOL
      .filter((i) => i.kind === "game")
      .map((i) => unlockPrice(i.id))
      .filter((p): p is number => p != null);
    expect(prices).toHaveLength(27);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    for (const id of NEW_GAMES) {
      const item = KMO_POOL.find((i) => i.id === id)!;
      expect(item.kind).toBe("game");
      expect(item.chip).toBe("DEALT · A GAME");
    }
  });

  it("fresh store: the twelve are locked, the starters open, chapters never locked", () => {
    const fresh = parseKmoProgression(null);
    for (const id of NEW_GAMES) expect(isItemUnlocked(fresh, id)).toBe(false);
    for (const id of KMO_DEFAULT_UNLOCKED) expect(isItemUnlocked(fresh, id)).toBe(true);
    expect(isItemUnlocked(fresh, "chapter")).toBe(true);
    expect(unlockPrice("chapter")).toBeNull();
  });

  it("buying Order Up spends 250,000 from the shared purse and persists", async () => {
    await applyCoinsDelta(300000, "none");
    const result = await unlockGame("order-up");
    expect(result).toMatchObject({ owned: true, bought: true, balance: 50000 });
    expect((await loadKmoProgression()).unlocked).toContain("order-up");
    const raw = JSON.parse(store.get(KMO_PROGRESSION_KEY)!);
    expect(Object.keys(raw).sort()).toEqual(["best", "unlocked"]);
    // A stored unlock list keeps the new ids across a reload.
    const parsed = parseKmoProgression({ unlocked: ["pipe-dreams", "mines-mini", "first-cast"], best: {} });
    for (const id of ["pipe-dreams", "mines-mini", "first-cast"]) expect(parsed.unlocked).toContain(id);
  });

  it("the deal never deals a locked new game; with everything unlocked, they all appear", () => {
    const rng = lcg(400);
    const seen = new Set<string>();
    for (let i = 0; i < 4000; i++) seen.add(dealItem(rng, undefined, KMO_DEFAULT_UNLOCKED).id);
    for (const id of NEW_GAMES) expect(seen.has(id)).toBe(false);
    expect(seen.has("chapter")).toBe(true);

    const all = KMO_POOL.filter((i) => i.kind === "game").map((i) => i.id);
    const rng2 = lcg(401);
    const seenAll = new Set<string>();
    for (let i = 0; i < 9000; i++) seenAll.add(dealItem(rng2, undefined, all).id);
    for (const id of NEW_GAMES) expect(seenAll.has(id)).toBe(true);
  });
});

// ─── 2. Scoring rules (and the two tables agree) ─────────────────────────────

describe("v400 scoring rules", () => {
  it("Knife Log 15 a knife + 50 a stage · Tile Tap 10 a tile", () => {
    expect(knifeScoreFor(0, 0)).toBe(0);
    expect(knifeScoreFor(10, 2)).toBe(250);
    expect(tileTapScoreFor(7)).toBe(70);
  });

  it("Bubble Pop pays 2 × the chain rate (×2 at 8 quick pops, ×3 at 16)", () => {
    expect(bubblePopPoints(1)).toBe(2);
    expect(bubblePopPoints(7)).toBe(2);
    expect(bubblePopPoints(8)).toBe(4);
    expect(bubblePopPoints(15)).toBe(4);
    expect(bubblePopPoints(16)).toBe(6);
    for (const chain of [0, 7, 8, 15, 16, 40]) {
      expect(bubbleMultiplier(chain), `chain ${chain}`).toBe(bubbleMultiplierFor(chain));
    }
  });

  it("Paper Toss makes pay 25 + 10 a streak step · fish pay 30 / 75 / 200", () => {
    expect(paperMakePointsFor(0)).toBe(25);
    expect(paperMakePointsFor(1)).toBe(35);
    expect(paperMakePointsFor(3)).toBe(55);
    for (const streak of [0, 1, 2, 5]) expect(paperMakePoints(streak)).toBe(paperMakePointsFor(streak));
    expect(fishPointsForRarity("common")).toBe(30);
    expect(fishPointsForRarity("uncommon")).toBe(75);
    expect(fishPointsForRarity("rare")).toBe(200);
    expect(FISH_POINTS).toEqual({ common: 30, uncommon: 75, rare: 200 });
  });

  it("Order Up serves 40 + 5 an ingredient + up to 20 for speed", () => {
    expect(orderServePointsFor(2, 1)).toBe(70);
    expect(orderServePointsFor(5, 1)).toBe(85);
    expect(orderServePointsFor(3, 0)).toBe(55);
    expect(orderServePointsFor(3, 0.5)).toBe(65);
    for (const [n, f] of [[2, 1], [4, 0.25], [5, 0]] as const) {
      expect(orderServePoints(n, f)).toBe(orderServePointsFor(n, f));
    }
  });

  it("puzzle boards: Pipe 300 − 5/s − 10/over-par · Lights 200 − 10/over-par · Flood (21 − steps) × 15", () => {
    expect(pipeBoardScoreFor(0, 5, 5)).toBe(300);
    expect(pipeBoardScoreFor(10, 5, 5)).toBe(250);
    expect(pipeBoardScoreFor(0, 8, 5)).toBe(270);
    expect(pipeBoardScoreFor(1000, 99, 0)).toBe(0);
    expect(lightsBoardScoreFor(9, 9)).toBe(200);
    expect(lightsBoardScoreFor(12, 9)).toBe(170);
    expect(lightsBoardScoreFor(99, 0)).toBe(0);
    expect(floodBoardScoreFor(1)).toBe(300);
    expect(floodBoardScoreFor(20)).toBe(15);
    expect(floodBoardScoreFor(21)).toBe(0);
    for (const [s, r, p] of [[0, 5, 5], [7, 9, 4], [30, 3, 3]] as const) {
      expect(pipeBoardScore(s, r, p)).toBe(pipeBoardScoreFor(s, r, p));
    }
    for (const [t, p] of [[9, 9], [15, 8]] as const) {
      expect(lightsBoardScore(t, p)).toBe(lightsBoardScoreFor(t, p));
    }
    for (const steps of [1, 12, 20]) expect(floodBoardScore(steps)).toBe(floodBoardScoreFor(steps));
  });

  it("Block Fit pays 10 a cell + 50 a combo line · Picross 300 − 5/s − 25/mistake · Mines 200 + speed", () => {
    expect(blockFitClearPointsFor(8, 1)).toBe(80);
    expect(blockFitClearPointsFor(15, 2)).toBe(200);
    expect(blockFitClearPointsFor(0, 0)).toBe(0);
    expect(picrossBoardScoreFor(0, 0)).toBe(300);
    expect(picrossBoardScoreFor(10, 1)).toBe(225);
    expect(picrossBoardScoreFor(100, 3)).toBe(0);
    expect(minesBoardScoreFor(0)).toBe(350);
    expect(minesBoardScoreFor(150)).toBe(200);
    expect(minesBoardScoreFor(999)).toBe(200);
    for (const [c, l] of [[8, 1], [15, 2], [23, 3]] as const) {
      expect(blockFitClearPoints(c, l)).toBe(blockFitClearPointsFor(c, l));
    }
    for (const [s, mst] of [[0, 0], [20, 2]] as const) {
      expect(picrossBoardScore(s, mst)).toBe(picrossBoardScoreFor(s, mst));
    }
    for (const s of [0, 60, 200]) expect(minesBoardScore(s)).toBe(minesBoardScoreFor(s));
  });
});

// ─── 3. Knife Log logic ──────────────────────────────────────────────────────

describe("v400 Knife Log logic", () => {
  const bareLog = (over: Partial<KnifeState> = {}): KnifeState => ({
    ...knifeStart(lcg(61)),
    stuck: [],
    angle: 0,
    ...over,
  });

  it("stages grow meaner: quota and prestuck climb (capped), speed grows and flips direction", () => {
    const s1 = knifeStageConfig(1);
    const s2 = knifeStageConfig(2);
    expect(s1.quota).toBe(6);
    expect(s1.prestuck).toBe(2);
    expect(s1.speed).toBeGreaterThan(0);
    expect(s2.speed).toBeLessThan(0);
    expect(Math.abs(s2.speed)).toBeGreaterThan(Math.abs(s1.speed));
    expect(knifeStageConfig(20).quota).toBe(9);
    expect(knifeStageConfig(20).prestuck).toBe(5);
  });

  it("the log spins at its stage speed; a thrown knife sticks at the bottom point for 15", () => {
    const spun = knifeStep(bareLog(), 1);
    expect(spun.angle).toBe(knifeStageConfig(1).speed);
    const stuck = knifeThrow(bareLog(), lcg(62));
    expect(stuck.over).toBe(false);
    expect(stuck.stuckTotal).toBe(1);
    expect(stuck.score).toBe(15);
    expect(stuck.stuck).toHaveLength(1);
  });

  it("steel on steel ends the run: a second knife at the same resting angle clangs", () => {
    const once = knifeThrow(bareLog(), lcg(63));
    const twice = knifeThrow(once, lcg(64));
    expect(twice.over).toBe(true);
    expect(twice.score).toBe(once.score); // the clang itself pays nothing
    expect(knifeThrow(twice, lcg(65))).toBe(twice);
  });

  it("sticking the quota banks the 50 bonus and opens the next stage with fresh prestuck", () => {
    const almost = bareLog({ thrownThisStage: 5, stuckTotal: 5, score: 75 });
    const cleared = knifeThrow(almost, lcg(66));
    expect(cleared.stage).toBe(2);
    expect(cleared.stagesCleared).toBe(1);
    expect(cleared.score).toBe(75 + 15 + 50);
    expect(cleared.thrownThisStage).toBe(0);
    expect(cleared.stuck).toHaveLength(knifeStageConfig(2).prestuck);
  });
});

// ─── 4. Bubble Pop Wrap logic ────────────────────────────────────────────────

describe("v400 Bubble Pop logic", () => {
  it("pops pay 2, quick chains raise the rate, and a 1.5s pause cools it back", () => {
    let s = bubbleStart();
    s = bubblePop(s, 0);
    expect(s.score).toBe(2);
    expect(s.chain).toBe(1);
    expect(bubblePop(s, 0)).toBe(s); // already popped
    for (let i = 1; i < 8; i++) s = bubblePop(s, i);
    expect(s.chain).toBe(8);
    expect(s.score).toBe(7 * 2 + 4); // the eighth pop paid at ×2
    const cooled = bubbleStep(s, 1.6);
    expect(cooled.chain).toBe(0);
    const afterPause = bubblePop({ ...cooled, timeLeft: 30 }, 20);
    expect(afterPause.chain).toBe(1);
  });

  it("the sheet refills in a fresh wave before it can run dry", () => {
    let s = bubbleStart();
    for (let i = 0; i < 39; i++) s = bubblePop(s, i);
    expect(s.pops).toBe(39);
    expect(s.waves).toBe(2); // popped past the refill line mid-sheet
    expect(s.popped.filter(Boolean)).toHaveLength(0); // a fresh sheet, whole
  });

  it("sixty seconds is the run: the clock, and only the clock, ends it", () => {
    let s = bubbleStart();
    for (let t = 0; t < 59; t++) s = bubbleStep(s, 1);
    expect(s.over).toBe(false);
    s = bubbleStep(s, 1.5);
    expect(s.over).toBe(true);
    expect(bubbleScore(bubblePop(s, 3))).toBe(bubbleScore(s));
  });
});

// ─── 5. Tile Tap logic ───────────────────────────────────────────────────────

describe("v400 Tile Tap logic", () => {
  it("the scroll ramps from 150 px/s to a 340 cap", () => {
    expect(tileSpeed(0)).toBe(150);
    expect(tileSpeed(10)).toBe(182);
    expect(tileSpeed(1000)).toBe(340);
  });

  it("tapping a dark tile pays 10 and clears it; tapping the white ends the run", () => {
    const withTile = { ...tileStart(), tiles: [{ id: 7, lane: 2, y: 40 }] };
    const tapped = tileTapTile(withTile, 7);
    expect(tapped.score).toBe(10);
    expect(tapped.tiles).toHaveLength(0);
    expect(tileScore(tileTapMiss(withTile))).toBe(0);
    expect(tileTapMiss(withTile).over).toBe(true);
  });

  it("a dark tile that slides past the bottom was missed — and that ends the run", () => {
    const low = { ...tileStart(), tiles: [{ id: 1, lane: 0, y: TILE_FIELD_H - 2 }] };
    const stepped = tileStep(low, 0.1, lcg(71));
    expect(stepped.over).toBe(true);
  });

  it("tiles spawn as it runs and never stack two in a lane", () => {
    const rng = lcg(72);
    let s = tileStart();
    for (let t = 0; t < 40 && s.tiles.length === 0; t++) s = tileStep(s, 0.1, rng);
    expect(s.tiles.length).toBeGreaterThan(0);
    expect(s.over).toBe(false);
  });
});

// ─── 6. Paper Toss logic ─────────────────────────────────────────────────────

describe("v400 Paper Toss logic", () => {
  const stillAir = () => paperStart(() => 0.5); // wind exactly 0
  const resolve = (s: ReturnType<typeof paperStart>) => paperStep(paperStep(s, 0.5, () => 0.5), 0.5, () => 0.5);

  it("a dead-centre flick in still air is a make for 25; the streak pays more", () => {
    let s = resolve(paperThrow(stillAir(), 0, 0));
    expect(s.lastResult).toBe("make");
    expect(s.score).toBe(25);
    expect(s.streak).toBe(1);
    s = resolve(paperThrow(s, 0, 0));
    expect(s.score).toBe(25 + 35);
    expect(s.streak).toBe(2);
  });

  it("the fan bends the landing: a centred flick in a hard right wind misses", () => {
    const windy = { ...stillAir(), wind: 1 };
    expect(paperLanding({ t: 0, aimOffset: 0, drift: 0, wind: 1 })).toBe(16);
    expect(16).toBeGreaterThan(PAPER_BIN_HALF);
    const s = resolve(paperThrow(windy, 0, 0));
    expect(s.lastResult).toBe("miss");
    expect(s.streak).toBe(0);
  });

  it("three misses total close the desk", () => {
    let s = stillAir();
    for (let i = 0; i < 2; i++) {
      s = resolve(paperThrow(s, 45, 0));
      expect(s.over).toBe(false);
    }
    s = resolve(paperThrow(s, 45, 0));
    expect(s.misses).toBe(3);
    expect(s.over).toBe(true);
    expect(paperThrow(s, 0, 0)).toBe(s);
  });
});

// ─── 7. First Cast logic ─────────────────────────────────────────────────────

describe("v400 First Cast logic", () => {
  const noSurge = () => 0.99;

  it("the cast tap reads the meter: dead on the sweet spot is a true cast", () => {
    const ready = { ...castStart(), meter: 0.8 };
    const cast = castTap(ready, () => 0.5);
    expect(cast.phase).toBe("wait");
    expect(cast.accuracy).toBe(1);
    expect(cast.waitIn).toBeCloseTo(3.2, 5);
  });

  it("the bobber dips into a bite; a slept-on bite is an escape", () => {
    const waiting: CastState = { ...castStart(), phase: "wait", waitIn: 0.05 };
    const biting = castStep(waiting, 0.1, false, noSurge);
    expect(biting.phase).toBe("bite");
    expect(biting.fish).not.toBeNull();
    const slept = castStep(biting, 1, false, noSurge);
    expect(slept.escapes).toBe(1);
    expect(slept.phase).toBe("meter");
  });

  it("the reel is a negotiation: holding raises tension and progress; the top snaps the line", () => {
    const hooked: CastState = { ...castStart(), phase: "reel", fish: "common", tension: 30, progress: 0 };
    const held = castStep(hooked, 0.5, true, noSurge);
    expect(held.tension).toBeGreaterThan(30);
    expect(held.progress).toBeGreaterThan(0);
    const eased = castStep(held, 0.5, false, noSurge);
    expect(eased.tension).toBeLessThan(held.tension);
    const snapped = castStep({ ...hooked, tension: 96 }, 0.2, true, noSurge);
    expect(snapped.escapes).toBe(1);
    expect(snapped.phase).toBe("meter");
  });

  it("progress home lands the fish at its rarity price; three escapes end the day", () => {
    const nearly: CastState = { ...castStart(), phase: "reel", fish: "common", tension: 10, progress: 99 };
    const landed = castStep(nearly, 0.1, true, noSurge);
    expect(landed.phase).toBe("caught");
    expect(landed.score).toBe(30);
    expect(landed.caughtCount).toBe(1);
    expect(castScore(landed)).toBe(30);

    let s: CastState = { ...castStart(), phase: "bite", biteIn: 0.01, escapes: 2, fish: "rare" };
    s = castStep(s, 0.1, false, noSurge);
    expect(s.escapes).toBe(3);
    expect(s.over).toBe(true);
  });
});

// ─── 8. Order Up logic ───────────────────────────────────────────────────────

describe("v400 Order Up logic", () => {
  const withTicket = (stack: OrderState["ticket"]["stack"]): OrderState => ({
    ...orderStart(lcg(81)),
    ticket: { stack, total: 45, left: 45 },
    built: [],
  });

  it("tickets post two to five ingredients from the eight on the rail", () => {
    const rng = lcg(82);
    for (let i = 0; i < 200; i++) {
      const t = orderStart(rng).ticket;
      expect(t.stack.length).toBeGreaterThanOrEqual(2);
      expect(t.stack.length).toBeLessThanOrEqual(5);
      for (const ing of t.stack) expect(ORDER_INGREDIENTS).toContain(ing);
    }
  });

  it("build in the ticket's order and serve: base + per-ingredient + speed", () => {
    let s = withTicket(["patty", "cheese"]);
    s = orderAdd(s, "patty");
    s = orderAdd(s, "cheese");
    expect(s.built).toEqual(["patty", "cheese"]);
    const served = orderServe(s, lcg(83));
    expect(served.score).toBe(70); // 40 + 2×5 + 20 speed at full patience
    expect(served.served).toBe(1);
    expect(served.built).toEqual([]);
  });

  it("a wrong ingredient scraps the build — time is all it costs; an unfinished burger can't serve", () => {
    let s = withTicket(["patty", "cheese"]);
    s = orderAdd(s, "patty");
    s = orderAdd(s, "egg");
    expect(s.built).toEqual([]);
    expect(s.lives).toBe(3);
    expect(orderServe(s, lcg(84))).toBe(s);
  });

  it("patience drains: an expired ticket costs a ticket-life; the third ends the run", () => {
    let s = withTicket(["patty"]);
    s = orderStep(s, 46, lcg(85));
    expect(s.lives).toBe(2);
    expect(s.built).toEqual([]);
    expect(s.over).toBe(false);
    s = orderStep({ ...s, lives: 1 }, 46, lcg(86));
    expect(s.lives).toBe(0);
    expect(s.over).toBe(true);
    expect(orderScore(s)).toBe(0);
  });
});

// ─── 9. Pipe Dreams logic ────────────────────────────────────────────────────

describe("v400 Pipe Dreams logic", () => {
  it("rotating turns openings clockwise: N→E→S→W→N, four turns home", () => {
    expect(pipeRotateBits(PIPE_N, 1)).toBe(PIPE_E);
    expect(pipeRotateBits(PIPE_E, 1)).toBe(PIPE_S);
    expect(pipeRotateBits(PIPE_S, 1)).toBe(PIPE_W);
    expect(pipeRotateBits(PIPE_W, 1)).toBe(PIPE_N);
    expect(pipeRotateBits(PIPE_N | PIPE_S, 1)).toBe(PIPE_E | PIPE_W);
    expect(pipeRotateBits(PIPE_N | PIPE_E, 4)).toBe(PIPE_N | PIPE_E);
  });

  const straightRowBoard = (): PipeBoard => {
    const tiles = Array.from({ length: 25 }, () => ({ openings: PIPE_N | PIPE_S, rotation: 0 }));
    for (let x = 0; x < 5; x++) tiles[2 * 5 + x] = { openings: PIPE_E | PIPE_W, rotation: 0 };
    return { tiles, par: 0 };
  };

  it("water runs a straight middle row spring to garden; one turned tile breaks it", () => {
    const board = straightRowBoard();
    expect(pipeFlow(board).size).toBeGreaterThanOrEqual(5);
    expect(pipeSolved(board)).toBe(true);
    const broken: PipeBoard = {
      par: 0,
      tiles: board.tiles.map((t, i) => (i === 12 ? { ...t, rotation: 1 } : t)),
    };
    expect(pipeSolved(broken)).toBe(false);
  });

  it("a dealt board is never already solved, and rotating the last kink home banks it", () => {
    const rng = lcg(91);
    for (let i = 0; i < 60; i++) expect(pipeSolved(pipeDeal(rng))).toBe(false);

    const board = straightRowBoard();
    const kinked: PipeState = {
      board: { tiles: board.tiles.map((t, i) => (i === 12 ? { ...t, rotation: 1 } : t)), par: 2 },
      rotations: 0,
      elapsed: 0,
      boards: 0,
      score: 0,
    };
    // A straight is home again after one more turn (rotation 2 ≡ 0 for it).
    const solved = pipeRotate(kinked, 12, rng);
    expect(solved.boards).toBe(1);
    expect(solved.score).toBe(pipeBoardScore(0, 1, 2));
    expect(solved.rotations).toBe(0);

    const skipped = pipeSkip(kinked, rng);
    expect(skipped.score).toBe(0);
    expect(skipped.boards).toBe(0);
    expect(pipeScore(skipped)).toBe(0);
  });
});

// ─── 10. Block Fit logic ─────────────────────────────────────────────────────

describe("v400 Block Fit logic", () => {
  const emptyBoard = () => Array(64).fill(null) as BlockState["board"];
  const single: BlockState["tray"][number] = { cells: [[0, 0]], color: "#C9452F" };

  it("placement respects the walls and the pieces already down", () => {
    const board = emptyBoard();
    const domino = { cells: [[0, 0], [1, 0]] as [number, number][], color: "#4A7FC9" };
    expect(blockCanPlace(board, domino, 6, 0)).toBe(true);
    expect(blockCanPlace(board, domino, 7, 0)).toBe(false);
    expect(blockCanPlace(board, domino, 0, -1)).toBe(false);
    board[0] = "#000000";
    expect(blockCanPlace(board, domino, 0, 0)).toBe(false);
    expect(blockFitsAnywhere(board, domino)).toBe(true);
  });

  it("a full row clears at 10 a cell; a row and a column together pay the combo", () => {
    const rng = lcg(101);
    const rowBoard = emptyBoard();
    for (let x = 0; x < 7; x++) rowBoard[x] = "#7FB069";
    const rowState: BlockState = { over: false, board: rowBoard, tray: [single, null, null], score: 0, placed: 0 };
    const cleared = blockPlace(rowState, 0, 7, 0, rng);
    expect(cleared.score).toBe(80);
    expect(cleared.board.slice(0, 8).every((c) => c === null)).toBe(true);

    const crossBoard = emptyBoard();
    for (let x = 0; x < 7; x++) crossBoard[x] = "#7FB069";
    for (let y = 1; y < 8; y++) crossBoard[y * 8 + 7] = "#7FB069";
    const crossState: BlockState = { over: false, board: crossBoard, tray: [single, null, null], score: 0, placed: 0 };
    const combo = blockPlace(crossState, 0, 7, 0, rng);
    expect(combo.score).toBe(200); // 15 cells × 10 + 50 combo
  });

  it("an emptied tray deals three fresh pieces", () => {
    const rng = lcg(102);
    const state: BlockState = { over: false, board: emptyBoard(), tray: [single, null, null], score: 0, placed: 0 };
    const placed = blockPlace(state, 0, 3, 3, rng);
    expect(placed.tray.every((p) => p !== null)).toBe(true);
    expect(placed.placed).toBe(1);
  });

  it("when nothing left on the tray fits anywhere, the run ends", () => {
    const rng = lcg(103);
    const board = emptyBoard().map(() => "#8B6FD8") as BlockState["board"];
    // A hole in every row and column (so nothing can clear), the
    // first three clustered at the corner the single will fill.
    for (const idx of [0, 1, 8, 19, 29, 34, 46, 52, 63]) board[idx] = null;
    const domino = { cells: [[0, 0], [1, 0]] as [number, number][], color: "#4A7FC9" };
    const state: BlockState = { over: false, board, tray: [single, domino, null], score: 0, placed: 0 };
    const placed = blockPlace(state, 0, 0, 0, rng);
    // The holes left touch only diagonally or not at all: the
    // domino fits nowhere → run over, and nothing cleared.
    expect(placed.over).toBe(true);
    expect(blockScore(placed)).toBe(0);
    expect(blockPlace(placed, 1, 0, 0, rng)).toBe(placed);
  });
});

// ─── 11. Lights Out logic ────────────────────────────────────────────────────

describe("v400 Lights Out logic", () => {
  it("a tap flips the lamp and its orthogonal neighbours — five in the middle, three in a corner", () => {
    const dark = { ...lightsStart(lcg(111)), cells: Array(25).fill(false), taps: 0, par: 9, boards: 0, score: 0 };
    const centre = lightsPress(dark, 12, lcg(112));
    expect(centre.cells.filter(Boolean)).toHaveLength(5);
    for (const i of [12, 11, 13, 7, 17]) expect(centre.cells[i]).toBe(true);
    const corner = lightsPress(dark, 0, lcg(113));
    expect(corner.cells.filter(Boolean)).toHaveLength(3);
    for (const i of [0, 1, 5]) expect(corner.cells[i]).toBe(true);
  });

  it("the last tap banks 200 − 10 per tap over par and deals a fresh board", () => {
    const oneAway = {
      cells: Array(25).fill(false),
      taps: 0,
      par: 9,
      boards: 0,
      score: 0,
    };
    for (const i of [12, 11, 13, 7, 17]) oneAway.cells[i] = true;
    const solved = lightsPress(oneAway, 12, lcg(114));
    expect(solved.score).toBe(200);
    expect(solved.boards).toBe(1);
    expect(solved.taps).toBe(0);
    expect(solved.cells.some(Boolean)).toBe(true); // the next board is lit, not dealt solved
    expect(lightsScore(solved)).toBe(200);
  });

  it("a dealt board is never dark already", () => {
    const rng = lcg(115);
    for (let i = 0; i < 40; i++) expect(lightsStart(rng).cells.some(Boolean)).toBe(true);
  });
});

// ─── 12. Flood It logic ──────────────────────────────────────────────────────

describe("v400 Flood It logic", () => {
  it("the region is the corner's colour, connected; flooding with its own colour spends no step", () => {
    const board = Array(64).fill(1);
    board[0] = 0;
    expect(floodRegion(board).size).toBe(1);
    const state = { ...floodStart(lcg(121)), board };
    expect(floodApply(state, 0, lcg(122))).toBe(state);
  });

  it("flooding the last patch banks (21 − steps) × 15 and deals a fresh board", () => {
    const board = Array(64).fill(1);
    board[0] = 0;
    const state = { ...floodStart(lcg(123)), board, steps: 0 };
    const solved = floodApply(state, 1, lcg(124));
    expect(solved.score).toBe(300);
    expect(solved.boards).toBe(1);
    expect(solved.steps).toBe(0);
    expect(solved.over).toBe(false);
  });

  it("twenty steps without a flood ends the run", () => {
    // A checkerboard floods a ring at a time — nowhere near done in one step.
    const board = Array.from({ length: 64 }, (_, i) => (i + Math.floor(i / 8)) % 2);
    const state = { ...floodStart(lcg(125)), board, steps: 19 };
    const out = floodApply(state, 1, lcg(126));
    expect(out.steps).toBe(20);
    expect(out.over).toBe(true);
    expect(floodScore(out)).toBe(0);
    expect(FLOOD_COLORS).toHaveLength(6);
  });
});

// ─── 13. Picross Mini logic ──────────────────────────────────────────────────

describe("v400 Picross Mini logic", () => {
  it("clues count the runs: [2,1] for two-and-one, [0] for an empty line", () => {
    const pattern = Array(25).fill(false);
    // Row 0: filled filled . filled . → clues [2, 1]
    pattern[0] = true; pattern[1] = true; pattern[3] = true;
    const clues = picrossClues(pattern);
    expect(clues.rows[0]).toEqual([2, 1]);
    expect(clues.rows[1]).toEqual([0]);
    expect(clues.cols[0]).toEqual([1]);
    expect(clues.cols[4]).toEqual([0]);
  });

  it("a false cell is a mistake and marks itself; the third ends the run", () => {
    let s = picrossStart(() => 0.1); // a library shape
    const falseIdx = s.pattern.findIndex((p) => !p);
    s = picrossFill(s, falseIdx, lcg(131));
    expect(s.mistakes).toBe(1);
    expect(s.marked[falseIdx]).toBe(true);
    expect(s.over).toBe(false);
    const f2 = s.pattern.findIndex((p, i) => !p && i !== falseIdx);
    const f3 = s.pattern.findIndex((p, i) => !p && i !== falseIdx && i !== f2);
    s = picrossFill(s, f2, lcg(132));
    s = picrossFill(s, f3, lcg(133));
    expect(s.mistakes).toBe(3);
    expect(s.over).toBe(true);
  });

  it("filling the last true cell banks the picture — 300 − time − mistakes — and deals the next", () => {
    const start = picrossStart(() => 0.1);
    const lastTrue = start.pattern.lastIndexOf(true);
    const nearly: typeof start = {
      ...start,
      filled: start.pattern.map((p, i) => (p && i !== lastTrue ? true : false)),
    };
    const done = picrossFill(nearly, lastTrue, lcg(134));
    expect(done.boards).toBe(1);
    expect(done.score).toBe(300);
    expect(done.filled.every((f) => !f)).toBe(true);
    expect(picrossScore(done)).toBe(300);
  });

  it("marks toggle, and filling clears the way (a marked true cell still fills)", () => {
    let s = picrossStart(() => 0.1);
    const idx = s.pattern.findIndex(Boolean);
    s = picrossMark(s, idx);
    expect(s.marked[idx]).toBe(true);
    s = picrossMark(s, idx);
    expect(s.marked[idx]).toBe(false);
    s = picrossFill(s, idx, lcg(135));
    expect(s.filled[idx]).toBe(true);
  });
});

// ─── 14. Mines Mini logic ────────────────────────────────────────────────────

describe("v400 Mines Mini logic", () => {
  it("the first tap is always safe — the field lays around it, ten mines", () => {
    const rng = lcg(141);
    for (const first of [0, 27, 63]) {
      const s = minesReveal(minesStart(), first, rng);
      expect(s.mines).not.toBeNull();
      expect(s.mines![first]).toBe(false);
      expect(s.mines!.filter(Boolean)).toHaveLength(MINES_COUNT);
      expect(s.revealed[first]).toBe(true);
      expect(s.over).toBe(false);
    }
  });

  it("flags are free and block the reveal; numbers count the neighbours", () => {
    const rng = lcg(142);
    let s = minesReveal(minesStart(), 27, rng);
    const mineIdx = s.mines!.findIndex(Boolean);
    const flagged = minesFlag(s, mineIdx);
    expect(flagged.flagged[mineIdx]).toBe(true);
    expect(minesReveal(flagged, mineIdx, rng)).toBe(flagged); // a flag is a promise
    const neighbour = mineIdx + 1 < 64 && (mineIdx + 1) % 8 !== 0 ? mineIdx + 1 : mineIdx - 1;
    expect(minesAdjacent(s.mines, neighbour)).toBeGreaterThanOrEqual(1);
  });

  it("a mine ends the run on the spot", () => {
    const rng = lcg(143);
    let s = minesReveal(minesStart(), 0, rng);
    const mineIdx = s.mines!.findIndex(Boolean);
    s = minesReveal(s, mineIdx, rng);
    expect(s.over).toBe(true);
    expect(s.hitMine).toBe(mineIdx);
    expect(minesScore(s)).toBe(0);
  });

  it("revealing every safe cell banks 200 + the speed bonus and lays a fresh field", () => {
    const rng = lcg(144);
    let s = minesReveal(minesStart(), 27, rng);
    for (let guard = 0; guard < 64 && s.boards === 0; guard++) {
      const nextSafe = s.mines!.findIndex((isMine, i) => !isMine && !s.revealed[i]);
      if (nextSafe < 0) break;
      s = minesReveal(s, nextSafe, rng);
    }
    expect(s.boards).toBe(1);
    expect(s.score).toBe(350); // no clock ever ticked: full speed bonus
    expect(s.mines).toBeNull(); // a fresh, unlaid field
    expect(s.over).toBe(false);
  });
});

// ─── 15. Run-end settling ────────────────────────────────────────────────────

describe("v400 run-end settling", () => {
  it("each run converts exactly once on its own token — Again is a fresh segment, never a double", async () => {
    await applyCoinsDelta(1000, "none");
    const run1 = await convertSessionScore(1400, "v400-knife-run-1");
    expect(run1).toEqual({ coins: 1400, xp: 700 });
    expect(await convertSessionScore(1400, "v400-knife-run-1")).toEqual({ coins: 0, xp: 0 });
    const run2 = await convertSessionScore(325, "v400-order-run-2");
    expect(run2).toEqual({ coins: 325, xp: 163 });
    expect((await loadCoinsRecord()).balance).toBe(2725);
  });

  it("best scores record for the new games and survive a reload", async () => {
    expect(await recordBestScore("order-up", 5120)).toBe(5120);
    expect(await recordBestScore("pipe-dreams", 890)).toBe(890);
    expect(await recordBestScore("order-up", 100)).toBe(5120);
    const reloaded = await loadKmoProgression();
    expect(reloaded.best["order-up"]).toBe(5120);
    expect(reloaded.best["pipe-dreams"]).toBe(890);
    expect(reloaded.unlocked).not.toContain("knife-log");
  });
});

// ─── 16. The coin readout (addendum) ─────────────────────────────────────────

describe("v400 the coin readout", () => {
  it("purse now, and +N this visit = settled this visit + the live score on the table", () => {
    expect(visitReadout(150000, 0, 0)).toEqual({ purse: 150000, accumulating: 0 });
    expect(visitReadout(150000, 0, 45)).toEqual({ purse: 150000, accumulating: 45 });
    expect(visitReadout(150000, 200, 45)).toEqual({ purse: 150000, accumulating: 245 });
  });

  it("settlement moves coins without moving the story: the sum is invariant, no flicker back", () => {
    // Mid-run: 200 settled, 45 on the table.
    const before = visitReadout(150000, 200, 45);
    // The run settles: purse +45, settled +45, live score → 0.
    const after = visitReadout(150000 + 45, 200 + 45, 0);
    expect(after.accumulating).toBe(before.accumulating);
    expect(after.purse).toBe(before.purse + 45);
    // And it only ever climbs within a visit.
    expect(visitReadout(150045, 245, 10).accumulating).toBeGreaterThan(after.accumulating);
  });

  it("whole numbers only — the purse and the visit total floor like formatCoins shows them", () => {
    expect(visitReadout(100.9, 10.5, 5.5)).toEqual({ purse: 100, accumulating: 15 });
    expect(formatCoins(visitReadout(150000, 0, 45).purse)).toBe("150,000");
    expect(formatCoins(visitReadout(150000, 0, 45).accumulating)).toBe("45");
  });

  it("the screen chrome owns the readout; the shelf carries the same purse at its top", () => {
    const screen = read("app/keep-me-occupied.tsx");
    expect(screen).toContain("visitReadout");
    expect(screen).toContain("this visit");
    expect(screen).toContain("formatCoins(readout.purse)");
    // The purse refresh rides the settlement path and the open,
    // through the same helper the shelf's balance comes from.
    expect(screen).toContain("loadCoinsRecord");
    const shelf = read("components/keep-me-occupied/games-shelf.tsx");
    expect(shelf).toContain("Your purse: {formatCoins(balance)} coins");
    expect(shelf.indexOf("Your purse")).toBeLessThan(shelf.indexOf("KMO_POOL.map"));
    // No game component grew its own coin HUD.
    for (const file of NEW_GAMES) {
      const src = read(`components/keep-me-occupied/${file}.tsx`);
      expect(src, file).not.toContain("formatCoins");
      expect(src, file).not.toContain("loadCoinsRecord");
    }
  });
});

// ─── 17. The shelf and the screen ────────────────────────────────────────────

describe("v400 the shelf and screen", () => {
  it("the shelf lists from KMO_POOL and imports none of the thirty games", () => {
    const src = read("components/keep-me-occupied/games-shelf.tsx");
    expect(src).toContain("KMO_POOL.map");
    for (const name of [
      "RunnerGame", "GlideGame", "JumperGame", "SnakeGame", "CrossroadsGame",
      "BreakoutGame", "DropMatchGame", "EchoLightsGame", "SortItOutGame",
      "StackGame", "BackbeatGame", "TendGame",
      "PlinkoDropGame", "CaveFlyerGame", "ColourRushGame", "RockfallGame",
      "MolePatrolGame", "Slide2048Game",
      "KnifeLogGame", "BubblePopGame", "TileTapGame", "PaperTossGame", "FirstCastGame",
      "OrderUpGame", "PipeDreamsGame", "BlockFitGame", "LightsOutGame", "FloodItGame",
      "PicrossMiniGame", "MinesMiniGame",
    ]) {
      expect(src, name).not.toContain(name);
    }
  });

  it("ten of the twelve carry the shared run-end card; the two session puzzles settle on the deal-away", () => {
    for (const file of ["knife-log", "bubble-pop", "tile-tap", "paper-toss", "first-cast", "order-up", "block-fit", "flood-it", "picross-mini", "mines-mini"]) {
      const src = read(`components/keep-me-occupied/${file}.tsx`);
      expect(src, file).toContain("RunEndCard");
      expect(src, file).toContain("onRunEnd");
    }
    for (const file of ["pipe-dreams", "lights-out"]) {
      const src = read(`components/keep-me-occupied/${file}.tsx`);
      expect(src, file).not.toContain("RunEndCard");
      expect(src, file).toContain("onScore");
    }
    const screen = read("app/keep-me-occupied.tsx");
    for (const name of [
      "KnifeLogGame", "BubblePopGame", "TileTapGame", "PaperTossGame", "FirstCastGame",
      "OrderUpGame", "PipeDreamsGame", "BlockFitGame", "LightsOutGame", "FloodItGame",
      "PicrossMiniGame", "MinesMiniGame",
    ]) {
      expect(screen, name).toContain(name);
    }
    for (const id of NEW_GAMES) expect(screen, id).toContain(`"${id}"`);
  });
});

// ─── 18. Wave data still never persisted ─────────────────────────────────────

describe("v400 wave data stays ledger-free", () => {
  it("a full new-roster flow writes only whitelisted keys", async () => {
    await applyCoinsDelta(400000, "none");
    writtenKeys.length = 0;
    await convertSessionScore(1800, "v400-wave-check");
    await recordBestScore("first-cast", 1800);
    await unlockGame("order-up");
    await unlockGame("pipe-dreams");
    const allowed = new Set([COINS_STORAGE_KEY, XP_STORAGE_KEY, XP_AWARDS_STORAGE_KEY, KMO_PROGRESSION_KEY, STAT_POINTS_STORAGE_KEY]);
    for (const key of writtenKeys) expect(allowed.has(key), key).toBe(true);
    for (const key of allowed) {
      const value = store.get(key);
      if (!value) continue;
      expect(value).not.toContain("entryRating");
      expect(value).not.toContain("startedAt");
      expect(value).not.toContain("visitSettled");
    }
    const raw = JSON.parse(store.get(KMO_PROGRESSION_KEY)!);
    expect(Object.keys(raw).sort()).toEqual(["best", "unlocked"]);
    expect(raw.unlocked).toEqual(expect.arrayContaining(["order-up", "pipe-dreams"]));
  });
});
