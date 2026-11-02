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

// v411 (the Desk, journal-kind-formats-v24): the kind formats'
// hues — plum for Prayer, rose for Gratitude, green for the fast
// log — are MEANING hues like the count chips': fixed hues, mixed
// over the card with their inks walked to the contrast floor, so
// each kind keeps its identity on every palette while its tones
// re-derive with the seed family around it. (Praise gold and the
// answered teal already live above; the fast states' own meaning
// colors — held green, close-call amber, fell red — stay with
// lib/fast-tracker's constants, as the Day Page wears them.)
export const JOURNAL_KIND_HUES = {
  prayer: "#7C3AED",
  gratitude: "#DB2777",
  fastLog: "#22C55E",
  closeCall: "#D97706",
  fell: "#DC2626",
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
  /** v411: the answered BANNER's filled form (v24) — the teal
   *  seed mixed deep over the card in light; in dark the tint
   *  itself, so the banner never glares. Its ink walks on it. */
  tealFill: string;
  tealFillInk: string;
  /** v281: the count chips (Today strip + Day view) — a meaning
   *  hue mixed over the card, and that hue walked to ink on it. */
  entriesChipBg: string;
  entriesChipInk: string;
  photosChipBg: string;
  photosChipInk: string;
  eventsChipBg: string;
  eventsChipInk: string;
  /** v411 (the Desk): the kind formats' derived tones — each a
   *  meaning hue mixed over the card, its ink walked on the mix
   *  (the count-chip method), plus the deep form for labels and
   *  filled pills. */
  prayerTint: string;
  prayerInk: string;
  prayerDeep: string;
  gratitudeTint: string;
  gratitudeInk: string;
  gratitudeDeep: string;
  fastTint: string;
  fastInk: string;
  fastDeep: string;
  /** The fast log's state dots: the meaning hues themselves,
   *  deepened until they read on the fast tint. */
  heldDot: string;
  closeCallDot: string;
  fellDot: string;
  noteDot: string;
  /** v411: the Verse card's flat primary-container tonal — the
   *  Bible family's tapped-verse tone, mixed from the seed (never
   *  a gradient), and ink walked on it. */
  verseContainer: string;
  verseInk: string;
  verseInkSoft: string;
  /** v411: the question card's tonal (the family's container —
   *  the seed mixed deeper than the chip tonal), and its ink. */
  questionTint: string;
  questionInk: string;
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
  // v411: the kind tones — the count-chip method per kind: the
  // meaning hue mixed over the card, body ink walked on the mix,
  // and the hue itself walked to ink on the mix for labels/pills.
  const kindTone = (hue: string) => {
    const tint = mix(card, hue, dark ? 0.3 : 0.2);
    return { tint, ink: bibleAccentInk(tokens.foreground, tint), deep: bibleAccentInk(hue, tint) };
  };
  const prayerTone = kindTone(JOURNAL_KIND_HUES.prayer);
  const gratitudeTone = kindTone(JOURNAL_KIND_HUES.gratitude);
  const fastTone = kindTone(JOURNAL_KIND_HUES.fastLog);
  const verseContainer = mix(card, primary, dark ? 0.34 : 0.26);
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
    tealFill: dark ? tealTint : mix(card, tealSeed, 0.82),
    tealFillInk: dark
      ? bibleAccentInk(tokens.foreground, tealTint)
      : bibleAccentInk("#FFFFFF", mix(card, tealSeed, 0.82)),
    entriesChipBg: entriesChip.bg,
    entriesChipInk: entriesChip.ink,
    photosChipBg: photosChip.bg,
    photosChipInk: photosChip.ink,
    eventsChipBg: eventsChip.bg,
    eventsChipInk: eventsChip.ink,
    prayerTint: prayerTone.tint,
    prayerInk: prayerTone.ink,
    prayerDeep: prayerTone.deep,
    gratitudeTint: gratitudeTone.tint,
    gratitudeInk: gratitudeTone.ink,
    gratitudeDeep: gratitudeTone.deep,
    fastTint: fastTone.tint,
    fastInk: fastTone.ink,
    fastDeep: fastTone.deep,
    heldDot: bibleAccentInk(JOURNAL_KIND_HUES.fastLog, fastTone.tint),
    closeCallDot: bibleAccentInk(JOURNAL_KIND_HUES.closeCall, fastTone.tint),
    fellDot: bibleAccentInk(JOURNAL_KIND_HUES.fell, fastTone.tint),
    noteDot: bibleAccentInk(primary, fastTone.tint),
    verseContainer,
    verseInk: bibleAccentInk(tokens.foreground, verseContainer),
    verseInkSoft: bibleAccentInk(tokens.muted, verseContainer),
    questionTint: mix(card, primary, dark ? 0.3 : 0.22),
    questionInk: bibleAccentInk(tokens.foreground, mix(card, primary, dark ? 0.3 : 0.22)),
    seed: primary,
    shadow: hexToRgba(primary, dark ? 0.4 : 0.1),
    gold: JOURNAL_PRAISE_GOLD,
    goldTint,
    goldDeep: bibleAccentInk(JOURNAL_PRAISE_GOLD, goldTint),
    composerGround: card,
  };
}
