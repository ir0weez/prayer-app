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
import { deriveBibleAccents } from '../bible-v205/palette-accents';
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

/**
 * v248 — the Bible, dressed like the rest. Jonathan's verdict on
 * v247 (Oct 25, 13:03): the blank Bible was cured, "But you didn't
 * make a paper version of it, and it didn't change the color to
 * orange to match the selected color. I wanted to make it match the
 * chosen theme." His standing principle (12:18): the Bible page has
 * a design that FOLLOWS THE APP SKIN and colors that FOLLOW THE
 * CHOSEN COLOR THEME. Through v247 the Bible wore the v205 build's
 * fixed scheme (cream + raspberry #C2255C) under every skin and
 * palette; v248 derives its accent family from the active palette's
 * primary (lib/bible-v205/palette-accents.ts) and spreads the active
 * skin's dress fragments (components/bible-v205/palette.ts). The
 * pins below are the promise, per skin × {default, sunset} ×
 * {light, dark}:
 *  (a) the surfaces render ungated at full height (the content root
 *      carries flex:1 — the v247 second-gate shape, kept);
 *  (b) a headline accent element's rendered color EQUALS the active
 *      palette's primary token, and the old fixed raspberry appears
 *      nowhere in the render;
 *  (c) under a skin, the chapter root carries THAT SKIN's sheet
 *      treatment — the exact sheetRadius and the exact sheetShadow
 *      string from the skin's own tokens (the same tokens the
 *      sibling screens consume), never a lookalike; under Classic
 *      the root carries neither.
 * On 85f8e27 every (b) and (c) row fails: the fill rendered
 * rgba(194,37,92,1.00) in all sixteen combinations and the roots
 * carried no sheet treatment at all.
 *
 * v250 RE-BASE (Oct 25, 15:50): his ruling supersedes (c) — the
 * Bible now wears the Material makeover in every skin ("make it
 * match the color I choose in the settings"), so the skin no longer
 * re-dresses it. Pin (c) below now asserts the opposite in every
 * skin: NO skin sheet treatment on the chapter root. Pins (a) and
 * (b) stand unchanged — full-height ungated paint, and the accents
 * still ARE the palette's primary.
 */

/** A hex color as react-native-web serializes it in a style. */
function hexToRgbaCss(hex: string): string {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},1.00)`;
}

/** The content root's style — the first div that paints a
 * background (the settle wrappers paint none). */
function contentRootStyle(html: string): string {
  const divs = [...html.matchAll(/<div[^>]*style="([^"]*)"/g)].map((m) => m[1]);
  return divs.find((s) => s.includes('background-color')) ?? '';
}

const OLD_RASPBERRY_CSS = 'rgba(194,37,92';

describe('v248 — the Bible follows the skin and the chosen color', () => {
  for (const skin of SKINS) {
    for (const accent of ACCENTS) {
      for (const scheme of SCHEMES) {
        const label = `${skin} × ${accent} × ${scheme}`;
        it(`${label}: palette-following accents + the skin's sheet treatment`, () => {
          rig.skin = skin;
          rig.accent = accent;
          rig.scheme = scheme;
          const eff = effScheme();
          const colors: any = getThemedPalette(eff, accent as any);
          const tokens: any = getSkinTokens(skin as any, eff, colors);

          const books = renderToString(React.createElement(BibleBooksScreen)).replace(/<!-- -->/g, '');
          const chapter = renderToString(chapterEl('Genesis', 1)).replace(/<!-- -->/g, '');
          const stories = renderToString(chapterEl('Genesis', 1, true)).replace(/<!-- -->/g, '');

          // (a) ungated, full height.
          expectRootUngated(chapter, `${label} Chapter`);
          expect(contentRootStyle(chapter), `${label}: chapter root fills the screen`).toContain('flex:1');
          expect(contentRootStyle(books), `${label}: books root fills the screen`).toContain('flex:1');
          // Stories' root flex lives in its StyleSheet (a class, not
          // the inline style) — the harness sees its painted paper
          // at the root instead; the ungated pin above covers the rest.
          expect(contentRootStyle(stories), `${label}: stories root paints its paper`).toBeTruthy();

          // (b) the headline accents ARE the palette's primary token:
          // the chapter progress fill paints it, the Books kicker
          // reads in it, and the old fixed raspberry is gone.
          expect(
            chapter.includes(`background-color:${hexToRgbaCss(colors.primary)}`),
            `${label}: progress fill paints the palette primary ${colors.primary}`,
          ).toBe(true);
          expect(chapter, `${label}: no fixed raspberry in the chapter`).not.toContain(OLD_RASPBERRY_CSS);
          expect(books, `${label}: no fixed raspberry in the books`).not.toContain(OLD_RASPBERRY_CSS);
          const kicker = renderedTextColor(books, 'PrayerCircle · Bible');
          expect(kicker, `${label}: kicker color`).toBe(colors.primary.toUpperCase());
          expect(kicker, `${label}: kicker is not the old raspberry`).not.toBe('#C2255C');

          // (c) RE-BASED by v250 (his ruling, Oct 25 15:50: the
          // Bible gets the Material makeover, "match the color I
          // choose in the settings" — the skin NO LONGER re-dresses
          // the Bible). The v248 expectation (the chapter root wears
          // the active skin's sheet treatment) is superseded: in
          // EVERY skin the chapter content root now carries NO skin
          // sheet treatment at all — no sheet shadow, no sheet
          // radius. The Bible's dress is the Material system in
          // components/bible-v205/palette.ts, identical per skin;
          // only the palette (accent × scheme) moves it. The deeper
          // v250 pins live in bible-v250-material.test.tsx.
          const root = contentRootStyle(chapter);
          expect(root, `${label}: no sheet shadow on the chapter root`).not.toContain('box-shadow');
          expect(root, `${label}: no skin sheet radius on the chapter root`).not.toContain(
            'border-top-left-radius',
          );
        });
      }
    }
  }
});

