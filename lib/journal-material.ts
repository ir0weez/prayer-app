// ─── v252 "Journal, Material" ───────────────────────────────────────────────
// The Journal's Material 3 Expressive family, derived from the
// active palette exactly the way v250 derived the Bible's: the
// approved mockup (app-material-makeover-v2.html, Journal frame)
// supplies the structure — tonal cards, a gold praise treatment,
// seed-dressed chips and composer — and the palette he picked in
// Settings supplies every hue. The mockup's berry hexes were
// sampled from his then-current palette; they are seed ROLES, not
// values, and no mockup literal survives here.
//
// The one constant is the praise gold. Gold is a MEANING color in
// this app (the praise ring on the bell header, the XP chip): it
// does not follow the seed. Its deep shade and tint are still
// walked/mixed per palette so the treatment reads on every ground.

import { mix } from "@/lib/color-themes";
import { hexLuminance } from "@/lib/skin-themes";
import { bibleAccentInk, hexToHsl, hexToRgba, hslToHex } from "@/lib/bible-v205/palette-accents";

/** The praise gold — a meaning constant, never palette-derived. */
export const JOURNAL_PRAISE_GOLD = "#F59E0B";

/** The harmonized second hue: the seed rotated, as in the Bible family. */
export const JOURNAL_TEAL_OFFSET = 190;

export type JournalPaletteTokens = {
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  border: string;
};

export interface JournalMaterialFamily {
  /** The screen ground: the palette background with a breath of the seed. */
  ground: string;
  /** A feed card's surface (the palette surface token, dressed). */
  card: string;
  /** Seed-tonal fill: chips, media blocks, quiet surfaces on the card. */
  tonal: string;
  /** Ink guaranteed ≥4.5:1 on the tonal fill. */
  tonalInk: string;
  /** Body ink on the card (the palette foreground, walked if it ever fails). */
  ink: string;
  /** Softer ink on the card, still held to the 4.5:1 floor. */
  inkSoft: string;
  /** Hairlines inside the Material surfaces. */
  line: string;
  /** The seed itself, deepened until it reads as ink on the card. */
  deep: string;
  /** The harmonized teal (seed +190°), walked to ink on the card. */
  tealDeep: string;
  /** The active palette's primary, untouched — fills, the FAB, the Post arrow. */
  seed: string;
  /** Soft seed-colored shadow paint for the cards (an rgba string). */
  shadow: string;
  /** The praise gold constant. */
  gold: string;
  /** The gold washed over the card — the praise surface. */
  goldTint: string;
  /** Gold deepened until it reads as ink on the gold tint. */
  goldDeep: string;
  /** The composer morph's ground: the card surface at full opacity (v213's rule). */
  composerGround: string;
}

export function deriveJournalMaterial(primary: string, tokens: JournalPaletteTokens): JournalMaterialFamily {
  const dark = hexLuminance(tokens.background) < 0.5;
  const card = tokens.surface;
  const tonal = mix(card, primary, dark ? 0.22 : 0.1);
  const goldTint = mix(card, JOURNAL_PRAISE_GOLD, dark ? 0.24 : 0.14);
  const { h, s } = hexToHsl(primary);
  const sat = Math.min(0.85, Math.max(0.32, s));
  const tealSeed = hslToHex({ h: h + JOURNAL_TEAL_OFFSET, s: sat, l: dark ? 0.72 : 0.38 });
  return {
    ground: mix(tokens.background, primary, dark ? 0.05 : 0.04),
    card,
    tonal,
    tonalInk: bibleAccentInk(tokens.foreground, tonal),
    ink: bibleAccentInk(tokens.foreground, card),
    inkSoft: bibleAccentInk(tokens.muted, card),
    line: tokens.border,
    deep: bibleAccentInk(primary, card),
    tealDeep: bibleAccentInk(tealSeed, card),
    seed: primary,
    shadow: hexToRgba(primary, dark ? 0.4 : 0.1),
    gold: JOURNAL_PRAISE_GOLD,
    goldTint,
    goldDeep: bibleAccentInk(JOURNAL_PRAISE_GOLD, goldTint),
    composerGround: card,
  };
}
