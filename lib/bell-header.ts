/**
 * v226 — "Faces by the Bell": the pure logic behind the persistent
 * prayer-and-day header that rides the main tab screens.
 *
 * Everything here settles from stored dates at call time — the caller
 * re-runs it on mount, on focus, and when the app returns to the
 * foreground. There are no timers in this system: a face is due because
 * the stored lastPrayerCompletedDate is not today, an emergency ring
 * lasts because its stored expiry is still in the future, and the Now
 * line is whatever today's schedule says about the current minute.
 *
 * Dates are device-local throughout (a "day" is the day on the phone).
 */
import {
  getDaysSinceLastPrayed,
  getPrayerCheckInPeople,
  hasActiveEmergencyPrayer,
  hasActivePraise,
  hasPersonCompletedPrayerToday,
  shouldPrayForTodayByReminder,
  type Person,
} from "./prayercircle-data";
import type { ScheduleEvent, ScheduleTodo } from "./schedule-data";

/** The app's existing emergency accent (person page emergency cards). */
export const EMERGENCY_RING_COLOR = "#EF4444";
/**
 * The app's existing gold/amber attention accent (LAST_REACHED_WARNING_COLOR
 * in prayercircle-data) — reused as the praise ring so the header speaks
 * the app's own color language.
 */
export const PRAISE_RING_COLOR = "#F59E0B";

/** 14-day reach-out cadence, matching the app's prayer check-ins. */
export const REACH_OUT_CADENCE_DAYS = 14;

export type FaceRing = "emergency" | "praise" | "none";

export type DueFace = {
  person: Person;
  ring: FaceRing;
  /** Earliest active emergency expiry (ISO), when ring is emergency. */
  emergencyExpiresAt?: string;
  /** Earliest active praise expiry (ISO), when ring is praise. */
  praiseExpiresAt?: string;
};

export type NowLine = {
  mode: "now" | "next";
  title: string;
  /** Compact "9:30a" label for when a current item ends (Now only). */
  untilLabel?: string;
  /** Compact "2:00p" label for when a next item starts (Next only). */
  timeLabel?: string;
};

export type BellSummary = {
  faces: DueFace[];
  /** One plain line per due face. */
  prayerLines: string[];
  /** Today's uncompleted events/todos that are current or still upcoming. */
  scheduleLines: string[];
  /** Overdue reach-outs with their people (panel rows tap through). */
  reachEntries: ReachOutEntry[];
  /** Overdue reach-out lines ("… hasn't been reached in N days"). */
  reachLines: string[];
  nowLine: NowLine | null;
  /** faces + schedule lines + reach lines. */
  badgeCount: number;
};

