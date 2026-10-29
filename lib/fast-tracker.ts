import { getTodayISOString, type Person } from "./prayercircle-data";
import { hometownUnlockedForFastLength } from "./hometown";
import { ERA_COUNT, ERA_DEFS, eraIndexForDay } from "./hometown-eras";
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
export const FAST_KEPT_WASH = "#D9F5E7";
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
  /** The week's Sunday / Saturday (ISO dates) — v342: weeks are
   *  CALENDAR weeks (Sun–Sat), so a week row is the calendar week,
   *  holding only the fast's own days inside it. */
  startDate: string;
  endDate: string;
  days: FastWeekDay[];
  /** completed count across the week's elapsed days. */
  kept: number;
  /** days of this week that are not in the future. */
  elapsed: number;
  /** true once the week's last fast day is before today. */
  ended: boolean;
  /** true when today falls inside this calendar week (Sun–Sat). */
  current: boolean;
};

/**
 * The one week derivation (v342, unified): every Sun–Sat calendar
 * week the fast touches, oldest first, each holding only the
 * fast's own days inside it — a fast starting Thursday opens with
 * a Thu–Sat week, never a padded one. The Record (getFastWeeks),
 * the Recaps (getFastRecapWeeks) and the day sheet's week number
 * all read from this core, so the fast's weeks are the calendar's
 * weeks everywhere (his ruling, Oct 29 14:51: "does the week
 * still not start on Sunday in the fast?").
 */
export type FastCalendarWeek = {
  startDate: string;
  endDate: string;
  days: FastWeekDay[];
};

export function getFastCalendarWeeks(fast: PersonalFast): FastCalendarWeek[] {
  const dates = getFastCalendarDays(fast);
  if (dates.length === 0) return [];
  const dayNumberByDate = new Map(dates.map((date, i) => [date, i + 1] as const));
  const firstSunday = sundayOfCalendarWeek(dates[0]);
  const lastSunday = sundayOfCalendarWeek(dates[dates.length - 1]);
  const weeks: FastCalendarWeek[] = [];
  for (let sunday = firstSunday; sunday <= lastSunday; sunday = addDaysIso(sunday, 7)) {
    const saturday = addDaysIso(sunday, 6);
    const days: FastWeekDay[] = [];
    for (let d = sunday; d <= saturday; d = addDaysIso(d, 1)) {
      const dayNumber = dayNumberByDate.get(d);
      if (dayNumber !== undefined) {
        days.push({ date: d, dayNumber, status: fast.dayStatuses[d] as FastDayState });
      }
    }
    if (days.length > 0) weeks.push({ startDate: sunday, endDate: saturday, days });
  }
  return weeks;
}

export function getFastWeeks(fast: PersonalFast, today: string = getTodayISOString()): FastWeek[] {
  return getFastCalendarWeeks(fast).map((week, i) => {
    const elapsedDays = week.days.filter((d) => d.date <= today);
    return {
      weekNumber: i + 1,
      startDate: week.startDate,
      endDate: week.endDate,
      days: week.days,
      kept: elapsedDays.filter((d) => d.status === "completed").length,
      elapsed: elapsedDays.length,
      ended: week.days[week.days.length - 1].date < today,
      current: week.startDate <= today && today <= week.endDate,
    };
  });
}

/**
 * "5 of 7 kept" for an ended week, "3 of 5 so far" for the current
 * one — and NULL for a week that has not begun. v283 (Jonathan's
 * Oct 27 device report on v280): the Record opened on Q4 with the
 * future weeks first, each stamped "0 of 7 kept", which read as
 * his whole year wiped. An unstarted week has nothing to report —
 * it carries no kept label at all.
 */
export function getFastWeekKeptLabel(week: FastWeek): string | null {
  // v342: the unstarted-week rule on the calendar model — a week
  // with NO elapsed days (a future week, or this calendar week
  // before the fast reaches it) carries no kept label at all.
  if (week.elapsed === 0) return null;
  return week.current ? `${week.kept} of ${week.elapsed} so far` : `${week.kept} of ${week.days.length} kept`;
}

/**
 * The weeks the Record actually shows, newest first (v283): the
 * weeks that have begun — the current week leads, ended weeks
 * follow — and the future weeks of the quarter stay off the page.
 * A quarter with NO begun week (reachable only by tapping ahead
 * into a future quarter) falls back to all of its weeks, still
 * newest first; those rows render their ahead dots with no kept
 * label (getFastWeekKeptLabel is null for every one of them).
 */
