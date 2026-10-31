// ─── v361: text selection — the pure half ───────────────────────────────────
// The tokenizer behind SelectableText (components/bible-v205/
// selectable-text.tsx): the drag-selection's offsets are character
// positions in the plain text string, word-snapped, and this split
// is what defines them. Pure and pinned by tests; the component
// owns layout, gestures, and the bar.

export interface WordToken {
  /** Character offset of the word's first letter in the text. */
  start: number;
  /** Character offset just past the word's last letter. */
  end: number;
  word: string;
}

/** Split a text into its words with their character offsets.
 * Punctuation rides with its word (the split is on whitespace
 * only), so offsets address the plain string exactly. */
export function tokenizeWords(text: string): WordToken[] {
  const out: WordToken[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ start: m.index, end: m.index + m[0].length, word: m[0] });
  }
  return out;
}

// ─── v378: drag hit-testing — line bands + within-line midpoints ────────────
// v361 resolved a drag point as the 2D-nearest word rectangle in
// the whole text. On the device that read as "finicky": in the
// empty trailing space of a wrapped line, or grazing a line
// boundary, a DIAGONAL neighbour on the next line can be nearer
// than the word on the line the finger is actually travelling —
// so the focus jumped a line early and flickered back as the
// finger crossed the true boundary. The fix gives the point a
// line first, then a word: lines are bands split at the midpoints
// between neighbouring line rects, and inside a line each word
// owns the span out to the midpoints between it and its
// neighbours (the line's edge words own their line's ends). A
// point therefore always resolves to SOME word on the line it
// belongs to — the drag can never fall into a gap.

export interface TokenBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface LineBand {
  /** Token indices on this line, in reading (x) order. */
  items: { index: number; box: TokenBox }[];
  top: number;
  bottom: number;
}

function groupLines(boxes: readonly (TokenBox | undefined)[]): LineBand[] {
  const placed: { index: number; box: TokenBox }[] = [];
  boxes.forEach((box, index) => {
    if (box) placed.push({ index, box });
  });
  placed.sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
  const lines: LineBand[] = [];
  for (const item of placed) {
    const last = lines[lines.length - 1];
    // Flex rows are top-aligned: one row's words share a y (a few
    // px of rounding aside). A clearly lower top starts a new row.
    if (last && Math.abs(item.box.y - last.top) <= 4) {
      last.items.push(item);
      last.bottom = Math.max(last.bottom, item.box.y + item.box.h);
    } else {
      lines.push({ items: [item], top: item.box.y, bottom: item.box.y + item.box.h });
    }
  }
  for (const line of lines) line.items.sort((a, b) => a.box.x - b.box.x);
  return lines;
}

/** Resolve a point (in the text root's local coordinates) to a
 * token index: the line band the point's y falls in decides the
 * line; within the line, the word whose midpoint span holds the
 * point's x wins, with the edge words claiming their ends of the
 * line. Null only when nothing has been measured yet. */
export function resolveTokenAtPoint(
  boxes: readonly (TokenBox | undefined)[],
  x: number,
  y: number,
): number | null {
  const lines = groupLines(boxes);
  if (lines.length === 0) return null;
  let line = lines[lines.length - 1];
  for (let i = 0; i < lines.length; i++) {
    const bandBottom =
      i === lines.length - 1 ? Infinity : (lines[i].bottom + lines[i + 1].top) / 2;
    if (y < bandBottom) {
      line = lines[i];
      break;
    }
  }
  const items = line.items;
  for (let i = 0; i < items.length; i++) {
    const box = items[i].box;
    const spanEnd =
      i === items.length - 1
        ? Infinity
        : (box.x + box.w + items[i + 1].box.x) / 2;
    if (x < spanEnd) return items[i].index;
  }
  return items[items.length - 1].index;
}

/** Extend a standing selection to a new focus word. The anchor
 * never moves; a focus equal to the current one returns the SAME
 * object, so the caller's state update bails out instead of
 * re-rendering the whole text on every touch-move event (the
 * other half of the v361 drag's on-device lag-and-jump). */
export function extendSelection<S extends { anchor: number; focus: number }>(
  sel: S,
  focus: number,
): S {
  return sel.focus === focus ? sel : { ...sel, focus };
}

/** v378 (scope addition — the approved drawing's handles): clamp
 * a handle drag's resolved word to the dragged end's own side of
 * the FIXED end. The start handle can travel up to the fixed end
 * but never past it, and vice versa — so the end not being
 * dragged remains an end of the selection for the whole drag. */
export function clampHandleFocus(end: 'start' | 'end', hit: number, fixed: number): number {
  return end === 'start' ? Math.min(hit, fixed) : Math.max(hit, fixed);
}
