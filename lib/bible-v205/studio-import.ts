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
//                                type that applies nothing here (the
//                                records travel by their own pack).
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
import { CHAPTER_COUNTS, getChapterData } from './index';
import {
  createScheduleEvent,
  createScheduleTodo,
  type ScheduleEvent,
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
  V205Section,
} from './types';
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

export interface StudioScheduleEventInput {
  title: string;
  day: string;
  date: string;
  start: string;
  minutes: number;
  /** 'Ministry' rows (v229) are the studio-facing projection of the
   *  app's ministry records — a known, valid type that applies nothing
   *  on this side; the records themselves travel by the ministries pack. */
  type: 'Event' | 'Todo' | 'Ministry';
  online: boolean;
  recur: string;
  /** Additive studio keys (v224): the event's notes and location, carried
   *  straight through to the created schedule item. '' when unset. */
  notes?: string;
  location?: string;
}

export interface StudioSchedulePayload {
  weekOf: string;
  events: StudioScheduleEventInput[];
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

const NOTE_CATEGORIES: NoteCategory[] = [
  'definition',
  'quote',
  'good-thought',
  'conversation',
  'personal-story',
];

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
  if (raw.category === null || NOTE_CATEGORIES.includes(raw.category as NoteCategory)) {
    if (raw.category) block.category = raw.category as NoteCategory;
  } else if (raw.category !== undefined) {
    fail(`${where}: unknown note category`);
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
  if (raw.category === null || NOTE_CATEGORIES.includes(raw.category as NoteCategory)) {
    note.category = (raw.category as NoteCategory | null) ?? null;
  } else if (raw.category !== undefined) {
    fail(`${where}: unknown note category`);
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

function validateScheduleEvents(rawEvents: unknown[]): StudioScheduleEventInput[] {
  return rawEvents.map((e, i) => {
    const where = `schedule event ${i}`;
    if (!isRecord(e)) fail(`${where}: event is not an object`);
    if (!isNonEmptyString(e.title)) fail(`${where}: event has no title`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(e.date))) fail(`${where}: event has no valid date`);
    if (typeof e.start !== 'string' || (e.start !== 'All day' && !/^\d{2}:\d{2}$/.test(e.start))) {
      fail(`${where}: event has no valid start time`);
    }
    if (!isInt(e.minutes) || e.minutes < 0) fail(`${where}: event has invalid minutes`);
    if (e.type !== 'Event' && e.type !== 'Todo' && e.type !== 'Ministry') {
      fail(`${where}: event type must be Event, Todo, or Ministry`);
    }
    return {
      title: e.title as string,
      day: typeof e.day === 'string' ? e.day : '',
      date: e.date as string,
      start: e.start as string,
      minutes: e.minutes,
      type: e.type as 'Event' | 'Todo' | 'Ministry',
      online: e.online === true,
      recur: typeof e.recur === 'string' ? e.recur : 'none',
      // Additive keys (v224): accepted when present, never a reason to
      // reject the pack; anything not a string reads as unset.
      notes: typeof e.notes === 'string' ? e.notes : '',
      location: typeof e.location === 'string' ? e.location : '',
    };
  });
}

function validateSchedule(raw: unknown): StudioSchedulePayload {
  if (!isRecord(raw)) fail('Schedule pack is not an object');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(raw.weekOf))) {
    fail('Schedule pack has no valid weekOf date');
  }
  if (!Array.isArray(raw.events)) fail('Schedule pack has no events array');
  return { weekOf: raw.weekOf as string, events: validateScheduleEvents(raw.events) };
}

/**
 * The backup's studioSchedule section (v227): same event shape, but the
 * section stamps exportedAt instead of a weekOf — the events are the
 * payload, validated exactly like a pack's. weekOf normalizes to ''.
 */
