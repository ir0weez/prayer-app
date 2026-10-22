// Hero health (v160 feature wave): Dark Forest HP persists across
// runs and returns gently — an hourly mend (+10% of max HP per full
// hour; v177 quickened it from the original ~4-hour trickle), an
// overnight rest scaled by the bed, the hospital's two free daily
// heals, and a wake-up floor after a defeat. No timers anywhere: all
// of it settles from stored timestamps in these pure functions.

import { beforeEach, describe, expect, it, vi } from "vitest";

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
  DEFEAT_WAKE_PCT,
  HERO_HEALTH_KEY,
  HOSPITAL_HEALS_PER_DAY,
  TRICKLE_MS,
  TRICKLE_PCT,
  defaultHeroHealthState,
  heroHealthDayStr,
  hospitalHeal,
  loadHeroHealthRaw,
  parseHeroHealthState,
  restPctForBedTier,
  saveHeroHealth,
  settleHealth,
  wakeAfterDefeat,
  type HeroHealthState,
} from "../hero-health";

/** Local timestamp on 2026-10-<day> at hour:min. */
const at = (day: number, hour: number, min = 0): number =>
  new Date(2026, 9, day, hour, min, 0, 0).getTime();

const HOUR = 3600 * 1000;

const stateAt = (over: Partial<HeroHealthState>): HeroHealthState => ({
  hp: 50,
  updatedAt: at(21, 0),
  day: heroHealthDayStr(at(21, 0)),
  hospitalHealsUsed: 0,
  ...over,
});

beforeEach(() => {
  store.clear();
});

describe("constants + bed rest rate", () => {
  it("the design constants are pinned", () => {
    expect(HOSPITAL_HEALS_PER_DAY).toBe(2);
    expect(TRICKLE_MS).toBe(HOUR);
    expect(TRICKLE_PCT).toBe(0.1);
    expect(DEFEAT_WAKE_PCT).toBe(0.1);
  });

  it("restPctForBedTier runs 0.25..0.55 across tiers 0..3 and clamps", () => {
    expect(restPctForBedTier(0)).toBeCloseTo(0.25);
    expect(restPctForBedTier(1)).toBeCloseTo(0.35);
    expect(restPctForBedTier(2)).toBeCloseTo(0.45);
    expect(restPctForBedTier(3)).toBeCloseTo(0.55);
    expect(restPctForBedTier(9)).toBeCloseTo(0.55);
    expect(restPctForBedTier(-2)).toBeCloseTo(0.25);
  });
});

describe("settleHealth", () => {
  it("a new hero (hp null) settles to full", () => {
    const fresh = defaultHeroHealthState(at(21, 8));
    expect(fresh.hp).toBeNull();
    const { state, changed } = settleHealth(fresh, at(21, 8), 100, restPctForBedTier(0));
    expect(changed).toBe(true);
    expect(state.hp).toBe(100);
    expect(state.day).toBe(heroHealthDayStr(at(21, 8)));
  });

  it("no elapsed trickle period means no change", () => {
    const s = stateAt({});
    const { state, changed } = settleHealth(s, at(21, 0, 59), 100, 0.25);
    expect(changed).toBe(false);
    expect(state).toBe(s);
  });

  it("each full hour mends +10% of max HP (v177 rate)", () => {
    const s = stateAt({ hp: 50, updatedAt: at(21, 0) });
    const one = settleHealth(s, at(21, 1), 100, 0.25);
    expect(one.changed).toBe(true);
    expect(one.state.hp).toBeCloseTo(60);
    expect(one.state.updatedAt).toBe(at(21, 1));

    const two = settleHealth(s, at(21, 2, 30), 100, 0.25); // 2.5h = 2 periods + 30m spare
    expect(two.state.hp).toBeCloseTo(70);
    expect(two.state.updatedAt).toBe(at(21, 2)); // spare half hour carries over
  });

  it("the hourly mend caps at max HP", () => {
    const s = stateAt({ hp: 98, updatedAt: at(21, 0) });
    const { state } = settleHealth(s, at(21, 3), 100, 0.25);
    expect(state.hp).toBe(100);
  });

  it("day rollover: overnight rest + heal count reset, trickle clock restarts", () => {
    const s = stateAt({ hp: 40, updatedAt: at(20, 20), day: heroHealthDayStr(at(20, 20)), hospitalHealsUsed: 2 });
    const { state, changed } = settleHealth(s, at(21, 8), 100, restPctForBedTier(1)); // rest 0.35
    expect(changed).toBe(true);
    expect(state.hp).toBeCloseTo(75); // 40 + 35, rest only — no trickle stacked on top
    expect(state.hospitalHealsUsed).toBe(0);
    expect(state.day).toBe(heroHealthDayStr(at(21, 8)));
    expect(state.updatedAt).toBe(at(21, 8));
  });

  it("a long absence still rests only once", () => {
    const s = stateAt({ hp: 40, updatedAt: at(16, 20), day: heroHealthDayStr(at(16, 20)) });
    const { state } = settleHealth(s, at(21, 8), 100, restPctForBedTier(0)); // rest 0.25
    expect(state.hp).toBeCloseTo(65);
  });

  it("overnight rest caps at max HP", () => {
    const s = stateAt({ hp: 90, updatedAt: at(20, 20), day: heroHealthDayStr(at(20, 20)) });
    const { state } = settleHealth(s, at(21, 8), 100, restPctForBedTier(3)); // rest 0.55
    expect(state.hp).toBe(100);
  });
});

