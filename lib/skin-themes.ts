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
// "8-bit" (v183, rebuilt v184) is the Dark Forest's material brought
// indoors — the approved mockup (schedule-mockups/8bit.html), matched
// to its actual CSS values:
//   - The PAGE is the mockup's deep dusk indigo (#3A2766 → #2A1B4E →
//     #1E1138 gradient, flat token #2A1B4E) with the 16px white-5%
//     checker dither over it. Cartridge-cream cards (#FFF3D0) sit ON
//     the dusk world; dark HUD panels (#1D1233 / #2A1B4E) carry the
//     white blocks, ticker, live strip, and tab bar. v183's fatal
//     error was a cream page with token swaps — Paper in a costume.
//   - Corners are genuinely square (radius 2 — the mockup's stepped
//     clip-path staircase, faked at the corners where needed), edges
//     are a chunky 3px ink border, and the shadow is ONE hard block
//     (6px 6px 0, rgba(13,5,32,0.55)) — solid offset, zero blur.
//   - Headings speak in Press Start 2P (bundled, OFL) — the mockup's
//     monospace-uppercase display voice, in a real pixel face.
//   - Its motion dialect is STEPPED: entrances tick down in discrete
//     frames (Easing.steps in the hook layer), never a smooth glide.
//   - Every keyword scene gets a bespoke pixel rendition (see
//     components/pixel-keyword-scenes.tsx), drawn chunky on a coarse
//     grid — the same rule Paper lives by: no shared shells.
//   - v187 ("everywhere it claims to be"): the dusk reaches EVERY
//     screen (v184–v185's mount only ever showed on the Schedule —
//     the main screen's SafeAreaView painted the palette background
//     over it), the date header is a solid HUD panel pinned in the
//     list, titles speak the pixel face app-wide, buttons are the
//     mockup's gold/dark cartridges (bitButtonStyle), and the
//     everyday cards wear the gold inset ring (accentShadow).
//
// "Terminal" (v186) is the RobCo terminal from Fallout — the approved
// mockup (schedule-mockups/terminal.html), matched to its actual CSS
// values:
//   - One phosphor ink in three depths (#3DFF6E bright / #1D9E4B mid /
//     #14532D dim, soft #9BF0B2 for secondary text) on a near-black
//     green tube (#041207 → #020A04). The tube is the page: a static
//     scanline + vignette layer baked into the background component,
//     never an animated overlay.
//   - Chrome is TYPOGRAPHIC: VT323 (bundled, OFL) on headings and
//     labels, [X] checkbox glyphs, ">" prompt rows, bracketed menu
//     selection, windows with square corners and the mockup's double
//     rule (faked: a 1px mid border + an inset ring in the shadow).
//   - EVERY illustration in the app — all 167 keyword scenes and the
//     decorative art across the v179 footprint — renders as Pip-Boy
//     line art: monochrome green stroke drawings (components/
//     terminal-kit.tsx), NOT text glyphs. The mockup's ASCII was
//     placeholder shorthand (Jonathan's correction, 2026-10-22).
//   - Its motion dialect is STEPPED and hard: cursor blink, chunk
//     entrances (Easing.steps), no sine, no springs.
//   - v188 ("finished properly", from Jonathan's v186 phone verdict):
//     the boot banner is GONE (it clipped behind the schedule header
//     tile and he called it useless — the chrome carries the theme,
//     not a text preamble); the list's date header is a solid terminal
//     window with the full date, pinned sticky like 8-bit's; buttons
//     are terminal windows (termButtonStyle); and the accent stragglers
//     (summary name chip, study progress, week-strip markers, the tab
//     menu) wear phosphor instead of the palette's purple.
//   - The tube is one dark world in both schemes (like 8-bit's dusk);
//     the theme provider resolves the DARK palette while Terminal is
//     active so palette text stays legible on the panels.
//
// "Paper, Not Buttons" (v189, from Jonathan's Paper verdict,
// 2026-10-22): "Paper looks too much like 'button' in many areas."
// Every paper piece carried the same chunky offset shadow + saturated
// fill + rounded corners, interactive or not, so everything read as
// pressable. The material now splits by role:
//   - The chunky offset shadow (rgba(24,8,44,0.28)) is an
//     INTERACTIVE-ONLY signal — it survives as tokens.buttonShadow,
//     worn by actual buttons/tappable controls.
//   - Non-interactive paper (cards, headers, tiles, list rows,
//     panels) loses the drop shadow and gets a STACKED-SHEET edge
//     instead (tokens.cardShadow): two opaque stock shades peeking
//     behind the surface at 2px/4px — sheets in a stack, the same
//     language the fasting profile's sheet stack already spoke
//     (#EFE9DB over #E6DCC2). No ink, no blur: an edge, not a shadow.
//   - Corners follow the same split: non-interactive paper is cut
//     nearer to square (cardRadius 6, sheetRadius 12); real buttons
//     keep their shapes.
//   - The schedule's date header gets the v187/v188 cure in the
//     paper dialect: a solid paper panel with the full date spelled
//     out, pinned sticky at the top of the list.
//
// v192 ("Unpin the Date Header", Jonathan's reversal, 2026-10-22):
// "I don't like that the header card is fixed in this mode. I change
// my mind." The sticky pin the v187/v188 cures and v189's parity
// carried is GONE under all three skins — the schedule list passes
// no stickyHeaderIndices at all, so the date header is a normal
// in-flow card that scrolls away with the list, exactly as Classic's
// always did. The panels themselves (8-bit's BIT_PANEL HUD,
// Terminal's TERM_PANEL window, Paper's stock panel) and their
// spelled-out full-date lines are unchanged: only fixed-vs-scrolling
// changed.
//
// v193 ("The Header Joins the Slide", 2026-10-22): "Why isn't it a
// part of the slide? It's like its own little floating box and it
// looks out of place." The date header — under every skin — is now
// the sheet's own head, not a card hovering in the seam: the inset
// margins and the separate shadow are gone from all four branches.
// Classic/Paper render it inside the sheet's surface wrapper (the
// wrapper carries the sheet's rounded top, clipped); Paper's panel
// bottom is square where it meets the sheet, its top corners take
// the sheet radius (12); 8-bit/Terminal keep their panel fills and
// frames but run full-bleed as the list's masthead. The list spacer
// also gives the sheet the summary's full height now (the old 68px
// overlap clipped the summary's last line behind the header at
// rest); the slide-over in motion is unchanged. Full-date lines
// and the v190 type scale are untouched.
//
// v221: the "Stained Glass" skin (v201) is REMOVED — Jonathan's call
// ("stained glass is just awful… I'd get rid of it"). Its roster
// entry, tokens, and bespoke scene art are gone. A stored
// "stainedglass" selection is now simply an unknown id, so
// normalizeSkinThemeId resolves it to the Classic default — no
// crash, no blank theme, no stuck state.
//
// The Dark Forest and the town/city/school maps never consume these
// tokens: the forest stays pixel (its rendering is NOT re-skinned)
// and the maps are already paper.

