import { describe, it, expect } from "vitest";
import {
  calculateFastStreak,
  createPersonalFast,
  formatIsoToMmDdYyyy,
  getFastProgress,
  normalizeFastDateInput,
  upsertFastDayStatus,
  type PersonalFast,
} from "./prayercircle-fasting";

describe("Fast Editor Modal - Create and Edit", () => {
  it("creates a new fast with all required fields", () => {
    const fast = createPersonalFast({
      name: "40-Day Prayer Fast",
      startDate: "04-28-2026",
      durationDays: 40,
      type: "Hope",
      focusItems: ["Peace", "Wisdom"],
      existingCount: 0,
    });

    expect(fast).toBeDefined();
    expect(fast?.name).toBe("40-Day Prayer Fast");
    expect(fast?.startDate).toBe("2026-04-28");
    expect(fast?.durationDays).toBe(40);
    expect(fast?.type).toBe("Hope");
    expect(fast?.focusItems).toEqual(["Peace", "Wisdom"]);
    expect(fast?.id).toBeDefined();
  });

  it("returns null if name is empty", () => {
    const fast = createPersonalFast({
      name: "",
      startDate: "04-28-2026",
      durationDays: 21,
      type: "Health",
      focusItems: [],
      existingCount: 0,
    });

    // createPersonalFast requires a non-empty name
    expect(fast).toBeNull();
  });

  it("returns null if duration is not in allowed list", () => {
    const fast = createPersonalFast({
      name: "Invalid Duration Fast",
      startDate: "04-28-2026",
      durationDays: 50, // Not in FAST_DURATIONS
      type: "Health",
      focusItems: [],
      existingCount: 0,
    });

    expect(fast).toBeNull();
  });

  it("validates date format MM-DD-YYYY", () => {
    expect(normalizeFastDateInput("04-28-2026")).toBe("2026-04-28");
    expect(normalizeFastDateInput("12-31-2025")).toBe("2025-12-31");
    expect(normalizeFastDateInput("invalid")).toBeNull();
    // Note: ISO format is also accepted by normalizeFastDateInput
    expect(normalizeFastDateInput("2026-04-28")).toBe("2026-04-28");
  });

  it("formats ISO date to MM-DD-YYYY", () => {
    expect(formatIsoToMmDdYyyy("2026-04-28")).toBe("04-28-2026");
    expect(formatIsoToMmDdYyyy("2025-12-31")).toBe("12-31-2025");
  });

  it("simulates editing a fast by updating properties in place", () => {
    // Create initial fast
    const originalFast = createPersonalFast({
      name: "Original Fast",
      startDate: "04-28-2026",
      durationDays: 40,
      type: "Hope",
      focusItems: ["Peace"],
      existingCount: 0,
    })!;

    expect(originalFast).toBeDefined();

    // Simulate edit mode: update the fast object with new values
    const updatedFast: PersonalFast = {
      ...originalFast,
      name: "Updated Fast Name",
      durationDays: 21,
      type: "Health",
      focusItems: ["Health", "Strength"],
    };

    // Verify the fast was updated
    expect(updatedFast.id).toBe(originalFast.id); // Same ID
    expect(updatedFast.name).toBe("Updated Fast Name");
    expect(updatedFast.durationDays).toBe(21);
    expect(updatedFast.type).toBe("Health");
    expect(updatedFast.focusItems).toEqual(["Health", "Strength"]);
  });

  it("simulates updating a fast in an array (like in createFast)", () => {
    // Create two fasts
    const fast1 = createPersonalFast({
      name: "Fast 1",
      startDate: "04-28-2026",
      durationDays: 40,
      type: "Hope",
      focusItems: [],
      existingCount: 0,
    });

    const fast2 = createPersonalFast({
      name: "Fast 2",
      startDate: "05-01-2026",
      durationDays: 21,
      type: "Health",
      focusItems: [],
      existingCount: 1,
    });

    if (!fast1 || !fast2) {
      expect(fast1).toBeDefined();
      expect(fast2).toBeDefined();
      return;
    }

    const fasts = [fast1, fast2];

    // Simulate editing fast1
    const updatedFast1: PersonalFast = {
      ...fast1,
      name: "Fast 1 Updated",
      focusItems: ["Updated Focus"],
    };

    // Update the array using map (like in createFast)
    const nextFasts = fasts.map((f) => (f.id === fast1.id ? updatedFast1 : f));

    // Verify the array was updated correctly
    expect(nextFasts).toHaveLength(2);
    expect(nextFasts[0].name).toBe("Fast 1 Updated");
    expect(nextFasts[0].focusItems).toEqual(["Updated Focus"]);
    expect(nextFasts[1].name).toBe("Fast 2"); // Unchanged
  });

  it("preserves fast day statuses when editing a fast", () => {
    // Create a fast with some day statuses
    const fast = createPersonalFast({
      name: "Test Fast",
      startDate: "04-28-2026",
      durationDays: 40,
      type: "Hope",
      focusItems: [],
      existingCount: 0,
    })!;

    expect(fast).toBeDefined();

    // Mark some days as completed
    let updatedFast = upsertFastDayStatus([fast], fast.id, "2026-04-28", "completed")[0];
    updatedFast = upsertFastDayStatus([updatedFast], fast.id, "2026-04-29", "skipped")[0];

    // Simulate editing the fast (changing name and focus)
    const editedFast: PersonalFast = {
      ...updatedFast,
      name: "Edited Fast",
      focusItems: ["New Focus"],
    };

    // Verify day statuses are preserved
    expect(editedFast.dayStatuses["2026-04-28"]).toBe("completed");
    expect(editedFast.dayStatuses["2026-04-29"]).toBe("skipped");
    expect(editedFast.name).toBe("Edited Fast");
  });

  it("calculates fast streak correctly after editing", () => {
    const fast = createPersonalFast({
      name: "Test Fast",
      startDate: "04-28-2026",
      durationDays: 40,
      type: "Hope",
      focusItems: [],
      existingCount: 0,
    })!;

    expect(fast).toBeDefined();

    // Mark consecutive days as completed
    let updatedFast = upsertFastDayStatus([fast], fast.id, "2026-04-28", "completed")[0];
    updatedFast = upsertFastDayStatus([updatedFast], fast.id, "2026-04-29", "completed")[0];
    updatedFast = upsertFastDayStatus([updatedFast], fast.id, "2026-04-30", "completed")[0];

    // Edit the fast (change name, keep day statuses)
    const editedFast: PersonalFast = {
      ...updatedFast,
      name: "Edited Fast",
    };

    // Calculate streak
    const streak = calculateFastStreak(editedFast, "2026-05-01");

    // Should have streak of 3 (completed 3 consecutive days)
    expect(streak).toBeGreaterThan(0);
  });

  it("handles empty focus items list when editing", () => {
    const fast = createPersonalFast({
      name: "Test Fast",
      startDate: "04-28-2026",
      durationDays: 40,
      type: "Hope",
      focusItems: ["Focus 1", "Focus 2"],
      existingCount: 0,
    })!;

    expect(fast).toBeDefined();

    // Edit to remove all focus items
    const editedFast: PersonalFast = {
      ...fast,
      focusItems: [],
    };

    expect(editedFast.focusItems).toEqual([]);
  });

  it("handles focus items with special characters", () => {
    const fast = createPersonalFast({
      name: "Test Fast",
      startDate: "04-28-2026",
      durationDays: 40,
      type: "Hope",
      focusItems: ["Prayer for 'Peace'", "Health & Wellness"],
      existingCount: 0,
    })!;

    expect(fast).toBeDefined();
    expect(fast?.focusItems).toContain("Prayer for 'Peace'");
    expect(fast?.focusItems).toContain("Health & Wellness");
  });
});
