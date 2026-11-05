/**
 * v445 — three device verdicts from Nov 5, fixed in one build:
 *
 * 1. UP NEXT (his screenshots 13:49–13:51). Before he opened
 *    the app the widget showed only a bare NOW row and two
 *    "open" gap rows: the stored snapshot was still v443-format
 *    (kinds done/past/item/gap) and the v444 renderer mapped
 *    none of them, so every item was silently dropped. After
 *    opening the app the rows came, but the current row's NOW
 *    label stood outside its row frame and rendered as a stray
 *    line, the hero band clipped its countdown pill, the
 *    following item was starved out of the rail height, and
 *    the hero carried no sub. Now: the snapshot carries the
 *    whole day (dayItems + dateIso) and the renderer recomputes
 *    last/current/next AT RENDER TIME from the device clock;
 *    the entries walk survives as a fallback, extended with
 *    the legacy kinds and a gap-only guard; NOW is always its
 *    own rail row; rows are chosen by a height budget, not a
 *    tall/short branch; the hero band is back to the mockup's
 *    proportions; subs fall back to linked people's names.
 * 2. EMERGENCY STRIP. "Obviously that everything doesn't fit"
 *    (chip + pill overflowed the bottom row), then his ruling:
 *    the strip needs no hours chip at all — "Not in the
 *    widget anyway." The chip is deleted, the multi-row lines
 *    lose their hours suffix, the strip countdown helpers are
 *    gone, and the strip is tightened throughout.
 * 3. READING STRIP. "I don't need to know how many I've
 *    written. I need to know where I'm at reading." The strip
 *    read the WRITING track; it now reads the snapshot's
 *    reading fields, computed from getReadingPosition. The
 *    writing behaviour survives only as the fallback for
 *    snapshots pushed before the reading fields rode.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { bookColorsFor } from "../bible-v205/book-colors";
import { addPerson } from "../prayercircle-data";
import type { ScheduleEvent, ScheduleMinistry, ScheduleTodo } from "../schedule-data";
import { buildStudySnapshot, buildUpNextSnapshot } from "../widget-snapshots";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const MODULE = "modules/expo-prayercircle-widgets";
const MODULE_ANDROID = `${MODULE}/android/src/main`;
const MODULE_KOTLIN = `${MODULE_ANDROID}/java/expo/modules/prayercirclewidgets`;
const MODULE_RES = `${MODULE_ANDROID}/res`;

const layout = (name: string) => read(`${MODULE_RES}/layout/${name}.xml`);
const renderer = read(`${MODULE_KOTLIN}/WidgetRenderer.kt`);
const snapshotsSource = read("lib/widget-snapshots.ts");

/** The full text of the opening tag that carries the given id. */
function tagWithId(xml: string, id: string): string {
  const at = xml.indexOf(`@+id/${id}"`);
  expect(at, `id ${id} present`).toBeGreaterThan(-1);
  const start = xml.lastIndexOf("<", at);
  const end = xml.indexOf(">", at);
  return xml.slice(start, end + 1);
}

/** The body of one renderer function, from its declaration to
 * the next top-level declaration. */
function rendererFn(name: string): string {
  const at = renderer.indexOf(`private fun ${name}`);
  expect(at, `${name} present`).toBeGreaterThan(-1);
  const rest = renderer.slice(at + 10);
  const next = rest.indexOf("\n  private fun ");
  return next < 0 ? rest : rest.slice(0, next);
}

const DAY = "2026-11-05";
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
const mn = (o: Partial<ScheduleMinistry>): ScheduleMinistry => ({
  id: `mn-${seq++}`,
  title: "Ministry",
  type: "Prayer",
  date: DAY,
  isCompleted: false,
  ...o,
});

