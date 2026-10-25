/**
 * v246 — the Bible, in every theme. Jonathan, Oct 25, 11:20–11:24 PDT:
 * the Bible pages were STILL blank on v243–v245 under his setup —
 * App Skin = Paper, Color Theme = Sunset — in light (09:00, 11:20)
 * and dark (Oct 24 23:46) alike. He reset his appearance to default
 * and the Bible worked, and asked: "Maybe the Bible needs to be
 * updated to the theme?"
 *
 * He was right, and the harness can now see what his phone saw. The
 * token layer is innocent — the pure sweep below proves the verse
 * ink clears 4.5:1 in every skin × accent × scheme combination
 * (v220's resolver doing its job). The break is structural: the four
 * Bible surfaces are the app's ONLY whole-screen settle roots. Under
 * Paper and 8-bit each wraps its entire screen in PaperSettle /
 * BitSettle, whose entrance starts the subtree at opacity 0 and
 * trusts a reanimated timing to bring it to 1. On his device that
 * fade never lands for these roots — the content is all there
 * (these renders carry every word), but its paint hangs on the
 * animation: the screenshots show the bare navigator background
 * (242,242,242) with only a few chrome fragments through. Under
 * Classic and Terminal the screens return their content bare — no
 * gate — which is exactly why defaulting his appearance cured it.
 *
 * The fix (v246): the settle kits gain a `screenRoot` variant whose
 * entrance is transform-only — the sheet still settles the skin's
 * distance onto the surface, but opacity is never animated, so a
 * screen's paint can never be gated on an animation completing.
 * The four Bible surfaces pass it. Card-level settles everywhere
 * else keep the full fade — a stalled card costs a card, not a page.
 *
 * Harness shape: the settle components are the REAL ones. Reanimated
 * is mocked faithfully for a first paint — shared values hold their
 * initial values and useAnimatedStyle evaluates against them, which
 * is precisely the style the native side carries until an animation
 * completes. On f01320f every Paper/8-bit row below failed the
 * root-opacity pin with opacity 0 at the root; the content pins
 * passed — content was never the problem.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const rig = vi.hoisted(() => ({
  scheme: 'light' as 'light' | 'dark',
  accent: 'default' as string,
  skin: 'classic' as string,
}));
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

/** The app's real rule (theme-provider, v186): under Terminal the
 * palette resolves as DARK in both device schemes — the tube is one
 * dark world. The mocks mirror it so the token math is the app's. */
const effScheme = () => (rig.skin === 'terminal' ? 'dark' : rig.scheme);

vi.mock('@/hooks/use-colors', async () => {
  const { getThemedPalette } = await import('../color-themes');
  return { useColors: () => getThemedPalette(effScheme(), rig.accent as any) };
});

