// ─── v311 "The Bible, to the Drawing" — pins ─────────────────────────
// Approved: bible-pages-expressive-v7.html — his "Also better. Let's
// do it." (2026-10-28 12:42), carrying his note-layout rulings of the
// same day (11:52: main note text gets NO box, the four typed kinds
// sit in their Studio colours between stretches of it; 12:35: the
// note flow takes the full verse-column width).
//
// Pins:
//  - the v311 palette tokens DERIVE (prog container pair, primary
//    container): progInk clears 4.5:1 on progBg for every seed ×
//    appearance tried, and the steps order paper → primCont →
//    progBg → primary in light;
//  - the grid's TWO CHANNELS: cellDressFor gives every writing
//    status a distinct dress, and the four (status × read)
//    combinations the model can present are four distinct
//    (dress, bookmark) pairs — complete+read, complete+unread,
//    read+unwritten, neither;
//  - the sheet's read Switch round-trips state.reads through the
//    same rewards door the reader uses (source pin + the pure
//    round trip beneath it);
//  - the note flow: blocks render IN SEQUENCE with the right kinds
//    in the right family colours, and the main text — para, note,
//    Main Thought, and his faced note line — renders with NO box
//    (no background at all), the v250 filled card retired.

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
// called here (the fixture palette is built from the derivations),
// but its module chain must not load (v250's standing mock shape).
vi.mock('@/hooks/use-colors', async () => {
  const { getThemedPalette } = await import('@/lib/color-themes');
  return { useColors: () => getThemedPalette('light', 'default' as any) };
});

import { hexContrast, hexLuminance } from '@/lib/skin-themes';
import { deriveBibleAccents, deriveBibleMaterial } from '@/lib/bible-v205/palette-accents';
import { cellDressFor, sheetChipDress, type BiblePalette } from '@/components/bible-v205/palette';
import { BlockView, SelfLineBlock } from '@/components/bible-v205/blocks';
import { CATEGORY_META } from '@/lib/bible-v205/categories';
import {
  chapterDisplayMarks,
  chapterReadDate,
  seedStudyState,
  setChapterRead,
  setChapterStatus,
} from '@/lib/bible-v205/study';
import { markChapterRead, unmarkChapterRead } from '@/lib/bible-v205/rewards';
import type { V205Block } from '@/lib/bible-v205/types';

/** A palette built the way useBiblePalette builds it (real
 * derivations, the meaning constants copied from palette.ts). */
function fixturePalette(primary = '#7C3AED', paper = '#F7F3FC'): BiblePalette {
  const accents = deriveBibleAccents(primary, paper);
  const material = deriveBibleMaterial(primary, paper);
  return {
    paper,
    paper2: '#FFFFFF',
    ink: '#241735',
    inkSoft: '#6B5F86',
    inkFaint: '#ABA69C',
    line: '#E5DEF2',
    lineDark: '#D9D5CC',
    ...accents,
    sections: material.sections,
    accentAmber: material.accentAmber,
    accentTeal: material.accentTeal,
    noteFill: material.noteFill,
    noteInk: material.noteInk,
    noteInkSoft: material.noteInkSoft,
    noteTagBg: material.noteTagBg,
    noteTagInk: material.noteTagInk,
    readPill: material.readPill,
    readPillInk: material.readPillInk,
    progBg: material.progBg,
    progInk: material.progInk,
    primCont: material.primCont,
    paperBg: '#F5ECD2',
    paperInk: '#7A5C14',
    xpGold: material.xpGold,
    xpGoldInk: material.xpGoldInk,
    flashTint: material.flashTint,
    flashTintClear: material.flashTintClear,
    noteDress: {},
    yellowBg: '#FFF3BF',
    yellowBorder: '#EBD489',
    yellowInk: '#5F4B0B',
    yellowLabel: '#96791A',
    hlMark: '#A67C00',
    greyBg: '#F1F1EF',
    greyBorder: '#E1E1DC',
    greyInk: '#45423C',
    greyLabel: '#7A766C',
    calloutPaper: '#F7F7F5',
    vnum: '#C6C1B6',
    heartOff: '#D8D3C8',
    tintYellow: 'rgba(245,197,66,.32)',
    tintRose: 'rgba(230,73,128,.22)',
    tintGreen: 'rgba(64,160,110,.27)',
    verseTintYellow: 'rgba(245,197,66,.45)',
    verseTintRose: 'rgba(230,73,128,.45)',
    verseTintGreen: 'rgba(64,160,110,.45)',
    isDark: false,
    cardDress: {},
    btnDress: {},
    sheetDress: {},
    screenDress: {},
    frameDress: {},
    h2Size: null,
  } as unknown as BiblePalette;
}

