import { describe, expect, it } from "vitest";

import {
  buildDayTimeline,
  contributionGrid,
  dayCounts,
  entriesForPerson,
  entriesForTag,
  entryDayPart,
  formatEventTimeRange,
  isMoodOnlyEntry,
  isoDateOf,
  lastSharedEntry,
  momentsFeedItems,
  paintedDays,
  peopleMentionedInBody,
  placesPathFor,
  tagIndex,
} from "./journal-moments";
import { createPrayerJournalEntry, normalizePrayerJournalEntries, type PrayerJournalEntry } from "./prayer-journal";
import type { ScheduleEvent } from "./schedule-data";

const at = (iso: string) => new Date(iso);
// Local wall-clock ISO so day-part math means the same thing in any TZ.
const localIso = (year: number, month: number, day: number, hour: number, minute = 0) =>
  new Date(year, month - 1, day, hour, minute).toISOString();

function entry(partial: Partial<PrayerJournalEntry>): PrayerJournalEntry {
  return {
    id: partial.id ?? "e",
    body: "",
    date: "2026-10-22",
    taggedPeople: [],
    isBookmarked: false,
    replies: [],
    createdAt: "2026-10-22T12:00:00.000Z",
    updatedAt: "2026-10-22T12:00:00.000Z",
    ...partial,
  };
}

describe("v194 journal moments — moods paint the day in three parts", () => {
  it("day parts split at noon and 5pm local", () => {
    expect(entryDayPart(entry({ createdAt: localIso(2026, 10, 22, 8, 30) }))).toBe("morning");
    expect(entryDayPart(entry({ createdAt: localIso(2026, 10, 22, 13, 0) }))).toBe("midday");
    expect(entryDayPart(entry({ createdAt: localIso(2026, 10, 22, 19, 0) }))).toBe("evening");
  });

  it("the latest mood in a part wins the paint", () => {
    const painted = paintedDays([
      entry({ id: "a", date: "2026-10-08", createdAt: localIso(2026, 10, 8, 7, 0), mood: { id: "heavy", intensity: 2 } }),
      entry({ id: "b", date: "2026-10-08", createdAt: localIso(2026, 10, 8, 8, 0), mood: { id: "grateful", intensity: 2 } }),
      entry({ id: "c", date: "2026-10-08", createdAt: localIso(2026, 10, 8, 13, 0), mood: { id: "peaceful", intensity: 1 } }),
      entry({ id: "d", date: "2026-10-08", createdAt: localIso(2026, 10, 8, 18, 0), mood: { id: "joyful", intensity: 3 } }),
      entry({ id: "e", date: "2026-10-08", createdAt: localIso(2026, 10, 8, 9, 0) }),
    ]);
    expect(painted.get("2026-10-08")).toEqual({ morning: "grateful", midday: "peaceful", evening: "joyful" });
  });
});

