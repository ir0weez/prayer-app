// ─────────────────────────────────────────────────────────────────────────────
// v384 — the claimed Time Off block as a BOARDING PASS (his pick,
// Oct 31: Depth A — Slim from time-off-ticket-concepts-v4.html,
// over the v3 FINAL drawing). The pass replaced BOTH claimed
// faces (ClaimedRestBlock + the v314 connected ClaimedRestGroup
// box): each block was its OWN pass. The whole palette derives
// from the trip's OWN chosen colour (his ruling: "Will they
// match the colors that are chosen by the user? … They probably
// should."), falling back to the type default when a record
// carries none. NOTHING fake prints (his explicit ruling: no
// scan codes, no seat/gate/flight/serial numbers). The type's
// own icon rides the paper as a small filled stamp that drifts
// (his "Shadow animations" note), at ONE modest size for every
// type (his correction: the drawing's palm sprawled — "It just
// needs to come down more").
//
// v385 amendment (Oct 31, his correction the same day): the
// pass was on the WRONG SURFACE. His words: "I wanted the time
// off events to be the tickets, not the white spaces… Whatever
// I put into this time off creator page" — narrowed further:
// "Not in the timeline of the time off page itself. Just on
// the events placed in the schedule from the time off
// timeline." So: the claimed blocks are RESTORED to their
// pre-v384 dress (the v314 connected box, proportional heights
// driving the rows), and the pass — palette, stamp, drift and
// all — moves to the itinerary entries where the schedule day
// places them (schedule-tab's "itinerary" case →
// ItineraryEntryPass). The palette + format pins below never
// moved: they pin lib/time-off, which the move did not touch.
//
// One honest adaptation, pinned as such below: an itinerary
// entry carries ONE time (no end, no duration anywhere in its
// record), so the entry pass prints a DEPARTURE — FROM
// carries the entry's time, the stub's big print is the
// entry's kind — and prints NO arrival and NO duration.
// Inventing either would break his nothing-fake ruling.
//
// v386 amendment (Oct 31, later still): the claimed blocks'
// restored dress was itself a waystation. The approved flight
// board (time-off-flight-board-final-v4.html — connected
// flight panels, a plane riding at the elapsed spot, the now
// block filled as a NOW BOARDING hero or filled row, the
// destination cycling the Time Off planner's "Add to the
// timeline" kind words) now dresses the claimed blocks, and
// the two claimed-dress pins in the wiring describe below are
// re-pinned to it with their history kept. The pass pins —
// palette, print, stamp, anatomy — never moved: the pass
// still lives on the entries, untouched. The flight board's
// own full spec lives in time-off-v386-flight-board.test.ts.
// v387 amendment (Oct 31, device verdict on v386): the now
// block is ALWAYS the big separated NOW BOARDING hero — a
// run holding it splits around the hero; the filled row is
// gone. ("The 'Now' card is supposed to be the big one and
// separated (just like the mockup!)")
// v392 amendment (Oct 31, later): ONE pin below moved — the
// entry pass's colour source. His words: "I just want the
// event tickets in the schedule to match the color of the
// type (or kind) that was selected in the time off timeline
// editor." The pass is now dyed by the entry's KIND (the
// itineraryKindColor set colour the editor chips and the trip
// page's cards wear) through the same pass derivation —
// timeOffEntryPassPalette. The lib palette pins here never
// moved (the trip path still feeds the flight board and the
// trip page); only the "component resolves the palette" pin
// re-points at the entry resolver. The kind-colour pins live
// in time-off-v392-pass-kind-color.test.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  formatPassDate,
  formatPassDuration,
  getTimeOffColor,
  timeOffPassPalette,
  type TimeOff,
} from "../time-off";
import { hexContrast } from "../skin-themes";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const timeOffTravel = read("components/time-off-travel.tsx");
const scheduleTab = read("components/schedule-tab.tsx");
const timeOffExperience = read("components/time-off-experience.tsx");
// The pass KIT: consts + the drifting stamp + the shared label
// style (unchanged from v384; only its wearer moved).
const passKit = timeOffTravel.slice(
  timeOffTravel.indexOf("export const PASS_STUB_WIDTH"),
  timeOffTravel.indexOf("export function TripBand"),
);
// The pass itself, in its v385 home.
const entryPass = timeOffTravel.slice(timeOffTravel.indexOf("export function ItineraryEntryPass"));
// The restored claimed dress.
const claimedBlock = timeOffTravel.slice(
  timeOffTravel.indexOf("export function ClaimedRestBlock"),
  timeOffTravel.indexOf("export const timeOffTravelStyles"),
);
const claimedGroup = timeOffTravel.slice(
  timeOffTravel.indexOf("export function ClaimedRestGroup"),
  timeOffTravel.indexOf("\n/**\n * v385 — one itinerary entry"),
);

