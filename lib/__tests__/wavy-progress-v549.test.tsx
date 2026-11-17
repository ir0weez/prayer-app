/**
 * v549 — two calls of Jonathan's, an hour apart on Nov 17,
 * both about the devotional player's wavy bar.
 *
 *  (1) THE STOP DOT IS A LINE TOO. v548 ticked the tip that
 *      rides the wave's head; the scope note named the one
 *      dot left standing — the track's end stop dot — and
 *      he answered: "I'd like it to be a line as well." The
 *      player's seat now passes `stopTick` alongside
 *      `tipTick`: the stop mark is a slim vertical tick of
 *      the dot's own height and track colour, centred where
 *      the dot's centre sat. Every other seat keeps its dot —
 *      the scoping is pinned by the controls below.
 *
 *  (2) WAVY ⟺ PLAYING. "I'd like the line to stop once the
 *      audio is over. Only wavy when it's on the screen or
 *      while the audio is playing." The seat drives v548's
 *      `still` dress with `morphing || !playing`: paused, or
 *      finished (the ended state — devotionalEnded requires
 *      !playing, pinned at the source below), the bar stands
 *      flat at its fraction, value changes apply instantly,
 *      and the travel loop is genuinely parked — no
 *      per-frame work. Playing in the open view, the wave
 *      and its travel run as they always have (the morph
 *      still stills it mid-swipe, per v548).
 *
 * The render pins use the v548 rig's shape, with Animated
 * doubles that COUNT loop starts/stops and sweep starts, so
 * "parked" and "resumed" are observed, not assumed.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const rig = vi.hoisted(() => ({
  loopStarts: 0,
  loopStops: 0,
  sweepStarts: 0,
}));

vi.mock("react-native", () => ({
  AccessibilityInfo: { isReduceMotionEnabled: async () => false },
  Animated: {
    Value: class {
      addListener() {
        return "0";
      }
      removeListener() {}
      setValue() {}
      interpolate() {
        return 0;
      }
    },
    timing: () => ({
      start: (cb?: any) => {
        rig.sweepStarts += 1;
        cb?.({ finished: true });
      },
      stop: () => {},
    }),
    loop: () => ({
      start: () => {
        rig.loopStarts += 1;
      },
      stop: () => {
        rig.loopStops += 1;
      },
    }),
    View: "AnimatedView",
  },
  Easing: { out: (f: any) => f, cubic: (t: number) => t, linear: (t: number) => t },
  View: "View",
}));

vi.mock("react-native-svg", () => ({
  __esModule: true,
  default: "Svg",
  Svg: "Svg",
  Circle: "Circle",
  Defs: "Defs",
  LinearGradient: "LinearGradient",
  Path: "Path",
  Rect: "Rect",
  Stop: "Stop",
}));

import { WavyProgress, wavyProgressGeometry } from "@/components/wavy-progress";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const component = read("components/wavy-progress.tsx");
const listen = read("components/devotional-listen.tsx");
const player = read("lib/devotional-player.ts");

const COLOR = "#A8150C";
const TRACK = "#3A0D08";
const WIDTH = 340;
const HEIGHT = 14;

const geo = wavyProgressGeometry({ width: WIDTH, height: HEIGHT, value: 0.5 });
const stopDotR = Math.max(1.6, geo.canvasHeight * 0.26);
const stopTickHeight = stopDotR * 2;
const stopTickWidth = Math.max(2.5, stopDotR * 0.62);

const barEl = (props: Record<string, unknown>) =>
  React.createElement(WavyProgress, {
    value: 0.5,
    color: COLOR,
    trackColor: TRACK,
    height: HEIGHT,
    ...props,
  } as never);

const renderBar = async (props: Record<string, unknown>) => {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(barEl(props));
  });
  // The bar draws once it has measured a width.
  const seat = renderer.root.findByType("View" as never);
  await act(async () => {
    seat.props.onLayout({ nativeEvent: { layout: { width: WIDTH } } });
  });
  return renderer;
};

const updateBar = async (r: ReactTestRenderer, props: Record<string, unknown>) => {
  await act(async () => {
    r.update(barEl(props));
  });
};

const circles = (r: ReactTestRenderer) => r.root.findAllByType("Circle" as never);
const rects = (r: ReactTestRenderer) => r.root.findAllByType("Rect" as never);
const paths = (r: ReactTestRenderer) => r.root.findAllByType("Path" as never);

/** The stop tick: the Rect wearing the track colour at the stop dot's height. */
const stopTick = (r: ReactTestRenderer) =>
  rects(r).find((el) => el.props.fill === TRACK && Math.abs(el.props.height - stopTickHeight) < 0.01);

/** The fill window's width — the fraction on screen, in px. */
const fillWindowWidth = (r: ReactTestRenderer): number | null => {
  const win = r.root.findAllByType("View" as never).find((v) => {
    const s = v.props.style as Record<string, unknown> | undefined;
    return !!s && !Array.isArray(s) && s.overflow === "hidden" && typeof s.width === "number";
  });
  return win ? (win.props.style as { width: number }).width : null;
};

/** The y values sampled into a path's `d`, in order. */
function pathYs(d: string): number[] {
  return d.split(" L ").map((seg) => Number(seg.replace(/^M /, "").split(" ")[1]));
}

beforeEach(() => {
  rig.loopStarts = 0;
  rig.loopStops = 0;
  rig.sweepStarts = 0;
});

// ─── (1) The stop tick ──────────────────────────────────────────────────────

