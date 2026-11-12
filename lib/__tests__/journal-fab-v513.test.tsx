/**
 * v513 — the Journal FAB (Concept 1, "Spring Stack"; Jonathan's
 * pick + build word, Nov 12, journal-fab-concepts-v1.html).
 *
 * The Journal gets the shared FAB treatment People and Schedule
 * already have: a 56dp circle bottom-right; the + whips, the
 * ring draws, and a PEN takes the ring (Journal's mark — praying
 * hands stays rejected); the six entry kinds spring up as
 * circles, Entry nearest the FAB in the full seed, the other
 * five tonal with seed-deep icons. A pick opens the Write Page
 * with that kind set and the Today's Page draft carried in —
 * the retired "Entry >" footer link's door, replicated exactly.
 * The link is GONE from the card; the Post button stays as
 * quick-post for a plain Entry only; the "Long entry" filter
 * chip is untouched and keeps its own door.
 *
 * Real renders throughout (the v512 rig's discipline): the REAL
 * PrayerJournalTab, the REAL bridge + JournalFabHost mounted as
 * siblings the way the shell mounts them, the REAL ScheduleFab
 * and FabCircleGlyph. Only the heavy neighbours (sheets, the Day
 * view, the kind posts) are stubbed, and the Write Page is a
 * recorder — what it receives IS the door's contract.
 */
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// The Desk's reveal-after-post rides requestAnimationFrame —
// the node environment has none; run the frame inline.
(globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = (cb: () => void) => {
  cb();
  return 0;
};

// ─── Storage ────────────────────────────────────────────────────────────────

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
    multiSet: async (pairs: [string, string][]) => {
      for (const [k, v] of pairs) store.set(k, v);
    },
    multiRemove: async (ks: string[]) => {
      for (const k of ks) store.delete(k);
    },
  },
}));

// ─── Native / animated neighbours ───────────────────────────────────────────

vi.mock('react-native', async () => {
  const React = await import('react');
  class ScrollView extends React.Component<Record<string, unknown>> {
    scrollTo() {}
    render() {
      const { children, ...rest } = this.props;
      return React.createElement('ScrollView', rest, children as React.ReactNode);
    }
  }
  class FlatList extends React.Component<Record<string, unknown>> {
    scrollToOffset() {}
    scrollToIndex() {}
    render() {
      const p = this.props as {
        data?: unknown[];
        renderItem?: (info: { item: unknown; index: number }) => React.ReactNode;
        ListHeaderComponent?: React.ReactNode;
        ListEmptyComponent?: React.ReactNode;
      };
      const data = p.data ?? [];
      return React.createElement(
        'FlatList',
        null,
        p.ListHeaderComponent ?? null,
        ...(data.length === 0
          ? [p.ListEmptyComponent ?? null]
          : data.map((item, index) => p.renderItem?.({ item, index }) ?? null)),
      );
    }
  }
  const Modal = (props: Record<string, unknown>) =>
    props.visible ? React.createElement('Modal', props, props.children as React.ReactNode) : null;
  return {
    View: 'View',
    Text: 'Text',
    Pressable: 'Pressable',
    TextInput: 'TextInput',
    Modal,
    ScrollView,
    FlatList,
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      hairlineWidth: 0.5,
      absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
      absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    },
    Platform: { OS: 'android', select: (o: any) => o.android ?? o.default },
    Dimensions: { get: () => ({ width: 390, height: 844 }) },
    BackHandler: {
      addEventListener: () => ({ remove: () => undefined }),
    },
    AccessibilityInfo: {
      isReduceMotionEnabled: async () => false,
      addEventListener: () => ({ remove: () => undefined }),
    },
  };
});

