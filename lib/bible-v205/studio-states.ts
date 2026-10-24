// ─── v228 "Two Honest Marks" — the studioStates bridge ───────────────────────
// The DATA backup gains a studioStates section so the studio can see
// BOTH marks per chapter, and the same section is accepted back
// through the studio door (studio-import.ts) and the Drive check:
//
//   { chapters: [ { book, chapter, notesState, readDate } ] }
//
//   notesState — the NOTES-WRITTEN track (the study status pipeline).
//                null means "no notes state" (the store's 'none').
//                On import it walks transitionChapterStatus, exactly
//                like a chapterState in a notes pack.
//   readDate   — the READ track: an ISO date, or null. On import a
//                later date wins; a null NEVER clears an existing
//                read mark — a stale export can't un-read a chapter.
//
// Only chapters carrying at least one mark ride the section; a chapter
// with neither is simply absent, on both sides of the bridge.

import { CHAPTER_COUNTS, chapterCountFor } from './index';
import { chapterMarks, setChapterRead, type StudyState } from './study';
import type { StudyStatus } from './types';

export interface StudioStateEntry {
  book: string;
  chapter: number;
  /** The notes-written status, or null for 'none'. */
  notesState: StudyStatus | null;
  /** ISO date (YYYY-MM-DD) the chapter was marked read, or null. */
  readDate: string | null;
}

export interface StudioStatesSection {
  chapters: StudioStateEntry[];
}

const NOTES_STATES: StudyStatus[] = ['complete', 'in-progress', 'write', 'restudy', 'not-started', 'none'];

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function fail(message: string): never {
  throw new Error(message);
}

/** A real calendar date in strict YYYY-MM-DD form (2026-13-40 fails). */
export function isISODateString(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/** Export side: every chapter carrying either mark, in canon order. */
export function collectStudioStates(state: StudyState): StudioStatesSection {
  const chapters: StudioStateEntry[] = [];
  for (const book of Object.keys(CHAPTER_COUNTS)) {
    const total = chapterCountFor(book);
    for (let chapter = 1; chapter <= total; chapter++) {
      const marks = chapterMarks(state, book, chapter);
      if (marks.status === 'none' && marks.readDate === null) continue;
      chapters.push({
        book,
        chapter,
        notesState: marks.status === 'none' ? null : marks.status,
        readDate: marks.readDate,
      });
    }
  }
  return { chapters };
}

/**
 * Validate a studioStates section COMPLETELY (the door's discipline:
 * a malformed section changes nothing). Accepts the section object
 * itself ({ chapters: [...] }); returns the normalized entries.
 */
export function validateStudioStates(raw: unknown, where = 'studioStates'): StudioStateEntry[] {
  if (!isRecord(raw)) fail(`${where}: expected an object with a chapters list.`);
  if (!Array.isArray(raw.chapters)) fail(`${where}: chapters must be a list.`);
  const seen = new Set<string>();
  return raw.chapters.map((entry, i) => {
    const at = `${where} chapter ${i}`;
    if (!isRecord(entry)) fail(`${at}: expected an object.`);
    const { book, chapter, notesState, readDate } = entry;
    if (typeof book !== 'string' || !(book in CHAPTER_COUNTS)) {
      fail(`${at}: unknown book "${String(book)}"`);
    }
    const total = chapterCountFor(book as string);
    if (typeof chapter !== 'number' || !Number.isInteger(chapter) || chapter < 1 || chapter > total) {
      fail(`${at}: chapter ${String(chapter)} is outside ${book} (1–${total}).`);
    }
    if (notesState !== null && !NOTES_STATES.includes(notesState as StudyStatus)) {
      fail(`${at}: unknown notesState "${String(notesState)}"`);
    }
    if (readDate !== null && !isISODateString(readDate)) {
      fail(`${at}: readDate must be an ISO date (YYYY-MM-DD) or null.`);
    }
    const key = `${book}|${chapter}`;
    if (seen.has(key)) fail(`${at}: duplicate entry for ${book} ${chapter}.`);
    seen.add(key);
    return {
      book: book as string,
      chapter: chapter as number,
      notesState: notesState === 'none' ? null : (notesState as StudyStatus | null),
      readDate: readDate as string | null,
    };
  });
}

/**
 * Import side, READ track only — pure. A pack readDate lands when the
 * chapter is unread or the pack's date is LATER; a null never clears.
 * Notes states are NOT applied here: they walk transitionChapterStatus
 * at the door (XP + position semantics live there). Returns the next
 * state and how many read marks actually moved.
 */
export function applyStudioStatesReads(
  state: StudyState,
  entries: StudioStateEntry[],
): { state: StudyState; applied: number } {
  let next = state;
  let applied = 0;
  for (const entry of entries) {
    if (entry.readDate === null) continue;
    const current = next.reads[`${entry.book}|${entry.chapter}`] ?? null;
    if (current === null || entry.readDate > current) {
      next = setChapterRead(next, entry.book, entry.chapter, entry.readDate);
      applied += 1;
    }
  }
  return { state: next, applied };
}