const trip = (over: Partial<TimeOff>): Pick<TimeOff, "color" | "type"> => ({
  type: "vacation",
  ...over,
});

describe("v384 pass print — duration + date from real values", () => {
  it("duration follows the drawing's convention", () => {
    expect(formatPassDuration(60)).toBe("1H");
    expect(formatPassDuration(120)).toBe("2H");
    expect(formatPassDuration(90)).toBe("1½H");
    expect(formatPassDuration(330)).toBe("5½H");
    expect(formatPassDuration(30)).toBe("30M");
    expect(formatPassDuration(45)).toBe("45M");
    expect(formatPassDuration(75)).toBe("1H 15M");
  });

  it("date prints SAT, OCT 31 style from the ISO day", () => {
    expect(formatPassDate("2026-10-31")).toBe("SAT, OCT 31");
    expect(formatPassDate("2026-11-02")).toBe("MON, NOV 2");
  });
});

describe("v384 pass palette — the trip's own chosen colour, whole family", () => {
  const LIGHT = "#FFFFFF";
  const DARK = "#14141A";

  it("two different stored colours give two different pass families", () => {
    const purple = timeOffPassPalette(trip({ color: "#7B1FA2" }), LIGHT);
    const green = timeOffPassPalette(trip({ color: "#388E3C" }), LIGHT);
    expect(purple.paper).not.toBe(green.paper);
    expect(purple.band).not.toBe(green.band);
    expect(purple.print).not.toBe(green.print);
    expect(purple.stub).not.toBe(green.stub);
  });

  it("a record with no stored colour falls back to the type default — never uncoloured", () => {
    const pal = timeOffPassPalette(trip({ color: undefined }), LIGHT);
    // The pastel type default IS the paper.
    expect(pal.paper).toBe(getTimeOffColor("vacation"));
    expect(pal.paper).toBe("#E1F5FE");
    // …and the family still derives around it.
    expect(pal.band).not.toBe(pal.paper);
    expect(pal.print).not.toBe(pal.paper);
  });

  it("the vacation instance lands in the drawing's sky family", () => {
    const pal = timeOffPassPalette(trip({ color: undefined }), LIGHT);
    expect(pal.stub).toBe("#BAE0F1");
    expect(pal.band).toBe("#0680B7");
    expect(pal.print).toBe("#056894");
  });

  it("print clears 4.5:1 on the paper and the band's white capitals clear 3.2:1 — both schemes, several colours", () => {
    for (const surface of [LIGHT, DARK]) {
      for (const color of ["#0288D1", "#7B1FA2", "#388E3C", "#F57C00", "#C2185B", undefined]) {
        const pal = timeOffPassPalette(trip({ color }), surface);
        expect(hexContrast(pal.print, pal.paper)).toBeGreaterThanOrEqual(4.5);
        expect(hexContrast(pal.ink, pal.paper)).toBeGreaterThanOrEqual(4.5);
        expect(hexContrast("#FFFFFF", pal.band)).toBeGreaterThanOrEqual(3.2);
      }
    }
  });

  it("dark appearance darkens the family — paper mixes toward the surface", () => {
    const light = timeOffPassPalette(trip({ color: "#0288D1" }), LIGHT);
    const dark = timeOffPassPalette(trip({ color: "#0288D1" }), DARK);
    expect(dark.paper).not.toBe(light.paper);
    expect(dark.print).not.toBe(light.print);
  });

  it("the component resolves the palette through the one derivation", () => {
    // v385: the wearer is the entry pass; the derivation is the
    // same call, from the parent trip record (entries carry no
    // colour of their own).
    // v392 amendment: the SOURCE moved, not the derivation —
    // the entry pass now resolves through timeOffEntryPassPalette,
    // dyed by the entry's KIND set colour (the trip base the
    // chips step from resolved via tripBaseColor). The trip
    // call survives on the flight board, pinned in the v386
    // file; it no longer appears in the entry pass.
    expect(entryPass).toContain("timeOffEntryPassPalette(entry, timeOff, tripBaseColor(timeOff), colors.surface)");
    expect(entryPass).not.toContain("timeOffPassPalette(timeOff, colors.surface)");
    expect(entryPass).toContain("palette.paper");
    expect(entryPass).toContain("palette.band");
    expect(entryPass).toContain("palette.stub");
  });
});

