// ─── v363 "The Highlights Bridge" — pins ─────────────────────────────────────
// Jonathan's ruling (Oct 30): "Build the bridge — highlights show in
// the Studio too." The app side is one export-only section,
// studioHighlights, riding the same doors as studioBubbles (the
// one-file Drive export and the full backup share one payload):
// v361 phrase ranges, v212 whole-verse tints (as coalesced spans),
// whole-entry tints, and phrase ranges inside his own lines — the
// line identified by entry span + kind + EXACT text, never an index.
// Imports stay blind to it: a file carrying the section parses
// cleanly and the marks store is byte-identical afterwards — no
// import may add, remove, or alter a phone highlight.

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

import { MARKS_KEY, emptyMarks, saveMarks, type MarksMap } from '../bible-v205/marks';
import {
  applyStudioChapters,
  collectHighlightsForExport,
  loadStudioImports,
  parseStudioFileFull,
  saveStudioImports,
  studioFileHasSections,
  type StudioHighlightsSection,
} from '../bible-v205/studio-import';

beforeEach(() => {
  store.clear();
});

// ── Fixtures ────────────────────────────────────────────────────────────────
// One chapter carrying one of each kind of highlight: a phrase range
// on verse 2, whole-verse tints on verses 1–2 (one hue → one span)
// plus a lone red verse 3, a whole-entry tint, and a phrase range
// inside his own note line ("grace" — chars 0–5).
const FIXTURE_MARKS: MarksMap = {
  'Colossians|1|1-2': {
    ...emptyMarks(),
    tint: 'green',
    verseTints: { 1: 'yellow', 2: 'yellow' },
    phraseHighlights: [{ verse: 2, start: 5, end: 12, tint: 'blue' }],
    notes: ['grace upon grace, always'],
    lineHighlights: [{ field: 'notes', index: 0, start: 0, end: 5, tint: 'rose' }],
  },
  'Colossians|1|3-3': {
    ...emptyMarks(),
    verseTints: { 3: 'red' },
  },
};

const FIXTURE_SECTION: StudioHighlightsSection = {
  phrase: [{ book: 'Colossians', chapter: 1, verse: 2, start: 5, end: 12, hue: 'blue' }],
  verses: [
    { book: 'Colossians', chapter: 1, start: 1, end: 2, hue: 'yellow' },
    { book: 'Colossians', chapter: 1, start: 3, end: 3, hue: 'red' },
  ],
  entries: [{ book: 'Colossians', chapter: 1, start: 1, end: 2, hue: 'green' }],
  lines: [
    {
      book: 'Colossians',
      chapter: 1,
      start: 1,
      end: 2,
      kind: 'note',
      text: 'grace upon grace, always',
      startOffset: 0,
      endOffset: 5,
      hue: 'rose',
    },
  ],
};

// A minimal valid combined-pack chapter (the v231 fixture shape), so
// the round-trip file carries a real importable section beside the
// highlights.
const CHAPTER = {
  book: 'Colossians',
  chapter: 1,
  opener: { kind: 'previously', text: 'In our last chapter we met the church.' },
  sections: [{ start: 1, end: 29, title: null, entries: [{ start: 1, end: 2 }] }],
  notes: [
    {
      start: 1,
      end: 2,
      kind: 'note',
      category: null,
      blocks: [{ kind: 'para', text: 'Paul opens with grace.' }],
    },
  ],
  chapterState: 'write',
};

