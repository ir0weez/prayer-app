// ─── v222 "The Door" — the Commentary Studio import door ────────────────────
// The studio (~/workspace/commentary-studio) writes two JSON files; this
// module is the app's half of the bridge. It parses them, validates them
// COMPLETELY before anything is applied (a malformed file changes nothing),
// and converts them into the app's own stores:
//
//   prayercircle-notes.json    → per-chapter commentary overrides
//   prayercircle-library.json  → { chapters: [ ...same payloads ] }
//   prayercircle-schedule.json → schedule events/todos for one week
//   prayercircle-people.json   → prayer people + needs + journal notes
//                                (validated here; applied by studio-people.ts)
//   prayercircle-ministries.json → ministry records (v229): upsert by
//                                id + explicit deletedIds tombstones
//                                (validated/applied by studio-ministries.ts).
//                                The same pack shape rides a backup's
//                                studioMinistries section, and schedule
//                                packs may carry type 'Ministry' rows —
//                                the studio-facing projection: a known
//                                type that never lands as an event (the
//                                records travel by their own pack), but
//                                whose carried record fields land on
//                                the ministry record (the bibleBook/
//                                bibleChapter pair since v237, the
//                                record's remaining fields since v239 —
//                                mergeStudioScheduleMinistries). Since
//                                v239 every kind's items carry their
//                                full record across the bridge
//                                (keyword, genre, links, completion…):
//                                see StudioScheduleEventInput.
//   a backup's studioStates    → the two chapter marks (v228): notesState
//     section                     walks transitionChapterStatus like any
//                                chapterState; readDate lands on the read
//                                track, later date wins, null never clears
//                                (validated/applied by studio-states.ts)
//
// v231 "One Door": the Settings screen used to grow a dedicated import
// row per pack kind (Studio / People / Ministries) because parseStudioFile
// returns ONE kind per file. Nobody should have to know which file holds
// what. parseStudioFileFull (below) reads a WHOLE file — every section
// it carries, standalone pack or full backup — validates EVERYTHING
// first, and hands the caller one plan to apply through the same
// per-section appliers. parseStudioFile stays for callers that truly
// hold a single-kind pack; the door and the Drive check use the plan.
//
// Rules the import obeys, from Jonathan's own asks:
//  · NOTES REPLACE that chapter's imported commentary entries only. The
//    marks layer (EntryMarks: hearts, tints, bubble lines in marks.ts) is
//    a DIFFERENT store and is never touched by an import — with ONE
//    exception since v417: a file's studioMarkChanges section, a change
//    list that merges into the marks layer item-by-item, naming every
//    highlight it touches (studio-marks.ts). No other section can reach
//    the marks layer, and a change list can never reach an unnamed mark.
//  · chapterState, when present, goes through the same transition
//    semantics as tapping in the app (transitionChapterStatus): XP is
//    idempotent, backward moves are allowed, nothing is ever revoked.
//  · Schedule imports land as planned items; the app stays the authority
//    for what actually happened. Dedupe is by (date, start, title), so a
//    re-import of the same pack adds nothing. whiteSpace is advisory
//    payload data and is never stored — the app computes its own.
//  · Export side (WS2c): collectBubbleLinesForExport turns the marks
//    layer into a distinct backup section the studio can read later.
//  · Export side (v363): collectHighlightsForExport turns the marks
//    layer's TINTS into the studioHighlights section beside it — the
//    highlights bridge, so his colours show at the desk too. Export-
//    only like the bubbles: imports never read the section and never
//    touch the marks layer.
//  · v417: the studioHighlights section grows a fifth array (blocks —
//    the v390 commentary-block highlights the bridge used to drop) and
//    every item gains the span of the marks record it came from
//    (entryStart/entryEnd). The RETURN path is a different section
//    entirely — studioMarkChanges, a change list the door merges
//    item-by-item into the marks layer (studio-marks.ts): the one
//    authorized exception to the marks layer's import immunity,
//    granted by Jonathan's ruling (Nov 2) for desk-side highlight
//    editing. The snapshot section above stays export-only forever.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EmailDigest } from '@/lib/email-digest';
import type { GasPriceSnapshot } from '@/lib/gas-prices';
import type { NewsBriefingSnapshot, NewsBriefingItem } from '@/lib/news-briefing';
import type { WeatherHourlyEntry, WeatherSnapshot } from '@/lib/weather-snapshot';
import { parseWeatherDetails } from '@/lib/weather-snapshot';
import { NEWS_AREAS, type NewsArea } from '@/lib/news';
import { CHAPTER_COUNTS, chapterCountFor, getChapterData } from './index';
import {
  createScheduleEvent,
  createScheduleMinistry,
  createScheduleTodo,
  type ScheduleEvent,
  type ScheduleMinistry,
  type ScheduleTodo,
} from '../schedule-data';
import {
  lineAuthor,
  lineText,
  normalizeMarks,
  parseEntryKey,
  type KeeperField,
  type KeeperLine,
  type MarksMap,
  type TintColor,
} from './marks';
import type {
  NoteCategory,
  StudyStatus,
  V205Block,
  V205BookData,
  V205ChapterData,
  V205Entry,
  V205OutlineItem,
  V205Section,
} from './types';
import { normalizeCategory } from './categories';
import type { RelationshipType, ReminderFrequency } from '../prayercircle-data';
import { validateStudioStates, type StudioStatesSection } from './studio-states';
import {
  validateStudioMinistriesPack,
  type StudioMinistriesPack,
} from './studio-ministries';
import {
  validateStudioMarkChanges,
  type StudioMarkChangesSection,
} from './studio-marks';

// ── Studio pack shapes (exactly what studio.js exports) ─────────────────────

export interface StudioNoteBlock {
  kind: 'para' | 'scripture';
  text: string;
  ref?: string;
}

export type StudioNoteKind = 'note' | 'highlight' | 'main-thought' | 'imported' | 'quote';

export interface StudioNote {
  start: number;
  end: number;
  kind: StudioNoteKind;
  category?: NoteCategory | null;
  /** v223: quote notes only — the person whose words these are (studio "Quote this"). */
  author?: string;
  /**
   * v244: quote notes only — the speaker's People id, when the
   * studio's "Someone said" pick was a listed person (a free-text
   * name rides as `author` alone). Carried onto the quote blocks so
   * the chapter page can wear the speaker's real face.
   */
  authorId?: string;
  blocks: V205Block[];
}

export interface StudioSection {
  start: number;
  end: number;
  title: string | null;
  entries: { start: number; end: number }[];
}

export interface StudioChapterPayload {
  book: string;
  chapter: number;
  opener: { kind: 'introduction' | 'previously'; text: string };
  sections: StudioSection[];
  notes: StudioNote[];
  chapterState?: StudyStatus;
}

/** One step of a grouped todo (v236): the wire shape shared with the
 *  studio. Since v239 a step's optional description travels too (it
 *  was the one per-step field v236 deliberately left behind). */
export interface StudioSubtaskInput {
  id: string;
  title: string;
  isCompleted: boolean;
  description?: string;
}

export interface StudioScheduleEventInput {
  title: string;
  day: string;
  date: string;
  start: string;
  minutes: number;
  /** 'Ministry' rows (v229) are the studio-facing projection of the
   *  app's ministry records — a known, valid type that never lands as
   *  an event or todo on this side; the records themselves travel by
   *  the ministries pack. Since v237 a row may still carry the
   *  session's bibleBook/bibleChapter (below), and THAT pair lands —
   *  on the ministry record, never as a schedule item. */
  type: 'Event' | 'Todo' | 'Ministry';
  online: boolean;
  recur: string;
  /** Additive studio keys (v224): the event's notes and location, carried
   *  straight through to the created schedule item. '' when unset. */
  notes?: string;
  location?: string;
  /** A grouped todo's steps (v236, Todo items only). ABSENT means the
   *  pack says nothing about steps — an existing todo's steps are left
   *  untouched; PRESENT (even empty) replaces the todo's list whole. */
  subtasks?: StudioSubtaskInput[];
  /** The Bible book/chapter a Ministry session is for (v237, Ministry
   *  items only): the studio's schedule editor asks for the pair when
   *  a line's kind is Ministry ("Commentary writing — Colossians 1").
   *  They land on the matching ScheduleMinistry record — the store the
   *  ministry cards and the schedule tab's reading surfaces read —
   *  through mergeStudioScheduleMinistries. ABSENT says nothing; a
   *  PRESENT key names the value, and the ministries pack (v229) stays
   *  the full-record authority whenever a file carries both. */
  bibleBook?: string;
  bibleChapter?: string;
  // ── v239 "Nothing Left Behind" — the rest of each record's fields ──
  // Until v239 the bridge carried only the keys above; every other
  // field a schedule item holds in the app (its keyword, its genre,
  // its links, its completion…) was silently dropped in one or both
  // directions. The keys below complete the records. All are OPTIONAL:
  // ABSENT means the pack says nothing (a matched record keeps its
  // stored value; the export omits unset fields), a PRESENT key is a
  // payload the merges act on — so a malformed one rejects the file
  // under the door's validate-first discipline, exactly like subtasks
  // and the bible pair. Keys scoped to one kind are validated on that
  // kind and dropped on the others (the bible pair's precedent).
  /** The item's illustration keyword (all kinds on the wire; in the
   *  app only ScheduleEvent carries the field, so it lands there). */
  keyword?: string;
  /** The item's color override (all kinds — every record carries one). */
  color?: string;
  /** Prayer-list people linked to the item (all kinds). */
  linkedPeopleIds?: string[];
  /** Completion, all kinds: the flag, and its ISO timestamp. */
  isCompleted?: boolean;
  completedAt?: string;
  /** "Time to leave" minutes (Event and Ministry records). */
  travelTimeMinutes?: number;
  /** Local-notification lead time in minutes (Event only). */
  reminderMinutesBefore?: number;
  /** TV season / episode numbers (Event only). */
  season?: number;
  episode?: number;
  /** Time-off poster art (Event only): image URI + dominant color. */
  posterImageUri?: string;
  posterColor?: string;
  /** Marks a time-off event (Event only). */
  isOffEvent?: boolean;
  /** The todo's tag lane (Todo only). */
  tag?: string;
  /** The todo's MaterialIcons name (Todo only). */
  icon?: string;
  /** The todo's sort order within its day (Todo only). */
  order?: number;
  /** Whether the todo creates a local reminder (Todo only). */
  notificationsEnabled?: boolean;
  /** The event/ministry a todo is linked to (Todo only): ids, plus the
   *  cached titles/colors the app persists alongside them. */
  linkedEventId?: string;
  linkedMinistryId?: string;
  linkedEventTitle?: string;
  linkedMinistryTitle?: string;
  linkedEventColor?: string;
  linkedMinistryColor?: string;
  /** Grouped-todo shape (Todo only): the parent group's id on a child,
   *  the header flags on the group header itself. */
  groupId?: string;
  isGroup?: boolean;
  isGroupExpanded?: boolean;
  /** A Ministry row's genre — lands as ScheduleMinistry.type through
   *  mergeStudioScheduleMinistries (Ministry rows only). A row that
   *  omits it never stomps a stored genre. */
  ministryType?: string;
  /** A Ministry row's deadline (Ministry rows only), YYYY-MM-DD. */
  dueDate?: string;
}

/**
 * v365 — one schedule tombstone (Option B, Jonathan's ruling Oct 30):
 * the desk names an event/todo it once held and no longer does, by the
 * EXACT dedupe identity (date, start, title) — the same key the merges
 * match on. `start` is the row's own start word: an 'HH:MM' time, or
 * 'All day' for an untimed item. A tombstone is the ONLY way a schedule
 * item is ever deleted by an import, and it deletes by exact key
 * match alone — never by absence, range, or kind. The Studio derives
 * these from its synced base (pass -49); this side only consumes them.
 */
export interface StudioScheduleTombstone {
  date: string;
  start: string;
  title: string;
}

export interface StudioSchedulePayload {
  weekOf: string;
  events: StudioScheduleEventInput[];
  /** v365: the pack's schedule tombstones (see StudioScheduleTombstone).
   *  ABSENT means the pack names no deletions — nothing is removed.
   *  Rides at the top level of a pack beside `events`, and inside a
   *  backup's studioSchedule section beside its events. */
  deletedSchedule?: StudioScheduleTombstone[];
  /** v345: rows whose minutes the validator repaired instead of
   *  rejecting the file (see validateScheduleEvents). Absent on
   *  payloads built by hand (drive planner, tests) — read as 0. */
  minutesRepaired?: number;
  whiteSpace?: Record<string, { start: string; end: string; minutes: number }[]>;
}

export type StudioPack =
  | { kind: 'notes'; chapters: StudioChapterPayload[] }
  | { kind: 'schedule'; schedule: StudioSchedulePayload }
  | { kind: 'people'; people: StudioPeoplePack }
  | { kind: 'ministries'; ministries: StudioMinistriesPack }
  | { kind: 'states'; states: StudioStatesSection };

export type { StudioMinistriesPack };

// ── People pack shapes (v225 "People, Through the Door") ────────────────────
// prayercircle-people.json: the studio's People page exports his prayer
// list so the desk can maintain it. The apply/merge half lives in
// studio-people.ts; this module only validates, with the same
// validate-EVERYTHING-first discipline as the other packs.

export type StudioNeedKind = 'Regular' | 'Praise' | 'Emergency';

export interface StudioPersonNeedInput {
  id: string;
  title: string;
  /** The need's longer words. In the app they live as a Journal moment
   *  (PrayerItem has no body field), linked by (personId, needId). */
  more: string;
  /** v258: the item's quick sentence under its title (PrayerItem.note,
   *  set by the emergency title + note form). Optional both ways: old
   *  packs never carry it, and a pack without it never strips an
   *  existing note on merge. */
  note?: string;
  kind: StudioNeedKind;
  isDone: boolean;
  isEmergency: boolean;
  emergencyExpiresAt?: string;
  isPraised: boolean;
  praiseExpiresAt?: string;
}

export interface StudioPersonInput {
  id: string;
  name: string;
  relationship: RelationshipType;
  reminderFrequency?: ReminderFrequency;
  reminderDaysOfWeek?: number[];
  /** ISO date (YYYY-MM-DD) the person was last prayed for, or null. */
  lastPrayerCompletedDate?: string | null;
  /** ISO date the person was last REACHED (maps to Person.lastPrayedDate,
   *  the app's holdover field name), or null when never reached. */
  lastReached?: string | null;
  lastMeetingLocation?: string;
  needs: StudioPersonNeedInput[];
}

export interface StudioPeopleJournalInput {
  personId: string;
  personName?: string;
  needId: string;
  text: string;
  kind: StudioNeedKind;
}

export interface StudioPeoplePack {
  people: StudioPersonInput[];
  journal: StudioPeopleJournalInput[];
}

const STUDY_STATUSES: StudyStatus[] = [
  'complete',
  'in-progress',
  'write',
  'restudy',
  'not-started',
  'none',
];

const NOTE_KINDS: StudioNoteKind[] = ['note', 'highlight', 'main-thought', 'imported', 'quote'];

// v245: the working category set is FOUR (his 2026-10-25 merge of
// Conversation into Personal Story). Acceptance of a raw category —
// from a pack or from the store — goes through normalizeCategory
// (categories.ts), which also accepts the retired 'conversation' and
// reads it as 'personal-story': legacy values are normalized at this
// door, never rejected and never left as a phantom fifth category.

const BLOCK_KINDS = ['para', 'scripture', 'highlight', 'thought', 'conversation', 'note', 'quote'];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function fail(msg: string): never {
  throw new Error(msg);
}

