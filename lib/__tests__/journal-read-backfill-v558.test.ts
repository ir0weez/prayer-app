/**
 * v558 — the read backfill (his Nov 24 ruling: backfill the
 * whole history). v554's door minted Journal read lines only
 * for chapters marked from that build on; every earlier read
 * stood in the study store's read track with no line. The
 * reconcile — the v452 ensure pattern over the reads record —
 * fills them all, each on its SAVED day.
 *
 * Pins:
 *  (a) a pre-v554 read history yields one line per chapter,
 *      filed under the read's own saved date (never today),
 *      with the v554 kind + payload;
 *  (b) a line the v554 door already minted is left untouched —
 *      the same entry object, its first date standing even if
 *      the record were to say otherwise;
 *  (c) NO pruning (the answered rule, not the reached rule):
 *      a read that leaves the record — an un-mark — keeps its
 *      backfilled line, and the reconcile over the shrunken
 *      record changes nothing;
 *  (d) idempotent and cheap: a second reconcile over a settled
 *      journal returns the SAME array; an empty record and an
 *      empty journal are no-ops by reference;
 *  (e) a mangled record mints nothing — unparseable keys and
 *      non-ISO dates are skipped, never filed under today;
 *  (f) the feed: a backfilled multi-chapter day still collapses
 *      into ONE readGroup with its lines in canon order;
 *  (g) the shell wires the reconcile over the read track the
 *      stamps way — state held in the shell, re-read on focus.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { clearChapterRead, seedStudyState, setChapterRead, type StudyState } from "../bible-v205/study";
import { deskFeedItems } from "../journal-desk";
import {
  addReadJournalEntry,
  createPrayerJournalEntry,
  reconcileReadJournalEntries,
  type PrayerJournalEntry,
} from "../prayer-journal";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

const NOW = new Date("2026-11-24T12:00:00.000Z");

/** A standing pre-v554 history, built the way the store holds
 *  it: reads stamped across the autumn, Genesis onward. */
function historyState(): StudyState {
  let state = seedStudyState();
  state = setChapterRead(state, "Genesis", 1, "2026-09-02");
  state = setChapterRead(state, "Genesis", 2, "2026-09-02");
  state = setChapterRead(state, "Genesis", 3, "2026-09-03");
  state = setChapterRead(state, "Exodus", 1, "2026-09-05");
  state = setChapterRead(state, "2 Kings", 17, "2026-11-21");
  state = setChapterRead(state, "2 Kings", 18, "2026-11-21");
  return state;
}

describe("v558 (a) — the backfill: every standing read has its line, on its saved day", () => {
  it("mints one line per chapter in the history, each under its own date", () => {
    const result = reconcileReadJournalEntries([], historyState().reads, NOW);
    expect(result).toHaveLength(6);
    const byId = new Map(result.map((entry) => [entry.id, entry]));
    expect(byId.get("journal-read-Genesis-1")?.date).toBe("2026-09-02");
    expect(byId.get("journal-read-Genesis-2")?.date).toBe("2026-09-02");
    expect(byId.get("journal-read-Genesis-3")?.date).toBe("2026-09-03");
    expect(byId.get("journal-read-Exodus-1")?.date).toBe("2026-09-05");
    expect(byId.get("journal-read-2 Kings-17")?.date).toBe("2026-11-21");
    expect(byId.get("journal-read-2 Kings-18")?.date).toBe("2026-11-21");
    // Nothing is filed under the reconcile's own day.
    expect(result.some((entry) => entry.date === "2026-11-24")).toBe(false);
  });

  it("the minted lines carry the v554 shape — kind, payload, no words", () => {
    const result = reconcileReadJournalEntries([], historyState().reads, NOW);
    for (const entry of result) {
      expect(entry.kind).toBe("read");
      expect(entry.body).toBe("");
      expect(entry.read?.book).toBeTruthy();
      expect(entry.read?.chapter).toBeGreaterThanOrEqual(1);
    }
    expect(result.find((entry) => entry.id === "journal-read-2 Kings-17")?.read).toEqual({
      book: "2 Kings",
      chapter: 17,
    });
  });

  it("his other journal entries survive the backfill untouched", () => {
    const moment = createPrayerJournalEntry([], { body: "A quiet morning." }, "journal-moment-1", NOW);
    const result = reconcileReadJournalEntries(moment, historyState().reads, NOW);
    expect(result).toHaveLength(7);
    expect(result.find((entry) => entry.id === "journal-moment-1")).toBe(moment[0]);
  });
});

describe("v558 (b) — lines the v554 door already minted stand untouched", () => {
  it("the existing entry object and its first date survive; only the missing lines are added", () => {
    const door = addReadJournalEntry([], "2 Kings", 17, "2026-11-21", new Date("2026-11-21T21:00:00.000Z"));
    const doorEntry = door[0];
    const result = reconcileReadJournalEntries(door, historyState().reads, NOW);
    expect(result).toHaveLength(6);
    expect(result.find((entry) => entry.id === "journal-read-2 Kings-17")).toBe(doorEntry);
    expect(result.find((entry) => entry.id === "journal-read-2 Kings-17")?.date).toBe("2026-11-21");
  });

  it("first-mark-wins: a record date that disagrees never moves the door's line", () => {
    const door = addReadJournalEntry([], "Genesis", 1, "2026-09-02", NOW);
    const result = reconcileReadJournalEntries(door, { "Genesis|1": "2026-12-25" }, NOW);
    expect(result).toBe(door);
    expect(result[0].date).toBe("2026-09-02");
  });
});

