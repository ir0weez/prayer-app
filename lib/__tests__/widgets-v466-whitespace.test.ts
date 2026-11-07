/**
 * v466 — Up Next: three white-space fixes, all ruled by
 * Jonathan on Saturday Nov 7 from his own home screen
 * (8:32 AM, the tall Up Next): the day was Rest 9:00–10:00
 * (at the Garden, checked off EARLY), Brush Teeth 9:30,
 * Gardening 16:00–16:30, Duolingo 17:00 — and the widget
 * showed struck Rest in the box, Brush Teeth, Gardening,
 * no white block anywhere, and a half-empty card.
 *
 * FIX 1 — the white space outranks an early-checked item.
 * His words at 8:35, standing in open time before the
 * 9:00 Rest: "Well wouldn't right now be open time?" The
 * v454 priority (running → struck → white → next up) let
 * the one blended struck candidacy — in-window and
 * early-checked in a single pick — take the box over the
 * open stretch he was standing in (8:35→9:00 = 25 min).
 * The priority is restated: running event → in-window
 * struck (window contains now) → white box (≥15 min of
 * open time, measured to the first boundary that closes
 * it — the early item's start when one stands) →
 * early-checked struck → next up. The species are split
 * by the one test (startMinutes > now = early); the
 * in-window species keeps every v454/v455 behaviour
 * (Dinner at 8:30, Feed over Write). When the white box
 * wins, the early item still seats — struck, done dress,
 * directly under the box, ahead of the standing rows —
 * and at its window the box hands over to it as the
 * in-window holder. Under 15 minutes of open stretch the
 * early item holds the box exactly as before.
 *
 * FIX 2 — the mid-core stretch gets its gap candidate in
 * every branch. The core used to compute ONE gap
 * candidate per branch, and only the plain next-up
 * branch's covered the stretch between the under-box row
 * and the after row (his Saturday: Brush Teeth done at
 * 10:00 → Gardening 16:00, six open hours, no block). Now
 * the candidates are the open stretches between
 * consecutive seated core rows downstream of the box, in
 * chronological order — box→next, then next→after — and
 * the first qualifying one takes the core's single gap
 * slot, displaying where its stretch sits (a next→after
 * gap rides below the next row: gapBelowNext). Seating
 * discipline unchanged: last among core rows, leftover
 * budget only, never displacing an item row.
 *
 * FIX 3 — a trailing white block to the day's edge. On a
 * sparse day at a tall placement the rail ended early
 * and the card stood half blank. When the candidate
 * chain (core seats + the extension walk) reaches the
 * day's last standing item, the stretch from its end to
 * midnight (1440 — the schedule's day-window edge) is a
 * final extension candidate, priced like every gap,
 * seated whole-or-nothing after everything else. It is
 * absent when the walk stopped early (it rides last in
 * the list, behind the stop-at-the-first-hole rule),
 * when the last seated element is a gap whose item
 * didn't fit (same rule), and on the spent day's face —
 * the v464 T5 turn owns that; nothing here touches the
 * turn or the legacy-entries fallback.
 *
 * The tests are the family's two kinds: source pins on
 * the Kotlin, and executable mirrors — a line-for-line
 * translation of the render-time decision as v466 leaves
 * it, and of the selection at the v457 prices — run over
 * his Saturday and the regression days.
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

// ─── 1. Fix 1 on the source: the species split and the yield ────────────────

describe("v466 Up Next — Fix 1: the white space outranks an early-checked item (source)", () => {
  const body = rendererFn("renderUpNext");

  it("the species split is the one test: a holder whose window has not started is the early species", () => {
    expect(body).toContain(
      "if (struckIdx != null && dayItems[struckIdx].startMinutes > nowMin) struckIdx else null",
    );
    expect(body).toContain("val earlyIdx: Int?");
  });

  it("the stretch is measured to the first boundary that closes it", () => {
    expect(body).toContain("val openBoundaryIdx = earlyIdx ?: next1Idx");
    expect(body).toContain(
      "openMinutes = dayItems[openBoundaryIdx].startMinutes - maxOf(nowMin, prevEnd)",
    );
    expect(body).toContain(
      'RailRow("whitebox", nowTimeLabel(), "", "", dayItems[openBoundaryIdx].startMinutes, openDurationText(openMinutes))',
    );
  });

  it("the yield: at ≥15 minutes the candidacy yields before the v454 white test reads it", () => {
    expect(body).toContain(
      "if (openMinutes >= 15 && runningIdx == null && earlyIdx != null) {",
    );
    const yieldAt = body.indexOf("struckIdx = null");
    const whiteTestAt = body.indexOf("heroWhite = runningIdx == null && struckIdx == null");
    expect(yieldAt).toBeGreaterThan(-1);
    expect(whiteTestAt).toBeGreaterThan(yieldAt);
  });

  it("the box's holder is re-read after the yield: boxStruckItem, null while the white box stands", () => {
    expect(body).toContain("val boxStruckItem = if (heroWhite) null else struckItem");
    expect(body).toContain(
      'RailRow("heroDone", minutesToTimeLabel(boxStruckItem.startMinutes), boxStruckItem.title, boxStruckItem.sub, 0, "")',
    );
  });

  it("under the white box the early item seats struck in the done dress, ahead of the standing rows", () => {
    expect(body).toContain('nextRow = RailRow("done", minutesToTimeLabel(early.startMinutes), early.title, early.sub, early.startMinutes, "")');
    expect(body).toContain("val early = dayItems[earlyIdx]");
  });

  it("the after seat under a white-over-early box is the next standing item itself", () => {
    expect(body).toContain("} else if (heroWhite && earlyIdx != null) {");
  });

  it("the restated priority is written on the renderer", () => {
    expect(body).toContain("running\n      // event → in-window struck → the white space → the");
    expect(body).toContain("wouldn't right now be open time?");
  });
});

// ─── 2. Fix 2 on the source: a gap candidate for every branch's stretches ───

describe("v466 Up Next — Fix 2: the mid-core stretch gets its candidate in every branch (source)", () => {
  const body = rendererFn("renderUpNext");

  it("the running branch computes next→after after box→next, first qualifying stretch wins", () => {
    const aAt = body.indexOf("val boxGapMinutes = next1.startMinutes - running.endMinutes");
    const bAt = body.indexOf("val afterGapMinutes = dayItems[afterIdx].startMinutes - next1.endMinutes");
    expect(aAt).toBeGreaterThan(-1);
    expect(bAt).toBeGreaterThan(aAt);
    expect(body).toContain('gapRow = RailRow("gap", "", "", "", 0, openDurationText(afterGapMinutes), gapBelowNext = true)');
  });

  it("the struck branch computes under→after from the under item's end to the after seat's start", () => {
    expect(body).toContain("val underGapMinutes = afterItem.startMinutes - underItem.endMinutes");
    expect(body).toContain('gapRow = RailRow("gap", "", "", "", 0, openDurationText(underGapMinutes), gapBelowNext = true)');
  });

  it("the white branch computes its next→after candidate; the white-over-early branch its early→after", () => {
    expect(body).toContain("val whiteGapMinutes = dayItems[afterIdx].startMinutes - next1.endMinutes");
    expect(body).toContain('gapRow = RailRow("gap", "", "", "", 0, openDurationText(whiteGapMinutes), gapBelowNext = true)');
    expect(body).toContain("val earlyGapMinutes = next1.startMinutes - early.endMinutes");
    expect(body).toContain('gapRow = RailRow("gap", "", "", "", 0, openDurationText(earlyGapMinutes), gapBelowNext = true)');
  });

  it("every second-stretch candidate is guarded by the first stretch not standing", () => {
    expect(body.split("if (gapRow == null &&").length - 1).toBe(2);
    expect(body).toContain("if (gapRow == null && afterSeatIdx != null) {");
  });

  it("the gap row knows its display place: gapBelowNext on the row, both adds in the selection", () => {
    expect(renderer).toContain("val gapBelowNext: Boolean = false,");
    const sel = rendererFn("selectRailRows");
    expect(sel).toContain("if (gapChosen && gap != null && (!gap.gapBelowNext || !nextChosen)) display.add(gap)");
    expect(sel).toContain("if (gapChosen && gap != null && gap.gapBelowNext && nextChosen) display.add(gap)");
  });
});

// ─── 3. Fix 3 on the source: the trailing block and the widened gate ────────

describe("v466 Up Next — Fix 3: the trailing white block to the day's edge (source)", () => {
  const body = rendererFn("renderUpNext");

  it("the chain's end is read per arrangement: past an after seat, the walk covers the ahead list to its end", () => {
    expect(body).toContain("val chainLastIdx: Int? = when {");
    expect(body).toContain("afterSeatIdx != null -> aheadIdx.lastOrNull()");
    expect(body).toContain("aheadIdx.isEmpty() -> boxHolderIdx ?: earlyIdx");
    expect(body).toContain("boxStruckItem != null -> if (aheadIdx.all { it == underIdx }) underIdx else null");
    expect(body).toContain("else -> if (aheadIdx.all { it == next1Idx }) next1Idx else null");
  });

  it("a struck holder's chain end is its window end; every other item's is its baked end", () => {
    expect(body).toContain(
      "if (idx == boxHolderIdx && runningIdx == null) winEnd(item) else item.endMinutes",
    );
  });

  it("the candidate: ≥15 minutes to midnight, appended last to the extension candidates", () => {
    const walkAt = body.indexOf("for (k in aheadIdx.indexOf(afterSeatIdx) + 1 until aheadIdx.size) {");
    const trailAt = body.indexOf("if (chainEndMinutes != null && 1440 - chainEndMinutes >= 15) {");
    expect(walkAt).toBeGreaterThan(-1);
    expect(trailAt).toBeGreaterThan(walkAt);
    expect(body).toContain(
      'extensionRows.add(RailRow("gap", "", "", "", 0, openDurationText(1440 - chainEndMinutes)))',
    );
  });

  it("the gate is the core standing whole: an after row seated, or no after row at all", () => {
    const sel = rendererFn("selectRailRows");
    expect(sel).toContain("if (afterChosen || after == null) {");
  });

  it("the turn is untouched: no 1440 and no chain in renderUpNextTomorrow, and the fallback still gets an empty extension", () => {
    const t5 = rendererFn("renderUpNextTomorrow");
    expect(t5).not.toContain("1440");
    expect(t5).not.toContain("chainLastIdx");
    expect(body).toContain(
      "selectRailRows(lastRow, currentRow, heroRow, gapRow, afterRow, null, false, emptyList(), heightSignal)",
    );
  });
});

// ─── The executable mirrors ─────────────────────────────────────────────────
// (a) The render-time decision — a line-for-line translation
// of renderUpNext's recomputation as v466 leaves it (the
// ahead / current / running picks, the v454 candidacy, the
// v455 in-window override and under pick and rescue, the
// v466 species split, boundary and yield, the branches'
// rows and gap candidates, the extension walk and the
// trailing chain). Items carry their endMinutes as the
// snapshot bakes them (a point item's end is its rule-made
// default, +30 for a todo — hasEnd tells it apart).

interface MirrorItem {
  start: number;
  end: number;
  hasEnd: boolean;
  completed: boolean;
}

type ExtElement =
  | { kind: "gap"; minutes: number }
  | { kind: "item"; index: number };

interface DayDecision {
  box: "running" | "struck" | "white" | "next" | null;
  boxIndex: number | null;
  earlyIndex: number | null;
  openMinutes: number;
  boundaryIndex: number | null;
  nextIndex: number | null;
  nextKind: "done" | "item" | null;
  afterIndex: number | null;
  gap: { minutes: number; belowNext: boolean } | null;
  extension: ExtElement[];
  trailingMinutes: number | null;
}

function dayDecisionMirror(items: MirrorItem[], nowMin: number): DayDecision {
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
  // The v454 candidacy, verbatim (v455's mirror carried it).
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
  // The v455 in-window override.
  if (runningIdx === null) {
    const inWindowIdx =
      items
        .map((_, i) => i)
        .filter((i) => items[i].completed && items[i].start <= nowMin && nowMin < winEnd(items[i]))
        .sort((a, b) => items[b].start - items[a].start)[0] ?? null;
    if (inWindowIdx !== null) struckIdx = inWindowIdx;
  }
  // The under pick and the last pick with its rescue run on
  // the blended candidacy, exactly as the Kotlin does them.
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
  // v466 (Fix 1): the species split, the boundary, the yield.
  const earlyIdx =
    struckIdx !== null && items[struckIdx].start > nowMin ? struckIdx : null;
  const boundaryIdx = earlyIdx ?? next1Idx;
  let openMinutes = 0;
  if (currentIdx === null && boundaryIdx !== null) {
    const prevEnd = lastIdx !== null ? overAt(items[lastIdx]) : nowMin;
    openMinutes = items[boundaryIdx].start - Math.max(nowMin, prevEnd);
  }
  if (openMinutes >= 15 && runningIdx === null && earlyIdx !== null) {
    struckIdx = null;
  }
  let heroWhite = false;
  if (openMinutes >= 15) {
    heroWhite = runningIdx === null && struckIdx === null;
  }
  const boxStruckIdx = heroWhite ? null : struckIdx;
  const box: DayDecision["box"] =
    runningIdx !== null
      ? "running"
      : boxStruckIdx !== null
        ? "struck"
        : heroWhite
          ? "white"
          : next1Idx !== null
            ? "next"
            : null;
  // The branches' rows and gap candidates (Fix 2: box→next,
  // then next→after; the first qualifying stretch wins).
  let nextIndex: number | null = null;
  let nextKind: "done" | "item" | null = null;
  let afterIndex: number | null = null;
  let gap: DayDecision["gap"] = null;
  let afterSeatIdx: number | null = afterIdx;
  if (boxStruckIdx !== null) {
    afterSeatIdx = aheadIdx.filter((i) => i !== underIdx)[0] ?? null;
  } else if (heroWhite && earlyIdx !== null) {
    afterSeatIdx = next1Idx;
  }
  if (runningIdx !== null) {
    if (next1Idx !== null) {
      nextIndex = next1Idx;
      nextKind = "item";
      const a = items[next1Idx].start - items[runningIdx].end;
      if (a >= 15) gap = { minutes: a, belowNext: false };
      if (gap === null && afterIdx !== null) {
        const b = items[afterIdx].start - items[next1Idx].end;
        if (b >= 15) gap = { minutes: b, belowNext: true };
      }
    }
    if (afterIdx !== null) afterIndex = afterIdx;
  } else if (boxStruckIdx !== null) {
    if (underIdx !== null) {
      nextIndex = underIdx;
      nextKind = items[underIdx].completed ? "done" : "item";
      const a = items[underIdx].start - winEnd(items[boxStruckIdx]);
      if (a >= 15) gap = { minutes: a, belowNext: false };
      if (gap === null && afterSeatIdx !== null) {
        const b = items[afterSeatIdx].start - items[underIdx].end;
        if (b >= 15) gap = { minutes: b, belowNext: true };
      }
    }
    if (afterSeatIdx !== null) afterIndex = afterSeatIdx;
  } else if (heroWhite) {
    if (earlyIdx !== null) {
      nextIndex = earlyIdx;
      nextKind = "done";
      if (next1Idx !== null) {
        afterIndex = next1Idx;
        const g = items[next1Idx].start - items[earlyIdx].end;
        if (g >= 15) gap = { minutes: g, belowNext: true };
      }
    } else {
      if (next1Idx !== null) {
        nextIndex = next1Idx;
        nextKind = "item";
        if (afterIdx !== null) {
          const g = items[afterIdx].start - items[next1Idx].end;
          if (g >= 15) gap = { minutes: g, belowNext: true };
        }
      }
      if (afterIdx !== null) afterIndex = afterIdx;
    }
  } else if (next1Idx !== null && afterIdx !== null) {
    afterIndex = afterIdx;
    const g = items[afterIdx].start - items[next1Idx].end;
    if (g >= 15) gap = { minutes: g, belowNext: false };
  }
  // The extension walk, then the trailing chain (Fix 3).
  const extension: ExtElement[] = [];
  if (afterSeatIdx !== null) {
    let prevEnd = items[afterSeatIdx].end;
    for (let k = aheadIdx.indexOf(afterSeatIdx) + 1; k < aheadIdx.length; k += 1) {
      const item = items[aheadIdx[k]];
      const g = item.start - prevEnd;
      if (g >= 15) extension.push({ kind: "gap", minutes: g });
      extension.push({ kind: "item", index: aheadIdx[k] });
      prevEnd = item.end;
    }
  }
  const boxHolderIdx = runningIdx ?? boxStruckIdx;
  let chainLastIdx: number | null = null;
  if (afterSeatIdx !== null) {
    chainLastIdx = aheadIdx[aheadIdx.length - 1] ?? null;
  } else if (aheadIdx.length === 0) {
    chainLastIdx = boxHolderIdx ?? earlyIdx;
  } else if (boxStruckIdx !== null) {
    chainLastIdx = aheadIdx.every((i) => i === underIdx) ? underIdx : null;
  } else {
    chainLastIdx = aheadIdx.every((i) => i === next1Idx) ? next1Idx : null;
  }
  let trailingMinutes: number | null = null;
  if (chainLastIdx !== null) {
    const item = items[chainLastIdx];
    const chainEnd =
      chainLastIdx === boxHolderIdx && runningIdx === null ? winEnd(item) : item.end;
    if (1440 - chainEnd >= 15) trailingMinutes = 1440 - chainEnd;
  }
  if (trailingMinutes !== null) {
    extension.push({ kind: "gap", minutes: trailingMinutes });
  }
  return {
    box,
    boxIndex: runningIdx ?? boxStruckIdx ?? (heroWhite ? null : next1Idx),
    earlyIndex: earlyIdx,
    openMinutes,
    boundaryIndex: boundaryIdx,
    nextIndex,
    nextKind,
    afterIndex,
    gap,
    extension,
    trailingMinutes,
  };
}

// (b) The selection at the v457 prices, with the v466
// gate and the gap's display place. Candidates ride as
// booleans; the display is the row-kind sequence.

interface SelectionInput {
  last: boolean;
  current: boolean;
  hero: boolean;
  gapBelowNext: boolean;
  gap: boolean;
  after: boolean;
  next: boolean;
  extension: ExtElement[];
}

function selectMirror(c: SelectionInput, heightSignal: number): string[] {
  let remaining = heightSignal - 64 - 20;
  let lastChosen = false;
  let currentChosen = false;
  let heroChosen = false;
  let afterChosen = false;
  let nextChosen = false;
  let gapChosen = false;
  if (c.hero) {
    heroChosen = true;
    remaining -= 66;
  }
  if (c.current) {
    currentChosen = true;
    remaining -= 36;
  }
  if (c.last && 36 <= remaining) {
    lastChosen = true;
    remaining -= 36;
  }
  if (c.next && 36 <= remaining) {
    nextChosen = true;
    remaining -= 36;
  }
  if (c.after && 36 <= remaining) {
    afterChosen = true;
    remaining -= 36;
  }
  if (c.gap && 33 <= remaining) {
    gapChosen = true;
    remaining -= 33;
  }
  const display: string[] = [];
  if (lastChosen) display.push("last");
  if (currentChosen) display.push("current");
  if (heroChosen) display.push("hero");
  if (gapChosen && (!c.gapBelowNext || !nextChosen)) display.push("gap");
  if (nextChosen) display.push("next");
  if (gapChosen && c.gapBelowNext && nextChosen) display.push("gap");
  if (afterChosen) display.push("after");
  if (afterChosen || !c.after) {
    for (const row of c.extension) {
      if (display.length >= 9) break;
      const cost = row.kind === "gap" ? 33 : 36;
      if (cost > remaining) break;
      display.push(row.kind === "gap" ? "xgap" : "xitem");
      remaining -= cost;
    }
  }
  return display;
}

/** openDurationText, mirrored for the trailing wording. */
function openDurationTextMirror(totalMinutes: number): string {
  const minutes = Math.max(0, totalMinutes);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const body =
    hours === 0
      ? `${rest} minute${rest === 1 ? "" : "s"}`
      : rest === 0
        ? `${hours} hour${hours === 1 ? "" : "s"}`
        : `${hours} hour${hours === 1 ? "" : "s"} ${rest} minute${rest === 1 ? "" : "s"}`;
  return `${body} open`;
}

