// ─── v433 — the imports store moves to files ─────────────────────────────
// The chunked database store (v423) kept the imports readable, but it
// never made the database small: 243 chapter values / ~4.36MB of a
// ~5.82MB AsyncStorage database, hard against the ~6MB ceiling, and
// every write that needs the database to grow is refused
// (SQLITE_FULL — Nov 4: a pack import's schedule and ministries
// sections could not save). The chapters now live as files — one per
// chapter under prayercircle-studio-imports/, behind an index whose
// `verified` flag is the commit point — and these pins hold the move:
//
//   · the file store round-trips the map a database store held;
//   · the save keeps v430's diff discipline against files (identical
//     map = zero chapter-file writes, one change = one file write, a
//     dropped chapter's file is removed);
//   · the migration copies + verifies + deletes the database keys —
//     and a migration whose write or verification fails deletes
//     NOTHING and the loader still serves the database map;
//   · after the move, loads read the files, not the database;
//   · a readable legacy map migrates to files too (never via the
//     chunked store it is leaving behind).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── AsyncStorage double (the v430 shape: full multi* surface) ───────────
const { store, writeLog } = vi.hoisted(() => ({
  store: new Map<string, string>(),
  writeLog: [] as string[],
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      writeLog.push(k);
      store.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      writeLog.push(k);
      store.delete(k);
    }),
    clear: vi.fn(async () => {
      store.clear();
    }),
    getAllKeys: vi.fn(async () => [...store.keys()]),
    multiGet: vi.fn(async (keys: string[]) =>
      keys.map((k) => [k, store.get(k) ?? null] as [string, string | null]),
    ),
    multiSet: vi.fn(async (pairs: [string, string][]) => {
      for (const [k, v] of pairs) {
        writeLog.push(k);
        store.set(k, v);
      }
    }),
    multiRemove: vi.fn(async (keys: string[]) => {
      for (const k of keys) {
        writeLog.push(k);
        store.delete(k);
      }
    }),
  },
}));

vi.mock('../photo-backup', () => ({
  createPhotoBackup: async () => ({}),
  getPhotoBackupPayload: () => null,
}));

import {
  STUDIO_IMPORT_CHAPTER_KEY_PREFIX,
  STUDIO_IMPORT_INDEX_KEY,
  STUDIO_IMPORT_KEY,
  STUDIO_IMPORTS_FILE_DIRECTORY,
  applyStudioChapters,
  loadStudioImports,
  saveStudioImports,
  setStudioImportsFileSystemForTests,
  studioImportChapterFileName,
  type StudioChapterPayload,
  type StudioImportsFileSystem,
} from '../bible-v205/studio-import';
import { buildExportPayload } from '../bible-v205/export-payload';

// ── Filesystem double: a flat map of path → contents ────────────────────
const fsFiles = new Map<string, string>();
const fsDirs = new Set<string>();
const fsWriteLog: string[] = [];
const fsRig = {
  failAllWrites: false,
  failWriteContaining: [] as string[],
  corruptWriteContaining: [] as string[],
};

const DOCS = 'file:///docs/';
const ROOT = `${DOCS}${STUDIO_IMPORTS_FILE_DIRECTORY}/`;
const chapterPath = (mapKey: string) => `${ROOT}${studioImportChapterFileName(mapKey)}`;
const indexPath = `${ROOT}index.json`;

const fsDouble: StudioImportsFileSystem = {
  documentDirectory: DOCS,
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
    if (
      fsRig.failAllWrites ||
      fsRig.failWriteContaining.some((needle) => path.includes(needle))
    ) {
      throw new Error('ENOSPC: no space left on device (rigged)');
    }
    fsWriteLog.push(path);
    const corrupted = fsRig.corruptWriteContaining.some((needle) => path.includes(needle));
    fsFiles.set(path, corrupted ? `${contents} garbage` : contents);
  },
  deleteAsync: async (path: string) => {
    fsFiles.delete(path);
  },
};

