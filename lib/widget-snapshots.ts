// ─── v436 — home-screen widget snapshots (native render since v438) ─────────
// The pure data layer for PrayerCircle's Android home-screen widgets.
// Every widget renders ONLY what a builder here
// computed from the app's real stores, through the SAME selectors the
// in-app surfaces use — the builders invent nothing:
//
//   Pray Today  getPrayTodayList + getDailyPrayerProgress +
//               sortQueueFaces (the People queue card's own sources)
//   Emergency   getAllActiveEmergencyPrayers + formatHoursLeft (the
//               v435 banner's sources, its exact countdown wording)
//   Your Fast   getActiveFast + getFastCalendarDays (the tracker
//               card's day math); hearts from the XP store via
//               normalizeXPState + maxHeartsForLevel — null when no
//               XP state was handed in, never guessed
//   Reach Out   getDueReachOut (the v412 card's due set and order)
//   Up Next     buildUpNextGroup (the schedule tab's own builder)
//               picks the hero; v442 carries the whole day around
//               it as rail entries (done / item / gap) from the
//               same three schedule stores
//   Your Study  the study store (explicit currentBook mark first,
//               the Books grouping's Current head as fallback),
//               chapterIsWritten / bookWrittenCount (the v324 union
//               rule), restudyQueueSummary, bookColorsFor (ROYGBIV)
//   Daily Breakdown (v462) DB-9's merge of the rows above:
//               pray + reach + the day whole (collectDayItems)
//               + fast, with tomorrow's first item carried for
//               the renderer's evening turn
//               v478: + the morning pack's weather snapshot
//               carried through verbatim (preparedAt / now /
//               days) for the renderer's At a Glance-style
//               header — the feed the card waited on (v472)
//
// A chapter's first-verse line comes from the resolved chapter data's
// embedded KJV verses (V205ChapterData.verses — present only where
// the data layer carries verse text); absent data drops the line,
// never a hardcoded verse.
//
// Builders are pure: callers pass the stores (and, for Study, the
// chapter resolver) in. lib/widget-push.tsx owns the storage reads
// and the hand-off to the native module (v438: one JSON document
// the providers read from SharedPreferences — no JS renders).

import { formatHoursLeft } from "./bell-header";
import { BIBLE_BOOKS } from "./bible-books";
import { bookColorsFor } from "./bible-v205/book-colors";
import { chapterCountFor } from "./bible-v205/index";
import {
  bookWrittenCount,
  chapterIsWritten,
  groupBooksByStudy,
  restudyQueueSummary,
} from "./bible-v205/rewards";
import type { StudyState } from "./bible-v205/study";
import type { StudioImportsMap } from "./bible-v205/studio-import";
import type { V205ChapterData } from "./bible-v205/types";
import { getReadingPosition } from "./bible-v205/position";
import { formatDateLocal } from "./date-utils";
import { JOURNAL_KIND_HUES } from "./journal-material";
import { sortQueueFaces } from "./people-queue";
import {
  getActiveFast,
  getFastCalendarDays,
  type PersonalFast,
} from "./prayercircle-fasting";
import {
  getAllActiveEmergencyPrayers,
  getDailyPrayerProgress,
  getPrayTodayList,
  hasPersonCompletedPrayerToday,
  type Person,
  type PrayerItem,
} from "./prayercircle-data";
import { getDueReachOut } from "./reach-out";
import {
  getEventsForDate,
  getMinistriesForDate,
  getTodosForDate,
  getTodoSummaryCounts,
  type ScheduleEvent,
  type ScheduleMinistry,
  type ScheduleTodo,
} from "./schedule-data";
import { buildUpNextGroup, upNextMinutes, type UpNextCandidate, type UpNextItem } from "./up-next";
import type { WeatherSnapshot } from "./weather-snapshot";
import type { WidgetPalette } from "./widget-palette";
import { maxHeartsForLevel, normalizeXPState } from "./xp-engine";

/** The widget names — since v438 these are the native providers'
 * identities (modules/expo-prayercircle-widgets: provider classes
 * PrayTodayWidgetProvider &c., named for these), pinned by the
 * widget tests. */
export const WIDGET_NAMES = {
  prayToday: "PrayToday",
  emergency: "Emergency",
  yourFast: "YourFast",
  reachOut: "ReachOut",
  upNext: "UpNext",
  yourStudy: "YourStudy",
  // v441: the three rectangles (W-3) — same data, smaller cards.
  prayStrip: "PrayStrip",
  prayNext: "PrayNext",
  reachPair: "ReachPair",
  // v443: the two 2×1 strips — the emergency snapshot in a wide,
  // short card (ES-1), and the study snapshot as a reading strip
  // (ST-2). Both read the EXISTING snapshot sections; no new
  // snapshot document rides along.
  emergencyStrip: "EmergencyStrip",
  readingStrip: "ReadingStrip",
  // v462: the twelfth widget — the Daily Breakdown (DB-9, the
  // Brief List): one card, an open list of rows — pray, reach,
  // schedule, fast — each row its own door.
  dailyBreakdown: "DailyBreakdown",
} as const;

export type WidgetName = (typeof WIDGET_NAMES)[keyof typeof WIDGET_NAMES];

// ─── Shared bits ────────────────────────────────────────────────────────────

/** One face in a widget row: initials on the person's own colour —
 * the same identity the in-app avatars carry (Person.initials /
 * Person.avatarColor are stored fields, read as-is).
 *
 * v441: `photo` rides along when the person has a real photo
 * (Person.photoUri — a file:// path in the app's own storage, the
 * same field the in-app AvatarImage renders). The snapshot carries
 * the PATH only: no file is read and nothing is encoded on this
 * side. The native renderer (which runs in the app's process)
 * decodes, crops and circle-clips the file at render time, and
 * falls back to these initials on any failure. People whose face
 * is a bundled avatarAsset illustration carry no photo — they
 * keep initials, exactly as before. */
export interface WidgetFace {
  personId: string;
  firstName: string;
  initials: string;
  color: string;
  photo?: string;
}

function firstNameOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts[0] || "Unnamed";
}

function faceOf(person: Person): WidgetFace {
  const photo = person.photoUri?.trim();
  return {
    personId: person.id,
    firstName: firstNameOf(person.name),
    initials: person.initials || firstNameOf(person.name).slice(0, 1),
    color: person.avatarColor || person.accentColor,
    ...(photo ? { photo } : {}),
  };
}

/** A person's lead open need: the urgent open item leads (his
 * URGENT semantics — the need that should lead when praying for
 * that person), else the first open item, else none. */
export function leadPrayerItem(person: Person): PrayerItem | null {
  const open = person.prayerItems.filter((item) => !item.isDone);
  return open.find((item) => item.isUrgent) ?? open[0] ?? null;
}

// ─── 1. Pray Today (the flagship large widget) ──────────────────────────────

export interface PrayTodayFace extends WidgetFace {
  prayed: boolean;
}

export type PrayTodayWidgetSnapshot =
  | { state: "no-queue" }
  | { state: "complete"; prayed: number; total: number; faces: PrayTodayFace[] }
  | {
      state: "next";
      personId: string;
      name: string;
      firstName: string;
      initials: string;
      color: string;
      /** v441: the hero's photo path, when the person has one. */
      photo?: string;
      needTitle: string;
      needLine: string;
      prayed: number;
      total: number;
      faces: PrayTodayFace[];
    };

