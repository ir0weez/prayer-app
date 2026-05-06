import { describe, it, expect } from "vitest";
import {
  getTodayFocusItemStatus,
  updateFocusItemStatus,
  resetFocusItemsForNewDay,
  type FocusItemDailyStatus,
} from "./prayercircle-fasting";

describe("Focus Item Daily Tracking", () => {
  describe("getTodayFocusItemStatus", () => {
    it("returns pending when no statuses exist", () => {
      const status = getTodayFocusItemStatus(undefined, "Peace", "2026-05-05");
      expect(status).toBe("pending");
    });

    it("returns pending when focus item has no statuses", () => {
      const statuses = { "Health": [] };
      const status = getTodayFocusItemStatus(statuses, "Peace", "2026-05-05");
      expect(status).toBe("pending");
    });

    it("returns pending when today has no status entry", () => {
      const statuses = {
        "Peace": [
          { date: "2026-05-04", status: "completed" as const },
        ],
      };
      const status = getTodayFocusItemStatus(statuses, "Peace", "2026-05-05");
      expect(status).toBe("pending");
    });

    it("returns completed when today is marked completed", () => {
      const statuses = {
        "Peace": [
          { date: "2026-05-05", status: "completed" as const },
        ],
      };
      const status = getTodayFocusItemStatus(statuses, "Peace", "2026-05-05");
      expect(status).toBe("completed");
    });

    it("returns missed when today is marked missed", () => {
      const statuses = {
        "Peace": [
          { date: "2026-05-05", status: "missed" as const },
        ],
      };
      const status = getTodayFocusItemStatus(statuses, "Peace", "2026-05-05");
      expect(status).toBe("missed");
    });

    it("returns most recent status when multiple entries exist", () => {
      const statuses = {
        "Peace": [
          { date: "2026-05-03", status: "completed" as const },
          { date: "2026-05-04", status: "missed" as const },
          { date: "2026-05-05", status: "completed" as const },
        ],
      };
      const status = getTodayFocusItemStatus(statuses, "Peace", "2026-05-05");
      expect(status).toBe("completed");
    });
  });

  describe("updateFocusItemStatus", () => {
    it("creates new entry when statuses is undefined", () => {
      const result = updateFocusItemStatus(undefined, "Peace", "2026-05-05", "completed");
      expect(result).toEqual({
        "Peace": [{ date: "2026-05-05", status: "completed" }],
      });
    });

    it("creates new focus item entry when it doesn't exist", () => {
      const statuses = { "Health": [] };
      const result = updateFocusItemStatus(statuses, "Peace", "2026-05-05", "completed");
      expect(result["Peace"]).toEqual([{ date: "2026-05-05", status: "completed" }]);
      expect(result["Health"]).toEqual([]);
    });

    it("adds new date entry to existing focus item", () => {
      const statuses = {
        "Peace": [{ date: "2026-05-04", status: "completed" as const }],
      };
      const result = updateFocusItemStatus(statuses, "Peace", "2026-05-05", "missed");
      expect(result["Peace"]).toHaveLength(2);
      expect(result["Peace"][1]).toEqual({ date: "2026-05-05", status: "missed" });
    });

    it("replaces existing date entry", () => {
      const statuses = {
        "Peace": [{ date: "2026-05-05", status: "completed" as const }],
      };
      const result = updateFocusItemStatus(statuses, "Peace", "2026-05-05", "missed");
      expect(result["Peace"]).toHaveLength(1);
      expect(result["Peace"][0]).toEqual({ date: "2026-05-05", status: "missed" });
    });

    it("preserves other focus items", () => {
      const statuses = {
        "Peace": [{ date: "2026-05-05", status: "completed" as const }],
        "Health": [{ date: "2026-05-05", status: "missed" as const }],
      };
      const result = updateFocusItemStatus(statuses, "Peace", "2026-05-06", "pending");
      expect(result["Peace"]).toHaveLength(2);
      expect(result["Health"]).toHaveLength(1);
      expect(result["Health"][0].status).toBe("missed");
    });

    it("handles multiple status changes for same focus item on same day", () => {
      let statuses = undefined;
      statuses = updateFocusItemStatus(statuses, "Peace", "2026-05-05", "completed");
      statuses = updateFocusItemStatus(statuses, "Peace", "2026-05-05", "missed");
      expect(statuses["Peace"]).toHaveLength(1);
      expect(statuses["Peace"][0].status).toBe("missed");
    });

    it("maintains chronological order of entries", () => {
      let statuses = undefined;
      statuses = updateFocusItemStatus(statuses, "Peace", "2026-05-05", "completed");
      statuses = updateFocusItemStatus(statuses, "Peace", "2026-05-03", "completed");
      statuses = updateFocusItemStatus(statuses, "Peace", "2026-05-04", "missed");
      expect(statuses["Peace"]).toHaveLength(3);
      expect(statuses["Peace"].map((s) => s.date)).toEqual(["2026-05-05", "2026-05-03", "2026-05-04"]);
    });
  });

  describe("resetFocusItemsForNewDay", () => {
    it("returns empty object when statuses is undefined", () => {
      const result = resetFocusItemsForNewDay(undefined, "2026-05-06");
      expect(result).toEqual({});
    });

    it("preserves statuses if they exist for today", () => {
      const statuses = {
        "Peace": [{ date: "2026-05-06", status: "completed" as const }],
      };
      const result = resetFocusItemsForNewDay(statuses, "2026-05-06");
      expect(result).toEqual(statuses);
    });

    it("returns empty object to reset all statuses", () => {
      const statuses = {
        "Peace": [{ date: "2026-05-05", status: "completed" as const }],
        "Health": [{ date: "2026-05-05", status: "missed" as const }],
      };
      const result = resetFocusItemsForNewDay(statuses, "2026-05-06");
      expect(result).toEqual({});
    });

    it("clears all historical data for fresh start", () => {
      const statuses = {
        "Peace": [
          { date: "2026-05-03", status: "completed" as const },
          { date: "2026-05-04", status: "completed" as const },
          { date: "2026-05-05", status: "completed" as const },
        ],
        "Health": [
          { date: "2026-05-05", status: "missed" as const },
        ],
      };
      const result = resetFocusItemsForNewDay(statuses, "2026-05-06");
      expect(result).toEqual({});
    });
  });

  describe("Focus Item Workflow", () => {
    it("simulates a full day workflow: pending -> completed", () => {
      let statuses = undefined;

      // Start of day: focus item is pending (no entry)
      let status = getTodayFocusItemStatus(statuses, "Peace", "2026-05-05");
      expect(status).toBe("pending");

      // User taps to complete
      statuses = updateFocusItemStatus(statuses, "Peace", "2026-05-05", "completed");
      status = getTodayFocusItemStatus(statuses, "Peace", "2026-05-05");
      expect(status).toBe("completed");

      // Next day: reset
      statuses = resetFocusItemsForNewDay(statuses, "2026-05-06");
      status = getTodayFocusItemStatus(statuses, "Peace", "2026-05-06");
      expect(status).toBe("pending");
    });

    it("simulates a full day workflow: pending -> missed", () => {
      let statuses = undefined;

      // Start of day: focus item is pending
      let status = getTodayFocusItemStatus(statuses, "Peace", "2026-05-05");
      expect(status).toBe("pending");

      // User long-presses to mark missed
      statuses = updateFocusItemStatus(statuses, "Peace", "2026-05-05", "missed");
      status = getTodayFocusItemStatus(statuses, "Peace", "2026-05-05");
      expect(status).toBe("missed");

      // Next day: reset
      statuses = resetFocusItemsForNewDay(statuses, "2026-05-06");
      status = getTodayFocusItemStatus(statuses, "Peace", "2026-05-06");
      expect(status).toBe("pending");
    });

    it("tracks multiple focus items independently", () => {
      let statuses = undefined;

      // User completes Peace
      statuses = updateFocusItemStatus(statuses, "Peace", "2026-05-05", "completed");
      // User misses Health
      statuses = updateFocusItemStatus(statuses, "Health", "2026-05-05", "missed");
      // Wisdom remains pending

      expect(getTodayFocusItemStatus(statuses, "Peace", "2026-05-05")).toBe("completed");
      expect(getTodayFocusItemStatus(statuses, "Health", "2026-05-05")).toBe("missed");
      expect(getTodayFocusItemStatus(statuses, "Wisdom", "2026-05-05")).toBe("pending");
    });

    it("preserves history across multiple days", () => {
      let statuses = undefined;

      // Day 1: Complete Peace
      statuses = updateFocusItemStatus(statuses, "Peace", "2026-05-05", "completed");
      expect(getTodayFocusItemStatus(statuses, "Peace", "2026-05-05")).toBe("completed");

      // Day 2: Miss Peace
      statuses = updateFocusItemStatus(statuses, "Peace", "2026-05-06", "missed");
      expect(getTodayFocusItemStatus(statuses, "Peace", "2026-05-06")).toBe("missed");
      expect(getTodayFocusItemStatus(statuses, "Peace", "2026-05-05")).toBe("completed");

      // Day 3: Complete Peace
      statuses = updateFocusItemStatus(statuses, "Peace", "2026-05-07", "completed");
      expect(getTodayFocusItemStatus(statuses, "Peace", "2026-05-07")).toBe("completed");
      expect(getTodayFocusItemStatus(statuses, "Peace", "2026-05-06")).toBe("missed");
      expect(getTodayFocusItemStatus(statuses, "Peace", "2026-05-05")).toBe("completed");
    });
  });
});
