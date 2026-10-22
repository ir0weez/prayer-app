// The Paper skin (v174) — Jonathan, 2026-10-22: an unlockable
// material SKIN axis beside the color themes. Classic is the app as
// it has always looked and stays the default; Paper (Level 10) turns
// the CHROME into flat paper — grain, tinted paper surfaces, the paper
// kit's one offset shadow rgba(24,8,44,.28) — with its own softer
// sheet-settle motion dialect (calm sine, no bounce, no springs).
//
// His paper rules, pinned here: NO stitches anywhere, NO crease/fold
// lines across content (flat paper is the baseline; v1 ships zero
// folds), and the schedule's keyword art is theme-adaptive — paper
// renditions under Paper, the originals byte-for-byte under Classic.
//
// Excluded by his call, also pinned: the Dark Forest (stays pixel)
// and the town/city/school maps consume no skin tokens at all.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { getThemedPalette } from "../color-themes";
import { paperKeywordSceneKind } from "../paper-keywords";
import {
  DEFAULT_SKIN_THEME,
  SKIN_THEMES,
  getSkinThemeDefinition,
  getSkinTokens,
  getUnlockedSkinThemeIds,
  isSkinUnlocked,
  normalizeSkinThemeId,
} from "../skin-themes";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("skin definitions + level gating", () => {
  it("ships exactly Classic (default) and Paper", () => {
    expect(SKIN_THEMES.map((t) => t.id)).toEqual(["classic", "paper"]);
    expect(DEFAULT_SKIN_THEME).toBe("classic");
    expect(getSkinThemeDefinition("classic").unlockLevel).toBe(1);
  });

  it("Paper unlocks at Level 10 — locked at 9, open at 10 and above", () => {
    expect(getSkinThemeDefinition("paper").unlockLevel).toBe(10);
    expect(isSkinUnlocked("paper", 9)).toBe(false);
    expect(isSkinUnlocked("paper", 10)).toBe(true);
    expect(isSkinUnlocked("paper", 25)).toBe(true);
    expect(isSkinUnlocked("classic", 1)).toBe(true);
  });

  it("the unlocked list follows the level", () => {
    expect(getUnlockedSkinThemeIds(1)).toEqual(["classic"]);
    expect(getUnlockedSkinThemeIds(9)).toEqual(["classic"]);
    expect(getUnlockedSkinThemeIds(10)).toEqual(["classic", "paper"]);
  });

  it("unknown or missing skin ids normalize back to Classic", () => {
    expect(normalizeSkinThemeId("paper")).toBe("paper");
    expect(normalizeSkinThemeId("classic")).toBe("classic");
    expect(normalizeSkinThemeId("watercolor")).toBe("classic");
    expect(normalizeSkinThemeId(undefined)).toBe("classic");
    expect(normalizeSkinThemeId(null)).toBe("classic");
    expect(normalizeSkinThemeId(42)).toBe("classic");
    expect(getSkinThemeDefinition("nope" as never).id).toBe("classic");
  });
});

