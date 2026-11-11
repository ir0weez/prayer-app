// ─── Devotional player theme (v497) ─────────────────────────────────────────
// The v497 player's colours, derived per book at the depth the
// approved drawings settled (mockups devotional-player-concepts-v5
// /-v8, PLAYER V5/V8 · NOV 11).
//
// The INSTANCE is Genesis ember, drawn from his red section colour:
// the mockup's stops sit at hues 9.9°–18.7° (the book-red hue, 0°,
// carried to ember) with the saturations / lightnesses below. The
// player applies that same ember treatment to EVERY book's own
// ROYGBIV hue (lib/bible-v205/book-colors.ts — the app's per-book
// colour source): each stop's hue is the book hue plus the mockup
// stop's own hue, its saturation and lightness are the mockup
// stop's. So Genesis lands exactly on the approved stops — primary
// #9C2A10, accent #7A1F0D, track #DFA58D, stop seat #E7B29A, fill
// #82200A / fill-deep #671806 — and Joshua, Ruth, 1 Kings and every
// future book wear the same depth in their own hue. Nothing is
// pinned to ember beyond the treatment itself.
//
// Dark appearance lifts the stops (the book-colors dark pattern:
// fills step lighter so they stay present on the dark ground) —
// same hues and hue offsets, lightness raised, saturation eased.

import { BOOK_HUE_LIGHT, bookHueFor } from './bible-v205/book-colors';
import { hexToHsl, hslToHex } from './skin-themes';
import { mix } from './color-themes';

/** Collapse: a downward drag scrubs the morph over this many px
 * (the v4 demo's 300px travel). */
export const DEVOTIONAL_COLLAPSE_TRAVEL_PX = 300;
/** Collapse: release past this fraction of the morph settles into
 * the pill; under it the player settles back up (the v4 demo's
 * 0.35). */
export const DEVOTIONAL_COLLAPSE_THRESHOLD = 0.35;
/** Collapse/expand settle duration — Material emphasized,
 * cubic-bezier(0.2, 0, 0, 1) (the v4 demo's 500ms tween). */
export const DEVOTIONAL_COLLAPSE_SETTLE_MS = 500;
/** Stop: the colour spreads from the Stop button across the whole
 * surface over this long (the v4 demo's 380ms). */
export const DEVOTIONAL_STOP_SPREAD_MS = 380;
/** Stop: the filled surface holds for this long before it leaves
 * (the v4 demo's 250ms). */
export const DEVOTIONAL_STOP_HOLD_MS = 250;
/** Stop: the surface slides away over this long (the v4 demo's
 * 400ms exit tween); only then does the session clear. */
export const DEVOTIONAL_STOP_EXIT_MS = 400;
/** The Fill's wavy leading edge drifts on this cycle while playing
 * (v8's 2.1s wavedrift). */
export const DEVOTIONAL_FILL_DRIFT_MS = 2100;
/** …and by this many px either way. */
export const DEVOTIONAL_FILL_DRIFT_PX = 4;

/**
 * The Fill's leading edge — v8 treatment 6's SVG wave, verbatim:
 * a 16×66 path whose right edge is the wave (the fill occupies the
 * path's left; the wave crests at x≈6–12). Rendered at the fill
 * boundary, stretched to the pill's height.
 */
export const DEVOTIONAL_FILL_EDGE_PATH =
  'M0 0 H6 Q12 8 6 16.5 Q0 25 6 33 Q12 41 6 49.5 Q0 58 6 66 H0 Z';

/** The played fraction The Fill advances by: position / duration,
 * clamped; no duration yet reads as nothing played. */
export function devotionalFillFraction(positionSec: number, durationSec: number): number {
  if (!Number.isFinite(positionSec) || !Number.isFinite(durationSec) || durationSec <= 0) return 0;
  return Math.min(1, Math.max(0, positionSec / durationSec));
}

