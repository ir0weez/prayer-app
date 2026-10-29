// ─── v233 "Read Means Read" — pins ──────────────────────────────────────────
// Jonathan's model (2026-10-24): "Instead of 'Complete' it should say
// 'Read' unless there's notes for it, then it should mark both."
// Complete is a claim about NOTES. (v329, 2026-10-28: the noteless-
// Complete-displays-as-Read clause below was SUPERSEDED by his
// settled model of that day — Complete = Written, Read = read — and
// his 23:22 report; the display-model test (a) is re-pinned there.
// The finish rules in this file stand unchanged: they were always
// computed from the stores, never from the display.) A book with NO
// noted chapters finishes by reading (every chapter Read pays the
// +100 under the same idempotent key); a book with even one noted
// chapter still finishes only by notes-Complete. Part 1 pins ride
// along: Genesis 6–10, recovered from Full_Commentary, are IN the
// app data, and the generator carries the recovery stage that keeps
// them there.

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

import { getChapterData } from '../bible-v205/index';
import {
  chapterDisplayMarks,
  chapterReadDate,
  chapterStatus,
  seedStudyState,
  setChapterRead,
  setChapterStatus,
  type StudyState,
} from '../bible-v205/study';
import {
  applyStudioChapters,
  bookHasNotedChapters,
  chapterHasNotes,
  type StudioChapterPayload,
} from '../bible-v205/studio-import';
import {
  bibleIsFinished,
  bookFinishedByReading,
  bookIsFinished,
  markChapterRead,
} from '../bible-v205/rewards';
import { applyRecoveryFill, chapterBlockCount, type RecoveredMap } from '../bible-v205/recovery';
import type { V205BookData } from '../bible-v205/types';
import { XP_AWARDS_STORAGE_KEY } from '../xp-engine';

const ledger = (): string[] => {
  const raw = store.get(XP_AWARDS_STORAGE_KEY);
  const parsed = raw ? JSON.parse(raw) : [];
  return Array.isArray(parsed) ? parsed : [];
};
const countInLedger = (key: string) => ledger().filter((k) => k === key).length;

beforeEach(() => {
  store.clear();
});

describe('hasNotes — computed from the data layer', () => {
  it('shipped data: Genesis 1 has notes, Leviticus has none anywhere', () => {
    expect(chapterHasNotes('Genesis', 1, {})).toBe(true);
    expect(chapterHasNotes('Leviticus', 1, {})).toBe(false);
    expect(chapterHasNotes('Leviticus', 19, {})).toBe(false);
    expect(bookHasNotedChapters('Leviticus', {})).toBe(false);
    expect(bookHasNotedChapters('Genesis', {})).toBe(true);
    // Ecclesiastes carries notes in chs 1–2 only — still a noted book.
    expect(chapterHasNotes('Ecclesiastes', 3, {})).toBe(false);
    expect(bookHasNotedChapters('Ecclesiastes', {})).toBe(true);
  });

  it("(c) a studio-import override adding a chapter's first entry flips hasNotes", () => {
    expect(chapterHasNotes('Leviticus', 1, {})).toBe(false);
    const payload: StudioChapterPayload = {
      book: 'Leviticus',
      chapter: 1,
      opener: { kind: 'introduction', text: '' },
      sections: [{ start: 1, end: 2, title: null, entries: [{ start: 1, end: 2 }] }],
      notes: [
        {
          start: 1,
          end: 2,
          kind: 'note',
          blocks: [{ kind: 'para', text: 'His first Leviticus note.' }],
        },
      ],
    };
    const { next } = applyStudioChapters({}, [payload]);
    expect(chapterHasNotes('Leviticus', 1, next)).toBe(true);
    expect(bookHasNotedChapters('Leviticus', next)).toBe(true);
    // And the rest of the book is untouched by the one-chapter import.
    expect(chapterHasNotes('Leviticus', 2, next)).toBe(false);
  });
});

