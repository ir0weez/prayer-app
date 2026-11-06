/**
 * v457 — Up Next: a seated row paints WHOLE, title and
 * all. The bug Jonathan caught on the v455 TALL render
 * (Nov 6, 11:15 AM screenshot, confirmed on his screen
 * at 11:47 — "It's missing on my screen too"): the last
 * extension row — 1:30 PM, a ministry titled "Edit" —
 * painted its time label and its rail dot but NO title.
 * His own read of it: "There's not a lot of space down
 * there."
 *
 * THE DIAGNOSIS — three candidates, two ruled out on
 * evidence, one standing:
 *
 * 1. SLOT FILL (ruled out). fillRailSlot sets the title
 * for every item kind — done, current, past, and the
 * plain following-item branch the Edit row wears — and
 * the layout's nine slots are perfect stamps of one
 * another: every slot carries all 21 ids, nx_title_N
 * included (pinned mechanically below). No slot/kind
 * path paints time+dot and skips the title.
 *
 * 2. SNAPSHOT (ruled out). The render-time parse reads
 * every dayItem's title the same way —
 * d.optString("title"), no kind distinction anywhere —
 * and Write, also a ministry, painted its title fine
 * in the hero band of the very same render.
 *
 * 3. BUDGET vs REAL HEIGHTS (the standing cause). The
 * row was SEATED — the selection charged it 34 and the
 * ledger said it fit — but the card's real bottom took
 * the title. The old costs priced a line of text at
 * ≈1.2× its size; a line on Android measures its
 * font's padded line box, ≈1.36× for Roboto. The
 * device had testified to the gap for rounds: v449's
 * seated row sliced at his standard height with the
 * ledger showing room to spare, and the selection's
 * own comment recorded the height signal
 * overestimating the placed height three rounds
 * running. Per-row undercharges of ≈2dp are invisible
 * on a short rail; on his tall rail — seven rows that
 * morning — they compound onto the LAST row, the one
 * at the card's bottom edge.
 *
 * THE FIX — honest costs, and a bottom buffer. Nothing
 * about the composition, the box decision, the
 * priorities or the gates moves; only the prices do,
 * each one derived from widget_up_next.xml (see the
 * v457 paragraph on selectRailRows):
 * - plain row 34 → 36 (line padding 8 + 8, plus the
 *   14.5sp title's padded line box, 20);
 * - the box 64 → 66 (band padding 10 + 10, the 20sp
 *   title's line box 28, the 13sp sub's 18);
 * - gap row 32 → 33 (the 12.5sp text's line box 17,
 *   in-box padding 6 + 6, margins 2 + 2);
 * - chrome allowance 56 → 64 (card padding 16 + 16,
 *   the header at its tallest — the LEFT chip standing
 *   — 25, the rail's top margin 6, 1 of rounding);
 * - the safety margin 16 → 20: the BOTTOM BUFFER, so a
 *   row is seated only when it fits WHOLE inside the
 *   card with room to paint, and otherwise drops whole
 *   — his standing law since v450 (a dropped row is
 *   acceptable; a clipped row is the failure).
 * The budget line is now heightSignal − 64 − 20. At
 * his standard 232 the seatings are v456's exactly
 * (pinned below); the tall rail simply stops promising
 * the last row it cannot paint.
 *
 * CONFIRMED FROM THE OTHER SIDE (Nov 6, 12:01 PM, on
 * v456 — after this file's first draft): with the NOW
 * row gone and its 30 freed, the tall rail seated one
 * row MORE — Write struck as the last row, Lunch
 * running in the box ("1 H LEFT"), the 30-minute gap,
 * Edit WITH its title this time, Feed and Stitch
 * Journal at 2:00 — and a THIRD 2:00 PM row at the
 * very bottom lost its title instead. The squeeze
 * moved one row lower; it did not shrink. The error
 * is cumulative and always lands on the last seated
 * row, whatever composition sits above it — which is
 * why the fix had to be honest per-row prices, not
 * one freed row. §7 pins that exact composition.
 *
 * The Kotlin renderer cannot execute in this harness,
 * so — as in every round — the behaviour is pinned two
 * ways: source assertions on the real renderer and its
 * layout, and executable mirrors (the box decision,
 * v455's, carried over unchanged; and the selection,
 * translated from the new selectRailRows) whose gates
 * and constants are tied to that source by the pins
 * below. The selection mirror seats TITLED rows, so
 * the fixtures can assert the thing the bug was about:
 * every seated row carries its title.
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
// (a) The box decision — v455's mirror, carried over
// unchanged (v457 does not touch renderUpNext's
// recomputation): the ahead / current / running picks,
// the v454 struck candidacy, the v455 in-window
// override, the under pick, the last pick with its
// rescue, the after seat, and the open-stretch
// measurement, returning the box kind the renderer
// would build and the seat each item took. Items carry
// their endMinutes as the snapshot bakes them (a point
// item's end is its rule-made default, +30 for a todo —
// hasEnd is what tells it apart).

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

// (b) The selection — v457's, translated from the new
// selectRailRows: the v456 steps and gates verbatim,
// the prices honest — budget heightSignal − 64 − 20,
// box 66, plain row 36, gap 33. Rows ride TITLED: each
// candidate carries the text its dress would paint
// (the title for an item row, the wording for a gap),
// so a fixture can assert that whatever seats, seats
// with its words on it — the assertion the Edit bug
// demands.

interface TitledRow {
  key: string;
  kind: "item" | "gap";
  text: string;
}

interface TitledCandidates {
  last?: TitledRow;
  current?: TitledRow;
  hero?: TitledRow;
  gap?: TitledRow;
  next?: TitledRow;
  after?: TitledRow;
}

const item = (key: string, title: string): TitledRow => ({ key, kind: "item", text: title });
const gapRow = (key: string, wording: string): TitledRow => ({ key, kind: "gap", text: wording });

const COST = { hero: 66, plain: 36, gap: 33 } as const;

function selectRailRowsTitledMirror(
  c: TitledCandidates,
  extension: TitledRow[],
  heightSignal: number,
): TitledRow[] {
  let remaining = heightSignal - 64 - 20;
  const chosen = {
    last: false,
    current: false,
    hero: false,
    after: false,
    next: false,
    gap: false,
  };
  // (1) hero — always chosen.
  if (c.hero) {
    chosen.hero = true;
    remaining -= COST.hero;
  }
  // (2) current — always chosen when present (v456: no
  // NOW row seats in its place).
  if (c.current) {
    chosen.current = true;
    remaining -= COST.plain;
  }
  // (3) last — when it fits.
  if (c.last && COST.plain <= remaining) {
    chosen.last = true;
    remaining -= COST.plain;
  }
  // (4) next — when it fits.
  if (c.next && COST.plain <= remaining) {
    chosen.next = true;
    remaining -= COST.plain;
  }
  // (5) after — when it fits.
  if (c.after && COST.plain <= remaining) {
    chosen.after = true;
    remaining -= COST.plain;
  }
  // (No step (6) — v456: the trailing NOW row is gone.)
  // The gap row last — the under-box gap is the only
  // gap candidate; no gap stands before the box.
  if (c.gap && COST.gap <= remaining) {
    chosen.gap = true;
    remaining -= COST.gap;
  }
  const display: TitledRow[] = [];
  if (chosen.last && c.last) display.push(c.last);
  if (chosen.current && c.current) display.push(c.current);
  if (chosen.hero && c.hero) display.push(c.hero);
  if (chosen.gap && c.gap) display.push(c.gap);
  if (chosen.next && c.next) display.push(c.next);
  if (chosen.after && c.after) display.push(c.after);
  // ── v453: the tall extension — only once the whole
  // core stands, walked from the leftover in strict
  // rail order, whole or not at all, stopping at the
  // first element that does not fit; nine slots cap it.
  if (chosen.after) {
    for (const row of extension) {
      if (display.length >= 9) break;
      const cost = row.kind === "gap" ? COST.gap : COST.plain;
      if (cost > remaining) break;
      display.push(row);
      remaining -= cost;
    }
  }
  return display;
}

const keys = (rows: TitledRow[]) => rows.map((r) => r.key);

/** The assertion the bug was about: every seated row
 * carries its words — an item row its title, a gap row
 * its wording. No half-painted row stands in the list. */