/** Split opener text on blank lines into block strings, dropping empties. */
function splitTextBlocks(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function validateBlock(raw: unknown, where: string): V205Block {
  if (!isRecord(raw)) fail(`${where}: block is not an object`);
  if (!BLOCK_KINDS.includes(raw.kind as string)) fail(`${where}: unknown block kind`);
  if (typeof raw.text !== 'string') fail(`${where}: block has no text`);
  const block: V205Block = { kind: raw.kind as V205Block['kind'], text: raw.text };
  if (typeof raw.ref === 'string') block.ref = raw.ref;
  if (raw.category !== undefined && raw.category !== null) {
    // v245: a legacy 'conversation' is accepted and lands as
    // personal-story; a value no ruling knows is still a bad pack.
    const category = normalizeCategory(raw.category);
    if (category === null) fail(`${where}: unknown note category`);
    block.category = category;
  }
  return block;
}

function validateNote(raw: unknown, where: string): StudioNote {
  if (!isRecord(raw)) fail(`${where}: note is not an object`);
  if (!isInt(raw.start) || !isInt(raw.end) || raw.start < 1 || raw.end < raw.start) {
    fail(`${where}: note has an invalid verse span`);
  }
  if (!NOTE_KINDS.includes(raw.kind as StudioNoteKind)) fail(`${where}: unknown note kind`);
  if (!Array.isArray(raw.blocks)) fail(`${where}: note has no blocks`);
  const blocks = raw.blocks.map((b, i) => validateBlock(b, `${where} block ${i}`));
  const note: StudioNote = {
    start: raw.start,
    end: raw.end,
    kind: raw.kind as StudioNoteKind,
    blocks,
  };
  if (typeof raw.author === 'string') note.author = raw.author;
  // v244: the speaker's People id rides beside the name when the
  // studio pick was a listed person. Present-but-not-a-string is a
  // malformed pack — fail it like any other bad field rather than
  // silently dropping the face it names.
  if (raw.authorId !== undefined) {
    if (typeof raw.authorId !== 'string') fail(`${where}: authorId must be a string`);
    if (raw.authorId) note.authorId = raw.authorId;
  }
  if (raw.category === null) {
    note.category = null;
  } else if (raw.category !== undefined) {
    // v245: same merge as blocks — 'conversation' arrives, personal-story lands.
    const category = normalizeCategory(raw.category);
    if (category === null) fail(`${where}: unknown note category`);
    note.category = category;
  }
  return note;
}

function validateSection(raw: unknown, where: string): StudioSection {
  if (!isRecord(raw)) fail(`${where}: section is not an object`);
  if (!isInt(raw.start) || !isInt(raw.end) || raw.start < 1 || raw.end < raw.start) {
    fail(`${where}: section has an invalid verse span`);
  }
  if (!Array.isArray(raw.entries)) fail(`${where}: section has no entries`);
  const entries = raw.entries.map((e, i) => {
    if (!isRecord(e) || !isInt(e.start) || !isInt(e.end) || e.start < 1 || e.end < e.start) {
      fail(`${where} entry ${i}: invalid verse span`);
    }
    return { start: e.start, end: e.end };
  });
  return {
    start: raw.start,
    end: raw.end,
    title: typeof raw.title === 'string' ? raw.title : null,
    entries,
  };
}

function validateChapter(raw: unknown, where: string): StudioChapterPayload {
  if (!isRecord(raw)) fail(`${where}: chapter is not an object`);
  if (!isNonEmptyString(raw.book) || !(raw.book in CHAPTER_COUNTS)) {
    fail(`${where}: unknown book "${String(raw.book)}"`);
  }
  if (!isInt(raw.chapter) || raw.chapter < 1 || raw.chapter > CHAPTER_COUNTS[raw.book as string]) {
    fail(`${where}: chapter ${String(raw.chapter)} is out of range for ${String(raw.book)}`);
  }
  if (!isRecord(raw.opener)) fail(`${where}: chapter has no opener`);
  if (raw.opener.kind !== 'introduction' && raw.opener.kind !== 'previously') {
    fail(`${where}: opener kind must be introduction or previously`);
  }
  if (typeof raw.opener.text !== 'string') fail(`${where}: opener has no text`);
  if (!Array.isArray(raw.sections)) fail(`${where}: chapter has no sections`);
  if (!Array.isArray(raw.notes)) fail(`${where}: chapter has no notes`);
  const sections = raw.sections.map((s, i) => validateSection(s, `${where} section ${i}`));
  const notes = raw.notes.map((n, i) => validateNote(n, `${where} note ${i}`));
  // Every note must sit inside some section's span; a note with no
  // containing section would silently vanish on conversion, so the file
  // is rejected instead of losing his words.
  for (const note of notes) {
    const contained = sections.some((s) => s.start <= note.start && note.end <= s.end);
    if (!contained) fail(`${where}: note ${note.start}-${note.end} sits outside every section`);
  }
  const payload: StudioChapterPayload = {
    book: raw.book as string,
    chapter: raw.chapter,
    opener: { kind: raw.opener.kind, text: raw.opener.text },
    sections,
    notes,
  };
  if (raw.chapterState !== undefined) {
    if (!STUDY_STATUSES.includes(raw.chapterState as StudyStatus)) {
      fail(`${where}: unknown chapterState "${String(raw.chapterState)}"`);
    }
    payload.chapterState = raw.chapterState as StudyStatus;
  }
  return payload;
}

/**
 * Validate a schedule's rows. v345: a row whose minutes is missing,
 * null, not a whole number, or negative is REPAIRED, not rejected —
 * the Oct 29 incident, where one TV row's null minutes refused an
 * 801-row file whole at this line. The repair is the Studio's own
 * -41 rule: a timed row (a real HH:MM start) reads as 60 minutes,
 * an 'All day' row as 0. Every other rule in this validator stays
 * loud and whole-file. The repair count rides the payload so the
 * door's summary can name it — a repair is visible, never silent.
 */
function validateScheduleEvents(rawEvents: unknown[]): {
  events: StudioScheduleEventInput[];
  minutesRepaired: number;
} {
  let minutesRepaired = 0;
  const events = rawEvents.map((e, i) => {
    const where = `schedule event ${i}`;
    if (!isRecord(e)) fail(`${where}: event is not an object`);
    if (!isNonEmptyString(e.title)) fail(`${where}: event has no title`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(e.date))) fail(`${where}: event has no valid date`);
    if (typeof e.start !== 'string' || (e.start !== 'All day' && !/^\d{2}:\d{2}$/.test(e.start))) {
      fail(`${where}: event has no valid start time`);
    }
    let minutes: number;
    if (isInt(e.minutes) && e.minutes >= 0) {
      minutes = e.minutes;
    } else {
      minutes = e.start === 'All day' ? 0 : 60;
      minutesRepaired += 1;
    }
    if (e.type !== 'Event' && e.type !== 'Todo' && e.type !== 'Ministry') {
      fail(`${where}: event type must be Event, Todo, or Ministry`);
    }
    return {
      title: e.title as string,
      day: typeof e.day === 'string' ? e.day : '',
      date: e.date as string,
      start: e.start as string,
      minutes,
      type: e.type as 'Event' | 'Todo' | 'Ministry',
      online: e.online === true,
      recur: typeof e.recur === 'string' ? e.recur : 'none',
      // Additive keys (v224): accepted when present, never a reason to
      // reject the pack; anything not a string reads as unset.
      notes: typeof e.notes === 'string' ? e.notes : '',
      location: typeof e.location === 'string' ? e.location : '',
      // Grouped-todo steps (v236): unlike notes, a PRESENT subtasks key
      // is a payload the merge acts on, so a malformed one rejects the
      // pack under the door's validate-first discipline. Entries are
      // normalized to exactly the wire fields; the key stays ABSENT
      // when the pack omits it (absence is not an empty list).
      ...(e.subtasks !== undefined ? { subtasks: validateSubtasks(e.subtasks, where) } : {}),
      // The session's book/chapter (v237): Ministry rows only — the
      // keys mean nothing on an Event or Todo and are dropped there,
      // like every key the shape doesn't carry. On a Ministry row a
      // PRESENT key is a payload the ministry merge acts on, so a
      // malformed one rejects the pack, exactly like subtasks.
      ...(e.type === 'Ministry' ? validateBiblePair(e, where) : {}),
      // The rest of the record's fields (v239): kind-scoped, and a
      // malformed present key rejects the pack like the pair does.
      ...validateBridgeFields(e, where),
    };
  });
  return { events, minutesRepaired };
}

/** The v237 book/chapter pair on a Ministry schedule row: each key,
 *  when present, must be a non-empty string ("Colossians", "1") —
 *  either may ride alone (every consumer renders the chapter only
 *  alongside a book, so a lone chapter is inert, never an error). */
function validateBiblePair(
  e: Record<string, unknown>,
  where: string,
): { bibleBook?: string; bibleChapter?: string } {
  const pair: { bibleBook?: string; bibleChapter?: string } = {};
  if (e.bibleBook !== undefined) {
    if (!isNonEmptyString(e.bibleBook)) fail(`${where}: bibleBook must be a non-empty string when present`);
    pair.bibleBook = e.bibleBook;
  }
  if (e.bibleChapter !== undefined) {
    if (!isNonEmptyString(e.bibleChapter)) fail(`${where}: bibleChapter must be a non-empty string when present`);
    pair.bibleChapter = e.bibleChapter;
  }
  return pair;
}

/** The v236 subtask list: an array of {id, title, isCompleted} — a
 *  string id/title and a real boolean, nothing looser rides. A step's
 *  description (v239) rides when present and must be text. */
function validateSubtasks(raw: unknown, where: string): StudioSubtaskInput[] {
  if (!Array.isArray(raw)) fail(`${where}: subtasks is not an array`);
  return raw.map((s, j) => {
    const at = `${where}: subtask ${j}`;
    if (!isRecord(s)) fail(`${at} is not an object`);
    if (!isNonEmptyString(s.id)) fail(`${at} has no id`);
    if (typeof s.title !== 'string') fail(`${at} has no title`);
    if (typeof s.isCompleted !== 'boolean') fail(`${at} has no completion state`);
    if (s.description !== undefined && typeof s.description !== 'string') {
      fail(`${at} has a non-text description`);
    }
    return {
      id: s.id as string,
      title: s.title as string,
      isCompleted: s.isCompleted as boolean,
      ...(typeof s.description === 'string' ? { description: s.description } : {}),
    };
  });
}

// ── v239 bridge fields: one reader per wire type ───────────────────────
// Each returns undefined when the key is ABSENT and fails the whole
// file when a PRESENT key carries the wrong type — the validate-first
// discipline subtasks and the bible pair already follow.

function bridgeString(
  e: Record<string, unknown>,
  key: string,
  where: string,
): string | undefined {
  if (e[key] === undefined) return undefined;
  if (!isNonEmptyString(e[key])) fail(`${where}: ${key} must be a non-empty string when present`);
  return e[key] as string;
}

function bridgeCount(
  e: Record<string, unknown>,
  key: string,
  where: string,
): number | undefined {
  if (e[key] === undefined) return undefined;
  if (!isInt(e[key]) || (e[key] as number) < 0) {
    fail(`${where}: ${key} must be a whole number of 0 or more when present`);
  }
  return e[key] as number;
}

function bridgeFlag(
  e: Record<string, unknown>,
  key: string,
  where: string,
): boolean | undefined {
  if (e[key] === undefined) return undefined;
  if (typeof e[key] !== 'boolean') fail(`${where}: ${key} must be true or false when present`);
  return e[key] as boolean;
}

function bridgePeopleIds(
  e: Record<string, unknown>,
  where: string,
): string[] | undefined {
  if (e.linkedPeopleIds === undefined) return undefined;
  if (
    !Array.isArray(e.linkedPeopleIds) ||
    !e.linkedPeopleIds.every((id) => isNonEmptyString(id))
  ) {
    fail(`${where}: linkedPeopleIds must be a list of person ids when present`);
  }
  return [...(e.linkedPeopleIds as string[])];
}

/**
 * The v239 bridge fields on one schedule item, kind-scoped: shared
 * keys read on every kind; Event keys only on events; Todo keys only
 * on todos; a Ministry row's genre/deadline only on Ministry rows
 * (its travel time is shared with events). A key riding the wrong
 * kind is dropped unread, like the bible pair on an Event row.
 */
function validateBridgeFields(
  e: Record<string, unknown>,
  where: string,
): Partial<StudioScheduleEventInput> {
  const out: Partial<StudioScheduleEventInput> = {};
  const put = <K extends keyof StudioScheduleEventInput>(
    key: K,
    value: StudioScheduleEventInput[K] | undefined,
  ) => {
    if (value !== undefined) out[key] = value;
  };
  // Every kind.
  put('keyword', bridgeString(e, 'keyword', where));
  put('color', bridgeString(e, 'color', where));
  put('linkedPeopleIds', bridgePeopleIds(e, where));
  put('isCompleted', bridgeFlag(e, 'isCompleted', where));
  if (e.completedAt !== undefined) {
    if (!isValidIsoDateTime(e.completedAt)) {
      fail(`${where}: completedAt must be an ISO timestamp when present`);
    }
    out.completedAt = e.completedAt as string;
  }
  // Events and Ministry rows both sit on records with travel time.
  if (e.type === 'Event' || e.type === 'Ministry') {
    put('travelTimeMinutes', bridgeCount(e, 'travelTimeMinutes', where));
  }
  if (e.type === 'Event') {
    put('reminderMinutesBefore', bridgeCount(e, 'reminderMinutesBefore', where));
    put('season', bridgeCount(e, 'season', where));
    put('episode', bridgeCount(e, 'episode', where));
    put('posterImageUri', bridgeString(e, 'posterImageUri', where));
    put('posterColor', bridgeString(e, 'posterColor', where));
    put('isOffEvent', bridgeFlag(e, 'isOffEvent', where));
  }
  if (e.type === 'Todo') {
    put('tag', bridgeString(e, 'tag', where));
    put('icon', bridgeString(e, 'icon', where));
    put('order', bridgeCount(e, 'order', where));
    put('notificationsEnabled', bridgeFlag(e, 'notificationsEnabled', where));
    put('linkedEventId', bridgeString(e, 'linkedEventId', where));
    put('linkedMinistryId', bridgeString(e, 'linkedMinistryId', where));
    put('linkedEventTitle', bridgeString(e, 'linkedEventTitle', where));
    put('linkedMinistryTitle', bridgeString(e, 'linkedMinistryTitle', where));
    put('linkedEventColor', bridgeString(e, 'linkedEventColor', where));
    put('linkedMinistryColor', bridgeString(e, 'linkedMinistryColor', where));
    put('groupId', bridgeString(e, 'groupId', where));
    put('isGroup', bridgeFlag(e, 'isGroup', where));
    put('isGroupExpanded', bridgeFlag(e, 'isGroupExpanded', where));
  }
  if (e.type === 'Ministry') {
    put('ministryType', bridgeString(e, 'ministryType', where));
    if (e.dueDate !== undefined) {
      if (!isValidIsoDate(e.dueDate)) {
        fail(`${where}: dueDate must be a YYYY-MM-DD date when present`);
      }
      out.dueDate = e.dueDate as string;
    }
  }
  return out;
}

/** v365: the pack's schedule tombstones. A PRESENT deletedSchedule key
 *  is a payload the doors act on (exact-key deletions), so a malformed
 *  one rejects the file under the door's validate-first discipline —
 *  a deletion wire is never read loosely. Absent stays absent. */
function validateDeletedSchedule(raw: unknown, where: string): StudioScheduleTombstone[] {
  if (!Array.isArray(raw)) fail(`${where}: deletedSchedule is not an array`);
  return raw.map((t, i) => {
    const at = `${where}: tombstone ${i}`;
    if (!isRecord(t)) fail(`${at} is not an object`);
    if (!isValidIsoDate(t.date)) fail(`${at} has no valid date`);
    if (!isNonEmptyString(t.title)) fail(`${at} has no title`);
    let start = 'All day';
    if (t.start !== undefined) {
      if (typeof t.start !== 'string' || (t.start !== 'All day' && !/^\d{2}:\d{2}$/.test(t.start))) {
        fail(`${at} has no valid start time`);
      }
      start = t.start as string;
    }
    return { date: t.date as string, start, title: t.title as string };
  });
}

function validateSchedule(raw: unknown): StudioSchedulePayload {
  if (!isRecord(raw)) fail('Schedule pack is not an object');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(raw.weekOf))) {
    fail('Schedule pack has no valid weekOf date');
  }
  if (!Array.isArray(raw.events)) fail('Schedule pack has no events array');
  const { events, minutesRepaired } = validateScheduleEvents(raw.events);
  return {
    weekOf: raw.weekOf as string,
    events,
    minutesRepaired,
    ...(raw.deletedSchedule !== undefined
      ? { deletedSchedule: validateDeletedSchedule(raw.deletedSchedule, 'schedule pack') }
      : {}),
  };
}

/**
 * The backup's studioSchedule section (v227): same event shape, but the
 * section stamps exportedAt instead of a weekOf — the events are the
 * payload, validated exactly like a pack's. weekOf normalizes to ''.
 */
function validateScheduleSection(raw: unknown): StudioSchedulePayload {
  if (!isRecord(raw)) fail('Schedule section is not an object');
  if (!Array.isArray(raw.events)) fail('Schedule section has no events array');
  const { events, minutesRepaired } = validateScheduleEvents(raw.events);
  return {
    weekOf: '',
    events,
    minutesRepaired,
    ...(raw.deletedSchedule !== undefined
      ? { deletedSchedule: validateDeletedSchedule(raw.deletedSchedule, 'schedule section') }
      : {}),
  };
}

const RELATIONSHIP_TYPES: RelationshipType[] = [
  'Family',
  'Friends',
  'Ministry',
  'Unministry',
  'Prospect',
];

const REMINDER_FREQUENCIES: ReminderFrequency[] = ['none', 'daily', 'weekly', 'monthly'];

const NEED_KINDS: StudioNeedKind[] = ['Regular', 'Praise', 'Emergency'];

/** A real YYYY-MM-DD calendar date (2026-13-40 is not one). */
function isValidIsoDate(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const parsed = new Date(y, m - 1, d);
  return parsed.getFullYear() === y && parsed.getMonth() === m - 1 && parsed.getDate() === d;
}

function isValidIsoDateTime(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0 && !Number.isNaN(new Date(v).getTime());
}

function optionalFlag(raw: Record<string, unknown>, key: string, where: string): boolean {
  if (raw[key] === undefined) return false;
  if (typeof raw[key] !== 'boolean') fail(`${where}: ${key} must be true or false`);
  return raw[key] as boolean;
}

function validatePersonNeed(raw: unknown, where: string): StudioPersonNeedInput {
  if (!isRecord(raw)) fail(`${where}: need is not an object`);
  if (!isNonEmptyString(raw.id)) fail(`${where}: need has no id`);
  if (!isNonEmptyString(raw.title)) fail(`${where}: need has no title`);
  if (!NEED_KINDS.includes(raw.kind as StudioNeedKind)) {
    fail(`${where}: need kind must be Regular, Praise, or Emergency`);
  }
  if (raw.more !== undefined && typeof raw.more !== 'string') fail(`${where}: need "more" must be text`);
  if (raw.note !== undefined && typeof raw.note !== 'string') fail(`${where}: need "note" must be text`);
  if (raw.emergencyExpiresAt !== undefined && !isValidIsoDateTime(raw.emergencyExpiresAt)) {
    fail(`${where}: need has a bad emergencyExpiresAt date`);
  }
  if (raw.praiseExpiresAt !== undefined && !isValidIsoDateTime(raw.praiseExpiresAt)) {
    fail(`${where}: need has a bad praiseExpiresAt date`);
  }
  const need: StudioPersonNeedInput = {
    id: raw.id as string,
    title: raw.title as string,
    more: typeof raw.more === 'string' ? raw.more : '',
    kind: raw.kind as StudioNeedKind,
    isDone: optionalFlag(raw, 'isDone', where),
    isEmergency: optionalFlag(raw, 'isEmergency', where),
    isPraised: optionalFlag(raw, 'isPraised', where),
  };
  if (typeof raw.emergencyExpiresAt === 'string') need.emergencyExpiresAt = raw.emergencyExpiresAt;
  if (typeof raw.praiseExpiresAt === 'string') need.praiseExpiresAt = raw.praiseExpiresAt;
  if (typeof raw.note === 'string' && raw.note.trim()) need.note = raw.note;
  return need;
}

function validatePerson(raw: unknown, where: string): StudioPersonInput {
  if (!isRecord(raw)) fail(`${where}: person is not an object`);
  if (!isNonEmptyString(raw.id)) fail(`${where}: person has no id`);
  if (!isNonEmptyString(raw.name)) fail(`${where}: person has no name`);
  if (!RELATIONSHIP_TYPES.includes(raw.relationship as RelationshipType)) {
    fail(`${where}: unknown relationship type "${String(raw.relationship)}"`);
  }
  if (
    raw.reminderFrequency !== undefined &&
    !REMINDER_FREQUENCIES.includes(raw.reminderFrequency as ReminderFrequency)
  ) {
    fail(`${where}: unknown reminderFrequency "${String(raw.reminderFrequency)}"`);
  }
  if (raw.reminderDaysOfWeek !== undefined) {
    if (
      !Array.isArray(raw.reminderDaysOfWeek) ||
      !raw.reminderDaysOfWeek.every((d) => isInt(d) && d >= 0 && d <= 6)
    ) {
      fail(`${where}: reminderDaysOfWeek must be day numbers 0–6`);
    }
  }
  for (const key of ['lastPrayerCompletedDate', 'lastReached'] as const) {
    if (raw[key] !== undefined && raw[key] !== null && !isValidIsoDate(raw[key])) {
      fail(`${where}: ${key} is not a valid date`);
    }
  }
  if (raw.lastMeetingLocation !== undefined && typeof raw.lastMeetingLocation !== 'string') {
    fail(`${where}: lastMeetingLocation must be text`);
  }
  if (!Array.isArray(raw.needs)) fail(`${where}: person has no needs array`);
  const needs = raw.needs.map((n, i) => validatePersonNeed(n, `${where} need ${i}`));
  const needIds = new Set<string>();
  for (const need of needs) {
    if (needIds.has(need.id)) fail(`${where}: duplicate need id "${need.id}"`);
    needIds.add(need.id);
  }
  const person: StudioPersonInput = {
    id: raw.id as string,
    name: raw.name as string,
    relationship: raw.relationship as RelationshipType,
    needs,
  };
  if (raw.reminderFrequency !== undefined) person.reminderFrequency = raw.reminderFrequency as ReminderFrequency;
  if (raw.reminderDaysOfWeek !== undefined) person.reminderDaysOfWeek = [...(raw.reminderDaysOfWeek as number[])];
  if (raw.lastPrayerCompletedDate !== undefined) {
    person.lastPrayerCompletedDate = raw.lastPrayerCompletedDate as string | null;
  }
  if (raw.lastReached !== undefined) person.lastReached = raw.lastReached as string | null;
  if (typeof raw.lastMeetingLocation === 'string') person.lastMeetingLocation = raw.lastMeetingLocation;
  return person;
}

