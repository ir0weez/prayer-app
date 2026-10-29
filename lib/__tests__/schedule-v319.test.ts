// ─────────────────────────────────────────────────────────────────────────────
// v319 — THE REACH ROW COMES HOME + the strip's month/year block goes.
//
// His device reports on v317 (Oct 28, 2026):
//  1. 19:16, screenshot 10861: "What's going on with this reach out
//     thing when I swipe the card up? Why does that move with it
//     all?" — the summary's reach row was an OVERLAY TWIN (v297's
//     day-switching workaround): a second, live copy of the row
//     rendered above the sheet, riding the header slide. It could
//     not register with the prose printed in the panel underneath,
//     so on a swipe it visibly DRAGGED across the Daily Summary —
//     a floating band double-rendering "You have…" as it crossed.
//     v315's headerFade did not cure the travel.
//  2. 19:25, screenshot 10863: the week strip's right-side
//     month/year block ("Nov 4 / 2026" — the compact Jump-to-date
//     picker's face) is redundant with the app bar's spelled-out
//     day ("Wed, November 4") — REMOVE it; the seven day cells
//     extend across the strip's full width.
//
// THE FIX, reach: the row renders ONCE, as part of the fixed Daily
// Summary panel's own render (DailySummaryCard, visible, no
// invisible layout twin), and it never rides any transform — the
// sheet slides over the panel exactly as settled, covering the row
// mid-slide. The overlay copy and its fade (headerFade) are
// deleted. Day-switching does NOT regress: the strip keeps its
// overlay twin with its v315 slide + fade byte-identical, and the
// sheet's touch-swallowing spacer is untouched.
//
// The one reach interaction is the "Reach out" button, and the
// sheet's ScrollView spans the whole fixed zone, so the panel's
// own button can never be the touch target while the sheet covers
// it (the v297 finding). The overlay therefore hosts a PRESS SEAT:
// an empty Pressable with no children and no transform, seated
// exactly over the button's painted rect (the card measures it —
// the rotating facechip's width moves the button, and its layout
// tracks it), driving the same shared handler. It exists ONLY
// while the sheet is at rest (sheetAtRest, flipped by a scrollY
// listener on the rest boundary alone): at rest the button is
// tappable; the moment the sheet moves the seat unmounts, so
// nothing invisible is ever tappable and the sliding sheet owns
// the zone. It renders nothing, so the prose can never double.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const scheduleTab = read("components/schedule-tab.tsx");
const summaryCard = read("components/daily-summary-card.tsx");

const summarySlice = scheduleTab.slice(
  scheduleTab.indexOf("const renderScheduleSummary"),
  scheduleTab.indexOf("const renderDateHeaderCard"),
);
const overlaySlice = scheduleTab.slice(
  scheduleTab.indexOf("the fixed-zone OVERLAY"),
  scheduleTab.indexOf("viewMode === 'week'"),
);
const seatSlice = scheduleTab.slice(
  scheduleTab.indexOf("the REACH PRESS SEAT"),
  scheduleTab.indexOf("viewMode === 'week'"),
);
const stripSlice = scheduleTab.slice(
  scheduleTab.indexOf("The week strip — v296's JSX"),
  scheduleTab.indexOf("the REACH PRESS SEAT"),
);

describe("v319 reach — the row renders ONCE, in the panel", () => {
  it("the card holds the row's only render (definition + exactly one JSX use)", () => {
    expect(summaryCard).toContain("export function SummaryReachRow");
    expect(summaryCard.match(/<SummaryReachRow/g) ?? []).toHaveLength(1);
  });

  it("schedule-tab renders no reach row at all — no import, no copy", () => {
    expect(scheduleTab).not.toContain("SummaryReachRow");
  });

  it("no invisible layout twin survives in the card — the panel render is live and visible", () => {
    expect(summaryCard).not.toContain("style={{ marginTop: 12, opacity: 0 }}");
    expect(summaryCard).toContain("style={{ marginTop: 12 }}");
    // The row is rendered unconditionally in the panel branch (the
    // old onReachRect conditional that swapped in the twin is gone).
    expect(summaryCard).not.toContain("onReachRect ? (");
  });

  it("the panel render is the live one: the row's own button carries the shared handler", () => {
    expect(summaryCard).toContain("onReachOutPress={onReachOutPress}");
    expect(summarySlice).toContain("onReachOutPress={handleSummaryReachOut}");
  });
});

describe("v319 reach — outside every sliding transform", () => {
  it("the overlay carries no reach transform and no reach fade", () => {
    expect(overlaySlice).not.toContain("headerSlideY");
    expect(overlaySlice).not.toContain("headerFade");
    expect(overlaySlice).not.toContain("classicReachRect");
  });

  it("headerFade is deleted outright (it drove only the twin)", () => {
    expect(scheduleTab).not.toContain("const headerFade");
    expect(scheduleTab).not.toContain("inputRange: [headerSlideFull * 0.45, headerSlideFull]");
  });

  it("the app bar keeps the shared slide, byte-identical (the slide's travel still measures the whole block)", () => {
    expect(scheduleTab).toContain("const headerSlideY = scrollY.interpolate({");
    expect(scheduleTab).toContain("inputRange: [0, headerSlideFull]");
    expect(scheduleTab).toContain("outputRange: [0, -headerSlideFull]");
    expect(scheduleTab).toContain("84 + classicStripHeight + classicReachRect.y + classicReachRect.height");
    expect(scheduleTab).toContain(": { transform: [{ translateY: headerSlideY }] }");
  });

  it("the press seat itself is transform-free and fade-free — it is on the button or not there", () => {
    expect(seatSlice).not.toContain("translateY");
    expect(seatSlice).not.toContain("transform: [{");
    expect(seatSlice).not.toContain("opacity:");
    expect(seatSlice).not.toContain("Animated.View");
  });
});

