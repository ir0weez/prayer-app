/**
 * v522 — the transcript becomes a toggled view: the APPLE
 * MUSIC LYRICS model, Jonathan's named reference (Nov 13).
 *
 * v520 removed the automatic follow outright and made the
 * Catch up pill the whole follow mechanism. His verdict:
 * v520 helped a little, the lag was still there — and his
 * hypothesis: "maybe having a transcript toggle would
 * help?" If the transcript can be toggled fully OFF, the
 * player shouldn't be rendering or processing it at all in
 * that state. Then he named the model: "They aren't always
 * on, but you can toggle them on, scroll through them, and
 * follow along if you choose."
 *
 * The state machine pinned here (the view state lives in
 * the listen view and resets on unmount):
 *
 *  (a) OFF — the state at every open: the transcript panel
 *      is NOT MOUNTED (no segment doors at all), the
 *      position tick performs no transcript work (zero
 *      scrolls across a long boundary walk, drag and grace
 *      included; the source pin holds the work-cut itself:
 *      the active-segment lookup and the panel mount are
 *      both gated on the view being on), the Transcript
 *      button stands in the controls in its quiet dress,
 *      and no Catch up exists.
 *  (b) Toggle ON lands FOLLOWING: the press mounts the
 *      panel, seats once to the spoken segment (the armed
 *      branch — completed off the row's real measurement),
 *      and boundaries then seat the voice as it advances.
 *      The button's dress flips to the primary fill.
 *  (c) The reader's own swipe RELEASES follow and it stays
 *      released: boundaries, long timer advances — nothing
 *      scrolls, nothing re-engages — while the panel stays
 *      mounted at the reader's rows.
 *  (d) CATCH UP lives inside the on state: standing only
 *      while on + released + the spoken segment out of
 *      view, its press seats to the spoken segment AND
 *      re-engages follow (boundaries seat again), and it
 *      hides while following.
 *  (e) The button turns the view OFF in one press from
 *      either on-state (following or released): the panel
 *      unmounts, ticks do nothing. A guidepost seek in OFF
 *      seeks the audio and mounts nothing.
 *  (f) Seeks never engage follow: a transcript-line tap in
 *      the released state seats the tapped segment exactly
 *      once and follow stays off.
 *  (g) A reopen starts OFF again, however deep the voice
 *      is: the reset rides the view's unmount.
 *
 * Chapter-devotional sessions are untouched by v522 — no
 * transcript, no button; their pins stand in
 * devotional-player-v510.test.tsx and
 * devotional-catchup-v512.test.tsx.
 *
 * The rig is the v520 one (real controller over a fake
 * expo-audio, react-test-renderer over string hosts, a
 * ScrollView that records scrollTo).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ─── The expo-audio fake (the v520 shape) ───────────────────────────────────

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
const THEME = devotionalPlayerTheme('Genesis', false);

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

const transcriptButton = (root: ReactTestInstance) =>
  root.findAllByType('Pressable' as never).filter((b) => b.props.accessibilityLabel === 'Transcript');

const panelOf = (root: ReactTestInstance): ReactTestInstance | undefined =>
  root.findAllByType('View' as never).find((v) => {
    const kids = (Array.isArray(v.props.children) ? v.props.children : [v.props.children]) as {
      type?: unknown;
      props?: { children?: unknown };
    }[];
    return kids.some((c) => c && c.type === 'Text' && c.props?.children === 'TRANSCRIPT');
  });

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

const beginDrag = (root: ReactTestInstance) => {
  const host = root.findByType('RNScrollView' as never);
  act(() => {
    host.props.onScrollBeginDrag();
  });
};

const pressTranscript = async (root: ReactTestInstance) => {
  expect(transcriptButton(root)).toHaveLength(1);
  await act(async () => {
    transcriptButton(root)[0].props.onPress();
  });
};

/** Report the layout the phone would report for everything
 *  currently mounted in the panel: the panel at PANEL_TOP and
 *  the wide measure, each segment door at the rig's seat
 *  convention (index × 100) with a measured height of 100. */
