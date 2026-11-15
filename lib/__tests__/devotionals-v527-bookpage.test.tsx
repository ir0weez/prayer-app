/**
 * v527 — the book page's two additions, pinned interactively
 * (harness: the v243/v503 render rig, driven with
 * react-test-renderer so presses are real props.onPress calls):
 *
 *  1. The chapter grid's double-tap, exactly as Jonathan
 *     described it (Nov 14): a single tap on a chapter pops the
 *     bottom box up for that chapter, as it always has; tapping
 *     THE SAME chapter again while the box is up for it goes
 *     straight into the chapter. Tapping a different chapter
 *     just moves the box. The mechanism is the selection state
 *     itself — there is NO timed double-tap detector: the first
 *     tap's effect is visible the moment the press returns, with
 *     no clock advanced and no timer anywhere in the path.
 *
 *  2. The "Download all" bar's seat: at the top of the chapter
 *     list, directly beneath the Ten Stops card, labelled with
 *     his words and the book's total devotional size. (The bar's
 *     states and the download machinery behind it are pinned in
 *     devotionals-v527.test.ts; here the download stores are
 *     stubbed so this file is about the page.)
 */
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

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

vi.mock('expo-router', async () => {
  const React = await import('react');
  return {
    useRouter: () => ({ push: () => {}, back: () => {}, replace: () => {}, navigate: () => {}, setParams: () => {} }),
    usePathname: () => '/bible-book',
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

// The download stores are stubbed: this file pins the PAGE (seat,
// label, taps) — the machinery is pinned in devotionals-v527.test.ts.
//
// RE-BASE (v533, 2026-11-15): the stub gains devotionalOnPhoneLabel
// (the real wording formula). v533's naming header over the bar
// reads it, so a stub without it breaks the bar's render — and
// with it the whole page's. The header's own pins live in
// devotionals-v533.test.ts / devotionals-v533-bar.test.tsx; the
// seat and label pins below are unchanged and still hold (the
// header is not a pressable and stands in the same seat).
const barRig = vi.hoisted(() => ({
  startBook: vi.fn(async (_book: string) => {}),
  refreshBook: vi.fn(async (_book: string) => {}),
}));
vi.mock('@/lib/devotional-download', () => ({
  refreshBookDevotionalDownloads: barRig.refreshBook,
  startBookDevotionalDownload: barRig.startBook,
  cancelBookDevotionalDownload: async () => {},
  deleteBookDevotionalDownloads: async () => {},
  devotionalOnPhoneLabel: (p: any) => `${p.downloadedCount} of ${p.chapterCount} on this phone`,
  useBookDevotionalDownloadState: () => ({ status: 'idle' }),
  useBookDevotionalProgress: () => ({
    downloadedCount: 0,
    chapterCount: 4,
    downloadedBytes: 0,
    // Ruth's real hosted total (the registry's four sizes).
    totalBytes: 2179546,
    allDownloaded: false,
  }),
  refreshDevotionalDownload: async () => ({ status: 'idle' }),
  useDevotionalDownloadState: () => ({ status: 'idle' }),
}));
vi.mock('@/lib/ten-stops-download', () => ({
  tenStopsLocalSource: () => null,
  refreshTenStopsDownload: async () => ({ status: 'idle' }),
  useTenStopsDownloadState: () => ({ status: 'idle' }),
  startTenStopsDownload: async () => {},
  cancelTenStopsDownload: async () => {},
  deleteTenStopsDownload: async () => {},
}));

import BibleBookScreen from '../../app/bible-book';

function makeNav() {
  return {
    openBook: vi.fn(),
    openChapter: vi.fn(),
    openQueue: vi.fn(),
    openDownloads: vi.fn(),
    openBooks: vi.fn(),
    replaceChapter: vi.fn(),
    back: vi.fn(),
    exit: vi.fn(),
  };
}

async function renderBook(book: string) {
  const nav = makeNav();
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      React.createElement(BibleBookScreen as React.ComponentType<any>, {
        pane: { nav, focused: true, book },
      }),
    );
  });
  await act(async () => {});
  return { renderer, nav, root: renderer.root };
}

function textOf(node: any): string {
  const parts: string[] = [];
  const walk = (n: any) => {
    if (n == null) return;
    if (typeof n === 'string') {
      parts.push(n);
      return;
    }
    if (typeof n === 'number') {
      parts.push(String(n));
      return;
    }
    if (Array.isArray(n)) {
      n.forEach(walk);
      return;
    }
    if (typeof n === 'object' && n.props) walk(n.props.children);
  };
  walk(node);
  return parts.join('');
}

/** Every string leaf in the tree, in document order. */
function renderedText(root: any): string {
  const texts: string[] = [];
  const walk = (instance: any) => {
    for (const child of instance.children ?? []) {
      if (typeof child === 'string') texts.push(child);
      else walk(child);
    }
  };
  walk(root);
  return texts.join(' ');
}

