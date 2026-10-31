// ─── v251 "Right Where It Counts" — pins ──────────────────────────────────
// His v250 verdict (2026-10-25 16:53, screenshots 10677 + 10676):
// he likes the Material Bible, "but there's just a few things that
// feel... Not quite right. Plus the avatar bubbles are super
// glitchy now..." Three workstreams:
//
//  1. CHAPTER PAGE — the doorway hero was buried: in his shot only
//     the bottom ~28px of "Chapter 01" peeked out below the sticky
//     segmented pill; the kicker and status strip never appeared.
//     The header was an in-flow block whose true height nothing in
//     the scroll math knew (scrollToY carried −128, the head line
//     +190, the bubble dock insets.top + 118 — three stale guesses
//     at one number). The fix is the app's proven pattern (the
//     Schedule tab's measured header, the v246 lesson): the header
//     is a measured OVERLAY, the content opens with a spacer of
//     exactly its measured height, and every consumer reads the
//     same measured value. Clearance by construction, not by guess.
//
//  2. BOOKS PAGE — the CURRENT chip ran off its card (Hebrews row
//     clipped mid-word by the screen edge): nothing in the row
//     could shrink — no flexShrink on the name, none on the right
//     container, stats unbounded. The texts shrink/ellipsize now;
//     the chip never shrinks and stays whole inside the card.
//
//  3. AVATAR BUBBLES — AUDITED, prime suspect REFUTED in code (no
//     speculative change shipped): the face node SelfLineBlock
//     receives IS recreated every render, but (a) a recreated
//     element is not a remount — the wrapping Pressables carry
//     stable keys (`${kind}-${fieldIndex}-${i}`) in both callers
//     and the component types never change; (b) the self-note face
//     subtree contains NO animation to restart — AuthorFace is a
//     pure render, AvatarImage is React.memo over primitive props,
//     and its only animation (the aura pulse) requires
//     auraMode='animated', which AuthorFace never passes; (c) the
//     animated faces (MorphCard drift/morph) live in bubbles.tsx,
//     which v250 did not touch at all — the drift effect's deps
//     are the stable shared value + index, and the morph drive
//     effect dedupes on (open, progresses) identity, so the
//     chapter page's scroll-driven re-renders cannot restart
//     either. The guards below pin exactly those stability
//     properties, so a future edit that breaks one fails loudly
//     here instead of glitching quietly on his phone.
//
// Harness limit, stated plainly (the v241/v247/v249 precedent):
// react-dom/server over react-native-web runs no effects and no
// layout, so mount counts and native flex overflow cannot be
// observed here. What these pins hold is the contract that
// produces the behavior on device: the measured-clearance wiring
// in source, the shrink contract in source, and the rendered
// first paint (spacer at the estimated height, long stats whole,
// the chip present with its never-shrink style).

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
  CHAPTER_HEADER_LAND_GAP,
} from '../../components/bible-v205/chapter-page';
import BibleBooksScreen from '../../app/bible-chapters';

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');
const page = read('components/bible-v205/chapter-page.tsx');
const books = read('app/bible-chapters.tsx');
const bubblesSrc = read('components/bible-v205/bubbles.tsx');

