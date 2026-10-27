import { getTodayISOString } from "./prayercircle-data";
import {
  getFastCalendarDays,
  getFastEndDate,
  getFastProgress,
  type FastDayStatus,
  type PersonalFast,
} from "./prayercircle-fasting";

/**
 * v276 "The Fast, As a Tracker" — the pure model behind the tracker
 * re-presentation of the fasting page (mockup:
 * social-mockups/fasting-tracker-design-v3.html, approved by Jonathan
 * 2026-10-26: "Okay let's make the fasting page like this.").
 *
 * Everything here is a read-model over the EXISTING fast record
 * (lib/prayercircle-fasting.ts): day states map 1:1 from
 * fast.dayStatuses, notes read from fast.dailyNotes, the why from
 * fast.why. Nothing in this file writes or migrates anything.
 */

// ─── Meaning colors — constants of the app. They never follow the
// seed: kept green, skipped amber, missed red (the mockup's :root). ──
export const FAST_KEPT = "#31C48D";
export const FAST_KEPT_DEEP = "#1E9E6A";
export const FAST_SKIPPED_WASH = "#FDEBC8";
export const FAST_SKIPPED_DEEP = "#9A6206";
export const FAST_MISSED_WASH = "#FDE3E3";
export const FAST_MISSED_DEEP = "#991B1B";
export const FAST_RECAP_GOLD = "#F59E0B";

export type FastDayState = FastDayStatus | undefined;

/** The record's dot state for one calendar date — the stored status, 1:1. */
export function getFastDayDotState(fast: PersonalFast, date: string): FastDayState {
  return fast.dayStatuses[date];
}

// ─── Encouragement — a small curated KJV set, fitted to the state
// selected in the day sheet (his 2026-10-26 ask: encouragement for
// whatever is selected). Changing the segment changes the card. ──────
export type FastEncouragement = {
  kicker: string;
  text: string;
  ref: string;
};

export const FAST_ENCOURAGEMENT: Record<FastDayStatus | "unmarked", FastEncouragement> = {
  completed: {
    kicker: "For a kept day",
    text: "This is the day which the LORD hath made; we will rejoice and be glad in it.",
    ref: "Psalm 118:24",
  },
  skipped: {
    kicker: "For a skipped day",
    text: "Come unto me, all ye that labour and are heavy laden, and I will give you rest.",
    ref: "Matthew 11:28",
  },
  missed: {
    kicker: "For a missed day",
    text: "It is of the LORD'S mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness.",
    ref: "Lamentations 3:22–23",
  },
  unmarked: {
    kicker: "For today",
    text: "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.",
    ref: "Isaiah 40:31",
  },
};

export function getFastEncouragement(status: FastDayState): FastEncouragement {
  return FAST_ENCOURAGEMENT[status ?? "unmarked"];
}

// ─── Weeks — the fast chunked into 7-day weeks from Day 1 (the
// mockup's Week 43 = Days 295–301). ──────────────────────────────────
export type FastWeekDay = {
  date: string;
  dayNumber: number;
  status: FastDayState;
};

export type FastWeek = {
  weekNumber: number;
  days: FastWeekDay[];
  /** completed count across the week's elapsed days. */
  kept: number;
  /** days of this week that are not in the future. */
  elapsed: number;
  /** true once the week's last day is before today. */
  ended: boolean;
  /** true when today falls inside this week. */
  current: boolean;
};

export function getFastWeeks(fast: PersonalFast, today: string = getTodayISOString()): FastWeek[] {
  const dates = getFastCalendarDays(fast);
  const weeks: FastWeek[] = [];
  for (let start = 0; start < dates.length; start += 7) {
    const slice = dates.slice(start, start + 7);
    const days = slice.map((date, i) => ({
      date,
      dayNumber: start + i + 1,
      status: fast.dayStatuses[date] as FastDayState,
    }));
    const elapsedDays = days.filter((d) => d.date <= today);
    weeks.push({
      weekNumber: weeks.length + 1,
      days,
      kept: elapsedDays.filter((d) => d.status === "completed").length,
      elapsed: elapsedDays.length,
      ended: slice[slice.length - 1] < today,
      current: slice.includes(today),
    });
  }
  return weeks;
}

