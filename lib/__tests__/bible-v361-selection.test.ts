// ─── v361 — the reader selection-highlight model (his ruling,
// 2026-10-30, from reader-highlight-model-v3.html) ──────────────────
// "Drag across the words" — in the Bible, or in his own notes —
// "and the little bar offers six colours, a bubble, or a note."
// These pins cover the model end to end: the tokenizer's offsets,
// the marks layer (apply / resolve / scrub / split / line-edit
// hygiene), the six washes, the slimmed composer surface, the
// bubble's verse-level seat (option B), and the composer seat fix.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applyLinePhraseHighlight,
  applyVersePhraseHighlight,
  emptyMarks,
  lineHighlightsFor,
  normalizeMarks,
  removeKeeperLineAt,
  resolvePhraseHighlights,
  sanitizeLinePhraseHighlights,
  sanitizeVersePhraseHighlights,
  scrubPhraseHighlights,
  updateKeeperLineAt,
  type EntryMarks,
  type MarksMap,
} from '../bible-v205/marks';
import { entryKey } from '../bible-v205/types';
import { splitEntryByHashNotes, type DisplayEntry } from '../bible-v205/index';
import { tokenizeWords } from '../bible-v205/selection';

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');
const chapterPage = () => read('components/bible-v205/chapter-page.tsx');

const BOOK = 'Genesis';
const CH = 1;
const key = (s: number, e: number) => entryKey(BOOK, CH, s, e);

function marksWith(partial: Partial<EntryMarks>, s = 1, e = 3): MarksMap {
  return { [key(s, e)]: { ...emptyMarks(), ...partial } };
}

describe('v361 tokenizer — offsets address the plain string', () => {
  it('splits on whitespace with exact character offsets', () => {
    expect(tokenizeWords('In the beginning God')).toEqual([
      { start: 0, end: 2, word: 'In' },
      { start: 3, end: 6, word: 'the' },
      { start: 7, end: 16, word: 'beginning' },
      { start: 17, end: 20, word: 'God' },
    ]);
  });

  it('punctuation rides with its word; runs of space collapse', () => {
    expect(tokenizeWords('Selah.  Amen,  Lord')).toEqual([
      { start: 0, end: 6, word: 'Selah.' },
      { start: 8, end: 13, word: 'Amen,' },
      { start: 15, end: 19, word: 'Lord' },
    ]);
    expect(tokenizeWords('')).toEqual([]);
    expect(tokenizeWords('   ')).toEqual([]);
  });
});

describe('v361 verse phrase highlights — apply', () => {
  const base = [{ verse: 2, start: 0, end: 10, tint: 'yellow' as const }];

  it('lays a range down; a different verse is untouched', () => {
    const out = applyVersePhraseHighlight(base, { verse: 3, start: 4, end: 9, tint: 'blue' });
    expect(out).toEqual([
      { verse: 2, start: 0, end: 10, tint: 'yellow' },
      { verse: 3, start: 4, end: 9, tint: 'blue' },
    ]);
  });

  it('an overlapping application strips what it covers on that verse', () => {
    const out = applyVersePhraseHighlight(base, { verse: 2, start: 5, end: 20, tint: 'red' });
    expect(out).toEqual([{ verse: 2, start: 5, end: 20, tint: 'red' }]);
  });

  it('an exact re-selection in the same hue lifts the range (toggle)', () => {
    expect(applyVersePhraseHighlight(base, { verse: 2, start: 0, end: 10, tint: 'yellow' })).toEqual([]);
  });

  it('an exact range in a NEW hue recolours rather than lifting', () => {
    expect(applyVersePhraseHighlight(base, { verse: 2, start: 0, end: 10, tint: 'orange' })).toEqual([
      { verse: 2, start: 0, end: 10, tint: 'orange' },
    ]);
  });
});

describe('v361 line phrase highlights — apply', () => {
  const base = [
    { field: 'notes' as const, index: 0, start: 0, end: 5, tint: 'green' as const },
    { field: 'notes' as const, index: 1, start: 2, end: 8, tint: 'rose' as const },
  ];

  it('applies on the addressed line only', () => {
    const out = applyLinePhraseHighlight(base, { field: 'notes', index: 1 }, { start: 10, end: 14, tint: 'blue' });
    expect(out).toContainEqual({ field: 'notes', index: 0, start: 0, end: 5, tint: 'green' });
    expect(out).toContainEqual({ field: 'notes', index: 1, start: 10, end: 14, tint: 'blue' });
  });

  it('toggles an exact re-selection off', () => {
    const out = applyLinePhraseHighlight(base, { field: 'notes', index: 0 }, { start: 0, end: 5, tint: 'green' });
    expect(out).toEqual([{ field: 'notes', index: 1, start: 2, end: 8, tint: 'rose' }]);
  });
});

