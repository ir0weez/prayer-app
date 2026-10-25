/**
 * v241 — the zero-books guard. The Books screen groups the whole
 * canon (66 books) into Current / Finished / Not Started; a grouping
 * with ZERO books is impossible in a healthy build. Before v241 that
 * state would have painted an empty page — the same silent shape as
 * the blank Books view Jonathan hit on Oct 24. The guard puts a
 * visible word in its place. This file mounts the real screen with
 * the canon stubbed empty (the data layer's worst day) and holds the
 * guard to it; against the pre-v241 screen this render is an empty
 * list and every assertion here fails.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

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
    useRouter: () => ({ push: () => {}, back: () => {}, replace: () => {} }),
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
  return { useColors: () => getThemedPalette('dark', 'default') };
});

vi.mock('@/hooks/use-skin', async () => {
  const { getThemedPalette } = await import('../color-themes');
  const { getSkinTokens } = await import('../skin-themes');
  const colors = getThemedPalette('dark', 'default');
  return {
    useSkin: () => ({
      skin: 'classic',
      isPaper: false,
      isEightBit: false,
      isTerminal: false,
      isSkinned: false,
      monoFont: undefined,
      tokens: getSkinTokens('classic', 'dark', colors as any),
      motion: { slide: { duration: 0 }, settle: { duration: 0 }, settleDistance: 0 },
    }),
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

// The data layer's worst day: the canon itself comes back empty.
vi.mock('@/lib/bible-v205/index', async (importOriginal) => {
  const orig: any = await importOriginal();
  return { ...orig, CHAPTER_COUNTS: {}, notesChapterCount: () => 0 };
});

import BibleBooksScreen from '../../app/bible-chapters';

describe('v241 — zero books across all three sections renders the guard, not a blank', () => {
  const html = renderToString(React.createElement(BibleBooksScreen)).replace(/<!-- -->/g, '');

  it('shows the visible fallback message with a way back', () => {
    expect(html).toContain('book list');
    expect(html).toContain('All 66 books belong on this page');
    expect(html).toContain('Go back');
  });

  it('renders no book rows and no section subheads', () => {
    expect(html).not.toContain('Genesis');
    expect(html).not.toContain('Revelation');
    expect(html).not.toContain('of 150 complete');
  });

  it('the rest of the screen still paints (topbar + header)', () => {
    expect(html).toContain('Study Queue');
    expect(html).toContain('Your Books');
  });
});
