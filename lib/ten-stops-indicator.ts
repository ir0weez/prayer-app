// ─── Ten Stops indicator model (v507) ───────────────────────────────────────
// The chapter-level face of a Ten Stops tour (Jonathan's picked
// blend, 2026-11-11 — "I like it"): Concept 3's TOUR ROUTE strip
// across the top of the chapter + Concept 2's MARGIN MARKER at the
// stop's passage, drawn in the book's own v420 colours. This module
// is the pure model both surfaces read: which stop lives in which
// chapter, where the reader stands on the route, and which passage
// rows the marker wraps. Everything derives from the registry's
// own movements (lib/ten-stops.ts — his titles, his passages, the
// transcript's start times); nothing here invents a stop, a time,
// or a range.
//
// THE CHAPTER-LIST DISC — A NAMED DEVIATION, not a silent swap:
// the approved drawing seats a stop disc on the RIGHT of each
// chapter ROW on the book page. The app's book page has no chapter
// rows — its chapter list is the v311 numbered grid (rows of five
// cells, his own approved design), and a stop-number disc inside a
// chapter-number cell would resurrect the exact confusion he
// flagged on the v1 drawing (two numbers, one seat). The disc as
// drawn cannot be seated without replacing his grid, so v507
// builds the route strip and the margin marker (whose discs ARE
// the same doors, in the reading itself) and leaves the book page
// byte-identical. The mapping the disc would have carried — which
// chapters hold which stop numbers — is pinned here and in the
// v507 tests, ready if the grid ever becomes rows.

import { mix } from './color-themes';
import type { TenStops } from './ten-stops';

/** One stop, resolved to the chapter and verses it anchors. */
export interface TenStopMark {
  /** 1-based stop number — the number every disc carries. */
  stop: number;
  /** His title for the stop ("Power In the Blood"). */
  title: string;
  /** The registry's passage string ("Hebrews 9:15-22"). */
  passage: string;
  chapter: number;
  startVerse: number;
  endVerse: number;
  /** The second the stop begins in the tour audio (v506). */
  startSec: number;
  /** The passage as the route caption shows it: "9:15–22", or
   * "10:23" for a single-verse stop. */
  rangeLabel: string;
}

/**
 * Parse a registry passage ("Hebrews 9:15-22", "Hebrews 10:23",
 * "1 John 2:3-4") to its chapter and verse span. The chapter:verse
 * group is the LAST colon group in the string, so a book name
 * carrying its own numeral ("1 John") can never be mistaken for
 * the chapter. A single-verse passage ends where it starts.
 * Returns null for a passage that does not parse — the indicator
 * renders nothing for a stop it cannot place, never a guess.
 */
export function parseTenStopPassage(
  passage: string,
): { chapter: number; startVerse: number; endVerse: number } | null {
  const m = /(\d+):(\d+)(?:-(\d+))?\s*$/.exec(passage.trim());
  if (!m) return null;
  const chapter = parseInt(m[1], 10);
  const startVerse = parseInt(m[2], 10);
  const endVerse = m[3] ? parseInt(m[3], 10) : startVerse;
  if (!(chapter > 0) || !(startVerse > 0) || endVerse < startVerse) return null;
  return { chapter, startVerse, endVerse };
}

/** "{chapter}:{start}–{end}" — the route caption's range, with the
 * drawing's en dash; a single verse stands alone. */
function rangeLabelFor(chapter: number, startVerse: number, endVerse: number): string {
  return startVerse === endVerse
    ? `${chapter}:${startVerse}`
    : `${chapter}:${startVerse}–${endVerse}`;
}

/** Every stop of a tour, resolved to its chapter and verses, in
 * tour order. Stops whose passages do not parse are dropped — the
 * registry's real tours all parse; the drop is a guard, not a
 * filter anyone should ever see fire. */
export function tenStopMarks(entry: TenStops): TenStopMark[] {
  const out: TenStopMark[] = [];
  entry.movements.forEach((mv, i) => {
    if (!mv.passage) return;
    const parsed = parseTenStopPassage(mv.passage);
    if (!parsed) return;
    out.push({
      stop: i + 1,
      title: mv.title,
      passage: mv.passage,
      chapter: parsed.chapter,
      startVerse: parsed.startVerse,
      endVerse: parsed.endVerse,
      startSec: mv.startSec,
      rangeLabel: rangeLabelFor(parsed.chapter, parsed.startVerse, parsed.endVerse),
    });
  });
  return out;
}

/** Chapter → its stop. This is the mapping the chapter-list disc
 * would carry (Hebrews: ch 9 → Stop 6, never a second 9). A
 * chapter holds at most one stop in every real tour; if a future
 * registry ever seated two in one chapter, the first in tour
 * order is the chapter's mark. */
export function tenStopChapterMap(entry: TenStops): Map<number, TenStopMark> {
  const map = new Map<number, TenStopMark>();
  for (const mark of tenStopMarks(entry)) {
    if (!map.has(mark.chapter)) map.set(mark.chapter, mark);
  }
  return map;
}

