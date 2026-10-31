// ─────────────────────────────────────────────────────────────────────────────
// v392 — the entry pass is dyed by the entry's KIND (his words,
// Oct 31: "I just want the event tickets in the schedule to
// match the color of the type (or kind) that was selected in
// the time off timeline editor"). Through v385–v391 the pass on
// a placed itinerary entry derived its whole palette from the
// parent TRIP's stored colour, so a Food entry and a Plan entry
// on one trip wore one colour. Now the pass's base is the
// kind's own set colour — itineraryKindColor(kind, tripBase),
// the very step the editor's Add-to-the-timeline chips fill
// with and the trip page's entry cards wear (v302) — run
// through the SAME pass derivation (timeOffPassPaletteFromBase,
// lifted out of timeOffPassPalette unchanged), so the pass
// keeps its shape, fields, stamp and perforation; only the
// colour's source moves. (v393 note, Oct 31: the "inert tap
// behaviour" this head described at writing is superseded by
// his ticket-checkoff ruling — the pass takes a toggle now.
// The colour pins below are untouched by that change.)
//
// Scope, pinned below: the claimed FLIGHT BOARD (connected
// panels, rows, NOW hero, v389 word animation) keeps the trip
// colour exactly as shipped — ClaimedRestGroup still resolves
// timeOffPassPalette(timeOff, …) — and the trip page (v388)
// already wears kind colours and does not change. A kind with
// no set colour (outside ITINERARY_KINDS) falls back to the
// trip-colour palette, exactly the pre-v392 resolution.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  ITINERARY_KINDS,
  itineraryKindColor,
  timeOffEntryPassPalette,
  timeOffPassPalette,
  timeOffPassPaletteFromBase,
  type ItineraryEntry,
  type ItineraryKind,
  type TimeOff,
} from "../time-off";
import { hexContrast } from "../skin-themes";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const timeOffTravel = read("components/time-off-travel.tsx");
const entryPass = timeOffTravel.slice(timeOffTravel.indexOf("export function ItineraryEntryPass"));
const claimedGroup = timeOffTravel.slice(
  timeOffTravel.indexOf("export function ClaimedRestGroup"),
  timeOffTravel.indexOf("\n/**\n * v385 — one itinerary entry"),
);

const LIGHT = "#FFFFFF";
const DARK = "#14141A";

// A saturated stored colour: tripBaseColor returns it unchanged
// (its deepening only touches pastels), so the base the chips
// step from IS the stored colour here.
const TRIP_COLOR = "#7B1FA2";
const trip = (over: Partial<TimeOff> = {}): Pick<TimeOff, "color" | "type"> => ({
  type: "vacation",
  color: TRIP_COLOR,
  ...over,
});
const entry = (kind: ItineraryKind): Pick<ItineraryEntry, "kind"> => ({ kind });

