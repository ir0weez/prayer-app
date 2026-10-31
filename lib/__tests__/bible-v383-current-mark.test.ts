// ─── v383 — "I marked 1 John as current, and it's not in the current
// area..." (his report, Oct 31 00:30, Books screenshot) ─────────────
// The trace found THREE facts:
//   1. The Books page's Current pill (rows + Jump-to-Book modal) writes
//      the STUDY store's currentBook (makeCurrent → study
//      setCurrentBook) — the store the Books page reads.
//   2. groupBooksByStudy DEMOTED that mark: a marked book that was
//      fully written (or fully read) was pulled out of Current into
//      Written/Finished by the v322 channel precedence. 1 John is
//      fully written, so his mark landed in the Written section —
//      the Current area kept showing the progressed Colossians, and
//      1 John wore its filled pill three sections down, off-screen.
//   3. The schedule Bible-study form's save handler wrote the OTHER
//      store — the legacy unified bookStatuses (bible-unified
//      setCurrentBook) — which the Books page has not read since the
//      one-time v211 position seed. A mark made there never reached
//      the Books page at all.
// The fix: an explicit mark wins. groupBooksByStudy seats the marked
// book FIRST in Current wherever it was (Finished/Written membership
// is computed for every OTHER book exactly as v322 ruled), and the
// schedule form writes the study store alongside the unified one.
// The pill dress is fixed with it: the make-current OFFER pill wore
// palette.band, which in his dark theme reads as the same filled
// blue as the solid CURRENT chip (Colossians' and Leviticus' pills
// were indistinguishable in his screenshot). The offer is now a
// quiet tonal pill labelled "Set current" — a verb can never be
// misread as the state marker.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const store = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      store.delete(k);
    }),
    clear: vi.fn(async () => {
      store.clear();
    }),
  },
}));

import { CHAPTER_COUNTS } from '../bible-v205/index';
import {
  chapterKey,
  loadStudyState,
  saveStudyState,
  seedStudyState,
  setChapterStatus,
  setCurrentBook as setStudyCurrentBook,
  type StudyState,
} from '../bible-v205/study';
import { groupBooksByStudy } from '../bible-v205/rewards';
import { deriveBibleAccents } from '../bible-v205/palette-accents';
import { setCurrentBook as setUnifiedCurrentBook, getCurrentBook as getUnifiedCurrentBook, loadUnifiedBible } from '../bible-unified';

const canon = Object.keys(CHAPTER_COUNTS);

function fullyWritten(state: StudyState, book: string): StudyState {
  let s = state;
  for (let c = 1; c <= (CHAPTER_COUNTS[book] ?? 0); c++) {
    s = setChapterStatus(s, book, c, 'complete');
  }
  return s;
}

function fullyRead(state: StudyState, book: string): StudyState {
  const reads = { ...state.reads };
  for (let c = 1; c <= (CHAPTER_COUNTS[book] ?? 0); c++) {
    reads[chapterKey(book, c)] = '2026-10-30';
  }
  return { ...state, reads };
}

/** His Oct 31 shape: Colossians the writing-current (1 of 4 written),
 * 1 John fully written, Leviticus fully read with nothing written,
 * Jude fully read as an unmarked control. */
function hisShape(): StudyState {
  let s = seedStudyState();
  s = setStudyCurrentBook(s, 'Colossians');
  s = setChapterStatus(s, 'Colossians', 1, 'complete');
  s = fullyWritten(s, '1 John');
  s = fullyRead(s, 'Leviticus');
  s = fullyRead(s, 'Jude');
  return s;
}

