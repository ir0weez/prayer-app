// ─── v315 "Settings, To the Drawing" ────────────────────────────────────────
// The Settings page's Material 3 Expressive family, derived from the
// active palette exactly the way v254 derived the People's and v250
// the Bible's: the approved drawing
// (settings-expressive-blend-v7-final.html) supplies the structure,
// and the palette he picked supplies every hue. The drawing's violet
// hexes were sampled from his current palette; they are seed ROLES,
// not values, and no drawing literal survives here.
//
// The family is a TONAL LADDER off the card surface, in the drawing's
// own steps: container-low (quieter than the cards), container (the
// segmented track / sheet wash), primary-container (the hero band,
// the expanded palette panel, the selected segment), container-high
// (the deep end). Inks are walked to a 4.5:1 floor against the ground
// they sit on, the way the rest of the app's derivations do it —
// text never truncates and never sits below contrast on this page.
//
// Meaning colors never follow the seed: the danger family's red and
// the "linked" green keep their own values everywhere.

import { mix } from "@/lib/color-themes";
import { hexLuminance } from "@/lib/skin-themes";
import { bibleAccentInk, hexToRgba } from "@/lib/bible-v205/palette-accents";

/** The danger family's red (Material error) — a meaning constant. */
export const SETTINGS_DANGER_RED = "#BA1A1A";
/** The "linked / done" green — a meaning constant. */
export const SETTINGS_LINKED_GREEN = "#1E9E6A";

export type SettingsPaletteTokens = {
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  border: string;
};

export type SettingsMaterialFamily = {
  /** The page ground — the app's background with a breath of seed. */
  ground: string;
  /** Card surface (the five groups). */
  card: string;
  /** Tonal step 1 — icon tiles, the back tile, expanded-row washes. */
  containerLow: string;
  /** Tonal step 2 — segmented tracks. */
  container: string;
  /** Tonal step 3 — the hero band, panels, the selected segment. */
  primaryContainer: string;
  /** Tonal step 4 — the deepest fill (avatar disc fallback). */
  containerHigh: string;
  /** Body ink on the card. */
  ink: string;
  /** Quiet ink on the card (sub-lines, chevrons). */
  inkSoft: string;
  /** Ink on the primary-container step (hero text, panel labels). */
  onPrimaryContainer: string;
  /** Ink on the container-low step. */
  onContainerLow: string;
  /** The seed itself (eyebrows, selected strokes, the group square). */
  seed: string;
  /** The seed walked to read as ink on the card (icons, values). */
  deep: string;
  /** The hero numeral's ink — the seed at full plum depth on the band. */
  heroInk: string;
  /** Hairline between rows inside a card. */
  line: string;
  /** The card's own edge. */
  cardLine: string;
  /** Soft shadow colour for the lifted selected segment. */
  shadow: string;
  /** The danger door's quiet dress. */
  dangerWash: string;
  dangerLine: string;
  dangerTile: string;
  dangerInk: string;
  /** The filled confirm pill behind the Warning door. */
  dangerFill: string;
  dangerFillInk: string;
  /** The "Linked" chip. */
  goodChipBg: string;
  goodChipInk: string;
};

export function deriveSettingsMaterial(seed: string, tokens: SettingsPaletteTokens): SettingsMaterialFamily {
  const dark = hexLuminance(tokens.background) < 0.5;
  const card = tokens.surface;
  const containerLow = mix(card, seed, dark ? 0.16 : 0.09);
  const container = mix(card, seed, dark ? 0.24 : 0.15);
  const primaryContainer = mix(card, seed, dark ? 0.34 : 0.21);
  const containerHigh = mix(card, seed, dark ? 0.44 : 0.3);
  const dangerWash = mix(card, SETTINGS_DANGER_RED, dark ? 0.14 : 0.05);
  const goodChipBg = mix(card, SETTINGS_LINKED_GREEN, dark ? 0.3 : 0.18);
  return {
    ground: mix(tokens.background, seed, dark ? 0.05 : 0.045),
    card,
    containerLow,
    container,
    primaryContainer,
    containerHigh,
    ink: bibleAccentInk(tokens.foreground, card),
    inkSoft: bibleAccentInk(tokens.muted, card),
    onPrimaryContainer: bibleAccentInk(tokens.foreground, primaryContainer),
    onContainerLow: bibleAccentInk(tokens.foreground, containerLow),
    seed,
    deep: bibleAccentInk(seed, card),
    heroInk: bibleAccentInk(seed, primaryContainer),
    line: mix(card, seed, dark ? 0.2 : 0.1),
    cardLine: tokens.border,
    shadow: hexToRgba(seed, dark ? 0.4 : 0.16),
    dangerWash,
    dangerLine: mix(card, SETTINGS_DANGER_RED, dark ? 0.3 : 0.16),
    dangerTile: mix(card, SETTINGS_DANGER_RED, dark ? 0.2 : 0.1),
    dangerInk: bibleAccentInk(SETTINGS_DANGER_RED, dangerWash),
    dangerFill: SETTINGS_DANGER_RED,
    dangerFillInk: "#FFFFFF",
    goodChipBg,
    goodChipInk: bibleAccentInk(SETTINGS_LINKED_GREEN, goodChipBg),
  };
}
