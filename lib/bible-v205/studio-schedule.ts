// ─── v227 "The Schedule Answers Back" — the backup's studioSchedule ─────────
// Since v222 the studio has sent schedule packs TO the app; this is the
// return road. The DATA backup gains a studioSchedule section: every dated
// item in the schedule stores, serialized in the EXACT pack event shape
// the studio emits (schPayloadEvent in the studio) and the v222 importer
// accepts (validateSchedule in studio-import.ts) — so the studio's
// unlock-check can finally see his real, phone-side schedule, and the
// events could even come home again through the door unchanged.
//
// Shape conventions matched to the studio pack, field by field:
//   day      short weekday name ('Sun'…'Sat') derived from the date, the
//            studio's way (UTC weekday of the calendar date).
//   date     the item's own YYYY-MM-DD — a one-off/monthly item exports
//            its true date; nothing is window-trimmed.
//   start    the stored HH:mm (re-padded — the pack demands two digits),
//            or 'All day' when the item carries no usable start time.
//   minutes  end − start; an end at or before the start means the item
//            runs past midnight (+24h), except an exactly-equal end,
//            which is a moment (0). With a start but NO stored end, the
//            app's own reading applies: events run 60 minutes, todos 30
//            (schedule-tab's defaults; the todos' 30 is also his house
//            rule). 'All day' carries 0, as the studio's own all-day
//            pack entries do.
//   type     'Event' for a ScheduleEvent, 'Todo' for a ScheduleTodo,
//            'Ministry' for a ScheduleMinistry (v229) — ministries are
//            DATED records (date is required in their store), so they
//            project exactly like the others; a ministry's location
//            rides like an event's, and a start with no stored end
//            reads as an event's 60 minutes.
//   online   an event whose location is exactly 'Online' travels as
//            online:true with location '' — the importer's rule puts the
//            'Online' marker back on merge, so it round-trips.
//   recur    'none' — the app stores individual dated entries with no
//            recurrence of their own, and the pack's labels never expand.
//   notes / location ride straight through ('' when unset), as in v224.
//   subtasks (v236): a grouped todo's steps ride as [{id, title,
//            isCompleted}] and the key is OMITTED entirely when the
//            todo has no steps, so a plain item's pack shape is
//            byte-identical to before. Since v239 a step's own
//            description rides too, when the step carries one.
//   bibleBook / bibleChapter (v237): a ministry's pair rides on its
//            'Ministry' row — the studio's schedule editor asks for it
//            there — and the keys are OMITTED when the record carries
//            neither, so an unpaired ministry's row is unchanged.
//   everything else (v239 "Nothing Left Behind"): each item now
//            carries the REST of its record — keyword, color, linked
//            people, completion (isCompleted only when true, the
//            stamp whenever set), an event's travel/reminder/season/
//            episode/poster/time-off fields, a todo's tag/icon/order/
//            reminder flag/links/group shape, a ministry row's genre
//            (ministryType), dueDate, and travel time. The omission
//            rule is the house rule throughout: a key exists only
//            when the record actually carries a value — never a null,
//            never a default dressed as data. Two fields need a word:
//            a todo's `order` rides only when it differs from the
//            todo's rank among its day's todos (a list already in
//            its stored order has nothing to add, and the door
//            re-derives that order from the landing sequence), and a
//            ministry's genre rides as ministryType whenever it is
//            not 'Bible Study' — the link-merge's creation default,
//            so a bare row still births the same record it always did.
//
// Items whose date is missing or not a real calendar date cannot be
// expressed in pack shape at all; they are excluded and COUNTED on the
// section (undatedExcluded) so the omission is never silent.

import type { ScheduleEvent, ScheduleMinistry, ScheduleTodo } from '../schedule-data';
import type { StudioScheduleEventInput } from './studio-import';

export interface StudioScheduleSection {
  exportedAt: string;
  events: StudioScheduleEventInput[];
  /** Store items left out for carrying no usable date — counted, never silent. */
  undatedExcluded: number;
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** A real YYYY-MM-DD calendar date (2026-13-40 is not one). */
function isUsableDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  return parsed.getUTCFullYear() === y && parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d;
}