/** The stop anchored in a chapter, or null — most chapters of a
 * toured book hold no stop, and every chapter of an untoured book
 * is answered by there being no entry at all. */
export function stopMarkForChapter(entry: TenStops, chapter: number): TenStopMark | null {
  return tenStopChapterMap(entry).get(chapter) ?? null;
}

/** Every stop anchored in a chapter (tour order). One for every
 * real tour; the list form lets the marker seat each stop a
 * chapter might ever hold. */
export function stopMarksForChapter(entry: TenStops, chapter: number): TenStopMark[] {
  return tenStopMarks(entry).filter((m) => m.chapter === chapter);
}

// ─── The route strip ────────────────────────────────────────────────────────

export type RouteStopState = 'done' | 'now' | 'ahead';

/** Where a stop stands from the chapter being read: a stop in an
 * earlier chapter is behind the reader, this chapter's stop is
 * the one being read, a later chapter's stop is still ahead. */
export function routeStopState(mark: TenStopMark, chapter: number): RouteStopState {
  if (mark.chapter < chapter) return 'done';
  if (mark.chapter === chapter) return 'now';
  return 'ahead';
}

/** How many stops sit in chapters before this one — the caption's
 * "behind you" count. */
export function stopsBehindCount(entry: TenStops, chapter: number): number {
  return tenStopMarks(entry).filter((m) => m.chapter < chapter).length;
}

/** "{n} stops behind you" — the drawing's left caption, exactly;
 * the singular is "1 stop behind you". */
export function routeBehindLabel(entry: TenStops, chapter: number): string {
  const n = stopsBehindCount(entry, chapter);
  return n === 1 ? '1 stop behind you' : `${n} stops behind you`;
}

/** "STOP 6 · 9:15–22" — the drawing's right caption, naming THIS
 * chapter's stop. A chapter with no stop has no right caption. */
export function routeHereLabel(mark: TenStopMark): string {
  return `STOP ${mark.stop} · ${mark.rangeLabel}`;
}

/**
 * The strip's mid tones, derived from the book's primary the way
 * the drawing's violet steps sit from Hebrews' #7B1FA2 (its done
 * fill #B98AD1, its segment #D9BFE9, its waiting numeral #8E4FB5
 * are that primary mixed toward white at roughly .48 / .72 / .19).
 * Deriving — never pinning the violet values — is what lets every
 * book's route wear its own colour (Genesis red, Joshua orange…).
 */
export interface TenStopIndicatorTones {
  /** Done dots' fill and border; travelled segments. */
  mid: string;
  /** Untravelled segments. */
  seg: string;
  /** The waiting dots' numerals. */
  dotText: string;
}

export function tenStopIndicatorTones(primary: string): TenStopIndicatorTones {
  return {
    mid: mix(primary, '#FFFFFF', 0.48),
    seg: mix(primary, '#FFFFFF', 0.72),
    dotText: mix(primary, '#FFFFFF', 0.19),
  };
}

// ─── The margin marker ──────────────────────────────────────────────────────

/**
 * A marked passage's rows, by role: the FIRST row the stop's range
 * touches carries the disc and the head ('head'), the LAST carries
 * the rail's foot ('tail'), rows between carry the rail through
 * ('body'), and a passage of one row is 'single' — disc, head, and
 * the whole rail on the one row. Hebrews 10's stop is the standing
 * example: the range is verse 23 alone, and his own entry for
 * 23–23 is the single marked row, mid-chapter.
 */
export type StopMarkRole = 'head' | 'body' | 'tail' | 'single';

/**
 * Assign marker roles over a chapter's rendered passage rows.
 * `spans` are the rows in render order, each the verse span its
 * passage actually renders (a folded lead-in row spans its leads
 * plus its host entry). A row is marked when its span INTERSECTS
 * the stop's verse range — his note sections align to the ranges,
 * so the marked rows are exactly his section's entries (Hebrews 9:
 * 15–15 head, 16–17 body, 18–22 tail). Returns row index → role;
 * an empty map when no row touches the range (the marker simply
 * never renders — nothing is forced onto a passage it can't find).
 */
export function stopMarkRoles(
  spans: readonly { start: number; end: number }[],
  mark: TenStopMark,
): Map<number, StopMarkRole> {
  const hit: number[] = [];
  spans.forEach((s, i) => {
    if (s.start <= mark.endVerse && s.end >= mark.startVerse) hit.push(i);
  });
  const out = new Map<number, StopMarkRole>();
  if (hit.length === 0) return out;
  if (hit.length === 1) {
    out.set(hit[0], 'single');
    return out;
  }
  hit.forEach((rowIdx, k) => {
    out.set(rowIdx, k === 0 ? 'head' : k === hit.length - 1 ? 'tail' : 'body');
  });
  return out;
}
