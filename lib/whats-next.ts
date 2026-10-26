// ─── v261 — "What's Next" for the completed Pray Today card ─────────
// Pure derivation, settle-from-storage at call time (the bell-header
// discipline): the shell reads the three schedule stores, hands the
// rows here, and gets back the ONE next timed thing on today's
// schedule — earliest start strictly after now. Events, todos, and
// ministries are all eligible; time-off events are claimed rest, but
// rest is still what's next, so isOffEvent rows ride along too.
// Completed rows and untimed (all-day) rows never qualify: what's
// next needs a clock time to be next AT.

import {
  detectEventKeyword,
  EVENT_KEYWORD_MAP,
  type EventKeyword,
  type ScheduleEvent,
  type ScheduleMinistry,
  type ScheduleTodo,
} from "./schedule-data";
import { localIsoDate } from "./bell-header";
import { format12HourTime } from "./utils";

export type WhatsNextKind = "event" | "todo" | "ministry";

export type WhatsNextItem = {
  id: string;
  kind: WhatsNextKind;
  title: string;
  /** "HH:mm" exactly as stored. */
  startTime: string;
  /** Minutes since local midnight. */
  startMinutes: number;
  /** "2:00 PM" — the schedule's own 12-hour label. */
  timeLabel: string;
  /** The keyword illustration entry when the title/notes resolve one. */
  keyword: EventKeyword | null;
  /** A todo's own stored icon, when it carries one. */
  icon?: string;
};

function minutesOf(time?: string): number | null {
  if (!time || !/^\d{1,2}:\d{2}/.test(time)) return null;
  const [h, m] = time.split(":");
  const hour = Number(h);
  const minute = Number(m);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

function keywordFor(label: string | undefined, title: string, location?: string, notes?: string): EventKeyword | null {
  if (label) {
    const byLabel = EVENT_KEYWORD_MAP.find((entry) => entry.label === label);
    if (byLabel) return byLabel;
  }
  return detectEventKeyword(title, location, notes);
}

/**
 * The next timed item on today's schedule, or null when the rest of
 * the day is clear. Ties settle in store order: events, then todos,
 * then ministries (stable sort keeps the earliest-read row first).
 */
export function getWhatsNext(
  events: ScheduleEvent[],
  todos: ScheduleTodo[],
  ministries: ScheduleMinistry[],
  now: Date,
): WhatsNextItem | null {
  const todayIso = localIsoDate(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const candidates: WhatsNextItem[] = [];

  const consider = (
    kind: WhatsNextKind,
    id: string,
    title: string,
    startTime: string | undefined,
    keyword: EventKeyword | null,
    icon?: string,
  ) => {
    const startMinutes = minutesOf(startTime);
    if (startMinutes === null || startMinutes <= nowMinutes || !startTime) return;
    candidates.push({
      id,
      kind,
      title,
      startTime,
      startMinutes,
      timeLabel: format12HourTime(startTime),
      keyword,
      icon,
    });
  };

  for (const event of events) {
    if (event.date !== todayIso || event.isCompleted) continue;
    consider("event", event.id, event.title, event.startTime, keywordFor(event.keyword, event.title, event.location, event.notes));
  }
  for (const todo of todos) {
    if (todo.date !== todayIso || todo.isCompleted) continue;
    consider("todo", todo.id, todo.title, todo.startTime, keywordFor(undefined, todo.title, undefined, todo.notes), todo.icon);
  }
  for (const ministry of ministries) {
    if (ministry.date !== todayIso || ministry.isCompleted) continue;
    consider("ministry", ministry.id, ministry.title, ministry.startTime, keywordFor(undefined, ministry.title, ministry.location, ministry.notes));
  }

  candidates.sort((a, b) => a.startMinutes - b.startMinutes);
  return candidates[0] ?? null;
}