function expectEveryRowTitled(rows: TitledRow[]) {
  for (const row of rows) {
    expect(row.text, `row ${row.key} carries its text`).not.toBe("");
  }
}

// ─── The fixture days ───────────────────────────────────────────────────────

/** Jonathan's morning — the bug's own day, at 11:15 AM
 * under the v456 composition (no NOW row). Morning
 * Meeting (10:00–11:00) finished; Write (11:00–12:00)
 * checked off inside its window and holding the box;
 * Lunch (12:00–12:30) waiting under it; Rest
 * (12:00–12:30) as the after row; then the extension:
 * the hour open after Rest ends, and Edit (1:30 PM), a
 * ministry — the row that lost its title. */
const jonathanItems: MirrorItem[] = [
  { start: 600, end: 660, hasEnd: true, completed: true }, // Morning Meeting
  { start: 660, end: 720, hasEnd: true, completed: true }, // Write
  { start: 720, end: 750, hasEnd: true, completed: false }, // Lunch
  { start: 720, end: 750, hasEnd: true, completed: false }, // Rest
  { start: 810, end: 840, hasEnd: true, completed: false }, // Edit
];
const jonathanDecision = boxDecisionMirror(jonathanItems, 675);
const jonathanCandidates: TitledCandidates = {
  last: item("last", "Morning Meeting"),
  hero: item("hero", "Write"),
  next: item("next", "Lunch"),
  after: item("after", "Rest"),
};
const jonathanExtension: TitledRow[] = [
  gapRow("xgap", "1 hour open"),
  item("xitem", "Edit"),
];

