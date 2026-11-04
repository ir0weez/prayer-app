import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  createPrayerJournalEntry,
  normalizePrayerJournalEntries,
  sortPrayerJournalEntries,
  type FastDayEntryKind,
  type PrayerJournalEntry,
} from "./prayer-journal";
import { NEWS_CACHE_KEY } from "./news";
import {
  getFastCalendarDays,
  parseStoredFasts,
  type PersonalFast,
} from "./prayercircle-fasting";
import { FASTS_STORAGE_KEY, JOURNAL_STORAGE_KEY } from "./prayercircle-storage";

/**
 * v410 — Journal/Fast Rework, Part 1 (Jonathan, Nov 1: "build the
 * rework in two parts"). The fast core: a fast day no longer holds
 * ONE note string — it holds any number of timestamped moments
 * (Held strong / Close call / Fell / Note), and those moments are
 * JOURNAL entries in the shared store (prayercircle.journal.v2),
 * one record that the Day Page writes and the Journal (Part 2)
 * will render. The old per-day strings (fast.dailyNotes) migrate
 * into that store as each day's first entry, word for word.
 *
 * This module is the model only: pure functions over the fast and
 * journal arrays, plus one storage runner the fast surfaces call
 * on load. Nothing here touches XP, hearts, levels or coins.
 */

export type { FastDayEntryKind };

export const FAST_DAY_ENTRY_KINDS: FastDayEntryKind[] = ["held", "close-call", "fell", "note"];

export const FAST_DAY_ENTRY_KIND_LABELS: Record<FastDayEntryKind, string> = {
  held: "Held strong",
  "close-call": "Close call",
  fell: "Fell",
  note: "Note",
};

export function isFastDayEntry(entry: PrayerJournalEntry): boolean {
  return Boolean(entry.fastDay);
}

/** The deterministic id of a day's migrated note entry — the
 *  migration's idempotence anchor: a day's note becomes an entry
 *  exactly once, however many times the migration runs. */
export function migratedFastDayEntryId(fastId: string, date: string): string {
  return `journal-fastday-note-${fastId}-${date}`;
}

/** One fast's entries (optionally one day's), in the day's own
 *  order — oldest first, the timeline order the Day Page reads.
 *  Ties (entries stamped in the same instant) break by id so the
 *  order is stable across loads. */
