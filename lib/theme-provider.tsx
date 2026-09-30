import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance, View, useColorScheme as useSystemColorScheme } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";

import { type ColorScheme } from "@/constants/theme";
import { APP_SETTINGS_STORAGE_KEY } from "@/lib/prayercircle-storage";
import { DEFAULT_ACCENT_THEME, getThemedPalette, normalizeAccentThemeId, type AccentThemeId } from "@/lib/color-themes";

type ThemeContextValue = {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  accentTheme: AccentThemeId;
  setAccentTheme: (theme: AccentThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? "light";
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(systemScheme);
  const [accentTheme, setAccentThemeState] = useState<AccentThemeId>(DEFAULT_ACCENT_THEME);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isManuallySet, setIsManuallySet] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(APP_SETTINGS_STORAGE_KEY).then((stored) => {
      if (!stored) return;
      try {
        const parsed = JSON.parse(stored) as { colorTheme?: unknown };
        setAccentThemeState(normalizeAccentThemeId(parsed.colorTheme));
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

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    setIsManuallySet(true);
    applyScheme(scheme);
  }, [applyScheme]);

  const setAccentTheme = useCallback((theme: AccentThemeId) => {
    setAccentThemeState(normalizeAccentThemeId(theme));
  }, []);

  // Initialize with system color scheme on mount
  useEffect(() => {
    if (!isInitialized) {
      setColorSchemeState(systemScheme);
      applyScheme(systemScheme);
      setIsInitialized(true);
    }
  }, [isInitialized, applyScheme, systemScheme]);

  // Only sync with system color scheme if user hasn't manually set it
  useEffect(() => {
    if (isInitialized && !isManuallySet) {
      setColorSchemeState(systemScheme);
      applyScheme(systemScheme);
    }
  }, [systemScheme, isInitialized, isManuallySet, applyScheme]);

  useEffect(() => {
    if (isInitialized) applyScheme(colorScheme);
  }, [accentTheme, applyScheme, colorScheme, isInitialized]);

  const themedPalette = useMemo(() => getThemedPalette(colorScheme, accentTheme), [accentTheme, colorScheme]);
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
      colorScheme,
      setColorScheme,
      accentTheme,
      setAccentTheme,
    }),
    [accentTheme, colorScheme, setAccentTheme, setColorScheme],
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
