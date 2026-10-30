import { describe, expect, it } from "vitest";
import { ACCENT_THEMES, getThemedPalette, getUnlockedAccentThemeIds, normalizeAccentThemeId } from "./color-themes";

describe("accent color themes", () => {
  it("contains the requested theme order and unlock levels", () => {
    expect(ACCENT_THEMES.map((theme) => [theme.id, theme.unlockLevel])).toEqual([
      ["default", 1],
      // v360: the plain primaries stand with the basics at
      // level 1 (see lib/color-themes.ts); every existing theme
      // keeps its place and level.
      ["red", 1],
      ["yellow", 1],
      ["blue", 1],
      ["sky", 5],
      ["ocean", 10],
      ["teal", 15],
      ["forest", 20],
      ["sunset", 30],
      ["pomegranate", 40],
      ["crimson", 50],
      ["lavender", 60],
      ["midnight", 75],
      ["charcoal-gold", 100],
    ]);
  });

  it("unlocks themes cumulatively from the stored XP level", () => {
    // v360: red/yellow/blue are level-1 basics, so they ride
    // every list from the start; the gated themes unlock exactly
    // as before.
    expect(getUnlockedAccentThemeIds(1)).toEqual(["default", "red", "yellow", "blue"]);
    expect(getUnlockedAccentThemeIds(5)).toEqual(["default", "red", "yellow", "blue", "sky"]);
    expect(getUnlockedAccentThemeIds(10)).toEqual(["default", "red", "yellow", "blue", "sky", "ocean"]);
    expect(getUnlockedAccentThemeIds(15)).toEqual(["default", "red", "yellow", "blue", "sky", "ocean", "teal"]);
    expect(getUnlockedAccentThemeIds(30)).toEqual(["default", "red", "yellow", "blue", "sky", "ocean", "teal", "forest", "sunset"]);
    expect(getUnlockedAccentThemeIds(50)).toEqual(["default", "red", "yellow", "blue", "sky", "ocean", "teal", "forest", "sunset", "pomegranate", "crimson"]);
    expect(getUnlockedAccentThemeIds(75)).toContain("midnight");
    expect(getUnlockedAccentThemeIds(100)).toContain("charcoal-gold");
  });

  it("the plain primaries carry the schedule family's exact hexes (v360)", () => {
    // The Studio mirror pass shipped these same hexes — the
    // app swatch and the Studio chip must be the identical colour.
    const byId = Object.fromEntries(ACCENT_THEMES.map((theme) => [theme.id, theme]));
    expect(byId["red"].swatch).toBe("#EF4444");
    expect(byId["yellow"].swatch).toBe("#FBBF24");
    expect(byId["blue"].swatch).toBe("#3B82F6");
    expect(byId["red"].name).toBe("Red");
    expect(byId["yellow"].name).toBe("Yellow");
    expect(byId["blue"].name).toBe("Blue");
    // Shades derive from the swatch hex itself in light mode.
    expect(getThemedPalette("light", "red").primary).toBe("#EF4444");
    expect(getThemedPalette("light", "yellow").primary).toBe("#FBBF24");
    expect(getThemedPalette("light", "blue").primary).toBe("#3B82F6");
    expect(normalizeAccentThemeId("red")).toBe("red");
    expect(normalizeAccentThemeId("yellow")).toBe("yellow");
    expect(normalizeAccentThemeId("blue")).toBe("blue");
  });

  it("migrates the former Rose setting to Pomegranate and defaults invalid values", () => {
    expect(normalizeAccentThemeId("rose")).toBe("pomegranate");
    expect(normalizeAccentThemeId("missing")).toBe("default");
    expect(normalizeAccentThemeId(undefined)).toBe("default");
  });

  it("composes accent colors with light/dark palettes and charcoal surfaces", () => {
    expect(getThemedPalette("light", "ocean").primary).toBe("#0A86B8");
    expect(getThemedPalette("dark", "ocean").primary).toBe("#4EB9E4");
    expect(getThemedPalette("dark", "charcoal-gold")).toMatchObject({
      primary: "#D8B56A",
      background: "#171717",
      foreground: "#F5EBD3",
    });
  });

  it("applies theme shades everywhere for non-default themes, leaving default untouched", () => {
    const defaultBackground = getThemedPalette("light", "default").background;
    const oceanPalette = getThemedPalette("light", "ocean");
    // Non-default theme backgrounds are tinted variants of the theme color,
    // not the base palette background.
    expect(oceanPalette.background).not.toBe(defaultBackground);
    expect(oceanPalette.surface).not.toBe(getThemedPalette("light", "default").surface);
    expect(oceanPalette.studyAccent).toBe("#0A86B8");
    expect(getThemedPalette("dark", "ocean").studyAccent).toBe("#4EB9E4");
    // Semantic colors are never overridden by theme shades.
    expect(oceanPalette.success).toBe(getThemedPalette("light", "default").success);
    expect(oceanPalette.warning).toBe(getThemedPalette("light", "default").warning);
    expect(oceanPalette.error).toBe(getThemedPalette("light", "default").error);
    // Default theme keeps its original primary-only overrides.
    expect(getThemedPalette("light", "default").background).toBe(defaultBackground);
  });
});
