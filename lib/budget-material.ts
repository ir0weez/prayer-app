// ─── v286 "Budget, To the Approved Blend" ───────────────────────────────────
// The Budget page's Material family, derived from the active
// palette exactly the way v252 derived the Journal's: the approved
// mockup (budget-material-concepts-v2.html — Concept 1's hero box +
// Concept 2's scrollable mini strip, approved Oct 27 08:57) supplies
// the structure, and the palette he picked in Settings supplies
// every hue. No mockup literal survives here.
//
// The two constants are MEANING colors, the journal/people rule:
// paid is the app's standing green and late is the app's standing
// emergency red. They never follow the seed; their inks are still
// walked to the 4.5:1 floor on whatever surface they land on.

import { mix } from "@/lib/color-themes";
import { hexLuminance } from "@/lib/skin-themes";
import { bibleAccentInk, hexToRgba } from "@/lib/bible-v205/palette-accents";

/** Paid — the app's standing green (the old page's paid value, the journal entries hue). */
export const BUDGET_PAID_GREEN = "#22C55E";

/** Late — the app's standing emergency red. */
export const BUDGET_LATE_RED = "#EF4444";

export type BudgetPaletteTokens = {
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  border: string;
};

export interface BudgetMaterialFamily {
  /** The screen ground: the palette background with a breath of the seed. */
  ground: string;
  /** A bill row's / the sheet's surface (the palette surface token). */
  card: string;
  /** The hero box: the seed mixed deep over the card — the mockup's saturated tone. */
  hero: string;
  /** Ink guaranteed ≥4.5:1 on the hero. */
  heroInk: string;
  /** Softer ink on the hero, still held to the 4.5:1 floor. */
  heroInkSoft: string;
  /** The progress track inside the hero. */
  heroBarTrack: string;
  /** The progress fill inside the hero — the seed itself. */
  heroBarFill: string;
  /** Seed-tonal fill: the mini strip cards, chips, quiet surfaces on the card. */
  tonal: string;
  /** Ink guaranteed ≥4.5:1 on the tonal fill. */
  tonalInk: string;
  /** The NEXT DUE mini's hotter tonal step. */
  tonalHot: string;
  /** Body ink on the card, walked if it ever fails. */
  ink: string;
  /** Softer ink on the card, still held to the 4.5:1 floor. */
  inkSoft: string;
  /** Hairlines inside the Material surfaces. */
  line: string;
  /** The seed itself, deepened until it reads as ink on the card. */
  deep: string;
  /** The active palette's primary, untouched — fills, the Add pill, the toggle. */
  seed: string;
  /** Soft seed-colored shadow paint for the cards (an rgba string). */
  shadow: string;
  /** The paid green constant — the checkbox fill. */
  paidGreen: string;
  /** The paid green walked to ink on the card. */
  paidInk: string;
  /** The late red walked to ink on the card — late flags and late due lines. */
  lateInk: string;
}

export function deriveBudgetMaterial(primary: string, tokens: BudgetPaletteTokens): BudgetMaterialFamily {
  const dark = hexLuminance(tokens.background) < 0.5;
  const card = tokens.surface;
  const tonal = mix(card, primary, dark ? 0.22 : 0.1);
  const hero = mix(card, primary, dark ? 0.38 : 0.3);
  return {
    ground: mix(tokens.background, primary, dark ? 0.1 : 0.08),
    card,
    hero,
    heroInk: bibleAccentInk(tokens.foreground, hero),
    heroInkSoft: bibleAccentInk(tokens.muted, hero),
    heroBarTrack: mix(hero, tokens.background, dark ? 0.55 : 0.3),
    heroBarFill: primary,
    tonal,
    tonalInk: bibleAccentInk(tokens.foreground, tonal),
    tonalHot: mix(card, primary, dark ? 0.34 : 0.2),
    ink: bibleAccentInk(tokens.foreground, card),
    inkSoft: bibleAccentInk(tokens.muted, card),
    line: tokens.border,
    deep: bibleAccentInk(primary, card),
    seed: primary,
    shadow: hexToRgba(primary, dark ? 0.4 : 0.1),
    paidGreen: BUDGET_PAID_GREEN,
    paidInk: bibleAccentInk(BUDGET_PAID_GREEN, card),
    lateInk: bibleAccentInk(BUDGET_LATE_RED, card),
  };
}
