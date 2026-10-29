// ─── v222 "The Door" — pins ─────────────────────────────────────────────────
// WS1 (v228 SUPERSEDED): the foot of the chapter page carried a Mark
// Complete button; Jonathan's two-marks ruling removed every
// notes-state control from the reader — the WS1 pins below now assert
// the Mark as Read foot and the absence of the old controls. WS2: the
// DATA import door — studio packs validated before anything is
// applied, notes replacing only the imported entries, marks never
// touched, chapter states through the transition path, schedule packs
// deduped by (date, start, title). WS3: the Books view's three
// sections over all 66 books.

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

import { CHAPTER_COUNTS, getChapterData } from '../bible-v205/index';
import { chapterReadDate, chapterStatus, seedStudyState, setChapterStatus, setCurrentBook } from '../bible-v205/study';
import { groupBooksByStudy, markChapterRead, transitionChapterStatus } from '../bible-v205/rewards';
import { loadXPState } from '../xp-engine';
import {
  MARKS_KEY,
  emptyMarks,
  loadMarks,
  saveMarks,
  type MarksMap,
} from '../bible-v205/marks';
import {
  applyStudioChapters,
  collectBubbleLinesForExport,
  convertStudioChapter,
  loadStudioImports,
  mergeStudioSchedule,
  parseStudioFile,
  resolveChapterData,
  saveStudioImports,
  type StudioChapterPayload,
  type StudioSchedulePayload,
} from '../bible-v205/studio-import';

beforeEach(() => {
  store.clear();
});

const COLOSSIANS_PACK: StudioChapterPayload = {
  book: 'Colossians',
  chapter: 1,
  opener: { kind: 'previously', text: 'In our last chapter we met the church.' },
  sections: [
    {
      start: 1,
      end: 4,
      title: 'Ver. 1–4: Greeting',
      entries: [
        { start: 1, end: 2 },
        { start: 3, end: 4 },
      ],
    },
  ],
  notes: [
    {
      start: 1,
      end: 2,
      kind: 'note',
      category: 'good-thought',
      blocks: [{ kind: 'para', text: 'Paul opens with grace.' }],
    },
    {
      start: 3,
      end: 4,
      kind: 'highlight',
      blocks: [{ kind: 'para', text: 'Faith and love, together.' }],
    },
  ],
  chapterState: 'write',
};

const SCHEDULE_PACK: StudioSchedulePayload = {
  weekOf: '2026-10-25',
  events: [
    {
      title: 'Commentary writing — Genesis 2',
      day: 'Tue',
      date: '2026-10-27',
      start: '11:00',
      minutes: 60,
      type: 'Event',
      online: false,
      recur: 'none',
    },
    {
      title: 'Buy snapdragons',
      day: 'Wed',
      date: '2026-10-28',
      start: 'All day',
      minutes: 0,
      type: 'Todo',
      online: false,
      recur: 'none',
    },
  ],
};

describe('v222 WS1 — the foot of the chapter page (v228: Mark as Read only)', () => {
  it('v228 supersedes the v222 foot: no Mark Complete, no notes-state control — Mark as Read stands before the chapter nav', () => {
    const src = readFileSync(join(process.cwd(), 'components', 'bible-v205', 'chapter-page.tsx'), 'utf8');
    // His ruling: the reader is for reading. The v222 Mark Complete
    // button, the completed-state line, and the status picker that
    // called handleSetStatus are ALL gone from this surface.
    expect(src).not.toContain('Mark Complete');
    expect(src).not.toContain('handleSetStatus');
    expect(src).not.toContain('transitionChapterStatus');
    expect(src).not.toContain('footComplete');
    expect(src).toContain('Mark as Read');
    expect(src).toContain('markChapterRead');
    // v313 re-base: the foot's done state is the drawing's pill —
    // bookmark glyph + "Read · {date}" (the ✓ text line retired).
    expect(src).toContain('Read · {formatReadDate(readDate)}');
    // After the last entry (footNote) and before the prev/next nav —
    // measured on the foot button's own style hook, since the words
    // "Mark as Read" also appear in the page's handler comments.
    const foot = src.indexOf('styles.footNote');
    const button = src.indexOf('styles.markReadBtn');
    const nav = src.indexOf('styles.chapterNav');
    expect(foot).toBeGreaterThan(-1);
    expect(button).toBeGreaterThan(foot);
    expect(nav).toBeGreaterThan(button);
  });

  it('the read mark derives from the same store the grid editor writes', async () => {
    const marked = await markChapterRead(seedStudyState(), 'Colossians', 1);
    expect(chapterReadDate(marked.state, 'Colossians', 1)).not.toBeNull();
    // Marking read never moved the notes state — the two marks are
    // independent in both directions.
    expect(chapterStatus(marked.state, 'Colossians', 1)).toBe('none');
    const completed = setChapterStatus(seedStudyState(), 'Colossians', 1, 'complete');
    expect(chapterReadDate(completed, 'Colossians', 1)).toBeNull();
  });

  it('importing a Complete state pays no reading XP at all (v228 re-key)', async () => {
    const first = await transitionChapterStatus(seedStudyState(), 'Colossians', 1, 'complete');
    const again = await transitionChapterStatus(first.state, 'Colossians', 1, 'complete');
    expect(chapterStatus(again.state, 'Colossians', 1)).toBe('complete');
    expect((await loadXPState()).totalXP).toBe(0);
  });
});

