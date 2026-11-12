/**
 * v512 — Fix 3: the gap under the Books filter row.
 *
 * Jonathan (Nov 12, on the Study tab, filter = All): below the
 * sticky filter chips there was "a tall dead band — the tail of
 * a book card peeking, then a large empty space — before the
 * FINISHED section label and its first card."
 *
 * The seat mechanics (RN 0.81.5, ScrollViewStickyHeader): the
 * sticky wrapper takes over the DIRECT child's style onto its
 * animated wrapper, measures the child's own box for the seat,
 * and clones the child with {flex: 1}. Through v511 the direct
 * child was the BooksFilterBar COMPONENT, whose root View kept
 * the seat geometry INSIDE itself (marginTop 16, marginHorizontal
 * −16, paper ground, hairlines) — so the seat RN reserved was
 * never the seat the bar painted.
 *
 * v512's structure, pinned here on the RENDERED tree:
 *  - the ScrollView's sticky child 1 is a dedicated seat View:
 *    collapsable={false}, carrying the geometry itself (16 above,
 *    −16 sides, paper ground, both hairlines), with the bar
 *    inside it painting edge-to-edge;
 *  - the bar's own root carries NO seat geometry anymore;
 *  - the header cluster (child 0) and the sections wrapper
 *    (child 2) are collapsable={false} too, so Fabric flattening
 *    can never shift the native child list under the sticky
 *    bookkeeping;
 *  - in All mode the sections wrapper's FIRST element is the
 *    first section's group — its label, then its first book row,
 *    with no spacer standing before it; after switching to a
 *    single section and letting the switch settle, the wrapper
 *    holds exactly that one group, label off, its first row
 *    first.
 */
import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ─── Storage ────────────────────────────────────────────────────────────────

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
    multiSet: async (pairs: [string, string][]) => {
      for (const [k, v] of pairs) store.set(k, v);
    },
    multiRemove: async (ks: string[]) => {
      for (const k of ks) store.delete(k);
    },
  },
}));

// ─── Native / animated neighbours ───────────────────────────────────────────

vi.mock('react-native', async () => {
  const React = await import('react');
  class ScrollView extends React.Component<Record<string, unknown>> {
    scrollTo() {}
    render() {
      const { children, ...rest } = this.props;
      return React.createElement('ScrollView', rest, children as React.ReactNode);
    }
  }
  return {
    View: 'View',
    Text: 'Text',
    Pressable: 'Pressable',
    Modal: 'Modal',
    ScrollView,
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      hairlineWidth: 0.5,
      absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
      absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    },
    Platform: { OS: 'android', select: (o: any) => o.android ?? o.default },
    Dimensions: { get: () => ({ width: 390, height: 844 }) },
    AccessibilityInfo: {
      isReduceMotionEnabled: async () => false,
      addEventListener: () => ({ remove: () => undefined }),
    },
  };
});

vi.mock('react-native-reanimated', async () => {
  const React = await import('react');
  const AV = (props: any) => React.createElement('AnimatedView', props, props?.children);
  const AT = (props: any) => React.createElement('AnimatedText', props, props?.children);
  const interpolate = (v: number, input: number[], output: number[]) => {
    if (v <= input[0]) return output[0];
    for (let i = 1; i < input.length; i++) {
      if (v <= input[i]) {
        const t = (v - input[i - 1]) / (input[i] - input[i - 1]);
        return output[i - 1] + t * (output[i] - output[i - 1]);
      }
    }
    return output[output.length - 1];
  };
  return {
    __esModule: true,
    default: { View: AV, Text: AT, createAnimatedComponent: (c: any) => c },
    View: AV,
    Text: AT,
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: (fn: any) => fn(),
    withTiming: (to: any, cfg: any, cb?: (finished: boolean) => void) => {
      if (cb) setTimeout(() => cb(true), cfg?.duration ?? 0);
      return to;
    },
    withSpring: (v: any) => v,
    withDelay: (_d: any, v: any) => v,
    withRepeat: (v: any) => v,
    cancelAnimation: () => undefined,
    interpolate,
    interpolateColor: (_v: any, _i: any, o: any) => o[0],
    Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    Easing: {
      bezier: () => ({}),
      inOut: (f: any) => f,
      out: (f: any) => f,
      in: (f: any) => f,
      sin: {},
      steps: () => ({}),
      cubic: {},
      linear: {},
    },
    runOnJS: (f: any) => (...args: any[]) => f(...args),
  };
});

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 0, left: 0 }),
}));

vi.mock('@expo/vector-icons/MaterialIcons', () => ({ default: 'MaterialIcons' }));

vi.mock('expo-router', async () => {
  const React = await import('react');
  return {
    useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn(), navigate: vi.fn(), setParams: vi.fn() }),
    usePathname: () => '/bible-chapters',
    useLocalSearchParams: () => ({}),
    useFocusEffect: (cb: any) => {
      React.useEffect(() => {
        const cleanup = cb();
        return typeof cleanup === 'function' ? cleanup : undefined;
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
    },
  };
});