import { mix, type ColorScheme } from "./color-themes";

/** The themed palette (token name → hex), as produced by getThemedPalette. */
export type SkinPalette = Record<string, string>;

export type SkinThemeId = "classic" | "paper" | "8bit" | "terminal";

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
  {
    id: "8bit",
    name: "8-bit",
    description: "Stepped pixel corners, hard block shadows, and frame-by-frame motion — the Dark Forest's material, indoors",
    unlockLevel: 10,
    swatch: "#2A1B4E",
  },
  {
    id: "terminal",
    name: "Terminal",
    description: "A RobCo terminal: phosphor-green line art, bracketed menus, and type that blinks — the whole app on one tube",
    unlockLevel: 10,
    swatch: "#041207",
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

/**
 * The skin's type scale (v190, "Paper, Bigger"). Jonathan declined
 * the Newspaper serif conversion but kept pointing at the mockup:
 * "It's not just the titles though, it's the cards themselves too.
 * Everything just looks bigger and better." What he wants is the
 * mockup's SCALE inside the existing Paper skin — larger type at
 * every level, same font family. Every field is an absolute size
 * for one named level; null means "the component's own size", so
 * under Classic, 8-bit and Terminal the whole table is null and
 * every consumer spread is a no-op (their type is byte-preserved).
 * Only Paper carries values. padBoost/gapBoost are the roominess
 * half of the same ruling: extra px consumers add to themed card
 * padding / inter-card gaps (0 under every other skin).
 */
export type SkinTypeTokens = {
  /** Floating header tiles: the Schedule tile, the People pill, the Journal header (base 20). */
  screenTitle: number | null;
  /** Full-page titles (base ~31): the fasting profile's "My Profile". */
  pageTitle: number | null;
  /** Header-tile subtitles (base 12). */
  screenSubtitle: number | null;
  /** The summary greeting line (base 18). */
  greeting: number | null;
  /** The summary's name chip (base 16). */
  summaryName: number | null;
  /** The summary paragraph (base 16). */
  summaryBody: number | null;
  summaryLineHeight: number | null;
  /** The date panel's big day name (base 48). */
  dayName: number | null;
  dayNameLineHeight: number | null;
  /** The date panel's full-date line (base 13). */
  dateLine: number | null;
  /** Week-strip numerals (base 18). */
  weekNum: number | null;
  weekNumLineHeight: number | null;
  /** Week-strip day names (base 10). */
  weekDay: number | null;
  /** Card titles: events, todos, ministries, the study book, journal entries (bases 15–18). */
  cardTitle: number | null;
  /** The illustrated cards' scene headline (base 20). */
  cardLead: number | null;
  cardLeadLineHeight: number | null;
  /** Card descriptions (base 16). */
  cardBody: number | null;
  cardBodyLineHeight: number | null;
  /** Times, locations and other card meta (bases 12–13). */
  cardMeta: number | null;
  /** Completed-bar titles and slim headings (bases 13–14). */
  barTitle: number | null;
  /** Section headers / kickers (bases 14–17). */
  sectionTitle: number | null;
  sectionLineHeight: number | null;
  /** List-row titles: People names, Settings rows (bases 17–18). */
  rowTitle: number | null;
  rowTitleLineHeight: number | null;
  /** List-row subtitles / meta (base 13). */
  rowBody: number | null;
  rowBodyLineHeight: number | null;
  /** Journal entry prose (base 15). */
  proseBody: number | null;
  proseLineHeight: number | null;
  /** Small button / chip / stat labels (bases 11–12). */
  labelText: number | null;
  /** The fasting profile's name (base 24). */
  displayName: number | null;
  displayNameLineHeight: number | null;
  /** Big stat numerals (bases 28–31). */
  statValue: number | null;
  /** Extra px of padding themed cards gain under this skin. */
  padBoost: number;
  /** Extra px of gap themed cards gain under this skin. */
  gapBoost: number;
};

/** The identity type table: no level overridden, no boost. */
const NO_TYPE_SCALE: SkinTypeTokens = {
  screenTitle: null,
  pageTitle: null,
  screenSubtitle: null,
  greeting: null,
  summaryName: null,
  summaryBody: null,
  summaryLineHeight: null,
  dayName: null,
  dayNameLineHeight: null,
  dateLine: null,
  weekNum: null,
  weekNumLineHeight: null,
  weekDay: null,
  cardTitle: null,
  cardLead: null,
  cardLeadLineHeight: null,
  cardBody: null,
  cardBodyLineHeight: null,
  cardMeta: null,
  barTitle: null,
  sectionTitle: null,
  sectionLineHeight: null,
  rowTitle: null,
  rowTitleLineHeight: null,
  rowBody: null,
  rowBodyLineHeight: null,
  proseBody: null,
  proseLineHeight: null,
  labelText: null,
  displayName: null,
  displayNameLineHeight: null,
  statValue: null,
  padBoost: 0,
  gapBoost: 0,
};

/**
 * Paper's bigger scale (v190). Display levels grow the most (the
 * header tile 20 → 28 is the mockup masthead's ~1.4×), card titles
 * step ~1.25–1.35×, body and meta a clear step less — the way the
 * mockup's hierarchy stretches. Scheme-independent: paper reads
 * the same size in light and dark.
 */
const PAPER_TYPE_SCALE: SkinTypeTokens = {
  screenTitle: 28,
  pageTitle: 34,
  screenSubtitle: 14,
  greeting: 21,
  summaryName: 18,
  summaryBody: 18,
  summaryLineHeight: 27,
  dayName: 56,
  dayNameLineHeight: 58,
  dateLine: 15,
  weekNum: 21,
  weekNumLineHeight: 25,
  weekDay: 11,
  cardTitle: 20,
  cardLead: 22,
  cardLeadLineHeight: 27,
  cardBody: 18,
  cardBodyLineHeight: 24,
  cardMeta: 14,
  barTitle: 17,
  sectionTitle: 18,
  sectionLineHeight: 23,
  rowTitle: 20,
  rowTitleLineHeight: 25,
  rowBody: 15,
  rowBodyLineHeight: 21,
  proseBody: 17,
  proseLineHeight: 24,
  labelText: 13,
  displayName: 28,
  displayNameLineHeight: 34,
  statValue: 32,
  padBoost: 4,
  gapBoost: 2,
};

/**
 * A text-style override from the skin's type table (v190): the
 * level's size (and line height, when the caller passes one).
 * Returns an empty object when the level is unset — under Classic,
 * 8-bit and Terminal every level is unset, so spreading the result
 * into a text style is a no-op and those skins render exactly as
 * before. Mirrors how bitDisplay/termButtonStyle gate on the skin.
 */
export function skinText(
  tokens: SkinTokens,
  size: number | null,
  lineHeight?: number | null,
): { fontSize?: number; lineHeight?: number } {
  if (size == null) return {};
  return lineHeight == null ? { fontSize: size } : { fontSize: size, lineHeight };
}

/**
 * v246: the People list's top inset — the clearance its floating
 * header needs. The header row (app/(tabs)/index.tsx) is absolutely
 * positioned at top:12, and its pill is sized BY THE SKIN: the title
 * and subtitle take the type scale's screenTitle/screenSubtitle
 * (20/12 at base, 28/14 under Paper) and the pill's vertical padding
 * grows by the scale's gapBoost. The list used to hardcode an 84px
 * inset — a Classic-metrics number. Under Paper the pill's bottom
 * edge lands at ~93px, so the first list content (the Pray Today
 * header) slid underneath it and was half-covered (Jonathan's
 * screenshot, Oct 25 11:21 PDT). The inset now derives from the same
 * numbers that size the pill: top offset + pill height (vertical
 * padding, title line, subtitle line, the subtitle's marginTop) + a
 * breathing margin, and never less than the historical 84 — so
 * Classic, 8-bit and Terminal keep exactly the clearance they have
 * today, and a future type scale grows the clearance with the pill
 * instead of colliding with it. Line heights are estimated at 1.3×
 * the font size (RN's default leading for these faces runs ~1.2×;
 * the estimate errs on the safe side and the margin absorbs the
 * rest).
 */
export function peopleHeaderInset(type: SkinTypeTokens): number {
  const titleSize = type.screenTitle ?? 20;
  const subtitleSize = type.screenSubtitle ?? 12;
  const padV = 10 + (type.gapBoost ?? 0);
  const pillHeight =
    padV * 2 + Math.ceil(titleSize * 1.3) + 1 + Math.ceil(subtitleSize * 1.3);
  return Math.max(84, 12 + pillHeight + 8);
}

export type SkinTokens = {
  id: SkinThemeId;
  isPaper: boolean;
  isEightBit: boolean;
  isTerminal: boolean;
  /** Paper-tinted replacements for the palette's chrome colors; null = keep palette. */
  background: string | null;
  surface: string | null;
  border: string | null;
  /** For the dark scene screens (shops, creators) that hardcode deep violet. */
  darkBackground: string | null;
  darkSurface: string | null;
  /**
   * The shadow a content surface wears. Under Paper (v189) this is
   * the STACKED-SHEET edge — opaque stock shades at small offsets,
   * no ink — because the chunky offset shadow became an
   * interactive-only signal (see buttonShadow). Under 8-bit it is
   * the hard block shadow; under Terminal the window shadow.
   */
  cardShadow: SkinShadow | null;
  /**
   * The INTERACTIVE shadow (v189): the chunky offset shadow, kept
   * for actual buttons/tappable controls only. Non-null ONLY under
   * Paper — Classic never had it, and 8-bit/Terminal buttons have
   * their own treatments (bitButtonStyle / termButtonStyle), so
   * spreading this is a no-op for them.
   */
  buttonShadow: SkinShadow | null;
  sheetShadow: SkinShadow | null;
  /**
   * The routine-cartridge shadow (v187, 8-bit only): the hard offset
   * shadow PLUS the mockup's gold inset ring (`inset 0 0 0 3px gold`
   * on its routine card). The schedule's everyday cards — todos, the
   * study card — wear this instead of the plain cardShadow so a cream
   * card reads as a gold-edged cartridge, not a beige tile. Null under
   * Classic, Paper and Terminal.
   */
  accentShadow: SkinShadow | null;
  cardRadius: number | null;
  sheetRadius: number | null;
  /** Chunky edge width for cards/tiles/buttons under this skin; null = leave component borders alone. */
  borderWidth: number | null;
  /**
   * The full card frame (radius + width + ink) a surface kit consumer
   * can spread over its base style in one move. Non-null ONLY under
   * 8-bit and Terminal: Classic and Paper must render
   * byte-identically, so their frame stays null and every spread of
   * it is a no-op for them.
   */
  frame: { borderRadius: number; borderWidth: number; borderColor: string } | null;
  /** Display face for headings under this skin; null = the app's regular type. */
  displayFont: string | null;
  /**
   * Body face under this skin; null = the app's regular type.
   * Terminal speaks monospace everywhere (system monospace — VT323
   * is the display face and is too rough at body sizes; see the
   * TERM_ constants below). The concrete family name is resolved by
   * the hook layer per platform; the token only records the intent.
   */
  bodyFont: string | null;
  /** Legacy grain knobs — pinned to 0 forever (flat paper only, v179). */
  grainOpacity: number;
  grainColor: string;
  /** Grain flecks for saturated/colored paper stock (light fibers). */
  grainLightOpacity: number;
  motion: SkinMotionTokens;
  /**
   * The type scale (v190): named text levels + card padding/gap
   * boosts. Paper-only values; the identity table (all null, zero
   * boosts) under Classic, 8-bit and Terminal.
   */
  type: SkinTypeTokens;
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

const BIT_MOTION: SkinMotionTokens = {
  // The stepped dialect: the mockup's entrance drops 16 → 10 → 5 → 0
  // in four chunky frames over half a second; the chrome slide ticks
  // faster and shorter. The stepping itself is applied by the hook
  // layer (Easing.steps) — these numbers only set the tempo.
  slideDuration: 300,
  settleDuration: 500,
  settleDistance: 16,
};

const TERM_MOTION: SkinMotionTokens = {
  // The terminal dialect: the mockup's entrances are three hard
  // opacity chunks in 280ms (steps(3)), and its chrome stamps rather
  // than slides. The stepping itself is applied by the hook layer
  // (Easing.steps) — these numbers only set the tempo.
  slideDuration: 240,
  settleDuration: 280,
  settleDistance: 6,
};
/** The 8-bit kit's shadow ink (the mockup's --bit-shadow base). */
export const BIT_SHADOW_HEX = "rgba(13,5,32,0.55)";
/** The 8-bit kit's edge ink (the mockup's --bit-ink). */
export const BIT_INK_HEX = "#150A2E";
/** The mockup's dusk page: gradient stops and the flat token between them. */
export const BIT_DUSK_TOP = "#3A2766";
export const BIT_DUSK = "#2A1B4E";
export const BIT_DUSK_DEEP = "#1E1138";
/** The mockup's darkest HUD panel (tab bar, ticker, live strip). */
export const BIT_PANEL = "#1D1233";
/** The mockup's cartridge-cream card stock. */
export const BIT_CREAM = "#FFF3D0";
/** The mockup's gold (pills, complete button, live-strip edge, keywords). */
export const BIT_GOLD = "#FFC531";
/** The mockup's primary purple (active tab, FAB). */
export const BIT_PURPLE = "#7C4DFF";
/** Ink that reads on the dusk page (mockup status-bar / HUD text). */
export const BIT_ON_DUSK = "#EDE8FF";
export const BIT_ON_DUSK_SOFT = "#CFC6F2";
export const BIT_ON_DUSK_FAINT = "#A99CDD";
/** The bundled pixel display face (Press Start 2P, OFL — assets/fonts). */
export const PIXEL_FONT_FAMILY = "PressStart2P";
/** Ink that reads on the mockup's gold (its button text, #3A2703). */
export const BIT_GOLD_INK = "#3A2703";

/**
 * The 8-bit button treatment (v187): square corners, the chunky 3px
 * ink edge, and the kit's hard offset shadow at button scale. PRIMARY
 * actions are the mockup's gold with dark ink text (its "Mark as
 * Complete"); SECONDARY actions are the dark HUD panel with on-dusk
 * text. Returns null under every other skin — Classic, Paper and
 * Terminal buttons render exactly as they already do, so spreading
 * the result is a no-op for them. (v185's phone verdict: "Mark as
 * Read" and "Read Chapter" were still big rounded purple pills.)
 */
export function bitButtonStyle(
  tokens: SkinTokens,
  variant: "primary" | "secondary",
): { backgroundColor: string; borderRadius: number; borderWidth: number; borderColor: string; boxShadow: string; elevation: number } | null {
  if (!tokens.isEightBit) return null;
  return {
    backgroundColor: variant === "primary" ? BIT_GOLD : BIT_PANEL,
    borderRadius: 2,
    borderWidth: 3,
    borderColor: BIT_INK_HEX,
    boxShadow: `4px 4px 0px ${BIT_SHADOW_HEX}`,
    elevation: 4,
  };
}

/** Text ink for a bitButtonStyle variant (gold ink / on-dusk). */
export function bitButtonInk(variant: "primary" | "secondary"): string {
  return variant === "primary" ? BIT_GOLD_INK : BIT_ON_DUSK;
}

/**
 * The Terminal button treatment (v188): a terminal WINDOW, not a
 * pill — square corners, a green rule edge, a dark panel face, and
 * phosphor text. PRIMARY actions get the panel-2 face and the mid
 * rule; SECONDARY actions get the darker panel and the dim rule.
 * Both wear the skin's window shadow (the faked double rule + halo,
 * the same string as the terminal cardShadow). Returns null under
 * every other skin — Classic, Paper and 8-bit buttons render exactly
 * as they already do. (v186 left the study card's buttons as the
 * palette's rounded purple pills; Jonathan's v186 phone verdict
 * flagged them as stragglers.)
 */
export function termButtonStyle(
  tokens: SkinTokens,
  variant: "primary" | "secondary",
): { backgroundColor: string; borderRadius: number; borderWidth: number; borderColor: string; boxShadow: string; elevation: number } | null {
  if (!tokens.isTerminal) return null;
  return {
    backgroundColor: variant === "primary" ? TERM_PANEL_2 : TERM_PANEL,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: variant === "primary" ? TERM_MID : TERM_DIM,
    boxShadow: `inset 0px 0px 0px 2px ${TERM_BG}, inset 0px 0px 0px 3px rgba(29,158,75,0.85), 0px 0px 14px rgba(61,255,110,0.16)`,
    elevation: 2,
  };
}

/** Text ink for a termButtonStyle variant (bright / soft phosphor). */
export function termButtonInk(variant: "primary" | "secondary"): string {
  return variant === "primary" ? TERM_PHOS : TERM_SOFT;
}

/** The terminal tube: the mockup's near-black green page and its deep stop. */
export const TERM_BG = "#041207";
export const TERM_DEEP = "#020A04";
/** The mockup's radial highlight at the top of the tube. */
export const TERM_GLOW_TOP = "#0B2A12";
/** The mockup's window panels (two depths). */
export const TERM_PANEL = "#071A0C";
export const TERM_PANEL_2 = "#0A2410";
/** The phosphor ink in three depths, plus the soft secondary ink. */
export const TERM_PHOS = "#3DFF6E";
export const TERM_SOFT = "#9BF0B2";
export const TERM_MID = "#1D9E4B";
export const TERM_DIM = "#14532D";
/** The mockup's phosphor glow (text-shadow / halo work). */
export const TERM_GLOW = "rgba(61,255,110,0.38)";
/** The bundled terminal display face (VT323, OFL — assets/fonts). */
export const TERM_FONT_FAMILY = "VT323";

export function getSkinTokens(
  skinId: SkinThemeId,
  scheme: ColorScheme,
  palette: SkinPalette,
): SkinTokens {
  if (skinId === "classic") {
    return {
      id: "classic",
      isPaper: false,
      isEightBit: false,
      isTerminal: false,
      background: null,
      surface: null,
      border: null,
      darkBackground: null,
      darkSurface: null,
      cardShadow: null,
      buttonShadow: null,
      sheetShadow: null,
      accentShadow: null,
      cardRadius: null,
      sheetRadius: null,
      borderWidth: null,
      frame: null,
      displayFont: null,
      bodyFont: null,
      grainOpacity: 0,
      grainColor: PAPER_INK_HEX,
      grainLightOpacity: 0,
      motion: CLASSIC_MOTION,
      type: NO_TYPE_SCALE,
    };
  }

  const dark = scheme === "dark";

  if (skinId === "8bit") {
    // v184: the mockup's values, not a mix toward them. The page IS
    // the dusk (flat #2A1B4E token; ScreenContainer lays the mockup's
    // three-stop gradient + dither over it), in BOTH schemes — the
    // mockup has one world, and it is dark. Cards are the mockup's
    // flat cartridge cream in the light scheme; in the dark scheme
    // they stay deep HUD panels so the palette's light text reads.
    const bitBorder = dark ? "#6E5BB5" : BIT_INK_HEX;
    return {
      id: "8bit",
      isPaper: false,
      isEightBit: true,
      isTerminal: false,
      background: dark ? BIT_DUSK_DEEP : BIT_DUSK,
      surface: dark ? BIT_DUSK : BIT_CREAM,
      border: bitBorder,
      darkBackground: mix("#1E1138", palette.primary, 0.08),
      darkSurface: mix("#2A1B4E", palette.primary, 0.08),
      cardShadow: {
        // The mockup's hard block shadow: one solid offset, no blur,
        // no second layer — drop-shadow(6px 6px 0 rgba(13,5,32,.55)).
        boxShadow: `6px 6px 0px ${BIT_SHADOW_HEX}`,
        elevation: 6,
      },
      buttonShadow: null,
      sheetShadow: {
        boxShadow: `0px -6px 0px rgba(13,5,32,0.45)`,
        elevation: 8,
      },
      accentShadow: {
        // The mockup's routine card: the same hard block shadow, plus
        // its gold inset frame drawn inside the cartridge's edge.
        boxShadow: `6px 6px 0px ${BIT_SHADOW_HEX}, inset 0px 0px 0px 3px ${BIT_GOLD}`,
        elevation: 6,
      },
      // Genuinely square (the mockup's stepped clip-path staircase
      // reads as square at display size; v183's 4/6 plus inherited
      // component radii rendered ~16px round and failed the glance
      // test). The frame token carries the whole edge — radius,
      // 3px width, ink — so kit consumers override inherited
      // roundness in one spread.
      cardRadius: 2,
      sheetRadius: 2,
      borderWidth: 3,
      frame: { borderRadius: 2, borderWidth: 3, borderColor: bitBorder },
      displayFont: PIXEL_FONT_FAMILY,
      bodyFont: null,
      grainOpacity: 0,
      grainColor: BIT_INK_HEX,
      grainLightOpacity: 0,
      motion: BIT_MOTION,
      type: NO_TYPE_SCALE,
    };
  }

  if (skinId === "terminal") {
    // v186: the mockup's values, in BOTH schemes — the tube is one
    // dark world (the provider resolves the dark palette under
    // Terminal, so palette text stays legible on the panels). The
    // mockup's 3px double border is faked: a 1px mid-green border
    // (the frame token) + an inset ring inside the card shadow —
    // a BG-colored 2px ring reads as the gap between the two rules,
    // and a mid-green ring at 3px reads as the inner rule. RN has no
    // borderStyle "double"; at display size the pair of green rules
    // IS the mockup's window edge. The third shadow layer is the
    // phosphor halo the mockup's glow gives every window.
    return {
      id: "terminal",
      isPaper: false,
      isEightBit: false,
      isTerminal: true,
      background: TERM_BG,
      surface: TERM_PANEL,
      border: TERM_MID,
      darkBackground: TERM_DEEP,
      darkSurface: TERM_PANEL_2,
      cardShadow: {
        boxShadow: `inset 0px 0px 0px 2px ${TERM_BG}, inset 0px 0px 0px 3px rgba(29,158,75,0.85), 0px 0px 14px rgba(61,255,110,0.16)`,
        elevation: 2,
      },
      buttonShadow: null,
      sheetShadow: {
        boxShadow: `0px -2px 0px rgba(29,158,75,0.7), 0px 0px 18px rgba(61,255,110,0.12)`,
        elevation: 4,
      },
      accentShadow: null,
      // Square, like the mockup's windows (radius 2).
      cardRadius: 2,
      sheetRadius: 2,
      borderWidth: 1,
      frame: { borderRadius: 2, borderWidth: 1, borderColor: TERM_MID },
      displayFont: TERM_FONT_FAMILY,
      bodyFont: "monospace",
      grainOpacity: 0,
      grainColor: TERM_DIM,
      grainLightOpacity: 0,
      motion: TERM_MOTION,
      type: NO_TYPE_SCALE,
    };
  }

  // v189: the paper surface and its stacked-sheet edge shades. The
  // edge is the surface's own stock stepped toward a deeper sheet
  // tone — in the light scheme it lands on the fasting profile
  // stack's established shades (#EFE9DB over #E6DCC2); in the dark
  // scheme it steps toward warm black, so the stack reads as darker
  // sheets beneath, never as ink.
  const paperSurface = dark ? mix(palette.surface, "#332741", 0.38) : mix(palette.surface, "#FAF4E6", 0.5);
  const sheetEdgeNear = mix(paperSurface, dark ? "#07040C" : "#E2D2A9", dark ? 0.3 : 0.42);
  const sheetEdgeFar = mix(paperSurface, dark ? "#07040C" : "#E2D2A9", dark ? 0.55 : 0.72);

  return {
    id: "paper",
    isPaper: true,
    isEightBit: false,
    isTerminal: false,
    // Paper is a MATERIAL, not a color (Jonathan, v176): the page keeps
    // the palette's own hue — only a whisper of warm paper in it — and
    // the paper lives on the SURFACES: neutral cards become warm paper
    // stock, colored cards keep their full-strength hue and gain the
    // sheet edge as colored construction paper. v174 mixed
    // the whole app halfway to tan and read as a wash; this doesn't.
    // v182: the neutral stock pulled toward a cleaner white-paper —
    // the v176–v181 cream (#FBF3DE at 0.6, surface landing #FDF8EB)
    // read as BEIGE across whole screens ("not a huge fan of this
    // beige color"). The new mix target is a barely-warm white at a
    // lighter weight: the surface lands at #FDFAF3 (R−B ≈ 10, down
    // from 18) — still warm enough to not read as Classic white.
    background: dark ? mix(palette.background, "#2A1F3D", 0.22) : mix(palette.background, "#EFE9D8", 0.16),
    surface: paperSurface,
    border: dark ? mix(palette.border, "#000000", 0.25) : mix(palette.border, PAPER_INK_HEX, 0.1),
    darkBackground: mix(mix("#1E1B4B", palette.primary, 0.07), "#3A2A20", 0.16),
    darkSurface: mix("#2A2140", palette.primary, 0.08),
    cardShadow: {
      // v189: the STACKED-SHEET edge — two opaque stock shades
      // peeking behind the surface at 2px and 4px, like the next
      // sheets in the stack. No ink, no blur: an edge, not a shadow,
      // so a card reads as paper lying on paper instead of a button
      // floating over the page.
      boxShadow: `2px 2px 0px ${sheetEdgeNear}, 4px 4px 0px ${sheetEdgeFar}`,
      elevation: 2,
    },
    buttonShadow: {
      // The kit's original offset shadow (the mockup's exact values:
      // a faint near layer + the shadow itself at 7px/8px),
      // interactive-only since v189 — actual buttons and tappable
      // controls keep it; content surfaces wear the sheet edge.
      boxShadow: `3px 3px 0px rgba(24,8,44,0.12), 7px 8px 0px rgba(24,8,44,${PAPER_SHADOW_ALPHA})`,
      elevation: 5,
    },
    sheetShadow: {
      boxShadow: `0px -3px 0px rgba(24,8,44,0.14), 0px -6px 0px rgba(24,8,44,0.20)`,
      elevation: 8,
    },
    accentShadow: null,
    // v189: cut-paper corners for non-interactive paper — nearer to
    // square than the molded 18/24 of v174–v188. Real buttons keep
    // their own shapes (their radii live in their own styles).
    cardRadius: 6,
    sheetRadius: 12,
    borderWidth: null,
    frame: null,
    displayFont: null,
    bodyFont: null,
    // NO grain (Jonathan's ruling, 2026-10-22, after v176): the speckle
    // read as "little sprinkles" — not good, and not like paper. Paper
    // surfaces are flat color/stock + the sheet edge, nothing else.
    // These stay 0 under every skin; PaperGrainOverlay renders
    // nothing.
    grainOpacity: 0,
    grainColor: PAPER_INK_HEX,
    grainLightOpacity: 0,
    motion: PAPER_MOTION,
    // v190: the bigger scale — the mockup's proportions inside the
    // existing paper material (see PAPER_TYPE_SCALE above).
    type: PAPER_TYPE_SCALE,
  };
}