describe("v385 entry pass anatomy — Depth A as drawn, fed by the entry", () => {
  it("the band: BOARDING PASS in white spaced capitals on the deep step", () => {
    expect(entryPass).toContain("BOARDING PASS");
    expect(entryPass).toContain('fontSize: 9.5, lineHeight: 12, fontWeight: "800", letterSpacing: 4, color: "#FFFFFF"');
    expect(entryPass).toContain("backgroundColor: palette.band, paddingTop: 3, paddingBottom: 4");
  });

  it("NAME is the ENTRY's title; its row shares DATE (the entry's day) and the TRIP day count", () => {
    expect(entryPass).toContain(">NAME</Text>");
    expect(entryPass).toContain(">DATE</Text>");
    expect(entryPass).toContain("formatPassDate(entry.date)");
    expect(entryPass).toContain("entry.title.toUpperCase()");
    expect(entryPass).toContain('fontSize: 15.5, lineHeight: 19, fontWeight: "800", letterSpacing: 0.4, color: palette.ink');
    expect(entryPass).toContain(">TRIP</Text>");
    expect(entryPass).toContain("`DAY ${day.day} OF ${day.total}`");
    expect(entryPass).toContain("tripDayNumber(timeOff, entry.date)");
  });

  it("the big print is the entry's own time — a departure: FROM carries it, the plane glyph rides along", () => {
    expect(entryPass).toContain(">FROM</Text>");
    expect(entryPass).toContain('fontSize: 17, lineHeight: 21, fontWeight: "800", letterSpacing: -0.4, color: palette.print');
    expect(entryPass).toContain('name="flight"');
    expect(entryPass).toContain('format12HourTime(startTime).split(" ")');
    expect(entryPass).toContain("const startTime = entry.time;");
  });

  it("NO invented arrival, NO invented duration — an entry carries one time only (his nothing-fake ruling)", () => {
    expect(entryPass).not.toContain(">TO</Text>");
    expect(entryPass).not.toContain(">DURATION</Text>");
    expect(entryPass).not.toContain("formatPassDuration");
    expect(entryPass).not.toContain("endTime");
  });

  it("REMARKS prints the entry's own detail line, and only when there is one", () => {
    expect(entryPass).toContain("const remarks = itineraryDetailLine(entry);");
    expect(entryPass).toContain("{remarks && (");
    expect(entryPass).toContain(">REMARKS</Text>");
  });

  it("the stub: perforated, a step deeper, the time small, the entry's KIND the big print", () => {
    expect(entryPass).toContain("width: PASS_STUB_WIDTH");
    expect(passKit).toContain("PASS_STUB_WIDTH = 96");
    expect(entryPass).toContain('borderStyle: "dashed"');
    expect(entryPass).toContain("borderLeftColor: palette.seam");
    expect(entryPass).toContain("backgroundColor: palette.stub");
    expect(entryPass).toContain('letterSpacing: 1.6, color: palette.label }}>\n                KIND\n              </Text>');
    expect(entryPass).toContain("getItineraryKindLabel(entry.kind).toUpperCase()");
    expect(entryPass).toContain('fontSize: 16.5, lineHeight: 19, fontWeight: "800", letterSpacing: -0.4, color: palette.print');
    // The punched notches sit centred on the seam.
    expect(entryPass).toContain("right: PASS_STUB_WIDTH - 8");
  });

  it("FORBIDDEN print — nothing on the pass pretends (his explicit ruling)", () => {
    const lower = entryPass.toLowerCase();
    expect(lower).not.toContain("barcode");
    expect(lower).not.toContain("qr code");
    expect(lower).not.toContain("qrcode");
    expect(entryPass).not.toContain("SEAT");
    expect(entryPass).not.toContain("GATE");
    expect(entryPass).not.toContain("FLIGHT NO");
    expect(entryPass).not.toContain("ADMIT");
  });

  it("height register — the drawing's ≈95px stack, pinned at the style level", () => {
    // Band ≈19 (3 + 12 + 4) over a name row ≈30 (11 + 19) and a
    // route row ≈32 (11 + 21) inside 5/4 padding: the plain pass
    // stands ≈95, a REMARKS line (3 + 14) adds ≈17 → ≈112.
    expect(entryPass).toContain("paddingTop: 5, paddingBottom: 4, paddingLeft: 14, paddingRight: 12");
    expect(passKit).toContain('fontSize: 8.5, lineHeight: 11, fontWeight: "800" as const, letterSpacing: 1.6');
    expect(entryPass).toContain("borderRadius: 10");
    expect(entryPass).toContain("borderWidth: 1.5");
  });
});

