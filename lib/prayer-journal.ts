import type { Person, PrayerItem } from "./prayercircle-data";

export type PrayerJournalTaggedPerson = Pick<
  Person,
  "id" | "name" | "initials" | "avatarColor" | "accentColor" | "photoUri" | "avatarAsset" | "gender"
>;

// v204: a place picked from the composer's # suggestions is stored
// structurally, the same way a @mention stores its person: the real
// display name plus the hashtag token the body carries (#MomsHouse).
// The body text alone can't hold a multi-word name in one #token,
// and an edit that rewords the text must not lose the place link.
export type PrayerJournalTaggedPlace = {
  name: string;
  tag: string;
};

export type PrayerJournalReply = {
  id: string;
  body: string;
  date: string;
  createdAt: string;
};

// v281 (Journal, To the Drawing): an entry's KIND — the data the
// approved frame's two hero cards needed and v252 couldn't carry.
// A praise posted from the People page is kind "praise" (the gold
// post); a prayer marked answered posts as kind "answered" (the
// teal card). Ordinary moments carry NO kind field at all — absence
// is the ordinary kind, so every entry written before v281 keeps
// its exact shape.
export type PrayerJournalEntryKind = "praise" | "answered";

export type PrayerJournalEntry = {
  id: string;
  title?: string;
  body: string;
  kind?: PrayerJournalEntryKind;
  date: string;
  taggedPeople: PrayerJournalTaggedPerson[];
  places?: PrayerJournalTaggedPlace[];
  isBookmarked: boolean;
  replies: PrayerJournalReply[];
  createdAt: string;
  updatedAt: string;
  color?: string;
  location?: string;
  weather?: string;
  mood?: { id: string; intensity: 1 | 2 | 3 };
  photos?: string[];
};

export type PrayerJournalGroup = {
  date: string;
  label: string;
  entries: PrayerJournalEntry[];
};

type LegacyJournalEntry = {
  id?: unknown;
  personId?: unknown;
  personName?: unknown;
  date?: unknown;
  note?: unknown;
};

function formatLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDate(value: unknown, fallback: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return fallback;
  }
  return value;
}

function normalizeTaggedPerson(value: unknown): PrayerJournalTaggedPerson | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PrayerJournalTaggedPerson>;
  const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  if (!id || !name) return null;
  const initials =
    typeof candidate.initials === "string" && candidate.initials.trim()
      ? candidate.initials.trim()
      : name
          .split(/\s+/)
          .map((part) => part[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
  return {
    id,
    name,
    initials,
    avatarColor: candidate.avatarColor || "#E9DDF8",
    accentColor: candidate.accentColor || "#7C5CFF",
    photoUri: candidate.photoUri,
  };
}

function normalizeReply(
  value: unknown,
  fallbackDate: string,
  fallbackCreatedAt: string,
  index: number,
): PrayerJournalReply | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PrayerJournalReply> & { text?: unknown; note?: unknown };
  const bodySource = candidate.body ?? candidate.text ?? candidate.note;
  const body = typeof bodySource === "string" ? bodySource.trim() : "";
  if (!body) return null;
  const createdAt =
    typeof candidate.createdAt === "string" && !Number.isNaN(new Date(candidate.createdAt).getTime())
      ? candidate.createdAt
      : fallbackCreatedAt;
  return {
    id:
      typeof candidate.id === "string" && candidate.id.trim()
        ? candidate.id.trim()
        : `reply-migrated-${index}-${createdAt}`,
    body,
    date: normalizeDate(candidate.date, fallbackDate),
    createdAt,
  };
}

function snapshotPerson(person: Person): PrayerJournalTaggedPerson {
  return {
    id: person.id,
    name: person.name,
    initials: person.initials,
    avatarColor: person.avatarColor,
    accentColor: person.accentColor,
    photoUri: person.photoUri,
  };
}

export function sortPrayerJournalEntries(entries: PrayerJournalEntry[]): PrayerJournalEntry[] {
  return [...entries].sort((first, second) => {
    const dateComparison = second.date.localeCompare(first.date);
    return dateComparison !== 0 ? dateComparison : second.createdAt.localeCompare(first.createdAt);
  });
}

