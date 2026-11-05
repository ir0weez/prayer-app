import type { Person, PrayerItem } from "./prayercircle-data";
import type { ReachedStamp } from "./reached-stamps";

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
// v411 (Journal/Fast Rework, Part 2 — the Desk): the kind set grows
// to the approved taxonomy (journal-kind-formats-v24): the Desk
// composer's kinds — "prayer" (the plum split card, people-tagged),
// "gratitude" (the rose keepsake), "verse" (the Bible card, its
// reference riding in `verse`), "answer" (a post carrying the
// week's question, riding in `question`) — and "entry", the plain
// moment named explicitly when the composer files it. Absence
// still reads as the plain moment it has always been.
// v440: the set grows once more — "reached", the quiet line a
// reached stamp leaves in the day's flow (Concept 3, his Nov 5
// pick). It is never composed; the stamp sync at the bottom of
// this file writes it, one per person per stamp date.
export type PrayerJournalEntryKind =
  | "praise"
  | "answered"
  | "entry"
  | "prayer"
  | "gratitude"
  | "verse"
  | "answer"
  | "reached";

/** v411: a verse post's reference — the book by its reader name
 *  ("Isaiah"), chapter and verse numbers, and the verse's own
 *  words, carried on the entry so the Bible card renders from the
 *  record and OPEN IN BIBLE can route from it. */
export type PrayerJournalVerseRef = {
  book: string;
  chapter: number;
  verse: number;
  text: string;
};

/** v411: the week's question, carried by the post that answers
 *  it — the question's own words plus the Sunday its week began,
 *  so the pair survives in yesterday and beyond (v12) and the Desk
 *  can tell the week has been answered. */
export type PrayerJournalQuestionRef = {
  text: string;
  weekStart: string;
};

const PRAYER_JOURNAL_ENTRY_KINDS: readonly PrayerJournalEntryKind[] = [
  "praise",
  "answered",
  "entry",
  "prayer",
  "gratitude",
  "verse",
  "answer",
  "reached",
];

function normalizeVerseRef(value: unknown): PrayerJournalVerseRef | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<PrayerJournalVerseRef>;
  const book = typeof candidate.book === "string" ? candidate.book.trim() : "";
  const text = typeof candidate.text === "string" ? candidate.text.trim() : "";
  const chapter = typeof candidate.chapter === "number" && Number.isFinite(candidate.chapter) ? Math.max(1, Math.floor(candidate.chapter)) : 0;
  const verse = typeof candidate.verse === "number" && Number.isFinite(candidate.verse) ? Math.max(1, Math.floor(candidate.verse)) : 0;
  if (!book || !text || chapter < 1 || verse < 1) return undefined;
  return { book, chapter, verse, text };
}

function normalizeQuestionRef(value: unknown): PrayerJournalQuestionRef | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<PrayerJournalQuestionRef>;
  const text = typeof candidate.text === "string" ? candidate.text.trim() : "";
  const weekStart = typeof candidate.weekStart === "string" ? candidate.weekStart.trim() : "";
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return undefined;
  return { text, weekStart };
}

// v410 (Journal/Fast Rework, Part 1 — Jonathan's Nov 1 build word):
// a fast day's moments live in this same store. ONE record: the
// fast's Day Page writes them, the Journal feed (Part 2) renders
// them, the recaps quote them. The linkage rides on the entry —
// the fast it belongs to, the moment's kind within the day, and,
// for the entries the v410 migration made out of the old per-day
// note strings, a migrated flag: a migrated moment's clock time
// was never recorded, and no surface may invent one for it.
export type FastDayEntryKind = "held" | "close-call" | "fell" | "note";

export type PrayerJournalFastDayLink = {
  fastId: string;
  kind: FastDayEntryKind;
  migrated?: boolean;
};

const FAST_DAY_ENTRY_KINDS: readonly FastDayEntryKind[] = ["held", "close-call", "fell", "note"];