/** His Thursday, the v444 fixture's shape. */
function hisThursday() {
  return {
    events: [
      ev({ title: "Rest", startTime: "08:00", endTime: "09:00", location: "Garden", isCompleted: true }),
      ev({ title: "News", startTime: "09:30", endTime: "10:00", isCompleted: true }),
      ev({ title: "Rest", startTime: "12:00", endTime: "12:30" }),
      ev({ title: "Lunch", startTime: "12:00", endTime: "13:00", location: "Home" }),
      ev({ title: "Rest", startTime: "14:00", endTime: "14:30" }),
      ev({ title: "Rest", startTime: "16:00", endTime: "16:30" }),
      ev({ title: "Gardening", startTime: "18:00", endTime: "19:00" }),
      ev({ title: "Dinner", startTime: "20:00", endTime: "21:00", location: "Home" }),
      ev({ title: "Rest", startTime: "22:00", endTime: "22:30" }),
    ],
    todos: [
      td({ title: "Feed", startTime: "10:00", isCompleted: true, notes: "Aaron" }),
      td({ title: "Feed", startTime: "14:00", notes: "Aaron" }),
      td({ title: "Read", startTime: "15:00" }),
      td({ title: "Feed", startTime: "22:00", notes: "Aaron" }),
    ],
    ministries: [mn({ title: "Garden Prayer", startTime: "08:00" }), mn({ title: "Check-In", startTime: "22:00" })],
  };
}

// ─── 1. Up Next: dayItems + dateIso ─────────────────────────────────────────

describe("v445 Up Next snapshot — dayItems", () => {
  it("carries dateIso and EVERY timed item in day order (todos → events → ministries)", () => {
    const { events, todos, ministries } = hisThursday();
    const snapshot = buildUpNextSnapshot(events, todos, ministries, DAY, new Date(2026, 10, 5, 11, 57, 0));
    expect(snapshot.state).toBe("next");
    if (snapshot.state !== "next") return;
    expect(snapshot.dateIso).toBe(DAY);
    expect(snapshot.dayItems).toHaveLength(15);
    // Todos first, in the day selector's own order (uncompleted
    // first, completed last — getTodosForDate's rule). A point
    // todo (no stored end) carries hasEnd false and the +30
    // rule's end.
    expect(snapshot.dayItems[0]).toEqual({
      title: "Feed",
      sub: "Aaron",
      startMinutes: 840,
      endMinutes: 870,
      hasEnd: false,
      completed: false,
    });
    expect(snapshot.dayItems[3]).toEqual({
      title: "Feed",
      sub: "Aaron",
      startMinutes: 600,
      endMinutes: 630,
      hasEnd: false,
      completed: true,
    });
    // Then events, then ministries.
    expect(snapshot.dayItems[4].title).toBe("Rest");
    expect(snapshot.dayItems[7]).toEqual({
      title: "Lunch",
      sub: "Home",
      startMinutes: 720,
      endMinutes: 780,
      hasEnd: true,
      completed: false,
    });
    expect(snapshot.dayItems[13].title).toBe("Garden Prayer");
    expect(snapshot.dayItems[14].title).toBe("Check-In");
  });

  it("entries / leftCount / endNote are exactly the v444 values for the same day", () => {
    const { events, todos, ministries } = hisThursday();
    const snapshot = buildUpNextSnapshot(events, todos, ministries, DAY, new Date(2026, 10, 5, 11, 57, 0));
    expect(snapshot.state).toBe("next");
    if (snapshot.state !== "next") return;
    expect(snapshot.entries.map((entry) => entry.kind)).toEqual(["last", "next", "next"]);
    expect(snapshot.leftCount).toBe(11);
    expect(snapshot.endNote).toBe("Nothing after 11:00 PM");
  });

  it("the sub falls back to linked people's first names when the item's own fields are empty", () => {
    const aaron = addPerson([], "Aaron Roberts", "Family")[0];
    const melody = addPerson([], "Melody Roberts", "Family")[0];
    const people = [aaron, melody];
    const now = new Date(2026, 10, 5, 10, 0, 0);
    // A Feed todo with no note, linked to Aaron — the mockup's
    // "Feed · Aaron" comes from the link, not a note.
    const snapshot = buildUpNextSnapshot(
      [ev({ title: "Visit", startTime: "16:00", endTime: "17:00", linkedPeopleIds: [aaron.id, melody.id] })],
      [td({ title: "Feed", startTime: "14:00", linkedPeopleIds: [aaron.id] })],
      [mn({ title: "Garden Prayer", startTime: "18:00", linkedPeopleIds: [melody.id] })],
      DAY,
      now,
      people,
    );
    expect(snapshot.state).toBe("next");
    if (snapshot.state !== "next") return;
    const feed = snapshot.dayItems.find((item) => item.title === "Feed");
    expect(feed?.sub).toBe("Aaron");
    // Multiple linked people join with ", ", first names only.
    const visit = snapshot.dayItems.find((item) => item.title === "Visit");
    expect(visit?.sub).toBe("Aaron, Melody");
    const prayer = snapshot.dayItems.find((item) => item.title === "Garden Prayer");
    expect(prayer?.sub).toBe("Melody");
    // The hero entry carries the same sub.
    const hero = snapshot.entries.find((entry) => entry.isHero);
    expect(hero?.title).toBe("Feed");
    expect(hero?.sub).toBe("Aaron");
  });

  it("an item's own fields still win over linked names", () => {
    const aaron = addPerson([], "Aaron Roberts", "Family")[0];
    const snapshot = buildUpNextSnapshot(
      [ev({ title: "Lunch", startTime: "12:00", endTime: "13:00", location: "Home", linkedPeopleIds: [aaron.id] })],
      [td({ title: "Feed", startTime: "14:00", notes: "Aaron", linkedPeopleIds: [aaron.id] })],
      [],
      DAY,
      new Date(2026, 10, 5, 10, 0, 0),
      [aaron],
    );
    expect(snapshot.state).toBe("next");
    if (snapshot.state !== "next") return;
    expect(snapshot.dayItems.find((item) => item.title === "Lunch")?.sub).toBe("Home");
    expect(snapshot.dayItems.find((item) => item.title === "Feed")?.sub).toBe("Aaron");
  });

  it("buildAllWidgetSnapshots hands the people store to the Up Next builder", () => {
    expect(snapshotsSource).toContain(
      "buildUpNextSnapshot(input.events, input.todos, input.ministries, todayIso, input.now, input.people)",
    );
  });
});