describe('v361 stored ranges read back clean', () => {
  it('sanitizers drop unknown hues, inverted ranges, bad addresses', () => {
    expect(
      sanitizeVersePhraseHighlights([
        { verse: 2, start: 0, end: 5, tint: 'blue' },
        { verse: 2, start: 0, end: 5, tint: 'purple' },
        { verse: 2, start: 5, end: 5, tint: 'red' },
        { verse: 0, start: 0, end: 5, tint: 'red' },
        { verse: 2, start: -1, end: 5, tint: 'red' },
        'junk',
      ]),
    ).toEqual([{ verse: 2, start: 0, end: 5, tint: 'blue' }]);
    expect(
      sanitizeLinePhraseHighlights([
        { field: 'notes', index: 0, start: 0, end: 3, tint: 'orange' },
        { field: 'bogus', index: 0, start: 0, end: 3, tint: 'orange' },
        { field: 'notes', index: -1, start: 0, end: 3, tint: 'orange' },
      ]),
    ).toEqual([{ field: 'notes', index: 0, start: 0, end: 3, tint: 'orange' }]);
  });

  it('a pre-v361 record normalizes with empty range lists', () => {
    const legacy = { kept: true, highlights: [], thoughts: [], notes: [], tint: 'rose', verseTints: {}, category: null };
    const out = normalizeMarks(legacy as never);
    expect(out.phraseHighlights).toEqual([]);
    expect(out.lineHighlights).toEqual([]);
    expect(out.tint).toBe('rose');
  });

  it('the six hues all survive normalization (the stored set grew)', () => {
    const out = normalizeMarks({
      ...emptyMarks(),
      phraseHighlights: ['yellow', 'rose', 'green', 'blue', 'red', 'orange'].map((tint, i) => ({
        verse: 1,
        start: i * 10,
        end: i * 10 + 5,
        tint: tint as never,
      })),
    });
    expect(out.phraseHighlights.map((h) => h.tint)).toEqual(['yellow', 'rose', 'green', 'blue', 'red', 'orange']);
  });
});

describe('v361 resolve + scrub — the v212 discipline at phrase grain', () => {
  it('a covering record resolves a span with no record of its own', () => {
    const marks = marksWith({ phraseHighlights: [{ verse: 2, start: 0, end: 6, tint: 'blue' }] }, 1, 3);
    expect(resolvePhraseHighlights(marks, BOOK, CH, 2, 2)).toEqual([{ verse: 2, start: 0, end: 6, tint: 'blue' }]);
  });

  it("a record at the span's own key is authoritative — a split piece never inherits", () => {
    const marks: MarksMap = {
      [key(1, 3)]: { ...emptyMarks(), phraseHighlights: [{ verse: 2, start: 0, end: 6, tint: 'blue' }] },
      [key(2, 2)]: { ...emptyMarks(), phraseHighlights: [] },
    };
    expect(resolvePhraseHighlights(marks, BOOK, CH, 2, 2)).toEqual([]);
  });

  it('scrub strips overlaps from every other covering record, spares the written one', () => {
    const marks: MarksMap = {
      [key(1, 3)]: { ...emptyMarks(), phraseHighlights: [{ verse: 2, start: 0, end: 6, tint: 'blue' }, { verse: 2, start: 20, end: 25, tint: 'red' }] },
      [key(2, 2)]: { ...emptyMarks(), phraseHighlights: [{ verse: 2, start: 1, end: 4, tint: 'green' }] },
    };
    const out = scrubPhraseHighlights(marks, BOOK, CH, 2, 2, 8, key(2, 2));
    expect(out[key(1, 3)].phraseHighlights).toEqual([{ verse: 2, start: 20, end: 25, tint: 'red' }]);
    expect(out[key(2, 2)].phraseHighlights).toEqual([{ verse: 2, start: 1, end: 4, tint: 'green' }]);
  });
});

