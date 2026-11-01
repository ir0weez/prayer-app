/**
 * v405 — the Up Next group's pure builder (extracted from the
 * schedule tab's listData so the rule is testable on its own).
 *
 * The rule, as settled in v298/v318 and extended here: Up Next
 * names the next timed items still ahead TODAY — the earliest
 * uncompleted timed item whose start is strictly in the future —
 * and carries the WHOLE same-start group, plus the progress
 * thread's anchor (the end of the timed item immediately before
 * the group, or the 5:00 AM window start when the group leads
 * the day; an item with no end anchors on its start).
 *
 * v405: TIME-OFF ITINERARY entries join the candidate pool. A
 * timed, not-done itinerary entry (a 12:00 "Lunch" on a trip day)
 * is a real event in his day and must be able to BE what is up
 * next — before v405 the pool held only todos / events /
 * ministries, so a 5:30 PM Gas event outranked a 12:00 PM lunch
 * that was never even considered. Untimed entries and claimed
 * white blocks are not events and never enter the pool (the tab
 * only hands timed, undone entries in).
 */

export type UpNextKind = 'todo' | 'event' | 'ministry' | 'itinerary';

export interface UpNextItem {
  id: string;
  title: string;
  /** "HH:mm" 24-hour, the schedule's stored shape. */
  startTime: string;
  endTime?: string;
  /** The row's lead colour: the item's own colour where it has
   * one; an itinerary candidate arrives already carrying its
   * kind colour (itineraryKindColor over the trip colour). */
  color?: string | null;
  /** Itinerary candidates only: the stored entry + its trip, so
   * the row can render the kind tile/label and toggle the entry
   * through the itinerary handler (no XP rides an itinerary). */
  entry?: unknown;
  timeOff?: unknown;
}

export interface UpNextCandidate {
  kind: UpNextKind;
  item: UpNextItem;
}

export interface UpNextGroup {
  /** Every candidate sharing the earliest upcoming start. */
  entries: UpNextCandidate[];
  startMinutes: number;
  anchorMinutes: number;
}

/** "HH:mm" → minutes since midnight (the schedule's own math:
 * an unparseable time reads as 0, matching lib/time-blocks). */
export function upNextMinutes(time: string): number {
  const parts = String(time ?? '').trim().split(':');
  if (parts.length !== 2) return 0;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

/**
 * Build the Up Next group from today's candidates.
 *
 * @param candidates  timed, uncompleted items of every kind
 *   (todos / events / ministries / itinerary), already filtered
 *   by the caller to the kinds' own completion rules.
 * @param allTimed    EVERY timed item of the day (any state) —
 *   the anchor scan reads the item immediately before the group
 *   from this list, so a completed 11:00 still anchors a 12:00.
 * @param nowMin      minutes since midnight, now.
 * @returns the group, or null when nothing timed remains today.
 */
export function buildUpNextGroup(
  candidates: readonly UpNextCandidate[],
  allTimed: readonly UpNextItem[],
  nowMin: number,
): UpNextGroup | null {
  const upcoming = candidates
    .filter((c) => c.item.startTime && upNextMinutes(c.item.startTime) > nowMin)
    .slice()
    .sort((a, b) => upNextMinutes(a.item.startTime) - upNextMinutes(b.item.startTime));
  const lead = upcoming[0];
  if (!lead) return null;
  const startMinutes = upNextMinutes(lead.item.startTime);
  const entries = upcoming.filter((c) => upNextMinutes(c.item.startTime) === startMinutes);
  let anchorMinutes = 5 * 60;
  for (const it of allTimed) {
    if (!it.startTime) continue;
    const s = upNextMinutes(it.startTime);
    if (s >= startMinutes) continue;
    const e = it.endTime ? upNextMinutes(it.endTime) : s;
    if (e > anchorMinutes && e <= startMinutes) anchorMinutes = e;
  }
  return { entries, startMinutes, anchorMinutes };
}