/** Device-local YYYY-MM-DD for a Date. */
export function localIsoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "09:00" → "9:00a", "13:30" → "1:30p" — the header's compact clock. */
export function formatCompactTime(time?: string): string {
  if (!time || !/^\d{1,2}:\d{2}/.test(time)) return "";
  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return "";
  const suffix = hour >= 12 ? "p" : "a";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, "0")}${suffix}`;
}

/** "about 9 hours left" / "about 1 hour left" / "under an hour left". */
export function formatHoursLeft(expiresAtIso: string, now: Date): string {
  const ms = new Date(expiresAtIso).getTime() - now.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return "ending now";
  const minutes = ms / 60000;
  if (minutes < 55) return "under an hour left";
  const hours = Math.round(ms / 3600000);
  return hours <= 1 ? "about 1 hour left" : `about ${hours} hours left`;
}

function earliestActiveEmergencyExpiry(person: Person, now: Date): string | undefined {
  let best: string | undefined;
  let bestMs = Infinity;
  for (const item of person.prayerItems) {
    if (!item.isEmergency || !item.emergencyExpiresAt) continue;
    const ms = new Date(item.emergencyExpiresAt).getTime();
    if (Number.isFinite(ms) && ms > now.getTime() && ms < bestMs) {
      bestMs = ms;
      best = item.emergencyExpiresAt;
    }
  }
  return best;
}

function earliestActivePraiseExpiry(person: Person, now: Date): string | undefined {
  let best: string | undefined;
  let bestMs = Infinity;
  const consider = (iso?: string) => {
    if (!iso) return;
    const ms = new Date(iso).getTime();
    if (Number.isFinite(ms) && ms > now.getTime() && ms < bestMs) {
      bestMs = ms;
      best = iso;
    }
  };
  // Person-level praise state (the app's primary praise) …
  if (hasActivePraise(person, now)) consider(person.praiseExpiresAt);
  // … and item-level praised prayers.
  for (const item of person.prayerItems) {
    if (item.isPraised) consider(item.praiseExpiresAt);
  }
  return best;
}

/**
 * Everyone who should be prayed for and hasn't been today:
 * cadence-due (plain), emergency (red ring), praise (gold ring).
 * Emergency/praise pin regardless of cadence; having been prayed today
 * settles a face out of the strip whatever brought it there.
 */
export function getDueFaces(people: Person[], now: Date): DueFace[] {
  const todayIso = localIsoDate(now);
  const faces: DueFace[] = [];
  for (const person of people) {
    if (hasPersonCompletedPrayerToday(person, todayIso)) continue;
    const emergencyExpiresAt = hasActiveEmergencyPrayer(person, now)
      ? earliestActiveEmergencyExpiry(person, now)
      : undefined;
    const praiseExpiresAt = earliestActivePraiseExpiry(person, now);
    const cadenceDue = shouldPrayForTodayByReminder(person, now.getDay(), now.getDate());
    if (!cadenceDue && !emergencyExpiresAt && !praiseExpiresAt) continue;
    faces.push({
      person,
      ring: emergencyExpiresAt ? "emergency" : praiseExpiresAt ? "praise" : "none",
      emergencyExpiresAt,
      praiseExpiresAt,
    });
  }
  const rank: Record<FaceRing, number> = { emergency: 0, praise: 1, none: 2 };
  return faces.sort(
    (a, b) => rank[a.ring] - rank[b.ring] || a.person.name.localeCompare(b.person.name),
  );
}

/** The bell panel's prayer line for one due face. */
export function getFacePrayerLine(face: DueFace, now: Date): string {
  const name = face.person.name;
  if (face.ring === "emergency" && face.emergencyExpiresAt) {
    return `${name} — emergency prayer · ${formatHoursLeft(face.emergencyExpiresAt, now)}`;
  }
  if (face.ring === "praise" && face.praiseExpiresAt) {
    return `${name} — praise · ${formatHoursLeft(face.praiseExpiresAt, now)}`;
  }
  return `${name} — prayer due today`;
}

export type ReachOutEntry = { person: Person; days: number; line: string };

/** Overdue reach-outs with their people attached (panel rows tap through). */
export function getReachOutEntries(people: Person[], now: Date): ReachOutEntry[] {
  const todayIso = localIsoDate(now);
  return getPrayerCheckInPeople(people, todayIso, REACH_OUT_CADENCE_DAYS).map((person) => {
    const days = getDaysSinceLastPrayed(person.lastPrayedDate);
    return { person, days, line: `${person.name} hasn't been reached in ${days} days` };
  });
}

/** Overdue reach-out lines, on the app's own 14-day check-in rule. */
export function getReachOutLines(people: Person[], now: Date): string[] {
  return getReachOutEntries(people, now).map((e) => e.line);
}

type DayItem = {
  id: string;
  title: string;
  kind: "event" | "todo";
  /** Minutes since local midnight; null = untimed (all-day). */
  startMinutes: number | null;
  /** Minutes since local midnight; null = runs to the end of the day. */
  endMinutes: number | null;
};

