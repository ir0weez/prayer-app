// ─── v486 — The Pour, ported from the mockup's own source ──────
// Device verdict on v485 (Jonathan, Nov 9): "This still isn't
// right! Look at the difference." Three builds (v481, v484, v485)
// derived the motion from frame extraction and prose; v486 does
// not derive anything — it ports the mechanism of the mockup
// file itself (group-motion-concepts-v1.html, Concept 1), read
// from its CSS:
//
//  · .gcard is position:relative, overflow:hidden. Its children:
//    .ghead (z-index 3), .prog (z-index 2), .mwrap (the folding
//    wrap), and .fill — position:absolute, inset:0, z-index 1.
//  · The .fill is ONE layer behind the whole card, clipped:
//    clip-path inset(100% 0 0 0) when open → inset(0 0 0 0) when
//    closed, transition .55s cubic-bezier(.2,0,0,1). A clip-path
//    percentage reads off the element's own CURRENT height, so
//    the fill always occupies the bottom q of the card's height
//    AS IT FOLDS — one layer, one schedule.
//  · .prog NEVER folds and is NEVER covered: it sits above the
//    fill (z-2) for the whole gesture; only its colours flip.
//    .ghead likewise (z-3). Only .mwrap's contents — the member
//    rows + Mark as Complete — fold and are covered.
//  · .mwrap folds grid-template-rows 0fr↔1fr on the SAME .55s,
//    SAME easing, CONCURRENTLY from t=0 — the window is the
//    panel's own height travelling (1 − q), not a front chasing
//    it on a second schedule.
//
// The geometry is therefore three lines off one value q (the
// existing pour shared value, 1 = closed, 0 = open):
//    windowHeight = P × (1 − q)
//    fillHeight   = q × (H + windowHeight)
//    faceFillFrac = clamp((fillHeight − windowHeight) / H, 0, 1)
// where H is the whole FACE block (header + progress) and P the
// panel's natural height (members + Mark as Complete only).
//
// Failing-first: run against v485, the geometry assertions fail
// on values — v485's familyPourFront at (q, H=130, P=360) gives
// window/fill 213/147 at q=0.3, 115/245 at q=0.5, 17/343 at
// q=0.7 (a front of q×(H+P) crossing a full-height segment),
// where this law requires 252/114.6, 180/155, 108/166.6 — and
// the structural assertions fail on the tree: v485 has an inset
// band inside a segment container, and its panel still carries
// the progress row inside the window.

