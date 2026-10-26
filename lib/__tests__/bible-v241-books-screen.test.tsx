/**
 * v241 — the Books screen renders. Jonathan, Oct 24, 11:46 PM PDT:
 * tapping the Bible button landed on a blank page — uniform
 * rgb(242,242,242), which is EXACTLY @react-navigation/native's
 * DefaultTheme background: the navigator's empty-scene color, i.e.
 * the screen's own content was not on the glass. The diagnosis
 * (recorded in memory/2026-10-24.md): the palette, the grouping and
 * the first paint are provably healthy — this file is that proof,
 * kept as pins. The real screen mounts here under react-dom/server
 * over react-native-web (both already dependencies), hooks and
 * storage mocked to Jonathan's phone state: dark scheme, Classic
 * skin, seed study state (the first paint every install shows).
 *
 * What v241 changed, and what the pins below hold:
 *  - both RN Modals moved OUT of the ScrollView (this screen was the
 *    only Bible topbar screen nesting modals inside a scroll view);
 *  - all three Bible topbar screens wear BibleScreenBoundary, so a
 *    subtree render failure lands on a visible fallback in the Bible
 *    palette — with the error's name in small print — instead of the
 *    navigator's blank card;
 *  - the zero-books guard has its own file (bible-v241-books-guard).
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const rig = vi.hoisted(() => ({ scheme: 'dark' as 'dark' | 'light' }));
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


// v259: the shared tab bar (mounted by the Bible screens) uses reanimated.
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


// v259: the shared tab bar derives its Classic dress from the
// people-material hooks, which read the app theme context — these
// render rigs stub the family with plain values (the bar's own
// derivation is pinned in people-v259).
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

// v259: the shared tab bar (mounted by the Bible screens) imports expo-haptics.
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

vi.mock('@/hooks/use-colors', async () => {
  const { getThemedPalette } = await import('../color-themes');
  return { useColors: () => getThemedPalette(rig.scheme, 'default') };
});

vi.mock('@/hooks/use-skin', async () => {
  const { getThemedPalette } = await import('../color-themes');
  const { getSkinTokens } = await import('../skin-themes');
  return {
    useSkin: () => {
      const colors = getThemedPalette(rig.scheme, 'default');
      return {
        skin: 'classic',
        isPaper: false,
        isEightBit: false,
        isTerminal: false,
        isSkinned: false,
        monoFont: undefined,
        tokens: getSkinTokens('classic', rig.scheme, colors as any),
        motion: { slide: { duration: 0 }, settle: { duration: 0 }, settleDistance: 0 },
      };
    },
  };
});

vi.mock('@/components/paper-motion', async () => {
  const React = await import('react');
  return { PaperSettle: ({ children }: any) => React.createElement(React.Fragment, null, children) };
});
vi.mock('@/components/bit-motion', async () => {
  const React = await import('react');
  return { BitSettle: ({ children }: any) => React.createElement(React.Fragment, null, children) };
});

import BibleBooksScreen from '../../app/bible-chapters';
import { BibleScreenBoundary, BibleScreenFallback } from '../../components/bible-v205/screen-boundary';
import { CHAPTER_COUNTS } from '../bible-v205/index';
import { getThemedPalette, mix } from '../color-themes';
import { hexContrast } from '../skin-themes';

/**
 * v250 RE-BASE (his ruling, Oct 25 15:50): the Bible's ground is no
 * longer the palette background verbatim — palette.ts washes it
 * with a breath of the chosen color (mix 0.04 light / 0.05 dark,
 * the Material mockup's palest-seed page). The dark/light ground
 * pins below therefore compute the expected ground from the real
 * palette functions, exactly as useBiblePalette resolves it; the
 * v241 point of these tests — first paint present, ink ≥4.5:1 on
 * the ground it actually wears — is unchanged and still asserted
 * against the rendered values.
 */
function expectedGround(scheme: 'light' | 'dark'): string {
  const colors: any = getThemedPalette(scheme, 'default' as any);
  return mix(colors.background, colors.primary, scheme === 'dark' ? 0.05 : 0.04).toUpperCase();
}

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');

function rgbaToHex(m: RegExpMatchArray): string {
  const ch = (n: string) => Number(n).toString(16).padStart(2, '0');
  return `#${ch(m[1])}${ch(m[2])}${ch(m[3])}`.toUpperCase();
}

