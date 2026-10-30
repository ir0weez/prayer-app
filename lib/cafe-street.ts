// ─────────────────────────────────────────────────────────────────────────────
// v279 — The Street & The Café: the loop (Jonathan approved the
// "how it plays" sheet 2026-10-26, "Okay let's do it").
//
// The town map gets a heart: the café, where praying for someone IS the
// serving. Everything here is a pure derivation over the app's REAL
// records — the same sources the People page itself reads:
//
//  - The ORDER BOARD carries one ticket per person on TODAY'S prayer
//    list (getPrayTodayList — the app's own derivation), each ticket
//    naming the person's lead need (getLeadNeed — the session's own
//    pick). Emergency tickets stand first and red; praise wears gold;
//    someone slipping (due-to-reach on the app's 14-day cadence, or
//    14+ days since they were last prayed for) pins AHEAD of the
//    ordinary tickets with a dashed ticket and a days tag — also when
//    they are not on today's list (the sheet's "tomorrow — first"
//    pin). A ticket clears the moment its person is prayed for today
//    (hasPersonCompletedPrayerToday — the same state that lights the
//    v89 prayer villagers and the v271 wake dress). Coins never touch
//    a ticket: nothing in this module moves money, and no caller may
//    clear a ticket with anything but prayer.
//
//  - FLOURISHING reads the per-person record honestly. Before v279 the
//    app kept only ONE completion date per person, so the tiers are
//    recency bands over the dates that actually exist (lastPrayer-
//    CompletedDate + the new prayedDates forward log — see
//    Person.prayedDates): prayed today → flourishing; last prayed
//    within the week → warming (colour coming in); older or never →
//    held (grey). The log starts EMPTY and is never backfilled, so
//    the finer truths (the 4-of-7 "faithful week" star, the 7-day
//    week strip) only ever claim what the log + the last completion
//    date together prove — understated at first, exact over time.
//
//  - THE FAST feeds the café: the ovens read the fasting engine's own
//    day states for the active fast — lit while today is kept, still
//    pending, or rested (skipped); cold on a day marked missed. A
//    completed fast WEEK (7 kept days inside the current fast) opens
//    one roped lot at the street's end; the milestone settles into a
//    tiny stored state so it fires once and stays.
//
//  - Hometown's gate stands over all of it: the town only exists on
//    fasts longer than 40 days, and the screen renders nothing here
//    while it is locked.
// ─────────────────────────────────────────────────────────────────────────────

import {
  getPrayerCheckInPeople,
  getPrayTodayList,
  getTodayISOString,
  hasActiveEmergencyPrayer,
  hasActivePraise,
  hasPersonCompletedPrayerToday,
  type Person,
} from "./prayercircle-data";
import { getLeadNeed } from "./prayer-lead";
import { getPraiseDisplay } from "./praise-display";
import { queueFirstName } from "./people-queue";
import {
  getActiveFast,
  getFastProgress,
  type PersonalFast,
} from "./prayercircle-fasting";

// ── Day math (device-local, string-true) ────────────────────────────────────

const ISO_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDay(value: unknown): value is string {
  return typeof value === "string" && ISO_DAY_RE.test(value);
}

