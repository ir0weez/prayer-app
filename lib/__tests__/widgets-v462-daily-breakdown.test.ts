/**
 * v462 — the Daily Breakdown widget (DB-9, "The Brief List,
 * Complete"; daily-breakdown-widget-concepts-v3 — his Nov 6
 * pick, with the companion card "DB-9 · After the Day Ends").
 * The twelfth widget: ONE card, an open list of rows separated
 * by hairlines, no inner boxes — PRAY (a face stack), REACH
 * (only when someone is due), SCHEDULE (a clock glyph in a
 * tonal square), FAST (a flame glyph in a tonal square) — each
 * row its own door.
 *
 * There is NO garden row: the app carries no weather feed, and
 * he knows that row lands a step behind. These pins hold the
 * absence (no garden key in the snapshot, no garden row in the
 * layout or renderer) alongside the deliberate seam (the row
 * order leaves its seat between schedule and fast).
 *
 * The Kotlin renderer cannot execute in this harness, so — as
 * in every widget round — behaviour is pinned on the pure
 * builder, and the renderer is pinned by source: row order,
 * the evening composition's exact strings, the budget
 * constants, and the per-row deep links.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { StudyState } from "../bible-v205/study";
import { formatDateLocal } from "../date-utils";
import { JOURNAL_KIND_HUES } from "../journal-material";
import { addPerson, type Person, type PrayerItem } from "../prayercircle-data";
import type { PersonalFast } from "../prayercircle-fasting";
import type { ScheduleEvent, ScheduleMinistry, ScheduleTodo } from "../schedule-data";
import {
  BREAKDOWN_EMERGENCY_RED,
  buildDailyBreakdownSnapshot,
  WIDGET_NAMES,
  type DailyBreakdownWidgetSnapshot,
} from "../widget-snapshots";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const MODULE = "modules/expo-prayercircle-widgets";
const MODULE_ANDROID = `${MODULE}/android/src/main`;
const MODULE_KOTLIN = `${MODULE_ANDROID}/java/expo/modules/prayercirclewidgets`;

const renderer = read(`${MODULE_KOTLIN}/WidgetRenderer.kt`);
const providers = read(`${MODULE_KOTLIN}/WidgetProviders.kt`);
const manifest = read(`${MODULE_ANDROID}/AndroidManifest.xml`);
const strings = read(`${MODULE_ANDROID}/res/values/strings.xml`);
const layout = read(`${MODULE_ANDROID}/res/layout/widget_daily_breakdown.xml`);
const providerXml = read(`${MODULE_ANDROID}/res/xml/widgetprovider_dailybreakdown.xml`);
const snapshotsSource = read("lib/widget-snapshots.ts");

/** The body of one renderer function, from its declaration to
 * the next top-level declaration (the house idiom). */
function rendererFn(name: string): string {
  const at = renderer.indexOf(`private fun ${name}`);
  expect(at, `${name} present`).toBeGreaterThan(-1);
  const rest = renderer.slice(at + 10);
  const next = rest.indexOf("\n  private fun ");
  return next < 0 ? rest : rest.slice(0, next);
}

// The real clock, like every widget round: two of the
// breakdown's selectors read the device clock themselves
// (getAllActiveEmergencyPrayers compares against now, and
// getDaysSinceLastPrayed counts to today), so the fixtures
// must live on it. The drawing's sample day (Friday Nov 6) is
// illustrative — the shapes are what is pinned.
const NOW = new Date();
const DAY = formatDateLocal(NOW);
const TOMORROW = formatDateLocal(new Date(NOW.getTime() + 86400000));
const daysAgoIso = (days: number) => formatDateLocal(new Date(NOW.getTime() - days * 86400000));
const inHours = (h: number) => new Date(NOW.getTime() + h * 3600000).toISOString();

function person(name: string, overrides: Partial<Person> = {}): Person {
  const base = addPerson([], name, "Family")[0];
  return { ...base, reminderFrequency: "daily", ...overrides };
}

function item(overrides: Partial<PrayerItem> = {}): PrayerItem {
  return { id: `item-${Math.random()}`, title: "Need", isUrgent: false, isDone: false, ...overrides };
}

const event = (overrides: Partial<ScheduleEvent> = {}): ScheduleEvent => ({
  id: `ev-${Math.random()}`,
  title: "Event",
  date: DAY,
  isCompleted: false,
  ...overrides,
});