type PrayerJournalEntryInput = {
  title?: string;
  body: string;
  kind?: PrayerJournalEntryKind;
  date?: string;
  taggedPeople?: Person[];
  places?: PrayerJournalTaggedPlace[];
  color?: string;
  location?: string;
  weather?: string;
  mood?: { id: string; intensity: 1 | 2 | 3 };
  photos?: string[];
};

function normalizeTaggedPlace(value: unknown): PrayerJournalTaggedPlace | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PrayerJournalTaggedPlace>;
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  const tag = typeof candidate.tag === "string" ? candidate.tag.trim().replace(/^#/, "") : "";
  if (!name || !tag) return null;
  return { name, tag };
}

function normalizeTaggedPlaces(value: unknown): PrayerJournalTaggedPlace[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const places: PrayerJournalTaggedPlace[] = [];
  for (const raw of value) {
    const place = normalizeTaggedPlace(raw);
    if (place && !places.some((kept) => kept.tag.toLowerCase() === place.tag.toLowerCase())) {
      places.push(place);
    }
  }
  return places.length > 0 ? places : undefined;
}

function normalizePhotos(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const photos = value.filter((photo): photo is string => typeof photo === "string" && photo.trim().length > 0);
  return photos.length > 0 ? photos : undefined;
}

// v194 (Journal, Zeitgeist): an entry may carry no words at all — a
// mood logged on its own, or a photo moment. Body-less entries are
// only valid when a mood or photos ride along; a truly empty entry
// is still rejected.
function hasStandaloneContent(input: { mood?: unknown; photos?: string[] }): boolean {
  return Boolean(input.mood) || Boolean(input.photos && input.photos.length > 0);
}

export function createPrayerJournalEntry(
  entries: PrayerJournalEntry[],
  input: PrayerJournalEntryInput,
  entryId: string,
  now = new Date(),
): PrayerJournalEntry[] {
  const body = input.body.trim();
  const photos = normalizePhotos(input.photos);
  if (!body && !hasStandaloneContent({ mood: input.mood, photos })) return entries;
  const createdAt = now.toISOString();
  const fallbackDate = formatLocalIsoDate(now);
  const entry: PrayerJournalEntry = {
    id: entryId,
    title: input.title?.trim() || undefined,
    body,
    date: normalizeDate(input.date, fallbackDate),
    taggedPeople: (input.taggedPeople ?? []).map(snapshotPerson),
    places: normalizeTaggedPlaces(input.places),
    isBookmarked: false,
    replies: [],
    createdAt,
    updatedAt: createdAt,
    color: input.color,
    location: input.location,
    weather: input.weather,
    mood: input.mood,
    photos,
    ...(input.kind ? { kind: input.kind } : {}),
  };
  return sortPrayerJournalEntries([entry, ...entries]);
}

export function updatePrayerJournalEntry(
  entries: PrayerJournalEntry[],
  entryId: string,
  input: PrayerJournalEntryInput & { date: string },
  now = new Date(),
): PrayerJournalEntry[] {
  const body = input.body.trim();
  const photos = normalizePhotos(input.photos);
  if (!body && !hasStandaloneContent({ mood: input.mood, photos })) return entries;
  const updatedAt = now.toISOString();
  return sortPrayerJournalEntries(
    entries.map((entry) =>
      entry.id === entryId
        ? {
            ...entry,
            title: input.title?.trim() || undefined,
            body,
            date: normalizeDate(input.date, entry.date),
            taggedPeople: input.taggedPeople ? input.taggedPeople.map(snapshotPerson) : entry.taggedPeople,
            // v204: an edit that doesn't touch places keeps the
            // entry's structural place links — rewording the body
            // in the editor must not strip them.
            places: input.places !== undefined ? normalizeTaggedPlaces(input.places) : entry.places,
            updatedAt,
            color: input.color,
            location: input.location,
            weather: input.weather,
            mood: input.mood,
            photos,
          }
        : entry,
    ),
  );
}

export function updatePrayerJournalReply(
  entries: PrayerJournalEntry[],
  entryId: string,
  replyId: string,
  bodyInput: string,
  now = new Date(),
): PrayerJournalEntry[] {
  const body = bodyInput.trim();
  if (!body) return entries;
  const updatedAt = now.toISOString();
  return entries.map((entry) =>
    entry.id === entryId
      ? {
          ...entry,
          replies: entry.replies.map((reply) => (reply.id === replyId ? { ...reply, body } : reply)),
          updatedAt,
        }
      : entry,
  );
}

