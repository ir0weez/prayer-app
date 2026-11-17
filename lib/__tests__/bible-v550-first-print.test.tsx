// ─── v550: a verse prints once per chapter — first print wins ─────────────
// Jonathan's screenshot (2026-11-17): 1 Corinthians 2 showed verse
// 10 twice — at the end of "Eyes To See" (§6–10) and again opening
// "The Depths of God" (§10–16). His sections overlap there, and the
// reader printed every section's full range. The audit that
// followed found the overlap is a pattern in his writing, not a
// one-off: seven chapters carry it, in three shapes —
//   seam:    the next section starts on the verse the last ended
//            (1 Cor 2:10, 1 Kings 3:4, 1 Kings 16:4)
//   restart: a section re-covers an earlier section's ground
//            (1 Kings 2 §1–12 over §1–9, vv1–9)
//   nested:  a section sits inside an earlier section's range
//            (Acts 13 §44–45/§46–49 inside §13–52's fill vv44–49;
//             2 Kings 24 §10–17 inside §8–19, vv10–19;
//             Psalms 19 §12–14 over §7–13's trailing fill, vv12–13)
// His ruling: "All 7 chapters" — the general rule. A verse's TEXT
// prints at most once per chapter, at its first rendered
// occurrence, following his sections in the order they render
// today (never reordered). suppressRepeatedVersePrints stamps
// each folded row with printFrom — the first verse of its passage
// not already printed — and EntryView prints from there. NOTHING
// else moves: his sections, titles, written ranges and heading
// labels, fold arrows, note anchoring and EVERY note block stand
// exactly as written. The later copies are often his REVISED
// wording (1 Kings 16:4's second copy is the expanded one), so
// only verse text is ever suppressed, never a note — pinned below
// by the block sequence surviving byte-identical in all seven
// chapters. Verse identity (kept hearts, highlights, tap targets)
// stays anchored to the first print, where it already resolved.
// Display-only: Stories and the PDF never call the pass.
//
// The render rig is v403/v425/v427's (SSR first paint,
// react-native-web); the model pins run the page's exact pipeline
// (buildDisplaySections → '#' split → fold → first-print pass)
// over the built-in data with each chapter's KJV verse count.
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const rig = vi.hoisted(() => ({
  scheme: 'light' as 'light' | 'dark',
  accent: 'default' as string,
  skin: 'classic' as string,
}));
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

vi.mock('react-native-svg', async () => {
  const React = await import('react');
  const { View } = await import('react-native-web');
  const Stub = (props: any) => React.createElement(View, props, props?.children);
  return {
    __esModule: true,
    default: Stub,
    Circle: Stub,
    ClipPath: Stub,
    Defs: Stub,
    G: Stub,
    LinearGradient: Stub,
    Path: Stub,
    Rect: Stub,
    Stop: Stub,
  };
});

vi.mock('react-native-reanimated', async () => {
  const React = await import('react');
  const { View, Text, ScrollView } = await import('react-native-web');
  const AV = (props: any) => React.createElement(View, props, props?.children);
  const AT = (props: any) => React.createElement(Text, props, props?.children);
  const AS = (props: any) => React.createElement(ScrollView, props, props?.children);
  return {
    __esModule: true,
    default: { View: AV, Text: AT, ScrollView: AS, createAnimatedComponent: (c: any) => c },
    View: AV,
    Text: AT,
    ScrollView: AS,
    createAnimatedComponent: (c: any) => c,
    useSharedValue: (v: any) => ({ value: v }),
    makeMutable: (v: any) => ({ value: v }),
    useAnimatedStyle: (fn: any) => fn(),
    useAnimatedProps: (fn: any) => fn(),
    withTiming: (v: any) => v,
    withDelay: (_d: any, v: any) => v,
    withRepeat: (v: any) => v,
    withSpring: (v: any) => v,
    interpolate: (_v: any, _i: any, o: any) => o[0],
    Easing: {
      bezier: () => ({}),
      inOut: (f: any) => f,
      out: (f: any) => f,
      sin: {},
      steps: () => ({}),
      cubic: {},
      linear: {},
    },
    runOnJS: (f: any) => f,
  };
});

vi.mock('@/components/avatar-system', async () => {
  const React = await import('react');
  const { View } = await import('react-native-web');
  return { AvatarImage: (props: any) => React.createElement(View, props) };
});

vi.mock('expo-blur', async () => {
  const React = await import('react');
  const { View } = await import('react-native-web');
  return { BlurView: (props: any) => React.createElement(View, props, props?.children) };
});

