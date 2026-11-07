/**
 * v464 — two parts, both his Nov 6 evening asks.
 *
 * PART A — the Up Next day-done turn (UN-T5, "Tomorrow, Whole",
 * his pick from prayercircle-widget-upnext-empty-concepts-v3).
 * His words on the standing face at 10:20 PM — a huge white
 * card saying only "Nothing left today": "This looks sad when
 * it's empty... Can it change into something else?" When today
 * is spent and the core selection would otherwise show that
 * quiet face, the card turns to tomorrow: header flipped, one
 * closed line for today, tomorrow's rail with its white gap
 * boxes, the Study rows, tomorrow's prayers, the fast foot.
 * The snapshot carries the turn's payload on BOTH states; the
 * renderer fires it from the device clock behind freshness
 * gates (the Daily Breakdown evening pattern). Behaviour is
 * pinned on the pure builder; the renderer is pinned by
 * source, as in every widget round.
 *
 * PART B — the widgets follow the DEVICE's dark mode. His
 * Pixel stands in dark mode and the app runs dark, yet all
 * twelve widgets rendered LIGHT. The diagnosis, proven from
 * the code: the v442 devicePalette claimed "the system
 * resources are night-qualified" and read ONE role assignment
 * — the LIGHT assignment — in both modes. The system_*
 * resources are raw tonal RAMPS (system_neutral1_50 is tone
 * 95, a near-white, on every device in every mode); dark mode
 * does not change the tones, it REASSIGNS them to roles (a
 * dark surface is neutral1_900, not _50). The old mapping
 * named light tones for every role, and because the read
 * SUCCEEDS on any API 31+ device, the snapshot fallback — the
 * one path that could ever be dark — was never reached. The
 * fix: the mode is read from the provider context's uiMode;
 * at night the snapshot's seed × dark palette (paletteDark,
 * the app's own dark derivation of his seed) leads, then the
 * device's dark tone assignment, then the standing palette;
 * in light the v442 order stands verbatim. The bitmap glyph
 * audit: every factory takes its colours from the resolved
 * palette at the call site (hearts pal.primary/pal.chip,
 * checks pal.green, clock/flame pal colours, the study bar
 * pal track/fill); the one baked colour is the book glyph's
 * white, which stands on saturated tiles (the ROYGBIV book
 * tile, the seed tile) in every appearance.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { StudyState } from "../bible-v205/study";
import { formatDateLocal } from "../date-utils";
import { addPerson, type Person, type PrayerItem } from "../prayercircle-data";
import type { PersonalFast } from "../prayercircle-fasting";
import type { ScheduleEvent, ScheduleTodo } from "../schedule-data";
import { buildWidgetPalette } from "../widget-palette";
import {
  BREAKDOWN_EMERGENCY_RED,
  buildAllWidgetSnapshots,
  buildUpNextSnapshot,
  serializeWidgetSnapshots,
  type UpNextWidgetSnapshot,
} from "../widget-snapshots";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const MODULE = "modules/expo-prayercircle-widgets";
const MODULE_ANDROID = `${MODULE}/android/src/main`;
const MODULE_KOTLIN = `${MODULE_ANDROID}/java/expo/modules/prayercirclewidgets`;
const MODULE_RES = `${MODULE_ANDROID}/res`;

const renderer = read(`${MODULE_KOTLIN}/WidgetRenderer.kt`);
const upNextLayout = read(`${MODULE_RES}/layout/widget_up_next.xml`);
const snapshotsSource = read("lib/widget-snapshots.ts");
const pushSource = read("lib/widget-push.tsx");

/** The body of one renderer function, from its declaration to
 * the next top-level declaration (the house idiom). */
function rendererFn(name: string): string {
  const at = renderer.indexOf(`private fun ${name}`);
  expect(at, `${name} present`).toBeGreaterThan(-1);
  const rest = renderer.slice(at + 10);
  const next = rest.indexOf("\n  private fun ");
  return next < 0 ? rest : rest.slice(0, next);
}

