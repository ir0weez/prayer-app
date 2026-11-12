/**
 * v512 — Add 4: the "Catch up" button on the player screen.
 *
 * Jonathan (Nov 12): "In the Audio screen itself, I think it
 * needs a 'Jump' or 'Catch Up' button at the bottom of the screen
 * that takes you right to where the transcript currently is."
 *
 * Pinned here: the button exists ONLY while the follow camera is
 * parked (the v510 yield state) — hidden while follow is live,
 * never offered when the session has no follow-along — and
 * tapping it scrolls to the currently-spoken segment/paragraph
 * at the follow seat (active line a third down) and re-engages
 * follow immediately, for a Ten Stops tour (transcript) and a
 * chapter devotional (paragraphs) alike.
 */
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ─── The controller stand-in (the v510 shape, plus v512's view-open pair) ───

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
  requestDevotionalPillHandoff: player.pillHandoff,
  useDevotionalPlayerState: () => player.state,
  setDevotionalPlayerViewOpen: () => undefined,
  useDevotionalPlayerViewOpen: () => false,
}));

const scroll = vi.hoisted(() => ({ to: [] as { y: number; animated?: boolean }[] }));
const back = vi.hoisted(() => ({ handler: null as null | (() => boolean) }));

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
    PanResponder: { create: () => ({ panHandlers: {} }) },
    useWindowDimensions: () => ({ width: 390, height: 844 }),
  };
});

vi.mock('react-native-reanimated', () => ({
  default: { View: 'AnimatedView' },
  Easing: { bezier: () => ({}), inOut: (f: unknown) => f, sin: () => ({}) },
  Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
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

import { DevotionalListenView, followScrollTarget } from '../../components/devotional-listen';
import { formatClock, getDevotional, type Devotional } from '../devotionals';
import { getTenStops, tenStopsAsDevotional } from '../ten-stops';
import { tenStopsTranscript } from '../ten-stops-transcripts';

const VIEWPORT_H = 844;
const PANEL_TOP = 500;
const segY = (index: number) => index * 100;

const TOUR = tenStopsAsDevotional(getTenStops('Genesis')!);
const SEGS = tenStopsTranscript('Genesis')!;
const inSeg = (index: number) => SEGS[index].startSec + 0.05;

const CHAPTER_BASE = getDevotional('Genesis', 12)!;
const CHAPTER: Devotional = {
  ...CHAPTER_BASE,
  paragraphs: ['First paragraph words.', 'Second paragraph words.', 'Third paragraph words.', 'Fourth paragraph words.'],
};
const paraY = (index: number) => 400 + index * 120;

async function renderPlayer(devotional: Devotional, positionSec: number) {
  player.state = { devotional, playing: true, positionSec, durationSec: devotional.durationSec };
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<DevotionalListenView devotional={devotional} onBack={() => undefined} />);
  });
  return renderer;
}

async function movePlayhead(renderer: ReactTestRenderer, devotional: Devotional, positionSec: number) {
  player.state = { devotional, playing: true, positionSec, durationSec: devotional.durationSec };
  await act(async () => {
    renderer.update(<DevotionalListenView devotional={devotional} onBack={() => undefined} />);
  });
}

const scrollHost = (root: ReactTestInstance) => root.findByType('RNScrollView' as never);
const catchUpButton = (root: ReactTestInstance) =>
  root.findAllByType('Pressable' as never).filter((b) => b.props.accessibilityLabel === 'Catch up to the audio');

function seatTourLayout(root: ReactTestInstance) {
  act(() => {
    for (const view of root.findAllByType('View' as never)) {
      if (typeof view.props.onLayout === 'function') {
        view.props.onLayout({ nativeEvent: { layout: { y: PANEL_TOP } } });
      }
    }
    for (let i = 0; i < SEGS.length; i++) {
      const door = root
        .findAllByType('Pressable' as never)
        .find((p) => p.props.accessibilityLabel === `Play from ${formatClock(SEGS[i].startSec)}`);
      if (door && typeof door.props.onLayout === 'function') {
        door.props.onLayout({ nativeEvent: { layout: { y: segY(i) } } });
      }
    }
  });
}

