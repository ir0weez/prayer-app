// Skin themes — the MATERIAL axis of appearance (v174).
//
// Color themes (lib/color-themes.ts) choose the palette; a SKIN chooses
// what the app's chrome is made of. "Classic" is the original look and
// stays the default: its tokens are all identity values (null overrides,
// no grain, the app's existing motion), so every consumer that merges
// skin tokens renders exactly as before while Classic is selected.
//
// "Paper" re-skins the chrome in the paper language of the interiors:
//   - FLAT paper is the baseline — paper-tinted surfaces that take the
//     chosen color theme's hues, and the paper kit's ONE offset shadow
//     (rgba(24,8,44,0.28), see components/paper-interior). NO texture
//     at all: the v174–v176 speckle grain was removed on Jonathan's
//     ruling (2026-10-22) — flat paper only.
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
    swatch: "#F2ECDB",
  },
];

export const DEFAULT_SKIN_THEME: SkinThemeId = "classic";

/** The paper kit's ink, as a hex (the offset shadow is this at 0.28). */
export const PAPER_INK_HEX = "#18082C";
export const PAPER_SHADOW_ALPHA = 0.28;

// ---------------------------------------------------------------------------
// Colored paper stock (v182).
//
// v176–v179 built tinted stock by RGB-mixing the accent toward the cream
// surface. On Jonathan's phone that read as washed-out gray (his Fast
// Check-In square, slate accent): an RGB lerp toward a high-red cream
// drags every channel toward the cream's, so a blue's blue dominance —
// the thing that makes it read as ITS color — is exactly what dies.
// Colored stock is now built in HSL: hue and saturation are the accent's
// own, only lightness moves to the stock's level. The accent reads as
// the card's color at paper lightness, the way the full-strength tiles
// (the red and yellow schedule tiles) read as theirs.

type Hsl = { h: number; s: number; l: number };

function hexToHsl(hex: string): Hsl {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return { h, s, l };
}

function hslToHex({ h, s, l }: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb: [number, number, number];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  const channel = (v: number) =>
    Math.min(255, Math.max(0, Math.round((v + m) * 255))).toString(16).padStart(2, "0");
  return `#${channel(rgb[0])}${channel(rgb[1])}${channel(rgb[2])}`.toUpperCase();
}