// The real clock (the v462 round's rule): the emergency and
// fast selectors read the device clock themselves, so the
// fixtures live on it. The shapes are what is pinned.
const NOW = new Date();
const DAY = formatDateLocal(NOW);
const TOMORROW_DATE = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + 1);
const TOMORROW = formatDateLocal(TOMORROW_DATE);
const daysAgoIso = (days: number) => formatDateLocal(new Date(NOW.getTime() - days * 86400000));
const inHours = (h: number) => new Date(NOW.getTime() + h * 3600000).toISOString();
/** Today at 23:59 local — an emergency that ends tonight. */
const tonightIso = () =>
  new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 23, 59).toISOString();

let seq = 0;
const ev = (o: Partial<ScheduleEvent>): ScheduleEvent => ({
  id: `ev-${seq++}`,
  title: "Event",
  date: DAY,
  isCompleted: false,
  ...o,
});
const td = (o: Partial<ScheduleTodo>): ScheduleTodo => ({
  id: `td-${seq++}`,
  title: "Todo",
  date: DAY,
  isCompleted: false,
  order: 0,
  ...o,
});
function person(name: string, overrides: Partial<Person> = {}): Person {
  const base = addPerson([], name, "Family")[0];
  return { ...base, reminderFrequency: "daily", ...overrides };
}

function item(overrides: Partial<PrayerItem> = {}): PrayerItem {
  return { id: `item-${seq++}`, title: "Need", isUrgent: false, isDone: false, ...overrides };
}

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

const EMPTY_STUDY: StudyState = {
  overrides: {},
  reads: {},
  writeQueue: [],
  restudyQueue: [],
  currentBook: null,
  lastRead: null,
};

/** A build late in the evening: at 23:00 nothing is current
 * and nothing is ahead, whatever the fixtures hold. */
const LATE = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 23, 0, 0);

// ─── 1. The builder: tomorrowItems ──────────────────────────────────────────

describe("v464 Up Next tomorrow — builder", () => {
  it("carries tomorrow's date and tomorrow's items in the dayItems shape, on the none state too", () => {
    const events = [
      ev({ title: "Today Only", startTime: "08:00", endTime: "09:00" }),
      ev({ title: "Gardening", date: TOMORROW, startTime: "18:00", endTime: "19:00", location: "Garden" }),
    ];
    const todos = [
      td({ title: "Feed", date: TOMORROW, startTime: "10:00", notes: "Aaron" }),
      td({ title: "Untimed Tomorrow", date: TOMORROW }),
    ];
    const snapshot = buildUpNextSnapshot(events, todos, [], DAY, LATE);
    // The none state is the turn's home — it carries the day
    // whole and the whole payload.
    expect(snapshot.state).toBe("none");
    expect(snapshot.dateIso).toBe(DAY);
    expect(snapshot.dayItems).toHaveLength(1);
    expect(snapshot.tomorrowDateIso).toBe(TOMORROW);
    // Only tomorrow's TIMED items, in the dayItems shape
    // (todos → events, the collection's own order).
    expect(snapshot.tomorrowItems).toEqual([
      { title: "Feed", sub: "Aaron", startMinutes: 600, endMinutes: 630, hasEnd: false, completed: false },
      { title: "Gardening", sub: "Garden", startMinutes: 1080, endMinutes: 1140, hasEnd: true, completed: false },
    ]);
  });

  it("the next state carries the same payload", () => {
    const snapshot = buildUpNextSnapshot(
      [ev({ title: "Late Show", startTime: "23:30", endTime: "23:55" })],
      [],
      [],
      DAY,
      new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 20, 0, 0),
    );
    expect(snapshot.state).toBe("next");
    expect(snapshot.tomorrowDateIso).toBe(TOMORROW);
    expect(snapshot.tomorrowItems).toEqual([]);
    expect(snapshot.tomorrowPray).toBeNull();
    expect(snapshot.tomorrowFast).toBeNull();
  });
});

// ─── 2. The builder: closedToday, the summary bar's arithmetic ──────────────

