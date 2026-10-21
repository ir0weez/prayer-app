import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory AsyncStorage so the ledger load/save flows through the real
// storage paths (same pattern as forest-energy.test.ts).
const store = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      store.delete(k);
    }),
    clear: vi.fn(async () => {
      store.clear();
    }),
  },
}));

import {
  JOB_COLLECT_FULL_XP_PER_DAY,
  JOB_COLLECT_TAPER_XP,
  JOB_COLLECT_XP_KEY,
  jobCollectBandXP,
  jobCollectDateStr,
  jobCollectXP,
  loadJobCollectLedger,
  nextCollectCount,
  normalizeJobCollectLedger,
  recordCollect,
  saveJobCollectLedger,
  type JobCollectLedger,
} from "../job-collect-xp";
import { WORK_KINDS, type WorkKind } from "../villager-work";

const MIN = 60 * 1000;

// The kind -> band table for every kind that actually exists in
// WORK_KINDS, derived from each kind's durationMs:
//   prune-flowers 15 min -> short (4), deliver-meal 20 min -> short (4),
//   clean-garden 30 min + every 60-min kind -> standard (7).
// No current kind is long (> 60 min), so no kind pays 10 today.
const EXPECTED_BAND_BY_KIND: Record<WorkKind, number> = {
  "clean-garden": 7, // 30 min — standard (lower boundary, inclusive)
  "prune-flowers": 4, // 15 min — short
  "bank-shift": 7, // 60 min — standard (upper boundary, inclusive)
  "restaurant-shift": 7, // 60 min — standard
  "deliver-meal": 4, // 20 min — short
  "work-farm": 7, // 60 min — standard
  "tend-garden": 7, // 60 min — standard
  restock: 7, // 60 min — standard (the 1h route is standard, per spec)
};

// rewardCoins as they stood BEFORE the v160 rebalance. The rebalance
// must not move a single coin value — this snapshot is the pin.
const EXPECTED_COINS_BY_KIND: Record<WorkKind, number> = {
  "clean-garden": 150,
  "prune-flowers": 80,
  "bank-shift": 250,
  "restaurant-shift": 250,
  "deliver-meal": 120,
  "work-farm": 250,
  "tend-garden": 250,
  restock: 250,
};

const ALL_KINDS = Object.keys(WORK_KINDS) as WorkKind[];

// Local-time instants: Oct 21 2026 (today) and Oct 20 (yesterday).
const TODAY = new Date(2026, 9, 21, 12, 0, 0, 0);
const YESTERDAY = new Date(2026, 9, 20, 12, 0, 0, 0);
const TODAY_STR = jobCollectDateStr(TODAY);
const YESTERDAY_STR = jobCollectDateStr(YESTERDAY);

describe("jobCollectBandXP — duration bands", () => {
  it("maps every actual WORK_KIND duration to its band (the kind table)", () => {
    // The table covers exactly the kinds that exist — no more, no fewer.
    expect(Object.keys(EXPECTED_BAND_BY_KIND).sort()).toEqual([...ALL_KINDS].sort());
    for (const kind of ALL_KINDS) {
      expect(jobCollectBandXP(WORK_KINDS[kind].durationMs), kind).toBe(
        EXPECTED_BAND_BY_KIND[kind]
      );
    }
  });

  it("pins the boundary durations in ms terms", () => {
    expect(jobCollectBandXP(29 * MIN + 59 * 1000)).toBe(4); // 29:59 -> short
    expect(jobCollectBandXP(30 * MIN)).toBe(7); // 30:00 -> standard
    expect(jobCollectBandXP(60 * MIN)).toBe(7); // 60:00 -> standard (inclusive)
    expect(jobCollectBandXP(60 * MIN + 1000)).toBe(10); // 60:01 -> long
  });

  it("covers the interior and extremes of each band", () => {
    expect(jobCollectBandXP(0)).toBe(4);
    expect(jobCollectBandXP(15 * MIN)).toBe(4);
    expect(jobCollectBandXP(45 * MIN)).toBe(7);
    expect(jobCollectBandXP(61 * MIN)).toBe(10);
    expect(jobCollectBandXP(24 * 60 * MIN)).toBe(10);
  });
});