export function buildPrayTodaySnapshot(people: Person[], now: Date): PrayTodayWidgetSnapshot {
  const todayIso = formatDateLocal(now);
  const list = getPrayTodayList(people, now.getDay(), now.getDate());
  if (list.length === 0) return { state: "no-queue" };
  const progress = getDailyPrayerProgress(list, now.getDay(), now.getDate());
  const ordered = sortQueueFaces(list, todayIso);
  const faces: PrayTodayFace[] = ordered.map((person) => ({
    ...faceOf(person),
    prayed: hasPersonCompletedPrayerToday(person, todayIso),
  }));
  if (progress.total > 0 && progress.prayed >= progress.total) {
    return { state: "complete", prayed: progress.prayed, total: progress.total, faces };
  }
  const nextPerson = ordered.find((person) => !hasPersonCompletedPrayerToday(person, todayIso));
  if (!nextPerson) {
    // Everyone on today's list is prayed, but the scheduled-progress
    // total was 0 (an emergency/praise-only day): the day reads
    // complete over the faces that stood in it.
    return {
      state: "complete",
      prayed: faces.filter((face) => face.prayed).length,
      total: faces.length,
      faces,
    };
  }
  const item = leadPrayerItem(nextPerson);
  const heroPhoto = nextPerson.photoUri?.trim();
  return {
    state: "next",
    personId: nextPerson.id,
    name: nextPerson.name,
    firstName: firstNameOf(nextPerson.name),
    initials: nextPerson.initials || firstNameOf(nextPerson.name).slice(0, 1),
    color: nextPerson.avatarColor || nextPerson.accentColor,
    ...(heroPhoto ? { photo: heroPhoto } : {}),
    needTitle: item?.title ?? "",
    needLine: item?.note ?? nextPerson.prayerNote ?? "",
    prayed: progress.prayed,
    total: progress.total,
    faces,
  };
}

// ─── 2. Emergency ───────────────────────────────────────────────────────────

/** The v435 banner's exact countdown wording: formatHoursLeft,
 * capitalized, with the window named — "About 9 hours left of 24". */
export function emergencyLeftText(expiresAtIso: string, now: Date): string {
  const raw = formatHoursLeft(expiresAtIso, now);
  return `${raw.charAt(0).toUpperCase()}${raw.slice(1)} of 24`;
}

export interface EmergencyWidgetRow {
  personId: string;
  name: string;
  initials: string;
  color: string;
  /** v441: the person's photo path, when they have one. */
  photo?: string;
  title: string;
  note: string;
  leftText: string;
  /** v438: the window's end as epoch millis. The native provider
   * re-formats the countdown from this on every OS refresh (its own
   * mirror of formatHoursLeft) and drops the row once it passes —
   * the hours stay honest while the app sleeps, and a dead
   * emergency never lingers on the home screen. 0 when the item
   * carried no parseable expiry (the row then renders leftText). */
  expiresAtMillis: number;
}

export type EmergencyWidgetSnapshot =
  | { state: "none" }
  | {
      state: "active";
      total: number;
      /** The two rows the widget shows, soonest first. */
      rows: EmergencyWidgetRow[];
      /** v438: the remaining active emergencies, soonest first —
       * the native provider promotes these into the visible slots
       * as earlier rows expire between pushes. */
      extraRows: EmergencyWidgetRow[];
    };

export function buildEmergencySnapshot(people: Person[], now: Date): EmergencyWidgetSnapshot {
  const entries = getAllActiveEmergencyPrayers(people)
    .slice()
    .sort(
      (a, b) =>
        new Date(a.item.emergencyExpiresAt ?? 0).getTime() -
        new Date(b.item.emergencyExpiresAt ?? 0).getTime(),
    );
  if (entries.length === 0) return { state: "none" };
  const toRow = ({ person, item }: (typeof entries)[number]): EmergencyWidgetRow => {
    const expiryMs = new Date(item.emergencyExpiresAt ?? 0).getTime();
    const photo = person.photoUri?.trim();
    return {
      personId: person.id,
      name: person.name,
      initials: person.initials || firstNameOf(person.name).slice(0, 1),
      color: person.avatarColor || person.accentColor,
      ...(photo ? { photo } : {}),
      title: item.title,
      note: item.note ?? "",
      leftText: emergencyLeftText(item.emergencyExpiresAt ?? "", now),
      expiresAtMillis: Number.isFinite(expiryMs) ? expiryMs : 0,
    };
  };
  return {
    state: "active",
    total: entries.length,
    rows: entries.slice(0, 2).map(toRow),
    extraRows: entries.slice(2).map(toRow),
  };
}

// ─── 3. Your Fast (small) ───────────────────────────────────────────────────

export type FastWidgetSnapshot =
  | { state: "none" }
  | {
      state: "active";
      dayNumber: number;
      totalDays: number;
      /** v442 (W-4 D-3): the fast's goal length and the days left
       * after today, as numbers — the drawing's "of {goalDays} ·
       * {daysLeft} to go" line and its progress bar compose from
       * these, not from text. goalDays is the fast's own
       * durationDays (totalDays under its drawing name). */
      goalDays: number;
      daysLeft: number;
      name: string;
      /** Null when no XP state was handed in — the widget then
       * shows day + name only rather than inventing hearts. */
      hearts: number | null;
      maxHearts: number | null;
    };

export function buildFastSnapshot(
  fasts: PersonalFast[],
  xpRaw: unknown,
  todayIso: string,
): FastWidgetSnapshot {
  const fast = getActiveFast(fasts, todayIso);
  if (!fast) return { state: "none" };
  const days = getFastCalendarDays(fast);
  const index = days.indexOf(todayIso);
  if (index < 0) return { state: "none" };
  let hearts: number | null = null;
  let maxHearts: number | null = null;
  if (xpRaw != null) {
    const xp = normalizeXPState(xpRaw);
    hearts = xp.hearts;
    maxHearts = maxHeartsForLevel(xp.level);
  }
  return {
    state: "active",
    dayNumber: index + 1,
    totalDays: fast.durationDays,
    goalDays: fast.durationDays,
    daysLeft: fast.durationDays - (index + 1),
    name: fast.name,
    hearts,
    maxHearts,
  };
}

// ─── 4. Due to Reach Out (small) ────────────────────────────────────────────

export interface ReachWidgetPerson extends WidgetFace {
  name: string;
  /** Days since the last reach, numeric — the big widget composes
   * its "· {days}d" text from it, and v441's Reach Pair chip
   * renders "{days} days" from the same number. The photo rides
   * the WidgetFace base (faceOf), like every other face. */
  days: number;
  /** v442 (W-4 D-4): the lead's line, composed HERE — "{days}
   * day(s) since you reached {her|him|them}", the pronoun from
   * the person's own gender ("f" → her, "m" → him, unset →
   * them). The native renderer prints it verbatim; it never
   * composes wording of its own. */
  sinceLine: string;
}

/** The D-4 lead line: "12 days since you reached her". */
export function reachSinceLine(days: number, gender: Person["gender"]): string {
  const pronoun = gender === "f" ? "her" : gender === "m" ? "him" : "them";
  return `${days} day${days === 1 ? "" : "s"} since you reached ${pronoun}`;
}

export type ReachOutWidgetSnapshot =
  | { state: "none" }
  | { state: "due"; lead: ReachWidgetPerson; second: ReachWidgetPerson | null; totalDue: number };

export function buildReachOutSnapshot(people: Person[], now: Date): ReachOutWidgetSnapshot {
  const entries = getDueReachOut(people, now);
  if (entries.length === 0) return { state: "none" };
  const toPerson = (entry: (typeof entries)[number]): ReachWidgetPerson => ({
    ...faceOf(entry.person),
    name: entry.person.name,
    days: entry.days,
    sinceLine: reachSinceLine(entry.days, entry.person.gender),
  });
  return {
    state: "due",
    lead: toPerson(entries[0]),
    second: entries[1] ? toPerson(entries[1]) : null,
    totalDue: entries.length,
  };
}

// ─── 5. Up Next ─────────────────────────────────────────────────────────────

