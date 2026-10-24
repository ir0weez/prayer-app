// ─── v238 "The Notebooks Come Home" — pins ──────────────────────────────────
// Psalms 1–28, Matthew 1–2, Exodus 1–3 and Ezekiel 1 were never typed
// into the per-book txts — they lived only as PDF exports of
// Jonathan's reMarkable notebooks. The transcription parsed them
// (verbatim-gated against the pages; his authorized spelling fixes
// applied) and v238 lands them in the shipped data through the
// generator's transcription fill: staged chapters land where the app
// had nothing, books the txt set never carried are created, and a
// chapter already carrying his txt words is a conflict the generator
// refuses to resolve — never an overwrite.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

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

import { COMMENTARY_DATA } from '../bible-v205/data/index';
import {
  buildDisplaySections,
  buildReadOnlySections,
  getChapterData,
  isBareChapter,
} from '../bible-v205/index';
import { chapterBlockCount } from '../bible-v205/recovery';
import { bookHasNotedChapters, chapterHasNotes } from '../bible-v205/studio-import';
import { chapterDisplayMarks, seedStudyState, setChapterRead } from '../bible-v205/study';
import {
  applyTranscriptionFill,
  type TranscribedMap,
} from '../bible-v205/transcription';
import type { V205BookData, V205ChapterData } from '../bible-v205/types';

const entriesOf = (book: string, ch: number) =>
  getChapterData(book, ch)!.sections.reduce((n, s) => n + s.entries.length, 0);
const blocksOf = (book: string, ch: number) => chapterBlockCount(getChapterData(book, ch)!);
const bookTotals = (book: string, chapters: number[]) => ({
  entries: chapters.reduce((n, c) => n + entriesOf(book, c), 0),
  blocks: chapters.reduce((n, c) => n + blocksOf(book, c), 0),
});
const allText = (book: string, ch: number) => {
  const data = getChapterData(book, ch)!;
  const parts: string[] = [
    ...data.intro.map((b) => b.text),
    ...data.sections.flatMap((s) => s.entries.flatMap((e) => e.blocks.map((b) => b.text))),
  ];
  return parts.join('\n');
};
const scriptureBlocks = (book: string, ch: number) => {
  const data = getChapterData(book, ch)!;
  return [
    ...data.intro.filter((b) => b.kind === 'scripture'),
    ...data.sections.flatMap((s) =>
      s.entries.flatMap((e) => e.blocks.filter((b) => b.kind === 'scripture')),
    ),
  ];
};

describe('Part 1 — the transcribed chapters are in the app data, exact', () => {
  it('Psalms 1–28 carry the transcription’s exact totals; chapters 29+ are untouched (absent)', () => {
    const chapters = Array.from({ length: 28 }, (_, i) => i + 1);
    expect(bookTotals('Psalms', chapters)).toEqual({ entries: 280, blocks: 4115 });
    expect(Object.keys(COMMENTARY_DATA['Psalms'].chapters)).toHaveLength(28);
    expect(getChapterData('Psalms', 29)).toBeNull();
    expect(getChapterData('Psalms', 150)).toBeNull();
  });

  it('Matthew 1–2 and Ezekiel 1 carry their exact totals', () => {
    expect(bookTotals('Matthew', [1, 2])).toEqual({ entries: 34, blocks: 470 });
    expect(Object.keys(COMMENTARY_DATA['Matthew'].chapters)).toHaveLength(2);
    expect(bookTotals('Ezekiel', [1])).toEqual({ entries: 16, blocks: 281 });
    expect(Object.keys(COMMENTARY_DATA['Ezekiel'].chapters)).toHaveLength(1);
  });

  it('Ezekiel 1’s scripture blocks include the Deuteronomy 28:53;57 quote, verbatim', () => {
    const blocks = scriptureBlocks('Ezekiel', 1);
    expect(blocks).toHaveLength(20); // 19 in entries + 1 in the intro
    const deut = blocks.find((b) => b.ref === 'Deuteronomy 28:53;57');
    expect(deut).toBeDefined();
    expect(deut!.text).toContain('thou shalt eat the fruit of thine own body');
  });

  it('the authorized spelling fixes are in the shipped text', () => {
    const ez = allText('Ezekiel', 1);
    expect(ez).toContain('firmament');
    expect(ez).not.toContain('fermament');
    expect(ez).toContain('sovereignty');
    expect(ez).not.toContain('soveriegnty');
    const ps1 = allText('Psalms', 1);
    expect(ps1).toContain('dandelions');
    expect(ps1).not.toContain('dandilions');
  });

  it('chapterHasNotes: true where the notebooks carry notes, false for the Exodus setups', () => {
    for (let c = 1; c <= 28; c++) expect(chapterHasNotes('Psalms', c, {})).toBe(true);
    expect(chapterHasNotes('Matthew', 1, {})).toBe(true);
    expect(chapterHasNotes('Matthew', 2, {})).toBe(true);
    expect(chapterHasNotes('Ezekiel', 1, {})).toBe(true);
    for (let c = 1; c <= 3; c++) expect(chapterHasNotes('Exodus', c, {})).toBe(false);
    expect(bookHasNotedChapters('Psalms', {})).toBe(true);
    expect(bookHasNotedChapters('Matthew', {})).toBe(true);
    expect(bookHasNotedChapters('Ezekiel', {})).toBe(true);
    expect(bookHasNotedChapters('Exodus', {})).toBe(false);
  });
});

