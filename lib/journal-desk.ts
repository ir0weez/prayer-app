import { countFastDayEntryKinds, getFastDayEntries, type FastDayEntryKind } from "./fast-day-entries";
import { addDaysToIso, isoDateOf, parseIsoDate } from "./journal-moments";
import {
  createPrayerJournalEntry,
  sortPrayerJournalEntries,
  type PrayerJournalEntry,
  type PrayerJournalEntryKind,
  type PrayerJournalQuestionRef,
  type PrayerJournalTaggedPerson,
  type PrayerJournalVerseRef,
} from "./prayer-journal";
import type { Person } from "./prayercircle-data";
import { getActiveFast, getFastCalendarDays, type PersonalFast } from "./prayercircle-fasting";

/**
 * v411 — Journal/Fast Rework, Part 2: THE DESK (Jonathan's Nov 1
 * build word: "build the rework in two parts"; the approved
 * drawings are journal-whole-rework-v13.html — "Love it" — plus
 * journal-kind-formats-v24.html for the feed's per-kind formats,
 * journal-blog-concepts-v6 for the composer connection map, and
 * v11/v12 for the week's question and its pin).
 *
 * This module is the Desk's model: pure functions over the journal
 * entries and the fasts. ONE composer record (composeDeskPost) is
 * what every surface posts through — the home writing card, the
 * Write Page, and (for fast kinds) the Day Page's own path in
 * lib/fast-day-entries — so a post lands identically wherever it
 * was written: the feed, the Day Page, the week's counts, and the
 * tagged people's pages (a tagged person is "in" an entry by the
 * standing entriesForPerson rule, so a Prayer post shows on their
 * page the moment it exists).
 */

// ─── The composer's kinds ────────────────────────────────────────────────────

/** The kinds the Desk composer offers, in the Write Page's own
 *  order (v13, Frame 3). Praise is not among them — a praise still
 *  posts from the People page, as it always has. */
export type DeskPostKind = "entry" | "fast" | "prayer" | "answered" | "gratitude" | "verse";

export const DESK_POST_KINDS: DeskPostKind[] = ["entry", "fast", "prayer", "answered", "gratitude", "verse"];

export const DESK_POST_KIND_LABELS: Record<DeskPostKind, string> = {
  entry: "Entry",
  fast: "Fast",
  prayer: "Prayer",
  answered: "Answered",
  gratitude: "Gratitude",
  verse: "Verse",
};

/** The Write Page's header for a kind: "New prayer", "New entry"… */
export function deskPostTitle(kind: DeskPostKind): string {
  return `New ${DESK_POST_KIND_LABELS[kind].toLowerCase()}`;
}

/** v413 (his ruling, Nov 2): the home writing card quick-posts a
 *  plain Entry and nothing else — its footer's kind link opens
 *  the Write Page for every kind (the v6 in-place/door split and
 *  its chooser are retired), and the kind is chosen on the Write
 *  Page's own kind row. */

/**
 * v413: the Write Page people picker's Top 5 — the people his
 * journal posts have carried most, counted from the entries'
 * taggedPeople (the same stored signal the Bible composer's
 * rankedAuthorIds reads from its marks; his Oct 30 picker rule:
 * at rest the picker is a search field and this Top 5, and the
 * full roster is never listed). Most-carried first; ties break
 * by the carried name, then id, so the order is deterministic.
 * Returns person ids.
 */
