/**
 * v510 — the player yields to the reader, and closing it no
 * longer kills the audio.
 *
 * Jonathan's phone report (Nov 12, on v508): "The transcript is
 * too high. And it keeps forcing me back down the page when I'm
 * trying to leave. Then when I close the page, it automatically
 * just stops the whole audio and disappears..."
 *
 * Three behaviours pinned here, in the real surfaces:
 *
 *  (a) THE CAMERA YIELDS. A drag of the page suspends the
 *      follow-along camera — the spoken segment keeps lighting
 *      up, but the page is the reader's — until the ~6s grace
 *      after his scrolling ends lapses (the camera then returns
 *      to the spoken segment), or a seek (a transcript line, a
 *      guidepost, the seek bar) re-engages it at once.
 *  (b) THE SEAT. The active segment is seated a third of the
 *      viewport down from the top edge, not 24px under it.
 *  (c) CLOSE IS A COLLAPSE, NEVER A STOP. The chevron and the
 *      Android back gesture both run the pill hand-off and close
 *      the route with the session untouched (no stop call,
 *      position and playing state preserved), the content is
 *      untouchable while a close is in flight, and the root pill
 *      stands in every context the player opens from.
 *  (d) STOP STILL STOPS. The explicit Stop runs his sequence and
 *      clears the session, exactly as before.
 *
 * The rig follows the v508 listen rig (react-test-renderer over
 * string hosts) with three richer doubles the behaviours need:
 * a ScrollView class that records scrollTo, a BackHandler that
 * captures the registered handler, and a withTiming that
 * completes — so the collapse settle actually hands off.
 */
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ─── The controller stand-in ────────────────────────────────────────────────

const player = vi.hoisted(() => ({
  state: {
    devotional: null as unknown,
    playing: false,
    positionSec: 0,
    durationSec: 0,
  },
  openDevotional: vi.fn(() => true),
  seekDevotional: vi.fn(),
  toggleDevotionalPlayback: vi.fn(),
  stopDevotional: vi.fn(),
  pillHandoff: vi.fn(),
}));

vi.mock('@/lib/devotional-player', () => ({
  openDevotional: player.openDevotional,
  seekDevotional: player.seekDevotional,
  toggleDevotionalPlayback: player.toggleDevotionalPlayback,
  stopDevotional: player.stopDevotional,
  devotionalEnded: (s: typeof player.state) =>
    !!s.devotional && !s.playing && s.durationSec > 0 && s.positionSec >= s.durationSec - 0.25,
  consumeDevotionalExpandMorph: () => false,
  consumeDevotionalPillHandoff: () => false,
  requestDevotionalPillHandoff: player.pillHandoff,
  useDevotionalPlayerState: () => player.state,
}));

// ─── The scroll + back doubles ──────────────────────────────────────────────

const scroll = vi.hoisted(() => ({ to: [] as { y: number; animated?: boolean }[] }));
const back = vi.hoisted(() => ({ handler: null as null | (() => boolean) }));
const nav = vi.hoisted(() => ({ pathname: '/bible-downloads' }));

vi.mock('expo-router', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: vi.fn() }),
}));

// ─── The native / animated neighbours ───────────────────────────────────────

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
    Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
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
    PanResponder: { create: () => ({ panHandlers: {} }) },
    useWindowDimensions: () => ({ width: 390, height: 844 }),
  };
});

vi.mock('react-native-reanimated', () => ({
  default: { View: 'AnimatedView' },
  Easing: { bezier: () => ({}), inOut: (f: unknown) => f, sin: () => ({}) },
  cancelAnimation: () => undefined,
  interpolate: () => 0,
  interpolateColor: () => '#000000',
  runOnJS: (fn: (...a: unknown[]) => unknown) => (...a: unknown[]) => fn(...a),
  useAnimatedStyle: (fn: () => unknown) => {
    try {
      return fn();
    } catch {
      return {};
    }
  },
  useSharedValue: (v: unknown) => ({ value: v }),
  withDelay: (_d: unknown, v: unknown) => v,
  withRepeat: (v: unknown) => v,
  // The settle completes, as it does on the phone when nothing
  // interrupts it — so the hand-off actually runs in the rig.
  withTiming: (v: unknown, _cfg?: unknown, cb?: (finished: boolean) => void) => {
    if (typeof cb === 'function') cb(true);
    return v;
  },
}));

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
  devotionalAudioFor: () => null,
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
  DEVOTIONAL_FOLLOW_RESUME_MS,
  DevotionalListenView,
  followScrollTarget,
} from '../../components/devotional-listen';
import { DevotionalPill } from '../../components/devotional-pill';
import { formatClock, type Devotional } from '../devotionals';
import { getTenStops, tenStopsAsDevotional } from '../ten-stops';
import { tenStopsTranscript } from '../ten-stops-transcripts';

