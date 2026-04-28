import { describe, expect, it } from "vitest";

import {
  getDailyPrayerProgress,
  getNextPrayerPerson,
  initialJournal,
  initialPeople,
  markPersonPrayed,
  prependJournalEntry,
} from "./prayercircle-data";

describe("PrayerCircle local data helpers", () => {
  it("marks a person as prayed without mutating the original list", () => {
    const updated = markPersonPrayed(initialPeople, "cody");
    const originalCody = initialPeople.find((person) => person.id === "cody");
    const updatedCody = updated.find((person) => person.id === "cody");

    expect(originalCody?.prayedToday).toBe(true);
    expect(updatedCody?.prayedToday).toBe(true);
    expect(updatedCody?.lastPrayedDaysAgo).toBe(0);
  });

  it("selects the next person who still needs prayer today", () => {
    const notPrayedYet = initialPeople.map((person) => ({ ...person, prayedToday: false }));
    expect(getNextPrayerPerson(notPrayedYet)?.id).toBe("cody");

    const allPrayed = initialPeople.map((person) => ({ ...person, prayedToday: true }));
    expect(getNextPrayerPerson(allPrayed)?.id).toBe(initialPeople[0].id);
  });

  it("reports daily prayer progress from the people list", () => {
    expect(getDailyPrayerProgress(initialPeople)).toEqual({ prayed: 7, total: 7 });
  });

  it("prepends trimmed journal entries and ignores empty notes", () => {
    const entryList = prependJournalEntry(initialJournal, initialPeople[0], "  A peaceful note.  ", "new-id");

    expect(entryList).toHaveLength(initialJournal.length + 1);
    expect(entryList[0]).toMatchObject({
      id: "new-id",
      personId: "cody",
      personName: "Cody Pattee",
      note: "A peaceful note.",
    });

    expect(prependJournalEntry(initialJournal, initialPeople[0], "   ", "empty-id")).toBe(initialJournal);
  });
});
