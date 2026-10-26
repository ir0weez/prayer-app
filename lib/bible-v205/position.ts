// ─── v211 reading position — derived from the NEW study store only ──────────
// The one derivation every Bible-position surface reads: the Personal
// Study card (last-read line, storyteller preview, Read target, Back),
// the home tab's summary line, the profile's current-book chip. Before
// v211 these read the legacy unified store, which the new UI never
// wrote — the frozen-position defect. The unified store now only seeds
// the position once (study.ts: seedReadingPosition); nothing here
// touches it.
//
// ─── v253 — the position follows the READ track ─────────────────────────────
// v228 split the two marks (Read ≠ notes-Complete) but this resolver
// kept deriving the READING position from the NOTES track: the target
// scanned chapterStatus (notes states) and lastRead was the stamp a
// notes-Complete transition writes. Mark as Read — the reader's one
// position act since the v228 reader purge — writes state.reads,
// which this module never opened. His report (Oct 25, on v251): he
// marked Leviticus 20 read and the card still headlined Chapter 1
// with "Last read Leviticus 19 · Oct 24". Both outputs, one cause:
// with a Current book set, the notes scan stopped at Leviticus 1
// (no in-app notes-Complete override there — his writing record
// lives in the studio pipeline), and the stamp still held the last
// NOTES transition (Leviticus 19, Oct 24), blind to today's read.
//
// Now the resolution reads the union of the real read evidence, the
// v228 reads store first-class:
//   · lastRead — the furthest READ mark in canon order, with its
//     date. The position stamp speaks only when the reads track is
//     empty (a pre-v228 profile, whose position it legitimately was).
//   · target — the first chapter of the active book covered by
//     neither a read mark nor the stamp floor (below), then forward
//     through canon: a book finished by reading chains to the next
//     book's first uncovered chapter; the position rests (null)
//     only at the end of the canon.
//   · the stamp as FLOOR — state.lastRead says he reached that
//     chapter of that book, so the scan never points below it. It
//     creates no read marks and moves no notes states (the two
//     marks stay independent — study.ts chapterDisplayMarks is
//     untouched); it only keeps a legacy position from resetting.
// Deterministic and monotone: marking a chapter read only ever
// grows the covered set, so the target can move forward or finish
// the book — never backward, never back to a book's first chapter
// while later reads exist.

import { CHAPTER_COUNTS, chapterCountFor } from './index';
import type { LastReadMark, StudyState } from './study';

/** The 66 books in canon order (CHAPTER_COUNTS is declared in order). */
export const CANON_BOOKS: string[] = Object.keys(CHAPTER_COUNTS);

export interface ReadingPosition {
  /** The book he chose in the Books view (study store), if any. */
  currentBook: string | null;
  /** The furthest chapter he has marked READ, with its date — the
   * reads store's frontier. Only when no read marks exist at all
   * does this fall back to the position stamp (the pre-v228 record). */
  lastRead: LastReadMark | null;
  /** Where he reads next: the active book's first chapter covered
   * by neither a read mark nor the stamp floor, chaining forward
   * through canon past finished books. The active book is his
   * Current choice, else the frontier's book, else the stamp's.
   * Null only at the end of the canon (or on a fresh profile). */
  target: { book: string; chapter: number } | null;
}

/** The read evidence in a state: per-book chapters carrying a read
 * mark, and the furthest mark in canon order. Malformed entries
 * (unknown book, chapter outside the book) are ignored — the store
 * normalizer validates dates, not keys. */
function readEvidence(state: StudyState): {
  readChapters: Map<string, Set<number>>;
  frontier: LastReadMark | null;
} {
  const readChapters = new Map<string, Set<number>>();
  let frontier: LastReadMark | null = null;
  let frontierBookIdx = -1;
  for (const [key, date] of Object.entries(state.reads ?? {})) {
    const cut = key.lastIndexOf('|');
    if (cut <= 0) continue;
    const book = key.slice(0, cut);
    const chapter = Number(key.slice(cut + 1));
    const bookIdx = CANON_BOOKS.indexOf(book);
    if (bookIdx < 0 || !Number.isInteger(chapter) || chapter < 1 || chapter > chapterCountFor(book)) continue;
    let chapters = readChapters.get(book);
    if (!chapters) {
      chapters = new Set<number>();
      readChapters.set(book, chapters);
    }
    chapters.add(chapter);
    if (bookIdx > frontierBookIdx || (bookIdx === frontierBookIdx && frontier !== null && chapter > frontier.chapter)) {
      frontierBookIdx = bookIdx;
      frontier = { book, chapter, date };
    }
  }
  return { readChapters, frontier };
}

export function getReadingPosition(state: StudyState): ReadingPosition {
  const currentBook = state.currentBook ?? null;
  const stamp = state.lastRead ?? null;
  const { readChapters, frontier } = readEvidence(state);
  const lastRead = frontier ?? stamp;
  const activeBook = currentBook ?? frontier?.book ?? stamp?.book ?? null;
  let target: { book: string; chapter: number } | null = null;
  if (activeBook) {
    // The first chapter covered by neither a read mark nor the
    // stamp's floor for that book, walking forward through canon —
    // a finished book chains to the next book's first open chapter.
    let idx = CANON_BOOKS.indexOf(activeBook);
    while (idx >= 0 && idx < CANON_BOOKS.length && target === null) {
      const book = CANON_BOOKS[idx];
      const total = chapterCountFor(book);
      const floor = stamp !== null && stamp.book === book ? stamp.chapter : 0;
      const read = readChapters.get(book);
      for (let c = 1; c <= total; c++) {
        if (c <= floor) continue;
        if (read?.has(c)) continue;
        target = { book, chapter: c };
        break;
      }
      idx += 1;
    }
  }
  return { currentBook, lastRead, target };
}

/** The "Book Chapter" display string a position renders as — the
 * target when there is one, else the last chapter read. */
export function readingPositionDisplay(position: ReadingPosition): string | null {
  if (position.target) return `${position.target.book} ${position.target.chapter}`;
  if (position.lastRead) return `${position.lastRead.book} ${position.lastRead.chapter}`;
  return null;
}

/** v218: the Personal Study card's headline line — where he IS, in
 * the chapter page header's own format ("Leviticus · Chapter 19").
 * The target chapter when there is one (the very chapter the card's
 * Read Chapter button opens, so the two always agree — including
 * when the target chained past a finished book), else the last
 * chapter read. A profile with no position at all (nothing chosen,
 * nothing read) keeps the caller's fallback line — the
 * chapters-complete count. */
export function personalStudyHeadline(position: ReadingPosition, fallback: string): string {
  if (position.target) return `${position.target.book} · Chapter ${position.target.chapter}`;
  if (position.lastRead) return `${position.lastRead.book} · Chapter ${position.lastRead.chapter}`;
  return fallback;
}
