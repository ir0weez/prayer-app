// ─────────────────────────────────────────────────────────────────────────────
// The Welcoming Town, Stage 1: The Day (v271, Jonathan's approval
// 2026-10-26 — "Screw it let's do it").
//
// Pure presentation logic for the town's day, kept out of the 10k-line
// hometown screen so it can be pinned by tests:
//
//  - Day phases: lib/daynight already names the four beats of the day
//    (morning / afternoon / evening / night). The Welcoming Town calls
//    them dawn / day / dusk / night and dresses the TOWN MAP for each —
//    a soft light wash over the map, and windows that light at dusk and
//    stay lit through the night (the Great Peak art already treats
//    evening as lit; the buildings now follow on the town map).
//
//  - The while-you-were-gone report: when Jonathan comes back after a
//    worthwhile absence, the town tells him what happened THROUGH ITS
//    PEOPLE — who finished a work shift while he was gone, which
//    buildings earned, and how many coins are WAITING for his tap.
//    Nothing here moves a single coin: the away accrual
//    (lib/hometown accrueAwayIncome) already landed the money into each
//    building's uncollected pile before this report is built, and the
//    report only reads the deltas. NO auto-collect, ever — his hard
//    line: "I want people to have a reason to come back."
//
// Honesty rule for the report: a person's name only ever appears next
// to work the data actually ties to them (a villager-work assignment
// whose shift ended during the absence). Building earnings are told by
// building — never dressed up with a villager's name the records don't
// support.
// ─────────────────────────────────────────────────────────────────────────────

import type { TimeOfDay } from "@/lib/daynight";

export type DayPhase = "dawn" | "day" | "dusk" | "night";

/** The daynight four beats, in the Welcoming Town's words. */
export function phaseForTimeOfDay(tod: TimeOfDay): DayPhase {
  switch (tod) {
    case "morning":
      return "dawn";
    case "afternoon":
      return "day";
    case "evening":
      return "dusk";
    case "night":
      return "night";
  }
}

/**
 * The light wash laid over the town map for each phase — a translucent
 * tint, pointer-events-none, presentation only. Day wears none (the
 * paper town in full sun is the day look, unchanged). Night's wash is
 * deliberately faint: the night light already lives in the building
 * art itself (every window lit); the wash only cools the ground.
 */
export const PHASE_WASH: Record<DayPhase, { color: string; opacity: number } | null> = {
  dawn: { color: "#FFB74D", opacity: 0.1 },
  day: null,
  dusk: { color: "#FF8A4C", opacity: 0.13 },
  night: { color: "#232055", opacity: 0.1 },
};

/** Windows light at dusk and stay lit all night. */
/**
 * v285 — the horizon's dress per phase: three paper layers (far hills,
 * near hills, the town's own rooftops) stacked beneath the Great Peak,
 * tinted by the same light as everything else in the scene. All four
 * phases dress differently — dawn gilds the hills, dusk deepens every
 * layer and warms the rooftops' windows, night cools to silhouette.
 */
export const HORIZON_DRESS: Record<
  DayPhase,
  { far: string; near: string; roofs: string; windowsLit: boolean }
> = {
  dawn: { far: "#F2D492", near: "#D9C08A", roofs: "#C4A878", windowsLit: true },
  day: { far: "#BCD3A0", near: "#A3BC85", roofs: "#8FA873", windowsLit: false },
  dusk: { far: "#E8A56B", near: "#C47F52", roofs: "#9C6248", windowsLit: true },
  night: { far: "#5A6B8A", near: "#46536E", roofs: "#333F55", windowsLit: true },
};

export function phaseWindowsLit(phase: DayPhase): boolean {
  return phase === "dusk" || phase === "night";
}

// ── The while-you-were-gone report ──────────────────────────────────────────

/** Don't narrate a two-minute step away. */
export const AWAY_MIN_MS = 15 * 60 * 1000;
/** …and don't make a fuss over pocket change on its own. */
export const AWAY_MIN_COINS = 10;

export type AwayShiftInput = {
  personName: string;
  kind: string;
  endsAt: number;
};

export type AwayBuildingDelta = {
  buildingId: string;
  name: string;
  coins: number;
};

