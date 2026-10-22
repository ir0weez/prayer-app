// The Switchback Descent (v178).
//
// Jonathan (2026-10-22): "I like the switchback tunnel design
// more… I just like that look more than what it is right now."
// Level navigation in the cave becomes the descent itself — a
// zigzag tunnel through the eight strata, a landing at every
// level, opened levels lit, the paper hero walking the switchbacks
// to the landing he taps.
//
// These tests pin lib/mine-descent (the scene's pure rules):
//  - the zigzag: landings alternate sides without skipping a beat,
//    not even across a stratum boundary, and every level sits
//    lower than the one above it;
//  - the travel rule: opened levels (1..deepestLevel) and only
//    opened levels are destinations;
//  - the walk: it passes every landing between here and there,
//    and a long trip is staged as a fade plus a final visible
//    stretch that still ends exactly on the level he asked for;
//  - the hero's start: where he was looking, held inside what he
//    has opened;
//  - the screen contract: the descent replaces the arrow steppers,
//    and opening a new level routes through it.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MAX_LEVEL, stratumIndexForLevel } from "../mountain";
import {
  DESCENT_LEVEL_H,
  WALK_VISIBLE_LEVELS,
  bandForLevel,
  canTravelTo,
  descentHeroStart,
  landingPoint,
  landingSide,
  travelLevels,
  walkDurationMs,
  walkPlan,
} from "../mine-descent";

const W = 390;

describe("the zigzag — landing geometry", () => {
  it("alternates sides level by level, all the way down", () => {
    for (let l = 1; l < MAX_LEVEL; l++) {
      expect(landingSide(l)).not.toBe(landingSide(l + 1));
    }
    expect(landingSide(1)).toBe("left");
    expect(landingSide(2)).toBe("right");
  });

  it("never skips the beat at a stratum boundary", () => {
    // Level 10 (last of Stone) → 11 (first of Coal): still a switch.
    expect(stratumIndexForLevel(10)).not.toBe(stratumIndexForLevel(11));
    expect(landingSide(10)).toBe("right");
    expect(landingSide(11)).toBe("left");
  });

  it("every level sits exactly one row lower than the one above", () => {
    for (let l = 1; l < MAX_LEVEL; l++) {
      expect(landingPoint(l + 1, W).y - landingPoint(l, W).y).toBe(DESCENT_LEVEL_H);
    }
  });

  it("landing x mirrors by side, inside the walls", () => {
    const left = landingPoint(1, W);
    const right = landingPoint(2, W);
    expect(left.x).toBeLessThan(W / 2);
    expect(right.x).toBeGreaterThan(W / 2);
    expect(left.x + right.x).toBeCloseTo(W, 5);
  });

  it("the virtual neighbours alternate honestly (the path's entry/exit)", () => {
    expect(landingSide(0)).toBe("right");
    expect(landingSide(MAX_LEVEL + 1)).toBe("left");
    expect(landingPoint(0, W).y).toBeLessThan(landingPoint(1, W).y);
    expect(landingPoint(MAX_LEVEL + 1, W).y).toBeGreaterThan(landingPoint(MAX_LEVEL, W).y);
  });

  it("bands line up with the strata of lib/mountain", () => {
    for (const l of [1, 10, 11, 40, 41, 71, 80]) {
      const band = bandForLevel(l);
      expect(band.stratumIndex).toBe(stratumIndexForLevel(l));
      expect(band.firstLevel).toBeLessThanOrEqual(l);
      expect(l).toBeLessThanOrEqual(band.firstLevel + 9);
      expect(band.topY).toBe((band.firstLevel - 1) * DESCENT_LEVEL_H);
    }
  });
});

describe("the travel rule — opened levels only", () => {
  it("any opened level is a destination; unopened rock is not", () => {
    expect(canTravelTo(1, 1)).toBe(true);
    expect(canTravelTo(1, 37)).toBe(true);
    expect(canTravelTo(37, 37)).toBe(true);
    expect(canTravelTo(38, 37)).toBe(false);
    expect(canTravelTo(MAX_LEVEL, MAX_LEVEL)).toBe(true);
    expect(canTravelTo(MAX_LEVEL, MAX_LEVEL - 1)).toBe(false);
  });

  it("the surface and beyond are never destinations", () => {
    expect(canTravelTo(0, 80)).toBe(false);
    expect(canTravelTo(-3, 80)).toBe(false);
    expect(canTravelTo(MAX_LEVEL + 1, MAX_LEVEL)).toBe(false);
    expect(canTravelTo(2.5, 80)).toBe(false);
  });
});

