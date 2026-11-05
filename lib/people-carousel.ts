// ─── v256 — the front-door carousels' pure logic ───────────────────────
// Jonathan's addition (Oct 25 21:21): when more than one emergency
// or praise is live, its card PAGES — swipe to move between them,
// and the pages cycle on their own while he is looking at the page.
// The cycling is a foreground UI behavior only: it reads no data,
// settles no state, and stops the moment the screen loses focus or
// he touches the card. These helpers are the whole of its logic so
// the gating can be pinned without a device.

/** How long an untouched, focused carousel waits between pages. */
export const CAROUSEL_AUTO_ADVANCE_MS = 5000;
/** After any touch or swipe, cycling stays paused this long. */
export const CAROUSEL_RESUME_MS = 15000;

/** The next page, wrapping at the end; a lone page never moves. */
export function nextPageIndex(index: number, count: number): number {
  if (count <= 1) return 0;
  return (index + 1) % count;
}

/** The previous page, wrapping at the start. */
export function prevPageIndex(index: number, count: number): number {
  if (count <= 1) return 0;
  return (index - 1 + count) % count;
}

/**
 * Whether the auto-cycle may run at all: more than one page, the
 * People screen focused, and motion allowed. Reduced motion stops
 * the cycling entirely (pages then change only by swipe, instantly).
 */
export function shouldAutoAdvance(input: { count: number; focused: boolean; reducedMotion: boolean }): boolean {
  return input.count > 1 && input.focused && !input.reducedMotion;
}

/** Whether a touch pause is still in force at `now`. */
export function isCarouselPaused(pausedUntil: number, now: number): boolean {
  return now < pausedUntil;
}

// ─── v434 — the carousel peek's geometry (Jonathan's pick, Nov 4) ────
// The pages stop fading (v256's fade-and-settle read as the card
// dissolving — he rejected it, and fade-through / shared-axis /
// crossfade after it) and become the Material 3 carousel: solid
// cards on a track, each slot narrower than the viewport so the
// NEXT page's edge always peeks in. These helpers are the whole of
// the track math so the slide and the wrap can be pinned without a
// device.

/** With more than one page, a page slot takes this share of the
 *  carousel's width — the rest is the next page's peek. A lone page
 *  takes the full width: the static card exactly as drawn (v256). */
export const CAROUSEL_PEEK_FRACTION = 0.88;
/** The gap between page slots on the track, in px. */
export const CAROUSEL_PAGE_GAP_PX = 12;
/** One page slide on the track, in ms — an M3 spatial transition,
 *  run on the emphasized curve (cubic-bezier(0.2, 0, 0, 1), the
 *  PEOPLE_ENTRANCE_EASING the component already rides). */
export const CAROUSEL_SLIDE_DURATION_MS = 450;

/** The width one page slot occupies on the track. */
export function carouselSlotWidth(containerWidth: number, count: number): number {
  if (containerWidth <= 0) return 0;
  return count > 1 ? containerWidth * CAROUSEL_PEEK_FRACTION : containerWidth;
}

/** The distance between the resting offsets of neighbouring slots:
 *  one slot plus the gap (a lone page has no neighbour). */
export function carouselStepPx(containerWidth: number, count: number): number {
  if (containerWidth <= 0) return 0;
  if (count <= 1) return carouselSlotWidth(containerWidth, count);
  return carouselSlotWidth(containerWidth, count) + CAROUSEL_PAGE_GAP_PX;
}

/**
 * Where a page rests on the track. With more than one page the
 * track carries a clone of the last page BEFORE page 0 and a clone
 * of page 0 AFTER the last page, so page i rests at track index
 * i + 1. A lone page rests at 0 — no clones, no track.
 */
export function trackIndexForPageIndex(pageIndex: number, count: number): number {
  if (count <= 1) return 0;
  return pageIndex + 1;
}

/** Which page a track index shows — a clone answers for the page
 *  it clones (slot 0 is the last page; slot count + 1 is page 0). */
export function pageIndexForTrackIndex(trackIndex: number, count: number): number {
  if (count <= 1) return 0;
  return (((trackIndex - 1) % count) + count) % count;
}

/** Whether a track index is one of the two clone slots. */
export function isCarouselCloneIndex(trackIndex: number, count: number): boolean {
  if (count <= 1) return false;
  return trackIndex === 0 || trackIndex === count + 1;
}

/**
 * Where the track parks after a slide: a slide may LAND on a clone
 * slot (that's the wrap — the clone shows the identical card), and
 * the track then jumps, with no animation, to the real page's
 * slot. The resting state is therefore never a clone and never an
 * intermediate index, and the jump is invisible because the clone
 * and the page are the same card one full loop apart. Real slots
 * rest as they are.
 */
export function restingTrackIndex(trackIndex: number, count: number): number {
  if (count <= 1) return 0;
  if (trackIndex === 0) return count;
  if (trackIndex === count + 1) return 1;
  return trackIndex;
}

/** The track's translateX for a track index — one step per slot. */
export function carouselTrackOffsetPx(trackIndex: number, containerWidth: number, count: number): number {
  const offset = -trackIndex * carouselStepPx(containerWidth, count);
  return offset === 0 ? 0 : offset; // never -0
}
