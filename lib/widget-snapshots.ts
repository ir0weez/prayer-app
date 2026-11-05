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
import { formatDateLocal } from "./date-utils";
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
  type ScheduleEvent,
  type ScheduleMinistry,
  type ScheduleTodo,
} from "./schedule-data";
import { buildUpNextGroup, upNextMinutes, type UpNextCandidate, type UpNextItem } from "./up-next";
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

/** v442 (W-6, Option A — the day rail): one entry on the rail.
 * The renderer walks these in order, seats its own NOW row after
 * the done and past entries, and dresses the hero entry as the
 * tinted band. Order is the day's order: done entries first
 * (behind now), then the one past entry when there is one, then
 * the hero and what follows it. v443 adds "past": the most recent
 * timed item that already started and was never completed — it
 * sat in neither the done bucket (completed only) nor the ahead
 * bucket (future only) and simply vanished from the rail. */
export interface UpNextDayEntry {
  kind: "done" | "past" | "item" | "gap";
  /** done / past / item: the item's title. */
  title?: string;
  /** past / item: the sub line (the event's location/notes, the
   * same line the pre-v442 widget composed for its lead). */
  sub?: string;
  /** done / past / item: "9:00 AM". */
  timeLabel?: string;
  /** item: minutes since midnight — the renderer counts the
   * hero's "IN 44 MIN" down from it at render time. */
  startMinutes?: number;
  /** item: true on the hero (the next thing — the band). */
  isHero?: boolean;
  /** gap: "1 hour 30 minutes open". */
  text?: string;
}

export type UpNextWidgetSnapshot =
  | { state: "none" }
  | {
      state: "next";
      /** The rail, in day order (done ≤ 2, past ≤ 1, hero,
       * following items with their gaps interleaved; capped at
       * 10 entries — the renderer truncates at its 9 slots plus
       * its own NOW row). */
      entries: UpNextDayEntry[];
      /** Timed items still ahead today, hero included — the
       * header's "{leftCount} LEFT". */
      leftCount: number;
      /** "Nothing after 3:00 PM", from the last ahead item's
       * end; null only when that end can't be stated. */
      endNote: string | null;
    };

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

