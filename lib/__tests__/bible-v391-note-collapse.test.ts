// ─── v391 — the chapter page remembers whether he closed a note ────────────
// His ask (2026-10-31): "Can it remember whether you closed a note
// or not? That way I know where I've left off and what I've already
// talked about in a study." Plus his addendum: "When you reset the
// whole Bible read count, it can open all the notes back up too."
//
// The record is one flat store (note-collapse.ts): entryKey —
// Book|chapter|start-end, the key his marks hang on — -> the open
// state he left that note in. The chapter page loads it into the
// same open map the chevron toggles write, and writes every change
// through. A note with no record resolves null here, and the page
// applies its standing defaults (open when it carries blocks) —
// untouched notes behave exactly as before v391. The whole-Bible
// reading reset (the Books screen's resetReading) clears the store
// beside resetReadingProgress, so a fresh read-through starts with
// every note back at its default.

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

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearNoteCollapse,
  loadNoteCollapse,
  NOTE_COLLAPSE_KEY,
  recordedNoteOpen,
  sanitizeNoteCollapse,
  saveNoteCollapse,
} from '../bible-v205/note-collapse';
import { entryKey } from '../bible-v205/types';

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');
const chapterPage = () => read('components/bible-v205/chapter-page.tsx');
const chaptersScreen = () => read('app/bible-chapters.tsx');

const BOOK = '1 John';
const CH = 1;
const keyA = entryKey(BOOK, CH, 5, 9);
const keyB = entryKey(BOOK, CH, 10, 10);

beforeEach(() => {
  store.clear();
});

describe('v391 note-collapse store — a toggle lands under the note’s own key', () => {
  it('entryKey is the per-book/chapter/unit key the record hangs on', () => {
    expect(keyA).toBe('1 John|1|5-9');
    expect(keyB).toBe('1 John|1|10-10');
  });

  it('saving the open map writes the closed state under that key, in the one store', async () => {
    // The page's write path: toggleOpen flips the map, the
    // write-through effect persists the whole map.
    await saveNoteCollapse({ [keyA]: false, [keyB]: true });
    const raw = await AsyncStorage.getItem(NOTE_COLLAPSE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toEqual({ [keyA]: false, [keyB]: true });
    // …and under exactly the v205 family key, no other.
    expect(NOTE_COLLAPSE_KEY).toBe('prayercircle.bible.v205.note-collapse.v1');
    expect([...store.keys()]).toEqual([NOTE_COLLAPSE_KEY]);
  });

  it('a fresh mount reads the record back: the closed note reads closed', async () => {
    // A previous session's save, standing in storage before mount.
    await saveNoteCollapse({ [keyA]: false });
    const loaded = await loadNoteCollapse();
    expect(recordedNoteOpen(loaded, keyA)).toBe(false);
  });

  it('an untouched note has no record — null, so the page default stands', async () => {
    await saveNoteCollapse({ [keyA]: false });
    const loaded = await loadNoteCollapse();
    expect(recordedNoteOpen(loaded, keyB)).toBeNull();
    expect(recordedNoteOpen(null, keyA)).toBeNull();
    expect(recordedNoteOpen({}, keyA)).toBeNull();
  });

  it('recorded open reads back open, distinct from no record', async () => {
    await saveNoteCollapse({ [keyB]: true });
    const loaded = await loadNoteCollapse();
    expect(recordedNoteOpen(loaded, keyB)).toBe(true);
  });
});

describe('v391 note-collapse store — the reading reset opens every note back up', () => {
  it('clearNoteCollapse removes the record wholesale; the next load is empty', async () => {
    await saveNoteCollapse({ [keyA]: false, [keyB]: false });
    await clearNoteCollapse();
    expect(await AsyncStorage.getItem(NOTE_COLLAPSE_KEY)).toBeNull();
    expect(await loadNoteCollapse()).toEqual({});
  });
});

describe('v391 note-collapse store — stored shapes read back clean', () => {
  it('sanitize keeps only boolean states and drops anything malformed', () => {
    expect(
      sanitizeNoteCollapse({ [keyA]: false, [keyB]: true, 'x|1|1-1': 'closed', 'y|2|3-3': 0 }),
    ).toEqual({ [keyA]: false, [keyB]: true });
    expect(sanitizeNoteCollapse(null)).toEqual({});
    expect(sanitizeNoteCollapse('nope')).toEqual({});
    expect(sanitizeNoteCollapse([false])).toEqual({});
  });

  it('a corrupt stored record loads as no record, never a crash or an invented state', async () => {
    store.set(NOTE_COLLAPSE_KEY, '{not json');
    expect(await loadNoteCollapse()).toEqual({});
    store.set(NOTE_COLLAPSE_KEY, JSON.stringify({ [keyA]: 'yes' }));
    expect(await loadNoteCollapse()).toEqual({});
  });
});

describe('v391 chapter page — the open map is backed by the store', () => {
  it('loads the record once and writes every open-map change through', () => {
    const src = chapterPage();
    expect(src).toContain('loadNoteCollapse().then((stored) => {');
    // The stored record sits under the session's own sets.
    expect(src).toContain('setOpenMap((m) => ({ ...stored, ...(m ?? {}) }));');
    expect(src).toContain('saveNoteCollapse(openMap);');
  });

  it('writes are held until the record lands, so other chapters are never overwritten blind', () => {
    expect(chapterPage()).toContain('if (!collapseReady || openMap === null) return;');
  });

  it('note bodies paint ungated on first render — the record hydrates like every store on this page', () => {
    // The v246 matrix contract: the page's first render paints note
    // bodies at their defaults; the collapse record (like marks and
    // the study state) lands into state inside that same settle.
    const src = chapterPage();
    expect(src).toContain('open={isOpen(entry)}');
    expect(src).not.toContain('open={collapseReady &&');
  });

  it('isOpen resolves a recorded state before the standing defaults', () => {
    const src = chapterPage();
    expect(src).toContain('const recorded = recordedNoteOpen(openMap, key);');
    expect(src).toContain('if (recorded !== null) return recorded;');
    // The defaults themselves are unchanged.
    expect(src).toContain('return e.blocks.length > 0;');
  });

  it('the chevron remains the toggle door into the same map', () => {
    // v405: the door rides the page's stable actions object into
    // the same toggleOpen over the same map.
    expect(chapterPage()).toContain('toggleOpen: (e) => toggleOpen(e),');
    expect(chapterPage()).toContain('onPress={() => actions.toggleOpen(entry)}');
  });
});

describe('v391 reset hook — the whole-Bible read reset clears the fold record', () => {
  it('resetReading clears the note-collapse store beside the read track', () => {
    const src = chaptersScreen();
    expect(src).toContain("import { clearNoteCollapse } from '@/lib/bible-v205/note-collapse';");
    const resetAt = src.indexOf('const next = resetReadingProgress(fresh);');
    const clearAt = src.indexOf('await clearNoteCollapse();');
    expect(resetAt).toBeGreaterThan(-1);
    expect(clearAt).toBeGreaterThan(resetAt);
  });
});
