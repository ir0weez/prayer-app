/**
 * v414 — the Year in Review (Jonathan, Nov 2: it does not live in
 * the morning Brief and it does not exist anywhere in the app
 * before December 31; on Dec 31 it appears on the Fast page as its
 * own filled box under Recaps, and once it appears it stays — a
 * record, not a notification). The pure model:
 *
 *  - THE GATE: the box belongs to a fast and renders only when
 *    today is December 31 of the year that fast ends, or later.
 *    Before that date there is no teaser and no locked slot — the
 *    box is simply not in the tree.
 *  - THE REVIEWED YEAR is the fast's own run: its calendar days
 *    (getFastCalendarDays), its day states 1:1 from
 *    fast.dayStatuses — completed reads as held, skipped as a
 *    close call, missed as fell, the tracker's own meaning colors.
 *  - Every number derives from the stores at read time (the fast
 *    log, the journal, the study track, the XP state, the people
 *    list). Nothing is written down in advance; the page has been
 *    keeping itself all along.
 */
import {
  getFastCalendarDays,
  getFastEndDate,
  getFastProgress,
  type PersonalFast,
} from "./prayercircle-fasting";
import { getFastRecapWeeks } from "./fast-tracker";
import type { PrayerJournalEntry } from "./prayer-journal";

/** The gate date for a fast: December 31 of the year it ends. */
export function yearReviewGateDate(fast: PersonalFast): string {
  const endYear = getFastEndDate(fast).slice(0, 4);
  return `${endYear}-12-31`;
}

/** The hard gate: the box exists only on/after the gate date. */
export function isYearReviewVisible(fast: PersonalFast, todayIso: string): boolean {
  return todayIso >= yearReviewGateDate(fast);
}

/** The year the review names: the calendar year the fast ends in
 *  (his 365-Day Growth Fast ends 2026-12-31 — its year is 2026). */
export function yearReviewYear(fast: PersonalFast): number {
  return parseInt(getFastEndDate(fast).slice(0, 4), 10);
}

export type YearDayState = "held" | "close" | "fell" | "today" | "future" | "unmarked";

export type YearGridDay = {
  date: string;
  dayNumber: number;
  state: YearDayState;
};

export type YearGridMonth = {
  label: string;
  days: YearGridDay[];
};

