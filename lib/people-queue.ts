// ─── v255 — the Today's prayer list queue, as drawn ────────────────────
// The mockup's queue card (people-material-concept-v2) carries the
// FULL pray-today list — getPrayTodayList, prayed people included —
// each face with its status beneath: waiting faces first (the list's
// own order kept inside each group), prayed faces settled after.
// v254's card read the story bar's visible list instead, which drops
// people as they are prayed, so the queue emptied out exactly when
// the day was done. The story bar keeps its own list and mechanics;
// this module is only the queue card's data shaping.

import { hasPersonCompletedPrayerToday, type Person } from "./prayercircle-data";

/**
 * The status line under a queue face, as drawn: "Prayed" once prayed;
 * "N waiting" only when more than one need is open (the drawing's
 * Denise carries "2 waiting"); a single open need — or none — reads
 * plain "Waiting" (the drawing's Novalee and Aaron).
 */
export function queueFaceStatus(person: Person, done: boolean): string {
  if (done) return "Prayed";
  const waiting = person.prayerItems.filter((item) => !item.isDone).length;
  return waiting >= 2 ? `${waiting} waiting` : "Waiting";
}

/**
 * v256: the queue's name is the FIRST name, whole — never the
 * "First L." form and never an ellipsis (his v255 screenshot:
 * "Jonatha…", "Novalee…"). A long first name shrinks to fit its
 * column at render instead of truncating.
 */
export function queueFirstName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts[0] || "Unnamed";
}

/** Waiting first, prayed after — stable inside each group. */
export function sortQueueFaces(list: Person[], today: string): Person[] {
  const waiting = list.filter((person) => !hasPersonCompletedPrayerToday(person, today));
  const prayed = list.filter((person) => hasPersonCompletedPrayerToday(person, today));
  return [...waiting, ...prayed];
}