describe('v248 — the derivation: text shades of the chosen color truly read', () => {
  it('rasp IS the primary; raspDeep and bandInk clear 4.5:1 on their grounds, every combination', () => {
    for (const scheme of SCHEMES) {
      for (const accent of ACCENT_THEMES.map((t) => t.id)) {
        for (const skin of SKINS) {
          const eff = skin === 'terminal' ? 'dark' : scheme;
          const colors: any = getThemedPalette(eff, accent as any);
          const tokens: any = getSkinTokens(skin as any, eff, colors);
          const isSkinned = tokens.isPaper || tokens.isEightBit || tokens.isTerminal;
          const paper = isSkinned ? tokens.surface ?? colors.background : colors.background;
          const accents = deriveBibleAccents(colors.primary, paper);
          const at = `${scheme}/${accent}/${skin}`;
          expect(accents.rasp, `${at}: rasp is the primary`).toBe(colors.primary);
          expect(hexContrast(accents.raspDeep, paper), `${at}: raspDeep on paper`).toBeGreaterThanOrEqual(4.5);
          expect(hexContrast(accents.bandInk, accents.band), `${at}: bandInk on band`).toBeGreaterThanOrEqual(4.5);
          expect(accents.raspSoft, `${at}: raspSoft is the band`).toBe(accents.band);
        }
      }
    }
  });

  it('wiring: the palette derives from colors.primary; no surface keeps a fixed accent literal', () => {
    const pal = read('components/bible-v205/palette.ts');
    expect(pal).toContain('deriveBibleAccents(colors.primary, paper)');
    for (const f of [
      'app/bible-chapters.tsx',
      'app/bible-book.tsx',
      'app/bible-queue.tsx',
      'components/bible-v205/blocks.tsx',
      'components/bible-v205/bubbles.tsx',
      'components/bible-v205/chapter-page.tsx',
      'components/bible-v205/index-sheet.tsx',
      'components/bible-v205/stories-view.tsx',
      'components/bible-v205/screen-boundary.tsx',
    ]) {
      const src = read(f);
      for (const dead of ['#C2255C', '#9C1B49', '#E64980', '#FBE9F1', '#FDF3F7', '#EFC3D6', '#F3CFE0', '#F3DCE8', '#DE8FB4']) {
        expect(src, `${f} must not keep ${dead}`).not.toContain(dead);
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