vi.mock('expo-router', async () => {
  const React = await import('react');
  return {
    useRouter: () => ({ push: () => {}, back: () => {}, replace: () => {}, navigate: () => {}, setParams: () => {} }),
    usePathname: () => '/bible-chapters',
    useLocalSearchParams: () => ({}),
    useFocusEffect: (cb: any) => {
      React.useEffect(() => {
        const cleanup = cb();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, [cb]);
    },
  };
});

vi.mock('@/hooks/use-people-material', () => ({
  usePeopleMaterial: () => ({
    card: '#FFFFFF', deep: '#4C1D95', inkSoft: '#6B6285', seed: '#7C3AED',
    tealDeep: '#0F766E', wash: '#EFE9FC', wash2: '#E3D9FA', ink: '#2A2140',
  }),
  usePeopleFrontDoor: () => ({
    card: '#FFFFFF', deep: '#4C1D95', inkSoft: '#6B6285', seed: '#7C3AED',
    tealDeep: '#0F766E', wash: '#EFE9FC', wash2: '#E3D9FA', ink: '#2A2140',
    washSub: '#6B6285', queueTeal: '#0F766E', navGround: '#FFFFFF',
    navInk: '#6B6285', navActiveInk: '#4C1D95', navInd: '#E3D9FA',
    navTick: '#7C3AED', shadow: '#2A2140',
  }),
}));

vi.mock('expo-haptics', () => ({
  impactAsync: async () => {},
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 0, left: 0 }),
}));

vi.mock('@expo/vector-icons/MaterialIcons', async () => {
  const React = await import('react');
  const { Text } = await import('react-native-web');
  return {
    default: (props: any) =>
      React.createElement(Text, { style: { color: props.color, fontSize: props.size } }, `icon:${props.name}`),
  };
});

const effScheme = () => (rig.skin === 'terminal' ? 'dark' : rig.scheme);

vi.mock('@/hooks/use-colors', async () => {
  const { getThemedPalette } = await import('../color-themes');
  return { useColors: () => getThemedPalette(effScheme(), rig.accent as any) };
});

vi.mock('@/hooks/use-skin', async () => {
  const { getThemedPalette } = await import('../color-themes');
  const { getSkinTokens } = await import('../skin-themes');
  return {
    useSkin: () => {
      const scheme = effScheme();
      const colors = getThemedPalette(scheme, rig.accent as any);
      const tokens = getSkinTokens(rig.skin as any, scheme, colors as any);
      return {
        skin: rig.skin,
        isPaper: tokens.isPaper,
        isEightBit: tokens.isEightBit,
        isTerminal: tokens.isTerminal,
        isSkinned: tokens.isPaper || tokens.isEightBit || tokens.isTerminal,
        monoFont: undefined,
        tokens,
        motion: {
          slide: { duration: tokens.motion.slideDuration, easing: {} },
          settle: { duration: tokens.motion.settleDuration, easing: {} },
          settleDistance: tokens.motion.settleDistance,
        },
      };
    },
  };
});

import { ChapterPageView } from '../../components/bible-v205/chapter-page';
import {
  buildDisplaySections,
  buildReadOnlySections,
  foldLeadInEntries,
  getChapterData,
  splitSectionsByHashNotes,
  suppressRepeatedVersePrints,
  type DisplaySection,
  type FoldedDisplayEntry,
  type PrintFoldedEntry,
} from '../bible-v205/index';
import type { V205ChapterData } from '../bible-v205/types';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const page = readFileSync(join(process.cwd(), 'components/bible-v205/chapter-page.tsx'), 'utf8');
const entryView = page.slice(page.indexOf('function EntryView'), page.indexOf('const styles = StyleSheet.create'));

const chapterEl = (book: string, chapter: number, stories = false) =>
  React.createElement(ChapterPageView, {
    book,
    chapter,
    initialStories: stories,
    onBack: () => {},
    onOpenBook: () => {},
    onOpenQueue: () => {},
    onNavigateChapter: () => {},
  });

const renderChapter = (book: string, chapter: number, stories = false) => {
  rig.skin = 'classic';
  rig.accent = 'default';
  rig.scheme = 'light';
  return renderToString(chapterEl(book, chapter, stories)).replace(/<!-- -->/g, '');
};

const count = (html: string, needle: string) => html.split(needle).length - 1;

