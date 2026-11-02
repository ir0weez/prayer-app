/**
 * v414 — the Year in Review (Jonathan, Nov 2: it lives on the Fast
 * page under Recaps, as its own box, and does not exist anywhere
 * before December 31). Pins:
 *  - THE GATE with injected dates: Dec 30 of the fast's year →
 *    absent; Dec 31 → present; later → still present (a record,
 *    not a notification). The gate year is the year the fast ENDS.
 *  - the day-by-day grid's states from a fixture fast log: held /
 *    close call / fell from dayStatuses, today ringed, future
 *    pale, a past day with no status unmarked;
 *  - the stats, the longest held run, the hardest week (the
 *    Recaps' Sun–Sat weeks), and the answered count, all derived
 *    from the fixture;
 *  - highs and lows composed ONLY from what the data supports —
 *    and the lows' tone: the fell days are written down, not
 *    hidden.
 */
import { describe, expect, it } from "vitest";

import {
  answeredCountForFast,
  hardestWeekOf,
  isYearReviewVisible,
  longestHeldRun,
  yearFastStats,
  yearGridFor,
  yearHighs,
  yearLows,
  yearReviewGateDate,
  yearReviewYear,
} from "../year-review";
import type { PersonalFast } from "../prayercircle-fasting";
import type { PrayerJournalEntry } from "../prayer-journal";