describe("v558 (c) — no pruning: an un-mark keeps its backfilled line", () => {
  it("a read that leaves the record keeps its line; the shrunken record changes nothing", () => {
    const state = historyState();
    const filled = reconcileReadJournalEntries([], state.reads, NOW);
    expect(filled).toHaveLength(6);

    const unmarked = clearChapterRead(state, "Genesis", 1);
    expect(unmarked.reads["Genesis|1"]).toBeUndefined();
    const after = reconcileReadJournalEntries(filled, unmarked.reads, NOW);
    expect(after).toBe(filled);
    expect(after.some((entry) => entry.id === "journal-read-Genesis-1")).toBe(true);
  });

  it("an empty record prunes nothing — every backfilled line stands", () => {
    const filled = reconcileReadJournalEntries([], historyState().reads, NOW);
    const after = reconcileReadJournalEntries(filled, {}, NOW);
    expect(after).toBe(filled);
    expect(after.filter((entry) => entry.kind === "read")).toHaveLength(6);
  });
});

describe("v558 (d) — idempotent: a settled journal returns by reference", () => {
  it("the second reconcile is a no-op — the same array comes back", () => {
    const reads = historyState().reads;
    const first = reconcileReadJournalEntries([], reads, NOW);
    const second = reconcileReadJournalEntries(first, reads, new Date("2026-11-25T09:00:00.000Z"));
    expect(second).toBe(first);
  });

  it("empty in, empty out — by reference both ways", () => {
    const empty: PrayerJournalEntry[] = [];
    expect(reconcileReadJournalEntries(empty, {}, NOW)).toBe(empty);
    const moment = createPrayerJournalEntry([], { body: "A quiet morning." }, "journal-moment-1", NOW);
    expect(reconcileReadJournalEntries(moment, {}, NOW)).toBe(moment);
  });

  it("a later read joins on the next reconcile — and only that one is new", () => {
    const state = historyState();
    const first = reconcileReadJournalEntries([], state.reads, NOW);
    const grown = setChapterRead(state, "Psalms", 19, "2026-11-23");
    const second = reconcileReadJournalEntries(first, grown.reads, NOW);
    expect(second).toHaveLength(7);
    expect(second.find((entry) => entry.id === "journal-read-Psalms-19")?.date).toBe("2026-11-23");
    for (const entry of first) {
      expect(second.find((candidate) => candidate.id === entry.id)).toBe(entry);
    }
  });
});

describe("v558 (e) — a mangled record mints nothing", () => {
  it("unparseable keys and non-ISO dates are skipped, never filed under today", () => {
    const mangled: Record<string, string> = {
      "Genesis|1": "2026-09-02",
      "no-separator": "2026-09-02",
      "|3": "2026-09-02",
      "Exodus|0": "2026-09-05",
      "Exodus|x": "2026-09-05",
      "Exodus|2": "sometime in September",
      "Exodus|3": "",
    };
    const result = reconcileReadJournalEntries([], mangled, NOW);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("journal-read-Genesis-1");
    expect(result[0].date).toBe("2026-09-02");
  });
});

describe("v558 (f) — the feed: a backfilled day is one seal group, canon order inside", () => {
  it("the day's backfilled reads collapse into ONE readGroup, books and chapters in canon order", () => {
    // The record's own order is scrambled (2 Kings entered
    // before Genesis would be, chapters upside down) — the
    // feed's canon sort, not mint order, decides the lines.
    const reads: Record<string, string> = {
      "Psalms|19": "2026-11-21",
      "2 Kings|18": "2026-11-21",
      "2 Kings|17": "2026-11-21",
    };
    const filled = reconcileReadJournalEntries([], reads, NOW);
    const items = deskFeedItems(filled, [], "2026-11-21");
    const groups = items.filter((item) => item.type === "readGroup");
    expect(groups).toHaveLength(1);
    const group = groups[0];
    if (group.type !== "readGroup") throw new Error("expected a readGroup");
    expect(group.entries.map((entry) => `${entry.read?.book} ${entry.read?.chapter}`)).toEqual([
      "2 Kings 17",
      "2 Kings 18",
      "Psalms 19",
    ]);
  });
});

describe("v558 (g) — the shell wires the reconcile over the record", () => {
  const shell = read("app/(tabs)/index.tsx");

  it("the shell reconciles the journal against the read track", () => {
    expect(shell).toContain("reconcileReadJournalEntries");
    expect(shell).toContain("reconcileReadJournalEntries(journal, studyReads)");
  });

  it("the read track is held in state and re-read from the study store on focus", () => {
    expect(shell).toContain("useState<Record<string, string>>");
    expect(shell).toContain("AsyncStorage.getItem(STUDY_KEY)");
    expect(shell).toContain("normalizeReads");
  });
});
