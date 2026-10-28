// ─── v248 Bible accents — derived from the chosen color theme ─────────────
// The pure half of the Bible palette's accent family, kept in lib
// (beside palette-ink) so the test suite can call the exact function
// the chapter surface uses — components/bible-v205/palette.ts
// re-exports it from here.
//
// Why it exists (v248): through v247 the Bible wore its own fixed
// scheme — the v205 Notion raspberry (#C2255C) and its pink family —
// under every skin and every color theme, while the rest of the app
// dressed in the theme he picked. His verdict on v247 (Oct 25,
// 13:03): "It works now... But you didn't make a paper version of
// it, and it didn't change the color to orange to match the selected
// color. I wanted to make it match the chosen theme." So the accent
// family is now DERIVED from the active palette's primary — the same
// token the Schedule and People screens consume — and no
// Bible-private accent constant survives:
//
//   rasp       the primary itself (fills: pills, tiles, progress)
//   band       the primary washed over the page paper (section
//              bands, kept pill, chips) — a soft tint of the SAME
//              hue, never a second color
//   raspTint   the band lightened back toward the paper
//   raspSoft   the band (the two were always one color)
//   bandInk /  the primary walked toward black or white until it
//   raspDeep   truly reads (≥4.5:1) on the band / on the paper —
//              the deep shade of the chosen color that text wears
//   bandBorder / bandLine / bandDot — the band family's edges and
//              dots, stepped mixes of paper and primary that
//              replace the old fixed pinks (#EFC3D6, #F3CFE0,
//              #F3DCE8, #DE8FB4)
//   rose       the primary lifted a step toward white — the kept
//              heart's color
//
// What is NOT here: the meaning colors. His category code
// (definition blue, quote red, good-thought gold, personal-story
// green), the keeper yellow and the callout grey are MEANINGS, not
// accents — they stay at full strength in every theme, exactly as
// the tints do. Only the accent chrome follows the chosen color.

import { mix } from '../color-themes';
import { hexContrast, hexLuminance } from '../skin-themes';

// ─── HSL helpers (the skin-themes paper-stock shape, kept local so
// this module stays pure and testable without the skin tree) ────────

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function hexToHsl(hex: string): Hsl {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return { h, s, l };
}

