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
//    a DIFFERENT store and is never touched by an import.
//  · chapterState, when present, goes through the same transition
//    semantics as tapping in the app (transitionChapterStatus): XP is
//    idempotent, backward moves are allowed, nothing is ever revoked.
//  · Schedule imports land as planned items; the app stays the authority
//    for what actually happened. Dedupe is by (date, start, title), so a
//    re-import of the same pack adds nothing. whiteSpace is advisory
//    payload data and is never stored — the app computes its own.
//  · Export side (WS2c): collectBubbleLinesForExport turns the marks
//    layer into a distinct backup section the studio can read later.

import AsyncStorage from '@react-native-async-storage/async-storage';
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
  parseEntryKey,
  type KeeperLine,
  type MarksMap,
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

export interface StudioSchedulePayload {
  weekOf: string;
  events: StudioScheduleEventInput[];
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

function validateSchedule(raw: unknown): StudioSchedulePayload {
  if (!isRecord(raw)) fail('Schedule pack is not an object');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(raw.weekOf))) {
    fail('Schedule pack has no valid weekOf date');
  }
  if (!Array.isArray(raw.events)) fail('Schedule pack has no events array');
  const { events, minutesRepaired } = validateScheduleEvents(raw.events);
  return { weekOf: raw.weekOf as string, events, minutesRepaired };
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
  return { weekOf: '', events, minutesRepaired };
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
}

export function emptyStudioFilePlan(): StudioFilePlan {
  return { notes: null, states: null, schedule: null, people: null, ministries: null };
}

export function studioFileHasSections(plan: StudioFilePlan): boolean {
  return (
    plan.notes !== null ||
    plan.states !== null ||
    plan.schedule !== null ||
    plan.people !== null ||
    plan.ministries !== null
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
 *     "whiteSpace":  { … },                //   optional, advisory only
 *     "people":      [ … ],                // people — people and
 *     "journal":     [ … ],                //   journal ride together
 *     "ministries":  [ … ],                // ministries records
 *     "deletedIds":  [ … ]                 //   optional tombstones
 *   }
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
export function parseStudioFileFull(parsed: unknown): StudioFilePlan {
  if (!isRecord(parsed)) fail('That file is not a studio pack (expected a JSON object).');
  const plan = emptyStudioFilePlan();
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
    minutesRepaired: 0,
    peopleUpdated: 0,
    needs: 0,
    journalEntries: 0,
    ministriesAdded: 0,
    ministriesUpdated: 0,
    ministriesDeleted: 0,
    ministriesLinked: 0,
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
        (counts.minutesRepaired > 0 ? ` · ${counts.minutesRepaired} repaired` : ''),
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
  return parts.join(' · ');
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

export async function loadStudioImports(): Promise<StudioImportsMap> {
  try {
    const raw = await AsyncStorage.getItem(STUDIO_IMPORT_KEY);
    if (!raw) return {};
    return sanitizeStudioImportsMap(JSON.parse(raw));
  } catch {
    return {};
  }
}

export async function saveStudioImports(map: StudioImportsMap): Promise<void> {
  await AsyncStorage.setItem(STUDIO_IMPORT_KEY, JSON.stringify(map));
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
 * date, start) and the v224 notes/location semantics are unchanged:
 * those differences never created a duplicate, and still don't
 * update a matched record.
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
          todos[existingIndex] = {
            ...todos[existingIndex],
            ...patch,
            ...(ev.subtasks !== undefined
              ? {
                  subtasks:
                    ev.subtasks.length > 0 ? ev.subtasks.map((s) => ({ ...s })) : undefined,
                }
              : {}),
          };
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
          events[existingIndex] = { ...events[existingIndex], ...patch };
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
  return { events, todos, added, eventsAdded, todosAdded, eventsAlreadyThere, todosAlreadyThere };
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
    ev.completedAt !== undefined
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

/** Keep the type import honest for callers that only need the book shape. */
export type { V205BookData };
