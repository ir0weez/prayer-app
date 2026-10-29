// ─────────────────────────────────────────────────────────────────────────────
// v308 — five Jonathan-directed fixes (Oct 28):
//  1. UP NEXT: the v298 fat strip ("looks meh", 10:59) becomes the
//     slim 44px pill from schedule-upnext-timeoff-v1.html.
//     → SUPERSEDED by v314 (his correction, Oct 28 14:54: size was
//     never the ask — the pill becomes a proper Material card; the
//     pins below are v314's).
//  2. DAY OFF BAND: the v295 saturated stack (with the doubled
//     "TIME OFF · TIME OFF" eyebrow) becomes the drawing's slim
//     46px one-line band, radius 12.
//     → SUPERSEDED by v314 (same 14:54 correction — the band
//     becomes a proper tonal Material card; pins below are v314's).
//  3. EVENT CARD TEXT (11:58, refined 12:11): the words rest at the
//     BOTTOM of full-bleed artwork cards over a bottom scrim. TV
//     Show cards take the stepped-up type (title 20.5/800, sub
//     13/600); the OTHER scene cards take the OLD pre-redesign
//     format's type (git 0b5a3cd eventStyles: title 16/700, the
//     note at 20/600, lineHeight 25). Plain colour cards and the
//     Rest branch are untouched; the pill keeps its one spot.
//     → The non-TV half is RESTRUCTURED by v314 (14:50–14:53: his
//     old screenshot is the source — note biggest AND heaviest,
//     time/location as quiet lines of their own; see
//     schedule-v314.test.ts). The bottom anchor, the scrim, the
//     TV type, and the pill pins below still stand.
//  4. MIDNIGHT: a claimed block ending at the window's "24:00"
//     rendered "12:00 PM" — format12HourTime now normalises hour
//     24 at the source; midnight is "12:00 AM", noon "12:00 PM".
//  5. SHOW FONTS: every show in detectTVShowScene's registry has a
//     free lookalike bundled (lib/show-fonts.ts); the show's NAME
//     in the sub-line wears it at the same small size — never the
//     card header. No font / no name in the line → the plain string.
//  6. HEADER SLIDE (12:15): the header block's collapse — the
//     overlay twins' scale-to-0.01 scroll gate, the app bar's
//     ghosting fade — is replaced by ONE shared slide: app bar +
//     strip twin + reach twin translate up 1:1 with the sheet
//     scroll (headerSlideY) and off the top edge. (v315 refines
//     the strip's exit — its own slide + the fade returns; see
//     settings-v315 / schedule pins in lib/__tests__/settings-v315
//     and the re-pinned twin test below.)
//  7. WHITE BLOCKS (12:18, approved): the fill is palette-derived
//     paper (schedulePaperSurface) — lightest surface tone in
//     light, darkest surface in dark — never literal #FFF/#000,
//     never seed-coloured. Border, badge, cycling word, NowPill,
//     heights and grouping unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { format12HourTime } from "../utils";
import { SHOW_FONTS, detectShowFont, splitShowName } from "../show-fonts";
import { schedulePaperSurface } from "../schedule-material";
import { mix } from "../color-themes";
import { hexLuminance } from "../skin-themes";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const scheduleTab = read("components/schedule-tab.tsx");
const timeOffTravel = read("components/time-off-travel.tsx");
const timeOffExperience = read("components/time-off-experience.tsx");
const whites = read("components/time-block-indicator.tsx");
const layout = read("app/_layout.tsx");

const upNextCase = scheduleTab.slice(
  scheduleTab.indexOf('case "up-next"'),
  scheduleTab.indexOf('case "time-off"'),
);
const classicEventBranch = scheduleTab.slice(
  scheduleTab.indexOf("v296 (CLASSIC ONLY): the full-bleed event card"),
  scheduleTab.indexOf("// Active: illustrated card if keyword matches"),
);

