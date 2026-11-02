// v406 — the person page rebuilt to the approved v5 drawing
// (Jonathan, Nov 1: "Better. Make it.").
//
// Pins:
//  - The page's facts are pure derivations over the person's own
//    records (lib/person-page-facts): the birthday countdown, the
//    THIS WEEK dots from the v279 prayed log (+ lastPrayerCompletedDate,
//    per that log's contract), the stamp rhythm (mean gap, only from
//    3+ stamps), and the 14-day check-in standing.
//  - The surfaces derive through the standing helpers — Settings
//    ladder (portrait band), schedulePanelStep (the blue box), the
//    Bible section tone (prayer cards) — never pinned hexes.
//  - The structure he picked: portrait band with the family faces
//    row, the blue box hub, LEAD NEED only from a live urgent item,
//    THIS WEEK / CONNECTION / REACHED STAMPS / ALERTS groups.
//  - NO cadence anywhere (he rejected it on the drawing), and NO
//    emoji anywhere in the page — real icons only (his standing
//    rule, restated Nov 1).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildWeekDots,
  checkInStatus,
  countPrayedThisMonth,
  daysUntilBirthday,
  meanReachedGapDays,
} from "../person-page-facts";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const person = read("app/(tabs)/person.tsx");

// ─── Birthday countdown ─────────────────────────────────────────────

describe("v406 facts — birthday countdown", () => {
  it("counts forward to the next occurrence, wrapping the year", () => {
    // Nov 1 2026 → Dec 21 2026 is 50 days (the drawing's own case).
    expect(daysUntilBirthday("12/21/2013", "2026-11-01")).toBe(50);
    // A birthday already past this year wraps to next year.
    expect(daysUntilBirthday("03/15/1990", "2026-11-01")).toBe(134);
    // Yearless birthdays work the same.
    expect(daysUntilBirthday("12/21", "2026-11-01")).toBe(50);
  });

  it("today is 0; no/invalid birthday is null (the chip hides)", () => {
    expect(daysUntilBirthday("11/01/1990", "2026-11-01")).toBe(0);
    expect(daysUntilBirthday(undefined, "2026-11-01")).toBeNull();
    expect(daysUntilBirthday("not a date", "2026-11-01")).toBeNull();
    expect(daysUntilBirthday("13/40/2000", "2026-11-01")).toBeNull();
  });

  it("a Feb 29 birthday clamps to Feb 28 in a common year", () => {
    expect(daysUntilBirthday("02/29/2000", "2027-02-01")).toBe(27);
  });
});

// ─── THIS WEEK dots + month count ───────────────────────────────────

describe("v406 facts — the week dots read only the prayed log", () => {
  // Sunday Nov 1 2026; the week runs Mon Oct 26 – Sun Nov 1.
  const TODAY = "2026-11-01";

  it("builds Monday-first dots with today ringed (isToday) and log days filled", () => {
    const dots = buildWeekDots(["2026-10-26", "2026-10-28", "2026-11-01"], null, TODAY);
    expect(dots.map((d) => d.iso)).toEqual([
      "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01",
    ]);
    expect(dots.map((d) => d.label)).toEqual(["M", "T", "W", "T", "F", "S", "S"]);
    expect(dots.map((d) => d.filled)).toEqual([true, false, true, false, false, false, true]);
    expect(dots.map((d) => d.isToday)).toEqual([false, false, false, false, false, false, true]);
  });

  it("lastPrayerCompletedDate counts as prayed even before the log has it", () => {
    const dots = buildWeekDots([], "2026-10-30", TODAY);
    expect(dots.find((d) => d.iso === "2026-10-30")?.filled).toBe(true);
    expect(dots.filter((d) => d.filled)).toHaveLength(1);
  });

  it("an empty log fills nothing — the page invents no history", () => {
    expect(buildWeekDots([], null, TODAY).every((d) => !d.filled)).toBe(true);
    expect(buildWeekDots(undefined, undefined, TODAY)).toHaveLength(7);
  });

  it("the month count dedupes the log against lastPrayerCompletedDate", () => {
    expect(countPrayedThisMonth(["2026-11-01", "2026-10-31"], "2026-11-01", TODAY)).toBe(1);
    expect(countPrayedThisMonth(["2026-10-05", "2026-10-06"], null, TODAY)).toBe(0);
  });
});

// ─── CONNECTION facts ───────────────────────────────────────────────

