import { describe, it, expect } from "vitest";
import type { TimeBlock } from "../lib/time-blocks";
import { calculateAvailableTimeBlocks, timeToMinutes } from "../lib/time-blocks";

describe("Available Hours Calculation", () => {
  it("should calculate available time correctly with scheduled items", () => {
    // 12:00-13:00 Lunch, 14:00-20:00 Free, 20:00-21:00 Dinner, 21:00-22:00 Free
    const items = [
      { startTime: "12:00", endTime: "13:00" },
      { startTime: "20:00", endTime: "21:00" },
    ];

    const blocks = calculateAvailableTimeBlocks(items, "06:00", "23:00");
    
    // Should have gaps: 06:00-12:00 (6h), 13:00-20:00 (7h), 21:00-23:00 (2h)
    expect(blocks.length).toBe(3);
    expect(blocks[0].startTime).toBe("06:00");
    expect(blocks[0].endTime).toBe("12:00");
    expect(blocks[0].durationMinutes).toBe(360); // 6 hours
    
    expect(blocks[1].startTime).toBe("13:00");
    expect(blocks[1].endTime).toBe("20:00");
    expect(blocks[1].durationMinutes).toBe(420); // 7 hours
    
    expect(blocks[2].startTime).toBe("21:00");
    expect(blocks[2].endTime).toBe("23:00");
    expect(blocks[2].durationMinutes).toBe(120); // 2 hours
  });

  it("should exclude completed items from available time calculation", () => {
    const items = [
      { startTime: "12:00", endTime: "13:00", isCompleted: false },
      { startTime: "14:00", endTime: "15:00", isCompleted: true }, // Should be ignored
    ];

    const blocks = calculateAvailableTimeBlocks(items, "06:00", "23:00");
    
    // Completed items are filtered out, so only 12:00-13:00 is scheduled
    // Available: 06:00-12:00, 13:00-23:00
    expect(blocks.length).toBe(2);
    expect(blocks[0].startTime).toBe("06:00");
    expect(blocks[0].endTime).toBe("12:00");
    expect(blocks[1].startTime).toBe("13:00");
    expect(blocks[1].endTime).toBe("23:00");
  });

  it("should calculate remaining hours for today from current time", () => {
    // If current time is 11:13 AM (673 minutes)
    // Available blocks: 06:00-12:00 (360m), 13:00-20:00 (420m), 21:00-23:00 (120m)
    // From 11:13 onwards: 47m from first block + 420m + 120m = 587m ≈ 10 hours
    
    const currentTimeMinutes = 11 * 60 + 13; // 11:13 AM
    const blocks = [
      { startTime: "06:00", endTime: "12:00", durationMinutes: 360 },
      { startTime: "13:00", endTime: "20:00", durationMinutes: 420 },
      { startTime: "21:00", endTime: "23:00", durationMinutes: 120 },
    ];

    let totalMinutes = 0;
    blocks.forEach(block => {
      const startMinutes = timeToMinutes(block.startTime);
      const endMinutes = timeToMinutes(block.endTime);
      
      if (endMinutes > currentTimeMinutes) {
        const blockStart = Math.max(startMinutes, currentTimeMinutes);
        totalMinutes += Math.max(0, endMinutes - blockStart);
      }
    });

    const availableHours = Math.ceil(totalMinutes / 60);
    expect(availableHours).toBe(10); // Should be 10 hours, not 14
  });

  it("should count full duration for future dates", () => {
    const blocks = [
      { startTime: "06:00", endTime: "12:00", durationMinutes: 360 },
      { startTime: "13:00", endTime: "20:00", durationMinutes: 420 },
      { startTime: "21:00", endTime: "23:00", durationMinutes: 120 },
    ];

    // For future dates, count all blocks
    let totalMinutes = 0;
    blocks.forEach(block => {
      totalMinutes += block.durationMinutes;
    });

    const availableHours = Math.ceil(totalMinutes / 60);
    expect(availableHours).toBe(15); // 360 + 420 + 120 = 900 minutes = 15 hours
  });
});
