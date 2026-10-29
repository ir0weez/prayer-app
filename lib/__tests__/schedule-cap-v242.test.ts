/**
 * v242 — "Layered Sky". Jonathan, Oct 25, from the livelier-cap
 * mockups (day-cap-lively-v1.html, three concepts offered after
 * his "I was expecting a better sun and moon. Something more
 * lively..."): "I think I like Layered Sky the most."
 *
 * The v240 cap's flat face is replaced by a tiny round WINDOW
 * into the sky: the sky inside changes with the same hour states
 * (lib/day-cap's faces, unchanged), the sun/moon travels an arc
 * across the window, and a finished day still shows the moon in
 * a gold ring — the day has set. Per skin the window speaks its
 * dialect: Classic gradients, Paper flat bands, 8-bit pixel
 * bands, Terminal phosphor line-art. The fill, its glow pulse
 * and the bar layout are exactly v240's.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DAY_CAP_ARC, DAY_CAP_STARS, dayCapArc, dayCapFace, dayCapSky } from "../day-cap";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("v242 — each face names its sky, and completion is always night", () => {
  it("sunrise → dawn, midday → noon, sunset → dusk, moon → night", () => {
    expect(dayCapSky("sunrise")).toBe("dawn");
    expect(dayCapSky("midday")).toBe("noon");
    expect(dayCapSky("sunset")).toBe("dusk");
    expect(dayCapSky("moon")).toBe("night");
  });

  it("a finished day is the night sky at ANY hour — the v240 rule, kept", () => {
    for (const hour of [0, 6, 9, 12, 15, 18, 21, 23]) {
      expect(dayCapSky(dayCapFace(hour, true))).toBe("night");
    }
  });
});

describe("v242 — the sun and moon ride an arc inside the window", () => {
  it("dawn sits the sun low-left, midday high-center, dusk low-right", () => {
    const dawn = dayCapArc("sunrise");
    const noon = dayCapArc("midday");
    const dusk = dayCapArc("sunset");
    expect(dawn.x).toBeLessThan(14);
    expect(dawn.y).toBeGreaterThan(14);
    expect(noon.x).toBe(14);
    expect(noon.y).toBeLessThan(14);
    expect(dusk.x).toBeGreaterThan(14);
    expect(dusk.y).toBeGreaterThan(14);
  });

  it("the moon rides the upper right of the night window", () => {
    const moon = dayCapArc("moon");
    expect(moon.x).toBeGreaterThan(14);
    expect(moon.y).toBeLessThan(14);
  });

  it("every face parks its body at a distinct stop", () => {
    const stops = Object.values(DAY_CAP_ARC).map((p) => `${p.x},${p.y}`);
    expect(new Set(stops).size).toBe(4);
  });

  it("the night window carries three star specks, clear of the moon", () => {
    expect(DAY_CAP_STARS).toHaveLength(3);
    const moon = dayCapArc("moon");
    for (const star of DAY_CAP_STARS) {
      const dx = star.x - moon.x;
      const dy = star.y - moon.y;
      expect(Math.sqrt(dx * dx + dy * dy)).toBeGreaterThan(7);
    }
  });
});

describe("v242 — the sky window is drawn, per skin, in the bar", () => {
  const bar = read("components/schedule-progress-bar.tsx");

  it("the window is 28px, clipped, and still rides the fill tip", () => {
    expect(bar).toContain("const CAP_SIZE = 28");
    expect(bar).toContain("width: CAP_SIZE");
    expect(bar).toContain('overflow: "hidden"');
    expect(bar).toContain("left: `${percentage}%`");
    expect(bar).toContain("paddingTop: 10");
  });

  it("Classic: a smooth gradient sky per state, mockup hues", () => {
    expect(bar).toContain("SKY_STOPS");
    expect(bar).toContain("LinearGradient");
    expect(bar).toContain("#FFC98F"); // dawn peach
    expect(bar).toContain("#AEDCF2"); // midday blue
    expect(bar).toContain("#E2703A"); // dusk amber-deep
    expect(bar).toContain("#241A45"); // night plum
    expect(bar).toContain("SUN_GRADIENT");
    expect(bar).toContain("CapCloud");
  });

  it("Classic's only cap motion is the calm star twinkle", () => {
    expect(bar).toContain("TwinkleStars");
    expect(bar).toContain("Easing.inOut(Easing.ease)");
    expect(bar).not.toContain("withSpring");
  });

  it("Paper: the sky dealt as flat cut-paper bands, flat sun inks", () => {
    expect(bar).toContain("PAPER_SKY_BANDS");
    expect(bar).toContain("PAPER_SUN_FILL");
  });

  it("8-bit: four pixel bands, a square sun, a stepped crescent", () => {
    expect(bar).toContain("BIT_SKY_BANDS");
    expect(bar).toContain("BIT_MOON_ROWS");
    expect(bar).toContain("BIT_GOLD");
  });

  it("Terminal: phosphor line-art on the panel — outline body, plus-mark stars", () => {
    expect(bar).toContain("TERM_PANEL");
    expect(bar).toContain('stroke={TERM_PHOS}');
    expect(bar).toContain("CapMoon");
  });

  it("the celestial body is placed by the arc, not hard-coded per glyph", () => {
    expect(bar).toContain("dayCapSky(face)");
    expect(bar).toContain("dayCapArc(face)");
    expect(bar).toContain("DAY_CAP_STARS");
  });

  it("the v240 flat glyphs are gone", () => {
    expect(bar).not.toContain("CAP_SUN_FILL");
    expect(bar).not.toContain("CAP_SUN_RAY");
    expect(bar).not.toContain("CAP_MOON_FILL");
    // The v240 flat midday sun drew its rays as 24-grid lines
    // around a centered disc — the window draws no such glyph.
    expect(bar).not.toContain("x1={12} y1={3.4}");
    expect(bar).not.toContain("cx={12} cy={13.5}");
  });

  it("completion still earns the still gold ring — size never changes", () => {
    expect(bar).toContain('isComplete ? 1.5 : 1');
    expect(bar).toContain('"#E9B949"');
  });

  it("the fill and its glow are exactly as v240 left them", () => {
    // RE-BASED in v339 (Jonathan's wavy ruling): the Paper soak and
    // 8-bit stepped fills retired — the fill is the shared wavy bar
    // in this seat's per-skin colours. The completion glow and its
    // green are exactly as v240 left them.
    expect(bar).toContain("WavyProgress");
    expect(bar).not.toContain("usePaperFill(percentage / 100)");
    expect(bar).not.toContain("useBitFill(percentage / 100)");
    expect(bar).toContain("glowAnimation");
    expect(bar).toContain('"#10B981"');
  });
});
