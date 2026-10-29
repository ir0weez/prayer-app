// ─────────────────────────────────────────────────────────────────────────────
// v331 — The Road (era badges), Era Part 2's first piece. Pins.
//
// Jonathan decided the set 2026-10-28 22:47 ("Sure do it"): twelve
// cut-paper medallions, one per era, in Collections as "The Road" —
// a NEW set; the Boss Badges (lib/badges.ts) belong to the fasting
// tracker and are untouched. His rules, as built:
//
//   - UNLOCK the first time an era is FINISHED LIVING: when the live
//     derivation (v323's twelfths over getCurrentFastDay) shows the
//     NEXT era entered — the New Earth earns when the fast has ended
//     (the app's own ended rule, getFastEndDate < today). Settled on
//     open from stored state; no timers.
//   - BACKFILL FROM THE DERIVATION, never a seen flag: at his real
//     standing (day ~302 of 365, in the Tribulation) the nine eras
//     behind him stand earned on first open.
//   - PRESTIGE GILDING: completions per era persist across Begin
//     Again; a completion counts exactly once per fast cycle (keyed
//     by fast id + startDate, progress mark kept per cycle), however
//     many times the app reopens.
//
// Contracts pinned here:
//  (a) DERIVATION → EARNED at boundary days of a 365: Village standing
//      earns none; day 301/302 standing earns nine; the Millennium's
//      turning (306) earns the Tribulation; the last day still leaves
//      the New Earth unearned (he is living it); the day the fast
//      has ended, all twelve stand earned.
//  (b) IDEMPOTENCE — repeated reconciles change nothing and never
//      re-increment; the storage shape parses strictly and round-
//      trips.
//  (c) SECOND CYCLES — a new fast completing the Village takes its
//      completions to exactly 2, once; flipping back to the first
//      cycle recounts nothing.
//  (d) THE SEATS — roadSeats stands twelve in era order with whole-
//      word names, earned/outline states and gild marks; the art
//      table covers all twelve eras with distinct glyphs.
//  (e) WIRING — Collections carries The Road as its own section, the
//      page-turn card gains its one quiet line, Hometown settles the
//      badges on open, and the Boss Badges files carry no trace of
//      this set.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ERA_DEFS } from "../hometown-eras";
import {
  ERA_BADGE_ART,
  ROAD_STORAGE_KEY,
  emptyRoadState,
  erasFullyLivedThrough,
  gildMarksFor,
  parseRoadState,
  reconcileRoadBadges,
  roadCycleKey,
  roadEarnedCount,
  roadSeats,
  type RoadState,
} from "../hometown-road";
import {
  getFastCalendarDays,
  getFastEndDate,
  type PersonalFast,
} from "../prayercircle-fasting";