// ─── The page's exact pipeline, minus the marks (empty here: the
// '#' split is marks-driven, so with no stored lines the split is
// the identity and the rows below are the reader's own). ──────────
type FoldedSections = { section: DisplaySection; folded: FoldedDisplayEntry[] }[];
const foldedFor = (book: string, chapter: number, verseCount: number): FoldedSections => {
  const raw = buildDisplaySections(getChapterData(book, chapter), verseCount);
  const split = splitSectionsByHashNotes(raw, {}, book, chapter);
  return split.sections.map((section) => ({ section, folded: foldLeadInEntries(section.entries) }));
};

const spanStart = (r: FoldedDisplayEntry) =>
  r.leads.length ? Math.min(r.entry.start, ...r.leads.map((l) => l.start)) : r.entry.start;

/** Every verse a set of rows prints, in render order (a row prints
 * printFrom..entry.end after the pass, its full span before it). */
const printedVerses = (rows: { folded: (FoldedDisplayEntry & { printFrom?: number })[] }[]): number[] =>
  rows.flatMap(({ folded }) =>
    folded.flatMap((r) => {
      const from = r.printFrom ?? spanStart(r);
      const out: number[] = [];
      for (let v = from; v <= r.entry.end; v++) out.push(v);
      return out;
    }),
  );

const blockTexts = (rows: FoldedSections | { section: DisplaySection; folded: PrintFoldedEntry[] }[]) =>
  rows.flatMap(({ folded }) =>
    folded.flatMap((r) => r.entry.blocks.map((b) => (b as { text?: string }).text ?? b.kind)),
  );

/** The seven chapters his ruling names: book, chapter, the
 * chapter's KJV verse count, the verses that printed twice before
 * the pass, and the printed-verse totals before → after. */
const SEVEN: {
  book: string;
  chapter: number;
  verseCount: number;
  dup: number[];
  before: number;
  after: number;
}[] = [
  { book: '1 Corinthians', chapter: 2, verseCount: 16, dup: [10], before: 17, after: 16 },
  { book: '1 Kings', chapter: 3, verseCount: 28, dup: [4], before: 29, after: 28 },
  { book: '1 Kings', chapter: 16, verseCount: 34, dup: [4], before: 35, after: 34 },
  {
    book: '1 Kings',
    chapter: 2,
    verseCount: 46,
    dup: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    before: 55,
    after: 46,
  },
  {
    book: 'Acts',
    chapter: 13,
    verseCount: 52,
    dup: [44, 45, 46, 47, 48, 49],
    before: 58,
    after: 52,
  },
  {
    book: '2 Kings',
    chapter: 24,
    verseCount: 20,
    dup: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    before: 30,
    after: 20,
  },
  { book: 'Psalms', chapter: 19, verseCount: 14, dup: [12, 13], before: 16, after: 14 },
];

describe('v550 — the seven chapters: every verse prints exactly once', () => {
  for (const c of SEVEN) {
    it(`${c.book} ${c.chapter}: ${c.before} prints → ${c.after}, dup [${c.dup}] → none, no verse lost`, () => {
      const folded = foldedFor(c.book, c.chapter, c.verseCount);
      const before = printedVerses(folded);
      expect(before).toHaveLength(c.before);
      const dupBefore = [...new Set(before.filter((v, i) => before.indexOf(v) !== i))].sort(
        (a, b) => a - b,
      );
      expect(dupBefore).toEqual(c.dup);

      const after = suppressRepeatedVersePrints(folded);
      const printed = printedVerses(after);
      expect(printed).toHaveLength(c.after);
      // Exactly the chapter's verses, each once, still in verse
      // order — first print wins and nothing is reordered.
      expect(printed).toEqual(Array.from({ length: c.verseCount }, (_, i) => i + 1));
    });

    it(`${c.book} ${c.chapter}: every note block survives, in the same order`, () => {
      const folded = foldedFor(c.book, c.chapter, c.verseCount);
      const after = suppressRepeatedVersePrints(folded);
      expect(blockTexts(after)).toEqual(blockTexts(folded));
      // Same rows, same sections, same entry objects — the pass
      // re-creates nothing; it only stamps printFrom.
      expect(after.map((s) => s.section)).toEqual(folded.map((s) => s.section));
      for (let i = 0; i < after.length; i++) {
        expect(after[i].folded).toHaveLength(folded[i].folded.length);
        for (let j = 0; j < after[i].folded.length; j++) {
          expect(after[i].folded[j].entry).toBe(folded[i].folded[j].entry);
          expect(after[i].folded[j].leads).toBe(folded[i].folded[j].leads);
        }
      }
    });
  }
});

