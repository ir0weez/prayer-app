/**
 * v294 — the schedule's Material theme, DERIVED (never pinned): every tone
 * is stepped from the Settings seed (his chosen palette colour) over the
 * current appearance's surface, the way the Bible derivation works. The
 * approved drawings supply the structure and the Classic-light instance;
 * these steps reproduce that instance from his seed and follow it when
 * the seed or the appearance changes.
 */

import { mix } from "./color-themes";
import { hexLuminance } from "./skin-themes";

export type ScheduleMaterialTones = {
  /** The page ground — the seed's surface tone. */
  page: string;
  /** Quietest card step (section cards on creator pages). */
  containerLow: string;
  /** Standard card step. */
  container: string;
  /** Strongest card step. */
  containerHigh: string;
  /** The FAB's open surface / hero tonal (the drawing's pale violet). */
  primaryContainer: string;
  /** A mid step of the seed itself (chips, selected states). */
  primarySoft: string;
  /** Deep step of the seed (the ministry ramp's deep band, stubs). */
  primaryDeep: string;
};

export function scheduleMaterialTones(seed: string, surface: string): ScheduleMaterialTones {
  const dark = hexLuminance(surface) < 0.5;
  return {
    page: mix(surface, seed, dark ? 0.16 : 0.06),
    containerLow: mix(surface, seed, dark ? 0.22 : 0.09),
    container: mix(surface, seed, dark ? 0.28 : 0.13),
    containerHigh: mix(surface, seed, dark ? 0.36 : 0.19),
    primaryContainer: mix(surface, seed, dark ? 0.34 : 0.14),
    primarySoft: mix(seed, surface, dark ? 0.25 : 0.45),
    primaryDeep: mix(seed, "#000000", dark ? 0.1 : 0.28),
  };
}

/** Tonal steps of any colour (the ministry square's ramp derives from the ministry's own accent the same way). */
export function tonalRamp(base: string, surface: string): { deep: string; mid: string; pale: string } {
  const dark = hexLuminance(surface) < 0.5;
  return {
    deep: mix(base, "#000000", dark ? 0.05 : 0.3),
    mid: base,
    pale: mix(surface, base, dark ? 0.3 : 0.13),
  };
}

/**
 * v308 (approved by Jonathan, Oct 28 12:18): the white blocks'
 * PAPER. The blocks filled literal #FFFFFF / #000000 through
 * v298–v307; the fill now derives from the palette like every
 * other schedule surface. In light it is the palette's own
 * lightest surface tone — the surface-container-lowest
 * equivalent: the theme surface stepped a whisper toward the
 * seed, so the paper takes the seed's temperature (a warm white
 * under a warm seed, cool white under violet) while staying
 * LIGHTER than the page ground's step (0.06). In dark it is the
 * palette's darkest surface — the theme surface stepped toward
 * black: a near-black with the palette's own temperature, which
 * keeps his Oct 28 "black in dark" ruling in spirit (never a
 * grey, never a seed tint). Either way the block remains the
 * emptiest-looking thing on the page — blank paper, never
 * seed-coloured.
 */
export function schedulePaperSurface(seed: string, surface: string): string {
  const dark = hexLuminance(surface) < 0.5;
  return dark ? mix(surface, "#000000", 0.4) : mix(surface, seed, 0.035);
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace("#", "");
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

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb: [number, number, number];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  const channel = (v: number) => Math.min(255, Math.max(0, Math.round((v + m) * 255))).toString(16).padStart(2, "0");
  return `#${channel(rgb[0])}${channel(rgb[1])}${channel(rgb[2])}`.toUpperCase();
}

/**
 * v298: the summary panel's step. The v32 drawing's panel (#6D28D9) is
 * its seed (#7C3AED) stepped in HSL — lightness ×0.875, saturation
 * ×0.87, hue kept. v295–v297 instead mixed the seed 12% toward black
 * in RGB, which mostly darkens: from his softer default seed the
 * panel rendered a visibly LIGHTER, greyer violet than the drawing's
 * (his Oct 28 report). This step reproduces the drawing's panel from
 * the drawing's seed within a few units per channel and follows any
 * seed he picks — derived, never pinned.
 */
export function schedulePanelStep(seed: string): string {
  const { h, s, l } = hexToHsl(seed);
  return hslToHex(h, Math.min(1, s * 0.87), l * 0.875);
}
