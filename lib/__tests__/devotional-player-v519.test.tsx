/**
 * v519 — the transcript's weight (Jonathan's recording, Nov 13,
 * on v518).
 *
 * With a Ten Stops tour playing, the player still dragged: the
 * transcript panel mounted all ~500 of its segment Pressables
 * at once (each with a layout callback) inside the page's one
 * ScrollView, and a position tick's render scope was the whole
 * page — the guideposts memo was defeated per tick by a fresh
 * movements array, and a segment boundary re-rendered every
 * row. The cleanup pinned here is structural:
 *
 *  (a) the panel mounts a WINDOW of its rows — overscan around
 *      the spoken segment (and, while the follow camera is
 *      parked, the reader's viewport) — and carries the rest
 *      on two spacers whose heights come from the row-height
 *      MODEL (transcriptRowOffsets: measured heights cached by
 *      row position over text-derived estimates). At rest on
 *      the Genesis tour (506 segments, 517 rows) the mounted
 *      set is ~40 rows, not 517 — and the spacer arithmetic is
 *      the model's, exactly, never a flat guess;
 *  (b) the window travels with the voice: seating the playhead
 *      deep in the tour mounts that region (its stop header,
 *      its lit segment) and unmounts the top; the spoken
 *      segment is mounted at every seat;
 *  (c) measured heights ENTER the model: rows measured at one
 *      seat still inform the spacers after the window has
 *      travelled away and back;
 *  (d) a tick inside a segment changes nothing in the panel;
 *      a tick across a boundary changes exactly two rows'
 *      dress — the one that lit and the one that went out;
 *  (e) a far seek still lands the camera on the spoken
 *      segment's MEASURED seat: the seat correction completes
 *      the scroll once the windowed row mounts and measures —
 *      no scroll is aimed at an estimate in the meantime.
 *
 * v520 RE-BASE (2026-11-13): Jonathan's verdict on v519 was
 * that the lag was still there, and his diagnosis — the
 * player continually hunting for the transcript spot — held
 * in code. His directed design removed the automatic follow:
 * the pins below are re-based where the old semantics named
 * the voice as the window's anchor or the camera's driver.
 *  (a) stands, with one honest change of subject: the window
 *      at rest is the panel's head because the transcript
 *      OPENS there now — the reader's anchor, not the voice's.
 *  (b) is INVERTED: the window does not travel with the
 *      voice at all; it travels with the reader's scroll.
 *  (c) stands, re-driven by scroll instead of by playhead.
 *  (d) stands, with the window carried to the segment by the
 *      reader's scroll first — and now also pins that the
 *      ticks themselves issue zero scroll calls.
 *  (e) stands VERBATIM: a guidepost tap is a deliberate act,
 *      and its seat — armed by the tap, completed off the
 *      row's measurement, no scroll aimed at an estimate —
 *      is exactly the one-shot seat v520 keeps. It is the
 *      follow camera's automatic life that is gone, not this.
 * The pure model pins move to transcriptWindowRange's new
 * inputs (anchorRow is a deliberate seat target or null;
 * the viewport range is the standing anchor).
 *
 * What this rig CANNOT prove: on-device frame timing. That
 * the travel and the transcript scroll feel light on
 * Jonathan's phone is his phone's verdict, as always.
 */
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ─── The expo-audio fake (the v512/v515 shape, plus a status door) ──────────

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
  transcriptWindowRange,
  TRANSCRIPT_WINDOW_AHEAD_ROWS,
  TRANSCRIPT_WINDOW_BACK_ROWS,
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

const texts = (root: ReactTestInstance): string[] =>
  root
    .findAll((n) => n.type === 'Text' || n.type === 'AnimatedText')
    .flatMap((t) => (Array.isArray(t.props.children) ? t.props.children : [t.props.children]))
    .map((c) => String(c ?? ''));

const segmentDoors = (root: ReactTestInstance) =>
  root
    .findAllByType('Pressable' as never)
    .filter((p) => /^Play from \d+:\d{2}$/.test(String(p.props.accessibilityLabel ?? '')));

const doorFor = (root: ReactTestInstance, startSec: number) =>
  segmentDoors(root).find((p) => p.props.accessibilityLabel === `Play from ${formatClock(startSec)}`);

const flat = (style: unknown): Record<string, unknown> => {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flat));
  return (style as Record<string, unknown>) ?? {};
};

/** The transcript panel instance: the View whose own children
 *  carry the TRANSCRIPT title. */
