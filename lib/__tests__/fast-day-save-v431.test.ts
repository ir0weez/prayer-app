/**
 * v431 — the Fast Day Page never fakes a save (Jonathan, Nov 4).
 *
 * The bug, in his words: "I start with a fresh one, add a note, it
 * shows it's saved, I restart the app, and it's not there." The Day
 * Page's logEntry wrote the journal fire-and-forget —
 * `setItem(...).catch(() => undefined)` — on a phone whose
 * AsyncStorage sits at its ceiling (~5.8MB stored). A rejected
 * write was swallowed, the entry showed from memory, the draft
 * cleared like a save, and the restart exposed that nothing had
 * ever been stored. persistFasts (day-status writes) swallowed the
 * same way.
 *
 * The pins:
 *   · a journal write that keeps rejecting (even after the
 *     news-cache clear + one retry) reports failure, stores
 *     nothing, and leaves no phantom entry behind;
 *   · the log is read-modify-write: an entry another surface wrote
 *     after this page loaded survives this page's log;
 *   · an unreadable stored journal is never written over;
 *   · the happy path is unchanged: appended once, readable back;
 *   · the fasts write gets the same honesty;
 *   · the page itself no longer writes either key directly, clears
 *     the draft only on a landed save, and reverts the fasts state
 *     when a status write fails.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  appendFastDayEntry,
  getFastDayEntries,
  logFastDayEntryToStorage,
  persistFastsToStorage,
  type FastDayStorage,
} from "../fast-day-entries";
import { NEWS_CACHE_KEY } from "../news";
import { normalizePrayerJournalEntries, type PrayerJournalEntry } from "../prayer-journal";
import { parseStoredFasts, type PersonalFast } from "../prayercircle-fasting";
import { FASTS_STORAGE_KEY, JOURNAL_STORAGE_KEY } from "../prayercircle-storage";

const ROOT = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

const FAST_ID = "fast-growth-365";
const DATE = "2026-11-04";
const NOW = new Date("2026-11-04T12:56:00.000Z");

function liveFast(): PersonalFast {
  return {
    id: FAST_ID,
    name: "365-Day Growth Fast",
    startDate: "2026-01-01",
    durationDays: 365,
    type: "Growth",
    focusItems: [],
    dayStatuses: { "2026-11-03": "completed" },
    createdAt: "2026-01-01T08:00:00.000Z",
  };
}

/** A storage double over a Map, with a hook that may throw on any
 *  setItem (keyed by that key's attempt number) to play a full disk. */
function makeStorageDouble(
  initial: Record<string, string> = {},
  onSetItem?: (key: string, attempt: number) => void,
) {
  const store = new Map<string, string>(Object.entries(initial));
  const attempts = new Map<string, number>();
  const removedKeys: string[] = [];
  const storage: FastDayStorage = {
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      const attempt = (attempts.get(key) ?? 0) + 1;
      attempts.set(key, attempt);
      onSetItem?.(key, attempt);
      store.set(key, value);
    },
    removeItem: async (key: string) => {
      removedKeys.push(key);
      store.delete(key);
    },
  };
  return { storage, store, attempts, removedKeys };
}

const FULL_DISK = new Error("database or disk is full");

/** The stored journal as it stands in the double, normalized. */
function storedEntries(store: Map<string, string>): PrayerJournalEntry[] {
  const raw = store.get(JOURNAL_STORAGE_KEY);
  return raw ? normalizePrayerJournalEntries(JSON.parse(raw)) : [];
}

function seedJournalJson(): string {
  const seeded = appendFastDayEntry(
    [],
    { fastId: FAST_ID, date: "2026-11-03", kind: "held", text: "Held yesterday." },
    new Date("2026-11-03T09:00:00.000Z"),
  );
  return JSON.stringify(seeded);
}

describe("v431 — a journal write that cannot land is reported, never faked", () => {
  it("reports failure, stores nothing, and leaves no phantom entry when the write keeps rejecting", async () => {
    const { storage, store, attempts, removedKeys } = makeStorageDouble(
      { [JOURNAL_STORAGE_KEY]: seedJournalJson(), [NEWS_CACHE_KEY]: "{\"items\":[]}" },
      (key) => {
        if (key === JOURNAL_STORAGE_KEY) throw FULL_DISK;
      },
    );

    const result = await logFastDayEntryToStorage(
      storage,
      { fastId: FAST_ID, date: DATE, kind: "note", text: "Testing" },
      NOW,
    );

    expect(result.saved).toBe(false);
    if (!result.saved) expect(result.error).toContain("database or disk is full");
    // One original attempt + exactly one retry after the cache clear.
    expect(attempts.get(JOURNAL_STORAGE_KEY)).toBe(2);
    expect(removedKeys).toContain(NEWS_CACHE_KEY);
    // The store still holds only the seed entry — no phantom "Testing".
    const stored = storedEntries(store);
    expect(stored).toHaveLength(1);
    expect(stored.some((entry) => entry.body === "Testing")).toBe(false);
  });

  it("lands on the retry once the news cache has been cleared", async () => {
    const { storage, store, removedKeys } = makeStorageDouble(
      { [JOURNAL_STORAGE_KEY]: seedJournalJson(), [NEWS_CACHE_KEY]: "{\"items\":[]}" },
      (key, attempt) => {
        if (key === JOURNAL_STORAGE_KEY && attempt === 1) throw FULL_DISK;
      },
    );

    const result = await logFastDayEntryToStorage(
      storage,
      { fastId: FAST_ID, date: DATE, kind: "note", text: "Testing" },
      NOW,
    );

    expect(result.saved).toBe(true);
    expect(removedKeys).toContain(NEWS_CACHE_KEY);
    expect(store.has(NEWS_CACHE_KEY)).toBe(false);
    if (result.saved) {
      const day = getFastDayEntries(result.entries, FAST_ID, DATE);
      expect(day.map((entry) => entry.body)).toEqual(["Testing"]);
    }
    expect(storedEntries(store).some((entry) => entry.body === "Testing")).toBe(true);
  });
});

