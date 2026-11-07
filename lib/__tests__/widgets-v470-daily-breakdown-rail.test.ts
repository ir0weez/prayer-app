/**
 * v470 — the Daily Breakdown's DB-T3 "Mini Rail" fill
 * (daily-breakdown-tall-concepts-v1, the third card — his
 * Nov 7 pick, over DB-T1 Later Today and DB-T2 Shape of the
 * Day). At the tall placement he actually uses, v462's four
 * rows huddled at the top of the card and the bottom half
 * stood empty ("It feels like there's too much open space
 * on this big widget... Couldn't we add more useful
 * information?"). DB-T3 fills it with information the
 * snapshot already carries:
 *
 *   · a MINI RAIL under the schedule row — the rest of today
 *     as stops on a line (the current/next item onward,
 *     render-time from dayItems + the device clock), a pale
 *     gap box on the line for an open stretch of 15 minutes
 *     or more, the Up Next rail's own structure and rules;
 *   · the header's second dress while a stop stands —
 *     "Today, from here", the reading line alone;
 *   · a TOMORROW row below FAST — moon glyph, tomorrow's
 *     first thing and the day's whole count (the snapshot's
 *     new tomorrowCount, counted from the very collection
 *     tomorrowFirst is drawn from).
 *
 * The extras are extras: priced honestly (stop 42, gap 30,
 * the tomorrow row a full 64), seated whole or not at all
 * from the budget the core rows leave, the rail's walk
 * reserving the fast anchor's cost so an extra never eats
 * a core row. At the v462 4x3 budget (height 300, budget
 * 264, core 256) the reserve leaves the extras exactly
 * nothing — no rail stop, no tomorrow row, and the header
 * keeps the v462 dress byte-for-byte.
 *
 * The Kotlin renderer cannot execute in this harness, so —
 * as in every widget round — behaviour is pinned on the
 * pure builder, the renderer is pinned by source, and the
 * seating arithmetic is pinned by a small mirror of the
 * walk driven by the constants parsed out of the shipped
 * source: if a constant moves, the promised traces below
 * must still hold or this file fails.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { StudyState } from "../bible-v205/study";
import { formatDateLocal } from "../date-utils";
import { addPerson, type Person } from "../prayercircle-data";
import type { PersonalFast } from "../prayercircle-fasting";
import type { ScheduleEvent, ScheduleMinistry, ScheduleTodo } from "../schedule-data";
import {
  buildDailyBreakdownSnapshot,
  type DailyBreakdownWidgetSnapshot,
} from "../widget-snapshots";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const MODULE_ANDROID = "modules/expo-prayercircle-widgets/android/src/main";
const MODULE_KOTLIN = `${MODULE_ANDROID}/java/expo/modules/prayercirclewidgets`;

const renderer = read(`${MODULE_KOTLIN}/WidgetRenderer.kt`);
const layout = read(`${MODULE_ANDROID}/res/layout/widget_daily_breakdown.xml`);
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

const breakdown = rendererFn("renderDailyBreakdown");
const railElements = rendererFn("breakdownRailElements");
const railWalk = rendererFn("walkDbRail");
const railSlot = rendererFn("fillDbRailSlot");

// The real clock, like every widget round (the breakdown's
// selectors read the device clock themselves).
const NOW = new Date();
const DAY = formatDateLocal(NOW);
const TOMORROW = formatDateLocal(new Date(NOW.getTime() + 86400000));
const daysAgoIso = (days: number) => formatDateLocal(new Date(NOW.getTime() - days * 86400000));

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

/** His Saturday, mirrored from the real day the drawing was
 * made from: Rest (a garden event, checked off early — it
 * stands completed), Pray, Brush Teeth, Gardening, Duolingo. */
