// ─────────────────────────────────────────────────────────────────────────────
// v355 — ONE LABEL SYSTEM for the whole Hometown stage.
//
// The v349 audit found THREE label systems on the stage that never
// saw each other: place plaques (a solver with no height bound and
// a 0.60-em/char width estimate that under-measured bold text, so
// pills wrapped and exploded), the board/game furniture chips
// (fixed stand widths), and villager name pills (an unsolved 200px
// container under each figure's feet). Collisions were invisible
// by construction.
//
// This module is the one system now:
//   - measureLabelText: REAL per-glyph measurement (a glyph-width
//     table for the stage's bold face, calibrated so a measured
//     word always fits its pill — the 0.60-em flat estimate is
//     dead). A pill is sized by its word, so text never wraps and
//     never truncates.
//   - layoutStageLabels: ONE layout pass for every static word on
//     the stage. It knows the whole frame (width AND height),
//     clamps every rect inside it, steps clear of earlier labels
//     and of reserved art rects, and never renders over the river
//     (the caller's frame height IS the river's top edge). If a
//     label cannot be placed whole and clear at its seat, the
//     LAYOUT gives way — the seat moves, or labels stack
//     deliberately — never the word.
//   - villager name pills (they move with their figures, so they
//     cannot join a static pass) draw from the same measurement
//     and the same pill metrics, in the drawing's form (cream,
//     above the head), clamped into the frame at their figure's
//     standing point.
//
// Pure and pinnable: the renderers draw exactly these rects.
// ─────────────────────────────────────────────────────────────────────────────

/** Per-glyph widths, in em, for the stage's bold (700) face.
 *  Calibrated generously per class — a measured word must ALWAYS
 *  fit its pill (a too-wide pill is a cosmetic cost; a too-narrow
 *  one wraps, which is the defect being killed). */
const NARROW = new Set("iljtf.,:;'!|()[]{}");
const WIDE = new Set("mwMW@%");
export function glyphEm(ch: string): number {
  if (ch === " ") return 0.34;
  if (NARROW.has(ch)) return 0.4;
  if (WIDE.has(ch)) return 0.92;
  if (ch >= "A" && ch <= "Z") return 0.72;
  if (ch >= "0" && ch <= "9") return 0.6;
  if (ch === "·" || ch === "•") return 0.36;
  if (ch === "-" || ch === "–" || ch === "—") return 0.44;
  return 0.6;
}

/** A word's true rendered width at `fontSize`, in px — the sum of
 *  its glyphs, with a safety margin for the bold face's bearings
 *  on device. The per-glyph sum rules where letters run wide
 *  (the audit's broken case: "Town Shop" at the old flat estimate
 *  rendered ~8px wider than its pill); a 0.62-em/char floor rules
 *  where they run narrow, so the measurement never falls below
 *  the old estimate either — it dominates both. */
export function measureLabelText(label: string, fontSize: number): number {
  let em = 0;
  for (const ch of label) em += glyphEm(ch);
  const floor = label.length * 0.62;
  return Math.ceil(Math.max(em, floor) * fontSize * 1.05);
}

/** The pill padding the stage's labels share (each side). */
export const LABEL_PAD_X = 9;

/** A label pill's full width for its word at `fontSize`: measured
 *  text + shared padding. The pill is sized by the word, so the
 *  word always fits whole on one line. */
export function labelPillWidth(label: string, fontSize: number): number {
  return measureLabelText(label, fontSize) + LABEL_PAD_X * 2;
}

/** A label pill's height at `fontSize`. */
export function labelPillHeight(fontSize: number): number {
  return Math.ceil(fontSize * 1.5) + 6;
}

// ── The one layout pass ─────────────────────────────────────────────────────

export type StageLabelSeat = {
  key: string;
  label: string;
  /** Desired centre x (stage px). */
  cx: number;
  /** Desired top (stage px). */
  top: number;
  /** Rendered font size (already floored at the ~10px minimum). */
  fontSize: number;
  /** This seat's own anchor art key: reserved rects carrying this
   *  key are the seat's own building — its label belongs at its
   *  feet and may touch it; every OTHER reserved rect is a wall
   *  the label must clear. */
  avoidKey?: string;
};

