// ─── v419: the box dresses — pins ────────────────────────────────────
// Approved Nov 2: the v3 Material box set (box-material-concepts-v3 —
// "Yes that's it"), shipped at the desk as Commentary Studio pass
// -61; this build is the phone half. One Material dress per box
// kind, values in lib/bible-v205/box-dresses.ts.
//
// Pins:
//  - dress selection per kind + category — including the wire kind
//    'thought' → Main Thought, and the quote distinction: a para
//    carrying the quote CATEGORY wears the Quote dress, while a
//    kind-'quote' Someone said entry gets NO dress (its callout is
//    settled) even when it also carries the category;
//  - the Definition term rule (the Studio's, identical): a short
//    term before an em/en dash is styled INSIDE the paragraph —
//    a sentence-length first clause is not a term, no dash is no
//    term, and the term's length is measured in stripped
//    coordinates (the marks contract);
//  - the light values match the approved set and the dark values
//    match the Studio's night set;
//  - the dresses render through BlockView (standalone), and a box
//    seated by v418's SeatedBlockView wears its dress too.

import React from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: async (k: string) => {
      store.delete(k);
    },
    getAllKeys: async () => [...store.keys()],
    multiGet: async (ks: string[]) => ks.map((k) => [k, store.get(k) ?? null]),
  },
}));

vi.mock('react-native', async () => {
  const rnw = await import('react-native-web');
  return {
    ...rnw,
    Platform: { OS: 'android', select: (o: any) => o.android ?? o.default },
  };
});

vi.mock('@expo/vector-icons/MaterialIcons', async () => {
  const React = await import('react');
  const { Text } = await import('react-native-web');
  return {
    default: (props: any) =>
      React.createElement(Text, { style: { color: props.color, fontSize: props.size } }, `icon:${props.name}`),
  };
});

// The palette module imports use-colors; the hook itself is never
// called here (fixture palettes are literals), but its module chain
// must not load (the standing mock shape).
vi.mock('@/hooks/use-colors', async () => {
  const { getThemedPalette } = await import('@/lib/color-themes');
  return { useColors: () => getThemedPalette('light', 'default' as any) };
});

import { BlockView, SeatedBlockView } from '@/components/bible-v205/blocks';
import { buildTintSegments } from '@/components/bible-v205/native-selectable-text';
import type { BiblePalette } from '@/components/bible-v205/palette';
import { boxDressColors, boxDressFor, definitionTerm } from '@/lib/bible-v205/box-dresses';
import type { V205Block } from '@/lib/bible-v205/types';

/** Fixture palettes: only the fields the dresses and their text
 * paths read (isDark, paper2, line, the phrase tints, ink). */
const lightPalette = {
  isDark: false,
  ink: '#241735',
  inkSoft: '#6B5F86',
  line: '#E5DEF2',
  paper: '#F7F3FC',
  paper2: '#FFFFFF',
  yellowBg: '#FFF3BF',
  yellowBorder: '#EBD489',
  phraseTintYellow: '#FDE68A',
  phraseTintRose: '#FECDD3',
  phraseTintGreen: '#BBF7D0',
  phraseTintBlue: '#BFDBFE',
  phraseTintRed: '#FECACA',
  phraseTintOrange: '#FED7AA',
  selWash: 'rgba(124,58,237,.25)',
  selHandle: '#7C3AED',
} as unknown as BiblePalette;

const darkPalette = {
  ...lightPalette,
  isDark: true,
  ink: '#F3EDE2',
  inkSoft: '#B8AC97',
  line: '#3B342A',
  paper: '#171310',
  paper2: '#262019',
} as unknown as BiblePalette;

