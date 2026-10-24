/**
 * v226 — "Faces by the Bell": due-math pins for lib/bell-header.
 *
 * Fixed "now" throughout: Saturday, Oct 24, 2026, 10:00 AM device-local.
 * (Oct 24, 2026 is a Saturday — day-of-week 6, day-of-month 24.)
 */
import { describe, expect, it } from "vitest";
import {
  formatCompactTime,
  formatHoursLeft,
  getBellSummary,
  getDueFaces,
  getFacePrayerLine,
  getNowLine,
  getReachOutLines,
  getScheduleLines,
  getTodayDayItems,
  localIsoDate,
} from "../bell-header";
import { addPerson, type Person, type PrayerItem } from "../prayercircle-data";
import type { ScheduleEvent, ScheduleTodo } from "../schedule-data";

const NOW = new Date(2026, 9, 24, 10, 0, 0); // Sat Oct 24 2026, 10:00 local
const TODAY = "2026-10-24";
const inHours = (h: number) => new Date(NOW.getTime() + h * 3600000).toISOString();

function person(name: string, overrides: Partial<Person> = {}): Person {
  const base = addPerson([], name, "Family")[0];
  return { ...base, ...overrides };
}

function item(overrides: Partial<PrayerItem> = {}): PrayerItem {
  return { id: `item-${Math.random()}`, title: "Need", isUrgent: false, isDone: false, ...overrides };
}

function event(overrides: Partial<ScheduleEvent> = {}): ScheduleEvent {
  return {
    id: `ev-${Math.random()}`,
    title: "Event",
    date: TODAY,
    isCompleted: false,
    ...overrides,
  };
}

function todo(overrides: Partial<ScheduleTodo> = {}): ScheduleTodo {
  return {
    id: `td-${Math.random()}`,
    title: "Todo",
    date: TODAY,
    isCompleted: false,
    order: 0,
    ...overrides,
  };
}

describe("local dates + compact clock", () => {
  it("formats the local ISO date", () => {
    expect(localIsoDate(NOW)).toBe("2026-10-24");
  });

  it("formats compact times in the header's register", () => {
    expect(formatCompactTime("09:00")).toBe("9:00a");
    expect(formatCompactTime("13:30")).toBe("1:30p");
    expect(formatCompactTime("00:00")).toBe("12:00a");
    expect(formatCompactTime("12:00")).toBe("12:00p");
    expect(formatCompactTime(undefined)).toBe("");
    expect(formatCompactTime("bogus")).toBe("");
  });

  it("formats hours-left the way the mockup speaks", () => {
    expect(formatHoursLeft(inHours(9.3), NOW)).toBe("about 9 hours left");
    expect(formatHoursLeft(inHours(1.2), NOW)).toBe("about 1 hour left");
    expect(formatHoursLeft(inHours(0.5), NOW)).toBe("under an hour left");
  });
});

describe("due faces — cadence", () => {
  it("daily cadence is due, plain ring", () => {
    const faces = getDueFaces([person("Eva", { reminderFrequency: "daily" })], NOW);
    expect(faces).toHaveLength(1);
    expect(faces[0].ring).toBe("none");
  });

  it("weekly cadence is due only on a listed weekday (today is Saturday, 6)", () => {
    const due = person("Sat", { reminderFrequency: "weekly", reminderDaysOfWeek: [6] });
    const notDue = person("Mon", { reminderFrequency: "weekly", reminderDaysOfWeek: [1] });
    const faces = getDueFaces([due, notDue], NOW);
    expect(faces.map((f) => f.person.name)).toEqual(["Sat"]);
  });

  it("monthly cadence is due only on its day of month (today is the 24th)", () => {
    const due = person("M24", { reminderFrequency: "monthly", reminderDayOfMonth: 24 });
    const notDue = person("M25", { reminderFrequency: "monthly", reminderDayOfMonth: 25 });
    const faces = getDueFaces([due, notDue], NOW);
    expect(faces.map((f) => f.person.name)).toEqual(["M24"]);
  });

  it("no cadence and no pin means no face", () => {
    expect(getDueFaces([person("Quiet", { reminderFrequency: "none" })], NOW)).toHaveLength(0);
  });

  it("prayed today settles the face out, whatever the cadence", () => {
    const prayed = person("Eva", {
      reminderFrequency: "daily",
      lastPrayerCompletedDate: TODAY,
    });
    expect(getDueFaces([prayed], NOW)).toHaveLength(0);
    // Yesterday's completion does not clear today's face.
    const yesterday = person("Melody", {
      reminderFrequency: "daily",
      lastPrayerCompletedDate: "2026-10-23",
    });
    expect(getDueFaces([yesterday], NOW)).toHaveLength(1);
  });
});

