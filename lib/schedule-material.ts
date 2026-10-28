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