describe('v251 WS1 — the chapter header clearance is measured, not guessed', () => {
  it('the estimate is the derived part-sum, and the landing gap is small and fixed', () => {
    // v304 re-base (with citation): the header slimmed — the v250
    // progress card and the old mode row collapsed into one slim
    // meta row + a 4px thread — so the derived part-sum is 102 now
    // (was 164). The measured-clearance contract this pin guards
    // (estimate = part-sum, spacer = measured height) is unchanged.
    expect(estimateChapterHeaderHeight(0)).toBe(102);
    expect(estimateChapterHeaderHeight(24)).toBe(126);
    expect(CHAPTER_HEADER_LAND_GAP).toBe(8);
  });

  it('the header is an overlay that reports its own height', () => {
    expect(page).toContain(
      "topwrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30, elevation: 10, borderBottomWidth: 1 }",
    );
    expect(page).toContain('headerHRef.current = h;');
    expect(page).toContain('setHeaderH(h);');
  });

  it('the content opens with a spacer of exactly the measured height', () => {
    expect(page).toContain('<View pointerEvents="none" style={{ height: headerH }} />');
  });

  it('every scroll consumer reads the measured height — no stale constants survive', () => {
    expect(page).toContain('y - headerHRef.current - CHAPTER_HEADER_LAND_GAP');
    expect(page).not.toContain('y - 128');
    expect(page).toContain('contentOffset.y + headerHRef.current');
    expect(page).not.toContain('contentOffset.y + 190');
    expect(page).toContain('topChrome={headerH}');
    expect(page).not.toContain('topChrome={insets.top + 118}');
  });

  it('rendered: the spacer paints at the estimated height under an absolute header', () => {
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
    // The mocked insets are top: 24, so the first-frame spacer is
    // the estimate for that inset; on device the header's onLayout
    // replaces it with the measured height in the first frame.
    // (v304 re-base: the estimate at inset 24 is 126 now — the
    // slimmed header's part-sum; see the estimate pin above.)
    expect(html).toContain('height:126px');
    // (RNW serializes position into an atomic class, not an inline
    // style — the overlay itself is held by the source pin above.)
    expect(html).toContain('Genesis');
  });
});
describe('v251 WS2 — the Books row shrinks its texts, never its chip', () => {
  // v311 re-base (with citation): the shrink arrangement itself is
  // superseded by the approved drawing (bible-pages-expressive-v7,
  // his "Also better. Let's do it.", Oct 28 12:42) — the SAME defect
  // (his "Hebrew…" screenshot, Oct 28 11:12) is now fixed by layout
  // instead of shrinking: the name takes its own line at 22px with
  // flex 1 and NO numberOfLines (it wraps whole, never truncates),
  // the counts sit on their own full-width line unclamped, and the
  // chip — which never shrank — keeps its flexShrink: 0.
  it('the no-truncation contract is in the styles', () => {
    expect(books).toContain("bname: { fontSize: 22, fontWeight: '700', flex: 1 }");
    expect(books).toContain(
      'currentPill: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9, flexShrink: 0 }',
    );
    expect(books).toContain('navName: { fontSize: 15, flexShrink: 1 }');
    // The BookRow's name and counts carry NO one-line clamp (the
    // Jump-to-Book sheet's nav rows keep theirs — a picker list,
    // untouched by the drawing).
    const rowAt = books.indexOf('function BookRow');
    const row = books.slice(rowAt);
    expect(row).not.toContain('numberOfLines={');
    expect(books).not.toContain('flexShrink: 1, minWidth: 0');
  });

  it('rendered long-content fixture: longest rows paint whole stats and a whole chip', () => {
    const html = renderToString(React.createElement(BibleBooksScreen)).replace(/<!-- -->/g, '');
    // The row from his screenshot: Hebrews, notes in every chapter.
    expect(html).toContain('Hebrews');
    // v313 re-base: the counts lead says "written" (the drawing).
    expect(html).toContain('0 of 13 written');
    expect(html).toContain('notes in 13 chapters');
    // The longest book name in the canon.
    expect(html).toContain('1 Thessalonians');
    // A current pill renders (the seed state puts every book in
    // Not Started, so the make-current pill paints on the rows).
    // v383 amendment: the offer pill's label is now the action "Set
    // current" — under v251–v382 it stated "Current", the same word
    // as the filled state chip, and in his dark theme the two pills
    // were indistinguishable (his Oct 31 screenshot). The chip this
    // pin protects is the same never-shrink pill; only its word and
    // tonal dress changed. See bible-v383-current-mark.test.ts.
    expect(html).toContain('Set current');
    // v311: the chip still carries the flex-shrink:0 atomic class
    // (r-flexShrink-1q142lx); the retired shrink container's inline
    // signature is gone from the render.
    expect(html).toContain('r-flexShrink-1q142lx');
    expect(html).not.toContain('flex-shrink:1;min-width:0px');
  });
});

describe('v251 WS3 — bubble stability audit guards (the refutation, pinned)', () => {
  it('the drift effect can only re-run on a remount: its deps are the stable shared value + index', () => {
    expect(bubblesSrc).toContain('}, [drift, driftIndex]);');
  });

  it('the morph drive effect dedupes on (open, progresses) identity', () => {
    expect(bubblesSrc).toContain('last.progresses === progresses');
    expect(bubblesSrc).toContain(
      'const progresses = useMemo(() => lines.map(() => makeMutable(0)), [count]);',
    );
  });

  it('face rows keep stable keys in both SelfLineBlock callers', () => {
    expect(page).toContain('key={`${line.kind}-${line.fieldIndex}-${i}`}');
    const stories = read('components/bible-v205/stories-view.tsx');
    expect(stories).toContain('key={`self-${line.kind}-${line.fieldIndex}-${i}`}');
  });

  it('the self-note face subtree holds no animation: memoized AvatarImage, no animated aura', () => {
    const avatar = read('components/avatar-system.tsx');
    expect(avatar).toContain('export const AvatarImage = React.memo(');
    const faceStart = bubblesSrc.indexOf('export function AuthorFace');
    const faceEnd = bubblesSrc.indexOf('\nfunction MorphCard', faceStart);
    const faceBody = bubblesSrc.slice(faceStart, faceEnd > faceStart ? faceEnd : faceStart + 4000);
    expect(faceBody).not.toContain('auraMode');
    expect(faceBody).not.toContain('useEffect');
    expect(faceBody).not.toContain('Animated');
  });
});