/** WCAG relative luminance of a hex color (0 = black, 1 = white). */
export function hexLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const channel = (i: number) => {
    const v = parseInt(clean.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

function tintToLightness(accent: string, surface: string | null, lightL: number, darkL: number): string {
  const dark = surface ? hexLuminance(surface) < 0.35 : false;
  const { h, s } = hexToHsl(accent);
  return hslToHex({ h, s, l: dark ? darkL : lightL });
}

/**
 * Tinted paper stock for an accent: the accent's own hue and saturation
 * at paper lightness (0.80 over a light surface, 0.30 over a dark one).
 * `surface` is the skin's surface token, used only to tell light from
 * dark — never as a mix target (that was the v179 washout).
 */
export function paperStockTint(accent: string, surface: string | null): string {
  return tintToLightness(accent, surface, 0.8, 0.3);
}

/**
 * The calmer stock for COMPLETED schedule bars: same hue/saturation
 * discipline as paperStockTint, one step lighter/quieter (0.87), so a
 * finished item reads as settled paper in its own color — the "done"
 * comes from the check, not from draining the color to gray-beige.
 */
export function paperCompletedTint(accent: string, surface: string | null): string {
  return tintToLightness(accent, surface, 0.87, 0.24);
}

/** WCAG contrast ratio between two hex colors (1–21). */
export function hexContrast(a: string, b: string): number {
  const la = hexLuminance(a);
  const lb = hexLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Readable text ink derived from an accent, tuned against the accent's
 * own completed tint: same hue, lightness stepped until the pair
 * clears the target contrast. A flat lightness cap is NOT enough —
 * high-luminance hues (yellow, green) stay unreadable at caps that
 * work for slate or violet (yellow-on-yellow-wash Garden Prayer was
 * v179's unreadable bar). Over a dark surface the ink lightens
 * instead of darkening.
 */
function inkForContrast(accent: string, surface: string | null, target: number): string {
  const tint = paperCompletedTint(accent, surface);
  const { h, s, l } = hexToHsl(accent);
  const dark = surface ? hexLuminance(surface) < 0.35 : false;
  if (dark) {
    let lightness = Math.max(l, 0.78);
    let ink = hslToHex({ h, s, l: lightness });
    while (hexContrast(ink, tint) < target && lightness < 0.96) {
      lightness = Math.min(0.96, lightness + 0.04);
      ink = hslToHex({ h, s, l: lightness });
    }
    return ink;
  }
  let lightness = Math.min(l, 0.36);
  let ink = hslToHex({ h, s, l: lightness });
  while (hexContrast(ink, tint) < target && lightness > 0.1) {
    lightness = Math.max(0.1, lightness - 0.04);
    ink = hslToHex({ h, s, l: lightness });
  }
  return ink;
}

/** Title ink for tinted paper stock — clears 5:1 against its own tint. */
export function paperStockInk(accent: string, surface: string | null): string {
  return inkForContrast(accent, surface, 5);
}

/** Secondary-text ink (times) for tinted stock — clears 3.2:1. */
export function paperStockInkSoft(accent: string, surface: string | null): string {
  return inkForContrast(accent, surface, 3.2);
}

/**
 * The solid paper edge for a tinted sheet: the accent's hue at a
 * mid lightness — a real edge in the card's own color family, replacing
 * the translucent wash borders that read as thick gray frames.
 */
export function paperStockEdge(accent: string): string {
  const { h, s, l } = hexToHsl(accent);
  return hslToHex({ h, s, l: Math.min(0.58, Math.max(0.45, l)) });
}

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
  /** Legacy grain knobs — pinned to 0 forever (flat paper only, v179). */
  grainOpacity: number;
  grainColor: string;
  /** Grain flecks for saturated/colored paper stock (light fibers). */
  grainLightOpacity: number;
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
      grainLightOpacity: 0,
      motion: CLASSIC_MOTION,
    };
  }

  const dark = scheme === "dark";
  return {
    id: "paper",
    isPaper: true,
    // Paper is a MATERIAL, not a color (Jonathan, v176): the page keeps
    // the palette's own hue — only a whisper of warm paper in it — and
    // the paper lives on the SURFACES: neutral cards become warm paper
    // stock, colored cards keep their full-strength hue and gain the
    // one offset shadow as colored construction paper. v174 mixed
    // the whole app halfway to tan and read as a wash; this doesn't.
    // v182: the neutral stock pulled toward a cleaner white-paper —
    // the v176–v181 cream (#FBF3DE at 0.6, surface landing #FDF8EB)
    // read as BEIGE across whole screens ("not a huge fan of this
    // beige color"). The new mix target is a barely-warm white at a
    // lighter weight: the surface lands at #FDFAF3 (R−B ≈ 10, down
    // from 18) — still warm enough to not read as Classic white.
    background: dark ? mix(palette.background, "#2A1F3D", 0.22) : mix(palette.background, "#EFE9D8", 0.16),
    surface: dark ? mix(palette.surface, "#332741", 0.38) : mix(palette.surface, "#FAF4E6", 0.5),
    border: dark ? mix(palette.border, "#000000", 0.25) : mix(palette.border, PAPER_INK_HEX, 0.1),
    darkBackground: mix(mix("#1E1B4B", palette.primary, 0.07), "#3A2A20", 0.16),
    darkSurface: mix("#2A2140", palette.primary, 0.08),
    cardShadow: {
      // The mockup's exact shadow: a faint near layer + the kit shadow
      // at 7px/8px — one shadow for every card, sheet, and button.
      boxShadow: `3px 3px 0px rgba(24,8,44,0.12), 7px 8px 0px rgba(24,8,44,${PAPER_SHADOW_ALPHA})`,
      elevation: 5,
    },
    sheetShadow: {
      boxShadow: `0px -3px 0px rgba(24,8,44,0.14), 0px -6px 0px rgba(24,8,44,0.20)`,
      elevation: 8,
    },
    cardRadius: 18,
    sheetRadius: 24,
    // NO grain (Jonathan's ruling, 2026-10-22, after v176): the speckle
    // read as "little sprinkles" — not good, and not like paper. Paper
    // surfaces are flat color/stock + the one offset shadow, nothing
    // else. These stay 0 under every skin; PaperGrainOverlay renders
    // nothing.
    grainOpacity: 0,
    grainColor: PAPER_INK_HEX,
    grainLightOpacity: 0,
    motion: PAPER_MOTION,
  };
}