function saturday(): DailyBreakdownWidgetSnapshot {
  const study: StudyState = {
    overrides: {},
    reads: {
      "Genesis|1": "2026-11-01",
      "Genesis|2": "2026-11-02",
      "Genesis|3": "2026-11-03",
      "Genesis|4": "2026-11-04",
      "Genesis|5": "2026-11-05",
      "Genesis|6": "2026-11-06",
      "Genesis|7": "2026-11-07",
    },
    writeQueue: [],
    restudyQueue: [],
    currentBook: "Genesis",
    lastRead: null,
  };
  return build({
    events: [
      event({ title: "Rest", startTime: "09:00", endTime: "10:00", location: "Garden", isCompleted: true }),
      event({ title: "Gardening", startTime: "16:00", endTime: "16:30" }),
    ],
    todos: [
      todo({ title: "Pray", startTime: "09:00", endTime: "09:30" }),
      todo({ title: "Brush Teeth", startTime: "09:30", endTime: "10:00" }),
      todo({ title: "Duolingo", startTime: "17:00", endTime: "17:30" }),
    ],
    fasts: [FAST],
    studyState: study,
  });
}

// ─── 1. The Saturday fixture — the day the rail reads ──────────────────────

describe("v470 Daily Breakdown rail — the Saturday fixture", () => {
  it("carries the day whole, in the one collection's order, completed flags riding", () => {
    const snapshot = saturday();
    if (snapshot.state !== "day") throw new Error("expected a day");
    // Todos first, then events (collectDayItems' order) — the
    // renderer sorts its standing stops by startMinutes
    // itself; what the snapshot owes it is the day whole,
    // with the baked ends and the completion states.
    expect(snapshot.schedule.dayItems).toEqual([
      { title: "Pray", sub: "", startMinutes: 540, endMinutes: 570, hasEnd: true, completed: false },
      { title: "Brush Teeth", sub: "", startMinutes: 570, endMinutes: 600, hasEnd: true, completed: false },
      { title: "Duolingo", sub: "", startMinutes: 1020, endMinutes: 1050, hasEnd: true, completed: false },
      { title: "Rest", sub: "Garden", startMinutes: 540, endMinutes: 600, hasEnd: true, completed: true },
      { title: "Gardening", sub: "", startMinutes: 960, endMinutes: 990, hasEnd: true, completed: false },
    ]);
    // The drawing's reading line.
    expect(snapshot.schedule.reading).toBe("Genesis 8");
  });

  it("the rail that fixture reads at 09:39 — pinned on the renderer's own composition", () => {
    // At 09:39 (minute 579) the standing items are Rest
    // (540–600, completed), Brush Teeth (570–600), Gardening
    // (960–990) and Duolingo (1020–1050); Pray's window
    // (540–570) has fully ended. Both Rest and Brush Teeth
    // contain now; the uncompleted one leads, so the rail
    // reads exactly as drawn:
    //   Brush Teeth · "9:30 AM — now"
    //   gap · "10:00 AM – 4:00 PM · 6 hrs open"
    //   Gardening · "4:00 – 4:30 PM"
    //   Duolingo · "5:00 – 5:30 PM"
    // Each line of that reading is one pinned template below.
    // Standing = the window has not fully passed (the v455
    // convention off the baked ends).
    expect(railElements).toContain("if (breakdownWinEnd(item) > nowMin) standing.add(item)");
    // Stops run in start order, whatever the collection order.
    expect(railElements).toContain('standing.sortBy { it.optInt("startMinutes") }');
    // The current-stop preference: an uncompleted item whose
    // window contains now leads; a completed one still counts
    // when nothing uncompleted contains now (the branch keeps
    // a completed candidate only until an uncompleted appears).
    expect(railElements).toContain("if (start <= nowMin && nowMin < breakdownWinEnd(item))");
    expect(railElements).toContain('if (!item.optBoolean("completed"))');
    expect(railElements).toContain('containIdx < 0 || standing[containIdx].optBoolean("completed")');
    // The now stop's line: its start, then "— now".
    expect(railElements).toContain('"${minutesToTimeLabel(start)} — now"');
    // A later stop's line is its range (the shared-meridiem
    // shortening lives in breakdownRangeLabel).
    expect(railElements).toContain("end > start -> breakdownRangeLabel(start, end)");
    const range = rendererFn("breakdownRangeLabel");
    expect(range).toContain('startLabel.removeSuffix(" AM").removeSuffix(" PM")');
    expect(range).toContain('"$shortStart – $endLabel"');
    // The gap block: previous stop's end to next stop's
    // start, the compact duration, "open".
    expect(railElements).toContain(
      '"${minutesToTimeLabel(breakdownWinEnd(prev))} – ${minutesToTimeLabel(start)} · ${breakdownOpenText(gapMinutes)} open"',
    );
    // The compact duration's voice: 360 minutes reads "6 hrs".
    const open = rendererFn("breakdownOpenText");
    expect(open).toContain('"$hours hr${if (hours == 1) "" else "s"}"');
    expect(open).toContain('"$rest min"');
  });

  it("an open stretch under 15 minutes seats no gap block", () => {
    expect(railElements).toContain("val gapMinutes = start - breakdownWinEnd(prev)");
    expect(railElements).toContain("if (gapMinutes >= 15)");
  });
});