/** "14:00" → "2:00 PM" (the W-1 drawing's pill wording). */
export function formatWidgetTime(time: string): string {
  const [hourRaw, minuteRaw] = String(time ?? "").split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return "";
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

/** 90 → "1 hour 30 minutes"; 60 → "1 hour"; 45 → "45 minutes". */
export function formatOpenDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} minute${rest === 1 ? "" : "s"}`;
  if (rest === 0) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return `${hours} hour${hours === 1 ? "" : "s"} ${rest} minute${rest === 1 ? "" : "s"}`;
}

/** One entry in the Up Next widget's short list.
 *
 * v444 — the model is Jonathan's corrected spec (Nov 5, after
 * the v443 rail rendered on his phone): the widget shows ONLY
 * the last thing (checked off or not), the current thing, and
 * the next one or two things. The v442/v443 whole-day rail
 * (done ≤ 2 + past + hero + following items + gaps, capped at
 * 10) is superseded — do not revive it. Entries ride in display
 * order and there are never more than five:
 *
 *   "last"    (≤1) the most recent timed item that is over —
 *             its stored end has passed; an item with no stored
 *             end (a point item) counts once it has started.
 *             Completed or not; `completed` carries which, and
 *             the renderer dresses it struck + checked when
 *             true, plain muted when false.
 *   "current" (≤1) the uncompleted timed item running right
 *             now (start ≤ now < end; the latest start wins).
 *   "next"    (1–2) the next uncompleted items after now, in
 *             start order; the first carries isHero and wears
 *             the band. The first is buildUpNextGroup's lead —
 *             the schedule tab's own pick, never a second
 *             opinion.
 *   "gap"     (≤1) only between next-1 and next-2, when the
 *             open time between them is 15 minutes or more.
 *
 * With neither a current nor a next, the snapshot is the quiet
 * "none" state even when a last exists. */
export interface UpNextDayEntry {
  kind: "last" | "current" | "next" | "gap";
  /** last / current / next: the item's title. */
  title?: string;
  /** last / current / next: the sub line (the event's
   * location/notes, the same line the pre-v442 widget composed
   * for its lead). */
  sub?: string;
  /** last / current / next: "9:00 AM". */
  timeLabel?: string;
  /** next: minutes since midnight — the renderer counts the
   * hero's "IN 44 MIN" down from it at render time. */
  startMinutes?: number;
  /** next: true on the first next (the band). */
  isHero?: boolean;
  /** last: whether the item was checked off. */
  completed?: boolean;
  /** gap: "1 hour 30 minutes open". */
  text?: string;
}

/** v445: one timed item of the day, carried whole so the native
 * renderer can recompute last / current / next AT RENDER TIME
 * from the device clock (the v444 snapshot's entries froze the
 * app-open moment — and a stale pre-v444 snapshot in the old
 * entry kinds rendered as gaps alone on his phone). */
export interface UpNextDayItem {
  title: string;
  sub: string;
  startMinutes: number;
  endMinutes: number;
  /** Whether a stored end existed (a point item counts as over
   * once it has started; an item with an end, once it passes). */
  hasEnd: boolean;
  completed: boolean;
}

/** v464 (UN-T5, "Tomorrow, Whole" — Jonathan's pick, Nov 6):
 * the day-done turn's payload. When today is spent and the core
 * selection would otherwise show the quiet "Nothing left today"
 * face, the renderer turns the card to tomorrow instead — the
 * fields below are everything that face reads. They ride BOTH
 * snapshot states: the "none" state is exactly the state the
 * turn fires from most evenings. */
export interface UpNextTomorrowFields {
  /** Tomorrow's local ISO date — the renderer fires the turn
   * only when it is the snapshot date's next day (a day-old
   * snapshot never turns on stale tomorrow data). */
  tomorrowDateIso: string;
  /** EVERY timed item of tomorrow, the dayItems shape — the
   * renderer seats them in day order with tomorrow's own
   * ≥15-minute open stretches as white gap boxes. */
  tomorrowItems: UpNextDayItem[];
  /** Today's closing tally, the Schedule summary bar's own
   * arithmetic: todos counted by getTodoSummaryCounts (v463 —
   * a header-completed group counts all its subtasks done)
   * plus events (completed / total). Null when today had no
   * tallyable items at all — the closed line then drops and
   * tomorrow leads. `fastDay` is today's fast day number when
   * a fast is active today (the closed line's "· fast day N
   * kept"), else null. */
  closedToday: { done: number; total: number; fastDay: number | null } | null;
  /** The Study rows: the reading line ("{Book} {chapter}",
   * from getReadingPosition — position.target, else
   * position.lastRead, the Study section's own derivation)
   * and the next-to-write line (buildStudySnapshot's writing
   * derivation), either null when it stands empty. Null whole
   * when neither stands (or when no study store was passed). */
  tomorrowStudy: { reading: string | null; writeNext: string | null } | null;
  /** Tomorrow's pray queue, the Daily Breakdown pray section's
   * composition discipline against tomorrow's list: the count,
   * up to three faces (a still-standing emergency's person
   * first, wearing BREAKDOWN_EMERGENCY_RED), the lead's first
   * name, and whether an emergency leads. Null when tomorrow's
   * queue is empty and no emergency stands into tomorrow. */
  tomorrowPray: {
    count: number;
    faces: BreakdownFace[];
    leadFirstName: string;
    leadEmergency: boolean;
  } | null;
  /** Tomorrow's fast day number when a fast is active AND
   * tomorrow falls inside it; null past the fast's end (the
   * fast foot then drops). */
  tomorrowFast: { dayNumber: number } | null;
}

export type UpNextWidgetSnapshot =
  | ({
      state: "none";
      /** v464: the day this snapshot describes, and the day
       * whole — the same two fields the "next" state carries,
       * so the renderer can measure the day-done turn from
       * either state (the "none" state is the turn's home:
       * nothing current and nothing ahead is most of what
       * "spent" means). Pre-v464 snapshots in storage carry
       * neither, and never turn. */
      dateIso: string;
      dayItems: UpNextDayItem[];
    } & UpNextTomorrowFields)
  | ({
      state: "next";
      /** The short list, in display order: last?, current?,
       * next (hero), gap?, next? — never more than five. */
      entries: UpNextDayEntry[];
      /** Timed items still ahead today, hero included — the
       * header's "{leftCount} LEFT". */
      leftCount: number;
      /** "Nothing after 3:00 PM", from the last ahead item's
       * end; null when nothing is ahead to state it from. */
      endNote: string | null;
      /** v445: the day this snapshot describes (todayIso) — the
       * renderer only recomputes from dayItems when it equals
       * the device's current local date. */
      dateIso: string;
      /** v445: EVERY timed item of the day (todos → events →
       * ministries, stable day order), for the render-time
       * recompute. */
      dayItems: UpNextDayItem[];
    } & UpNextTomorrowFields);

/** The rail's per-kind end rule, shared with the pre-v442 lead
 * math: a stored endTime wins; a todo without one runs 30
 * minutes, everything else 60. */
function upNextEndMinutes(kind: "todo" | "event" | "ministry", startTime: string, endTime?: string): number {
  return endTime ? upNextMinutes(endTime) : upNextMinutes(startTime) + (kind === "todo" ? 30 : 60);
}

function minutesToWidgetTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return formatWidgetTime(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`);
}

/** One timed item of a day, unified from the three schedule
 * stores — every timed item with its kind, its completion state
 * and its sub line (location, else notes). Holidays are not
 * items on his list and never enter it. `hasEnd` keeps the
 * stored end distinct from the rule's default (+30/+60): a
 * point item (no stored end) counts as "over" once it has
 * started, an item with a stored end only once that end has
 * passed.
 *
 * (This collection was buildUpNextSnapshot's inline `raw` list
 * through v461 — hoisted in v462 so the Daily Breakdown builder
 * reads the very same day, and tomorrow's, from the one
 * construction. The outputs are unchanged.) */
interface RawDayItem {
  id: string;
  kind: "todo" | "event" | "ministry";
  title: string;
  startMinutes: number;
  endMinutes: number;
  hasEnd: boolean;
  completed: boolean;
  sub: string;
}