export type AwayReportInput = {
  /** Milliseconds since he last opened Hometown (null = first visit). */
  absenceMs: number | null;
  /** Per-building coins the away accrual just landed (positive only). */
  deltas: AwayBuildingDelta[];
  /** Work shifts whose end time fell inside the absence window. */
  shiftsDone: AwayShiftInput[];
  /** Missed-days business income (already applied to his balance). */
  missedCoins: number;
  missedXP: number;
  /** Every coin now sitting uncollected in the town's buildings. */
  totalWaiting: number;
  /** v279: today's café orders (the Street & Café loop) — how many of
   *  today's prayer-list orders were served / are still waiting, from
   *  the real prayer record. The caller passes it ONLY when the town
   *  is unlocked and today's list is non-empty; the line is omitted
   *  otherwise. The report still moves no money: served was settled
   *  by prayer, never by coins. */
  orders?: { served: number; waiting: number };
};

export type AwayReport = {
  lines: string[];
  /** Away-accrual coins + missed-days coins (the "earned" story). */
  totalEarned: number;
  totalWaiting: number;
};

/** Whole coins, thousands-grouped: 1240 → "1,240". */
export function formatWholeCoins(n: number): string {
  return String(Math.max(0, Math.floor(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** What a finished shift reads like, per work kind (lib/villager-work). */
const SHIFT_VERBS: Record<string, string> = {
  "clean-garden": "tidied the Community Garden",
  "prune-flowers": "pruned the flowers at the farm",
  "bank-shift": "worked a shift at the bank",
  "restaurant-shift": "worked a shift at the restaurant",
  "deliver-meal": "delivered meals around town",
  "work-farm": "worked the farm",
  "tend-garden": "tended the garden",
  restock: "finished a restock run",
};

export function shiftLine(shift: AwayShiftInput): string {
  const verb = SHIFT_VERBS[shift.kind] ?? "finished a work shift";
  return `${shift.personName} ${verb}`;
}

/**
 * Build the return report, or null when the absence wasn't worthwhile
 * (too short, or nothing happened that is worth a card). Lines are
 * people first — the shifts his villagers finished — then the top
 * earning buildings by name, then the missed-days line when whole
 * days went by. The waiting total rides on the report itself.
 */
export function buildAwayReport(input: AwayReportInput): AwayReport | null {
  if (input.absenceMs === null || input.absenceMs < AWAY_MIN_MS) return null;
  const earnedFromBuildings = input.deltas.reduce((sum, d) => sum + Math.max(0, d.coins), 0);
  const totalEarned = earnedFromBuildings + Math.max(0, input.missedCoins);
  const worthwhile =
    earnedFromBuildings >= AWAY_MIN_COINS ||
    input.shiftsDone.length > 0 ||
    input.missedCoins > 0;
  if (!worthwhile) return null;

  const lines: string[] = [];
  for (const shift of input.shiftsDone.slice(0, 3)) {
    lines.push(shiftLine(shift));
  }
  const top = [...input.deltas]
    .filter((d) => d.coins > 0)
    .sort((a, b) => b.coins - a.coins)
    .slice(0, 3);
  for (const d of top) {
    // Some building names already carry their "The" ("The Well").
    const named = /^the\b/i.test(d.name) ? d.name : `The ${d.name}`;
    lines.push(`${named} earned ${formatWholeCoins(d.coins)} coins`);
  }
  if (input.missedCoins > 0) {
    lines.push(
      input.missedXP > 0
        ? `Plus ${formatWholeCoins(input.missedCoins)} coins and ${formatWholeCoins(input.missedXP)} XP from the days between`
        : `Plus ${formatWholeCoins(input.missedCoins)} coins from the days between`,
    );
  }
  // v279: the café's day, in one line — but only as a line of its own
  // story (it never makes an otherwise-empty report worthwhile: the
  // gates above already decided this return is worth a card).
  if (input.orders && input.orders.served + input.orders.waiting > 0) {
    const { served, waiting } = input.orders;
    if (waiting === 0) {
      lines.push("Every one of today's café orders was served");
    } else if (served === 0) {
      lines.push(
        waiting === 1
          ? "Today's café order is still waiting to be served"
          : `Today's café orders are still waiting to be served — ${waiting} of them`,
      );
    } else {
      lines.push(`Today's café orders: ${served} served · ${waiting} still waiting`);
    }
  }
  if (lines.length === 0) return null;
  return { lines, totalEarned, totalWaiting: Math.max(0, Math.floor(input.totalWaiting)) };
}

/** Storage key for the last Hometown visit (epoch ms). */
export const HOMETOWN_LAST_VISIT_KEY = "prayercircle.hometown.lastvisit.v1";