const GENESIS = getTenStops('Genesis')!;
const SESSION = tenStopsAsDevotional(GENESIS);
const SEGS = tenStopsTranscript('Genesis')!;

const VIEWPORT_H = 844; // the useWindowDimensions double
const PANEL_TOP = 500;
const segY = (index: number) => index * 100;

async function renderPlayer(devotional: Devotional, positionSec: number, onBack: () => void) {
  player.state = { devotional, playing: true, positionSec, durationSec: devotional.durationSec };
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<DevotionalListenView devotional={devotional} onBack={onBack} />);
  });
  return renderer;
}

async function movePlayhead(renderer: ReactTestRenderer, devotional: Devotional, onBack: () => void, positionSec: number) {
  player.state = { devotional, playing: true, positionSec, durationSec: devotional.durationSec };
  await act(async () => {
    renderer.update(<DevotionalListenView devotional={devotional} onBack={onBack} />);
  });
}

const scrollHost = (root: ReactTestInstance) => root.findByType('RNScrollView' as never);
const segmentDoor = (root: ReactTestInstance, startSec: number) =>
  root
    .findAllByType('Pressable' as never)
    .find((p) => p.props.accessibilityLabel === `Play from ${formatClock(startSec)}`);

/** Seat the layout the phone would report: the transcript panel
 * at PANEL_TOP, each segment 100px below the previous. */
function seatLayout(root: ReactTestInstance) {
  act(() => {
    for (const view of root.findAllByType('View' as never)) {
      if (typeof view.props.onLayout === 'function') {
        view.props.onLayout({ nativeEvent: { layout: { y: PANEL_TOP } } });
      }
    }
    for (let i = 0; i < SEGS.length; i++) {
      const door = segmentDoor(root, SEGS[i].startSec);
      if (door && typeof door.props.onLayout === 'function') {
        door.props.onLayout({ nativeEvent: { layout: { y: segY(i) } } });
      }
    }
  });
}

const inSeg = (index: number) => SEGS[index].startSec + 0.05;

beforeEach(() => {
  player.openDevotional.mockClear();
  player.seekDevotional.mockClear();
  player.toggleDevotionalPlayback.mockClear();
  player.stopDevotional.mockClear();
  player.pillHandoff.mockClear();
  scroll.to.length = 0;
  back.handler = null;
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── (b) The seat ───────────────────────────────────────────────────────────

describe('v510 follow seat — a third of the screen down, not hard against the top', () => {
  it('followScrollTarget seats the element one third of the viewport below the top edge', () => {
    // 844px viewport → the element lands 281px down the screen.
    expect(followScrollTarget(1200, VIEWPORT_H)).toBe(1200 - Math.round(VIEWPORT_H / 3));
    expect(followScrollTarget(1200, VIEWPORT_H)).toBe(919);
    // Near the top of the page the seat clamps — it never
    // scrolls above the page start.
    expect(followScrollTarget(100, VIEWPORT_H)).toBe(0);
    expect(followScrollTarget(0, VIEWPORT_H)).toBe(0);
  });

  it('the grace constant is the named ~6 seconds', () => {
    expect(DEVOTIONAL_FOLLOW_RESUME_MS).toBe(6000);
  });
});

// ─── (a) The camera yields ──────────────────────────────────────────────────

describe('v510 follow-along — the camera yields to the reader', () => {
  it('follows while hands-off, parks on a drag, resumes after the grace, re-engages on a seek', async () => {
    const onBack = vi.fn();
    const renderer = await renderPlayer(SESSION, inSeg(5), onBack);
    const root = renderer.root;
    seatLayout(root);
    scroll.to.length = 0;

    // Hands off: the next segment boundary moves the camera to
    // the newly spoken segment, seated a third of the screen
    // down (the (b) seat, in the live surface).
    await movePlayhead(renderer, SESSION, onBack, inSeg(10));
    expect(scroll.to).toEqual([{ y: followScrollTarget(PANEL_TOP + segY(10), VIEWPORT_H), animated: true }]);
    scroll.to.length = 0;

    // He grabs the page: the camera parks. Segments keep
    // advancing — the page does not move.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    act(() => {
      scrollHost(root).props.onScrollBeginDrag();
    });
    await movePlayhead(renderer, SESSION, onBack, inSeg(12));
    await movePlayhead(renderer, SESSION, onBack, inSeg(14));
    expect(scroll.to).toEqual([]);

    // The grace runs from the END of his scroll: just under it,
    // still parked…
    act(() => {
      scrollHost(root).props.onScrollEndDrag();
    });
    act(() => {
      vi.advanceTimersByTime(DEVOTIONAL_FOLLOW_RESUME_MS - 1);
    });
    await movePlayhead(renderer, SESSION, onBack, inSeg(15));
    expect(scroll.to).toEqual([]);

    // …and once it lapses the camera returns to the segment
    // being spoken, at the same seat.
    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(scroll.to).toEqual([{ y: followScrollTarget(PANEL_TOP + segY(15), VIEWPORT_H), animated: true }]);
    scroll.to.length = 0;

    // A seek re-engages at once: park again, then tap a line —
    // the tap seeks AND the camera follows the next boundary.
    act(() => {
      scrollHost(root).props.onScrollBeginDrag();
    });
    const door = segmentDoor(root, SEGS[20].startSec);
    expect(door).toBeDefined();
    act(() => {
      door!.props.onPress();
    });
    expect(player.seekDevotional).toHaveBeenCalledWith(SEGS[20].startSec);
    await movePlayhead(renderer, SESSION, onBack, inSeg(22));
    expect(scroll.to).toEqual([{ y: followScrollTarget(PANEL_TOP + segY(22), VIEWPORT_H), animated: true }]);

    // The suspension never touched playback controls or Stop.
    expect(player.stopDevotional).not.toHaveBeenCalled();
  });
});

