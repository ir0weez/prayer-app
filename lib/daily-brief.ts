/**
 * v414 — the Daily Brief (Jonathan, Nov 2: "love it all, do it" on
 * daily-breakdown-concepts-v6.html). The pure model behind the
 * keyword door and its page:
 *
 *  - The door rides HIS stored events, exactly like News and
 *    Email: an event carrying the "Daily Brief" keyword (or a
 *    title leading with it) is claimed by the door routing
 *    (lib/keyword-pages.ts) and opens the Brief page for that
 *    event's day. v416 removed the v414 build's code-generated
 *    daily event — Jonathan, Nov 2, on v414 installed: "I don't
 *    want the Daily Brief on there all the time. Just when I add
 *    it as an event." Nothing generates the Brief into a day any
 *    more; it appears only where he put it.
 *  - The prep line under each event derives ONLY from the event's
 *    own stored fields, in the brief's priority: its note, its
 *    leave time, its location, a tied person's lead need, an
 *    attached todo. Nothing is invented; an event with none of
 *    those says so in one factual line.
 *  - The hero's planned share is the complement of the day's white
 *    space, computed by the whites engine itself (lib/whites.ts) —
 *    the same math that draws his open-time blocks, so the number
 *    on the hero can never disagree with the schedule under it.
 *  - GOOD TO KNOW rows come only from the morning pack sections
 *    already in the phone (gas / email digest / news briefing
 *    snapshots). An absent section is an absent row; nothing here
 *    fabricates a price, a sender, or a headline.
 */
import { format12HourTime } from "./utils";
import { getLeadNeed } from "./prayer-lead";
import type { Person } from "./prayercircle-data";
import type { ScheduleEvent, ScheduleTodo } from "./schedule-data";
import { calculateWhites, WHITES_WINDOW_END, WHITES_WINDOW_START, type WhiteSourceItem } from "./whites";
import { timeToMinutes } from "./time-blocks";
import type { GasPriceSnapshot } from "./gas-prices";
import { formatGasPrice } from "./gas-prices";
import type { EmailDigest } from "./email-digest";
import type { NewsBriefingSnapshot } from "./news-briefing";

/* ─── The prep line ─────────────────────────────────────────────── */

export type PrepLine = {
  /** The bold lead phrase. May be "" when the line carries no lead. */
  lead: string;
  /** The quiet remainder, rendered after an em dash when present. */
  rest: string;
};

/** Split a stored note into a bold lead + remainder: the lead is
 *  what stands before the first " — ", ": ", or sentence end when
 *  that break lands early; a short note is all lead; a long note
 *  with no early break stays plain (no lead). */
export function splitPrepLead(text: string): PrepLine {
  const trimmed = text.trim();
  if (!trimmed) return { lead: "", rest: "" };
  for (const sep of [" — ", " – ", ": "]) {
    const idx = trimmed.indexOf(sep);
    if (idx > 0 && idx <= 60) {
      return { lead: trimmed.slice(0, idx).trim(), rest: trimmed.slice(idx + sep.length).trim() };
    }
  }
  const sentence = trimmed.indexOf(". ");
  if (sentence > 0 && sentence <= 80) {
    return { lead: trimmed.slice(0, sentence + 1).trim(), rest: trimmed.slice(sentence + 2).trim() };
  }
  if (trimmed.length <= 60) return { lead: trimmed, rest: "" };
  return { lead: "", rest: trimmed };
}

