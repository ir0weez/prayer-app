// ─── v324 — Written counts the notes, not just the stamp ──────────
// His words (2026-10-28 21:00): "I have multiple entire books
// finished with notes." The audit behind them: the shipped
// commentary data carries whole books noted cover to cover whose
// chapters never received the stored Complete status — that status
// is Studio-pipeline bookkeeping, stamped only on Genesis,
// Deuteronomy and Joshua. v322's Written section listened to the
// stamp alone, so the other fully-written books sat in Not Started
// at "0 of N written" while their own rows admitted "notes in N
// chapters". Under his model (2026-10-24) a Complete claim is a
// claim about NOTES, so v324 unifies membership and counts on one
// per-chapter rule (rewards.ts chapterIsWritten): a chapter counts
// as written when its stored status is 'complete' OR the resolved
// chapter data (shipped + studio imports) carries his notes.
// Finished (fully read) still outranks Written; the XP finish
// rules are untouched.

import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { CHAPTER_COUNTS, COMMENTARY_DATA, getChapterData } from '../bible-v205/index';
import {
  chapterKey,
  seedStudyState,
  setChapterStatus,
  type StudyState,
} from '../bible-v205/study';
import {
  bookIsWritten,
  bookWrittenCount,
  chapterIsWritten,
  groupBooksByStudy,
} from '../bible-v205/rewards';
import {
  chapterDataHasNotes,
  chapterHasNotes,
  studioImportKey,
  type StudioImportsMap,
} from '../bible-v205/studio-import';
import type { V205ChapterData } from '../bible-v205/types';

const canon = Object.keys(CHAPTER_COUNTS);

/** Books noted cover to cover in the SHIPPED commentary data —
 * derived by audit (2026-10-28) from COMMENTARY_DATA via
 * chapterDataHasNotes, and pinned here so a data change that
 * alters the set fails loudly instead of silently re-seating a
 * book. (On Jonathan's phone the resolved set is larger:
 * Leviticus joins via studio imports — pinned separately below.) */
const FULLY_NOTED_SHIPPED = [
  'Genesis',
  'Deuteronomy',
  'Joshua',
  'Ruth',
  '1 Samuel',
  '2 Samuel',
  '1 Kings',
  '2 Kings',
  'Proverbs',
  'Song of Solomon',
  'Isaiah',
  'Obadiah',
  'Jonah',
  'Mark',
  'Acts',
  '1 Corinthians',
  '2 Corinthians',
  'Ephesians',
  'Philippians',
  'Hebrews',
  'James',
  '1 Peter',
  '2 Peter',
  '1 John',
  '2 John',
  '3 John',
  'Jude',
  'Revelation',
];

function fullyRead(state: StudyState, book: string): StudyState {
  const reads = { ...state.reads };
  for (let c = 1; c <= (CHAPTER_COUNTS[book] ?? 0); c++) {
    reads[chapterKey(book, c)] = '2026-10-28';
  }
  return { ...state, reads };
}

/** A minimal chapter payload carrying one real note (blocks > 0). */
function notedChapterData(chapter: number): V205ChapterData {
  return {
    chapter,
    intro: [],
    previously: [],
    outline: [],
    sections: [
      {
        start: 1,
        end: 1,
        title: null,
        entries: [{ start: 1, end: 1, blocks: [{ kind: 'para', text: 'His own note.' }] }],
      },
    ],
    stories: [],
  };
}

function importsFor(book: string, chapters: number[]): StudioImportsMap {
  const map: StudioImportsMap = {};
  for (const c of chapters) map[studioImportKey(book, c)] = notedChapterData(c);
  return map;
}

describe('v324 — the fully-noted predicate over the shipped data', () => {
  it('the shipped-data fully-noted set is exactly the audited list', () => {
    const computed = canon.filter((book) => {
      const total = CHAPTER_COUNTS[book];
      for (let c = 1; c <= total; c++) {
        if (!chapterDataHasNotes(getChapterData(book, c))) return false;
      }
      return total > 0;
    });
    expect(computed).toEqual(FULLY_NOTED_SHIPPED);
    // The data layer the predicate reads is the same one the page
    // resolves — COMMENTARY_DATA itself.
    for (const book of FULLY_NOTED_SHIPPED) expect(book in COMMENTARY_DATA).toBe(true);
  });

  it('every fully-noted shipped book satisfies bookIsWritten with an untouched state', () => {
    const seed = seedStudyState();
    for (const book of FULLY_NOTED_SHIPPED) {
      expect(bookIsWritten(seed, book), book).toBe(true);
      expect(bookWrittenCount(seed, book), book).toBe(CHAPTER_COUNTS[book]);
    }
  });

  it('Exodus does not: its bundled file is a skeleton — 0 of 40 noted, 0 written', () => {
    const seed = seedStudyState();
    for (let c = 1; c <= CHAPTER_COUNTS['Exodus']; c++) {
      expect(chapterDataHasNotes(getChapterData('Exodus', c))).toBe(false);
    }
    expect(bookWrittenCount(seed, 'Exodus')).toBe(0);
    expect(bookIsWritten(seed, 'Exodus')).toBe(false);
  });
});

