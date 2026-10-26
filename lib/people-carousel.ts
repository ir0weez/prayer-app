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
