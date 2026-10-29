/**
 * v250 — "The Bible, Material". Jonathan, Oct 25, 15:50 PDT: "Give
 * me a full material design makeover for the Bible... Nah nevermind.
 * I like concept 1 the most. Make it match the color I choose in the
 * settings." Concept 1 "Expressive Cards" from
 * bible-material-makeover-v1.html, PURE, with the binding amendment
 * that the design's seed is the ACTIVE PALETTE's primary: the
 * mockup supplies structure, shapes and relationships; the palette
 * supplies every hue. The mockup's berry hexes were sampled from
 * his then-current palette — they are seed ROLES, not values.
 *
 * The pins:
 *  (1) the pure derivation sweep — for EVERY accent theme × scheme,
 *      the Material family (lib/bible-v205/palette-accents.ts
 *      deriveBibleMaterial, fed the exact ground palette.ts
 *      resolves) keeps its contrast floors: each section's deep
 *      shade ≥4.5:1 on its own card, the amber/teal pill inks
 *      ≥4.5:1, the filled-note inks ≥4.6 / ≥4.5, the tag ink and
 *      the read-pill ink ≥4.5. And the section hues ARE the seed
 *      hue rotated by the family's fixed offsets — harmonization
 *      is arithmetic, not a second palette.
 *  (2) change the palette → the surfaces change: Sunset's family
 *      and Pomegranate's family share no card ground, note fill or
 *      read pill; light and dark differ too.
 *  (3) no mockup berry literal survives in the Bible tree (the
 *      reward gold #FFC53D / #4A2F00 is a documented constant of
 *      the rewards system and is NOT in the scan list).
 *  (4) the render matrix — skins × {sunset, pomegranate} ×
 *      {light, dark}: the chapter renders ungated (v246/v247 pins
 *      hold), its root carries NO skin sheet treatment in any skin
 *      (the v250 supersession of v248's pin (c)), the first section
 *      card paints THIS palette's derived section ground, and the
 *      progress card is on the page. (v304: the card was compressed
 *      into the header's progress thread; the pin follows it.)
 *  (5) source contracts for what the synchronous harness cannot
 *      paint (study state and marks load async, so the Mark as
 *      Read pill and the filled self-note card never render here —
 *      the v247 precedent): the XP chip rides the read pill, the
 *      note card wears noteFill, the flash is the seed's tint.
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
 * palette resolves as DARK in both device schemes. */
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

import { ChapterPageView } from '../../components/bible-v205/chapter-page';
import { ACCENT_THEMES, getThemedPalette, mix } from '../color-themes';
import { hexContrast } from '../skin-themes';
import {
  BIBLE_ACCENT_AMBER_OFFSET,
  BIBLE_ACCENT_TEAL_OFFSET,
  BIBLE_SECTION_HUE_OFFSETS,
  BIBLE_XP_GOLD,
  BIBLE_XP_GOLD_INK,
  deriveBibleMaterial,
  hexToHsl,
} from '../bible-v205/palette-accents';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');

/** The ground palette.ts resolves for a scheme + accent: the
 * palette background with a breath of the seed. */
function groundFor(scheme: 'light' | 'dark', accent: string): { colors: any; ground: string } {
  const colors: any = getThemedPalette(scheme, accent as any);
  return { colors, ground: mix(colors.background, colors.primary, scheme === 'dark' ? 0.05 : 0.04) };
}

const hueDistance = (a: number, b: number) => {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return Math.min(d, 360 - d);
};

