// ─── v325 — the Study progress header + the tally arithmetic ─────
// Part A (his pick, 2026-10-28 22:21): the Books page's overall
// card is the approved drawing's Concept 3 — "Two Structured Rows"
// (study-progress-concepts-v3.html): one tonal radius-24 card, the
// WRITTEN row over the READ row, each with its caps label, chapter
// numeral, right-side percentage and 6px thread at its exact share;
// the two-line footer (books written/read, then chapters remaining
// per channel); the quiet reset line under the card, still clearing
// ONLY reads. Every number derives live — totals from
// CHAPTER_COUNTS, reads from StudyState.reads, written from the
// v324 union rule over resolved data (studio imports included).
//
// Part B (his phone, 2026-10-28 21:54): Colossians read "1 of 4
// written · 4 to write" — five chapters accounted in a four-chapter
// book, because "written" followed the union rule while "to write"
// still counted Write-next stamps. The shared ledger
// (rewards.ts bookChapterTallies) makes toWrite the residual
// (total − written) and keeps in-progress / not-started from
// double-counting a union-written chapter. The invariant pinned
// below: for every book, written + toWrite == chapter count.

import React from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: async (k: string) => {
      store.delete(k);
    },
    getAllKeys: async () => [...store.keys()],
    multiGet: async (ks: string[]) => ks.map((k) => [k, store.get(k) ?? null]),
  },
}));

vi.mock('react-native', async () => {
  const rnw = await import('react-native-web');
  return {
    ...rnw,
    Platform: { OS: 'android', select: (o: any) => o.android ?? o.default },
  };
});

// v339: the study surfaces' threads are WavyProgress now, which
// draws through react-native-svg — a module this harness cannot
// execute (the v326 precedent). Stub it as RNW Views; the pins
// hold source + structure, never the svg internals.
vi.mock('react-native-svg', async () => {
  const React = await import('react');
  const { View } = await import('react-native-web');
  const Stub = (props: any) => React.createElement(View, props, props?.children);
  return {
    __esModule: true,
    default: Stub,
    Circle: Stub,
    ClipPath: Stub,
    Defs: Stub,
    G: Stub,
    LinearGradient: Stub,
    Path: Stub,
    Rect: Stub,
    Stop: Stub,
  };
});

import { CHAPTER_COUNTS } from '@/lib/bible-v205/index';
import {
  seedStudyState,
  setChapterRead,
  setChapterStatus,
  type StudyState,
} from '@/lib/bible-v205/study';
import { bookChapterTallies, bookWrittenCount, studyProgressTotals } from '@/lib/bible-v205/rewards';
import { resetReadingProgress } from '@/lib/bible-v205/reading-progress';
import {
  chapterHasNotes,
  studioImportKey,
  type StudioImportsMap,
} from '@/lib/bible-v205/studio-import';
import type { V205ChapterData } from '@/lib/bible-v205/types';
import { StudyProgressHeader } from '@/components/bible-v205/reading-progress-card';
import type { BiblePalette } from '@/components/bible-v205/palette';

const CANON = Object.keys(CHAPTER_COUNTS);
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

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

