// v398 — Keep Me Occupied grows an endless roster (Jonathan,
// Oct 31: "Add all five to the ladder" — Runner, Glide, Snake,
// Breakout, Drop Match — plus his two scope additions right after:
// Crossroads, the traffic-control game he remembers, and Jumper,
// the vertical climber. His words: "We need some scored endless
// games and stuff. Like endless runners, or something. Simple
// games, but things that really help to keep you occupied… so
// it's kind of neverending stuff to unlock.")
//
// These pins hold:
//   1. The ladder — nine priced games in his order (Runner 2,000
//      flagship-early … Drop Match 25,000), Backbeat/Tend unmoved;
//      the pool registry carries all seven new games; the deal
//      never deals a locked one; chapters stay never-locked.
//   2. Each game's scoring rules and core logic: Runner distance /
//      coins / near-miss / crash, Glide gates / collisions, Snake
//      food / walls / self, Breakout bricks / row bonus / lost
//      ball, Drop Match groups / chains / top-out, Crossroads
//      clears / near-miss / collision, Jumper bounce / crumble /
//      wrap / fall.
//   3. Run-end settling — a run converts exactly once on its own
//      token (Again mints a fresh segment, never a double), and
//      best scores record for the new games.
//   4. The shelf lists the new games from the registry (source
//      pin: it maps KMO_POOL, imports none of the games), and the
//      run-end card + screen wiring stand as built.
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
  breakoutScoreFor,
  convertSessionScore,
  crossroadsScoreFor,
  dropMatchClearPoints,
  glideScoreFor,
  isItemUnlocked,
  jumperScoreFor,
  loadKmoProgression,
  parseKmoProgression,
  recordBestScore,
  runnerScoreFor,
  snakeScoreFor,
  unlockGame,
  unlockPrice,
} from "../kmo-progression";
import {
  CROSS_CENTER,
  CROSS_SIZE,
  DROP_COLS,
  DROP_ROWS,
  GLIDE_H,
  GLIDE_X,
  JUMP_W,
  KMO_POOL,
  RUNNER_X,
  breakoutStart,
  breakoutStep,
  crossStart,
  crossStep,
  crossToggle,
  dealItem,
  dropAddRow,
  dropClearGroup,
  dropFindGroup,
  dropStart,
  glideStart,
  glideStep,
  jumpStart,
  jumpStep,
  runnerJump,
  runnerScore,
  runnerStart,
  runnerStep,
  snakeStart,
  snakeStep,
  snakeTurn,
  type DropGrid,
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

const NEW_GAMES = ["runner", "glide", "jumper", "snake", "crossroads", "breakout", "drop-match"] as const;

beforeEach(() => {
  store.clear();
  writtenKeys.length = 0;
});

// ─── 1. The ladder ───────────────────────────────────────────────────────────

describe("v398 the ladder", () => {
  it("nine priced games in his order; Backbeat and Tend keep their v397 prices", () => {
    expect(KMO_UNLOCK_PRICES).toEqual({
      runner: 2000,
      backbeat: 3000,
      glide: 5000,
      jumper: 6500,
      tend: 7500,
      snake: 10000,
      crossroads: 12500,
      breakout: 15000,
      "drop-match": 25000,
    });
    expect(unlockPrice("runner")).toBe(2000);
    expect(unlockPrice("crossroads")).toBe(12500);
    expect(unlockPrice("jumper")).toBe(6500);
  });

  it("the pool registry carries all seven new games between Tend and the dig", () => {
    expect(KMO_POOL.map((i) => i.id)).toEqual([
      "echo-lights", "sort-it-out", "stack", "backbeat", "tend",
      "runner", "glide", "jumper", "snake", "crossroads", "breakout", "drop-match",
      "word-dig", "chapter",
    ]);
    for (const id of NEW_GAMES) {
      const item = KMO_POOL.find((i) => i.id === id)!;
      expect(item.kind).toBe("game");
      expect(item.chip).toBe("DEALT · A GAME");
    }
  });

  it("fresh store: the seven are locked, the starters open, chapters never locked", () => {
    const fresh = parseKmoProgression(null);
    for (const id of NEW_GAMES) expect(isItemUnlocked(fresh, id)).toBe(false);
    for (const id of KMO_DEFAULT_UNLOCKED) expect(isItemUnlocked(fresh, id)).toBe(true);
    expect(isItemUnlocked(fresh, "chapter")).toBe(true);
    expect(unlockPrice("chapter")).toBeNull();
  });

  it("buying the Runner spends 2,000 from the shared purse and persists", async () => {
    await applyCoinsDelta(150000, "none");
    const result = await unlockGame("runner");
    expect(result).toMatchObject({ owned: true, bought: true, balance: 148000 });
    expect((await loadKmoProgression()).unlocked).toContain("runner");
    const raw = JSON.parse(store.get(KMO_PROGRESSION_KEY)!);
    expect(Object.keys(raw).sort()).toEqual(["best", "unlocked"]);
  });

  it("the deal never deals a locked new game; with everything unlocked, they all appear", () => {
    const rng = lcg(77);
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) seen.add(dealItem(rng, undefined, KMO_DEFAULT_UNLOCKED).id);
    for (const id of NEW_GAMES) expect(seen.has(id)).toBe(false);
    expect(seen.has("chapter")).toBe(true);

    const all = KMO_POOL.filter((i) => i.kind === "game").map((i) => i.id);
    const rng2 = lcg(78);
    const seenAll = new Set<string>();
    for (let i = 0; i < 3000; i++) seenAll.add(dealItem(rng2, undefined, all).id);
    for (const id of NEW_GAMES) expect(seenAll.has(id)).toBe(true);
  });
});