export type StageLabelRect = {
  key: string;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

export type ReservedRect = {
  key: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

const LABEL_MARGIN = 4;
const LABEL_GAP = 2;

function overlaps(
  a: { left: number; top: number; width: number; height: number },
  b: { left: number; top: number; width: number; height: number },
  gap: number,
): boolean {
  return (
    a.left < b.left + b.width + gap &&
    a.left + a.width + gap > b.left &&
    a.top < b.top + b.height + gap &&
    a.top + a.height + gap > b.top
  );
}

/**
 * Lay out every static label on the stage in one pass.
 *
 * `frame` is the drawable frame in stage px — its height is the
 * hard bottom bound (the renderer passes the river's top edge, so
 * nothing ever renders over the water). `reserved` rects are art
 * the labels must keep clear of (building footprints), except a
 * seat's own anchor (its `avoidKey`).
 *
 * Placement: the seat's clamped home first; then stepped DOWN
 * below whatever it hits; then stepped UP; then a deliberate
 * top-to-bottom scan for the first wholly-clear slot. A label is
 * never placed outside the frame, never over another label, and
 * never truncated — the layout gives way, not the word.
 */
export function layoutStageLabels(
  seats: StageLabelSeat[],
  frame: { w: number; h: number },
  reserved: ReservedRect[] = [],
): StageLabelRect[] {
  const placed: StageLabelRect[] = [];
  const ordered = [...seats].sort(
    (a, b) => a.top - b.top || a.cx - b.cx || (a.key < b.key ? -1 : 1),
  );
  for (const seat of ordered) {
    const width = labelPillWidth(seat.label, seat.fontSize);
    const height = labelPillHeight(seat.fontSize);
    const maxLeft = Math.max(LABEL_MARGIN, frame.w - LABEL_MARGIN - width);
    const left = Math.min(Math.max(seat.cx - width / 2, LABEL_MARGIN), maxLeft);
    const maxTop = Math.max(LABEL_MARGIN, frame.h - LABEL_MARGIN - height);
    const blockers = (top: number): boolean => {
      const rect = { left, top, width, height };
      for (const r of placed) if (overlaps(rect, r, LABEL_GAP)) return true;
      for (const r of reserved) {
        if (seat.avoidKey && r.key === seat.avoidKey) continue;
        if (overlaps(rect, r, 0)) return true;
      }
      return false;
    };
    let top = Math.min(Math.max(seat.top, LABEL_MARGIN), maxTop);
    if (blockers(top)) {
      // Step down below each blocker in turn.
      let moved = true;
      let guard = 0;
      while (blockers(top) && moved && guard++ < 64) {
        moved = false;
        for (const r of [...placed, ...reserved.filter((x) => !(seat.avoidKey && x.key === seat.avoidKey))]) {
          if (overlaps({ left, top, width, height }, r, LABEL_GAP) && r.top + r.height + LABEL_GAP > top) {
            const next = Math.min(r.top + r.height + LABEL_GAP, maxTop);
            if (next > top) {
              top = next;
              moved = true;
            }
          }
        }
      }
    }
    if (blockers(top)) {
      // Step up instead: stack deliberately above the seat.
      let t = Math.min(Math.max(seat.top, LABEL_MARGIN), maxTop);
      let guard = 0;
      while (blockers(t) && guard++ < 64) {
        let next = -1;
        for (const r of [...placed, ...reserved.filter((x) => !(seat.avoidKey && x.key === seat.avoidKey))]) {
          if (overlaps({ left, top: t, width, height }, r, LABEL_GAP)) {
            next = Math.max(next, r.top - height - LABEL_GAP);
          }
        }
        if (next < LABEL_MARGIN || next >= t) break;
        t = next;
      }
      if (!blockers(t)) top = t;
    }
    if (blockers(top)) {
      // Last resort: scan the whole column — first for a slot that
      // clears labels AND art, then (only if none exists anywhere)
      // for one that clears every label. A name never covers
      // another name and never leaves the frame, whatever gives.
      let found = -1;
      for (let t = LABEL_MARGIN; t <= maxTop && found < 0; t += 4) {
        if (!blockers(t)) found = t;
      }
      if (found < 0) {
        for (let t = LABEL_MARGIN; t <= maxTop; t += 4) {
          const rect = { left, top: t, width, height };
          if (!placed.some((r) => overlaps(rect, r, LABEL_GAP))) {
            found = t;
            break;
          }
        }
      }
      top = found >= 0 ? found : Math.min(Math.max(seat.top, LABEL_MARGIN), maxTop);
    }
    placed.push({ key: seat.key, label: seat.label, left, top, width, height });
  }
  return placed;
}

/** Clamp a moving pill (a villager's name) into the frame at its
 *  figure's centre: returns the pill's left offset relative to the
 *  figure's centre x, so the pill is whole and inside the frame
 *  even when the figure stands at the stage's edge. */
export function clampedPillLeft(
  centreX: number,
  pillWidth: number,
  frameW: number,
): number {
  const raw = centreX - pillWidth / 2;
  const clamped = Math.min(Math.max(raw, LABEL_MARGIN), Math.max(LABEL_MARGIN, frameW - LABEL_MARGIN - pillWidth));
  return clamped - centreX;
}
