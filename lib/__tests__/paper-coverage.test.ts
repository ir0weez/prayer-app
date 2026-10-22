// v179 "Paper Everywhere" — coverage pins. Jonathan's verdict on
// v176 (2026-10-22): whole areas still had NO paper theme — the
// Journal's glossy slabs, the schedule header/day/study cards, the
// list sheet, the Fast Check-In square's gray frame, plus every
// secondary screen and creator form. These source pins assert each
// named surface consumes the skin (useSkin / skinTokens) so a future
// refactor can't silently un-paper a screen again.
//
// Exempt by his rulings, also pinned: the Hometown world files and
// the Dark Forest consume no skin in the schedule sense (the forest
// stays pixel; hometown is out of the paper pass entirely).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("v179 paper coverage — every named surface consumes the skin", () => {
  it("the Journal renders on paper: paper page, paper entry cards, paper sheets", () => {
    const journal = read("components/prayer-journal-tab.tsx");
    expect(journal).toContain("useSkin");
    // Entry cards take the paper surface when they carry no color.
    expect(journal).toContain("item.color ?? paperSurface");
    // Sheets sit on the paper page background.
    expect(journal).toContain("skinTokens.background");
  });

  it("the schedule chrome is paper: summary zone, header pill, day card, study card, list sheet", () => {
    const schedule = read("components/schedule-tab.tsx");
    // Summary zone paints the paper page, not the palette background.
    expect(schedule).toContain("summaryContainer");
    expect(schedule).toContain("skinTokens.background ?? colors.background");
    // The sliding tray's rows and footer ride on the paper surface.
    expect(schedule).toContain("skinTokens.surface ?? colors.surface");
    // Creator sheets (event/todo/ministry add + edit) are paper sheets.
    expect(schedule).toContain("skinTokens.sheetShadow");
  });

  it("the Fast Check-In square and ministry cards use OPAQUE tinted paper stock (no gray frame)", () => {
    const schedule = read("components/schedule-tab.tsx");
    // paperStockFor is an opaque HSL tint of the accent (v182 — the
    // v179 RGB mix into the cream surface still washed out to gray on
    // his phone), never the translucent wash whose shadow read as a
    // frame.
    expect(schedule).toContain("function paperStockFor");
    expect(schedule).toContain("paperStockFor(accent, skinTokens.surface)");
    expect(schedule).toContain("paperStockFor(ministry.color");
    expect(schedule).not.toContain('accent + "30"');
  });

  it("completed schedule bars are tinted stock under Paper, not the gray-beige wash (v182)", () => {
    const schedule = read("components/schedule-tab.tsx");
    // Both completed bars (event + ministry) branch to the tinted
    // stock treatment; the translucent wash remains only as the
    // Classic branch.
    expect(schedule).toContain("paperCompletedTint(completedColor, skinTokens.surface)");
    expect(schedule).toContain("paperStockEdge(completedColor)");
  });

  it("creator forms and shared dialogs consume the skin", () => {
    for (const file of [
      "components/event-edit-form.tsx",
      "components/event-detail-card.tsx",
      "components/context-menu.tsx",
      "components/date-time-picker.tsx",
      "components/slide-quick-add.tsx",
      "components/album-card.tsx",
      "components/bible-chapter-viewer.tsx",
    ]) {
      expect(read(file), file).toContain("useSkin");
    }
  });

  it("the calendar views consume the skin", () => {
    expect(read("components/weekly-calendar-view.tsx")).toContain("useSkin");
    expect(read("components/monthly-calendar-view.tsx")).toContain("useSkin");
  });

  it("the secondary screens consume the skin", () => {
    for (const file of [
      "app/(tabs)/family.tsx",
      "app/(tabs)/person.tsx",
      "app/personal-prayer.tsx",
      "app/budget-tracker.tsx",
      "app/fast-collection.tsx",
      "app/bible-tracker.tsx",
      "app/bible-chapters.tsx",
      "app/profile.tsx",
    ]) {
      expect(read(file), file).toContain("useSkin");
    }
  });

  it("the fasting profile's leftover chrome (note modal, note button, chips) is paper too", () => {
    const profile = read("app/profile.tsx");
    expect(profile).toContain("skinTokens.sheetShadow");
    expect(profile).toContain("paperSurfaceStyle");
  });

  it("flat paper only: the grain component renders nothing, anywhere", () => {
    const grain = read("components/paper-grain.tsx");
    expect(grain).toContain("return null");
    expect(grain).not.toContain("react-native-svg");
    const tokens = read("lib/skin-themes.ts");
    expect(tokens).toContain("grainOpacity: 0");
  });

  it("exempt worlds stay exempt: hometown and the Dark Forest take no schedule-skin conversion", () => {
    expect(read("app/hometown.tsx")).not.toContain("useSkin");
    expect(read("components/dark-forest.tsx")).not.toContain("useSkin");
  });
});

describe("v183 8-bit coverage — every surface that wears Paper wears 8-bit", () => {
  // The surface kit gates on isSkinned (Paper OR 8-bit) so the dusk
  // tokens — cream stock, chunky ink borders, the hard block shadow —
  // flow to exactly the surfaces v179 papered. A surface that only
  // branches on strict isPaper would silently stay Classic under
  // 8-bit; these pins keep the gate shared.
  it("the named surfaces gate their kit on isSkinned, not Paper alone", () => {
    for (const file of [
      "components/schedule-tab.tsx",
      "components/prayer-journal-tab.tsx",
      "components/screen-container.tsx",
      "components/status-modal.tsx",
      "components/interior-shell.tsx",
      "components/mini-game-scene.tsx",
      "components/time-block-indicator.tsx",
      "components/monthly-calendar-view.tsx",
      "components/weekly-calendar-view.tsx",
      "components/event-edit-form.tsx",
      "components/event-detail-card.tsx",
      "app/(tabs)/family.tsx",
      "app/(tabs)/person.tsx",
      "app/profile.tsx",
      "app/bible-tracker.tsx",
      "app/budget-tracker.tsx",
      "app/fast-collection.tsx",
      "app/personal-prayer.tsx",
      "app/mine-mouth.tsx",
      "app/mine-interior.tsx",
    ]) {
      expect(read(file), file).toContain("isSkinned");
    }
  });

  it("the 8-bit texture is the dither: one static pattern in the shared chrome only", () => {
    const dither = read("components/bit-dither.tsx");
    expect(dither).toContain("<Pattern");
    expect(dither).toContain("width={16}");
    // v184: the shared chrome mounts the full dusk background (the
    // mockup's gradient + this same dither pattern) under 8-bit; the
    // standalone dither overlay remains for token-painted roots and
    // the status modal's backdrop.
    expect(read("components/bit-background.tsx")).toContain("width={16}");
    expect(read("components/screen-container.tsx")).toContain("isEightBit ? <BitBackground /> : null");
    // The Dark Forest keeps its own rendering — no dither, no skin.
    expect(read("components/dark-forest.tsx")).not.toContain("BitDitherOverlay");
    expect(read("components/dark-forest.tsx")).not.toContain("BitBackground");
  });
});
