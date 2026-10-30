/**
 * v366 — the pure maths behind the unfurling Material date/time
 * pickers (components/date-time-picker.tsx). Kept free of any React
 * or React Native import so the dial angles, the calendar grid and
 * the value parsing are pinned directly by
 * lib/__tests__/picker-v366.test.ts.
 *
 * Value contract (unchanged from the old wheel/sheet picker): a
 * date is the string "YYYY-MM-DD" and a time is "HH:mm" (24-hour);
 * "" means unset. Parsing is string-based — never `new Date(str)` —
 * so no timezone can shift a day.
 */

export interface DateParts {
  year: number;
  /** 0–11, matching Date#getMonth. */
  month: number;
  /** 1–31. */
  day: number;
}

export interface TimeParts {
  /** 0–23. */
  hour24: number;
  /** 0–59. */
  minute: number;
}

export function parseDateValue(value: string): DateParts | null {
  if (!value || !value.includes("-")) return null;
  const [y, m, d] = value.split("-").map((part) => parseInt(part, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { year: y, month: m - 1, day: d };
}

export function formatDateValue(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function parseTimeValue(value: string): TimeParts | null {
  if (!value || !value.includes(":")) return null;
  const [h, m] = value.split(":").map((part) => parseInt(part, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 24 || m < 0 || m > 59) return null;
  // The day's window can end at "24:00" (midnight) — that is 0.
  return { hour24: h % 24, minute: m };
}

export function formatTimeValue(hour24: number, minute: number): string {
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export interface CalendarCell extends DateParts {
  /** False for the adjacent-month days that pad the grid's edges. */
  inMonth: boolean;
}

/**
 * The 42 cells (6 weeks, Sunday-first) of the grid for one month:
 * the Sunday on or before the 1st, then every day in order.
 */
export function calendarCells(year: number, month: number): CalendarCell[] {
  const firstDow = new Date(year, month, 1).getDay();
  const start = new Date(year, month, 1 - firstDow);
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDate(),
      inMonth: d.getMonth() === month,
    });
  }
  return cells;
}

/**
 * The angle (degrees, clockwise from 12 o'clock, 0–360) of a point
 * inside the dial face. RN dial coordinates: x right, y down, the
 * face is a square of `size`.
 */
export function dialPointAngle(x: number, y: number, size: number): number {
  const dx = x - size / 2;
  const dy = y - size / 2;
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/** The 12-hour-dial hour (1–12) nearest an angle. */
export function hour12FromAngle(angle: number): number {
  const idx = Math.round(angle / 30) % 12;
  return idx === 0 ? 12 : idx;
}

/** The minute (0–59) nearest an angle — any minute, not just fives. */
export function minuteFromAngle(angle: number): number {
  return Math.round(angle / 6) % 60;
}

/** The angle a 12-hour-dial hour (1–12) sits at. */
export function dialAngleForHour12(hour12: number): number {
  return (hour12 % 12) * 30;
}

/** The angle a minute (0–59) sits at. */
export function dialAngleForMinute(minute: number): number {
  return minute * 6;
}