function parseIsoDay(iso: string): { y: number; m: number; d: number } | null {
  if (!isIsoDay(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

/** Whole days from `from` to `to` (both YYYY-MM-DD, device-local). */
export function daysBetweenIso(from: string, to: string): number | null {
  const a = parseIsoDay(from);
  const b = parseIsoDay(to);
  if (!a || !b) return null;
  const aMs = new Date(a.y, a.m - 1, a.d).getTime();
  const bMs = new Date(b.y, b.m - 1, b.d).getTime();
  return Math.round((bMs - aMs) / (1000 * 60 * 60 * 24));
}

/** The ISO day `n` days after `iso` (negative goes back). */
export function addDaysIso(iso: string, n: number): string {
  const p = parseIsoDay(iso);
  if (!p) return iso;
  const dt = new Date(p.y, p.m - 1, p.d + n);
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

// ── The per-person prayer record ────────────────────────────────────────────

/**
 * Every day the record actually proves this person was prayed for:
 * the forward log plus the standing last-completion date (the two can
 * overlap; the union is the truth either way). Sorted ascending.
 */
export function effectivePrayedDates(person: Person): string[] {
  const set = new Set<string>();
  for (const d of person.prayedDates ?? []) {
    if (isIsoDay(d)) set.add(d);
  }
  if (isIsoDay(person.lastPrayerCompletedDate)) {
    set.add(person.lastPrayerCompletedDate);
  }
  return [...set].sort();
}

/** How many of the last `days` days (including today) carry a proven prayer. */
export function prayedCountInWindow(person: Person, today: string, days: number): number {
  const dates = effectivePrayedDates(person);
  if (dates.length === 0) return 0;
  const start = addDaysIso(today, -(days - 1));
  return dates.filter((d) => d >= start && d <= today).length;
}

export type FlourishTier = "flourishing" | "warming" | "held";

/**
 * The three dress tiers, from recency bands over the proven record:
 * prayed today → flourishing (full warm); last prayed within the
 * week → warming (the colour coming in); older, or no record at all
 * → held (grey — an invitation, never a verdict).
 */
export function flourishTierFor(person: Person, today: string): FlourishTier {
  const dates = effectivePrayedDates(person);
  if (dates.length === 0) return "held";
  const since = daysBetweenIso(dates[dates.length - 1], today);
  if (since === null) return "held";
  if (since <= 0) return "flourishing";
  if (since <= 7) return "warming";
  return "held";
}

/**
 * The drawing's star: prayed for on 4+ of the last 7 days. This one
 * is earned by the LOG — until a person's record proves a faithful
 * week, no star is claimed for them.
 */
export function hasFaithfulWeek(person: Person, today: string): boolean {
  return prayedCountInWindow(person, today, 7) >= 4;
}

export type WeekStrip = {
  /** Oldest → today. */
  days: { date: string; prayed: boolean }[];
  count: number;
};

/** One person's last 7 days, dotted — only what the record proves. */
export function weekStripFor(person: Person, today: string): WeekStrip {
  const proven = new Set(effectivePrayedDates(person));
  const days: WeekStrip["days"] = [];
  for (let back = 6; back >= 0; back--) {
    const date = addDaysIso(today, -back);
    days.push({ date, prayed: proven.has(date) });
  }
  return { days, count: days.filter((d) => d.prayed).length };
}

// ── Someone slipping ────────────────────────────────────────────────────────

export type SlippingPerson = {
  person: Person;
  /** Days on the tag: since they were last prayed for when the prayer
   *  record is what slipped; since they were last reached when only
   *  the reach record slipped. */
  days: number;
  /** Due on the app's own 14-day reach cadence (opt-out honored by
   *  getPrayerCheckInPeople; never-reached people are never due). */
  byReach: boolean;
  /** 14+ days since their last proven prayer completion. */
  byPrayer: boolean;
};

/** The café cadence is the app's own: 14 days, both records. */
export const SLIPPING_CADENCE_DAYS = 14;

/**
 * Who is slipping: due-to-reach on the existing 14-day cadence OR
 * 14+ days since last prayed — and not prayed today (a person served
 * today is not standing at the door). Longest-waiting first.
 */
export function slippingPeople(people: Person[], today: string): SlippingPerson[] {
  const reachedDue = new Map<string, number>();
  for (const person of getPrayerCheckInPeople(people, today, SLIPPING_CADENCE_DAYS)) {
    const days = person.lastPrayedDate ? daysBetweenIso(person.lastPrayedDate, today) : null;
    reachedDue.set(person.id, days ?? SLIPPING_CADENCE_DAYS);
  }
  const out: SlippingPerson[] = [];
  for (const person of people) {
    if (hasPersonCompletedPrayerToday(person, today)) continue;
    const byReach = reachedDue.has(person.id);
    const prayedDays = isIsoDay(person.lastPrayerCompletedDate)
      ? daysBetweenIso(person.lastPrayerCompletedDate, today)
      : null;
    const byPrayer = prayedDays !== null && prayedDays >= SLIPPING_CADENCE_DAYS;
    if (!byReach && !byPrayer) continue;
    out.push({
      person,
      days: byPrayer ? (prayedDays as number) : (reachedDue.get(person.id) as number),
      byReach,
      byPrayer,
    });
  }
  return out.sort(
    (a, b) => b.days - a.days || a.person.name.localeCompare(b.person.name),
  );
}

// ── The order board ─────────────────────────────────────────────────────────

export type CafeTicketKind = "emergency" | "praise" | "waiting" | "served";

export type CafeTicket = {
  personId: string;
  name: string;
  firstName: string;
  /** The lead need's own words — the session's pick, never invented. */
  need?: string;
  kind: CafeTicketKind;
  /** Set when this person is slipping (dashed ticket, days tag). */
  slippingDays?: number;
  /** A slipping person who is not on today's list: their ticket pins
   *  ahead for tomorrow, the sheet's "tomorrow — first". */
  tomorrow?: boolean;
  accentColor: string;
};

export type CafeBoard = {
  /** Emergency first, then slipping, then praise, then the waiting,
   *  and the served settled last with their checks. */
  tickets: CafeTicket[];
  /** Of TODAY'S list only (tomorrow pins are not today's orders). */
  ordersServed: number;
  ordersWaiting: number;
  ordersTotal: number;
};

function ticketNeed(person: Person, kind: CafeTicketKind, now: Date): string | undefined {
  if (kind === "praise") return getPraiseDisplay(person).headline;
  const lead = getLeadNeed(person, now);
  return lead?.item.title;
}

/**
 * The board, from the same list the People page prays from. Tickets
 * are presentation only — building the board never reorders or
 * alters the prayer list itself, and never moves a coin.
 */
export function buildCafeBoard(people: Person[], today: string, now = new Date()): CafeBoard {
  const parts = parseIsoDay(today);
  const dayOfWeek = parts ? new Date(parts.y, parts.m - 1, parts.d).getDay() : now.getDay();
  const dayOfMonth = parts ? parts.d : now.getDate();
  const list = getPrayTodayList(people, dayOfWeek, dayOfMonth);
  const onList = new Set(list.map((p) => p.id));
  const slipping = slippingPeople(people, today);
  const slipById = new Map(slipping.map((s) => [s.person.id, s]));

  const emergency: CafeTicket[] = [];
  const slippingBand: CafeTicket[] = [];
  const praise: CafeTicket[] = [];
  const waiting: CafeTicket[] = [];
  const served: CafeTicket[] = [];

  for (const person of list) {
    const done = hasPersonCompletedPrayerToday(person, today);
    const kind: CafeTicketKind = done
      ? "served"
      : hasActiveEmergencyPrayer(person, now)
        ? "emergency"
        : hasActivePraise(person, now)
          ? "praise"
          : "waiting";
    const slip = done ? undefined : slipById.get(person.id);
    const ticket: CafeTicket = {
      personId: person.id,
      name: person.name,
      firstName: queueFirstName(person.name),
      need: ticketNeed(person, kind, now),
      kind,
      slippingDays: slip?.days,
      accentColor: person.accentColor,
    };
    if (kind === "served") served.push(ticket);
    else if (kind === "emergency") emergency.push(ticket);
    else if (slip) slippingBand.push(ticket);
    else if (kind === "praise") praise.push(ticket);
    else waiting.push(ticket);
  }

  // Slipping people who are NOT on today's list still pin — ahead of
  // the ordinary tickets, dashed, tagged — as tomorrow's first orders.
  for (const s of slipping) {
    if (onList.has(s.person.id)) continue;
    slippingBand.push({
      personId: s.person.id,
      name: s.person.name,
      firstName: queueFirstName(s.person.name),
      need: ticketNeed(s.person, "waiting", now),
      kind: "waiting",
      slippingDays: s.days,
      tomorrow: true,
      accentColor: s.person.accentColor,
    });
  }
  // The slipping band reads longest-waiting first.
  slippingBand.sort(
    (a, b) => (b.slippingDays ?? 0) - (a.slippingDays ?? 0) || a.name.localeCompare(b.name),
  );

  const ordersServed = served.length;
  const ordersTotal = list.length;
  return {
    tickets: [...emergency, ...slippingBand, ...praise, ...waiting, ...served],
    ordersServed,
    ordersWaiting: ordersTotal - ordersServed,
    ordersTotal,
  };
}

// ── The fast feeds the café ─────────────────────────────────────────────────

export type CafeOvenState = "lit" | "cold" | "none";

/**
 * The ovens, from the fasting engine's real day states: lit while
 * today is kept, still pending, or rested (skipped — a chosen rest is
 * not a cold kitchen); cold on a day marked missed; none when there
 * is no fast at all.
 */
export function ovenStateFor(fast: PersonalFast | null, today: string): CafeOvenState {
  if (!fast) return "none";
  return fast.dayStatuses?.[today] === "missed" ? "cold" : "lit";
}

/**
 * v343 — SERVE: the route a board ticket's Serve button opens. It
 * lands on People carrying the person, and index.tsx's
 * servePersonId effect starts the prayer session on them (the same
 * plumbing the native notification uses) — serving IS praying for
 * that person in the app's own session, so the served glow, the
 * café's bookkeeping and the prayer session can never disagree.
 * Null when there is nothing to serve: an already-served ticket,
 * and tomorrow's pins (tomorrow's business, shown early so the day
 * can be planned — they join the board for real at midnight).
 */
export function serveRouteForTicket(
  ticket: CafeTicket,
): { pathname: "/(tabs)"; params: { servePersonId: string } } | null {
  if (ticket.kind === "served" || ticket.tomorrow) return null;
  return { pathname: "/(tabs)", params: { servePersonId: ticket.personId } };
}

/** Kept weeks inside the current fast — 7 kept days open one lot. */
export function fastWeeksCompleted(fast: PersonalFast | null): number {
  if (!fast) return 0;
  return Math.floor(getFastProgress(fast).completed / 7);
}

// ── The week-lot milestone state (fires once, then stays) ───────────────────

export const CAFE_STREET_STORAGE_KEY = "prayercircle.hometown.cafe.v1";

export type CafeStreetState = {
  /** Fast weeks whose lot has opened — the highest settled count. */
  weekLots: number;
};

export function parseCafeStreetState(value: unknown): CafeStreetState {
  const n = (value as { weekLots?: unknown } | null)?.weekLots;
  return { weekLots: typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0 };
}

/**
 * Settle the milestone against the fast's real record: the stored
 * count only ever rises to what the record proves, and `newLots`
 * says how many opened in this settle (so the caller persists only
 * when something actually fired).
 */
export function settleCafeStreetWeeks(
  state: CafeStreetState,
  fast: PersonalFast | null,
): { state: CafeStreetState; newLots: number } {
  const derived = fastWeeksCompleted(fast);
  if (derived <= state.weekLots) return { state, newLots: 0 };
  return { state: { weekLots: derived }, newLots: derived - state.weekLots };
}

/**
 * The roped lot's ground: a 2x2 grass patch at the east end of the
 * Pilgrim's Way row, west of the Living Stream — no lot, path,
 * landmark, or stream tile has ever claimed it.
 */
export const CAFE_WEEK_LOT = { x: 7, y: 25, w: 2, h: 2 } as const;

/** The diner's home lot — where the board stands until a diner is built. */
export const CAFE_HOME_LOT_ID = "town-lot-n1";

// ── Storage loading (the hometown screen's pattern: read on open) ───────────

export type CafeStreetData = {
  people: Person[];
  fast: PersonalFast | null;
  weekLots: number;
  today: string;
};

/**
 * Read the café's inputs from the app's own stores — the full people
 * record (prayercircle.people.v1) and the fasts (prayercircle.fasts.v1)
 * — and settle the week-lot milestone, persisting it only when a new
 * lot actually opened. Mirrors lib/hometown's prayedTodayPeople: a
 * defensive parse, and any failure reads as an empty café, never a
 * crash.
 */
export async function loadCafeStreetData(): Promise<CafeStreetData> {
  const today = getTodayISOString();
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const [peopleRaw, fastsRaw, cafeRaw] = await Promise.all([
      AsyncStorage.getItem("prayercircle.people.v1"),
      AsyncStorage.getItem("prayercircle.fasts.v1"),
      AsyncStorage.getItem(CAFE_STREET_STORAGE_KEY),
    ]);
    const peopleParsed: unknown = peopleRaw ? JSON.parse(peopleRaw) : [];
    const fastsParsed: unknown = fastsRaw ? JSON.parse(fastsRaw) : [];
    const people = Array.isArray(peopleParsed) ? (peopleParsed as Person[]) : [];
    const fasts = Array.isArray(fastsParsed) ? (fastsParsed as PersonalFast[]) : [];
    const fast = getActiveFast(fasts, today);
    const stored = parseCafeStreetState(cafeRaw ? JSON.parse(cafeRaw) : null);
    const settled = settleCafeStreetWeeks(stored, fast);
    if (settled.newLots > 0) {
      await AsyncStorage.setItem(CAFE_STREET_STORAGE_KEY, JSON.stringify(settled.state)).catch(
        () => undefined,
      );
    }
    return { people, fast, weekLots: settled.state.weekLots, today };
  } catch {
    return { people: [], fast: null, weekLots: 0, today };
  }
}