vi.mock('react-native-reanimated', async () => {
  const React = await import('react');
  const AV = (props: any) => React.createElement('AnimatedView', props, props?.children);
  const interpolate = (v: number, input: number[], output: number[]) => {
    if (v <= input[0]) return output[0];
    for (let i = 1; i < input.length; i++) {
      if (v <= input[i]) {
        const t = (v - input[i - 1]) / (input[i] - input[i - 1]);
        return output[i - 1] + t * (output[i] - output[i - 1]);
      }
    }
    return output[output.length - 1];
  };
  return {
    __esModule: true,
    default: { View: AV, createAnimatedComponent: (c: any) => c },
    View: AV,
    Easing: {
      bezier: () => ({}),
      in: (f: any) => f,
      out: (f: any) => f,
      inOut: (f: any) => f,
      linear: {},
      quad: {},
      cubic: {},
      sin: {},
      steps: () => ({}),
    },
    Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    cancelAnimation: () => undefined,
    interpolate,
    interpolateColor: (_v: number, _i: unknown, o: string[]) => o[0],
    runOnJS: (fn: (...a: unknown[]) => unknown) => (...a: unknown[]) => fn(...a),
    useAnimatedStyle: (fn: () => Record<string, unknown>) => {
      try {
        return fn();
      } catch {
        return {};
      }
    },
    useAnimatedProps: (fn: () => Record<string, unknown>) => {
      try {
        return fn();
      } catch {
        return {};
      }
    },
    // Stateful, as the real hook is: one mutable per call site.
    useSharedValue: (v: unknown) => {
      const ref = React.useRef<{ value: unknown } | null>(null);
      if (ref.current === null) ref.current = { value: v };
      return ref.current;
    },
    withDelay: (_d: unknown, v: unknown) => v,
    withRepeat: (v: unknown) => v,
    withSequence: (...args: unknown[]) => args[args.length - 1],
    withSpring: (v: unknown) => v,
    withTiming: (v: unknown, _cfg?: unknown, cb?: (finished: boolean) => void) => {
      if (typeof cb === 'function') cb(true);
      return v;
    },
  };
});

vi.mock('react-native-svg', () => ({
  default: 'Svg',
  Svg: 'Svg',
  Circle: 'Circle',
  Line: 'Line',
  Path: 'Path',
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('@expo/vector-icons/MaterialIcons', () => ({ default: 'MaterialIcons' }));

vi.mock('expo-image', () => ({ Image: 'Image' }));

vi.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: async () => ({ granted: true }),
  launchImageLibraryAsync: async () => ({ canceled: true, assets: [] }),
}));

vi.mock('expo-router', async () => {
  const React = await import('react');
  return {
    useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn(), navigate: vi.fn(), setParams: vi.fn() }),
    useFocusEffect: (cb: () => void | (() => void)) => {
      React.useEffect(() => {
        const cleanup = cb();
        return typeof cleanup === 'function' ? cleanup : undefined;
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
    },
  };
});

vi.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
}));

// ─── Theme / skin neighbours (the REAL derivations ride on these) ──────────

vi.mock('@/hooks/use-colors', async () => {
  const { getThemedPalette } = await import('@/lib/color-themes');
  const palette = getThemedPalette('light', 'default' as never);
  return { useColors: () => palette };
});

vi.mock('@/hooks/use-skin', async () => {
  const { getSkinTokens } = await import('@/lib/skin-themes');
  const { getThemedPalette } = await import('@/lib/color-themes');
  const tokens = getSkinTokens('classic', 'light', getThemedPalette('light', 'default' as never) as never);
  return {
    useSkin: () => ({
      skin: 'classic',
      isPaper: false,
      isEightBit: false,
      isTerminal: false,
      isSkinned: false,
      monoFont: undefined,
      tokens,
      motion: tokens.motion,
    }),
  };
});

vi.mock('@/hooks/use-keyboard-height', () => ({ useKeyboardHeight: () => 0 }));

vi.mock('@/components/app-tab-bar', () => ({
  useTabBarOccupiedHeight: () => 81,
  AppTabBar: () => null,
}));

// ─── The tab's heavy neighbours ─────────────────────────────────────────────

