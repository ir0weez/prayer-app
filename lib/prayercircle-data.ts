export type PrayerItem = {
  id: string;
  title: string;
  isUrgent: boolean;
  isDone: boolean;
};

export type RelationshipType = "Family" | "Friends" | "Ministry" | "Prospect";

export type Person = {
  id: string;
  name: string;
  initials: string;
  relationship: RelationshipType;
  lastPrayedDate: string | null; // ISO date string (YYYY-MM-DD) or null
  reminderDaysOfWeek: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  accentColor: string;
  avatarColor: string;
  birthday?: string;
  prayerNote?: string;
  reminderTag?: string;
  avatarLabel?: string;
  prayerItems: PrayerItem[];
};

export type AddPersonOptions = {
  birthday?: string;
  prayerNote?: string;
  reminderDaysOfWeek?: number[];
  reminderTag?: string;
  avatarLabel?: string;
};

function normalizeOptionalText(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export type JournalEntry = {
  id: string;
  personId: string;
  personName: string;
  date: string;
  note: string;
};

// Relationship type to color mapping
export const relationshipColors: Record<RelationshipType, { avatar: string; accent: string }> = {
  Family: { avatar: "#A78BFA", accent: "#7C3AED" }, // Purple
  Friends: { avatar: "#86EFAC", accent: "#22C55E" }, // Green
  Ministry: { avatar: "#FED7AA", accent: "#EA580C" }, // Orange
  Prospect: { avatar: "#D1D5DB", accent: "#6B7280" }, // Grey
};

// Start with blank data
export const initialPeople: Person[] = [];

export const initialJournal: JournalEntry[] = [];

// Helper: Get days since last prayed
export function getDaysSinceLastPrayed(lastPrayedDate: string | null): number {
  if (!lastPrayedDate) return 999; // Never prayed

  const last = new Date(lastPrayedDate + "T00:00:00Z");
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const diff = today.getTime() - last.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

// Helper: Format days since last prayer for display
export function formatDaysSinceLastPrayer(daysSince: number): string {
  if (daysSince === 0) return "Today";
  if (daysSince === 1) return "1d";
  if (daysSince < 7) return `${daysSince}d`;
  if (daysSince < 30) return `${Math.floor(daysSince / 7)}w`;
  if (daysSince < 365) return `${Math.floor(daysSince / 30)}m`;
  return "—";
}

// Helper: Get today's ISO date string
export function getTodayISOString(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

// Helper: Determine if person should be prayed for today
export function shouldPrayForTodayByReminder(person: Person, todayDayOfWeek: number): boolean {
  return person.reminderDaysOfWeek.includes(todayDayOfWeek);
}

// Helper: Get list of people to pray for today
export function getPrayTodayList(people: Person[], todayDayOfWeek: number): Person[] {
  return people.filter((person) => shouldPrayForTodayByReminder(person, todayDayOfWeek));
}

// Helper: Get urgent prayer items for a person
export function getUrgentPrayerItems(person: Person): PrayerItem[] {
  return person.prayerItems.filter((item) => item.isUrgent && !item.isDone);
}

// Helper: Get daily prayer progress
export function getDailyPrayerProgress(prayTodayList: Person[]): { prayed: number; total: number } {
  const today = getTodayISOString();
  const prayed = prayTodayList.filter((p) => p.lastPrayedDate === today).length;
  return { prayed, total: prayTodayList.length };
}

// Helper: Get next person who needs prayer
export function getNextPrayerPerson(people: Person[]): Person | null {
  if (people.length === 0) return null;
  const today = getTodayISOString();
  const notPrayedYet = people.find((p) => p.lastPrayedDate !== today);
  return notPrayedYet || null;
}

// Helper: Calculate prayer streak (consecutive days of praying for all people)
export function calculatePrayerStreak(people: Person[]): number {
  if (people.length === 0) return 0;

  let streak = 0;
  let currentDate = new Date();
  currentDate.setUTCHours(0, 0, 0, 0);

  while (true) {
    const dateString = currentDate.toISOString().split("T")[0];
    const allPrayedOnDate = people.every((p) => p.lastPrayedDate === dateString);

    if (!allPrayedOnDate) break;

    streak++;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
}

// Action: Mark person as prayed today
export function markPersonPrayed(people: Person[], personId: string): Person[] {
  const today = getTodayISOString();
  return people.map((p) =>
    p.id === personId ? { ...p, lastPrayedDate: today } : p,
  );
}

// Action: Update person's last prayed date
export function updatePersonLastPrayedDate(
  people: Person[],
  personId: string,
  dateString: string,
): Person[] {
  return people.map((p) =>
    p.id === personId ? { ...p, lastPrayedDate: dateString } : p,
  );
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
  return people.map((p) =>
    p.id === personId
      ? {
          ...p,
          prayerItems: p.prayerItems.map((item) =>
            item.id === itemId ? { ...item, isDone: !item.isDone } : item,
          ),
        }
      : p,
  );
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
  return people.map((p) =>
    p.id === personId
      ? {
          ...p,
          reminderDaysOfWeek: daysOfWeek,
        }
      : p,
  );
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

  const initials = trimmedName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return [
    ...people,
    {
      id: `person-${Date.now()}`,
      name: trimmedName,
      initials,
      relationship,
      avatarColor: colors.avatar,
      accentColor: colors.accent,
      lastPrayedDate: null,
      birthday: normalizeOptionalText(options.birthday),
      prayerNote: normalizeOptionalText(options.prayerNote),
      reminderTag: normalizeOptionalText(options.reminderTag),
      avatarLabel: normalizeOptionalText(options.avatarLabel),
      prayerItems: [],
      reminderDaysOfWeek: options.reminderDaysOfWeek ?? [],
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
