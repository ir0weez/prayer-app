/**
 * v453 — Up Next: the tall size shows more of the day
 * again. Jonathan, Nov 6: "What happened to the XL version
 * of the schedule widget?" — then, offered the choice in
 * one tap, he picked "Tall size shows more of the day
 * again" over "Keep four rows at every size".
 *
 * The history: Up Next is ONE provider (4×2 target cells)
 * that he stretches tall on his home screen. The tall
 * placement used to fill its extra height with more of the
 * day; his Nov 5 rulings — the fixed composition (v450:
 * one past, current/NOW, box, one after) and box ownership
 * (v451: the running event holds the box) — capped the
 * rail at four item rows at EVERY height, so the tall
 * placement sat mostly empty. The XL behaviour was the
 * cost of those rulings, and nobody said so when they
 * landed.
 *
 * The fix restores the tall extension WITHOUT touching
 * the fixed core:
 *  - The core seats first, exactly as v451 does — last /
 *    current-or-NOW / box / one after, the budget
 *    heightSignal − 56 − 16, the priorities, the
 *    gap-among-core policy, NOW suppression while the box
 *    is held, whole-or-nothing. At a standard height the
 *    render is v451's, row for row.
 *  - The render-time path (dayItems only) also builds the
 *    EXTENSION: the rest of the day past the core's after
 *    item, in rail order — each item a plain row, with the
 *    open stretch before it (≥ 15 min from the previous
 *    item's end, the core's own between-items rule) as a
 *    white-box gap row ahead of it.
 *  - The selection walks the extension ONLY when the
 *    whole core stands (the after row seated) and only
 *    from the leftover budget: strict rail order, each
 *    element whole or not at all (item 34, gap 32 — the
 *    core's costs), STOPPING at the first element that
 *    does not fit (no holes in the day), capped by the
 *    rail's nine slots. The extension never displaces a
 *    core row or a core gap; if the core could not fully
 *    seat, there is no extension. The past side never
 *    extends — the walk reads the ahead list only, and
 *    the last row stays one.
 *  - The legacy-entries fallback hands over an empty
 *    extension — its frozen walk keeps its v450/v451
 *    behaviour.
 *
 * The Kotlin renderer cannot execute in this harness, so —
 * as in every round — the behaviour is pinned two ways:
 * source assertions on the real renderer, and an executable
 * mirror of the selection (the v451 mirror plus the
 * extension walk) whose constants, gates and step order
 * are tied to that source by the tie pins below.
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

/** The body of one renderer function, from its declaration to
 * the next top-level declaration. */
function rendererFn(name: string): string {
  const at = renderer.indexOf(`private fun ${name}`);
  expect(at, `${name} present`).toBeGreaterThan(-1);
  const rest = renderer.slice(at + 10);
  const next = rest.indexOf("\n  private fun ");
  return next < 0 ? rest : rest.slice(0, next);
}

// ─── The executable mirror ──────────────────────────────────────────────────
// The v451 mirror of selectRailRows, plus the v453
// extension walk. Extension rows ride as "xitem" / "xgap"
// so the fixtures can tell them from the core's rows (in
// the Kotlin they are plain "item" / "gap" RailRows — the
// same dresses). The tie pins hold the mirror's budget,
// costs, gates and step order to the Kotlin source.

type ExtRow = "xitem" | "xgap";

interface Candidates {
  last: boolean;
  current: boolean;
  hero: boolean;
  nowGap: boolean;
  gap: boolean;
  after: boolean;
  next: boolean;
}

