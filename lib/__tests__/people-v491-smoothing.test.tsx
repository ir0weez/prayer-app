// ─── v491 — the Pour, smoothed: no JS rides the gesture ──────────
// Device verdict on v489/v490 (Jonathan, Nov 10, screen
// recording; frames read by the parent into
// ~/workspace/pour-compare/app489/): the one-card SHAPE is right
// at rest — open and closed are single clean cards — but the
// 550ms gesture travels in a few coarse steps: the window stands
// at ~1 row in one frame and the group is fully open 0.25s
// later; mid-flight frames show the opening card's member rows
// painting over the families below and the header title doubling
// before it settles. His ask: smooth the motion. Nothing about
// the look changes.
//
// THE DIAGNOSIS (read from the code, suspects confirmed or
// cleared one by one):
//  · CLEARED — a per-frame JS bridge feeding the gesture: the
//    pour, its geometry, the window height, the fill height and
//    the text flips already live in shared values consumed only
//    through useDerivedValue/useAnimatedStyle (family-pour.tsx
//    had no useAnimatedReaction; its ONE runOnJS was the close's
//    completion handoff, below). The context carries shared
//    values only. RosterRowShell fingerprints do not change for
//    sibling rows during a gesture (only the toggled row's own
//    expanded bit flips, once, at the tap render).
//  · CLEARED — the panel mount as the whole story: repeat
//    toggles stay chunky in the recording too, so the mount
//    alone doesn't explain the travel. But the mount was being
//    paid on EVERY open (next point), not just the first.
//  · CONFIRMED — the double mount, paid per open: when a group
//    opens, the panel renders TWICE synchronously on the JS
//    thread (the window copy and the measuring-seat copy —
//    progress SVG, member rows, avatars), while the timing
//    starts at assignment: the gesture's first frames are spent
//    mounting, and the visible travel compresses into a jump.
//    And because the v481 lifecycle UNMOUNTED the panel when a
//    close completed (through that one runOnJS handoff), the
//    next open paid the double mount again. Every cycle paid it.
//  · CONFIRMED — a second clock in the header: FamilyChevron
//    spun on RN Animated's own 320ms timing (QUEUE_TRAY_
//    DURATION_MS), started from an effect — a different driver
//    and a different duration from the pour's 550ms, landing
//    ~230ms before the gesture it announces ends.
//  · NAMED, NOT REMOVED — animating an in-flow height inside
//    the roster's FlatList makes native layout reposition every
//    following cell on every frame, and the moved cards repaint
//    (each carries elevation). That cost is inherent to the
//    approved mechanism itself (the mockup's wrap folds in flow
//    and pushes what follows); it is the phone's to judge what
//    remains once the JS-side costs above are gone.
//
// THE FIX (pinned below):
//  · The panel stays mounted for the life of the row once the
//    group has been opened — the completion handoff and its
//    runOnJS bridge are deleted. A closed group stands with its
//    window at height 0, clipped by the one card (the v481 note
//    always said visibility never depended on the callback);
//    the FlatList's own windowing still unmounts the whole cell
//    when it scrolls far away, so the retention is bounded.
//    Repeat toggles are the tap render plus a pure UI-thread
//    gesture: zero remounts, zero JS per frame.
//  · The chevron's rotation reads the pour itself inside a
//    unit (closed 0deg, open 180deg, off the same shared value
//    on the UI thread); its standing RN-Animated clock remains
//    only for a chevron outside a unit (none in the app today —
//    the roster's family rows are its only seat, all in units).
//
// Failing-first: on the v490 code the lifecycle assertions fail
// (the members unmount when the close completes, and the second
// open remounts them) and the source pins fail (runOnJS present
// in the unit; the chevron slice never reads the pour for its
// rotation). The sibling-isolation and mid-flight clip pins
// pass on v490 too — they pin what the diagnosis cleared, so a
// future change can't reintroduce churn silently.

