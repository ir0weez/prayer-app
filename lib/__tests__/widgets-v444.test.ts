/**
 * v444 — three widget fixes from his phone (Nov 5, ~12:00), each
 * one a place where v443 did not deliver what was agreed:
 *
 * 1. UP NEXT. The v443 rail walked up to ten rows into a rail
 *    ~105dp tall: every row after the third was measured with
 *    the leftover height, the hero band collapsed to an empty
 *    pale sliver, and everything after it vanished. Worse, the
 *    whole-day rail was never what he asked for — his corrected
 *    spec: "it just needs to show the last thing (checked off
 *    or not), the current thing, and the next (one or two)
 *    thing(s)". The snapshot model is now last / current / next
 *    / gap (five entries at most, in priority order), the
 *    renderer walks only those rows through the full layout at
 *    both height bands (the compact layout is never selected),
 *    the current row carries the NOW ring + a trailing NOW
 *    label, and the rows are slimmed so the core three fit the
 *    rail a tall placement actually offers.
 * 2. EMERGENCY STRIP. The second line printed the item's short
 *    title label ("Dad") instead of the need sentence; the
 *    hours chip rendered as a solid pale pill with invisible
 *    text; the Pray now pill's white ground never painted. The
 *    line now leads with the emergency's note (its sentence),
 *    the chip is an opaque deep-red pill with white text (the
 *    main widget's TextView-background construction), and the
 *    pill frames carry fixed heights with their images stood
 *    up explicitly in the renderer.
 * 3. READING STRIP. The tile wore the dark-appearance book
 *    colour (the primary mixed toward white — a pale tint)
 *    instead of the book's solid primary, showed the glyph for
 *    a fully written book instead of a number, and its line
 *    overflowed on the "· Last written · Chapter N" tail. The
 *    snapshot now carries bookPrimary (the true light-set
 *    primary) and the strip pins it in every state; the tile
 *    stands the last written chapter when the book is fully
 *    written; the line is "Fully written", full stop.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { ScheduleEvent, ScheduleMinistry, ScheduleTodo } from "../schedule-data";
import {
  buildStudySnapshot,
  buildUpNextSnapshot,
  serializeWidgetSnapshots,
  type AllWidgetSnapshots,
} from "../widget-snapshots";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const MODULE = "modules/expo-prayercircle-widgets";
const MODULE_ANDROID = `${MODULE}/android/src/main`;
const MODULE_KOTLIN = `${MODULE_ANDROID}/java/expo/modules/prayercirclewidgets`;
const MODULE_RES = `${MODULE_ANDROID}/res`;

const layout = (name: string) => read(`${MODULE_RES}/layout/${name}.xml`);
const renderer = read(`${MODULE_KOTLIN}/WidgetRenderer.kt`);

/** The full text of the opening tag that carries the given id. */
function tagWithId(xml: string, id: string): string {
  const at = xml.indexOf(`@+id/${id}"`);
  expect(at, `id ${id} present`).toBeGreaterThan(-1);
  const start = xml.lastIndexOf("<", at);
  const end = xml.indexOf(">", at);
  return xml.slice(start, end + 1);
}

/** The body of one renderer function, from its declaration to
 * the next top-level declaration — source pins stay scoped to
 * the function they describe. */
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

/** His Thursday, the shape the scratch reproduction printed:
 * the morning done or lapsed, two 12:00 items ahead of an 11:57
 * now, and the day running to an 11:00 PM end. */
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

// ─── 1. The last / current / next model ─────────────────────────────────────

