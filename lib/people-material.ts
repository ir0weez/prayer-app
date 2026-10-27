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
/** Ink on a filled gold pill (the slip card's Reach out) — ≥7:1 on the gold. */
export const PEOPLE_GOLD_PILL_INK = "#2A1B02";
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

/**
 * v269 "A Prayer Just for Them": the praise lead's paints for the
 * session — the front-door praise card's OWN colors (v254: gradient
 * #FFF3D6 → #FFE9B8, line #F5D67B, ink #4A3205, sub #7A5A14, deep
 * #B26E12), carried into Pray Today so a praise reads the same gold
 * in both rooms. Constants beside FIRST_CARD for the same reason:
 * praise gold is a meaning, never a palette role.
 */
export const PRAISE_CARD = {
  bgFrom: "#FFF3D6",
  bgTo: "#FFE9B8",
  line: "#F5D67B",
  ink: "#4A3205",
  sub: "#7A5A14",
  deep: "#B26E12",
  pillInk: "#FFFFFF",
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

// ─── v255 "The Front Door, To the Drawing" → v256 "Derive, Don't Pin" ──
// The mockup (people-material-concept-v2) supplies the front door's
// STRUCTURE and its Classic-LIGHT instance: ground #F8F5FE, white
// cards, dark ink, measured from the concept file. v255 pinned that
// one instance under Classic — and Jonathan's verdict named the cost:
// no dark mode, the Paper skin gated out, and the Settings color
// stopped reaching the page. v256 governs the family the way the
// Bible's deriveBibleMaterial governs its own: the surfaces DERIVE
// from the active Settings seed × the appearance. The light branch
// below reproduces the mockup's hexes exactly at the violet seed
// (hue-rotated by the seed's distance from the mockup's violet, so
// any other Settings color re-dresses the page in the same tonal
// family); the dark branch is the same family derived for a dark
// ground — deep seed shades, near-white inks, every ink walked to
// the 4.5:1 floor against the surface it sits on. The tab bar's
// Expressive roles (tabbar-concepts-v1, Concept 2) ride the same
// derivation: the concept's light AND dark frames are its two
// instances at the violet seed.

export interface PeopleFrontDoorFamily extends PeopleMaterialFamily {
  /** The don't-slip card's quiet sub-line ink (#6D5BA6 at the violet seed). */
  washSub: string;
  /**
   * The container tone between ground and wash (#F1EBFB at the violet
   * seed) — the fasting tracker's Record card surface, from
   * fasting-tracker-design-v3.html's --cont role (v280: added when
   * the tracker was conformed to the mockup exactly; no People
   * surface consumes it).
   */
  container: string;
  /** The queue bar gradient's far end — the mockup's fixed teal #0F766E. */
  queueTeal: string;
  /** Expressive tab bar surface (Concept 2: #EFE9FC light / #1D1730 dark). */
  navGround: string;
  /** Expressive tab bar quiet ink (inactive icon + label). */
  navInk: string;
  /** Expressive tab bar active label ink (the concept's deep seed). */
  navActiveInk: string;
  /** Expressive tab bar active indicator (the tonal blob behind the icon). */
  navInd: string;
  /** Expressive tab bar tick under the active label. */
  navTick: string;
}

/** The mockup's violet seed — the rotation's zero point. */
const FRONT_DOOR_SEED = "#7C3AED";

/** The mockup's seed-family roles, verbatim from the concept file. */
const FRONT_DOOR_ROLES = {
  ground: "#F8F5FE",
  container: "#F1EBFB",
  wash: "#EDE9FE",
  wash2: "#DDD6FE",
  line: "#E6DFF6",
  deep: "#4C1D95",
  inkSeed: "#1E1033",
  ink: "#2A2140",
  inkSoft: "#75698F",
  washSub: "#6D5BA6",
  navGround: "#EFE9FC",
} as const;

/**
 * The dark instance of the same roles, in the mockup's violet space:
 * the ground and cards are the light family's inks turned deep, the
 * washes are the seed at night strength, and the inks are the light
 * family's pale shades (the tab-bar concept's dark frame supplies
 * navGround / navInk / navActiveInk / navInd / navTick verbatim).
 */
const FRONT_DOOR_DARK_ROLES = {
  ground: "#161126",
  card: "#201A38",
  // The light ladder's container step (ground -> container -> wash)
  // at night strength: one step above the card toward the wash.
  container: "#251D40",
  wash: "#2B2149",
  wash2: "#3A2A66",
  line: "#372C59",
  deep: "#CDBFFB",
  inkSeed: "#EFE9FD",
  ink: "#F4F0FE",
  inkSoft: "#B3A6D9",
  washSub: "#B7A8E8",
  navGround: "#1D1730",
  navInk: "#9C8FC2",
  navTick: "#A78BFA",
} as const;

function rotateRole(hex: string, hueDelta: number): string {
  if (hueDelta === 0) return hex;
  const { h, s, l } = hexToHsl(hex);
  return hslToHex({ h: h + hueDelta, s, l });
}

export function derivePeopleFrontDoor(primary: string, scheme: "light" | "dark" = "light"): PeopleFrontDoorFamily {
  const hueDelta = hexToHsl(primary).h - hexToHsl(FRONT_DOOR_SEED).h;
  if (scheme === "dark") {
    const card = rotateRole(FRONT_DOOR_DARK_ROLES.card, hueDelta);
    const wash = rotateRole(FRONT_DOOR_DARK_ROLES.wash, hueDelta);
    const goldTint = mix(card, PEOPLE_PRAISE_GOLD, 0.26);
    const amberWash = mix(card, PEOPLE_REACH_AMBER, 0.26);
    return {
      ground: rotateRole(FRONT_DOOR_DARK_ROLES.ground, hueDelta),
      container: rotateRole(FRONT_DOOR_DARK_ROLES.container, hueDelta),
      card,
      wash,
      wash2: rotateRole(FRONT_DOOR_DARK_ROLES.wash2, hueDelta),
      washInk: rotateRole(FRONT_DOOR_DARK_ROLES.inkSeed, hueDelta),
      ink: rotateRole(FRONT_DOOR_DARK_ROLES.ink, hueDelta),
      inkSoft: bibleAccentInk(rotateRole(FRONT_DOOR_DARK_ROLES.inkSoft, hueDelta), card),
      line: rotateRole(FRONT_DOOR_DARK_ROLES.line, hueDelta),
      seed: primary,
      deep: bibleAccentInk(rotateRole(FRONT_DOOR_DARK_ROLES.deep, hueDelta), wash),
      inkSeed: rotateRole(FRONT_DOOR_DARK_ROLES.inkSeed, hueDelta),
      tealDeep: "#0F766E",
      shadow: hexToRgba("#000000", 0.45),
      gold: PEOPLE_PRAISE_GOLD,
      goldTint,
      goldWash: mix(card, PEOPLE_PRAISE_GOLD, 0.18),
      goldDeep: bibleAccentInk(PEOPLE_PRAISE_GOLD, goldTint),
      redWash: mix(card, PEOPLE_EMERGENCY_RED, 0.26),
      amberWash,
      amberDeep: bibleAccentInk(PEOPLE_REACH_AMBER, amberWash),
      washSub: bibleAccentInk(rotateRole(FRONT_DOOR_DARK_ROLES.washSub, hueDelta), wash),
      queueTeal: "#0F766E",
      navGround: rotateRole(FRONT_DOOR_DARK_ROLES.navGround, hueDelta),
      navInk: rotateRole(FRONT_DOOR_DARK_ROLES.navInk, hueDelta),
      navActiveInk: rotateRole(FRONT_DOOR_DARK_ROLES.deep, hueDelta),
      navInd: rotateRole(FRONT_DOOR_DARK_ROLES.wash2, hueDelta),
      navTick: rotateRole(FRONT_DOOR_DARK_ROLES.navTick, hueDelta),
    };
  }
  const deep = rotateRole(FRONT_DOOR_ROLES.deep, hueDelta);
  const inkSeed = rotateRole(FRONT_DOOR_ROLES.inkSeed, hueDelta);
  return {
    ground: rotateRole(FRONT_DOOR_ROLES.ground, hueDelta),
    container: rotateRole(FRONT_DOOR_ROLES.container, hueDelta),
    card: "#FFFFFF",
    wash: rotateRole(FRONT_DOOR_ROLES.wash, hueDelta),
    wash2: rotateRole(FRONT_DOOR_ROLES.wash2, hueDelta),
    washInk: inkSeed,
    ink: rotateRole(FRONT_DOOR_ROLES.ink, hueDelta),
    inkSoft: rotateRole(FRONT_DOOR_ROLES.inkSoft, hueDelta),
    line: rotateRole(FRONT_DOOR_ROLES.line, hueDelta),
    seed: primary,
    deep,
    inkSeed,
    tealDeep: "#0F766E",
    shadow: hexToRgba(deep, 0.1),
    gold: PEOPLE_PRAISE_GOLD,
    goldTint: "#FFF3D6",
    goldWash: "#FFEFD2",
    goldDeep: "#B26E12",
    redWash: "#FDE3E3",
    amberWash: "#FDEBC8",
    amberDeep: "#9A6206",
    washSub: rotateRole(FRONT_DOOR_ROLES.washSub, hueDelta),
    queueTeal: "#0F766E",
    navGround: rotateRole(FRONT_DOOR_ROLES.navGround, hueDelta),
    navInk: rotateRole(FRONT_DOOR_ROLES.inkSoft, hueDelta),
    navActiveInk: deep,
    navInd: rotateRole(FRONT_DOOR_ROLES.wash2, hueDelta),
    navTick: primary,
  };
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
