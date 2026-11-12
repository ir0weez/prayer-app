/**
 * v508 — the transcript follow-along, rendered in the real player.
 *
 * Jonathan asked where the transcript part was (Nov 11, on the
 * v506 phone screenshot: "Where's the transcript part though?
 * Is that not a thing?"). It is a thing now: for a book-level Ten
 * Stops session the player carries a TRANSCRIPT panel under the
 * guideposts — the tour's own spoken words at segment level,
 * grouped under their stops (the words before Stop 1 under
 * "Introduction"), the segment being spoken lit in the book's
 * family, and every segment a door that seeks through the
 * controller's own seek path. A chapter devotional session —
 * whose narration has no transcript anywhere, and none may be
 * invented — renders no transcript section at all.
 *
 * The render rig follows the v507 surfaces rig (string host
 * components + react-test-renderer); the player's native and
 * animated neighbours are doubles, and the controller is a
 * spy-backed stand-in whose state the test seats before render.
 */
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ─── The controller stand-in ────────────────────────────────────────────────
// The view reads its session through useDevotionalPlayerState and
// drives it through the exported functions; the doubles record
// the drives, and the state is seated per render.

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
  stopDevotionalNow: vi.fn(),
}));

vi.mock('@/lib/devotional-player', () => ({
  openDevotional: player.openDevotional,
  seekDevotional: player.seekDevotional,
  toggleDevotionalPlayback: player.toggleDevotionalPlayback,
  stopDevotionalNow: player.stopDevotionalNow,
  devotionalEnded: (s: typeof player.state) =>
    !!s.devotional && !s.playing && s.durationSec > 0 && s.positionSec >= s.durationSec - 0.25,
  consumeDevotionalExpandMorph: () => false,
  requestDevotionalPillHandoff: () => undefined,
  useDevotionalPlayerState: () => player.state,
}));

// ─── The native / animated neighbours ───────────────────────────────────────

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
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
  PanResponder: { create: () => ({ panHandlers: {} }) },
  useWindowDimensions: () => ({ width: 390, height: 844 }),
}));

vi.mock('react-native-reanimated', () => ({
  default: { View: 'AnimatedView' },
  Easing: { bezier: () => ({}) },
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
  withTiming: (v: unknown) => v,
}));

vi.mock('react-native-svg', () => ({
  default: 'Svg',
  Svg: 'Svg',
  Defs: 'Defs',
  LinearGradient: 'LinearGradient',
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

import { DevotionalListenView } from '../../components/devotional-listen';
import { formatClock, getDevotional, type Devotional } from '../devotionals';
import { devotionalPlayerTheme } from '../devotional-player-theme';
import { getTenStops, tenStopsAsDevotional } from '../ten-stops';
import { activeTenStopsTranscriptSegment, tenStopsTranscript } from '../ten-stops-transcripts';

const GENESIS = getTenStops('Genesis')!;

function render(devotional: Devotional, positionSec: number) {
  player.state = {
    devotional,
    playing: false,
    positionSec,
    durationSec: devotional.durationSec,
  };
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <DevotionalListenView devotional={devotional} onBack={() => undefined} />,
    );
  });
  return renderer.root;
}

const texts = (root: ReactTestInstance): string[] =>
  root.findAllByType('Text' as any).map((t) => {
    const kids = t.props.children;
    return Array.isArray(kids) ? kids.join('') : String(kids ?? '');
  });

const flat = (style: unknown): Record<string, unknown> => {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flat));
  return (style as Record<string, unknown>) ?? {};
};

const segmentDoor = (root: ReactTestInstance, startSec: number) =>
  root
    .findAllByType('Pressable' as any)
    .find((p) => p.props.accessibilityLabel === `Play from ${formatClock(startSec)}`);

beforeEach(() => {
  player.openDevotional.mockClear();
  player.seekDevotional.mockClear();
  player.toggleDevotionalPlayback.mockClear();
  player.stopDevotionalNow.mockClear();
});

// ─── A Ten Stops session: the transcript stands ─────────────────────────────

describe('v508 player — a Ten Stops session carries its transcript', () => {
  const session = tenStopsAsDevotional(GENESIS);
  const segs = tenStopsTranscript('Genesis')!;

  it('renders the TRANSCRIPT panel with its stop grouping', () => {
    const root = render(session, 0);
    const all = texts(root);
    expect(all).toContain('TRANSCRIPT');
    // The words before Stop 1 sit under Introduction; the stops
    // stand over their own words, passages included.
    expect(all).toContain('Introduction');
    expect(all).toContain('The Family of Seth');
    expect(all).toContain('Genesis 5:6-32');
    expect(all).toContain('Israel Is Born');
    expect(all).toContain('God Meant It For Good');
    // And the words themselves are there — the tour's first and a
    // mid-tour segment, verbatim from its transcript.
    expect(all).toContain(segs[0].text);
    expect(all).toContain(segs[200].text);
  });

  it('every segment is a seek door labelled by its own start', () => {
    const root = render(session, 0);
    for (const i of [0, 12, 100, 505]) {
      expect(segmentDoor(root, segs[i].startSec)).toBeDefined();
    }
  });

  it('the segment being spoken is lit in the book’s family; the rest are not', () => {
    const at = 300; // inside Stop 2 (231.5–377.6)
    const root = render(session, at);
    const theme = devotionalPlayerTheme('Genesis', false);
    const activeIdx = activeTenStopsTranscriptSegment(segs, at);
    const activeDoor = segmentDoor(root, segs[activeIdx].startSec);
    expect(activeDoor).toBeDefined();
    const activeStyle = flat(activeDoor!.props.style);
    expect(activeStyle.backgroundColor).toBe(theme.stopSeat);
    expect(activeStyle.borderLeftColor).toBe(theme.primary);
    // A segment well away from the playhead carries no seat.
    const farDoor = segmentDoor(root, segs[500].startSec);
    expect(flat(farDoor!.props.style).backgroundColor).toBeUndefined();
  });

  it('tapping a segment seeks the controller to its start', () => {
    const root = render(session, 0);
    const target = segs[42];
    const door = segmentDoor(root, target.startSec);
    expect(door).toBeDefined();
    act(() => {
      door!.props.onPress();
    });
    expect(player.seekDevotional).toHaveBeenCalledTimes(1);
    expect(player.seekDevotional).toHaveBeenCalledWith(target.startSec);
  });
});

// ─── A chapter session: no transcript anywhere ──────────────────────────────

describe('v508 player — a chapter devotional renders NO transcript section', () => {
  it('Genesis 1’s narration session shows no TRANSCRIPT panel and no tour words', () => {
    const chapter = getDevotional('Genesis', 1)!;
    const root = render(chapter, 0);
    const all = texts(root);
    expect(all).not.toContain('TRANSCRIPT');
    expect(all).not.toContain('Introduction');
    expect(all).not.toContain(tenStopsTranscript('Genesis')![0].text);
  });
});
