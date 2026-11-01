// ─────────────────────────────────────────────────────────────────────────────
// v396 — RIDE'S GLYPH IS THE FERRIS WHEEL (his correction, Oct 31:
// "when I said 'Ride' I meant amusement park ride." — then, on the
// fix: "Make it").
//
// Ride shipped in v302 as Material's "directions-car" under a
// transport assumption. Ride is an experience-ride — roller coaster,
// ferris wheel, boat — so its glyph is the wheel the Material set
// itself draws for amusement: "attractions". The kind string, the
// label, the cycling word, the colour step, and every stored entry
// are untouched; only the picture (and the form's two transport-
// flavoured Ride examples) change.
//
// Pins:
//  (a) SOURCE — getItineraryKindIcon("ride") is the wheel glyph at
//      the one kind-meta source, and every kind glyph (the wheel
//      included) actually exists in the shipped MaterialIcons font
//      map — no name the font can't draw.
//  (b) CONSUMERS — neither time-off component carries a car (or a
//      hardcoded wheel) anywhere: the chips, the timeline cards, the
//      day cards, and the pass stamp all read the kind's icon from
//      getItineraryKindIcon, so no second car can lurk downstream.
//  (c) TAXONOMY UNTOUCHED — kind list/order, labels, the cycling
//      words, and Ride's indigo colour step are exactly as v302/v386/
//      v392 left them.
//  (d) COPY — the entry form's Ride examples speak experience-ride
//      now; the airport/lobby transport examples are gone.
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
  ITINERARY_KIND_WORDS,
  getItineraryKindIcon,
  getItineraryKindLabel,
  itineraryKindColor,
} from "../time-off";
import { mix } from "../color-themes";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("v396 ride wheel — the source", () => {
  it("ride's icon is the ferris wheel glyph, not the car", () => {
    expect(getItineraryKindIcon("ride")).toBe("attractions");
    expect(getItineraryKindIcon("ride")).not.toBe("directions-car");
  });

  it("every kind glyph exists in the shipped MaterialIcons font map", () => {
    const glyphmap = JSON.parse(
      read("node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialIcons.json"),
    ) as Record<string, number>;
    for (const kind of ITINERARY_KINDS) {
      expect(glyphmap[getItineraryKindIcon(kind)], `glyph for ${kind}`).toBeTypeOf("number");
    }
    // the wheel itself, by name
    expect(glyphmap["attractions"]).toBeTypeOf("number");
  });

  it("the icon map in lib/time-off is the only place the wheel is assigned", () => {
    const lib = read("lib/time-off.ts");
    expect(lib.match(/'attractions'/g) ?? []).toHaveLength(1);
    expect(lib).not.toContain("'directions-car'");
  });
});

describe("v396 ride wheel — consumers read the one source", () => {
  const experience = read("components/time-off-experience.tsx");
  const travel = read("components/time-off-travel.tsx");

  it("no car glyph hides in either time-off component", () => {
    expect(experience).not.toContain("directions-car");
    expect(travel).not.toContain("directions-car");
  });

  it("no consumer hardcodes the wheel either — it flows from the source", () => {
    expect(experience).not.toContain("attractions");
    expect(travel).not.toContain("attractions");
  });

  it("the chips are built from getItineraryKindIcon over the kind list", () => {
    expect(experience).toMatch(/ALL_ITINERARY_KINDS\.map\(\(kind\) => \(\{ kind, label: getItineraryKindLabel\(kind\), icon: getItineraryKindIcon\(kind\) \}\)\)/);
  });

  it("the timeline/day cards take the entry's kind icon from the source", () => {
    expect(experience).toContain("getItineraryKindIcon(entry.kind)");
    expect(travel).toContain("getItineraryKindIcon(entry.kind)");
  });

  it("the pass stamp takes the entry's kind icon from the source", () => {
    expect(travel).toContain("icon={getItineraryKindIcon(entry.kind)}");
  });
});

describe("v396 ride wheel — the taxonomy is untouched", () => {
  it("kind list and order are the settled six", () => {
    expect(ITINERARY_KINDS).toEqual(["travel", "stay", "plan", "food", "ride", "view"]);
  });

  it("the cycling words are his six, Ride among them", () => {
    expect(ITINERARY_KIND_WORDS).toEqual(["Travel", "Stay", "Plan", "Food", "Ride", "View"]);
    expect(getItineraryKindLabel("ride")).toBe("Ride");
  });

  it("ride's colour still steps toward the same indigo anchor (v392)", () => {
    const base = "#EF4444";
    expect(itineraryKindColor("ride", base)).toBe(mix(base, "#5C6BC0", 0.38));
  });

  it("the other five glyphs keep theirs", () => {
    expect(getItineraryKindIcon("travel")).toBe("flight");
    expect(getItineraryKindIcon("stay")).toBe("hotel");
    expect(getItineraryKindIcon("plan")).toBe("place");
    expect(getItineraryKindIcon("food")).toBe("restaurant");
    expect(getItineraryKindIcon("view")).toBe("landscape");
  });
});

describe("v396 ride wheel — the form's Ride examples", () => {
  const experience = read("components/time-off-experience.tsx");

  it("the title example is an experience-ride", () => {
    expect(experience).toContain("e.g., Ferris wheel at the pier");
  });

  it("the detail example is an experience-ride", () => {
    expect(experience).toContain("e.g., Express pass in the app");
  });

  it("the transport examples are gone", () => {
    expect(experience).not.toContain("Ride to the airport");
    expect(experience).not.toContain("Pickup at the lobby");
  });
});