describe("v406 facts — stamp rhythm and the 14-day check-in", () => {
  it("the rhythm is the MEAN gap, and only from three or more stamps", () => {
    expect(meanReachedGapDays(["2026-10-24", "2026-10-19", "2026-10-09"])).toBe(8); // gaps 10, 5 → mean 7.5 → 8
    expect(meanReachedGapDays(["2026-10-24", "2026-10-19"])).toBeNull();
    expect(meanReachedGapDays([])).toBeNull();
  });

  it("check-in is due at last reached + 14 days, overdue reads negative", () => {
    expect(checkInStatus("2026-10-27", "2026-11-01")).toEqual({ dueIso: "2026-11-10", days: 9 });
    expect(checkInStatus("2026-10-01", "2026-11-01")).toEqual({ dueIso: "2026-10-15", days: -17 });
    expect(checkInStatus(null, "2026-11-01")).toBeNull();
    expect(checkInStatus("", "2026-11-01")).toBeNull();
  });
});

// ─── Source pins — the drawing, built ───────────────────────────────

describe("v406 wiring — source pins", () => {
  it("the surfaces derive through the standing helpers, never pinned", () => {
    expect(person).toContain("deriveSettingsMaterial(colors.primary, {");
    expect(person).toContain("schedulePanelStep(colors.primary)");
    expect(person).toContain("deriveBibleMaterial(colors.primary,");
    expect(person).toContain("bibleMat.sections[0]");
  });

  it("the portrait band carries the family faces row, tapped through to the family page", () => {
    expect(person).toContain("in this family");
    expect(person).toContain('accessibilityLabel="Family Group"');
    expect(person).toContain('pathname: "/family"');
    expect(person).toContain("orderedFaces");
  });

  it("the blue box hub packs the action, stats, reached row, reminder, and last-met", () => {
    expect(person).toContain('hasPrayedToday ? "Prayed Today" : "Mark as Prayed"');
    expect(person).toContain("LAST PRAYED");
    expect(person).toContain("LAST REACHED");
    expect(person).toContain("Last reached: {formatIsoDateForDisplay(currentPerson.lastPrayedDate)}");
    // RE-BASED (v412, Nov 2 — button concepts Variant 2, his pick):
    // the hint line is gone; the row carries the inline white
    // Mark reached pill with its reached state instead.
    expect(person).not.toContain("Tap to set today. Long-press to choose a previous date.");
    expect(person).toContain('reachedToday ? "Reached today" : "Mark reached"');
    expect(person).toContain("Last met at {currentPerson.lastMeetingLocation}");
  });

  it("the birthday chip is a real cake icon with the computed countdown", () => {
    expect(person).toContain("daysUntilBirthday(currentPerson.birthday, getTodayISOString())");
    expect(person).toContain('iconName("cake")');
    expect(person).toContain("Birthday in ${birthdayDays}");
  });

  it("LEAD NEED comes only from a live urgent item — never an emergency, never answered", () => {
    expect(person).toContain("LEAD NEED");
    expect(person).toContain("item.isUrgent && !item.isDone && !item.isEmergency");
    expect(person).toContain("{leadItem && (");
  });

  it("the fact groups are present: THIS WEEK, CONNECTION, REACHED STAMPS, ALERTS", () => {
    for (const label of ["THIS WEEK", "CONNECTION", "REACHED STAMPS", "ALERTS", "this month"]) {
      expect(person).toContain(label);
    }
    expect(person).toContain("Reached every ~{meanGapDays} days");
    expect(person).toContain("Check-in overdue by");
    expect(person).toContain("buildWeekDots(currentPerson.prayedDates, currentPerson.lastPrayerCompletedDate, getTodayISOString())");
  });

  it("the answered chip uses the existing done state, counted as answered", () => {
    expect(person).toContain("{doneCount} answered");
  });

  it("NO cadence anywhere — no progress grade, no 'on track'", () => {
    expect(person.toLowerCase()).not.toContain("cadence");
    expect(person).not.toContain("on track");
  });

  it("NO emoji anywhere in the page — icons only (his standing rule)", () => {
    const emoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;
    expect(emoji.test(person)).toBe(false);
    // The two glyphs the drawing carried, as real icons instead:
    expect(person).toContain('iconName("cake")');
    expect(person).toContain('iconName("flash-on")');
    // …including the urgent toggle, which used to be a text glyph:
    expect(person).not.toContain("lightningText, item.isUrgent");
  });
});
