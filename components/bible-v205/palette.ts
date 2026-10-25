// ─── v205 Bible palette ──────────────────────────────────────────────────────
// The chapter surface speaks his Notion language: the identity colors
// (keeper yellow, callout grey, the category code, the tint washes)
// stay at full strength in every scheme and skin — paper is a
// material, not a color. What adapts is the page itself: surface,
// ink, and hairlines come from the app's theme/skin tokens like
// every other screen.
//
// ─── v248 "The Bible, Dressed Like the Rest" ───────────────────────────────
// Two theme-citizenship halves join here (his verdict on v247,
// Oct 25 13:03: "It works now... But you didn't make a paper
// version of it, and it didn't change the color to orange to match
// the selected color. I wanted to make it match the chosen theme."):
//
//  (1) PALETTE — the accent family no longer hard-codes the v205
//      raspberry (#C2255C) and its pinks. It DERIVES from the active
//      palette's primary via deriveBibleAccents
//      (lib/bible-v205/palette-accents.ts) — the same token the
//      Schedule and People screens consume — so the color he picked
//      dresses the Bible exactly as it dresses the rest of the app:
//      rasp is the primary itself, the band family is that primary
//      washed over the page paper, and bandInk/raspDeep are the
//      primary deepened or lifted until they truly read (≥4.5:1)
//      where text wears them. The meaning colors are NOT accents
//      and stay constant: category code, keeper yellow, callout
//      grey, tint washes, verse-number grey.
//
//  (2) SKIN DIALECT — the dress fragments below resolve the active
//      skin's own surface language from its tokens, in the sibling
//      screens' idioms: content cards wear the skin's frame (or the
//      Paper cut radius) plus its card shadow; tappables wear the
//      Paper button shadow (the hard offset shadow is a
//      tappable-only signal) or the skin's card shadow; modal
//      sheets wear the sheet shadow; a screen root wears the sheet
//      head treatment (sheet radius + sheet shadow + frame side
//      borders); the big heading takes the skin's page-title size.
//      Under Classic every fragment is empty and the look is
//      today's — only the palette follows.

import { useColors } from '@/hooks/use-colors';
import { useSkin } from '@/hooks/use-skin';
import { hexLuminance } from '@/lib/skin-themes';
import { resolveBibleInk } from '@/lib/bible-v205/palette-ink';
import { deriveBibleAccents } from '@/lib/bible-v205/palette-accents';
import type { TintColor } from '@/lib/bible-v205/marks';

export { resolveBibleInk } from '@/lib/bible-v205/palette-ink';
export { deriveBibleAccents, bibleAccentInk, type BibleAccents } from '@/lib/bible-v205/palette-accents';

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
  verseTintYellow: string;
  verseTintRose: string;
  verseTintGreen: string;
  isDark: boolean;
  /** v248 skin dress — resolved from the active skin's tokens. */
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
  const { isSkinned, tokens } = useSkin();
  const isDark = hexLuminance(colors.background) < 0.5;
  const paper = isSkinned ? tokens.surface ?? colors.background : colors.background;
  // v248: the accent family derives from the chosen color theme's
  // primary — the token every sibling screen consumes.
  const accents = deriveBibleAccents(colors.primary, paper);
  // v248 skin dress, in the sibling screens' own idioms:
  //  · frame — the skin's frame, or the Paper cut radius
  //    (schedule-tab's `skinTokens.frame ?? paperCutFor(tokens)`);
  //  · cards — frame + the skin's card shadow (interior-shell,
  //    mini-game-scene, profile);
  //  · buttons — Paper's button shadow on tappables only, the
  //    skin's card shadow under the other skins (interior-shell);
  //  · sheets — the modal sheet shadow (family, person,
  //    date-time-picker);
  //  · screens — the sheet head: sheet radius + sheet shadow +
  //    frame side borders (the schedule day sheet, the home sheet).
  const frameDress: BibleDress = tokens.frame ?? (tokens.isPaper ? { borderRadius: 6 } : {});
  const cardDress: BibleDress = {
    ...frameDress,
    ...(isSkinned ? tokens.cardShadow ?? {} : {}),
  };
  const btnDress: BibleDress = isSkinned
    ? tokens.isPaper
      ? tokens.buttonShadow ?? {}
      : tokens.cardShadow ?? {}
    : {};
  const sheetDress: BibleDress = isSkinned ? tokens.sheetShadow ?? {} : {};
  const screenDress: BibleDress = isSkinned
    ? {
        borderTopLeftRadius: tokens.sheetRadius ?? 18,
        borderTopRightRadius: tokens.sheetRadius ?? 18,
        ...(tokens.sheetShadow ?? {}),
        ...(tokens.frame
          ? {
              borderLeftWidth: tokens.frame.borderWidth,
              borderRightWidth: tokens.frame.borderWidth,
              borderLeftColor: tokens.frame.borderColor,
              borderRightColor: tokens.frame.borderColor,
            }
          : {}),
        overflow: 'hidden',
      }
    : {};
  return {
    paper,
    paper2: isDark ? colors.surface : '#FAFAF8',
    // v220: the runtime palette's ink key is `foreground` — `text`
    // does not exist on it, so this read was undefined and the verse
    // text rendered black on every dark page. The ink also resolves
    // against the resolved paper (Terminal's panel is dark in BOTH
    // schemes, so a light-scheme foreground needs the guard too).
    ink: resolveBibleInk(colors.foreground, paper),
    inkSoft: colors.muted,
    inkFaint: isDark ? '#8A857C' : '#ABA69C',
    // v248: under a skin the hairlines take the skin's own border
    // token (Paper's ink-mixed edge, 8-bit's ink, Terminal's mid
    // wire); under Classic, the palette border as before.
    line: isSkinned ? tokens.border ?? colors.border : colors.border,
    lineDark: isDark ? '#4A463F' : '#D9D5CC',
    ...accents,
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
    // v212: verse-level tints — a highlighter stroke behind one
    // verse's text, stronger than the entry wash so the single verse
    // stands out from an entry wash of the same hue.
    verseTintYellow: 'rgba(245,197,66,.45)',
    verseTintRose: 'rgba(230,73,128,.45)',
    verseTintGreen: 'rgba(64,160,110,.45)',
    isDark,
    cardDress,
    btnDress,
    sheetDress,
    screenDress,
    frameDress,
    h2Size: tokens.type.pageTitle,
  };
}

/** The entry-container wash for a tint hue (null = no wash). */
export function tintWashFor(palette: BiblePalette, tint: TintColor | null | undefined): string | null {
  return tint === 'yellow'
    ? palette.tintYellow
    : tint === 'rose'
      ? palette.tintRose
      : tint === 'green'
        ? palette.tintGreen
        : null;
}

/** The highlighter color behind a single tinted verse's text. */
export function verseTintFor(palette: BiblePalette, tint: TintColor | null | undefined): string | null {
  return tint === 'yellow'
    ? palette.verseTintYellow
    : tint === 'rose'
      ? palette.verseTintRose
      : tint === 'green'
        ? palette.verseTintGreen
        : null;
}

/** "Ver. 1–3" style range label (en dash, his Notion convention). */
export function rangeLabel(start: number, end: number): string {
  return start === end ? `Ver. ${start}` : `Ver. ${start}–${end}`;
}

/** "Chapter 01" — zero-padded like his Notion cover banners. */
export function chapterLabel(chapter: number): string {
  return `Chapter ${String(chapter).padStart(2, '0')}`;
}