export function rankedTaggedPeopleIds(entries: PrayerJournalEntry[], limit = 5): string[] {
  const counts = new Map<string, { count: number; name: string }>();
  for (const entry of entries) {
    for (const person of entry.taggedPeople) {
      const prev = counts.get(person.id);
      counts.set(person.id, {
        count: (prev?.count ?? 0) + 1,
        name: person.name || prev?.name || "",
      });
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[1].name.localeCompare(b[1].name) || a[0].localeCompare(b[0]))
    .slice(0, Math.max(0, limit))
    .map(([id]) => id);
}

/** The feed format an entry renders in on the Desk. Fast-day
 *  entries never reach this — the feed groups them into the day's
 *  log (deskFeedItems). Absence of kind is the plain Entry, as it
 *  has been since v281. */
export type DeskEntryFormat = "entry" | "prayer" | "gratitude" | "verse" | "answered" | "praise" | "answer" | "reached";

export function deskEntryFormat(entry: PrayerJournalEntry): DeskEntryFormat {
  switch (entry.kind) {
    case "prayer":
    case "gratitude":
    case "verse":
    case "answered":
    case "praise":
    case "answer":
    case "reached":
      return entry.kind;
    default:
      return "entry";
  }
}

// ─── The one composer ────────────────────────────────────────────────────────

export type DeskPostInput = {
  kind: DeskPostKind;
  body: string;
  title?: string;
  /** People picked in the composer's people tool (Prayer, Answered). */
  taggedPeople?: Person[];
  /** The verse box's contents (Verse). */
  verse?: PrayerJournalVerseRef;
  /** A fast sub-kind (Fast) — files through the fast-day path. */
  fastKind?: FastDayEntryKind;
  /** The active fast, when kind is "fast". */
  fast?: PersonalFast | null;
  /** The pinned week's question — a post made while pinned
   *  carries it and renders as the Answer (v12). */
  question?: PrayerJournalQuestionRef;
  /** The date the post files to — today, from every surface. */
  date: string;
  photos?: string[];
  mood?: { id: string; intensity: 1 | 2 | 3 };
};

/**
 * THE posting path — the quick card, the Write Page, and any
 * future surface all call this one function with the same input
 * shape, so the record that lands is the same record: same kind
 * mapping, same destinations. A Fast post files to its fast day
 * through Part 1's appendFastDayEntry (the Day Page's own writer);
 * every other kind lands as a journal entry of that kind. A post
 * made while the week's question is pinned carries the question
 * and files as kind "answer" — except a Fast post, which belongs
 * to the day and never answers.
 */
export function composeDeskPost(
  entries: PrayerJournalEntry[],
  input: DeskPostInput,
  entryId: string,
  now = new Date(),
): PrayerJournalEntry[] {
  // A verse post's words are the verse itself when he adds none
  // of his own — the entry's body is never empty for a verse.
  const body =
    input.kind === "verse" && !input.body.trim() && input.verse ? input.verse.text : input.body.trim();
  if (input.kind === "fast") {
    if (!input.fast || !body) return entries;
    const id = `journal-fastday-${input.fast.id}-${now.getTime()}`;
    return createPrayerJournalEntry(
      entries,
      { body, date: input.date, fastDay: { fastId: input.fast.id, kind: input.fastKind ?? "note" } },
      id,
      now,
    );
  }
  const answering = Boolean(input.question) && input.kind === "entry";
  const kind: PrayerJournalEntryKind = answering ? "answer" : input.kind;
  return createPrayerJournalEntry(
    entries,
    {
      body,
      ...(input.title?.trim() ? { title: input.title.trim() } : {}),
      kind,
      date: input.date,
      ...(input.taggedPeople && input.taggedPeople.length > 0 ? { taggedPeople: input.taggedPeople } : {}),
      ...(input.kind === "verse" && input.verse ? { verse: input.verse } : {}),
      ...(answering && input.question ? { question: input.question } : {}),
      ...(input.photos && input.photos.length > 0 ? { photos: input.photos } : {}),
      ...(input.mood ? { mood: input.mood } : {}),
    },
    entryId,
    now,
  );
}

// ─── The week ────────────────────────────────────────────────────────────────

/** The Sunday of the Sun–Sat calendar week holding `date` — the
 *  app's one week rule (fast-tracker's calendar weeks). */
export function sundayOfWeek(date: string): string {
  const parsed = parseIsoDate(date);
  return addDaysToIso(date, -parsed.getDay());
}

/** The seven dates of the Sun–Sat week beginning at `weekStart`. */
export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDaysToIso(weekStart, index));
}

/** The week he's been living: the seven days ending today. The
 *  question and Carried read this window — the approved specimen
 *  speaks on a Sunday of the close calls of the days just lived,
 *  which a Sun–Sat window that reset that morning cannot see.
 *  The week's IDENTITY (for the answered check and the pin) is
 *  still the calendar Sunday, sundayOfWeek. */
