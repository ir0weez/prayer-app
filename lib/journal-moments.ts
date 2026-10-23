import type { Person } from "./prayercircle-data";
import { sortPrayerJournalEntries } from "./prayer-journal";
import type { PrayerJournalEntry, PrayerJournalTaggedPerson } from "./prayer-journal";
import type { ScheduleEvent } from "./schedule-data";

// ─── v194 "Journal, Zeitgeist" ───────────────────────────────────────────────
// Pure helpers behind the rebuilt Journal (Moments feed, Day overview,
// person profiles, tag pages, painted mood calendar). The design spec
// is the approved mockup at ~/workspace/social-mockups/journal-social.html:
// Zeitgeist's screens, PrayerCircle's data. Everything here is derived
// from data the app already keeps — journal entries, the schedule, and
// People — nothing is invented (no steps, no sleep, no weather).

export type DayPart = "morning" | "midday" | "evening";
export const DAY_PARTS: DayPart[] = ["morning", "midday", "evening"];

export function isoDateOf(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function addDaysToIso(iso: string, days: number): string {
  const parsed = parseIsoDate(iso);
  parsed.setDate(parsed.getDate() + days);
  return isoDateOf(parsed);
}

export function formatClock(isoDateTime: string): string {
  const parsed = new Date(isoDateTime);
  if (Number.isNaN(parsed.getTime())) return "";
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatTime12(time?: string): string {
  if (!time || !/^\d{1,2}:\d{2}/.test(time)) return "";
  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return "";
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function formatEventTimeRange(event: Pick<ScheduleEvent, "startTime" | "endTime">): string {
  const start = formatTime12(event.startTime);
  const end = formatTime12(event.endTime);
  if (start && end) return `${start} – ${end}`;
  return start || end || "All day";
}

export function dayPartForHour(hour: number): DayPart {
  if (hour < 12) return "morning";
  if (hour < 17) return "midday";
  return "evening";
}

export function entryDayPart(entry: PrayerJournalEntry): DayPart {
  const parsed = new Date(entry.createdAt);
  if (Number.isNaN(parsed.getTime())) return "midday";
  return dayPartForHour(parsed.getHours());
}

export function isMoodOnlyEntry(entry: PrayerJournalEntry): boolean {
  return !entry.body.trim() && Boolean(entry.mood) && !(entry.photos && entry.photos.length > 0);
}

export function entryPhotos(entry: PrayerJournalEntry): string[] {
  return entry.photos ?? [];
}

// ─── Painted calendar ────────────────────────────────────────────────────────
// Each day paints in up to three segments (morning / midday / evening)
// from that day-part's moods. The latest mood logged in a part wins.

export type PaintedDay = Partial<Record<DayPart, string>>;

export function paintedDays(entries: PrayerJournalEntry[]): Map<string, PaintedDay> {
  const painted = new Map<string, PaintedDay>();
  const chronological = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const entry of chronological) {
    if (!entry.mood) continue;
    const part = entryDayPart(entry);
    const current = painted.get(entry.date) ?? {};
    current[part] = entry.mood.id;
    painted.set(entry.date, current);
  }
  return painted;
}

// ─── Mentions & people ───────────────────────────────────────────────────────
// A person is "in" an entry when they are tagged on it, or when the
// body @-mentions them by full name or first name (Zeitgeist's rule:
// @mention someone and the moment is shared with them).

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function mentionNamesFor(person: Pick<Person, "name">): string[] {
  const full = person.name.trim();
  const first = full.split(/\s+/)[0] ?? "";
  return first && first !== full ? [full, first] : [full];
}

export function bodyMentionsPerson(body: string, person: Pick<Person, "name">): boolean {
  if (!body) return false;
  return mentionNamesFor(person).some((name) =>
    new RegExp(`@${escapeRegExp(name)}(?![\\w])`, "i").test(body),
  );
}

export function peopleMentionedInBody(body: string, people: Person[]): Person[] {
  return people.filter((person) => bodyMentionsPerson(body, person));
}

export function entryInvolvesPerson(entry: PrayerJournalEntry, person: Pick<Person, "id" | "name">): boolean {
  return entry.taggedPeople.some((tagged) => tagged.id === person.id) || bodyMentionsPerson(entry.body, person);
}

export function entriesForPerson(entries: PrayerJournalEntry[], person: Pick<Person, "id" | "name">): PrayerJournalEntry[] {
  return entries.filter((entry) => entryInvolvesPerson(entry, person));
}

export function lastSharedEntry(
  entries: PrayerJournalEntry[],
  person: Pick<Person, "id" | "name">,
): PrayerJournalEntry | null {
  const shared = entriesForPerson(entries, person);
  return shared.length > 0 ? shared[0] : null;
}

export function sharedDatesFor(entries: PrayerJournalEntry[], person: Pick<Person, "id" | "name">): Set<string> {
  return new Set(entriesForPerson(entries, person).map((entry) => entry.date));
}

// ─── Tags ────────────────────────────────────────────────────────────────────

export type TagStats = {
  tag: string;
  count: number;
  dates: Set<string>;
  firstDate: string;
  lastDate: string;
};

// Same rule as components/markdown-text's extractHashtags (kept local
// so lib code never imports a component): #word tokens, deduped.
export function extractEntryHashtags(text: string): string[] {
  const matches = text.match(/#(\w+)/g);
  return matches ? [...new Set(matches.map((match) => match.slice(1)))] : [];
}

export function entryTags(entry: PrayerJournalEntry): string[] {
  // v204: a picked place rides structurally on the entry (entry
  // .places) as well as in the body text — its tag counts even if
  // an edit later rewords the body, so the place's page never loses
  // a moment it was linked into.
  const fromBody = extractEntryHashtags(entry.body).map((tag) => tag.toLowerCase());
  const fromPlaces = (entry.places ?? []).map((place) => place.tag.toLowerCase());
  return [...new Set([...fromBody, ...fromPlaces])];
}

export function placeNameForTag(entries: PrayerJournalEntry[], tag: string): string | null {
  const wanted = tag.toLowerCase();
  for (const entry of entries) {
    for (const place of entry.places ?? []) {
      if (place.tag.toLowerCase() === wanted) return place.name;
    }
  }
  return null;
}

// ─── Composer @ / # autocomplete (v204) ─────────────────────────────────────
// v204 diagnosis: the composer never had an insertion path at all —
// the TextInput was a plain controlled input, posting wrote NO
// taggedPeople, and the only @ support anywhere was a render-time
// regex (peopleMentionedInBody / journal-post's segmenter) that can
// link a name only when it was already typed perfectly, in full.
// Typing "@Ev…" completed nothing, stored nothing, linked nothing.
// These pure helpers are the missing half: find the token being
// typed, suggest people/places for it, splice a pick back in.

export type ActiveToken = {
  trigger: "@" | "#";
  query: string;
  /** Index of the trigger character in the text. */
  start: number;
  /** Cursor position — the query runs from start + 1 to here. */
  end: number;
};

// A mention query is name-shaped: letters (accents included),
// apostrophes, hyphens, dots, and single spaces between words —
// "@Eva R" is a name being typed, "@Eva went home today" is a
// sentence (the filter below finds no match for it and the strip
// simply stays closed).
const MENTION_QUERY = /^[A-Za-zÀ-ÖØ-öø-ÿ'’.-]*(?: [A-Za-zÀ-ÖØ-öø-ÿ'’.-]+){0,2}$/;
const PLACE_QUERY = /^\w*$/;
const MAX_TOKEN_SPAN = 48;

export function activeTokenAt(text: string, cursor: number): ActiveToken | null {
  const end = Math.max(0, Math.min(cursor, text.length));
  for (let start = end - 1; start >= 0 && end - start <= MAX_TOKEN_SPAN; start -= 1) {
    const char = text[start];
    if (char === "\n") return null;
    if (char !== "@" && char !== "#") continue;
    // The nearest trigger decides: if its query is malformed (or
    // the trigger is glued to a word, as in an email address), no
    // older token is being typed either.
    const query = text.slice(start + 1, end);
    const valid = char === "@" ? MENTION_QUERY.test(query) : PLACE_QUERY.test(query);
    if (!valid) return null;
    if (start > 0 && !/[\s(\[{]/.test(text[start - 1])) return null;
    return { trigger: char, query, start, end };
  }
  return null;
}

export function peopleSuggestions(people: Person[], query: string, limit = 5): Person[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return people.slice(0, limit);
  const scored: { person: Person; rank: number }[] = [];
  for (const person of people) {
    const name = person.name.toLowerCase();
    let rank = -1;
    if (name.startsWith(needle)) rank = 0;
    else if (name.split(/\s+/).some((word) => word.startsWith(needle))) rank = 1;
    else if (name.includes(needle)) rank = 2;
    if (rank >= 0) scored.push({ person, rank });
  }
  return scored
    .sort((a, b) => a.rank - b.rank || a.person.name.localeCompare(b.person.name))
    .slice(0, limit)
    .map((scored) => scored.person);
}

// The hashtag token a place name travels under: one word, the
// name's own words joined ("Mom's House" → "MomsHouse", "West Park
// Elementary" → "WestParkElementary"). entryTags lowercases it,
// like every hashtag in the Journal.
export function placeTagFor(name: string): string {
  const words = name
    .replace(/[’']/g, "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  return words
    .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join("");
}

export function placeSuggestions(places: string[], query: string, limit = 5): string[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return places.slice(0, limit);
  return places
    .filter((place) => place.toLowerCase().includes(needle) || placeTagFor(place).toLowerCase().startsWith(needle))
    .slice(0, limit);
}

// Splices a pick over the active token: the trigger + partial query
// is replaced by the full insertion and one trailing space, and the
// cursor lands right after that space.
export function applySuggestion(
  text: string,
  token: ActiveToken,
  replacement: string,
): { text: string; cursor: number } {
  const inserted = `${replacement} `;
  return {
    text: text.slice(0, token.start) + inserted + text.slice(token.end),
    cursor: token.start + inserted.length,
  };
}

// Every place the # strip may suggest: the schedule's locations
// (the same strings the Places Path walks) first-hand, plus any
// place his entries already carry — their location field or a
// structurally picked place. Deduped by case, sorted by name.
export function knownPlaces(events: ScheduleEvent[], entries: PrayerJournalEntry[]): string[] {
  const seen = new Map<string, string>();
  const add = (raw?: string) => {
    const name = (raw ?? "").trim().replace(/\s+/g, " ");
    if (!name) return;
    const key = name.toLowerCase();
    if (!seen.has(key)) seen.set(key, name);
  };
  for (const event of events) add(event.location);
  for (const entry of entries) {
    add(entry.location);
    for (const place of entry.places ?? []) add(place.name);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

export function tagIndex(entries: PrayerJournalEntry[]): Map<string, TagStats> {
  const index = new Map<string, TagStats>();
  for (const entry of entries) {
    for (const tag of entryTags(entry)) {
      const current = index.get(tag);
      if (!current) {
        index.set(tag, { tag, count: 1, dates: new Set([entry.date]), firstDate: entry.date, lastDate: entry.date });
      } else {
        current.count += 1;
        current.dates.add(entry.date);
        if (entry.date < current.firstDate) current.firstDate = entry.date;
        if (entry.date > current.lastDate) current.lastDate = entry.date;
      }
    }
  }
  return index;
}

export function entriesForTag(entries: PrayerJournalEntry[], tag: string): PrayerJournalEntry[] {
  const wanted = tag.toLowerCase();
  return entries.filter((entry) => entryTags(entry).includes(wanted));
}

// ─── Day overview ────────────────────────────────────────────────────────────

export type DayCounts = {
  entries: number;
  photos: number;
  events: number;
  people: PrayerJournalTaggedPerson[];
};

export function dayCounts(entries: PrayerJournalEntry[], events: ScheduleEvent[], date: string): DayCounts {
  const dayEntries = entries.filter((entry) => entry.date === date);
  const peopleById = new Map<string, PrayerJournalTaggedPerson>();
  for (const entry of dayEntries) {
    for (const person of entry.taggedPeople) peopleById.set(person.id, person);
  }
  return {
    entries: dayEntries.length,
    photos: dayEntries.reduce((total, entry) => total + entryPhotos(entry).length, 0),
    events: events.filter((event) => event.date === date).length,
    people: [...peopleById.values()],
  };
}

// ─── Moments feed ────────────────────────────────────────────────────────────
// The feed the Moments tab renders: entries newest-first, grouped
// under a separator per journal date, with the tab's search query
// and bookmarks-only filter applied. Extracted from the tab (v196)
// so the post → feed round trip is testable.
//
// This filter is a Moments-only gate: the Day assembler above reads
// the raw entries, so a post that fails this filter still exists —
// it shows in Day, on person/tag pages, everywhere except Moments.
// v196 root cause: the tab kept the last search query applied after
// the search bar closed (no indicator anywhere), so a fresh thought
// that didn't contain the leftover query "didn't save" — it had; it
// was filtered out of this list only. The tab now clears the query
// when the search bar toggles and clears every filter when a post
// lands, so a fresh post is always revealed here.

export type MomentsFeedItem =
  | { kind: "separator"; key: string; date: string }
  | { kind: "entry"; key: string; entry: PrayerJournalEntry };

export function momentsFeedItems(
  entries: PrayerJournalEntry[],
  options: { query?: string; bookmarksOnly?: boolean } = {},
): MomentsFeedItem[] {
  const normalizedQuery = (options.query ?? "").trim().toLowerCase();
  const filtered = sortPrayerJournalEntries(entries).filter((entry) => {
    if (options.bookmarksOnly && !entry.isBookmarked) return false;
    if (!normalizedQuery) return true;
    return (
      (entry.title ?? "").toLowerCase().includes(normalizedQuery) ||
      entry.body.toLowerCase().includes(normalizedQuery) ||
      (entry.location?.toLowerCase().includes(normalizedQuery) ?? false) ||
      entry.taggedPeople.some((person) => person.name.toLowerCase().includes(normalizedQuery))
    );
  });
  const items: MomentsFeedItem[] = [];
  let lastDate = "";
  for (const entry of filtered) {
    if (entry.date !== lastDate) {
      items.push({ kind: "separator", key: `sep-${entry.date}`, date: entry.date });
      lastDate = entry.date;
    }
    items.push({ kind: "entry", key: entry.id, entry });
  }
  return items;
}

export type DayTimelineItem =
  | { kind: "entry"; time: string; minutes: number; entry: PrayerJournalEntry }
  | { kind: "event"; time: string; minutes: number; event: ScheduleEvent }
  | { kind: "photos"; time: string; minutes: number; photos: string[] };

function minutesOfClock(clock: string): number {
  const parsed = new Date(clock);
  if (Number.isNaN(parsed.getTime())) return 12 * 60;
  return parsed.getHours() * 60 + parsed.getMinutes();
}

function minutesOfTime(time?: string): number {
  if (!time || !/^\d{1,2}:\d{2}/.test(time)) return 12 * 60;
  const [hour, minute] = time.split(":").map(Number);
  return (hour || 0) * 60 + (minute || 0);
}

// The day assembles itself: the day's entries and its schedule events
// interleaved in time order, with the day's photos gathered into one
// row (the way Zeitgeist gathers them) at the first photo's time.
export function buildDayTimeline(
  entries: PrayerJournalEntry[],
  events: ScheduleEvent[],
  date: string,
): DayTimelineItem[] {
  const items: DayTimelineItem[] = [];
  const dayEntries = entries.filter((entry) => entry.date === date);
  for (const entry of dayEntries) {
    items.push({ kind: "entry", time: formatClock(entry.createdAt), minutes: minutesOfClock(entry.createdAt), entry });
  }
  for (const event of events.filter((candidate) => candidate.date === date)) {
    items.push({ kind: "event", time: formatTime12(event.startTime), minutes: minutesOfTime(event.startTime), event });
  }
  const photos = dayEntries.flatMap((entry) => entryPhotos(entry));
  if (photos.length > 0) {
    const firstPhotoEntry = dayEntries.find((entry) => entryPhotos(entry).length > 0);
    if (firstPhotoEntry) {
      items.push({
        kind: "photos",
        time: formatClock(firstPhotoEntry.createdAt),
        minutes: minutesOfClock(firstPhotoEntry.createdAt),
        photos,
      });
    }
  }
  return items.sort((a, b) => a.minutes - b.minutes);
}

// ─── Shared-moments contribution calendar ────────────────────────────────────
// GitHub-style grid: columns are weeks (oldest → newest), rows are
// Sun..Sat. A stamped cell is a day present in the given date set.

export type ContributionCell = { date: string; stamped: boolean } | null;

export function contributionGrid(dates: Set<string>, endIso: string, weeks = 18): ContributionCell[][] {
  const end = parseIsoDate(endIso);
  // Back up to the Saturday of the end week, then walk (weeks * 7 - 1) days back.
  const endSaturday = new Date(end);
  endSaturday.setDate(end.getDate() + (6 - end.getDay()));
  const totalDays = weeks * 7;
  const columns: ContributionCell[][] = [];
  for (let col = 0; col < weeks; col += 1) {
    const column: ContributionCell[] = [];
    for (let row = 0; row < 7; row += 1) {
      const offset = totalDays - 1 - (col * 7 + (6 - row));
      const cellDate = new Date(endSaturday);
      cellDate.setDate(endSaturday.getDate() - offset);
      const iso = isoDateOf(cellDate);
      column.push(iso > endIso ? null : { date: iso, stamped: dates.has(iso) });
    }
    columns.push(column);
  }
  return columns;
}

export function monthLabelsForGrid(grid: ContributionCell[][]): { column: number; label: string }[] {
  const labels: { column: number; label: string }[] = [];
  let lastMonth = -1;
  grid.forEach((column, colIndex) => {
    const firstCell = column.find((cell) => cell !== null);
    if (!firstCell) return;
    const month = parseIsoDate(firstCell.date).getMonth();
    if (month !== lastMonth) {
      labels.push({ column: colIndex, label: parseIsoDate(firstCell.date).toLocaleDateString("en-US", { month: "short" }) });
      lastMonth = month;
    }
  });
  return labels;
}

export function formatMonthYear(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function formatDayTitle(iso: string, todayIso: string): string {
  if (iso === todayIso) return "Today";
  if (iso === addDaysToIso(todayIso, -1)) return "Yesterday";
  if (iso === addDaysToIso(todayIso, 1)) return "Tomorrow";
  return parseIsoDate(iso).toLocaleDateString("en-US", { weekday: "long" });
}

export function formatDaySub(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

// ─── The Places Path (Day header, Jonathan's pick 2026-10-22) ───────────────
// The drawn route through the day's places, in schedule order. Fed
// only by what the Schedule honestly holds: events that carry a
// location. "Live" the app's way — the current place is computed from
// the schedule and the clock at render time; no timers run. The
// current place is the last located stop whose start time has passed
// (where he should be now); earlier stops are past, later ones plain.

export type PlaceNodeState = "past" | "now" | "upcoming";
export type PlaceIconHint = "home" | "school" | "heart" | "booth" | "church" | "place";

export type PlaceNode = {
  key: string;
  location: string;
  timeLabel: string;
  startMinutes: number; // -1 when the event carries no start time
  state: PlaceNodeState;
  iconHint: PlaceIconHint;
};

export type PlacesPath = { nodes: PlaceNode[]; homeOnly: boolean };

function placeIconHint(location: string, title: string): PlaceIconHint {
  const text = `${location} ${title}`.toLowerCase();
  if (/\bhome\b|house|trailer/.test(text)) return "home";
  if (/school|ilead|i lead|class|academy/.test(text)) return "school";
  if (/mom|mother|denise/.test(text)) return "heart";
  if (/booth|office|studio|garage|work/.test(text)) return "booth";
  if (/church|baptist|chapel/.test(text)) return "church";
  return "place";
}

const MAX_PATH_NODES = 5;

export function placesPathFor(events: ScheduleEvent[], date: string, now: Date): PlacesPath {
  const todayIso = isoDateOf(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const located = events
    .filter((event) => event.date === date && (event.location ?? "").trim().length > 0)
    .sort((a, b) => minutesOfTime(a.startTime) - minutesOfTime(b.startTime));

  // Consecutive repeats of the same place are one stop.
  const stops: { event: ScheduleEvent; location: string }[] = [];
  for (const event of located) {
    const location = (event.location ?? "").trim();
    if (stops.length > 0 && stops[stops.length - 1].location.toLowerCase() === location.toLowerCase()) continue;
    stops.push({ event, location });
  }

  if (stops.length === 0) {
    return {
      homeOnly: true,
      nodes: [
        {
          key: "home-only",
          location: "Home",
          timeLabel: "",
          startMinutes: -1,
          state: date === todayIso ? "now" : date < todayIso ? "past" : "upcoming",
          iconHint: "home",
        },
      ],
    };
  }

  const startOf = stops.map((stop) => (stop.event.startTime ? minutesOfTime(stop.event.startTime) : -1));

  let nowIndex = -1;
  if (date === todayIso) {
    for (let index = 0; index < stops.length; index += 1) {
      if (startOf[index] >= 0 && startOf[index] <= nowMinutes) nowIndex = index;
    }
  }

  // Cap the path at the mockup's five nodes; if sampling would drop
  // the current stop, swap it back in.
  let keep: number[] = stops.map((_, index) => index);
  if (stops.length > MAX_PATH_NODES) {
    keep = Array.from({ length: MAX_PATH_NODES }, (_, slot) =>
      Math.round((slot * (stops.length - 1)) / (MAX_PATH_NODES - 1)),
    );
    if (nowIndex >= 0 && !keep.includes(nowIndex)) {
      let nearest = 0;
      for (let slot = 0; slot < keep.length; slot += 1) {
        if (Math.abs(keep[slot] - nowIndex) < Math.abs(keep[nearest] - nowIndex)) nearest = slot;
      }
      keep[nearest] = nowIndex;
      keep.sort((a, b) => a - b);
    }
  }

  const nodes: PlaceNode[] = keep.map((index) => {
    const stop = stops[index];
    let state: PlaceNodeState;
    if (date < todayIso) state = "past";
    else if (date > todayIso) state = "upcoming";
    else if (nowIndex === -1) state = "upcoming";
    else if (index < nowIndex) state = "past";
    else if (index === nowIndex) state = "now";
    else state = "upcoming";
    return {
      key: `${stop.event.id}-${index}`,
      location: stop.location,
      timeLabel: stop.event.startTime ? formatTime12(stop.event.startTime) : "",
      startMinutes: startOf[index],
      state,
      iconHint: placeIconHint(stop.location, stop.event.title),
    };
  });

  return { nodes, homeOnly: false };
}