const panelOf = (root: ReactTestInstance): ReactTestInstance =>
  root.findAllByType('View' as never).find((v) => {
    const kids = (Array.isArray(v.props.children) ? v.props.children : [v.props.children]) as {
      type?: unknown;
      props?: { children?: unknown };
    }[];
    return kids.some((c) => c && c.type === 'Text' && c.props?.children === 'TRANSCRIPT');
  })!;

/** The window as the panel actually mounted it: the segment
 *  doors + header rows between the title and the spacers, in
 *  panel order, with the spacer heights alongside. */
function mountedWindow(root: ReactTestInstance) {
  const panel = panelOf(root);
  const raw = (Array.isArray(panel.props.children) ? panel.props.children : [panel.props.children]) as unknown[];
  const kids = raw.flatMap((c) => (Array.isArray(c) ? c : [c])) as {
    key?: string | null;
    props?: { testID?: string; style?: { height?: number } };
  }[];
  let headers = 0;
  let segments = 0;
  let topSpacer: number | null = null;
  let bottomSpacer: number | null = null;
  for (const kid of kids) {
    if (!kid || typeof kid !== 'object') continue;
    if (kid.props?.testID === 'transcript-spacer-top') topSpacer = kid.props.style?.height ?? null;
    else if (kid.props?.testID === 'transcript-spacer-bottom')
      bottomSpacer = kid.props.style?.height ?? null;
    // The rows ride as keyed row components: 's-<segment
    // index>' for a segment, 'h-<row position>' for a header.
    else if (typeof kid.key === 'string' && kid.key.startsWith('s-')) segments += 1;
    else if (typeof kid.key === 'string' && kid.key.startsWith('h-')) headers += 1;
  }
  return { headers, segments, rows: headers + segments, topSpacer, bottomSpacer };
}

const segRowPos = (segIndex: number): number => {
  let pos = -1;
  ROWS.forEach((r, i) => {
    if (r.kind === 'segment' && r.index === segIndex) pos = i;
  });
  return pos;
};

/** v520: the reader's own scroll, fired through the page's
 *  ScrollView the way a real scroll reports it. */
const fireScroll = (root: ReactTestInstance, y: number) => {
  const host = root.findByType('RNScrollView' as never);
  act(() => {
    host.props.onScroll({ nativeEvent: { contentOffset: { y } } });
  });
};

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

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  stopDevotional();
  fakeAudio.reset();
  scroll.to.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── The pure model ─────────────────────────────────────────────────────────

