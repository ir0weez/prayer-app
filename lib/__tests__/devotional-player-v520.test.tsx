/**
 * v520 — the transcript's automatic follow is REMOVED, by
 * Jonathan's direction.
 *
 * His phone verdict on v519 (Nov 13): the lag was still
 * there. His diagnosis: "It might be because the player is
 * trying to find the transcript spot." His design call:
 * "Maybe it should just open and close, and you press the
 * little pill to catch up in the transcript and THAT'S how
 * it follows the transcript."
 *
 * The audit found the hunting in code, all in
 * components/devotional-listen.tsx: a segment-boundary
 * effect scrolled the page on EVERY boundary while follow
 * was live; the segment layout callback re-seated the camera
 * whenever the spoken row (re)measured; the transcript
 * window anchored on the VOICE and re-sliced as the playhead
 * advanced; the v510 resume timer dragged the camera back
 * ~6s after the reader's scroll ended; and every seek
 * re-engaged all of it. v520 removes the lot for transcript
 * sessions. Pinned here:
 *
 *  (a) playback ticks and segment boundaries issue ZERO
 *      scroll/positioning calls — over a long walk, inside
 *      segments and across boundaries, hands off and after a
 *      drag alike — while the lit dress still follows the
 *      voice (dress, not camera);
 *  (b) opening the player performs NO seat-to-active work:
 *      a reopen mid-tour mounts the transcript at the top of
 *      its panel and seats nothing, however deep the voice
 *      is (the Catch up pill stands instead — the voice is
 *      out of the reader's view);
 *  (c) Catch up performs exactly ONE seat to the spoken
 *      segment — here its immediate branch: the spoken row
 *      has measured before (the reader visited it) but is
 *      unmounted now, and the tap seats off the cached
 *      measurement at once, once, and boundaries after it
 *      add nothing. (The armed branch — row never measured,
 *      seat completed off its landing measurement — is
 *      pinned in devotional-catchup-v512.test.tsx; the
 *      guidepost seat in devotional-player-v519.test.tsx (e)
 *      and below.)
 *  (d) the window slices from the viewport span ONLY: with
 *      the reader mid-tour and the voice deep, the window
 *      stands at the reader's rows — the voice's region does
 *      not mount. (The reader-driven travel itself is pinned
 *      in devotional-player-v519.test.tsx (b).)
 *
 * The chapter sessions' paragraph camera is untouched by
 * v520 (the audit reported the same hunting there; Jonathan's
 * call named the transcript) — its pins stand in
 * devotional-player-v510.test.tsx and
 * devotional-catchup-v512.test.tsx.
 *
 * The rig is the v519 one (real controller over a fake
 * expo-audio, react-test-renderer over string hosts, a
 * ScrollView that records scrollTo).
 */
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ─── The expo-audio fake (the v519 shape) ───────────────────────────────────

const fakeAudio = vi.hoisted(() => {
  const calls = { play: 0, pause: 0, seekTo: [] as number[] };
  const listeners = new Map<string, (status: unknown) => void>();
  const player = {
    play() {
      calls.play += 1;
    },
    pause() {
      calls.pause += 1;
    },
    seekTo(sec: number) {
      calls.seekTo.push(sec);
      return Promise.resolve();
    },
    replace() {},
    addListener(event: string, cb: (status: unknown) => void) {
      listeners.set(event, cb);
      return { remove: () => listeners.delete(event) };
    },
    setActiveForLockScreen() {},
  };
  return {
    calls,
    player,
    createAudioPlayer: (_src: unknown, _opts: unknown) => player,
    setAudioModeAsync: () => Promise.resolve(),
    reset() {
      calls.play = 0;
      calls.pause = 0;
      calls.seekTo = [];
    },
    emitStatus(status: unknown) {
      listeners.get('playbackStatusUpdate')?.(status);
    },
  };
});

vi.mock('expo-audio', () => ({
  createAudioPlayer: fakeAudio.createAudioPlayer,
  setAudioModeAsync: fakeAudio.setAudioModeAsync,
}));

