// The Switchback Descent (v178) — the cave's level navigation as a
// place, not a picker: a zigzag tunnel cut down through the eight
// strata, a landing at every one of the eighty levels. Opened levels
// burn lit; the rest is dark rock. This module holds only the pure
// geometry and the travel rules — where each landing sits, which
// levels a hero may walk to, and how a long walk is staged — so the
// scene component stays a drawing and the rules stay pinned by tests.
//
// Rendering contract (the perf promise): the shaft draws once as
// static paper art per stratum band; the ONLY thing that ever moves
// is the hero, on one native-driven value along the landing points
// around him. A walk never animates the whole shaft: trips longer
// than WALK_VISIBLE_LEVELS landings fade the hero through the dark
// middle and walk only the final stretch, the way a lantern light
// goes ahead of you and waits.

import { LEVELS_PER_STRATUM, MAX_LEVEL, clampLevel, firstLevelOfStratum, stratumIndexForLevel } from "./mountain";

/** Vertical room each level gets in the shaft (px). */
export const DESCENT_LEVEL_H = 40;

/** Landing centers sit at these fractions of the scene width —
 *  the tunnel zigzags between them, one switchback per level. */
export const DESCENT_LEFT_X = 0.28;
export const DESCENT_RIGHT_X = 0.72;

/** The most landings a single visible walk covers. Longer trips
 *  fade through the middle (see walkPlan). */
export const WALK_VISIBLE_LEVELS = 10;

/** Which side of the shaft a level's landing sits on: odd levels
 *  to the left, even to the right — the zigzag never skips a beat,
 *  not even across a stratum boundary. Raw parity, unclamped, so
 *  the virtual neighbours (0 above, 81 below) alternate honestly
 *  where the tunnel path enters and leaves a band. */
export function landingSide(level: number): "left" | "right" {
  return ((level % 2) + 2) % 2 === 1 ? "left" : "right";
}

/** The landing's center in shaft coordinates (origin at the top of
 *  Level 1's row). Pure geometry — also valid for the virtual
 *  neighbours just above Level 1 / below Level 80 that the tunnel
 *  path uses as its entry and exit points. */
export function landingPoint(level: number, width: number): { x: number; y: number } {
  const x = (landingSide(level) === "left" ? DESCENT_LEFT_X : DESCENT_RIGHT_X) * width;
  const y = (level - 1) * DESCENT_LEVEL_H + DESCENT_LEVEL_H / 2;
  return { x, y };
}

/** The stratum band a level belongs to, and where the band starts —
 *  the scene renders one band per stratum. */
export function bandForLevel(level: number): { stratumIndex: number; firstLevel: number; topY: number } {
  const stratumIndex = stratumIndexForLevel(clampLevel(level));
  const firstLevel = firstLevelOfStratum(stratumIndex);
  return { stratumIndex, firstLevel, topY: (firstLevel - 1) * DESCENT_LEVEL_H };
}

/** Where the hero stands when the descent opens: the level he is
 *  looking at, held inside what he has opened — never deeper than
 *  the deepest opened level, never above the surface. */
export function descentHeroStart(currentLevel: number, deepestLevel: number): number {
  const deepest = Math.min(MAX_LEVEL, Math.max(1, Math.floor(deepestLevel) || 1));
  return Math.min(clampLevel(currentLevel), deepest);
}

/** The one travel rule: a hero may walk to any OPENED level —
 *  1..deepestLevel — and nowhere else. Unopened rock is not a
 *  destination, however hard he knocks. */
export function canTravelTo(level: number, deepestLevel: number): boolean {
  if (!Number.isInteger(level)) return false;
  const deepest = Math.min(MAX_LEVEL, Math.max(1, Math.floor(deepestLevel) || 1));
  return level >= 1 && level <= deepest;
}

/** Every landing a walk passes, from `from` to `to` inclusive,
 *  stepping one level at a time — down is deeper, up is home-ward. */