describe("v444 Up Next model", () => {
  it("his Thursday at 11:57: the last thing done, no current, the two 12:00 items next", () => {
    const { events, todos, ministries } = hisThursday();
    const snapshot = buildUpNextSnapshot(events, todos, ministries, DAY, new Date(2026, 10, 5, 11, 57, 0));
    expect(snapshot.state).toBe("next");
    if (snapshot.state !== "next") return;
    // Nothing runs at 11:57 — the morning's last end was the
    // 10:00 Feed (done), the next things both start at 12:00.
    expect(snapshot.entries.map((entry) => entry.kind)).toEqual(["last", "next", "next"]);
    const last = snapshot.entries[0];
    expect(last.title).toBe("Feed");
    expect(last.completed).toBe(true);
    expect(last.timeLabel).toBe("10:00 AM");
    // The hero is the group's lead — Rest, listed before Lunch
    // at the same start — and Lunch rides as the second next.
    // No gap: Lunch starts before Rest even ends.
    const hero = snapshot.entries[1];
    expect(hero.isHero).toBe(true);
    expect(hero.title).toBe("Rest");
    expect(hero.startMinutes).toBe(720);
    expect(snapshot.entries[2].title).toBe("Lunch");
    expect(snapshot.entries[2].sub).toBe("Home");
    expect(snapshot.leftCount).toBe(11);
    expect(snapshot.endNote).toBe("Nothing after 11:00 PM");
  });

  it("an uncompleted last rides with completed: false; a completed one with true", () => {
    const snapshot = buildUpNextSnapshot(
      [
        ev({ title: "Left hanging", startTime: "09:00", endTime: "09:30" }),
        ev({ title: "Hero", startTime: "12:00", endTime: "13:00" }),
      ],
      [],
      [],
      DAY,
      new Date(2026, 10, 5, 10, 0, 0),
    );
    expect(snapshot.state).toBe("next");
    if (snapshot.state !== "next") return;
    expect(snapshot.entries[0]).toMatchObject({ kind: "last", title: "Left hanging", completed: false });

    const doneSnapshot = buildUpNextSnapshot(
      [
        ev({ title: "Finished", startTime: "09:00", endTime: "09:30", isCompleted: true }),
        ev({ title: "Hero", startTime: "12:00", endTime: "13:00" }),
      ],
      [],
      [],
      DAY,
      new Date(2026, 10, 5, 10, 0, 0),
    );
    expect(doneSnapshot.state).toBe("next");
    if (doneSnapshot.state !== "next") return;
    expect(doneSnapshot.entries[0]).toMatchObject({ kind: "last", title: "Finished", completed: true });
  });

  it("the current thing is the uncompleted item running now — latest start wins", () => {
    const snapshot = buildUpNextSnapshot(
      [
        ev({ title: "Feed", startTime: "10:00", endTime: "10:30", isCompleted: true }),
        ev({ title: "Rest", startTime: "12:00", endTime: "12:30", isCompleted: true }),
        ev({ title: "Lunch", startTime: "12:00", endTime: "13:00", location: "Home" }),
        ev({ title: "Dinner", startTime: "20:00", endTime: "21:00" }),
      ],
      [],
      [],
      DAY,
      new Date(2026, 10, 5, 12, 15, 0),
    );
    expect(snapshot.state).toBe("next");
    if (snapshot.state !== "next") return;
    expect(snapshot.entries.map((entry) => entry.kind)).toEqual(["last", "current", "next"]);
    // Rest is completed, so it is never the current — but it is
    // not the last either (it has not ended yet at 12:15): the
    // last is the morning's Feed.
    expect(snapshot.entries[0].title).toBe("Feed");
    expect(snapshot.entries[1]).toMatchObject({ kind: "current", title: "Lunch", sub: "Home" });
    expect(snapshot.entries[2]).toMatchObject({ title: "Dinner", isHero: true });
  });

  it("a point item (no stored end) counts as the last once started, when it is not the current", () => {
    const snapshot = buildUpNextSnapshot(
      [ev({ title: "Studio", startTime: "10:15", endTime: "11:00" }), ev({ title: "Hero", startTime: "12:00", endTime: "13:00" })],
      [td({ title: "Feed", startTime: "10:00", notes: "Aaron" })],
      [],
      DAY,
      new Date(2026, 10, 5, 10, 20, 0),
    );
    expect(snapshot.state).toBe("next");
    if (snapshot.state !== "next") return;
    // Studio is the current (later start); the Feed todo, a
    // point item, already started — it is the last thing, not
    // invisible and not the current.
    expect(snapshot.entries.map((entry) => entry.kind)).toEqual(["last", "current", "next"]);
    expect(snapshot.entries[0]).toMatchObject({ title: "Feed", completed: false, sub: "Aaron" });
    expect(snapshot.entries[1].title).toBe("Studio");
  });

  it("the gap rides only between the two nexts, and only at 15 open minutes", () => {
    const wide = buildUpNextSnapshot(
      [ev({ title: "Hero", startTime: "14:00", endTime: "15:00" }), ev({ title: "After", startTime: "15:15", endTime: "16:00" })],
      [],
      [],
      DAY,
      new Date(2026, 10, 5, 10, 0, 0),
    );
    expect(wide.state).toBe("next");
    if (wide.state !== "next") return;
    expect(wide.entries.map((entry) => entry.kind)).toEqual(["next", "gap", "next"]);
    expect(wide.entries[1].text).toBe("15 minutes open");

    const tight = buildUpNextSnapshot(
      [ev({ title: "Hero", startTime: "14:00", endTime: "15:00" }), ev({ title: "After", startTime: "15:10", endTime: "16:00" })],
      [],
      [],
      DAY,
      new Date(2026, 10, 5, 10, 0, 0),
    );
    expect(tight.state).toBe("next");
    if (tight.state !== "next") return;
    expect(tight.entries.map((entry) => entry.kind)).toEqual(["next", "next"]);
  });

  it("the hero is next-1: the first next carries isHero, the second does not", () => {
    const snapshot = buildUpNextSnapshot(
      [ev({ title: "First", startTime: "14:00", endTime: "15:00" }), ev({ title: "Second", startTime: "16:00", endTime: "17:00" })],
      [],
      [],
      DAY,
      new Date(2026, 10, 5, 10, 0, 0),
    );
    expect(snapshot.state).toBe("next");
    if (snapshot.state !== "next") return;
    const nexts = snapshot.entries.filter((entry) => entry.kind === "next");
    expect(nexts).toHaveLength(2);
    expect(nexts[0].isHero).toBe(true);
    expect(nexts[1].isHero).toBeUndefined();
  });

  it("day over: no current and no next is the quiet state — even with a last behind it", () => {
    const snapshot = buildUpNextSnapshot(
      [ev({ title: "Done", startTime: "08:00", endTime: "09:00", isCompleted: true })],
      [],
      [],
      DAY,
      new Date(2026, 10, 5, 10, 0, 0),
    );
    expect(snapshot.state).toBe("none");
  });

  it("a current with nothing ahead still stands — leftCount 0, no end note", () => {
    const snapshot = buildUpNextSnapshot(
      [ev({ title: "Long thing", startTime: "09:00", endTime: "23:00" })],
      [],
      [],
      DAY,
      new Date(2026, 10, 5, 10, 0, 0),
    );
    expect(snapshot.state).toBe("next");
    if (snapshot.state !== "next") return;
    expect(snapshot.entries.map((entry) => entry.kind)).toEqual(["current"]);
    expect(snapshot.leftCount).toBe(0);
    expect(snapshot.endNote).toBeNull();
  });

  it("the hero survives the JSON round trip under the exact keys the renderer reads", () => {
    const { events, todos, ministries } = hisThursday();
    const upNext = buildUpNextSnapshot(events, todos, ministries, DAY, new Date(2026, 10, 5, 11, 57, 0));
    const snapshots = {
      prayToday: { state: "none" },
      emergency: { state: "none" },
      fast: { state: "none" },
      reachOut: { state: "none" },
      upNext,
      study: { state: "none" },
    } as unknown as AllWidgetSnapshots;
    const parsed = JSON.parse(serializeWidgetSnapshots(snapshots, "testscheme://"));
    const entries = parsed.upNext.entries as Array<Record<string, unknown>>;
    const hero = entries.find((entry) => entry.isHero === true);
    expect(hero).toBeDefined();
    // The renderer's own reads: kind / timeLabel / title / sub /
    // startMinutes / isHero / text / completed (WidgetRenderer
    // renderUpNext's entry walk).
    expect(hero?.kind).toBe("next");
    expect(hero?.title).toBe("Rest");
    expect(hero?.timeLabel).toBe("12:00 PM");
    expect(hero?.startMinutes).toBe(720);
    const lunch = entries.find((entry) => entry.title === "Lunch");
    expect(lunch?.sub).toBe("Home");
    const last = entries.find((entry) => entry.kind === "last");
    expect(last?.title).toBe("Feed");
    expect(last?.completed).toBe(true);
  });
});

