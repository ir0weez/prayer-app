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
//  - settlement: missedDaysIncome pays each completed date inside
//    its window exactly once — the lastIncomeDate fold means a
//    second settle of the same window returns nothing — priced
//    additively with the Depth Blessing on the same base;
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
  missedDaysIncome,
  type AwayAccrualInputs,
  type MissedDaysIncomeOptions,
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

function missedOpts(over: Partial<MissedDaysIncomeOptions> = {}): MissedDaysIncomeOptions {
  return {
    today: TODAY,
    milestoneMult: 1,
    houseCoinMult: 0,
    fellowshipBonus: 1,
    prayedCount: 8,
    remembranceBonus: 1,
    gardenVisitBonus: 1,
    prestigeMult: 1,
    nowMs: NOW,
    ...over,
  };
}

/** Per-day coin price of the fixture town at a given blessing mult. */
function perDay(town: TownState, depthMult: number): number {
  return dailyIncomeForTown(town, 1, 1, 1, 8, 1, 1, 1, NOW, depthMult);
}

describe("settlement — missed days pay each completed date once", () => {
  it("without set information the award is the original arithmetic", () => {
    const town = churchTown();
    const base = perDay(town, 1);
    expect(base).toBeGreaterThan(0);
    const award = missedDaysIncome(town, missedOpts());
    expect(award).not.toBeNull();
    expect(award!.days).toBe(3);
    expect(award!.earnedCoins).toBe(Math.floor(3 * base));
  });

  it("a completed date inside the window earns +10% of that day's base", () => {
    const town = churchTown();
    const base = perDay(town, 1);
    const award = missedDaysIncome(town, missedOpts({
      setBonusDates: new Set(["2027-01-13"]),
      setBonusRate: SET_BONUS_RATE,
    }));
    expect(award!.earnedCoins).toBe(Math.floor(3 * base + SET_BONUS_RATE * base));
  });

  it("every completed date in the window is paid — and only those", () => {
    const town = churchTown();
    const base = perDay(town, 1);
    const all = missedDaysIncome(town, missedOpts({
      setBonusDates: new Set(["2027-01-12", "2027-01-13", "2027-01-14"]),
      setBonusRate: SET_BONUS_RATE,
    }));
    expect(all!.earnedCoins).toBe(Math.floor(3 * base + 3 * SET_BONUS_RATE * base));
    // Completions outside the window (before it, or today itself)
    // change nothing.
    const outside = missedDaysIncome(town, missedOpts({
      setBonusDates: new Set(["2027-01-11", "2027-01-15"]),
      setBonusRate: SET_BONUS_RATE,
    }));
    expect(outside!.earnedCoins).toBe(Math.floor(3 * base));
  });

  it("a second settle of the same window pays nothing (the fold is the lock)", () => {
    const town = churchTown();
    const first = missedDaysIncome(town, missedOpts({
      setBonusDates: new Set(["2027-01-13"]),
      setBonusRate: SET_BONUS_RATE,
    }));
    expect(first).not.toBeNull();
    // The app folds lastIncomeDate to today in the same commit that
    // pays the award; settling again from the folded record is null.
    const folded: TownState = { ...town, lastIncomeDate: TODAY };
    expect(missedDaysIncome(folded, missedOpts({
      setBonusDates: new Set(["2027-01-13"]),
      setBonusRate: SET_BONUS_RATE,
    }))).toBeNull();
  });

  it("stacks ADDITIVELY with the Depth Blessing on the same base — never compounded", () => {
    const town = churchTown();
    const base = perDay(town, 1);          // no blessings
    const blessed = perDay(town, 1.2);     // Depth Blessing at its +20% cap
    expect(blessed).toBeCloseTo(base * 1.2, 8);
    const award = missedDaysIncome(town, missedOpts({
      depthBlessingMult: 1.2,
      setBonusDates: new Set(["2027-01-13"]),
      setBonusRate: SET_BONUS_RATE,
    }));
    // Additive: 3 days at the depth price + 0.10 × the UNblessed
    // base for the one completed day (= a 1.30 day, not a 1.32 day).
    expect(award!.earnedCoins).toBe(Math.floor(3 * blessed + SET_BONUS_RATE * base));
    const compounded = Math.floor(2 * blessed + blessed * (1 + SET_BONUS_RATE));
    expect(award!.earnedCoins).not.toBe(compounded);
  });

  it("the accrual blessing slot scales linearly, so the combined 1.30 is one base × 1.30", () => {
    const inputs = (depthBlessingMult: number): AwayAccrualInputs => ({
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
    });
    const plain = accrueAwayIncome(churchTown(), inputs(1));
    const combined = accrueAwayIncome(churchTown(), inputs(1.3));
    // Church fixture: building stream = 20 × populationMult(8) = 23.2
    // per hour, scaled by the blessing slot; the +160/hr prayer-coin
    // stream rides unscaled (pinned in the away-accrual suite).
    expect(plain.rates["church-1"].coins).toBeCloseTo((23.2 + 160) / 60, 8);
    expect(combined.rates["church-1"].coins).toBeCloseTo((23.2 * 1.3 + 160) / 60, 8);
  });
});

// ---- Wiring pins ----------------------------------------------------

function readSrc(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("wiring — the set reaches settlement, the sheet, and the moment", () => {
  it("hometown folds today's set into the accrual slot and past sets into missed days", () => {
    const src = readSrc("app/hometown.tsx");
    expect(src).toContain("depthBlessingMult: depthMult + setMultToday");
    expect(src).toContain("setBonusDates: setOut.dates");
    expect(src).toContain("setBonusRate: SET_BONUS_RATE");
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
