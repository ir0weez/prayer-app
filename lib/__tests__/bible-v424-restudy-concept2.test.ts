// ─── v424 — Restudy × Reading, Concept 2 (his pick, Nov 2) ──────
// "I want to restudy Genesis later, but I want to read through
// Genesis now." The v421 Restudy SECTION made the two tracks
// fight: a fully-written book with queued chapters was evicted
// into Restudy and out of its reading/writing home. His ruling:
// reading and restudy are separate tracks that coexist. These
// pins hold the Concept 2 settlement:
//   Grouping — groupBooksByStudy is the four sections of
//             v322/v383 again (Current / Finished / Written /
//             Not Started); a queued book keeps the home its
//             reading/writing state earns, and grouping never
//             consumes the queue.
//   The card — restudyQueueSummary is the queue card's whole
//             model: null on an empty queue (no card renders),
//             else the queue's HEAD as next (queue order), the
//             DISTINCT book count, and the line fully worded
//             with its singular/plural rule.
//   Coexistence — a read mark never moves a chapter out of the
//             restudy queue, and queueing a chapter never clears
//             its read mark. He can read Genesis end to end
//             while Genesis 1 waits in the queue.
// Marking paths are untouched: chapters still enter/leave the
// queue only through setChapterStatus (the chapter panel's door).

import { describe, expect, it } from 'vitest';
import { CHAPTER_COUNTS } from '../bible-v205/index';
import {
  chapterKey,
  chapterReadDate,
  seedStudyState,
  setChapterRead,
  setChapterStatus,
  setCurrentBook,
  type StudyState,
} from '../bible-v205/study';
import { bookReadCount } from '../bible-v205/reading-progress';
import { groupBooksByStudy, restudyQueueSummary } from '../bible-v205/rewards';

const canon = Object.keys(CHAPTER_COUNTS);

/** Every chapter of `book` marked Complete on the writing track. */
function fullyWritten(state: StudyState, book: string): StudyState {
  let s = state;
  for (let c = 1; c <= (CHAPTER_COUNTS[book] ?? 0); c++) {
    s = setChapterStatus(s, book, c, 'complete');
  }
  return s;
}

/** Every chapter of `book` carrying a read mark (the v305 track). */
function fullyRead(state: StudyState, book: string): StudyState {
  const reads = { ...state.reads };
  for (let c = 1; c <= (CHAPTER_COUNTS[book] ?? 0); c++) {
    reads[chapterKey(book, c)] = '2026-11-02';
  }
  return { ...state, reads };
}

/** The first `n` chapters of `book` carrying a read mark. */
function readChapters(state: StudyState, book: string, n: number): StudyState {
  let s = state;
  for (let c = 1; c <= n; c++) s = setChapterRead(s, book, c, '2026-11-02');
  return s;
}

/** Every book in exactly one of the four sections, canon-complete. */
function expectOneHomeEach(groups: ReturnType<typeof groupBooksByStudy>) {
  const all = [
    ...groups.current,
    ...groups.finished,
    ...groups.written,
    ...groups.notStarted,
  ];
  expect(all).toHaveLength(66);
  expect(new Set(all).size).toBe(66);
  expect([...all].sort()).toEqual([...canon].sort());
}

describe('v424 — grouping: the queue no longer evicts a book', () => {
  it('the grouping has exactly the four sections — there is no restudy home', () => {
    const groups = groupBooksByStudy(seedStudyState(), canon);
    expect(Object.keys(groups).sort()).toEqual(['current', 'finished', 'notStarted', 'written']);
    expectOneHomeEach(groups);
  });

  it("his Genesis: fully written, chapter 1 queued, a read-through under way — it files as Written", () => {
    let state = fullyWritten(seedStudyState(), 'Genesis');
    state = setChapterStatus(state, 'Genesis', 1, 'restudy');
    state = readChapters(state, 'Genesis', 5);
    const groups = groupBooksByStudy(state, canon);
    expect(groups.written).toContain('Genesis');
    expect(groups.finished).not.toContain('Genesis');
    expect(groups.current).not.toContain('Genesis');
    expect(groups.notStarted).not.toContain('Genesis');
    // Grouping reads the queue; it does not consume it.
    expect(state.restudyQueue).toEqual([{ book: 'Genesis', chapter: 1 }]);
    expectOneHomeEach(groups);
  });

  it('a queued book with NO reads at all files as Written', () => {
    let state = fullyWritten(seedStudyState(), 'Genesis');
    state = setChapterStatus(state, 'Genesis', 3, 'restudy');
    const groups = groupBooksByStudy(state, canon);
    expect(groups.written).toContain('Genesis');
    expect(groups.finished).not.toContain('Genesis');
    expectOneHomeEach(groups);
  });

  it('a fully-read book with a restudy chapter files as Finished, not out', () => {
    const read = fullyRead(seedStudyState(), 'Obadiah');
    const state = setChapterStatus(read, 'Obadiah', 1, 'restudy');
    const groups = groupBooksByStudy(state, canon);
    expect(groups.finished).toContain('Obadiah');
    expect(groups.written).not.toContain('Obadiah');
    expect(groups.current).not.toContain('Obadiah');
    expectOneHomeEach(groups);
  });

  it('a merely-progressed book with a restudy chapter stays in Current (the pre-v421 seat)', () => {
    let state = setChapterStatus(seedStudyState(), 'Nahum', 1, 'write');
    state = setChapterStatus(state, 'Nahum', 2, 'restudy');
    const groups = groupBooksByStudy(state, canon);
    expect(groups.current).toContain('Nahum');
    expectOneHomeEach(groups);
  });

  it('the marked Current book with restudy chapters stays in Current, first', () => {
    let state = setCurrentBook(seedStudyState(), 'Genesis');
    state = setChapterStatus(state, 'Genesis', 3, 'restudy');
    const groups = groupBooksByStudy(state, canon);
    expect(groups.current[0]).toBe('Genesis');
    expect(groups.written).not.toContain('Genesis');
    expectOneHomeEach(groups);
  });

  it('an empty queue: the groups are exactly the pre-v421 result', () => {
    const groups = groupBooksByStudy(seedStudyState(), canon);
    expect(groups.current).toEqual([]);
    expect(groups.finished).toEqual([]);
    expect(groups.written).toContain('Genesis');
    expect(groups.written).toContain('1 Corinthians');
    expect(groups.notStarted).not.toContain('Genesis');
    expectOneHomeEach(groups);
  });
});

