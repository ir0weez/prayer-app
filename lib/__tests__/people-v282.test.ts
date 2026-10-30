/**
 * v282 — "Unfurl, For Real This Time": Jonathan's device report
 * (Oct 27 08:29, WITH v280 installed — v280 contains the v275
 * fix): "You still didn't fix the dropdowns..." The screenshot
 * is the original failure, unchanged: Roberts Family, chevron
 * UP, zero member rows beneath it.
 *
 * THE REAL RENDER PATH (traced end to end in
 * app/(tabs)/index.tsx — this is what the v275 suite never
 * modeled):
 *   FlatList (the roster; windowSize 5, initialNumToRender 4)
 *     → renderItem → RosterRowShell (React.memo, fingerprint)
 *       → renderPeopleFamilyRow: <View>{header}{(isExpanded ||
 *         isClosing) && renderExpandedFamily(...)}</View>
 *         → UnfurlPanel (v275: a Reanimated.View)
 * The header DID re-render on his phone — the chevron is up in
 * the screenshot, and the chevron lives in the header — so the
 * toggle, the state, the fingerprint, and the mount condition
 * all fired. The panel element was in the tree. What never
 * reached pixels was its HEIGHT, and the panel's visible
 * height on device is decided by a chain the v275 model
 * (which simulated Yoga inside the panel alone) never touched:
 *   1. a Reanimated animated style starting at maxHeight 0 /
 *      opacity 0, driven from the UI thread;
 *   2. renderToHardwareTextureAndroid starting TRUE — a
 *      hardware texture rasterized from the panel's 0-height
 *      first frame;
 *   3. an `exiting` layout animation (FadeOut) on the same
 *      view;
 *   4. a settle step that swaps the animated style for plain
 *      auto height ONLY if a withTiming completion callback
 *      crosses back to JS (runOnJS) — an interruptible,
 *      losable handoff;
 *   5. and around all of it, the roster FlatList's
 *      removeClippedSubviews on Android, whose clipping works
 *      from the cell's RECORDED frame — for an untouched
 *      household, the header alone. A cell that grows after
 *      mount is the documented broken case for that machinery.
 * Four-to-five gates, any one of which leaves the members laid
 * out but invisible — exactly his screenshot, twice in a row
 * (v267's definite-height window, then v275's cap).
 *
 * THE FIX (function first, per the ruling): the gate stack is
 * GONE. UnfurlPanel is a plain View — no shared values, no
 * animated style, no maxHeight, no opacity gate, no hardware
 * texture, no exiting animation, no onLayout measurement, no
 * settle state — and the roster FlatList no longer removes
 * clipped subviews. The panel's height is its children's
 * layout height in the same pass as the rest of the page.
 * Expand/collapse is INSTANT (the stated trade-off); the
 * chevron's 320ms turn and the header fill's pour — the motion
 * that never broke — are untouched.
 *
 * THE MODEL BELOW works at the integration level the device
 * exercises: it extracts the panel's gate factors AND the
 * list's clipping flag from the shipped source, and resolves
 * member visibility through the whole chain. Fed the v275-era
 * shape, it resolves NOT visible; fed the shipped shape, it
 * resolves visible — the discrimination the v275 model (panel
 * in isolation, visibility = open target > 0) could not make.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const index = read("app/(tabs)/index.tsx");
const unfurl = index.slice(index.indexOf("function UnfurlPanel"), index.indexOf("const QUEUE_TRAY_DURATION_MS"));
const rosterList = index.slice(index.indexOf("const renderPeopleScreen"), index.indexOf("const renderSimpleScreen"));
const chevron = index.slice(index.indexOf("function FamilyChevron"), index.indexOf("const rosterRefIds = new WeakMap"));

type GateChain = {
  animatedWindow: boolean;
  opacityGate: boolean;
  hardwareTexture: boolean;
  exitingAnimation: boolean;
  settleHandoff: boolean;
  listClipsSubviews: boolean;
};

function gateChainOf(panelSource: string, listSource: string): GateChain {
  return {
    animatedWindow: panelSource.includes("useAnimatedStyle") && (panelSource.includes("maxHeight:") || panelSource.includes("height:")),
    opacityGate: panelSource.includes("opacity.value") || panelSource.includes("opacity: opacity"),
    hardwareTexture: panelSource.includes("renderToHardwareTextureAndroid"),
    exitingAnimation: panelSource.includes("exiting={"),
    settleHandoff: panelSource.includes("runOnJS(settleOpen)") || panelSource.includes("settled ? { opacity: 1 }"),
    listClipsSubviews: /removeClippedSubviews=\{(?!false)/.test(listSource),
  };
}

function membersVisible(chain: GateChain): boolean {
  return !Object.values(chain).some(Boolean);
}

/** The v275-era integration shape, reconstructed from that
 * build's shipped source (people-v275.test.ts pins it line by
 * line): the model must call this NOT visible — it is the
 * shape that failed on his phone. */
