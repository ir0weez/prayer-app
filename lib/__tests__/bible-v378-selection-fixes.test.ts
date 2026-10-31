// ─── v378 — tap outside to deselect + the drag, un-finickied ─────────────
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
const selectable = read('components/bible-v205/selectable-text.tsx');
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

describe('v378 tap outside clears — the registry and the tap paths', () => {
  it('one standing selection is registered and reachable from any surface', () => {
    expect(selectable).toContain('let activeSelectionClear: (() => void) | null = null;');
    expect(selectable).toContain('export function hasActiveSelection(): boolean');
    expect(selectable).toContain('export function clearActiveSelection(): void');
    // Registering a new selection clears the one that stood before.
    expect(selectable).toContain('const prev = activeSelectionClear;');
  });

  it('the word press order: drag-release swallow, standing-selection clear, inert, edit', () => {
    const press = selectable.slice(selectable.indexOf(' dragReleaseRef'));
    const swallow = press.indexOf('dragReleaseRef.current = null;');
    const clear = press.indexOf('if (touchStampRef.current) {');
    const inert = press.indexOf('if (props.tapInert) return;');
    const edit = press.indexOf('props.onPressText?.();');
    expect(swallow).toBeGreaterThan(-1);
    expect(clear).toBeGreaterThan(swallow);
    expect(inert).toBeGreaterThan(clear);
    expect(edit).toBeGreaterThan(inert);
    // The clear branch clears BOTH the registry's selection and
    // this text's own, and returns — a tap that clears never
    // also opens anything.
    const branch = press.slice(clear, inert);
    expect(branch).toContain('clearActiveSelection();');
    expect(branch).toContain('clearSelection();');
    expect(branch).toContain('return;');
  });

  it('a plain tap still never starts a selection and never opens the composer', () => {
    expect(selectable.match(/\(\) => begin\(i\)/g)).toHaveLength(1);
    expect(selectable).toContain('delayLongPress={350}');
    // The verse surface passes no tap-to-composer prop at all.
    expect(chapter).toContain('tapInert');
    expect(chapter).not.toContain('onPressText={() => openComposerForVerse(v)}');
  });

  it('the root dead-space tap clears, but drag ends and bar/handle touches never read as taps', () => {
    expect(selectable).toContain('onTouchEnd={onRootTouchEnd}');
    const end = selectable.slice(
      selectable.indexOf('const onRootTouchEnd'),
      selectable.indexOf('const onRootTouchCancel'),
    );
    expect(end).toContain('const wasDrag = draggingRef.current;');
    expect(end).toContain('const onBar = barTouchRef.current;');
    expect(end).toContain('const onHandle = handleTouchRef.current;');
    expect(end).toContain('if (wasDrag || wasHandleDrag || onBar || onHandle) return;');
    expect(end).toContain('if (touchStampRef.current) clearActiveSelection();');
    // The stamp is taken at the root's touch start.
    expect(selectable).toContain('touchStampRef.current = hasActiveSelection();');
  });

  it('markbar controls act BEFORE any clear — the bar is never an outside tap', () => {
    expect(selectable).toContain('barTouchRef.current = true;');
    const tint = selectable.slice(selectable.indexOf('props.onApplyTint(charRange, t);'));
    expect(tint.indexOf('props.onApplyTint(charRange, t);')).toBeLessThan(tint.indexOf('clearSelection();'));
    const bubble = selectable.slice(selectable.indexOf('props.onBubble(charRange);'));
    expect(bubble.indexOf('props.onBubble(charRange);')).toBeLessThan(bubble.indexOf('clearSelection();'));
    const note = selectable.slice(selectable.indexOf('props.onNote(charRange);'));
    expect(note.indexOf('props.onNote(charRange);')).toBeLessThan(note.indexOf('clearSelection();'));
  });

  it("his own lines: the wrapper tap clears a standing selection instead of opening the editor", () => {
    expect(chapter).toContain(
      "import { SelectableText, clearActiveSelection, hasActiveSelection } from './selectable-text';",
    );
    const wrap = chapter.slice(chapter.indexOf('v378: a tap on the line'));
    expect(wrap.indexOf('if (hasActiveSelection()) {')).toBeLessThan(wrap.indexOf('editSelfLine(i);'));
    expect(wrap).toContain('clearActiveSelection();');
    // ...and with nothing standing, tap-to-edit is untouched.
    expect(chapter).toContain('onPressText={() => editSelfLine(i)}');
  });
});