describe('Part 2 — his quirks stand as written', () => {
  it('Psalm 19’s overlapping section headers (7-13, then 12-14) are preserved', () => {
    const ch = getChapterData('Psalms', 19)!;
    expect(ch.sections.map((s) => [s.start, s.end])).toEqual([
      [1, 6],
      [7, 13],
      [12, 14],
    ]);
  });

  it('Psalm 4’s verse-1 entry — the Neginoth superscription note — is intact', () => {
    const ch = getChapterData('Psalms', 4)!;
    const first = ch.sections[0];
    expect([first.start, first.end, first.title]).toEqual([1, 2, 'David Cries Out']);
    const v1 = first.entries.find((e) => e.start === 1);
    expect(v1).toBeDefined();
    expect(v1!.blocks.map((b) => b.text).join('\n')).toContain('Neginoth');
  });

  it('Exodus 1–3 carry his section setups with zero entries — and headline as Read, never Complete', () => {
    const sectionCounts = [1, 2, 3].map((c) => getChapterData('Exodus', c)!.sections.length);
    expect(sectionCounts).toEqual([3, 5, 3]);
    for (let c = 1; c <= 3; c++) {
      const ch = getChapterData('Exodus', c)!;
      expect(ch.sections.every((s) => s.entries.length === 0)).toBe(true);
      // His story groupings are the section cuts themselves.
      expect(ch.stories).toEqual(ch.sections.map((s) => ({ start: s.start, end: s.end })));
      const noted = chapterHasNotes('Exodus', c, {});
      expect(noted).toBe(false);
      let state = seedStudyState();
      state = setChapterRead(state, 'Exodus', c, '2026-10-24');
      const marks = chapterDisplayMarks(state, 'Exodus', c, noted);
      expect(marks.headline).toBe('read');
      expect(marks.showNotesEditor).toBe(false);
    }
  });

  it('the render path handles a sections-but-no-notes chapter without crashing', () => {
    const ch = getChapterData('Exodus', 1)!;
    // Groupings present → NOT bare (his cuts pace it, like Ecclesiastes 3–12).
    expect(isBareChapter(ch)).toBe(false);
    const display = buildDisplaySections(ch, 22);
    const covered = display.flatMap((s) => s.entries);
    expect(covered.length).toBeGreaterThan(0);
    expect(covered.every((e) => e.verseOnly)).toBe(true);
    expect(Math.max(...covered.map((e) => e.end))).toBe(22);
    const readOnly = buildReadOnlySections(ch, 22);
    expect(readOnly).toHaveLength(3); // his three section cuts
    expect(readOnly.flatMap((s) => s.entries)).toHaveLength(22);
  });
});

describe('Part 3 — the generator guard: applyTranscriptionFill', () => {
  const stagedChapter = (text: string): V205ChapterData => ({
    chapter: 1,
    intro: [],
    previously: [],
    outline: [],
    sections: [
      { start: 1, end: 3, title: 'Set Up', entries: [{ start: 1, end: 3, blocks: [{ kind: 'para', text }] }] },
    ],
    stories: [{ start: 1, end: 3 }],
  });
  const transcribed: TranscribedMap = { Ezekiel: { '1': stagedChapter('Transcribed words.') } };

  it('creates a book the generation never carried', () => {
    const result = applyTranscriptionFill(undefined, 'Ezekiel', transcribed)!;
    expect(result.created).toBe(true);
    expect(result.filled).toEqual(['Ezekiel 1']);
    expect(result.conflicts).toEqual([]);
    expect(result.data.display).toBe('Ezekiel');
    expect(chapterBlockCount(result.data.chapters[1])).toBe(1);
  });

  it('fills a zero-block chapter recovery-style (intro/previously/sections land)', () => {
    const existing: V205BookData = {
      book: 'Ezekiel',
      display: 'Ezekiel',
      chapters: {
        1: {
          chapter: 1,
          intro: [],
          previously: [],
          outline: [],
          sections: [{ start: 1, end: 3, title: null, entries: [] }],
          stories: [{ start: 1, end: 3 }],
        },
      },
    };
    const result = applyTranscriptionFill(existing, 'Ezekiel', transcribed)!;
    expect(result.created).toBe(false);
    expect(result.filled).toEqual(['Ezekiel 1']);
    expect(result.data.chapters[1].sections[0].entries[0].blocks[0].text).toBe('Transcribed words.');
  });

  it('NEVER overwrites a chapter already carrying blocks — it reports a conflict', () => {
    const existing: V205BookData = {
      book: 'Ezekiel',
      display: 'Ezekiel',
      chapters: { 1: stagedChapter('His txt words.') },
    };
    const result = applyTranscriptionFill(existing, 'Ezekiel', transcribed)!;
    expect(result.filled).toEqual([]);
    expect(result.conflicts).toEqual(['Ezekiel 1']);
    expect(result.data.chapters[1].sections[0].entries[0].blocks[0].text).toBe('His txt words.');
  });

  it('returns null for a book the transcription does not carry', () => {
    expect(applyTranscriptionFill(undefined, 'Daniel', transcribed)).toBeNull();
  });

  it('the generator script runs the transcription stage from the staging folder', () => {
    const src = readFileSync(join(process.cwd(), 'scripts', 'build-bible-v205.ts'), 'utf8');
    expect(src).toContain('applyTranscriptionFill');
    expect(src).toContain('pdf-transcription');
    expect(src).toContain('CONFLICT');
  });
});
