// v279 — The Street & The Café: the loop (Jonathan approved the
// "how it plays" sheet 2026-10-26, "Okay let's do it").
//
// Pins for the café derivations (lib/cafe-street.ts) over the app's
// REAL records, the forward prayed-dates log in lib/prayercircle-data
// (written at the one choke point every prayer completion flows
// through), the away-report café line (lib/welcoming-town), and
// source pins for the town-map wiring:
//
//  - The board's tickets ARE today's prayer list (the app's own
//    getPrayTodayList), ordered emergency → slipping → praise →
//    waiting → served, each carrying the lead need's own words.
//  - A ticket clears when its person is prayed — both completion
//    paths (session commit, tap-to-pray) run through
//    markPersonPrayed, which is also where the log is written.
//  - Flourishing tiers come from the proven record only (recency
//    bands); the faithful-week star and the week strip claim nothing
//    the record doesn't prove — the log starts empty and is never
//    backfilled, and the honest sparse case is pinned as such.
//  - Slipping = the app's 14-day reach cadence (opt-out honored,
//    never-reached never due) OR 14+ days since last prayed, and
//    never someone already served today.
//  - Ovens read the fasting engine's day states; a kept week opens
//    the lot exactly once; coins never touch a ticket (the board
//    builder is pure over frozen fixtures and imports no coin writer).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  appendPrayedDate,
  getPrayTodayList,
  getTodayISOString,
  markPersonPrayed,
  removePrayedDate,
  unmarkPersonPrayed,
  type Person,
  type PrayerItem,
} from "@/lib/prayercircle-data";
import type { PersonalFast } from "@/lib/prayercircle-fasting";
import {
  buildCafeBoard,
  CAFE_WEEK_LOT,
  daysBetweenIso,
  effectivePrayedDates,
  fastWeeksCompleted,
  flourishTierFor,
  hasFaithfulWeek,
  loadCafeStreetData,
  ovenStateFor,
  parseCafeStreetState,
  settleCafeStreetWeeks,
  slippingPeople,
  weekStripFor,
} from "@/lib/cafe-street";
import { buildAwayReport } from "@/lib/welcoming-town";
import { isStreamTile, TOWN_PATH, townLandmarkAt, townLotAt } from "@/lib/hometown";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

// Wednesday, October 21, 2026 — a fixed "today" so every derivation
// is deterministic in any CI timezone (all math is local-day based).
const TODAY = "2026-10-21";
const NOW = new Date(2026, 9, 21, 12, 0, 0);
const HOUR = 60 * 60 * 1000;

function person(over: Partial<Person> & { id: string; name: string }): Person {
  return {
    initials: over.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2),
    relationship: "Ministry",
    lastPrayedDate: null,
    reminderDaysOfWeek: [],
    accentColor: "#7C3AED",
    avatarColor: "#DDD6FE",
    prayerItems: [],
    ...over,
  };
}

function item(over: Partial<PrayerItem> & { id: string; title: string }): PrayerItem {
  return { isUrgent: false, isDone: false, ...over };
}