vi.mock('@/components/avatar-system', () => ({ AvatarImage: 'AvatarImage' }));
vi.mock('@/components/date-time-picker', () => ({ DateTimePicker: () => null }));
vi.mock('@/components/journal-day', () => ({ JournalDay: () => null }));
vi.mock('@/components/journal-kind-post', () => ({
  FastLogCard: () => null,
  JournalKindPost: () => null,
  ReachedLinesGroup: () => null,
  timeLabel12: () => '',
}));
vi.mock('@/components/journal-post', () => ({ JournalPost: () => null }));
vi.mock('@/components/journal-sheets', () => ({
  CalendarSheet: () => null,
  PersonSheet: () => null,
  TagSheet: () => null,
}));
vi.mock('@/components/top-fade', () => ({
  TopFade: () => null,
  topFadeScrollHandler: () => () => undefined,
  useTopFadeScrollY: () => ({ value: 0 }),
}));
vi.mock('@/components/paper-motion', async () => {
  const React = await import('react');
  return {
    PaperSettle: ({ children }: any) => React.createElement(React.Fragment, null, children),
    paperPressedLift: () => null,
  };
});
vi.mock('@/components/bit-motion', async () => {
  const React = await import('react');
  return {
    BitSettle: ({ children }: any) => React.createElement(React.Fragment, null, children),
    bitPressedSnap: () => null,
  };
});
vi.mock('@/components/mood-picker', () => ({ MoodPicker: () => null }));
vi.mock('@/lib/schedule-data', () => ({ SCHEDULE_EVENTS_KEY: 'prayercircle.schedule.events.v1' }));

// The Write Page is a recorder: the props it receives ARE the
// door's contract (kind set, draft carried).
const writePage = vi.hoisted(() => ({ latest: null as null | Record<string, unknown> }));
vi.mock('@/components/journal-write', async () => {
  const React = await import('react');
  return {
    JournalWrite: (props: Record<string, unknown>) => {
      writePage.latest = props;
      return React.createElement('JournalWrite', props);
    },
  };
});

import { FabCircleGlyph } from '../../components/fab-circle-glyph';
import { JournalFabHost } from '../../components/journal-fab-host';
import { PrayerJournalTab } from '../../components/prayer-journal-tab';
import { getThemedPalette } from '../color-themes';
import { deriveJournalMaterial } from '../journal-material';
import { setJournalFabConfig } from '../journal-fab-bridge';
import type { DeskPostKind } from '../journal-desk';
import type { PrayerJournalEntry } from '../prayer-journal';

const palette = getThemedPalette('light', 'default' as never);
const jm = deriveJournalMaterial(palette.primary, {
  background: palette.background,
  surface: palette.surface,
  foreground: palette.foreground,
  muted: palette.muted,
  border: palette.border,
});

// ─── Harness: the shell's arrangement — the tab owns the journal
// state; the host mounts beside it, after the tab bar's layer. ───

function DeskHarness({ onEntries }: { onEntries?: (entries: PrayerJournalEntry[]) => void }) {
  const [entries, setEntries] = React.useState<PrayerJournalEntry[]>([]);
  return (
    <>
      <PrayerJournalTab
        entries={entries}
        people={[]}
        onChange={(next) => {
          onEntries?.(next);
          setEntries(next);
        }}
      />
      <JournalFabHost />
    </>
  );
}

async function renderDesk(onEntries?: (entries: PrayerJournalEntry[]) => void) {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<DeskHarness onEntries={onEntries} />);
  });
  // Let the mount effects (side-data load, FAB registration) land.
  await act(async () => {
    await Promise.resolve();
  });
  return renderer;
}

const pressables = (root: ReactTestInstance) => root.findAllByType('Pressable' as never);
const byLabel = (root: ReactTestInstance, label: string) =>
  pressables(root).find((p) => p.props.accessibilityLabel === label);
const textsOf = (node: ReactTestInstance): string[] =>
  node
    .findAll((n) => n.type === 'Text' || n.type === 'AnimatedText')
    .flatMap((t) => (Array.isArray(t.props.children) ? t.props.children : [t.props.children]))
    .map((c) => String(c ?? ''));

async function typeDraft(renderer: ReactTestRenderer, text: string) {
  const input = renderer.root
    .findAllByType('TextInput' as never)
    .find((t) => t.props.placeholder === "Write it down while it's still today…");
  expect(input, "the Today's Page draft box renders").toBeTruthy();
  await act(async () => {
    input!.props.onChangeText(text);
  });
}

async function openFab(renderer: ReactTestRenderer) {
  const fab = byLabel(renderer.root, 'Add');
  expect(fab, 'the FAB button renders (closed face labelled Add)').toBeTruthy();
  await act(async () => {
    fab!.props.onPress();
  });
}

const KINDS_TOP_TO_BOTTOM: { kind: DeskPostKind; label: string; icon: string }[] = [
  { kind: 'verse', label: 'Verse', icon: 'menu-book' },
  { kind: 'gratitude', label: 'Gratitude', icon: 'star' },
  { kind: 'answered', label: 'Answered', icon: 'check-circle' },
  { kind: 'prayer', label: 'Prayer', icon: 'favorite-border' },
  { kind: 'fast', label: 'Fast', icon: 'whatshot' },
  { kind: 'entry', label: 'Entry', icon: 'edit' },
];

