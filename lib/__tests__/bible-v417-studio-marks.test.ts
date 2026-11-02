// ─── v417 "Mark Changes, By Name Only" — pins ──────────────────────────────
// Jonathan's ruling (Nov 2): the Studio may edit his highlights and
// the edits come home — but changes apply BY NAME ONLY, and nothing
// unnamed is touched. The desk sends a CHANGE LIST (studioMarkChanges:
// upserts + explicit tombstones), never a snapshot of the marks layer;
// the app merges it item-by-item into the marks map. These pins hold
// that discipline:
//   · the export bridge carries the v390 block highlights (blocks)
//     and every item names its owning record (entryStart/entryEnd);
//   · a change list naming ONE highlight leaves every other record —
//     and every other field of the touched record — identical;
//   · a tombstone deletes exactly the highlight it addresses;
//   · a one-deep snapshot of the pre-apply map is stashed before any
//     mutation, and an empty change list writes no snapshot at all;
//   · the merge is idempotent, and a malformed section is rejected
//     whole by the door's validate-everything-first parse.

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
  MARKS_KEY,
  emptyMarks,
  loadMarks,
  saveMarks,
  type MarksMap,
} from '../bible-v205/marks';
import {
  collectHighlightsForExport,
  emptyStudioApplyCounts,
  formatStudioImportSummary,
  parseStudioFileFull,
  studioFileHasSections,
} from '../bible-v205/studio-import';
import {
  MARKS_SNAPSHOT_KEY,
  applyStudioMarkChanges,
  mergeStudioMarkChanges,
  validateStudioMarkChanges,
  type StudioMarkChangesSection,
} from '../bible-v205/studio-marks';

beforeEach(() => {
  store.clear();
});

// ── Fixtures ────────────────────────────────────────────────────────────────
// A rich map: one record carrying every kind of mark plus the fields
// the mark-changes door must never reach (kept, notes, category), a
// second record in the same chapter, and an unrelated record.
const RICH: MarksMap = {
  '1 John|2|1-2': {
    ...emptyMarks(),
    kept: true,
    notes: ['a line of his own'],
    tint: 'green',
    verseTints: { 1: 'yellow', 2: 'rose' },
    phraseHighlights: [{ verse: 2, start: 3, end: 9, tint: 'blue' }],
    lineHighlights: [{ field: 'notes', index: 0, start: 0, end: 1, tint: 'orange' }],
    blockHighlights: [
      { surface: 'blocks', index: 0, start: 0, end: 5, tint: 'yellow' },
      { surface: 'blocks', index: 0, start: 10, end: 15, tint: 'rose' },
      { surface: 'blocks', index: 2, start: 4, end: 8, tint: 'green' },
    ],
    category: 'definition',
  },
  '1 John|2|3-3': {
    ...emptyMarks(),
    verseTints: { 3: 'red' },
    blockHighlights: [{ surface: 'blocks', index: 1, start: 2, end: 6, tint: 'blue' }],
  },
  'Romans|8|1-4': {
    ...emptyMarks(),
    tint: 'rose',
  },
};

function section(partial: Partial<StudioMarkChangesSection>): StudioMarkChangesSection {
  return { upserts: [], removed: [], ...partial };
}

// ── Export: the blocks cross, and every item names its record ──────────────

