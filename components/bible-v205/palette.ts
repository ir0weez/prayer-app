// ─── v205 Bible palette ──────────────────────────────────────────────────────
// The chapter surface speaks his Notion language: the identity colors
// (keeper yellow, callout grey, the category code, the tint washes)
// stay at full strength in every scheme and skin — paper is a
// material, not a color. What adapts is the page itself: surface,
// ink, and hairlines come from the app's theme tokens like every
// other screen.
//
// ─── v248 "The Bible, Dressed Like the Rest" ───────────────────────────────
// The accent family DERIVES from the active palette's primary via
// deriveBibleAccents (lib/bible-v205/palette-accents.ts) — the same
// token the Schedule and People screens consume — so the color he
// picked dresses the Bible exactly as it dresses the rest of the
// app. The meaning colors are NOT accents and stay constant:
// category code, keeper yellow, callout grey, tint washes.
//
// ─── v250 "The Bible, Material" ────────────────────────────────────────────
// His ruling (Oct 25, 15:50): the Bible gets Concept 1 "Expressive
// Cards" from the Material makeover mockup, PURE — and "make it
// match the color I choose in the settings." This SUPERSEDES the
// v248 skin-dialect dressing for Bible surfaces: the skin no longer
// re-dresses the Bible at all. Under every app skin the Bible wears
// this one Material dress — big tonal cards (28px), pill buttons,
// soft seed-colored shadows — and every hue in it derives from the
// active palette's primary via deriveBibleMaterial: the page ground
// is the palette background with a breath of the seed, the section
// cards are the seed hue rotated into a harmonized family, his own
// note is the filled seed card, and Mark as Read is the seed's own
// near-black pill with the reward-gold XP chip. Light/dark still
// follows the app appearance (the palette resolves it); the settle
// entrances at the screen roots are the app's motion infrastructure
// (the v246/v247 paint gates live there), not dress, and stay.

import { useColors } from '@/hooks/use-colors';
import { hexLuminance } from '@/lib/skin-themes';
import { mix } from '@/lib/color-themes';
import { resolveBibleInk } from '@/lib/bible-v205/palette-ink';
import { deriveBibleAccents, deriveBibleMaterial, type BibleSectionTone } from '@/lib/bible-v205/palette-accents';
import type { TintColor } from '@/lib/bible-v205/marks';

export { resolveBibleInk } from '@/lib/bible-v205/palette-ink';
export {
  deriveBibleAccents,
  deriveBibleMaterial,
  bibleAccentInk,
  type BibleAccents,
  type BibleMaterialFamily,
  type BibleSectionTone,
} from '@/lib/bible-v205/palette-accents';

/**
 * A skin-dress fragment: the resolved style pieces a Bible surface
 * spreads to wear the active skin's language. Every field is
 * optional and every fragment is EMPTY under Classic, so spreading
 * one is always safe.
 */
export interface BibleDress {
  boxShadow?: string;
  elevation?: number;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
  borderLeftWidth?: number;
  borderRightWidth?: number;
  borderLeftColor?: string;
  borderRightColor?: string;
  overflow?: 'hidden' | 'visible';
}