beforeEach(() => {
  store.clear();
  writePage.latest = null;
  setJournalFabConfig(null);
});

afterEach(() => {
  setJournalFabConfig(null);
});

// ─── The FAB on the Desk: closed, then open ─────────────────────────────────

describe('v513 · the Journal FAB stands on the Desk', () => {
  it('closed: a 56dp seed circle labelled Add; the menu rows stand parked (not pressable); the scrim is clear', async () => {
    const renderer = await renderDesk();
    const fab = byLabel(renderer.root, 'Add');
    expect(fab).toBeTruthy();
    const style = typeof fab!.props.style === 'function' ? fab!.props.style({ pressed: false }) : fab!.props.style;
    const flat = Object.assign({}, ...(Array.isArray(style) ? style : [style]));
    expect(flat.width).toBe(56);
    expect(flat.height).toBe(56);
    expect(flat.borderRadius).toBe(28);
    expect(flat.backgroundColor).toBe(palette.primary);

    // All six rows are mounted (the spring's seats) but parked:
    // pointerEvents none, in the mockup's top-to-bottom order.
    const rows = pressables(renderer.root).filter(
      (p) => typeof p.props.accessibilityLabel === 'string' && p.props.accessibilityLabel.startsWith('Add '),
    );
    expect(rows.map((r) => r.props.accessibilityLabel)).toEqual(KINDS_TOP_TO_BOTTOM.map((k) => `Add ${k.label}`));
    for (const row of rows) expect(row.props.pointerEvents).toBe('none');

    // The scrim is mounted but fully clear while closed.
    const scrim = renderer.root
      .findAllByType('AnimatedView' as never)
      .find((v) => (Array.isArray(v.props.style) ? Object.assign({}, ...v.props.style) : v.props.style)?.backgroundColor === 'rgba(24,20,44,0.38)');
    expect(scrim, 'the scrim renders').toBeTruthy();
    const scrimStyle = Object.assign({}, ...(Array.isArray(scrim!.props.style) ? scrim!.props.style : [scrim!.props.style]));
    expect(scrimStyle.opacity).toBe(0);
  });

  it('open: the ring is the open state (button relabels, no × anywhere), the scrim dims, the Desk scales to .975, rows go live', async () => {
    const renderer = await renderDesk();
    await openFab(renderer);
    // Force the settle re-render the shell gets from its own
    // state churn — animated values land in the styles.
    await act(async () => {
      renderer.update(<DeskHarness />);
    });

    expect(byLabel(renderer.root, 'Add')).toBeUndefined();
    expect(byLabel(renderer.root, 'Close add menu')).toBeTruthy();
    // No ×: no close icon and no × glyph anywhere in the tree.
    const icons = renderer.root.findAllByType('MaterialIcons' as never);
    expect(icons.some((i) => i.props.name === 'close')).toBe(false);
    expect(textsOf(renderer.root).some((t) => t.includes('×'))).toBe(false);

    const scrim = renderer.root
      .findAllByType('AnimatedView' as never)
      .find((v) => (Array.isArray(v.props.style) ? Object.assign({}, ...v.props.style) : v.props.style)?.backgroundColor === 'rgba(24,20,44,0.38)');
    const scrimStyle = Object.assign({}, ...(Array.isArray(scrim!.props.style) ? scrim!.props.style : [scrim!.props.style]));
    expect(scrimStyle.opacity).toBe(1);

    // The Desk root carries the page scale, settled at .975.
    const deskRoot = renderer.root
      .findAllByType('AnimatedView' as never)
      .find((v) => v.findAllByType('FlatList' as never).length > 0);
    expect(deskRoot, 'the Desk root renders').toBeTruthy();
    const rootStyle = Object.assign({}, ...(Array.isArray(deskRoot!.props.style) ? deskRoot!.props.style : [deskRoot!.props.style]));
    expect(rootStyle.transform).toEqual([{ scale: 0.975 }]);

    const rows = pressables(renderer.root).filter(
      (p) => typeof p.props.accessibilityLabel === 'string' && p.props.accessibilityLabel.startsWith('Add '),
    );
    for (const row of rows) expect(row.props.pointerEvents).toBe('auto');
  });

  it("open: the six circles wear the drawing's dress — Entry full seed + white pen nearest the FAB, the rest tonal with deep icons", async () => {
    const renderer = await renderDesk();
    await openFab(renderer);
    const rows = pressables(renderer.root).filter(
      (p) => typeof p.props.accessibilityLabel === 'string' && p.props.accessibilityLabel.startsWith('Add '),
    );
    expect(rows).toHaveLength(6);
    rows.forEach((row, i) => {
      const want = KINDS_TOP_TO_BOTTOM[i];
      // The label rides at the circle's left.
      expect(textsOf(row)).toContain(want.label);
      // The 48dp circle.
      const circle = row
        .findAllByType('View' as never)
        .find((v) => {
          const s = (v.props.style ?? {}) as Record<string, unknown>;
          return s.width === 48 && s.height === 48 && s.borderRadius === 24;
        });
      expect(circle, `${want.label}'s circle renders`).toBeTruthy();
      const circleStyle = circle!.props.style as Record<string, unknown>;
      // The icon inside it.
      const icon = row.findAllByType('MaterialIcons' as never)[0];
      expect(icon.props.name).toBe(want.icon);
      if (want.kind === 'entry') {
        expect(circleStyle.backgroundColor).toBe(jm.seed);
        expect(icon.props.color).toBe('#FFFFFF');
      } else {
        expect(circleStyle.backgroundColor).toBe(jm.tonal);
        expect(icon.props.color).toBe(jm.deep);
      }
    });
  });
});

