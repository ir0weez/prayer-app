/**
 * v502 — Downloaded audio renders: the Books card and the
 * Downloads page. Both screens mount under the v241/v424 harness
 * (react-dom/server over react-native-web), with the Ten Stops
 * filesystem swapped for an in-memory disk holding Hebrews' tour
 * at the registry's exact size, and lib/downloads' store warmed
 * by a real refreshDownloads() before the paint — so what renders
 * is what the disk said, through the app's own door.
 *
 * The pins: with the tour on disk, the Books card stands with
 * its summary line, its ground the Hebrews book palette's
 * primary container (violet tintA) and its disc the book primary
 * — the newest download's family; with an empty disk the card is
 * simply absent. The page renders the storage card (total +
 * segmented bar in the book primary), the Tours group with the
 * Hebrews row dressed in violet (disc tintA/deep, tag, primary
 * play button), the Your Voice group with its empty line, the
 * honest footer, and Remove all; emptied, it keeps the group and
 * the footer and drops the rest.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rig = vi.hoisted(() => ({ scheme: 'light' as 'dark' | 'light' }));
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

import BibleBooksScreen from '../../app/bible-chapters';
import BibleDownloadsScreen from '../../app/bible-downloads';
import { buildBiblePalette } from '../../components/bible-v205/palette';
import { getThemedPalette } from '../color-themes';
import { getTenStops } from '../ten-stops';
import {
  resetTenStopsDownloadsForTests,
  setTenStopsFileSystemForTests,
  type TenStopsFileSystem,
} from '../ten-stops-download';
import { refreshDownloads, resetDownloadsForTests } from '../downloads';

const HEBREWS = getTenStops('Hebrews')!;
const FILE_URI = 'file:///docs/ten-stops/hebrews-ten-stops.m4a';
const files = new Map<string, { size: number; mtime: number }>();
const fakeFs: TenStopsFileSystem = {
  documentDirectory: 'file:///docs/',
  getInfoAsync: async (path: string) => {
    const f = files.get(path);
    return f ? { exists: true, size: f.size, modificationTime: f.mtime } : { exists: false };
  },
  makeDirectoryAsync: async () => undefined,
  deleteAsync: async (path: string) => {
    files.delete(path);
  },
  createDownloadResumable: () => {
    throw new Error('renders never start a transfer');
  },
};

function rgbaOf(hex: string): string {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b}`;
}

/** The last style value of `kind` (e.g. 'background-color') before `needle`. */
function lastStyleBefore(html: string, needle: string, kind: string): string {
  const i = html.indexOf(needle);
  expect(i, `"${needle}" present in render`).toBeGreaterThan(-1);
  const before = html.slice(Math.max(0, i - 900), i);
  const matches = [...before.matchAll(new RegExp(`${kind}:rgba\\((\\d+),(\\d+),(\\d+)`, 'g'))];
  expect(matches.length, `a ${kind} precedes "${needle}"`).toBeGreaterThan(0);
  const m = matches[matches.length - 1];
  return `rgba(${m[1]},${m[2]},${m[3]}`;
}

beforeEach(() => {
  files.clear();
  resetTenStopsDownloadsForTests();
  resetDownloadsForTests();
  setTenStopsFileSystemForTests(fakeFs);
});

async function renderBooksWithTour() {
  files.set(FILE_URI, { size: HEBREWS.sizeBytes, mtime: 1000 });
  await refreshDownloads();
  return renderToString(React.createElement(BibleBooksScreen)).replace(/<!-- -->/g, '');
}