const todo = (overrides: Partial<ScheduleTodo> = {}): ScheduleTodo => ({
  id: `td-${Math.random()}`,
  title: "Todo",
  date: DAY,
  isCompleted: false,
  order: 0,
  ...overrides,
});

const ministry = (overrides: Partial<ScheduleMinistry> = {}): ScheduleMinistry => ({
  id: `mn-${Math.random()}`,
  title: "Ministry",
  type: "Service",
  date: DAY,
  isCompleted: false,
  ...overrides,
});

const EMPTY_STUDY: StudyState = {
  overrides: {},
  reads: {},
  writeQueue: [],
  restudyQueue: [],
  currentBook: null,
  lastRead: null,
};

const FAST: PersonalFast = {
  id: "fast-1",
  name: "365-Day Growth Fast",
  startDate: daysAgoIso(309),
  durationDays: 365,
  type: "growth" as PersonalFast["type"],
  focusItems: [],
  dayStatuses: {},
  createdAt: daysAgoIso(309),
};

function build(overrides: {
  people?: Person[];
  events?: ScheduleEvent[];
  todos?: ScheduleTodo[];
  ministries?: ScheduleMinistry[];
  fasts?: PersonalFast[];
  studyState?: StudyState;
} = {}): DailyBreakdownWidgetSnapshot {
  return buildDailyBreakdownSnapshot(
    overrides.people ?? [],
    overrides.events ?? [],
    overrides.todos ?? [],
    overrides.ministries ?? [],
    overrides.fasts ?? [],
    overrides.studyState ?? EMPTY_STUDY,
    NOW,
  );
}

// ─── 1. Pray — count, lead, faces ───────────────────────────────────────────

describe("v462 Daily Breakdown — pray row", () => {
  it("counts the day and leads with the next unprayed person's lead need", () => {
    const prayed = person("Anna Prayed", { lastPrayerCompletedDate: DAY });
    const next = person("Erika Pattee", {
      prayerItems: [
        item({ title: "Sleep", isUrgent: false }),
        item({ title: "Pregnancy", note: "Due in January", isUrgent: true }),
      ],
    });
    const third = person("Third Person");
    const snapshot = build({ people: [prayed, next, third], fasts: [FAST] });
    expect(snapshot.state).toBe("day");
    if (snapshot.state !== "day") return;
    const pray = snapshot.pray;
    expect(pray).not.toBeNull();
    if (!pray) return;
    expect(pray.count).toBe(3);
    expect(pray.title).toBe("Pray for 3 today");
    // The queue's lead person with their lead (urgent) need —
    // the Pray Today snapshot's own lead rule.
    expect(pray.sub).toBe("Erika leads — Pregnancy");
    expect(pray.personId).toBe(next.id);
    expect(pray.kind).toBe("today");
    // Faces: the queue's own order (waiting first), capped at three.
    expect(pray.faces.map((face) => face.personId)).toEqual([next.id, third.id, prayed.id]);
    expect(pray.faces.every((face) => !face.emergency)).toBe(true);
  });

  it("the live emergency's person leads the stack, wearing the Emergency red", () => {
    const william = person("William Fren", {
      prayerItems: [
        item({ title: "Dad", note: "Has a few months left to live from cancer", isEmergency: true, emergencyExpiresAt: inHours(9) }),
      ],
    });
    const erika = person("Erika Pattee", { prayerItems: [item({ title: "Pregnancy", isUrgent: true })] });
    const snapshot = build({ people: [erika, william], fasts: [FAST] });
    if (snapshot.state !== "day") throw new Error("expected a day");
    const pray = snapshot.pray;
    if (!pray) throw new Error("expected a pray row");
    expect(pray.sub).toBe("William leads — emergency");
    expect(pray.personId).toBe(william.id);
    expect(pray.kind).toBe("emergency");
    // First face: the emergency's person, in the meaning red —
    // and only once, though he also stands in the queue.
    expect(pray.faces[0].personId).toBe(william.id);
    expect(pray.faces[0].color).toBe(BREAKDOWN_EMERGENCY_RED);
    expect(pray.faces[0].color).toBe("#B91C1C");
    expect(pray.faces[0].emergency).toBe(true);
    expect(pray.faces.map((face) => face.personId)).toEqual([william.id, erika.id]);
  });

  it("stands in the past tense, doorless, when the whole list is prayed", () => {
    const a = person("One Done", { lastPrayerCompletedDate: DAY });
    const b = person("Two Done", { lastPrayerCompletedDate: DAY });
    const snapshot = build({ people: [a, b], fasts: [FAST] });
    if (snapshot.state !== "day") throw new Error("expected a day");
    const pray = snapshot.pray;
    if (!pray) throw new Error("expected a pray row");
    expect(pray.title).toBe("Prayed for 2 today");
    expect(pray.sub).toBe("");
    expect(pray.personId).toBeNull();
    expect(pray.kind).toBeNull();
  });

  it("an emergency alone stands the row even with an empty queue", () => {
    const william = person("William Fren", {
      reminderFrequency: "weekly",
      reminderDaysOfWeek: [(NOW.getDay() + 1) % 7],
      prayerItems: [item({ title: "Dad", isEmergency: true, emergencyExpiresAt: inHours(9) })],
    });
    const snapshot = build({ people: [william] });
    if (snapshot.state !== "day") throw new Error("expected a day");
    const pray = snapshot.pray;
    if (!pray) throw new Error("expected a pray row");
    expect(pray.count).toBe(1);
    expect(pray.title).toBe("Pray for 1 today");
    expect(pray.kind).toBe("emergency");
    expect(pray.faces).toHaveLength(1);
  });

  it("the row is gone when the queue is empty and no emergency is live", () => {
    const snapshot = build({ fasts: [FAST] });
    if (snapshot.state !== "day") throw new Error("expected a day");
    expect(snapshot.pray).toBeNull();
  });
});

