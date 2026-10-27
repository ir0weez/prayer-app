// v164 — Performance round 2 + collect correctness.
//
// Part A: the mount effect used to run ~25 storage loads SERIALLY
// before/around the town paint. It now loads the critical set in one
// parallel fan-out, then the accrual, then ONE awaited commit write,
// and hydrates everything else after the paint.
//
// Part B (the collect-timing bug): v161 painted the town BEFORE the
// accrual and saved the accrued town in a later, fire-and-forget
// breath — exiting inside that window stranded the accrual, so the
// next entry replayed it whole ("nothing to collect — back out —
// re-enter — 1,000+ coins"). The fix is sequencing, not schema: the
// away accrual (lib accrueAwayIncome — the old inline loop, arithmetic
// untouched) runs in the critical path, and the accrued amounts + the
// advanced lastTick anchors + the folded lastIncomeDate persist in ONE
// awaited write of the town record BEFORE the first paint.
//
//   INVARIANT: the state that first paints IS the persisted state.
//   Exit before the commit write → nothing was applied; the accrual
//   replays next entry at the correct total. Exit after it → the
//   anchors already advanced, so the window can never accrue twice.
//   At a fixed clock the accrual is idempotent.
//
// Part C: the coin-fly bursts were state of the 10k-line screen
// component, so every spawn/retire re-rendered the whole town tree.
// They now live in an isolated, memoized overlay with a hard sprite
// budget (MAX_LIVE_FLYERS = 12, via grantFlyers).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  accrueAwayIncome,
  barbershopBoostForBuilding,
  buildingStorageCap,
  dailyIncomeForTown,
  dailyXPForTown,
  emptyTownState,
  grantFlyers,
  MAX_LIVE_FLYERS,
  missedDaysIncome,
  parseTown,
  populationMult,
  roadMultiplierForBuilding,
  shopAdjacencyBonusForBuilding,
  type AwayAccrualInputs,
  type PlacedBuilding,
  type TownState,
} from "../hometown";

const NOW = 1_800_000_000_000; // fixed clock
const NOW_ISO = new Date(NOW).toISOString();
const TODAY = "2027-01-15";
const THREE_DAYS_AGO = "2027-01-12";

function inputs(over: Partial<AwayAccrualInputs> = {}): AwayAccrualInputs {
  return {
    gearCoinMult: 1,
    generosityMult: 0,
    houseCoinMult: 0,
    milestoneMult: 1,
    prestigeMult: 1,
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
    nowIso: NOW_ISO,
    ...over,
  };
}

/** One level-1 church, last ticked exactly 5 minutes before the
 *  fixed clock, nothing accumulated yet. (Five minutes keeps the
 *  expected add — 15.27 — under the level-1 church's 25-coin
 *  storage cap, so the raw arithmetic is what gets pinned; the cap
 *  itself is asserted in the arithmetic test.)
 *
 *  v291 re-base: the church stands on the CITY map now. Part 2
 *  retired the town map's building set (the café alone produces
 *  there), so a town-map church no longer accrues by design — the
 *  accrual arithmetic this file pins is unchanged, and the city is
 *  where a church still earns it. The café-only town behavior has
 *  its own pins (wide-street-v291.test.ts). */
function churchTown(): TownState {
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
  town.lastIncomeDate = THREE_DAYS_AGO;
  return town;
}

function pendingTotal(town: TownState): number {
  let sum = 0;
  for (const m of Object.values(town.maps)) {
    for (const b of m.buildings) sum += b.accumulated || 0;
  }
  return Math.round(sum * 100) / 100;
}