function validateScheduleSection(raw: unknown): StudioSchedulePayload {
  if (!isRecord(raw)) fail('Schedule section is not an object');
  if (!Array.isArray(raw.events)) fail('Schedule section has no events array');
  return { weekOf: '', events: validateScheduleEvents(raw.events) };
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
      'That file is not a studio pack — expected prayercircle-notes.json, ' +
        'prayercircle-library.json, prayercircle-schedule.json, prayercircle-people.json, ' +
        'prayercircle-ministries.json, or a PrayerCircle backup carrying studio sections.',
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
  eventsAdded: number;
  peopleUpdated: number;
  needs: number;
  journalEntries: number;
  ministriesAdded: number;
  ministriesUpdated: number;
  ministriesDeleted: number;
}

export function emptyStudioApplyCounts(): StudioApplyCounts {
  return {
    chaptersUpdated: 0,
    statesSet: 0,
    readMarks: 0,
    eventsAdded: 0,
    peopleUpdated: 0,
    needs: 0,
    journalEntries: 0,
    ministriesAdded: 0,
    ministriesUpdated: 0,
    ministriesDeleted: 0,
  };
}

/**
 * One line naming what a whole file did, section by section — only the
 * sections the file actually carried get a segment:
 * "Notes: N chapters · States: M · Events added: K · People updated: P
 *  · Ministries: A added / U updated / D deleted".
 */
export function formatStudioImportSummary(plan: StudioFilePlan, counts: StudioApplyCounts): string {
  const parts: string[] = [];
  if (plan.notes) parts.push(`Notes: ${counts.chaptersUpdated} chapters`);
  if (plan.states || counts.statesSet > 0) parts.push(`States: ${counts.statesSet}`);
  if (plan.states && counts.readMarks > 0) parts.push(`Read marks: ${counts.readMarks}`);
  if (plan.schedule) parts.push(`Events added: ${counts.eventsAdded}`);
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
    return note.blocks.map((b) => ({
      ...b,
      kind: 'quote' as const,
      ...(authorName ? { authorName } : {}),
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

export async function loadStudioImports(): Promise<StudioImportsMap> {
  try {
    const raw = await AsyncStorage.getItem(STUDIO_IMPORT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return isRecord(parsed) ? (parsed as StudioImportsMap) : {};
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
 */
export function mergeStudioSchedule(
  existingEvents: ScheduleEvent[],
  existingTodos: ScheduleTodo[],
  pack: StudioSchedulePayload,
): { events: ScheduleEvent[]; todos: ScheduleTodo[]; added: number } {
  const events = [...existingEvents];
  const todos = [...existingTodos];
  const seenEvents = new Set(events.map((e) => `${e.date}|${e.startTime ?? ''}|${e.title}`));
  const seenTodos = new Set(todos.map((t) => `${t.date}|${t.startTime ?? ''}|${t.title}`));
  let added = 0;
  for (const ev of pack.events) {
    // v229: Ministry rows are the studio-facing projection of ministry
    // records. They validate (a known type) but apply NOTHING here —
    // the records travel by the ministries pack, never as events.
    if (ev.type === 'Ministry') continue;
    const start = ev.start === 'All day' ? undefined : ev.start;
    const dedupe = `${ev.date}|${start ?? ''}|${ev.title}`;
    if (ev.type === 'Todo') {
      if (seenTodos.has(dedupe)) continue;
      const todo = createScheduleTodo(
        {
          title: ev.title,
          date: ev.date,
          startTime: start,
          endTime: start ? endTimeOf(start, ev.minutes) : undefined,
          notes: ev.notes ? ev.notes : undefined,
        },
        todos.length,
      );
      todos.push(todo);
      seenTodos.add(dedupe);
      added += 1;
    } else {
      if (seenEvents.has(dedupe)) continue;
      const event = createScheduleEvent({
        title: ev.title,
        date: ev.date,
        startTime: start,
        endTime: start ? endTimeOf(start, ev.minutes) : undefined,
        // The pack's own location wins; Online is only the fallback when
        // the pack leaves location empty (v224).
        location: ev.location ? ev.location : ev.online ? 'Online' : undefined,
        notes: ev.notes ? ev.notes : undefined,
      });
      events.push(event);
      seenEvents.add(dedupe);
      added += 1;
    }
  }
  return { events, todos, added };
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