describe("v194 journal moments — mood-only and photo entries are real entries", () => {
  it("a mood with no words can be created and survives normalization", () => {
    const created = createPrayerJournalEntry([], { body: "", mood: { id: "tired", intensity: 2 } }, "mood-1", at("2026-10-22T22:20:00.000Z"));
    expect(created).toHaveLength(1);
    expect(isMoodOnlyEntry(created[0])).toBe(true);
    const roundTripped = normalizePrayerJournalEntries(JSON.parse(JSON.stringify(created)), at("2026-10-23T00:00:00.000Z"));
    expect(roundTripped).toHaveLength(1);
    expect(roundTripped[0].mood).toEqual({ id: "tired", intensity: 2 });
  });

  it("a truly empty entry is still rejected", () => {
    const created = createPrayerJournalEntry([], { body: "   " }, "empty", at("2026-10-22T22:20:00.000Z"));
    expect(created).toHaveLength(0);
    expect(normalizePrayerJournalEntries([{ id: "x", body: "", date: "2026-10-22" }], at("2026-10-22T00:00:00.000Z"))).toHaveLength(0);
  });

  it("photos round-trip through create + normalize untouched", () => {
    const created = createPrayerJournalEntry(
      [],
      { body: "Garden morning", photos: ["file:///a.jpg", "file:///b.jpg"] },
      "photo-1",
      at("2026-10-22T16:26:00.000Z"),
    );
    expect(created[0].photos).toEqual(["file:///a.jpg", "file:///b.jpg"]);
    const roundTripped = normalizePrayerJournalEntries(JSON.parse(JSON.stringify(created)), at("2026-10-23T00:00:00.000Z"));
    expect(roundTripped[0].photos).toEqual(["file:///a.jpg", "file:///b.jpg"]);
    expect(roundTripped[0].body).toBe("Garden morning");
  });

  it("existing entries keep body, bookmarks, replies and hashtags through normalization", () => {
    const legacy = [
      {
        id: "keep",
        title: "Prayer",
        body: "Prayed for the garden #garden #family",
        date: "2026-10-21",
        taggedPeople: [{ id: "p1", name: "Melody", initials: "M", avatarColor: "#FFF", accentColor: "#000" }],
        isBookmarked: true,
        replies: [{ id: "r1", body: "Answered.", date: "2026-10-22", createdAt: "2026-10-22T10:00:00.000Z" }],
        createdAt: "2026-10-21T10:00:00.000Z",
        updatedAt: "2026-10-21T10:00:00.000Z",
        color: "#3B82F6",
        mood: { id: "grateful", intensity: 3 },
      },
    ];
    const normalized = normalizePrayerJournalEntries(legacy, at("2026-10-23T00:00:00.000Z"));
    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toMatchObject({ id: "keep", isBookmarked: true, color: "#3B82F6" });
    expect(normalized[0].replies).toHaveLength(1);
    expect(normalized[0].taggedPeople[0].name).toBe("Melody");
    expect(entriesForTag(normalized, "garden")).toHaveLength(1);
  });
});