export function togglePrayerJournalBookmark(
  entries: PrayerJournalEntry[],
  entryId: string,
  now = new Date(),
): PrayerJournalEntry[] {
  return entries.map((entry) =>
    entry.id === entryId
      ? { ...entry, isBookmarked: !entry.isBookmarked, updatedAt: now.toISOString() }
      : entry,
  );
}

export function addPrayerJournalReply(
  entries: PrayerJournalEntry[],
  entryId: string,
  bodyInput: string,
  replyId: string,
  now = new Date(),
): PrayerJournalEntry[] {
  const body = bodyInput.trim();
  if (!body || !entries.some((entry) => entry.id === entryId)) return entries;
  const createdAt = now.toISOString();
  const reply: PrayerJournalReply = {
    id: replyId,
    body,
    date: formatLocalIsoDate(now),
    createdAt,
  };
  return entries.map((entry) =>
    entry.id === entryId
      ? { ...entry, replies: [...entry.replies, reply], updatedAt: createdAt }
      : entry,
  );
}

export function removePrayerJournalReply(
  entries: PrayerJournalEntry[],
  entryId: string,
  replyId: string,
  now = new Date(),
): PrayerJournalEntry[] {
  return entries.map((entry) =>
    entry.id === entryId
      ? {
          ...entry,
          replies: entry.replies.filter((reply) => reply.id !== replyId),
          updatedAt: now.toISOString(),
        }
      : entry,
  );
}

export function removePrayerJournalEntry(
  entries: PrayerJournalEntry[],
  entryId: string,
): PrayerJournalEntry[] {
  return entries.filter((entry) => entry.id !== entryId);
}

export function filterPrayerJournalEntries(
  entries: PrayerJournalEntry[],
  bookmarksOnly: boolean,
): PrayerJournalEntry[] {
  return bookmarksOnly ? entries.filter((entry) => entry.isBookmarked) : entries;
}

export function formatPrayerJournalDate(date: string, includeYear = true): string {
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(includeYear ? { year: "numeric" as const } : {}),
  });
}

export function groupPrayerJournalEntries(entries: PrayerJournalEntry[]): PrayerJournalGroup[] {
  const groups = new Map<string, PrayerJournalEntry[]>();
  sortPrayerJournalEntries(entries).forEach((entry) => {
    const current = groups.get(entry.date) ?? [];
    current.push(entry);
    groups.set(entry.date, current);
  });
  return Array.from(groups.entries()).map(([date, groupedEntries]) => ({
    date,
    label: formatPrayerJournalDate(date, false),
    entries: groupedEntries,
  }));
}

