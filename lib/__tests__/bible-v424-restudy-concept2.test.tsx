/**
 * v424 — the Restudy queue card renders (Concept 2, Material).
 * The Books screen mounts under the v241 harness (react-dom/server
 * over react-native-web), with the study store's seed swapped for
 * a fixture in which Genesis 5 is queued BEFORE Genesis 2 and
 * Ruth 1 follows — the card must name the queue's HEAD (Genesis 5,
 * queue order, not chapter order) and count distinct books (2,
 * not 3 chapters). The pins: the ONE card stands at the top,
 * above the first section; its ground is the page palette's
 * primary container (primCont — seed-derived Material tone); the
 * icon circle wears the primary (rasp) with the app's own ↻
 * glyph; NO book card wears a restudy pill or line, and there is
 * no Restudy section — Genesis sits under Written, the home its
 * notes earn. With an empty queue the card is simply absent.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const rig = vi.hoisted(() => ({ scheme: 'light' as 'dark' | 'light', queue: true }));
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

// The fixture: while rig.queue stands, Genesis 5 is queued BEFORE
// Genesis 2 and Ruth 1 follows — queue order, three chapters, two
// books. Everything else in the module stays the real
// implementation; only the seed (the screen's first paint) is
// swapped, per render.
vi.mock('@/lib/bible-v205/study', async (importActual) => {
  const actual = (await importActual()) as any;
  return {
    ...actual,
    seedStudyState: () => {
      let fixture = actual.seedStudyState();
      if (rig.queue) {
        fixture = actual.setChapterStatus(fixture, 'Genesis', 5, 'restudy');
        fixture = actual.setChapterStatus(fixture, 'Genesis', 2, 'restudy');
        fixture = actual.setChapterStatus(fixture, 'Ruth', 1, 'restudy');
      }
      return fixture;
    },
  };
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

describe('v424 — the Restudy queue card on the Books list (light, queue standing)', () => {
  rig.scheme = 'light';
  rig.queue = true;
  const html = renderToString(React.createElement(BibleBooksScreen)).replace(/<!-- -->/g, '');
  const palette = buildBiblePalette(getThemedPalette('light', 'default') as any);

  it('the card stands once, naming the queue head and the distinct books waiting', () => {
    // One card = one trailing chevron (book rows carry a text ›,
    // never this icon) and one queue door in the a11y tree.
    expect(html.split('icon:chevron-right').length - 1).toBe(1);
    expect(html.split('Open the Study Queue').length - 1).toBe(1);
    expect(html).toContain('Genesis · Chapter 5 is next — 2 books waiting');
    expect(html).not.toContain('Chapter 2 is next');
  });

  it('the card sits above the first section — the queue has one home, at the top', () => {
    const card = html.indexOf('Restudy queue');
    const firstSection = html.indexOf('Written');
    expect(card).toBeGreaterThan(-1);
    expect(firstSection).toBeGreaterThan(card);
  });

  it('the card ground is the page palette’s primary container — derived, never pinned', () => {
    expect(html).toContain(rgbaOf(palette.primCont));
  });

  it('the icon circle wears the primary, and the glyph inside it is the app’s ↻', () => {
    expect(lastStyleBefore(html, '↻', 'background-color')).toBe(rgbaOf(palette.rasp));
    const glyph = html.indexOf('↻');
    expect(glyph).toBeGreaterThan(-1);
    // The glyph (inside its circle) precedes the card's title text.
    expect(glyph).toBeLessThan(html.lastIndexOf('Restudy queue'));
  });

  it('the trailing chevron rides the card', () => {
    const line = html.indexOf('Genesis · Chapter 5 is next — 2 books waiting');
    const chevron = html.indexOf('icon:chevron-right', line);
    expect(chevron).toBeGreaterThan(line);
  });

  it('no book card wears a restudy mark: no pill, no next line, no section', () => {
    expect(html).not.toContain('↻ RESTUDY');
    expect(html).not.toContain('Next restudy');
    // Genesis — queued, fully noted — sits under Written, its
    // reading/writing home, not in any restudy gathering.
    const written = html.indexOf('Written');
    const genesis = html.indexOf('Genesis', written);
    expect(genesis).toBeGreaterThan(written);
  });
});

describe('v424 — an empty queue renders no card at all', () => {
  rig.queue = false;
  const html = renderToString(React.createElement(BibleBooksScreen)).replace(/<!-- -->/g, '');

  it('no queue card, no placeholder — the sections follow the header directly', () => {
    expect(html).not.toContain('Restudy queue');
    expect(html).not.toContain('books waiting');
  });
});