const scroll = vi.hoisted(() => ({ to: [] as { y: number; animated?: boolean }[] }));

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), navigate: vi.fn() }),
}));

vi.mock('react-native', async () => {
  const React = await import('react');
  class ScrollView extends React.Component<Record<string, unknown>> {
    scrollTo(arg: { y: number; animated?: boolean }) {
      scroll.to.push(arg);
    }
    render() {
      const { children, ...rest } = this.props;
      return React.createElement('RNScrollView', rest, children as React.ReactNode);
    }
  }
  return {
    View: 'View',
    Text: 'Text',
    Pressable: 'Pressable',
    ScrollView,
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      hairlineWidth: 0.5,
      absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
      absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    },
    Platform: { OS: 'android', select: (o: any) => o.android ?? o.default },
    AccessibilityInfo: {
      isReduceMotionEnabled: async () => false,
      addEventListener: () => ({ remove: () => undefined }),
    },
    BackHandler: {
      addEventListener: () => ({ remove: () => undefined }),
    },
    PanResponder: {
      create: () => ({ panHandlers: {} }),
    },
    useWindowDimensions: () => ({ width: 390, height: 844 }),
  };
});

vi.mock('react-native-reanimated', async () => {
  const React = await import('react');
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
    default: { View: 'AnimatedView' },
    Easing: { bezier: () => ({}), inOut: (f: unknown) => f, sin: () => ({}) },
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
    useSharedValue: (v: unknown) => {
      const ref = React.useRef<{ value: unknown } | null>(null);
      if (ref.current === null) ref.current = { value: v };
      return ref.current;
    },
    withDelay: (_d: unknown, v: unknown) => v,
    withRepeat: (v: unknown) => v,
    withTiming: (v: unknown, _cfg?: unknown, cb?: (finished: boolean) => void) => {
      if (typeof cb === 'function') cb(true);
      return v;
    },
  };
});

vi.mock('react-native-svg', () => ({
  default: 'Svg',
  Svg: 'Svg',
  Defs: 'Defs',
  LinearGradient: 'LinearGradient',
  Path: 'Path',
  Rect: 'Rect',
  Stop: 'Stop',
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('@expo/vector-icons/MaterialIcons', () => ({ default: 'MaterialIcons' }));

vi.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: async () => undefined,
  deactivateKeepAwake: () => undefined,
}));

vi.mock('@/lib/devotional-audio', () => ({
  devotionalAudioFor: () => 101,
}));

vi.mock('@/lib/bible-v205/verses', () => ({
  loadChapterVerses: async () => [],
}));

vi.mock('../../components/bible-v205/palette', () => ({
  useBiblePalette: () => ({ isDark: false }),
}));

vi.mock('../../components/app-tab-bar', () => ({
  useTabBarOccupiedHeight: () => 0,
}));

vi.mock('../../components/wavy-progress', () => ({
  WavyProgress: 'WavyProgress',
}));

import {
  DevotionalListenView,
  followScrollTarget,
  transcriptCharsPerLine,
  transcriptRowOffsets,
} from '../../components/devotional-listen';
import { devotionalGuideposts, formatClock } from '../devotionals';
import { openDevotional, stopDevotional } from '../devotional-player';
import { devotionalPlayerTheme } from '../devotional-player-theme';
import { getTenStops, tenStopsAsDevotional } from '../ten-stops';
import {
  activeTenStopsTranscriptSegment,
  tenStopsTranscript,
  tenStopsTranscriptRows,
} from '../ten-stops-transcripts';

// The longest tour transcript in the app: Genesis, 506 segments.
const TOUR = tenStopsAsDevotional(getTenStops('Genesis')!);
const SEGS = tenStopsTranscript('Genesis')!;
const MOVEMENTS = devotionalGuideposts(TOUR)!;
const ROWS = tenStopsTranscriptRows(SEGS, MOVEMENTS);
const VIEWPORT_H = 844;
const PANEL_TOP = 500;

