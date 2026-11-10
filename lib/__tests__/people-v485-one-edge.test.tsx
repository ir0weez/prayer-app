// ─── v485 — The Pour, rebuilt as ONE EDGE ────────────────────────
// Device verdict on v483/v484 (Jonathan, Nov 9, screen recording):
// "This is not the look we agreed to..." The parent's frame
// extraction found the miss mid-open (~2.0s): the panel window
// stands TALL and SOLID VIOLET — a colour slab with the members
// hidden behind it and one member row peeking squished at the
// slab's bottom seam. The mockup he picked (group-motion-
// concepts-v1.html, Concept 1) has exactly ONE horizontal edge in
// the panel segment: above it, real member rows; below it, solid
// colour continuous with the header's fill. Its frames show the
// composite schedule plainly: mid-close the card is still FULL
// height with the front halfway through the panel (the segment
// has NOT collapsed), and the segment collapses only while the
// header fills.
//
// THE TWO-EDGE DISEASE (v484 shape, pinned failing below):
// familyPourFront ran two schedules at once — the window folded
// (1 − pour) × P across the whole travel while the fill inside
// that window (min(front, window)) saturated at the full window
// height for most of the travel, painting the slab; and the
// header fill crossed zero at pour ≈ P/(H + 2P), filling the
// header while the panel was still a slab.
//
// THE ONE-EDGE LAW (front = pour × (H + P), from the unit's
// bottom; T = H + P):
//  · rowsVisible = clamp(P − front, 0, P) — the window IS the
//    still-visible member region, rows top-anchored, clipped at
//    the edge;
//  · segmentHeight = P while front ≤ P (Phase A: the segment
//    stands full height, rows sink into the rising edge), then
//    P × (T − front) / H for front > P (Phase B: the all-colour
//    segment collapses exactly while the header fills);
//  · colourBand = segmentHeight − rowsVisible — the colour in
//    the panel segment is the folded part itself, standing below
//    the window; rowsVisible + colourBand = segmentHeight at
//    every frame, and no colour ever stands inside the window;
//  · headerFillPx = clamp(front − P, 0, H) — the header stays
//    untouched until the front has crossed the whole panel.
// Opening is the exact reverse.
//
// The geometry pins below assert the partition at pour 0.25 /
// 0.5 / 0.75 / 0.875 (H = 100, P = 300, T = 400 — 0.75 lands
// front exactly on P, 0.875 is inside Phase B); the harness
// (v483's rig: react-test-renderer + the Yoga-rules layout
// simulation) asserts the same numbers on the rendered tree at
// mid-flight frames, that the band never lives inside the
// window, and that the header fraction stays 0 until the front
// crosses the panel. Run against v484, the geometry assertions
// fail on values (window 150 not 100 at pour 0.5; header
// fraction 0.5 not 0) and the harness assertions fail on the
// slab (an accent-filled node inside the window; no segment or
// band exists at all).

import React, { useContext } from "react";
import TestRenderer, {
  act,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const rig = vi.hoisted(() => {
  const animations = new Set<{ step: (ms: number) => void }>();
  return {
    animations,
    stepAll(ms: number) {
      for (const entry of [...animations]) entry.step(ms);
    },
  };
});

vi.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
    absoluteFillObject: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  },
}));

