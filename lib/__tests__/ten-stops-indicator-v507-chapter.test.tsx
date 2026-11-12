// ─── v507 — Ten Stops indicator: the chapter page ───────────────────────────
// The picked blend (2026-11-11) seated in the real reader
// (components/bible-v205/chapter-page.tsx), against his REAL
// bundled Hebrews data — the alignment the design counts on is
// in his notes themselves: Hebrews 9's section "Power in the
// Blood" spans exactly 15–22 with entries 15–15 / 16–17 / 18–22;
// Hebrews 10's "Hold Fast to Jesus" section carries his own
// entry 23–23, the single-verse stop, mid-chapter.
//
// Pinned:
//  - the route strip stands at the top of every chapter of a
//    toured book, its captions naming where the reader is;
//  - the margin marker: the disc (with the STOP number) and the
//    head on the stop passage's first row, a rail on every row
//    the passage touches — three rows in Hebrews 9, exactly one
//    (verse 23's own entry) in Hebrews 10;
//  - a chapter with no stop: the strip stands, no disc, no rail,
//    no here-caption;
//  - an untoured book: no strip, no disc, no rail — the page
//    renders exactly as before (Genesis held this case in v507;
//    v508 registered its tour, so Genesis 1 now pins the
//    toured-book/no-stop-chapter case at the foot of this file).
//
// The render rig is v427's (SSR first paint, react-native-web),
// unchanged.
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
    usePathname: () => '/bible-chapter',
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

const renderChapter = (book: string, chapter: number) => {
  rig.skin = 'classic';
  rig.accent = 'default';
  rig.scheme = 'light';
  return renderToString(
    React.createElement(ChapterPageView, {
      book,
      chapter,
      onBack: () => {},
      onOpenBook: () => {},
      onOpenQueue: () => {},
      onNavigateChapter: () => {},
    }),
  ).replace(/<!-- -->/g, '');
};

const count = (html: string, needle: string) => html.split(needle).length - 1;

// ─── Hebrews 9 — Stop 6, Power In the Blood (15–22) ─────────────────────────

describe('v507 chapter — Hebrews 9', () => {
  const html = renderChapter('Hebrews', 9);

  it('the route strip stands at the top of the chapter, naming where the reader is', () => {
    expect(html).toContain('ten-stops-route-strip');
    expect(html).toContain('5 stops behind you');
    expect(html).toContain('STOP 6 · 9:15–22');
    for (let s = 1; s <= 10; s++) expect(html).toContain(`ten-stop-route-dot-${s}`);
  });

  it('the margin marker: Stop 6’s disc and head on the passage, named in his words', () => {
    expect(html).toContain('ten-stop-disc-6');
    expect(html).toContain('Stop 6 · Power In the Blood');
  });

  it('the rail runs on exactly the three rows his section spans (15–15, 16–17, 18–22)', () => {
    expect(count(html, 'ten-stop-rail-6')).toBe(3);
  });
});

// ─── Hebrews 10 — Stop 7, the single verse 23, mid-chapter ──────────────────

describe('v507 chapter — Hebrews 10', () => {
  const html = renderChapter('Hebrews', 10);

  it('the route names Stop 7 at 10:23, six stops behind', () => {
    expect(html).toContain('STOP 7 · 10:23');
    expect(html).toContain('6 stops behind you');
  });

  it('the marker seats on verse 23’s own entry alone — one disc, one rail row', () => {
    expect(html).toContain('ten-stop-disc-7');
    expect(html).toContain('Stop 7 · Hold Fast to Jesus');
    expect(count(html, 'ten-stop-rail-7')).toBe(1);
  });
});

// ─── Hebrews 6 — Stop 4 at the chapter head ─────────────────────────────────

describe('v507 chapter — Hebrews 6', () => {
  const html = renderChapter('Hebrews', 6);

  it('the disc and head stand at the chapter’s first passage', () => {
    expect(html).toContain('ten-stop-disc-4');
    expect(html).toContain('Stop 4 · Growing In Faith');
    expect(html).toContain('STOP 4 · 6:1–8');
    expect(html).toContain('3 stops behind you');
    // His section 1–8 renders as entries 1–1, 2–2, 3–3, 4–8: four rail rows.
    expect(count(html, 'ten-stop-rail-4')).toBe(4);
  });
});

// ─── Hebrews 7 — a chapter with no stop ─────────────────────────────────────

describe('v507 chapter — Hebrews 7 (no stop)', () => {
  const html = renderChapter('Hebrews', 7);

  it('the strip stands (four stops behind), but no disc, no rail, no here-caption', () => {
    expect(html).toContain('ten-stops-route-strip');
    expect(html).toContain('4 stops behind you');
    expect(html).not.toContain('ten-stop-route-here');
    expect(html).not.toContain('ten-stop-disc-');
    expect(html).not.toContain('ten-stop-rail-');
  });
});

// ─── Genesis 1 — a toured book's chapter with no stop ───────────────────────

describe('v507 chapter — Genesis 1 (tour registered in v508; no stop in ch. 1)', () => {
  // v508 RE-BASE (2026-11-11): this block pinned Genesis as an
  // untoured book in v507. Genesis has a tour now, so chapter 1
  // behaves exactly as Hebrews 7 does — the strip stands with
  // every stop ahead, but no disc, no rail, no here-caption.
  // (The unregistered-book case lives at the model level in
  // ten-stops-indicator-v507.test.ts, on 1 Samuel since v516.)
  const html = renderChapter('Genesis', 1);

  it('the strip stands (no stops behind), but no disc, no rail, no here-caption', () => {
    expect(html).toContain('ten-stops-route-strip');
    expect(html).toContain('0 stops behind you');
    for (let s = 1; s <= 10; s++) expect(html).toContain(`ten-stop-route-dot-${s}`);
    expect(html).not.toContain('ten-stop-route-here');
    expect(html).not.toContain('ten-stop-disc-');
    expect(html).not.toContain('ten-stop-rail-');
  });
});
