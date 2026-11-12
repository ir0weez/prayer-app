/**
 * v503 — the Books filter, pressed. The bar and the real Books
 * screen mount under react-test-renderer (the people-v491 rig:
 * host-string react-native stubs, a stepping reanimated mock),
 * with the study store seeded in AsyncStorage to a four-group
 * state — Genesis Current, Leviticus Finished (read through),
 * Ruth Written (complete through), the rest Not Started.
 *
 * Pinned:
 *  - the pill seats on All at first layout with NO travel, then
 *    travels to the tapped chip over the demo's 380ms — mid-way
 *    at half time, landed at the chip's own rect at the end
 *    (left AND width: it stretches, it does not hop);
 *  - under reduce motion the pill is simply there — no stepping
 *    needed, no travel at all;
 *  - tapping a section chip moves the CHIP at once (selected
 *    state + pill) while the list still shows the old sections —
 *    the swap waits out the 120ms fade — and then the list shows
 *    ONLY that group, its section label gone;
 *  - the filter is mount-local: a fresh mount is All again, the
 *    full page as it stood;
 *  - filtering onto an empty group shows an empty list — no
 *    rows, no label, no placeholder.
 */
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const rig = vi.hoisted(() => {
  const animations = new Set<{ step: (ms: number) => void }>();
  return {
    animations,
    reduceMotion: false,
    stepAll(ms: number) {
      for (const entry of [...animations]) entry.step(ms);
    },
  };
});

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

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  Pressable: 'Pressable',
  Modal: 'Modal',
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
    hairlineWidth: 0.5,
    absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  },
  AccessibilityInfo: {
    isReduceMotionEnabled: async () => rig.reduceMotion,
    addEventListener: () => ({ remove: () => {} }),
  },
  Platform: { OS: 'android', select: (o: any) => o.android ?? o.default },
}));

vi.mock('react-native-reanimated', async () => {
  const React = await import('react');

  function makeSharedValue(initial: number) {
    let current = initial;
    let anim: { from: number; to: number; elapsed: number; duration: number } | null = null;
    const entry = {
      step(ms: number) {
        if (!anim) return;
        anim.elapsed += ms;
        const t = Math.min(1, anim.elapsed / anim.duration);
        current = anim.from + (anim.to - anim.from) * t;
        if (t >= 1) {
          anim = null;
          rig.animations.delete(entry);
        }
      },
    };
    const sv: Record<string, unknown> = {};
    Object.defineProperty(sv, 'value', {
      get: () => current,
      set: (v: unknown) => {
        if (v !== null && typeof v === 'object' && (v as { __timing?: boolean }).__timing === true) {
          const d = v as { to: number; duration: number };
          anim = { from: current, to: d.to, elapsed: 0, duration: d.duration };
          rig.animations.add(entry);
        } else {
          anim = null;
          rig.animations.delete(entry);
          current = v as number;
        }
      },
    });
    return sv;
  }

  return {
    __esModule: true,
    default: { View: 'View', Text: 'Text', ScrollView: 'ScrollView', createAnimatedComponent: (c: unknown) => c },
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    createAnimatedComponent: (c: unknown) => c,
    Easing: { bezier: () => ({}) },
    useSharedValue: (initial: number) => {
      const ref = React.useRef<unknown>(null);
      if (ref.current === null) ref.current = makeSharedValue(initial);
      return ref.current;
    },
    useAnimatedStyle: (fn: () => unknown) => fn(),
    withTiming: (to: number, config?: { duration?: number }) => ({
      __timing: true,
      to,
      duration: config?.duration ?? 300,
    }),
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

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 0, left: 0 }),
}));

vi.mock('@expo/vector-icons/MaterialIcons', () => ({
  default: () => null,
}));

vi.mock('@/hooks/use-colors', async () => {
  const { getThemedPalette } = await import('../color-themes');
  return { useColors: () => getThemedPalette('light', 'default') };
});

