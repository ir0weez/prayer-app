// ─── v459 — the Study Queue's mark-done control ─────────────────────────────
// Jonathan, Nov 6 (16:26, Study Queue screenshot in hand): "Is
// there no way to mark a chapter as complete after it's on this
// list? Or restudy for that matter." He was right — every queue
// row did exactly one thing (open the chapter), and the only
// in-app door for a notes-state change was the book page's
// chapter editor. With 504 chapters standing in his To Re-Study
// list, the queue is precisely where the control belongs.
//
// THE CHANGE (app/bible-queue.tsx only): each row gains a quiet
// check circle at its right, in the row's family colour, as its
// OWN Pressable before "Open ›" — tapping it marks the chapter
// Complete without opening it; the rest of the row still opens.
// Both families walk the one door — rewards.transitionChapterStatus
// → 'complete', the book editor's own call — and the screen adopts
// the returned state, so setChapterStatus pulling the chapter off
// both queues takes the row off the list at once, no reload. The
// read track is untouched (v228: this is the NOTES track only).
//
// HARNESS NOTE: the suite has no DOM/test-renderer, so the pins
// are the suite's grain — source pins for the control's seat and
// wiring on the real screen, and the behaviour proven through the
// REAL door the handler calls, on states shaped exactly as the
// screen holds them: the handler's one call is
// transitionChapterStatus(studyState, book, chapter, 'complete')
// followed by adopting result.state, and the lists render straight
// from that state's queues — so the door's returned queues ARE
// the rendered lists after adoption.

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

import { chapterStatus, loadStudyState, seedStudyState, type StudyState } from '../bible-v205/study';
import { transitionChapterStatus } from '../bible-v205/rewards';

const queueSrc = readFileSync(join(process.cwd(), 'app/bible-queue.tsx'), 'utf8');

beforeEach(() => {
  store.clear();
});

describe('v459 — source pins: the control on the row', () => {
  it('the row press still opens the chapter, exactly as before', () => {
    expect(queueSrc).toContain('onPress={() => open(item)}');
  });

  it('the mark-done control is its own Pressable with the real check icon', () => {
    expect(queueSrc).toContain('onPress={() => markDone(item)}');
    expect(queueSrc).toContain('name="check"');
    // A MaterialIcons glyph — never an emoji or text checkmark.
    expect(queueSrc).not.toContain('✓');
  });

  it('the control seats before the Open › label in the row', () => {
    const doneAt = queueSrc.indexOf('onPress={() => markDone(item)}');
    const openAt = queueSrc.indexOf('Open ›');
    expect(doneAt).toBeGreaterThan(-1);
    expect(openAt).toBeGreaterThan(doneAt);
  });

  it('both queue families render through the one row renderer, control included', () => {
    expect(queueSrc).toContain("writeQueue.map((item) => renderItem(item, 'write'))");
    expect(queueSrc).toContain("restudyQueue.map((item) => renderItem(item, 'restudy'))");
  });

  it('the control wears the row family colour — rasp tint for Write, teal for Re-Study', () => {
    expect(queueSrc).toContain("kind === 'restudy' ? palette.accentTeal.bg : palette.raspTint");
    expect(queueSrc).toContain("kind === 'restudy' ? palette.accentTeal.deep : palette.raspDeep");
  });

  it('markDone walks the one door to complete and adopts the returned state', () => {
    expect(queueSrc).toContain(
      "transitionChapterStatus(studyState, item.book, item.chapter, 'complete')",
    );
    expect(queueSrc).toContain('if (liveRef.current) setStudyState(result.state);');
  });

  it('markDone is inert before the state loads, and guarded past unmount', () => {
    const at = queueSrc.indexOf('const markDone');
    const body = queueSrc.slice(at, queueSrc.indexOf('const renderItem'));
    expect(body).toContain('if (!studyState) return;');
    expect(queueSrc).toContain('liveRef.current = false;');
  });

  it('no caption or label text rides the row — the control is the check alone', () => {
    const row = queueSrc.slice(queueSrc.indexOf('const renderItem'), queueSrc.indexOf('const content'));
    expect(row).not.toContain('Mark done');
    expect(row).not.toContain('Done</Text>');
  });
});

describe('v459 — the door takes the row off the list (the adoption the screen renders)', () => {
  // The screen's lists ARE these queues; adopting result.state is
  // adopting these lists. Seeded whole (queues + the seed's clean
  // flags), shaped as the screen holds them after load.
  const base = (): StudyState => ({
    ...seedStudyState(),
    writeQueue: [
      { book: 'Colossians', chapter: 3 },
      { book: 'Colossians', chapter: 4 },
    ],
    restudyQueue: [
      { book: '1 John', chapter: 3 },
      { book: 'Mark', chapter: 1 },
    ],
  });

  it('a To Write chapter marked complete leaves the write queue', async () => {
    const before = base();
    expect(chapterStatus(before, 'Colossians', 3)).toBe('write');
    // The handler's exact call:
    const result = await transitionChapterStatus(before, 'Colossians', 3, 'complete');
    expect(result.state.writeQueue).toEqual([{ book: 'Colossians', chapter: 4 }]);
    expect(chapterStatus(result.state, 'Colossians', 3)).toBe('complete');
    // The other family is untouched.
    expect(result.state.restudyQueue).toEqual([
      { book: '1 John', chapter: 3 },
      { book: 'Mark', chapter: 1 },
    ]);
  });

  it('a To Re-Study chapter marked complete leaves the restudy queue', async () => {
    const before = base();
    expect(chapterStatus(before, '1 John', 3)).toBe('restudy');
    // The handler's exact call:
    const result = await transitionChapterStatus(before, '1 John', 3, 'complete');
    expect(result.state.restudyQueue).toEqual([{ book: 'Mark', chapter: 1 }]);
    expect(chapterStatus(result.state, '1 John', 3)).toBe('complete');
    expect(result.state.writeQueue).toEqual([
      { book: 'Colossians', chapter: 3 },
      { book: 'Colossians', chapter: 4 },
    ]);
  });

  it('the adopted state is the persisted one — a reload keeps the row gone', async () => {
    const result = await transitionChapterStatus(base(), 'Colossians', 3, 'complete');
    const reloaded = await loadStudyState();
    expect(reloaded.writeQueue).toEqual(result.state.writeQueue);
    expect(chapterStatus(reloaded, 'Colossians', 3)).toBe('complete');
  });

  it('the transition is the notes track only — the read track never moves', async () => {
    const before = base();
    const result = await transitionChapterStatus(before, 'Colossians', 3, 'complete');
    expect(result.state.reads).toEqual(before.reads);
  });
});
