// v271 — The Welcoming Town, Stage 1: The Day (Jonathan's approval
// 2026-10-26, "Screw it let's do it").
//
// Pins for lib/welcoming-town.ts (pure logic) plus source pins for the
// connective presentation in app/hometown.tsx and
// components/town-npcs.tsx:
//
//  - Day phases: daynight's four beats (morning/afternoon/evening/
//    night) wear the Welcoming Town's names (dawn/day/dusk/night);
//    windows light at dusk and stay lit through the night; day wears
//    no wash.
//  - The while-you-were-gone report: people first (shifts that ended
//    during the absence, named from the assignment records), then the
//    top earning buildings BY BUILDING — a villager's name never gets
//    attached to earnings the data doesn't tie to them — then the
//    missed-days line. Gates: a worthwhile absence only (>= 15 min and
//    something to tell). The report moves no money and collects
//    nothing: it reads the accrual's own per-building pile deltas.
//  - The greeting: once per entry, town map only, the chat-bubble
//    shell with a raised hand; reduced motion stills it.
//  - Wake-by-prayer: a cottage's smoke and warm glow only when a
//    prayer light lives there; an empty cottage dims with a "z".

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AWAY_MIN_COINS,
  AWAY_MIN_MS,
  buildAwayReport,
  formatWholeCoins,
  HOMETOWN_LAST_VISIT_KEY,
  phaseForTimeOfDay,
  phaseWindowsLit,
  PHASE_WASH,
  shiftLine,
} from "@/lib/welcoming-town";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const HOUR = 60 * 60 * 1000;

describe("v271 — day phases", () => {
  it("maps daynight's four beats to dawn / day / dusk / night", () => {
    expect(phaseForTimeOfDay("morning")).toBe("dawn");
    expect(phaseForTimeOfDay("afternoon")).toBe("day");
    expect(phaseForTimeOfDay("evening")).toBe("dusk");
    expect(phaseForTimeOfDay("night")).toBe("night");
  });

  it("windows light at dusk and stay lit through the night", () => {
    expect(phaseWindowsLit("dusk")).toBe(true);
    expect(phaseWindowsLit("night")).toBe(true);
    expect(phaseWindowsLit("dawn")).toBe(false);
    expect(phaseWindowsLit("day")).toBe(false);
  });

  it("day wears no wash; dawn/dusk are warm, night is a faint cool", () => {
    expect(PHASE_WASH.day).toBeNull();
    expect(PHASE_WASH.dawn?.color).toBe("#FFB74D");
    expect(PHASE_WASH.dusk?.color).toBe("#FF8A4C");
    expect(PHASE_WASH.night?.opacity).toBeLessThanOrEqual(0.12);
  });
});

describe("v271 — the while-you-were-gone report", () => {
  const base = {
    absenceMs: 2 * HOUR,
    deltas: [{ buildingId: "b1", name: "Bakery", coins: 240 }],
    shiftsDone: [{ personName: "Gabriel Gutierrez", kind: "deliver-meal", endsAt: 0 }],
    missedCoins: 0,
    missedXP: 0,
    totalWaiting: 240,
  };

  it("tells it through people first, then buildings, with the waiting total", () => {
    const report = buildAwayReport(base);
    expect(report).not.toBeNull();
    expect(report!.lines[0]).toBe("Gabriel Gutierrez delivered meals around town");
    expect(report!.lines[1]).toBe("The Bakery earned 240 coins");
    expect(report!.totalWaiting).toBe(240);
    expect(report!.totalEarned).toBe(240);
  });

  it("never attaches a person's name to a building's earnings", () => {
    const report = buildAwayReport({ ...base, shiftsDone: [] });
    expect(report!.lines).toEqual(["The Bakery earned 240 coins"]);
    expect(report!.lines.join(" ")).not.toContain("Gabriel");
  });

  it("does not double the 'The' on buildings that carry their own", () => {
    const report = buildAwayReport({
      ...base,
      shiftsDone: [],
      deltas: [{ buildingId: "w1", name: "The Well", coins: 60 }],
    });
    expect(report!.lines[0]).toBe("The Well earned 60 coins");
  });

  it("stays silent for a short absence, a first visit, or pocket change alone", () => {
    expect(buildAwayReport({ ...base, absenceMs: AWAY_MIN_MS - 1 })).toBeNull();
    expect(buildAwayReport({ ...base, absenceMs: null })).toBeNull();
    expect(
      buildAwayReport({
        ...base,
        shiftsDone: [],
        deltas: [{ buildingId: "b1", name: "Bakery", coins: AWAY_MIN_COINS - 1 }],
      }),
    ).toBeNull();
  });

  it("a finished shift alone is worth the card, even under the coin floor", () => {
    const report = buildAwayReport({ ...base, deltas: [], totalWaiting: 0 });
    expect(report).not.toBeNull();
    expect(report!.lines).toEqual(["Gabriel Gutierrez delivered meals around town"]);
  });

  it("folds the missed-days award in as its own line", () => {
    const report = buildAwayReport({
      ...base,
      shiftsDone: [],
      deltas: [],
      missedCoins: 1250,
      missedXP: 40,
      totalWaiting: 0,
    });
    expect(report!.lines).toEqual(["Plus 1,250 coins and 40 XP from the days between"]);
    expect(report!.totalEarned).toBe(1250);
  });

  it("caps the story: at most three shifts and three buildings, biggest first", () => {
    const shifts = [1, 2, 3, 4].map((i) => ({
      personName: `Person ${i}`,
      kind: "work-farm",
      endsAt: i,
    }));
    const deltas = [10, 400, 30, 200].map((coins, i) => ({
      buildingId: `b${i}`,
      name: `Shop ${i}`,
      coins,
    }));
    const report = buildAwayReport({ ...base, shiftsDone: shifts, deltas, totalWaiting: 640 });
    expect(report!.lines).toHaveLength(6);
    expect(report!.lines[3]).toBe("The Shop 1 earned 400 coins");
    expect(report!.lines[4]).toBe("The Shop 3 earned 200 coins");
  });

  it("shift verbs come from the work kinds; unknown kinds stay plain", () => {
    expect(shiftLine({ personName: "Denise", kind: "tend-garden", endsAt: 0 })).toBe(
      "Denise tended the garden",
    );
    expect(shiftLine({ personName: "Denise", kind: "mystery", endsAt: 0 })).toBe(
      "Denise finished a work shift",
    );
  });

  it("formats whole coins with thousands grouping", () => {
    expect(formatWholeCoins(240)).toBe("240");
    expect(formatWholeCoins(1240.9)).toBe("1,240");
    expect(formatWholeCoins(1000000)).toBe("1,000,000");
    expect(HOMETOWN_LAST_VISIT_KEY).toContain("hometown");
  });
});

