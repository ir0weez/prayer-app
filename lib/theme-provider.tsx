import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance, View, useColorScheme as useSystemColorScheme } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";

import { type ColorScheme } from "@/constants/theme";
import { APP_SETTINGS_STORAGE_KEY } from "@/lib/prayercircle-storage";
import { DEFAULT_ACCENT_THEME, getThemedPalette, normalizeAccentThemeId, type AccentThemeId } from "@/lib/color-themes";
import { DEFAULT_SKIN_THEME, normalizeSkinThemeId, type SkinThemeId } from "@/lib/skin-themes";
import {
  normalizeTextSizePreference,
  setTextScaleFactor,
  textScaleFactor,
  type TextSizePreference,
} from "@/lib/text-scale";

// v315: appearance is a real tri-state preference ("light" | "system"
// | "dark"), persisted inside the app-settings blob
// (prayercircle.app-settings.v1) and mirrored in by the Settings
// screen, the same way accent and skin are. Before this, a manual
// setColorScheme lived only in memory and the app fell back to the
// system scheme on every cold start.
export type AppearancePreference = "light" | "system" | "dark";

export function normalizeAppearancePreference(value: unknown): AppearancePreference {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

type ThemeContextValue = {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  appearance: AppearancePreference;
  setAppearance: (appearance: AppearancePreference) => void;
  accentTheme: AccentThemeId;
  setAccentTheme: (theme: AccentThemeId) => void;
  skinTheme: SkinThemeId;
  setSkinTheme: (skin: SkinThemeId) => void;
  // v316: the text-size preference and its live scale factor.
  // The factor itself is applied inside lib/text-scale.tsx's
  // ScaledText; this context carries the preference for the
  // Settings screen and any surface that wants the number.
  textSize: TextSizePreference;
  setTextSize: (size: TextSizePreference) => void;
  textScale: number;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? "light";
  const [appearance, setAppearanceState] = useState<AppearancePreference>("system");
  const [accentTheme, setAccentThemeState] = useState<AccentThemeId>(DEFAULT_ACCENT_THEME);
  const [skinTheme, setSkinThemeState] = useState<SkinThemeId>(DEFAULT_SKIN_THEME);
  const [textSize, setTextSizeState] = useState<TextSizePreference>("default");
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(APP_SETTINGS_STORAGE_KEY).then((stored) => {
      if (!stored) return;
      try {
        const parsed = JSON.parse(stored) as { colorTheme?: unknown; skinTheme?: unknown; appearance?: unknown; textSize?: unknown };
        setAccentThemeState(normalizeAccentThemeId(parsed.colorTheme));
        setSkinThemeState(normalizeSkinThemeId(parsed.skinTheme));
        setAppearanceState(normalizeAppearancePreference(parsed.appearance));
        setTextSizeState(normalizeTextSizePreference(parsed.textSize));
      } catch {
        // Keep the default accent when settings are malformed.
      }
    }).catch(() => undefined);
  }, []);

  const applyScheme = useCallback((scheme: ColorScheme) => {
    nativewindColorScheme.set(scheme);
    Appearance.setColorScheme?.(scheme);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.dataset.theme = scheme;
      root.classList.toggle("dark", scheme === "dark");
      const palette = getThemedPalette(scheme, accentTheme);
      Object.entries(palette).forEach(([token, value]) => {
        root.style.setProperty(`--color-${token}`, value);
      });
    }
  }, [accentTheme]);

  // v315: an explicit scheme pick IS an appearance pick now — the
  // dev theme lab's Light/Dark buttons keep working through this,
  // and the choice persists via the Settings screen's mirror.
  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setAppearanceState(scheme);
  }, []);

  const setAppearance = useCallback((next: AppearancePreference) => {
    setAppearanceState(normalizeAppearancePreference(next));
  }, []);

  const setAccentTheme = useCallback((theme: AccentThemeId) => {
    setAccentThemeState(normalizeAccentThemeId(theme));
  }, []);

  const setSkinTheme = useCallback((skin: SkinThemeId) => {
    setSkinThemeState(normalizeSkinThemeId(skin));
  }, []);

  const setTextSize = useCallback((size: TextSizePreference) => {
    setTextSizeState(normalizeTextSizePreference(size));
  }, []);

  // v316: the preference becomes a live factor. The text-scale
  // store is what every ScaledText subscribes to, so this one
  // effect is the whole app's text resizing — no restart, no
  // screen-by-screen adoption.
  useEffect(() => {
    setTextScaleFactor(textScaleFactor(textSize));
  }, [textSize]);

  // Terminal skin (v186): the tube is one dark world — while it is
  // active, the palette resolves as DARK so text stays legible on the
  // near-black green panels everywhere (the same reason 8-bit's dusk
  // pairs with dark-scheme inks). The user's own scheme preference
  // stays untouched in state and returns the moment another skin is
  // picked; every other skin sees exactly the scheme it always saw.
  // v315: the base scheme is DERIVED from the appearance preference —
  // "system" follows the device live, "light"/"dark" hold. There is
  // no separate scheme state to drift out of sync.
  const baseScheme: ColorScheme = appearance === "system" ? systemScheme : appearance;
  const effectiveColorScheme: ColorScheme = skinTheme === "terminal" ? "dark" : baseScheme;

  // Initialize on mount — the apply effect below takes it from here.
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true);
    }
  }, [isInitialized]);

  useEffect(() => {
    if (isInitialized) applyScheme(effectiveColorScheme);
  }, [accentTheme, applyScheme, effectiveColorScheme, isInitialized]);

  const themedPalette = useMemo(() => getThemedPalette(effectiveColorScheme, accentTheme), [accentTheme, effectiveColorScheme]);
  const themeVariables = useMemo(
    () => vars({
      "color-primary": themedPalette.primary,
      "color-background": themedPalette.background,
      "color-surface": themedPalette.surface,
      "color-foreground": themedPalette.foreground,
      "color-muted": themedPalette.muted,
      "color-border": themedPalette.border,
      "color-success": themedPalette.success,
      "color-warning": themedPalette.warning,
      "color-error": themedPalette.error,
    }),
    [themedPalette],
  );

  const value = useMemo(
    () => ({
      colorScheme: effectiveColorScheme,
      setColorScheme,
      appearance,
      setAppearance,
      accentTheme,
      setAccentTheme,
      skinTheme,
      setSkinTheme,
      textSize,
      setTextSize,
      textScale: textScaleFactor(textSize),
    }),
    [accentTheme, appearance, effectiveColorScheme, setAccentTheme, setAppearance, setColorScheme, setSkinTheme, skinTheme, textSize, setTextSize],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, themeVariables]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return ctx;
}