describe("v194 journal moments — people, tags and the assembled day", () => {
  const melody = { id: "p-melody", name: "Melody Roberts" } as any;
  const eva = { id: "p-eva", name: "Eva Roberts" } as any;

  it("@mentions match by full or first name, case-insensitively", () => {
    expect(peopleMentionedInBody("A chorus, @Melody, one note at a time.", [melody, eva]).map((p: any) => p.id)).toEqual(["p-melody"]);
    expect(peopleMentionedInBody("Dinner with @eva roberts tonight", [melody, eva]).map((p: any) => p.id)).toEqual(["p-eva"]);
    expect(peopleMentionedInBody("No mentions here", [melody, eva])).toEqual([]);
  });

  it("shared entries come from tags or mentions; last together is the newest", () => {
    const entries = [
      entry({ id: "old", date: "2026-10-01", createdAt: "2026-10-01T10:00:00.000Z", body: "@Melody sang" }),
      entry({ id: "new", date: "2026-10-20", createdAt: "2026-10-20T10:00:00.000Z", body: "Garage time", taggedPeople: [{ id: "p-melody", name: "Melody Roberts", initials: "MR", avatarColor: "#F2A65A", accentColor: "#E4572E" }] }),
      entry({ id: "other", date: "2026-10-21", createdAt: "2026-10-21T10:00:00.000Z", body: "Solo" }),
    ];
    const sorted = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    expect(entriesForPerson(sorted, melody).map((e) => e.id)).toEqual(["new", "old"]);
    expect(lastSharedEntry(sorted, melody)?.id).toBe("new");
  });

  it("tag index counts moments and spans their dates", () => {
    const entries = [
      entry({ id: "1", date: "2026-07-04", body: "First bed #garden" }),
      entry({ id: "2", date: "2026-10-22", body: "Artichokes #Garden #morning" }),
    ];
    const index = tagIndex(entries);
    expect(index.get("garden")).toMatchObject({ count: 2, firstDate: "2026-07-04", lastDate: "2026-10-22" });
    expect(index.get("garden")?.dates.size).toBe(2);
  });

  it("the day counts and timeline come from real entries and events only", () => {
    const entries = [
      entry({ id: "am", date: "2026-10-22", createdAt: localIso(2026, 10, 22, 7, 42), body: "Artichokes", photos: ["file:///g.jpg"] }),
      entry({ id: "pm", date: "2026-10-22", createdAt: localIso(2026, 10, 22, 18, 3), body: "Evening show" }),
      entry({ id: "other-day", date: "2026-10-21", createdAt: localIso(2026, 10, 21, 10, 0), body: "Yesterday" }),
    ];
    const events: ScheduleEvent[] = [
      { id: "ev1", title: "Morning Meeting", date: "2026-10-22", startTime: "09:00", endTime: "10:30", isCompleted: false },
    ];
    const counts = dayCounts(entries, events, "2026-10-22");
    expect(counts).toMatchObject({ entries: 2, photos: 1, events: 1 });
    const timeline = buildDayTimeline(entries, events, "2026-10-22");
    expect(timeline.map((item) => item.kind)).toEqual(["entry", "photos", "event", "entry"]);
    expect(formatEventTimeRange(events[0])).toBe("9:00 AM – 10:30 AM");
  });

  it("the contribution grid stamps shared days and blanks the future", () => {
    const grid = contributionGrid(new Set(["2026-10-22"]), "2026-10-22", 2);
    const stamped = grid.flat().filter((cell) => cell && cell.stamped);
    expect(stamped).toHaveLength(1);
    expect(stamped[0]?.date).toBe("2026-10-22");
    const future = grid.flat().filter((cell) => cell === null);
    expect(future.length).toBeGreaterThan(0); // Oct 23–24 of the current week
  });

  it("the places path follows schedule order and lights the current place", () => {
    const ev = (id: string, startTime: string, location: string): ScheduleEvent => ({
      id,
      title: id,
      date: "2026-10-22",
      startTime,
      location,
      isCompleted: false,
    });
    const events: ScheduleEvent[] = [
      ev("booth", "14:10", "The Booth"),
      ev("school", "08:20", "iLead"),
      ev("home-am", "07:05", "Home"),
      ev("moms", "11:40", "Mom's"),
      ev("unlocated", "09:00", ""),
      ev("home-pm", "18:45", "Home"),
      // A second consecutive Home event collapses into the same stop.
      ev("home-pm-2", "19:30", "Home"),
    ];
    // 3:00 PM local on the day itself.
    const now = new Date(2026, 9, 22, 15, 0);
    const path = placesPathFor(events, "2026-10-22", now);
    expect(path.homeOnly).toBe(false);
    expect(path.nodes.map((node) => node.location)).toEqual(["Home", "iLead", "Mom's", "The Booth", "Home"]);
    expect(path.nodes.map((node) => node.timeLabel)).toEqual(["7:05 AM", "8:20 AM", "11:40 AM", "2:10 PM", "6:45 PM"]);
    expect(path.nodes.map((node) => node.state)).toEqual(["past", "past", "past", "now", "upcoming"]);
    expect(path.nodes[1].iconHint).toBe("school");
    expect(path.nodes[2].iconHint).toBe("heart");
    expect(path.nodes[3].iconHint).toBe("booth");

    // Before the first stop, nothing is lit yet.
    const early = placesPathFor(events, "2026-10-22", new Date(2026, 9, 22, 6, 0));
    expect(early.nodes.every((node) => node.state === "upcoming")).toBe(true);
    // A past day reads as all past; a future day all upcoming.
    const futureDay = placesPathFor(
      events.map((event) => ({ ...event, date: "2026-10-23" })),
      "2026-10-23",
      now,
    );
    expect(futureDay.nodes.every((node) => node.state === "upcoming")).toBe(true);
    const pastDay = placesPathFor(
      events.map((event) => ({ ...event, date: "2026-10-21" })),
      "2026-10-21",
      now,
    );
    expect(pastDay.nodes.every((node) => node.state === "past")).toBe(true);
  });

  it("the places path degrades to a single Home node when nothing is located", () => {
    const now = new Date(2026, 9, 22, 15, 0);
    const path = placesPathFor([], "2026-10-22", now);
    expect(path.homeOnly).toBe(true);
    expect(path.nodes).toHaveLength(1);
    expect(path.nodes[0]).toMatchObject({ location: "Home", state: "now", iconHint: "home" });
  });
});