function validatePeoplePack(raw: Record<string, unknown>): StudioPeoplePack {
  if (!Array.isArray(raw.people)) fail('People pack has no people array');
  const people = raw.people.map((p, i) => validatePerson(p, `person ${i}`));
  const personIds = new Set<string>();
  for (const person of people) {
    if (personIds.has(person.id)) fail(`People pack lists person id "${person.id}" twice`);
    personIds.add(person.id);
  }
  if (raw.journal !== undefined && !Array.isArray(raw.journal)) fail('People pack journal is not a list');
  const journal = ((raw.journal as unknown[] | undefined) ?? []).map((j, i) => {
    const where = `journal entry ${i}`;
    if (!isRecord(j)) fail(`${where}: entry is not an object`);
    if (!isNonEmptyString(j.personId)) fail(`${where}: entry has no personId`);
    if (!isNonEmptyString(j.needId)) fail(`${where}: entry has no needId`);
    if (!isNonEmptyString(j.text)) fail(`${where}: entry has no text`);
    if (!NEED_KINDS.includes(j.kind as StudioNeedKind)) {
      fail(`${where}: entry kind must be Regular, Praise, or Emergency`);
    }
    if (j.personName !== undefined && typeof j.personName !== 'string') {
      fail(`${where}: personName must be text`);
    }
    const entry: StudioPeopleJournalInput = {
      personId: j.personId as string,
      needId: j.needId as string,
      text: j.text as string,
      kind: j.kind as StudioNeedKind,
    };
    if (typeof j.personName === 'string') entry.personName = j.personName;
    return entry;
  });
  return { people, journal };
}

/**
 * Parse and FULLY validate a studio file before anything is applied.
 * Accepts a single-chapter notes pack, a library pack, a schedule pack,
 * or a people pack. Throws a plain Error with a human-readable reason
 * on anything malformed.
 */
export function parseStudioFile(parsed: unknown): StudioPack {
  if (!isRecord(parsed)) fail('That file is not a studio pack (expected a JSON object).');
  // v228: a backup-shaped file carrying a studioStates section is a
  // states pack — the two-marks bridge coming back. Checked first: a
  // full backup also carries other sections, and this is the one the
  // door applies from it.
  if (isRecord(parsed.studioStates)) {
    return { kind: 'states', states: { chapters: validateStudioStates(parsed.studioStates) } };
  }
  // v229: a standalone ministries pack (prayercircle-ministries.json).
  // A full backup never carries a top-level ministries list — its
  // records ride the studioMinistries section below — so this branch
  // can never shadow the states road a backup takes above.
  if ('ministries' in parsed) {
    return { kind: 'ministries', ministries: validateStudioMinistriesPack(parsed) };
  }
  if (Array.isArray(parsed.chapters)) {
    const chapters = parsed.chapters.map((c, i) => validateChapter(c, `chapter ${i}`));
    if (chapters.length === 0) fail('Library pack has no chapters.');
    return { kind: 'notes', chapters };
  }
  if (typeof parsed.book === 'string' && isInt(parsed.chapter)) {
    return { kind: 'notes', chapters: [validateChapter(parsed, `${parsed.book} ${parsed.chapter}`)] };
  }
  if (typeof parsed.weekOf === 'string' && Array.isArray(parsed.events)) {
    return { kind: 'schedule', schedule: validateSchedule(parsed) };
  }
  if (Array.isArray(parsed.people)) {
    return { kind: 'people', people: validatePeoplePack(parsed) };
  }
  // v229: the studioMinistries section of a full export, offered on its
  // own. (A complete backup takes the states road above; its ministries
  // section is applied by the dedicated Import Ministries Pack row,
  // which reads the section directly.)
  if (isRecord(parsed.studioMinistries)) {
    return { kind: 'ministries', ministries: validateStudioMinistriesPack(parsed.studioMinistries) };
  }
  fail(
    'That file is not a studio pack — expected prayercircle-notes.json, ' +
      'prayercircle-library.json, prayercircle-schedule.json, prayercircle-people.json, ' +
      'or prayercircle-ministries.json.',
  );
}

// ── v231 "One Door" — the whole file, every section ─────────────────────────
// A studio file is a bundle, not a kind. Standalone packs carry their
// payload at the top level; a full PrayerCircle backup carries the same
// payloads as named sections (studioStates / studioSchedule /
// studioPeople / studioMinistries). This parser detects every section
// present — in either placement — and validates ALL of it before
// returning: one malformed section rejects the whole file, so nothing
// ever half-applies. The export-only sections (studioBubbles,
// studioJournal) are the studio's reading feed, not import payloads,
// and are ignored here by design.

export interface StudioFilePlan {
  /** Notes payloads (single-chapter pack or library `chapters`). */
  notes: StudioChapterPayload[] | null;
  /** The two chapter marks (backup `studioStates` section). */
  states: StudioStatesSection | null;
  /** Schedule events, normalized to pack shape (weekOf '' when the
   *  payload rode a backup's studioSchedule section). */
  schedule: StudioSchedulePayload | null;
  /** People + journal (standalone pack or backup `studioPeople`). */
  people: StudioPeoplePack | null;
  /** Ministry records + tombstones (standalone pack or backup
   *  `studioMinistries`). */
  ministries: StudioMinistriesPack | null;
  /** v360 — the morning email digest (the `emailDigest` section).
   *  The Email page's store (lib/email-digest.ts) could only be
   *  written by a full backup restore — and the restore door sets
   *  people/journal/fasts/streak/profile/settings from the file
   *  with empty fallbacks for absent keys, so a digest-only file
   *  through that door would wipe his data. This section is the
   *  safe door: validated here like every other section, applied
   *  by writing ONLY the prayercircle.email-digest.v1 key. A pack
   *  carrying only a digest changes nothing else in the app. */
  emailDigest: EmailDigest | null;
  /** v379 — the gas price snapshot (the `gasPrices` section).
   *  The same safe-door shape as the digest: validated here,
   *  applied by writing ONLY the prayercircle.gas-prices.v1 key,
   *  and FORWARD-ONLY — the apply step keeps whichever snapshot
   *  carries the newer preparedAt (lib/gas-prices.ts). A pack
   *  carrying only a gas snapshot changes nothing else. */
  gasPrices: GasPriceSnapshot | null;
  /** v407 — the prepared news briefing (the `newsBriefing`
   *  section). The News page's snapshot store
   *  (lib/news-briefing.ts) could not be written by ANY door —
   *  the page fetched its feeds live and its only storage was a
   *  cache of its own fetch — so the morning pack's news file
   *  had nowhere to land. This section is the safe door, the
   *  digest's and the gas snapshot's sibling: validated here,
   *  applied by writing ONLY the prayercircle.news-briefing.v1
   *  key, FORWARD-ONLY by preparedAt. A pack carrying only a
   *  briefing changes nothing else in the app. */
  newsBriefing: NewsBriefingSnapshot | null;
  /** v472 — the weather snapshot (the `weather` section). The
   *  Daily Summary's temperature clause (lib/weather-snapshot.ts)
   *  had no door at all: the summary prose could only ever speak
   *  from stores a pack can write. This section is the safe door,
   *  the fourth morning sibling: validated here, applied by
   *  writing ONLY the prayercircle.weather.v1 key, FORWARD-ONLY
   *  by preparedAt. A pack carrying only weather changes nothing
   *  else in the app. */
  weather: WeatherSnapshot | null;
  /** v417 — the mark-changes list (the `studioMarkChanges`
   *  section): desk-side highlight edits coming home. The ONE
   *  authorized exception to the marks layer's import immunity —
   *  a change list, never a snapshot: applied by
   *  applyStudioMarkChanges (studio-marks.ts), which merges
   *  item-by-item into the marks store, touching only the
   *  highlights the list names, after stashing a one-deep
   *  snapshot of the pre-apply map. */
  markChanges: StudioMarkChangesSection | null;
}

export function emptyStudioFilePlan(): StudioFilePlan {
  return { notes: null, states: null, schedule: null, people: null, ministries: null, emailDigest: null, gasPrices: null, newsBriefing: null, weather: null, markChanges: null };
}

export function studioFileHasSections(plan: StudioFilePlan): boolean {
  return (
    plan.notes !== null ||
    plan.states !== null ||
    plan.schedule !== null ||
    plan.people !== null ||
    plan.ministries !== null ||
    plan.emailDigest !== null ||
    plan.gasPrices !== null ||
    plan.newsBriefing !== null ||
    plan.weather !== null ||
    plan.markChanges !== null
  );
}

/**
 * Parse and FULLY validate a whole studio file — any mix of sections.
 * Throws a plain Error with a human-readable reason on anything
 * malformed, before the caller applies a single section.
 *
 * v345 — THE COMBINED PACK (prayercircle-pack.json). Jonathan's ruling
 * (Oct 29): the Studio→app transfer is ONE file — one file out of the
 * Studio, one import in the app. The envelope is the FLAT UNION of the
 * five standalone packs' own top-level shapes, plus one marker key:
 *
 *   {
 *     "pack": "combined",                  // the marker (see below)
 *     "chapters":    [ … ],                // notes, library form
 *     "studioStates": { "chapters": [ … ] }, // states / read marks
 *     "weekOf": "YYYY-MM-DD",              // schedule — weekOf and
 *     "events":      [ … ],                //   events ride together
 *     "deletedSchedule": [ … ],            //   v365: optional exact-key
 *                                          //   tombstones (Option B)
 *     "whiteSpace":  { … },                //   optional, advisory only
 *     "people":      [ … ],                // people — people and
 *     "journal":     [ … ],                //   journal ride together
 *     "ministries":  [ … ],                // ministries records
 *     "deletedIds":  [ … ]                 //   optional tombstones
 *   }
 *
 * v407 — the envelope also carries the three MORNING sections
 * (the digest / gas / news doors above), each under its own key
 * with its own preparedAt inside the section:
 *     "emailDigest":  { … },  "gasPrices": { … },  "newsBriefing": { … }
 * v472 — a FOURTH morning section rides the same way, under its
 * own key with its own preparedAt:
 *     "weather": { … }
 * (the Daily Summary's temperature snapshot — see
 * validateWeatherSection and lib/weather-snapshot.ts for the
 * shape the producer emits).
 * so the morning transfer is ONE file too — one combined pack
 * out of Eva's prep, one import, each section landing on its
 * own page and nothing else. A section that omits its own
 * preparedAt borrows the pack's top-level "preparedAt" when the
 * pack carries one (a present-but-unreadable section stamp
 * still fails, exactly as a standalone section always has).
 *
 * Why flat: this parser has always detected sections by presence and
 * read each from exactly the top-level keys its standalone pack uses,
 * so the flat union keeps every existing validator and merger working
 * unchanged — no section is re-shaped, renamed, or nested. (The full
 * backup's nested studio* sections are the same payloads in the other
 * placement and keep working; the flat form is deliberately NOT the
 * backup's shape, so a pack can never be mistaken for a restore.)
 * The "pack": "combined" marker gives the file its identity — it is
 * how a reader (and the Studio's own emitter contract) tells this is
 * the one-file pack and not a stray multi-key file; the parser itself
 * still reads sections by presence, so a section key is simply absent
 * when the section carries nothing. Emitter rules that follow from
 * the validators, unchanged from the standalone packs: omit a section
 * with no payload (notably `chapters` — an empty chapters array is
 * refused, as an empty library pack always was), and `weekOf` never
 * rides without `events`.
 */
/**
 * v360 — validate the `emailDigest` section into the Email page's
 * own shape (lib/email-digest.ts). Eva's morning prep emits:
 *   { preparedAt: ISO string,
 *     digest: [{ sender, subject, why }],
 *     groups: { reply: [rows], money: [rows], people: [rows] },
 *     filedCount: number }
 * with rows { sender, subject, preview } (a `when` word may ride).
 * Structural garbage fails the whole file, like every other
 * section; leaf strings default to "" when absent. A section with
 * no content at all is refused — writing it would clear the digest
 * already waiting on the Email page.
 */
export function validateEmailDigestSection(value: unknown, fallbackPreparedAt = ''): EmailDigest {
  if (!isRecord(value)) fail('The emailDigest section is not an object.');
  // v407: a section with no stamp of its own borrows the pack's.
  const preparedAt =
    typeof value.preparedAt === 'string'
      ? value.preparedAt
      : value.preparedAt === undefined
        ? fallbackPreparedAt
        : '';
  if (!preparedAt) fail('The emailDigest section has no preparedAt time.');
  const leaf = (row: Record<string, unknown>, key: string): string => {
    const v = row[key];
    if (v === undefined) return '';
    if (typeof v !== 'string') fail(`The emailDigest section has a non-string ${key}.`);
    return v as string;
  };
  const leads = (raw: unknown, where: string): EmailDigest['digest'] => {
    if (raw === undefined) return [];
    if (!Array.isArray(raw)) fail(`The emailDigest ${where} list is not a list.`);
    return raw.map((entry, i) => {
      if (!isRecord(entry)) fail(`The emailDigest ${where} entry ${i} is not an object.`);
      return { sender: leaf(entry, 'sender'), subject: leaf(entry, 'subject'), why: leaf(entry, 'why') };
    });
  };
  const rows = (raw: unknown, where: string): EmailDigest['groups']['reply'] => {
    if (raw === undefined) return [];
    if (!Array.isArray(raw)) fail(`The emailDigest ${where} list is not a list.`);
    return raw.map((entry, i) => {
      if (!isRecord(entry)) fail(`The emailDigest ${where} entry ${i} is not an object.`);
      return {
        sender: leaf(entry, 'sender'),
        subject: leaf(entry, 'subject'),
        preview: leaf(entry, 'preview'),
        when: leaf(entry, 'when'),
      };
    });
  };
  const groupsRaw = value.groups === undefined ? {} : value.groups;
  if (!isRecord(groupsRaw)) fail('The emailDigest groups are not an object.');
  let filedCount = 0;
  if (value.filedCount !== undefined) {
    if (typeof value.filedCount !== 'number' || !Number.isFinite(value.filedCount) || value.filedCount < 0) {
      fail('The emailDigest filedCount is not a number.');
    }
    filedCount = Math.floor(value.filedCount as number);
  }
  const digest: EmailDigest = {
    preparedAt,
    digest: leads(value.digest, 'digest'),
    groups: {
      reply: rows(groupsRaw.reply, 'reply'),
      money: rows(groupsRaw.money, 'money'),
      people: rows(groupsRaw.people, 'people'),
    },
    filedCount,
  };
  const hasContent =
    digest.digest.length > 0 ||
    digest.groups.reply.length > 0 ||
    digest.groups.money.length > 0 ||
    digest.groups.people.length > 0 ||
    digest.filedCount > 0;
  if (!hasContent) fail('The emailDigest section carries no digest content.');
  return digest;
}

/**
 * v379 — validate the `gasPrices` section into the Gas page's
 * own shape (lib/gas-prices.ts). Eva's prep emits:
 *   { preparedAt: ISO string,
 *     areaLabel: string,
 *     stations: [{ name, brand?, priceRegular (number|null),
 *                  reportedAt (ISO|null), distanceMiles
 *                  (number|null), membersOnly (bool), note? }] }
 * Structural garbage fails the whole file, like every other
 * section. A price is a positive number or an explicit null —
 * "no price listed" is a fact the page renders, never a zero.
 * Stations without a name carry nothing and are dropped; a
 * section left with no stations is refused — writing it would
 * clear the prices already waiting on the Gas page. preparedAt
 * must read as a time: the apply is forward-only on that stamp.
 */
export function validateGasPricesSection(value: unknown, fallbackPreparedAt = ''): GasPriceSnapshot {
  if (!isRecord(value)) fail('The gasPrices section is not an object.');
  // v407: a section with no stamp of its own borrows the pack's.
  const preparedAt =
    typeof value.preparedAt === 'string'
      ? value.preparedAt
      : value.preparedAt === undefined
        ? fallbackPreparedAt
        : '';
  if (!preparedAt || Number.isNaN(Date.parse(preparedAt))) {
    fail('The gasPrices section has no readable preparedAt time.');
  }
  const areaLabel = typeof value.areaLabel === 'string' ? value.areaLabel : '';
  if (value.areaLabel !== undefined && typeof value.areaLabel !== 'string') {
    fail('The gasPrices areaLabel is not a string.');
  }
  const stationsRaw = value.stations;
  if (!Array.isArray(stationsRaw)) fail('The gasPrices stations list is not a list.');
  const stations: GasPriceSnapshot['stations'] = [];
  stationsRaw.forEach((entry, i) => {
    if (!isRecord(entry)) fail(`The gasPrices station ${i} is not an object.`);
    const leafString = (key: string): string => {
      const v = entry[key];
      if (v === undefined) return '';
      if (typeof v !== 'string') fail(`The gasPrices station ${i} has a non-string ${key}.`);
      return v as string;
    };
    const leafPrice = (key: string): number | null => {
      const v = entry[key];
      if (v === undefined || v === null) return null;
      if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) {
        fail(`The gasPrices station ${i} has an unreadable ${key}.`);
      }
      return v as number;
    };
    const leafIso = (key: string): string | null => {
      const v = entry[key];
      if (v === undefined || v === null) return null;
      if (typeof v !== 'string' || Number.isNaN(Date.parse(v))) {
        fail(`The gasPrices station ${i} has an unreadable ${key}.`);
      }
      return v as string;
    };
    const leafDistance = (key: string): number | null => {
      const v = entry[key];
      if (v === undefined || v === null) return null;
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
        fail(`The gasPrices station ${i} has an unreadable ${key}.`);
      }
      return v as number;
    };
    const name = leafString('name').trim();
    if (!name) return; // a nameless station carries nothing — dropped, like a digest row with no subject
    const station: GasPriceSnapshot['stations'][number] = {
      name,
      priceRegular: leafPrice('priceRegular'),
      reportedAt: leafIso('reportedAt'),
      distanceMiles: leafDistance('distanceMiles'),
      membersOnly: entry.membersOnly === true,
    };
    if (entry.membersOnly !== undefined && typeof entry.membersOnly !== 'boolean') {
      fail(`The gasPrices station ${i} has a non-boolean membersOnly.`);
    }
    const brand = leafString('brand').trim();
    if (brand) station.brand = brand;
    const note = leafString('note').trim();
    if (note) station.note = note;
    stations.push(station);
  });
  if (stations.length === 0) fail('The gasPrices section carries no stations.');
  return { preparedAt, areaLabel, stations };
}

