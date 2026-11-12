/**
 * v514 — the Books header comes in line with the other tabs.
 *
 * Jonathan's pick (Nov 12, bible-header-aligned-v1.html — "That
 * works"): the Books screen was the one tab still wearing a
 * pushed-page header — a fixed topbar (back chevron, "Bible",
 * list icon, Study Queue pill) over a centered masthead
 * ("PrayerCircle · Bible" eyebrow, "{possessive} Books"). Both
 * are gone. What stands at the head of the header cluster now is
 * the plain tab header the People and More pages wear, pinned
 * here on the RENDERED tree:
 *  - the title "Study" at the People/More measure (27/800,
 *    −0.5 tracking, page ink) with today's date under it in
 *    their exact format ("Thursday, November 12" — weekday
 *    long, month long, day numeric) at 12.5/600 in the soft ink;
 *  - the header row carries the tray clearance the topbar used
 *    to (route mode: insets.top + 8), bottom-aligned, the Study
 *    Queue pill seated at its right in its standing dress (band
 *    ground, pill radius, raspDeep word);
 *  - NO back chevron, NO list icon, NO eyebrow, NO masthead
 *    title anywhere on the screen;
 *  - the pill is wired to the same queue door as the old one:
 *    route mode navigates to the shell with the queue route,
 *    pane mode calls the pane's openQueue — and nothing else;
 *  - everything below the header stands as it did: the header
 *    cluster is still scroll child 0 (collapsable={false}), the
 *    filter seat is still sticky child 1 carrying its v512
 *    geometry, the progress header, the chips and the book rows
 *    all render.
 */
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ─── Router capture ─────────────────────────────────────────────────────────

const nav = vi.hoisted(() => ({ navigate: [] as unknown[] }));

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
    useRouter: () => ({
      push: vi.fn(),
      back: vi.fn(),
      replace: vi.fn(),
      navigate: (arg: unknown) => {
        nav.navigate.push(arg);
      },
      setParams: vi.fn(),
    }),
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
import { bibleShellParamsForRoute, type BiblePaneNav } from '../bible-pane';

// ─── Tree helpers ───────────────────────────────────────────────────────────

const flatStyle = (style: unknown): Record<string, unknown> => {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flatStyle));
  return (style ?? {}) as Record<string, unknown>;
};

const elementChildren = (node: ReactTestInstance): ReactTestInstance[] =>
  node.children.filter((c): c is ReactTestInstance => typeof c !== 'string');

const textOf = (node: ReactTestInstance): string =>
  node.children.map((c) => (typeof c === 'string' ? c : '')).join('');

const allTexts = (root: ReactTestInstance): ReactTestInstance[] => root.findAllByType('Text' as never);

async function renderScreen(element: React.ReactElement) {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(element);
  });
  // Let the focus loads (study state, imports) land.
  await act(async () => {
    await Promise.resolve();
    vi.advanceTimersByTime(50);
    await Promise.resolve();
  });
  return renderer;
}

function scrollChildren(renderer: ReactTestRenderer): ReactTestInstance[] {
  const scroll = renderer.root
    .findAllByType('ScrollView' as never)
    .find((s) => Array.isArray(s.props.stickyHeaderIndices));
  expect(scroll, 'the sticky ScrollView renders').toBeTruthy();
  expect(scroll!.props.stickyHeaderIndices).toEqual([1]);
  return elementChildren(scroll!);
}

/** The header row: the one View wearing the tab-head measure —
 * a space-between row whose top padding is the tray clearance. */
function headerRow(renderer: ReactTestRenderer): ReactTestInstance {
  const row = renderer.root.findAllByType('View' as never).find((v) => {
    const s = flatStyle(v.props.style);
    return s.flexDirection === 'row' && s.justifyContent === 'space-between' && s.alignItems === 'flex-end';
  });
  expect(row, 'the plain tab header row renders').toBeTruthy();
  return row!;
}

function queuePill(renderer: ReactTestRenderer): ReactTestInstance {
  const pill = renderer.root
    .findAllByType('Pressable' as never)
    .find((p) => p.findAllByType('Text' as never).some((t) => textOf(t) === 'Study Queue'));
  expect(pill, 'the Study Queue pill renders').toBeTruthy();
  return pill!;
}

beforeEach(() => {
  store.clear();
  nav.navigate.length = 0;
  vi.useFakeTimers();
});