describe('v222 WS2 — the studio pack door', () => {
  it('parses a single-chapter notes pack, a library pack, and a schedule pack', () => {
    const single = parseStudioFile({ ...COLOSSIANS_PACK });
    expect(single.kind).toBe('notes');
    if (single.kind === 'notes') expect(single.chapters).toHaveLength(1);
    const library = parseStudioFile({ chapters: [COLOSSIANS_PACK] });
    expect(library.kind).toBe('notes');
    const schedule = parseStudioFile(SCHEDULE_PACK);
    expect(schedule.kind).toBe('schedule');
    if (schedule.kind === 'schedule') expect(schedule.schedule.events).toHaveLength(2);
  });

  it('rejects malformed packs outright — unknown book, bad chapter, bad state, orphan note, bad event', () => {
    expect(() => parseStudioFile({ ...COLOSSIANS_PACK, book: 'Narnia' })).toThrow();
    expect(() => parseStudioFile({ ...COLOSSIANS_PACK, chapter: 99 })).toThrow();
    expect(() => parseStudioFile({ ...COLOSSIANS_PACK, chapterState: 'done' })).toThrow();
    expect(() =>
      parseStudioFile({
        ...COLOSSIANS_PACK,
        notes: [{ start: 5, end: 6, kind: 'note', blocks: [{ kind: 'para', text: 'Orphan.' }] }],
      }),
    ).toThrow(/outside every section/);
    expect(() =>
      parseStudioFile({ weekOf: '2026-10-25', events: [{ title: '', date: '2026-10-27', start: '11:00', minutes: 30, type: 'Event', online: false, recur: 'none' }] }),
    ).toThrow();
    expect(() => parseStudioFile({ format: 'prayercircle-backup' })).toThrow(/studio pack/);
    expect(() => parseStudioFile(null)).toThrow();
  });

  it('converts sections + notes into entries, with kinds carrying the callout meaning', () => {
    const converted = convertStudioChapter(COLOSSIANS_PACK, getChapterData('Colossians', 1));
    expect(converted.chapter).toBe(1);
    expect(converted.previously).toEqual(['In our last chapter we met the church.']);
    expect(converted.sections).toHaveLength(1);
    expect(converted.sections[0].entries).toHaveLength(2);
    const first = converted.sections[0].entries[0];
    expect(first.blocks).toHaveLength(1);
    expect(first.blocks[0].kind).toBe('para');
    expect(first.blocks[0].category).toBe('good-thought');
    const second = converted.sections[0].entries[1];
    expect(second.blocks[0].kind).toBe('highlight');
    // A section with no notes keeps a bare span-only entry.
    const bare = convertStudioChapter(
      { ...COLOSSIANS_PACK, notes: [] },
      getChapterData('Colossians', 1),
    );
    expect(bare.sections[0].entries[0].blocks).toEqual([]);
  });

  it('backfills outline, stories, and verses from the shipped chapter the studio never carries', () => {
    const base = getChapterData('Genesis', 1);
    const converted = convertStudioChapter(
      {
        book: 'Genesis',
        chapter: 1,
        opener: { kind: 'introduction', text: 'In the beginning.' },
        sections: [{ start: 1, end: 3, title: null, entries: [{ start: 1, end: 3 }] }],
        notes: [],
      },
      base,
    );
    expect(converted.intro).toEqual([{ kind: 'para', text: 'In the beginning.' }]);
    expect(converted.outline).toEqual(base?.outline ?? []);
    expect(converted.stories).toEqual(base?.stories ?? []);
    if (base?.verses) expect(converted.verses).toEqual(base.verses);
  });

  it('applying the same pack twice is identical, and a changed pack replaces', async () => {
    const empty = await loadStudioImports();
    const first = applyStudioChapters(empty, [COLOSSIANS_PACK]);
    expect(first.chaptersUpdated).toBe(1);
    await saveStudioImports(first.next);
    const again = applyStudioChapters(await loadStudioImports(), [COLOSSIANS_PACK]);
    expect(again.next).toEqual(first.next);
    const changed = applyStudioChapters(first.next, [
      { ...COLOSSIANS_PACK, notes: [{ start: 1, end: 2, kind: 'note', blocks: [{ kind: 'para', text: 'Rewritten.' }] }] },
    ]);
    expect(changed.next['Colossians|1'].sections[0].entries[0].blocks[0].text).toBe('Rewritten.');
  });

  it('resolveChapterData prefers the import and falls back to the shipped chapter', async () => {
    const { next } = applyStudioChapters({}, [COLOSSIANS_PACK]);
    const resolved = resolveChapterData('Colossians', 1, next);
    expect(resolved?.sections[0].entries[0].blocks[0].text).toBe('Paul opens with grace.');
    expect(resolveChapterData('Colossians', 2, next)).toEqual(getChapterData('Colossians', 2));
  });

  it('an import never touches the marks layer — hearts, tints, and bubble lines survive byte-for-byte', async () => {
    const marks: MarksMap = {
      'Colossians|1|1-2': {
        ...emptyMarks(),
        kept: true,
        highlights: [{ text: 'Cody on this verse', authorId: 'p-cody', authorName: 'Cody' }],
        notes: ['his own note'],
      },
    };
    await saveMarks(marks);
    const before = store.get(MARKS_KEY);
    const { next } = applyStudioChapters({}, [COLOSSIANS_PACK]);
    await saveStudioImports(next);
    expect(store.get(MARKS_KEY)).toBe(before);
    expect(await loadMarks()).toEqual(marks);
  });

  it('chapterState applies through the transition path — backward moves allowed, no revoke, no reading XP (v228)', async () => {
    let state = seedStudyState();
    const first = await transitionChapterStatus(state, 'Colossians', 1, 'write');
    state = first.state;
    expect(chapterStatus(state, 'Colossians', 1)).toBe('write');
    const completed = await transitionChapterStatus(state, 'Colossians', 1, 'complete');
    expect(chapterStatus(completed.state, 'Colossians', 1)).toBe('complete');
    // v228: a notes state is notes — it pays no reading XP and sets
    // no read mark, however often it is re-imported.
    expect(chapterReadDate(completed.state, 'Colossians', 1)).toBeNull();
    const reimported = await transitionChapterStatus(completed.state, 'Colossians', 1, 'complete');
    expect((await loadXPState()).totalXP).toBe(0);
    const backward = await transitionChapterStatus(reimported.state, 'Colossians', 1, 'write');
    expect(chapterStatus(backward.state, 'Colossians', 1)).toBe('write');
  });

  it('schedule merge: events land with computed end times, todos split off, All day carries no start, re-import adds nothing', () => {
    const first = mergeStudioSchedule([], [], SCHEDULE_PACK);
    expect(first.added).toBe(2);
    expect(first.events).toHaveLength(1);
    expect(first.events[0].title).toBe('Commentary writing — Genesis 2');
    expect(first.events[0].date).toBe('2026-10-27');
    expect(first.events[0].startTime).toBe('11:00');
    expect(first.events[0].endTime).toBe('12:00');
    expect(first.todos).toHaveLength(1);
    expect(first.todos[0].title).toBe('Buy snapdragons');
    expect(first.todos[0].startTime).toBeUndefined();
    const again = mergeStudioSchedule(first.events, first.todos, SCHEDULE_PACK);
    expect(again.added).toBe(0);
    expect(again.events).toHaveLength(1);
    expect(again.todos).toHaveLength(1);
  });

  it('v224: schedule packs carry notes + location through to the created event and todo', () => {
    const raw = {
      weekOf: '2026-10-25',
      events: [
        {
          title: 'Commentary writing — Genesis 2',
          day: 'Tue',
          date: '2026-10-27',
          start: '11:00',
          minutes: 60,
          type: 'Event',
          online: true,
          recur: 'none',
          notes: 'Bring the Exodus setup pages',
          location: 'The booth',
        },
        {
          title: 'Buy snapdragons',
          day: 'Wed',
          date: '2026-10-28',
          start: 'All day',
          minutes: 0,
          type: 'Todo',
          online: false,
          recur: 'none',
          notes: 'The coolest-looking ones',
          location: '',
        },
      ],
    };
    // The pack is accepted WITH the additive keys — never rejected for them.
    const parsed = parseStudioFile(raw);
    expect(parsed.kind).toBe('schedule');
    if (parsed.kind !== 'schedule') throw new Error('expected a schedule pack');
    expect(parsed.schedule.events[0].notes).toBe('Bring the Exodus setup pages');
    expect(parsed.schedule.events[0].location).toBe('The booth');

    const merged = mergeStudioSchedule([], [], parsed.schedule);
    expect(merged.added).toBe(2);
    expect(merged.events[0].notes).toBe('Bring the Exodus setup pages');
    // The pack's location wins over the Online fallback even when online.
    expect(merged.events[0].location).toBe('The booth');
    // Todos carry notes too (ScheduleTodo has a notes field).
    expect(merged.todos[0].notes).toBe('The coolest-looking ones');
  });

  it('v224: online alone still lands location Online; empty pack location + offline leaves it unset', () => {
    const pack: StudioSchedulePayload = {
      weekOf: '2026-10-25',
      events: [
        {
          title: 'Online study group',
          day: 'Tue',
          date: '2026-10-27',
          start: '19:00',
          minutes: 60,
          type: 'Event',
          online: true,
          recur: 'weekly',
          notes: '',
          location: '',
        },
        {
          title: 'Garden photos',
          day: 'Sun',
          date: '2026-10-25',
          start: '18:30',
          minutes: 30,
          type: 'Event',
          online: false,
          recur: 'none',
        },
      ],
    };
    const merged = mergeStudioSchedule([], [], pack);
    expect(merged.events[0].location).toBe('Online');
    expect(merged.events[0].notes).toBeUndefined();
    expect(merged.events[1].location).toBeUndefined();
  });

  it('v224: re-import with different notes/location still dedupes on (date, start, title)', () => {
    const changed: StudioSchedulePayload = {
      weekOf: '2026-10-25',
      events: SCHEDULE_PACK.events.map((e) => ({
        ...e,
        notes: 'Edited in the studio later',
        location: 'Somewhere new',
      })),
    };
    const first = mergeStudioSchedule([], [], SCHEDULE_PACK);
    const again = mergeStudioSchedule(first.events, first.todos, changed);
    expect(again.added).toBe(0);
    expect(again.events).toHaveLength(1);
    expect(again.todos).toHaveLength(1);
    // The first import's copy stands — a re-import never rewrites it.
    expect(again.events[0].location).toBeUndefined();
  });

  it('schedule merge does not read whiteSpace — the advisory field never lands in the store', () => {
    const withWhiteSpace: StudioSchedulePayload = {
      ...SCHEDULE_PACK,
      whiteSpace: { '2026-10-27': [{ start: '12:00', end: '14:00', minutes: 120 }] },
    };
    const merged = mergeStudioSchedule([], [], withWhiteSpace);
    expect(JSON.stringify(merged.events)).not.toContain('whiteSpace');
    expect(JSON.stringify(merged.todos)).not.toContain('whiteSpace');
  });

  it('bubble export flattens keeper lines with spans, kinds, and authorship — his own lines carry no author', () => {
    const marks: MarksMap = {
      'Colossians|1|1-2': {
        ...emptyMarks(),
        highlights: [{ text: 'Cody on this verse', authorId: 'p-cody', authorName: 'Cody' }],
        thoughts: ['his own main thought'],
        notes: ['his own plain note'],
      },
    };
    const lines = collectBubbleLinesForExport(marks);
    expect(lines).toHaveLength(3);
    const cody = lines.find((l) => l.kind === 'highlight')!;
    expect(cody).toMatchObject({
      book: 'Colossians',
      chapter: 1,
      start: 1,
      end: 2,
      authorId: 'p-cody',
      authorName: 'Cody',
    });
    const own = lines.find((l) => l.kind === 'note')!;
    expect(own.authorId).toBeUndefined();
    expect(own.authorName).toBeUndefined();
  });

  it('the import door lives in Settings → DATA, and the export carries the bubble section', () => {
    const src = readFileSync(join(process.cwd(), 'app', '(tabs)', 'index.tsx'), 'utf8');
    expect(src).toContain('Import Studio Pack');
    expect(src).toContain('handleImportStudioPack');
    expect(src).toContain('parseStudioFile');
    expect(src).toContain('studioBubbles');
    expect(src).toContain('collectBubbleLinesForExport');
  });
});

