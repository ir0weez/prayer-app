// ─── v205 Bible build — pins ─────────────────────────────────────────────────
// Fixtures are REAL: the canonical commentary txt files and the
// generated data they produce. The pins that matter most: 1
// Corinthians 1 renders exactly the mockup's structure with his
// verbatim Highlights; noteless chapters are full readers, never dead
// ends; his pre-v205 check-offs migrate Complete-wins and can never
// re-pay their XP; marking a chapter Complete in the new system pays
// exactly once, under the existing award keys.
// v206: the study-seed describe was rewritten — his ruling cleared the
// Notion import ("only my app progress counts"), so the pins now prove
// the seed asserts nothing, the cleanup strips exactly the imported
// queue entries, and the grid offers a way back down from every state.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

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

import { parseCommentaryTxt } from '../bible-v205/parse';
import {
  BARE_STORY_CHUNK,
  booksWithProgress,
  browseCategory,
  buildDisplaySections,
  buildReadOnlySections,
  buildStoryScreens,
  CHAPTER_COUNTS,
  chapterCountFor,
  flattenEntries,
  getChapterData,
  isBareChapter,
  mergeVerseOnlyEntries,
  notesBooks,
  parseHashVerseRef,
  searchChapter,
  splitEntryByHashNotes,
  splitSectionsByHashNotes,
  type DisplayEntry,
} from '../bible-v205/index';
import { composePreview, previewFor } from '../bible-v205/preview';
import { PREVIEWS } from '../bible-v205/previews';
import { STUDY_SEED } from '../bible-v205/study-seed';
import {
  chapterStatus,
  loadStudyState,
  mergeUnifiedReads,
  parseLegacyReadIds,
  seedStudyState,
  setChapterStatus,
  stripNotionSeedQueues,
  STUDY_KEY,
  type StudyState,
} from '../bible-v205/study';
import {
  getCurrentBibleDisplay,
  getLastReadPosition,
  type UnifiedBibleState,
} from '../bible-unified';
import { transitionChapterStatus } from '../bible-v205/rewards';
import {
  addKeeperLine,
  emptyMarks,
  isKept,
  loadMarks,
  marksFor,
  normalizeMarks,
  saveMarks,
  toggleKept,
  withMarks,
  type EntryMarks,
  type MarksMap,
} from '../bible-v205/marks';
import { blockCategory, NOTE_CATEGORIES } from '../bible-v205/categories';
import { embeddedVerses } from '../bible-v205/verses';
import { loadXPState, XP_AWARDS_STORAGE_KEY } from '../xp-engine';
import { loadUserLabels, possessiveFor } from '../bible-v205/user-labels';
import type { NoteCategory } from '../bible-v205/types';

const TXT_DIR = join(process.cwd(), '..', 'goals', 'prayercircle-apk-build', 'hidden_files', 'commentary-txt');
const PIN_HL_21 = "Preaching is foolish. I'll be the first to admit that preaching is a foolish venture.";
const PIN_HL_26 = "I don't think ministers should be trying to sway people out of a calling.";

beforeEach(() => {
  store.clear();
});

describe('parser fixtures — the real canonical txt', () => {
  it('parses 1 Corinthians 1 from 1_2_Corinthians.txt with the mockup structure', () => {
    const books = parseCommentaryTxt(readFileSync(join(TXT_DIR, '1_2_Corinthians.txt'), 'utf8'));
    const cor = books.find((b) => b.book === '1 Corinthians');
    expect(cor).toBeTruthy();
    const ch = cor!.chapters[1];
    expect(ch.sections.map((s) => s.title)).toEqual([
      'The Writer',
      'A Needed Church',
      'Divisions In the Church',
      'Foolish Wisdom',
      'Wisdom Is Foolish',
      'Simple Doctrine',
    ]);
    const entries = ch.sections.flatMap((s) => s.entries);
    expect(entries.map((e) => `${e.start}-${e.end}`)).toEqual([
      '1-1', '2-2', '3-3', '4-4', '5-8', '9-9', '10-10', '11-11', '12-15',
      '16-17', '18-18', '19-19', '20-20', '21-21', '22-23', '24-25', '26-29', '30-31',
    ]);
    // The pinned Highlight sentence lives in the entry's own prose.
    const e21 = entries.find((e) => e.start === 21)!;
    expect(e21.blocks.some((b) => b.text.includes('Preaching is foolish'))).toBe(true);
  });

  it('parses Genesis 1 (format A): stories groupings + a scripture callout from a quoted comment', () => {
    const books = parseCommentaryTxt(readFileSync(join(TXT_DIR, 'Genesis_1-10.txt'), 'utf8'));
    const gen = books.find((b) => b.book === 'Genesis');
    const ch = gen!.chapters[1];
    expect(ch.stories).toEqual([
      { start: 1, end: 2 }, { start: 3, end: 5 }, { start: 6, end: 8 }, { start: 9, end: 13 },
      { start: 14, end: 19 }, { start: 20, end: 23 }, { start: 24, end: 27 }, { start: 28, end: 31 },
    ]);
    const first = ch.sections[0].entries[0];
    expect(first.blocks.some((b) => b.kind === 'scripture' && b.ref === '2 Peter 3:8')).toBe(true);
  });
});

describe('generated data — the reconciled model the screens render', () => {
  it('1 Cor 1: pinned Highlights verbatim, Acts xref on Ver. 1, entry 21 leads with its Highlight', () => {
    const ch = getChapterData('1 Corinthians', 1)!;
    const entries = ch.sections.flatMap((s) => s.entries);
    const e21 = entries.find((e) => e.start === 21)!;
    expect(e21.blocks[0]).toMatchObject({ kind: 'highlight', text: PIN_HL_21 });
    const e26 = entries.find((e) => e.start === 26)!;
    expect(e26.blocks.some((b) => b.kind === 'highlight' && b.text === PIN_HL_26)).toBe(true);
    const e1 = entries.find((e) => e.start === 1)!;
    expect(e1.blocks.filter((b) => b.kind === 'scripture').map((b) => b.ref)).toEqual(['Acts 18:12-17']);
  });

  it('Genesis 1: his section titles ride the stories groupings', () => {
    const ch = getChapterData('Genesis', 1)!;
    expect(ch.sections.map((s) => s.title)).toEqual([
      'The Original Creation', 'The First Day', 'The Second Day', 'The Third Day',
      'The Fourth Day', 'The Fifth Day', 'The Sixth Day', 'The Edenic Covenant',
    ]);
  });
});

describe('noteless chapters — full reader, no dead end', () => {
  it('Exodus 1 has no commentary data, yet the display model covers every verse', () => {
    expect(getChapterData('Exodus', 1)).toBeNull();
    const sections = buildDisplaySections(null, 22);
    const flat = flattenEntries(sections);
    expect(flat.every((f) => f.entry.verseOnly)).toBe(true);
    const covered = new Set<number>();
    for (const f of flat) for (let v = f.entry.start; v <= f.entry.end; v++) covered.add(v);
    expect(covered.size).toBe(22);
  });

  it('Stories on a noteless chapter inserts no notes or highlight screens', () => {
    const screens = buildStoryScreens(buildDisplaySections(null, 22));
    expect(screens.some((s) => s.t === 'notes' || s.t === 'highlight')).toBe(false);
    expect(screens.filter((s) => s.t === 'verse').length).toBeGreaterThan(0);
  });

  it('search on a noteless chapter answers from scripture only', () => {
    const verses = [
      { verse: 1, text: 'Now these are the names of the children of Israel' },
      { verse: 2, text: 'Reuben, Simeon, Levi, and Judah' },
    ];
    const hits = searchChapter(buildDisplaySections(null, 2), verses, 'Reuben');
    expect(hits.length).toBe(1);
    expect(hits[0].tier).toBe('scripture');
  });
});

