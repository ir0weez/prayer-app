// ─── v243 — the imports store is sanitized at the read boundary ─────────────
// The Oct 25 blank-Bible diagnosis (hidden_files/blank-bible-diagnosis.md,
// H1) proved the mechanism synthetically: loadStudioImports handed the
// stored JSON to consumers verbatim, and consumers dereference the
// stored chapter shape unconditionally — one chapter whose entries lack
// `blocks` makes chapterDataHasNotes / buildDisplaySections throw, and
// on the Bible screens that throw unmounted the page onto the
// navigator's blank card. These pins hold the fix at the layer where
// the bug lives:
//
//   · the RAW poisoned map still throws in the consumers (the control —
//     the bug, reproduced at the data layer);
//   · the SANITIZED map never does: the poisoned chapter is dropped,
//     the chapter falls back to its shipped data, and every healthy
//     chapter in the same store survives with its values intact.

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

import { buildDisplaySections, getChapterData } from '../bible-v205/index';
import {
  STUDIO_IMPORT_KEY,
  applyStudioChapters,
  chapterHasNotes,
  loadStudioImports,
  resolveChapterData,
  sanitizeStudioImportsMap,
  type StudioChapterPayload,
  type StudioImportsMap,
} from '../bible-v205/studio-import';

beforeEach(() => {
  store.clear();
});

/** The diagnosis's synthetic poison: a Genesis 1 override in every way
 * plausible except its entries carry no `blocks` array. */
const BLOCKS_LESS: Record<string, unknown> = {
  'Genesis|1': {
    chapter: 1,
    intro: [{ kind: 'para', text: 'In the beginning.' }],
    previously: [],
    outline: [],
    sections: [{ start: 1, end: 3, title: null, entries: [{ start: 1, end: 3 }] }],
    stories: [],
  },
};

const GOOD_PACK: StudioChapterPayload = {
  book: 'Colossians',
  chapter: 1,
  opener: { kind: 'introduction', text: 'Paul opens with grace.' },
  sections: [{ start: 1, end: 3, title: null, entries: [{ start: 1, end: 3 }] }],
  notes: [
    { start: 1, end: 2, kind: 'note', blocks: [{ kind: 'para', text: 'Paul opens with grace.' }] },
  ],
};

describe('v243 — the control: the raw poisoned map throws in the consumers', () => {
  it('chapterHasNotes throws on an entry with no blocks (the H1 mechanism)', () => {
    const raw = BLOCKS_LESS as unknown as StudioImportsMap;
    expect(() => chapterHasNotes('Genesis', 1, raw)).toThrow();
  });

  it('buildDisplaySections throws on the same record', () => {
    const raw = BLOCKS_LESS as unknown as StudioImportsMap;
    const data = resolveChapterData('Genesis', 1, raw);
    expect(() => buildDisplaySections(data, 31)).toThrow();
  });
});

describe('v243 — sanitizeStudioImportsMap drops the poison, keeps the good', () => {
  it('the blocks-less chapter is dropped and Genesis 1 falls back to shipped data', () => {
    const clean = sanitizeStudioImportsMap(BLOCKS_LESS);
    expect(clean).toEqual({});
    expect(() => chapterHasNotes('Genesis', 1, clean)).not.toThrow();
    expect(chapterHasNotes('Genesis', 1, clean)).toBe(chapterHasNotes('Genesis', 1, {}));
    expect(resolveChapterData('Genesis', 1, clean)).toEqual(getChapterData('Genesis', 1));
    expect(() => buildDisplaySections(resolveChapterData('Genesis', 1, clean), 31)).not.toThrow();
  });

  it('a healthy chapter in the same store survives with its values intact', () => {
    const { next } = applyStudioChapters({}, [GOOD_PACK]);
    const mixed = { ...JSON.parse(JSON.stringify(BLOCKS_LESS)), ...JSON.parse(JSON.stringify(next)) };
    const clean = sanitizeStudioImportsMap(mixed);
    expect(Object.keys(clean)).toEqual(['Colossians|1']);
    expect(clean['Colossians|1']).toEqual(next['Colossians|1']);
  });

  it('a converter-built map round-trips the sanitizer unchanged', () => {
    const { next } = applyStudioChapters({}, [GOOD_PACK]);
    expect(sanitizeStudioImportsMap(JSON.parse(JSON.stringify(next)))).toEqual(next);
  });

  it('quote blocks keep their author and category through the sanitizer', () => {
    const record = {
      'Genesis|1': {
        chapter: 1,
        intro: [],
        previously: [],
        outline: [],
        sections: [
          {
            start: 1,
            end: 3,
            title: 'The opening',
            entries: [
              {
                start: 1,
                end: 2,
                blocks: [
                  { kind: 'quote', text: 'God said it plainly.', authorName: 'Cody', category: 'quote' },
                  { kind: 'scripture', text: 'In the beginning God created', ref: 'Genesis 1:1' },
                ],
              },
            ],
          },
        ],
        stories: [{ start: 1, end: 3 }],
      },
    };
    const clean = sanitizeStudioImportsMap(record);
    expect(clean['Genesis|1']).toEqual(record['Genesis|1']);
  });

  it('non-record roots sanitize to an empty map', () => {
    expect(sanitizeStudioImportsMap(null)).toEqual({});
    expect(sanitizeStudioImportsMap([])).toEqual({});
    expect(sanitizeStudioImportsMap('junk')).toEqual({});
    expect(sanitizeStudioImportsMap(42)).toEqual({});
  });

  it('keys that cannot name a chapter are dropped', () => {
    const good = applyStudioChapters({}, [GOOD_PACK]).next['Colossians|1'];
    const clean = sanitizeStudioImportsMap({ NoPipe: good, 'Colossians|x': good, 'Colossians|0': good });
    expect(clean).toEqual({});
  });
});