describe("v308 up next — the slim pill → v314: a proper Material card", () => {
  it("v314: full-width tonal card, radius 22, comfortable padding — NOT the 44px pill", () => {
    expect(upNextCase).not.toContain("height: 44, borderRadius: 999");
    expect(upNextCase).toContain("borderRadius: 22, backgroundColor: stripTones.primaryContainer");
    expect(upNextCase).toContain("paddingHorizontal: 16, paddingVertical: 15");
  });

  it("v314: eyebrow, title at card weight, time in the deep step, chevron in a tonal circle", () => {
    expect(upNextCase).toContain(">UP NEXT</Text>");
    expect(upNextCase).toContain("fontSize: 10.5, fontWeight: \"800\", letterSpacing: 1.2");
    expect(upNextCase).toContain("fontSize: 16.5, fontWeight: \"800\"");
    expect(upNextCase).toContain("fontSize: 13.5, fontWeight: \"700\"");
    expect(upNextCase).toContain("width: 34, height: 34, borderRadius: 17");
    expect(upNextCase).toContain('name="chevron-right" size={19}');
    // The title is never truncated on the card.
    expect(upNextCase).not.toContain("numberOfLines");
  });

  it("BEHAVIOUR: the whole card still toggles the item through the cards' handlers", () => {
    expect(upNextCase).toContain("onPress={toggleNext}");
    expect(upNextCase).toContain("setTodos((prev) => toggleTodoCompleted(prev, nd.id))");
    expect(upNextCase).toContain("setEvents((prev) => toggleEventCompleted(prev, nd.id))");
    expect(upNextCase).toContain("setMinistries((prev) => toggleMinistryCompleted(prev, nd.id))");
  });
});

describe("v308 day off band — slim band → v314: a proper tonal card", () => {
  const band = timeOffTravel.slice(
    timeOffTravel.indexOf("export function TripBand"),
    timeOffTravel.indexOf("const ROUTE_RE"),
  );

  it("v314: NOT the 46px slim band — a tonal card at radius 22 in the trip's colour family", () => {
    expect(band).not.toContain("height: 46, borderRadius: 12, backgroundColor: base");
    expect(band).toContain("borderRadius: 22, backgroundColor: mix(colors.surface, base");
    expect(band).toContain("paddingHorizontal: 15, paddingVertical: 14");
  });

  it("the doubled eyebrow stays deleted entirely", () => {
    expect(band).not.toContain("TIME OFF · ${getTimeOffLabel(timeOff.type).toUpperCase()}");
    expect(band).not.toContain("letterSpacing: 1.6");
  });

  it("v314: sun tile, title, the day's date + day count, chevron", () => {
    expect(band).toContain('name="wb-sunny" size={21}');
    expect(band).toContain("fontSize: 16, fontWeight: \"800\"");
    expect(band).toContain("Day ${day.day} of ${day.total}");
    expect(band).toContain('name="chevron-right" size={20}');
    // The date is the SELECTED day, not the trip's whole range.
    expect(band).toContain("const dayLabel = new Date(dy, dm - 1, dd)");
  });

  it("the claimed-block chips are a different element — their face is untouched", () => {
    const chips = timeOffTravel.slice(timeOffTravel.indexOf("export function ClaimedRestBlock"));
    expect(chips).toContain("Time off — {timeOff.title}");
    expect(chips).toContain("format12HourTime(startTime)} → {format12HourTime(endTime)");
  });
});

describe("v308 event card text — bottom-anchored, the type split", () => {
  it("artwork cards anchor their words to the bottom; plain cards keep the top seat", () => {
    expect(classicEventBranch).toContain('justifyContent: "flex-end"');
    expect(classicEventBranch).toContain("paddingTop: 40, paddingHorizontal: 12, paddingBottom: isLiveScheduledBlock ? 34 : 12");
  });

  it("a bottom-weighted scrim rides under the words, artwork cards only", () => {
    expect(classicEventBranch).toContain("v308scrim-");
    expect(classicEventBranch).toContain('stopOpacity="0.38"');
  });

  it("TV Show cards take the stepped-up type", () => {
    expect(classicEventBranch).toContain("fontSize: 20.5, fontWeight: \"800\" as const");
    expect(classicEventBranch).toContain("fontSize: 13, fontWeight: \"600\" as const");
  });

  it("the other scene cards take the OLD pre-redesign format's type", () => {
    // git 0b5a3cd, eventStyles.illustratedTitle / illustratedDescription.
    expect(classicEventBranch).toContain("fontSize: 16, fontWeight: \"700\" as const");
    expect(classicEventBranch).toContain("fontSize: 20, fontWeight: \"600\" as const, lineHeight: 25");
  });

  it("the time pill keeps its ONE spot and its Now transform", () => {
    expect(classicEventBranch).toContain('position: "absolute", top: 8, left: 12');
    expect(classicEventBranch).toContain("<NowPill />");
  });

  it("the Rest branch is untouched by v308", () => {
    const restBranch = scheduleTab.slice(
      scheduleTab.indexOf('if (keyword?.label === "Rest")'),
      scheduleTab.indexOf("v296 (CLASSIC ONLY): the full-bleed event card"),
    );
    expect(restBranch).not.toContain("v308");
    expect(restBranch).toContain("eventStyles.illustratedTitle");
  });
});

