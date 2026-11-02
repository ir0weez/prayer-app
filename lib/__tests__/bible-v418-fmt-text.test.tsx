// ─── v418 — bold / italic in his own words (phone half) ─────────────────────
// Jonathan has typed markdown-style emphasis in his notes for years
// (`**SIDE NOTE:**`, `*It's funny because…*`) and asked why he can't
// bold or italicize (Nov 2). The Studio set the convention (pass
// -60); the phone parser is the same parser, and the marks contract
// is one coordinate space: every offset the marks layer holds
// against block/line text is measured against the STRIPPED text —
// the text every surface renders. Pins:
//  1. THE PARSER — the task's cases plus the guard edges (space-
//     edged spans, newline spans, unmatched stars stay literal; a
//     bold span may carry single stars; the italic closing scan
//     skips `**` pairs).
//  2. STRIPPED COORDINATES — fmtStyleRanges addresses the stripped
//     string; a block highlight recorded against plain text still
//     paints the same words after the block gains markers before
//     the range; painting validation fits ranges to the stripped
//     length, never the raw.
//  3. THE ROUND TRIP — a marked para survives the Studio door
//     (import → stored imports → the export's own loader) byte-
//     identical: markers are just characters, nothing rewrites them.
//  4. THE PDF — note text prints with no literal asterisks, his
//     stripped-coordinate ranges paint the same words on paper,
//     and scripture blocks stay literal. Strip-only: the PDF
//     builder registers no bold/italic fonts of its own.

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

vi.mock('react-native', async () => {
  const rnw = await import('react-native-web');
  return {
    ...rnw,
    Platform: { OS: 'web', select: (o: any) => o.web ?? o.default },
  };
});

// The palette module imports use-colors; the hook itself is never
// called by the seams pinned here (the v405 rig's precedent).
vi.mock('@/hooks/use-colors', async () => {
  const { getThemedPalette } = await import('../color-themes');
  return { useColors: () => getThemedPalette('light', 'default' as any) };
});

vi.mock('@expo/vector-icons/MaterialIcons', async () => {
  const React = await import('react');
  const { Text } = await import('react-native-web');
  return {
    default: (props: any) =>
      React.createElement(Text, { style: { color: props.color, fontSize: props.size } }, `icon:${props.name}`),
  };
});

import React from 'react';
import { renderToString } from 'react-dom/server';
import { fmtStyleRanges, fmtTokens, stripFmtText } from '../bible-v205/fmt-text';
import {
  computeSeatPlacements,
  isSeatBoxBlock,
  isSeatHostBlock,
} from '../bible-v205/seat-boxes';
import { buildTintSegments } from '../../components/bible-v205/native-selectable-text';
import { SeatedBlockView } from '../../components/bible-v205/blocks';
import type { BiblePalette } from '../../components/bible-v205/palette';
import {
  blockHighlightsFor,
  emptyMarks,
  type MarksMap,
  type PhraseHighlight,
} from '../bible-v205/marks';
import {
  STUDIO_IMPORT_KEY,
  applyStudioChapters,
  loadStudioImports,
  parseStudioFile,
  studioImportKey,
  type StudioChapterPayload,
} from '../bible-v205/studio-import';
import {
  assembleChapterPdfData,
  buildChapterPdfHtml,
  pdfThemeFromSeed,
} from '../bible-v205/pdf-export';
import { embeddedVerses } from '../bible-v205/verses';
import type { V205Block, V205ChapterData } from '../bible-v205/types';

// A palette stub carrying only what phraseTintFor reads (v405's rig).
const palette = {
  phraseTintYellow: 'Y',
  phraseTintRose: 'R',
  phraseTintGreen: 'G',
  phraseTintBlue: 'B',
  phraseTintRed: 'D',
  phraseTintOrange: 'O',
} as unknown as BiblePalette;

beforeEach(() => {
  store.clear();
});