import React from "react";
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
import { FamilyGroupUnit } from "@/components/family-pour";

type Inst = ReactTestInstance;

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const pourSrc = read("components/family-pour.tsx");
const indexSrc = read("app/(tabs)/index.tsx");

const ACCENT = "#E86A17";
const ACCENT_B = "#7C3AED";
const CARD_BG = "#FFFFFF";
const CARD_STYLE = {
  backgroundColor: CARD_BG,
  borderRadius: 28,
  marginHorizontal: 12,
  marginTop: 9,
};
// The standing stub measures (v486/v489): head row 62, panel 360.
const HEADER_H = 62;
const PANEL_H = 360;

// ─── Probes ──────────────────────────────────────────────────────
// Render/mount instrumentation. The header probes count renders;
// the panel probe counts MOUNTS (its effect fires once per
// mounted copy — window + seat — so a remount is unmistakable).
const counters = {
  aHeaderRenders: 0,
  bHeaderRenders: 0,
  aPanelMounts: 0,
};

function HeaderProbeA() {
  counters.aHeaderRenders += 1;
  return <View testID="stub-header" style={{ height: HEADER_H }} />;
}
function HeaderProbeB() {
  counters.bHeaderRenders += 1;
  return <View testID="stub-header-b" style={{ height: HEADER_H }} />;
}
function PanelProbeA() {
  React.useEffect(() => {
    counters.aPanelMounts += 1;
  }, []);
  return (
    <View testID="panel-root">
      <View testID="family-pour-progress" style={{ height: 46 }} />
      <View style={{ height: 160 }} />
      <View style={{ height: 154 }} />
    </View>
  );
}

// Hoisted elements: the composition hands the unit the same
// header/panel elements across renders (the roster's memo shells
// do the equivalent on device), so a probe re-render can only
// come from the unit's own doing.
const headerAEl = <HeaderProbeA />;
const panelAEl = <PanelProbeA />;
const headerBEl = <HeaderProbeB />;

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

function byTestID(scope: Inst, id: string): Inst | undefined {
  return scope.findAll((n) => n.props.testID === id)[0];
}

function styleHeight(inst: Inst | undefined): number | undefined {
  if (!inst) return undefined;
  const h = flattenStyle(inst.props.style).height;
  return typeof h === "number" ? h : undefined;
}

let renderer: ReactTestRenderer | null = null;
afterEach(() => {
  renderer?.unmount();
  renderer = null;
  rig.animations.clear();
  counters.aHeaderRenders = 0;
  counters.bHeaderRenders = 0;
  counters.aPanelMounts = 0;
});