// ─── 2. Reach — only when someone is due ────────────────────────────────────

describe("v462 Daily Breakdown — reach row", () => {
  it("seats the most overdue person, on the reached green, with the composed lines", () => {
    const ronnie = person("Ronnie Texas", { lastPrayedDate: daysAgoIso(20) });
    const cody = person("Cody Friend", { lastPrayedDate: daysAgoIso(31) });
    const snapshot = build({ people: [ronnie, cody], fasts: [FAST] });
    if (snapshot.state !== "day") throw new Error("expected a day");
    const reach = snapshot.reach;
    if (!reach) throw new Error("expected a reach row");
    expect(reach.personId).toBe(cody.id);
    expect(reach.days).toBe(31);
    expect(reach.title).toBe("Reach Cody");
    expect(reach.sub).toBe("Due — 31 days since last reached");
    // The drawing's reach face stands on the reached green.
    expect(reach.color).toBe(JOURNAL_KIND_HUES.reached);
    expect(reach.color).toBe("#2E7D46");
  });

  it("is gone — no placeholder — when nobody is due", () => {
    const fresh = person("Fresh Face", { lastPrayedDate: daysAgoIso(1) });
    const snapshot = build({ people: [fresh], fasts: [FAST] });
    if (snapshot.state !== "day") throw new Error("expected a day");
    expect(snapshot.reach).toBeNull();
  });

  it("composes the singular honestly (the due cadence keeps a real lead at 15+ days, so the guard is source-pinned)", () => {
    expect(snapshotsSource).toContain('leadDue.days === 1 ? "" : "s"');
    expect(snapshotsSource).toContain("Due — ${leadDue.days} day");
  });
});

// ─── 3. Schedule — the day whole, tomorrow's first, the reading ────────────

