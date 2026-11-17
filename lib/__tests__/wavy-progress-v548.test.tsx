/**
 * v548 — the wavy bar's STILL dress (Jonathan's call, Nov 17,
 * on v547: the player collapse was "still extremely laggy —
 * is it because of the wavy line? Maybe it needs to go flat
 * as you swipe down?").
 *
 * The audit found the bar's real per-frame cost: position
 * ticks land every 250ms and each restarts the 600ms
 * JS-driven value sweep, whose listener re-renders the bar
 * and rebuilds its SVG path on every animation frame —
 * during playback the sweep effectively never rests, and it
 * ran straight through the collapse/expand morph's own
 * per-frame layout. The travel loop composited its wide
 * sliding SVG layer the whole time too.
 *
 * The `still` prop is the answer, and these pins hold it:
 *  (a) GEOMETRY — the flat dress is the same path machinery
 *      at zero amplitude: every sampled point on the
 *      centreline, the fill still the value's fraction (the
 *      progress stays truthful, it just stops waving).
 *  (b) SOURCE — while stilled, the travel loop does not run,
 *      a value change applies instantly (no sweep listener),
 *      and the component draws from the flat geometry.
 *  (c) THE SEAT — the devotional listen view wires `still`
 *      to its morph state, so the bar stills exactly while a
 *      collapse/expand morph is in flight.
 *
 * The geometry and source pins use the v339 rig's shape
 * (pure geometry exercised directly); the tick pins render
 * the bar for real behind render-capable doubles and read
 * the drawn elements.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Render-capable doubles (the v339 rig's were inert; the tick
// pins below render the bar for real): host strings for every
// element, an Animated.Value whose interpolate parks at 0, and
// timing/loop stubs that start and stop without a clock.
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
      start: (cb?: any) => cb?.({ finished: true }),
      stop: () => {},
    }),
    loop: () => ({ start: () => {}, stop: () => {} }),
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
import { devotionalShareWaveModel } from "@/lib/devotional-share";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const component = read("components/wavy-progress.tsx");
const listen = read("components/devotional-listen.tsx");

/** The y values sampled into a geometry path, in order. */
function pathYs(path: string): number[] {
  return path
    .split(" L ")
    .map((seg) => Number(seg.replace(/^M /, "").split(" ")[1]));
}

describe("v548 wavy progress — the flat dress (geometry)", () => {
  it("flat: every sampled point rides the centreline — a straight line", () => {
    const geo = wavyProgressGeometry({ width: 340, height: 14, value: 0.5, flat: true });
    const ys = pathYs(geo.path);
    expect(ys.length).toBeGreaterThan(10);
    for (const y of ys) expect(y).toBe(geo.canvasHeight / 2);
  });

  it("flat: the fill is still the value's fraction and the tip still rides its end", () => {
    const geo = wavyProgressGeometry({ width: 340, height: 14, value: 0.5, flat: true });
    expect(geo.fillWidth).toBe(170);
    expect(geo.tipCx).toBe(170);
  });

  it("flat at a taller seat: still one straight centreline", () => {
    const geo = wavyProgressGeometry({ width: 300, height: 30, value: 0.25, flat: true });
    for (const y of pathYs(geo.path)) expect(y).toBe(geo.canvasHeight / 2);
  });

  it("the control: without flat the same geometry is a wave around that centreline", () => {
    const geo = wavyProgressGeometry({ width: 340, height: 14, value: 0.5 });
    const ys = pathYs(geo.path);
    const cy = geo.canvasHeight / 2;
    expect(Math.min(...ys)).toBeLessThan(cy);
    expect(Math.max(...ys)).toBeGreaterThan(cy);
  });
});

describe("v548 wavy progress — the still contract (source)", () => {
  it("the travel loop does not run while stilled", () => {
    expect(component).toContain("if (!measured || reduceMotion || still)");
  });

  it("a value change applies instantly while stilled — no sweep listener", () => {
    expect(component).toContain("if (still) {");
    expect(component).toContain("stilled, a value change applies instantly");
  });

  it("the drawing comes from the flat geometry while stilled", () => {
    expect(component).toContain("flat: !!still");
    expect(component).toContain("args.flat ? 0");
  });

  it("the seat: the listen view stills the bar with its morph state", () => {
    // v549 RE-BASE (Nov 17): the seat's still expression grew
    // a second term — the bar is also stilled whenever the
    // audio is not playing (his "wavy only while playing"
    // call). The morph term this pin was written for stands
    // first, unchanged; the playing rule is pinned in
    // wavy-progress-v549.test.tsx.
    expect(listen).toContain("still={morphing || !playing}");
  });
});

