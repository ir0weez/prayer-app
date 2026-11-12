/**
 * v512 — Fix 1 (the pill that never stood) and Fix 2 (the fade).
 *
 * Jonathan (Nov 12, on v510/v511): "The player still disappears.
 * It continues to play audio, but I collapse it and it disappears."
 * His video: swipe DOWN on the Genesis 12 player → the surface
 * animates down → GONE, no pill anywhere, audio playing on.
 *
 * Root cause, as fixed: pill visibility hung on a ROUTER fact —
 * the pill rendered nothing while usePathname() said
 * '/devotional' — so the pill's existence depended on router
 * state propagating back through the transparent-modal pop, the
 * one link the drag-collapse path could not guarantee; the
 * controller itself (where the live session provably sat, audio
 * playing) recorded nothing about whether its view was open.
 * v512 moves the fact into the controller: the listen view
 * registers view-open on mount and unregisters on unmount —
 * ground truth every close path passes through — and the pill
 * renders from session state alone: live session AND no open
 * view. The hand-off flag now only suppresses the settle replay.
 *
 * This rig is the one the v499/v510 rigs never built: the REAL
 * controller (expo-audio faked), the REAL pill and the REAL
 * listen view together, and the REAL PanResponder config the
 * component creates — captured, then driven grant → move →
 * release exactly as the responder system would. Pins:
 *  (a) the pill stands from session state alone after every
 *      close path — drag-collapse, chevron, and a BARE route pop
 *      with no hand-off flag raised at all — and hides while the
 *      view is open and after Stop;
 *  (b) the collapse morph's animated styles carry no opacity
 *      term at any progress: content moves only, the pill face
 *      reveals by position only, the face wears the opaque book
 *      primary, and the surface's only opacity is the Stop
 *      sequence's own exit term (1 at rest).
 */
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
// double and must not be mistaken for it).
const listenPanConfig = () =>
  pan.configs.find(
    (c) => typeof c.onPanResponderGrant === 'function' && typeof c.onPanResponderMove === 'function',
  ) as Required<PanConfig> | undefined;
const scroll = vi.hoisted(() => ({ to: [] as { y: number; animated?: boolean }[] }));
const back = vi.hoisted(() => ({ handler: null as null | (() => boolean) }));
const capturedStyles = vi.hoisted(() => ({ fns: [] as (() => Record<string, unknown>)[] }));

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
    // The v510 rig stubbed PanResponder to { panHandlers: {} } —
    // the drag path was never exercised against the component's
    // real config. This double CAPTURES the config so the test
    // drives the actual grant/move/release the component built.
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
      capturedStyles.fns.push(fn);
      try {
        return fn();
      } catch {
        return {};
      }
    },
    // Stateful, as the real hook is: one mutable per call site,
    // kept across re-renders.
    useSharedValue: (v: unknown) => {
      const ref = React.useRef<{ value: unknown } | null>(null);
      if (ref.current === null) ref.current = { value: v };
      return ref.current;
    },
    withDelay: (_d: unknown, v: unknown) => v,
    withRepeat: (v: unknown) => v,
    // The settle completes, as it does on the phone when nothing
    // interrupts it — so the close actually runs in the rig.
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

// A bundled-asset stand-in: the session must actually open in the
// real controller, so the audio source resolves to a fake id.
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
import { DevotionalPill } from '../../components/devotional-pill';
import { getDevotional } from '../devotionals';
import {
  consumeDevotionalPillHandoff,
  getDevotionalPlayerSnapshot,
  getDevotionalPlayerViewOpen,
  openDevotional,
  stopDevotional,
} from '../devotional-player';
import { devotionalPlayerTheme } from '../devotional-player-theme';

const GENESIS_12 = getDevotional('Genesis', 12)!;

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

async function renderPlayer(onBack: () => void) {
  capturedStyles.fns.length = 0;
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<DevotionalListenView devotional={GENESIS_12} onBack={onBack} />);
  });
  return renderer;
}