const flat = (style: unknown): Record<string, unknown> => {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flat));
  return (style as Record<string, unknown>) ?? {};
};

const segmentDoors = (root: ReactTestInstance) =>
  root
    .findAllByType('Pressable' as never)
    .filter((p) => /^Play from \d+:\d{2}$/.test(String(p.props.accessibilityLabel ?? '')));

const doorFor = (root: ReactTestInstance, startSec: number) =>
  segmentDoors(root).find((p) => p.props.accessibilityLabel === `Play from ${formatClock(startSec)}`);

const catchUpButton = (root: ReactTestInstance) =>
  root.findAllByType('Pressable' as never).filter((b) => b.props.accessibilityLabel === 'Catch up to the audio');

const panelOf = (root: ReactTestInstance): ReactTestInstance =>
  root.findAllByType('View' as never).find((v) => {
    const kids = (Array.isArray(v.props.children) ? v.props.children : [v.props.children]) as {
      type?: unknown;
      props?: { children?: unknown };
    }[];
    return kids.some((c) => c && c.type === 'Text' && c.props?.children === 'TRANSCRIPT');
  })!;

const segRowPos = (segIndex: number): number => {
  let pos = -1;
  ROWS.forEach((r, i) => {
    if (r.kind === 'segment' && r.index === segIndex) pos = i;
  });
  return pos;
};

const fireScroll = (root: ReactTestInstance, y: number) => {
  const host = root.findByType('RNScrollView' as never);
  act(() => {
    host.props.onScroll({ nativeEvent: { contentOffset: { y } } });
  });
};

/** Report the layout the phone would report for everything
 *  currently mounted in the panel: the panel at PANEL_TOP and
 *  the wide measure, each segment door at the rig's seat
 *  convention (index × 100) with a measured height of 100. */
function seatMountedLayout(root: ReactTestInstance) {
  act(() => {
    panelOf(root).props.onLayout({ nativeEvent: { layout: { y: PANEL_TOP, width: 390 } } });
    for (const door of segmentDoors(root)) {
      const idx = SEGS.findIndex(
        (s) => `Play from ${formatClock(s.startSec)}` === door.props.accessibilityLabel,
      );
      if (idx >= 0 && typeof door.props.onLayout === 'function') {
        door.props.onLayout({ nativeEvent: { layout: { y: idx * 100, height: 100 } } });
      }
    }
  });
}

async function renderPlayer() {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<DevotionalListenView devotional={TOUR} onBack={() => undefined} />);
  });
  // Past the v515 hydration tick: the panels stand.
  await act(async () => {
    vi.advanceTimersByTime(1);
  });
  return renderer;
}

async function emitPosition(positionSec: number) {
  await act(async () => {
    fakeAudio.emitStatus({ currentTime: positionSec, duration: TOUR.durationSec, playing: true });
  });
}

const inSeg = (index: number) => SEGS[index].startSec + 0.05;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  stopDevotional();
  fakeAudio.reset();
  scroll.to.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── (a) No automatic camera ────────────────────────────────────────────────