beforeEach(() => {
  store.clear();
  writeLog.length = 0;
  fsFiles.clear();
  fsDirs.clear();
  fsWriteLog.length = 0;
  fsRig.failAllWrites = false;
  fsRig.failWriteContaining = [];
  fsRig.corruptWriteContaining = [];
  setStudioImportsFileSystemForTests(fsDouble);
  vi.clearAllMocks();
});

afterEach(() => {
  setStudioImportsFileSystemForTests(null);
});

const payload = (book: string, chapter: number, marker: string): StudioChapterPayload => ({
  book,
  chapter,
  opener: { kind: 'introduction', text: `${book} ${chapter} opener ${marker}.` },
  sections: [{ start: 1, end: 10, title: null, entries: [{ start: 1, end: 10 }] }],
  notes: [
    {
      start: 1,
      end: 10,
      kind: 'note',
      blocks: [{ kind: 'para', text: `${book} ${chapter} note ${marker}.` }],
    },
  ],
});

const chapterWrites = (): string[] =>
  fsWriteLog.filter((p) => p.startsWith(ROOT) && p !== indexPath);

/** Seed the v423 chunked database layout directly, the way his phone
 * holds it today: an index plus one value per chapter. */
const seedDbChunks = (map: Record<string, unknown>) => {
  const keys = Object.keys(map);
  store.set(STUDIO_IMPORT_INDEX_KEY, JSON.stringify(keys));
  for (const key of keys) {
    store.set(`${STUDIO_IMPORT_CHAPTER_KEY_PREFIX}${key}`, JSON.stringify(map[key]));
  }
};

describe('v433 — the file store round-trips', () => {
  it('save → load returns the map, and the database holds no chapters', async () => {
    const { next } = applyStudioChapters({}, [payload('Genesis', 1, 'a'), payload('Psalms', 1, 'a')]);
    await saveStudioImports(next);
    await expect(loadStudioImports()).resolves.toEqual(next);
    expect(fsFiles.get(chapterPath('Genesis|1'))).toBe(JSON.stringify(next['Genesis|1']));
    expect(fsFiles.get(chapterPath('Psalms|1'))).toBe(JSON.stringify(next['Psalms|1']));
    const index = JSON.parse(fsFiles.get(indexPath)!);
    expect(index.verified).toBe(true);
    expect([...index.keys].sort()).toEqual(['Genesis|1', 'Psalms|1']);
    // The relief itself: nothing chapter-sized ever touched the database.
    expect([...store.keys()].filter((k) => k.startsWith(STUDIO_IMPORT_CHAPTER_KEY_PREFIX))).toEqual([]);
    expect(store.has(STUDIO_IMPORT_INDEX_KEY)).toBe(false);
    expect(store.has(STUDIO_IMPORT_KEY)).toBe(false);
  });

  it('an identical map performs ZERO chapter-file writes', async () => {
    const { next } = applyStudioChapters({}, [payload('Genesis', 1, 'a'), payload('Genesis', 2, 'a')]);
    await saveStudioImports(next);
    fsWriteLog.length = 0;
    await saveStudioImports(next);
    expect(chapterWrites()).toEqual([]);
    await expect(loadStudioImports()).resolves.toEqual(next);
  });

  it('one changed chapter writes exactly its file', async () => {
    const map = applyStudioChapters({}, [payload('Genesis', 1, 'a'), payload('Genesis', 2, 'a')]).next;
    await saveStudioImports(map);
    fsWriteLog.length = 0;
    const changed = applyStudioChapters(map, [payload('Genesis', 2, 'b')]).next;
    await saveStudioImports(changed);
    expect(chapterWrites()).toEqual([chapterPath('Genesis|2')]);
    expect(fsFiles.get(chapterPath('Genesis|2'))).toBe(JSON.stringify(changed['Genesis|2']));
    await expect(loadStudioImports()).resolves.toEqual(changed);
  });

  it('a dropped chapter loses its file and the kept chapter is not rewritten', async () => {
    const map = applyStudioChapters({}, [payload('Genesis', 1, 'a'), payload('Genesis', 2, 'a')]).next;
    await saveStudioImports(map);
    fsWriteLog.length = 0;
    const smaller = { 'Genesis|1': map['Genesis|1'] };
    await saveStudioImports(smaller);
    expect(fsFiles.has(chapterPath('Genesis|2'))).toBe(false);
    expect(chapterWrites()).toEqual([]);
    expect(JSON.parse(fsFiles.get(indexPath)!).keys).toEqual(['Genesis|1']);
    await expect(loadStudioImports()).resolves.toEqual(smaller);
  });

  it('a stored file that no longer parses counts as changed', async () => {
    const map = applyStudioChapters({}, [payload('Genesis', 1, 'a'), payload('Genesis', 2, 'a')]).next;
    await saveStudioImports(map);
    fsFiles.set(chapterPath('Genesis|2'), '{corrupt');
    fsWriteLog.length = 0;
    await saveStudioImports(map);
    expect(chapterWrites()).toEqual([chapterPath('Genesis|2')]);
    expect(fsFiles.get(chapterPath('Genesis|2'))).toBe(JSON.stringify(map['Genesis|2']));
  });
});

