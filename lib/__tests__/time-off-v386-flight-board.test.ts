// ─────────────────────────────────────────────────────────────────────────────
// v386 — the FLIGHT BOARD for the claimed white blocks (his
// approved final, Oct 31: time-off-flight-board-final-v4.html —
// "this looks great!"), with his words correction the same day:
// the destination cycles the Time Off planner's "Add to the
// timeline" kind words (Travel, Stay, Plan, Food, Ride, View),
// NOT the white blocks' add-words and NOT the drawing's
// stand-ins (REST/BREATHE/UNWIND/WANDER — "These are not the
// right words").
//
// The shape: a run of claimed blocks is ONE connected panel in
// the trip's colour family (timeOffPassPalette — the entry
// pass's own derivation); each block is a flight row (route
// line over a dotted path, the plane at the elapsed spot, the
// cycling destination + duration beneath, an ON TIME pill
// while upcoming); the block holding "now" fills with the
// deep step — the NOW BOARDING hero standing alone, a filled
// row inside a run. Ordinary whites and the Time Off page's
// own timeline are untouched, and v385's passes stay on the
// itinerary entries where they belong.
//
// v387 amendment (Oct 31, device verdict on v386): the flight
// rows, panels, words, and the solo hero were right — but a
// now block inside a run rendered as a filled ROW in the
// panel, and he rejected it: "The 'Now' card is supposed to
// be the big one and separated (just like the mockup!)". The
// now block is now ALWAYS the big hero, standing separated;
// a run holding it SPLITS around it (panel above, hero, panel
// below). The filled-row pins are re-pinned to the split
// below, with the history kept here.
//
// v402 amendment (Oct 31, his screenshot ask): the hero's
// FIELD colour leaves the trip family — "Can you make the
// time off now card color match the users chosen app color
// (like mines blue right now)?" The hero pins below are
// re-pinned from palette.band to heroBand (the app seed's
// saturated step); the panel rows keep the trip palette
// byte-for-byte, as his v392 addendum settled. The mechanism
// itself is pinned in time-off-v402-now-hero-seed.test.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { ITINERARY_KINDS, ITINERARY_KIND_WORDS, getItineraryKindLabel } from "../time-off";
import { whiteBlockElapsedFraction } from "../whites";
import type { TimeBlock } from "../time-blocks";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const timeOffTravel = read("components/time-off-travel.tsx");
const scheduleTab = read("components/schedule-tab.tsx");
const timeOffExperience = read("components/time-off-experience.tsx");
const timeBlockIndicator = read("components/time-block-indicator.tsx");
const cyclingWord = read("components/cycling-word.tsx");
const timeOffLib = read("lib/time-off.ts");

const claimedGroup = timeOffTravel.slice(
  timeOffTravel.indexOf("export function ClaimedRestGroup"),
  timeOffTravel.indexOf("\n/**\n * v385 — one itinerary entry"),
);
const flightKit = timeOffTravel.slice(
  timeOffTravel.indexOf("v386 — the FLIGHT BOARD machinery"),
  timeOffTravel.indexOf("export const timeOffTravelStyles"),
);
const timeBlockCases = scheduleTab.slice(
  scheduleTab.indexOf('case "time-block":'),
  scheduleTab.indexOf('case "current-time-indicator":'),
);

const block = (startTime: string, endTime: string): TimeBlock => ({
  id: `gap-${startTime}-${endTime}`,
  startTime,
  endTime,
  durationMinutes: 0,
  label: "",
});

describe("v386 words — the destination cycles the PLANNER's kind words", () => {
  it("the list is Travel, Stay, Plan, Food, Ride, View — the chips' words, in chip order", () => {
    expect(ITINERARY_KIND_WORDS).toEqual(["Travel", "Stay", "Plan", "Food", "Ride", "View"]);
  });

  it("the list is DERIVED from the kinds through their labels — one source, no second copy", () => {
    expect(ITINERARY_KIND_WORDS).toEqual(ITINERARY_KINDS.map((kind) => getItineraryKindLabel(kind)));
    expect(timeOffLib).toContain(
      "export const ITINERARY_KIND_WORDS: string[] = ITINERARY_KINDS.map((kind) => getItineraryKindLabel(kind));",
    );
    // The component never hardcodes the words itself.
    expect(timeOffTravel).not.toContain('"Travel"');
    expect(timeOffTravel).not.toContain('"Stay"');
  });

  it("the destination slot reads the shared list through the shared rotator", () => {
    expect(flightKit).toContain("words={ITINERARY_KIND_WORDS}");
    expect(flightKit).toContain("<CyclingWord");
    // The drawing's stand-in words are nowhere in the app code.
    expect(timeOffTravel).not.toContain("WANDER");
    expect(timeOffTravel).not.toContain("UNWIND");
  });

  it("the rotator is the whites' own cadence, extracted once — whole words, crossfade, no bounce", () => {
    expect(cyclingWord).toContain("export const WORD_CYCLE_MS = 2800;");
    expect(cyclingWord).toContain("duration: 200, easing: Easing.inOut(Easing.quad), useNativeDriver: true");
    expect(cyclingWord).toContain("duration: 240, easing: Easing.inOut(Easing.quad), useNativeDriver: true");
    expect(cyclingWord).not.toContain("Easing.bounce");
    expect(cyclingWord).not.toContain("Animated.spring");
    // Both surfaces ride the one component now.
    expect(timeBlockIndicator).toContain("<CyclingWord");
    expect(timeOffTravel).toContain('from "./cycling-word"');
  });

  it("the ordinary whites keep their OWN words — unclaimed blocks are unchanged", () => {
    expect(timeBlockIndicator).toContain('const ADD_WORDS = ["event", "todo", "ministry", "rest"];');
    expect(timeBlockIndicator).toContain("words={ADD_WORDS}");
    expect(timeBlockIndicator).not.toContain("ITINERARY_KIND_WORDS");
  });
});

