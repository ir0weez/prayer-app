/**
 * v403 — the reader opens in slices, never in one stall.
 * v405 SUPERSESSION (Nov 1): the slicing this file was written
 * for is REMOVED, because its root cause is gone. Jonathan's
 * pick — native selection everywhere — replaced the per-word
 * engine, so a chapter is ~113 plain text elements instead of
 * ~20,541 components; the whole chapter mounts in one commit,
 * the load effect runs once per (book, chapter) with its five
 * non-verse stores batched into a single landing, verses seed
 * synchronously from the embedded text, EntryView is memoized,
 * and scroll progress lives in an external store the header
 * subscribes to — the page never re-renders for scroll. The
 * describes below pin THAT behaviour; the rig is v403's.
 *
 * Jonathan, Oct 31, 23:24 PDT: "Loading into 1 John 2 was
 * extremely laggy. So much so that the little box popped up
 * asking me if I wanted to wait or force quit… Just tapping the
 * read button going into the chapter itself was laggy. It took
 * a minute."
 *
 * The chapter's data is innocent: his stores are small (marks
 * hold eight entries), the chapter ships in the app, and its
 * verses are embedded — nothing is fetched and nothing big is
 * parsed. The mount is the stall. The selection model renders
 * every word as its own touchable + view + text, and the page
 * mounted the WHOLE chapter in one commit: 1 John 2 carries
 * ~6,700 words of verses and notes (≈20,000 components), and
 * the page's store landings re-rendered that tree on top of the
 * mount. One unbroken JS block long enough for Android's
 * wait-or-quit box.
 *
 * The fix: entries mount progressively under a character budget
 * (MOUNT_FIRST_CHARS, then one MOUNT_STEP_CHARS slice per
 * animation frame). The first slice paints with the page — a
 * chapter reads from the top immediately — and the rest land
 * below the fold over the next frames. The scroll handler also
 * quantizes its progress commits, so scrolling a mounted wordy
 * chapter no longer re-renders the tree on every throttled
 * scroll event. The selection model, the marks, the layout —
 * untouched; only the mount order changed.
 *
 * Pins below: the source carries the budget, the gate and the
 * quantized progress; and a first paint of 1 John 2 (SSR, where
 * effects never run, so what renders is exactly the first
 * slice) carries the chapter's opening words and NOT its
 * closing ones — the slice boundary made visible.
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

import { ChapterPageView } from '../../components/bible-v205/chapter-page';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');

/** The chapter page's source — the v341 re-based progress pin below
 * proves the thread's colour through its wiring, so it reads the
 * seat's source once, outside the matrix loop. */
const chapterPageSrc = read('components/bible-v205/chapter-page.tsx');

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
  const i = phraseIndex(html, needle);
  expect(i, `"${needle}" present in render`).toBeGreaterThan(-1);
  const before = html.slice(Math.max(0, i - 900), i);
  const matches = [...before.matchAll(/color:rgba\((\d+),(\d+),(\d+)/g)];
  expect(matches.length, `a text color precedes "${needle}"`).toBeGreaterThan(0);
  return rgbaToHex(matches[matches.length - 1]);
}

// v390 amendment: the chapter's own prose (opener, notes) now
// renders through the selection model — his ruling that his
// notes select and tint like the verses — so a phrase's words
// arrive as separate word elements with markup between them.
// The probe therefore locates a phrase across the tags instead
// of as one raw substring. What it measures is unchanged: the
// words are painted, in order, in a text element whose colour
// the contrast check reads.
function phraseIndex(html: string, phrase: string): number {
  const pattern = phrase
    .split(' ')
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('(?:<[^>]*>|\\s)*');
  const m = new RegExp(pattern).exec(html);
  return m ? m.index : -1;
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


describe('v405 — the chapter mounts whole, as plain native text elements', () => {
  it('the v403 slicing is gone: no budget, no gate, no frame-stepper', () => {
    expect(chapterPageSrc).not.toContain('MOUNT_FIRST_CHARS');
    expect(chapterPageSrc).not.toContain('MOUNT_STEP_CHARS');
    expect(chapterPageSrc).not.toContain('mountedEntryKeys');
    expect(chapterPageSrc).not.toContain('setMountChars');
    expect(chapterPageSrc).not.toContain('MOUNT_STEP');
  });

  it('verses seed synchronously from the embedded text; the stores load once per chapter, batched', () => {
    expect(chapterPageSrc).toContain('embeddedVerses(book, chapter) ?? []');
    expect(chapterPageSrc).toContain(
      'Promise.all([loadMarks(), loadStudyState(), loadStudioImports(), loadPeopleList(), loadProfileIdentity()])',
    );
    // The dependency loop is dead: the load effect no longer
    // depends on chapterData (which derives from a state the
    // effect itself sets).
    expect(chapterPageSrc).not.toContain('}, [book, chapter, chapterData]);');
    expect(chapterPageSrc).toContain('}, [book, chapter]);');
  });

  it('EntryView is memoized behind one stable actions object; scroll state left the page', () => {
    expect(chapterPageSrc).toContain('const EntryView = memo(function EntryView');
    expect(chapterPageSrc).toContain('actions={entryActions}');
    expect(chapterPageSrc).toContain('useSyncExternalStore');
    expect(chapterPageSrc).not.toContain('scrollEnabled');
    expect(chapterPageSrc).not.toContain('const [progress, setProgress]');
  });

  it('the scroll handler quantizes its progress commits', () => {
    expect(chapterPageSrc).toContain('progressRef');
    expect(chapterPageSrc).toContain('Math.abs(nextProgress - progressRef.current) >= 0.002');
  });

  it('a first paint of 1 John 2 carries the WHOLE chapter — opening and closing words together', () => {
    rig.skin = 'classic';
    rig.accent = 'default';
    rig.scheme = 'dark';
    const html = renderToString(chapterEl('1 John', 2)).replace(/<!-- -->/g, '');
    expect(html).toContain('1 John · Chapter 02');
    expect(phraseIndex(html, 'Notice the way in which John is addressing')).toBeGreaterThan(-1);
    // The final entry's line (verse 29) is in the FIRST commit
    // now — the mount is ~113 text elements, not the old
    // engine's ~20,541 per-word components, so nothing needs
    // slicing any more.
    expect(phraseIndex(html, 'Another great thing to live in')).toBeGreaterThan(-1);
    // The element census is the honest witness: the per-word
    // engine would have emitted tens of thousands of elements
    // for this chapter; the plain native-text tree stays in the
    // low thousands even counting RNW's wrapper divs.
    const elementCount = (html.match(/<[a-z]/g) ?? []).length;
    expect(elementCount).toBeLessThan(6000);
  });

  it('a small chapter still paints whole on first paint (Genesis 1 fits the story)', () => {
    rig.skin = 'classic';
    rig.accent = 'default';
    rig.scheme = 'light';
    const html = renderToString(chapterEl('Genesis', 1)).replace(/<!-- -->/g, '');
    expect(html).toContain('Genesis · Chapter 01');
    expect(phraseIndex(html, 'In the beginning')).toBeGreaterThan(-1);
  });
});