/** Document-order index of the pressable carrying a label. */
function pressableIndex(root: any, accessibilityLabel: string): number {
  const all = root.findAll((n: any) => typeof n.props?.onPress === 'function');
  return all.findIndex((n: any) => n.props.accessibilityLabel === accessibilityLabel);
}

/** The chapter grid cell for chapter n — the pressable whose whole
 * text is the chapter number. */
function cellFor(root: any, n: number) {
  const cells = root.findAll(
    (node: any) =>
      typeof node.props?.onPress === 'function' && textOf(node).trim() === String(n),
  );
  expect(cells.length, `cell ${n}`).toBeGreaterThan(0);
  return cells[0];
}

function pressableWithText(root: any, text: string) {
  const found = root.findAll(
    (node: any) =>
      typeof node.props?.onPress === 'function' && textOf(node).includes(text),
  );
  expect(found.length, `pressable "${text}"`).toBeGreaterThan(0);
  return found[0];
}

async function press(node: any) {
  await act(async () => {
    node.props.onPress();
  });
}

describe('v527 book page — the double-tap, as described', () => {
  it('a single tap raises the box for that chapter and does not navigate', async () => {
    const { root, nav } = await renderBook('Ruth');
    await press(cellFor(root, 3));
    expect(nav.openChapter).not.toHaveBeenCalled();
    expect(renderedText(root)).toContain('Chapter 03');
  });

  it('the first tap on the default chapter selects only — the box was not up for it yet', async () => {
    const { root, nav } = await renderBook('Ruth');
    await press(cellFor(root, 1));
    expect(nav.openChapter).not.toHaveBeenCalled();
    expect(renderedText(root)).toContain('Chapter 01');
  });

  it('tapping the same chapter again goes straight into it', async () => {
    const { root, nav } = await renderBook('Ruth');
    await press(cellFor(root, 1));
    await press(cellFor(root, 1));
    expect(nav.openChapter).toHaveBeenCalledTimes(1);
    expect(nav.openChapter).toHaveBeenCalledWith('Ruth', 1, false);
  });

  it('tapping a different chapter moves the box and never navigates', async () => {
    const { root, nav } = await renderBook('Ruth');
    await press(cellFor(root, 3));
    await press(cellFor(root, 2));
    expect(nav.openChapter).not.toHaveBeenCalled();
    expect(renderedText(root)).toContain('Chapter 02');
    // …and now chapter 2 is the box's chapter: one more tap goes in.
    await press(cellFor(root, 2));
    expect(nav.openChapter).toHaveBeenCalledTimes(1);
    expect(nav.openChapter).toHaveBeenCalledWith('Ruth', 2, false);
  });

  it('the box’s own Read Chapter door still opens the selected chapter', async () => {
    const { root, nav } = await renderBook('Ruth');
    await press(cellFor(root, 4));
    await press(pressableWithText(root, 'Read Chapter'));
    expect(nav.openChapter).toHaveBeenCalledTimes(1);
    expect(nav.openChapter).toHaveBeenCalledWith('Ruth', 4, false);
  });

  it('the single-tap path carries no timer or delay gate', () => {
    const src = readFileSync(join(process.cwd(), 'app', 'bible-book.tsx'), 'utf8');
    const at = src.indexOf('const onChapterCellPress');
    expect(at).toBeGreaterThan(-1);
    const handler = src.slice(at, src.indexOf('};', at));
    expect(handler).toContain('boxChapter === c');
    expect(handler).toContain('openChapter(false)');
    expect(handler).not.toContain('setTimeout');
    expect(handler).not.toContain('Date.now');
    expect(handler).not.toContain('setInterval');
  });
});

describe('v527 book page — the Download all bar’s seat', () => {
  it('stands beneath the Ten Stops card with his label and the book’s total size', async () => {
    const { root } = await renderBook('Ruth');
    const tourAt = pressableIndex(root, 'Download Ten Stops in Ruth');
    const barAt = pressableIndex(root, 'Download all Ruth devotionals');
    const cell1 = cellFor(root, 1);
    const allPressables = root.findAll((n: any) => typeof n.props?.onPress === 'function');
    const gridAt = allPressables.indexOf(cell1);
    expect(tourAt).toBeGreaterThan(-1);
    expect(barAt).toBeGreaterThan(tourAt);
    expect(gridAt).toBeGreaterThan(barAt);
    // The label is his words, and the book's total devotional
    // size rides the bar (2,179,546 bytes → 2.1 MB).
    expect(renderedText(root)).toContain('Download all');
    expect(renderedText(root)).toContain('2.1 MB');
  });

  it('a tap on the bar starts the whole book’s download', async () => {
    const { root } = await renderBook('Ruth');
    barRig.startBook.mockClear();
    await press(pressableWithText(root, 'Download all'));
    expect(barRig.startBook).toHaveBeenCalledTimes(1);
    expect(barRig.startBook).toHaveBeenCalledWith('Ruth');
  });
});