describe('v417 — collectHighlightsForExport: blocks + entry spans', () => {
  it('block highlights export in `blocks` with the contract fields', () => {
    const out = collectHighlightsForExport(RICH);
    expect(out.blocks).toEqual([
      { book: '1 John', chapter: 2, entryStart: 1, entryEnd: 2, block: 0, start: 0, end: 5, hue: 'yellow' },
      { book: '1 John', chapter: 2, entryStart: 1, entryEnd: 2, block: 0, start: 10, end: 15, hue: 'rose' },
      { book: '1 John', chapter: 2, entryStart: 1, entryEnd: 2, block: 2, start: 4, end: 8, hue: 'green' },
      { book: '1 John', chapter: 2, entryStart: 3, entryEnd: 3, block: 1, start: 2, end: 6, hue: 'blue' },
    ]);
  });

  it('a non-blocks surface is skipped, never mis-addressed', () => {
    const marks: MarksMap = {
      '1 John|2|0-0': {
        ...emptyMarks(),
        blockHighlights: [
          { surface: 'intro', index: 0, start: 0, end: 4, tint: 'red' },
          { surface: 'blocks', index: 1, start: 2, end: 7, tint: 'blue' },
        ],
      },
    };
    expect(collectHighlightsForExport(marks).blocks).toEqual([
      { book: '1 John', chapter: 2, entryStart: 0, entryEnd: 0, block: 1, start: 2, end: 7, hue: 'blue' },
    ]);
  });

  it("lines items carry the line's storage coordinate — field + index (the desk's line address)", () => {
    const out = collectHighlightsForExport(RICH);
    expect(out.lines).toEqual([
      {
        book: '1 John',
        chapter: 2,
        entryStart: 1,
        entryEnd: 2,
        start: 1,
        end: 2,
        kind: 'note',
        field: 'notes',
        index: 0,
        text: 'a line of his own',
        startOffset: 0,
        endOffset: 1,
        hue: 'orange',
      },
    ]);
  });

  it('every item in all five arrays carries entryStart/entryEnd', () => {
    const out = collectHighlightsForExport(RICH);
    for (const arr of [out.phrase, out.verses, out.entries, out.lines, out.blocks]) {
      for (const item of arr) {
        expect(typeof item.entryStart).toBe('number');
        expect(typeof item.entryEnd).toBe('number');
      }
    }
    // The verses array's spans are the coalesced runs; the entry span
    // still names the record the run came from.
    expect(out.verses).toEqual([
      { book: '1 John', chapter: 2, entryStart: 1, entryEnd: 2, start: 1, end: 1, hue: 'yellow' },
      { book: '1 John', chapter: 2, entryStart: 1, entryEnd: 2, start: 2, end: 2, hue: 'rose' },
      { book: '1 John', chapter: 2, entryStart: 3, entryEnd: 3, start: 3, end: 3, hue: 'red' },
    ]);
  });
});

// ── Validation + the door ───────────────────────────────────────────────────

describe('v417 — validateStudioMarkChanges + parseStudioFileFull', () => {
  it('a file carrying only studioMarkChanges parses into the plan', () => {
    const plan = parseStudioFileFull({
      studioMarkChanges: {
        id: 'desk-1',
        createdAt: '2026-11-02T18:40:00.000Z',
        upserts: [
          { kind: 'block', book: '1 John', chapter: 2, entryStart: 1, entryEnd: 2, block: 0, start: 0, end: 5, hue: 'red' },
        ],
        removed: [
          { kind: 'phrase', book: '1 John', chapter: 2, entryStart: 1, entryEnd: 2, verse: 2, start: 3, end: 9 },
        ],
      },
    });
    expect(studioFileHasSections(plan)).toBe(true);
    expect(plan.markChanges?.id).toBe('desk-1');
    expect(plan.markChanges?.upserts).toHaveLength(1);
    expect(plan.markChanges?.removed).toHaveLength(1);
  });

  it('a removal may omit hue; an upsert may not', () => {
    expect(() =>
      validateStudioMarkChanges({
        upserts: [{ kind: 'entry', book: '1 John', chapter: 2, entryStart: 1, entryEnd: 2 }],
        removed: [],
      }),
    ).toThrow(/hue/);
    const ok = validateStudioMarkChanges({
      upserts: [],
      removed: [{ kind: 'entry', book: '1 John', chapter: 2, entryStart: 1, entryEnd: 2 }],
    });
    expect(ok.removed).toHaveLength(1);
  });

  it('a malformed section is rejected whole — bad hue, bad offsets, unknown book, wrong shape', () => {
    const bad = [
      { upserts: [{ kind: 'entry', book: '1 John', chapter: 2, entryStart: 1, entryEnd: 2, hue: 'purple' }], removed: [] },
      { upserts: [{ kind: 'phrase', book: '1 John', chapter: 2, entryStart: 1, entryEnd: 2, verse: 2, start: 9, end: 9, hue: 'red' }], removed: [] },
      { upserts: [{ kind: 'entry', book: 'Narnia', chapter: 1, entryStart: 1, entryEnd: 2, hue: 'red' }], removed: [] },
      { upserts: [{ kind: 'verse', book: '1 John', chapter: 2, entryStart: 1, entryEnd: 2, verseStart: 5, verseEnd: 2, hue: 'red' }], removed: [] },
      { upserts: 'not-a-list', removed: [] },
      { upserts: [{ kind: 'sparkle', book: '1 John', chapter: 2, entryStart: 1, entryEnd: 2, hue: 'red' }], removed: [] },
    ];
    for (const sec of bad) {
      expect(() => validateStudioMarkChanges(sec)).toThrow();
      // Through the door, a bad section rejects the WHOLE file —
      // even one carrying a perfectly good notes chapter beside it.
      expect(() =>
        parseStudioFileFull({
          book: 'Colossians',
          chapter: 1,
          opener: { kind: 'previously', text: 'In our last chapter.' },
          sections: [{ start: 1, end: 29, title: null, entries: [{ start: 1, end: 2 }] }],
          notes: [],
          studioMarkChanges: sec,
        }),
      ).toThrow();
    }
  });
});

