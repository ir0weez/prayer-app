// ─── v486 — The Pour, ported from the mockup's own source ──────
// ─── v487 — the progress block goes home (Jonathan's rulings,
// Nov 9, 22:42–22:43): "that wavy line is now always there... I
// didn't ask for that... It can just appear when the group is
// open." And: the cards "feel huge now... bigger than they used
// to be", and "the grouped contacts should be nearly overlapping
// other grouped contacts."
//
// What v487 changes, and what this file now pins:
//  · The Classic progress block ("x of y prayed today" + pct +
//    wavy thread) leaves the FACE and returns to the TOP of the
//    Classic panel, restoring the pre-v486 (v485) panel
//    composition: progress + member rows + Mark as Complete,
//    rendered PLAIN (standing Text + WavyProgress — no
//    FamilyPourText / FamilyPourWave colour-flip consumers), so
//    it folds with the panel window and is covered by the rising
//    fill exactly like the member rows. The face is header-only
//    again (faces + name + meta + chevron), and the two v486
//    compensating paddings revert: panel paddingTop 2 → 20 (the
//    v485 value), and the face loses the progress block's
//    paddingBottom 18 with the block itself.
//  · The geometry law is v486's, unchanged — only the inputs'
//    MEANING is restored: H is the header height ONLY (the
//    face's onLayout measure shrinks back to the head row) and
//    P is the FULL panel height INCLUDING the progress block
//    (the off-flow seat measures the whole panel again):
//       windowHeight = P × (1 − q)
//       fillHeight   = q × (H + windowHeight)
//       faceFillFrac = clamp((fillHeight − windowHeight) / H, 0, 1)
//    Pinned below at H = 62 (the head row: 12 + 38 + 12) and
//    P = 360 (progress 46 + members/complete 160 + 154).
//  · Inter-group spacing: measured against the pre-pour build
//    (v480, 338085a) it never changed — ROSTER_HOUSEHOLD_GAP 9,
//    panel marginTop −14 / marginBottom 10, section margins
//    20/9, personCard marginBottom 8 + gapBoost — so v487
//    changes none of it; the "huge / spaced-out" read came from
//    the taller closed faces, which the block's move home fixes.
//
// Failing-first: run against v486, the source pins below fail on
// placement — the progress block sits in renderFamilyCard's
// Classic card (testID family-pour-progress, FamilyPourText
// variant "progress", FamilyPourWave, paddingBottom 18) and the
// Classic panel's paddingTop reads 2 with no progress block in
// it. (The harness geometry passes on either build by design:
// the law is one function; what v487 restores is what H and P
// MEASURE, and the composition the numbers describe.)
//
// v486's own record, kept: the mockup (group-motion-concepts
// -v1.html, Concept 1) runs two CSS transitions off one state
// flip, on the same .55s cubic-bezier(.2,0,0,1), concurrent from
// t=0 — .mwrap folds grid-template-rows 0fr↔1fr (the window is
// the panel's own height travelling (1 − q)) while .fill, one
// absolute layer behind the whole card under a clip-path
// percentage, always occupies the bottom q of the card's CURRENT
// height as it folds. v486 seated the mockup's .prog in the
// card; Jonathan's ruling above overrides that one placement —
// the MOTION is the mockup's, the progress block's seat is his.
//
// ─── v489 — the one-card rebuild ───────────────────────────────
// Device verdict on v487: the card DESIGN was wrong (stacked
// surfaces → scallops at rest, a detached sheet when open).
// v489 makes the composition match the mockup's structure: the
// group unit's root is the single card, the fill runs
// full-bleed under its outline, the face is the head row alone
// (no wrapper, no interior fill), and the panel is content
// inside the card (no sheet). The geometry pins in this file
// are untouched — the law never changed; what H and P measure
// now stands inside one outline instead of three. The two
// composition pins that named the old surfaces are re-pinned
// below with their reasons; people-v489-one-card.test.tsx
// carries the one-surface tree pins, failing on v488 first.

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

// family-pour.tsx imports the wavy thread (FamilyPourWave wears
// WavyProgress), which imports react-native-svg — stubbed with
// inert stand-ins, the wavy-progress-v339 pattern. The wave
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
// v487: H is the header ONLY (the head row's 62) — v486's H of
// 130 folded the progress block's height into the face measure.
const HEADER_H = 62;
// v487: P is the FULL panel, progress block included: the
// block's 46 (its seat at the panel's top, under paddingTop 20)
// + 160 + 154 of members and Mark as Complete.
const PANEL_H = 360;
const PROGRESS_H = 46;

/** A probe inside the face that surfaces the context's face
 * fraction as a readable style height (the harness's animated
 * styles evaluate eagerly at render). */