/**
 * v407 — validate the `newsBriefing` section into the News
 * page's snapshot shape (lib/news-briefing.ts). Eva's morning
 * prep emits (news-briefing.json):
 *   { preparedAt: ISO string,
 *     items: [{ area, date, headline, source, summary, url }] }
 * — the picked Briefing set, one flat list, each item carrying
 * its area (one of the four: Church News / Church Leadership /
 * Prayer & Fasting / For Ministers). An optional `more` list
 * of the same item shape rides for "More from your sources".
 * Structural garbage fails the whole file, like every other
 * section. An item with no headline or no link carries nothing
 * and is dropped (a nameless gas station, a subject-less digest
 * row); an item naming an area the page has no head for is
 * malformed, not droppable — it could never render anywhere.
 * A section left with no briefing items is refused — writing
 * it would clear the briefing already waiting on the News
 * page. preparedAt must read as a time: the apply is
 * forward-only on that stamp.
 */
export function validateNewsBriefingSection(value: unknown, fallbackPreparedAt = ''): NewsBriefingSnapshot {
  if (!isRecord(value)) fail('The newsBriefing section is not an object.');
  // A section with no stamp of its own borrows the pack's.
  const preparedAt =
    typeof value.preparedAt === 'string'
      ? value.preparedAt
      : value.preparedAt === undefined
        ? fallbackPreparedAt
        : '';
  if (!preparedAt || Number.isNaN(Date.parse(preparedAt))) {
    fail('The newsBriefing section has no readable preparedAt time.');
  }
  const leaf = (row: Record<string, unknown>, key: string, where: string, i: number): string => {
    const v = row[key];
    if (v === undefined) return '';
    if (typeof v !== 'string') fail(`The newsBriefing ${where} entry ${i} has a non-string ${key}.`);
    return v as string;
  };
  const items = (raw: unknown, where: string): NewsBriefingItem[] => {
    if (raw === undefined) return [];
    if (!Array.isArray(raw)) fail(`The newsBriefing ${where} list is not a list.`);
    const out: NewsBriefingItem[] = [];
    raw.forEach((entry, i) => {
      if (!isRecord(entry)) fail(`The newsBriefing ${where} entry ${i} is not an object.`);
      const headline = leaf(entry, 'headline', where, i).trim();
      const url = leaf(entry, 'url', where, i).trim();
      if (!headline || !url) return; // carries nothing — dropped, like a nameless station
      const area = leaf(entry, 'area', where, i).trim();
      if (!(NEWS_AREAS as readonly string[]).includes(area)) {
        fail(`The newsBriefing ${where} entry ${i} names an unknown area "${area}".`);
      }
      out.push({
        area: area as NewsArea,
        date: leaf(entry, 'date', where, i).trim(),
        headline,
        source: leaf(entry, 'source', where, i).trim(),
        summary: leaf(entry, 'summary', where, i).trim(),
        url,
      });
    });
    return out;
  };
  const briefing = items(value.items, 'items');
  const more = items(value.more, 'more');
  if (briefing.length === 0) fail('The newsBriefing section carries no briefing items.');
  return { preparedAt, briefing, more };
}

/**
 * v472 — validate the `weather` section into the summary's
 * snapshot shape (lib/weather-snapshot.ts). Eva's morning prep
 * emits:
 *   { preparedAt: ISO string,
 *     location: string ("Lancaster"),
 *     now: { date: "YYYY-MM-DD", tempF: number,
 *            condition: string } | null,
 *     days: [{ date: "YYYY-MM-DD", highF: number,
 *              lowF: number, condition: string }] }
 * — the current temperature for the pack morning plus ~5 days
 * of high/low forecasts. Structural garbage fails the whole
 * file, like every other section. A day entry with no readable
 * date or no temperatures carries nothing and is dropped (a
 * nameless gas station, a headline-less news item); a section
 * left with neither a "now" nor any day is refused — writing
 * it would clear the weather already waiting for the summary.
 * preparedAt must read as a time: the apply is forward-only
 * on that stamp.
 *
 * v479 — the section may also carry "hourly": the day's curve,
 * [{ at: "YYYY-MM-DDTHH:00", tempF: <int>, condition }] for
 * the pack's today and tomorrow. It is OPTIONAL — its absence
 * (every pack before v479) validates exactly as before. Its
 * entries are judged one by one, never as a bloc: a bad "at"
 * format, an hour off the clock, a non-integer temperature or
 * a non-string condition drops THAT entry alone, and a list
 * left with no usable entry is simply a section with no
 * curve — never a reason to refuse weather that stands.
 *
 * v490 — the section may also carry "details" (the day's felt
 * temperature, rain chance, wind, humidity, UV, sunrise and
 * sunset, for the weather page) and any day may carry a
 * "precipChancePct". Both are OPTIONAL in the curve's pattern:
 * parsed field by field through the store's own reader
 * (parseWeatherDetails), a malformed field drops singly, and
 * the days list is accepted at whatever length the producer
 * sends (the full ten since v490).
 */
export function validateWeatherSection(value: unknown, fallbackPreparedAt = ''): WeatherSnapshot {
  if (!isRecord(value)) fail('The weather section is not an object.');
  // A section with no stamp of its own borrows the pack's.
  const preparedAt =
    typeof value.preparedAt === 'string'
      ? value.preparedAt
      : value.preparedAt === undefined
        ? fallbackPreparedAt
        : '';
  if (!preparedAt || Number.isNaN(Date.parse(preparedAt))) {
    fail('The weather section has no readable preparedAt time.');
  }
  if (value.location !== undefined && typeof value.location !== 'string') {
    fail('The weather location is not a string.');
  }
  const location =
    (typeof value.location === 'string' ? value.location : 'Lancaster').trim() || 'Lancaster';
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const leafCondition = (row: Record<string, unknown>, where: string): string => {
    const v = row.condition;
    if (v === undefined) return '';
    if (typeof v !== 'string') fail(`The weather ${where} has a non-string condition.`);
    return (v as string).trim();
  };
  let now: WeatherSnapshot['now'] = null;
  if (value.now !== undefined && value.now !== null) {
    if (!isRecord(value.now)) fail('The weather now entry is not an object.');
    const date = typeof value.now.date === 'string' ? value.now.date : '';
    if (!DATE_RE.test(date)) fail('The weather now entry has no readable date.');
    const tempF = value.now.tempF;
    if (typeof tempF !== 'number' || !Number.isFinite(tempF)) {
      fail('The weather now entry has an unreadable tempF.');
    }
    now = { date, tempF: tempF as number, condition: leafCondition(value.now, 'now entry') };
  }
  const days: WeatherSnapshot['days'] = [];
  if (value.days !== undefined) {
    if (!Array.isArray(value.days)) fail('The weather days list is not a list.');
    value.days.forEach((entry, i) => {
      if (!isRecord(entry)) fail(`The weather day ${i} is not an object.`);
      if (entry.date !== undefined && typeof entry.date !== 'string') {
        fail(`The weather day ${i} has a non-string date.`);
      }
      const date = typeof entry.date === 'string' ? entry.date : '';
      const highF = entry.highF;
      const lowF = entry.lowF;
      if (
        (highF !== undefined && (typeof highF !== 'number' || !Number.isFinite(highF))) ||
        (lowF !== undefined && (typeof lowF !== 'number' || !Number.isFinite(lowF)))
      ) {
        fail(`The weather day ${i} has an unreadable temperature.`);
      }
      // No readable date, or a missing high or low: the entry
      // carries nothing — dropped, like a nameless station.
      if (!DATE_RE.test(date) || typeof highF !== 'number' || typeof lowF !== 'number') return;
      const day: WeatherSnapshot['days'][number] = {
        date,
        highF,
        lowF,
        condition: leafCondition(entry, `day ${i}`),
      };
      // v490: the day's rain chance, when the pack carried a
      // readable one — a malformed chance drops alone, the
      // day itself stands (the curve's own rule).
      const precip = entry.precipChancePct;
      if (typeof precip === 'number' && Number.isFinite(precip)) {
        day.precipChancePct = precip;
      }
      days.push(day);
    });
  }
  // v479: the optional hourly curve — entries judged singly
  // (see the header note): anything malformed drops alone,
  // and an all-malformed list is a section with no curve.
  const HOURLY_AT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:00$/;
  const hourly: WeatherHourlyEntry[] = [];
  if (value.hourly !== undefined) {
    if (!Array.isArray(value.hourly)) fail('The weather hourly list is not a list.');
    value.hourly.forEach((entry) => {
      if (!isRecord(entry)) return;
      const at = typeof entry.at === 'string' ? entry.at.trim() : '';
      if (!HOURLY_AT_RE.test(at)) return;
      const hour = Number(at.slice(11, 13));
      if (!Number.isInteger(hour) || hour < 0 || hour > 23) return;
      const tempF = entry.tempF;
      if (typeof tempF !== 'number' || !Number.isInteger(tempF)) return;
      if (entry.condition !== undefined && typeof entry.condition !== 'string') return;
      hourly.push({
        at,
        tempF,
        condition: typeof entry.condition === 'string' ? entry.condition.trim() : '',
      });
    });
  }
  if (now === null && days.length === 0) fail('The weather section carries no weather.');
  const snapshot: WeatherSnapshot = { preparedAt, location, now, days };
  if (hourly.length > 0) snapshot.hourly = hourly;
  // v490: the optional details block (the day's felt
  // temperature, rain chance, wind, humidity, UV, sunrise,
  // sunset — for the weather page). Parsed by the store's own
  // field-by-field reader: a malformed field drops singly, a
  // block with no readable date is simply absent, and neither
  // is ever a reason to refuse weather that stands. The days
  // list likewise runs as long as the producer sends it (the
  // full ten since v490) — there is no length gate here and
  // there never was.
  if (value.details !== undefined) {
    const details = parseWeatherDetails(value.details);
    if (details) snapshot.details = details;
  }
  return snapshot;
}

export function parseStudioFileFull(parsed: unknown): StudioFilePlan {
  if (!isRecord(parsed)) fail('That file is not a studio pack (expected a JSON object).');
  const plan = emptyStudioFilePlan();
  // v407: the pack's own stamp — a morning section that omits
  // its preparedAt borrows this one (see the validators).
  const packPreparedAt = typeof parsed.preparedAt === 'string' ? parsed.preparedAt : '';
  // The morning digest (v360): a top-level section of the combined
  // pack; applied by writing only its own storage key.
  if (parsed.emailDigest !== undefined) {
    plan.emailDigest = validateEmailDigestSection(parsed.emailDigest, packPreparedAt);
  }
  // The gas snapshot (v379): the digest's sibling — its own key,
  // forward-only at apply time.
  if (parsed.gasPrices !== undefined) {
    plan.gasPrices = validateGasPricesSection(parsed.gasPrices, packPreparedAt);
  }
  // The news briefing (v407): the third morning sibling — its
  // own key (prayercircle.news-briefing.v1), forward-only at
  // apply time; while a snapshot is stored, the News page
  // renders it instead of fetching live.
  if (parsed.newsBriefing !== undefined) {
    plan.newsBriefing = validateNewsBriefingSection(parsed.newsBriefing, packPreparedAt);
  }
  // The weather snapshot (v472): the fourth morning sibling —
  // its own key (prayercircle.weather.v1), forward-only at apply
  // time; the Daily Summary's closing clause reads it.
  if (parsed.weather !== undefined) {
    plan.weather = validateWeatherSection(parsed.weather, packPreparedAt);
  }
  // The two marks (v228): the studioStates section, wherever it rides.
  if (parsed.studioStates !== undefined) {
    plan.states = { chapters: validateStudioStates(parsed.studioStates) };
  }
  // Ministries (v229): the standalone file's top-level list wins; the
  // backup section carries the identical shape.
  if ('ministries' in parsed) {
    plan.ministries = validateStudioMinistriesPack(parsed);
  } else if (parsed.studioMinistries !== undefined) {
    plan.ministries = validateStudioMinistriesPack(parsed.studioMinistries);
  }
  // Mark changes (v417): the studioMarkChanges section — a change
  // list for the marks layer, validated completely like every other
  // section. Validated here, applied by studio-marks.ts (the merge
  // is item-by-item and names every highlight it touches).
  if (parsed.studioMarkChanges !== undefined) {
    plan.markChanges = validateStudioMarkChanges(parsed.studioMarkChanges);
  }
  // People (v225): standalone pack keys at the top; a backup's
  // studioPeople section is the same { people, journal } shape.
  if (Array.isArray(parsed.people)) {
    plan.people = validatePeoplePack(parsed);
  } else if (isRecord(parsed.studioPeople)) {
    plan.people = validatePeoplePack(parsed.studioPeople);
  }
  // Schedule (v222 pack / v227 backup section): same events either way.
  if (typeof parsed.weekOf === 'string' && Array.isArray(parsed.events)) {
    plan.schedule = validateSchedule(parsed);
  } else if (parsed.studioSchedule !== undefined) {
    plan.schedule = validateScheduleSection(parsed.studioSchedule);
  }
  // Notes (v222): a library's chapters list, or one chapter's payload.
  if (Array.isArray(parsed.chapters)) {
    const chapters = parsed.chapters.map((c, i) => validateChapter(c, `chapter ${i}`));
    if (chapters.length === 0) fail('Library pack has no chapters.');
    plan.notes = chapters;
  } else if (typeof parsed.book === 'string' && isInt(parsed.chapter)) {
    plan.notes = [validateChapter(parsed, `${parsed.book} ${parsed.chapter}`)];
  }
  if (!studioFileHasSections(plan)) {
    fail(
      'That file is not a studio pack — expected prayercircle-pack.json (the combined pack), ' +
        'prayercircle-notes.json, prayercircle-library.json, prayercircle-schedule.json, ' +
        'prayercircle-people.json, prayercircle-ministries.json, or a PrayerCircle backup ' +
        'carrying studio sections.',
    );
  }
  return plan;
}

/** A single-kind pack as the one-section plan it always was — the
 *  Drive planner's bridge from parseStudioFile's world to the plan. */
export function studioFilePlanFromPack(pack: StudioPack): StudioFilePlan {
  const plan = emptyStudioFilePlan();
  switch (pack.kind) {
    case 'notes':
      plan.notes = pack.chapters;
      break;
    case 'schedule':
      plan.schedule = pack.schedule;
      break;
    case 'people':
      plan.people = pack.people;
      break;
    case 'ministries':
      plan.ministries = pack.ministries;
      break;
    case 'states':
      plan.states = pack.states;
      break;
  }
  return plan;
}

// ── The one summary the door speaks (v231) ──────────────────────────────────

export interface StudioApplyCounts {
  chaptersUpdated: number;
  statesSet: number;
  readMarks: number;
  /** v345: read marks the file carried that were already there (the
   *  stored date equal or later) — named in the summary so a forward-
   *  only skip is never silent. */
  readMarksAlreadyThere: number;
  /** v345: the schedule counts, split by kind (the v231 lump
   *  `eventsAdded` counted events and todos together under an
   *  "Events" label and let dedupe matches pass silently). */
  scheduleEventsAdded: number;
  scheduleTodosAdded: number;
  scheduleEventsAlreadyThere: number;
  scheduleTodosAlreadyThere: number;
  /** v365: stored events/todos a pack's schedule tombstones removed
   *  (exact-key matches only — see applyScheduleTombstones). */
  scheduleRemoved: number;
  /** v345: schedule rows whose invalid minutes the validator
   *  repaired instead of rejecting the file. */
  minutesRepaired: number;
  peopleUpdated: number;
  needs: number;
  journalEntries: number;
  ministriesAdded: number;
  ministriesUpdated: number;
  ministriesDeleted: number;
  /** Ministry rows a schedule pack landed on a ministry record
   *  (v237's book/chapter ties; any carried record field since v239 —
   *  mergeStudioScheduleMinistries). */
  ministriesLinked: number;
  /** v360: 1 when the file's emailDigest section was written to the
   *  Email page's store (the section is a single snapshot, so the
   *  count is boolean in spirit). */
  emailDigest: number;
  /** v379: 1 when the file's gasPrices section was written to the
   *  Gas page's store. The write is forward-only, so an older
   *  snapshot arriving late counts 0 — the summary says what
   *  actually happened. */
  gasPrices: number;
  /** v407: 1 when the file's newsBriefing section was written to
   *  the News page's store. Forward-only, like its siblings —
   *  an older briefing arriving late counts 0. */
  newsBriefing: number;
  /** v472: 1 when the file's weather section was written to
   *  the summary's weather store. Forward-only, like its
   *  siblings — an older snapshot arriving late counts 0. */
  weather: number;
  /** v417: mark changes applied to the marks layer — upserts that
   *  landed and removals that removed something (a removal naming
   *  a missing highlight is a no-op and counts neither). */
  markChangesUpserted: number;
  markChangesRemoved: number;
}

export function emptyStudioApplyCounts(): StudioApplyCounts {
  return {
    chaptersUpdated: 0,
    statesSet: 0,
    readMarks: 0,
    readMarksAlreadyThere: 0,
    scheduleEventsAdded: 0,
    scheduleTodosAdded: 0,
    scheduleEventsAlreadyThere: 0,
    scheduleTodosAlreadyThere: 0,
    scheduleRemoved: 0,
    minutesRepaired: 0,
    peopleUpdated: 0,
    needs: 0,
    journalEntries: 0,
    ministriesAdded: 0,
    ministriesUpdated: 0,
    ministriesDeleted: 0,
    ministriesLinked: 0,
    emailDigest: 0,
    gasPrices: 0,
    newsBriefing: 0,
    weather: 0,
    markChangesUpserted: 0,
    markChangesRemoved: 0,
  };
}