export function trailingWeekDates(todayIso: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDaysToIso(todayIso, index - 6));
}

const NUMBER_WORDS = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

function numberWord(value: number): string {
  return NUMBER_WORDS[value] ?? String(value);
}

export type WeekQuestion = {
  text: string;
  weekStart: string;
};

/**
 * The week's ONE question — derived from his own posts, or not
 * shown at all. The patterns read the active fast's fast-day
 * entries inside the trailing seven days (the week he's been
 * living; the same counts the recaps quote, lib/fast-day-entries'
 * countFastDayEntryKinds):
 *
 *  - two or more close calls, every one of them on a day that
 *    ended kept, and no fall: the approved specimen's pattern —
 *    "{N} close calls this week, and you held every one. What is
 *    holding on teaching you about yourself?"
 *  - a fall, with a kept day after it in the fast: the fast went
 *    on, and the question asks what getting back up taught.
 *  - four or more held-strong moments and nothing else to say:
 *    a plain week of holding.
 *
 * Anything else — no active fast, a quiet week, a mixed week the
 * patterns can't speak to honestly — returns null, and the Desk
 * shows NO card. A question is never fabricated.
 */
export function weekQuestionFor(
  fasts: PersonalFast[],
  entries: PrayerJournalEntry[],
  todayIso: string,
): WeekQuestion | null {
  const fast = getActiveFast(fasts, todayIso);
  if (!fast) return null;
  const weekStart = sundayOfWeek(todayIso);
  const counts = countFastDayEntryKinds(fast, entries, trailingWeekDates(todayIso));
  if (counts.closeCall >= 2 && counts.fell === 0 && counts.closeCallsHeld === counts.closeCall) {
    return {
      weekStart,
      text: `${numberWord(counts.closeCall)} close calls this week, and you held every one. What is holding on teaching you about yourself?`,
    };
  }
  if (counts.fell >= 1 && counts.fellFollowedByKept) {
    return {
      weekStart,
      text: "You fell this week — and the fast went on. What did getting back up teach you?",
    };
  }
  if (counts.held >= 4 && counts.closeCall === 0 && counts.fell === 0) {
    return {
      weekStart,
      text: "You held strong all week. What made this week hold?",
    };
  }
  return null;
}

/** Whether this week's question has been answered: an Answer post
 *  carrying a question from this week exists. The card stays
 *  until answered or the week turns (v13). */
export function weekQuestionAnswered(
  entries: PrayerJournalEntry[],
  weekStart: string,
): boolean {
  return entries.some((entry) => entry.kind === "answer" && entry.question?.weekStart === weekStart);
}

// ─── Carried this week ───────────────────────────────────────────────────────

/**
 * CARRIED THIS WEEK: the people this week's PRAYER posts carried —
 * the tagged people of the week's kind-"prayer" entries, deduped
 * by id, in the order they were first carried. Faces and names
 * only: no counts, no scores (his ruling on the slot, Nov 1).
 */
export function carriedThisWeek(
  entries: PrayerJournalEntry[],
  todayIso: string,
): PrayerJournalTaggedPerson[] {
  const inWeek = new Set(trailingWeekDates(todayIso));
  const byId = new Map<string, PrayerJournalTaggedPerson>();
  const chronological = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const entry of chronological) {
    if (entry.kind !== "prayer" || !inWeek.has(entry.date)) continue;
    for (const person of entry.taggedPeople) {
      if (!byId.has(person.id)) byId.set(person.id, person);
    }
  }
  return [...byId.values()];
}

// ─── Memories ────────────────────────────────────────────────────────────────

export type DeskMemory = {
  entry: PrayerJournalEntry;
  /** The fast day number the memory's date was, when a fast
   *  covers it — "ONE WEEK AGO, DAY 298". */
  dayNumber?: number;
  /** "You've kept X of the 7 days since" — only when the fast's
   *  own day statuses honestly support it. */
  keptLine?: string;
};