describe("v386 plane — it rides at the elapsed spot", () => {
  it("the fraction: 0 before, the elapsed share inside, 1 once landed, 0 with no now", () => {
    const b = block("17:30", "19:00");
    expect(whiteBlockElapsedFraction(b, null)).toBe(0);
    expect(whiteBlockElapsedFraction(b, undefined)).toBe(0);
    expect(whiteBlockElapsedFraction(b, 17 * 60)).toBe(0);
    expect(whiteBlockElapsedFraction(b, 17 * 60 + 30)).toBe(0);
    expect(whiteBlockElapsedFraction(b, 18 * 60 + 15)).toBe(0.5);
    expect(whiteBlockElapsedFraction(b, 19 * 60)).toBe(1);
    expect(whiteBlockElapsedFraction(b, 20 * 60)).toBe(1);
  });

  it("the rows and the hero take the plane's seat from that one fraction", () => {
    expect(claimedGroup).toContain("whiteBlockElapsedFraction(block, nowMinutes)");
    expect(flightKit).toContain("Animated.timing(anim, {");
    expect(flightKit).toContain("useNativeDriver: true");
    // Transform only — the plane never lays out its neighbours.
    expect(flightKit).toContain("translateX: anim.interpolate({");
    expect(flightKit).not.toContain("Animated.spring");
    expect(flightKit).not.toContain("Easing.bounce");
  });

  it("a landed row sits quiet — plane at the end, no ON TIME pill; an upcoming row keeps its pill", () => {
    expect(claimedGroup).toContain("const landed = nowMinutes != null && timeToMinutes(block.endTime) <= nowMinutes;");
    expect(claimedGroup).toContain("landed ? null : (");
    expect(claimedGroup).toContain("ON TIME");
    expect(claimedGroup).toContain("backgroundColor: palette.stub");
  });
});

