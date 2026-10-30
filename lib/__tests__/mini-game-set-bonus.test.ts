// v200 — the Mini-Game Set Bonus (Jonathan's design, settled
// 2026-10-23): play ALL TWELVE daily mini-games in one day and the
// town earns +10% income for that day. His pick over a flat coin
// payout; his stacking question ("30 games = +300%?") is answered
// by construction and pinned here: each game counts ONCE per day
// (its first recorded play), the set completes at most once per
// day, the thirteen building games are not in the set, and the
// bonus adds onto the same base as the Depth Blessing — it never
// compounds.
//
// The pins:
//  - the set is exactly the twelve games he named;
//  - distinctness: 12 completions complete it, 12 replays of one
//    game never do; building games never count;
//  - the completion is recorded once per date (in recordPlay, the
//    one counter every game flows through) and announced once;
//  - settlement: the set bonus rides TODAY's blessing slot into
//    the accrual (depthBlessingMult = depth + set, additively on
//    the same base — never compounded). RE-BASED (v343): the
//    per-date missed-days pricing this file originally pinned is
//    deleted with missedDaysIncome; past days settle through the
//    one accrual at the standing slot, like every other day;
//  - day rollover: progress is fresh at dawn while yesterday's
//    completion remains as settlement history;
//  - prestige clears the record, like the mine.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory AsyncStorage so plays and set records flow through the
// real load/save paths.
const store = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => { store.set(k, v); }),
    removeItem: vi.fn(async (k: string) => { store.delete(k); }),
    clear: vi.fn(async () => { store.clear(); }),
  },
}));

import {
  MINI_GAME_CAPS,
  MINI_GAME_SET_IDS,
  SET_BONUS_RATE,
  isSetGame,
  loadSetCompletedDates,
  loadTodaySetStatus,
  recordPlay,
  resetSetBonusForPrestige,
  setCompleteForCounts,
  setProgressForCounts,
  subscribeSetCompleted,
  type MiniGameId,
} from "../mini-games";
import {
  accrueAwayIncome,
  dailyIncomeForTown,
  emptyTownState,
  type AwayAccrualInputs,
  type PlacedBuilding,
  type TownState,
} from "../hometown";

const PLAYS_KEY = "prayercircle.minigames.plays.v1";
const SET_BONUS_KEY = "prayercircle.minigames.set-bonus.v1";

const BUILDING_GAME_IDS: MiniGameId[] = [
  "bell", "rounds", "cascade", "shelf", "harvest", "shelve", "beam",
  "clay", "needle", "brew", "echo", "stars", "hearth",
];

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const todayStr = () => dateStr(new Date());
const yesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateStr(d);
};

function countsWith(partial: Partial<Record<MiniGameId, number>>): Record<MiniGameId, number> {
  const counts = {} as Record<MiniGameId, number>;
  for (const id of Object.keys(MINI_GAME_CAPS) as MiniGameId[]) counts[id] = 0;
  return { ...counts, ...partial };
}

beforeEach(() => {
  store.clear();
});

describe("the set — membership", () => {
  it("is exactly the twelve daily games Jonathan named", () => {
    expect([...MINI_GAME_SET_IDS]).toEqual([
      "verse", "training", "packing", "candle", "popcorn", "garden",
      "serve", "rhythm", "trim", "tide", "grill", "arcade",
    ]);
    expect(SET_BONUS_RATE).toBe(0.1);
  });

  it("the thirteen building games are not in the set", () => {
    expect(BUILDING_GAME_IDS).toHaveLength(13);
    for (const id of BUILDING_GAME_IDS) expect(isSetGame(id), id).toBe(false);
    for (const id of MINI_GAME_SET_IDS) expect(isSetGame(id), id).toBe(true);
  });
});

describe("the set — distinctness (pure)", () => {
  it("completes only at twelve DISTINCT games", () => {
    const eleven = countsWith({
      verse: 1, training: 1, packing: 1, candle: 1, popcorn: 1, garden: 1,
      serve: 1, rhythm: 1, trim: 1, tide: 1, grill: 1,
    });
    expect(setProgressForCounts(eleven)).toBe(11);
    expect(setCompleteForCounts(eleven)).toBe(false);
    const twelve = { ...eleven, arcade: 1 };
    expect(setProgressForCounts(twelve)).toBe(12);
    expect(setCompleteForCounts(twelve)).toBe(true);
  });

  it("replays never raise progress past a game's first play", () => {
    const maxed = countsWith({ verse: MINI_GAME_CAPS.verse, candle: MINI_GAME_CAPS.candle });
    expect(setProgressForCounts(maxed)).toBe(2);
    expect(setCompleteForCounts(maxed)).toBe(false);
  });

  it("building games contribute nothing, even maxed", () => {
    const partial: Partial<Record<MiniGameId, number>> = {};
    for (const id of BUILDING_GAME_IDS) partial[id] = 3;
    expect(setProgressForCounts(countsWith(partial))).toBe(0);
  });
});