function collectDayItems(
  events: ScheduleEvent[],
  todos: ScheduleTodo[],
  ministries: ScheduleMinistry[],
  dateIso: string,
  people: Person[],
): RawDayItem[] {
  const dayEvents = getEventsForDate(events, dateIso);
  const dayTodos = getTodosForDate(todos, dateIso);
  const dayMinistries = getMinistriesForDate(ministries, dateIso);
  // v445: the sub line's last resort is the item's linked
  // people — their first names, joined ", " — used only when
  // the item's own fields (location / notes) are empty. Feed
  // carries Aaron this way in the approved mockup: the todo's
  // linked person, not a note.
  const linkedNames = (ids: string[] | undefined): string => {
    if (!ids || ids.length === 0) return "";
    return ids
      .map((id) => people.find((person) => person.id === id))
      .filter((person): person is Person => !!person)
      .map((person) => firstNameOf(person.name))
      .join(", ");
  };
  const composeSub = (fields: Array<string | undefined>, ids: string[] | undefined): string => {
    for (const field of fields) {
      if (field && field.trim()) return field;
    }
    return linkedNames(ids);
  };
  return [
    ...dayTodos
      .filter((todo) => todo.startTime)
      .map((todo) => ({
        id: todo.id,
        kind: "todo" as const,
        title: todo.title,
        startMinutes: upNextMinutes(todo.startTime as string),
        endMinutes: upNextEndMinutes("todo", todo.startTime as string, todo.endTime),
        hasEnd: !!todo.endTime,
        completed: todo.isCompleted,
        sub: composeSub([todo.notes], todo.linkedPeopleIds),
      })),
    ...dayEvents
      .filter((event) => event.startTime && !event.isHoliday)
      .map((event) => ({
        id: event.id,
        kind: "event" as const,
        title: event.title,
        startMinutes: upNextMinutes(event.startTime as string),
        endMinutes: upNextEndMinutes("event", event.startTime as string, event.endTime),
        hasEnd: !!event.endTime,
        completed: event.isCompleted,
        sub: composeSub([event.location, event.notes], event.linkedPeopleIds),
      })),
    ...dayMinistries
      .filter((ministry) => ministry.startTime)
      .map((ministry) => ({
        id: ministry.id,
        kind: "ministry" as const,
        title: ministry.title,
        startMinutes: upNextMinutes(ministry.startTime as string),
        endMinutes: upNextEndMinutes("ministry", ministry.startTime as string, ministry.endTime),
        hasEnd: !!ministry.endTime,
        completed: ministry.isCompleted,
        sub: composeSub([ministry.location, ministry.notes], ministry.linkedPeopleIds),
      })),
  ];
}

export function buildUpNextSnapshot(
  events: ScheduleEvent[],
  todos: ScheduleTodo[],
  ministries: ScheduleMinistry[],
  todayIso: string,
  now: Date,
  people: Person[] = [],
  /** v464: the stores the day-done turn reads beyond the day
   * itself — the fasts (the closed line's fast clause, the
   * fast foot) and the study store + imports (the Study
   * rows). Optional so the long-standing call shape stands;
   * buildAllWidgetSnapshots passes the real stores. Without
   * them the fast/study fields ride null and the rest of the
   * turn (tomorrow's rail, the tally, tomorrow's prayers)
   * still composes whole. */
  extras?: { fasts?: PersonalFast[]; studyState?: StudyState; imports?: StudioImportsMap },
): UpNextWidgetSnapshot {
  const dayEvents = getEventsForDate(events, todayIso);
  const dayTodos = getTodosForDate(todos, todayIso);
  const dayMinistries = getMinistriesForDate(ministries, todayIso);
  const candidates: UpNextCandidate[] = [
    ...dayTodos
      .filter((todo) => todo.startTime && !todo.isCompleted)
      .map((todo) => ({
        kind: "todo" as const,
        item: { id: todo.id, title: todo.title, startTime: todo.startTime as string, endTime: todo.endTime, color: todo.color },
      })),
    ...dayEvents
      .filter((event) => event.startTime && !event.isCompleted && !event.isHoliday)
      .map((event) => ({
        kind: "event" as const,
        item: { id: event.id, title: event.title, startTime: event.startTime as string, endTime: event.endTime, color: event.color },
      })),
    ...dayMinistries
      .filter((ministry) => ministry.startTime && !ministry.isCompleted)
      .map((ministry) => ({
        kind: "ministry" as const,
        item: { id: ministry.id, title: ministry.title, startTime: ministry.startTime as string, endTime: ministry.endTime, color: ministry.color },
      })),
  ];
  const allTimed: UpNextItem[] = [...dayEvents, ...dayTodos, ...dayMinistries]
    .filter((item) => item.startTime)
    .map((item) => ({
      id: item.id,
      title: item.title,
      startTime: item.startTime as string,
      endTime: item.endTime,
    }));
  const nowMin = now.getHours() * 60 + now.getMinutes();
  // The next thing is the schedule tab's own pick
  // (buildUpNextGroup's lead) — the list is built around it,
  // never a second opinion. The group only ever names a strictly
  // future item, so it can be null while a current still runs.
  const group = buildUpNextGroup(candidates, allTimed, nowMin);
  const heroId = group ? group.entries[0].item.id : null;

  const raw: RawDayItem[] = collectDayItems(events, todos, ministries, todayIso, people);

  // ── v464: the day-done turn's payload (UN-T5) — computed on
  // every build, spent or not; the RENDERER decides the turn
  // from the device clock, exactly as the Daily Breakdown's
  // evening turn rides its snapshot. ──
  const toDayItem = (item: RawDayItem): UpNextDayItem => ({
    title: item.title,
    sub: item.sub,
    startMinutes: item.startMinutes,
    endMinutes: item.endMinutes,
    hasEnd: item.hasEnd,
    completed: item.completed,
  });
  const dayItems: UpNextDayItem[] = raw.map(toDayItem);
  const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowIso = formatDateLocal(tomorrowDate);
  const tomorrowItems: UpNextDayItem[] = collectDayItems(
    events,
    todos,
    ministries,
    tomorrowIso,
    people,
  ).map(toDayItem);
  // The closed line's tally — the Schedule summary bar's own
  // arithmetic (schedule-tab): the todo counts by
  // getTodoSummaryCounts over today's todos, plus today's
  // events whole (getEventsForDate — no holiday filter, the
  // bar's own pool).
  const todoCounts = getTodoSummaryCounts(dayTodos);
  const closedTotal = todoCounts.total + dayEvents.length;
  const closedDone =
    todoCounts.completed + dayEvents.filter((event) => event.isCompleted).length;
  const fasts = extras?.fasts ?? [];
  const todayFastSnap = buildFastSnapshot(fasts, null, todayIso);
  const closedToday: UpNextTomorrowFields["closedToday"] =
    closedTotal > 0
      ? {
          done: closedDone,
          total: closedTotal,
          fastDay: todayFastSnap.state === "active" ? todayFastSnap.dayNumber : null,
        }
      : null;
  const tomorrowFastSnap = buildFastSnapshot(fasts, null, tomorrowIso);
  const tomorrowFast: UpNextTomorrowFields["tomorrowFast"] =
    tomorrowFastSnap.state === "active" ? { dayNumber: tomorrowFastSnap.dayNumber } : null;
  // The Study rows — the Study section's own derivations, read
  // for tomorrow's face: the reading position (target, else
  // last read) and the writing track's next unwritten chapter
  // in the writing book (currentBook, else the grouped current
  // head — buildStudySnapshot's book pick, verbatim).
  let tomorrowStudy: UpNextTomorrowFields["tomorrowStudy"] = null;
  if (extras?.studyState) {
    const studyState = extras.studyState;
    const imports = extras.imports ?? {};
    const position = getReadingPosition(studyState);
    const readingBook = position.target?.book ?? position.lastRead?.book ?? null;
    const readingChapter = position.target?.chapter ?? position.lastRead?.chapter ?? null;
    const reading =
      readingBook && readingChapter != null ? `${readingBook} ${readingChapter}` : null;
    let writeBook: string | null = studyState.currentBook;
    if (!writeBook) {
      const grouped = groupBooksByStudy(studyState, [...BIBLE_BOOKS], imports);
      writeBook = grouped.current[0] ?? null;
    }
    let writeNext: string | null = null;
    if (writeBook) {
      const writeTotal = chapterCountFor(writeBook);
      if (writeTotal) {
        for (let chapter = 1; chapter <= writeTotal; chapter++) {
          if (!chapterIsWritten(studyState, writeBook, chapter, imports)) {
            writeNext = `${writeBook} ${chapter}`;
            break;
          }
        }
      }
    }
    if (reading || writeNext) tomorrowStudy = { reading, writeNext };
  }
  // Tomorrow's prayers — the Daily Breakdown pray composition
  // against TOMORROW's queue: tomorrow's list, tomorrow's
  // progress total, the emergency that still stands into
  // tomorrow leading in the Emergency red.
  let tomorrowPray: UpNextTomorrowFields["tomorrowPray"] = null;
  {
    const tList = getPrayTodayList(people, tomorrowDate.getDay(), tomorrowDate.getDate());
    const tEmergencies = getAllActiveEmergencyPrayers(people)
      .filter((entry) => {
        const expiresAt = entry.item.emergencyExpiresAt;
        return !expiresAt || new Date(expiresAt).getTime() > tomorrowDate.getTime();
      })
      .slice()
      .sort(
        (a, b) =>
          new Date(a.item.emergencyExpiresAt ?? 0).getTime() -
          new Date(b.item.emergencyExpiresAt ?? 0).getTime(),
      );
    const tLeadEmergency = tEmergencies[0] ?? null;
    if (tList.length > 0 || tLeadEmergency) {
      const progress = getDailyPrayerProgress(
        tList,
        tomorrowDate.getDay(),
        tomorrowDate.getDate(),
      );
      const ordered = sortQueueFaces(tList, tomorrowIso);
      const faces: BreakdownFace[] = [];
      if (tLeadEmergency) {
        faces.push({
          ...faceOf(tLeadEmergency.person),
          color: BREAKDOWN_EMERGENCY_RED,
          emergency: true,
        });
      }
      for (const person of ordered) {
        if (faces.length >= 3) break;
        if (tLeadEmergency && person.id === tLeadEmergency.person.id) continue;
        faces.push(faceOf(person));
      }
      const count =
        progress.total > 0 ? progress.total : Math.max(tList.length, faces.length);
      const leadPerson = tLeadEmergency?.person ?? ordered[0] ?? null;
      if (leadPerson) {
        tomorrowPray = {
          count,
          faces,
          leadFirstName: firstNameOf(leadPerson.name),
          leadEmergency: !!tLeadEmergency,
        };
      }
    }
  }
  const tomorrowFields: UpNextTomorrowFields = {
    tomorrowDateIso: tomorrowIso,
    tomorrowItems,
    closedToday,
    tomorrowStudy,
    tomorrowPray,
    tomorrowFast,
  };

  // Current: the uncompleted timed item running right now. When
  // several overlap, the latest start wins; a tie keeps the
  // day's own order (the stable sort never reorders equals, and
  // the raw list is built todos → events → ministries, the same
  // pool order the group builder reads).
  const current =
    raw
      .filter((item) => !item.completed && item.startMinutes <= nowMin && nowMin < item.endMinutes)
      .sort((a, b) => b.startMinutes - a.startMinutes)[0] ?? null;

  // Next: uncompleted, strictly in the future — the same pool
  // the Up Next group draws from, so the hero leads it and the
  // sequence behind it is the day's remaining count.
  const ahead = raw
    .filter((item) => !item.completed && item.startMinutes > nowMin)
    .sort((a, b) => a.startMinutes - b.startMinutes);
  const heroIndex = heroId ? ahead.findIndex((item) => item.id === heroId) : -1;
  const sequence = heroIndex >= 0 ? ahead.slice(heroIndex) : [];
  const next1 = sequence[0] ?? null;
  const next2 = sequence[1] ?? null;

  // Nothing running and nothing ahead: the quiet face, even
  // when a last exists — the day is over, not upcoming.
  // v464: the none state carries the day whole and the turn's
  // payload — the renderer may still turn this face to
  // tomorrow (UN-T5) once the device clock says spent.
  if (!current && !next1) {
    return { state: "none", dateIso: todayIso, dayItems, ...tomorrowFields };
  }

  // Last: the most recent timed item that is over, excluding
  // whatever was chosen as current/next. "Over" and "most
  // recent" both read on the item's own clock: the stored end
  // when it has one, its start when it doesn't.
  const chosen = new Set(
    [current?.id, next1?.id, next2?.id].filter((id): id is string => !!id),
  );
  const overAt = (item: RawDayItem) => (item.hasEnd ? item.endMinutes : item.startMinutes);
  const last =
    raw
      .filter((item) => !chosen.has(item.id) && overAt(item) <= nowMin)
      .sort((a, b) => overAt(b) - overAt(a) || b.startMinutes - a.startMinutes)[0] ?? null;

  const entries: UpNextDayEntry[] = [];
  if (last) {
    entries.push({
      kind: "last",
      title: last.title,
      ...(last.sub ? { sub: last.sub } : {}),
      timeLabel: minutesToWidgetTime(last.startMinutes),
      completed: last.completed,
    });
  }
  if (current) {
    entries.push({
      kind: "current",
      title: current.title,
      ...(current.sub ? { sub: current.sub } : {}),
      timeLabel: minutesToWidgetTime(current.startMinutes),
    });
  }
  if (next1) {
    entries.push({
      kind: "next",
      title: next1.title,
      ...(next1.sub ? { sub: next1.sub } : {}),
      timeLabel: minutesToWidgetTime(next1.startMinutes),
      startMinutes: next1.startMinutes,
      isHero: true,
    });
  }
  if (next1 && next2) {
    const gapMinutes = next2.startMinutes - next1.endMinutes;
    if (gapMinutes >= 15) {
      entries.push({ kind: "gap", text: `${formatOpenDuration(gapMinutes)} open` });
    }
    entries.push({
      kind: "next",
      title: next2.title,
      ...(next2.sub ? { sub: next2.sub } : {}),
      timeLabel: minutesToWidgetTime(next2.startMinutes),
      startMinutes: next2.startMinutes,
    });
  }

  const lastAhead = sequence[sequence.length - 1];
  return {
    state: "next",
    entries,
    leftCount: sequence.length,
    endNote: lastAhead ? `Nothing after ${minutesToWidgetTime(lastAhead.endMinutes)}` : null,
    dateIso: todayIso,
    // v445: the whole day in its own order (raw is built todos
    // → events → ministries and never re-sorted), so the
    // renderer can recompute the rows from the device clock.
    dayItems,
    // v464: the day-done turn's payload rides the next state
    // too — a day can be spent with a "next" snapshot standing
    // (everything checked off early, say), and the turn reads
    // the same fields from either state.
    ...tomorrowFields,
  };
}