describe("WORK_KINDS display truth", () => {
  it("every WORK_KINDS rewardXP equals its duration band", () => {
    for (const kind of ALL_KINDS) {
      const def = WORK_KINDS[kind];
      expect(def.rewardXP, kind).toBe(jobCollectBandXP(def.durationMs));
      expect(def.rewardXP, kind).toBe(EXPECTED_BAND_BY_KIND[kind]);
      // …and equals what a full-band (untapered) collect actually pays.
      expect(def.rewardXP, kind).toBe(jobCollectXP(kind, 0));
    }
  });

  it("rewardCoins are unchanged by the rebalance (before/after snapshot)", () => {
    const coinsNow = Object.fromEntries(
      ALL_KINDS.map((kind) => [kind, WORK_KINDS[kind].rewardCoins])
    );
    expect(coinsNow).toEqual(EXPECTED_COINS_BY_KIND);
  });
});

describe("jobCollectXP — daily taper", () => {
  it("collects 1–10 pay the full band for every kind", () => {
    for (const kind of ALL_KINDS) {
      const band = EXPECTED_BAND_BY_KIND[kind];
      // priorCollectsToday is the count BEFORE this collect: collect #1
      // sees 0, collect #10 sees 9 — both pay the full band.
      for (let prior = 0; prior < JOB_COLLECT_FULL_XP_PER_DAY; prior++) {
        expect(jobCollectXP(kind, prior), `${kind} collect #${prior + 1}`).toBe(band);
      }
    }
  });

  it("from the 11th collect onward every kind pays the 2 XP floor", () => {
    for (const kind of ALL_KINDS) {
      for (const prior of [10, 11, 25, 100]) {
        expect(jobCollectXP(kind, prior), `${kind} prior=${prior}`).toBe(
          JOB_COLLECT_TAPER_XP
        );
        expect(JOB_COLLECT_TAPER_XP).toBe(2);
      }
    }
  });

  it("the floor is never 0 — even for the short band, deep into the taper", () => {
    // prune-flowers is the smallest band (4 XP); tapered it must still
    // pay 2, not 0 and not some fraction of the band.
    expect(jobCollectXP("prune-flowers", 10)).toBe(2);
    expect(jobCollectXP("prune-flowers", 999)).toBe(2);
    for (const kind of ALL_KINDS) {
      for (let prior = 0; prior <= 50; prior++) {
        expect(jobCollectXP(kind, prior)).toBeGreaterThan(0);
      }
    }
  });

  it("sanitizes a garbage prior count instead of breaking the award", () => {
    expect(jobCollectXP("bank-shift", Number.NaN)).toBe(7);
    expect(jobCollectXP("bank-shift", -3)).toBe(7);
    expect(jobCollectXP("bank-shift", 9.9)).toBe(7); // floors to 9 — still full band
    expect(jobCollectXP("bank-shift", 10.5)).toBe(2); // floors to 10 — tapered
  });
});