function selectRailRowsMirror(
  c: Candidates,
  heroRunning: boolean,
  extension: ExtRow[],
  heightSignal: number,
): string[] {
  let remaining = heightSignal - 56 - 16;
  const chosen = {
    last: false,
    current: false,
    now: false,
    hero: false,
    after: false,
    next: false,
    nowGap: false,
    gap: false,
  };
  // (1) hero — always chosen.
  if (c.hero) {
    chosen.hero = true;
    remaining -= 64;
  }
  // (2) current if present, else the NOW row — always
  // chosen, except the NOW row while a running event holds
  // the box (the box is the anchor then).
  if (c.current) {
    chosen.current = true;
    remaining -= 34;
  } else if (!heroRunning) {
    chosen.now = true;
    remaining -= 30;
  }
  // (3) last — when it fits.
  if (c.last && 34 <= remaining) {
    chosen.last = true;
    remaining -= 34;
  }
  // (4) next — when it fits.
  if (c.next && 34 <= remaining) {
    chosen.next = true;
    remaining -= 34;
  }
  // (5) after — when it fits.
  if (c.after && 34 <= remaining) {
    chosen.after = true;
    remaining -= 34;
  }
  // (6) the NOW row when a current exists — when it fits,
  // and never while a running event holds the box.
  if (c.current && !chosen.now && !heroRunning && 30 <= remaining) {
    chosen.now = true;
    remaining -= 30;
  }
  // Gap rows last — leftover budget only, in rail order.
  if (c.nowGap && 32 <= remaining) {
    chosen.nowGap = true;
    remaining -= 32;
  }
  if (c.gap && 32 <= remaining) {
    chosen.gap = true;
    remaining -= 32;
  }
  const display: string[] = [];
  if (chosen.last) display.push("last");
  if (chosen.current) display.push("current");
  if (chosen.now) display.push("now");
  if (chosen.nowGap) display.push("nowGap");
  if (chosen.hero) display.push("hero");
  if (chosen.gap) display.push("gap");
  if (chosen.next) display.push("next");
  if (chosen.after) display.push("after");
  // ── v453: the tall extension — only once the whole core
  // stands, walked from the leftover in strict rail order,
  // whole or not at all, stopping at the first element
  // that does not fit; the rail's nine slots cap the walk.
  if (chosen.after) {
    for (const row of extension) {
      if (display.length >= 9) break;
      const cost = row === "xgap" ? 32 : 34;
      if (cost > remaining) break;
      display.push(row);
      remaining -= cost;
    }
  }
  return display;
}

const NONE: Candidates = {
  last: false,
  current: false,
  hero: false,
  nowGap: false,
  gap: false,
  after: false,
  next: false,
};

// ─── 1. The extension candidates, built in the render-time path (source) ────

describe("v453 Up Next — the extension candidates (source)", () => {
  const body = rendererFn("renderUpNext");
  const blockAt = body.indexOf("val extensionRows = mutableListOf<RailRow>()");
  const block = body.slice(blockAt, body.indexOf("leftCount = aheadIdx.size", blockAt));

  it("the walk runs over the ahead items past the after item, in the day's order", () => {
    expect(blockAt).toBeGreaterThan(-1);
    expect(block).toContain("if (afterIdx != null) {");
    expect(block).toContain("for (k in 2 until aheadIdx.size) {");
    expect(block).toContain("val item = dayItems[aheadIdx[k]]");
    // Each extension item is a plain row in the core's
    // plain-item dress.
    expect(block).toContain(
      'extensionRows.add(RailRow("item", minutesToTimeLabel(item.startMinutes), item.title, item.sub, item.startMinutes, ""))',
    );
  });

  it("each item's open stretch (≥ 15 min from the previous item's end) rides ahead of it as a gap box", () => {
    expect(block).toContain("var prevEnd = dayItems[afterIdx].endMinutes");
    expect(block).toContain("val extGapMinutes = item.startMinutes - prevEnd");
    expect(block).toContain("if (extGapMinutes >= 15) {");
    expect(block).toContain(
      'extensionRows.add(RailRow("gap", "", "", "", 0, openDurationText(extGapMinutes)))',
    );
    expect(block).toContain("prevEnd = item.endMinutes");
  });

  it("the walk reads the ahead list only — the past side never extends", () => {
    expect(block).toContain("aheadIdx[k]");
    expect(block).not.toContain("lastIdx");
    expect(block).not.toContain("lastRow");
  });

  it("both paths hand the selection their extension: the day's walk, or an empty list from the fallback", () => {
    // v454 amendment (Rulings 1 and 2): the nowGap argument
    // is gone from both call sites and the running flag
    // widened into boxIsNow (a running event's box, or the
    // white box). The extension hand-off itself is exactly
    // as this round built it — the walk still rides behind
    // the core, under the new boxes too.
    expect(body).toContain(
      "selectRailRows(lastRow, currentRow, heroRow, gapRow, afterRow, nextRow, boxIsNow, extensionRows, heightSignal)",
    );
    expect(body).toContain(
      "selectRailRows(lastRow, currentRow, heroRow, gapRow, afterRow, null, false, emptyList(), heightSignal)",
    );
  });

  it("there is still no next2 anywhere in the renderer — the extension is not the old candidate back under a new name", () => {
    expect(renderer).not.toContain("next2");
  });
});