describe("v464 Up Next tomorrow — closedToday", () => {
  it("counts a header-completed group by its subtasks (the v463 rule) plus events", () => {
    const todos = [
      // The Friday shape: the evening Self-Care group checked
      // off at the header with both subtasks still open — the
      // list files it as one finished row, and since v463 the
      // counter agrees.
      td({
        title: "Self-Care",
        startTime: "21:00",
        isCompleted: true,
        subtasks: [
          { id: "sub-1", title: "External Permission", isCompleted: false },
          { id: "sub-2", title: "Ukulele", isCompleted: false },
        ],
      }),
      td({ title: "Read", startTime: "15:00" }),
    ];
    const events = [
      ev({ title: "Dinner", startTime: "20:00", endTime: "21:00", isCompleted: true }),
      ev({ title: "Rest", startTime: "22:00", endTime: "22:30" }),
    ];
    const snapshot = buildUpNextSnapshot(events, todos, [], DAY, LATE);
    // Todos: 2 subtasks (both done by the header) + Read open
    // = 3 total, 2 done. Events: Dinner done + Rest open
    // = 2 total, 1 done. The bar's sum: 3 of 5.
    expect(snapshot.closedToday).toEqual({ done: 3, total: 5, fastDay: null });
  });

  it("is null when today had no tallyable items at all", () => {
    const snapshot = buildUpNextSnapshot([], [], [], DAY, LATE);
    expect(snapshot.closedToday).toBeNull();
  });

  it("carries today's fast day number only while a fast is active", () => {
    const events = [ev({ title: "Dinner", startTime: "20:00", endTime: "21:00", isCompleted: true })];
    const withFast = buildUpNextSnapshot(events, [], [], DAY, LATE, [], { fasts: [FAST] });
    // Started 309 days ago: today is day 310 of the fast.
    expect(withFast.closedToday).toEqual({ done: 1, total: 1, fastDay: 310 });
    const without = buildUpNextSnapshot(events, [], [], DAY, LATE);
    expect(without.closedToday).toEqual({ done: 1, total: 1, fastDay: null });
  });
});

// ─── 3. The builder: tomorrowFast ───────────────────────────────────────────

describe("v464 Up Next tomorrow — tomorrowFast", () => {
  it("names tomorrow's day number while tomorrow falls inside the fast", () => {
    const snapshot = buildUpNextSnapshot([], [], [], DAY, LATE, [], { fasts: [FAST] });
    expect(snapshot.tomorrowFast).toEqual({ dayNumber: 311 });
  });

  it("drops past the fast's end", () => {
    const endingToday: PersonalFast = { ...FAST, startDate: daysAgoIso(364), createdAt: daysAgoIso(364) };
    const events = [ev({ title: "Dinner", startTime: "20:00", endTime: "21:00", isCompleted: true })];
    const snapshot = buildUpNextSnapshot(events, [], [], DAY, LATE, [], { fasts: [endingToday] });
    // Today is the fast's day 365 — the closed line still
    // names it — but tomorrow stands outside the fast, so
    // the foot drops.
    expect(snapshot.closedToday).toEqual({ done: 1, total: 1, fastDay: 365 });
    expect(snapshot.tomorrowFast).toBeNull();
  });
});

// ─── 4. The builder: tomorrowStudy ──────────────────────────────────────────

describe("v464 Up Next tomorrow — tomorrowStudy", () => {
  it("derives the reading line from the position and the write line from the writing track", () => {
    // Leviticus is the fixture book: fully read, not yet
    // written (its chapters carry no notes in the shipped
    // data — the v446 round's proven shape). Genesis would
    // not do: his corpus has it written whole, so its write
    // line honestly stands null there.
    const studyState: StudyState = {
      ...EMPTY_STUDY,
      currentBook: "Leviticus",
      lastRead: { book: "Leviticus", chapter: 22, date: DAY },
      overrides: { "Leviticus|1": "complete" },
    };
    const snapshot = buildUpNextSnapshot([], [], [], DAY, LATE, [], { studyState, imports: {} });
    // Reading: the position's target — the first chapter past
    // the last-read floor of 22. Writing: chapter 1 stands
    // complete by the override, so the next to write is 2.
    expect(snapshot.tomorrowStudy).toEqual({ reading: "Leviticus 23", writeNext: "Leviticus 2" });
  });

  it("is null when no study store is passed", () => {
    const snapshot = buildUpNextSnapshot([], [], [], DAY, LATE);
    expect(snapshot.tomorrowStudy).toBeNull();
  });
});

