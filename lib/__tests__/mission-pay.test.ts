// v171 — Mission pay rebalance: field missions are pegged to the job
// economy.
//
// THE BUG (Jonathan, 2026-10-22): "The people sent on mission trips
// don't make NEARLY enough money for as long as that took. I did an 8h
// trip and got 400 coins? I give them a job and make that much in an
// hour..."
//
// Pre-v171, a field mission's blessing rolled inside a small hardcoded
// band and was paid RAW at collect — no economy scale, no multiplier,
// ever. The bands were:
//
//   short (1h): 50–100    expected 75    = 75/hour
//   day   (4h): 150–250   expected 200   = 50/hour
//   long  (8h): 300–500   expected 400   = 50/hour
//
// The 8-hour trip's expected payout was EXACTLY the 400 he saw, and the
// per-hour rate FELL with duration. One hour of work, by contrast, pays
// the 1-hour job base (250) through scaledCoins — and a restock hour
// banks 15/box on top (250 + 10 boxes = exactly 400 at scale 1).
//
// The fix: the blessing is a raw anchored to the job economy —
// MISSION_JOB_HOURLY_BASE × hours × length premium (1 / 1.25 / 1.5),
// rolled ±10% at send — and the collect grants scaledCoins(raw) via
// missionCollectRaw, the exact path a map-collected shift takes, with
// the Bloodmoon blessing applied to the delta by the same ledger.
// Missions already out when v171 lands carry no blessingV stamp and pay
// their locked stored coins, untouched.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  MISSION_BLESSING_VERSION,
  MISSION_BLESSING_VARIANCE,
  MISSION_DURATIONS,
  MISSION_JOB_HOURLY_BASE,
  economyScaleForFastLength,
  missionBlessingAnchor,
  missionBlessingRange,
  missionCollectRaw,
  parseMissions,
  rollMissionBlessing,
  scaledCoins,
  setEconomyScale,
  type FieldMission,
  type MissionDurationId,
} from "../hometown";
import { RESTOCK_BOX_BONUS_COINS, WORK_KINDS } from "../villager-work";
import { collectPayoutCoins, missionPayoutCoins } from "../villager-roster";
import { BLOODMOON_COIN_MULT } from "../badges";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

/** The pre-v171 bands, kept as the documented fixture of the bug. */
const PRE_V171_BANDS: Record<MissionDurationId, { min: number; max: number; hours: number }> = {
  short: { min: 50, max: 100, hours: 1 },
  day: { min: 150, max: 250, hours: 4 },
  long: { min: 300, max: 500, hours: 8 },
};

function mission(over: Partial<FieldMission> = {}): FieldMission {
  return {
    id: "m-test",
    personId: "p-1",
    name: "Test Light",
    duration: "long",
    sentAt: "2026-10-22T00:00:00.000Z",
    returnAt: "2026-10-22T08:00:00.000Z",
    coins: 3000,
    xp: 25,
    collected: false,
    ...over,
  };
}

beforeEach(() => {
  setEconomyScale(1);
});

describe("the bug, documented (pre-v171 fixture)", () => {
  it("the old 8h band's expected value is exactly the 400 Jonathan saw", () => {
    const b = PRE_V171_BANDS.long;
    expect((b.min + b.max) / 2).toBe(400);
  });

  it("the old per-hour rate fell as trips got longer", () => {
    const perHour = (Object.keys(PRE_V171_BANDS) as MissionDurationId[]).map((id) => {
      const b = PRE_V171_BANDS[id];
      return (b.min + b.max) / 2 / b.hours;
    });
    expect(perHour).toEqual([75, 50, 50]);
  });

  it("the new 8h band starts far above the old band's ceiling", () => {
    expect(MISSION_DURATIONS.long.coinsMin).toBeGreaterThan(PRE_V171_BANDS.long.max);
  });

  it("one restock hour at scale 1 reproduces his ~400 job hour", () => {
    // 250 base + 10 delivered boxes at 15 each, through the job payout.
    const raw = WORK_KINDS.restock.rewardCoins + 10 * RESTOCK_BOX_BONUS_COINS;
    expect(raw).toBe(400);
    expect(collectPayoutCoins(raw, false)).toBe(400);
  });
});

