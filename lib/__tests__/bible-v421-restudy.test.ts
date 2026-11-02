// ─── v421 — the RESTUDY section on the Books list (his ask,
// Nov 2) ─────────────────────────────────────────────────────────
// "I want books marked as 'Restudy' to show up here too. Because
// some of these books I don't want to read for leisure, some I
// want to study my notes through again." The restudyQueue has
// lived in the study store since v205 and the Queue screen has
// always listed its chapters — but groupBooksByStudy never
// gathered its books, so a restudy book sat buried in Written or
// Finished. These pins hold the new section:
//   Restudy — every book with ≥1 chapter in restudyQueue, in
//             QUEUE order (first appearance), seated under
//             Current.
//   Precedence: CURRENT > RESTUDY > FINISHED > WRITTEN >
//             NOT STARTED — a restudy book leaves Finished /
//             Written / the progressed bucket; the MARKED
//             currentBook keeps its home (the v383 doctrine).
//   Empty queue — the section is empty and the other four groups
//             are exactly the v322/v383 result.
// Marking paths are untouched: chapters enter/leave the queue
// only through setChapterStatus (the chapter panel's door).

import { describe, expect, it } from 'vitest';
import { CHAPTER_COUNTS } from '../bible-v205/index';
import {
  chapterKey,
  seedStudyState,
  setChapterStatus,
  setCurrentBook,
  type StudyState,
} from '../bible-v205/study';
import { groupBooksByStudy, nextRestudyChapter } from '../bible-v205/rewards';

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

/** Every book in exactly one of the five sections, canon-complete. */
function expectOneHomeEach(groups: ReturnType<typeof groupBooksByStudy>) {
  const all = [
    ...groups.current,
    ...groups.restudy,
    ...groups.finished,
    ...groups.written,
    ...groups.notStarted,
  ];
  expect(all).toHaveLength(66);
  expect(new Set(all).size).toBe(66);
  expect([...all].sort()).toEqual([...canon].sort());
}

describe('v421 — Restudy section: grouping', () => {
  it('a fully-written book with a restudy chapter lands in Restudy, not Written', () => {
    const written = fullyWritten(seedStudyState(), 'Ruth');
    expect(groupBooksByStudy(written, canon).written).toContain('Ruth');

    const state = setChapterStatus(written, 'Ruth', 2, 'restudy');
    const groups = groupBooksByStudy(state, canon);
    expect(groups.restudy).toEqual(['Ruth']);
    expect(groups.written).not.toContain('Ruth');
    expect(groups.finished).not.toContain('Ruth');
    expect(groups.current).not.toContain('Ruth');
    expect(groups.notStarted).not.toContain('Ruth');
    expectOneHomeEach(groups);
  });

  it('a fully-read book with a restudy chapter lands in Restudy, not Finished', () => {
    const read = fullyRead(seedStudyState(), 'Obadiah');
    expect(groupBooksByStudy(read, canon).finished).toContain('Obadiah');

    const state = setChapterStatus(read, 'Obadiah', 1, 'restudy');
    const groups = groupBooksByStudy(state, canon);
    expect(groups.restudy).toEqual(['Obadiah']);
    expect(groups.finished).not.toContain('Obadiah');
    expect(groups.written).not.toContain('Obadiah');
    expect(groups.current).not.toContain('Obadiah');
    expectOneHomeEach(groups);
  });

  it('the marked Current book with restudy chapters stays in Current', () => {
    let state = setCurrentBook(seedStudyState(), 'Genesis');
    state = setChapterStatus(state, 'Genesis', 3, 'restudy');
    const groups = groupBooksByStudy(state, canon);
    expect(groups.current[0]).toBe('Genesis');
    expect(groups.restudy).not.toContain('Genesis');
    expect(groups.written).not.toContain('Genesis');
    expectOneHomeEach(groups);
  });

  it('a merely-progressed book with a restudy chapter leaves Current for Restudy', () => {
    let state = setChapterStatus(seedStudyState(), 'Nahum', 1, 'write');
    expect(groupBooksByStudy(state, canon).current).toContain('Nahum');

    state = setChapterStatus(state, 'Nahum', 2, 'restudy');
    const groups = groupBooksByStudy(state, canon);
    expect(groups.restudy).toEqual(['Nahum']);
    expect(groups.current).not.toContain('Nahum');
    expectOneHomeEach(groups);
  });

  it('an empty queue: no Restudy books, and the other groups are the pre-v421 result', () => {
    const groups = groupBooksByStudy(seedStudyState(), canon);
    expect(groups.restudy).toEqual([]);
    expect(groups.current).toEqual([]);
    expect(groups.finished).toEqual([]);
    expect(groups.written).toContain('Genesis');
    expect(groups.written).toContain('1 Corinthians');
    expect(groups.notStarted).not.toContain('Genesis');
    expectOneHomeEach(groups);
  });

  it('two queued books both surface, in queue order — not canonical order', () => {
    let state = seedStudyState();
    state = setChapterStatus(state, 'Isaiah', 3, 'restudy');
    state = setChapterStatus(state, 'Genesis', 5, 'restudy');
    const groups = groupBooksByStudy(state, canon);
    // Genesis precedes Isaiah in the canon; the QUEUE speaks.
    expect(groups.restudy).toEqual(['Isaiah', 'Genesis']);
    expect(groups.written).not.toContain('Isaiah');
    expect(groups.written).not.toContain('Genesis');
    expectOneHomeEach(groups);
  });
});

describe('v421 — nextRestudyChapter', () => {
  it('names the FIRST queued chapter for the book, in queue order', () => {
    let state = seedStudyState();
    state = setChapterStatus(state, 'Genesis', 5, 'restudy');
    state = setChapterStatus(state, 'Genesis', 2, 'restudy');
    expect(nextRestudyChapter(state, 'Genesis')).toBe(5);
  });

  it('is null for a book with nothing queued', () => {
    const state = setChapterStatus(seedStudyState(), 'Genesis', 5, 'restudy');
    expect(nextRestudyChapter(state, 'Exodus')).toBeNull();
    expect(nextRestudyChapter(seedStudyState(), 'Genesis')).toBeNull();
  });
});