describe('v418 fmtTokens — the Studio convention, exactly', () => {
  it('**SIDE NOTE:** is a bold span, the rest plain', () => {
    expect(fmtTokens('**SIDE NOTE:** Gossiping')).toEqual([
      { k: 'b', s: 'SIDE NOTE:' },
      { k: '', s: ' Gossiping' },
    ]);
  });

  it("*It's funny because* is an italic span", () => {
    expect(fmtTokens("*It's funny because*")).toEqual([{ k: 'i', s: "It's funny because" }]);
  });

  it('multiplication stays literal: 5 * 3 = 15', () => {
    expect(fmtTokens('5 * 3 = 15')).toEqual([{ k: '', s: '5 * 3 = 15' }]);
  });

  it('space-edged stars stay literal: a * b * c', () => {
    expect(fmtTokens('a * b * c')).toEqual([{ k: '', s: 'a * b * c' }]);
  });

  it('***both*** is bold+italic', () => {
    expect(fmtTokens('***both***')).toEqual([{ k: 'bi', s: 'both' }]);
  });

  it('a bold span may carry single stars, rendered literally', () => {
    expect(fmtTokens('**a * b** c')).toEqual([
      { k: 'b', s: 'a * b' },
      { k: '', s: ' c' },
    ]);
  });

  it('the italic closing scan skips ** pairs', () => {
    expect(fmtTokens('*a **b** c*')).toEqual([{ k: 'i', s: 'a **b** c' }]);
  });

  it('guards: space-edged, newline, and unmatched spans stay literal', () => {
    expect(fmtTokens('** spaced **')).toEqual([{ k: '', s: '** spaced **' }]);
    expect(fmtTokens('**two\nlines**')).toEqual([{ k: '', s: '**two\nlines**' }]);
    expect(fmtTokens('unmatched **star')).toEqual([{ k: '', s: 'unmatched **star' }]);
    expect(fmtTokens('')).toEqual([]);
    expect(fmtTokens('plain words')).toEqual([{ k: '', s: 'plain words' }]);
  });

  it('stripFmtText removes the markers and nothing else', () => {
    expect(stripFmtText('**A** and *b*')).toBe('A and b');
    expect(stripFmtText('***x***')).toBe('x');
    expect(stripFmtText('no marks at all')).toBe('no marks at all');
    expect(stripFmtText('5 * 3 = 15')).toBe('5 * 3 = 15');
  });
});

describe('v418 fmtStyleRanges — emphasis addressed in stripped coordinates', () => {
  it('ranges walk the stripped string', () => {
    const raw = '**NOTE:** read *this* now';
    expect(stripFmtText(raw)).toBe('NOTE: read this now');
    expect(fmtStyleRanges(raw)).toEqual([
      { start: 0, end: 5, k: 'b' },
      { start: 11, end: 15, k: 'i' },
    ]);
    expect(fmtStyleRanges('no marks')).toEqual([]);
  });

  it('emphasis and tint sweep together in the selectable segments', () => {
    const raw = '**NOTE:** read *this* now';
    const segs = buildTintSegments(
      stripFmtText(raw),
      [{ start: 11, end: 15, tint: 'yellow' }],
      palette,
      fmtStyleRanges(raw),
    );
    // The tinted span is exactly the italic span — both dress it.
    expect(segs.map((s) => [s.text, s.backgroundColor, s.fmt ?? null])).toEqual([
      ['NOTE:', null, 'b'],
      [' read ', null, null],
      ['this', 'Y', 'i'],
      [' now', null, null],
    ]);
    expect(segs.map((s) => s.text).join('')).toBe('NOTE: read this now');
  });
});

describe('v418 the marks contract — stored ranges live in stripped coordinates', () => {
  it('a range recorded against plain text paints the same words after markers land before it', () => {
    // Recorded when the block read plain (the desk's stripped
    // text, or the phone before the markers were typed):
    const plain = 'He deals with His own. We are the children of God.';
    const phrase = 'children of God';
    const start = plain.indexOf(phrase);
    const range = { start, end: start + phrase.length, tint: 'yellow' as const };
    // The block gains a bold span BEFORE the range; the raw string
    // grows by four characters, the stripped string is unchanged.
    const marked = '**He deals with His own.** We are the children of God.';
    expect(stripFmtText(marked)).toBe(plain);
    const segs = buildTintSegments(stripFmtText(marked), [range], palette);
    expect(segs.map((s) => s.text).join('')).toBe(plain);
    expect(segs.filter((s) => s.backgroundColor !== null).map((s) => s.text)).toEqual([phrase]);
  });

  it('painting validation fits a stored range to the stripped length, never the raw', () => {
    const raw = 'Think on *these things* today.';
    const stripped = stripFmtText(raw);
    expect(stripped).toBe('Think on these things today.');
    // A block highlight stored through the marks layer's own read
    // path, addressed in stripped coordinates (9–21 = "these things").
    const marks: MarksMap = {
      'Genesis|1|1-1': {
        ...emptyMarks(),
        blockHighlights: [{ surface: 'blocks', index: 0, start: 9, end: 21, tint: 'green' }],
      },
    };
    const ranges = blockHighlightsFor(marks, 'Genesis', 1, { start: 1, end: 1 }, 'blocks', 0);
    expect(ranges).toEqual([{ start: 9, end: 21, tint: 'green' }]);
    // The range fits the stripped text exactly; against the raw
    // string it would slice the markers themselves.
    expect(ranges[0].end).toBeLessThanOrEqual(stripped.length);
    expect(raw.slice(9, 21)).not.toBe('these things');
    const segs = buildTintSegments(stripped, ranges, palette);
    expect(segs.filter((s) => s.backgroundColor !== null).map((s) => s.text)).toEqual([
      'these things',
    ]);
    expect(segs.map((s) => s.text).join('')).toBe(stripped);
  });
});

