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
/* One Cave (v191) — the gallery carved into the shaft                 */
/* ------------------------------------------------------------------ */

// Jonathan's correction (2026-10-22): "The cave doesn't look like
// the mockup you sent me by the way. It has the ore screen, then it
// shifts to the zigzag screen. The mockup shows that the ore screen
// and the zig zag are the same screen. That was the point!"
//
// So the descent and the dig wall are ONE screen now: the shaft
// above is the cave itself, and at the level the hero stands on, a
// dig GALLERY opens in place — the level's three faces in the wall
// of its own landing, dug right there, no second screen, no
// overlay to dismiss. Exactly one gallery is open at a time (the
// hero can only stand in one place), carved into the shaft at that
// landing: every landing BELOW it sits GALLERY_H lower, and every
// band below its band starts GALLERY_H lower. The geometry below
// is that single rule, so the drawing, the hero, and the walk all
// agree on where everything is.

/** The height of the dig gallery that opens at the hero's landing:
 *  header, progress row, the wall itself (surface strip, faces,
 *  the way-down strip), and the pick rail. The gallery view in the
 *  cave screen is built to exactly this height. */
export const GALLERY_H = 328;

/** A landing's center in the MERGED shaft: the plain landing point,
 *  pushed GALLERY_H down when it lies below the open gallery. With
 *  no gallery open (null), this is exactly landingPoint. */
export function shaftLandingPoint(
  level: number,
  width: number,
  galleryLevel: number | null
): { x: number; y: number } {
  const p = landingPoint(level, width);
  if (galleryLevel != null && level > galleryLevel) return { x: p.x, y: p.y + GALLERY_H };
  return p;
}

/** The top of a stratum band in the merged shaft: bands that start
 *  below the gallery's level begin GALLERY_H lower; the gallery's
 *  own band starts where it always did (the gallery grows INSIDE
 *  it, under its landing). */
export function shaftBandTopY(stratumIndex: number, galleryLevel: number | null): number {
  const base = stratumIndex * LEVELS_PER_STRATUM * DESCENT_LEVEL_H;
  if (galleryLevel == null) return base;
  return firstLevelOfStratum(stratumIndex) > galleryLevel ? base + GALLERY_H : base;
}

/** Is the open gallery carved into this band? */
export function bandHasGallery(stratumIndex: number, galleryLevel: number | null): boolean {
  if (galleryLevel == null) return false;
  const first = firstLevelOfStratum(stratumIndex);
  return galleryLevel >= first && galleryLevel <= first + LEVELS_PER_STRATUM - 1;
}