describe('v243 — every malformed shape is dropped, never handed on', () => {
  const base = () => ({
    chapter: 1,
    intro: [] as unknown[],
    previously: [] as unknown[],
    outline: [] as unknown[],
    sections: [
      { start: 1, end: 3, title: null, entries: [{ start: 1, end: 3, blocks: [{ kind: 'para', text: 'x' }] }] },
    ] as unknown[],
    stories: [] as unknown[],
  });
  const cases: [string, (r: ReturnType<typeof base>) => void][] = [
    ['sections is not an array', (r) => { r.sections = 'nope' as never; }],
    ['an entry has no blocks array', (r) => { (r.sections[0] as any).entries[0].blocks = undefined; }],
    ['blocks is not an array', (r) => { (r.sections[0] as any).entries[0].blocks = 'nope'; }],
    ['a block has no text', (r) => { (r.sections[0] as any).entries[0].blocks = [{ kind: 'para' }]; }],
    ['a block kind is unknown', (r) => { (r.sections[0] as any).entries[0].blocks = [{ kind: 'sticker', text: 'x' }]; }],
    ['a block category is unknown', (r) => { (r.sections[0] as any).entries[0].blocks = [{ kind: 'para', text: 'x', category: 'purple' }]; }],
    ['a section span is inverted', (r) => { (r.sections[0] as any).start = 5; (r.sections[0] as any).end = 2; }],
    ['intro is not an array', (r) => { r.intro = 'a string' as never; }],
    ['an intro block is malformed', (r) => { r.intro = [{ kind: 'para' }]; }],
    ['previously holds a non-string', (r) => { r.previously = [42]; }],
    ['an outline item has no range', (r) => { r.outline = [{ title: 'Start' }]; }],
    ['a stories span is inverted', (r) => { r.stories = [{ start: 9, end: 4 }]; }],
    ['verses holds a non-string', (r) => { (r as any).verses = { 1: 42 }; }],
    ['the chapter value is not a record', () => {}],
  ];
  for (const [name, spoil] of cases) {
    it(`dropped: ${name}`, () => {
      const record = base();
      spoil(record);
      const value = name === 'the chapter value is not a record' ? 42 : record;
      expect(sanitizeStudioImportsMap({ 'Genesis|1': value })).toEqual({});
    });
  }
});

describe('v243 — absent fields are repaired, not fatal', () => {
  it('a sparse older-writer record keeps its sections and gains the empty defaults', () => {
    const sparse = {
      'Genesis|2': {
        chapter: 2,
        sections: [
          { start: 1, end: 3, title: null, entries: [{ start: 1, end: 3, blocks: [{ kind: 'para', text: 'kept' }] }] },
        ],
      },
    };
    const clean = sanitizeStudioImportsMap(sparse);
    expect(clean['Genesis|2'].sections[0].entries[0].blocks[0].text).toBe('kept');
    expect(clean['Genesis|2'].intro).toEqual([]);
    expect(clean['Genesis|2'].previously).toEqual([]);
    expect(clean['Genesis|2'].outline).toEqual([]);
    expect(clean['Genesis|2'].stories).toEqual([]);
  });

  it('a stored chapter number that disagrees with its key is repaired from the key', () => {
    const clean = sanitizeStudioImportsMap({
      'Genesis|2': { chapter: 'two', intro: [], previously: [], outline: [], sections: [], stories: [] },
    });
    expect(clean['Genesis|2'].chapter).toBe(2);
  });

  it('a non-string section title becomes null, as the door itself repairs it', () => {
    const clean = sanitizeStudioImportsMap({
      'Genesis|2': {
        chapter: 2,
        intro: [],
        previously: [],
        outline: [],
        sections: [{ start: 1, end: 3, title: 7, entries: [] }],
        stories: [],
      },
    });
    expect(clean['Genesis|2'].sections[0].title).toBeNull();
  });
});

describe('v243 — loadStudioImports sanitizes what storage holds', () => {
  it('the poisoned store loads clean: chapter dropped, consumers safe, shipped fallback', async () => {
    store.set(STUDIO_IMPORT_KEY, JSON.stringify(BLOCKS_LESS));
    const loaded = await loadStudioImports();
    expect(loaded).toEqual({});
    expect(() => chapterHasNotes('Genesis', 1, loaded)).not.toThrow();
    expect(resolveChapterData('Genesis', 1, loaded)).toEqual(getChapterData('Genesis', 1));
  });

  it('a mixed store loads with the healthy chapter intact', async () => {
    const { next } = applyStudioChapters({}, [GOOD_PACK]);
    store.set(STUDIO_IMPORT_KEY, JSON.stringify({ ...BLOCKS_LESS, ...JSON.parse(JSON.stringify(next)) }));
    const loaded = await loadStudioImports();
    expect(loaded).toEqual(next);
  });

  it('a non-record stored value loads as an empty map', async () => {
    store.set(STUDIO_IMPORT_KEY, JSON.stringify([1, 2, 3]));
    expect(await loadStudioImports()).toEqual({});
  });
});