describe("due faces — emergency + praise pins", () => {
  it("an active emergency pins regardless of cadence, ringed emergency", () => {
    const cody = person("Cody", {
      reminderFrequency: "none",
      prayerItems: [item({ isEmergency: true, emergencyExpiresAt: inHours(9) })],
    });
    const faces = getDueFaces([cody], NOW);
    expect(faces).toHaveLength(1);
    expect(faces[0].ring).toBe("emergency");
    expect(getFacePrayerLine(faces[0], NOW)).toBe(
      "Cody — emergency prayer · about 9 hours left",
    );
  });

  it("an expired emergency does not pin", () => {
    const cody = person("Cody", {
      reminderFrequency: "none",
      prayerItems: [item({ isEmergency: true, emergencyExpiresAt: inHours(-1) })],
    });
    expect(getDueFaces([cody], NOW)).toHaveLength(0);
  });

  it("prayed today settles even an emergency face out", () => {
    const cody = person("Cody", {
      reminderFrequency: "none",
      lastPrayerCompletedDate: TODAY,
      prayerItems: [item({ isEmergency: true, emergencyExpiresAt: inHours(9) })],
    });
    expect(getDueFaces([cody], NOW)).toHaveLength(0);
  });

  it("person-level praise pins with the gold ring regardless of cadence", () => {
    const anna = person("Anna", {
      reminderFrequency: "none",
      isPraised: true,
      praiseExpiresAt: inHours(5),
    });
    const faces = getDueFaces([anna], NOW);
    expect(faces).toHaveLength(1);
    expect(faces[0].ring).toBe("praise");
    expect(getFacePrayerLine(faces[0], NOW)).toBe("Anna — praise · about 5 hours left");
  });

  it("item-level praise pins too; expired praise does not", () => {
    const itemPraised = person("Item", {
      reminderFrequency: "none",
      prayerItems: [item({ isPraised: true, praiseExpiresAt: inHours(3) })],
    });
    const expired = person("Gone", {
      reminderFrequency: "none",
      isPraised: true,
      praiseExpiresAt: inHours(-2),
    });
    const faces = getDueFaces([itemPraised, expired], NOW);
    expect(faces.map((f) => f.person.name)).toEqual(["Item"]);
    expect(faces[0].ring).toBe("praise");
  });

  it("emergency outranks praise on the same person, and orders the strip", () => {
    const both = person("Both", {
      reminderFrequency: "none",
      isPraised: true,
      praiseExpiresAt: inHours(5),
      prayerItems: [item({ isEmergency: true, emergencyExpiresAt: inHours(9) })],
    });
    const praiseOnly = person("Praise", {
      reminderFrequency: "none",
      isPraised: true,
      praiseExpiresAt: inHours(5),
    });
    const plain = person("Plain", { reminderFrequency: "daily" });
    const faces = getDueFaces([plain, praiseOnly, both], NOW);
    expect(faces.map((f) => f.person.name)).toEqual(["Both", "Praise", "Plain"]);
    expect(faces.map((f) => f.ring)).toEqual(["emergency", "praise", "none"]);
  });
});

describe("reach-out lines — the 14-day rule", () => {
  it("19 days unreached is a line, in the app's own words", () => {
    const matthew = person("Matthew", { lastPrayedDate: "2026-10-05" });
    expect(getReachOutLines([matthew], NOW)).toEqual([
      "Matthew hasn't been reached in 19 days",
    ]);
  });

  it("13 days is not yet due; exactly 14 is", () => {
    const thirteen = person("A", { lastPrayedDate: "2026-10-11" });
    const fourteen = person("B", { lastPrayedDate: "2026-10-10" });
    expect(getReachOutLines([thirteen], NOW)).toHaveLength(0);
    expect(getReachOutLines([fourteen], NOW)).toHaveLength(1);
  });

  it("check-ins switched off and never-reached stay out (the app's rule)", () => {
    const off = person("Off", { lastPrayedDate: "2026-09-01", showInPrayerCheckIns: false });
    const never = person("Never", { lastPrayedDate: null });
    expect(getReachOutLines([off, never], NOW)).toHaveLength(0);
  });
});