// ─── 2. The tie pins: the walk in the mirror IS the walk in the Kotlin ─────

describe("v453 Up Next — mirror ties to the Kotlin source", () => {
  const sel = rendererFn("selectRailRows");

  it("the selection takes the extension list alongside the fixed core set", () => {
    expect(sel).toContain("extension: List<RailRow>,");
    // The core signature stands ahead of it — as amended by
    // v454 (Rulings 1 and 2): no nowGap parameter (no gap
    // candidate exists before the box), and the flag is
    // boxIsNow (a running event's box, or the white box).
    // The mirror above keeps this round's own signature
    // shape as its historical record; the extension's walk
    // in it is unchanged.
    expect(sel).toContain(
      "last: RailRow?,\n    current: RailRow?,\n    hero: RailRow?,\n    gap: RailRow?,\n    after: RailRow?,\n    next: RailRow?,\n    boxIsNow: Boolean,",
    );
  });

  it("the budget constant is the core's — the extension plans against the same heightSignal − 56 − 16", () => {
    expect(sel).toContain("val railBudget = heightSignal - 56 - 16");
  });

  it("the walk is gated on the whole core standing: the after row seated", () => {
    expect(sel).toContain("if (afterChosen) {");
    expect(sel).toContain("for (row in extension) {");
  });

  it("the walk's costs are the core's own: gap 32, item 34, drawn on the same remaining budget", () => {
    expect(sel).toContain('val cost = if (row.kind == "gap") 32 else 34');
    expect(sel).toContain("if (cost > remaining) break");
    expect(sel).toContain("remaining -= cost");
  });

  it("the walk stops at the first element that does not fit, and the rail's nine slots cap it", () => {
    expect(sel).toContain("if (display.size >= 9) break");
    // The nine is the layout's: fillRailFull fills nine
    // slots and no more.
    expect(rendererFn("fillRailFull")).toContain("for (slot in 0 until 9)");
  });

  it("the walk runs after the core is fully assembled — core first, extension last", () => {
    const afterAdd = sel.indexOf("display.add(after)");
    const walk = sel.indexOf("for (row in extension) {");
    expect(afterAdd).toBeGreaterThan(-1);
    expect(walk).toBeGreaterThan(afterAdd);
    // And after the core's own gap pass — an extension row
    // can never take budget a core gap was refused.
    const coreGap = sel.indexOf("gapChosen = true");
    expect(walk).toBeGreaterThan(coreGap);
  });
});

// ─── 3. The fixtures: the day under the core at real heights ────────────────