describe("v462 Daily Breakdown — schedule section", () => {
  const study: StudyState = {
    overrides: {},
    reads: {
      "Genesis|1": "2026-11-01",
      "Genesis|2": "2026-11-02",
      "Genesis|3": "2026-11-03",
      "Genesis|4": "2026-11-04",
      "Genesis|5": "2026-11-05",
    },
    writeQueue: [],
    restudyQueue: [],
    currentBook: "Genesis",
    lastRead: null,
  };

  it("carries the day whole in the Up Next dayItems shape, with the baked ends", () => {
    const snapshot = build({
      events: [
        event({ title: "Write", startTime: "11:00", endTime: "12:00", location: "Online" }),
        event({ title: "Lunch", startTime: "12:00", endTime: "13:00", location: "Home" }),
      ],
      todos: [todo({ title: "Feed", startTime: "10:00", notes: "Aaron" })],
      fasts: [FAST],
    });
    if (snapshot.state !== "day") throw new Error("expected a day");
    const items = snapshot.schedule.dayItems;
    // The one collection's order: todos, then events, then ministries.
    expect(items.map((i) => i.title)).toEqual(["Feed", "Write", "Lunch"]);
    expect(items.map((i) => i.startMinutes)).toEqual([600, 660, 720]);
    // A todo with no stored end bakes +30 and keeps hasEnd false;
    // a stored end rides as itself.
    expect(items[0]).toMatchObject({ endMinutes: 630, hasEnd: false, completed: false });
    expect(items[1]).toMatchObject({ endMinutes: 720, hasEnd: true });
    expect(snapshot.schedule.dateIso).toBe(DAY);
  });

  it("carries tomorrow's first timed item — holidays never count", () => {
    const snapshot = build({
      events: [
        event({ title: "Holiday Parade", date: TOMORROW, startTime: "07:00", isHoliday: true }),
        event({ title: "Dinner", date: TOMORROW, startTime: "18:00" }),
      ],
      ministries: [ministry({ title: "Garden Prayer", date: TOMORROW, startTime: "08:00" })],
      fasts: [FAST],
    });
    if (snapshot.state !== "day") throw new Error("expected a day");
    expect(snapshot.schedule.tomorrowFirst).toEqual({ title: "Garden Prayer", timeLabel: "8:00 AM" });
  });

  it("tomorrowFirst is null when tomorrow holds nothing timed", () => {
    const snapshot = build({ fasts: [FAST] });
    if (snapshot.state !== "day") throw new Error("expected a day");
    expect(snapshot.schedule.tomorrowFirst).toBeNull();
    expect(snapshot.schedule.dayItems).toEqual([]);
  });

  it("carries the current reading from the reading position, or null", () => {
    const withReading = build({ fasts: [FAST], studyState: study });
    if (withReading.state !== "day") throw new Error("expected a day");
    expect(withReading.schedule.reading).toBe("Genesis 6");
    const without = build({ fasts: [FAST] });
    if (without.state !== "day") throw new Error("expected a day");
    expect(without.schedule.reading).toBeNull();
  });
});

// ─── 4. Fast — the Your Fast math, and the quiet state ─────────────────────

describe("v462 Daily Breakdown — fast row + quiet state", () => {
  it("carries the fast's day and remaining from the Your Fast builder's own math", () => {
    const snapshot = build({ fasts: [FAST] });
    if (snapshot.state !== "day") throw new Error("expected a day");
    expect(snapshot.fast).toEqual({
      dayNumber: 310,
      totalDays: 365,
      daysLeft: 55,
      name: "365-Day Growth Fast",
    });
  });

  it("the fast row drops when no fast is active", () => {
    const snapshot = build({ events: [event({ title: "Write", startTime: "11:00" })] });
    if (snapshot.state !== "day") throw new Error("expected a day");
    expect(snapshot.fast).toBeNull();
  });

  it("is the quiet none when literally nothing stands", () => {
    expect(build({})).toEqual({ state: "none" });
    expect(build({ people: [person("Fresh Face", { lastPrayedDate: daysAgoIso(1) })] }).state).toBe("day");
  });

  it("no garden row rides the snapshot, in any state", () => {
    const full = build({
      people: [person("Cody Friend", { lastPrayedDate: daysAgoIso(31) })],
      events: [event({ title: "Write", startTime: "11:00" })],
      fasts: [FAST],
    });
    expect(JSON.stringify(full).toLowerCase()).not.toContain("garden");
    expect(JSON.stringify(build({})).toLowerCase()).not.toContain("garden");
  });
});

// ─── 5. Renderer — rows, evening turn, budget, doors ───────────────────────