// ─── 2. The renderer: rows, the current dress, the hero's text ──────────────

describe("v444 Up Next renderer", () => {
  it("never selects the compact layout — both bands walk the full layout's slots", () => {
    const body = rendererFn("renderUpNext");
    expect(body).toContain("R.layout.widget_up_next");
    expect(body).not.toContain("widget_up_next_compact");
    // The compact fill path is gone from the renderer entirely.
    expect(renderer).not.toContain("fillRailCompact");
    expect(renderer).not.toContain("R.id.nc_rows");
  });

  it("maps the snapshot's last onto the done / past dresses by its completed flag", () => {
    const body = rendererFn("renderUpNext");
    expect(body).toContain('"last" -> entries.add(');
    expect(body).toContain('if (e.optBoolean("completed")) "done" else "past"');
    expect(body).toContain('"current" -> entries.add(RailRow("current"');
    expect(body).toContain('if (e.optBoolean("isHero")) "hero" else "item"');
  });

  it("the short band keeps only the current-or-NOW row and the hero", () => {
    const body = rendererFn("fillRailFull");
    expect(body).toContain('entries.firstOrNull { it.kind == "hero" }');
    expect(body).toContain('RailRow("now", nowTimeLabel(), "NOW", "", 0, "")');
  });

  it("the current row wears the NOW ring and the trailing NOW label; the slot reset clears it", () => {
    const body = rendererFn("fillRailSlot");
    expect(body).toContain('views.setViewVisibility(id("now"), View.GONE)');
    const at = body.indexOf('"current" -> {');
    expect(at).toBeGreaterThan(-1);
    const branch = body.slice(at, at + 1600);
    expect(branch).toContain('views.setViewVisibility(id("ring"), View.VISIBLE)');
    expect(branch).toContain('views.setInt(id("dot"), "setColorFilter", pal.primary)');
    expect(branch).toContain('views.setViewVisibility(id("now"), View.VISIBLE)');
    expect(branch).toContain('views.setTextViewText(id("now"), "NOW")');
    expect(branch).toContain("pal.primary");
  });

  it("the hero branch stands the band up and writes its title and countdown", () => {
    const body = rendererFn("fillRailSlot");
    const at = body.indexOf('"hero" -> {');
    expect(at).toBeGreaterThan(-1);
    const branch = body.slice(at, at + 1400);
    expect(branch).toContain('views.setViewVisibility(id("band"), View.VISIBLE)');
    expect(branch).toContain('views.setTextViewText(id("htitle"), row.title)');
    expect(branch).toContain('views.setTextViewText(id("hcount"), countdownText(row.startMinutes, nowMinutes()))');
  });

  it("every slot carries the trailing NOW label view, gone by default", () => {
    const full = layout("widget_up_next");
    for (let slot = 1; slot <= 9; slot += 1) {
      expect(tagWithId(full, `nx_now_${slot}`)).toContain('android:text="NOW"');
      expect(tagWithId(full, `nx_now_${slot}`)).toContain('android:visibility="gone"');
    }
  });
});

