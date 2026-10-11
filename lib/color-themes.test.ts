import { describe, expect, it } from "vitest";
import { ACCENT_THEMES, getThemedPalette, getUnlockedAccentThemeIds, normalizeAccentThemeId } from "./color-themes";

describe("accent color themes", () => {
  it("contains the requested theme order and unlock levels", () => {
    expect(ACCENT_THEMES.map((theme) => [theme.id, theme.unlockLevel])).toEqual([
      ["default", 1],
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
    expect(getUnlockedAccentThemeIds(1)).toEqual(["default"]);
    expect(getUnlockedAccentThemeIds(5)).toEqual(["default", "sky"]);
    expect(getUnlockedAccentThemeIds(10)).toEqual(["default", "sky", "ocean"]);
    expect(getUnlockedAccentThemeIds(15)).toEqual(["default", "sky", "ocean", "teal"]);
    expect(getUnlockedAccentThemeIds(30)).toEqual(["default", "sky", "ocean", "teal", "forest", "sunset"]);
    expect(getUnlockedAccentThemeIds(50)).toEqual(["default", "sky", "ocean", "teal", "forest", "sunset", "pomegranate", "crimson"]);
    expect(getUnlockedAccentThemeIds(75)).toContain("midnight");
    expect(getUnlockedAccentThemeIds(100)).toContain("charcoal-gold");
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