describe("v361 the '#' split partitions verse ranges by verse", () => {
  const entry = {
    start: 10,
    end: 12,
    blocks: [],
  } as unknown as DisplayEntry;

  it('each piece carries only the ranges on its own verses', () => {
    const m: EntryMarks = {
      ...emptyMarks(),
      notes: ['#12 Set apart.'],
      phraseHighlights: [
        { verse: 11, start: 0, end: 5, tint: 'yellow' },
        { verse: 12, start: 3, end: 9, tint: 'red' },
      ],
      lineHighlights: [{ field: 'notes', index: 0, start: 0, end: 4, tint: 'blue' }],
    };
    const pieces = splitEntryByHashNotes(entry, m);
    const byStart = new Map(pieces.map((p) => [p.entry.start, p]));
    expect(byStart.get(10)?.marks.phraseHighlights).toEqual([{ verse: 11, start: 0, end: 5, tint: 'yellow' }]);
    expect(byStart.get(12)?.marks.phraseHighlights).toEqual([{ verse: 12, start: 3, end: 9, tint: 'red' }]);
    // Line ranges never partition — they live on the storage record.
    for (const p of pieces) expect(p.marks.lineHighlights).toEqual([]);
  });
});

describe('v361 line-edit hygiene — offsets never outlive their words', () => {
  const start: MarksMap = {
    [key(1, 3)]: {
      ...emptyMarks(),
      notes: ['First line words here', 'Second line words'],
      lineHighlights: [
        { field: 'notes', index: 0, start: 0, end: 5, tint: 'blue' },
        { field: 'notes', index: 1, start: 0, end: 6, tint: 'red' },
      ],
    },
  };

  it("editing a line's text retires ITS ranges, keeps the others", () => {
    const out = updateKeeperLineAt(start, BOOK, CH, 1, 3, 'notes', 0, { text: 'Rewritten entirely' });
    expect(out[key(1, 3)].lineHighlights).toEqual([{ field: 'notes', index: 1, start: 0, end: 6, tint: 'red' }]);
  });

  it('a re-face (author only) keeps the ranges — the words never moved', () => {
    const out = updateKeeperLineAt(start, BOOK, CH, 1, 3, 'notes', 0, { author: { authorId: 'x', authorName: 'X' } });
    expect(out[key(1, 3)].lineHighlights).toHaveLength(2);
  });

  it('removing a line drops its ranges and shifts later ones down', () => {
    const out = removeKeeperLineAt(start, BOOK, CH, 1, 3, 'notes', 0);
    expect(out[key(1, 3)].lineHighlights).toEqual([{ field: 'notes', index: 0, start: 0, end: 6, tint: 'red' }]);
  });

  it('lineHighlightsFor reads through the storage target', () => {
    expect(lineHighlightsFor(start, BOOK, CH, { start: 1, end: 3, field: 'notes', index: 1 })).toEqual([
      { start: 0, end: 6, tint: 'red' },
    ]);
  });
});

describe('v361 the six washes (palette source pins — the palette module itself is hook-bound)', () => {
  it('the palette carries the six phrase washes and the legacy three, unchanged, and routes all six', () => {
    const src = read('components/bible-v205/palette.ts');
    for (const s of [
      "phraseTintYellow: 'rgba(245,197,66,.48)'",
      "phraseTintRose: 'rgba(240,139,180,.42)'",
      "phraseTintGreen: 'rgba(99,190,130,.40)'",
      "phraseTintBlue: 'rgba(110,168,240,.40)'",
      "phraseTintRed: 'rgba(240,118,107,.42)'",
      "phraseTintOrange: 'rgba(245,158,76,.44)'",
      // Legacy preservation: the washes his existing tints render
      // through are byte-for-byte what they were before v361.
      "tintYellow: 'rgba(245,197,66,.32)'",
      "tintRose: 'rgba(230,73,128,.22)'",
      "tintGreen: 'rgba(64,160,110,.27)'",
      "verseTintYellow: 'rgba(245,197,66,.45)'",
      "verseTintRose: 'rgba(230,73,128,.45)'",
      "verseTintGreen: 'rgba(64,160,110,.45)'",
      // All three wash functions route the full six.
      "case 'blue': return palette.phraseTintBlue;",
      "case 'red': return palette.phraseTintRed;",
      "case 'orange': return palette.phraseTintOrange;",
      "case 'blue': return palette.tintBlue;",
      "case 'blue': return palette.verseTintBlue;",
    ]) {
      expect(src).toContain(s);
    }
  });

  it('the selection bar offers the six dots in the approved order, from the marks layer', () => {
    const sel = read('components/bible-v205/selectable-text.tsx');
    expect(sel).toContain('TINT_ORDER.map');
    expect(sel).toContain('TINT_DOT_HEX[t]');
    const marks = read('lib/bible-v205/marks.ts');
    expect(marks).toContain("export const TINT_ORDER: readonly TintColor[] = ['yellow', 'rose', 'green', 'blue', 'red', 'orange'];");
    // The bar's dots are the mockup's hexes (purple stayed out —
    // too close to pink, his ruling; red and orange are in).
    for (const hex of ['#F5C542', '#F08BB4', '#63BE82', '#6EA8F0', '#F0766B', '#F59E4C']) {
      expect(marks).toContain(hex);
    }
  });
});