// ─── 2. Up Next: the renderer ───────────────────────────────────────────────

describe("v445 Up Next renderer", () => {
  it("computes the rows at render time from dayItems when dateIso is the device's date", () => {
    const body = rendererFn("renderUpNext");
    expect(body).toContain('snap.optJSONArray("dayItems")');
    expect(body).toContain('snap.optString("dateIso") == deviceDateIso()');
    expect(body).toContain("deviceDateIso()");
    // The render-time picks mirror the builder's rules.
    expect(body).toContain("sortedBy { dayItems[it].startMinutes }");
    expect(body).toContain("sortedByDescending { dayItems[it].startMinutes }");
  });

  it("the entries fallback understands the legacy kinds — done, past, item", () => {
    const body = rendererFn("renderUpNext");
    expect(body).toContain('"done" -> entries.add(RailRow("done"');
    expect(body).toContain('"past" -> entries.add(RailRow("past"');
    expect(body).toContain('"item" -> entries.add(');
    expect(body).toContain('if (e.optBoolean("isHero")) "hero" else "item"');
  });

  it("the gap-only guard renders the quiet face instead of gap rows alone", () => {
    const body = rendererFn("renderUpNext");
    expect(body).toContain('entries.none { it.kind != "gap" }');
    const guardAt = body.indexOf('entries.none { it.kind != "gap" }');
    const after = body.slice(guardAt, guardAt + 600);
    expect(after).toContain("R.id.next_msg, View.VISIBLE");
    expect(after).toContain("R.id.next_rail, View.GONE");
  });

  it("the selection is height-budgeted: budget = heightSignal − 96, with the stated costs", () => {
    const body = rendererFn("selectRailRows");
    expect(body).toContain("val railBudget = heightSignal - 96");
    // Hero 64, plain 34, NOW 30, gap 26 — as decrements.
    expect(body).toContain("remaining -= 64");
    expect(body).toContain("remaining -= 34");
    expect(body).toContain("remaining -= 30");
    // next2 rides with its gap only when both fit.
    expect(body).toContain("34 + 26 <= remaining");
  });

  it("NOW is always its own rail row, and the current branch never stands the trailing label up", () => {
    const sel = rendererFn("selectRailRows");
    expect(sel).toContain('RailRow("now", nowTimeLabel(), "NOW", "", 0, "")');
    const slot = rendererFn("fillRailSlot");
    expect(slot).toContain('"now" -> {');
    const at = slot.indexOf('"current" -> {');
    expect(at).toBeGreaterThan(-1);
    const branch = slot.slice(at, at + 1600);
    expect(branch).not.toContain('setViewVisibility(id("now"), View.VISIBLE)');
  });
});

