// ─────────────────────────────────────────────────────────────────────────────
// v294 — THE SCHEDULE BUILD. Jonathan approved the blend and ordered it
// Oct 27 17:01 ("Love it, build it. I'm trusting you.").
//
// Pins:
//  (a) WHITES — his true computation (lib/whites.ts): window 05:00–24:00;
//      splits 30 / 60 / 90 with the remainder absorbed (no free-standing
//      90); todos block at most 30 minutes (explicit end times capped
//      too); completed items free their time; on today, a block with
//      <15 minutes remaining is dropped; stepped heights by remaining
//      time; duration badge labels (30m / 1h / 1h 30m).
//  (b) TIME OFF — itinerary projection lands entries on the right days;
//      trip day numbering; the hero-trip pick; the travel components
//      carry NO completion affordance (his ruling: the time-off block
//      is never completable) and the day's band tap opens the Time Off
//      experience.
//  (c) DAY ORDER — the Completed stack is pushed before the worship
//      card in listData (completed above worship, his ruling).
//  (d) STUDY CARD — no wide Bible button in the personal-study card
//      render (his ruling).
//  (e) CREATORS — Off Event absent from the live Event form; a Notify
//      control present in all five creators; the shared seven-colour
//      palette is the one source and the Time Off pages use it.
//  (f) FAB — the morph component carries his five menu items in his
//      order with his colours, wired from schedule-tab.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const store = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => { store.set(k, v); }),
    removeItem: vi.fn(async (k: string) => { store.delete(k); }),
    clear: vi.fn(async () => { store.clear(); }),
  },
}));
import {
  calculateWhites,
  groupAdjacentWhites,
  splitGapMinutes,
  whiteBlockContainsNow,
  WHITES_WINDOW_START,
  WHITES_WINDOW_END,
  type WhiteSourceItem,
} from "../whites";
import { whiteBlockHeight, whiteBlockBadge } from "../time-blocks";
import {
  createTimeOff,
  getItineraryForDate,
  tripDayNumber,
  heroTrip,
  type TimeOff,
} from "../time-off";
import { SCHEDULE_COLOR_PALETTE } from "../schedule-data";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const ev = (startTime: string, endTime?: string, extra: Partial<WhiteSourceItem> = {}): WhiteSourceItem => ({
  kind: "event",
  startTime,
  endTime,
  ...extra,
});

const splitDurations = (total: number) => splitGapMinutes(0, total).map((s) => s.end - s.start);

describe("v294 whites — the window and the splits", () => {
  it("the window is 05:00–24:00 (his ruling, for people whose days start at 5)", () => {
    expect(WHITES_WINDOW_START).toBe("05:00");
    expect(WHITES_WINDOW_END).toBe("24:00");
  });

  it("splitGapMinutes mirrors his shipped splitter exactly", () => {
    expect(splitDurations(20)).toEqual([]);
    expect(splitDurations(45)).toEqual([30]);
    expect(splitDurations(60)).toEqual([60]);
    expect(splitDurations(65)).toEqual([60]);
    expect(splitDurations(90)).toEqual([90]);
    expect(splitDurations(100)).toEqual([100]);
    expect(splitDurations(119)).toEqual([119]);
    expect(splitDurations(120)).toEqual([60, 60]);
    expect(splitDurations(150)).toEqual([60, 90]);
    expect(splitDurations(200)).toEqual([60, 60, 60]);
  });

  it("an empty day yields blocks only inside 05:00–24:00", () => {
    const blocks = calculateWhites([], { isToday: false });
    expect(blocks[0].startTime).toBe("05:00");
    expect(blocks[blocks.length - 1].endTime).toBe("24:00");
    // 19 hours = 1140 minutes of plain 60-blocks.
    expect(blocks.reduce((sum, b) => sum + b.durationMinutes, 0)).toBe(1140);
  });

  it("items carve the day; gaps under 30 minutes yield nothing", () => {
    const blocks = calculateWhites([ev("09:00", "10:00"), ev("10:20", "11:00")], { isToday: false });
    expect(blocks.some((b) => b.startTime === "10:00")).toBe(false);
    expect(blocks.some((b) => b.startTime === "11:00")).toBe(true);
  });
});

