/**
 * v456 — Up Next: the box IS now. The ruling Jonathan
 * made on the v455 render, minutes after it shipped
 * (Nov 6, 11:13 AM screenshot): the rail showed Morning
 * Meeting (10:00 AM, finished) struck as the last row, a
 * separate NOW row floating at 11:12 AM, and Write
 * (11:00 AM) in the box with DONE — the NOW marker at
 * clock time, the box item started at 11:00, the two out
 * of order on the rail and a row wasted on the marker.
 * His words: "That little 'now' thing is stupid!
 * Shouldn't the box be NOW? ... That way it shows what
 * is before, and what is coming after what is currently
 * in the box!"
 *
 * THE CHANGE — the NOW marker row is removed entirely,
 * in every box state:
 *
 * 1. THE SELECTION seats no NOW row. selectRailRows
 * builds no nowRow, holds no nowChosen: both NOW steps
 * are gone — step (2) is the current row alone (always
 * chosen when present), and there is no trailing step
 * (6). The display order loses the NOW add: last,
 * current, hero, gap, next, after. The 30 the NOW row
 * cost returns to the budget pool, so core and extension
 * seating follow the same whole-or-nothing,
 * stop-at-first-misfit rules with the freed height (the
 * nine-slot cap still caps the whole rail at nine).
 * boxIsNow stays in the signature — both paths still
 * hand it over, and it still names which holders ARE
 * now — but it seats nothing: there is no NOW row left
 * for it to stand down.
 *
 * 2. THE BOX carries the now anchor. In fillRailSlot the
 * three box dresses (hero, heroDone, whitebox) wear the
 * filled blue now dot at the box's rail position — the
 * ring in the container colour with the primary dot
 * inside it, exactly what the removed NOW row wore (and
 * what the current row still wears). The struck box
 * gives up the done family's green rail dot for it (the
 * done dress lives inside its band: struck title, DONE
 * pill, green check — unchanged); the white box gives
 * up the gap family's small softened dot. The "now"
 * dress branch is deleted — no row of that kind is ever
 * built. Item rows keep their existing dots and checks,
 * exactly as they are.
 *
 * 3. THE FALLBACK loses its NOW row too. The legacy
 * entries walk never built a NOW row itself, but it ran
 * the same selection with boxIsNow = false, so the old
 * steps (2) and (6) seated one beside its frozen hero
 * whenever the stored entries called for it. Removing
 * the row from the one selection removes it there too,
 * and the fallback's hero wears the now dot like every
 * box. Nothing else about the fallback moves.
 *
 * What does not move: the box DECISION (renderUpNext's
 * recomputation — the picks, both struck candidacies,
 * the under pick, the last pick with its rescue, the
 * open-stretch measurement) is v455's, untouched: the
 * mirror below is carried over from v455 verbatim. A
 * current todo's plain item row stays exactly as it is
 * (v451: it seats as a plain row and never takes the
 * box) — it just never has a NOW row beside it any more.
 * The last row, next row, after row, under-box gaps and
 * the v453 tall extension keep their behaviour; the
 * header and the LEFT chip are unchanged; the snapshot
 * needed nothing, again.
 *
 * The Kotlin renderer cannot execute in this harness, so
 * — as in every round — the behaviour is pinned two
 * ways: source assertions on the real renderer, and
 * executable mirrors (the v456 selection, translated
 * from the new selectRailRows; and the box decision,
 * v455's mirror carried over unchanged) whose gates and
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

/** One dress branch inside fillRailSlot, from its kind label
 * to the next branch's label. */
function slotBranch(slot: string, kind: string, nextKind: string): string {
  const at = slot.indexOf(`"${kind}" -> {`);
  expect(at, `${kind} branch present`).toBeGreaterThan(-1);
  const end = slot.indexOf(`"${nextKind}" -> {`, at);
  expect(end, `${nextKind} branch present`).toBeGreaterThan(at);
  return slot.slice(at, end);
}

