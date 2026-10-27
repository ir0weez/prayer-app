/**
 * v276 — "The Fast, As a Tracker". On Oct 26 Jonathan approved
 * social-mockups/fasting-tracker-design-v3.html verbatim ("Okay
 * let's make the fasting page like this."): the fasting page
 * re-presented as a Material habit tracker — a standing Why card,
 * a saturated TODAY hero whose segmented control marks today
 * through the real engine, a plain RECORD (quarter control for
 * 80+ day fasts, week rows of meaning-colored day dots, the notes
 * stream), a day sheet (state + per-day note + encouragement
 * fitted to the selected state), and Recaps composed on-device
 * from his real notes + the record. The board, pawn picker,
 * hearts row, special-space displays, monuments, and XP/coin
 * displays leave the PAGE (presentation only — the engines and
 * data underneath are untouched).
 *
 * The tracker is a pure read-model over the existing fast record:
 * these pins prove the state mapping is 1:1 (a seeded marked-day
 * history renders identically), the why and the day notes persist
 * through the storage normalization, and the recap composer
 * quotes and counts ONLY what exists.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import {
  composeFinalRecap,
  composeWeeklyRecap,
  FAST_ENCOURAGEMENT,
  getFastDayDotState,
  getFastEncouragement,
  getFastLongestStreak,
  getFastNoteStream,
  getFastQuarterForDay,
  getFastQuarters,
  getFastWeekKeptLabel,
  getFastWeeks,
  isFinalRecapReady,
  recapToJournalBody,
} from "../fast-tracker";
import {
  createPersonalFast,
  getFastCalendarDays,
  normalizeFastsForStorage,
  type PersonalFast,
} from "../prayercircle-fasting";

const ROOT = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

// A seeded 40-day fast: Jan 5 – Feb 13, 2026, with a marked history
// and two day notes — the shape of his real record.
function seedFast(overrides: Partial<PersonalFast> = {}): PersonalFast {
  const base: PersonalFast = {
    id: "fast-seed",
    name: "Closeness Fast",
    startDate: "2026-01-05",
    durationDays: 40,
    type: "Health",
    focusItems: [],
    dayStatuses: {},
    createdAt: "2026-01-05T00:00:00.000Z",
  };
  const fast = { ...base, ...overrides };
  const dates = getFastCalendarDays(fast);
  fast.dayStatuses = {
    [dates[0]]: "completed",
    [dates[1]]: "completed",
    [dates[2]]: "missed",
    [dates[3]]: "skipped",
    [dates[4]]: "completed",
    [dates[7]]: "completed",
    ...overrides.dayStatuses,
  };
  return fast;
}

describe("state mapping: the record renders 1:1 from the stored fast", () => {
  it("every stored status reads back exactly; unmarked reads undefined", () => {
    const fast = seedFast();
    const dates = getFastCalendarDays(fast);
    for (const date of dates) {
      expect(getFastDayDotState(fast, date)).toBe(fast.dayStatuses[date]);
    }
    expect(getFastDayDotState(fast, dates[5])).toBeUndefined();
    expect(getFastDayDotState(fast, dates[2])).toBe("missed");
  });

  it("week rows chunk from Day 1 and count kept among elapsed days only", () => {
    const fast = seedFast();
    const dates = getFastCalendarDays(fast);
    const weeks = getFastWeeks(fast, dates[4]); // today = Day 5
    expect(weeks).toHaveLength(6); // 40 days -> 5 full weeks + 5
    const week1 = weeks[0];
    expect(week1.days.map((d) => d.dayNumber)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(week1.elapsed).toBe(5);
    expect(week1.kept).toBe(3); // Days 1, 2, 5 completed; Day 8 is a later week
    expect(week1.current).toBe(true);
    expect(week1.ended).toBe(false);
    expect(getFastWeekKeptLabel(week1)).toBe("3 of 5 so far");
  });

  it("an ended week labels its kept count out of its days", () => {
    const fast = seedFast();
    const dates = getFastCalendarDays(fast);
    const weeks = getFastWeeks(fast, dates[20]); // today = Day 21
    expect(weeks[0].ended).toBe(true);
    expect(getFastWeekKeptLabel(weeks[0])).toBe("3 of 7 kept");
  });

  it("quarters: 80+ day fasts split in four with month-range labels; today auto-opens its quarter", () => {
    const long = seedFast({ durationDays: 365, dayStatuses: {} });
    const quarters = getFastQuarters(long);
    expect(quarters).toHaveLength(4);
    expect(quarters[0].label).toBe("Q1");
    expect(quarters[0].startDay).toBe(1);
    expect(quarters[0].endDay).toBe(92); // ceil(365/4)
    expect(quarters[0].monthRange).toMatch(/^[A-Z][a-z]{2}–[A-Z][a-z]{2}$/);
    expect(getFastQuarterForDay(long, 1)).toBe(0);
    expect(getFastQuarterForDay(long, 300)).toBe(3);
    // Short fasts still compute (the page only shows the control at 80+).
    expect(getFastQuarters(seedFast()).length).toBeGreaterThan(0);
  });
});

describe("the why: stored on the fast record, persists through storage", () => {
  it("the creator carries a trimmed why; a blank why is omitted", () => {
    const withWhy = createPersonalFast({
      name: "Growth Fast",
      startDate: "01-05-2026",
      durationDays: 40,
      type: "Health",
      focusItems: [],
      why: "  To stay close to God.  ",
    });
    expect(withWhy?.why).toBe("To stay close to God.");
    const blank = createPersonalFast({
      name: "Growth Fast",
      startDate: "01-05-2026",
      durationDays: 40,
      type: "Health",
      focusItems: [],
      why: "   ",
    });
    expect(blank && "why" in blank).toBe(false);
  });

  it("normalization round-trips why, day notes, summary and statuses untouched", () => {
    const fast = seedFast({
      why: "To be fully here for my family.",
      dailyNotes: { "2026-01-06": "Hard morning, kept anyway." },
      summary: "A stored summary.",
    });
    const [round] = normalizeFastsForStorage([JSON.parse(JSON.stringify(fast))]);
    expect(round.why).toBe("To be fully here for my family.");
    expect(round.dailyNotes).toEqual({ "2026-01-06": "Hard morning, kept anyway." });
    expect(round.summary).toBe("A stored summary.");
    expect(round.dayStatuses).toEqual(fast.dayStatuses);
  });
});

describe("day notes: saved on the day record, surfaced in the stream", () => {
  it("the stream is newest-first, carries day numbers and states, and honors its limit", () => {
    const fast = seedFast();
    const dates = getFastCalendarDays(fast);
    fast.dailyNotes = {
      [dates[1]]: "Kept it through a rough morning.",
      [dates[4]]: "Quiet day at home.",
      [dates[7]]: "  ", // whitespace-only notes never surface
    };
    const stream = getFastNoteStream(fast, 3);
    expect(stream.map((e) => e.dayNumber)).toEqual([5, 2]);
    expect(stream[0].note).toBe("Quiet day at home.");
    expect(stream[0].status).toBe("completed");
    expect(getFastNoteStream(fast, 1)).toHaveLength(1);
  });
});

describe("encouragement: fitted to the selected state", () => {
  it("missed carries Lamentations mercy; unmarked carries Isaiah strength", () => {
    expect(FAST_ENCOURAGEMENT.missed.ref).toBe("Lamentations 3:22–23");
    expect(FAST_ENCOURAGEMENT.completed.ref).toBe("Psalm 118:24");
    expect(FAST_ENCOURAGEMENT.skipped.ref).toBe("Matthew 11:28");
    expect(getFastEncouragement(undefined).ref).toBe("Isaiah 40:31");
    expect(getFastEncouragement("missed")).toBe(FAST_ENCOURAGEMENT.missed);
  });
});

describe("recaps: quote and count only what exists", () => {
  it("a week with no notes gets an honest counts-only recap", () => {
    const fast = seedFast();
    const weeks = getFastWeeks(fast, "2026-02-20");
    const recap = composeWeeklyRecap(fast, weeks[0]);
    expect(recap.counts).toEqual({ kept: 3, skipped: 1, missed: 1, unmarked: 2 });
    expect(recap.paragraphs).toHaveLength(1);
    expect(recap.paragraphs[0]).toContain("3 kept");
    expect(recap.paragraphs[0]).toContain("1 missed");
  });

  it("a week with notes quotes them verbatim, in day order", () => {
    const fast = seedFast();
    const dates = getFastCalendarDays(fast);
    fast.dailyNotes = {
      [dates[4]]: "Second note, later day.",
      [dates[1]]: "First note, earlier day.",
    };
    const weeks = getFastWeeks(fast, "2026-02-20");
    const recap = composeWeeklyRecap(fast, weeks[0]);
    expect(recap.paragraphs).toHaveLength(3);
    expect(recap.paragraphs[1]).toBe("On Day 2 you wrote: “First note, earlier day.”");
    expect(recap.paragraphs[2]).toBe("On Day 5 you wrote: “Second note, later day.”");
  });

  it("the final recap opens with his why in his words and counts the whole fast", () => {
    const fast = seedFast({ why: "To stay close to God." });
    const recap = composeFinalRecap(fast);
    expect(recap.paragraphs[0]).toBe("Your why, in your words: “To stay close to God.”");
    expect(recap.counts.kept).toBe(4);
    expect(recap.longestStreak).toBe(getFastLongestStreak(fast));
    const body = recapToJournalBody(recap);
    expect(body).toContain("Kept 4");
    expect(body).toContain("To stay close to God.");
  });

  it("final readiness: every day marked, or the fast's days have run out", () => {
    const fast = seedFast();
    const dates = getFastCalendarDays(fast);
    expect(isFinalRecapReady(fast, dates[10])).toBe(false);
    expect(isFinalRecapReady(fast, "2027-01-01")).toBe(true);
    const allMarked = seedFast({
      dayStatuses: Object.fromEntries(dates.map((d) => [d, "completed" as const])),
    });
    expect(isFinalRecapReady(allMarked, dates[10])).toBe(true);
  });
});

describe("the page: tracker mounted, game furniture gone", () => {
  const profile = read("app/profile.tsx");

  it("mounts the tracker surfaces and derives its family from the Settings seed", () => {
    expect(profile).toContain("<FastWhyCard");
    expect(profile).toContain("<FastTodayHero");
    expect(profile).toContain("<FastRecordCard");
    expect(profile).toContain("<FastRecapsCard");
    expect(profile).toContain("<FastDaySheetContent");
    expect(profile).toContain("derivePeopleFrontDoor(colors.primary");
  });

  it("the hero marks TODAY through the real engine; the sheet saves state + note together", () => {
    expect(profile).toContain("onMark={(status, position) => setFastStatus(today, status, position)}");
    expect(profile).toContain("onSave={(status, note) => saveDaySheet(sheetDate, status, note)}");
    expect(profile).toContain("const saveDaySheet =");
  });

  it("the creator gained the Why field", () => {
    expect(profile).toContain("WHY ARE YOU FASTING?");
    expect(profile).toContain("draftFastWhy");
  });

  it("no board, pawn picker, companion or streak pill is mounted on the page", () => {
    expect(profile).not.toContain("<FastBoard");
    expect(profile).not.toContain("FastPawnPicker");
    expect(profile).not.toContain("PawnCompanion");
    expect(profile).not.toContain("FastStreakPill");
  });

  it("the day sheet fits its encouragement card to the selected segment", () => {
    const tracker = read("components/fast-tracker.tsx");
    expect(tracker).toContain("getFastEncouragement(status ?? undefined)");
    expect(tracker).toContain("getFastNoteStream(fast, 3)");
  });
});
