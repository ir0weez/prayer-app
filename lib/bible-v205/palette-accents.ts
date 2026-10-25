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
