/**
 * v275 — "Unfurl Works Again": Jonathan's device report (Oct 26
 * 17:26, People screenshot): "When I try to unfurl the group cards,
 * it doesn't work..." The screenshot shows the Roberts Family card
 * with its chevron UP (expanded) and NO member rows beneath it —
 * the toggle flips state, the panel never gains height.
 *
 * THE MECHANISM (traced in app/(tabs)/index.tsx): v267's
 * UnfurlPanel starts its clipping window at a DEFINITE animated
 * height (a shared value 0 fed through useAnimatedStyle as
 * `height: height.value`) and takes its only content measurement
 * from the in-flow child View inside that window. Yoga clamps an
 * in-flow child's computed height to a definite parent's height,
 * so inside the height:0 window the child's onLayout reports 0 —
 * indistinguishable from "nothing inside". handleContentLayout
 * discards non-positive heights and runOpen() early-returns while
 * contentHeight <= 0; no other path ever assigns a target. A
 * measurement livelock: state open, chevron up (FamilyChevron is
 * an independent RN Animated value and worked), panel mounted at
 * height 0 / opacity 0, zero members, zero gap.
 *
 * WHY THE NEIGHBORS NEVER BROKE: the pre-v267 panel animated
 * maxHeight — a CAP, not a definite height — so its content was
 * laid out at natural height and the reveal worked (its sin was
 * the 1200 ceiling lying to the easing: the lag he filmed). The
 * v262 queue tray measures its content while its window is at
 * AUTO height and locks the window only mid-flight. Neither takes
 * its target measurement from inside a 0-height definite box.
 *
 * THE FIX: the window animates maxHeight again — to the MEASURED
 * content height, never the 1200 ceiling. A maxHeight window
 * never gives the child a definite height to clamp against, so
 * onLayout reports the natural height and the open target is
 * real. Every v267 contract stands: 320ms on the Material
 * standard easing (bezier 0.2, 0, 0, 1), interruptible /
 * reversible, rasterize while moving, settle back to auto
 * height, reduced motion = instant swap, FadeOut exit. The
 * RosterRowShell memoization and the roster's render behavior
 * are untouched — the failure predates v274 (the component is
 * byte-identical from v267's 3da2a7d through v274's fbf44f0;
 * v274's type-scale spreads never reach the panel).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const index = read("app/(tabs)/index.tsx");
const unfurl = index.slice(index.indexOf("function UnfurlPanel"), index.indexOf("const QUEUE_TRAY_DURATION_MS"));

/**
 * The panel's target-resolution model, at the level the house
 * people tests operate: the window shape is EXTRACTED from the
 * shipped source, then the toggle is simulated under Yoga's
 * layout rule — an in-flow child of a definite-height window
 * reports its height clamped to the window (0 at rest); a child
 * under a maxHeight cap is laid out at its natural height.
 * runOpen's guard then resolves the open target exactly as the
 * component does: a non-positive measurement is "not ready yet"
 * and the target stays 0.
 */
function simulateUnfurlTarget(source: string, naturalHeight: number): { reportedLayout: number; openTarget: number; membersVisible: boolean } {
  const animated = source.slice(source.indexOf("useAnimatedStyle"));
  const windowIsDefiniteHeight = /height:\s*\w+\.value/.test(animated);
  const reportedLayout = windowIsDefiniteHeight ? 0 : naturalHeight;
  // handleContentLayout + runOpen, as written in the component:
  const recorded = reportedLayout > 0 ? reportedLayout : 0;
  const openTarget = recorded <= 0 ? 0 : recorded;
  return { reportedLayout, openTarget, membersVisible: openTarget > 0 };
}