describe('v433 — the migration: copy, verify, then (and only then) delete', () => {
  it('a chunked database library moves to files and the database keys are deleted', async () => {
    const map = applyStudioChapters(
      {},
      [payload('Matthew', 1, 'a'), payload('Psalms', 1, 'a'), payload('Genesis', 4, 'a')],
    ).next;
    seedDbChunks(map);
    const loaded = await loadStudioImports();
    expect(loaded).toEqual(map);
    // The copy is on disk, verified, content-equal.
    const index = JSON.parse(fsFiles.get(indexPath)!);
    expect(index.verified).toBe(true);
    expect([...index.keys].sort()).toEqual(['Genesis|4', 'Matthew|1', 'Psalms|1']);
    for (const key of Object.keys(map)) {
      expect(fsFiles.get(chapterPath(key))).toBe(JSON.stringify(map[key]));
    }
    // And the ~4.36MB is actually freed: no chunk keys, no index, no legacy.
    expect(store.size).toBe(0);
  });

  it('when the copy cannot be written, nothing is deleted and the loader serves the database', async () => {
    const map = applyStudioChapters({}, [payload('Matthew', 1, 'a'), payload('Psalms', 1, 'a')]).next;
    seedDbChunks(map);
    fsRig.failAllWrites = true;
    const loaded = await loadStudioImports();
    expect(loaded).toEqual(map);
    expect(store.get(STUDIO_IMPORT_INDEX_KEY)).toBe(JSON.stringify(['Matthew|1', 'Psalms|1']));
    expect(store.get(`${STUDIO_IMPORT_CHAPTER_KEY_PREFIX}Matthew|1`)).toBe(
      JSON.stringify(map['Matthew|1']),
    );
    expect(store.get(`${STUDIO_IMPORT_CHAPTER_KEY_PREFIX}Psalms|1`)).toBe(
      JSON.stringify(map['Psalms|1']),
    );
    // No verified index was left behind to shadow the database.
    const rawIndex = fsFiles.get(indexPath);
    if (rawIndex !== undefined) expect(JSON.parse(rawIndex).verified).not.toBe(true);
    // And the move simply retries on a later load — and lands.
    fsRig.failAllWrites = false;
    await expect(loadStudioImports()).resolves.toEqual(map);
    expect(store.size).toBe(0);
    expect(JSON.parse(fsFiles.get(indexPath)!).verified).toBe(true);
  });

  it('when a written file does not read back as the chapter, verification refuses the move', async () => {
    const map = applyStudioChapters({}, [payload('Matthew', 1, 'a'), payload('Psalms', 1, 'a')]).next;
    seedDbChunks(map);
    fsRig.corruptWriteContaining = [studioImportChapterFileName('Psalms|1')];
    const loaded = await loadStudioImports();
    expect(loaded).toEqual(map);
    // The database is untouched and the index never committed.
    expect(store.size).toBe(3);
    expect(JSON.parse(fsFiles.get(indexPath)!).verified).toBe(false);
  });

  it('after the move, loads read the files — a stale database copy cannot shadow them', async () => {
    const map = applyStudioChapters({}, [payload('Matthew', 1, 'a')]).next;
    seedDbChunks(map);
    await loadStudioImports();
    expect(store.size).toBe(0);
    // A restore re-lands an older chunked copy in the database…
    const stale = applyStudioChapters({}, [payload('Matthew', 1, 'STALE')]).next;
    seedDbChunks(stale);
    // …and the loader still serves the files' chapters.
    await expect(loadStudioImports()).resolves.toEqual(map);
  });

  it('a readable legacy map migrates to files, not through the chunked store', async () => {
    const map = applyStudioChapters({}, [payload('Matthew', 1, 'a')]).next;
    store.set(STUDIO_IMPORT_KEY, JSON.stringify(map));
    const loaded = await loadStudioImports();
    expect(loaded).toEqual(map);
    expect(fsFiles.get(chapterPath('Matthew|1'))).toBe(JSON.stringify(map['Matthew|1']));
    expect(JSON.parse(fsFiles.get(indexPath)!).verified).toBe(true);
    // Legacy key gone, and no chunk keys were ever written on the way.
    expect(store.size).toBe(0);
  });

  it('a save that arrives before the move migrates first, then diffs against files', async () => {
    const stored = applyStudioChapters({}, [payload('Genesis', 1, 'a'), payload('Genesis', 2, 'a')]).next;
    seedDbChunks(stored);
    const changed = applyStudioChapters(stored, [payload('Genesis', 2, 'b')]).next;
    await saveStudioImports(changed);
    await expect(loadStudioImports()).resolves.toEqual(changed);
    expect(store.size).toBe(0);
    // Two migration copies + exactly one diff write for the one change.
    expect(chapterWrites()).toHaveLength(3);
    expect(fsFiles.get(chapterPath('Genesis|2'))).toBe(JSON.stringify(changed['Genesis|2']));
  });
});