describe("v385 entry pass stamp — the KIND's icon, modest, matched, filled, drifting", () => {
  it("ONE size for every kind, ≈ a third of the plain pass's height", () => {
    expect(passKit).toContain("PASS_STAMP_SIZE = 36");
    expect(passKit).toContain("size={PASS_STAMP_SIZE}");
    // The stamp source is the entry KIND's own icon — the same
    // glyph the creator's chips and entry rows use (v385: the
    // stamp follows the pass to the entries; it is no longer
    // the trip TYPE's icon).
    expect(entryPass).toContain("icon={getItineraryKindIcon(entry.kind)}");
    expect(entryPass).toContain("color={palette.stamp}");
  });

  it("the stamp is a filled silhouette (the kind's Material glyph), quiet register, behind the print", () => {
    expect(passKit).toContain("PASS_STAMP_OPACITY_MIN = 0.13");
    expect(passKit).toContain("PASS_STAMP_OPACITY_MAX = 0.2");
    // Seated low in the paper's body, stamped before the print layer.
    expect(entryPass.indexOf("<PassStamp")).toBeLessThan(entryPass.indexOf(">NAME</Text>"));
  });

  it("the drift is the house pattern — Animated.timing, sin easing, native driver, no springs", () => {
    expect(passKit).toContain("Animated.loop(");
    expect(passKit).toContain("Animated.timing(drift, { toValue: 1, duration: 4600, easing: Easing.inOut(Easing.sin), useNativeDriver: true })");
    expect(passKit).toContain("setTimeout(() => loop.start(), phaseDelay)");
    expect(passKit).toContain("loop.stop()");
    expect(passKit).not.toContain("Animated.spring");
    expect(passKit).not.toContain("Easing.bounce");
    // Phase derives from the entry's own start — passes never sync.
    expect(entryPass).toContain("const phaseDelay = (timeToMinutes(startTime) * 13) % 3500;");
  });
});