describe("v275 — the unfurl target resolves after a toggle (the livelock pin)", () => {
  it("with a household's real content height, the panel's open target is that height and members are visible", () => {
    // A six-member household panel: progress head + 6 rows + the
    // Mark as Complete bar — several hundred points tall.
    const result = simulateUnfurlTarget(unfurl, 412);
    expect(result.reportedLayout).toBe(412);
    expect(result.openTarget).toBe(412);
    expect(result.membersVisible).toBe(true);
  });

  it("the window is a measured CAP — maxHeight carries the reveal value, never a definite animated height", () => {
    expect(unfurl).toContain("maxHeight: reveal.value");
    expect(unfurl).not.toContain("height: height.value");
    expect(unfurl).not.toContain("height: reveal.value");
  });

  it("the animation target is the MEASURED height — the 1200 ceiling stays dead", () => {
    expect(unfurl).toContain("reveal.value = withTiming(contentHeight.value, { duration: QUEUE_TRAY_DURATION_MS, easing: Easing.bezier(0.2, 0, 0, 1) }");
    expect(unfurl).not.toContain("1200");
  });

  it("the measurement path is unchanged and now fed by a sound window", () => {
    expect(unfurl).toContain("onLayout={(event) => handleContentLayout(event.nativeEvent.layout.height)}");
    expect(unfurl).toContain("if (layoutHeight > 0) contentHeight.value = layoutHeight;");
    expect(unfurl).toContain("contentHeight.value <= 0");
  });
});

describe("v275 — the v267 motion contract survives the mechanism swap", () => {
  it("one clock: 320ms on the Material standard easing, no springs", () => {
    expect(unfurl).toContain("duration: QUEUE_TRAY_DURATION_MS, easing: Easing.bezier(0.2, 0, 0, 1)");
    expect(unfurl).not.toContain("withSpring");
    expect(unfurl).not.toContain("bounce");
  });

  it("the panel rasterizes while it moves and releases at settle", () => {
    expect(unfurl).toContain("renderToHardwareTextureAndroid={rasterize}");
    expect(unfurl).toContain("shouldRasterizeIOS={rasterize}");
    expect(unfurl).toContain("const settleOpen = () => { settledRef.current = true; setSettled(true); setRasterize(false); };");
  });

  it("settled panels return to auto height (no cap in the settled style); closing re-locks at the measured height first", () => {
    expect(unfurl).toContain("settled ? { opacity: 1 } : animatedStyle");
    expect(unfurl).toContain("if (settledRef.current) reveal.value = contentHeight.value;");
  });

  it("closing folds the cap to zero; reduced motion keeps the instant swap", () => {
    expect(unfurl).toContain("reveal.value = withTiming(0, { duration: QUEUE_TRAY_DURATION_MS, easing: Easing.bezier(0.2, 0, 0, 1) });");
    expect(unfurl).toContain("AccessibilityInfo.isReduceMotionEnabled()");
    expect(unfurl).toContain("if (reducedMotion) {");
  });

  it("the exit stays the quiet fade", () => {
    expect(unfurl).toContain("exiting={FadeOut.duration(180)}");
  });
});

describe("v275 — regression sweep: the neighbors are untouched", () => {
  it("the queue tray still measures at auto height and locks only mid-flight (v262/v267 pattern intact)", () => {
    expect(index).toContain("queueTrayHeightLocked ? { height: queueTrayHeight } : null");
    expect(index).toContain("const handleQueueTrayContentLayout = (height: number) => {");
    expect(index).toContain("queueTrayHeight.setValue(queueTrayRowHeightRef.current);");
  });

  it("the roster still routes family rows through the memoized shell with the toggle in the fingerprint", () => {
    const renderItem = index.slice(index.indexOf("const renderPeopleRow = "), index.indexOf("const renderPeopleScreen"));
    expect(renderItem).toContain("renderRow={() => renderPeopleFamilyRow(item)}");
    expect(renderItem).toContain("${expandedFamilyId === familyId ? 1 : 0}|${closingFamilyId === familyId ? 1 : 0}|${memberCountdowns}");
  });

  it("the panel still mounts from the family row on expanded-or-closing, at both dress sites", () => {
    expect(index).toContain("{(isExpanded || isClosing) && renderExpandedFamily(item.familyMembers, item.section, isClosing)}");
    expect(index.match(/<UnfurlPanel closing={closing}/g)).toHaveLength(2);
  });
});
