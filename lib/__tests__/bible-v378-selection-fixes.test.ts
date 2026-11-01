// ─── v378 — tap outside to deselect + the drag, un-finickied ─────────────
// v405 SUPERSESSION (Nov 1): the custom engine this file's
// component pins describe is DELETED — Jonathan picked native
// selection ("native selection with Highlight/Note in its menu,
// everywhere") after the model failed on his phone a fourth
// time. The platform owns selection, dismissal, and handles now;
// there is no registry, no drag math on the render path, and no
// scroll lock. The lib/selection MATH tests below still stand
// (the pure module survives, unused by the reader), and the
// final describe pins the replacement's truths where the old
// pins stood.
// ────────────────────────────────────────────────────────────────────────
// Jonathan, Oct 30, on a screen recording of Leviticus 1 (v376):
// "First of all, the selection feature is really finicky and
// difficult to use. Second, why can't I tap outside of it to
// deselect?!" Both were ours:
//  1. v367's inert verse tap sat BEFORE the clear branch, the
//     selection state was per-instance with no cross-instance
//     reach, and the text root's dead space had no tap handling
//     — so nothing outside the markbar could dismiss it.
//  2. The drag resolved hits as the 2D-nearest word rectangle in
//     the whole text (a diagonal neighbour on the next line wins
//     in a wrapped line's trailing space → line jumps/flicker),
//     re-rendered the verse on EVERY move event, read its
//     coordinates from an origin captured once, asynchronously,
//     at drag start, and — on his own lines — let the drag's own
//     release synthesize a press that cleared a just-made short
//     selection on finger-lift.
// Scope addition, same day: the approved drawing's HANDLES
// (reader-highlight-model-v3.html Panel 1 — "handles at both
// ends") were a v361 deviation; v378 restores them.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  clampHandleFocus,
  extendSelection,
  resolveTokenAtPoint,
  type TokenBox,
} from '../bible-v205/selection';

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');
const nativeSel = read('components/bible-v205/native-selectable-text.tsx');
const chapter = read('components/bible-v205/chapter-page.tsx');

// Two wrapped lines, verse-shaped (line 2 runs long, line 1 ends
// early — the trailing-space geometry of real text):
//   line 1 (y 0..26):  A(0..30)  B(35..75)  C(80..105)
//   line 2 (y 26..52): D(0..55)  E(60..190)
const BOXES: (TokenBox | undefined)[] = [
  { x: 0, y: 0, w: 30, h: 26 },
  { x: 35, y: 0, w: 40, h: 26 },
  { x: 80, y: 0, w: 25, h: 26 },
  { x: 0, y: 26, w: 55, h: 26 },
  { x: 60, y: 26, w: 130, h: 26 },
];

describe('v378 resolveTokenAtPoint — the line decides first, then the word', () => {
  it('resolves plain hits to their word', () => {
    expect(resolveTokenAtPoint(BOXES, 10, 5)).toBe(0);
    expect(resolveTokenAtPoint(BOXES, 50, 5)).toBe(1);
    expect(resolveTokenAtPoint(BOXES, 100, 40)).toBe(4);
  });

  it('a gap between words resolves by the midpoint, either side', () => {
    // A ends at 30, B starts at 35 — the midpoint is 32.5.
    expect(resolveTokenAtPoint(BOXES, 31, 5)).toBe(0);
    expect(resolveTokenAtPoint(BOXES, 34, 5)).toBe(1);
    // B ends at 75, C starts at 80 — midpoint 77.5.
    expect(resolveTokenAtPoint(BOXES, 76, 5)).toBe(1);
    expect(resolveTokenAtPoint(BOXES, 79, 5)).toBe(2);
  });

  it('the trailing space of a line belongs to that line — no diagonal line-jump', () => {
    // Deep in line 1's trailing space, 2px above the line
    // boundary: the v361 euclidean test picked E (its corner is
    // 2px away diagonally) and the selection jumped a line.
    expect(resolveTokenAtPoint(BOXES, 150, 24)).toBe(2);
    // The same x a few px lower is genuinely line 2's ground.
    expect(resolveTokenAtPoint(BOXES, 150, 30)).toBe(4);
    // Trailing space mid-line-2, above its own words' start.
    expect(resolveTokenAtPoint(BOXES, 195, 40)).toBe(4);
  });

  it('line bands split at the midpoint between line rects (real leading)', () => {
    const lead: TokenBox[] = [
      { x: 0, y: 0, w: 40, h: 22 }, // line 1: 0..22
      { x: 0, y: 30, w: 40, h: 22 }, // line 2: 30..52 — boundary at 26
    ];
    expect(resolveTokenAtPoint(lead, 10, 24)).toBe(0);
    expect(resolveTokenAtPoint(lead, 10, 28)).toBe(1);
  });

  it('points off the text clamp to the nearest end of the nearest line', () => {
    expect(resolveTokenAtPoint(BOXES, -20, 5)).toBe(0);
    expect(resolveTokenAtPoint(BOXES, 10, -50)).toBe(0);
    expect(resolveTokenAtPoint(BOXES, 10, 500)).toBe(3);
    expect(resolveTokenAtPoint(BOXES, 500, 500)).toBe(4);
  });

  it('unmeasured tokens are skipped; nothing measured resolves to null', () => {
    expect(resolveTokenAtPoint([undefined, BOXES[1]], 50, 5)).toBe(1);
    expect(resolveTokenAtPoint([undefined, undefined], 10, 10)).toBeNull();
    expect(resolveTokenAtPoint([], 10, 10)).toBeNull();
  });
});