// ─── The executable mirrors ─────────────────────────────────────────────────
// (a) The selection — v456's, translated from the new
// selectRailRows: no NOW row is built or chosen in any
// state; the 30 it cost is never spent. boxIsNow is
// still handed over (both Kotlin call sites pass it)
// and seats nothing. Extension rows ride as "xitem" /
// "xgap" (the v453 convention).

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
  // v456: boxIsNow arrives and seats nothing — there is
  // no NOW row for it to stand down.
  void boxIsNow;
  let remaining = heightSignal - 56 - 16;
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
    remaining -= 64;
  }
  // (2) current — always chosen when present. No NOW
  // row seats in its place; nothing stands at this step
  // when nothing is current.
  if (c.current) {
    chosen.current = true;
    remaining -= 34;
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
  // (No step (6): the trailing NOW row is gone.)
  // The gap row last — the under-box gap is the only gap
  // candidate; no gap stands before the box.
  if (c.gap && 32 <= remaining) {
    chosen.gap = true;
    remaining -= 32;
  }
  const display: string[] = [];
  if (chosen.last) display.push("last");
  if (chosen.current) display.push("current");
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

// (b) The box decision — v455's mirror, carried over
// unchanged (v456 does not touch renderUpNext's
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

// ─── 1. The selection lost the NOW row (source) ─────────────────────────────

describe("v456 Up Next — no NOW row in the selection (source)", () => {
  const sel = rendererFn("selectRailRows");

  it("no NOW row is built, chosen, or costed anywhere in the selection", () => {
    expect(sel).not.toContain('RailRow("now"');
    expect(sel).not.toContain("nowRow");
    expect(sel).not.toContain("nowChosen");
    // The 30 it cost returns to the budget pool — the
    // other decrements are the source's, unchanged.
    // v457 amendment: the decrements themselves were
    // repriced in v457 (honest costs — the padded
    // line box, ≈1.36× for Roboto): hero 66, plain
    // 36, gap 33. The NOW row's 30 stays retired.
    expect(sel).not.toContain("remaining -= 30");
    expect(sel).toContain("remaining -= 66");
    expect(sel).toContain("remaining -= 36");
    expect(sel).toContain("remaining -= 33");
  });

  it("the whole renderer builds no NOW row and stands no NOW dress — either path", () => {
    expect(renderer).not.toContain('RailRow("now"');
    expect(renderer).not.toContain('"now" -> {');
  });

  it("step (2) is the current row alone — no anchor gate stands where the NOW branch was", () => {
    expect(sel).toContain("if (current != null) {");
    expect(sel).not.toContain("else if (!boxIsNow)");
    expect(sel).not.toContain("30 <= remaining");
  });

  it("the signature, the budget and the extension gate are untouched — boxIsNow still handed over", () => {
    expect(sel).toContain(
      "last: RailRow?,\n    current: RailRow?,\n    hero: RailRow?,\n    gap: RailRow?,\n    after: RailRow?,\n    next: RailRow?,\n    boxIsNow: Boolean,\n    extension: List<RailRow>,",
    );
    // v457 amendment: the budget line's prices moved
    // (honest chrome 64 + a 20dp bottom buffer); the
    // signature and the extension gate stand as
    // v456 left them.
    expect(sel).toContain("val railBudget = heightSignal - 64 - 20");
    expect(sel).toContain("if (afterChosen) {");
    expect(sel).toContain("if (display.size >= 9) break");
  });

  it("the step order is hero, current, last, next, after, gap, extension — no NOW step between them", () => {
    const heroAt = sel.indexOf("heroChosen = true");
    const currentAt = sel.indexOf("currentChosen = true", heroAt);
    const lastAt = sel.indexOf("lastChosen = true", currentAt);
    const nextAt = sel.indexOf("nextChosen = true", lastAt);
    const afterAt = sel.indexOf("afterChosen = true", nextAt);
    const gapAt = sel.indexOf("gapChosen = true", afterAt);
    const walkAt = sel.indexOf("for (row in extension) {", gapAt);
    for (const at of [heroAt, currentAt, lastAt, nextAt, afterAt, gapAt, walkAt]) {
      expect(at).toBeGreaterThan(-1);
    }
    expect(heroAt).toBeLessThan(currentAt);
    expect(currentAt).toBeLessThan(lastAt);
    expect(lastAt).toBeLessThan(nextAt);
    expect(nextAt).toBeLessThan(afterAt);
    expect(afterAt).toBeLessThan(gapAt);
    expect(gapAt).toBeLessThan(walkAt);
  });

  it("the display order is last, current, hero, gap, next, after — the box follows the anchors directly", () => {
    const adds = [
      "display.add(last)",
      "display.add(current)",
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
    expect(sel).not.toContain("display.add(nowRow)");
  });
});

// ─── 2. The box carries the now dot; the fallback too (source) ──────────────

describe("v456 Up Next — the box's rail dot is the now dot (source)", () => {
  const slot = rendererFn("fillRailSlot");
  const body = rendererFn("renderUpNext");

  it("the hero dress stands the NOW ring at the box's rail position, its dot already primary", () => {
    const branch = slotBranch(slot, "hero", "heroDone");
    expect(branch).toContain('views.setViewVisibility(id("ring"), View.VISIBLE)');
    expect(branch).toContain('views.setInt(id("ring"), "setColorFilter", pal.container)');
    expect(branch).toContain('views.setInt(id("dot"), "setColorFilter", pal.primary)');
    // The band itself is untouched.
    expect(branch).toContain('views.setViewVisibility(id("band"), View.VISIBLE)');
    expect(branch).toContain(
      "if (row.heroLeft) remainingText(row.startMinutes, nowMinutes()) else countdownText(row.startMinutes, nowMinutes())",
    );
  });

  it("the struck box wears the now dot on the rail — ring + primary, not the done family's green", () => {
    const branch = slotBranch(slot, "heroDone", "whitebox");
    expect(branch).toContain('views.setViewVisibility(id("ring"), View.VISIBLE)');
    expect(branch).toContain('views.setInt(id("ring"), "setColorFilter", pal.container)');
    expect(branch).toContain('views.setInt(id("dot"), "setColorFilter", pal.primary)');
    expect(branch).not.toContain("pal.greenContainer");
    // The done dress inside the band is untouched: struck
    // title, DONE pill in the reached green, green check.
    expect(branch).toContain(
      'setInt(id("htitle"), "setPaintFlags", Paint.ANTI_ALIAS_FLAG or Paint.STRIKE_THRU_TEXT_FLAG)',
    );
    expect(branch).toContain('setTextViewText(id("hcount"), "DONE")');
    expect(branch).toContain('setImageViewBitmap(id("check"), checkBitmap(pal.green))');
  });

  it("the white box wears the now dot — the gap family's small softened dot is gone from it", () => {
    const branch = slotBranch(slot, "whitebox", "gap");
    expect(branch).toContain('views.setViewVisibility(id("ring"), View.VISIBLE)');
    expect(branch).toContain('views.setInt(id("ring"), "setColorFilter", pal.container)');
    expect(branch).toContain('views.setInt(id("dot"), "setColorFilter", pal.primary)');
    expect(branch).not.toContain('views.setViewVisibility(id("dot_small"), View.VISIBLE)');
    expect(branch).not.toContain('views.setViewVisibility(id("dot"), View.GONE)');
    // Its band is untouched: white-block fill, gap voice,
    // the pill counting down to the next item.
    expect(branch).toContain('setInt(id("band_img"), "setColorFilter", pal.surfaceAlt)');
    expect(branch).toContain('setTextViewText(id("hcount"), countdownText(row.startMinutes, nowMinutes()))');
    // And the plain gap row keeps its small dot — only
    // the BOX changed families.
    const gapAt = slot.indexOf('"gap" -> {');
    expect(gapAt).toBeGreaterThan(-1);
    const gapBranch = slot.slice(gapAt, slot.indexOf("else -> {", gapAt));
    expect(gapBranch).toContain('views.setViewVisibility(id("dot_small"), View.VISIBLE)');
  });

  it("the current row's dress is exactly as it was — its own ringed dot, nothing added", () => {
    const branch = slotBranch(slot, "current", "past");
    expect(branch).toContain('views.setViewVisibility(id("ring"), View.VISIBLE)');
    expect(branch).toContain('views.setInt(id("dot"), "setColorFilter", pal.primary)');
    expect(branch).toContain('views.setTextViewText(id("title"), row.title)');
    expect(branch).not.toContain('views.setViewVisibility(id("now"), View.VISIBLE)');
  });

  it("the fallback runs the same selection with boxIsNow = false — and so seats no NOW row either", () => {
    expect(body).toContain(
      "selectRailRows(lastRow, currentRow, heroRow, gapRow, afterRow, nextRow, boxIsNow, extensionRows, heightSignal)",
    );
    expect(body).toContain(
      "selectRailRows(lastRow, currentRow, heroRow, gapRow, afterRow, null, false, emptyList(), heightSignal)",
    );
    // Its hero is built by the same "hero" construction
    // the render-time path uses — the dress above is the
    // one slot fill for both.
    expect(body.split('RailRow("hero"').length - 1).toBeGreaterThan(0);
  });

  it("boxIsNow still names the two holders that ARE now, and the white box still wears the clock as its rail time", () => {
    expect(body).toContain("val heroRunning = runningIdx != null");
    expect(body).toContain("val boxIsNow = heroRunning || heroWhite");
    // The white box's time label is the device clock —
    // fitting, now that the box is the marker: it reads
    // the current time where the NOW row used to.
    expect(body).toContain('RailRow("whitebox", nowTimeLabel(), "", "", ');
  });
});

// ─── 3. The fixtures: no NOW row in any box state ───────────────────────────

describe("v456 Up Next — the five box states, none with a NOW row", () => {
  it("running: Dinner boxed at 8:01 PM — last, the box, the gap, what's coming up, the after; no NOW row", () => {
    // His v451 evening: Feed (6 PM todo) done; Dinner
    // 20:00–21:00 running; the late things at 22:00 and
    // 23:00 standing.
    const items: MirrorItem[] = [
      { start: 1080, end: 1110, hasEnd: false, completed: true },
      { start: 1200, end: 1260, hasEnd: true, completed: false },
      { start: 1320, end: 1350, hasEnd: true, completed: false },
      { start: 1380, end: 1410, hasEnd: true, completed: false },
    ];
    const d = boxDecisionMirror(items, 1201);
    expect(d.box).toBe("running");
    expect(d.boxIsNow).toBe(true);
    const c: Candidates = { ...NONE, last: true, hero: true, gap: true, next: true, after: true };
    const display = selectRailRowsMirror(c, d.boxIsNow, [], 480);
    expect(display).toEqual(["last", "hero", "gap", "next", "after"]);
    expect(display).not.toContain("now");
  });

  it("struck in-window — the Feed Aaron day at 10:01: the box is Feed Aaron's, Write waits struck under it, no NOW row", () => {
    // v455's fixture day, re-run: News (9:30–10:00)
    // finished and passed; Feed Aaron (10 AM todo, its
    // +30 window to 10:30) checked off at its time; Write
    // (11 AM) checked off early; Lunch and Rest standing.
    const items: MirrorItem[] = [
      { start: 570, end: 600, hasEnd: true, completed: true }, // News
      { start: 600, end: 630, hasEnd: false, completed: true }, // Feed Aaron
      { start: 660, end: 690, hasEnd: true, completed: true }, // Write
      { start: 720, end: 750, hasEnd: true, completed: false }, // Lunch
      { start: 780, end: 810, hasEnd: true, completed: false }, // Rest
    ];
    const d = boxDecisionMirror(items, 601);
    expect(d.box).toBe("struck");
    expect(d.struckIndex).toBe(1);
    expect(d.lastIndex).toBe(0);
    expect(d.underIndex).toBe(2);
    expect(d.underKind).toBe("done");
    expect(d.gapMinutes).toBe(30);
    const c: Candidates = { ...NONE, last: true, hero: true, gap: true, next: true, after: true };
    const display = selectRailRowsMirror(c, d.boxIsNow, ["xitem", "xgap", "xitem"], 480);
    expect(display).toEqual(["last", "hero", "gap", "next", "after", "xitem", "xgap", "xitem"]);
    expect(display).not.toContain("now");
  });

  it("struck early-checked: the later of two checked early holds the box, the earlier is the last row, no NOW row", () => {
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
    expect(d.gapMinutes).toBe(30);
    const c: Candidates = { ...NONE, last: true, hero: true, gap: true, next: true };
    const display = selectRailRowsMirror(c, d.boxIsNow, [], 480);
    expect(display).toEqual(["last", "hero", "gap", "next"]);
    expect(display).not.toContain("now");
  });

  it("white box: standing in open time the box IS the white space — and it is the now marker, no NOW row beside it", () => {
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
    const c: Candidates = { ...NONE, last: true, hero: true, next: true, after: true };
    const display = selectRailRowsMirror(c, d.boxIsNow, [], 480);
    expect(display).toEqual(["last", "hero", "next", "after"]);
    expect(display).not.toContain("now");
  });

  it("plain next-up box: his 8:57 AM — the imminent morning routine in the box, the finished 1 AM todo last, no NOW row", () => {
    // Three open minutes to the 9:00 routine: too soon
    // for the white box, so the box is the next up's —
    // and under the old rules this state drew the NOW row
    // in front of it. Now the box carries the moment.
    const items: MirrorItem[] = [
      { start: 60, end: 90, hasEnd: false, completed: true },
      { start: 540, end: 570, hasEnd: true, completed: false },
    ];
    const d = boxDecisionMirror(items, 537);
    expect(d.box).toBe("next");
    expect(d.openMinutes).toBe(3);
    expect(d.boxIsNow).toBe(false);
    const c: Candidates = { ...NONE, last: true, hero: true };
    const display = selectRailRowsMirror(c, d.boxIsNow, [], 480);
    expect(display).toEqual(["last", "hero"]);
    expect(display).not.toContain("now");
  });

  it("his screenshot, fixed: at 11:12 the rows are Morning Meeting struck, Write's box with the now dot, then what follows — no NOW row", () => {
    // The v456 ruling's own fixture. Morning Meeting
    // 10:00–11:00 finished and passed; Write 11:00–11:30
    // checked off inside its window (the struck holder);
    // Lunch 12:00, Rest 1:00 PM and a 2:00 PM thing
    // standing behind it.
    const items: MirrorItem[] = [
      { start: 600, end: 660, hasEnd: true, completed: true }, // Morning Meeting
      { start: 660, end: 690, hasEnd: true, completed: true }, // Write
      { start: 720, end: 750, hasEnd: true, completed: false }, // Lunch
      { start: 780, end: 810, hasEnd: true, completed: false }, // Rest
      { start: 840, end: 870, hasEnd: true, completed: false },
    ];
    const d = boxDecisionMirror(items, 672);
    expect(d.box).toBe("struck");
    // The box is Write's — the item whose window is now.
    expect(d.struckIndex).toBe(1);
    expect(d.lastIndex).toBe(0);
    expect(d.underIndex).toBe(2);
    expect(d.afterSeatIndex).toBe(3);
    expect(d.gapMinutes).toBe(30);
    const c: Candidates = { ...NONE, last: true, hero: true, gap: true, next: true, after: true };
    // Tall: the core, then the rest of the day walks in
    // under it (the 30-minute gap before the 2 PM thing,
    // then the thing itself).
    const tall = selectRailRowsMirror(c, d.boxIsNow, ["xgap", "xitem"], 480);
    expect(tall).toEqual(["last", "hero", "gap", "next", "after", "xgap", "xitem"]);
    expect(tall).not.toContain("now");
    // Standard height: last, the box, and Lunch under it
    // seat whole; the rest drop whole. Nothing floats
    // between Morning Meeting and the box.
    const standard = selectRailRowsMirror(c, d.boxIsNow, ["xgap", "xitem"], 232);
    expect(standard).toEqual(["last", "hero", "next"]);
    expect(standard.indexOf("hero")).toBe(standard.indexOf("last") + 1);
  });
});

// ─── 4. The current todo's row, and the extension with the freed height ─────

describe("v456 Up Next — what did not move", () => {
  it("a current todo still seats as a plain row and never takes the box (v451) — and no NOW row is added beside it", () => {
    // 6:20 PM: Feed, a point todo begun at 6:00, is
    // current; Dinner (8–9 PM) is the next up and takes
    // the box; the late thing stands at 10 PM. Under the
    // old rules a trailing NOW row also stood in this
    // arrangement; the arrangement is otherwise v451's.
    const items: MirrorItem[] = [
      { start: 1080, end: 1110, hasEnd: false, completed: false }, // Feed (todo)
      { start: 1200, end: 1260, hasEnd: true, completed: false }, // Dinner
      { start: 1320, end: 1350, hasEnd: true, completed: false }, // Late thing
    ];
    const d = boxDecisionMirror(items, 1100);
    expect(d.box).toBe("next");
    expect(d.currentIndex).toBe(0);
    const c: Candidates = { ...NONE, current: true, hero: true, gap: true, after: true };
    const display = selectRailRowsMirror(c, false, [], 480);
    expect(display).toEqual(["current", "hero", "gap", "after"]);
    expect(display).not.toContain("now");
    expect(display.indexOf("current")).toBe(0);
  });

  it("the v453 tall day re-run: same seating, minus the NOW row", () => {
    const c: Candidates = { ...NONE, last: true, current: true, hero: true, gap: true, after: true };
    const display = selectRailRowsMirror(c, false, ["xitem", "xgap", "xitem"], 480);
    expect(display).toEqual(["last", "current", "hero", "gap", "after", "xitem", "xgap", "xitem"]);
    expect(display).not.toContain("now");
  });

  it("the freed 30 at his standard height: the next row seats where the NOW row used to — rows still whole or not at all", () => {
    // v455's standard-height fixture day (the Feed Aaron
    // candidates). The v455 mirror seated last / NOW /
    // hero / gap here: the NOW row's 30 bought the gap.
    // In v456 the same 30 buys the NEXT row instead (34
    // against the 62 the box and last left), and the gap
    // no longer fits behind it — it drops whole, as ever.
    const c: Candidates = { ...NONE, last: true, hero: true, gap: true, next: true, after: true };
    const display = selectRailRowsMirror(c, false, ["xitem", "xgap", "xitem"], 232);
    expect(display).toEqual(["last", "hero", "next"]);
    expect(display).not.toContain("now");
  });

  it("Dinner's evening at a tall height re-run: last, struck box, white gap, the 10 PM row — no NOW row", () => {
    const c: Candidates = { ...NONE, last: true, hero: true, gap: true, next: true };
    const display = selectRailRowsMirror(c, false, [], 480);
    expect(display).toEqual(["last", "hero", "gap", "next"]);
    expect(display).not.toContain("now");
  });

  it("the extension still stops at the first element that does not fit — a smaller one never seats past the hole", () => {
    // Budget 131 after the − 56 − 16: box 64 and after
    // 34 leave 33. An item (34) does not fit; the gap
    // (32) behind it is never reached.
    const c: Candidates = { ...NONE, hero: true, after: true };
    expect(selectRailRowsMirror(c, false, ["xitem", "xgap"], 203)).toEqual(["hero", "after"]);
    // The same leftover with the gap first: the gap
    // seats, then the item stops the walk.
    expect(selectRailRowsMirror(c, false, ["xgap", "xitem"], 203)).toEqual(["hero", "after", "xgap"]);
  });

  it("the nine-slot cap still caps the whole rail, extension included", () => {
    const c: Candidates = { ...NONE, last: true, current: true, hero: true, after: true };
    const display = selectRailRowsMirror(
      c,
      false,
      ["xitem", "xitem", "xitem", "xitem", "xitem", "xitem", "xitem", "xitem"],
      900,
    );
    expect(display).toHaveLength(9);
    expect(display.slice(0, 4)).toEqual(["last", "current", "hero", "after"]);
    expect(display.filter((r) => r === "xitem")).toHaveLength(5);
    expect(display).not.toContain("now");
  });
});
