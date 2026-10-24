// ─── v214 "Living Bubble" — pins ─────────────────────────────────────────────
// The feature in one sentence: his personal lines stop rendering in
// the text flow and live as author faces in the entry margin that
// bloom into note cards. These pins cover the pure half: authored
// line storage (legacy strings = him, forever), authorship surviving
// the '#' split, storage resolution for writes made on split pieces,
// the bubble grouping/side rules, author resolution, and the
// scroll-cap math behind the scrollable conversation.

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

import type { Person } from '../prayercircle-data';
import {
  addKeeperLine,
  emptyMarks,
  lineAuthor,
  lineText,
  loadMarks,
  MARKS_KEY,
  normalizeMarks,
  removeKeeperLineAt,
  saveMarks,
  updateKeeperLineAt,
  withLineAuthor,
  type MarksMap,
} from '../bible-v205/marks';
import { buildDisplaySections, getChapterData, splitEntryByHashNotes, splitSectionsByHashNotes, type DisplayEntry } from '../bible-v205/index';
import {
  bubbleLinesFor,
  buildBubblePieces,
  conversationShiftUp,
  conversationViewport,
  resolveBubbleAuthor,
  resolveLineStorage,
  type ProfileIdentity,
} from '../bible-v205/bubbles';

const CODY: Person = {
  id: 'p-cody',
  name: 'Cody',
  initials: 'C',
  relationship: 'Friends',
  lastPrayedDate: null,
  reminderDaysOfWeek: [],
  accentColor: '#2E8C7A',
  avatarColor: '#2E8C7A',
  prayerItems: [],
} as Person;
const PROFILE: ProfileIdentity = { name: 'Jonathan', photoUri: 'file:///me.jpg' };
const CODY_AUTHOR = { authorId: 'p-cody', authorName: 'Cody' };

beforeEach(() => {
  store.clear();
});

describe('v214 authored lines — storage', () => {
  it('legacy plain-string lines normalize to NO author (= him)', () => {
    const m = normalizeMarks({
      highlights: ['A keeper line.'],
      notes: ['A plain one.'],
      thoughts: [],
    });
    expect(m.highlights).toEqual(['A keeper line.']);
    expect(lineAuthor(m.highlights[0])).toBeNull();
    expect(lineText(m.notes[0])).toBe('A plain one.');
  });

  it('authored objects survive normalization; junk is dropped', () => {
    const m = normalizeMarks({
      highlights: [
        { text: 'Cody said it.', authorId: 'p-cody', authorName: 'Cody' },
        { text: 42 },
        null,
        { authorId: 'p-x' },
      ] as never,
      notes: [],
      thoughts: [],
    });
    expect(m.highlights).toEqual([{ text: 'Cody said it.', authorId: 'p-cody', authorName: 'Cody' }]);
  });

  it('addKeeperLine without an author stores a plain string, as always', () => {
    const next = addKeeperLine({}, 'Leviticus', 19, 10, 12, 'highlight', 'Mine.');
    expect(next['Leviticus|19|10-12'].highlights).toEqual(['Mine.']);
  });

  it('addKeeperLine with an author stores the author object', () => {
    const next = addKeeperLine({}, 'Leviticus', 19, 10, 12, 'note', 'His words.', CODY_AUTHOR);
    expect(next['Leviticus|19|10-12'].notes).toEqual([
      { text: 'His words.', authorId: 'p-cody', authorName: 'Cody' },
    ]);
  });

  it('authorship round-trips through save/load', async () => {
    let marks: MarksMap = addKeeperLine({}, 'Leviticus', 19, 10, 12, 'thought', 'Carry this.', CODY_AUTHOR);
    marks = addKeeperLine(marks, 'Leviticus', 19, 10, 12, 'thought', 'And mine.');
    await saveMarks(marks);
    expect(store.has(MARKS_KEY)).toBe(true);
    const loaded = await loadMarks();
    const entry = loaded['Leviticus|19|10-12'];
    const normalized = normalizeMarks(entry);
    expect(normalized.thoughts.map(lineText)).toEqual(['Carry this.', 'And mine.']);
    expect(lineAuthor(normalized.thoughts[0])).toEqual(CODY_AUTHOR);
    expect(lineAuthor(normalized.thoughts[1])).toBeNull();
  });

  it('re-facing a line swaps its author and can un-face it back to a plain string', () => {
    const faced = withLineAuthor('Words.', CODY_AUTHOR);
    expect(faced).toEqual({ text: 'Words.', authorId: 'p-cody', authorName: 'Cody' });
    expect(withLineAuthor(faced, null)).toBe('Words.');
  });

  it('updateKeeperLineAt edits words, re-faces, and respects range', () => {
    let marks: MarksMap = { 'Leviticus|19|10-12': { ...emptyMarks(), notes: ['First.', 'Second.'] } };
    marks = updateKeeperLineAt(marks, 'Leviticus', 19, 10, 12, 'notes', 1, { author: CODY_AUTHOR });
    expect(marks['Leviticus|19|10-12'].notes[1]).toEqual({
      text: 'Second.',
      authorId: 'p-cody',
      authorName: 'Cody',
    });
    marks = updateKeeperLineAt(marks, 'Leviticus', 19, 10, 12, 'notes', 1, { text: 'Second, edited.' });
    expect(lineText(marks['Leviticus|19|10-12'].notes[1])).toBe('Second, edited.');
    expect(lineAuthor(marks['Leviticus|19|10-12'].notes[1])).toEqual(CODY_AUTHOR);
    const untouched = updateKeeperLineAt(marks, 'Leviticus', 19, 10, 12, 'notes', 9, { text: 'Nope.' });
    expect(untouched).toBe(marks);
  });

  it('removeKeeperLineAt removes exactly the targeted line', () => {
    let marks: MarksMap = { 'Leviticus|19|10-12': { ...emptyMarks(), highlights: ['A.', 'B.', 'C.'] } };
    marks = removeKeeperLineAt(marks, 'Leviticus', 19, 10, 12, 'highlights', 1);
    expect(marks['Leviticus|19|10-12'].highlights).toEqual(['A.', 'C.']);
  });
});