describe("v319 reach — the rest-only press seat", () => {
  it("the seat is gated on the sheet being at rest and on a measured button rect", () => {
    expect(overlaySlice).toContain("sheetAtRest && classicReachButtonRect && prayerCheckInPeople.length > 0");
  });

  it("the seat sits exactly over the panel button's painted rect, in the summary flow's coordinates", () => {
    expect(overlaySlice).toContain("left: 20 + classicReachButtonRect.x");
    expect(overlaySlice).toContain("top: 84 + classicStripHeight + classicReachButtonRect.y");
    expect(overlaySlice).toContain("width: classicReachButtonRect.width");
    expect(overlaySlice).toContain("height: classicReachButtonRect.height");
  });

  it("the seat drives the one shared Reach out handler and renders nothing", () => {
    expect(seatSlice).toContain("onPress={handleSummaryReachOut}");
    expect(seatSlice).toContain('accessibilityLabel="Reach out"');
    expect(seatSlice).not.toContain("<Text");
  });

  it("rest is tracked from the scroll value, flipping only on the boundary", () => {
    expect(scheduleTab).toContain("const [sheetAtRest, setSheetAtRest] = useState(true)");
    expect(scheduleTab).toContain("scrollY.addListener");
    expect(scheduleTab).toContain("value <= 0.5");
    expect(scheduleTab).toContain("sheetAtRestRef");
  });

  it("the card measures the button and reports it in card-root coordinates", () => {
    expect(summaryCard).toContain("onButtonRect");
    expect(summaryCard).toContain("onReachButtonRect");
    expect(summaryCard).toContain("onReachButtonRect({ x: row.x - 6 + btn.x, y: row.y + 8 + btn.y, width: btn.width, height: btn.height })");
    expect(scheduleTab).toContain("onReachButtonRect={(rect) => {");
    expect(scheduleTab).toContain("setClassicReachButtonRect");
  });

  it("BEHAVIOUR: the row still rotates ONE face at a time on the settled cadence (unchanged)", () => {
    expect(summaryCard).toContain("3200");
    expect(summaryCard).toContain("not reached in");
    expect(summaryCard).toContain('color: "#D9CCFF" }}>REACH</Text>');
  });
});

describe("v319 day-switching — the v297 invariant holds", () => {
  it("the strip twin still lives in the overlay with its v315 slide + fade, byte-identical drivers", () => {
    expect(overlaySlice).toContain("opacity: stripFade");
    expect(overlaySlice).toContain("transform: [{ translateY: stripSlideY }]");
    expect(scheduleTab).toContain("const stripSlideFull = 84 + classicStripHeight + 12;");
    expect(scheduleTab).toContain("inputRange: [stripSlideFull * 0.45, stripSlideFull]");
    expect(overlaySlice).not.toContain("scale");
  });

  it("BEHAVIOUR: day cells still drive the real selection state, at the overlay's seat", () => {
    expect(overlaySlice).toContain("onPress={() => setSelectedDate(date)}");
    expect(overlaySlice).toContain("const isSelected = date === selectedDate");
    expect(overlaySlice).toContain("{...weekStripPanResponder.panHandlers}");
  });

  it("the sheet mechanism is untouched — the spacer still carries the full measured zone", () => {
    expect(scheduleTab).toContain('pointerEvents="none"');
    expect(scheduleTab).toContain("style={{ height: scheduleSummaryHeight }}");
    expect(scheduleTab).toContain('pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 2 }}');
  });

  it("the summary still holds only the strip's layout twin (height placeholder, no handlers)", () => {
    expect(summarySlice).toContain("the strip's LAYOUT TWIN");
    expect(summarySlice).toContain("style={{ height: classicStripHeight }}");
    expect(summarySlice).not.toContain("weekStripPanResponder.panHandlers");
  });
});

describe("v319 week strip — the month/year block is removed; the cells take the full width", () => {
  it("no Jump to date picker rides in the strip anymore", () => {
    expect(overlaySlice).not.toContain('label="Jump to date"');
    expect(stripSlice).not.toContain("DateTimePicker");
    expect(stripSlice).not.toContain("getCompactDateParts");
  });

  it("the seven cells keep flex: 1 — with the picker's seat gone they span the row's full width", () => {
    expect(stripSlice).toContain("flex: 1,");
    expect(stripSlice).toContain("weekDates.map((date) => {");
    // The picker's fixed-width wrapper seat is gone from the row.
    expect(stripSlice).not.toContain("paddingLeft: 6, minHeight: 52");
  });

  it("the strip's settled dress is untouched: selected ring, today ink, time-off dot", () => {
    expect(stripSlice).toContain("borderColor: isSelected ? scheduleMaterialTones(colors.primary, colors.surface).primaryDeep : \"transparent\"");
    expect(stripSlice).toContain("isDateDuringTimeOff(timeOffList, date) ? colors.primary : \"transparent\"");
    expect(stripSlice).toContain("onLayout={(e) => {");
    expect(stripSlice).toContain("setClassicStripHeight");
  });

  it("the picker component itself survives elsewhere in the tab (editors keep it)", () => {
    expect(scheduleTab).toContain("<DateTimePicker");
  });
});
