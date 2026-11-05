// ─── v436 — home-screen widget snapshots ────────────────────────────────────
// The pure data layer for PrayerCircle's Android home-screen widgets
// (react-native-android-widget, route verified by prebuild — see
// lib/widget-push.tsx). Every widget renders ONLY what a builder here
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
//               + calculateWhites for the open-time line
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
// and the requestWidgetUpdate calls; the widget task handler reuses
// the same loaders so an OS-scheduled refresh reads the same truth.

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
import { timeToMinutes } from "./time-blocks";
import { buildUpNextGroup, upNextMinutes, type UpNextCandidate, type UpNextItem } from "./up-next";
import { calculateWhites, type WhiteSourceItem } from "./whites";
import { maxHeartsForLevel, normalizeXPState } from "./xp-engine";

/** The six registered widget names (app.config.ts plugin props —
 * pinned by the v436 tests; the native providers are generated from
 * these names at prebuild). */
export const WIDGET_NAMES = {
  prayToday: "PrayToday",
  emergency: "Emergency",
  yourFast: "YourFast",
  reachOut: "ReachOut",
  upNext: "UpNext",
  yourStudy: "YourStudy",
} as const;

export type WidgetName = (typeof WIDGET_NAMES)[keyof typeof WIDGET_NAMES];

// ─── Shared bits ────────────────────────────────────────────────────────────

/** One face in a widget row: initials on the person's own colour —
 * the same identity the in-app avatars carry (Person.initials /
 * Person.avatarColor are stored fields, read as-is). */
export interface WidgetFace {
  personId: string;
  firstName: string;
  initials: string;
  color: string;
}

function firstNameOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts[0] || "Unnamed";
}

function faceOf(person: Person): WidgetFace {
  return {
    personId: person.id,
    firstName: firstNameOf(person.name),
    initials: person.initials || firstNameOf(person.name).slice(0, 1),
    color: person.avatarColor || person.accentColor,
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
  return {
    state: "next",
    personId: nextPerson.id,
    name: nextPerson.name,
    firstName: firstNameOf(nextPerson.name),
    initials: nextPerson.initials || firstNameOf(nextPerson.name).slice(0, 1),
    color: nextPerson.avatarColor || nextPerson.accentColor,
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
  title: string;
  note: string;
  leftText: string;
}

export type EmergencyWidgetSnapshot =
  | { state: "none" }
  | { state: "active"; total: number; rows: EmergencyWidgetRow[] };

export function buildEmergencySnapshot(people: Person[], now: Date): EmergencyWidgetSnapshot {
  const entries = getAllActiveEmergencyPrayers(people)
    .slice()
    .sort(
      (a, b) =>
        new Date(a.item.emergencyExpiresAt ?? 0).getTime() -
        new Date(b.item.emergencyExpiresAt ?? 0).getTime(),
    );
  if (entries.length === 0) return { state: "none" };
  return {
    state: "active",
    total: entries.length,
    rows: entries.slice(0, 2).map(({ person, item }) => ({
      personId: person.id,
      name: person.name,
      initials: person.initials || firstNameOf(person.name).slice(0, 1),
      color: person.avatarColor || person.accentColor,
      title: item.title,
      note: item.note ?? "",
      leftText: emergencyLeftText(item.emergencyExpiresAt ?? "", now),
    })),
  };
}

// ─── 3. Your Fast (small) ───────────────────────────────────────────────────

export type FastWidgetSnapshot =
  | { state: "none" }
  | {
      state: "active";
      dayNumber: number;
      totalDays: number;
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
    name: fast.name,
    hearts,
    maxHearts,
  };
}

// ─── 4. Due to Reach Out (small) ────────────────────────────────────────────

export interface ReachWidgetPerson extends WidgetFace {
  name: string;
  days: number;
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

export type UpNextWidgetSnapshot =
  | { state: "none" }
  | {
      state: "next";
      title: string;
      timeLabel: string;
      line: string;
      /** "Then 1 hour 30 minutes of open time" — null when no
       * settled white block follows the item. */
      thenOpenText: string | null;
    };

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
  const group = buildUpNextGroup(candidates, allTimed, nowMin);
  if (!group) return { state: "none" };
  const lead = group.entries[0].item;
  const rawEvent = dayEvents.find((event) => event.id === lead.id);
  const rawTodo = dayTodos.find((todo) => todo.id === lead.id);
  const rawMinistry = dayMinistries.find((ministry) => ministry.id === lead.id);
  const line =
    rawEvent?.location ?? rawEvent?.notes ?? rawMinistry?.location ?? rawMinistry?.notes ?? rawTodo?.notes ?? "";

  // The open time that follows: the day's settled white blocks
  // (calculateWhites — the schedule's own rules), merged where
  // they touch, the first span that starts when this item ends.
  const whiteItems: WhiteSourceItem[] = [
    ...dayEvents.map((event) => ({ startTime: event.startTime, endTime: event.endTime, isCompleted: event.isCompleted, kind: "event" as const })),
    ...dayTodos.map((todo) => ({ startTime: todo.startTime, endTime: todo.endTime, isCompleted: todo.isCompleted, kind: "todo" as const })),
    ...dayMinistries.map((ministry) => ({ startTime: ministry.startTime, endTime: ministry.endTime, isCompleted: ministry.isCompleted, kind: "ministry" as const })),
  ];
  const blocks = calculateWhites(whiteItems, { isToday: true, nowMinutes: nowMin });
  const leadEnd = lead.endTime
    ? upNextMinutes(lead.endTime)
    : upNextMinutes(lead.startTime) + (group.entries[0].kind === "todo" ? 30 : 60);
  let thenOpenText: string | null = null;
  const following = blocks
    .filter((block) => timeToMinutes(block.startTime) >= leadEnd)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  if (following.length > 0 && timeToMinutes(following[0].startTime) - leadEnd <= 1) {
    let spanEnd = timeToMinutes(following[0].endTime);
    for (let i = 1; i < following.length; i++) {
      if (timeToMinutes(following[i].startTime) - spanEnd > 1) break;
      spanEnd = Math.max(spanEnd, timeToMinutes(following[i].endTime));
    }
    const spanMinutes = spanEnd - timeToMinutes(following[0].startTime);
    if (spanMinutes > 0) thenOpenText = `Then ${formatOpenDuration(spanMinutes)} of open time`;
  }

  return {
    state: "next",
    title: lead.title,
    timeLabel: formatWidgetTime(lead.startTime),
    line,
    thenOpenText,
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