describe('the display model — Read means a real read mark (v329)', () => {
  // RE-PINNED in v329: this test originally pinned the Oct 24 ruling
  // (a stored Complete on a noteless chapter displays READ). His
  // Oct 28 settled model — Complete = Written, Read = read, two
  // independent channels — plus the 23:22 Ecclesiastes report ("Why
  // is marking these complete also marking them as read? And I can't
  // turn it off...") supersede that clause: the chapter now presents
  // as its writing status, and only a real read mark says Read.
  it('(a) a stored Complete on a noteless chapter displays as COMPLETE, shows no notes editor, and is never rewritten', () => {
    let state = seedStudyState();
    state = setChapterStatus(state, 'Leviticus', 19, 'complete');
    const d = chapterDisplayMarks(state, 'Leviticus', 19, chapterHasNotes('Leviticus', 19, {}));
    expect(d.noted).toBe(false);
    expect(d.headline).toBe('status');
    expect(d.displayRead).toBe(false);
    expect(d.showNotesEditor).toBe(false);
    // The stored mark itself stands exactly as he set it — the studio
    // still sees Complete; only the app's headline interprets it.
    expect(d.status).toBe('complete');
    expect(chapterStatus(state, 'Leviticus', 19)).toBe('complete');
    expect(state.overrides['Leviticus|19']).toBe('complete');
  });

  it('a noteless chapter with no marks headlines as its (empty) status, not as read', () => {
    const state = seedStudyState();
    const d = chapterDisplayMarks(state, 'Leviticus', 20, false);
    expect(d.displayRead).toBe(false);
    expect(d.headline).toBe('status');
    expect(d.showNotesEditor).toBe(false);
  });

  it('a noteless chapter with a stored Write keeps the status headline (only Complete reads as Read)', () => {
    let state = seedStudyState();
    state = setChapterStatus(state, 'Leviticus', 21, 'write');
    const d = chapterDisplayMarks(state, 'Leviticus', 21, false);
    expect(d.displayRead).toBe(false);
    expect(d.headline).toBe('status');
    expect(d.status).toBe('write');
  });

  it('(b) a noted chapter shows BOTH marks: notes status rules the headline, the read mark rides along', () => {
    let state = seedStudyState();
    state = setChapterStatus(state, 'Genesis', 1, 'complete');
    state = setChapterRead(state, 'Genesis', 1, '2026-10-24');
    const d = chapterDisplayMarks(state, 'Genesis', 1, chapterHasNotes('Genesis', 1, {}));
    expect(d.noted).toBe(true);
    expect(d.headline).toBe('status');
    expect(d.status).toBe('complete');
    expect(d.readDate).toBe('2026-10-24');
    expect(d.displayRead).toBe(true);
    expect(d.showNotesEditor).toBe(true);
  });
});

describe('finish rules — a noteless book finishes by reading', () => {
  const readWholeBook = (state: StudyState, book: string, total: number): StudyState => {
    let next = state;
    for (let c = 1; c <= total; c++) next = setChapterRead(next, book, c, '2026-10-24');
    return next;
  };

  it('bookFinishedByReading: Leviticus (no data at all) all-read finishes; one unread chapter does not', () => {
    let state = readWholeBook(seedStudyState(), 'Leviticus', 27);
    expect(bookFinishedByReading(state, 'Leviticus')).toBe(true);
    expect(bookIsFinished(state, 'Leviticus')).toBe(true);
    state = setChapterRead(state, 'Leviticus', 27, '2026-10-24'); // sanity: still complete
    const partial = readWholeBook(seedStudyState(), 'Leviticus', 26);
    expect(bookFinishedByReading(partial, 'Leviticus')).toBe(false);
  });

  it('(e) a mixed book (some noted chapters) does NOT finish by reading — notes-Complete is still required', () => {
    // Ecclesiastes: notes in chs 1–2, groupings only in 3–12.
    const allRead = readWholeBook(seedStudyState(), 'Ecclesiastes', 12);
    expect(bookFinishedByReading(allRead, 'Ecclesiastes')).toBe(false);
    expect(bookIsFinished(allRead, 'Ecclesiastes')).toBe(false);
    // Genesis read cover to cover is not finished either.
    const genRead = readWholeBook(seedStudyState(), 'Genesis', 50);
    expect(bookFinishedByReading(genRead, 'Genesis')).toBe(false);
    expect(bookIsFinished(genRead, 'Genesis')).toBe(false);
    // …until every chapter is notes-Complete.
    let done = genRead;
    for (let c = 1; c <= 50; c++) done = setChapterStatus(done, 'Genesis', c, 'complete');
    expect(bookIsFinished(done, 'Genesis')).toBe(true);
  });

  it('(e2) a studio import giving a noteless book its first note moves it to the notes track', () => {
    const allRead = readWholeBook(seedStudyState(), 'Leviticus', 27);
    expect(bookFinishedByReading(allRead, 'Leviticus', {})).toBe(true);
    const payload: StudioChapterPayload = {
      book: 'Leviticus',
      chapter: 1,
      opener: { kind: 'introduction', text: '' },
      sections: [{ start: 1, end: 2, title: null, entries: [{ start: 1, end: 2 }] }],
      notes: [{ start: 1, end: 2, kind: 'note', blocks: [{ kind: 'para', text: 'A note.' }] }],
    };
    const { next } = applyStudioChapters({}, [payload]);
    expect(bookFinishedByReading(allRead, 'Leviticus', next)).toBe(false);
    expect(bookIsFinished(allRead, 'Leviticus', next)).toBe(false);
  });

  it('(d) marking the last chapter of a noteless book read pays the +100 once, under the notes track\u2019s own key', async () => {
    // Philemon: one chapter, no notes anywhere.
    expect(bookHasNotedChapters('Philemon', {})).toBe(false);
    const first = await markChapterRead(seedStudyState(), 'Philemon', 1);
    expect(first.chapterXpAwarded).toBe(true);
    expect(first.bookCompleted).toBe('Philemon');
    expect(first.bibleCompleted).toBe(false);
    expect(countInLedger('daily-reading:Philemon:1')).toBe(1);
    expect(countInLedger('book-complete:book:Philemon')).toBe(1);
    expect(chapterReadDate(first.state, 'Philemon', 1)).not.toBeNull();

    // Touching the chapter again never re-pays either award.
    const again = await markChapterRead(first.state, 'Philemon', 1);
    expect(again.alreadyRead).toBe(true);
    expect(again.chapterXpAwarded).toBe(false);
    expect(countInLedger('daily-reading:Philemon:1')).toBe(1);
    expect(countInLedger('book-complete:book:Philemon')).toBe(1);
  });

  it('bibleIsFinished judges every book by its applicable rule', () => {
    expect(bibleIsFinished(seedStudyState())).toBe(false);
  });
});