describe('v520 transcript — playback does no position work', () => {
  it('a long walk of ticks and boundaries issues zero scroll calls; the dress still follows', async () => {
    expect(openDevotional(TOUR, { uri: 'file:///genesis-ten-stops.m4a' })).toBe(true);
    const view = await renderPlayer();
    const root = view.root;
    seatMountedLayout(root);
    scroll.to.length = 0;

    // Inside-segment ticks and boundary after boundary,
    // hands off: nothing scrolls, nothing seats.
    for (const i of [1, 2, 3, 5, 8, 13, 21]) {
      await emitPosition((SEGS[i].startSec + SEGS[i + 1].startSec) / 2); // inside segment i
      await emitPosition(inSeg(i + 1)); // across its boundary
      expect(scroll.to).toEqual([]);
    }

    // A drag mid-walk, and long past any resume grace: still
    // nothing — there is no camera to park or to resume.
    const host = root.findByType('RNScrollView' as never);
    act(() => {
      host.props.onScrollBeginDrag();
    });
    await emitPosition(inSeg(30));
    act(() => {
      host.props.onScrollEndDrag();
    });
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    await emitPosition(inSeg(32));
    expect(scroll.to).toEqual([]);

    // And the dress DID follow the whole time: segment 32
    // stands lit in the book's family (it is inside the
    // standing window), its predecessor does not.
    const theme = devotionalPlayerTheme('Genesis', false);
    const lit = doorFor(root, SEGS[32].startSec);
    expect(lit).toBeDefined();
    expect(flat(lit!.props.style).backgroundColor).toBe(theme.stopSeat);
    expect(flat(lit!.props.style).borderLeftColor).toBe(theme.primary);
    await act(async () => {
      view.unmount();
    });
  });
});

// ─── (b) Opening does no seat-to-active work ────────────────────────────────

describe('v520 transcript — opening the player', () => {
  it('a reopen mid-tour opens at the panel’s top and seats nothing, however deep the voice is', async () => {
    expect(openDevotional(TOUR, { uri: 'file:///genesis-ten-stops.m4a' })).toBe(true);
    const first = await renderPlayer();
    // The voice is deep in the tour — Stop 10's doorstep.
    const deep = MOVEMENTS[9].startSec + 0.05;
    await emitPosition(deep);
    const deepIdx = activeTenStopsTranscriptSegment(SEGS, deep);
    expect(deepIdx).toBeGreaterThan(400);
    await act(async () => {
      first.unmount();
    });
    scroll.to.length = 0;

    // Reopen (the pill path mounts a fresh listen view over
    // the live session): the transcript stands at the TOP of
    // its panel — the deep segment's row is not mounted, the
    // first rows are — and seating the layout the phone
    // would report completes NO seat: zero scroll calls.
    const view = await renderPlayer();
    const root = view.root;
    expect(doorFor(root, SEGS[0].startSec)).toBeDefined();
    expect(doorFor(root, SEGS[deepIdx].startSec)).toBeUndefined();
    seatMountedLayout(root);
    expect(scroll.to).toEqual([]);
    expect(doorFor(root, SEGS[deepIdx].startSec)).toBeUndefined();

    // What stands instead is the Catch up pill: the voice is
    // deep, the reader is at the top — out of view by design.
    expect(catchUpButton(root)).toHaveLength(1);
    await act(async () => {
      view.unmount();
    });
  });
});

// ─── (c) Catch up is the only follow ────────────────────────────────────────

