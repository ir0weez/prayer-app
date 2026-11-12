/**
 * v505 — NO shadow on the Books list book cards (Jonathan's
 * ruling, 2026-11-11 ~21:22 PST, on the v504 phone screenshot:
 * "What? Why is there a shadow at all? I don't want there to
 * be a shadow. It doesn't really fit with anything else in
 * the app.").
 *
 * v504 removed the v503 halo by detaching the crossfade
 * wrapper at rest, but the cards still wore their underlying
 * dress: palette.cardDress (boxShadow material.shadowCard +
 * elevation 4), applied at the book row in bible-chapters.tsx
 * since the v311/v420 dress. v505 removes palette.cardDress
 * from THIS ROW ONLY — the rendered book cards carry no
 * boxShadow and no elevation from any source. palette.cardDress
 * itself is untouched: every other surface that wears it
 * (bible-book detail box, downloads rows, queue items,
 * chapter-page cards, ten-stops card…) keeps its dress.
 *
 * Pinned:
 *  - every rendered book row's flattened style carries NO
 *    boxShadow, NO elevation, and no shadow* key of any kind;
 *  - the row still carries backgroundColor palette.paper2,
 *    borderRadius 16, and the bookrow measure (18px padding,
 *    12px between rows);
 *  - palette.cardDress itself is unchanged (borderRadius 28,
 *    a real boxShadow, elevation 4) — other surfaces keep it.
 *
 * The render rig is the v503/v504 rig's mock set, unchanged.
 */
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const rig = vi.hoisted(() => ({ reduceMotion: false }));

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
    const sv: Record<string, unknown> = {};
    Object.defineProperty(sv, 'value', {
      get: () => current,
      set: (v: unknown) => {
        current = v as number;
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
    withTiming: (to: number, config?: { duration?: number }, callback?: (finished?: boolean) => void) => ({
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
import { buildBiblePalette } from '@/components/bible-v205/palette';
import type { ThemeColorPalette } from '@/constants/theme';
import { getThemedPalette } from '../color-themes';
import { seedStudyState, STUDY_KEY } from '../bible-v205/study';

// color-themes' getThemedPalette alias differs from the runtime
// palette type buildBiblePalette takes — use-colors bridges the
// same gap at runtime (the v420 test's standing note).
function expectedPalette() {
  return buildBiblePalette(getThemedPalette('light', 'default') as unknown as ThemeColorPalette);
}

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

/** Book rows wear the row style (18px vertical padding) — the
 *  same measure the v503/v504 rigs use. */
function bookRows(root: ReactTestInstance): ReactTestInstance[] {
  return root
    .findAllByType('Pressable')
    .filter((p) => flatStyle(p.props.style).paddingVertical === 18);
}

async function flush(ms = 0) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

function seedState() {
  const s = seedStudyState();
  s.currentBook = 'Genesis';
  const overrides: Record<string, string> = { 'Genesis|1': 'complete' };
  s.overrides = overrides as typeof s.overrides;
  store.set(STUDY_KEY, JSON.stringify(s));
}

describe('v505 — the Books list book cards carry no shadow at all', () => {
  let renderer: ReactTestRenderer | null = null;

  beforeEach(() => {
    store.clear();
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

  it('every book row renders with no boxShadow, no elevation, no shadow key of any kind', async () => {
    seedState();
    const root = await mountScreen();
    const rows = bookRows(root);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const st = flatStyle(row.props.style);
      expect(st.boxShadow, 'book row boxShadow').toBeUndefined();
      expect(st.elevation, 'book row elevation').toBeUndefined();
      for (const key of Object.keys(st)) {
        expect(key.startsWith('shadow'), `book row style key ${key}`).toBe(false);
      }
    }
  });

  it('the row still wears paper2, radius 16, and the bookrow measure', async () => {
    seedState();
    const root = await mountScreen();
    const expected = expectedPalette();
    const rows = bookRows(root);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const st = flatStyle(row.props.style);
      expect(st.backgroundColor).toBe(expected.paper2);
      expect(st.borderRadius).toBe(16);
      expect(st.paddingVertical).toBe(18);
      expect(st.paddingHorizontal).toBe(18);
      expect(st.marginBottom).toBe(12);
    }
  });

  it('palette.cardDress itself is unchanged — other surfaces keep their dress', () => {
    const palette = expectedPalette();
    expect(palette.cardDress.elevation).toBe(4);
    expect(palette.cardDress.borderRadius).toBe(28);
    expect(typeof palette.cardDress.boxShadow).toBe('string');
    expect((palette.cardDress.boxShadow as string).length).toBeGreaterThan(0);
  });
});
