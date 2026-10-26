// ─── v253 — the reading position follows the READ track ─────────────────────
// His report (Oct 25, on v251): "I just finished and marked
// Leviticus 20 and it still shows Leviticus 1" — and the Last read
// line still said Leviticus 19 · Oct 24 though he had read ch. 20
// that day, minutes before. Root cause: getReadingPosition derived
// the position from the NOTES track alone (chapterStatus scan +
// the stamp a notes-Complete transition writes) and never opened
// state.reads — so Mark as Read (v228) moved nothing on the card,
// and with a Current book set the notes scan stopped at the first
// chapter with no in-app notes-Complete override: Chapter 1.
// These pins reproduce his exact shape and the neighboring ones.

import { describe, expect, it } from 'vitest';
import { getReadingPosition, personalStudyHeadline, readingPositionDisplay } from '../bible-v205/position';
import {
  chapterStatus,
  seedStudyState,
  setChapterRead,
  setChapterStatus,
  setCurrentBook,
  type StudyState,
} from '../bible-v205/study';

/** His device shape, Oct 25 before he marked ch. 20: Leviticus
 * chosen Current in the Books view; reads 1–19 in the v228 store
 * (dated on or before Oct 24, via the studio desk reads); the
 * position stamp still holding the last NOTES transition
 * (Leviticus 19, Oct 24); and NO in-app notes-Complete override
 * for Leviticus 1 — his writing record lives in the studio. */
function hisShape(): StudyState {
  let state = seedStudyState();
  state = setCurrentBook(state, 'Leviticus');
  for (let c = 1; c <= 19; c++) {
    state = setChapterRead(state, 'Leviticus', c, c === 19 ? '2026-10-24' : c % 2 === 0 ? '2026-10-23' : '2026-10-22');
  }
  state = { ...state, lastRead: { book: 'Leviticus', chapter: 19, date: '2026-10-24' } };
  return state;
}

describe('v253 — his exact shape: Leviticus reads 1–19, then ch. 20 marked today', () => {
  it('the old notes scan premise holds — Leviticus 1 has no notes state (why the headline fell to 1)', () => {
    const state = hisShape();
    expect(chapterStatus(state, 'Leviticus', 1)).toBe('none');
    expect(chapterStatus(state, 'Leviticus', 20)).toBe('none');
  });

  it('before today’s mark: target is 20 and lastRead is the read frontier, not the stamp', () => {
    const position = getReadingPosition(hisShape());
    expect(position.currentBook).toBe('Leviticus');
    expect(position.target).toEqual({ book: 'Leviticus', chapter: 20 });
    expect(position.lastRead).toEqual({ book: 'Leviticus', chapter: 19, date: '2026-10-24' });
  });

  it('marking ch. 20 read (the reader’s Mark as Read write) advances BOTH outputs', () => {
    const marked = setChapterRead(hisShape(), 'Leviticus', 20, '2026-10-25');
    const position = getReadingPosition(marked);
    // Last read = Leviticus 20 · Oct 25 — the newest read, not the
    // Oct 24 notes stamp.
    expect(position.lastRead).toEqual({ book: 'Leviticus', chapter: 20, date: '2026-10-25' });
    // Current target = Leviticus 21.
    expect(position.target).toEqual({ book: 'Leviticus', chapter: 21 });
    expect(personalStudyHeadline(position, '77 chapters complete')).toBe('Leviticus · Chapter 21');
    expect(readingPositionDisplay(position)).toBe('Leviticus 21');
  });

  it('the same shape with NO Current book chosen resolves identically', () => {
    const noCurrent: StudyState = { ...hisShape(), currentBook: null };
    const marked = setChapterRead(noCurrent, 'Leviticus', 20, '2026-10-25');
    const position = getReadingPosition(marked);
    expect(position.lastRead).toEqual({ book: 'Leviticus', chapter: 20, date: '2026-10-25' });
    expect(position.target).toEqual({ book: 'Leviticus', chapter: 21 });
  });

  it('monotone: marking any further chapter read never moves the target backward', () => {
    let state = setChapterRead(hisShape(), 'Leviticus', 20, '2026-10-25');
    expect(getReadingPosition(state).target).toEqual({ book: 'Leviticus', chapter: 21 });
    // Re-marking an earlier chapter (a re-read) changes nothing.
    state = setChapterRead(state, 'Leviticus', 5, '2026-10-25');
    expect(getReadingPosition(state).target).toEqual({ book: 'Leviticus', chapter: 21 });
    // Marking the target advances it by exactly one.
    state = setChapterRead(state, 'Leviticus', 21, '2026-10-25');
    expect(getReadingPosition(state).target).toEqual({ book: 'Leviticus', chapter: 22 });
    expect(getReadingPosition(state).lastRead).toEqual({ book: 'Leviticus', chapter: 21, date: '2026-10-25' });
  });
});