describe('v325 Part B — the shared tally ledger', () => {
  it('his Colossians: 1 noted chapter + Write-next stamps on all four reads "1 written · 3 to write", never 4', () => {
    let s = seedStudyState();
    for (let c = 1; c <= 4; c++) s = setChapterStatus(s, 'Colossians', c, 'write');
    const imports = importsFor('Colossians', [1]);
    const t = bookChapterTallies(s, 'Colossians', imports);
    expect(t.total).toBe(4);
    expect(t.written).toBe(1);
    expect(t.toWrite).toBe(3);
    expect(t.written + t.toWrite).toBe(t.total);
  });

  it('in-progress and not-started never double-count a union-written chapter', () => {
    let s = seedStudyState();
    // Colossians 1–2 carry notes through imports; their stored
    // pipeline states still say in-progress / not-started.
    s = setChapterStatus(s, 'Colossians', 1, 'in-progress');
    s = setChapterStatus(s, 'Colossians', 2, 'not-started');
    // Chapters 3–4 carry no notes: their states count honestly.
    s = setChapterStatus(s, 'Colossians', 3, 'in-progress');
    s = setChapterStatus(s, 'Colossians', 4, 'not-started');
    const imports = importsFor('Colossians', [1, 2]);
    const t = bookChapterTallies(s, 'Colossians', imports);
    expect(t.written).toBe(2);
    expect(t.toWrite).toBe(2);
    expect(t.inProgress).toBe(1);
    expect(t.notStarted).toBe(1);
  });

  it('the invariant holds for every book in canon — fresh state over the shipped data', () => {
    const seed = seedStudyState();
    for (const book of CANON) {
      const t = bookChapterTallies(seed, book);
      expect(t.total, book).toBe(CHAPTER_COUNTS[book]);
      expect(t.written + t.toWrite, book).toBe(t.total);
      expect(t.written, book).toBe(bookWrittenCount(seed, book));
      expect(t.inProgress + t.notStarted, book).toBeLessThanOrEqual(t.toWrite);
    }
  });

  it('the invariant holds under a mixed fixture — stamps, reads and imports across the canon', () => {
    let s = seedStudyState();
    for (const book of CANON) {
      const total = CHAPTER_COUNTS[book];
      s = setChapterStatus(s, book, 1, 'complete');
      if (total >= 2) s = setChapterStatus(s, book, 2, 'in-progress');
      if (total >= 3) s = setChapterStatus(s, book, 3, 'write');
      if (total >= 4) s = setChapterStatus(s, book, 4, 'not-started');
    }
    const imports: StudioImportsMap = {
      ...importsFor('Colossians', [2, 4]),
      ...importsFor('Leviticus', [2, 3]),
      ...importsFor('Psalms', [1, 2]),
    };
    for (const book of CANON) {
      const t = bookChapterTallies(s, book, imports);
      expect(t.written + t.toWrite, book).toBe(t.total);
      expect(t.inProgress + t.notStarted, book).toBeLessThanOrEqual(t.toWrite);
    }
    // The imported chapters moved OUT of the status tallies:
    // Colossians 2 was stamped in-progress and 4 not-started, but
    // both carry notes now, so neither tally may claim them.
    const col = bookChapterTallies(s, 'Colossians', imports);
    expect(col.inProgress).toBe(0);
    expect(col.notStarted).toBe(0);
  });

  it('both tally surfaces read from the one ledger (source pins)', () => {
    const chapters = read('app/bible-chapters.tsx');
    expect(chapters).toContain('bookChapterTallies(studyState ?? seedStudyState(), book, imports)');
    expect(chapters).toContain('if (toWrite) parts.push(`${toWrite} to write`)');
    const book = read('app/bible-book.tsx');
    expect(book).toContain('bookChapterTallies(studyState, book, studioImports).inProgress');
    expect(book).toContain('bookWrittenCount(studyState, book, studioImports)');
    expect(book).not.toContain("counts.get('in-progress')");
  });
});

describe('v325 Part A — the header totals derive live', () => {
  it('a two-book canon: reads from reads, written from the union (imports included), remainders as residuals', () => {
    let s = seedStudyState();
    // Reads: Colossians 1–2; Leviticus cover to cover.
    s = setChapterRead(s, 'Colossians', 1, '2026-10-28');
    s = setChapterRead(s, 'Colossians', 2, '2026-10-28');
    for (let c = 1; c <= 27; c++) s = setChapterRead(s, 'Leviticus', c, '2026-10-28');
    // Written by stamp: one chapter in each book.
    s = setChapterStatus(s, 'Colossians', 3, 'complete');
    s = setChapterStatus(s, 'Leviticus', 3, 'complete');
    // Written by notes (imports only — neither book ships data):
    // Colossians 1; Leviticus 1–2.
    const imports: StudioImportsMap = {
      ...importsFor('Colossians', [1]),
      ...importsFor('Leviticus', [1, 2]),
    };
    const t = studyProgressTotals(s, ['Colossians', 'Leviticus'], imports);
    expect(t.totalBooks).toBe(2);
    expect(t.totalChapters).toBe(31);
    expect(t.readChapters).toBe(29);
    expect(t.readBooks).toBe(1); // Leviticus only
    expect(t.writtenChapters).toBe(5); // Col 1 (notes) + 3 (stamp); Lev 1–2 (notes) + 3 (stamp)
    expect(t.writtenBooks).toBe(0);
    expect(t.chaptersToRead).toBe(2);
    expect(t.chaptersToWrite).toBe(26);
  });

  it('the full canon: totals are CHAPTER_COUNTS itself — 66 books, 1,189 chapters', () => {
    const t = studyProgressTotals(seedStudyState(), CANON);
    expect(t.totalBooks).toBe(66);
    expect(t.totalBooks).toBe(CANON.length);
    expect(t.totalChapters).toBe(1189);
    expect(t.totalChapters).toBe(Object.values(CHAPTER_COUNTS).reduce((a, b) => a + b, 0));
    expect(t.readChapters).toBe(0);
    expect(t.readBooks).toBe(0);
    expect(t.chaptersToRead).toBe(1189);
  });

  it('a fresh state’s written chapters equal the noted chapters in the resolved data, counted independently', () => {
    let noted = 0;
    let notedBooks = 0;
    for (const book of CANON) {
      let bookNoted = 0;
      for (let c = 1; c <= CHAPTER_COUNTS[book]; c++) {
        if (chapterHasNotes(book, c, {})) bookNoted += 1;
      }
      noted += bookNoted;
      if (bookNoted === CHAPTER_COUNTS[book]) notedBooks += 1;
    }
    const t = studyProgressTotals(seedStudyState(), CANON);
    expect(t.writtenChapters).toBe(noted);
    expect(t.writtenBooks).toBe(notedBooks);
    expect(t.writtenBooks).toBe(28); // the audited fully-noted set (v324)
    expect(t.chaptersToWrite).toBe(1189 - noted);
  });
});

