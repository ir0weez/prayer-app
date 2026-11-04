// ─── v427: lead-in verses join the entry they lead into ────────────────────
// Jonathan's screenshot (Nov 4): Genesis 4 §6–7, "Cain Exhorted,
// Given Correction" — verse 6 rendered as its own block with its
// own chevron and Add-a-note row, verse 7 separately beneath it,
// though the two belong to one set. His notes are usually anchored
// at the LAST verse of the run they cover: §6–7's only entry is
// (7,7) carrying the note, and verse 6 has no entry at all. His
// Commentary Studio desk groups the entry-less verses leading into
// a noted entry INTO that entry (the desk's anchoring rule); the
// app instead filled the gap with a separate synthetic verse-only
// entry, and v425's join — which joins verses WITHIN an entry —
// had nothing to join.
//
// v427 marks exactly those synthetic in-section fills whose
// following real entry carries blocks (DisplayEntry.gapFill, set
// only when true, so every other entry's shape is byte-identical)
// and folds them into that entry's passage at render: one flowing
// passage (lead verses first), ONE fold chevron, the entry's note
// after its last verse, the note box still seating after whichever
// verse is tapped. NO real entry is re-spanned — entryKey stays
// byte-identical for every real entry, and the lead verses keep
// their own spans for tint/highlight resolution, selection writes,
// saved lines, seat requests, and kept hearts. Trailing fills and
// fills toward verse-only entries are never flagged. Read-only
// sections carry no flags; Stories and the PDF never call the fold.
//
// The render rig is v403/v425's (SSR first paint,
// react-native-web); the fixture chapter is Genesis 4 — built-in
// data (Genesis is not in his imported library pack), six lead-in
// gaps across its five sections.
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
import { NativeSelectableText, buildTintSegments } from '../../components/bible-v205/native-selectable-text';
import { buildBiblePalette, phraseTintFor } from '../../components/bible-v205/palette';
import { getThemedPalette } from '../color-themes';
import {
  buildDisplaySections,
  buildReadOnlySections,
  foldLeadInEntries,
  getChapterData,
  splitSectionsByHashNotes,
  type DisplayEntry,
} from '../bible-v205/index';
import { entryKey, type V205ChapterData } from '../bible-v205/types';
import { convertStudioChapter, type StudioChapterPayload } from '../bible-v205/studio-import';
import { emptyMarks, type MarksMap } from '../bible-v205/marks';
import { embeddedVerses } from '../bible-v205/verses';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const page = readFileSync(join(process.cwd(), 'components/bible-v205/chapter-page.tsx'), 'utf8');
const entryView = page.slice(page.indexOf('function EntryView'), page.indexOf('const styles = StyleSheet.create'));
const sliceBetween = (src: string, from: string, to: string) => src.slice(src.indexOf(from), src.indexOf(to));

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

const chapterFixture = (sections: V205ChapterData['sections']): V205ChapterData => ({
  chapter: 1,
  intro: [],
  previously: [],
  outline: [],
  sections,
  stories: [],
});
const para = (text: string) => ({ kind: 'para' as const, text });

