// ─── v390 — his commentary prose joins the selection model ─────────────────
// His report (2026-10-31, two screenshots from 1 John 1 "With
// notes"): he could not SELECT — and so could not highlight —
// ANY of his own note text. Verified by render path, not by the
// code comments (which claimed a tint path for "his lines"):
// the verses and his stored marks lines rendered through
// SelectableText, but every surface of the COMMENTARY prose was
// plain Text — the chapter opener's paragraphs, the Previously
// paragraphs, and every BlockView branch (main note paragraphs,
// the four typed boxes, Main Thought, scripture callouts).
//
// v390 wires them all through the same SelectableText machinery,
// with ranges stored in a new EntryMarks list — blockHighlights,
// addressed by surface + block index — in its own list so a note
// range can never collide with a verse or line range. Entry
// blocks live on the PARENT entry's record; chapter prose lives
// on the CHAPTER_PROSE_SPAN (0-0) record, which no covering
// resolution can reach.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applyBlockPhraseHighlight,
  blockHighlightsFor,
  CHAPTER_PROSE_SPAN,
  emptyMarks,
  normalizeMarks,
  parseEntryKey,
  sanitizeBlockPhraseHighlights,
  withMarks,
  type BlockPhraseHighlight,
  type EntryMarks,
  type MarksMap,
} from '../bible-v205/marks';
import { entryKey } from '../bible-v205/types';

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');
const chapterPage = () => read('components/bible-v205/chapter-page.tsx');
const blocksTsx = () => read('components/bible-v205/blocks.tsx');
const storiesView = () => read('components/bible-v205/stories-view.tsx');

const BOOK = '1 John';
const CH = 1;
const key = (s: number, e: number) => entryKey(BOOK, CH, s, e);

function marksWith(partial: Partial<EntryMarks>, s = 5, e = 9): MarksMap {
  return { [key(s, e)]: { ...emptyMarks(), ...partial } };
}

describe('v390 marks — block highlights apply / toggle / strip, per block only', () => {
  const range = { start: 10, end: 24, tint: 'yellow' as const };

  it('applies a range onto one block and reads it back through the same address', () => {
    const next = applyBlockPhraseHighlight([], { surface: 'blocks', index: 2 }, range);
    expect(next).toEqual([{ surface: 'blocks', index: 2, ...range }]);
    const marks = marksWith({ blockHighlights: next });
    expect(blockHighlightsFor(marks, BOOK, CH, { start: 5, end: 9 }, 'blocks', 2)).toEqual([range]);
  });

  it('an exact re-selection toggles the range off', () => {
    const once = applyBlockPhraseHighlight([], { surface: 'intro', index: 0 }, range);
    const twice = applyBlockPhraseHighlight(once, { surface: 'intro', index: 0 }, range);
    expect(twice).toEqual([]);
  });

  it('a new range strips overlaps on ITS block only — other blocks and surfaces stand', () => {
    const start: BlockPhraseHighlight[] = [
      { surface: 'blocks', index: 1, start: 8, end: 30, tint: 'rose' },
      { surface: 'blocks', index: 2, start: 8, end: 30, tint: 'rose' },
      { surface: 'intro', index: 1, start: 8, end: 30, tint: 'rose' },
    ];
    const next = applyBlockPhraseHighlight(start, { surface: 'blocks', index: 1 }, range);
    expect(next).toContainEqual({ surface: 'blocks', index: 2, start: 8, end: 30, tint: 'rose' });
    expect(next).toContainEqual({ surface: 'intro', index: 1, start: 8, end: 30, tint: 'rose' });
    expect(next.filter((h) => h.surface === 'blocks' && h.index === 1)).toEqual([
      { surface: 'blocks', index: 1, ...range },
    ]);
  });

  it('never touches the verse or line lists — identical offsets live independently in all three', () => {
    const marks = marksWith({
      phraseHighlights: [{ verse: 7, ...range }],
      lineHighlights: [{ field: 'notes', index: 0, ...range }],
      blockHighlights: [{ surface: 'blocks', index: 0, ...range }],
    });
    const rec = marks[key(5, 9)];
    expect(rec.phraseHighlights).toEqual([{ verse: 7, ...range }]);
    expect(rec.lineHighlights).toEqual([{ field: 'notes', index: 0, ...range }]);
    expect(blockHighlightsFor(marks, BOOK, CH, { start: 5, end: 9 }, 'blocks', 0)).toEqual([range]);
    // …and another block on the same record reads empty.
    expect(blockHighlightsFor(marks, BOOK, CH, { start: 5, end: 9 }, 'blocks', 1)).toEqual([]);
  });
});