// ── Merge safety: by name only, nothing unnamed touched ────────────────────

describe('v417 — the merge', () => {
  it('one named change lands; every other record and field is identical', async () => {
    await saveMarks(RICH);
    const summary = await applyStudioMarkChanges(
      section({
        upserts: [
          { kind: 'phrase', book: '1 John', chapter: 2, entryStart: 1, entryEnd: 2, verse: 2, start: 3, end: 9, hue: 'red' },
        ],
      }),
    );
    expect(summary).toEqual({ upserted: 1, removed: 0, recordsTouched: 1 });
    const after = await loadMarks();
    // The named highlight changed…
    expect(after['1 John|2|1-2'].phraseHighlights).toEqual([
      { verse: 2, start: 3, end: 9, tint: 'red' },
    ]);
    // …and everything else on its record is untouched — including the
    // fields this door can never reach.
    const { phraseHighlights: _landed, ...restAfter } = after['1 John|2|1-2'];
    const { phraseHighlights: _before, ...restBefore } = RICH['1 John|2|1-2'];
    expect(restAfter).toEqual(restBefore);
    // Every other record is identical, whole.
    expect(after['1 John|2|3-3']).toEqual(RICH['1 John|2|3-3']);
    expect(after['Romans|8|1-4']).toEqual(RICH['Romans|8|1-4']);
    expect(Object.keys(after).sort()).toEqual(Object.keys(RICH).sort());
  });

  it('a tombstone deletes exactly the addressed block highlight — siblings survive', async () => {
    await saveMarks(RICH);
    const summary = await applyStudioMarkChanges(
      section({
        removed: [
          { kind: 'block', book: '1 John', chapter: 2, entryStart: 1, entryEnd: 2, block: 0, start: 10, end: 15 },
        ],
      }),
    );
    expect(summary).toEqual({ upserted: 0, removed: 1, recordsTouched: 1 });
    const after = await loadMarks();
    expect(after['1 John|2|1-2'].blockHighlights).toEqual([
      { surface: 'blocks', index: 0, start: 0, end: 5, tint: 'yellow' },
      { surface: 'blocks', index: 2, start: 4, end: 8, tint: 'green' },
    ]);
    // The other record's block highlight is out of the tombstone's reach.
    expect(after['1 John|2|3-3'].blockHighlights).toEqual(RICH['1 John|2|3-3'].blockHighlights);
  });

  it('verse upserts paint the span; verse tombstones clear only the named span', () => {
    const { marks, summary } = mergeStudioMarkChanges(
      RICH,
      section({
        upserts: [
          { kind: 'verse', book: '1 John', chapter: 2, entryStart: 3, entryEnd: 3, verseStart: 3, verseEnd: 5, hue: 'blue' },
        ],
        removed: [
          { kind: 'verse', book: '1 John', chapter: 2, entryStart: 1, entryEnd: 2, verseStart: 1, verseEnd: 1 },
        ],
      }),
    );
    expect(summary).toEqual({ upserted: 1, removed: 1, recordsTouched: 2 });
    expect(marks['1 John|2|3-3'].verseTints).toEqual({ 3: 'blue', 4: 'blue', 5: 'blue' });
    expect(marks['1 John|2|1-2'].verseTints).toEqual({ 2: 'rose' });
  });

  it('entry and line upserts land by name; an upsert creates a fresh record when the phone holds none', () => {
    const { marks, summary } = mergeStudioMarkChanges(
      RICH,
      section({
        upserts: [
          { kind: 'entry', book: 'Romans', chapter: 8, entryStart: 1, entryEnd: 4, hue: 'blue' },
          { kind: 'line', book: '1 John', chapter: 2, entryStart: 1, entryEnd: 2, field: 'notes', index: 0, start: 0, end: 1, hue: 'green' },
          { kind: 'entry', book: '1 John', chapter: 2, entryStart: 7, entryEnd: 7, hue: 'yellow' },
        ],
      }),
    );
    expect(summary).toEqual({ upserted: 3, removed: 0, recordsTouched: 3 });
    expect(marks['Romans|8|1-4'].tint).toBe('blue');
    expect(marks['1 John|2|1-2'].lineHighlights).toEqual([
      { field: 'notes', index: 0, start: 0, end: 1, tint: 'green' },
    ]);
    // The created record is a fresh normalized record wearing only
    // the tint the upsert named.
    expect(marks['1 John|2|7-7']).toEqual({ ...emptyMarks(), tint: 'yellow' });
  });

  it('a removal naming a missing record or item is a quiet no-op', () => {
    const { marks, summary } = mergeStudioMarkChanges(
      RICH,
      section({
        removed: [
          { kind: 'block', book: '1 John', chapter: 2, entryStart: 9, entryEnd: 9, block: 0, start: 0, end: 3 },
          { kind: 'phrase', book: '1 John', chapter: 2, entryStart: 1, entryEnd: 2, verse: 2, start: 40, end: 44 },
          { kind: 'entry', book: '1 John', chapter: 2, entryStart: 3, entryEnd: 3 },
        ],
      }),
    );
    expect(summary).toEqual({ upserted: 0, removed: 0, recordsTouched: 0 });
    expect(marks).toEqual(RICH);
  });

  it('applying the same section twice yields the identical map (idempotent)', async () => {
    await saveMarks(RICH);
    const changes = section({
      upserts: [
        { kind: 'block', book: '1 John', chapter: 2, entryStart: 1, entryEnd: 2, block: 2, start: 4, end: 8, hue: 'orange' },
        { kind: 'entry', book: '1 John', chapter: 2, entryStart: 3, entryEnd: 3, hue: 'green' },
      ],
      removed: [
        { kind: 'block', book: '1 John', chapter: 2, entryStart: 1, entryEnd: 2, block: 0, start: 0, end: 5 },
      ],
    });
    await applyStudioMarkChanges(changes);
    const once = await loadMarks();
    await applyStudioMarkChanges(changes);
    const twice = await loadMarks();
    expect(twice).toEqual(once);
  });
});

