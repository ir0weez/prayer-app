// ─── v305 "Reading Progress" — pins ────────────────────────────────────────
// His asks (2026-10-28 10:12–10:15 PDT, Books screen screenshot):
// "I need some sort of progress bar for my reading. And a reset
// button for when I complete reading the entire Bible." Then:
// "Shouldn't there be some sort of progress bar for the books as
// well? That way I know what books I've read."
//
// The distinction these pins guard: the books screen's long-standing
// per-book bar follows his STUDY counts ("16 of 16 complete · notes
// in 16 chapters"). v305 is about READING — the v228 read track,
// StudyState.reads ("Book|chapter" -> ISO date) in the study store,
// written only through markChapterRead. His evidence: Leviticus
// shows "0 of 27 complete" while he is reading Leviticus 23 — so
// below, Leviticus carries 0 study completes and a reading count
// of 1, and the two never mix.
//
// Pins:
//  - the canon totals are DERIVED from CHAPTER_COUNTS: 66 books,
//    1,189 chapters — asserted, never hardcoded in the module;
//  - per-book read counts and the aggregate come from `reads` keys
//    alone; malformed keys (unknown book, out-of-range chapter)
//    count nothing, matching position.ts's readEvidence discipline;
//  - the reset empties `reads` and ONLY `reads` — overrides,
//    queues, currentBook and the lastRead stamp survive deep-equal,
//    and the input state is not mutated;
//  - the overall card and the per-book thread render their counts
//    (v325 re-base: the overall card is now the approved Study
//    progress header — Concept 3, Two Structured Rows — rendering
//    BOTH tracks; its full pin set lives in the v325 suite);
//  - the Books screen wires it all: header seated from
//    studyProgressTotals, the quiet door opening a confirmation
//    that names what clears and what stays, the confirm running
//    resetReadingProgress through load/save, and the study bar +
//    counts untouched.

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
  chapterReadDate,
  seedStudyState,
  setChapterRead,
  setChapterStatus,
  type StudyState,
} from '@/lib/bible-v205/study';
import {
  TOTAL_BIBLE_BOOKS,
  TOTAL_BIBLE_CHAPTERS,
  bookReadCount,
  readingTotals,
  resetReadingProgress,
} from '@/lib/bible-v205/reading-progress';
import { BookReadingThread, StudyProgressHeader } from '@/components/bible-v205/reading-progress-card';
import type { BiblePalette } from '@/components/bible-v205/palette';

const CANON = Object.keys(CHAPTER_COUNTS);

/** A fixture in HIS shape: Leviticus mid-read with zero study
 * completes, Mark fully read, study state and queues elsewhere. */
function fixtureState(): StudyState {
  let s = seedStudyState();
  s = setChapterRead(s, 'Genesis', 1, '2026-10-20');
  s = setChapterRead(s, 'Genesis', 2, '2026-10-20');
  s = setChapterRead(s, 'Genesis', 3, '2026-10-21');
  s = setChapterRead(s, 'Leviticus', 23, '2026-10-28');
  for (let c = 1; c <= 16; c++) s = setChapterRead(s, 'Mark', c, '2026-09-14');
  // Malformed marks a damaged store could carry — never counted.
  s = { ...s, reads: { ...s.reads, 'Narnia|1': '2026-01-01', 'Genesis|999': '2026-01-01', 'Genesis|0': '2026-01-01' } };
  // The study track, alive and separate: a Complete, a queue entry,
  // a current book, the position stamp.
  s = setChapterStatus(s, 'Mark', 1, 'complete');
  s = setChapterStatus(s, 'Colossians', 2, 'write');
  s = { ...s, currentBook: 'Leviticus', lastRead: { book: 'Mark', chapter: 16, date: '2026-09-14' } };
  return s;
}

const palette = {
  paper2: '#FFFFFF',
  ink: '#1A1020',
  inkSoft: '#6B5A72',
  line: '#D9CFE8',
  rasp: '#7C3AED',
  raspDeep: '#5B21B6',
  raspTint: '#EDE9FE',
  accentAmber: { bg: '#F7ECD7', deep: '#8A5A00', hue: '#D97706' },
  cardDress: {},
} as unknown as BiblePalette;