// ─── 4. Fix 1 fixtures: his Saturday, at three hours ────────────────────────

// His Saturday (Nov 7), as the snapshot bakes it: Rest the
// 9:00–10:00 event at the Garden, checked off early;
// Brush Teeth the 9:30 todo (rule-made end 10:00);
// Gardening 16:00–16:30; Duolingo the 17:00 todo.
const SATURDAY: MirrorItem[] = [
  { start: 540, end: 600, hasEnd: true, completed: true }, // Rest
  { start: 570, end: 600, hasEnd: false, completed: false }, // Brush Teeth
  { start: 960, end: 990, hasEnd: true, completed: false }, // Gardening
  { start: 1020, end: 1050, hasEnd: false, completed: false }, // Duolingo
];

describe("v466 Up Next — Fix 1: his Saturday at 8:35 AM", () => {
  const d = dayDecisionMirror(SATURDAY, 515);

  it("the box is the white space — right now IS open time", () => {
    expect(d.box).toBe("white");
    expect(d.earlyIndex).toBe(0);
  });

  it("the stretch is 25 minutes, measured to Rest's start — the pill counts down to the handover", () => {
    expect(d.openMinutes).toBe(25);
    expect(d.boundaryIndex).toBe(0);
  });

  it("Rest seats struck directly under the box, Brush Teeth after it", () => {
    expect(d.nextIndex).toBe(0);
    expect(d.nextKind).toBe("done");
    expect(d.afterIndex).toBe(1);
  });

  it("no core gap: the early item's end (10:00) is past Brush Teeth's start (9:30)", () => {
    expect(d.gap).toBeNull();
  });

  it("the whole day walks in the extension, and the trailing block closes it", () => {
    expect(d.extension).toEqual([
      { kind: "gap", minutes: 360 },
      { kind: "item", index: 2 },
      { kind: "gap", minutes: 30 },
      { kind: "item", index: 3 },
      { kind: "gap", minutes: 390 },
    ]);
    expect(d.trailingMinutes).toBe(390);
    expect(openDurationTextMirror(d.trailingMinutes!)).toBe("6 hours 30 minutes open");
  });

  it("at the tall placement the card fills: box, Rest, Brush Teeth, the six hours, Gardening, Duolingo, the evening", () => {
    const display = selectMirror(
      {
        last: false,
        current: false,
        hero: true,
        gapBelowNext: false,
        gap: d.gap !== null,
        after: true,
        next: true,
        extension: d.extension,
      },
      430,
    );
    expect(display).toEqual([
      "hero",
      "next",
      "after",
      "xgap",
      "xitem",
      "xgap",
      "xitem",
      "xgap",
    ]);
  });

  it("at the standard placement exactly the core stands, as priced", () => {
    const display = selectMirror(
      {
        last: false,
        current: false,
        hero: true,
        gapBelowNext: false,
        gap: d.gap !== null,
        after: true,
        next: true,
        extension: d.extension,
      },
      232,
    );
    expect(display).toEqual(["hero", "next", "after"]);
  });
});

