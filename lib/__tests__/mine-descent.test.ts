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
//
// v191 — ONE CAVE. Jonathan's correction (2026-10-22): "It has the
// ore screen, then it shifts to the zigzag screen. The mockup shows
// that the ore screen and the zig zag are the same screen. That was
// the point!" The descent is no longer an overlay over a separate
// dig wall: the shaft IS the cave screen, and the dig gallery opens
// in the rock at the landing where the hero stands.
//
// v199 — ORES ON THE MAP. His next correction (2026-10-23): "I
// thought the ores themselves would be on the zigzag map, not just
// a little window that opens..." The gallery — a panel, however
// in-place — is retired. Every OPENED level's row stands tall with
// its three faces set into the rock beside its landing; unopened
// levels keep the compact dark rows. These tests pin the new
// geometry (opened prefix tall and faced, dark rows compact, the
// two hanging lines moving only what is below their own row) and
// the new screen contract (no gallery, no panel geometry, faces
// tapped in the wall, what the gallery carried relocated).

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MAX_LEVEL, stratumIndexForLevel } from "../mountain";
import {
  DESCENT_LEVEL_H,
  FRONTIER_LINE_H,
  FULL_LINE_H,
  LANDING_Y_OPEN,
  OPEN_LEVEL_H,
  WALK_VISIBLE_LEVELS,
  bandForLevel,
  canTravelTo,
  descentHeroStart,
  landingPoint,
  landingSide,
  levelExposesFaces,
  levelRowHeight,
  levelTopY,
  rowExtraBelow,
  shaftBandHeight,
  shaftBandTopY,
  shaftLandingPoint,
  shaftTotalHeight,
  travelLevels,
  walkDurationMs,
  walkPlan,
  type ShaftLayout,
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

describe("ores on the map (v199) — the shaft is the dig wall", () => {
  const layout = (deepestLevel: number, currentLevel = deepestLevel, satchelFull = false): ShaftLayout => ({
    deepestLevel,
    currentLevel,
    satchelFull,
  });

  it("exactly the opened levels expose faces — a prefix of the mountain, no more", () => {
    for (const deepest of [1, 25, 37, 80]) {
      for (let l = 0; l <= MAX_LEVEL + 1; l++) {
        expect(levelExposesFaces(l, deepest)).toBe(l >= 1 && l <= deepest);
      }
    }
    expect(levelExposesFaces(2.5, 80)).toBe(false);
  });

  it("opened rows stand tall enough for their faces; dark rows keep the compact height", () => {
    // the whole mountain open: no frontier line anywhere
    expect(levelRowHeight(40, layout(80))).toBe(OPEN_LEVEL_H);
    expect(levelRowHeight(1, layout(80))).toBe(OPEN_LEVEL_H);
    // unopened rock: the old 40px rows, unchanged
    expect(levelRowHeight(21, layout(20))).toBe(DESCENT_LEVEL_H);
    expect(levelRowHeight(80, layout(20))).toBe(DESCENT_LEVEL_H);
    // the deepest opened row also carries the frontier line below it
    expect(levelRowHeight(20, layout(20))).toBe(OPEN_LEVEL_H + FRONTIER_LINE_H);
  });

  it("landings step by their own row heights — tall in the open, compact in the dark", () => {
    const lay = layout(30); // current = deepest = 30, satchel has room
    for (let l = 1; l < 30; l++) {
      expect(shaftLandingPoint(l + 1, W, lay).y - shaftLandingPoint(l, W, lay).y).toBe(OPEN_LEVEL_H);
    }
    for (let l = 31; l < MAX_LEVEL; l++) {
      expect(shaftLandingPoint(l + 1, W, lay).y - shaftLandingPoint(l, W, lay).y).toBe(DESCENT_LEVEL_H);
    }
    // crossing the frontier: the deepest row's height plus its line
    expect(levelTopY(31, lay) - levelTopY(30, lay)).toBe(OPEN_LEVEL_H + FRONTIER_LINE_H);
    // the zigzag never shifts sideways, whatever the layout
    for (const l of [1, 2, 25, 80]) {
      expect(shaftLandingPoint(l, W, lay).x).toBe(landingPoint(l, W).x);
    }
  });

  it("a hanging line moves only what is below its own row — never its own landing", () => {
    const room = layout(30, 10, false);
    const full = layout(30, 10, true);
    // the satchel-full line's own level stands exactly where it stood
    expect(shaftLandingPoint(10, W, full)).toEqual(shaftLandingPoint(10, W, room));
    expect(levelTopY(10, full)).toBe(levelTopY(10, room));
    // everything below it sits exactly FULL_LINE_H lower
    for (const l of [11, 30, 31, 80]) {
      expect(shaftLandingPoint(l, W, full).y - shaftLandingPoint(l, W, room).y).toBe(FULL_LINE_H);
    }
    expect(rowExtraBelow(10, full)).toBe(FULL_LINE_H);
    expect(rowExtraBelow(9, full)).toBe(0);
    // the frontier line belongs to the deepest row alone — and the
    // two lines stack when the hero stands at the frontier, full
    expect(rowExtraBelow(30, layout(30))).toBe(FRONTIER_LINE_H);
    expect(rowExtraBelow(29, layout(30))).toBe(0);
    expect(rowExtraBelow(30, layout(30, 30, true))).toBe(FRONTIER_LINE_H + FULL_LINE_H);
  });

  it("band tops and heights tile the shaft with no gaps, under every layout", () => {
    for (const lay of [layout(1), layout(25), layout(80), layout(30, 12, true), layout(79, 79, true)]) {
      expect(shaftBandTopY(0, lay)).toBe(0);
      for (let s = 0; s < 7; s++) {
        expect(shaftBandTopY(s + 1, lay)).toBe(shaftBandTopY(s, lay) + shaftBandHeight(s, lay));
      }
      expect(shaftBandTopY(7, lay) + shaftBandHeight(7, lay)).toBe(shaftTotalHeight(lay));
    }
  });

  it("the shaft's total height is the closed form: faced rows, dark rows, the two lines", () => {
    expect(shaftTotalHeight(layout(25))).toBe(
      25 * OPEN_LEVEL_H + 55 * DESCENT_LEVEL_H + FRONTIER_LINE_H
    );
    expect(shaftTotalHeight(layout(25, 10, true))).toBe(
      25 * OPEN_LEVEL_H + 55 * DESCENT_LEVEL_H + FRONTIER_LINE_H + FULL_LINE_H
    );
    expect(shaftTotalHeight(layout(80))).toBe(80 * OPEN_LEVEL_H);
    expect(shaftTotalHeight(layout(1))).toBe(OPEN_LEVEL_H + FRONTIER_LINE_H + 79 * DESCENT_LEVEL_H);
  });

  it("the faces wall fits inside an opened row, centered on its landing", () => {
    // the wall's height is the faces component's own constant —
    // read it where it lives so the two files can never drift apart
    const facesSrc = readFileSync(join(process.cwd(), "components/mine-faces.tsx"), "utf8");
    const wallH = Number(/FACES_WALL_H = (\d+)/.exec(facesSrc)?.[1]);
    expect(wallH).toBeGreaterThan(0);
    const topOff = LANDING_Y_OPEN - wallH / 2;
    expect(topOff).toBeGreaterThanOrEqual(0);
    expect(topOff + wallH).toBeLessThanOrEqual(OPEN_LEVEL_H);
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

describe("screen contract (v199) — ores on the map, no window", () => {
  const cave = readFileSync(join(process.cwd(), "app/mine-interior.tsx"), "utf8");
  const scene = readFileSync(join(process.cwd(), "components/mine-descent.tsx"), "utf8");
  const facesWall = readFileSync(join(process.cwd(), "components/mine-faces.tsx"), "utf8");

  it("the overlay never came back: nothing opens over the cave, nothing dismisses it", () => {
    expect(cave).not.toContain("descentOpen");
    expect(cave).not.toContain("setDescentOpen");
    expect(scene).not.toContain("onClose");
    // the shaft is not a floating layer over another screen
    expect(scene).not.toContain("elevation: 20");
    expect(scene).not.toContain("zIndex: 20");
  });

  it("the gallery is retired: no panel opens, no panel geometry remains", () => {
    expect(cave).not.toContain("renderMineGallery");
    expect(cave).not.toContain("galleryLevel");
    expect(cave).not.toContain("GALLERY_H");
    expect(scene).not.toContain("GALLERY_H");
    expect(scene).not.toContain("bandHasGallery");
    expect(scene).not.toContain("galleryLevel");
    expect(scene).not.toContain("gallery=");
  });

  it("the shaft mounts in the cave screen itself, faces riding with it", () => {
    expect(cave).toContain("levelFaces={levelFaces}");
    expect(cave).toContain("bagLoad={bagLoad}");
    expect(cave).toContain("onFollowHero={followHero}");
    expect(scene).toContain("shaftLandingPoint");
    // exactly the opened levels wear faces — the scene gates the
    // walls on the lib's own rule
    expect(scene).toContain("levelExposesFaces(data.level, deepestLevel)");
    expect(scene).toContain("LevelFacesWall");
  });

  it("the faces are dug in the wall, in place — the tap never leaves the screen's handler", () => {
    expect(cave).toContain("onTapFace={dispatchTapFace}");
    expect(cave).toContain("mineTap(");
    // the mechanics ride along untouched: flames on the break
    expect(cave).toContain("spendForestEnergy");
    // a wall's tap goes through the stable dispatcher, so a wall
    // that skipped a repaint still digs the freshest mine state
    expect(cave).toContain("tapFaceRef.current = handleTapFace");
    expect(cave).toContain("tapFaceRef.current(faceIndex)");
    expect(facesWall).toContain("onTapFace(faceIndex)");
  });

  it("the wall carries the faces' whole reading: ore, state, the pool, the lock, the way back", () => {
    expect(facesWall).toContain("FaceArt");
    expect(facesWall).toContain("PoolArt");
    expect(facesWall).toContain('name="lock"');
    // a resting face's regrow is written on the map, not just in an alert
    expect(facesWall).toContain("back in {formatCooldown(face.restMs)}");
  });

  it("what the gallery carried lives in the header now: the level line and the pick rail", () => {
    expect(cave).toContain("Deepest opened: Level");
    expect(cave).toContain("stratumMultiplier(viewStratumIndex)");
    expect(cave).toContain("PICKAXES — SOLD AT THE TOOL SHOP");
    // the rail sits in the header zone — before the shaft in the screen
    expect(cave.indexOf("PICKAXES — SOLD AT THE TOOL SHOP")).toBeLessThan(cave.indexOf("<MineDescent"));
    // and the flame count never left the header bar
    expect(cave).toContain("EnergyFlames");
  });

  it("the way down is counted at the frontier's faces, in the shaft itself", () => {
    expect(cave).toContain("frontierBroken={frontierBroken}");
    expect(scene).toContain("frontierBroken");
    expect(scene).toContain("to open Level");
  });

  it("the walk still ends by standing him at the new level", () => {
    expect(cave).toContain("onArrive={handleArrive}");
    expect(cave).toContain("setViewLevel(level);");
    expect(cave).toContain("setDescentAutoWalk(null);");
  });

  it("selling still happens only at the Mouth — the cave sells nothing", () => {
    expect(cave).not.toContain("applySellAll");
    expect(cave).toContain("Sell at the Mouth");
  });
});