// ─── The tick, not the dot (his other call of the morning) ──────────────────
// "can that little dot in the player be a line instead.
// Otherwise it looks like a sperm..." — the tip that rides the
// wave's head is a slim vertical tick in the player's seat:
// the dot's own height and colour, a fraction of its width.
// The track's end stop dot is a different glyph in a different
// seat and is NOT indicted — it stays a dot, here and in the
// render pins below (exactly one circle survives: the stop).
// v549 note (Nov 17, later that morning): Jonathan then
// indicted the stop dot too — "I'd like it to be a line as
// well" — for the PLAYER's seat only, via the new stopTick
// prop. These pins render seats WITHOUT stopTick, so the stop
// dot survives here exactly as pinned; the player seat's tick
// is pinned in wavy-progress-v549.test.tsx. No pin moved.

describe("v548 wavy progress — the tip tick (geometry)", () => {
  it("the tick's height is the dot's diameter; its width is slim", () => {
    const geo = wavyProgressGeometry({ width: 340, height: 14, value: 0.5 });
    expect(geo.tipTickHeight).toBeCloseTo(geo.dotR * 2, 6);
    expect(geo.tipTickWidth).toBeLessThan(geo.tipTickHeight);
    expect(geo.tipTickWidth).toBeCloseTo(Math.max(2.5, geo.dotR * 0.62), 6);
  });
});

describe("v548 wavy progress — the tip tick (rendered)", () => {
  const renderBar = async (props: Record<string, unknown>) => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        React.createElement(WavyProgress, {
          value: 0.5,
          color: "#A8150C",
          trackColor: "#3A0D08",
          height: 14,
          ...props,
        } as never),
      );
    });
    // The bar draws once it has measured a width.
    const seat = renderer.root.findByType("View" as never);
    await act(async () => {
      seat.props.onLayout({ nativeEvent: { layout: { width: 340 } } });
    });
    return renderer;
  };
  const circles = (r: ReactTestRenderer) => r.root.findAllByType("Circle" as never);
  const rects = (r: ReactTestRenderer) => r.root.findAllByType("Rect" as never);
  const geo = wavyProgressGeometry({ width: 340, height: 14, value: 0.5 });

  it("with tipTick: a slim vertical tick rides the tip, and NO circle carries the tip dot's radius", async () => {
    const r = await renderBar({ tipTick: true });
    const tick = rects(r).find(
      (el) => Math.abs(el.props.height - geo.tipTickHeight) < 0.01 && el.props.width < geo.tipTickHeight,
    );
    expect(tick, "the tick renders at the dot's height, slim").toBeTruthy();
    expect(tick!.props.fill).toBe("#A8150C");
    // The tip dot is gone; the one surviving circle is the
    // track's end stop dot, at its own smaller radius.
    for (const c of circles(r)) expect(Math.abs(c.props.r - geo.dotR)).toBeGreaterThan(0.01);
    expect(circles(r).some((c) => Math.abs(c.props.r - Math.max(1.6, geo.canvasHeight * 0.26)) < 0.01)).toBe(true);
  });

  it("the control: without tipTick the tip is the round dot it always was", async () => {
    const r = await renderBar({});
    expect(circles(r).some((c) => Math.abs(c.props.r - geo.dotR) < 0.01)).toBe(true);
    expect(
      rects(r).some((el) => Math.abs(el.props.height - geo.tipTickHeight) < 0.01 && el.props.width < geo.tipTickHeight),
    ).toBe(false);
  });

  it("the flat (stilled) dress carries the tick too — it is the tip's shape, not a motion state", async () => {
    const r = await renderBar({ tipTick: true, still: true });
    expect(
      rects(r).some((el) => Math.abs(el.props.height - geo.tipTickHeight) < 0.01 && el.props.width < geo.tipTickHeight),
    ).toBe(true);
    for (const c of circles(r)) expect(Math.abs(c.props.r - geo.dotR)).toBeGreaterThan(0.01);
  });
});

// ─── The share bar's end mark (the same call, the other surface) ────────────

describe("v548 share bar — the end dot became a tick there too", () => {
  it("the model sizes a tick, not a dot: height the old diameter, width slim", () => {
    const wave = devotionalShareWaveModel(50);
    expect(wave).not.toHaveProperty("stopDotRadius");
    expect(wave.stopTickHeight).toBeCloseTo(50 * 0.52, 6);
    expect(wave.stopTickWidth).toBeCloseTo(50 * 0.16, 6);
    expect(wave.stopTickWidth).toBeLessThan(wave.stopTickHeight);
  });

  it("the painter draws the tick as a round-capped line where the dot sat", () => {
    const painter = read(
      "modules/expo-devotional-share/android/src/main/java/expo/modules/devotionalshare/ShareCardPainter.kt",
    );
    expect(painter).not.toContain("stopDotRadius");
    expect(painter).toContain('wave?.dbl("stopTickWidth")');
    expect(painter).toContain('wave?.dbl("stopTickHeight")');
    expect(painter).toContain("canvas.drawLine(tickCx, cy - tickH / 2, tickCx, cy + tickH / 2, tickPaint)");
  });
});
