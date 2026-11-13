import type { Person, PrayerItem } from "./prayercircle-data";

/**
 * v435 — the emergency banner's row model (Concept 2, Jonathan's
 * Nov 4 pick — EC-3 structure, EC-4 motion): ONE card on the People
 * front door, a row per active emergency, soonest-expiring first.
 * The v256–v434 paging carousel is retired for this card only (the
 * praise banner keeps it): with emergencies this few, everything
 * urgent stands where he can see it, and nothing rotates.
 *
 * This module holds the pieces the banner's motion needs to be
 * provable off the device: the row key (an emergency is one
 * person's one item — a person can carry more than one at once),
 * the motion's duration, and the set reconciliation that decides,
 * when the active set changes under a mounted banner, which rows
 * open, which close, and which simply stand.
 */

export type EmergencyEntry = { person: Person; item: PrayerItem };

/** One row's identity across renders: the person + the item. */
export function emergencyRowKey(entry: EmergencyEntry): string {
  return `${entry.person.id}:${entry.item.id}`;
}

/** How long a row takes to open or close, in ms (EC-4: the card's
 * height rides one timing on the Material emphasized curve —
 * PEOPLE_ENTRANCE_EASING at the call site). */
export const EMERGENCY_ROW_MOTION_MS = 300;

export type EmergencyRowReconcile = {
  /** Every key that stays mounted, in display order: the active
   * order, with leaving keys held at their previous slots until
   * their close finishes (so the rows below never jump early). */
  keys: string[];
  /** Active keys not previously rendered — these open. */
  entering: string[];
  /** Rendered keys no longer active — these close, then unmount. */
  leaving: string[];
};

// ─── v521 — the card's red surface is sized by measurement ─────────
// Jonathan (2026-11-13): "Whenever I renew emergency prayers, this
// is how it looks… I have to restart the app to fix it." The renewed
// rows stood BELOW the card's red fill: their on-red text painted
// over the page background, washed out, while the card's shell and
// its inset-stretched breath glow spanned the full height.
//
// The mechanism: a Renew RE-POSTS the prayer (renewEmergencyPrayer
// clears the lapsed item and posts a fresh one through
// addEmergencyPrayer — a NEW item id), so in a mounted banner the
// renewed prayer is a NEW row key and arrives as an ENTERING row.
// The first renewal primes an unmounted banner (its row simply
// stands, per reconcileEmergencyRows below) and the card takes its
// first layout at header + one row; each further renewal grows the
// card AFTER that layout, through the entering rows' animated
// heights. The red fill was an absolutely positioned Svg whose
// root react-native-svg forces to width/height '100%' — a
// percentage of the content-sized shell — and that percentage
// surface stayed at the size of its first layout (header + first
// row) when the shell grew underneath it. A fresh app start primes
// every row standing before the first layout, so the fill measured
// the whole card and painted correctly — the restart "fix".
//
// The fix keeps the fill's size in the same measured idiom the rows
// themselves use (a row's natural height is measured by onLayout,
// then drives its surface): the banner measures the card shell
// with onLayout and hands the fill that exact size as explicit
// numbers, so the surface covers every row the shell contains, at
// every height the content reaches. This model is the state logic:
// a measurement the surface already has changes nothing (the same
// object comes back, so the caller can set state without a
// re-render), and a non-positive or non-finite measurement never
// reaches the surface.

export type EmergencyCardSurfaceSize = { width: number; height: number };

export function nextEmergencyCardSurfaceSize(
  prev: EmergencyCardSurfaceSize | null,
  measured: EmergencyCardSurfaceSize,
): EmergencyCardSurfaceSize | null {
  if (!Number.isFinite(measured.width) || !Number.isFinite(measured.height)) return prev;
  if (measured.width <= 0 || measured.height <= 0) return prev;
  if (prev && prev.width === measured.width && prev.height === measured.height) return prev;
  return { width: measured.width, height: measured.height };
}

export function reconcileEmergencyRows(rendered: string[], active: string[]): EmergencyRowReconcile {
  if (rendered.length === 0) {
    // Nothing on screen: the banner itself is absent or mounting,
    // and the card's own entrance (PeopleEntrance) carries the
    // arrival — no row opens.
    return { keys: [...active], entering: [], leaving: [] };
  }
  const renderedSet = new Set(rendered);
  const activeSet = new Set(active);
  const entering = active.filter((key) => !renderedSet.has(key));
  const leaving = rendered.filter((key) => !activeSet.has(key));
  const keys = [...active];
  // Leaving rows hold the slot they stood in until the close has
  // run; reinsert them at their previous positions, in order.
  leaving
    .slice()
    .sort((a, b) => rendered.indexOf(a) - rendered.indexOf(b))
    .forEach((key) => {
      keys.splice(Math.min(rendered.indexOf(key), keys.length), 0, key);
    });
  return { keys, entering, leaving };
}
