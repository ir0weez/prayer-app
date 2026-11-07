// ─────────────────────────────────────────────────────────────────────────────
// v465 Part A — the Week Ahead blend (WA-5: WA-1 × WA-3, his pick
// Nov 7). The flat "On the calendar" list — "just a list… long and
// kind of useless" (Oct 30, and again Nov 7) — is replaced by:
// a stats strip, the one-offs as exception cards ("NOT THE
// ROUTINE"), and the repeats collapsed under their title with a
// multiplier ("THE WEEK IN REPEATS" — his example was Rest).
//
// The fixture mirrors his real week of Nov 8–14, 2026, as stored
// (Rest ×21 across Mon–Sat at four times @ Garden; Feed (Aaron)
// ×20 Mon–Fri; the red Doctors Appointment on Friday carrying its
// location, note, travel and reminder) at the same shapes, so the
// composed arithmetic is his week's arithmetic.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";

import {
  composeWeeklyRecap,
  formatWeekAheadClockLabel,
  getFastRecapWeeks,
  type RecapScheduleItem,
} from "../fast-tracker";
import type { PersonalFast } from "../prayercircle-fasting";
import type { Person } from "../prayercircle-data";

function growthFast(overrides: Partial<PersonalFast> = {}): PersonalFast {
  return {
    id: "fast-365",
    name: "365-Day Growth Fast",
    startDate: "2026-01-01",
    durationDays: 365,
    type: "Growth",
    focusItems: [],
    dayStatuses: {},
    dailyNotes: {},
    why: "Get back to structure and focus.",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as PersonalFast;
}

const MON = "2026-11-09";
const TUE = "2026-11-10";
const WED = "2026-11-11";
const THU = "2026-11-12";
const FRI = "2026-11-13";
const SAT = "2026-11-14";
const SUN = "2026-11-08";
const WEEKDAYS = [MON, TUE, WED, THU, FRI];
const ALL_DAYS = [SUN, MON, TUE, WED, THU, FRI, SAT];

function item(partial: Partial<RecapScheduleItem> & { date: string; title: string }): RecapScheduleItem {
  return { kind: "event", ...partial };
}

/** His week's shapes, stored the way his stores hold them. */
function hisWeekItems(): RecapScheduleItem[] {
  const items: RecapScheduleItem[] = [];
  // Rest ×21 — Mon–Fri at four times, Sat at one, all at Garden.
  const restSlots: [string, string][] = [
    ["12:00", "12:30"],
    ["14:00", "14:30"],
    ["16:00", "16:30"],
    ["22:00", "23:00"],
  ];
  for (const d of WEEKDAYS) for (const [s, e] of restSlots) items.push(item({ date: d, title: "Rest", startTime: s, endTime: e, location: "Garden" }));
  items.push(item({ date: SAT, title: "Rest", startTime: "12:00", endTime: "12:30", location: "Garden" }));
  // Feed (Aaron) ×20 — Mon–Fri, four starts a day (todos: a start, no end).
  for (const d of WEEKDAYS) for (const s of ["10:00", "14:00", "18:00", "22:00"]) items.push(item({ date: d, title: "Feed (Aaron)", startTime: s, kind: "todo" }));
  // Self-Care ×9 — Mon–Fri mornings, Mon–Thu evenings (group headers).
  for (const d of WEEKDAYS) items.push(item({ date: d, title: "Self-Care", startTime: "09:00", kind: "todo" }));
  for (const d of [MON, TUE, WED, THU]) items.push(item({ date: d, title: "Self-Care", startTime: "21:00", kind: "todo" }));
  // Gardening ×7 — every day, 6:00–7:00 PM.
  for (const d of ALL_DAYS) items.push(item({ date: d, title: "Gardening", startTime: "18:00", endTime: "19:00" }));
  // Duolingo ×7 — every day, untimed.
  for (const d of ALL_DAYS) items.push(item({ date: d, title: "Duolingo", kind: "todo" }));
  // Dinner ×6 — Mon–Sat at Home. Lunch ×5 — Mon–Fri at Home.
  for (const d of [MON, TUE, WED, THU, FRI, SAT]) items.push(item({ date: d, title: "Dinner", startTime: "20:00", endTime: "21:00", location: "Home" }));
  for (const d of WEEKDAYS) items.push(item({ date: d, title: "Lunch", startTime: "12:00", endTime: "13:00", location: "Home" }));
  // The one-offs.
  items.push(item({ date: MON, title: "LP Meeting", startTime: "12:00", endTime: "12:30", location: "Zoom" }));
  items.push(item({ date: WED, title: "Bible Study", startTime: "19:00", endTime: "20:00", location: "Church", kind: "ministry" }));
  items.push(
    item({
      date: FRI,
      title: "Doctors Appointment",
      startTime: "15:00",
      endTime: "16:00",
      location: "Dr. Gaw",
      notes: "Novalee & Aaron",
      travelTimeMinutes: 15,
      reminderMinutesBefore: 60,
      color: "#EF4444",
    }),
  );
  return items;
}

function aheadFor(items: RecapScheduleItem[], people: Person[] = []) {
  const fast = growthFast();
  const weeks = getFastRecapWeeks(fast, "2026-11-07");
  const week = weeks.find((w) => w.startDate === "2026-11-01")!;
  const recap = composeWeeklyRecap(fast, week, { people, scheduleItems: items });
  return recap;
}

describe("v465 Part A — the blend over his real week's shapes", () => {
  const recap = aheadFor(hisWeekItems(), [{ id: "p1", name: "Ruth Alvarez", lastPrayedDate: "2026-10-30" } as Person]);
  const ahead = recap.weekAhead!;

  it("the frame stands: Nov 8–14, Days 312–318", () => {
    expect(ahead.datesLabel).toBe("Nov 8 – 14");
    expect(ahead.fastLine).toBe("365-Day Growth Fast · Days 312–318");
  });

  it("stats: every kind counted, the clock sums only fully-timed items", () => {
    // 21+20+9+7+7+6+5 events/todos/ministries + 3 one-offs = 78.
    expect(ahead.stats?.totalThings).toBe(78);
    // Rest 780 + Gardening 420 + Dinner 360 + Lunch 300 + Doctors
    // 60 + LP 30 + Bible Study 60 = 2010. Feeds, Self-Care (start
    // only) and Duolingo (untimed) never reach the clock.
    expect(ahead.stats?.clockMinutes).toBe(2010);
    expect(ahead.stats?.clockLabel).toBe("33½ hrs");
    expect(ahead.stats?.fullestDay).toMatchObject({ weekday: "Monday", count: 15 });
    expect(ahead.stats?.lightestDay).toMatchObject({ weekday: "Sunday", count: 2 });
    expect(ahead.footLine).toBe("Sunday is your lightest day — 2 things.");
  });

  it("repeats: grouped by title, sorted by count, first occurrence breaks ties", () => {
    expect(ahead.repeats.map((r) => [r.title, r.count])).toEqual([
      ["Rest", 21],
      ["Feed (Aaron)", 20],
      ["Self-Care", 9],
      // The 7-tie: Duolingo's first instance (Sunday, untimed)
      // sorts ahead of Gardening's (Sunday, 6 PM) in the week.
      ["Duolingo", 7],
      ["Gardening", 7],
      ["Dinner", 6],
      ["Lunch", 5],
    ]);
  });

  it("repeat sub-lines: day pattern, times, and the shared place", () => {
    const byTitle = new Map(ahead.repeats.map((r) => [r.title, r.sub]));
    expect(byTitle.get("Rest")).toBe("Mon–Sat · 12:00, 2:00, 4:00 and 10:00 PM · at Garden");
    expect(byTitle.get("Feed (Aaron)")).toBe("Mon–Fri · 10:00 AM, 2:00, 6:00 and 10:00 PM");
    expect(byTitle.get("Self-Care")).toBe("Mon–Fri · 9:00 AM and 9:00 PM");
    expect(byTitle.get("Gardening")).toBe("Every day · 6:00–7:00 PM");
    expect(byTitle.get("Duolingo")).toBe("Every day");
    expect(byTitle.get("Dinner")).toBe("Mon–Sat · 8:00–9:00 PM · at Home");
    expect(byTitle.get("Lunch")).toBe("Mon–Fri · 12:00–1:00 PM · at Home");
  });

  it("exceptions: the one-offs in date order, detail composed from what exists", () => {
    expect(ahead.exceptions.map((e) => e.title)).toEqual(["LP Meeting", "Bible Study", "Doctors Appointment"]);
    const [lp, study, doctors] = ahead.exceptions;
    expect(lp).toMatchObject({ chipLabel: "MON · NOV 9", timeLabel: "12:00–12:30 PM", detail: "At Zoom", red: false });
    // The ministry flows in as an exception like any other kind.
    expect(study).toMatchObject({ chipLabel: "WED · NOV 11", detail: "At Church", red: false });
    expect(doctors).toMatchObject({
      chipLabel: "FRI · NOV 13",
      timeLabel: "3:00–4:00 PM",
      detail: "At Dr. Gaw · Novalee & Aaron · 15 min travel · reminder 1 hr before",
      red: true,
    });
  });

  it("blocks carry Coming due and nothing else — the flat list is gone", () => {
    expect(ahead.blocks.map((b) => b.title)).toEqual(["Coming due"]);
    const dueText = ahead.blocks[0].rows.map((r) => (r.kind === "line" ? r.segments.map((s) => s.text).join("") : "")).join(" ");
    expect(dueText).toContain("Ruth Alvarez");
  });

  it("the journal paragraphs carry the blend, not the old list", () => {
    const text = recap.paragraphs.join("\n");
    expect(text).toContain("78 things planned · 33½ hrs on the clock · Monday fullest (15).");
    expect(text).toContain("Doctors Appointment (FRI · NOV 13, 3:00–4:00 PM) — At Dr. Gaw · Novalee & Aaron · 15 min travel · reminder 1 hr before");
    expect(text).toContain("Rest ×21 — Mon–Sat · 12:00, 2:00, 4:00 and 10:00 PM · at Garden");
    expect(text).toContain("Sunday is your lightest day — 2 things.");
    expect(text).toContain("Ruth Alvarez");
    expect(text).not.toContain("On the calendar");
  });
});

describe("v465 Part A — the red dress is keyed on colour, never title", () => {
  it("only the palette-red family wears it", () => {
    const items = [
      item({ date: MON, title: "Plain Errand", color: "#EF4444" }), // red colour, plain title → red
      item({ date: TUE, title: "Doctors Appointment", color: "#F97316" }), // doctor title, orange → not red
      item({ date: WED, title: "Blue Thing", color: "#3B82F6" }),
      item({ date: THU, title: "No Colour" }),
    ];
    const ahead = aheadFor(items).weekAhead!;
    expect(ahead.exceptions.map((e) => e.red)).toEqual([true, false, false, false]);
  });
});

describe("v465 Part A — grouping and edge grains", () => {
  it("grouping is by title alone: an event and a todo under one title form one repeat", () => {
    const items = [
      item({ date: MON, title: "Prayer", kind: "event", startTime: "07:00" }),
      item({ date: TUE, title: "Prayer", kind: "todo", startTime: "07:00" }),
      item({ date: WED, title: "Prayer ", kind: "todo", startTime: "07:00" }), // trailing space trims into the group
    ];
    const ahead = aheadFor(items).weekAhead!;
    expect(ahead.repeats).toEqual([{ title: "Prayer", count: 3, sub: "Mon–Wed · 7:00 AM" }]);
    expect(ahead.exceptions).toEqual([]);
  });

  it("an even week has no foot line; an itemless week has no stats at all", () => {
    const even = ALL_DAYS.map((d, i) => item({ date: d, title: `Solo ${i}` }));
    const evenAhead = aheadFor(even).weekAhead!;
    expect(evenAhead.stats?.totalThings).toBe(7);
    expect(evenAhead.footLine).toBeNull();

    const bare = aheadFor([]).weekAhead!;
    expect(bare.stats).toBeNull();
    expect(bare.exceptions).toEqual([]);
    expect(bare.repeats).toEqual([]);
    expect(bare.footLine).toBeNull();
    expect(bare.blocks).toEqual([]);
  });
});

describe("v465 Part A — the clock label", () => {
  it("whole hours, halves as ½, else the nearest half", () => {
    expect(formatWeekAheadClockLabel(0)).toBe("0 hrs");
    expect(formatWeekAheadClockLabel(30)).toBe("½ hr");
    expect(formatWeekAheadClockLabel(60)).toBe("1 hr");
    expect(formatWeekAheadClockLabel(90)).toBe("1½ hrs");
    expect(formatWeekAheadClockLabel(120)).toBe("2 hrs");
    expect(formatWeekAheadClockLabel(2340)).toBe("39 hrs");
    expect(formatWeekAheadClockLabel(2370)).toBe("39½ hrs");
    expect(formatWeekAheadClockLabel(2355)).toBe("39½ hrs"); // 39h15m rounds to the nearest half
  });
});
