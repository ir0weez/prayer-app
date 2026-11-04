// ─── v423 — the imports store is chunked: one value per chapter ────────────
// The pre-v423 store kept the whole imports map as ONE JSON string. On
// Jonathan's phone that value outgrew what Android's AsyncStorage can
// read back: writes succeeded (imports reported success, with chapter
// counts) while reads failed — and the loader's catch turned the
// failure into {}, so screens silently fell back to the shipped text
// and imported notes never rendered. These pins hold the new layout:
//
//   · a save/load round-trip returns the map untouched, under an index
//     key plus one storage value per chapter — never the legacy key;
//   · a legacy value too large to read back loads as {} (no throw),
//     and the door's load → apply → save → load flow still lands the
//     chapters, each stored value under the read ceiling;
//   · a legacy map small enough to read migrates on first load: the
//     entries come back, the chunked layout is written, the legacy
//     key is removed, and the next load reads the chunked path;
//   · saving a smaller map removes the dropped chapters' values and
//     trims the index.
//
// The storage double models the phone failure directly: setItem always
// succeeds; a read (single or batched) of a value over rig.getLimit
// throws, the way the oversized legacy read fails on device.
//
// ─── v433 amendment ─────────────────────────────────────────────────────
// The store moved to files (bible-v433-imports-to-files.test.ts). The
// pins below keep their claims — round-trip, the oversized legacy
// value, the readable legacy map, deletion diffing — but the layout
// they assert is now the FILE layout, read through a filesystem
// double: an index file plus one file per chapter, and a database
// that holds no chapters at all. The chunked database store survives
// only as the loader's migration SOURCE (and the no-filesystem
// fallback), which is why the legacy migration pin now ends in files.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
const rig = { getLimit: Number.POSITIVE_INFINITY };
const readValue = (k: string): string | null => {
  const v = store.get(k) ?? null;
  if (v !== null && v.length > rig.getLimit) {
    throw new Error(`value for ${k} is ${v.length} bytes — too large to read back`);
  }
  return v;
};
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (k: string) => readValue(k)),
    setItem: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      store.delete(k);
    }),
    clear: vi.fn(async () => {
      store.clear();
    }),
    multiGet: vi.fn(async (keys: string[]) =>
      keys.map((k) => [k, readValue(k)] as [string, string | null]),
    ),
    multiSet: vi.fn(async (pairs: [string, string][]) => {
      for (const [k, v] of pairs) store.set(k, v);
    }),
    multiRemove: vi.fn(async (keys: string[]) => {
      for (const k of keys) store.delete(k);
    }),
  },
}));

import {
  STUDIO_IMPORT_CHAPTER_KEY_PREFIX,
  STUDIO_IMPORT_INDEX_KEY,
  STUDIO_IMPORT_KEY,
  STUDIO_IMPORTS_FILE_DIRECTORY,
  applyStudioChapters,
  loadStudioImports,
  resolveChapterData,
  saveStudioImports,
  setStudioImportsFileSystemForTests,
  studioImportChapterFileName,
  type StudioChapterPayload,
  type StudioImportsFileSystem,
} from '../bible-v205/studio-import';

// ── v433: the filesystem double the layout pins now read ────────────────
const fsFiles = new Map<string, string>();
const fsDirs = new Set<string>();
const FS_DOCS = 'file:///docs/';
const FS_ROOT = `${FS_DOCS}${STUDIO_IMPORTS_FILE_DIRECTORY}/`;
const fsIndexPath = `${FS_ROOT}index.json`;
const fsChapterPath = (mapKey: string) => `${FS_ROOT}${studioImportChapterFileName(mapKey)}`;
const fsDouble: StudioImportsFileSystem = {
  documentDirectory: FS_DOCS,
  getInfoAsync: async (path: string) => ({
    exists: fsDirs.has(path) || fsFiles.has(path),
  }),
  makeDirectoryAsync: async (path: string) => {
    fsDirs.add(path);
  },
  readAsStringAsync: async (path: string) => {
    const value = fsFiles.get(path);
    if (value === undefined) throw new Error(`ENOENT: no such file ${path}`);
    return value;
  },
  writeAsStringAsync: async (path: string, contents: string) => {
    fsFiles.set(path, contents);
  },
  deleteAsync: async (path: string) => {
    fsFiles.delete(path);
  },
};