describe('v390 marks — persistence shape (sanitize + normalize round trip)', () => {
  it('a stored block range survives normalizeMarks verbatim', () => {
    const stored = {
      ...emptyMarks(),
      blockHighlights: [{ surface: 'previously', index: 1, start: 0, end: 12, tint: 'blue' }],
    } as unknown as Partial<EntryMarks>;
    expect(normalizeMarks(stored).blockHighlights).toEqual([
      { surface: 'previously', index: 1, start: 0, end: 12, tint: 'blue' },
    ]);
  });

  it('records written before v390 read back with an empty block list', () => {
    const legacy = { kept: true } as Partial<EntryMarks>;
    expect(normalizeMarks(legacy).blockHighlights).toEqual([]);
    expect(emptyMarks().blockHighlights).toEqual([]);
  });

  it('sanitize drops unknown surfaces, negative indexes, and bad ranges', () => {
    expect(
      sanitizeBlockPhraseHighlights([
        { surface: 'verses', index: 0, start: 0, end: 5, tint: 'yellow' },
        { surface: 'blocks', index: -1, start: 0, end: 5, tint: 'yellow' },
        { surface: 'blocks', index: 0, start: 5, end: 5, tint: 'yellow' },
        { surface: 'blocks', index: 0, start: 0, end: 5, tint: 'purple' },
        { surface: 'blocks', index: 3, start: 0, end: 5, tint: 'green' },
        'garbage',
        null,
      ]),
    ).toEqual([{ surface: 'blocks', index: 3, start: 0, end: 5, tint: 'green' }]);
  });

  it('a tint written through withMarks at the prose span re-renders from that record only', () => {
    let marks: MarksMap = {};
    const nextList = applyBlockPhraseHighlight([], { surface: 'intro', index: 0 }, { start: 0, end: 17, tint: 'red' });
    marks = withMarks(marks, BOOK, CH, CHAPTER_PROSE_SPAN.start, CHAPTER_PROSE_SPAN.end, { blockHighlights: nextList });
    expect(blockHighlightsFor(marks, BOOK, CH, CHAPTER_PROSE_SPAN, 'intro', 0)).toEqual([
      { start: 0, end: 17, tint: 'red' },
    ]);
    // An entry record never sees the prose record's ranges, and
    // the prose record never sees an entry's.
    expect(blockHighlightsFor(marks, BOOK, CH, { start: 1, end: 10 }, 'intro', 0)).toEqual([]);
  });

  it('the prose span parses as 0-0 — a key no entry can carry and no covering span can reach', () => {
    expect(CHAPTER_PROSE_SPAN).toEqual({ start: 0, end: 0 });
    expect(parseEntryKey(key(CHAPTER_PROSE_SPAN.start, CHAPTER_PROSE_SPAN.end))).toEqual({
      book: BOOK,
      chapter: CH,
      start: 0,
      end: 0,
    });
    // covering requires prose.end >= span.end; 0 >= end fails for
    // every real span (end >= 1) — the record is inert by shape.
  });
});

describe('v390 render pins — the dead surfaces are wired', () => {
  it('opener paragraphs render through SelectableText on the intro surface', () => {
    const src = chapterPage();
    expect(src).toContain("proseSelection('intro', i)");
    expect(src).toContain("selection={proseSelection('intro', i)}");
    // The plain-Text opener paragraph is gone.
    expect(src).not.toContain('{b.text}</Text>');
  });

  it('Previously paragraphs render through SelectableText on the previously surface', () => {
    expect(chapterPage()).toContain("proseSelection('previously', i)");
  });

  it('entry body blocks receive a blocks-surface selection addressed by parent-record span + source index', () => {
    const src = chapterPage();
    expect(src).toContain("props.blockSpan, 'blocks', idx");
    expect(src).toContain('renderBlocks');
    // The blocks keep their SOURCE index through the render map.
    expect(src).toContain('entry.blocks');
    expect(src).toContain('.map((b, idx) => ({ b, idx }))');
  });

  it('BlockView routes its prose through the selectable path when a selection is supplied', () => {
    const src = blocksTsx();
    expect(src).toContain('SelectableOrText');
    expect(src).toContain('selection?: BlockTextSelection');
    // The typed boxes carry it too — CategoryBox renders its words
    // through the same helper.
    expect(src).toContain('selection={selection}');
  });

  it('the tint handler writes block ranges onto the host record, line-handler discipline', () => {
    const src = chapterPage();
    expect(src).toContain('handleBlockPhraseTint');
    expect(src).toContain('applyBlockPhraseHighlight(rec.blockHighlights');
  });

  it('chapter prose Bubble / Note route to a verse seat (the opener has no verse of its own)', () => {
    const src = chapterPage();
    expect(src).toContain('requestProseSeat');
    expect(src).toContain('seatRequest');
  });

  it('Stories keeps the plain rendering — it passes BlockView no selection (the SelfLineBlock split)', () => {
    const src = storiesView();
    expect(src).toContain('<BlockView');
    expect(src).not.toContain('selection=');
  });

  it('verse selection wiring is untouched — the verse bar still lands on onPhraseTint', () => {
    expect(chapterPage()).toContain('onApplyTint={(range, tint) => props.onPhraseTint(v, range, tint)}');
  });
});