/**
 * One line naming what a whole file did, section by section — only the
 * sections the file actually carried get a segment. v345 made the
 * schedule segment honest: events and todos count separately, the
 * rows that were ALREADY THERE (dedupe-matched) are named rather than
 * silent, and minutes the validator repaired are counted — so a
 * no-op import reads as a no-op, never as a failure or a success it
 * wasn't:
 * "Notes: N chapters · States: M · Read marks: R ·
 *  Schedule: E events + T todos added · A already there ·
 *  People updated: P · Ministries: A added / U updated / D deleted".
 */
export function formatStudioImportSummary(plan: StudioFilePlan, counts: StudioApplyCounts): string {
  const parts: string[] = [];
  if (plan.notes) parts.push(`Notes: ${counts.chaptersUpdated} chapters`);
  if (plan.states || counts.statesSet > 0) parts.push(`States: ${counts.statesSet}`);
  if (plan.states && (counts.readMarks > 0 || counts.readMarksAlreadyThere > 0)) {
    parts.push(
      `Read marks: ${counts.readMarks}` +
        (counts.readMarksAlreadyThere > 0
          ? ` · ${counts.readMarksAlreadyThere} already there`
          : ''),
    );
  }
  if (plan.schedule) {
    const alreadyThere = counts.scheduleEventsAlreadyThere + counts.scheduleTodosAlreadyThere;
    parts.push(
      `Schedule: ${counts.scheduleEventsAdded} events + ${counts.scheduleTodosAdded} todos added` +
        ` · ${alreadyThere} already there` +
        (counts.minutesRepaired > 0 ? ` · ${counts.minutesRepaired} repaired` : '') +
        // v365: tombstone removals are named, never silent — and the
        // segment only grows the word when something was removed.
        (counts.scheduleRemoved > 0 ? ` · Removed: ${counts.scheduleRemoved}` : ''),
    );
  }
  if (counts.ministriesLinked > 0) {
    parts.push(
      `Ministry chapters: ${counts.ministriesLinked} tied`,
    );
  }
  if (plan.people) parts.push(`People updated: ${counts.peopleUpdated}`);
  if (plan.ministries) {
    parts.push(
      `Ministries: ${counts.ministriesAdded} added / ${counts.ministriesUpdated} updated / ${counts.ministriesDeleted} deleted`,
    );
  }
  // v407: the digest segment keys off the count too — its write
  // is forward-only from v407 (see storeEmailDigestForwardOnly),
  // so a stale digest that changed nothing must not read as an
  // update either. (Before v407 it keyed off the plan because
  // the write was unconditional.)
  if (plan.emailDigest && counts.emailDigest > 0) parts.push('Email digest: updated');
  // v379: the segment keys off the count, not the plan — the gas
  // write is forward-only, so an older snapshot that changed
  // nothing must not read as an update.
  if (plan.gasPrices && counts.gasPrices > 0) parts.push('Gas prices: updated');
  // v407: the news briefing, the third morning sibling — same
  // count-keyed honesty.
  if (plan.newsBriefing && counts.newsBriefing > 0) parts.push('News briefing: updated');
  // v472: the weather snapshot, the fourth morning sibling —
  // same count-keyed honesty.
  if (plan.weather && counts.weather > 0) parts.push('Weather: updated');
  // v417: the mark changes — the segment names both directions and
  // only appears when the file carried the section.
  if (plan.markChanges) {
    parts.push(
      `Mark changes: ${counts.markChangesUpserted} upserted · ${counts.markChangesRemoved} removed`,
    );
  }
  return parts.join(' · ');
}

// ── v430: section-isolated applies ──────────────────────────────────
// The import door applies a whole file section by section. Before
// v430 the applies ran bare inside one try: the first section whose
// write threw (the Nov 4 notes write, on a full storage database)
// sank every section behind it and the alert could only say the file
// "could not be read". The door now wraps each section in
// attemptStudioSection: a throwing section is recorded here by name
// with its reason, the sections after it still apply, and the final
// alert names what didn't save instead of guessing.

/** One section that did not land, and why — the error's own words. */
export interface StudioSectionFailure {
  section: string;
  reason: string;
}

/** Run one section's apply; on a throw, record it and move on. */
export async function attemptStudioSection(
  failures: StudioSectionFailure[],
  section: string,
  apply: () => Promise<void>,
): Promise<void> {
  try {
    await apply();
  } catch (error) {
    failures.push({
      section,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

/** The alert lines naming each failed section with its reason:
 * "Schedule didn't save: database or disk is full". */
export function formatStudioSectionFailures(failures: StudioSectionFailure[]): string {
  return failures.map((f) => `${f.section} didn't save: ${f.reason}`).join('\n');
}

// ── Notes conversion: studio payload → the chapter data the page renders ────

/**
 * A note's kind carries its callout meaning; the blocks carry the words.
 * note → blocks verbatim (category re-attached to the first block, where
 * the app's category lane expects it); highlight → a highlight block;
 * main-thought → a thought block; imported → blocks verbatim;
 * quote → quote blocks carrying the author's name, so the page renders
 * them attributed, never as plain notes (v223).
 */
function noteToBlocks(note: StudioNote): V205Block[] {
  if (note.kind === 'highlight') {
    return note.blocks.map((b) => ({ ...b, kind: 'highlight' as const }));
  }
  if (note.kind === 'main-thought') {
    return note.blocks.map((b) => ({ ...b, kind: 'thought' as const }));
  }
  if (note.kind === 'quote') {
    const authorName = (note.author ?? '').trim();
    const authorId = (note.authorId ?? '').trim();
    return note.blocks.map((b) => ({
      ...b,
      kind: 'quote' as const,
      ...(authorName ? { authorName } : {}),
      // v244: the People id rides onto the block beside the name —
      // the chapter page resolves it to the speaker's face bubble.
      ...(authorId ? { authorId } : {}),
    }));
  }
  const blocks = note.blocks.map((b) => ({ ...b }));
  if (note.kind === 'note' && note.category && blocks.length > 0 && !blocks[0].category) {
    blocks[0] = { ...blocks[0], category: note.category };
  }
  return blocks;
}

/**
 * Convert one validated payload into chapter data. Sections' span-only
 * entry groups take their blocks from the notes that fall inside them;
 * a section with no notes keeps a bare span-only entry so its verses
 * still render. base (the shipped static chapter, when any) backfills
 * outline, stories, and embedded verse text the studio never carries.
 */
export function convertStudioChapter(
  payload: StudioChapterPayload,
  base: V205ChapterData | null,
): V205ChapterData {
  const sections: V205Section[] = payload.sections.map((s) => {
    const entries: V205Entry[] = s.entries.map((span) => {
      const inside = payload.notes.filter(
        (n) => span.start <= n.start && n.end <= span.end,
      );
      const blocks = inside.flatMap((n) => noteToBlocks(n));
      return { start: span.start, end: span.end, blocks };
    });
    return { start: s.start, end: s.end, title: s.title, entries };
  });
  const openerBlocks = splitTextBlocks(payload.opener.text).map((text) => ({
    kind: 'para' as const,
    text,
  }));
  // The opener text arrives label-free (the studio card bar and the
  // app page each render their own Introduction/Previously heading),
  // so it is kept verbatim — never prefixed here.
  return {
    chapter: payload.chapter,
    intro: payload.opener.kind === 'introduction' ? openerBlocks : base?.intro ?? [],
    previously:
      payload.opener.kind === 'previously'
        ? splitTextBlocks(payload.opener.text)
        : base?.previously ?? [],
    outline: base?.outline ?? [],
    sections,
    stories: base?.stories ?? [],
    ...(base?.verses ? { verses: base.verses } : {}),
  };
}

// ── Overrides store: chapter data imported from the studio ──────────────────

export const STUDIO_IMPORT_KEY = 'prayercircle.bible.v205.studio-imports.v1';

export type StudioImportsMap = Record<string, V205ChapterData>;

export const studioImportKey = (book: string, chapter: number) => `${book}|${chapter}`;

// ── v423: the store is CHUNKED — one AsyncStorage value per chapter ───────
// The single-value store above is the pre-v423 layout. On Jonathan's
// phone the whole-map JSON grew past what Android's AsyncStorage can
// hand back: setItem of the multi-MB string succeeds (every import
// reported success, with chapter counts), but getItem of the same
// value fails — and the loader's catch turned the failure into {},
// so every screen silently fell back to the shipped chapter text and
// imported notes never rendered (the Nov 2 paragraph rollout: 310
// chapters imported "successfully", none ever shown). The store is
// therefore split: an index naming the imported chapters, and one
// small value per chapter that reads back on its own. The legacy key
// is read exactly once — to migrate a map small enough to come back —
// and removed only after the chunked write lands.

export const STUDIO_IMPORT_INDEX_KEY = 'prayercircle.bible.v205.studio-imports.index.v2';
export const STUDIO_IMPORT_CHAPTER_KEY_PREFIX = 'prayercircle.bible.v205.studio-import.v2.';

/** The storage key one imported chapter lives under: the prefix plus
 * the chapter's map key (`studioImportKey(book, chapter)`). */
const studioImportChapterStorageKey = (mapKey: string): string =>
  `${STUDIO_IMPORT_CHAPTER_KEY_PREFIX}${mapKey}`;

// ── v433: the store moves to FILES — one file per chapter ────────────────
// The chunked layout above kept the database workable, but it never
// made it SMALL: on Jonathan's phone the imports alone are 243 values
// / ~4.36MB of the ~5.82MB AsyncStorage database, hard against the
// ~6MB ceiling — and every write that needs the database to GROW is
// refused (SQLITE_FULL, Nov 4: a pack import landed its notes and
// people, then its schedule and ministries sections could not save;
// the same wall sat behind the vanished fast-day note and the
// un-checkable Time Off tickets). The chapters therefore live as
// files under the app's documents directory now — same chapters, same
// map at every caller, just not database rows. The database keeps
// only the app's small stores and drops to ~1.5MB.
//
// Layout (under documentDirectory):
//   prayercircle-studio-imports/
//     index.json            { format, version, verified, keys }
//     <encoded key>.json    one file per chapter; the name is the
//                           chapter's map key, URI-encoded.
//
// The index is the commit point: it names the chapters and, once a
// migration has PROVEN its copy (below), carries verified: true. The
// loader serves files only behind a verified index.
//
// Migration discipline (the never-lose-his-work rule): on load, when
// files hold no verified index but the database does, the loader
// copies every chapter to files, re-reads every written file and
// compares its content against the database value, and only after
// that proof rewrites the index verified and deletes the database
// keys. Any failure along the way deletes NOTHING from the database
// and the loader serves the database map — there is no state in which
// his chapters are visible from neither store, and the move simply
// retries on a later load. Saves heal the same way: a save that
// arrives before the move completes runs it first, and a filesystem
// that cannot be reached at all falls back to the v430 chunked save,
// untouched.

export const STUDIO_IMPORTS_FILE_DIRECTORY = 'prayercircle-studio-imports';
export const STUDIO_IMPORTS_INDEX_FILE_NAME = 'index.json';
const STUDIO_IMPORTS_FILE_INDEX_FORMAT = 'prayercircle-studio-imports-index';

/** The file name one imported chapter lives under: its map key,
 * URI-encoded so any book name is a safe file name, plus `.json`. */
export const studioImportChapterFileName = (mapKey: string): string =>
  `${encodeURIComponent(mapKey)}.json`;

/** The slice of the legacy expo-file-system surface the file store
 * needs — nothing more, so a test double stays a page long. */
export interface StudioImportsFileSystem {
  documentDirectory: string | null;
  getInfoAsync: (path: string) => Promise<{ exists: boolean }>;
  makeDirectoryAsync: (path: string, options?: { intermediates?: boolean }) => Promise<void>;
  readAsStringAsync: (path: string) => Promise<string>;
  writeAsStringAsync: (path: string, contents: string) => Promise<void>;
  deleteAsync: (path: string, options?: { idempotent?: boolean }) => Promise<void>;
}

let studioImportsFileSystemOverride: StudioImportsFileSystem | null = null;

/** Test-only: substitute the filesystem surface the imports store
 * sees. Call with no argument (or null) to restore the real surface.
 * The drive-folder seam (setDriveFolderOverridesForTests) is the
 * model: production code loads the native module lazily so this
 * module stays importable anywhere, tests included. */
export function setStudioImportsFileSystemForTests(
  fileSystem?: StudioImportsFileSystem | null,
): void {
  studioImportsFileSystemOverride = fileSystem ?? null;
}

function studioImportsFileSystem(): StudioImportsFileSystem | null {
  if (studioImportsFileSystemOverride) return studioImportsFileSystemOverride;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FileSystem = require('expo-file-system/legacy') as StudioImportsFileSystem;
    // Trust only a surface shaped like the real one — anything else
    // (a partial double in a neighbouring test, a platform without
    // documents) means "no file store", never a crash.
    if (
      typeof FileSystem.documentDirectory !== 'string' ||
      FileSystem.documentDirectory.length === 0 ||
      typeof FileSystem.getInfoAsync !== 'function' ||
      typeof FileSystem.makeDirectoryAsync !== 'function' ||
      typeof FileSystem.readAsStringAsync !== 'function' ||
      typeof FileSystem.writeAsStringAsync !== 'function' ||
      typeof FileSystem.deleteAsync !== 'function'
    ) {
      return null;
    }
    return FileSystem;
  } catch {
    return null;
  }
}

/** The imports directory URI, or null when there is no documents
 * directory to hold it. */
function studioImportsRoot(fileSystem: StudioImportsFileSystem): string | null {
  const base = fileSystem.documentDirectory;
  if (typeof base !== 'string' || base.length === 0) return null;
  return `${base.endsWith('/') ? base : `${base}/`}${STUDIO_IMPORTS_FILE_DIRECTORY}/`;
}

const studioImportChapterFilePath = (root: string, mapKey: string): string =>
  `${root}${studioImportChapterFileName(mapKey)}`;

const studioImportsIndexFilePath = (root: string): string =>
  `${root}${STUDIO_IMPORTS_INDEX_FILE_NAME}`;

// ── v243: the stored map is sanitized at this read boundary ────────────────
// Until v243, loadStudioImports handed the parsed JSON to consumers
// verbatim, and consumers dereference the stored chapter shape
// unconditionally (chapterDataHasNotes does e.blocks.length,
// buildDisplaySections maps sections → entries → blocks, the chapter
// page reads intro.length / outline.length). The Oct 25 blank-Bible
// diagnosis proved the mechanism synthetically: one stored chapter
// whose entries lack `blocks` throws inside those consumers — on the
// chapter page (which wore no boundary) and in the Book screen's own
// body (where its child boundary cannot catch) the throw unmounts the
// screen onto the navigator's blank card. The door validates every
// pack it applies, so a malformed record can only arrive from an older
// writer — but the store outlives every writer. The trust boundary is
// therefore HERE, at the loader (the diagnosis's prescription — never
// `?.` scattered through consumers):
//
//   · a chapter override that fails the stored-shape validation is
//     DROPPED — it degrades to "no import", and the chapter falls
//     back to its shipped data. Nothing of his is asserted by a shape
//     that cannot be read.
//   · a field that is simply ABSENT (an older writer that never wrote
//     outline/stories) is repaired with the empty default the
//     converter itself would have written.
//   · well-formed chapters pass through with their values intact —
//     quote blocks keep their author, categories keep their meaning.
//
// Because every apply flow loads before it saves, the next save after
// an upgrade persists the sanitized map: the store heals itself.

/** The stored-block shape the door's validateBlock enforces: a record
 * with a known kind, string text, and — when present — a category his
 * color code knows. Anything else is not a block consumers may touch. */
function isValidStoredBlock(v: unknown): v is V205Block {
  if (!isRecord(v)) return false;
  if (!BLOCK_KINDS.includes(v.kind as string)) return false;
  if (typeof v.text !== 'string') return false;
  if (
    v.category !== undefined &&
    v.category !== null &&
    normalizeCategory(v.category) === null
  ) {
    // v245: normalizeCategory knows the four AND the retired
    // 'conversation' — only a value no ruling knows is invalid here.
    return false;
  }
  return true;
}

function sanitizeStoredBlock(block: V205Block): V205Block {
  const out: V205Block = { kind: block.kind, text: block.text };
  if (typeof block.ref === 'string') out.ref = block.ref;
  if (typeof block.authorName === 'string') out.authorName = block.authorName;
  // v244: the quote speaker's People id survives the sanitize pass
  // too — a healed map must not cost a quote its face.
  if (typeof block.authorId === 'string') out.authorId = block.authorId;
  // v245: a stored 'conversation' heals to personal-story on this pass
  // (isValidStoredBlock already vouched for the value, so this lands).
  if (block.category) {
    const category = normalizeCategory(block.category);
    if (category) out.category = category;
  }
  return out;
}

function isValidSpan(v: unknown): v is { start: number; end: number } {
  return (
    isRecord(v) &&
    isInt(v.start) &&
    isInt(v.end) &&
    (v.start as number) >= 1 &&
    (v.end as number) >= (v.start as number)
  );
}

/**
 * One stored chapter, checked end to end. Returns the chapter to keep
 * (values intact, absent fields defaulted) or null to drop the
 * override. `keyChapter` is the chapter number the map key names —
 * the lookup identity — and repairs a stored `chapter` field that
 * disagrees with it.
 */
function sanitizeStoredChapter(raw: unknown, keyChapter: number): V205ChapterData | null {
  if (!isRecord(raw)) return null;

  // sections → entries → blocks: the crash surface, all-or-nothing.
  if (!Array.isArray(raw.sections)) return null;
  const sections: V205Section[] = [];
  for (const s of raw.sections) {
    if (!isRecord(s) || !Array.isArray(s.entries)) return null;
    const title = typeof s.title === 'string' ? s.title : null;
    const rawEntries = s.entries;
    if (!isValidSpan(s)) return null;
    const entries: V205Entry[] = [];
    for (const e of rawEntries) {
      if (!isRecord(e) || !Array.isArray(e.blocks)) return null;
      const rawBlocks = e.blocks;
      if (!isValidSpan(e)) return null;
      if (!rawBlocks.every(isValidStoredBlock)) return null;
      entries.push({ start: e.start, end: e.end, blocks: rawBlocks.map(sanitizeStoredBlock) });
    }
    sections.push({ start: s.start, end: s.end, title, entries });
  }

  // intro: absent → the converter's empty default; present must be
  // blocks the page may map over (it reads .length and renders each).
  let intro: V205Block[] = [];
  if (raw.intro !== undefined) {
    if (!Array.isArray(raw.intro) || !raw.intro.every(isValidStoredBlock)) return null;
    intro = raw.intro.map(sanitizeStoredBlock);
  }

  let previously: string[] = [];
  if (raw.previously !== undefined) {
    if (!Array.isArray(raw.previously) || !raw.previously.every((p) => typeof p === 'string')) {
      return null;
    }
    previously = [...(raw.previously as string[])];
  }

  let outline: V205OutlineItem[] = [];
  if (raw.outline !== undefined) {
    if (
      !Array.isArray(raw.outline) ||
      !raw.outline.every(
        (o) => isRecord(o) && typeof o.title === 'string' && typeof o.range === 'string',
      )
    ) {
      return null;
    }
    outline = (raw.outline as V205OutlineItem[]).map((o) => ({ title: o.title, range: o.range }));
  }

  let stories: { start: number; end: number }[] = [];
  if (raw.stories !== undefined) {
    if (!Array.isArray(raw.stories) || !raw.stories.every(isValidSpan)) return null;
    stories = (raw.stories as { start: number; end: number }[]).map((r) => ({
      start: r.start,
      end: r.end,
    }));
  }

  const clean: V205ChapterData = {
    chapter: isInt(raw.chapter) ? raw.chapter : keyChapter,
    intro,
    previously,
    outline,
    sections,
    stories,
  };
  if (raw.verses !== undefined) {
    if (!isRecord(raw.verses) || !Object.values(raw.verses).every((t) => typeof t === 'string')) {
      return null;
    }
    clean.verses = { ...(raw.verses as Record<number, string>) };
  }
  return clean;
}

/**
 * The whole stored map, sanitized. Keys that cannot name a chapter
 * (`Book|chapter`) and chapters that fail validation are dropped;
 * everything else is kept. Exported for the v243 pins — the loader is
 * its only production caller.
 */
export function sanitizeStudioImportsMap(parsed: unknown): StudioImportsMap {
  if (!isRecord(parsed)) return {};
  const out: StudioImportsMap = {};
  for (const [key, value] of Object.entries(parsed)) {
    const cut = key.lastIndexOf('|');
    if (cut <= 0) continue;
    const keyChapter = Number(key.slice(cut + 1));
    if (!Number.isInteger(keyChapter) || keyChapter < 1) continue;
    const clean = sanitizeStoredChapter(value, keyChapter);
    if (clean) out[key] = clean;
  }
  return out;
}

// The batch verbs, with a single-key fallback: the runtime's
// AsyncStorage carries multiGet/multiSet/multiRemove, but the suite's
// storage doubles implement only the single-key surface — the store
// must behave identically over either.
async function chunkedGet(keys: string[]): Promise<(string | null)[]> {
  if (keys.length === 0) return [];
  if (typeof AsyncStorage.multiGet === 'function') {
    const pairs = await AsyncStorage.multiGet(keys);
    const byKey = new Map<string, string | null>(pairs.map(([k, v]) => [k, v]));
    return keys.map((k) => byKey.get(k) ?? null);
  }
  return Promise.all(keys.map((k) => AsyncStorage.getItem(k)));
}

async function chunkedSet(pairs: [string, string][]): Promise<void> {
  if (pairs.length === 0) return;
  if (typeof AsyncStorage.multiSet === 'function') {
    await AsyncStorage.multiSet(pairs);
    return;
  }
  await Promise.all(pairs.map(([k, v]) => AsyncStorage.setItem(k, v)));
}

async function chunkedRemove(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  if (typeof AsyncStorage.multiRemove === 'function') {
    await AsyncStorage.multiRemove(keys);
    return;
  }
  await Promise.all(keys.map((k) => AsyncStorage.removeItem(k)));
}

/** The stored index: a JSON array of chapter map keys. Null when the
 * stored value is unreadable as an index — the caller then tries the
 * legacy store. (An absent index reads null before this is called.) */
function parseStudioImportIndex(raw: string): string[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const keys: string[] = [];
    for (const k of parsed) {
      if (typeof k === 'string' && k.length > 0 && !keys.includes(k)) keys.push(k);
    }
    return keys;
  } catch {
    return null;
  }
}

/** Persist the whole map in the chunked layout: every chapter under
 * its own key first, then the index naming them. This is the legacy
 * MIGRATION writer (loadStudioImports, moving a readable pre-v423
 * value once, best-effort) — saves proper go through the diff-write
 * in saveStudioImports (v430). */
async function writeChunkedStudioImports(map: StudioImportsMap): Promise<void> {
  const keys = Object.keys(map);
  await chunkedSet(
    keys.map((k) => [studioImportChapterStorageKey(k), JSON.stringify(map[k])] as [string, string]),
  );
  await AsyncStorage.setItem(STUDIO_IMPORT_INDEX_KEY, JSON.stringify(keys));
}

// ── v433: the file store — reads, the verified migration, writes ─────────

/** The file index: the chapter map keys plus the verified flag the
 * migration earns (see the v433 note at the constants). Null when the
 * stored value is not an index of this format at all. */
function parseStudioFileIndex(raw: string): { keys: string[]; verified: boolean } | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (parsed.format !== STUDIO_IMPORTS_FILE_INDEX_FORMAT) return null;
    if (!Array.isArray(parsed.keys)) return null;
    const keys: string[] = [];
    for (const k of parsed.keys) {
      if (typeof k === 'string' && k.length > 0 && !keys.includes(k)) keys.push(k);
    }
    return { keys, verified: parsed.verified === true };
  } catch {
    return null;
  }
}