// ── The snapshot ────────────────────────────────────────────────────────────

describe('v417 — the pre-apply snapshot', () => {
  it('is written before the mutation and holds the pre-apply map', async () => {
    await saveMarks(RICH);
    await applyStudioMarkChanges(
      section({
        upserts: [
          { kind: 'entry', book: 'Romans', chapter: 8, entryStart: 1, entryEnd: 4, hue: 'blue' },
        ],
      }),
    );
    const raw = store.get(MARKS_SNAPSHOT_KEY);
    expect(raw).toBeDefined();
    const snapshot = JSON.parse(raw as string) as { at: string; marks: MarksMap };
    expect(typeof snapshot.at).toBe('string');
    expect(snapshot.marks).toEqual(RICH);
    // …while the live map moved.
    expect((await loadMarks())['Romans|8|1-4'].tint).toBe('blue');
  });

  it('an empty change list writes no snapshot and changes nothing', async () => {
    await saveMarks(RICH);
    const before = store.get(MARKS_KEY);
    const summary = await applyStudioMarkChanges(section({}));
    expect(summary).toEqual({ upserted: 0, removed: 0, recordsTouched: 0 });
    expect(store.get(MARKS_SNAPSHOT_KEY)).toBeUndefined();
    expect(store.get(MARKS_KEY)).toBe(before);
  });
});

// ── The doors speak it (wiring pins, house style) ───────────────────────────

describe('v417 — door wiring', () => {
  it('the summary names the mark changes the file carried', () => {
    const plan = parseStudioFileFull({
      studioMarkChanges: { upserts: [], removed: [] },
    });
    const counts = { ...emptyStudioApplyCounts(), markChangesUpserted: 2, markChangesRemoved: 1 };
    expect(formatStudioImportSummary(plan, counts)).toContain('Mark changes: 2 upserted · 1 removed');
  });

  it('both applier paths — the Settings door and the Drive check — apply the section', () => {
    const door = readFileSync(join(process.cwd(), 'app', '(tabs)', 'index.tsx'), 'utf8');
    expect(door).toContain('applyStudioMarkChanges');
    expect(door).toContain('plan.markChanges');
    const drive = readFileSync(join(process.cwd(), 'lib', 'bible-v205', 'drive-folder.ts'), 'utf8');
    expect(drive).toContain('applyStudioMarkChanges');
    expect(drive).toContain('filePlan.markChanges');
  });
});