describe('v383 — the mark he made, against the shipped grouping (reproduction)', () => {
  it('before any new mark: Colossians leads Current; 1 John sits in Written; Leviticus + Jude in Finished', () => {
    const groups = groupBooksByStudy(hisShape(), canon);
    expect(groups.current[0]).toBe('Colossians');
    expect(groups.written).toContain('1 John');
    expect(groups.finished).toContain('Leviticus');
    expect(groups.finished).toContain('Jude');
  });

  it('the Books-pill path (study setCurrentBook) puts 1 John at the head of Current — not demoted to Written', () => {
    const marked = setStudyCurrentBook(hisShape(), '1 John');
    const groups = groupBooksByStudy(marked, canon);
    expect(groups.current[0]).toBe('1 John');
    expect(groups.written).not.toContain('1 John');
    // Colossians keeps its earned place in Current as a progressed
    // book — it is demoted from the MARK, not from the section.
    expect(groups.current).toContain('Colossians');
    // Exactly one section holds 1 John; the canon still partitions.
    const all = [...groups.current, ...groups.finished, ...groups.written, ...groups.notStarted];
    expect(all.filter((b) => b === '1 John')).toHaveLength(1);
    expect(all).toHaveLength(66);
    expect(new Set(all).size).toBe(66);
  });

  it('exactly one filled current at a time: the study store holds a single currentBook, and re-marking replaces it', () => {
    let s = setStudyCurrentBook(hisShape(), '1 John');
    expect(s.currentBook).toBe('1 John');
    s = setStudyCurrentBook(s, 'Mark');
    expect(s.currentBook).toBe('Mark');
    const groups = groupBooksByStudy(s, canon);
    expect(groups.current[0]).toBe('Mark');
    expect(groups.current.filter((b) => b === '1 John')).toHaveLength(0);
    expect(groups.written).toContain('1 John');
  });

  it('marking a fully READ book (Leviticus) seats it in Current too — the explicit mark outranks Finished, for that book only', () => {
    const marked = setStudyCurrentBook(hisShape(), 'Leviticus');
    const groups = groupBooksByStudy(marked, canon);
    expect(groups.current[0]).toBe('Leviticus');
    expect(groups.finished).not.toContain('Leviticus');
    // The v322 ruling itself is untouched for every unmarked book:
    // Finished still means fully read only, Written fully written.
    expect(groups.finished).toContain('Jude');
    expect(groups.written).toContain('1 John');
  });

  it('the mark survives the persistence round-trip makeCurrent actually performs', async () => {
    await saveStudyState(hisShape());
    // makeCurrent: load fresh → set → save → the page re-reads.
    const fresh = await loadStudyState();
    await saveStudyState(setStudyCurrentBook(fresh, '1 John'));
    const reloaded = await loadStudyState();
    expect(reloaded.currentBook).toBe('1 John');
    const groups = groupBooksByStudy(reloaded, canon);
    expect(groups.current[0]).toBe('1 John');
  });
});

describe('v383 — the schedule form path (the other live setter)', () => {
  beforeEach(() => {
    store.clear();
  });

  it('REPRO of the old divergence: the unified setter alone never reaches the study store the Books page reads', async () => {
    await saveStudyState(hisShape());
    const unified = await setUnifiedCurrentBook('1 John');
    expect(getUnifiedCurrentBook(unified)).toBe('1 John');
    const study = await loadStudyState();
    // The unified write is real — and the Books page cannot see it.
    // (This pin documents the divergence the form fix closes: the
    // form now performs the study write pinned below alongside.)
    expect(study.currentBook).toBe('Colossians');
  });

  it('the fixed form writes BOTH stores: unified for its own displays, study for the Books page', async () => {
    const src = readFileSync(join(process.cwd(), 'components', 'schedule-tab.tsx'), 'utf8');
    const start = src.indexOf('const handleSaveBibleStudy');
    const body = src.slice(start, src.indexOf('resetForm();', start));
    expect(body).toContain("import('@/lib/bible-unified')");
    expect(body).toContain('setCurrentBook(formBibleBook)');
    // The study-store write rides the same save.
    expect(body).toContain("import('@/lib/bible-v205/study')");
    expect(body).toContain('loadStudyState');
    expect(body).toContain('saveStudyState');
    // And the end-to-end effect of performing that study write:
    await saveStudyState(hisShape());
    const fresh = await loadStudyState();
    await saveStudyState(setStudyCurrentBook(fresh, '1 John'));
    const groups = groupBooksByStudy(await loadStudyState(), canon);
    expect(groups.current[0]).toBe('1 John');
  });

  it('the unified store still loads clean after its setter runs (no collateral damage)', async () => {
    await setUnifiedCurrentBook('1 John');
    const reloaded = await loadUnifiedBible();
    expect(getUnifiedCurrentBook(reloaded)).toBe('1 John');
  });
});

describe('v383 — the pill dresses can no longer be confused', () => {
  const src = readFileSync(join(process.cwd(), 'app', 'bible-chapters.tsx'), 'utf8');
  const pillStart = src.indexOf('function CurrentPill');
  const pillBody = src.slice(pillStart, src.indexOf('function BookRow'));

  it('the filled state chip keeps its dress: solid rasp, white CURRENT', () => {
    expect(pillBody).toContain('backgroundColor: palette.rasp');
    expect(pillBody).toContain('>Current<');
    expect(pillBody).toContain('is the current book');
  });

  it('the offer pill is a quiet tonal action: raspTint dress, "Set current" label, no band fill', () => {
    expect(pillBody).toContain('Set current');
    expect(pillBody).toContain('backgroundColor: palette.raspTint');
    expect(pillBody).not.toContain('backgroundColor: palette.band');
    expect(pillBody).toContain('Make ${book} current');
  });

  it('the two dresses resolve to different paints at a real seed', () => {
    const accents = deriveBibleAccents('#5B8DEF', '#101623');
    expect(accents.rasp).not.toBe(accents.raspTint);
  });
});