// ─── 6. Your Study ──────────────────────────────────────────────────────────

/** His notes in one chapter: entries that carry blocks (the data
 * layer's own definition — chapterDataHasNotes counts an entry as
 * a note only when it carries blocks). */
export function countChapterNotes(data: V205ChapterData | null): number | null {
  if (!data) return null;
  let count = 0;
  for (const section of data.sections) {
    for (const entry of section.entries) {
      if (entry.blocks.length > 0) count += 1;
    }
  }
  return count;
}

export type StudyWidgetSnapshot =
  | { state: "none" }
  | {
      state: "active";
      book: string;
      /** v442 (W-4 D-6): the book's own ROYGBIV colour as one hex
       * — the tile and the progress bar wear it (a meaning hue:
       * it never derives from the palette). Same value as
       * colorPrimary, carried under the drawing's name. */
      bookColor: string;
      /** v444: the book's ROYGBIV primary in its TRUE (light-set)
       * form. bookColor/colorPrimary ride the dark-appearance
       * set (the primary mixed toward white for dark fields) —
       * right for Your Study's dress, but the Reading strip's
       * tile is pinned to the solid primary in every state
       * (ST-2, Jonathan Nov 5), so the true value rides too. */
      bookPrimary: string;
      /** The book's ROYGBIV set (dark appearance — widgets sit on
       * the home screen's dark field in his dress). */
      colorPrimary: string;
      colorDeep: string;
      colorTint: string;
      /** The next chapter to write; null when the book is fully
       * written. */
      nextChapter: number | null;
      /** KJV first verse of the next-to-write chapter, from the
       * resolved data's embedded verses — null where the data
       * carries no verse text (the row is dropped, never filled). */
      verseText: string | null;
      verseRef: string | null;
      /** The last chapter he completed in this book (the study
       * store's lastRead when it names this book, else the highest
       * written chapter) and its note count. */
      lastWrittenChapter: number | null;
      lastWrittenNotes: number | null;
      /** The restudy queue's head, in restudyQueueSummary's words. */
      restudyLine: string | null;
      chaptersWritten: number;
      totalChapters: number;
      /** v445: the READING track, from the app's authoritative
       * reading position (lib/bible-v205/position —
       * getReadingPosition): where he IS reading, as opposed to
       * the writing fields above (nextChapter / lastWritten are
       * the WRITING track). The Reading strip reads these since
       * v445, the big Your Study widget since v446; his words:
       * "I don't need to know how many I've written. I need to
       * know where I'm at reading." Null when the position
       * names nothing. */
      readingBook: string | null;
      /** The chapter he reads next (the position's target), or
       * the last chapter read when the target rests. */
      readingChapter: number | null;
      /** True when readingChapter came from the target. */
      readingFromTarget: boolean;
      readingTotalChapters: number | null;
      /** readingBook's true (light-set) ROYGBIV primary. */
      readingBookPrimary: string | null;
      /** v446: how many of readingBook's chapters are covered
       * by reading evidence — its read marks UNION every
       * chapter at or below the position stamp's floor when
       * the stamp names this book (position.ts's coverage
       * rule, mirrored). The big Your Study widget's "chapters
       * read" count and its progress fraction. Null when no
       * reading book is named. */
      readingChaptersRead: number | null;
      /** v446: the furthest chapter he has marked READ
       * (position.lastRead), with its date — the big widget's
       * "Last read" line. Null when nothing has been read. */
      readingLastRead: { book: string; chapter: number; date: string } | null;
      /** v446: readingBook's ROYGBIV tint (the dark-appearance
       * set's tintA) — the wavy progress line's track colour in
       * the big widget's reading dress. */
      readingBookTint: string | null;
    };