describe('v550 — the seams, row by row', () => {
  it('1 Cor 2: "The Depths of God" (§10–16) opens at verse 11 — its heading and notes untouched', () => {
    const after = suppressRepeatedVersePrints(foldedFor('1 Corinthians', 2, 16));
    const depths = after.find((s) => s.section.start === 10 && s.section.end === 16)!;
    // The heading's data is his written range — the band still
    // reads "Ver. 10–16"; only the verse TEXT starts one later.
    expect(depths.section.title).toBe('The Depths of God');
    expect(depths.section.start).toBe(10);
    expect(depths.section.end).toBe(16);
    const first = depths.folded[0];
    expect(first.entry.start).toBe(10);
    expect(first.entry.end).toBe(10);
    expect(first.printFrom).toBe(11); // end + 1: the whole passage already printed
    expect(first.entry.blocks).toHaveLength(5); // his note on v10 stands whole
    expect(depths.folded[1].printFrom).toBe(11); // verse 11's own row prints from itself
    // And "Eyes To See" (§6–10) keeps the first print of verse 10.
    const eyes = after.find((s) => s.section.start === 6 && s.section.end === 10)!;
    const last = eyes.folded[eyes.folded.length - 1];
    expect(last.entry.start).toBe(10);
    expect(last.printFrom).toBe(10);
  });

  it('1 Kings 2: §1–12 re-covered rows print no verses; vv10–12 print as themselves', () => {
    const after = suppressRepeatedVersePrints(foldedFor('1 Kings', 2, 46));
    const second = after.filter((s) => s.section.start === 1)[1];
    expect(second.section.end).toBe(12);
    expect(second.folded.map((r) => `${spanStart(r)}-${r.entry.end}→${r.printFrom}`)).toEqual([
      '1-4→5',
      '5-6→7',
      '7-7→8',
      '8-9→10',
      '10-10→10',
      '11-11→11',
      '12-12→12',
    ]);
    // The suppressed rows still carry his second copy of the notes.
    for (const r of second.folded.slice(0, 4)) expect(r.entry.blocks.length).toBeGreaterThan(0);
  });

  it('Acts 13: the nested sections keep their notes; their verses stand in §13–52', () => {
    const after = suppressRepeatedVersePrints(foldedFor('Acts', 13, 52));
    const opposition = after.find((s) => s.section.start === 44)!;
    expect(opposition.folded).toHaveLength(1);
    expect(opposition.folded[0].printFrom).toBe(46); // 44–45 already printed
    expect(opposition.folded[0].entry.blocks).toHaveLength(3);
    const gentiles = after.find((s) => s.section.start === 46)!;
    expect(gentiles.folded.map((r) => r.printFrom)).toEqual([48, 50]);
    expect(gentiles.folded[0].entry.blocks).toHaveLength(3);
  });

  it('2 Kings 24: §18–20 prints only verse 20 — vv18–19 stand in §8–19', () => {
    const after = suppressRepeatedVersePrints(foldedFor('2 Kings', 24, 20));
    const zedekiah = after.find((s) => s.section.start === 18)!;
    expect(zedekiah.folded.map((r) => `${spanStart(r)}-${r.entry.end}→${r.printFrom}`)).toEqual([
      '18-19→20',
      '20-20→20',
    ]);
  });

  it('Psalms 19: "Am I The Problem?" (§12–14) prints only verse 14 as verse text', () => {
    const after = suppressRepeatedVersePrints(foldedFor('Psalms', 19, 14));
    const last = after[after.length - 1];
    expect(last.section.start).toBe(12);
    expect(last.folded.map((r) => r.printFrom)).toEqual([13, 14, 14]);
    // Its notes on vv12–13 — the heaviest in the chapter — stand.
    expect(last.folded[0].entry.blocks.length).toBeGreaterThan(0);
    expect(last.folded[1].entry.blocks.length).toBeGreaterThan(0);
  });
});

