/**
 * v548 — the collapse that failed outright, and the bar that
 * stands still under the morph.
 *
 * Jonathan (Nov 17, on v547), frame-verified from his recording
 * of 2 Corinthians 5: swipe down → the surface hangs oversized
 * for over two seconds → the whole sheet vanishes and NO pill
 * stands, the session live. His pattern report: "the pill
 * disappears after the second or third audio file swipe down."
 * And on the lag: "Is it because of the wavy line? Maybe it
 * needs to go flat as you swipe down?"
 *
 * The audit's proven defects, and what this rig pins:
 *  (a) THE CLOSE HUNG ON ONE SIGNAL — the settle animation's
 *      completion callback was the only route-close trigger.
 *      Lose it and the surface froze mid-morph forever. A
 *      collapse now also arms a fallback timer (settle +
 *      DEVOTIONAL_COLLAPSE_HANDOFF_FALLBACK_MS): this rig's
 *      reanimated double NEVER fires the callback unless the
 *      test fires it, so the lost-callback collapse below is
 *      closed by the timer alone — and the pill stands.
 *  (b) THE CLOSE WAS NOT IDEMPOTENT — Android back handed off
 *      without superseding the in-flight settle, so its late
 *      callback could hand off a second time and pop a route
 *      that was not the player's, corrupting the push/back
 *      balance later cycles stand on. The hand-off is latched
 *      now: back mid-settle followed by the settle's late
 *      completion still closes the route EXACTLY once.
 *  (c) THREE SUCCESSIVE FILES, three different signal fates
 *      (fallback / callback / back-then-late-callback): every
 *      cycle ends view-closed + pill standing, session live.
 *  (d) THE BAR — live at rest, stilled (the `still` prop) the
 *      moment a morph driver takes the surface, and resumed
 *      when a settle lands the view open; an expand mount
 *      starts stilled and resumes when the expand lands.
 *  (e) THE SURFACE CLIPS — the morph sheet keeps its
 *      overflow:'hidden' (the recording's "spill" was the
 *      stalled oversized sheet itself; the clip is pinned so
 *      it cannot quietly regress).
 *
 * The rig is the v512 rig (real controller, real pill, real
 * listen view, the real PanResponder config driven by hand)
 * with two changes: withTiming CAPTURES its callback instead
 * of completing synchronously, and timers are fake so the
 * fallback's 950ms can be advanced exactly.
 */
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ─── The expo-audio fake (the v506 shape) ───────────────────────────────────

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

// ─── The gesture capture + scroll record ────────────────────────────────────

type PanConfig = {
  onPanResponderGrant?: (e: unknown, g: unknown) => void;
  onPanResponderMove?: (e: unknown, g: unknown) => void;
  onPanResponderRelease?: (e: unknown, g: unknown) => void;
};
const pan = vi.hoisted(() => ({ configs: [] as PanConfig[] }));
// The listen view's config is the one carrying a grant handler
// (the pill's own swipe responder also registers through the same
// double). Successive views register successive configs — the
// LIVE one is the LAST match, not the first.
const listenPanConfig = () =>
  [...pan.configs]
    .reverse()
    .find((c) => typeof c.onPanResponderGrant === 'function' && typeof c.onPanResponderMove === 'function') as
    | Required<PanConfig>
    | undefined;
const scroll = vi.hoisted(() => ({ to: [] as { y: number; animated?: boolean }[] }));
const back = vi.hoisted(() => ({ handler: null as null | (() => boolean) }));

// ─── The controllable animation record ──────────────────────────────────────
// Every withTiming call is captured with its callback; NOTHING
// completes unless the test fires a callback — the lost-signal
// world the fallback exists for. The morph's timings are the
// 500ms ones (DEVOTIONAL_COLLAPSE_SETTLE_MS); the pill's settle
// (180ms), its drift (2100ms) and the Stop sequence's (380/400ms)
// are captured too and filtered out by duration.