/** "5 of 7 kept" for an ended week, "3 of 5 so far" for the current one. */
export function getFastWeekKeptLabel(week: FastWeek): string {
  return week.current ? `${week.kept} of ${week.elapsed} so far` : `${week.kept} of ${week.days.length} kept`;
}

// ─── Quarters — the existing 80+ day behavior: quarterSize =
// ceil(duration/4), month-range labels, today's quarter auto-opens. ───
export type FastQuarter = {
  index: number; // 0..3
  label: string; // "Q1".."Q4"
  monthRange: string; // "Oct–Dec"
  startDay: number; // 1-based, inclusive
  endDay: number; // 1-based, inclusive
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function getFastQuarters(fast: PersonalFast): FastQuarter[] {
  const quarterSize = Math.ceil(fast.durationDays / 4);
  const quarters: FastQuarter[] = [];
  for (let q = 0; q < 4; q += 1) {
    const startDay = q * quarterSize + 1;
    if (startDay > fast.durationDays) break;
    const endDay = Math.min((q + 1) * quarterSize, fast.durationDays);
    const startDate = new Date(`${fast.startDate}T00:00:00Z`);
    startDate.setUTCDate(startDate.getUTCDate() + startDay - 1);
    const endDate = new Date(`${fast.startDate}T00:00:00Z`);
    endDate.setUTCDate(endDate.getUTCDate() + endDay - 1);
    quarters.push({
      index: q,
      label: `Q${q + 1}`,
      monthRange: `${MONTH_NAMES[startDate.getUTCMonth()]}–${MONTH_NAMES[endDate.getUTCMonth()]}`,
      startDay,
      endDay,
    });
  }
  return quarters;
}

export function getFastQuarterForDay(fast: PersonalFast, dayNumber: number): number {
  const quarterSize = Math.ceil(fast.durationDays / 4);
  return Math.min(Math.floor((dayNumber - 1) / quarterSize), 3);
}

/** Weeks intersecting the given quarter's day range (all weeks when null). */
export function getFastWeeksForQuarter(weeks: FastWeek[], quarter: FastQuarter | null): FastWeek[] {
  if (!quarter) return weeks;
  return weeks.filter((week) =>
    week.days.some((d) => d.dayNumber >= quarter.startDay && d.dayNumber <= quarter.endDay),
  );
}

// ─── Notes stream — the most recent day notes, newest first. ────────
export type FastNoteEntry = {
  date: string;
  dayNumber: number;
  status: FastDayState;
  note: string;
};

export function getFastNoteStream(fast: PersonalFast, limit = 3): FastNoteEntry[] {
  const dates = getFastCalendarDays(fast);
  const notes = fast.dailyNotes ?? {};
  return dates
    .map((date, i) => ({ date, dayNumber: i + 1, status: fast.dayStatuses[date] as FastDayState, note: notes[date]?.trim() ?? "" }))
    .filter((entry) => entry.note.length > 0)
    .reverse()
    .slice(0, limit);
}

// ─── Recaps — composed ON-DEVICE from his real day notes + the
// record, in the mockup's testimony structure: a counts header, then
// paragraphs that quote his why and his day-notes back, in order.
// No invented events or sentiments: the composer counts and quotes
// only what exists. A week with no notes gets an honest counts-only
// recap. ──────────────────────────────────────────────────────────────
export type FastRecap = {
  kind: "week" | "final";
  title: string;
  /** The recap document's band headline ("Week 43" / "Your 365 days"). */
  headline: string;
  subtitle: string;
  counts: { kept: number; skipped: number; missed: number; unmarked: number };
  longestStreak?: number;
  paragraphs: string[];
};

function countStatuses(fast: PersonalFast, dates: string[]): FastRecap["counts"] {
  return {
    kept: dates.filter((d) => fast.dayStatuses[d] === "completed").length,
    skipped: dates.filter((d) => fast.dayStatuses[d] === "skipped").length,
    missed: dates.filter((d) => fast.dayStatuses[d] === "missed").length,
    unmarked: dates.filter((d) => !fast.dayStatuses[d]).length,
  };
}

function countsSentence(counts: FastRecap["counts"], scope: string): string {
  const parts = [`${counts.kept} kept`, `${counts.skipped} skipped`, `${counts.missed} missed`];
  if (counts.unmarked > 0) parts.push(`${counts.unmarked} unmarked`);
  return `${scope}: ${parts.join(" · ")}.`;
}

function noteQuoteParagraphs(fast: PersonalFast, dates: string[], maxQuotes = 5): string[] {
  const notes = fast.dailyNotes ?? {};
  const dayNumbers = new Map(getFastCalendarDays(fast).map((date, i) => [date, i + 1]));
  const entries = dates
    .map((date) => ({ date, dayNumber: dayNumbers.get(date) ?? 0, note: notes[date]?.trim() ?? "" }))
    .filter((entry) => entry.note.length > 0);
  const paragraphs = entries.slice(0, maxQuotes).map((entry) => `On Day ${entry.dayNumber} you wrote: “${entry.note}”`);
  if (entries.length > maxQuotes) {
    paragraphs.push(`…and ${entries.length - maxQuotes} more ${entries.length - maxQuotes === 1 ? "note" : "notes"} in the record.`);
  }
  return paragraphs;
}

export function composeWeeklyRecap(fast: PersonalFast, week: FastWeek): FastRecap {
  const dates = week.days.map((d) => d.date);
  const counts = countStatuses(fast, dates);
  const paragraphs = [countsSentence(counts, `Week ${week.weekNumber} held`)];
  paragraphs.push(...noteQuoteParagraphs(fast, dates, 5));
  return {
    kind: "week",
    title: `Week ${week.weekNumber} recap`,
    headline: `Week ${week.weekNumber}`,
    subtitle: `${fast.name} · Days ${week.days[0].dayNumber}–${week.days[week.days.length - 1].dayNumber}`,
    counts,
    paragraphs,
  };
}

export function getFastLongestStreak(fast: PersonalFast): number {
  let current = 0;
  let longest = 0;
  for (const date of getFastCalendarDays(fast)) {
    if (fast.dayStatuses[date] === "completed") {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

export function composeFinalRecap(fast: PersonalFast): FastRecap {
  const dates = getFastCalendarDays(fast);
  const counts = countStatuses(fast, dates);
  const progress = getFastProgress(fast);
  const paragraphs: string[] = [];
  const why = fast.why?.trim();
  if (why) paragraphs.push(`Your why, in your words: “${why}”`);
  paragraphs.push(countsSentence(counts, `Across all ${progress.total} days`));
  paragraphs.push(...noteQuoteParagraphs(fast, dates, 5));
  return {
    kind: "final",
    title: `Final recap — your ${fast.durationDays} days`,
    headline: `Your ${fast.durationDays} days`,
    subtitle: fast.name,
    counts,
    longestStreak: getFastLongestStreak(fast),
    paragraphs,
  };
}

/** The Final recap crowns the fast once it has run its course: every
 * day marked (the existing completion trigger) or today past the end. */
export function isFinalRecapReady(fast: PersonalFast, today: string = getTodayISOString()): boolean {
  const dates = getFastCalendarDays(fast);
  if (dates.length === 0) return false;
  const allMarked = dates.every((d) => fast.dayStatuses[d]);
  return allMarked || today > dates[dates.length - 1];
}

/**
 * Most recent ended fast of the same type, excluding the current
 * one. (Relocated from components/fast-board.tsx in v280 when the
 * board was deleted — the People page's fasting card reads the
 * previous fast through here; behavior unchanged.)
 */
export function getPreviousFast(
  fasts: PersonalFast[],
  current: PersonalFast,
  today: string,
): PersonalFast | null {
  return (
    fasts
      .filter((f) => f.id !== current.id && f.type === current.type && getFastEndDate(f) < today)
      .sort((a, b) => getFastEndDate(b).localeCompare(getFastEndDate(a)))[0] ?? null
  );
}

/** Plain-text form for "Save to Journal" — counts header + paragraphs. */
export function recapToJournalBody(recap: FastRecap): string {
  const countsLine = `Kept ${recap.counts.kept} · Skipped ${recap.counts.skipped} · Missed ${recap.counts.missed}`;
  const streakLine = recap.longestStreak ? `\nLongest streak: ${recap.longestStreak} days` : "";
  return `${countsLine}${streakLine}\n\n${recap.paragraphs.join("\n\n")}`;
}