export function buildUpNextSnapshot(
  events: ScheduleEvent[],
  todos: ScheduleTodo[],
  ministries: ScheduleMinistry[],
  todayIso: string,
  now: Date,
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
  // The hero is the schedule tab's own pick (buildUpNextGroup's
  // lead) — the rail is built around it, never a second opinion.
  const group = buildUpNextGroup(candidates, allTimed, nowMin);
  if (!group) return { state: "none" };
  const heroId = group.entries[0].item.id;

  // The day itself, unified from the same three stores the push
  // layer loads — every timed item with its kind, its completion
  // state and its sub line (location, else notes). Holidays are
  // not items on his rail and never enter it.
  interface RawDayItem {
    id: string;
    kind: "todo" | "event" | "ministry";
    title: string;
    startMinutes: number;
    endMinutes: number;
    completed: boolean;
    sub: string;
  }
  const raw: RawDayItem[] = [
    ...dayTodos
      .filter((todo) => todo.startTime)
      .map((todo) => ({
        id: todo.id,
        kind: "todo" as const,
        title: todo.title,
        startMinutes: upNextMinutes(todo.startTime as string),
        endMinutes: upNextEndMinutes("todo", todo.startTime as string, todo.endTime),
        completed: todo.isCompleted,
        sub: todo.notes ?? "",
      })),
    ...dayEvents
      .filter((event) => event.startTime && !event.isHoliday)
      .map((event) => ({
        id: event.id,
        kind: "event" as const,
        title: event.title,
        startMinutes: upNextMinutes(event.startTime as string),
        endMinutes: upNextEndMinutes("event", event.startTime as string, event.endTime),
        completed: event.isCompleted,
        sub: event.location ?? event.notes ?? "",
      })),
    ...dayMinistries
      .filter((ministry) => ministry.startTime)
      .map((ministry) => ({
        id: ministry.id,
        kind: "ministry" as const,
        title: ministry.title,
        startMinutes: upNextMinutes(ministry.startTime as string),
        endMinutes: upNextEndMinutes("ministry", ministry.startTime as string, ministry.endTime),
        completed: ministry.isCompleted,
        sub: ministry.location ?? ministry.notes ?? "",
      })),
  ];

  // Done: completed timed items whose start has passed — the two
  // most recent, in the day's order.
  const dones = raw
    .filter((item) => item.completed && item.startMinutes <= nowMin)
    .sort((a, b) => a.startMinutes - b.startMinutes)
    .slice(-2);

  // Past (v443): the most recent timed item that has already
  // started and was never completed — the last thing above the
  // hero. It belongs to neither bucket around it (dones are
  // completed, the sequence is strictly future), so without this
  // the rail jumps from the done rows straight to the hero and
  // the thing he just did — his 10:00 AM Feed, right before the
  // 12:00 Lunch — never appears at all. One row only; completed
  // items are dones, never past, so it can't duplicate one.
  const past = raw
    .filter((item) => !item.completed && item.startMinutes <= nowMin)
    .sort((a, b) => a.startMinutes - b.startMinutes)
    .slice(-1);

  // Ahead: uncompleted, strictly in the future — the same pool
  // the Up Next group draws from, so the hero leads it.
  const ahead = raw
    .filter((item) => !item.completed && item.startMinutes > nowMin)
    .sort((a, b) => a.startMinutes - b.startMinutes);
  const heroIndex = ahead.findIndex((item) => item.id === heroId);
  if (heroIndex < 0) return { state: "none" };
  const sequence = ahead.slice(heroIndex);

  const entries: UpNextDayEntry[] = dones.map((item) => ({
    kind: "done" as const,
    title: item.title,
    timeLabel: minutesToWidgetTime(item.startMinutes),
  }));
  for (const item of past) {
    entries.push({
      kind: "past" as const,
      title: item.title,
      ...(item.sub ? { sub: item.sub } : {}),
      timeLabel: minutesToWidgetTime(item.startMinutes),
    });
  }
  sequence.forEach((item, index) => {
    if (entries.length >= 10) return;
    if (index > 0) {
      const gapMinutes = item.startMinutes - sequence[index - 1].endMinutes;
      if (gapMinutes >= 15 && entries.length < 10) {
        entries.push({ kind: "gap", text: `${formatOpenDuration(gapMinutes)} open` });
      }
    }
    if (entries.length >= 10) return;
    entries.push({
      kind: "item",
      title: item.title,
      ...(item.sub ? { sub: item.sub } : {}),
      timeLabel: minutesToWidgetTime(item.startMinutes),
      startMinutes: item.startMinutes,
      ...(index === 0 ? { isHero: true } : {}),
    });
  });

  const last = sequence[sequence.length - 1];
  return {
    state: "next",
    entries,
    leftCount: sequence.length,
    endNote: last ? `Nothing after ${minutesToWidgetTime(last.endMinutes)}` : null,
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
      /** v443 (ST-2): the restudy queue head's BOOK alone, carried
       * separately so the reading strip's one line can name it
       * ("· ↻ Colossians") without parsing restudyLine's sentence.
       * Null when the queue is empty. */
      restudyBook: string | null;
      chaptersWritten: number;
      totalChapters: number;
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
  return {
    state: "active",
    book,
    bookColor: colors?.primary ?? "#A78BFA",
    colorPrimary: colors?.primary ?? "#A78BFA",
    colorDeep: colors?.deep ?? "#7C5CD6",
    colorTint: colors?.tintA ?? "#332A55",
    nextChapter,
    verseText,
    verseRef,
    lastWrittenChapter,
    lastWrittenNotes,
    restudyLine: restudy?.line ?? null,
    restudyBook: restudy?.next.book ?? null,
    chaptersWritten,
    totalChapters,
  };
}

// ─── The whole set ──────────────────────────────────────────────────────────

export interface AllWidgetSnapshots {
  prayToday: PrayTodayWidgetSnapshot;
  emergency: EmergencyWidgetSnapshot;
  fast: FastWidgetSnapshot;
  reachOut: ReachOutWidgetSnapshot;
  upNext: UpNextWidgetSnapshot;
  study: StudyWidgetSnapshot;
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
}

export function buildAllWidgetSnapshots(input: WidgetSnapshotInputs): AllWidgetSnapshots {
  const todayIso = formatDateLocal(input.now);
  return {
    prayToday: buildPrayTodaySnapshot(input.people, input.now),
    emergency: buildEmergencySnapshot(input.people, input.now),
    fast: buildFastSnapshot(input.fasts, input.xpRaw, todayIso),
    reachOut: buildReachOutSnapshot(input.people, input.now),
    upNext: buildUpNextSnapshot(input.events, input.todos, input.ministries, todayIso, input.now),
    study: buildStudySnapshot(input.studyState, input.imports, input.resolveChapter),
  };
}

/** v438: the ONE JSON document the native providers read — the
 * scheme their tap intents are built from, plus the six snapshots
 * under their builder keys (WidgetRenderer.kt reads exactly
 * these). Pure: the push layer only adds the storage reads.
 *
 * v441: the document also carries the widget palette
 * (lib/widget-palette — the app's seed × appearance, derived on
 * this side where the theme machinery lives). v442: all nine
 * widgets dress from the renderer's EFFECTIVE palette — the
 * device's Material You system colours first (resolved in the
 * native process), this snapshot palette as the fallback when
 * the device offers none. */
export function serializeWidgetSnapshots(
  snapshots: AllWidgetSnapshots,
  scheme: string,
  palette?: WidgetPalette,
): string {
  return JSON.stringify({ scheme, ...(palette ? { palette } : {}), ...snapshots });
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