function minutesOf(time?: string): number | null {
  if (!time || !/^\d{1,2}:\d{2}/.test(time)) return null;
  const [h, m] = time.split(":");
  const hour = Number(h);
  const minute = Number(m);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

/** Today's uncompleted events + todos, normalized for the bell math. */
export function getTodayDayItems(events: ScheduleEvent[], todos: ScheduleTodo[], todayIso: string): DayItem[] {
  const items: DayItem[] = [];
  for (const e of events) {
    if (e.date !== todayIso || e.isCompleted) continue;
    const startMinutes = minutesOf(e.startTime);
    items.push({
      id: e.id,
      title: e.title,
      kind: "event",
      startMinutes,
      endMinutes: minutesOf(e.endTime),
    });
  }
  for (const t of todos) {
    if (t.date !== todayIso || t.isCompleted) continue;
    const startMinutes = minutesOf(t.startTime);
    const explicitEnd = minutesOf(t.endTime);
    items.push({
      id: t.id,
      title: t.title,
      kind: "todo",
      startMinutes,
      // Todos are 30-minute blocks by house rule when no end is stored.
      endMinutes: explicitEnd ?? (startMinutes !== null ? startMinutes + 30 : null),
    });
  }
  return items;
}

const END_OF_DAY = 24 * 60;

function classify(item: DayItem, nowMinutes: number): "current" | "upcoming" | "ended" {
  if (item.startMinutes === null) return "current"; // untimed = all-day
  const end = item.endMinutes ?? END_OF_DAY;
  if (nowMinutes < item.startMinutes) return "upcoming";
  if (nowMinutes < end) return "current";
  return "ended";
}

function hhmmOf(minutes: number): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(minutes / 60))}:${p(minutes % 60)}`;
}

/** The Now / Next line for the header, or null when nothing is on today. */
export function getNowLine(items: DayItem[], now: Date): NowLine | null {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const current = items
    .filter((i) => classify(i, nowMinutes) === "current")
    .sort((a, b) => (a.endMinutes ?? END_OF_DAY) - (b.endMinutes ?? END_OF_DAY));
  const timedCurrent = current.find((i) => i.startMinutes !== null);
  const active = timedCurrent ?? current[0];
  if (active) {
    const until =
      active.endMinutes !== null && active.endMinutes < END_OF_DAY
        ? formatCompactTime(hhmmOf(active.endMinutes))
        : "";
    return { mode: "now", title: active.title, untilLabel: until || undefined };
  }
  const upcoming = items
    .filter((i) => classify(i, nowMinutes) === "upcoming")
    .sort((a, b) => (a.startMinutes ?? 0) - (b.startMinutes ?? 0));
  const next = upcoming[0];
  if (next && next.startMinutes !== null) {
    return {
      mode: "next",
      title: next.title,
      timeLabel: formatCompactTime(hhmmOf(next.startMinutes)),
    };
  }
  return null;
}

/** Panel lines for today's items that are current or still upcoming. */
export function getScheduleLines(items: DayItem[], now: Date): string[] {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return items
    .filter((i) => classify(i, nowMinutes) !== "ended")
    .sort((a, b) => (a.startMinutes ?? -1) - (b.startMinutes ?? -1))
    .map((i) =>
      i.startMinutes !== null
        ? `${formatCompactTime(hhmmOf(i.startMinutes))} — ${i.title}`
        : `All day — ${i.title}`,
    );
}

/** Compose everything the header needs in one settle-from-storage pass. */
export function getBellSummary(
  people: Person[],
  events: ScheduleEvent[],
  todos: ScheduleTodo[],
  now: Date,
): BellSummary {
  const todayIso = localIsoDate(now);
  const faces = getDueFaces(people, now);
  const items = getTodayDayItems(events, todos, todayIso);
  const scheduleLines = getScheduleLines(items, now);
  const reachEntries = getReachOutEntries(people, now);
  return {
    faces,
    prayerLines: faces.map((f) => getFacePrayerLine(f, now)),
    scheduleLines,
    reachEntries,
    reachLines: reachEntries.map((e) => e.line),
    nowLine: getNowLine(items, now),
    badgeCount: faces.length + scheduleLines.length + reachEntries.length,
  };
}
