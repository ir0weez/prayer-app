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
//  - the overall card and the per-book thread render their counts;
//  - the Books screen wires it all: card seated from readingTotals,
//    the quiet door opening a confirmation that names what clears
//    and what stays, the confirm running resetReadingProgress
//    through load/save, and the study bar + counts untouched.

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
import { BookReadingThread, ReadingProgressCard } from '@/components/bible-v205/reading-progress-card';
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
  rasp: '#7C3AED',
  raspDeep: '#5B21B6',
  raspTint: '#EDE9FE',
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
  it('the overall card: label, N of 1,189 chapters read, percent, reset door', () => {
    const html = renderToString(
      React.createElement(ReadingProgressCard, { read: 595, total: 1189, palette, onResetPress: () => {} }),
    );
    expect(html).toContain('Bible reading');
    expect(html).toContain('595 of 1,189 chapters read · 50%');
    expect(html).toContain('Reset reading progress');
  });

  it('the overall card at zero reads 0 of 1,189 · 0%', () => {
    const html = renderToString(
      React.createElement(ReadingProgressCard, { read: 0, total: 1189, palette, onResetPress: () => {} }),
    );
    expect(html).toContain('0 of 1,189 chapters read · 0%');
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

  it('the overall card is seated from the reading aggregate over the canon', () => {
    expect(screen).toContain('readingTotals(effectiveState, CANON)');
    expect(screen).toContain('<ReadingProgressCard');
    expect(screen).toContain('read={reading.read}');
    expect(screen).toContain('total={reading.total}');
  });

  it('every book row carries the reading thread under its study thread', () => {
    expect(screen).toContain('bookReadCount(studyState, book)');
    expect(screen).toContain('<BookReadingThread read={readCount} total={total} palette={palette} />');
  });

  it('the study bar and its counts are unchanged', () => {
    expect(screen).toContain('parts.push(`${complete} of ${total} complete`)');
    expect(screen).toContain('backgroundColor: palette.rasp, width: `${pct}%`');
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