describe('v363 — collectHighlightsForExport', () => {
  it('a fixture chapter with one of each kind exports the exact wire shape', () => {
    expect(collectHighlightsForExport(FIXTURE_MARKS)).toEqual(FIXTURE_SECTION);
  });

  it('collecting twice yields identical output — no dupes, no drift', () => {
    const first = collectHighlightsForExport(FIXTURE_MARKS);
    const second = collectHighlightsForExport(FIXTURE_MARKS);
    expect(second).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it('legacy-only marks (tints, no phrase highlights) export correctly', () => {
    const legacy: MarksMap = {
      'Romans|8|1-4': {
        ...emptyMarks(),
        tint: 'rose',
        // A hue change and a gap both close a span run.
        verseTints: { 1: 'yellow', 2: 'red', 3: 'red', 5: 'yellow' },
      },
    };
    const section = collectHighlightsForExport(legacy);
    expect(section.phrase).toEqual([]);
    expect(section.lines).toEqual([]);
    expect(section.entries).toEqual([
      { book: 'Romans', chapter: 8, start: 1, end: 4, hue: 'rose' },
    ]);
    expect(section.verses).toEqual([
      { book: 'Romans', chapter: 8, start: 1, end: 1, hue: 'yellow' },
      { book: 'Romans', chapter: 8, start: 2, end: 3, hue: 'red' },
      { book: 'Romans', chapter: 8, start: 5, end: 5, hue: 'yellow' },
    ]);
  });

  it('no highlights at all still emits the section, all four arrays empty', () => {
    expect(collectHighlightsForExport({})).toEqual({ phrase: [], verses: [], entries: [], lines: [] });
    expect(collectHighlightsForExport({ 'Romans|8|1-4': emptyMarks() })).toEqual({
      phrase: [],
      verses: [],
      entries: [],
      lines: [],
    });
  });

  it("a line highlight on a credited line carries the line's words and kind — never its storage index or author", () => {
    const marks: MarksMap = {
      'John|1|1-1': {
        ...emptyMarks(),
        highlights: [{ text: 'Cody on the Word', authorId: 'p-cody', authorName: 'Cody' }],
        lineHighlights: [{ field: 'highlights', index: 0, start: 0, end: 4, tint: 'orange' }],
      },
    };
    const section = collectHighlightsForExport(marks);
    expect(section.lines).toEqual([
      {
        book: 'John',
        chapter: 1,
        start: 1,
        end: 1,
        kind: 'highlight',
        text: 'Cody on the Word',
        startOffset: 0,
        endOffset: 4,
        hue: 'orange',
      },
    ]);
    expect(JSON.stringify(section)).not.toContain('author');
    expect(JSON.stringify(section)).not.toContain('index');
  });

  it('a line highlight whose line is gone from its record is skipped — it cannot be named, so it cannot cross', () => {
    const marks: MarksMap = {
      'John|1|1-1': {
        ...emptyMarks(),
        notes: ['the only line'],
        lineHighlights: [{ field: 'notes', index: 3, start: 0, end: 4, tint: 'blue' }],
      },
    };
    expect(collectHighlightsForExport(marks).lines).toEqual([]);
  });
});

describe('v363 — the section is import-blind', () => {
  it('a file carrying studioHighlights imports cleanly and leaves the marks store byte-identical', async () => {
    await saveMarks(FIXTURE_MARKS);
    const before = store.get(MARKS_KEY);
    expect(before).toBeDefined();

    const file = { ...CHAPTER, studioHighlights: collectHighlightsForExport(FIXTURE_MARKS) };
    const plan = parseStudioFileFull(file);
    expect(studioFileHasSections(plan)).toBe(true);
    expect(plan.notes).toHaveLength(1);
    // The plan has no highlights channel at all — nothing to apply.
    expect('highlights' in plan).toBe(false);

    // Run the door's notes apply, exactly as the import door does.
    const applied = applyStudioChapters(await loadStudioImports(), plan.notes!);
    await saveStudioImports(applied.next);

    expect(store.get(MARKS_KEY)).toBe(before);
  });

  it('a full-backup-shaped file carrying the section also parses, highlights unread', async () => {
    await saveMarks(FIXTURE_MARKS);
    const before = store.get(MARKS_KEY);
    const backup = {
      format: 'prayercircle-backup',
      version: 1,
      studioStates: {
        chapters: [{ book: 'Colossians', chapter: 1, notesState: 'complete', readDate: null }],
      },
      studioHighlights: FIXTURE_SECTION,
    };
    const plan = parseStudioFileFull(backup);
    expect(plan.states?.chapters).toHaveLength(1);
    expect(store.get(MARKS_KEY)).toBe(before);
  });
});

describe('v363 — the door carries the section', () => {
  it('the export payload in Settings → DATA includes studioHighlights beside studioBubbles', () => {
    const src = readFileSync(join(process.cwd(), 'app', '(tabs)', 'index.tsx'), 'utf8');
    expect(src).toContain('collectHighlightsForExport');
    expect(src).toContain('studioBubbles, studioHighlights,');
  });
});