describe('v305 — the canon totals are derived, and they are 66 / 1,189', () => {
  it('derives the book and chapter totals from CHAPTER_COUNTS', () => {
    expect(TOTAL_BIBLE_BOOKS).toBe(66);
    expect(TOTAL_BIBLE_BOOKS).toBe(CANON.length);
    expect(TOTAL_BIBLE_CHAPTERS).toBe(1189);
    expect(TOTAL_BIBLE_CHAPTERS).toBe(Object.values(CHAPTER_COUNTS).reduce((a, b) => a + b, 0));
  });
});

describe('v305 — counts come from the read track alone', () => {
  it('counts per-book read marks, never study states', () => {
    const s = fixtureState();
    expect(bookReadCount(s, 'Genesis')).toBe(3);
    // His evidence, as a pin: Leviticus reads 1 with 0 completes —
    // the read count exists where the study count is zero.
    expect(bookReadCount(s, 'Leviticus')).toBe(1);
    expect(bookReadCount(s, 'Mark')).toBe(16);
    expect(bookReadCount(s, 'Exodus')).toBe(0);
    expect(bookReadCount(s, 'Colossians')).toBe(0);
    // The marks counted are the store's own: chapterReadDate agrees.
    expect(chapterReadDate(s, 'Leviticus', 23)).toBe('2026-10-28');
    expect(chapterReadDate(s, 'Leviticus', 24)).toBeNull();
  });

  it('ignores malformed read keys — unknown books and out-of-range chapters', () => {
    const s = fixtureState();
    // The fixture carries Narnia|1, Genesis|999 and Genesis|0:
    // Genesis still counts exactly its three real chapters.
    expect(bookReadCount(s, 'Genesis')).toBe(3);
    expect(bookReadCount(s, 'Narnia')).toBe(0);
  });

  it('aggregates: the sum over books is the total read, of 1,189', () => {
    const s = fixtureState();
    const t = readingTotals(s, CANON);
    expect(t.total).toBe(1189);
    expect(t.read).toBe(20);
    expect(t.perBook['Leviticus']).toBe(1);
    expect(t.perBook['Mark']).toBe(16);
    expect(Object.values(t.perBook).reduce((a, b) => a + b, 0)).toBe(t.read);
    expect(Object.keys(t.perBook)).toHaveLength(66);
  });

  it('an untouched state reads zero everywhere', () => {
    const t = readingTotals(seedStudyState(), CANON);
    expect(t.read).toBe(0);
    expect(t.total).toBe(1189);
  });
});

describe('v305 — the reset clears exactly the read store', () => {
  it('empties reads; notes, queues, current book and stamp survive untouched', () => {
    const s = fixtureState();
    const next = resetReadingProgress(s);
    expect(next.reads).toEqual({});
    expect(bookReadCount(next, 'Mark')).toBe(0);
    expect(readingTotals(next, CANON).read).toBe(0);
    // Everything that is NOT reading rides through deep-equal.
    expect(next.overrides).toEqual(s.overrides);
    expect(next.writeQueue).toEqual(s.writeQueue);
    expect(next.restudyQueue).toEqual(s.restudyQueue);
    expect(next.currentBook).toBe('Leviticus');
    expect(next.lastRead).toEqual({ book: 'Mark', chapter: 16, date: '2026-09-14' });
    // The input state is not mutated — the marks he had still stand
    // in the fixture, so a cancelled reset costs nothing.
    expect(bookReadCount(s, 'Mark')).toBe(16);
    expect(chapterReadDate(next, 'Leviticus', 23)).toBeNull();
  });
});

