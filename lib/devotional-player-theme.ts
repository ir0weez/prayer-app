// ─── Devotional player theme (v497 → v499) ──────────────────────────────────
// The player's colours, derived per book. v497 carried every book's
// ROYGBIV hue to ember (Genesis primary #9C2A10, hues 9.9°–18.7°);
// Jonathan's verdict on the v499 Guideposts colour rounds (Nov 11):
// "It's not really red though..." — spread over a whole page, the
// ember family's light steps read peach and its deep step read
// rust-brown, and Genesis sits in his RED band. v499 RE-ANCHORS the
// family on each book's band hue (lib/bible-v205/book-colors.ts —
// RED Genesis–Deuteronomy, ORANGE Joshua–Esther, YELLOW Job–Song of
// Solomon, GREEN Isaiah–Daniel, BLUE Hosea–Malachi, INDIGO
// Matthew–Acts, VIOLET Romans–Revelation) with SATURATION HELD at
// every stop, so large areas still read as the book's colour: light
// steps are tinted, never peach; deep steps are saturated, never
// brown.
//
// The stops are the approved drawing's (mockup
// devotional-player-guideposts-v5, PLAYER GUIDEPOSTS V5 · NOV 11).
// Genesis, the drawn instance, is PINNED by it — primary #A8150C,
// deep accent #7E0E05, ground #F6D0C8, panel #F0BCAE, control seat
// #EBAE9C, ink #2E0F0A, unplayed track #E3A08D — and every other book
// derives at the same stops: each stop's hue is the book's band hue
// plus the pinned stop's own hue (Genesis's band hue is 0°, so the
// pinned hues ARE the offsets), its saturation and lightness the
// pinned stop's. The Fill / pill-gradient stops follow the new
// primary at v497's own deltas from its primary, so treatment 6
// keeps its shape in the new family.
//
// Dark appearance follows the v497 dark pattern on the new anchors:
// same hue offsets, lightness lifted so fills stay present on the
// dark ground, saturation eased a step, containers stepped deep.

import { BOOK_HUE_LIGHT, bookHueFor } from './bible-v205/book-colors';
import { hexToHsl, hslToHex } from './skin-themes';

/** Collapse: a downward drag scrubs the morph over this many px
 * (the demo's 300px travel). */
export const DEVOTIONAL_COLLAPSE_TRAVEL_PX = 300;
/** Collapse: release past this fraction of the morph settles into
 * the pill; under it the player settles back up (the demo's 0.35). */
export const DEVOTIONAL_COLLAPSE_THRESHOLD = 0.35;
/** Collapse/expand settle duration — Material emphasized,
 * cubic-bezier(0.2, 0, 0, 1) (the demo's 500ms tween). */
export const DEVOTIONAL_COLLAPSE_SETTLE_MS = 500;
/** Collapse: the page content is fully out by this fraction of the
 * morph (the v5 demo's render(): content fades over p 0 → 0.45). */
export const DEVOTIONAL_COLLAPSE_CONTENT_OUT_END = 0.45;
/** Collapse: the pill face starts arriving at this fraction and is
 * fully in at 1 (the v5 demo: pill face over p 0.55 → 1). Between
 * the two windows the surface is mid-morph — coloured, bounded,
 * never blank. */
export const DEVOTIONAL_COLLAPSE_PILL_IN_START = 0.55;
/** Collapse: the page content drifts up by this many px as it
 * leaves (the v5 demo's −14px). */
export const DEVOTIONAL_COLLAPSE_CONTENT_TRAVEL_PX = 14;
/** Stop: the colour spreads from the Stop button across the whole
 * surface over this long (the demo's 380ms). */
export const DEVOTIONAL_STOP_SPREAD_MS = 380;
/** Stop: the filled surface holds for this long before it leaves
 * (the demo's 250ms). */
export const DEVOTIONAL_STOP_HOLD_MS = 250;
/** Stop: the surface slides away over this long (the demo's 400ms
 * exit tween); only then does the session clear. */
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