/**
 * MEMORIES: a real post from exactly one week ago. The day's
 * first post (in the day's own order) is the one that resurfaces;
 * a fast-linked post from that day is preferred, so the Day N in
 * the header is the fast's truth. Nothing posted a week ago → no
 * card (null), never a substitute day.
 */
export function memoryFor(
  entries: PrayerJournalEntry[],
  fasts: PersonalFast[],
  todayIso: string,
): DeskMemory | null {
  const memoryDate = addDaysToIso(todayIso, -7);
  const thatDay = entries
    .filter((entry) => entry.date === memoryDate)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  if (thatDay.length === 0) return null;
  const entry = thatDay.find((candidate) => candidate.fastDay) ?? thatDay[0];

  const covering = fasts.find((fast) => getFastCalendarDays(fast).includes(memoryDate));
  let dayNumber: number | undefined;
  let keptLine: string | undefined;
  if (covering) {
    dayNumber = getFastCalendarDays(covering).indexOf(memoryDate) + 1;
    const since = Array.from({ length: 7 }, (_, index) => addDaysToIso(memoryDate, index + 1));
    const recorded = since.filter((date) => covering.dayStatuses[date] !== undefined);
    if (recorded.length > 0) {
      const kept = recorded.filter((date) => covering.dayStatuses[date] === "completed").length;
      keptLine = `You've kept ${kept} of the 7 days since.`;
    }
  }
  return { entry, ...(dayNumber ? { dayNumber } : {}), ...(keptLine ? { keptLine } : {}) };
}

// ─── The Desk feed ───────────────────────────────────────────────────────────

export type DeskFeedItem =
  | { type: "todayLabel"; key: string }
  | { type: "post"; key: string; entry: PrayerJournalEntry }
  | { type: "reachedGroup"; key: string; date: string; entries: PrayerJournalEntry[] }
  | { type: "fastLog"; key: string; date: string; fast: PersonalFast; dayNumber: number; entries: PrayerJournalEntry[] }
  | { type: "carried"; key: string; people: PrayerJournalTaggedPerson[] }
  | { type: "memory"; key: string; memory: DeskMemory }
  | { type: "yesterdayHead"; key: string; date: string; dayNumber?: number; kept: boolean }
  | { type: "dayHead"; key: string; date: string; dayNumber?: number; count: number };

function dayItemsFor(
  entries: PrayerJournalEntry[],
  fasts: PersonalFast[],
  date: string,
): DeskFeedItem[] {
  const dayEntries = entries.filter((entry) => entry.date === date);
  const fastEntries = dayEntries.filter((entry) => entry.fastDay);
  // v440: the day's reached lines stand together as one quiet
  // group (Concept 3), the way the day's fast entries stand as
  // one log — never scattered among the cards.
  const reachedEntries = dayEntries.filter((entry) => !entry.fastDay && entry.kind === "reached");
  const plainEntries = dayEntries.filter((entry) => !entry.fastDay && entry.kind !== "reached");

  // Group the day's fast entries by fast — one log per fast per day.
  const fastGroups = new Map<string, PrayerJournalEntry[]>();
  for (const entry of fastEntries) {
    const fastId = entry.fastDay!.fastId;
    const group = fastGroups.get(fastId) ?? [];
    group.push(entry);
    fastGroups.set(fastId, group);
  }

  type Stamped = { stamp: string; item: DeskFeedItem };
  const stamped: Stamped[] = [];
  for (const entry of plainEntries) {
    stamped.push({ stamp: entry.createdAt, item: { type: "post", key: entry.id, entry } });
  }
  if (reachedEntries.length > 0) {
    // The group takes the newest line's place in the day's order;
    // inside it the lines read newest first, as the feed reads.
    stamped.push({
      stamp: reachedEntries[0].createdAt,
      item: { type: "reachedGroup", key: `reached-${date}`, date, entries: reachedEntries },
    });
  }
  for (const [fastId, group] of fastGroups) {
    const fast = fasts.find((candidate) => candidate.id === fastId);
    if (!fast) {
      // A fast the store no longer holds: its entries still render,
      // as plain posts — nothing is ever dropped from the feed.
      for (const entry of group) stamped.push({ stamp: entry.createdAt, item: { type: "post", key: entry.id, entry } });
      continue;
    }
    const dayNumber = getFastCalendarDays(fast).indexOf(date) + 1;
    const chronological = getFastDayEntries(group, fastId, date);
    const latest = chronological[chronological.length - 1];
    stamped.push({
      stamp: latest ? latest.createdAt : `${date}T00:00:00.000Z`,
      item: { type: "fastLog", key: `fastlog-${fastId}-${date}`, date, fast, dayNumber, entries: chronological },
    });
  }
  // Newest first — the feed's standing order.
  stamped.sort((a, b) => b.stamp.localeCompare(a.stamp) || b.item.key.localeCompare(a.item.key));
  return stamped.map((entry) => entry.item);
}

