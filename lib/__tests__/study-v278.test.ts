// ─── v278 "A Way Out of ReStudy" — pins ─────────────────────────────────────
// Jonathan's Oct 26 18:21 question — "How do I remove a restudy?" —
// had no answer for Leviticus 1. The chapter sits in his Current list
// (a stored 'restudy' state), but it is noteless IN THE APP, and the
// book panel's notes-state editor — the only editor anywhere in the
// app — rendered only when the chapter has notes (the v233 display
// model's showNotesEditor = noted). A noteless chapter with a stored
// state got the panel's dead-end branch instead: "Notes state on
// file: ↻ ReStudy — it counts again if notes arrive for this
// chapter", with no control that could change it. The chapter page
// has no editor, the Books list has none, the queue rows are
// tap-to-open only: a stored ReStudy on a noteless chapter was
// UNREMOVABLE.
//
// The fix (app/bible-book.tsx): the noteless branch of the panel now
// stands the SAME editor row (STATUS_EDITOR_ORDER chips on the same
// applyStatus → transitionChapterStatus door) directly under the
// on-file hint, inside the same group gate — the group still opens
// only when the editor applies (noted) or a stored state exists
// (selStatus !== 'none'). The v233 doctrine stands untouched: a
// noteless chapter with NO stored state opens no group and no
// editor appears from nothing; a stored state was never hidden —
// now it is never a dead end either.

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

import {
  chapterDisplayMarks,
  chapterStatus,
  seedStudyState,
  setChapterStatus,
  type StudyState,
} from '../bible-v205/study';
import { transitionChapterStatus } from '../bible-v205/rewards';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

beforeEach(() => {
  store.clear();
});

describe('the gap, exactly as the display model computes it', () => {
  it("Leviticus 1's shape: a stored restudy on a noteless chapter — the state shows, the editor gate stays shut", () => {
    const s = setChapterStatus(seedStudyState(), 'Leviticus', 1, 'restudy');
    expect(s.restudyQueue).toContainEqual({ book: 'Leviticus', chapter: 1 });
    const d = chapterDisplayMarks(s, 'Leviticus', 1, false);
    expect(d.status).toBe('restudy');
    // This false is the whole bug: the panel keyed its only editor
    // off it, so the noteless branch had nothing to offer him.
    expect(d.showNotesEditor).toBe(false);
  });
});

describe('the book panel — the editor stands under the on-file hint', () => {
  const src = read('app/bible-book.tsx');
  const onFileAt = src.indexOf('Notes state on file');

  it('(a) the not-editor branch renders the same editor row, below the on-file line, on the same door', () => {
    expect(onFileAt).toBeGreaterThanOrEqual(0);
    // Two renders of the one editor row: the noted branch's (above
    // the on-file line) and the noteless branch's (below it).
    const renders = src.split('STATUS_EDITOR_ORDER.map').length - 1;
    expect(renders).toBe(2);
    expect(src.lastIndexOf('STATUS_EDITOR_ORDER.map')).toBeGreaterThan(onFileAt);
    // The second row is no lookalike: it walks the same applyStatus
    // door (its chip wiring stands in the same branch, after the
    // on-file line)…
    expect(src.indexOf('onPress={() => applyStatus(s)}', onFileAt)).toBeGreaterThan(onFileAt);
    // …inside the same ternary — the noted branch still opens it.
    expect(src).toContain('{selDisplay.showNotesEditor ? (');
  });

  it('(c) no editor from nothing: the commentary group still opens only on the editor or a stored state', () => {
    expect(src).toContain("selDisplay.showNotesEditor || selStatus !== 'none'");
    // Model side of the same gate: a stateless noteless chapter is
    // 'none' with the editor gate shut, so the group never opens
    // and neither editor render can appear for it.
    const d = chapterDisplayMarks(seedStudyState(), 'Leviticus', 1, false);
    expect(d.status).toBe('none');
    expect(d.showNotesEditor).toBe(false);
  });

  it('(d) the noted branch is unchanged: quick moves, editor row, and its own hint', () => {
    const branchAt = src.indexOf('{selDisplay.showNotesEditor ? (');
    for (const needle of ['>Mark Complete</Text>', '>Start Writing</Text>', '>Add to Write Queue</Text>', 'Notes: {STATUS_LABEL[selStatus]}']) {
      expect(src.indexOf(needle, branchAt), needle).toBeGreaterThan(branchAt);
    }
    expect(chapterDisplayMarks(seedStudyState(), 'Leviticus', 1, true).showNotesEditor).toBe(true);
  });
});

describe('the way out works through the one door', () => {
  const inRestudy = (): StudyState => setChapterStatus(seedStudyState(), 'Leviticus', 1, 'restudy');

  it('(b) applying Complete removes the chapter from the ReStudy queue', async () => {
    const r = await transitionChapterStatus(inRestudy(), 'Leviticus', 1, 'complete');
    expect(r.state.restudyQueue).toEqual([]);
    expect(chapterStatus(r.state, 'Leviticus', 1)).toBe('complete');
  });

  it('(b) applying None removes the chapter from the ReStudy queue', async () => {
    const r = await transitionChapterStatus(inRestudy(), 'Leviticus', 1, 'none');
    expect(r.state.restudyQueue).toEqual([]);
    expect(chapterStatus(r.state, 'Leviticus', 1)).toBe('none');
  });

  it('(b) the round trip: a chapter can also go back in — restudy is a state, not a trap either way', async () => {
    const out = await transitionChapterStatus(inRestudy(), 'Leviticus', 1, 'none');
    const back = await transitionChapterStatus(out.state, 'Leviticus', 1, 'restudy');
    expect(back.state.restudyQueue).toContainEqual({ book: 'Leviticus', chapter: 1 });
    expect(chapterStatus(back.state, 'Leviticus', 1)).toBe('restudy');
  });
});
