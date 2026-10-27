/**
 * v267 — "People in Motion": Jonathan's device verdict (Oct 26
 * 11:38, with a People screenshot): "You said this would be more
 * animated didn't you? I feel like the emergency prayer card should
 * have a little more animation anyway. Closing the people groups and
 * pray today folders are laggy and slow too. The animations need to
 * be better. More material design like."
 *
 * A MOTION pass — performance + presence, no layout, content, or
 * behavior changes:
 *  1. The emergency card LIVES: its status dot pulses and its edge
 *     carries a soft breathing red glow (kit components in
 *     people-entrance.tsx — native driver, calm ~2.4s/4.8s cycles,
 *     static under reduced motion or when People loses focus).
 *     The praise card is untouched — he named emergency only.
 *  2. The household unfurl is SMOOTH: UnfurlPanel animates a
 *     MEASURED height (the old maxHeight 0→1200 guess made the
 *     easing lie — rush, dead zone, rush), rasterizes while moving,
 *     and settles back to auto height. Roster rows render through
 *     memoized shells keyed on a semantic fingerprint, so a toggle
 *     (or the 1Hz countdown tick) no longer re-renders the whole
 *     visible roster. The stylesheet is memoized too.
 *     [Re-based by v275: the measured target stands, but the
 *     window that carries it is a maxHeight CAP again — v267's
 *     definite animated height window measured its content from
 *     inside a height:0 box, Yoga clamped the measurement to 0,
 *     and the panel livelocked shut on device (his Oct 26 17:26
 *     report). See people-v275.test.ts for the full trace.]
 *     [Re-based again by v282: the maxHeight window ALSO failed
 *     on his phone (Oct 27 08:29, v280 installed — chevron up,
 *     zero members). The animated window is retired altogether;
 *     the panel is plain layout now. See people-v282.test.ts.]
 *  3. The v262 tray rasterizes its clipping window while animating
 *     (320ms timing and interruptibility stand).
 *  4. One interactive clock: unfurl, tray, chevron, and the skinned
 *     card-fill all run 320ms on the Material standard easing
 *     (bezier 0.2, 0, 0, 1). The entrance kit's 300ms settle and the
 *     carousel's 260ms page fade keep their own sanctioned values on
 *     the same easing family.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const index = read("app/(tabs)/index.tsx");
const entrance = read("components/people-entrance.tsx");

const banner = index.slice(index.indexOf("const renderEmergencyBanner"), index.indexOf("const renderQueueCard"));
const praise = index.slice(index.indexOf("const renderPraiseCard"), index.indexOf("const renderSlipCard"));
const unfurl = index.slice(index.indexOf("function UnfurlPanel"), index.indexOf("const QUEUE_TRAY_DURATION_MS"));
const trayWindow = index.slice(index.indexOf("queueTrayHeightLocked ? { height: queueTrayHeight }"), index.indexOf("const renderStreakCard"));
const rows = index.slice(index.indexOf("const rosterRefIds = new WeakMap"), index.indexOf("export default function HomeScreen"));

describe("v267 — the emergency card lives (people-entrance kit + banner)", () => {
  it("the kit exports both live treatments, on calm declared cycles", () => {
    expect(entrance).toContain("export function EmergencyLiveDot(");
    expect(entrance).toContain("export function EmergencyBreathGlow(");
    expect(entrance).toContain("export const EMERGENCY_DOT_CYCLE_MS = 2400;");
    expect(entrance).toContain("export const EMERGENCY_BREATH_CYCLE_MS = 4800;");
  });

  it("both treatments animate opacity/transform only, on the native driver, as loops", () => {
    const dot = entrance.slice(entrance.indexOf("export function EmergencyLiveDot("), entrance.indexOf("export function EmergencyBreathGlow("));
    const glow = entrance.slice(entrance.indexOf("export function EmergencyBreathGlow("), entrance.indexOf("export function PeopleEntrance("));
    for (const slice of [dot, glow]) {
      expect(slice).toContain("Animated.loop(");
      expect(slice).toContain("useNativeDriver: true");
      expect(slice).toContain("Easing.inOut(Easing.sin)");
    }
    expect(dot).toContain("outputRange: [1, 1.4]");
    expect(glow).toContain("borderColor: \"rgba(252,165,165,0.85)\"");
  });

  it("reduced motion or an inactive (unfocused) card parks both at rest", () => {
    const dot = entrance.slice(entrance.indexOf("export function EmergencyLiveDot("), entrance.indexOf("export function EmergencyBreathGlow("));
    const glow = entrance.slice(entrance.indexOf("export function EmergencyBreathGlow("), entrance.indexOf("export function PeopleEntrance("));
    for (const slice of [dot, glow]) {
      expect(slice).toContain("usePeopleReducedMotion()");
      expect(slice).toContain("if (!active || reducedMotion)");
      expect(slice).toContain("stopAnimation()");
    }
    expect(entrance).toContain("export function usePeopleReducedMotion()");
    expect(entrance).toContain("AccessibilityInfo.isReduceMotionEnabled()");
  });

  it("the banner mounts the dot inside its halo and the glow inside the card clip, gated on focus", () => {
    expect(banner).toContain("<EmergencyLiveDot active={peopleFocused} />");
    expect(banner).toContain("<EmergencyBreathGlow active={peopleFocused} />");
  });

  it("the praise card gets NEITHER treatment — he named emergency only", () => {
    expect(praise).not.toContain("EmergencyLiveDot");
    expect(praise).not.toContain("EmergencyBreathGlow");
  });
});

describe("v267 — the household unfurl is smooth (index.tsx)", () => {
  it("v282: the panel carries NO animated height at all — the window lineage (1200 guess → definite height → measured cap) is retired", () => {
    // v267's measured animation and v275's maxHeight cap both
    // failed on his phone; the panel is a plain View whose
    // height is its children's layout height. Nothing to
    // measure, nothing to clamp, nothing to animate shut.
    expect(unfurl).toContain("<View style={frameStyle}>");
    expect(unfurl).not.toContain("handleContentLayout");
    expect(unfurl).not.toContain("maxHeight: reveal.value");
    expect(unfurl).not.toContain("reveal.value = withTiming(contentHeight.value");
    expect(unfurl).not.toContain("height: height.value");
    expect(unfurl).not.toContain("1200");
  });

  it("v282: no rasterize-while-moving — the hardware texture left with the window", () => {
    expect(unfurl).not.toContain("renderToHardwareTextureAndroid={rasterize}");
    expect(unfurl).not.toContain("shouldRasterizeIOS={rasterize}");
    expect(unfurl).not.toContain("const settleOpen = () => { settledRef.current = true; setSettled(true); setRasterize(false); };");
  });

  it("v282: no settle swap, no closing re-lock — plain height needs neither", () => {
    expect(unfurl).not.toContain("settled ? { opacity: 1 } : animatedStyle");
    expect(unfurl).not.toContain("if (settledRef.current) reveal.value = contentHeight.value;");
  });

  it("v282: the panel needs no reduced-motion branch — it is instant at every setting", () => {
    expect(unfurl).not.toContain("AccessibilityInfo.isReduceMotionEnabled()");
    expect(unfurl).not.toContain("if (reducedMotion) {");
  });
});

describe("v267 — roster rows are memo shells (index.tsx)", () => {
  it("a React.memo shell exists whose comparator reads only rowKey + fingerprint", () => {
    expect(rows).toContain("const RosterRowShell = memo(");
    expect(rows).toContain("(prev, next) => prev.rowKey === next.rowKey && prev.fingerprint === next.fingerprint");
    expect(rows).toContain("const rosterRefIds = new WeakMap<object, number>();");
  });

  it("renderItem routes every row kind through the shell", () => {
    const renderItem = index.slice(index.indexOf("const renderPeopleRow = "), index.indexOf("const renderPeopleScreen"));
    expect(renderItem).toContain("renderRow={() => renderPeopleSectionRow(item)}");
    expect(renderItem).toContain("renderRow={() => renderPersonCard(item.person, item.index, item.section.people)}");
    expect(renderItem).toContain("renderRow={() => renderPeopleFamilyRow(item)}");
    expect(renderItem).toContain("fingerprint={`f|${rosterRefId(item.familyMembers)}|");
  });

  it("the family fingerprint carries the row's own expanded/closing state and member countdowns", () => {
    const renderItem = index.slice(index.indexOf("const renderPeopleRow = "), index.indexOf("const renderPeopleScreen"));
    expect(renderItem).toContain("${expandedFamilyId === familyId ? 1 : 0}|${closingFamilyId === familyId ? 1 : 0}|${memberCountdowns}");
  });

  it("the stylesheet is memoized on its theme inputs, not rebuilt per render", () => {
    expect(index).toContain("const styles = useMemo(() => createStyles(colors, skinTokens), [colors, skinTokens]);");
  });
});

describe("v267 — tray rasterization + the one interactive clock", () => {
  it("the tray window rasterizes while animating and releases on the height timing's finish", () => {
    expect(trayWindow).toContain("renderToHardwareTextureAndroid={queueTrayRasterize}");
    expect(trayWindow).toContain("shouldRasterizeIOS={queueTrayRasterize}");
    expect(index).toContain("setQueueTrayRasterize(true);");
    expect(index).toContain("setQueueTrayRasterize(false);");
  });

  it("chevron and card-fill still ride the tray's 320ms clock on the Material easing (the panel itself is instant since v282)", () => {
    expect(unfurl).not.toContain("withTiming");
    const chevron = index.slice(index.indexOf("function FamilyChevron"), index.indexOf("export default function HomeScreen"));
    expect(chevron).toContain("duration: QUEUE_TRAY_DURATION_MS,");
    expect(index).toContain("cardFillProgress.value = withTiming(1, { duration: QUEUE_TRAY_DURATION_MS, easing: fillEasing });");
    expect(index).toContain("cardFillProgress.value = withTiming(0, { duration: QUEUE_TRAY_DURATION_MS, easing: fillEasing });");
    expect(index).toContain("const fillEasing = Easing.bezier(0.2, 0, 0, 1);");
    expect(index).not.toContain("Easing.out(Easing.quad)");
    expect(index).not.toContain("duration: 450");
  });
});