// ─── 2. tomorrowCount — the Tomorrow row's count ───────────────────────────

describe("v470 Daily Breakdown — tomorrowCount", () => {
  it("counts tomorrow's timed items from the same collection tomorrowFirst is drawn from", () => {
    const snapshot = build({
      events: [
        event({ title: "Holiday Parade", date: TOMORROW, startTime: "07:00", isHoliday: true }),
        event({ title: "Dinner", date: TOMORROW, startTime: "18:00" }),
      ],
      ministries: [ministry({ title: "Garden Prayer", date: TOMORROW, startTime: "08:00" })],
      todos: [todo({ title: "Trash", date: TOMORROW, startTime: "07:30" })],
      fasts: [FAST],
    });
    if (snapshot.state !== "day") throw new Error("expected a day");
    // The holiday never counts; the todo, the ministry and
    // the event do — and the first is the earliest of them.
    expect(snapshot.schedule.tomorrowCount).toBe(3);
    expect(snapshot.schedule.tomorrowFirst).toEqual({ title: "Trash", timeLabel: "7:30 AM" });
  });

  it("is 0 exactly when tomorrowFirst is null — the two never disagree", () => {
    const empty = build({ fasts: [FAST] });
    if (empty.state !== "day") throw new Error("expected a day");
    expect(empty.schedule.tomorrowCount).toBe(0);
    expect(empty.schedule.tomorrowFirst).toBeNull();
    // Untimed items are not items of the timed day, in either
    // field — an all-untimed tomorrow reads as a clear one.
    const untimed = build({
      events: [event({ title: "TV Show", date: TOMORROW })],
      fasts: [FAST],
    });
    if (untimed.state !== "day") throw new Error("expected a day");
    expect(untimed.schedule.tomorrowCount).toBe(0);
    expect(untimed.schedule.tomorrowFirst).toBeNull();
  });

  it("rides the unchanged none-gate: a day held up by tomorrow alone still stands", () => {
    const snapshot = build({
      events: [event({ title: "Dinner", date: TOMORROW, startTime: "18:00" })],
    });
    if (snapshot.state !== "day") throw new Error("expected a day");
    expect(snapshot.schedule.tomorrowCount).toBe(1);
    expect(build({})).toEqual({ state: "none" });
  });

  it("is composed in the builder from the hoisted collection (source)", () => {
    expect(snapshotsSource).toContain(
      "const tomorrowItems = collectDayItems(events, todos, ministries, tomorrowIso, people);",
    );
    expect(snapshotsSource).toContain("tomorrowCount: tomorrowItems.length,");
  });
});

// ─── 3. The Tomorrow row — strings, gates, glyph ───────────────────────────