describe('v250 — the derivation sweep: every palette yields a reading family', () => {
  it('contrast floors + hue arithmetic hold for all accent themes × schemes', () => {
    for (const scheme of ['light', 'dark'] as const) {
      for (const t of ACCENT_THEMES) {
        const { colors, ground } = groundFor(scheme, t.id);
        const m = deriveBibleMaterial(colors.primary, ground);
        const at = `${scheme}/${t.id} primary=${colors.primary}`;
        const seedHue = hexToHsl(colors.primary).h;
        m.sections.forEach((s, i) => {
          expect(hexContrast(s.deep, s.bg), `${at} section${i} deep on its card`).toBeGreaterThanOrEqual(4.5);
          expect(
            hueDistance(hexToHsl(s.hue).h, seedHue + BIBLE_SECTION_HUE_OFFSETS[i]),
            `${at} section${i} hue is the seed hue + ${BIBLE_SECTION_HUE_OFFSETS[i]}°`,
          ).toBeLessThanOrEqual(1.5);
        });
        expect(hexContrast(m.accentAmber.deep, m.accentAmber.bg), `${at} amber ink`).toBeGreaterThanOrEqual(4.5);
        expect(hexContrast(m.accentTeal.deep, m.accentTeal.bg), `${at} teal ink`).toBeGreaterThanOrEqual(4.5);
        expect(
          hueDistance(hexToHsl(m.accentAmber.hue).h, seedHue + BIBLE_ACCENT_AMBER_OFFSET),
          `${at} amber hue offset`,
        ).toBeLessThanOrEqual(1.5);
        expect(
          hueDistance(hexToHsl(m.accentTeal.hue).h, seedHue + BIBLE_ACCENT_TEAL_OFFSET),
          `${at} teal hue offset`,
        ).toBeLessThanOrEqual(1.5);
        expect(hexContrast(m.noteInk, m.noteFill), `${at} note ink on the filled card`).toBeGreaterThanOrEqual(4.6);
        expect(hexContrast(m.noteInkSoft, m.noteFill), `${at} note soft ink`).toBeGreaterThanOrEqual(4.5);
        expect(hexContrast(m.noteTagInk, m.noteTagBg), `${at} note tag ink`).toBeGreaterThanOrEqual(4.5);
        expect(hexContrast(m.readPillInk, m.readPill), `${at} read pill ink`).toBeGreaterThanOrEqual(4.5);
        expect(m.xpGold, `${at} xp gold is the reward constant`).toBe(BIBLE_XP_GOLD);
        expect(m.xpGoldInk, `${at} xp gold ink is the reward constant`).toBe(BIBLE_XP_GOLD_INK);
        expect(hexContrast(BIBLE_XP_GOLD_INK, BIBLE_XP_GOLD), `${at} the gold chip itself reads`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('change the palette → the surfaces change (Sunset ≠ Pomegranate; light ≠ dark)', () => {
    const sunset = groundFor('light', 'sunset');
    const pom = groundFor('light', 'pomegranate');
    const a = deriveBibleMaterial(sunset.colors.primary, sunset.ground);
    const b = deriveBibleMaterial(pom.colors.primary, pom.ground);
    expect(a.sections[0].bg, 'first section card ground differs').not.toBe(b.sections[0].bg);
    expect(a.sections[1].bg, 'second section card ground differs').not.toBe(b.sections[1].bg);
    expect(a.noteFill, 'filled note card differs').not.toBe(b.noteFill);
    expect(a.readPill, 'read pill differs').not.toBe(b.readPill);
    const sunsetDark = groundFor('dark', 'sunset');
    const d = deriveBibleMaterial(sunsetDark.colors.primary, sunsetDark.ground);
    expect(d.sections[0].bg, 'dark ground differs from light').not.toBe(a.sections[0].bg);
    expect(d.readPill, 'dark read pill differs from light').not.toBe(a.readPill);
  });
});

describe('v250 — no mockup berry literal survives in the Bible tree', () => {
  it('the Concept 1 sample hexes appear in no Bible surface or palette file', () => {
    // Sampled from the mockup's berry seed — seed ROLES, not values.
    // (The reward gold #FFC53D / #4A2F00 is deliberately absent:
    // a rewards-system constant, documented in palette-accents.ts.)
    const MOCKUP_BERRY = [
      '#BE1E5F', '#8F1145', '#FFD9E6', '#FCE0EB', '#FBDCE8', '#FFEFD2',
      '#E8930C', '#B96E00', '#FFE3B3', '#7A4A00', '#CDEEE6', '#0B5A4C',
      '#FFF6F8', '#2A121C', '#E7548F', '#F8C9D9', '#F3D9E2', '#7A4358',
      '#FFF3F7',
    ];
    for (const f of [
      'components/bible-v205/palette.ts',
      'lib/bible-v205/palette-accents.ts',
      'components/bible-v205/blocks.tsx',
      'components/bible-v205/chapter-page.tsx',
      'components/bible-v205/stories-view.tsx',
      'components/bible-v205/index-sheet.tsx',
      'app/bible-chapters.tsx',
      'app/bible-book.tsx',
      'app/bible-queue.tsx',
    ]) {
      const src = read(f);
      for (const hex of MOCKUP_BERRY) {
        expect(src, `${f} must not keep the mockup literal ${hex}`).not.toContain(hex);
      }
    }
  });
});

describe('v250 — source contracts (async-surfaces the harness cannot paint)', () => {
  it('the read pill carries the gold XP chip; the flash is the seed tint; no fixed pink rgba remains', () => {
    const src = read('components/bible-v205/chapter-page.tsx');
    expect(src).toContain('>+25 XP<');
    expect(src).toContain('palette.readPill');
    expect(src).toContain('palette.xpGold');
    expect(src).toContain('palette.flashTint');
    // v304 re-base (with citation): the v250 progress CARD was
    // compressed into the header's bottom-edge thread — the pin
    // now holds the thread's presence where the card's stood.
    expect(src).toContain('chapter-progress-thread');
    expect(src).not.toContain('rgba(230,73,128');
    expect(src).toContain('sectionToneFor(palette, sIdx)');
  });

  it('his own note flows unboxed in blocks.tsx (v311 supersedes the filled card)', () => {
    // v311 re-base (with citation): his Oct 28 rulings (11:52 the
    // Notion layout — "It has a square around it" — and 12:42's
    // approval of bible-pages-expressive-v7) retired the v250 filled
    // seed card on the reading surfaces: the note is bare text under
    // a small attribution head, and the typed kinds wear the nbox.
    // The derivation itself (noteFill/noteInk above) stands — the
    // Stories cover field wears noteFill now.
    const src = read('components/bible-v205/blocks.tsx');
    expect(src).not.toContain('palette.noteFill');
    expect(src).not.toContain('>NOTE<');
    expect(src).toContain('styles.flowWrap');
    expect(src).toContain('styles.nbox');
  });

  it('the palette resolves the Material family from colors.primary', () => {
    const src = read('components/bible-v205/palette.ts');
    expect(src).toContain('deriveBibleMaterial(colors.primary, paper)');
  });
});

/** A hex color as react-native-web serializes it in a style. */
function hexToRgbaCss(hex: string): string {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},1.00)`;
}

function rootStyle(html: string): string {
  const m = html.match(/<div[^>]*style="([^"]*)"/);
  return m ? m[1] : '';
}

function contentRootStyle(html: string): string {
  const divs = [...html.matchAll(/<div[^>]*style="([^"]*)"/g)].map((m) => m[1]);
  return divs.find((s) => s.includes('background-color')) ?? '';
}

const chapterEl = (book: string, chapter: number) =>
  React.createElement(ChapterPageView, {
    book,
    chapter,
    onBack: () => {},
    onOpenBook: () => {},
    onOpenQueue: () => {},
    onNavigateChapter: () => {},
  });

const SKINS = ['classic', 'paper', '8bit', 'terminal'] as const;

describe('v250 — the render matrix: Material dress, every skin, seed from the palette', () => {
  for (const skin of SKINS) {
    for (const accent of ['sunset', 'pomegranate'] as const) {
      for (const scheme of ['light', 'dark'] as const) {
        const label = `${skin} × ${accent} × ${scheme}`;
        it(`${label}: ungated root, no skin sheet treatment, first section card in this palette's hue`, () => {
          rig.skin = skin;
          rig.accent = accent;
          rig.scheme = scheme;
          const eff = effScheme();
          const { colors, ground } = groundFor(eff, accent);
          const family = deriveBibleMaterial(colors.primary, ground);

          const chapter = renderToString(chapterEl('Genesis', 1)).replace(/<!-- -->/g, '');
          const style = rootStyle(chapter);
          expect(style, `${label}: root style present`).toBeTruthy();
          expect(style, `${label}: root must not sit at opacity 0`).not.toMatch(/opacity:0(?![0-9.])/);
          const root = contentRootStyle(chapter);
          expect(root, `${label}: chapter root fills the screen`).toContain('flex:1');
          expect(root, `${label}: no skin sheet radius in the Material dress`).not.toContain(
            'border-top-left-radius',
          );
          // v304 re-base: the progress card is a slim thread now —
          // its testID is what paints where the card's label did.
          expect(chapter, `${label}: the progress thread is on the page`).toContain('chapter-progress-thread');
          expect(
            chapter.includes(`background-color:${hexToRgbaCss(family.sections[0].bg)}`),
            `${label}: first section card paints the derived ground ${family.sections[0].bg}`,
          ).toBe(true);
          // A different palette's first card must NOT be what painted.
          const other = accent === 'sunset' ? 'pomegranate' : 'sunset';
          const otherGround = groundFor(eff, other);
          const otherFamily = deriveBibleMaterial(otherGround.colors.primary, otherGround.ground);
          if (otherFamily.sections[0].bg !== family.sections[0].bg) {
            expect(
              chapter.includes(`background-color:${hexToRgbaCss(otherFamily.sections[0].bg)}`),
              `${label}: the other palette's card ground is absent`,
            ).toBe(false);
          }
        });
      }
    }
  }
});