describe('v222 WS3 — Books list: all 66, sections (v322: four, split by channel)', () => {
  const canon = Object.keys(CHAPTER_COUNTS);

  it('a fresh state puts the fully-noted books in Written, the rest in Not Started, exactly once', () => {
    const groups = groupBooksByStudy(seedStudyState(), canon);
    expect(groups.current).toEqual([]);
    expect(groups.finished).toEqual([]);
    // v324 re-base (his words, 2026-10-28 21:00 — "I have multiple
    // entire books finished with notes"): Written no longer starts
    // empty — membership is the union rule (stored Complete OR
    // noted in the resolved data), so a fresh state seats every
    // fully-noted shipped book there. The exact list is pinned in
    // bible-v324-written.test.ts.
    expect(groups.written).toContain('Genesis');
    expect(groups.written).toContain('1 Corinthians');
    expect(groups.notStarted).not.toContain('1 Corinthians');
    expect(groups.notStarted).toContain('Ezra');
    const all = [...groups.current, ...groups.finished, ...groups.written, ...groups.notStarted];
    expect(all).toHaveLength(66);
    expect(new Set(all).size).toBe(66);
    expect([...all].sort()).toEqual([...canon].sort());
  });

  it('a fixture exercising the sections: currentBook first, Write-only book in Current, writing-complete book in Written, untouched book in Not Started', () => {
    let state = seedStudyState();
    state = setCurrentBook(state, 'Leviticus');
    state = setChapterStatus(state, 'Leviticus', 1, 'complete');
    state = setChapterStatus(state, 'Colossians', 1, 'write');
    for (let c = 1; c <= CHAPTER_COUNTS['Mark']; c++) {
      state = setChapterStatus(state, 'Mark', c, 'complete');
    }
    const groups = groupBooksByStudy(state, canon);
    expect(groups.current[0]).toBe('Leviticus');
    expect(groups.current).toContain('Colossians');
    // v322 re-base (his ruling, 2026-10-28 20:12): Finished counts
    // the READ ones only — Mark is complete on the WRITING track
    // with zero read marks, so it lands in Written, not Finished.
    expect(groups.written).toContain('Mark');
    expect(groups.finished).not.toContain('Mark');
    // v324 re-base: untouched Ruth is noted cover to cover in the
    // shipped data, so she seats in Written now; the untouched-book
    // assertion moves to Ezra (no notes anywhere, no states).
    expect(groups.written).toContain('Ruth');
    expect(groups.notStarted).toContain('Ezra');
    const all = [...groups.current, ...groups.finished, ...groups.written, ...groups.notStarted];
    expect(all).toHaveLength(66);
    expect(new Set(all).size).toBe(66);
    expect([...all].sort()).toEqual([...canon].sort());
    // Canonical order inside Current after the pinned current book.
    const afterPinned = groups.current.slice(1);
    expect(afterPinned).toEqual([...afterPinned].sort((a, b) => canon.indexOf(a) - canon.indexOf(b)));
  });

  it('a writing-complete currentBook lands in Written, not Current (v322: Finished is read-only)', () => {
    let state = seedStudyState();
    state = setCurrentBook(state, 'Mark');
    for (let c = 1; c <= CHAPTER_COUNTS['Mark']; c++) {
      state = setChapterStatus(state, 'Mark', c, 'complete');
    }
    const groups = groupBooksByStudy(state, canon);
    // v322 re-base: under v222 this fixture read "finished" via the
    // writing channel; Finished is the read channel's now.
    expect(groups.written).toContain('Mark');
    expect(groups.finished).not.toContain('Mark');
    expect(groups.current).not.toContain('Mark');
  });

  it('a book carrying only a deliberate not-started override counts as started — it is Current, not Not Started', () => {
    // v324 re-base: this fixture used Ruth, but Ruth is noted cover
    // to cover in the shipped data and now seats in Written before
    // the override is ever consulted. Ezra (no notes anywhere)
    // carries the fixture's intent unchanged.
    let state = seedStudyState();
    state = setChapterStatus(state, 'Ezra', 1, 'not-started');
    const groups = groupBooksByStudy(state, canon);
    expect(groups.current).toContain('Ezra');
    expect(groups.notStarted).not.toContain('Ezra');
  });

  it('the Books view renders the sections and the row furniture', () => {
    const src = readFileSync(join(process.cwd(), 'app', 'bible-chapters.tsx'), 'utf8');
    expect(src).toContain('groupBooksByStudy');
    expect(src).toContain('>Current<');
    expect(src).toContain('>Finished<');
    // v322: writing gets its own section header on the page.
    expect(src).toContain('>Written<');
    expect(src).toContain('>Not Started<');
    expect(src).toContain('CurrentPill');
    expect(src).toContain('✎ on paper');
    // v313 re-base: the counts lead takes the drawing's word.
    expect(src).toContain('of ${total} written');
    expect(src).toContain('notes in ${notesCount}');
    expect(src).not.toContain('The rest of the canon');
  });
});