describe('v305 — the furniture renders its counts', () => {
  // v325 re-base: the v305 overall card ("Bible reading" + its lone
  // bar) is retired — the approved progress header renders both
  // tracks in its seat. The read track's rendering is pinned here
  // at the same fixtures; the header's full pin set is v325's.
  const progressOf = (readChapters: number) => ({
    totalBooks: 66,
    totalChapters: 1189,
    readChapters,
    readBooks: 0,
    writtenChapters: 0,
    writtenBooks: 0,
    chaptersToRead: 1189 - readChapters,
    chaptersToWrite: 1189,
  });

  it('the header’s READ row: numeral, of 1,189 chapters, percent, reset door', () => {
    const html = renderToString(
      React.createElement(StudyProgressHeader, { progress: progressOf(595), palette, onResetPress: () => {} }),
    );
    expect(html).toContain('READ');
    expect(html).toContain('595');
    expect(html).toContain('of 1,189 chapters');
    expect(html).toContain('50%');
    expect(html).toContain('Reset reading progress');
  });

  it('the header at zero reads 0 · 0%', () => {
    const html = renderToString(
      React.createElement(StudyProgressHeader, { progress: progressOf(0), palette, onResetPress: () => {} }),
    ).replace(/<!-- -->/g, '');
    expect(html).toContain('READ');
    expect(html).toContain('0%');
  });

  it('the per-book thread: empty, partial, and full all carry their count', () => {
    const empty = renderToString(React.createElement(BookReadingThread, { read: 0, total: 27, palette }));
    const part = renderToString(React.createElement(BookReadingThread, { read: 1, total: 27, palette }));
    const full = renderToString(React.createElement(BookReadingThread, { read: 16, total: 16, palette }));
    expect(empty).toContain('0 of 27 read');
    expect(part).toContain('1 of 27 read');
    expect(full).toContain('16 of 16 read');
  });
});

describe('v305 — the Books screen wiring (source pins)', () => {
  const screen = readFileSync(join(process.cwd(), 'app/bible-chapters.tsx'), 'utf8');

  it('the progress header is seated from the study aggregate over the canon (v325 re-base)', () => {
    // v305 seated the card from readingTotals; v325's header takes
    // BOTH tracks from studyProgressTotals (reads + the v324 union
    // written rule, imports included) — the read numbers the reset
    // governs still derive from the same StudyState.reads.
    expect(screen).toContain('studyProgressTotals(effectiveState, CANON, studioImports)');
    expect(screen).toContain('<StudyProgressHeader');
    expect(screen).toContain('progress={progress}');
    expect(screen).not.toContain('<ReadingProgressCard');
  });

  it('every book row carries the reading thread under its study thread', () => {
    expect(screen).toContain('bookReadCount(studyState, book)');
    expect(screen).toContain('<BookReadingThread read={readCount} total={total} palette={palette} />');
  });

  it('the study bar and its counts follow the written rule (v324: union count)', () => {
    // v313 re-base: the counts lead takes the drawing's word —
    // "written" (was "complete"); the bar itself is untouched.
    // v324 re-base: the lead count is no longer the stored-Complete
    // tally — it is the union count (stored Complete OR noted,
    // rewards.ts chapterIsWritten), feeding the same thread.
    // v341 re-base (his ruling, Oct 29: the wavy progress bar,
    // everywhere): the thread's fill is no longer a div painted
    // `backgroundColor: palette.rasp, width: ${pct}%` — it is the
    // shared WavyProgress wearing palette.rasp, fed the same
    // union-count pct (value={pct / 100}); the in-progress share
    // rides directly behind it as the wavy's trailing segment.
    // The counts promise above is untouched.
    expect(screen).toContain('parts.push(`${writtenCount} of ${total} written`)');
    expect(screen).toContain('value={pct / 100}');
    expect(screen).toContain('color={palette.rasp}');
    expect(screen).toContain('trailingValue={ppct / 100}');
  });

  it('the reset door only opens a confirmation that names what clears and what stays', () => {
    expect(screen).toContain('onResetPress={() => setResetOpen(true)}');
    expect(screen).toContain('Reset reading progress?');
    expect(screen).toContain('read mark will clear');
    expect(screen).toContain('study queue');
    expect(screen).toContain('>Reset reading<');
    expect(screen).toContain('>Cancel<');
  });

  it('the confirm runs the pure reset through the study store load/save', () => {
    expect(screen).toContain('const next = resetReadingProgress(fresh);');
    expect(screen).toContain('await saveStudyState(next);');
  });
});