export function travelLevels(from: number, to: number): number[] {
  const a = clampLevel(from);
  const b = clampLevel(to);
  const step = b >= a ? 1 : -1;
  const levels: number[] = [];
  for (let l = a; ; l += step) {
    levels.push(l);
    if (l === b) break;
  }
  return levels;
}

export type WalkPlan = {
  /** Every landing the visible walk passes, ending at the target. */
  steps: number[];
  /** True when the trip was too long to walk in the open: the hero
   *  fades through the dark middle and only the final stretch is
   *  walked in the light. */
  fadedJump: boolean;
  /** Where the visible walk begins (the target's own neighbourhood). */
  walkFrom: number;
};

/** Stage a trip: short trips walk every landing; long ones fade
 *  and walk only the last WALK_VISIBLE_LEVELS landings — so the
 *  walk he watches is always the same calm length, and its last
 *  step always lands exactly on the level he asked for. */
export function walkPlan(from: number, to: number): WalkPlan {
  const all = travelLevels(from, to);
  if (all.length - 1 <= WALK_VISIBLE_LEVELS) {
    return { steps: all, fadedJump: false, walkFrom: all[0] };
  }
  const steps = all.slice(all.length - 1 - WALK_VISIBLE_LEVELS);
  return { steps, fadedJump: true, walkFrom: steps[0] };
}

/** A walk's length on the clock: about a quarter second a landing,
 *  never a blink, never a trek. */
export function walkDurationMs(stepCount: number): number {
  const steps = Math.max(1, Math.floor(stepCount) || 1);
  return Math.min(2600, Math.max(400, steps * 260));
}

/* ------------------------------------------------------------------ */
/* Ores on the Map (v199) — the shaft IS the dig wall                  */
/* ------------------------------------------------------------------ */

// Jonathan's first correction (2026-10-22, v191): the ore screen
// and the zigzag are the same screen. His second (2026-10-23):
// "I thought the ores themselves would be on the zigzag map, not
// just a little window that opens..." — v191 still opened a dig
// GALLERY at the hero's landing: a panel, however in-place, is a
// window. So the panel is gone. The mountain itself is the dig
// wall now:
//
//  - every OPENED level's row is tall enough to hold its three
//    faces, set into the rock beside its landing — ore showing in
//    the stone, state readable at a glance, tapped in place;
//  - unopened levels keep the compact dark rows they always had,
//    with no faces in them;
//  - two lines of room ride UNDER particular rows, never inside a
//    panel: the frontier's way-down line under the deepest opened
//    level (while it is the frontier), and the satchel-full line
//    (v198) under the level the hero stands on, for exactly as
//    long as the satchel is full.
//
// Opened levels are always a prefix of the mountain (1..deepest),
// so the whole layout is a closed form: a level's top is the sum
// of the row heights above it, and an extra line pushes down only
// the levels BELOW its own row — never the row it belongs to. The
// drawing, the hero, and the walk all read this one geometry.

/** Everything the shaft's shape depends on. */
export type ShaftLayout = {
  /** Opened levels are 1..deepestLevel; the rest is dark rock. */
  deepestLevel: number;
  /** The level the hero stands on (held inside the opened prefix). */
  currentLevel: number;
  /** The satchel-full line (v198) rides under the hero's level. */
  satchelFull: boolean;
};

/** An opened level's row: room for the landing, the tunnel, and
 *  the level's three faces set into the wall beside the path. */
export const OPEN_LEVEL_H = 96;

/** Where an opened landing's center sits inside its row. */
export const LANDING_Y_OPEN = 38;

/** The satchel-full line's height, riding under the hero's row. */
export const FULL_LINE_H = 22;

/** The frontier way-down line's height, under the deepest row. */
export const FRONTIER_LINE_H = 24;

/** The deepest opened level of a layout, held to the mountain. */
function layoutDeepest(layout: ShaftLayout): number {
  return Math.min(MAX_LEVEL, Math.max(1, Math.floor(layout.deepestLevel) || 1));
}

/** The hero's level of a layout, held inside what he has opened. */
function layoutCurrent(layout: ShaftLayout): number {
  return Math.min(clampLevel(layout.currentLevel), layoutDeepest(layout));
}