describe('v418 the round trip — markers are just characters', () => {
  it('a marked para survives import → stored imports → export loader byte-identical', async () => {
    const pack = {
      book: '1 John',
      chapter: 2,
      opener: { kind: 'introduction', text: 'Opening words.' },
      sections: [{ start: 1, end: 2, title: null, entries: [{ start: 1, end: 2 }] }],
      notes: [
        {
          start: 1,
          end: 2,
          kind: 'note',
          category: null,
          blocks: [{ kind: 'para', text: '**bold** and *italic*' }],
        },
      ],
    };
    const parsed = parseStudioFile(pack);
    expect(parsed.kind).toBe('notes');
    if (parsed.kind !== 'notes') return;
    const payload: StudioChapterPayload = parsed.chapters[0];
    const { next } = applyStudioChapters({}, [payload]);
    store.set(STUDIO_IMPORT_KEY, JSON.stringify(next));
    // The export re-serializes the imports store through this very
    // loader (export-payload.ts) — the text must come back untouched.
    const imports = await loadStudioImports();
    const data = imports[studioImportKey('1 John', 2)];
    const texts = data.sections.flatMap((s) => s.entries.flatMap((e) => e.blocks.map((b) => b.text)));
    expect(texts).toContain('**bold** and *italic*');
    expect(JSON.stringify(imports)).toContain('**bold** and *italic*');
  });
});

describe('v418 the chapter PDF — no literal asterisks in his words', () => {
  function markedChapter(): { data: ReturnType<typeof assembleChapterPdfData>; html: string } {
    const paraText = '**SIDE NOTE:** Gossiping *about others* is wrong.';
    const strippedPara = stripFmtText(paraText);
    const hlPhrase = 'about others';
    const hlStart = strippedPara.indexOf(hlPhrase);
    const chapterData: V205ChapterData = {
      chapter: 2,
      intro: [],
      previously: ['**Before** this chapter, *grace* was the theme.'],
      outline: [],
      sections: [
        {
          start: 1,
          end: 1,
          title: null,
          entries: [
            {
              start: 1,
              end: 1,
              blocks: [
                { kind: 'para', text: paraText },
                { kind: 'scripture', text: 'I am *the way*, saith he.', ref: 'John 14:6' },
              ],
            },
          ],
        },
      ],
      stories: [],
    };
    const marks: MarksMap = {
      '1 John|2|1-1': {
        ...emptyMarks(),
        blockHighlights: [
          { surface: 'blocks', index: 0, start: hlStart, end: hlStart + hlPhrase.length, tint: 'yellow' },
        ],
        notes: ['A **keeper** line from the phone.'],
      },
    };
    const verses = embeddedVerses('1 John', 2);
    if (!verses) throw new Error('1 John 2 embedded verses missing');
    const data = assembleChapterPdfData({
      book: '1 John',
      chapter: 2,
      chapterData,
      marks,
      verses,
      people: [],
      profile: { name: 'Jonathan Roberts' },
    });
    const html = buildChapterPdfHtml({ data, theme: pdfThemeFromSeed('#256EE6'), authorName: 'Jonathan Roberts' });
    return { data, html };
  }

  it('note paragraphs, the opener, and added lines print stripped', () => {
    const { html } = markedChapter();
    expect(html).toContain('SIDE NOTE:');
    expect(html).not.toContain('**');
    expect(html).toContain('Before this chapter, grace was the theme.');
    expect(html).toContain('A keeper line from the phone.');
  });

  it('a stripped-coordinate block range paints the same words on paper', () => {
    const { html } = markedChapter();
    expect(html).toContain('>about others</span>');
  });

  it('scripture blocks stay literal — markers and all', () => {
    const { html } = markedChapter();
    expect(html).toContain('I am *the way*, saith he.');
  });
});