/** Read the file index; null when there is none (or it cannot be
 * read as one) — the caller then looks to the database. */
async function readStudioFileIndex(
  fileSystem: StudioImportsFileSystem,
  root: string,
): Promise<{ keys: string[]; verified: boolean } | null> {
  try {
    const raw: unknown = await fileSystem.readAsStringAsync(studioImportsIndexFilePath(root));
    if (typeof raw !== 'string') return null;
    return parseStudioFileIndex(raw);
  } catch {
    return null;
  }
}

function studioFileIndexJson(keys: string[], verified: boolean): string {
  return JSON.stringify({
    format: STUDIO_IMPORTS_FILE_INDEX_FORMAT,
    version: 1,
    verified,
    keys,
  });
}

/** One chapter file's contents; null when it cannot be read (a file
 * that is missing, or there but unreadable, counts the same way the
 * diff-write already treats an unreadable database value). */
async function readStudioChapterFile(
  fileSystem: StudioImportsFileSystem,
  root: string,
  mapKey: string,
): Promise<string | null> {
  try {
    const raw: unknown = await fileSystem.readAsStringAsync(
      studioImportChapterFilePath(root, mapKey),
    );
    return typeof raw === 'string' ? raw : null;
  } catch {
    return null;
  }
}

async function ensureStudioImportsDirectory(
  fileSystem: StudioImportsFileSystem,
  root: string,
): Promise<void> {
  const info = await fileSystem.getInfoAsync(root);
  if (info && info.exists) return;
  await fileSystem.makeDirectoryAsync(root, { intermediates: true });
}

/**
 * The map as the FILE store holds it — or null when files are not
 * the store (yet): no filesystem, no index, or an index no migration
 * has verified. Behind a verified index the read mirrors the chunked
 * read exactly: one unreadable chapter drops alone, the rest load,
 * and the assembled map crosses the same sanitize boundary.
 */
async function loadStudioImportsFromFiles(): Promise<StudioImportsMap | null> {
  const fileSystem = studioImportsFileSystem();
  if (!fileSystem) return null;
  const root = studioImportsRoot(fileSystem);
  if (!root) return null;
  const index = await readStudioFileIndex(fileSystem, root);
  if (!index || !index.verified) return null;
  const assembled: Record<string, unknown> = {};
  for (let at = 0; at < index.keys.length; at += STUDIO_IMPORT_WRITE_BATCH) {
    const batch = index.keys.slice(at, at + STUDIO_IMPORT_WRITE_BATCH);
    const values = await Promise.all(
      batch.map((key) => readStudioChapterFile(fileSystem, root, key)),
    );
    batch.forEach((key, i) => {
      const raw = values[i];
      if (raw === null) return;
      try {
        assembled[key] = JSON.parse(raw);
      } catch {
        // One unreadable chapter file drops alone; the rest load.
      }
    });
  }
  return sanitizeStudioImportsMap(assembled);
}

/**
 * The map as the DATABASE holds it, with its provenance: the chunked
 * store when its index parses (it shadows the legacy value, exactly
 * as the pre-v433 loader read it), else the pre-v423 legacy value,
 * else nothing. `indexKeys` is the raw chunk-index list — the keys a
 * migration must clean up even when a chapter value under one of
 * them was itself unreadable. A legacy value that cannot be parsed
 * throws, as it did into the old loader's catch.
 */
async function readDbStudioImports(): Promise<{
  source: 'chunks' | 'legacy' | null;
  map: StudioImportsMap;
  indexKeys: string[];
}> {
  const indexRaw = await AsyncStorage.getItem(STUDIO_IMPORT_INDEX_KEY);
  const index = indexRaw ? parseStudioImportIndex(indexRaw) : null;
  if (index) {
    const values = await chunkedGet(index.map(studioImportChapterStorageKey));
    const assembled: Record<string, unknown> = {};
    index.forEach((key, i) => {
      const raw = values[i];
      if (raw == null) return;
      try {
        assembled[key] = JSON.parse(raw);
      } catch {
        // One unreadable chapter value drops alone; the rest load.
      }
    });
    return { source: 'chunks', map: sanitizeStudioImportsMap(assembled), indexKeys: index };
  }
  const raw = await AsyncStorage.getItem(STUDIO_IMPORT_KEY);
  if (!raw) return { source: null, map: {}, indexKeys: [] };
  return { source: 'legacy', map: sanitizeStudioImportsMap(JSON.parse(raw)), indexKeys: [] };
}

/**
 * The migration's proof: re-read the index and EVERY written chapter
 * file from disk; the copy counts as his chapters only when the index
 * names exactly the map's keys and each file's content equals the
 * chapter it was written from (the v430 content comparison, not
 * bytes). Anything less — a short count, a file that will not parse,
 * a chapter whose words differ — is not a copy, and the migration
 * does not happen.
 */
async function verifyStudioImportFiles(
  fileSystem: StudioImportsFileSystem,
  root: string,
  map: StudioImportsMap,
): Promise<boolean> {
  try {
    const index = await readStudioFileIndex(fileSystem, root);
    if (!index) return false;
    const keys = Object.keys(map);
    if (index.keys.length !== keys.length) return false;
    for (const key of keys) {
      if (!index.keys.includes(key)) return false;
      const raw = await readStudioChapterFile(fileSystem, root, key);
      if (raw === null) return false;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return false;
      }
      if (canonicalJson(parsed) !== canonicalJson(map[key])) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Move a map from the database into the file store — the migration,
 * all-or-nothing from his side of the glass:
 *
 *   1. every chapter is written to its file, then an UNVERIFIED index
 *      naming them (a crash here leaves files the loader ignores);
 *   2. the copy is verified by re-reading (verifyStudioImportFiles);
 *   3. only on proof is the index rewritten verified — the commit —
 *      and the database keys deleted: the chunk values the old index
 *      named, the index key, and the legacy key when one rides along.
 *
 * Returns whether the move committed. On any failure the database is
 * exactly as it was and the caller serves its map; the move retries
 * on a later load or save. A cleanup failure after the commit is
 * housekeeping only: files are authoritative, and a later save
 * retries the removal.
 */
async function migrateStudioImportsToFiles(
  map: StudioImportsMap,
  dbIndexKeys: string[],
): Promise<boolean> {
  const fileSystem = studioImportsFileSystem();
  if (!fileSystem) return false;
  const root = studioImportsRoot(fileSystem);
  if (!root) return false;
  const keys = Object.keys(map);
  try {
    await ensureStudioImportsDirectory(fileSystem, root);
    for (let at = 0; at < keys.length; at += STUDIO_IMPORT_WRITE_BATCH) {
      const batch = keys.slice(at, at + STUDIO_IMPORT_WRITE_BATCH);
      await Promise.all(
        batch.map((key) =>
          fileSystem.writeAsStringAsync(
            studioImportChapterFilePath(root, key),
            JSON.stringify(map[key]),
          ),
        ),
      );
    }
    await fileSystem.writeAsStringAsync(
      studioImportsIndexFilePath(root),
      studioFileIndexJson(keys, false),
    );
    if (!(await verifyStudioImportFiles(fileSystem, root, map))) return false;
    await fileSystem.writeAsStringAsync(
      studioImportsIndexFilePath(root),
      studioFileIndexJson(keys, true),
    );
  } catch {
    return false;
  }
  try {
    const doomed = [
      ...new Set([
        ...dbIndexKeys.map(studioImportChapterStorageKey),
        STUDIO_IMPORT_INDEX_KEY,
        STUDIO_IMPORT_KEY,
      ]),
    ];
    await chunkedRemove(doomed);
  } catch {
    // Housekeeping only — the file store is already authoritative.
  }
  return true;
}

export async function loadStudioImports(): Promise<StudioImportsMap> {
  try {
    // v433: files first — behind a verified index they are the store.
    const fromFiles = await loadStudioImportsFromFiles();
    if (fromFiles) return fromFiles;
    const db = await readDbStudioImports();
    if (db.source === 'chunks') {
      // The library still lives in the database: move it to files
      // (best-effort — the map is already in hand, and a failed move
      // leaves the database untouched and retries next load).
      if (Object.keys(db.map).length > 0) {
        await migrateStudioImportsToFiles(db.map, db.indexKeys);
      }
      return db.map;
    }
    if (db.source === 'legacy') {
      // No chunked index: the pre-v423 single-value store, read once
      // for migration. The map moves into the file store when files
      // can take it, and into the chunked layout when they cannot
      // (the v423 heal) — the legacy key is removed only after the
      // move lands, and the map is returned either way; an unreadable
      // legacy value degrades to the same {} the old loader produced,
      // never a throw.
      const migrated = db.map;
      if (Object.keys(migrated).length > 0) {
        const inFiles = await migrateStudioImportsToFiles(migrated, db.indexKeys);
        if (!inFiles) {
          try {
            await writeChunkedStudioImports(migrated);
            await AsyncStorage.removeItem(STUDIO_IMPORT_KEY);
          } catch {
            // Best-effort: the entries are already in hand; a failed
            // migration simply retries on the next load.
          }
        }
      }
      return migrated;
    }
    return {};
  } catch {
    return {};
  }
}

/** v430 — the most pairs one write batch may carry. A save touches
 * storage in slices of this size, never in one whole-map transaction. */
const STUDIO_IMPORT_WRITE_BATCH = 25;

/**
 * v430 — canonical JSON: a stringify with object keys sorted, so two
 * values with the same CONTENT compare equal even when their key
 * order differs. The comparison below must be by content, not bytes:
 * the loader rebuilds every stored chapter field by field
 * (sanitizeStoredChapter), so a chapter that round-trips through
 * load → apply → save does not necessarily carry the converter's key
 * order — a byte comparison would call every untouched chapter
 * "changed" on every import, forever.
 */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? '';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(record[k])}`)
    .join(',')}}`;
}

/** Does the stored string hold exactly this chapter's content? A
 * missing value, an unparseable one, or different content all count
 * as changed — the save writes the chapter again. */
function storedChapterMatches(stored: string | null, chapter: V205ChapterData): boolean {
  if (stored === null) return false;
  try {
    return canonicalJson(JSON.parse(stored)) === canonicalJson(chapter);
  } catch {
    return false;
  }
}

/** The v430 save, unchanged: the chunked-database diff-write. Since
 * v433 it is the fallback the file save stands behind — used when
 * there is no filesystem to write to, and when a pre-migration save
 * could not complete the move to files. */
async function saveStudioImportsToDb(map: StudioImportsMap): Promise<void> {
  // Chapters dropped from the map lose their values: read the current
  // index first (absent or unreadable → nothing to diff) so a stale
  // per-chapter key never lingers past the save that removed it.
  let previous: string[] = [];
  try {
    const raw = await AsyncStorage.getItem(STUDIO_IMPORT_INDEX_KEY);
    const parsed = raw ? parseStudioImportIndex(raw) : null;
    if (parsed) previous = parsed;
  } catch {
    previous = [];
  }
  // v430 — DIFF-WRITE. The pre-v430 save rewrote EVERY chapter of the
  // merged map in one multiSet. On Jonathan's phone the imports store
  // already holds ~4.4MB across 243 chapter values, hard against the
  // AsyncStorage ceiling — that single giant transaction is the write
  // that throws on a full database (Nov 4: a pack converting
  // byte-identical to the stored chapters still "failed" at the
  // notes step, and every section behind it never ran). Now each
  // chapter's stored value is read back and compared by content;
  // only added/changed chapters are written, in batches of at most
  // STUDIO_IMPORT_WRITE_BATCH pairs. A no-change import writes no
  // chapter values at all; a small change stays a small write.
  const keys = Object.keys(map);
  for (let at = 0; at < keys.length; at += STUDIO_IMPORT_WRITE_BATCH) {
    const batchKeys = keys.slice(at, at + STUDIO_IMPORT_WRITE_BATCH);
    let stored: (string | null)[];
    try {
      stored = await chunkedGet(batchKeys.map(studioImportChapterStorageKey));
    } catch {
      // A value that cannot even be read back counts as changed —
      // the write below replaces it with one that can.
      stored = batchKeys.map(() => null);
    }
    const changed: [string, string][] = [];
    batchKeys.forEach((key, i) => {
      if (!storedChapterMatches(stored[i], map[key])) {
        changed.push([studioImportChapterStorageKey(key), JSON.stringify(map[key])]);
      }
    });
    if (changed.length > 0) await chunkedSet(changed);
  }
  await AsyncStorage.setItem(STUDIO_IMPORT_INDEX_KEY, JSON.stringify(keys));
  const stale = previous.filter((k) => !(k in map)).map(studioImportChapterStorageKey);
  if (stale.length > 0) await chunkedRemove(stale);
  // The legacy single-value store is superseded the moment a chunked
  // save lands; clear it so an oversized pre-v423 value can never be
  // mistaken for the store again. Guarded: its failure must not fail
  // the save that already succeeded.
  try {
    await AsyncStorage.removeItem(STUDIO_IMPORT_KEY);
  } catch {
    // Housekeeping only — the chunked store is already authoritative.
  }
}

/**
 * v433 — the save, against the file store, with v430's diff discipline
 * unchanged: each chapter's stored content is read back and compared;
 * only added/changed chapters are written, in batches of at most
 * STUDIO_IMPORT_WRITE_BATCH; an identical map writes no chapter files
 * at all. Dropped chapters lose their files, the index is rewritten
 * verified, and the database copies a migration may have left behind
 * (or a backup restore re-landed) are removed as housekeeping.
 *
 * The mode is chosen ONCE, up front: when there is no filesystem, or
 * the store cannot even be probed (directory + index read), the v430
 * database save runs instead — a save never lands half in one store
 * and half in the other. When files hold no index yet but the
 * database holds the library, the migration runs first (so the diff
 * compares against real stored content, never against a store this
 * save is superseding); if the move cannot complete, the database
 * save runs and the library stays exactly where it was.
 */