// ─── The morph's mapping (v499, ported from the v5 demo) ────────────────────
// One progress value (0 = full page, 1 = pill) drives the collapse.
// These pure forms pin the demo's windows so the screen's animated
// styles and the tests read the same numbers.

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Page content opacity over the morph: 1 at the page, 0 by
 * p = DEVOTIONAL_COLLAPSE_CONTENT_OUT_END, gone — not fading —
 * for the rest of the travel. */
export function devotionalMorphContentOpacity(p: number): number {
  return 1 - clamp01(p / DEVOTIONAL_COLLAPSE_CONTENT_OUT_END);
}

/** Page content travel over the morph: up by the demo's 14px
 * across the same window it fades in. */
export function devotionalMorphContentTranslateY(p: number): number {
  return -DEVOTIONAL_COLLAPSE_CONTENT_TRAVEL_PX * clamp01(p / DEVOTIONAL_COLLAPSE_CONTENT_OUT_END);
}

/** Pill-face opacity over the morph: 0 until
 * DEVOTIONAL_COLLAPSE_PILL_IN_START, 1 at the pill. */
export function devotionalMorphPillFaceOpacity(p: number): number {
  return clamp01((p - DEVOTIONAL_COLLAPSE_PILL_IN_START) / (1 - DEVOTIONAL_COLLAPSE_PILL_IN_START));
}

export interface DevotionalMorphSeat {
  /** The pill seat's top edge on screen (screen height − pill
   * bottom offset − pill height). */
  pillTop: number;
  /** The pill seat's distance off the bottom (tab bar + 10). */
  pillBottom: number;
  /** The pill seat's side inset (the root pill's 14). */
  pillSide: number;
  /** The pill's height (66). */
  pillHeight: number;
}

export interface DevotionalMorphBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  borderRadius: number;
}

/**
 * The morph surface's bounds at p: the full frame at 0, the root
 * pill's EXACT seat at 1 (bottom-anchored: height → the pill's,
 * insets → the pill's, radius → the pill's half-height, which is
 * what the pill's radius-999 capsule draws). At p = 1 the surface
 * coincides with the seat the root pill occupies, so the hand-off
 * is a swap of identical geometry, never a jump.
 */
export function devotionalMorphBounds(p: number, seat: DevotionalMorphSeat): DevotionalMorphBounds {
  const t = clamp01(p);
  return {
    left: lerp(0, seat.pillSide, t),
    right: lerp(0, seat.pillSide, t),
    top: lerp(0, seat.pillTop, t),
    bottom: lerp(0, seat.pillBottom, t),
    borderRadius: lerp(0, seat.pillHeight / 2, t),
  };
}