// ─── 5. The builder: tomorrowPray ───────────────────────────────────────────

describe("v464 Up Next tomorrow — tomorrowPray", () => {
  it("composes tomorrow's queue: count, faces, the lead's first name", () => {
    const erika = person("Erika Pattee", { prayerItems: [item({ title: "Pregnancy", isUrgent: true })] });
    const cody = person("Cody Allen", { prayerItems: [item({ title: "Work" })] });
    const snapshot = buildUpNextSnapshot([], [], [], DAY, LATE, [erika, cody]);
    const pray = snapshot.tomorrowPray;
    expect(pray).not.toBeNull();
    if (!pray) return;
    expect(pray.count).toBe(2);
    expect(pray.faces).toHaveLength(2);
    expect(pray.faces.every((face) => !face.emergency)).toBe(true);
    // The lead name is the first face's person, by first name.
    const leadPerson = [erika, cody].find((p) => p.id === pray.faces[0].personId);
    expect(pray.leadFirstName).toBe(leadPerson?.name.split(" ")[0]);
    expect(pray.leadEmergency).toBe(false);
  });

  it("an emergency standing into tomorrow leads, wearing the Emergency red", () => {
    const william = person("William Fren", {
      prayerItems: [item({ title: "Dad", isEmergency: true, emergencyExpiresAt: inHours(30) })],
    });
    const erika = person("Erika Pattee", { prayerItems: [item({ title: "Pregnancy", isUrgent: true })] });
    const snapshot = buildUpNextSnapshot([], [], [], DAY, LATE, [erika, william]);
    const pray = snapshot.tomorrowPray;
    expect(pray).not.toBeNull();
    if (!pray) return;
    expect(pray.leadEmergency).toBe(true);
    expect(pray.leadFirstName).toBe("William");
    expect(pray.faces[0].personId).toBe(william.id);
    expect(pray.faces[0].color).toBe(BREAKDOWN_EMERGENCY_RED);
    expect(pray.faces[0].color).toBe("#B91C1C");
    expect(pray.faces[0].emergency).toBe(true);
    // William stands in the queue too — he appears once.
    expect(pray.faces.map((face) => face.personId)).toEqual([william.id, erika.id]);
  });

  it("an emergency that ends tonight does not lead tomorrow", () => {
    const william = person("William Fren", {
      reminderFrequency: "weekly",
      reminderDaysOfWeek: [(NOW.getDay() + 1) % 7],
      prayerItems: [item({ title: "Dad", isEmergency: true, emergencyExpiresAt: tonightIso() })],
    });
    const snapshot = buildUpNextSnapshot([], [], [], DAY, LATE, [william]);
    // William IS on tomorrow's list (his weekly day above is
    // tomorrow's weekday) — but his emergency ends tonight,
    // so tomorrow's row is not emergency-led.
    expect(snapshot.tomorrowPray?.leadEmergency ?? false).toBe(false);
  });

  it("is null when tomorrow's queue is empty and no emergency stands", () => {
    const snapshot = buildUpNextSnapshot([], [], [], DAY, LATE, []);
    expect(snapshot.tomorrowPray).toBeNull();
  });
});

// ─── 6. buildAll hands the stores through ───────────────────────────────────

