// ─── v310 "Pray Now, To the Drawing" — the session's quiet math ───────────
// Two derivations the re-dressed session displays, kept pure so
// the pins hold them to the engine and the record:
//
//  1. THE TIME BONUS, as it accrues. The session's grant path is
//     unchanged and lives in components/prayer-session.tsx: one
//     "prayer-time-bonus" award per PRAYER_TIME_BONUS_INTERVAL
//     of session time (the 5-minute effect + the AppState
//     catch-up). The Complete bar only READS the same accrual —
//     floor(elapsed / interval) × the engine's own points for
//     the action (lib/xp-engine.ts XP_ACTION_POINTS) — so the
//     label can never promise XP the engine won't grant.
//
//  2. THE DEEPENING. As time on the active person accrues past
//     DEEPEN_THRESHOLD_SECONDS, the hero unfolds three quiet
//     rows, all read off the person record: when he last reached
//     them (Person.lastPrayedDate — the reach stamp), how many
//     days running he has prayed for them (the v279 prayedDates
//     log plus lastPrayerCompletedDate), and his note for them
//     (Person.prayerNote). Rows the record can't support are
//     simply not dealt — nothing is inferred or backfilled.

import { getDaysSinceLastPrayedOnDate, type Person } from "./prayercircle-data";
import { XP_ACTION_POINTS } from "./xp-engine";

/** One time-bonus award per this many seconds of session time. */
export const PRAYER_TIME_BONUS_INTERVAL_SECONDS = 300;

/** The deepening's threshold: a minute spent with this person. */
export const DEEPEN_THRESHOLD_SECONDS = 60;

/** XP the time bonus has accrued by `elapsedSeconds` of session
 *  time — the grant effect's own arithmetic, read back. */
export function getAccruedTimeBonusXp(elapsedSeconds: number): number {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < PRAYER_TIME_BONUS_INTERVAL_SECONDS) return 0;
  return Math.floor(elapsedSeconds / PRAYER_TIME_BONUS_INTERVAL_SECONDS) * XP_ACTION_POINTS["prayer-time-bonus"];
}

/** 0..1 — how far the current bonus interval has filled (the
 *  Complete bar's thread). */
export function getTimeBonusProgress(elapsedSeconds: number): number {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return 0;
  return (elapsedSeconds % PRAYER_TIME_BONUS_INTERVAL_SECONDS) / PRAYER_TIME_BONUS_INTERVAL_SECONDS;
}

function shiftISODate(iso: string, deltaDays: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day + deltaDays);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Consecutive days prayed for this person, ending today — or
 * ending yesterday when today hasn't happened yet (the run is
 * still alive at the moment the session opens). The day set is
 * the v279 log plus lastPrayerCompletedDate, the two records
 * markPersonPrayed actually keeps; nothing older is claimed.
 */
export function getPrayedDayStreak(person: Pick<Person, "prayedDates" | "lastPrayerCompletedDate">, todayISO: string): number {
  const days = new Set<string>(person.prayedDates ?? []);
  if (person.lastPrayerCompletedDate) days.add(person.lastPrayerCompletedDate);
  let cursor: string;
  if (days.has(todayISO)) {
    cursor = todayISO;
  } else {
    const yesterday = shiftISODate(todayISO, -1);
    if (!days.has(yesterday)) return 0;
    cursor = yesterday;
  }
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = shiftISODate(cursor, -1);
  }
  return streak;
}

export type DeepeningSegment = { text: string; strong?: boolean };
export type DeepeningRow = { key: "reached" | "streak" | "note"; segments: DeepeningSegment[] };

/**
 * The hero's deepening rows for a person, in the drawing's
 * order — last reached, days running, last note — with the
 * drawing's own emphasis (the label and the run count carry the
 * weight; the rest rides quiet). A row the record can't support
 * is omitted, never padded.
 */
export function getDeepeningRows(person: Person, todayISO: string): DeepeningRow[] {
  const rows: DeepeningRow[] = [];

  if (person.lastPrayedDate) {
    const days = getDaysSinceLastPrayedOnDate(person.lastPrayedDate, todayISO);
    const when = days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
    rows.push({ key: "reached", segments: [{ text: "Last reached", strong: true }, { text: ` · ${when}` }] });
  }

  const streak = getPrayedDayStreak(person, todayISO);
  if (streak >= 2) {
    const pronoun = person.gender === "f" ? "her" : person.gender === "m" ? "him" : "them";
    rows.push({
      key: "streak",
      segments: [{ text: `Prayed for ${pronoun} ` }, { text: `${streak} days running`, strong: true }],
    });
  }

  const note = person.prayerNote?.trim();
  if (note) {
    rows.push({ key: "note", segments: [{ text: "Last note", strong: true }, { text: ` · ${note}` }] });
  }

  return rows;
}
