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
// ─── v486 re-pin (this whole file) ───────────────────────────────
// Device verdict on v485: "This still isn't right! Look at the
// difference." The one-edge law above was still a derivation —
// a front schedule read off extracted frames — and it was still
// not the mockup. v486 ports the mockup file's own mechanism
// (its CSS, read directly): .mwrap folds (1 − q) of the panel
// while .fill — ONE absolute layer behind the whole card —
// stands at the bottom q of the card's CURRENT height, the two
// concurrent on the same .55s from t=0; the progress row rides
// in the face and never folds. Every pin below is re-based to
// that law (familyPourGeometry: window = P(1 − q); fill =
// q × (H + window); faceFillFrac = clamp((fill − window)/H)).
// What survives from this file's original purpose, unchanged:
// the slab can never come back — no colour stands inside the
// window, ever — and the rendered frames are asserted at
// mid-flight, where the disease lived. people-v486-pour.test.tsx
// carries the port's own failing-first pins.

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

// v486 re-pin (mock only): family-pour.tsx now imports the wavy
// thread (FamilyPourWave wears WavyProgress), which imports
// react-native-svg — stubbed inert, the wavy-progress-v339
// pattern. Nothing in this file renders the wave.
vi.mock("react-native-svg", () => {
  const Stub = () => null;
  return {
    __esModule: true,
    default: Stub,
    Circle: Stub,
    ClipPath: Stub,
    Defs: Stub,
    G: Stub,
    LinearGradient: Stub,
    Path: Stub,
    Rect: Stub,
    Stop: Stub,
  };
});

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
import { FamilyGroupUnit, FamilyPourContext, familyPourGeometry } from "@/components/family-pour";

type Inst = ReactTestInstance;

const ACCENT = "#7C3AED";
const HEADER_H = 100;
const PANEL_H = 300;

/** A probe inside the header that surfaces the context's face
 * fraction as a readable style height (the harness's animated
 * styles evaluate eagerly at render). */