/** The extra room riding UNDER a level's own row: the frontier
 *  line under the deepest opened level while the mountain still
 *  has unopened rock below it, and the satchel-full line under
 *  the hero's level while the satchel is full. Both lines belong
 *  to their row but hang below it, so they move only what is
 *  underneath — never their own landing, never their own faces. */
export function rowExtraBelow(level: number, layout: ShaftLayout): number {
  const deepest = layoutDeepest(layout);
  let extra = 0;
  if (level === deepest && deepest < MAX_LEVEL) extra += FRONTIER_LINE_H;
  if (layout.satchelFull && level === layoutCurrent(layout)) extra += FULL_LINE_H;
  return extra;
}

/** One level's row height in the merged shaft: tall and faced
 *  where the mountain stands open, the compact dark row of the
 *  old shaft where it does not. */
export function levelRowHeight(level: number, layout: ShaftLayout): number {
  if (level < 1 || level > layoutDeepest(layout)) return DESCENT_LEVEL_H;
  return OPEN_LEVEL_H + rowExtraBelow(level, layout);
}

/** The top of a level's row in shaft coordinates (origin at the
 *  top of Level 1's row). Also defined for the virtual neighbours
 *  (0 above, 81 below) the tunnel path uses as entry/exit: above
 *  the mountain the plain dark rows simply continue. */
export function levelTopY(level: number, layout: ShaftLayout): number {
  if (level <= 1) return (level - 1) * DESCENT_LEVEL_H;
  const deepest = layoutDeepest(layout);
  const above = level - 1;
  const openedAbove = Math.min(above, deepest);
  const closedAbove = Math.max(0, above - deepest);
  let y = openedAbove * OPEN_LEVEL_H + closedAbove * DESCENT_LEVEL_H;
  // The two extra lines hang below their own rows: each pushes
  // down every level beneath it, and no level above it.
  if (deepest < MAX_LEVEL && deepest < level) y += FRONTIER_LINE_H;
  if (layout.satchelFull && layoutCurrent(layout) < level) y += FULL_LINE_H;
  return y;
}

/** A landing's center in the merged shaft: the zigzag's x, at the
 *  height its row gives it — the open rows' landing offset where
 *  the mountain stands open, the plain row's center in the dark. */
export function shaftLandingPoint(
  level: number,
  width: number,
  layout: ShaftLayout
): { x: number; y: number } {
  const x = (landingSide(level) === "left" ? DESCENT_LEFT_X : DESCENT_RIGHT_X) * width;
  const opened = level >= 1 && level <= layoutDeepest(layout);
  return { x, y: levelTopY(level, layout) + (opened ? LANDING_Y_OPEN : DESCENT_LEVEL_H / 2) };
}

/** The top of a stratum band in the merged shaft. */
export function shaftBandTopY(stratumIndex: number, layout: ShaftLayout): number {
  return levelTopY(firstLevelOfStratum(stratumIndex), layout);
}

/** A stratum band's height in the merged shaft: the sum of its
 *  levels' rows, read off the same geometry. */
export function shaftBandHeight(stratumIndex: number, layout: ShaftLayout): number {
  const first = firstLevelOfStratum(stratumIndex);
  return levelTopY(first + LEVELS_PER_STRATUM, layout) - levelTopY(first, layout);
}

/** The shaft's whole height under a layout. */
export function shaftTotalHeight(layout: ShaftLayout): number {
  return levelTopY(MAX_LEVEL + 1, layout);
}

/** Does this level show its faces in the wall? Exactly the opened
 *  levels do — the mountain itself is the dig wall only where it
 *  stands open; unopened rock shows no faces, ever. */
export function levelExposesFaces(level: number, deepestLevel: number): boolean {
  if (!Number.isInteger(level)) return false;
  const deepest = Math.min(MAX_LEVEL, Math.max(1, Math.floor(deepestLevel) || 1));
  return level >= 1 && level <= deepest;
}
