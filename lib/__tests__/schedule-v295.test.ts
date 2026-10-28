// ─────────────────────────────────────────────────────────────────────────────
// v295 — THE SCHEDULE FIDELITY BUILD. v294 shipped a schedule that did
// not match the approved v32 drawing; Jonathan called it out ("nothing
// like the mockups I approved", Oct 27 18:06). These pins hold the
// fidelity repairs:
//
//  (a) FAB MOUNT — the FAB renders from the SHELL, after <AppTabBar/>,
//      through the bridge host; schedule-tab registers its config and
//      never renders <ScheduleFab> itself (v294's in-subtree mount let
//      the tab bar paint over the button's lower half). The morph
//      target is the drawing's 218×276.
//  (b) TODO ROWS — no tag text anywhere on a todo row or in a
//      todo-pair rectangle (his ruling: the colour carries the
//      category); the drawn checkbox and the "N MIN" chip are present.
//  (c) EVENT CARDS — Classic wore the drawing's composition: a 64px
//      art band (34px colour band without artwork) over a body. The
//      old full-bleed illustrated card survived for the skins.
//      RE-BASED in v296: Jonathan rejected the band on device
//      (Oct 27, 22:44 — "Why aren't the artworks filling the whole
//      card?!"); the Classic card is full-bleed now, and the pins
//      below were rewritten to say so. See schedule-v296.test.ts.
//  (d) SUMMARY — the Classic composition is the saturated panel with
//      the REACH row and the fast clause; schedule-tab wires the due
//      people and the fast line through.
//  (e) STUDY + WORSHIP — the study card carries the progress thread;
//      the worship card is the v19-fixed drawing (80px art, heard
//      count + thread, always-visible checklist) under the header
//      "This week's music".
//  (f) MINISTRY + TIME OFF — the ticket carries ONE chips row (the
//      DISPATCH strip is gone from that dress; exactly one strip
//      render remains, in the skinned card); the square's time is the
//      30px hero with the seed bar; the trip band is saturated with
//      the TIME OFF · TYPE label.
//  (g) END OF THE DAY — the divider item is pushed before the worship
//      card, heading the completed stack.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const shell = read("app/(tabs)/index.tsx");
const scheduleTab = read("components/schedule-tab.tsx");
const fab = read("components/schedule-fab.tsx");
const bridge = read("lib/schedule-fab-bridge.ts");
const host = read("components/schedule-fab-host.tsx");
const summaryCard = read("components/daily-summary-card.tsx");
const albumCard = read("components/album-card.tsx");
const timeOffTravel = read("components/time-off-travel.tsx");

const sliceBetween = (src: string, from: string, to: string) => {
  const a = src.indexOf(from);
  const b = src.indexOf(to, a);
  expect(a).toBeGreaterThanOrEqual(0);
  expect(b).toBeGreaterThan(a);
  return src.slice(a, b);
};

describe("v295 FAB mount — the shell owns the paint layer", () => {
  it("the shell renders ScheduleFabHost AFTER the tab bar", () => {
    const tabBarAt = shell.indexOf("<AppTabBar");
    const hostAt = shell.indexOf("<ScheduleFabHost />");
    expect(tabBarAt).toBeGreaterThanOrEqual(0);
    expect(hostAt).toBeGreaterThan(tabBarAt);
  });

  it("schedule-tab registers its config and never renders the FAB itself", () => {
    expect(scheduleTab).toContain("setScheduleFabConfig({");
    expect(scheduleTab).toContain("setScheduleFabConfig(null)");
    expect(scheduleTab).not.toContain("<ScheduleFab");
  });

  it("the bridge + host carry the config to the component", () => {
    expect(bridge).toContain("useSyncExternalStore");
    expect(bridge).toContain("export function setScheduleFabConfig");
    expect(host).toContain("useScheduleFabConfig");
    expect(host).toContain("<ScheduleFab {...config} />");
  });

  it("the morph target is the drawing's 218×276", () => {
    expect(fab).toContain("[56, 218]");
    expect(fab).toContain("[56, 276]");
  });

  it("Classic menu rows wear tonal tiles (pale tile, deep glyph)", () => {
    expect(fab).toContain("item.tileColor ?? item.color");
    expect(scheduleTab).toContain('tileColor: "#E0D8FF", glyphColor: "#5B3DF0"');
    expect(scheduleTab).toContain('tileColor: "#FAEECD", glyphColor: "#A87C14"');
  });
});

