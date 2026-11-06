/**
 * v450 — Up Next's composition is FIXED. Jonathan, on the
 * v449 render (Nov 5, 18:01): "Shouldn't there just be one
 * past event, and one after event, then the next up in the
 * box (centered), and the white spaces wherever they fit?"
 * The screenshot behind it: last (5:30 PM Photo, struck,
 * green check), current (6:00 PM Feed), hero band (Dinner,
 * IN 2 H) — and a FOURTH item row (10:00 PM) seated anyway,
 * sitting half-clipped at the card's bottom edge, with no
 * gap box anywhere.
 *
 * The fix, in selectRailRows (the ONE selection both the
 * render-time path and the entries fallback run):
 *  - At most FOUR item rows, ever: one last, one current
 *    (or the NOW row when nothing is running), the hero in
 *    its band at the stack's centre, and one after. The
 *    second following item is gone — the renderer no longer
 *    names anything past the after (next2 is deleted from
 *    the renderer outright; the after comes from
 *    aheadIdx[1] and aheadIdx[2] is never read).
 *  - Nothing clipped, ever: the budget plans against
 *    heightSignal − 56 − 16. The − 56 is v447's chrome
 *    allowance (the footer's space went to the rail); the
 *    extra − 16 is a safety margin, because the height
 *    signal has overestimated the placed height three
 *    rounds running (v443, v444, v449). A dropped row is
 *    acceptable; a clipped row is the failure.
 *  - Gap boxes "wherever they fit": gaps are computed
 *    exactly as before (between items, plus v447's
 *    NOW→next stretch), but they are seated LAST, in rail
 *    order, only from the budget the item rows left over —
 *    each whole or not at all, and never displacing an
 *    item row. (In v447's order the NOW→next gap was
 *    chosen BEFORE the last row and could starve it out.)
 *
 * The Kotlin renderer cannot execute in this harness, so —
 * as in every round — the composition is pinned two ways:
 * source assertions on the real renderer, and an executable
 * mirror of the selection whose constants, gates and step
 * order are tied to that source by the tie pins below. If
 * the Kotlin drifts from the mirror, the ties fail.
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
// A line-for-line translation of selectRailRows (v450). The
// tie pins in the next describe block hold its budget,
// costs, gates and step order to the Kotlin source.

interface Candidates {
  last: boolean;
  current: boolean;
  hero: boolean;
  nowGap: boolean;
  gap: boolean;
  after: boolean;
}

function selectRailRowsMirror(c: Candidates, heightSignal: number): string[] {
  let remaining = heightSignal - 56 - 16;
  const chosen = {
    last: false,
    current: false,
    now: false,
    hero: false,
    after: false,
    nowGap: false,
    gap: false,
  };
  // (1) hero — always chosen.
  if (c.hero) {
    chosen.hero = true;
    remaining -= 64;
  }
  // (2) current if present, else the NOW row — always chosen.
  if (c.current) {
    chosen.current = true;
    remaining -= 34;
  } else {
    chosen.now = true;
    remaining -= 30;
  }
  // (3) last — when it fits.
  if (c.last && 34 <= remaining) {
    chosen.last = true;
    remaining -= 34;
  }
  // (4) after — when it fits.
  if (c.after && 34 <= remaining) {
    chosen.after = true;
    remaining -= 34;
  }
  // (5) the NOW row when a current exists — when it fits.
  if (c.current && !chosen.now && 30 <= remaining) {
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
  if (chosen.after) display.push("after");
  return display;
}

// ─── 1. The fixed composition, pinned on the source ─────────────────────────

describe("v450 Up Next — the fixed composition in the renderer source", () => {
  const sel = rendererFn("selectRailRows");
  const body = rendererFn("renderUpNext");

  it("there is no next2 anywhere in the renderer — nothing past the after is a candidate", () => {
    expect(renderer).not.toContain("next2");
  });

  it("the selection takes exactly the fixed set: last, current, hero, nowGap, gap, after", () => {
    // v451 re-pin: the selection also takes `next` (the item
    // directly under a running event's box) and `heroRunning`
    // (the box-ownership flag) — Jonathan's ruling on the
    // v450 render: "I want 'Now' to be the current event
    // until that event is over. It should have the box around
    // it with what's coming up right under it." The fixed
    // four-item set itself is unchanged.
    expect(sel).toContain(
      "last: RailRow?,\n    current: RailRow?,\n    hero: RailRow?,\n    nowGap: RailRow?,\n    gap: RailRow?,\n    after: RailRow?,\n    next: RailRow?,\n    heroRunning: Boolean,",
    );
  });

  it("the render-time path names hero = ahead[0] and after = ahead[1], and never reads ahead[2]", () => {
    expect(body).toContain("val next1Idx = aheadIdx.getOrNull(0)");
    expect(body).toContain("val afterIdx = aheadIdx.getOrNull(1)");
    expect(body).not.toContain("aheadIdx.getOrNull(2)");
    expect(body).toContain("afterRow = RailRow(\"item\"");
  });

  it("the budget carries the safety margin: heightSignal − 56 − 16", () => {
    expect(sel).toContain("val railBudget = heightSignal - 56 - 16");
  });

  it("both paths run the one selection with the after row", () => {
    // v451 re-pin: both call sites pass the two new arguments
    // (the render-time path hands over its next row and the
    // running flag; the fallback hands over neither — its
    // frozen walk keeps the v450 behaviour).
    expect(body).toContain(
      "selectRailRows(lastRow, currentRow, heroRow, nowGapRow, gapRow, afterRow, nextRow, heroRunning, heightSignal)",
    );
    expect(body).toContain(
      "selectRailRows(lastRow, currentRow, heroRow, null, gapRow, afterRow, null, false, heightSignal)",
    );
  });
});

// ─── 2. The tie pins: the mirror IS the Kotlin selection ────────────────────

describe("v450 Up Next — mirror ties to the Kotlin source", () => {
  const sel = rendererFn("selectRailRows");

  it("the costs are the source's: hero 64, plain 34, NOW 30, gap 32", () => {
    expect(sel).toContain("remaining -= 64");
    expect(sel).toContain("remaining -= 34");
    expect(sel).toContain("remaining -= 30");
    expect(sel).toContain("remaining -= 32");
    expect(sel).toContain("last != null && 34 <= remaining");
    expect(sel).toContain("after != null && 34 <= remaining");
    expect(sel).toContain("nowGap != null && 32 <= remaining");
    expect(sel).toContain("gap != null && 32 <= remaining");
  });

  it("the step order is the source's: items in priority order, then gaps in rail order", () => {
    const heroAt = sel.indexOf("heroChosen = true");
    const currentAt = sel.indexOf("currentChosen = true", heroAt);
    const lastAt = sel.indexOf("lastChosen = true", currentAt);
    const afterAt = sel.indexOf("afterChosen = true", lastAt);
    const nowExtraAt = sel.indexOf("nowChosen = true", afterAt);
    const nowGapAt = sel.indexOf("nowGapChosen = true", nowExtraAt);
    const gapAt = sel.indexOf("gapChosen = true", nowGapAt);
    for (const at of [heroAt, currentAt, lastAt, afterAt, nowExtraAt, nowGapAt, gapAt]) {
      expect(at).toBeGreaterThan(-1);
    }
    expect(heroAt).toBeLessThan(currentAt);
    expect(currentAt).toBeLessThan(lastAt);
    expect(lastAt).toBeLessThan(afterAt);
    expect(afterAt).toBeLessThan(nowExtraAt);
    expect(nowExtraAt).toBeLessThan(nowGapAt);
    expect(nowGapAt).toBeLessThan(gapAt);
  });

  it("the display order is the source's: last, current, NOW, nowGap, hero, gap, after", () => {
    const adds = [
      "display.add(last)",
      "display.add(current)",
      "display.add(nowRow)",
      "display.add(nowGap)",
      "display.add(hero)",
      "display.add(gap)",
      "display.add(after)",
    ];
    let prev = -1;
    for (const add of adds) {
      const at = sel.indexOf(add, prev + 1);
      expect(at, add).toBeGreaterThan(prev);
      prev = at;
    }
  });
});

// ─── 3. The fixtures: the composition under real heights ────────────────────

describe("v450 Up Next — fixture heights through the selection", () => {
  const full: Candidates = {
    last: true,
    current: true,
    hero: true,
    nowGap: false,
    gap: true,
    after: true,
  };

  it("a tall placement seats exactly last / current / NOW / hero / gap / after — four item rows, no fifth", () => {
    // A day with 6+ items still standing: the render-time
    // path only ever names hero (ahead[0]) and after
    // (ahead[1]) as candidates (pinned above), so this
    // candidate set IS the whole story at any height.
    const display = selectRailRowsMirror(full, 480);
    expect(display).toEqual(["last", "current", "now", "hero", "gap", "after"]);
    const items = display.filter((k) => ["last", "current", "hero", "after"].includes(k));
    expect(items).toHaveLength(4);
  });

  it("his v449 height: the after row is dropped WHOLE rather than seated half-clipped", () => {
    // heightSignal 232: v449's budget (232 − 56 = 176) seated
    // all four item rows (166) and the row clipped on his
    // phone. v450's budget is 160: hero 64 + current 34 +
    // last 34 = 132, leaving 28 — the after (34) and the
    // trailing NOW (30) no longer fit and are left out whole.
    const display = selectRailRowsMirror(full, 232);
    expect(display).toEqual(["last", "current", "hero"]);
  });

  it("when items + gap exceed the budget, the items seat and the gap does not", () => {
    // All five item rows cost 64 + 34 + 34 + 34 + 30 = 196;
    // heightSignal 268 makes the budget exactly 196 — nothing
    // is left for the 32 gap.
    const display = selectRailRowsMirror(full, 268);
    expect(display).toEqual(["last", "current", "now", "hero", "after"]);
    expect(display).not.toContain("gap");
  });

  it("with room to spare, the gap takes the leftover and seats", () => {
    // 32 more of signal than the case above: the gap fits
    // exactly into what the items left over.
    const display = selectRailRowsMirror(full, 300);
    expect(display).toEqual(["last", "current", "now", "hero", "gap", "after"]);
  });

  it("a gap never displaces an item: the last row beats the NOW→next gap for the same budget", () => {
    // Nothing running; hero + NOW + last cost 64 + 30 + 34 =
    // 128, and heightSignal 200 makes the budget exactly 128.
    // v447's order chose the nowGap (32) BEFORE the last row
    // and starved it out; v450 seats the item first and the
    // gap finds nothing left.
    const display = selectRailRowsMirror(
      { last: true, current: false, hero: true, nowGap: true, gap: false, after: false },
      200,
    );
    expect(display).toEqual(["last", "now", "hero"]);
    expect(display).not.toContain("nowGap");
  });

  it("the NOW→next gap still seats when the items leave room for it", () => {
    const display = selectRailRowsMirror(
      { last: true, current: false, hero: true, nowGap: true, gap: false, after: true },
      400,
    );
    expect(display).toEqual(["last", "now", "nowGap", "hero", "after"]);
  });

  it("short height keeps the v445 priority shape: hero and the now-anchor are always chosen", () => {
    // Budget 118: hero (64) + current (34) are chosen
    // unconditionally; nothing else fits.
    expect(selectRailRowsMirror(full, 190)).toEqual(["current", "hero"]);
    // Nothing running: hero (64) + NOW (30), budget 98.
    expect(
      selectRailRowsMirror(
        { last: true, current: false, hero: true, nowGap: true, gap: true, after: true },
        170,
      ),
    ).toEqual(["now", "hero"]);
  });
});
