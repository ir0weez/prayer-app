import themeConfig from "../theme.config";

export type ColorScheme = "light" | "dark";
type ThemeColorPalette = Record<string, string>;

const SchemeColors: Record<ColorScheme, ThemeColorPalette> = {
  light: Object.fromEntries(Object.entries(themeConfig.themeColors).map(([name, swatch]) => [name, swatch.light])),
  dark: Object.fromEntries(Object.entries(themeConfig.themeColors).map(([name, swatch]) => [name, swatch.dark])),
};

export type AccentThemeId = "default" | "red" | "yellow" | "blue" | "sky" | "ocean" | "teal" | "forest" | "sunset" | "pomegranate" | "crimson" | "lavender" | "midnight" | "charcoal-gold";

export type AccentThemeDefinition = {
  id: AccentThemeId;
  name: string;
  description: string;
  unlockLevel: number;
  swatch: string;
  light?: Partial<ThemeColorPalette>;
  dark?: Partial<ThemeColorPalette>;
};

function parseHex(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

/** Linear interpolation between two hex colors. weight 0 returns hexA, weight 1 returns hexB. */
export function mix(hexA: string, hexB: string, weight: number): string {
  const w = Math.min(1, Math.max(0, weight));
  const a = parseHex(hexA);
  const b = parseHex(hexB);
  const channel = (x: number, y: number) => Math.min(255, Math.max(0, Math.round(x + (y - x) * w))).toString(16).padStart(2, "0");
  return `#${channel(a.r, b.r)}${channel(a.g, b.g)}${channel(a.b, b.b)}`.toUpperCase();
}

/**
 * Builds light/dark palette overrides as tints and shades of the given primary
 * color, so a theme feels like its color everywhere instead of only on the
 * primary accent. Semantic colors (success, warning, error) are left to the
 * base palette and are never overridden here.
 */
export function buildThemeShades(primaryLight: string, primaryDark: string): {
  light: ThemeColorPalette;
  dark: ThemeColorPalette;
} {
  return {
    light: {
      primary: primaryLight,
      background: mix("#FFFFFF", primaryLight, 0.06),
      surface: mix("#FFFFFF", primaryLight, 0.03),
      foreground: mix("#241B38", primaryLight, 0.25),
      muted: mix("#6B6480", primaryLight, 0.35),
      border: mix("#FFFFFF", primaryLight, 0.18),
      studyBackground: mix("#FFFFFF", primaryLight, 0.04),
      studySurface: "#FFFFFF",
      studyAccent: primaryLight,
      studyAccentSoft: mix("#FFFFFF", primaryLight, 0.12),
      studyBorder: mix("#FFFFFF", primaryLight, 0.16),
      studyInk: "#241F2B",
      studyMuted: mix("#756F7D", primaryLight, 0.35),
    },
    dark: {
      primary: primaryDark,
      background: mix("#0F0D16", primaryDark, 0.07),
      surface: mix("#1A1626", primaryDark, 0.12),
      foreground: "#F5F2FA",
      muted: mix("#A79FBF", primaryDark, 0.4),
      border: mix("#000000", primaryDark, 0.28),
      studyBackground: mix("#15161A", primaryDark, 0.08),
      studySurface: mix("#202126", primaryDark, 0.1),
      studyAccent: primaryDark,
      studyAccentSoft: mix("#000000", primaryDark, 0.25),
      studyBorder: mix("#000000", primaryDark, 0.3),
      studyInk: "#F5F3F7",
      studyMuted: mix("#B7B1C1", primaryDark, 0.4),
    },
  };
}

export const ACCENT_THEMES: AccentThemeDefinition[] = [
  {
    id: "default",
    name: "Default",
    description: "Original PrayerCircle purple theme",
    unlockLevel: 1,
    swatch: "#8557D9",
    light: { primary: "#8557D9" },
    dark: { primary: "#A985F0" },
  },
  // v360 — the plain primaries (Jonathan, Oct 30: "I have every
  // color of blue, but not blue. I have every shade of red, but
  // not red. At least ROYGBIV"). Red, Yellow and Blue join Default
  // at level 1 — basics are never prestige rewards — with the
  // schedule family's own primary hexes as their swatches and
  // light primaries (the Studio chips carry these exact hexes, so
  // the Studio swatch and the app swatch are the identical
  // colour), and dark primaries tinted from them the way every
  // other theme's are. Green and orange were already covered
  // (Forest, Sunset); violet is Default itself.
  {
    id: "red",
    name: "Red",
    description: "True red theme",
    unlockLevel: 1,
    swatch: "#EF4444",
    ...buildThemeShades("#EF4444", "#F58585"),
  },
  {
    id: "yellow",
    name: "Yellow",
    description: "True yellow theme",
    unlockLevel: 1,
    swatch: "#FBBF24",
    ...buildThemeShades("#FBBF24", "#FCD571"),
  },
  {
    id: "blue",
    name: "Blue",
    description: "True blue theme",
    unlockLevel: 1,
    swatch: "#3B82F6",
    ...buildThemeShades("#3B82F6", "#80AEF9"),
  },
  {
    id: "sky",
    name: "Sky",
    description: "Light airy blue theme",
    unlockLevel: 5,
    swatch: "#2D9CDB",
    ...buildThemeShades("#2D9CDB", "#7CCBF5"),
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Calming blue and teal theme",
    unlockLevel: 10,
    swatch: "#0A86B8",
    ...buildThemeShades("#0A86B8", "#4EB9E4"),
  },
  {
    id: "teal",
    name: "Teal",
    description: "Deep teal waters theme",
    unlockLevel: 15,
    swatch: "#0E7C7B",
    ...buildThemeShades("#0E7C7B", "#4ECDC4"),
  },
  {
    id: "forest",
    name: "Forest",
    description: "Natural green and earth tones",
    unlockLevel: 20,
    swatch: "#2E8B3C",
    ...buildThemeShades("#2E8B3C", "#70C77B"),
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm orange and coral theme",
    unlockLevel: 30,
    swatch: "#F25700",
    ...buildThemeShades("#F25700", "#FF9A57"),
  },
  {
    id: "pomegranate",
    name: "Pomegranate",
    description: "Rich pinkish purple theme",
    unlockLevel: 40,
    swatch: "#C91463",
    ...buildThemeShades("#C91463", "#F072AA"),
  },
  {
    id: "crimson",
    name: "Crimson",
    description: "Bold red and wine accents",
    unlockLevel: 50,
    swatch: "#B3263E",
    ...buildThemeShades("#B3263E", "#F27586"),
  },
  {
    id: "lavender",
    name: "Lavender",
    description: "Soft violet haze theme",
    unlockLevel: 60,
    swatch: "#9B7EDE",
    ...buildThemeShades("#9B7EDE", "#C3B2F5"),
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Deep midnight blue theme",
    unlockLevel: 75,
    swatch: "#2C4A7C",
    ...buildThemeShades("#2C4A7C", "#7FA8E0"),
  },
  {
    id: "charcoal-gold",
    name: "Charcoal & Gold",
    description: "Dark charcoal with gold and ivory accents",
    unlockLevel: 100,
    swatch: "#C9A45C",
    light: {
      primary: "#A87B2E",
      background: "#F7F3E8",
      surface: "#FFFDF6",
      foreground: "#2B2925",
      muted: "#756C5D",
      border: "#DED2B8",
    },
    dark: {
      primary: "#D8B56A",
      background: "#171717",
      surface: "#242321",
      foreground: "#F5EBD3",
      muted: "#B8AA8B",
      border: "#4D4431",
    },
  },
];

export const DEFAULT_ACCENT_THEME: AccentThemeId = "default";

export function getAccentThemeDefinition(id: unknown): AccentThemeDefinition {
  return ACCENT_THEMES.find((theme) => theme.id === id) ?? ACCENT_THEMES[0];
}

export function getUnlockedAccentThemeIds(level: number): AccentThemeId[] {
  const safeLevel = Math.max(1, Math.floor(level));
  return ACCENT_THEMES.filter((theme) => safeLevel >= theme.unlockLevel).map((theme) => theme.id);
}

export function normalizeAccentThemeId(value: unknown): AccentThemeId {
  if (value === "rose") return "pomegranate";
  return ACCENT_THEMES.some((theme) => theme.id === value) ? value as AccentThemeId : DEFAULT_ACCENT_THEME;
}

export function getThemedPalette(scheme: ColorScheme, themeId: AccentThemeId): ThemeColorPalette {
  const definition = getAccentThemeDefinition(themeId);
  const overrides = scheme === "dark" ? definition.dark : definition.light;
  return { ...SchemeColors[scheme], ...overrides } as ThemeColorPalette;
}