describe("accrueAwayIncome — arithmetic (hand-computed fixture)", () => {
  it("accrues minutes × rate and advances the anchor", () => {
    const town = churchTown();
    const map = town.maps.city;
    const church = map.buildings[0];
    // Pin the primitives the hand computation relies on: a roadless,
    // shop-less map leaves every spatial factor at exactly 1.
    expect(roadMultiplierForBuilding(map, "church-1")).toBe(1);
    expect(barbershopBoostForBuilding(map, "church-1")).toBe(1);
    expect(shopAdjacencyBonusForBuilding(map, "church-1")).toBe(1);
    expect(populationMult(8)).toBeCloseTo(1.16, 10);
    expect(buildingStorageCap(church)).toBe(25);

    const { town: out, rates } = accrueAwayIncome(town, inputs());
    // basePerHour = 20 × populationMult(8) = 23.2 → 23.2/60 per minute;
    // churches also earn CHURCH_PRAYER_COINS_PER_HOUR × prayedCount
    // = 20 × 8 = 160/hr → 160/60 per minute. Presence (away proxy,
    // prayedCount 8) = min(1, 8/8) = 1.
    const perMinute = 183.2 / 60;
    expect(rates["church-1"].coins).toBeCloseTo(perMinute, 8);
    const b = out.maps.city.buildings[0];
    expect(b.accumulated).toBeCloseTo(5 * perMinute, 2); // 15.27 after the cents round
    expect(b.lastTick).toBe(NOW_ISO);
  });

  it("is idempotent at a fixed clock — the same window never accrues twice", () => {
    const first = accrueAwayIncome(churchTown(), inputs());
    const second = accrueAwayIncome(first.town, inputs());
    expect(second.town).toEqual(first.town);
    expect(second.rates).toEqual(first.rates);
  });

  it("under construction: anchor advances, nothing accrues, no rate cached", () => {
    const town = churchTown();
    town.maps.city.buildings[0].constructionEndsAt = NOW + 3600_000;
    const { town: out, rates } = accrueAwayIncome(town, inputs());
    const b = out.maps.city.buildings[0];
    expect(b.accumulated).toBe(0);
    expect(b.lastTick).toBe(NOW_ISO);
    expect(rates["church-1"]).toBeUndefined();
  });

  it("presence: per-map villager counts gate the accrual; absence falls back to prayed count", () => {
    // Nobody located on the church's map → presence 0 → no accrual,
    // but the anchor still advances (the window is consumed).
    const none = accrueAwayIncome(churchTown(), inputs({ presenceCounts: { city: 0 } }));
    expect(none.town.maps.city.buildings[0].accumulated).toBe(0);
    expect(none.town.maps.city.buildings[0].lastTick).toBe(NOW_ISO);
    // Four located → presence min(1, 4/8) = 0.5 → half the full add.
    const half = accrueAwayIncome(churchTown(), inputs({ presenceCounts: { city: 4 } }));
    expect(half.town.maps.city.buildings[0].accumulated).toBeCloseTo(2.5 * (183.2 / 60), 2); // 7.63
    // prayedCount 0 with no per-map counts → presence 0.
    const zero = accrueAwayIncome(churchTown(), inputs({ prayedCount: 0 }));
    expect(zero.town.maps.city.buildings[0].accumulated).toBe(0);
  });
});

describe("Part B — exit-replay simulation (load → exit → reload)", () => {
  const missedOpts = {
    today: TODAY,
    milestoneMult: 1,
    houseCoinMult: 0,
    fellowshipBonus: 1,
    prayedCount: 8,
    remembranceBonus: 1,
    gardenVisitBonus: 1,
    prestigeMult: 1,
    nowMs: NOW,
  };

  /** One full mount, exactly as the screen runs it: parse the stored
   *  record, accrue, price missed days, fold the date, ONE write. */
  function mountOnce(stored: string): { committed: string; pending: number } {
    const loaded = parseTown(JSON.parse(stored));
    const accrual = accrueAwayIncome(loaded, inputs());
    let t = accrual.town;
    missedDaysIncome(t, missedOpts); // award decision (coins/XP live outside the town record)
    t = { ...t, lastIncomeDate: TODAY };
    return { committed: JSON.stringify(t), pending: pendingTotal(t) };
  }

  it("exit BEFORE the commit write: the replay lands on the exact same total", () => {
    const stored0 = JSON.stringify(churchTown());
    // Entry 1 runs the whole critical path and commits.
    const first = mountOnce(stored0);
    expect(first.pending).toBeCloseTo(15.27, 6);
    // Entry 2 simulates entry 1 having been killed before its write:
    // storage still holds the pre-accrual record, so the accrual
    // replays — and must produce EXACTLY the single-accrual total,
    // never the total plus a stranded partial accrual.
    const replay = mountOnce(stored0);
    expect(replay.pending).toBe(first.pending);
    expect(replay.committed).toBe(first.committed);
  });

  it("exit AFTER the commit: reload accrues nothing new and missed days do not re-award", () => {
    const stored0 = JSON.stringify(churchTown());
    const first = mountOnce(stored0);
    // Reload from the committed record at the same clock.
    const loaded = parseTown(JSON.parse(first.committed));
    const again = accrueAwayIncome(loaded, inputs());
    expect(pendingTotal(again.town)).toBe(first.pending);
    // lastIncomeDate already folded → the missed-days award is gone.
    expect(missedDaysIncome(again.town, missedOpts)).toBeNull();
  });
});

