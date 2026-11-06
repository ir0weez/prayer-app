/**
 * v443 part 1 — the Up Next rail fixes, from his phone (Nov 5,
 * 10:51): the widget sat in his large top slot but rendered the
 * COMPACT face — hero, one following row, then a large empty card
 * bottom — with no done row at all. Three causes, three fixes:
 *
 * A. The providers read ONLY OPTION_APPWIDGET_MIN_HEIGHT, and on
 *    his Pixel that figure came back under the 190dp full-rail
 *    threshold despite the tall placement. The providers now pass
 *    a robust heightSignal — the max of MIN_HEIGHT, MAX_HEIGHT,
 *    and (API 31+) the largest height in the SIZES list — and the
 *    rail's full threshold drops to 160. Emergency's tall bar
 *    stays at 190, fed by the same signal.
 * B. The snapshot's buckets skipped a started-but-uncompleted
 *    item entirely (dones are completed only, the sequence is
 *    strictly future): his 10:00 AM Feed, the last thing above
 *    the 12:00 Lunch, vanished. ONE "past" entry now rides the
 *    rail after the dones, before the hero, and the entries cap
 *    rises from 8 to 10.
 * C/D. The renderer maps "past" to a muted row (chip dot, body
 *    title, no strike, no check) and seats its NOW row after the
 *    done AND past rows; the time column widens 54dp → 64dp in
 *    both rail layouts so "12:00 PM" never ellipsizes again.
 *
 * v444 amendment (same day): the rail model is replaced by
 * Jonathan's corrected spec — last / current / next / gap — after
 * the ten-row walk starved the hero band into an empty sliver on
 * his phone. The past-entry scenarios below are re-pinned to the
 * "last" entry (the most recent thing that ended, completed or
 * not); the height-signal and time-column sections stand as
 * written (the signal and the 160 bar survive — the bar now
 * picks the row set inside the one full layout). The deep v444
 * pins live in widgets-v444.test.ts.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { ScheduleEvent, ScheduleTodo } from "../schedule-data";
import { buildUpNextSnapshot } from "../widget-snapshots";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const MODULE = "modules/expo-prayercircle-widgets";
const MODULE_ANDROID = `${MODULE}/android/src/main`;
const MODULE_KOTLIN = `${MODULE_ANDROID}/java/expo/modules/prayercirclewidgets`;
const MODULE_RES = `${MODULE_ANDROID}/res`;

const layout = (name: string) => read(`${MODULE_RES}/layout/${name}.xml`);
const renderer = read(`${MODULE_KOTLIN}/WidgetRenderer.kt`);
const providers = read(`${MODULE_KOTLIN}/WidgetProviders.kt`);

/** The full text of the opening tag that carries the given id. */
function tagWithId(xml: string, id: string): string {
  const at = xml.indexOf(`@+id/${id}"`);
  expect(at, `id ${id} present`).toBeGreaterThan(-1);
  const start = xml.lastIndexOf("<", at);
  const end = xml.indexOf(">", at);
  return xml.slice(start, end + 1);
}

// ─── 1. The last entry (v444 re-pins of the past-entry scenarios) ───────────

