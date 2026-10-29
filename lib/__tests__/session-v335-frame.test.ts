/**
 * v335 — the Pray Today session frame fix. Jonathan (Oct 29,
 * screenshot 10910): on the Classic-skin "Start praying" morph the
 * session "doesn't fit on the page properly" — the fixed Complete
 * bar's button is clipped by the screen's bottom edge.
 *
 * Root cause (read-only investigation, HEAD f855c9f): the morph
 * root's inner stage was framed one top-inset too low. The outer
 * container lands on the window at rest (its parent is
 * ScreenContainer's SafeAreaView content, whose origin sits at
 * window y = insets.top, and the outer's rest top is -insets.top),
 * but the inner stage's rest top was +insets.top — so the stage
 * spanned window [insets.top, insets.top + win.height] and the
 * window-sized body lost insets.top − max(22, insets.bottom + 12)
 * ≈ 14–18dp at the bottom on his Pixel (tall top inset, ~24dp
 * gesture bottom). Pre-v310 the controls lived in the scroll and
 * the error only cost scroll room; v310's fixed footer is what it
 * lands on now.
 *
 * The fix is the morph root only: the inner stage's left/top rest
 * endpoints become 0 and its start endpoints absorb the insets, so
 * the stage is window-fixed at EVERY morph progress value and the
 * body's existing inset paddings (ScrollView top, footer bottom)
 * apply exactly once — as they already do in the Modal root, which
 * is byte-untouched, as is the body.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const session = read("components/prayer-session.tsx");
const morphBlock = session.slice(
  session.indexOf("if (morphActive && morphOrigin) {"),
  session.indexOf('<Modal visible={visible} animationType="fade"'),
);

describe("v335 source pins — the morph root's inner stage endpoints", () => {
  it("the inner stage's left rests at 0, its start absorbing the left inset", () => {
    expect(morphBlock).toContain(
      "left: morphProgress.interpolate({ inputRange: [0, 1], outputRange: [-(startLeft + insets.left), 0] })",
    );
  });

  it("the inner stage's top rests at 0, its start absorbing the top inset", () => {
    expect(morphBlock).toContain(
      "top: morphProgress.interpolate({ inputRange: [0, 1], outputRange: [-(startTop + insets.top), 0] })",
    );
  });

  it("the old safe-area-fixed endpoints are gone", () => {
    expect(morphBlock).not.toContain("outputRange: [-startLeft, insets.left]");
    expect(morphBlock).not.toContain("outputRange: [-startTop, insets.top]");
  });

  it("the outer container's endpoints are unchanged — it already lands on the window", () => {
    expect(morphBlock).toContain(
      "left: morphProgress.interpolate({ inputRange: [0, 1], outputRange: [startLeft, -insets.left] })",
    );
    expect(morphBlock).toContain(
      "top: morphProgress.interpolate({ inputRange: [0, 1], outputRange: [startTop, -insets.top] })",
    );
  });

  it("the body still applies the insets exactly once — the fix was NOT made in the body", () => {
    expect(session).toContain("paddingTop: insets.top + 14");
    expect(session).toContain("paddingBottom: Math.max(22, insets.bottom + 12)");
  });
});

describe("v335 geometry — the composed stage is window-fixed", () => {
  // The endpoint expressions as written in the morph root, composed
  // the way the runtime composes them: the overlay's parent
  // (SafeAreaView content) has its origin at the window's safe-area
  // corner; the outer container interpolates startTop → -insets.top
  // relative to that parent; the inner stage interpolates
  // -(startTop + insets.top) → 0 relative to the outer. The stage's
  // window offset is the sum of the three.
  const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

  const stageWindowOffset = (
    parentOrigin: number,
    outerStart: number,
    outerRest: number,
    innerStart: number,
    innerRest: number,
    p: number,
  ) => parentOrigin + lerp(outerStart, outerRest, p) + lerp(innerStart, innerRest, p);

  // His Pixel's class: a tall top inset (status bar + cutout) and a
  // ~24dp gesture-nav bottom inset; the queue card measured partway
  // down the window.
  const insets = { top: 50, bottom: 24, left: 0 };
  const morphOrigin = { x: 16, y: 640 };
  const startTop = morphOrigin.y - insets.top;
  const startLeft = morphOrigin.x - insets.left;
  const win = { width: 420, height: 950 };

  it("the stage top sits at window 0 at every morph progress value", () => {
    for (const p of [0, 0.25, 0.5, 0.75, 1]) {
      const offset = stageWindowOffset(
        insets.top,
        startTop,
        -insets.top,
        -(startTop + insets.top),
        0,
        p,
      );
      expect(offset).toBe(0);
    }
  });

  it("the stage left sits at window 0 at rest", () => {
    const offset = stageWindowOffset(
      insets.left,
      startLeft,
      -insets.left,
      -(startLeft + insets.left),
      0,
      1,
    );
    expect(offset).toBe(0);
  });

  it("at rest the stage spans [0, win.height] — the Complete bar keeps its full footer", () => {
    const top = stageWindowOffset(insets.top, startTop, -insets.top, -(startTop + insets.top), 0, 1);
    expect(top).toBe(0);
    expect(top + win.height).toBe(win.height);
    // The old framing, for the record: rest top +insets.top put the
    // stage's bottom insets.top past the window's bottom edge, and
    // the footer's own bottom padding absorbed only part of it.
    const oldTop = stageWindowOffset(insets.top, startTop, -insets.top, -startTop, insets.top, 1);
    expect(oldTop).toBe(insets.top);
    expect(insets.top - Math.max(22, insets.bottom + 12)).toBe(14);
  });
});