function normalizeFastDayLink(value: unknown): PrayerJournalFastDayLink | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<PrayerJournalFastDayLink>;
  const fastId = typeof candidate.fastId === "string" ? candidate.fastId.trim() : "";
  if (!fastId) return undefined;
  // Pack tolerance: a link with a fast id but an unrecognized kind
  // still belongs to its fast — it reads as a plain note rather
  // than being orphaned out of the day.
  const kind = FAST_DAY_ENTRY_KINDS.includes(candidate.kind as FastDayEntryKind)
    ? (candidate.kind as FastDayEntryKind)
    : "note";
  return { fastId, kind, ...(candidate.migrated === true ? { migrated: true as const } : {}) };
}

export type PrayerJournalEntry = {
  id: string;
  title?: string;
  body: string;
  kind?: PrayerJournalEntryKind;
  fastDay?: PrayerJournalFastDayLink;
  /** v411: the verse reference, on kind "verse" entries. */
  verse?: PrayerJournalVerseRef;
  /** v411: the week's question this post answers, on kind "answer". */
  question?: PrayerJournalQuestionRef;
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
  fastDay?: PrayerJournalFastDayLink;
  verse?: PrayerJournalVerseRef;
  question?: PrayerJournalQuestionRef;
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
  // v440: a reached entry may carry no words at all — a quick-tap
  // mark has no note; the reach itself (person + stamp date) is
  // the content, the same standing the v194 note gives a mood.
  if (!body && !hasStandaloneContent({ mood: input.mood, photos }) && input.kind !== "reached") return entries;
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
    ...(input.fastDay ? { fastDay: input.fastDay } : {}),
    ...(normalizeVerseRef(input.verse) ? { verse: normalizeVerseRef(input.verse) } : {}),
    ...(normalizeQuestionRef(input.question) ? { question: normalizeQuestionRef(input.question) } : {}),
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
            // v411: the same rule for the verse reference and the
            // carried question — an edit that doesn't pass them
            // keeps the entry's.
            verse: input.verse !== undefined ? normalizeVerseRef(input.verse) : entry.verse,
            question: input.question !== undefined ? normalizeQuestionRef(input.question) : entry.question,
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
    // v440: a reached line survives on the same standing — a
    // quick-tap mark carries no words, and the line is the record.
    if (!body && !candidateMood && !candidatePhotos && candidate.kind !== "reached") return [];
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
    // v411: the Desk kinds round-trip the same way.
    const kind =
      typeof candidate.kind === "string" && PRAYER_JOURNAL_ENTRY_KINDS.includes(candidate.kind as PrayerJournalEntryKind)
        ? (candidate.kind as PrayerJournalEntryKind)
        : undefined;
    // v411: the verse reference and the carried question
    // round-trip alongside — a malformed one drops, never
    // orphans the entry it rode on.
    const verse = normalizeVerseRef(candidate.verse);
    const question = normalizeQuestionRef(candidate.question);
    // v410: the fast-day linkage round-trips with the same
    // tolerance — a pack written before the field existed (or by
    // the Studio) loads its fast entries as ordinary moments only
    // when the link itself is unusable.
    const fastDay = normalizeFastDayLink(candidate.fastDay);
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
        ...(fastDay ? { fastDay } : {}),
        ...(verse ? { verse } : {}),
        ...(question ? { question } : {}),
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

// ─── v440: the reached line — a stamp's quiet post in the Journal ─────────

/** The stable Journal id for a reached stamp's line — one line
 *  per person per stamp date, ever (the answered discipline). */
export function reachedJournalId(personId: string, date: string): string {
  return `journal-reached-${personId}-${date}`;
}

/**
 * Lowercase a text's first letter ONLY when it opens with a plain
 * capitalized word — all letters, capital first, the rest lower —
 * and what follows doesn't argue: no second word, or a second word
 * that starts lowercase. So a sentence written standing alone
 * ("Called to check in on him.", "His house") settles into the
 * line's flow ("called to check in on him", "his house"), while a
 * name or a brand keeps its shape: "Met John at…" (John is
 * capitalized) and "McDonald's" / "In-N-Out" (not plain words)
 * pass through untouched — and "I" never lowercases.
 */
export function firstLetterLowerIfPlain(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const words = trimmed.split(/\s+/);
  const first = words[0];
  if (first === "I") return trimmed;
  if (!/^[A-Za-z]+$/.test(first)) return trimmed;
  if (!/^[A-Z][a-z]*$/.test(first)) return trimmed;
  const second = words[1];
  if (second !== undefined && !/^[a-z]/.test(second)) return trimmed;
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

export type ReachedLineParts = {
  /** The reached person's name — the line's one bold run. */
  name: string;
  /** Everything after the name: " — note, at place", ", at
   *  place", " — note", or "" when the stamp carries neither. */
  tail: string;
};

/**
 * The quiet line's words (Concept 3, the approved drawing):
 * "You reached Dad — called to check in on him, at his house".
 * The stamp's note rides verbatim minus its trailing period,
 * settled by the plain-word rule above; the stamp's location
 * appends as ", at …" under the same rule.
 */
export function reachedLineParts(input: {
  personName: string;
  note?: string;
  location?: string;
}): ReachedLineParts {
  const noteText = (input.note ?? "").trim().replace(/\.$/, "");
  const note = noteText ? firstLetterLowerIfPlain(noteText) : "";
  const locationText = (input.location ?? "").trim();
  const location = locationText ? firstLetterLowerIfPlain(locationText) : "";
  let tail = "";
  if (note) tail += ` — ${note}`;
  if (location) tail += `, at ${location}`;
  return { name: input.personName, tail };
}

/** The line as one string — the parts above, joined for tests
 *  and any surface that needs the words whole. */
export function formatReachedLine(input: {
  personName: string;
  note?: string;
  location?: string;
}): string {
  const parts = reachedLineParts(input);
  return `You reached ${parts.name}${parts.tail}`;
}

function upsertReachedJournalEntry(
  entries: PrayerJournalEntry[],
  tagged: PrayerJournalTaggedPerson,
  stamp: ReachedStamp,
  now: Date,
): PrayerJournalEntry[] {
  const id = reachedJournalId(stamp.personId, stamp.date);
  const body = stamp.note?.trim() ?? "";
  const location = stamp.location?.trim() || undefined;
  const existing = entries.find((entry) => entry.id === id);
  if (existing) {
    if (
      existing.body === body &&
      existing.location === location &&
      existing.taggedPeople[0]?.id === tagged.id &&
      existing.taggedPeople[0]?.name === tagged.name
    ) {
      return entries;
    }
    // Re-marking or editing the stamp refreshes the same line —
    // its replies, bookmark and first-written time stand.
    return entries.map((entry) =>
      entry.id === id
        ? { ...entry, body, location, taggedPeople: [tagged], kind: "reached" as const, date: stamp.date, updatedAt: now.toISOString() }
        : entry,
    );
  }
  const createdAt = now.toISOString();
  const entry: PrayerJournalEntry = {
    id,
    body,
    kind: "reached",
    date: stamp.date,
    taggedPeople: [tagged],
    isBookmarked: false,
    replies: [],
    createdAt,
    updatedAt: createdAt,
    ...(location ? { location } : {}),
  };
  return sortPrayerJournalEntries([entry, ...entries]);
}

/**
 * The reached write-in (his Nov 5 ruling: marking someone reached
 * should leave a line in the Journal, the way answering a prayer
 * leaves its post). One line per person per stamp date: the first
 * mark creates it under the STAMP's date — a backdated stamp's
 * line belongs to the day the reach happened, not the day it was
 * typed — and every later save of that stamp (a re-mark, the
 * editor's note/location) refreshes the same line in place. The
 * stamp's note rides as the entry's body and its location as the
 * entry's location, so the line renders from the record exactly
 * as the answered post renders its prayer's words.
 */
export function addReachedJournalEntry(
  entries: PrayerJournalEntry[],
  person: Person,
  stamp: ReachedStamp,
  now = new Date(),
): PrayerJournalEntry[] {
  return upsertReachedJournalEntry(entries, snapshotPerson(person), stamp, now);
}

/** A stamp's line goes when the stamp goes. Absence is a no-op —
 *  the same array comes back, so callers can diff by reference. */
export function removeReachedJournalEntry(
  entries: PrayerJournalEntry[],
  stamp: ReachedStamp,
): PrayerJournalEntry[] {
  return removeReachedJournalEntryByKey(entries, stamp.personId, stamp.date);
}

export function removeReachedJournalEntryByKey(
  entries: PrayerJournalEntry[],
  personId: string,
  date: string,
): PrayerJournalEntry[] {
  const id = reachedJournalId(personId, date);
  if (!entries.some((entry) => entry.id === id)) return entries;
  return entries.filter((entry) => entry.id !== id);
}

/** What the sync remembers of a stamp: everything the line is
 *  made of, so a change to any of it re-reads as a changed stamp. */
export function reachedStampFingerprint(stamp: ReachedStamp): string {
  return JSON.stringify([stamp.personId, stamp.personName, stamp.date, stamp.note ?? "", stamp.location ?? ""]);
}

function taggedPersonForStamp(stamp: ReachedStamp, people: Person[]): PrayerJournalTaggedPerson {
  const person = people.find((candidate) => candidate.id === stamp.personId);
  if (person) return snapshotPerson(person);
  // The person left the list after the stamp was written — the
  // stamp's own record still names them (the legacy derivation).
  return {
    id: stamp.personId,
    name: stamp.personName,
    initials: stamp.personName
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2),
    avatarColor: "#E9DDF8",
    accentColor: "#7C5CFF",
  };
}

/**
 * The stamp→journal sync. Every stamp write — the person page's
 * button and editor, the Due page, the People card, the stamp
 * row's note edit and delete — converges on the one reachedStamps
 * record the Desk shell holds (its own state for the in-shell
 * doors, re-read from storage on focus for the routed ones, the
 * same convergence the XP door already diffs), so the sync is a
 * reconcile against the last-seen stamps, not a hook in every
 * door:
 *
 * - baseline === null (first sight after hydration): remember
 *   the stamps, change NOTHING. Stamps that already stand were
 *   written before the sync existed — no backfill, ever.
 * - a stamp new since the baseline, or changed in any finger-
 *   printed field (a re-mark, a note/location edit): its line is
 *   created or refreshed in place.
 * - a stamp gone since the baseline: its line goes with it (a
 *   baseline stamp that never had a line is a harmless no-op).
 *
 * Returns the entries (the SAME array when nothing moved, so the
 * caller can set state by reference diff) and the new baseline.
 */
export function reconcileReachedJournalEntries(
  entries: PrayerJournalEntry[],
  stamps: ReachedStamp[],
  people: Person[],
  baseline: ReadonlyMap<string, string> | null,
  now = new Date(),
): { entries: PrayerJournalEntry[]; baseline: Map<string, string> } {
  const nextBaseline = new Map<string, string>(
    stamps.map((stamp) => [stamp.id, reachedStampFingerprint(stamp)] as const),
  );
  if (baseline === null) return { entries, baseline: nextBaseline };
  let next = entries;
  for (const stamp of stamps) {
    if (baseline.get(stamp.id) === nextBaseline.get(stamp.id)) continue;
    next = upsertReachedJournalEntry(next, taggedPersonForStamp(stamp, people), stamp, now);
  }
  for (const [stampId, fingerprint] of baseline) {
    if (nextBaseline.has(stampId)) continue;
    try {
      const parsed = JSON.parse(fingerprint) as unknown;
      if (Array.isArray(parsed) && typeof parsed[0] === "string" && typeof parsed[2] === "string") {
        next = removeReachedJournalEntryByKey(next, parsed[0], parsed[2]);
      }
    } catch {
      // A fingerprint that doesn't parse carries no key to remove
      // by — the line, if any, simply stands.
    }
  }
  return { entries: next, baseline: nextBaseline };
}
