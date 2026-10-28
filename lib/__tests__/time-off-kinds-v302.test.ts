// ─────────────────────────────────────────────────────────────────────────────
// v302 — TIME OFF TIMELINE: FOOD, RIDE, VIEW (his ask, Oct 28 09:02:
// "Food should be an option here. As well as rides/views. Done
// beautifully please.").
//
// Pins:
//  (a) MODEL — the kind union is six wide; the ordered kind list, the
//      labels, and the icons come from lib/time-off (one source); each
//      kind has its OWN icon; the three original kinds keep theirs.
//  (b) COLOUR — a kind's colour is a tonal step of the TRIP's colour:
//      travel keeps the trip colour verbatim (as before); the other
//      five step away from it, are pairwise distinct, and MOVE when
//      the trip colour moves (derived, never pinned).
//  (c) BACKWARD COMPAT — stored trips mixing old and new kinds project,
//      group, and sort exactly like before; the route read ignores the
//      new kinds and never crashes on them; a createTimeOff round-trip
//      stores the new kinds untouched.
//  (d) SURFACES (source pins) — the chips in BOTH the add row and the
//      entry form are built from the model's kind list and dressed by
//      itineraryKindColor; the timeline entry carries the kind's icon
//      tile + label in its colour; the schedule-day card carries the
//      kind's icon in its head band and body and stays un-completable.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const store = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => { store.set(k, v); }),
    removeItem: vi.fn(async (k: string) => { store.delete(k); }),
    clear: vi.fn(async () => { store.clear(); }),
  },
}));
import {
  ITINERARY_KINDS,
  createTimeOff,
  deriveRouteRead,
  getItineraryForDate,
  getItineraryKindIcon,
  getItineraryKindLabel,
  groupItineraryByDate,
  itineraryKindColor,
  sortItinerary,
  type ItineraryKind,
  type TimeOff,
} from "../time-off";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("v302 itinerary kinds — model", () => {
  it("the kind list is six wide, originals first, new kinds in his order", () => {
    expect(ITINERARY_KINDS).toEqual(["travel", "stay", "plan", "food", "ride", "view"]);
  });

  it("labels match his words for the new kinds and keep the originals", () => {
    expect(getItineraryKindLabel("food")).toBe("Food");
    expect(getItineraryKindLabel("ride")).toBe("Ride");
    expect(getItineraryKindLabel("view")).toBe("View");
    expect(getItineraryKindLabel("travel")).toBe("Travel");
    expect(getItineraryKindLabel("stay")).toBe("Stay");
    expect(getItineraryKindLabel("plan")).toBe("Plan");
  });

  it("every kind has its own Material icon; the originals keep theirs", () => {
    expect(getItineraryKindIcon("food")).toBe("restaurant");
    expect(getItineraryKindIcon("ride")).toBe("directions-car");
    expect(getItineraryKindIcon("view")).toBe("landscape");
    expect(getItineraryKindIcon("travel")).toBe("flight");
    expect(getItineraryKindIcon("stay")).toBe("hotel");
    expect(getItineraryKindIcon("plan")).toBe("place");
    const icons = ITINERARY_KINDS.map((k) => getItineraryKindIcon(k));
    expect(new Set(icons).size).toBe(6);
  });
});