describe("v443 Up Next past entry — v444 last entry", () => {
  const FIXED = new Date(2026, 10, 5, 10, 30, 0); // Nov 5 2026, 10:30 local
  const DAY = "2026-11-05";
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

  it("the started, uncompleted item rides as the last entry — before the hero", () => {
    // His Thursday, as the widget saw it at 10:51: Rest done in
    // the garden, the 10:00 Feed (Aaron) started and never
    // checked off, Lunch at noon as the hero. (v444: kinds
    // done/past/item are now last/next, and the last carries
    // its completed flag.)
    const snapshot = buildUpNextSnapshot(
      [
        event({ title: "Rest", startTime: "08:00", endTime: "09:00", isCompleted: true, location: "Garden" }),
        event({ title: "Lunch", startTime: "12:00", endTime: "13:00", location: "Home" }),
      ],
      [todo({ title: "Feed", startTime: "10:00", notes: "Aaron" })],
      [],
      DAY,
      FIXED,
    );
    expect(snapshot.state).toBe("next");
    if (snapshot.state !== "next") return;
    expect(snapshot.entries.map((entry) => entry.kind)).toEqual(["last", "next"]);
    const last = snapshot.entries[0];
    expect(last.title).toBe("Feed");
    expect(last.timeLabel).toBe("10:00 AM");
    expect(last.completed).toBe(false);
    // The last entry carries its sub by the same rule as the
    // next entries (a todo's notes).
    expect(last.sub).toBe("Aaron");
    const hero = snapshot.entries[1];
    expect(hero.isHero).toBe(true);
    expect(hero.title).toBe("Lunch");
    // The last row is not "left" — leftCount still counts only
    // what is ahead, hero included.
    expect(snapshot.leftCount).toBe(1);
    expect(snapshot.endNote).toBe("Nothing after 1:00 PM");
  });

  it("one last only: the most recent end wins, completed or not", () => {
    // Was: "a completed past item stays a done — it never
    // duplicates as the past entry". The v444 model has ONE
    // last slot: the uncompleted 9:45 item ended most recently
    // (10:15), so it takes the slot and the completed 9:00 item
    // does not ride at all.
    const snapshot = buildUpNextSnapshot(
      [
        event({ title: "Done thing", startTime: "09:00", endTime: "09:30", isCompleted: true }),
        event({ title: "Left hanging", startTime: "09:45", endTime: "10:15" }),
        event({ title: "Lunch", startTime: "12:00", endTime: "13:00" }),
      ],
      [],
      [],
      DAY,
      FIXED,
    );
    expect(snapshot.state).toBe("next");
    if (snapshot.state !== "next") return;
    expect(snapshot.entries.map((entry) => entry.kind)).toEqual(["last", "next"]);
    expect(snapshot.entries[0].title).toBe("Left hanging");
    expect(snapshot.entries[0].completed).toBe(false);
    expect(snapshot.entries.some((entry) => entry.title === "Done thing")).toBe(false);
  });

  it("only the MOST RECENT uncompleted past item rides — earlier ones stay off the list", () => {
    const snapshot = buildUpNextSnapshot(
      [
        event({ title: "Earlier", startTime: "09:00", endTime: "09:30" }),
        event({ title: "Feed", startTime: "10:00", endTime: "10:30" }),
        event({ title: "Lunch", startTime: "12:00", endTime: "13:00" }),
      ],
      [],
      [],
      DAY,
      FIXED,
    );
    expect(snapshot.state).toBe("next");
    if (snapshot.state !== "next") return;
    const lasts = snapshot.entries.filter((entry) => entry.kind === "last");
    expect(lasts).toHaveLength(1);
    expect(lasts[0].title).toBe("Feed");
    expect(snapshot.entries.some((entry) => entry.title === "Earlier")).toBe(false);
  });

  it("no last entry when the hero is the day's first timed item", () => {
    const snapshot = buildUpNextSnapshot(
      [
        event({ title: "Hero", startTime: "11:00", endTime: "11:30" }),
        event({ title: "After", startTime: "11:30", endTime: "12:00" }),
      ],
      [],
      [],
      DAY,
      FIXED,
    );
    expect(snapshot.state).toBe("next");
    if (snapshot.state !== "next") return;
    expect(snapshot.entries.some((entry) => entry.kind === "last")).toBe(false);
    expect(snapshot.entries.map((entry) => entry.kind)).toEqual(["next", "next"]);
  });

  it("no cap to count against any more — the list is last + the next two, however long the day", () => {
    // Was: "the cap counts dones and past against the same 10".
    // The v444 list is bounded by its model, not a cap: the
    // 10:00 Feed is the last (it ended at 10:30), the two noon-
    // ward items are the nexts, and the other ten ahead items
    // live only in leftCount and the end note.
    const hours = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
    const snapshot = buildUpNextSnapshot(
      [
        event({ title: "Done one", startTime: "07:00", endTime: "07:30", isCompleted: true }),
        event({ title: "Done two", startTime: "08:00", endTime: "08:30", isCompleted: true }),
        event({ title: "Feed", startTime: "10:00", endTime: "10:30" }),
        ...hours.map((h) =>
          event({
            title: `Item ${h}`,
            startTime: `${String(h).padStart(2, "0")}:00`,
            endTime: `${String(h + 1).padStart(2, "0")}:00`,
          }),
        ),
      ],
      [],
      [],
      DAY,
      FIXED,
    );
    expect(snapshot.state).toBe("next");
    if (snapshot.state !== "next") return;
    expect(snapshot.entries.map((entry) => entry.kind)).toEqual(["last", "next", "next"]);
    expect(snapshot.entries[0].title).toBe("Feed");
    expect(snapshot.entries[1].isHero).toBe(true);
    expect(snapshot.leftCount).toBe(12);
    expect(snapshot.endNote).toBe("Nothing after 11:00 PM");
  });
});

// ─── 2. The height signal + thresholds (source pins) ────────────────────────