const MONTH_SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** The year, day by day: the fast's own calendar days grouped by
 *  month, each dot carrying the day's real state. Today wears the
 *  ring (the Record's own today treatment); a past day with no
 *  status is unmarked — drawn in the pale tone, named by nothing. */
export function yearGridFor(fast: PersonalFast, todayIso: string): YearGridMonth[] {
  const months: YearGridMonth[] = [];
  const dates = getFastCalendarDays(fast);
  dates.forEach((date, i) => {
    const monthIndex = parseInt(date.slice(5, 7), 10) - 1;
    const label = MONTH_SHORT[monthIndex] ?? "";
    let month = months[months.length - 1];
    if (!month || month.label !== label) {
      month = { label, days: [] };
      months.push(month);
    }
    const status = fast.dayStatuses[date];
    let state: YearDayState;
    if (date === todayIso) state = "today";
    else if (status === "completed") state = "held";
    else if (status === "skipped") state = "close";
    else if (status === "missed") state = "fell";
    else if (date > todayIso) state = "future";
    else state = "unmarked";
    month.days.push({ date, dayNumber: i + 1, state });
  });
  return months;
}

export type YearFastStats = {
  /** Days of the fast, total. */
  total: number;
  /** Fast days that have arrived (today's day number, clamped). */
  elapsed: number;
  /** Days left after today. */
  remaining: number;
  /** Days carrying any status in the log. */
  logged: number;
  completed: number;
  skipped: number;
  missed: number;
};

export function yearFastStats(fast: PersonalFast, todayIso: string): YearFastStats {
  const dates = getFastCalendarDays(fast);
  const total = dates.length;
  const elapsed = dates.filter((d) => d <= todayIso).length;
  const progress = getFastProgress(fast);
  return {
    total,
    elapsed,
    remaining: Math.max(0, total - elapsed),
    logged: Object.keys(fast.dayStatuses).length,
    completed: progress.completed,
    skipped: progress.skipped,
    missed: progress.missed,
  };
}

/** The longest back-to-back run of held (completed) days in the
 *  fast's own calendar order. */
export function longestHeldRun(fast: PersonalFast): number {
  let best = 0;
  let run = 0;
  for (const date of getFastCalendarDays(fast)) {
    if (fast.dayStatuses[date] === "completed") {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

export type HardestWeek = {
  startDate: string;
  endDate: string;
  missed: number;
};

/** The calendar week with the most fell days — the Recaps' own
 *  Sun–Sat week model (getFastRecapWeeks). Null when no week of
 *  the fast holds a fell day. */
export function hardestWeekOf(fast: PersonalFast, todayIso: string): HardestWeek | null {
  let best: HardestWeek | null = null;
  for (const week of getFastRecapWeeks(fast, todayIso)) {
    if (week.missed > 0 && (!best || week.missed > best.missed)) {
      best = { startDate: week.startDate, endDate: week.endDate, missed: week.missed };
    }
  }
  return best;
}

/** Answered prayers gathered in the fast's own span: journal
 *  entries of kind "answered" dated inside the fast's run. */
export function answeredCountForFast(entries: PrayerJournalEntry[], fast: PersonalFast): number {
  const end = getFastEndDate(fast);
  return entries.filter(
    (e) => e.kind === "answered" && e.date >= fast.startDate && e.date <= end,
  ).length;
}

/* ─── Highs & lows — composed only from what the data supports ── */

export type YearReviewRow = { title: string; sub: string; icon: "star" | "check" | "chart" };

export function yearHighs(input: {
  /** Genesis–Deuteronomy all fully read (the commentary's Vol. 1). */
  volumeOneFinished: boolean;
  /** Books fully written under the v324 union rule. */
  writtenBooks: string[];
  longestHeldRun: number;
  answeredCount: number;
}): YearReviewRow[] {
  const rows: YearReviewRow[] = [];
  if (input.volumeOneFinished) {
    rows.push({
      title: "Volume 1 of the commentary finished",
      sub: "Genesis through Deuteronomy, every chapter.",
      icon: "star",
    });
  }
  for (const book of input.writtenBooks.slice(0, 3)) {
    rows.push({ title: `${book} written, complete`, sub: "Every chapter carries your notes.", icon: "star" });
  }
  if (input.longestHeldRun > 1) {
    rows.push({
      title: "Your longest held run",
      sub: `${input.longestHeldRun} held days back to back, counted from your fast log.`,
      icon: "star",
    });
  }
  if (input.answeredCount > 0) {
    rows.push({
      title: "Answered prayers, kept",
      sub: `${input.answeredCount} answered ${input.answeredCount === 1 ? "post" : "posts"} from the Journal, gathered in one place.`,
      icon: "check",
    });
  }
  return rows;
}

export function yearLows(input: {
  missed: number;
  skipped: number;
  hardestWeek: HardestWeek | null;
  /** "Nov 2" style label for the hardest week's Sunday. */
  hardestWeekLabel: string;
}): YearReviewRow[] {
  const rows: YearReviewRow[] = [];
  if (input.missed > 0) {
    rows.push({
      title: "The fell days are written down, not hidden",
      sub: `${input.missed} fell ${input.missed === 1 ? "day" : "days"}, each logged the day it happened — the review doesn't skip them.`,
      icon: "chart",
    });
  }
  if (input.hardestWeek && input.hardestWeek.missed > 1) {
    rows.push({
      title: "The hardest week, named",
      sub: `The week of ${input.hardestWeekLabel} held ${input.hardestWeek.missed} fell days — the most of any week in the year.`,
      icon: "chart",
    });
  }
  if (input.missed === 0 && input.skipped > 0) {
    rows.push({
      title: "No fell days this year",
      sub: `${input.skipped} close ${input.skipped === 1 ? "call" : "calls"} — every hard day was still a held one.`,
      icon: "chart",
    });
  }
  return rows;
}