// ─── (c) Close is a collapse, never a stop ──────────────────────────────────

describe('v510 close — the chevron collapses to the pill; the session survives', () => {
  it('chevron: hand-off raised, route closes, no stop call, content locks while closing', async () => {
    const onBack = vi.fn();
    const renderer = await renderPlayer(SESSION, inSeg(30), onBack);
    const root = renderer.root;
    const chevron = root
      .findAllByType('Pressable' as never)
      .find((p) => p.props.accessibilityLabel === 'Minimize player');
    expect(chevron).toBeDefined();
    act(() => {
      chevron!.props.onPress();
    });
    // The hand-off ran (the settle completes in this rig) and
    // the route closed through it…
    expect(player.pillHandoff).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
    // …and the session was never stopped or re-opened: closing
    // is a collapse only.
    expect(player.stopDevotional).not.toHaveBeenCalled();
    expect(player.openDevotional).toHaveBeenCalledTimes(1);
    // While the close is in flight the page content is
    // untouchable, so no stray tap can reach the fading Stop.
    expect(scrollHost(root).props.pointerEvents).toBe('none');
  });

  it('Android back: consumed, same hand-off, no stop call', async () => {
    const onBack = vi.fn();
    await renderPlayer(SESSION, inSeg(30), onBack);
    expect(back.handler).toBeTypeOf('function');
    let consumed: boolean | undefined;
    act(() => {
      consumed = back.handler!();
    });
    expect(consumed).toBe(true);
    expect(player.pillHandoff).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(player.stopDevotional).not.toHaveBeenCalled();
  });
});

// ─── (d) Stop still stops ───────────────────────────────────────────────────

describe('v510 stop — the explicit Stop still ends the session', () => {
  it('the page Stop runs the sequence through to stopDevotional and closes', async () => {
    const onBack = vi.fn();
    const renderer = await renderPlayer(SESSION, inSeg(30), onBack);
    const stop = renderer.root
      .findAllByType('Pressable' as never)
      .find((p) => p.props.accessibilityLabel === 'Stop');
    expect(stop).toBeDefined();
    act(() => {
      stop!.props.onPress();
    });
    expect(player.stopDevotional).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
    // Stop is not a collapse: no pill hand-off is raised.
    expect(player.pillHandoff).not.toHaveBeenCalled();
  });
});

// ─── (c) The pill stands in the player's opening contexts ───────────────────

describe('v510 pill — present wherever the player was opened from, gone only on the player', () => {
  const texts = (root: ReactTestInstance): string[] =>
    root.findAllByType('Text' as never).map((t) => {
      const kids = t.props.children;
      return Array.isArray(kids) ? kids.join('') : String(kids ?? '');
    });

  async function renderPill(pathname: string) {
    nav.pathname = pathname;
    player.state = { devotional: SESSION, playing: true, positionSec: 120, durationSec: SESSION.durationSec };
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<DevotionalPill />);
    });
    return renderer;
  }

  it('stands over the Downloads page (a root-stack context)', async () => {
    const renderer = await renderPill('/bible-downloads');
    expect(texts(renderer.root)).toContain(SESSION.title);
  });

  it('stands over a tab context (the book/chapter pages)', async () => {
    const renderer = await renderPill('/');
    expect(texts(renderer.root)).toContain(SESSION.title);
  });

  it('renders nothing while the full player route is open', async () => {
    const renderer = await renderPill('/devotional');
    expect(renderer.toJSON()).toBeNull();
  });
});