export function getFastRecordWeeks(weeks: FastWeek[]): FastWeek[] {
  const begun = weeks.filter((week) => week.elapsed > 0);
  const display = begun.length > 0 ? begun : weeks;
  return [...display].sort((a, b) => b.weekNumber - a.weekNumber);
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
// recap.
//
// v342 (his Oct 29 rulings + the approved recap drawing): the week
// is the Sun–Sat CALENDAR week, named by its DATES ("Oct 25 – 31"),
// never a fast-block number; the document is the Material v5 build
// (tonal hero with the week's kept fraction as a travelling wavy
// thread, shaped stat tiles, Highs & Lows blocks, a filled
// encouragement surface, and a Week Ahead companion composed from
// the same real data). The structured fields below carry that
// document; `paragraphs` keeps the plain-text journal voice. Prayer
// enters ONLY as window facts (people prayed for / prayer days) —
// never per-person tallies (his explicit correction). ─────────────

/** A sentence run with its bold spans marked — the v5 document
 *  renders material list blocks out of these; the journal body
 *  flattens them to plain text. */
export type RecapSegments = { text: string; bold?: boolean }[];

export type RecapBlockRow =
  | { kind: "line"; segments: RecapSegments }
  | { kind: "quote"; whenLabel: string; text: string }
  | { kind: "date"; dayOfMonth: string; weekday: string; shape: "square" | "circle" | "arch"; segments: RecapSegments };

export type RecapBlock = {
  title: string;
  /** plain = the page's card surface, circle markers; tonal = the
   *  deeper container step, diamond markers. */
  tone: "plain" | "tonal";
  marker: "circle" | "diamond";
  rows: RecapBlockRow[];
};

export type RecapEncouragement = {
  paragraphs: string[];
  verse: { text: string; ref: string };
};

/** One stored schedule item, in the recap's own minimal shape —
 *  profile.tsx maps the schedule store's records onto it. */
export type RecapScheduleItem = {
  date: string;
  title: string;
  startTime?: string;
  endTime?: string;
};

/** The real-world facts a recap may draw on beyond the fast itself
 *  (v342). Prayer enters ONLY as window facts — how many people
 *  were prayed for, on how many days — never as per-person tallies:
 *  his explicit correction (Oct 29), because the recap is a
 *  reflection, not a scoreboard of people. Schedule items are the
 *  week's own stored records — nothing is invented. */
export type RecapContext = {
  people?: Person[];
  scheduleItems?: RecapScheduleItem[];
};

/** The Week Ahead companion (his ask, Oct 29): the next Sun–Sat,
 *  composed from the same real data — the fast's frame for those
 *  dates, an era turn if one falls inside, what's already on the
 *  calendar, and who's coming due for reach (the 14-day rule). */
export type FastWeekAhead = {
  startDate: string;
  endDate: string;
  datesLabel: string;
  heroDates: string;
  fastLine: string | null;
  heroLine: string | null;
  heroSub: string;
  blocks: RecapBlock[];
  encouragement: RecapEncouragement;
};

export type FastRecap = {
  kind: "week" | "final";
  /** The calendar week's Sunday (weekly recaps only) — the
   *  identity Recaps rows key on since v342. */
  weekStartDate?: string;
  /** "Oct 25 – 31 recap" — the week's DATES, never a block number
   *  (his ruling, Oct 29: the calendar is how the week is known). */
  title: string;
  /** The document's expressive headline ("October 25–31"). */
  headline: string;
  /** The title's quiet companion line (the fast's own name). */
  subtitle: string;
  counts: { kept: number; skipped: number; missed: number; unmarked: number };
  /** The week's longest run of consecutive kept days (the final
   *  recap: the fast's). */
  longestStreak?: number;
  paragraphs: string[];
  /** v342: the v5 document's structured composition. */
  heroDates: string;
  heroFastLine: string;
  /** The hero thread's fill — the week's kept fraction (the final
   *  recap: the whole fast's). */
  heroFraction: number;
  heroLine: string;
  heroSub: string;
  blocks: RecapBlock[];
  encouragement: RecapEncouragement;
  weekAhead?: FastWeekAhead;
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

// ─── Calendar weeks (v342) ──────────────────────────────────────
//
// The fast's week is the Sun–Sat CALENDAR week — the same week
// the schedule lives in — intersecting the fast. As first built,
// only the Recaps used the calendar derivation and the Record
// kept 7-day blocks from the fast's start; amendment #6 (his
// ruling, Oct 29 14:51) made the calendar week the fast's week
// EVERYWHERE, so getFastWeeks, getFastRecapWeeks and the day
// sheet all read the one core (getFastCalendarWeeks, above).

const MONTH_NAMES_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_NAMES_LONG = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];
const NUMBER_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six",
  "seven", "eight", "nine", "ten", "eleven", "twelve",
];