/** The root paper the rendered screen painted (first background). */
function renderedPaper(html: string): string {
  const m = html.match(/background-color:rgba\((\d+),(\d+),(\d+)/);
  expect(m, 'root background painted').toBeTruthy();
  return rgbaToHex(m!);
}

/** The text color a rendered string wears (nearest color before it). */
function renderedTextColor(html: string, needle: string): string {
  const i = html.indexOf(needle);
  expect(i, `"${needle}" present in render`).toBeGreaterThan(-1);
  const before = html.slice(Math.max(0, i - 600), i);
  const matches = [...before.matchAll(/color:rgba\((\d+),(\d+),(\d+)/g)];
  expect(matches.length, `a text color precedes "${needle}"`).toBeGreaterThan(0);
  return rgbaToHex(matches[matches.length - 1]);
}

describe('v241 — Books screen first paint, dark scheme + Classic (his phone state)', () => {
  rig.scheme = 'dark';
  const html = renderToString(React.createElement(BibleBooksScreen)).replace(/<!-- -->/g, '');

  it('paints the topbar: title, back affordance and the Study Queue pill', () => {
    expect(html).toContain('Bible');
    expect(html).toContain('Study Queue');
    expect(html).toContain('icon:arrow-back');
  });

  it('paints the header and legend', () => {
    expect(html).toContain('Your Books');
    expect(html).toContain('PrayerCircle');
    expect(html).toContain('On paper');
  });

  it('renders all 66 book rows from the canon', () => {
    const canon = Object.keys(CHAPTER_COUNTS);
    expect(canon.length).toBe(66);
    for (const book of canon) expect(html, `row for ${book}`).toContain(book);
    expect(html).toContain('Not Started');
    expect(html).toContain('0 of 150 complete');
  });

  it('the paper is the dark page and the book ink clears 4.5:1 on it', () => {
    const paper = renderedPaper(html);
    expect(paper).toBe(expectedGround('dark'));
    const ink = renderedTextColor(html, 'Genesis');
    expect(hexContrast(ink, paper)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('v241 — Books screen first paint, light scheme + Classic', () => {
  rig.scheme = 'light';
  const html = renderToString(React.createElement(BibleBooksScreen)).replace(/<!-- -->/g, '');

  it('renders the same full list, ink clearing 4.5:1 on the light paper', () => {
    expect(html).toContain('Your Books');
    for (const book of Object.keys(CHAPTER_COUNTS)) expect(html).toContain(book);
    const paper = renderedPaper(html);
    expect(paper).toBe(expectedGround('light'));
    const ink = renderedTextColor(html, 'Genesis');
    expect(hexContrast(ink, paper)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('v241 — the Bible screen boundary', () => {
  // Harness truth, verified against react-dom 19 directly: the
  // SERVER renderers treat a render throw as fatal to the request
  // even with a boundary in the tree — error boundaries recover on
  // the CLIENT renderer, which is where the app runs. So the pins
  // here are (a) the class contract itself, exercised directly, and
  // (b) the fallback page rendered on its own: if the boundary
  // trips on his phone, this exact page is what he sees.
  it('the class flips to its failed state on error and reports the fallback', () => {
    expect(BibleScreenBoundary.getDerivedStateFromError()).toEqual({ failed: true });
    const boundary = new BibleScreenBoundary({ children: null });
    boundary.state = { failed: true, details: 'Error: boom-v241' };
    const el = boundary.render() as React.ReactElement;
    expect(el.type).toBe(BibleScreenFallback);
  });

  it('componentDidCatch records the error name and message as diagnostics', () => {
    const boundary = new BibleScreenBoundary({ children: null });
    let applied: any = null;
    (boundary as any).setState = (s: any) => {
      applied = s;
    };
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    boundary.componentDidCatch(new Error('boom-v241'));
    warnSpy.mockRestore();
    expect(applied?.details).toContain('boom-v241');
  });

  it('the fallback page paints in the Bible palette with a way back and the fault named', () => {
    rig.scheme = 'dark';
    const html = renderToString(
      React.createElement(BibleScreenFallback, { details: 'Error: boom-v241' }),
    ).replace(/<!-- -->/g, '');
    expect(html).toContain('This page hit a snag');
    expect(html).toContain('Go back');
    expect(html).toContain('boom-v241');
    expect(renderedPaper(html)).toBe(expectedGround('dark'));
    const ink = renderedTextColor(html, 'This page hit a snag');
    expect(hexContrast(ink, expectedGround('dark'))).toBeGreaterThanOrEqual(4.5);
  });

  it('renders healthy children untouched', () => {
    const { Text } = require('react-native-web');
    const html = renderToString(
      React.createElement(BibleScreenBoundary, null, React.createElement(Text, null, 'all well')),
    );
    expect(html).toContain('all well');
    expect(html).not.toContain('hit a snag');
  });
});

describe('v241 — wiring pins', () => {
  it('the Books screen keeps its modals OUTSIDE the ScrollView', () => {
    const src = read('app/bible-chapters.tsx');
    const firstModal = src.indexOf('<Modal');
    expect(firstModal).toBeGreaterThan(-1);
    expect(firstModal).toBeGreaterThan(src.indexOf('</ScrollView>'));
  });

  it('all three Bible topbar screens wear the boundary', () => {
    for (const f of ['app/bible-chapters.tsx', 'app/bible-book.tsx', 'app/bible-queue.tsx']) {
      expect(read(f), f).toContain('BibleScreenBoundary');
    }
  });

  it('the zero-books guard is computed and rendered on the Books screen', () => {
    const src = read('app/bible-chapters.tsx');
    expect(src).toContain('totalBooks === 0');
    expect(src).toContain('groups.current.length + groups.finished.length + groups.notStarted.length');
  });
});
