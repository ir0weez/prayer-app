// House Phase 2 (Riders E + H + H2, v160): the pawn-house room view is
// a layered PAPER shell (not flat color blocks), Morning Care shows the
// four care stats, the buy sheet names every slot's effect before
// purchase, the fasting profile carries a compact care read, and the
// hero is shown DOING his house's life in literal paper poses.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

const pawnHouse = read("app/pawn-house.tsx");
const paperRoom = read("components/paper-room.tsx");
const index = read("app/(tabs)/index.tsx");

describe("Rider E — the house interior is paper", () => {
  it("the room view renders through the layered paper shell", () => {
    expect(pawnHouse).toContain("PaperHouseShell");
    expect(pawnHouse).toContain("tierPoints={roomTierPoints(house, roomId)}");
    // the shell itself draws the paper layers: wainscot + baseboard,
    // planked floor, a paper window with a light spill
    expect(pawnHouse).toContain("wainscot");
    expect(pawnHouse).toContain("baseboard");
    expect(pawnHouse).toContain("light spill");
    expect(pawnHouse).toContain("PaperRoomBackdrop");
  });

  it("no room body is a flat theme.wall block anymore", () => {
    expect(pawnHouse).not.toContain("backgroundColor: theme.wall");
  });

  it("decor accumulates with tier points (density thresholds in the shell)", () => {
    for (const gate of ["tp >= 2", "tp >= 4", "tp >= 6", "tp >= 8", "tp >= 11"]) {
      expect(pawnHouse).toContain(gate);
    }
    expect(pawnHouse).toContain("PaperPicture");
    expect(pawnHouse).toContain("PaperCornerPlant");
  });

  it("the shell tints its layers from the active room theme", () => {
    expect(pawnHouse).toContain("fill={theme.wall}");
    expect(pawnHouse).toContain("fill={theme.floor}");
    expect(pawnHouse).toContain("theme.accent");
  });
});

describe("Rider H2 — literal hero poses in paper-room", () => {
  it("the pose family exists for the hero", () => {
    expect(paperRoom).toContain("export function PaperHeroSeatedFigure");
    expect(paperRoom).toContain("export function PaperHeroLyingFigure");
    expect(paperRoom).toContain("export function PaperHeroShowerFigure");
    expect(paperRoom).toContain("export function PaperHeroTubFigure");
    // the pre-existing family is untouched and still exported
    expect(paperRoom).toContain("export function PaperKneelFigure");
    expect(paperRoom).toContain("export function PaperSwimFigure");
    expect(paperRoom).toContain("export function PaperHeroKneel");
  });

  it("the poses draw the hero's own look — hair and live beard from lib/pawn", () => {
    expect(paperRoom).toContain("beardGrowthFor");
    expect(paperRoom).toContain("beardShapeFor");
    expect(paperRoom).toContain("HeroHeadShapes");
  });

  it("the poses are literal: blanket + pillow, water streaks, water line", () => {
    expect(paperRoom).toContain("the blanket drawn");
    expect(paperRoom).toContain("water running over");
    expect(paperRoom).toContain("body below the water line");
  });
});

describe("Rider H2 — PawnInRoom scenes route by room and activity", () => {
  it("bedroom at night lies him in the bed; by day he sits on its edge", () => {
    expect(pawnHouse).toContain("PaperHeroLyingFigure");
    expect(pawnHouse).toContain("sleeping = true");
  });

  it("living / kitchen / study seat him; bathroom puts him in shower or tub", () => {
    expect(pawnHouse).toContain("PaperHeroSeatedFigure");
    expect(pawnHouse).toContain("PaperHeroShowerFigure");
    expect(pawnHouse).toContain("PaperHeroTubFigure");
    expect(pawnHouse).toContain("PaperHeroKneel");
  });

  it("tending a need routes him to its fixture in its pose, with sine motion", () => {
    expect(pawnHouse).toContain("activeNeed={tendFx?.need ?? null}");
    expect(pawnHouse).toContain("setTendFx({ need, at: Date.now() })");
    expect(pawnHouse).toContain("SineBob");
    expect(pawnHouse).toContain("Easing.inOut(Easing.sin)");
  });
});

describe("Rider H — care stats on screen", () => {
  it("the house Morning Care section renders the four stat bars from careStatsFor", () => {
    expect(pawnHouse).toContain("careStatsFor(needs, house, Date.now())");
    expect(pawnHouse).toContain("CARE_STAT_IDS");
    expect(pawnHouse).toContain("CARE_STAT_LABELS");
    expect(pawnHouse).toContain("Today's care");
    expect(pawnHouse).toContain("Set for the Day");
  });

  it("the buy/upgrade sheet renders current + next tier effects via effectTextFor", () => {
    expect(pawnHouse).toContain("effectTextFor(roomId, selectedSlotDef.id, selectedTier)");
    expect(pawnHouse).toContain("effectTextFor(roomId, selectedSlotDef.id, selectedTier + 1)");
  });

  // Jonathan's ruling (2026-10-21): the compact care read on the home
  // tab's settings card was a weird spot for that stat bar — care stats
  // live at the hero's house (the full bars above), nowhere else. This
  // pin replaces the old "fasting profile carries the compact care
  // read" pin, which described the placement he rejected.
  it("the home tab carries NO care read — care stats live at the house only", () => {
    expect(index).not.toContain("careStatsFor");
    expect(index).not.toContain("careRead");
    expect(index).not.toContain("Morning Care");
    expect(index).not.toContain("loadHeroNeeds");
    // …while the house screen keeps the real bars (pinned above too).
    expect(pawnHouse).toContain("careStatsFor(needs, house, Date.now())");
    expect(pawnHouse).toContain("Set for the Day");
  });

  it("no punishment surface: no red/misery care copy anywhere in the house screen", () => {
    expect(pawnHouse).not.toContain("Neglected");
    expect(pawnHouse).not.toContain("miserable");
    expect(pawnHouse).not.toContain("starving");
  });
});
