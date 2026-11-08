/**
 * v471 — Up Next: the box-position ruling, Jonathan's on
 * his Sunday Nov 8 home screen (9:21 AM, the tall card).
 * His Sunday as rendered: Duolingo, the 5:00–5:30 PM todo,
 * and Gardening, the 6:00–7:00 PM event, both checked off
 * EARLY; Check-In at 10:00 PM the one thing left ("1
 * LEFT"). The widget seated Duolingo as the last row at
 * the TOP, and the box as a white box reading "30 minutes
 * open" with the pill counting down to Gardening — the
 * 5:30–6:00 gap between the two finished items — while
 * his whole morning stood open. His words: "Why cant the
 * now box be at the top when nothing's before it, and
 * then it becomes second after the first event or todo
 * or ministry is done?"
 *
 * The two mechanisms, found in the render-time path:
 * (1) The last row leaked. The ordinary last pick
 * requires overAt ≤ now, which implies a started window
 * — but the v455 rescue (no vanishing) had no such
 * test: it walked back from the struck holder (Gardening,
 * the later of the two checked early) and seated the
 * nearest finished item that appeared nowhere else —
 * Duolingo — as the last row, though its window was
 * eight hours from opening. (2) The white box anchored
 * at that leak. The open stretch is measured from
 * max(now, the last pick's end): with Duolingo seated as
 * "last", the previous item's end read 5:30 PM, and the
 * boundary — v466's expression named the struck holder —
 * read Gardening's start, so the box described the
 * 30-minute gap between the two finished items instead
 * of the open morning containing now.
 *
 * The fix, three parts, all in the render-time path:
 * (1) THE GATE: the rescue steps past any finished item
 * whose window has not started (startMinutes > now) —
 * the last row seats only an item whose time has
 * actually come; with nothing eligible, the box is the
 * first row. The v455 rescue is otherwise untouched:
 * the earlier of two overlapping in-window finishes is
 * still rescued (its window has started by definition).
 * (2) THE BOUNDARY, READ LITERALLY: the first item in
 * the day's order whose window has not opened — on his
 * Sunday, Duolingo's 5:00 PM start, so the white box
 * stands in the morning stretch (9:21 → 5:00) and its
 * pill counts down to Duolingo. With the gate keeping
 * future items out of the last seat, the stretch's near
 * end is now again by construction.
 * (3) THE CHAIN: the white box stands over every
 * early-checked item before the next standing one, not
 * just the holder. The chain's head seats under the box
 * in the done dress (Duolingo), the chain's second item
 * takes the after seat (Gardening, struck in its own
 * place), the gap between them is the branch's mid-core
 * candidate (the 30 minutes, a gap box — never the hero
 * box), and the standing item (Check-In) falls to the
 * extension walk, seeded from the chain's end, with its
 * own preceding stretch (the 3 hours) and the trailing
 * block (the last hour) behind it.
 *
 * Standing law preserved: the box priority (running →
 * in-window struck → white → early-checked struck →
 * next up), every dress, the mid-core gap in every
 * arrangement, the trailing block, the tall extension,
 * the v457 prices, LEFT semantics. The Saturday v466
 * traces (8:35 / 8:50 / 9:05) and the Friday v455 trace
 * (Feed over Write) run through the new mirror below and
 * land exactly where the old files pinned them — every
 * last-row item in those traces has startMinutes ≤ now,
 * and their boundaries are single-early or next-up days
 * where the literal reading names the same item.
 *
 * The tests are the family's two kinds: source pins on
 * the Kotlin, and executable mirrors — a line-for-line
 * translation of the render-time decision as v471 leaves
 * it, and of the selection at the v457 prices.
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

// ─── 1. The gate on the source ──────────────────────────────────────────────

describe("v471 Up Next — the last row's gate (source)", () => {
  const body = rendererFn("renderUpNext");

  it("the rescue steps past a finished item whose window has not started", () => {
    expect(body).toContain("if (dayItems[idx].startMinutes > nowMin) continue");
    const gateAt = body.indexOf("if (dayItems[idx].startMinutes > nowMin) continue");
    const rescueLoopAt = body.indexOf("for (p in holderPos - 1 downTo 0) {");
    const conditionAt = body.indexOf(
      "if (dayItems[idx].completed && idx != lastIdx && idx != underIdx) {",
    );
    expect(gateAt).toBeGreaterThan(rescueLoopAt);
    expect(gateAt).toBeLessThan(conditionAt);
  });

  it("the v455 rescue stands verbatim inside the gate: its condition, its comparison, its assignment", () => {
    expect(body).toContain(
      "if (dayItems[idx].completed && idx != lastIdx && idx != underIdx) {",
    );
    expect(body).toContain("if (rescuePos > ordinaryPos) lastIdx = rescueIdx");
    expect(body).toContain(
      ".filter { it !in chosenIdx && overAt(dayItems[it]) <= nowMin }",
    );
  });
});

// ─── 2. The boundary and the chain on the source ────────────────────────────

describe("v471 Up Next — the boundary read literally, and the early chain (source)", () => {
  const body = rendererFn("renderUpNext");

  it("the boundary is the first item in the day's order whose window has not opened", () => {
    expect(body).toContain(
      "val openBoundaryIdx = chronoIdx.firstOrNull { dayItems[it].startMinutes > nowMin } ?: next1Idx",
    );
    // The stretch formula itself is v447's, untouched.
    expect(body).toContain(
      "openMinutes = dayItems[openBoundaryIdx].startMinutes - maxOf(nowMin, prevEnd)",
    );
    expect(body).toContain(
      'RailRow("whitebox", nowTimeLabel(), "", "", dayItems[openBoundaryIdx].startMinutes, openDurationText(openMinutes))',
    );
  });

  it("the chain is every finished item from the boundary up to the next standing item", () => {
    expect(body).toContain(
      "val chainIdx: List<Int> = if (earlyIdx != null && openBoundaryIdx != null) {",
    );
    expect(body).toContain(
      "(boundaryPos until anchorPos).map { chronoIdx[it] }.filter { dayItems[it].completed }",
    );
  });

  it("the after seat under a white-over-early box is the chain's second item, the standing item otherwise", () => {
    expect(body).toContain("chainIdx.getOrNull(1) ?: next1Idx");
  });

  it("under the box: the chain's head in the done dress; the after seat in its own dress by completion", () => {
    expect(body).toContain("val early = dayItems[chainIdx.first()]");
    expect(body).toContain(
      'nextRow = RailRow("done", minutesToTimeLabel(early.startMinutes), early.title, early.sub, early.startMinutes, "")',
    );
    expect(body).toContain('if (after.completed) "done" else "item",');
    expect(body).toContain("val earlyGapMinutes = after.startMinutes - early.endMinutes");
  });

  it("the fix lives in the render-time path only: the fallback and the day-done turn carry no chain", () => {
    expect(body).toContain(
      "selectRailRows(lastRow, currentRow, heroRow, gapRow, afterRow, null, false, emptyList(), heightSignal)",
    );
    const t5 = rendererFn("renderUpNextTomorrow");
    expect(t5).not.toContain("chainIdx");
    expect(t5).not.toContain("startMinutes > nowMin) continue");
  });
});

// ─── The executable mirrors ─────────────────────────────────────────────────
// (a) The render-time decision — a line-for-line translation
// of renderUpNext's recomputation as v471 leaves it (the
// v454 candidacy, the v455 in-window override, under pick
// and rescue — the rescue now gated on the window having
// started — the v466 species split, boundary and yield —
// the boundary now the first unopened window, and the
// early chain it closes — the branches' rows and gap
// candidates, the extension walk and the trailing chain).
// Items carry their endMinutes as the snapshot bakes them
// (a point item's end is its rule-made default, +30 for a
// todo — hasEnd tells it apart).

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
  lastIndex: number | null;
  earlyIndex: number | null;
  chain: number[];
  openMinutes: number;
  boundaryIndex: number | null;
  nextIndex: number | null;
  nextKind: "done" | "item" | null;
  afterIndex: number | null;
  afterKind: "done" | "item" | null;
  gap: { minutes: number; belowNext: boolean } | null;
  extension: ExtElement[];
  trailingMinutes: number | null;
  leftCount: number;
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
  // the blended candidacy, exactly as the Kotlin does them —
  // the rescue now inside the v471 gate.
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
      // v471: the gate — a finished item whose window has
      // not started is stepped past, never rescued.
      if (items[idx].start > nowMin) continue;
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
  // v466 (Fix 1): the species split. v471: the boundary is
  // the first unopened window in the day's order, and the
  // chain runs from it to the next standing item.
  const earlyIdx =
    struckIdx !== null && items[struckIdx].start > nowMin ? struckIdx : null;
  const boundaryIdx = chronoIdx.find((i) => items[i].start > nowMin) ?? next1Idx;
  let chainIdx: number[] = [];
  if (earlyIdx !== null && boundaryIdx !== null) {
    const boundaryPos = chronoIdx.indexOf(boundaryIdx);
    const anchorPos = next1Idx !== null ? chronoIdx.indexOf(next1Idx) : chronoIdx.length;
    chainIdx = chronoIdx.slice(boundaryPos, anchorPos).filter((i) => items[i].completed);
  }
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
  // The branches' rows and gap candidates (v466 Fix 2:
  // box→next, then next→after; the first qualifying
  // stretch wins).
  let nextIndex: number | null = null;
  let nextKind: "done" | "item" | null = null;
  let afterIndex: number | null = null;
  let afterKind: "done" | "item" | null = null;
  let gap: DayDecision["gap"] = null;
  let afterSeatIdx: number | null = afterIdx;
  if (boxStruckIdx !== null) {
    afterSeatIdx = aheadIdx.filter((i) => i !== underIdx)[0] ?? null;
  } else if (heroWhite && earlyIdx !== null) {
    afterSeatIdx = chainIdx[1] ?? next1Idx;
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
    if (afterIdx !== null) {
      afterIndex = afterIdx;
      afterKind = "item";
    }
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
    if (afterSeatIdx !== null) {
      afterIndex = afterSeatIdx;
      afterKind = "item";
    }
  } else if (heroWhite) {
    if (earlyIdx !== null) {
      // v471: the chain's head under the box, the after
      // seat in its own dress — the chain's second item
      // struck, the standing item plain.
      nextIndex = chainIdx[0];
      nextKind = "done";
      if (afterSeatIdx !== null) {
        afterIndex = afterSeatIdx;
        afterKind = items[afterSeatIdx].completed ? "done" : "item";
        const g = items[afterSeatIdx].start - items[chainIdx[0]].end;
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
      if (afterIdx !== null) {
        afterIndex = afterIdx;
        afterKind = "item";
      }
    }
  } else if (next1Idx !== null && afterIdx !== null) {
    afterIndex = afterIdx;
    afterKind = "item";
    const g = items[afterIdx].start - items[next1Idx].end;
    if (g >= 15) gap = { minutes: g, belowNext: false };
  }
  // The extension walk, then the trailing chain (v466
  // Fix 3).
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
    lastIndex: lastIdx,
    earlyIndex: earlyIdx,
    chain: chainIdx,
    openMinutes,
    boundaryIndex: boundaryIdx,
    nextIndex,
    nextKind,
    afterIndex,
    afterKind,
    gap,
    extension,
    trailingMinutes,
    leftCount: aheadIdx.length,
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

/** openDurationText, mirrored for the box's wording. */
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

