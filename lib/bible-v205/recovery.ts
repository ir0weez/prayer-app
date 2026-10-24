// ─── Full_Commentary recovery fill ───────────────────────────────────────────
// Genesis 6–10 exist in full in Jonathan's combined manuscript
// (Full_Commentary.txt) but never reached the per-book txts the v205
// data is generated from, so those chapters converted with their Bible
// Stories section bands and ZERO entries. The recovery (2026-10-24)
// parsed them out of the manuscript — words verbatim, plus the five
// spelling fixes he authorized — into recovered.json, and v233 merged
// them into the shipped data.
//
// This module is the GENERATOR's half of that recovery: scripts/
// build-bible-v205.ts runs applyRecoveryFill over every book after the
// txt + Notion stages, so a regeneration can never silently drop the
// recovered chapters again. The rule mirrors the studio converter's
// exactly: a recovered chapter fills ONLY a chapter that currently
// carries zero blocks. Anything already carrying his words is left
// untouched and reported as skipped — the fill can never overwrite.

import type { V205Block, V205BookData, V205ChapterData, V205Section } from './types';

/** One recovered chapter, in recovered.json's shape (the studio
 * converter's shape — the same file feeds both). */
export interface RecoveredChapter {
  intro: V205Block[];
  previously: string[];
  sections: V205Section[];
}

export interface RecoveredBook {
  chapters: Record<string, RecoveredChapter>;
}

export type RecoveredMap = Record<string, RecoveredBook>;

/** Every commentary block a chapter carries, across all sections. */
export function chapterBlockCount(chapter: V205ChapterData): number {
  return chapter.sections.reduce(
    (n, s) => n + s.entries.reduce((m, e) => m + e.blocks.length, 0),
    0,
  );
}

export interface RecoveryFillResult {
  data: V205BookData;
  /** "Book N" for each chapter the recovery filled. */
  filled: string[];
  /** "Book N" for each recovered chapter left alone because the
   * generated chapter already carries blocks (or does not exist). */
  skipped: string[];
}

/**
 * Pure: fill this book's zero-block chapters from the recovery map.
 * A filled chapter takes the recovery's intro / previously / sections
 * verbatim and keeps everything the generation already had — stories,
 * outline, embedded verses — exactly as the v233 merge did by hand.
 * Chapters absent from the book are never created; chapters carrying
 * any blocks are never touched.
 */
export function applyRecoveryFill(bookData: V205BookData, recovered: RecoveredMap): RecoveryFillResult {
  const recBook = recovered[bookData.book];
  if (!recBook) return { data: bookData, filled: [], skipped: [] };
  const filled: string[] = [];
  const skipped: string[] = [];
  const chapters: Record<number, V205ChapterData> = { ...bookData.chapters };
  for (const [numStr, rec] of Object.entries(recBook.chapters)) {
    const num = parseInt(numStr, 10);
    const label = `${bookData.book} ${num}`;
    const current = chapters[num];
    if (!current || chapterBlockCount(current) > 0) {
      skipped.push(label);
      continue;
    }
    chapters[num] = {
      ...current,
      intro: rec.intro,
      previously: rec.previously,
      sections: rec.sections,
    };
    filled.push(label);
  }
  if (!filled.length) return { data: bookData, filled, skipped };
  return { data: { ...bookData, chapters }, filled, skipped };
}