// ─── 2. Scoring + core logic ─────────────────────────────────────────────────

describe("v398 scoring rules", () => {
  it("Runner: a point a metre, 25 a coin, 5 a near-miss", () => {
    expect(runnerScoreFor(137.9, 2, 3)).toBe(202);
    expect(runnerScoreFor(0, 0, 0)).toBe(0);
  });

  it("Glide 20 a gate · Snake 15 a food + 1 a second · Breakout 10 a brick + 100 a row", () => {
    expect(glideScoreFor(7)).toBe(140);
    expect(snakeScoreFor(4, 37)).toBe(97);
    expect(breakoutScoreFor(13, 2)).toBe(330);
  });

  it("Drop Match 8 a block times the chain · Crossroads 10 a car + 15 a near-miss · Jumper 1 a unit + 20 a coin", () => {
    expect(dropMatchClearPoints(5, 1)).toBe(40);
    expect(dropMatchClearPoints(5, 2)).toBe(80);
    expect(dropMatchClearPoints(4, 3)).toBe(96);
    expect(crossroadsScoreFor(9, 2)).toBe(120);
    expect(jumperScoreFor(123.7, 3)).toBe(183);
  });
});

describe("v398 Runner logic", () => {
  it("runs, jumps (hop and big), and the score follows the state", () => {
    const rng = lcg(5);
    let s = runnerStart();
    for (let i = 0; i < 10; i++) s = runnerStep(s, 0.05, rng);
    expect(s.alive).toBe(true);
    expect(s.distance).toBeGreaterThan(1);
    expect(runnerScore(s)).toBe(Math.floor(s.distance));
    expect(runnerJump(s, false).vy).toBe(560);
    expect(runnerJump(s, true).vy).toBe(760);
    const airborne = { ...s, y: 30 };
    expect(runnerJump(airborne, true)).toBe(airborne);
  });

  it("a grounded runner meeting an obstacle crashes; a coin on his line pays", () => {
    const rng = lcg(6);
    const crash = runnerStep(
      { ...runnerStart(), obstacles: [{ id: 1, x: RUNNER_X + 8, w: 24, h: 40, counted: false }] },
      0.05, rng,
    );
    expect(crash.alive).toBe(false);

    const paid = runnerStep(
      { ...runnerStart(), coins: [{ id: 1, x: RUNNER_X, y: 0, taken: false }] },
      0.05, rng,
    );
    expect(paid.coinCount).toBe(1);
    expect(runnerScore(paid)).toBe(25);
  });

  it("skimming an obstacle by under 20px at the pass moment is a near-miss", () => {
    const rng = lcg(7);
    const s = runnerStep(
      { ...runnerStart(), y: 40, obstacles: [{ id: 1, x: RUNNER_X - 30, w: 20, h: 30, counted: false }] },
      0.05, rng,
    );
    expect(s.alive).toBe(true);
    expect(s.nearMisses).toBe(1);
    expect(runnerScore(s)).toBe(5);
  });
});

