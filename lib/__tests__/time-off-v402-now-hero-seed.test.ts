// ─────────────────────────────────────────────────────────────────────────────
// v402 — the NOW BOARDING hero takes the APP SEED's colour
// (his screenshot ask, Oct 31): the flight board's hero
// rendered in the trip family's deep step — bright violet on
// his phone — while the rest of his app derives from his
// chosen seed (blue). His words: "Can you make the time off
// now card color match the users chosen app color (like
// mines blue right now)?"
//
// The fix splits ONE helper's seats inside ClaimedRestGroup:
// the panel rows keep timeOffPassPalette (the trip family)
// byte-for-byte — his v392 addendum protected the flight
// cards' colours and this ask names the NOW card only —
// while the hero's field, its NOW pill print, the route
// line's mask, and the quiet line's step derive from the
// seed through the summary panel's own derivation
// (schedulePanelStep over the accent theme's light primary:
// the saturated seed in both appearances, stepped in HSL —
// lib/schedule-material + components/daily-summary-card v296).
// Derived, never pinned (his Oct 25 law for shipped
// surfaces); the Emergency red is the only meaning-colour
// exception in this area and is not involved here.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { getAccentThemeDefinition } from "../color-themes";
import { schedulePanelStep } from "../schedule-material";
import { timeOffPassPalette, type TimeOff } from "../time-off";
import { hexContrast } from "../skin-themes";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const timeOffTravel = read("components/time-off-travel.tsx");
const claimedGroup = timeOffTravel.slice(
  timeOffTravel.indexOf("export function ClaimedRestGroup"),
  timeOffTravel.indexOf("\n/**\n * v385 — one itinerary entry"),
);
const hero = claimedGroup.slice(
  claimedGroup.indexOf("const renderHero"),
  claimedGroup.indexOf("const renderPanel"),
);
const panel = claimedGroup.slice(
  claimedGroup.indexOf("const renderPanel"),
  claimedGroup.indexOf("if (nowIndex === -1)"),
);

const LIGHT = "#FFFFFF";
const DARK = "#14141A";

// The trip on his screenshot: a violet-stored record — the
// family whose band painted his hero violet under a blue seed.
const violetTrip: Pick<TimeOff, "color" | "type"> = { type: "vacation", color: "#7C3AED" };

function hueOf(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  if (max === r) return ((g - b) / d + (g < b ? 6 : 0)) * 60;
  if (max === g) return ((b - r) / d + 2) * 60;
  return ((r - g) / d + 4) * 60;
}

describe("v402 source — the hero resolves from the seed, the summary panel's way", () => {
  it("the seed is the accent theme's light primary, the saturated seed in both appearances", () => {
    expect(claimedGroup).toContain("const { accentTheme } = useThemeContext();");
    expect(claimedGroup).toContain(
      "const seedPrimary = getAccentThemeDefinition(accentTheme).light?.primary ?? colors.primary;",
    );
    expect(claimedGroup).toContain("const heroBand = schedulePanelStep(seedPrimary);");
  });

  it("the hero wears heroBand entire — field, NOW pill print, route mask, quiet line", () => {
    expect(hero).toContain("backgroundColor: heroBand");
    expect(hero).toContain("color: heroBand");
    expect(hero).toContain("maskColor={heroBand}");
    expect(claimedGroup).toContain('const filledQuiet = mix(heroBand, "#FFFFFF", 0.72);');
    // The white pieces were already white and stay: the pill's
    // ground, the capitals, the plane.
    expect(hero).toContain('backgroundColor: "#FFFFFF"');
    expect(hero).toContain('color: "#FFFFFF"');
    // No thread of the trip family runs through the hero.
    expect(hero).not.toContain("palette.band");
    expect(hero).not.toContain("palette.paper");
  });

  it("the hero derivation never touches the surface — one step for light and dark alike", () => {
    // colors.surface appears in the group exactly once: the
    // PANEL's trip-palette call. The hero's step is a pure
    // function of the seed (schedulePanelStep takes one arg).
    expect(claimedGroup.match(/colors\.surface/g)).toHaveLength(1);
    expect(schedulePanelStep.length).toBe(1);
  });
});

describe("v402 panels — the rows keep the trip palette byte-for-byte", () => {
  it("the panel still opens on the trip palette and wears it entire", () => {
    expect(claimedGroup).toContain("const palette = timeOffPassPalette(timeOff, colors.surface);");
    expect(panel).toContain("backgroundColor: palette.paper");
    expect(panel).toContain("planeColor={palette.band}");
    expect(panel).toContain("dotColor={mix(palette.paper, palette.band, 0.55)}");
    expect(panel).toContain("backgroundColor: palette.stub");
    expect(panel).toContain("color: palette.print");
    // The seed never leaks into a row.
    expect(panel).not.toContain("heroBand");
  });
});

describe("v402 mechanism — the step follows the seed, not the trip", () => {
  it("his blue seed: the hero is a blue step, not the violet trip's band in either appearance", () => {
    const seedPrimary = getAccentThemeDefinition("blue").light?.primary;
    expect(seedPrimary).toBe("#3B82F6");
    const heroBand = schedulePanelStep(seedPrimary as string);
    expect(heroBand).toBe("#256EE6");
    expect(hueOf(heroBand)).toBeGreaterThanOrEqual(200);
    expect(hueOf(heroBand)).toBeLessThanOrEqual(235);
    expect(heroBand).not.toBe(timeOffPassPalette(violetTrip, LIGHT).band);
    expect(heroBand).not.toBe(timeOffPassPalette(violetTrip, DARK).band);
    // The white capitals clear the pass band's own bar (3.2:1).
    expect(hexContrast("#FFFFFF", heroBand)).toBeGreaterThanOrEqual(3.2);
  });

  it("the default violet seed: the same mechanism lands back in the violet family — derivation, not a pin", () => {
    const seedPrimary = getAccentThemeDefinition("default").light?.primary;
    expect(seedPrimary).toBe("#8557D9");
    const heroBand = schedulePanelStep(seedPrimary as string);
    expect(heroBand).toBe("#7142C8");
    expect(hueOf(heroBand)).toBeGreaterThanOrEqual(250);
    expect(hueOf(heroBand)).toBeLessThanOrEqual(285);
    expect(hexContrast("#FFFFFF", heroBand)).toBeGreaterThanOrEqual(3.2);
  });

  it("another seed, another hero: a red seed steps red — the field is the seed's, whoever chose it", () => {
    const seedPrimary = getAccentThemeDefinition("red").light?.primary;
    const heroBand = schedulePanelStep(seedPrimary as string);
    const hue = hueOf(heroBand);
    expect(hue <= 15 || hue >= 345).toBe(true);
    expect(heroBand).not.toBe(schedulePanelStep(getAccentThemeDefinition("blue").light?.primary as string));
  });
});
