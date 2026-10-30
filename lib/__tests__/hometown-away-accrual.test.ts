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
//
// RE-BASED (v343): the accrual this file pins is now the DAY MODEL.
// The per-minute engine (flat 20/hr × minutes, stacked with a
// +2%-per-person populationMult) is replaced by whole-local-day
// settles at each building's per-day def-table rate, with ONE
// prayer formula (prayerMult — populationMult is deleted), a
// fast-streak-alive gate, and presence in the live step shape
// (0/.4/.7/1). missedDaysIncome is DELETED: missed days settle
// through this same accrual into the waiting piles — nothing is
// ever auto-credited to the balance, and the return report reads
// the piles. The sequencing invariant of Part B is unchanged.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  accrueAwayIncome,
  barbershopBoostForBuilding,
  buildingStorageCap,
  dailyIncomeForTown,
  effectiveIncomeFor,
  emptyTownState,
  grantFlyers,
  MAX_LIVE_FLYERS,
  parseTown,
  prayerMult,
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

/** One level-1 church on the city map, anchored one local day
 *  before the fixed clock (2027-01-14 midday UTC — the day model
 *  counts whole days between the anchor's DATE and today), nothing
 *  accumulated yet.
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
    lastTick: "2027-01-14T12:00:00.000Z",
  };
  town.maps.city.buildings = [church];
  town.lastIncomeDate = THREE_DAYS_AGO;
  return town;
}

/** One level-1 farm on the city map (20/day, storage cap 25 — a
 *  day's settle fits under the cap, so the raw day arithmetic is
 *  what gets pinned; the cap itself is asserted separately). */
