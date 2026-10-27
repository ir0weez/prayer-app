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

// v281: the count chips' meaning hues — entries are living green,
// photos are sky blue, events are rose — the same rule as the
// praise gold: MEANING constants, never the mockup's pastel washes
// (those pinned hexes were D6). Each hue is mixed over the card
// (the goldTint method) and its ink walked to the contrast floor,
// so the chips re-tone with every palette while their meanings
// stay put.
export const JOURNAL_COUNT_HUES = {
  entries: "#22C55E",
  photos: "#3B82F6",
  events: "#EC4899",
} as const;

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
  /** v281: the answered-prayer surface — the teal washed over the
   *  card (Frame 7's teal answered card, family-derived). */
  tealTint: string;
  /** v281: the teal walked to ink ON the teal tint — the answered
   *  card's kicker and accents. */
  tealTintInk: string;
  /** v281: body ink walked on the teal tint (answered cards). */
  tealInk: string;
  /** v281: soft ink walked on the teal tint (answered cards). */
  tealInkSoft: string;
  /** v281: the count chips (Today strip + Day view) — a meaning
   *  hue mixed over the card, and that hue walked to ink on it. */
  entriesChipBg: string;
  entriesChipInk: string;
  photosChipBg: string;
  photosChipInk: string;
  eventsChipBg: string;
  eventsChipInk: string;
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
  // v281 (D3): the answered card's tint — the same teal seed the
  // family already harmonizes, washed over the card the way gold
  // is washed for praise; its inks walk on the tint itself.
  const tealTint = mix(card, tealSeed, dark ? 0.3 : 0.24);
  // v281 (D6/D12): the count chips — meaning hue over the card,
  // ink walked on the mix (the goldTint method, per count).
  const countChip = (hue: string) => {
    const bg = mix(card, hue, dark ? 0.32 : 0.24);
    return { bg, ink: bibleAccentInk(hue, bg) };
  };
  const entriesChip = countChip(JOURNAL_COUNT_HUES.entries);
  const photosChip = countChip(JOURNAL_COUNT_HUES.photos);
  const eventsChip = countChip(JOURNAL_COUNT_HUES.events);
  return {
    // v281 (D1): the ground step deepens — v252's 4% wash left
    // card and ground nearly one tone, and the page read flat.
    // The filled tonal chrome (Today strip, Yesterday peek, the
    // count chips) does the rest of the layering.
    ground: mix(tokens.background, primary, dark ? 0.1 : 0.08),
    card,
    tonal,
    tonalInk: bibleAccentInk(tokens.foreground, tonal),
    ink: bibleAccentInk(tokens.foreground, card),
    inkSoft: bibleAccentInk(tokens.muted, card),
    line: tokens.border,
    deep: bibleAccentInk(primary, card),
    tealDeep: bibleAccentInk(tealSeed, card),
    tealTint,
    tealTintInk: bibleAccentInk(tealSeed, tealTint),
    tealInk: bibleAccentInk(tokens.foreground, tealTint),
    tealInkSoft: bibleAccentInk(tokens.muted, tealTint),
    entriesChipBg: entriesChip.bg,
    entriesChipInk: entriesChip.ink,
    photosChipBg: photosChip.bg,
    photosChipInk: photosChip.ink,
    eventsChipBg: eventsChip.bg,
    eventsChipInk: eventsChip.ink,
    seed: primary,
    shadow: hexToRgba(primary, dark ? 0.4 : 0.1),
    gold: JOURNAL_PRAISE_GOLD,
    goldTint,
    goldDeep: bibleAccentInk(JOURNAL_PRAISE_GOLD, goldTint),
    composerGround: card,
  };
}