export interface BiblePalette {
  paper: string;
  paper2: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  line: string;
  lineDark: string;
  band: string;
  bandInk: string;
  bandBorder: string;
  bandLine: string;
  bandDot: string;
  rasp: string;
  raspDeep: string;
  raspSoft: string;
  raspTint: string;
  rose: string;
  /** v250 Material family — every hue derived from the palette's
   * primary (deriveBibleMaterial). */
  sections: BibleSectionTone[];
  accentAmber: BibleSectionTone;
  accentTeal: BibleSectionTone;
  noteFill: string;
  noteInk: string;
  noteInkSoft: string;
  noteTagBg: string;
  noteTagInk: string;
  readPill: string;
  readPillInk: string;
  /** v311: the in-progress tonal container pair + primary container. */
  progBg: string;
  progInk: string;
  primCont: string;
  /** v311: the on-paper meaning family (handwriting tones — a
   * meaning, not an accent, so constant like the keeper yellow). */
  paperBg: string;
  paperInk: string;
  xpGold: string;
  xpGoldInk: string;
  flashTint: string;
  flashTintClear: string;
  /** The filled self-note card's dress (radius + the seed's soft shade). */
  noteDress: BibleDress;
  yellowBg: string;
  yellowBorder: string;
  yellowInk: string;
  yellowLabel: string;
  hlMark: string;
  greyBg: string;
  greyBorder: string;
  greyInk: string;
  greyLabel: string;
  calloutPaper: string;
  vnum: string;
  heartOff: string;
  tintYellow: string;
  tintRose: string;
  tintGreen: string;
  tintBlue: string;
  tintRed: string;
  tintOrange: string;
  verseTintYellow: string;
  verseTintRose: string;
  verseTintGreen: string;
  verseTintBlue: string;
  verseTintRed: string;
  verseTintOrange: string;
  /** v361: phrase washes — the soft tints a drag-selected range
   * wears (the approved model's six, at its own alphas). */
  phraseTintYellow: string;
  phraseTintRose: string;
  phraseTintGreen: string;
  phraseTintBlue: string;
  phraseTintRed: string;
  phraseTintOrange: string;
  /** v361: the live drag-selection wash (the seed's own orange
   * family at selection strength, per the approved drawing). */
  selWash: string;
  /** v378: the selection handles' solid fill — the selWash base
   * at full strength (the drawing's handle hue), so a handle
   * reads as the selection's own colour, not its wash. */
  selHandle: string;
  isDark: boolean;
  /** v250 Material dress — one dress in every skin (see the
   * fragments in useBiblePalette). */
  cardDress: BibleDress;
  btnDress: BibleDress;
  sheetDress: BibleDress;
  screenDress: BibleDress;
  frameDress: BibleDress;
  /** The skin type scale's page-title size (null under Classic). */
  h2Size: number | null;
}