describe("v464 Up Next tomorrow — buildAll", () => {
  it("buildAllWidgetSnapshots passes fasts / studyState / imports into the Up Next builder", () => {
    const snapshots = buildAllWidgetSnapshots({
      people: [],
      fasts: [FAST],
      xpRaw: null,
      events: [ev({ title: "Dinner", startTime: "20:00", endTime: "21:00", isCompleted: true })],
      todos: [],
      ministries: [],
      studyState: {
        ...EMPTY_STUDY,
        currentBook: "Leviticus",
        lastRead: { book: "Leviticus", chapter: 22, date: DAY },
      },
      imports: {},
      resolveChapter: () => null,
      now: LATE,
    });
    const upNext: UpNextWidgetSnapshot = snapshots.upNext;
    expect(upNext.tomorrowDateIso).toBe(TOMORROW);
    expect(upNext.closedToday).toEqual({ done: 1, total: 1, fastDay: 310 });
    expect(upNext.tomorrowFast).toEqual({ dayNumber: 311 });
    expect(upNext.tomorrowStudy).toEqual({ reading: "Leviticus 23", writeNext: "Leviticus 1" });
  });
});

// ─── 7. The renderer: the turn's gates ──────────────────────────────────────

describe("v464 Up Next tomorrow — renderer gates", () => {
  const turn = rendererFn("renderUpNextTomorrow");

  it("fires only behind the freshness gates and the spent rule", () => {
    // The snapshot must describe the device's today, and its
    // tomorrow must be the device's tomorrow.
    expect(turn).toContain('if (snap.optString("dateIso") != deviceDateIso()) return false');
    expect(turn).toContain('if (snap.optString("tomorrowDateIso") != deviceTomorrowIso()) return false');
    // Spent: every item completed or its window end passed,
    // the baked endMinutes convention (end > start ? end :
    // start). An item still standing uncompleted inside its
    // window declines the whole turn.
    expect(turn).toContain("val winEnd = if (end > start) end else start");
    expect(turn).toContain('if (!item.optBoolean("completed") && winEnd > nowMin) return false');
    // No dayItems, no turn (a pre-v464 snapshot never turns).
    expect(turn).toContain('snap.optJSONArray("dayItems") ?: return false');
    expect(turn).toContain('snap.optJSONArray("tomorrowItems") ?: return false');
  });

  it("is consulted at exactly the standing quiet face's three exits", () => {
    const calls = renderer.split("renderUpNextTomorrow(context, views, snap, pal, heightSignal)").length - 1;
    expect(calls).toBe(3);
    const body = rendererFn("renderUpNext");
    // (1) The state != "next" early return.
    const earlyAt = body.indexOf('snap.optString("state") != "next"');
    const gateAt = body.indexOf("renderUpNextTomorrow(context, views, snap, pal, heightSignal)", earlyAt);
    const quietAt = body.indexOf("R.id.next_msg, View.VISIBLE", earlyAt);
    expect(gateAt).toBeGreaterThan(earlyAt);
    expect(gateAt).toBeLessThan(quietAt);
    // (2) The render-time path's empty selection.
    expect(body).toContain("if (rows.isEmpty() && renderUpNextTomorrow(context, views, snap, pal, heightSignal)) return views");
    // (3) The fallback's gap-only guard (pinned in v445's file).
  });

  it("every render resets the turn's views and the kicker first", () => {
    const body = rendererFn("renderUpNext");
    const reset = rendererFn("hideUpNextTomorrow");
    expect(body).toContain("hideUpNextTomorrow(views)");
    // The reset runs before the state check that can return.
    expect(body.indexOf("hideUpNextTomorrow(views)")).toBeLessThan(
      body.indexOf('snap.optString("state") != "next"'),
    );
    expect(reset).toContain('views.setTextViewText(R.id.next_kicker, "UP NEXT · TODAY")');
    for (const id of ["nx_t5_closed", "nx_t5_study1", "nx_t5_study2", "nx_t5_pray", "nx_t5_fastwrap"]) {
      expect(reset).toContain(`R.id.${id}, View.GONE`);
    }
  });
});

// ─── 8. The renderer: the turn's composition ────────────────────────────────