export function numberWord(n: number, capitalised = false): string {
  const word = NUMBER_WORDS[n] ?? String(n);
  return capitalised ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

function parseIsoDay(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function toIsoDay(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function addDaysIso(date: string, days: number): string {
  const d = parseIsoDay(date);
  d.setUTCDate(d.getUTCDate() + days);
  return toIsoDay(d);
}

export function sundayOfCalendarWeek(date: string): string {
  return addDaysIso(date, -parseIsoDay(date).getUTCDay());
}

export function weekdayLong(date: string): string {
  return WEEKDAY_NAMES_LONG[parseIsoDay(date).getUTCDay()];
}

/** "Oct 25 – 31" — the row/title form of a week's label. */
export function formatRecapWeekLabel(startDate: string, endDate: string): string {
  const s = parseIsoDay(startDate);
  const e = parseIsoDay(endDate);
  const start = `${MONTH_NAMES[s.getUTCMonth()]} ${s.getUTCDate()}`;
  const end =
    s.getUTCMonth() === e.getUTCMonth() && s.getUTCFullYear() === e.getUTCFullYear()
      ? `${e.getUTCDate()}`
      : `${MONTH_NAMES[e.getUTCMonth()]} ${e.getUTCDate()}`;
  return `${start} – ${end}`;
}

/** "October 25–31" (or "October 25 – November 1") — the hero form. */
export function formatRecapHeroDates(startDate: string, endDate: string): string {
  const s = parseIsoDay(startDate);
  const e = parseIsoDay(endDate);
  if (s.getUTCMonth() === e.getUTCMonth() && s.getUTCFullYear() === e.getUTCFullYear()) {
    return `${MONTH_NAMES_LONG[s.getUTCMonth()]} ${s.getUTCDate()}–${e.getUTCDate()}`;
  }
  return `${MONTH_NAMES_LONG[s.getUTCMonth()]} ${s.getUTCDate()} – ${MONTH_NAMES_LONG[e.getUTCMonth()]} ${e.getUTCDate()}`;
}

function weekdayList(dates: string[]): string {
  const names = dates.map((d) => weekdayLong(d));
  if (names.length <= 1) return names.join("");
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export type FastRecapWeek = {
  /** The week's Sunday / Saturday (ISO dates). */
  startDate: string;
  endDate: string;
  /** The fast's own days inside the week (only these carry statuses). */
  days: FastWeekDay[];
  kept: number;
  skipped: number;
  missed: number;
  /** Fast days in the week that are today or earlier. */
  elapsed: number;
  ended: boolean;
  current: boolean;
  /** The recap presents on Saturday (today IS the week's Saturday),
   *  or once the week — or the fast's run inside it — is over. */
  available: boolean;
};

/**
 * Every Sun–Sat calendar week the fast touches, oldest first.
 * A week's "days" are only the fast's own days inside it — a fast
 * starting Thursday opens its first recap week on the Sunday
 * before, holding just Thu–Sat.
 */
export function getFastRecapWeeks(
  fast: PersonalFast,
  today: string = getTodayISOString(),
): FastRecapWeek[] {
  // v342 (amendment #6): derived from the SAME calendar-week core
  // as the Record (getFastCalendarWeeks) — one week model for the
  // whole fast, per his ruling.
  return getFastCalendarWeeks(fast).map((week) => {
    const { startDate: sunday, endDate: saturday, days } = week;
    const counts = countStatuses(fast, days.map((d) => d.date));
    const lastFastDay = days[days.length - 1].date;
    return {
      startDate: sunday,
      endDate: saturday,
      days,
      kept: counts.kept,
      skipped: counts.skipped,
      missed: counts.missed,
      elapsed: days.filter((d) => d.date <= today).length,
      ended: saturday < today,
      current: sunday <= today && today <= saturday,
      available: saturday <= today || today > lastFastDay,
    };
  });
}

// ─── The v5 composition ─────────────────────────────────────────

const ISAIAH_VERSE = {
  text: "…they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles…",
  ref: "Isaiah 40:31",
};
const LAMENTATIONS_VERSE = {
  text: "It is of the LORD's mercies that we are not consumed, because his compassions fail not. They are new every morning…",
  ref: "Lamentations 3:22–23",
};
const PHILIPPIANS_VERSE = {
  text: "…forgetting those things which are behind, and reaching forth unto those things which are before, I press toward the mark…",
  ref: "Philippians 3:13–14",
};

/** A kept day's note that carries the week's struggle rather than
 *  its ease — the drawing files exactly such a note ("Almost messed
 *  up yesterday…") under Lows, because that is where its story
 *  belongs. */
const STRUGGLE_NOTE = /almost|nearly|hard|tough|struggl|tired|angry|rough|difficult|barely|weak/i;

function seg(text: string, bold = false): { text: string; bold?: boolean } {
  return bold ? { text, bold: true } : { text };
}

function lineRow(segments: RecapSegments): RecapBlockRow {
  return { kind: "line", segments };
}

function segmentsText(segments: RecapSegments): string {
  return segments.map((s) => s.text).join("");
}

function blockRowToParagraph(row: RecapBlockRow): string {
  if (row.kind === "quote") return `${row.whenLabel}: “${row.text}”`;
  if (row.kind === "date") return `${row.weekday} ${row.dayOfMonth}: ${segmentsText(row.segments)}`;
  return segmentsText(row.segments);
}

function formatTime12(time: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!match) return time;
  const hour24 = Number(match[1]);
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${match[2]} ${suffix}`;
}

/**
 * The window's prayer facts, as sentences' raw material ONLY:
 * how many distinct people were prayed for inside the window, and
 * on how many distinct days prayer happened. Dates come from the
 * forward prayer log (Person.prayedDates, v279) plus each person's
 * last-completed stamp. Nothing per-person is ever returned — the
 * recap speaks of the week, not of tallies against people.
 */
export function getRecapPrayerWindow(
  people: Person[] | undefined,
  dates: string[],
): { peopleCount: number; daysCount: number } {
  const inWindow = new Set(dates);
  const days = new Set<string>();
  let peopleCount = 0;
  for (const person of people ?? []) {
    const hits = new Set<string>();
    for (const d of person.prayedDates ?? []) if (inWindow.has(d)) hits.add(d);
    if (person.lastPrayerCompletedDate && inWindow.has(person.lastPrayerCompletedDate)) {
      hits.add(person.lastPrayerCompletedDate);
    }
    if (hits.size > 0) {
      peopleCount += 1;
      hits.forEach((d) => days.add(d));
    }
  }
  return { peopleCount, daysCount: days.size };
}

function longestStretchInWeek(days: FastWeekDay[]): { length: number; startIdx: number } {
  let best = { length: 0, startIdx: -1 };
  let run = 0;
  let runStart = 0;
  days.forEach((d, i) => {
    if (d.status === "completed") {
      if (run === 0) runStart = i;
      run += 1;
      if (run > best.length) best = { length: run, startIdx: runStart };
    } else {
      run = 0;
    }
  });
  return best;
}

export function composeWeeklyRecap(
  fast: PersonalFast,
  week: FastRecapWeek,
  context: RecapContext = {},
): FastRecap {
  const dates = week.days.map((d) => d.date);
  const counts = countStatuses(fast, dates);
  const notes = fast.dailyNotes ?? {};
  const noteOf = (date: string) => notes[date]?.trim() ?? "";
  const label = formatRecapWeekLabel(week.startDate, week.endDate);
  const heroDates = formatRecapHeroDates(week.startDate, week.endDate);
  const windowDays = week.days.length;
  const stretch = longestStretchInWeek(week.days);
  const hard = counts.missed >= 1 || counts.kept * 2 < counts.kept + counts.skipped + counts.missed;
  const prayer = getRecapPrayerWindow(context.people, dates);

  // ── The hero: the week's shape in one line, in words. ──
  const heroLine =
    windowDays > 0
      ? `${numberWord(counts.kept, true)} of ${numberWord(windowDays)} days held.`
      : "No fast days fell in this week.";
  let heroSub: string;
  if (windowDays > 0 && counts.kept === windowDays) {
    heroSub = "Every day held, start to finish — a flawless week.";
  } else if (!hard) {
    heroSub = week.days.some((d) => noteOf(d.date))
      ? "Not a flawless week — a held one, and the days you wrote about most are the reason it stayed that way."
      : "Not a flawless week — a held one. The record below is the honest one.";
  } else {
    heroSub =
      counts.kept > 0
        ? "This week cost more. The record below is the honest one — and it still isn't a record of a man who walked away."
        : "This week cost more. The record below is the honest one.";
  }

  // ── Highs — what held. ──
  const highs: RecapBlockRow[] = [];
  if (stretch.length >= 2) {
    const span = week.days.slice(stretch.startIdx, stretch.startIdx + stretch.length);
    const mid = span[Math.floor(span.length / 2)];
    highs.push(
      lineRow([
        seg(`${weekdayLong(mid.date)} landed in the middle of a `),
        seg(`${numberWord(stretch.length)}-day held stretch`, true),
        seg(` — ${weekdayLong(span[0].date)} through ${weekdayLong(span[span.length - 1].date)}, the spine of the week.`),
      ]),
    );
  } else if (counts.kept > 0) {
    const comeback = week.days.find((d, i) => {
      if (d.status !== "completed") return false;
      const prev = i > 0 ? week.days[i - 1].status : (fast.dayStatuses[addDaysIso(d.date, -1)] as FastDayState);
      return prev === "missed" || prev === "skipped";
    });
    if (comeback) {
      highs.push(
        lineRow([
          seg(`${weekdayLong(comeback.date)}, after the hardest of it, `),
          seg("you came back and kept the day", true),
          seg(". The week didn't end in a slide."),
        ]),
      );
    } else {
      const firstKept = week.days.find((d) => d.status === "completed")!;
      highs.push(
        lineRow([
          seg(`${weekdayLong(firstKept.date)} `),
          seg("held", true),
          seg(" — a kept day in the record, in a week that asked for it."),
        ]),
      );
    }
  }
  const keptQuoteDays = week.days.filter(
    (d) => d.status === "completed" && noteOf(d.date) && !STRUGGLE_NOTE.test(noteOf(d.date)),
  );
  for (const d of keptQuoteDays.slice(0, 2)) {
    highs.push({ kind: "quote", whenLabel: `${weekdayLong(d.date)} · Day ${d.dayNumber}`, text: noteOf(d.date) });
  }
  if (prayer.daysCount > 0) {
    if (prayer.daysCount * 2 >= windowDays) {
      highs.push(
        lineRow([
          seg("And underneath the fasting, "),
          seg("prayer ran through the week", true),
          seg(" — you kept showing up for the people on your list while your own days were being held."),
        ]),
      );
    } else if (hard) {
      highs.push(
        lineRow([
          seg("Even in a week that cost you, "),
          seg(`you still prayed on ${numberWord(prayer.daysCount)} ${prayer.daysCount === 1 ? "day" : "days"}`, true),
          seg(". Fewer, maybe. Not zero — the list was not dropped just because the week was hard."),
        ]),
      );
    } else {
      highs.push(
        lineRow([
          seg("Prayer was part of the week too — "),
          seg(`you prayed on ${numberWord(prayer.daysCount)} ${prayer.daysCount === 1 ? "day" : "days"}`, true),
          seg(", for the people on your list."),
        ]),
      );
    }
  }

  // ── Lows — what it cost, honestly, without a lecture. ──
  const lows: RecapBlockRow[] = [];
  const missedDays = week.days.filter((d) => d.status === "missed");
  const skippedDays = week.days.filter((d) => d.status === "skipped");
  const struggleDays = week.days.filter(
    (d) => d.status === "completed" && noteOf(d.date) && STRUGGLE_NOTE.test(noteOf(d.date)),
  );
  const lowQuotes: RecapBlockRow[] = [];
  if (missedDays.length === 1) {
    lows.push(
      lineRow([
        seg(`${weekdayLong(missedDays[0].date)} was `),
        seg("missed", true),
        seg(". No dressing that up — the day is in the record, and it is not the whole of it."),
      ]),
    );
  } else if (missedDays.length > 1) {
    lows.push(
      lineRow([
        seg(`${weekdayList(missedDays.map((d) => d.date))} were `),
        seg("missed", true),
        seg(`. ${numberWord(missedDays.length, true)} missed days are part of this record. They are not the whole of it.`),
      ]),
    );
  }
  for (const d of missedDays.filter((d) => noteOf(d.date)).slice(0, 2)) {
    lowQuotes.push({ kind: "quote", whenLabel: `${weekdayLong(d.date)} · Day ${d.dayNumber}`, text: noteOf(d.date) });
  }
  if (missedDays.length === 0 && struggleDays.length > 0) {
    lows.push(
      lineRow([
        seg(`${weekdayLong(struggleDays[0].date)} nearly went sideways. `),
        seg("Almost", true),
        seg(" is the whole story there — the day pushed, and it did not take you. Your own note from that day says it best."),
      ]),
    );
  }
  for (const d of struggleDays.slice(0, missedDays.length === 0 ? 1 : 2)) {
    lowQuotes.push({ kind: "quote", whenLabel: `${weekdayLong(d.date)} · Day ${d.dayNumber}`, text: noteOf(d.date) });
  }
  lows.push(...lowQuotes.slice(0, 2));
  if (skippedDays.length >= 1) {
    const allFollowedByKept = skippedDays.every(
      (d) => fast.dayStatuses[addDaysIso(d.date, 1)] === "completed",
    );
    const returnLine = allFollowedByKept
      ? skippedDays.length === 1
        ? " You were back the next morning."
        : skippedDays.length === 2
          ? " You were back the next morning both times."
          : " You were back the next morning every time."
      : "";
    if (missedDays.length > 0) {
      lows.push(
        lineRow([
          seg(`${weekdayList(skippedDays.map((d) => d.date))} ${skippedDays.length === 1 ? "was" : "were"} skipped around the missed ${missedDays.length === 1 ? "day" : "days"}.${returnLine}`),
        ]),
      );
    } else {
      lows.push(
        lineRow([
          seg(`${weekdayList(skippedDays.map((d) => d.date))} ${skippedDays.length === 1 ? "was" : "were"} `),
          seg("skipped", true),
          seg(`. ${skippedDays.length === 1 ? "It costs" : "They cost"} the week its perfect shape; ${skippedDays.length === 1 ? "it doesn't" : "they don't"} break it.${returnLine}`),
        ]),
      );
    }
  }

  const blocks: RecapBlock[] = [];
  if (highs.length > 0) blocks.push({ title: "Highs", tone: "plain", marker: "circle", rows: highs });
  if (lows.length > 0) blocks.push({ title: "Lows", tone: "tonal", marker: "diamond", rows: lows });

  // ── The encouragement: the week's facts, then the verse, then
  //    the why — out loud, because weeks like this are when it
  //    gets forgotten. ──
  const why = fast.why?.trim();
  const encSentences: string[] = [];
  if (counts.missed === 0) encSentences.push("No missed days this week.");
  else if (counts.missed === 1) encSentences.push("One day was missed this week.");
  else encSentences.push(`${numberWord(counts.missed, true)} days were missed this week.`);
  if (missedDays.length > 0) {
    encSentences.push(
      `The hardest day was ${weekdayLong(missedDays[0].date)}, and you still ${counts.kept > 0 ? "kept going" : "finished the week in the record"}.`,
    );
  } else if (struggleDays.length > 0) {
    encSentences.push(`The hardest day was ${weekdayLong(struggleDays[0].date)}, and you still held.`);
  }
  if (prayer.daysCount > 0) {
    encSentences.push(
      `You prayed for people on ${numberWord(prayer.daysCount)} of ${numberWord(windowDays)} days${prayer.peopleCount > 0 ? ` — ${numberWord(prayer.peopleCount)} ${prayer.peopleCount === 1 ? "person" : "people"} across the week` : ""}.`,
    );
  }
  if (why) {
    encSentences.push(
      hard
        ? `The why you named has not moved: “${why}.” A hard week doesn't repeal it — the structure is there for weeks like this one. That's what it's for.`
        : `You named the why back at the start — “${why}” — and this week looked like a man living inside it.`,
    );
  }
  const encouragement: RecapEncouragement = {
    paragraphs: [encSentences.join(" ")],
    verse: hard ? LAMENTATIONS_VERSE : ISAIAH_VERSE,
  };

  // ── The Week Ahead companion. ──
  const weekAhead = composeWeekAhead(fast, week, context);

  // ── The journal paragraphs: the whole document as plain text. ──
  const paragraphs: string[] = [heroLine, countsSentence(counts, `${label} held`)];
  for (const block of blocks) paragraphs.push(...block.rows.map(blockRowToParagraph));
  paragraphs.push(...encouragement.paragraphs, `“${encouragement.verse.text}” — ${encouragement.verse.ref} (KJV)`);
  if (weekAhead) {
    paragraphs.push(`The week ahead — ${weekAhead.datesLabel}`);
    if (weekAhead.heroLine) paragraphs.push(weekAhead.heroLine);
    paragraphs.push(weekAhead.heroSub);
    for (const block of weekAhead.blocks) paragraphs.push(...block.rows.map(blockRowToParagraph));
    paragraphs.push(...weekAhead.encouragement.paragraphs, `“${weekAhead.encouragement.verse.text}” — ${weekAhead.encouragement.verse.ref} (KJV)`);
  }

  return {
    kind: "week",
    weekStartDate: week.startDate,
    title: `${label} recap`,
    headline: heroDates,
    subtitle: fast.name,
    counts,
    longestStreak: stretch.length,
    paragraphs,
    heroDates,
    heroFastLine: fast.name,
    heroFraction: windowDays > 0 ? counts.kept / windowDays : 0,
    heroLine,
    heroSub,
    blocks,
    encouragement,
    weekAhead,
  };
}

/**
 * The Week Ahead: next Sun–Sat after the recap's week, composed
 * from real data only — the fast's frame for those dates, an era
 * turn from the era engine if one falls inside, the schedule items
 * already stored for those dates, and the people coming due under
 * the 14-day reach rule. Returns undefined when the week ahead
 * would be empty of all four.
 */
export function composeWeekAhead(
  fast: PersonalFast,
  recapWeek: FastRecapWeek,
  context: RecapContext = {},
): FastWeekAhead | undefined {
  const startDate = addDaysIso(recapWeek.endDate, 1);
  const endDate = addDaysIso(startDate, 6);
  const aheadDates: string[] = [];
  for (let d = startDate; d <= endDate; d = addDaysIso(d, 1)) aheadDates.push(d);
  const inWindow = new Set(aheadDates);
  const dayNumbers = new Map(getFastCalendarDays(fast).map((date, i) => [date, i + 1] as const));
  const fastDaysAhead = aheadDates
    .filter((d) => dayNumbers.has(d))
    .map((d) => ({ date: d, dayNumber: dayNumbers.get(d)! }));

  // The era turn: the first fast day in the window whose era
  // differs from the day before it — read off the live era engine,
  // never a stored claim. Hometown fasts only (> 40 days).
  let eraTurn: { date: string; dayNumber: number; eraIndex: number } | undefined;
  if (hometownUnlockedForFastLength(fast.durationDays)) {
    for (const d of fastDaysAhead) {
      if (d.dayNumber <= 1) continue;
      const idx = eraIndexForDay(d.dayNumber, fast.durationDays);
      if (idx !== eraIndexForDay(d.dayNumber - 1, fast.durationDays)) {
        eraTurn = { date: d.date, dayNumber: d.dayNumber, eraIndex: idx };
        break;
      }
    }
  }

  const events = (context.scheduleItems ?? [])
    .filter((item) => inWindow.has(item.date))
    .slice()
    .sort((a, b) =>
      a.date === b.date
        ? (a.startTime ?? "").localeCompare(b.startTime ?? "")
        : a.date.localeCompare(b.date),
    );

  // Coming due: the reach rule (a stored last-reached date at
  // least 14 days old, opt-outs honored) crossing inside the
  // window — lastPrayed + 14 lands in the week ahead.
  const duePeople = (context.people ?? []).filter((person) => {
    if (!person.lastPrayedDate || person.showInPrayerCheckIns === false) return false;
    const due = addDaysIso(person.lastPrayedDate, 14);
    return startDate <= due && due <= endDate;
  });

  if (fastDaysAhead.length === 0 && events.length === 0 && duePeople.length === 0 && !eraTurn) {
    return undefined;
  }

  const era = eraTurn ? ERA_DEFS[eraTurn.eraIndex] : undefined;
  const heroLine = eraTurn && era ? `${era.name} turns on ${weekdayLong(eraTurn.date)}.` : null;
  let heroSub: string;
  if (eraTurn && era) {
    const place =
      eraTurn.eraIndex === ERA_COUNT - 1
        ? " — the last era"
        : eraTurn.eraIndex === ERA_COUNT - 2
          ? " — the second-to-last era"
          : "";
    heroSub = `On Day ${eraTurn.dayNumber} the fast enters ${era.name}${place}. ${era.line}`;
  } else if (fastDaysAhead.length === 7) {
    heroSub = `The fast runs the whole week — Day ${fastDaysAhead[0].dayNumber} on Sunday to Day ${fastDaysAhead[6].dayNumber} on Saturday.`;
  } else if (fastDaysAhead.some((d) => d.dayNumber === 1)) {
    heroSub = "Your fast begins this week.";
  } else if (fastDaysAhead.some((d) => d.dayNumber === fast.durationDays)) {
    const last = fastDaysAhead[fastDaysAhead.length - 1];
    heroSub = `Your fast closes this week — Day ${fast.durationDays} lands on ${weekdayLong(last.date)}.`;
  } else if (fastDaysAhead.length > 0) {
    heroSub = `The fast is in this week for ${numberWord(fastDaysAhead.length)} days — Day ${fastDaysAhead[0].dayNumber} to Day ${fastDaysAhead[fastDaysAhead.length - 1].dayNumber}.`;
  } else {
    heroSub = "The fast isn't in this week — what follows is the week's own shape.";
  }

  const blocks: RecapBlock[] = [];
  const shapes = ["arch", "square", "circle"] as const;
  const dateRows: RecapBlockRow[] = [];
  events.forEach((item, i) => {
    const d = parseIsoDay(item.date);
    const timeLabel = item.startTime
      ? formatTime12(item.startTime) + (item.endTime ? `–${formatTime12(item.endTime)}` : "")
      : "";
    dateRows.push({
      kind: "date",
      dayOfMonth: `${d.getUTCDate()}`,
      weekday: weekdayLong(item.date),
      shape: shapes[i % shapes.length],
      segments: [seg(item.title, true), ...(timeLabel ? [seg(` — ${timeLabel}`)] : [])],
    });
  });
  if (eraTurn && era) {
    const d = parseIsoDay(eraTurn.date);
    const row: RecapBlockRow = {
      kind: "date",
      dayOfMonth: `${d.getUTCDate()}`,
      weekday: weekdayLong(eraTurn.date),
      shape: shapes[events.length % shapes.length],
      segments: [seg(`Day ${eraTurn.dayNumber} · ${era.name} begins.`, true)],
    };
    // Date order: the turn takes its place among the week's rows.
    const pos = events.findIndex((e) => e.date > eraTurn.date);
    if (pos === -1) dateRows.push(row);
    else dateRows.splice(pos, 0, row);
  }
  if (dateRows.length > 0) {
    blocks.push({ title: "On the calendar", tone: "plain", marker: "circle", rows: dateRows });
  }
  if (duePeople.length > 0) {
    const names = duePeople.map((p) => p.name);
    const shown = names.slice(0, 4);
    const joined =
      shown.length === 1
        ? shown[0]
        : shown.length === 2
          ? `${shown[0]} and ${shown[1]}`
          : `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
    const extra = names.length - shown.length;
    const rows: RecapBlockRow[] =
      names.length === 1
        ? [
            lineRow([
              seg(`${names[0]} is nearing the edge of the reach window — `),
              seg("coming due this week", true),
              seg(". Nothing urgent in it. Just the quiet kind of care this list exists for."),
            ]),
          ]
        : [
            lineRow([
              seg(`${names.length === 2 ? "A couple of" : "A few of"} the people on your list are nearing the edge of the reach window — `),
              seg(joined, true),
              ...(extra > 0 ? [seg(` and ${extra} more`)] : []),
              seg(" are coming due this week. Nothing urgent in it. Just the quiet kind of care this list exists for, while there is still plenty of week to do it in."),
            ]),
          ];
    blocks.push({ title: "Coming due", tone: "tonal", marker: "diamond", rows });
  }

  const aheadParts: string[] = [];
  if (eraTurn) aheadParts.push("a new era");
  if (events.length > 0) {
    aheadParts.push(`${numberWord(events.length)} ${events.length === 1 ? "thing" : "things"} on the calendar`);
  }
  if (duePeople.length > 0) aheadParts.push("people to reach for");
  const joinedParts =
    aheadParts.length === 1
      ? aheadParts[0]
      : aheadParts.length === 2
        ? `${aheadParts[0]} and ${aheadParts[1]}`
        : `${aheadParts.slice(0, -1).join(", ")}, and ${aheadParts[aheadParts.length - 1]}`;
  const encouragement: RecapEncouragement = {
    paragraphs: [
      aheadParts.length > 0
        ? `${joinedParts.charAt(0).toUpperCase() + joinedParts.slice(1)} ahead — and a week that is already yours to walk into, one day at a time.`
        : "Nothing on the books yet — the week is open, and it will fill the way weeks do: one day at a time.",
    ],
    verse: PHILIPPIANS_VERSE,
  };

  return {
    startDate,
    endDate,
    datesLabel: formatRecapWeekLabel(startDate, endDate),
    heroDates: formatRecapHeroDates(startDate, endDate),
    fastLine:
      fastDaysAhead.length > 0
        ? `${fast.name} · Days ${fastDaysAhead[0].dayNumber}–${fastDaysAhead[fastDaysAhead.length - 1].dayNumber}`
        : null,
    heroLine,
    heroSub,
    blocks,
    encouragement,
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
  // v342: the final recap wears the same v5 document — the hero is
  // the whole road, its thread the fast's kept fraction; the notes
  // ride as one "In your words" block; the encouragement carries
  // the counts, the why, and the verse the shape of the fast earns.
  const total = Math.max(1, progress.total);
  const hard = counts.kept * 2 < counts.kept + counts.skipped + counts.missed;
  const dayNumbers = new Map(dates.map((date, i) => [date, i + 1] as const));
  const noteRows: RecapBlockRow[] = dates
    .filter((date) => (fast.dailyNotes?.[date]?.trim() ?? "").length > 0)
    .slice(0, 5)
    .map((date) => ({
      kind: "quote" as const,
      whenLabel: `${weekdayLong(date)} · Day ${dayNumbers.get(date)}`,
      text: fast.dailyNotes![date].trim(),
    }));
  const blocks: RecapBlock[] =
    noteRows.length > 0 ? [{ title: "In your words", tone: "plain", marker: "circle", rows: noteRows }] : [];
  const encouragement: RecapEncouragement = {
    paragraphs: [
      countsSentence(counts, `Across all ${progress.total} days`),
      ...(why ? [`Your why, in your words: “${why}”`] : []),
    ],
    verse: hard ? LAMENTATIONS_VERSE : ISAIAH_VERSE,
  };
  return {
    kind: "final",
    title: `Final recap — your ${fast.durationDays} days`,
    headline: `Your ${fast.durationDays} days`,
    subtitle: fast.name,
    counts,
    longestStreak: getFastLongestStreak(fast),
    paragraphs,
    heroDates: dates.length > 0 ? formatRecapHeroDates(dates[0], dates[dates.length - 1]) : "",
    heroFastLine: fast.name,
    heroFraction: counts.kept / total,
    heroLine: `Your ${fast.durationDays} days.`,
    heroSub: why ? `It started with a why: “${why}”` : "The whole road, in one record.",
    blocks,
    encouragement,
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