describe('(f) Part 1 — Genesis 6–10 recovered into the app data', () => {
  const blocksOf = (ch: number) => chapterBlockCount(getChapterData('Genesis', ch)!);
  const entriesOf = (ch: number) =>
    getChapterData('Genesis', ch)!.sections.reduce((n, s) => n + s.entries.length, 0);

  it('the five recovered chapters carry the staging\u2019s exact entry/block counts', () => {
    expect([blocksOf(6), blocksOf(7), blocksOf(8), blocksOf(9), blocksOf(10)]).toEqual([35, 29, 27, 30, 15]);
    expect([entriesOf(6), entriesOf(7), entriesOf(8), entriesOf(9), entriesOf(10)]).toEqual([17, 13, 10, 16, 6]);
    expect([6, 7, 8, 9, 10].reduce((n, c) => n + blocksOf(c), 0)).toBe(136);
    expect([6, 7, 8, 9, 10].reduce((n, c) => n + entriesOf(c), 0)).toBe(62);
  });

  it('Genesis now carries notes in all 50 chapters; the book totals moved by exactly the recovery', () => {
    let entries = 0;
    let blocks = 0;
    for (let c = 1; c <= 50; c++) {
      const ch = getChapterData('Genesis', c);
      expect(ch).not.toBeNull();
      expect(chapterBlockCount(ch!)).toBeGreaterThan(0);
      entries += entriesOf(c);
      blocks += blocksOf(c);
    }
    expect(entries).toBe(878); // 816 shipped + 62 recovered
    expect(blocks).toBe(1418); // 1282 shipped + 136 recovered
  });

  it('the recovered chapters carry his words and the clean two-paragraph Previously', () => {
    const ch6 = getChapterData('Genesis', 6)!;
    expect(ch6.previously).toHaveLength(2);
    expect(ch6.previously[0]).toContain('linage of Seth leading to Noah');
    expect(chapterHasNotes('Genesis', 6, {})).toBe(true);
    const allText = ch6.sections
      .flatMap((s) => s.entries.flatMap((e) => e.blocks.map((b) => b.text)))
      .join('\n');
    expect(allText).toContain('Ken Ham'); // his authorized spelling fix
    expect(allText).not.toContain('Ken Hamm');
  });
});

describe('(f) the generator guard — a regeneration cannot drop the recovered chapters', () => {
  const recovered: RecoveredMap = {
    Genesis: {
      chapters: {
        '6': {
          intro: [],
          previously: ['Recovered opener.'],
          sections: [
            {
              start: 1,
              end: 2,
              title: 'The Marriage',
              entries: [{ start: 1, end: 2, blocks: [{ kind: 'para', text: 'Recovered words.' }] }],
            },
          ],
        },
      },
    },
  };
  const bareBook = (): V205BookData => ({
    book: 'Genesis',
    display: 'Genesis',
    chapters: {
      6: {
        chapter: 6,
        intro: [{ kind: 'para', text: '## Previously: residue' }],
        previously: [],
        outline: [],
        sections: [{ start: 1, end: 2, title: 'The Marriage', entries: [] }],
        stories: [{ start: 1, end: 2 }],
      },
    },
  });

  it('applyRecoveryFill fills a zero-block chapter and keeps its stories', () => {
    const { data, filled, skipped } = applyRecoveryFill(bareBook(), recovered);
    expect(filled).toEqual(['Genesis 6']);
    expect(skipped).toEqual([]);
    expect(chapterBlockCount(data.chapters[6])).toBe(1);
    expect(data.chapters[6].previously).toEqual(['Recovered opener.']);
    expect(data.chapters[6].stories).toEqual([{ start: 1, end: 2 }]);
  });

  it('applyRecoveryFill NEVER overwrites a chapter already carrying blocks', () => {
    const book = bareBook();
    book.chapters[6].sections[0].entries = [
      { start: 1, end: 2, blocks: [{ kind: 'para', text: 'His existing words.' }] },
    ];
    const { data, filled, skipped } = applyRecoveryFill(book, recovered);
    expect(filled).toEqual([]);
    expect(skipped).toEqual(['Genesis 6']);
    expect(data.chapters[6].sections[0].entries[0].blocks[0].text).toBe('His existing words.');
  });

  it('the generator script runs the recovery stage from recovered.json', () => {
    const src = readFileSync(join(process.cwd(), 'scripts', 'build-bible-v205.ts'), 'utf8');
    expect(src).toContain('applyRecoveryFill');
    expect(src).toContain('recovered.json');
  });
});