describe("v392 entry pass palette — the KIND's set colour, the pass derivation", () => {
  it("a Food entry's pass derives from the Food set colour — not the trip's", () => {
    const pal = timeOffEntryPassPalette(entry("food"), trip(), TRIP_COLOR, LIGHT);
    expect(pal).toEqual(timeOffPassPaletteFromBase(itineraryKindColor("food", TRIP_COLOR), LIGHT));
    // The Food step leaves the trip colour, so the families differ.
    expect(itineraryKindColor("food", TRIP_COLOR)).not.toBe(TRIP_COLOR);
    expect(pal.band).not.toBe(timeOffPassPalette(trip(), LIGHT).band);
    expect(pal.paper).not.toBe(timeOffPassPalette(trip(), LIGHT).paper);
  });

  it("a Plan entry's pass derives from the Plan set colour", () => {
    const pal = timeOffEntryPassPalette(entry("plan"), trip(), TRIP_COLOR, LIGHT);
    expect(pal).toEqual(timeOffPassPaletteFromBase(itineraryKindColor("plan", TRIP_COLOR), LIGHT));
    expect(pal.band).not.toBe(timeOffPassPalette(trip(), LIGHT).band);
  });

  it("two entries of different kinds on ONE trip render in their own colours", () => {
    const food = timeOffEntryPassPalette(entry("food"), trip(), TRIP_COLOR, LIGHT);
    const plan = timeOffEntryPassPalette(entry("plan"), trip(), TRIP_COLOR, LIGHT);
    const stay = timeOffEntryPassPalette(entry("stay"), trip(), TRIP_COLOR, LIGHT);
    expect(food.paper).not.toBe(plan.paper);
    expect(food.band).not.toBe(plan.band);
    expect(food.band).not.toBe(stay.band);
    expect(plan.band).not.toBe(stay.band);
    for (const kind of ITINERARY_KINDS) {
      expect(timeOffEntryPassPalette(entry(kind), trip(), TRIP_COLOR, LIGHT)).toEqual(
        timeOffPassPaletteFromBase(itineraryKindColor(kind, TRIP_COLOR), LIGHT),
      );
    }
  });

  it("Travel's set colour IS the trip base — its pass derives from the base itself", () => {
    expect(itineraryKindColor("travel", TRIP_COLOR)).toBe(TRIP_COLOR);
    expect(timeOffEntryPassPalette(entry("travel"), trip(), TRIP_COLOR, LIGHT)).toEqual(
      timeOffPassPaletteFromBase(TRIP_COLOR, LIGHT),
    );
  });

  it("a kind with no set colour falls back to the trip-colour palette, exactly as before", () => {
    const bogus = { kind: "bogus" } as unknown as Pick<ItineraryEntry, "kind">;
    expect(timeOffEntryPassPalette(bogus, trip(), TRIP_COLOR, LIGHT)).toEqual(
      timeOffPassPalette(trip(), LIGHT),
    );
    expect(timeOffEntryPassPalette(bogus, trip(), TRIP_COLOR, DARK)).toEqual(
      timeOffPassPalette(trip(), DARK),
    );
  });

  it("the kind families keep the pass's contrast walks — print on paper, white on band, both schemes", () => {
    for (const surface of [LIGHT, DARK]) {
      for (const kind of ITINERARY_KINDS) {
        const pal = timeOffEntryPassPalette(entry(kind), trip(), TRIP_COLOR, surface);
        expect(hexContrast(pal.print, pal.paper)).toBeGreaterThanOrEqual(4.5);
        expect(hexContrast(pal.ink, pal.paper)).toBeGreaterThanOrEqual(4.5);
        expect(hexContrast("#FFFFFF", pal.band)).toBeGreaterThanOrEqual(3.2);
      }
    }
  });

  it("the trip path is untouched — timeOffPassPalette still derives from the record's colour", () => {
    expect(timeOffPassPalette(trip(), LIGHT)).toEqual(timeOffPassPaletteFromBase(TRIP_COLOR, LIGHT));
    expect(timeOffPassPalette(trip({ color: "#0288D1" }), DARK)).toEqual(
      timeOffPassPaletteFromBase("#0288D1", DARK),
    );
  });
});

describe("v392 wiring — only the entry pass changes source", () => {
  it("the entry pass resolves through the kind resolver, off the chips' own base", () => {
    expect(entryPass).toContain(
      "timeOffEntryPassPalette(entry, timeOff, tripBaseColor(timeOff), colors.surface)",
    );
    expect(entryPass).not.toContain("timeOffPassPalette(timeOff, colors.surface)");
  });

  it("the claimed flight board keeps the trip colour exactly as shipped", () => {
    expect(claimedGroup).toContain("timeOffPassPalette(timeOff, colors.surface)");
    expect(claimedGroup).not.toContain("timeOffEntryPassPalette");
  });

  it("the pass itself is otherwise the v385 pass — band, fields, stamp, perforation", () => {
    // v393 amendment: the "inert" tail of this pin's name is
    // superseded by his Oct 31 ruling ("Make the tickets
    // check off like normal events") — the pass now renders
    // a Pressable when handed onToggleDone. Its DRESS is
    // what this pin guards, and the dress is unchanged.
    expect(entryPass).toContain("BOARDING PASS");
    expect(entryPass).toContain("icon={getItineraryKindIcon(entry.kind)}");
    expect(entryPass).toContain("right: PASS_STUB_WIDTH - 8");
  });
});