describe('v214 authorship through the # split', () => {
  const bare = (start: number, end: number): DisplayEntry => ({ start, end, blocks: [], verseOnly: true });

  it('a credited #-line carries its author into its split piece', () => {
    const authored = { text: '#11-12 Cody saw this clearly.', authorId: 'p-cody', authorName: 'Cody' };
    const pieces = splitEntryByHashNotes(bare(10, 12), { ...emptyMarks(), highlights: [authored] });
    expect(pieces).toHaveLength(2);
    const carrier = pieces.find((p) => p.entry.start === 11);
    expect(carrier?.marks.highlights).toEqual([authored]);
    expect(lineAuthor(carrier!.marks.highlights[0])).toEqual(CODY_AUTHOR);
    // And the piece's provenance points back at the parent's index 0.
    expect(carrier?.origins.highlights).toEqual([0]);
  });

  it('origins track each field separately, in parent order', () => {
    const pieces = splitEntryByHashNotes(bare(1, 9), {
      ...emptyMarks(),
      highlights: ['#2-3 First note.', 'A plain keeper line.'],
      thoughts: ['#7-8 Second note.'],
    });
    const first = pieces.find((p) => p.entry.start === 1);
    const claim = pieces.find((p) => p.entry.start === 2);
    const thought = pieces.find((p) => p.entry.start === 7);
    expect(first?.origins.highlights).toEqual([1]);
    expect(claim?.origins.highlights).toEqual([0]);
    expect(thought?.origins.thoughts).toEqual([0]);
  });
});

describe('v214 storage resolution for writes made on pieces', () => {
  const provenance = {
    parentStart: 10,
    parentEnd: 12,
    origins: { notes: [] as number[], highlights: [0], thoughts: [] as number[] },
    appended: { notes: 0, highlights: 1, thoughts: 0 },
  };

  it('a derived line resolves to the parent record at the parent index', () => {
    expect(resolveLineStorage(provenance, 11, 12, 'highlights', 0)).toEqual({
      start: 10,
      end: 12,
      field: 'highlights',
      index: 0,
    });
  });

  it('a line past the derived ones resolves to the piece record, offset', () => {
    expect(resolveLineStorage(provenance, 11, 12, 'highlights', 1)).toEqual({
      start: 11,
      end: 12,
      field: 'highlights',
      index: 0,
    });
  });

  it('with no provenance (unsplit), display index is storage index', () => {
    expect(resolveLineStorage(undefined, 5, 5, 'notes', 2)).toEqual({
      start: 5,
      end: 5,
      field: 'notes',
      index: 2,
    });
  });

  it('end to end: editing a line shown on a piece rewrites the parent record', () => {
    const marks: MarksMap = {
      'Leviticus|19|10-12': {
        ...emptyMarks(),
        highlights: [{ text: '#11-12 His line.', authorId: 'p-cody', authorName: 'Cody' }],
      },
      'Leviticus|19|11-12': { ...emptyMarks(), kept: true, highlights: ['Added on the piece.'] },
    };
    const sections = buildDisplaySections(getChapterData('Leviticus', 19), 36);
    const split = splitSectionsByHashNotes(sections, marks, 'Leviticus', 19);
    const pieces = buildBubblePieces(split, 'Leviticus', 19);
    const piece = pieces.get('Leviticus|19|11-12');
    expect(piece).toBeTruthy();
    expect(piece!.lines.map((l) => l.text)).toEqual(['#11-12 His line.', 'Added on the piece.']);
    expect(piece!.parentStart).toBe(10);
    expect(piece!.parentEnd).toBe(12);
    // Line 0 is derived → parent record; line 1 was stored on the piece.
    expect(piece!.targets[0]).toEqual({ start: 10, end: 12, field: 'highlights', index: 0 });
    expect(piece!.targets[1]).toEqual({ start: 11, end: 12, field: 'highlights', index: 0 });
    const t = piece!.targets[0];
    const next = updateKeeperLineAt(marks, 'Leviticus', 19, t.start, t.end, t.field, t.index, {
      author: null,
    });
    expect(next['Leviticus|19|10-12'].highlights[0]).toBe('#11-12 His line.');
    // The piece-key record is untouched by the parent write.
    expect(next['Leviticus|19|11-12'].highlights).toEqual(['Added on the piece.']);
  });
});

