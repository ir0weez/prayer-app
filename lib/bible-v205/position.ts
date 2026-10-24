// ─── v211 reading position — derived from the NEW study store only ──────────
// The one derivation every Bible-position surface reads: the Personal
// Study card (last-read line, storyteller preview, Read target, Back),
// the home tab's summary line, the profile's current-book chip. Before
// v211 these read the legacy unified store, which the new UI never
// wrote — the frozen-position defect. The unified store now only seeds
// the position once (study.ts: seedReadingPosition); nothing here
// touches it.

import { CHAPTER_COUNTS, chapterCountFor } from './index';
import { chapterStatus, type LastReadMark, type StudyState } from './study';

/** The 66 books in canon order (CHAPTER_COUNTS is declared in order). */
export const CANON_BOOKS: string[] = Object.keys(CHAPTER_COUNTS);

export interface ReadingPosition {
  /** The book he chose in the Books view (study store), if any. */
  currentBook: string | null;
  /** The last chapter he completed, with its date, if any. */
  lastRead: LastReadMark | null;
  /** Where he reads next: with a current book, its first chapter not
   * yet Complete; with no current book, the chapter right after
   * lastRead in canon order. Null at the end of the canon (or when
   * there is nothing to derive from). */
  target: { book: string; chapter: number } | null;
}

export function getReadingPosition(state: StudyState): ReadingPosition {
  const currentBook = state.currentBook ?? null;
  const lastRead = state.lastRead ?? null;
  let target: { book: string; chapter: number } | null = null;
  if (currentBook) {
    const total = chapterCountFor(currentBook);
    for (let c = 1; c <= total; c++) {
      if (chapterStatus(state, currentBook, c) !== 'complete') {
        target = { book: currentBook, chapter: c };
        break;
      }
    }
  } else if (lastRead) {
    if (lastRead.chapter < chapterCountFor(lastRead.book)) {
      target = { book: lastRead.book, chapter: lastRead.chapter + 1 };
    } else {
      const idx = CANON_BOOKS.indexOf(lastRead.book);
      if (idx >= 0 && idx < CANON_BOOKS.length - 1) {
        target = { book: CANON_BOOKS[idx + 1], chapter: 1 };
      }
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
