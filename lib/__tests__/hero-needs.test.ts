// Hero needs (v160 feature wave): the gentle daily care loop.
// Morning tending of all three needs grants the "Set for the Day" boon;
// at noon the hero simply sees to any remaining needs himself. These
// tests pin that there is never a downside — no state, flag or wording
// in this system marks the player down for anything.

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
  HERO_NEEDS_KEY,
  MORNING_END_HOUR,
  NEED_META,
  SELF_CARE_BASELINE,
  averageCareStats,
  boonFor,
  careStatsFor,
  defaultNeedsState,
  fixtureQuality,
  fixtureTierFor,
  heroNeedsDayStr,
  loadHeroNeeds,
  parseNeedsState,
  saveHeroNeeds,
  settleNeeds,
  tendNeed,
} from "../hero-needs";
import { defaultHouseState, type HouseState } from "../pawn-house";

/** Local timestamp on 2026-10-<day> at hour:min. */
const at = (day: number, hour: number, min = 0): number =>
  new Date(2026, 9, day, hour, min, 0, 0).getTime();

function houseWith(fixtures: { hearth?: number; tub?: number; shower?: number }): HouseState {
  const house = defaultHouseState();
  house.rooms.kitchen.unlocked = true;
  house.rooms.bathroom.unlocked = true;
  if (fixtures.hearth !== undefined) house.rooms.kitchen.furniture.hearth = fixtures.hearth;
  if (fixtures.tub !== undefined) house.rooms.bathroom.furniture.tub = fixtures.tub;
  if (fixtures.shower !== undefined) house.rooms.bathroom.furniture.shower = fixtures.shower;
  return house;
}

beforeEach(() => {
  store.clear();
});

describe("need metadata", () => {
  it("labels are the gentle wording from the design", () => {
    expect(NEED_META.food.label).toBe("Eat");
    expect(NEED_META.bathroom.label).toBe("Use the bathroom");
    expect(NEED_META.shower.label).toBe("Shower");
    expect(NEED_META.food.fixtureLabel.toLowerCase()).toContain("hearth");
    expect(NEED_META.bathroom.fixtureLabel.toLowerCase()).toContain("bath");
    expect(NEED_META.shower.fixtureLabel.toLowerCase()).toContain("shower");
  });

  it("the morning window ends at noon", () => {
    expect(MORNING_END_HOUR).toBe(12);
  });
});

describe("fixture mapping + quality", () => {
  it("food reads the kitchen hearth, bathroom the bath tub, shower the shower", () => {
    const house = houseWith({ hearth: 2, tub: 1, shower: 3 });
    expect(fixtureTierFor(house, "food")).toBe(2);
    expect(fixtureTierFor(house, "bathroom")).toBe(1);
    expect(fixtureTierFor(house, "shower")).toBe(3);
  });

  it("fixtureQuality sums the three fixture tiers (0..9)", () => {
    expect(fixtureQuality(houseWith({}))).toBe(0);
    expect(fixtureQuality(houseWith({ hearth: 2, tub: 1, shower: 3 }))).toBe(6);
    expect(fixtureQuality(houseWith({ hearth: 3, tub: 3, shower: 3 }))).toBe(9);
  });

  it("a locked room or a missing slot reads as tier 0", () => {
    const locked = houseWith({ hearth: 3, tub: 3, shower: 3 });
    locked.rooms.bathroom.unlocked = false;
    expect(fixtureTierFor(locked, "bathroom")).toBe(0);
    expect(fixtureTierFor(locked, "shower")).toBe(0);
    expect(fixtureTierFor(locked, "food")).toBe(3);

    const bare = defaultHouseState(); // kitchen starts locked, no furniture
    expect(fixtureTierFor(bare, "food")).toBe(0);
    expect(fixtureQuality(bare)).toBe(0);
  });

  it("out-of-range stored tiers clamp to 0..3", () => {
    const house = houseWith({ hearth: 9, tub: -2 });
    expect(fixtureTierFor(house, "food")).toBe(3);
    expect(fixtureTierFor(house, "bathroom")).toBe(0);
  });
});