/** countdownText, mirrored for the white box's pill. */
function countdownTextMirror(startMinutes: number, fromMinutes: number): string {
  const diff = startMinutes - fromMinutes;
  if (diff <= 0) return "NOW";
  if (diff < 60) return `IN ${diff} MIN`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m === 0 ? `IN ${h} H` : `IN ${h} H ${m} MIN`;
}

// ─── 3. The ruling fixture: his Sunday at 9:21 AM ───────────────────────────

// His Sunday (Nov 8), as the snapshot bakes it: Duolingo
// the 5:00–5:30 PM todo (a stored end, so hasEnd),
// Gardening the 6:00–7:00 PM event, both checked off
// early; Check-In 10:00–11:00 PM standing, the one thing
// left.
const SUNDAY: MirrorItem[] = [
  { start: 1020, end: 1050, hasEnd: true, completed: true }, // Duolingo
  { start: 1080, end: 1140, hasEnd: true, completed: true }, // Gardening
  { start: 1320, end: 1380, hasEnd: true, completed: false }, // Check-In
];

describe("v471 Up Next — his Sunday at 9:21 AM", () => {
  const d = dayDecisionMirror(SUNDAY, 561);

  it("no last row: nothing is before the box — Duolingo's window is eight hours from opening", () => {
    expect(d.lastIndex).toBeNull();
    expect(d.leftCount).toBe(1);
  });

  it("the box is the white space he is standing in: the morning stretch, closing at Duolingo's start", () => {
    expect(d.box).toBe("white");
    expect(d.boundaryIndex).toBe(0);
    expect(d.openMinutes).toBe(459);
    expect(openDurationTextMirror(d.openMinutes)).toBe("7 hours 39 minutes open");
    expect(countdownTextMirror(SUNDAY[d.boundaryIndex!].start, 561)).toBe("IN 7 H 39 MIN");
  });

  it("the chain is both finished items, in the day's order", () => {
    expect(d.earlyIndex).toBe(1);
    expect(d.chain).toEqual([0, 1]);
  });

  it("Duolingo seats struck directly under the box; Gardening struck in the after seat, in its own place", () => {
    expect(d.nextIndex).toBe(0);
    expect(d.nextKind).toBe("done");
    expect(d.afterIndex).toBe(1);
    expect(d.afterKind).toBe("done");
  });

  it("the half hour between them is the mid-core gap box — never the hero box", () => {
    expect(d.gap).toEqual({ minutes: 30, belowNext: true });
  });

  it("Check-In walks in the extension behind its three open hours, and the trailing block closes the day", () => {
    expect(d.extension).toEqual([
      { kind: "gap", minutes: 180 },
      { kind: "item", index: 2 },
      { kind: "gap", minutes: 60 },
    ]);
    expect(d.trailingMinutes).toBe(60);
    expect(openDurationTextMirror(d.trailingMinutes!)).toBe("1 hour open");
  });

  it("at the tall placement the card reads exactly as ruled: box, Duolingo, the half hour, Gardening, the three hours, Check-In, the last hour", () => {
    const display = selectMirror(
      {
        last: d.lastIndex !== null,
        current: false,
        hero: true,
        gapBelowNext: d.gap?.belowNext ?? false,
        gap: d.gap !== null,
        after: d.afterIndex !== null,
        next: d.nextIndex !== null,
        extension: d.extension,
      },
      430,
    );
    expect(display).toEqual(["hero", "next", "gap", "after", "xgap", "xitem", "xgap"]);
  });

  it("at the standard placement the box still leads, with both finished items under it", () => {
    const display = selectMirror(
      {
        last: d.lastIndex !== null,
        current: false,
        hero: true,
        gapBelowNext: d.gap?.belowNext ?? false,
        gap: d.gap !== null,
        after: d.afterIndex !== null,
        next: d.nextIndex !== null,
        extension: d.extension,
      },
      232,
    );
    expect(display).toEqual(["hero", "next", "after"]);
  });
});