describe('v433 — backups still carry the chapters (export-payload)', () => {
  it('a backup built after the move holds the map under the legacy key AND the chunked keys', async () => {
    const map = applyStudioChapters(
      {},
      [payload('Matthew', 1, 'a'), payload('Psalms', 1, 'a')],
    ).next;
    await saveStudioImports(map);
    // Post-move reality: the database dump alone would carry nothing.
    expect(store.size).toBe(0);
    const parsed = JSON.parse(await buildExportPayload()) as {
      storage: Record<string, string | null>;
    };
    // The desk's shape: the whole map under the one key.
    expect(parsed.storage[STUDIO_IMPORT_KEY]).toBe(JSON.stringify(map));
    // The phone restore's shape: index + one small value per chapter.
    expect(JSON.parse(parsed.storage[STUDIO_IMPORT_INDEX_KEY]!)).toEqual([
      'Matthew|1',
      'Psalms|1',
    ]);
    expect(parsed.storage[`${STUDIO_IMPORT_CHAPTER_KEY_PREFIX}Matthew|1`]).toBe(
      JSON.stringify(map['Matthew|1']),
    );
    expect(parsed.storage[`${STUDIO_IMPORT_CHAPTER_KEY_PREFIX}Psalms|1`]).toBe(
      JSON.stringify(map['Psalms|1']),
    );
  });
});

describe('v433 — no filesystem, no move (the fallback still serves)', () => {
  it('with no file surface, the chunked database store behaves exactly as before', async () => {
    setStudioImportsFileSystemForTests(null);
    // The real surface cannot load in the suite — the same "no file
    // store" answer a platform without documents would give.
    const { next } = applyStudioChapters({}, [payload('Genesis', 1, 'a')]);
    await saveStudioImports(next);
    await expect(loadStudioImports()).resolves.toEqual(next);
    expect(JSON.parse(store.get(STUDIO_IMPORT_INDEX_KEY)!)).toEqual(['Genesis|1']);
    expect(store.get(`${STUDIO_IMPORT_CHAPTER_KEY_PREFIX}Genesis|1`)).toBe(
      JSON.stringify(next['Genesis|1']),
    );
  });
});
