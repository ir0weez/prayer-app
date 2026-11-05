/**
 * v436 — the home-screen widgets (W-1 concepts, refined Nov 5 to
 * his real home-screen slots: Pray Today large on top, Fast +
 * Reach Out as the half-width pair, Emergency / Up Next / Study
 * wide). Route: react-native-android-widget (its config plugin
 * generates the AppWidgetProviders at prebuild — verified in the
 * v436 smoke test against this repo's Expo 54 / RN 0.81 config).
 *
 * These tests pin the DATA layer (lib/widget-snapshots — pure
 * builders over the app's own selectors, so a widget can never
 * show data the app itself wouldn't), the registration (all six
 * widgets in app.config.ts + the dependency in package.json), the
 * deep-link shapes and their parse, and the wiring (task handler
 * registered in the root layout; the People page consumes the
 * widget pray intent and pushes live snapshots).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { bookColorsFor } from "../bible-v205/book-colors";
import type { StudyState } from "../bible-v205/study";
import type { V205ChapterData } from "../bible-v205/types";
import { formatDateLocal } from "../date-utils";
import { addPerson, type Person, type PrayerItem } from "../prayercircle-data";
import type { PersonalFast } from "../prayercircle-fasting";
import type { ScheduleEvent, ScheduleMinistry, ScheduleTodo } from "../schedule-data";
import { maxHeartsForLevel, normalizeXPState } from "../xp-engine";
import {
  buildAllWidgetSnapshots,
  buildEmergencySnapshot,
  buildFastSnapshot,
  buildPrayTodaySnapshot,
  buildReachOutSnapshot,
  buildStudySnapshot,
  buildUpNextSnapshot,
  countChapterNotes,
  emergencyLeftText,
  formatOpenDuration,
  formatWidgetTime,
  parseWidgetPrayParams,
  widgetFastUri,
  widgetPrayUri,
  widgetReachOutUri,
  widgetStudyUri,
  widgetUpNextUri,
  WIDGET_NAMES,
} from "../widget-snapshots";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const NOW = new Date();
const TODAY = formatDateLocal(NOW);
const daysAgoIso = (days: number) => formatDateLocal(new Date(NOW.getTime() - days * 86400000));
const inHours = (h: number) => new Date(NOW.getTime() + h * 3600000).toISOString();

function person(name: string, overrides: Partial<Person> = {}): Person {
  const base = addPerson([], name, "Family")[0];
  return { ...base, reminderFrequency: "daily", ...overrides };
}

function item(overrides: Partial<PrayerItem> = {}): PrayerItem {
  return { id: `item-${Math.random()}`, title: "Need", isUrgent: false, isDone: false, ...overrides };
}

// ─── 1. Pray Today — next up, progress, faces, complete ─────────────────────

describe("v436 Pray Today snapshot", () => {
  it("names the next unprayed person with their lead (urgent) need and the queue faces", () => {
    const prayed = person("Anna Prayed", { lastPrayerCompletedDate: TODAY });
    const next = person("Erika Pattee", {
      prayerItems: [
        item({ title: "Sleep", isUrgent: false }),
        item({ title: "Pregnancy", note: "Due in January", isUrgent: true }),
      ],
    });
    const snapshot = buildPrayTodaySnapshot([prayed, next], NOW);
    expect(snapshot.state).toBe("next");
    if (snapshot.state !== "next") return;
    expect(snapshot.personId).toBe(next.id);
    expect(snapshot.needTitle).toBe("Pregnancy");
    expect(snapshot.needLine).toBe("Due in January");
    expect(snapshot.prayed).toBe(1);
    expect(snapshot.total).toBe(2);
    // Waiting faces first (the queue card's order), prayed after.
    expect(snapshot.faces.map((face) => face.personId)).toEqual([next.id, prayed.id]);
    expect(snapshot.faces[0].prayed).toBe(false);
    expect(snapshot.faces[1].prayed).toBe(true);
  });

  it("reads complete when everyone scheduled today is prayed", () => {
    const a = person("One Done", { lastPrayerCompletedDate: TODAY });
    const b = person("Two Done", { lastPrayerCompletedDate: TODAY });
    const snapshot = buildPrayTodaySnapshot([a, b], NOW);
    expect(snapshot.state).toBe("complete");
    if (snapshot.state !== "complete") return;
    expect(snapshot.prayed).toBe(2);
    expect(snapshot.total).toBe(2);
    expect(snapshot.faces).toHaveLength(2);
  });

  it("is a quiet no-queue when nobody is scheduled today", () => {
    const off = person("Not Today", { reminderFrequency: "weekly", reminderDaysOfWeek: [(NOW.getDay() + 1) % 7] });
    expect(buildPrayTodaySnapshot([off], NOW).state).toBe("no-queue");
    expect(buildPrayTodaySnapshot([], NOW).state).toBe("no-queue");
  });
});

// ─── 2. Emergency — soonest first, the banner's exact words ─────────────────

describe("v436 Emergency snapshot", () => {
  it("carries at most two rows, soonest-expiring first, with the v435 countdown wording", () => {
    const dad = person("William Fren", {
      prayerItems: [item({ title: "Dad", note: "Has a few months left to live from cancer", isEmergency: true, emergencyExpiresAt: inHours(9) })],
    });
    const mind = person("Jonathan Roberts", {
      prayerItems: [item({ title: "Mind", note: "I just haven't been great mentally.", isEmergency: true, emergencyExpiresAt: inHours(20) })],
    });
    const third = person("Third Person", {
      prayerItems: [item({ title: "Later", isEmergency: true, emergencyExpiresAt: inHours(23) })],
    });
    const snapshot = buildEmergencySnapshot([mind, third, dad], NOW);
    expect(snapshot.state).toBe("active");
    if (snapshot.state !== "active") return;
    expect(snapshot.total).toBe(3);
    expect(snapshot.rows.map((row) => row.title)).toEqual(["Dad", "Mind"]);
    expect(snapshot.rows[0].leftText).toBe("About 9 hours left of 24");
    expect(snapshot.rows[1].leftText).toBe("About 20 hours left of 24");
  });

  it("rests quiet when no emergency is active — never stale rows", () => {
    const calm = person("Calm Person", { prayerItems: [item({ title: "Ordinary" })] });
    expect(buildEmergencySnapshot([calm], NOW).state).toBe("none");
    expect(emergencyLeftText(inHours(1), NOW)).toBe("About 1 hour left of 24");
  });
});

// ─── 3. Your Fast — day math + honest hearts ────────────────────────────────

describe("v436 Fast snapshot", () => {
  const fast: PersonalFast = {
    id: "fast-1",
    name: "365-Day Growth Fast",
    startDate: daysAgoIso(307),
    durationDays: 365,
    type: "growth" as PersonalFast["type"],
    focusItems: [],
    dayStatuses: {},
    createdAt: daysAgoIso(307),
  };

  it("computes today's day number from the fast's own calendar", () => {
    const snapshot = buildFastSnapshot([fast], null, TODAY);
    expect(snapshot.state).toBe("active");
    if (snapshot.state !== "active") return;
    expect(snapshot.dayNumber).toBe(308);
    expect(snapshot.totalDays).toBe(365);
    expect(snapshot.name).toBe("365-Day Growth Fast");
  });

  it("shows hearts only when the XP state is handed in — never faked", () => {
    const bare = buildFastSnapshot([fast], null, TODAY);
    if (bare.state !== "active") throw new Error("expected active");
    expect(bare.hearts).toBeNull();
    expect(bare.maxHearts).toBeNull();
    const fixture = { level: 30, hearts: 3, totalXP: 9000 };
    const withXp = buildFastSnapshot([fast], fixture, TODAY);
    if (withXp.state !== "active") throw new Error("expected active");
    expect(withXp.hearts).toBe(3);
    // The cap is the XP engine's own: maxHeartsForLevel over the
    // state normalizeXPState settles (level derives from totalXP).
    expect(withXp.maxHearts).toBe(maxHeartsForLevel(normalizeXPState(fixture).level));
  });

  it("is quiet with no fast, or outside the fast's days", () => {
    expect(buildFastSnapshot([], null, TODAY).state).toBe("none");
    expect(buildFastSnapshot([fast], null, daysAgoIso(400)).state).toBe("none");
  });
});

// ─── 4. Reach Out — the due set's head and second ───────────────────────────

describe("v436 Reach Out snapshot", () => {
  it("seats the most overdue person, with the second due behind them", () => {
    const ronnie = person("Ronnie Texas", { lastPrayedDate: daysAgoIso(20) });
    const cody = person("Cody Friend", { lastPrayedDate: daysAgoIso(31) });
    const fresh = person("Fresh Face", { lastPrayedDate: daysAgoIso(2) });
    const snapshot = buildReachOutSnapshot([ronnie, fresh, cody], NOW);
    expect(snapshot.state).toBe("due");
    if (snapshot.state !== "due") return;
    expect(snapshot.lead.personId).toBe(cody.id);
    expect(snapshot.lead.days).toBe(31);
    expect(snapshot.second?.personId).toBe(ronnie.id);
    expect(snapshot.totalDue).toBe(2);
  });

  it("is quiet when nobody is due", () => {
    const fresh = person("Fresh Face", { lastPrayedDate: daysAgoIso(1) });
    expect(buildReachOutSnapshot([fresh], NOW).state).toBe("none");
  });
});

// ─── 5. Up Next — the schedule tab's builder + the open-time line ───────────

describe("v436 Up Next snapshot", () => {
  const FIXED = new Date(2026, 10, 5, 10, 0, 0); // Nov 5 2026, 10:00 local
  const DAY = "2026-11-05";
  const event = (overrides: Partial<ScheduleEvent> = {}): ScheduleEvent => ({
    id: `ev-${Math.random()}`,
    title: "Event",
    date: DAY,
    isCompleted: false,
    ...overrides,
  });

  it("names the next timed item and the open time that follows it", () => {
    const snapshot = buildUpNextSnapshot(
      [
        event({ title: "Morning thing", startTime: "08:00", endTime: "09:00", isCompleted: true }),
        event({ title: "Reflection session", startTime: "14:00", endTime: "15:00", location: "The booth" }),
        event({ title: "Dinner", startTime: "17:30", endTime: "18:30" }),
      ],
      [],
      [],
      DAY,
      FIXED,
    );
    expect(snapshot.state).toBe("next");
    if (snapshot.state !== "next") return;
    expect(snapshot.title).toBe("Reflection session");
    expect(snapshot.timeLabel).toBe("2:00 PM");
    expect(snapshot.line).toBe("The booth");
    expect(snapshot.thenOpenText).toBe("Then 2 hours 30 minutes of open time");
  });

  it("is quiet once nothing timed remains today", () => {
    const snapshot = buildUpNextSnapshot(
      [event({ title: "Done", startTime: "08:00", endTime: "09:00" })],
      [],
      [],
      DAY,
      FIXED,
    );
    expect(snapshot.state).toBe("none");
  });

  it("formats pill times and open durations the drawing's way", () => {
    expect(formatWidgetTime("09:05")).toBe("9:05 AM");
    expect(formatWidgetTime("00:00")).toBe("12:00 AM");
    expect(formatOpenDuration(45)).toBe("45 minutes");
    expect(formatOpenDuration(60)).toBe("1 hour");
    expect(formatOpenDuration(90)).toBe("1 hour 30 minutes");
  });
});

// ─── 6. Your Study — focus, verse, last written, restudy ────────────────────

describe("v436 Study snapshot", () => {
  const chapterData = (verses?: Record<number, string>, noteEntries = 0): V205ChapterData => ({
    chapter: 1,
    intro: [],
    previously: [],
    outline: [],
    stories: [],
    ...(verses ? { verses } : {}),
    sections: [
      {
        start: 1,
        end: 1,
        title: null,
        entries: Array.from({ length: noteEntries }, (_, i) => ({
          start: 1,
          end: 1,
          blocks: [{ kind: "para" as const, text: `note ${i}` }],
        })),
      },
    ],
  });

  const state: StudyState = {
    overrides: { "Colossians|1": "complete", "Colossians|2": "complete" },
    reads: {},
    writeQueue: [],
    restudyQueue: [{ book: "Genesis", chapter: 1 }],
    currentBook: "Colossians",
    lastRead: { book: "Colossians", chapter: 2, date: "2026-11-03" },
  };

  it("carries the writing focus, its first verse, last written + note count, and the restudy head", () => {
    const resolver = (book: string, chapter: number): V205ChapterData | null => {
      if (book !== "Colossians") return null;
      if (chapter === 3) return chapterData({ 1: "If ye then be risen with Christ, seek those things which are above." });
      if (chapter === 2) return chapterData(undefined, 5);
      return null;
    };
    const snapshot = buildStudySnapshot(state, {}, resolver);
    expect(snapshot.state).toBe("active");
    if (snapshot.state !== "active") return;
    expect(snapshot.book).toBe("Colossians");
    expect(snapshot.nextChapter).toBe(3);
    expect(snapshot.verseText).toContain("If ye then be risen with Christ");
    expect(snapshot.verseRef).toBe("Colossians 3:1");
    expect(snapshot.lastWrittenChapter).toBe(2);
    expect(snapshot.lastWrittenNotes).toBe(5);
    expect(snapshot.restudyLine).toBe("Genesis · Chapter 1 is next — 1 book waiting");
    expect(snapshot.chaptersWritten).toBe(2);
    expect(snapshot.totalChapters).toBe(4);
    expect(snapshot.colorPrimary).toBe(bookColorsFor("Colossians", true)?.primary);
  });

  it("drops the verse line when the data carries no verse text — never invents one", () => {
    const snapshot = buildStudySnapshot(state, {}, () => chapterData(undefined, 0));
    if (snapshot.state !== "active") throw new Error("expected active");
    expect(snapshot.verseText).toBeNull();
    expect(snapshot.verseRef).toBeNull();
  });

  it("is quiet when no book is marked or underway", () => {
    const empty: StudyState = {
      overrides: {},
      reads: {},
      writeQueue: [],
      restudyQueue: [],
      currentBook: null,
      lastRead: null,
    };
    expect(buildStudySnapshot(empty, {}, () => null).state).toBe("none");
  });

  it("counts a chapter's notes as entries that carry blocks", () => {
    expect(countChapterNotes(chapterData(undefined, 3))).toBe(3);
    expect(countChapterNotes(null)).toBeNull();
  });
});

// ─── 7. The whole set composes from one input ───────────────────────────────

describe("v436 all snapshots", () => {
  it("builds all six from a single stores-shaped input", () => {
    const snapshots = buildAllWidgetSnapshots({
      people: [person("Solo Person")],
      fasts: [],
      xpRaw: null,
      events: [],
      todos: [] as ScheduleTodo[],
      ministries: [] as ScheduleMinistry[],
      studyState: {
        overrides: {},
        reads: {},
        writeQueue: [],
        restudyQueue: [],
        currentBook: null,
        lastRead: null,
      },
      imports: {},
      resolveChapter: () => null,
      now: NOW,
    });
    expect(Object.keys(snapshots).sort()).toEqual(["emergency", "fast", "prayToday", "reachOut", "study", "upNext"]);
    expect(snapshots.prayToday.state).toBe("next");
    expect(snapshots.emergency.state).toBe("none");
  });
});

// ─── 8. Registration — six widgets, the dependency, the wiring ──────────────

describe("v436 widget registration", () => {
  it("registers all six widgets in app.config.ts at Android's 30-minute update floor", () => {
    const config = read("app.config.ts");
    for (const name of Object.values(WIDGET_NAMES)) {
      expect(config).toContain(`name: "${name}"`);
    }
    expect(config.match(/updatePeriodMillis: 1800000/g)?.length).toBe(6);
    expect(config).toContain('"react-native-android-widget"');
  });

  it("carries the library as a real dependency (CI installs frozen from the lockfile)", () => {
    const pkg = JSON.parse(read("package.json")) as { dependencies: Record<string, string> };
    expect(pkg.dependencies["react-native-android-widget"]).toBe("0.26.0");
    const lock = read("pnpm-lock.yaml");
    expect(lock).toContain("react-native-android-widget@0.26.0:");
  });

  it("registers the task handler in the root layout and refreshes on foreground", () => {
    const layout = read("app/_layout.tsx");
    expect(layout).toContain('import "@/lib/widget-task-handler";');
    expect(layout).toContain("refreshAndPushWidgets()");
  });

  it("the People page consumes the widget pray intent and pushes its live state", () => {
    const index = read("app/(tabs)/index.tsx");
    expect(index).toContain("widgetPrayPersonId");
    expect(index).toContain("parseWidgetPrayParams");
    expect(index).toContain('openFocusedPrayerSession(person.id, "emergency")');
    expect(index).toContain("refreshAndPushWidgets({ people, fasts })");
  });

  it("no widget face carries an emoji (his standing rule)", () => {
    const faces = read("components/widgets/prayercircle-widgets.tsx");
    expect(faces).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });
});

// ─── 9. Deep links — open-to-act shapes and their parse ─────────────────────

describe("v436 widget deep links", () => {
  const SCHEME = "manus20260428140541";

  it("builds the pray link the People page parses back", () => {
    const uri = widgetPrayUri(SCHEME, "person 7", "emergency");
    expect(uri.startsWith(`${SCHEME}:///?`)).toBe(true);
    const query = uri.slice(uri.indexOf("?") + 1);
    const params = Object.fromEntries(new URLSearchParams(query));
    expect(parseWidgetPrayParams(params)).toEqual({ personId: "person 7", kind: "emergency" });
    expect(parseWidgetPrayParams({ widgetPrayPersonId: "x" })).toEqual({ personId: "x", kind: "today" });
    expect(parseWidgetPrayParams({})).toBeNull();
  });

  it("builds the section links in expo-router's scheme://path form", () => {
    expect(widgetFastUri(SCHEME)).toBe(`${SCHEME}://fasting-tracker`);
    expect(widgetReachOutUri(SCHEME)).toBe(`${SCHEME}://due-to-reach`);
    expect(widgetUpNextUri(SCHEME)).toBe(`${SCHEME}:///?navTab=schedule`);
    expect(widgetStudyUri(SCHEME, "1 John", 2)).toBe(`${SCHEME}://bible-chapter?book=1%20John&chapter=2`);
  });
});