describe("v466 Up Next — Fix 1: his Saturday at 9:05 AM, and the 15-minute line", () => {
  it("at 9:05 Rest holds the box as the in-window struck holder — the handover happened", () => {
    const d = dayDecisionMirror(SATURDAY, 545);
    expect(d.box).toBe("struck");
    expect(d.boxIndex).toBe(0);
    expect(d.earlyIndex).toBeNull();
    expect(d.nextIndex).toBe(1);
    expect(d.afterIndex).toBe(2);
  });

  it("at 8:50 the stretch is 10 minutes — under the line, the early-checked Rest holds the box as v454 had it", () => {
    const d = dayDecisionMirror(SATURDAY, 530);
    expect(d.openMinutes).toBe(10);
    expect(d.box).toBe("struck");
    expect(d.boxIndex).toBe(0);
  });
});

// ─── 5. Fix 1 regressions: the v454/v455 composition checks stand ───────────

describe("v466 Up Next — Fix 1 regressions: Dinner and Feed/Write stand", () => {
  it("Dinner, 8–9 PM, checked off at 8:30 with the next item at 10: struck Dinner in the box, the 9-to-10 gap under it", () => {
    const items: MirrorItem[] = [
      { start: 1200, end: 1260, hasEnd: true, completed: true }, // Dinner
      { start: 1320, end: 1380, hasEnd: true, completed: false }, // the 10 PM item
    ];
    const d = dayDecisionMirror(items, 1230);
    expect(d.box).toBe("struck");
    expect(d.boxIndex).toBe(0);
    expect(d.gap).toEqual({ minutes: 60, belowNext: false });
  });

  it("10:01 — Feed Aaron holds the box, Write waits struck under it, the gap runs from Feed's window end", () => {
    const items: MirrorItem[] = [
      { start: 570, end: 600, hasEnd: true, completed: true }, // News, finished and passed
      { start: 600, end: 630, hasEnd: false, completed: true }, // Feed Aaron, checked at its time
      { start: 660, end: 690, hasEnd: false, completed: true }, // Write, checked early
      { start: 720, end: 780, hasEnd: true, completed: false }, // Lunch, standing
    ];
    const d = dayDecisionMirror(items, 601);
    expect(d.box).toBe("struck");
    expect(d.boxIndex).toBe(1);
    expect(d.nextIndex).toBe(2);
    expect(d.nextKind).toBe("done");
    expect(d.gap).toEqual({ minutes: 30, belowNext: false });
  });
});