// ─── 4. The box becomes second once the first thing is done ─────────────────

describe("v471 Up Next — the box's two positions", () => {
  it("a first item done at its time takes the top row, and the box stands second under it", () => {
    const items: MirrorItem[] = [
      { start: 540, end: 570, hasEnd: false, completed: true }, // 9:00 todo, checked at its time
      { start: 600, end: 630, hasEnd: true, completed: false }, // the 10:00 event
    ];
    const d = dayDecisionMirror(items, 575); // 9:35 AM
    expect(d.lastIndex).toBe(0);
    expect(d.box).toBe("white");
    const display = selectMirror(
      {
        last: true,
        current: false,
        hero: true,
        gapBelowNext: false,
        gap: false,
        after: false,
        next: true,
        extension: d.extension,
      },
      232,
    );
    expect(display).toEqual(["last", "hero", "next"]);
  });

  it("an early-checked item whose window has STARTED holds the box struck — the gate is on the start, not the end", () => {
    const items: MirrorItem[] = [
      { start: 540, end: 600, hasEnd: true, completed: true }, // checked early, window now open
      { start: 660, end: 690, hasEnd: false, completed: false }, // standing at 11:00
    ];
    const d = dayDecisionMirror(items, 570); // 9:30 AM, inside the first window
    expect(d.box).toBe("struck");
    expect(d.boxIndex).toBe(0);
    expect(d.earlyIndex).toBeNull();
    expect(d.lastIndex).toBeNull();
  });

  it("the rescue still reaches the earlier of two overlapping in-window finishes — its window has started", () => {
    const items: MirrorItem[] = [
      { start: 540, end: 600, hasEnd: true, completed: true }, // the earlier finish
      { start: 570, end: 630, hasEnd: true, completed: true }, // the later finish holds the box
      { start: 660, end: 720, hasEnd: true, completed: false }, // standing
    ];
    const d = dayDecisionMirror(items, 585); // 9:45 AM, both windows open
    expect(d.box).toBe("struck");
    expect(d.boxIndex).toBe(1);
    expect(d.lastIndex).toBe(0);
    expect(d.nextIndex).toBe(2);
  });

  it("under 15 minutes the later of two checked early still holds the box — the head of the chain waits for its window", () => {
    const d = dayDecisionMirror(SUNDAY, 1015); // 4:55 PM, five open minutes before Duolingo
    expect(d.openMinutes).toBe(5);
    expect(d.boundaryIndex).toBe(0);
    expect(d.box).toBe("struck");
    expect(d.boxIndex).toBe(1);
    expect(d.lastIndex).toBeNull();
  });
});