describe("v453 Up Next — fixture heights through the selection", () => {
  it("a tall placement seats the fixed four, then the rest of the day below them in day order with its gap boxes", () => {
    // Core (his 18:01 shape): last / current / NOW / hero /
    // gap / after costs 64 + 34 + 34 + 34 + 30 + 32 = 228
    // of the 408 budget a 480 signal leaves; the extension
    // (item 34, gap 32, item 34 = 100) takes the leftover.
    const c: Candidates = { ...NONE, last: true, current: true, hero: true, gap: true, after: true };
    const display = selectRailRowsMirror(c, false, ["xitem", "xgap", "xitem"], 480);
    expect(display).toEqual(["last", "current", "now", "hero", "gap", "after", "xitem", "xgap", "xitem"]);
    // The core's first six rows are v451's exactly.
    expect(display.slice(0, 6)).toEqual(["last", "current", "now", "hero", "gap", "after"]);
  });

  it("the walk stops at the first element that does not fit — a later, smaller element is not seated past the hole", () => {
    // Core items (no gaps) cost 196; a 301 signal leaves
    // 229, so 33 remains — the extension's first item (34)
    // does not fit, and the gap behind it (32, which WOULD
    // fit alone) is not seated past the hole.
    const c: Candidates = { ...NONE, last: true, current: true, hero: true, after: true };
    const display = selectRailRowsMirror(c, false, ["xitem", "xgap", "xitem"], 301);
    expect(display).toEqual(["last", "current", "now", "hero", "after"]);
    expect(display).not.toContain("xgap");
    expect(display).not.toContain("xitem");
  });

  it("a standard-height placement renders exactly the v451 selection — no extension rows", () => {
    // His v449 height, 232: the v451 selection at this
    // height is last / current / hero (the after row is
    // dropped whole), and with the core not fully seated
    // the extension never starts — candidates or not.
    const c: Candidates = { ...NONE, last: true, current: true, hero: true, gap: true, after: true };
    expect(selectRailRowsMirror(c, false, ["xitem", "xgap", "xitem"], 232)).toEqual(["last", "current", "hero"]);
  });

  it("the walk can also stop midway: a gap seats on the leftover, the item behind it does not", () => {
    // Core (with its gap) costs 228; a 340 signal leaves
    // 268, so 40 remains: the extension's gap (32) seats,
    // its item (34) finds 8 and stops the walk.
    const c: Candidates = { ...NONE, last: true, current: true, hero: true, gap: true, after: true };
    const display = selectRailRowsMirror(c, false, ["xgap", "xitem"], 340);
    expect(display).toEqual(["last", "current", "now", "hero", "gap", "after", "xgap"]);
  });

  it("a very tall placement seats the whole remaining day — and the past side still seats exactly one last row", () => {
    // Nothing running: core last / NOW / hero / after costs
    // 64 + 30 + 34 + 34 = 162; the remaining day (three
    // items with their two gap boxes, 166) seats whole
    // under it at a 480 signal.
    const c: Candidates = { ...NONE, last: true, hero: true, after: true };
    const display = selectRailRowsMirror(c, false, ["xitem", "xgap", "xitem", "xgap", "xitem"], 480);
    expect(display).toEqual(["last", "now", "hero", "after", "xitem", "xgap", "xitem", "xgap", "xitem"]);
    expect(display.filter((k) => k === "last")).toHaveLength(1);
    // Even with height to burn, there is never a second
    // past row: the extension reads the day ahead only.
    const taller = selectRailRowsMirror(c, false, ["xitem", "xgap", "xitem", "xgap", "xitem"], 1200);
    expect(taller.filter((k) => k === "last")).toHaveLength(1);
  });

  it("under a running event's box, the extension seats below the after row the same way", () => {
    // Dinner's evening, taller: last / box / gap / next /
    // after costs 64 + 34 + 34 + 34 + 32 = 198 of 408; the
    // rest of the night walks in under the after row.
    const c: Candidates = { ...NONE, last: true, hero: true, gap: true, next: true, after: true };
    const display = selectRailRowsMirror(c, true, ["xitem", "xgap", "xitem"], 480);
    expect(display).toEqual(["last", "hero", "gap", "next", "after", "xitem", "xgap", "xitem"]);
    expect(display).not.toContain("now");
  });

  it("if the core itself could not fully seat, there is no extension — even when a gap alone would fit the leftover", () => {
    // Hero + NOW cost 94; a 199 signal leaves 127, so 33
    // remains and the after row (34) is dropped whole. The
    // extension's leading gap (32) would fit what is left,
    // but the gate is the core standing, not the leftover:
    // nothing seats.
    const c: Candidates = { ...NONE, hero: true, after: true };
    const display = selectRailRowsMirror(c, false, ["xgap", "xitem"], 199);
    expect(display).toEqual(["now", "hero"]);
  });

  it("the rail's nine slots cap the walk at a very tall placement", () => {
    // Core display is five rows; eight more items are
    // standing in the day and the budget could pay for all
    // of them — the walk stops at nine rows total.
    const c: Candidates = { ...NONE, last: true, current: true, hero: true, after: true };
    const ext: ExtRow[] = ["xitem", "xitem", "xitem", "xitem", "xitem", "xitem", "xitem", "xitem"];
    const display = selectRailRowsMirror(c, false, ext, 2000);
    expect(display).toHaveLength(9);
    expect(display.filter((k) => k === "xitem")).toHaveLength(4);
    expect(display.slice(0, 5)).toEqual(["last", "current", "now", "hero", "after"]);
  });
});
