export type PrayerItem = {
  id: string;
  title: string;
  isUrgent: boolean;
  isDone: boolean;
};

export type RelationshipType = "Family" | "Friends" | "Ministry" | "Prospect";
export type ReminderFrequency = "none" | "daily" | "weekly" | "monthly";

export type Person = {
  id: string;
  name: string;
  initials: string;
  relationship: RelationshipType;
  lastPrayedDate: string | null; // Last reached date as an ISO date string (YYYY-MM-DD) or null.
  lastPrayerCompletedDate?: string | null; // The date this person was prayed for in the daily Pray Today flow.
  reminderDaysOfWeek: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  reminderFrequency?: ReminderFrequency;
  reminderDayOfMonth?: number;
  reminderTime?: string; // HH:mm, 24-hour local device time
  accentColor: string;
  avatarColor: string;
  birthday?: string;
  prayerNote?: string;
  reminderTag?: string;
  avatarLabel?: string;
  photoUri?: string;
  prayerItems: PrayerItem[];
};

export type AddPersonOptions = {
  birthday?: string;
  prayerNote?: string;
  reminderDaysOfWeek?: number[];
  reminderFrequency?: ReminderFrequency;
  reminderDayOfMonth?: number;
  reminderTime?: string;
  reminderTag?: string;
  avatarLabel?: string;
  photoUri?: string;
};

export type JournalEntry = {
  id: string;
  personId: string;
  personName: string;
  date: string;
  note: string;
};

function normalizeOptionalText(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function dedupeAndSortReminderDays(daysOfWeek: number[]): number[] {
  return Array.from(
    new Set(daysOfWeek.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)),
  ).sort((a, b) => a - b);
}

function normalizeReminderDayOfMonth(day?: number): number | undefined {
  if (!Number.isInteger(day) || day === undefined || day < 1 || day > 31) return undefined;
  return day;
}

function normalizeReminderFrequency(
  frequency: ReminderFrequency | undefined,
  reminderDaysOfWeek: number[],
  reminderDayOfMonth?: number,
): ReminderFrequency {
  if (frequency === "daily") return "daily";
  if (frequency === "monthly" && normalizeReminderDayOfMonth(reminderDayOfMonth)) return "monthly";
  if (frequency === "weekly" && reminderDaysOfWeek.length > 0) return "weekly";
  if (!frequency && reminderDaysOfWeek.length > 0) return "weekly";
  return "none";
}

// Relationship type to color mapping
export const relationshipColors: Record<RelationshipType, { avatar: string; accent: string }> = {
  Family: { avatar: "#A78BFA", accent: "#7C3AED" }, // Purple
  Friends: { avatar: "#86EFAC", accent: "#22C55E" }, // Green
  Ministry: { avatar: "#FED7AA", accent: "#EA580C" }, // Orange
  Prospect: { avatar: "#D1D5DB", accent: "#6B7280" }, // Grey
};

export const LAST_REACHED_WARNING_COLOR = "#F59E0B";
export const LAST_REACHED_OVERDUE_COLOR = "#EF4444";

// Start with blank data
export const initialPeople: Person[] = [];

export const initialJournal: JournalEntry[] = [];

