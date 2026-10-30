// ─── v362 — the group unfurl travels again, on the tray's rails ────────────
// Jonathan's Oct 30 verdict, with a screen recording: "The opening
// and closing animation for the groups is slow and very delayed (it
// also don't look very animated)." What the recording shows, in the
// v360 code: (1) the panel itself (v282) had NO travel — it snapped
// to full height in one layout pass, so the list lurched and
// sibling rows' entrance fades replayed as cells re-measured;
// (2) the classic dress's member rows ghosted in on their own
// FadeInUp stagger, 65ms × index + 280ms — the last of eight lands
// ~¾s after the tap, opacity-led, reading as a late fade rather
// than an opening; (3) closing hung a dead 400ms with the panel
// frozen fully open, then snapped shut.
//
// The fix borrows the one mechanism in this file that has never
// failed on his phone — the v262 queue tray's: a plain RN Animated
// (JS-thread) height on a clipping window whose content is NEVER
// height-constrained (it reports its natural height from inside,
// so no measurement can clamp — the v267 livelock cannot recur),
// one 300ms timing on the Material standard easing, reversible
// mid-flight, unlocking to auto height at rest, and the fold
// reporting its own completion so the old 400ms timeout is now
// only a fallback. NONE of the v275 gate stack returns: no
// Reanimated, no hardware texture, no exiting animation, no
// opacity gate — the members are laid out and opaque at every
// height of the window; the travel is the only motion. The member
// rows' own stagger is gone: the window reveals them. The roster
// skeleton (groups, nesting, +N circle) and the header's wavy
// thread are untouched — people-v282/v284 keep those pins.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const index = readFileSync(join(__dirname, "..", "..", "app", "(tabs)", "index.tsx"), "utf8");
const unfurl = index.slice(index.indexOf("function UnfurlPanel"), index.indexOf("const QUEUE_TRAY_DURATION_MS"));
const expandedFamily = index.slice(index.indexOf("const renderExpandedFamily"), index.indexOf("const renderPeopleSectionRow"));

describe("v362 — the panel is a clipping window on the queue tray's pattern", () => {
  it("one RN Animated height, 300ms, Material standard easing, JS driver", () => {
    expect(index).toContain("const FAMILY_PANEL_DURATION_MS = 300;");
    expect(unfurl).toContain("Animated.timing(windowHeight");
    expect(unfurl).toContain("duration: FAMILY_PANEL_DURATION_MS");
    expect(unfurl).toContain("RnEasing.bezier(0.2, 0, 0, 1)");
    expect(unfurl).toContain("useNativeDriver: false");
  });

  it("the window clips; the content is never height-constrained and reports its natural height", () => {
    expect(unfurl).toContain('<Animated.View style={[frameStyle, { overflow: "hidden" }, heightLocked ? { height: windowHeight } : null]}>');
    expect(unfurl).toContain("onLayout={(event) => handlePanelContentLayout(event.nativeEvent.layout.height)}");
    expect(unfurl).toContain("naturalHeightRef.current = height;");
  });

  it("the open unlocks to auto height at rest; the close reports its own completion", () => {
    expect(unfurl).toContain("if (!closingRef.current) setLocked(false);");
    expect(unfurl).toContain("onClosedRef.current?.();");
    expect(unfurl).toContain("runWindowTo(0, () => {");
  });

  it("none of the retired machinery returns — no Reanimated, no texture, no exiting gate, no opacity gate", () => {
    expect(unfurl).not.toContain("useAnimatedStyle");
    expect(unfurl).not.toContain("useSharedValue");
    expect(unfurl).not.toContain("withTiming");
    expect(unfurl).not.toContain("withSpring");
    expect(unfurl).not.toContain("renderToHardwareTextureAndroid");
    expect(unfurl).not.toContain("exiting={");
    expect(unfurl).not.toContain("opacity");
  });

  it("reduced motion arrives as a prop from the screen's tray subscription — the panel subscribes to nothing", () => {
    expect(unfurl).toContain("closing, reducedMotion, onClosed }");
    expect(unfurl).not.toContain("AccessibilityInfo");
    expect(unfurl).toContain("reducedMotionRef.current");
  });
});

describe("v362 — the parent wiring: the fold clears the state, the timeout only sweeps up", () => {
  it("both dresses pass the reduced-motion flag and the close callback", () => {
    const callSites = index.match(/<UnfurlPanel closing={closing} reducedMotion={queueTrayReducedMotion} onClosed={/g) ?? [];
    expect(callSites.length).toBe(2);
  });

  it("the completion handler clears the expanded/closing state and cancels the fallback timeout", () => {
    expect(index).toContain("const handleFamilyPanelClosed = useCallback((familyId: string) => {");
    expect(index).toContain("if (closingFamilyIdRef.current !== familyId) return;");
    expect(index).toContain("closingFamilyIdRef.current = familyId;");
  });

  it("the toggle's 400ms timeout survives as the fallback (the v282 pin's shape is unchanged)", () => {
    const toggle = index.slice(index.indexOf("const toggleFamilyExpanded"), index.indexOf("const handleFamilyPanelClosed"));
    expect(toggle).toContain("}, 400);");
    expect(toggle).toContain("setClosingFamilyId(familyId);");
  });

  it("the mount condition is unchanged — the panel still lives exactly in the expanded-or-closing window", () => {
    expect(index).toContain("{(isExpanded || isClosing) && renderExpandedFamily(item.familyMembers, item.section, isClosing)}");
  });
});

describe("v362 — the members carry no motion of their own; the window reveals them", () => {
  it("the 65ms-per-row FadeInUp stagger is gone from the whole file", () => {
    expect(index).not.toContain("delay(memberIdx * 65)");
    expect(index).not.toContain("memberIdx * 65");
  });

  it("nothing inside the expanded panel enters with an animation", () => {
    expect(expandedFamily).not.toContain("entering=");
  });

  it("what the panel shows is unchanged — progress head, member rows, Mark as Complete all still render", () => {
    expect(expandedFamily).toContain("Mark as Complete");
    expect(expandedFamily).toContain("familyMembers.map((member, memberIdx)");
  });
});
