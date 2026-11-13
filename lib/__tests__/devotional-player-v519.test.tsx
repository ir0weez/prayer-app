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
  it('anchors on the spoken row with the named overscan, clamped to the panel', () => {
    const range = transcriptWindowRange({
      rowCount: 517,
      activeRow: 200,
      viewFirst: null,
      viewLast: null,
      current: null,
    });
    expect(range).toEqual({
      start: 200 - TRANSCRIPT_WINDOW_BACK_ROWS,
      end: 200 + TRANSCRIPT_WINDOW_AHEAD_ROWS + 1,
    });
    expect(
      transcriptWindowRange({ rowCount: 517, activeRow: -1, viewFirst: null, viewLast: null, current: null }),
    ).toEqual({ start: 0, end: TRANSCRIPT_WINDOW_AHEAD_ROWS + 1 });
    expect(
      transcriptWindowRange({ rowCount: 517, activeRow: 516, viewFirst: null, viewLast: null, current: null }).end,
    ).toBe(517);
  });

  it('holds still while the anchor keeps the hold margin (hysteresis), re-cuts at the edge', () => {
    const standing = { start: 100, end: 200 };
    // Mid-window: the same range object comes back — no re-slice.
    expect(
      transcriptWindowRange({ rowCount: 517, activeRow: 150, viewFirst: null, viewLast: null, current: standing }),
    ).toBe(standing);
    // Nearing the far edge (within the margin): re-cut around
    // the anchor, with the named overscan.
    const nearEdge = transcriptWindowRange({
      rowCount: 517,
      activeRow: 195,
      viewFirst: null,
      viewLast: null,
      current: standing,
    });
    expect(nearEdge).not.toBe(standing);
    expect(nearEdge).toEqual({
      start: 195 - TRANSCRIPT_WINDOW_BACK_ROWS,
      end: 195 + TRANSCRIPT_WINDOW_AHEAD_ROWS + 1,
    });
    // Escaped entirely: re-cut around the anchor.
    const escaped = transcriptWindowRange({
      rowCount: 517,
      activeRow: 300,
      viewFirst: null,
      viewLast: null,
      current: standing,
    });
    expect(escaped.start).toBeLessThanOrEqual(300);
    expect(escaped.end).toBeGreaterThan(300);
    // At the panel's own edges the margin cannot exist, and an
    // edge window still holds: the at-rest window stands while
    // the voice is on its first segments.
    const atRest = { start: 0, end: 42 };
    expect(
      transcriptWindowRange({ rowCount: 517, activeRow: 1, viewFirst: null, viewLast: null, current: atRest }),
    ).toBe(atRest);
  });

  it('spans the reader and the voice when a viewport range is given', () => {
    const range = transcriptWindowRange({
      rowCount: 517,
      activeRow: 500,
      viewFirst: 10,
      viewLast: 20,
      current: null,
    });
    expect(range.start).toBe(0);
    expect(range.end).toBe(517);
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

// ─── (b) The window travels with the voice ──────────────────────────────────

describe('v519 transcript — the window follows the voice', () => {
  it('a deep seat mounts its region — header, lit segment — and unmounts the top', async () => {
    expect(openDevotional(TOUR, { uri: 'file:///genesis-ten-stops.m4a' })).toBe(true);
    const view = await renderPlayer();
    const root = view.root;
    expect(doorFor(root, SEGS[500].startSec)).toBeUndefined();

    // Seat the voice at Stop 10's doorstep: its first segment.
    const at = MOVEMENTS[9].startSec + 0.05;
    await emitPosition(at);
    const activeIdx = activeTenStopsTranscriptSegment(SEGS, at);
    expect(activeIdx).toBeGreaterThan(400);

    // The region stands: Stop 10's header, the segment itself,
    // lit in the book's family.
    expect(texts(panelOf(root))).toContain('God Meant It For Good');
    const activeDoor = doorFor(root, SEGS[activeIdx].startSec);
    expect(activeDoor).toBeDefined();
    const theme = devotionalPlayerTheme('Genesis', false);
    expect(flat(activeDoor!.props.style).backgroundColor).toBe(theme.stopSeat);
    expect(flat(activeDoor!.props.style).borderLeftColor).toBe(theme.primary);
    // …and the top is gone.
    expect(doorFor(root, SEGS[0].startSec)).toBeUndefined();

    // The window's shape, off the model: the named overscan
    // around the spoken row, and both spacers carrying the
    // model's sums for the rows outside it — estimates still,
    // nothing in this rig has measured a row.
    const win = mountedWindow(root);
    const activeRow = segRowPos(activeIdx);
    const expectedStart = activeRow - TRANSCRIPT_WINDOW_BACK_ROWS;
    const expectedEnd = activeRow + TRANSCRIPT_WINDOW_AHEAD_ROWS + 1;
    expect(win.rows).toBe(expectedEnd - expectedStart);
    const offsets = transcriptRowOffsets(ROWS, new Map(), transcriptCharsPerLine(350));
    expect(win.topSpacer).toBe(offsets[expectedStart]);
    expect(win.bottomSpacer).toBe(offsets[ROWS.length] - offsets[expectedEnd]);
    await act(async () => {
      view.unmount();
    });
  });

  it('the spoken segment is mounted at the tour’s end seat as well', async () => {
    expect(openDevotional(TOUR, { uri: 'file:///genesis-ten-stops.m4a' })).toBe(true);
    const view = await renderPlayer();
    await emitPosition(SEGS[505].startSec + 0.05);
    expect(doorFor(view.root, SEGS[505].startSec)).toBeDefined();
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
    // Go deep and let every mounted row report a measured
    // height of 100 — the deep window's rows enter the cache.
    await emitPosition(SEGS[500].startSec + 0.05);
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

    // Travel home. The bottom spacer must now be read off a
    // model in which the deep rows stand at their MEASURED
    // 100, not their estimates.
    await emitPosition(SEGS[0].startSec + 0.05);
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
    await emitPosition(SEGS[200].startSec + 0.05);

    // Doors keyed by their segment's own text — the m:ss
    // labels collide between neighbours a second apart, the
    // texts never do.
    const doorText = (d: ReactTestInstance): string => {
      const t = d.findAll((n) => n.type === 'Text')[0];
      const c = t?.props.children;
      return String(Array.isArray(c) ? c.join('') : (c ?? ''));
    };
    const doorStyles = () =>
      new Map(segmentDoors(root).map((d) => [doorText(d), JSON.stringify(flat(d.props.style))]));
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
    expect(changed.sort()).toEqual([SEGS[200].text, SEGS[201].text].sort());
    const theme = devotionalPlayerTheme('Genesis', false);
    const lit = flat(doorFor(root, SEGS[201].startSec)!.props.style);
    expect(lit.backgroundColor).toBe(theme.stopSeat);
    const out = flat(doorFor(root, SEGS[200].startSec)!.props.style);
    expect(out.backgroundColor).toBeUndefined();
    expect(out.borderLeftColor).toBe('transparent');
    await act(async () => {
      view.unmount();
    });
  });
});

// ─── (e) A far seek lands on the measured seat ──────────────────────────────

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
    // has only just mounted with the window — it has reported
    // no layout yet, so the camera aims NO scroll (it never
    // seats off an estimate).
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