const v275Shape = {
  panel: [
    "const animatedStyle = useAnimatedStyle(() => ({",
    "    maxHeight: reveal.value,",
    "    opacity: opacity.value,",
    "  }));",
    "      if (finished) runOnJS(settleOpen)();",
    "      style={[frameStyle, settled ? { opacity: 1 } : animatedStyle, { overflow: \"hidden\" }]}",
    "      renderToHardwareTextureAndroid={rasterize}",
    "      exiting={FadeOut.duration(180)}",
  ].join("\n"),
  list: "removeClippedSubviews={Platform.OS === \"android\"}",
};

describe("v282 — the integration model discriminates the failing shape", () => {
  it("the v275-era chain (animated window + texture + exit + settle handoff + list clipping) resolves NOT visible", () => {
    const chain = gateChainOf(v275Shape.panel, v275Shape.list);
    expect(chain.animatedWindow).toBe(true);
    expect(chain.hardwareTexture).toBe(true);
    expect(chain.listClipsSubviews).toBe(true);
    expect(membersVisible(chain)).toBe(false);
  });

  it("the shipped chain has no gates left — members resolve visible through the whole path", () => {
    const chain = gateChainOf(unfurl, rosterList);
    expect(chain).toEqual({
      animatedWindow: false,
      opacityGate: false,
      hardwareTexture: false,
      exitingAnimation: false,
      settleHandoff: false,
      listClipsSubviews: false,
    });
    expect(membersVisible(chain)).toBe(true);
  });
});

describe("v282 — the panel is plain layout (index.tsx)", () => {
  it("v362: the frame style rides the clipping window; the padded content view rides inside it, measured", () => {
    // RE-BASED in v362 (his Oct 30 verdict — the travel returns,
    // on the tray's rails): the outer plain View is now an
    // Animated.View window carrying the same frame style, and
    // the padded content View reports its natural height from
    // inside it. The accounting is unchanged: padding inside,
    // frame outside. people-v362.test.ts pins the window.
    expect(unfurl).toContain("<Animated.View style={[frameStyle, { overflow: \"hidden\" }, heightLocked ? { height: windowHeight } : null]}>");
    expect(unfurl).toContain("const { paddingTop, paddingBottom, ...frameStyle } = outerStyle ?? {};");
    expect(unfurl).toContain("<View onLayout={(event) => handlePanelContentLayout(event.nativeEvent.layout.height)} style={{ paddingTop, paddingBottom }}>");
  });

  it("no animated window survives: no shared values, no animated style, no maxHeight, no timing", () => {
    expect(unfurl).not.toContain("useSharedValue");
    expect(unfurl).not.toContain("useAnimatedStyle");
    expect(unfurl).not.toContain("withTiming");
    expect(unfurl).not.toContain("maxHeight");
    expect(unfurl).not.toContain("1200");
  });

  it("no rasterized texture, no exiting animation, no settle state (v362: the tray-style content report is the one measurement that returns)", () => {
    expect(unfurl).not.toContain("renderToHardwareTextureAndroid");
    expect(unfurl).not.toContain("shouldRasterizeIOS");
    expect(unfurl).not.toContain("exiting={");
    expect(unfurl).not.toContain("FadeOut");
    // v362: onLayout is back — but on the NEVER-constrained
    // content child (the v262 tray's exact seat), not measured
    // from inside a definite animated box; the v267 livelock
    // came from a child its definite parent had clamped, and
    // this window's height never constrains the content's
    // layout. The retired handler name stays retired, and the
    // panel still holds no reduced-motion subscription of its
    // own (the screen's tray subscription feeds it as a prop).
    expect(unfurl).not.toContain("handleContentLayout");
    expect(unfurl).not.toContain("settleOpen");
    expect(unfurl).not.toContain("AccessibilityInfo");
  });

  it("the roster list no longer removes clipped subviews", () => {
    expect(rosterList).toContain("removeClippedSubviews={false}");
    expect(rosterList).not.toContain('removeClippedSubviews={Platform.OS === "android"}');
  });
});

describe("v282 — the mount path and the surviving motion are untouched", () => {
  it("the family row still mounts the panel on expanded-or-closing, at both dress sites", () => {
    expect(index).toContain("{(isExpanded || isClosing) && renderExpandedFamily(item.familyMembers, item.section, isClosing)}");
    expect(index.match(/<UnfurlPanel closing={closing}/g)).toHaveLength(2);
  });

  it("the chevron still turns on the 320ms Material clock, and the header fill still pours", () => {
    expect(chevron).toContain("duration: QUEUE_TRAY_DURATION_MS,");
    expect(index).toContain("cardFillProgress.value = withTiming(1, { duration: QUEUE_TRAY_DURATION_MS, easing: fillEasing });");
    expect(index).toContain("cardFillProgress.value = withTiming(0, { duration: QUEUE_TRAY_DURATION_MS, easing: fillEasing });");
  });

  it("the toggle lifecycle stands: closing keeps the panel mounted until the close timeout clears state", () => {
    const toggle = index.slice(index.indexOf("const toggleFamilyExpanded"), index.indexOf("const [familyActionMembers"));
    expect(toggle).toContain("setClosingFamilyId(familyId);");
    expect(toggle).toContain("setExpandedFamilyId(null);");
    expect(toggle).toContain("}, 400);");
  });
});