describe("skin tokens", () => {
  const light = getThemedPalette("light", "default");
  const dark = getThemedPalette("dark", "default");

  it("Classic is the identity skin: every treatment null, no grain, today's motion", () => {
    for (const palette of [light, dark]) {
      const tokens = getSkinTokens("classic", palette === light ? "light" : "dark", palette);
      expect(tokens.background).toBeNull();
      expect(tokens.surface).toBeNull();
      expect(tokens.darkBackground).toBeNull();
      expect(tokens.darkSurface).toBeNull();
      expect(tokens.cardShadow).toBeNull();
      expect(tokens.sheetShadow).toBeNull();
      expect(tokens.cardRadius).toBeNull();
      expect(tokens.sheetRadius).toBeNull();
      expect(tokens.grainOpacity).toBe(0);
      expect(tokens.motion).toEqual({ slideDuration: 400, settleDuration: 400, settleDistance: 20 });
    }
  });

  it("Paper carries the kit's one offset shadow, paper radii, and grain", () => {
    const tokens = getSkinTokens("paper", "light", light);
    expect(tokens.cardShadow?.boxShadow).toContain("rgba(24,8,44,0.28)");
    // The sheet shadow is the same ink, layered upward like stacked
    // sheet edges — two ink layers, never a different shadow color.
    expect(tokens.sheetShadow?.boxShadow).toContain("rgba(24,8,44,");
    expect(tokens.sheetShadow?.boxShadow.split("rgba(24,8,44,")).toHaveLength(3);
    expect(tokens.cardRadius).toBe(18);
    expect(tokens.sheetRadius).toBe(24);
    expect(tokens.grainOpacity).toBeGreaterThan(0);
  });

  it("Paper surfaces are tinted paper, distinct from the raw palette in both schemes", () => {
    const paperLight = getSkinTokens("paper", "light", light);
    expect(paperLight.background).not.toBe(light.background);
    expect(paperLight.surface).not.toBe(light.surface);
    const paperDark = getSkinTokens("paper", "dark", dark);
    expect(paperDark.background).not.toBe(dark.background);
    expect(paperDark.surface).not.toBe(dark.surface);
    expect(paperDark.darkBackground).not.toBeNull();
    expect(paperDark.darkSurface).not.toBeNull();
  });

  it("Paper composes with the color theme: dark scene tokens follow the accent hue", () => {
    const a = getSkinTokens("paper", "light", getThemedPalette("light", "default"));
    const b = getSkinTokens("paper", "light", getThemedPalette("light", "forest"));
    expect(a.darkBackground).not.toBe(b.darkBackground);
    expect(a.darkSurface).not.toBe(b.darkSurface);
  });

  it("Paper motion is the sheet-settle dialect: slower, shorter, still calm numbers", () => {
    const tokens = getSkinTokens("paper", "light", light);
    expect(tokens.motion).toEqual({ slideDuration: 460, settleDuration: 460, settleDistance: 10 });
  });
});

describe("paper keyword routing (theme-adaptive schedule art)", () => {
  it("covers the daily-card keywords: meals, photo, travel, church", () => {
    expect(paperKeywordSceneKind("Meal", "Lunch with Eva", "", "")).toBe("lunch");
    expect(paperKeywordSceneKind("Meal", "Breakfast", "", "")).toBe("breakfast");
    expect(paperKeywordSceneKind("Meal", "Brunch at the cafe", "", "")).toBe("breakfast");
    expect(paperKeywordSceneKind("Meal", "Family Dinner", "", "")).toBe("dinner");
    expect(paperKeywordSceneKind("Photo", "Photos at the lake", "", "")).toBe("photo");
    expect(paperKeywordSceneKind("Travel", "Drive to Texas", "", "")).toBe("travel");
    expect(paperKeywordSceneKind("Church", "Church", "", "")).toBe("church");
  });

  it("a burger in the notes or a burger-chain location wins, like the original routing", () => {
    expect(paperKeywordSceneKind("Meal", "Lunch", "", "grab a cheeseburger")).toBe("burger");
    expect(paperKeywordSceneKind("Meal", "Dinner", "McDonald's", "")).toBe("lunch");
    expect(paperKeywordSceneKind("Meal", "Dinner", "In-N-Out Burger", "")).toBe("lunch");
  });

  it("uncovered keywords return null — the original scene renders under Paper too", () => {
    expect(paperKeywordSceneKind("Movie", "Movie night", "", "")).toBeNull();
    expect(paperKeywordSceneKind("Meal", "Snack", "", "")).toBeNull();
    expect(paperKeywordSceneKind("Bible Study", "Bible Study", "", "")).toBeNull();
    expect(paperKeywordSceneKind("Rest", "Rest", "", "")).toBeNull();
  });
});

describe("persistence + picker wiring (source pins)", () => {
  const index = read("app/(tabs)/index.tsx");
  const provider = read("lib/theme-provider.tsx");

  it("the skin choice persists inside the app-settings record, defaulting to Classic", () => {
    expect(index).toContain("skinTheme: SkinThemeId");
    expect(index).toContain('skinTheme: "classic"');
    expect(index).toContain("normalizeSkinThemeId(parsed.skinTheme)");
    expect(provider).toContain("normalizeSkinThemeId(parsed.skinTheme)");
  });

  it("settings push the stored skin into the theme context on hydration and on pick", () => {
    expect(index).toContain("setSkinTheme(settings.skinTheme)");
    expect(index).toContain("setSkinTheme(theme.id)");
  });

  it("the picker is level-gated the same way the color themes are", () => {
    expect(index).toContain("SKIN_THEMES.map");
    expect(index).toContain("xpProgress.level >= theme.unlockLevel");
    expect(index).toContain("Unlocks at Level {theme.unlockLevel}");
    expect(index).toContain("getSkinThemeDefinition(settings.skinTheme).name");
  });
});

