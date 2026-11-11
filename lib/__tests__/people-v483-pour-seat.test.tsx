// ─── v483 — the Pour's seat: groups must actually open ─────────────
// Device verdict on v482 (Jonathan, Nov 9, with screenshot): the
// app opens again, but tapping a closed household group does NOT
// open it — the header flips (the fill drains, the card turns
// white, the chevron rotates up; his Roberts Family stands
// open-dressed) yet no member panel ever appears beneath it. And
// on a closed, colour-filled card the chevron is barely visible.
//
// THE OPEN FAILURE — the seat, settled from the code:
// The panel window's height is a pure function of panelHeight
// (familyPourFront: window = (1 − pour) × panelHeight), and v481
// measured panelHeight from a View sitting IN NORMAL FLOW INSIDE
// that very window (the seat v481's header comment borrowed from
// the v262 queue tray). The loop is closed: the window's height
// derives from a measurement the window itself constrains. On the
// panel's first frame the window stands at height 0 (pour = 1,
// panelHeight = 0); under Yoga a subtree measured inside a
// definite-height ancestor is measured AT MOST that height, so the
// measuring View reports the constrained box — 0 — and no term
// anywhere in the system ever injects the panel's natural height
// from outside the loop. The pair (window, measurement) sits at
// its fixed point, 0, for the whole gesture — and on device the
// panel never appeared at rest either. The panel subtree is NOT
// the culprit: FamilyPanel and everything under it (member rows,
// WavyProgress, avatars) sizes from content only — no flex, no
// height:'100%', no animated style reaches up for the window's
// height — and the same subtree rendered fine for weeks in v367's
// windowless seat. The proven seats never close this loop: v367
// mounted the panel in plain flow with no window at all, and the
// v262 tray's window rests at AUTO height and locks only between
// two already-known heights while its content measures — its
// height is never a continuous function of an in-window measure.
//
// THE CLOSE FAILURE — proven from the same seat, no device needed:
// the composition passes `false` (not null) for a collapsed
// group's panel, and the unit rendered `{panel ?? heldPanelRef.
// current}` — `false` is not nullish, so the cached panel NEVER
// engaged: on close, the members unmounted in the same render the
// fold began, and the window folded empty.
//
// THE FIX (pinned behaviourally below): the panel's height is
// measured in an OUT-OF-FLOW seat — absolutely positioned, width-
// matched, invisible, a sibling of the window inside the unit —
// whose ancestors impose no height at all, so the natural height
// enters the system from outside the loop; and the rendered panel
// falls back to the unit's cached copy whenever the current panel
// prop is FALSY (false included), so a closing group folds WITH
// its members and unmounts only when the close completes.
// (v491: the unmount clause is superseded — the smoothing pass
// keeps the panel mounted after the fold completes; see the
// closing test's re-pin below. The seat and the falsy-cache fix
// this file exists for are unchanged.)
//
// THE HARNESS: react-test-renderer (added as a devDependency for
// this file — the suite's first client-render harness; the older
// component tests are SSR-only and cannot run effects) plus a
// layout simulation that encodes exactly the Yoga rules the seat
// turns on:
//  · a node measured under an ancestor's definite height reports
//    AT MOST that height, level by level (the AtMost rule);
//  · an absolutely-positioned (out-of-flow) node's subtree is
//    measured unconstrained by ancestors' heights;
//  · a node's content height is the sum of its in-flow children's.
// Shared values advance on a test clock (stepAll), so a gesture
// can be stopped mid-flight — where the old seat's fixed point
// and the falsy cache both show themselves.

