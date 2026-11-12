/**
 * v504 — the shadow fix: the list's animated wrapper must not
 * outlive the switch.
 *
 * On Jonathan's phone, v503's book cards wore a grey shadow
 * halo wrapped around all four sides: the sections sat
 * permanently inside a ReAnimated.View whose animated style
 * (opacity + scale) stayed applied at rest, and on Android a
 * transformed/opacity ancestor forces its children into an
 * offscreen layer, through which their elevation shadows
 * composite as a hard outline instead of falling softly.
 * v504 mounts the animated wrapper ONLY while a switch is in
 * flight and drops it the moment the fade-in completes — the
 * detach is driven by the animation's own completion callback.
 *
 * This rig extends the v503 interactive rig's reanimated mock
 * with the two behaviours the fix rides on: withTiming carries
 * a completion callback (invoked with true on completion,
 * false when the animation is cancelled by a new assignment),
 * and runOnJS calls through.
 *
 * Pinned:
 *  - at rest on first mount, the list's wrapper (the ScrollView
 *    child standing over the sections) carries NO opacity and
 *    NO transform in its style — the pre-v503 resting tree;
 *  - mid-switch the animated style IS present, with the v503
 *    values (fade-out toward 0, swap, fade-in from opacity 0 /
 *    scale 0.98);
 *  - when the fade-in completes, the wrapper is plain again —
 *    no opacity, no transform — with the filtered content
 *    standing exactly as the completed switch left it;
 *  - rapid taps still settle plain: a tap landing mid-fade-out
 *    (before the swap) and a tap landing mid-fade-in (whose
 *    cancelled callback reports finished=false and must NOT
 *    detach the new switch's wrapper) both end with the last
 *    tapped group standing in the plain resting tree;
 *  - under reduce motion the wrapper never carries the
 *    animated style at all.
 */
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type TimingCallback = (finished?: boolean) => void;

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
    let anim: {
      from: number;
      to: number;
      elapsed: number;
      duration: number;
      callback?: TimingCallback;
    } | null = null;
    const cancel = () => {
      if (!anim) return;
      const cb = anim.callback;
      anim = null;
      rig.animations.delete(entry);
      if (cb) cb(false);
    };
    const entry = {
      step(ms: number) {
        if (!anim) return;
        anim.elapsed += ms;
        const t = Math.min(1, anim.elapsed / anim.duration);
        current = anim.from + (anim.to - anim.from) * t;
        if (t >= 1) {
          const cb = anim.callback;
          anim = null;
          rig.animations.delete(entry);
          if (cb) cb(true);
        }
      },
    };
    const sv: Record<string, unknown> = {};
    Object.defineProperty(sv, 'value', {
      get: () => current,
      set: (v: unknown) => {
        // Any assignment retires the running animation, and a
        // retired animation reports finished=false — exactly
        // the contract the v504 detach guards on.
        cancel();
        if (v !== null && typeof v === 'object' && (v as { __timing?: boolean }).__timing === true) {
          const d = v as { to: number; duration: number; callback?: TimingCallback };
          anim = { from: current, to: d.to, elapsed: 0, duration: d.duration, callback: d.callback };
          rig.animations.add(entry);
        } else {
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
    runOnJS: (fn: (...args: any[]) => unknown) => (...args: any[]) => fn(...args),
    useSharedValue: (initial: number) => {
      const ref = React.useRef<unknown>(null);
      if (ref.current === null) ref.current = makeSharedValue(initial);
      return ref.current;
    },
    useAnimatedStyle: (fn: () => unknown) => fn(),
    withTiming: (to: number, config?: { duration?: number }, callback?: TimingCallback) => ({
      __timing: true,
      to,
      duration: config?.duration ?? 300,
      callback,
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
import { CHAPTER_COUNTS } from '../bible-v205/index';
import { seedStudyState, STUDY_KEY } from '../bible-v205/study';

const CANON = new Set(Object.keys(CHAPTER_COUNTS));

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

function chip(root: ReactTestInstance, label: string): ReactTestInstance {
  const found = root
    .findAllByType('Pressable')
    .filter((p) => CHIP_LABELS.includes(p.props.accessibilityLabel))
    .find((p) => p.props.accessibilityLabel === label);
  expect(found, `chip ${label}`).toBeTruthy();
  return found!;
}

/** Book rows wear the row style (18px vertical padding) — the
 *  same measure the v503 rig uses. */
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

function sectionLabels(root: ReactTestInstance): string[] {
  return root
    .findAllByType('Text')
    .filter((t) => flatStyle(t.props.style).letterSpacing === 1.8)
    .map(textOf);
}

/** The list's wrapper: the ScrollView's direct child standing
 *  over the sections — walk up from a book row to the node
 *  whose parent is the page ScrollView. This is the ancestor
 *  whose style decides whether the cards' shadows composite
 *  through an offscreen layer on Android. */
function listWrapper(root: ReactTestInstance): ReactTestInstance {
  const row = bookRows(root)[0];
  expect(row, 'a book row to climb from').toBeTruthy();
  let node = row!;
  while (node.parent && (node.parent as ReactTestInstance).type !== 'ScrollView') {
    node = node.parent as ReactTestInstance;
  }
  return node;
}

/** The wrapper's animation state, read off its flattened
 *  style: the animated style contributes `opacity` and
 *  `transform` keys; the plain resting style contributes
 *  neither (it is null under All, a lone paddingTop under a
 *  filter). */
function wrapperAnim(root: ReactTestInstance): {
  hasOpacity: boolean;
  hasTransform: boolean;
  opacity?: number;
  scale?: number;
} {
  const st = flatStyle(listWrapper(root).props.style);
  const transform = st.transform as Array<{ scale?: number }> | undefined;
  return {
    hasOpacity: 'opacity' in st,
    hasTransform: 'transform' in st,
    opacity: typeof st.opacity === 'number' ? st.opacity : undefined,
    scale: Array.isArray(transform) ? transform[0]?.scale : undefined,
  };
}

async function flush(ms = 0) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

/** Advance every running animation by ms, then re-render so
 *  the rig's eagerly-evaluated animated styles re-read their
 *  shared values (the v503 rig's standing note). */
async function step(renderer: ReactTestRenderer, ms: number) {
  await act(async () => {
    rig.stepAll(ms);
    renderer.update(React.createElement(BibleBooksScreen));
  });
}

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

describe('v504 — the list wrapper lives only for the switch', () => {
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

  it('at rest on first mount the wrapper carries no opacity and no transform', async () => {
    seedFourGroupState();
    const root = await mountScreen();
    expect(sectionLabels(root)).toEqual(['Current', 'Finished', 'Written', 'Not Started']);
    expect(rowBooks(root)).toHaveLength(66);
    const anim = wrapperAnim(root);
    expect(anim.hasOpacity).toBe(false);
    expect(anim.hasTransform).toBe(false);
  });

  it('mid-switch the animated style is present with the v503 values; on completion the wrapper is plain again', async () => {
    seedFourGroupState();
    const root = await mountScreen();
    act(() => {
      chip(root, 'Written books').props.onPress();
    });
    // The wrapper mounted for the switch, fade-out under way
    // from full opacity / full scale. (The fade-out's own
    // mid-flight values are not probed: its 120ms swap timer
    // runs on real time, so a numeric mid-fade read would race
    // it — the fade-in below is stepped deterministically and
    // carries the value pins.)
    let anim = wrapperAnim(root);
    expect(anim.hasOpacity).toBe(true);
    expect(anim.hasTransform).toBe(true);
    expect(anim.opacity).toBe(1);
    expect(anim.scale).toBe(1);
    // The 120ms swap lands: Written stands alone, and the
    // fade-in starts from opacity 0 / scale 0.98.
    await flush(250);
    expect(rowBooks(root)).toContain('Ruth');
    expect(rowBooks(root)).not.toContain('Genesis');
    expect(sectionLabels(root)).toEqual([]);
    anim = wrapperAnim(root);
    expect(anim.hasOpacity).toBe(true);
    expect(anim.opacity).toBe(0);
    expect(anim.scale).toBeCloseTo(0.98);
    await step(renderer!, 150);
    anim = wrapperAnim(root);
    expect(anim.opacity).toBeCloseTo(0.5);
    expect(anim.scale).toBeCloseTo(0.99);
    // The fade-in completes — its own callback drops the
    // wrapper. The content stands exactly as the switch left
    // it, in the plain resting tree.
    await step(renderer!, 150);
    anim = wrapperAnim(root);
    expect(anim.hasOpacity).toBe(false);
    expect(anim.hasTransform).toBe(false);
    expect(rowBooks(root)).toContain('Ruth');
    expect(rowBooks(root)).not.toContain('Genesis');
    expect(sectionLabels(root)).toEqual([]);
  });

  it('a rapid second tap mid-fade-out still settles into the plain resting tree', async () => {
    seedFourGroupState();
    const root = await mountScreen();
    act(() => {
      chip(root, 'Written books').props.onPress();
    });
    // The second tap lands before the first switch's 120ms
    // swap timer has fired.
    await flush(50);
    act(() => {
      chip(root, 'Current books').props.onPress();
    });
    await flush(250);
    const books = rowBooks(root);
    expect(books).toContain('Genesis');
    expect(books).not.toContain('Ruth');
    expect(books).not.toContain('Leviticus');
    await step(renderer!, 300);
    const anim = wrapperAnim(root);
    expect(anim.hasOpacity).toBe(false);
    expect(anim.hasTransform).toBe(false);
    expect(rowBooks(root)).toContain('Genesis');
  });

  it('a tap mid-fade-in does not let the cancelled callback detach the new switch early', async () => {
    seedFourGroupState();
    const root = await mountScreen();
    act(() => {
      chip(root, 'Written books').props.onPress();
    });
    await flush(250);
    // Halfway through the fade-in…
    await step(renderer!, 100);
    expect(wrapperAnim(root).opacity).toBeCloseTo(1 / 3);
    // …the next tap cancels it (finished=false). The NEW
    // switch's wrapper must still be mounted and animated —
    // a detach here is the failure this pin exists to catch.
    act(() => {
      chip(root, 'Finished books').props.onPress();
    });
    const midAnim = wrapperAnim(root);
    expect(midAnim.hasOpacity).toBe(true);
    expect(midAnim.hasTransform).toBe(true);
    // The new switch runs its course and settles plain.
    await flush(250);
    expect(rowBooks(root)).toContain('Leviticus');
    expect(rowBooks(root)).not.toContain('Ruth');
    await step(renderer!, 300);
    const anim = wrapperAnim(root);
    expect(anim.hasOpacity).toBe(false);
    expect(anim.hasTransform).toBe(false);
    expect(rowBooks(root)).toContain('Leviticus');
  });

  it('under reduce motion the wrapper never carries the animated style', async () => {
    rig.reduceMotion = true;
    seedFourGroupState();
    const root = await mountScreen();
    await flush();
    act(() => {
      chip(root, 'Written books').props.onPress();
    });
    await flush(250);
    expect(rowBooks(root)).toContain('Ruth');
    expect(rowBooks(root)).not.toContain('Genesis');
    const anim = wrapperAnim(root);
    expect(anim.hasOpacity).toBe(false);
    expect(anim.hasTransform).toBe(false);
  });
});