export function getFastDayEntries(
  entries: PrayerJournalEntry[],
  fastId: string,
  date?: string,
): PrayerJournalEntry[] {
  return entries
    .filter((entry) => entry.fastDay?.fastId === fastId && (date === undefined || entry.date === date))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

export function hasFastDayEntries(entries: PrayerJournalEntry[], fastId: string): boolean {
  return entries.some((entry) => entry.fastDay?.fastId === fastId);
}

/**
 * Append one moment to a fast day. The entry is stamped with the
 * moment it is logged (the caller passes `now`), carries the fast
 * linkage, and lands in the shared journal store through the
 * journal's own creation path — so it is a journal entry in every
 * respect, not a fast-side shadow of one. Empty text logs nothing.
 */
export function appendFastDayEntry(
  entries: PrayerJournalEntry[],
  input: { fastId: string; date: string; kind: FastDayEntryKind; text: string },
  now = new Date(),
): PrayerJournalEntry[] {
  const id = `journal-fastday-${input.fastId}-${now.getTime()}`;
  return createPrayerJournalEntry(
    entries,
    {
      body: input.text,
      date: input.date,
      fastDay: { fastId: input.fastId, kind: input.kind },
    },
    id,
    now,
  );
}

/**
 * The migration: every stored dailyNotes string becomes that day's
 * first journal entry (kind "note"), WORD FOR WORD — the string is
 * carried exactly as stored, hand-written timestamps and all; it
 * is never parsed, split or reworded. The fast records come back
 * WITHOUT the dailyNotes field: the journal is the one record now.
 *
 * Idempotent: a day whose migrated entry already exists is not
 * duplicated, and a fast with no dailyNotes is returned untouched.
 * Lossless: a note string with no words in it (whitespace only —
 * every reader already treated it as no note) is the only string
 * not carried, and it carries nothing to lose.
 */
export function migrateDailyNotesToJournalEntries(
  fasts: PersonalFast[],
  entries: PrayerJournalEntry[],
): { fasts: PersonalFast[]; entries: PrayerJournalEntry[]; changed: boolean } {
  const knownIds = new Set(entries.map((entry) => entry.id));
  const created: PrayerJournalEntry[] = [];
  let changed = false;
  const nextFasts = fasts.map((fast) => {
    if (!fast.dailyNotes) return fast;
    changed = true;
    for (const date of Object.keys(fast.dailyNotes).sort()) {
      const raw = fast.dailyNotes[date];
      if (typeof raw !== "string" || raw.trim().length === 0) continue;
      const id = migratedFastDayEntryId(fast.id, date);
      if (knownIds.has(id)) continue;
      knownIds.add(id);
      created.push({
        id,
        body: raw,
        date,
        taggedPeople: [],
        isBookmarked: false,
        replies: [],
        // The day's first entry: stamped at the day's start so it
        // leads the day's timeline, and flagged migrated — its
        // real clock time was never recorded.
        createdAt: `${date}T00:00:00.000Z`,
        updatedAt: `${date}T00:00:00.000Z`,
        fastDay: { fastId: fast.id, kind: "note", migrated: true },
      });
    }
    const { dailyNotes: _migrated, ...rest } = fast;
    return rest;
  });
  if (created.length > 0) changed = true;
  return {
    fasts: nextFasts,
    entries: created.length > 0 ? sortPrayerJournalEntries([...entries, ...created]) : entries,
    changed,
  };
}

/**
 * The day-notes read model the recaps and summaries quote from.
 * When the journal holds entries for this fast, THEY are the
 * truth (one entry's text per moment, the day's moments joined in
 * time order); the caller falls back to fast.dailyNotes only when
 * this returns null — a fast the migration has not reached yet,
 * which in practice means records in tests and old packs.
 */
export function fastDayNotesFromEntries(
  fast: PersonalFast,
  entries: PrayerJournalEntry[] | undefined,
): Record<string, string> | null {
  if (!entries || !hasFastDayEntries(entries, fast.id)) return null;
  const byDate: Record<string, string[]> = {};
  for (const entry of getFastDayEntries(entries, fast.id)) {
    const list = byDate[entry.date] ?? [];
    list.push(entry.body);
    byDate[entry.date] = list;
  }
  return Object.fromEntries(Object.entries(byDate).map(([date, texts]) => [date, texts.join("\n")]));
}

/** The notes map a recap should quote: journal entries when they
 *  exist for the fast, the legacy dailyNotes otherwise. */
export function resolveFastDayNotes(
  fast: PersonalFast,
  entries: PrayerJournalEntry[] | undefined,
): Record<string, string> {
  return fastDayNotesFromEntries(fast, entries) ?? fast.dailyNotes ?? {};
}

export type FastDayEntryKindCounts = {
  held: number;
  closeCall: number;
  fell: number;
  note: number;
  /** Close calls whose day ended kept (status "completed") — the
   *  encouragement stat: the call came, and the day still held. */
  closeCallsHeld: number;
  /** A fall inside the window, with a kept day somewhere after it
   *  in the fast — the fast went on. */
  fellFollowedByKept: boolean;
};

/** Kind counts over a set of dates (a week, or the whole fast) —
 *  the facts the recaps' encouragement lines are composed from.
 *  Counts only what the entries say; statuses come from the fast
 *  record, never inferred from the kinds. */
export function countFastDayEntryKinds(
  fast: PersonalFast,
  entries: PrayerJournalEntry[],
  dates: string[],
): FastDayEntryKindCounts {
  const inWindow = new Set(dates);
  const mine = getFastDayEntries(entries, fast.id).filter((entry) => inWindow.has(entry.date));
  const count = (kind: FastDayEntryKind) => mine.filter((entry) => entry.fastDay?.kind === kind).length;
  const fellDates = mine.filter((entry) => entry.fastDay?.kind === "fell").map((entry) => entry.date);
  const lastFell = fellDates.length > 0 ? fellDates[fellDates.length - 1] : null;
  return {
    held: count("held"),
    closeCall: count("close-call"),
    fell: count("fell"),
    note: count("note"),
    closeCallsHeld: mine.filter(
      (entry) => entry.fastDay?.kind === "close-call" && fast.dayStatuses[entry.date] === "completed",
    ).length,
    fellFollowedByKept:
      lastFell !== null &&
      getFastCalendarDays(fast).some((date) => date > lastFell && fast.dayStatuses[date] === "completed"),
  };
}

/**
 * The storage runner the fast surfaces call on load: read both
 * stores, run the migration, and — only when it changed something
 * — write both stores back, so the move happens exactly once and
 * every later reader sees the journal as the one record. Returns
 * the loaded (and migrated) arrays either way.
 */
export async function migrateFastDayEntriesInStorage(): Promise<{
  fasts: PersonalFast[];
  entries: PrayerJournalEntry[];
  changed: boolean;
}> {
  const [fastsRaw, journalRaw] = await Promise.all([
    AsyncStorage.getItem(FASTS_STORAGE_KEY),
    AsyncStorage.getItem(JOURNAL_STORAGE_KEY),
  ]);
  const fasts = parseStoredFasts(fastsRaw).fasts;
  let entries: PrayerJournalEntry[] = [];
  if (journalRaw) {
    try {
      entries = normalizePrayerJournalEntries(JSON.parse(journalRaw));
    } catch {
      entries = [];
    }
  }
  const result = migrateDailyNotesToJournalEntries(fasts, entries);
  if (result.changed) {
    await Promise.all([
      AsyncStorage.setItem(FASTS_STORAGE_KEY, JSON.stringify(result.fasts)),
      AsyncStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(result.entries)),
    ]);
  }
  return result;
}