type TimingCall = { value: unknown; duration?: number; cb?: (finished: boolean) => void };
const timings = vi.hoisted(() => ({ calls: [] as TimingCall[] }));
const morphTimings = () => timings.calls.filter((t) => t.duration === 500 && typeof t.cb === 'function');
const lastMorphTiming = () => morphTimings()[morphTimings().length - 1];

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
      addEventListener: (_event: string, fn: () => boolean) => {
        back.handler = fn;
        return {
          remove: () => {
            back.handler = null;
          },
        };
      },
    },
    PanResponder: {
      create: (config: PanConfig) => {
        pan.configs.push(config);
        return { panHandlers: {} };
      },
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
    withTiming: (v: unknown, cfg?: { duration?: number }, cb?: (finished: boolean) => void) => {
      timings.calls.push({ value: v, duration: cfg?.duration, cb });
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

// v527 seam, as the v512 rig: chapter audio is already on the
// phone, so the session actually opens in the real controller.
vi.mock('@/lib/devotional-download', () => ({
  useDevotionalDownloadState: () => ({ status: 'ready' }),
  refreshDevotionalDownload: async () => ({ status: 'ready' }),
  startDevotionalDownload: async () => undefined,
  cancelDevotionalDownload: async () => undefined,
  devotionalLocalSource: () => 101,
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

// The bar itself is a string in this rig — what the listen view
// PASSES it (the `still` prop) is the pin here; the bar's own
// still behaviour is pinned in wavy-progress-v548.test.tsx.
vi.mock('../../components/wavy-progress', () => ({
  WavyProgress: 'WavyProgress',
}));

import { DevotionalListenView } from '../../components/devotional-listen';
import { DevotionalPill } from '../../components/devotional-pill';
import { getDevotional, type Devotional } from '../devotionals';
import {
  consumeDevotionalPillHandoff,
  getDevotionalPlayerSnapshot,
  getDevotionalPlayerViewOpen,
  openDevotional,
  requestDevotionalExpandMorph,
  stopDevotional,
} from '../devotional-player';
import { DEVOTIONAL_COLLAPSE_HANDOFF_FALLBACK_MS, DEVOTIONAL_COLLAPSE_SETTLE_MS } from '../devotional-player-theme';

const GENESIS_12 = getDevotional('Genesis', 12)!;
const GENESIS_1 = getDevotional('Genesis', 1)!;
const GENESIS_2 = getDevotional('Genesis', 2)!;

const FALLBACK_AT = DEVOTIONAL_COLLAPSE_SETTLE_MS + DEVOTIONAL_COLLAPSE_HANDOFF_FALLBACK_MS;

const texts = (root: ReactTestInstance): string[] =>
  root
    .findAll((n) => n.type === 'Text' || n.type === 'AnimatedText')
    .flatMap((t) => (Array.isArray(t.props.children) ? t.props.children : [t.props.children]))
    .map((c) => String(c ?? ''));

async function renderPill() {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<DevotionalPill />);
  });
  return renderer;
}

async function renderPlayer(devotional: Devotional, onBack: () => void) {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<DevotionalListenView devotional={devotional} onBack={onBack} />);
  });
  return renderer;
}

const barStill = (view: ReactTestRenderer): boolean => {
  const bar = view.root.findAllByType('WavyProgress' as never)[0];
  expect(bar, 'the seek bar renders').toBeTruthy();
  return bar.props.still === true;
};

const pressChevron = async (view: ReactTestRenderer) => {
  const chevron = view.root
    .findAllByType('Pressable' as never)
    .find((b) => b.props.accessibilityLabel === 'Minimize player')!;
  expect(chevron, 'the minimize chevron renders').toBeTruthy();
  await act(async () => {
    chevron.props.onPress();
  });
};

const fireLastMorph = async (finished: boolean) => {
  const t = lastMorphTiming();
  expect(t, 'a morph timing is in flight').toBeTruthy();
  await act(async () => {
    t.cb!(finished);
  });
};

const advance = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  stopDevotional();
  consumeDevotionalPillHandoff();
  expect(getDevotionalPlayerViewOpen()).toBe(false);
  fakeAudio.reset();
  scroll.to.length = 0;
  pan.configs = [];
  timings.calls = [];
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── (a)+(b) The deterministic close ────────────────────────────────────────

