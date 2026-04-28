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
    const updated = markPersonPrayed(initialPeople, "mara");
    const originalMara = initialPeople.find((person) => person.id === "mara");
    const updatedMara = updated.find((person) => person.id === "mara");

    expect(originalMara?.prayedToday).toBe(false);
    expect(updatedMara?.prayedToday).toBe(true);
    expect(updatedMara?.lastPrayed).toBe("Today");
  });

  it("selects the next person who still needs prayer today", () => {
    expect(getNextPrayerPerson(initialPeople)?.id).toBe("mara");

    const allPrayed = initialPeople.map((person) => ({ ...person, prayedToday: true }));
    expect(getNextPrayerPerson(allPrayed)?.id).toBe(initialPeople[0].id);
  });

  it("reports daily prayer progress from the people list", () => {
    expect(getDailyPrayerProgress(initialPeople)).toEqual({ prayed: 1, total: 3 });
  });

  it("prepends trimmed journal entries and ignores empty notes", () => {
    const entryList = prependJournalEntry(initialJournal, initialPeople[0], "  A peaceful note.  ", "new-id");

    expect(entryList).toHaveLength(initialJournal.length + 1);
    expect(entryList[0]).toMatchObject({
      id: "new-id",
      personId: "mara",
      personName: "Mara Lewis",
      note: "A peaceful note.",
    });

    expect(prependJournalEntry(initialJournal, initialPeople[0], "   ", "empty-id")).toBe(initialJournal);
  });
});