describe("v491 — the panel mounts once per row, and a re-open never pays the mount again", () => {
  it("open → close → open: members stay mounted through and after the fold; mounts never repeat; the sibling never stirs", () => {
    let aExpanded = false;
    const tree = () => (
      <View>
        <View testID="unit-a">
          <FamilyGroupUnit
            expanded={aExpanded}
            accent={ACCENT}
            cardStyle={CARD_STYLE}
            header={headerAEl}
            panel={aExpanded ? panelAEl : false}
          />
        </View>
        <View testID="unit-b">
          <FamilyGroupUnit
            expanded={false}
            accent={ACCENT_B}
            cardStyle={CARD_STYLE}
            header={headerBEl}
            panel={false}
          />
        </View>
      </View>
    );
    act(() => {
      renderer = TestRenderer.create(tree());
    });
    const r = renderer!;
    settleLayout(r, () => r.update(tree()));
    const unitA = () => byTestID(r.root, "unit-a")!;
    const panelCopiesA = () => unitA().findAll((n) => n.props.testID === "panel-root");

    // Never opened: no panel anywhere (the v483 starting state).
    expect(panelCopiesA()).toHaveLength(0);
    expect(counters.aPanelMounts).toBe(0);
    const bHeaderRendersAtRest = counters.bHeaderRenders;
    const aHeaderRendersAtRest = counters.aHeaderRenders;

    // Open A and let the gesture complete.
    aExpanded = true;
    act(() => {
      r.update(tree());
    });
    settleLayout(r, () => r.update(tree()));
    act(() => {
      rig.stepAll(550);
    });
    act(() => {
      r.update(tree());
    });
    settleLayout(r, () => r.update(tree()));
    expect(panelCopiesA().length).toBeGreaterThanOrEqual(1);
    // The panel mounted — twice over (window copy + seat copy).
    const mountsAfterFirstOpen = counters.aPanelMounts;
    expect(mountsAfterFirstOpen).toBeGreaterThanOrEqual(2);

    // Close A: mid-fold the members are still mounted (the
    // standing v483 guarantee)…
    aExpanded = false;
    act(() => {
      r.update(tree());
    });
    act(() => {
      rig.stepAll(275);
    });
    act(() => {
      r.update(tree());
    });
    expect(panelCopiesA().length).toBeGreaterThanOrEqual(1);

    // …and when the close COMPLETES they stay mounted: the
    // window simply stands at height 0 inside the one card.
    // (v490: the completion handoff unmounted them here.)
    act(() => {
      rig.stepAll(275);
    });
    act(() => {
      r.update(tree());
    });
    settleLayout(r, () => r.update(tree()));
    expect(panelCopiesA().length).toBeGreaterThanOrEqual(1);
    const winAtRest = byTestID(unitA(), "family-pour-window");
    expect(winAtRest).toBeTruthy();
    expect(styleHeight(winAtRest)).toBe(0);

    // Re-open A: the gesture runs, and NOT ONE panel copy
    // remounts — the mount count is exactly where the first
    // open left it. (v490: the second open mounted them all
    // again, on the JS thread, mid-gesture.)
    aExpanded = true;
    act(() => {
      r.update(tree());
    });
    settleLayout(r, () => r.update(tree()));
    act(() => {
      rig.stepAll(550);
    });
    act(() => {
      r.update(tree());
    });
    settleLayout(r, () => r.update(tree()));
    expect(panelCopiesA().length).toBeGreaterThanOrEqual(1);
    expect(counters.aPanelMounts).toBe(mountsAfterFirstOpen);

    // The sibling group never stirred through A's whole cycle:
    // its header probe rendered only for its own initial mount,
    // and it never grew a window or a panel.
    expect(counters.bHeaderRenders).toBe(bHeaderRendersAtRest);
    const unitB = byTestID(r.root, "unit-b")!;
    expect(unitB.findAll((n) => n.props.testID === "panel-root")).toHaveLength(0);
    // A's own header likewise rendered only at its own renders
    // the test drove — the gesture steps themselves render
    // nothing (the counts moved only via the updates above, and
    // the hoisted header element bails inside the unit).
    expect(counters.aHeaderRenders).toBe(aHeaderRendersAtRest);
  });

  it("stepping the gesture to completion renders nothing on the JS side — no completion handoff exists to fire", () => {
    let expanded = true;
    const element = () => (
      <FamilyGroupUnit
        expanded={expanded}
        accent={ACCENT}
        cardStyle={CARD_STYLE}
        header={headerAEl}
        panel={expanded ? panelAEl : false}
      />
    );
    act(() => {
      renderer = TestRenderer.create(element());
    });
    const r = renderer!;
    settleLayout(r, () => r.update(element()));
    expect(r.root.findAll((n) => n.props.testID === "panel-root").length).toBeGreaterThanOrEqual(1);

    // The tap render: the screen drops the panel and flips the
    // state — the ONE React render a toggle is allowed.
    expanded = false;
    act(() => {
      r.update(element());
    });
    const rendersAfterTap = counters.aHeaderRenders;

    // Now the gesture runs to completion with NO React update
    // at all — pure shared-value steps, the way the UI thread
    // runs it on device. On v490 the timing's completion
    // callback crossed back to JS (runOnJS → setState) and the
    // members unmounted mid-step; on v491 nothing fires, and
    // the members are still standing in their height-0 window
    // when the clock runs out.
    act(() => {
      rig.stepAll(550);
    });
    expect(counters.aHeaderRenders).toBe(rendersAfterTap);
    expect(r.root.findAll((n) => n.props.testID === "panel-root").length).toBeGreaterThanOrEqual(1);
  });
});

