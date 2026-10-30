// ─────────────────────────────────────────────────────────────────────────────
// v323 — The Era Game, Part 1. Pins.
//
// Jonathan ordered the era game 2026-10-28 20:41, out of his dream
// that same evening: a fast walks the whole road of redemptive
// history — twelve eras, one per twelfth of the fast — and the town
// lives in the age, its economy fluctuating with it. His settled
// design (chat, Oct 28 20:28–20:41 + MEMORY):
//
//   Village · Flood · Babel · Israel · Saul · David · Ministry ·
//   Nero · Church Ages · Tribulation · Millennium · New Earth.
//
// Contracts pinned here:
//  (a) DERIVATION — era = which twelfth of the fast the LIVE counter
//      (getCurrentFastDay / getFastCalendarDays index) names: day 1
//      Village, boundaries by the formula, day 301 of 365 Tribulation,
//      day 306 Millennium, the last day New Earth. Short fasts carry
//      no era; a 90 walks the same road in miniature.
//  (b) ECONOMY — the era table itself, Saul's day-parity swing, and
//      its application: incomeMult + prayerBoostMult inside the
//      away-settle path (missed days settle through that same path
//      since v343 — the separate missed-days award is deleted),
//      costMult at purchase/construction pricing through
//      eraPriceCoins. Defaults (no era inputs, cost mult 1) leave
//      every number untouched.
//  (c) ERA TURN — the last-seen record parses strictly, and the card
//      offers itself exactly when the standing era differs from the
//      last announced one.
//  (d) LABELS — the notice board (and its sibling points) stand wide
//      enough for their labels: the "Miss…" truncation cannot recur.
//  (e) RIDER — the Daily Summary's fasting prose reads the same live
//      counter as every other surface (getCurrentFastDay), never a
//      millisecond difference again; and the era is wired through
//      the screen: HUD name, street dress, accrual inputs.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  accrueAwayIncome,
  emptyTownState,
  eraPriceCoins,
  mapUnlockCost,
  setEconomyScale,
  setEraCostMult,
  upgradeCostFor,
  type AwayAccrualInputs,
  type PlacedBuilding,
  type TownState,
} from "../hometown";
import {
  ERA_DEFS,
  eraEconomyFor,
  eraForFast,
  eraIndexForDay,
  eraIndexForFast,
  parseLastSeenEra,
  shouldAnnounceEra,
} from "../hometown-eras";
import {
  getCurrentFastDay,
  getFastCalendarDays,
  type PersonalFast,
} from "../prayercircle-fasting";