describe('v519 window model — transcriptWindowRange / transcriptRowOffsets', () => {
  it('a seat anchor cuts around its row with the named overscan, clamped to the panel', () => {
    // v520 RE-BASE (2026-11-13): the model's first input was
    // the spoken row (activeRow) — the voice's anchor. It is
    // now a DELIBERATE seat target (anchorRow: Catch up, a
    // guidepost, a line) or null; the cut around it is the
    // v519 cut, unchanged.
    const range = transcriptWindowRange({
      rowCount: 517,
      anchorRow: 200,
      viewFirst: null,
      viewLast: null,
      current: null,
    });
    expect(range).toEqual({
      start: 200 - TRANSCRIPT_WINDOW_BACK_ROWS,
      end: 200 + TRANSCRIPT_WINDOW_AHEAD_ROWS + 1,
    });
    // No anchor and no viewport known yet: the panel's head —
    // the transcript opens at its top (v520: opening does no
    // seat-to-active work).
    expect(
      transcriptWindowRange({ rowCount: 517, anchorRow: null, viewFirst: null, viewLast: null, current: null }),
    ).toEqual({ start: 0, end: TRANSCRIPT_WINDOW_AHEAD_ROWS + 1 });
    expect(
      transcriptWindowRange({ rowCount: 517, anchorRow: 516, viewFirst: null, viewLast: null, current: null }).end,
    ).toBe(517);
  });

  it('holds still while the viewport keeps the hold margin (hysteresis), re-cuts at the edge', () => {
    // v520 RE-BASE (2026-11-13): the hysteresis anchor is the
    // reader's viewport range now — the only standing anchor.
    // The margins and the re-cut shape are the v519 ones.
    const standing = { start: 100, end: 200 };
    // Mid-window: the same range object comes back — no re-slice.
    expect(
      transcriptWindowRange({ rowCount: 517, anchorRow: null, viewFirst: 150, viewLast: 160, current: standing }),
    ).toBe(standing);
    // The viewport nears the far edge (within the margin):
    // re-cut around the viewport, with the named overscan.
    const nearEdge = transcriptWindowRange({
      rowCount: 517,
      anchorRow: null,
      viewFirst: 190,
      viewLast: 195,
      current: standing,
    });
    expect(nearEdge).not.toBe(standing);
    expect(nearEdge).toEqual({
      start: 190 - TRANSCRIPT_WINDOW_BACK_ROWS,
      end: 195 + TRANSCRIPT_WINDOW_AHEAD_ROWS + 1,
    });
    // Escaped entirely: re-cut around the viewport.
    const escaped = transcriptWindowRange({
      rowCount: 517,
      anchorRow: null,
      viewFirst: 300,
      viewLast: 310,
      current: standing,
    });
    expect(escaped.start).toBeLessThanOrEqual(300);
    expect(escaped.end).toBeGreaterThan(310);
    // At the panel's own edges the margin cannot exist, and an
    // edge window still holds: the at-rest window stands while
    // the reader is on its first rows.
    const atRest = { start: 0, end: 42 };
    expect(
      transcriptWindowRange({ rowCount: 517, anchorRow: null, viewFirst: 1, viewLast: 5, current: atRest }),
    ).toBe(atRest);
  });

  it('a seat anchor overrides the viewport — a jump cut, never a span of both', () => {
    // v520 RE-BASE (2026-11-13): v519's parked window SPANNED
    // the reader and the voice (start 0, end 517 for a reader
    // at the top and a voice at the end). A v520 seat is a
    // jump: the window belongs to its target alone, and the
    // road between is never mounted.
    const range = transcriptWindowRange({
      rowCount: 517,
      anchorRow: 500,
      viewFirst: 10,
      viewLast: 20,
      current: null,
    });
    expect(range).toEqual({
      start: 500 - TRANSCRIPT_WINDOW_BACK_ROWS,
      end: 517,
    });
    // And the viewport alone, no seat in flight: a fresh cut
    // around what the reader is looking at.
    expect(
      transcriptWindowRange({ rowCount: 517, anchorRow: null, viewFirst: 10, viewLast: 20, current: null }),
    ).toEqual({ start: 0, end: 20 + TRANSCRIPT_WINDOW_AHEAD_ROWS + 1 });
  });

  it('offsets: a measured height replaces the estimate; the total is the rows’ sum', () => {
    const rows = ROWS.slice(0, 30);
    const cpl = transcriptCharsPerLine(350);
    const bare = transcriptRowOffsets(rows, new Map(), cpl);
    const measured = new Map([[5, 100]]);
    const withMeasured = transcriptRowOffsets(rows, measured, cpl);
    expect(withMeasured[6] - withMeasured[5]).toBe(100);
    expect(withMeasured[rows.length]).toBe(bare[rows.length] - (bare[6] - bare[5]) + 100);
  });
});

// ─── (a) The window at rest, and its spacer accounting ──────────────────────

describe('v519 transcript — the mounted window at rest', () => {
  it('mounts ~40 of 517 rows; the bottom spacer is the height model’s own sum', async () => {
    expect(openDevotional(TOUR, { uri: 'file:///genesis-ten-stops.m4a' })).toBe(true);
    const view = await renderPlayer();
    const root = view.root;

    expect(SEGS.length).toBe(506);
    expect(ROWS.length).toBe(517);
    const win = mountedWindow(root);
    // The window: a small slice at the panel's head — the
    // Introduction and Stop 1's headers over the first segments.
    expect(win.topSpacer).toBeNull();
    expect(win.headers).toBe(2);
    expect(win.segments).toBeGreaterThanOrEqual(35);
    expect(win.segments).toBeLessThanOrEqual(45);
    expect(win.rows).toBeLessThan(ROWS.length / 6);
    expect(doorFor(root, SEGS[0].startSec)).toBeDefined();
    expect(doorFor(root, SEGS[500].startSec)).toBeUndefined();
    // Stop 10's header is not mounted (its title legitimately
    // stands in the guideposts panel — the check is the
    // transcript panel's own text).
    expect(texts(panelOf(root))).not.toContain('God Meant It For Good');

    // The bottom spacer carries every unmounted row below the
    // window, at the model's heights (nothing measured yet in
    // this rig — the text-derived estimates, at the panel's
    // default measure).
    const offsets = transcriptRowOffsets(ROWS, new Map(), transcriptCharsPerLine(350));
    expect(win.bottomSpacer).toBe(offsets[ROWS.length] - offsets[win.rows]);
    await act(async () => {
      view.unmount();
    });
  });
});