describe("v302 itinerary kinds — colour is a step of the trip's colour", () => {
  const base = "#3B82F6";

  it("travel keeps the trip colour verbatim, as before", () => {
    expect(itineraryKindColor("travel", base)).toBe(base);
  });

  it("the other five step away from the trip colour and from each other", () => {
    const stepped = (["stay", "plan", "food", "ride", "view"] as ItineraryKind[]).map((k) => itineraryKindColor(k, base));
    for (const c of stepped) {
      expect(c).not.toBe(base);
      expect(c).toMatch(/^#[0-9A-F]{6}$/);
    }
    expect(new Set(stepped).size).toBe(5);
  });

  it("the step is derived — a different trip colour moves every kind", () => {
    for (const k of ITINERARY_KINDS) {
      expect(itineraryKindColor(k, "#E65100")).not.toBe(itineraryKindColor(k, base));
    }
    expect(itineraryKindColor("travel", "#E65100")).toBe("#E65100");
  });
});

describe("v302 itinerary kinds — backward compatibility", () => {
  const trip: TimeOff = {
    id: "trip-302",
    title: "Family trip",
    type: "vacation",
    startDate: "2026-11-20",
    endDate: "2026-11-29",
    color: "#3B82F6",
    createdAt: "2026-10-28T00:00:00.000Z",
    updatedAt: "2026-10-28T00:00:00.000Z",
    itinerary: [
      { id: "e1", kind: "travel", date: "2026-11-20", time: "06:40", title: "Flight to Denver", detail: "LAX → DEN" },
      { id: "e2", kind: "food", date: "2026-11-20", time: "19:00", title: "Dinner at Carmine's", detail: "Reservation for 4" },
      { id: "e3", kind: "ride", date: "2026-11-21", time: "08:15", title: "Ride to the trailhead" },
      { id: "e4", kind: "view", date: "2026-11-21", time: "17:30", title: "Sunset over the canyon" },
      { id: "e5", kind: "stay", date: "2026-11-20", time: "15:00", title: "Check in — Canyon Inn", address: "412 Mesa Rd, Moab, UT" },
      { id: "e6", kind: "plan", date: "2026-11-22", title: "Arches at sunrise" },
    ],
  };

  it("new kinds project onto their dates alongside the old", () => {
    expect(getItineraryForDate(trip, "2026-11-20").map((e) => e.id)).toEqual(["e1", "e5", "e2"]);
    expect(getItineraryForDate(trip, "2026-11-21").map((e) => e.id)).toEqual(["e3", "e4"]);
    expect(getItineraryForDate(trip, "2026-11-22").map((e) => e.id)).toEqual(["e6"]);
  });

  it("grouping and sorting treat all six kinds the same", () => {
    const groups = groupItineraryByDate(trip);
    expect(groups.map((g) => g.date)).toEqual(["2026-11-20", "2026-11-21", "2026-11-22"]);
    expect(sortItinerary(trip.itinerary ?? []).map((e) => e.id)).toEqual(["e1", "e5", "e2", "e3", "e4", "e6"]);
  });

  it("the route read still reads travel/stay and ignores the new kinds", () => {
    expect(deriveRouteRead(trip)).toBe("LAX → Denver → Moab");
    const foodOnly: TimeOff = { ...trip, itinerary: trip.itinerary?.filter((e) => e.kind === "food" || e.kind === "ride" || e.kind === "view") };
    expect(deriveRouteRead(foodOnly)).toBeNull();
  });

  it("createTimeOff round-trips the new kinds untouched", async () => {
    store.clear();
    const made = await createTimeOff("Y", "vacation", "2026-12-01", "2026-12-03", undefined, "#3B82F6", {
      itinerary: [
        { id: "n1", kind: "food", date: "2026-12-01", title: "Dinner" },
        { id: "n2", kind: "ride", date: "2026-12-02", title: "Ride back" },
        { id: "n3", kind: "view", date: "2026-12-02", title: "Overlook" },
      ],
    });
    expect(made.itinerary?.map((e) => e.kind)).toEqual(["food", "ride", "view"]);
  });
});

describe("v302 itinerary kinds — surfaces (source pins)", () => {
  const experience = read("components/time-off-experience.tsx");
  const travel = read("components/time-off-travel.tsx");

  it("the experience builds its chips from the model's kind list", () => {
    expect(experience).toMatch(/ITINERARY_KINDS as ALL_ITINERARY_KINDS/);
    expect(experience).toMatch(/getItineraryKindLabel\(kind\)/);
    expect(experience).toMatch(/getItineraryKindIcon\(kind\)/);
  });

  it("both chip rows dress each chip in its kind colour and can wrap", () => {
    const chipRows = experience.match(/itineraryKindColor\(kind, (base|colors\.primary)\)/g) ?? [];
    expect(chipRows).toHaveLength(2); // the trip's add row + the entry form
    expect(experience).toMatch(/flexWrap: "wrap"/);
  });

  it("the timeline entry carries the kind's icon tile and label in its colour", () => {
    const entry = experience.slice(experience.indexOf("function TimelineEntry"));
    expect(entry).toMatch(/itineraryKindColor\(entry\.kind, base\)/);
    expect(entry).toMatch(/getItineraryKindIcon\(entry\.kind\)/);
    expect(entry).toMatch(/getItineraryKindLabel\(entry\.kind\)\.toUpperCase\(\)/);
  });

  it("the day card carries the kind's icon in its head band and body, in its colour", () => {
    const card = travel.slice(travel.indexOf("export function ItineraryDayCard"), travel.indexOf("export function ClaimedRestBlock"));
    expect(card).toMatch(/getItineraryKindIcon\(entry\.kind\)/);
    expect(card).toMatch(/itineraryKindColor\(entry\.kind, base\)/);
    expect(card).toMatch(/name=\{kindIcon as any\}/);
    expect(card).toMatch(/getItineraryKindLabel\(entry\.kind\)\.toUpperCase\(\)/);
  });

  it("the day card stays un-completable for every kind", () => {
    const card = travel.slice(travel.indexOf("export function ItineraryDayCard"), travel.indexOf("export function ClaimedRestBlock"));
    expect(card).not.toMatch(/onToggle|toggle|isCompleted|onPress/);
  });
});