describe("v294 whites — todos cap at 30 and completion frees time", () => {
  it("a todo with an explicit 2-hour end still blocks only 30 minutes", () => {
    const blocks = calculateWhites(
      [{ kind: "todo", startTime: "09:00", endTime: "11:00" }],
      { isToday: false },
    );
    const after = blocks.find((b) => b.startTime === "09:30");
    expect(after).toBeTruthy();
  });

  it("a todo without an end blocks 30 minutes", () => {
    const blocks = calculateWhites([{ kind: "todo", startTime: "09:00" }], { isToday: false });
    expect(blocks.some((b) => b.startTime === "09:30")).toBe(true);
    expect(blocks.some((b) => b.startTime === "09:00")).toBe(false);
  });

  it("a completed event frees its time — the white returns", () => {
    const done = calculateWhites([ev("09:00", "10:00", { isCompleted: true })], { isToday: false });
    const open = calculateWhites([ev("09:00", "10:00")], { isToday: false });
    expect(done.some((b) => b.startTime === "09:00")).toBe(true);
    expect(open.some((b) => b.startTime === "09:00")).toBe(false);
  });
});

describe("v294 whites — today's live rules", () => {
  it("a block with <15 minutes remaining is dropped; 15 exactly survives", () => {
    // 10:00 now; the free block 10:00–10:30 has 30 left → survives.
    // A 10:00–11:00 item ends the previous block at 10:00 sharp.
    const blocks = calculateWhites([ev("11:00", "12:00")], { isToday: true, nowMinutes: 10 * 60 + 50 });
    // The block 05:00–11:00 splits; its last piece ends 11:00 with 10
    // minutes left from 10:50 → dropped.
    expect(blocks.some((b) => b.endTime === "11:00")).toBe(false);
    const blocks2 = calculateWhites([ev("11:00", "12:00")], { isToday: true, nowMinutes: 10 * 60 + 45 });
    expect(blocks2.some((b) => b.endTime === "11:00")).toBe(true);
  });

  it("stepped heights step down by remaining time in the live block", () => {
    expect(whiteBlockHeight(30)).toBe(52);
    expect(whiteBlockHeight(60)).toBe(64);
    expect(whiteBlockHeight(90)).toBe(76);
    expect(whiteBlockHeight(90, 75)).toBe(76);
    expect(whiteBlockHeight(90, 45)).toBe(64);
    expect(whiteBlockHeight(90, 12)).toBe(52);
  });

  it("badge labels: 30m / 1h / 1h 30m", () => {
    expect(whiteBlockBadge(30)).toBe("30m");
    expect(whiteBlockBadge(60)).toBe("1h");
    expect(whiteBlockBadge(90)).toBe("1h 30m");
  });

  it("contains-now and hour-adjacent grouping", () => {
    const blocks = calculateWhites([ev("12:00", "13:00")], { isToday: true, nowMinutes: 11 * 60 + 30 });
    const live = blocks.find((b) => whiteBlockContainsNow(b, 11 * 60 + 30));
    expect(live).toBeTruthy();
    const groups = groupAdjacentWhites(blocks);
    expect(groups.length).toBe(2); // the live block before the event, the run after 13:00
    expect(groups[0].length).toBe(1);
    expect(groups[1].length).toBeGreaterThan(1);
  });
});

