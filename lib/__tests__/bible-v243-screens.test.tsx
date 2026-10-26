/**
 * v243 — the Bible screens' hardening, held as pins.
 *
 * The Oct 25 blank-Bible diagnosis (hidden_files/blank-bible-diagnosis.md)
 * found two structural gaps the v241 boundary did not close:
 *
 *  1. app/bible-chapter.tsx wore NO BibleScreenBoundary at all — the
 *     reader was the only Bible surface that could still fail silently.
 *  2. app/bible-book.tsx computed every per-chapter display state in
 *     the screen component's OWN body and handed the finished JSX to
 *     the boundary as children — a throw in those computes happens in
 *     the parent, where a child boundary cannot catch it.
 *
 * v243 closes both: the chapter shell wears the boundary around
 * ChapterPageView, and the Book screen's content moved into
 * BibleBookContent, rendered INSIDE the boundary by the shell.
 *
 * Harness truth (v241, verified against react-dom directly): the
 * server renderer treats a render throw as fatal even with a boundary
 * in the tree — boundaries recover on the client renderer, which is
 * where the app runs. So these pins are (a) the wiring itself, asserted
 * on the sources, and (b) the Book screen's first paint mounting whole
 * through the new shell with the diagnosis's poison sitting in
 * storage. The poison's data-layer proof lives in
 * bible-v243-sanitize.test.ts.
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

import BibleBookScreen from '../../app/bible-book';
import { STUDIO_IMPORT_KEY } from '../bible-v205/studio-import';

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');

/** The diagnosis's synthetic poison, as stored JSON. */
const BLOCKS_LESS_JSON = JSON.stringify({
  'Genesis|1': {
    chapter: 1,
    intro: [{ kind: 'para', text: 'In the beginning.' }],
    previously: [],
    outline: [],
    sections: [{ start: 1, end: 3, title: null, entries: [{ start: 1, end: 3 }] }],
    stories: [],
  },
});

describe('v243 — wiring: every Bible screen renders its content under the boundary', () => {
  it('the chapter shell wears the boundary around the chapter page', () => {
    const src = read('app/bible-chapter.tsx');
    const open = src.indexOf('<BibleScreenBoundary>');
    const page = src.indexOf('<ChapterPageView');
    const close = src.indexOf('</BibleScreenBoundary>');
    expect(open).toBeGreaterThan(-1);
    expect(page).toBeGreaterThan(open);
    expect(close).toBeGreaterThan(page);
  });

  it('all four Bible screens now reference the boundary', () => {
    for (const f of [
      'app/bible-chapters.tsx',
      'app/bible-book.tsx',
      'app/bible-queue.tsx',
      'app/bible-chapter.tsx',
    ]) {
      expect(read(f), f).toContain('BibleScreenBoundary');
    }
  });

  it('the Book screen renders BibleBookContent INSIDE the boundary from its shell', () => {
    const src = read('app/bible-book.tsx');
    expect(src).toContain('function BibleBookContent()');
    const shell = src.indexOf('export default function BibleBookScreen()');
    expect(shell).toBeGreaterThan(-1);
    const tail = src.slice(shell);
    const open = tail.indexOf('<BibleScreenBoundary>');
    const content = tail.indexOf('<BibleBookContent />');
    const close = tail.indexOf('</BibleScreenBoundary>');
    expect(open).toBeGreaterThan(-1);
    expect(content).toBeGreaterThan(open);
    expect(close).toBeGreaterThan(content);
  });

  it('the Book screen no longer hands pre-built JSX to the boundary', () => {
    // The v241 shape — boundary as a downstream child of the component
    // whose body did the computing — is the gap the diagnosis named.
    expect(read('app/bible-book.tsx')).not.toContain('<BibleScreenBoundary>{content}</BibleScreenBoundary>');
  });
});

describe('v243 — the Book screen mounts whole with the poison in storage', () => {
  store.set(STUDIO_IMPORT_KEY, BLOCKS_LESS_JSON);
  const html = renderToString(React.createElement(BibleBookScreen)).replace(/<!-- -->/g, '');

  it('paints the book page: topbar, title and chapter sumline', () => {
    expect(html).toContain('Genesis');
    expect(html).toContain('Study Queue');
    expect(html).toContain('50 chapters');
  });

  it('paints the chapter grid and the detail strip through the new shell', () => {
    expect(html).toContain('Your Study');
    expect(html).toContain('Read Chapter');
    expect(html).toContain('Mark as Read');
  });
});