// ─── 3. Emergency Strip ─────────────────────────────────────────────────────

describe("v444 Emergency Strip", () => {
  it("the line leads with the need sentence (the note), the title as its fallback — single and rows", () => {
    const body = rendererFn("renderEmergencyStrip");
    expect(body).toContain('if (note.isNotBlank()) note else row.optString("title")');
    expect(body).toContain('val need = if (note.isNotBlank()) note else row.optString("title")');
  });

  it("the Pray now pill's white ground is stood up explicitly in both compositions", () => {
    const body = rendererFn("renderEmergencyStrip");
    expect(body).toContain("views.setViewVisibility(R.id.es_s_pill_img, View.VISIBLE)");
    expect(body).toContain("views.setImageViewResource(R.id.es_s_pill_img, R.drawable.widget_pill_white)");
    expect(body).toContain("views.setViewVisibility(ES_M_PILL_IMGS[slot], View.VISIBLE)");
    expect(body).toContain("views.setImageViewResource(ES_M_PILL_IMGS[slot], R.drawable.widget_pill_white)");
  });

  it("the pill frames carry fixed heights, like the main widget's 40dp pill", () => {
    const strip = layout("widget_emergency_strip");
    expect(tagWithId(strip, "es_s_pill")).toContain('android:layout_height="30dp"');
    expect(tagWithId(strip, "es_m_pill_1")).toContain('android:layout_height="26dp"');
    expect(tagWithId(strip, "es_m_pill_2")).toContain('android:layout_height="26dp"');
  });

  it("the hours chip is an opaque deep-red pill worn as the text's own background", () => {
    const strip = layout("widget_emergency_strip");
    expect(tagWithId(strip, "es_s_left")).toContain('android:background="@drawable/widget_pill_deep_red"');
    expect(tagWithId(strip, "es_s_left")).toContain('android:textColor="#FFFFFF"');
    // The v443 image-under-text chip construction is gone.
    expect(strip).not.toContain("es_s_chip_img");
    const deep = read(`${MODULE_RES}/drawable/widget_pill_deep_red.xml`);
    expect(deep).toContain('<solid android:color="#7F1D1D" />');
  });

  it("the name is a single ellipsized line inside the weighted column", () => {
    const strip = layout("widget_emergency_strip");
    expect(tagWithId(strip, "es_s_name")).toContain('android:ellipsize="end"');
    expect(tagWithId(strip, "es_s_name")).toContain('android:maxLines="1"');
    // The column the name lives in takes the row's leftover
    // width (0dp + weight) — the name can never push past the
    // card's edge.
    const columnAt = strip.indexOf("@+id/es_s_name");
    const columnStart = strip.lastIndexOf("<LinearLayout", columnAt);
    const columnTag = strip.slice(columnStart, strip.indexOf(">", columnStart) + 1);
    expect(columnTag).toContain('android:layout_width="0dp"');
    expect(columnTag).toContain('android:layout_weight="1"');
  });
});