export async function saveStudioImports(map: StudioImportsMap): Promise<void> {
  const fileSystem = studioImportsFileSystem();
  const root = fileSystem ? studioImportsRoot(fileSystem) : null;
  if (!fileSystem || !root) {
    await saveStudioImportsToDb(map);
    return;
  }
  let fileIndex: { keys: string[]; verified: boolean } | null;
  try {
    await ensureStudioImportsDirectory(fileSystem, root);
    fileIndex = await readStudioFileIndex(fileSystem, root);
  } catch {
    await saveStudioImportsToDb(map);
    return;
  }
  let previous: string[];
  // When files hold no index, a chapter the diff needs may still live
  // only in the database — its value is the honest baseline (a value
  // that cannot be read counts as changed, as it did in v430).
  let diffAgainstDb = false;
  if (fileIndex) {
    previous = fileIndex.keys;
  } else {
    const db = await readDbStudioImports().catch(() => null);
    if (db && Object.keys(db.map).length > 0) {
      const moved = await migrateStudioImportsToFiles(db.map, db.indexKeys);
      if (!moved) {
        await saveStudioImportsToDb(map);
        return;
      }
      previous = Object.keys(db.map);
    } else {
      previous = db ? db.indexKeys : [];
      diffAgainstDb = db?.source === 'chunks';
    }
  }
  const keys = Object.keys(map);
  for (let at = 0; at < keys.length; at += STUDIO_IMPORT_WRITE_BATCH) {
    const batchKeys = keys.slice(at, at + STUDIO_IMPORT_WRITE_BATCH);
    const stored = await Promise.all(
      batchKeys.map((key) => readStudioChapterFile(fileSystem, root, key)),
    );
    if (diffAgainstDb) {
      let dbStored: (string | null)[];
      try {
        dbStored = await chunkedGet(batchKeys.map(studioImportChapterStorageKey));
      } catch {
        dbStored = batchKeys.map(() => null);
      }
      batchKeys.forEach((key, i) => {
        if (stored[i] === null) stored[i] = dbStored[i];
      });
    }
    const changed = batchKeys.filter((key, i) => !storedChapterMatches(stored[i], map[key]));
    if (changed.length > 0) {
      await Promise.all(
        changed.map((key) =>
          fileSystem.writeAsStringAsync(
            studioImportChapterFilePath(root, key),
            JSON.stringify(map[key]),
          ),
        ),
      );
    }
  }
  await fileSystem.writeAsStringAsync(
    studioImportsIndexFilePath(root),
    studioFileIndexJson(keys, true),
  );
  const stale = previous.filter((k) => !(k in map));
  if (stale.length > 0) {
    await Promise.all(
      stale.map((key) =>
        fileSystem.deleteAsync(studioImportChapterFilePath(root, key), { idempotent: true }),
      ),
    );
  }
  // Housekeeping: the database stops holding chapters the moment the
  // file save lands. A restore can re-land the chunk keys and the
  // legacy value under this save, so sweep whatever the database
  // index currently names, plus both store keys. Guarded as a whole:
  // its failure must not fail the save that already succeeded.
  try {
    let dbKeys: string[] = [];
    const raw = await AsyncStorage.getItem(STUDIO_IMPORT_INDEX_KEY);
    const parsed = raw ? parseStudioImportIndex(raw) : null;
    if (parsed) dbKeys = parsed;
    const doomed = [
      ...new Set([
        ...dbKeys.map(studioImportChapterStorageKey),
        ...stale.map(studioImportChapterStorageKey),
        STUDIO_IMPORT_INDEX_KEY,
        STUDIO_IMPORT_KEY,
      ]),
    ];
    await chunkedRemove(doomed);
  } catch {
    // Housekeeping only — the file store is already authoritative.
  }
}

/** Replace each payload's chapter data. Same payload twice = same map. */
export function applyStudioChapters(
  current: StudioImportsMap,
  chapters: StudioChapterPayload[],
): { next: StudioImportsMap; chaptersUpdated: number } {
  const next: StudioImportsMap = { ...current };
  for (const payload of chapters) {
    next[studioImportKey(payload.book, payload.chapter)] = convertStudioChapter(
      payload,
      getChapterData(payload.book, payload.chapter),
    );
  }
  return { next, chaptersUpdated: chapters.length };
}

/**
 * The chapter data the page renders: the studio import when one exists,
 * the shipped static chapter otherwise. Imported chapters keep the static
 * chapter's outline/stories/verses via the conversion backfill.
 */
export function resolveChapterData(
  book: string,
  chapter: number,
  imports: StudioImportsMap,
): V205ChapterData | null {
  const override = imports[studioImportKey(book, chapter)];
  if (override) return override;
  return getChapterData(book, chapter);
}

/** Does this chapter data carry any of his notes? An entry counts
 * only when it carries blocks — a span-only entry is a placeholder
 * the page fills with verses, not a note. */
export function chapterDataHasNotes(data: V205ChapterData | null): boolean {
  if (!data) return false;
  return data.sections.some((s) => s.entries.some((e) => e.blocks.length > 0));
}

/**
 * v233 — HIS MODEL: "Complete" is a claim about NOTES. A chapter HAS
 * notes when the shipped commentary data carries entries for it, or
 * the studio-import overrides add entries for it (the override is the
 * resolved chapter, so the first imported note flips this too).
 * Computed from the data layer every time — never hard-coded per book.
 */
export function chapterHasNotes(
  book: string,
  chapter: number,
  imports: StudioImportsMap,
): boolean {
  return chapterDataHasNotes(resolveChapterData(book, chapter, imports));
}

/** True when ANY chapter of the book carries notes (shipped or
 * imported). A book with no noted chapters at all finishes by
 * READING; a book with even one noted chapter finishes by the
 * notes-Complete track (rewards.ts). */
export function bookHasNotedChapters(book: string, imports: StudioImportsMap): boolean {
  const total = chapterCountFor(book);
  for (let c = 1; c <= total; c++) {
    if (chapterHasNotes(book, c, imports)) return true;
  }
  return false;
}

/** A book counts as "imported" when any chapter override exists for it. */
export function importedBooks(imports: StudioImportsMap): string[] {
  const books = new Set<string>();
  for (const key of Object.keys(imports)) {
    const book = key.split('|')[0];
    if (book) books.add(book);
  }
  return [...books];
}

// ── Schedule conversion: studio events → the schedule store's write path ────

