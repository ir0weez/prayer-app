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

import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  applyStudioChapters,
  attemptStudioSection,
  formatStudioSectionFailures,
  loadStudioImports,
  saveStudioImports,
  type StudioChapterPayload,
  type StudioSectionFailure,
} from '../bible-v205/studio-import';

beforeEach(() => {
  store.clear();
  writeLog.length = 0;
  rig.useMulti = true;
  vi.clearAllMocks();
});

const chapterKey = (mapKey: string) => `${STUDIO_IMPORT_CHAPTER_KEY_PREFIX}${mapKey}`;

/** Every write call that touched a per-chapter value (the index key
 * and the legacy key are not chapter values). */
const chapterWrites = (): WriteCall[] =>
  writeLog.filter((c) =>
    c.verb === 'setItem' || c.verb === 'removeItem'
      ? c.key.startsWith(STUDIO_IMPORT_CHAPTER_KEY_PREFIX)
      : c.keys.some((k) => k.startsWith(STUDIO_IMPORT_CHAPTER_KEY_PREFIX)),
  );

/** The chapter storage keys a write call carried. */
const chapterKeysOf = (c: WriteCall): string[] =>
  c.verb === 'setItem' || c.verb === 'removeItem'
    ? [c.key]
    : c.keys.filter((k) => k.startsWith(STUDIO_IMPORT_CHAPTER_KEY_PREFIX));

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
    expect(chapterKeysOf(writes[0])).toEqual([chapterKey('Genesis|2')]);
    expect(store.get(chapterKey('Genesis|2'))).toBe(JSON.stringify(changed['Genesis|2']));
    await expect(loadStudioImports()).resolves.toEqual(changed);
  });

  it('a new chapter writes only itself', async () => {
    const map = await seed([payload('Genesis', 1, 'a')]);
    const grown = applyStudioChapters(map, [payload('Exodus', 1, 'a')]).next;
    await saveStudioImports(grown);
    const writes = chapterWrites();
    expect(writes).toHaveLength(1);
    expect(chapterKeysOf(writes[0])).toEqual([chapterKey('Exodus|1')]);
    expect(JSON.parse(store.get(STUDIO_IMPORT_INDEX_KEY)!).sort()).toEqual([
      'Exodus|1',
      'Genesis|1',
    ]);
  });

  it('a dropped chapter is removed and the kept chapter is not rewritten', async () => {
    const map = await seed([payload('Genesis', 1, 'a'), payload('Genesis', 2, 'a')]);
    const smaller = { 'Genesis|1': map['Genesis|1'] };
    await saveStudioImports(smaller);
    expect(store.has(chapterKey('Genesis|2'))).toBe(false);
    const valueWrites = chapterWrites().filter(
      (c) => c.verb === 'setItem' || c.verb === 'multiSet',
    );
    expect(valueWrites).toEqual([]);
    expect(JSON.parse(store.get(STUDIO_IMPORT_INDEX_KEY)!)).toEqual(['Genesis|1']);
    await expect(loadStudioImports()).resolves.toEqual(smaller);
  });

  it('a stored value that no longer parses counts as changed', async () => {
    const map = await seed([payload('Genesis', 1, 'a'), payload('Genesis', 2, 'a')]);
    store.set(chapterKey('Genesis|2'), '{corrupt');
    await saveStudioImports(map);
    const writes = chapterWrites();
    expect(writes).toHaveLength(1);
    expect(chapterKeysOf(writes[0])).toEqual([chapterKey('Genesis|2')]);
    expect(store.get(chapterKey('Genesis|2'))).toBe(JSON.stringify(map['Genesis|2']));
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
    const sets = writeLog.filter((c) => c.verb === 'multiSet');
    expect(sets.length).toBeGreaterThanOrEqual(3);
    for (const call of sets) {
      if (call.verb === 'multiSet') expect(call.keys.length).toBeLessThanOrEqual(25);
    }
    const written = new Set(sets.flatMap((c) => (c.verb === 'multiSet' ? c.keys : [])));
    expect(written.size).toBe(60);
    await expect(loadStudioImports()).resolves.toEqual(allChanged);
  });

  it('over the single-key surface, an identical map still writes nothing', async () => {
    rig.useMulti = false;
    const map = await seed([payload('Genesis', 1, 'a'), payload('Genesis', 2, 'a')]);
    await saveStudioImports(map);
    expect(chapterWrites()).toEqual([]);
    await expect(loadStudioImports()).resolves.toEqual(map);
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