describe('v502 — the Downloaded audio card on Books (tour on disk)', () => {
  it('the card stands, naming the tour and its size on this phone', async () => {
    const html = await renderBooksWithTour();
    expect(html).toContain('Downloaded audio');
    expect(html).toContain('Ten Stops in Hebrews · 5.6 MB on this phone');
    expect(html).toContain('icon:file-download');
  });

  it('the card wears the newest download’s family: tint ground, primary disc', async () => {
    const html = await renderBooksWithTour();
    const bookPal = buildBiblePalette(getThemedPalette('light', 'default') as any, 'Hebrews');
    // The two backgrounds standing immediately ahead of the
    // card's glyph, outermost first: the card's ground, then the
    // disc the glyph sits in.
    const i = html.indexOf('icon:file-download');
    expect(i).toBeGreaterThan(-1);
    const before = html.slice(Math.max(0, i - 900), i);
    const bgs = [...before.matchAll(/background-color:rgba\((\d+),(\d+),(\d+)/g)].map(
      (m) => `rgba(${m[1]},${m[2]},${m[3]}`,
    );
    expect(bgs.length).toBeGreaterThanOrEqual(2);
    expect(bgs[bgs.length - 2]).toBe(rgbaOf(bookPal.primCont));
    expect(bgs[bgs.length - 1]).toBe(rgbaOf(bookPal.rasp));
    // …and Hebrews' container IS the violet tintA of the v420 set.
    expect(bookPal.primCont).toBe('#EDDEF5');
    expect(bookPal.rasp).toBe('#7B1FA2');
  });

  it('the card sits in the top cluster — above the first book section', async () => {
    const html = await renderBooksWithTour();
    const card = html.indexOf('Downloaded audio');
    const firstSection = Math.min(
      ...['Current', 'Finished', 'Written', 'Not Started']
        .map((s) => html.indexOf(s))
        .filter((i) => i > -1),
    );
    expect(card).toBeGreaterThan(-1);
    expect(card).toBeLessThan(firstSection);
  });
});

describe('v502 — no downloads, no card', () => {
  it('an empty disk renders the Books screen exactly as before — no card, no placeholder', async () => {
    await refreshDownloads();
    const html = renderToString(React.createElement(BibleBooksScreen)).replace(/<!-- -->/g, '');
    expect(html).not.toContain('Downloaded audio');
    expect(html).not.toContain('on this phone');
  });
});

describe('v502 — the Downloads page (tour on disk)', () => {
  async function renderPage() {
    files.set(FILE_URI, { size: HEBREWS.sizeBytes, mtime: 1000 });
    await refreshDownloads();
    return renderToString(React.createElement(BibleDownloadsScreen)).replace(/<!-- -->/g, '');
  }

  it('the storage card: the total, the count, and the bar in the book’s primary', async () => {
    const html = await renderPage();
    expect(html).toContain('On this phone');
    expect(html).toContain('5.6 MB used by downloads');
    expect(html).toContain('1 item');
    expect(lastStyleBefore(html, '1 item', 'background-color')).toBe(rgbaOf('#7B1FA2'));
  });

  it('the Tours group stands first, its row dressed in Hebrews’ violet', async () => {
    const html = await renderPage();
    const tours = html.indexOf('TEN STOPS TOURS');
    const voice = html.indexOf('YOUR COMMENTARY');
    expect(tours).toBeGreaterThan(-1);
    expect(voice).toBeGreaterThan(tours);
    expect(html).toContain('Ten Stops in Hebrews');
    expect(html).toContain('18:30 · 5.6 MB');
    expect(html).toContain('TOUR');
    // The disc (just ahead of its HEB code) is the violet tintA…
    expect(lastStyleBefore(html, 'HEB', 'background-color')).toBe(rgbaOf('#EDDEF5'));
    // …and the play button (just ahead of its glyph) the primary.
    expect(lastStyleBefore(html, 'icon:play-arrow', 'background-color')).toBe(rgbaOf('#7B1FA2'));
    expect(html).toContain('icon:delete-outline');
  });

  it('the Your Voice group stands with its empty line; the footer and Remove all close the page', async () => {
    const html = (await renderPage()).replace(/&#x27;/g, "'");
    expect(html).toContain('Nothing yet — chapters land here as you record them.');
    expect(html).toContain(
      "Removing a download frees space on this phone. It doesn't delete anything from the library — you can download it again any time.",
    );
    expect(html).toContain('Remove all downloads');
  });
});

describe('v502 — the Downloads page, emptied', () => {
  it('zero state: the voice group and footer stand; tours, rows and Remove all are gone', async () => {
    await refreshDownloads();
    const html = renderToString(React.createElement(BibleDownloadsScreen)).replace(/<!-- -->/g, '');
    expect(html).toContain('0.0 MB used by downloads');
    expect(html).toContain('0 items');
    expect(html).not.toContain('TEN STOPS TOURS');
    expect(html).not.toContain('Ten Stops in Hebrews');
    expect(html).toContain('Nothing yet — chapters land here as you record them.');
    expect(html).not.toContain('Remove all downloads');
  });
});
