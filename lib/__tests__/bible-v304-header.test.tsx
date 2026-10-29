// ─── v304 "Room to Read" — pins ─────────────────────────────────────
// His word (2026-10-28 10:05 PDT, screenshot of Leviticus 23 in
// With-notes mode): "This bar at the top is taking up a lot of
// space. Can we clean this up a bit so I have more room to read?"
// The chapter page's sticky header was three tall layers — title
// row, the v250 "Chapter progress" CARD, the mode row — eating the
// top quarter of the screen. v304 is compression, not redesign:
//
//  (1) the progress card is GONE — no card, no "Chapter progress"
//      label row, no 9px track in a padded box;
//  (2) its fill survives as a 4px THREAD spanning the full width at
//      the header's bottom edge — same scroll fraction, same seed
//      fill (palette.rasp over the raspTint track);
//  (3) the card's verse-range information ("Ver. 1–44 of 44 verses")
//      survives as compact muted text at the left of ONE slim row;
//  (4) the With notes / Read only segmented control shares that
//      row, slimmed (tighter track + button padding), still wired
//      to chooseReadMode both ways with the app-level preference
//      round-trip intact;
//  (5) the title row is untouched (back, title, kept pill, grid,
//      search), and the v251 measured-header contract holds at the
//      new part-sum: estimate 102 (was 164) — 62px back to reading.
//
// Harness limit (the v241/v247/v249/v251 precedent): react-dom/
// server over react-native-web runs no effects and no layout, so
// the mode preference never flips the SSR render and the header's
// onLayout never lands. What these pins hold is the contract that
// produces the behavior on device: the new structure in source,
// the toggle wiring in source, and the rendered first paint
// (thread + range on the page, no card, spacer at the estimate).

import React from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

// v339: the study surfaces' threads are WavyProgress now, which
// draws through react-native-svg — a module this harness cannot
// execute (the v326 precedent). Stub it as RNW Views; the pins
// hold source + structure, never the svg internals.
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

vi.mock('@/components/avatar-system', async () => {
  const React = await import('react');
  const { View } = await import('react-native-web');
  return { AvatarImage: (props: any) => React.createElement(View, props) };
});

vi.mock('expo-blur', async () => {
  const React = await import('react');
  const { View } = await import('react-native-web');
  return { BlurView: (props: any) => React.createElement(View, props, props?.children) };
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
  return { useColors: () => getThemedPalette('light', 'sunset' as any) };
});