describe("settle + tend", () => {
  it("tending all three in the morning locks in the boon", () => {
    const day = heroNeedsDayStr(at(21, 8));
    let s = defaultNeedsState(day);
    s = tendNeed(s, "food", at(21, 8));
    s = tendNeed(s, "bathroom", at(21, 9));
    expect(s.boonActive).toBe(false);
    s = tendNeed(s, "shower", at(21, 10, 30));
    expect(s.tended).toEqual({ food: true, bathroom: true, shower: true });
    expect(s.boonActive).toBe(true);
    expect(s.boonLocked).toBe(true);
    expect(s.allTendedAt).toBe(at(21, 10, 30));
    expect(s.selfCared).toBe(false);
  });

  it("the morning boon survives the noon settle untouched", () => {
    const day = heroNeedsDayStr(at(21, 8));
    let s = defaultNeedsState(day);
    s = tendNeed(s, "food", at(21, 8));
    s = tendNeed(s, "bathroom", at(21, 8));
    s = tendNeed(s, "shower", at(21, 8));
    const later = settleNeeds(s, at(21, 15));
    expect(later.boonActive).toBe(true);
    expect(later.selfCared).toBe(false);
  });

  it("at noon the hero sees to the rest himself — flags kept, no boon", () => {
    const day = heroNeedsDayStr(at(21, 9));
    let s = defaultNeedsState(day);
    s = tendNeed(s, "food", at(21, 9));
    const settled = settleNeeds(s, at(21, 12));
    expect(settled.selfCared).toBe(true);
    // Tended flags stay exactly as the player left them.
    expect(settled.tended).toEqual({ food: true, bathroom: false, shower: false });
    expect(settled.boonActive).toBe(false);
  });

  it("just before noon there is no self-care settle yet", () => {
    const s = defaultNeedsState(heroNeedsDayStr(at(21, 9)));
    const settled = settleNeeds(s, at(21, 11, 59));
    expect(settled.selfCared).toBe(false);
    expect(settled).toBe(s);
  });

  it("tending after the self-care settle is a no-op", () => {
    const day = heroNeedsDayStr(at(21, 9));
    const settled = settleNeeds(defaultNeedsState(day), at(21, 13));
    expect(settled.selfCared).toBe(true);
    const after = tendNeed(settled, "food", at(21, 14));
    expect(after.tended.food).toBe(false);
    expect(after.boonActive).toBe(false);
  });

  it("a first tend after noon lands on the self-cared day and changes nothing", () => {
    const s = defaultNeedsState(heroNeedsDayStr(at(21, 8)));
    const after = tendNeed(s, "food", at(21, 12, 30));
    expect(after.selfCared).toBe(true);
    expect(after.tended.food).toBe(false);
  });

  it("tending an already-tended need is a no-op", () => {
    const day = heroNeedsDayStr(at(21, 8));
    const once = tendNeed(defaultNeedsState(day), "food", at(21, 8));
    const twice = tendNeed(once, "food", at(21, 9));
    expect(twice).toBe(once);
  });

  it("a new day resets to a fresh record", () => {
    let s = defaultNeedsState(heroNeedsDayStr(at(20, 8)));
    s = tendNeed(s, "food", at(20, 8));
    s = { ...s, selfCared: true };
    const next = settleNeeds(s, at(21, 7));
    expect(next).toEqual(defaultNeedsState(heroNeedsDayStr(at(21, 7))));
  });

  it("tendNeed on a stale record tends on the fresh day", () => {
    const stale = defaultNeedsState(heroNeedsDayStr(at(20, 8)));
    const next = tendNeed(stale, "shower", at(21, 8));
    expect(next.day).toBe(heroNeedsDayStr(at(21, 8)));
    expect(next.tended.shower).toBe(true);
  });
});

