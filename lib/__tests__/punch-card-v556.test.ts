/**
 * v556 — the Punch Card (person page). Jonathan approved the
 * ticket in punch-card-person-v3 and picked the stamp-in from
 * punch-card-person-v4 Treatment 2, "The Punch".
 *
 * Pins:
 *  (a) the model — the current week (Mon–Sun) computed around
 *      today; filled days from the SAME records THIS WEEK reads
 *      (the v279 prayedDates log plus lastPrayerCompletedDate);
 *      the badge count; the 7/7 state; a new week starts a fresh
 *      card; unusable dates prove nothing.
 *  (b) the family — the ticket derives from the person's accent
 *      through derivePraiseBirthdayFamily (v498); the mockup's
 *      own instance (Eva's raspberry #A4133C) reproduces exactly.
 *  (c) the wiring — the card is seated on the person page under
 *      the hero and above the Emergency/Praise tiles, its 7/7
 *      door is the standing mark-reached handler, and the
 *      component carries Treatment 2's mechanism (two-step pop,
 *      ring contraction, one 2px ticket dip, stepped dialect
 *      under the stepped skins, reduce-motion standing stamp).
 * The render itself is pinned in punch-card-v556.test.tsx.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { derivePraiseBirthdayFamily } from "../people-material";
import { buildPunchCard, buildPunchCardForWeek, punchCardFirstName } from "../punch-card";

// Mon Nov 23 – Sun Nov 29, 2026 is the reference week (Nov 23,
// 2026 was a Monday; Nov 22 the Sunday closing the week before).
const MON = "2026-11-23";
const TUE = "2026-11-24";
const WED = "2026-11-25";
const THU = "2026-11-26";
const FRI = "2026-11-27";
const SAT = "2026-11-28";
const SUN = "2026-11-29";
const WEEK = [MON, TUE, WED, THU, FRI, SAT, SUN];

describe("v556 punch card — the current week", () => {
  it("computes Monday–Sunday around a midweek today", () => {
    const model = buildPunchCardForWeek([], null, WED);
    expect(model.slots.map((s) => s.iso)).toEqual(WEEK);
    expect(model.slots.map((s) => s.label)).toEqual(["M", "T", "W", "T", "F", "S", "S"]);
    expect(model.todayIndex).toBe(2);
    expect(model.slots[2].isToday).toBe(true);
    expect(model.total).toBe(7);
  });

  it("starts the week today when today is Monday", () => {
    const model = buildPunchCardForWeek([], null, MON);
    expect(model.slots.map((s) => s.iso)).toEqual(WEEK);
    expect(model.todayIndex).toBe(0);
  });

  it("closes the week today when today is Sunday", () => {
    const model = buildPunchCardForWeek([], null, SUN);
    expect(model.slots.map((s) => s.iso)).toEqual(WEEK);
    expect(model.todayIndex).toBe(6);
    // The Sunday before belongs to the week that ends with it.
    const prior = buildPunchCardForWeek([], null, "2026-11-22");
    expect(prior.slots[0].iso).toBe("2026-11-16");
    expect(prior.slots[6].iso).toBe("2026-11-22");
    expect(prior.todayIndex).toBe(6);
  });
});

describe("v556 punch card — filled days from the prayer records", () => {
  it("fills the days the prayedDates log proves", () => {
    const model = buildPunchCardForWeek([MON, WED], null, WED);
    expect(model.slots.map((s) => s.filled)).toEqual([true, false, true, false, false, false, false]);
    expect(model.filledCount).toBe(2);
    expect(model.badgeLabel).toBe("2/7");
    expect(model.isFull).toBe(false);
  });

  it("counts lastPrayerCompletedDate the way THIS WEEK does", () => {
    const model = buildPunchCardForWeek([], TUE, WED);
    expect(model.slots.map((s) => s.filled)).toEqual([false, true, false, false, false, false, false]);
    expect(model.badgeLabel).toBe("1/7");
  });

  it("a new week starts a fresh card — last week's prayers fill nothing", () => {
    const lastWeek = ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22"];
    const model = buildPunchCardForWeek(lastWeek, "2026-11-22", MON);
    expect(model.filledCount).toBe(0);
    expect(model.badgeLabel).toBe("0/7");
    expect(model.isFull).toBe(false);
  });

  it("seven prayed days fill the card", () => {
    const model = buildPunchCardForWeek(WEEK, null, SUN);
    expect(model.filledCount).toBe(7);
    expect(model.badgeLabel).toBe("7/7");
    expect(model.isFull).toBe(true);
  });

  it("unusable dates prove nothing", () => {
    const model = buildPunchCardForWeek(["nope", "2026-13-40", MON], "garbage", WED);
    expect(model.filledCount).toBe(1);
    expect(model.slots[0].filled).toBe(true);
  });

  it("an empty dot row is an empty card, never a full one", () => {
    const model = buildPunchCard([]);
    expect(model.total).toBe(0);
    expect(model.filledCount).toBe(0);
    expect(model.isFull).toBe(false);
    expect(model.todayIndex).toBe(-1);
  });

  it("the aim line takes the first name", () => {
    expect(punchCardFirstName("Eva Roberts")).toBe("Eva");
    expect(punchCardFirstName("Cody")).toBe("Cody");
    expect(punchCardFirstName("  William  Frenn ")).toBe("William");
  });
});

describe("v556 punch card — the family is derived, never pinned", () => {
  it("reproduces the mockup's Eva instance from her accent", () => {
    const family = derivePraiseBirthdayFamily("#A4133C", "light");
    expect(family.surface).toBe("#E4D0DA"); // the ticket's ground
    expect(family.tonal).toBe("#CDABBC"); // the badge
    expect(family.ink).toBe("#30131B"); // the title
    expect(family.deep).toBe("#751632"); // the seal + the 7/7 door
    expect(family.tintMid).toBe("#A1506E"); // the dashed rings + aim line
  });
});

describe("v556 punch card — wiring", () => {
  const personSource = readFileSync(join(process.cwd(), "app/(tabs)/person.tsx"), "utf8");
  const cardSource = readFileSync(join(process.cwd(), "components/punch-card.tsx"), "utf8");

  it("the person page renders the card from its own weekDots", () => {
    expect(personSource).toContain('import { PunchCard } from "@/components/punch-card"');
    expect(personSource).toContain("const punchCardModel = buildPunchCard(weekDots);");
    expect(personSource).toContain("model={punchCardModel}");
    expect(personSource).toContain("accentColor={currentPerson.accentColor}");
  });

  it("the seat is under the hero and above the Emergency/Praise tiles", () => {
    const cardSeat = personSource.indexOf("<PunchCard");
    const tilesSeat = personSource.indexOf("Emergency Prayer (24h)");
    const heroSeat = personSource.indexOf("Prayed Today");
    expect(heroSeat).toBeGreaterThan(-1);
    expect(cardSeat).toBeGreaterThan(heroSeat);
    expect(tilesSeat).toBeGreaterThan(cardSeat);
  });

  it("the 7/7 door is the standing mark-reached handler", () => {
    expect(personSource).toContain("onReachOut={(event) => handleMarkReachedToday({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY })}");
    expect(cardSource).toContain("model.isFull ? (");
    expect(cardSource).toContain("onPress={onReachOut}");
  });

  it("the component carries Treatment 2's mechanism", () => {
    // The two-step pop 0.6 → 1.06 → 1, the ring's 0.85 contraction,
    // the ticket's single 2px dip, one second total.
    expect(cardSource).toContain("[0.6, 1.06, 1, 1]");
    expect(cardSource).toContain("[1, 1, 0.85, 1, 1]");
    expect(cardSource).toContain("[0, 0, 2, 0, 0]");
    expect(cardSource).toContain("PUNCH_DURATION_MS = 1000");
    // The stepped skins quantize the same curve into discrete frames.
    expect(cardSource).toContain("Easing.steps(2)");
    // Reduce-motion: the stamp simply stands.
    expect(cardSource).toContain("isReduceMotionEnabled");
    // The family is derived from the person's accent, never pinned.
    expect(cardSource).toContain("derivePraiseBirthdayFamily(accentColor, scheme)");
  });
});
