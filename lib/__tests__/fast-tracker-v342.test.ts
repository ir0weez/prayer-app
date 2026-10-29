// ─────────────────────────────────────────────────────────────────────────────
// v342 — five Jonathan-ordered parts (Oct 29):
//  A · the Weekly Recap rebuilt to the approved drawing
//     (weekly-recap-concepts-v5.html): CALENDAR weeks (Sun–Sat,
//     named by their dates), the v5 composition, the Week Ahead
//     companion, prayer as sentences only, the Recaps header fit.
//  B · the top fade's final form (scope + pure dissolve) — pinned
//     in top-fade-v334/v338 (re-based there).
//  C · the prayer session's per-person SEGMENTS restored — pinned
//     in wavy-progress-v339 + session-v338 (re-based there).
//  D · the wavy wave TRAVELS; two not-live bars exempt (Personal
//     Study thread, Daily Summary day bar) — pinned in
//     wavy-progress-v339 (re-based there).
//  E · the white-block menu's ONE glide surface (below).
//
// This file pins Part A's composition rules and Part E's surface.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import {
  composeWeeklyRecap,
  formatRecapHeroDates,
  formatRecapWeekLabel,
  getFastRecapWeeks,
  getFastWeekKeptLabel,
  getFastWeeks,
  getRecapPrayerWindow,
} from "../fast-tracker";
import { getFastCalendarDays, type PersonalFast } from "../prayercircle-fasting";
import type { Person } from "../prayercircle-data";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

/** His real fast's shape: a 365-day fast from Thursday 2026-01-01. */
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

function person(partial: Partial<Person>): Person {
  return { id: "p", name: "Person", ...partial } as Person;
}

describe("v342 Part A — calendar weeks", () => {
  it("weeks are Sun–Sat calendar weeks: a Thursday-start fast opens on the Sunday before", () => {
    const fast = growthFast();
    const weeks = getFastRecapWeeks(fast, "2026-10-29");
    expect(weeks[0].startDate).toBe("2025-12-28");
    expect(weeks[0].endDate).toBe("2026-01-03");
    // Only the fast's own days ride in the week: Jan 1–3.
    expect(weeks[0].days.map((d) => d.date)).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"]);
    expect(weeks[0].days.map((d) => d.dayNumber)).toEqual([1, 2, 3]);
  });

  it("the label is the week's DATES — never a block number or day range", () => {
    expect(formatRecapWeekLabel("2026-10-25", "2026-10-31")).toBe("Oct 25 – 31");
    expect(formatRecapWeekLabel("2026-10-25", "2026-11-01")).toBe("Oct 25 – Nov 1");
    expect(formatRecapHeroDates("2026-10-25", "2026-10-31")).toBe("October 25–31");
    expect(formatRecapHeroDates("2026-10-25", "2026-11-01")).toBe("October 25 – November 1");
    const fast = growthFast();
    const weeks = getFastRecapWeeks(fast, "2026-10-29");
    const octWeek = weeks.find((w) => w.startDate === "2026-10-25")!;
    const recap = composeWeeklyRecap(fast, octWeek);
    expect(recap.title).toBe("Oct 25 – 31 recap");
    expect(recap.headline).toBe("October 25–31");
    expect(recap.title).not.toContain("Week 43");
    expect(recap.paragraphs.join(" ")).not.toContain("Week 43");
  });

  it("a week's recap presents on Saturday — not Friday, and not before", () => {
    const fast = growthFast();
    const onFriday = getFastRecapWeeks(fast, "2026-10-30");
    const fridayWeek = onFriday.find((w) => w.startDate === "2026-10-25")!;
    expect(fridayWeek.current).toBe(true);
    expect(fridayWeek.available).toBe(false);
    const onSaturday = getFastRecapWeeks(fast, "2026-10-31");
    const saturdayWeek = onSaturday.find((w) => w.startDate === "2026-10-25")!;
    expect(saturdayWeek.available).toBe(true);
  });
});