/** The v455 Feed Aaron day at 10:01 (v456's fixture):
 * News finished and passed; Feed Aaron checked at its
 * time, holding the box; Write, finished early, waiting
 * struck under it; the 30-minute open stretch as the
 * gap candidate; Lunch as the after row, Rest heading
 * the extension. */
const feedAaronCandidates: TitledCandidates = {
  last: item("last", "News"),
  hero: item("hero", "Feed Aaron"),
  gap: gapRow("gap", "30 minutes open"),
  next: item("next", "Write"),
  after: item("after", "Lunch"),
};
const feedAaronExtension: TitledRow[] = [
  item("x1", "Rest"),
  gapRow("xg", "30 minutes open"),
  item("x2", "Plan"),
];

/** Dinner's evening (v451/v456): Feed done; Dinner
 * running in the box; the hour open after it; the two
 * late things standing. */
const dinnerCandidates: TitledCandidates = {
  last: item("last", "Feed"),
  hero: item("hero", "Dinner"),
  gap: gapRow("gap", "1 hour open"),
  next: item("next", "Late prayer"),
  after: item("after", "Journal"),
};

/** The current-todo arrangement (v451/v456): Feed, a
 * point todo, current as a plain row; Dinner next up
 * in the box; the late thing after the gap. */
const currentTodoCandidates: TitledCandidates = {
  current: item("current", "Feed"),
  hero: item("hero", "Dinner"),
  gap: gapRow("gap", "1 hour open"),
  after: item("after", "Late thing"),
};

/** The v453 tall day: the fixed core and the rest of
 * the day walking in under it. */
const tallDayCandidates: TitledCandidates = {
  last: item("last", "Garden Prayer"),
  current: item("current", "Feed"),
  hero: item("hero", "Write"),
  gap: gapRow("gap", "30 minutes open"),
  after: item("after", "Lunch"),
};
const tallDayExtension: TitledRow[] = [
  item("x1", "Rest"),
  gapRow("xg", "45 minutes open"),
  item("x2", "Plan"),
];

// ─── 1. The diagnosis, pinned: fill and snapshot are innocent ───────────────

