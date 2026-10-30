// ─── v366 — the selectors unfurl ────────────────────────────────────────────
// Jonathan, Oct 30, on the old wheel sheet: "They are so difficult
// to use and they don't really feel material either... I'd want it
// directly in the screen, unfurling from the time or date box."
// The approved drawing (selector-unfurl-v5, dial from v4) replaces
// the shared DateTimePicker's bottom sheet and drum wheels with an
// in-place unfurl: a Material calendar (headline band, month grid,
// today ringed, chosen day filled) and the Material clock dial
// (tap/drag to the hour, the face flips to minutes; typed entry
// behind the pencil/keyboard). These pins hold the shape: no sheet
// or wheel remnants reachable from the component, the unfurl on the
// family's own clock, tones derived from the seed × appearance
// (never the drawing's pinned hexes), the picker opening on the
// value, and the dial/calendar maths exact.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  calendarCells,
  dialAngleForHour12,
  dialAngleForMinute,
  dialPointAngle,
  formatDateValue,
  formatTimeValue,
  hour12FromAngle,
  minuteFromAngle,
  parseDateValue,
  parseTimeValue,
} from "../picker-maths";

const picker = readFileSync(
  join(__dirname, "..", "..", "components", "date-time-picker.tsx"),
  "utf8"
);

describe("v366 — the sheet and the wheels are gone", () => {
  it("no modal, no slide-up sheet, no wheel columns remain", () => {
    expect(picker).not.toContain("<Modal");
    expect(picker).not.toContain("animationType");
    expect(picker).not.toContain("modalOverlay");
    expect(picker).not.toContain("ScrollView");
    expect(picker).not.toContain("pickerItem");
    expect(picker).not.toContain(">Done</Text>");
  });

  it("the year drum that opened at 1900 is gone", () => {
    expect(picker).not.toContain("1900 + i");
    expect(picker).not.toContain("currentYear + 10");
  });

  // SUPERSEDED IN v377 (Oct 30, dated note): this pin held the
  // animated unfurl — 300ms, Material easing, JS-driven — through
  // v366's definite-height window and v374's maxHeight-cap swap.
  // Both windows failed on Jonathan's phone (recordings Oct 30
  // 14:24 and 16:46: the field paints its open tint, no panel
  // ever appears). v377 retires the motion on this path per the
  // v282/v367 ruling: the panel is a plain View, mounted in one
  // frame when the phase is open. The pin below now holds the
  // retirement; the calendar/dial anatomy the unfurl carried is
  // pinned by the rest of this file, unchanged.
  it("v377: the animated unfurl is retired — the panel is a plain conditional render", () => {
    expect(picker).not.toContain("PICKER_UNFURL_DURATION_MS");
    expect(picker).not.toContain("RnEasing");
    expect(picker).not.toContain("useNativeDriver");
    expect(picker).not.toContain("PickerUnfurlWindow");
    expect(picker).toContain("{isOpen && (");
    expect(picker).toContain("<View style={panelFrameStyle}>");
  });

  it("OK commits and Cancel discards — the staged-draft contract", () => {
    expect(picker).toContain("Cancel</Text>");
    expect(picker).toContain("OK</Text>");
    expect(picker).toContain("onChange(draftRef.current)");
  });
});

describe("v366 — derived, never pinned", () => {
  it("tones come from the seed × appearance derivation the creator pages use", () => {
    expect(picker).toContain("scheduleMaterialTones(colors.primary, colors.surface)");
    expect(picker).toContain("schedulePaperSurface(colors.primary, colors.surface)");
  });

  it("none of the drawing's instance hexes are pinned in the component", () => {
    for (const hex of ["#EF4444", "#FBDCD4", "#C22E22", "#F3ECE8", "#FDEEE9", "#332019"]) {
      expect(picker).not.toContain(hex);
    }
  });
});

