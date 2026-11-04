// ─── v430 — import writes: diff-write + isolated section applies ─────────
// The Nov 4 failure: Jonathan's phone storage sits at the AsyncStorage
// ceiling (~5.8MB stored), and the pack he imported converted
// byte-identical to the chapters already on the phone — a no-change
// import. But saveStudioImports rewrote EVERY chapter of the merged
// map in one giant multiSet (~4.4MB in a single transaction); the
// write threw against the full database, the door's catch-all fired,
// and the schedule section — the part he actually needed — never ran.
//
// These pins hold the two halves of the fix:
//
//   · saveStudioImports writes only what changed: an identical map
//     performs ZERO chapter-value writes; one changed chapter writes
//     exactly its key; a new chapter writes only itself; a dropped
//     chapter is removed; a stored value that no longer parses (or
//     reads back different in content) counts as changed; writes go
//     in batches of at most 25 pairs, over the multi* surface and
//     over the single-key fallback surface alike.
//   · attemptStudioSection (the guard the import door wraps each
//     section in) records a throwing section by name with its reason
//     and lets the sections after it still run; a section that lands
//     records nothing.
//
// ─── v433 amendment ─────────────────────────────────────────────────────
// The store moved to files (bible-v433-imports-to-files.test.ts), so
// the diff-write pins below now run against the FILE store through a
// filesystem double: "chapter-value writes" are chapter-file writes,
// the index assertions read the file index, and the batch pin watches
// concurrent in-flight file writes instead of multiSet pair counts.
// Every behavioural claim is unchanged — the diff discipline is the
// same, only the surface it writes to moved. One pin keeps the old
// surface on purpose: the single-key test now runs against the
// database FALLBACK (no filesystem installed), where the v430
// chunked diff-write still stands behind the file save, with its
// original assertions intact.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type WriteCall =
  | { verb: 'setItem'; key: string }
  | { verb: 'multiSet'; keys: string[] }
  | { verb: 'removeItem'; key: string }
  | { verb: 'multiRemove'; keys: string[] };

const { store, rig, writeLog } = vi.hoisted(() => ({
  store: new Map<string, string>(),
  rig: { useMulti: true },
  writeLog: [] as WriteCall[],
}));

vi.mock('@react-native-async-storage/async-storage', () => {
  const single = {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      writeLog.push({ verb: 'setItem', key: k });
      store.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      writeLog.push({ verb: 'removeItem', key: k });
      store.delete(k);
    }),
    clear: vi.fn(async () => {
      store.clear();
    }),
  };
  const multi = {
    multiGet: vi.fn(async (keys: string[]) =>
      keys.map((k) => [k, store.get(k) ?? null] as [string, string | null]),
    ),
    multiSet: vi.fn(async (pairs: [string, string][]) => {
      writeLog.push({ verb: 'multiSet', keys: pairs.map(([k]) => k) });
      for (const [k, v] of pairs) store.set(k, v);
    }),
    multiRemove: vi.fn(async (keys: string[]) => {
      writeLog.push({ verb: 'multiRemove', keys: [...keys] });
      for (const k of keys) store.delete(k);
    }),
  };
  const api: Record<string, unknown> = { ...single };
  // The production store checks `typeof AsyncStorage.multiSet ===
  // 'function'` and falls back to the single-key surface when the
  // batch verbs are absent — the getters let one double play both.
  for (const name of ['multiGet', 'multiSet', 'multiRemove'] as const) {
    Object.defineProperty(api, name, {
      enumerable: true,
      get: () => (rig.useMulti ? multi[name] : undefined),
    });
  }
  return { default: api };
});

import {
  STUDIO_IMPORT_CHAPTER_KEY_PREFIX,
  STUDIO_IMPORT_INDEX_KEY,
  STUDIO_IMPORTS_FILE_DIRECTORY,
  applyStudioChapters,
  attemptStudioSection,
  formatStudioSectionFailures,
  loadStudioImports,
  saveStudioImports,
  setStudioImportsFileSystemForTests,
  studioImportChapterFileName,
  type StudioChapterPayload,
  type StudioImportsFileSystem,
  type StudioSectionFailure,
} from '../bible-v205/studio-import';