function farmTown(lastTick: string): TownState {
  const town = emptyTownState();
  const farm: PlacedBuilding = {
    id: "farm-1",
    type: "farm",
    x: 2,
    y: 2,
    level: 1,
    accumulated: 0,
    lastTick,
  };
  town.maps.city.buildings = [farm];
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
  it("settles whole days at the per-day rate and advances the anchor", () => {
    const town = farmTown("2027-01-14T12:00:00.000Z");
    const map = town.maps.city;
    const farm = map.buildings[0];
    // Pin the primitives the hand computation relies on: a roadless,
    // shop-less map leaves every spatial factor at exactly 1, and
    // the farm's def table is 20/day under a 25-coin L1 cap.
    expect(roadMultiplierForBuilding(map, "farm-1")).toBe(1);
    expect(barbershopBoostForBuilding(map, "farm-1")).toBe(1);
    expect(shopAdjacencyBonusForBuilding(map, "farm-1")).toBe(1);
    expect(effectiveIncomeFor(farm)).toBe(20);
    expect(buildingStorageCap(farm)).toBe(25);

    const { town: out, rates } = accrueAwayIncome(town, inputs());
    // One whole day × 20/day × presence 1 (8 prayed, the step shape
    // is full at 3+) = 20 waiting. The cached rate IS the per-day
    // rate — the live tick settles day boundaries from it.
    expect(rates["farm-1"].coins).toBeCloseTo(20, 8);
    const b = out.maps.city.buildings[0];
    expect(b.accumulated).toBe(20);
    expect(b.lastTick).toBe(NOW_ISO);
  });

  it("several days settle at once — and the pile caps at the storage cap", () => {
    // Three days × 20 = 60 priced, 25 held: the cap is the pile's
    // whole discipline (collect by hand, daily).
    const { town: out } = accrueAwayIncome(farmTown("2027-01-12T12:00:00.000Z"), inputs());
    expect(out.maps.city.buildings[0].accumulated).toBe(25);
    expect(out.maps.city.buildings[0].lastTick).toBe(NOW_ISO);
  });

  it("within the same day nothing settles — there is no per-minute drip", () => {
    const sameDay = "2027-01-15T12:00:00.000Z"; // the clock's own local date, midday UTC
    const { town: out } = accrueAwayIncome(
      farmTown(sameDay),
      inputs({ nowMs: Date.parse("2027-01-15T20:00:00.000Z"), nowIso: "2027-01-15T20:00:00.000Z" }),
    );
    const b = out.maps.city.buildings[0];
    expect(b.accumulated).toBe(0);
    expect(b.lastTick).toBe(sameDay); // anchor untouched — the day has not turned
  });

  it("the church's rate is its table plus the prayer stream — ONE prayer formula", () => {
    // 240/day from the def table; the stream settles 20 per person
    // prayed for, once per day (160 at 8 prayed). prayerMult enters
    // ONCE, on the building's own rate: at prayerMultValue =
    // prayerMult(8) = 1.24 the rate is 240 × 1.24 + 160 — the old
    // +2% population stack (which priced a second multiplier on top)
    // is deleted with populationMult.
    expect(prayerMult(8)).toBeCloseTo(1.24, 10);
    const neutral = accrueAwayIncome(churchTown(), inputs());
    expect(neutral.rates["church-1"].coins).toBeCloseTo(240 + 160, 8);
    const prayed = accrueAwayIncome(churchTown(), inputs({ prayerMultValue: prayerMult(8) }));
    expect(prayed.rates["church-1"].coins).toBeCloseTo(240 * 1.24 + 160, 8);
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

  it("presence: the away shape is the live step shape (0 / .4 / .7 / 1)", () => {
    // Nobody located on the farm's map → presence 0 → no accrual,
    // but the anchor still advances (the window is consumed).
    const none = accrueAwayIncome(farmTown("2027-01-14T12:00:00.000Z"), inputs({ presenceCounts: { city: 0 } }));
    expect(none.town.maps.city.buildings[0].accumulated).toBe(0);
    expect(none.town.maps.city.buildings[0].lastTick).toBe(NOW_ISO);
    // One located → 0.4 of the day; two → 0.7; three or more → full.
    const one = accrueAwayIncome(farmTown("2027-01-14T12:00:00.000Z"), inputs({ presenceCounts: { city: 1 } }));
    expect(one.town.maps.city.buildings[0].accumulated).toBeCloseTo(20 * 0.4, 8);
    const two = accrueAwayIncome(farmTown("2027-01-14T12:00:00.000Z"), inputs({ presenceCounts: { city: 2 } }));
    expect(two.town.maps.city.buildings[0].accumulated).toBeCloseTo(20 * 0.7, 8);
    const three = accrueAwayIncome(farmTown("2027-01-14T12:00:00.000Z"), inputs({ presenceCounts: { city: 3 } }));
    expect(three.town.maps.city.buildings[0].accumulated).toBe(20);
    // prayedCount 0 with no per-map counts → presence 0.
    const zero = accrueAwayIncome(farmTown("2027-01-14T12:00:00.000Z"), inputs({ prayedCount: 0 }));
    expect(zero.town.maps.city.buildings[0].accumulated).toBe(0);
  });

  it("the fast-alive gate: dead days never pay, but their anchors advance", () => {
    const dead = accrueAwayIncome(farmTown("2027-01-12T12:00:00.000Z"), inputs({ fastAlive: false }));
    expect(dead.town.maps.city.buildings[0].accumulated).toBe(0);
    expect(dead.town.maps.city.buildings[0].lastTick).toBe(NOW_ISO);
    const alive = accrueAwayIncome(farmTown("2027-01-12T12:00:00.000Z"), inputs({ fastAlive: true }));
    expect(alive.town.maps.city.buildings[0].accumulated).toBe(25); // 3 days, capped
  });
});

describe("Part B — exit-replay simulation (load → exit → reload)", () => {
  /** One full mount, exactly as the screen runs it: parse the stored
   *  record, accrue, fold the date, ONE write. (v343: there is no
   *  second pricing step — missed days are the accrual's own days.) */
  function mountOnce(stored: string): { committed: string; pending: number } {
    const loaded = parseTown(JSON.parse(stored));
    const accrual = accrueAwayIncome(loaded, inputs());
    const t = { ...accrual.town, lastIncomeDate: TODAY };
    return { committed: JSON.stringify(t), pending: pendingTotal(t) };
  }

  it("exit BEFORE the commit write: the replay lands on the exact same total", () => {
    const stored0 = JSON.stringify(farmTown("2027-01-14T12:00:00.000Z"));
    // Entry 1 runs the whole critical path and commits.
    const first = mountOnce(stored0);
    expect(first.pending).toBe(20); // one day, settled into the pile
    // Entry 2 simulates entry 1 having been killed before its write:
    // storage still holds the pre-accrual record, so the accrual
    // replays — and must produce EXACTLY the single-accrual total,
    // never the total plus a stranded partial accrual.
    const replay = mountOnce(stored0);
    expect(replay.pending).toBe(first.pending);
    expect(replay.committed).toBe(first.committed);
  });

  it("exit AFTER the commit: reload accrues nothing new — the day never settles twice", () => {
    const stored0 = JSON.stringify(farmTown("2027-01-14T12:00:00.000Z"));
    const first = mountOnce(stored0);
    // Reload from the committed record at the same clock: the
    // anchor already stands at today, so the window is empty.
    const loaded = parseTown(JSON.parse(first.committed));
    const again = accrueAwayIncome(loaded, inputs());
    expect(pendingTotal(again.town)).toBe(first.pending);
    expect(again.town.maps.city.buildings[0].lastTick).toBe(NOW_ISO);
  });
});

describe("missed days — settled by the one accrual, never auto-credited (v343)", () => {
  it("whole missed days land in the waiting pile (capped), not in any balance", () => {
    // Three days gone: 3 × 20 priced, 25 held at the L1 cap. The
    // accrual's result has no balance channel at all — the pile is
    // the whole story, and collecting it is a separate, deliberate
    // act (the return report merely names what waits).
    const result = accrueAwayIncome(farmTown("2027-01-12T12:00:00.000Z"), inputs());
    expect(result.town.maps.city.buildings[0].accumulated).toBe(25);
    expect(result).not.toHaveProperty("coins");
    expect(result).not.toHaveProperty("balance");
  });

  it("a fresh town and a same-day town settle nothing", () => {
    const fresh = farmTown(NOW_ISO);
    fresh.lastIncomeDate = null;
    expect(pendingTotal(accrueAwayIncome(fresh, inputs()).town)).toBe(0);
    const sameDay = farmTown("2027-01-15T12:00:00.000Z");
    sameDay.lastIncomeDate = TODAY;
    const out = accrueAwayIncome(sameDay, inputs({ nowMs: Date.parse("2027-01-15T20:00:00.000Z"), nowIso: "2027-01-15T20:00:00.000Z" }));
    expect(pendingTotal(out.town)).toBe(0);
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
    // RE-BASED (v343): the effect's header comment dropped "hourly"
    // with the per-minute engine it named.
    const start = src.indexOf("// Load + settle income on open");
    const end = src.indexOf("// Daily town visit streak", start);
    return src.slice(start, end);
  })();

  it("the accrual is gated on the fast streak being alive (v343)", () => {
    expect(effect).toContain("isFastStreakAlive(fastsArr as PersonalFast[], today)");
    expect(effect).toContain("fastAlive,");
  });

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
    // Church fixture arithmetic (per DAY): the building's own 240
    // scales by the blessing (→ 288); the +160 prayer-coin stream
    // rides alongside UNSCALED (it is not building income).
    expect(base.rates["church-1"].coins).toBeCloseTo(400, 8);
    expect(blessed.rates["church-1"].coins).toBeCloseTo(448, 8);
  });

  it("daily income carries the same blessing factor end to end", () => {
    const town = churchTown();
    const plain = dailyIncomeForTown(town, 1, 1, 1, 8, 1, 1, 1, NOW);
    const blessed = dailyIncomeForTown(town, 1, 1, 1, 8, 1, 1, 1, NOW, 1.2);
    expect(plain).toBeGreaterThan(0);
    expect(blessed).toBeCloseTo(plain * 1.2, 8);
  });
});