describe("v398 Glide logic", () => {
  it("a gate behind the bird counts 20; the floor and a gate edge end the run", () => {
    const rng = lcg(11);
    const base = { ...glideStart(), y: 120, gates: [{ id: 1, x: GLIDE_X - 50, gapY: 90, passed: false }] };
    const passed = glideStep(base, 0.04, false, rng);
    expect(passed.alive).toBe(true);
    expect(passed.gatesCleared).toBe(1);

    const floored = glideStep({ ...glideStart(), y: GLIDE_H - 12, vy: 120 }, 0.04, false, rng);
    expect(floored.alive).toBe(false);

    const clipped = glideStep(
      { ...glideStart(), y: 16, gates: [{ id: 1, x: GLIDE_X, gapY: 100, passed: false }] },
      0.04, false, rng,
    );
    expect(clipped.alive).toBe(false);
  });
});

describe("v398 Snake logic", () => {
  it("eats and grows (+15), refuses a reversal, and dies at the wall", () => {
    const rng = lcg(21);
    const start = { ...snakeStart(rng), food: { x: 7, y: 7 } };
    const fed = snakeStep(start, rng);
    expect(fed.foodEaten).toBe(1);
    expect(fed.cells.length).toBe(4);

    expect(snakeTurn(fed, { x: -1, y: 0 }).pendingDir).toEqual(fed.dir);

    const atWall = { ...snakeStart(rng), cells: [{ x: 13, y: 7 }, { x: 12, y: 7 }], dir: { x: 1, y: 0 }, pendingDir: { x: 1, y: 0 } };
    expect(snakeStep(atWall, rng).alive).toBe(false);
  });

  it("dies on its own body", () => {
    const rng = lcg(22);
    const loop = {
      alive: true,
      cells: [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 5 }, { x: 7, y: 5 }],
      dir: { x: 1, y: 0 }, pendingDir: { x: 1, y: 0 },
      food: { x: 0, y: 0 }, foodEaten: 0, ticks: 0,
    };
    expect(snakeStep(loop, rng).alive).toBe(false);
  });
});

describe("v398 Breakout logic", () => {
  it("a brick breaks for 10; clearing a row adds the 100 bonus; losing the ball ends it", () => {
    const start = breakoutStart();
    const brick = start.bricks[0];
    const aimed = {
      ...start,
      ball: { x: brick.x + 24, y: brick.y + 28, vx: 0, vy: -190 },
    };
    const hit = breakoutStep(aimed, 0.05);
    expect(hit.bricksBroken).toBe(1);

    const oneLeft = {
      ...breakoutStart(),
      bricks: [{ id: 1, row: 9, x: 6, y: 18, alive: true }],
      ball: { x: 30, y: 46, vx: 0, vy: -190 },
    };
    const cleared = breakoutStep(oneLeft, 0.05);
    expect(cleared.rowsCleared).toBe(1);
    expect(cleared.bricksBroken).toBe(1);

    const lost = breakoutStep({ ...breakoutStart(), ball: { x: 100, y: 306, vx: 0, vy: 200 } }, 0.05);
    expect(lost.alive).toBe(false);
  });
});