export function buildStudySnapshot(
  studyState: StudyState,
  imports: StudioImportsMap,
  resolveChapter: (book: string, chapter: number) => V205ChapterData | null,
): StudyWidgetSnapshot {
  let book: string | null = studyState.currentBook;
  if (!book) {
    const grouped = groupBooksByStudy(studyState, [...BIBLE_BOOKS], imports);
    book = grouped.current[0] ?? null;
  }
  if (!book) return { state: "none" };
  const totalChapters = chapterCountFor(book);
  if (!totalChapters) return { state: "none" };
  const chaptersWritten = bookWrittenCount(studyState, book, imports);
  let nextChapter: number | null = null;
  for (let chapter = 1; chapter <= totalChapters; chapter++) {
    if (!chapterIsWritten(studyState, book, chapter, imports)) {
      nextChapter = chapter;
      break;
    }
  }
  let verseText: string | null = null;
  let verseRef: string | null = null;
  if (nextChapter != null) {
    const data = resolveChapter(book, nextChapter);
    const verse = data?.verses?.[1];
    if (typeof verse === "string" && verse.trim()) {
      verseText = verse.trim();
      verseRef = `${book} ${nextChapter}:1`;
    }
  }
  let lastWrittenChapter: number | null = null;
  if (studyState.lastRead && studyState.lastRead.book === book) {
    lastWrittenChapter = studyState.lastRead.chapter;
  } else {
    for (let chapter = totalChapters; chapter >= 1; chapter--) {
      if (chapterIsWritten(studyState, book, chapter, imports)) {
        lastWrittenChapter = chapter;
        break;
      }
    }
  }
  const lastWrittenNotes =
    lastWrittenChapter != null ? countChapterNotes(resolveChapter(book, lastWrittenChapter)) : null;
  const restudy = restudyQueueSummary(studyState);
  const colors = bookColorsFor(book, true);
  const solidColors = bookColorsFor(book, false);
  // v445: the reading position rides alongside the writing
  // fields — computed from the same study store through the
  // app's own resolver, never derived from the writing track.
  const position = getReadingPosition(studyState);
  const readingBook = position.target?.book ?? position.lastRead?.book ?? null;
  const readingChapter = position.target?.chapter ?? position.lastRead?.chapter ?? null;
  const readingFromTarget = position.target != null;
  const readingTotalRaw = readingBook ? chapterCountFor(readingBook) : null;
  const readingTotalChapters = readingTotalRaw ? readingTotalRaw : null;
  const readingBookPrimary = readingBook ? (bookColorsFor(readingBook, false)?.primary ?? null) : null;
  // v446: the reading evidence over the reading book — read
  // marks union the stamp floor, position.ts's coverage rule —
  // and the last-read mark itself, for the big Your Study
  // widget's reading dress (v445 gave the strip the position;
  // the big widget still rendered the writing track).
  let readingChaptersRead: number | null = null;
  if (readingBook && readingTotalChapters) {
    const covered = new Set<number>();
    for (const [key] of Object.entries(studyState.reads ?? {})) {
      const cut = key.lastIndexOf("|");
      if (cut <= 0) continue;
      if (key.slice(0, cut) !== readingBook) continue;
      const chapter = Number(key.slice(cut + 1));
      if (Number.isInteger(chapter) && chapter >= 1 && chapter <= readingTotalChapters) {
        covered.add(chapter);
      }
    }
    const stamp = studyState.lastRead;
    if (stamp && stamp.book === readingBook) {
      const floor = Math.min(stamp.chapter, readingTotalChapters);
      for (let chapter = 1; chapter <= floor; chapter += 1) covered.add(chapter);
    }
    readingChaptersRead = covered.size;
  }
  const readingLastRead = position.lastRead
    ? { book: position.lastRead.book, chapter: position.lastRead.chapter, date: position.lastRead.date ?? "" }
    : null;
  const readingBookTint = readingBook ? (bookColorsFor(readingBook, true)?.tintA ?? null) : null;
  return {
    state: "active",
    book,
    bookColor: colors?.primary ?? "#A78BFA",
    bookPrimary: solidColors?.primary ?? colors?.primary ?? "#A78BFA",
    colorPrimary: colors?.primary ?? "#A78BFA",
    colorDeep: colors?.deep ?? "#7C5CD6",
    colorTint: colors?.tintA ?? "#332A55",
    nextChapter,
    verseText,
    verseRef,
    lastWrittenChapter,
    lastWrittenNotes,
    restudyLine: restudy?.line ?? null,
    chaptersWritten,
    totalChapters,
    readingBook,
    readingChapter,
    readingFromTarget,
    readingTotalChapters,
    readingBookPrimary,
    readingChaptersRead,
    readingLastRead,
    readingBookTint,
  };
}

// ─── 7. Daily Breakdown (v462, DB-9 — the Brief List) ───────────────────────
//
// The twelfth widget is a MERGE, not a new data source: one card,
// an open list of rows — pray, reach, schedule, fast — each row
// computed from the same selectors the sections above use, in
// the approved drawing's order (daily-breakdown-widget-concepts
// -v3.html: "DB-9 · The Brief List, Complete" and its companion
// "DB-9 · After the Day Ends"). There is NO garden row: the app
// carries no weather feed, and he knows that row lands a step
// behind — the row order leaves its seat between the schedule
// and the fast for when it does.
//
// v478 — the weather header's data. The feed the paragraph
// above waited on landed in v472 (the morning pack's weather
// section, lib/weather-snapshot.ts — the store the Daily
// Summary's clause reads), and the header is what it feeds:
// not the garden row (its seat between schedule and fast
// stays empty — a weather snapshot is not a garden feed),
// but a line at the card's very top, At a Glance style. The
// snapshot carries the weather VERBATIM — preparedAt, now,
// days — and the renderer decides the face from the device
// clock, the Up Next pattern: the "now" temp by day,
// tomorrow's high/low from 18:00, nothing at all when the
// snapshot is stale or covers neither date.
// v479 — the pack's hourly curve rides verbatim too, when
// the snapshot carries one, and the renderer's daytime face
// prefers the curve's point for the current hour (the one
// lookup in lib/weather-snapshot.ts, mirrored in Kotlin).
//
// Evening: the snapshot carries the day whole (dayItems, the
// Up Next shape) plus tomorrow's first timed item, so the
// renderer can turn the card on the system's own refresh —
// when every one of today's windows has passed, pray and reach
// drop and the schedule row names tomorrow's first thing.

/** The Emergency red a face wears in the breakdown's stack —
 * the v435 banner gradient's head red, the app's own emergency
 * hue (widget_bg_emergency carries it). A meaning hue: it
 * never derives from the palette. */
export const BREAKDOWN_EMERGENCY_RED = "#B91C1C";

/** One face in the breakdown's pray stack. `emergency` marks
 * the lead seat — the live emergency's person, first in the
 * stack, wearing the Emergency red above in place of their
 * own colour. */
export interface BreakdownFace extends WidgetFace {
  emergency?: boolean;
}

