/**
 * v458 — Up Next: the end rows' rail dots sit ON their
 * text lines. The defect Jonathan caught on the v457
 * render (Nov 6, 13:32 screenshot — "Why is that bottom
 * Rest and time slightly off?"): in the tall rail, the
 * LAST row's dot sat ~8dp BELOW its time/title line, and
 * the rail segment above it stopped short of the dot.
 * (The first row's dot rides high by the mirror image of
 * the same fault, though a short top segment hides it
 * better.)
 *
 * THE CAUSE — measurement, not drawing. Each slot's rail
 * column (widget_up_next.xml) is a vertical LinearLayout
 * as tall as the row: seg_top and seg_bot are 0dp with
 * layout_weight 1 around a fixed 20dp dot cell. The two
 * segments split the row's leftover height EVENLY, and
 * that even split is what centres the dot on the text
 * line. fillRailSlot dropped the outer segment at the
 * ends of the walk with View.GONE — and a GONE child is
 * excluded from LinearLayout measurement entirely. On
 * the last row seg_top therefore absorbed ALL the
 * leftover and the dot cell was pushed to the row's
 * bottom edge: dot centre = rowHeight − 10 instead of
 * rowHeight / 2. On a 36dp plain row that is 26 vs 18 —
 * 8dp low, the screenshot's offset to the pixel.
 *
 * THE FIX — one word, twice: the end segments hide with
 * View.INVISIBLE instead of View.GONE. An INVISIBLE
 * child still takes its weighted share, so the split
 * stays even and the dot stays centred; the segment
 * simply doesn't draw, which is all "dropped" ever
 * meant. Nothing else moves: no seating, budget, row
 * cost, colour or dress changes — the same two lines
 * dress every slot, the gap row's small dot included.
 *
 * No earlier pin asserted the GONE behaviour (v442 pins
 * only that the seg ids exist in the layout), so nothing
 * needed amending; this file is the first pin on it.
 *
 * These tests pin the source lines, the layout structure
 * the fix stands on, and an executable mirror of both the
 * visibility decision and the centre arithmetic, so the
 * 8dp can be seen in numbers, not just believed.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const MODULE = "modules/expo-prayercircle-widgets";
const MODULE_ANDROID = `${MODULE}/android/src/main`;
const MODULE_KOTLIN = `${MODULE_ANDROID}/java/expo/modules/prayercirclewidgets`;

const renderer = read(`${MODULE_KOTLIN}/WidgetRenderer.kt`);
const upNextLayout = read(`${MODULE_ANDROID}/res/layout/widget_up_next.xml`);

/** The body of one renderer function, from its declaration to
 * the next top-level declaration. */
function rendererFn(name: string): string {
  const at = renderer.indexOf(`private fun ${name}`);
  expect(at, `${name} present`).toBeGreaterThan(-1);
  const rest = renderer.slice(at + 10);
  const next = rest.indexOf("\n  private fun ");
  return next < 0 ? rest : rest.slice(0, next);
}

// ─── The executable mirrors ─────────────────────────────────────────────────
// (a) The visibility decision — the two lines at the top
// of fillRailSlot, translated. VISIBLE keeps the segment
// drawn; INVISIBLE keeps its share of the column but
// draws nothing. GONE appears nowhere.
type Vis = "VISIBLE" | "INVISIBLE";
function segVisibility(isFirst: boolean, isLast: boolean): { top: Vis; bot: Vis } {
  return {
    top: isFirst ? "INVISIBLE" : "VISIBLE",
    bot: isLast ? "INVISIBLE" : "VISIBLE",
  };
}

// (b) The centre arithmetic — the rail column of one
// slot: two weighted segments around the fixed 20dp dot
// cell, in a row of height H. `kept` segments (VISIBLE or
// INVISIBLE — both are measured) split the leftover
// evenly; a GONE segment is measured as nothing and its
// partner takes the whole leftover.
const DOT_CELL = 20; // widget_up_next.xml, pinned below
function dotCenter(rowHeight: number, topKept: boolean, botKept: boolean): number {
  const leftover = rowHeight - DOT_CELL;
  const top = topKept ? leftover / (botKept ? 2 : 1) : 0;
  return top + DOT_CELL / 2;
}