describe("v462 Daily Breakdown — renderer source", () => {
  const body = rendererFn("renderDailyBreakdown");

  it("fills and seats the rows in the drawing's order — pray, reach, schedule, fast", () => {
    const seatPray = body.indexOf('present.add("pray")');
    const seatReach = body.indexOf('present.add("reach")');
    const seatSchedule = body.indexOf('present.add("schedule")');
    const seatFast = body.indexOf('present.add("fast")');
    expect(seatPray).toBeGreaterThan(-1);
    expect(seatPray).toBeLessThan(seatReach);
    expect(seatReach).toBeLessThan(seatSchedule);
    expect(seatSchedule).toBeLessThan(seatFast);
    // The rows themselves seat by that same walk.
    expect(body).toContain('views.setViewVisibility(R.id.db_row_pray, if ("pray" in seated) View.VISIBLE else View.GONE)');
    expect(body).toContain('views.setViewVisibility(R.id.db_row_reach, if ("reach" in seated) View.VISIBLE else View.GONE)');
    expect(body).toContain('views.setViewVisibility(R.id.db_row_schedule, if ("schedule" in seated) View.VISIBLE else View.GONE)');
    expect(body).toContain('views.setViewVisibility(R.id.db_row_fast, if ("fast" in seated) View.VISIBLE else View.GONE)');
  });

  it("the reach row exists only when the snapshot carries one — absent means absent", () => {
    expect(body).toContain('val reach = if (evening) null else snap.optJSONObject("reach")');
    expect(body).toContain("if (reach != null) {");
    // No placeholder text for a missing reach anywhere.
    expect(body).not.toContain("Nobody due");
    expect(body).not.toContain("No one due");
  });

  it("the evening turn: fresh snapshots only, pray and reach drop, tomorrow is named", () => {
    // Gated on the snapshot being today's own — a stale snapshot
    // never turns (the Up Next fallback grain).
    expect(body).toContain('schedule.optString("dateIso") == deviceDateIso()');
    expect(body).toContain("breakdownEvening(schedule, nowMin)");
    expect(body).toContain('val pray = if (evening) null else snap.optJSONObject("pray")');
    // The companion drawing's exact composition.
    expect(body).toContain('"Tomorrow · ${tomorrowFirst.optString("title")}"');
    expect(body).toContain('"First thing — ${tomorrowFirst.optString("timeLabel")}"');
    expect(body).toContain('"Tomorrow is clear"');
    // The fast row is NOT evening-gated — it stays.
    expect(body).toContain('val fast = snap.optJSONObject("fast")');
  });

  it("the evening test reads the v455 window convention off the baked ends", () => {
    const winEnd = rendererFn("breakdownWinEnd");
    expect(winEnd).toContain("return if (end > start) end else start");
    const evening = rendererFn("breakdownEvening");
    expect(evening).toContain('schedule?.optJSONArray("dayItems")');
    expect(evening).toContain("if (items.length() == 0) return false");
    expect(evening).toContain("if (breakdownWinEnd(item) > nowMin) return false");
  });

  it("the daytime schedule row: next item, the following compressed, the reading appended", () => {
    expect(body).toContain('"${pick.optString("title")} at ${minutesToTimeLabel(pickStart)}"');
    expect(body).toContain("following.take(2)");
    expect(body).toContain('parts.joinToString(" · ")');
    expect(body).toContain('parts.add("$reading to read")');
    // Completed items never pick and never follow.
    expect(body).toContain('if (item.optBoolean("completed")) continue');
  });

  it("each row is its own door, on the shared deep links (request codes from 1200)", () => {
    expect(body).toContain("val base = 1200");
    expect(body).toContain("prayUri(scheme, personId, kind)");
    expect(body).toContain('"$scheme://due-to-reach"');
    expect(body).toContain('"$scheme:///?navTab=schedule"');
    expect(body).toContain('"$scheme://fasting-tracker"');
    expect(body).toContain("launchPendingIntent(context, base)");
  });

  it("the height budget: rows whole or not at all, fast attempted last as the anchor", () => {
    expect(body).toContain("var remaining = minHeightDp - 36");
    expect(body).toContain("remaining >= 64");
    // The anchor exception: fast's seat attempt is NOT behind the stop flag.
    expect(body).toContain('if (key == "fast") {');
    expect(body).toContain("} else if (!stopped) {");
    // Nothing seats -> the quiet face stands.
    expect(body).toContain("if (seated.isEmpty()) return views");
  });

  it("the glyphs are drawn in-process, like every shipped glyph", () => {
    expect(body).toContain("clockBitmap(pal.primary)");
    expect(body).toContain("flameBitmap(pal.primary)");
    const clock = rendererFn("clockBitmap");
    expect(clock).toContain("canvas.drawCircle");
    expect(clock).toContain("canvas.drawLine");
    const flame = rendererFn("flameBitmap");
    expect(flame).toContain("canvas.drawPath(path, paint)");
  });

  it("no garden row anywhere in the renderer or the layout — only the seam comment", () => {
    expect(body).not.toContain("db_garden");
    expect(layout).not.toContain("db_garden");
    expect(renderer).not.toContain("renderGarden");
    expect(snapshotsSource).not.toContain("gardenFirst");
    // The seam: the row order leaves the garden seat between
    // schedule and fast, named in the renderer's own comment.
    expect(body).toContain("The garden row seats here one day");
  });
});

// ─── 6. Registration — the twelfth widget, wired like the others ───────────