vi.mock("react-native-reanimated", async () => {
  const React = await import("react");

  function makeSharedValue(initial: number) {
    let current = initial;
    let anim: {
      from: number;
      to: number;
      elapsed: number;
      duration: number;
      cb?: (finished: boolean) => void;
    } | null = null;
    const entry = {
      step(ms: number) {
        if (!anim) return;
        anim.elapsed += ms;
        const t = Math.min(1, anim.elapsed / anim.duration);
        current = anim.from + (anim.to - anim.from) * t;
        if (t >= 1) {
          const cb = anim.cb;
          anim = null;
          rig.animations.delete(entry);
          if (cb) cb(true);
        }
      },
    };
    const sv: Record<string, unknown> = {};
    Object.defineProperty(sv, "value", {
      get: () => current,
      set: (v: unknown) => {
        if (v !== null && typeof v === "object" && (v as { __timing?: boolean }).__timing === true) {
          const d = v as { to: number; duration: number; cb?: (finished: boolean) => void };
          anim = { from: current, to: d.to, elapsed: 0, duration: d.duration, cb: d.cb };
          rig.animations.add(entry);
        } else {
          anim = null;
          rig.animations.delete(entry);
          current = v as number;
        }
      },
    });
    return sv;
  }

  return {
    __esModule: true,
    default: { View: "View", Text: "Text", createAnimatedComponent: (c: unknown) => c },
    View: "View",
    Text: "Text",
    createAnimatedComponent: (c: unknown) => c,
    Easing: { bezier: () => ({}) },
    interpolate: (_v: number, _i: number[], o: number[]) => o[0],
    interpolateColor: (_v: number, _r: number[], colors: string[]) => colors[0],
    Extrapolation: { CLAMP: "clamp" },
    runOnJS: (fn: (...args: unknown[]) => void) => fn,
    useSharedValue: (initial: number) => {
      const ref = React.useRef<unknown>(null);
      if (ref.current === null) ref.current = makeSharedValue(initial);
      return ref.current;
    },
    useDerivedValue: (fn: () => unknown) => ({
      get value() {
        return fn();
      },
    }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    withTiming: (to: number, config?: { duration?: number }, cb?: (finished: boolean) => void) => ({
      __timing: true,
      to,
      duration: config?.duration ?? 300,
      cb,
    }),
  };
});

import { View } from "react-native";
import { useAnimatedStyle } from "react-native-reanimated";
import { FamilyGroupUnit, FamilyPourContext, familyPourFront } from "@/components/family-pour";

type Inst = ReactTestInstance;

const ACCENT = "#7C3AED";
const HEADER_H = 100;
const PANEL_H = 300;

/** A probe inside the header that surfaces the context's header
 * fraction as a readable style height (the harness's animated
 * styles evaluate eagerly at render). */
function FracProbe() {
  const ctx = useContext(FamilyPourContext);
  const style = useAnimatedStyle(() => ({ height: ctx ? ctx.headerFillFrac.value : -1 }));
  return <View testID="frac-probe" style={style} />;
}

const header = (
  <View testID="stub-header" style={{ height: HEADER_H }}>
    <FracProbe />
  </View>
);
const panelContent = (
  <View testID="panel-root">
    <View style={{ height: 100 }} />
    <View style={{ height: 120 }} />
    <View style={{ height: 80 }} />
  </View>
);

function flattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    const out: Record<string, unknown> = {};
    for (const s of style) Object.assign(out, flattenStyle(s));
    return out;
  }
  if (style !== null && typeof style === "object") return style as Record<string, unknown>;
  return {};
}

function elementChildren(inst: Inst): Inst[] {
  return inst.children.filter((c): c is Inst => typeof c === "object" && c !== null);
}

function measuredHeight(inst: Inst, cap: number): number {
  const st = flattenStyle(inst.props.style);
  if (typeof st.height === "number") return Math.min(st.height, cap);
  let sum = 0;
  for (const child of elementChildren(inst)) {
    sum += measuredHeight(child, childCap(inst, child, cap));
  }
  return Math.min(sum, cap);
}

function childCap(parent: Inst, child: Inst, inheritedCap: number): number {
  const cst = flattenStyle(child.props.style);
  if (cst.position === "absolute") return Number.POSITIVE_INFINITY;
  const pst = flattenStyle(parent.props.style);
  if (typeof pst.height === "number") return pst.height;
  return inheritedCap;
}

function layoutPass(renderer: ReactTestRenderer): void {
  const reports: { inst: Inst; height: number }[] = [];
  const walk = (inst: Inst, cap: number) => {
    if (typeof inst.props.onLayout === "function") {
      reports.push({ inst, height: measuredHeight(inst, cap) });
    }
    for (const child of elementChildren(inst)) {
      walk(child, childCap(inst, child, cap));
    }
  };
  walk(renderer.root, Number.POSITIVE_INFINITY);
  for (const r of reports) {
    r.inst.props.onLayout({
      nativeEvent: { layout: { height: r.height, width: 400, x: 0, y: 0 } },
    });
  }
}

function settleLayout(renderer: ReactTestRenderer, rerender: () => void): void {
  for (let i = 0; i < 5; i += 1) {
    act(() => {
      layoutPass(renderer);
    });
    act(() => {
      rerender();
    });
  }
}

function byTestID(renderer: ReactTestRenderer, id: string): Inst | undefined {
  return renderer.root.findAll((n) => n.props.testID === id)[0];
}

function styleHeight(inst: Inst | undefined): number | undefined {
  if (!inst) return undefined;
  const h = flattenStyle(inst.props.style).height;
  return typeof h === "number" ? h : undefined;
}

function panelCopies(renderer: ReactTestRenderer): Inst[] {
  return renderer.root.findAll((n) => n.props.testID === "panel-root");
}

/** The clipping window, found the v483 way (overflow hidden,
 * holding a panel copy, innermost such node) so this finder runs
 * on the old seat too — the slab assertion below must be able to
 * fail on v484's tree, where the window has no testID yet. */
