// ─── v461 — a chapter in ReStudy counts as written ─────────────
// His model (2026-11-06): the pipeline is Write → Complete →
// ReStudy. A chapter in ReStudy has already passed Complete —
// ReStudy is a LATER stage, not a lesser one. The v324 union
// (rewards.ts chapterIsWritten) counted only a live 'complete'
// status or note entries in the resolved data, so Ecclesiastes —
// all 12 chapters standing in restudy (his own overrides and the
// desk's studioStates agree), note entries in the app data for
// chapters 1–2 only — read "2 of 12 written" and would not seat
// in Written. v461 adds the restudy arm to the union, resolved
// through chapterStatus so both roads in (a stored override, or
// bare restudyQueue membership) count. The XP finish rules are
// NOT this rule and are pinned unmoved below: bookIsComplete
// still demands the literal 'complete' status.

import { describe, expect, it } from 'vitest';
import { CHAPTER_COUNTS } from '../bible-v205/index';
import {
  seedStudyState,
  setChapterStatus,
  type StudyState,
} from '../bible-v205/study';
import {
  bookChapterTallies,
  bookIsComplete,
  bookIsFinished,
  bookIsWritten,
  bookWrittenCount,
  chapterIsWritten,
} from '../bible-v205/rewards';
import {
  chapterHasNotes,
  studioImportKey,
  type StudioImportsMap,
} from '../bible-v205/studio-import';
import type { V205ChapterData } from '../bible-v205/types';

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

/** Ecclesiastes as it stands on his phone: every chapter in
 * restudy, no read marks, no imports. */
function ecclesiastesInRestudy(): StudyState {
  let state = seedStudyState();
  for (let c = 1; c <= CHAPTER_COUNTS['Ecclesiastes']; c++) {
    state = setChapterStatus(state, 'Ecclesiastes', c, 'restudy');
  }
  return state;
}

describe('v461 — the restudy arm of the written union', () => {
  it("a 'restudy' override with no notes counts as written", () => {
    // Exodus ch1: no shipped notes (v324 skeleton pin), so only the
    // new status arm can count it.
    expect(chapterHasNotes('Exodus', 1, {})).toBe(false);
    const state = setChapterStatus(seedStudyState(), 'Exodus', 1, 'restudy');
    expect(chapterIsWritten(state, 'Exodus', 1)).toBe(true);
  });

  it('bare restudyQueue membership with no override counts as written', () => {
    const seed = seedStudyState();
    const state: StudyState = {
      ...seed,
      overrides: { ...seed.overrides },
      restudyQueue: [{ book: 'Exodus', chapter: 2 }],
    };
    expect(state.overrides['Exodus|2']).toBeUndefined();
    expect(chapterIsWritten(state, 'Exodus', 2)).toBe(true);
  });

  it('the Ecclesiastes shape: 12 chapters in restudy, notes in 1–2 only → 12 of 12 written', () => {
    // The fixture's premise, pinned against the shipped data layer:
    // chapters 1–2 carry his note entries, 3–12 are empty shells.
    expect(chapterHasNotes('Ecclesiastes', 1, {})).toBe(true);
    expect(chapterHasNotes('Ecclesiastes', 2, {})).toBe(true);
    for (let c = 3; c <= 12; c++) {
      expect(chapterHasNotes('Ecclesiastes', c, {}), `chapter ${c}`).toBe(false);
    }
    const state = ecclesiastesInRestudy();
    expect(bookWrittenCount(state, 'Ecclesiastes')).toBe(12);
    expect(bookIsWritten(state, 'Ecclesiastes')).toBe(true);
  });

  it('the v325 invariant survives: written + toWrite = total', () => {
    const tallies = bookChapterTallies(ecclesiastesInRestudy(), 'Ecclesiastes');
    expect(tallies.total).toBe(12);
    expect(tallies.written).toBe(12);
    expect(tallies.toWrite).toBe(0);
    expect(tallies.written + tallies.toWrite).toBe(tallies.total);
    // And on a mixed book: one restudy (written), one write-stamped
    // and unnoted (to write), the rest untouched.
    let mixed = seedStudyState();
    mixed = setChapterStatus(mixed, 'Exodus', 1, 'restudy');
    mixed = setChapterStatus(mixed, 'Exodus', 2, 'write');
    const ex = bookChapterTallies(mixed, 'Exodus');
    expect(ex.written).toBe(1);
    expect(ex.toWrite).toBe(ex.total - 1);
    expect(ex.written + ex.toWrite).toBe(ex.total);
  });

  it("the other arms are unmoved: 'write' + notes counts by notes; 'write'/'none' without notes does not count", () => {
    let state = seedStudyState();
    state = setChapterStatus(state, 'Leviticus', 1, 'write');
    const imports = importsFor('Leviticus', [1]);
    expect(chapterIsWritten(state, 'Leviticus', 1, imports)).toBe(true); // notes arm
    expect(chapterIsWritten(state, 'Leviticus', 1)).toBe(false); // no notes, no status arm
    const stamped = setChapterStatus(seedStudyState(), 'Exodus', 3, 'write');
    expect(chapterIsWritten(stamped, 'Exodus', 3)).toBe(false);
    expect(chapterIsWritten(seedStudyState(), 'Exodus', 3)).toBe(false); // 'none'
  });
});

describe('v461 — the XP finish rules did not move', () => {
  it("bookIsComplete still requires literal 'complete' on every chapter", () => {
    const restudied = ecclesiastesInRestudy();
    expect(bookIsWritten(restudied, 'Ecclesiastes')).toBe(true); // display rule
    expect(bookIsComplete(restudied, 'Ecclesiastes')).toBe(false); // XP rule
    let completed = seedStudyState();
    for (let c = 1; c <= CHAPTER_COUNTS['Ecclesiastes']; c++) {
      completed = setChapterStatus(completed, 'Ecclesiastes', c, 'complete');
    }
    expect(bookIsComplete(completed, 'Ecclesiastes')).toBe(true);
  });

  it('a fully-restudied, unread book is Written for display but not Finished for XP', () => {
    const state = ecclesiastesInRestudy();
    expect(bookIsFinished(state, 'Ecclesiastes')).toBe(false);
  });
});
