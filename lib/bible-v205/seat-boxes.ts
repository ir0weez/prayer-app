// ─── v418 seat placement — a box takes its highlight's seat ─────────────────
// Jonathan's ruling (Nov 2, with the Studio's pass -59 as the model
// and a phone screenshot of 1 John 2 as the evidence): when a box's
// whole text IS a highlighted run inside his main note, the reader
// seats the box in the paragraph at the run — the paragraph splits
// around it — instead of stacking the box as a card at the end of
// the note. The proofs are the desk's strict ones, in the phone's
// own terms:
//
//  · HOST — a block that renders as plain prose: kind 'para' with
//    no category. (In the reader the host ENTRY is the display
//    entry whose blocks render in the "With notes" body; its para
//    blocks are the prose. A categorized para is itself a box, and
//    scripture is never a host.)
//  · BOX — a block wearing a box dress: kind 'highlight' (his
//    Highlight), kind 'thought' (Main Thought), or a para/note
//    block categorized definition / quote / personal-story. Kind
//    'quote' is NEVER a box (Someone said keeps its own seat), and
//    a good-thought para is not in the seat set either — the set is
//    the Studio's five stack kinds, no more.
//  · ORDER — the box block stands AFTER the host block in the
//    entry's blocks array (the desk's "host renders before box";
//    on the phone the box and its host prose live in the one
//    entry the marks record addresses, so containment of spans is
//    the entry itself).
//  · THE ITEM — the marks record for the entry's span (read back
//    through blockHighlightsFor, surface 'blocks') holds a phrase
//    range that names the host block by index, fits the block's
//    STRIPPED length (fmt-text.ts — every offset is a stripped
//    coordinate), and is not already claimed by an earlier box.
//    Ownership is structural: the range is read through the one
//    record the rendered blocks address, at the block's own index.
//  · THE WORDS — stripFmtText(box text) equals the run
//    stripFmtText(host text).slice(start, end), exactly or after
//    trimming both.
//
// Anything less proved seats nothing: the box renders as its own
// card, exactly as before — a box can never vanish. Pure and
// deterministic; the renderer (blocks.tsx SeatedBlockView) does
// the cutting, this module only decides.

import { blockCategory } from './categories';
import { stripFmtText } from './fmt-text';
import type { PhraseHighlight } from './marks';
import type { V205Block } from './types';

export interface SeatPlacement {
  /** Index of the box block in the entry's blocks array. */
  boxIndex: number;
  /** Index of the host para block in the same array. */
  hostIndex: number;
  /** The claimed run's start in the host block's STRIPPED text. */
  start: number;
  /** The claimed run's end (exclusive), same coordinates. */
  end: number;
}

/** A block that can host a seat: plain prose — a para with no
 * category (a categorized para wears a box dress itself). */
export function isSeatHostBlock(block: V205Block): boolean {
  return block.kind === 'para' && blockCategory(block) === null;
}

/** A block that can take a seat: the Studio's five stack kinds in
 * the phone's block shapes. Kind 'quote' (Someone said) is
 * excluded by construction — it is not in either branch. */
export function isSeatBoxBlock(block: V205Block): boolean {
  if (block.kind === 'highlight' || block.kind === 'thought') return true;
  if (block.kind === 'para' || block.kind === 'note') {
    const cat = blockCategory(block);
    return cat === 'definition' || cat === 'quote' || cat === 'personal-story';
  }
  return false;
}

/**
 * The seat placements for one entry's blocks. `itemsForBlock`
 * reads the stored phrase ranges addressed to a block index (the
 * reader's blockHighlightsFor against the entry's block-span
 * record). Boxes are considered in block order, hosts in block
 * order before them, ranges in stored order; each range seats at
 * most one box and each box takes at most one seat.
 */
export function computeSeatPlacements(
  blocks: readonly V205Block[],
  itemsForBlock: (blockIndex: number) => readonly PhraseHighlight[],
): SeatPlacement[] {
  const placements: SeatPlacement[] = [];
  const claimed = new Set<string>();
  const strippedCache = new Map<number, string>();
  const strippedOf = (idx: number): string => {
    const hit = strippedCache.get(idx);
    if (hit !== undefined) return hit;
    const text = stripFmtText(blocks[idx].text);
    strippedCache.set(idx, text);
    return text;
  };
  const itemsCache = new Map<number, readonly PhraseHighlight[]>();
  const itemsOf = (idx: number): readonly PhraseHighlight[] => {
    const hit = itemsCache.get(idx);
    if (hit !== undefined) return hit;
    const items = itemsForBlock(idx);
    itemsCache.set(idx, items);
    return items;
  };

  for (let boxIndex = 0; boxIndex < blocks.length; boxIndex++) {
    const box = blocks[boxIndex];
    if (!isSeatBoxBlock(box)) continue;
    const boxText = stripFmtText(box.text);
    if (!boxText.trim()) continue;
    let seated = false;
    for (let hostIndex = 0; hostIndex < boxIndex && !seated; hostIndex++) {
      const host = blocks[hostIndex];
      if (!isSeatHostBlock(host)) continue;
      const hostText = strippedOf(hostIndex);
      const items = itemsOf(hostIndex);
      for (let n = 0; n < items.length; n++) {
        const item = items[n];
        const claimKey = `${hostIndex}:${n}`;
        if (claimed.has(claimKey)) continue;
        if (!(item.start >= 0 && item.end > item.start && item.end <= hostText.length)) continue;
        const run = hostText.slice(item.start, item.end);
        if (run !== boxText && run.trim() !== boxText.trim()) continue;
        claimed.add(claimKey);
        placements.push({ boxIndex, hostIndex, start: item.start, end: item.end });
        seated = true;
        break;
      }
    }
  }
  return placements;
}