function findWindowDeepest(renderer: ReactTestRenderer): Inst | undefined {
  const candidates = renderer.root.findAll((n) => {
    if (n.type !== "View") return false;
    if (flattenStyle(n.props.style).overflow !== "hidden") return false;
    return n.findAll((d) => d.props.testID === "panel-root").length > 0;
  });
  return candidates.find(
    (c) => !candidates.some((o) => o !== c && c.findAll((n) => n === o).length > 0),
  );
}

let renderer: ReactTestRenderer | null = null;
afterEach(() => {
  renderer?.unmount();
  renderer = null;
  rig.animations.clear();
});

describe("v485 — the one-edge geometry (familyPourFront)", () => {
  const H = HEADER_H;
  const P = PANEL_H;
  const T = H + P;

  it("rest states are unchanged: open stands full and empty of colour; closed is header-only, filled", () => {
    expect(familyPourFront(0, H, P)).toEqual({
      panelWindowHeight: P,
      panelFillHeight: 0,
      segmentHeight: P,
      headerFillFrac: 0,
    });
    expect(familyPourFront(1, H, P)).toEqual({
      panelWindowHeight: 0,
      panelFillHeight: 0,
      segmentHeight: 0,
      headerFillFrac: 1,
    });
  });

  it("phase A at pour 0.25: the segment still stands full height; the edge has crossed a quarter of the panel", () => {
    const front = familyPourFront(0.25, H, P);
    expect(front.segmentHeight).toBe(P);
    expect(front.panelWindowHeight).toBe(200);
    expect(front.panelFillHeight).toBe(100);
    expect(front.headerFillFrac).toBe(0);
  });

  it("phase A at pour 0.5: rows 100, colour 200, segment still 300 — and the header is still untouched", () => {
    const front = familyPourFront(0.5, H, P);
    expect(front.segmentHeight).toBe(P);
    expect(front.panelWindowHeight).toBe(100);
    expect(front.panelFillHeight).toBe(200);
    // v484's schedule had the header half filled here (its fill
    // crossed zero at pour ≈ P/(H + 2P)); the one-edge law keeps
    // the header white until the front crosses the whole panel.
    expect(front.headerFillFrac).toBe(0);
  });

  it("the boundary at pour 0.75 (front exactly P): no rows left, the segment all colour at full height, header still white", () => {
    const front = familyPourFront(0.75, H, P);
    expect(front.segmentHeight).toBe(P);
    expect(front.panelWindowHeight).toBe(0);
    expect(front.panelFillHeight).toBe(P);
    expect(front.headerFillFrac).toBe(0);
  });

  it("phase B at pour 0.875: the colour segment has collapsed halfway while the header fills halfway", () => {
    const front = familyPourFront(0.875, H, P);
    expect(front.segmentHeight).toBe(150);
    expect(front.panelWindowHeight).toBe(0);
    expect(front.panelFillHeight).toBe(150);
    expect(front.headerFillFrac).toBe(0.5);
  });

  it("the partition holds across the whole travel, for two header heights", () => {
    for (const h of [100, 62]) {
      for (let step = 0; step <= 40; step += 1) {
        const pour = step / 40;
        const f = familyPourFront(pour, h, P);
        const frontPx = pour * (h + P);
        const expectedSegment = frontPx <= P ? P : (P * (h + P - frontPx)) / h;
        expect(f.panelWindowHeight + f.panelFillHeight).toBeCloseTo(f.segmentHeight, 6);
        expect(f.segmentHeight).toBeCloseTo(expectedSegment, 6);
        expect(f.panelWindowHeight).toBeCloseTo(Math.max(0, P - frontPx), 6);
        expect(f.headerFillFrac).toBeCloseTo(Math.min(1, Math.max(0, frontPx - P) / h), 6);
        if (frontPx < P) expect(f.headerFillFrac).toBe(0);
        void T;
      }
    }
  });
});