describe("v398 Drop Match logic", () => {
  const R = "#C9452F";
  const gridOf = (): DropGrid => {
    const g = dropStart();
    g[0] = [R as DropGrid[0][0], R as DropGrid[0][0], R as DropGrid[0][0]];
    g[1] = [R as DropGrid[0][0]];
    return g;
  };

  it("finds connected groups across columns and clears 3+; a pair is not enough", () => {
    const g = gridOf();
    const group = dropFindGroup(g, 0, 0);
    expect(group.length).toBe(4);
    const cleared = dropClearGroup(g, group);
    expect(cleared[0]).toEqual([]);
    expect(cleared[1]).toEqual([]);

    const pair = dropStart();
    pair[2] = [R as DropGrid[0][0], R as DropGrid[0][0]];
    expect(dropFindGroup(pair, 2, 0).length).toBe(2);
    expect(dropClearGroup(pair, dropFindGroup(pair, 2, 0))).toBe(pair);
  });

  it("a new row lands at the floor of every column; a full column tops out", () => {
    const rng = lcg(31);
    const { grid, toppedOut } = dropAddRow(dropStart(), rng);
    expect(toppedOut).toBe(false);
    expect(grid.every((col) => col.length === 1)).toBe(true);
    expect(grid.length).toBe(DROP_COLS);

    const full = dropStart();
    full[0] = Array.from({ length: DROP_ROWS }, () => R as DropGrid[0][0]);
    expect(dropAddRow(full, rng).toppedOut).toBe(true);
  });
});

describe("v398 Crossroads logic", () => {
  it("a car past the far side is home safe (+10); toggling stops and sends it", () => {
    const rng = lcg(41);
    const s = crossStep(
      { ...crossStart(), cars: [{ id: 1, dir: "N" as const, pos: CROSS_SIZE + 30, stopped: false, nearCounted: true }] },
      0.05, rng,
    );
    expect(s.cleared).toBe(1);
    expect(s.cars.find((c) => c.id === 1)).toBeUndefined();

    const toggled = crossToggle(crossStart(), 99);
    expect(toggled.cars).toEqual([]);
    const one = { ...crossStart(), cars: [{ id: 3, dir: "E" as const, pos: 10, stopped: false, nearCounted: false }] };
    expect(crossToggle(one, 3).cars[0].stopped).toBe(true);
    expect(crossToggle(crossToggle(one, 3), 3).cars[0].stopped).toBe(false);
  });

  it("two crossing cars in the middle box at once collide", () => {
    const rng = lcg(42);
    const s = crossStep(
      {
        ...crossStart(),
        cars: [
          { id: 1, dir: "N" as const, pos: CROSS_CENTER, stopped: false, nearCounted: false },
          { id: 2, dir: "E" as const, pos: CROSS_CENTER, stopped: false, nearCounted: false },
        ],
      },
      0.05, rng,
    );
    expect(s.alive).toBe(false);
  });

  it("a car leaving the box with a crossing car near — but not in — it is a near-miss (+15), once per pair", () => {
    const rng = lcg(43);
    const s = crossStep(
      {
        ...crossStart(),
        cars: [
          { id: 1, dir: "N" as const, pos: CROSS_CENTER + 40, stopped: false, nearCounted: false },
          { id: 2, dir: "E" as const, pos: CROSS_CENTER - 50, stopped: false, nearCounted: false },
        ],
      },
      0.05, rng,
    );
    expect(s.alive).toBe(true);
    expect(s.nearMisses).toBe(1);
    const again = crossStep(s, 0.05, rng);
    expect(again.nearMisses).toBe(1);
  });
});

describe("v398 Jumper logic", () => {
  it("bounces on a platform top while falling; a crumble gives its one bounce and is spent", () => {
    const rng = lcg(51);
    const base = jumpStart(rng);
    const falling = { ...base, y: 10, vy: -300, x: JUMP_W / 2 };
    const bounced = jumpStep(falling, 0.05, 0, rng);
    expect(bounced.y).toBe(0);
    expect(bounced.vy).toBeGreaterThan(0);

    const onCrumble = {
      ...base,
      y: 10, vy: -300, x: JUMP_W / 2,
      platforms: [{ id: 1, x: JUMP_W / 2 - 28, y: 0, type: "crumble" as const, vx: 0, used: false }],
    };
    const spent = jumpStep(onCrumble, 0.05, 0, rng);
    expect(spent.vy).toBeGreaterThan(0);
    expect(spent.platforms.find((p) => p.id === 1)?.used).toBe(true);
  });

  it("the edges wrap, and falling below the camera ends the run", () => {
    const rng = lcg(52);
    const base = jumpStart(rng);
    const wrapped = jumpStep({ ...base, x: -30, y: 120, vy: 120, platforms: [] }, 0.03, 0, rng);
    expect(wrapped.x).toBe(JUMP_W + 18);

    const fallen = jumpStep({ ...base, y: -12, vy: -60, platforms: [] }, 0.03, 0, rng);
    expect(fallen.alive).toBe(false);
  });
});