describe('v520 transcript — the deliberate seats', () => {
  it('Catch up with a measured-but-unmounted spoken row: exactly one seat, immediately, and nothing after', async () => {
    expect(openDevotional(TOUR, { uri: 'file:///genesis-ten-stops.m4a' })).toBe(true);
    const view = await renderPlayer();
    const root = view.root;
    const offsets390 = transcriptRowOffsets(ROWS, new Map(), transcriptCharsPerLine(390));

    // The reader scrolls deep — to segment 100's region — and
    // the rows there measure (the rig's convention).
    act(() => {
      panelOf(root).props.onLayout({ nativeEvent: { layout: { y: PANEL_TOP, width: 390 } } });
    });
    fireScroll(root, PANEL_TOP + offsets390[segRowPos(100)]);
    seatMountedLayout(root);
    expect(doorFor(root, SEGS[100].startSec)).toBeDefined();

    // The voice is in that region too (segment 97 — a few
    // rows inside the visited window, the way a reader and a
    // voice actually coincide): no pill (it is in view), and
    // arriving there scrolled nothing by itself.
    await emitPosition(inSeg(97));
    expect(scroll.to).toEqual([]);
    expect(catchUpButton(root)).toHaveLength(0);

    // The reader scrolls home. The voice stays deep; segment
    // 97's row unmounts — but its measurement is cached.
    fireScroll(root, PANEL_TOP);
    expect(doorFor(root, SEGS[97].startSec)).toBeUndefined();
    expect(catchUpButton(root)).toHaveLength(1);

    // The tap: exactly one seat, immediately (no arming wait —
    // the measurement exists), at the follow seat.
    await act(async () => {
      catchUpButton(root)[0].props.onPress();
    });
    expect(scroll.to).toEqual([
      { y: followScrollTarget(PANEL_TOP + 97 * 100, VIEWPORT_H), animated: true },
    ]);

    // Playback moves on: boundaries add nothing. The one
    // snap is the whole follow.
    await emitPosition(inSeg(100));
    await emitPosition(inSeg(103));
    expect(scroll.to).toHaveLength(1);
    await act(async () => {
      view.unmount();
    });
  });

  it('a guidepost seat completes once, and playback then moves on without it', async () => {
    expect(openDevotional(TOUR, { uri: 'file:///genesis-ten-stops.m4a' })).toBe(true);
    const view = await renderPlayer();
    const root = view.root;
    seatMountedLayout(root);
    scroll.to.length = 0;

    // Tap Stop 9's guidepost (the v519 (e) seat): the seek
    // runs, no scroll is aimed before the measurement…
    const stop9 = MOVEMENTS[8];
    const guideDoor = root
      .findAllByType('Pressable' as never)
      .find((p) => p.props.accessibilityLabel === `Play from ${stop9.title}`);
    expect(guideDoor).toBeDefined();
    act(() => {
      guideDoor!.props.onPress();
    });
    expect(fakeAudio.calls.seekTo).toContain(stop9.startSec);
    await emitPosition(stop9.startSec + 0.05);
    expect(scroll.to).toEqual([]);

    // …the measurement lands and the seat completes — once.
    const activeIdx = activeTenStopsTranscriptSegment(SEGS, stop9.startSec + 0.05);
    const activeDoor = doorFor(root, SEGS[activeIdx].startSec);
    expect(activeDoor).toBeDefined();
    act(() => {
      activeDoor!.props.onLayout({ nativeEvent: { layout: { y: activeIdx * 100, height: 100 } } });
    });
    expect(scroll.to).toEqual([
      { y: followScrollTarget(PANEL_TOP + activeIdx * 100, VIEWPORT_H), animated: true },
    ]);

    // The voice walks on through the stop: no trailing
    // follow, no second seat — the deliberate act is spent.
    await emitPosition(inSeg(activeIdx + 3));
    await emitPosition(inSeg(activeIdx + 6));
    expect(scroll.to).toHaveLength(1);
    await act(async () => {
      view.unmount();
    });
  });
});

// ─── (d) The window slices from the viewport only ───────────────────────────

describe('v520 transcript — the window’s only anchor is the reader', () => {
  it('reader mid-tour, voice deep: the window stands at the reader’s rows', async () => {
    expect(openDevotional(TOUR, { uri: 'file:///genesis-ten-stops.m4a' })).toBe(true);
    const view = await renderPlayer();
    const root = view.root;

    // The reader scrolls to segment 200's region (no panel
    // layout seated in this rig: the panel's seat is its
    // origin, at the default measure).
    const offsets = transcriptRowOffsets(ROWS, new Map(), transcriptCharsPerLine(350));
    fireScroll(root, offsets[segRowPos(200)]);
    expect(doorFor(root, SEGS[200].startSec)).toBeDefined();

    // Now the voice jumps deep — Stop 10. The window does not
    // so much as twitch: segment 200's region stands, the
    // voice's region does not mount, and nothing scrolls.
    await emitPosition(MOVEMENTS[9].startSec + 0.05);
    expect(doorFor(root, SEGS[200].startSec)).toBeDefined();
    expect(doorFor(root, SEGS[500].startSec)).toBeUndefined();
    expect(scroll.to).toEqual([]);
    await act(async () => {
      view.unmount();
    });
  });
});