/** A hex color as react-native-web serializes it in a style. */
function hexToRgbaCss(hex: string): string {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},1.00)`;
}

function renderBlock(block: V205Block, palette: BiblePalette = lightPalette, extra: object = {}): string {
  return renderToString(React.createElement(BlockView, { block, palette, ...extra })).replace(/<!-- -->/g, '');
}

/** The words a render shows, tags stripped — the word-for-word check. */
function visibleText(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

const noTouchSelection = {
  highlights: [],
  onApplyTint: () => {},
  onBubble: () => {},
  onNote: () => {},
};

describe('v419 — dress selection per kind + category', () => {
  it('the five dresses land on their blocks', () => {
    expect(boxDressFor({ kind: 'highlight', text: 'x' })).toBe('highlight');
    expect(boxDressFor({ kind: 'thought', text: 'x' })).toBe('main-thought');
    expect(boxDressFor({ kind: 'para', text: 'x', category: 'definition' })).toBe('definition');
    expect(boxDressFor({ kind: 'note', text: 'x', category: 'definition' })).toBe('definition');
    expect(boxDressFor({ kind: 'para', text: 'x', category: 'quote' })).toBe('quote');
    expect(boxDressFor({ kind: 'para', text: 'x', category: 'personal-story' })).toBe('personal-story');
    // The legacy conversation category (untyped legacy packs only —
    // the type no longer admits it) reads as personal-story.
    expect(boxDressFor({ kind: 'conversation', text: 'x', category: 'conversation' } as unknown as V205Block)).toBe('personal-story');
    // A good-thought paragraph is the yellow class — the Highlight dress.
    expect(boxDressFor({ kind: 'para', text: 'x', category: 'good-thought' })).toBe('highlight');
  });

  it("kind 'quote' (Someone said) gets NO dress — the category dress is a different thing", () => {
    expect(boxDressFor({ kind: 'quote', text: 'x', authorName: 'Cody' })).toBeNull();
    expect(boxDressFor({ kind: 'quote', text: 'x', category: 'quote' })).toBeNull();
  });

  it('plain prose and scripture get no dress', () => {
    expect(boxDressFor({ kind: 'para', text: 'x' })).toBeNull();
    expect(boxDressFor({ kind: 'note', text: 'x' })).toBeNull();
    expect(boxDressFor({ kind: 'conversation', text: 'x' })).toBeNull();
    expect(boxDressFor({ kind: 'scripture', text: 'x' })).toBeNull();
  });
});

describe('v419 — the Definition term rule', () => {
  it('a short term before an em dash splits out, the rest intact', () => {
    const split = definitionTerm('Advocate — one who pleads the cause of another.');
    expect(split).not.toBeNull();
    expect(split!.term).toBe('Advocate');
    expect(split!.dash).toBe(' — ');
    expect(split!.rest).toBe('one who pleads the cause of another.');
    expect(split!.termStrippedLength).toBe(8);
  });

  it('an en dash works too', () => {
    const split = definitionTerm('Goel – the nearest relative, the kinsman-redeemer.');
    expect(split!.term).toBe('Goel');
    expect(split!.rest).toBe('the nearest relative, the kinsman-redeemer.');
  });

  it('a sentence-length first clause is prose, not a term', () => {
    expect(
      definitionTerm('The Spirit himself maketh intercession for us — with groanings which cannot be uttered.'),
    ).toBeNull();
    // Sentence punctuation in the first clause also disqualifies it.
    expect(definitionTerm('He came. He saw — the whole of it.')).toBeNull();
  });

  it('no dash → no term; a dash with nothing after it → no term', () => {
    expect(definitionTerm('A plain definition with no dash at all.')).toBeNull();
    expect(definitionTerm('Word — ')).toBeNull();
    expect(definitionTerm('Word —')).toBeNull();
  });

  it('the term length is measured in STRIPPED coordinates (his fmt markers)', () => {
    const split = definitionTerm('**Advocate** — one who pleads.');
    expect(split!.term).toBe('**Advocate**');
    expect(split!.termStrippedLength).toBe(8);
  });

  it('the term range sweeps as its own selectable span', () => {
    const segs = buildTintSegments('Advocate — one who pleads.', [], lightPalette, undefined, { start: 0, end: 8 });
    expect(segs[0]).toMatchObject({ text: 'Advocate', term: true });
    expect(segs.slice(1).every((s) => !s.term)).toBe(true);
    expect(segs.map((s) => s.text).join('')).toBe('Advocate — one who pleads.');
  });
});

describe('v419 — the approved values, light and dark', () => {
  it('light values match the approved set', () => {
    expect(boxDressColors('highlight', false)).toMatchObject({
      container: '#F9E79A', ink: '#5C4A08', pillBg: '#8A6D1F', pillInk: '#FFFFFF', fold: '#EDD374',
    });
    expect(boxDressColors('main-thought', false)).toMatchObject({
      container: '#FBDDB4', ink: '#6E3B08', pillBg: '#A85B12', pillInk: '#FFFFFF',
    });
    expect(boxDressColors('definition', false)).toMatchObject({
      container: '#F8F1E5', ink: '#2F4E79', pillBg: '#4E7396', pillInk: '#FFFFFF', term: '#2F4E79', divider: '#D8C7B2',
    });
    expect(boxDressColors('quote', false)).toMatchObject({
      container: '#F8DBD8', ink: '#6E2318', mark: '#B33A26',
    });
    expect(boxDressColors('personal-story', false)).toMatchObject({
      container: '#FFFFFF', ink: '#33512E', pillBg: '#55804F', pillInk: '#FFFFFF', outline: '#55804F',
    });
  });

  it("dark values match the Studio's night set", () => {
    expect(boxDressColors('highlight', true)).toMatchObject({
      container: '#4D3D0E', ink: '#F7E7B4', pillBg: '#EFD06B', pillInk: '#4D3D0E', fold: '#6B5410',
    });
    expect(boxDressColors('main-thought', true)).toMatchObject({
      container: '#472A0E', ink: '#F5E3CC', pillBg: '#F0B26B', pillInk: '#472A0E',
    });
    expect(boxDressColors('definition', true)).toMatchObject({
      container: '#242C36', ink: '#C7D9EE', pillBg: '#4E7396', term: '#DCE9F7',
    });
    expect(boxDressColors('quote', true)).toMatchObject({
      container: '#402722', ink: '#F3D9D5', mark: '#E88A7A',
    });
    expect(boxDressColors('personal-story', true)).toMatchObject({
      ink: '#CDE3C8', pillBg: '#55804F', outline: '#55804F',
    });
  });
});

describe('v419 — the dresses render through BlockView', () => {
  it('Highlight: the gold card, the fold, the pill', () => {
    const html = renderBlock({ kind: 'highlight', text: 'A keeper line.' });
    expect(html).toContain(hexToRgbaCss('#F9E79A'));
    expect(html).toContain(hexToRgbaCss('#EDD374')); // the fold triangle
    expect(html).toContain(hexToRgbaCss('#8A6D1F')); // the pill
    expect(html).toContain('Highlight');
    expect(html).toContain('A keeper line.');
  });

  it('Main Thought (wire kind thought): the serif headline card', () => {
    const html = renderBlock({ kind: 'thought', text: 'The thought that leads.' });
    expect(html).toContain(hexToRgbaCss('#FBDDB4'));
    expect(html).toContain('Main Thought');
    expect(html).toContain('The thought that leads.');
  });

  it('Definition: pill, hairline, and the term styled INSIDE the paragraph', () => {
    const block: V205Block = { kind: 'para', text: 'Advocate — one who pleads the cause of another.', category: 'definition' };
    const html = renderBlock(block);
    expect(html).toContain(hexToRgbaCss('#F8F1E5'));
    expect(html).toContain(hexToRgbaCss('#D8C7B2')); // the hairline
    expect(html).toContain('Definition');
    // The term span wears its own size (16.5px) — the pill is 10px,
    // the body 15px, so 16.5px in this render is the term alone.
    expect(html).toContain('16.5px');
    // And the words stay word-for-word where they were written.
    expect(visibleText(html)).toContain('Advocate — one who pleads the cause of another.');
  });

  it('Definition: the term styles on the selectable path too, words unmoved', () => {
    const block: V205Block = { kind: 'para', text: 'Advocate — one who pleads the cause of another.', category: 'definition' };
    const html = renderBlock(block, lightPalette, { selection: noTouchSelection });
    expect(html).toContain('16.5px');
    expect(visibleText(html)).toContain('Advocate — one who pleads the cause of another.');
  });

  it('Definition: no styled term when the block is not the first paragraph', () => {
    const block: V205Block = { kind: 'para', text: 'Advocate — one who pleads the cause of another.', category: 'definition' };
    const html = renderBlock(block, lightPalette, { firstPara: false });
    expect(html).not.toContain('16.5px');
    expect(visibleText(html)).toContain('Advocate — one who pleads the cause of another.');
  });

  it('Definition: a sentence-length opener gets no styled term', () => {
    const block: V205Block = {
      kind: 'para',
      text: 'The Spirit himself maketh intercession for us — with groanings which cannot be uttered.',
      category: 'definition',
    };
    const html = renderBlock(block);
    expect(html).not.toContain('16.5px');
    expect(visibleText(html)).toContain('The Spirit himself maketh intercession for us');
  });

  it('Quote category: the rose dress, the big mark, the byline under the body', () => {
    const html = renderBlock({ kind: 'para', text: 'Grace upon grace.', category: 'quote', authorName: 'Vernon McGee' });
    expect(html).toContain(hexToRgbaCss('#F8DBD8'));
    expect(html).toContain(hexToRgbaCss('#B33A26')); // the mark
    expect(html).toContain('“');
    expect(html).toContain('— Vernon McGee');
    // No pill and no legacy callout tag in this dress.
    expect(html).not.toContain('Quote — Vernon McGee');
    expect(html).not.toContain(hexToRgbaCss('#FBE7E7'));
  });

  it("kind 'quote' keeps its settled callout — NOT the category dress", () => {
    const html = renderBlock({ kind: 'quote', text: 'Grace upon grace.', authorName: 'Vernon McGee' });
    expect(html).toContain('Quote — Vernon McGee');
    expect(html).toContain(hexToRgbaCss('#FBE7E7')); // the settled family ground
    expect(html).not.toContain(hexToRgbaCss('#F8DBD8'));
  });

  it('Personal Story: the outlined white card, the disc, the pill', () => {
    const html = renderBlock({ kind: 'para', text: 'When I was a boy...', category: 'personal-story' });
    expect(html).toContain(hexToRgbaCss('#55804F')); // outline + disc + pill
    expect(html).toContain('Personal Story');
    expect(visibleText(html)).toContain('J');
    expect(html).toContain('When I was a boy...');
  });

  it('a good-thought paragraph wears the Highlight dress under its own label', () => {
    const html = renderBlock({ kind: 'para', text: 'A speaking line.', category: 'good-thought' });
    expect(html).toContain(hexToRgbaCss('#F9E79A'));
    expect(html).toContain('Good thought');
  });

  it('dark mode: the dresses take the night values', () => {
    const hl = renderBlock({ kind: 'highlight', text: 'A keeper line.' }, darkPalette);
    expect(hl).toContain(hexToRgbaCss('#4D3D0E'));
    expect(hl).toContain(hexToRgbaCss('#EFD06B')); // the night pill
    expect(hl).toContain(hexToRgbaCss('#6B5410')); // the night fold

    const def = renderBlock(
      { kind: 'para', text: 'Advocate — one who pleads.', category: 'definition' },
      darkPalette,
    );
    expect(def).toContain(hexToRgbaCss('#242C36'));
    expect(def).toContain(hexToRgbaCss('#DCE9F7')); // the night term

    const story = renderBlock({ kind: 'para', text: 'When I was a boy...', category: 'personal-story' }, darkPalette);
    // The dark surface is the app's own (the fixture's paper2).
    expect(story).toContain(hexToRgbaCss('#262019'));
    expect(story).toContain(hexToRgbaCss('#CDE3C8')); // the night body ink
    expect(story).toContain(hexToRgbaCss('#55804F')); // the outline holds

    const thought = renderBlock({ kind: 'thought', text: 'The thought that leads.' }, darkPalette);
    expect(thought).toContain(hexToRgbaCss('#472A0E'));

    const quote = renderBlock({ kind: 'para', text: 'Grace upon grace.', category: 'quote' }, darkPalette);
    expect(quote).toContain(hexToRgbaCss('#402722'));
    expect(quote).toContain(hexToRgbaCss('#E88A7A')); // the night mark
  });
});

describe('v419 — the type dress (source pins)', () => {
  // Top-level Text styles serialize to hashed classes under
  // react-native-web, so the type values pin at the source — the
  // suite's standing pattern for component dress.
  const src = readFileSync(join(__dirname, '..', '..', 'components/bible-v205/blocks.tsx'), 'utf8');

  it('Main Thought is a 19px serif headline; Highlight text is 16px semibold', () => {
    expect(src).toContain("mtText: { fontFamily: 'serif', fontSize: 19, lineHeight: 27.5 }");
    expect(src).toContain("hlText: { fontSize: 16, lineHeight: 24, fontWeight: '600' }");
  });

  it('Quote body is italic serif 16.5px under a 36px serif mark; the term is the small-caps effect', () => {
    expect(src).toContain("qText: { fontFamily: 'serif', fontStyle: 'italic', fontSize: 16.5, lineHeight: 24.75 }");
    expect(src).toContain('fontSize: 36');
    expect(src).toContain("fontWeight: '800',\n    fontSize: 16.5,\n    letterSpacing: 0.4,\n    textTransform: 'uppercase'");
  });

  it('the pill is the set’s label: 10px, 800, letterspaced, uppercase, full radius', () => {
    expect(src).toContain("boxPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.3, textTransform: 'uppercase' }");
    expect(src).toContain('borderRadius: 999');
  });

  it('no hard offset shadow enters with the dresses', () => {
    const dresses = src.slice(src.indexOf('v419: the box dresses'), src.indexOf('/** One content block'));
    expect(dresses).not.toContain('shadow');
    expect(dresses).not.toContain('elevation');
  });
});

describe('v419 — a seated box wears its dress', () => {
  const host = 'He will not scold them. This is how God deals with His own. We are the children of God.';
  const run = 'This is how God deals with His own.';
  const runStart = host.indexOf(run);

  it('the seated Highlight renders in the v419 gold dress, its words exactly once', () => {
    const html = renderToString(
      React.createElement(SeatedBlockView, {
        block: { kind: 'para', text: host } as V205Block,
        palette: lightPalette,
        selection: {
          highlights: [{ start: runStart, end: runStart + run.length, tint: 'green' }],
          onApplyTint: () => {},
          onBubble: () => {},
          onNote: () => {},
        },
        seats: [
          {
            block: { kind: 'highlight', text: run } as V205Block,
            selection: noTouchSelection,
            start: runStart,
            end: runStart + run.length,
          },
        ],
      }),
    ).replace(/<!-- -->/g, '');
    expect(html).toContain(hexToRgbaCss('#F9E79A')); // the dress, seated
    expect(html).toContain(hexToRgbaCss('#EDD374')); // and its fold
    expect(html).toContain('Highlight');
    expect(html.split('God deals with His own.').length - 1).toBe(1);
  });
});