describe("v385 wiring — pass on placed entries, claimed dress restored, timeline untouched", () => {
  const itinCase = scheduleTab.slice(
    scheduleTab.indexOf('case "itinerary":'),
    scheduleTab.indexOf('case "birthday":'),
  );
  const timeBlockCases = scheduleTab.slice(
    scheduleTab.indexOf('case "time-block":'),
    scheduleTab.indexOf('case "current-time-indicator":'),
  );

  it("a TIMED entry placed in the schedule renders the pass; an UNTIMED one keeps its day card", () => {
    expect(itinCase).toContain("item.data.entry.time ?");
    // v393 amendment: the pass JSX now carries the toggle
    // handler (his ruling: the tickets check off) across its
    // own lines; the routing this pin guards is unchanged.
    expect(itinCase).toContain("<ItineraryEntryPass");
    expect(itinCase).toContain("onToggleDone={() => handleToggleItineraryEntry(item.data.timeOff.id, item.data.entry.id)}");
    expect(itinCase).toContain("<ItineraryDayCard entry={item.data.entry} timeOff={item.data.timeOff} />");
  });

  it("an unlinked event at the same time does NOT get a pass — the pass renders only from the itinerary case", () => {
    // The pass component is referenced exactly twice in the tab:
    // the import and the itinerary case. Event cards never see it.
    expect(scheduleTab.match(/ItineraryEntryPass/g)).toHaveLength(2);
    const eventCase = scheduleTab.slice(
      scheduleTab.indexOf('case "event":'),
      scheduleTab.indexOf('case "ministry":'),
    );
    expect(eventCase).not.toContain("ItineraryEntryPass");
  });

  it("the entry pass itself falls back to the day card when the entry has no time", () => {
    expect(entryPass).toContain("if (!entry.time)");
    expect(entryPass).toContain("return <ItineraryDayCard entry={entry} timeOff={timeOff} />;");
  });

  it("v386: the claimed blocks wear the FLIGHT BOARD — connected panel, flight rows, the now block filled", () => {
    // Was v385: "the claimed blocks wear their pre-v384 dress
    // again — centred face, connected box, heights driving"
    // (the v295/v308 centred face back on both claimed faces,
    // the radius-22 box, hairlines, proportional heights, no
    // pass anywhere). Superseded the same day by the approved
    // flight-board final: the connected panel stands (radius
    // 24, hairlines, one tap target per block), but the face
    // is flight rows in the pass palette — and the lone block
    // delegates to the same group machinery.
    expect(claimedBlock).toContain("<ClaimedRestGroup");
    expect(claimedGroup).toContain("borderRadius: 24");
    expect(claimedGroup).toContain("StyleSheet.hairlineWidth");
    expect(claimedGroup).toContain("whiteBlockContainsNow");
    expect(claimedGroup).toContain("NOW BOARDING");
    // The centred face line and the proportional heights are gone.
    expect(claimedBlock).not.toContain("Time off — {timeOff.title}");
    expect(claimedGroup).not.toContain("Time off — {timeOff.title}");
    expect(claimedGroup).not.toContain("height,");
    expect(claimedBlock).not.toContain("height,");
    // Still no pass anywhere on the claimed faces — the
    // BOARDING PASS print belongs to the entries alone (the
    // hero's NOW BOARDING is a different line entirely).
    expect(claimedBlock).not.toContain("BOARDING PASS");
    expect(claimedGroup).not.toContain("BOARDING PASS");
  });

  it("v386: both schedule call sites hand the group plain blocks + now + next title — and no date (v384's prop is gone)", () => {
    // Was v385: "…hand the group blocks WITH heights" (each
    // block wrapped as { block, height } from
    // whiteBlockHeight(b.durationMinutes, remaining)). The
    // flight rows stand at their own slim register, so the
    // call sites hand the bare blocks, the live nowMinutes
    // (the plane's elapsed spot; the now fill), and the next
    // item's title (the hero's "then …" clause).
    expect(timeBlockCases.match(/<ClaimedRestGroup/g)).toHaveLength(2);
    expect(timeBlockCases).not.toContain("date={selectedDate}");
    expect(timeBlockCases).not.toContain("whiteBlockHeight(b.durationMinutes, remaining)");
    expect(timeBlockCases).toContain("nowMinutes={item.data.nowMinutes ?? null}");
    expect(timeBlockCases).toContain("nextTitle={item.data.nextTitle ?? null}");
    expect(timeBlockCases).toContain("blocks={run}");
  });

  it("the Time Off page's own timeline is untouched — its entries keep their artwork cards there", () => {
    expect(timeOffExperience).toContain("function TimelineEntry");
    expect(timeOffExperience).not.toContain("ItineraryEntryPass");
    // The day card still exists for untimed entries and the
    // pass's fallback.
    expect(timeOffTravel).toContain("export function ItineraryDayCard");
  });

  it("claimed blocks are never completable — no toggle, no completed state", () => {
    // v393 amendment (his ruling, Oct 31: "Make the tickets
    // check off like normal events"): the rule SPLIT — it
    // stands entire for the claimed blocks, and the entry
    // pass left this pin's company. The pass's own toggle
    // pins live in time-off-v393-ticket-checkoff.test.ts.
    for (const region of [claimedBlock, claimedGroup]) {
      expect(region).not.toContain("isCompleted");
      expect(region).not.toContain("onToggle");
      expect(region).not.toContain("check-circle");
    }
  });

  it("the entry pass keeps the day card's behaviour: inert — no press handler of its own", () => {
    // v393 amendment: SUPERSEDED by his Oct 31 ruling — the
    // pass now takes onToggleDone and renders a Pressable
    // when the schedule hands it one (inert only without a
    // handler). The live pins are in
    // time-off-v393-ticket-checkoff.test.ts; this body keeps
    // the one part of the old rule that survives: the pass
    // carries no completed STATE of its own — done lives on
    // the entry record, never in the component.
    expect(entryPass).not.toContain("useState");
    expect(entryPass).not.toContain("isCompleted");
  });
});