describe("v196 journal — a composer post lands in Moments, not just Day", () => {
  // Jonathan, on v195 (2026-10-22, 11:16 PM): "when I sent my
  // thoughts, it didn't actually save... I mean it did, but not to
  // the journal page..." The entry existed — it showed in the Day
  // view — but never appeared in the Moments feed. The create →
  // storage → grouping path below was sound all along (pinned by
  // the first test); the divergence is the Moments-only filter:
  // Day reads raw entries, Moments applies the search query +
  // bookmarks filter, and the tab kept a leftover query applied
  // after the search bar closed, invisibly. The tab now clears
  // every filter and scrolls to the top when a post lands
  // (revealFreshPost); the second test pins the gate itself so the
  // two surfaces can never silently disagree again unnoticed.
  const postedAt = new Date(2026, 9, 22, 23, 16); // 11:16 PM local
  const todayIso = isoDateOf(postedAt);

  function composerPost() {
    // The exact shape the Moments composer's postQuick builds:
    // body + today's date key, no mood, no photos, nothing else.
    const seeded = [
      entry({ id: "old", body: "An older note", date: "2026-10-08", createdAt: localIso(2026, 10, 8, 9, 0) }),
    ];
    const next = createPrayerJournalEntry(
      seeded,
      { body: "A thought typed into the composer", date: todayIso },
      "journal-test-1",
      postedAt,
    );
    // Through storage and back, the way the app persists it.
    return normalizePrayerJournalEntries(JSON.parse(JSON.stringify(next)), postedAt);
  }

  it("post → storage → feed grouping puts it first, under today's separator, counted", () => {
    const revived = composerPost();
    const feed = momentsFeedItems(revived, {});
    expect(feed[0]).toEqual({ kind: "separator", key: `sep-${todayIso}`, date: todayIso });
    expect(feed[1].kind).toBe("entry");
    if (feed[1].kind === "entry") {
      expect(feed[1].entry.body).toBe("A thought typed into the composer");
      expect(feed[1].entry.date).toBe(todayIso);
    }
    expect(dayCounts(revived, [], todayIso).entries).toBe(1);
  });

  it("the Moments filter is the only gate that can hide it — Day never filters", () => {
    const revived = composerPost();
    // A leftover search query (or bookmarks-only) drops the fresh
    // post from Moments while Day's assembler still seats it —
    // the exact v195 symptom.
    expect(momentsFeedItems(revived, { query: "unrelated-term" }).some((item) => item.kind === "entry" && item.entry.id === "journal-test-1")).toBe(false);
    expect(momentsFeedItems(revived, { bookmarksOnly: true }).some((item) => item.kind === "entry" && item.entry.id === "journal-test-1")).toBe(false);
    expect(buildDayTimeline(revived, [], todayIso).some((item) => item.kind === "entry" && item.entry.id === "journal-test-1")).toBe(true);
    // With the filters cleared (what posting now does), it stands
    // in Moments too.
    expect(momentsFeedItems(revived, { query: "", bookmarksOnly: false }).some((item) => item.kind === "entry" && item.entry.id === "journal-test-1")).toBe(true);
  });

  it("in Day the late-night post seats at its real time, after the day's events", () => {
    const revived = composerPost();
    const morning: ScheduleEvent = {
      id: "ev1",
      title: "Morning Meeting",
      date: todayIso,
      startTime: "08:00",
      endTime: "08:30",
      isCompleted: false,
    };
    const timeline = buildDayTimeline(revived, [morning], todayIso);
    expect(timeline.map((item) => item.kind)).toEqual(["event", "entry"]);
  });
});
