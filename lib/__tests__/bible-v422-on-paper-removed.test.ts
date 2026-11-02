// ─── v422 — the on-paper surfaces are removed; the record stays ─────────────
// His word (Nov 2): "I just want to get rid of this 'on paper'
// thing." — said looking at the Books list's ✎ chip. The pass
// removes every visible on-paper surface: (1) the Books list chip
// under the progress header, (2) the per-row marks on book rows,
// (3) the book page detail box's state chip, and (4) the
// notes-source label editor the chip opened (it carried only the
// source label, whose sole consumers were these marks — the
// possessive comes from the profile and was never edited there).
// The handwritten coverage RECORD is deliberately untouched: same
// storage key, same seed, loaders still working, dormant. These
// pins hold both halves of that: surfaces gone, data intact.

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

import {
  HANDWRITTEN_KEY,
  HANDWRITTEN_SEED,
  handwrittenNoteFor,
  loadHandwritten,
} from '../bible-v205/handwritten';
import {
  SOURCE_LABEL_KEY,
  loadSourceLabel,
  saveSourceLabel,
} from '../bible-v205/user-labels';

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');

describe('v422 — no on-paper surface remains on either screen', () => {
  const chapters = read('app/bible-chapters.tsx');
  const book = read('app/bible-book.tsx');

  it('the Books list renders no chip, no row mark, no editor', () => {
    expect(chapters).not.toContain('On paper');
    expect(chapters).not.toContain('✎ on paper');
    expect(chapters).not.toContain('paperNote');
    expect(chapters).not.toContain('Name your notes source');
    expect(chapters).not.toContain('saveSourceLabel');
  });

  it('the book page renders no on-paper state chip', () => {
    expect(book).not.toContain('On paper');
    expect(book).not.toContain('selOnPaper');
  });

  it('neither screen reads the handwritten coverage anymore', () => {
    expect(chapters).not.toContain('loadHandwritten');
    expect(book).not.toContain('loadHandwritten');
  });

  it('the sections, grouping and restudy wiring survive untouched', () => {
    expect(chapters).toContain('groupBooksByStudy');
    expect(chapters).toContain('Restudy');
    expect(chapters).toContain('nextRestudyChapter');
  });
});

describe('v422 — the handwritten record itself is untouched and still loads', () => {
  beforeEach(() => {
    store.clear();
  });

  it('the storage key and seed are exactly as shipped', () => {
    expect(HANDWRITTEN_KEY).toBe('prayercircle.bible.v205.handwritten.v1');
    expect(HANDWRITTEN_SEED).toEqual([
      { book: 'Matthew', from: 1, to: 2, only: true },
      { book: 'Psalms', from: 1, to: 28 },
    ]);
  });

  it('a fresh store still seeds from the archive manifest and persists it', async () => {
    const entries = await loadHandwritten();
    expect(entries).toEqual(HANDWRITTEN_SEED);
    expect(store.get(HANDWRITTEN_KEY)).toBe(JSON.stringify(HANDWRITTEN_SEED));
  });

  it('a stored record still wins over the seed, verbatim', async () => {
    const mine = [{ book: 'Psalms', from: 1, to: 40 }, { book: 'Job', from: 3, to: 5, only: true }];
    store.set(HANDWRITTEN_KEY, JSON.stringify(mine));
    await expect(loadHandwritten()).resolves.toEqual(mine);
  });

  it('the range note still resolves (Psalms 1–28; only-entries stay out of row notes)', () => {
    expect(handwrittenNoteFor(HANDWRITTEN_SEED, 'Psalms')).toBe('Psalms 1–28');
    expect(handwrittenNoteFor(HANDWRITTEN_SEED, 'Matthew')).toBeNull();
    expect(handwrittenNoteFor(HANDWRITTEN_SEED, 'Genesis')).toBeNull();
  });

  it('the stored notes-source label is dormant, not wiped', async () => {
    expect(SOURCE_LABEL_KEY).toBe('prayercircle.bible.v205.source-label.v1');
    await expect(loadSourceLabel()).resolves.toBe('Handwritten notes');
    await saveSourceLabel('On my reMarkable');
    await expect(loadSourceLabel()).resolves.toBe('On my reMarkable');
  });
});