const ROOT = join(__dirname, "..", "..");
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function fast(over: Partial<PersonalFast> = {}): PersonalFast {
  return {
    id: "fast-era",
    name: "365-Day Growth Fast",
    startDate: "2026-01-01",
    durationDays: 365,
    type: "Growth",
    focusItems: [],
    dayStatuses: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

/** The ISO date of a 1-based fast day, off the calendar itself. */
function dateOfDay(f: PersonalFast, day: number): string {
  return getFastCalendarDays(f)[day - 1];
}

describe("v323 (a) — era derivation from the live counter", () => {
  it("the twelve eras stand in his order", () => {
    expect(ERA_DEFS.map((e) => e.name)).toEqual([
      "Village", "Flood", "Babel", "Israel", "Saul", "David", "Ministry",
      "Nero", "Church Ages", "Tribulation", "Millennium", "New Earth",
    ]);
    expect(ERA_DEFS.map((e) => e.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("twelfths of a 365: boundaries by the formula", () => {
    expect(eraIndexForDay(1, 365)).toBe(0); // Village opens the road
    expect(eraIndexForDay(31, 365)).toBe(0);
    expect(eraIndexForDay(32, 365)).toBe(1); // the Flood turns
    expect(eraIndexForDay(301, 365)).toBe(9); // Tribulation (his day, Oct 28)
    expect(eraIndexForDay(305, 365)).toBe(9); // the Tribulation's last day
    expect(eraIndexForDay(306, 365)).toBe(10); // the Millennium turns
    expect(eraIndexForDay(335, 365)).toBe(10);
    expect(eraIndexForDay(336, 365)).toBe(11); // the New Earth, the final month
    expect(eraIndexForDay(365, 365)).toBe(11);
  });

  it("eraForFast reads the same counter the tracker reads", () => {
    const f = fast();
    expect(eraForFast(f, dateOfDay(f, 1))?.id).toBe("village");
    expect(eraForFast(f, dateOfDay(f, 301))?.id).toBe("tribulation");
    expect(eraForFast(f, dateOfDay(f, 306))?.id).toBe("millennium");
    expect(eraForFast(f, dateOfDay(f, 365))?.id).toBe("new-earth");
    // and the day the era read is the day getCurrentFastDay reports
    expect(getCurrentFastDay(f, dateOfDay(f, 301))).toBe(301);
    expect(eraIndexForFast(f, dateOfDay(f, 301))).toBe(9);
  });

  it("a fast too short for Hometown carries no era; a 90 walks in miniature", () => {
    expect(eraForFast(fast({ durationDays: 40 }), "2026-01-20")).toBeNull();
    expect(eraForFast(null)).toBeNull();
    const ninety = fast({ durationDays: 90 });
    expect(eraForFast(ninety, dateOfDay(ninety, 1))?.id).toBe("village");
    expect(eraForFast(ninety, dateOfDay(ninety, 46))?.id).toBe("ministry");
    expect(eraForFast(ninety, dateOfDay(ninety, 90))?.id).toBe("new-earth");
  });
});

describe("v323 (b) — the era economy", () => {
  it("the table is his design, era by era", () => {
    const econ = (i: number) => ERA_DEFS[i].economy;
    expect(econ(0)).toEqual({ incomeMult: 1, costMult: 1, prayerBoostMult: 1 }); // Village
    expect(econ(1)).toEqual({ incomeMult: 0.6, costMult: 1, prayerBoostMult: 1 }); // Flood sags
    expect(econ(2)).toEqual({ incomeMult: 1.5, costMult: 1.5, prayerBoostMult: 1 }); // Babel booms both ways
    expect(econ(3)).toEqual({ incomeMult: 1, costMult: 0.9, prayerBoostMult: 1 }); // Israel provision
    expect(econ(5)).toEqual({ incomeMult: 1.25, costMult: 1, prayerBoostMult: 1 }); // David golden
    expect(econ(6)).toEqual({ incomeMult: 1, costMult: 1, prayerBoostMult: 1.25 }); // Ministry
    expect(econ(7)).toEqual({ incomeMult: 0.7, costMult: 1, prayerBoostMult: 2 }); // Nero: prayer doubles
    expect(econ(8)).toEqual({ incomeMult: 1.1, costMult: 1, prayerBoostMult: 1 }); // Church Ages
    expect(econ(9)).toEqual({ incomeMult: 0.5, costMult: 1.5, prayerBoostMult: 1.5 }); // Tribulation
    expect(econ(10)).toEqual({ incomeMult: 1.5, costMult: 0.75, prayerBoostMult: 1 }); // Millennium
    expect(econ(11)).toEqual({ incomeMult: 2, costMult: 0.5, prayerBoostMult: 1 }); // New Earth leisure
  });

  it("Saul swings by the fast day's parity — deterministic, never rolled", () => {
    expect(ERA_DEFS[4].volatile).toBe(true);
    expect(eraEconomyFor(4, 3).incomeMult).toBe(0.7); // odd day: lean
    expect(eraEconomyFor(4, 4).incomeMult).toBe(1.3); // even day: rich
    expect(eraEconomyFor(4, 4)).toEqual(eraEconomyFor(4, 4)); // same day, same weather
    expect(eraEconomyFor(null, 100)).toEqual({ incomeMult: 1, costMult: 1, prayerBoostMult: 1 });
  });

  const NOW = 1_800_000_000_000;
  const NOW_ISO = new Date(NOW).toISOString();
  function inputs(over: Partial<AwayAccrualInputs> = {}): AwayAccrualInputs {
    return {
      gearCoinMult: 1, generosityMult: 0, houseCoinMult: 0, milestoneMult: 1,
      prestigeMult: 1, prayerMultValue: 1, prayedCount: 8, fellowshipBonus: 1,
      remembranceBonus: 1, gardenVisitBonus: 1, interiorBonuses: {},
      restInteriorMult: {}, presenceCounts: null, economyScale: 1,
      nowMs: NOW, nowIso: NOW_ISO, ...over,
    };
  }
  /** The away-accrual suite's fixture: one L1 church on the city map.
   *  RE-BASED (v343): the anchor is a fixed local date one day
   *  before the clock's (2027-01-14 midday UTC) — the day model
   *  settles whole days from the anchor's DATE, so the old
   *  "five minutes before the clock" anchor settles nothing. */
  function churchTown(): TownState {
    const town = emptyTownState();
    const church: PlacedBuilding = {
      id: "church-1", type: "church", x: 2, y: 2, level: 1,
      accumulated: 0, lastTick: "2027-01-14T12:00:00.000Z",
    };
    town.maps.city.buildings = [church];
    town.lastIncomeDate = "2027-01-12";
    return town;
  }

  it("inside the settle path: incomeMult scales the accrual, untouched at 1", () => {
    // RE-BASED (v343) to the day model: the church's per-day rate is
    // its def table (240) plus the prayer stream (20 × 8 prayed =
    // 160), and eraIncomeMult scales BOTH (it rides the rate chain
    // and the stream alike). One day settles at presence 1 — and
    // slams into the L1 storage cap (25), so the era is read off
    // the cached rates, where nothing is capped.
    const base = accrueAwayIncome(churchTown(), inputs());
    expect(base.rates["church-1"].coins).toBeCloseTo(400, 8);
    expect(base.town.maps.city.buildings[0].accumulated).toBe(25);
    const aged = accrueAwayIncome(churchTown(), inputs({ eraIncomeMult: 1.5 }));
    expect(aged.rates["church-1"].coins).toBeCloseTo(600, 8);
    const lean = accrueAwayIncome(churchTown(), inputs({ eraIncomeMult: 0.5 }));
    expect(lean.rates["church-1"].coins).toBeCloseTo(200, 8);
  });

  it("prayerBoostMult scales only the boost's lift, never the base", () => {
    // prayerMultValue 1.3 = ten people prayed (+3% each). A boost of
    // 2 (Nero) makes the lift 0.6, so the prayer value becomes 1.6 —
    // the cached per-DAY rate carries it exactly: the church's 240
    // base scales by the prayer value; the 160 prayer stream does
    // not (it is already prayer's own count, once).
    const plain = accrueAwayIncome(churchTown(), inputs({ prayerMultValue: 1.3 }));
    expect(plain.rates["church-1"].coins).toBeCloseTo(240 * 1.3 + 160, 6);
    const boosted = accrueAwayIncome(churchTown(), inputs({ prayerMultValue: 1.3, eraPrayerBoostMult: 2 }));
    expect(boosted.rates["church-1"].coins).toBeCloseTo(240 * 1.6 + 160, 6);
    // and with no lift at all (nobody prayed), a boost changes nothing
    const noLift = accrueAwayIncome(churchTown(), inputs({ prayerMultValue: 1, eraPrayerBoostMult: 2 }));
    expect(noLift.rates["church-1"].coins).toBeCloseTo(plain.rates["church-1"].coins - 240 * 0.3, 6);
  });

  it("missed days settle under the era's income too — through the accrual", () => {
    // RE-BASED (v343): the missed-days award this pin priced is
    // deleted; missed days settle through accrueAwayIncome itself,
    // under the same era weather. An L3 farm (100/day, cap 200)
    // anchored a day back settles one day: 100 un-aged, 200 under
    // a ×2 era. XP never ages: the library's XP rate ignores
    // eraIncomeMult entirely.
    const town = emptyTownState();
    const farm: PlacedBuilding = {
      id: "farm-1", type: "farm", x: 2, y: 2, level: 3,
      accumulated: 0, lastTick: "2027-01-14T12:00:00.000Z",
    };
    const library: PlacedBuilding = {
      id: "library-1", type: "library", x: 4, y: 2, level: 1,
      accumulated: 0, lastTick: "2027-01-14T12:00:00.000Z",
    };
    // Farm and library stand on DIFFERENT maps: on one map the
    // library's presence lifts the farm's rate through the worker
    // chain (×1.25) — a real engine synergy, but not this pin's
    // subject.
    town.maps.city.buildings = [farm];
    town.maps.school.buildings = [library];
    const base = accrueAwayIncome(town, inputs());
    expect(base.town.maps.city.buildings[0].accumulated).toBe(100);
    const aged = accrueAwayIncome(town, inputs({ eraIncomeMult: 2 }));
    expect(aged.town.maps.city.buildings[0].accumulated).toBe(200);
    expect(aged.rates["library-1"].xp).toBe(50);
    expect(aged.town.maps.school.buildings[0].accumulated).toBe(50);
  });

  it("costMult rides purchase/construction pricing — and only pricing", () => {
    setEconomyScale(1);
    setEraCostMult(1);
    expect(eraPriceCoins(100)).toBe(100);
    expect(upgradeCostFor("farm", 2)).toBe(220 * 15);
    expect(mapUnlockCost("school")).toBe(1000);
    setEraCostMult(1.5); // Babel: prices run hot
    expect(eraPriceCoins(100)).toBe(150);
    expect(upgradeCostFor("farm", 2)).toBe(220 * 15 * 1.5);
    expect(mapUnlockCost("school")).toBe(1500);
    setEraCostMult(0.5); // New Earth: everything cheap
    expect(upgradeCostFor("farm", 2)).toBe(220 * 15 * 0.5);
    setEraCostMult(1); // restore the un-aged price for any later reader
  });
});

describe("v323 (c) — the era turn is announced once", () => {
  it("the last-seen record parses strictly", () => {
    expect(parseLastSeenEra({ lastSeenEra: 9 })).toBe(9);
    expect(parseLastSeenEra({ lastSeenEra: 0 })).toBe(0);
    expect(parseLastSeenEra({ lastSeenEra: 12 })).toBeNull();
    expect(parseLastSeenEra({ lastSeenEra: -1 })).toBeNull();
    expect(parseLastSeenEra({ lastSeenEra: 2.5 })).toBeNull();
    expect(parseLastSeenEra({})).toBeNull();
    expect(parseLastSeenEra(null)).toBeNull();
    expect(parseLastSeenEra("tribulation")).toBeNull();
  });

  it("the card offers itself exactly when the era differs from the last announced", () => {
    expect(shouldAnnounceEra(null, 9)).toBe(true); // first sighting introduces the age
    expect(shouldAnnounceEra(9, 9)).toBe(false);
    expect(shouldAnnounceEra(8, 9)).toBe(true); // the page turned
    expect(shouldAnnounceEra(9, 10)).toBe(true);
  });

  it("dismissal is what records the era as seen (the screen's wiring)", () => {
    const screen = read("app/hometown.tsx");
    expect(screen).toContain("const seenEra = await loadLastSeenEra();");
    expect(screen).toContain("if (shouldAnnounceEra(seenEra, eraLocal.index))");
    expect(screen).toContain("void saveLastSeenEra(seenIndex);");
    // the card moves no coins and settles nothing — it only speaks
    const cardAt = screen.indexOf("A NEW AGE");
    const card = screen.slice(cardAt, screen.indexOf("{activeMap === \"town\" && !isTownWorld", cardAt));
    expect(card).toContain("eraTurnEra.name");
    expect(card).toContain("eraTurnEra.line");
    expect(card).not.toContain("addCoins");
    expect(card).not.toContain("accrueAwayIncome");
  });
});

describe("v323 (d) — labels stand wide enough to speak", () => {
  it("the points' stands fit their longest labels (no more 'Miss…')", () => {
    const points = read("components/street-world-points.tsx");
    // v327 re-pin: v323's stands (76/64/84) still clipped "Town
    // Shop" — the chip's padding left the words ~50px of the 64px
    // stand. The Diorama's fix is the pattern, not just the
    // numbers: stands sized to their longest labels with slack,
    // and no point label carries a line limit anymore (see
    // hometown-v327-diorama.test.ts (d)).
    expect(points).toContain("export const NOTICE_BOARD_W = 92;");
    expect(points).toContain("export const SHOP_STALL_W = 84;");
    expect(points).toContain("export const TESTIMONY_STONES_W = 104;");
    // RE-BASED in v355 (Oct 29): the board's and stones' stand
    // widths are MEASURED by the one label system now
    // (noticeBoardStandW / testimonyStonesStandW, from
    // lib/stage-labels) with the v323 constants standing as
    // floors — a stand is as wide as its actual label at its
    // actual count, so "12 missions" can never outgrow it. The
    // shop stall (compat only, unplaced) keeps its constant.
    expect(points).toContain("width: noticeBoardStandW(pendingCount, s)");
    expect(points).toContain("width: SHOP_STALL_W");
    expect(points).toContain("width: testimonyStonesStandW(count, s)");
    // the board's art keeps its drawn size, centered in the stand.
    // v333 re-pin: the drawn size is now expressed through the
    // point's stage scale (46×34 at scale 1 — the 40px reference
    // cell), because the fixed stage scales its furniture from the
    // cell (R13). The stands' widths scale the same way.
    // RE-BASED (v343): the board's FACE grew to the brief's ruling —
    // about 19% of the stage, big enough to read as the town's
    // "nobody slips" surface — 84×62 at scale 1.
    expect(points).toContain("<View style={{ width: 84 * s, height: 62 * s }}>");
  });
});

describe("v323 (e) — the rider + the screen's era wiring", () => {
  it("the Daily Summary's fasting prose reads the live counter", () => {
    const tab = read("components/schedule-tab.tsx");
    expect(tab).toContain("Fast • Day {getCurrentFastDay(item.data)} of {item.data.durationDays}");
    expect(tab).not.toContain("new Date(item.data.startDate).getTime()");
    expect(tab).not.toContain("(1000 * 60 * 60 * 24)) + 1");
  });

  it("the era reaches the HUD, the street, the villagers and the settle", () => {
    const screen = read("app/hometown.tsx");
    expect(screen).toContain("era={townEra}");
    expect(screen).toContain("townEra.name.toUpperCase()");
    expect(screen).toContain("eraIncomeMult: eraEconomyLocal.incomeMult");
    expect(screen).toContain("eraPrayerBoostMult: eraEconomyLocal.prayerBoostMult");
    expect(screen).toContain("setEraCostMult(eraEconomyLocal.costMult)");
    expect(screen).toContain("eraDress={");
    const street = read("components/wide-street.tsx");
    expect(street).toContain("eraGroundFor(era, phase)");
    expect(street).toContain("era?.palette.river");
    expect(street).toContain("era?.palette.rain");
    expect(street).toContain("era?.palette.torn");
    expect(street).toContain("dress={dress}");
  });

  it("the dressed eras carry place dress; the nine wear palette only", () => {
    expect(ERA_DEFS[10].palette.dress).toBeDefined(); // Millennium, dressed in full
    expect(ERA_DEFS[11].palette.dress).toBeDefined(); // New Earth, dressed in full
    expect(ERA_DEFS[11].palette.river).toBe(true);
    expect(ERA_DEFS[1].palette.rain).toBe(true); // the Flood's weather
    expect(ERA_DEFS[9].palette.torn).toBe(true); // the Tribulation's torn edge
    expect(ERA_DEFS[7].palette.lampAmber).toBe(true); // Nero's lamps
    for (const i of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      expect(ERA_DEFS[i].palette.dress).toBeUndefined();
      expect(ERA_DEFS[i].palette.groundMix).toBeGreaterThan(0);
    }
  });
});
