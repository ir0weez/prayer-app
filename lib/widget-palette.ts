// ─── v441 — the widget palette (seed × appearance, derived never pinned) ───
// The three rectangle widgets (Pray Strip / Pray Next / Reach Pair)
// wear NO dress of their own: every colour they render arrives in
// the snapshot as this palette, computed here from the same values
// the app itself reads — the app-settings blob's colorTheme (the
// seed, an AccentThemeId) and appearance, resolved through
// lib/color-themes' getThemedPalette (the app's own seed × scheme
// derivation) and toned with the Material families' methods
// (lib/journal-material's tonal / container / kind-tone mixes and
// bibleAccentInk's contrast walk). Change the seed or the
// appearance in Settings and the rectangles re-dress on the next
// push, exactly like every in-app Material surface.
//
// The greens are the reached hue (JOURNAL_KIND_HUES.reached — the
// Reach Out family's meaning green), toned by the kind-tone method:
// mixed over the surface for the container, walked to ink on it
// for the green itself. The Kotlin renderer paints white shape
// drawables with these values (setColorFilter / setTextColor); if
// a snapshot carries no palette (written before v441), the
// renderer falls back to the W-3 drawing's Classic-light values.

import { bibleAccentInk } from "./bible-v205/palette-accents";
import {
  getThemedPalette,
  mix,
  type AccentThemeId,
  type ColorScheme,
} from "./color-themes";
import { JOURNAL_KIND_HUES } from "./journal-material";

export interface WidgetPalette {
  /** The card itself. */
  surface: string;
  /** A quieter tonal step on the card (journal tonal method). */
  surfaceAlt: string;
  /** Headline ink on the surface, walked to the contrast floor. */
  ink: string;
  /** Body ink on the surface (the muted walked to the floor). */
  body: string;
  /** Micro-label ink (the palette muted, as the app uses it). */
  muted: string;
  /** The seed. */
  primary: string;
  /** Ink on a primary fill (white walked on the seed). */
  onPrimary: string;
  /** The family's container tone (the verseContainer mix). */
  container: string;
  /** Ink on the container. */
  onContainer: string;
  /** A deeper chip tonal (the questionTint mix). */
  chip: string;
  /** Hairlines / tracks (the palette border). */
  track: string;
  /** The reached green, walked to ink on its container. */
  green: string;
  /** The reached green mixed over the surface (kind-tone tint). */
  greenContainer: string;
}

export function buildWidgetPalette(scheme: ColorScheme, themeId: AccentThemeId): WidgetPalette {
  const palette = getThemedPalette(scheme, themeId);
  const dark = scheme === "dark";
  const surface = palette.surface;
  const primary = palette.primary;
  const greenContainer = mix(surface, JOURNAL_KIND_HUES.reached, dark ? 0.3 : 0.2);
  return {
    surface,
    surfaceAlt: mix(surface, primary, dark ? 0.22 : 0.1),
    ink: bibleAccentInk(palette.foreground, surface),
    body: bibleAccentInk(palette.muted, surface),
    muted: palette.muted,
    primary,
    onPrimary: bibleAccentInk("#FFFFFF", primary),
    container: mix(surface, primary, dark ? 0.34 : 0.26),
    onContainer: bibleAccentInk(palette.foreground, mix(surface, primary, dark ? 0.34 : 0.26)),
    chip: mix(surface, primary, dark ? 0.3 : 0.22),
    track: palette.border,
    green: bibleAccentInk(JOURNAL_KIND_HUES.reached, greenContainer),
    greenContainer,
  };
}