import React, { useContext } from "react";
import TestRenderer, {
  act,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

// v486: family-pour.tsx now imports the wavy thread (FamilyPourWave
// wears WavyProgress), which imports react-native-svg — stubbed
// with inert stand-ins, the wavy-progress-v339 pattern. The wave
// itself is never rendered by this harness.
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
import {
  FAMILY_POUR_DURATION_MS,
  FamilyGroupUnit,
  FamilyPourContext,
  familyPourGeometry,
} from "@/components/family-pour";

type Inst = ReactTestInstance;

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const pourSrc = read("components/family-pour.tsx");
const indexSrc = read("app/(tabs)/index.tsx");
const unitSrc = pourSrc.slice(
  pourSrc.indexOf("export function FamilyGroupUnit"),
  pourSrc.indexOf("export function FamilyPourFill"),
);

const ACCENT = "#7C3AED";
const HEADER_H = 130;
const PANEL_H = 360;

/** A probe inside the face that surfaces the context's face
 * fraction as a readable style height (the harness's animated
 * styles evaluate eagerly at render). */
function FracProbe() {
  const ctx = useContext(FamilyPourContext);
  const style = useAnimatedStyle(() => ({ height: ctx ? ctx.faceFillFrac.value : -1 }));
  return <View testID="frac-probe" style={style} />;
}

/** The face stub: a 130-tall header block carrying the progress
 * block inside it — the mockup's .ghead + .prog inside .gcard. */
const header = (
  <View testID="stub-header" style={{ height: HEADER_H }}>
    <View testID="family-pour-progress" />
    <FracProbe />
  </View>
);
/** A panel of known natural height: 140 + 120 + 100 = 360. */
const panelContent = (
  <View testID="panel-root">
    <View style={{ height: 140 }} />
    <View style={{ height: 120 }} />
    <View style={{ height: 100 }} />
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

/** Depth-first document order of testIDs across the whole tree. */
function collectTestIDs(inst: Inst, out: string[]): void {
  if (typeof inst.props.testID === "string") out.push(inst.props.testID);
  for (const child of elementChildren(inst)) collectTestIDs(child, out);
}

let renderer: ReactTestRenderer | null = null;
afterEach(() => {
  renderer?.unmount();
  renderer = null;
  rig.animations.clear();
});

describe("v486 — the mockup's geometry (familyPourGeometry)", () => {
  const H = HEADER_H;
  const P = PANEL_H;

  it("rest states: open stands full and empty of colour; closed is face-only, filled", () => {
    expect(familyPourGeometry(0, H, P)).toEqual({ windowHeight: P, fillHeight: 0, faceFillFrac: 0 });
    expect(familyPourGeometry(1, H, P)).toEqual({ windowHeight: 0, fillHeight: H, faceFillFrac: 1 });
  });

  it("q = 0.3: window 252, fill 114.6, the face not yet reached", () => {
    const g = familyPourGeometry(0.3, H, P);
    expect(g.windowHeight).toBeCloseTo(252, 1);
    expect(g.fillHeight).toBeCloseTo(114.6, 1);
    expect(g.faceFillFrac).toBe(0);
  });

  it("q = 0.5: window 180, fill 155, the face not yet reached", () => {
    const g = familyPourGeometry(0.5, H, P);
    expect(g.windowHeight).toBeCloseTo(180, 1);
    expect(g.fillHeight).toBeCloseTo(155, 1);
    expect(g.faceFillFrac).toBe(0);
  });

  it("q = 0.7: window 108, fill 166.6, the fill has climbed ~0.45 into the face", () => {
    const g = familyPourGeometry(0.7, H, P);
    expect(g.windowHeight).toBeCloseTo(108, 1);
    expect(g.fillHeight).toBeCloseTo(166.6, 1);
    // The formula's value: (166.6 − 108) / 130 = 0.4508. (The
    // v486 brief quoted ≈0.544 with a 0.1 tolerance; the formula
    // value satisfies that tolerance — |0.544 − 0.4508| < 0.1 —
    // and is what the formula, and this pin, hold.)
    expect(g.faceFillFrac).toBeCloseTo(0.4508, 3);
    expect(Math.abs(g.faceFillFrac - 0.544)).toBeLessThan(0.1);
  });

  it("the three lines hold across the whole travel, for two face heights", () => {
    for (const h of [130, 62]) {
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

  it("an unmeasured panel still lets the face fill by the pour itself; a non-finite pour falls back to open", () => {
    expect(familyPourGeometry(0.5, H, 0)).toEqual({ windowHeight: 0, fillHeight: H / 2, faceFillFrac: 0.5 });
    const g = familyPourGeometry(Number.NaN, H, P);
    expect(g).toEqual({ windowHeight: P, fillHeight: 0, faceFillFrac: 0 });
  });

  it("the clock is the mockup's: 550ms on the same emphasized easing", () => {
    expect(FAMILY_POUR_DURATION_MS).toBe(550);
    expect(pourSrc).toContain("Easing.bezier(0.2, 0, 0, 1)");
  });
});

describe("v486 — the mockup's structure, rendered", () => {
  it("closing: at mid-flight frames the window and the ONE fill read off the same q", () => {
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

    // 550ms clock, linear in the rig: 165ms → q 0.3, then +110
    // → q 0.5, then +110 → q 0.7.
    const samples: { stepMs: number; window: number; fill: number; frac: number }[] = [
      { stepMs: 165, window: 252, fill: 114.6, frac: 0 },
      { stepMs: 110, window: 180, fill: 155, frac: 0 },
      { stepMs: 110, window: 108, fill: 166.6, frac: 0.4508 },
    ];
    for (const s of samples) {
      act(() => {
        rig.stepAll(s.stepMs);
      });
      act(() => {
        r.update(element());
      });
      const win = byTestID(r, "family-pour-window");
      const fill = byTestID(r, "family-pour-fill");
      expect(win, "window exists mid-flight").toBeTruthy();
      expect(fill, "the one fill exists mid-flight").toBeTruthy();
      expect(styleHeight(win!)).toBeCloseTo(s.window, 1);
      expect(styleHeight(fill!)).toBeCloseTo(s.fill, 1);
      expect(styleHeight(byTestID(r, "frac-probe"))).toBeCloseTo(s.frac, 3);
      // The members are still mounted — they are what folds.
      expect(panelCopies(r).length).toBeGreaterThanOrEqual(1);
    }

    // The close completes and the members unmount (v483 lifecycle).
    act(() => {
      rig.stepAll(165);
    });
    act(() => {
      r.update(element());
    });
    expect(panelCopies(r)).toHaveLength(0);
  });

  it("tree order is the mockup's paint order: window, then the fill, then the face — and the progress rides in the face, never in the window", () => {
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

    const order: string[] = [];
    collectTestIDs(r.root, order);
    const winAt = order.indexOf("family-pour-window");
    const fillAt = order.indexOf("family-pour-fill");
    const faceAt = order.indexOf("family-pour-face");
    expect(winAt).toBeGreaterThanOrEqual(0);
    expect(fillAt).toBeGreaterThan(winAt);
    expect(faceAt).toBeGreaterThan(fillAt);

    const win = byTestID(r, "family-pour-window");
    const fill = byTestID(r, "family-pour-fill");
    const face = byTestID(r, "family-pour-face");
    // The progress block is in the face block's subtree…
    expect(face!.findAll((n) => n.props.testID === "family-pour-progress").length).toBe(1);
    expect(order.indexOf("family-pour-progress")).toBeGreaterThan(fillAt);
    // …and never inside the folding window (v485 kept it there,
    // so it folded away and was covered — half the device miss).
    expect(win!.findAll((n) => n.props.testID === "family-pour-progress")).toHaveLength(0);
    // The fill is a sibling layer, not a child of the window:
    // no accent-coloured node lives inside the window's subtree,
    // even though the fill paints over that region on device.
    expect(win!.findAll((n) => n === fill)).toHaveLength(0);
    expect(
      win!.findAll((n) => flattenStyle(n.props.style).backgroundColor === ACCENT),
    ).toHaveLength(0);
    expect(flattenStyle(fill!.props.style).backgroundColor).toBe(ACCENT);
    expect(flattenStyle(fill!.props.style).position).toBe("absolute");
  });

  it("opening runs the same law in reverse: mid-flight at q 0.5 the frame matches closing's", () => {
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

    expect(styleHeight(byTestID(r, "family-pour-window"))).toBeCloseTo(180, 1);
    expect(styleHeight(byTestID(r, "family-pour-fill"))).toBeCloseTo(155, 1);
    expect(styleHeight(byTestID(r, "frac-probe"))).toBeCloseTo(0, 3);
  });
});

describe("v486 — source pins: the port's shape", () => {
  it("the unit carries exactly the mockup's three layers — no segment, no band, no trailing margin", () => {
    expect(unitSrc).toContain('testID="family-pour-window"');
    expect(unitSrc).toContain('testID="family-pour-fill"');
    expect(unitSrc).toContain('testID="family-pour-face"');
    expect(unitSrc).not.toContain("family-pour-segment");
    expect(unitSrc).not.toContain("family-pour-band");
    expect(pourSrc).not.toContain("FAMILY_PANEL_TRAILING_MARGIN");
    // The v485 geometry is gone as code (its name survives once,
    // in the v482 header bullet, as history).
    expect(pourSrc).not.toContain("function familyPourFront");
    expect(pourSrc).not.toContain("FamilyPourFront");
  });

  it("the Classic card carries the progress block inside the face (the mockup's .prog in .gcard)", () => {
    const familyCard = indexSrc.slice(
      indexSrc.indexOf("const renderFamilyCard"),
      indexSrc.indexOf("const renderExpandedFamily"),
    );
    const classic = familyCard.slice(
      familyCard.indexOf("if (!isSkinned) {"),
      familyCard.indexOf("<ReAnimated.View key={familyId}"),
    );
    expect(classic).toContain('testID="family-pour-progress"');
    expect(classic).toContain("} of {familyMembers.length} prayed today</FamilyPourText>");
    expect(classic).toContain("<FamilyPourWave");
  });

  it("the Classic panel is members + Mark as Complete only — the progress row and its wave have left it", () => {
    const expandedFamily = indexSrc.slice(
      indexSrc.indexOf("const renderExpandedFamily"),
      indexSrc.indexOf("const renderPeopleSectionRow"),
    );
    const classicPanel = expandedFamily.slice(
      expandedFamily.indexOf("if (!isSkinned) {"),
      expandedFamily.indexOf("</FamilyPanel>") + "</FamilyPanel>".length,
    );
    expect(classicPanel).not.toContain("WavyProgress");
    expect(classicPanel).not.toContain("prayed today</Text>");
    expect(classicPanel).not.toContain("family-pour-progress");
    expect(classicPanel).toContain("Mark as Complete");
    // The wave survives exactly once in the whole panel renderer:
    // the skinned panel's own progress row, untouched.
    expect(expandedFamily.match(/WavyProgress/g)).toHaveLength(1);
  });
});
