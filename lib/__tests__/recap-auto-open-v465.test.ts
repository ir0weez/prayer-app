// ─────────────────────────────────────────────────────────────────────────────
// v465 Part B — the Weekly Recap's Saturday auto-open (his ask,
// Nov 7): the recap opens by itself once a week, on Saturday, at
// a time chosen in Settings — and his named failure mode ("I
// don't want it to appear at that time, and then I close the app
// out and it just keeps appearing") is designed out by the
// consumed marker: a Saturday spent by ANY open stays spent.
//
// These tests pin the pure decision (lib/recap-auto-open.ts) and
// the wiring — the Settings rows, the _layout trigger, and the
// fasting screen's open-path consumption.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import {
  localIsoDate,
  normalizeRecapAutoOpenTime,
  recapAutoOpenMinutes,
  shouldAutoOpenRecap,
  type RecapAutoOpenInput,
} from "../recap-auto-open";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

// Local dates: Fri Nov 6 / Sat Nov 7 / Sun Nov 8, 2026.
const sat = (h: number, m = 0) => new Date(2026, 10, 7, h, m);
const input = (over: Partial<RecapAutoOpenInput> = {}): RecapAutoOpenInput => ({
  enabled: true,
  time: "9:00 AM",
  lastAutoRecapSaturday: null,
  now: sat(9),
  ...over,
});

describe("v465 Part B — the trigger decision", () => {
  it("fires on Saturday at the chosen time, marker unspent", () => {
    expect(shouldAutoOpenRecap(input())).toBe(true);
    expect(shouldAutoOpenRecap(input({ now: sat(23, 59) }))).toBe(true);
  });

  it("never fires before the chosen time", () => {
    expect(shouldAutoOpenRecap(input({ now: sat(8, 59) }))).toBe(false);
    expect(shouldAutoOpenRecap(input({ now: sat(0, 1) }))).toBe(false);
  });

  it("the later choices hold their own hours", () => {
    expect(shouldAutoOpenRecap(input({ time: "12:00 PM", now: sat(9) }))).toBe(false);
    expect(shouldAutoOpenRecap(input({ time: "12:00 PM", now: sat(12) }))).toBe(true);
    expect(shouldAutoOpenRecap(input({ time: "6:30 PM", now: sat(18, 29) }))).toBe(false);
    expect(shouldAutoOpenRecap(input({ time: "6:30 PM", now: sat(18, 30) }))).toBe(true);
    expect(shouldAutoOpenRecap(input({ time: "8:00 PM", now: sat(19, 59) }))).toBe(false);
    expect(shouldAutoOpenRecap(input({ time: "8:00 PM", now: sat(20) }))).toBe(true);
  });

  it("a spent Saturday never fires again that week — closing the app changes nothing", () => {
    expect(shouldAutoOpenRecap(input({ lastAutoRecapSaturday: "2026-11-07" }))).toBe(false);
    expect(shouldAutoOpenRecap(input({ lastAutoRecapSaturday: "2026-11-07", now: sat(21) }))).toBe(false);
    // Last week's spent marker does not block this Saturday.
    expect(shouldAutoOpenRecap(input({ lastAutoRecapSaturday: "2026-10-31" }))).toBe(true);
  });

  it("only Saturday: no Friday early open, no Sunday ambush", () => {
    expect(shouldAutoOpenRecap(input({ now: new Date(2026, 10, 6, 12) }))).toBe(false); // Friday
    expect(shouldAutoOpenRecap(input({ now: new Date(2026, 10, 8, 12) }))).toBe(false); // Sunday
    expect(shouldAutoOpenRecap(input({ now: new Date(2026, 10, 9, 12) }))).toBe(false); // Monday
  });

  it("the switch silences it entirely", () => {
    expect(shouldAutoOpenRecap(input({ enabled: false }))).toBe(false);
    expect(shouldAutoOpenRecap(input({ enabled: false, now: sat(20) }))).toBe(false);
  });
});