export interface BreakdownPray {
  /** The day's count, for the title — "Pray for {count} today"
   * (or "Prayed for {count} today" once all are prayed). */
  count: number;
  title: string;
  /** "{first} leads — emergency" / "{first} leads — {need}" /
   * "" once the day is prayed. Composed here, printed verbatim
   * by the renderer — the Reach Out rule. */
  sub: string;
  /** Up to three faces: the emergency's person first when one
   * is live, then the queue's own order (sortQueueFaces). */
  faces: BreakdownFace[];
  /** The row's tap door: the emergency person's id when an
   * emergency leads, else the next unprayed person's, else
   * null (the day prayed — the row taps through to the app,
   * the Pray Today widget's complete grain). */
  personId: string | null;
  kind: "emergency" | "today" | null;
}

export interface BreakdownReach extends WidgetFace {
  name: string;
  /** Days since the last reach — getDueReachOut's own figure,
   * the Reach Out snapshot's `days`. */
  days: number;
  /** "Reach {firstName}" — composed here. */
  title: string;
  /** "Due — {days} day(s) since last reached" — composed here. */
  sub: string;
}

export interface BreakdownSchedule {
  /** The day this schedule describes (todayIso) — the renderer
   * only trusts the evening turn when it equals the device's
   * current local date. */
  dateIso: string;
  /** EVERY timed item of the day, the Up Next dayItems shape —
   * the renderer picks the current/next item from these at
   * render time and measures the evening turn from their
   * windows (the baked endMinutes: stored end, else the
   * per-kind +30/+60 rule — the v455 window convention). */
  dayItems: UpNextDayItem[];
  /** Tomorrow's first timed item; null when tomorrow holds
   * none (the row then reads "Tomorrow is clear"). */
  tomorrowFirst: { title: string; timeLabel: string } | null;
  /** v470: how many timed items tomorrow holds in all — the
   * count of the very collection tomorrowFirst is drawn from
   * (collectDayItems for tomorrow: events + todos +
   * ministries, holidays never items). The renderer's
   * Tomorrow row (DB-T3) counts the day from it ("· {N}
   * things all day"); it is 0 exactly when tomorrowFirst is
   * null, and positive exactly when it stands. */
  tomorrowCount: number;
  /** The current reading, "{Book} {chapter}" from the reading
   * position (getReadingPosition — the Study section's
   * authority) — the renderer appends it to the schedule
   * row's sub as "{Book} {chapter} to read". Null when no
   * reading position stands. */
  reading: string | null;
}

export interface BreakdownFast {
  dayNumber: number;
  totalDays: number;
  /** Days left after today (totalDays − dayNumber). */
  daysLeft: number;
  name: string;
}

/** v478 — the Daily Breakdown's weather section: the morning
 * pack's snapshot (lib/weather-snapshot.ts), carried verbatim.
 * `now` is null when the pack carried only forecast days. The
 * builder judges nothing here — the renderer reads the
 * section against the device clock and the weather's own
 * staleness rule, exactly as it reads the day whole.
 * v479 — `hourly` rides the same way when the store's
 * snapshot carries the curve: verbatim, and ABSENT (never an
 * empty list) when it does not, so a pre-curve pack's
 * snapshot stays byte-identical to v478's. */
export interface BreakdownWeather {
  preparedAt: string;
  now: { date: string; tempF: number; condition: string } | null;
  days: { date: string; highF: number; lowF: number; condition: string }[];
  hourly?: { at: string; tempF: number; condition: string }[];
}

export type DailyBreakdownWidgetSnapshot =
  | { state: "none" }
  | {
      state: "day";
      dateIso: string;
      /** Null when the queue is empty and no emergency is live. */
      pray: BreakdownPray | null;
      /** Null when nobody is due to reach — the row is gone,
       * never a placeholder. */
      reach: BreakdownReach | null;
      schedule: BreakdownSchedule;
      /** Null when no fast is active (the Your Fast quiet grain:
       * the row drops from the list). */
      fast: BreakdownFast | null;
      /** v478: the weather section for the header — null when
       * no weather snapshot stands in the store (the header is
       * absent then, never a placeholder). Weather alone never
       * stands the day: a snapshot with no rows keeps the
       * quiet face, header and all. */
      weather: BreakdownWeather | null;
    };

export function buildDailyBreakdownSnapshot(
  people: Person[],
  events: ScheduleEvent[],
  todos: ScheduleTodo[],
  ministries: ScheduleMinistry[],
  fasts: PersonalFast[],
  studyState: StudyState,
  now: Date,
  /** v478: the weather store's snapshot, loaded by the push
   * layer from prayercircle.weather.v1 — null when none
   * stands. Carried through verbatim for the header. */
  weather: WeatherSnapshot | null = null,
): DailyBreakdownWidgetSnapshot {
  const todayIso = formatDateLocal(now);
  const tomorrowIso = formatDateLocal(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
  );

  // ── Pray: the queue's own sources, the emergency's lead. ──
  const list = getPrayTodayList(people, now.getDay(), now.getDate());
  const emergencies = getAllActiveEmergencyPrayers(people)
    .slice()
    .sort(
      (a, b) =>
        new Date(a.item.emergencyExpiresAt ?? 0).getTime() -
        new Date(b.item.emergencyExpiresAt ?? 0).getTime(),
    );
  const leadEmergency = emergencies[0] ?? null;
  let pray: BreakdownPray | null = null;
  if (list.length > 0 || leadEmergency) {
    const progress = getDailyPrayerProgress(list, now.getDay(), now.getDate());
    const ordered = sortQueueFaces(list, todayIso);
    const faces: BreakdownFace[] = [];
    if (leadEmergency) {
      // The emergency's person leads the stack, wearing the
      // Emergency red — the drawing's first face.
      faces.push({
        ...faceOf(leadEmergency.person),
        color: BREAKDOWN_EMERGENCY_RED,
        emergency: true,
      });
    }
    for (const person of ordered) {
      if (faces.length >= 3) break;
      if (leadEmergency && person.id === leadEmergency.person.id) continue;
      faces.push(faceOf(person));
    }
    // The Pray Today count: the scheduled progress total when
    // it stands, else the list itself (an emergency/praise-only
    // day), never fewer than the faces that stood in it.
    const count =
      progress.total > 0 ? progress.total : Math.max(list.length, faces.length);
    const nextPerson =
      ordered.find((person) => !hasPersonCompletedPrayerToday(person, todayIso)) ?? null;
    if (leadEmergency) {
      pray = {
        count,
        title: `Pray for ${count} today`,
        sub: `${firstNameOf(leadEmergency.person.name)} leads — emergency`,
        faces,
        personId: leadEmergency.person.id,
        kind: "emergency",
      };
    } else if (nextPerson) {
      const item = leadPrayerItem(nextPerson);
      const first = firstNameOf(nextPerson.name);
      pray = {
        count,
        title: `Pray for ${count} today`,
        sub: item?.title ? `${first} leads — ${item.title}` : `${first} leads`,
        faces,
        personId: nextPerson.id,
        kind: "today",
      };
    } else {
      // The whole list prayed: the row stands in the past
      // tense and its tap is the app itself.
      pray = {
        count,
        title: `Prayed for ${count} today`,
        sub: "",
        faces,
        personId: null,
        kind: null,
      };
    }
  }

  // ── Reach: the due set's head, only when someone is due. ──
  const due = getDueReachOut(people, now);
  const leadDue = due[0] ?? null;
  const reach: BreakdownReach | null = leadDue
    ? {
        ...faceOf(leadDue.person),
        // The drawing's reach face stands on the reached green
        // (JOURNAL_KIND_HUES.reached — the palette's green
        // source), not the person's own colour.
        color: JOURNAL_KIND_HUES.reached,
        name: leadDue.person.name,
        days: leadDue.days,
        title: `Reach ${firstNameOf(leadDue.person.name)}`,
        sub: `Due — ${leadDue.days} day${leadDue.days === 1 ? "" : "s"} since last reached`,
      }
    : null;

  // ── Schedule: the day whole, tomorrow's first, the reading. ──
  const toDayItem = (item: RawDayItem): UpNextDayItem => ({
    title: item.title,
    sub: item.sub,
    startMinutes: item.startMinutes,
    endMinutes: item.endMinutes,
    hasEnd: item.hasEnd,
    completed: item.completed,
  });
  const dayItems = collectDayItems(events, todos, ministries, todayIso, people).map(toDayItem);
  const tomorrowItems = collectDayItems(events, todos, ministries, tomorrowIso, people);
  const firstTomorrow =
    tomorrowItems
      .slice()
      .sort((a, b) => a.startMinutes - b.startMinutes)[0] ?? null;
  const position = getReadingPosition(studyState);
  const readingBook = position.target?.book ?? position.lastRead?.book ?? null;
  const readingChapter = position.target?.chapter ?? position.lastRead?.chapter ?? null;
  const schedule: BreakdownSchedule = {
    dateIso: todayIso,
    dayItems,
    tomorrowFirst: firstTomorrow
      ? { title: firstTomorrow.title, timeLabel: minutesToWidgetTime(firstTomorrow.startMinutes) }
      : null,
    tomorrowCount: tomorrowItems.length,
    reading:
      readingBook && readingChapter != null ? `${readingBook} ${readingChapter}` : null,
  };

  // ── Fast: the Your Fast builder's own math, hearts aside. ──
  const fastSnap = buildFastSnapshot(fasts, null, todayIso);
  const fast: BreakdownFast | null =
    fastSnap.state === "active"
      ? {
          dayNumber: fastSnap.dayNumber,
          totalDays: fastSnap.totalDays,
          daysLeft: fastSnap.daysLeft,
          name: fastSnap.name,
        }
      : null;

  // ── Weather: the morning pack's snapshot, verbatim (v478). ──
  // The same values the store holds — the header's face is the
  // renderer's call, made from the device clock; nothing here
  // is rounded, reworded or judged.
  const weatherSection: BreakdownWeather | null = weather
    ? {
        preparedAt: weather.preparedAt,
        now: weather.now
          ? { date: weather.now.date, tempF: weather.now.tempF, condition: weather.now.condition }
          : null,
        days: weather.days.map((day) => ({
          date: day.date,
          highF: day.highF,
          lowF: day.lowF,
          condition: day.condition,
        })),
        // v479: the curve, verbatim, only when the store's
        // snapshot carries one (the key itself stays absent
        // otherwise — see the interface note).
        ...(weather.hourly
          ? {
              hourly: weather.hourly.map((entry) => ({
                at: entry.at,
                tempF: entry.tempF,
                condition: entry.condition,
              })),
            }
          : {}),
      }
    : null;

  if (!pray && !reach && !fast && dayItems.length === 0 && !schedule.tomorrowFirst) {
    return { state: "none" };
  }
  return { state: "day", dateIso: todayIso, pray, reach, schedule, fast, weather: weatherSection };
}