describe("v485 — the one edge, rendered (mid-flight frames)", () => {
  const samples: {
    pour: number;
    stepMs: number;
    segment: number;
    window: number;
    band: number;
    frac: number;
  }[] = [
    { pour: 0.25, stepMs: 125, segment: 300, window: 200, band: 100, frac: 0 },
    { pour: 0.5, stepMs: 125, segment: 300, window: 100, band: 200, frac: 0 },
    { pour: 0.75, stepMs: 125, segment: 300, window: 0, band: 300, frac: 0 },
    { pour: 0.875, stepMs: 62.5, segment: 150, window: 0, band: 150, frac: 0.5 },
  ];

  it("closing: at every mid-flight frame the rows region and the colour band partition the segment, on the phase schedule", () => {
    let expanded = true;
    const element = () => (
      <FamilyGroupUnit
        expanded={expanded}
        accent={ACCENT}
        header={header}
        panel={expanded ? panelContent : false}
      />
    );
    act(() => {
      renderer = TestRenderer.create(element());
    });
    const r = renderer!;
    settleLayout(r, () => r.update(element()));

    expanded = false;
    act(() => {
      r.update(element());
    });

    for (const s of samples) {
      act(() => {
        rig.stepAll(s.stepMs);
      });
      act(() => {
        r.update(element());
      });
      const segment = byTestID(r, "family-pour-segment");
      const win = byTestID(r, "family-pour-window");
      const band = byTestID(r, "family-pour-band");
      expect(segment, `segment exists at pour ${s.pour}`).toBeTruthy();
      expect(win, `window exists at pour ${s.pour}`).toBeTruthy();
      expect(band, `band exists at pour ${s.pour}`).toBeTruthy();
      expect(styleHeight(segment!)).toBeCloseTo(s.segment, 6);
      expect(styleHeight(win!)).toBeCloseTo(s.window, 6);
      expect(styleHeight(band!)).toBeCloseTo(s.band, 6);
      // The partition, on the rendered tree: rows + colour = segment.
      expect(styleHeight(win!)! + styleHeight(band!)!).toBeCloseTo(styleHeight(segment!)!, 6);
      // The header fraction rides the same front: 0 until the
      // front has crossed the whole panel (pour 0.75 here), then
      // it fills across phase B.
      expect(styleHeight(byTestID(r, "frac-probe"))).toBeCloseTo(s.frac, 6);
      // While rows stand, they stand inside the window.
      if (s.window > 0) {
        expect(win!.findAll((n) => n.props.testID === "panel-root").length).toBeGreaterThanOrEqual(1);
      }
    }

    // The close completes and the members unmount (v483 lifecycle).
    act(() => {
      rig.stepAll(62.5);
    });
    act(() => {
      r.update(element());
    });
    expect(panelCopies(r)).toHaveLength(0);
  });

  it("the colour never stands inside the window (the v484 slab), and the band is the window's sibling, not its child", () => {
    let expanded = true;
    const element = () => (
      <FamilyGroupUnit
        expanded={expanded}
        accent={ACCENT}
        header={header}
        panel={expanded ? panelContent : false}
      />
    );
    act(() => {
      renderer = TestRenderer.create(element());
    });
    const r = renderer!;
    settleLayout(r, () => r.update(element()));

    expanded = false;
    act(() => {
      r.update(element());
    });
    act(() => {
      rig.stepAll(250);
    });
    act(() => {
      r.update(element());
    });

    const win = findWindowDeepest(r);
    expect(win).toBeTruthy();
    // On v484 this fails here: the accent fill is an absolute
    // slab INSIDE the window, painting over the rows — the solid
    // violet block in Jonathan's recording.
    const accentInsideWindow = win!.findAll(
      (n) => flattenStyle(n.props.style).backgroundColor === ACCENT,
    );
    expect(accentInsideWindow).toHaveLength(0);
    // And the band that carries the colour stands outside it.
    const band = byTestID(r, "family-pour-band");
    expect(band).toBeTruthy();
    expect(win!.findAll((n) => n === band).length).toBe(0);
    expect(flattenStyle(band!.props.style).backgroundColor).toBe(ACCENT);
  });

  it("opening runs the same edge in reverse: mid-flight at pour 0.5 the frame is identical to closing's", () => {
    let expanded = false;
    const element = () => (
      <FamilyGroupUnit
        expanded={expanded}
        accent={ACCENT}
        header={header}
        panel={expanded ? panelContent : false}
      />
    );
    act(() => {
      renderer = TestRenderer.create(element());
    });
    const r = renderer!;
    expect(panelCopies(r)).toHaveLength(0);

    expanded = true;
    act(() => {
      r.update(element());
    });
    settleLayout(r, () => r.update(element()));
    act(() => {
      rig.stepAll(250);
    });
    act(() => {
      r.update(element());
    });

    expect(styleHeight(byTestID(r, "family-pour-segment"))).toBeCloseTo(300, 6);
    expect(styleHeight(byTestID(r, "family-pour-window"))).toBeCloseTo(100, 6);
    expect(styleHeight(byTestID(r, "family-pour-band"))).toBeCloseTo(200, 6);
    expect(styleHeight(byTestID(r, "frac-probe"))).toBeCloseTo(0, 6);
    const win = byTestID(r, "family-pour-window");
    expect(win!.findAll((n) => n.props.testID === "panel-root").length).toBeGreaterThanOrEqual(1);
  });
});
