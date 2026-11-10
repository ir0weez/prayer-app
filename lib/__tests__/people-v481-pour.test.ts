// ─── v481 — "The Pour": the household group open/close motion ────────
// Jonathan's own Oct 2 design, picked again on Nov 9 from the
// motion mockups ("1. 100%" — group-motion-concepts-v1.html,
// Concept 1): closing folds the member rows away while the group's
// accent pours up from the card's bottom edge until the closed
// card stands fully filled, header text and chevron turned to the
// on-colour; opening drains it back down and the rows unfurl
// underneath.
//
// The pins below guard the shape that answers his two device
// verdicts on earlier attempts: v362's travel was "slow and very
// delayed… rows ghost/overlap" (a JS-thread height window plus
// rows fading on their own clocks) and v275's gate stack could
// leave members invisible (v282). So: ONE shared value per card,
// owned by the group unit and never by the screen; every visual
// derived from it on the UI thread; members opaque at every
// height; no texture, no exiting animation, no opacity gate; and
// the roster skeleton (groups, nesting, +N) exactly where it was.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

// The pour module imports react-native / reanimated for its
// component shell; the geometry under test is pure — stand the
// shells aside (the people-v272 pattern).
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

import { FAMILY_POUR_DURATION_MS, familyPourFront } from "@/components/family-pour";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const index = read("app/(tabs)/index.tsx");
const pour = read("components/family-pour.tsx");

const unit = pour.slice(pour.indexOf("export function FamilyGroupUnit"), pour.indexOf("export function FamilyPourFill"));
const fill = pour.slice(pour.indexOf("export function FamilyPourFill"), pour.indexOf("export function FamilyPourText"));
const pourText = pour.slice(pour.indexOf("export function FamilyPourText"));
const familyRow = index.slice(index.indexOf("const renderPeopleFamilyRow"), index.indexOf("// v267: FlatList's renderItem"));
const classicCard = index.slice(index.indexOf("if (!isSkinned) {"), index.indexOf("<ReAnimated.View key={familyId}"));
const chevron = index.slice(index.indexOf("function FamilyChevron"), index.indexOf("const rosterRefIds = new WeakMap"));

describe("v481 — the pour's geometry (familyPourFront)", () => {
  const HEADER = 62;
  const PANEL = 300;

  it("at rest closed the card stands full: no window, header fraction 1", () => {
    const front = familyPourFront(1, HEADER, PANEL);
    expect(front.panelWindowHeight).toBe(0);
    expect(front.panelFillHeight).toBe(0);
    expect(front.headerFillFrac).toBe(1);
  });

  it("at rest open the window stands full and nothing is filled", () => {
    const front = familyPourFront(0, HEADER, PANEL);
    expect(front.panelWindowHeight).toBe(PANEL);
    expect(front.panelFillHeight).toBe(0);
    expect(front.headerFillFrac).toBe(0);
  });

  it("mid-pour the front has climbed half the unit and the window has folded half away", () => {
    const front = familyPourFront(0.5, HEADER, PANEL);
    expect(front.panelWindowHeight).toBe(150);
    expect(front.panelFillHeight).toBe(150);
    expect(front.headerFillFrac).toBe(0.5);
  });

  it("early in the pour the colour is still inside the panel segment — the header is untouched", () => {
    const front = familyPourFront(0.25, HEADER, PANEL);
    expect(front.panelWindowHeight).toBe(225);
    expect(front.panelFillHeight).toBeCloseTo(90.5);
    expect(front.headerFillFrac).toBe(0);
  });

  it("late in the pour the header is covered before the last of the panel folds", () => {
    const front = familyPourFront(0.75, HEADER, PANEL);
    expect(front.panelWindowHeight).toBe(75);
    expect(front.headerFillFrac).toBe(1);
  });

  it("an unmeasured panel falls back to the pour itself for the header fraction", () => {
    expect(familyPourFront(1, HEADER, 0).headerFillFrac).toBe(1);
    expect(familyPourFront(0, HEADER, 0).headerFillFrac).toBe(0);
    expect(familyPourFront(0.5, HEADER, 0).headerFillFrac).toBe(0.5);
  });

  it("across the whole travel the fill never exceeds the window and the fraction stays in [0, 1]", () => {
    for (let step = 0; step <= 20; step += 1) {
      const front = familyPourFront(step / 20, HEADER, PANEL);
      expect(front.panelFillHeight).toBeLessThanOrEqual(front.panelWindowHeight);
      expect(front.headerFillFrac).toBeGreaterThanOrEqual(0);
      expect(front.headerFillFrac).toBeLessThanOrEqual(1);
    }
  });

  it("the clock is the named 500ms on the Material emphasized easing", () => {
    expect(FAMILY_POUR_DURATION_MS).toBe(500);
    expect(pour).toContain("Easing.bezier(0.2, 0, 0, 1)");
  });
});