describe('v548 — the collapse ends view-closed + pill standing, whatever the signal does', () => {
  it('LOST CALLBACK: the fallback timer closes the route and the pill stands, session untouched', async () => {
    const pill = await renderPill();
    let backs = 0;
    const view = await renderPlayer(GENESIS_12, () => {
      backs += 1;
    });
    expect(getDevotionalPlayerViewOpen()).toBe(true);
    expect(pill.toJSON()).toBeNull();

    // The chevron starts the settle; its animation callback is
    // NEVER fired (this rig's world). The bar stills under the
    // morph, and nothing has closed yet.
    await pressChevron(view);
    expect(barStill(view)).toBe(true);
    expect(backs).toBe(0);

    // A breath before the fallback: still open. At the fallback:
    // the route closes — the timer handed off by itself.
    await advance(FALLBACK_AT - 1);
    expect(backs).toBe(0);
    await advance(1);
    expect(backs).toBe(1);
    // And never twice.
    await advance(10_000);
    expect(backs).toBe(1);

    // The route pop unmounts the view — the pill stands, the
    // session was never touched by the close.
    await act(async () => {
      view.unmount();
    });
    expect(getDevotionalPlayerViewOpen()).toBe(false);
    expect(getDevotionalPlayerSnapshot().devotional?.title).toBe(GENESIS_12.title);
    expect(texts(pill.root)).toContain(GENESIS_12.title);
  });

  it('HEALTHY CALLBACK: the hand-off happens once and the fallback is spent unspent', async () => {
    const pill = await renderPill();
    let backs = 0;
    const view = await renderPlayer(GENESIS_12, () => {
      backs += 1;
    });
    await pressChevron(view);
    await fireLastMorph(true);
    expect(backs).toBe(1);
    // The armed fallback was cleared by the hand-off: time
    // passing closes nothing more.
    await advance(10_000);
    expect(backs).toBe(1);
    await act(async () => {
      view.unmount();
    });
    expect(texts(pill.root)).toContain(GENESIS_12.title);
  });

  it('BACK MID-SETTLE, CALLBACK LATE: exactly one close (the pre-v548 double-pop)', async () => {
    const pill = await renderPill();
    let backs = 0;
    const view = await renderPlayer(GENESIS_12, () => {
      backs += 1;
    });
    // His gesture: drag past the threshold, release — a settle
    // into the pill is in flight, its callback outstanding.
    await act(async () => {
      listenPanConfig()!.onPanResponderGrant({}, {});
      listenPanConfig()!.onPanResponderMove({}, { dy: 240, dx: 0 });
      listenPanConfig()!.onPanResponderRelease({}, {});
    });
    expect(backs).toBe(0);
    // Android back lands first and closes the route itself.
    expect(back.handler).toBeTruthy();
    await act(async () => {
      expect(back.handler!()).toBe(true);
    });
    expect(backs).toBe(1);
    // The settle's callback is delivered LATE (it completed
    // behind the pop). Before v548 this handed off a second
    // time and popped a route that was not the player's.
    await fireLastMorph(true);
    expect(backs).toBe(1);
    await advance(10_000);
    expect(backs).toBe(1);
    await act(async () => {
      view.unmount();
    });
    expect(getDevotionalPlayerViewOpen()).toBe(false);
    expect(texts(pill.root)).toContain(GENESIS_12.title);
  });
});

// ─── (c) Three successive files ─────────────────────────────────────────────