describe("Classic stays byte-for-byte (source pins)", () => {
  it("shared chrome branches on the skin instead of restyling unconditionally", () => {
    const container = read("components/screen-container.tsx");
    expect(container).toContain("isPaper ? <PaperGrainOverlay /> : null");
    expect(container).toContain("tokens.background");

    const shell = read("components/interior-shell.tsx");
    // Only the default-white header takes the paper surface; scene
    // headers (mine, shops) keep their exact colors.
    expect(shell).toContain('bg === "#FFFFFF"');

    const games = read("components/mini-game-scene.tsx");
    expect(games).toContain("isPaper ? tokens.cardShadow : null");

    const modal = read("components/status-modal.tsx");
    expect(modal).toContain("isPaper ? <PaperGrainOverlay /> : null");
  });

  it("the entrance settle reads its timing from the skin (Classic = the original 400ms cubic)", () => {
    const entrance = read("components/entrance-animation.tsx");
    expect(entrance).toContain("motion.settle");
    const hook = read("hooks/use-skin.ts");
    expect(hook).toContain("Easing.out(Easing.cubic)");
    expect(hook).toContain("Easing.bezier(0.05, 0.7, 0.1, 1)");
    // Paper's dialect is sine, in the hook — never a spring or bounce.
    expect(hook).toContain("Easing.bezier(0.37, 0, 0.63, 1)");
    expect(hook.toLowerCase()).not.toContain("spring");
    expect(hook.toLowerCase()).not.toContain("bounce");
  });

  it("the schedule dispatches paper keyword art ONLY under the Paper skin", () => {
    const schedule = read("components/schedule-tab.tsx");
    expect(schedule).toContain("paperKeywordSceneFor");
    expect(schedule).toContain("if (isPaper)");
    // The original dispatch is still there, untouched below the branch.
    expect(schedule).toContain("switch (label)");
    // Rest skies swap as one block: paper cutouts OR the originals.
    expect(schedule).toContain("<PaperRestSky mood={mood} bg={mc.bg} />");
  });
});

describe("exclusions: the forest and the maps consume no skin (source pins)", () => {
  const excluded = [
    "components/dark-forest.tsx",
    "app/hometown.tsx",
    "components/paper-building-art.tsx",
    "components/town-npcs.tsx",
    "components/river.tsx",
    "components/city-delights.tsx",
    "components/city-traffic.tsx",
    "components/mission-field.tsx",
    "components/the-well.tsx",
    "components/garden-of-remembrance.tsx",
  ];
  for (const file of excluded) {
    it(`${file} has no skin wiring`, () => {
      const src = read(file);
      expect(src).not.toContain("useSkin");
      expect(src).not.toContain("getSkinTokens");
      expect(src).not.toContain("SkinTokens");
      expect(src).not.toContain("skinTokens");
    });
  }
});

describe("Jonathan's paper rules (source pins)", () => {
  const touched = [
    "lib/skin-themes.ts",
    "lib/paper-keywords.ts",
    "hooks/use-skin.ts",
    "components/paper-grain.tsx",
    "components/paper-keyword-scenes.tsx",
    "components/screen-container.tsx",
    "components/interior-shell.tsx",
    "components/mini-game-scene.tsx",
    "components/status-modal.tsx",
    "components/entrance-animation.tsx",
    "lib/theme-provider.tsx",
    "app/(tabs)/index.tsx",
    "app/profile.tsx",
    "app/gear-shop.tsx",
    "app/character.tsx",
    "app/pawn-creator.tsx",
    "app/barbershop.tsx",
    "app/hometown-shop.tsx",
    "app/mine-mouth.tsx",
    "app/mine-interior.tsx",
    "components/schedule-tab.tsx",
  ];
  for (const file of touched) {
    it(`${file}: no stitches, ever`, () => {
      expect(read(file).toLowerCase()).not.toContain("stitch");
    });
  }

  it("the paper grain is a speckle overlay, never a crease across content", () => {
    const grain = read("components/paper-grain.tsx");
    expect(grain).toContain("PaperGrainOverlay");
    expect(grain).toContain('pointerEvents="none"');
  });
});