describe('v427 — buildDisplaySections flags only the lead-in fills', () => {
  it('Genesis 4 §6–7: gap {6,6} is flagged; entry (7,7) keeps its shape and its key', () => {
    const sections = buildDisplaySections(getChapterData('Genesis', 4), 0);
    const sec = sections.find((s) => s.start === 6 && s.end === 7)!;
    expect(sec.entries).toHaveLength(2);
    const [gap, noted] = sec.entries;
    expect(gap).toMatchObject({ start: 6, end: 6, blocks: [], verseOnly: true, gapFill: true });
    expect(noted.start).toBe(7);
    expect(noted.end).toBe(7);
    expect(noted.blocks.length).toBeGreaterThan(0);
    expect('gapFill' in noted).toBe(false);
    // The noted entry's key is computed from 7–7 — never re-spanned
    // to 6–7. Marks, hearts, categories, bubbles and his own lines
    // all key on that string.
    expect(entryKey('Genesis', 4, noted.start, noted.end)).toBe('Genesis|4|7-7');
  });

  it('Genesis 4 §1–5: gap {3,4} is flagged toward (5,5); entries (1,1) and (2,2) are untouched', () => {
    const sections = buildDisplaySections(getChapterData('Genesis', 4), 0);
    const sec = sections.find((s) => s.start === 1 && s.end === 5)!;
    expect(sec.entries.map((e) => `${e.start}-${e.end}`)).toEqual(['1-1', '2-2', '3-4', '5-5']);
    const flagged: DisplayEntry[] = sec.entries.filter((e) => e.gapFill);
    expect(flagged.map((e) => `${e.start}-${e.end}`)).toEqual(['3-4']);
    for (const e of sec.entries) {
      if (e.blocks.length > 0) expect('gapFill' in e).toBe(false);
    }
  });

  it('Genesis 4 chapter-wide: exactly the six lead-ins are flagged, and every one is synthetic', () => {
    const sections = buildDisplaySections(getChapterData('Genesis', 4), 0);
    const all = sections.flatMap((s) => s.entries);
    expect(all).toHaveLength(20);
    const flagged = all.filter((e) => e.gapFill);
    expect(flagged.map((e) => `${e.start}-${e.end}`)).toEqual([
      '3-4',
      '6-6',
      '10-11',
      '13-14',
      '18-21',
      '23-23',
    ]);
    for (const f of flagged) {
      expect(f.blocks).toEqual([]);
      expect(f.verseOnly).toBe(true);
    }
    // No blocks-carrying (real) entry anywhere carries the flag.
    for (const e of all) {
      if (e.blocks.length > 0) expect('gapFill' in e).toBe(false);
    }
  });

  it('a chapter with no gaps (Isaiah 14) grows no flag on any entry', () => {
    const verses = embeddedVerses('Isaiah', 14)!;
    const all = buildDisplaySections(getChapterData('Isaiah', 14), verses.length).flatMap(
      (s) => s.entries,
    );
    expect(all.length).toBeGreaterThan(0);
    for (const e of all) expect('gapFill' in e).toBe(false);
  });

  it('read-only sections never carry the flag', () => {
    const ro = buildReadOnlySections(getChapterData('Genesis', 4), 26);
    expect(ro.flatMap((s) => s.entries).length).toBeGreaterThan(0);
    for (const e of ro.flatMap((s) => s.entries)) expect('gapFill' in e).toBe(false);
  });
});

describe('v427 — foldLeadInEntries joins each lead into its noted entry', () => {
  it('§6–7 folds to ONE row: entry (7,7) itself, with lead {6,6}', () => {
    const sections = buildDisplaySections(getChapterData('Genesis', 4), 0);
    const sec = sections.find((s) => s.start === 6 && s.end === 7)!;
    const rows = foldLeadInEntries(sec.entries);
    expect(rows).toHaveLength(1);
    // Identity, not a copy: the host is the very display entry, so
    // its span — and therefore its key — is untouched by the fold.
    expect(rows[0].entry).toBe(sec.entries[1]);
    expect(rows[0].leads).toEqual([sec.entries[0]]);
  });

  it('§1–5: (1,1) and (2,2) stand alone; {3,4} folds into (5,5)', () => {
    const sections = buildDisplaySections(getChapterData('Genesis', 4), 0);
    const sec = sections.find((s) => s.start === 1 && s.end === 5)!;
    const rows = foldLeadInEntries(sec.entries);
    expect(rows.map((r) => `${r.entry.start}-${r.entry.end}`)).toEqual(['1-1', '2-2', '5-5']);
    expect(rows[0].leads).toEqual([]);
    expect(rows[1].leads).toEqual([]);
    expect(rows[2].leads.map((l) => `${l.start}-${l.end}`)).toEqual(['3-4']);
  });

  it('the whole chapter folds 20 display entries into 14 rows, order preserved', () => {
    const sections = buildDisplaySections(getChapterData('Genesis', 4), 0);
    let rows = 0;
    for (const sec of sections) {
      const folded = foldLeadInEntries(sec.entries);
      rows += folded.length;
      // Flattening rows back (leads first, then their entry)
      // reproduces the display list exactly — nothing lost, nothing
      // reordered, nothing re-spanned.
      const back = folded.flatMap((r) => [...r.leads, r.entry]);
      expect(back).toEqual(sec.entries);
      for (const r of folded) expect('gapFill' in r.entry ? r.entry.gapFill : undefined).not.toBe(true);
    }
    expect(rows).toBe(14);
  });

  it('Isaiah 14 (no flags) folds to the identical list', () => {
    const verses = embeddedVerses('Isaiah', 14)!;
    const sections = buildDisplaySections(getChapterData('Isaiah', 14), verses.length);
    for (const sec of sections) {
      const rows = foldLeadInEntries(sec.entries);
      expect(rows.map((r) => r.entry)).toEqual(sec.entries);
      for (const r of rows) expect(r.leads).toEqual([]);
    }
  });
});