vi.mock('@/hooks/use-skin', async () => {
  const { getThemedPalette } = await import('../color-themes');
  const { getSkinTokens } = await import('../skin-themes');
  return {
    useSkin: () => {
      const colors = getThemedPalette('light', 'sunset' as any);
      const tokens = getSkinTokens('classic' as any, 'light', colors as any);
      return {
        skin: 'classic',
        isPaper: false,
        isEightBit: false,
        isTerminal: false,
        isSkinned: false,
        monoFont: undefined,
        tokens,
        motion: {
          slide: { duration: tokens.motion.slideDuration, easing: {} },
          settle: { duration: tokens.motion.settleDuration, easing: {} },
          settleDistance: tokens.motion.settleDistance,
        },
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

import {
  ChapterPageView,
  estimateChapterHeaderHeight,
} from '../../components/bible-v205/chapter-page';

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');
const page = read('components/bible-v205/chapter-page.tsx');

describe('v304 — the progress card is gone; the thread carries its fill', () => {
  it('no card structure survives in source', () => {
    expect(page).not.toContain('ChapterProgressCard');
    expect(page).not.toContain('progCard');
    expect(page).not.toContain('Chapter progress');
    expect(page).not.toContain('progLabRow');
    expect(page).not.toContain('progTrack');
    expect(page).not.toContain('styles.modeRow');
    expect(page).not.toContain('modeRow:');
  });

  it('the thread is a full-width line at the scroll fraction — wavy since v339, seed on tint', () => {
    expect(page).toContain('testID="chapter-progress-thread"');
    expect(page).toContain("progThread: { position: 'relative' }");
    // v339: the straight 4px fill (and its perpetual shimmer) became
    // the shared wavy bar; the value is still the measured scroll
    // fraction, clamped inside WavyProgress.
    expect(page).toContain(
      '<WavyProgress value={progress} color={palette.rasp} trackColor={palette.raspTint} height={8} />',
    );
    expect(page).not.toContain('progShimmer');
    expect(page).not.toContain('Animated.loop');
  });

  it('the header order is title row → slim row → thread at the bottom edge', () => {
    const topbar = page.indexOf('styles.topbar');
    const meta = page.indexOf('styles.metaRow');
    const thread = page.indexOf('<ChapterProgressThread');
    expect(topbar).toBeGreaterThan(-1);
    expect(meta).toBeGreaterThan(topbar);
    expect(thread).toBeGreaterThan(meta);
  });
});

describe('v304 — one slim row: the verse range and the mode control share it', () => {
  it('the range survives as compact muted text at the row’s left', () => {
    expect(page).toContain('testID="chapter-verse-range"');
    // v313 re-base: the range takes the drawing's 12px (was 11.5).
    expect(page).toContain("metaRange: { flex: 1, fontSize: 12, fontWeight: '600' }");
    expect(page).toContain('style={[styles.metaRange, { color: palette.inkSoft }]}');
    // The same real label the card carried — the section at the
    // scroll head against the chapter's verse count.
    expect(page).toContain(
      '`Ver. 1–${headSectionEnd ?? sections[0]?.end ?? verseCount} of ${verseCount} verses`',
    );
    expect(page).toContain(
      "metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }",
    );
  });

  it('the segmented control is slimmed, and the toggle is wired both ways', () => {
    // v313 re-base: the control takes the drawing's dress — an
    // outline track (borderWidth 1, color inline) and 7/14 spans.
    expect(page).toContain("modeSeg: { flexDirection: 'row', borderRadius: 999, borderWidth: 1, padding: 3, gap: 2 }");
    expect(page).toContain("modeBtn: { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 }");
    expect(page).not.toContain("modeBtn: { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 16 }");
    expect(page).toContain('onPress={() => chooseReadMode(false)}');
    expect(page).toContain('onPress={() => chooseReadMode(true)}');
    expect(page).toContain('With notes');
    expect(page).toContain('Read only');
    // The app-level preference round-trip is untouched.
    expect(page).toContain("only ? 'read-only' : 'with-notes'");
    expect(page).toContain("setReadOnly(v === 'read-only')");
  });
});

describe('v304 — the title row and the measured clearance are untouched', () => {
  it('back, title, kept pill, grid and search keep their places', () => {
    expect(page).toContain('styles.topbar, { paddingTop: topInset + 8 }');
    expect(page).toContain('{keptTotal} kept');
    expect(page).toContain('accessibilityLabel="Verse index"');
    expect(page).toContain('accessibilityLabel="Search this chapter"');
  });

  it('the estimate is the new part-sum — 62px shorter than the card stack', () => {
    expect(estimateChapterHeaderHeight(0)).toBe(102);
    expect(estimateChapterHeaderHeight(24)).toBe(126);
    expect(estimateChapterHeaderHeight(0)).toBeLessThan(164);
    // The measured machinery still sizes the spacer.
    expect(page).toContain('<View pointerEvents="none" style={{ height: headerH }} />');
  });
});

describe('v304 — rendered first paint', () => {
  const html = renderToString(
    React.createElement(ChapterPageView, {
      book: 'Genesis',
      chapter: 1,
      onBack: () => {},
      onOpenBook: () => {},
      onOpenQueue: () => {},
      onNavigateChapter: () => {},
    }),
  ).replace(/<!-- -->/g, '');

  it('paints the thread and the range, both toggle labels, and no card', () => {
    expect(html).toContain('data-testid="chapter-progress-thread"');
    expect(html).toContain('data-testid="chapter-verse-range"');
    expect(html).toContain('With notes');
    expect(html).toContain('Read only');
    expect(html).not.toContain('Chapter progress');
  });

  it('the content spacer opens at the new estimated height (rig inset 24 → 126)', () => {
    expect(html).toContain('height:126px');
    expect(html).not.toContain('height:188px');
  });
});
