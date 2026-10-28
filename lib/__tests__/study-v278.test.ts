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
//
// v311 re-base (with citation): the panel is now the chapter SHEET
// (approved drawing, 2026-10-28 12:42), and the guarantee this file
// exists for is carried further, not weakened: the sheet's My
// Writing chip row (SHEET_STATUS_ORDER on the same applyStatus →
// transitionChapterStatus door) renders for EVERY chapter — no
// showNotesEditor gate, no stored-state gate — and the merged
// unset state leaves through the one Clear state action
// (applyStatus('none')). A stored ReStudy on a noteless chapter is
// changeable in the sheet exactly as it was in the panel; the
// on-file hint and its dead end are gone with the captions.

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

describe('the chapter sheet — the editor stands for every chapter (v311)', () => {
  const src = read('app/bible-book.tsx');

  it('(a) the sheet renders its one chip row unconditionally, on the same door', () => {
    // One render of the chip row — no noted/noteless branches.
    const renders = src.split('SHEET_STATUS_ORDER.map').length - 1;
    expect(renders).toBe(1);
    // The row walks the same applyStatus door…
    expect(src).toContain('onPress={() => applyStatus(s)}');
    // …and no gate from the old panel survives around it: neither
    // the display model's editor gate nor a stored-state condition.
    expect(src).not.toContain("selDisplay.showNotesEditor || selStatus !== 'none'");
    expect(src).not.toContain('Notes state on file');
  });

  it('(c) the way back down is one clear path, offered whenever a state stands', () => {
    expect(src).toContain("applyStatus('none')");
    expect(src).toContain('Clear state');
    // Offered exactly when a state is set (none/not-started = the
    // one unset state, by his merge ruling).
    expect(src).toContain("selStatus !== 'none' && selStatus !== 'not-started'");
    // Model side unchanged: a stateless noteless chapter is 'none'
    // with the editor gate shut — the model still says so; the
    // sheet simply no longer needs the gate to protect him.
    const d = chapterDisplayMarks(seedStudyState(), 'Leviticus', 1, false);
    expect(d.status).toBe('none');
    expect(d.showNotesEditor).toBe(false);
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