describe('Stories derivation — 1 Corinthians 1', () => {
  it('every noted entry gets a notes screen; a Highlight-led entry gets the highlight screen', () => {
    const ch = getChapterData('1 Corinthians', 1)!;
    const sections = buildDisplaySections(ch, 31);
    const screens = buildStoryScreens(sections);
    expect(screens[0].t).toBe('cover');
    expect(screens[screens.length - 1].t).toBe('end');
    expect(screens.filter((s) => s.t === 'section').length).toBe(6);
    expect(screens.filter((s) => s.t === 'verse').length).toBe(18);
    const hl = screens.filter((s) => s.t === 'highlight');
    expect(hl.length).toBeGreaterThan(0);
    expect(hl.some((s) => s.t === 'highlight' && s.entry.start === 21)).toBe(true);
    const notedEntries = flattenEntries(sections).filter((f) => !f.entry.verseOnly).length;
    expect(screens.filter((s) => s.t === 'notes').length + hl.length).toBe(notedEntries);
  });
});

describe('v206 — the Notion seed is cleared; only app progress counts', () => {
  it('(a) the shipped seed is inert and a fresh store claims nothing', () => {
    // v205 pinned the CSV tallies here (Genesis 28 complete, Exodus all
    // Write, Psalms tracked 40, both queues 7). His ruling cleared the
    // import wholesale — the seed now ships empty and can assert
    // nothing, for any book.
    expect(STUDY_SEED.statuses).toEqual({});
    expect(STUDY_SEED.trackedChapters).toEqual({});
    expect(STUDY_SEED.writeQueue).toEqual([]);
    expect(STUDY_SEED.restudyQueue).toEqual([]);
    const state = seedStudyState();
    expect(state.writeQueue).toEqual([]);
    expect(state.restudyQueue).toEqual([]);
    // A sample across the canon — including the chapters the v205 seed
    // spoke loudest about — every one reports no status at all.
    for (const [book, chapter] of [
      ['Genesis', 1], // seed said Complete
      ['Exodus', 1], // seed said Write
      ['1 John', 1], // both seeded queues named it
      ['Psalms', 23],
      ['Numbers', 1],
    ] as const) {
      expect(chapterStatus(state, book, chapter)).toBe('none');
    }
  });

  it('queue membership speaks only when HE queued it in the app', () => {
    let state = seedStudyState();
    expect(chapterStatus(state, '1 John', 1)).toBe('none');
    state = setChapterStatus(state, '1 John', 1, 'write');
    expect(chapterStatus(state, '1 John', 1)).toBe('write');
    state = setChapterStatus(state, '1 John', 1, 'restudy');
    expect(chapterStatus(state, '1 John', 1)).toBe('restudy');
    expect(state.writeQueue.some((q) => q.book === '1 John' && q.chapter === 1)).toBe(false);
  });

  it('in-app transitions move chapters through the pipeline and the queues follow', () => {
    let state = seedStudyState();
    state = setChapterStatus(state, '1 John', 1, 'write');
    expect(state.writeQueue.some((q) => q.book === '1 John' && q.chapter === 1)).toBe(true);
    state = setChapterStatus(state, '1 John', 1, 'complete');
    expect(chapterStatus(state, '1 John', 1)).toBe('complete');
    expect(state.writeQueue.some((q) => q.book === '1 John' && q.chapter === 1)).toBe(false);
    state = setChapterStatus(state, '1 John', 1, 'restudy');
    expect(state.restudyQueue.some((q) => q.book === '1 John' && q.chapter === 1)).toBe(true);
    state = setChapterStatus(state, 'Genesis', 30, 'write');
    expect(state.writeQueue.some((q) => q.book === 'Genesis' && q.chapter === 30)).toBe(true);
  });

  it('(b) the cleanup strips exactly the seeded queue entries and preserves his own', () => {
    // A v205-era stored state: both queues hold the seven imported
    // Johannine entries; he has since queued Genesis 30 himself and
    // his migrated completes live in overrides.
    const seeded = [
      { book: '3 John', chapter: 1 },
      { book: '2 John', chapter: 1 },
      { book: '1 John', chapter: 5 },
      { book: '1 John', chapter: 4 },
      { book: '1 John', chapter: 3 },
      { book: '1 John', chapter: 2 },
      { book: '1 John', chapter: 1 },
    ];
    const dirty = {
      overrides: { 'Genesis|1': 'complete' as const, 'Exodus|2': 'complete' as const },
      writeQueue: [...seeded, { book: 'Genesis', chapter: 30 }],
      restudyQueue: [...seeded],
      migratedUnified: true,
    };
    const cleaned = stripNotionSeedQueues(dirty);
    expect(cleaned.writeQueue).toEqual([{ book: 'Genesis', chapter: 30 }]);
    expect(cleaned.restudyQueue).toEqual([]);
    expect(cleaned.overrides).toEqual(dirty.overrides);
    expect(cleaned.clearedNotionSeed).toBe(true);
    expect(chapterStatus(cleaned, 'Genesis', 1)).toBe('complete');
    expect(chapterStatus(cleaned, '1 John', 1)).toBe('none');
  });

  it('(b) loadStudyState runs the cleanup once on a stored v205 state and persists it', async () => {
    const seeded = [
      { book: '3 John', chapter: 1 },
      { book: '2 John', chapter: 1 },
      { book: '1 John', chapter: 5 },
      { book: '1 John', chapter: 4 },
      { book: '1 John', chapter: 3 },
      { book: '1 John', chapter: 2 },
      { book: '1 John', chapter: 1 },
    ];
    store.set(STUDY_KEY, JSON.stringify({
      overrides: { 'Genesis|30': 'complete' },
      writeQueue: seeded,
      restudyQueue: seeded,
      migratedUnified: true,
    }));
    const state = await loadStudyState();
    expect(state.writeQueue).toEqual([]);
    expect(state.restudyQueue).toEqual([]);
    expect(chapterStatus(state, 'Genesis', 30)).toBe('complete');
    const persisted = JSON.parse(store.get(STUDY_KEY)!) as { clearedNotionSeed?: boolean };
    expect(persisted.clearedNotionSeed).toBe(true);
  });

  it('(c) setting none on a seeded-era chapter clears it — the grid undo', () => {
    // Simulate the pre-cleanup store: 1 John 1 sits in both queues (its
    // v205 "status" came from queue membership alone).
    let state: StudyState = {
      overrides: {},
      writeQueue: [{ book: '1 John', chapter: 1 }],
      restudyQueue: [{ book: '1 John', chapter: 1 }],
      migratedUnified: true,
      clearedNotionSeed: true,
    };
    expect(chapterStatus(state, '1 John', 1)).toBe('restudy');
    state = setChapterStatus(state, '1 John', 1, 'none');
    expect(chapterStatus(state, '1 John', 1)).toBe('none');
    expect(state.writeQueue).toEqual([]);
    expect(state.restudyQueue).toEqual([]);
  });

  it('(c) the book grid detail strip offers all six statuses, none included', () => {
    const src = readFileSync(join(process.cwd(), 'app', 'bible-book.tsx'), 'utf8');
    expect(src).toContain('STATUS_EDITOR_ORDER');
    for (const s of ['write', 'in-progress', 'complete', 'restudy', 'not-started', 'none']) {
      expect(src).toContain(`'${s}'`);
    }
    expect(src).toContain('applyStatus(s)');
    // The v205 "database tracks" note died with the seed it described.
    expect(src).not.toContain('database tracks');
    expect(src).not.toContain('STUDY_SEED');
  });

  it('(d) Books grouping: notes-bearing books are not progress until he marks them', () => {
    const canon = Object.keys(CHAPTER_COUNTS);
    const fresh = seedStudyState();
    // 1 John carries his finished notes — visible under Chapter notes,
    // never under progress while he has set nothing.
    expect(notesBooks(canon)).toContain('1 John');
    expect(booksWithProgress(fresh, canon)).toEqual([]);
    const marked = setChapterStatus(fresh, '1 John', 1, 'complete');
    expect(booksWithProgress(marked, canon)).toEqual(['1 John']);
    const src = readFileSync(join(process.cwd(), 'app', 'bible-chapters.tsx'), 'utf8');
    expect(src).toContain('Study progress');
    expect(src).toContain('booksWithProgress');
    expect(src).not.toContain('databases');
    expect(src).not.toContain('of the 40 the list tracks');
    expect(src).not.toContain('no status list');
    expect(src).not.toContain('databaseBooks');
  });

  it('(e) the schedule card expansion carries his last-read record from the unified store', () => {
    const unified = {
      chapters: [
        { book: 'Genesis', chapter: 1, isRead: true, readDate: '2026-10-18' },
        { book: 'Genesis', chapter: 2, isRead: true, readDate: '2026-10-19' },
        { book: 'Genesis', chapter: 3, isRead: true, readDate: '2026-10-20' },
        { book: 'Genesis', chapter: 4, isRead: true, readDate: '2026-10-20' },
        { book: 'Genesis', chapter: 5, isRead: false },
      ],
      bookStatuses: { Genesis: 'current' },
      lastReadDate: '2026-10-20',
    } as unknown as UnifiedBibleState;
    expect(getLastReadPosition(unified)).toEqual({ book: 'Genesis', chapter: 4, date: '2026-10-20' });
    expect(getCurrentBibleDisplay(unified)).toBe('Genesis 5');
    const src = readFileSync(join(process.cwd(), 'components', 'schedule-tab.tsx'), 'utf8');
    expect(src).toContain('getLastReadPosition');
    // v209: the v206 two-line "Last time: / This time:" position block
    // is gone. In its place, ONE muted line built from the actual
    // last-read record: "Last read <book> <chapter> · <date>".
    expect(src).toContain('`Last read ${lastPos.book} ${lastPos.chapter}');
    expect(src).not.toContain('`Last time: ${');
    expect(src).not.toContain('`This time: ${');
    expect(src).not.toContain('item.data.lastTime');
    expect(src).not.toContain('item.data.thisTime');
    // The last-read line renders only when a record exists, and the
    // expansion still opens for it alone (no-preview fallback).
    expect(src).toContain('item.data.lastRead ? (');
    expect(src).toContain('isPersonalStudyExpanded && (item.data.preview || item.data.lastRead)');
  });
});

