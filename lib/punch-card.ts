// ─── v556 — the Punch Card's model ──────────────────────────────────
// The person page's punch card is a ticket for the CURRENT week:
// seven slots, Monday–Sunday, one per day, filled on the days this
// person was prayed for. It reads the SAME records THIS WEEK reads
// — the v279 prayedDates forward log plus lastPrayerCompletedDate,
// through buildWeekDots — so the card and the dots can never
// disagree, and a new week starts a fresh card exactly the way
// THIS WEEK does. No new storage and no new model of prayer marks:
// the card is a dress on facts the page already proves.

import { buildWeekDots, type WeekDot } from "@/lib/person-page-facts";

export interface PunchCardSlot {
  /** ISO day (YYYY-MM-DD) this slot stands for. */
  iso: string;
  /** Single-letter day label, Monday first (M T W T F S S). */
  label: string;
  /** The records prove this person was prayed for on this day. */
  filled: boolean;
  /** This slot is today — the only slot that can newly fill. */
  isToday: boolean;
}

export interface PunchCardModel {
  /** The seven slots of the current week, Monday first. */
  slots: PunchCardSlot[];
  /** How many slots are filled — the badge's numerator. */
  filledCount: number;
  /** Slots on a card. Always 7: the week is the card. */
  total: number;
  /** The badge's text, "n/7". */
  badgeLabel: string;
  /** Every day of the week prayed — the aim line becomes a door. */
  isFull: boolean;
  /** Index of today's slot in `slots` (−1 when the week is empty). */
  todayIndex: number;
}

/** The card's model from THIS WEEK's own dots. */
export function buildPunchCard(dots: WeekDot[]): PunchCardModel {
  const slots: PunchCardSlot[] = dots.map((dot) => ({
    iso: dot.iso,
    label: dot.label,
    filled: dot.filled,
    isToday: dot.isToday,
  }));
  const filledCount = slots.filter((slot) => slot.filled).length;
  return {
    slots,
    filledCount,
    total: slots.length,
    badgeLabel: `${filledCount}/${slots.length}`,
    isFull: slots.length > 0 && filledCount === slots.length,
    todayIndex: slots.findIndex((slot) => slot.isToday),
  };
}

/**
 * The card's model straight from a person's prayer records — the
 * one call the person page makes (through its weekDots) and the
 * tests pin. Same inputs, same week, same fills as THIS WEEK.
 */
export function buildPunchCardForWeek(
  prayedDates: string[] | undefined,
  lastPrayerCompletedDate: string | null | undefined,
  todayIso: string,
): PunchCardModel {
  return buildPunchCard(buildWeekDots(prayedDates, lastPrayerCompletedDate, todayIso));
}

/** The aim line's name: "Reach out to Eva" for "Eva Roberts". */
export function punchCardFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}