describe("v443 height signal", () => {
  it("the providers compose the signal from every height figure the launcher offers", () => {
    expect(providers).toContain("OPTION_APPWIDGET_MIN_HEIGHT");
    expect(providers).toContain("OPTION_APPWIDGET_MAX_HEIGHT");
    expect(providers).toContain("OPTION_APPWIDGET_SIZES");
    // The SIZES read is gated on API 31 (the list exists from S).
    expect(providers).toContain("Build.VERSION_CODES.S");
    expect(providers).toContain("var heightSignal = maxOf(");
    expect(providers).toContain("WidgetRenderer.render(context, kind, heightSignal)");
  });

  it("the rail's full threshold drops to 160; Emergency's tall bar stays at 190", () => {
    // v445 re-pin: the rail's 160 threshold is gone — the
    // tall/short branch was replaced by the height-budgeted
    // selection (rail budget = heightSignal − 96 in
    // selectRailRows), because both thresholds still starved
    // rows on his phone. Emergency's tall bar at 190 stands.
    // v447 re-pin: the budget allowance is − 56 now — the
    // footer was removed from the card at Jonathan's ruling
    // and its ~40dp went to the rail.
    // v450 re-pin: the budget plans against − 56 − 16 — a
    // 16dp safety margin on top, because the height signal
    // overestimated the placed height again in v449 and a
    // fourth row stood half-clipped at the card's edge.
    expect(renderer).not.toContain("val full = minHeightDp >= 160");
    expect(renderer).toContain("val tall = minHeightDp >= 190");
    expect(renderer).toContain("val railBudget = heightSignal - 56 - 16");
    // The 190 belongs to renderEmergency, before renderUpNext.
    const upNextAt = renderer.indexOf("private fun renderUpNext");
    const emergencyAt = renderer.indexOf("private fun renderEmergency");
    const tallAt = renderer.indexOf("val tall = minHeightDp >= 190");
    expect(tallAt).toBeGreaterThan(emergencyAt);
    expect(tallAt).toBeLessThan(upNextAt);
  });
});

// ─── 3. The past row's dress + the NOW seat (source pins) ───────────────────

describe("v443 past row rendering", () => {
  it("the renderer maps the snapshot's last kind onto its muted rail rows (v444 re-pin)", () => {
    // Was: '"past" -> entries.add(RailRow("past"'. The snapshot
    // kind is "last" now; the renderer maps it onto the done /
    // past dresses by its completed flag — the two branches
    // below are the same code this section already pinned.
    expect(renderer).toContain('"last" -> entries.add(');
    expect(renderer).toContain('if (e.optBoolean("completed")) "done" else "past"');
  });

  it("no NOW row seats anywhere — the display order is last, current, hero (v456)", () => {
    // v445 re-pin: the seat is no longer found by scanning the
    // entries walk (that loop is gone) — selectRailRows builds
    // the display list in chronological order. The
    // display-order adds in selectRailRows are the pin.
    // v456 amendment (Jonathan, on the v455 render: "That
    // little 'now' thing is stupid! Shouldn't the box be
    // NOW?"): the NOW row is removed in every state — the
    // box IS the now marker — so no nowRow add stands in
    // the display list at all; the hero follows the current
    // directly.
    expect(renderer).not.toContain('entry.kind != "done" && entry.kind != "past"');
    const selAt = renderer.indexOf("private fun selectRailRows");
    expect(selAt).toBeGreaterThan(-1);
    const sel = renderer.slice(selAt, selAt + 3500);
    const lastAdd = sel.indexOf("display.add(last)");
    const currentAdd = sel.indexOf("display.add(current)");
    const heroAdd = sel.indexOf("display.add(hero)");
    expect(lastAdd).toBeGreaterThan(-1);
    expect(sel).not.toContain("display.add(nowRow)");
    expect(currentAdd).toBeGreaterThan(lastAdd);
    expect(heroAdd).toBeGreaterThan(currentAdd);
  });

  it("the past slot dress is muted — chip dot, body title — with no strike and no check", () => {
    const pastAt = renderer.indexOf('"past" -> {');
    expect(pastAt).toBeGreaterThan(-1);
    const pastBody = renderer.slice(pastAt, pastAt + 1400);
    expect(pastBody).toContain("pal.chip");
    expect(pastBody).toContain("pal.body");
    expect(pastBody).toContain("pal.muted");
    expect(pastBody).not.toContain("STRIKE_THRU");
    expect(pastBody).not.toContain("checkBitmap");
  });
});

// ─── 4. The time column (layout pins) ───────────────────────────────────────

describe("v443 time column", () => {
  it("the full layout's time cells are 64dp wide — \"12:00 PM\" fits at 11.5sp", () => {
    const full = layout("widget_up_next");
    for (const slot of [1, 5, 9]) {
      expect(tagWithId(full, `nx_time_${slot}`)).toContain('android:layout_width="64dp"');
    }
    expect(full).not.toContain("54dp");
  });

  it("the compact layout's time cells are 64dp wide too", () => {
    const compact = layout("widget_up_next_compact");
    expect(tagWithId(compact, "nc_time_h")).toContain('android:layout_width="64dp"');
    expect(tagWithId(compact, "nc_time_i")).toContain('android:layout_width="64dp"');
    expect(compact).not.toContain("54dp");
  });
});