// ─── 4. Reading Strip ───────────────────────────────────────────────────────

describe("v444 Reading Strip", () => {
  it("the snapshot carries bookPrimary — the true light-set primary, not the dark mix", () => {
    const snapshot = buildStudySnapshot(
      { overrides: {}, reads: {}, writeQueue: [], restudyQueue: [], currentBook: "Genesis", lastRead: null },
      {},
      () => null,
    );
    expect(snapshot.state).toBe("active");
    if (snapshot.state !== "active") return;
    // Genesis is red; its light-set primary is the solid book red.
    expect(snapshot.bookPrimary).toBe("#C62828");
    // bookColor (the dark-appearance mix toward white) is a
    // different, paler value — the v443 tile's tint.
    expect(snapshot.bookColor).not.toBe(snapshot.bookPrimary);
  });

  it("the tile resolves bookPrimary first and stands it in every state", () => {
    const body = rendererFn("renderReadingStrip");
    expect(body).toContain('snap.optString("bookPrimary")');
    expect(body).toContain('views.setInt(R.id.rs_tile, "setColorFilter", bookColor)');
    // The number in the tile: next chapter, else the LAST
    // WRITTEN chapter — the glyph only when neither exists.
    expect(body).toContain("val tileChapter = nextChapter ?: lastChapter");
    expect(body).toContain("views.setTextViewText(R.id.rs_tile_num, tileChapter.toString())");
  });

  it("a fully written book: the line is \"Fully written\" only — no last-written tail", () => {
    const body = rendererFn("renderReadingStrip");
    expect(body).toContain('"Fully written"');
    expect(body).not.toContain("Last written · Chapter");
    expect(body).toContain('"$nextChapter of $totalChapters"');
  });

  it("a fully written Genesis snapshot: nextChapter null, last written 50", () => {
    const overrides: Record<string, "complete"> = {};
    for (let chapter = 1; chapter <= 50; chapter += 1) overrides[`Genesis|${chapter}`] = "complete";
    const snapshot = buildStudySnapshot(
      { overrides, reads: {}, writeQueue: [], restudyQueue: [], currentBook: "Genesis", lastRead: null },
      {},
      () => null,
    );
    expect(snapshot.state).toBe("active");
    if (snapshot.state !== "active") return;
    expect(snapshot.nextChapter).toBeNull();
    expect(snapshot.lastWrittenChapter).toBe(50);
    expect(snapshot.bookPrimary).toBe("#C62828");
  });
});
