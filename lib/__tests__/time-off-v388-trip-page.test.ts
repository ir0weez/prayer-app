// ─────────────────────────────────────────────────────────────────────────────
// v388 — THE TIME OFF TRIP PAGE, REBUILT TO THE OCT 27 BLEND (his
// approval, Oct 27: Style 2 Expressive × Style 3 Journey; his flags
// Oct 28 + Oct 31: the shipped page "is NOT the designed timeline
// we agreed one from the mockup").
//
// v314 rebuilt the LIST from the blend drawing but left the trip
// face with a plain title block and the generic keyword-banner
// entry cards. v388 restores the blend on the trip face:
//
//  (a) HERO — a saturated colour field in the trip's own colour:
//      the kind pill, ONE oversized number story (days to go
//      before the trip; the day count while it runs — Day N of M;
//      its length once over), the title and the date range on the
//      field, and the route read standing on the scenic band when
//      the itinerary yields one. The face derives from the trip's
//      colour family (timeOffPassPalette).
//  (b) ENTRIES BY KIND — Travel is a ROUTE CARD (FROM → TO the
//      biggest print over the dotted flight path, read from the
//      entry's own stored fields by itineraryTravelRoute — never
//      an invented city); Stay is a BOOKING BLOCK (check-in /
//      check-out grid — check-out is the next stay's date or the
//      trip's end, derived from stored data only); Plan / Food /
//      Ride / View are chunky cards in the kind's tonal step.
//      NO entry renders the old keyword banner card on this face.
//  (c) FLOWS UNTOUCHED — add/edit/delete, the entry × removal,
//      day heads, and navigation keep their places and behaviour.
//      The day list's own cards are out of scope and stay as-is.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => {}),
    removeItem: vi.fn(async () => {}),
    clear: vi.fn(async () => {}),
  },
}));
import {
  itineraryTravelRoute,
  type ItineraryEntry,
} from "../time-off";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const experience = read("components/time-off-experience.tsx");
const renderTrip = experience.slice(
  experience.indexOf("const renderTrip"),
  experience.indexOf("const renderEntryForm"),
);

const entry = (partial: Partial<ItineraryEntry>): ItineraryEntry => ({
  id: "e1",
  kind: "travel",
  date: "2026-11-20",
  title: "",
  ...partial,
});

describe("v388 itineraryTravelRoute — one entry's route, from its own fields", () => {
  it("the detail's code pair resolves against the address's town and the title's place", () => {
    expect(itineraryTravelRoute(entry({
      title: "Flight to Denver",
      address: "1 World Way, Los Angeles, CA",
      detail: "LAX → DEN · Flight UA 1847",
    }))).toEqual({ from: "Los Angeles", to: "Denver", titleConsumed: true });
  });

  it("codes alone stand as both ends, title unconsumed", () => {
    expect(itineraryTravelRoute(entry({
      title: "Flight UA 1847",
      detail: "LAX → DEN",
    }))).toEqual({ from: "LAX", to: "DEN", titleConsumed: false });
  });

  it("a 'Flight to …' title alone gives the destination, no invented origin", () => {
    expect(itineraryTravelRoute(entry({ title: "Flight to Denver" })))
      .toEqual({ from: null, to: "Denver", titleConsumed: true });
  });

  it("a 'Drive to …' title reads the same way", () => {
    expect(itineraryTravelRoute(entry({ title: "Drive to Moab" })))
      .toEqual({ from: null, to: "Moab", titleConsumed: true });
  });

  it("an entry storing no route yields null — the card prints what exists", () => {
    expect(itineraryTravelRoute(entry({ title: "Window seats together" }))).toBeNull();
    expect(itineraryTravelRoute(entry({ title: "" }))).toBeNull();
  });

  it("non-travel kinds never yield a route", () => {
    expect(itineraryTravelRoute(entry({ kind: "food", title: "Flight to Denver", detail: "LAX → DEN" }))).toBeNull();
    expect(itineraryTravelRoute(entry({ kind: "stay", title: "Check in — Canyon Inn" }))).toBeNull();
  });
});

