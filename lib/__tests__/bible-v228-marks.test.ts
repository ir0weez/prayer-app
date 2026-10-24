// ─── v228 "Two Honest Marks" — pins ─────────────────────────────────────────
// Jonathan's ruling (2026-10-24): a chapter carries TWO independent
// marks. READ — app-side, a per-chapter read date, the thing the +25
// daily-reading XP was always for. COMPLETE — the existing status
// pipeline, which is the NOTES-WRITTEN track, shared with the studio
// via chapterState/studioStates. The old code conflated them:
// transitionChapterStatus paid the reading award for finishing notes,
// and the reader carried a Mark Complete button. Both are gone.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  chapterMarks,
  chapterReadDate,
  chapterStatus,
  clearChapterRead,
  formatReadDate,
  loadStudyState,
  normalizeReads,
  saveStudyState,
  seedStudyState,
  setChapterRead,
  setChapterStatus,
  STUDY_KEY,
  type StudyState,
} from '../bible-v205/study';
import { markChapterRead, transitionChapterStatus, unmarkChapterRead } from '../bible-v205/rewards';
import {
  applyStudioStatesReads,
  collectStudioStates,
  isISODateString,
  validateStudioStates,
} from '../bible-v205/studio-states';
import { parseStudioFile } from '../bible-v205/studio-import';
import { planDrivePack } from '../bible-v205/drive-folder';
import { loadXPState, XP_AWARDS_STORAGE_KEY } from '../xp-engine';

const today = new Date().toISOString().split('T')[0];

beforeEach(() => {
  store.clear();
});

describe('the read track — set, clear, persist', () => {
  it('setChapterRead stamps the date; clearChapterRead removes only the mark', () => {
    let state = seedStudyState();
    expect(chapterReadDate(state, 'Genesis', 2)).toBeNull();
    state = setChapterRead(state, 'Genesis', 2, '2026-10-24');
    expect(chapterReadDate(state, 'Genesis', 2)).toBe('2026-10-24');
    state = setChapterStatus(state, 'Genesis', 2, 'write');
    state = clearChapterRead(state, 'Genesis', 2);
    expect(chapterReadDate(state, 'Genesis', 2)).toBeNull();
    // Clearing the read mark never touched the notes state.
    expect(chapterStatus(state, 'Genesis', 2)).toBe('write');
  });

  it('the read track persists through save/load', async () => {
    let state = seedStudyState();
    state = setChapterRead(state, 'Psalms', 23, '2026-10-20');
    state = setChapterRead(state, 'Psalms', 24, '2026-10-21');
    await saveStudyState(state);
    const loaded = await loadStudyState();
    expect(chapterReadDate(loaded, 'Psalms', 23)).toBe('2026-10-20');
    expect(chapterReadDate(loaded, 'Psalms', 24)).toBe('2026-10-21');
  });

  it('a pre-v228 save (no reads field) loads clean with an empty read track', async () => {
    store.set(
      STUDY_KEY,
      JSON.stringify({
        overrides: { 'Genesis|1': 'complete' },
        writeQueue: [],
        restudyQueue: [],
        currentBook: null,
        lastRead: null,
        migratedUnified: true,
        clearedNotionSeed: true,
      }),
    );
    const loaded = await loadStudyState();
    expect(loaded.reads).toEqual({});
    expect(chapterReadDate(loaded, 'Genesis', 1)).toBeNull();
    expect(chapterStatus(loaded, 'Genesis', 1)).toBe('complete');
  });

  it('normalizeReads drops malformed entries and keeps real dates', () => {
    expect(
      normalizeReads({
        'Genesis|1': '2026-10-24',
        'Genesis|2': 'yesterday',
        'Genesis|3': 42,
        'Genesis|4': null,
      }),
    ).toEqual({ 'Genesis|1': '2026-10-24' });
    expect(normalizeReads(undefined)).toEqual({});
    expect(normalizeReads(['2026-10-24'])).toEqual({});
  });

  it('formatReadDate renders the ✓ Read line dates', () => {
    expect(formatReadDate('2026-10-24')).toBe('Oct 24, 2026');
    expect(formatReadDate('2026-01-05')).toBe('Jan 5, 2026');
    expect(formatReadDate('nope')).toBe('');
  });
});