describe("v386 the board — one connected panel, flight rows, the now fill", () => {
  it("one panel per run in the trip's palette paper, radius 24, hairline seams, a row per block", () => {
    expect(claimedGroup).toContain("timeOffPassPalette(timeOff, colors.surface)");
    expect(claimedGroup).toContain("borderRadius: 24");
    expect(claimedGroup).toContain("backgroundColor: palette.paper");
    expect(claimedGroup).toContain("StyleSheet.hairlineWidth");
    // v387: rows map over a PANEL SEGMENT of the run — the run
    // splits around the hero now, so the map is per segment.
    expect(claimedGroup).toContain("segment.map((block, i)");
    // Every row is its own tap target into the Time Off page,
    // labelled with its own range — and nothing is completable.
    expect(claimedGroup).toContain("onPress={() => onPressBlock(block)}");
    expect(claimedGroup).toContain("format12HourTime(block.startTime)} to ${format12HourTime(block.endTime)}");
    expect(claimedGroup).not.toContain("isCompleted");
    expect(claimedGroup).not.toContain("onToggle");
    expect(claimedGroup).not.toContain("check-circle");
  });

  it("each row: the route line (times as bold print over the dotted path) + destination and duration beneath", () => {
    expect(flightKit).toContain('borderStyle: "dotted"');
    expect(flightKit).toContain('name="flight"');
    expect(claimedGroup).toContain("<FlightRouteLine");
    expect(claimedGroup).toContain("fontSize={17}");
    expect(claimedGroup).toContain("· ${whiteBlockBadge(block.durationMinutes)}");
    expect(claimedGroup).toContain("<FlightDestination startIndex={index}");
  });

  it("v387: the now block is ALWAYS the big separated hero — a run splits around it, no filled row remains", () => {
    // Was v386: "the now block fills with the deep step — hero
    // standing alone, filled row inside a run" (a solo-only
    // hero branch plus an isNow fill on the panel rows).
    // Superseded by his device verdict the same day: "The
    // 'Now' card is supposed to be the big one and separated
    // (just like the mockup!)". The hero form now renders for
    // the now block wherever it sits, and the run splits into
    // a panel above it and a panel below it.
    expect(claimedGroup).toContain("blocks.findIndex((b) => whiteBlockContainsNow(b, nowMinutes))");
    // The hero form itself — the v386 solo form, now universal.
    // v402: its field is heroBand (the seed step), not the trip
    // family's band — see the amendment at the top of this file.
    expect(claimedGroup).toContain("NOW BOARDING");
    expect(claimedGroup).toContain("borderRadius: 28");
    expect(claimedGroup).toContain("backgroundColor: heroBand");
    expect(claimedGroup).not.toContain("backgroundColor: palette.band");
    expect(claimedGroup).toMatch(/>\s*NOW\s*<\/Text>/);
    // The split: before-segment, hero, after-segment — in
    // that source order, so a 3-block run with now in the
    // middle renders panel(1 row) + hero + panel(1 row), and
    // now at an edge renders hero + panel or panel + hero.
    expect(claimedGroup).toContain("const before = blocks.slice(0, nowIndex);");
    expect(claimedGroup).toContain("const after = blocks.slice(nowIndex + 1);");
    expect(claimedGroup).toContain("if (nowIndex === -1) return renderPanel(blocks, 0);");
    const beforeAt = claimedGroup.indexOf("renderPanel(before, 0)");
    const heroAt = claimedGroup.indexOf("renderHero(blocks[nowIndex], nowIndex)");
    const afterAt = claimedGroup.indexOf("renderPanel(after, nowIndex + 1)");
    expect(beforeAt).toBeGreaterThan(-1);
    expect(heroAt).toBeGreaterThan(beforeAt);
    expect(afterAt).toBeGreaterThan(heroAt);
    // The filled row is GONE — no dead branch of it remains:
    // no solo-only hero gate, no isNow styling on panel rows,
    // no "min in" text on a row (it lives on the hero only).
    expect(claimedGroup).not.toContain("if (blocks.length === 1 && nowIndex === 0)");
    expect(claimedGroup).not.toContain("isNow");
    expect(claimedGroup).not.toContain("min in`");
  });

  it("the hero's quiet line: minutes in of the whole, when it lands, then the next item — clause dropped when there is none", () => {
    expect(claimedGroup).toContain("minutesIn} ${minutesIn === 1 ? \"minute\" : \"minutes\"} in of ${whiteBlockBadge(block.durationMinutes)} · lands ${format12HourTime(block.endTime)}${nextTitle ? `, then ${nextTitle}` : \"\"}");
    // The next title is computed once in the day build and
    // rides both claimed call sites.
    expect(scheduleTab).toContain("item.data.nextTitle = nextTitle;");
    expect(scheduleTab).toContain('if (t.type === "itinerary") return t.data?.entry?.title ?? null;');
    expect(timeBlockCases.match(/nextTitle=\{item\.data\.nextTitle \?\? null\}/g)).toHaveLength(2);
    expect(timeBlockCases).toContain("nowMinutes={nm}");
  });

  it("the palette is the pass's own derivation — one family for tickets and board", () => {
    // v402: the PANEL rows still run on the pass family entire
    // (paper field, print, the stub pill, the band riding the
    // rows' planes) — only the hero's field left the family,
    // for the app seed's step (heroBand).
    expect(claimedGroup).toContain("palette.print");
    expect(claimedGroup).toContain("palette.band");
    expect(claimedGroup).toContain("planeColor={palette.band}");
    expect(claimedGroup).toContain("palette.stub");
    // No second colour source sneaks in for the claimed face.
    expect(claimedGroup).not.toContain("tripBaseColor");
  });
});

describe("v386 scope — only the claimed blocks change", () => {
  it("the Time Off page's own timeline is untouched — no flight board there", () => {
    expect(timeOffExperience).not.toContain("ClaimedRestGroup");
    expect(timeOffExperience).not.toContain("NOW BOARDING");
    expect(timeOffExperience).not.toContain("ITINERARY_KIND_WORDS");
    expect(timeOffExperience).toContain("function TimelineEntry");
  });

  it("v385's passes stay on the entries — the board prints no pass", () => {
    expect(claimedGroup).not.toContain("BOARDING PASS");
    expect(timeOffTravel).toContain("export function ItineraryEntryPass");
  });

  it("a lone claimed block delegates to the same board — one machinery, two seats", () => {
    const claimedBlock = timeOffTravel.slice(
      timeOffTravel.indexOf("export function ClaimedRestBlock"),
      timeOffTravel.indexOf("export const timeOffTravelStyles"),
    );
    expect(claimedBlock).toContain("<ClaimedRestGroup");
    expect(claimedBlock).toContain("blocks={[block]}");
  });
});
