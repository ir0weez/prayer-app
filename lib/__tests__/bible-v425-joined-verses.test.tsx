// ─── v425: joined verses — the reader renders his SETS ──────────────────────
// Jonathan's order (Nov 3): "I want them to be together based on
// my notes. I put the verses together and wrote notes for those
// sets of verses." The fidelity investigation behind it: his
// verse sets already arrive intact (the pack carries the group
// spans; convertStudioChapter turns each into one entry; note
// spans agree with the desk across all 509 chapters) — the split
// into one block per verse was purely the renderer's v352 design,
// and the v357 per-verse chevron duplication rode on it.
//
// v425 joins at the BLOCK level only: the entry head's verses
// render in ONE row+wrap flow container (entryVerses), each verse
// still its own NativeSelectableText element — per-verse phrase
// offsets, tints and selection are addressed per verse and are
// NOT touched — wrapping at verse seams. The fold chevron is ONE
// per entry, at the head's tail (styles.chevSlot). The verse
// seat (v356) keeps its pair order inside the flow and takes a
// full-width flex basis, so the composer splits the passage
// immediately after the tapped verse's element. Bare chapters
// (no sets) never reach this head — buildReadOnlySections and
// Stories are untouched, pinned below.
//
// The render rig is v403's (SSR first paint, react-native-web);
// the fixture chapter is Isaiah 14 — embedded verse text plus a
// real three-verse noted set (entry 3–5), the Genesis 1 §3–5
// shape.
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
import { buildDisplaySections, buildReadOnlySections, getChapterData } from '../bible-v205/index';
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
const expandIcons = (html: string) =>
  (html.match(/icon:expand-(more|less)/g) ?? []).length;

describe('v425 — a multi-verse set renders as one passage with one chevron', () => {
  it('Isaiah 14 carries a real three-verse noted set (entry 3–5) in the display data', () => {
    const data = getChapterData('Isaiah', 14);
    expect(data).not.toBeNull();
    const verses = embeddedVerses('Isaiah', 14);
    expect(verses).not.toBeNull();
    const sections = buildDisplaySections(data, verses!.length);
    const entries = sections.flatMap((s) => s.entries);
    const set = entries.find((e) => e.start === 3 && e.end === 5);
    expect(set, 'entry 3–5 exists').toBeTruthy();
    expect(set!.blocks.length).toBeGreaterThan(0);
  });

  it('verses 3, 4 and 5 flow in order with no chevron between them — one chevron follows the set', () => {
    const verses = embeddedVerses('Isaiah', 14)!;
    const text = (v: number) => verses.find((x) => x.verse === v)!.text;
    const html = renderChapter('Isaiah', 14);
    const i3 = html.indexOf(text(3));
    const i4 = html.indexOf(text(4));
    const i5 = html.indexOf(text(5));
    const i6 = html.indexOf(text(6));
    expect(i3, 'verse 3 renders').toBeGreaterThan(-1);
    expect(i4, 'verse 4 renders after verse 3').toBeGreaterThan(i3);
    expect(i5, 'verse 5 renders after verse 4').toBeGreaterThan(i4);
    expect(i6, 'verse 6 renders after the set').toBeGreaterThan(i5);
    // The joined passage: NOTHING folds between the set's verses.
    const inSet = html.slice(i3, i5 + text(5).length);
    expect(expandIcons(inSet), 'no chevron inside the set').toBe(0);
    // The entry's one chevron stands after the set's last verse,
    // before the next entry's first verse.
    const after = html.slice(i5 + text(5).length, i6);
    expect(expandIcons(after), 'exactly one chevron for the entry').toBe(1);
  });

  it('every entry head in the chapter carries exactly one chevron slot', () => {
    const html = renderChapter('Isaiah', 14);
    // The head's heart slot (width 20) and the chevron slot
    // (width 25) are one-per-entry markers in the SSR tree.
    const hearts = count(html, 'r-width-19wmn03');
    const chevs = count(html, 'r-width-q1j0wu');
    expect(hearts).toBeGreaterThan(0);
    expect(chevs).toBe(hearts);
  });

  it('the head source: one flow container, per-verse elements, one toggle door', () => {
    expect(page).toContain(
      "entryVerses: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', columnGap: 5 }",
    );
    expect(page).not.toContain('entryVerses: { flex: 1, gap: 12 }');
    expect(page).toContain('verseBlock: { flexShrink: 1 }');
    // The join is at block level: the verses are NOT merged into
    // one string — each renders through its own selectable text.
    const map = sliceBetween(entryView, 'const verseBlock = (', 'const seat =');
    expect(map).toContain('<NativeSelectableText');
    expect(entryView).toContain('props.verseText.get(v)');
    expect(map).not.toContain('toggleOpen');
    // Exactly one toggle Pressable stands in the entry — the
    // head-tail chevron in its slot, after the verse map.
    expect(entryView.match(/<Pressable onPress=\{\(\) => actions\.toggleOpen\(entry\)\}/g)).toHaveLength(1);
    expect(entryView.indexOf('styles.chevSlot')).toBeGreaterThan(
      entryView.indexOf('return [verseBlock, seat];'),
    );
  });
});

