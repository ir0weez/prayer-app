import { describe, expect, it } from "vitest";
import { ACCENT_THEMES, getThemedPalette, getUnlockedAccentThemeIds, normalizeAccentThemeId } from "./color-themes";

describe("accent color themes", () => {
  it("contains the requested theme order and unlock levels", () => {
    expect(ACCENT_THEMES.map((theme) => [theme.id, theme.unlockLevel])).toEqual([
      ["default", 1],
      ["ocean", 10],
      ["forest", 20],
      ["sunset", 30],
      ["pomegranate", 40],
      ["crimson", 50],
      ["charcoal-gold", 100],
    ]);
  });

  it("unlocks themes cumulatively from the stored XP level", () => {
    expect(getUnlockedAccentThemeIds(1)).toEqual(["default"]);
    expect(getUnlockedAccentThemeIds(10)).toEqual(["default", "ocean"]);
    expect(getUnlockedAccentThemeIds(30)).toEqual(["default", "ocean", "forest", "sunset"]);
    expect(getUnlockedAccentThemeIds(50)).toEqual(["default", "ocean", "forest", "sunset", "pomegranate", "crimson"]);
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
});
