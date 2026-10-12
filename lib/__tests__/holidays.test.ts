import { describe, expect, it } from "vitest";
import { getHolidaysForYear } from "../holidays";

describe("getHolidaysForYear", () => {
  it("computes Thanksgiving 2026 as 2026-11-26 (4th Thursday of November)", () => {
    const thanksgiving = getHolidaysForYear(2026).find((h) => h.name === "Thanksgiving");
    expect(thanksgiving?.date).toBe("2026-11-26");
    expect(thanksgiving?.keyword).toBe("Thanksgiving");
  });

  it("computes Memorial Day 2026 as 2026-05-25 (last Monday of May)", () => {
    const memorial = getHolidaysForYear(2026).find((h) => h.name === "Memorial Day");
    expect(memorial?.date).toBe("2026-05-25");
  });

  it("computes Easter 2026 as 2026-04-05 (Western computus)", () => {
    const easter = getHolidaysForYear(2026).find((h) => h.name === "Easter");
    expect(easter?.date).toBe("2026-04-05");
    expect(easter?.keyword).toBe("Easter");
  });

  it("returns every date in YYYY-MM-DD form", () => {
    for (const h of getHolidaysForYear(2026)) {
      expect(h.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("returns holidays sorted by date and includes all 14", () => {
    const holidays = getHolidaysForYear(2026);
    expect(holidays).toHaveLength(14);
    const dates = holidays.map((h) => h.date);
    expect([...dates].sort()).toEqual(dates);
  });

  it("computes Easter 2027 as 2027-03-28", () => {
    const easter = getHolidaysForYear(2027).find((h) => h.name === "Easter");
    expect(easter?.date).toBe("2027-03-28");
  });
});