describe('migration — pre-v205 check-offs, Complete wins', () => {
  it('merges unified reads into the states; nothing imported is left to conflict with', () => {
    // v206: the merge is unchanged (his in-app check-offs are exactly
    // what counts), but the v205 conflict log compared reads against
    // the Notion seed — seed cleared, conflicts are empty by shape.
    const { state, migrated, conflicts } = mergeUnifiedReads(seedStudyState(), [
      { book: 'Exodus', chapter: 1 },
      { book: 'Genesis', chapter: 1 },
      { book: '1 John', chapter: 2 },
    ]);
    expect(chapterStatus(state, 'Exodus', 1)).toBe('complete');
    expect(chapterStatus(state, 'Genesis', 1)).toBe('complete');
    expect(chapterStatus(state, '1 John', 2)).toBe('complete');
    expect(migrated).toEqual([
      { book: 'Exodus', chapter: 1 },
      { book: 'Genesis', chapter: 1 },
      { book: '1 John', chapter: 2 },
    ]);
    expect(conflicts).toEqual([]);
    expect(state.migratedUnified).toBe(true);
  });

  it('parses the oldest store ids ("Book-N") back into chapters', () => {
    expect(parseLegacyReadIds(['Genesis-3', 'Song of Solomon-2', 'junk', 42, 'Psalms-23'])).toEqual([
      { book: 'Genesis', chapter: 3 },
      { book: 'Song of Solomon', chapter: 2 },
      { book: 'Psalms', chapter: 23 },
    ]);
  });
});

describe('rewards — the existing schedule pays through the new states', () => {
  it('(a) a chapter completed before v205 does NOT re-pay its +25 XP', async () => {
    // The old check-off page paid Exodus 1 under the DASH key — the
    // exact case where a naive new system would pay it a second time.
    store.set(XP_AWARDS_STORAGE_KEY, JSON.stringify(['daily-reading:Exodus-1']));
    const result = await transitionChapterStatus(seedStudyState(), 'Exodus', 1, 'complete');
    expect(result.chapterXpAwarded).toBe(false);
    expect((await loadXPState()).totalXP).toBe(0);
    // The colon spelling is stamped too, so no future path can pay it either.
    const ledger = JSON.parse(store.get(XP_AWARDS_STORAGE_KEY)!) as string[];
    expect(ledger).toContain('daily-reading:Exodus:1');
  });

  it('(b) completing a chapter in the new UI pays exactly once', async () => {
    const first = await transitionChapterStatus(seedStudyState(), 'Genesis', 30, 'complete');
    expect(first.chapterXpAwarded).toBe(true);
    const afterFirst = (await loadXPState()).totalXP;
    expect(afterFirst).toBeGreaterThanOrEqual(25);
    const ledger = JSON.parse(store.get(XP_AWARDS_STORAGE_KEY)!) as string[];
    expect(ledger).toContain('daily-reading:Genesis:30');
    // Move it away and back — the ledger, not the state, has the last word.
    const away = await transitionChapterStatus(first.state, 'Genesis', 30, 'write');
    const back = await transitionChapterStatus(away.state, 'Genesis', 30, 'complete');
    expect(back.chapterXpAwarded).toBe(false);
    expect((await loadXPState()).totalXP).toBe(afterFirst);
  });

  it('finishing a book pays the +100 book bonus once and reports the celebration', async () => {
    const result = await transitionChapterStatus(seedStudyState(), 'Obadiah', 1, 'complete');
    expect(result.bookCompleted).toBe('Obadiah');
    expect(result.bibleCompleted).toBe(false);
    const ledger = JSON.parse(store.get(XP_AWARDS_STORAGE_KEY)!) as string[];
    expect(ledger).toContain('book-complete:book:Obadiah');
    expect((await loadXPState()).totalXP).toBeGreaterThanOrEqual(125);
  });

  it('Write and ReStudy transitions pay nothing', async () => {
    const w = await transitionChapterStatus(seedStudyState(), 'Genesis', 7, 'write');
    expect(w.chapterXpAwarded).toBe(false);
    const r = await transitionChapterStatus(seedStudyState(), 'Genesis', 7, 'restudy');
    expect(r.chapterXpAwarded).toBe(false);
    expect((await loadXPState()).totalXP).toBe(0);
  });
});