beforeEach(() => {
  stopDevotional();
  // Drain any hand-off a previous test left raised, and make
  // sure no view registration leaks across tests.
  consumeDevotionalPillHandoff();
  expect(getDevotionalPlayerViewOpen()).toBe(false);
  fakeAudio.reset();
  scroll.to.length = 0;
  pan.configs = [];
});

// ─── (a) The pill stands from session state alone ───────────────────────────

describe('v512 pill — a pure function of controller session state', () => {
  it('stands with NO player view ever mounted: a live session alone seats it, Stop clears it', async () => {
    expect(openDevotional(GENESIS_12, 101)).toBe(true);
    const pill = await renderPill();
    expect(texts(pill.root)).toContain(GENESIS_12.title);
    // The pill's own Stop ends the session — and the pill.
    const stopBtn = pill.root.findAllByType('Pressable' as never).find((b) => b.props.accessibilityLabel === 'Stop')!;
    await act(async () => {
      stopBtn.props.onPress();
    });
    expect(getDevotionalPlayerSnapshot().devotional).toBeNull();
    expect(pill.toJSON()).toBeNull();
  });

  it('hides while the player view is open', async () => {
    const pill = await renderPill();
    const view = await renderPlayer(() => undefined);
    expect(getDevotionalPlayerViewOpen()).toBe(true);
    expect(getDevotionalPlayerSnapshot().devotional?.title).toBe(GENESIS_12.title);
    expect(pill.toJSON()).toBeNull();
    await act(async () => {
      view.unmount();
    });
  });

  it('DRAG-COLLAPSE (his video): the real gesture closes the view and the pill stands', async () => {
    const pill = await renderPill();
    let backs = 0;
    const view = await renderPlayer(() => {
      backs += 1;
    });
    expect(pill.toJSON()).toBeNull();
    expect(listenPanConfig(), 'the component built a PanResponder config').toBeTruthy();

    // The swipe down: grant, drag 240px (p = 0.8, past the 0.35
    // threshold), release — the settle completes and hands off.
    await act(async () => {
      listenPanConfig()!.onPanResponderGrant({}, {});
      listenPanConfig()!.onPanResponderMove({}, { dy: 240, dx: 0 });
      listenPanConfig()!.onPanResponderRelease({}, {});
    });
    expect(backs).toBe(1);
    // The session was never touched by the close.
    expect(getDevotionalPlayerSnapshot().devotional?.title).toBe(GENESIS_12.title);
    // The route now closes (what onBack does on the phone): the
    // view unmounts — and the pill stands.
    await act(async () => {
      view.unmount();
    });
    expect(getDevotionalPlayerViewOpen()).toBe(false);
    expect(texts(pill.root)).toContain(GENESIS_12.title);
  });

  it('CHEVRON: minimize closes the view and the pill stands', async () => {
    const pill = await renderPill();
    let backs = 0;
    const view = await renderPlayer(() => {
      backs += 1;
    });
    const chevron = view.root.findAllByType('Pressable' as never).find((b) => b.props.accessibilityLabel === 'Minimize player')!;
    await act(async () => {
      chevron.props.onPress();
    });
    expect(backs).toBe(1);
    await act(async () => {
      view.unmount();
    });
    expect(texts(pill.root)).toContain(GENESIS_12.title);
  });

  it('BARE ROUTE POP: no close path runs at all — no hand-off flag — and the pill still stands', async () => {
    const pill = await renderPill();
    const view = await renderPlayer(() => undefined);
    expect(pill.toJSON()).toBeNull();
    // The route is popped by some path that runs NOTHING in the
    // component: no settle, no hand-off. (Any flag a previous
    // test drained is gone; this view never raises one.)
    expect(consumeDevotionalPillHandoff()).toBe(false);
    await act(async () => {
      view.unmount();
    });
    // Ground truth (the unmount) is all the pill needed.
    expect(consumeDevotionalPillHandoff()).toBe(false);
    expect(texts(pill.root)).toContain(GENESIS_12.title);
    expect(getDevotionalPlayerSnapshot().devotional?.title).toBe(GENESIS_12.title);
  });
});