describe('v424 — restudyQueueSummary: the queue card model', () => {
  it('an empty queue yields null — the card does not render', () => {
    expect(restudyQueueSummary(seedStudyState())).toBeNull();
  });

  it('next is the queue HEAD, in queue order — not chapter order', () => {
    let state = seedStudyState();
    state = setChapterStatus(state, 'Genesis', 5, 'restudy');
    state = setChapterStatus(state, 'Genesis', 2, 'restudy');
    const summary = restudyQueueSummary(state);
    expect(summary?.next).toEqual({ book: 'Genesis', chapter: 5 });
    expect(summary?.line).toBe('Genesis · Chapter 5 is next — 1 book waiting');
  });

  it('the count is DISTINCT books, however many chapters each carries', () => {
    let state = seedStudyState();
    state = setChapterStatus(state, 'Genesis', 5, 'restudy');
    state = setChapterStatus(state, 'Genesis', 2, 'restudy');
    state = setChapterStatus(state, 'Genesis', 9, 'restudy');
    state = setChapterStatus(state, 'Ruth', 1, 'restudy');
    const summary = restudyQueueSummary(state);
    expect(summary?.bookCount).toBe(2);
    // Several Genesis chapters wait; the line names only the next.
    expect(summary?.line).toBe('Genesis · Chapter 5 is next — 2 books waiting');
    expect(summary?.line).not.toContain('Chapter 2');
  });

  it('one waiting book takes the singular', () => {
    const state = setChapterStatus(seedStudyState(), 'Ruth', 1, 'restudy');
    expect(restudyQueueSummary(state)?.line).toBe('Ruth · Chapter 1 is next — 1 book waiting');
  });
});

describe('v424 — the two tracks coexist', () => {
  it('marking a queued chapter read leaves it in the queue', () => {
    let state = setChapterStatus(seedStudyState(), 'Genesis', 1, 'restudy');
    const queueBefore = state.restudyQueue;
    state = setChapterRead(state, 'Genesis', 1, '2026-11-02');
    expect(state.restudyQueue).toEqual(queueBefore);
    expect(chapterReadDate(state, 'Genesis', 1)).toBe('2026-11-02');
    expect(bookReadCount(state, 'Genesis')).toBe(1);
  });

  it('queueing a read chapter for restudy leaves its read mark standing', () => {
    let state = setChapterRead(seedStudyState(), 'Genesis', 1, '2026-11-02');
    state = setChapterStatus(state, 'Genesis', 1, 'restudy');
    expect(chapterReadDate(state, 'Genesis', 1)).toBe('2026-11-02');
    expect(state.restudyQueue).toEqual([{ book: 'Genesis', chapter: 1 }]);
  });

  it('reading Genesis end to end while chapter 1 waits: Finished, and the queue intact', () => {
    let state = fullyWritten(seedStudyState(), 'Genesis');
    state = setChapterStatus(state, 'Genesis', 1, 'restudy');
    state = fullyRead(state, 'Genesis');
    const groups = groupBooksByStudy(state, canon);
    expect(groups.finished).toContain('Genesis');
    expect(state.restudyQueue).toEqual([{ book: 'Genesis', chapter: 1 }]);
    expect(restudyQueueSummary(state)?.line).toBe('Genesis · Chapter 1 is next — 1 book waiting');
    expectOneHomeEach(groups);
  });
});