describe('marks — a separate layer that re-imports cannot wipe', () => {
  it('kept defaults follow his Highlights; toggles, lines, tints and categories persist by reference', async () => {
    let marks: MarksMap = {};
    // vv.26-29 carry a Highlight in the source — kept before he touches anything.
    expect(isKept(marks, '1 Corinthians', 1, 26, 29, true)).toBe(true);
    expect(isKept(marks, '1 Corinthians', 1, 4, 4, false)).toBe(false);
    marks = toggleKept(marks, '1 Corinthians', 1, 4, 4, false);
    marks = addKeeperLine(marks, '1 Corinthians', 1, 4, 4, 'highlight', 'My own line.');
    marks = withMarks(marks, '1 Corinthians', 1, 4, 4, { tint: 'rose', category: 'personal-story' });
    await saveMarks(marks);
    // A commentary re-import rebuilds the data files; the marks store
    // is a different key entirely, keyed by entry reference.
    const loaded = await loadMarks();
    const m = marksFor(loaded, '1 Corinthians', 1, 4, 4);
    expect(m.kept).toBe(true);
    expect(m.highlights).toEqual(['My own line.']);
    expect(m.tint).toBe('rose');
    expect(m.category).toBe('personal-story');
  });
});

describe('read-only mode — the noteless reader on every chapter', () => {
  it('a chapter WITH notes renders zero commentary in read-only, verses and screens intact', () => {
    const ch = getChapterData('1 Corinthians', 1)!;
    const ro = buildReadOnlySections(ch, 31);
    const flat = flattenEntries(ro);
    expect(flat).toHaveLength(31);
    expect(flat.every((f) => f.entry.blocks.length === 0 && f.entry.verseOnly)).toBe(true);
    // Section breaks follow his stories groupings (ranges only, no titles).
    expect(ro.every((s) => s.title === null)).toBe(true);
    expect(ro.map((s) => `${s.start}-${s.end}`)).toEqual(
      ch.stories.map((r) => `${r.start}-${r.end}`),
    );
    expect(ro).toHaveLength(18);
    const screens = buildStoryScreens(ro);
    expect(screens.some((s) => s.t === 'notes' || s.t === 'highlight')).toBe(false);
    expect(screens.filter((s) => s.t === 'verse')).toHaveLength(31);
  });

  it('read-only search cannot surface commentary — the Highlight phrase finds nothing', () => {
    const ch = getChapterData('1 Corinthians', 1)!;
    const verses = embeddedVerses('1 Corinthians', 1)!;
    expect(verses.length).toBe(31);
    const notes = buildDisplaySections(ch, 31);
    const withNotes = searchChapter(notes, verses, 'preaching is foolish');
    expect(withNotes.some((h) => h.tier === 'highlight')).toBe(true);
    const ro = buildReadOnlySections(ch, 31);
    const readOnlyHits = searchChapter(ro, verses, 'preaching is foolish');
    expect(readOnlyHits.every((h) => h.tier === 'scripture')).toBe(true);
  });
});

describe('categories — his color code', () => {
  it('exactly five categories exist, in his colors, with his meanings', () => {
    expect(NOTE_CATEGORIES.map((c) => c.id)).toEqual([
      'definition',
      'quote',
      'good-thought',
      'conversation',
      'personal-story',
    ]);
  });

  it('a Highlight block is the yellow class; imported prose is uncategorized — never guessed', () => {
    expect(blockCategory({ kind: 'highlight', text: 'x' })).toBe('good-thought');
    expect(blockCategory({ kind: 'para', text: 'Blue is a color some people like.' })).toBeNull();
    expect(blockCategory({ kind: 'para', text: 'x', category: 'definition' })).toBe('definition');
  });

  it('good thoughts are browsable as their own class — his speaking material', () => {
    const ch = getChapterData('1 Corinthians', 1)!;
    const sections = buildDisplaySections(ch, 31);
    const hits = browseCategory(sections, [], '1 Corinthians', 1, 'good-thought', new Map());
    const starts = hits.map((h) => h.entry.start);
    expect(starts).toContain(21);
    expect(starts).toContain(26);
    expect(hits.find((h) => h.entry.start === 21)!.display).toBe(PIN_HL_21);
  });

  it('his in-app category marks are browsable the same way', () => {
    const ch = getChapterData('1 Corinthians', 1)!;
    const sections = buildDisplaySections(ch, 31);
    const user = new Map<string, NoteCategory | null>([['1 Corinthians|1|4-4', 'definition']]);
    const hits = browseCategory(sections, [], '1 Corinthians', 1, 'definition', user);
    expect(hits.map((h) => h.entry.start)).toEqual([4]);
  });
});

describe('for every user — labels and the fresh-profile shape', () => {
  it('possessives come from the profile name, never hard-coded', () => {
    expect(possessiveFor('Jonathan')).toEqual({ possessive: "Jonathan's", possessiveLower: "Jonathan's" });
    expect(possessiveFor('')).toEqual({ possessive: 'Your', possessiveLower: 'your' });
  });

  it('a fresh profile gets sensible defaults: Your + Handwritten notes', async () => {
    const labels = await loadUserLabels();
    expect(labels.firstName).toBe('');
    expect(labels.possessive).toBe('Your');
    expect(labels.sourceLabel).toBe('Handwritten notes');
  });

  it('a book with no notes, no seed and no marks still reads whole (Numbers)', () => {
    expect(getChapterData('Numbers', 1)).toBeNull();
    expect(chapterCountFor('Numbers')).toBe(36);
    const sections = buildDisplaySections(null, 54);
    const covered = new Set<number>();
    for (const f of flattenEntries(sections)) {
      for (let v = f.entry.start; v <= f.entry.end; v++) covered.add(v);
    }
    expect(covered.size).toBe(54);
    expect(chapterStatus(seedStudyState(), 'Numbers', 1)).toBe('none');
  });
});