describe('v253 — neighboring shapes', () => {
  it('a gap in the reads is the next read (it was skipped, not finished)', () => {
    let state = setCurrentBook(seedStudyState(), 'Ruth');
    state = setChapterRead(state, 'Ruth', 1, '2026-10-20');
    state = setChapterRead(state, 'Ruth', 2, '2026-10-20');
    state = setChapterRead(state, 'Ruth', 4, '2026-10-21');
    expect(getReadingPosition(state).target).toEqual({ book: 'Ruth', chapter: 3 });
    expect(getReadingPosition(state).lastRead).toEqual({ book: 'Ruth', chapter: 4, date: '2026-10-21' });
  });

  it('the book’s final chapter read: the position chains to the next book’s chapter 1', () => {
    let state = setCurrentBook(seedStudyState(), 'Ruth');
    for (let c = 1; c <= 4; c++) state = setChapterRead(state, 'Ruth', c, '2026-10-21');
    const position = getReadingPosition(state);
    expect(position.target).toEqual({ book: '1 Samuel', chapter: 1 });
    expect(position.lastRead).toEqual({ book: 'Ruth', chapter: 4, date: '2026-10-21' });
  });

  it('Leviticus finished by reading (all 27) chains to Numbers 1', () => {
    let state = hisShape();
    for (let c = 20; c <= 27; c++) state = setChapterRead(state, 'Leviticus', c, '2026-10-25');
    const position = getReadingPosition(state);
    expect(position.target).toEqual({ book: 'Numbers', chapter: 1 });
    expect(position.lastRead).toEqual({ book: 'Leviticus', chapter: 27, date: '2026-10-25' });
  });

  it('the end of the canon rests: target null, the headline rests on lastRead', () => {
    let state = seedStudyState();
    for (let c = 1; c <= 22; c++) state = setChapterRead(state, 'Revelation', c, '2026-10-25');
    const position = getReadingPosition(state);
    expect(position.target).toBeNull();
    expect(position.lastRead).toEqual({ book: 'Revelation', chapter: 22, date: '2026-10-25' });
    expect(personalStudyHeadline(position, '1189 chapters complete')).toBe('Revelation · Chapter 22');
  });

  it('a fresh book with no reads correctly starts at chapter 1; a fresh profile has no position', () => {
    const chosen = setCurrentBook(seedStudyState(), 'Ruth');
    expect(getReadingPosition(chosen).target).toEqual({ book: 'Ruth', chapter: 1 });
    expect(getReadingPosition(seedStudyState())).toEqual({ currentBook: null, lastRead: null, target: null });
  });

  it('notes states alone never position the reading target (two marks, v228)', () => {
    // His writing pipeline can run ahead in the notes track; the
    // reading position does not follow it.
    let state = setCurrentBook(seedStudyState(), 'Leviticus');
    for (let c = 1; c <= 18; c++) state = setChapterStatus(state, 'Leviticus', c, 'complete');
    expect(chapterStatus(state, 'Leviticus', 18)).toBe('complete');
    expect(getReadingPosition(state).target).toEqual({ book: 'Leviticus', chapter: 1 });
    expect(getReadingPosition(state).lastRead).toBeNull();
  });

  it('the stamp is a floor for its own book only — a legacy position never resets', () => {
    // Pre-v228 shape: no read marks, the stamp is the record.
    const legacy: StudyState = {
      ...seedStudyState(),
      lastRead: { book: 'Genesis', chapter: 7, date: '2026-10-01' },
    };
    expect(getReadingPosition(legacy).target).toEqual({ book: 'Genesis', chapter: 8 });
    expect(getReadingPosition(legacy).lastRead).toEqual({ book: 'Genesis', chapter: 7, date: '2026-10-01' });
    // The floor holds even when sparse early read marks exist
    // behind it — the position never drags back under the record.
    let mixed: StudyState = { ...seedStudyState(), lastRead: { book: 'Leviticus', chapter: 18, date: '2026-10-22' } };
    mixed = setChapterRead(mixed, 'Leviticus', 3, '2026-10-20');
    expect(getReadingPosition(mixed).target).toEqual({ book: 'Leviticus', chapter: 19 });
  });

  it('malformed read entries are ignored, never a frontier', () => {
    const state: StudyState = {
      ...seedStudyState(),
      reads: {
        'Bogus|1': '2026-10-25',
        'Leviticus|99': '2026-10-25',
        'Leviticus|x': '2026-10-25',
      },
    };
    expect(getReadingPosition(state)).toEqual({ currentBook: null, lastRead: null, target: null });
  });
});