describe("job-collect ledger — midnight reset is structural", () => {
  it("a stale (yesterday) ledger counts as 0 collects today", () => {
    const stale: JobCollectLedger = { day: YESTERDAY_STR, count: 14 };
    expect(nextCollectCount(stale, TODAY)).toBe(0);
    expect(nextCollectCount(stale, TODAY_STR)).toBe(0);
    expect(normalizeJobCollectLedger(stale, TODAY)).toEqual({ day: TODAY_STR, count: 0 });
    // …so yesterday's taper never leaks into today: first collect pays full band.
    expect(jobCollectXP("bank-shift", nextCollectCount(stale, TODAY))).toBe(7);
  });

  it("a same-day ledger keeps its count", () => {
    const ledger: JobCollectLedger = { day: TODAY_STR, count: 7 };
    expect(nextCollectCount(ledger, TODAY)).toBe(7);
    expect(normalizeJobCollectLedger(ledger, TODAY)).toEqual(ledger);
  });

  it("missing / malformed ledgers count as 0", () => {
    expect(nextCollectCount(null, TODAY)).toBe(0);
    expect(nextCollectCount(undefined, TODAY)).toBe(0);
    expect(normalizeJobCollectLedger(null, TODAY)).toEqual({ day: TODAY_STR, count: 0 });
    expect(normalizeJobCollectLedger("junk", TODAY)).toEqual({ day: TODAY_STR, count: 0 });
    expect(normalizeJobCollectLedger({ day: TODAY_STR, count: "lots" }, TODAY)).toEqual({
      day: TODAY_STR,
      count: 0,
    });
    expect(normalizeJobCollectLedger({ day: TODAY_STR, count: -4 }, TODAY)).toEqual({
      day: TODAY_STR,
      count: 0,
    });
    expect(normalizeJobCollectLedger({ count: 5 }, TODAY)).toEqual({
      day: TODAY_STR,
      count: 0,
    });
  });

  it("recordCollect increments same-day, rolls a stale day to count 1, never mutates", () => {
    const sameDay: JobCollectLedger = { day: TODAY_STR, count: 3 };
    expect(recordCollect(sameDay, TODAY)).toEqual({ day: TODAY_STR, count: 4 });
    expect(sameDay).toEqual({ day: TODAY_STR, count: 3 }); // input untouched

    const stale: JobCollectLedger = { day: YESTERDAY_STR, count: 30 };
    expect(recordCollect(stale, TODAY)).toEqual({ day: TODAY_STR, count: 1 });
    expect(recordCollect(null, TODAY)).toEqual({ day: TODAY_STR, count: 1 });
    // YESTERDAY is only used to prove the day strings really differ.
    expect(YESTERDAY_STR).not.toBe(TODAY_STR);
  });

  it("a simulated Collect All sweep counts each shift individually through the taper", () => {
    // 12 standard-band collects in one day, ledger threaded exactly the
    // way the wiring does it: xp from the pre-collect count, then record.
    let ledger: JobCollectLedger = { day: TODAY_STR, count: 0 };
    const paid: number[] = [];
    for (let i = 0; i < 12; i++) {
      paid.push(jobCollectXP("bank-shift", nextCollectCount(ledger, TODAY)));
      ledger = recordCollect(ledger, TODAY);
    }
    expect(paid).toEqual([7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 2, 2]);
    expect(ledger).toEqual({ day: TODAY_STR, count: 12 });
  });
});

describe("job-collect ledger — storage", () => {
  beforeEach(() => {
    store.clear();
  });

  it("uses the pinned storage key and round-trips save -> load", async () => {
    expect(JOB_COLLECT_XP_KEY).toBe("prayercircle.hometown.job-collects.v1");
    await saveJobCollectLedger({ day: TODAY_STR, count: 5 });
    expect(store.get(JOB_COLLECT_XP_KEY)).toBe(
      JSON.stringify({ day: TODAY_STR, count: 5 })
    );
    await expect(loadJobCollectLedger(TODAY)).resolves.toEqual({
      day: TODAY_STR,
      count: 5,
    });
  });

  it("an empty store loads as a fresh ledger for today", async () => {
    await expect(loadJobCollectLedger(TODAY)).resolves.toEqual({
      day: TODAY_STR,
      count: 0,
    });
  });

  it("a stored stale day loads as count 0 for today (midnight reset on read)", async () => {
    store.set(
      JOB_COLLECT_XP_KEY,
      JSON.stringify({ day: YESTERDAY_STR, count: 42 })
    );
    await expect(loadJobCollectLedger(TODAY)).resolves.toEqual({
      day: TODAY_STR,
      count: 0,
    });
    // …but it still reads back faithfully on its own day.
    await expect(loadJobCollectLedger(YESTERDAY)).resolves.toEqual({
      day: YESTERDAY_STR,
      count: 42,
    });
  });

  it("corrupt stored JSON loads as a fresh ledger instead of throwing", async () => {
    store.set(JOB_COLLECT_XP_KEY, "{not json");
    await expect(loadJobCollectLedger(TODAY)).resolves.toEqual({
      day: TODAY_STR,
      count: 0,
    });
    store.set(JOB_COLLECT_XP_KEY, JSON.stringify({ day: 7, count: null }));
    await expect(loadJobCollectLedger(TODAY)).resolves.toEqual({
      day: TODAY_STR,
      count: 0,
    });
  });
});
