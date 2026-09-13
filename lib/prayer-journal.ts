import type { Person } from "./prayercircle-data";

export type PrayerJournalTaggedPerson = Pick<
  Person,
  "id" | "name" | "initials" | "avatarColor" | "accentColor" | "photoUri"
>;

export type PrayerJournalReply = {
  id: string;
  body: string;
  date: string;
  createdAt: string;
};

export type PrayerJournalEntry = {
  id: string;
  body: string;
  date: string;
  taggedPeople: PrayerJournalTaggedPerson[];
  isBookmarked: boolean;
  replies: PrayerJournalReply[];
  createdAt: string;
  updatedAt: string;
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

export function createPrayerJournalEntry(
  entries: PrayerJournalEntry[],
  input: { body: string; date?: string; taggedPeople?: Person[] },
  entryId: string,
  now = new Date(),
): PrayerJournalEntry[] {
  const body = input.body.trim();
  if (!body) return entries;
  const createdAt = now.toISOString();
  const fallbackDate = formatLocalIsoDate(now);
  const entry: PrayerJournalEntry = {
    id: entryId,
    body,
    date: normalizeDate(input.date, fallbackDate),
    taggedPeople: (input.taggedPeople ?? []).map(snapshotPerson),
    isBookmarked: false,
    replies: [],
    createdAt,
    updatedAt: createdAt,
  };
  return sortPrayerJournalEntries([entry, ...entries]);
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
    if (!body) return [];
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
    return [
      {
        id:
          typeof candidate.id === "string" && candidate.id.trim()
            ? candidate.id.trim()
            : `journal-migrated-${index}-${createdAt}`,
        body,
        date,
        taggedPeople,
        isBookmarked: candidate.isBookmarked === true,
        replies,
        createdAt,
        updatedAt:
          typeof candidate.updatedAt === "string" && !Number.isNaN(new Date(candidate.updatedAt).getTime())
            ? candidate.updatedAt
            : createdAt,
      } satisfies PrayerJournalEntry,
    ];
  });
  return sortPrayerJournalEntries(normalized);
}