describe("v470 Daily Breakdown — the Tomorrow row", () => {
  const subAt = breakdown.indexOf("val tomorrowSub = when {");
  const subBlock = breakdown.slice(subAt, breakdown.indexOf("views.setTextViewText(R.id.db_tomorrow_sub, tomorrowSub)"));

  it("composes its three subs from the snapshot — first + count, count alone, clear", () => {
    expect(subAt).toBeGreaterThan(-1);
    // tomorrowFirst stands: the first thing and the whole count.
    expect(subBlock).toContain(
      '"First thing — ${tomorrowFirst.optString("title")} · ${tomorrowCountText(tomorrowCount)} all day"',
    );
    // No first but a count (a defensive branch — the builder's
    // two fields never disagree; an older or partial snapshot
    // still reads honestly).
    expect(subBlock).toContain('"${tomorrowCountText(tomorrowCount)} · nothing timed first"');
    // Nothing at all.
    expect(subBlock).toContain('else -> "Tomorrow is clear"');
    // The count voice singularises honestly.
    const countText = rendererFn("tomorrowCountText");
    expect(countText).toContain('"$count thing${if (count == 1) "" else "s"}"');
    expect(breakdown).toContain('views.setTextViewText(R.id.db_tomorrow_title, "Tomorrow")');
  });

  it("stands only on today's own snapshot, before the evening turn", () => {
    expect(breakdown).toContain("val tomorrowStands = schedule != null && fresh && !evening");
    expect(breakdown).toContain('if (tomorrowStands) present.add("tomorrow")');
    // Seat order: after the fast anchor in the present list.
    expect(breakdown.indexOf('present.add("fast")')).toBeLessThan(breakdown.indexOf('present.add("tomorrow")'));
    // And it is no part of the "none" face: the row's fill is
    // gated on the day snapshot like every row's.
    expect(breakdown).toContain(
      'views.setViewVisibility(R.id.db_row_tomorrow, if ("tomorrow" in seated) View.VISIBLE else View.GONE)',
    );
    expect(breakdown).toContain("base + 5");
  });

  it("wears the moon — drawn in-process like every shipped glyph, no emoji anywhere", () => {
    expect(breakdown).toContain("moonBitmap(pal.primary)");
    expect(breakdown).toContain('views.setInt(R.id.db_tomorrow_tile, "setColorFilter", pal.container)');
    const moon = rendererFn("moonBitmap");
    expect(moon).toContain("Path.FillType.EVEN_ODD");
    expect(moon).toContain("addCircle(30f, 32f, 24f, Path.Direction.CW)");
    expect(moon).toContain("addCircle(43f, 23f, 19f, Path.Direction.CW)");
    expect(moon).toContain("canvas.drawPath(path, paint)");
    expect(renderer).not.toContain("🌙");
    expect(layout).not.toContain("🌙");
  });
});

// ─── 4. The header dress switch ────────────────────────────────────────────

describe("v470 Daily Breakdown — the header dress switch", () => {
  it("switches only while a rail stop stands; the reading line alone for its sub", () => {
    expect(breakdown).toContain("if (railSeated.any { !it.isGap })");
    expect(breakdown).toContain('schedTitle = "Today, from here"');
    expect(breakdown).toContain('if (schedReading.isNotBlank()) schedSub = "$schedReading to read"');
    // The lines are held through the seating walk, then
    // written once — the switch is decided by the walk.
    expect(breakdown).toContain("schedTitle = title");
    expect(breakdown).toContain("views.setTextViewText(R.id.db_sched_title, schedTitle)");
  });

  it("the candidates themselves are gated — fresh, unturned, and a pick standing", () => {
    expect(breakdown).toContain("if (schedule != null && fresh && !evening && pickStands)");
    expect(breakdown).toContain("breakdownRailElements(schedule, nowMin)");
    expect(breakdown).toContain("pickStands = pick != null");
  });
});

// ─── 5. The seating arithmetic — the promised traces ───────────────────────

/** The shipped constants, parsed from the source so the
 * traces below re-derive if a constant ever moves. */
function shippedConstant(name: string): number {
  const match = renderer.match(new RegExp(`private val ${name} = (\\d+)`));
  expect(match, `${name} declared`).not.toBeNull();
  return Number(match?.[1]);
}

/** A faithful mirror of the shipped walk for the all-rows
 * day (pray, reach, schedule, fast standing; tomorrow
 * standing; the rail candidates given as a gap/stop list).
 * Mirrors, in order: the stopped chain over pray → reach →
 * schedule at 64; the rail walk inside the schedule seat
 * (reserve = the fast anchor's 64 while a fast stands; a
 * gap seats only with the stop behind it, else the stop is
 * tried alone; a stop that does not fit ends the walk; the
 * slot cap); the fast anchor; the tomorrow attempt. */
