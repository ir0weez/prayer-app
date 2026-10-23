// ─── v205 Bible palette ──────────────────────────────────────────────────────
// The chapter surface speaks his Notion language: the identity colors
// (pink bands, keeper yellow, callout grey, raspberry) stay at full
// strength in every scheme and skin — paper is a material, not a color.
// What adapts is the page itself: surface, ink, and hairlines come from
// the app's theme/skin tokens like every other screen.

import { useColors } from '@/hooks/use-colors';
import { useSkin } from '@/hooks/use-skin';
import { hexLuminance } from '@/lib/skin-themes';

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
  isDark: boolean;
}

export function useBiblePalette(): BiblePalette {
  const colors = useColors();
  const { isSkinned, tokens } = useSkin();
  const isDark = hexLuminance(colors.background) < 0.5;
  const paper = isSkinned ? tokens.surface ?? colors.background : colors.background;
  return {
    paper,
    paper2: isDark ? colors.surface : '#FAFAF8',
    ink: colors.text,
    inkSoft: colors.muted,
    inkFaint: isDark ? '#8A857C' : '#ABA69C',
    line: colors.border,
    lineDark: isDark ? '#4A463F' : '#D9D5CC',
    band: '#FBE9F1',
    bandInk: '#9C1B49',
    rasp: '#C2255C',
    raspDeep: '#9C1B49',
    raspSoft: '#FBE9F1',
    raspTint: '#FDF3F7',
    rose: '#E64980',
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
    tintYellow: 'rgba(245,197,66,.38)',
    tintRose: 'rgba(230,73,128,.14)',
    tintGreen: 'rgba(64,160,110,.20)',
    isDark,
  };
}

/** "Ver. 1–3" style range label (en dash, his Notion convention). */
export function rangeLabel(start: number, end: number): string {
  return start === end ? `Ver. ${start}` : `Ver. ${start}–${end}`;
}

/** "Chapter 01" — zero-padded like his Notion cover banners. */
export function chapterLabel(chapter: number): string {
  return `Chapter ${String(chapter).padStart(2, '0')}`;
}