describe('independence — neither mark implies the other', () => {
  it('entering Complete does NOT set a read date', async () => {
    const result = await transitionChapterStatus(seedStudyState(), 'Exodus', 3, 'complete');
    expect(chapterStatus(result.state, 'Exodus', 3)).toBe('complete');
    expect(chapterReadDate(result.state, 'Exodus', 3)).toBeNull();
  });

  it('marking read does NOT touch the notes status or the queues', async () => {
    let state = setChapterStatus(seedStudyState(), 'Exodus', 3, 'write');
    const result = await markChapterRead(state, 'Exodus', 3);
    expect(chapterReadDate(result.state, 'Exodus', 3)).toBe(today);
    expect(chapterStatus(result.state, 'Exodus', 3)).toBe('write');
  });

  it('marking read does NOT stamp lastRead — the position marker belongs to Complete alone', async () => {
    const result = await markChapterRead(seedStudyState(), 'Exodus', 3);
    expect(result.state.lastRead).toBeNull();
  });

  it('un-reading does NOT touch the notes status, and never revokes XP', async () => {
    const read = await markChapterRead(seedStudyState(), 'Exodus', 3);
    const xpAfterRead = (await loadXPState()).totalXP;
    expect(xpAfterRead).toBeGreaterThanOrEqual(25);
    const completed = await transitionChapterStatus(read.state, 'Exodus', 3, 'complete');
    const cleared = await unmarkChapterRead(completed.state, 'Exodus', 3);
    expect(chapterReadDate(cleared, 'Exodus', 3)).toBeNull();
    expect(chapterStatus(cleared, 'Exodus', 3)).toBe('complete');
    expect((await loadXPState()).totalXP).toBe(xpAfterRead);
  });

  it('chapterMarks exposes both marks side by side (the grid helper)', () => {
    let state = seedStudyState();
    state = setChapterStatus(state, 'Jonah', 2, 'in-progress');
    state = setChapterRead(state, 'Jonah', 2, '2026-10-11');
    expect(chapterMarks(state, 'Jonah', 2)).toEqual({ status: 'in-progress', readDate: '2026-10-11' });
    expect(chapterMarks(state, 'Jonah', 3)).toEqual({ status: 'none', readDate: null });
  });
});

describe('XP re-key — the +25 belongs to reading; +100/+1000 to notes', () => {
  it('book and bible bonuses still pay off the NOTES track, with no chapter XP riding along', async () => {
    // Every chapter notes-Complete except Obadiah 1 (pure setup).
    let state = seedStudyState();
    for (const book of Object.keys(CHAPTER_COUNTS)) {
      for (let c = 1; c <= CHAPTER_COUNTS[book]; c++) {
        if (book === 'Obadiah' && c === 1) continue;
        state = setChapterStatus(state, book, c, 'complete');
      }
    }
    const result = await transitionChapterStatus(state, 'Obadiah', 1, 'complete');
    expect(result.bookCompleted).toBe('Obadiah');
    expect(result.bibleCompleted).toBe(true);
    const ledger = JSON.parse(store.get(XP_AWARDS_STORAGE_KEY)!) as string[];
    expect(ledger).toContain('book-complete:book:Obadiah');
    expect(ledger).toContain('bible-complete:bible');
    expect(ledger.some((k) => k.startsWith('daily-reading'))).toBe(false);
    expect((await loadXPState()).totalXP).toBeGreaterThanOrEqual(1100);
    // And not one of those 1,189 chapters gained a read mark.
    expect(Object.keys(result.state.reads)).toHaveLength(0);
  });
});