describe('v324 — Written section membership follows the notes', () => {
  it('the 1 Corinthians shape — fully noted, zero statuses, zero reads — lands in Written', () => {
    const seed = seedStudyState();
    expect(bookWrittenCount(seed, '1 Corinthians')).toBe(16);
    const groups = groupBooksByStudy(seed, canon);
    expect(groups.written).toContain('1 Corinthians');
    expect(groups.finished).not.toContain('1 Corinthians');
    expect(groups.notStarted).not.toContain('1 Corinthians');
    expect(groups.current).not.toContain('1 Corinthians');
  });

  it('a fresh state seats exactly the fully-noted shipped books in Written, 66 books exactly once', () => {
    const groups = groupBooksByStudy(seedStudyState(), canon);
    expect(groups.written).toEqual(FULLY_NOTED_SHIPPED);
    expect(groups.finished).toEqual([]);
    const all = [...groups.current, ...groups.finished, ...groups.written, ...groups.notStarted];
    expect(all).toHaveLength(66);
    expect(new Set(all).size).toBe(66);
    expect([...all].sort()).toEqual([...canon].sort());
  });

  it('a fully noted AND fully read book lands in Finished only (Finished outranks Written)', () => {
    let state = seedStudyState();
    state = fullyRead(state, 'Jonah');
    const groups = groupBooksByStudy(state, canon);
    expect(groups.finished).toContain('Jonah');
    expect(groups.written).not.toContain('Jonah');
  });

  it('Leviticus — no bundled file — lands in Written when the imports carry every chapter', () => {
    const seed = seedStudyState();
    const all27 = Array.from({ length: CHAPTER_COUNTS['Leviticus'] }, (_, i) => i + 1);
    const imports = importsFor('Leviticus', all27);
    expect(chapterHasNotes('Leviticus', 1, {})).toBe(false);
    expect(bookWrittenCount(seed, 'Leviticus', imports)).toBe(27);
    const groups = groupBooksByStudy(seed, canon, imports);
    expect(groups.written).toContain('Leviticus');
    expect(groups.notStarted).not.toContain('Leviticus');
  });

  it('the union is per chapter: imports for 26 chapters + a Complete stamp on the 27th still makes the book Written', () => {
    let state = seedStudyState();
    const first26 = Array.from({ length: 26 }, (_, i) => i + 1);
    const imports = importsFor('Leviticus', first26);
    state = setChapterStatus(state, 'Leviticus', 27, 'complete');
    expect(chapterIsWritten(state, 'Leviticus', 1, imports)).toBe(true); // by notes
    expect(chapterIsWritten(state, 'Leviticus', 27, imports)).toBe(true); // by stamp
    expect(bookIsWritten(state, 'Leviticus', imports)).toBe(true);
    const groups = groupBooksByStudy(state, canon, imports);
    expect(groups.written).toContain('Leviticus');
  });
});

describe('v324 — count and membership agree', () => {
  it('a partially noted book lands in neither section, and its written count is noted ∪ complete', () => {
    // Psalms: some chapters noted in the shipped data, most not.
    const seed = seedStudyState();
    const total = CHAPTER_COUNTS['Psalms'];
    let noted = 0;
    let firstUnnoted = 0;
    for (let c = 1; c <= total; c++) {
      if (chapterHasNotes('Psalms', c, {})) noted++;
      else if (!firstUnnoted) firstUnnoted = c;
    }
    expect(noted).toBeGreaterThan(0);
    expect(noted).toBeLessThan(total);
    expect(firstUnnoted).toBeGreaterThan(0);
    expect(bookWrittenCount(seed, 'Psalms')).toBe(noted);
    // One more chapter written the other way — a Complete stamp on
    // an unnoted chapter — joins the same count.
    const stamped = setChapterStatus(seed, 'Psalms', firstUnnoted, 'complete');
    expect(bookWrittenCount(stamped, 'Psalms')).toBe(noted + 1);
    const groups = groupBooksByStudy(stamped, canon);
    expect(groups.finished).not.toContain('Psalms');
    expect(groups.written).not.toContain('Psalms');
  });

  it('for every book in canon: written count == chapter count ⟺ the book sits in Written (fresh state)', () => {
    const seed = seedStudyState();
    const groups = groupBooksByStudy(seed, canon);
    for (const book of canon) {
      const fullCount = bookWrittenCount(seed, book) === CHAPTER_COUNTS[book];
      expect(fullCount, book).toBe(groups.written.includes(book));
    }
  });
});

describe('v324 — the screens carry the unified count', () => {
  it('Books screen: grouping and rows resolve against the loaded imports', () => {
    const src = readFileSync(join(process.cwd(), 'app', 'bible-chapters.tsx'), 'utf8');
    expect(src).toContain('loadStudioImports');
    expect(src).toContain('groupBooksByStudy(effectiveState, CANON, studioImports)');
    // v325 re-base: the row's written count (and every sibling
    // tally) comes from the shared ledger, whose per-chapter rule
    // is this same chapterIsWritten union over the imports.
    expect(src).toContain('bookChapterTallies(studyState ?? seedStudyState(), book, imports)');
    expect(src).toContain('`${writtenCount} of ${total} written`');
  });

  it('Book page: the countline’s written number is the union count, display marks untouched', () => {
    const src = readFileSync(join(process.cwd(), 'app', 'bible-book.tsx'), 'utf8');
    expect(src).toContain('{writtenCount} written');
    expect(src).toContain("chapterHasNotes(book, c, studioImports)");
    expect(src).toContain('chapterDisplayMarks');
  });
});