function seatMountedLayout(root: ReactTestInstance) {
  act(() => {
    panelOf(root)?.props.onLayout({ nativeEvent: { layout: { y: PANEL_TOP, width: 390 } } });
    for (const door of segmentDoors(root)) {
      // Keyed by label AND text: two segments can share a
      // clock-second label (the v519 rig learned this from a
      // second "Right."), so the label alone mis-seats.
      const text = door
        .findAllByType('Text' as never)
        .map((t) => t.props.children)
        .find((c) => typeof c === 'string');
      const idx = SEGS.findIndex(
        (s) =>
          `Play from ${formatClock(s.startSec)}` === door.props.accessibilityLabel && s.text === text,
      );
      if (idx >= 0 && typeof door.props.onLayout === 'function') {
        door.props.onLayout({ nativeEvent: { layout: { y: idx * 100, height: 100 } } });
      }
    }
  });
}

/** Fire the panel's layout, then one door's layout at the
 *  rig's seat convention. */
function fireDoorLayout(root: ReactTestInstance, segIndex: number) {
  const door = doorFor(root, SEGS[segIndex].startSec);
  expect(door).toBeDefined();
  act(() => {
    panelOf(root)?.props.onLayout({ nativeEvent: { layout: { y: PANEL_TOP, width: 390 } } });
    door!.props.onLayout({ nativeEvent: { layout: { y: segIndex * 100, height: 100 } } });
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
const seatY = (segIndex: number) => followScrollTarget(PANEL_TOP + segIndex * 100, VIEWPORT_H);

/** Toggle the transcript on at the given spoken segment and
 *  complete the landing seat off the door's measurement. */
async function toggleOnAndLand(root: ReactTestInstance, segIndex: number) {
  await pressTranscript(root);
  expect(doorFor(root, SEGS[segIndex].startSec)).toBeDefined();
  fireDoorLayout(root, segIndex);
  expect(scroll.to).toEqual([{ y: seatY(segIndex), animated: true }]);
}

/** Put the reader's viewport on the given segment's rows
 *  (the rig's model seat for that row) — the reader is
 *  looking at the voice's region. */
function readerLooksAt(root: ReactTestInstance, segIndex: number) {
  const offsets = transcriptRowOffsets(ROWS, new Map(), transcriptCharsPerLine(390));
  fireScroll(root, PANEL_TOP + offsets[segRowPos(segIndex)]);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  stopDevotional();
  fakeAudio.reset();
  scroll.to.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── (a) OFF at open — no panel, no tick work ───────────────────────────────

describe('v522 transcript — OFF at open', () => {
  it('no panel mounts, ticks and boundaries do nothing, the button stands quiet, no Catch up', async () => {
    expect(openDevotional(TOUR, { uri: 'file:///genesis-ten-stops.m4a' })).toBe(true);
    const view = await renderPlayer();
    const root = view.root;

    // The Transcript button stands in the controls, quiet
    // dress (the tonal seat), not selected.
    expect(transcriptButton(root)).toHaveLength(1);
    expect(flat(transcriptButton(root)[0].props.style).backgroundColor).toBe(THEME.stopSeat);
    expect(transcriptButton(root)[0].props.accessibilityState?.selected).toBe(false);

    // The voice walks deep — inside segments and across
    // boundaries, past Stop 10's doorstep: NO panel ever
    // mounts (not one segment door), nothing scrolls, and
    // no Catch up exists to stand.
    for (const i of [1, 2, 3, 5, 8, 13, 21, 60, 200]) {
      await emitPosition((SEGS[i].startSec + SEGS[i + 1].startSec) / 2);
      await emitPosition(inSeg(i + 1));
    }
    await emitPosition(MOVEMENTS[9].startSec + 0.05);
    expect(panelOf(root)).toBeUndefined();
    expect(segmentDoors(root)).toHaveLength(0);
    expect(scroll.to).toEqual([]);
    expect(catchUpButton(root)).toHaveLength(0);

    // A drag and long past any grace change nothing either.
    beginDrag(root);
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    await emitPosition(inSeg(30));
    expect(segmentDoors(root)).toHaveLength(0);
    expect(scroll.to).toEqual([]);
    await act(async () => {
      view.unmount();
    });
  });

  it('the OFF work-cut holds in the source: lookup and mount both gated on the view', () => {
    const src = readFileSync(join(process.cwd(), 'components/devotional-listen.tsx'), 'utf8');
    // The per-tick active-segment lookup runs only while the
    // view is on…
    expect(src).toContain("transcriptRows && transcriptView !== 'off'");
    // …and the panel mounts only while the view is on.
    expect(src).toContain("panelsReady && transcriptRows && transcriptView !== 'off'");
  });
});

// ─── (b) Toggle on lands following ──────────────────────────────────────────

describe('v522 transcript — toggle on lands following', () => {
  it('the press mounts the panel, seats once to the spoken segment, and boundaries then seat the voice', async () => {
    expect(openDevotional(TOUR, { uri: 'file:///genesis-ten-stops.m4a' })).toBe(true);
    const view = await renderPlayer();
    const root = view.root;

    // The voice is at segment 30 while the view is off.
    await emitPosition(inSeg(30));
    expect(segmentDoors(root)).toHaveLength(0);

    // The press: the panel mounts around the voice, the
    // armed seat completes off the door's real measurement —
    // exactly one scroll, at the follow seat.
    await toggleOnAndLand(root, 30);
    expect(panelOf(root)).toBeDefined();

    // The button wears the view's on dress now.
    expect(flat(transcriptButton(root)[0].props.style).backgroundColor).toBe(THEME.primary);
    expect(transcriptButton(root)[0].props.accessibilityState?.selected).toBe(true);
    // No Catch up while following.
    expect(catchUpButton(root)).toHaveLength(0);

    // Measure the standing window, then let the voice walk:
    // each boundary seats the newly spoken segment, once.
    seatMountedLayout(root);
    await emitPosition(inSeg(33));
    expect(scroll.to).toEqual([
      { y: seatY(30), animated: true },
      { y: seatY(33), animated: true },
    ]);
    await emitPosition(inSeg(36));
    expect(scroll.to).toHaveLength(3);
    expect(scroll.to[2]).toEqual({ y: seatY(36), animated: true });
    await act(async () => {
      view.unmount();
    });
  });
});

// ─── (c) The reader's swipe releases follow — and it stays released ─────────

describe('v522 transcript — the swipe releases follow', () => {
  it('after a drag, boundaries and long time scroll nothing; the panel stays at the reader’s rows', async () => {
    expect(openDevotional(TOUR, { uri: 'file:///genesis-ten-stops.m4a' })).toBe(true);
    const view = await renderPlayer();
    const root = view.root;
    await emitPosition(inSeg(30));
    await toggleOnAndLand(root, 30);
    readerLooksAt(root, 30);
    scroll.to.length = 0;

    // His hand takes the page: follow releases.
    beginDrag(root);

    // The voice walks on, boundaries pass, half a minute of
    // timers runs out (no resume machinery exists to revive
    // it): nothing scrolls, ever.
    await emitPosition(inSeg(35));
    await emitPosition(inSeg(40));
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    await emitPosition(inSeg(45));
    expect(scroll.to).toEqual([]);

    // The panel is still mounted, standing at the READER's
    // rows — segment 30's door is here; the voice's current
    // region is not chased.
    expect(panelOf(root)).toBeDefined();
    expect(doorFor(root, SEGS[30].startSec)).toBeDefined();
    await act(async () => {
      view.unmount();
    });
  });
});

// ─── (d) Catch up — only inside on + released + out of view ─────────────────

describe('v522 transcript — Catch up inside the on state', () => {
  it('stands only when released with the voice out of view; its press seats and re-engages follow', async () => {
    expect(openDevotional(TOUR, { uri: 'file:///genesis-ten-stops.m4a' })).toBe(true);
    const view = await renderPlayer();
    const root = view.root;
    await emitPosition(inSeg(30));
    await toggleOnAndLand(root, 30);
    readerLooksAt(root, 30);
    scroll.to.length = 0;

    // Released, but the voice is still in his view: no capsule.
    beginDrag(root);
    expect(catchUpButton(root)).toHaveLength(0);

    // The voice walks far away; he scrolls home. Now the
    // capsule stands — on, released, spoken out of view.
    await emitPosition(inSeg(80));
    fireScroll(root, PANEL_TOP);
    expect(catchUpButton(root)).toHaveLength(1);
    expect(scroll.to).toEqual([]);

    // The press: the seat arms (segment 80's row has never
    // measured), the window slices to it, its measurement
    // completes exactly one seat…
    await act(async () => {
      catchUpButton(root)[0].props.onPress();
    });
    expect(scroll.to).toEqual([]);
    fireDoorLayout(root, 80);
    expect(scroll.to).toEqual([{ y: seatY(80), animated: true }]);

    // …and follow is ENGAGED again: the capsule hides, and
    // the next boundary seats the voice (measured window).
    expect(catchUpButton(root)).toHaveLength(0);
    seatMountedLayout(root);
    await emitPosition(inSeg(83));
    expect(scroll.to).toEqual([
      { y: seatY(80), animated: true },
      { y: seatY(83), animated: true },
    ]);
    await act(async () => {
      view.unmount();
    });
  });
});

// ─── (e) One press off, from either on-state; seeks in OFF mount nothing ────

describe('v522 transcript — toggling off; seeks in OFF', () => {
  it('one press off from FOLLOWING unmounts the panel; ticks then do nothing', async () => {
    expect(openDevotional(TOUR, { uri: 'file:///genesis-ten-stops.m4a' })).toBe(true);
    const view = await renderPlayer();
    const root = view.root;
    await emitPosition(inSeg(30));
    await toggleOnAndLand(root, 30);
    scroll.to.length = 0;

    await pressTranscript(root);
    expect(panelOf(root)).toBeUndefined();
    expect(segmentDoors(root)).toHaveLength(0);
    expect(flat(transcriptButton(root)[0].props.style).backgroundColor).toBe(THEME.stopSeat);
    await emitPosition(inSeg(40));
    await emitPosition(inSeg(50));
    expect(scroll.to).toEqual([]);
    expect(catchUpButton(root)).toHaveLength(0);
    await act(async () => {
      view.unmount();
    });
  });

  it('one press off from RELEASED unmounts the panel too', async () => {
    expect(openDevotional(TOUR, { uri: 'file:///genesis-ten-stops.m4a' })).toBe(true);
    const view = await renderPlayer();
    const root = view.root;
    await emitPosition(inSeg(30));
    await toggleOnAndLand(root, 30);
    beginDrag(root); // released
    expect(panelOf(root)).toBeDefined();

    await pressTranscript(root);
    expect(panelOf(root)).toBeUndefined();
    expect(segmentDoors(root)).toHaveLength(0);
    scroll.to.length = 0;
    await emitPosition(inSeg(40));
    expect(scroll.to).toEqual([]);
    await act(async () => {
      view.unmount();
    });
  });

  it('a guidepost seek in OFF seeks the audio and mounts nothing', async () => {
    expect(openDevotional(TOUR, { uri: 'file:///genesis-ten-stops.m4a' })).toBe(true);
    const view = await renderPlayer();
    const root = view.root;

    const stop9 = MOVEMENTS[8];
    const guideDoor = root
      .findAllByType('Pressable' as never)
      .find((p) => p.props.accessibilityLabel === `Play from ${stop9.title}`);
    expect(guideDoor).toBeDefined();
    act(() => {
      guideDoor!.props.onPress();
    });
    expect(fakeAudio.calls.seekTo).toContain(stop9.startSec);

    // The voice arrives at the stop: the panel stays OFF —
    // no doors, no scrolls, no Catch up.
    await emitPosition(stop9.startSec + 0.05);
    expect(panelOf(root)).toBeUndefined();
    expect(segmentDoors(root)).toHaveLength(0);
    expect(scroll.to).toEqual([]);
    expect(catchUpButton(root)).toHaveLength(0);
    await act(async () => {
      view.unmount();
    });
  });
});

// ─── (f) Seeks never engage follow ──────────────────────────────────────────

describe('v522 transcript — a line tap seats once and engages nothing', () => {
  it('in the released state a line tap seats the tapped segment once; boundaries after it stay the reader’s', async () => {
    expect(openDevotional(TOUR, { uri: 'file:///genesis-ten-stops.m4a' })).toBe(true);
    const view = await renderPlayer();
    const root = view.root;
    await emitPosition(inSeg(30));
    await toggleOnAndLand(root, 30);
    readerLooksAt(root, 30);
    beginDrag(root); // released
    scroll.to.length = 0;

    // Tap segment 32's line (mounted in the reader's window):
    // the tap seeks the audio and arms its one seat…
    const door32 = doorFor(root, SEGS[32].startSec);
    expect(door32).toBeDefined();
    act(() => {
      door32!.props.onPress();
    });
    expect(fakeAudio.calls.seekTo).toContain(SEGS[32].startSec);
    expect(scroll.to).toEqual([]);
    // …which completes off the row's measurement — once.
    fireDoorLayout(root, 32);
    expect(scroll.to).toEqual([{ y: seatY(32), animated: true }]);

    // The voice (now at the tapped segment) walks on: follow
    // was never engaged by the tap, so boundaries move
    // nothing.
    await emitPosition(inSeg(36));
    await emitPosition(inSeg(40));
    expect(scroll.to).toHaveLength(1);
    await act(async () => {
      view.unmount();
    });
  });
});

// ─── (g) A reopen starts OFF ────────────────────────────────────────────────

describe('v522 transcript — the reset rides the unmount', () => {
  it('a reopen starts OFF however deep the voice is', async () => {
    expect(openDevotional(TOUR, { uri: 'file:///genesis-ten-stops.m4a' })).toBe(true);
    const first = await renderPlayer();
    await emitPosition(inSeg(30));
    await toggleOnAndLand(first.root, 30);
    expect(panelOf(first.root)).toBeDefined();
    await act(async () => {
      first.unmount();
    });
    scroll.to.length = 0;

    // The voice is deep by now — Stop 10's doorstep.
    await emitPosition(MOVEMENTS[9].startSec + 0.05);
    const view = await renderPlayer();
    const root = view.root;
    expect(panelOf(root)).toBeUndefined();
    expect(segmentDoors(root)).toHaveLength(0);
    expect(scroll.to).toEqual([]);
    expect(flat(transcriptButton(root)[0].props.style).backgroundColor).toBe(THEME.stopSeat);
    await act(async () => {
      view.unmount();
    });
  });
});

// ─── The reset is real: the lookup the tick would run ───────────────────────

describe('v522 transcript — the spoken segment the gates stand on', () => {
  it('the rig’s tour facts are the ones the pins above read', () => {
    expect(SEGS.length).toBe(506);
    expect(activeTenStopsTranscriptSegment(SEGS, inSeg(30))).toBe(30);
    expect(activeTenStopsTranscriptSegment(SEGS, MOVEMENTS[9].startSec + 0.05)).toBeGreaterThan(400);
  });
});