/** The studio's weekday derivation: UTC weekday of the calendar date. */
function dayShortOf(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return DAY_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** Stored times are HH:mm by contract but legacy rows may carry 'H:mm';
 *  anything else (or out of range) reads as no time at all. */
function timeToMinutes(time?: string): number | null {
  if (typeof time !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

function hhmmOf(minutes: number): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(minutes / 60))}:${p(minutes % 60)}`;
}

interface PackItemSource {
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  notes?: string;
  subtasks?: ScheduleTodo['subtasks'];
  bibleBook?: string;
  bibleChapter?: string;
  // v239: the rest of the record, read straight off the source. Every
  // field is optional in at least one of the three record shapes; the
  // per-kind emission below reads only its own kind's fields.
  keyword?: string;
  color?: string;
  linkedPeopleIds?: string[];
  isCompleted?: boolean;
  completedAt?: string;
  travelTimeMinutes?: number;
  reminderMinutesBefore?: number;
  season?: number;
  episode?: number;
  posterImageUri?: string;
  posterColor?: string;
  isOffEvent?: boolean;
  tag?: string;
  icon?: string;
  order?: number;
  notificationsEnabled?: boolean;
  linkedEventId?: string;
  linkedMinistryId?: string;
  linkedEventTitle?: string;
  linkedMinistryTitle?: string;
  linkedEventColor?: string;
  linkedMinistryColor?: string;
  groupId?: string;
  isGroup?: boolean;
  isGroupExpanded?: boolean;
  /** A ministry record's genre (its `type`), adapted by the caller. */
  genre?: string;
  dueDate?: string;
}

/** A stored subtask in wire shape: {id, title, isCompleted}, plus its
 *  description when it carries one (v239). Only well-formed steps
 *  ride (a record with a non-empty string id and a string title) —
 *  anything else could never pass the door's own validation on the
 *  way home, so it is left behind here instead. */
function wireSubtasks(
  subtasks: ScheduleTodo['subtasks'],
): { id: string; title: string; isCompleted: boolean; description?: string }[] {
  if (!Array.isArray(subtasks)) return [];
  const out: { id: string; title: string; isCompleted: boolean; description?: string }[] = [];
  for (const s of subtasks) {
    if (!s || typeof s !== 'object') continue;
    if (typeof s.id !== 'string' || s.id.length === 0) continue;
    if (typeof s.title !== 'string') continue;
    out.push({
      id: s.id,
      title: s.title,
      isCompleted: s.isCompleted === true,
      ...(typeof s.description === 'string' && s.description.length > 0
        ? { description: s.description }
        : {}),
    });
  }
  return out;
}

/**
 * The v239 remainder of a record, in wire shape: a key exists only
 * when the record carries a value (the header comment gives the two
 * judgment calls — a todo's `order` and a ministry's genre).
 * `todoRank` is the todo's position among its own date's todos in
 * store order, the baseline its stored `order` is compared against.
 */
function bridgeExtras(
  source: PackItemSource,
  type: 'Event' | 'Todo' | 'Ministry',
  todoRank?: number,
): Partial<StudioScheduleEventInput> {
  const out: Partial<StudioScheduleEventInput> = {};
  const str = (key: 'color' | 'completedAt' | 'posterImageUri' | 'posterColor' | 'tag' | 'icon' | 'linkedEventId' | 'linkedMinistryId' | 'linkedEventTitle' | 'linkedMinistryTitle' | 'linkedEventColor' | 'linkedMinistryColor' | 'groupId' | 'dueDate', value: string | undefined) => {
    if (typeof value === 'string' && value.length > 0) out[key] = value;
  };
  const num = (key: 'travelTimeMinutes' | 'reminderMinutesBefore' | 'season' | 'episode' | 'order', value: number | undefined) => {
    if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
  };
  // Every kind: the color override, the linked people, completion.
  // isCompleted rides only when true (false is every record's birth
  // state — carrying it would grow every plain item's shape for no
  // information); its stamp rides whenever one is stored.
  str('color', source.color);
  if (Array.isArray(source.linkedPeopleIds) && source.linkedPeopleIds.length > 0) {
    out.linkedPeopleIds = [...source.linkedPeopleIds];
  }
  if (source.isCompleted === true) out.isCompleted = true;
  str('completedAt', source.completedAt);
  if (type === 'Event') {
    if (typeof source.keyword === 'string' && source.keyword.length > 0) {
      out.keyword = source.keyword;
    }
    num('travelTimeMinutes', source.travelTimeMinutes);
    num('reminderMinutesBefore', source.reminderMinutesBefore);
    num('season', source.season);
    num('episode', source.episode);
    str('posterImageUri', source.posterImageUri);
    str('posterColor', source.posterColor);
    if (source.isOffEvent === true) out.isOffEvent = true;
  }
  if (type === 'Todo') {
    str('tag', source.tag);
    str('icon', source.icon);
    if (
      typeof source.order === 'number' &&
      todoRank !== undefined &&
      source.order !== todoRank
    ) {
      out.order = source.order;
    }
    if (typeof source.notificationsEnabled === 'boolean') {
      out.notificationsEnabled = source.notificationsEnabled;
    }
    str('linkedEventId', source.linkedEventId);
    str('linkedMinistryId', source.linkedMinistryId);
    str('linkedEventTitle', source.linkedEventTitle);
    str('linkedMinistryTitle', source.linkedMinistryTitle);
    str('linkedEventColor', source.linkedEventColor);
    str('linkedMinistryColor', source.linkedMinistryColor);
    str('groupId', source.groupId);
    if (source.isGroup === true) {
      out.isGroup = true;
      // A header's fold state is part of its shape: it rides (open
      // or shut) whenever the header flag does.
      if (typeof source.isGroupExpanded === 'boolean') {
        out.isGroupExpanded = source.isGroupExpanded;
      }
    } else if (source.isGroupExpanded === true) {
      out.isGroupExpanded = true;
    }
  }
  if (type === 'Ministry') {
    if (
      typeof source.genre === 'string' &&
      source.genre.length > 0 &&
      source.genre !== 'Bible Study'
    ) {
      out.ministryType = source.genre;
    }
    str('dueDate', source.dueDate);
    num('travelTimeMinutes', source.travelTimeMinutes);
  }
  return out;
}

function toPackEvent(
  source: PackItemSource,
  type: 'Event' | 'Todo' | 'Ministry',
  todoRank?: number,
): StudioScheduleEventInput {
  const startMinutes = timeToMinutes(source.startTime);
  const endMinutes = timeToMinutes(source.endTime);
  let start: string;
  let minutes: number;
  if (startMinutes === null) {
    // No usable start: the item is all-day in pack shape. An end time
    // with no start cannot be expressed and does not ride.
    start = 'All day';
    minutes = 0;
  } else {
    start = hhmmOf(startMinutes);
    if (endMinutes === null) {
      // The app's own reading of a start with no stored end.
      minutes = type === 'Todo' ? 30 : 60;
    } else if (endMinutes > startMinutes) {
      minutes = endMinutes - startMinutes;
    } else if (endMinutes === startMinutes) {
      minutes = 0;
    } else {
      // Ends after midnight — the importer's endTimeOf mods by 24h, so
      // this comes home as the same clock time it left with.
      minutes = endMinutes + 24 * 60 - startMinutes;
    }
  }
  // The Online marker rule (the importer's, mirrored): a location of
  // exactly 'Online' becomes the online flag and an empty location.
  // Todos carry no location in their store; events and ministries do.
  const rawLocation = type === 'Todo' ? '' : (source.location ?? '');
  const online = rawLocation === 'Online';
  // v236: a grouped todo's steps ride along; the key exists only when
  // at least one well-formed step does, so plain items keep the exact
  // pack shape they have always had.
  const subtasks = type === 'Todo' ? wireSubtasks(source.subtasks) : [];
  return {
    title: source.title,
    day: dayShortOf(source.date),
    date: source.date,
    start,
    minutes,
    type,
    online,
    recur: 'none',
    notes: source.notes ?? '',
    location: online ? '' : rawLocation,
    ...(subtasks.length > 0 ? { subtasks } : {}),
    // v237: the ministry's book/chapter ride its projection row, each
    // key only when the record actually carries a value.
    ...(type === 'Ministry' && source.bibleBook ? { bibleBook: source.bibleBook } : {}),
    ...(type === 'Ministry' && source.bibleChapter ? { bibleChapter: source.bibleChapter } : {}),
    // v239: everything else the record carries (see bridgeExtras).
    ...bridgeExtras(source, type, todoRank),
  };
}

/**
 * Every dated event, todo, and ministry in the stores, in pack shape,
 * sorted the way the studio sorts its own pack (by date, all-day
 * first, then title) so the section is stable to read and diff.
 * Nothing is window-trimmed — the studio groups by week and dedupes
 * on its side. (Ministries ride last in the signature only because
 * the parameter list grew in v229; v227 callers' positions are kept.)
 */
export function collectStudioSchedule(
  events: ScheduleEvent[],
  todos: ScheduleTodo[],
  now: Date = new Date(),
  ministries: ScheduleMinistry[] = [],
): StudioScheduleSection {
  const out: StudioScheduleEventInput[] = [];
  let undatedExcluded = 0;
  for (const event of events) {
    if (!isUsableDate(event?.date)) {
      undatedExcluded += 1;
      continue;
    }
    out.push(toPackEvent(event, 'Event'));
  }
  // A todo's rank among its own date's todos, in store order — the
  // baseline bridgeExtras compares its stored `order` against.
  const rankByDate = new Map<string, number>();
  for (const todo of todos) {
    if (!isUsableDate(todo?.date)) {
      undatedExcluded += 1;
      continue;
    }
    const rank = rankByDate.get(todo.date) ?? 0;
    rankByDate.set(todo.date, rank + 1);
    out.push(toPackEvent(todo, 'Todo', rank));
  }
  for (const ministry of ministries) {
    if (!isUsableDate(ministry?.date)) {
      undatedExcluded += 1;
      continue;
    }
    // The record's genre is its `type`; the wire calls it ministryType.
    out.push(toPackEvent({ ...ministry, genre: ministry.type }, 'Ministry'));
  }
  const startKey = (e: StudioScheduleEventInput) => (e.start === 'All day' ? -1 : timeToMinutes(e.start) ?? -1);
  out.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      startKey(a) - startKey(b) ||
      a.title.localeCompare(b.title) ||
      a.type.localeCompare(b.type),
  );
  return { exportedAt: now.toISOString(), events: out, undatedExcluded };
}
