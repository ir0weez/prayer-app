/**
 * v455 — Up Next: the box belongs to the item whose window
 * is NOW. The correction Jonathan's device verdict on v454
 * forced, minutes after v454 shipped (Nov 6, 10:01 AM
 * screenshot): the rail showed News (9:30 AM, finished) as
 * the last row, a NOW row, and Write (11:00 AM, checked
 * off EARLY) in the box struck with a DONE pill — while
 * Feed Aaron, the 10:00 AM todo he had just checked off at
 * its time, appeared NOWHERE. His words: "It should be on
 * 'feed Aaron' or something right now... I checked it off
 * and now the widget doesn't show it. Just like I literally
 * said I didn't want to happen."
 *
 * The v454 candidacy let the early-checked next up claim
 * the box, and the completed item whose window contained
 * now was eligible for no seat at all: not the box (Write
 * took it), not the last row (the last pick requires the
 * window to have passed; Feed's runs to 10:30). Three
 * fixes, all in the render-time dayItems path; the
 * legacy-entries fallback is behaviourally unchanged:
 *
 * FIX 1 — the in-window holder outranks the early-checked
 * holder. A completed item standing inside its own window
 * (start ≤ now < its window end — the stored endMinutes,
 * a todo's rule-made +30 included; that half hour is the
 * window he checked the todo inside) holds the box struck
 * ahead of anything checked off early. Latest start wins
 * among the in-window finished, the running pick's own
 * tie-break. A running event still outranks both
 * candidacies. Box priority, restated: running event →
 * in-window struck → early-checked struck (v454) → the
 * white space → the next up.
 *
 * FIX 2 — a finished successor waits under the box,
 * struck. When a struck item holds the box and the item
 * after it in the day is itself completed, that item
 * seats as the row directly under the box in the done
 * dress (Write under Feed Aaron); the after row is the
 * first standing item the under row did not take. The
 * under-box gap runs from the holder's WINDOW end (a
 * todo holder's +30 end, not its start) to the under
 * item's start. The v453 extension walk reseeds from the
 * after seat the core actually took, for the same reason.
 *
 * FIX 3 — no vanishing, generally. A finished item that
 * lost the box to the struck holder — the earlier of two
 * overlapping in-window finishes, the earlier of two
 * checked early in a row — still seats, as the last row,
 * struck, even though its window has not fully passed.
 * The last pick keeps v454's passed eligibility first and
 * adds the rescue: the nearest finished item before the
 * holder that appears nowhere else takes the seat when
 * the passed pick found nothing, or when it stands nearer
 * the holder than that pick does. The holder and the
 * under-box item are excluded from the last pick outright
 * (an in-window todo holder's overAt is its start —
 * already past — so v454's pick would have seated it
 * twice).
 *
 * What does not move: the selection (selectRailRows) is
 * untouched — same budget (heightSignal − 56 − 16), same
 * costs, same step order, same extension walk behind the
 * afterChosen gate and the nine-slot cap; the tall
 * extension's construction changes only in its seed (fix
 * 2). The v454 Dinner composition renders exactly as
 * before. The snapshot needed nothing, again.
 *
 * The Kotlin renderer cannot execute in this harness, so
 * — as in every round — the behaviour is pinned two ways:
 * source assertions on the real renderer, and executable
 * mirrors (the selection, carried over from v454
 * unchanged; and the box decision — the picks, both struck
 * candidacies, the under pick, the last pick with its
 * rescue, and the open-stretch measurement — translated
 * line for line from renderUpNext's recomputation) whose
 * gates and constants are tied to that source by the pins
 * below.
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
// (a) The selection — carried over from v454 unchanged
// (v455 does not touch selectRailRows). Extension rows
// ride as "xitem" / "xgap" (the v453 convention).

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
// renderUpNext's render-time recomputation as v455 leaves
// it (the ahead / current / running picks, the v454 struck
// candidacy, the v455 in-window override, the under pick,
// the last pick with its rescue, the after seat, and the
// open-stretch measurement), returning the box kind the
// renderer would build and the seat each item took. Items
// carry their endMinutes as the snapshot bakes them (a
// point item's end is its rule-made default, +30 for a
// todo — hasEnd is what tells it apart).

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
  underIndex: number | null;
  underKind: "done" | "item" | null;
  afterSeatIndex: number | null;
  currentIndex: number | null;
  gapMinutes: number | null;
  openMinutes: number;
  boxIsNow: boolean;
}

function boxDecisionMirror(items: MirrorItem[], nowMin: number): BoxDecision {
  const overAt = (item: MirrorItem) => (item.hasEnd ? item.end : item.start);
  const winEnd = (item: MirrorItem) => (item.end > item.start ? item.end : item.start);
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
  // The v454 candidacy, verbatim: the completed item
  // nearest before the would-be box item whose window has
  // not fully passed and whose successor has not started.
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
  // v455 (fix 1): the in-window override — a completed
  // item inside its own window takes the box; latest
  // start wins.
  if (runningIdx === null) {
    const inWindowIdx =
      items
        .map((_, i) => i)
        .filter((i) => items[i].completed && items[i].start <= nowMin && nowMin < winEnd(items[i]))
        .sort((a, b) => items[b].start - items[a].start)[0] ?? null;
    if (inWindowIdx !== null) struckIdx = inWindowIdx;
  }
  // v455 (fix 2): the under pick — the first item after
  // the holder that is not the current row and is not
  // itself over.
  let underIdx: number | null = null;
  if (struckIdx !== null) {
    const holderPos = chronoIdx.indexOf(struckIdx);
    for (let p = holderPos + 1; p < chronoIdx.length; p += 1) {
      const idx = chronoIdx[p];
      if (idx !== currentIdx && overAt(items[idx]) > nowMin) {
        underIdx = idx;
        break;
      }
    }
  }
  const chosen = new Set(
    [currentIdx, runningIdx, next1Idx, afterIdx, struckIdx, underIdx].filter(
      (x): x is number => x !== null,
    ),
  );
  let lastIdx =
    items
      .map((_, i) => i)
      .filter((i) => !chosen.has(i) && overAt(items[i]) <= nowMin)
      .sort((a, b) => overAt(items[b]) - overAt(items[a]) || items[b].start - items[a].start)[0] ??
    null;
  // v455 (fix 3): the rescue — the nearest finished item
  // before the holder that appears nowhere else takes the
  // last seat when it stands nearer the holder than the
  // passed pick (or the passed pick found nothing).
  if (struckIdx !== null) {
    const holderPos = chronoIdx.indexOf(struckIdx);
    let rescueIdx: number | null = null;
    for (let p = holderPos - 1; p >= 0; p -= 1) {
      const idx = chronoIdx[p];
      if (items[idx].completed && idx !== lastIdx && idx !== underIdx) {
        rescueIdx = idx;
        break;
      }
    }
    if (rescueIdx !== null) {
      const rescuePos = chronoIdx.indexOf(rescueIdx);
      const ordinaryPos = lastIdx !== null ? chronoIdx.indexOf(lastIdx) : -1;
      if (rescuePos > ordinaryPos) lastIdx = rescueIdx;
    }
  }
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
  // The struck branch's seats and its under-box gap
  // candidate (the gap seats only from leftover budget —
  // the selection mirror decides that; here it is the
  // candidate's minutes, or null when no candidate stands).
  let underKind: "done" | "item" | null = null;
  let gapMinutes: number | null = null;
  let afterSeatIndex: number | null = afterIdx;
  if (struckIdx !== null) {
    if (underIdx !== null) {
      underKind = items[underIdx].completed ? "done" : "item";
      const g = items[underIdx].start - winEnd(items[struckIdx]);
      gapMinutes = g >= 15 ? g : null;
    }
    afterSeatIndex = aheadIdx.filter((i) => i !== underIdx)[0] ?? null;
  }
  return {
    box,
    struckIndex: struckIdx,
    lastIndex: lastIdx,
    underIndex: underIdx,
    underKind,
    afterSeatIndex,
    currentIndex: currentIdx,
    gapMinutes,
    openMinutes,
    boxIsNow: runningIdx !== null || heroWhite,
  };
}

// ─── 1. Fix 1 on the source: the in-window holder ───────────────────────────

describe("v455 Up Next — the box belongs to the item whose window is now (source)", () => {
  const body = rendererFn("renderUpNext");

  it("the window end is the stored endMinutes — a todo's +30 counts — falling back to the start", () => {
    expect(body).toContain(
      "val winEnd = { item: DayItem -> if (item.endMinutes > item.startMinutes) item.endMinutes else item.startMinutes }",
    );
    // overAt stays the last pick's and the v454 candidacy's
    // clock, exactly as those rounds defined it.
    expect(body).toContain(
      "val overAt = { item: DayItem -> if (item.hasEnd) item.endMinutes else item.startMinutes }",
    );
  });

  it("the in-window pick takes completed items standing inside their own window, latest start first", () => {
    expect(body).toContain(
      ".filter { dayItems[it].completed && dayItems[it].startMinutes <= nowMin && nowMin < winEnd(dayItems[it]) }",
    );
    expect(body).toContain(".sortedByDescending { dayItems[it].startMinutes }");
    expect(body).toContain("if (inWindowIdx != null) struckIdx = inWindowIdx");
  });

  it("the override runs after the v454 candidacy it outranks, and both are gated on nothing running", () => {
    const candidacyAt = body.indexOf("struckIdx = chronoIdx[candPos]");
    const overrideAt = body.indexOf("val inWindowIdx = dayItems.indices", candidacyAt);
    expect(candidacyAt).toBeGreaterThan(-1);
    expect(overrideAt).toBeGreaterThan(candidacyAt);
    const gateAt = body.indexOf("if (runningIdx == null) {", candidacyAt);
    expect(gateAt).toBeGreaterThan(candidacyAt);
    expect(gateAt).toBeLessThan(overrideAt);
  });

  it("the struck holder joins the chosen set, so the last pick can never seat it a second time", () => {
    expect(body).toContain(
      "val chosenIdx = setOfNotNull(currentIdx, runningIdx, next1Idx, afterIdx, struckIdx, underIdx)",
    );
  });
});

// ─── 2. Fix 2 on the source: the finished successor under the box ───────────

describe("v455 Up Next — the item under a struck box (source)", () => {
  const body = rendererFn("renderUpNext");

  it("the under pick walks the day after the holder, skipping the current row and anything already over", () => {
    expect(body).toContain("val underIdx = if (struckIdx != null) {");
    expect(body).toContain("val holderPos = chronoIdx.indexOf(struckIdx)");
    expect(body).toContain("if (idx != currentIdx && overAt(dayItems[idx]) > nowMin) {");
    expect(body).toContain("val underItem = underIdx?.let { dayItems[it] }");
  });

  it("the under row wears the done dress when the successor is itself finished, the plain item dress otherwise", () => {
    expect(body).toContain('if (underItem.completed) "done" else "item",');
    expect(body).toContain(
      "minutesToTimeLabel(underItem.startMinutes), underItem.title, underItem.sub, underItem.startMinutes, \"\"",
    );
  });

  it("the under-box gap runs from the holder's window end to the under item's start", () => {
    expect(body).toContain("val struckGapMinutes = underItem.startMinutes - winEnd(struckItem)");
    expect(body).toContain("if (struckGapMinutes >= 15)");
  });

  it("the after seat is read once: the first standing item the under row did not take, else the after item", () => {
    expect(body).toContain(
      "val afterSeatIdx = if (struckItem != null) aheadIdx.firstOrNull { it != underIdx } else afterIdx",
    );
    expect(body).toContain("val after = dayItems[afterSeatIdx]");
  });

  it("the extension walk seeds from the after seat, not a fixed position", () => {
    expect(body).toContain("if (afterSeatIdx != null) {");
    expect(body).toContain("var prevEnd = dayItems[afterSeatIdx].endMinutes");
    expect(body).toContain("for (k in aheadIdx.indexOf(afterSeatIdx) + 1 until aheadIdx.size) {");
  });
});

// ─── 3. Fix 3 on the source: the rescue on the last pick ────────────────────

describe("v455 Up Next — no vanishing: the rescue (source)", () => {
  const body = rendererFn("renderUpNext");

  it("the passed pick stands first, its eligibility exactly v454's", () => {
    expect(body).toContain("var lastIdx = dayItems.indices");
    expect(body).toContain(".filter { it !in chosenIdx && overAt(dayItems[it]) <= nowMin }");
  });

  it("the rescue walks back from the holder to the nearest finished item that appears nowhere else", () => {
    expect(body).toContain("for (p in holderPos - 1 downTo 0) {");
    expect(body).toContain("if (dayItems[idx].completed && idx != lastIdx && idx != underIdx) {");
    expect(body).toContain("rescueIdx = idx");
  });

  it("the rescue takes the seat only when it stands nearer the holder than the passed pick", () => {
    expect(body).toContain("val rescuePos = chronoIdx.indexOf(rescueIdx)");
    expect(body).toContain("val ordinaryPos = lastIdx?.let { chronoIdx.indexOf(it) } ?: -1");
    expect(body).toContain("if (rescuePos > ordinaryPos) lastIdx = rescueIdx");
  });

  it("the fallback still builds no struck box, no white box and no extension — the fixes live in the render-time path only", () => {
    expect(body).toContain(
      "selectRailRows(lastRow, currentRow, heroRow, gapRow, afterRow, null, false, emptyList(), heightSignal)",
    );
    expect(body.split('RailRow("heroDone"').length - 1).toBe(1);
    expect(body.split('RailRow("whitebox"').length - 1).toBe(1);
  });

  it("the selection is untouched: same signature, same budget, boxIsNow in place (v457: the budget's prices are honest now)", () => {
    const sel = rendererFn("selectRailRows");
    // v457 amendment: v455 indeed never touched the
    // selection — but v457 repriced it (honest costs:
    // the padded line box ≈1.36× for Roboto; chrome
    // 64; a 20dp bottom buffer), after the v455 tall
    // render seated a last extension row whose title
    // clipped at the card's bottom edge. The
    // signature, the gates and boxIsNow stand as
    // v455 left them; only the numbers moved.
    expect(sel).toContain("val railBudget = heightSignal - 64 - 20");
    expect(sel).toContain("boxIsNow: Boolean,");
    expect(sel).toContain("if (afterChosen) {");
  });
});

// ─── 4. The decision fixtures: Nov 6 and its neighbours ─────────────────────

describe("v455 Up Next — the box decision over real days", () => {
  it("today's exact failure, fixed: at 10:01 Feed Aaron holds the box, Write waits struck under it, News is last", () => {
    // His Friday, as the 10:01 screenshot showed it — plus
    // the standing items behind Write that the screenshot's
    // "18 LEFT" counted. News (9:30–10:00 event) finished
    // and passed; Feed Aaron (10 AM todo, its +30 window to
    // 10:30) checked off at its time; Write (11 AM) checked
    // off early. Under v454 the box was Write's and Feed
    // Aaron appeared nowhere.
    const items: MirrorItem[] = [
      { start: 570, end: 600, hasEnd: true, completed: true }, // News
      { start: 600, end: 630, hasEnd: false, completed: true }, // Feed Aaron
      { start: 660, end: 690, hasEnd: true, completed: true }, // Write
      { start: 720, end: 750, hasEnd: true, completed: false }, // Lunch
      { start: 780, end: 810, hasEnd: true, completed: false }, // Rest
    ];
    const d = boxDecisionMirror(items, 601);
    expect(d.box).toBe("struck");
    // The box is Feed Aaron's — the item whose window is now.
    expect(d.struckIndex).toBe(1);
    // Write waits directly under the box, struck.
    expect(d.underIndex).toBe(2);
    expect(d.underKind).toBe("done");
    // News is the last row; the day's next standing item
    // is the after row.
    expect(d.lastIndex).toBe(0);
    expect(d.afterSeatIndex).toBe(3);
    // Feed Aaron appears exactly once in the whole rail:
    // every seat is a different item, and Feed's seat is
    // the box.
    const seats = [d.struckIndex, d.lastIndex, d.underIndex, d.afterSeatIndex];
    expect(new Set(seats).size).toBe(seats.length);
    expect(seats.filter((s) => s === 1)).toHaveLength(1);
    // The struck holder is not "now" — the NOW row keeps
    // its anchor place before the box, as his screenshot
    // showed it should.
    expect(d.boxIsNow).toBe(false);
    // The open stretch under the box runs from Feed's
    // window end (10:30) to Write (11:00): 30 minutes.
    expect(d.gapMinutes).toBe(30);
  });

  it("overlap: two finished items whose windows both contain now — the later start holds the box, the other is the last row", () => {
    // 10:15 AM: the 9:00–10:30 event and the 10:00–11:00
    // event both checked off, both windows standing; the
    // noon item waits.
    const items: MirrorItem[] = [
      { start: 540, end: 630, hasEnd: true, completed: true },
      { start: 600, end: 660, hasEnd: true, completed: true },
      { start: 720, end: 750, hasEnd: true, completed: false },
    ];
    const d = boxDecisionMirror(items, 615);
    expect(d.box).toBe("struck");
    expect(d.struckIndex).toBe(1);
    // The earlier finish lost the box but does not vanish:
    // it seats struck as the last row even though its
    // window (to 10:30) has not fully passed.
    expect(d.lastIndex).toBe(0);
    expect(d.underIndex).toBe(2);
    expect(d.underKind).toBe("item");
  });

  it("two early-checked future items: the later holds the box (v454 preserved), the earlier is the struck last row instead of vanishing", () => {
    // 10:00 AM: the 11 AM and noon items both already
    // checked; the 1 PM item stands. Nothing is in-window.
    const items: MirrorItem[] = [
      { start: 660, end: 690, hasEnd: true, completed: true },
      { start: 720, end: 750, hasEnd: true, completed: true },
      { start: 780, end: 810, hasEnd: true, completed: false },
    ];
    const d = boxDecisionMirror(items, 600);
    expect(d.box).toBe("struck");
    expect(d.struckIndex).toBe(1);
    expect(d.lastIndex).toBe(0);
    expect(d.underIndex).toBe(2);
  });

  it("his v454 composition check, unchanged: Dinner checked off at 8:30 holds the box struck, the white box for 9→10 under it, the 10 PM row after", () => {
    // Feed (6 PM point todo, done and past) · Dinner
    // 20:00–21:00, completed · Late thing 22:00–22:30,
    // standing.
    const items: MirrorItem[] = [
      { start: 1080, end: 1110, hasEnd: false, completed: true },
      { start: 1200, end: 1260, hasEnd: true, completed: true },
      { start: 1320, end: 1350, hasEnd: true, completed: false },
    ];
    const d = boxDecisionMirror(items, 1230);
    expect(d.box).toBe("struck");
    expect(d.struckIndex).toBe(1);
    expect(d.lastIndex).toBe(0);
    expect(d.underIndex).toBe(2);
    expect(d.underKind).toBe("item");
    // The white box under the struck box: Dinner's window
    // end (21:00) to the late item (22:00) — 60 minutes.
    expect(d.gapMinutes).toBe(60);
    expect(d.boxIsNow).toBe(false);
  });

  it("a running event still beats a struck in-window item for the box", () => {
    // The 8 PM event checked off with its window still
    // standing (to 10:10); the 8:10 PM event still running
    // at 8:30. The running event is Now and holds the box.
    const items: MirrorItem[] = [
      { start: 1200, end: 1330, hasEnd: true, completed: true },
      { start: 1210, end: 1270, hasEnd: true, completed: false },
    ];
    const d = boxDecisionMirror(items, 1230);
    expect(d.box).toBe("running");
    expect(d.struckIndex).toBeNull();
    expect(d.boxIsNow).toBe(true);
  });

  it("the white box cases are v454's, unchanged: standing in open time the box IS the white space", () => {
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

  it("the white box cases are v454's, unchanged: an imminent next item keeps the box and the NOW row", () => {
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

  it("an event checked off mid-run holds the box even though its successor started — the successor keeps the current row", () => {
    // 8:40 PM: Dinner 20:00–21:00 checked mid-run; a point
    // todo began at 20:30 inside Dinner's window and is
    // current; the late thing stands at 23:00. v454's
    // candidacy passed the box on once the successor
    // started; v455's rule is that Dinner's window is now,
    // so Dinner holds — and the todo is not displaced: it
    // keeps its plain current row above the box.
    const items: MirrorItem[] = [
      { start: 1200, end: 1260, hasEnd: true, completed: true },
      { start: 1230, end: 1260, hasEnd: false, completed: false },
      { start: 1380, end: 1410, hasEnd: true, completed: false },
    ];
    const d = boxDecisionMirror(items, 1240);
    expect(d.box).toBe("struck");
    expect(d.struckIndex).toBe(0);
    expect(d.currentIndex).toBe(1);
    expect(d.underIndex).toBe(2);
  });

  it("two in-window todos: the later start holds the box, the earlier seats as last through the passed pick", () => {
    // 10:10 AM: the 10:00 and 10:05 feeds both checked,
    // both +30 windows standing; the noon item waits. The
    // earlier todo's overAt (its start) has passed, so the
    // ordinary pick — not the rescue — seats it.
    const items: MirrorItem[] = [
      { start: 600, end: 630, hasEnd: false, completed: true },
      { start: 605, end: 635, hasEnd: false, completed: true },
      { start: 720, end: 750, hasEnd: true, completed: false },
    ];
    const d = boxDecisionMirror(items, 610);
    expect(d.box).toBe("struck");
    expect(d.struckIndex).toBe(1);
    expect(d.lastIndex).toBe(0);
    expect(d.underIndex).toBe(2);
  });

  it("a struck item with no successor still holds the box as the day's last word (v454 preserved)", () => {
    // 8:40 PM: a point todo at 20:00 was missed (unchecked,
    // past); the evening's last event, 20:10–21:10, was
    // checked off mid-run. Nothing stands after it.
    const items: MirrorItem[] = [
      { start: 1200, end: 1230, hasEnd: false, completed: false },
      { start: 1210, end: 1270, hasEnd: true, completed: true },
    ];
    const d = boxDecisionMirror(items, 1240);
    expect(d.box).toBe("struck");
    expect(d.struckIndex).toBe(1);
    expect(d.lastIndex).toBe(0);
    expect(d.underIndex).toBeNull();
  });
});

// ─── 5. The selection fixtures: today's composition through the budget ──────

describe("v455 Up Next — today's composition through the selection", () => {
  it("at a tall height: last / NOW / Feed's struck box / white gap / Write struck / after / the rest of the day", () => {
    // The candidates the decision above builds for 10:01:
    // News (last), the struck box, the 30-minute under-box
    // gap, Write struck as next, the noon item as after —
    // then the extension.
    const c: Candidates = { ...NONE, last: true, hero: true, gap: true, next: true, after: true };
    const display = selectRailRowsMirror(c, false, ["xitem", "xgap", "xitem"], 480);
    expect(display).toEqual(["last", "now", "hero", "gap", "next", "after", "xitem", "xgap", "xitem"]);
    expect(display.indexOf("gap")).toBeGreaterThan(display.indexOf("hero"));
    expect(display.indexOf("next")).toBeGreaterThan(display.indexOf("gap"));
  });

  it("at his standard height the same day drops rows whole — Write's row goes, the gap still only sits under the box", () => {
    // Budget 160: box 64, NOW 30, last 34 seat (128); the
    // next row (34) does not fit the 32 left, the gap (32)
    // does — under the box, as ever. Nothing is clipped.
    const c: Candidates = { ...NONE, last: true, hero: true, gap: true, next: true, after: true };
    const display = selectRailRowsMirror(c, false, ["xitem", "xgap", "xitem"], 232);
    expect(display).toEqual(["last", "now", "hero", "gap"]);
  });

  it("Dinner's evening at a tall height: last / NOW / struck box / white gap / the 10 PM row", () => {
    const c: Candidates = { ...NONE, last: true, hero: true, gap: true, next: true };
    const display = selectRailRowsMirror(c, false, [], 480);
    expect(display).toEqual(["last", "now", "hero", "gap", "next"]);
  });
});
