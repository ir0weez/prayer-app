import { describe, expect, it } from "vitest";

import {
  getDailyPrayerProgress,
  getNextPrayerPerson,
  getPrayTodayList,
  initialJournal,
  initialPeople,
  markPersonPrayed,
  prependJournalEntry,
  shouldPrayForTodayByReminder,
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

  it("filters people by reminder day of week", () => {
    // Monday = 1
    const mondayPeople = getPrayTodayList(initialPeople, 1);
    expect(mondayPeople.map((p) => p.id)).toContain("cody"); // Mondays and Thursdays
    expect(mondayPeople.map((p) => p.id)).toContain("juan"); // Weekly on Monday
    expect(mondayPeople.map((p) => p.id)).toContain("kim"); // Mondays
    expect(mondayPeople.map((p) => p.id)).toContain("gary"); // Daily

    // Saturday = 6
    const saturdayPeople = getPrayTodayList(initialPeople, 6);
    expect(saturdayPeople.map((p) => p.id)).toContain("damian"); // Weekly on Saturday
    expect(saturdayPeople.map((p) => p.id)).toContain("gary"); // Daily
  });

  it("determines if a person should be prayed for on a given day", () => {
    const cody = initialPeople.find((p) => p.id === "cody")!;
    expect(shouldPrayForTodayByReminder(cody, 1)).toBe(true); // Monday
    expect(shouldPrayForTodayByReminder(cody, 4)).toBe(true); // Thursday
    expect(shouldPrayForTodayByReminder(cody, 2)).toBe(false); // Wednesday

    const gary = initialPeople.find((p) => p.id === "gary")!;
    expect(shouldPrayForTodayByReminder(gary, 0)).toBe(true); // Every day
    expect(shouldPrayForTodayByReminder(gary, 6)).toBe(true); // Every day
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