export function hslToHex({ h, s, l }: Hsl): string {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb: [number, number, number];
  if (hue < 60) rgb = [c, x, 0];
  else if (hue < 120) rgb = [x, c, 0];
  else if (hue < 180) rgb = [0, c, x];
  else if (hue < 240) rgb = [0, x, c];
  else if (hue < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  const channel = (v: number) =>
    Math.min(255, Math.max(0, Math.round((v + m) * 255)))
      .toString(16)
      .padStart(2, '0');
  return `#${channel(rgb[0])}${channel(rgb[1])}${channel(rgb[2])}`.toUpperCase();
}

/** A hex color as an rgba() string at the given alpha (shadow paint). */
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export interface BibleAccents {
  rasp: string;
  raspDeep: string;
  band: string;
  bandInk: string;
  bandBorder: string;
  bandLine: string;
  bandDot: string;
  raspSoft: string;
  raspTint: string;
  rose: string;
}

/**
 * The primary, walked toward black (on a light ground) or white
 * (on a dark one) until it clears the contrast floor against the
 * ground it will sit on. A primary that already reads is returned
 * untouched — in dark schemes the app's primaries are pre-lightened,
 * so they pass as-is; in light schemes a saturated primary (sunset
 * orange on cream) deepens a few steps into its own burnt shade.
 */
export function bibleAccentInk(primary: string, ground: string, floor = 4.5): string {
  if (hexContrast(primary, ground) >= floor) return primary;
  const anchor = hexLuminance(ground) < 0.5 ? '#FFFFFF' : '#000000';
  let candidate = primary;
  for (let w = 0.12; w <= 0.97; w += 0.12) {
    candidate = mix(primary, anchor, w);
    if (hexContrast(candidate, ground) >= floor) return candidate;
  }
  return candidate;
}

/**
 * The Bible's whole accent family for one resolved page: the active
 * palette's primary over the resolved paper (the skin's surface, or
 * the palette background under Classic — exactly the paper
 * useBiblePalette resolves).
 */
export function deriveBibleAccents(primary: string, paper: string): BibleAccents {
  const dark = hexLuminance(paper) < 0.5;
  const band = mix(paper, primary, dark ? 0.24 : 0.1);
  return {
    rasp: primary,
    raspDeep: bibleAccentInk(primary, paper),
    band,
    bandInk: bibleAccentInk(primary, band),
    bandBorder: mix(paper, primary, dark ? 0.42 : 0.3),
    bandLine: mix(paper, primary, dark ? 0.34 : 0.2),
    bandDot: mix(paper, primary, dark ? 0.58 : 0.48),
    raspSoft: band,
    raspTint: mix(band, paper, 0.55),
    rose: mix(primary, '#FFFFFF', dark ? 0.06 : 0.16),
  };
}

// ─── v250 "The Bible, Material" — the Expressive Cards family ───────
// His ruling (Oct 25, 15:50): the Bible gets Concept 1 "Expressive
// Cards" from bible-material-makeover-v1.html, PURE — and "make it
// match the color I choose in the settings." So the mockup supplies
// STRUCTURE, SHAPES and RELATIONSHIPS only; every hue below is
// DERIVED from the active palette's primary, the same token v248
// wired. The mockup's berry hexes were sampled from his then-current
// palette — they are seed ROLES (seed / seed-tonal / seed-deep /
// harmonized accent), never values, and none of them survives as a
// literal in the Bible tree (the v250 suite pins that).
//
// The derivation, in the mockup's own relationships:
//  · each chapter section is a tonal card in its OWN hue — the seed
//    hue rotated by fixed offsets ([0°, +42°, +150°, +255°]) at the
//    seed's own saturation, washed over the page ground. For the
//    mockup's berry seed that reads berry → amber → green → violet;
//    for Sunset it reads orange → yellow → teal → magenta. The
//    section's DEEP shade (verse numerals, range labels) is that
//    rotated hue walked to ≥4.5:1 on its own card, the same walk
//    bibleAccentInk makes for the seed itself.
//  · the two outline pills (Read as Stories / Contents) wear the
//    harmonized AMBER (+42°) and TEAL (+190°) tonal families.
//  · his own note is the FILLED card: the seed deepened until a
//    near-white ink truly reads on it (≥4.6:1) — the most colorful
//    object on the page, in every palette.
//  · Mark as Read is the seed's own near-black (light ground) or
//    near-white (dark ground) pill; its +25 XP chip wears the
//    REWARD gold — a constant of the rewards system, not a palette
//    color, exactly as the keeper gold is.
//  · shadows are the seed's own color at low alpha, the mockup's
//    soft colored shade under cards and pills.

/** The reward gold — the +25 XP chip's constant (not palette). */
export const BIBLE_XP_GOLD = '#FFC53D';
/** Ink on the reward gold. */
export const BIBLE_XP_GOLD_INK = '#4A2F00';

/** Section hue offsets from the seed hue, cycled by section index. */
export const BIBLE_SECTION_HUE_OFFSETS = [0, 42, 150, 255] as const;
/** The harmonized outline-pill hues: amber beside the seed, teal across. */
export const BIBLE_ACCENT_AMBER_OFFSET = 42;
export const BIBLE_ACCENT_TEAL_OFFSET = 190;

export interface BibleSectionTone {
  /** The card's tonal ground — the rotated seed washed over the page. */
  bg: string;
  /** The rotated hue walked to ≥4.5:1 on bg — numerals, labels, title ink. */
  deep: string;
  /** The rotated hue at full reading strength — the section dot. */
  hue: string;
}

export interface BibleMaterialFamily {
  sections: BibleSectionTone[];
  accentAmber: BibleSectionTone;
  accentTeal: BibleSectionTone;
  /** The filled self-note card: the seed, deepened until light ink reads. */
  noteFill: string;
  /** Near-white ink on the filled note card (≥4.5:1 on noteFill). */
  noteInk: string;
  /** The softer line on the filled card ("on v. 11") — still ≥4.5:1. */
  noteInkSoft: string;
  /** The note card's tag chip: pale seed tonal ground… */
  noteTagBg: string;
  /** …and its deep seed ink (≥4.5:1 on noteTagBg). */
  noteTagInk: string;
  /** Mark as Read: the seed's near-black (light) / near-white (dark) pill. */
  readPill: string;
  readPillInk: string;
  /** v311: the in-progress tonal container — the seed stepped INTO
   * the page at container weight (the approved drawing's prog-cont).
   * Grid in-progress cells and the chapter sheet's Writing-now chip
   * wear it; progInk is its pair, the seed walked to ≥4.5:1 on it. */
  progBg: string;
  progInk: string;
  /** v311: the primary container — one tonal step of the seed into
   * the page, deeper than band, lighter than the primary. The
   * chapter sheet's read-row icon chip wears it. */
  primCont: string;
  xpGold: string;
  xpGoldInk: string;
  /** Soft seed-colored shadows, as CSS strings for the dress fragments. */
  shadowCard: string;
  shadowBtn: string;
  shadowNote: string;
  /** The verse-jump flash tint — the seed at flash alpha (replaces
   * the last fixed pink rgba in the chapter page). */
  flashTint: string;
  /** The same seed at zero alpha — the flash's resting end. */
  flashTintClear: string;
}

/** The seed hue at the seed's own saturation (clamped to a range
 * that stays tasteful as a tonal family), lightness pinned mid. */
function seedHueColor(primary: string, offset: number): string {
  const { h, s } = hexToHsl(primary);
  const sat = Math.min(0.85, Math.max(0.32, s));
  return hslToHex({ h: h + offset, s: sat, l: 0.5 });
}

function sectionTone(primary: string, paper: string, offset: number): BibleSectionTone {
  const dark = hexLuminance(paper) < 0.5;
  const hue = seedHueColor(primary, offset);
  const bg = mix(paper, hue, dark ? 0.22 : 0.15);
  return { bg, deep: bibleAccentInk(hue, bg), hue };
}

/** The filled note card's ink pair for a candidate fill: a near-white
 * and its softer sibling (the "on v. 11" line, the mockup's 80%
 * white). Both are TEXT on the card, so both must truly read. */
function noteInkFor(fill: string): string {
  return mix('#FFFFFF', fill, 0.05);
}
function noteInkSoftFor(fill: string): string {
  return mix(noteInkFor(fill), fill, 0.16);
}

/** The seed walked toward black until BOTH note inks clear their
 * floors on it (ink ≥4.6, soft ink ≥4.5). A seed that already reads
 * is returned untouched — the walk only deepens, never re-hues. */
function fillForNoteInks(base: string): string {
  let candidate = base;
  for (let w = 0; w <= 0.97; w += 0.1) {
    candidate = w === 0 ? base : mix(base, '#000000', w);
    if (
      hexContrast(noteInkFor(candidate), candidate) >= 4.6 &&
      hexContrast(noteInkSoftFor(candidate), candidate) >= 4.5
    ) {
      return candidate;
    }
  }
  return candidate;
}

/**
 * The whole Material family for one resolved page: the active
 * palette's primary over the resolved Bible ground (the palette
 * background with a breath of the seed — components/bible-v205/
 * palette.ts resolves it the same way in every skin now).
 */
export function deriveBibleMaterial(primary: string, paper: string): BibleMaterialFamily {
  const dark = hexLuminance(paper) < 0.5;
  const { h, s } = hexToHsl(primary);
  const sat = Math.min(0.85, Math.max(0.32, s));
  const noteFill = fillForNoteInks(primary);
  const noteInk = noteInkFor(noteFill);
  const noteTagBg = mix(paper, primary, dark ? 0.3 : 0.2);
  const progBg = mix(paper, primary, dark ? 0.38 : 0.28);
  return {
    sections: BIBLE_SECTION_HUE_OFFSETS.map((o) => sectionTone(primary, paper, o)),
    accentAmber: sectionTone(primary, paper, BIBLE_ACCENT_AMBER_OFFSET),
    accentTeal: sectionTone(primary, paper, BIBLE_ACCENT_TEAL_OFFSET),
    noteFill,
    noteInk,
    noteInkSoft: noteInkSoftFor(noteFill),
    noteTagBg,
    noteTagInk: bibleAccentInk(primary, noteTagBg),
    readPill: hslToHex({ h, s: Math.min(sat, 0.45), l: dark ? 0.88 : 0.1 }),
    readPillInk: dark ? hslToHex({ h, s: sat, l: 0.12 }) : mix('#FFFFFF', primary, 0.03),
    progBg,
    progInk: bibleAccentInk(primary, progBg),
    primCont: mix(paper, primary, dark ? 0.3 : 0.16),
    xpGold: BIBLE_XP_GOLD,
    xpGoldInk: BIBLE_XP_GOLD_INK,
    shadowCard: `0 4px 14px ${hexToRgba(primary, dark ? 0.45 : 0.13)}`,
    shadowBtn: `0 3px 8px ${hexToRgba(primary, dark ? 0.4 : 0.22)}`,
    shadowNote: `0 8px 18px ${hexToRgba(primary, dark ? 0.5 : 0.3)}`,
    flashTint: hexToRgba(primary, 0.14),
    flashTintClear: hexToRgba(primary, 0),
  };
}
