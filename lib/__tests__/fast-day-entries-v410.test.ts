/**
 * v410 — Journal/Fast Rework, Part 1 (the fast core).
 *
 * Jonathan's rulings behind these pins (Nov 1): a fast day holds
 * multiple timestamped moments, not one note ("Sometimes it's
 * nice to track your falls and triumphs"); the pop-up day sheet
 * is gone ("I hate these little pop-up cards") — the Day Page
 * replaces it; his existing day notes become each day's first
 * entry WORD FOR WORD; the recaps keep being fed from the same
 * truth and learn the kind counts ("close calls held" is the
 * encouragement stat he asked for).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  appendFastDayEntry,
  countFastDayEntryKinds,
  fastDayNotesFromEntries,
  getFastDayEntries,
  migrateDailyNotesToJournalEntries,
  migratedFastDayEntryId,
  resolveFastDayNotes,
} from "../fast-day-entries";
import {
  composeFinalRecap,
  composeWeeklyRecap,
  getFastNoteStream,
  getFastRecapWeeks,
} from "../fast-tracker";
import { normalizePrayerJournalEntries, type PrayerJournalEntry } from "../prayer-journal";
import {
  getFastCalendarDays,
  parseStoredFasts,
  type PersonalFast,
} from "../prayercircle-fasting";
import { FASTS_STORAGE_KEY, JOURNAL_STORAGE_KEY } from "../prayercircle-storage";

const ROOT = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

// His real Day 305 note, in his own hand — the migration's test
// case: one stored string holding an opening line and a
// hand-appended "[3:16pm]" continuation. It moves as ONE entry,
// exactly as stored; the timestamps inside it are his words, not
// structure to parse.
const DAY_305_NOTE =
  "A few close calls, but no issues so far. Holding strong, and hoping to finish the day strong.\n\n[3:16pm] Almost miffed it again... Held strong though. Thinking through other strategies...";

function liveFast(): PersonalFast {
  return {
    id: "fast-growth-365",
    name: "365-Day Growth Fast",
    startDate: "2026-01-01",
    durationDays: 365,
    type: "Growth",
    focusItems: [],
    dayStatuses: { "2026-10-31": "completed", "2026-11-01": "completed" },
    dailyNotes: {
      "2026-10-31": "Kept. Nothing dramatic — which is its own kind of mercy.",
      "2026-11-01": DAY_305_NOTE,
    },
    createdAt: "2026-01-01T08:00:00.000Z",
  };
}

describe("v410 migration — dailyNotes become journal entries, word for word", () => {
  it("moves each day's string to a note entry carrying the text exactly as stored", () => {
    const fast = liveFast();
    const result = migrateDailyNotesToJournalEntries([fast], []);
    expect(result.changed).toBe(true);
    expect(result.entries).toHaveLength(2);

    const day305 = result.entries.find((entry) => entry.date === "2026-11-01");
    expect(day305).toBeDefined();
    expect(day305!.body).toBe(DAY_305_NOTE);
    expect(day305!.id).toBe(migratedFastDayEntryId(fast.id, "2026-11-01"));
    expect(day305!.fastDay).toEqual({ fastId: fast.id, kind: "note", migrated: true });
    expect(day305!.taggedPeople).toEqual([]);
    expect(day305!.replies).toEqual([]);

    // The fast record comes back without the moved field; every
    // other part of the record is untouched.
    expect(result.fasts[0].dailyNotes).toBeUndefined();
    expect(result.fasts[0].dayStatuses).toEqual(fast.dayStatuses);
    expect(result.fasts[0].name).toBe(fast.name);
    expect(result.fasts[0].startDate).toBe(fast.startDate);
  });

  it("is idempotent — a second run changes nothing and duplicates nothing", () => {
    const first = migrateDailyNotesToJournalEntries([liveFast()], []);
    const second = migrateDailyNotesToJournalEntries(first.fasts, first.entries);
    expect(second.changed).toBe(false);
    expect(second.entries).toHaveLength(first.entries.length);
    expect(second.entries.map((entry) => entry.id)).toEqual(first.entries.map((entry) => entry.id));

    // Even against a fast record that still carries the strings
    // (a stale copy), the standing entry id prevents a duplicate.
    const third = migrateDailyNotesToJournalEntries([liveFast()], first.entries);
    expect(third.entries).toHaveLength(first.entries.length);
    expect(third.fasts[0].dailyNotes).toBeUndefined();
  });

  it("the migrated entry is the day's FIRST entry, and the live fast's Day 305 is 2026-11-01", () => {
    const fast = liveFast();
    const days = getFastCalendarDays(fast);
    expect(days[304]).toBe("2026-11-01");
    const { entries } = migrateDailyNotesToJournalEntries([fast], []);
    const withLater = appendFastDayEntry(
      entries,
      { fastId: fast.id, date: "2026-11-01", kind: "held", text: "Still holding." },
      new Date("2026-11-01T15:24:00.000Z"),
    );
    const day = getFastDayEntries(withLater, fast.id, "2026-11-01");
    expect(day).toHaveLength(2);
    expect(day[0].fastDay?.migrated).toBe(true);
    expect(day[0].body).toBe(DAY_305_NOTE);
    expect(day[1].fastDay?.kind).toBe("held");
  });

  it("a fast with no notes is returned untouched", () => {
    const fast = liveFast();
    delete fast.dailyNotes;
    const result = migrateDailyNotesToJournalEntries([fast], []);
    expect(result.changed).toBe(false);
    expect(result.fasts[0]).toBe(fast);
    expect(result.entries).toHaveLength(0);
  });
});

describe("v410 entries — append and time order", () => {
  it("appends timestamped moments and reads them back oldest first", () => {
    const fastId = "fast-growth-365";
    let entries: PrayerJournalEntry[] = [];
    entries = appendFastDayEntry(entries, { fastId, date: "2026-11-01", kind: "note", text: "A few close calls, but no issues so far." }, new Date("2026-11-01T09:02:00.000Z"));
    entries = appendFastDayEntry(entries, { fastId, date: "2026-11-01", kind: "close-call", text: "Almost miffed it again... Held strong though." }, new Date("2026-11-01T15:16:00.000Z"));
    entries = appendFastDayEntry(entries, { fastId, date: "2026-11-01", kind: "held", text: "Still holding. Dinner plan is set." }, new Date("2026-11-01T15:24:00.000Z"));
    entries = appendFastDayEntry(entries, { fastId: "fast-other", date: "2026-11-01", kind: "fell", text: "Not this fast's moment." }, new Date("2026-11-01T16:00:00.000Z"));

    const day = getFastDayEntries(entries, fastId, "2026-11-01");
    expect(day.map((entry) => entry.fastDay?.kind)).toEqual(["note", "close-call", "held"]);
    expect(day.map((entry) => entry.createdAt)).toEqual([
      "2026-11-01T09:02:00.000Z",
      "2026-11-01T15:16:00.000Z",
      "2026-11-01T15:24:00.000Z",
    ]);
    expect(day[1].body).toBe("Almost miffed it again... Held strong though.");
    expect(day[1].date).toBe("2026-11-01");
  });

  it("empty text logs nothing", () => {
    const entries = appendFastDayEntry(
      [],
      { fastId: "fast-growth-365", date: "2026-11-01", kind: "note", text: "   " },
      new Date("2026-11-01T09:02:00.000Z"),
    );
    expect(entries).toHaveLength(0);
  });

  it("the note stream reads moments from the entries, newest first", () => {
    const fast = liveFast();
    const { entries } = migrateDailyNotesToJournalEntries([fast], []);
    const stream = getFastNoteStream(fast, 3, entries);
    expect(stream[0].date).toBe("2026-11-01");
    expect(stream[0].note).toBe(DAY_305_NOTE);
    expect(stream[0].dayNumber).toBe(305);
  });
});

function recapFast(): PersonalFast {
  // A fast inside the Sun–Sat week of Oct 25–31, 2026, every day
  // kept — with four close calls logged across it and one fall
  // that the following day answered.
  return {
    id: "fast-recap",
    name: "365-Day Growth Fast",
    startDate: "2026-10-25",
    durationDays: 14,
    type: "Growth",
    focusItems: [],
    dayStatuses: Object.fromEntries(
      ["2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31"].map(
        (date) => [date, "completed" as const],
      ),
    ),
    createdAt: "2026-10-25T08:00:00.000Z",
  };
}

function recapEntries(fastId: string): PrayerJournalEntry[] {
  let entries: PrayerJournalEntry[] = [];
  const log = (date: string, kind: "close-call" | "fell" | "held", text: string, time: string) => {
    entries = appendFastDayEntry(entries, { fastId, date, kind, text }, new Date(`${date}T${time}`));
  };
  log("2026-10-26", "close-call", "Candy in the break room. Walked past.", "15:16:00.000Z");
  log("2026-10-27", "close-call", "Almost slipped at lunch.", "12:05:00.000Z");
  log("2026-10-27", "fell", "Gave in at dinner.", "19:40:00.000Z");
  log("2026-10-28", "close-call", "Hard evening. Held.", "20:15:00.000Z");
  log("2026-10-29", "close-call", "One more close one. Held.", "21:00:00.000Z");
  return entries;
}

describe("v410 recaps — kind counts become encouragement lines", () => {
  it("counts the kinds and the held close calls from the entries alone", () => {
    const fast = recapFast();
    const entries = recapEntries(fast.id);
    const dates = ["2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31"];
    const counts = countFastDayEntryKinds(fast, entries, dates);
    expect(counts.closeCall).toBe(4);
    expect(counts.closeCallsHeld).toBe(4);
    expect(counts.fell).toBe(1);
    expect(counts.fellFollowedByKept).toBe(true);
  });

  it("the weekly recap says the close calls were held — every one", () => {
    const fast = recapFast();
    const entries = recapEntries(fast.id);
    const week = getFastRecapWeeks(fast, "2026-11-05").find((w) => w.startDate === "2026-10-25");
    expect(week).toBeDefined();
    const recap = composeWeeklyRecap(fast, week!, { entries });
    expect(recap.paragraphs.join("\n")).toContain("Four close calls this week — held every one.");
    expect(recap.encouragement.paragraphs.join(" ")).toContain("One fall in the record — and the fast went on.");
    const highs = recap.blocks.find((block) => block.title === "Highs");
    expect(highs).toBeDefined();
    expect(JSON.stringify(highs)).toContain("held every one");
  });

  it("a close call on an unkept day is counted, never claimed as held", () => {
    const fast = recapFast();
    fast.dayStatuses["2026-10-29"] = "missed";
    const entries = recapEntries(fast.id);
    const week = getFastRecapWeeks(fast, "2026-11-05").find((w) => w.startDate === "2026-10-25");
    const recap = composeWeeklyRecap(fast, week!, { entries });
    expect(recap.paragraphs.join("\n")).toContain("three of them held");
    expect(recap.paragraphs.join("\n")).not.toContain("held every one");
  });

  it("the final recap carries the same lines across the fast", () => {
    const fast = recapFast();
    const entries = recapEntries(fast.id);
    const recap = composeFinalRecap(fast, entries);
    expect(recap.paragraphs.join("\n")).toContain("Four close calls across the fast — held every one.");
    expect(recap.blocks.some((block) => block.title === "Held, in moments")).toBe(true);
  });

  it("without entries, the recaps quote the record's notes exactly as before", () => {
    const fast = recapFast();
    fast.dailyNotes = { "2026-10-26": "Kept. A quiet, steady day." };
    const week = getFastRecapWeeks(fast, "2026-11-05").find((w) => w.startDate === "2026-10-25");
    const recap = composeWeeklyRecap(fast, week!);
    expect(JSON.stringify(recap.blocks)).toContain("Kept. A quiet, steady day.");
    expect(recap.paragraphs.join("\n")).not.toContain("close call");
  });

  it("with entries, the recaps quote the entries — the migrated words included", () => {
    const fast = liveFast();
    const { entries, fasts } = migrateDailyNotesToJournalEntries([fast], []);
    const moved = fasts[0];
    expect(resolveFastDayNotes(moved, entries)["2026-11-01"]).toBe(DAY_305_NOTE);
    const recap = composeFinalRecap(moved, entries);
    expect(recap.paragraphs.join("\n")).toContain("On Day 305 you wrote:");
    expect(recap.paragraphs.join("\n")).toContain("[3:16pm] Almost miffed it again...");
    expect(fastDayNotesFromEntries(fast, undefined)).toBeNull();
  });
});

describe("v410 pack tolerance — fast entries round-trip through a backup", () => {
  it("export → import keeps the linkage and the words, verbatim", () => {
    const fast = liveFast();
    const migrated = migrateDailyNotesToJournalEntries([fast], []);
    const withMoment = appendFastDayEntry(
      migrated.entries,
      { fastId: fast.id, date: "2026-11-01", kind: "close-call", text: "Almost miffed it again..." },
      new Date("2026-11-01T15:16:00.000Z"),
    );
    // The backup is a storage dump: both stores ride as raw JSON.
    const pack = {
      format: "prayercircle-backup",
      version: 1,
      exportedAt: "2026-11-01T20:00:00.000Z",
      storage: {
        [JOURNAL_STORAGE_KEY]: JSON.stringify(withMoment),
        [FASTS_STORAGE_KEY]: JSON.stringify(migrated.fasts),
      },
    };
    const revived = JSON.parse(JSON.stringify(pack)) as typeof pack;

    const restoredEntries = normalizePrayerJournalEntries(JSON.parse(revived.storage[JOURNAL_STORAGE_KEY]));
    const migratedEntry = restoredEntries.find((entry) => entry.id === migratedFastDayEntryId(fast.id, "2026-11-01"));
    expect(migratedEntry).toBeDefined();
    expect(migratedEntry!.body).toBe(DAY_305_NOTE);
    expect(migratedEntry!.fastDay).toEqual({ fastId: fast.id, kind: "note", migrated: true });
    const moment = restoredEntries.find((entry) => entry.fastDay?.kind === "close-call");
    expect(moment).toBeDefined();
    expect(moment!.fastDay).toEqual({ fastId: fast.id, kind: "close-call" });
    expect(moment!.body).toBe("Almost miffed it again...");

    const restoredFasts = parseStoredFasts(revived.storage[FASTS_STORAGE_KEY]).fasts;
    expect(restoredFasts).toHaveLength(1);
    expect(restoredFasts[0].dayStatuses).toEqual(fast.dayStatuses);
    expect(restoredFasts[0].dailyNotes).toBeUndefined();
    // And the restored pair resolves to the same quoted words.
    expect(resolveFastDayNotes(restoredFasts[0], restoredEntries)["2026-10-31"]).toBe(
      "Kept. Nothing dramatic — which is its own kind of mercy.",
    );
  });

  it("a pre-v410 pack (no fastDay field anywhere) loads its entries as ordinary moments", () => {
    const legacy = [
      {
        id: "journal-old-1",
        body: "An ordinary moment from before the rework.",
        date: "2026-10-20",
        taggedPeople: [],
        isBookmarked: false,
        replies: [],
        createdAt: "2026-10-20T12:00:00.000Z",
        updatedAt: "2026-10-20T12:00:00.000Z",
      },
    ];
    const restored = normalizePrayerJournalEntries(JSON.parse(JSON.stringify(legacy)));
    expect(restored).toHaveLength(1);
    expect(restored[0].fastDay).toBeUndefined();
    expect(restored[0].body).toBe("An ordinary moment from before the rework.");
  });
});

describe("v410 surfaces — the Day Page stands, the sheet is gone", () => {
  it("the Day Page carries the segmented day, the verse, and the entry composer", () => {
    const page = read("app/fast-day.tsx");
    expect(page).toContain("On track");
    expect(page).toContain("Struggled");
    expect(page).toContain("Broke");
    expect(page).toContain("getFastEncouragement(status ?? undefined)");
    // v431 amendment: the page no longer calls appendFastDayEntry
    // itself — it logs through logFastDayEntryToStorage, the honest
    // read-modify-write save in the same module, which appends via
    // appendFastDayEntry over the freshly-read journal. The pin's
    // intent stands: the page's moments go through this module's
    // append path, never a page-side shadow of it.
    expect(page).toContain("logFastDayEntryToStorage");
    expect(page).toContain("migrateFastDayEntriesInStorage");
    expect(page).toContain("upsertFastDayStatus");
    expect(page).toContain("removeFastDayStatus");
  });

  it("the tracker routes its day doors to the Day Page and mounts no day sheet", () => {
    const tracker = read("app/fasting-tracker.tsx");
    expect(tracker).toContain('pathname: "/fast-day"');
    expect(tracker).not.toContain("FastDaySheetContent");
    expect(tracker).not.toContain("saveDaySheet");
    expect(tracker).not.toContain("sheetDate");
    const components = read("components/fast-tracker.tsx");
    expect(components).not.toContain("FastDaySheetContent");
    expect(components).not.toContain("Note for this day");
  });
});
