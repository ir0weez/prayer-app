// ─── v334: the top fade's pure core ─────────────────────────────────
// The gradient math for components/top-fade.tsx, kept free of any
// React Native import so it can be pinned in tests. See the
// component for the ruling and the design.

/** The fade's standing height — the dissolve zone at a page's top.
 *  v342: 120px (was 84) — his second "still a bar" report asked for
 *  a gentler, taller dissolve on the main tab screens. */
export const TOP_FADE_HEIGHT = 120;

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
 */
export function topFadeStripOpacityAt(
  yPx: number,
  trayInsetPx: number,
  dissolveHeightPx: number = TOP_FADE_HEIGHT,
): number {
  if (yPx < trayInsetPx) return 1;
  return topFadeOpacityAt((yPx - trayInsetPx) / dissolveHeightPx);
}

/**
 * v338 — the SCROLL LINK (Jonathan's correction of v334, Oct 29
 * 09:47 + 10:42): the fade as a whole is a function of the page's
 * own scroll offset. At rest (scrollY = 0) its opacity is 0 —
 * NOTHING is painted over the header, so titles render crisp the
 * moment the app opens ("I don't want that fade to be there
 * until I scroll"). It ramps in linearly over roughly the fade's
 * own height — by the time content has scrolled one fade-height
 * under the top edge, the dissolve is at full strength — and
 * scrolling back to the top returns it to exactly 0. No static
 * gradient block remains: the strips render only as this ramp
 * lets them.
 */
export function topFadeRampOpacity(scrollY: number, height: number = TOP_FADE_HEIGHT): number {
  if (!(height > 0)) return 0;
  const t = scrollY / height;
  return t <= 0 ? 0 : t >= 1 ? 1 : t;
}