/**
 * v431 — honest saves for the Day Page (Jonathan, Nov 4: "I start
 * with a fresh one, add a note, it shows it's saved, I restart the
 * app, and it's not there"). The page used to write both stores
 * fire-and-forget — `setItem(...).catch(() => undefined)` — on a
 * phone whose AsyncStorage sits at its ceiling, so a rejected
 * write was swallowed while the page showed the entry from memory
 * and cleared the draft like a save. The saves below never fake
 * it: the write is awaited, one failure earns a single retry after
 * the news cache (a regenerable snapshot, the loosest bytes in
 * the store) is cleared, and the outcome is always reported, so
 * the page can show only what was stored — and say so when
 * nothing was.
 */

/** The slice of AsyncStorage the honest saves run over, passed
 *  in so a test can play a full disk without mocking the module. */
export interface FastDayStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

export type FastDayLogResult =
  | { saved: true; entries: PrayerJournalEntry[] }
  | { saved: false; error: string };

export type FastDayPersistResult = { saved: true } | { saved: false; error: string };

function saveErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function writeWithRetry(
  storage: FastDayStorage,
  key: string,
  value: string,
): Promise<FastDayPersistResult> {
  try {
    await storage.setItem(key, value);
    return { saved: true };
  } catch {
    try {
      await storage.removeItem(NEWS_CACHE_KEY);
    } catch {
      // Freeing the space is best-effort; the retry goes ahead
      // either way, and its own outcome is what gets reported.
    }
    try {
      await storage.setItem(key, value);
      return { saved: true };
    } catch (error) {
      return { saved: false, error: saveErrorMessage(error) };
    }
  }
}

/**
 * Log one moment to a fast day, read-modify-write: the journal is
 * re-read fresh at log time and the entry appended to THAT list,
 * so a moment another surface stored since this page loaded is
 * never dropped by the page's stale in-memory copy. Success
 * returns the list exactly as written; failure stores nothing
 * and says why. A stored journal that cannot be read is never
 * written over — the log reports failure instead.
 */
export async function logFastDayEntryToStorage(
  storage: FastDayStorage,
  input: { fastId: string; date: string; kind: FastDayEntryKind; text: string },
  now = new Date(),
): Promise<FastDayLogResult> {
  let raw: string | null;
  try {
    raw = await storage.getItem(JOURNAL_STORAGE_KEY);
  } catch (error) {
    return { saved: false, error: saveErrorMessage(error) };
  }
  let stored: PrayerJournalEntry[] = [];
  if (raw) {
    try {
      stored = normalizePrayerJournalEntries(JSON.parse(raw));
    } catch {
      return {
        saved: false,
        error: "The stored journal couldn't be read, so nothing was written over it.",
      };
    }
  }
  const next = appendFastDayEntry(stored, input, now);
  if (next === stored) {
    // Nothing to log (empty text never becomes an entry) — the
    // stored list already stands as the truth.
    return { saved: true, entries: stored };
  }
  const write = await writeWithRetry(storage, JOURNAL_STORAGE_KEY, JSON.stringify(next));
  if (!write.saved) return write;
  return { saved: true, entries: next };
}

/**
 * Persist the fasts list (a day-status change) with the same
 * honesty as the journal log: the write is awaited, retried once
 * after the news cache is cleared, and the outcome is always
 * reported — so the caller can put the day back the way it was
 * when the write didn't land.
 */
export async function persistFastsToStorage(
  storage: FastDayStorage,
  fasts: PersonalFast[],
): Promise<FastDayPersistResult> {
  return writeWithRetry(storage, FASTS_STORAGE_KEY, JSON.stringify(fasts));
}