describe('v378 extendSelection — anchor stability, no per-move re-render', () => {
  it('an unchanged focus returns the SAME object (the render bails)', () => {
    const sel = { anchor: 2, focus: 5 };
    expect(extendSelection(sel, 5)).toBe(sel);
  });

  it('extending moves only the focus; the anchor never moves', () => {
    expect(extendSelection({ anchor: 2, focus: 5 }, 8)).toEqual({ anchor: 2, focus: 8 });
  });

  it('a partial reverse keeps the anchored end fixed', () => {
    const out = extendSelection({ anchor: 2, focus: 8 }, 4);
    expect(out).toEqual({ anchor: 2, focus: 4 });
    expect(Math.min(out.anchor, out.focus)).toBe(2);
  });

  it('reversing through the anchor flips the span, anchor still fixed', () => {
    expect(extendSelection({ anchor: 5, focus: 8 }, 3)).toEqual({ anchor: 5, focus: 3 });
  });
});

describe('v378 clampHandleFocus — a handle drag moves only its own end', () => {
  it('the start handle may travel up to the fixed end, never past it', () => {
    expect(clampHandleFocus('start', 2, 5)).toBe(2);
    expect(clampHandleFocus('start', 5, 5)).toBe(5);
    expect(clampHandleFocus('start', 9, 5)).toBe(5);
  });

  it('the end handle may travel down to the fixed end, never past it', () => {
    expect(clampHandleFocus('end', 9, 5)).toBe(9);
    expect(clampHandleFocus('end', 5, 5)).toBe(5);
    expect(clampHandleFocus('end', 1, 5)).toBe(5);
  });
});

describe('v405 native selection — the platform owns what the registry did', () => {
  it('there is no registry, no drag state, and no scroll lock anywhere on the page', () => {
    expect(chapter).not.toContain('hasActiveSelection');
    expect(chapter).not.toContain('clearActiveSelection');
    expect(chapter).not.toContain('subscribeActiveSelection');
    expect(chapter).not.toContain('scrollEnabled');
    expect(chapter).not.toContain('selectionDrag');
    expect(nativeSel).not.toContain('onDragChange');
  });

  it('a plain tap on his own line is the edit door again — no standing-selection guard', () => {
    const wrap = chapter.slice(chapter.indexOf('v405: a plain tap is the edit door'));
    expect(wrap).toContain('editSelfLine(i);');
    expect(wrap).not.toContain('hasActiveSelection');
  });

  it('a plain tap on a verse still never starts a selection and never opens the composer', () => {
    // Verses render through the native surface; the composer
    // opens only from its menu actions.
    expect(chapter).toContain('<NativeSelectableText');
    expect(chapter).toContain('onNote={() => openComposerForVerse(v)}');
    expect(chapter).not.toContain('onPressText');
  });

  it("the platform's handles wear the palette's selection colours (the drawing's orange)", () => {
    const palette = read('components/bible-v205/palette.ts');
    expect(palette).toContain("selHandle: 'rgb(242,87,0)'");
    expect(nativeSel).toContain('selectionColor={palette.selWash}');
    expect(nativeSel).toContain('handleColor={palette.selHandle}');
  });

  it('the menu is the platform menu, carrying exactly his four items', () => {
    expect(nativeSel).toContain(
      "export const SELECTION_MENU_OPTIONS = ['Highlight', 'Note', 'Bubble', 'Copy'] as const;",
    );
    expect(nativeSel).toContain('menuOptions={[...SELECTION_MENU_OPTIONS]}');
  });
});
