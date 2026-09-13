import { describe, expect, it } from "vitest";

import { addPerson, initialPeople } from "./prayercircle-data";
import {
  addPrayerJournalReply,
  createPrayerJournalEntry,
  filterPrayerJournalEntries,
  groupPrayerJournalEntries,
  normalizePrayerJournalEntries,
  removePrayerJournalEntry,
  removePrayerJournalReply,
  togglePrayerJournalBookmark,
} from "./prayer-journal";

describe("Prayer Journal helpers", () => {
  const createdAt = new Date("2026-09-13T18:00:00.000Z");

  it("creates a trimmed dated entry with contact snapshots", () => {
    const people = addPerson(initialPeople, "Alice Smith", "Friends");
    const entries = createPrayerJournalEntry(
      [],
      { body: "  Pray for peace.  ", date: "2026-09-12", taggedPeople: people },
      "entry-1",
      createdAt,
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].body).toBe("Pray for peace.");
    expect(entries[0].date).toBe("2026-09-12");
    expect(entries[0].taggedPeople[0]).toMatchObject({ name: "Alice Smith", initials: "AS" });
    expect(createPrayerJournalEntry(entries, { body: "   " }, "empty", createdAt)).toBe(entries);
  });

  it("toggles and filters bookmarked entries", () => {
    const entries = createPrayerJournalEntry([], { body: "One" }, "entry-1", createdAt);
    const bookmarked = togglePrayerJournalBookmark(entries, "entry-1", createdAt);

    expect(bookmarked[0].isBookmarked).toBe(true);
    expect(filterPrayerJournalEntries(bookmarked, true)).toHaveLength(1);
    expect(filterPrayerJournalEntries(entries, true)).toHaveLength(0);
  });

  it("adds and removes dated replies under their parent entry", () => {
    const entries = createPrayerJournalEntry([], { body: "Original prayer" }, "entry-1", createdAt);
    const replied = addPrayerJournalReply(
      entries,
      "entry-1",
      "  The surgery went well.  ",
      "reply-1",
      new Date("2026-09-14T09:00:00.000Z"),
    );

    expect(replied[0].replies).toEqual([
      expect.objectContaining({ id: "reply-1", body: "The surgery went well.", date: "2026-09-14" }),
    ]);
    expect(removePrayerJournalReply(replied, "entry-1", "reply-1", createdAt)[0].replies).toEqual([]);
  });

  it("deletes only the selected journal entry", () => {
    let entries = createPrayerJournalEntry([], { body: "First" }, "entry-1", createdAt);
    entries = createPrayerJournalEntry(entries, { body: "Second" }, "entry-2", createdAt);

    expect(removePrayerJournalEntry(entries, "entry-1").map((entry) => entry.id)).toEqual(["entry-2"]);
  });

  it("groups entries newest-first by their journal date", () => {
    let entries = createPrayerJournalEntry([], { body: "Older", date: "2026-04-07" }, "older", createdAt);
    entries = createPrayerJournalEntry(entries, { body: "Newer", date: "2026-06-27" }, "newer", createdAt);

    expect(groupPrayerJournalEntries(entries).map((group) => group.label)).toEqual(["Jun 27", "Apr 7"]);
  });

  it("migrates the original single-person journal shape", () => {
    const normalized = normalizePrayerJournalEntries(
      [{ id: "legacy", personId: "person-1", personName: "Alice Smith", date: "2026-04-07", note: " Legacy prayer " }],
      createdAt,
    );

    expect(normalized[0]).toMatchObject({ id: "legacy", body: "Legacy prayer", date: "2026-04-07" });
    expect(normalized[0].taggedPeople[0]).toMatchObject({ id: "person-1", name: "Alice Smith", initials: "AS" });
    expect(normalized[0].replies).toEqual([]);
  });
});
