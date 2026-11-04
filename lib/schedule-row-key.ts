/**
 * v369 (Oct 30) — the day list's row keys, and the un-check slab.
 *
 * Jonathan's device report (Oct 30, 13:21): he accidentally checked
 * off the lunch EVENT, then un-checked it — and the card came back
 * as a solid slate-grey slab at full card height: no keyword
 * artwork, no title, no time. It stayed that way until he restarted
 * the app, which healed it.
 *
 * The trace: the data layer is innocent (toggleEventCompleted is a
 * pure map; the un-checked record is byte-identical to the
 * pre-check one), and the React tree is innocent (EventCardInner is
 * stateless and unmemoised — rendered with isCompleted:false it
 * returns the full card, artwork and words). What is NOT innocent
 * is the list cell: a completed row and its active self shared ONE
 * key, so the VirtualizedList cell was asked to transplant a
 * compact completed bar for a full artwork card (and back) IN
 * PLACE, while the row simultaneously jumped between the timed
 * flow and the end-of-day stack and the white blocks re-flowed
 * around it. On his device that transplant leaves the cell
 * painting a stale blank slab — the card's box with none of its
 * content — and only a full remount (the restart) heals it.
 *
 * The fix gives the two completion states two cell identities:
 * a completed entity row keys as `<id>-done`, its active self as
 * the bare `<id>`. Every check / un-check is then a clean unmount
 * of the old cell and a fresh mount of the new one — the restart's
 * healing, scoped to the one row. Nothing else changes: the
 * completed stack still forms from the same rows in the same
 * order, check-off is still a whole-card tap, and the cards
 * themselves are untouched.
 *
 * The shape is shared, so the cover is shared: events, Bible
 * studies, ministries and todos all render a compact completed
 * bar in the stack under the same item id as their full active
 * card in the flow (see the stack assembly in schedule-tab), so
 * all four take the `-done` key when completed. Rows whose data
 * carries no completion flag (white blocks, groups, headers,
 * dividers) keep their bare id.
 *
 * v428 (Nov 4) — the cover learns the itinerary wrapper. v393
 * (a day AFTER v369) gave the Time Off tickets a done flag, but
 * an itinerary row's data is not the item itself — it is the
 * wrapper { entry, timeOff }, and the flag lives at
 * data.entry.done, where this helper never looked. Done tickets
 * therefore kept the bare key and got exactly the in-place
 * transplant this file exists to forbid: the tap wrote the flag,
 * the cell wedged on the open pass, and the ticket read as
 * un-tappable on device ("once again"). v426's hour-blocking
 * widened the blast radius — completing an entry now re-flows
 * the whites around the row in the same moment. A done itinerary
 * entry takes the same `-done` split as every other entity.
 */
export function scheduleRowKey(
  item: { id: string; data?: unknown },
  justAddedId: string | null,
): string {
  const base = item.id === justAddedId ? `${item.id}-new` : item.id;
  const data = item.data as
    | { isCompleted?: unknown; entry?: { done?: unknown } | null }
    | null
    | undefined;
  if (data == null) return base;
  if (data.isCompleted === true) return `${base}-done`;
  // v428: an itinerary row's completion flag rides on its entry.
  if (data.entry != null && data.entry.done === true) return `${base}-done`;
  return base;
}