// ─── (b) The window travels — with the reader, never the voice ──────────────
// v520 RE-BASE (2026-11-13): this describe pinned the window
// FOLLOWING THE VOICE (a deep playhead seat mounted its
// region; the spoken segment was mounted at every seat).
// That anchor is the continual hunting Jonathan named, and
// his design removed it. The pins are inverted: playback
// mounts nothing, and the reader's scroll does the travelling
// the voice used to do — with the same model accounting the
// v519 pins asserted for the voice's travel.

describe('v519 transcript — the window follows the voice', () => {
  it('playback alone never moves the window: a deep playhead mounts nothing, scrolls nothing', async () => {
    expect(openDevotional(TOUR, { uri: 'file:///genesis-ten-stops.m4a' })).toBe(true);
    const view = await renderPlayer();
    const root = view.root;
    const atRest = mountedWindow(root);
    expect(doorFor(root, SEGS[0].startSec)).toBeDefined();
    expect(doorFor(root, SEGS[500].startSec)).toBeUndefined();

    // Seat the voice at Stop 10's doorstep, then at the very
    // end of the tour: the panel's membership does not change
    // at all. The spoken segment's region does not mount, its
    // header does not mount, and no scroll is issued — the
    // unmounted spoken row is simply not lit, and nothing
    // special happens because of that.
    await emitPosition(MOVEMENTS[9].startSec + 0.05);
    await emitPosition(SEGS[505].startSec + 0.05);
    expect(mountedWindow(root)).toEqual(atRest);
    expect(texts(panelOf(root))).not.toContain('God Meant It For Good');
    expect(doorFor(root, SEGS[500].startSec)).toBeUndefined();
    expect(doorFor(root, SEGS[0].startSec)).toBeDefined();
    expect(scroll.to).toEqual([]);
    await act(async () => {
      view.unmount();
    });
  });

  it('the reader’s scroll carries the window: its region mounts, the top unmounts', async () => {
    expect(openDevotional(TOUR, { uri: 'file:///genesis-ten-stops.m4a' })).toBe(true);
    const view = await renderPlayer();
    const root = view.root;
    expect(doorFor(root, SEGS[500].startSec)).toBeUndefined();

    // The voice sits at the tour's head the whole time — the
    // travel below is the reader's alone. Scroll the page to
    // the panel model's seat for segment 500's row (no panel
    // layout has been seated in this rig, so the panel's seat
    // in the page is its origin, at the default measure).
    const offsets = transcriptRowOffsets(ROWS, new Map(), transcriptCharsPerLine(350));
    const targetRow = segRowPos(500);
    fireScroll(root, offsets[targetRow]);

    // The deep region stands and the top is gone. Segment
    // 500's door is NOT lit — the voice is at the head; the
    // window's place and the dress are separate facts now.
    const deepDoor = doorFor(root, SEGS[500].startSec);
    expect(deepDoor).toBeDefined();
    expect(flat(deepDoor!.props.style).backgroundColor).toBeUndefined();
    expect(doorFor(root, SEGS[0].startSec)).toBeUndefined();

    // The window's shape, off the model: a fresh cut around
    // the reader's viewport — the named overscan back from
    // the first visible row, ahead from the last — with the
    // spacers carrying the model's sums outside it.
    let viewLast = targetRow;
    while (viewLast + 1 < ROWS.length && offsets[viewLast + 1] < offsets[targetRow] + VIEWPORT_H) {
      viewLast += 1;
    }
    const expectedStart = targetRow - TRANSCRIPT_WINDOW_BACK_ROWS;
    const expectedEnd = Math.min(ROWS.length, viewLast + TRANSCRIPT_WINDOW_AHEAD_ROWS + 1);
    const win = mountedWindow(root);
    expect(win.rows).toBe(expectedEnd - expectedStart);
    expect(win.topSpacer).toBe(offsets[expectedStart]);
    expect(win.bottomSpacer).toBe(
      expectedEnd < ROWS.length ? offsets[ROWS.length] - offsets[expectedEnd] : null,
    );
    await act(async () => {
      view.unmount();
    });
  });
});

// ─── (c) Measured heights enter the model ───────────────────────────────────