export function normalizePrayerJournalEntries(value: unknown, now = new Date()): PrayerJournalEntry[] {
  if (!Array.isArray(value)) return [];
  const fallbackDate = formatLocalIsoDate(now);
  const fallbackCreatedAt = now.toISOString();
  const normalized = value.flatMap((rawValue, index) => {
    if (!rawValue || typeof rawValue !== "object") return [];
    const candidate = rawValue as Partial<PrayerJournalEntry> & LegacyJournalEntry;
    const bodySource = candidate.body ?? candidate.note;
    const body = typeof bodySource === "string" ? bodySource.trim() : "";
    const candidatePhotos = normalizePhotos(candidate.photos);
    const candidateMood =
      candidate.mood && typeof candidate.mood === "object" && typeof (candidate.mood as { id?: unknown }).id === "string"
        ? candidate.mood
        : undefined;
    // v194: mood-only and photo-only entries (no words) are real
    // entries now — they survive normalization alongside text ones.
    if (!body && !candidateMood && !candidatePhotos) return [];
    const date = normalizeDate(candidate.date, fallbackDate);
    const createdAt =
      typeof candidate.createdAt === "string" && !Number.isNaN(new Date(candidate.createdAt).getTime())
        ? candidate.createdAt
        : `${date}T12:00:00.000Z`;
    const taggedPeople = Array.isArray(candidate.taggedPeople)
      ? candidate.taggedPeople.flatMap((person) => {
          const normalizedPerson = normalizeTaggedPerson(person);
          return normalizedPerson ? [normalizedPerson] : [];
        })
      : typeof candidate.personId === "string" && typeof candidate.personName === "string"
        ? [
            {
              id: candidate.personId,
              name: candidate.personName,
              initials: candidate.personName
                .split(/\s+/)
                .map((part) => part[0])
                .join("")
                .toUpperCase()
                .slice(0, 2),
              avatarColor: "#E9DDF8",
              accentColor: "#7C5CFF",
            },
          ]
        : [];
    const replies = Array.isArray(candidate.replies)
      ? candidate.replies.flatMap((reply, replyIndex) => {
          const normalizedReply = normalizeReply(reply, date, fallbackCreatedAt, replyIndex);
          return normalizedReply ? [normalizedReply] : [];
        })
      : [];
    const title = typeof candidate.title === "string" && candidate.title.trim() ? candidate.title.trim() : undefined;
    // v281: the kind round-trips — a pack written by v281 keeps
    // its praise/answered entries; a pack from before the field
    // existed (or carrying anything else) loads as ordinary.
    const kind = candidate.kind === "praise" || candidate.kind === "answered" ? candidate.kind : undefined;
    const color = typeof candidate.color === "string" && candidate.color.trim() ? candidate.color.trim() : undefined;
    const location = typeof candidate.location === "string" && candidate.location.trim() ? candidate.location.trim() : undefined;
    const weather = typeof candidate.weather === "string" && candidate.weather.trim() ? candidate.weather.trim() : undefined;
    const mood = candidate.mood && typeof candidate.mood === "object" && typeof (candidate.mood as { id?: unknown }).id === "string"
      ? { id: (candidate.mood as { id: string }).id, intensity: (candidate.mood as { intensity?: unknown }).intensity === 2 ? 2 : (candidate.mood as { intensity?: unknown }).intensity === 3 ? 3 : 1 as 1 | 2 | 3 }
      : undefined;
    return [
      {
        id:
          typeof candidate.id === "string" && candidate.id.trim()
            ? candidate.id.trim()
            : `journal-migrated-${index}-${createdAt}`,
        ...(title ? { title } : {}),
        body,
        date,
        taggedPeople,
        ...(normalizeTaggedPlaces(candidate.places) ? { places: normalizeTaggedPlaces(candidate.places) } : {}),
        isBookmarked: candidate.isBookmarked === true,
        replies,
        createdAt,
        updatedAt:
          typeof candidate.updatedAt === "string" && !Number.isNaN(new Date(candidate.updatedAt).getTime())
            ? candidate.updatedAt
            : createdAt,
        ...(color ? { color } : {}),
        ...(location ? { location } : {}),
        ...(weather ? { weather } : {}),
        ...(mood ? { mood } : {}),
        ...(candidatePhotos ? { photos: candidatePhotos } : {}),
        ...(kind ? { kind } : {}),
      } satisfies PrayerJournalEntry,
    ];
  });
  return sortPrayerJournalEntries(normalized);
}

// ─── v281: entry kinds — the gold praise post, the teal answered post ──────

/** An entry's kind, with absence read as the ordinary moment it has
 *  always been. Renderers branch on this, never on the raw field. */
export function journalEntryKind(entry: PrayerJournalEntry): PrayerJournalEntryKind | "moment" {
  return entry.kind ?? "moment";
}

/** The stable Journal id for a prayer's answered post — one post
 *  per prayer item, ever, the studio-moments dedupe discipline. */
export function answeredPrayerJournalId(personId: string, itemId: string): string {
  return `journal-answered-${personId}-${itemId}`;
}

/**
 * The answered write-in (Jonathan's Oct 26 ruling: praise and
 * answered posts belong in the Journal). Marking a prayer item
 * answered posts it: the item's own words — its note under its
 * title when he wrote both, the title alone when that is all there
 * is — tagged to the person, kind "answered". Re-marking never
 * stacks a second post (the stable id above), and un-marking
 * never deletes the post: it is a moment in the story now.
 */
export function addAnsweredPrayerJournalEntry(
  entries: PrayerJournalEntry[],
  person: Person,
  item: PrayerItem,
  now = new Date(),
): PrayerJournalEntry[] {
  const id = answeredPrayerJournalId(person.id, item.id);
  if (entries.some((entry) => entry.id === id)) return entries;
  const note = item.note?.trim();
  return createPrayerJournalEntry(
    entries,
    {
      ...(note ? { title: item.title } : {}),
      body: note ?? item.title,
      taggedPeople: [person],
      kind: "answered",
    },
    id,
    now,
  );
}