function makeFast(overrides: Partial<PersonalFast>): PersonalFast {
  return {
    id: "f1",
    name: "365-Day Growth Fast",
    startDate: "2026-01-01",
    durationDays: 365,
    type: "Growth",
    focusItems: [],
    dayStatuses: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeEntry(overrides: Partial<PrayerJournalEntry>): PrayerJournalEntry {
  return {
    id: "j1",
    body: "",
    date: "2026-05-01",
    taggedPeople: [],
    isBookmarked: false,
    replies: [],
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("v414 year review — the Dec 31 gate", () => {
  const fast = makeFast({});

  it("the gate date is Dec 31 of the year the fast ends", () => {
    expect(yearReviewGateDate(fast)).toBe("2026-12-31");
    expect(yearReviewYear(fast)).toBe(2026);
  });

  it("Dec 30 → absent; Dec 31 → present; after → still present", () => {
    expect(isYearReviewVisible(fast, "2026-12-30")).toBe(false);
    expect(isYearReviewVisible(fast, "2026-11-02")).toBe(false);
    expect(isYearReviewVisible(fast, "2026-12-31")).toBe(true);
    expect(isYearReviewVisible(fast, "2027-01-15")).toBe(true);
  });

  it("a fast ending in another year gates on that year", () => {
    const short = makeFast({ startDate: "2026-06-01", durationDays: 30 });
    expect(yearReviewGateDate(short)).toBe("2026-12-31");
    expect(isYearReviewVisible(short, "2026-12-30")).toBe(false);
    expect(isYearReviewVisible(short, "2026-12-31")).toBe(true);
  });
});

describe("v414 year review — the grid and the stats", () => {
  const fast = makeFast({
    dayStatuses: {
      "2026-01-01": "completed",
      "2026-01-02": "skipped",
      "2026-01-03": "missed",
    },
  });
  const today = "2026-11-02";

  it("the grid carries every fast day, grouped JAN to DEC, states 1:1 from the log", () => {
    const grid = yearGridFor(fast, today);
    expect(grid.map((m) => m.label)).toEqual([
      "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
      "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
    ]);
    const all = grid.flatMap((m) => m.days);
    expect(all).toHaveLength(365);
    const stateOf = (date: string) => all.find((d) => d.date === date)?.state;
    expect(stateOf("2026-01-01")).toBe("held");
    expect(stateOf("2026-01-02")).toBe("close");
    expect(stateOf("2026-01-03")).toBe("fell");
    expect(stateOf("2026-11-02")).toBe("today");
    expect(stateOf("2026-12-25")).toBe("future");
    expect(stateOf("2026-06-15")).toBe("unmarked");
    expect(all.find((d) => d.date === "2026-11-02")?.dayNumber).toBe(306);
  });

  it("the stats count elapsed, remaining, and the log's own tallies", () => {
    const stats = yearFastStats(fast, today);
    expect(stats.total).toBe(365);
    expect(stats.elapsed).toBe(306);
    expect(stats.remaining).toBe(59);
    expect(stats.completed).toBe(1);
    expect(stats.skipped).toBe(1);
    expect(stats.missed).toBe(1);
    expect(stats.logged).toBe(3);
  });
});

describe("v414 year review — runs, weeks, answered", () => {
  it("the longest held run counts back-to-back completed days", () => {
    const fast = makeFast({
      dayStatuses: {
        "2026-03-01": "completed",
        "2026-03-02": "completed",
        "2026-03-03": "completed",
        "2026-03-04": "completed",
        "2026-03-05": "completed",
        "2026-03-06": "skipped",
        "2026-04-01": "completed",
        "2026-04-02": "completed",
        "2026-04-03": "completed",
      },
    });
    expect(longestHeldRun(fast)).toBe(5);
  });

  it("the hardest week is the Sun–Sat week with the most fell days", () => {
    const fast = makeFast({
      dayStatuses: {
        "2026-11-02": "missed",
        "2026-11-04": "missed",
        "2026-10-05": "missed",
      },
    });
    const hardest = hardestWeekOf(fast, "2026-12-31");
    expect(hardest).not.toBeNull();
    expect(hardest?.missed).toBe(2);
    expect(hardest?.startDate).toBe("2026-11-01");
    expect(hardest?.endDate).toBe("2026-11-07");
    expect(hardestWeekOf(makeFast({}), "2026-12-31")).toBeNull();
  });

  it("answered prayers count only inside the fast's own span", () => {
    const fast = makeFast({});
    const entries = [
      makeEntry({ id: "a", kind: "answered", date: "2026-05-01" }),
      makeEntry({ id: "b", kind: "answered", date: "2025-12-31" }),
      makeEntry({ id: "c", kind: "answered", date: "2027-01-02" }),
      makeEntry({ id: "d", kind: "prayer", date: "2026-05-02" }),
      makeEntry({ id: "e", date: "2026-05-03" }),
    ];
    expect(answeredCountForFast(entries, fast)).toBe(1);
  });
});

describe("v414 year review — highs and lows from what the data supports", () => {
  it("highs compose volume, written books, the run, and answered — nothing else", () => {
    const rows = yearHighs({
      volumeOneFinished: true,
      writtenBooks: ["Colossians", "Ecclesiastes", "Ruth", "Jonah"],
      longestHeldRun: 40,
      answeredCount: 3,
    });
    expect(rows.map((r) => r.title)).toEqual([
      "Volume 1 of the commentary finished",
      "Colossians written, complete",
      "Ecclesiastes written, complete",
      "Ruth written, complete",
      "Your longest held run",
      "Answered prayers, kept",
    ]);
    expect(rows[rows.length - 1].icon).toBe("check");
    expect(rows[0].icon).toBe("star");
  });

  it("highs are empty when the data supports none of them", () => {
    expect(
      yearHighs({ volumeOneFinished: false, writtenBooks: [], longestHeldRun: 1, answeredCount: 0 }),
    ).toEqual([]);
  });

  it("lows name the fell days plainly and the hardest week by its dates", () => {
    const rows = yearLows({
      missed: 4,
      skipped: 2,
      hardestWeek: { startDate: "2026-10-25", endDate: "2026-10-31", missed: 3 },
      hardestWeekLabel: "Oct 25 – 31",
    });
    expect(rows[0].title).toBe("The fell days are written down, not hidden");
    expect(rows[0].sub).toContain("4 fell days");
    expect(rows[1].sub).toContain("Oct 25 – 31");
    expect(rows.every((r) => r.icon === "chart")).toBe(true);
  });

  it("a year with no fell days says so, kindly", () => {
    const rows = yearLows({ missed: 0, skipped: 2, hardestWeek: null, hardestWeekLabel: "" });
    expect(rows.map((r) => r.title)).toEqual(["No fell days this year"]);
    expect(yearLows({ missed: 0, skipped: 0, hardestWeek: null, hardestWeekLabel: "" })).toEqual([]);
  });
});
