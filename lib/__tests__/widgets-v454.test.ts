/**
 * v454 — Up Next: the box and the white space. Two of
 * Jonathan's rulings from the same morning (Nov 6), both
 * made on the 8:57 AM render — NOW row standing, Self-Care
 * boxed "IN 3 MIN", nothing running yet.
 *
 * RULING 1 (08:58) — the crossed-out box: "can we make the
 * box in the widget show the crossed out event or todo IN
 * the box rather than just disappearing?" When the item
 * that would hold the box (the running event, or the next
 * up) is checked off, the box used to jump to the next item
 * and the finished one vanished. Now the finished item
 * HOLDS the box, struck through, its pill reading DONE,
 * until the next item's start time arrives and the box
 * passes on; what's coming up waits as the plain row
 * directly under the box. The holder is the completed item
 * nearest before the would-be box item in the day's order
 * whose own window has not fully passed and whose
 * successor has not started — the running event checked
 * off mid-run, the next up checked off early; of two
 * checked early in a row, the later holds the box and the
 * earlier becomes the struck last row once its window has
 * passed. An item checked after its window passed was
 * never in the box when checked: it does not hold, it is
 * the last row's business. With no successor at all, the
 * holder keeps the box as the day's last word.
 *
 * RULING 2 (08:59) — white-space placement: "The white
 * space should only show up after the boxed event, or IN
 * the boxed event when it's a white space time." So:
 *  - NO gap box stands anywhere before the box. The v447
 *    nowGap candidate (the white box between the NOW row
 *    and the hero) is gone from the renderer entirely.
 *    Gaps downstream of the box stay: the under-box gap
 *    (the boxed item's end to the next item's start) and
 *    the v453 extension's gaps, all after the box by
 *    construction.
 *  - When nothing is running, no struck item holds, and
 *    he is standing inside an open stretch (from max(now,
 *    the previous item's end) to the next item's start,
 *    ≥ 15 minutes — v447's own measurement), the BOX ITSELF
 *    becomes the white space: white-block dress at box
 *    scale, the open stretch's wording inside it, the pill
 *    counting down to the next item in the hero pill's IN
 *    idiom, the next item as the plain row directly under
 *    it, and NO separate NOW row — the box IS now. Under
 *    15 minutes the next item is imminent and the behaviour
 *    is exactly v451's (NOW row + the next up in the box).
 *
 * Box priority, unified: running event → struck-held
 * completed item → the white space → the next up.
 * Composition check against his example (from the ruling):
 * Dinner (8–9 PM) checked off at 8:30, next item 10 PM →
 * box = struck Dinner; under it the white box for the open
 * stretch from Dinner's end to 10 PM; then the 10 PM row.
 *
 * What does not move: the fixed core seats first with the
 * same budget (heightSignal − 56 − 16) and whole-or-nothing
 * seating; the v453 extension walks only from the core's
 * leftover, stops at the first misfit, the past side never
 * extends, the nine-slot cap stands; the legacy-entries
 * fallback keeps its behaviour (its entries' done kind
 * already renders struck as the last row; it seats no
 * struck box and no white box); header + LEFT chip are
 * unchanged. The snapshot needed nothing: dayItems already
 * carry each item's completion state and start/end.
 *
 * The Kotlin renderer cannot execute in this harness, so —
 * as in every round — the behaviour is pinned two ways:
 * source assertions on the real renderer, and executable
 * mirrors (the selection, as before; and the box decision —
 * running / struck / white / next — translated line for
 * line from renderUpNext's recomputation) whose gates and
 * constants are tied to that source by the pins below.
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

// ─── The executable mirrors ─────────────────────────────────────────────────
// (a) The selection — a line-for-line translation of
// selectRailRows (v454): no nowGap candidate exists in it,
// and the NOW gates read boxIsNow. Extension rows ride as
// "xitem" / "xgap" (the v453 convention). The tie pins in
// the fourth describe block hold its budget, costs, gates
// and step order to the Kotlin source.

type ExtRow = "xitem" | "xgap";

interface Candidates {
  last: boolean;
  current: boolean;
  hero: boolean;
  gap: boolean;
  after: boolean;
  next: boolean;
}

function selectRailRowsMirror(
  c: Candidates,
  boxIsNow: boolean,
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
    gap: false,
  };
  // (1) hero — always chosen.
  if (c.hero) {
    chosen.hero = true;
    remaining -= 64;
  }
  // (2) current if present, else the NOW row — always
  // chosen, except the NOW row while the box IS now.
  if (c.current) {
    chosen.current = true;
    remaining -= 34;
  } else if (!boxIsNow) {
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
  // and never while the box IS now.
  if (c.current && !chosen.now && !boxIsNow && 30 <= remaining) {
    chosen.now = true;
    remaining -= 30;
  }
  // The gap row last — the under-box gap is the only gap
  // candidate; no gap stands before the box.
  if (c.gap && 32 <= remaining) {
    chosen.gap = true;
    remaining -= 32;
  }
  const display: string[] = [];
  if (chosen.last) display.push("last");
  if (chosen.current) display.push("current");
  if (chosen.now) display.push("now");
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
  gap: false,
  after: false,
  next: false,
};

// (b) The box decision — a line-for-line translation of
// renderUpNext's render-time recomputation of WHO holds
// the box (the ahead / current / running picks, the v454
// struck candidacy, the last pick, and the open-stretch
// measurement), returning the box kind the renderer would
// build. Items carry their endMinutes as the snapshot
// bakes them (a point item's end is its rule-made default,
// +30 for a todo — hasEnd is what tells it apart).

interface MirrorItem {
  start: number;
  end: number;
  hasEnd: boolean;
  completed: boolean;
}

interface BoxDecision {
  box: "running" | "struck" | "white" | "next" | null;
  struckIndex: number | null;
  lastIndex: number | null;
  openMinutes: number;
  boxIsNow: boolean;
}

function boxDecisionMirror(items: MirrorItem[], nowMin: number): BoxDecision {
  const overAt = (item: MirrorItem) => (item.hasEnd ? item.end : item.start);
  const aheadIdx = items
    .map((_, i) => i)
    .filter((i) => !items[i].completed && items[i].start > nowMin)
    .sort((a, b) => items[a].start - items[b].start);
  const currentIdx =
    items
      .map((_, i) => i)
      .filter((i) => !items[i].completed && items[i].start <= nowMin && nowMin < items[i].end)
      .sort((a, b) => items[b].start - items[a].start)[0] ?? null;
  const runningIdx =
    items
      .map((_, i) => i)
      .filter(
        (i) =>
          !items[i].completed &&
          items[i].hasEnd &&
          items[i].start <= nowMin &&
          nowMin < items[i].end,
      )
      .sort((a, b) => items[b].start - items[a].start)[0] ?? null;
  const next1Idx = aheadIdx[0] ?? null;
  const afterIdx = aheadIdx[1] ?? null;
  const chronoIdx = items.map((_, i) => i).sort((a, b) => items[a].start - items[b].start);
  let struckIdx: number | null = null;
  if (runningIdx === null) {
    const anchorPos = next1Idx !== null ? chronoIdx.indexOf(next1Idx) : chronoIdx.length;
    let candPos = -1;
    for (let p = 0; p < anchorPos; p += 1) {
      const idx = chronoIdx[p];
      if (items[idx].completed && overAt(items[idx]) > nowMin) candPos = p;
    }
    if (candPos >= 0) {
      const succIdx = chronoIdx[candPos + 1] ?? null;
      if (succIdx === null || items[succIdx].start > nowMin) {
        struckIdx = chronoIdx[candPos];
      }
    }
  }
  const chosen = new Set(
    [currentIdx, runningIdx, next1Idx, afterIdx].filter((x): x is number => x !== null),
  );
  const lastIdx =
    items
      .map((_, i) => i)
      .filter((i) => !chosen.has(i) && overAt(items[i]) <= nowMin)
      .sort((a, b) => overAt(items[b]) - overAt(items[a]) || items[b].start - items[a].start)[0] ??
    null;
  let openMinutes = 0;
  if (currentIdx === null && next1Idx !== null) {
    const prevEnd = lastIdx !== null ? overAt(items[lastIdx]) : nowMin;
    openMinutes = items[next1Idx].start - Math.max(nowMin, prevEnd);
  }
  let heroWhite = false;
  if (openMinutes >= 15) {
    heroWhite = runningIdx === null && struckIdx === null;
  }
  const box: BoxDecision["box"] =
    runningIdx !== null
      ? "running"
      : struckIdx !== null
        ? "struck"
        : heroWhite
          ? "white"
          : next1Idx !== null
            ? "next"
            : null;
  return {
    box,
    struckIndex: struckIdx,
    lastIndex: lastIdx,
    openMinutes,
    boxIsNow: runningIdx !== null || heroWhite,
  };
}

// ─── 1. Ruling 1 on the source: the struck candidacy ────────────────────────

describe("v454 Up Next — the struck holder, computed in the dayItems path (source)", () => {
  const body = rendererFn("renderUpNext");

  it("the candidacy walks the day in chronological order toward the would-be box item", () => {
    expect(body).toContain("val chronoIdx = dayItems.indices.sortedBy { dayItems[it].startMinutes }");
    // The anchor is the next up; with nothing ahead, the
    // whole day is the field (the no-successor hold).
    expect(body).toContain(
      "val anchorPos = next1Idx?.let { chronoIdx.indexOf(it) } ?: chronoIdx.size",
    );
  });

  it("a candidate must be completed with its window not fully passed — checked while it was in, or waiting for, the box", () => {
    expect(body).toContain(
      "if (dayItems[idx].completed && overAt(dayItems[idx]) > nowMin) candPos = p",
    );
    // "Over" is the item's own clock — stored end, else start.
    expect(body).toContain(
      "val overAt = { item: DayItem -> if (item.hasEnd) item.endMinutes else item.startMinutes }",
    );
  });

  it("the holder is confirmed only when its successor has not started — or it has none", () => {
    expect(body).toContain("val succIdx = chronoIdx.getOrNull(candPos + 1)");
    expect(body).toContain("if (succIdx == null || dayItems[succIdx].startMinutes > nowMin)");
    expect(body).toContain("struckIdx = chronoIdx[candPos]");
    expect(body).toContain("val struckItem = struckIdx?.let { dayItems[it] }");
  });

  it("a running event outranks the holder outright: the candidacy runs only when nothing is running", () => {
    const candidacyAt = body.indexOf("val chronoIdx = dayItems.indices");
    const gateAt = body.indexOf("if (runningIdx == null) {", candidacyAt);
    expect(gateAt).toBeGreaterThan(candidacyAt);
  });

  it("the quiet face now also requires that nothing holds the box struck", () => {
    expect(body).toContain("if (currentIdx == null && next1Idx == null && struckIdx == null)");
  });

  it("the struck item is never also the last row: its window has not passed, and the last pick only takes passed items", () => {
    // The last pick's gate is the candidacy gate's mirror:
    // overAt ≤ now. A holder (overAt > now) cannot be
    // chosen — no duplicate rows for one item.
    expect(body).toContain(".filter { it !in chosenIdx && overAt(dayItems[it]) <= nowMin }");
  });
});

// ─── 2. Ruling 2 on the source: the white box, and no gap before the box ────

describe("v454 Up Next — the box as the white space (source)", () => {
  const body = rendererFn("renderUpNext");

  it("the open stretch is measured exactly as v447 measured it — from max(now, the previous item's end)", () => {
    expect(body).toContain("if (currentIdx == null && next1Idx != null)");
    expect(body).toContain("val prevEnd = lastIdx?.let { overAt(dayItems[it]) } ?: nowMin");
    expect(body).toContain(
      "openMinutes = dayItems[next1Idx].startMinutes - maxOf(nowMin, prevEnd)",
    );
    expect(body).toContain("if (openMinutes >= 15)");
  });

  it("the white box stands only when neither a running event nor a struck holder owns the box", () => {
    expect(body).toContain("heroWhite = runningIdx == null && struckIdx == null");
  });

  it("the white row carries the stretch's wording and the next item's start, for the pill", () => {
    expect(body).toContain(
      'RailRow("whitebox", nowTimeLabel(), "", "", dayItems[next1Idx].startMinutes, openDurationText(openMinutes))',
    );
  });

  it("there is no nowGap anywhere in the render-time path — no gap candidate exists before the box", () => {
    expect(body).not.toContain("nowGapRow");
    expect(body).not.toContain('RailRow("gap", "", "", "", 0, openDurationText(openMinutes))');
  });

  it("the under-box gap for a struck holder runs from the holder's end to the next item's start", () => {
    expect(body).toContain("val struckGapMinutes = next1.startMinutes - overAt(struckItem)");
    expect(body).toContain("if (struckGapMinutes >= 15)");
    expect(body).toContain('gapRow = RailRow("gap", "", "", "", 0, openDurationText(struckGapMinutes))');
  });
});

// ─── 3. The box binding and the dresses (source) ────────────────────────────

describe("v454 Up Next — the box binding and its dresses (source)", () => {
  const body = rendererFn("renderUpNext");
  const slot = rendererFn("fillRailSlot");

  it("the box priority is running → struck → white → next up, in one construction", () => {
    const runningAt = body.indexOf('RailRow("hero", minutesToTimeLabel(item.startMinutes), item.title, item.sub, item.endMinutes, "", heroLeft = true)');
    const struckAt = body.indexOf('RailRow("heroDone"');
    const whiteAt = body.indexOf("whiteRow\n      } else {");
    const nextAt = body.indexOf('RailRow("hero", minutesToTimeLabel(item.startMinutes), item.title, item.sub, item.startMinutes, "")');
    expect(runningAt).toBeGreaterThan(-1);
    expect(struckAt).toBeGreaterThan(runningAt);
    expect(whiteAt).toBeGreaterThan(struckAt);
    expect(nextAt).toBeGreaterThan(whiteAt);
    expect(body).toContain(
      'RailRow("heroDone", minutesToTimeLabel(struckItem.startMinutes), struckItem.title, struckItem.sub, 0, "")',
    );
  });

  it("boxIsNow names exactly the two holders that ARE now: the running event and the white space", () => {
    expect(body).toContain("val heroRunning = runningIdx != null");
    expect(body).toContain("val boxIsNow = heroRunning || heroWhite");
  });

  it("both paths hand the selection the new argument set — no nowGap, boxIsNow in its place", () => {
    expect(body).toContain(
      "selectRailRows(lastRow, currentRow, heroRow, gapRow, afterRow, nextRow, boxIsNow, extensionRows, heightSignal)",
    );
    expect(body).toContain(
      "selectRailRows(lastRow, currentRow, heroRow, gapRow, afterRow, null, false, emptyList(), heightSignal)",
    );
  });

  it("the fallback builds neither new box: the heroDone and whitebox rows are each constructed exactly once, in the render-time path", () => {
    expect(body.split('RailRow("heroDone"').length - 1).toBe(1);
    expect(body.split('RailRow("whitebox"').length - 1).toBe(1);
  });

  it("the struck box wears the done dress inside the band: struck title, DONE pill in the reached green, the green check", () => {
    const at = slot.indexOf('"heroDone" -> {');
    expect(at).toBeGreaterThan(-1);
    const branch = slot.slice(at, at + 2200);
    expect(branch).toContain('setInt(id("band_img"), "setColorFilter", pal.container)');
    expect(branch).toContain(
      'setInt(id("htitle"), "setPaintFlags", Paint.ANTI_ALIAS_FLAG or Paint.STRIKE_THRU_TEXT_FLAG)',
    );
    expect(branch).toContain('setTextViewText(id("hcount"), "DONE")');
    expect(branch).toContain('setTextColor(id("hcount"), pal.green)');
    expect(branch).toContain('setImageViewBitmap(id("check"), checkBitmap(pal.green))');
  });

  it("the white box wears the white block's fill at box scale, its wording in the gap voice, the pill counting down in IN", () => {
    const at = slot.indexOf('"whitebox" -> {');
    expect(at).toBeGreaterThan(-1);
    const branch = slot.slice(at, at + 2200);
    expect(branch).toContain('setInt(id("band_img"), "setColorFilter", pal.surfaceAlt)');
    expect(branch).toContain('setTextViewText(id("htitle"), row.gapText)');
    expect(branch).toContain('setTextViewText(id("hcount"), countdownText(row.startMinutes, nowMinutes()))');
    expect(branch).toContain('setViewVisibility(id("hsub"), View.GONE)');
  });
});

// ─── 4. The tie pins: the mirrors ARE the Kotlin ────────────────────────────

describe("v454 Up Next — mirror ties to the Kotlin source", () => {
  const sel = rendererFn("selectRailRows");

  it("the selection's set is the new one: last, current, hero, gap, after, next, boxIsNow, extension", () => {
    expect(sel).toContain(
      "last: RailRow?,\n    current: RailRow?,\n    hero: RailRow?,\n    gap: RailRow?,\n    after: RailRow?,\n    next: RailRow?,\n    boxIsNow: Boolean,\n    extension: List<RailRow>,",
    );
  });

  it("the budget and the core cap are unchanged: heightSignal − 56 − 16, hero 64, plain 34, NOW 30, gap 32", () => {
    expect(sel).toContain("val railBudget = heightSignal - 56 - 16");
    expect(sel).toContain("remaining -= 64");
    expect(sel).toContain("remaining -= 34");
    expect(sel).toContain("remaining -= 30");
    expect(sel).toContain("remaining -= 32");
  });

  it("the selection holds no nowGap step, no nowGap display — the gap step is the under-box gap alone", () => {
    expect(sel).not.toContain("nowGap");
    expect(sel).toContain("if (gap != null && 32 <= remaining)");
  });

  it("the NOW row is gated on boxIsNow — at the anchor step and at the trailing step", () => {
    expect(sel).toContain("} else if (!boxIsNow) {");
    expect(sel).toContain("if (current != null && !nowChosen && !boxIsNow && 30 <= remaining)");
  });

  it("the step order is the source's: hero, current-anchor, last, next, after, trailing NOW, gap, extension", () => {
    const heroAt = sel.indexOf("heroChosen = true");
    const currentAt = sel.indexOf("currentChosen = true", heroAt);
    const lastAt = sel.indexOf("lastChosen = true", currentAt);
    const nextAt = sel.indexOf("nextChosen = true", lastAt);
    const afterAt = sel.indexOf("afterChosen = true", nextAt);
    const nowExtraAt = sel.indexOf("nowChosen = true", afterAt);
    const gapAt = sel.indexOf("gapChosen = true", nowExtraAt);
    const walkAt = sel.indexOf("for (row in extension) {", gapAt);
    for (const at of [heroAt, currentAt, lastAt, nextAt, afterAt, nowExtraAt, gapAt, walkAt]) {
      expect(at).toBeGreaterThan(-1);
    }
    expect(heroAt).toBeLessThan(currentAt);
    expect(currentAt).toBeLessThan(lastAt);
    expect(lastAt).toBeLessThan(nextAt);
    expect(nextAt).toBeLessThan(afterAt);
    expect(afterAt).toBeLessThan(nowExtraAt);
    expect(nowExtraAt).toBeLessThan(gapAt);
    expect(gapAt).toBeLessThan(walkAt);
  });

  it("the display order is the source's: last, current, NOW, hero, gap, next, after — no row before the hero but the anchors", () => {
    const adds = [
      "display.add(last)",
      "display.add(current)",
      "display.add(nowRow)",
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

// ─── 5. The decision fixtures: his evenings through the box decision ────────

describe("v454 Up Next — the box decision over real evenings", () => {
  it("his composition check: Dinner (8–9 PM) checked off at 8:30 holds the box struck; the 10 PM item waits under it", () => {
    // Feed (6 PM point todo, done and past) · Dinner 20:00–
    // 21:00, completed · Late thing 22:00–22:30, standing.
    const items: MirrorItem[] = [
      { start: 1080, end: 1110, hasEnd: false, completed: true },
      { start: 1200, end: 1260, hasEnd: true, completed: true },
      { start: 1320, end: 1350, hasEnd: true, completed: false },
    ];
    const d = boxDecisionMirror(items, 1230);
    expect(d.box).toBe("struck");
    expect(d.struckIndex).toBe(1);
    // Dinner is not ALSO the last row; Feed is.
    expect(d.lastIndex).toBe(0);
    // The struck holder is not "now" — the NOW row keeps
    // its anchor place before the box.
    expect(d.boxIsNow).toBe(false);
  });

  it("a next up checked off early holds the box struck, and the following item becomes the next under it", () => {
    // 8:30 AM: Self-Care 9:00–9:30 already checked; Feed
    // (10 AM point todo) standing.
    const items: MirrorItem[] = [
      { start: 540, end: 570, hasEnd: true, completed: true },
      { start: 600, end: 630, hasEnd: false, completed: false },
    ];
    const d = boxDecisionMirror(items, 510);
    expect(d.box).toBe("struck");
    expect(d.struckIndex).toBe(0);
    expect(d.lastIndex).toBeNull();
  });

  it("two checked early in a row: the later holds the box, the earlier is the struck last row once its window has passed", () => {
    // 9:45 AM: A 9:00–9:30 done, B 10:00–10:30 done,
    // C 11:00–11:30 standing.
    const items: MirrorItem[] = [
      { start: 540, end: 570, hasEnd: true, completed: true },
      { start: 600, end: 630, hasEnd: true, completed: true },
      { start: 660, end: 690, hasEnd: true, completed: false },
    ];
    const d = boxDecisionMirror(items, 585);
    expect(d.box).toBe("struck");
    expect(d.struckIndex).toBe(1);
    expect(d.lastIndex).toBe(0);
    // No duplicate: the holder and the last row are
    // different items.
    expect(d.struckIndex).not.toBe(d.lastIndex);
  });

  it("a completed item whose successor has already started does not hold — it is simply past", () => {
    // 8:40 PM: Dinner 20:00–21:00 checked mid-run; a point
    // todo began at 20:30 inside Dinner's window and is
    // current; the late thing stands at 23:00. Dinner's
    // successor (the todo) has started, so Dinner does not
    // hold; the box is the next up's, beside the current row.
    const items: MirrorItem[] = [
      { start: 1200, end: 1260, hasEnd: true, completed: true },
      { start: 1230, end: 1260, hasEnd: false, completed: false },
      { start: 1380, end: 1410, hasEnd: true, completed: false },
    ];
    const d = boxDecisionMirror(items, 1240);
    expect(d.struckIndex).toBeNull();
    expect(d.box).toBe("next");
  });

  it("an item checked after its window passed does not hold either — it takes the struck last row, and open time takes the box", () => {
    // 9:20 AM: A 8:00–9:00 checked at 9:05 (after it
    // ended); C stands at 10:00. A is the last row; the
    // 40 open minutes to C are the box.
    const items: MirrorItem[] = [
      { start: 480, end: 540, hasEnd: true, completed: true },
      { start: 600, end: 630, hasEnd: true, completed: false },
    ];
    const d = boxDecisionMirror(items, 560);
    expect(d.struckIndex).toBeNull();
    expect(d.lastIndex).toBe(0);
    expect(d.box).toBe("white");
    expect(d.openMinutes).toBe(40);
  });

  it("a struck item with no successor holds the box as the day's last word", () => {
    // 8:40 PM: a point todo at 20:00 was missed (its
    // default end has passed, unchecked); the evening's
    // last event, 20:10–21:10, was checked off mid-run.
    // Nothing stands after it in the day.
    const items: MirrorItem[] = [
      { start: 1200, end: 1230, hasEnd: false, completed: false },
      { start: 1210, end: 1270, hasEnd: true, completed: true },
    ];
    const d = boxDecisionMirror(items, 1240);
    expect(d.box).toBe("struck");
    expect(d.struckIndex).toBe(1);
    expect(d.lastIndex).toBe(0);
  });

  it("standing in open time: the box IS the white space, the next item under it, no NOW row", () => {
    // 2:30 PM: the 1–2 PM thing ended unchecked; the next
    // thing is at 4 PM, the one after at 5:30.
    const items: MirrorItem[] = [
      { start: 780, end: 840, hasEnd: true, completed: false },
      { start: 960, end: 990, hasEnd: true, completed: false },
      { start: 1050, end: 1080, hasEnd: true, completed: false },
    ];
    const d = boxDecisionMirror(items, 870);
    expect(d.box).toBe("white");
    expect(d.openMinutes).toBe(90);
    expect(d.boxIsNow).toBe(true);
    expect(d.lastIndex).toBe(0);
  });

  it("an imminent next item (< 15 open minutes) keeps the v451 behaviour: the box is the next up's, NOW row stands", () => {
    // His 8:57 AM screenshot, re-run: the morning routine
    // stands at 9:00, three open minutes out.
    const items: MirrorItem[] = [
      { start: 60, end: 90, hasEnd: false, completed: true },
      { start: 540, end: 570, hasEnd: true, completed: false },
    ];
    const d = boxDecisionMirror(items, 537);
    expect(d.openMinutes).toBe(3);
    expect(d.box).toBe("next");
    expect(d.boxIsNow).toBe(false);
  });

  it("a struck holder beats the white space even with a long open stretch ahead", () => {
    // Dinner checked at 8:30 with the next item at 10 PM:
    // the stretch to 10 PM is 90 minutes, but the box is
    // Dinner's, struck — the white space rides under it as
    // the gap, not in it as the box.
    const items: MirrorItem[] = [
      { start: 1200, end: 1260, hasEnd: true, completed: true },
      { start: 1320, end: 1350, hasEnd: true, completed: false },
    ];
    const d = boxDecisionMirror(items, 1230);
    expect(d.box).toBe("struck");
    expect(d.openMinutes).toBe(90);
  });

  it("a running event beats a struck candidacy outright", () => {
    // An overlapping pair: the 8 PM event checked off, the
    // 8:10 PM event still running at 8:30. The running
    // event is Now and holds the box (v451).
    const items: MirrorItem[] = [
      { start: 1200, end: 1330, hasEnd: true, completed: true },
      { start: 1210, end: 1270, hasEnd: true, completed: false },
    ];
    const d = boxDecisionMirror(items, 1230);
    expect(d.box).toBe("running");
    expect(d.struckIndex).toBeNull();
    expect(d.boxIsNow).toBe(true);
  });
});

// ─── 6. The selection fixtures: the new boxes through the budget ────────────

describe("v454 Up Next — fixture heights through the selection", () => {
  it("his composition check at a tall height: last / NOW / struck box / white gap / next / after", () => {
    // Dinner's evening: Feed done above, the struck box,
    // the 60-minute white box under it (the under-box gap),
    // the 10 PM row, the after row. Nothing stands before
    // the box but the last row and the NOW anchor.
    const c: Candidates = { ...NONE, last: true, hero: true, gap: true, next: true, after: true };
    const display = selectRailRowsMirror(c, false, [], 480);
    expect(display).toEqual(["last", "now", "hero", "gap", "next", "after"]);
    expect(display.indexOf("gap")).toBeGreaterThan(display.indexOf("hero"));
  });

  it("the same evening at his v449 height: rows drop whole, the gap still only ever sits under the box", () => {
    // Budget 160: box 64, NOW 30, last 34 seat (128); the
    // next row (34) does not fit the 32 left, the gap (32)
    // does — under the box, as ever.
    const c: Candidates = { ...NONE, last: true, hero: true, gap: true, next: true, after: true };
    const display = selectRailRowsMirror(c, false, [], 232);
    expect(display).toEqual(["last", "now", "hero", "gap"]);
  });

  it("the white box: last / box / next / after, and no NOW row at any height", () => {
    const c: Candidates = { ...NONE, last: true, hero: true, next: true, after: true };
    expect(selectRailRowsMirror(c, true, [], 480)).toEqual(["last", "hero", "next", "after"]);
    // At 232 the white box's saved NOW cost (30) is what
    // lets the next row seat where the v451 rail would drop
    // it — the box carries the moment, the row carries the
    // future.
    expect(selectRailRowsMirror(c, true, [], 232)).toEqual(["last", "hero", "next"]);
    expect(selectRailRowsMirror(c, true, [], 480)).not.toContain("now");
  });

  it("no fixture seats a gap before the box — the only gap seat in the rail is the under-box one", () => {
    const shapes: Array<[Candidates, boolean, ExtRow[], number]> = [
      [{ ...NONE, last: true, hero: true, gap: true, next: true, after: true }, false, ["xgap", "xitem"], 480],
      [{ ...NONE, last: true, current: true, hero: true, gap: true, after: true }, false, [], 480],
      [{ ...NONE, hero: true, gap: true, next: true }, true, [], 480],
      [{ ...NONE, last: true, hero: true, gap: true, after: true }, false, ["xitem"], 340],
    ];
    for (const [c, isNow, ext, h] of shapes) {
      const display = selectRailRowsMirror(c, isNow, ext, h);
      const heroAt = display.indexOf("hero");
      expect(heroAt).toBeGreaterThan(-1);
      for (const kind of ["gap", "xgap"]) {
        const at = display.indexOf(kind);
        if (at > -1) expect(at, `${kind} after hero in ${display}`).toBeGreaterThan(heroAt);
      }
    }
  });

  it("the v453 extension still walks under a struck box: core first, the rest of the day below, stop at the first misfit", () => {
    const c: Candidates = { ...NONE, last: true, hero: true, gap: true, next: true, after: true };
    const display = selectRailRowsMirror(c, false, ["xitem", "xgap", "xitem"], 480);
    expect(display).toEqual(["last", "now", "hero", "gap", "next", "after", "xitem", "xgap", "xitem"]);
    // Core (with its gap) costs 228 of 268 at a 340 signal,
    // leaving 40: the extension's first item seats, the
    // gap behind it finds 6 and stops the walk.
    expect(selectRailRowsMirror(c, false, ["xitem", "xgap", "xitem"], 340)).toEqual([
      "last",
      "now",
      "hero",
      "gap",
      "next",
      "after",
      "xitem",
    ]);
  });

  it("the v453 extension still walks under a white box, and the past side still seats exactly one last row", () => {
    const c: Candidates = { ...NONE, last: true, hero: true, next: true, after: true };
    const display = selectRailRowsMirror(c, true, ["xitem", "xgap", "xitem", "xgap", "xitem"], 480);
    expect(display).toEqual(["last", "hero", "next", "after", "xitem", "xgap", "xitem", "xgap", "xitem"]);
    expect(display.filter((k) => k === "last")).toHaveLength(1);
    expect(display).not.toContain("now");
  });

  it("a standard height under the new boxes is the core only — the extension never starts without the whole core", () => {
    const c: Candidates = { ...NONE, last: true, hero: true, gap: true, next: true, after: true };
    expect(selectRailRowsMirror(c, false, ["xitem", "xgap"], 232)).toEqual(["last", "now", "hero", "gap"]);
  });
});