describe("v464 Up Next tomorrow — renderer composition", () => {
  const turn = rendererFn("renderUpNextTomorrow");

  it("flips the header: TOMORROW kicker and tomorrow's chip label", () => {
    expect(turn).toContain('views.setTextViewText(R.id.next_kicker, "UP NEXT · TOMORROW")');
    expect(turn).toContain("views.setTextViewText(R.id.next_left, tomorrowChipLabel())");
    const chip = rendererFn("tomorrowChipLabel");
    expect(chip).toContain("Calendar.DAY_OF_WEEK, Calendar.SHORT");
    expect(chip).toContain("cal.get(Calendar.DAY_OF_MONTH)");
  });

  it("seats in composition order under the v457 budget, whole or not at all", () => {
    expect(turn).toContain("var remaining = heightSignal - 64 - 20");
    for (const cost of ["T5_COST_CLOSED", "T5_COST_ROW", "T5_COST_GAP", "T5_COST_STUDY", "T5_COST_PRAY", "T5_COST_FAST"]) {
      expect(turn).toContain(cost);
    }
    // The rail walk stops at the first element that doesn't
    // fit and at the nine-slot cap.
    expect(turn).toContain("elemSeated < 9");
    expect(turn).toContain("if (cost > remaining) break");
    // The fast foot is attempted last (the anchor exception).
    const prayAt = turn.indexOf("T5_COST_PRAY <= remaining");
    const fastAt = turn.indexOf("T5_COST_FAST <= remaining");
    expect(fastAt).toBeGreaterThan(prayAt);
    // A wholly empty face declines — the standing quiet face
    // renders instead of a flipped-but-blank card.
    expect(turn).toContain(
      "if (!closedSeated && elemSeated == 0 && !readingSeated && !writeSeated && !praySeated && !fastSeated)",
    );
    // Paint order: closed line → rail slots → study → pray →
    // fast foot.
    const order = [
      turn.indexOf("R.id.nx_t5_closed, View.VISIBLE"),
      turn.indexOf("fillRailSlot(context, views, slot + 1, elems[slot]"),
      turn.indexOf("R.id.nx_t5_study1,"),
      turn.indexOf("R.id.nx_t5_pray, View.VISIBLE"),
      turn.indexOf("R.id.nx_t5_fastwrap, View.VISIBLE"),
    ];
    for (const at of order) expect(at).toBeGreaterThan(-1);
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThan(order[i - 1]);
  });

  it("draws tomorrow's ≥15-minute open stretches as gap boxes in order", () => {
    expect(turn).toContain("if (pe != null && item.startMinutes - pe >= 15)");
    expect(turn).toContain('elems.add(RailRow("gap", "", "", "", 0, openDurationText(item.startMinutes - pe)))');
    // The walk is chronological and stable.
    expect(turn).toContain("tomorrow.sortBy { it.startMinutes }");
  });

  it("prints the closed line, the study subs, the pray line and the fast foot in the drawing's words", () => {
    expect(turn).toContain('"Today closed — ${closed.optInt("done")} of ${closed.optInt("total")}"');
    expect(turn).toContain('" · fast day $fastDay kept"');
    // The closed line's disc is the reached-green family:
    // container disc, the green's own check.
    expect(turn).toContain('views.setInt(R.id.nx_t5_closed_disc, "setColorFilter", pal.greenContainer)');
    expect(turn).toContain("views.setImageViewBitmap(R.id.nx_t5_closed_check, checkBitmap(pal.green))");
    expect(turn).toContain('readingText, "to read", pal');
    expect(turn).toContain('writeText, "next to write", pal');
    expect(turn).toContain('views.setTextViewText(R.id.nx_t5_pray_title, "Tomorrow\'s prayers")');
    expect(turn).toContain('"$count · $lead leads"');
    expect(turn).toContain('if (pray.optBoolean("leadEmergency")) " — emergency"');
    expect(turn).toContain('"Your fast — day ${fast.optInt("dayNumber")} begins at sunrise"');
    // The +N tile past three faces.
    expect(turn).toContain('views.setTextViewText(R.id.nx_t5_face_more_text, "+${count - 3}")');
  });
});