describe('v378 the drag — resolution, gating, and the release swallow', () => {
  it('hit-testing runs through the line-band resolver, not the euclidean scan', () => {
    expect(selectable).toContain('return resolveTokenAtPoint(boxesRef.current, pageX - origin.x, pageY - origin.y);');
    expect(selectable).not.toContain('bestDist');
  });

  it('both drags hold their moves until their own origin measurement lands', () => {
    expect(selectable.match(/if \(!originReady\(\)\) return;/g)).toHaveLength(2);
    expect(selectable).toContain('if (originDragRef.current !== dragId) return;');
  });

  it('the scroll lock is engaged by handle drags too, and released with them', () => {
    const begin = selectable.slice(
      selectable.indexOf('const beginHandleDrag'),
      selectable.indexOf('const finishHandleDrag'),
    );
    expect(begin).toContain('props.onDragChange?.(true);');
    const finish = selectable.slice(
      selectable.indexOf('const finishHandleDrag'),
      selectable.indexOf('const onTouchMove'),
    );
    expect(finish).toContain('props.onDragChange?.(false);');
    // The page side of the lock is the v361 wiring, unchanged.
    expect(chapter).toContain('scrollEnabled={!selectionDrag}');
  });
});

describe("v378 the drawing's handles", () => {
  it('handles render exactly while a selection stands, at its two corners', () => {
    expect(selectable).toContain('{sel && firstBox ? (');
    expect(selectable).toContain('{sel && lastBox ? (');
    expect(selectable).toContain('<SelectionHandle');
    expect(selectable).toContain('cornerX={firstBox.x}');
    expect(selectable).toContain('cornerY={firstBox.y}');
    expect(selectable).toContain('cornerX={lastBox.x + lastBox.w}');
    expect(selectable).toContain('cornerY={lastBox.y + lastBox.h}');
    // Nothing renders a handle on a condition of its own.
    expect(selectable.match(/<SelectionHandle/g)).toHaveLength(2);
  });

  it("the handle dress is the drawing's: selection-colour dot, white ring, stem", () => {
    expect(selectable).toContain('color={palette.selHandle}');
    const palette = read('components/bible-v205/palette.ts');
    expect(palette).toContain("selHandle: 'rgb(242,87,0)'");
    expect(selectable).toContain('handleDotStart');
    expect(selectable).toContain('handleDotEnd');
    expect(selectable).toContain("borderColor: '#FFFFFF'");
  });

  it('a handle seat claims the responder and refuses termination (no scroll steal)', () => {
    const seat = selectable.slice(
      selectable.indexOf('function SelectionHandle'),
      selectable.indexOf('export function SelectableText'),
    );
    expect(seat).toContain('onStartShouldSetResponder={() => true}');
    expect(seat).toContain('onMoveShouldSetResponder={() => true}');
    expect(seat).toContain('onResponderTerminationRequest={() => false}');
    expect(seat).toContain('onTouchStart={props.onDragStart}');
  });

  it('a handle drag re-seats anchor=FIXED end and moves only the dragged end', () => {
    const begin = selectable.slice(
      selectable.indexOf('const beginHandleDrag'),
      selectable.indexOf('const finishHandleDrag'),
    );
    expect(begin).toContain("fixed: end === 'start' ? hiNow : loNow");
    expect(begin).toContain("anchor: end === 'start' ? hiNow : loNow");
    const move = selectable.slice(
      selectable.indexOf('const onTouchMove'),
      selectable.indexOf('// v378: the root'),
    );
    expect(move).toContain('clampHandleFocus(hd.end, hit, hd.fixed)');
    expect(move).toContain('extendSelection(s, clampHandleFocus(hd.end, hit, hd.fixed))');
  });

  it('releasing a handle keeps the selection and the bar — finish clears nothing', () => {
    const finish = selectable.slice(
      selectable.indexOf('const finishHandleDrag'),
      selectable.indexOf('const onTouchMove'),
    );
    expect(finish).not.toContain('setSel');
    expect(finish).not.toContain('clearSelection');
    expect(finish).not.toContain('clearActiveSelection');
  });

  it('tap-outside clears handles WITH the selection — one condition drives all three', () => {
    // Handles, bar and wash all key off the same `sel` state;
    // the clear paths null it, so they fall together.
    expect(selectable).toContain('const clearSelection = () => {');
    const clear = selectable.slice(
      selectable.indexOf('const clearSelection = () => {'),
      selectable.indexOf('// The drags'),
    );
    expect(clear).toContain('setSel(null);');
    expect(selectable).toContain('{sel && charRange ? (');
  });
});