describe("v491 — mid-flight, the clip is the window's own height (the spill cannot happen by construction)", () => {
  it("at q = 0.5 the panel stands inside an overflow-hidden window at the geometry's height, inside the one card, seat beside it", () => {
    let expanded = true;
    const element = () => (
      <FamilyGroupUnit
        expanded={expanded}
        accent={ACCENT}
        cardStyle={CARD_STYLE}
        header={headerAEl}
        panel={expanded ? panelAEl : false}
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

    // The standing geometry at q = 0.5 (H = 62, P = 360).
    const win = byTestID(r.root, "family-pour-window");
    expect(win).toBeTruthy();
    expect(styleHeight(win)).toBeCloseTo(180, 1);
    // The window clips with its own box — the same height the
    // layout sees is the height that clips, on the same value.
    expect(flattenStyle(win!.props.style).overflow).toBe("hidden");
    expect(styleHeight(byTestID(r.root, "family-pour-fill"))).toBeCloseTo(121, 1);
    // The members stand inside that window, nowhere else in the
    // card but the seat's measuring copy.
    const panelInWindow = win!.findAll((n) => n.props.testID === "panel-root");
    expect(panelInWindow.length).toBeGreaterThanOrEqual(1);
    expect(byTestID(r.root, "family-pour-measure-seat")).toBeTruthy();
    // Still one surface: exactly one node carries the card
    // background, and the window lives inside it.
    const surfaces = r.root.findAll(
      (n) => n.type === "View" && flattenStyle(n.props.style).backgroundColor === CARD_BG,
    );
    expect(surfaces).toHaveLength(1);
    expect(surfaces[0].findAll((n) => n === win)).toHaveLength(1);
  });
});

describe("v491 — source pins: no JS bridge rides the gesture; the chevron turns on the pour's own clock", () => {
  const unit = pourSrc.slice(
    pourSrc.indexOf("export function FamilyGroupUnit"),
    pourSrc.indexOf("export function FamilyPourFill"),
  );
  const chevron = indexSrc.slice(
    indexSrc.indexOf("function FamilyChevron"),
    indexSrc.indexOf("const rosterRefIds = new WeakMap"),
  );

  it("the unit contains no runOnJS call and no animated reaction — the gesture never crosses to JS per frame or at completion", () => {
    expect(unit).not.toContain("runOnJS(");
    expect(pourSrc).not.toContain("useAnimatedReaction");
    // The import itself no longer carries the bridge.
    const importBlock = pourSrc.slice(
      pourSrc.indexOf("from \"react-native-reanimated\"") - 600,
      pourSrc.indexOf("from \"react-native-reanimated\""),
    );
    expect(importBlock).not.toContain("runOnJS");
    // The mount, once opened, is a one-way door.
    expect(unit).toContain("if (expanded) setPanelMounted(true);");
    expect(unit).not.toContain("setPanelMounted(false)");
  });

  it("the chevron's rotation is interpolated from the pour's shared value inside a unit", () => {
    expect(chevron).toContain("interpolate(pourContext.pour.value, [0, 1], [180, 0])");
    // The standing dress is untouched: solid white twin, accent
    // glyph, the face-fraction crossfade (v483 pins hold).
    expect(chevron).toContain('backgroundColor: "#FFFFFF"');
    expect(chevron).toContain("pourContext.faceFillFrac.value");
    // The legacy clock survives ONLY as the outside-a-unit
    // fallback (v267/v481 pins hold on the same string).
    expect(chevron).toContain("duration: QUEUE_TRAY_DURATION_MS,");
  });
});