describe("v388 trip hero — the blend's colour field (source pins)", () => {
  it("the face derives from the trip's own colour family", () => {
    expect(renderTrip).toContain("timeOffPassPalette(activeTrip, colors.surface)");
  });

  it("the header is a saturated field in the trip's colour, asymmetric like the list hero", () => {
    expect(renderTrip).toContain("backgroundColor: base, borderTopLeftRadius: 36, borderTopRightRadius: 36, borderBottomRightRadius: 36, borderBottomLeftRadius: 14");
    expect(renderTrip).toContain("getTimeOffLabel(activeTrip.type).toUpperCase()");
    expect(renderTrip).toContain("fmtRange(activeTrip)");
  });

  it("ONE oversized number story: days to go / the day count / the length", () => {
    expect(renderTrip).toContain("fontSize: 96");
    expect(renderTrip).toContain("const big = until > 0 ? until : dayNum ? dayNum.day : duration;");
    expect(renderTrip).toContain("days\\nto go");
    expect(renderTrip).toContain("of ${dayNum.total}\\ndays");
    // The v314 sub-line state read is gone — no second count rides the face.
    expect(renderTrip).not.toContain("stateRead");
  });

  it("the route read stands on the hero when the itinerary yields one", () => {
    expect(renderTrip).toContain("deriveRouteRead(activeTrip)");
  });

  it("the day heads keep the blend skeleton — 44/900 numeral, weekday, month, rule", () => {
    expect(renderTrip).toContain("fontSize: 44, fontWeight: \"900\"");
  });
});

describe("v388 entries dressed by kind (source pins)", () => {
  const timeline = experience.slice(experience.indexOf("function TimelineEntry"));

  it("TimelineEntry dispatches by kind to the three dressed forms", () => {
    expect(timeline).toContain("function TravelRouteCard");
    expect(timeline).toContain("function StayBookingBlock");
    expect(timeline).toContain("function ChunkyEntryCard");
    expect(timeline).toContain("entry.kind === \"travel\"");
    expect(timeline).toContain("entry.kind === \"stay\"");
  });

  it("Travel is a route card: the palette paper, FROM → TO, the dotted flight path", () => {
    const card = timeline.slice(timeline.indexOf("function TravelRouteCard"), timeline.indexOf("function StayBookingBlock"));
    expect(card).toContain("itineraryTravelRoute(entry)");
    expect(card).toContain("palette.paper");
    expect(card).toContain(">FROM</Text>");
    expect(card).toContain(">TO</Text>");
    expect(card).toContain("borderStyle: \"dotted\"");
    expect(card).toContain("palette.print");
  });

  it("Stay is a booking block: check-in / check-out grid on the palette", () => {
    const block = timeline.slice(timeline.indexOf("function StayBookingBlock"), timeline.indexOf("function ChunkyEntryCard"));
    expect(block).toContain(">CHECK-IN</Text>");
    expect(block).toContain(">CHECK-OUT</Text>");
    expect(block).toContain("fmtDay(checkoutDate)");
    expect(block).toContain("palette.stub");
  });

  it("a stay's check-out derives from stored data only — next stay, else the trip's end", () => {
    expect(renderTrip).toContain("nextStay?.date ?? activeTrip.endDate");
    expect(renderTrip).toContain("checkoutDate={checkoutFor(entry)}");
  });

  it("Plan / Food / Ride / View are chunky cards in the kind's tonal step", () => {
    const card = timeline.slice(timeline.indexOf("function ChunkyEntryCard"));
    expect(card).toContain("mix(colors.surface, kindColor, 0.13)");
    expect(card).toContain("tileBg={kindColor}");
  });

  it("NO entry renders the old banner card on this face", () => {
    expect(experience).not.toContain("KeywordAmbientAnimation");
    expect(experience).not.toContain("<View style={{ height: 96 }}>");
  });

  it("the kind identity still resolves the v302 way inside TimelineEntry", () => {
    expect(timeline).toContain("itineraryKindColor(entry.kind, base)");
    expect(timeline).toContain("getItineraryKindIcon(entry.kind)");
    expect(timeline).toContain("getItineraryKindLabel(entry.kind).toUpperCase()");
    expect(timeline).toContain("const detailLine = itineraryDetailLine(entry);");
  });
});

describe("v388 flows untouched (source pins)", () => {
  it("add / edit / delete keep their places and handlers", () => {
    expect(experience).toContain("Add to the timeline");
    expect(experience).toContain("onPress={() => openBook(activeTrip)}");
    expect(experience).toContain("onPress={() => handleDeleteTrip(activeTrip)}");
    expect(experience).toContain("handleDeleteEntry(entry)");
    expect(experience).toContain("handleSaveEntry");
  });

  it("every entry keeps its × removal with the same spoken label", () => {
    expect(experience).toContain("accessibilityLabel={`Remove ${title}`}");
    expect(experience).toContain("onDelete={() => handleDeleteEntry(entry)}");
  });

  it("the add row keeps the model's chips — one source, not a fork", () => {
    expect(experience).toContain("ITINERARY_KINDS as ALL_ITINERARY_KINDS");
  });
});
