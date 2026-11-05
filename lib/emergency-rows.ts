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
