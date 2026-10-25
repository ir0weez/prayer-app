/**
 * v240 — "The Day Cap". Jonathan, Oct 24, 11:30 PM PDT, from a
 * screenshot of his finished Saturday (6 of 6, the green sprout
 * standing on the bar): "I'm really not a fan of that plant
 * animation… What can you put there that fits better?" Offered
 * three: a gold seal, a sun/moon cap that matches the time of day,
 * or nothing. His tap: the sun/moon cap.
 *
 * That tap also RULES the long-held design-audit item A46 — the
 * sprout's spring was held for exactly this verdict. The plant,
 * its springs, its sway, ripple and burst are gone; in their place
 * a still cap rides the fill's end wearing the sky for the hour,
 * and turns to the moon — ringed — when the day is done.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { dayCapFace, dayCapFaceFor } from "../day-cap";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("v240 — the day cap's face follows the clock (the Rest boundaries)", () => {
  it("morning 6–11 is sunrise, afternoon 11–4 is midday, evening 4–8 is sunset", () => {
    expect(dayCapFace(6, false)).toBe("sunrise");
    expect(dayCapFace(10, false)).toBe("sunrise");
    expect(dayCapFace(11, false)).toBe("midday");
    expect(dayCapFace(15, false)).toBe("midday");
    expect(dayCapFace(16, false)).toBe("sunset");
    expect(dayCapFace(19, false)).toBe("sunset");
  });

  it("night 8pm–6am is the moon, even while the day is still open", () => {
    expect(dayCapFace(20, false)).toBe("moon");
    expect(dayCapFace(23, false)).toBe("moon");
    expect(dayCapFace(0, false)).toBe("moon");
    expect(dayCapFace(5, false)).toBe("moon");
  });

  it("a finished day is the moon at ANY hour — the day has set", () => {
    expect(dayCapFace(8, true)).toBe("moon");
    expect(dayCapFace(12, true)).toBe("moon");
    expect(dayCapFace(17, true)).toBe("moon");
    expect(dayCapFace(23, true)).toBe("moon");
  });

  it("dayCapFaceFor reads the hour off the date", () => {
    expect(dayCapFaceFor(new Date(2026, 9, 24, 9, 15), false)).toBe("sunrise");
    expect(dayCapFaceFor(new Date(2026, 9, 24, 21, 5), false)).toBe("moon");
    expect(dayCapFaceFor(new Date(2026, 9, 24, 13, 0), true)).toBe("moon");
  });
});

describe("v240 — the plant is gone and the cap stands in its place", () => {
  const bar = read("components/schedule-progress-bar.tsx");

  it("no spring, sway, ripple, burst or sprout survives in the bar", () => {
    expect(bar).not.toContain("withSpring");
    expect(bar).not.toContain("sproutGrow");
    expect(bar).not.toContain("sproutSway");
    expect(bar).not.toContain("BurstParticle");
    expect(bar).not.toContain("BURST_PARTICLES");
    expect(bar).not.toContain("rippleScale");
    expect(bar).not.toContain("stemGrow");
    expect(bar).not.toContain("leafGrow");
  });

  it("the cap rides the fill tip wearing the clock's face", () => {
    expect(bar).toContain("dayCapFaceFor(new Date(), isComplete)");
    expect(bar).toContain("left: `${percentage}%`");
    expect(bar).toContain("DayCapGlyph");
  });

  it("the cap is drawn, per skin: flat suns, a blocky bit sun, a phosphor outline", () => {
    expect(bar).toContain("react-native-svg");
    expect(bar).toContain("M21 12.79A9 9 0 1 1 11.21 3"); // the crescent
    // RE-BASED in v242 (Jonathan picked Layered Sky from the
    // livelier-cap mockups, 2026-10-25): the flat CAP_SUN_FILL
    // glyphs are gone — the cap is now a sky window whose hues
    // live in SKY_STOPS / BIT_SKY_BANDS. The crescent path and
    // the per-skin drawing contract stand; schedule-cap-v242
    // pins the new window.
    expect(bar).toContain("SKY_STOPS");
    expect(bar).toContain("TERM_PANEL");
  });

  it("completion earns the cap a still gold ring — no motion of its own", () => {
    expect(bar).toContain('isComplete ? 1.5 : 1');
    expect(bar).toContain('"#E9B949"');
  });

  it("an empty day shows no cap at all", () => {
    expect(bar).toContain("total > 0 &&");
  });

  it("the layout no longer jumps 30px when the day completes", () => {
    expect(bar).not.toContain("isComplete ? 30 : 0");
    expect(bar).toContain("paddingTop: 10");
  });

  it("the fill and its glow are exactly as they were", () => {
    expect(bar).toContain("usePaperFill(percentage / 100)");
    expect(bar).toContain("useBitFill(percentage / 100)");
    expect(bar).toContain("glowAnimation");
    expect(bar).toContain('"#10B981"');
  });
});