// ─── 5. Regressions: the v466 Saturday and the v455 Friday stand ────────────

// His Saturday (Nov 7), as the snapshot bakes it — the
// v466 file's own fixture.
const SATURDAY: MirrorItem[] = [
  { start: 540, end: 600, hasEnd: true, completed: true }, // Rest
  { start: 570, end: 600, hasEnd: false, completed: false }, // Brush Teeth
  { start: 960, end: 990, hasEnd: true, completed: false }, // Gardening
  { start: 1020, end: 1050, hasEnd: false, completed: false }, // Duolingo
];

describe("v471 Up Next — regressions: the v466/v455 traces render identically", () => {
  it("Saturday 8:35 — the white box over Rest, the same 25 minutes to the same boundary", () => {
    const d = dayDecisionMirror(SATURDAY, 515);
    expect(d.box).toBe("white");
    expect(d.earlyIndex).toBe(0);
    expect(d.chain).toEqual([0]);
    expect(d.openMinutes).toBe(25);
    expect(d.boundaryIndex).toBe(0);
    expect(d.lastIndex).toBeNull();
    expect(d.nextIndex).toBe(0);
    expect(d.nextKind).toBe("done");
    expect(d.afterIndex).toBe(1);
    expect(d.afterKind).toBe("item");
    expect(d.gap).toBeNull();
    expect(d.extension).toEqual([
      { kind: "gap", minutes: 360 },
      { kind: "item", index: 2 },
      { kind: "gap", minutes: 30 },
      { kind: "item", index: 3 },
      { kind: "gap", minutes: 390 },
    ]);
    const display = selectMirror(
      {
        last: false,
        current: false,
        hero: true,
        gapBelowNext: false,
        gap: false,
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

  it("Saturday 8:50 — ten minutes of stretch: Rest holds the box, as v454 had it", () => {
    const d = dayDecisionMirror(SATURDAY, 530);
    expect(d.openMinutes).toBe(10);
    expect(d.box).toBe("struck");
    expect(d.boxIndex).toBe(0);
  });

  it("Saturday 9:05 — Rest holds the box in-window; the six hours seat below Brush Teeth", () => {
    const d = dayDecisionMirror(SATURDAY, 545);
    expect(d.box).toBe("struck");
    expect(d.boxIndex).toBe(0);
    expect(d.earlyIndex).toBeNull();
    expect(d.nextIndex).toBe(1);
    expect(d.afterIndex).toBe(2);
    expect(d.gap).toEqual({ minutes: 360, belowNext: true });
  });

  it("Dinner, checked at 8:30 with the next item at 10: struck in the box, the 9-to-10 gap under it", () => {
    const items: MirrorItem[] = [
      { start: 1200, end: 1260, hasEnd: true, completed: true }, // Dinner
      { start: 1320, end: 1380, hasEnd: true, completed: false }, // the 10 PM item
    ];
    const d = dayDecisionMirror(items, 1230);
    expect(d.box).toBe("struck");
    expect(d.boxIndex).toBe(0);
    expect(d.gap).toEqual({ minutes: 60, belowNext: false });
  });

  it("Friday 10:01 — Feed Aaron holds the box, Write waits struck under it, News keeps the last row", () => {
    const items: MirrorItem[] = [
      { start: 570, end: 600, hasEnd: true, completed: true }, // News, finished and passed
      { start: 600, end: 630, hasEnd: false, completed: true }, // Feed Aaron, checked at its time
      { start: 660, end: 690, hasEnd: false, completed: true }, // Write, checked early
      { start: 720, end: 780, hasEnd: true, completed: false }, // Lunch, standing
    ];
    const d = dayDecisionMirror(items, 601);
    expect(d.box).toBe("struck");
    expect(d.boxIndex).toBe(1);
    expect(d.lastIndex).toBe(0);
    expect(d.nextIndex).toBe(2);
    expect(d.nextKind).toBe("done");
    expect(d.gap).toEqual({ minutes: 30, belowNext: false });
  });
});