describe('v207 — the storyteller returns, baked in; bare chapters chunk; the top inset', () => {
  const FIXTURE: Record<string, Record<number, { recap: string; preview: string; question: string }>> = {
    Leviticus: {
      19: {
        recap: 'God claimed Israel as His own and began setting the terms of the covenant.',
        preview: 'Moses lays out holiness for everyday life — fields, neighbors, and honest scales.',
        question: 'Will Israel actually live set apart?',
      },
    },
    Exodus: {
      1: {
        recap: 'Joseph and his brothers died in Egypt, but their families multiplied exceedingly.',
        preview: 'A new Pharaoh who never knew Joseph turns to oppression and a deadly decree.',
        question: 'Will Pharaoh crush Israel — or multiply it?',
      },
    },
    Genesis: {
      1: {
        recap: 'There is nothing before this — no last time.',
        preview: 'God speaks light, sky, land, and life into being, day by day.',
        question: 'What will He make of the man He forms?',
      },
    },
  };

  it('composes the three storyteller sections with the labels built from the right chapters', () => {
    const mid = composePreview('Leviticus', 19, FIXTURE);
    expect(mid).not.toBeNull();
    expect(mid!.lastLabel).toBe('Last time in Leviticus 18:');
    expect(mid!.lastText).toBe(FIXTURE.Leviticus[19].recap);
    expect(mid!.thisLabel).toBe('This time in Leviticus 19:');
    expect(mid!.thisText).toBe(FIXTURE.Leviticus[19].preview);
    expect(mid!.question).toBe(FIXTURE.Leviticus[19].question);

    // Chapter 1: the "last time" crosses into the previous book's
    // final chapter (canon order, full chapter count).
    const first = composePreview('Exodus', 1, FIXTURE);
    expect(first!.lastLabel).toBe('Last time in Genesis 50:');
    expect(first!.thisLabel).toBe('This time in Exodus 1:');

    // Genesis 1 has no last time at all.
    const gen = composePreview('Genesis', 1, FIXTURE);
    expect(gen!.lastLabel).toBeNull();
    expect(gen!.lastText).toBeNull();
    expect(gen!.thisLabel).toBe('This time in Genesis 1:');
    expect(gen!.question).toBe(FIXTURE.Genesis[1].question);
  });

  it('graceful absence: a chapter with no baked preview composes to null', () => {
    // Against the fixture the shape is unchanged: a missing entry
    // composes to null.
    expect(composePreview('Leviticus', 20, FIXTURE)).toBeNull();
    expect(composePreview('Judges', 1, FIXTURE)).toBeNull();
    // v208 completed the bake (see the v208 describe below): the live
    // module now carries every chapter, so graceful absence applies
    // only to a hypothetical missing entry — an out-of-canon chapter
    // or an unknown book still composes to null, never a crash.
    expect(typeof PREVIEWS).toBe('object');
    const any = previewFor('Leviticus', 19);
    expect(any).not.toBeNull();
    expect(any!.thisLabel).toBe('This time in Leviticus 19:');
    expect(any!.lastLabel).toBe('Last time in Leviticus 18:');
    expect(previewFor('Leviticus', 99)).toBeNull();
    expect(previewFor('Not A Book', 1)).toBeNull();
  });

  it('the generator script embeds fixture books and skips malformed entries', () => {
    const dir = mkdtempSync(join(tmpdir(), 'v207-previews-'));
    try {
      writeFileSync(
        join(dir, 'Leviticus.json'),
        JSON.stringify({
          '19': FIXTURE.Leviticus[19],
          '20': { recap: '', preview: 'half-written', question: 'Skipped?' },
        }),
      );
      const outFile = join(dir, 'previews.ts');
      execFileSync('node', [join(process.cwd(), 'scripts', 'gen-previews.mjs')], {
        env: { ...process.env, PREVIEWS_DIR: dir, PREVIEWS_OUT: outFile },
        stdio: 'pipe',
      });
      const out = readFileSync(outFile, 'utf8');
      expect(out).toContain('"Leviticus"');
      expect(out).toContain('Will Israel actually live set apart?');
      expect(out).not.toContain('half-written');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('the card reads the baked preview and its Read button targets the NEW chapter page', () => {
    const src = readFileSync(join(process.cwd(), 'components', 'schedule-tab.tsx'), 'utf8');
    // Baked data, composed locally for the card's read target.
    expect(src).toContain("from \"@/lib/bible-v205/preview\"");
    expect(src).toContain('previewFor(readTarget.book, readTarget.chapter)');
    expect(src).toContain('item.data.preview.lastLabel');
    expect(src).toContain('item.data.preview.thisLabel');
    expect(src).toContain('item.data.preview.question');
    // The Read Chapter button opens this-time's chapter in the v205
    // chapter page route — not the retired viewer or tracker.
    expect(src).toContain('Read Chapter');
    expect(src).toContain("pathname: '/bible-chapter'");
    expect(src).toContain('params: { book: item.data.readTarget.book, chapter: String(item.data.readTarget.chapter) }');
    // The live server fetch is retired from the card for good.
    expect(src).not.toContain('client.bible.getChapterSummary');
    expect(src).not.toContain('createTRPCClient');
    expect(src).not.toContain('chapter-summary-');
  });

  it('v209: Read Chapter lives in the card header (left of the chevron), not the expanded body', () => {
    const src = readFileSync(join(process.cwd(), 'components', 'schedule-tab.tsx'), 'utf8');
    const cardStart = src.indexOf('case "personal-study-card"');
    const cardEnd = src.indexOf('case "time-off"', cardStart);
    expect(cardStart).toBeGreaterThan(-1);
    expect(cardEnd).toBeGreaterThan(cardStart);
    const card = src.slice(cardStart, cardEnd);

    // Exactly ONE Read Chapter control on the card.
    const labelHits = card.match(/accessibilityLabel=\{`Read Chapter — /g) ?? [];
    expect(labelHits).toHaveLength(1);

    // It renders in the header: before the chevron toggle and before
    // the expanded-body block — so it is visible whether the card is
    // collapsed or expanded.
    const readIdx = card.indexOf('Read Chapter — ');
    const chevronIdx = card.indexOf('Collapse Personal Study');
    const bodyIdx = card.indexOf('isPersonalStudyExpanded && (item.data.preview');
    expect(readIdx).toBeGreaterThan(-1);
    expect(chevronIdx).toBeGreaterThan(-1);
    expect(bodyIdx).toBeGreaterThan(-1);
    expect(readIdx).toBeLessThan(chevronIdx);
    expect(readIdx).toBeLessThan(bodyIdx);

    // The expanded body no longer carries the button.
    expect(card.slice(bodyIdx)).not.toContain('Read Chapter');

    // And it still navigates to this-time's chapter in the v205 page.
    expect(card).toContain("pathname: '/bible-chapter'");
    expect(card).toContain('params: { book: item.data.readTarget.book, chapter: String(item.data.readTarget.chapter) }');
  });

  it('bare chapter (Judges 1 — no commentary data at all) chunks into ≤3-verse Stories slides', () => {
    expect(getChapterData('Judges', 1)).toBeNull();
    expect(isBareChapter(null)).toBe(true);
    expect(isBareChapter(getChapterData('Judges', 1))).toBe(true);
    const verseCount = 36; // Judges 1, KJV
    const sections = buildDisplaySections(null, verseCount);
    const entries = flattenEntries(sections).map((f) => f.entry);
    expect(entries).toHaveLength(Math.ceil(verseCount / BARE_STORY_CHUNK));
    expect(entries.every((e) => e.end - e.start + 1 <= BARE_STORY_CHUNK)).toBe(true);
    // Every verse covered exactly once, in order.
    const covered: number[] = [];
    for (const e of entries) for (let v = e.start; v <= e.end; v++) covered.push(v);
    expect(covered).toEqual(Array.from({ length: verseCount }, (_, i) => i + 1));
    // And Stories paces by those chunks — no notes/highlight screens.
    const screens = buildStoryScreens(sections);
    expect(screens.filter((s) => s.t === 'verse')).toHaveLength(12);
    expect(screens.some((s) => s.t === 'notes' || s.t === 'highlight')).toBe(false);
  });

  it('grouped-but-noteless chapters keep HIS groupings — no chunking (Ecclesiastes 3)', () => {
    const ch = getChapterData('Ecclesiastes', 3);
    expect(ch).not.toBeNull();
    expect(isBareChapter(ch)).toBe(false);
    const sections = buildDisplaySections(ch, 22);
    expect(sections.map((s) => [s.start, s.end])).toEqual([[1, 15], [16, 22]]);
    const screens = buildStoryScreens(sections);
    const verseRanges = screens
      .filter((s) => s.t === 'verse')
      .map((s) => (s.t === 'verse' ? [s.entry.start, s.entry.end] : null));
    expect(verseRanges).toEqual([[1, 15], [16, 22]]);
    const sectionTitles = screens.filter((s) => s.t === 'section').map((s) => (s.t === 'section' ? s.title : null));
    expect(sectionTitles).toEqual(['A Season For Everything', 'Everything Is The Same']);
  });

  it('with-notes chapters derive exactly as before — chunking never touches them (1 Corinthians 1)', () => {
    const ch = getChapterData('1 Corinthians', 1);
    expect(ch).not.toBeNull();
    expect(isBareChapter(ch)).toBe(false);
    const sections = buildDisplaySections(ch, 31);
    const expectedNoted = ch!.sections.flatMap((s) => s.entries.map((e) => [e.start, e.end] as [number, number]));
    const actualNoted = flattenEntries(sections)
      .filter((f) => f.entry.blocks.length > 0)
      .map((f) => [f.entry.start, f.entry.end] as [number, number]);
    expect(actualNoted).toEqual(expectedNoted);
    const screens = buildStoryScreens(sections);
    expect(screens.filter((s) => s.t === 'section')).toHaveLength(6);
    expect(screens.filter((s) => s.t === 'verse')).toHaveLength(18);
  });

  it('read-only Stories on a bare chapter chunks too — the reader itself stays per-verse', () => {
    const ro = buildReadOnlySections(null, 36);
    // The pinned read-only shape: one entry per verse.
    expect(flattenEntries(ro)).toHaveLength(36);
    const merged = mergeVerseOnlyEntries(ro);
    const entries = flattenEntries(merged).map((f) => f.entry);
    expect(entries).toHaveLength(12);
    expect(entries.every((e) => e.end - e.start + 1 <= BARE_STORY_CHUNK)).toBe(true);
    expect(buildStoryScreens(merged).filter((s) => s.t === 'verse')).toHaveLength(12);
    // Merges never cross a section boundary.
    const two = mergeVerseOnlyEntries([
      { start: 1, end: 2, title: 'A', entries: [
        { start: 1, end: 1, blocks: [], verseOnly: true },
        { start: 2, end: 2, blocks: [], verseOnly: true },
      ] },
      { start: 3, end: 4, title: 'B', entries: [
        { start: 3, end: 3, blocks: [], verseOnly: true },
        { start: 4, end: 4, blocks: [], verseOnly: true },
      ] },
    ]);
    expect(two.map((s) => s.entries.map((e) => [e.start, e.end]))).toEqual([[[1, 2]], [[3, 4]]]);
    // The chapter page hands Stories the merged sections only in
    // read-only mode on a bare chapter.
    const pageSrc = readFileSync(join(process.cwd(), 'components', 'bible-v205', 'chapter-page.tsx'), 'utf8');
    expect(pageSrc).toContain('readOnly && isBareChapter(chapterData) ? mergeVerseOnlyEntries(sections) : sections');
    expect(pageSrc).toContain('sections={storySections}');
  });

  it('every Bible-section screen applies the top safe-area inset', () => {
    const files = [
      'app/bible-chapters.tsx',
      'app/bible-book.tsx',
      'app/bible-queue.tsx',
      'components/bible-v205/chapter-page.tsx',
      'components/bible-v205/stories-view.tsx',
    ];
    for (const f of files) {
      const src = readFileSync(join(process.cwd(), f), 'utf8');
      expect(src, f).toContain('useSafeAreaInsets');
      expect(src, f).toContain('insets.top');
    }
    const chapters = readFileSync(join(process.cwd(), 'app', 'bible-chapters.tsx'), 'utf8');
    expect(chapters).toContain('paddingTop: insets.top + 8');
    const book = readFileSync(join(process.cwd(), 'app', 'bible-book.tsx'), 'utf8');
    expect(book).toContain('paddingTop: insets.top + 8');
    const page = readFileSync(join(process.cwd(), 'components', 'bible-v205', 'chapter-page.tsx'), 'utf8');
    expect(page).toContain('paddingTop: insets.top + 8');
    const stories = readFileSync(join(process.cwd(), 'components', 'bible-v205', 'stories-view.tsx'), 'utf8');
    expect(stories).toContain('paddingTop: insets.top + 13');
  });
});

describe('v208 — the full bake: every book, every chapter', () => {
  it('PREVIEWS covers the whole canon — 66 books, 1,189 chapters, none missing', () => {
    const books = Object.keys(CHAPTER_COUNTS);
    expect(books).toHaveLength(66);
    expect(Object.keys(PREVIEWS).sort()).toEqual([...books].sort());
    let total = 0;
    for (const book of books) {
      const count = CHAPTER_COUNTS[book];
      const chapters = PREVIEWS[book];
      expect(chapters, book).toBeDefined();
      expect(Object.keys(chapters), book).toHaveLength(count);
      for (let c = 1; c <= count; c++) {
        const entry = chapters[c];
        expect(entry, `${book} ${c}`).toBeDefined();
        expect(typeof entry.preview, `${book} ${c} preview`).toBe('string');
        expect(entry.preview.trim(), `${book} ${c} preview`).not.toBe('');
        expect(typeof entry.question, `${book} ${c} question`).toBe('string');
        expect(entry.question.trim(), `${book} ${c} question`).not.toBe('');
        expect(typeof entry.recap, `${book} ${c} recap`).toBe('string');
        // Genesis 1 is the one designed empty recap; every other
        // chapter carries all three beats.
        if (!(book === 'Genesis' && c === 1)) {
          expect(entry.recap.trim(), `${book} ${c} recap`).not.toBe('');
        }
        total++;
      }
    }
    expect(total).toBe(1189);
  });

  it('every chapter of the canon composes to a well-formed preview', () => {
    for (const book of Object.keys(CHAPTER_COUNTS)) {
      for (let c = 1; c <= CHAPTER_COUNTS[book]; c++) {
        const composed = previewFor(book, c);
        expect(composed, `${book} ${c}`).not.toBeNull();
        expect(composed!.thisLabel).toBe(`This time in ${book} ${c}:`);
        expect(composed!.thisText).toBe(PREVIEWS[book][c].preview);
        expect(composed!.question).toBe(PREVIEWS[book][c].question);
        // The "last time" exists for everything except Genesis 1.
        if (book === 'Genesis' && c === 1) {
          expect(composed!.lastLabel).toBeNull();
          expect(composed!.lastText).toBeNull();
        } else {
          expect(composed!.lastLabel, `${book} ${c}`).not.toBeNull();
          expect(composed!.lastText).toBe(PREVIEWS[book][c].recap);
        }
      }
    }
  });

  it('spot compositions: Leviticus 19 unchanged, Exodus 1 crosses books, Revelation 22 closes the canon', () => {
    // The chapter he is reading now — byte-identical text to the
    // v207 bake, composed onto the same labels.
    const lev = previewFor('Leviticus', 19);
    expect(lev!.lastLabel).toBe('Last time in Leviticus 18:');
    expect(lev!.thisLabel).toBe('This time in Leviticus 19:');
    expect(lev!.thisText).toContain('love thy neighbour as thyself');
    expect(lev!.thisText).toBe(PREVIEWS['Leviticus'][19].preview);

    // A newly-baked book's chapter 1: the recap reaches back across
    // the book boundary to Genesis 50.
    const exo = previewFor('Exodus', 1);
    expect(exo!.lastLabel).toBe('Last time in Genesis 50:');
    expect(exo!.lastText).toBe(PREVIEWS['Exodus'][1].recap);
    expect(exo!.lastText).toContain('Joseph');
    expect(exo!.thisLabel).toBe('This time in Exodus 1:');

    // The canon's final chapter composes like any other.
    const rev = previewFor('Revelation', 22);
    expect(rev!.lastLabel).toBe('Last time in Revelation 21:');
    expect(rev!.thisLabel).toBe('This time in Revelation 22:');
    expect(rev!.question.endsWith('?')).toBe(true);
  });
});

describe("v210 — '#' verse splitting: a note's leading #N / #N-M sets those verses apart", () => {
  // His real note, written on the Leviticus 19 entry spanning 10–12
  // (Leviticus has no data file — its entries are the renderer's
  // 3-verse chunks, so the fixture runs the real pipeline).
  const LEV_NOTE = '#11-12 Interesting... Some Pastors fit this description far too well.';
  const levMarks = (highlights: string[]): MarksMap => ({
    'Leviticus|19|10-12': { ...emptyMarks(), highlights },
  });
  const bare = (start: number, end: number): DisplayEntry => ({ start, end, blocks: [], verseOnly: true });

  it('parser: strict shapes only', () => {
    expect(parseHashVerseRef('#11-12 Interesting...')).toEqual({ start: 11, end: 12 });
    expect(parseHashVerseRef('#11–12 Interesting...')).toEqual({ start: 11, end: 12 }); // en dash
    expect(parseHashVerseRef('#11 Interesting...')).toEqual({ start: 11, end: 11 });
    expect(parseHashVerseRef('#11-12')).toEqual({ start: 11, end: 12 }); // end-of-string
    expect(parseHashVerseRef('## Previously: the story so far')).toBeNull(); // markdown heading
    expect(parseHashVerseRef('The #1 thing is prayer')).toBeNull(); // "number one", mid-text
    expect(parseHashVerseRef('#11-12Interesting')).toBeNull(); // no whitespace after the ref
    expect(parseHashVerseRef('#12-11 backwards')).toBeNull(); // reversed range
    expect(parseHashVerseRef(' #11-12 leading space')).toBeNull(); // not start-anchored
    expect(parseHashVerseRef('')).toBeNull();
  });

  it('(a) Lev 19 shape: entry 10–12 + "#11-12 …" → [10] and [11–12 with the note]', () => {
    const sections = buildDisplaySections(null, 37);
    const stored = levMarks([LEV_NOTE]);
    const { sections: split, marks: display } = splitSectionsByHashNotes(sections, stored, 'Leviticus', 19);
    const spans = split[0].entries.map((e) => [e.start, e.end]);
    expect(spans).toContainEqual([10, 10]);
    expect(spans).toContainEqual([11, 12]);
    expect(spans).not.toContainEqual([10, 12]);
    // The note rides the 11–12 piece, verbatim, prefix included.
    expect(display['Leviticus|19|11-12'].highlights).toEqual([LEV_NOTE]);
    expect(display['Leviticus|19|10-10'].highlights).toEqual([]);
    // The stored map is untouched: render-time only, no migration.
    expect(Object.keys(stored)).toEqual(['Leviticus|19|10-12']);
    expect(stored['Leviticus|19|10-12'].highlights).toEqual([LEV_NOTE]);
  });

  it('(b) a single-verse "#11" splits v.11 out alone', () => {
    const pieces = splitEntryByHashNotes(bare(10, 12), { ...emptyMarks(), highlights: ['#11 Just this verse.'] });
    expect(pieces.map((p) => [p.entry.start, p.entry.end])).toEqual([[10, 10], [11, 11], [12, 12]]);
    expect(pieces[1].marks.highlights).toEqual(['#11 Just this verse.']);
  });

  it('(c) a range equal to the whole span changes nothing', () => {
    const entry = bare(10, 12);
    const m: EntryMarks = { ...emptyMarks(), highlights: ['#10-12 The whole stretch.'] };
    const pieces = splitEntryByHashNotes(entry, m);
    expect(pieces).toHaveLength(1);
    expect(pieces[0].entry).toBe(entry);
    expect(pieces[0].marks).toBe(m);
  });

  it('(d) an out-of-span range changes nothing', () => {
    const entry = bare(10, 12);
    for (const text of ['#13-14 Beyond the entry.', '#9 Before the entry.', '#9-11 Straddling in.']) {
      const m: EntryMarks = { ...emptyMarks(), highlights: [text] };
      const pieces = splitEntryByHashNotes(entry, m);
      expect(pieces).toHaveLength(1);
      expect(pieces[0].entry).toBe(entry);
      expect(pieces[0].marks).toBe(m);
    }
  });

  it('(e) "## …" heading text never splits', () => {
    const entry = bare(10, 12);
    const m: EntryMarks = { ...emptyMarks(), highlights: ['## Previously in this chapter'] };
    const pieces = splitEntryByHashNotes(entry, m);
    expect(pieces).toHaveLength(1);
    expect(pieces[0].entry).toBe(entry);
  });

  it('(f) a note merely CONTAINING "#1 thing" mid-text never splits', () => {
    const entry = bare(10, 12);
    const m: EntryMarks = {
      ...emptyMarks(),
      highlights: ['The #1 thing a pastor must not do.'],
      thoughts: ['Remember the #1 rule here.'],
    };
    const pieces = splitEntryByHashNotes(entry, m);
    expect(pieces).toHaveLength(1);
    expect(pieces[0].marks).toBe(m);
  });

  it('(g) two non-overlapping #-notes → pieces in verse order, each note on its piece', () => {
    const entry = bare(1, 9);
    const m: EntryMarks = {
      ...emptyMarks(),
      highlights: ['#2-3 First note.'],
      thoughts: ['#7-8 Second note.'],
    };
    const pieces = splitEntryByHashNotes(entry, m);
    expect(pieces.map((p) => [p.entry.start, p.entry.end])).toEqual([
      [1, 1], [2, 3], [4, 6], [7, 8], [9, 9],
    ]);
    expect(pieces[1].marks.highlights).toEqual(['#2-3 First note.']);
    expect(pieces[3].marks.thoughts).toEqual(['#7-8 Second note.']);
  });

  it('(h) non-# marks (kept, tint, category, plain lines) land on the first-verse piece', () => {
    const entry = bare(10, 12);
    const m: EntryMarks = {
      kept: true,
      highlights: ['#11-12 The set-apart note.', 'A plain keeper line.'],
      thoughts: ['A plain thought.'],
      notes: [],
      tint: 'rose',
      category: 'quote',
    };
    const pieces = splitEntryByHashNotes(entry, m);
    expect(pieces.map((p) => [p.entry.start, p.entry.end])).toEqual([[10, 10], [11, 12]]);
    expect(pieces[0].marks.kept).toBe(true);
    expect(pieces[0].marks.tint).toBe('rose');
    expect(pieces[0].marks.category).toBe('quote');
    expect(pieces[0].marks.highlights).toEqual(['A plain keeper line.']);
    expect(pieces[0].marks.thoughts).toEqual(['A plain thought.']);
    expect(pieces[1].marks.kept).toBe(false);
    expect(pieces[1].marks.tint).toBeNull();
    expect(pieces[1].marks.highlights).toEqual(['#11-12 The set-apart note.']);
  });

  it('an overlapping second #-note rides the piece containing its start verse', () => {
    const pieces = splitEntryByHashNotes(bare(1, 9), {
      ...emptyMarks(),
      highlights: ['#2-5 The claim.', '#4-6 The overlap.'],
    });
    expect(pieces.map((p) => [p.entry.start, p.entry.end])).toEqual([[1, 1], [2, 5], [6, 9]]);
    expect(pieces[1].marks.highlights).toEqual(['#2-5 The claim.', '#4-6 The overlap.']);
  });

  it("the entry's own blocks stay with the first-verse piece", () => {
    const entry: DisplayEntry = {
      start: 10,
      end: 12,
      blocks: [{ kind: 'para', text: 'His commentary on the stretch.' }],
      verseOnly: false,
    };
    const pieces = splitEntryByHashNotes(entry, { ...emptyMarks(), highlights: ['#11-12 Set apart.'] });
    expect(pieces[0].entry.blocks).toEqual([{ kind: 'para', text: 'His commentary on the stretch.' }]);
    expect(pieces[0].entry.verseOnly).toBe(false);
    expect(pieces[1].entry.blocks).toEqual([]);
    expect(pieces[1].entry.verseOnly).toBe(true);
  });

  it('a record stored directly at a piece key wins scalars; its lines append', () => {
    const sections = buildDisplaySections(null, 37);
    const stored: MarksMap = {
      'Leviticus|19|10-12': { ...emptyMarks(), highlights: [LEV_NOTE] },
      'Leviticus|19|11-12': { ...emptyMarks(), kept: true, highlights: ['Added while reading the piece.'] },
    };
    const { marks: display } = splitSectionsByHashNotes(sections, stored, 'Leviticus', 19);
    expect(display['Leviticus|19|11-12'].kept).toBe(true);
    expect(display['Leviticus|19|11-12'].highlights).toEqual([LEV_NOTE, 'Added while reading the piece.']);
  });

  it('removing the "#" re-merges: no reference → the inputs come back by reference', () => {
    const sections = buildDisplaySections(null, 37);
    const stored = levMarks(['Interesting... Some Pastors fit this description far too well.']);
    const result = splitSectionsByHashNotes(sections, stored, 'Leviticus', 19);
    expect(result.sections).toBe(sections);
    expect(result.marks).toBe(stored);
  });

  it('(i) Stories derivation consumes the split entries — no re-merge', () => {
    const sections = buildDisplaySections(null, 37);
    const { sections: split } = splitSectionsByHashNotes(sections, levMarks([LEV_NOTE]), 'Leviticus', 19);
    const screens = buildStoryScreens(split);
    const verseSpans = screens
      .filter((s) => s.t === 'verse')
      .map((s) => (s.t === 'verse' ? [s.entry.start, s.entry.end] : null));
    const at = verseSpans.findIndex((sp) => sp![0] === 10 && sp![1] === 10);
    expect(at).toBeGreaterThanOrEqual(0);
    expect(verseSpans[at + 1]).toEqual([11, 12]);
    expect(verseSpans).not.toContainEqual([10, 12]);
  });
});

describe("v210 — the plain personal Note: no box, just inset text", () => {
  const bareEntry = (start: number, end: number): DisplayEntry => ({ start, end, blocks: [], verseOnly: true });

  it('storage: notes round-trip; records stored before v210 read notes as []', async () => {
    let m = addKeeperLine({}, 'Leviticus', 19, 10, 12, 'note', 'A plain note.');
    m = addKeeperLine(m, 'Leviticus', 19, 10, 12, 'highlight', 'A keeper line.');
    await saveMarks(m);
    const loaded = await loadMarks();
    expect(marksFor(loaded, 'Leviticus', 19, 10, 12).notes).toEqual(['A plain note.']);
    expect(marksFor(loaded, 'Leviticus', 19, 10, 12).highlights).toEqual(['A keeper line.']);
    // A record written before the notes field existed.
    const legacy = { kept: true, highlights: ['x'], thoughts: [], tint: null, category: null } as unknown as EntryMarks;
    expect(normalizeMarks(legacy).notes).toEqual([]);
    // …and adding its first note works rather than spreading undefined.
    const grown = addKeeperLine({ 'Leviticus|19|10-12': legacy }, 'Leviticus', 19, 10, 12, 'note', 'First note.');
    expect(grown['Leviticus|19|10-12'].notes).toEqual(['First note.']);
    expect(grown['Leviticus|19|10-12'].highlights).toEqual(['x']);
    expect(grown['Leviticus|19|10-12'].kept).toBe(true);
  });

  it('a "#"-prefixed note splits its entry exactly like the other kinds', () => {
    const pieces = splitEntryByHashNotes(bareEntry(10, 12), {
      ...emptyMarks(),
      notes: ['#11-12 A plain note on these two.'],
    });
    expect(pieces.map((p) => [p.entry.start, p.entry.end])).toEqual([[10, 10], [11, 12]]);
    expect(pieces[1].marks.notes).toEqual(['#11-12 A plain note on these two.']);
    expect(pieces[0].marks.notes).toEqual([]);
    // Sections level, the real Lev 19 pipeline: the note reaches the
    // piece key every consumer (page, Stories, index) looks up.
    const sections = buildDisplaySections(null, 37);
    const stored: MarksMap = {
      'Leviticus|19|10-12': { ...emptyMarks(), notes: ['#11-12 A plain note.'] },
    };
    const { sections: split, marks: display } = splitSectionsByHashNotes(sections, stored, 'Leviticus', 19);
    expect(split[0].entries.map((e) => [e.start, e.end])).toContainEqual([11, 12]);
    expect(split[0].entries.map((e) => [e.start, e.end])).not.toContainEqual([10, 12]);
    expect(display['Leviticus|19|11-12'].notes).toEqual(['#11-12 A plain note.']);
  });

  it('render: BlockView draws a note as inset para text — no box styling at all', () => {
    const src = readFileSync(join(process.cwd(), 'components/bible-v205/blocks.tsx'), 'utf8');
    const start = src.indexOf("block.kind === 'note'");
    expect(start).toBeGreaterThanOrEqual(0);
    const branch = src.slice(start, src.indexOf("block.kind === 'scripture'"));
    expect(branch).toContain('styles.para');
    expect(branch).not.toContain('backgroundColor');
    expect(branch).not.toContain('borderColor');
    expect(branch).not.toContain('callout');
  });

  it('render: the markbar offers Note, his lines lead with notes, Stories shows them plainly', () => {
    const page = readFileSync(join(process.cwd(), 'components/bible-v205/chapter-page.tsx'), 'utf8');
    expect(page).toContain("setComposer('note')");
    const notePush = page.indexOf("blocks.push({ kind: 'note', text })");
    const hlPush = page.indexOf("blocks.push({ kind: 'highlight', text })");
    expect(notePush).toBeGreaterThanOrEqual(0);
    expect(notePush).toBeLessThan(hlPush); // notes render before the callout boxes
    const stories = readFileSync(join(process.cwd(), 'components/bible-v205/stories-view.tsx'), 'utf8');
    const rub = stories.slice(stories.indexOf('const renderUserBlocks'));
    expect(rub.indexOf("kind: 'note'")).toBeGreaterThanOrEqual(0);
    expect(rub.indexOf("kind: 'note'")).toBeLessThan(rub.indexOf("kind: 'highlight'"));
  });
});