describe("hospitalHeal", () => {
  it("heals to full and counts the heal", () => {
    const s = stateAt({ hp: 12 });
    const { state, ok } = hospitalHeal(s, 100, at(21, 10));
    expect(ok).toBe(true);
    expect(state.hp).toBe(100);
    expect(state.hospitalHealsUsed).toBe(1);
    expect(state.updatedAt).toBe(at(21, 10));
  });

  it("caps at two free heals a day; the third is refused untouched", () => {
    let s = stateAt({ hp: 10 });
    const first = hospitalHeal(s, 100, at(21, 9));
    expect(first.ok).toBe(true);
    const second = hospitalHeal({ ...first.state, hp: 20 }, 100, at(21, 11));
    expect(second.ok).toBe(true);
    expect(second.state.hospitalHealsUsed).toBe(2);
    const third = hospitalHeal({ ...second.state, hp: 5 }, 100, at(21, 13));
    expect(third.ok).toBe(false);
    expect(third.state.hp).toBe(5);
    expect(third.state.hospitalHealsUsed).toBe(2);
  });
});

describe("wakeAfterDefeat", () => {
  it("wakes at the 10% floor, rounded up", () => {
    const s = stateAt({ hp: 0 });
    expect(wakeAfterDefeat(s, 100, at(21, 10)).hp).toBe(10);
    expect(wakeAfterDefeat(s, 95, at(21, 10)).hp).toBe(10); // ceil(9.5)
    expect(wakeAfterDefeat(s, 91, at(21, 10)).hp).toBe(10); // ceil(9.1)
  });

  it("a brand-new (null) hero wakes at the floor too", () => {
    const s = stateAt({ hp: null });
    expect(wakeAfterDefeat(s, 100, at(21, 10)).hp).toBe(10);
  });

  it("never lowers HP that is already above the floor", () => {
    const s = stateAt({ hp: 30 });
    const woken = wakeAfterDefeat(s, 100, at(21, 10));
    expect(woken.hp).toBe(30);
    expect(woken).toBe(s);
  });
});

describe("parse + storage (raw)", () => {
  it("parse guards junk back to a fresh state", () => {
    expect(parseHeroHealthState(null).hp).toBeNull();
    expect(parseHeroHealthState("junk").hp).toBeNull();
    expect(parseHeroHealthState({ hp: -4 }).hp).toBe(0);
    expect(parseHeroHealthState({ hp: "full" }).hp).toBeNull();
    expect(parseHeroHealthState({ hp: 42, hospitalHealsUsed: 1.9 }).hospitalHealsUsed).toBe(1);
  });

  it("load is RAW: a stored old day comes back unsettled, exactly as saved", async () => {
    const stored: HeroHealthState = {
      hp: 33,
      updatedAt: at(19, 6),
      day: heroHealthDayStr(at(19, 6)),
      hospitalHealsUsed: 2,
    };
    await saveHeroHealth(stored);
    expect(store.has(HERO_HEALTH_KEY)).toBe(true);
    await expect(loadHeroHealthRaw()).resolves.toEqual(stored);
  });

  it("load on empty storage returns the fresh default", async () => {
    const loaded = await loadHeroHealthRaw();
    expect(loaded.hp).toBeNull();
    expect(loaded.hospitalHealsUsed).toBe(0);
    expect(loaded.day).toBe(heroHealthDayStr(Date.now()));
  });
});