describe("v366 — the picker opens on the value", () => {
  it("opening stages the draft from the value and seats the calendar on its month", () => {
    expect(picker).toContain("const parsed = mode === \"date\" ? parseDateValue(value) : null");
    expect(picker).toContain("setViewYear(parsed?.year ?? now.getFullYear())");
    expect(picker).toContain("setViewMonth(parsed?.month ?? now.getMonth())");
  });

  it("the dial is driven by touch angle (PanResponder), not a wheel", () => {
    expect(picker).toContain("PanResponder.create");
    expect(picker).toContain("dialPointAngle");
    expect(picker).toContain("hour12FromAngle");
    expect(picker).toContain("minuteFromAngle");
  });

  it("opening one picker folds the one before it", () => {
    expect(picker).toContain("activePickerClose");
  });
});

describe("v366 — value parsing keeps the string contract", () => {
  it("dates parse from the string, never through a timezone", () => {
    expect(parseDateValue("2026-10-30")).toEqual({ year: 2026, month: 9, day: 30 });
    expect(parseDateValue("")).toBeNull();
    expect(parseDateValue("not-a-date")).toBeNull();
    expect(parseDateValue("2026-13-01")).toBeNull();
    expect(formatDateValue(2026, 9, 30)).toBe("2026-10-30");
    expect(formatDateValue(2026, 0, 5)).toBe("2026-01-05");
  });

  it("times parse and format in 24-hour HH:mm", () => {
    expect(parseTimeValue("18:00")).toEqual({ hour24: 18, minute: 0 });
    expect(parseTimeValue("04:05")).toEqual({ hour24: 4, minute: 5 });
    expect(parseTimeValue("24:00")).toEqual({ hour24: 0, minute: 0 });
    expect(parseTimeValue("")).toBeNull();
    expect(formatTimeValue(18, 0)).toBe("18:00");
    expect(formatTimeValue(4, 5)).toBe("04:05");
  });
});

describe("v366 — the calendar grid", () => {
  it("October 2026 starts on Sunday Sep 27 and holds Oct 30 in-month", () => {
    const cells = calendarCells(2026, 9);
    expect(cells).toHaveLength(42);
    expect(cells[0]).toEqual({ year: 2026, month: 8, day: 27, inMonth: false });
    expect(cells[4]).toEqual({ year: 2026, month: 9, day: 1, inMonth: true });
    expect(cells.find((c) => c.inMonth && c.day === 30)).toEqual({
      year: 2026,
      month: 9,
      day: 30,
      inMonth: true,
    });
    expect(cells[41]).toEqual({ year: 2026, month: 10, day: 7, inMonth: false });
  });

  it("a month starting on a Sunday opens with its own 1st", () => {
    const cells = calendarCells(2026, 1); // Feb 1, 2026 is a Sunday
    expect(cells[0]).toEqual({ year: 2026, month: 1, day: 1, inMonth: true });
  });
});

describe("v366 — the dial maths", () => {
  it("points read clockwise from 12 o'clock", () => {
    expect(dialPointAngle(100, 0, 200)).toBeCloseTo(0);
    expect(dialPointAngle(200, 100, 200)).toBeCloseTo(90);
    expect(dialPointAngle(100, 200, 200)).toBeCloseTo(180);
    expect(dialPointAngle(0, 100, 200)).toBeCloseTo(270);
    expect(dialPointAngle(150, 50, 200)).toBeCloseTo(45);
  });

  it("angles snap to the nearest hour and any minute", () => {
    expect(hour12FromAngle(0)).toBe(12);
    expect(hour12FromAngle(30)).toBe(1);
    expect(hour12FromAngle(120)).toBe(4);
    expect(hour12FromAngle(180)).toBe(6);
    expect(hour12FromAngle(359)).toBe(12);
    expect(minuteFromAngle(0)).toBe(0);
    expect(minuteFromAngle(90)).toBe(15);
    expect(minuteFromAngle(210)).toBe(35);
    expect(minuteFromAngle(359)).toBe(0);
  });

  it("value→angle and angle→value are exact round trips", () => {
    for (let h = 1; h <= 12; h++) {
      expect(hour12FromAngle(dialAngleForHour12(h))).toBe(h);
    }
    for (const m of [0, 5, 7, 15, 30, 35, 59]) {
      expect(minuteFromAngle(dialAngleForMinute(m))).toBe(m);
    }
    expect(dialAngleForHour12(12)).toBe(0);
    expect(dialAngleForHour12(4)).toBe(120);
    expect(dialAngleForMinute(35)).toBe(210);
  });
});