// ─── 6. Fix 2 fixtures: the second stretch, branch by branch ────────────────

describe("v466 Up Next — Fix 2: the next→after stretch seats in every branch", () => {
  it("struck branch (his Saturday at 9:05): the six hours between Brush Teeth and Gardening take the slot, below the next row", () => {
    const d = dayDecisionMirror(SATURDAY, 545);
    expect(d.gap).toEqual({ minutes: 360, belowNext: true });
  });

  it("running branch: a zero box→next stretch falls through to next→after", () => {
    const items: MirrorItem[] = [
      { start: 720, end: 780, hasEnd: true, completed: false }, // running 12:00–1:00
      { start: 780, end: 810, hasEnd: false, completed: false }, // next at 1:00
      { start: 960, end: 990, hasEnd: true, completed: false }, // after at 4:00
    ];
    const d = dayDecisionMirror(items, 750);
    expect(d.box).toBe("running");
    expect(d.gap).toEqual({ minutes: 150, belowNext: true });
  });

  it("running branch, first stretch wins: box→next qualifies, next→after never gets the slot", () => {
    const items: MirrorItem[] = [
      { start: 720, end: 780, hasEnd: true, completed: false },
      { start: 840, end: 870, hasEnd: false, completed: false },
      { start: 1080, end: 1140, hasEnd: true, completed: false },
    ];
    const d = dayDecisionMirror(items, 750);
    expect(d.gap).toEqual({ minutes: 60, belowNext: false });
  });

  it("white branch: the box ends where the next item starts, and the stretch after it is the candidate", () => {
    const items: MirrorItem[] = [
      { start: 540, end: 570, hasEnd: false, completed: false },
      { start: 720, end: 780, hasEnd: true, completed: false },
    ];
    const d = dayDecisionMirror(items, 480);
    expect(d.box).toBe("white");
    expect(d.gap).toEqual({ minutes: 150, belowNext: true });
  });

  it("in the selection the second-stretch gap displays below the next row, and a gap never displaces an item", () => {
    const base: SelectionInput = {
      last: false,
      current: false,
      hero: true,
      gapBelowNext: true,
      gap: true,
      after: true,
      next: true,
      extension: [],
    };
    // Signal 280: everything seats, gap below next.
    expect(selectMirror(base, 280)).toEqual(["hero", "next", "gap", "after"]);
    // Signal 232: the items seat first; the gap (33) does
    // not fit what they leave and simply does not stand.
    expect(selectMirror(base, 232)).toEqual(["hero", "next", "after"]);
  });
});

