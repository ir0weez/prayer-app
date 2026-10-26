/**
 * v262 — "The Tray Learns to Move": Jonathan's device verdict on
 * v260/v261 (Oct 26, with a screen recording of him tapping the
 * queue card's expand chevron): "There's absolutely no animation
 * for the 'Pray today' tray. I also like the '+N' circle at the
 * end. I just wanted it to be more functional."
 *
 * Two fixes, both pinned here:
 *  1. The +N circle RETURNS at the end of the collapsed row — the
 *     pre-v260 tile, replicated (47px, pmf.wash fill, 2px dashed
 *     pmf.wash2 ring, "+{queueFaces.length − 5}" in pmf.deep, the
 *     "More" label, the blank status spacer) — but a Pressable
 *     this time, on the same toggle as the header chevron.
 *  2. The tray ANIMATES: one 320ms timing on PEOPLE_ENTRANCE_EASING
 *     drives a measured height window (so the cards below glide),
 *     the chevron's rotation, and the grid faces' staggered
 *     fade/rise. No springs, no bounce; reduced motion keeps the
 *     instant swap. The v261 footer, morph, and complete card are
 *     untouched neighbors. Governance unchanged: pmf roles only.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const index = read("app/(tabs)/index.tsx");
const queue = index.slice(index.indexOf("const renderQueueCard"), index.indexOf("const renderStreakCard"));
const tray = index.slice(index.indexOf("const [queueExpanded, setQueueExpanded]"), index.indexOf("const renderStreakCard"));

describe("v262 source pins — the +N circle returns, functional (index.tsx)", () => {
  it("the count is the faces past the first five (his 19-person day: +14)", () => {
    expect(queue).toContain("const moreCount = queueFaces.length - 5;");
    expect(queue).toContain(">+{moreCount}</Text>");
  });

  it("the tile replicates the pre-v260 original — dashed ring, wash fill, deep count, More, spacer", () => {
    expect(queue).toContain('borderStyle: "dashed"');
    expect(queue).toContain("backgroundColor: pmf.wash, borderWidth: 2, borderStyle: \"dashed\", borderColor: pmf.wash2");
    expect(queue).toContain("fontSize: 13, fontWeight: \"800\", color: pmf.deep");
    expect(queue).toContain(">More</Text>");
    expect(queue).toContain("<Text style={{ fontSize: 10 }}> </Text>");
    expect(queue).toContain("width: 47, height: 47, borderRadius: 23.5");
  });

  it("the tile is a Pressable on the shared tray toggle — not the dead v259 View", () => {
    expect(queue).toContain("accessibilityLabel=\"Show everyone on today's prayer list\"");
    expect(queue.match(/onPress={toggleQueueExpanded}/g)).toHaveLength(2);
  });

  it("the tile exists only in the collapsed branch, after the scroll row", () => {
    const tileAt = queue.indexOf("Show everyone on today's prayer list");
    expect(tileAt).toBeGreaterThan(queue.indexOf("<ScrollView horizontal"));
    expect(tileAt).toBeGreaterThan(-1);
    // collapsed-only: the string lives in exactly one place
    expect(queue.match(/Show everyone on today's prayer list/g)).toHaveLength(1);
  });

  it("the tile and its gate render only past five faces", () => {
    expect(queue.match(/\{canExpandQueue \? \(/g)?.length).toBeGreaterThanOrEqual(2);
    expect(queue).toContain("const canExpandQueue = queueFaces.length > 5;");
  });

  it("the tile introduces no pinned hexes — pmf roles only", () => {
    const tileLines = queue.split("\n").filter((line) => line.includes("moreCount") || line.includes("dashed"));
    expect(tileLines.length).toBeGreaterThan(0);
    for (const line of tileLines) {
      expect(line).not.toMatch(/#[0-9A-Fa-f]{6}/);
    }
  });
});

describe("v262 source pins — the tray animates (index.tsx)", () => {
  it("one duration, one curve family — the people-entrance easing, 320ms", () => {
    expect(index).toContain("const QUEUE_TRAY_DURATION_MS = 320;");
    expect(tray).toContain("RnEasing.bezier(...PEOPLE_ENTRANCE_EASING)");
    expect(tray).toContain("duration: QUEUE_TRAY_DURATION_MS");
  });

  it("both motions are timings on shared values — height and progress", () => {
    expect(tray).toContain("Animated.timing(queueTrayHeight, {");
    expect(tray).toContain("Animated.timing(queueTrayProgress, {");
    expect(tray).toContain("useNativeDriver: false");
  });

  it("the tray window clips and its height is the animated value while locked", () => {
    expect(queue).toContain('overflow: "hidden"');
    expect(queue).toContain("queueTrayHeightLocked ? { height: queueTrayHeight } : null");
  });

  it("the incoming content measures itself — onLayout feeds the pending animation", () => {
    expect(queue.match(/handleQueueTrayContentLayout\(event\.nativeEvent\.layout\.height\)/g)).toHaveLength(2);
    expect(tray).toContain("queueTrayPendingRef");
    expect(tray).toContain("queueTrayRowHeightRef");
  });

  it("the toggle reverses from current — in-flight motions are stopped, values kept", () => {
    expect(tray).toContain("queueTrayHeightAnimRef.current?.stop();");
    expect(tray).toContain("queueTrayProgressAnimRef.current?.stop();");
    expect(tray).toContain("if (!queueTrayAnimatingRef.current && queueTrayRowHeightRef.current > 0) {");
  });

  it("the chevron rotates on the shared progress — one glyph, 0deg to 180deg", () => {
    expect(queue).toContain("rotate: queueTrayProgress.interpolate");
    expect(queue).toContain('outputRange: ["0deg", "180deg"]');
    expect(queue).toContain("name=\"expand-more\"");
    expect(queue).not.toContain("expand-less");
  });

  it("grid faces stagger in on per-face slices of the shared progress", () => {
    expect(queue).toContain("PEOPLE_ENTRANCE_STAGGER_CAP");
    expect(queue).toContain("staggerRange");
    expect(queue).toContain("opacity: queueTrayProgress.interpolate");
    expect(queue).toContain("outputRange: [PEOPLE_ENTRANCE_RISE, 0]");
  });

  it("reduced motion keeps the instant swap — the codebase's AccessibilityInfo pattern", () => {
    expect(tray).toContain("AccessibilityInfo.isReduceMotionEnabled()");
    expect(tray).toContain("reduceMotionChanged");
    expect(tray).toContain("if (queueTrayReducedMotion) {");
    expect(tray).toContain("queueTrayProgress.setValue(next ? 1 : 0);");
  });
});

describe("v262 source pins — the neighbors are untouched (index.tsx)", () => {
  it("the v261 footer still sits under the tray, labels intact", () => {
    expect(queue).toContain("{Math.max(0, total - prayed)} left");
    expect(queue).toContain('prayed > 0 ? "Keep praying" : "Start praying"');
    expect(queue).toContain("card.measureInWindow((x, y, width, height) => {");
  });

  it("the v261 complete-card swap still precedes the tray", () => {
    expect(queue).toContain("if (total > 0 && prayed >= total) {");
    expect(queue).toContain("return renderQueueCompleteCard(prayed, total);");
  });
});