beforeEach(() => {
  store.clear();
  rig.getLimit = Number.POSITIVE_INFINITY;
  fsFiles.clear();
  fsDirs.clear();
  setStudioImportsFileSystemForTests(fsDouble);
});

afterEach(() => {
  setStudioImportsFileSystemForTests(null);
});

/** The paragraph rollout's shape: one note whose blocks are MERGED
 * paragraphs (three of them for Matthew 1), not one sentence apiece. */
const MATTHEW_1: StudioChapterPayload = {
  book: 'Matthew',
  chapter: 1,
  opener: { kind: 'introduction', text: 'Matthew opens with a genealogy.' },
  sections: [
    {
      start: 1,
      end: 25,
      title: 'Ver. 1–25: The Purpose',
      entries: [
        { start: 1, end: 2 },
        { start: 3, end: 25 },
      ],
    },
  ],
  notes: [
    {
      start: 1,
      end: 2,
      kind: 'note',
      blocks: [
        {
          kind: 'para',
          text: 'Right off the bat, Matthew deflects his own authority in writing this book. In fact, we get no real reason to even believe that this book is written by Matthew.',
        },
        {
          kind: 'para',
          text: 'We only have a few pieces of evidence that suggest that Matthew is the author.',
        },
        {
          kind: 'para',
          text: 'First, we might notice that even in the early church the scribes associated it with the Apostle Matthew.',
        },
      ],
    },
  ],
};

const PSALMS_1: StudioChapterPayload = {
  book: 'Psalms',
  chapter: 1,
  opener: { kind: 'introduction', text: 'David gives us the doorway into the Psalms.' },
  sections: [
    {
      start: 1,
      end: 6,
      title: 'Ver. 1–6: The Two Ways',
      entries: [
        { start: 1, end: 3 },
        { start: 4, end: 6 },
      ],
    },
  ],
  notes: [
    {
      start: 1,
      end: 3,
      kind: 'note',
      blocks: [
        { kind: 'para', text: 'Right off the bat, David gives us two ways to live.' },
        { kind: 'para', text: 'The blessed man is planted, not scattered.' },
      ],
    },
  ],
};

describe('v423 — the chunked store round-trips', () => {
  it('save → load returns the same map, and Matthew 1 resolves to its merged paragraphs', async () => {
    const { next } = applyStudioChapters({}, [MATTHEW_1, PSALMS_1]);
    await saveStudioImports(next);
    const loaded = await loadStudioImports();
    expect(loaded).toEqual(next);
    const data = resolveChapterData('Matthew', 1, loaded);
    const paras = data!.sections[0].entries[0].blocks.filter((b) => b.kind === 'para');
    expect(paras).toHaveLength(3);
    expect(paras[0].text).toContain('Right off the bat, Matthew deflects');
  });

  it('the layout is an index plus one value per chapter — never the legacy key', async () => {
    // v433 amendment: the layout is files now — an index file plus
    // one file per chapter — and the database holds none of it.
    const { next } = applyStudioChapters({}, [MATTHEW_1, PSALMS_1]);
    await saveStudioImports(next);
    expect(store.has(STUDIO_IMPORT_KEY)).toBe(false);
    expect(store.has(STUDIO_IMPORT_INDEX_KEY)).toBe(false);
    expect(store.has(`${STUDIO_IMPORT_CHAPTER_KEY_PREFIX}Matthew|1`)).toBe(false);
    const index = JSON.parse(fsFiles.get(fsIndexPath)!) as { keys: string[]; verified: boolean };
    expect(index.verified).toBe(true);
    expect([...index.keys].sort()).toEqual(['Matthew|1', 'Psalms|1']);
    expect(fsFiles.get(fsChapterPath('Matthew|1'))).toBe(JSON.stringify(next['Matthew|1']));
    expect(fsFiles.get(fsChapterPath('Psalms|1'))).toBe(JSON.stringify(next['Psalms|1']));
  });
});