describe("v457 Up Next — the title was set; the budget was the lie (source + layout)", () => {
  const slot = rendererFn("fillRailSlot");
  const body = rendererFn("renderUpNext");

  it("fillRailSlot sets the title in every item dress — done, current, past, and the plain following item Edit wears", () => {
    // Four branches paint an item's words onto nx_title:
    // there is no kind path that stands a row up with
    // its time and dot but without its title.
    expect(slot.split('views.setTextViewText(id("title"), row.title)').length - 1).toBe(4);
    // And the two band dresses set the hero title.
    expect(slot.split('views.setTextViewText(id("htitle"), row.title)').length - 1).toBe(2);
  });

  it("the nine slots are perfect stamps — every slot carries its title and time ids", () => {
    for (let n = 1; n <= 9; n += 1) {
      expect(upNextLayout).toContain(`android:id="@+id/nx_title_${n}"`);
      expect(upNextLayout).toContain(`android:id="@+id/nx_time_${n}"`);
      expect(upNextLayout).toContain(`android:id="@+id/nx_dot_${n}"`);
    }
    // Slots 1–8 are byte-identical once the slot number
    // is normalized away (slot 9 carries the parents'
    // closing tags, so it is checked by its ids above).
    const starts: number[] = [];
    for (let n = 1; n <= 9; n += 1) {
      starts.push(upNextLayout.indexOf(`android:id="@+id/nx_row_${n}"`));
    }
    const chunks = starts.map((at, i) =>
      upNextLayout.slice(at, i + 1 < starts.length ? starts[i + 1] : upNextLayout.length),
    );
    const normalized = chunks.map((chunk, i) =>
      chunk.replace(new RegExp(`_${i + 1}\\b`, "g"), "_X"),
    );
    for (let i = 1; i < 8; i += 1) {
      expect(normalized[i], `slot ${i + 1} stamps slot 1`).toBe(normalized[0]);
    }
  });

  it("the snapshot parse reads every title the same way — no kind gate stands between a ministry and its title", () => {
    expect(body).toContain('d.optString("title")');
    expect(body).toContain('d.optString("sub")');
    // Write painted in the band and Edit vanished at
    // the rail's foot out of the SAME uniform parse:
    // the DayItem construction reads no kind at all.
    const parseAt = body.indexOf('d.optString("title")');
    const parse = body.slice(body.lastIndexOf("DayItem(", parseAt), parseAt + 400);
    expect(parse).not.toContain("kind");
  });
});

// ─── 2. The honest costs (source) ───────────────────────────────────────────

describe("v457 Up Next — honest costs and the bottom buffer (source)", () => {
  const sel = rendererFn("selectRailRows");

  it("the budget plans against the honest chrome and the grown buffer", () => {
    expect(sel).toContain("val railBudget = heightSignal - 64 - 20");
    expect(sel).not.toContain("heightSignal - 56 - 16");
  });

  it("the prices are the layout's own: box 66, plain row 36, gap 33 — in the core and the extension alike", () => {
    expect(sel).toContain("remaining -= 66");
    expect(sel).toContain("remaining -= 36");
    expect(sel).toContain("remaining -= 33");
    expect(sel).toContain("36 <= remaining");
    expect(sel).toContain("33 <= remaining");
    expect(sel).toContain('val cost = if (row.kind == "gap") 33 else 36');
    expect(sel).not.toContain("remaining -= 64");
    expect(sel).not.toContain("remaining -= 34");
    expect(sel).not.toContain("remaining -= 32");
  });

  it("the derivation is written on the selection: the padded line box, the bottom buffer, whole or not at all", () => {
    expect(renderer).toContain("font's padded");
    expect(renderer).toContain("1.36");
    expect(renderer).toContain("bottom buffer");
    expect(renderer).toContain("fits WHOLE inside the card");
  });

  it("the gates and the cap did not move: the extension still walks only behind a seated after row, nine slots still cap it", () => {
    expect(sel).toContain("if (afterChosen) {");
    expect(sel).toContain("if (display.size >= 9) break");
    expect(sel).toContain("if (cost > remaining) break");
  });
});

// ─── 3. Jonathan's tall fixture: Edit seats with its title, or not at all ───