// ─── The doors: every kind opens the Write Page, draft carried ─────────────

describe('v513 · each kind is a door to the Write Page with the kind set and the draft carried', () => {
  for (const { kind, label } of KINDS_TOP_TO_BOTTOM) {
    it(`${label}: tapping its circle opens the Write Page as kind "${kind}" with the Today's Page draft in it`, async () => {
      const renderer = await renderDesk();
      await typeDraft(renderer, 'A draft worth carrying');
      await openFab(renderer);
      const row = byLabel(renderer.root, `Add ${label}`);
      expect(row).toBeTruthy();
      await act(async () => {
        row!.props.onPress();
      });
      expect(writePage.latest, 'the Write Page mounted').toBeTruthy();
      expect(writePage.latest!.initialKind).toBe(kind);
      expect(writePage.latest!.initialBody).toBe('A draft worth carrying');
      // The FAB leaves with the Desk — the Write Page surface
      // carries no add button.
      expect(byLabel(renderer.root, 'Add')).toBeUndefined();
      await act(async () => {
        renderer.unmount();
      });
    });
  }

  it('an empty draft rides too — the door is the same door the Long entry chip has always been', async () => {
    const renderer = await renderDesk();
    await openFab(renderer);
    const row = byLabel(renderer.root, 'Add Entry');
    await act(async () => {
      row!.props.onPress();
    });
    expect(writePage.latest!.initialKind).toBe('entry');
    expect(writePage.latest!.initialBody).toBe('');
  });
});

// ─── The card after the link: Post stays, the count stays ──────────────────

describe("v513 · the Today's Page card keeps Post and the count — the Entry > link is gone", () => {
  it('no "Open the full editor" door remains anywhere on the Desk', async () => {
    const renderer = await renderDesk();
    expect(byLabel(renderer.root, 'Open the full editor')).toBeUndefined();
    // And the footer's old label text (the kind link's word) is
    // not standing in the card either.
    const card = renderer.root
      .findAllByType('TextInput' as never)
      .find((t) => t.props.placeholder === "Write it down while it's still today…");
    expect(card).toBeTruthy();
  });

  it('Post still quick-posts a plain Entry from the draft — and only that', async () => {
    const seen: PrayerJournalEntry[][] = [];
    const renderer = await renderDesk((next) => seen.push(next));
    expect(textsOf(renderer.root)).toContain('0 posts today');
    await typeDraft(renderer, 'Posted from the card');
    const post = byLabel(renderer.root, 'Post');
    expect(post, 'the Post button stays').toBeTruthy();
    await act(async () => {
      post!.props.onPress();
    });
    expect(seen).toHaveLength(1);
    expect(seen[0]).toHaveLength(1);
    expect(seen[0][0].body).toBe('Posted from the card');
    expect(seen[0][0].kind ?? 'entry').toBe('entry');
    // The card clears and the count moves.
    const input = renderer.root
      .findAllByType('TextInput' as never)
      .find((t) => t.props.placeholder === "Write it down while it's still today…");
    expect(input!.props.value).toBe('');
    expect(textsOf(renderer.root)).toContain('1 post today');
  });

  it('the "Long entry" chip in the filter row is untouched — still there, still a door with the draft', async () => {
    const renderer = await renderDesk();
    await typeDraft(renderer, 'A longer thought');
    const chip = pressables(renderer.root).find((p) => textsOf(p).includes('Long entry'));
    expect(chip, 'the Long entry chip stays in the filter row').toBeTruthy();
    // Its neighbour is still the Bookmarks chip.
    expect(pressables(renderer.root).some((p) => textsOf(p).includes('Bookmarks'))).toBe(true);
    await act(async () => {
      chip!.props.onPress();
    });
    expect(writePage.latest!.initialKind).toBe('entry');
    expect(writePage.latest!.initialBody).toBe('A longer thought');
  });
});