// ── v433: the filesystem double the diff pins now write against ─────────
// A flat path → contents map; the write log records every file write
// (chapter files and the index alike — the helpers below separate
// them), and in-flight tracking makes the batch size observable: a
// write counts itself in, yields, and counts itself out, so the
// deepest fan-out a save ever opens is on record.
const fsFiles = new Map<string, string>();
const fsDirs = new Set<string>();
const fsWriteLog: string[] = [];
const fsFlight = { inFlight: 0, maxInFlight: 0 };

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
    fsFlight.inFlight += 1;
    fsFlight.maxInFlight = Math.max(fsFlight.maxInFlight, fsFlight.inFlight);
    await new Promise((resolve) => setTimeout(resolve, 0));
    fsFlight.inFlight -= 1;
    fsWriteLog.push(path);
    fsFiles.set(path, contents);
  },
  deleteAsync: async (path: string) => {
    fsFiles.delete(path);
  },
};

beforeEach(() => {
  store.clear();
  writeLog.length = 0;
  rig.useMulti = true;
  fsFiles.clear();
  fsDirs.clear();
  fsWriteLog.length = 0;
  fsFlight.inFlight = 0;
  fsFlight.maxInFlight = 0;
  setStudioImportsFileSystemForTests(fsDouble);
  vi.clearAllMocks();
});

afterEach(() => {
  setStudioImportsFileSystemForTests(null);
});

const chapterKey = (mapKey: string) => `${STUDIO_IMPORT_CHAPTER_KEY_PREFIX}${mapKey}`;

/** Every FILE write that touched a chapter file (the file index is
 * not a chapter file). v433: the diff pins read the file store. */
const chapterWrites = (): string[] =>
  fsWriteLog.filter((p) => p.startsWith(FS_ROOT) && p !== fsIndexPath);

/** The chapter map keys a file write carried. */
const chapterKeysOf = (path: string): string[] => [
  decodeURIComponent(path.slice(FS_ROOT.length).replace(/\.json$/, '')),
];

/** Every AsyncStorage write call that touched a per-chapter value —
 * the pre-v433 accounting, kept for the one fallback-surface pin. */
const dbChapterWrites = (): WriteCall[] =>
  writeLog.filter((c) =>
    c.verb === 'setItem' || c.verb === 'removeItem'
      ? c.key.startsWith(STUDIO_IMPORT_CHAPTER_KEY_PREFIX)
      : c.keys.some((k) => k.startsWith(STUDIO_IMPORT_CHAPTER_KEY_PREFIX)),
  );

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

const seed = async (payloads: StudioChapterPayload[]) => {
  const { next } = applyStudioChapters({}, payloads);
  await saveStudioImports(next);
  writeLog.length = 0;
  fsWriteLog.length = 0;
  fsFlight.maxInFlight = 0;
  return next;
};