describe("v465 Part B — the time choices", () => {
  it("exactly the four choices, with the default at 9:00 AM", () => {
    expect(recapAutoOpenMinutes("9:00 AM")).toBe(540);
    expect(recapAutoOpenMinutes("12:00 PM")).toBe(720);
    expect(recapAutoOpenMinutes("6:30 PM")).toBe(1110);
    expect(recapAutoOpenMinutes("8:00 PM")).toBe(1200);
    expect(normalizeRecapAutoOpenTime("6:30 PM")).toBe("6:30 PM");
    expect(normalizeRecapAutoOpenTime("7:00 AM")).toBe("9:00 AM");
    expect(normalizeRecapAutoOpenTime(undefined)).toBe("9:00 AM");
    expect(normalizeRecapAutoOpenTime(900)).toBe("9:00 AM");
  });

  it("the marker date is the local ISO day", () => {
    expect(localIsoDate(sat(9))).toBe("2026-11-07");
    expect(localIsoDate(new Date(2026, 0, 5, 9))).toBe("2026-01-05");
  });
});

describe("v465 Part B — the wiring (source pins)", () => {
  it("Settings carries the recap rows: the switch row and the four times", () => {
    const tabs = read("app/(tabs)/index.tsx");
    // v469 re-pin: v465 seated these rows in a standalone WEEKLY
    // RECAP group between SCHEDULE & ALERTS and DATA & BACKUP;
    // his ruling ("Shouldn't it be with the notifications
    // settings? Why does it have its own area?") moves them into
    // the SCHEDULE & ALERTS card, at its end — no Weekly Recap
    // group header exists anywhere in the Settings surface, and
    // both rows render inside that card after the Quiet hours
    // row. The preference pins below stand unchanged.
    expect(tabs).not.toContain('groupLabel("WEEKLY RECAP")');
    const alertsCard = tabs.slice(tabs.indexOf('groupLabel("SCHEDULE & ALERTS")'), tabs.indexOf('groupLabel("DATA & BACKUP")'));
    const quietAt = alertsCard.indexOf('title: "Quiet hours"');
    const switchAt = alertsCard.indexOf("Open the week's recap on Saturday");
    const opensAt = alertsCard.indexOf("Opens at");
    expect(quietAt).toBeGreaterThan(-1);
    expect(switchAt).toBeGreaterThan(quietAt);
    expect(opensAt).toBeGreaterThan(switchAt);
    expect(tabs).toContain("Open the week's recap on Saturday");
    expect(tabs).toContain("RECAP_AUTO_OPEN_TIMES");
    expect(tabs).toContain('weeklyRecapAutoOpenTime: "9:00 AM"');
    expect(tabs).toContain("weeklyRecapAutoOpen: parsed.weeklyRecapAutoOpen !== false");
    expect(tabs).toContain("normalizeRecapAutoOpenTime(parsed.weeklyRecapAutoOpenTime)");
  });

  it("the trigger lives in _layout beside the widget push and routes with the param", () => {
    const layout = read("app/_layout.tsx");
    expect(layout).toContain("shouldAutoOpenRecap");
    expect(layout).toContain("loadRecapAutoOpenPreference");
    expect(layout).toContain("loadLastAutoRecapSaturday");
    expect(layout).toContain("composeWeeklyRecap");
    expect(layout).toContain('params: { autoRecap: "1" }');
    expect(layout).toContain('pathname: "/fasting-tracker"');
  });

  it("the fasting screen honors the param once and spends the Saturday on any weekly open", () => {
    const tracker = read("app/fasting-tracker.tsx");
    expect(tracker).toContain('params.autoRecap !== "1"');
    expect(tracker).toContain("setRecapTarget({ kind: \"week\", startDate: latest.startDate })");
    expect(tracker).toContain("router.setParams({ autoRecap: undefined })");
    expect(tracker).toContain("consumeRecapSaturdayIfSaturday");
    // All three schedule kinds feed the recap from the one mapping.
    expect(tracker).toContain("recapScheduleItemsFromStores(recapEvents, recapTodos, recapMinistries)");
    expect(tracker).toContain("SCHEDULE_TODOS_KEY");
    expect(tracker).toContain("SCHEDULE_MINISTRIES_KEY");
  });

  it("the document renders the blend between the hero and Coming due", () => {
    const doc = read("components/fast-tracker.tsx");
    expect(doc).toContain("WeekAheadBlendView");
    expect(doc).toContain("NOT THE ROUTINE");
    expect(doc).toContain("THE WEEK IN REPEATS");
    expect(doc).toContain("THINGS PLANNED");
    expect(doc).toContain("ON THE CLOCK");
    expect(doc).toContain("FULLEST DAY ·");
  });
});