describe("the set — recording through recordPlay", () => {
  it("playing one game over and over never completes the set", async () => {
    for (let i = 0; i < 12; i++) await recordPlay("verse");
    const status = await loadTodaySetStatus();
    expect(status.progress).toBe(1);
    expect(status.complete).toBe(false);
    expect(await loadSetCompletedDates()).toEqual(new Set());
  });

  it("building games played all day never complete the set", async () => {
    for (const id of BUILDING_GAME_IDS) await recordPlay(id);
    const status = await loadTodaySetStatus();
    expect(status.progress).toBe(0);
    expect(status.complete).toBe(false);
    expect(await loadSetCompletedDates()).toEqual(new Set());
  });

  it("the twelfth distinct game records the completion once and speaks once", async () => {
    const heard: string[] = [];
    const unsub = subscribeSetCompleted((d) => heard.push(d));
    for (const id of MINI_GAME_SET_IDS.slice(0, 11)) await recordPlay(id);
    expect((await loadTodaySetStatus()).progress).toBe(11);
    expect(heard).toEqual([]);
    expect(await loadSetCompletedDates()).toEqual(new Set());

    await recordPlay(MINI_GAME_SET_IDS[11]);
    expect((await loadTodaySetStatus()).complete).toBe(true);
    expect(heard).toEqual([todayStr()]);
    expect(await loadSetCompletedDates()).toEqual(new Set([todayStr()]));

    // Replays afterwards: no second record, no second announcement.
    await recordPlay("verse");
    await recordPlay("candle");
    expect(heard).toEqual([todayStr()]);
    expect(await loadSetCompletedDates()).toEqual(new Set([todayStr()]));
    unsub();
  });

  it("a new day dawns with fresh progress; yesterday's completion stays as settlement history", async () => {
    const y = yesterdayStr();
    const full = countsWith({});
    for (const id of MINI_GAME_SET_IDS) full[id] = 1;
    store.set(PLAYS_KEY, JSON.stringify({ day: y, counts: full }));
    store.set(SET_BONUS_KEY, JSON.stringify({ days: { [y]: true } }));
    const status = await loadTodaySetStatus();
    expect(status.progress).toBe(0);
    expect(status.complete).toBe(false);
    expect(await loadSetCompletedDates()).toEqual(new Set([y]));
  });

  it("prestige clears the set record", async () => {
    store.set(SET_BONUS_KEY, JSON.stringify({ days: { [todayStr()]: true } }));
    await resetSetBonusForPrestige();
    expect(await loadSetCompletedDates()).toEqual(new Set());
    expect(store.has(SET_BONUS_KEY)).toBe(false);
  });
});

// ---- Settlement ----------------------------------------------------

const NOW = 1_800_000_000_000; // fixed clock
const TODAY = "2027-01-15";
const THREE_DAYS_AGO = "2027-01-12"; // missed window: 12th, 13th, 14th

function churchTown(lastIncomeDate: string | null = THREE_DAYS_AGO): TownState {
  // v291 re-base: the fixture church stands on the CITY map — Part
  // 2 retired the town map's building set (the café alone earns
  // there), so a town-map church neither accrues nor prices missed
  // days by design. The settlement arithmetic this file pins is
  // unchanged; the city is where a church still earns it.
  const town = emptyTownState();
  const church: PlacedBuilding = {
    id: "church-1",
    type: "church",
    x: 2,
    y: 2,
    level: 1,
    accumulated: 0,
    lastTick: new Date(NOW - 5 * 60000).toISOString(),
  };
  town.maps.city.buildings = [church];
  town.lastIncomeDate = lastIncomeDate;
  return town;
}

function accrualInputs(depthBlessingMult: number): AwayAccrualInputs {
  return {
    gearCoinMult: 1,
    generosityMult: 0,
    houseCoinMult: 0,
    milestoneMult: 1,
    prestigeMult: 1,
    depthBlessingMult,
    prayerMultValue: 1,
    prayedCount: 8,
    fellowshipBonus: 1,
    remembranceBonus: 1,
    gardenVisitBonus: 1,
    interiorBonuses: {},
    restInteriorMult: {},
    presenceCounts: null,
    economyScale: 1,
    nowMs: NOW,
    nowIso: new Date(NOW).toISOString(),
  };
}

