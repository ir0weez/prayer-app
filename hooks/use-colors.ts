import { type ColorScheme, type ThemeColorPalette } from "@/constants/theme";
import { getThemedPalette } from "@/lib/color-themes";
import { useThemeContext } from "@/lib/theme-provider";
import { useColorScheme } from "./use-color-scheme";

/**
 * Returns the current theme's color palette.
 * Usage: const colors = useColors(); then colors.text, colors.background, etc.
 */
export function useColors(colorSchemeOverride?: ColorScheme): ThemeColorPalette {
  const colorSchema = useColorScheme();
  const { accentTheme } = useThemeContext();
  const scheme = (colorSchemeOverride ?? colorSchema ?? "light") as ColorScheme;
  return getThemedPalette(scheme, accentTheme) as ThemeColorPalette;
}