// ─── The screen's leaf neighbours ───────────────────────────────────────────

const PALETTE = {
  paper: '#FFFBF2',
  paper2: '#F5EEE1',
  line: '#D8CFBC',
  ink: '#2A2118',
  inkSoft: '#6E6252',
  rasp: '#B03A2E',
  raspDeep: '#7B241C',
  raspTint: '#F3DCD6',
  band: '#EFE7D8',
  card: '#FFFFFF',
  wash: '#F0E9DA',
  ground: '#FFFBF2',
  screenDress: undefined,
  btnDress: undefined,
  h2Size: undefined,
};

vi.mock('@/components/bible-v205/palette', () => ({
  useBiblePalette: () => PALETTE,
  useBookBiblePalette: () => PALETTE,
}));

vi.mock('@/hooks/use-skin', () => ({
  useSkin: () => ({ skin: 'classic', isPaper: false, isEightBit: false, isSkinned: false }),
}));

vi.mock('@/components/paper-motion', async () => {
  const React = await import('react');
  return { PaperSettle: ({ children }: any) => React.createElement(React.Fragment, null, children) };
});
vi.mock('@/components/bit-motion', async () => {
  const React = await import('react');
  return { BitSettle: ({ children }: any) => React.createElement(React.Fragment, null, children) };
});

vi.mock('@/components/bible-v205/reading-progress-card', async () => {
  const React = await import('react');
  return {
    StudyProgressHeader: () => React.createElement('View', null, React.createElement('Text', null, 'PROGRESS')),
    BookReadingThread: () => null,
  };
});

vi.mock('@/components/bible-v205/screen-boundary', async () => {
  const React = await import('react');
  return {
    BibleScreenBoundary: ({ children }: any) => React.createElement(React.Fragment, null, children),
  };
});

vi.mock('@/components/app-tab-bar', () => ({
  BibleTabBar: () => null,
  useTabBarOccupiedHeight: () => 81,
}));

vi.mock('@/components/top-fade', () => ({
  TopFade: () => null,
  topFadeScrollHandler: () => () => undefined,
  useTopFadeScrollY: () => ({ value: 0 }),
}));

vi.mock('@/lib/downloads', () => ({
  useDownloadedAudio: () => [],
  refreshDownloads: async () => undefined,
  downloadsCardModel: () => ({ visible: false, newestBook: null }),
}));

import BibleBooksScreen from '../../app/bible-chapters';

// ─── Tree helpers ───────────────────────────────────────────────────────────

const flatStyle = (style: unknown): Record<string, unknown> => {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flatStyle));
  return (style ?? {}) as Record<string, unknown>;
};

const elementChildren = (node: ReactTestInstance): ReactTestInstance[] =>
  node.children.filter((c): c is ReactTestInstance => typeof c !== 'string');

async function renderScreen() {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<BibleBooksScreen />);
  });
  // Let the focus loads (study state, imports, labels) land.
  await act(async () => {
    await Promise.resolve();
    vi.advanceTimersByTime(50);
    await Promise.resolve();
  });
  return renderer;
}

function scrollChildren(renderer: ReactTestRenderer): ReactTestInstance[] {
  // The page's own ScrollView — the bar carries a chip scroller
  // of its own; the sticky one is the one with the indices prop.
  const scroll = renderer.root
    .findAllByType('ScrollView' as never)
    .find((s) => Array.isArray(s.props.stickyHeaderIndices));
  expect(scroll, 'the sticky ScrollView renders').toBeTruthy();
  expect(scroll!.props.stickyHeaderIndices).toEqual([1]);
  return elementChildren(scroll!);
}

beforeEach(() => {
  store.clear();
  vi.useFakeTimers();
});

