/**
 * v414 — the Daily Brief (Jonathan approved daily-breakdown-
 * concepts-v6.html on Nov 2: "love it all, do it"). Pins:
 *  - the door claim (lib/keyword-pages.ts): a stored keyword
 *    "Daily Brief" wins outright; a title LEADING with "Daily
 *    Brief" claims it the way "News" does; any other stored
 *    keyword still beats the title;
 *  - the prep line's derivation priority — note, leave time,
 *    location, a tied person's lead need, an attached todo — and
 *    the factual nothing line when none of those exist;
 *  - the hero's planned share, computed by the whites engine over
 *    a fixture day;
 *  - GOOD TO KNOW rows: one per pack section actually present,
 *    stamped with the section's own prepared time; absent sections
 *    yield no rows and nothing is fabricated.
 *
 * v416 — the v414 build ALSO pinned a code-generated 8:00 AM
 * event injected into every day; Jonathan rejected it on v414
 * installed (Nov 2: "I don't want the Daily Brief on there all
 * the time. Just when I add it as an event."). Those pins are
 * replaced below: the door now claims only HIS stored events, a
 * day without one has no Daily Brief, and source pins hold the
 * generator out of the schedule tab and the lib. The date-travel
 * pins lock the chain that briefs the tapped event's day: the
 * card's tap passes eventDate (the shared door params) and the
 * Brief page assembles for it, defaulting to today.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { keywordPageKindForEvent, keywordPagePath } from "../keyword-pages";
import {
  briefDayLine,
  goodToKnowRows,
  plannedShareForDay,
  prepLineForEvent,
} from "../daily-brief";
import type { Person, PrayerItem } from "../prayercircle-data";
import type { ScheduleEvent, ScheduleTodo } from "../schedule-data";
import type { WhiteSourceItem } from "../whites";

function makePerson(overrides: Partial<Person>): Person {
  return {
    id: "p1",
    name: "William Fren",
    initials: "WF",
    relationship: "Friends",
    lastPrayedDate: null,
    lastPrayerCompletedDate: null,
    reminderDaysOfWeek: [],
    accentColor: "#2563EB",
    avatarColor: "#93C5FD",
    prayerItems: [],
    ...overrides,
  } as Person;
}

function makeEvent(overrides: Partial<ScheduleEvent>): ScheduleEvent {
  return {
    id: "e1",
    title: "Morning Meeting",
    date: "2026-11-02",
    isCompleted: false,
    ...overrides,
  };
}

function makeTodo(overrides: Partial<ScheduleTodo>): ScheduleTodo {
  return {
    id: "t1",
    title: "A todo",
    date: "2026-11-02",
    isCompleted: false,
    order: 0,
    ...overrides,
  };
}

describe("v414 daily brief — the door claim", () => {
  it("the stored keyword wins outright", () => {
    expect(keywordPageKindForEvent({ keyword: "Daily Brief", title: "Anything" })).toBe("dailyBrief");
    expect(keywordPageKindForEvent({ keyword: "Daily Brief", title: "News" })).toBe("dailyBrief");
  });

  it("a title leading with Daily Brief claims the door, like News", () => {
    expect(keywordPageKindForEvent({ title: "Daily Brief" })).toBe("dailyBrief");
    expect(keywordPageKindForEvent({ title: "Daily Brief — Monday" })).toBe("dailyBrief");
    expect(keywordPageKindForEvent({ title: "My Daily Brief notes" })).toBeNull();
  });

  it("another stored keyword still beats the title", () => {
    expect(keywordPageKindForEvent({ keyword: "Church", title: "Daily Brief" })).toBeNull();
  });

  it("the resolved label claims it when nothing is stored", () => {
    expect(keywordPageKindForEvent({ title: "Untitled" }, "Daily Brief")).toBe("dailyBrief");
  });

  it("routes to /daily-brief", () => {
    expect(keywordPagePath("dailyBrief")).toBe("/daily-brief");
  });
});

describe("v416 daily brief — only his stored events claim the door", () => {
  // Jonathan, Nov 2: "I don't want the Daily Brief on there all
  // the time. Just when I add it as an event." The door rides a
  // stored event of his, at HIS time — no generated event, no
  // fixed 8:00 AM, no flag.
  it("a stored event with the Daily Brief keyword claims the door", () => {
    const mine = makeEvent({ keyword: "Daily Brief", title: "Daily Brief", startTime: "07:30", endTime: "07:30" });
    expect(keywordPageKindForEvent(mine)).toBe("dailyBrief");
  });

  it("a stored event titled Daily Brief claims it at whatever time he set", () => {
    const mine = makeEvent({ title: "Daily Brief", startTime: "18:00", endTime: "18:00" });
    expect(keywordPageKindForEvent(mine)).toBe("dailyBrief");
  });

  it("a day of ordinary stored events has no Daily Brief at all", () => {
    const day = [
      makeEvent({ id: "a", title: "Pray", keyword: "Prayer" }),
      makeEvent({ id: "b", title: "Gardening — Left", keyword: "Gardening" }),
      makeEvent({ id: "c", title: "Morning Meeting" }),
      makeEvent({ id: "d", title: "Lunch", keyword: "Meal" }),
    ];
    for (const event of day) {
      expect(keywordPageKindForEvent(event)).not.toBe("dailyBrief");
    }
  });

  it("the generator stays out of the schedule tab and the lib", () => {
    const root = join(__dirname, "..", "..");
    const scheduleTab = readFileSync(join(root, "components/schedule-tab.tsx"), "utf8");
    const lib = readFileSync(join(root, "lib/daily-brief.ts"), "utf8");
    expect(scheduleTab).not.toContain("dailyBriefEventForDate");
    expect(scheduleTab).not.toContain("isDailyBrief");
    expect(lib).not.toContain("dailyBriefEventForDate");
    expect(lib).not.toContain("isDailyBrief");
  });

  it("the tapped event's date travels to the Brief page", () => {
    const root = join(__dirname, "..", "..");
    const scheduleTab = readFileSync(join(root, "components/schedule-tab.tsx"), "utf8");
    const page = readFileSync(join(root, "app/daily-brief.tsx"), "utf8");
    // The door chain's shared tap params carry the event's date…
    expect(scheduleTab).toContain("params: { eventId: event.id, eventDate: event.date }");
    // …and the page assembles for it, defaulting to today.
    expect(page).toContain("params.eventDate ?? getTodayISOString()");
  });
});

describe("v414 daily brief — the prep line derivation", () => {
  const noCtx = { people: [] as Person[], todos: [] as ScheduleTodo[] };

  it("the note leads, split at its dash", () => {
    const line = prepLineForEvent(
      makeEvent({ notes: "Bring the folder — signed copies for the meeting" }),
      noCtx,
    );
    expect(line.lead).toBe("Bring the folder");
    expect(line.rest).toBe("signed copies for the meeting");
  });

  it("the note outranks the leave time", () => {
    const line = prepLineForEvent(
      makeEvent({ notes: "Quiet morning", travelTimeMinutes: 20, startTime: "10:00" }),
      noCtx,
    );
    expect(line.lead).toBe("Quiet morning");
  });

  it("the leave time derives from travel minutes before the start", () => {
    const line = prepLineForEvent(
      makeEvent({ travelTimeMinutes: 25, startTime: "10:00" }),
      noCtx,
    );
    expect(line.lead).toBe("Leave at 9:35 AM");
    expect(line.rest).toBe("25 minutes to get there.");
  });

  it("the location speaks when there is no note or leave time", () => {
    const line = prepLineForEvent(makeEvent({ location: "The garden" }), noCtx);
    expect(line.lead).toBe("Head to The garden");
  });

  it("a tied person's lead need speaks in their own words", () => {
    const item: PrayerItem = {
      id: "pi1",
      title: "Work pressure about Sundays",
      isUrgent: false,
      isDone: false,
    };
    const person = makePerson({ prayerItems: [item] });
    const line = prepLineForEvent(
      makeEvent({ linkedPeopleIds: ["p1"] }),
      { people: [person], todos: [] },
    );
    expect(line.lead).toBe("Lead with William");
    expect(line.rest).toBe("Work pressure about Sundays");
  });

  it("an attached, unfinished todo speaks next", () => {
    const todo = makeTodo({ id: "t9", title: "Print the chord charts", linkedEventId: "e1" });
    const line = prepLineForEvent(makeEvent({}), { people: [], todos: [todo] });
    expect(line.lead).toBe("Print the chord charts");
    const done = makeTodo({ id: "t9", title: "Print the chord charts", linkedEventId: "e1", isCompleted: true });
    const lineDone = prepLineForEvent(makeEvent({}), { people: [], todos: [done] });
    expect(lineDone.lead).toBe("Nothing to bring");
  });

  it("an event with nothing gets the factual nothing line", () => {
    const line = prepLineForEvent(makeEvent({}), noCtx);
    expect(line.lead).toBe("Nothing to bring");
    expect(line.rest).toContain("no note, location, or leave time");
  });
});

describe("v414 daily brief — the hero", () => {
  it("the planned share is the whites engine's own arithmetic", () => {
    // One 09:00–10:00 block inside the 05:00–24:00 window (1140
    // minutes): 60 minutes planned, the rest white.
    const items: WhiteSourceItem[] = [
      { startTime: "09:00", endTime: "10:00", isCompleted: false, kind: "event" },
    ];
    expect(plannedShareForDay(items)).toBeCloseTo(60 / 1140, 4);
  });

  it("a completed block does not count as planned, and a todo caps at 30", () => {
    const done: WhiteSourceItem[] = [
      { startTime: "09:00", endTime: "10:00", isCompleted: true, kind: "event" },
    ];
    expect(plannedShareForDay(done)).toBe(0);
    const todo: WhiteSourceItem[] = [
      { startTime: "09:00", endTime: "10:30", isCompleted: false, kind: "todo" },
    ];
    expect(plannedShareForDay(todo)).toBeCloseTo(30 / 1140, 4);
  });

  it("an empty day is fully open", () => {
    expect(plannedShareForDay([])).toBe(0);
  });

  it("the day line leads with the first block and closes with the last", () => {
    const line = briefDayLine({
      timedEvents: [
        { title: "Pray", startTime: "09:00" },
        { title: "Sleep", startTime: "22:00" },
      ],
      eventCount: 2,
      todoCount: 0,
    });
    expect(line).toContain("First up — Pray at 9:00 AM");
    expect(line).toContain("winds down with Sleep at 10:00 PM");
    expect(briefDayLine({ timedEvents: [], eventCount: 0, todoCount: 0 })).toContain("The day is open");
  });
});

describe("v414 daily brief — good to know", () => {
  it("rows come only from sections present, stamped with their prepared times", () => {
    const rows = goodToKnowRows({
      gas: {
        preparedAt: "2026-11-02T08:05:00",
        areaLabel: "Lancaster",
        stations: [
          { name: "Costco", brand: "Costco", priceRegular: 5.69, reportedAt: null, distanceMiles: null, membersOnly: true },
          { name: "Sam's Club", priceRegular: 5.79, reportedAt: null, distanceMiles: null, membersOnly: true },
          { name: "7-Eleven", priceRegular: null, reportedAt: null, distanceMiles: null, membersOnly: false },
        ],
      },
      digest: {
        preparedAt: "2026-11-02T06:31:00",
        digest: [],
        groups: {
          reply: [{ sender: "Talena Booker", subject: "Improv mini-workshop sign-ups", preview: "", when: "6:02 AM" }],
          money: [],
          people: [],
        },
        filedCount: 60,
      },
      news: {
        preparedAt: "2026-11-02T08:05:00",
        briefing: [
          { area: "Church News", date: "2026-10-30", headline: "Share of pastors who feel financially secure holds steady", source: "Christian Post", summary: "", url: "" },
        ],
        more: [],
      },
    });
    expect(rows.map((r) => r.kind)).toEqual(["gas", "email", "news"]);
    expect(rows[0].headline).toContain("Costco");
    expect(rows[0].headline).toContain("$5.69");
    expect(rows[0].stamp).toBe("PACK 8:05 AM");
    expect(rows[1].headline).toBe("One reply is waiting");
    expect(rows[1].stamp).toBe("DIGEST 6:31 AM");
    expect(rows[2].headline).toContain("Christian Post:");
  });

  it("absent sections yield no rows — nothing is fabricated", () => {
    expect(goodToKnowRows({ gas: null, digest: null, news: null })).toEqual([]);
    const gasOnly = goodToKnowRows({
      gas: {
        preparedAt: "2026-11-02T08:05:00",
        areaLabel: "Lancaster",
        stations: [
          { name: "Costco", priceRegular: 5.69, reportedAt: null, distanceMiles: null, membersOnly: true },
        ],
      },
      digest: null,
      news: null,
    });
    expect(gasOnly).toHaveLength(1);
    // A gas section with no priced station says nothing either.
    expect(
      goodToKnowRows({
        gas: {
          preparedAt: "2026-11-02T08:05:00",
          areaLabel: "Lancaster",
          stations: [
            { name: "7-Eleven", priceRegular: null, reportedAt: null, distanceMiles: null, membersOnly: false },
          ],
        },
        digest: null,
        news: null,
      }),
    ).toEqual([]);
  });
});