describe('v550 — divergent copies are never suppressed (the 1 Kings 16 protection)', () => {
  const para = (text: string) => ({ kind: 'para' as const, text });
  const fixture = (sections: V205ChapterData['sections']): V205ChapterData => ({
    chapter: 1,
    intro: [],
    previously: [],
    outline: [],
    sections,
    stories: [],
  });

  it('a shared verse whose second copy is his REVISED wording: both texts stand verbatim', () => {
    const data = fixture([
      {
        start: 1,
        end: 4,
        title: 'First Section',
        entries: [{ start: 4, end: 4, blocks: [para('There is no room for compassion in politics.')] }],
      },
      {
        start: 4,
        end: 7,
        title: 'Second Section',
        entries: [
          {
            start: 4,
            end: 4,
            blocks: [para('There is no room for compassion in politics. That is why the Lord did not send a political leader.')],
          },
        ],
      },
    ]);
    const raw = buildDisplaySections(data, 7);
    const folded = raw.map((section) => ({ section, folded: foldLeadInEntries(section.entries) }));
    const after = suppressRepeatedVersePrints(folded);
    const second = after[1].folded[0];
    expect(second.printFrom).toBe(5); // verse 4's TEXT suppressed here…
    // …but the revised note is the row's own blocks, untouched.
    expect(second.entry.blocks).toEqual([
      para('There is no room for compassion in politics. That is why the Lord did not send a political leader.'),
    ]);
    expect(after[0].folded[after[0].folded.length - 1].entry.blocks).toEqual([
      para('There is no room for compassion in politics.'),
    ]);
  });

  it('1 Kings 16 real data: both §4 copies keep their own blocks', () => {
    const folded = foldedFor('1 Kings', 16, 34);
    const after = suppressRepeatedVersePrints(folded);
    const beforeRows = folded.flatMap((s) => s.folded).filter((r) => r.entry.start === 4 && r.entry.end === 4);
    const afterRows = after.flatMap((s) => s.folded).filter((r) => r.entry.start === 4 && r.entry.end === 4);
    expect(beforeRows).toHaveLength(2);
    expect(afterRows.map((r) => r.entry.blocks)).toEqual(beforeRows.map((r) => r.entry.blocks));
    expect(afterRows.map((r) => r.printFrom)).toEqual([4, 5]);
  });
});

describe('v550 — chapters without overlaps are untouched', () => {
  it('Genesis 4: every row prints from its own first verse; entries and leads are the same objects', () => {
    const folded = foldedFor('Genesis', 4, 26);
    const after = suppressRepeatedVersePrints(folded);
    for (let i = 0; i < after.length; i++) {
      for (let j = 0; j < after[i].folded.length; j++) {
        expect(after[i].folded[j].printFrom).toBe(spanStart(folded[i].folded[j]));
        expect(after[i].folded[j].entry).toBe(folded[i].folded[j].entry);
        expect(after[i].folded[j].leads).toBe(folded[i].folded[j].leads);
      }
    }
    expect(printedVerses(after)).toEqual(printedVerses(folded));
  });

  it('read-only sections tile the chapter, so the pass stamps every row at its own start', () => {
    const ro = buildReadOnlySections(getChapterData('1 Corinthians', 2), 16);
    const folded = ro.map((section) => ({ section, folded: foldLeadInEntries(section.entries) }));
    const after = suppressRepeatedVersePrints(folded);
    for (const s of after) for (const r of s.folded) expect(r.printFrom).toBe(r.entry.start);
    expect(printedVerses(after)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
  });
});

describe('v550 — render: 1 Corinthians 2', () => {
  it('verse 10 prints once; BOTH copies of his note on it still render', () => {
    const html = renderChapter('1 Corinthians', 2);
    // The verse's own words — in no block of this chapter, so the
    // count is purely the verse prints. Before the pass: 2.
    expect(count(html, 'searcheth all things'), 'verse 10 text prints once').toBe(1);
    // His note on v10 exists in both sections' copies and BOTH
    // stand — suppression never touches a note.
    expect(
      count(html, 'In an entire lifetime, we still will not fully comprehend it all.'),
      'both copies of the v10 note render',
    ).toBe(2);
    // Both section bands stand, with his written ranges.
    expect(html).toContain('Eyes To See');
    expect(html).toContain('The Depths of God');
  });

  it('every row keeps its head and its fold chevron — the suppressed row included (14 rows)', () => {
    const html = renderChapter('1 Corinthians', 2);
    // The head's heart slot (width 20) and chevron slot (width 25)
    // are one-per-EntryView markers in the SSR tree (the v425 rig).
    expect(count(html, 'r-width-19wmn03')).toBe(14);
    expect(count(html, 'r-width-q1j0wu')).toBe(14);
  });

  it('the wiring: the pass feeds the render; EntryView prints from the stamp', () => {
    expect(page).toContain('suppressRepeatedVersePrints(');
    expect(page).toContain('foldLeadInEntries(section.entries)');
    expect(page).toContain('printFrom={printFrom}');
    expect(entryView).toContain('const firstVerse = printStart;');
    // A composer homed on a verse this row no longer prints takes
    // the body seat — the seat can never strand on a missing verse.
    expect(entryView).toContain('setComposerVerse(verse >= printStart ? verse : null);');
  });
});