describe("v481 — one value per card, owned by the unit", () => {
  it("the pour value is created inside FamilyGroupUnit, seeded from its own expanded state", () => {
    expect(unit).toContain("useSharedValue(expanded ? 0 : 1)");
    expect(unit).toContain("<FamilyPourContext.Provider");
    expect(unit).toContain("withTiming(0, { duration: FAMILY_POUR_DURATION_MS, easing: FAMILY_POUR_EASING })");
    expect(unit).toContain("withTiming(");
  });

  it("the screen creates no pour state of its own — the provider lives in the component file", () => {
    expect(index).not.toContain("FamilyPourContext.Provider");
    expect(index).not.toContain("familyPourFront");
  });

  it("the row composes card + panel inside exactly one unit, fed the section's own accent", () => {
    expect(index.match(/<FamilyGroupUnit/g)).toHaveLength(1);
    expect(familyRow).toContain("<FamilyGroupUnit");
    expect(familyRow).toContain("accent={relationshipColors[item.section.title].accent}");
    expect(familyRow).toContain("header={renderFamilyCard(item.familyMembers, undefined, isExpanded)}");
    expect(familyRow).toContain("panel={isExpanded && renderExpandedFamily(item.familyMembers, item.section)}");
  });

  it("a closing group keeps its members mounted for the whole fold, from the unit's cached panel", () => {
    expect(unit).toContain("heldPanelRef");
    expect(unit).toContain("if (panel) heldPanelRef.current = panel;");
    expect(unit).toContain("runOnJS(setPanelHeld)(false)");
    // v482 re-pin: the render prefers the current panel element and
    // falls back to the cached one only for the fold; the cache is
    // written in an effect, never during render.
    // v483 re-pin: the fallback is FALSY, not nullish — the screen
    // passes `false` for a collapsed group, `??` never engaged, and
    // closing folded an empty window on device. The unit resolves
    // the rendered panel once (current when present, cached
    // otherwise) and renders that in both the window and the
    // measuring seat; people-v483-pour-seat pins the lifecycle.
    expect(unit).toContain("const renderedPanel = panel ? panel : heldPanelRef.current;");
    expect(unit).toContain("{renderedPanel}");
  });
});

describe("v481 — the fill and the flip", () => {
  it("the header card carries the pour fill in the group's derived accent", () => {
    expect(classicCard).toContain("<FamilyPourFill color={familyRelationship.accent} />");
    expect(fill).toContain("ctx.headerFillFrac.value * 100");
    expect(fill).toContain('position: "absolute", left: 0, right: 0, bottom: 0');
  });

  it("the panel segment fills in the same accent, from the same front", () => {
    expect(unit).toContain("backgroundColor: accent");
    expect(unit).toContain("front.value.panelFillHeight");
  });

  it("the header texts flip to white on the pour — name late, meta first", () => {
    expect(pourText).toContain("interpolateColor");
    expect(pourText).toContain('"#FFFFFF"');
    expect(pourText).toContain('variant === "name" ? [0.6, 0.92] : [0.34, 0.66]');
    expect(classicCard).toContain('<FamilyPourText variant="name" fromColor={pmf.ink}');
    expect(classicCard).toContain('<FamilyPourText variant="meta" fromColor={pmf.inkSoft}');
  });

  it("the chevron's twin crossfades in as the fill covers it — solid white circle, accent glyph (v483)", () => {
    expect(chevron).toContain("useContext(FamilyPourContext)");
    // v483 re-pin: v481's dress (translucent white circle, white
    // glyph) washed out on the violet fill — on device the chevron
    // was barely visible on a closed card. The twin is now a solid
    // white circle carrying the glyph in the group's accent (the
    // chevron's own `color` prop); the crossfade on the pour's
    // value and the open state are unchanged.
    expect(chevron).toContain('backgroundColor: "#FFFFFF"');
    expect(chevron).not.toContain('backgroundColor: "rgba(255,255,255,0.22)"');
    expect(chevron).toContain('<MaterialIcons name="expand-more" size={17} color={color} />');
    expect(chevron).toContain("duration: QUEUE_TRAY_DURATION_MS,");
  });
});

describe("v481 — the fold clips, and none of the retired gates return", () => {
  it("the panel window clips its content and takes its height from the front", () => {
    expect(unit).toContain('overflow: "hidden"');
    expect(unit).toContain("front.value.panelWindowHeight");
    expect(unit).toContain("pour.value === 0");
  });

  it("the measures land in the same shared values (v483: the panel's from the out-of-flow seat, never from inside the window)", () => {
    // v483 re-pin (title only — the assertions are byte-identical):
    // v481's title claimed the in-window seat could not clamp the
    // measure; the device proved the opposite (the window's height
    // derives from panelHeight, so the in-window measure
    // fixed-pointed at 0 and groups never opened). The assignment
    // lines themselves did not move — the panel's onLayout now
    // lives in the measuring seat beside the window, writing the
    // same shared value. people-v483-pour-seat pins the lifecycle.
    expect(unit).toContain("panelHeight.value = event.nativeEvent.layout.height;");
    expect(unit).toContain("headerHeight.value = event.nativeEvent.layout.height;");
  });

  it("no hardware texture, no exiting animation, and the panel content carries no opacity gate", () => {
    expect(pour).not.toContain("renderToHardwareTextureAndroid");
    expect(pour).not.toContain("shouldRasterizeIOS");
    expect(pour).not.toContain("exiting={");
    // v483 re-pin: the unit now contains exactly ONE opacity —
    // the measuring seat's `opacity: 0`, which hides the SEAT's
    // duplicate of the panel (it exists only to be measured, out
    // of flow beside the window). The discipline this pin guards
    // is unchanged: the VISIBLE panel content — the copy in the
    // window — carries no opacity gate; the seat's invisibility
    // is not a gate on the members, who stay fully opaque at
    // every height in the window.
    expect(unit.match(/opacity/g)).toHaveLength(1);
    expect(unit).toContain('testID="family-pour-measure-seat"');
    expect(unit).toContain("opacity: 0");
  });

  it("FamilyPanel itself stays the plain v367 panel — the motion wraps it, never enters it", () => {
    const panel = index.slice(index.indexOf("function FamilyPanel"), index.indexOf("type AppSettings = {"));
    expect(panel).toContain('<View style={[frameStyle, { overflow: "hidden" }]}>');
    expect(panel).not.toContain("FamilyPour");
    expect(index.match(/<FamilyPanel outerStyle=/g)).toHaveLength(2);
  });
});