describe('v427 — fills that stay their own entries', () => {
  it('a trailing gap after the last entry is unflagged and stands alone', () => {
    const data = chapterFixture([
      { start: 1, end: 5, title: null, entries: [{ start: 1, end: 1, blocks: [para('A note.')] }] },
    ]);
    const [sec] = buildDisplaySections(data, 5);
    expect(sec.entries.map((e) => `${e.start}-${e.end}`)).toEqual(['1-1', '2-5']);
    expect('gapFill' in sec.entries[1]).toBe(false);
    const rows = foldLeadInEntries(sec.entries);
    expect(rows).toHaveLength(2);
    expect(rows[1].entry).toBe(sec.entries[1]);
    expect(rows[1].leads).toEqual([]);
  });

  it('a gap before a verse-only entry is unflagged — and does not fold into a later noted entry', () => {
    const data = chapterFixture([
      {
        start: 1,
        end: 6,
        title: null,
        entries: [
          { start: 3, end: 3, blocks: [] },
          { start: 6, end: 6, blocks: [para('A note.')] },
        ],
      },
    ]);
    const [sec] = buildDisplaySections(data, 6);
    expect(sec.entries.map((e) => `${e.start}-${e.end}`)).toEqual(['1-2', '3-3', '4-5', '6-6']);
    expect('gapFill' in sec.entries[0]).toBe(false);
    expect(sec.entries[2].gapFill).toBe(true);
    const rows = foldLeadInEntries(sec.entries);
    expect(rows.map((r) => `${r.entry.start}-${r.entry.end}`)).toEqual(['1-2', '3-3', '6-6']);
    expect(rows[0].leads).toEqual([]);
    expect(rows[1].leads).toEqual([]);
    expect(rows[2].leads.map((l) => `${l.start}-${l.end}`)).toEqual(['4-5']);
  });

  it("a '#' split on a flagged fill keeps the flag on every piece — the fold takes them all", () => {
    const data = chapterFixture([
      { start: 1, end: 9, title: null, entries: [{ start: 9, end: 9, blocks: [para('A note.')] }] },
    ]);
    const sections = buildDisplaySections(data, 9);
    expect(sections[0].entries.map((e) => `${e.start}-${e.end}`)).toEqual(['1-8', '9-9']);
    expect(sections[0].entries[0].gapFill).toBe(true);
    const marks: MarksMap = {
      'Test|1|1-8': { ...emptyMarks(), notes: ['#5 A line seated on the lead.'] },
    };
    const split = splitSectionsByHashNotes(sections, marks, 'Test', 1);
    const entries = split.sections[0].entries;
    const pieces = entries.filter((e) => e.end < 9);
    expect(pieces.length).toBeGreaterThan(1);
    for (const p of pieces) expect(p.gapFill).toBe(true);
    const rows = foldLeadInEntries(entries);
    expect(rows).toHaveLength(1);
    expect(rows[0].entry.start).toBe(9);
    expect(rows[0].leads).toEqual(pieces);
  });
});