function endTimeOf(start: string, minutes: number): string {
  const [h, m] = start.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// ── v239 landing patches ───────────────────────────────────────────────
// The bridge fields land under ONE discipline, the subtasks'
// discipline generalized: a PRESENT key names the value (it wins),
// an ABSENT key says nothing (the stored value stands). A created
// record is born with whatever the pack carried; a matched record
// takes the patch onto a replaced copy, never a mutation.

/**
 * Completion, shared by all three record kinds. The flag alone moves
 * the flag; a pack that un-completes (isCompleted: false) also clears
 * the stamp unless it names one — the app's own toggle clears it the
 * same way. A stamp riding without a flag just re-dates the record.
 */
function completionPatch(ev: StudioScheduleEventInput): {
  isCompleted?: boolean;
  completedAt?: string;
} {
  if (ev.isCompleted === undefined && ev.completedAt === undefined) return {};
  if (ev.isCompleted === false) {
    return { isCompleted: false, completedAt: ev.completedAt };
  }
  return {
    ...(ev.isCompleted !== undefined ? { isCompleted: ev.isCompleted } : {}),
    ...(ev.completedAt !== undefined ? { completedAt: ev.completedAt } : {}),
  };
}

function eventBridgePatch(ev: StudioScheduleEventInput): Partial<ScheduleEvent> {
  const patch: Partial<ScheduleEvent> = { ...completionPatch(ev) };
  // v365: notes + location join the present-wins discipline on matched
  // records. The validator normalizes an unset wire value to '', so
  // "present" here means a non-empty word from the desk — it replaces;
  // '' (or an omitted key) preserves the stored value. Creation reads
  // the input directly with its own v224 rule (the pack's location
  // wins, Online only fills an empty one), and this patch spread after
  // the factory call lands the same values, so creation is unchanged.
  if (ev.notes) patch.notes = ev.notes;
  if (ev.location) patch.location = ev.location;
  if (ev.keyword !== undefined) patch.keyword = ev.keyword;
  if (ev.color !== undefined) patch.color = ev.color;
  if (ev.linkedPeopleIds !== undefined) patch.linkedPeopleIds = [...ev.linkedPeopleIds];
  if (ev.travelTimeMinutes !== undefined) patch.travelTimeMinutes = ev.travelTimeMinutes;
  if (ev.reminderMinutesBefore !== undefined) {
    patch.reminderMinutesBefore = ev.reminderMinutesBefore;
  }
  if (ev.season !== undefined) patch.season = ev.season;
  if (ev.episode !== undefined) patch.episode = ev.episode;
  if (ev.posterImageUri !== undefined) patch.posterImageUri = ev.posterImageUri;
  if (ev.posterColor !== undefined) patch.posterColor = ev.posterColor;
  if (ev.isOffEvent !== undefined) patch.isOffEvent = ev.isOffEvent;
  return patch;
}

function todoBridgePatch(ev: StudioScheduleEventInput): Partial<ScheduleTodo> {
  const patch: Partial<ScheduleTodo> = { ...completionPatch(ev) };
  // v365: notes patch a matched todo too (same non-empty-wins rule as
  // events). Todos carry no location field — none is invented here.
  if (ev.notes) patch.notes = ev.notes;
  // A wire `keyword` is validated on todos but has no home on the
  // record (its lanes are tag + icon) — it is the one shared key
  // that lands nowhere, like the bible pair on an Event row.
  if (ev.color !== undefined) patch.color = ev.color;
  if (ev.linkedPeopleIds !== undefined) patch.linkedPeopleIds = [...ev.linkedPeopleIds];
  if (ev.tag !== undefined) patch.tag = ev.tag;
  if (ev.icon !== undefined) patch.icon = ev.icon;
  if (ev.order !== undefined) patch.order = ev.order;
  if (ev.notificationsEnabled !== undefined) {
    patch.notificationsEnabled = ev.notificationsEnabled;
  }
  if (ev.linkedEventId !== undefined) patch.linkedEventId = ev.linkedEventId;
  if (ev.linkedMinistryId !== undefined) patch.linkedMinistryId = ev.linkedMinistryId;
  if (ev.linkedEventTitle !== undefined) patch.linkedEventTitle = ev.linkedEventTitle;
  if (ev.linkedMinistryTitle !== undefined) patch.linkedMinistryTitle = ev.linkedMinistryTitle;
  if (ev.linkedEventColor !== undefined) patch.linkedEventColor = ev.linkedEventColor;
  if (ev.linkedMinistryColor !== undefined) patch.linkedMinistryColor = ev.linkedMinistryColor;
  if (ev.groupId !== undefined) patch.groupId = ev.groupId;
  if (ev.isGroup !== undefined) patch.isGroup = ev.isGroup;
  if (ev.isGroupExpanded !== undefined) patch.isGroupExpanded = ev.isGroupExpanded;
  return patch;
}

/**
 * Merge a validated schedule pack into the stored events/todos.
 * Dedupe is by (date, start, title) — re-importing the same pack adds
 * nothing, and notes/location differences never create a duplicate.
 * 'All day' events carry no startTime. The pack's notes ride onto the
 * created event AND todo (both models carry a notes field); the pack's
 * location rides onto events, and the Online marker only fills the
 * location when the pack leaves it empty. Recur labels do not expand:
 * the pack carries one dated instance, and that is what lands.
 * whiteSpace is never read here — it is advisory payload only.
 *
 * Grouped todos (v236): a Todo item's steps are the one field an
 * import UPDATES on a todo that is already there. A pack item that
 * carries `subtasks` replaces the matched todo's list whole (an
 * explicit empty list clears it); an item that OMITS the key leaves
 * the existing steps untouched — absence is not deletion. A created
 * todo is born with its steps. Step updates never count in `added`.
 *
 * The rest of the record (v239): the same present-wins /
 * absent-preserves discipline now covers every bridge field, on
 * created and matched records alike — a matched event or todo takes
 * the pack's keyword/color/links/completion (and its own kind's
 * fields) onto a replaced copy. Only the item's identity (title,
 * date, start) is outside the patch.
 *
 * v365 amendment (Oct 30): the v239 carve-out is retired — notes and
 * location now patch matched records too (a non-empty word from the
 * desk wins; the wire's '' preserves), because Jonathan shapes his
 * week at the desk and an edit that cannot land is a broken bridge.
 * They still never create a duplicate: identity is (date, start,
 * title) alone, exactly as before. The counts grow eventsUpdated /
 * todosUpdated — matched records whose stored form actually changed
 * — so a door can say honestly that a patch landed.
 */
export function mergeStudioSchedule(
  existingEvents: ScheduleEvent[],
  existingTodos: ScheduleTodo[],
  pack: StudioSchedulePayload,
): {
  events: ScheduleEvent[];
  todos: ScheduleTodo[];
  added: number;
  /** v345: the same counts split by kind, plus the dedupe matches —
   *  the door's honest summary names what was already there instead
   *  of letting a matched row pass silently. `added` stays the sum
   *  (eventsAdded + todosAdded), unchanged for existing callers. */
  eventsAdded: number;
  todosAdded: number;
  eventsAlreadyThere: number;
  todosAlreadyThere: number;
  /** v365: matched records whose stored form actually changed under
   *  the patch (a same-value patch counts nothing). */
  eventsUpdated: number;
  todosUpdated: number;
} {
  const events = [...existingEvents];
  const todos = [...existingTodos];
  const eventIndexByKey = new Map<string, number>();
  events.forEach((e, i) => {
    const key = `${e.date}|${e.startTime ?? ''}|${e.title}`;
    if (!eventIndexByKey.has(key)) eventIndexByKey.set(key, i);
  });
  const todoIndexByKey = new Map<string, number>();
  todos.forEach((t, i) => {
    const key = `${t.date}|${t.startTime ?? ''}|${t.title}`;
    if (!todoIndexByKey.has(key)) todoIndexByKey.set(key, i);
  });
  let added = 0;
  let eventsAdded = 0;
  let todosAdded = 0;
  let eventsAlreadyThere = 0;
  let todosAlreadyThere = 0;
  let eventsUpdated = 0;
  let todosUpdated = 0;
  for (const ev of pack.events) {
    // v229: Ministry rows are the studio-facing projection of ministry
    // records. They validate (a known type) but apply NOTHING here —
    // the records travel by the ministries pack, never as events.
    // (v237/v239: a row's record fields land separately, through
    // mergeStudioScheduleMinistries below — never as events either.)
    if (ev.type === 'Ministry') continue;
    const start = ev.start === 'All day' ? undefined : ev.start;
    const dedupe = `${ev.date}|${start ?? ''}|${ev.title}`;
    if (ev.type === 'Todo') {
      const existingIndex = todoIndexByKey.get(dedupe);
      if (existingIndex !== undefined) {
        todosAlreadyThere += 1;
        // Already there: the steps and the v239 bridge fields can
        // change, each only when the pack speaks about it. The
        // stored todo object is replaced, never mutated.
        const patch = todoBridgePatch(ev);
        if (ev.subtasks !== undefined || Object.keys(patch).length > 0) {
          const replaced: ScheduleTodo = {
            ...todos[existingIndex],
            ...patch,
            ...(ev.subtasks !== undefined
              ? {
                  subtasks:
                    ev.subtasks.length > 0 ? ev.subtasks.map((s) => ({ ...s })) : undefined,
                }
              : {}),
          };
          if (JSON.stringify(replaced) !== JSON.stringify(todos[existingIndex])) {
            todosUpdated += 1;
          }
          todos[existingIndex] = replaced;
        }
        continue;
      }
      const created = createScheduleTodo(
        {
          title: ev.title,
          date: ev.date,
          startTime: start,
          endTime: start ? endTimeOf(start, ev.minutes) : undefined,
          notes: ev.notes ? ev.notes : undefined,
          ...(ev.subtasks && ev.subtasks.length > 0
            ? { subtasks: ev.subtasks.map((s) => ({ ...s })) }
            : {}),
        },
        todos.length,
      );
      // Born with the pack's fields too (its order and completion
      // included — the factory's defaults yield to what rode in).
      const todo: ScheduleTodo = { ...created, ...todoBridgePatch(ev) };
      todoIndexByKey.set(dedupe, todos.length);
      todos.push(todo);
      added += 1;
      todosAdded += 1;
    } else {
      const existingIndex = eventIndexByKey.get(dedupe);
      if (existingIndex !== undefined) {
        eventsAlreadyThere += 1;
        // Already there: no duplicate (the v222 rule) — but the
        // pack's bridge fields still land, present-wins.
        const patch = eventBridgePatch(ev);
        if (Object.keys(patch).length > 0) {
          const replaced: ScheduleEvent = { ...events[existingIndex], ...patch };
          if (JSON.stringify(replaced) !== JSON.stringify(events[existingIndex])) {
            eventsUpdated += 1;
          }
          events[existingIndex] = replaced;
        }
        continue;
      }
      const created = createScheduleEvent({
        title: ev.title,
        date: ev.date,
        startTime: start,
        endTime: start ? endTimeOf(start, ev.minutes) : undefined,
        // The pack's own location wins; Online is only the fallback when
        // the pack leaves location empty (v224).
        location: ev.location ? ev.location : ev.online ? 'Online' : undefined,
        notes: ev.notes ? ev.notes : undefined,
      });
      // Born with the pack's fields: a carried keyword overrides the
      // factory's title detection, a carried completion its fresh
      // false — the record the pack described is the record that lands.
      const event: ScheduleEvent = { ...created, ...eventBridgePatch(ev) };
      eventIndexByKey.set(dedupe, events.length);
      events.push(event);
      added += 1;
      eventsAdded += 1;
    }
  }
  return {
    events,
    todos,
    added,
    eventsAdded,
    todosAdded,
    eventsAlreadyThere,
    todosAlreadyThere,
    eventsUpdated,
    todosUpdated,
  };
}

/** The dedupe identity of a schedule tombstone, built exactly as the
 *  merges build theirs: (date | start-or-'' | title), with 'All day'
 *  reading as the empty start an untimed stored record carries. */
export function scheduleTombstoneKey(tombstone: StudioScheduleTombstone): string {
  return `${tombstone.date}|${tombstone.start === 'All day' ? '' : tombstone.start}|${tombstone.title}`;
}

/**
 * v365 — apply a pack's schedule tombstones (Option B): delete the
 * stored events/todos whose EXACT identity key a tombstone names.
 * This is the only deletion the schedule bridge performs, and it is
 * deliberately narrow: a tombstone names one item the desk itself
 * once held, so an item that exists only in the app can never be in
 * its reach; a same-title item at a different start is a different
 * key and survives; an absent key removes nothing (re-applying the
 * same pack is a no-op). Absent/empty tombstone lists change nothing
 * and return the caller's arrays untouched.
 */
export function applyScheduleTombstones(
  existingEvents: ScheduleEvent[],
  existingTodos: ScheduleTodo[],
  tombstones: StudioScheduleTombstone[] | undefined,
): { events: ScheduleEvent[]; todos: ScheduleTodo[]; removed: number } {
  if (!tombstones || tombstones.length === 0) {
    return { events: existingEvents, todos: existingTodos, removed: 0 };
  }
  const keys = new Set(tombstones.map(scheduleTombstoneKey));
  const keyOf = (item: ScheduleEvent | ScheduleTodo): string =>
    `${item.date}|${item.startTime ?? ''}|${item.title}`;
  const events = existingEvents.filter((e) => !keys.has(keyOf(e)));
  const todos = existingTodos.filter((t) => !keys.has(keyOf(t)));
  return {
    events,
    todos,
    removed: existingEvents.length - events.length + (existingTodos.length - todos.length),
  };
}

/** Does a Ministry row carry anything that lands on a record? A bare
 *  row (identity keys only) changes nothing — the records travel by
 *  the ministries pack, and the row stays a pure projection. A wire
 *  `keyword` is NOT payload here: the ministry record has no keyword
 *  field to land it on (validated on the wire, inert on the record,
 *  like the bible pair on an Event row). */
function ministryRowHasPayload(ev: StudioScheduleEventInput): boolean {
  return (
    ev.bibleBook !== undefined ||
    ev.bibleChapter !== undefined ||
    ev.ministryType !== undefined ||
    ev.dueDate !== undefined ||
    ev.travelTimeMinutes !== undefined ||
    ev.color !== undefined ||
    ev.linkedPeopleIds !== undefined ||
    ev.isCompleted !== undefined ||
    ev.completedAt !== undefined ||
    // v365: a notes or location word from the desk is payload too —
    // a row carrying only a place change must still land (below).
    !!ev.notes ||
    !!ev.location
  );
}

/**
 * Land the record fields a schedule pack's Ministry rows carry on
 * the ministry records the app's surfaces read — the Bible
 * book/chapter pair (v237) and, since v239, the rest of the record:
 * its genre (ministryType → the record's `type`), dueDate, travel
 * time, color, linked people, and completion.
 *
 * Why this exists: the studio's SCHEDULE editor (not its Ministries
 * manager) is where he shapes a ministry session's day, and since
 * v237 it asks for the book/chapter when a line's kind is Ministry.
 * Such a line has no ministries-pack record of its own — without this
 * merge what the row carries would evaporate at the door, and
 * "Commentary writing — Colossians 1" would reach the phone tied to
 * nothing.
 *
 * Matching follows the schedule door's own convention — (date, start,
 * title), the projection's exact image of the record (the collector
 * derives all three from the record itself) — with one fallback: a
 * unique (date, title) match when the start disagrees. A matched
 * record is REPLACED with the fields applied (a present key wins, an
 * absent key leaves the stored value — the subtasks discipline; a
 * row that omits ministryType never stomps a stored genre); an
 * unmatched row CREATES the record (type from the row's ministryType,
 * else 'Bible Study' — the app's word for a session spent in a
 * chapter; the Ministries manager stays where full type fidelity is
 * edited), born with its times, place, notes, and fields. Records
 * are never mutated in place, bare rows change nothing, and
 * non-Ministry rows are ignored.
 *
 * Precedence: callers run this AFTER any ministries pack in the same
 * file (the v229 pack upserts by id, whole record — it stays the
 * authority), so a backup's projection row finds the record its own
 * pack just landed and no duplicate is born.
 */
export function mergeStudioScheduleMinistries(
  existingMinistries: ScheduleMinistry[],
  pack: StudioSchedulePayload,
): { ministries: ScheduleMinistry[]; linked: number } {
  const ministries = existingMinistries.map((m) => ({ ...m }));
  const indexByKey = new Map<string, number>();
  const indicesByDateTitle = new Map<string, number[]>();
  const register = (m: ScheduleMinistry, i: number) => {
    indexByKey.set(`${m.date}|${m.startTime ?? ''}|${m.title}`, i);
    const dt = `${m.date}|${m.title}`;
    const list = indicesByDateTitle.get(dt);
    if (list) list.push(i);
    else indicesByDateTitle.set(dt, [i]);
  };
  ministries.forEach(register);
  let linked = 0;
  for (const ev of pack.events) {
    if (ev.type !== 'Ministry') continue;
    if (!ministryRowHasPayload(ev)) continue;
    const start = ev.start === 'All day' ? undefined : ev.start;
    let index = indexByKey.get(`${ev.date}|${start ?? ''}|${ev.title}`);
    if (index === undefined) {
      const candidates = indicesByDateTitle.get(`${ev.date}|${ev.title}`) ?? [];
      if (candidates.length === 1) index = candidates[0];
    }
    if (index !== undefined) {
      ministries[index] = {
        ...ministries[index],
        // v365: notes + location patch a matched ministry row too —
        // a non-empty word from the desk wins, the wire's '' (or an
        // omitted key) preserves, exactly as on events. (Creation
        // below keeps its v224 rule untouched.)
        ...(ev.notes ? { notes: ev.notes } : {}),
        ...(ev.location ? { location: ev.location } : {}),
        ...(ev.ministryType !== undefined ? { type: ev.ministryType } : {}),
        ...(ev.dueDate !== undefined ? { dueDate: ev.dueDate } : {}),
        ...(ev.travelTimeMinutes !== undefined
          ? { travelTimeMinutes: ev.travelTimeMinutes }
          : {}),
        ...(ev.color !== undefined ? { color: ev.color } : {}),
        ...(ev.linkedPeopleIds !== undefined
          ? { linkedPeopleIds: [...ev.linkedPeopleIds] }
          : {}),
        ...completionPatch(ev),
        ...(ev.bibleBook !== undefined ? { bibleBook: ev.bibleBook } : {}),
        ...(ev.bibleChapter !== undefined ? { bibleChapter: ev.bibleChapter } : {}),
      };
      linked += 1;
      continue;
    }
    const createdBase = createScheduleMinistry({
      title: ev.title,
      type: ev.ministryType ?? 'Bible Study',
      date: ev.date,
      startTime: start,
      endTime: start ? endTimeOf(start, ev.minutes) : undefined,
      // Same Online rule as events: the pack's location wins, the
      // marker only fills an empty one (v224).
      location: ev.location ? ev.location : ev.online ? 'Online' : undefined,
      notes: ev.notes ? ev.notes : undefined,
      bibleBook: ev.bibleBook,
      bibleChapter: ev.bibleChapter,
      ...(ev.dueDate !== undefined ? { dueDate: ev.dueDate } : {}),
      ...(ev.travelTimeMinutes !== undefined
        ? { travelTimeMinutes: ev.travelTimeMinutes }
        : {}),
      ...(ev.color !== undefined ? { color: ev.color } : {}),
      ...(ev.linkedPeopleIds !== undefined
        ? { linkedPeopleIds: [...ev.linkedPeopleIds] }
        : {}),
    });
    // The factory always births a record uncompleted; a carried
    // completion overrides it, like events and todos.
    const created: ScheduleMinistry = { ...createdBase, ...completionPatch(ev) };
    register(created, ministries.length);
    ministries.push(created);
    linked += 1;
  }
  return { ministries, linked };
}

// ── Export side (WS2c): bubble lines out, for the studio's later inbox ──────

export interface BubbleLineExport {
  book: string;
  chapter: number;
  start: number;
  end: number;
  kind: 'highlight' | 'thought' | 'note';
  text: string;
  authorId?: string;
  authorName?: string;
}

/**
 * Every keeper line in the marks layer, as a flat per-chapter list:
 * book, chapter, verse span, kind, text, and the author's name/id when
 * the line is someone else's. His own lines carry no author fields.
 * Export-only — the studio's future "From the app" inbox reads this.
 */
export function collectBubbleLinesForExport(marks: MarksMap): BubbleLineExport[] {
  const lines: BubbleLineExport[] = [];
  for (const [key, entry] of Object.entries(marks)) {
    const span = parseEntryKey(key);
    if (!span) continue;
    const fields: { kind: 'highlight' | 'thought' | 'note'; lines: KeeperLine[] }[] = [
      { kind: 'highlight', lines: entry.highlights ?? [] },
      { kind: 'thought', lines: entry.thoughts ?? [] },
      { kind: 'note', lines: entry.notes ?? [] },
    ];
    for (const { kind, lines: keeperLines } of fields) {
      for (const line of keeperLines) {
        const text = lineText(line);
        if (!text.trim()) continue;
        const author = lineAuthor(line);
        lines.push({
          book: span.book,
          chapter: span.chapter,
          start: span.start,
          end: span.end,
          kind,
          text,
          ...(author ? { authorId: author.authorId, authorName: author.authorName } : {}),
        });
      }
    }
  }
  lines.sort(
    (a, b) =>
      a.book.localeCompare(b.book) ||
      a.chapter - b.chapter ||
      a.start - b.start ||
      a.kind.localeCompare(b.kind) ||
      a.text.localeCompare(b.text),
  );
  return lines;
}

// ── Export side (v363): the highlights bridge — his colours, out ────────────
// Jonathan's ruling (Oct 30): "Build the bridge — highlights show in
// the Studio too." Everything visual he lays on the text — v361's
// drag-selected phrase ranges, the v212 whole-verse tints, the whole-
// entry tint, and phrase ranges inside his own lines — rides the same
// doors as studioBubbles as ONE more section, in the stored model's
// own terms (hue = the stored TintColor key; offsets are character
// positions in the target text). Export-only, exactly like the bubble
// lines: parseStudioFileFull reads sections by presence and simply
// never reads this one, so a file carrying it imports cleanly and no
// import can add, remove, or alter a phone highlight.
//
// v417: the bridge used to DROP the v390 block highlights outright —
// selections inside his rendered commentary blocks never crossed
// (47 of them sat on his phone the day this was found, Nov 2), and no
// item named the marks record it came from, so a desk edit could not
// be addressed back to its record. Every item now carries its owning
// record's span (entryStart/entryEnd) and the block highlights cross
// in a fifth array (blocks). Additions only — every v363 field keeps
// its name and meaning, so the desk's existing reader is unaffected.

/** One drag-selected range of a verse's Scripture text, in chars. */
export interface StudioPhraseHighlightExport {
  book: string;
  chapter: number;
  /** The span of the marks record this range lives on (v417). */
  entryStart: number;
  entryEnd: number;
  verse: number;
  /** Char offset of the range's start inside that verse's text. */
  start: number;
  /** Char offset of the range's end (exclusive) inside that text. */
  end: number;
  hue: TintColor;
}

/** A run of whole-verse tints: consecutive verses wearing one hue,
 * coalesced into a single span (start = first verse, end = last). */
export interface StudioVerseTintExport {
  book: string;
  chapter: number;
  /** The span of the marks record these tints live on (v417). */
  entryStart: number;
  entryEnd: number;
  start: number;
  end: number;
  hue: TintColor;
}

/** The whole-entry tint, addressed by the entry's own verse span. */
export interface StudioEntryTintExport {
  book: string;
  chapter: number;
  /** The owning record's span — for an entry tint, the same span
   *  as start/end below (v417). */
  entryStart: number;
  entryEnd: number;
  start: number;
  end: number;
  hue: TintColor;
}

/**
 * A phrase range inside one of HIS OWN keeper lines. The line is
 * identified by its entry span (start/end), its kind, and its EXACT
 * text — and, since v417, by its storage coordinate too (field +
 * index), the address the desk's line edits and the mark-changes
 * door both speak. Offsets are char positions inside that line's
 * text.
 */
export interface StudioLineHighlightExport {
  book: string;
  chapter: number;
  /** The span of the marks record this range lives on (v417) —
   *  the same span as start/end below. */
  entryStart: number;
  entryEnd: number;
  start: number;
  end: number;
  kind: 'highlight' | 'thought' | 'note';
  /**
   * v417: the line's storage coordinate on its record — the
   * KeeperField it lives in and its index there. Until v417 the
   * wire named a line only by kind + exact text; the desk's line
   * editor addresses changes by (field, index) — the same address
   * a studioMarkChanges line change carries — so both ride now.
   */
  field: KeeperField;
  index: number;
  text: string;
  startOffset: number;
  endOffset: number;
  hue: TintColor;
}

/**
 * v417: one drag-selected range inside a rendered commentary BLOCK
 * (the v390 block highlights). Only the 'blocks' surface crosses —
 * it is the only surface the wire addresses; any other stored
 * surface is skipped by the collector rather than mis-addressed.
 * `block` is the block's index within its host entry's blocks
 * array; offsets are char positions inside that block's text.
 */
export interface StudioBlockHighlightExport {
  book: string;
  chapter: number;
  /** The span of the marks record this range lives on. */
  entryStart: number;
  entryEnd: number;
  block: number;
  /** Char offset of the range's start inside that block's text. */
  start: number;
  /** Char offset of the range's end (exclusive) inside that text. */
  end: number;
  hue: TintColor;
}

export interface StudioHighlightsSection {
  phrase: StudioPhraseHighlightExport[];
  verses: StudioVerseTintExport[];
  entries: StudioEntryTintExport[];
  lines: StudioLineHighlightExport[];
  /** v417: the v390 block highlights — see StudioBlockHighlightExport. */
  blocks: StudioBlockHighlightExport[];
}

const HIGHLIGHT_FIELD_KIND: Record<KeeperField, StudioLineHighlightExport['kind']> = {
  highlights: 'highlight',
  thoughts: 'thought',
  notes: 'note',
};

/**
 * Every tint in the marks layer, in the studioHighlights wire shape.
 * Each record is read through normalizeMarks (the load boundary's own
 * discipline), so only the six stored hues and sane offsets can
 * cross. A line highlight whose line cannot be found on its own
 * record is skipped: with no exact text to name it by, it could
 * never be placed at the desk. Pure and deterministic — collecting
 * the same map twice yields identical output.
 */
export function collectHighlightsForExport(marks: MarksMap): StudioHighlightsSection {
  const phrase: StudioPhraseHighlightExport[] = [];
  const verses: StudioVerseTintExport[] = [];
  const entries: StudioEntryTintExport[] = [];
  const lines: StudioLineHighlightExport[] = [];
  const blocks: StudioBlockHighlightExport[] = [];
  for (const [key, raw] of Object.entries(marks)) {
    const span = parseEntryKey(key);
    if (!span) continue;
    const entry = normalizeMarks(raw);
    const { book, chapter } = span;
    if (entry.tint) {
      entries.push({
        book,
        chapter,
        entryStart: span.start,
        entryEnd: span.end,
        start: span.start,
        end: span.end,
        hue: entry.tint,
      });
    }
    // Whole-verse tints cross as spans: a run of consecutive verses
    // in one hue is one span; a hue change or a gap closes the run.
    const tinted = Object.keys(entry.verseTints)
      .map(Number)
      .sort((a, b) => a - b);
    let runStart = 0;
    let runEnd = 0;
    let runHue: TintColor | null = null;
    const flushRun = () => {
      if (runHue) {
        verses.push({
          book,
          chapter,
          entryStart: span.start,
          entryEnd: span.end,
          start: runStart,
          end: runEnd,
          hue: runHue,
        });
      }
    };
    for (const v of tinted) {
      const hue = entry.verseTints[v];
      if (runHue === hue && v === runEnd + 1) {
        runEnd = v;
      } else {
        flushRun();
        runStart = v;
        runEnd = v;
        runHue = hue;
      }
    }
    flushRun();
    for (const h of entry.phraseHighlights) {
      phrase.push({
        book,
        chapter,
        entryStart: span.start,
        entryEnd: span.end,
        verse: h.verse,
        start: h.start,
        end: h.end,
        hue: h.tint,
      });
    }
    for (const h of entry.lineHighlights) {
      // Line highlights sit on the record the line itself lives on
      // (marks.ts), so the line's words are read from THIS record.
      const line = entry[h.field][h.index];
      if (line === undefined) continue;
      lines.push({
        book,
        chapter,
        entryStart: span.start,
        entryEnd: span.end,
        start: span.start,
        end: span.end,
        kind: HIGHLIGHT_FIELD_KIND[h.field],
        field: h.field,
        index: h.index,
        text: lineText(line),
        startOffset: h.start,
        endOffset: h.end,
        hue: h.tint,
      });
    }
    for (const h of entry.blockHighlights) {
      // v417: block highlights cross in their own array, in the
      // stored model's own terms (block index + char offsets).
      // Only the 'blocks' surface crosses — it is the only surface
      // the stored model carries today; any other surface value is
      // skipped rather than mis-addressed at the desk.
      if (h.surface !== 'blocks') continue;
      blocks.push({
        book,
        chapter,
        entryStart: span.start,
        entryEnd: span.end,
        block: h.index,
        start: h.start,
        end: h.end,
        hue: h.tint,
      });
    }
  }
  const bySpan = (
    a: { book: string; chapter: number; start: number; end: number; hue: TintColor },
    b: { book: string; chapter: number; start: number; end: number; hue: TintColor },
  ) =>
    a.book.localeCompare(b.book) ||
    a.chapter - b.chapter ||
    a.start - b.start ||
    a.end - b.end ||
    a.hue.localeCompare(b.hue);
  phrase.sort(
    (a, b) =>
      a.book.localeCompare(b.book) ||
      a.chapter - b.chapter ||
      a.verse - b.verse ||
      a.start - b.start ||
      a.end - b.end ||
      a.hue.localeCompare(b.hue),
  );
  verses.sort(bySpan);
  entries.sort(bySpan);
  lines.sort(
    (a, b) =>
      a.book.localeCompare(b.book) ||
      a.chapter - b.chapter ||
      a.start - b.start ||
      a.end - b.end ||
      a.kind.localeCompare(b.kind) ||
      a.text.localeCompare(b.text) ||
      a.startOffset - b.startOffset ||
      a.endOffset - b.endOffset ||
      a.hue.localeCompare(b.hue),
  );
  blocks.sort(
    (a, b) =>
      a.book.localeCompare(b.book) ||
      a.chapter - b.chapter ||
      a.entryStart - b.entryStart ||
      a.entryEnd - b.entryEnd ||
      a.block - b.block ||
      a.start - b.start ||
      a.end - b.end ||
      a.hue.localeCompare(b.hue),
  );
  return { phrase, verses, entries, lines, blocks };
}

/** Keep the type import honest for callers that only need the book shape. */
export type { V205BookData };