describe('v519 transcript — measured heights inform the spacers', () => {
  it('rows measured deep still count after the window travels home', async () => {
    expect(openDevotional(TOUR, { uri: 'file:///genesis-ten-stops.m4a' })).toBe(true);
    const view = await renderPlayer();
    const root = view.root;
    const panel = panelOf(root);

    // Seat the panel at its page offset and the wide measure.
    act(() => {
      panel.props.onLayout({ nativeEvent: { layout: { y: 500, width: 390 } } });
    });
    // v520 RE-BASE (2026-11-13): the travel is the reader's
    // now — scroll the page to the panel model's seat for the
    // last row (the playhead stays at the head throughout),
    // and let every mounted row report a measured height of
    // 100 — the deep window's rows enter the cache.
    const bare390 = transcriptRowOffsets(ROWS, new Map(), transcriptCharsPerLine(390));
    fireScroll(root, 500 + bare390[ROWS.length - 1]);
    const winDeep = mountedWindow(root);
    const deepStart = ROWS.length - winDeep.rows;
    act(() => {
      for (const p of panelOf(root).findAllByType('Pressable' as never)) {
        if (typeof p.props.onLayout === 'function') {
          p.props.onLayout({ nativeEvent: { layout: { y: 0, height: 100 } } });
        }
      }
      for (const v of panelOf(root).findAllByType('View' as never)) {
        if (typeof v.props.onLayout === 'function') {
          v.props.onLayout({ nativeEvent: { layout: { y: 0, height: 100 } } });
        }
      }
    });

    // Travel home — the reader scrolls back to the panel's
    // head. The bottom spacer must now be read off a model in
    // which the deep rows stand at their MEASURED 100, not
    // their estimates.
    fireScroll(root, 500);
    const winHome = mountedWindow(root);
    const measured = new Map<number, number>();
    for (let i = deepStart; i < ROWS.length; i++) measured.set(i, 100);
    const offsets = transcriptRowOffsets(ROWS, measured, transcriptCharsPerLine(390));
    expect(winHome.bottomSpacer).toBe(offsets[ROWS.length] - offsets[winHome.rows]);
    // And it is genuinely the cache speaking: the all-estimate
    // model would carry a different sum for those rows.
    const bare = transcriptRowOffsets(ROWS, new Map(), transcriptCharsPerLine(390));
    expect(winHome.bottomSpacer).not.toBe(bare[ROWS.length] - bare[winHome.rows]);
    await act(async () => {
      view.unmount();
    });
  });
});

// ─── (d) A tick’s render scope ──────────────────────────────────────────────

describe('v519 transcript — what a position tick re-renders', () => {
  it('inside a segment: nothing in the panel changes; across a boundary: exactly two rows’ dress', async () => {
    expect(openDevotional(TOUR, { uri: 'file:///genesis-ten-stops.m4a' })).toBe(true);
    const view = await renderPlayer();
    const root = view.root;
    // v520 RE-BASE (2026-11-13): the window is carried to
    // segment 200's neighbourhood by the READER's scroll —
    // the playhead no longer carries it there. (No panel
    // layout has been seated in this rig, so the panel's seat
    // in the page is its origin, at the default measure.)
    // The dress assertions below are the v519 ones verbatim;
    // the ticks now also pin that they issue no scroll calls.
    const offsets = transcriptRowOffsets(ROWS, new Map(), transcriptCharsPerLine(350));
    fireScroll(root, offsets[segRowPos(200)]);
    await emitPosition(SEGS[200].startSec + 0.05);

    // Doors keyed by label + text. v520 RE-BASE (2026-11-13):
    // v519 keyed by text alone, claiming the texts never
    // collide — inside ITS voice-anchored window they didn't,
    // but the reader-scrolled window here is a little wider
    // and carries a second "Right." (segment 249), whose
    // unchanging dress masked segment 201's in a text key.
    // The m:ss label differs between any two segments, so
    // label + text is unique per door.
    const doorText = (d: ReactTestInstance): string => {
      const t = d.findAll((n) => n.type === 'Text')[0];
      const c = t?.props.children;
      return String(Array.isArray(c) ? c.join('') : (c ?? ''));
    };
    const doorKey = (d: ReactTestInstance): string => `${String(d.props.accessibilityLabel)}|${doorText(d)}`;
    const doorStyles = () =>
      new Map(segmentDoors(root).map((d) => [doorKey(d), JSON.stringify(flat(d.props.style))]));
    const before = doorStyles();
    expect(before.size).toBeGreaterThan(30);

    // A tick that stays inside the spoken segment: the panel's
    // membership and every row's dress are untouched.
    const mid = (SEGS[200].startSec + SEGS[201].startSec) / 2;
    await emitPosition(mid);
    expect(activeTenStopsTranscriptSegment(SEGS, mid)).toBe(200);
    expect(doorStyles()).toEqual(before);

    // Across the boundary: the same doors stand, and exactly
    // two dresses change — 200 goes out (done), 201 lights.
    await emitPosition(SEGS[201].startSec + 0.05);
    const after = doorStyles();
    expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
    const changed = [...after.keys()].filter((k) => after.get(k) !== before.get(k));
    const keyOf = (i: number) => `Play from ${formatClock(SEGS[i].startSec)}|${SEGS[i].text}`;
    expect(changed.sort()).toEqual([keyOf(200), keyOf(201)].sort());
    const theme = devotionalPlayerTheme('Genesis', false);
    const lit = flat(doorFor(root, SEGS[201].startSec)!.props.style);
    expect(lit.backgroundColor).toBe(theme.stopSeat);
    const out = flat(doorFor(root, SEGS[200].startSec)!.props.style);
    expect(out.backgroundColor).toBeUndefined();
    expect(out.borderLeftColor).toBe('transparent');
    // v520: across all those ticks and the boundary, the
    // player issued ZERO scroll calls — the dress moved, the
    // camera never did. (The reader's scroll above was an
    // onScroll report, not a scrollTo.)
    expect(scroll.to).toEqual([]);
    await act(async () => {
      view.unmount();
    });
  });
});

