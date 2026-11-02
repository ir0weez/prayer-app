/**
 * v421 — the Restudy card renders. The Books screen mounts under
 * the v241 harness (react-dom/server over react-native-web), with
 * the study store's seed swapped for a fixture in which Genesis
 * carries two queued restudy chapters — chapter 5 queued BEFORE
 * chapter 2, so the card's "Next restudy" must name 5 (queue
 * order, not chapter order). The pins: the RESTUDY section header
 * stands over the card; the pill seat carries "↻ RESTUDY" in the
 * book's own v420 palette (Genesis = Red: tint bg, deep text);
 * the next-chapter line names Chapter 5 in the same deep tone;
 * and exactly one card on the page wears the pill.
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

// The fixture: Genesis 5 queued for restudy BEFORE Genesis 2 —
// the queue order is the order he queued them, and the card must
// name chapter 5 as next. Everything else in the module stays the
// real implementation; only the seed (the screen's first paint)
// is swapped.
vi.mock('@/lib/bible-v205/study', async (importActual) => {
  const actual = (await importActual()) as any;
  let fixture = actual.seedStudyState();
  fixture = actual.setChapterStatus(fixture, 'Genesis', 5, 'restudy');
  fixture = actual.setChapterStatus(fixture, 'Genesis', 2, 'restudy');
  return { ...actual, seedStudyState: () => fixture };
});

import BibleBooksScreen from '../../app/bible-chapters';
import { buildBiblePalette } from '../../components/bible-v205/palette';
import { getThemedPalette } from '../color-themes';

function rgbaOf(hex: string): string {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b}`;
}

/** The last style value of `kind` (e.g. 'background-color') before `needle`. */
function lastStyleBefore(html: string, needle: string, kind: string): string {
  const i = html.indexOf(needle);
  expect(i, `"${needle}" present in render`).toBeGreaterThan(-1);
  const before = html.slice(Math.max(0, i - 900), i);
  const matches = [...before.matchAll(new RegExp(`${kind}:rgba\\((\\d+),(\\d+),(\\d+)`, 'g'))];
  expect(matches.length, `a ${kind} precedes "${needle}"`).toBeGreaterThan(0);
  const m = matches[matches.length - 1];
  return `rgba(${m[1]},${m[2]},${m[3]}`;
}

describe('v421 — the Restudy card on the Books list (light, Genesis queued)', () => {
  rig.scheme = 'light';
  const html = renderToString(React.createElement(BibleBooksScreen)).replace(/<!-- -->/g, '');
  const genesisPal = buildBiblePalette(getThemedPalette('light', 'default') as any, 'Genesis');

  it('the book palette under the card is the v420 Red set', () => {
    expect(genesisPal.raspTint).toBe('#F9DEDC');
    expect(genesisPal.raspDeep).toBe('#8E1414');
  });

  it('the RESTUDY section header stands over the Genesis card', () => {
    const header = html.indexOf('Restudy');
    const pill = html.indexOf('↻ RESTUDY');
    expect(header).toBeGreaterThan(-1);
    expect(pill).toBeGreaterThan(header);
    // Genesis' card (name row, then pill) sits between them.
    const name = html.indexOf('Genesis', header);
    expect(name).toBeGreaterThan(header);
    expect(name).toBeLessThan(pill);
  });

  it('exactly one card wears the ↻ RESTUDY pill', () => {
    expect(html.split('↻ RESTUDY').length - 1).toBe(1);
  });

  it('the pill wears the book palette: tint ground, deep text', () => {
    expect(lastStyleBefore(html, '↻ RESTUDY', 'background-color')).toBe(rgbaOf(genesisPal.raspTint));
    expect(lastStyleBefore(html, '↻ RESTUDY', 'color')).toBe(rgbaOf(genesisPal.raspDeep));
  });

  it('the card names the FIRST queued chapter — 5, not 2 — in the deep tone', () => {
    const line = html.indexOf('Next restudy · Chapter 5');
    expect(line).toBeGreaterThan(-1);
    expect(html).not.toContain('Next restudy · Chapter 2');
    expect(lastStyleBefore(html, 'Next restudy · Chapter 5', 'color')).toBe(rgbaOf(genesisPal.raspDeep));
  });
});
