// ─────────────────────────────────────────────────────────────────────────────
// v328 — THE HEADER WAITS FOR THE HALFWAY MARK.
//
// His ask (Oct 28, 2026, 23:13, mid-scroll screenshot of the day
// page): "Can the scroll for the header and date bar wait until
// I'm at least halfway over the summary before going up?"
//
// Before v328 the app bar and the week strip began sliding the
// moment the sheet moved (v308's 1:1 slide from scrollY 0; the
// strip keyed to its own seat in v315, with its fade). The header
// therefore started leaving while the Daily Summary was barely
// covered — he had to give up the date and the day cells almost
// immediately on any scroll.
//
// THE FIX: the slide is gated on the COVER. The sheet's head
// spacer is exactly the summary's measured height
// (scheduleSummaryHeight), so scrollY is the cover distance: at
// scrollY = scheduleSummaryHeight / 2 the sheet covers the
// summary's first half. slideGateStart is that halfway mark.
// headerSlideY and stripSlideY now interpolate over
// [slideGateStart, scheduleSummaryHeight] — offset 0 at and
// below 50% cover, full travel at 100% cover — and stripFade is
// re-based onto the same gated range with its v315 proportions
// kept (solid through the slide's first 45%, 0 at completion).
// The TRAVELS are untouched (outputRange [0, -headerSlideFull] /
// [0, -stripSlideFull], the seat formulas unchanged), so the
// slide still completes exactly where it completes today and
// nothing invisible stays tappable.
//
// INVARIANTS HELD: the gate touches translate/opacity only —
// the strip twin's touch path is the v297 one, so day-switching
// works at every scroll position, dead zone included; the reach
// press seat still exists only at rest (sheetAtRest) and is
// untouched; the summary panel itself never moves; the skins'
// app-bar fade is untouched (Classic-only change, like v308).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const scheduleTab = read("components/schedule-tab.tsx");

const overlaySlice = scheduleTab.slice(
  scheduleTab.indexOf("the fixed-zone OVERLAY"),
  scheduleTab.indexOf("viewMode === 'week'"),
);
const summaryZoneSlice = scheduleTab.slice(
  scheduleTab.indexOf("Fixed summary behind the sliding sheet"),
  scheduleTab.indexOf("<Animated.FlatList"),
);

// RN's clamped linear interpolation, replicated to pin the SHAPE
// the shipped ranges describe. The source pins below bind the
// shipped formula strings to exactly the ranges modelled here.
const clampInterp = (x: number, input: [number, number], output: [number, number]) => {
  if (x <= input[0]) return output[0];
  if (x >= input[1]) return output[1];
  const t = (x - input[0]) / (input[1] - input[0]);
  return output[0] + t * (output[1] - output[0]);
};

describe("v328 gate — the slide waits for halfway over the summary", () => {
  it("the gate is half the measured summary height (scrollY is the cover distance)", () => {
    expect(scheduleTab).toContain("const slideGateStart = scheduleSummaryHeight / 2;");
    // The cover mapping itself: the sheet's head spacer is the
    // measured summary height, flush at the summary's bottom edge.
    // RE-BASED (v347, Oct 29): the spacer is the measured height + safeInsets.top,
    // absorbing the sheet frame's edge-to-edge bleed — the cover mapping is unchanged.
    expect(scheduleTab).toContain("style={{ height: scheduleSummaryHeight + safeInsets.top }}");
    expect(scheduleTab).toContain("onLayout={(event) => setScheduleSummaryHeight(event.nativeEvent.layout.height)}");
  });

  it("header and strip interpolate over the gated range only, travels unchanged", () => {
    expect(scheduleTab).toContain("const headerSlideY = scrollY.interpolate({");
    expect(scheduleTab).toContain("const stripSlideY = scrollY.interpolate({");
    expect(scheduleTab.match(/inputRange: \[slideGateStart, scheduleSummaryHeight\]/g) ?? []).toHaveLength(2);
    expect(scheduleTab).toContain("outputRange: [0, -headerSlideFull]");
    expect(scheduleTab).toContain("outputRange: [0, -stripSlideFull]");
    // The old from-zero ranges are gone.
    expect(scheduleTab).not.toContain("inputRange: [0, headerSlideFull]");
    expect(scheduleTab).not.toContain("inputRange: [0, stripSlideFull]");
  });

  it("the travels still measure what they measured (seat formulas unchanged)", () => {
    expect(scheduleTab).toContain("84 + classicStripHeight + classicReachRect.y + classicReachRect.height");
    expect(scheduleTab).toContain("const stripSlideFull = 84 + classicStripHeight + 12;");
  });

  it("the strip fade is re-based onto the gated range, proportions kept (solid through 45% of the slide, 0 at completion)", () => {
    expect(scheduleTab).toContain("const stripFade = scrollY.interpolate({");
    expect(scheduleTab).toContain("inputRange: [slideGateStart + (scheduleSummaryHeight - slideGateStart) * 0.45, scheduleSummaryHeight]");
    expect(scheduleTab).not.toContain("inputRange: [stripSlideFull * 0.45, stripSlideFull]");
  });
});

