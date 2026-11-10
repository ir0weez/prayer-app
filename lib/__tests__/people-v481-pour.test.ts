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

import { FAMILY_POUR_DURATION_MS, familyPourGeometry } from "@/components/family-pour";

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

describe("v481 — the pour's geometry (familyPourGeometry)", () => {
  const HEADER = 62;
  const PANEL = 300;

  // v486 re-pin (this whole describe): the geometry is the
  // mockup's own mechanism now — the window folds (1 − q) of the
  // panel while the ONE fill stands at the bottom q of the unit's
  // CURRENT height (face + window), both off the same q, same
  // clock. The values below are that law's; the v481/v485 values
  // (front schedules, partitions, phase laws) are superseded.
  it("at rest closed the card stands full: no window, the fill at the face's height, face fraction 1", () => {
    const g = familyPourGeometry(1, HEADER, PANEL);
    expect(g.windowHeight).toBe(0);
    expect(g.fillHeight).toBe(HEADER);
    expect(g.faceFillFrac).toBe(1);
  });

  it("at rest open the window stands full and nothing is filled", () => {
    const g = familyPourGeometry(0, HEADER, PANEL);
    expect(g.windowHeight).toBe(PANEL);
    expect(g.fillHeight).toBe(0);
    expect(g.faceFillFrac).toBe(0);
  });

  it("mid-pour the window has folded halfway and the fill — the bottom half of the CURRENT height — has not reached the face", () => {
    const g = familyPourGeometry(0.5, HEADER, PANEL);
    expect(g.windowHeight).toBe(150);
    expect(g.fillHeight).toBe(106);
    expect(g.faceFillFrac).toBe(0);
  });

  it("early in the pour the window is still three-quarters open and the fill is shallow", () => {
    const g = familyPourGeometry(0.25, HEADER, PANEL);
    expect(g.windowHeight).toBe(225);
    expect(g.fillHeight).toBeCloseTo(71.75);
    expect(g.faceFillFrac).toBe(0);
  });

  it("late in the pour the fill has climbed into the face while a quarter of the panel still stands open", () => {
    // The mockup's concurrency, in one frame: the wrap is still
    // folding (75 of the panel stands) AND the fill — read off
    // the shrinking current height — already covers 27.75 of the
    // face's 62. Both of v485's phase laws denied one half of
    // this frame or the other.
    const g = familyPourGeometry(0.75, HEADER, PANEL);
    expect(g.windowHeight).toBe(75);
    expect(g.fillHeight).toBeCloseTo(102.75);
    expect(g.faceFillFrac).toBeCloseTo(27.75 / 62, 6);
  });

  it("an unmeasured panel still gives the pour itself for the face fraction", () => {
    expect(familyPourGeometry(1, HEADER, 0).faceFillFrac).toBe(1);
    expect(familyPourGeometry(0, HEADER, 0).faceFillFrac).toBe(0);
    expect(familyPourGeometry(0.5, HEADER, 0).faceFillFrac).toBe(0.5);
  });

  it("across the whole travel the two lines hold and the fraction stays in [0, 1]", () => {
    for (let step = 0; step <= 20; step += 1) {
      const q = step / 20;
      const g = familyPourGeometry(q, HEADER, PANEL);
      const window = PANEL * (1 - q);
      expect(g.windowHeight).toBeCloseTo(window, 6);
      expect(g.fillHeight).toBeCloseTo(q * (HEADER + window), 6);
      expect(g.faceFillFrac).toBeGreaterThanOrEqual(0);
      expect(g.faceFillFrac).toBeLessThanOrEqual(1);
    }
  });

  it("the clock is the mockup's 550ms on the Material emphasized easing", () => {
    // v486 re-pin: 500 → 550 — the port takes the spec's own .55s.
    expect(FAMILY_POUR_DURATION_MS).toBe(550);
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
    // v486 re-pin: the geometry's name, as renamed by the port.
    expect(index).not.toContain("familyPourGeometry");
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
    // v486 re-pin: the fraction is the FACE fraction now (the
    // face is header + progress, the card carrying both).
    expect(fill).toContain("ctx.faceFillFrac.value * 100");
    expect(fill).toContain('position: "absolute", left: 0, right: 0, bottom: 0');
  });

  it("the ONE fill layer stands over the panel region in the same accent, from the same q", () => {
    expect(unit).toContain("backgroundColor: accent");
    // v486 re-pin: v485's segment + in-flow band are gone; the
    // fill is one absolute layer whose height is the geometry's
    // fillHeight (the bottom q of the unit's current height),
    // standing as a sibling over the window — the mockup's .fill.
    // The trailing-margin offset the v484 slab floated on stays
    // gone.
    expect(unit).toContain('testID="family-pour-fill"');
    expect(unit).toContain("geometry.value.fillHeight");
    expect(unit).not.toContain('testID="family-pour-segment"');
    expect(unit).not.toContain('testID="family-pour-band"');
    expect(unit).not.toContain("FAMILY_PANEL_TRAILING_MARGIN");
  });

  it("the face texts flip to white on the pour — progress first, name and meta across the upper reach", () => {
    expect(pourText).toContain("interpolateColor");
    expect(pourText).toContain('"#FFFFFF"');
    // v486 re-pin: the ranges are keyed to the fill's climb into
    // the face — the progress row sits at the face's bottom and
    // flips over [0, 0.35]; the head row's name/meta flip over
    // [0.45, 1].
    expect(pourText).toContain('variant === "progress" ? [0, 0.35] : [0.45, 1]');
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
  it("the panel window clips its content and takes its height from the geometry", () => {
    expect(unit).toContain('overflow: "hidden"');
    // v486 re-pin: the derived value is the port's geometry.
    expect(unit).toContain("geometry.value.windowHeight");
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