describe("v342 Part A — the State A week composes to the drawing", () => {
  // His real week of Oct 25–31, 2026: Sun + Fri skipped, Mon–Thu
  // kept, Sat kept; the two real notes from Days 300–301.
  const fast = growthFast({
    dayStatuses: {
      "2026-10-25": "skipped",
      "2026-10-26": "completed",
      "2026-10-27": "completed",
      "2026-10-28": "completed",
      "2026-10-29": "completed",
      "2026-10-30": "skipped",
      "2026-10-31": "completed",
    },
    dailyNotes: {
      "2026-10-27": "Almost messed up yesterday. Held strong though.",
      "2026-10-28": "Held strong today. No issues.",
    },
  });
  const weeks = getFastRecapWeeks(fast, "2026-10-31");
  const week = weeks.find((w) => w.startDate === "2026-10-25")!;
  const recap = composeWeeklyRecap(fast, week);

  it("the hero speaks the shape in words, with the kept fraction for the thread", () => {
    expect(recap.heroLine).toBe("Five of seven days held.");
    expect(recap.heroFraction).toBeCloseTo(5 / 7);
    expect(recap.longestStreak).toBe(4);
    expect(recap.counts).toEqual({ kept: 5, skipped: 2, missed: 0, unmarked: 0 });
  });

  it("a held week anchors on Isaiah 40:31; the why is quoted in the encouragement", () => {
    expect(recap.encouragement.verse.ref).toBe("Isaiah 40:31");
    expect(recap.encouragement.paragraphs.join(" ")).toContain("“Get back to structure and focus.”");
    expect(recap.encouragement.paragraphs.join(" ")).toContain("No missed days this week.");
  });

  it("the easy kept note quotes under Highs; the struggle note files under Lows", () => {
    const highs = recap.blocks.find((b) => b.title === "Highs")!;
    const lows = recap.blocks.find((b) => b.title === "Lows")!;
    const highQuotes = highs.rows.filter((r) => r.kind === "quote") as { text: string }[];
    const lowQuotes = lows.rows.filter((r) => r.kind === "quote") as { text: string }[];
    expect(highQuotes.map((q) => q.text)).toContain("Held strong today. No issues.");
    expect(lowQuotes.map((q) => q.text)).toContain("Almost messed up yesterday. Held strong though.");
    expect(highQuotes.map((q) => q.text)).not.toContain("Almost messed up yesterday. Held strong though.");
  });

  it("the skipped line carries its evidence: back the next morning both times", () => {
    const lows = recap.blocks.find((b) => b.title === "Lows")!;
    const text = lows.rows.map((r) => (r.kind === "line" ? r.segments.map((s) => s.text).join("") : "")).join(" ");
    expect(text).toContain("Sunday and Friday");
    expect(text).toContain("back the next morning both times");
  });
});

