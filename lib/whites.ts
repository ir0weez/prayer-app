/**
 * v294 — The whites, computed exactly to Jonathan's settled structure
 * (his rulings, Oct 25–27, copied from his own app's behaviour):
 *
 * - The window is 05:00–24:00 (he settled 5 AM–midnight: "Sometimes
 *   people's days start at 5").
 * - Only UNCOMPLETED timed items block time — checking an item off frees
 *   its time and the whites grow back.
 * - A todo blocks at most 30 minutes.
 * - Free gaps split into blocks of 30 / 60 / 90: 30–59 minutes is one
 *   30 block; 60+ becomes 60-blocks with a trailing 30–59 remainder
 *   ABSORBED into the last block (so a 90 is 60+30 — never free-standing);
 *   gaps under 30 minutes yield nothing.
 * - On today, any block with less than 15 minutes remaining is DROPPED
 *   outright — no trimming, no countdown.
 *
 * Pure and synchronous: the schedule tab feeds it the day's items and
 * renders the result; tests pin every rule above.
 */

import { minutesToTime, timeToMinutes, type TimeBlock } from "./time-blocks";

export const WHITES_WINDOW_START = "05:00";
export const WHITES_WINDOW_END = "24:00";
export const WHITES_MIN_REMAINING_MINUTES = 15;
export const TODO_BLOCK_MAX_MINUTES = 30;

export type WhiteSourceItem = {
  startTime?: string;
  endTime?: string;
  isCompleted?: boolean;
  /** Todos cap at 30 minutes; everything else blocks its full span. */
  kind?: "todo" | "event" | "ministry" | "study";
};

type Span = { start: number; end: number };

function itemSpan(item: WhiteSourceItem): Span | null {
  if (!item.startTime || item.isCompleted) return null;
  const start = timeToMinutes(item.startTime);
  let end = item.endTime ? timeToMinutes(item.endTime) : start + 60;
  if (item.kind === "todo") {
    // A todo blocks at most 30 minutes — an unset end means 30, and a
    // longer stated end is still capped at 30.
    end = Math.min(end, start + TODO_BLOCK_MAX_MINUTES);
    if (!item.endTime) end = start + TODO_BLOCK_MAX_MINUTES;
  }
  if (end <= start) end = start + 1;
  return { start, end };
}

/** Split one free gap (minutes) into 30 / 60 / 90 blocks, his way. */
export function splitGapMinutes(gapStart: number, gapEnd: number): Span[] {
  const total = gapEnd - gapStart;
  if (total < 30) return [];
  if (total < 60) return [{ start: gapStart, end: gapStart + 30 }];
  const chunks: Span[] = [];
  let cursor = gapStart;
  while (gapEnd - cursor >= 60) {
    let chunkEnd = cursor + 60;
    const remaining = gapEnd - chunkEnd;
    // A trailing 30–59 remainder is absorbed into this (last) block.
    if (remaining >= 30 && remaining < 60) chunkEnd = gapEnd;
    chunks.push({ start: cursor, end: chunkEnd });
    cursor = chunkEnd;
    if (cursor >= gapEnd) break;
  }
  return chunks;
}

/**
 * The day's white blocks, in order. `nowMinutes` is only consulted when
 * `isToday` — past and future days keep their full blocks.
 */
export function calculateWhites(
  items: WhiteSourceItem[],
  opts: { isToday: boolean; nowMinutes?: number | null } = { isToday: false },
): TimeBlock[] {
  const dayStart = timeToMinutes(WHITES_WINDOW_START);
  const dayEnd = timeToMinutes(WHITES_WINDOW_END);

  const spans = items
    .map(itemSpan)
    .filter((s): s is Span => s !== null)
    .sort((a, b) => a.start - b.start);

  const blocks: TimeBlock[] = [];
  let cursor = dayStart;
  const pushGap = (from: number, to: number) => {
    for (const chunk of splitGapMinutes(from, to)) {
      blocks.push({
        id: `gap-${chunk.start}-${chunk.end}`,
        startTime: minutesToTime(chunk.start),
        endTime: minutesToTime(chunk.end),
        durationMinutes: chunk.end - chunk.start,
        label: `${chunk.end - chunk.start}m`,
      });
    }
  };

  for (const span of spans) {
    if (span.start > cursor) pushGap(cursor, Math.min(span.start, dayEnd));
    cursor = Math.max(cursor, span.end);
    if (cursor >= dayEnd) break;
  }
  if (cursor < dayEnd) pushGap(cursor, dayEnd);

  if (opts.isToday && opts.nowMinutes != null) {
    const now = opts.nowMinutes;
    // Drop any block with less than 15 minutes remaining — the block is
    // never trimmed or counted down; it is simply gone.
    return blocks.filter((b) => timeToMinutes(b.endTime) - now >= WHITES_MIN_REMAINING_MINUTES);
  }
  return blocks;
}

/** True when "now" falls inside this white block. */
export function whiteBlockContainsNow(block: TimeBlock, nowMinutes?: number | null): boolean {
  return (
    nowMinutes != null &&
    timeToMinutes(block.startTime) <= nowMinutes &&
    nowMinutes < timeToMinutes(block.endTime)
  );
}

/**
 * Group hour-adjacent blocks into runs (one box per run, a row per block),
 * preserving order. Blocks are adjacent when one starts where the last ends.
 */
export function groupAdjacentWhites(blocks: TimeBlock[]): TimeBlock[][] {
  const groups: TimeBlock[][] = [];
  for (const block of blocks) {
    const last = groups[groups.length - 1];
    const lastBlock = last?.[last.length - 1];
    if (lastBlock && block.startTime === lastBlock.endTime) {
      last.push(block);
    } else {
      groups.push([block]);
    }
  }
  return groups;
}

/**
 * v314 — the CLAIMED blocks on a time-off day group by the same rule
 * (his ruling, Oct 28 14:35: "Time off blocks that are close to each
 * other should work the same as the white blocks… these two should be
 * connected to each other"). On a time-off day the day's white blocks
 * are claimed by the trip; consecutive claimed blocks (one ends where
 * the next starts) merge into ONE connected group — one outer box,
 * hairline dividers, each block still its own tap target opening the
 * Time Off page. Non-adjacent blocks stay separate. The rule is the
 * whites' rule, verbatim: adjacency is end == next start, order is
 * preserved, and the input is never mutated.
 */
export function groupAdjacentClaimed(blocks: TimeBlock[]): TimeBlock[][] {
  const groups: TimeBlock[][] = [];
  for (const block of blocks) {
    const last = groups[groups.length - 1];
    const lastBlock = last?.[last.length - 1];
    if (lastBlock && block.startTime === lastBlock.endTime) {
      last.push(block);
    } else {
      groups.push([block]);
    }
  }
  return groups;
}
