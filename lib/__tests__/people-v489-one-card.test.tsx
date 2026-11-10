// ─── v489 — the group as ONE CARD (The Pour, rebuilt) ─────────────
// Device verdict on v487 (Jonathan, Nov 10, screenshot +
// recording): the animation was not the problem — the CARD was.
// "What the hell even are these shapes? Why are they all clumped
// together, and why doesn't the expanded tray connect to the
// groups header?" Frame-read: closed groups stood as solid
// accent slabs with near-square top corners and huge rounded
// bottoms, interlocking into scallops; open, the tray was a
// separate flat-topped sheet butted under a rounded header card.
//
// Root cause: the group was composed from STACKED PIECES — a
// header card (own background/radius/margins), a panel sheet
// (own background, bottom radii, marginTop −14 tuck, trailing
// marginBottom 10) and a fill rectangle inset 12px with its own
// bottom radii. Three surfaces, three outlines — the scallops
// and the seam are what stacked outlines look like mid-pour.
//
// The approved drawing (group-one-card-v2.html, his "Build it
// this way", Nov 10) is the mockup's own .gcard: ONE element —
// background, border-radius 28, one soft shadow, overflow
// hidden — with header, progress, members and the Complete
// button all children of that one element, and .fill a single
// full-bleed layer (inset 0, no radius of its own) clipped by
// the card's outline. Groups stand on their own with the
// roster's normal spacing — no overlap (his correction,
// Nov 10 10:55: the earlier "nearly overlapping" reading is
// retired).
//
// This build ports that structure onto the standing pour:
//  · FamilyGroupUnit's root becomes the card when the
//    composition hands it a cardStyle (the Classic path only;
//    skinned rows pass none and keep the v481–v488 shape);
//  · the fill goes full-bleed (left/right 0, no own radius) in
//    that mode — the card's outline clips it, so a seam or a
//    corner notch is impossible by construction;
//  · the Classic header returns its head row alone (no card
//    wrapper, no interior FamilyPourFill — the ONE fill paints
//    the face region directly, the fraction still driving the
//    text/chevron flips), and the Classic panel loses its sheet:
//    no background, no radii, no −14 tuck, no trailing margin;
//  · the geometry (familyPourGeometry), the clock, the seat,
//    the cache and the lifecycle are untouched — H is now the
//    header's height inside the one card and P the panel
//    content's, both measured exactly as before.
//
// Failing-first: against the v488 code every structural pin
// below fails — the unit ignores cardStyle (no node carries
// the card background), the fill stands at left/right 12 with
// bottom radii of its own, and the composition still wraps the
// header in a card and the panel in a sheet.

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
const indexSrc = read("app/(tabs)/index.tsx");

const ACCENT = "#7C3AED";
const CARD_BG = "#FFFFFF";
// The surface the Classic composition hands the unit: the
// mockup's card (radius 28) wearing the roster's standing
// spacing (marginHorizontal 12, the household gap on top).
const CARD_STYLE = {
  backgroundColor: CARD_BG,
  borderRadius: 28,
  marginHorizontal: 12,
  marginTop: 9,
};
// The v486/v487 stub measures: the head row alone, and the full
// panel with the progress block at its top.
const HEADER_H = 62;
const PANEL_H = 360;

const header = <View testID="stub-header" style={{ height: HEADER_H }} />;
const panelContent = (
  <View testID="panel-root">
    <View testID="family-pour-progress" style={{ height: 46 }} />
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

/** The one card: the node carrying the card background. */
function findCard(renderer: ReactTestRenderer): Inst | undefined {
  return renderer.root.findAll(
    (n) => n.type === "View" && flattenStyle(n.props.style).backgroundColor === CARD_BG,
  )[0];
}

/** Ancestors of `inst`, nearest first, stopping before `stop`. */
function ancestorsBelow(inst: Inst, stop: Inst): Inst[] {
  const out: Inst[] = [];
  let cur: Inst | null = inst.parent;
  while (cur && cur !== stop) {
    out.push(cur);
    cur = cur.parent;
  }
  return out;
}

function renderOneCard(expandedRef: { value: boolean }) {
  const element = () => (
    <FamilyGroupUnit
      expanded={expandedRef.value}
      accent={ACCENT}
      cardStyle={CARD_STYLE}
      header={header}
      panel={expandedRef.value ? panelContent : false}
    />
  );
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(element());
  });
  return { renderer, element };
}