// ─── (e) A far seek lands on the measured seat ──────────────────────────────
// v520 RE-BASE (2026-11-13): assertions UNCHANGED — this is
// the one seat v520 keeps. What changed is who arms it: in
// v519 the seat correction belonged to the follow camera and
// completed any seat the camera aimed at, including the
// automatic ones; in v520 the guidepost tap itself arms the
// one-shot seat (requestSeat), and this completion — no
// scroll aimed at an estimate, exactly one scroll off the
// real measurement — is now the deliberate seat's alone.

describe('v519 transcript — the camera after a far seek', () => {
  it('no scroll is aimed before the seat exists; the measurement completes it', async () => {
    expect(openDevotional(TOUR, { uri: 'file:///genesis-ten-stops.m4a' })).toBe(true);
    const view = await renderPlayer();
    const root = view.root;
    const PANEL_TOP = 500;

    // Seat the layout the phone would report at the top of the
    // tour: the panel at its offset, each mounted segment
    // 100px below the previous (the v510 rig's convention).
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
    scroll.to.length = 0;

    // Tap Stop 9's guidepost: the seek runs through the
    // controller, exactly as before.
    const stop9 = MOVEMENTS[8];
    expect(stop9.title).toBe('Joseph Reveals Himself');
    const guideDoor = root
      .findAllByType('Pressable' as never)
      .find((p) => p.props.accessibilityLabel === `Play from ${stop9.title}`);
    expect(guideDoor).toBeDefined();
    act(() => {
      guideDoor!.props.onPress();
    });
    expect(fakeAudio.calls.seekTo).toContain(stop9.startSec);

    // The voice arrives at Stop 9. The spoken segment's row
    // has only just mounted with the window the tap's seat
    // cut — it has reported no layout yet, so NO scroll has
    // been aimed (a seat never aims off an estimate). v520:
    // the voice's arrival itself arms nothing; the seat
    // pending here is the tap's.
    await emitPosition(stop9.startSec + 0.05);
    const activeIdx = activeTenStopsTranscriptSegment(SEGS, stop9.startSec + 0.05);
    expect(doorFor(root, SEGS[activeIdx].startSec)).toBeDefined();
    expect(scroll.to).toEqual([]);

    // Its measurement lands — and the seat completes, at the
    // follow seat (a third of the screen down), off the
    // measured offset.
    const activeDoor = doorFor(root, SEGS[activeIdx].startSec)!;
    act(() => {
      activeDoor.props.onLayout({ nativeEvent: { layout: { y: activeIdx * 100, height: 100 } } });
    });
    expect(scroll.to).toEqual([
      { y: followScrollTarget(PANEL_TOP + activeIdx * 100, VIEWPORT_H), animated: true },
    ]);
    await act(async () => {
      view.unmount();
    });
  });
});
