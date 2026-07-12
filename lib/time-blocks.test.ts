import { describe, it, expect } from "vitest";
import {
  calculateAvailableTimeBlocks,
  formatDuration,
  getTimeBlockStats,
  minutesToTime,
  timeToMinutes,
} from "./time-blocks";

describe("Time Block Helpers", () => {
  describe("timeToMinutes", () => {
    it("should convert time string to minutes", () => {
      expect(timeToMinutes("06:00")).toBe(360);
      expect(timeToMinutes("12:30")).toBe(750);
      expect(timeToMinutes("23:59")).toBe(1439);
      expect(timeToMinutes("00:00")).toBe(0);
    });

    it("should handle invalid time formats gracefully", () => {
      expect(timeToMinutes("")).toBe(0);
      expect(timeToMinutes("invalid")).toBe(0);
      expect(timeToMinutes("25:00")).toBe(0);
      expect(timeToMinutes("12:60")).toBe(0);
      expect(timeToMinutes("-1:30")).toBe(0);
    });

    it("should handle times with whitespace", () => {
      expect(timeToMinutes(" 06:00 ")).toBe(360);
      expect(timeToMinutes(" 12:30")).toBe(750);
    });
  });

  describe("minutesToTime", () => {
    it("should convert minutes to time string", () => {
      expect(minutesToTime(360)).toBe("06:00");
      expect(minutesToTime(750)).toBe("12:30");
      expect(minutesToTime(1439)).toBe("23:59");
      expect(minutesToTime(0)).toBe("00:00");
    });
  });

  describe("formatDuration", () => {
    it("should format minutes to readable duration", () => {
      expect(formatDuration(30)).toBe("30m");
      expect(formatDuration(60)).toBe("1h");
      expect(formatDuration(90)).toBe("1h 30m");
      expect(formatDuration(150)).toBe("2h 30m");
      expect(formatDuration(120)).toBe("2h");
    });
  });

  describe("calculateAvailableTimeBlocks", () => {
    it("should return no blocks when schedule is empty", () => {
      const blocks = calculateAvailableTimeBlocks([]);
      expect(blocks.length).toBe(1);
      expect(blocks[0].startTime).toBe("06:00");
      expect(blocks[0].endTime).toBe("23:00");
      expect(blocks[0].durationMinutes).toBe(1020);
    });

    it("should find gap between two events", () => {
      const items = [
        { startTime: "09:00", endTime: "10:00" },
        { startTime: "14:00", endTime: "15:00" },
      ];
      const blocks = calculateAvailableTimeBlocks(items);
      expect(blocks.length).toBe(3);
      expect(blocks[0].startTime).toBe("06:00");
      expect(blocks[0].endTime).toBe("09:00");
      expect(blocks[1].startTime).toBe("10:00");
      expect(blocks[1].endTime).toBe("14:00");
      expect(blocks[2].startTime).toBe("15:00");
      expect(blocks[2].endTime).toBe("23:00");
    });

    it("should handle overlapping events", () => {
      const items = [
        { startTime: "09:00", endTime: "11:00" },
        { startTime: "10:00", endTime: "12:00" },
      ];
      const blocks = calculateAvailableTimeBlocks(items);
      expect(blocks.length).toBe(2);
      expect(blocks[0].startTime).toBe("06:00");
      expect(blocks[0].endTime).toBe("09:00");
      expect(blocks[1].startTime).toBe("12:00");
      expect(blocks[1].endTime).toBe("23:00");
    });

    it("should keep same available time regardless of completion status", () => {
      const items = [
        { startTime: "16:22", endTime: "19:00", isCompleted: true },
        { startTime: "20:00", endTime: "21:00", isCompleted: false },
      ];
      const blocks = calculateAvailableTimeBlocks(items);
      expect(blocks.length).toBe(3);
      expect(blocks[0].startTime).toBe("06:00");
      expect(blocks[0].endTime).toBe("16:22");
      expect(blocks[1].startTime).toBe("19:00");
      expect(blocks[1].endTime).toBe("20:00");
      expect(blocks[1].durationMinutes).toBe(60);
      expect(blocks[2].startTime).toBe("21:00");
      expect(blocks[2].endTime).toBe("23:00");
      expect(blocks[2].durationMinutes).toBe(120);
      const stats = getTimeBlockStats(blocks);
      expect(stats.totalAvailableMinutes).toBe(802);
    });

    it("should handle items without end time", () => {
      const items = [
        { startTime: "09:00" },
      ];
      const blocks = calculateAvailableTimeBlocks(items);
      expect(blocks.length).toBe(2);
      expect(blocks[0].startTime).toBe("06:00");
      expect(blocks[0].endTime).toBe("09:00");
      expect(blocks[1].startTime).toBe("10:00");
      expect(blocks[1].endTime).toBe("23:00");
    });

    it("should handle custom business hours", () => {
      const items = [
        { startTime: "10:00", endTime: "11:00" },
      ];
      const blocks = calculateAvailableTimeBlocks(items, "08:00", "18:00");
      expect(blocks.length).toBe(2);
      expect(blocks[0].startTime).toBe("08:00");
      expect(blocks[0].endTime).toBe("10:00");
      expect(blocks[1].startTime).toBe("11:00");
      expect(blocks[1].endTime).toBe("18:00");
    });

    it("should skip items without start time", () => {
      const items = [
        { endTime: "10:00" },
        { startTime: "14:00", endTime: "15:00" },
      ];
      const blocks = calculateAvailableTimeBlocks(items);
      expect(blocks.length).toBe(2);
      expect(blocks[0].startTime).toBe("06:00");
      expect(blocks[0].endTime).toBe("14:00");
    });

    it("should correctly calculate duration for afternoon event (4:44 PM to 7:00 PM)", () => {
      // Bug report: 4:44 PM to 7:00 PM was showing as 13h instead of 2h 16m
      // 4:44 PM = 16:44 in 24-hour format
      // 7:00 PM = 19:00 in 24-hour format
      // Duration should be 2 hours 16 minutes (136 minutes)
      const items = [
        { startTime: "16:44", endTime: "19:00" },
      ];
      const blocks = calculateAvailableTimeBlocks(items);
      expect(blocks.length).toBe(2);
      expect(blocks[0].startTime).toBe("06:00");
      expect(blocks[0].endTime).toBe("16:44");
      expect(blocks[1].startTime).toBe("19:00");
      expect(blocks[1].endTime).toBe("23:00");
      expect(blocks[1].durationMinutes).toBe(240); // 4 hours
    });

    it("should handle multiple completed and incomplete events", () => {
      const items = [
        { startTime: "09:00", endTime: "10:00", isCompleted: true },
        { startTime: "12:00", endTime: "13:00", isCompleted: false },
        { startTime: "15:00", endTime: "16:00", isCompleted: true },
        { startTime: "18:00", endTime: "19:00", isCompleted: false },
      ];
      const blocks = calculateAvailableTimeBlocks(items);
      expect(blocks.length).toBe(5);
      expect(blocks[0].startTime).toBe("06:00");
      expect(blocks[0].endTime).toBe("09:00");
      expect(blocks[1].startTime).toBe("10:00");
      expect(blocks[1].endTime).toBe("12:00");
      expect(blocks[2].startTime).toBe("13:00");
      expect(blocks[2].endTime).toBe("15:00");
      expect(blocks[3].startTime).toBe("16:00");
      expect(blocks[3].endTime).toBe("18:00");
      expect(blocks[4].startTime).toBe("19:00");
      expect(blocks[4].endTime).toBe("23:00");
      const stats = getTimeBlockStats(blocks);
      expect(stats.totalAvailableMinutes).toBe(780);
    });
  });

  describe("getTimeBlockStats", () => {
    it("should calculate stats for empty blocks", () => {
      const stats = getTimeBlockStats([]);
      expect(stats.blockCount).toBe(0);
      expect(stats.totalAvailableMinutes).toBe(0);
      expect(stats.largestBlockMinutes).toBe(0);
    });

    it("should calculate stats for multiple blocks", () => {
      const blocks = [
        {
          id: "1",
          startTime: "06:00",
          endTime: "09:00",
          durationMinutes: 180,
          label: "3h",
        },
        {
          id: "2",
          startTime: "10:00",
          endTime: "12:00",
          durationMinutes: 120,
          label: "2h",
        },
        {
          id: "3",
          startTime: "15:00",
          endTime: "23:00",
          durationMinutes: 480,
          label: "8h",
        },
      ];
      const stats = getTimeBlockStats(blocks);
      expect(stats.blockCount).toBe(3);
      expect(stats.totalAvailableMinutes).toBe(780);
      expect(stats.largestBlockMinutes).toBe(480);
      expect(stats.smallestBlockMinutes).toBe(120);
      expect(stats.totalAvailableLabel).toBe("13h");
      expect(stats.largestBlockLabel).toBe("8h");
    });
  });
});