describe("v462 Daily Breakdown — registration", () => {
  it("WIDGET_NAMES carries the twelfth name", () => {
    expect(WIDGET_NAMES.dailyBreakdown).toBe("DailyBreakdown");
    expect(Object.values(WIDGET_NAMES)).toHaveLength(12);
  });

  it("the kind, the provider class and the dispatch all name it", () => {
    expect(renderer).toContain(
      "DAILY_BREAKDOWN(DailyBreakdownWidgetProvider::class.java, R.layout.widget_daily_breakdown)",
    );
    expect(renderer).toContain('WidgetKind.DAILY_BREAKDOWN ->');
    expect(renderer).toContain('renderDailyBreakdown(context, root?.optJSONObject("dailyBreakdown"), scheme, pal, minHeightDp)');
    expect(providers).toContain(
      "class DailyBreakdownWidgetProvider : PrayerCircleWidgetProvider(WidgetKind.DAILY_BREAKDOWN)",
    );
  });

  it("the manifest receiver mirrors the other eleven", () => {
    expect(manifest).toContain("expo.modules.prayercirclewidgets.DailyBreakdownWidgetProvider");
    expect(manifest).toContain('android:label="@string/widget_daily_breakdown_label"');
    expect(manifest).toContain('android:resource="@xml/widgetprovider_dailybreakdown"');
    expect(manifest.match(/android\.appwidget\.action\.APPWIDGET_UPDATE/g)?.length).toBe(12);
  });

  it("the provider xml registers a tall 4x3 card on the shared refresh", () => {
    expect(providerXml).toContain('android:targetCellWidth="4"');
    expect(providerXml).toContain('android:targetCellHeight="3"');
    expect(providerXml).toContain('android:minWidth="320dp"');
    expect(providerXml).toContain('android:minHeight="210dp"');
    expect(providerXml).toContain('android:updatePeriodMillis="1800000"');
    expect(providerXml).toContain('android:initialLayout="@layout/widget_daily_breakdown"');
    expect(providerXml).toContain('android:previewLayout="@layout/widget_daily_breakdown"');
  });

  it("the strings name it for the picker", () => {
    expect(strings).toContain('<string name="widget_daily_breakdown_label">Daily Breakdown</string>');
    expect(strings).toContain('<string name="widget_daily_breakdown_desc">Your day in one list: who to pray for, who to reach, what is next, and your fast</string>');
  });

  it("the layout holds the vanilla subset and every id the renderer touches", () => {
    // The v439 subset: no raw View, no vectors, no fancy containers.
    expect(layout).not.toMatch(/<View[\s>]/);
    expect(layout).not.toContain("<vector");
    expect(layout).not.toContain("ConstraintLayout");
    expect(layout).not.toContain("<Button");
    const body = rendererFn("renderDailyBreakdown");
    const ids = new Set([...body.matchAll(/R\.id\.(db_[a-z0-9_]+)/g)].map((m) => m[1]));
    expect(ids.size).toBeGreaterThanOrEqual(30);
    for (const id of ids) {
      expect(layout, `layout carries ${id}`).toContain(`@+id/${id}"`);
    }
    // The face-stack slot ids ride the renderer's slot arrays.
    for (const id of ["db_face_slot_1", "db_face_slot_2", "db_face_slot_3", "db_ring_1", "db_ring_2", "db_ring_3", "db_img_1", "db_img_2", "db_img_3", "db_initials_1", "db_initials_2", "db_initials_3"]) {
      expect(layout, `layout carries ${id}`).toContain(`@+id/${id}"`);
      expect(renderer, `renderer carries ${id}`).toContain(`R.id.${id}`);
    }
    // Row order in the layout matches the drawing.
    const prayAt = layout.indexOf("@+id/db_row_pray");
    const reachAt = layout.indexOf("@+id/db_row_reach");
    const scheduleAt = layout.indexOf("@+id/db_row_schedule");
    const fastAt = layout.indexOf("@+id/db_row_fast");
    expect(prayAt).toBeGreaterThan(-1);
    expect(prayAt).toBeLessThan(reachAt);
    expect(reachAt).toBeLessThan(scheduleAt);
    expect(scheduleAt).toBeLessThan(fastAt);
    // The card wears the shipped 28dp dress and the tiles the 14dp tile.
    expect(layout).toContain("@drawable/widget_shape_white_28");
    expect(layout).toContain("@drawable/widget_tile_white");
  });
});