// ─── 3. Up Next: the layout ─────────────────────────────────────────────────

describe("v445 Up Next layout", () => {
  const full = layout("widget_up_next");

  it("every nx_now_N sits INSIDE its nx_row_N, after the check", () => {
    for (let slot = 1; slot <= 9; slot += 1) {
      const rowAt = full.indexOf(`@+id/nx_row_${slot}"`);
      const nowAt = full.indexOf(`@+id/nx_now_${slot}"`);
      const checkAt = full.indexOf(`@+id/nx_check_${slot}"`);
      expect(rowAt, `row ${slot}`).toBeGreaterThan(-1);
      expect(nowAt, `now ${slot} after its row opens`).toBeGreaterThan(rowAt);
      expect(nowAt, `now ${slot} after its check`).toBeGreaterThan(checkAt);
      if (slot < 9) {
        const nextRowAt = full.indexOf(`@+id/nx_row_${slot + 1}"`);
        expect(nowAt, `now ${slot} before the next row`).toBeLessThan(nextRowAt);
      }
    }
  });

  it("the hero band is back to mockup proportions: 10dp band padding, 20sp title", () => {
    expect(tagWithId(full, "nx_htitle_1")).toContain('android:textSize="20sp"');
    expect(full).toContain('android:paddingTop="10dp"');
    expect(full).toContain('android:paddingBottom="10dp"');
  });
});

// ─── 4. Emergency Strip: no chip, tightened ─────────────────────────────────

describe("v445 Emergency Strip", () => {
  const strip = layout("widget_emergency_strip");

  it("the hours chip is absent from the layout and from the strip renderer", () => {
    expect(strip).not.toContain("es_s_left");
    const body = rendererFn("renderEmergencyStrip");
    expect(body).not.toContain("es_s_left");
    // The strip countdown helpers are deleted outright — the
    // big Emergency widget keeps its own (emergencyLeftText).
    expect(renderer).not.toContain("fun emergencyStripLeftText");
    expect(renderer).not.toContain("fun emergencyShortLeftText");
    expect(renderer).toContain("fun emergencyLeftText");
  });

  it("the Pray now pill sits in a bottom row, after the need line", () => {
    // v446 re-pin: the pill row moved INSIDE the name column
    // (marginTop 4dp, below the need line) when the single face
    // was recomposed around the 54dp avatar — it is no longer a
    // full-width row under a separate face row. The invariant
    // this test guards stands: the need line first, then the
    // pill's own row, then the pill, at its fixed 26dp height.
    const titleAt = strip.indexOf("@+id/es_s_title");
    const bottomRowAt = strip.indexOf('android:layout_marginTop="4dp"');
    const pillAt = strip.indexOf("@+id/es_s_pill");
    expect(titleAt).toBeGreaterThan(-1);
    expect(bottomRowAt).toBeGreaterThan(titleAt);
    expect(pillAt).toBeGreaterThan(bottomRowAt);
    // The pill frame is 26dp; its text 12.5sp with 11dp pads.
    expect(tagWithId(strip, "es_s_pill")).toContain('android:layout_height="26dp"');
    expect(tagWithId(strip, "es_s_pill_text")).toContain('android:textSize="12.5sp"');
    expect(tagWithId(strip, "es_s_pill_text")).toContain('android:paddingStart="11dp"');
    expect(tagWithId(strip, "es_s_pill_text")).toContain('android:paddingEnd="11dp"');
  });

  it("the single face fits its cell: root padding 10/4, need 12sp", () => {
    // v446 re-pin: the face and name sizes moved when the
    // single face was recomposed (avatar 40/36 → 54/50, name
    // 15sp → 15.5sp, root vertical padding 5 → 4 for the fit
    // audit); those values are pinned in widgets-v446.test.ts.
    // What remains pinned here: the root's 10dp sides and the
    // need line's 12sp.
    expect(strip).toContain('android:paddingStart="10dp"');
    expect(strip).toContain('android:paddingTop="4dp"');
    expect(tagWithId(strip, "es_s_title")).toContain('android:textSize="12sp"');
  });

  it("the two-active pills are tightened, and their lines are the need alone", () => {
    expect(tagWithId(strip, "es_m_pill_text_1")).toContain('android:textSize="11.5sp"');
    expect(tagWithId(strip, "es_m_pill_text_1")).toContain('android:paddingStart="9dp"');
    expect(tagWithId(strip, "es_m_pill_text_2")).toContain('android:textSize="11.5sp"');
    const body = rendererFn("renderEmergencyStrip");
    expect(body).toContain("var line = need");
    expect(body).not.toContain("val left =");
    expect(body).not.toContain("$need · $left");
  });
});