vi.mock('@/hooks/use-skin', async () => {
  const { getThemedPalette } = await import('../color-themes');
  const { getSkinTokens } = await import('../skin-themes');
  return {
    useSkin: () => {
      const scheme = effScheme();
      const colors = getThemedPalette(scheme, rig.accent as any);
      const tokens = getSkinTokens(rig.skin as any, scheme, colors as any);
      return {
        skin: rig.skin,
        isPaper: tokens.isPaper,
        isEightBit: tokens.isEightBit,
        isTerminal: tokens.isTerminal,
        isSkinned: tokens.isPaper || tokens.isEightBit || tokens.isTerminal,
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

import BibleBooksScreen from '../../app/bible-chapters';
import BibleBookScreen from '../../app/bible-book';
import BibleQueueScreen from '../../app/bible-queue';
import { ChapterPageView } from '../../components/bible-v205/chapter-page';
import { getThemedPalette, ACCENT_THEMES } from '../color-themes';
import { getSkinTokens, hexContrast } from '../skin-themes';
import { resolveBibleInk } from '../bible-v205/palette-ink';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');

function rgbaToHex(m: RegExpMatchArray): string {
  const ch = (n: string) => Number(n).toString(16).padStart(2, '0');
  return `#${ch(m[1])}${ch(m[2])}${ch(m[3])}`.toUpperCase();
}

/** The style of the FIRST element — the screen's root. A root that
 * carries opacity 0 at first paint is a screen whose paint is gated
 * on an animation completing: the device failure, in harness terms. */
function rootStyle(html: string): string {
  const m = html.match(/<div[^>]*style="([^"]*)"/);
  return m ? m[1] : '';
}

function expectRootUngated(html: string, label: string) {
  const style = rootStyle(html);
  expect(style, `${label}: root style present`).toBeTruthy();
  expect(style, `${label}: root must not sit at opacity 0`).not.toMatch(/opacity:0(?![0-9.])/);
}

function renderedPaper(html: string): string {
  const m = html.match(/background-color:rgba\((\d+),(\d+),(\d+)/);
  expect(m, 'root background painted').toBeTruthy();
  return rgbaToHex(m!);
}

function renderedTextColor(html: string, needle: string): string {
  const i = html.indexOf(needle);
  expect(i, `"${needle}" present in render`).toBeGreaterThan(-1);
  const before = html.slice(Math.max(0, i - 900), i);
  const matches = [...before.matchAll(/color:rgba\((\d+),(\d+),(\d+)/g)];
  expect(matches.length, `a text color precedes "${needle}"`).toBeGreaterThan(0);
  return rgbaToHex(matches[matches.length - 1]);
}

const chapterEl = (book: string, chapter: number, stories = false) =>
  React.createElement(ChapterPageView, {
    book,
    chapter,
    initialStories: stories,
    onBack: () => {},
    onOpenBook: () => {},
    onOpenQueue: () => {},
    onNavigateChapter: () => {},
  });

const SKINS = ['classic', 'paper', '8bit', 'terminal'] as const;
const ACCENTS = ['default', 'sunset'] as const;
const SCHEMES = ['light', 'dark'] as const;

describe('v246 — the Bible matrix: skin × accent × scheme', () => {
  for (const skin of SKINS) {
    for (const accent of ACCENTS) {
      for (const scheme of SCHEMES) {
        const label = `${skin} × ${accent} × ${scheme}`;
        it(`${label}: every Bible surface paints, ungated, with readable verse ink`, () => {
          rig.skin = skin;
          rig.accent = accent;
          rig.scheme = scheme;

          const books = renderToString(React.createElement(BibleBooksScreen)).replace(/<!-- -->/g, '');
          expectRootUngated(books, `${label} Books`);
          expect(books).toContain('Your Books');
          expect(books).toContain('Genesis');
          expect(books).toContain('Revelation');

          const book = renderToString(React.createElement(BibleBookScreen)).replace(/<!-- -->/g, '');
          expectRootUngated(book, `${label} Book`);
          expect(book).toContain('Genesis');
          expect(book).toContain('50 chapters');

          const queue = renderToString(React.createElement(BibleQueueScreen)).replace(/<!-- -->/g, '');
          expectRootUngated(queue, `${label} Queue`);
          expect(queue).toContain('The Study Queue');

          const chapter = renderToString(chapterEl('Genesis', 1)).replace(/<!-- -->/g, '');
          expectRootUngated(chapter, `${label} Chapter`);
          expect(chapter).toContain('Genesis · Chapter 01');
          expect(chapter).toContain('In the beginning');
          const paper = renderedPaper(chapter);
          const ink = renderedTextColor(chapter, 'In the beginning');
          expect(
            hexContrast(ink, paper),
            `${label}: verse ink ${ink} on paper ${paper}`,
          ).toBeGreaterThanOrEqual(4.5);

          const bare = renderToString(chapterEl('Leviticus', 20)).replace(/<!-- -->/g, '');
          expectRootUngated(bare, `${label} Chapter (noteless)`);
          expect(bare).toContain('Leviticus · Chapter 20');
          expect(bare).toContain('King James Version');
          expect(bare.length).toBeGreaterThan(5000);

          const stories = renderToString(chapterEl('Genesis', 1, true)).replace(/<!-- -->/g, '');
          expectRootUngated(stories, `${label} Stories`);
          expect(stories).toContain('Genesis 1 · Stories');
          expect(stories).toContain('Begin reading');
        });
      }
    }
  }
});

describe('v246 — the pure sweep: verse ink in every combination the app can be in', () => {
  it('resolveBibleInk clears 4.5:1 for all accents × skins × schemes', () => {
    for (const scheme of SCHEMES) {
      for (const accent of ACCENT_THEMES.map((t) => t.id)) {
        for (const skin of SKINS) {
          const eff = skin === 'terminal' ? 'dark' : scheme;
          const colors: any = getThemedPalette(eff, accent as any);
          const tokens: any = getSkinTokens(skin as any, eff, colors);
          const isSkinned = tokens.isPaper || tokens.isEightBit || tokens.isTerminal;
          const paper = isSkinned ? tokens.surface ?? colors.background : colors.background;
          const ink = resolveBibleInk(colors.foreground, paper);
          expect(
            hexContrast(ink, paper),
            `${scheme}/${accent}/${skin}: ink ${ink} on ${paper}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });
});

describe('v246 — wiring: the Bible surfaces use the ungated screen-root settle', () => {
  it('all four Bible surfaces pass screenRoot to both settle kits', () => {
    for (const f of [
      'app/bible-chapters.tsx',
      'app/bible-book.tsx',
      'app/bible-queue.tsx',
      'components/bible-v205/chapter-page.tsx',
    ]) {
      const src = read(f);
      expect(src, `${f} paper root`).toMatch(/<PaperSettle screenRoot>/);
      expect(src, `${f} 8-bit root`).toMatch(/<BitSettle screenRoot>/);
    }
  });

  it('both settle kits pin opacity at 1 in the screen-root entrance', () => {
    for (const f of ['components/paper-motion.tsx', 'components/bit-motion.tsx']) {
      const src = read(f);
      expect(src, `${f} declares the variant`).toContain('screenRoot');
    }
  });
});
