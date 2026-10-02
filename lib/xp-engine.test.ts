import { describe, expect, it } from "vitest";
import { applyDailyHeartRegen, applyXPAward, getLevelForXP, getXPLevelBadgeFrame, getXPLevelTitle, getXPProgress, maxHeartsForLevel, normalizeXPState, xpRequiredForLevel } from "./xp-engine";

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
    expect(getXPProgress({ totalXP: 150, level: 2, hearts: 4, lastHeartRegenDate: null })).toMatchObject({ level: 2, currentXP: 50, requiredXP: 200, percentage: 25, nextLevel: 3 });
  });

  it("awards the configured points and reports level-ups", () => {
    const result = applyXPAward({ totalXP: 95, level: 1, hearts: 4, lastHeartRegenDate: null }, "scheduled-prayer");
    expect(result.state).toEqual({ totalXP: 105, level: 2, hearts: 4, lastHeartRegenDate: null });
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

  it("unlocks level badge frames at the requested thresholds", () => {
    expect(getXPLevelBadgeFrame(1)).toBe("plain");
    expect(getXPLevelBadgeFrame(24)).toBe("plain");
    expect(getXPLevelBadgeFrame(25)).toBe("ring");
    expect(getXPLevelBadgeFrame(49)).toBe("ring");
    expect(getXPLevelBadgeFrame(50)).toBe("double-ring");
    expect(getXPLevelBadgeFrame(74)).toBe("double-ring");
    expect(getXPLevelBadgeFrame(75)).toBe("ornate");
    expect(getXPLevelBadgeFrame(99)).toBe("ornate");
    expect(getXPLevelBadgeFrame(100)).toBe("radiant");
    expect(getXPLevelBadgeFrame(150)).toBe("radiant");
  });

  it("grants +1 max heart at levels 25/50/75/100", () => {
    expect(maxHeartsForLevel(1)).toBe(4);
    expect(maxHeartsForLevel(24)).toBe(4);
    expect(maxHeartsForLevel(25)).toBe(5);
    expect(maxHeartsForLevel(50)).toBe(6);
    expect(maxHeartsForLevel(75)).toBe(7);
    expect(maxHeartsForLevel(100)).toBe(8);
  });

  it("backfills hearts for stored states that predate them", () => {
    expect(normalizeXPState({ totalXP: 500 })).toMatchObject({ hearts: 4 });
    expect(normalizeXPState(null)).toMatchObject({ hearts: 4, lastHeartRegenDate: null });
  });

  it("regenerates +1 heart per elapsed day up to the max", () => {
    const base = { totalXP: 0, level: 1, hearts: 1, lastHeartRegenDate: "2026-09-28" };
    expect(applyDailyHeartRegen(base, "2026-09-29").hearts).toBe(2);
    expect(applyDailyHeartRegen(base, "2026-10-05").hearts).toBe(4);
    expect(applyDailyHeartRegen(base, "2026-09-28").hearts).toBe(1);
    expect(applyDailyHeartRegen({ ...base, lastHeartRegenDate: null }, "2026-09-29")).toMatchObject({ hearts: 1, lastHeartRegenDate: "2026-09-29" });
  });

  it("grants the milestone heart immediately on crossing into a milestone level", () => {
    // Level 25 starts at 30000 XP; award from just below it.
    const before = { totalXP: 29990, level: 24, hearts: 4, lastHeartRegenDate: null };
    const result = applyXPAward(before, "fasting-day");
    expect(result.state.level).toBe(25);
    expect(result.state.hearts).toBe(5);
  });
});
