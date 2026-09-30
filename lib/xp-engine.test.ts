import { describe, expect, it } from "vitest";
import { applyXPAward, getLevelForXP, getXPProgress, xpRequiredForLevel } from "./xp-engine";

describe("XP engine", () => {
  it("uses cumulative level thresholds", () => {
    expect(xpRequiredForLevel(1)).toBe(0);
    expect(xpRequiredForLevel(2)).toBe(100);
    expect(xpRequiredForLevel(3)).toBe(300);
    expect(getLevelForXP(99)).toBe(1);
    expect(getLevelForXP(100)).toBe(2);
    expect(getLevelForXP(299)).toBe(2);
    expect(getLevelForXP(300)).toBe(3);
  });

  it("calculates progress within the current level", () => {
    expect(getXPProgress({ totalXP: 150, level: 2 })).toMatchObject({ level: 2, currentXP: 50, requiredXP: 200, percentage: 25, nextLevel: 3 });
  });

  it("awards the configured points and reports level-ups", () => {
    const result = applyXPAward({ totalXP: 95, level: 1 }, "scheduled-prayer");
    expect(result.state).toEqual({ totalXP: 105, level: 2 });
    expect(result.points).toBe(10);
    expect(result.levelUp).toBe(true);
  });
});