describe("settlement — the set rides the accrual's one blessing slot (RE-BASED v343)", () => {
  it("the combined slot is one base × (depth + set) — additive, never compounded", () => {
    const plain = accrueAwayIncome(churchTown(), accrualInputs(1));
    const depthOnly = accrueAwayIncome(churchTown(), accrualInputs(1.2));
    const combined = accrueAwayIncome(churchTown(), accrualInputs(1.2 + SET_BONUS_RATE));
    // Church fixture, per-DAY: the building's own 240 scales by the
    // blessing slot; the +160 prayer stream rides unscaled (pinned
    // in the away-accrual suite). Combined = one base × 1.30.
    expect(plain.rates["church-1"].coins).toBeCloseTo(240 + 160, 8);
    expect(depthOnly.rates["church-1"].coins).toBeCloseTo(240 * 1.2 + 160, 8);
    expect(combined.rates["church-1"].coins).toBeCloseTo(240 * 1.3 + 160, 8);
    // NOT compounded: depth × set would price the base at 1.32.
    expect(combined.rates["church-1"].coins).not.toBeCloseTo(240 * 1.2 * (1 + SET_BONUS_RATE) + 160, 8);
  });

  it("a settled day lands the combined rate in the pile, once", () => {
    // An L3 farm (100/day, cap 200) on the city map, anchored one
    // day back: the slot-1.30 day lands 130 waiting; a second
    // settle at the same clock lands nothing more (the anchor
    // advanced — the day can never settle twice).
    const town = emptyTownState();
    const farm: PlacedBuilding = {
      id: "farm-1", type: "farm", x: 2, y: 2, level: 3,
      accumulated: 0, lastTick: "2027-01-14T12:00:00.000Z",
    };
    town.maps.city.buildings = [farm];
    const first = accrueAwayIncome(town, accrualInputs(1.2 + SET_BONUS_RATE));
    expect(first.town.maps.city.buildings[0].accumulated).toBe(130);
    const second = accrueAwayIncome(first.town, accrualInputs(1.2 + SET_BONUS_RATE));
    expect(second.town.maps.city.buildings[0].accumulated).toBe(130);
  });

  it("the daily estimate carries the same blessing factor end to end", () => {
    const town = churchTown();
    const plain = dailyIncomeForTown(town, 1, 1, 1, 8, 1, 1, 1, NOW);
    const blessed = dailyIncomeForTown(town, 1, 1, 1, 8, 1, 1, 1, NOW, 1.2);
    expect(plain).toBeGreaterThan(0);
    expect(blessed).toBeCloseTo(plain * 1.2, 8);
  });
});

// ---- Wiring pins ----------------------------------------------------

function readSrc(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("wiring — the set reaches settlement, the sheet, and the moment", () => {
  it("hometown folds today's set into the accrual slot — and past sets nowhere", () => {
    const src = readSrc("app/hometown.tsx");
    expect(src).toContain("depthBlessingMult: depthMult + setMultToday");
    // RE-BASED (v343): the per-date channel into the deleted
    // missed-days award is gone — completed dates from past days
    // are settlement history only, never priced again.
    expect(src).not.toContain("setBonusDates");
    expect(src).not.toContain("setBonusRate");
  });

  it("the income breakdown shows the Game Set line beside the Depth Blessing", () => {
    const src = readSrc("app/hometown.tsx");
    expect(src).toContain("Game Set");
    expect(src).toContain("setToday.complete");
    // The combined displays carry the set additively too.
    expect(src).toContain("depthBlessingMultiplierForLevels(mineDepthLevels) + (setToday.complete ? SET_BONUS_RATE : 0)");
  });

  it("prestige clears the set record beside the mine reset", () => {
    const src = readSrc("lib/prestige.ts");
    expect(src).toContain("resetSetBonusForPrestige()");
  });

  it("the announcement is mounted at the root and the PlayCards carry set progress", () => {
    expect(readSrc("app/_layout.tsx")).toContain("SetCompleteAnnouncer");
    const scene = readSrc("components/mini-game-scene.tsx");
    expect(scene).toContain("useSetProgress");
    expect(scene).toContain("Today's set:");
    const hometown = readSrc("app/hometown.tsx");
    expect(hometown).toContain('gameId="garden"');
    expect(hometown).toContain('gameId="tide"');
  });
});