describe("the walk — staging a trip along the switchbacks", () => {
  it("passes every landing between here and there, both ways", () => {
    expect(travelLevels(3, 7)).toEqual([3, 4, 5, 6, 7]);
    expect(travelLevels(7, 3)).toEqual([7, 6, 5, 4, 3]);
    expect(travelLevels(5, 5)).toEqual([5]);
  });

  it("a short trip walks the whole way in the light", () => {
    const plan = walkPlan(4, 12);
    expect(plan.fadedJump).toBe(false);
    expect(plan.walkFrom).toBe(4);
    expect(plan.steps).toEqual(travelLevels(4, 12));
  });

  it("a long trip fades, then walks only the final stretch — and still lands exactly on target", () => {
    const down = walkPlan(1, 60);
    expect(down.fadedJump).toBe(true);
    expect(down.steps.length - 1).toBe(WALK_VISIBLE_LEVELS);
    expect(down.steps[down.steps.length - 1]).toBe(60);
    expect(down.walkFrom).toBe(60 - WALK_VISIBLE_LEVELS);
    const up = walkPlan(80, 5);
    expect(up.fadedJump).toBe(true);
    expect(up.steps[up.steps.length - 1]).toBe(5);
    expect(up.walkFrom).toBe(5 + WALK_VISIBLE_LEVELS);
  });

  it("every walk, however staged, ends on the level he asked for", () => {
    for (const [from, to] of [[1, 80], [80, 1], [12, 13], [40, 40], [25, 61]] as const) {
      expect(walkPlan(from, to).steps.at(-1)).toBe(to);
    }
  });

  it("the clock: never a blink, never a trek", () => {
    expect(walkDurationMs(0)).toBe(400);
    expect(walkDurationMs(1)).toBe(400);
    expect(walkDurationMs(WALK_VISIBLE_LEVELS)).toBeLessThanOrEqual(2600);
    expect(walkDurationMs(500)).toBe(2600);
  });
});

describe("the hero's start — the current-level marker follows state", () => {
  it("stands at the level he was looking at", () => {
    expect(descentHeroStart(12, 40)).toBe(12);
    expect(descentHeroStart(1, 1)).toBe(1);
    expect(descentHeroStart(40, 40)).toBe(40);
  });

  it("never deeper than he has opened, never above the surface", () => {
    expect(descentHeroStart(60, 25)).toBe(25);
    expect(descentHeroStart(0, 25)).toBe(1);
    expect(descentHeroStart(99, 99)).toBe(MAX_LEVEL);
  });
});

describe("screen contract — the descent replaces the picker", () => {
  const cave = readFileSync(join(process.cwd(), "app/mine-interior.tsx"), "utf8");
  const scene = readFileSync(join(process.cwd(), "components/mine-descent.tsx"), "utf8");

  it("the cave opens the descent; the arrow steppers are gone", () => {
    expect(cave).toContain("MineDescent");
    expect(cave).toContain("The Descent");
    expect(cave).not.toContain('name="arrow-upward"');
    expect(cave).not.toContain("setViewLevel(Math.max(1, view - 1))");
  });

  it("arriving is what moves the wall: onArrive sets the viewed level", () => {
    expect(cave).toContain("onArrive");
    expect(cave).toContain("setViewLevel(level)");
  });

  it("cracking a level open routes through the descent walk", () => {
    expect(cave).toContain("setDescentAutoWalk(outcome.levelOpened)");
    expect(cave).toContain("autoWalkTo={descentAutoWalk}");
    expect(scene).toContain("autoWalkTo");
    expect(scene).toContain("travelTo(autoWalkTo)");
  });

  it("the scene draws the strata from the mine's own tables, hero in normal clothes", () => {
    expect(scene).toContain("MINE_STRATA");
    expect(scene).toContain("PaperHeroFigure");
    // the hero animation is one native-driven value — the perf pact
    expect(scene).toContain("useNativeDriver: true");
    expect(scene).toContain("Easing.inOut(Easing.sin)");
  });

  it("the feeling may be warm; the prohibited word stays out of the scene", () => {
    expect(scene).not.toContain('"Safety"');
    expect(cave).not.toContain("Inside Safety");
  });
});
