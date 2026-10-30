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
//
// v367 amendment (Oct 30, later the same day): Jonathan's
// device verdict on this build's travel was "slow and laggy."
// The 300ms window, the closing state, its completion callback,
// and the 400ms fallback are all retired below; FamilyPanel is
// plain layout and expansion is an immediate mount/unmount.
// people-v367-instant-family.test.ts carries the new pins.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const index = readFileSync(join(__dirname, "..", "..", "app", "(tabs)", "index.tsx"), "utf8");
const unfurl = index.slice(index.indexOf("function FamilyPanel"), index.indexOf("type AppSettings = {"));
const expandedFamily = index.slice(index.indexOf("const renderExpandedFamily"), index.indexOf("const renderPeopleSectionRow"));

describe("v362 — the panel is a clipping window on the queue tray's pattern (superseded by v367)", () => {
  it("v367: the 300ms RN Animated height is gone — the panel is one plain View", () => {
    expect(index).not.toContain("const FAMILY_PANEL_DURATION_MS = 300;");
    expect(unfurl).toContain("<View style={[frameStyle, { overflow: \"hidden\" }]}>");
    expect(unfurl).not.toContain("Animated.View");
    expect(unfurl).not.toContain("Animated.timing");
    expect(unfurl).not.toContain("windowHeight");
  });

  it("v367: the panel does not clip by height or measure its content", () => {
    expect(unfurl).not.toContain("heightLocked");
    expect(unfurl).not.toContain("onLayout");
    expect(unfurl).not.toContain("naturalHeightRef");
    expect(unfurl).toContain("<View style={{ paddingTop, paddingBottom }}>");
  });

  it("v367: no close completion exists to report — mount state is the whole lifecycle", () => {
    expect(unfurl).not.toContain("onClosed");
    expect(unfurl).not.toContain("onClosedRef");
    expect(unfurl).not.toContain("runWindowTo");
    expect(index).not.toContain("closingFamilyId");
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

  it("v367: the panel takes no reduced-motion or closing props — instant is unconditional", () => {
    expect(unfurl).toContain("function FamilyPanel({ children, outerStyle }");
    expect(unfurl).not.toContain("AccessibilityInfo");
    expect(unfurl).not.toContain("reducedMotion");
    expect(unfurl).not.toContain("closing?:");
  });
});

describe("v362 — the parent wiring: the fold clears the state, the timeout only sweeps up (superseded by v367)", () => {
  it("v367: both dresses render the plain panel with no closing, reduced-motion, or callback props", () => {
    const callSites = index.match(/<FamilyPanel outerStyle=/g) ?? [];
    expect(callSites.length).toBe(2);
    expect(index).not.toContain("onClosed={() => handleFamilyPanelClosed(familyId)}");
    expect(index).not.toContain("reducedMotion={queueTrayReducedMotion} onClosed=");
  });

  it("v367: there is no completion handler or closing-state mirror left to clear", () => {
    expect(index).not.toContain("const handleFamilyPanelClosed");
    expect(index).not.toContain("closingFamilyIdRef");
    expect(index).not.toContain("closingFamilyId");
  });

  it("v367: the toggle has no 400ms fallback — it directly flips the expanded identity", () => {
    const toggle = index.slice(index.indexOf("const toggleFamilyExpanded"), index.indexOf("const [familyActionMembers"));
    expect(toggle).toContain("setExpandedFamilyId(null);");
    expect(toggle).toContain("setExpandedFamilyId(familyId);");
    expect(toggle).not.toContain("setTimeout");
    expect(toggle).not.toContain("}, 400);");
  });

  it("v367: the mount condition is exactly the expanded state", () => {
    expect(index).toContain("{isExpanded && renderExpandedFamily(item.familyMembers, item.section)}");
  });
});

describe("v362 — the members carry no motion of their own (v367: plain layout presents them at once)", () => {
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