describe("the boon", () => {
  const boonState = (): ReturnType<typeof defaultNeedsState> => ({
    ...defaultNeedsState(heroNeedsDayStr(at(21, 8))),
    tended: { food: true, bathroom: true, shower: true },
    boonActive: true,
    boonLocked: true,
    allTendedAt: at(21, 8),
  });

  it("no boon, no bonus", () => {
    const idle = defaultNeedsState(heroNeedsDayStr(at(21, 8)));
    expect(boonFor(idle, houseWith({ hearth: 3, tub: 3, shower: 3 }))).toEqual({
      active: false,
      hpPct: 0,
      atkPct: 0,
    });
  });

  // Rider H: the base fixture formula is MODULATED by the day's care
  // stats — boon = base × (0.6 + 0.4 × averageCareStats / 100). The
  // boonState above tended all three needs, so Fed/Relieved/Washed sit
  // at their fixture fill and Rested at the bed's (tier 0 → 55).
  it("at fixture quality 0 the boon is the base gift, modulated by plain stats", () => {
    // stats 60/60/60 + rested 55 → avg 58.75 → factor 0.835
    const boon = boonFor(boonState(), houseWith({}));
    expect(boon.active).toBe(true);
    expect(boon.hpPct).toBeCloseTo(0.1 * 0.835);
    expect(boon.atkPct).toBeCloseTo(0.05 * 0.835);
  });

  it("at fixture quality 9 the boon is near its strongest", () => {
    // stats 100/100/100 + rested 55 → avg 88.75 → factor 0.955
    const boon = boonFor(boonState(), houseWith({ hearth: 3, tub: 3, shower: 3 }));
    expect(boon.hpPct).toBeCloseTo(0.28 * 0.955);
    expect(boon.atkPct).toBeCloseTo(0.185 * 0.955);
  });

  it("mid-range quality scales between the two ends", () => {
    const boon = boonFor(boonState(), houseWith({ hearth: 2, tub: 1, shower: 3 })); // quality 6
    // stats: fed 90, relieved 75, washed 100, rested 55 → avg 80 → factor 0.92
    expect(boon.hpPct).toBeCloseTo(0.22 * 0.92);
    expect(boon.atkPct).toBeCloseTo(0.14 * 0.92);
  });

  it("a perfect morning (all stats 100) restores the full fixture formula", () => {
    const house = houseWith({ hearth: 3, tub: 3, shower: 3 });
    house.rooms.bedroom.furniture.bed = 3; // rested 100 → avg 100 → factor 1
    const boon = boonFor(boonState(), house);
    expect(boon.hpPct).toBeCloseTo(0.28);
    expect(boon.atkPct).toBeCloseTo(0.185);
  });

  it("stat modulation is monotonic: better rest alone makes the boon bigger", () => {
    const plain = houseWith({ hearth: 3, tub: 3, shower: 3 }); // bed tier 0
    const rested = houseWith({ hearth: 3, tub: 3, shower: 3 });
    rested.rooms.bedroom.furniture.bed = 3; // same fixture quality, higher Rested
    expect(fixtureQuality(rested)).toBe(fixtureQuality(plain));
    expect(boonFor(boonState(), rested).hpPct).toBeGreaterThan(boonFor(boonState(), plain).hpPct);
    expect(boonFor(boonState(), rested).atkPct).toBeGreaterThan(boonFor(boonState(), plain).atkPct);
  });

  it("boonFor keeps its exported shape", () => {
    const boon = boonFor(boonState(), houseWith({ hearth: 1 }));
    expect(Object.keys(boon).sort()).toEqual(["active", "atkPct", "hpPct"]);
    expect(typeof boon.active).toBe("boolean");
    expect(typeof boon.hpPct).toBe("number");
    expect(typeof boon.atkPct).toBe("number");
  });
});

