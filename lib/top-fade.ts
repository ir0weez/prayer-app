// ─── v334: the top fade's pure core ─────────────────────────────────
// The gradient math for components/top-fade.tsx, kept free of any
// React Native import so it can be pinned in tests. See the
// component for the ruling and the design.

/** The fade's standing height — the dissolve zone at a page's top.
 *  v342: 120px (was 84) — his second "still a bar" report asked for
 *  a gentler, taller dissolve on the main tab screens. */
export const TOP_FADE_HEIGHT = 120;

/** v347: the SCROLL RAMP's distance — how far the page scrolls
 *  before the fade reaches full strength. Deliberately NOT the
 *  dissolve height any more (it was TOP_FADE_HEIGHT through
 *  v344): the measured cause of the surviving "bar" (pixel-
 *  verified against his v344 screenshots 10955/10956) is that
 *  scrolling content is CLIPPED DEAD at the FlatList viewport's
 *  top edge, and under the old ramp a glyph reached that edge
 *  only ~28% dissolved (34dp of scroll ÷ 120) and was sliced at
 *  the line. At 16px the ramp is essentially complete before
 *  anything reaches the edge, so the clip has nothing left to
 *  slice. Still exactly 0 at rest (scrollY = 0). */
export const TOP_FADE_RAMP_PX = 16;

/** v347 AMENDMENT (Jonathan's clarification, Oct 29 16:47: "the
 *  words still scroll and are visible in the notification tray,
 *  just really faded"): the fade's alpha NEVER reaches 1 over
 *  the tray zone. At full ramp the tray zone sits at this cap —
 *  heavy enough that the tray's clock and icons stay readable
 *  against it, light enough that dark content scrolling beneath
 *  ghosts through faintly instead of being dissolved to nothing
 *  or sliced at the tray's bottom edge. Applied as a ceiling on
 *  the strip paint (topFadeStripOpacityAt): the only alphas it
 *  touches are those above the cap, which on screen occur only
 *  in the tray zone; the sub-tray dissolve eases to 0 over
 *  TOP_FADE_HEIGHT exactly as before. */
export const TOP_FADE_TRAY_CAP = 0.88;

/**
 * The gradient's stops for a page background colour: full strength
 * ONLY at the very top edge (content is fully dissolved there),
 * an eighth by halfway, and nothing at the bottom edge, so content
 * below the fade zone is untouched. Every stop restates the SAME
 * derived colour — only the opacity falls.
 *
 * v342 SHAPE (Jonathan's rulings, Oct 29 13:09 + 14:52, on his
 * People screenshots: "there's still a bar at the top... can it
 * just be a fade?" — reported twice): NO bar, no band, no plateau
 * at any scroll position — a pure dissolve. The v334 curve fell
 * 1 → 0.42 across the top 45%: a long, shallow, near-opaque
 * shoulder that read as a band with a soft bottom edge. The stops
 * below sample the cubic ease-out in topFadeOpacityAt — falling
 * steeply from the first pixel (no near-solid run), landing at
 * zero with zero slope (no bottom seam).
 */
export function topFadeStops(color: string) {
  return [
    { offset: "0", stopColor: color, stopOpacity: 1 },
    { offset: "0.5", stopColor: color, stopOpacity: 0.125 },
    { offset: "1", stopColor: color, stopOpacity: 0 },
  ];
}

/**
 * The same curve as a function: the fade's opacity at t (0 = the
 * top edge, 1 = the bottom edge). v342: a cubic ease-out, (1 − t)³
 * — 1 at the top edge, ~0.42 a quarter down, 0.125 halfway, 0 at
 * the bottom, strictly falling with no plateau and no near-solid
 * run (his acceptance properties, pinned in top-fade-v334).
 */
export function topFadeOpacityAt(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  const u = 1 - clamped;
  return u * u * u;
}

