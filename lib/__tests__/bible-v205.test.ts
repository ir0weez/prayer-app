// ─── v205 Bible build — pins ─────────────────────────────────────────────────
// Fixtures are REAL: the canonical commentary txt files, the generated
// data they produce, and his Studies CSV seed. The pins that matter
// most: 1 Corinthians 1 renders exactly the mockup's structure with his
// verbatim Highlights; noteless chapters are full readers, never dead
// ends; his pre-v205 check-offs migrate Complete-wins and can never
// re-pay their XP; marking a chapter Complete in the new system pays
// exactly once, under the existing award keys.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
  browseCategory,
  buildDisplaySections,
  buildReadOnlySections,
  buildStoryScreens,
  chapterCountFor,
  flattenEntries,
  getChapterData,
  searchChapter,
} from '../bible-v205/index';
import { STUDY_SEED } from '../bible-v205/study-seed';
import {
  chapterStatus,
  mergeUnifiedReads,
  parseLegacyReadIds,
  seedStudyState,
  setChapterStatus,
} from '../bible-v205/study';
import { transitionChapterStatus } from '../bible-v205/rewards';
import {
  addKeeperLine,
  isKept,
  loadMarks,
  marksFor,
  saveMarks,
  toggleKept,
  withMarks,
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

describe('study seed — his CSVs, deduped', () => {
  it('carries the mockup tallies and the Current/Next queues', () => {
    const gen = STUDY_SEED.statuses['Genesis'];
    expect(Object.values(gen).filter((s) => s === 'complete').length).toBe(28);
    const exo = STUDY_SEED.statuses['Exodus'];
    expect(Object.keys(exo).length).toBe(40); // double-listed rows deduped
    expect(Object.values(exo).every((s) => s === 'write')).toBe(true);
    expect(STUDY_SEED.trackedChapters['Psalms']).toBe(40);
    expect(STUDY_SEED.writeQueue).toHaveLength(7);
    expect(STUDY_SEED.restudyQueue).toHaveLength(7);
  });

  it('queue membership speaks when a book has no status list (1 John, in both his queues)', () => {
    const state = seedStudyState();
    // His Current and Next databases name the SAME Johannine chapters:
    // the dual listing is his data, and both queues keep it. The single
    // status word resolves ReStudy-first (the letters' notes exist —
    // they are queued to teach again), while the Write list still
    // carries them on the queue screen.
    expect(chapterStatus(state, '1 John', 1)).toBe('restudy');
    expect(state.writeQueue.some((q) => q.book === '1 John' && q.chapter === 1)).toBe(true);
    expect(state.restudyQueue.some((q) => q.book === '1 John' && q.chapter === 1)).toBe(true);
    expect(chapterStatus(state, 'Numbers', 1)).toBe('none');
  });

  it('in-app transitions move chapters through the pipeline and the queues follow', () => {
    let state = seedStudyState();
    state = setChapterStatus(state, '1 John', 1, 'complete');
    expect(chapterStatus(state, '1 John', 1)).toBe('complete');
    expect(state.writeQueue.some((q) => q.book === '1 John' && q.chapter === 1)).toBe(false);
    state = setChapterStatus(state, '1 John', 1, 'restudy');
    expect(state.restudyQueue.some((q) => q.book === '1 John' && q.chapter === 1)).toBe(true);
    state = setChapterStatus(state, 'Genesis', 30, 'write');
    expect(state.writeQueue.some((q) => q.book === 'Genesis' && q.chapter === 30)).toBe(true);
  });
});

describe('migration — pre-v205 check-offs, Complete wins', () => {
  it('merges unified reads over the Notion seed and records the conflicts', () => {
    const { state, migrated, conflicts } = mergeUnifiedReads(seedStudyState(), [
      { book: 'Exodus', chapter: 1 }, // seed says Write — a true conflict
      { book: 'Genesis', chapter: 1 }, // seed already Complete — no-op
      { book: '1 John', chapter: 2 }, // queue-driven Write
    ]);
    expect(chapterStatus(state, 'Exodus', 1)).toBe('complete');
    expect(chapterStatus(state, '1 John', 2)).toBe('complete');
    expect(state.writeQueue.some((q) => q.book === '1 John' && q.chapter === 2)).toBe(false);
    expect(migrated).toEqual([
      { book: 'Exodus', chapter: 1 },
      { book: '1 John', chapter: 2 },
    ]);
    expect(conflicts).toEqual([{ book: 'Exodus', chapter: 1, seedStatus: 'write' }]);
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
    // The old check-off page paid Exodus 1 under the DASH key, while his
    // Notion seed still calls the chapter Write — the exact case where a
    // naive new system would pay it a second time.
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