describe("v328 gate — BEHAVIOUR: the interpolation shape", () => {
  // A representative phone: measured summary 640 tall, header
  // travel 212, strip travel 156. Gate = 320 (50% cover).
  const H = 640;
  const gate = H / 2;
  const headerSlideAt = (y: number) => clampInterp(y, [gate, H], [0, -212]);
  const stripSlideAt = (y: number) => clampInterp(y, [gate, H], [0, -156]);
  const stripFadeAt = (y: number) => clampInterp(y, [gate + (H - gate) * 0.45, H], [1, 0]);

  it("header offset is 0 at and below 50% cover — the dead zone", () => {
    expect(headerSlideAt(0)).toBe(0);
    expect(headerSlideAt(H * 0.25)).toBe(0);
    expect(headerSlideAt(gate)).toBe(0);
    expect(stripSlideAt(0)).toBe(0);
    expect(stripSlideAt(gate)).toBe(0);
  });

  it("the slide runs across the remaining cover and is full at 100%", () => {
    expect(headerSlideAt(H * 0.75)).toBe(-106);
    expect(headerSlideAt(H)).toBe(-212);
    expect(stripSlideAt(H * 0.75)).toBe(-78);
    expect(stripSlideAt(H)).toBe(-156);
    // Past full cover everything stays clamped at its end state.
    expect(headerSlideAt(H * 1.5)).toBe(-212);
    expect(stripSlideAt(H * 1.5)).toBe(-156);
  });

  it("the fade is solid through the slide's first 45%, then dissolves to 0 at completion", () => {
    const fadeStart = gate + (H - gate) * 0.45; // 464
    expect(stripFadeAt(0)).toBe(1);
    expect(stripFadeAt(gate)).toBe(1);
    expect(stripFadeAt(fadeStart)).toBe(1);
    expect(stripFadeAt((fadeStart + H) / 2)).toBeCloseTo(0.5);
    expect(stripFadeAt(H)).toBe(0);
    expect(stripFadeAt(H * 1.5)).toBe(0);
  });
});

describe("v328 invariants — what the gate must not break", () => {
  it("day-switching lives on the drawn strip at every scroll position (v297): the touch path is untouched", () => {
    expect(overlaySlice).toContain("onPress={() => setSelectedDate(date)}");
    expect(overlaySlice).toContain("{...weekStripPanResponder.panHandlers}");
    expect(overlaySlice).toContain("transform: [{ translateY: stripSlideY }]");
    expect(overlaySlice).toContain("opacity: stripFade");
  });

  it("the reach press seat is unchanged — rest-only, transform-free", () => {
    expect(overlaySlice).toContain("sheetAtRest && classicReachButtonRect && prayerCheckInPeople.length > 0");
    expect(scheduleTab).toContain("const [sheetAtRest, setSheetAtRest] = useState(true)");
    expect(scheduleTab).toContain("value <= 0.5");
  });

  it("the summary panel itself does not move — no transform on the fixed zone", () => {
    expect(summaryZoneSlice).not.toContain("translateY");
    expect(summaryZoneSlice).not.toContain("transform");
  });

  it("no springs, no bounce, no scale crept into the slide", () => {
    expect(scheduleTab).not.toContain("scale: scrollY.interpolate");
    const slideSlice = scheduleTab.slice(
      scheduleTab.indexOf("const slideGateStart"),
      scheduleTab.indexOf("// Swipe between days"),
    );
    expect(slideSlice).not.toContain("Animated.spring");
    expect(slideSlice).not.toContain("Animated.timing");
    expect(slideSlice.match(/extrapolate: "clamp"/g) ?? []).toHaveLength(3);
  });
});