// ─── The glyph: the pen in the ring ─────────────────────────────────────────

describe('v513 · the glyph — the pen takes the ring on Journal', () => {
  const PEN_D = 'M8.2 15.8l.8-3.2L15.5 6a1.5 1.5 0 012.2 2.1l-6.6 6.6-3.2.8.3-.7Z';
  const RING_LENGTH = 2 * Math.PI * 8.2;

  async function renderGlyph(open: boolean) {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<FabCircleGlyph open={open} variant="pen" color="#FFFFFF" />);
    });
    return renderer;
  }

  it('closed: the plain + stands; the ring is parked undrawn and the pen is parked invisible', async () => {
    const renderer = await renderGlyph(false);
    expect(renderer.root.findAllByType('Line' as never)).toHaveLength(2);
    const ring = renderer.root.findAllByType('Circle' as never)[0];
    expect(ring.props.r).toBe(8.2);
    expect(ring.props.animatedProps.strokeDashoffset).toBeCloseTo(RING_LENGTH, 5);
    expect(ring.props.animatedProps.opacity).toBe(0);
    const pen = renderer.root.findAllByType('Path' as never).find((p) => p.props.d === PEN_D);
    expect(pen, "the mockup's own pen path rides the glyph").toBeTruthy();
    expect(pen!.props.fill).toBe('#FFFFFF');
    expect(pen!.props.animatedProps.opacity).toBe(0);
  });

  it('open: the ring draws home and the pen pops to full size inside it — and there is still no ×', async () => {
    const renderer = await renderGlyph(true);
    // The settle re-render, as on device: animated values land.
    await act(async () => {
      renderer.update(<FabCircleGlyph open={true} variant="pen" color="#FFFFFF" />);
    });
    const ring = renderer.root.findAllByType('Circle' as never)[0];
    expect(ring.props.animatedProps.strokeDashoffset).toBeCloseTo(0, 5);
    expect(ring.props.animatedProps.opacity).toBe(1);
    const pen = renderer.root.findAllByType('Path' as never).find((p) => p.props.d === PEN_D);
    expect(pen!.props.animatedProps.opacity).toBe(1);
    expect(pen!.props.animatedProps.transform).toContain('scale(1)');
    expect(renderer.root.findAllByType('MaterialIcons' as never)).toHaveLength(0);
  });

  it('the other pages’ marks are untouched: person keeps head + shoulders, check keeps its stroke', async () => {
    let person!: ReactTestRenderer;
    await act(async () => {
      person = TestRenderer.create(<FabCircleGlyph open={true} variant="person" color="#FFFFFF" />);
    });
    const paths = person.root.findAllByType('Path' as never).map((p) => p.props.d);
    expect(paths).toContain('M7.7 16.6 C8.5 14.5 10.1 13.7 12 13.7 C13.9 13.7 15.5 14.5 16.3 16.6');
    let check!: ReactTestRenderer;
    await act(async () => {
      check = TestRenderer.create(<FabCircleGlyph open={true} variant="check" color="#FFFFFF" />);
    });
    expect(check.root.findAllByType('Path' as never).map((p) => p.props.d)).toContain('M8.3 12.5 L11.0 15.1 L15.7 9.6');
  });
});