/**
 * v342 EDGE-TO-EDGE (Jonathan's fix direction, Oct 29 14:54: "I
 * don't mind the screen rolling under the notification tray and
 * around the camera. As long as the notifications are readable
 * because of the fade."): on the screens that keep the fade, the
 * overlay anchors at the screen's literal top (y = 0) and covers
 * the tray zone at FULL strength — that part reads as the tray's
 * own backing, keeping the tray icons readable over whatever
 * scrolls beneath (worst case: the red emergency card under the
 * tray on People) — and only below the tray does the cubic
 * dissolve run. The opacity at a pixel y of the whole overlay:
 * 1 across the tray zone, then topFadeOpacityAt over the
 * dissolve. The junction is continuous (the cubic starts at 1),
 * so there is no step or second edge anywhere.
 *
 * v347 AMENDMENT (his clarification, Oct 29 16:47): "full
 * strength" is now the TOP_FADE_TRAY_CAP (0.88), never 1 — the
 * words must stay faintly VISIBLE in the tray, ghosting
 * through, not dissolved to nothing.
 *
 * v344: this function still describes the overlay's OWN paint,
 * in overlay coordinates — but the component now RAISES the
 * whole overlay by the tray height (topFadeOverlayTopPx), so
 * the tray zone painted here never appears on screen; see
 * topFadeScreenOpacityAt for the visible window.
 */
export function topFadeStripOpacityAt(
  yPx: number,
  trayInsetPx: number,
  dissolveHeightPx: number = TOP_FADE_HEIGHT,
): number {
  const raw = yPx < trayInsetPx ? 1 : topFadeOpacityAt((yPx - trayInsetPx) / dissolveHeightPx);
  // v347 amendment: the tray cap — the paint never goes fully
  // opaque, so content ghosts through the tray zone (see
  // TOP_FADE_TRAY_CAP). Through v344 this returned the raw
  // curve (plate and junction at 1).
  return Math.min(raw, TOP_FADE_TRAY_CAP);
}

/**
 * v344 — THE RAISE (Jonathan's own prescription, Oct 29 15:50:
 * "Just raise the fade up, so the bar is out of the screen…
 * Can't that be done?" — and his correction of the diagnosis's
 * premise, 16:00: the screenshots were taken MID-SCROLL,
 * deliberately, to show where "the box" is — the complaint was
 * never an at-rest seat). In its v342 placement the overlay's
 * tray plate sat ON screen: a constant-alpha slab whose hard
 * bottom edge cut words as they passed under it mid-scroll. The
 * plate's paint is not the problem; its on-screen position is.
 * So the whole overlay shifts UP by the tray-zone height: the
 * plate occupies screen positions [−trayInset, 0) — entirely
 * above the screen's top edge, out of the screen — and the
 * visible window shows only the dissolving portion of the
 * curve, at every scroll offset.
 */
export function topFadeOverlayTopPx(trayInsetPx: number): number {
  return trayInsetPx === 0 ? 0 : -trayInsetPx;
}

/**
 * The alpha VISIBLE at a screen position yPx (0 = the screen's
 * top edge) under the raised overlay: the screen position maps
 * into the overlay's own paint at yPx + trayInsetPx, which for
 * every on-screen position lands inside the dissolve — so over
 * the visible window this is exactly the cubic: full strength
 * only at the edge point itself, strictly falling from the
 * first pixel, no constant-alpha region and no step anywhere
 * on screen. Words passing under it fade; they are never cut
 * by a line.
 */
export function topFadeScreenOpacityAt(
  yPx: number,
  trayInsetPx: number,
  dissolveHeightPx: number = TOP_FADE_HEIGHT,
): number {
  return topFadeStripOpacityAt(yPx + trayInsetPx, trayInsetPx, dissolveHeightPx);
}

/**
 * v338 — the SCROLL LINK (Jonathan's correction of v334, Oct 29
 * 09:47 + 10:42): the fade as a whole is a function of the page's
 * own scroll offset. At rest (scrollY = 0) its opacity is 0 —
 * NOTHING is painted over the header, so titles render crisp the
 * moment the app opens ("I don't want that fade to be there
 * until I scroll"). It ramps in linearly with scroll, and
 * scrolling back to the top returns it to exactly 0. No static
 * gradient block remains: the strips render only as this ramp
 * lets them.
 *
 * v347: the ramp's distance is TOP_FADE_RAMP_PX (16), NOT the
 * fade's height — see that constant for the measured reason
 * (content is clipped at the viewport's top edge and must be
 * ~fully dissolved before it gets there). Through v344 this
 * distance was the fade height (120).
 */
export function topFadeRampOpacity(scrollY: number, rampPx: number = TOP_FADE_RAMP_PX): number {
  if (!(rampPx > 0)) return 0;
  const t = scrollY / rampPx;
  return t <= 0 ? 0 : t >= 1 ? 1 : t;
}