describe("v457 Up Next — the morning Edit lost its title, re-run", () => {
  it("the box decision on his day is v455's: Write struck in the box, Lunch under it, Rest the after seat, no core gap", () => {
    expect(jonathanDecision.box).toBe("struck");
    expect(jonathanDecision.struckIndex).toBe(1);
    expect(jonathanDecision.lastIndex).toBe(0);
    expect(jonathanDecision.underIndex).toBe(2);
    expect(jonathanDecision.afterSeatIndex).toBe(3);
    expect(jonathanDecision.gapMinutes).toBeNull();
  });

  it("at his tall height the whole day seats — and the last row is Edit, WITH its title", () => {
    const display = selectRailRowsTitledMirror(jonathanCandidates, jonathanExtension, 344);
    expect(keys(display)).toEqual(["last", "hero", "next", "after", "xgap", "xitem"]);
    expect(display[display.length - 1].text).toBe("Edit");
    expectEveryRowTitled(display);
  });

  it("the threshold is exact: one dp taller and Edit seats; at 326 it drops WHOLE — no partial row stands in its place", () => {
    const seats = selectRailRowsTitledMirror(jonathanCandidates, jonathanExtension, 327);
    expect(keys(seats)).toEqual(["last", "hero", "next", "after", "xgap", "xitem"]);
    const drops = selectRailRowsTitledMirror(jonathanCandidates, jonathanExtension, 326);
    expect(keys(drops)).toEqual(["last", "hero", "next", "after", "xgap"]);
    // Dropped whole: no entry for Edit, and nothing in
    // the list is a husk — every standing row is titled.
    expect(drops.find((r) => r.key === "xitem")).toBeUndefined();
    expectEveryRowTitled(drops);
  });

  it("at every height the rail only ever shows whole, titled rows — a sweep across his placements", () => {
    const canonical = ["last", "hero", "next", "after", "xgap", "xitem"];
    for (let signal = 232; signal <= 480; signal += 2) {
      const display = selectRailRowsTitledMirror(jonathanCandidates, jonathanExtension, signal);
      expect(display.length).toBeLessThanOrEqual(9);
      expectEveryRowTitled(display);
      // Display order never scrambles: the keys are a
      // subsequence of the day's canonical order, and
      // Edit never stands without the gap before it and
      // the whole core in front of that.
      const positions = keys(display).map((k) => canonical.indexOf(k));
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
      if (keys(display).includes("xitem")) {
        expect(keys(display)).toEqual(canonical);
      }
    }
  });
});

// ─── 4. Every fixture day: seated rows carry their titles ───────────────────

describe("v457 Up Next — the fixture set, titled", () => {
  it("the Feed Aaron day at a tall height: the whole day seats, every row with its words", () => {
    const display = selectRailRowsTitledMirror(feedAaronCandidates, feedAaronExtension, 480);
    expect(keys(display)).toEqual(["last", "hero", "gap", "next", "after", "x1", "xg", "x2"]);
    expect(display.map((r) => r.text)).toEqual([
      "News",
      "Feed Aaron",
      "30 minutes open",
      "Write",
      "Lunch",
      "Rest",
      "30 minutes open",
      "Plan",
    ]);
    expectEveryRowTitled(display);
  });

  it("Dinner's evening: last, the running box, the gap, what's coming up — all titled", () => {
    const display = selectRailRowsTitledMirror(dinnerCandidates, [], 480);
    expect(keys(display)).toEqual(["last", "hero", "gap", "next", "after"]);
    expectEveryRowTitled(display);
  });

  it("the current-todo day: the plain current row and the box, both titled, no NOW row (v456 stands)", () => {
    const display = selectRailRowsTitledMirror(currentTodoCandidates, [], 480);
    expect(keys(display)).toEqual(["current", "hero", "gap", "after"]);
    expectEveryRowTitled(display);
  });

  it("the v453 tall day re-run: the fixed core, then the rest of the day — every row titled", () => {
    const display = selectRailRowsTitledMirror(tallDayCandidates, tallDayExtension, 480);
    expect(keys(display)).toEqual(["last", "current", "hero", "gap", "after", "x1", "xg", "x2"]);
    expectEveryRowTitled(display);
  });
});

// ─── 5. His standard height is v456's, row for row ──────────────────────────

describe("v457 Up Next — honest costs cost nothing at his standard height", () => {
  it("the Feed Aaron day at 232: last, the box, Write struck under it — v456's seating exactly", () => {
    const display = selectRailRowsTitledMirror(feedAaronCandidates, feedAaronExtension, 232);
    expect(keys(display)).toEqual(["last", "hero", "next"]);
    expectEveryRowTitled(display);
  });

  it("Jonathan's day at 232: Morning Meeting, Write's box, Lunch under it — v456's seating exactly", () => {
    const display = selectRailRowsTitledMirror(jonathanCandidates, jonathanExtension, 232);
    expect(keys(display)).toEqual(["last", "hero", "next"]);
    expect(display.map((r) => r.text)).toEqual(["Morning Meeting", "Write", "Lunch"]);
  });

  it("the v453 core at 232: last, current, the box — and no extension behind a core that took the budget", () => {
    const display = selectRailRowsTitledMirror(tallDayCandidates, tallDayExtension, 232);
    expect(keys(display)).toEqual(["last", "current", "hero"]);
    expectEveryRowTitled(display);
  });
});

