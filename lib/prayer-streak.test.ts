import { describe, expect, it } from "vitest";
import { advancePrayerStreak, getPreviousDate, normalizePrayerStreakRecord } from "./prayer-streak";

describe("prayer streak helpers", () => {
  it("normalizes a streak from yesterday or today", () => {
    expect(normalizePrayerStreakRecord({ streak: 79, lastCompletedDate: "2026-09-17" }, "2026-09-18")).toEqual({
      streak: 79,
      lastCompletedDate: "2026-09-17",
    });
    expect(normalizePrayerStreakRecord({ streak: 79, lastCompletedDate: "2026-09-18" }, "2026-09-18")).toEqual({
      streak: 79,
      lastCompletedDate: "2026-09-18",
    });
  });

  it("expires a stale streak instead of leaving it frozen", () => {
    expect(normalizePrayerStreakRecord({ streak: 79, lastCompletedDate: "2026-09-01" }, "2026-09-18")).toEqual({
      streak: 0,
      lastCompletedDate: null,
    });
  });

  it("advances only across consecutive completion dates", () => {
    expect(getPreviousDate("2026-09-18")).toBe("2026-09-17");
    expect(advancePrayerStreak({ streak: 79, lastCompletedDate: "2026-09-17" }, "2026-09-18")).toEqual({
      streak: 80,
      lastCompletedDate: "2026-09-18",
    });
    expect(advancePrayerStreak({ streak: 79, lastCompletedDate: "2026-09-15" }, "2026-09-18")).toEqual({
      streak: 1,
      lastCompletedDate: "2026-09-18",
    });
  });
});