describe("v308 midnight — the shared formatter tells the truth", () => {
  it("midnight is 12:00 AM, written either way", () => {
    expect(format12HourTime("00:00")).toBe("12:00 AM");
    expect(format12HourTime("24:00")).toBe("12:00 AM");
  });

  it("noon stays 12:00 PM", () => {
    expect(format12HourTime("12:00")).toBe("12:00 PM");
  });

  it("the rest of the day is unchanged", () => {
    expect(format12HourTime("13:05")).toBe("1:05 PM");
    expect(format12HourTime("23:59")).toBe("11:59 PM");
    expect(format12HourTime("09:30")).toBe("9:30 AM");
    expect(format12HourTime("")).toBe("");
  });
});

describe("v308 show fonts — the registry is complete and bundled", () => {
  it("covers every show detectTVShowScene recognises (38)", () => {
    expect(Object.keys(SHOW_FONTS)).toHaveLength(38);
  });

  it("every entry's font file is bundled and its family registered in the layout", () => {
    const files = new Set(Object.values(SHOW_FONTS).map((e) => e.file));
    expect(files.size).toBe(29);
    for (const e of Object.values(SHOW_FONTS)) {
      expect(existsSync(join(root, "assets/fonts", e.file)), e.file).toBe(true);
      expect(layout, e.fontFamily).toContain(`${e.fontFamily}: require("@/assets/fonts/${e.file}")`);
      expect(["SIL OFL 1.1", "Apache 2.0"]).toContain(e.license);
    }
  });

  it("detection mirrors the scene dispatch, guards included", () => {
    expect(detectShowFont("The Bear", "TV Show")?.key).toBe("the-bear");
    expect(detectShowFont("Yes Chef tonight", "TV Show")?.key).toBe("the-bear");
    expect(detectShowFont("Dexter: New Blood", "TV Show")?.key).toBe("dexter-new-blood");
    expect(detectShowFont("Dexter", "TV Show")?.key).toBe("dexter");
    expect(detectShowFont("Winterfell rewatch", "TV Show")?.key).toBe("game-of-thrones");
    // Common words stay behind their TV-context guards.
    expect(detectShowFont("lost my keys at the store", "Errands")).toBeNull();
    expect(detectShowFont("a note from Eva", "Dinner")).toBeNull();
    expect(detectShowFont("you are loved", "Note")).toBeNull();
    expect(detectShowFont("", "")).toBeNull();
  });

  it("the name splits out of the composed line, whole-word", () => {
    const bear = SHOW_FONTS["the-bear"];
    expect(splitShowName("S1 E6 · The Bear", bear)).toEqual([
      { text: "S1 E6 · ", show: false },
      { text: "The Bear", show: true },
    ]);
    expect(splitShowName("S2 E1", bear)).toEqual([{ text: "S2 E1", show: false }]);
    // No partial-word matches.
    expect(splitShowName("Bearington", bear)).toEqual([{ text: "Bearington", show: false }]);
    const nb = SHOW_FONTS["dexter-new-blood"];
    expect(splitShowName("Dexter New Blood tonight", nb)).toEqual([
      { text: "", show: false },
      { text: "Dexter New Blood", show: true },
      { text: " tonight", show: false },
    ].filter((s) => s.text.length > 0 || s.show));
  });

  it("the sub-line surfaces engage the segments; the header never changes font", () => {
    expect(classicEventBranch).toContain("showNameSegments(detailLine, showFont)");
    expect(classicEventBranch).toContain('detectShowFont(event.notes, event.title)');
    expect(classicEventBranch).not.toContain("fontFamily");
    const itinerary = timeOffTravel.slice(timeOffTravel.indexOf("export function ItineraryDayCard"));
    expect(itinerary).toContain("showNameSegments(detailLine, showFont)");
    expect(timeOffExperience).toContain("showNameSegments(detailLine, showFont)");
  });
});

