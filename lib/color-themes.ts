import themeConfig from "../theme.config";

export type ColorScheme = "light" | "dark";
type ThemeColorPalette = Record<string, string>;

const SchemeColors: Record<ColorScheme, ThemeColorPalette> = {
  light: Object.fromEntries(Object.entries(themeConfig.themeColors).map(([name, swatch]) => [name, swatch.light])),
  dark: Object.fromEntries(Object.entries(themeConfig.themeColors).map(([name, swatch]) => [name, swatch.dark])),
};

export type AccentThemeId = "default" | "ocean" | "forest" | "sunset" | "pomegranate" | "crimson" | "charcoal-gold";

export type AccentThemeDefinition = {
  id: AccentThemeId;
  name: string;
  description: string;
  unlockLevel: number;
  swatch: string;
  light?: Partial<ThemeColorPalette>;
  dark?: Partial<ThemeColorPalette>;
};

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
  {
    id: "ocean",
    name: "Ocean",
    description: "Calming blue and teal theme",
    unlockLevel: 10,
    swatch: "#0A86B8",
    light: { primary: "#0A86B8" },
    dark: { primary: "#4EB9E4" },
  },
  {
    id: "forest",
    name: "Forest",
    description: "Natural green and earth tones",
    unlockLevel: 20,
    swatch: "#2E8B3C",
    light: { primary: "#2E8B3C" },
    dark: { primary: "#70C77B" },
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm orange and coral theme",
    unlockLevel: 30,
    swatch: "#F25700",
    light: { primary: "#F25700" },
    dark: { primary: "#FF9A57" },
  },
  {
    id: "pomegranate",
    name: "Pomegranate",
    description: "Rich pinkish purple theme",
    unlockLevel: 40,
    swatch: "#C91463",
    light: { primary: "#C91463" },
    dark: { primary: "#F072AA" },
  },
  {
    id: "crimson",
    name: "Crimson",
    description: "Bold red and wine accents",
    unlockLevel: 50,
    swatch: "#B3263E",
    light: { primary: "#B3263E" },
    dark: { primary: "#F27586" },
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