describe('v425 — the verse seat splits the flowed passage at the tapped verse', () => {
  it('the seat keeps its pair order and takes a full-width basis inside the flow', () => {
    // The map still returns [verseBlock, seat] per verse — in a
    // row+wrap container, document order IS flow order, so the
    // seat lands immediately after the tapped verse's element,
    // before the next verse flows on.
    expect(entryView).toContain('return [verseBlock, seat];');
    expect(entryView).toContain('composerVerse === v ? (');
    expect(entryView).toContain('style={styles.verseSeatFlow}');
    expect(page).toContain(
      "verseSeatFlow: { flexBasis: '100%', flexShrink: 0 }",
    );
    // The Oct 30 substance is untouched: the box seats only under
    // the tapped verse; the body seat stands only while no verse
    // holds the cluster.
    expect(entryView).toContain('{composerVerse === null ? renderMarkCluster() : null}');
    expect(entryView).toContain('key={`verse-composer-${v}`}');
  });
});

describe('v425 — per-verse phrase highlights still resolve inside the joined passage', () => {
  it('the head hands each verse ONLY its own stored ranges', () => {
    // v427 amendment: the filter is unchanged in substance — the
    // source list is the merged one (this entry's ranges plus a
    // folded passage's lead-span ranges), still handed per verse;
    // and a selection write routes to the entry owning the verse
    // (the host entry itself for every verse of an unfolded entry).
    expect(entryView).toContain('highlights={mergedHighlights.filter((h) => h.verse === v)}');
    expect(entryView).toContain('actions.phraseTint(leadForVerse(v) ?? entry, v, range, tint)');
  });

  it('a stored phrase tint on Isaiah 14:5 paints exactly its words', () => {
    const verses = embeddedVerses('Isaiah', 14)!;
    const v5 = verses.find((x) => x.verse === 5)!.text;
    const phrase = 'broken the staff';
    const start = v5.indexOf(phrase);
    expect(start).toBeGreaterThan(-1);
    const palette = buildBiblePalette(getThemedPalette('light', 'default' as any) as any);
    const highlight = { verse: 5, start, end: start + phrase.length, tint: 'yellow' as const };
    // The resolution seam the head renders through.
    const segs = buildTintSegments(v5, [highlight], palette);
    const painted = segs.filter((s) => s.backgroundColor);
    expect(painted).toHaveLength(1);
    expect(painted[0].text).toBe(phrase);
    expect(painted[0].backgroundColor).toBe(phraseTintFor(palette, 'yellow'));
    // And the painted span reaches the rendered surface.
    const html = renderToString(
      React.createElement(NativeSelectableText, {
        text: v5,
        palette,
        highlights: [highlight],
        lead: { text: '5 ' },
      }),
    ).replace(/<!-- -->/g, '');
    const at = html.indexOf(phrase);
    expect(at, 'the tinted phrase renders').toBeGreaterThan(-1);
    const before = html.slice(Math.max(0, at - 400), at);
    const paints = [...before.matchAll(/background-color:rgba\((\d+),(\d+),(\d+),([\d.]+)\)/g)];
    expect(paints.length, 'a tint wash precedes the phrase').toBeGreaterThan(0);
    const [r, g, b, a] = paints[paints.length - 1].slice(1).map(Number);
    const want = phraseTintFor(palette, 'yellow')!;
    const wm = /rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)/.exec(want)!;
    expect([r, g, b]).toEqual([Number(wm[1]), Number(wm[2]), Number(wm[3])]);
    expect(a).toBeCloseTo(Number(wm[4] ?? 1), 2);
  });
});

describe('v425 — single-verse entries and bare chapters are unchanged', () => {
  it('a single-verse entry renders its verse with its one chevron after it', () => {
    const data = getChapterData('Isaiah', 14)!;
    const verses = embeddedVerses('Isaiah', 14)!;
    const entries = buildDisplaySections(data, verses.length).flatMap((s) => s.entries);
    const single = entries.find((e) => e.start === e.end && e.blocks.length > 0);
    expect(single, 'a noted single-verse entry exists').toBeTruthy();
    const text = (v: number) => verses.find((x) => x.verse === v)!.text;
    const html = renderChapter('Isaiah', 14);
    const at = html.indexOf(text(single!.start));
    expect(at).toBeGreaterThan(-1);
    const next = entries[entries.indexOf(single!) + 1];
    const until = next ? html.indexOf(text(next.start), at + 1) : html.length;
    const between = html.slice(at + text(single!.start).length, until);
    expect(expandIcons(between), 'one chevron, no more, before the next entry').toBe(1);
    // No special-casing: the head never branches on a span of one.
    expect(entryView).not.toContain('entry.start === entry.end');
    expect(entryView).not.toContain('entry.end - entry.start === 0');
  });

  it('a bare chapter (John 1) still chunks for Stories and grows no entry heads', () => {
    expect(getChapterData('John', 1)).toBeNull();
    const sections = buildReadOnlySections(null, 51);
    const entries = sections.flatMap((s) => s.entries);
    expect(entries.length).toBeGreaterThan(1);
    for (const e of entries) expect(e.end - e.start + 1).toBeLessThanOrEqual(3);
    expect(entries[0].start).toBe(1);
    expect(entries[entries.length - 1].end).toBe(51);
    const html = renderChapter('John', 1, true);
    expect(expandIcons(html), 'no entry chevrons on the bare surface').toBe(0);
    expect(count(html, 'r-width-q1j0wu'), 'no chevron slots').toBe(0);
  });
});