describe('v361 reader surface — the selection model wired in', () => {
  it('verses render through SelectableText; the legacy whole-verse tint still paints', () => {
    const src = chapterPage();
    expect(src).toContain('<SelectableText');
    expect(src).toContain('wholeTint={verseBg}');
    expect(src).toContain('verseTintFor(palette, props.verseTints[v])');
    expect(src).toContain('highlights={props.phraseHighlights.filter((h) => h.verse === v)}');
  });

  it('the verse number is a plain lead token — its tint-selection tap is retired', () => {
    const src = chapterPage();
    expect(src).not.toContain('onToggleVerse');
    expect(src).not.toContain('props.onToggleVerse(v)');
    expect(src).toContain('styles.supSeat');
  });

  it('the bar actions: Bubble seats the verse composer as "Someone said"; Note as today\'s tap', () => {
    const src = chapterPage();
    expect(src).toContain("openComposerForVerse(v, { bubble: true })");
    expect(src).toContain("'Someone said'");
    expect(src).toContain('onNote={() => openComposerForVerse(v)}');
    // His notes' bar files its bubble on the parent verse too.
    expect(src).toContain('onBubble: () => openComposerForVerse(anchorVerse, { bubble: true })');
  });

  it('the mark cluster is slimmed: Keep + Note only — no kind buttons, no chips, no tint row', () => {
    const src = chapterPage();
    const cluster = src.slice(src.indexOf('const renderMarkCluster'), src.indexOf('const renderMarkCluster') + 4000);
    expect(cluster).toContain('onToggleKept');
    expect(cluster).toContain("openComposer('note')");
    expect(cluster).not.toContain("openComposer('highlight')");
    expect(cluster).not.toContain("openComposer('thought')");
    expect(cluster).not.toContain('NOTE_CATEGORIES');
    expect(cluster).not.toContain('Tint');
    // The composer box itself survives intact: text field, # tip,
    // WHO SAID THIS picker, Cancel/Add.
    expect(cluster).toContain('Tip: start a note with #11-12');
    expect(cluster).toContain('<AuthorPicker');
    expect(cluster).toContain('>Cancel</Text>');
  });

  it('his own lines render selectable in the chapter page (blocks.tsx flow + box)', () => {
    const src = chapterPage();
    expect(src).toContain('lineHighlightsFor(props.marksMap, props.book, props.chapter, target)');
    expect(src).toContain('onLinePhraseTint(target, range, tint)');
    const blocks = read('components/bible-v205/blocks.tsx');
    expect(blocks).toContain('<SelectableText');
    // Stories passes no selection — its rendering stands untouched.
    const stories = read('components/bible-v205/stories-view.tsx');
    expect(stories).not.toContain('SelectableText');
  });

  it('seat fix: clusters report their bottom; the page scrolls and lends spacer room', () => {
    const src = chapterPage();
    expect(src).toContain('onClusterExtent');
    expect(src).toContain('measureLayout');
    expect(src).toContain('ensureSeatVisible');
    expect(src).toContain('SEAT_FAB_CLEARANCE_PX = 76');
    expect(src).toContain('seatSpacer');
    // The page scroll locks while a selection drag is live.
    expect(src).toContain('scrollEnabled={!selectionDrag}');
  });
});
