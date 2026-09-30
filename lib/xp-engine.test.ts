import { describe, expect, it } from "vitest";
import { applyXPAward, getLevelForXP, getXPLevelTitle, getXPProgress, xpRequiredForLevel } from "./xp-engine";

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

  it("maps levels to titles and uses Faithful beyond level 10", () => {
    expect(getXPLevelTitle(1)).toBe("Seeker");
    expect(getXPLevelTitle(2)).toBe("Listener");
    expect(getXPLevelTitle(3)).toBe("Servant");
    expect(getXPLevelTitle(4)).toBe("Laborer");
    expect(getXPLevelTitle(5)).toBe("Watchman");
    expect(getXPLevelTitle(6)).toBe("Steward");
    expect(getXPLevelTitle(7)).toBe("Soldier");
    expect(getXPLevelTitle(8)).toBe("Intercessor");
    expect(getXPLevelTitle(9)).toBe("Overcomer");
    expect(getXPLevelTitle(10)).toBe("Faithful");
    expect(getXPLevelTitle(11)).toBe("Faithful");
  });
});