function seatDb(height: number, candidates: ("stop" | "gap")[]) {
  const STOP = shippedConstant("DB_RAIL_STOP_COST");
  const GAP = shippedConstant("DB_RAIL_GAP_COST");
  const SLOTS = shippedConstant("DB_RAIL_SLOTS");
  let remaining = height - 36;
  const seated = new Set<string>();
  const rail: ("stop" | "gap")[] = [];
  let stopped = false;
  for (const key of ["pray", "reach", "schedule", "fast", "tomorrow"]) {
    if (key === "fast" || key === "tomorrow") {
      if (remaining >= 64) {
        seated.add(key);
        remaining -= 64;
      }
      continue;
    }
    if (stopped) continue;
    if (remaining >= 64) {
      seated.add(key);
      remaining -= 64;
      if (key === "schedule") {
        const reserve = 64; // a fast stands in this fixture day
        let i = 0;
        while (i < candidates.length && rail.length < SLOTS) {
          const element = candidates[i];
          if (element === "gap") {
            const next = candidates[i + 1];
            if (next === undefined) break;
            if (rail.length + 2 <= SLOTS && remaining - GAP - STOP >= reserve) {
              rail.push("gap", "stop");
              remaining -= GAP + STOP;
              i += 2;
            } else if (remaining - STOP >= reserve) {
              rail.push("stop");
              remaining -= STOP;
              i += 2;
            } else break;
          } else {
            if (remaining - STOP >= reserve) {
              rail.push("stop");
              remaining -= STOP;
              i += 1;
            } else break;
          }
        }
      }
    } else {
      stopped = true;
    }
  }
  return { seated, rail };
}

describe("v470 Daily Breakdown — seating traces (Saturday candidates: stop, gap, stop, stop)", () => {
  const CANDIDATES: ("stop" | "gap")[] = ["stop", "gap", "stop", "stop"];

  it("the constants are the layout's own measure", () => {
    expect(shippedConstant("DB_RAIL_STOP_COST")).toBe(42);
    expect(shippedConstant("DB_RAIL_GAP_COST")).toBe(30);
    expect(shippedConstant("DB_RAIL_SLOTS")).toBe(7);
    // The walk reserves the anchor in the shipped source too.
    expect(breakdown).toContain("walkDbRail(railCandidates, remaining, if (fast != null) 64 else 0)");
  });

  it("at the v462 4x3 budget nothing extra seats — the card is v462's exactly", () => {
    const { seated, rail } = seatDb(300, CANDIDATES);
    expect(rail).toEqual([]);
    expect(seated.has("tomorrow")).toBe(false);
    // All four core rows still seat, fast included.
    expect([...seated].sort()).toEqual(["fast", "pray", "reach", "schedule"]);
  });

  it("at 390 an item beats its gap for the same budget — and the reserve still feeds fast", () => {
    // Budget after the core three: 162. Brush Teeth seats
    // (120 left). The gap+stop pair (72) would leave 48 <
    // the anchor's 64, so the gap drops and Gardening seats
    // alone (78 left); Duolingo then cannot seat without
    // starving fast, and fast seats.
    const { seated, rail } = seatDb(390, CANDIDATES);
    expect(rail).toEqual(["stop", "stop"]);
    expect(seated.has("fast")).toBe(true);
    expect(seated.has("tomorrow")).toBe(false);
  });

  it("at 420 the rail seats a prefix — Brush Teeth, the gap, Gardening — Duolingo waits", () => {
    const { seated, rail } = seatDb(420, CANDIDATES);
    expect(rail).toEqual(["stop", "gap", "stop"]);
    expect(seated.has("fast")).toBe(true);
    expect(seated.has("tomorrow")).toBe(false);
  });

  it("at 460 the whole rail seats; tomorrow still waits", () => {
    const { seated, rail } = seatDb(460, CANDIDATES);
    expect(rail).toEqual(["stop", "gap", "stop", "stop"]);
    expect(seated.has("fast")).toBe(true);
    expect(seated.has("tomorrow")).toBe(false);
  });

  it("at 540 everything in the drawing seats — rail whole, fast, and the Tomorrow row", () => {
    const { seated, rail } = seatDb(540, CANDIDATES);
    expect(rail).toEqual(["stop", "gap", "stop", "stop"]);
    expect(seated.has("fast")).toBe(true);
    expect(seated.has("tomorrow")).toBe(true);
  });

  it("the shipped walk carries the same rules the mirror walks (source)", () => {
    // A gap seats only together with the stop behind it...
    expect(railWalk).toContain(
      "remaining - DB_RAIL_GAP_COST - DB_RAIL_STOP_COST >= reserve",
    );
    // ...else the stop is tried alone (an item beats a gap).
    expect(railWalk).toContain("remaining - DB_RAIL_STOP_COST >= reserve");
    // The slot cap binds the walk.
    expect(railWalk).toContain("seated.size < DB_RAIL_SLOTS");
    // The walk runs inside the schedule seat, in the walk's
    // seat order — schedule, then the rail, fast attempted
    // on its own branch after.
    const scheduleSeat = breakdown.indexOf('if (key == "schedule")');
    const walkAt = breakdown.indexOf("walkDbRail(railCandidates, remaining");
    const fastBranch = breakdown.indexOf('if (key == "fast")');
    expect(scheduleSeat).toBeGreaterThan(-1);
    expect(walkAt).toBeGreaterThan(scheduleSeat);
    expect(fastBranch).toBeGreaterThan(-1);
  });
});