describe("v431 — the log is read-modify-write against the stored journal", () => {
  it("preserves an entry another surface wrote after this page loaded", async () => {
    const { storage, store } = makeStorageDouble({ [JOURNAL_STORAGE_KEY]: seedJournalJson() });

    // Another surface appends to the stored journal after the page
    // loaded its (now stale) in-memory copy.
    const otherSurface = appendFastDayEntry(
      storedEntries(store),
      { fastId: FAST_ID, date: DATE, kind: "held", text: "Logged from the Journal." },
      new Date("2026-11-04T10:00:00.000Z"),
    );
    store.set(JOURNAL_STORAGE_KEY, JSON.stringify(otherSurface));

    const result = await logFastDayEntryToStorage(
      storage,
      { fastId: FAST_ID, date: DATE, kind: "note", text: "Testing" },
      NOW,
    );

    expect(result.saved).toBe(true);
    const bodies = storedEntries(store).map((entry) => entry.body);
    expect(bodies).toContain("Held yesterday.");
    expect(bodies).toContain("Logged from the Journal.");
    expect(bodies).toContain("Testing");
    if (result.saved) {
      expect(result.entries.map((entry) => entry.body)).toEqual(
        expect.arrayContaining(["Held yesterday.", "Logged from the Journal.", "Testing"]),
      );
    }
  });

  it("never writes over a stored journal it could not read", async () => {
    const { storage, store, attempts } = makeStorageDouble({
      [JOURNAL_STORAGE_KEY]: "{not json",
    });

    const result = await logFastDayEntryToStorage(
      storage,
      { fastId: FAST_ID, date: DATE, kind: "note", text: "Testing" },
      NOW,
    );

    expect(result.saved).toBe(false);
    expect(attempts.get(JOURNAL_STORAGE_KEY) ?? 0).toBe(0);
    expect(store.get(JOURNAL_STORAGE_KEY)).toBe("{not json");
  });

  it("happy path: appended exactly once and readable back", async () => {
    const { storage, store, removedKeys } = makeStorageDouble();

    const result = await logFastDayEntryToStorage(
      storage,
      { fastId: FAST_ID, date: DATE, kind: "held", text: "Held through the afternoon." },
      NOW,
    );

    expect(result.saved).toBe(true);
    expect(removedKeys).toHaveLength(0);
    if (result.saved) {
      const day = getFastDayEntries(result.entries, FAST_ID, DATE);
      expect(day).toHaveLength(1);
      expect(day[0].body).toBe("Held through the afternoon.");
      expect(day[0].fastDay).toEqual({ fastId: FAST_ID, kind: "held" });
    }
    const roundTripped = getFastDayEntries(storedEntries(store), FAST_ID, DATE);
    expect(roundTripped).toHaveLength(1);
    expect(roundTripped[0].body).toBe("Held through the afternoon.");
  });
});

describe("v431 — the fasts (day-status) write gets the same honesty", () => {
  it("reports failure when the fasts write keeps rejecting", async () => {
    const { storage, store, attempts, removedKeys } = makeStorageDouble(
      { [NEWS_CACHE_KEY]: "{\"items\":[]}" },
      (key) => {
        if (key === FASTS_STORAGE_KEY) throw FULL_DISK;
      },
    );

    const result = await persistFastsToStorage(storage, [liveFast()]);

    expect(result.saved).toBe(false);
    if (!result.saved) expect(result.error).toContain("database or disk is full");
    expect(attempts.get(FASTS_STORAGE_KEY)).toBe(2);
    expect(removedKeys).toContain(NEWS_CACHE_KEY);
    expect(store.has(FASTS_STORAGE_KEY)).toBe(false);
  });

  it("happy path: the fasts list is written and reads back", async () => {
    const { storage, store, removedKeys } = makeStorageDouble();

    const result = await persistFastsToStorage(storage, [liveFast()]);

    expect(result.saved).toBe(true);
    expect(removedKeys).toHaveLength(0);
    const parsed = parseStoredFasts(store.get(FASTS_STORAGE_KEY) ?? null);
    expect(parsed.fasts.map((fast) => fast.id)).toEqual([FAST_ID]);
  });
});

describe("v431 — the Day Page wiring", () => {
  const source = read("app/fast-day.tsx");

  it("no longer writes the journal or fasts keys directly (the honest helpers own both writes)", () => {
    expect(source).not.toContain("AsyncStorage.setItem(JOURNAL_STORAGE_KEY");
    expect(source).not.toContain("AsyncStorage.setItem(FASTS_STORAGE_KEY");
    expect(source).toContain("logFastDayEntryToStorage");
    expect(source).toContain("persistFastsToStorage");
  });

  it("clears the draft only after the save lands, and keeps it (with an alert) when it doesn't", () => {
    const logStart = source.indexOf("const logEntry");
    const segment = source.slice(logStart, logStart + 1500);
    expect(segment).toContain("result.saved");
    expect(segment.indexOf("result.saved")).toBeLessThan(segment.indexOf("setDraft(\"\")"));
    expect(segment).toContain("Alert.alert");
  });

  it("reverts the fasts state and alerts when a day-status write fails", () => {
    const persistStart = source.indexOf("const persistFasts");
    const segment = source.slice(persistStart, persistStart + 1200);
    expect(segment).toContain("setFasts(previousFasts)");
    expect(segment).toContain("Alert.alert");
  });
});