export function useBiblePalette(): BiblePalette {
  const colors = useColors();
  const isDark = hexLuminance(colors.background) < 0.5;
  // v250: the Bible's ground is the PALETTE's ground in every skin —
  // the themed background with a breath of the seed mixed in (the
  // mockup's palest-seed page). The skin's surface token no longer
  // dresses this section at all.
  const paper = mix(colors.background, colors.primary, isDark ? 0.05 : 0.04);
  // v248/v250: the accent + Material families derive from the chosen
  // color theme's primary — the token every sibling screen consumes.
  const accents = deriveBibleAccents(colors.primary, paper);
  const material = deriveBibleMaterial(colors.primary, paper);
  // v250 Material dress fragments — ONE dress in every skin:
  //  · cards — 28px radius and the seed's own soft shade;
  //  · buttons — full pills with the seed's button shade;
  //  · sheets — 28px top corners and a deep soft shade;
  //  · frames (grid cells) — the 16px medium shape;
  //  · screens — nothing: a screen root is the ground itself now,
  //    no sheet head, no frame borders, in any skin.
  const cardDress: BibleDress = { borderRadius: 28, boxShadow: material.shadowCard, elevation: 4 };
  const btnDress: BibleDress = { borderRadius: 999, boxShadow: material.shadowBtn, elevation: 3 };
  const sheetDress: BibleDress = {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    boxShadow: '0 -8px 28px rgba(0,0,0,0.20)',
    elevation: 16,
  };
  const screenDress: BibleDress = {};
  const frameDress: BibleDress = { borderRadius: 16 };
  const noteDress: BibleDress = { borderRadius: 24, boxShadow: material.shadowNote, elevation: 6 };
  return {
    paper,
    paper2: colors.surface,
    // v220: the runtime palette's ink key is `foreground` — `text`
    // does not exist on it, so this read was undefined and the verse
    // text rendered black on every dark page. The ink also resolves
    // against the resolved paper (Terminal's panel is dark in BOTH
    // schemes, so a light-scheme foreground needs the guard too).
    ink: resolveBibleInk(colors.foreground, paper),
    inkSoft: colors.muted,
    inkFaint: isDark ? '#8A857C' : '#ABA69C',
    // v250: hairlines are the palette's border in every skin.
    line: colors.border,
    lineDark: isDark ? '#4A463F' : '#D9D5CC',
    ...accents,
    sections: material.sections,
    accentAmber: material.accentAmber,
    accentTeal: material.accentTeal,
    noteFill: material.noteFill,
    noteInk: material.noteInk,
    noteInkSoft: material.noteInkSoft,
    noteTagBg: material.noteTagBg,
    noteTagInk: material.noteTagInk,
    readPill: material.readPill,
    readPillInk: material.readPillInk,
    progBg: material.progBg,
    progInk: material.progInk,
    primCont: material.primCont,
    paperBg: '#F5ECD2',
    paperInk: '#7A5C14',
    xpGold: material.xpGold,
    xpGoldInk: material.xpGoldInk,
    flashTint: material.flashTint,
    flashTintClear: material.flashTintClear,
    noteDress,
    yellowBg: '#FFF3BF',
    yellowBorder: '#EBD489',
    yellowInk: '#5F4B0B',
    yellowLabel: '#96791A',
    hlMark: '#A67C00',
    greyBg: '#F1F1EF',
    greyBorder: '#E1E1DC',
    greyInk: '#45423C',
    greyLabel: '#7A766C',
    calloutPaper: '#F7F7F5',
    vnum: isDark ? '#6E6A63' : '#C6C1B6',
    heartOff: isDark ? '#5A564E' : '#D8D3C8',
    // v212: the entry tint is a wash over the WHOLE entry container —
    // alphas per hue chosen so all three read equally clearly at
    // display size (rose is the most saturated hue, so it needs the
    // least paint; yellow the most). Before v212 these painted only
    // behind one paragraph, at .38/.14/.20 — and nowhere at all on
    // verse-only entries.
    tintYellow: 'rgba(245,197,66,.32)',
    tintRose: 'rgba(230,73,128,.22)',
    tintGreen: 'rgba(64,160,110,.27)',
    // v361: the three new hues join the entry/verse washes at the
    // same strengths (their bases are the model's dot hexes).
    tintBlue: 'rgba(110,168,240,.27)',
    tintRed: 'rgba(240,118,107,.27)',
    tintOrange: 'rgba(245,158,76,.30)',
    // v212: verse-level tints — a highlighter stroke behind one
    // verse's text, stronger than the entry wash so the single verse
    // stands out from an entry wash of the same hue.
    verseTintYellow: 'rgba(245,197,66,.45)',
    verseTintRose: 'rgba(230,73,128,.45)',
    verseTintGreen: 'rgba(64,160,110,.45)',
    verseTintBlue: 'rgba(110,168,240,.45)',
    verseTintRed: 'rgba(240,118,107,.45)',
    verseTintOrange: 'rgba(245,158,76,.45)',
    // v361: phrase washes — the approved drawing's six soft tints
    // at its alphas (yellow deepest, the rest at .40–.44), on the
    // model's own bases (#63BE82 green, not the v212 verse green).
    phraseTintYellow: 'rgba(245,197,66,.48)',
    phraseTintRose: 'rgba(240,139,180,.42)',
    phraseTintGreen: 'rgba(99,190,130,.40)',
    phraseTintBlue: 'rgba(110,168,240,.40)',
    phraseTintRed: 'rgba(240,118,107,.42)',
    phraseTintOrange: 'rgba(245,158,76,.44)',
    selWash: 'rgba(242,87,0,.30)',
    selHandle: 'rgb(242,87,0)',
    isDark,
    cardDress,
    btnDress,
    sheetDress,
    screenDress,
    frameDress,
    // v250: the Material type scale is the Bible's own now — the
    // skin's page-title size no longer applies (screens fall back
    // to their stylesheet sizes).
    h2Size: null,
  };
}

/** v250: the section card tone for a section index — the derived
 * family cycles, so every chapter's cards walk the same harmony. */
export function sectionToneFor(palette: BiblePalette, index: number): BibleSectionTone {
  const n = palette.sections.length;
  return palette.sections[((index % n) + n) % n];
}

/** The entry-container wash for a tint hue (null = no wash). */
export function tintWashFor(palette: BiblePalette, tint: TintColor | null | undefined): string | null {
  switch (tint) {
    case 'yellow': return palette.tintYellow;
    case 'rose': return palette.tintRose;
    case 'green': return palette.tintGreen;
    case 'blue': return palette.tintBlue;
    case 'red': return palette.tintRed;
    case 'orange': return palette.tintOrange;
    default: return null;
  }
}

