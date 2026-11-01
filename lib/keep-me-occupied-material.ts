// ─── v395 "Keep Me Occupied" — the Material family ──────────────────────────
// The feature's Material 3 Expressive family, derived from the
// active palette exactly the way v252 derived the Journal's and
// v286 the Budget's: the approved mockup
// (keep-me-occupied-concept-v3.html) supplies the structure, and
// the palette he picked in Settings supplies the hues. The mockup
// was drawn inside his blue-seed Fasting Tracker; none of its
// literals survive here.
//
// The warm red is a MEANING color, the people/budget rule: the
// app's standing emergency red and its deep ground. It never
// follows the seed (a thumb in a bad minute knows this card on
// sight, whatever palette is active), and its washes are stepped
// from the active surface × appearance like every other meaning
// tint in the app.

import { mix } from "@/lib/color-themes";
import { hexLuminance } from "@/lib/skin-themes";
import { bibleAccentInk, hexToRgba } from "@/lib/bible-v205/palette-accents";

/** The standing emergency red — KMO's meaning color. */
export const KMO_RED = "#EF4444";
/** The emergency pill's deep ground (emergency-prayer-pill.tsx). */
export const KMO_RED_DEEP = "#991B1B";

export type KmoPaletteTokens = {
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  border: string;
};

export interface KeepMeOccupiedMaterialFamily {
  /** The screen ground: the palette background with a breath of the seed. */
  ground: string;
  /** Card surface (the palette surface token). */
  card: string;
  /** Seed-tonal fill: quiet chips and secondary surfaces. */
  tonal: string;
  /** Ink guaranteed ≥4.5:1 on the tonal fill. */
  tonalInk: string;
  /** The hotter tonal step. */
  tonalHot: string;
  /** Body ink on the card. */
  ink: string;
  /** Softer ink on the card, still held to the 4.5:1 floor. */
  inkSoft: string;
  /** Hairlines. */
  line: string;
  /** The active palette's primary, untouched — "Pray it out", the deal pill on quiet surfaces. */
  seed: string;
  /** The seed walked to ink on the card. */
  deep: string;
  /** Soft seed-colored shadow paint. */
  shadow: string;
  /** The door card's warm wash: the meaning red stepped into the surface. */
  redWash: string;
  /** A deeper red step: borders and the icon tile's ground. */
  redWashDeep: string;
  /** Ink guaranteed ≥4.5:1 on the red wash. */
  redInk: string;
  /** Softer ink on the red wash, still held to the floor. */
  redInkSoft: string;
  /** The filled red: the meaning red's deep ground, as the emergency pill wears it. */
  redFill: string;
  /** Ink on the filled red. */
  redFillInk: string;
}

export function deriveKeepMeOccupiedMaterial(primary: string, tokens: KmoPaletteTokens): KeepMeOccupiedMaterialFamily {
  const dark = hexLuminance(tokens.background) < 0.5;
  const card = tokens.surface;
  const redWash = mix(card, KMO_RED, dark ? 0.3 : 0.16);
  const redWashDeep = mix(card, KMO_RED, dark ? 0.45 : 0.3);
  return {
    ground: mix(tokens.background, primary, dark ? 0.08 : 0.06),
    card,
    tonal: mix(card, primary, dark ? 0.22 : 0.1),
    tonalInk: bibleAccentInk(tokens.foreground, mix(card, primary, dark ? 0.22 : 0.1)),
    tonalHot: mix(card, primary, dark ? 0.34 : 0.2),
    ink: bibleAccentInk(tokens.foreground, card),
    inkSoft: bibleAccentInk(tokens.muted, card),
    line: tokens.border,
    seed: primary,
    deep: bibleAccentInk(primary, card),
    shadow: hexToRgba(primary, dark ? 0.4 : 0.1),
    redWash,
    redWashDeep,
    redInk: bibleAccentInk(tokens.foreground, redWash),
    redInkSoft: bibleAccentInk(tokens.muted, redWash),
    redFill: KMO_RED_DEEP,
    redFillInk: bibleAccentInk("#FFFFFF", KMO_RED_DEEP),
  };
}
