// ─── v482 — hotfix: v481 crashed on launch ─────────────────────────
// The babel transform told the story: the worklets plugin left
// familyPourFront a PLAIN JS function captured into the
// useDerivedValue worklet's closure (its code string destructures
// `familyPourFront` out of `this.__closure`). A plain function
// cannot execute on the UI thread, so the derived front could
// never be produced; every household row faulted on its first
// frame and the app died opening — the People tab is the launch
// tab, and v480 (no derived value, no external call from any
// worklet anywhere in the app) opened fine.
//
// The fix, pinned here so it cannot silently regress:
//  · familyPourFront carries the 'worklet' directive as its first
//    statement, so the plugin workletizes it and the UI thread
//    can run it.
//  · The geometry is fail-safe at its boundary: unmeasured,
//    negative, NaN or infinite inputs can only produce finite,
//    non-negative outputs, and the unmeasured frame is exactly
//    the static card.
//  · The open-at-rest window style omits the height key entirely
//    (never `height: undefined` for Reanimated 4 to apply).
//  · No ref is written during render in FamilyGroupUnit; the
//    panel cache is an effect-kept one-render bridge, and the
//    render always prefers the current panel element.
//  · The unit's hooks are unconditional — every hook call sits
//    above the component's return.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

// Same stand-asides as the v481 pins: the geometry under test is
// pure; the RN / Reanimated shells are not under test here.
vi.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
    absoluteFillObject: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  },
}));
vi.mock("react-native-reanimated", () => ({
  default: { View: "View", Text: "Text" },
  Easing: { bezier: () => ({}) },
  interpolateColor: () => "#FFFFFF",
  runOnJS: (fn: (...args: unknown[]) => void) => fn,
  useAnimatedStyle: () => ({}),
  useDerivedValue: () => ({ value: 0 }),
  useSharedValue: () => ({ value: 0 }),
  withTiming: () => ({}),
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

import { familyPourGeometry } from "@/components/family-pour";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const pour = read("components/family-pour.tsx");
const frontFn = pour.slice(pour.indexOf("export function familyPourGeometry"), pour.indexOf("export function FamilyGroupUnit"));
const unit = pour.slice(pour.indexOf("export function FamilyGroupUnit"), pour.indexOf("export function FamilyPourFill"));

describe("v482 — the pour geometry is a worklet, and fail-safe at its boundary", () => {
  it("the 'worklet' directive is the function's first statement (the launch-crash fix)", () => {
    // v486 re-pin: the geometry's name, as renamed by the port —
    // the directive discipline this test exists to guard is
    // unchanged (and re-proven against the real babel transform
    // in the v486 build: familyPourGeometry.__workletHash
    // 2297146073286, no closure capture).
    expect(frontFn).toMatch(/export function familyPourGeometry\([^)]*\)[^{]*\{\s*\n(\s*\/\/[^\n]*\n)*\s*"worklet";/);
  });

  // v486 re-pin (applies to this whole describe): the geometry
  // reports { windowHeight, fillHeight, faceFillFrac } now — the
  // mockup's three lines. The static frames these literals pin
  // are the same frames: closed stands filled (window 0, the
  // fraction 1), open stands drained (window at the panel's full
  // height where measured, fill 0).
  it("the pre-measure frame is exactly the static card: closed stands filled, open stands drained", () => {
    expect(familyPourGeometry(1, 0, 0)).toEqual({ windowHeight: 0, fillHeight: 0, faceFillFrac: 1 });
    expect(familyPourGeometry(0, 0, 0)).toEqual({ windowHeight: 0, fillHeight: 0, faceFillFrac: 0 });
  });

  it("a non-finite pour falls back to the drained, measured-nothing state", () => {
    const g = familyPourGeometry(Number.NaN, 62, 300);
    expect(g).toEqual({ windowHeight: 300, fillHeight: 0, faceFillFrac: 0 });
    expect(familyPourGeometry(Number.POSITIVE_INFINITY, 62, 300).faceFillFrac).toBe(0);
  });

  it("negative and non-finite measures are treated as unmeasured", () => {
    expect(familyPourGeometry(0.5, -10, -20)).toEqual({ windowHeight: 0, fillHeight: 0, faceFillFrac: 0.5 });
    expect(familyPourGeometry(1, Number.NaN, Number.NaN)).toEqual({ windowHeight: 0, fillHeight: 0, faceFillFrac: 1 });
    expect(familyPourGeometry(0.75, Number.POSITIVE_INFINITY, 300)).toEqual({ windowHeight: 75, fillHeight: 56.25, faceFillFrac: 0.75 });
  });

  it("no input state can produce a negative, NaN or infinite output", () => {
    const pours = [Number.NaN, -1, 0, 0.25, 0.5, 0.75, 1, 2, Number.POSITIVE_INFINITY];
    const measures = [Number.NaN, -5, 0, 62, 300, Number.POSITIVE_INFINITY];
    for (const p of pours) {
      for (const h of measures) {
        for (const pn of measures) {
          const g = familyPourGeometry(p, h, pn);
          for (const value of [g.windowHeight, g.fillHeight, g.faceFillFrac]) {
            expect(Number.isFinite(value)).toBe(true);
            expect(value).toBeGreaterThanOrEqual(0);
          }
          expect(g.faceFillFrac).toBeLessThanOrEqual(1);
          // v486 re-pin: the closing identity is the port's two
          // lines, computed from the sanitized inputs — the
          // window is the panel travelling (1 − q), the fill the
          // bottom q of the current height. (The v485 partition
          // identity it replaces encoded the segment law.)
          const sp = typeof p === "number" && Number.isFinite(p) ? p : 0;
          const q = Math.min(1, Math.max(0, sp));
          const sh = typeof h === "number" && Number.isFinite(h) ? Math.max(0, h) : 0;
          const spn = typeof pn === "number" && Number.isFinite(pn) ? Math.max(0, pn) : 0;
          const window = spn * (1 - q);
          expect(g.windowHeight).toBeCloseTo(window, 6);
          expect(g.fillHeight).toBeCloseTo(q * (sh + window), 6);
        }
      }
    }
  });

  it("undefined measures (cast in, as a hostile caller would) still yield the static frame", () => {
    const g = familyPourGeometry(1, undefined as unknown as number, undefined as unknown as number);
    expect(g).toEqual({ windowHeight: 0, fillHeight: 0, faceFillFrac: 1 });
  });
});

describe("v482 — the unit cannot hand Reanimated an invalid style or a torn render", () => {
  it("the open-at-rest window omits the height key — `height: undefined` never appears", () => {
    expect(pour).not.toContain("height: undefined");
    expect(unit).toContain("if (pour.value === 0) return {};");
  });

  it("no ref is written during render: the panel cache is written inside an effect", () => {
    // The render-scope line (two-space indent, as v481 shipped it) is gone;
    // the same assignment survives only at effect depth (four-space indent).
    expect(unit).not.toContain("\n  if (panel) heldPanelRef.current = panel;");
    expect(unit).toContain("\n    if (panel) heldPanelRef.current = panel;");
    expect(unit).not.toContain("\n  expandedRef.current = expanded;");
  });

  it("the render prefers the current panel element; the cache is only the fold's bridge", () => {
    // v483 re-pin: the preference is now a FALSY fallback, not a
    // nullish one — the composition passes `false` for a collapsed
    // group, and `??` never fell back for it, so a closing group
    // lost its members in the render the fold began (device:
    // closes folded empty). Same discipline, corrected operator:
    // current panel when there is one, the cached copy otherwise.
    expect(unit).toContain("const renderedPanel = panel ? panel : heldPanelRef.current;");
    expect(unit).toContain("{renderedPanel}");
  });

  it("every hook in FamilyGroupUnit is unconditional — all hook calls sit above the return", () => {
    const returnAt = unit.indexOf("\n  return (");
    expect(returnAt).toBeGreaterThan(0);
    // v491 re-pin (the hook list only): "useRef(" loses its
    // paren because v491 removed expandedRef — the unit's only
    // bare-paren ref call, which existed solely to serve the
    // deleted completion handoff; the remaining ref
    // (heldPanelRef) is written with its generic, useRef<...>.
    // The pin's substance is unchanged: every hook call in the
    // unit is found, and every one sits above the return.
    for (const hook of ["useSharedValue(", "useState(", "useRef", "useEffect(", "useDerivedValue(", "useAnimatedStyle("]) {
      let at = unit.indexOf(hook);
      expect(at).toBeGreaterThan(-1);
      while (at !== -1) {
        expect(at).toBeLessThan(returnAt);
        at = unit.indexOf(hook, at + 1);
      }
    }
    // And no conditional return stands between the hooks and the JSX.
    expect(unit.slice(0, returnAt)).not.toContain("return null");
  });
});
