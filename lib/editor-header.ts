/**
 * v415 — editor header tap targets.
 *
 * Jonathan's report (Nov 2, with the New Ministry editor on
 * screen): "The save and x buttons on these are difficult to
 * hit. Almost as if they are just outside of tap zone."
 *
 * Diagnosis, in the code of every editor that wears the creator
 * furniture (X top-left, centred title, Save top-right): the
 * header Pressables wrapped ONLY their glyph — a bare 28px close
 * icon with no padding and no hitSlop is a 28×28dp target, and a
 * bare "Save" text at 16px is roughly 36×20dp. Both sit far
 * under the ~48dp a fingertip needs, so a press landing a few dp
 * off the glyph misses entirely — the button feels like it lives
 * just outside where your finger lands. The few headers that did
 * carry hitSlop carried too little of it (profile editor 8,
 * journal Write Page 10 on a 22px glyph — 40dp / 42dp effective).
 *
 * The fix is touch geometry only. These hitSlops grow each
 * header control's effective target to ≥48dp CENTRED on the
 * visible glyph/text. hitSlop never paints and never lays out,
 * so no glyph, size, position or colour on screen changes.
 *
 * The overlay checks came back clean and stay untouched: the
 * shared TopFade renders pointerEvents="none" in both branches
 * (components/top-fade.tsx), every editor here lives in a Modal
 * window above its page's fade anyway, and the settle wrappers
 * (PaperSettle / BitSettle) and AnchoredSheet's morph all rest
 * at identity transform, so nothing displaces a hit area from
 * its glyph at rest.
 */

/** For a glyph-only header X (icons run 22–28px across the
 *  editors): 13dp a side lifts even the 22px glyph to 48dp. */
export const EDITOR_HEADER_CLOSE_HITSLOP = {
  top: 13,
  bottom: 13,
  left: 13,
  right: 13,
} as const;

/** For a text-only header Save (bare text runs ~18–23dp tall
 *  across the editors): 15dp of vertical slop lands ≥48dp,
 *  centred on the word. */
export const EDITOR_HEADER_SAVE_HITSLOP = {
  top: 15,
  bottom: 15,
  left: 10,
  right: 10,
} as const;

/** For a header action that already wears a padded pill (the
 *  journal Write Page's Post, ~33dp tall with its own padding):
 *  8dp of vertical slop tops it up to ≥48dp. */
export const EDITOR_HEADER_PILL_HITSLOP = {
  top: 8,
  bottom: 8,
  left: 6,
  right: 6,
} as const;