function FracProbe() {
  const ctx = useContext(FamilyPourContext);
  const style = useAnimatedStyle(() => ({ height: ctx ? ctx.faceFillFrac.value : -1 }));
  return <View testID="frac-probe" style={style} />;
}

/** The face stub: the header ALONE (v487) — faces, name, meta,
 * chevron; no progress block rides in it anymore. */
const header = (
  <View testID="stub-header" style={{ height: HEADER_H }}>
    <FracProbe />
  </View>
);
/** The panel stub (v487): the progress block at its TOP, then
 * the member rows and Mark as Complete — 46 + 160 + 154 = 360,
 * the whole of which the seat measures into P. */
const panelContent = (
  <View testID="panel-root">
    <View testID="family-pour-progress" style={{ height: PROGRESS_H }} />
    <View style={{ height: 160 }} />
    <View style={{ height: 154 }} />
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

describe("v487 — the mockup's geometry, header-only H, progress-inclusive P (familyPourGeometry)", () => {
  const H = HEADER_H;
  const P = PANEL_H;

  it("rest states: open stands full and empty of colour; closed is header-only, filled", () => {
    expect(familyPourGeometry(0, H, P)).toEqual({ windowHeight: P, fillHeight: 0, faceFillFrac: 0 });
    // Closed: the unit is the header alone, so the fill is the
    // HEADER's 62 — not v486's 130 (header + progress).
    expect(familyPourGeometry(1, H, P)).toEqual({ windowHeight: 0, fillHeight: H, faceFillFrac: 1 });
  });

  it("q = 0.25: window 270, fill 83, the face not yet reached", () => {
    const g = familyPourGeometry(0.25, H, P);
    expect(g.windowHeight).toBeCloseTo(270, 6);
    expect(g.fillHeight).toBeCloseTo(83, 6);
    expect(g.faceFillFrac).toBe(0);
  });

  it("q = 0.5: window 180, fill 121, the face not yet reached", () => {
    const g = familyPourGeometry(0.5, H, P);
    expect(g.windowHeight).toBeCloseTo(180, 6);
    expect(g.fillHeight).toBeCloseTo(121, 6);
    expect(g.faceFillFrac).toBe(0);
  });

  it("q = 0.75: window 90, fill 114, the fill has climbed 24/62 into the header", () => {
    const g = familyPourGeometry(0.75, H, P);
    expect(g.windowHeight).toBeCloseTo(90, 6);
    expect(g.fillHeight).toBeCloseTo(114, 6);
    expect(g.faceFillFrac).toBeCloseTo(24 / 62, 6);
  });

  it("the three lines hold across the whole travel, for two header heights", () => {
    for (const h of [62, 130]) {
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

describe("v487 — the structure, rendered: progress in the panel, header-only face", () => {
  it("closing: at mid-flight frames the window and the ONE fill read off the same q (H = 62, P = 360)", () => {
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

    // 550ms clock, linear in the rig: 137.5ms steps land exactly
    // on q 0.25, 0.5, 0.75.
    const samples: { stepMs: number; window: number; fill: number; frac: number }[] = [
      { stepMs: 137.5, window: 270, fill: 83, frac: 0 },
      { stepMs: 137.5, window: 180, fill: 121, frac: 0 },
      { stepMs: 137.5, window: 90, fill: 114, frac: 24 / 62 },
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
      // The members — and the progress block riding at the
      // panel's top — are still mounted: they are what folds.
      expect(panelCopies(r).length).toBeGreaterThanOrEqual(1);
      expect(
        win!.findAll((n) => n.props.testID === "family-pour-progress").length,
      ).toBeGreaterThanOrEqual(1);
    }

    // v491 re-pin: through v490 the close completed here and the
    // panel unmounted (the v483 lifecycle's completion
    // handoff). The smoothing pass keeps the panel mounted for
    // the life of the row — the window stands at height 0 with
    // the members inside it — so the next open pays no remount.
    // The frames above, this test's substance, are unchanged.
    act(() => {
      rig.stepAll(137.5);
    });
    act(() => {
      r.update(element());
    });
    expect(panelCopies(r).length).toBeGreaterThanOrEqual(1);
    expect(styleHeight(byTestID(r, "family-pour-window"))).toBe(0);
  });

  it("tree order is the mockup's paint order: window, then the fill, then the face — and the progress rides in the window, never in the face", () => {
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
    // (a) The progress block renders inside the panel/window
    // subtree — it folds with the panel and the rising fill
    // covers it like the member rows (v487; v486 kept it in the
    // face, always showing — the placement Jonathan overruled).
    expect(
      win!.findAll((n) => n.props.testID === "family-pour-progress").length,
    ).toBeGreaterThanOrEqual(1);
    expect(order.indexOf("family-pour-progress")).toBeLessThan(fillAt);
    // (b) The face's rendered content set excludes the progress
    // row entirely: the header alone — its only testID'd
    // descendants are the stub header and the fraction probe.
    expect(face!.findAll((n) => n.props.testID === "family-pour-progress")).toHaveLength(0);
    const faceIDs: string[] = [];
    for (const child of elementChildren(face!)) collectTestIDs(child, faceIDs);
    expect(faceIDs).toEqual(["stub-header", "frac-probe"]);
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
    expect(styleHeight(byTestID(r, "family-pour-fill"))).toBeCloseTo(121, 1);
    expect(styleHeight(byTestID(r, "frac-probe"))).toBeCloseTo(0, 3);
  });
});

describe("v486/v487 — source pins: the port's shape, the block's seat", () => {
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

  it("v487 re-pin, v489 re-pin: the Classic FACE is header-only — the progress block, its flip consumers and its paddingBottom 18 have left the card; v489 takes the card wrapper and the interior fill too", () => {
    // v486 pinned this block INSIDE the card; Jonathan overruled
    // that seat ("I didn't ask for that... It can just appear
    // when the group is open"), so the pin flips: the face's
    // content set is faces + name + meta + chevron, nothing else.
    const familyCard = indexSrc.slice(
      indexSrc.indexOf("const renderFamilyCard"),
      indexSrc.indexOf("const renderExpandedFamily"),
    );
    const classic = familyCard.slice(
      familyCard.indexOf("if (!isSkinned) {"),
      familyCard.indexOf("<ReAnimated.View key={familyId}"),
    );
    expect(classic).not.toContain('testID="family-pour-progress"');
    expect(classic).not.toContain("FamilyPourWave");
    expect(classic).not.toContain('variant="progress"');
    expect(classic).not.toContain("prayed today</FamilyPourText>");
    // The v486 compensating padding dies with the block.
    expect(classic).not.toContain("paddingBottom: 18");
    // What the face keeps: the head row and its two flips.
    expect(classic).toContain('<FamilyPourText variant="name"');
    expect(classic).toContain('<FamilyPourText variant="meta"');
    // v489 re-pin: the interior FamilyPourFill leaves the face —
    // the group is one card now and the unit's single fill
    // paints the face region directly; a second fill inside the
    // face would double-paint the same pixels.
    expect(classic).not.toContain("<FamilyPourFill");
    expect(classic).toContain("<FamilyChevron");
  });

  it("v487 re-pin, v489 re-pin: the Classic PANEL opens with the progress block, rendered plain — and v489 strips its sheet (no paddingTop, no tuck, no trailing margin)", () => {
    // v486 pinned the block OUT of the panel ("members + Mark as
    // Complete only"); v487 restores the pre-v486 composition:
    // progress row + wavy thread at the panel's top, then the
    // member rows, then Mark as Complete — plain standing
    // components, no pour colour-flip consumers on the block.
    const expandedFamily = indexSrc.slice(
      indexSrc.indexOf("const renderExpandedFamily"),
      indexSrc.indexOf("const renderPeopleSectionRow"),
    );
    const classicPanel = expandedFamily.slice(
      expandedFamily.indexOf("if (!isSkinned) {"),
      expandedFamily.indexOf("</FamilyPanel>") + "</FamilyPanel>".length,
    );
    expect(classicPanel).toContain('testID="family-pour-progress"');
    expect(classicPanel).toContain("} of {familyMembers.length} prayed today</Text>");
    expect(classicPanel).toContain("<WavyProgress");
    expect(classicPanel).not.toContain("FamilyPourText");
    expect(classicPanel).not.toContain("FamilyPourWave");
    expect(classicPanel).toContain("Mark as Complete");
    // The block stands at the panel's TOP: it precedes the
    // member rows and the completion door.
    expect(classicPanel.indexOf('testID="family-pour-progress"')).toBeLessThan(
      classicPanel.indexOf("renderMemberRow(member, false)"),
    );
    expect(classicPanel.indexOf('testID="family-pour-progress"')).toBeLessThan(
      classicPanel.indexOf("Mark as Complete"),
    );
    // (d) v487 pinned paddingTop 20 here (the v486 compensation
    // reverted, clearing the −14 tuck). v489 re-pin: the sheet
    // is gone entirely — there is no tuck to clear and no sheet
    // to pad, so the panel's only outerStyle is the content's
    // bottom padding, worn inside the one card and measured
    // into the panel height like everything else in it.
    expect(classicPanel).toContain("<FamilyPanel outerStyle={{ paddingBottom: 14 }}>");
    expect(classicPanel).not.toContain("paddingTop: 20");
    expect(classicPanel).not.toContain("marginTop: -14");
    expect(classicPanel).not.toContain("marginBottom: 10");
    // The wave now renders twice in the panel renderer: the
    // Classic panel's restored block and the skinned panel's own
    // progress row, untouched.
    expect(expandedFamily.match(/<WavyProgress/g)).toHaveLength(2);
  });
});
