/**
 * v554 — the read line (his Nov 21 ask: "When you complete a
 * chapter (reading) can it show up in the journal somehow?").
 * Dress: the approved drawing journal-read-lines-v3.html, touches
 * A + C combined — one gilt-seal group per day, each line's icon
 * and chapter name in that book's deep ROYGBIV colour.
 *
 * Pins:
 *  (a) the "read" kind + its payload round-trip the entry
 *      normalizer, and a wordless read entry survives it — ONLY
 *      on its payload: a mangled payload drops the entry;
 *  (b) addReadJournalEntry — one line per book+chapter, ever,
 *      filed under the READ's date; a second call (any date)
 *      changes nothing: the first line and its date stand;
 *  (c) the door — markChapterRead's first-ever mark mints the
 *      line through storage (dated by the read stamp itself);
 *      un-marking keeps the line (the answered rule); a re-mark
 *      after un-marking never stacks a second line; other
 *      journal entries survive the write; a corrupt stored
 *      journal is never written over and never breaks the mark;
 *  (d) the studio-import read path (applyStudioStatesReads)
 *      mints NOTHING — imports never come through the door;
 *  (e) the feed — a day's reads collapse into ONE readGroup
 *      item, its lines in canon order (book, then chapter),
 *      whatever order they were marked in; read entries count
 *      in the day's post count;
 *  (f) dress pins (source) — the kind post carries the seal
 *      group (gold seal, READING label, book-colour derivation),
 *      the standalone seat renders a group of one, the tab
 *      renders the readGroup item.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      store.delete(k);
    }),
    clear: vi.fn(async () => {
      store.clear();
    }),
  },
}));

import { markChapterRead, unmarkChapterRead } from "../bible-v205/rewards";
import { chapterReadDate, saveStudyState, seedStudyState, type StudyState } from "../bible-v205/study";
import { applyStudioStatesReads } from "../bible-v205/studio-states";
import { deskEntryFormat, deskFeedItems, postsTodayCount } from "../journal-desk";
import {
  addReadJournalEntry,
  createPrayerJournalEntry,
  formatReadLine,
  normalizePrayerJournalEntries,
  readJournalId,
  type PrayerJournalEntry,
} from "../prayer-journal";
import { JOURNAL_STORAGE_KEY } from "../prayercircle-storage";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

const NOW = new Date("2026-11-21T09:00:00.000Z");
const READ_DATE = "2026-11-21";

function storedJournal(): PrayerJournalEntry[] {
  const raw = store.get(JOURNAL_STORAGE_KEY);
  return raw ? normalizePrayerJournalEntries(JSON.parse(raw)) : [];
}

beforeEach(() => {
  store.clear();
});

describe("the read kind and its payload", () => {
  it("round-trips the normalizer — kind, payload, wordless body", () => {
    const entries = addReadJournalEntry([], "2 Kings", 17, READ_DATE, NOW);
    expect(entries).toHaveLength(1);
    const revived = normalizePrayerJournalEntries(JSON.parse(JSON.stringify(entries)));
    expect(revived).toHaveLength(1);
    expect(revived[0].kind).toBe("read");
    expect(revived[0].read).toEqual({ book: "2 Kings", chapter: 17 });
    expect(revived[0].body).toBe("");
    expect(revived[0].date).toBe(READ_DATE);
  });

  it("survives on its payload alone — and only on it", () => {
    const base = {
      id: "journal-read-Psalms-19",
      body: "",
      kind: "read",
      date: READ_DATE,
      taggedPeople: [],
      isBookmarked: false,
      replies: [],
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    };
    const good = normalizePrayerJournalEntries([{ ...base, read: { book: "Psalms", chapter: 19 } }]);
    expect(good).toHaveLength(1);
    // A mangled payload leaves nothing to render — the entry drops.
    expect(normalizePrayerJournalEntries([{ ...base, read: { book: "", chapter: 0 } }])).toHaveLength(0);
    expect(normalizePrayerJournalEntries([{ ...base }])).toHaveLength(0);
    // An unknown kind degrades to nothing wordless, as always.
    expect(normalizePrayerJournalEntries([{ ...base, kind: "readx", read: { book: "Psalms", chapter: 19 } }])).toHaveLength(0);
  });

  it("names the line whole", () => {
    expect(readJournalId("2 Kings", 17)).toBe("journal-read-2 Kings-17");
    expect(formatReadLine("2 Kings", 17)).toBe("Read 2 Kings 17");
    expect(formatReadLine("1 Corinthians", 1)).toBe("Read 1 Corinthians 1");
  });
});

describe("addReadJournalEntry — one line per chapter, ever", () => {
  it("creates the line under the read's date, with no words", () => {
    const entries = addReadJournalEntry([], "1 Corinthians", 1, READ_DATE, NOW);
    expect(entries).toHaveLength(1);
    const [entry] = entries;
    expect(entry.id).toBe("journal-read-1 Corinthians-1");
    expect(entry.kind).toBe("read");
    expect(entry.read).toEqual({ book: "1 Corinthians", chapter: 1 });
    expect(entry.date).toBe(READ_DATE);
    expect(entry.body).toBe("");
    expect(entry.taggedPeople).toEqual([]);
  });

  it("a second call changes nothing — the first line and its date stand", () => {
    const once = addReadJournalEntry([], "2 Kings", 17, READ_DATE, NOW);
    const twice = addReadJournalEntry(once, "2 Kings", 17, "2026-12-25", new Date("2026-12-25T09:00:00.000Z"));
    expect(twice).toBe(once);
    expect(twice[0].date).toBe(READ_DATE);
  });

  it("different chapters mint different lines", () => {
    let entries = addReadJournalEntry([], "2 Kings", 17, READ_DATE, NOW);
    entries = addReadJournalEntry(entries, "2 Kings", 18, READ_DATE, NOW);
    entries = addReadJournalEntry(entries, "Psalms", 19, READ_DATE, NOW);
    expect(entries.map((entry) => entry.id).sort()).toEqual([
      "journal-read-2 Kings-17",
      "journal-read-2 Kings-18",
      "journal-read-Psalms-19",
    ]);
  });
});

describe("the read door — markChapterRead mints the line", () => {
  it("a first mark writes exactly one line, dated by the read stamp itself", async () => {
    const state = seedStudyState();
    const result = await markChapterRead(state, "2 Kings", 17);
    const stamped = chapterReadDate(result.state, "2 Kings", 17);
    expect(stamped).not.toBeNull();
    const journal = storedJournal();
    expect(journal).toHaveLength(1);
    expect(journal[0].kind).toBe("read");
    expect(journal[0].read).toEqual({ book: "2 Kings", chapter: 17 });
    expect(journal[0].date).toBe(stamped);
  });

  it("un-marking keeps the line; re-marking never stacks a second", async () => {
    let state: StudyState = seedStudyState();
    state = (await markChapterRead(state, "2 Kings", 17)).state;
    const firstDate = storedJournal()[0].date;

    state = await unmarkChapterRead(state, "2 Kings", 17);
    expect(chapterReadDate(state, "2 Kings", 17)).toBeNull();
    expect(storedJournal()).toHaveLength(1);

    state = (await markChapterRead(state, "2 Kings", 17)).state;
    const journal = storedJournal();
    expect(journal).toHaveLength(1);
    expect(journal[0].date).toBe(firstDate);
  });

  it("a second chapter the same day adds its own line, and his other entries survive", async () => {
    const existing = addReadJournalEntry([], "Psalms", 19, "2026-11-20", NOW);
    const withMoment = createPrayerJournalEntry(existing, { body: "A quiet morning." }, "journal-moment-1", NOW);
    store.set(JOURNAL_STORAGE_KEY, JSON.stringify(withMoment));

    let state: StudyState = seedStudyState();
    state = (await markChapterRead(state, "2 Kings", 17)).state;
    state = (await markChapterRead(state, "2 Kings", 18)).state;

    const journal = storedJournal();
    expect(journal.filter((entry) => entry.kind === "read" && entry.read?.book === "2 Kings")).toHaveLength(2);
    expect(journal.some((entry) => entry.id === "journal-moment-1")).toBe(true);
    expect(journal.some((entry) => entry.id === "journal-read-Psalms-19")).toBe(true);
  });

  it("a corrupt stored journal is never written over, and the mark still lands", async () => {
    store.set(JOURNAL_STORAGE_KEY, "{not json");
    const state = seedStudyState();
    const result = await markChapterRead(state, "2 Kings", 17);
    expect(chapterReadDate(result.state, "2 Kings", 17)).not.toBeNull();
    expect(store.get(JOURNAL_STORAGE_KEY)).toBe("{not json");
  });

  it("the studio-import read path mints nothing", async () => {
    const seeded = seedStudyState();
    const applied = applyStudioStatesReads(seeded, [
      { book: "2 Kings", chapter: 17, notesState: null, readDate: "2026-11-01" },
    ]);
    expect(applied.applied).toBe(1);
    await saveStudyState(applied.state);
    expect(store.has(JOURNAL_STORAGE_KEY)).toBe(false);
  });
});

describe("the Desk feed — one seal group per day, canon order inside", () => {
  function dayWithReads(): PrayerJournalEntry[] {
    // Marked in scrambled order across the day: Psalms first,
    // then 2 Kings 18, then 2 Kings 17.
    let entries: PrayerJournalEntry[] = [];
    entries = addReadJournalEntry(entries, "Psalms", 19, READ_DATE, new Date("2026-11-21T08:00:00.000Z"));
    entries = addReadJournalEntry(entries, "2 Kings", 18, READ_DATE, new Date("2026-11-21T20:00:00.000Z"));
    entries = addReadJournalEntry(entries, "2 Kings", 17, READ_DATE, new Date("2026-11-21T21:00:00.000Z"));
    return entries;
  }

  it("deskEntryFormat names the read format", () => {
    const [entry] = addReadJournalEntry([], "2 Kings", 17, READ_DATE, NOW);
    expect(deskEntryFormat(entry)).toBe("read");
  });

  it("collapses the day's reads into ONE group, lines in canon order", () => {
    const items = deskFeedItems(dayWithReads(), [], READ_DATE);
    const groups = items.filter((item) => item.type === "readGroup");
    expect(groups).toHaveLength(1);
    const group = groups[0];
    if (group.type !== "readGroup") throw new Error("expected a readGroup");
    expect(group.entries.map((entry) => `${entry.read?.book} ${entry.read?.chapter}`)).toEqual([
      "2 Kings 17",
      "2 Kings 18",
      "Psalms 19",
    ]);
    // No read entry also stands as a scattered post.
    expect(items.some((item) => item.type === "post" && item.entry.kind === "read")).toBe(false);
  });

  it("read entries count in the day's post count", () => {
    expect(postsTodayCount(dayWithReads(), READ_DATE)).toBe(3);
  });
});

describe("dress pins — the seal group, ported from the drawing", () => {
  const kindPost = read("components/journal-kind-post.tsx");
  const tab = read("components/prayer-journal-tab.tsx");

  it("the kind post carries ReadLinesGroup: gold seal, READING label, book glyph", () => {
    expect(kindPost).toContain("export function ReadLinesGroup");
    expect(kindPost).toContain('name="menu-book"');
    expect(kindPost).toContain("READING");
    expect(kindPost).toContain("backgroundColor: jm.gold");
    expect(kindPost).toContain("color: jm.goldDeep");
  });

  it("each line's colour derives from the book's ROYGBIV set, never a pinned hex", () => {
    expect(kindPost).toContain("bookColorsFor(read.book, jm.isDark)");
    expect(kindPost).not.toContain("#b35f14");
    expect(kindPost).not.toContain("#c9a227");
  });

  it("the standalone seat renders a group of one; the tab renders the day's group", () => {
    expect(kindPost).toContain('format === "read" && entry.read');
    expect(kindPost).toContain("entries={[entry]}");
    expect(tab).toContain('case "readGroup"');
    expect(tab).toContain("<ReadLinesGroup");
  });
});