describe("v294 time off — itinerary projection and trip math", () => {
  const trip: TimeOff = {
    id: "trip-1",
    title: "Family trip",
    type: "vacation",
    startDate: "2026-11-20",
    endDate: "2026-11-29",
    color: "#3B82F6",
    notes: "notes",
    createdAt: "2026-10-27T00:00:00.000Z",
    updatedAt: "2026-10-27T00:00:00.000Z",
    itinerary: [
      { id: "e1", kind: "travel", date: "2026-11-20", time: "06:40", title: "Flight UA 1847", address: "LAX Terminal 7", detail: "LAX → DEN" },
      { id: "e2", kind: "stay", date: "2026-11-20", time: "15:00", title: "Check in — Canyon Inn", address: "412 Mesa Rd, Moab, UT", detail: "Check-out Mon, Nov 23 · Conf. #A7K2Q" },
      { id: "e3", kind: "plan", date: "2026-11-22", title: "Arches at sunrise" },
    ],
  };

  it("entries land on their own dates only", () => {
    expect(getItineraryForDate(trip, "2026-11-20").map((e) => e.id)).toEqual(["e1", "e2"]);
    expect(getItineraryForDate(trip, "2026-11-22").map((e) => e.id)).toEqual(["e3"]);
    expect(getItineraryForDate(trip, "2026-11-21")).toEqual([]);
  });

  it("trip day numbering counts from day 1", () => {
    expect(tripDayNumber(trip, "2026-11-20")).toEqual({ day: 1, total: 10 });
    expect(tripDayNumber(trip, "2026-11-29")).toEqual({ day: 10, total: 10 });
    expect(tripDayNumber(trip, "2026-11-19")).toBeNull();
    expect(tripDayNumber(trip, "2026-11-30")).toBeNull();
  });

  it("the hero is the ongoing trip first, else the next upcoming", () => {
    const past: TimeOff = { ...trip, id: "past", startDate: "2026-10-01", endDate: "2026-10-03" };
    expect(heroTrip([past, trip], "2026-11-21")?.id).toBe(trip.id);
    expect(heroTrip([past, trip], "2026-11-01")?.id).toBe(trip.id);
    expect(heroTrip([past], "2026-11-01")).toBeNull();
  });

  it("createTimeOff round-trips notify + itinerary additively", async () => {
    const made = await createTimeOff("X", "vacation", "2026-12-01", "2026-12-02", "#3B82F6", "", {
      notify: false,
      itinerary: [{ id: "i1", kind: "plan", date: "2026-12-01", title: "Rest" }],
    });
    expect(made.notify).toBe(false);
    expect(made.itinerary).toHaveLength(1);
  });
});

describe("v294 time off — the block is never completable (source pins)", () => {
  const travel = read("components/time-off-travel.tsx");
  const tab = read("components/schedule-tab.tsx");

  it("TripBand carries no toggle/complete handler at all", () => {
    const band = travel.slice(travel.indexOf("export function TripBand"), travel.indexOf("export function ItineraryDayCard"));
    expect(band).not.toMatch(/onToggle|toggle|isCompleted|Mark Complete/);
    expect(band).toMatch(/onPress/);
  });

  it("the day's time-off case renders the band and opens the experience", () => {
    const dayCase = tab.slice(tab.indexOf('case "time-off":'), tab.indexOf('case "itinerary":'));
    expect(dayCase).toMatch(/<TripBand/);
    expect(dayCase).toMatch(/openTimeOffExperience\(item\.data\.id\)/);
    expect(dayCase).not.toMatch(/onToggle|isCompleted/);
  });

  it("itinerary entries render as travel cards in the day", () => {
    const itinCase = tab.slice(tab.indexOf('case "itinerary":'), tab.indexOf('case "birthday":'));
    expect(itinCase).toMatch(/<ItineraryDayCard/);
  });

  it("claimed rest replaces whites on trip days", () => {
    // v314 re-pin: claimed rest now renders through the claimed
    // GROUP (adjacent blocks connected like the whites) — the
    // never-completable rule this pin guards is unchanged.
    expect(tab).toMatch(/<ClaimedRestGroup/);
  });
});

describe("v294 day order + study card (source pins)", () => {
  const tab = read("components/schedule-tab.tsx");

  it("completed items are pushed before the worship card in listData", () => {
    const listStart = tab.indexOf("const listData = useMemo");
    const completedPush = tab.indexOf("completedEvents.forEach", listStart);
    const worshipPush = tab.indexOf('type: "worship-display"', listStart);
    expect(completedPush).toBeGreaterThan(-1);
    expect(worshipPush).toBeGreaterThan(-1);
    expect(completedPush).toBeLessThan(worshipPush);
  });

  it("the study card render carries no wide Bible button", () => {
    const studyStart = tab.indexOf('case "personal-study-card":');
    const region = tab.slice(studyStart, studyStart + 6000);
    expect(region).not.toMatch(/studyBibleButton/);
    expect(region).toMatch(/Read Chapter/);
  });
});

