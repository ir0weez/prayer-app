// ─── v334: the top fade's pure core ─────────────────────────────────
// The gradient math for components/top-fade.tsx, kept free of any
// React Native import so it can be pinned in tests. See the
// component for the ruling and the design.

/** The fade's standing height — roughly the header zone of a page. */
export const TOP_FADE_HEIGHT = 84;

/**
 * The gradient's stops for a page background colour: full strength
 * at the very top edge (content is fully dissolved there), a soft
 * shoulder through the middle, and nothing at the bottom edge, so
 * content below the fade zone is untouched. Every stop restates
 * the SAME derived colour — only the opacity falls.
 */
export function topFadeStops(color: string) {
  return [
    { offset: "0", stopColor: color, stopOpacity: 1 },
    { offset: "0.45", stopColor: color, stopOpacity: 0.42 },
    { offset: "1", stopColor: color, stopOpacity: 0 },
  ];
}

/**
 * The same curve as a function: the fade's opacity at t (0 = the
 * top edge, 1 = the bottom edge), piecewise-linear through the
 * stops above. The component samples this to paint its strips.
 */
export function topFadeOpacityAt(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  if (clamped <= 0.45) return 1 + (0.42 - 1) * (clamped / 0.45);
  return 0.42 * (1 - (clamped - 0.45) / 0.55);
}
