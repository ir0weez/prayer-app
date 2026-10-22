// Skin themes — the MATERIAL axis of appearance (v174).
//
// Color themes (lib/color-themes.ts) choose the palette; a SKIN chooses
// what the app's chrome is made of. "Classic" is the original look and
// stays the default: its tokens are all identity values (null overrides,
// no grain, the app's existing motion), so every consumer that merges
// skin tokens renders exactly as before while Classic is selected.
//
// "Paper" re-skins the chrome in the paper language of the interiors:
//   - FLAT paper is the baseline — subtle grain, paper-tinted surfaces
//     that take the chosen color theme's hues, and the paper kit's ONE
//     offset shadow (rgba(24,8,44,0.28), see components/paper-interior).
//   - NO seam-dash treatments of any kind, and no fold/crease lines
//     across content — Jonathan's rulings (2026-10-22). Folds live at
//     edges or nowhere; v1 ships with none.
//   - Its motion dialect is a soft sheet-settle: calm sine easing,
//     marginally slower than the default chrome motion. No bounce,
//     no springs — the house rule everywhere.
//
// The Dark Forest and the town/city/school maps never consume these
// tokens: the forest stays pixel and the maps are already paper.

import { mix, type ColorScheme } from "./color-themes";

/** The themed palette (token name → hex), as produced by getThemedPalette. */
export type SkinPalette = Record<string, string>;

export type SkinThemeId = "classic" | "paper";

export type SkinThemeDefinition = {
  id: SkinThemeId;
  name: string;
  description: string;
  unlockLevel: number;
  swatch: string;
};

export const SKIN_THEMES: SkinThemeDefinition[] = [
  {
    id: "classic",
    name: "Classic",
    description: "The original PrayerCircle look",
    unlockLevel: 1,
    swatch: "#8557D9",
  },
  {
    id: "paper",
    name: "Paper",
    description: "Flat paper surfaces and soft sheet shadows — the interiors' language, everywhere",
    unlockLevel: 10,
    swatch: "#EFE3C8",
  },
];

export const DEFAULT_SKIN_THEME: SkinThemeId = "classic";

/** The paper kit's ink, as a hex (the offset shadow is this at 0.28). */
export const PAPER_INK_HEX = "#18082C";
export const PAPER_SHADOW_ALPHA = 0.28;

export function getSkinThemeDefinition(id: unknown): SkinThemeDefinition {
  return SKIN_THEMES.find((skin) => skin.id === id) ?? SKIN_THEMES[0];
}

export function normalizeSkinThemeId(value: unknown): SkinThemeId {
  return SKIN_THEMES.some((skin) => skin.id === value) ? (value as SkinThemeId) : DEFAULT_SKIN_THEME;
}

export function isSkinUnlocked(id: SkinThemeId, level: number): boolean {
  const safeLevel = Math.max(1, Math.floor(level || 1));
  return safeLevel >= getSkinThemeDefinition(id).unlockLevel;
}

export function getUnlockedSkinThemeIds(level: number): SkinThemeId[] {
  return SKIN_THEMES.filter((skin) => isSkinUnlocked(skin.id, level)).map((skin) => skin.id);
}

/** A React Native shadow-shaped style (kept structural so lib stays RN-free). */
export type SkinShadow = {
  boxShadow: string;
  elevation: number;
};

export type SkinMotionTokens = {
  /** Duration of the shared chrome slide (tab pill). */
  slideDuration: number;
  /** Card/sheet entrance settle: duration + how far it settles from. */
  settleDuration: number;
  settleDistance: number;
};

export type SkinTokens = {
  id: SkinThemeId;
  isPaper: boolean;
  /** Paper-tinted replacements for the palette's chrome colors; null = keep palette. */
  background: string | null;
  surface: string | null;
  border: string | null;
  /** For the dark scene screens (shops, creators) that hardcode deep violet. */
  darkBackground: string | null;
  darkSurface: string | null;
  /** The kit's one offset shadow, layered (a faint near layer + the shadow itself). */
  cardShadow: SkinShadow | null;
  sheetShadow: SkinShadow | null;
  cardRadius: number | null;
  sheetRadius: number | null;
  /** Paper grain overlay: 0 renders nothing. */
  grainOpacity: number;
  grainColor: string;
  motion: SkinMotionTokens;
};

const CLASSIC_MOTION: SkinMotionTokens = {
  // Matches the chrome motion the app already ships: the tab pill's
  // 400ms emphasized slide and EntranceAnimation's 400ms / 20px rise.
  slideDuration: 400,
  settleDuration: 400,
  settleDistance: 20,
};

const PAPER_MOTION: SkinMotionTokens = {
  // The sheet-settle dialect: same moves, a breath slower and shorter,
  // eased on a sine (the easing itself is applied by the hook layer).
  slideDuration: 460,
  settleDuration: 460,
  settleDistance: 10,
};

export function getSkinTokens(
  skinId: SkinThemeId,
  scheme: ColorScheme,
  palette: SkinPalette,
): SkinTokens {
  if (skinId !== "paper") {
    return {
      id: "classic",
      isPaper: false,
      background: null,
      surface: null,
      border: null,
      darkBackground: null,
      darkSurface: null,
      cardShadow: null,
      sheetShadow: null,
      cardRadius: null,
      sheetRadius: null,
      grainOpacity: 0,
      grainColor: PAPER_INK_HEX,
      motion: CLASSIC_MOTION,
    };
  }

  const dark = scheme === "dark";
  return {
    id: "paper",
    isPaper: true,
    // Paper takes the theme's hues: tint the palette's own chrome colors
    // toward warm paper instead of replacing them, so Paper + Ocean
    // still reads as Ocean, just printed on paper.
    background: dark ? mix(palette.background, "#2A1F3D", 0.4) : mix(palette.background, "#F1E7CE", 0.5),
    surface: dark ? mix(palette.surface, "#332741", 0.38) : mix(palette.surface, "#F8F1DE", 0.55),
    border: dark ? mix(palette.border, "#000000", 0.25) : mix(palette.border, PAPER_INK_HEX, 0.1),
    darkBackground: mix(mix("#1E1B4B", palette.primary, 0.07), "#3A2A20", 0.16),
    darkSurface: mix("#2A2140", palette.primary, 0.08),
    cardShadow: {
      boxShadow: `3px 3px 0px rgba(24,8,44,0.12), 6px 7px 0px rgba(24,8,44,${PAPER_SHADOW_ALPHA})`,
      elevation: 5,
    },
    sheetShadow: {
      boxShadow: `0px -3px 0px rgba(24,8,44,0.14), 0px -6px 0px rgba(24,8,44,0.20)`,
      elevation: 8,
    },
    cardRadius: 18,
    sheetRadius: 24,
    grainOpacity: dark ? 0.06 : 0.05,
    grainColor: dark ? "#FFFFFF" : PAPER_INK_HEX,
    motion: PAPER_MOTION,
  };
}