describe("v294 creators (source pins)", () => {
  const eventForm = read("components/event-edit-form.tsx");
  const tab = read("components/schedule-tab.tsx");
  const experience = read("components/time-off-experience.tsx");

  it("Off Event is absent from the live Event form", () => {
    expect(eventForm).not.toMatch(/OFF EVENT|isOffEvent|formOffEvent|posterPicker|pickPoster/);
  });

  it("Notify is present in all five creators", () => {
    expect(eventForm).toMatch(/formNotify/);
    expect(eventForm).toMatch(/NOTIFY/);
    // Todo: the standing notificationsEnabled switch.
    expect(tab).toMatch(/formTodoNotificationsEnabled/);
    // Ministry + Worship: the v294 switches and their save wiring.
    expect(tab).toMatch(/formMinistryNotify/);
    expect(tab).toMatch(/notificationsEnabled: formMinistryNotify/);
    expect(tab).toMatch(/formWorshipNotify/);
    expect(tab).toMatch(/notify: formWorshipNotify/);
    // Time Off: the Book form's switch.
    expect(experience).toMatch(/notify/);
    expect(experience).toMatch(/Get a reminder when it starts/);
  });

  it("the shared palette is the seven circles, and Time Off uses it", () => {
    expect(SCHEDULE_COLOR_PALETTE.map((c) => c.hex)).toEqual([
      "#6B7280", "#EF4444", "#F97316", "#FBBF24", "#10B981", "#3B82F6", "#A855F7",
    ]);
    expect(experience).toMatch(/SCHEDULE_COLOR_PALETTE/);
    expect(eventForm).toMatch(/SCHEDULE_COLOR_PALETTE\.map/);
  });

  it("the scheduler honors the new notify flags", () => {
    const scheduler = read("lib/notification-scheduler.ts");
    expect(scheduler).toMatch(/event\.notify === false/);
    expect(scheduler).toMatch(/ministry\.notificationsEnabled === false/);
  });
});

describe("v294 FAB (source pins)", () => {
  const tab = read("components/schedule-tab.tsx");
  const fab = read("components/schedule-fab.tsx");

  it("schedule-tab wires the morph with his five items in his order and colours", () => {
    // v295 re-base (citation): the FAB's MOUNT moved out of
    // schedule-tab to the shell (the tab bar painted over it —
    // lib/schedule-fab-bridge.ts); schedule-tab now wires the same
    // five items through setScheduleFabConfig. The pin's intent —
    // his items, his order, his colours, wired from schedule-tab —
    // is unchanged; only the anchor moved to the registration call.
    const start = tab.indexOf("setScheduleFabConfig({");
    const region = tab.slice(start, start + 3200);
    const order = ["Ministry", "Event", "Todo", "Worship", "Time Off"].map((label) => region.indexOf(`label: "${label}"`));
    expect(order.every((i) => i > -1)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    for (const hex of ["#7C5CFF", "#3DAA78", "#E3B341", "#9C27B0", "#E1F5FE", "#01579B"]) {
      expect(region).toContain(hex);
    }
    expect(region).toMatch(/openTimeOffExperience\(null\)/);
  });

  it("the morph uses the emphasized curves and the 135° turn", () => {
    expect(fab).toMatch(/Easing\.bezier\(0\.05, 0\.7, 0\.1, 1\)/);
    expect(fab).toMatch(/Easing\.bezier\(0\.3, 0, 0\.8, 0\.15\)/);
    expect(fab).toMatch(/\[0, 135\]/);
  });

  it("the letter wave is gone from the whites (his ruling)", () => {
    const indicator = read("components/time-block-indicator.tsx");
    expect(indicator).not.toMatch(/WavyWord|WavyLetter/);
    expect(indicator).toMatch(/whiteBlockHeight/);
    expect(indicator).toMatch(/whiteBlockBadge/);
  });
});