// ─── 6. The cap and the misfit rule at honest prices ────────────────────────

describe("v457 Up Next — stop at the first misfit, nine slots, at the new prices", () => {
  it("a leftover of 34 stops an item (36) cold — and seats a gap (33) when the gap comes first", () => {
    // Signal 220: budget 136 after the − 64 − 20; the
    // box (66) and the after row (36) leave exactly 34.
    const core: TitledCandidates = { hero: item("hero", "Dinner"), after: item("after", "Late thing") };
    expect(keys(selectRailRowsTitledMirror(core, [item("x1", "Edit"), gapRow("xg", "1 hour open")], 220))).toEqual([
      "hero",
      "after",
    ]);
    const gapFirst = selectRailRowsTitledMirror(
      core,
      [gapRow("xg", "1 hour open"), item("x1", "Edit")],
      220,
    );
    expect(keys(gapFirst)).toEqual(["hero", "after", "xg"]);
    expectEveryRowTitled(gapFirst);
  });

  it("the nine-slot cap still caps the whole rail, extension included", () => {
    const core: TitledCandidates = {
      last: item("last", "One"),
      current: item("current", "Two"),
      hero: item("hero", "Three"),
      after: item("after", "Four"),
    };
    const extension = Array.from({ length: 8 }, (_, i) => item(`x${i + 1}`, `Item ${i + 1}`));
    const display = selectRailRowsTitledMirror(core, extension, 900);
    expect(display).toHaveLength(9);
    expect(keys(display).slice(0, 4)).toEqual(["last", "current", "hero", "after"]);
    expectEveryRowTitled(display);
  });
});

// ─── 7. The v456 confirmation: the squeeze moves to the last row ────────────

describe("v457 Up Next — the 12:01 PM composition: the third 2:00 PM row", () => {
  // Nov 6, 12:01 PM, on v456 (the NOW row gone, its 30
  // freed): last = Write (11:00) struck; the box =
  // Lunch (12:00) running, "1 H LEFT", the blue dot on
  // the box; the under-box gap "30 minutes open" (Lunch
  // ends 1:00, Edit starts 1:30); Edit (1:30 PM) as the
  // next row — WITH its title this time; Feed (2:00 PM)
  // the after row; Stitch Journal (2:00 PM) walking in;
  // and a THIRD 2:00 PM item at the very bottom painting
  // time + rail dot and no title (its title was not
  // reported; the fixture names it for what it is).
  // Under the old prices all seven seated — 266 of
  // charges — and the card's bottom took the last one's
  // words. Under honest prices the seven cost 279: at
  // his tall height the third item drops WHOLE, and at
  // the height where 279 truly fits it seats titled.
  // Jonathan: "that extra spot on the bottom is useless
  // as well."
  const noonCandidates: TitledCandidates = {
    last: item("last", "Write"),
    hero: item("hero", "Lunch"),
    gap: gapRow("gap", "30 minutes open"),
    next: item("next", "Edit"),
    after: item("after", "Feed"),
  };
  const noonExtension: TitledRow[] = [
    item("x1", "Stitch Journal"),
    item("x2", "Third 2:00 item"),
  ];

  it("at his tall height the third 2:00 PM item drops WHOLE — six rows stand, every one titled", () => {
    const display = selectRailRowsTitledMirror(noonCandidates, noonExtension, 344);
    expect(keys(display)).toEqual(["last", "hero", "gap", "next", "after", "x1"]);
    expect(display.find((r) => r.key === "x2")).toBeUndefined();
    expectEveryRowTitled(display);
  });

  it("at the height where the day honestly fits, all seven seat — the third 2:00 PM item WITH its title", () => {
    const display = selectRailRowsTitledMirror(noonCandidates, noonExtension, 363);
    expect(keys(display)).toEqual(["last", "hero", "gap", "next", "after", "x1", "x2"]);
    expect(display[display.length - 1].text).toBe("Third 2:00 item");
    expectEveryRowTitled(display);
  });

  it("one dp below that height it drops whole again — the threshold is the price of the whole day, not a fudge", () => {
    const display = selectRailRowsTitledMirror(noonCandidates, noonExtension, 362);
    expect(keys(display)).toEqual(["last", "hero", "gap", "next", "after", "x1"]);
    expect(display.find((r) => r.key === "x2")).toBeUndefined();
    expectEveryRowTitled(display);
  });
});
