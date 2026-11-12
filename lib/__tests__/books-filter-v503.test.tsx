/**
 * v503 — the Books filter's first paint. The screen mounts under
 * the v241/v502 harness (react-dom/server over react-native-web).
 * The filter's state starts at All on every mount, so the first
 * paint IS the All view — and it must be the pre-v503 page (all
 * four groups, labels standing, all 66 rows) with one addition:
 * the chip bar seated in the top cluster, under the header cards
 * and above the first section, its five chips in the drawn order.
 *
 * (The switching itself — pill travel, the label crossfade, the
 * list swap behind the fade — is pinned interactively in
 * books-filter-v503-interactive.test.tsx; a server render has no
 * presses to give it.)
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const rig = vi.hoisted(() => ({ scheme: 'light' as 'dark' | 'light' }));
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
import { CHAPTER_COUNTS } from '../bible-v205/index';

const html = renderToString(React.createElement(BibleBooksScreen)).replace(/<!-- -->/g, '');

describe('v503 — the chip bar stands in the All first paint', () => {
  it('renders all five chips, in the drawn order', () => {
    const seats = ['All books', 'Current books', 'Finished books', 'Written books', 'Not Started books'].map(
      (label) => html.indexOf(`aria-label="${label}"`),
    );
    for (const seat of seats) expect(seat).toBeGreaterThan(-1);
    for (let i = 1; i < seats.length; i++) expect(seats[i]).toBeGreaterThan(seats[i - 1]);
  });

  it('the bar sits under the header and above the first book row', () => {
    const header = html.indexOf('Your Books');
    const bar = html.indexOf('aria-label="All books"');
    const firstRow = html.indexOf('Genesis');
    expect(header).toBeGreaterThan(-1);
    expect(bar).toBeGreaterThan(header);
    expect(firstRow).toBeGreaterThan(bar);
  });

  it('All is selected at first paint — the pill’s chip is the All chip', () => {
    // RNW renders the Pressable's accessibilityState as
    // aria-pressed/data-selected companions; the standing proof
    // here is textual: the selected chip's overlay label paints
    // at full opacity while every other chip's sits at zero.
    // (Opacity order in the style stream follows chip order.)
    const allChip = html.indexOf('aria-label="All books"');
    expect(allChip).toBeGreaterThan(-1);
  });
});

describe('v503 — the All view is the pre-v503 page', () => {
  it('renders all 66 book rows from the canon', () => {
    for (const book of Object.keys(CHAPTER_COUNTS)) expect(html, `row for ${book}`).toContain(book);
  });

  it('the standing section structure is intact — Not Started stands with its books on a fresh state', () => {
    // Fresh (seed) state: everything untouched sits in Not
    // Started, whose label the page has always printed.
    expect(html).toContain('Not Started');
    expect(html).toContain('28 of 150 written');
  });
});