// ─── 7. Fix 3 fixtures: the trailing block, seated and absent ───────────────

describe("v466 Up Next — Fix 3: the trailing block to midnight", () => {
  it("the boundary: a last item ending at 11:45 PM leaves exactly 15 — the block stands", () => {
    const items: MirrorItem[] = [
      { start: 840, end: 1425, hasEnd: true, completed: false },
    ];
    const d = dayDecisionMirror(items, 800);
    expect(d.trailingMinutes).toBe(15);
  });

  it("one minute later the stretch is 14 — no candidate", () => {
    const items: MirrorItem[] = [
      { start: 840, end: 1426, hasEnd: true, completed: false },
    ];
    const d = dayDecisionMirror(items, 800);
    expect(d.trailingMinutes).toBeNull();
  });

  it("absent when the walk stops early: the trailing element rides behind the items that did not fit", () => {
    const extension: ExtElement[] = [
      { kind: "item", index: 4 },
      { kind: "item", index: 5 },
      { kind: "gap", minutes: 300 },
    ];
    const base: SelectionInput = {
      last: false,
      current: false,
      hero: true,
      gapBelowNext: false,
      gap: false,
      after: true,
      next: true,
      extension,
    };
    // Signal 280 (budget 196): core 138, one item seats,
    // the next does not fit — the walk stops and the
    // trailing gap behind it never seats.
    expect(selectMirror(base, 280)).toEqual(["hero", "next", "after", "xitem"]);
    // Signal 430: everything seats, the block included.
    expect(selectMirror(base, 430)).toEqual([
      "hero",
      "next",
      "after",
      "xitem",
      "xitem",
      "xgap",
    ]);
  });

  it("a spent day is the turn's, not the trailing block's: nothing seats, no chain, no candidate", () => {
    const items: MirrorItem[] = [
      { start: 540, end: 600, hasEnd: true, completed: true },
      { start: 660, end: 720, hasEnd: true, completed: true },
    ];
    const d = dayDecisionMirror(items, 1300);
    expect(d.box).toBeNull();
    expect(d.trailingMinutes).toBeNull();
    expect(d.extension).toEqual([]);
  });

  it("a lone struck holder is the day's last word, and the evening after it is the trailing block", () => {
    const items: MirrorItem[] = [
      { start: 540, end: 600, hasEnd: true, completed: true },
    ];
    const d = dayDecisionMirror(items, 570);
    expect(d.box).toBe("struck");
    expect(d.trailingMinutes).toBe(840);
    expect(openDurationTextMirror(d.trailingMinutes!)).toBe("14 hours open");
  });
});