export interface DevotionalPlayerTheme {
  /** The shared deep primary: numeral hero, play-button fill,
   * played wave — ONE stop, as the mockup draws it. */
  primary: string;
  /** Text-grade accent: eyebrow, context line, times, Stop label. */
  accent: string;
  /** The wavy seek's unplayed track. */
  track: string;
  /** The Stop pill's filled-tonal seat. */
  stopSeat: string;
  /** The Fill: the shade that advances behind the pill's content… */
  fill: string;
  /** …and its deepest stop (the Fill's leading edge, the pill's
   * stop-spread colour). */
  fillDeep: string;
  /** The pill body's same-family gradient (mockup P1). */
  pillFrom: string;
  pillTo: string;
  /** The full player's plain surface ground. */
  ground: string;
  ink: string;
  inkSoft: string;
  isDark: boolean;
}

interface StopDef {
  hue: number;
  s: number;
  l: number;
}

// The mockup's Genesis stops, as (hue, saturation, lightness) — the
// hue is the offset from the book hue (Genesis's book hue is 0°,
// so the mockup hues ARE the offsets).
const LIGHT_STOPS: Record<'primary' | 'accent' | 'track' | 'stopSeat' | 'fill' | 'fillDeep' | 'pillFrom' | 'pillTo', StopDef> = {
  primary: { hue: 11.142857, s: 0.813953, l: 0.337255 }, // #9C2A10
  accent: { hue: 9.908257, s: 0.807407, l: 0.264706 }, // #7A1F0D
  track: { hue: 17.560976, s: 0.561644, l: 0.713725 }, // #DFA58D
  stopSeat: { hue: 18.701299, s: 0.616, l: 0.754902 }, // #E7B29A
  fill: { hue: 11.0, s: 0.857143, l: 0.27451 }, // #82200A
  fillDeep: { hue: 11.134021, s: 0.889908, l: 0.213725 }, // #671806
  pillFrom: { hue: 12.8, s: 0.806452, l: 0.364706 }, // #A83212
  pillTo: { hue: 12.0, s: 0.833333, l: 0.305882 }, // #8F270D
};

// Dark: same hues, lifted lightness (fills stay present on the
// dark ground), saturation eased a step — the book-colors dark
// construction applied to the player's stops.
const DARK_STOPS: typeof LIGHT_STOPS = {
  primary: { hue: 11.142857, s: 0.75, l: 0.6 },
  accent: { hue: 9.908257, s: 0.7, l: 0.74 },
  track: { hue: 17.560976, s: 0.48, l: 0.4 },
  stopSeat: { hue: 18.701299, s: 0.48, l: 0.3 },
  fill: { hue: 11.0, s: 0.78, l: 0.5 },
  fillDeep: { hue: 11.134021, s: 0.82, l: 0.42 },
  pillFrom: { hue: 12.8, s: 0.74, l: 0.54 },
  pillTo: { hue: 12.0, s: 0.77, l: 0.47 },
};

/** The v497 player theme for one book in one appearance. */
export function devotionalPlayerTheme(book: string, isDark: boolean): DevotionalPlayerTheme {
  const hueId = bookHueFor(book);
  // The book's own hue from the app's per-book source; a name
  // outside the canon falls back to the mockup's ember base.
  const baseHex = hueId ? BOOK_HUE_LIGHT[hueId].primary : '#B3402A';
  const bookHue = hexToHsl(baseHex).h;
  const stops = isDark ? DARK_STOPS : LIGHT_STOPS;
  const stop = (def: StopDef) => hslToHex({ h: bookHue + def.hue, s: def.s, l: def.l });
  const primary = stop(stops.primary);
  return {
    primary,
    accent: stop(stops.accent),
    track: stop(stops.track),
    stopSeat: stop(stops.stopSeat),
    fill: stop(stops.fill),
    fillDeep: stop(stops.fillDeep),
    pillFrom: stop(stops.pillFrom),
    pillTo: stop(stops.pillTo),
    ground: isDark ? '#211310' : '#FFF8F5',
    ink: isDark ? '#F8E9E1' : '#2B1710',
    inkSoft: isDark ? mix(primary, '#FFFFFF', 0.55) : '#84655A',
    isDark,
  };
}