describe('studioStates — the bridge carries both tracks', () => {
  const marked = (): StudyState => {
    let state = seedStudyState();
    state = setChapterStatus(state, 'Genesis', 1, 'complete');
    state = setChapterRead(state, 'Genesis', 1, '2026-10-24');
    state = setChapterRead(state, 'Genesis', 2, '2026-10-23');
    state = setChapterStatus(state, 'Exodus', 1, 'write');
    return state;
  };

  it('collect emits only chapters carrying a mark, both tracks explicit', () => {
    const section = collectStudioStates(marked());
    expect(section.chapters).toEqual([
      { book: 'Genesis', chapter: 1, notesState: 'complete', readDate: '2026-10-24' },
      { book: 'Genesis', chapter: 2, notesState: null, readDate: '2026-10-23' },
      { book: 'Exodus', chapter: 1, notesState: 'write', readDate: null },
    ]);
    expect(collectStudioStates(seedStudyState()).chapters).toEqual([]);
  });

  it('validate rejects unknown books, out-of-range chapters, bad states, bad dates, duplicates', () => {
    const wrap = (chapters: unknown[]) => () => validateStudioStates({ chapters });
    expect(wrap([{ book: 'Hezekiah', chapter: 1, notesState: null, readDate: null }])).toThrow(/unknown book/);
    expect(wrap([{ book: 'Obadiah', chapter: 2, notesState: null, readDate: null }])).toThrow(/outside Obadiah/);
    expect(wrap([{ book: 'Genesis', chapter: 1, notesState: 'done', readDate: null }])).toThrow(/unknown notesState/);
    expect(wrap([{ book: 'Genesis', chapter: 1, notesState: null, readDate: '2026-13-40' }])).toThrow(/readDate/);
    expect(
      wrap([
        { book: 'Genesis', chapter: 1, notesState: null, readDate: null },
        { book: 'Genesis', chapter: 1, notesState: 'write', readDate: null },
      ]),
    ).toThrow(/duplicate/);
    expect(isISODateString('2026-02-29')).toBe(false);
    expect(isISODateString('2024-02-29')).toBe(true);
  });

  it('parseStudioFile reads a backup-shaped file as a states pack', () => {
    const pack = parseStudioFile({
      format: 'prayercircle-backup',
      version: 1,
      storage: {},
      studioStates: {
        chapters: [{ book: 'Genesis', chapter: 1, notesState: 'complete', readDate: '2026-10-24' }],
      },
    });
    expect(pack.kind).toBe('states');
    if (pack.kind === 'states') {
      expect(pack.states.chapters).toEqual([
        { book: 'Genesis', chapter: 1, notesState: 'complete', readDate: '2026-10-24' },
      ]);
    }
    // A malformed section fails whole — nothing half-applies.
    expect(() =>
      parseStudioFile({ studioStates: { chapters: [{ book: 'Genesis', chapter: 1, notesState: 'bogus', readDate: null }] } }),
    ).toThrow();
  });

  it('round-trip: export → import into a fresh store → the same section comes back', async () => {
    const source = marked();
    const section = collectStudioStates(source);
    const pack = parseStudioFile({ studioStates: section });
    expect(pack.kind).toBe('states');
    if (pack.kind !== 'states') return;
    // The door's apply order: notes states through the transition,
    // then the read marks merge forward-only.
    let state = seedStudyState();
    for (const entry of pack.states.chapters) {
      if (entry.notesState === null) continue;
      state = (await transitionChapterStatus(state, entry.book, entry.chapter, entry.notesState)).state;
    }
    state = applyStudioStatesReads(state, pack.states.chapters).state;
    expect(collectStudioStates(state)).toEqual(section);
  });

  it('reads merge: later date wins, earlier is ignored, null never clears', () => {
    let state = setChapterRead(seedStudyState(), 'Genesis', 5, '2026-10-10');
    const later = applyStudioStatesReads(state, [
      { book: 'Genesis', chapter: 5, notesState: null, readDate: '2026-10-20' },
    ]);
    expect(later.applied).toBe(1);
    state = later.state;
    expect(chapterReadDate(state, 'Genesis', 5)).toBe('2026-10-20');
    const earlier = applyStudioStatesReads(state, [
      { book: 'Genesis', chapter: 5, notesState: null, readDate: '2026-10-01' },
    ]);
    expect(earlier.applied).toBe(0);
    const nully = applyStudioStatesReads(state, [
      { book: 'Genesis', chapter: 5, notesState: null, readDate: null },
    ]);
    expect(nully.applied).toBe(0);
    expect(chapterReadDate(nully.state, 'Genesis', 5)).toBe('2026-10-20');
  });

  it('the Drive planner holds a backward notes move from a states pack and rides its reads whole', () => {
    const current = setChapterStatus(seedStudyState(), 'Genesis', 1, 'complete');
    const pack = parseStudioFile({
      studioStates: {
        chapters: [
          { book: 'Genesis', chapter: 1, notesState: 'write', readDate: '2026-10-24' },
          { book: 'Genesis', chapter: 2, notesState: 'in-progress', readDate: null },
        ],
      },
    });
    const plan = planDrivePack(pack, (b, c) => chapterStatus(current, b, c), [], []);
    // complete → write is a regression: it waits for his tap.
    expect(plan.heldStates).toHaveLength(1);
    expect(plan.heldStates[0]).toMatchObject({ book: 'Genesis', chapter: 1, from: 'complete', to: 'write' });
    // none → in-progress is forward: it auto-applies.
    expect(plan.autoStates).toEqual([{ book: 'Genesis', chapter: 2, to: 'in-progress' }]);
    // The read mark rides in the same pack, unheld.
    expect(plan.statesReads).toEqual([
      { book: 'Genesis', chapter: 1, notesState: 'write', readDate: '2026-10-24' },
    ]);
  });
});

describe('surfaces — the reader carries no notes-state control; the grid shows both marks', () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

  it('chapter page: Mark as Read stands; no control mutates notes state', () => {
    const src = read('components/bible-v205/chapter-page.tsx');
    expect(src).toContain('Mark as Read');
    expect(src).toContain('markChapterRead');
    expect(src).toContain('unmarkChapterRead');
    expect(src).toContain('✓ Read ·');
    expect(src).not.toContain('Mark Complete');
    expect(src).not.toContain('handleSetStatus');
    expect(src).not.toContain('transitionChapterStatus');
    expect(src).not.toContain('STATUS_MENU');
    expect(src).not.toContain('statusMenu');
  });

  it('Stories mode: no notes-state control either', () => {
    const src = read('components/bible-v205/stories-view.tsx');
    expect(src).not.toContain('transitionChapterStatus');
    expect(src).not.toContain('Mark Complete');
    expect(src).not.toContain('setChapterStatus');
  });

  it('book grid: both marks on the surface, the editor framed as notes', () => {
    const src = read('app/bible-book.tsx');
    expect(src).toContain('chapterMarks');
    expect(src).toContain('cellReadDot');
    expect(src).toContain('Mark as Read');
    expect(src).toContain('Notes state — the notes-written mark');
    expect(src).toContain('Notes: {STATUS_LABEL[selStatus]}');
  });

  it('the DATA export carries studioStates next to the other studio sections', () => {
    const src = read('app/(tabs)/index.tsx');
    expect(src).toContain('collectStudioStates');
    expect(src).toContain('studioSchedule, studioStates');
    expect(src).toContain('applyStudioStatesReads');
  });
});