describe('v418 seat placement — a box takes its highlight’s seat (the -59 proofs)', () => {
  // A stored range as blockHighlightsFor resolves it — the block
  // index rides in the itemsFrom map key, as it does in the record.
  const item = (start: number, end: number): PhraseHighlight => ({
    start,
    end,
    tint: 'yellow',
  });
  const itemsFrom =
    (map: Record<number, PhraseHighlight[]>) =>
    (idx: number): PhraseHighlight[] =>
      map[idx] ?? [];
  const runOf = (text: string, phrase: string) => {
    const start = text.indexOf(phrase);
    return { start, end: start + phrase.length };
  };

  // The two boxes from his screenshot, in their real paragraphs
  // (1 John 2, shipped text).
  const paraA =
    'He will not scold and destroy their conduct and methodology (though he probably has the authority from the Lord to do so). Rather, he is going to show them the example of Christ. This is how God deals with His own. We are the children of God (as John will say in the next chapter).';
  const phraseA = 'This is how God deals with His own.';
  const paraB =
    'The point is, John wants to talk to this church as if he were their father figure, the same way the Lord will talk to His own children. He’s not saying that you simply won’t sin ever again if you belong to the Lord. Rather, you still have plenty of chances to sin. But he’s writing this to this church so that they don’t do it on purpose. They must know what sin is and must openly choose to repent of it in order to have an advocate with the Father. If they don’t find a need for repentance, they are likely not in the family of God.';
  const phraseB = 'If they don’t find a need for repentance, they are likely not in the family of God.';

  it('the block kind sets: who can host, who can take a seat', () => {
    expect(isSeatHostBlock({ kind: 'para', text: 'x' })).toBe(true);
    expect(isSeatHostBlock({ kind: 'para', text: 'x', category: 'definition' })).toBe(false);
    expect(isSeatHostBlock({ kind: 'scripture', text: 'x' })).toBe(false);
    expect(isSeatHostBlock({ kind: 'highlight', text: 'x' })).toBe(false);
    expect(isSeatBoxBlock({ kind: 'highlight', text: 'x' })).toBe(true);
    expect(isSeatBoxBlock({ kind: 'thought', text: 'x' })).toBe(true);
    expect(isSeatBoxBlock({ kind: 'para', text: 'x', category: 'definition' })).toBe(true);
    expect(isSeatBoxBlock({ kind: 'para', text: 'x', category: 'quote' })).toBe(true);
    expect(isSeatBoxBlock({ kind: 'note', text: 'x', category: 'personal-story' })).toBe(true);
    // Someone said (kind 'quote') NEVER seats; a good-thought para
    // is not in the seat set; a plain para is prose, not a box.
    expect(isSeatBoxBlock({ kind: 'quote', text: 'x' })).toBe(false);
    expect(isSeatBoxBlock({ kind: 'para', text: 'x', category: 'good-thought' })).toBe(false);
    expect(isSeatBoxBlock({ kind: 'para', text: 'x' })).toBe(false);
    expect(isSeatBoxBlock({ kind: 'scripture', text: 'x' })).toBe(false);
  });

  it('match: both screenshot boxes seat into their paragraphs', () => {
    const blocks: V205Block[] = [
      { kind: 'para', text: paraA },
      { kind: 'para', text: paraB },
      { kind: 'highlight', text: phraseA },
      { kind: 'highlight', text: phraseB },
    ];
    const ra = runOf(paraA, phraseA);
    const rb = runOf(paraB, phraseB);
    const placements = computeSeatPlacements(
      blocks,
      itemsFrom({ 0: [item(ra.start, ra.end)], 1: [item(rb.start, rb.end)] }),
    );
    expect(placements).toEqual([
      { boxIndex: 2, hostIndex: 0, ...runOf(paraA, phraseA) },
      { boxIndex: 3, hostIndex: 1, ...runOf(paraB, phraseB) },
    ]);
  });

  it('order: a box standing BEFORE its paragraph seats nothing', () => {
    const blocks: V205Block[] = [
      { kind: 'highlight', text: phraseA },
      { kind: 'para', text: paraA },
    ];
    const r = runOf(paraA, phraseA);
    expect(computeSeatPlacements(blocks, itemsFrom({ 1: [item(r.start, r.end)] }))).toEqual([]);
    // And a box between two paragraphs cannot seat BACKWARD into
    // the later one.
    const blocks2: V205Block[] = [
      { kind: 'para', text: 'An opening paragraph with nothing claimed.' },
      { kind: 'highlight', text: phraseA },
      { kind: 'para', text: paraA },
    ];
    expect(computeSeatPlacements(blocks2, itemsFrom({ 2: [item(r.start, r.end)] }))).toEqual([]);
  });

  it('claim-once: one run seats one box; the twin keeps its card', () => {
    const r = runOf(paraA, phraseA);
    const blocks: V205Block[] = [
      { kind: 'para', text: paraA },
      { kind: 'highlight', text: phraseA },
      { kind: 'highlight', text: phraseA },
    ];
    expect(computeSeatPlacements(blocks, itemsFrom({ 0: [item(r.start, r.end)] }))).toEqual([
      { boxIndex: 1, hostIndex: 0, start: r.start, end: r.end },
    ]);
  });

  it('trim-equal: a box carrying stray whitespace still proves its run', () => {
    const r = runOf(paraA, phraseA);
    const blocks: V205Block[] = [
      { kind: 'para', text: paraA },
      { kind: 'highlight', text: ` ${phraseA} ` },
    ];
    expect(computeSeatPlacements(blocks, itemsFrom({ 0: [item(r.start, r.end)] }))).toEqual([
      { boxIndex: 1, hostIndex: 0, start: r.start, end: r.end },
    ]);
    // But a word changed inside is a different text — no seat.
    const blocks2: V205Block[] = [
      { kind: 'para', text: paraA },
      { kind: 'highlight', text: 'This is how God deals with His people.' },
    ];
    expect(computeSeatPlacements(blocks2, itemsFrom({ 0: [item(r.start, r.end)] }))).toEqual([]);
  });

  it('non-para hosts never seat: scripture and box-dressed paras', () => {
    const r = runOf(paraA, phraseA);
    const viaScripture: V205Block[] = [
      { kind: 'scripture', text: paraA, ref: '1 John 2:1' },
      { kind: 'highlight', text: phraseA },
    ];
    expect(computeSeatPlacements(viaScripture, itemsFrom({ 0: [item(r.start, r.end)] }))).toEqual([]);
    const viaBoxedPara: V205Block[] = [
      { kind: 'para', text: paraA, category: 'definition' },
      { kind: 'highlight', text: phraseA },
    ];
    expect(computeSeatPlacements(viaBoxedPara, itemsFrom({ 0: [item(r.start, r.end)] }))).toEqual([]);
  });

  it('the range must fit the STRIPPED block: raw-coordinate and overlong ranges seat nothing', () => {
    const rawHost = '**He will not scold.** This is how God deals with His own. We are the children of God.';
    const strippedHost = stripFmtText(rawHost);
    const phrase = 'This is how God deals with His own.';
    const box: V205Block = { kind: 'highlight', text: phrase };
    // A range measured against the RAW string (the old habit)
    // slices the wrong words out of the stripped text.
    const rawRange = runOf(rawHost, phrase);
    expect(
      computeSeatPlacements([{ kind: 'para', text: rawHost }, box], itemsFrom({ 0: [item(rawRange.start, rawRange.end)] })),
    ).toEqual([]);
    // The same words in stripped coordinates seat, at the
    // stripped address.
    const strippedRange = runOf(strippedHost, phrase);
    expect(
      computeSeatPlacements([{ kind: 'para', text: rawHost }, box], itemsFrom({ 0: [item(strippedRange.start, strippedRange.end)] })),
    ).toEqual([{ boxIndex: 1, hostIndex: 0, start: strippedRange.start, end: strippedRange.end }]);
    // An overlong range never fits.
    expect(
      computeSeatPlacements(
        [{ kind: 'para', text: rawHost }, box],
        itemsFrom({ 0: [item(strippedRange.start, strippedHost.length + 4)] }),
      ),
    ).toEqual([]);
  });

  it('fallback: a failed proof seats nothing — the box keeps its card', () => {
    const blocks: V205Block[] = [
      { kind: 'para', text: paraA },
      { kind: 'highlight', text: phraseA },
    ];
    // No marks item at all.
    expect(computeSeatPlacements(blocks, itemsFrom({}))).toEqual([]);
    // An item whose run is a DIFFERENT span of the paragraph.
    const other = runOf(paraA, 'We are the children of God');
    expect(computeSeatPlacements(blocks, itemsFrom({ 0: [item(other.start, other.end)] }))).toEqual([]);
  });

  it('two runs in one paragraph seat both boxes, in run order', () => {
    const host = 'Alpha words here. Beta words follow.';
    const r1 = runOf(host, 'Alpha words here.');
    const r2 = runOf(host, 'Beta words follow.');
    const blocks: V205Block[] = [
      { kind: 'para', text: host },
      { kind: 'thought', text: 'Beta words follow.' },
      { kind: 'highlight', text: 'Alpha words here.' },
    ];
    // Boxes are dealt in block order; each claims its own run.
    expect(
      computeSeatPlacements(blocks, itemsFrom({ 0: [item(r1.start, r1.end), item(r2.start, r2.end)] })),
    ).toEqual([
      { boxIndex: 1, hostIndex: 0, start: r2.start, end: r2.end },
      { boxIndex: 2, hostIndex: 0, start: r1.start, end: r1.end },
    ]);
  });
});

