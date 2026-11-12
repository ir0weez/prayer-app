/**
 * v515 — the expand lag (Jonathan's recording, Nov 12, on v512).
 *
 * Collapse now lands on the pill correctly, but tapping the pill
 * to re-open hung on a full screen of solid book colour for over
 * a second before any player content painted. Root cause: the
 * listen view unmounts whole on collapse, so an expand was a
 * from-scratch mount of the ENTIRE page in one synchronous first
 * render — for a Ten Stops tour, the transcript panel's
 * ~300–500 segment Pressables (each with its own layout
 * callback) inside an unvirtualised ScrollView. The coloured
 * surface is one view on the UI-thread morph and was ready at
 * once; the content tree behind it was still being built, so the
 * first frames went to building, not to the page being there.
 *
 * The fix phases the mount: the first render carries only the
 * light face (header, title, hero, seek, controls, pill face);
 * the guideposts / transcript / follow-along panels hydrate one
 * tick later (a 0ms timer), after that first paint is on screen.
 *
 * This rig (the REAL controller with expo-audio faked, the REAL
 * listen view — the v512 rig's shape) holds the hydration tick
 * with fake timers and pins the phase boundary structurally:
 *  (a) at first paint the face is complete — title, context
 *      line, Stop and play controls — while NONE of the tour's
 *      transcript segments are mounted (zero segment doors), and
 *      neither the TRANSCRIPT nor the THE TEN STOPS panel stands;
 *  (b) one tick later the panels hydrate in full: every segment
 *      of the Deuteronomy tour (the book in his video) is a door,
 *      and both panels stand;
 *  (c) a chapter session's face is likewise complete at first
 *      paint, and it never grows a transcript.
 *
 * What this rig CANNOT prove: on-device frame timing. That the
 * light first render actually paints before the hydration commit
 * on Jonathan's phone — and that the bare-colour window is gone
 * there — is his phone's verdict, as always.
 */
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ─── The expo-audio fake (the v506/v512 shape) ──────────────────────────────

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
  };
});

vi.mock('expo-audio', () => ({
  createAudioPlayer: fakeAudio.createAudioPlayer,
  setAudioModeAsync: fakeAudio.setAudioModeAsync,
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), navigate: vi.fn() }),
}));

vi.mock('react-native', async () => {
  const React = await import('react');
  class ScrollView extends React.Component<Record<string, unknown>> {
    scrollTo(_arg: { y: number; animated?: boolean }) {}
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

import { DevotionalListenView } from '../../components/devotional-listen';
import { devotionalContextLine, getDevotional } from '../devotionals';
import { openDevotional, stopDevotional } from '../devotional-player';
import { getTenStops, tenStopsAsDevotional } from '../ten-stops';
import { tenStopsTranscript } from '../ten-stops-transcripts';

// The book in Jonathan's video: the Ten Stops in Deuteronomy
// player, re-opened from the pill.
const TOUR = tenStopsAsDevotional(getTenStops('Deuteronomy')!);
const SEGS = tenStopsTranscript('Deuteronomy')!;
const GENESIS_12 = getDevotional('Genesis', 12)!;

const texts = (root: ReactTestInstance): string[] =>
  root
    .findAll((n) => n.type === 'Text' || n.type === 'AnimatedText')
    .flatMap((t) => (Array.isArray(t.props.children) ? t.props.children : [t.props.children]))
    .map((c) => String(c ?? ''));

/** Segment doors wear a CLOCK label ("Play from 3:25"); guidepost
 * doors wear a stop TITLE. The clock shape tells them apart. */
const segmentDoors = (root: ReactTestInstance) =>
  root
    .findAllByType('Pressable' as never)
    .filter((p) => /^Play from \d+:\d{2}$/.test(String(p.props.accessibilityLabel ?? '')));

const pressableLabels = (root: ReactTestInstance) =>
  root.findAllByType('Pressable' as never).map((p) => String(p.props.accessibilityLabel ?? ''));

async function renderPlayer(devotional: typeof TOUR) {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<DevotionalListenView devotional={devotional} onBack={() => undefined} />);
  });
  return renderer;
}

beforeEach(() => {
  // Hold ONLY the timers: the hydration tick must not fire until
  // the test says so. (Promises — the reduce-motion answer, the
  // audio mode — still resolve on the microtask queue.)
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  stopDevotional();
  fakeAudio.reset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('v515 expand — the first paint is the light face only', () => {
  it('a tour at first paint: face complete, zero of ~400 transcript segments mounted, no panels', async () => {
    expect(openDevotional(TOUR, { uri: 'file:///deuteronomy-ten-stops.m4a' })).toBe(true);
    const view = await renderPlayer(TOUR);
    const page = texts(view.root);

    // The face is all there — this is what paints as the surface
    // expands, instead of bare colour.
    expect(page).toContain(TOUR.title);
    expect(page).toContain(devotionalContextLine(TOUR));
    const labels = pressableLabels(view.root);
    expect(labels).toContain('Stop');
    expect(labels.some((l) => l === 'Pause' || l === 'Play' || l === 'Play again')).toBe(true);
    expect(labels).toContain('Minimize player');

    // The heavy build has NOT happened yet: not one transcript
    // segment is mounted, and neither panel stands.
    expect(SEGS.length).toBeGreaterThan(300);
    expect(segmentDoors(view.root)).toHaveLength(0);
    expect(page).not.toContain('TRANSCRIPT');
    expect(page).not.toContain('THE TEN STOPS');
    await act(async () => {
      view.unmount();
    });
  });

  it('one tick later the panels hydrate in full — every segment a door, both panels standing', async () => {
    expect(openDevotional(TOUR, { uri: 'file:///deuteronomy-ten-stops.m4a' })).toBe(true);
    const view = await renderPlayer(TOUR);
    expect(segmentDoors(view.root)).toHaveLength(0);

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    const page = texts(view.root);
    expect(page).toContain('TRANSCRIPT');
    expect(page).toContain('THE TEN STOPS');
    expect(segmentDoors(view.root)).toHaveLength(SEGS.length);
    // A segment's own words are on the page.
    expect(page.join('\n')).toContain(SEGS[100].text.slice(0, 24));
    await act(async () => {
      view.unmount();
    });
  });

  it('a chapter session: face complete at first paint, and no transcript ever grows', async () => {
    expect(openDevotional(GENESIS_12, 101)).toBe(true);
    const view = await renderPlayer(GENESIS_12 as typeof TOUR);
    expect(texts(view.root)).toContain(GENESIS_12.title);
    expect(pressableLabels(view.root)).toContain('Stop');
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(texts(view.root)).not.toContain('TRANSCRIPT');
    expect(segmentDoors(view.root)).toHaveLength(0);
    await act(async () => {
      view.unmount();
    });
  });
});