const ROOT = join(__dirname, "..", "..");
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function fast(over: Partial<PersonalFast> = {}): PersonalFast {
  return {
    id: "fast-road",
    name: "365-Day Growth Fast",
    startDate: "2026-01-01",
    durationDays: 365,
    type: "Growth",
    focusItems: [],
    dayStatuses: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

/** The ISO date of a 1-based fast day, off the calendar itself. */
function dateOfDay(f: PersonalFast, day: number): string {
  return getFastCalendarDays(f)[day - 1];
}

/** The ISO date one day after a given ISO date. */
function dayAfter(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split("T")[0];
}

function earnedIds(state: RoadState): string[] {
  return ERA_DEFS.filter((e) => state.eras[e.id]).map((e) => e.id);
}

describe("v331 (a) — derivation → earned at the boundary days", () => {
  const f = fast();

  it("the Village's own standing earns nothing yet", () => {
    expect(erasFullyLivedThrough(f, dateOfDay(f, 1))).toBe(-1);
    expect(erasFullyLivedThrough(f, dateOfDay(f, 31))).toBe(-1);
    const r = reconcileRoadBadges(emptyRoadState(), f, dateOfDay(f, 20));
    expect(r.changed).toBe(false);
    expect(roadEarnedCount(r.state)).toBe(0);
  });

  it("his standing (day 301–302, in the Tribulation) earns the nine behind him", () => {
    for (const day of [301, 302, 305]) {
      expect(erasFullyLivedThrough(f, dateOfDay(f, day))).toBe(8);
      const r = reconcileRoadBadges(emptyRoadState(), f, dateOfDay(f, day));
      expect(earnedIds(r.state)).toEqual([
        "village", "flood", "babel", "israel", "saul", "david",
        "ministry", "nero", "church-ages",
      ]);
      expect(r.state.eras["tribulation"]).toBeUndefined();
      expect(r.newlyEarned).toHaveLength(9);
      for (const id of earnedIds(r.state)) {
        expect(r.state.eras[id as keyof typeof r.state.eras]?.completions).toBe(1);
        expect(r.state.eras[id as keyof typeof r.state.eras]?.firstEarnedAt).toBe(dateOfDay(f, day));
      }
    }
  });

  it("the Millennium's turning (day 306) earns the Tribulation", () => {
    const at301 = reconcileRoadBadges(emptyRoadState(), f, dateOfDay(f, 301)).state;
    const r = reconcileRoadBadges(at301, f, dateOfDay(f, 306));
    expect(r.newlyEarned).toEqual(["tribulation"]);
    expect(roadEarnedCount(r.state)).toBe(10);
    expect(r.state.eras["millennium"]).toBeUndefined();
  });

  it("the last day still leaves the New Earth unearned — he is living it", () => {
    expect(erasFullyLivedThrough(f, dateOfDay(f, 336))).toBe(10); // New Earth standing: Millennium earned
    expect(erasFullyLivedThrough(f, dateOfDay(f, 365))).toBe(10);
    const r = reconcileRoadBadges(emptyRoadState(), f, dateOfDay(f, 365));
    expect(roadEarnedCount(r.state)).toBe(11);
    expect(r.state.eras["new-earth"]).toBeUndefined();
  });

  it("once the fast has ended, all twelve stand earned", () => {
    const after = dayAfter(getFastEndDate(f));
    expect(erasFullyLivedThrough(f, after)).toBe(11);
    const r = reconcileRoadBadges(emptyRoadState(), f, after);
    expect(roadEarnedCount(r.state)).toBe(12);
    expect(r.state.eras["new-earth"]?.completions).toBe(1);
  });

  it("no era, no badges: short fasts and un-started fasts earn nothing", () => {
    const short = fast({ id: "fast-short", durationDays: 40 });
    expect(erasFullyLivedThrough(short, dateOfDay(short, 40))).toBe(-1);
    expect(reconcileRoadBadges(emptyRoadState(), short, dateOfDay(short, 40)).changed).toBe(false);
    expect(erasFullyLivedThrough(f, "2025-12-31")).toBe(-1); // before the start
    expect(erasFullyLivedThrough(null, dateOfDay(f, 301))).toBe(-1);
  });

  it("a 90-day fast walks the same road in miniature", () => {
    const f90 = fast({ id: "fast-90", durationDays: 90 });
    // day 8 of 90: floor(7/90 × 12) = 0 → Village standing, nothing earned
    expect(erasFullyLivedThrough(f90, dateOfDay(f90, 8))).toBe(-1);
    // day 9 of 90: floor(8/90 × 12) = 1 → the Flood stands; the Village is lived
    expect(erasFullyLivedThrough(f90, dateOfDay(f90, 9))).toBe(0);
    const r = reconcileRoadBadges(emptyRoadState(), f90, dateOfDay(f90, 9));
    expect(earnedIds(r.state)).toEqual(["village"]);
  });
});

describe("v331 (b) — backfill idempotence and the storage shape", () => {
  const f = fast();

  it("repeated opens never re-increment a completion", () => {
    const first = reconcileRoadBadges(emptyRoadState(), f, dateOfDay(f, 302));
    expect(first.changed).toBe(true);
    let state = first.state;
    for (let i = 0; i < 5; i += 1) {
      const again = reconcileRoadBadges(state, f, dateOfDay(f, 302));
      expect(again.changed).toBe(false);
      expect(again.newlyEarned).toEqual([]);
      state = again.state;
    }
    expect(state.eras["village"]?.completions).toBe(1);
    // …and standing still later the same cycle changes nothing either
    const later = reconcileRoadBadges(state, f, dateOfDay(f, 304));
    expect(later.changed).toBe(false);
  });

  it("the storage key is the versioned road key", () => {
    expect(ROAD_STORAGE_KEY).toBe("prayercircle.hometown.road.v1");
  });

  it("parseRoadState keeps honest records and drops junk", () => {
    const parsed = parseRoadState({
      eras: {
        village: { firstEarnedAt: "2026-02-01", completions: 2 },
        flood: { firstEarnedAt: "2026-03-01", completions: 0 }, // impossible — dropped
        babel: { firstEarnedAt: 42, completions: 1 }, // malformed — dropped
        "not-an-era": { firstEarnedAt: "2026-01-01", completions: 1 }, // unknown — dropped
      },
      cycles: { "a|2026-01-01": 8, "b|2026-06-01": 99, "c|2026-01-01": 1.5 },
    });
    expect(parsed.eras).toEqual({ village: { firstEarnedAt: "2026-02-01", completions: 2 } });
    expect(parsed.cycles).toEqual({ "a|2026-01-01": 8 });
    expect(parseRoadState(null)).toEqual(emptyRoadState());
    expect(parseRoadState("junk")).toEqual(emptyRoadState());
    // round-trip: a reconciled state survives serialize → parse intact
    const settled = reconcileRoadBadges(emptyRoadState(), f, dateOfDay(f, 302)).state;
    expect(parseRoadState(JSON.parse(JSON.stringify(settled)))).toEqual(settled);
  });
});

describe("v331 (c) — the second walk gilds, exactly once", () => {
  const a = fast({ id: "fast-a", startDate: "2026-01-01", durationDays: 90 });
  const b = fast({ id: "fast-b", startDate: "2026-06-01", durationDays: 90 });

  it("cycle keys are the fast's id + startDate", () => {
    expect(roadCycleKey(a)).toBe("fast-a|2026-01-01");
    expect(roadCycleKey(b)).toBe("fast-b|2026-06-01");
  });

  it("a new fast completing the Village takes its completions to 2 — once", () => {
    // Cycle A lives the Village (day 9 of 90 stands in the Flood).
    let state = reconcileRoadBadges(emptyRoadState(), a, dateOfDay(a, 9)).state;
    expect(state.eras["village"]?.completions).toBe(1);
    const firstEarnedAt = state.eras["village"]?.firstEarnedAt;

    // Cycle B lives the Village on its own road.
    const rb = reconcileRoadBadges(state, b, dateOfDay(b, 9));
    expect(rb.state.eras["village"]?.completions).toBe(2);
    expect(rb.state.eras["village"]?.firstEarnedAt).toBe(firstEarnedAt); // the FIRST earning stands
    expect(rb.newlyEarned).toEqual([]); // a re-walk is a gilding, not a new badge
    state = rb.state;

    // Reopening under B counts nothing more…
    expect(reconcileRoadBadges(state, b, dateOfDay(b, 12)).changed).toBe(false);
    // …and flipping back to A recounts nothing either (its mark is kept).
    expect(reconcileRoadBadges(state, a, dateOfDay(a, 12)).changed).toBe(false);
    expect(state.eras["village"]?.completions).toBe(2);

    // B walks on into the Babel: the Flood earns its first completion.
    const rb2 = reconcileRoadBadges(state, b, dateOfDay(b, 17));
    expect(rb2.newlyEarned).toEqual(["flood"]);
    expect(rb2.state.eras["flood"]?.completions).toBe(1);
    expect(rb2.state.eras["village"]?.completions).toBe(2);
  });

  it("gild marks: one per re-walk, drawn capped at three", () => {
    expect(gildMarksFor(1)).toBe(0);
    expect(gildMarksFor(2)).toBe(1);
    expect(gildMarksFor(3)).toBe(2);
    expect(gildMarksFor(4)).toBe(3);
    expect(gildMarksFor(9)).toBe(3);
  });
});

describe("v331 (d) — the seats Collections draws", () => {
  it("twelve seats in era order, whole-word names, earned and outline apart", () => {
    const f = fast();
    const state = reconcileRoadBadges(emptyRoadState(), f, dateOfDay(f, 302)).state;
    const seats = roadSeats(state);
    expect(seats).toHaveLength(12);
    expect(seats.map((s) => s.era.name)).toEqual([
      "Village", "Flood", "Babel", "Israel", "Saul", "David", "Ministry",
      "Nero", "Church Ages", "Tribulation", "Millennium", "New Earth",
    ]);
    expect(seats.map((s) => s.earned)).toEqual([
      true, true, true, true, true, true, true, true, true, false, false, false,
    ]);
    expect(seats[9].era.name).toBe("Tribulation"); // his current era: ahead of him as a badge
    expect(seats.every((s) => s.gildMarks === 0)).toBe(true);
  });

  it("a gilded seat carries its marks and its count", () => {
    const state = emptyRoadState();
    state.eras["david"] = { firstEarnedAt: "2026-06-01", completions: 3 };
    const seat = roadSeats(state)[5];
    expect(seat.era.id).toBe("david");
    expect(seat.earned).toBe(true);
    expect(seat.gildMarks).toBe(2);
    expect(seat.record?.completions).toBe(3);
  });

  it("the art table covers all twelve eras, each with its own glyph and paper", () => {
    const glyphs = new Set<string>();
    for (const def of ERA_DEFS) {
      const art = ERA_BADGE_ART[def.id];
      expect(art, def.id).toBeDefined();
      glyphs.add(art.glyph);
      for (const color of [art.ring, art.disc, art.ink, art.accent]) {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    }
    expect(glyphs.size).toBe(12);
    // Saul and David share the crown family, told apart by their paper:
    expect(ERA_BADGE_ART["saul"].ring).not.toBe(ERA_BADGE_ART["david"].ring);
    expect(ERA_BADGE_ART["saul"].ink).not.toBe(ERA_BADGE_ART["david"].ink);
  });
});

describe("v331 (e) — wiring, and the Boss Badges stand apart", () => {
  it("Collections carries The Road as its own section", () => {
    const book = read("components/collections-book.tsx");
    expect(book).toContain("RoadBadgesSection");
    expect(book).toContain("The Road");
    // …and it is not folded into the collection sets' rewards:
    expect(read("lib/collections.ts")).not.toContain("hometown-road");
  });

  it("Hometown settles the badges on open; the turn card names a finished era's badge", () => {
    const town = read("app/hometown.tsx");
    expect(town).toContain("settleRoadBadges(cafeFastLocal, today)");
    expect(town).toContain("badge earned");
    expect(town).toContain("eraTurnBadge");
  });

  it("the seats draw whole-word era names with no truncation", () => {
    const src = read("components/road-badges.tsx");
    expect(src).toContain("roadSeats(state)");
    expect(src).toContain("{era.name}");
    const nameLine = src.split("\n").find((l) => l.includes("{era.name}")) ?? "";
    expect(nameLine).not.toContain("numberOfLines");
  });

  it("the Boss Badges carry no trace of the Road (and vice versa)", () => {
    expect(read("lib/badges.ts")).not.toContain("hometown-road");
    expect(read("components/badge-case.tsx")).not.toContain("hometown-road");
    expect(read("app/boss-badges.tsx")).not.toContain("hometown-road");
    expect(read("lib/hometown-road.ts")).not.toContain("from \"./badges\"");
  });
});
