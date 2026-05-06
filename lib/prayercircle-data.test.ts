import { describe, expect, it } from "vitest";

import {
  calculateFastStreak,
  createPersonalFast,
  formatIsoToMmDdYyyy,
  getFastProgress,
  normalizeFastDateInput,
  upsertFastDayStatus,
} from "./prayercircle-fasting";

import {
  addPerson,
  addPrayerItem,
  getDailyPrayerProgress,
  getDaysSinceLastPrayed,
  formatIsoDateForDisplay,
  getLastReachedAccentColor,
  getNextPrayerPerson,
  getPrayTodayList,
  getReminderScheduleText,
  getUrgentPrayerItems,
  getTodayISOString,
  hasPersonCompletedPrayerToday,
  getInitialState,
  initialJournal,
  initialPeople,
  markPersonPrayed,
  normalizePeopleForStorage,
  prependJournalEntry,
  removePerson,
  resetDailyPrayerCompletionsIfNeeded,
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
    expect(updated[0].reminderFrequency).toBe("weekly");
    expect(updated[0].reminderTime).toBe("08:30");
    expect(updated[0].reminderTag).toBe("Peace");
    expect(updated[0].avatarLabel).toBe("AS");
    expect(updated[0].photoUri).toBe("file:///photo.jpg");
  });

  it("marks every prayer item for a person as prayed today", () => {
    const people = addPerson(initialPeople, "Bob", "Friends");
    const withItems = addPrayerItem(addPrayerItem(people, people[0].id, "Healing"), people[0].id, "Job search");
    const today = getTodayISOString();
    const updated = markPersonPrayed(withItems, people[0].id);

    expect(updated[0].lastPrayerCompletedDate).toBe(today);
    expect(updated[0].lastPrayedDate).toBeNull();
    expect(updated[0].prayerItems.every((item) => item.isDone)).toBe(true);
    expect(hasPersonCompletedPrayerToday(updated[0], today)).toBe(true);
  });

  it("keeps reached-out progress independent from prayer completion", () => {
    const people = addPerson(initialPeople, "Grace", "Family");
    const prayed = markPersonPrayed(people, people[0].id);
    const reached = updatePersonLastReachedDate(people, people[0].id, getTodayISOString());

    expect(prayed[0].lastPrayedDate).toBeNull();
    expect(hasPersonCompletedPrayerToday(reached[0])).toBe(false);
    expect(getDaysSinceLastPrayed(reached[0].lastPrayedDate)).toBe(0);
  });

  it("formats ISO dates as MM-DD-YYYY for display", () => {
    expect(formatIsoDateForDisplay("2026-04-30")).toBe("04-30-2026");
    expect(formatIsoDateForDisplay(null)).toBe("Never");
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
    let people = addPerson(initialPeople, "Alice", "Friends");
    people = markPersonPrayed(people, people[0].id);
    people = addPerson(people, "Bob", "Friends");

    const progress = getDailyPrayerProgress(people);
    expect(progress.prayed).toBe(1);
    expect(progress.total).toBe(2);
  });

  it("counts remaining Pray Today people from today's scheduled list", () => {
    let people = addPerson(initialPeople, "Alice", "Friends");
    people = addPerson(people, "Bob", "Family");
    people = addPerson(people, "Carla", "Ministry");
    people = updatePersonReminderWithTime(people, people[0].id, [], "08:00", "daily");
    people = updatePersonReminderWithTime(people, people[1].id, [], "08:00", "daily");
    people = updatePersonReminderWithTime(people, people[2].id, [], "08:00", "none");

    const scheduledToday = getPrayTodayList(people, 2, 10);
    const completed = markPersonPrayed(people, people[0].id);
    const remainingToday = getPrayTodayList(completed, 2, 10).filter((person) => !hasPersonCompletedPrayerToday(person)).length;

    expect(scheduledToday).toHaveLength(2);
    expect(remainingToday).toBe(1);
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

  it("determines if a person should be prayed for by daily, weekly, monthly, or off frequency", () => {
    const people = addPerson(initialPeople, "Alice", "Friends");
    const weekly = updatePersonReminder(people, people[0].id, [1, 4]);
    const daily = updatePersonReminderWithTime(people, people[0].id, [], "08:00", "daily");
    const monthly = updatePersonReminderWithTime(people, people[0].id, [], "08:00", "monthly", 15);

    expect(shouldPrayForTodayByReminder(weekly[0], 1)).toBe(true);
    expect(shouldPrayForTodayByReminder(weekly[0], 4)).toBe(true);
    expect(shouldPrayForTodayByReminder(weekly[0], 2)).toBe(false);
    expect(shouldPrayForTodayByReminder(daily[0], 2)).toBe(true);
    expect(shouldPrayForTodayByReminder(monthly[0], 2, 15)).toBe(true);
    expect(shouldPrayForTodayByReminder(monthly[0], 2, 16)).toBe(false);
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
    expect(updated[0].reminderFrequency).toBe("weekly");
    expect(updated[0].reminderTime).toBe("07:45");
    expect(getReminderScheduleText(updated[0])).toBe("2 weekly days · 07:45");
  });

  it("stores daily and monthly reminder schedules", () => {
    const people = addPerson(initialPeople, "Alice", "Friends");
    const daily = updatePersonReminderWithTime(people, people[0].id, [], "06:15", "daily");
    const monthly = updatePersonReminderWithTime(people, people[0].id, [], "19:45", "monthly", 22);

    expect(daily[0].reminderFrequency).toBe("daily");
    expect(daily[0].reminderDaysOfWeek).toEqual([]);
    expect(getReminderScheduleText(daily[0])).toBe("Every day · 06:15");
    expect(monthly[0].reminderFrequency).toBe("monthly");
    expect(monthly[0].reminderDayOfMonth).toBe(22);
    expect(getReminderScheduleText(monthly[0])).toBe("Monthly on day 22 · 19:45");
  });

  it("resets daily prayer item completion on a later day while keeping reminder visibility date-specific", () => {
    const basePeople = addPerson(initialPeople, "Alice", "Friends");
    const personId = basePeople[0].id;
    const people = updatePersonReminderWithTime(basePeople, personId, [], "08:00", "daily");
    const withItem = addPrayerItem(people, personId, "Healing");
    const completed = markPersonPrayed(withItem, personId);
    const reset = resetDailyPrayerCompletionsIfNeeded(completed, "2099-01-01");

    expect(reset[0].prayerItems[0].isDone).toBe(false);
    expect(hasPersonCompletedPrayerToday(reset[0], "2099-01-01")).toBe(false);
    expect(shouldPrayForTodayByReminder(reset[0], 2, 10)).toBe(true);
  });

  it("updates a person's photo URI", () => {
    const people = addPerson(initialPeople, "Alice", "Friends");
    const updated = updatePersonPhoto(people, people[0].id, "file:///picked-avatar.jpg");

    expect(updated[0].photoUri).toBe("file:///picked-avatar.jpg");
  });

  it("normalizes stored people so routed contacts keep unique ids and usable metadata", () => {
    const people = addPerson(initialPeople, "Alice Friend", "Friends");
    const storedPeople = [
      { ...people[0], id: "duplicate", relationship: "Friends", prayerItems: undefined, reminderDaysOfWeek: undefined },
      { ...people[0], id: "duplicate", name: "Bob Friend", relationship: "Friends" },
    ] as unknown as Parameters<typeof normalizePeopleForStorage>[0];

    const normalized = normalizePeopleForStorage(storedPeople);

    expect(normalized).toHaveLength(2);
    expect(new Set(normalized.map((person) => person.id)).size).toBe(2);
    expect(normalized[0].relationship).toBe("Friends");
    expect(normalized[0].prayerItems).toEqual([]);
    expect(normalized[0].reminderDaysOfWeek).toEqual([]);
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

  it("removes only the selected person while preserving other contacts", () => {
    let people = addPerson(initialPeople, "Alice", "Friends");
    people = addPerson(people, "Bob", "Family");
    people = addPrayerItem(people, people[1].id, "Wisdom");

    const updated = removePerson(people, people[0].id);

    expect(updated).toHaveLength(1);
    expect(updated[0].name).toBe("Bob");
    expect(updated[0].prayerItems).toHaveLength(1);
    expect(updated[0].prayerItems[0].title).toBe("Wisdom");
  });

  it("creates a personal fast from MM-DD-YYYY input and formats ISO dates for display", () => {
    const fast = createPersonalFast({
      name: "  40-Day Prayer Fast  ",
      startDate: "04-30-2026",
      durationDays: 40,
      type: "Health",
      focusItems: [" Social Media ", ""],
      existingCount: 2,
    });

    expect(fast).not.toBeNull();
    expect(fast?.name).toBe("40-Day Prayer Fast");
    expect(fast?.startDate).toBe("2026-04-30");
    expect(fast?.focusItems).toEqual(["Social Media"]);
    expect(formatIsoToMmDdYyyy(fast?.startDate)).toBe("04-30-2026");
    expect(normalizeFastDateInput("13-40-2026")).toBeNull();
  });

  it("tracks fasting progress so skipped days preserve streak and missed days reset it", () => {
    const fast = createPersonalFast({
      name: "Seven Day Hope Fast",
      startDate: "04-01-2026",
      durationDays: 7,
      type: "Hope",
      focusItems: ["Worry"],
    });
    expect(fast).not.toBeNull();

    let fasts = [fast!];
    fasts = upsertFastDayStatus(fasts, fast!.id, "2026-04-01", "completed");
    fasts = upsertFastDayStatus(fasts, fast!.id, "2026-04-02", "skipped");
    fasts = upsertFastDayStatus(fasts, fast!.id, "2026-04-03", "completed");

    expect(calculateFastStreak(fasts[0], "2026-04-03")).toBe(2);
    expect(getFastProgress(fasts[0])).toMatchObject({ completed: 2, skipped: 1, missed: 0, total: 7 });

    fasts = upsertFastDayStatus(fasts, fast!.id, "2026-04-04", "missed");
    expect(calculateFastStreak(fasts[0], "2026-04-04")).toBe(0);
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
