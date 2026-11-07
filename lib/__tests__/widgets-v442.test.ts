/**
 * v442 — the Material redesign of the six original widgets.
 *
 * The compositions are the approved drawings: W-4 (D-1 Pray Today,
 * D-3 Your Fast, D-4 Due to Reach Out, D-6 Your Study), W-5
 * (Emergency with ONE active, tall + standard; W-4 D-2 takes over
 * at 2+), and W-6 Option A (Up Next as a DAY RAIL — done rows, a
 * renderer-seated NOW row, the hero in its container band with a
 * live countdown, gap rows for open time ≥ 15 minutes, a footer
 * with the day's end). Two steers ride on top: the Material 3
 * EXPRESSIVE register (28dp card radius, hero type +2sp, the Fast
 * day number at 38sp, 40dp action pills, 12sp chips, a squarer
 * Study tile), and the colours come from the DEVICE — the Kotlin
 * renderer resolves an effective palette per render, device
 * Material You system colours first (API 31+), the snapshot
 * palette (app seed) as the whole fallback, the reached greens
 * always from the snapshot.
 *
 * Snapshot deltas pinned here: Fast carries numeric goalDays /
 * daysLeft; the Reach lead carries its composed sinceLine
 * (pronoun from the person's gender); Study carries bookColor;
 * Up Next carries the day's rail entries + leftCount + endNote.
 * Layout pins hold the new ids/groups and the v439 vanilla subset
 * across every layout, rectangles included; renderer pins hold
 * the device-first resolution order, the snapshot fallback, the
 * size-variant selection, the drawn bars, and the emergency
 * group toggling.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { formatDateLocal } from "../date-utils";
import { addPerson, type Person } from "../prayercircle-data";
import type { PersonalFast } from "../prayercircle-fasting";
import type { ScheduleEvent, ScheduleTodo } from "../schedule-data";
import {
  buildFastSnapshot,
  buildReachOutSnapshot,
  buildStudySnapshot,
  buildUpNextSnapshot,
  reachSinceLine,
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

const NOW = new Date();
const daysAgoIso = (days: number) => formatDateLocal(new Date(NOW.getTime() - days * 86400000));

function person(name: string, overrides: Partial<Person> = {}): Person {
  const base = addPerson([], name, "Family")[0];
  return { ...base, reminderFrequency: "daily", ...overrides };
}

// ─── 1. Snapshot deltas ─────────────────────────────────────────────────────

describe("v442 snapshot deltas", () => {
  it("Fast carries goalDays and daysLeft as numbers (the drawing's own numbers)", () => {
    const fast: PersonalFast = {
      id: "fast-442",
      name: "365-Day Growth Fast",
      startDate: daysAgoIso(308),
      durationDays: 365,
      type: "growth" as PersonalFast["type"],
      focusItems: [],
      dayStatuses: {},
      createdAt: daysAgoIso(308),
    };
    const snapshot = buildFastSnapshot([fast], null, formatDateLocal(NOW));
    expect(snapshot.state).toBe("active");
    if (snapshot.state !== "active") return;
    expect(snapshot.dayNumber).toBe(309);
    expect(snapshot.goalDays).toBe(365);
    expect(snapshot.daysLeft).toBe(56);
  });

  it("Reach composes the lead's line in the builder, pronoun from gender", () => {
    expect(reachSinceLine(12, "f")).toBe("12 days since you reached her");
    expect(reachSinceLine(1, "m")).toBe("1 day since you reached him");
    expect(reachSinceLine(5, undefined)).toBe("5 days since you reached them");
    // Due starts at the bell lib's 14-day rule — 20 days is due.
    const her = person("Her Friend", { gender: "f", lastPrayedDate: daysAgoIso(20) });
    const snapshot = buildReachOutSnapshot([her], NOW);
    expect(snapshot.state).toBe("due");
    if (snapshot.state !== "due") return;
    // The composed line rides the snapshot — the renderer prints
    // it verbatim and never composes wording of its own.
    expect(snapshot.lead.sinceLine).toBe("20 days since you reached her");
    expect(renderer).toContain('optString("sinceLine")');
  });

  it("Study carries bookColor — the book's ROYGBIV primary under the drawing's name", () => {
    const snapshot = buildStudySnapshot(
      {
        overrides: {},
        reads: {},
        writeQueue: [],
        restudyQueue: [],
        currentBook: "Genesis",
        lastRead: null,
      },
      {},
      () => null,
    );
    expect(snapshot.state).toBe("active");
    if (snapshot.state !== "active") return;
    expect(snapshot.bookColor).toMatch(/^#[0-9A-F]{6}$/);
    expect(snapshot.bookColor).toBe(snapshot.colorPrimary);
    expect(snapshot.totalChapters).toBe(50);
    expect(typeof snapshot.chaptersWritten).toBe("number");
  });
});

// ─── 2. Up Next: the day rail's entries ─────────────────────────────────────
// v444 amendment: the rail model is replaced by Jonathan's
// corrected spec (last / current / next / gap — see
// widgets-v444.test.ts for the deep pins). The scenarios below
// carry over in the new shape: two-most-recent-dones becomes
// the single most-recent "last", and the 10-entry cap becomes
// the two-next limit.

describe("v442 Up Next rail entries", () => {
  const FIXED = new Date(2026, 10, 5, 10, 0, 0); // Nov 5 2026, 10:00 local
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

  it("the last entry is the most recent thing that ended — one only (v444 re-pin)", () => {
    // Was: "caps done entries at the two most recent, in day
    // order". The v444 model carries ONE last thing: the most
    // recent ended item, checked off or not.
    const snapshot = buildUpNextSnapshot(
      [
        event({ title: "Early", startTime: "07:00", endTime: "07:30", isCompleted: true }),
        event({ title: "Middle", startTime: "08:00", endTime: "08:30", isCompleted: true }),
        event({ title: "Latest done", startTime: "09:00", endTime: "09:30", isCompleted: true }),
        event({ title: "Hero", startTime: "14:00", endTime: "15:00" }),
      ],
      [],
      [],
      DAY,
      FIXED,
    );
    expect(snapshot.state).toBe("next");
    if (snapshot.state !== "next") return;
    const lasts = snapshot.entries.filter((entry) => entry.kind === "last");
    expect(lasts.map((entry) => entry.title)).toEqual(["Latest done"]);
    expect(lasts[0].completed).toBe(true);
    expect(snapshot.entries.some((entry) => entry.title === "Middle")).toBe(false);
    expect(snapshot.entries.some((entry) => entry.title === "Early")).toBe(false);
  });

  it("a completed item whose start is still ahead never rides (v444 re-pin)", () => {
    // Was: "...is not a done entry". Under the v444 model a
    // completed future item is not last (it has not ended), not
    // current and not next (both uncompleted) — it is absent.
    const snapshot = buildUpNextSnapshot(
      [
        event({ title: "Checked early", startTime: "16:00", endTime: "17:00", isCompleted: true }),
        event({ title: "Hero", startTime: "14:00", endTime: "15:00" }),
      ],
      [],
      [],
      DAY,
      FIXED,
    );
    expect(snapshot.state).toBe("next");
    if (snapshot.state !== "next") return;
    expect(snapshot.entries.some((entry) => entry.kind === "last")).toBe(false);
    expect(snapshot.entries.some((entry) => entry.title === "Checked early")).toBe(false);
  });

  it("gaps appear only at 15 open minutes or more", () => {
    const ten = buildUpNextSnapshot(
      [
        event({ title: "Hero", startTime: "14:00", endTime: "15:00" }),
        event({ title: "Soon after", startTime: "15:10", endTime: "16:00" }),
      ],
      [],
      [],
      DAY,
      FIXED,
    );
    if (ten.state !== "next") throw new Error("expected next");
    expect(ten.entries.some((entry) => entry.kind === "gap")).toBe(false);
    const fifteen = buildUpNextSnapshot(
      [
        event({ title: "Hero", startTime: "14:00", endTime: "15:00" }),
        event({ title: "Soon after", startTime: "15:15", endTime: "16:00" }),
      ],
      [],
      [],
      DAY,
      FIXED,
    );
    if (fifteen.state !== "next") throw new Error("expected next");
    const gap = fifteen.entries.find((entry) => entry.kind === "gap");
    expect(gap?.text).toBe("15 minutes open");
  });

  it("ends default by kind (todo 30, else 60) when no endTime is stored", () => {
    const snapshot = buildUpNextSnapshot(
      [event({ title: "Last thing", startTime: "17:00" })],
      [todo({ title: "Hero todo", startTime: "14:00" }), todo({ title: "Bridge", startTime: "15:00", endTime: "15:30" })],
      [],
      DAY,
      FIXED,
    );
    expect(snapshot.state).toBe("next");
    if (snapshot.state !== "next") return;
    // Hero todo 14:00 + 30 default = ends 14:30; Bridge at 15:00
    // leaves a 30-minute gap. Last thing 17:00 + 60 = 18:00.
    const gap = snapshot.entries.find((entry) => entry.kind === "gap");
    expect(gap?.text).toBe("30 minutes open");
    expect(snapshot.endNote).toBe("Nothing after 6:00 PM");
  });

  it("the list stops at the next two — the rest of the day is the count, not rows (v444 re-pin)", () => {
    // Was: "caps the rail at 10 entries and never ends it on a
    // gap" (v443 re-pin of the v442 8-cap). The v444 model shows
    // at most last + current + next + gap + next; the day below
    // carries twelve ahead items and only the first two ride.
    const hours = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
    const events = hours.map((h) =>
      event({
        title: `Item ${h}`,
        startTime: `${String(h).padStart(2, "0")}:00`,
        endTime: `${String(h + 1).padStart(2, "0")}:00`,
      }),
    );
    const snapshot = buildUpNextSnapshot(events, [], [], DAY, FIXED);
    expect(snapshot.state).toBe("next");
    if (snapshot.state !== "next") return;
    expect(snapshot.entries.map((entry) => entry.kind)).toEqual(["next", "next"]);
    expect(snapshot.entries.map((entry) => entry.title)).toEqual(["Item 11", "Item 12"]);
    expect(snapshot.leftCount).toBe(12);
    expect(snapshot.endNote).toBe("Nothing after 11:00 PM");
  });

  it("holidays never enter the rail", () => {
    const snapshot = buildUpNextSnapshot(
      [
        event({ title: "A Holiday", startTime: "12:00", endTime: "13:00", isHoliday: true }),
        event({ title: "Hero", startTime: "14:00", endTime: "15:00" }),
      ],
      [],
      [],
      DAY,
      FIXED,
    );
    expect(snapshot.state).toBe("next");
    if (snapshot.state !== "next") return;
    expect(snapshot.entries.some((entry) => entry.title === "A Holiday")).toBe(false);
    expect(snapshot.leftCount).toBe(1);
  });
});

// ─── 3. Layouts: the new compositions hold the vanilla subset ───────────────

describe("v442 layouts", () => {
  const ALL_LAYOUTS = readdirSync(join(root, MODULE_RES, "layout"))
    .filter((file) => file.endsWith(".xml"))
    .map((file) => file.replace(/\.xml$/, ""));

  it("every layout in res holds the vanilla subset (no plain View, no bar element, no vectors)", () => {
    expect(ALL_LAYOUTS.length).toBeGreaterThanOrEqual(11);
    for (const name of ALL_LAYOUTS) {
      const xml = layout(name);
      expect(xml, name).not.toMatch(/<View[\s>]/);
      expect(xml, name).not.toContain("ProgressBar");
      expect(xml, name).not.toContain("<vector");
      expect(xml, name).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    }
    expect(renderer).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });

  it("the six wear the 28dp expressive card; the rectangles keep their 26dp dress", () => {
    const shape28 = read(`${MODULE_RES}/drawable/widget_shape_white_28.xml`);
    expect(shape28).toContain('android:radius="28dp"');
    for (const name of [
      "widget_pray_today",
      "widget_emergency",
      "widget_emergency_tall",
      "widget_your_fast",
      "widget_reach_out",
      "widget_your_study",
      "widget_up_next",
      "widget_up_next_compact",
    ]) {
      expect(layout(name), name).toContain("@drawable/widget_shape_white_28");
    }
    // Steer scope: rectangles repaint only — their shape stays.
    for (const name of ["widget_pray_strip", "widget_pray_next", "widget_reach_pair"]) {
      expect(layout(name), name).toContain("@drawable/widget_shape_white");
      expect(layout(name), name).not.toContain("widget_shape_white_28");
    }
  });

  it("Pray Today: day bar slot, 40dp pill stack, ringed hero face", () => {
    const prayToday = layout("widget_pray_today");
    expect(prayToday).toContain("@+id/pt_daybar");
    expect(tagWithId(prayToday, "pt_pill")).toContain('android:layout_height="40dp"');
    expect(tagWithId(prayToday, "pt_avatar_ring")).toContain('android:layout_width="64dp"');
    expect(tagWithId(prayToday, "pt_avatar_img")).toContain('android:layout_width="54dp"');
    expect(tagWithId(prayToday, "pt_who")).toContain('android:textSize="10.5sp"');
  });

  it("Emergency: one-active groups in both heights, the ACTIVE chip, the multi rows", () => {
    const standard = layout("widget_emergency");
    expect(standard).toContain("@+id/em_single");
    expect(standard).toContain("@+id/em_multi");
    expect(standard).toContain("@+id/em_chip");
    expect(tagWithId(standard, "em_s_title")).toContain('android:textSize="22sp"');
    expect(tagWithId(standard, "em_s_note")).toContain('android:maxLines="2"');
    const tall = layout("widget_emergency_tall");
    expect(tall).toContain("@+id/em_single");
    expect(tall).toContain("@+id/em_multi");
    expect(tagWithId(tall, "emt_img")).toContain('android:layout_width="72dp"');
    expect(tagWithId(tall, "emt_title")).toContain('android:textSize="27sp"');
    expect(tagWithId(tall, "emt_note")).toContain('android:maxLines="3"');
    // Both heights share the multi-row ids — one fill path.
    for (const id of ["em_row_1", "em_row_2", "em_hairline", "em_more", "em_bg_red"]) {
      expect(tall, id).toContain(`@+id/${id}`);
      expect(standard, id).toContain(`@+id/${id}`);
    }
  });

  it("Fast / Reach / Study carry their D-3 / D-4 / D-6 pieces", () => {
    const fast = layout("widget_your_fast");
    expect(fast).toContain("@+id/fast_of");
    expect(fast).toContain("@+id/fast_daybar");
    const reach = layout("widget_reach_out");
    expect(reach).toContain("@+id/reach_since");
    expect(reach).toContain("@+id/reach_second_rest");
    expect(tagWithId(reach, "reach_btn")).toContain('android:layout_height="40dp"');
    expect(tagWithId(reach, "reach_name")).toContain('android:textSize="20sp"');
    const study = layout("widget_your_study");
    expect(study).toContain("@+id/study_bar");
    expect(tagWithId(study, "study_tile")).toContain('android:src="@drawable/widget_rounded16"');
    expect(tagWithId(study, "study_book")).toContain('android:textSize="23sp"');
    const rounded16 = read(`${MODULE_RES}/drawable/widget_rounded16.xml`);
    expect(rounded16).toContain('android:radius="16dp"');
  });

  it("Up Next: nine rail slots in the full layout, three rows in the compact", () => {
    const full = layout("widget_up_next");
    for (let slot = 1; slot <= 9; slot += 1) {
      expect(full).toContain(`@+id/nx_row_${slot}`);
      expect(full).toContain(`@+id/nx_seg_top_${slot}`);
      expect(full).toContain(`@+id/nx_seg_bot_${slot}`);
      expect(full).toContain(`@+id/nx_band_${slot}`);
      expect(full).toContain(`@+id/nx_check_${slot}`);
    }
    // v447 re-pin: the footer this test once pinned
    // (next_foot_line / next_endnote) is REMOVED — Jonathan
    // ruled the Open schedule / end-note bar dead weight
    // ("Why do we need that?") and its space went to the
    // rail. The absence is pinned in widgets-v447.test.ts.
    expect(full).not.toContain("@+id/next_foot_line");
    expect(full).not.toContain("@+id/next_endnote");
    // v444 re-pin: the hero title slimmed 21sp → 18sp (with the
    // band's padding) so the short list's core rows fit the rail
    // a tall placement actually offers.
    // v445 re-pin: the hero band is back to the approved
    // mockup's proportions — title 20sp, band padding 10dp —
    // because the v444 slimming still clipped the countdown
    // pill on his phone; the height budget (selectRailRows)
    // is what keeps the rail fitting now, not smaller type.
    expect(tagWithId(full, "nx_htitle_1")).toContain('android:textSize="20sp"');
    const compact = layout("widget_up_next_compact");
    expect(compact).toContain("@+id/nc_rows");
    expect(compact).toContain("@+id/nc_row_gap");
    expect(compact).toContain("@+id/nc_row_item");
    expect(tagWithId(compact, "nc_htitle")).toContain('android:textSize="20sp"');
    // The compact face has no footer and no rail slots.
    expect(compact).not.toContain("next_foot_line");
    expect(compact).not.toContain("nx_row_");
  });
});

// ─── 4. The renderer: device colours, variants, bars, toggling ──────────────

describe("v442 renderer", () => {
  it("resolves the effective palette device-first, snapshot whole as fallback", () => {
    expect(renderer).toContain("private fun effectivePalette");
    // v464 re-pin: the resolution is mode-aware now — the
    // DEVICE's uiMode chooses first (deviceIsNight), then the
    // source. In LIGHT the v442 order stands verbatim: the
    // device attempt is the left side of the elvis and the
    // snapshot only answers when the device returns null. At
    // NIGHT the snapshot's seed × dark palette leads (the
    // v464 test file pins that order); this pin keeps the
    // light half and the device read's shape.
    expect(renderer).toContain("devicePalette(context, snapshot, night = false) ?: snapshot");
    // The device read is gated on API 31 (Material You system
    // colours exist from S) and reads the system families.
    expect(renderer).toContain("Build.VERSION_CODES.S");
    for (const tone of [
      "system_accent1_600",
      "system_accent2_100",
      "system_accent2_200",
      "system_accent2_900",
      "system_neutral1_50",
      "system_neutral1_900",
      "system_neutral2_100",
      "system_neutral2_200",
      "system_neutral2_600",
      "system_neutral2_700",
    ]) {
      expect(renderer, tone).toContain(`android.R.color.${tone}`);
    }
    // Resolution order, pinned in the source: the device attempt
    // is the left side of the elvis — the snapshot only answers
    // when the device returns null.
    const effAt = renderer.indexOf("private fun effectivePalette");
    const deviceAt = renderer.indexOf("devicePalette(context, snapshot, night = false)", effAt);
    const fallbackAt = renderer.indexOf("?: snapshot", effAt);
    expect(deviceAt).toBeGreaterThan(effAt);
    expect(fallbackAt).toBeGreaterThan(deviceAt);
  });

  it("the reached greens always come from the snapshot palette (meaning hue)", () => {
    const deviceAt = renderer.indexOf("private fun devicePalette");
    const deviceBody = renderer.slice(deviceAt, deviceAt + 2200);
    expect(deviceBody).toContain("green = snapshot.green");
    expect(deviceBody).toContain("greenContainer = snapshot.greenContainer");
    expect(deviceBody).not.toContain("system_accent3");
  });

  it("all nine kinds render from the one effective palette", () => {
    expect(renderer).toContain("val pal = effectivePalette(context, root)");
    for (const kind of ["PRAY_STRIP", "PRAY_NEXT", "REACH_PAIR"]) {
      expect(renderer).toContain(`${kind} ->`);
    }
    expect(renderer).toContain("renderPrayStrip(context, root, scheme, pal)");
    expect(renderer).toContain("renderPrayNext(context, root, scheme, pal)");
    expect(renderer).toContain("renderReachPair(context, root, scheme, pal)");
  });

  it("selects the tall Emergency by height; Up Next renders the full layout at both bands (v444 re-pin)", () => {
    expect(renderer).toContain("minHeightDp >= 190");
    expect(renderer).toContain("R.layout.widget_emergency_tall");
    // Was: "...and the full/compact rail by the widget's real
    // height" — the compact layout was one of the two. v444:
    // Up Next's short list renders through the full layout's
    // slots at both bands (the ≥160 signal picks the row set),
    // and the compact layout is never selected.
    expect(renderer).not.toContain("R.layout.widget_up_next_compact");
    // The height itself arrives from the providers, which read it
    // from the AppWidgetManager options on every update/resize.
    // (v443 re-pin: the providers now pass a robust heightSignal —
    // the max of the options' height figures — under that name;
    // the v443 test file pins the signal's composition.)
    const providers = read(`${MODULE_KOTLIN}/WidgetProviders.kt`);
    expect(providers).toContain("OPTION_APPWIDGET_MIN_HEIGHT");
    expect(providers).toContain("WidgetRenderer.render(context, kind, heightSignal)");
  });

  it("draws the day and fast bars as bitmaps; the study bar is the wavy line", () => {
    // v449 re-pin: the v446 amendment sent the study bar to
    // the wavy indicator (waveProgressBitmap). His ruling on
    // that render (Nov 5, 17:16): "Change the line back to a
    // regular line." The study bar is the flat barBitmap
    // again — this test's original three-flat-bars shape is
    // restored, and the wave factory is gone from the
    // renderer entirely.
    expect(renderer).toContain("private fun barBitmap(");
    expect(renderer).toContain("R.id.pt_daybar");
    expect(renderer).toContain("barBitmap(pal.primary, pal.track");
    expect(renderer).toContain("R.id.fast_daybar");
    expect(renderer).toContain("R.id.study_bar");
    expect(renderer).toContain("written.toFloat() / totalChapters");
    expect(renderer).not.toContain("waveProgressBitmap");
  });

  it("toggles the Emergency single/multi groups by the LIVE row count", () => {
    expect(renderer).toContain("if (live.size == 1)");
    expect(renderer).toContain("fillEmergencyMulti");
    expect(renderer).toContain('"${live.size} ACTIVE"');
    expect(renderer).toContain("R.id.em_bg_red");
    // The quiet face wears the palette surface; red stands apart.
    expect(renderer).toContain('views.setInt(R.id.em_bg, "setColorFilter", pal.surface)');
  });

  it("the rail: NOW from the device clock, the hero countdown, done struck + checked", () => {
    expect(renderer).toContain("private fun countdownText(");
    expect(renderer).toContain('return "IN $diff MIN"');
    expect(renderer).toContain('return if (m == 0) "IN $h H" else "IN $h H $m MIN"');
    expect(renderer).toContain("nowTimeLabel()");
    expect(renderer).toContain("Paint.STRIKE_THRU_TEXT_FLAG");
    expect(renderer).toContain("private fun checkBitmap(");
    expect(renderer).toContain("checkBitmap(pal.green)");
    // Slot ids resolve by name — the nine stamped slots walk alike.
    expect(renderer).toContain("getIdentifier");
    // (v444: the compact face's "· then N more" line is gone
    // with the compact path itself — the header's LEFT count
    // carries what remains of the day.)
  });

  it("paints the Pray Today hero micro and the Study status in palette/meaning colours", () => {
    expect(renderer).toContain("setTextColor(R.id.pt_who, pal.primary)");
    expect(renderer).toContain('"Next to write · Chapter $nextChapter"');
    expect(renderer).toContain('"Fully written"');
    expect(renderer).toContain('"of $goalDays · ${snap.optInt("daysLeft")} to go"');
  });
});
