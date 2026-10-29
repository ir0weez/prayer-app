// ─── v336 — the News & Email pages' Material family ─────────────────────────
// Derived from the active palette exactly the way v286 derived the
// Budget family's: the approved mockups (news-email-concepts-v3.html
// — News "The Briefing, Boxed", Email "Digest, then Groups") supply
// the structure, and the palette he picked in Settings supplies
// every hue. The mockup's violet never survives here — the open
// accordion box is the seed's own primary-container step, per his
// ruling (Oct 29): "the chosen color of the app".

import { mix } from "@/lib/color-themes";
import { hexLuminance } from "@/lib/skin-themes";
import { bibleAccentInk, hexToRgba } from "@/lib/bible-v205/palette-accents";

export type NewsEmailPaletteTokens = {
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  border: string;
};

export interface NewsEmailMaterialFamily {
  /** The screen ground — also the TopFade's colour (v334 rule). */
  ground: string;
  /** The plain compact card: closed accordion items, group cards. */
  card: string;
  /** The OPEN accordion item / the digest hero: the primary-container
   * step — the seed mixed over the card until it reads as the app's
   * chosen colour, worn by exactly one box at a time. */
  openBox: string;
  /** Ink guaranteed ≥4.5:1 on the open box. */
  openInk: string;
  /** Softer ink on the open box, still held to the 4.5:1 floor. */
  openInkSoft: string;
  /** Number chip fill on a CLOSED card — a light seed tonal. */
  chipOnCard: string;
  /** Number chip ink on a closed card. */
  chipOnCardInk: string;
  /** Number chip fill inside the OPEN box — the plain card colour,
   * so the filled chip reads against the container tone. */
  chipOnOpen: string;
  /** Number chip ink inside the open box. */
  chipOnOpenInk: string;
  /** Quiet tonal fill: count chips, icon seats, the filed box. */
  tonal: string;
  /** Ink guaranteed ≥4.5:1 on the tonal fill. */
  tonalInk: string;
  /** Body ink on the card, walked if it ever fails. */
  ink: string;
  /** Softer ink on the card, still held to the 4.5:1 floor. */
  inkSoft: string;
  /** Hairlines inside the Material surfaces. */
  line: string;
  /** The seed itself, deepened until it reads as ink on the card. */
  deep: string;
  /** The active palette's primary, untouched — the Finished fill. */
  seed: string;
  /** Ink that reads on the seed fill. */
  onSeed: string;
  /** Soft seed-colored shadow paint for the cards (an rgba string). */
  shadow: string;
}

export function deriveNewsEmailMaterial(
  primary: string,
  tokens: NewsEmailPaletteTokens
): NewsEmailMaterialFamily {
  const dark = hexLuminance(tokens.background) < 0.5;
  const card = tokens.surface;
  const openBox = mix(card, primary, dark ? 0.36 : 0.26);
  const tonal = mix(card, primary, dark ? 0.22 : 0.1);
  const deep = bibleAccentInk(primary, card);
  return {
    ground: mix(tokens.background, primary, dark ? 0.1 : 0.08),
    card,
    openBox,
    openInk: bibleAccentInk(tokens.foreground, openBox),
    openInkSoft: bibleAccentInk(tokens.muted, openBox),
    chipOnCard: tonal,
    chipOnCardInk: deep,
    chipOnOpen: card,
    chipOnOpenInk: bibleAccentInk(primary, card),
    tonal,
    tonalInk: bibleAccentInk(tokens.foreground, tonal),
    ink: bibleAccentInk(tokens.foreground, card),
    inkSoft: bibleAccentInk(tokens.muted, card),
    line: tokens.border,
    deep,
    seed: primary,
    onSeed: hexLuminance(primary) > 0.7 ? mix(primary, "#000000", 0.8) : "#FFFFFF",
    shadow: `0 4px 14px ${hexToRgba(primary, dark ? 0.4 : 0.12)}`,
  };
}