describe("v458 Up Next rail — the end segments hide INVISIBLE, never GONE", () => {
  const slot = rendererFn("fillRailSlot");

  it("fillRailSlot drops the outer segments with INVISIBLE", () => {
    expect(slot).toContain(
      'views.setViewVisibility(id("seg_top"), if (isFirst) View.INVISIBLE else View.VISIBLE)',
    );
    expect(slot).toContain(
      'views.setViewVisibility(id("seg_bot"), if (isLast) View.INVISIBLE else View.VISIBLE)',
    );
  });

  it("no GONE end segment survives anywhere in the slot fill", () => {
    expect(slot).not.toContain("if (isFirst) View.GONE");
    expect(slot).not.toContain("if (isLast) View.GONE");
    // (the GONE pair is the regression this version exists
    // to bar; every other GONE in the slot fill is a face
    // reset, not a rail segment, and stays as it was)
  });

  it("the mirror matches the renderer's decision, slot by slot", () => {
    // first slot of the walk: top dropped, bottom drawn
    expect(segVisibility(true, false)).toEqual({ top: "INVISIBLE", bot: "VISIBLE" });
    // last slot: bottom dropped, top drawn
    expect(segVisibility(false, true)).toEqual({ top: "VISIBLE", bot: "INVISIBLE" });
    // a middle slot: the line runs straight through
    expect(segVisibility(false, false)).toEqual({ top: "VISIBLE", bot: "VISIBLE" });
    // the only seated row is both first and last: both
    // halves dropped, the lone dot still centred
    expect(segVisibility(true, true)).toEqual({ top: "INVISIBLE", bot: "INVISIBLE" });
  });

  it("the arithmetic: INVISIBLE keeps the dot centred, GONE pushed it 8dp low", () => {
    // a plain row is 36 tall (v457's honest cost). Both
    // segments kept — the v458 world, ends included — the
    // dot centre is the row's centre, where the text sits.
    expect(dotCenter(36, true, true)).toBe(18);
    // the v457 world on the last row: seg_bot GONE, so
    // seg_top took the whole 16dp leftover — centre 26,
    // 8dp below the line. The screenshot's offset.
    expect(dotCenter(36, true, false)).toBe(26);
    expect(dotCenter(36, true, false) - dotCenter(36, true, true)).toBe(8);
    // mirror image on the first row: seg_top GONE pushed
    // the dot to the row's top edge, centre 10.
    expect(dotCenter(36, false, true)).toBe(10);
  });
});

describe("v458 Up Next layout — the weighted pair the fix stands on", () => {
  /** One slot's row chunk of the layout, nx_row_N up to
   * the next row (or the layout's end). */
  function rowChunk(n: number): string {
    const at = upNextLayout.indexOf(`@+id/nx_row_${n}"`);
    expect(at, `nx_row_${n} present`).toBeGreaterThan(-1);
    const next = upNextLayout.indexOf(`@+id/nx_row_${n + 1}"`, at);
    return next < 0 ? upNextLayout.slice(at) : upNextLayout.slice(at, next);
  }

  it("every slot's segments are the 0dp / weight-1 pair around a 20dp dot cell", () => {
    for (let n = 1; n <= 9; n += 1) {
      const row = rowChunk(n);
      for (const seg of [`nx_seg_top_${n}`, `nx_seg_bot_${n}`]) {
        const at = row.indexOf(`@+id/${seg}"`);
        expect(at, `${seg} present`).toBeGreaterThan(-1);
        const attrs = row.slice(at, at + 220);
        // 0dp + weight 1: the segment's height IS its share
        // of the leftover — the share GONE used to steal.
        expect(attrs).toContain('android:layout_height="0dp"');
        expect(attrs).toContain('android:layout_weight="1"');
      }
      // the fixed cell between them, whose centre the
      // split exists to place: 20dp, DOT_CELL above.
      expect(row).toContain('android:layout_height="20dp"');
    }
  });
});