export interface DevotionalPlayerTheme {
  /** The shared deep primary: numeral hero, play-button fill,
   * played wave — ONE stop, as the mockup draws it. */
  primary: string;
  /** The deep accent: big-idea line, Stop label, chevron, times'
   * deep partner. */
  accent: string;
  /** The wavy seek's unplayed track. */
  track: string;
  /** The filled-tonal seat: Stop pill, collapse chevron tile. */
  stopSeat: string;
  /** The guideposts panel's ground — one tonal step deeper than
   * the page ground, same family. */
  panel: string;
  /** The Fill: the shade that advances behind the pill's content… */
  fill: string;
  /** …and its deepest stop (the Fill's leading edge, the pill's
   * stop-spread colour). */
  fillDeep: string;
  /** The pill body's same-family gradient (mockup P1). */
  pillFrom: string;
  pillTo: string;
  /** The full player's surface ground — a real tonal step of the
   * book's hue (v499: the page joins the family). */
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

type StopName =
  | 'primary'
  | 'accent'
  | 'track'
  | 'stopSeat'
  | 'panel'
  | 'fill'
  | 'fillDeep'
  | 'pillFrom'
  | 'pillTo'
  | 'ground'
  | 'ink'
  | 'inkSoft';

// The drawing's Genesis stops, as (hue, saturation, lightness) —
// the hue is the offset from the book's band hue (Genesis's band
// hue is 0°, so the pinned stops' hues ARE the offsets). The seven
// mockup-pinned stops carry the drawing's exact values; fill /
// fillDeep / pillFrom / pillTo / inkSoft follow the primary at
// v497's deltas, re-based on the new anchor.
const LIGHT_STOPS: Record<StopName, StopDef> = {
  primary: { hue: 3.461538, s: 0.866667, l: 0.352941 }, // #A8150C — pinned
  accent: { hue: 4.46281, s: 0.923664, l: 0.256863 }, // #7E0E05 — pinned
  track: { hue: 13.255814, s: 0.605634, l: 0.721569 }, // #E3A08D — pinned
  stopSeat: { hue: 13.670886, s: 0.663866, l: 0.766667 }, // #EBAE9C — pinned
  panel: { hue: 12.727273, s: 0.6875, l: 0.811765 }, // #F0BCAE — pinned
  fill: { hue: 3.461538, s: 0.909857, l: 0.290196 }, // #8D0E07 — primary Δs +.043, Δl −.063
  fillDeep: { hue: 3.461538, s: 0.942622, l: 0.229412 }, // #720A03 — primary Δs +.076, Δl −.124
  pillFrom: { hue: 3.461538, s: 0.859166, l: 0.380392 }, // #B4170E — primary Δs −.008, Δl +.027
  pillTo: { hue: 3.461538, s: 0.886047, l: 0.321568 }, // #9B1209 — primary Δs +.019, Δl −.031
  ground: { hue: 10.434783, s: 0.71875, l: 0.87451 }, // #F6D0C8 — pinned
  ink: { hue: 8.333333, s: 0.642857, l: 0.109804 }, // #2E0F0A — pinned
  inkSoft: { hue: 3.461538, s: 0.3, l: 0.4 }, // #854B47 — the primary, muted
};

// Dark: same hue offsets, lightness lifted (fills stay present on
// the dark ground), saturation eased a step — the v497 dark
// construction applied to the new anchors. Genesis dark instance:
// primary #E25850, accent #EA9F99, ground #1D0F0C, panel #2E1A15,
// track #8D4935, stopSeat #643426, fill #DF2B20, fillDeep #C11F15,
// pillFrom #DE3F35, pillTo #D2281E, ink #F7E6E3, inkSoft #CA9491.
const DARK_STOPS: Record<StopName, StopDef> = {
  primary: { hue: 3.461538, s: 0.72, l: 0.6 },
  accent: { hue: 4.46281, s: 0.66, l: 0.76 },
  track: { hue: 13.255814, s: 0.45, l: 0.38 },
  stopSeat: { hue: 13.670886, s: 0.45, l: 0.27 },
  panel: { hue: 12.727273, s: 0.38, l: 0.13 },
  fill: { hue: 3.461538, s: 0.75, l: 0.5 },
  fillDeep: { hue: 3.461538, s: 0.8, l: 0.42 },
  pillFrom: { hue: 3.461538, s: 0.72, l: 0.54 },
  pillTo: { hue: 3.461538, s: 0.75, l: 0.47 },
  ground: { hue: 10.434783, s: 0.4, l: 0.08 },
  ink: { hue: 8.333333, s: 0.55, l: 0.93 },
  inkSoft: { hue: 3.461538, s: 0.35, l: 0.68 },
};

/** The player theme for one book in one appearance: the book's
 * band hue carried at the drawing's stops, saturation held. */
export function devotionalPlayerTheme(book: string, isDark: boolean): DevotionalPlayerTheme {
  const hueId = bookHueFor(book);
  // The book's own band hue from the app's per-book source; a name
  // outside the canon falls back to the mockup's red base.
  const baseHex = hueId ? BOOK_HUE_LIGHT[hueId].primary : '#C62828';
  const bookHue = hexToHsl(baseHex).h;
  const stops = isDark ? DARK_STOPS : LIGHT_STOPS;
  const stop = (def: StopDef) => hslToHex({ h: bookHue + def.hue, s: def.s, l: def.l });
  return {
    primary: stop(stops.primary),
    accent: stop(stops.accent),
    track: stop(stops.track),
    stopSeat: stop(stops.stopSeat),
    panel: stop(stops.panel),
    fill: stop(stops.fill),
    fillDeep: stop(stops.fillDeep),
    pillFrom: stop(stops.pillFrom),
    pillTo: stop(stops.pillTo),
    ground: stop(stops.ground),
    ink: stop(stops.ink),
    inkSoft: stop(stops.inkSoft),
    isDark,
  };
}
