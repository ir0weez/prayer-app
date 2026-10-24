// ─── v222 "The Door" — the Commentary Studio import door ────────────────────
// The studio (~/workspace/commentary-studio) writes two JSON files; this
// module is the app's half of the bridge. It parses them, validates them
// COMPLETELY before anything is applied (a malformed file changes nothing),
// and converts them into the app's own stores:
//
//   prayercircle-notes.json    → per-chapter commentary overrides
//   prayercircle-library.json  → { chapters: [ ...same payloads ] }
//   prayercircle-schedule.json → schedule events/todos for one week
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
  type: 'Event' | 'Todo';
  online: boolean;
  recur: string;
}

export interface StudioSchedulePayload {
  weekOf: string;
  events: StudioScheduleEventInput[];
  whiteSpace?: Record<string, { start: string; end: string; minutes: number }[]>;
}

export type StudioPack =
  | { kind: 'notes'; chapters: StudioChapterPayload[] }
  | { kind: 'schedule'; schedule: StudioSchedulePayload };

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

function validateSchedule(raw: unknown): StudioSchedulePayload {
  if (!isRecord(raw)) fail('Schedule pack is not an object');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(raw.weekOf))) {
    fail('Schedule pack has no valid weekOf date');
  }
  if (!Array.isArray(raw.events)) fail('Schedule pack has no events array');
  const events = raw.events.map((e, i) => {
    const where = `schedule event ${i}`;
    if (!isRecord(e)) fail(`${where}: event is not an object`);
    if (!isNonEmptyString(e.title)) fail(`${where}: event has no title`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(e.date))) fail(`${where}: event has no valid date`);
    if (typeof e.start !== 'string' || (e.start !== 'All day' && !/^\d{2}:\d{2}$/.test(e.start))) {
      fail(`${where}: event has no valid start time`);
    }
    if (!isInt(e.minutes) || e.minutes < 0) fail(`${where}: event has invalid minutes`);
    if (e.type !== 'Event' && e.type !== 'Todo') fail(`${where}: event type must be Event or Todo`);
    return {
      title: e.title as string,
      day: typeof e.day === 'string' ? e.day : '',
      date: e.date as string,
      start: e.start as string,
      minutes: e.minutes,
      type: e.type as 'Event' | 'Todo',
      online: e.online === true,
      recur: typeof e.recur === 'string' ? e.recur : 'none',
    };
  });
  return { weekOf: raw.weekOf as string, events };
}

/**
 * Parse and FULLY validate a studio file before anything is applied.
 * Accepts a single-chapter notes pack, a library pack, or a schedule pack.
 * Throws a plain Error with a human-readable reason on anything malformed.
 */
export function parseStudioFile(parsed: unknown): StudioPack {
  if (!isRecord(parsed)) fail('That file is not a studio pack (expected a JSON object).');
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
  fail(
    'That file is not a studio pack — expected prayercircle-notes.json, ' +
      'prayercircle-library.json, or prayercircle-schedule.json.',
  );
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
 * nothing. 'All day' events carry no startTime. Online events keep their
 * marker in the location field the app already shows. Recur labels do not
 * expand: the pack carries one dated instance, and that is what lands.
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
        location: ev.online ? 'Online' : undefined,
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
