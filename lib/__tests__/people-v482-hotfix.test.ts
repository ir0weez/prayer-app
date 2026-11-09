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

import { familyPourFront } from "@/components/family-pour";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const pour = read("components/family-pour.tsx");
const frontFn = pour.slice(pour.indexOf("export function familyPourFront"), pour.indexOf("export function FamilyGroupUnit"));
const unit = pour.slice(pour.indexOf("export function FamilyGroupUnit"), pour.indexOf("export function FamilyPourFill"));

describe("v482 — familyPourFront is a worklet, and fail-safe at its boundary", () => {
  it("the 'worklet' directive is the function's first statement (the launch-crash fix)", () => {
    expect(frontFn).toMatch(/export function familyPourFront\([^)]*\)[^{]*\{\s*\n(\s*\/\/[^\n]*\n)*\s*"worklet";/);
  });

  it("the pre-measure frame is exactly the static card: closed stands filled, open stands drained", () => {
    expect(familyPourFront(1, 0, 0)).toEqual({ panelWindowHeight: 0, panelFillHeight: 0, headerFillFrac: 1 });
    expect(familyPourFront(0, 0, 0)).toEqual({ panelWindowHeight: 0, panelFillHeight: 0, headerFillFrac: 0 });
  });

  it("a non-finite pour falls back to the drained, measured-nothing state", () => {
    const front = familyPourFront(Number.NaN, 62, 300);
    expect(front).toEqual({ panelWindowHeight: 300, panelFillHeight: 0, headerFillFrac: 0 });
    expect(familyPourFront(Number.POSITIVE_INFINITY, 62, 300).headerFillFrac).toBe(0);
  });

  it("negative and non-finite measures are treated as unmeasured", () => {
    expect(familyPourFront(0.5, -10, -20)).toEqual({ panelWindowHeight: 0, panelFillHeight: 0, headerFillFrac: 0.5 });
    expect(familyPourFront(1, Number.NaN, Number.NaN)).toEqual({ panelWindowHeight: 0, panelFillHeight: 0, headerFillFrac: 1 });
    expect(familyPourFront(0.75, Number.POSITIVE_INFINITY, 300).headerFillFrac).toBe(0.75);
  });

  it("no input state can produce a negative, NaN or infinite output", () => {
    const pours = [Number.NaN, -1, 0, 0.25, 0.5, 0.75, 1, 2, Number.POSITIVE_INFINITY];
    const measures = [Number.NaN, -5, 0, 62, 300, Number.POSITIVE_INFINITY];
    for (const p of pours) {
      for (const h of measures) {
        for (const pn of measures) {
          const front = familyPourFront(p, h, pn);
          for (const value of [front.panelWindowHeight, front.panelFillHeight, front.headerFillFrac]) {
            expect(Number.isFinite(value)).toBe(true);
            expect(value).toBeGreaterThanOrEqual(0);
          }
          expect(front.headerFillFrac).toBeLessThanOrEqual(1);
          expect(front.panelFillHeight).toBeLessThanOrEqual(front.panelWindowHeight);
        }
      }
    }
  });

  it("undefined measures (cast in, as a hostile caller would) still yield the static frame", () => {
    const front = familyPourFront(1, undefined as unknown as number, undefined as unknown as number);
    expect(front).toEqual({ panelWindowHeight: 0, panelFillHeight: 0, headerFillFrac: 1 });
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
    expect(unit).toContain("{panel ?? heldPanelRef.current}");
  });

  it("every hook in FamilyGroupUnit is unconditional — all hook calls sit above the return", () => {
    const returnAt = unit.indexOf("\n  return (");
    expect(returnAt).toBeGreaterThan(0);
    for (const hook of ["useSharedValue(", "useState(", "useRef(", "useEffect(", "useDerivedValue(", "useAnimatedStyle("]) {
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