describe("v295 todo rows — the colour carries the category", () => {
  it("no tag pill renders on the single row or the group header", () => {
    expect(scheduleTab).not.toContain("linkedEvent?.title || linkedMinistry?.title");
    expect(scheduleTab).not.toContain("{todo.tag &&");
  });

  it("the todo-pair rectangles carry no tag chip", () => {
    const pair = sliceBetween(scheduleTab, 'case "todo-pair":', 'case "todo":');
    expect(pair).not.toContain("t.tag");
    expect(pair).toContain("} MIN");
  });

  it("the drawn checkbox and the N MIN chip dress the single row", () => {
    expect(scheduleTab).toContain("borderWidth: 2.5, borderColor: todo.color || colors.primary");
    expect(scheduleTab).toContain("} MIN");
    // RE-BASED in v297 (his Oct 27 verdict: "the todos are also
    // huge"): the row's own metrics are dress-split now — under
    // Classic the drawing's padding 8 / row gap 12; under the
    // skins the v295 values stand. The drawing's base v295 set
    // (paddingVertical 10) remains the skins' half of the split.
    expect(scheduleTab).toContain("borderRadius: 18, marginHorizontal: 12, marginBottom: isSkinned ? 8 : 12, paddingVertical: isSkinned ? 10 : 8, paddingHorizontal: 12, gap: 10");
  });
});

describe("v295 event cards — band + body under Classic (RE-BASED in v296)", () => {
  // RE-BASED in v296 (his ruling, Oct 27 22:44, on the shipped band
  // cards): "Why aren't the artworks filling the whole card?! Also
  // this still isn't the mockup I agreed on!!" The band composition
  // is REPLACED by the full-bleed card — the scene fills the whole
  // card face (schedule-v296.test.ts carries the new pins). What
  // survives of the v295 composition is the pill: the event's own
  // colour, one spot, shared-meridiem range — and the branch order
  // flipped: Rest now precedes the Classic branch, so Rest keeps
  // its living sky under Classic again, as it did before v295.
  it("the band geometry is gone; the pill colour derivation survives", () => {
    expect(scheduleTab).not.toContain("height: keyword ? 64 : 34");
    expect(scheduleTab).not.toContain("const bandColor = event.color || keyword?.bgColor || colors.primary");
    expect(scheduleTab).toContain("const pillColor = event.color || keyword?.accentColor || colors.primary");
  });

  it("the Classic branch now sits AFTER the Rest fallthrough (Rest keeps its living sky)", () => {
    const restAt = scheduleTab.indexOf('if (keyword?.label === "Rest")');
    const classicAt = scheduleTab.indexOf("v296 (CLASSIC ONLY): the full-bleed event card");
    expect(restAt).toBeGreaterThanOrEqual(0);
    expect(classicAt).toBeGreaterThan(restAt);
  });

  it("the skins' full-bleed illustrated card survives untouched", () => {
    expect(scheduleTab).toContain("eventStyles.illustratedCard");
    expect(scheduleTab).toContain("KeywordAmbientAnimation label={keyword.label}");
  });
});