import React from "react";
import TestRenderer, {
  act,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// The animation registry: the reanimated mock below registers a
// stepper for every running withTiming; the tests advance the
// clock by hand.
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

  // A shared value with Reanimated's assignment semantics: writing
  // a plain number sets it; writing a withTiming descriptor starts
  // an animation the test clock drives; reading gives the current
  // (possibly mid-flight) value.
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
    // Evaluated lazily on every read, like the real derived value.
    useDerivedValue: (fn: () => unknown) => ({
      get value() {
        return fn();
      },
    }),
    // Evaluated eagerly at render, like the house SSR mocks; the
    // tests re-render after stepping the clock to re-evaluate.
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
import { FamilyGroupUnit } from "@/components/family-pour";

type Inst = ReactTestInstance;

const HEADER_H = 62;
const PANEL_H = 300;

const header = <View testID="stub-header" style={{ height: HEADER_H }} />;
// A panel of known natural height: three stacked blocks, 100 +
// 120 + 80 = 300, every height content-driven (no explicit height
// on the root — it sums its children, exactly as FamilyPanel does).
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

/** The height Yoga's rules (see the header) give this node's box
 * when the ancestors above it impose `cap` (Infinity = none). */
function measuredHeight(inst: Inst, cap: number): number {
  const st = flattenStyle(inst.props.style);
  if (typeof st.height === "number") return Math.min(st.height, cap);
  let sum = 0;
  for (const child of elementChildren(inst)) {
    sum += measuredHeight(child, childCap(inst, child, cap));
  }
  return Math.min(sum, cap);
}

/** The cap a parent hands a child: out-of-flow children are
 * unconstrained; in-flow children inherit the parent's own
 * definite height when it has one, else the inherited cap. */
function childCap(parent: Inst, child: Inst, inheritedCap: number): number {
  const cst = flattenStyle(child.props.style);
  if (cst.position === "absolute") return Number.POSITIVE_INFINITY;
  const pst = flattenStyle(parent.props.style);
  if (typeof pst.height === "number") return pst.height;
  return inheritedCap;
}

/** One device layout pass: walk the tree computing every node's
 * height under its ancestors' caps, and deliver each onLayout the
 * height Yoga would report for it. */
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

/** Layout passes + re-renders until the seat reaches the fixed
 * point the device would settle at (reports feed shared values;
 * re-renders re-evaluate the animated styles that read them). */
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

function panelCopies(renderer: ReactTestRenderer): Inst[] {
  return renderer.root.findAll((n) => n.props.testID === "panel-root");
}

/** The clipping window: the overflow-hidden View that wraps a
 * panel copy (the seat that shows the members is not a window).
 * v485 re-pin: the finder is by testID now — the one-edge
 * segment is ALSO an overflow-hidden ancestor holding the panel
 * copy (it wraps the window), so the structural finder can no
 * longer tell segment from window. The lifecycle this file pins
 * is unchanged; only the mid-gesture window numbers below move
 * to the one-edge schedule.
 * v486 re-pin: the segment is gone (the unit is window / fill /
 * face now); the finder stays by testID, and the mid-gesture
 * numbers below move to the port's schedule and clock. */
function findWindow(renderer: ReactTestRenderer): Inst | undefined {
  return renderer.root.findAll((n) => n.props.testID === "family-pour-window")[0];
}

function windowHeight(win: Inst): number | undefined {
  const h = flattenStyle(win.props.style).height;
  return typeof h === "number" ? h : undefined;
}

let renderer: ReactTestRenderer | null = null;
afterEach(() => {
  renderer?.unmount();
  renderer = null;
  rig.animations.clear();
});

describe("v483 — the pour's seat (device: groups did not open; closes folded empty)", () => {
  it("opening: the panel's natural height reaches the window from outside it, and the window opens to meet it", () => {
    let expanded = false;
    const element = () => (
      <FamilyGroupUnit
        expanded={expanded}
        accent="#7C3AED"
        header={header}
        panel={expanded ? panelContent : false}
      />
    );
    act(() => {
      renderer = TestRenderer.create(element());
    });
    const r = renderer!;
    // Closed: the panel is nowhere in the tree.
    expect(panelCopies(r)).toHaveLength(0);

    expanded = true;
    act(() => {
      r.update(element());
    });
    settleLayout(r, () => r.update(element()));

    // Mid-gesture (half the clock — v486 re-pin: the clock is
    // the mockup's 550ms now, so half is 275ms): the window must
    // stand open over the members — on the v481 seat the measured
    // height fixed-pointed at 0, so the window stood at 0 here
    // and the members never seated at all.
    // v486 re-pin: the height is the port's window — the panel
    // travelling (1 − pour), the mockup's wrap folding
    // concurrently from t=0: at pour 0.5, 300 × 0.5 = 150 of the
    // panel stands. (v485's one-edge schedule read 119 here.)
    act(() => {
      rig.stepAll(275);
    });
    act(() => {
      r.update(element());
    });
    settleLayout(r, () => r.update(element()));
    const win = findWindow(r);
    expect(win).toBeTruthy();
    expect(windowHeight(win!)).toBeCloseTo(150, 0);
    expect(win!.findAll((n) => n.props.testID === "panel-root").length).toBeGreaterThanOrEqual(1);

    // The gesture completes: the window unlocks back to auto
    // height and the members stand at their natural height.
    act(() => {
      rig.stepAll(275);
    });
    act(() => {
      r.update(element());
    });
    settleLayout(r, () => r.update(element()));
    const winAtRest = findWindow(r);
    expect(winAtRest).toBeTruthy();
    expect(windowHeight(winAtRest!)).toBeUndefined();
    expect(winAtRest!.findAll((n) => n.props.testID === "panel-root").length).toBeGreaterThanOrEqual(1);
  });

  it("closing: the members stay mounted for the whole fold — and stay mounted, clipped at height 0, after it completes (v491 re-pin)", () => {
    let expanded = true;
    const element = () => (
      <FamilyGroupUnit
        expanded={expanded}
        accent="#7C3AED"
        header={header}
        panel={expanded ? panelContent : false}
      />
    );
    act(() => {
      renderer = TestRenderer.create(element());
    });
    const r = renderer!;
    settleLayout(r, () => r.update(element()));
    expect(panelCopies(r).length).toBeGreaterThanOrEqual(1);

    // The screen drops the panel in the same render the fold
    // begins — collapsed groups are passed `false`, exactly as
    // renderPeopleFamilyRow composes it. The members must still
    // be mounted: they are what folds. (On the v481 seat the
    // render's `??` never fell back for a `false` panel, so the
    // members vanished here and the window folded empty.)
    expanded = false;
    act(() => {
      r.update(element());
    });
    expect(panelCopies(r).length).toBeGreaterThanOrEqual(1);

    // Mid-fold: still mounted, inside the window at its ported
    // height (v486 re-pin: the (1 − pour) fold at pour 0.5 is
    // 150, per the opening test's note — v485's one-edge
    // rowsVisible read 119 here).
    act(() => {
      rig.stepAll(275);
    });
    act(() => {
      r.update(element());
    });
    settleLayout(r, () => r.update(element()));
    const win = findWindow(r);
    expect(win).toBeTruthy();
    expect(windowHeight(win!)).toBeCloseTo(150, 0);
    expect(win!.findAll((n) => n.props.testID === "panel-root").length).toBeGreaterThanOrEqual(1);

    // v491 re-pin: through v490 the members unmounted here, when
    // the close completed — the lifecycle's completion handoff.
    // The smoothing pass keeps the panel mounted for the life of
    // the row: the window stands at height 0, clipped, with the
    // members inside it, so the next open is a pure UI-thread
    // gesture with no remount. The v483 guarantee this test
    // exists for — the members mounted for the WHOLE fold, from
    // the cached panel — is everything above this block.
    act(() => {
      rig.stepAll(275);
    });
    act(() => {
      r.update(element());
    });
    expect(panelCopies(r).length).toBeGreaterThanOrEqual(1);
    expect(windowHeight(findWindow(r)!)).toBe(0);
  });
});