describe("v271 source pins — app/hometown.tsx", () => {
  const src = read("app/hometown.tsx");

  it("the phase wash mounts on the town map only, pointer-events none", () => {
    expect(src).toContain('activeMap === "town" && phaseWash');
    expect(src).toContain("PHASE_WASH[dayPhase]");
    expect(src).toContain("phaseForTimeOfDay(timeOfDay)");
  });

  it("dusk lights the town's windows through the phase rule (Great Peak precedent)", () => {
    expect(src).toContain('activeMap === "town" && phaseWindowsLit(dayPhase)');
  });

  it("wake-by-prayer reads the same cottage residents as the cottage tap", () => {
    expect(src).toContain("cottageResidents(map.buildings, b.id, lightInfos).length > 0");
    // An asleep cottage's hearth is cold: smoke is gated on it.
    expect(src).toContain("cottageAwake !== false");
    expect(src).toContain("cottageAwake === true");
    expect(src).toContain("cottageAwake === false");
  });

  it("the return report diffs the accrual's own piles and never collects", () => {
    expect(src).toContain("preAccrualPiles");
    expect(src).toContain("buildAwayReport({");
    expect(src).toContain("HOMETOWN_LAST_VISIT_KEY");
    // The plain Town Income alert survives only as the fallback.
    expect(src).toContain("} else if (missed && missed.earnedCoins > 0) {");
  });

  it("the greeting is armed once at the screen and passed to the town map only", () => {
    expect(src).toContain("greetRef");
    expect(src).toContain('greet={activeMap === "town" ? greetRef.current : null}');
    expect(src).toContain("tile: { x: 5, y: 5 }");
  });

  it("the report card collects nothing and dismisses by hand", () => {
    expect(src).toContain("awayReport.totalWaiting");
    expect(src).toContain("coins are waiting for you");
    expect(src).toContain("setAwayReport(null)");
  });
});

describe("v271 source pins — components/town-npcs.tsx", () => {
  const src = read("components/town-npcs.tsx");

  it("carries the greet prop and picks greeters once, nearest first, at most three", () => {
    expect(src).toContain("greet?: { untilMs: number; tile: { x: number; y: number } } | null");
    expect(src).toContain("greetChosenRef");
    expect(src).toContain("near.slice(0, 3)");
  });

  it("the greeting bubble reuses the chat-bubble shell with a raised hand, gold-edged", () => {
    expect(src).toContain('name="front-hand"');
    expect(src).toContain('borderColor: "#D4AF37"');
  });

  it("reduced motion stills the greeting (the attention-bell pattern)", () => {
    expect(src).toContain("AccessibilityInfo.isReduceMotionEnabled()");
    expect(src).toContain("reducedMotion ? [] : [{ translateY: floatY }]");
  });
});
