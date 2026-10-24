// ─── reMarkable transcription fill ───────────────────────────────────────────
// Psalms 1–28, Matthew 1–2, Exodus 1–3 and Ezekiel 1 were never typed
// into the per-book txts the v205 data is generated from — they lived
// only as per-chapter PDF exports of Jonathan's reMarkable notebooks.
// The transcription (2026-10-24) parsed those PDFs (typed renders with
// a faithful text layer, verified verbatim page-by-page; the ~90
// spelling fixes he authorized are already applied) into full
// V205ChapterData chapter objects, staged under
// goals/prayercircle-apk-build/hidden_files/pdf-transcription/.
//
// This module is the GENERATOR's half of that transcription: scripts/
// build-bible-v205.ts runs applyTranscriptionFill after the txt +
// Notion + recovery stages, so a regeneration can never silently drop
// the transcribed chapters again. The discipline mirrors the
// Full_Commentary recovery's, widened for books the txt set never
// carried at all:
//   - a book absent from the generation is CREATED from the staging;
//   - a staged chapter absent from the book is inserted whole
//     (intro / previously / sections / stories, as staged);
//   - a staged chapter whose generated twin carries ZERO blocks takes
//     the staging's intro / previously / sections, exactly like the
//     recovery fill — his blank Exodus setups land this way;
//   - a staged chapter whose generated twin already carries blocks is
//     a CONFLICT: it is never overwritten, and the generator aborts
//     loudly rather than choosing between two of his texts.

import { chapterBlockCount } from './recovery';
import { displayName } from './parse';
import type { V205BookData, V205ChapterData } from './types';

/** Staged chapters for one book, keyed by chapter number as a string —
 * the pdf-transcription staging modules' shape. */
export type TranscribedBook = Record<string, V205ChapterData>;

/** Book name → staged chapters (the staging folder's four modules). */
export type TranscribedMap = Record<string, TranscribedBook>;

export interface TranscriptionFillResult {
  data: V205BookData;
  /** True when the book did not exist in the generation at all. */
  created: boolean;
  /** "Book N" for each chapter the transcription landed. */
  filled: string[];
  /** "Book N" for each staged chapter whose generated twin already
   * carries blocks — reported, never overwritten. */
  conflicts: string[];
}

/**
 * Pure: land one book's transcribed chapters. `existing` is the
 * generated book, or undefined when the txt set never carried the
 * book (Psalms / Matthew / Exodus / Ezekiel today) — then the book
 * is created empty and every staged chapter is inserted whole.
 */
export function applyTranscriptionFill(
  existing: V205BookData | undefined,
  book: string,
  transcribed: TranscribedMap,
): TranscriptionFillResult | null {
  const staged = transcribed[book];
  if (!staged) return null;
  const created = !existing;
  const base: V205BookData = existing ?? { book, display: displayName(book), chapters: {} };
  const filled: string[] = [];
  const conflicts: string[] = [];
  const chapters: Record<number, V205ChapterData> = { ...base.chapters };
  for (const [numStr, stageCh] of Object.entries(staged)) {
    const num = parseInt(numStr, 10);
    const label = `${book} ${num}`;
    const current = chapters[num];
    if (!current) {
      chapters[num] = stageCh;
      filled.push(label);
      continue;
    }
    if (chapterBlockCount(current) > 0) {
      conflicts.push(label);
      continue;
    }
    chapters[num] = {
      ...current,
      intro: stageCh.intro,
      previously: stageCh.previously,
      sections: stageCh.sections,
    };
    filled.push(label);
  }
  return { data: { ...base, chapters }, created, filled, conflicts };
}