describe("missedDaysIncome — the award decision", () => {
  const opts = {
    today: TODAY,
    milestoneMult: 1,
    houseCoinMult: 0,
    fellowshipBonus: 1,
    prayedCount: 8,
    remembranceBonus: 1,
    gardenVisitBonus: 1,
    prestigeMult: 1,
    nowMs: NOW,
  };

  it("null for a fresh town and for the same day", () => {
    const fresh = churchTown();
    fresh.lastIncomeDate = null;
    expect(missedDaysIncome(fresh, opts)).toBeNull();
    const sameDay = churchTown();
    sameDay.lastIncomeDate = TODAY;
    expect(missedDaysIncome(sameDay, opts)).toBeNull();
  });

  it("prices whole days at the town's daily income, floored/rounded as before", () => {
    const town = churchTown();
    const perDayCoins = dailyIncomeForTown(town, 1, 1, 1, 8, 1, 1, 1, NOW);
    const perDayXP = dailyXPForTown(town, NOW);
    expect(perDayCoins).toBeGreaterThan(0);
    const missed = missedDaysIncome(town, opts);
    expect(missed).not.toBeNull();
    expect(missed!.days).toBe(3);
    expect(missed!.earnedCoins).toBe(Math.floor(3 * perDayCoins));
    expect(missed!.earnedXP).toBe(Math.round(3 * perDayXP));
    // After the caller's unconditional fold, a second call is null —
    // the day count can never be awarded twice.
    const folded = { ...town, lastIncomeDate: TODAY };
    expect(missedDaysIncome(folded, opts)).toBeNull();
  });
});

describe("grantFlyers — the Collect All sprite budget", () => {
  it("caps simultaneous flyers at 12 however many bursts ask", () => {
    expect(MAX_LIVE_FLYERS).toBe(12);
    expect(grantFlyers(0)).toBe(4);
    expect(grantFlyers(8)).toBe(4);
    expect(grantFlyers(9)).toBe(3);
    expect(grantFlyers(11)).toBe(1);
    expect(grantFlyers(12)).toBe(0);
    expect(grantFlyers(20)).toBe(0);
    expect(grantFlyers(0, 2)).toBe(2);
  });
});

