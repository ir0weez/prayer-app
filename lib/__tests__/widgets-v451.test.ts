/**
 * v451 — Up Next: the box belongs to the CURRENT event.
 * Jonathan, on the v450 render (Nov 5, 20:01): "I want
 * 'Now' to be the current event until that event is over.
 * It should have the box around it with what's coming up
 * right under it."
 *
 * The screenshot behind it: Dinner (an event, 8:00–9:00 PM,
 * running) stood as a PLAIN row, a separate "8:01 PM NOW"
 * marker row trailed underneath it, and no hero band
 * appeared at all — the accumulated design had assigned the
 * box to "next up" and made NOW its own row, so a running
 * event fell between the two and got neither.
 *
 * The rule, all in the render-time path of renderUpNext
 * (the dayItems recomputation — the legacy-entries fallback
 * keeps its v450 behaviour untouched):
 *  - A running timed event (uncompleted, carrying a stored
 *    end — hasEnd — with start ≤ now < end; latest start
 *    wins) IS Now: it takes the hero box and keeps it until
 *    the event ends. Its pill counts the time LEFT in it
 *    (remainingText — countdownText's voice, suffix flipped)
 *    instead of the time until a start.
 *  - No NOW marker row is drawn while a running event holds
 *    the box: selectRailRows takes a heroRunning flag and
 *    never chooses the NOW row when it is set.
 *  - What's coming up sits directly under the box: the next
 *    item rides a new `next` row (a plain item), then the
 *    one-after row — the v450 cap stands (last / box / next /
 *    after, four item rows, budget heightSignal − 56 − 16,
 *    nothing clipped). The open stretch between the running
 *    event's END and the next item's start (≥ 15 min) is the
 *    gap candidate, seated under the box in rail order.
 *  - A current TODO (no stored end, hasEnd false) does NOT
 *    take the box — the arrangement on his screen at 18:01
 *    (Feed todo plain, Dinner boxed as next) was approved;
 *    the box-for-current rule is for timed events with an
 *    end. A point item caught mid-window next to a running
 *    event keeps its plain current row above the box.
 *
 * The Kotlin renderer cannot execute in this harness, so —
 * as in every round — the behaviour is pinned two ways:
 * source assertions on the real renderer, and an executable
 * mirror of the selection whose constants, gates and step
 * order are tied to that source by the tie pins below.
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
// A line-for-line translation of selectRailRows (v451). The
// tie pins in the third describe block hold its budget,
// costs, gates and step order to the Kotlin source.

interface Candidates {
  last: boolean;
  current: boolean;
  hero: boolean;
  nowGap: boolean;
  gap: boolean;
  after: boolean;
  next: boolean;
}

function selectRailRowsMirror(c: Candidates, heroRunning: boolean, heightSignal: number): string[] {
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

// ─── 1. The running check and the box binding, on the source ────────────────

describe("v451 Up Next — the running event takes the box (source)", () => {
  const body = rendererFn("renderUpNext");

  it("the running check lives in the dayItems path: uncompleted, hasEnd, start ≤ now < end", () => {
    expect(body).toContain("val runningIdx = dayItems.indices");
    expect(body).toContain(
      ".filter { !dayItems[it].completed && dayItems[it].hasEnd && dayItems[it].startMinutes <= nowMin && nowMin < dayItems[it].endMinutes }",
    );
    // Latest start wins — the current pick's own tie-break,
    // already the render-time path's sort.
    const runningAt = body.indexOf("val runningIdx = dayItems.indices");
    const sortAt = body.indexOf("sortedByDescending { dayItems[it].startMinutes }", runningAt);
    expect(sortAt).toBeGreaterThan(runningAt);
  });

  it("a point item never takes the box: the hasEnd gate is what the current pick lacks", () => {
    // The broad current pick reads the same window WITHOUT
    // hasEnd (a point todo's endMinutes is a rule-made
    // default, not an end the day holds).
    expect(body).toContain(
      ".filter { !dayItems[it].completed && dayItems[it].startMinutes <= nowMin && nowMin < dayItems[it].endMinutes }",
    );
  });

  it("the box binds to the running item: hero row built from it, END in the minutes slot, heroLeft set", () => {
    expect(body).toContain("val heroRunning = runningIdx != null");
    expect(body).toContain(
      'RailRow("hero", minutesToTimeLabel(item.startMinutes), item.title, item.sub, item.endMinutes, "", heroLeft = true)',
    );
    // The next-up box is built exactly as before.
    expect(body).toContain(
      'RailRow("hero", minutesToTimeLabel(item.startMinutes), item.title, item.sub, item.startMinutes, "")',
    );
  });

  it("when the running event IS the current, the plain current row stands down", () => {
    expect(body).toContain("currentIdx != null && currentIdx != runningIdx");
  });

  it("the next item renders as a plain item row, and the under-box gap runs from the event's END", () => {
    expect(body).toContain(
      'nextRow = RailRow("item", minutesToTimeLabel(next1.startMinutes), next1.title, next1.sub, next1.startMinutes, "")',
    );
    expect(body).toContain("val boxGapMinutes = next1.startMinutes - running.endMinutes");
    expect(body).toContain("if (boxGapMinutes >= 15)");
    expect(body).toContain('gapRow = RailRow("gap", "", "", "", 0, openDurationText(boxGapMinutes))');
  });

  it("the fallback path passes no running box — its v450 behaviour cannot regress", () => {
    // v453 re-pin: both call sites also pass the extension
    // list (Jonathan's Nov 6 pick, "Tall size shows more of
    // the day again") — the fallback hands over an empty
    // list, so it gains neither the running box nor the
    // tall extension.
    expect(body).toContain(
      "selectRailRows(lastRow, currentRow, heroRow, null, gapRow, afterRow, null, false, emptyList(), heightSignal)",
    );
    expect(body).toContain(
      "selectRailRows(lastRow, currentRow, heroRow, nowGapRow, gapRow, afterRow, nextRow, heroRunning, extensionRows, heightSignal)",
    );
  });
});

// ─── 2. The pill: LEFT for a running box, IN for a next-up box ──────────────

describe("v451 Up Next — the band's pill (source)", () => {
  it("remainingText mirrors countdownText's shapes with the LEFT suffix", () => {
    const left = rendererFn("remainingText");
    expect(left).toContain('if (diff < 60) return "$diff MIN LEFT"');
    expect(left).toContain('return if (m == 0) "$h H LEFT" else "$h H $m MIN LEFT"');
    // countdownText itself is untouched.
    const into = rendererFn("countdownText");
    expect(into).toContain('if (diff < 60) return "IN $diff MIN"');
    expect(into).toContain('return if (m == 0) "IN $h H" else "IN $h H $m MIN"');
  });

  it("the hero branch dispatches the pill on heroLeft", () => {
    const slot = rendererFn("fillRailSlot");
    expect(slot).toContain(
      "if (row.heroLeft) remainingText(row.startMinutes, nowMinutes()) else countdownText(row.startMinutes, nowMinutes())",
    );
  });

  it("the RailRow carries the heroLeft flag, defaulted off", () => {
    expect(renderer).toContain("val heroLeft: Boolean = false");
  });
});

// ─── 3. The tie pins: the mirror IS the Kotlin selection ────────────────────

describe("v451 Up Next — mirror ties to the Kotlin source", () => {
  const sel = rendererFn("selectRailRows");

  it("the budget and the four-item cap are unchanged: heightSignal − 56 − 16, hero 64, plain 34, NOW 30, gap 32", () => {
    expect(sel).toContain("val railBudget = heightSignal - 56 - 16");
    expect(sel).toContain("next != null && 34 <= remaining");
    expect(sel).toContain("remaining -= 64");
    expect(sel).toContain("remaining -= 34");
    expect(sel).toContain("remaining -= 30");
    expect(sel).toContain("remaining -= 32");
  });

  it("the NOW row is gated on the box being free — at the anchor step and at the trailing step", () => {
    expect(sel).toContain("} else if (!heroRunning) {");
    expect(sel).toContain("if (current != null && !nowChosen && !heroRunning && 30 <= remaining)");
  });

  it("the step order is the source's: hero, current-anchor, last, next, after, trailing NOW, gaps", () => {
    const heroAt = sel.indexOf("heroChosen = true");
    const currentAt = sel.indexOf("currentChosen = true", heroAt);
    const lastAt = sel.indexOf("lastChosen = true", currentAt);
    const nextAt = sel.indexOf("nextChosen = true", lastAt);
    const afterAt = sel.indexOf("afterChosen = true", nextAt);
    const nowExtraAt = sel.indexOf("nowChosen = true", afterAt);
    const nowGapAt = sel.indexOf("nowGapChosen = true", nowExtraAt);
    const gapAt = sel.indexOf("gapChosen = true", nowGapAt);
    for (const at of [heroAt, currentAt, lastAt, nextAt, afterAt, nowExtraAt, nowGapAt, gapAt]) {
      expect(at).toBeGreaterThan(-1);
    }
    expect(heroAt).toBeLessThan(currentAt);
    expect(currentAt).toBeLessThan(lastAt);
    expect(lastAt).toBeLessThan(nextAt);
    expect(nextAt).toBeLessThan(afterAt);
    expect(afterAt).toBeLessThan(nowExtraAt);
    expect(nowExtraAt).toBeLessThan(nowGapAt);
    expect(nowGapAt).toBeLessThan(gapAt);
  });

  it("the display order is the source's: last, current, NOW, nowGap, hero, gap, next, after", () => {
    const adds = [
      "display.add(last)",
      "display.add(current)",
      "display.add(nowRow)",
      "display.add(nowGap)",
      "display.add(hero)",
      "display.add(gap)",
      "display.add(next)",
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

// ─── 4. The fixtures: his evenings through the selection ────────────────────

describe("v451 Up Next — fixture heights through the selection", () => {
  it("his 8:01 PM screenshot, re-run: Dinner boxed, Feed above it, and NO Now row at any height", () => {
    // The render-time path hands the selection: last = Feed
    // (done), hero = Dinner (running), no plain current (the
    // box replaced it), nothing ahead. The v450 selection
    // seated a trailing NOW row under Dinner; v451 never
    // seats one while the box is held.
    const c: Candidates = { ...NONE, last: true, hero: true };
    expect(selectRailRowsMirror(c, true, 232)).toEqual(["last", "hero"]);
    expect(selectRailRowsMirror(c, true, 480)).toEqual(["last", "hero"]);
    expect(selectRailRowsMirror(c, true, 480)).not.toContain("now");
  });

  it("what's coming up sits directly under the box: last / box / gap / next / after, four item rows", () => {
    const c: Candidates = { ...NONE, last: true, hero: true, gap: true, next: true, after: true };
    const display = selectRailRowsMirror(c, true, 480);
    expect(display).toEqual(["last", "hero", "gap", "next", "after"]);
    const items = display.filter((k) => ["last", "hero", "next", "after"].includes(k));
    expect(items).toHaveLength(4);
    expect(display).not.toContain("now");
    // The next row stands immediately under the box (the gap
    // box, when one seats, is the open time itself, in rail
    // order between them).
    expect(display.indexOf("next")).toBe(display.indexOf("hero") + 2);
  });

  it("without a gap, next is the very next row under the box", () => {
    const c: Candidates = { ...NONE, last: true, hero: true, next: true, after: true };
    const display = selectRailRowsMirror(c, true, 480);
    expect(display).toEqual(["last", "hero", "next", "after"]);
    expect(display.indexOf("next")).toBe(display.indexOf("hero") + 1);
  });

  it("a point item mid-window beside a running event keeps its plain row — and still no NOW row", () => {
    // A todo with no stored end, started after the event:
    // current (plain) + the event's box + next + after.
    const c: Candidates = { ...NONE, last: true, current: true, hero: true, next: true, after: true };
    const display = selectRailRowsMirror(c, true, 480);
    expect(display).toEqual(["last", "current", "hero", "next", "after"]);
    expect(display).not.toContain("now");
  });

  it("his 18:01 arrangement is untouched: a current todo does not take the box, and the v450 shape stands", () => {
    // Feed (todo, no end) plain as current; Dinner the next
    // up in the box; heroRunning false. At his v449 height
    // the selection is the v450 one, row for row.
    const c: Candidates = { ...NONE, last: true, current: true, hero: true, gap: true, after: true };
    expect(selectRailRowsMirror(c, false, 232)).toEqual(["last", "current", "hero"]);
    expect(selectRailRowsMirror(c, false, 480)).toEqual(["last", "current", "now", "hero", "gap", "after"]);
  });

  it("nothing running and nothing current: the NOW row stands in its rail place, as v450", () => {
    const c: Candidates = { ...NONE, last: true, hero: true, nowGap: true, after: true };
    expect(selectRailRowsMirror(c, false, 400)).toEqual(["last", "now", "nowGap", "hero", "after"]);
  });

  it("a tight height keeps the box and drops whole rows — never a clipped one", () => {
    // Budget 118: the box (64, always chosen) and the last
    // row (34) seat; next and after find 20 left and are
    // left out whole.
    const c: Candidates = { ...NONE, last: true, hero: true, next: true, after: true };
    expect(selectRailRowsMirror(c, true, 190)).toEqual(["last", "hero"]);
  });

  it("an item always beats a gap for the leftover budget, running box or not", () => {
    // Box 64 + next 34 = 98; heightSignal 200 makes the
    // budget 128, leaving 30 after the next row is in — the
    // 32 gap finds nothing and stays out.
    const c: Candidates = { ...NONE, hero: true, gap: true, next: true };
    expect(selectRailRowsMirror(c, true, 200)).toEqual(["hero", "next"]);
    // 2 more of signal leaves exactly 32 and the gap takes
    // the leftover, seated in rail order under the box.
    expect(selectRailRowsMirror(c, true, 202)).toEqual(["hero", "gap", "next"]);
  });
});
