// ─────────────────────────────────────────────────────────────────────────────
// v296 — THE SCHEDULE, STRUCTURAL. v295 re-dressed the old page's
// bones and Jonathan read it as a reskin (Oct 27, 22:44: "Why aren't
// the artworks filling the whole card?! Also this still isn't the
// mockup I agreed on!!" / "You just put a skin over it. I want it
// redone to the design specs!"). These pins hold the structural
// repairs against the approved v32 drawing
// (~/workspace/social-mockups/schedule-material-concepts-v32.html):
//
//  (a) EVENT CARDS — full-bleed under Classic (his ruling that night
//      outranks the drawing's 64px art band): the keyword scene
//      covers the whole card face; the pill sits in the one spot
//      (top 8, left 12) and becomes the NowPill live; an event with
//      no artwork fills the card with its own colour. NO fixed-height
//      band element remains. Rest keeps its living-sky card — the
//      Classic branch now sits AFTER the Rest branch.
//  (b) DAY-PAGE COMPOSITION — under Classic the sheet leads with a
//      sheet-head (the drawing's mainsheet grab + 28px rounded top),
//      NOT the legacy date hero; the week strip rides in the fixed
//      summary zone above the panel in the drawing's slim form; the
//      app bar's sub is the selected date, not "N of M events left".
//  (c) SLIDE-OVER REST — the v197 mechanism is untouched (the spacer
//      still carries the summary's FULL measured height), and the
//      list opens at the drawing's overlap: 120px (the mainsheet's
//      margin-top: -120px in the drawing), first mount only.
//  (d) END OF THE DAY — the divider HEADS the completed stack (the
//      drawing's order: divider, done bars, worship), pushed before
//      every completed item, not after them.
//  (e) DARK PANEL — the summary panel derives from the seed's
//      saturated step in both appearances, so the dark page reads as
//      the same composition as the light drawing, not a pale reskin.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const scheduleTab = read("components/schedule-tab.tsx");
const summaryCard = read("components/daily-summary-card.tsx");

describe("v296 event cards — the artwork fills the whole card", () => {
  it("the Classic branch is the full-bleed composition, gated to Classic", () => {
    expect(scheduleTab).toContain("v296 (CLASSIC ONLY): the full-bleed event card");
    expect(scheduleTab).toContain("const fillColor = event.color || keyword?.bgColor || colors.primary");
  });

  it("no fixed-height art band remains anywhere in the event card", () => {
    expect(scheduleTab).not.toContain("height: keyword ? 64 : 34");
    expect(scheduleTab).not.toContain("const bandColor =");
  });

  it("the scene fills the card and the content rides over a legibility scrim", () => {
    // The scene component renders absolute-inset-0 by construction
    // (SceneRoot); the Classic card layers a scrim over it and the
    // title/details above that.
    expect(scheduleTab).toContain('backgroundColor: "rgba(0,0,0,0.22)"');
    expect(scheduleTab).toContain("textShadowColor: \"rgba(0,0,0,0.35)\"");
  });

  it("the card stands at scene height (holidays taller), not band + body", () => {
    expect(scheduleTab).toContain("isHolidayCard ? 148 : 124");
    expect(scheduleTab).toContain("keyword ? 140 : 118");
  });

  it("the pill sits in the one spot (top 8, left 12) and becomes the NowPill live", () => {
    expect(scheduleTab).toContain('position: "absolute", top: 8, left: 12');
    expect(scheduleTab).toContain("const pillColor = event.color || keyword?.accentColor || colors.primary");
  });

  it("the Classic branch sits after Rest, so Rest keeps its living sky under Classic", () => {
    const restAt = scheduleTab.indexOf('if (keyword?.label === "Rest")');
    const classicAt = scheduleTab.indexOf("v296 (CLASSIC ONLY): the full-bleed event card");
    expect(restAt).toBeGreaterThanOrEqual(0);
    expect(classicAt).toBeGreaterThan(restAt);
  });

  it("linked faces ride the card's top right", () => {
    expect(scheduleTab).toContain('position: "absolute", top: 8, right: 12');
  });
});

describe("v296 day-page composition — the sheet leads with its own head", () => {
  it("Classic sheets lead with sheet-head; skins keep the date-header item", () => {
    expect(scheduleTab).toContain('? { type: "date-header", id: "schedule-date-header", data: null }');
    expect(scheduleTab).toContain(': { type: "sheet-head", id: "schedule-sheet-head", data: null }');
  });

  it("the sheet-head renders before the date-header case and carries the grab handle", () => {
    const headAt = scheduleTab.indexOf('case "sheet-head"');
    const dateAt = scheduleTab.indexOf('case "date-header"');
    expect(headAt).toBeGreaterThanOrEqual(0);
    expect(dateAt).toBeGreaterThan(headAt);
    expect(scheduleTab).toContain("width: 38, height: 4.5, borderRadius: 3");
  });

  it("the sheet-head wrapper carries the drawing's 28px rounded top", () => {
    expect(scheduleTab).toContain('if (info.item.type === "sheet-head")');
    expect(scheduleTab).toContain("borderTopLeftRadius: 28, borderTopRightRadius: 28");
  });

  it("the Classic week strip rides above the panel, in the drawing's slim form", () => {
    const stripAt = scheduleTab.indexOf("the week strip in the v32 drawing's slim form");
    const panelAt = scheduleTab.indexOf("<DailySummaryCard");
    expect(stripAt).toBeGreaterThanOrEqual(0);
    expect(panelAt).toBeGreaterThan(stripAt);
    // Number 16/800, selected held by the seed-deep outline ring,
    // 4.5px time-off dot.
    expect(scheduleTab).toContain("borderColor: isSelected ? scheduleMaterialTones(colors.primary, colors.surface).primaryDeep : \"transparent\"");
    expect(scheduleTab).toContain("width: 4.5, height: 4.5, borderRadius: 2.25");
  });

  it("the app bar's sub is the selected date under Classic, not the events-left count", () => {
    expect(scheduleTab).toContain("${dateHeader.dayName}, ${dateHeader.monthName} ${dateHeader.dayNum}");
  });
});

describe("v296 slide-over rest — the drawing's overlap, the v197 mechanism", () => {
  it("the rest overlap is the drawing's measured 120", () => {
    expect(scheduleTab).toContain("const SCHEDULE_SHEET_REST_OVERLAP = 120");
    expect(scheduleTab).toContain("scrollToOffset({ offset: SCHEDULE_SHEET_REST_OVERLAP, animated: false })");
  });

  it("the spacer still carries the summary's full measured height (no text is covered by construction)", () => {
    expect(scheduleTab).toContain("style={{ height: scheduleSummaryHeight }}");
  });
});

describe("v296 end of day — the divider heads the completed stack", () => {
  it("the divider is pushed before every completed item and before worship", () => {
    const dividerAt = scheduleTab.indexOf('type: "end-of-day"');
    const completedAt = scheduleTab.indexOf("const completedEvents = dayEvents.filter((e) => e.isCompleted);");
    const worshipAt = scheduleTab.indexOf('type: "worship-display"');
    expect(dividerAt).toBeGreaterThanOrEqual(0);
    expect(completedAt).toBeGreaterThan(dividerAt);
    expect(worshipAt).toBeGreaterThan(dividerAt);
  });
});

describe("v296 summary panel — the same saturated panel in dark and light", () => {
  it("the panel derives from the accent theme's saturated (light) primary", () => {
    expect(summaryCard).toContain("getAccentThemeDefinition(accentTheme).light?.primary");
    expect(summaryCard).toContain('mix(seedPrimary, "#000000", 0.12)');
  });
});