// ─── 6. The rail's dress — slots, segments, dots ───────────────────────────

describe("v470 Daily Breakdown — rail layout and slot fill", () => {
  it("the layout seats the rail inside the schedule section and tomorrow below fast", () => {
    const scheduleAt = layout.indexOf("@+id/db_row_schedule");
    const railAt = layout.indexOf("@+id/db_rail\"");
    const hair3At = layout.indexOf("@+id/db_hair_3");
    const fastAt = layout.indexOf("@+id/db_row_fast");
    const hair4At = layout.indexOf("@+id/db_hair_4");
    const tomorrowAt = layout.indexOf("@+id/db_row_tomorrow");
    expect(scheduleAt).toBeGreaterThan(-1);
    expect(scheduleAt).toBeLessThan(railAt);
    expect(railAt).toBeLessThan(hair3At);
    expect(hair3At).toBeLessThan(fastAt);
    expect(fastAt).toBeLessThan(hair4At);
    expect(hair4At).toBeLessThan(tomorrowAt);
    // Seven fixed slots, the classic RemoteViews pattern.
    expect(layout.match(/@\+id\/db_rail_row_\d/g)).toHaveLength(7);
    // Every slot carries the rail column and both faces.
    for (const n of [1, 7]) {
      for (const part of ["seg_top", "ring", "dot", "seg_bot", "line", "title", "sub", "gapbox", "gap_img", "gap"]) {
        expect(layout, `slot ${n} carries db_${part}_${n}`).toContain(`@+id/db_${part}_${n}"`);
      }
    }
    // The tomorrow row wears the fast row's tile dress.
    expect(layout).toContain("@+id/db_tomorrow_tile");
    expect(layout).toContain("@+id/db_tomorrow_glyph");
    // Still the vanilla subset.
    expect(layout).not.toMatch(/<View[\s>]/);
    expect(layout).not.toContain("<vector");
    expect(layout).not.toContain("ConstraintLayout");
    expect(layout).not.toContain("<Button");
  });

  it("the slot fill: segments INVISIBLE at the ends, the gap in surfaceAlt, the now dot primary", () => {
    // v458's rule, carried over: the dropped segment half is
    // INVISIBLE, never GONE — the weighted pair's even split
    // is what centres the dot.
    expect(railSlot).toContain('views.setViewVisibility(id("seg_top"), if (isFirst) View.INVISIBLE else View.VISIBLE)');
    expect(railSlot).toContain('views.setViewVisibility(id("seg_bot"), if (isLast) View.INVISIBLE else View.VISIBLE)');
    expect(railSlot).toContain('views.setInt(id("seg_top"), "setColorFilter", pal.track)');
    // The gap box is the Up Next white-block dress.
    expect(railSlot).toContain('views.setInt(id("gap_img"), "setColorFilter", pal.surfaceAlt)');
    // The now stop's dot is the palette primary; a plain stop
    // wears the ring (track ring, surface centre).
    expect(railSlot).toContain('views.setInt(id("dot"), "setColorFilter", pal.primary)');
    expect(railSlot).toContain('views.setInt(id("ring"), "setColorFilter", pal.track)');
    expect(railSlot).toContain('views.setInt(id("dot"), "setColorFilter", pal.surface)');
    // The container stands only while an element seated.
    const fill = rendererFn("fillDbRail");
    expect(fill).toContain(
      'views.setViewVisibility(R.id.db_rail, if (elements.isEmpty()) View.GONE else View.VISIBLE)',
    );
  });
});