vi.mock('@/hooks/use-skin', async () => {
  const { getThemedPalette } = await import('../color-themes');
  const { getSkinTokens } = await import('../skin-themes');
  return {
    useSkin: () => {
      const colors = getThemedPalette('light', 'default');
      return {
        skin: 'classic',
        isPaper: false,
        isEightBit: false,
        isTerminal: false,
        isSkinned: false,
        monoFont: undefined,
        tokens: getSkinTokens('classic', 'light', colors as any),
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

vi.mock('@/components/app-tab-bar', () => ({
  BibleTabBar: () => null,
  useTabBarOccupiedHeight: () => 0,
}));

vi.mock('@/components/bible-v205/reading-progress-card', () => ({
  StudyProgressHeader: () => null,
  BookReadingThread: () => null,
}));

vi.mock('@/components/top-fade', () => ({
  TopFade: () => null,
  topFadeScrollHandler: () => () => {},
  useTopFadeScrollY: () => ({ value: 0 }),
}));

vi.mock('@/lib/downloads', () => ({
  downloadsCardModel: () => ({ visible: false, line: '', newestBook: null, totalBytes: 0 }),
  refreshDownloads: async () => {},
  useDownloadedAudio: () => [],
}));

import BibleBooksScreen from '../../app/bible-chapters';
import { BooksFilterBar } from '../../components/bible-v205/books-filter-bar';
import { buildBiblePalette } from '../../components/bible-v205/palette';
import { getThemedPalette } from '../color-themes';
import { CHAPTER_COUNTS } from '../bible-v205/index';
import { seedStudyState, STUDY_KEY } from '../bible-v205/study';
import type { BooksFilterKey } from '../bible-v205/books-filter';

const CANON = new Set(Object.keys(CHAPTER_COUNTS));
const palette = buildBiblePalette(getThemedPalette('light', 'default') as any);

// ─── probes ──────────────────────────────────────────────────────

function flatStyle(style: unknown): Record<string, any> {
  if (Array.isArray(style)) {
    const out: Record<string, any> = {};
    for (const s of style) Object.assign(out, flatStyle(s));
    return out;
  }
  if (style !== null && typeof style === 'object') return style as Record<string, any>;
  return {};
}

function textOf(inst: ReactTestInstance): string {
  let out = '';
  const walk = (node: unknown): void => {
    if (typeof node === 'string') out += node;
    else if (typeof node === 'number') out += String(node);
    else if (node !== null && typeof node === 'object') {
      const children = (node as ReactTestInstance).children;
      if (Array.isArray(children)) children.forEach(walk);
    }
  };
  walk(inst);
  return out;
}

const CHIP_LABELS = ['All books', 'Current books', 'Finished books', 'Written books', 'Not Started books'];

function chips(root: ReactTestInstance): ReactTestInstance[] {
  return root
    .findAllByType('Pressable')
    .filter((p) => CHIP_LABELS.includes(p.props.accessibilityLabel));
}

function chip(root: ReactTestInstance, label: string): ReactTestInstance {
  const found = chips(root).find((p) => p.props.accessibilityLabel === label);
  expect(found, `chip ${label}`).toBeTruthy();
  return found!;
}

/** The travelling pill: the one absolute, pill-shaped, pointer-
 *  transparent view in the bar. */
function pill(root: ReactTestInstance): ReactTestInstance {
  const found = root
    .findAllByType('View')
    .find((v) => {
      const st = flatStyle(v.props.style);
      return v.props.pointerEvents === 'none' && st.position === 'absolute' && st.borderRadius === 999;
    });
  expect(found, 'the travelling pill').toBeTruthy();
  return found!;
}

function pillSeat(root: ReactTestInstance): { left: number; width: number } {
  const st = flatStyle(pill(root).props.style);
  return { left: st.left, width: st.width };
}

/** Book rows wear the row style (18px vertical padding); the
 *  Jump-to-Book sheet's rows (9px) and every other pressable are
 *  excluded by the same measure. */
function bookRows(root: ReactTestInstance): ReactTestInstance[] {
  return root
    .findAllByType('Pressable')
    .filter((p) => flatStyle(p.props.style).paddingVertical === 18);
}

function rowBook(row: ReactTestInstance): string | null {
  for (const t of row.findAllByType('Text')) {
    const first = Array.isArray(t.props.children) ? t.props.children[0] : t.props.children;
    if (typeof first === 'string' && CANON.has(first)) return first;
  }
  return null;
}

function rowBooks(root: ReactTestInstance): string[] {
  return bookRows(root).map(rowBook).filter((b): b is string => b !== null);
}

/** Section labels wear the subhead style (letterspaced caps). */
function sectionLabels(root: ReactTestInstance): string[] {
  return root
    .findAllByType('Text')
    .filter((t) => flatStyle(t.props.style).letterSpacing === 1.8)
    .map(textOf);
}

function layout(inst: ReactTestInstance, rect: { x: number; y: number; width: number; height: number }) {
  act(() => {
    inst.props.onLayout({ nativeEvent: { layout: rect } });
  });
}

async function flush(ms = 0) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

const RECTS: Record<BooksFilterKey, { x: number; y: number; width: number; height: number }> = {
  all: { x: 0, y: 0, width: 52, height: 38 },
  current: { x: 59, y: 0, width: 86, height: 38 },
  finished: { x: 152, y: 0, width: 92, height: 38 },
  written: { x: 251, y: 0, width: 84, height: 38 },
  notStarted: { x: 342, y: 0, width: 112, height: 38 },
};
const RECT_BY_LABEL: Record<string, (typeof RECTS)[BooksFilterKey]> = {
  'All books': RECTS.all,
  'Current books': RECTS.current,
  'Finished books': RECTS.finished,
  'Written books': RECTS.written,
  'Not Started books': RECTS.notStarted,
};

function layoutAllChips(root: ReactTestInstance) {
  for (const c of chips(root)) layout(c, RECT_BY_LABEL[c.props.accessibilityLabel]);
}

// ─── the bar: the pill itself ────────────────────────────────────

function BarRig({ reduceMotion }: { reduceMotion: boolean }) {
  const [selected, setSelected] = React.useState<BooksFilterKey>('all');
  return (
    <BooksFilterBar palette={palette} selected={selected} onSelect={setSelected} reduceMotion={reduceMotion} />
  );
}

describe('v503 — the travelling pill', () => {
  let renderer: ReactTestRenderer | null = null;

  beforeEach(() => {
    rig.animations.clear();
    renderer = null;
  });

  function mount(reduceMotion: boolean) {
    act(() => {
      renderer = TestRenderer.create(<BarRig reduceMotion={reduceMotion} />);
    });
    return renderer!.root;
  }

  it('seats on All at first layout with no travel', () => {
    const root = mount(false);
    layoutAllChips(root);
    expect(pillSeat(root)).toEqual({ left: 0, width: 52 });
  });

  it('travels to the tapped chip over 380ms — stretching, not hopping', () => {
    const root = mount(false);
    layoutAllChips(root);
    act(() => {
      chip(root, 'Written books').props.onPress();
    });
    // The selection moved at once…
    expect(chip(root, 'Written books').props.accessibilityState.selected).toBe(true);
    expect(chip(root, 'All books').props.accessibilityState.selected).toBe(false);
    // …but the pill has not moved until time passes: it travels.
    expect(pillSeat(root).left).toBe(0);
    // (The rig's animated styles re-read their shared values on
    // render — on device the binding is live — so each step is
    // followed by a re-render inside act.)
    rig.stepAll(190);
    act(() => {
      renderer!.update(<BarRig reduceMotion={false} />);
    });
    const mid = pillSeat(root);
    expect(mid.left).toBeGreaterThan(0);
    expect(mid.left).toBeLessThan(251);
    expect(mid.width).toBeGreaterThan(52);
    expect(mid.width).toBeLessThan(84);
    rig.stepAll(190);
    act(() => {
      renderer!.update(<BarRig reduceMotion={false} />);
    });
    expect(pillSeat(root)).toEqual({ left: 251, width: 84 });
  });

  it('under reduce motion the pill jumps — seated with no stepping at all', () => {
    const root = mount(true);
    layoutAllChips(root);
    act(() => {
      chip(root, 'Finished books').props.onPress();
    });
    // No stepAll: the seat was assigned outright in the effect.
    // (The update only re-reads the rig's style binding — see the
    // travel test's note.)
    act(() => {
      renderer!.update(<BarRig reduceMotion />);
    });
    expect(pillSeat(root)).toEqual({ left: 152, width: 92 });
  });
});

// ─── the screen: the switch ──────────────────────────────────────

function seedFourGroupState() {
  const s = seedStudyState();
  s.currentBook = 'Genesis';
  const overrides: Record<string, string> = { 'Genesis|1': 'complete' };
  for (let c = 1; c <= 4; c++) overrides[`Ruth|${c}`] = 'complete';
  const reads: Record<string, string> = {};
  for (let c = 1; c <= 27; c++) reads[`Leviticus|${c}`] = '2026-01-01';
  s.overrides = overrides as typeof s.overrides;
  s.reads = reads;
  store.set(STUDY_KEY, JSON.stringify(s));
}

describe('v503 — the Books screen switch', () => {
  let renderer: ReactTestRenderer | null = null;

  beforeEach(() => {
    store.clear();
    rig.animations.clear();
    rig.reduceMotion = false;
    renderer = null;
  });

  async function mountScreen() {
    await act(async () => {
      renderer = TestRenderer.create(React.createElement(BibleBooksScreen));
    });
    await flush();
    await flush();
    return renderer!.root;
  }

  it('starts at All: the four sections stand with their labels and books', async () => {
    seedFourGroupState();
    const root = await mountScreen();
    expect(sectionLabels(root)).toEqual(['Current', 'Finished', 'Written', 'Not Started']);
    const books = rowBooks(root);
    expect(books).toContain('Genesis');
    expect(books).toContain('Leviticus');
    expect(books).toContain('Ruth');
    expect(books).toContain('Exodus');
    expect(books).toHaveLength(66);
  });

  it('a tap moves the chip at once; the list swaps only after the fade, to that group alone, label off', async () => {
    seedFourGroupState();
    const root = await mountScreen();
    act(() => {
      chip(root, 'Written books').props.onPress();
    });
    // The chip moved…
    expect(chip(root, 'Written books').props.accessibilityState.selected).toBe(true);
    // …the list has not: it is still the All page, mid-fade.
    expect(sectionLabels(root)).toContain('Written');
    expect(rowBooks(root)).toContain('Genesis');
    // After the fade-out's 120ms, the swap lands.
    await flush(250);
    const books = rowBooks(root);
    expect(books).toContain('Ruth');
    expect(books).toContain('Deuteronomy');
    expect(books).not.toContain('Genesis');
    expect(books).not.toContain('Leviticus');
    expect(books).not.toContain('Exodus');
    // The filtered group's own label is off — the lit chip says it.
    expect(sectionLabels(root)).toEqual([]);
  });

  it('a fresh mount is All again — the filter never persists', async () => {
    seedFourGroupState();
    const root = await mountScreen();
    act(() => {
      chip(root, 'Written books').props.onPress();
    });
    await flush(250);
    expect(sectionLabels(root)).toEqual([]);
    act(() => {
      renderer!.unmount();
    });
    const fresh = await mountScreen();
    expect(sectionLabels(fresh)).toEqual(['Current', 'Finished', 'Written', 'Not Started']);
    expect(rowBooks(fresh)).toContain('Genesis');
  });

  it('filtering onto an empty group shows an empty list — no rows, no label, no placeholder', async () => {
    // The seed state: Current and Finished stand empty.
    const root = await mountScreen();
    expect(sectionLabels(root)).toEqual(['Written', 'Not Started']);
    act(() => {
      chip(root, 'Finished books').props.onPress();
    });
    await flush(250);
    expect(bookRows(root)).toHaveLength(0);
    expect(sectionLabels(root)).toEqual([]);
  });
});