// ─── (b) No fade in the morph ───────────────────────────────────────────────

describe('v512 morph — position and colour only, no opacity anywhere', () => {
  const flatStyle = (style: unknown): Record<string, unknown> => {
    if (Array.isArray(style)) return Object.assign({}, ...style.map(flatStyle));
    return (style ?? {}) as Record<string, unknown>;
  };

  it('the animated styles carry no opacity term at any collapse progress', async () => {
    const view = await renderPlayer(() => undefined);
    const classify = () => {
      let content: Record<string, unknown> | null = null;
      let face: Record<string, unknown> | null = null;
      for (const fn of capturedStyles.fns) {
        let out: Record<string, unknown>;
        try {
          out = fn();
        } catch {
          continue;
        }
        const keys = Object.keys(out);
        if (keys.length === 1 && keys[0] === 'transform') {
          const ty = (out.transform as { translateY?: number }[])[0]?.translateY;
          if (typeof ty !== 'number') continue;
          if (ty <= 0 && ty >= -14) content = out;
          if (ty >= 0 && ty <= 66) face = out;
        }
      }
      return { content, face };
    };

    // p = 0 (page): content home, face parked a full seat below.
    let { content, face } = classify();
    expect(content).toBeTruthy();
    expect(face).toBeTruthy();
    expect(content).not.toHaveProperty('opacity');
    expect(face).not.toHaveProperty('opacity');
    expect((content!.transform as { translateY: number }[])[0].translateY).toBeCloseTo(0, 6);
    expect((face!.transform as { translateY: number }[])[0].translateY).toBeCloseTo(66, 6);

    // Drag to p = 0.9 and evaluate the SAME style functions.
    await act(async () => {
      listenPanConfig()!.onPanResponderGrant({}, {});
      listenPanConfig()!.onPanResponderMove({}, { dy: 270, dx: 0 });
    });
    ({ content, face } = classify());
    expect(content).not.toHaveProperty('opacity');
    expect(face).not.toHaveProperty('opacity');
    // Content fully travelled (−14, its window ended at 0.45)…
    expect((content!.transform as { translateY: number }[])[0].translateY).toBeCloseTo(-14, 6);
    // …and the face has slid most of the way home: 66 × (1 −
    // (0.9 − 0.55) / 0.45) ≈ 14.7px still to travel.
    expect((face!.transform as { translateY: number }[])[0].translateY).toBeCloseTo(66 * (1 - 0.35 / 0.45), 4);
    await act(async () => {
      view.unmount();
    });
  });

  it('the pill face wears the opaque book primary on a seat-proportioned strip; the surface rests fully opaque', async () => {
    const view = await renderPlayer(() => undefined);
    const theme = devotionalPlayerTheme('Genesis', false);
    const animatedViews = view.root.findAllByType('AnimatedView' as never);
    // The face: the only seat-height strip anchored to the
    // surface's bottom edge.
    const faceEl = animatedViews.find((v) => {
      const s = flatStyle(v.props.style);
      return s.height === 66 && s.bottom === 0 && s.position === 'absolute';
    });
    expect(faceEl, 'the pill face strip renders').toBeTruthy();
    expect(flatStyle(faceEl!.props.style).backgroundColor).toBe(theme.primary);
    // The surface: its opacity is the Stop exit's term only —
    // at rest (no Stop running) it is exactly 1, fully solid.
    const surfaceEl = animatedViews.find((v) => flatStyle(v.props.style).overflow === 'hidden');
    expect(surfaceEl, 'the morph surface renders').toBeTruthy();
    expect(flatStyle(surfaceEl!.props.style).opacity).toBe(1);
    await act(async () => {
      view.unmount();
    });
  });
});
