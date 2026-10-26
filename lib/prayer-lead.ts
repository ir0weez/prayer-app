// ─── v254 "People, First" — the lead need ───────────────────────────────────
// Piece E's pick, as a pure function so the session card and the
// tests read the same rule the brief states:
//
//   The lead need is the person's first not-done URGENT-flagged item.
//   With no urgent item, it is their first active item — matching the
//   app's own "most right now" pick (the story bar's displayItem:
//   first active emergency item, else the first urgent). An emergency
//   item keeps its own red treatment and is NEVER the FIRST card:
//   when the pick lands on an active emergency, the session renders
//   it as an emergency row and no FIRST card is dealt.
//
// "Urgent" here is his Oct 25 ruling: not life-or-death — the need
// that should lead when he prays for that person. A priority of
// attention, warmed, never alarmed.

import { getUrgentPrayerItems, type Person, type PrayerItem } from "./prayercircle-data";

export type LeadNeed =
  | { item: PrayerItem; kind: "first" }
  | { item: PrayerItem; kind: "emergency" }
  | null;

/** An emergency item whose stored 24 hours are still running. */
export function isActiveEmergencyItem(item: PrayerItem, now = new Date()): boolean {
  if (!item.isEmergency || !item.emergencyExpiresAt) return false;
  const ms = new Date(item.emergencyExpiresAt).getTime();
  return Number.isFinite(ms) && ms > now.getTime();
}

export function getLeadNeed(person: Person, now = new Date()): LeadNeed {
  const urgent = getUrgentPrayerItems(person)[0];
  if (urgent) return { item: urgent, kind: "first" };
  const firstActive = person.prayerItems.find((item) => !item.isDone);
  if (!firstActive) return null;
  if (isActiveEmergencyItem(firstActive, now)) return { item: firstActive, kind: "emergency" };
  return { item: firstActive, kind: "first" };
}