describe("now / next + schedule lines", () => {
  it("a timed item in progress is Now, with its end as 'until'", () => {
    const items = getTodayDayItems(
      [event({ title: "Commentary check-in", startTime: "09:00", endTime: "11:00" })],
      [],
      TODAY,
    );
    const line = getNowLine(items, NOW);
    expect(line).toEqual({ mode: "now", title: "Commentary check-in", untilLabel: "11:00a" });
  });

  it("the current item that ends first wins; todos run 30 minutes", () => {
    const items = getTodayDayItems(
      [event({ title: "Long event", startTime: "09:00", endTime: "12:00" })],
      [todo({ title: "Quick todo", startTime: "09:45" })], // ends 10:15 by the 30-min rule
      TODAY,
    );
    expect(getNowLine(items, NOW)?.title).toBe("Quick todo");
    expect(getNowLine(items, NOW)?.untilLabel).toBe("10:15a");
  });

  it("nothing current → the next item today, with its start time", () => {
    const items = getTodayDayItems(
      [event({ title: "Evening study", startTime: "18:30", endTime: "19:30" })],
      [],
      TODAY,
    );
    expect(getNowLine(items, NOW)).toEqual({
      mode: "next",
      title: "Evening study",
      timeLabel: "6:30p",
    });
  });

  it("an untimed item is Now all day, with no 'until'", () => {
    const items = getTodayDayItems([event({ title: "Garden day" })], [], TODAY);
    const line = getNowLine(items, NOW);
    expect(line?.mode).toBe("now");
    expect(line?.title).toBe("Garden day");
    expect(line?.untilLabel).toBeUndefined();
  });

  it("ended items are neither Now nor lines; completed items vanish entirely", () => {
    const items = getTodayDayItems(
      [
        event({ title: "Dawn patrol", startTime: "07:00", endTime: "08:00" }),
        event({ title: "Done deal", startTime: "09:00", endTime: "11:00", isCompleted: true }),
        event({ title: "Later", startTime: "13:00", endTime: "14:00" }),
      ],
      [],
      TODAY,
    );
    expect(getScheduleLines(items, NOW)).toEqual(["1:00p — Later"]);
    expect(getNowLine(items, NOW)?.title).toBe("Later");
  });

  it("schedule lines speak plainly: time prefix, All day for untimed", () => {
    const items = getTodayDayItems(
      [
        event({ title: "Commentary check-in", startTime: "09:00", endTime: "11:00" }),
        event({ title: "Sabbath prep" }),
      ],
      [todo({ title: "Call Mom about Thursday", startTime: "10:00" })],
      TODAY,
    );
    expect(getScheduleLines(items, NOW)).toEqual([
      "All day — Sabbath prep",
      "9:00a — Commentary check-in",
      "10:00a — Call Mom about Thursday",
    ]);
  });

  it("items on other days never leak in", () => {
    const items = getTodayDayItems(
      [event({ title: "Tomorrow", date: "2026-10-25", startTime: "09:00" })],
      [todo({ title: "Yesterday", date: "2026-10-23", startTime: "09:00" })],
      TODAY,
    );
    expect(items).toHaveLength(0);
    expect(getNowLine(items, NOW)).toBeNull();
  });
});

describe("the composed summary", () => {
  it("badge = faces + schedule lines + reach lines", () => {
    const people = [
      person("Eva", { reminderFrequency: "daily" }),
      person("Cody", {
        reminderFrequency: "none",
        prayerItems: [item({ isEmergency: true, emergencyExpiresAt: inHours(9) })],
      }),
      person("Matthew", { reminderFrequency: "none", lastPrayedDate: "2026-10-05" }),
    ];
    const events = [event({ title: "Commentary check-in", startTime: "09:00", endTime: "11:00" })];
    const summary = getBellSummary(people, events, [], NOW);
    expect(summary.faces.map((f) => f.person.name)).toEqual(["Cody", "Eva"]);
    expect(summary.prayerLines[0]).toBe("Cody — emergency prayer · about 9 hours left");
    expect(summary.scheduleLines).toEqual(["9:00a — Commentary check-in"]);
    expect(summary.reachLines).toEqual(["Matthew hasn't been reached in 19 days"]);
    expect(summary.badgeCount).toBe(2 + 1 + 1);
    expect(summary.nowLine?.title).toBe("Commentary check-in");
  });

  it("a truly empty day composes to nothing at all", () => {
    const summary = getBellSummary([], [], [], NOW);
    expect(summary.faces).toHaveLength(0);
    expect(summary.prayerLines).toHaveLength(0);
    expect(summary.scheduleLines).toHaveLength(0);
    expect(summary.reachLines).toHaveLength(0);
    expect(summary.nowLine).toBeNull();
    expect(summary.badgeCount).toBe(0);
  });
});