function minutesToHHmm(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * The one prep line under an event on the Brief — derived ONLY from
 * real fields, in the brief's priority order:
 *  1. the event's note (its own words lead);
 *  2. its leave time (travelTimeMinutes before its start);
 *  3. its location;
 *  4. a tied person's lead need (lib/prayer-lead's pick, the
 *     person's own need in their own words);
 *  5. an attached todo (a todo linked to this event, not done).
 * An event with none of these gets the factual nothing line.
 */
export function prepLineForEvent(
  event: ScheduleEvent,
  ctx: { people: Person[]; todos: ScheduleTodo[] },
): PrepLine {
  const note = event.notes?.trim();
  if (note) return splitPrepLead(note);

  if (event.travelTimeMinutes && event.travelTimeMinutes > 0 && event.startTime) {
    const leave = minutesToHHmm(timeToMinutes(event.startTime) - event.travelTimeMinutes);
    return {
      lead: `Leave at ${format12HourTime(leave)}`,
      rest: `${event.travelTimeMinutes} minutes to get there.`,
    };
  }

  const location = event.location?.trim();
  if (location) return { lead: `Head to ${location}`, rest: "" };

  for (const personId of event.linkedPeopleIds ?? []) {
    const person = ctx.people.find((p) => p.id === personId);
    if (!person) continue;
    const leadNeed = getLeadNeed(person);
    if (leadNeed) {
      const firstName = person.name.trim().split(/\s+/)[0] || person.name;
      return { lead: `Lead with ${firstName}`, rest: leadNeed.item.title };
    }
  }

  const attached = ctx.todos.find((t) => t.linkedEventId === event.id && !t.isCompleted);
  if (attached) return { lead: attached.title, rest: "attached to this event as a todo." };

  return { lead: "Nothing to bring", rest: "no note, location, or leave time on this one." };
}

/* ─── The hero ──────────────────────────────────────────────────── */

/**
 * The share of the day that is planned: the whites window
 * (05:00–24:00) minus the day's free blocks, over the window —
 * computed by the whites engine itself over the day's timed items,
 * so the hero's number is the schedule's own arithmetic. Returns a
 * 0..1 share (0 when there is nothing to measure).
 */
export function plannedShareForDay(items: WhiteSourceItem[]): number {
  const windowMinutes = timeToMinutes(WHITES_WINDOW_END) - timeToMinutes(WHITES_WINDOW_START);
  if (windowMinutes <= 0) return 0;
  const blocks = calculateWhites(items, { isToday: false });
  const freeMinutes = blocks.reduce((sum, b) => sum + b.durationMinutes, 0);
  const planned = windowMinutes - freeMinutes;
  return Math.max(0, Math.min(1, planned / windowMinutes));
}

/** The hero's one line, from the day's own anchors: the first timed
 *  event leads it, the last timed event closes it. A day with no
 *  timed events says so plainly; counts fill a day whose events
 *  carry no times. */
export function briefDayLine(input: {
  timedEvents: Array<{ title: string; startTime: string }>;
  eventCount: number;
  todoCount: number;
}): string {
  const { timedEvents, eventCount, todoCount } = input;
  if (timedEvents.length > 0) {
    const first = timedEvents[0];
    const last = timedEvents[timedEvents.length - 1];
    const lead = `First up — ${first.title} at ${format12HourTime(first.startTime)}.`;
    if (last !== first) {
      return `${lead} The day winds down with ${last.title} at ${format12HourTime(last.startTime)}.`;
    }
    return lead;
  }
  if (eventCount > 0 || todoCount > 0) {
    const parts: string[] = [];
    if (eventCount > 0) parts.push(`${eventCount} ${eventCount === 1 ? "event" : "events"}`);
    if (todoCount > 0) parts.push(`${todoCount} ${todoCount === 1 ? "todo" : "todos"} due`);
    return `${parts.join(" and ")} on the day — none of them carry a time.`;
  }
  return "The day is open — nothing is scheduled.";
}

/* ─── Good to know ──────────────────────────────────────────────── */

export type GoodToKnowRow = {
  kind: "gas" | "email" | "news";
  headline: string;
  sub: string;
  /** The source stamp chip: "PACK 8:05 AM" / "DIGEST 6:31 AM". */
  stamp: string;
};

const NUMBER_WORDS = [
  "Zero", "One", "Two", "Three", "Four", "Five",
  "Six", "Seven", "Eight", "Nine", "Ten",
];

function stampFor(label: string, preparedAt: string): string {
  const date = new Date(preparedAt);
  if (Number.isNaN(date.getTime())) return label;
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${label} ${time}`;
}

/**
 * The GOOD TO KNOW rows — one per morning-pack section actually in
 * the phone, in the drawing's order (gas, email, news). Every word
 * comes from the section's own stored snapshot; a section that is
 * absent, or holds nothing factual to say, yields no row.
 */
export function goodToKnowRows(input: {
  gas: GasPriceSnapshot | null;
  digest: EmailDigest | null;
  news: NewsBriefingSnapshot | null;
}): GoodToKnowRow[] {
  const rows: GoodToKnowRow[] = [];

  if (input.gas) {
    const priced = input.gas.stations
      .filter((s) => s.priceRegular !== null)
      .sort((a, b) => (a.priceRegular ?? 0) - (b.priceRegular ?? 0));
    if (priced.length > 0) {
      const cheapest = priced[0];
      const others = priced
        .slice(1, 3)
        .map((s) => `${s.brand ?? s.name} ${formatGasPrice(s.priceRegular)}`)
        .join(" · ");
      rows.push({
        kind: "gas",
        headline: `Gas is cheapest at ${cheapest.name} — ${formatGasPrice(cheapest.priceRegular)}`,
        sub: others || (input.gas.areaLabel ? `Prices for ${input.gas.areaLabel}` : ""),
        stamp: stampFor("PACK", input.gas.preparedAt),
      });
    }
  }

  if (input.digest) {
    const reply = input.digest.groups.reply;
    if (reply.length > 0) {
      rows.push({
        kind: "email",
        headline: `${NUMBER_WORDS[reply.length] ?? reply.length} ${reply.length === 1 ? "reply is" : "replies are"} waiting`,
        sub: reply.slice(0, 2).map((r) => r.subject).filter(Boolean).join(" · "),
        stamp: stampFor("DIGEST", input.digest.preparedAt),
      });
    } else if (input.digest.digest.length > 0) {
      const lead = input.digest.digest[0];
      rows.push({
        kind: "email",
        headline: lead.subject,
        sub: lead.why,
        stamp: stampFor("DIGEST", input.digest.preparedAt),
      });
    }
  }

  if (input.news && input.news.briefing.length > 0) {
    const first = input.news.briefing[0];
    const total = input.news.briefing.length + input.news.more.length;
    rows.push({
      kind: "news",
      headline: first.source ? `${first.source}: ${first.headline}` : first.headline,
      sub: `${total} ${total === 1 ? "story" : "stories"} waiting in the News door`,
      stamp: stampFor("PACK", input.news.preparedAt),
    });
  }

  return rows;
}