describe('v430 — saveStudioImports writes only what changed', () => {
  it('an identical map performs ZERO chapter-value writes', async () => {
    const map = await seed([payload('Genesis', 1, 'a'), payload('Genesis', 2, 'a')]);
    await saveStudioImports(map);
    expect(chapterWrites()).toEqual([]);
    // The store still reads back whole — a no-change save is a no-op,
    // never a wipe.
    await expect(loadStudioImports()).resolves.toEqual(map);
  });

  it('one changed chapter writes exactly that key', async () => {
    const map = await seed([payload('Genesis', 1, 'a'), payload('Genesis', 2, 'a')]);
    const changed = applyStudioChapters(map, [payload('Genesis', 2, 'b')]).next;
    await saveStudioImports(changed);
    const writes = chapterWrites();
    expect(writes).toHaveLength(1);
    expect(chapterKeysOf(writes[0])).toEqual(['Genesis|2']);
    expect(fsFiles.get(fsChapterPath('Genesis|2'))).toBe(JSON.stringify(changed['Genesis|2']));
    await expect(loadStudioImports()).resolves.toEqual(changed);
  });

  it('a new chapter writes only itself', async () => {
    const map = await seed([payload('Genesis', 1, 'a')]);
    const grown = applyStudioChapters(map, [payload('Exodus', 1, 'a')]).next;
    await saveStudioImports(grown);
    const writes = chapterWrites();
    expect(writes).toHaveLength(1);
    expect(chapterKeysOf(writes[0])).toEqual(['Exodus|1']);
    expect(JSON.parse(fsFiles.get(fsIndexPath)!).keys.sort()).toEqual([
      'Exodus|1',
      'Genesis|1',
    ]);
  });

  it('a dropped chapter is removed and the kept chapter is not rewritten', async () => {
    const map = await seed([payload('Genesis', 1, 'a'), payload('Genesis', 2, 'a')]);
    const smaller = { 'Genesis|1': map['Genesis|1'] };
    await saveStudioImports(smaller);
    expect(fsFiles.has(fsChapterPath('Genesis|2'))).toBe(false);
    expect(chapterWrites()).toEqual([]);
    expect(JSON.parse(fsFiles.get(fsIndexPath)!).keys).toEqual(['Genesis|1']);
    await expect(loadStudioImports()).resolves.toEqual(smaller);
  });

  it('a stored value that no longer parses counts as changed', async () => {
    const map = await seed([payload('Genesis', 1, 'a'), payload('Genesis', 2, 'a')]);
    fsFiles.set(fsChapterPath('Genesis|2'), '{corrupt');
    await saveStudioImports(map);
    const writes = chapterWrites();
    expect(writes).toHaveLength(1);
    expect(chapterKeysOf(writes[0])).toEqual(['Genesis|2']);
    expect(fsFiles.get(fsChapterPath('Genesis|2'))).toBe(JSON.stringify(map['Genesis|2']));
  });

  it('writes go in batches of at most 25 pairs', async () => {
    const books: [string, number][] = [
      ...Array.from({ length: 40 }, (_, i) => ['Genesis', i + 1] as [string, number]),
      ...Array.from({ length: 20 }, (_, i) => ['Exodus', i + 1] as [string, number]),
    ];
    const map = await seed(books.map(([b, c]) => payload(b, c, 'a')));
    const allChanged = applyStudioChapters(
      map,
      books.map(([b, c]) => payload(b, c, 'b')),
    ).next;
    await saveStudioImports(allChanged);
    // v433: the batch is a fan-out of file writes — all 60 land, and
    // no more than one batch (25) is ever in flight at once.
    expect(chapterWrites()).toHaveLength(60);
    expect(new Set(chapterWrites()).size).toBe(60);
    expect(fsFlight.maxInFlight).toBeLessThanOrEqual(25);
    expect(fsFlight.maxInFlight).toBeGreaterThan(1);
    await expect(loadStudioImports()).resolves.toEqual(allChanged);
  });

  it('over the single-key surface, an identical map still writes nothing', async () => {
    // v433 amendment: this pin now runs against the database
    // FALLBACK — no filesystem installed, so the save is the v430
    // chunked diff-write over the single-key AsyncStorage surface,
    // with the pin's original assertions (over the database write
    // log) intact.
    setStudioImportsFileSystemForTests(null);
    rig.useMulti = false;
    const map = await seed([payload('Genesis', 1, 'a'), payload('Genesis', 2, 'a')]);
    await saveStudioImports(map);
    expect(dbChapterWrites()).toEqual([]);
    await expect(loadStudioImports()).resolves.toEqual(map);
    expect(JSON.parse(store.get(STUDIO_IMPORT_INDEX_KEY)!).sort()).toEqual([
      'Genesis|1',
      'Genesis|2',
    ]);
    expect(store.get(chapterKey('Genesis|1'))).toBe(JSON.stringify(map['Genesis|1']));
  });
});

describe('v430 — attemptStudioSection isolates a failing section', () => {
  it('records the failure by name with its reason and later sections still run', async () => {
    const failures: StudioSectionFailure[] = [];
    const ran: string[] = [];
    await attemptStudioSection(failures, 'Notes', async () => {
      ran.push('notes');
    });
    await attemptStudioSection(failures, 'Schedule', async () => {
      throw new Error('database or disk is full');
    });
    await attemptStudioSection(failures, 'People', async () => {
      ran.push('people');
    });
    expect(ran).toEqual(['notes', 'people']);
    expect(failures).toEqual([{ section: 'Schedule', reason: 'database or disk is full' }]);
    expect(formatStudioSectionFailures(failures)).toBe(
      "Schedule didn't save: database or disk is full",
    );
  });

  it('a non-Error throw is recorded as its string, and a landed section records nothing', async () => {
    const failures: StudioSectionFailure[] = [];
    await attemptStudioSection(failures, 'States', async () => {
      // eslint-disable-next-line no-throw-literal
      throw 'quota exceeded';
    });
    await attemptStudioSection(failures, 'Ministries', async () => {});
    expect(failures).toEqual([{ section: 'States', reason: 'quota exceeded' }]);
  });
});