// ─── 9. The layout: the turn's views ────────────────────────────────────────

describe("v464 Up Next tomorrow — layout", () => {
  it("carries the nx_t5_ views, all gone but the spacer", () => {
    for (const id of [
      "nx_t5_closed", "nx_t5_closed_disc", "nx_t5_closed_check", "nx_t5_closed_text",
      "nx_t5_study1", "nx_t5_study1_tile", "nx_t5_study1_glyph", "nx_t5_study1_title", "nx_t5_study1_sub",
      "nx_t5_study2", "nx_t5_study2_tile", "nx_t5_study2_glyph", "nx_t5_study2_title", "nx_t5_study2_sub",
      "nx_t5_pray", "nx_t5_pray_title", "nx_t5_pray_sub",
      "nx_t5_face_slot_1", "nx_t5_face_slot_2", "nx_t5_face_slot_3",
      "nx_t5_ring_1", "nx_t5_face_1", "nx_t5_face_text_1",
      "nx_t5_face_more", "nx_t5_face_more_img", "nx_t5_face_more_text",
      "nx_t5_fastwrap", "nx_t5_fastline", "nx_t5_fast",
    ]) {
      expect(upNextLayout, id).toContain(`@+id/${id}`);
    }
    // The face containers start gone (the renderer seats them).
    for (const id of ["nx_t5_closed", "nx_t5_study1", "nx_t5_study2", "nx_t5_pray", "nx_t5_fastwrap"]) {
      const at = upNextLayout.indexOf(`@+id/${id}"`);
      expect(upNextLayout.slice(at, at + 400), id).toContain('android:visibility="gone"');
    }
  });

  it("seats the closed line between the message and the rail, and the turn's rows inside the rail after the slots", () => {
    const msgAt = upNextLayout.indexOf("@+id/next_msg");
    const closedAt = upNextLayout.indexOf("@+id/nx_t5_closed");
    const railAt = upNextLayout.indexOf("@+id/next_rail");
    expect(closedAt).toBeGreaterThan(msgAt);
    expect(closedAt).toBeLessThan(railAt);
    const lastSlotAt = upNextLayout.indexOf("@+id/nx_row_9");
    const studyAt = upNextLayout.indexOf("@+id/nx_t5_study1");
    const fastAt = upNextLayout.indexOf("@+id/nx_t5_fastwrap");
    expect(studyAt).toBeGreaterThan(lastSlotAt);
    expect(fastAt).toBeGreaterThan(studyAt);
  });
});

// ─── 10. Part B: the mode-aware palette resolution ──────────────────────────

