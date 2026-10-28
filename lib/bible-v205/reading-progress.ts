// ─── v305 reading progress — the READ track, counted ───────────────────────
// His asks (2026-10-28 10:12–10:15 PDT, on the Books screen): "I need
// some sort of progress bar for my reading. And a reset button for
// when I complete reading the entire Bible." Then: "Shouldn't there
// be some sort of progress bar for the books as well? That way I know
// what books I've read."
//
// The store is the v228 READ track — StudyState.reads in study.ts
// ("Book|chapter" -> ISO date he marked the chapter read, held in the
// study store at prayercircle.bible.v205.study.v1). A chapter counts
// as READ exactly when a key for it exists in `reads` — the same test
// chapterReadDate makes, the same marks Mark as Read writes through
// markChapterRead (reader foot, Stories end screen, Personal Study
// card) and unmarkChapterRead clears. This module only COUNTS those
// marks and, for the reset, empties that one record — nothing here
// touches the notes track (overrides), the queues, the current book,
// or the position stamp. The legacy stores bible-sync.ts mirrors
// (bibleReadingProgress, bibleChapters, …) are never read by the
// Bible section — the one migration that ever consulted one is
// flag-guarded in study.ts and has already run — so `reads` is the
// single source and clearing it leaves no orphaned copy behind:
// position.ts and the chapter page both derive read state from it
// live, with no cache of their own.
//
// Counting discipline matches position.ts's readEvidence: iterate
// the canon's real chapters and test each key, so malformed keys
// (unknown book, chapter out of range) can never inflate a count.

import { CHAPTER_COUNTS } from './index';
import { chapterKey, type StudyState } from './study';

/** The whole canon, derived from the book data — 66 books. */
export const TOTAL_BIBLE_BOOKS = Object.keys(CHAPTER_COUNTS).length;

/** The whole Bible's chapter count, derived from the book data —
 * 1,189. Derived, never hardcoded, so a data fix moves the bar. */
export const TOTAL_BIBLE_CHAPTERS = Object.values(CHAPTER_COUNTS).reduce((a, b) => a + b, 0);

/** Chapters of `book` carrying a read mark. */
export function bookReadCount(state: StudyState, book: string): number {
  const total = CHAPTER_COUNTS[book] ?? 0;
  let n = 0;
  for (let c = 1; c <= total; c++) {
    if (state.reads[chapterKey(book, c)] != null) n++;
  }
  return n;
}

export interface ReadingTotals {
  /** Chapters read across the whole Bible. */
  read: number;
  /** Chapters in the whole Bible (TOTAL_BIBLE_CHAPTERS). */
  total: number;
  /** Per-book read counts, keyed by book name, over the given canon. */
  perBook: Record<string, number>;
}

/** The aggregate the Books screen's overall bar renders: per-book
 * read counts over the canon, their sum, and the Bible's total. */
export function readingTotals(state: StudyState, canon: string[]): ReadingTotals {
  const perBook: Record<string, number> = {};
  let read = 0;
  for (const book of canon) {
    const n = bookReadCount(state, book);
    perBook[book] = n;
    read += n;
  }
  return { read, total: TOTAL_BIBLE_CHAPTERS, perBook };
}

/** Pure: the state with the READ track emptied — every chapter's
 * read mark cleared so he can start the Bible again. The notes
 * track (overrides), the write/restudy queues, the current book and
 * the lastRead position stamp are carried across untouched: the
 * reset is for READING, and reading is `reads` alone. Callers
 * persist with saveStudyState. */
export function resetReadingProgress(state: StudyState): StudyState {
  return { ...state, reads: {} };
}