// ─── 5. Reading Strip: the reading track ────────────────────────────────────

describe("v445 Reading Strip — reading track", () => {
  it("divergent tracks: Genesis fully written, but he is READING Leviticus at 23", () => {
    const overrides: Record<string, "complete"> = {};
    for (let chapter = 1; chapter <= 50; chapter += 1) overrides[`Genesis|${chapter}`] = "complete";
    const reads: Record<string, string> = {};
    for (let chapter = 1; chapter <= 22; chapter += 1) reads[`Leviticus|${chapter}`] = "2026-10-24";
    const snapshot = buildStudySnapshot(
      { overrides, reads, writeQueue: [], restudyQueue: [], currentBook: "Leviticus", lastRead: null },
      {},
      () => null,
    );
    expect(snapshot.state).toBe("active");
    if (snapshot.state !== "active") return;
    // The writing track of the snapshot's book says chapter 1 —
    // that is what the strip used to show. The reading fields
    // say where he actually is: Leviticus, next read 23 of 27.
    expect(snapshot.nextChapter).toBe(1);
    expect(snapshot.readingBook).toBe("Leviticus");
    expect(snapshot.readingChapter).toBe(23);
    expect(snapshot.readingFromTarget).toBe(true);
    expect(snapshot.readingTotalChapters).toBe(27);
    expect(snapshot.readingBookPrimary).toBe(bookColorsFor("Leviticus", false)?.primary);
    // (Leviticus shares the Law section's red with Genesis —
    // the point is the value comes from the READING book.)
  });

  it("the target rested (canon finished): the chapter comes from the last read", () => {
    const reads: Record<string, string> = {};
    for (let chapter = 1; chapter <= 22; chapter += 1) reads[`Revelation|${chapter}`] = "2026-10-24";
    const snapshot = buildStudySnapshot(
      { overrides: {}, reads, writeQueue: [], restudyQueue: [], currentBook: "Revelation", lastRead: null },
      {},
      () => null,
    );
    expect(snapshot.state).toBe("active");
    if (snapshot.state !== "active") return;
    expect(snapshot.readingBook).toBe("Revelation");
    expect(snapshot.readingChapter).toBe(22);
    expect(snapshot.readingFromTarget).toBe(false);
    expect(snapshot.readingTotalChapters).toBe(22);
  });

  it("the renderer prefers the reading fields and composes the Chapter X of Y line", () => {
    const body = rendererFn("renderReadingStrip");
    expect(body).toContain('snap.optString("readingBook")');
    expect(body).toContain('snap.optString("readingBookPrimary")');
    expect(body).toContain('views.setTextViewText(R.id.rs_kicker, "CURRENTLY READING")');
    expect(body).toContain('"Chapter $readingChapter of $readingTotalChapters"');
    expect(body).toContain('"Last read · Chapter $readingChapter of $readingTotalChapters"');
    // The reading branch stands before the writing fallback.
    expect(body.indexOf('snap.optString("readingBook")')).toBeLessThan(body.indexOf("val tileChapter = nextChapter ?: lastChapter"));
  });
});