function FracProbe() {
  const ctx = useContext(FamilyPourContext);
  const style = useAnimatedStyle(() => ({ height: ctx ? ctx.faceFillFrac.value : -1 }));
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
 * on the old seats too. */
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

describe("v485 — the geometry, re-pinned to the v486 port (familyPourGeometry)", () => {
  const H = HEADER_H;
  const P = PANEL_H;

  it("rest states are unchanged: open stands full and empty of colour; closed is face-only, filled", () => {
    expect(familyPourGeometry(0, H, P)).toEqual({
      windowHeight: P,
      fillHeight: 0,
      faceFillFrac: 0,
    });
    expect(familyPourGeometry(1, H, P)).toEqual({
      windowHeight: 0,
      fillHeight: H,
      faceFillFrac: 1,
    });
  });

  it("pour 0.25: the wrap has folded a quarter away; the fill is a quarter of the CURRENT height", () => {
    // v486 re-pin: window 225 (was 200 on the one-edge law);
    // fill 0.25 × (100 + 225) = 81.25 — read off the shrinking
    // height, not off a front.
    const g = familyPourGeometry(0.25, H, P);
    expect(g.windowHeight).toBe(225);
    expect(g.fillHeight).toBeCloseTo(81.25, 6);
    expect(g.faceFillFrac).toBe(0);
  });

  it("pour 0.5: window 150, fill 125 — the fill still has not reached the face", () => {
    // v486 re-pin: the one-edge law read window 100 / band 200
    // here; the port's concurrency reads the wrap's own fold and
    // the clip percentage of the current height (250).
    const g = familyPourGeometry(0.5, H, P);
    expect(g.windowHeight).toBe(150);
    expect(g.fillHeight).toBe(125);
    expect(g.faceFillFrac).toBe(0);
  });

  it("pour 0.75: a quarter of the panel still stands AND the fill has climbed over half the face", () => {
    // v486 re-pin: the frame neither phase law could say — the
    // one-edge law had the header untouched here (its front was
    // still crossing the panel); the port's fill, read off the
    // current height, is already 56.25 into the face while 75 of
    // panel stands open.
    const g = familyPourGeometry(0.75, H, P);
    expect(g.windowHeight).toBe(75);
    expect(g.fillHeight).toBeCloseTo(131.25, 6);
    expect(g.faceFillFrac).toBeCloseTo(0.5625, 6);
  });

  it("pour 0.875: window 37.5, fill 120.3125, face fraction 0.828125", () => {
    const g = familyPourGeometry(0.875, H, P);
    expect(g.windowHeight).toBeCloseTo(37.5, 6);
    expect(g.fillHeight).toBeCloseTo(120.3125, 6);
    expect(g.faceFillFrac).toBeCloseTo(0.828125, 6);
  });

  it("the two lines hold across the whole travel, for two header heights", () => {
    for (const h of [100, 62]) {
      for (let step = 0; step <= 40; step += 1) {
        const q = step / 40;
        const g = familyPourGeometry(q, h, P);
        const window = P * (1 - q);
        expect(g.windowHeight).toBeCloseTo(window, 6);
        expect(g.fillHeight).toBeCloseTo(q * (h + window), 6);
        expect(g.faceFillFrac).toBeCloseTo(
          Math.min(1, Math.max(0, (g.fillHeight - window) / h)),
          6,
        );
      }
    }
  });
});

describe("v485 — the frames, rendered (re-pinned to the v486 port)", () => {
  // 550ms clock, linear in the rig: each 137.5ms step is a
  // quarter of the travel; the last sample steps 68.75 (an
  // eighth) to pour 0.875.
  const samples: {
    pour: number;
    stepMs: number;
    window: number;
    fill: number;
    frac: number;
  }[] = [
    { pour: 0.25, stepMs: 137.5, window: 225, fill: 81.25, frac: 0 },
    { pour: 0.5, stepMs: 137.5, window: 150, fill: 125, frac: 0 },
    { pour: 0.75, stepMs: 137.5, window: 75, fill: 131.25, frac: 0.5625 },
    { pour: 0.875, stepMs: 68.75, window: 37.5, fill: 120.3125, frac: 0.828125 },
  ];

  it("closing: at every mid-flight frame the window and the ONE fill read off the same q", () => {
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
      const win = byTestID(r, "family-pour-window");
      const fill = byTestID(r, "family-pour-fill");
      expect(win, `window exists at pour ${s.pour}`).toBeTruthy();
      expect(fill, `the one fill exists at pour ${s.pour}`).toBeTruthy();
      expect(styleHeight(win!)).toBeCloseTo(s.window, 6);
      expect(styleHeight(fill!)).toBeCloseTo(s.fill, 6);
      // The face fraction rides the same q: 0 while the fill's
      // top is still inside the window's span, then the climb.
      expect(styleHeight(byTestID(r, "frac-probe"))).toBeCloseTo(s.frac, 6);
      // While rows stand, they stand inside the window.
      if (s.window > 0) {
        expect(win!.findAll((n) => n.props.testID === "panel-root").length).toBeGreaterThanOrEqual(1);
      }
    }

    // The close completes and the members unmount (v483 lifecycle).
    act(() => {
      rig.stepAll(68.75);
    });
    act(() => {
      r.update(element());
    });
    expect(panelCopies(r)).toHaveLength(0);
  });

  it("the colour never stands inside the window (the v484 slab), and the fill is the window's sibling layer, not its child", () => {
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
      rig.stepAll(275);
    });
    act(() => {
      r.update(element());
    });

    const win = findWindowDeepest(r);
    expect(win).toBeTruthy();
    // On v484 this fails here: the accent fill is an absolute
    // slab INSIDE the window, painting over the rows — the solid
    // violet block in Jonathan's recording. It still fails on any
    // shape that puts the colour inside the window's subtree.
    const accentInsideWindow = win!.findAll(
      (n) => flattenStyle(n.props.style).backgroundColor === ACCENT,
    );
    expect(accentInsideWindow).toHaveLength(0);
    // The layer that carries the colour stands outside it
    // (v486 re-pin: the ONE fill, family-pour-fill — v485's
    // in-flow band below the window is gone with the segment).
    const fill = byTestID(r, "family-pour-fill");
    expect(fill).toBeTruthy();
    expect(win!.findAll((n) => n === fill)).toHaveLength(0);
    expect(flattenStyle(fill!.props.style).backgroundColor).toBe(ACCENT);
  });

  it("opening runs the same law in reverse: mid-flight at pour 0.5 the frame is identical to closing's", () => {
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
      rig.stepAll(275);
    });
    act(() => {
      r.update(element());
    });

    // v486 re-pin: window 150 / fill 125 / frac 0 (the one-edge
    // law read segment 300 / window 100 / band 200 here).
    expect(styleHeight(byTestID(r, "family-pour-window"))).toBeCloseTo(150, 6);
    expect(styleHeight(byTestID(r, "family-pour-fill"))).toBeCloseTo(125, 6);
    expect(styleHeight(byTestID(r, "frac-probe"))).toBeCloseTo(0, 6);
    const win = byTestID(r, "family-pour-window");
    expect(win!.findAll((n) => n.props.testID === "panel-root").length).toBeGreaterThanOrEqual(1);
  });
});
