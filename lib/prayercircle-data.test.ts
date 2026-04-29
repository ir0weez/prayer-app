import { describe, expect, it } from "vitest";

import {
  addPerson,
  addPrayerItem,
  getDailyPrayerProgress,
  getDaysSinceLastPrayed,
  getNextPrayerPerson,
  getPrayTodayList,
  getUrgentPrayerItems,
  getTodayISOString,
  initialJournal,
  initialPeople,
  markPersonPrayed,
  prependJournalEntry,
  removePerson,
  removePrayerItem,
  shouldPrayForTodayByReminder,
  togglePrayerItemDone,
  togglePrayerItemUrgent,
  updatePersonReminder,
} from "./prayercircle-data";

describe("PrayerCircle local data helpers", () => {
  it("starts with blank data", () => {
    expect(initialPeople).toHaveLength(0);
    expect(initialJournal).toHaveLength(0);
  });

  it("adds a person with auto-assigned colors", () => {
    const updated = addPerson(initialPeople, "Alice Smith", "Friends");

    expect(updated).toHaveLength(1);
    expect(updated[0].name).toBe("Alice Smith");
    expect(updated[0].initials).toBe("AS");
    expect(updated[0].relationship).toBe("Friends");
    expect(updated[0].lastPrayedDate).toBeNull();
    expect(updated[0].reminderDaysOfWeek).toEqual([]);
    expect(updated[0].avatarColor).toBeDefined();
    expect(updated[0].accentColor).toBeDefined();
  });

  it("marks a person as prayed today", () => {
    const people = addPerson(initialPeople, "Bob", "Friends");
    const today = getTodayISOString();
    const updated = markPersonPrayed(people, people[0].id);

    expect(updated[0].lastPrayedDate).toBe(today);
  });

  it("calculates days since last prayed correctly", () => {
    const today = getTodayISOString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = yesterday.toISOString().split("T")[0];

    expect(getDaysSinceLastPrayed(today)).toBe(0);
    expect(getDaysSinceLastPrayed(yesterdayISO)).toBe(1);
    expect(getDaysSinceLastPrayed(null)).toBe(999);
  });

  it("returns first person if no one has been prayed for yet", () => {
    let people = addPerson(initialPeople, "Alice", "Friends");
    people = addPerson(people, "Bob", "Friends");

    expect(getNextPrayerPerson(people)?.name).toBe("Alice");
  });

  it("returns null if everyone has been prayed for today", () => {
    const today = getTodayISOString();
    let people = addPerson(initialPeople, "Alice", "Friends");
    people = addPerson(people, "Bob", "Friends");
    people = markPersonPrayed(people, people[0].id);
    people = markPersonPrayed(people, people[1].id);

    expect(getNextPrayerPerson(people)).toBeNull();
  });

  it("reports daily prayer progress", () => {
    const today = getTodayISOString();
    let people = addPerson(initialPeople, "Alice", "Friends");
    people = markPersonPrayed(people, people[0].id);
    people = addPerson(people, "Bob", "Friends");

    const progress = getDailyPrayerProgress(people);
    expect(progress.prayed).toBe(1);
    expect(progress.total).toBe(2);
  });

  it("filters people by reminder day of week", () => {
    const people = addPerson(initialPeople, "Alice", "Friends");
    const updated = updatePersonReminder(people, people[0].id, [1, 4]); // Monday, Thursday

    expect(getPrayTodayList(updated, 1)).toHaveLength(1); // Monday
    expect(getPrayTodayList(updated, 4)).toHaveLength(1); // Thursday
    expect(getPrayTodayList(updated, 2)).toHaveLength(0); // Tuesday
  });

  it("determines if a person should be prayed for on a given day", () => {
    const people = addPerson(initialPeople, "Alice", "Friends");
    const updated = updatePersonReminder(people, people[0].id, [1, 4]);

    expect(shouldPrayForTodayByReminder(updated[0], 1)).toBe(true);
    expect(shouldPrayForTodayByReminder(updated[0], 4)).toBe(true);
    expect(shouldPrayForTodayByReminder(updated[0], 2)).toBe(false);
  });

  it("toggles prayer item urgent flag", () => {
    const people = addPerson(initialPeople, "Alice", "Friends");
    const withItem = addPrayerItem(people, people[0].id, "Health");

    const updated = togglePrayerItemUrgent(withItem, people[0].id, withItem[0].prayerItems[0].id);
    expect(updated[0].prayerItems[0].isUrgent).toBe(true);

    const toggled = togglePrayerItemUrgent(updated, people[0].id, updated[0].prayerItems[0].id);
    expect(toggled[0].prayerItems[0].isUrgent).toBe(false);
  });

  it("toggles prayer item done flag", () => {
    const people = addPerson(initialPeople, "Alice", "Friends");
    const withItem = addPrayerItem(people, people[0].id, "Health");

    const updated = togglePrayerItemDone(withItem, people[0].id, withItem[0].prayerItems[0].id);
    expect(updated[0].prayerItems[0].isDone).toBe(true);
  });

  it("adds a prayer item to a person", () => {
    const people = addPerson(initialPeople, "Alice", "Friends");
    const updated = addPrayerItem(people, people[0].id, "  Health  ");

    expect(updated[0].prayerItems).toHaveLength(1);
    expect(updated[0].prayerItems[0].title).toBe("Health");
    expect(updated[0].prayerItems[0].isUrgent).toBe(false);
    expect(updated[0].prayerItems[0].isDone).toBe(false);
  });

  it("removes a prayer item from a person", () => {
    const people = addPerson(initialPeople, "Alice", "Friends");
    const withItem = addPrayerItem(people, people[0].id, "Health");

    const updated = removePrayerItem(withItem, people[0].id, withItem[0].prayerItems[0].id);
    expect(updated[0].prayerItems).toHaveLength(0);
  });

  it("gets urgent prayer items for a person", () => {
    const people = addPerson(initialPeople, "Alice", "Friends");
    const withItem = addPrayerItem(people, people[0].id, "Health");
    const updated = togglePrayerItemUrgent(withItem, people[0].id, withItem[0].prayerItems[0].id);

    const urgentItems = getUrgentPrayerItems(updated[0]);
    expect(urgentItems).toHaveLength(1);
    expect(urgentItems[0].title).toBe("Health");
  });

  it("removes a person from the list", () => {
    const people = addPerson(initialPeople, "Alice", "Friends");
    expect(people).toHaveLength(1);

    const updated = removePerson(people, people[0].id);
    expect(updated).toHaveLength(0);
  });

  it("prepends trimmed journal entries and ignores empty notes", () => {
    const people = addPerson(initialPeople, "Alice", "Friends");
    const entryList = prependJournalEntry(initialJournal, people[0], "  A peaceful note.  ", "new-id");

    expect(entryList).toHaveLength(1);
    expect(entryList[0]).toMatchObject({
      id: "new-id",
      personId: people[0].id,
      personName: "Alice",
      note: "A peaceful note.",
    });

    expect(prependJournalEntry(initialJournal, people[0], "   ", "empty-id")).toBe(initialJournal);
  });
});