/** The highlighter color behind a single tinted verse's text. */
export function verseTintFor(palette: BiblePalette, tint: TintColor | null | undefined): string | null {
  switch (tint) {
    case 'yellow': return palette.verseTintYellow;
    case 'rose': return palette.verseTintRose;
    case 'green': return palette.verseTintGreen;
    case 'blue': return palette.verseTintBlue;
    case 'red': return palette.verseTintRed;
    case 'orange': return palette.verseTintOrange;
    default: return null;
  }
}

/** v361: the soft wash behind a drag-selected phrase's words —
 * in the Scripture, and in his own notes alike. */
export function phraseTintFor(palette: BiblePalette, tint: TintColor | null | undefined): string | null {
  switch (tint) {
    case 'yellow': return palette.phraseTintYellow;
    case 'rose': return palette.phraseTintRose;
    case 'green': return palette.phraseTintGreen;
    case 'blue': return palette.phraseTintBlue;
    case 'red': return palette.phraseTintRed;
    case 'orange': return palette.phraseTintOrange;
    default: return null;
  }
}

/** "Ver. 1–3" style range label (en dash, his Notion convention). */
export function rangeLabel(start: number, end: number): string {
  return start === end ? `Ver. ${start}` : `Ver. ${start}–${end}`;
}

/** "Chapter 01" — zero-padded like his Notion cover banners. */
export function chapterLabel(chapter: number): string {
  return `Chapter ${String(chapter).padStart(2, '0')}`;
}

// ─── v311 "The Bible, to the Drawing" — the two-channel dresses ─────
// The approved drawing (bible-pages-expressive-v7.html, his "Also
// better. Let's do it.", Oct 28 12:42) encodes a chapter in TWO
// channels: the square's FILL carries the writing status, a BOOKMARK
// carries the read mark. These helpers own the fill half — the grid
// cell and the chapter sheet's status chips share them, so the two
// surfaces can never drift apart. Every color is a derived palette
// role (seed × appearance); the drawing's Classic-light hexes were
// roles, never values.

export interface CellDress {
  backgroundColor: string;
  color: string;
  borderColor?: string;
}

/** The chapter grid cell's dress for one writing status. */
export function cellDressFor(
  palette: BiblePalette,
  status: 'complete' | 'in-progress' | 'write' | 'restudy' | 'not-started' | 'none',
): CellDress {
  switch (status) {
    case 'complete':
      return { backgroundColor: palette.rasp, color: '#FFFFFF' };
    case 'in-progress':
      return { backgroundColor: palette.progBg, color: palette.progInk };
    case 'write':
      return { backgroundColor: palette.paper2, color: palette.raspDeep, borderColor: palette.bandBorder };
    case 'restudy':
      return { backgroundColor: palette.accentTeal.bg, color: palette.accentTeal.deep };
    default:
      return { backgroundColor: palette.raspTint, color: palette.inkSoft };
  }
}

export interface ChipDress {
  backgroundColor: string;
  color: string;
  borderColor: string;
}

/** The chapter sheet's status-chip dress: each chip rests in its
 * family tint; the CURRENT state deepens (Complete fills solid). */
export function sheetChipDress(
  palette: BiblePalette,
  status: 'complete' | 'in-progress' | 'write' | 'restudy',
  current: boolean,
): ChipDress {
  switch (status) {
    case 'complete':
      return current
        ? { backgroundColor: palette.rasp, color: '#FFFFFF', borderColor: palette.rasp }
        : { backgroundColor: palette.paper2, color: palette.inkSoft, borderColor: palette.bandBorder };
    case 'in-progress':
      return {
        backgroundColor: palette.progBg,
        color: palette.progInk,
        borderColor: current ? palette.progInk : palette.progBg,
      };
    case 'write':
      return current
        ? { backgroundColor: palette.raspTint, color: palette.raspDeep, borderColor: palette.rasp }
        : { backgroundColor: palette.paper2, color: palette.inkSoft, borderColor: palette.bandBorder };
    case 'restudy':
      return {
        backgroundColor: palette.accentTeal.bg,
        color: palette.accentTeal.deep,
        borderColor: current ? palette.accentTeal.deep : palette.accentTeal.bg,
      };
  }
}