const palette = {
  paper2: '#F3EEF9',
  ink: '#1A1020',
  inkSoft: '#6B5A72',
  line: '#D9CFE8',
  rasp: '#7C3AED',
  raspDeep: '#5B21B6',
  raspTint: '#EDE9FE',
  accentAmber: { bg: '#F7ECD7', deep: '#8A5A00', hue: '#D97706' },
  cardDress: {},
} as unknown as BiblePalette;

/** His numbers on the night (Books screenshot + the notes audit):
 * 496 of 1,189 written · 28 books; 96 of 1,189 read · 0 books. */
const hisProgress = {
  totalBooks: 66,
  totalChapters: 1189,
  readChapters: 96,
  readBooks: 0,
  writtenChapters: 496,
  writtenBooks: 28,
  chaptersToRead: 1093,
  chaptersToWrite: 693,
};

describe('v325 Part A — the header renders Concept 3', () => {
  const html = renderToString(
    React.createElement(StudyProgressHeader, { progress: hisProgress, palette, onResetPress: () => {} }),
  ).replace(/<!-- -->/g, '');

  it('two rows: WRITTEN over READ, each with its numeral, "of 1,189 chapters" and percentage', () => {
    const writtenAt = html.indexOf('WRITTEN');
    const readAt = html.indexOf('READ');
    expect(writtenAt).toBeGreaterThan(-1);
    expect(readAt).toBeGreaterThan(writtenAt);
    expect(html).toContain('496');
    expect(html).toContain('96');
    expect(html).toContain('of 1,189 chapters');
    expect(html).toContain('42%');
    expect(html).toContain('8%');
  });

  it('the footer carries both lines: books, then remainders', () => {
    expect(html).toContain('28 of 66 books written · 0 of 66 books read');
    expect(html).toContain('693 to write · 1,093 to read');
  });

  it('the reset line rides under the card', () => {
    expect(html).toContain('Reset reading progress');
  });

  it('the drawing’s measure is in the furniture (source pins): radius 24, 26px numerals, shares derived; the header threads wavy, the per-book thread straight again (v342)', () => {
    const src = read('components/bible-v205/reading-progress-card.tsx');
    expect(src).toContain('progressCardRadius: { borderRadius: 24 }');
    expect(src).toContain('progressNumber: { fontSize: 26');
    expect(src).toContain('const share = total ? (100 * count) / total : 0');
    // v339: the header's straight 6px threads became WavyProgress
    // fills in the same colours — the share still derives exactly
    // as drawn. v342: they stay wavy ("the top ones" — his 14:46
    // ruling); the PER-BOOK reading thread below them is straight
    // again (next pin).
    expect(src).toContain('<WavyProgress value={share / 100} color={fillColor} trackColor={trackColor} height={8} />');
    expect(src).toContain('backgroundColor: palette.raspDeep, width: `${barPct}%`');
    expect(src).not.toContain('<WavyProgress value={barPct}');
    // Exactly two structured rows — no third track sneaks in.
    expect(src.match(/<StudyProgressRow/g)).toHaveLength(2);
    // The header takes its colours from palette roles, never pins:
    // written from the derived accent family, read from the seed.
    expect(src).toContain('const writtenTone = palette.accentAmber');
    expect(src).toContain('fillColor={palette.rasp}');
    expect(src).not.toContain('#1E3A5F');
  });
});

describe('v325 — the Books screen seats the header, and the reset still clears only reads', () => {
  it('the screen derives the header from the aggregate and retires the old card (source pins)', () => {
    const screen = read('app/bible-chapters.tsx');
    expect(screen).toContain('studyProgressTotals(effectiveState, CANON, studioImports)');
    expect(screen).toContain('<StudyProgressHeader');
    expect(screen).toContain('progress={progress}');
    expect(screen).not.toContain('<ReadingProgressCard');
    expect(screen).not.toContain('readingTotals(effectiveState, CANON)');
  });

  it('resetReadingProgress on a written-and-read state empties reads and keeps every written fact', () => {
    let s = seedStudyState();
    s = setChapterStatus(s, 'Colossians', 1, 'complete');
    s = setChapterRead(s, 'Colossians', 1, '2026-10-28');
    s = setChapterRead(s, 'Leviticus', 23, '2026-10-28');
    const before = studyProgressTotals(s, CANON);
    const next = resetReadingProgress(s);
    const after = studyProgressTotals(next, CANON);
    expect(after.readChapters).toBe(0);
    expect(after.readBooks).toBe(0);
    expect(after.writtenChapters).toBe(before.writtenChapters);
    expect(after.writtenBooks).toBe(before.writtenBooks);
    expect(next).not.toBe(s);
  });
});