describe("the anchor is the job economy", () => {
  it("MISSION_JOB_HOURLY_BASE equals every 1-hour work kind's reward", () => {
    const oneHourKinds = Object.values(WORK_KINDS).filter((k) => k.durationMs === 3600000);
    expect(oneHourKinds.length).toBeGreaterThanOrEqual(5);
    for (const k of oneHourKinds) {
      expect(k.rewardCoins).toBe(MISSION_JOB_HOURLY_BASE);
    }
    expect(MISSION_JOB_HOURLY_BASE).toBe(WORK_KINDS["bank-shift"].rewardCoins);
  });

  it("anchors are hourly base x hours x premium", () => {
    expect(missionBlessingAnchor("short")).toBe(250); // 250 x 1 x 1.0
    expect(missionBlessingAnchor("day")).toBe(1250); // 250 x 4 x 1.25
    expect(missionBlessingAnchor("long")).toBe(3000); // 250 x 8 x 1.5
  });

  it("premiums rise with duration: 1 / 1.25 / 1.5", () => {
    expect(MISSION_DURATIONS.short.premium).toBe(1);
    expect(MISSION_DURATIONS.day.premium).toBe(1.25);
    expect(MISSION_DURATIONS.long.premium).toBe(1.5);
  });

  it("the per-hour rate now RISES with duration (monotonic premium)", () => {
    const perHour = (["short", "day", "long"] as MissionDurationId[]).map(
      (id) => missionBlessingAnchor(id) / MISSION_DURATIONS[id].hours
    );
    expect(perHour).toEqual([250, 312.5, 375]);
    expect(perHour[1]).toBeGreaterThan(perHour[0]);
    expect(perHour[2]).toBeGreaterThan(perHour[1]);
  });

  it("ranges are the anchor rolled within the variance band", () => {
    expect(MISSION_BLESSING_VARIANCE).toBe(0.1);
    expect(missionBlessingRange("short")).toEqual({ min: 225, max: 275 });
    expect(missionBlessingRange("day")).toEqual({ min: 1125, max: 1375 });
    expect(missionBlessingRange("long")).toEqual({ min: 2700, max: 3300 });
    for (const id of ["short", "day", "long"] as MissionDurationId[]) {
      expect(MISSION_DURATIONS[id].coinsMin).toBe(missionBlessingRange(id).min);
      expect(MISSION_DURATIONS[id].coinsMax).toBe(missionBlessingRange(id).max);
    }
  });

  it("even the worst 8h roll beats 8 hours of job pay; the anchor is 12 job-hours", () => {
    setEconomyScale(economyScaleForFastLength(365)); // 1.0 — a 365-day fast
    const eightJobHours = 8 * collectPayoutCoins(MISSION_JOB_HOURLY_BASE, false);
    expect(eightJobHours).toBe(2000);
    expect(missionBlessingRange("long").min).toBeGreaterThanOrEqual(eightJobHours);
    expect(missionBlessingAnchor("long")).toBe(12 * MISSION_JOB_HOURLY_BASE);
  });
});

describe("the formula table at Jonathan's progression state (economy scale 1.0)", () => {
  it("expected payouts: 1h = 250, 4h = 1,250, 8h = 3,000 — beside the 1h job's 250", () => {
    const table = (["short", "day", "long"] as MissionDurationId[]).map((id) => {
      const m = mission({ duration: id, coins: missionBlessingAnchor(id), blessingV: MISSION_BLESSING_VERSION });
      return missionPayoutCoins(m, false);
    });
    expect(table).toEqual([250, 1250, 3000]);
    expect(collectPayoutCoins(WORK_KINDS["bank-shift"].rewardCoins, false)).toBe(250);
  });

  it("with the Bloodmoon Badge held, the same table pays x1.1", () => {
    const m = mission({ coins: missionBlessingAnchor("long"), blessingV: MISSION_BLESSING_VERSION });
    expect(missionPayoutCoins(m, true)).toBe(3000 * BLOODMOON_COIN_MULT);
  });
});