describe("v549 wavy progress — the stop tick (rendered)", () => {
  it("the player's dress (tipTick + stopTick): NO circle survives anywhere, and the stop tick stands at the track's end", async () => {
    const r = await renderBar({ tipTick: true, stopTick: true });
    expect(circles(r)).toHaveLength(0);
    const tick = stopTick(r);
    expect(tick, "the stop tick renders").toBeTruthy();
    expect(tick!.props.width).toBeCloseTo(stopTickWidth, 6);
    expect(tick!.props.width).toBeLessThan(tick!.props.height);
    expect(tick!.props.fill).toBe(TRACK);
    // Centred where the dot's centre sat: barWidth − stopDotR.
    expect(tick!.props.x + tick!.props.width / 2).toBeCloseTo(WIDTH - stopDotR, 6);
    // And the tip tick rides as it did in v548.
    expect(
      rects(r).some((el) => Math.abs(el.props.height - geo.tipTickHeight) < 0.01 && el.props.fill === COLOR),
    ).toBe(true);
  });

  it("the flat (stilled) player dress carries the stop tick too — no dot in any player state", async () => {
    const r = await renderBar({ tipTick: true, stopTick: true, still: true });
    expect(circles(r)).toHaveLength(0);
    expect(stopTick(r), "the stop tick renders while stilled").toBeTruthy();
  });

  it("the control: a seat without stopTick keeps its stop dot, at its own radius", async () => {
    const r = await renderBar({});
    expect(circles(r).some((c) => Math.abs(c.props.r - stopDotR) < 0.01)).toBe(true);
    expect(stopTick(r)).toBeUndefined();
  });

  it("the props are independent: stopTick alone ticks the stop and leaves the tip a dot", async () => {
    const r = await renderBar({ stopTick: true });
    expect(stopTick(r)).toBeTruthy();
    expect(circles(r).some((c) => Math.abs(c.props.r - stopDotR) < 0.01)).toBe(false);
    expect(circles(r).some((c) => Math.abs(c.props.r - geo.dotR) < 0.01)).toBe(true);
  });
});

describe("v549 wavy progress — the stop tick (source)", () => {
  it("the component sizes the stop tick from the stop dot's own measures", () => {
    expect(component).toContain("stopTickWidth = Math.max(2.5, stopDotR * 0.62)");
    expect(component).toContain("stopTickHeight = stopDotR * 2");
    expect(component).toContain("stopTick ? (");
  });

  it("the seat: the listen view passes stopTick with tipTick", () => {
    expect(listen).toContain("tipTick stopTick");
  });
});

// ─── (2) Wavy ⟺ playing ─────────────────────────────────────────────────────

describe("v549 wavy progress — the seat rule (source)", () => {
  it("the listen view stills the bar unless a morph is running or the audio is playing", () => {
    expect(listen).toContain("still={morphing || !playing}");
  });

  it("the finished state is a not-playing state: devotionalEnded requires !playing", () => {
    const at = player.indexOf("export function devotionalEnded");
    expect(at).toBeGreaterThan(-1);
    const body = player.slice(at, at + 220);
    expect(body).toContain("!s.playing");
    expect(body).toContain("s.positionSec >= s.durationSec - 0.25");
  });
});

describe("v549 wavy progress — wavy only while playing (behaviour)", () => {
  it("paused (still): the travel loop never starts, and a seek applies instantly with no sweep", async () => {
    const r = await renderBar({ still: true, tipTick: true, stopTick: true });
    expect(rig.loopStarts).toBe(0);
    await updateBar(r, { still: true, tipTick: true, stopTick: true, value: 0.8 });
    expect(rig.sweepStarts).toBe(0);
    expect(rig.loopStarts).toBe(0);
    expect(fillWindowWidth(r)).toBeCloseTo(0.8 * WIDTH, 6);
  });

  it("playing: the travel loop runs, and a value change sweeps", async () => {
    const r = await renderBar({ tipTick: true, stopTick: true });
    expect(rig.loopStarts).toBe(1);
    await updateBar(r, { tipTick: true, stopTick: true, value: 0.8 });
    expect(rig.sweepStarts).toBe(1);
    expect(fillWindowWidth(r)).toBeCloseTo(0.8 * WIDTH, 6);
  });

  it("resume from pause: the wave resumes; pausing again parks the loop", async () => {
    const r = await renderBar({ still: true, tipTick: true, stopTick: true });
    expect(rig.loopStarts).toBe(0);
    await updateBar(r, { tipTick: true, stopTick: true });
    expect(rig.loopStarts).toBe(1);
    await updateBar(r, { still: true, tipTick: true, stopTick: true });
    expect(rig.loopStops).toBeGreaterThanOrEqual(1);
    expect(rig.loopStarts).toBe(1);
  });

  it("finished (still at value 1): the bar rests flat at its final progress, loop parked", async () => {
    const r = await renderBar({ still: true, value: 1, tipTick: true, stopTick: true });
    expect(rig.loopStarts).toBe(0);
    expect(fillWindowWidth(r)).toBeCloseTo(WIDTH, 6);
    const ds = paths(r).map((p) => p.props.d as string);
    expect(ds.length).toBeGreaterThan(0);
    for (const d of ds) {
      const ys = pathYs(d);
      expect(ys.length).toBeGreaterThan(10);
      for (const y of ys) expect(y).toBe(geo.canvasHeight / 2);
    }
  });

  it("the control: playing at value 1, the path is a wave, not a line", async () => {
    const r = await renderBar({ value: 1, tipTick: true, stopTick: true });
    const ys = pathYs(paths(r)[0].props.d as string);
    const cy = geo.canvasHeight / 2;
    expect(Math.min(...ys)).toBeLessThan(cy);
    expect(Math.max(...ys)).toBeGreaterThan(cy);
  });
});