// ─── 3. Run-end settling ─────────────────────────────────────────────────────

describe("v398 run-end settling", () => {
  it("each run converts exactly once on its own token — Again is a fresh segment, never a double", async () => {
    await applyCoinsDelta(1000, "none");
    const run1 = await convertSessionScore(300, "run-token-1");
    expect(run1).toEqual({ coins: 300, xp: 150 });
    // The same run settling twice (a double-fired run-end) pays nothing more.
    expect(await convertSessionScore(300, "run-token-1")).toEqual({ coins: 0, xp: 0 });
    // Again: a new run, a new token, a new settle.
    const run2 = await convertSessionScore(120, "run-token-2");
    expect(run2).toEqual({ coins: 120, xp: 60 });
    expect((await loadCoinsRecord()).balance).toBe(1420);
  });

  it("best scores record for the new games and survive a reload", async () => {
    expect(await recordBestScore("runner", 500)).toBe(500);
    expect(await recordBestScore("crossroads", 85)).toBe(85);
    expect(await recordBestScore("runner", 400)).toBe(500);
    const reloaded = await loadKmoProgression();
    expect(reloaded.best.runner).toBe(500);
    expect(reloaded.best.crossroads).toBe(85);
    const parsed = parseKmoProgression(JSON.parse(store.get(KMO_PROGRESSION_KEY)!));
    expect(parsed.best["drop-match"]).toBeUndefined();
    expect(parsed.unlocked).not.toContain("snake");
  });

  it("the screen settles runs through the shared path and locks scroll for gesture games (source pins)", () => {
    const screen = read("app/keep-me-occupied.tsx");
    expect(screen).toContain("handleRunEnd");
    expect(screen).toContain("onRunEnd={onRunEnd}");
    expect(screen).toContain("RUN_GAME_IDS");
    expect(screen).toContain("scrollEnabled");
    const card = read("components/keep-me-occupied/run-end-card.tsx");
    expect(card).toContain("Again");
    expect(card).toContain("I&apos;m good");
    expect(card).toContain("coins · +");
    for (const file of ["runner", "glide", "jumper", "snake", "crossroads", "breakout", "drop-match"]) {
      const src = read(`components/keep-me-occupied/${file}.tsx`);
      expect(src, file).toContain("RunEndCard");
      expect(src, file).toContain("onRunEnd");
    }
  });
});

// ─── 4. The shelf reads the registry ─────────────────────────────────────────

describe("v398 the shelf", () => {
  it("lists from KMO_POOL and imports none of the twelve games", () => {
    const src = read("components/keep-me-occupied/games-shelf.tsx");
    expect(src).toContain("KMO_POOL.map");
    for (const name of [
      "RunnerGame", "GlideGame", "JumperGame", "SnakeGame", "CrossroadsGame",
      "BreakoutGame", "DropMatchGame", "EchoLightsGame", "SortItOutGame",
      "StackGame", "BackbeatGame", "TendGame",
    ]) {
      expect(src, name).not.toContain(name);
    }
  });
});

// ─── 5. Wave data still never persisted ──────────────────────────────────────

describe("v398 wave data stays ledger-free", () => {
  it("a full new-roster flow writes only whitelisted keys", async () => {
    await applyCoinsDelta(60000, "none");
    writtenKeys.length = 0;
    await convertSessionScore(450, "run-wave-v398");
    await recordBestScore("glide", 450);
    await unlockGame("crossroads");
    await unlockGame("drop-match");
    // The shared XP system may also write its stat-points key when
    // a conversion crosses a level (the v398 roster's bigger scores
    // do what v397's 40-point session didn't) — still the shared
    // system's own key, not KMO wave data.
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
    expect(raw.unlocked).toEqual(expect.arrayContaining(["crossroads", "drop-match"]));
  });
});