// ─── The whole set ──────────────────────────────────────────────────────────

export interface AllWidgetSnapshots {
  prayToday: PrayTodayWidgetSnapshot;
  emergency: EmergencyWidgetSnapshot;
  fast: FastWidgetSnapshot;
  reachOut: ReachOutWidgetSnapshot;
  upNext: UpNextWidgetSnapshot;
  study: StudyWidgetSnapshot;
  dailyBreakdown: DailyBreakdownWidgetSnapshot;
}

/** Every store the builders read, in one plain input — the push
 * layer (lib/widget-push.tsx) fills it from AsyncStorage; tests
 * fill it from fixtures. */
export interface WidgetSnapshotInputs {
  people: Person[];
  fasts: PersonalFast[];
  xpRaw: unknown;
  events: ScheduleEvent[];
  todos: ScheduleTodo[];
  ministries: ScheduleMinistry[];
  studyState: StudyState;
  imports: StudioImportsMap;
  resolveChapter: (book: string, chapter: number) => V205ChapterData | null;
  now: Date;
  /** v478: the weather store's snapshot — the push layer fills
   * it from prayercircle.weather.v1; tests may omit it (the
   * breakdown then carries no weather section). */
  weather?: WeatherSnapshot | null;
}

export function buildAllWidgetSnapshots(input: WidgetSnapshotInputs): AllWidgetSnapshots {
  const todayIso = formatDateLocal(input.now);
  return {
    prayToday: buildPrayTodaySnapshot(input.people, input.now),
    emergency: buildEmergencySnapshot(input.people, input.now),
    fast: buildFastSnapshot(input.fasts, input.xpRaw, todayIso),
    reachOut: buildReachOutSnapshot(input.people, input.now),
    upNext: buildUpNextSnapshot(input.events, input.todos, input.ministries, todayIso, input.now, input.people, {
      fasts: input.fasts,
      studyState: input.studyState,
      imports: input.imports,
    }),
    study: buildStudySnapshot(input.studyState, input.imports, input.resolveChapter),
    dailyBreakdown: buildDailyBreakdownSnapshot(
      input.people,
      input.events,
      input.todos,
      input.ministries,
      input.fasts,
      input.studyState,
      input.now,
      input.weather ?? null,
    ),
  };
}

/** v438: the ONE JSON document the native providers read — the
 * scheme their tap intents are built from, plus the snapshots
 * under their builder keys (WidgetRenderer.kt reads exactly
 * these). Pure: the push layer only adds the storage reads.
 *
 * v441: the document also carries the widget palette
 * (lib/widget-palette — the app's seed × appearance, derived on
 * this side where the theme machinery lives). v442: all nine
 * widgets dress from the renderer's EFFECTIVE palette — the
 * device's Material You system colours first (resolved in the
 * native process), this snapshot palette as the fallback when
 * the device offers none. v464: the resolution is mode-aware —
 * the device colours the v442 mapping read were the LIGHT
 * assignment in both modes (the system_* resources are tonal
 * ramps, not night-qualified roles), so the document now also
 * carries paletteDark (the seed × dark derivation) and the
 * renderer picks by the device's uiMode: in light the v442
 * order stands; at night paletteDark leads. */
export function serializeWidgetSnapshots(
  snapshots: AllWidgetSnapshots,
  scheme: string,
  palette?: WidgetPalette,
  /** v464: the seed × dark derivation, riding beside the
   * standing palette — the renderer picks between the two by
   * the DEVICE's uiMode at render time, so the widgets follow
   * the phone's dark mode even when the app's own appearance
   * stands elsewhere. */
  paletteDark?: WidgetPalette,
): string {
  return JSON.stringify({
    scheme,
    ...(palette ? { palette } : {}),
    ...(paletteDark ? { paletteDark } : {}),
    ...snapshots,
  });
}

// ─── Deep links (open-to-act) ───────────────────────────────────────────────
// Widget taps are OPEN_URI actions carrying the app's own scheme
// (read from the resolved Expo config at the call sites — the
// scheme is generated from the bundle id in app.config.ts, so it is
// never hardcoded). The shapes are expo-router's: production links
// are <scheme>://<path>, and the root route takes its params in the
// query string (Linking.createURL's own form).

export type WidgetPrayKind = "today" | "emergency";

/** Pray Today / Emergency Pray now: land on the People tab carrying
 * the pray intent the page consumes (see the consumer effect in
 * app/(tabs)/index.tsx). */
export function widgetPrayUri(scheme: string, personId: string, kind: WidgetPrayKind): string {
  return `${scheme}:///?widgetPrayPersonId=${encodeURIComponent(personId)}&widgetPrayKind=${kind}`;
}

export function widgetFastUri(scheme: string): string {
  return `${scheme}://fasting-tracker`;
}

export function widgetReachOutUri(scheme: string): string {
  return `${scheme}://due-to-reach`;
}

/** Up Next lands on the People screen's Schedule tab — the navTab
 * param the screen already honors. */
export function widgetUpNextUri(scheme: string): string {
  return `${scheme}:///?navTab=schedule`;
}

export function widgetStudyUri(scheme: string, book: string, chapter: number): string {
  return `${scheme}://bible-chapter?book=${encodeURIComponent(book)}&chapter=${chapter}`;
}

/** The People page's consumer for the widget pray intent: the pure
 * parse of the route params a widgetPrayUri landing carries. */
export function parseWidgetPrayParams(params: {
  widgetPrayPersonId?: string | string[];
  widgetPrayKind?: string | string[];
}): { personId: string; kind: WidgetPrayKind } | null {
  const personId = Array.isArray(params.widgetPrayPersonId)
    ? params.widgetPrayPersonId[0]
    : params.widgetPrayPersonId;
  const kindRaw = Array.isArray(params.widgetPrayKind)
    ? params.widgetPrayKind[0]
    : params.widgetPrayKind;
  if (!personId) return null;
  return { personId, kind: kindRaw === "emergency" ? "emergency" : "today" };
}