describe('v214 bubble grouping + sides', () => {
  it('a single line is solo', () => {
    const lines = bubbleLinesFor({ ...emptyMarks(), notes: ['Only.'] });
    expect(lines).toHaveLength(1);
    expect(lines[0].side).toBe('solo');
    expect(lines[0].kind).toBe('note');
  });

  it('multiple lines alternate sides starting left, in render order (notes, highlights, thoughts)', () => {
    const lines = bubbleLinesFor({
      ...emptyMarks(),
      thoughts: ['Thought.'],
      highlights: ['Highlight.'],
      notes: ['Note.'],
    });
    expect(lines.map((l) => l.kind)).toEqual(['note', 'highlight', 'thought']);
    expect(lines.map((l) => l.side)).toEqual(['left', 'right', 'left']);
    expect(lines.map((l) => l.fieldIndex)).toEqual([0, 0, 0]);
  });

  it('an entry with no lines grows no bubbles', () => {
    expect(bubbleLinesFor(emptyMarks())).toEqual([]);
    expect(bubbleLinesFor(undefined)).toEqual([]);
  });
});

describe('v214 author resolution', () => {
  it('no author → the profile (his own face + name)', () => {
    const r = resolveBubbleAuthor(null, [CODY], PROFILE);
    expect(r.isSelf).toBe(true);
    expect(r.name).toBe('Jonathan');
    expect(r.photoUri).toBe('file:///me.jpg');
  });

  it('a resolving authorId wears the person’s CURRENT record, not the snapshot', () => {
    const renamed = { ...CODY, name: 'Cody R.', photoUri: 'file:///cody-new.jpg' } as Person;
    const r = resolveBubbleAuthor({ authorId: 'p-cody', authorName: 'Cody' }, [renamed], PROFILE);
    expect(r.isSelf).toBe(false);
    expect(r.isSnapshot).toBe(false);
    expect(r.name).toBe('Cody R.');
    expect(r.person?.photoUri).toBe('file:///cody-new.jpg');
  });

  it('a vanished author falls back to the stored name snapshot', () => {
    const r = resolveBubbleAuthor({ authorId: 'p-gone', authorName: 'Randee' }, [CODY], PROFILE);
    expect(r.isSnapshot).toBe(true);
    expect(r.name).toBe('Randee');
    expect(r.person).toBeNull();
  });
});

describe('v214 conversation scroll cap', () => {
  it('short conversations sit at natural height and never scroll', () => {
    const v = conversationViewport({ naturalHeight: 300, viewportHeight: 700, topChrome: 150, bottomReserve: 112 });
    expect(v).toEqual({ regionHeight: 300, scrollable: false });
  });

  it('a tall conversation caps at the visible area and scrolls', () => {
    const v = conversationViewport({ naturalHeight: 900, viewportHeight: 700, topChrome: 150, bottomReserve: 112 });
    expect(v.regionHeight).toBe(700 - 150 - 112);
    expect(v.scrollable).toBe(true);
  });

  it('a low entry shifts the region up only as far as needed', () => {
    // Entry face 500px down a 700px viewport; a 300px thread would
    // end at 800 — 212px past the usable bottom (700-112=588).
    const shift = conversationShiftUp({
      anchorTop: 12,
      entryScreenTop: 488,
      regionHeight: 300,
      viewportHeight: 700,
      topChrome: 150,
      bottomReserve: 112,
    });
    expect(shift).toBe(212);
  });

  it('a high entry never shifts', () => {
    const shift = conversationShiftUp({
      anchorTop: 12,
      entryScreenTop: 100,
      regionHeight: 300,
      viewportHeight: 700,
      topChrome: 150,
      bottomReserve: 112,
    });
    expect(shift).toBe(0);
  });

  it('the shift never pushes the region under the chrome', () => {
    const shift = conversationShiftUp({
      anchorTop: 12,
      entryScreenTop: 160,
      regionHeight: 640,
      viewportHeight: 700,
      topChrome: 150,
      bottomReserve: 112,
    });
    // Region top would sit at 172; chrome floor is 150 → max shift 22.
    expect(shift).toBe(22);
  });
});