describe("v342 Part A — prayer enters as sentences only", () => {
  it("the window counts distinct people and distinct days — nothing per-person", () => {
    const people = [
      person({ prayedDates: ["2026-10-26", "2026-10-27", "2026-10-28"] }),
      person({ prayedDates: ["2026-10-26"] }),
      person({ prayedDates: ["2026-10-20"] }), // outside the window
      person({ lastPrayerCompletedDate: "2026-10-29" }),
    ];
    const dates = ["2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31"];
    const window_ = getRecapPrayerWindow(people, dates);
    expect(window_.peopleCount).toBe(3);
    expect(window_.daysCount).toBe(4);
  });

  it("the composed recap speaks the prayer sentence and never a per-person tally", () => {
    const fast = growthFast({
      dayStatuses: { "2026-10-26": "completed", "2026-10-27": "completed" },
    });
    const people = [
      person({ name: "Alpha One", prayedDates: ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31"] }),
      person({ name: "Beta Two", prayedDates: ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"] }),
      person({ name: "Gamma Three", prayedDates: ["2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"] }),
      person({ name: "Delta Four", prayedDates: ["2026-10-28", "2026-10-29", "2026-10-30"] }),
      person({ name: "Epsilon Five", prayedDates: ["2026-10-29", "2026-10-30"] }),
      person({ name: "Zeta Six", prayedDates: ["2026-10-30"] }),
    ];
    const weeks = getFastRecapWeeks(fast, "2026-10-31");
    const week = weeks.find((w) => w.startDate === "2026-10-25")!;
    const recap = composeWeeklyRecap(fast, week, { people });
    const text = recap.encouragement.paragraphs.join(" ");
    // Six of the week's seven days carried prayer, for six people —
    // as ONE sentence. (Alpha's six personal prayer days must never
    // surface as a frequency against her.)
    expect(text).toContain("on six of seven days");
    expect(text).toContain("six people across the week");
    expect(recap.paragraphs.join(" ")).not.toContain("Alpha");
  });
});

describe("v342 Part A — the Week Ahead companion", () => {
  it("composes the era turn, a stored event, and a coming-due person — nothing invented", () => {
    const fast = growthFast({
      dayStatuses: { "2026-10-26": "completed" },
    });
    const people = [
      // Last reached Fri Oct 23 → the 14-day crossing lands Fri Nov 6, inside Nov 1–7.
      person({ name: "Ruth Alvarez", lastPrayedDate: "2026-10-23" }),
      // Opted out of check-ins: never surfaces.
      person({ name: "Hidden Person", lastPrayedDate: "2026-10-23", showInPrayerCheckIns: false }),
      // Never reached: never due.
      person({ name: "New Person" }),
    ];
    const weeks = getFastRecapWeeks(fast, "2026-10-31");
    const week = weeks.find((w) => w.startDate === "2026-10-25")!;
    const recap = composeWeeklyRecap(fast, week, {
      people,
      scheduleItems: [{ date: "2026-11-03", title: "iSUPPORT meeting", startTime: "15:00", endTime: "16:00" }],
    });
    const ahead = recap.weekAhead!;
    expect(ahead).toBeDefined();
    expect(ahead.datesLabel).toBe("Nov 1 – 7");
    expect(ahead.fastLine).toBe("365-Day Growth Fast · Days 305–311");
    // Day 306 (Mon Nov 2) opens Millennium — the tenth twelfth ends.
    expect(ahead.heroLine).toBe("Millennium turns on Monday.");
    const calendar = ahead.blocks.find((b) => b.title === "On the calendar")!;
    const dateRows = calendar.rows.filter((r) => r.kind === "date") as { dayOfMonth: string }[];
    expect(dateRows.map((r) => r.dayOfMonth)).toEqual(["2", "3"]); // era turn (Mon 2) before the event (Tue 3)
    const due = ahead.blocks.find((b) => b.title === "Coming due")!;
    const dueText = due.rows.map((r) => (r.kind === "line" ? r.segments.map((s) => s.text).join("") : "")).join(" ");
    expect(dueText).toContain("Ruth Alvarez");
    expect(dueText).not.toContain("Hidden Person");
    expect(dueText).not.toContain("New Person");
    expect(ahead.encouragement.verse.ref).toBe("Philippians 3:13–14");
  });

  it("an empty week ahead (no fast days, events, due people, or era turn) omits the companion", () => {
    const shortFast = growthFast({ durationDays: 7, startDate: "2026-10-19" }); // Oct 19–25
    const weeks = getFastRecapWeeks(shortFast, "2026-10-25");
    const lastWeek = weeks[weeks.length - 1];
    const recap = composeWeeklyRecap(shortFast, lastWeek);
    expect(recap.weekAhead).toBeUndefined();
  });
});

describe("v342 Part A — the document and the header fit (source pins)", () => {
  it("the document renders the v5 structure from the seed family", () => {
    const tracker = read("components/fast-tracker.tsx");
    expect(tracker).toContain("WavyProgress value={recap.heroFraction}");
    expect(tracker).toContain('label="KEPT"');
    expect(tracker).toContain('label="DAY STREAK"');
    expect(tracker).toContain("Save to Journal");
    expect(tracker).toContain("THE WEEK AHEAD");
    // No cream anywhere in the recap surfaces.
    expect(tracker).not.toContain("#FBF7EE");
    expect(tracker).not.toContain("#F5EFE0");
  });

  it("the Recaps modal header seats below the top inset", () => {
    const profile = read("app/profile.tsx");
    expect(profile).toContain("paddingTop: insets.top + 8");
    expect(profile).toContain("useSafeAreaInsets");
    expect(profile).not.toContain('<View style={{ height: 64, flexDirection: "row", alignItems: "center", paddingHorizontal: 8, gap: 4 }}>');
  });

  it("Save to Journal still flows through recapToJournalBody", () => {
    const profile = read("app/profile.tsx");
    expect(profile).toContain("recapToJournalBody(recap)");
    const fast = growthFast({
      dayStatuses: { "2026-10-26": "completed", "2026-10-27": "completed", "2026-10-28": "completed" },
    });
    const weeks = getFastRecapWeeks(fast, "2026-10-31");
    const week = weeks.find((w) => w.startDate === "2026-10-25")!;
    const recap = composeWeeklyRecap(fast, week);
    expect(recap.paragraphs[0]).toBe(recap.heroLine);
    expect(getFastCalendarDays(fast)).toHaveLength(365);
  });
});

describe("v342 amendment #6 — the Record runs on the same calendar weeks", () => {
  it("getFastWeeks regroups Sun–Sat: the Thursday-start fast opens with a 3-day week", () => {
    const fast = growthFast();
    const weeks = getFastWeeks(fast, "2026-10-29");
    // First row: Sun Dec 28 2025 – Sat Jan 3 2026, holding ONLY
    // the fast's Thu–Sat days — honest partial, never padded.
    expect(weeks[0].startDate).toBe("2025-12-28");
    expect(weeks[0].endDate).toBe("2026-01-03");
    expect(weeks[0].days.map((d) => d.dayNumber)).toEqual([1, 2, 3]);
    // The week of his screenshot (Oct 25–31) is one calendar row,
    // and "this week" is computed on it.
    const thisWeek = weeks.find((w) => w.startDate === "2026-10-25");
    expect(thisWeek?.endDate).toBe("2026-10-31");
    expect(thisWeek?.days.map((d) => d.dayNumber)).toEqual([298, 299, 300, 301, 302, 303, 304]);
    expect(thisWeek?.current).toBe(true);
    // One derivation: the Record's weeks and the Recap's weeks
    // are the same calendar rows.
    const recapWeeks = getFastRecapWeeks(fast, "2026-10-29");
    expect(recapWeeks.map((w) => w.startDate)).toEqual(weeks.map((w) => w.startDate));
  });

  it("an unstarted calendar week carries no kept label", () => {
    const fast = growthFast();
    const weeks = getFastWeeks(fast, "2026-10-29");
    const future = weeks[weeks.length - 1];
    expect(future.elapsed).toBe(0);
    expect(getFastWeekKeptLabel(future)).toBeNull();
  });

  it("the Record row is titled by its dates (source pin)", () => {
    const component = read("components/fast-tracker.tsx");
    expect(component).toContain("{formatRecapWeekLabel(week.startDate, week.endDate)}");
    expect(component).not.toContain("Week {week.weekNumber}");
  });
});

describe("v342 Part E — the white-block menu glide surface", () => {
  const tab = read("components/schedule-tab.tsx");

  it("the five options ride ONE PanResponder surface, not five press targets", () => {
    expect(tab).toContain("export function WhiteBlockMenuRow");
    expect(tab).toContain("PanResponder.create");
    expect(tab).toContain("onPanResponderGrant");
    expect(tab).toContain("onPanResponderMove");
    expect(tab).toContain("onPanResponderRelease");
    // The old per-circle Pressable is gone.
    expect(tab).not.toContain("onPress={() => { const b = whiteBlockMenu; setWhiteBlockMenu(null); if (b) openNewEventEditorAtTime(b.startTime); }}");
  });

  it("hit-testing measures the row IN WINDOW at grant — the painted frame, transform and all", () => {
    expect(tab).toContain("measureInWindow");
    expect(tab).toContain("frameRef");
  });

  it("the highlight follows the finger with a haptic tick on change; release selects through the shared action map", () => {
    expect(tab).toContain("Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)");
    expect(tab).toContain("if (index >= 0) onSelect(index)");
    expect(tab).toContain("runQuickAddAction(b, index)");
    // The menu's look and options are unchanged.
    expect(tab).toContain('label: "Event"');
    expect(tab).toContain('label: "Reach Out"');
    expect(tab).toContain("WHITE_MENU_BTN = 54");
  });
});
