// ─── v322 — Books sections by channel (his ruling, 2026-10-28
// 20:12, screenshot 10866) ────────────────────────────────────────
// "Shouldn't finished in the app only count the 'read' ones?" The
// FINISHED section listened to the WRITING channel: Genesis sat
// there at "50 of 50 written" with "0 of 50 read" on its own card.
// His pick from the options put to him: Finished = fully read;
// writing gets its own section. These pins hold groupBooksByStudy
// (and the Books screen's rendering of it) to that ruling:
//   Finished — read count == chapter count (the v305 read track).
//   Written  — written == chapters, not fully read.
//   Both     — Finished only. Partial — neither.
//   Precedence: Finished > Written > Current / Not Started, every
//   book in exactly one section.

import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { CHAPTER_COUNTS } from '../bible-v205/index';
import {
  chapterKey,
  seedStudyState,
  setChapterStatus,
  setCurrentBook,
  type StudyState,
} from '../bible-v205/study';
import { groupBooksByStudy } from '../bible-v205/rewards';
import { bookReadCount } from '../bible-v205/reading-progress';

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
    reads[chapterKey(book, c)] = '2026-10-28';
  }
  return { ...state, reads };
}

describe('v322 — Books sections: Finished counts the read ones', () => {
  it('a fresh state: nothing Finished; Written holds the fully-noted books (v324 re-base)', () => {
    // v324 re-base (his words, 2026-10-28 21:00 — "I have multiple
    // entire books finished with notes"): under v322's status-only
    // rule this fixture read nothing-Written / all-Not-Started.
    // Written now seats every book noted cover to cover in the
    // shipped data — the exact list is pinned in
    // bible-v324-written.test.ts.
    const groups = groupBooksByStudy(seedStudyState(), canon);
    expect(groups.finished).toEqual([]);
    expect(groups.current).toEqual([]);
    expect(groups.written).toContain('Genesis');
    expect(groups.written).toContain('1 Corinthians');
    expect(groups.notStarted).not.toContain('1 Corinthians');
    const all = [...groups.current, ...groups.finished, ...groups.written, ...groups.notStarted];
    expect(all).toHaveLength(66);
    expect(new Set(all).size).toBe(66);
    expect([...all].sort()).toEqual([...canon].sort());
  });

  it('the Genesis shape — fully written, 0 read — lands in Written, NOT Finished', () => {
    let state = seedStudyState();
    state = fullyWritten(state, 'Ruth');
    expect(bookReadCount(state, 'Ruth')).toBe(0);
    const groups = groupBooksByStudy(state, canon);
    expect(groups.written).toContain('Ruth');
    expect(groups.finished).not.toContain('Ruth');
    expect(groups.current).not.toContain('Ruth');
    expect(groups.notStarted).not.toContain('Ruth');
  });

  it('a fully READ book lands in Finished — even with no writing at all', () => {
    let state = seedStudyState();
    state = fullyRead(state, 'Jonah');
    expect(bookReadCount(state, 'Jonah')).toBe(CHAPTER_COUNTS['Jonah']);
    const groups = groupBooksByStudy(state, canon);
    expect(groups.finished).toContain('Jonah');
    expect(groups.written).not.toContain('Jonah');
    expect(groups.notStarted).not.toContain('Jonah');
  });

  it('a book both fully written AND fully read lands in Finished only', () => {
    let state = seedStudyState();
    state = fullyWritten(state, 'Philemon');
    state = fullyRead(state, 'Philemon');
    const groups = groupBooksByStudy(state, canon);
    expect(groups.finished).toContain('Philemon');
    expect(groups.written).not.toContain('Philemon');
    const all = [...groups.current, ...groups.finished, ...groups.written, ...groups.notStarted];
    expect(all.filter((b) => b === 'Philemon')).toHaveLength(1);
  });

  it('a partially read book lands in NEITHER Finished nor Written', () => {
    let state = seedStudyState();
    state = {
      ...state,
      reads: { ...state.reads, [chapterKey('Haggai', 1)]: '2026-10-28' },
    };
    expect(bookReadCount(state, 'Haggai')).toBe(1);
    const groups = groupBooksByStudy(state, canon);
    expect(groups.finished).not.toContain('Haggai');
    expect(groups.written).not.toContain('Haggai');
  });

  it('a partially written book lands in NEITHER Finished nor Written', () => {
    let state = seedStudyState();
    state = setChapterStatus(state, 'Haggai', 1, 'complete');
    const groups = groupBooksByStudy(state, canon);
    expect(groups.finished).not.toContain('Haggai');
    expect(groups.written).not.toContain('Haggai');
    expect(groups.current).toContain('Haggai');
  });

  it('precedence: the current book, fully read, reads as Finished — not Current', () => {
    let state = seedStudyState();
    state = setCurrentBook(state, 'Jonah');
    state = fullyRead(state, 'Jonah');
    const groups = groupBooksByStudy(state, canon);
    expect(groups.finished).toContain('Jonah');
    expect(groups.current).not.toContain('Jonah');
  });

  it('precedence: the current book, fully written only, lands in Written — not Current', () => {
    let state = seedStudyState();
    state = setCurrentBook(state, 'Ruth');
    state = fullyWritten(state, 'Ruth');
    const groups = groupBooksByStudy(state, canon);
    expect(groups.written).toContain('Ruth');
    expect(groups.current).not.toContain('Ruth');
  });

  it('precedence: an in-progress current book still pins first in Current', () => {
    let state = seedStudyState();
    state = setCurrentBook(state, 'Colossians');
    state = setChapterStatus(state, 'Colossians', 1, 'write');
    state = fullyWritten(state, 'Ruth');
    state = fullyRead(state, 'Jonah');
    const groups = groupBooksByStudy(state, canon);
    expect(groups.current[0]).toBe('Colossians');
  });

  it('a mixed fixture: every book in exactly one section, 66 in all', () => {
    let state = seedStudyState();
    state = setCurrentBook(state, 'Colossians');
    state = setChapterStatus(state, 'Colossians', 1, 'write');
    state = fullyWritten(state, 'Ruth');
    state = fullyRead(state, 'Jonah');
    state = fullyWritten(state, 'Philemon');
    state = fullyRead(state, 'Philemon');
    const groups = groupBooksByStudy(state, canon);
    const all = [...groups.current, ...groups.finished, ...groups.written, ...groups.notStarted];
    expect(all).toHaveLength(66);
    expect(new Set(all).size).toBe(66);
    expect([...all].sort()).toEqual([...canon].sort());
  });

  it('the Books screen renders a Written section under Finished, and the guard counts all four', () => {
    const src = readFileSync(join(process.cwd(), 'app', 'bible-chapters.tsx'), 'utf8');
    expect(src).toContain('>Finished<');
    expect(src).toContain('>Written<');
    expect(src).toContain('groups.written.map(renderBookRow)');
    // Section order on the page: Finished, then Written, then Not Started.
    expect(src.indexOf('>Finished<')).toBeLessThan(src.indexOf('>Written<'));
    expect(src.indexOf('>Written<')).toBeLessThan(src.indexOf('>Not Started<'));
    expect(src).toContain(
      'groups.current.length + groups.finished.length + groups.written.length + groups.notStarted.length',
    );
  });
});