describe('v427 — render: Genesis 4 §6–7 is ONE passage with ONE chevron', () => {
  it('between the §6–7 band and the next band: exactly one chevron, and the (7,7) note renders', () => {
    const html = renderChapter('Genesis', 4);
    // The chapter outline at the top lists the same titles first —
    // the section BANDS are the later occurrences.
    const from = html.lastIndexOf('Cain Exhorted, Given Correction');
    const to = html.lastIndexOf('The First Murder');
    expect(from, 'the §6–7 band renders').toBeGreaterThan(-1);
    expect(to, 'the next band renders').toBeGreaterThan(from);
    const slice = html.slice(from, to);
    // Counted by the EntryView chevron SLOT (the v425 rig's
    // marker): the section band carries a chevron of its own, but
    // before v427 this slice held TWO entry slots — (6,6) and
    // (7,7) rendering as separate blocks.
    expect(count(slice, 'r-width-q1j0wu'), 'one fold chevron for the combined passage').toBe(1);
    expect(slice).toContain('give up on Cain');
  });

  it('the whole chapter renders one head per folded row (14), not per display entry (20)', () => {
    const html = renderChapter('Genesis', 4);
    // The head's heart slot (width 20) and chevron slot (width 25)
    // are one-per-EntryView markers in the SSR tree (the v425 rig).
    expect(count(html, 'r-width-19wmn03')).toBe(14);
    expect(count(html, 'r-width-q1j0wu')).toBe(14);
  });

  it('the wiring: folded rows feed the render; Stories still read the unfolded sections', () => {
    expect(page).toContain('foldLeadInEntries(section.entries)');
    expect(page).toContain('lead={leadBundles.get(key)}');
    expect(page).toContain('folded.map(({ entry })');
    expect(entryView).toContain('actions.phraseTint(leadForVerse(v) ?? entry, v, range, tint)');
    expect(entryView).toContain('leadForVerse(composerVerse) ?? entry');
    expect(page).toContain('const storySections = storySplit.sections;');
    expect(page).toContain('splitSectionsByHashNotes(storyBase, marks, book, chapter)');
  });
});

describe('v427 — imported chapters ride the same grouping path', () => {
  const payload = (entries: { start: number; end: number }[]): StudioChapterPayload => ({
    book: 'Genesis',
    chapter: 4,
    opener: { kind: 'introduction', text: '' },
    sections: [{ start: 6, end: 7, title: 'Cain Exhorted, Given Correction', entries }],
    notes: [{ start: 7, end: 7, kind: 'note', blocks: [para('The note on seven.')] }],
  });

  it('a desk group span (6,7) arrives pre-joined: one noted entry, no fill, nothing to fold', () => {
    const data = convertStudioChapter(payload([{ start: 6, end: 7 }]), null);
    expect(data.sections[0].entries).toHaveLength(1);
    expect(data.sections[0].entries[0]).toMatchObject({ start: 6, end: 7 });
    expect(data.sections[0].entries[0].blocks.length).toBeGreaterThan(0);
    const disp = buildDisplaySections(data, 26);
    const sec = disp.find((s) => s.start === 6 && s.end === 7)!;
    for (const e of sec.entries) expect('gapFill' in e).toBe(false);
    const rows = foldLeadInEntries(sec.entries);
    expect(rows).toHaveLength(1);
    expect(rows[0].leads).toEqual([]);
  });

  it('an imported (7,7)-only entry leaves the same gap — flagged and folded identically', () => {
    const data = convertStudioChapter(payload([{ start: 7, end: 7 }]), null);
    const disp = buildDisplaySections(data, 26);
    // buildDisplaySections also wraps the lone imported section in
    // synthetic coverage sections (1–5 and 8–26, whole-range
    // verse-only entries) — those are not in-section lead-ins and
    // stay unflagged; the imported section itself behaves exactly
    // like the built-in one.
    for (const s of disp) {
      if (s.start === 6) continue;
      for (const e of s.entries) expect('gapFill' in e).toBe(false);
    }
    const sec = disp.find((s) => s.start === 6 && s.end === 7)!;
    expect(sec.entries.map((e) => `${e.start}-${e.end}`)).toEqual(['6-6', '7-7']);
    expect(sec.entries[0].gapFill).toBe(true);
    const rows = foldLeadInEntries(sec.entries);
    expect(rows).toHaveLength(1);
    expect(rows[0].entry.start).toBe(7);
    expect(rows[0].leads.map((l) => `${l.start}-${l.end}`)).toEqual(['6-6']);
  });
});