describe("v295 summary — the saturated panel, complete", () => {
  it("the Classic composition is the seed-deep panel with REACH and the fast clause", () => {
    // RE-BASED in v296: v295 mixed the panel down from
    // colors.primary — under dark appearance that is the LIGHTENED
    // step, so the panel rendered pale lavender on his phone. The
    // panel now derives from the accent theme's saturated (light)
    // primary in both appearances (in light they are the same hex,
    // so the light panel is unchanged).
    // RE-BASED in v297 (his Oct 27 verdict: "the summary doesn't
    // match it either"): the REACH row is no longer a "REACH OUT —
    // DUE TODAY" header over up to 4 face chips — it is the
    // drawing's row: a REACH label, ONE rotating facechip (his
    // Oct 25 ruling), and the Reach out button, carried by
    // SummaryReachRow (schedule-v297.test.ts holds its pins).
    expect(summaryCard).toContain("getAccentThemeDefinition(accentTheme).light?.primary");
    // RE-BASED in v298 (his Oct 28 verdict: the light panel rendered
    // visibly LIGHTER than the drawing's #6D28D9): the derivation
    // still starts from the accent theme's saturated light primary,
    // but the step is now schedulePanelStep (the drawing's own HSL
    // step) instead of the 12% RGB black-mix.
    expect(summaryCard).toContain("schedulePanelStep(seedPrimary)");
    expect(summaryCard).toContain("export function SummaryReachRow");
    expect(summaryCard).not.toContain("REACH OUT — DUE TODAY");
    expect(summaryCard).toContain("Your fast —");
    expect(summaryCard).toContain("borderRadius: 24");
  });

  it("schedule-tab wires the due people, the Reach out action, and the fast line", () => {
    // RE-BASED in v297: the Reach out action is the hoisted
    // handleSummaryReachOut (shared by the card's row and its live
    // overlay copy), no longer an inline closure.
    expect(scheduleTab).toContain("reachPeople={prayerCheckInPeople}");
    expect(scheduleTab).toContain("onReachOutPress={handleSummaryReachOut}");
    expect(scheduleTab).toContain("calculateFastStreak(activeFast, selectedDate)");
    expect(scheduleTab).toContain("getFastCalendarDays(activeFast)");
  });
});

describe("v295 study + worship compositions", () => {
  it("the study card derives and renders the progress thread", () => {
    expect(scheduleTab).toContain("progress: studyProgress");
    expect(scheduleTab).toContain("item.data.progress != null");
  });

  it("the worship card is the drawing: 80px art, heard count + thread, checklist rows", () => {
    // v298 re-base: the cover radius pin moves 16 → the drawing's 10
    // (both schedule-material-concepts-v19 and v32 draw .cover at
    // border-radius:10px; v295's 16 was a deviation his Oct 28
    // screenshot caught). Classic takes 10; skins keep 16.
    expect(albumCard).toContain("width: 80, height: 80, borderRadius: classic ? 10 : 16");
    expect(albumCard).toContain("of {tracks.length} heard");
    expect(albumCard).toContain("maxWidth: 150");
    expect(albumCard).toContain("Key of {track.key}");
    expect(scheduleTab).toContain('sectionTitle="This week\'s music"');
  });
});

describe("v295 ministry ticket + squares, time-off band", () => {
  it("the ticket dress carries ONE chips row; the strip survives only in the skinned card", () => {
    expect(scheduleTab).toContain("ticketChips");
    expect(scheduleTab.match(/<MinistryTicket/g)?.length).toBe(1);
  });

  it("the ministry square's time is the 30px hero with the seed bar", () => {
    const square = sliceBetween(scheduleTab, "function MinistrySquare(", "// ─── Birthday Card Component");
    expect(square).toContain("fontSize: 30");
    expect(square).toContain("width: 26, height: 4, borderRadius: 2");
    expect(square).not.toContain("to {format12HourTime(ministry.endTime)}");
  });

  it("the trip band is saturated with the TIME OFF · TYPE label under Classic", () => {
    const band = sliceBetween(timeOffTravel, "export function TripBand", "const ROUTE_RE");
    expect(band).toContain("TIME OFF · ${getTimeOffLabel(timeOff.type).toUpperCase()}");
    expect(band).toContain("backgroundColor: base, borderRadius: 22");
  });

  it("the travel card's head is the 38px band with pill and kind label", () => {
    expect(timeOffTravel).toContain("height: 38, backgroundColor: base");
    // v302 re-base: the head label now comes from the model's kind
    // label getter (same rendered text — TRAVEL/STAY/PLAN/FOOD/…).
    expect(timeOffTravel).toContain("getItineraryKindLabel(entry.kind).toUpperCase()");
  });
});

describe("v295 end of day — the divider heads the completed stack", () => {
  it("the divider item is pushed before the worship card", () => {
    const dividerAt = scheduleTab.indexOf('type: "end-of-day"');
    const worshipAt = scheduleTab.indexOf('type: "worship-display"');
    expect(dividerAt).toBeGreaterThanOrEqual(0);
    expect(worshipAt).toBeGreaterThan(dividerAt);
    expect(scheduleTab).toContain("END OF THE DAY");
  });
});