describe("source pins — mount sequencing + fly overlay isolation", () => {
  const src = readFileSync(join(process.cwd(), "app/hometown.tsx"), "utf8");
  const effect = (() => {
    const start = src.indexOf("// Load + accumulate hourly income on open");
    const end = src.indexOf("// Daily town visit streak", start);
    return src.slice(start, end);
  })();

  it("the accrual is computed, persisted in ONE awaited write, and only then painted", () => {
    // Scoped to the commit section: the one-time migrations earlier in
    // the effect legitimately write the town record too.
    const commitAt = effect.indexOf("ACCRUAL + ATOMIC COMMIT (v164)");
    const accrueAt = effect.indexOf("accrueAwayIncome(t, {");
    const writeAt = effect.indexOf("await AsyncStorage.setItem(TOWN_STORAGE_KEY, JSON.stringify(t))", commitAt);
    const paintAt = effect.indexOf("setTown(t);", writeAt);
    expect(commitAt).toBeGreaterThan(-1);
    expect(accrueAt).toBeGreaterThan(commitAt);
    expect(writeAt).toBeGreaterThan(accrueAt);
    expect(paintAt).toBeGreaterThan(writeAt);
    // Exactly one town paint in the whole mount effect — the commit.
    expect(effect.split("setTown(t);").length - 1).toBe(1);
  });

  it("critical fan-out → accrual commit → deferred hydration, in that order", () => {
    const fanOutAt = effect.indexOf("CRITICAL FAN-OUT (v164)");
    const commitAt = effect.indexOf("ACCRUAL + ATOMIC COMMIT (v164)");
    const deferredAt = effect.indexOf("DEFERRED HYDRATION (v164)");
    expect(fanOutAt).toBeGreaterThan(-1);
    expect(commitAt).toBeGreaterThan(fanOutAt);
    expect(deferredAt).toBeGreaterThan(commitAt);
  });

  it("the critical fan-out carries the accrual's named inputs", () => {
    const fanOut = effect.slice(effect.indexOf("CRITICAL FAN-OUT (v164)"), effect.indexOf("ACCRUAL + ATOMIC COMMIT (v164)"));
    for (const loader of [
      "attempt(() => loadRemembrance())",
      "attempt(() => loadFieldMissions())",
      "attempt(() => prayedTodayPeople())",
      "attempt(() => refreshHouseBonusCache())",
      "attempt(() => loadFellowship())",
      "attempt(() => loadLighthouse())",
      "attempt(() => loadGardenVisits())",
      "attempt(() => refreshStatBoostCache())",
    ]) {
      expect(fanOut).toContain(loader);
    }
  });

  it("deferred hydration lands the non-painting systems after the commit", () => {
    const deferred = effect.slice(effect.indexOf("DEFERRED HYDRATION (v164)"));
    for (const loader of [
      "setWell(await loadWell())",
      "setForest(await loadDarkForestState())",
      "setRiver(await loadRiverState())",
      "loadXPState()",
      "setGardenState(await loadGarden())",
      "setMissions(await generateDailyMissions())",
    ]) {
      expect(deferred).toContain(loader);
    }
    // …and none of them are awaited in the critical path before it.
    const critical = effect.slice(0, effect.indexOf("DEFERRED HYDRATION (v164)"));
    expect(critical).not.toContain("await loadWell()");
    expect(critical).not.toContain("await loadDarkForestState()");
    expect(critical).not.toContain("await generateDailyMissions()");
  });

  it("the coin-fly bursts live in the isolated overlay, not screen state", () => {
    expect(src).not.toContain("const [bursts, setBursts]");
    expect(src).toContain("<CoinFlyOverlay ref={flyOverlayRef} />");
    expect(src).toContain("React.memo(");
    expect(src).toContain("burst.count ?? 4");
    expect(src).toContain("grantFlyers(liveFlyersRef.current, 4)");
    // The sprite budget itself is the lib constant.
    expect(src).toContain("MAX_LIVE_FLYERS");
  });
});

describe("Depth Blessing (v175) — the mine's multiplier joins the income chain", () => {
  it("away accrual scales the per-building rate by the blessing; the prayer coins are unscaled", () => {
    const base = accrueAwayIncome(churchTown(), inputs());
    const blessed = accrueAwayIncome(churchTown(), inputs({ depthBlessingMult: 1.2 }));
    // Church fixture arithmetic: basePerHour = 20 × populationMult(8)
    // = 23.2 → blessed 27.84; the +160/hr prayer-coin stream rides
    // alongside UNSCALED (it is not building income).
    expect(base.rates["church-1"].coins).toBeCloseTo(183.2 / 60, 8);
    expect(blessed.rates["church-1"].coins).toBeCloseTo(187.84 / 60, 8);
  });

  it("daily income carries the same blessing factor end to end", () => {
    const town = churchTown();
    const plain = dailyIncomeForTown(town, 1, 1, 1, 8, 1, 1, 1, NOW);
    const blessed = dailyIncomeForTown(town, 1, 1, 1, 8, 1, 1, 1, NOW, 1.2);
    expect(plain).toBeGreaterThan(0);
    expect(blessed).toBeCloseTo(plain * 1.2, 8);
  });
});
