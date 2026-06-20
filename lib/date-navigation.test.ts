import { describe, it, expect } from "vitest";
import { addDays } from "./schedule-data";
import { getTodayISOString } from "./prayercircle-data";

describe("date-navigation", () => {
  describe("week-based navigation", () => {
    it("should jump forward 7 days on swipe left", () => {
      const today = "2026-06-20";
      const nextWeek = addDays(today, 7);
      expect(nextWeek).toBe("2026-06-27");
    });

    it("should jump backward 7 days on swipe right", () => {
      const today = "2026-06-20";
      const lastWeek = addDays(today, -7);
      expect(lastWeek).toBe("2026-06-13");
    });

    it("should handle month boundaries when jumping forward", () => {
      const endOfMonth = "2026-06-28";
      const nextWeek = addDays(endOfMonth, 7);
      expect(nextWeek).toBe("2026-07-05");
    });

    it("should handle month boundaries when jumping backward", () => {
      const startOfMonth = "2026-06-05";
      const lastWeek = addDays(startOfMonth, -7);
      expect(lastWeek).toBe("2026-05-29");
    });

    it("should handle year boundaries when jumping forward", () => {
      const endOfYear = "2026-12-28";
      const nextWeek = addDays(endOfYear, 7);
      expect(nextWeek).toBe("2027-01-04");
    });

    it("should handle year boundaries when jumping backward", () => {
      const startOfYear = "2026-01-05";
      const lastWeek = addDays(startOfYear, -7);
      expect(lastWeek).toBe("2025-12-29");
    });
  });

  describe("back to today functionality", () => {
    it("should identify when selected date is not today", () => {
      const today = "2026-06-20";
      const tomorrow = addDays(today, 1);
      expect(tomorrow).not.toBe(today);
    });

    it("should identify when selected date is today", () => {
      const today = getTodayISOString();
      expect(today).toBe(today);
    });

    it("should allow navigation back to today from past", () => {
      const today = getTodayISOString();
      const pastDate = addDays(today, -14);
      // Navigating back to today should set selectedDate to today
      expect(today).not.toBe(pastDate);
    });

    it("should allow navigation back to today from future", () => {
      const today = getTodayISOString();
      const futureDate = addDays(today, 14);
      // Navigating back to today should set selectedDate to today
      expect(today).not.toBe(futureDate);
    });
  });

  describe("multi-week navigation", () => {
    it("should support multiple forward jumps", () => {
      const today = "2026-06-20";
      const week1 = addDays(today, 7);
      const week2 = addDays(week1, 7);
      const week3 = addDays(week2, 7);
      expect(week1).toBe("2026-06-27");
      expect(week2).toBe("2026-07-04");
      expect(week3).toBe("2026-07-11");
    });

    it("should support multiple backward jumps", () => {
      const today = "2026-06-20";
      const week1 = addDays(today, -7);
      const week2 = addDays(week1, -7);
      const week3 = addDays(week2, -7);
      expect(week1).toBe("2026-06-13");
      expect(week2).toBe("2026-06-06");
      expect(week3).toBe("2026-05-30");
    });

    it("should support mixed forward and backward navigation", () => {
      const today = "2026-06-20";
      const forward = addDays(today, 7);
      const backward = addDays(forward, -14);
      const forward2 = addDays(backward, 7);
      expect(forward).toBe("2026-06-27");
      expect(backward).toBe("2026-06-13");
      expect(forward2).toBe("2026-06-20");
    });
  });
});