describe('v548 — three successive files, three signal fates, one end state', () => {
  it('every cycle ends view-closed + pill standing with its session live', async () => {
    const pill = await renderPill();
    const chapters = [GENESIS_12, GENESIS_1, GENESIS_2];
    const fates = ['fallback', 'callback', 'back'] as const;

    for (const [i, chapter] of chapters.entries()) {
      let backs = 0;
      const view = await renderPlayer(chapter, () => {
        backs += 1;
      });
      expect(getDevotionalPlayerViewOpen()).toBe(true);
      expect(getDevotionalPlayerSnapshot().devotional?.title).toBe(chapter.title);
      expect(pill.toJSON()).toBeNull();

      const fate = fates[i];
      if (fate === 'fallback') {
        // Cycle 1: the animation's signal is simply lost.
        await pressChevron(view);
        await advance(FALLBACK_AT);
      } else if (fate === 'callback') {
        // Cycle 2: the healthy path.
        await pressChevron(view);
        await fireLastMorph(true);
      } else {
        // Cycle 3: back wins the race, the callback trails.
        await act(async () => {
          listenPanConfig()!.onPanResponderGrant({}, {});
          listenPanConfig()!.onPanResponderMove({}, { dy: 240, dx: 0 });
          listenPanConfig()!.onPanResponderRelease({}, {});
        });
        await act(async () => {
          back.handler!();
        });
        await fireLastMorph(true);
      }
      // Exactly one close, however it was signalled.
      expect(backs, `cycle ${i + 1} (${chapter.book} ${chapter.chapter}) closed exactly once`).toBe(1);
      await advance(10_000);
      expect(backs).toBe(1);

      // The pop: view gone, registration cleared, pill standing
      // over a live session — the end state, every time.
      await act(async () => {
        view.unmount();
      });
      expect(getDevotionalPlayerViewOpen()).toBe(false);
      expect(getDevotionalPlayerSnapshot().devotional?.title).toBe(chapter.title);
      expect(texts(pill.root)).toContain(chapter.title);

      // The session ends (his Stop) before the next file.
      await act(async () => {
        stopDevotional();
      });
      expect(pill.toJSON()).toBeNull();
    }
  });
});

// ─── (d) The bar under the morph ────────────────────────────────────────────

describe('v548 — the seek bar stands still while a morph is in flight', () => {
  it('live at rest, stilled by the drag, resumed when the settle lands open', async () => {
    let backs = 0;
    const view = await renderPlayer(GENESIS_12, () => {
      backs += 1;
    });
    expect(barStill(view)).toBe(false);
    // The reader's hand takes the surface: the bar stills.
    await act(async () => {
      listenPanConfig()!.onPanResponderGrant({}, {});
    });
    expect(barStill(view)).toBe(true);
    // A short drag released under the threshold settles back
    // OPEN — stilled for the whole settle…
    await act(async () => {
      listenPanConfig()!.onPanResponderMove({}, { dy: 100, dx: 0 });
      listenPanConfig()!.onPanResponderRelease({}, {});
    });
    expect(barStill(view)).toBe(true);
    expect(backs).toBe(0);
    // …and the moment the settle lands, the wave resumes.
    await fireLastMorph(true);
    expect(barStill(view)).toBe(false);
    expect(backs).toBe(0);
    await act(async () => {
      view.unmount();
    });
  });

  it('an expand mount starts stilled and resumes when the expand lands', async () => {
    expect(openDevotional(GENESIS_12, 101)).toBe(true);
    requestDevotionalExpandMorph();
    let backs = 0;
    const view = await renderPlayer(GENESIS_12, () => {
      backs += 1;
    });
    // Mounted wearing the pill geometry, morph in flight: the
    // bar starts stilled.
    expect(barStill(view)).toBe(true);
    // Let the reduce-motion answer land so the expand settle
    // starts, then land the settle itself.
    await act(async () => {});
    expect(morphTimings().length).toBeGreaterThan(0);
    await fireLastMorph(true);
    expect(barStill(view)).toBe(false);
    expect(backs).toBe(0);
    await act(async () => {
      view.unmount();
    });
  });
});

// ─── (e) The surface clips ──────────────────────────────────────────────────

describe('v548 — the morph surface clips its content', () => {
  const flatStyle = (style: unknown): Record<string, unknown> => {
    if (Array.isArray(style)) return Object.assign({}, ...style.map(flatStyle));
    return (style ?? {}) as Record<string, unknown>;
  };

  it('the surface renders with overflow hidden', async () => {
    const view = await renderPlayer(GENESIS_12, () => undefined);
    const surfaceEl = view.root
      .findAllByType('AnimatedView' as never)
      .find((v) => flatStyle(v.props.style).overflow === 'hidden');
    expect(surfaceEl, 'the morph surface renders clipped').toBeTruthy();
    await act(async () => {
      view.unmount();
    });
  });
});