describe('v514 Books — the plain tab header', () => {
  it('the title is "Study" at the People/More measure, with today’s date under it in their format', async () => {
    const renderer = await renderScreen(<BibleBooksScreen />);
    const row = headerRow(renderer);

    // Route mode: the row carries the full tray clearance the
    // retired topbar used to (rig inset 24 + 8).
    expect(flatStyle(row.props.style).paddingTop).toBe(32);

    const [titleBlock, pill] = elementChildren(row);
    const [title, date] = elementChildren(titleBlock);
    expect(title.type).toBe('Text');
    expect(textOf(title)).toBe('Study');
    const titleStyle = flatStyle(title.props.style);
    expect(titleStyle.fontSize).toBe(27);
    expect(titleStyle.fontWeight).toBe('800');
    expect(titleStyle.letterSpacing).toBe(-0.5);
    expect(titleStyle.color).toBe(PALETTE.ink);

    const expectedDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    expect(date.type).toBe('Text');
    expect(textOf(date)).toBe(expectedDate);
    const dateStyle = flatStyle(date.props.style);
    expect(dateStyle.fontSize).toBe(12.5);
    expect(dateStyle.fontWeight).toBe('600');
    expect(dateStyle.marginTop).toBe(1);
    expect(dateStyle.color).toBe(PALETTE.inkSoft);

    // The pill is the row's right-hand seat.
    expect(pill.type).toBe('Pressable');
    expect(pill).toBe(queuePill(renderer));
  });

  it('the Study Queue pill keeps its standing dress', async () => {
    const renderer = await renderScreen(<BibleBooksScreen />);
    const pill = queuePill(renderer);
    const pillStyle = flatStyle(pill.props.style);
    expect(pillStyle.backgroundColor).toBe(PALETTE.band);
    expect(pillStyle.borderRadius).toBe(999);
    const word = pill.findAllByType('Text' as never)[0];
    expect(flatStyle(word.props.style).color).toBe(PALETTE.raspDeep);
  });

  it('no topbar survives: no back chevron, no list icon, no "Bible" title, no eyebrow, no masthead', async () => {
    const renderer = await renderScreen(<BibleBooksScreen />);
    const icons = renderer.root.findAllByType('MaterialIcons' as never).map((i) => i.props.name);
    expect(icons).not.toContain('arrow-back');
    expect(icons).not.toContain('list');

    const texts = allTexts(renderer.root).map(textOf);
    expect(texts).not.toContain('Bible');
    expect(texts.some((t) => t.includes('PrayerCircle · Bible'))).toBe(false);
    expect(texts.some((t) => t.endsWith(' Books'))).toBe(false);
    expect(texts).not.toContain('Your Books');
  });

  it('route mode: pressing the pill navigates to the shell’s queue route — the old button’s door', async () => {
    const renderer = await renderScreen(<BibleBooksScreen />);
    const pill = queuePill(renderer);
    await act(async () => {
      pill.props.onPress();
    });
    expect(nav.navigate).toEqual([
      { pathname: '/(tabs)', params: bibleShellParamsForRoute({ name: 'queue' }) },
    ]);
  });

  it('pane mode: pressing the pill calls the pane’s openQueue and never touches the router', async () => {
    const opened: string[] = [];
    const paneNav: BiblePaneNav = {
      openBook: () => opened.push('openBook'),
      openChapter: () => opened.push('openChapter'),
      openQueue: () => opened.push('openQueue'),
      openDownloads: () => opened.push('openDownloads'),
      openBooks: () => opened.push('openBooks'),
      replaceChapter: () => opened.push('replaceChapter'),
      back: () => opened.push('back'),
      exit: () => opened.push('exit'),
    };
    const renderer = await renderScreen(
      <BibleBooksScreen pane={{ nav: paneNav, focused: true, bookNavNonce: 0 }} />,
    );
    // In the pane the shell has applied the inset — the row's
    // clearance is the flat 8 the topbar used to add.
    expect(flatStyle(headerRow(renderer).props.style).paddingTop).toBe(8);

    const pill = queuePill(renderer);
    await act(async () => {
      pill.props.onPress();
    });
    expect(opened).toEqual(['openQueue']);
    expect(nav.navigate).toEqual([]);
  });
});

describe('v514 Books — everything below the header stands as it did', () => {
  it('the header cluster is still scroll child 0, the new header its first element, the filter seat still child 1', async () => {
    const renderer = await renderScreen(<BibleBooksScreen />);
    const kids = scrollChildren(renderer);

    const cluster = kids[0];
    expect(cluster.type).toBe('View');
    expect(cluster.props.collapsable).toBe(false);
    expect(elementChildren(cluster)[0]).toBe(headerRow(renderer));

    const seat = kids[1];
    expect(seat.type).toBe('View');
    expect(seat.props.collapsable).toBe(false);
    const seatStyle = flatStyle(seat.props.style);
    expect(seatStyle.marginTop).toBe(16);
    expect(seatStyle.marginHorizontal).toBe(-16);
    expect(seatStyle.backgroundColor).toBe(PALETTE.paper);
  });

  it('the progress header, the filter chips and the book rows all render under the new header', async () => {
    const renderer = await renderScreen(<BibleBooksScreen />);
    const texts = allTexts(renderer.root).map(textOf);
    expect(texts).toContain('PROGRESS');
    expect(texts).toContain('Genesis');

    const chips = renderer.root
      .findAllByType('Pressable' as never)
      .map((p) => p.props.accessibilityLabel)
      .filter(Boolean);
    expect(chips).toContain('All books');
    expect(chips).toContain('Current books');
    expect(chips).toContain('Not Started books');

    // Order down the page: header → progress → first chip → rows.
    const joined = texts.join('\n');
    expect(joined.indexOf('Study')).toBeLessThan(joined.indexOf('PROGRESS'));
  });
});