function seatChapterLayout(root: ReactTestInstance) {
  act(() => {
    for (let i = 0; i < CHAPTER.paragraphs.length; i++) {
      const holder = root
        .findAllByType('View' as never)
        .find(
          (v) =>
            typeof v.props.onLayout === 'function' &&
            v.findAllByType('Text' as never).some((t) => t.props.children === CHAPTER.paragraphs[i]),
        );
      if (holder) {
        holder.props.onLayout({ nativeEvent: { layout: { y: paraY(i) } } });
      }
    }
  });
}

function parkTheCamera(root: ReactTestInstance) {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  act(() => {
    scrollHost(root).props.onScrollBeginDrag();
  });
}

beforeEach(() => {
  player.openDevotional.mockClear();
  player.seekDevotional.mockClear();
  scroll.to.length = 0;
  back.handler = null;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('v512 Catch up — a Ten Stops tour (transcript follow-along)', () => {
  it('hidden while follow is live, appears when parked, tap rides to the spoken segment and re-engages follow', async () => {
    const renderer = await renderPlayer(TOUR, inSeg(5));
    const root = renderer.root;
    seatTourLayout(root);
    scroll.to.length = 0;

    // Follow live: no button anywhere.
    expect(catchUpButton(root)).toHaveLength(0);

    // He scrolls away: the camera parks and the button stands.
    parkTheCamera(root);
    expect(catchUpButton(root)).toHaveLength(1);
    const label = catchUpButton(root)[0]
      .findAllByType('Text' as never)
      .map((t: ReactTestInstance) => t.props.children);
    expect(label).toContain('Catch up');

    // The voice moves on while parked — the page does not.
    await movePlayhead(renderer, TOUR, inSeg(15));
    expect(scroll.to).toEqual([]);
    expect(catchUpButton(root)).toHaveLength(1);

    // Tap: straight to the segment being spoken NOW, at the
    // follow seat — and follow is live again (the button leaves,
    // the next boundary moves the camera).
    await act(async () => {
      catchUpButton(root)[0].props.onPress();
    });
    expect(scroll.to).toEqual([{ y: followScrollTarget(PANEL_TOP + segY(15), VIEWPORT_H), animated: true }]);
    expect(catchUpButton(root)).toHaveLength(0);
    scroll.to.length = 0;
    await movePlayhead(renderer, TOUR, inSeg(18));
    expect(scroll.to).toEqual([{ y: followScrollTarget(PANEL_TOP + segY(18), VIEWPORT_H), animated: true }]);
  });
});

describe('v512 Catch up — a chapter devotional (paragraph follow-along)', () => {
  it('serves the paragraph camera the same way', async () => {
    const duration = CHAPTER.durationSec;
    const renderer = await renderPlayer(CHAPTER, duration * 0.55);
    const root = renderer.root;
    seatChapterLayout(root);
    scroll.to.length = 0;

    expect(catchUpButton(root)).toHaveLength(0);
    parkTheCamera(root);
    expect(catchUpButton(root)).toHaveLength(1);

    // Parked: the voice (and the active paragraph) moves on.
    await movePlayhead(renderer, CHAPTER, duration * 0.8);
    expect(scroll.to).toEqual([]);

    // The active paragraph at 0.8 of 4 paragraphs is #3 — the tap
    // seats IT a third down and follow resumes.
    await act(async () => {
      catchUpButton(root)[0].props.onPress();
    });
    expect(scroll.to).toEqual([{ y: followScrollTarget(paraY(3), VIEWPORT_H), animated: true }]);
    expect(catchUpButton(root)).toHaveLength(0);
  });

  it('no follow-along, no button: a chapter with no paragraphs and no transcript never offers it', async () => {
    const bare: Devotional = { ...CHAPTER_BASE, paragraphs: [] };
    const renderer = await renderPlayer(bare, 60);
    const root = renderer.root;
    parkTheCamera(root);
    expect(catchUpButton(root)).toHaveLength(0);
  });
});