describe("v464 widget dark mode — palette resolution", () => {
  it("reads the mode from the provider context's own configuration", () => {
    const night = rendererFn("deviceIsNight");
    expect(night).toContain("context.resources.configuration.uiMode");
    expect(night).toContain("Configuration.UI_MODE_NIGHT_MASK");
    expect(night).toContain("Configuration.UI_MODE_NIGHT_YES");
  });

  it("at night: seed × dark first, then the device's dark tones, then the standing palette", () => {
    const eff = rendererFn("effectivePalette");
    const darkAt = eff.indexOf("WidgetPalette.darkFromSnapshot(root, snapshot)");
    const deviceAt = eff.indexOf("devicePalette(context, snapshot, night = true)");
    const standingAt = eff.indexOf("return snapshot", deviceAt);
    expect(darkAt).toBeGreaterThan(-1);
    expect(deviceAt).toBeGreaterThan(darkAt);
    expect(standingAt).toBeGreaterThan(deviceAt);
    // In light the v442 order stands verbatim (its own pin in
    // widgets-v442, re-pinned for the new signature).
    expect(eff).toContain("return devicePalette(context, snapshot, night = false) ?: snapshot");
  });

  it("the device palette's night assignment is Material You's dark role map over the same ramps", () => {
    const device = rendererFn("devicePalette");
    expect(device).toContain("if (night) android.R.color.system_accent1_200 else android.R.color.system_accent1_600");
    expect(device).toContain("if (night) android.R.color.system_neutral1_900 else android.R.color.system_neutral1_50");
    expect(device).toContain("if (night) android.R.color.system_neutral1_50 else android.R.color.system_neutral1_900");
    expect(device).toContain("if (night) android.R.color.system_accent2_700 else android.R.color.system_accent2_100");
    expect(device).toContain("if (night) android.R.color.system_accent2_100 else android.R.color.system_accent2_900");
    // The v442 claim that caused the bug is gone from the code.
    expect(renderer).not.toContain("are night-qualified, so light/dark follows");
  });

  it("the snapshot's dark palette reads the paletteDark key, whole", () => {
    // darkFromSnapshot is a WidgetPalette companion function
    // (no `private`), so slice it directly.
    const darkAt = renderer.indexOf("fun darkFromSnapshot");
    expect(darkAt).toBeGreaterThan(-1);
    const darkRest = renderer.slice(darkAt);
    const darkNext = darkRest.indexOf("\n      /**");
    const dark = darkNext < 0 ? darkRest : darkRest.slice(0, darkNext);
    expect(dark).toContain('root?.optJSONObject("paletteDark")');
    // Taken whole: every role comes from the one object.
    for (const key of ["surface", "surfaceAlt", "ink", "body", "muted", "primary", "container", "chip", "track", "green"]) {
      expect(dark).toContain(`hex("${key}"`);
    }
  });

  it("the push layer derives and rides BOTH appearances of the seed", () => {
    expect(pushSource).toContain("loadWidgetPaletteDark");
    expect(pushSource).toContain('buildWidgetPalette("dark", themeId)');
    expect(pushSource).toContain("serializeWidgetSnapshots(snapshots, widgetScheme(), palette, paletteDark)");
    const snapshots = buildAllWidgetSnapshots({
      people: [],
      fasts: [],
      xpRaw: null,
      events: [],
      todos: [],
      ministries: [],
      studyState: EMPTY_STUDY,
      imports: {},
      resolveChapter: () => null,
      now: NOW,
    });
    const withDark = JSON.parse(
      serializeWidgetSnapshots(
        snapshots,
        "testscheme",
        buildWidgetPalette("light", "default"),
        buildWidgetPalette("dark", "default"),
      ),
    ) as Record<string, unknown>;
    expect((withDark.paletteDark as { primary: string }).primary).toBe(
      buildWidgetPalette("dark", "default").primary,
    );
    expect((withDark.paletteDark as { surface: string }).surface).toBe(
      buildWidgetPalette("dark", "default").surface,
    );
    const without = JSON.parse(serializeWidgetSnapshots(snapshots, "testscheme")) as Record<string, unknown>;
    expect("paletteDark" in without).toBe(false);
  });

  it("the glyph factories take palette colours — no light-only paint strands a glyph on dark", () => {
    // Hearts: lit wears the palette primary, resting the
    // palette chip (the SEED/RING_OFF lazies only answer when
    // the passed colour IS those constants — the Classic
    // light defaults).
    expect(renderer).toContain("heartBitmap(if (slot <= hearts) pal.primary else pal.chip)");
    // Checks, clock, flame, bars: palette colours at the call.
    expect(renderer).toContain("checkBitmap(pal.green)");
    expect(renderer).toContain("clockBitmap(pal.primary)");
    expect(renderer).toContain("flameBitmap(pal.primary)");
    // The T5 study tile: the white book glyph stands on the
    // palette primary — a saturated tile in both appearances.
    const studyRow = rendererFn("fillT5StudyRow");
    expect(studyRow).toContain('views.setInt(tileId, "setColorFilter", pal.primary)');
    expect(studyRow).toContain("views.setImageViewBitmap(glyphId, bookBitmap())");
  });

  it("the builder documents the diagnosis where the next reader will find it", () => {
    expect(snapshotsSource).toContain("paletteDark");
    expect(renderer).toContain("raw tonal RAMPS");
  });
});
