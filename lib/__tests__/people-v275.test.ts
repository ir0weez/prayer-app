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
 *
 * [SUPERSEDED by v282 — "Unfurl, For Real This Time" (his
 * Oct 27 08:29 device report, WITH v280 installed): the
 * maxHeight fix above passed this suite and STILL failed on
 * his phone — same screenshot, chevron up, zero members. The
 * model below simulated the panel in isolation (Yoga inside
 * the window) and resolved a real open target; the device
 * exercises the whole chain — the panel is content inside a
 * VirtualizedList cell whose list ran removeClippedSubviews
 * on Android, wrapped in a hardware texture rasterized from
 * its 0-height first frame, an exiting layout animation, and
 * a settle swap gated on a withTiming completion callback
 * reaching JS. Any gate in that chain loses the members;
 * this suite tested none of them. v282 removes the gate
 * stack: the panel is a plain View at natural layout height
 * and the roster list no longer clips subviews. The
 * panel-shape pins below are re-based to that ruling;
 * people-v282.test.ts carries the integration model. The
 * regression sweep at the bottom stands unmoved.]
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const index = read("app/(tabs)/index.tsx");
const unfurl = index.slice(index.indexOf("function UnfurlPanel"), index.indexOf("const QUEUE_TRAY_DURATION_MS"));

/**
 * The panel's target-resolution model, kept from the v275
 * suite: the window shape is EXTRACTED from the shipped
 * source, then the toggle is simulated under Yoga's layout
 * rule. Under v282 there is no window at all — no animated
 * style exists in the slice — so the content's layout height
 * is its natural height by construction, and the "target" is
 * simply that height. The model now passes trivially, which
 * is the point: visibility no longer depends on a target
 * resolving at all. (The discriminating integration model —
 * the one that calls the v275 shape NOT visible — lives in
 * people-v282.test.ts.)
 */
function simulateUnfurlTarget(source: string, naturalHeight: number): { reportedLayout: number; openTarget: number; membersVisible: boolean } {
  const animatedIdx = source.indexOf("useAnimatedStyle");
  const animated = animatedIdx >= 0 ? source.slice(animatedIdx) : "";
  const windowIsDefiniteHeight = /height:\s*\w+\.value/.test(animated);
  const reportedLayout = windowIsDefiniteHeight ? 0 : naturalHeight;
  const recorded = reportedLayout > 0 ? reportedLayout : 0;
  const openTarget = recorded <= 0 ? 0 : recorded;
  return { reportedLayout, openTarget, membersVisible: openTarget > 0 };
}

describe("v275 — the unfurl target resolves after a toggle (the livelock pin, re-based by v282)", () => {
  it("with a household's real content height, the panel's open target is that height and members are visible", () => {
    // A six-member household panel: progress head + 6 rows + the
    // Mark as Complete bar — several hundred points tall.
    const result = simulateUnfurlTarget(unfurl, 412);
    expect(result.reportedLayout).toBe(412);
    expect(result.openTarget).toBe(412);
    expect(result.membersVisible).toBe(true);
  });

  it("v282: there is no window left to clamp or cap — no animated style in the panel at all", () => {
    expect(unfurl).not.toContain("useAnimatedStyle");
    expect(unfurl).not.toContain("maxHeight: reveal.value");
    expect(unfurl).not.toContain("height: height.value");
    expect(unfurl).not.toContain("height: reveal.value");
    expect(unfurl).not.toContain("1200");
  });

  it("v282: the measured-target machinery is gone — no onLayout measurement, no runOpen guard", () => {
    expect(unfurl).not.toContain("handleContentLayout");
    expect(unfurl).not.toContain("onLayout={(event) => handleContentLayout(event.nativeEvent.layout.height)}");
    expect(unfurl).not.toContain("contentHeight.value <= 0");
    expect(unfurl).toContain("<View style={frameStyle}>");
  });
});

describe("v275 — the v267 motion contract (retired by v282: the panel is instant; the chrome keeps the clock)", () => {
  it("the panel itself carries no timing at all now — no 320ms travel, no springs, nothing to interrupt", () => {
    expect(unfurl).not.toContain("withTiming");
    expect(unfurl).not.toContain("withSpring");
    expect(unfurl).not.toContain("bounce");
    expect(unfurl).not.toContain("duration: QUEUE_TRAY_DURATION_MS");
  });

  it("no rasterize-while-moving: the hardware texture is gone with the motion", () => {
    expect(unfurl).not.toContain("renderToHardwareTextureAndroid={rasterize}");
    expect(unfurl).not.toContain("shouldRasterizeIOS={rasterize}");
    expect(unfurl).not.toContain("settleOpen");
  });

  it("no settle swap and no closing re-lock — the panel is auto height because it is plain height", () => {
    expect(unfurl).not.toContain("settled ? { opacity: 1 } : animatedStyle");
    expect(unfurl).not.toContain("reveal.value = contentHeight.value");
  });

  it("reduced motion needs no branch in the panel — instant is the only speed, for everyone", () => {
    expect(unfurl).not.toContain("AccessibilityInfo.isReduceMotionEnabled()");
    expect(unfurl).not.toContain("if (reducedMotion) {");
  });

  it("the FadeOut exit is gone — the panel unmounts plainly with its row state", () => {
    expect(unfurl).not.toContain("exiting={FadeOut.duration(180)}");
    expect(unfurl).not.toContain("FadeOut");
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
