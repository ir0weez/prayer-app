import { describe, expect, it } from "vitest";

import {
  addPerson,
  addPrayerItem,
  getDailyPrayerProgress,
  getDaysSinceLastPrayed,
  getLastReachedAccentColor,
  getNextPrayerPerson,
  getPrayTodayList,
  getUrgentPrayerItems,
  getTodayISOString,
  getInitialState,
  initialJournal,
  initialPeople,
  markPersonPrayed,
  prependJournalEntry,
  removePerson,
  removePrayerItem,
  shouldPrayForTodayByReminder,
  togglePrayerItemDone,
  togglePrayerItemUrgent,
  updatePersonLastReachedDate,
  updatePersonPhoto,
  updatePersonReminder,
  updatePersonReminderWithTime,
} from "./prayercircle-data";

describe("PrayerCircle local data helpers", () => {
  it("starts with blank data", () => {
    expect(initialPeople).toHaveLength(0);
    expect(initialJournal).toHaveLength(0);
  });

  it("returns a clean first-run state with no starter contacts", () => {
    const state = getInitialState();

    expect(state.people).toEqual([]);
    expect(state.journal).toEqual([]);
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

  it("adds optional birthday, prayer note, reminder days, reminder time, avatar label, and photo", () => {
    const updated = addPerson(initialPeople, "Alice Smith", "Family", {
      birthday: "1990-03-15",
      prayerNote: "  Pray for peace  ",
      reminderDaysOfWeek: [3, 1, 1, 9],
      reminderTime: "08:30",
      reminderTag: "Peace",
      avatarLabel: "AS",
      photoUri: "  file:///photo.jpg  ",
    });

    expect(updated).toHaveLength(1);
    expect(updated[0].birthday).toBe("1990-03-15");
    expect(updated[0].prayerNote).toBe("Pray for peace");
    expect(updated[0].reminderDaysOfWeek).toEqual([1, 3]);
    expect(updated[0].reminderTime).toBe("08:30");
    expect(updated[0].reminderTag).toBe("Peace");
    expect(updated[0].avatarLabel).toBe("AS");
    expect(updated[0].photoUri).toBe("file:///photo.jpg");
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

  it("filters people by active reminder day of week", () => {
    let people = addPerson(initialPeople, "Alice", "Friends");
    people = addPerson(people, "Bob", "Family");
    const updated = updatePersonReminder(people, people[0].id, [4, 1, 1]); // Monday, Thursday

    expect(getPrayTodayList(updated, 1)).toHaveLength(1); // Monday
    expect(getPrayTodayList(updated, 4)).toHaveLength(1); // Thursday
    expect(getPrayTodayList(updated, 2)).toHaveLength(0); // Tuesday
    expect(getPrayTodayList(updated, 0)).toHaveLength(0); // Bob has no active reminder days
    expect(updated[0].reminderDaysOfWeek).toEqual([1, 4]);
  });

  it("determines if a person should be prayed for on a given day", () => {
    const people = addPerson(initialPeople, "Alice", "Friends");
    const updated = updatePersonReminder(people, people[0].id, [1, 4]);

    expect(shouldPrayForTodayByReminder(updated[0], 1)).toBe(true);
    expect(shouldPrayForTodayByReminder(updated[0], 4)).toBe(true);
    expect(shouldPrayForTodayByReminder(updated[0], 2)).toBe(false);
    expect(shouldPrayForTodayByReminder(people[0], 1)).toBe(false);
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

  it("updates reminder days with a reminder time", () => {
    const people = addPerson(initialPeople, "Alice", "Friends");
    const updated = updatePersonReminderWithTime(people, people[0].id, [5, 2, 2], "07:45");

    expect(updated[0].reminderDaysOfWeek).toEqual([2, 5]);
    expect(updated[0].reminderTime).toBe("07:45");
  });

  it("updates a person's photo URI", () => {
    const people = addPerson(initialPeople, "Alice", "Friends");
    const updated = updatePersonPhoto(people, people[0].id, "file:///picked-avatar.jpg");

    expect(updated[0].photoUri).toBe("file:///picked-avatar.jpg");
  });

  it("updates last reached date and reports threshold colors", () => {
    const people = addPerson(initialPeople, "Alice", "Friends");
    const today = new Date();
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(today.getDate() - 10);
    const sixteenDaysAgo = new Date();
    sixteenDaysAgo.setDate(today.getDate() - 16);

    const recent = updatePersonLastReachedDate(people, people[0].id, getTodayISOString());
    expect(getLastReachedAccentColor(recent[0])).toBe(recent[0].accentColor);

    const warning = updatePersonLastReachedDate(people, people[0].id, tenDaysAgo.toISOString().split("T")[0]);
    expect(getLastReachedAccentColor(warning[0])).toBe("#F59E0B");

    const overdue = updatePersonLastReachedDate(people, people[0].id, sixteenDaysAgo.toISOString().split("T")[0]);
    expect(getLastReachedAccentColor(overdue[0])).toBe("#EF4444");
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