describe("v308 header slide — the collapse is a slide, not a shrink", () => {
  const overlaySlice = scheduleTab.slice(
    scheduleTab.indexOf("the fixed-zone OVERLAY"),
    scheduleTab.indexOf("viewMode === 'week'"),
  );

  it("one shared slide drives the block, 1:1 with the sheet scroll", () => {
    expect(scheduleTab).toContain("const headerSlideY = scrollY.interpolate({");
    expect(scheduleTab).toContain("inputRange: [0, headerSlideFull]");
    expect(scheduleTab).toContain("outputRange: [0, -headerSlideFull]");
    // The slide distance covers the lowest twin's seat bottom.
    expect(scheduleTab).toContain("84 + classicStripHeight + classicReachRect.y + classicReachRect.height");
  });

  it("both overlay twins ride the slide — no scale (v315 re-pin: the strip has its own slide, and the fade is back by his word)", () => {
    // v315 SUPERSEDES the "identical translation / no fade gate"
    // half of this pin. Jonathan on v313/v314 (Oct 28, 16:28/16:30):
    // the strip stayed parked at the top "like a creep" under the
    // shared slide, and he liked that the old gate FADED as it slid
    // out. So the strip now rides stripSlideY (a 1:1 slide keyed to
    // its own seat) with opacity stripFade, and the reach twin
    // keeps headerSlideY with opacity headerFade. The no-scale /
    // no-0.01 half of the original pin stands untouched.
    expect(overlaySlice.match(/translateY: headerSlideY/g) ?? []).toHaveLength(1);
    expect(overlaySlice.match(/translateY: stripSlideY/g) ?? []).toHaveLength(1);
    expect(overlaySlice).toContain("opacity: stripFade");
    expect(overlaySlice).toContain("opacity: headerFade");
    expect(overlaySlice).not.toContain("scale: scrollY.interpolate");
    expect(overlaySlice).not.toContain("0.01");
    expect(overlaySlice).not.toContain("opacity: scrollY.interpolate");
  });

  it("no scroll-driven scale survives anywhere in the tab", () => {
    expect(scheduleTab).not.toContain("scale: scrollY.interpolate");
    expect(scheduleTab).not.toContain("const headerOpacity");
  });

  it("the app bar slides under Classic; the skins keep their settled fade", () => {
    expect(scheduleTab).toContain(": { transform: [{ translateY: headerSlideY }] }");
    expect(scheduleTab).toContain("inputRange: [200, 320], outputRange: [1, 0], extrapolate: 'clamp'");
  });

  it("BEHAVIOUR: day-switching still lives on the drawn strip (v297 intact)", () => {
    expect(overlaySlice).toContain("onPress={() => setSelectedDate(date)}");
    expect(overlaySlice).toContain("{...weekStripPanResponder.panHandlers}");
    expect(overlaySlice).toContain('label="Jump to date"');
  });
});

describe("v308 whites — palette-derived paper", () => {
  it("the fill resolves from the derived theme in both components", () => {
    expect(whites.match(/classicSurface = schedulePaperSurface\(colors\.primary, colors\.surface\)/g) ?? []).toHaveLength(2);
    expect(whites).toContain('import { schedulePaperSurface } from "@/lib/schedule-material"');
  });

  it("no literal #FFFFFF/#000000 fill constants remain in the fill path", () => {
    expect(whites).not.toContain('"#000000" : "#FFFFFF"');
    expect(whites).not.toContain('? "#000000" : "#FFFFFF"');
  });

  it("border, badge and the dashed dress are unchanged", () => {
    expect(whites).toContain('mix(colors.primary, "#FFFFFF", 0.45)');
    expect(whites).toContain('borderStyle: isTerminal ? "dashed" : isSkinned ? "solid" : "dashed"');
    expect(whites).toContain("whiteBlockBadge");
  });

  it("light paper: lighter than the page step, tinted by the seed's temperature", () => {
    const surface = "#FFFFFF";
    const warm = schedulePaperSurface("#D97706", surface);
    const cool = schedulePaperSurface("#7C3AED", surface);
    const lum = (hex: string) => hexLuminance(hex);
    // Never the literal white, and lighter than the page ground's
    // own step over the same surface (mix 0.06 in the tones).
    expect(warm).not.toBe("#FFFFFF");
    expect(lum(warm)).toBeGreaterThan(lum(mix(surface, "#D97706", 0.06)));
    expect(lum(warm)).toBeLessThan(1);
    // Temperature: warm seed → red channel leads; violet → blue leads.
    const ch = (hex: string) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    expect(ch(warm)[0]).toBeGreaterThan(ch(warm)[2]);
    expect(ch(cool)[2]).toBeGreaterThan(ch(cool)[0]);
  });

  it("dark paper: the palette's darkest surface — near-black, not literal black, not grey", () => {
    const surface = "#241E35";
    const paper = schedulePaperSurface("#7C3AED", surface);
    expect(paper).toBe(mix(surface, "#000000", 0.4));
    expect(paper).not.toBe("#000000");
    expect(hexLuminance(paper)).toBeLessThan(hexLuminance(surface));
    expect(hexLuminance(paper)).toBeLessThan(0.05);
  });
});