// Helper: Get days since last reached
export function getDaysSinceLastPrayed(lastPrayedDate: string | null): number {
  if (!lastPrayedDate) return 999; // Never reached

  const last = new Date(lastPrayedDate + "T00:00:00Z");
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const diff = today.getTime() - last.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

// Helper: Format days since last reached for compact mobile display
export function formatDaysSinceLastPrayer(daysSince: number): string {
  if (daysSince === 0) return "0d";
  if (daysSince === 1) return "1d";
  if (daysSince < 365) return `${daysSince}d`;
  return "—";
}

// Helper: Format ISO date strings for short mobile labels
export function formatIsoDateForDisplay(dateString: string | null): string {
  if (!dateString) return "Never";
  const [year, month, day] = dateString.split("-");
  if (!year || !month || !day) return dateString;
  return `${month}-${day}-${year}`;
}

// Helper: Get today's ISO date string
export function getTodayISOString(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

export function getPersonReminderFrequency(person: Person): ReminderFrequency {
  const days = dedupeAndSortReminderDays(person.reminderDaysOfWeek ?? []);
  return normalizeReminderFrequency(person.reminderFrequency, days, person.reminderDayOfMonth);
}

export function getReminderScheduleText(person: Person): string {
  const frequency = getPersonReminderFrequency(person);
  const time = person.reminderTime ?? "08:00";
  if (frequency === "daily") return `Every day · ${time}`;
  if (frequency === "weekly") {
    return `${(person.reminderDaysOfWeek ?? []).length} weekly day${(person.reminderDaysOfWeek ?? []).length === 1 ? "" : "s"} · ${time}`;
  }
  if (frequency === "monthly") return `Monthly on day ${person.reminderDayOfMonth ?? 1} · ${time}`;
  return "Set prayer reminder";
}

// Helper: Determine if person should be prayed for today
export function shouldPrayForTodayByReminder(
  person: Person,
  todayDayOfWeek: number,
  todayDayOfMonth = new Date().getDate(),
): boolean {
  const frequency = getPersonReminderFrequency(person);
  if (frequency === "daily") return true;
  if (frequency === "weekly") return person.reminderDaysOfWeek.includes(todayDayOfWeek);
  if (frequency === "monthly") return person.reminderDayOfMonth === todayDayOfMonth;
  return false;
}

// Helper: Get list of people to pray for today
export function getPrayTodayList(people: Person[], todayDayOfWeek: number, todayDayOfMonth = new Date().getDate()): Person[] {
  return people.filter((person) => shouldPrayForTodayByReminder(person, todayDayOfWeek, todayDayOfMonth));
}

// Helper: Get urgent prayer items for a person
export function getUrgentPrayerItems(person: Person): PrayerItem[] {
  return person.prayerItems.filter((item) => item.isUrgent && !item.isDone);
}

// Helper: Color for Last Reached recency state
export function getLastReachedAccentColor(person: Person): string {
  const daysSince = getDaysSinceLastPrayed(person.lastPrayedDate);
  if (daysSince <= 7) return person.accentColor;
  if (daysSince <= 14) return LAST_REACHED_WARNING_COLOR;
  return LAST_REACHED_OVERDUE_COLOR;
}

export function hasPersonCompletedPrayerToday(person: Person, dateString = getTodayISOString()): boolean {
  return person.lastPrayerCompletedDate === dateString;
}

// Helper: Get daily prayer progress
export function getDailyPrayerProgress(prayTodayList: Person[]): { prayed: number; total: number } {
  const today = getTodayISOString();
  const prayed = prayTodayList.filter((p) => hasPersonCompletedPrayerToday(p, today)).length;
  return { prayed, total: prayTodayList.length };
}

// Helper: Get next person who needs prayer
export function getNextPrayerPerson(people: Person[]): Person | null {
  if (people.length === 0) return null;
  const today = getTodayISOString();
  const notPrayedYet = people.find((p) => !hasPersonCompletedPrayerToday(p, today));
  return notPrayedYet || null;
}

// Helper: Calculate a lightweight current streak from stored completion dates.
export function calculatePrayerStreak(people: Person[]): number {
  if (people.length === 0) return 0;
  return people.every((person) => hasPersonCompletedPrayerToday(person)) ? 1 : 0;
}

export function resetDailyPrayerCompletionsIfNeeded(people: Person[], dateString = getTodayISOString()): Person[] {
  return people.map((person) => {
    if (person.lastPrayerCompletedDate === dateString) return person;
    const hasCompletedItems = person.prayerItems.some((item) => item.isDone);
    if (!hasCompletedItems) return person;
    return {
      ...person,
      prayerItems: person.prayerItems.map((item) => ({ ...item, isDone: false })),
    };
  });
}

// Action: Mark every prayer item for this person as prayed today
export function markPersonPrayed(people: Person[], personId: string): Person[] {
  const today = getTodayISOString();
  return people.map((p) =>
    p.id === personId
      ? {
          ...p,
          lastPrayerCompletedDate: today,
          prayerItems: p.prayerItems.map((item) => ({ ...item, isDone: true })),
        }
      : p,
  );
}

// Action: Update person's last prayed/reached date
export function updatePersonLastPrayedDate(
  people: Person[],
  personId: string,
  dateString: string,
): Person[] {
  return people.map((p) =>
    p.id === personId ? { ...p, lastPrayedDate: dateString } : p,
  );
}

// Action: Update person's last reached date
export function updatePersonLastReachedDate(
  people: Person[],
  personId: string,
  dateString: string,
): Person[] {
  return updatePersonLastPrayedDate(people, personId, dateString);
}

// Action: Toggle prayer item urgent flag
export function togglePrayerItemUrgent(
  people: Person[],
  personId: string,
  itemId: string,
): Person[] {
  return people.map((p) =>
    p.id === personId
      ? {
          ...p,
          prayerItems: p.prayerItems.map((item) =>
            item.id === itemId ? { ...item, isUrgent: !item.isUrgent } : item,
          ),
        }
      : p,
  );
}

// Action: Toggle prayer item done flag
export function togglePrayerItemDone(
  people: Person[],
  personId: string,
  itemId: string,
): Person[] {
  const today = getTodayISOString();
  return people.map((p) => {
    if (p.id !== personId) return p;
    const prayerItems = p.prayerItems.map((item) =>
      item.id === itemId ? { ...item, isDone: !item.isDone } : item,
    );
    const allDone = prayerItems.length > 0 && prayerItems.every((item) => item.isDone);
    return {
      ...p,
      prayerItems,
      lastPrayerCompletedDate: allDone ? today : p.lastPrayerCompletedDate === today ? null : p.lastPrayerCompletedDate,
    };
  });
}

// Action: Add prayer item to person
export function addPrayerItem(
  people: Person[],
  personId: string,
  title: string,
): Person[] {
  const trimmed = title.trim();
  if (!trimmed) return people;

  return people.map((p) =>
    p.id === personId
      ? {
          ...p,
          lastPrayerCompletedDate: p.lastPrayerCompletedDate === getTodayISOString() ? null : p.lastPrayerCompletedDate,
          prayerItems: [
            ...p.prayerItems,
            {
              id: `item-${Date.now()}`,
              title: trimmed,
              isUrgent: false,
              isDone: false,
            },
          ],
        }
      : p,
  );
}

// Action: Remove prayer item from person
export function removePrayerItem(
  people: Person[],
  personId: string,
  itemId: string,
): Person[] {
  return people.map((p) =>
    p.id === personId
      ? {
          ...p,
          prayerItems: p.prayerItems.filter((item) => item.id !== itemId),
        }
      : p,
  );
}

// Action: Update person's reminder days
export function updatePersonReminder(
  people: Person[],
  personId: string,
  daysOfWeek: number[],
): Person[] {
  const normalizedDays = dedupeAndSortReminderDays(daysOfWeek);
  const frequency = normalizeReminderFrequency(undefined, normalizedDays);
  return people.map((p) =>
    p.id === personId
      ? {
          ...p,
          reminderDaysOfWeek: normalizedDays,
          reminderFrequency: frequency,
          reminderDayOfMonth: undefined,
        }
      : p,
  );
}

// Action: Update person's reminder days, frequency, monthly day, and time
export function updatePersonReminderWithTime(
  people: Person[],
  personId: string,
  daysOfWeek: number[],
  reminderTime?: string,
  reminderFrequency?: ReminderFrequency,
  reminderDayOfMonth?: number,
): Person[] {
  const normalizedDays = dedupeAndSortReminderDays(daysOfWeek);
  const normalizedMonthDay = normalizeReminderDayOfMonth(reminderDayOfMonth);
  const frequency = normalizeReminderFrequency(reminderFrequency, normalizedDays, normalizedMonthDay);
  return people.map((p) =>
    p.id === personId
      ? {
          ...p,
          reminderDaysOfWeek: frequency === "weekly" ? normalizedDays : [],
          reminderFrequency: frequency,
          reminderDayOfMonth: frequency === "monthly" ? normalizedMonthDay : undefined,
          reminderTime: frequency === "none" ? undefined : normalizeOptionalText(reminderTime),
        }
      : p,
  );
}

// Action: Update person's photo
export function updatePersonPhoto(
  people: Person[],
  personId: string,
  photoUri?: string,
): Person[] {
  return people.map((p) =>
    p.id === personId
      ? {
          ...p,
          photoUri: normalizeOptionalText(photoUri),
        }
      : p,
  );
}

// Action: Update person's prayer note
export function updatePersonPrayerNote(
  people: Person[],
  personId: string,
  prayerNote?: string,
): Person[] {
  return people.map((p) =>
    p.id === personId
      ? {
          ...p,
          prayerNote: normalizeOptionalText(prayerNote),
        }
      : p,
  );
}

export function normalizePeopleForStorage(people: Person[]): Person[] {
  const seenIds = new Set<string>();

  return people.map((person, index) => {
    const relationship = relationshipColors[person.relationship] ? person.relationship : "Friends";
    const colors = relationshipColors[relationship];
    const trimmedName = person.name?.trim() || "Unnamed Person";
    const initials =
      person.initials?.trim() ||
      trimmedName
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) ||
      "?";
    let id = typeof person.id === "string" && person.id.trim() ? person.id.trim() : `person-migrated-${Date.now()}-${index}`;
    if (seenIds.has(id)) id = `${id}-${index}-${Math.random().toString(36).slice(2, 7)}`;
    seenIds.add(id);

    return {
      ...person,
      id,
      name: trimmedName,
      initials,
      relationship,
      avatarColor: person.avatarColor || colors.avatar,
      accentColor: person.accentColor || colors.accent,
      reminderDaysOfWeek: Array.isArray(person.reminderDaysOfWeek) ? person.reminderDaysOfWeek : [],
      prayerItems: Array.isArray(person.prayerItems) ? person.prayerItems : [],
      lastPrayedDate: person.lastPrayedDate ?? null,
      lastPrayerCompletedDate: person.lastPrayerCompletedDate ?? null,
    };
  });
}

// Action: Add new person
export function addPerson(
  people: Person[],
  name: string,
  relationship: RelationshipType,
  options: AddPersonOptions = {},
): Person[] {
  const trimmedName = name.trim();
  if (!trimmedName) return people;

  const colors = relationshipColors[relationship];
  const reminderDaysOfWeek = dedupeAndSortReminderDays(options.reminderDaysOfWeek ?? []);
  const reminderDayOfMonth = normalizeReminderDayOfMonth(options.reminderDayOfMonth);
  const reminderFrequency = normalizeReminderFrequency(options.reminderFrequency, reminderDaysOfWeek, reminderDayOfMonth);

  const initials = trimmedName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return [
    ...people,
    {
      id: `person-${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${people.length}`,
      name: trimmedName,
      initials,
      relationship,
      avatarColor: colors.avatar,
      accentColor: colors.accent,
      lastPrayedDate: null,
      lastPrayerCompletedDate: null,
      birthday: normalizeOptionalText(options.birthday),
      prayerNote: normalizeOptionalText(options.prayerNote),
      reminderTag: normalizeOptionalText(options.reminderTag),
      avatarLabel: normalizeOptionalText(options.avatarLabel),
      photoUri: normalizeOptionalText(options.photoUri),
      reminderFrequency,
      reminderDayOfMonth: reminderFrequency === "monthly" ? reminderDayOfMonth : undefined,
      reminderTime: reminderFrequency === "none" ? undefined : normalizeOptionalText(options.reminderTime),
      prayerItems: [],
      reminderDaysOfWeek: reminderFrequency === "weekly" ? reminderDaysOfWeek : [],
    },
  ];
}

// Action: Remove person
export function removePerson(people: Person[], personId: string): Person[] {
  return people.filter((p) => p.id !== personId);
}

// Action: Prepend journal entry
export function prependJournalEntry(
  journal: JournalEntry[],
  person: Person,
  note: string,
  entryId: string,
): JournalEntry[] {
  const trimmed = note.trim();
  if (!trimmed) return journal;

  const today = getTodayISOString();
  return [
    {
      id: entryId,
      personId: person.id,
      personName: person.name,
      date: today,
      note: trimmed,
    },
    ...journal,
  ];
}

// Helper: Get initial state
export function getInitialState() {
  return {
    people: initialPeople,
    journal: initialJournal,
  };
}