describe("care stats (Rider H)", () => {
  const tendedAll = () => {
    const day = heroNeedsDayStr(at(21, 8));
    let s = defaultNeedsState(day);
    s = tendNeed(s, "food", at(21, 8));
    s = tendNeed(s, "bathroom", at(21, 8));
    s = tendNeed(s, "shower", at(21, 8));
    return s;
  };

  it("tending fills Fed/Washed/Relieved to the fixture tier value (60/75/90/100)", () => {
    for (const [tier, fill] of [[0, 60], [1, 75], [2, 90], [3, 100]] as const) {
      const house = houseWith({ hearth: tier, tub: tier, shower: tier });
      const stats = careStatsFor(tendedAll(), house, at(21, 9));
      expect(stats.fed).toBe(fill);
      expect(stats.relieved).toBe(fill);
      expect(stats.washed).toBe(fill);
    }
  });

  it("Rested is filled by the bed tier (55/70/85/100) and readable in the morning", () => {
    for (const [tier, fill] of [[0, 55], [1, 70], [2, 85], [3, 100]] as const) {
      const house = houseWith({});
      house.rooms.bedroom.furniture.bed = tier;
      const stats = careStatsFor(defaultNeedsState(heroNeedsDayStr(at(21, 7))), house, at(21, 7));
      expect(stats.rested).toBe(fill);
    }
  });

  it("care-adjacent pieces add their bonus on a tend, capped at 100", () => {
    const house = houseWith({ hearth: 2, shower: 2 });
    house.rooms.kitchen.furniture.herbPots = 3; // +6 → 90 + 6 = 96
    house.rooms.bathroom.furniture.linenShelf = 3; // +6 → 96
    const stats = careStatsFor(tendedAll(), house, at(21, 9));
    expect(stats.fed).toBe(96);
    expect(stats.washed).toBe(96);

    const maxed = houseWith({ hearth: 3 });
    maxed.rooms.kitchen.furniture.herbPots = 3;
    expect(careStatsFor(tendedAll(), maxed, at(21, 9)).fed).toBe(100);
  });

  it("untended stats read 0 before noon — plain information, nothing owed", () => {
    const s = defaultNeedsState(heroNeedsDayStr(at(21, 8)));
    const stats = careStatsFor(s, houseWith({}), at(21, 8));
    expect(stats.fed).toBe(0);
    expect(stats.washed).toBe(0);
    expect(stats.relieved).toBe(0);
    expect(stats.rested).toBe(55); // last night's sleep still reads
  });

  it("the midday self-care settle fills unfilled stats to the plain 50 baseline", () => {
    const day = heroNeedsDayStr(at(21, 9));
    let s = defaultNeedsState(day);
    s = tendNeed(s, "food", at(21, 9)); // fed at the tier-0 fill, 60
    const stats = careStatsFor(s, houseWith({}), at(21, 13));
    expect(stats.fed).toBe(60); // his tend stands
    expect(stats.washed).toBe(SELF_CARE_BASELINE);
    expect(stats.relieved).toBe(SELF_CARE_BASELINE);
    expect(SELF_CARE_BASELINE).toBe(50);
  });

  it("averageCareStats is the mean of the four", () => {
    expect(averageCareStats({ fed: 100, washed: 90, relieved: 80, rested: 70 })).toBeCloseTo(85);
  });
});

describe("parse + storage", () => {
  it("parse guards junk back to a fresh record for today", () => {
    const today = heroNeedsDayStr(Date.now());
    expect(parseNeedsState(null).day).toBe(today);
    expect(parseNeedsState("junk").day).toBe(today);
    expect(parseNeedsState(42).day).toBe(today);
    expect(parseNeedsState({ day: "not-a-date" }).day).toBe(today);
  });

  it("parse keeps valid fields and coerces the rest", () => {
    const parsed = parseNeedsState({
      day: "2026-10-21",
      tended: { food: true, shower: "yes" },
      selfCared: true,
      boonActive: false,
      boonLocked: true,
      allTendedAt: 123,
    });
    expect(parsed).toEqual({
      day: "2026-10-21",
      tended: { food: true, bathroom: false, shower: false },
      selfCared: true,
      boonActive: false,
      boonLocked: true,
      allTendedAt: 123,
      poolBoonActive: false,
    });
  });

  it("save + load round-trips a settled morning record", async () => {
    const today = heroNeedsDayStr(Date.now());
    const state = {
      ...defaultNeedsState(today),
      tended: { food: true, bathroom: true, shower: true },
      boonActive: true,
      boonLocked: true,
      allTendedAt: Date.now(),
    };
    await saveHeroNeeds(state);
    expect(store.has(HERO_NEEDS_KEY)).toBe(true);
    // All-tended records settle unchanged at any hour, so the load is exact.
    await expect(loadHeroNeeds()).resolves.toEqual(state);
  });

  it("load on empty storage returns a fresh record for today", async () => {
    const loaded = await loadHeroNeeds();
    expect(loaded.day).toBe(heroNeedsDayStr(Date.now()));
    expect(loaded.tended).toEqual({ food: false, bathroom: false, shower: false });
    expect(loaded.boonActive).toBe(false);
  });
});