describe('v512 Books — the filter seat is the sticky child itself', () => {
  it('child 1 is a dedicated seat View carrying the geometry, with the bar inside it', async () => {
    const renderer = await renderScreen();
    const kids = scrollChildren(renderer);
    // Child 0: the header cluster — flatten-proof.
    expect(kids[0].type).toBe('View');
    expect(kids[0].props.collapsable).toBe(false);

    // Child 1: THE SEAT — a plain host View (not the bar
    // component), carrying the seat geometry itself.
    const seat = kids[1];
    expect(seat.type).toBe('View');
    expect(seat.props.collapsable).toBe(false);
    const seatStyle = flatStyle(seat.props.style);
    expect(seatStyle.marginTop).toBe(16);
    expect(seatStyle.marginHorizontal).toBe(-16);
    expect(seatStyle.backgroundColor).toBe(PALETTE.paper);
    expect(seatStyle.borderTopColor).toBe(PALETTE.line);
    expect(seatStyle.borderBottomColor).toBe(PALETTE.line);
    expect(seatStyle.borderTopWidth).toBe(0.5);
    expect(seatStyle.borderBottomWidth).toBe(0.5);

    // The bar lives inside the seat, and ITS root carries none of
    // the seat geometry (through v511 it did — inside the sticky
    // child's measurement, which is the divergence being fixed).
    // The seat's only child is the bar component; its first host
    // View is the bar's root.
    const barComponent = elementChildren(seat)[0];
    const barRoot = barComponent.findAllByType('View' as never)[0];
    expect(barRoot).toBeTruthy();
    const barStyle = flatStyle(barRoot.props.style);
    expect(barStyle.marginTop).toBeUndefined();
    expect(barStyle.marginHorizontal).toBeUndefined();
    expect(barStyle.borderTopWidth).toBeUndefined();
    expect(barStyle.backgroundColor).toBeUndefined();
  });

  it('All mode: the first section stands first inside the sections wrapper — label, then its first row, no spacer before it', async () => {
    const renderer = await renderScreen();
    const kids = scrollChildren(renderer);
    const wrapper = kids[2];
    expect(wrapper.props.collapsable).toBe(false);
    // At rest in All mode the wrapper carries no top offset at all.
    expect(flatStyle(wrapper.props.style).paddingTop).toBeUndefined();

    const sections = elementChildren(wrapper);
    expect(sections).toHaveLength(4);
    // Every child of the wrapper is a section group, and no group
    // carries spacing of its own — nothing in the wrapper can
    // stand between the seat and the first label but the label's
    // own standing padding (pinned in the style pin below).
    for (const group of sections) {
      expect(group.type).toBe('View');
      const gs = flatStyle(group.props.style);
      expect(gs.paddingTop).toBeUndefined();
      expect(gs.marginTop).toBeUndefined();
    }
    // The first group WITH books (seed state seats his written
    // library first) opens with its label, then its first row —
    // the list begins immediately under the seat.
    const firstGroup = sections.find((g) => elementChildren(g).length > 0)!;
    const groupKids = elementChildren(firstGroup);
    expect(groupKids[0].type).toBe('Text');
    const label = groupKids[0].props.children;
    expect(['Current', 'Finished', 'Written', 'Not Started']).toContain(label);
    expect(groupKids.length).toBeGreaterThan(1);
    expect(groupKids[1].findAllByType('Pressable' as never).length).toBeGreaterThan(0);
  });

  it('single-section mode (Written), after the switch settles: one group, label off, its row first — wrapper plain again', async () => {
    const renderer = await renderScreen();
    // Tap the Written chip inside the seat (the seed state's
    // populated section — the shipped library is written).
    const seat = scrollChildren(renderer)[1];
    const textsIn = (n: ReactTestInstance): string[] =>
      n
        .findAll((x) => x.type === 'Text' || x.type === 'AnimatedText')
        .flatMap((x) => x.children.filter((c): c is string => typeof c === 'string'));
    const chips = seat.findAllByType('Pressable' as never);
    const writtenChip = chips.find((c) => textsIn(c).includes('Written'));
    expect(writtenChip).toBeTruthy();
    await act(async () => {
      writtenChip!.props.onPress();
    });
    // The swap timer (120ms) and the fade-in completion (300ms)
    // run the switch to its rest state.
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    const kids = scrollChildren(renderer);
    const wrapper = kids[2];
    // At rest the wrapper is the PLAIN view again (v504) — and
    // still flatten-proof.
    expect(wrapper.type).toBe('View');
    expect(wrapper.props.collapsable).toBe(false);
    // Its only top spacing is the label's standing place (12px),
    // the page's own rhythm — no other offset.
    expect(flatStyle(wrapper.props.style).paddingTop).toBe(12);

    const sections = elementChildren(wrapper);
    expect(sections).toHaveLength(1);
    const groupKids = elementChildren(sections[0]);
    // Label off in single mode: the FIRST element is the book row
    // itself — the row stands directly at the wrapper's top.
    expect(groupKids.length).toBeGreaterThan(0);
    expect(groupKids[0].findAllByType('Pressable' as never).length).toBeGreaterThan(0);
    const rowTexts = groupKids[0]
      .findAllByType('Text' as never)
      .flatMap((t) => (Array.isArray(t.props.children) ? t.props.children : [t.props.children]))
      .map((c) => String(c ?? ''));
    expect(rowTexts.join(' ')).toMatch(/of \d+ written/);
  });

  it('the section label keeps its standing rhythm — the fix moved no spacing numbers', () => {
    const screen = readFileSync(join(process.cwd(), 'app/bible-chapters.tsx'), 'utf8');
    // styles.subhead (the section label) is exactly the pre-v512
    // rhythm: 26 above, 12 below. The gap was structural, and the
    // fix is structural — no margin anywhere was tuned.
    const subhead = screen.slice(screen.indexOf('subhead: {'), screen.indexOf('}', screen.indexOf('subhead: {')));
    expect(subhead).toContain('paddingTop: 26');
    expect(subhead).toContain('paddingBottom: 12');
    // And the seat in source: the sticky child is the seat View,
    // declared with the geometry, wrapping the bar.
    expect(screen).toContain('styles.filterSeat,');
    expect(screen).toContain('collapsable={false}');
  });
});