let renderer: ReactTestRenderer | null = null;
afterEach(() => {
  renderer?.unmount();
  renderer = null;
  rig.animations.clear();
});

describe("v489 — one card: a single surface holds header and panel", () => {
  it("(a) header content and panel content share ONE common ancestor carrying the card background + radius — no second surface wraps either", () => {
    const state = { value: true };
    const r = renderOneCard(state);
    renderer = r.renderer;
    settleLayout(r.renderer, () => r.renderer.update(r.element()));

    const card = findCard(r.renderer);
    expect(card, "one node carries the card surface").toBeTruthy();
    const cardStyle = flattenStyle(card!.props.style);
    expect(cardStyle.backgroundColor).toBe(CARD_BG);
    expect(cardStyle.borderRadius).toBe(28);
    expect(cardStyle.overflow).toBe("hidden");

    // Exactly ONE node in the whole tree wears the card
    // background: the card itself. (The fill wears the accent;
    // nothing else may carry a surface.)
    const surfaces = r.renderer.root.findAll(
      (n) => flattenStyle(n.props.style).backgroundColor === CARD_BG,
    );
    expect(surfaces).toHaveLength(1);

    // The header and the panel (the window's copy) both live
    // under that one card…
    const win = byTestID(r.renderer, "family-pour-window");
    expect(win).toBeTruthy();
    const panelInWindow = win!.findAll((n) => n.props.testID === "panel-root")[0];
    expect(panelInWindow).toBeTruthy();
    expect(card!.findAll((n) => n === panelInWindow)).toHaveLength(1);
    expect(card!.findAll((n) => n.props.testID === "stub-header")).toHaveLength(1);

    // …and no background-carrying node stands between either of
    // them and the card: no second surface wraps the panel, and
    // none wraps the header.
    for (const leaf of [panelInWindow, byTestID(r.renderer, "stub-header")!]) {
      for (const anc of ancestorsBelow(leaf, card!)) {
        expect(flattenStyle(anc.props.style).backgroundColor).toBeUndefined();
      }
    }
  });

  it("(b) the fill spans the full card width and carries no radius of its own — the card's outline clips it", () => {
    const state = { value: true };
    const r = renderOneCard(state);
    renderer = r.renderer;
    settleLayout(r.renderer, () => r.renderer.update(r.element()));

    const fill = byTestID(r.renderer, "family-pour-fill");
    expect(fill).toBeTruthy();
    const st = flattenStyle(fill!.props.style);
    expect(st.position).toBe("absolute");
    expect(st.left).toBe(0);
    expect(st.right).toBe(0);
    expect(st.bottom).toBe(0);
    expect(st.borderRadius).toBeUndefined();
    expect(st.borderBottomLeftRadius).toBeUndefined();
    expect(st.borderBottomRightRadius).toBeUndefined();
    expect(st.backgroundColor).toBe(ACCENT);
  });

  it("(c) the group container carries no negative margins — groups stand on their own spacing", () => {
    const state = { value: true };
    const r = renderOneCard(state);
    renderer = r.renderer;
    settleLayout(r.renderer, () => r.renderer.update(r.element()));

    const card = findCard(r.renderer);
    expect(card).toBeTruthy();
    // The gap rides the card's top, as the household card's
    // always has (ROSTER_HOUSEHOLD_GAP = 9, passed in above).
    expect(flattenStyle(card!.props.style).marginTop).toBe(9);
    // Nothing anywhere in the unit's tree tucks under anything.
    const all = r.renderer.root.findAll(() => true);
    for (const n of all) {
      const st = flattenStyle(n.props.style);
      for (const key of Object.keys(st)) {
        if (key.startsWith("margin")) {
          expect(typeof st[key] === "number" ? (st[key] as number) : 0).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("(d) mid-flight (q = 0.5) the structure is unchanged: still one surface, the fill's top edge the only moving boundary", () => {
    const state = { value: true };
    const r = renderOneCard(state);
    renderer = r.renderer;
    settleLayout(r.renderer, () => r.renderer.update(r.element()));

    state.value = false;
    act(() => {
      r.renderer.update(r.element());
    });
    act(() => {
      rig.stepAll(275);
    });
    act(() => {
      r.renderer.update(r.element());
    });

    // The standing geometry, mid-flight: window 180, fill 121.
    expect(styleHeight(byTestID(r.renderer, "family-pour-window"))).toBeCloseTo(180, 1);
    expect(styleHeight(byTestID(r.renderer, "family-pour-fill"))).toBeCloseTo(121, 1);
    // And the composition is the same one card as at rest.
    const card = findCard(r.renderer);
    expect(card).toBeTruthy();
    expect(flattenStyle(card!.props.style).borderRadius).toBe(28);
    expect(
      r.renderer.root.findAll((n) => flattenStyle(n.props.style).backgroundColor === CARD_BG),
    ).toHaveLength(1);
    const fillStyle = flattenStyle(byTestID(r.renderer, "family-pour-fill")!.props.style);
    expect(fillStyle.left).toBe(0);
    expect(fillStyle.right).toBe(0);
    expect(fillStyle.borderBottomLeftRadius).toBeUndefined();
    expect(fillStyle.borderBottomRightRadius).toBeUndefined();
    // The panel — progress block first — is still mounted in
    // the window: it is what folds, inside the one card.
    const win = byTestID(r.renderer, "family-pour-window");
    expect(win!.findAll((n) => n.props.testID === "panel-root").length).toBeGreaterThanOrEqual(1);
    expect(win!.findAll((n) => n.props.testID === "family-pour-progress").length).toBeGreaterThanOrEqual(1);
  });
});

describe("v489 — source pins: the composition hands the unit one card and strips the sheets", () => {
  const familyRow = indexSrc.slice(
    indexSrc.indexOf("const renderPeopleFamilyRow"),
    indexSrc.indexOf("// v267: FlatList's renderItem"),
  );
  const familyCard = indexSrc.slice(
    indexSrc.indexOf("const renderFamilyCard"),
    indexSrc.indexOf("const renderExpandedFamily"),
  );
  const classicFace = familyCard.slice(
    familyCard.indexOf("if (!isSkinned) {"),
    familyCard.indexOf("<ReAnimated.View key={familyId}"),
  );
  const expandedFamily = indexSrc.slice(
    indexSrc.indexOf("const renderExpandedFamily"),
    indexSrc.indexOf("const renderPeopleSectionRow"),
  );
  const classicPanel = expandedFamily.slice(
    expandedFamily.indexOf("if (!isSkinned) {"),
    expandedFamily.indexOf("</FamilyPanel>") + "</FamilyPanel>".length,
  );

  it("the row composes the unit with the ONE card surface — mockup radius, the roster's gap on top, Classic only", () => {
    expect(familyRow).toContain("cardStyle={familyCardSurface}");
    expect(indexSrc).toContain(
      "const familyCardSurface = !isSkinned ? { backgroundColor: pmf.card, borderRadius: 28, marginHorizontal: 12, marginTop: ROSTER_HOUSEHOLD_GAP, shadowColor: pmf.shadow, shadowOpacity: 1, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 } : undefined;",
    );
  });

  it("the Classic face is the head row alone: no card wrapper, no interior fill, no gap of its own", () => {
    expect(classicFace).not.toContain("<FamilyPourFill");
    expect(classicFace).not.toContain("marginTop: ROSTER_HOUSEHOLD_GAP");
    expect(classicFace).not.toContain("backgroundColor: pmf.card");
    // The head row itself is untouched.
    expect(classicFace).toContain('<FamilyPourText variant="name"');
    expect(classicFace).toContain('<FamilyPourText variant="meta"');
    expect(classicFace).toContain("<FamilyChevron");
  });

  it("the Classic panel is content, not a sheet: no background, no radii, no tuck, no trailing margin", () => {
    expect(classicPanel).toContain("<FamilyPanel outerStyle={{ paddingBottom: 14 }}>");
    expect(classicPanel).not.toContain("marginTop: -14");
    expect(classicPanel).not.toContain("marginBottom: 10");
    expect(classicPanel).not.toContain("paddingTop: 20");
    expect(classicPanel).not.toContain("borderBottomLeftRadius: 24");
    // The content itself is untouched: the progress block still
    // stands first, plain, at the panel's top.
    expect(classicPanel).toContain('testID="family-pour-progress"');
    expect(classicPanel.indexOf('testID="family-pour-progress"')).toBeLessThan(
      classicPanel.indexOf("renderMemberRow(member, false)"),
    );
  });
});