describe('v423 — the oversized legacy value (the phone failure, modeled)', () => {
  const LIMIT = 100_000;
  const bigPayload = (book: string, chapter: number): StudioChapterPayload => ({
    book,
    chapter,
    opener: { kind: 'introduction', text: `${book} ${chapter} opener.` },
    sections: [{ start: 1, end: 10, title: null, entries: [{ start: 1, end: 10 }] }],
    notes: [
      {
        start: 1,
        end: 10,
        kind: 'note',
        blocks: [1, 2, 3].map((i) => ({
          kind: 'para' as const,
          text: `${book} ${chapter} paragraph ${i}. ${'word '.repeat(3000)}`,
        })),
      },
    ],
  });
  const BIG_PACK = [bigPayload('Genesis', 1), bigPayload('Genesis', 2), bigPayload('Exodus', 1), bigPayload('Exodus', 2)];

  it('an unreadable legacy map loads as {} without throwing — then the chunked save lands', async () => {
    // v433 amendment: the door's save now lands in FILES (one file
    // per chapter, each under the read ceiling); the claim — the
    // chapters come back whole — is unchanged.
    const { next } = applyStudioChapters({}, BIG_PACK);
    // The whole map is over the read ceiling; each chapter is under it.
    expect(JSON.stringify(next).length).toBeGreaterThan(LIMIT);
    for (const chapter of Object.values(next)) {
      expect(JSON.stringify(chapter).length).toBeLessThanOrEqual(LIMIT);
    }
    store.set(STUDIO_IMPORT_KEY, JSON.stringify(next));
    rig.getLimit = LIMIT;
    await expect(loadStudioImports()).resolves.toEqual({});
    // The import door's own flow: load, apply onto what loaded, save,
    // and the next load must hand the chapters back.
    const applied = applyStudioChapters(await loadStudioImports(), BIG_PACK);
    await saveStudioImports(applied.next);
    await expect(loadStudioImports()).resolves.toEqual(applied.next);
    // Every value now in storage fits under the read ceiling —
    // database values and chapter files alike.
    for (const v of store.values()) expect(v.length).toBeLessThanOrEqual(LIMIT);
    for (const v of fsFiles.values()) expect(v.length).toBeLessThanOrEqual(LIMIT);
  });
});

describe('v423 — a readable legacy map migrates on first load', () => {
  it('returns the entries, writes the chunked layout, removes the legacy key', async () => {
    // v433 amendment: the migration target is the FILE store — the
    // entries return, the file layout is written (verified), the
    // legacy key is removed, and the database never holds the
    // chapters, not even on the way through.
    const { next } = applyStudioChapters({}, [MATTHEW_1]);
    store.set(STUDIO_IMPORT_KEY, JSON.stringify(next));
    const loaded = await loadStudioImports();
    expect(loaded).toEqual(next);
    expect(store.has(STUDIO_IMPORT_KEY)).toBe(false);
    expect(store.has(STUDIO_IMPORT_INDEX_KEY)).toBe(false);
    expect(store.has(`${STUDIO_IMPORT_CHAPTER_KEY_PREFIX}Matthew|1`)).toBe(false);
    const index = JSON.parse(fsFiles.get(fsIndexPath)!) as { keys: string[]; verified: boolean };
    expect(index.verified).toBe(true);
    expect(index.keys).toEqual(['Matthew|1']);
    expect(fsFiles.get(fsChapterPath('Matthew|1'))).toBe(JSON.stringify(next['Matthew|1']));
    // The database is empty, so a second load can only be the file
    // path — and it still returns the entries.
    expect(store.size).toBe(0);
    await expect(loadStudioImports()).resolves.toEqual(next);
  });
});

describe('v423 — deletion diffing', () => {
  it('saving a smaller map removes the dropped chapter value and trims the index', async () => {
    // v433 amendment: the dropped chapter's FILE is removed and the
    // file index trimmed; the database assertion survives as the
    // stronger one — it never holds the chapter at all.
    const a = applyStudioChapters({}, [MATTHEW_1, PSALMS_1]).next;
    await saveStudioImports(a);
    const b = { 'Matthew|1': a['Matthew|1'] };
    await saveStudioImports(b);
    expect(fsFiles.has(fsChapterPath('Psalms|1'))).toBe(false);
    expect(store.has(`${STUDIO_IMPORT_CHAPTER_KEY_PREFIX}Psalms|1`)).toBe(false);
    const index = JSON.parse(fsFiles.get(fsIndexPath)!) as { keys: string[] };
    expect(index.keys).toEqual(['Matthew|1']);
    await expect(loadStudioImports()).resolves.toEqual(b);
  });
});
