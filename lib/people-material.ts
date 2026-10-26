// ─── v254 "People, First" ───────────────────────────────────────────────────
// The People's Material 3 Expressive family, derived from the active
// palette exactly the way v250 derived the Bible's and v252 the
// Journal's: the approved mockups (people-material-concept-v2,
// people-material-surfaces-v1, people-group-builder-v1,
// bell-material-concept-v1, praytoday-urgent-feel-v1) supply the
// structure, and the palette he picked in Settings supplies every
// hue. The mockups' violet hexes were sampled from his then-current
// palette; they are seed ROLES, not values, and no mockup literal
// survives here.
//
// Meaning colors never follow the seed: emergency red, praise gold,
// the reach amber, the prayed green, and the per-type accents from
// relationshipColors keep their own values everywhere in this stage.

import { mix } from "@/lib/color-themes";
import { hexLuminance } from "@/lib/skin-themes";
import { bibleAccentInk, hexToHsl, hexToRgba, hslToHex } from "@/lib/bible-v205/palette-accents";

/** Praise gold — a meaning constant (the bell's praise ring, the XP chip). */
export const PEOPLE_PRAISE_GOLD = "#F59E0B";
/** The XP chip gold from the Bible rewards family — same chip, same gold. */
export const PEOPLE_XP_GOLD = "#FFC53D";
export const PEOPLE_XP_GOLD_INK = "#4A2F00";
/** Emergency red — the app's standing emergency accent. */
export const PEOPLE_EMERGENCY_RED = "#EF4444";
export const PEOPLE_EMERGENCY_DEEP = "#991B1B";
/** Prayed / complete green (the story ring's prayed color). */
export const PEOPLE_PRAYED_GREEN = "#31C48D";
export const PEOPLE_PRAYED_DEEP = "#1E9E6A";
/** Reach amber — the app's standing last-reached warning color. */
export const PEOPLE_REACH_AMBER = "#F59E0B";

/**
 * The FIRST card's warmth (praytoday-urgent-feel-v1): praise gold's
 * calmer cousin. Constants, like the gold they sit beside — warmth
 * is a meaning here ("start here"), not a palette role.
 */
export const FIRST_CARD = {
  bgFrom: "#FBF1D7",
  bgTo: "#F7E9C6",
  line: "#EAD49C",
  ink: "#4A3208",
  sub: "#8A6D3B",
  deep: "#B45309",
  pillInk: "#FFF7E6",
} as const;

export type PeoplePaletteTokens = {
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  border: string;
};

export interface PeopleMaterialFamily {
  /** The screen ground: the palette background with a breath of the seed. */
  ground: string;
  /** Card surface (the palette surface token). */
  card: string;
  /** Seed wash — tonal fills, the don't-slip card ground, chips. */
  wash: string;
  /** Deeper seed wash — stacked-face overflow, quiet borders. */
  wash2: string;
  /** Ink guaranteed ≥4.5:1 on the wash. */
  washInk: string;
  /** Body ink on the card. */
  ink: string;
  /** Softer ink on the card, held to the 4.5:1 floor. */
  inkSoft: string;
  /** Hairlines inside the Material surfaces. */
  line: string;
  /** The seed itself, untouched — fills and selected states. */
  seed: string;
  /** The seed deepened until it reads as ink on the card. */
  deep: string;
  /** The darkest seed shade — filled pills (Pray Today, footer). */
  inkSeed: string;
  /** The harmonized teal (seed +190°), walked to ink — the queue bar's far end. */
  tealDeep: string;
  /** Soft seed-colored shadow paint for the cards (an rgba string). */
  shadow: string;
  /** Praise gold constant. */
  gold: string;
  /** Gold washed over the card — the praise surface. */
  goldTint: string;
  /** A lighter gold wash — praise/celebration quiet surfaces. */
  goldWash: string;
  /** Gold deepened until it reads as ink on the gold tint. */
  goldDeep: string;
  /** Emergency red washed over the card. */
  redWash: string;
  /** Reach-amber wash (due badges, reach rows). */
  amberWash: string;
  /** Amber deepened to ink on its wash. */
  amberDeep: string;
}

export function derivePeopleMaterial(primary: string, tokens: PeoplePaletteTokens): PeopleMaterialFamily {
  const dark = hexLuminance(tokens.background) < 0.5;
  const card = tokens.surface;
  const wash = mix(card, primary, dark ? 0.22 : 0.1);
  const wash2 = mix(card, primary, dark ? 0.34 : 0.2);
  const goldTint = mix(card, PEOPLE_PRAISE_GOLD, dark ? 0.26 : 0.16);
  const goldWash = mix(card, PEOPLE_PRAISE_GOLD, dark ? 0.18 : 0.1);
  const { h, s, l } = hexToHsl(primary);
  const sat = Math.min(0.85, Math.max(0.32, s));
  const tealSeed = hslToHex({ h: h + 190, s: sat, l: dark ? 0.72 : 0.38 });
  const inkSeed = hslToHex({ h, s: Math.min(0.9, sat + 0.05), l: dark ? 0.82 : Math.min(0.16, l * 0.45) });
  return {
    ground: mix(tokens.background, primary, dark ? 0.05 : 0.04),
    card,
    wash,
    wash2,
    washInk: bibleAccentInk(tokens.foreground, wash),
    ink: bibleAccentInk(tokens.foreground, card),
    inkSoft: bibleAccentInk(tokens.muted, card),
    line: tokens.border,
    seed: primary,
    deep: bibleAccentInk(primary, card),
    inkSeed,
    tealDeep: bibleAccentInk(tealSeed, card),
    shadow: hexToRgba(primary, dark ? 0.4 : 0.1),
    gold: PEOPLE_PRAISE_GOLD,
    goldTint,
    goldWash,
    goldDeep: bibleAccentInk(PEOPLE_PRAISE_GOLD, goldTint),
    redWash: mix(card, PEOPLE_EMERGENCY_RED, dark ? 0.26 : 0.13),
    amberWash: mix(card, PEOPLE_REACH_AMBER, dark ? 0.26 : 0.16),
    amberDeep: bibleAccentInk(PEOPLE_REACH_AMBER, mix(card, PEOPLE_REACH_AMBER, dark ? 0.26 : 0.16)),
  };
}