describe("rolls stay inside the new bands; XP and verses untouched", () => {
  it("200 seeded rolls per duration all land in range, XP pinned to the def", () => {
    for (const id of ["short", "day", "long"] as MissionDurationId[]) {
      const def = MISSION_DURATIONS[id];
      for (let i = 0; i < 200; i++) {
        const b = rollMissionBlessing(`roll-${id}-${i}`, id);
        expect(b.coins).toBeGreaterThanOrEqual(def.coinsMin);
        expect(b.coins).toBeLessThanOrEqual(def.coinsMax);
        expect(b.xp).toBe(def.xp);
      }
    }
  });

  it("XP and verse chances are the pre-v171 values", () => {
    expect(MISSION_DURATIONS.short.xp).toBe(0);
    expect(MISSION_DURATIONS.day.xp).toBe(10);
    expect(MISSION_DURATIONS.long.xp).toBe(25);
    expect(MISSION_DURATIONS.short.verseChance).toBe(0);
    expect(MISSION_DURATIONS.day.verseChance).toBe(0.15);
    expect(MISSION_DURATIONS.long.verseChance).toBe(0.5);
  });
});

describe("multiplier-stack parity with job collects", () => {
  it("mission grant === job payout for the same raw, across scales and Bloodmoon", () => {
    for (const scale of [0.45, 0.72, 1]) {
      setEconomyScale(scale);
      for (const bloodmoon of [false, true]) {
        for (const raw of [225, 1250, 2700, 3000, 3300]) {
          const m = mission({ coins: raw, blessingV: MISSION_BLESSING_VERSION });
          expect(missionPayoutCoins(m, bloodmoon)).toBe(collectPayoutCoins(raw, bloodmoon));
        }
      }
    }
  });

  it("an economy-scale change moves mission pay by the same % it moves job pay", () => {
    setEconomyScale(1);
    const missionAt1 = missionPayoutCoins(mission({ coins: 3000, blessingV: MISSION_BLESSING_VERSION }), false);
    const jobAt1 = collectPayoutCoins(3000, false);
    setEconomyScale(0.5);
    const missionAtHalf = missionPayoutCoins(mission({ coins: 3000, blessingV: MISSION_BLESSING_VERSION }), false);
    const jobAtHalf = collectPayoutCoins(3000, false);
    expect(missionAt1).toBe(3000);
    expect(missionAtHalf / missionAt1).toBe(jobAtHalf / jobAt1);
    expect(missionAtHalf / missionAt1).toBe(0.5);
  });

  it("missionCollectRaw is scaledCoins for v2, the stored coins for legacy", () => {
    setEconomyScale(0.5);
    expect(missionCollectRaw(mission({ coins: 3000, blessingV: MISSION_BLESSING_VERSION }))).toBe(
      scaledCoins(3000)
    );
    expect(missionCollectRaw(mission({ coins: 3000, blessingV: MISSION_BLESSING_VERSION }))).toBe(1500);
    expect(missionCollectRaw(mission({ coins: 400 }))).toBe(400);
  });
});

describe("in-flight missions: locked at dispatch, no retroactive surprises", () => {
  it("parseMissions round-trips the version stamp and leaves legacy missions unstamped", () => {
    const parsed = parseMissions([
      mission({ id: "legacy-1", coins: 400 }),
      mission({ id: "v2-1", coins: 3000, blessingV: MISSION_BLESSING_VERSION }),
      mission({ id: "odd-1", coins: 100, blessingV: "2" as unknown as number }),
    ]);
    expect(parsed).toHaveLength(3);
    expect(parsed[0].blessingV).toBeUndefined();
    expect(parsed[1].blessingV).toBe(MISSION_BLESSING_VERSION);
    expect(parsed[2].blessingV).toBeUndefined();
  });

  it("a pre-v171 mission still pays its locked 400 even after the update", () => {
    // Sent under the old bands, collected after v171 at a low scale:
    // the stored blessing is the whole promise.
    setEconomyScale(0.45);
    const legacy = mission({ coins: 400 });
    expect(missionCollectRaw(legacy)).toBe(400);
    expect(missionPayoutCoins(legacy, false)).toBe(400);
  });

  it("source pins: send stamps the version, collect grants via missionCollectRaw", () => {
    const screen = read("app/hometown.tsx");
    expect(screen).toContain("blessingV: MISSION_BLESSING_VERSION");
    expect(screen).toContain("addCoins(missionCollectRaw(mission))");
    const field = read("components/mission-field.tsx");
    expect(field).toContain("missionPayoutCoins(collectMission, bloodmoonHeld ?? false)");
  });
});