function fast(dayStatuses: Record<string, string>, over: Partial<PersonalFast> = {}): PersonalFast {
  return {
    id: "fast-1",
    name: "365-Day Growth Fast",
    startDate: "2026-09-02",
    durationDays: 60,
    type: "Growth",
    focusItems: [],
    dayStatuses: dayStatuses as PersonalFast["dayStatuses"],
    createdAt: "2026-09-02T00:00:00.000Z",
    ...over,
  };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

// ── The cast (mirrors the approved sheet) ───────────────────────────────────

const gabriel = () =>
  person({
    id: "gab",
    name: "Gabriel Gutierrez",
    reminderDaysOfWeek: [3], // due today (Wednesday)
    prayerItems: [
      item({
        id: "gab-1",
        title: "Sick",
        isEmergency: true,
        emergencyExpiresAt: new Date(NOW.getTime() + 9 * HOUR).toISOString(),
      }),
    ],
  });

const ruth = () =>
  person({
    id: "ruth",
    name: "Ruth Alvarez",
    reminderDaysOfWeek: [3],
    prayerItems: [item({ id: "ruth-1", title: "New job" })],
  });

const calebServed = () =>
  person({
    id: "caleb",
    name: "Caleb Brooks",
    reminderDaysOfWeek: [3],
    lastPrayerCompletedDate: TODAY,
    prayerItems: [item({ id: "caleb-1", title: "Safe travels", isDone: true })],
  });

const piaPraise = () =>
  person({
    id: "pia",
    name: "Pia Santos",
    reminderDaysOfWeek: [3],
    isPraised: true,
    praiseExpiresAt: new Date(NOW.getTime() + 5 * HOUR).toISOString(),
    praiseTitle: "New grandbaby",
    prayerItems: [],
  });

const martaSlippingOnList = () =>
  person({
    id: "marta",
    name: "Marta Reyes",
    reminderDaysOfWeek: [3], // on today's list…
    lastPrayedDate: "2026-09-30", // …last reached 21 days ago
    lastPrayerCompletedDate: "2026-10-01", // …last prayed 20 days ago
    prayerItems: [item({ id: "marta-1", title: "Her son's court date" })],
  });

const danielSlippingOffList = () =>
  person({
    id: "daniel",
    name: "Daniel Ortiz",
    reminderDaysOfWeek: [], // NOT on today's list
    lastPrayedDate: "2026-10-07", // reached exactly 14 days ago
    lastPrayerCompletedDate: "2026-10-05", // prayed 16 days ago
    prayerItems: [item({ id: "daniel-1", title: "Work troubles" })],
  });

const cast = () => [gabriel(), ruth(), calebServed(), piaPraise(), martaSlippingOnList(), danielSlippingOffList()];

describe("v279 — the order board is today's prayer list", () => {
  it("every pray-today person has exactly one ticket; the list itself is untouched", () => {
    const people = cast();
    const list = getPrayTodayList(people, 3, 21);
    const board = buildCafeBoard(people, TODAY, NOW);
    const onListTickets = board.tickets.filter((t) => !t.tomorrow);
    expect(new Set(onListTickets.map((t) => t.personId))).toEqual(new Set(list.map((p) => p.id)));
    expect(onListTickets.length).toBe(list.length);
    expect(board.ordersTotal).toBe(list.length);
  });

  it("orders: emergency first, then slipping by longest wait, then praise, waiting, served", () => {
    const board = buildCafeBoard(cast(), TODAY, NOW);
    expect(board.tickets.map((t) => t.personId)).toEqual(["gab", "marta", "daniel", "pia", "ruth", "caleb"]);
    expect(board.tickets.map((t) => t.kind)).toEqual([
      "emergency",
      "waiting", // marta — slipping band (dashed), still a waiting ticket
      "waiting", // daniel — tomorrow pin
      "praise",
      "waiting",
      "served",
    ]);
  });

  it("tickets carry the lead need's own words; praise carries his headline", () => {
    const board = buildCafeBoard(cast(), TODAY, NOW);
    const byId = new Map(board.tickets.map((t) => [t.personId, t]));
    expect(byId.get("gab")?.need).toBe("Sick");
    expect(byId.get("ruth")?.need).toBe("New job");
    expect(byId.get("pia")?.need).toBe("New grandbaby");
    expect(byId.get("marta")?.need).toBe("Her son's court date");
  });

  it("slipping tickets are dashed-tagged with their days; daniel pins for tomorrow", () => {
    const board = buildCafeBoard(cast(), TODAY, NOW);
    const byId = new Map(board.tickets.map((t) => [t.personId, t]));
    expect(byId.get("marta")?.slippingDays).toBe(20); // the prayer record's staleness
    expect(byId.get("marta")?.tomorrow).toBeUndefined();
    expect(byId.get("daniel")?.slippingDays).toBe(16);
    expect(byId.get("daniel")?.tomorrow).toBe(true);
    expect(byId.get("ruth")?.slippingDays).toBeUndefined();
  });

  it("counts name today's orders only — the tomorrow pin is not an order", () => {
    const board = buildCafeBoard(cast(), TODAY, NOW);
    expect(board.ordersTotal).toBe(5);
    expect(board.ordersServed).toBe(1);
    expect(board.ordersWaiting).toBe(4);
  });

  it("a ticket clears the moment its person is prayed today", () => {
    const people = cast();
    const before = buildCafeBoard(people, TODAY, NOW);
    expect(before.tickets[0]).toMatchObject({ personId: "gab", kind: "emergency" });

    const prayed = people.map((p) =>
      p.id === "gab" ? { ...p, lastPrayerCompletedDate: TODAY } : p,
    );
    const after = buildCafeBoard(prayed, TODAY, NOW);
    const gab = after.tickets.find((t) => t.personId === "gab");
    expect(gab?.kind).toBe("served");
    expect(after.tickets.some((t) => t.kind === "emergency")).toBe(false);
    expect(after.ordersServed).toBe(2);
  });

  it("coins never touch a ticket: the builder is pure over frozen records", () => {
    const people = deepFreeze(cast());
    const board = buildCafeBoard(people, TODAY, NOW);
    expect(board.tickets.length).toBe(6);
    const src = read("lib/cafe-street.ts");
    expect(src).not.toMatch(/applyCoinsDelta|addCoins|writeCoinsRecord|accrueAwayIncome/);
  });
});

describe("v279 — the prayed-dates log, written at the choke point", () => {
  it("markPersonPrayed appends today, once, and keeps earlier days", () => {
    const todayReal = getTodayISOString();
    const p = person({ id: "x", name: "Xavier Young", prayedDates: ["2026-01-01"] });
    const once = markPersonPrayed([p], "x")[0];
    expect(once.lastPrayerCompletedDate).toBe(todayReal);
    expect(once.prayedDates).toEqual(["2026-01-01", todayReal]);
    const twice = markPersonPrayed([once], "x")[0];
    expect(twice.prayedDates).toEqual(["2026-01-01", todayReal]);
  });

  it("unmarkPersonPrayed unwinds today's log entry with the completion", () => {
    const todayReal = getTodayISOString();
    const p = person({ id: "x", name: "Xavier Young", prayedDates: ["2026-01-01", todayReal] });
    const un = unmarkPersonPrayed([p], "x")[0];
    expect(un.lastPrayerCompletedDate).toBeNull();
    expect(un.prayedDates).toEqual(["2026-01-01"]);
  });

  it("append/remove helpers dedupe, sort, and tolerate a missing log", () => {
    expect(appendPrayedDate(undefined, "2026-10-21")).toEqual(["2026-10-21"]);
    expect(appendPrayedDate(["2026-10-21", "2026-10-19"], "2026-10-20")).toEqual([
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
    ]);
    expect(appendPrayedDate(["2026-10-21"], "2026-10-21")).toEqual(["2026-10-21"]);
    expect(removePrayedDate(undefined, "2026-10-21")).toEqual([]);
    expect(removePrayedDate(["bad-date", "2026-10-21"], "2026-10-20")).toEqual(["bad-date", "2026-10-21"]);
  });

  it("existing records carry no log until their next prayer — nothing is backfilled", () => {
    const legacy = person({ id: "old", name: "Old Friend", lastPrayerCompletedDate: "2026-10-18" });
    expect(legacy.prayedDates).toBeUndefined();
    expect(effectivePrayedDates(legacy)).toEqual(["2026-10-18"]);
  });
});

describe("v279 — flourishing, from the proven record only", () => {
  it("tiers are recency bands: today / within the week / older-or-never", () => {
    expect(flourishTierFor(person({ id: "a", name: "A", lastPrayerCompletedDate: TODAY }), TODAY)).toBe("flourishing");
    expect(flourishTierFor(person({ id: "b", name: "B", lastPrayerCompletedDate: "2026-10-18" }), TODAY)).toBe("warming");
    expect(flourishTierFor(person({ id: "c", name: "C", lastPrayerCompletedDate: "2026-10-14" }), TODAY)).toBe("warming"); // exactly 7
    expect(flourishTierFor(person({ id: "d", name: "D", lastPrayerCompletedDate: "2026-10-13" }), TODAY)).toBe("held"); // 8 days
    expect(flourishTierFor(person({ id: "e", name: "E", lastPrayerCompletedDate: "2026-09-30" }), TODAY)).toBe("held");
    expect(flourishTierFor(person({ id: "f", name: "F" }), TODAY)).toBe("held"); // never — held, not scolded
  });

  it("the log counts as record too: a logged day within the week warms", () => {
    const p = person({ id: "g", name: "G", prayedDates: ["2026-10-20"] });
    expect(flourishTierFor(p, TODAY)).toBe("warming");
    expect(effectivePrayedDates(p)).toEqual(["2026-10-20"]);
  });

  it("the faithful-week star needs 4 proven days in the last 7 — no thinner claim", () => {
    const four = person({
      id: "h",
      name: "H",
      prayedDates: ["2026-10-15", "2026-10-17", "2026-10-19"],
      lastPrayerCompletedDate: TODAY, // the union proves the 4th day
    });
    expect(hasFaithfulWeek(four, TODAY)).toBe(true);
    const three = person({ id: "i", name: "I", prayedDates: ["2026-10-17", "2026-10-19"], lastPrayerCompletedDate: TODAY });
    expect(hasFaithfulWeek(three, TODAY)).toBe(false);
    const stale = person({ id: "j", name: "J", prayedDates: ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"] });
    expect(hasFaithfulWeek(stale, TODAY)).toBe(false);
  });

  it("the week strip shows exactly what the record proves — the honest sparse case", () => {
    // Prayed five of the last seven days BEFORE the log existed: the
    // record proves only the last completion date, and the strip says
    // exactly that — one dot, not five invented ones.
    const preLog = person({ id: "k", name: "K", lastPrayerCompletedDate: "2026-10-18" });
    const strip = weekStripFor(preLog, TODAY);
    expect(strip.count).toBe(1);
    expect(strip.days.map((d) => d.prayed)).toEqual([false, false, false, true, false, false, false]);

    const logged = person({
      id: "l",
      name: "L",
      prayedDates: ["2026-10-15", "2026-10-17", "2026-10-19", "2026-10-20"],
      lastPrayerCompletedDate: TODAY,
    });
    const strip2 = weekStripFor(logged, TODAY);
    expect(strip2.count).toBe(5);
    expect(strip2.days[6]).toEqual({ date: TODAY, prayed: true });
  });

  it("day math is local and exact across month edges", () => {
    expect(daysBetweenIso("2026-10-07", "2026-10-21")).toBe(14);
    expect(daysBetweenIso("2026-09-30", "2026-10-21")).toBe(21);
    expect(daysBetweenIso("2026-10-21", "2026-10-21")).toBe(0);
    expect(daysBetweenIso("nope", "2026-10-21")).toBeNull();
  });
});

describe("v279 — someone slipping", () => {
  it("due-to-reach at exactly 14 days, on the app's own cadence", () => {
    const s = slippingPeople([danielSlippingOffList()], TODAY);
    expect(s.length).toBe(1);
    expect(s[0].byReach).toBe(true);
    expect(s[0].byPrayer).toBe(true);
    expect(s[0].days).toBe(16); // the tag reads the prayer record's staleness
  });

  it("never-reached and never-prayed is NOT slipping — no record, no flag", () => {
    expect(slippingPeople([person({ id: "n", name: "New Person" })], TODAY)).toEqual([]);
  });

  it("the reach opt-out is honored for the reach clause", () => {
    const optedOut = person({
      id: "o",
      name: "Opted Out",
      showInPrayerCheckIns: false,
      lastPrayedDate: "2026-09-01", // reached 50 days ago, but opted out
      lastPrayerCompletedDate: "2026-10-19", // prayed 2 days ago
    });
    expect(slippingPeople([optedOut], TODAY)).toEqual([]);
  });

  it("…but the prayer clause stands on its own record", () => {
    const stale = person({
      id: "o2",
      name: "Opted Stale",
      showInPrayerCheckIns: false,
      lastPrayedDate: "2026-10-19", // reached recently
      lastPrayerCompletedDate: "2026-09-25", // not prayed in 26 days
    });
    const s = slippingPeople([stale], TODAY);
    expect(s.length).toBe(1);
    expect(s[0].byReach).toBe(false);
    expect(s[0].byPrayer).toBe(true);
    expect(s[0].days).toBe(26);
  });

  it("someone served today never stands at the door, however stale the reach record", () => {
    const servedStaleReach = person({
      id: "s",
      name: "Served Today",
      lastPrayedDate: "2026-09-01",
      lastPrayerCompletedDate: TODAY,
    });
    expect(slippingPeople([servedStaleReach], TODAY)).toEqual([]);
  });

  it("longest-waiting first", () => {
    const s = slippingPeople([danielSlippingOffList(), martaSlippingOnList()], TODAY);
    expect(s.map((x) => x.person.id)).toEqual(["marta", "daniel"]);
  });
});

describe("v279 — the fast feeds the café", () => {
  it("ovens: missed today is cold; kept, pending, and skipped are lit; no fast is none", () => {
    expect(ovenStateFor(fast({ [TODAY]: "missed" }), TODAY)).toBe("cold");
    expect(ovenStateFor(fast({ [TODAY]: "completed" }), TODAY)).toBe("lit");
    expect(ovenStateFor(fast({}), TODAY)).toBe("lit");
    expect(ovenStateFor(fast({ [TODAY]: "skipped" }), TODAY)).toBe("lit");
    expect(ovenStateFor(null, TODAY)).toBe("none");
  });

  it("kept weeks count from the engine's own progress", () => {
    const days: Record<string, string> = {};
    // 14 kept days inside the fast's calendar (Sep 2 + 60 days)
    for (let i = 0; i < 14; i++) {
      const d = new Date(2026, 8, 2 + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days[iso] = "completed";
    }
    expect(fastWeeksCompleted(fast(days))).toBe(2);
    const six = { ...days };
    for (let i = 6; i < 14; i++) {
      const d = new Date(2026, 8, 2 + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      delete six[iso];
    }
    expect(fastWeeksCompleted(fast(six))).toBe(0); // 6 kept days is not a week
    expect(fastWeeksCompleted(null)).toBe(0);
  });

  it("the lot milestone fires once and never lowers", () => {
    const twoWeeks = fast((() => {
      const days: Record<string, string> = {};
      for (let i = 0; i < 14; i++) {
        const d = new Date(2026, 8, 2 + i);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        days[iso] = "completed";
      }
      return days;
    })());
    const first = settleCafeStreetWeeks({ weekLots: 0 }, twoWeeks);
    expect(first).toEqual({ state: { weekLots: 2 }, newLots: 2 });
    const again = settleCafeStreetWeeks(first.state, twoWeeks);
    expect(again.newLots).toBe(0);
    expect(again.state.weekLots).toBe(2);
    const higher = settleCafeStreetWeeks({ weekLots: 5 }, twoWeeks);
    expect(higher.state.weekLots).toBe(5);
    expect(higher.newLots).toBe(0);
    expect(parseCafeStreetState({ weekLots: 2.9 }).weekLots).toBe(2);
    expect(parseCafeStreetState({ weekLots: -3 }).weekLots).toBe(0);
    expect(parseCafeStreetState("garbage").weekLots).toBe(0);
    expect(parseCafeStreetState(null).weekLots).toBe(0);
  });

  it("the roped lot's ground is claimed by no lot, path, landmark, or stream", () => {
    for (let x = CAFE_WEEK_LOT.x; x < CAFE_WEEK_LOT.x + CAFE_WEEK_LOT.w; x++) {
      for (let y = CAFE_WEEK_LOT.y; y < CAFE_WEEK_LOT.y + CAFE_WEEK_LOT.h; y++) {
        expect(townLotAt(x, y)).toBeUndefined();
        expect(townLandmarkAt(x, y)).toBeUndefined();
        expect(isStreamTile(x, y)).toBe(false);
        expect(TOWN_PATH.some((t) => t.x === x && t.y === y)).toBe(false);
      }
    }
  });
});

describe("v279 — the return card gains the café's day", () => {
  const base = {
    absenceMs: 60 * 60 * 1000,
    deltas: [{ buildingId: "b1", name: "Bakery", coins: 50 }],
    shiftsDone: [],
    missedCoins: 0,
    missedXP: 0,
    totalWaiting: 120,
  };

  it("no orders input — no café line (the v271 report is unchanged)", () => {
    const report = buildAwayReport(base);
    expect(report).not.toBeNull();
    expect(report!.lines.join("\n")).not.toMatch(/café/);
  });

  it("mixed day, all-served day, and all-waiting day each get their true line", () => {
    expect(buildAwayReport({ ...base, orders: { served: 3, waiting: 2 } })!.lines).toContain(
      "Today's café orders: 3 served · 2 still waiting",
    );
    expect(buildAwayReport({ ...base, orders: { served: 5, waiting: 0 } })!.lines).toContain(
      "Every one of today's café orders was served",
    );
    expect(buildAwayReport({ ...base, orders: { served: 0, waiting: 1 } })!.lines).toContain(
      "Today's café order is still waiting to be served",
    );
    expect(buildAwayReport({ ...base, orders: { served: 0, waiting: 0 } })!.lines.join("\n")).not.toMatch(/café/);
  });
});

describe("v279 — the wiring stands in the app", () => {
  it("the loader exists and reads the app's own stores", () => {
    expect(typeof loadCafeStreetData).toBe("function");
    const src = read("lib/cafe-street.ts");
    expect(src).toContain("prayercircle.people.v1");
    expect(src).toContain("prayercircle.fasts.v1");
  });

  it("hometown renders the café on the town map and feeds the report", () => {
    const src = read("app/hometown.tsx");
    expect(src).toContain("<CafeStreetOverlay");
    expect(src).toContain("<CafeWeekLot");
    expect(src).toContain("loadCafeStreetData()");
    expect(src).toContain("orders: cafeOrders");
    expect(src).toContain("weekStripFor(person, cafeDay)");
    expect(src).toContain("cottageBloom");
  });

  it("the star rides the lights from the faithful-week record", () => {
    const npcs = read("components/town-npcs.tsx");
    expect(npcs).toContain("npc.star");
    const home = read("app/hometown.tsx");
    expect(home).toContain("star: faithfulIds.has(String(p.id)) || undefined");
  });

  it("prayer completion's choke point writes the log (both paths run through it)", () => {
    const data = read("lib/prayercircle-data.ts");
    expect(data).toContain("prayedDates: appendPrayedDate(p.prayedDates, today)");
    const shell = read("app/(tabs)/index.tsx");
    // The session commit and the tap-to-pray undo timer both land on
    // commitPrayTodayPerson, whose only people-write is markPersonPrayed.
    expect(shell).toContain("const updatedPeople = markPersonPrayed(previousPeople, personId);");
  });
});