const palette = fixturePalette();

/** A hex color as react-native-web serializes it in a style. */
function hexToRgbaCss(hex: string): string {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},1.00)`;
}

describe('v311 — the new palette tokens derive from seed × appearance', () => {
  it('progInk clears 4.5:1 on progBg across seeds and appearances', () => {
    for (const seed of ['#7C3AED', '#F25C05', '#0E7C66', '#2855DB', '#C2255C']) {
      for (const paper of ['#FAF6EF', '#171310']) {
        const m = deriveBibleMaterial(seed, paper);
        expect(hexContrast(m.progInk, m.progBg), `${seed} on ${paper}`).toBeGreaterThanOrEqual(4.5);
        // The container is a real step off the page, in both appearances.
        expect(m.progBg).not.toBe(paper);
        expect(m.primCont).not.toBe(paper);
        expect(m.progBg).not.toBe(m.primCont);
      }
    }
  });

  it('in light, the steps order paper → primCont → progBg → primary', () => {
    const m = deriveBibleMaterial('#7C3AED', '#F7F3FC');
    const lum = (h: string) => hexLuminance(h);
    expect(lum('#F7F3FC')).toBeGreaterThan(lum(m.primCont));
    expect(lum(m.primCont)).toBeGreaterThan(lum(m.progBg));
    expect(lum(m.progBg)).toBeGreaterThan(lum('#7C3AED'));
  });
});

describe('v311 — the grid two channels: four combinations, four dresses', () => {
  it('every writing status dresses distinctly', () => {
    const dresses = (['complete', 'in-progress', 'write', 'restudy', 'not-started', 'none'] as const).map(
      (s) => cellDressFor(palette, s),
    );
    const keys = dresses.map((d) => `${d.backgroundColor}|${d.color}|${d.borderColor ?? ''}`);
    // not-started and none are ONE state by his ruling — they share
    // a dress on purpose; the other four are pairwise distinct.
    expect(keys[4]).toBe(keys[5]);
    expect(new Set(keys.slice(0, 4)).size).toBe(4);
    // in-progress wears the tonal seed container, never keeper yellow.
    expect(dresses[1].backgroundColor).toBe(palette.progBg);
    expect(dresses[1].backgroundColor).not.toBe(palette.yellowBg);
    // restudy wears the teal family.
    expect(dresses[3].backgroundColor).toBe(palette.accentTeal.bg);
  });

  it('the four (status × read) presentations are pairwise distinct', () => {
    const book = 'Genesis';
    const noted = true;
    let s = seedStudyState();
    // complete + read (a noted chapter, finished and read)
    s = setChapterStatus(s, book, 1, 'complete');
    s = setChapterRead(s, book, 1, '2026-10-27');
    // complete + unread
    s = setChapterStatus(s, book, 2, 'complete');
    // read + unwritten (in the write queue, already read)
    s = setChapterStatus(s, book, 3, 'write');
    s = setChapterRead(s, book, 3, '2026-10-27');
    // neither
    const present = (c: number) => {
      const d = chapterDisplayMarks(s, book, c, noted);
      const dress = cellDressFor(palette, d.status);
      return `${dress.backgroundColor}|${dress.color}|${d.displayRead ? 'bookmark' : 'plain'}`;
    };
    const combos = [present(1), present(2), present(3), present(4)];
    expect(new Set(combos).size).toBe(4);
    expect(present(1)).toContain('bookmark');
    expect(present(2)).toContain('plain');
    expect(present(3)).toContain('bookmark');
    expect(present(4)).toContain('plain');
  });

  it('the sheet chips: the current state deepens, Complete fills solid', () => {
    const rest = sheetChipDress(palette, 'complete', false);
    const current = sheetChipDress(palette, 'complete', true);
    expect(rest.backgroundColor).not.toBe(current.backgroundColor);
    expect(current.backgroundColor).toBe(palette.rasp);
    expect(current.color).toBe('#FFFFFF');
    const prog = sheetChipDress(palette, 'in-progress', false);
    expect(prog.backgroundColor).toBe(palette.progBg);
    expect(prog.color).toBe(palette.progInk);
    const teal = sheetChipDress(palette, 'restudy', true);
    expect(teal.borderColor).toBe(palette.accentTeal.deep);
  });
});

describe('v311 — the sheet read switch round-trips state.reads', () => {
  it('mark then unmark through the rewards door the sheet calls', async () => {
    const s0 = seedStudyState();
    expect(chapterReadDate(s0, 'Genesis', 5)).toBeNull();
    const marked = await markChapterRead(s0, 'Genesis', 5);
    expect(chapterReadDate(marked.state, 'Genesis', 5)).not.toBeNull();
    const cleared = await unmarkChapterRead(marked.state, 'Genesis', 5);
    expect(chapterReadDate(cleared, 'Genesis', 5)).toBeNull();
  });

  it('the sheet wires a real Switch to that door (source pin)', () => {
    const src = readFileSync(join(process.cwd(), 'app/bible-book.tsx'), 'utf8');
    expect(src).toContain('<Switch');
    expect(src).toContain('value={!!selReadDate}');
    expect(src).toContain('v ? applyRead() : clearRead()');
    // One ReStudy control in the sheet: the chip. No queue button.
    expect(src).not.toContain('Add to ReStudy Queue');
    // No explanatory captions ride the sheet.
    expect(src).not.toContain('Notes state — the notes-written mark');
    expect(src).not.toContain('it changes only when you change it');
  });
});

describe('v311 — the note flow: kinds boxed in sequence, main text bare', () => {
  const blocks: V205Block[] = [
    { kind: 'para', text: 'AAA main text first.' },
    { kind: 'highlight', text: 'BBB a keeper line.' },
    { kind: 'note', text: 'CCC his own note.' },
    { kind: 'para', text: 'DDD a definition box.', category: 'definition' },
    { kind: 'thought', text: 'EEE the main thought.' },
    { kind: 'quote', text: 'FFF quoted words.', authorName: 'Vernon McGee' },
    { kind: 'para', text: 'GGG a personal story.', category: 'personal-story' },
  ];
  const html = renderToString(
    React.createElement(
      React.Fragment,
      null,
      blocks.map((b, i) => React.createElement(BlockView, { key: i, block: b, palette })),
    ),
  ).replace(/<!-- -->/g, '');

  it('renders the blocks in their own sequence', () => {
    const at = ['AAA', 'BBB', 'CCC', 'DDD', 'EEE', 'FFF', 'GGG'].map((m) => html.indexOf(m));
    for (const i of at) expect(i).toBeGreaterThan(-1);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('the four typed kinds wear their family colours with their tags', () => {
    expect(html).toContain(hexToRgbaCss(palette.yellowBg)); // Highlight
    expect(html).toContain('Highlight');
    expect(html).toContain(hexToRgbaCss(CATEGORY_META.definition.bg));
    expect(html).toContain('Definition');
    expect(html).toContain(hexToRgbaCss(CATEGORY_META.quote.bg));
    expect(html).toContain('Quote — Vernon McGee');
    expect(html).toContain(hexToRgbaCss(CATEGORY_META['personal-story'].bg));
    expect(html).toContain('Personal story');
  });

  it('the main text carries NO box — para, note and Main Thought render bare', () => {
    for (const block of [
      { kind: 'para', text: 'bare para' } as V205Block,
      { kind: 'note', text: 'bare note' } as V205Block,
      { kind: 'thought', text: 'bare thought' } as V205Block,
    ]) {
      const one = renderToString(React.createElement(BlockView, { block, palette }));
      expect(one, block.kind).not.toContain('background-color');
      expect(one).toContain(block.text);
    }
    // The grey Main Thought callout is retired with the filled card.
    const thought = renderToString(React.createElement(BlockView, { block: blocks[4], palette }));
    expect(thought).not.toContain(hexToRgbaCss(palette.greyBg));
  });

  it('his faced note line: attribution head over bare text, no filled card', () => {
    const html2 = renderToString(
      React.createElement(SelfLineBlock, {
        kind: 'note',
        text: 'A note in the flow.',
        palette,
        authorName: 'Jonathan Roberts',
        face: React.createElement('span', null, 'face'),
        spanText: 'on v. 11',
      }),
    );
    expect(html2).toContain('Jonathan Roberts');
    expect(html2).toContain('on v. 11');
    expect(html2).toContain('A note in the flow.');
    // The v250 filled seed card does not come back: no noteFill paint.
    expect(html2).not.toContain(hexToRgbaCss(palette.noteFill));
    expect(html2).not.toContain('NOTE');
  });

  it('his faced Highlight keeps the yellow box, head inside', () => {
    const html3 = renderToString(
      React.createElement(SelfLineBlock, {
        kind: 'highlight',
        text: 'A keeper in the flow.',
        palette,
        authorName: 'Jonathan Roberts',
        face: React.createElement('span', null, 'face'),
        spanText: 'on v. 4',
      }),
    );
    expect(html3).toContain(hexToRgbaCss(palette.yellowBg));
    expect(html3).toContain('Jonathan Roberts');
    expect(html3).toContain('A keeper in the flow.');
  });
});