function fastDayNumberFor(fasts: PersonalFast[], date: string): number | undefined {
  for (const fast of fasts) {
    const days = getFastCalendarDays(fast);
    const index = days.indexOf(date);
    if (index >= 0) return index + 1;
  }
  return undefined;
}

/**
 * The Desk's feed, in the settled order (v13): today's posts (the
 * EARLIER TODAY label rides as the first item, only when today
 * holds posts), then CARRIED THIS WEEK, then MEMORIES, then
 * YESTERDAY's header with its real posts, then every older day
 * resting as a one-line header. The masthead, writing card and
 * question card are the tab's header, above this list.
 */
export function deskFeedItems(
  entries: PrayerJournalEntry[],
  fasts: PersonalFast[],
  todayIso: string,
): DeskFeedItem[] {
  const items: DeskFeedItem[] = [];
  const sorted = sortPrayerJournalEntries(entries);
  const yesterdayIso = addDaysToIso(todayIso, -1);

  const todayItems = dayItemsFor(sorted, fasts, todayIso);
  if (todayItems.length > 0) {
    items.push({ type: "todayLabel", key: "today-label" });
    items.push(...todayItems);
  }

  const carried = carriedThisWeek(sorted, todayIso);
  if (carried.length > 0) items.push({ type: "carried", key: "carried", people: carried });

  const memory = memoryFor(sorted, fasts, todayIso);
  if (memory) items.push({ type: "memory", key: "memory", memory });

  const yesterdayItems = dayItemsFor(sorted, fasts, yesterdayIso);
  if (yesterdayItems.length > 0) {
    const covering = fasts.find((fast) => getFastCalendarDays(fast).includes(yesterdayIso));
    items.push({
      type: "yesterdayHead",
      key: `yhead-${yesterdayIso}`,
      date: yesterdayIso,
      dayNumber: fastDayNumberFor(fasts, yesterdayIso),
      kept: covering ? covering.dayStatuses[yesterdayIso] === "completed" : false,
    });
    items.push(...yesterdayItems);
  }

  const olderDates = [...new Set(sorted.filter((entry) => entry.date < yesterdayIso).map((entry) => entry.date))].sort(
    (a, b) => b.localeCompare(a),
  );
  for (const date of olderDates) {
    items.push({
      type: "dayHead",
      key: `dhead-${date}`,
      date,
      dayNumber: fastDayNumberFor(fasts, date),
      count: sorted.filter((entry) => entry.date === date).length,
    });
  }
  return items;
}

/** Today's post count, for the writing card's footer — every post
 *  filed today, fast entries included (they are today's posts). */
export function postsTodayCount(entries: PrayerJournalEntry[], todayIso: string): number {
  return entries.filter((entry) => entry.date === todayIso).length;
}

/** The long date the masthead carries: "Sunday, November 1". */
export function deskDateLabel(todayIso: string): string {
  return parseIsoDate(todayIso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** "Day 305 of the fast" — the masthead chip's text, when a fast
 *  is active today. */
export function activeFastChip(fasts: PersonalFast[], todayIso: string): string | null {
  const fast = getActiveFast(fasts, todayIso);
  if (!fast) return null;
  const dayNumber = getFastCalendarDays(fast).indexOf(todayIso) + 1;
  return dayNumber > 0 ? `Day ${dayNumber} of the fast` : null;
}

export { isoDateOf };