describe('v418 SeatedBlockView — the box renders mid-paragraph', () => {
  // Real hexes here: react-native-web drops non-color tint stubs.
  const renderPalette = {
    phraseTintYellow: '#FDE68A',
    phraseTintRose: '#FECDD3',
    phraseTintGreen: '#BBF7D0',
    phraseTintBlue: '#BFDBFE',
    phraseTintRed: '#FECACA',
    phraseTintOrange: '#FED7AA',
    ink: '#111111',
    inkSoft: '#555555',
    line: '#DDDDDD',
    paper: '#FFFFFF',
    paper2: '#EEEEEE',
    yellowBg: '#FEF3C7',
  } as unknown as BiblePalette;

  const host = 'He will not scold them. This is how God deals with His own. We are the children of God.';
  const run = 'This is how God deals with His own.';
  const runStart = host.indexOf(run);
  const kidsStart = host.indexOf('children of God');

  function seatedHtml() {
    return renderToString(
      <SeatedBlockView
        block={{ kind: 'para', text: host }}
        palette={renderPalette}
        selection={{
          highlights: [
            // The claimed run's own wash — it must NOT paint in
            // the prose (the box takes the seat)…
            { start: runStart, end: runStart + run.length, tint: 'green' },
            // …while a second wash elsewhere in the block paints.
            { start: kidsStart, end: kidsStart + 'children of God'.length, tint: 'yellow' },
          ],
          onApplyTint: () => {},
          onBubble: () => {},
          onNote: () => {},
        }}
        seats={[
          {
            block: { kind: 'highlight', text: run },
            // The box's own addressed wash still paints inside it.
            selection: {
              highlights: [{ start: 0, end: 4, tint: 'green' }],
              onApplyTint: () => {},
              onBubble: () => {},
              onNote: () => {},
            },
            start: runStart,
            end: runStart + run.length,
          },
        ]}
      />,
    );
  }

  it('orders before-prose, box, after-prose — the run’s words exactly once', () => {
    const html = seatedHtml();
    // (The box's own wash splits 'This' into its own span, so the
    // ordering anchors on the run's unbroken tail.)
    const before = html.indexOf('He will not scold them.');
    const boxAt = html.indexOf('God deals with His own.');
    const after = html.indexOf('We are the');
    expect(before).toBeGreaterThanOrEqual(0);
    expect(boxAt).toBeGreaterThan(before);
    expect(after).toBeGreaterThan(boxAt);
    expect(html.split('God deals with His own.').length - 1).toBe(1);
    // The box wears its card dress (the Highlight tag rides along).
    expect(html).toContain('Highlight');
  });

  it('the second wash paints in the prose; the claimed run’s wash does not double-paint', () => {
    const html = seatedHtml();
    // #FDE68A (yellow) wraps 'children of God' in the after-piece.
    expect(html).toContain('rgba(253,230,138');
    // #BBF7D0 (green) appears exactly once — inside the box, on
    // its own wash ('This'). Had the claimed run's wash painted
    // in the prose too, green would dress the whole run as well.
    expect(html.split('rgba(187,247,208').length - 1).toBe(1);
  });

  it('an unprovable seat falls back: prose whole, the box as its card', () => {
    const html = renderToString(
      <SeatedBlockView
        block={{ kind: 'para', text: host }}
        palette={renderPalette}
        seats={[
          {
            block: { kind: 'highlight', text: run },
            start: runStart,
            end: host.length + 10,
          },
        ]}
      />,
    );
    // The paragraph renders entire (the run’s words are IN it)
    // and the box still renders below as its card — the words
    // appear twice, prose + card, exactly the pre-v418 unseated
    // behavior. A box must never vanish.
    expect(html).toContain('He will not scold them.');
    expect(html.split(run).length - 1).toBe(2);
    expect(html).toContain('Highlight');
  });
});
