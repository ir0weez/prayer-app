export type PrayerItem = {
  id: string;
  title: string;
  isUrgent: boolean;
  isDone: boolean;
};

export type Person = {
  id: string;
  name: string;
  initials: string;
  relationship: string;
  birthday: string;
  intention: string;
  lastPrayedDaysAgo: number;
  reminder: string;
  reminderDaysOfWeek: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  accentColor: string;
  prayedToday: boolean;
  avatarColor: string;
  prayerItems: PrayerItem[];
};

export type JournalEntry = {
  id: string;
  personId: string;
  personName: string;
  date: string;
  note: string;
};

export const initialPeople: Person[] = [
  {
    id: "cody",
    name: "Cody Pattee",
    initials: "CP",
    relationship: "Friends",
    birthday: "May 6",
    intention: "Wisdom at work and a steady rhythm of rest.",
    lastPrayedDaysAgo: 1,
    reminder: "Mondays and Thursdays",
    reminderDaysOfWeek: [1, 4], // Monday (1) and Thursday (4)
    accentColor: "#5DADE2",
    prayedToday: true,
    avatarColor: "#D4A574",
    prayerItems: [
      { id: "p1", title: "Kurt", isUrgent: false, isDone: false },
      { id: "p2", title: "Work", isUrgent: true, isDone: false },
      { id: "p3", title: "Family", isUrgent: false, isDone: false },
    ],
  },
  {
    id: "damian",
    name: "Damian Lopez",
    initials: "DL",
    relationship: "Friends",
    birthday: "June 14",
    intention: "Healing, practical support, and a hopeful week.",
    lastPrayedDaysAgo: 23,
    reminder: "Weekly on Saturday",
    reminderDaysOfWeek: [6], // Saturday (6)
    accentColor: "#F85C5C",
    prayedToday: true,
    avatarColor: "#7FD8BE",
    prayerItems: [],
  },
  {
    id: "gary",
    name: "Gary Martin",
    initials: "GM",
    relationship: "Friends",
    birthday: "July 2",
    intention: "Peace and clarity in decisions.",
    lastPrayedDaysAgo: 0,
    reminder: "Daily",
    reminderDaysOfWeek: [0, 1, 2, 3, 4, 5, 6], // Every day
    accentColor: "#5DADE2",
    prayedToday: true,
    avatarColor: "#7FD8BE",
    prayerItems: [],
  },
  {
    id: "joel",
    name: "Joel Gonzalez",
    initials: "JG",
    relationship: "Friends",
    birthday: "August 10",
    intention: "Strength and encouragement.",
    lastPrayedDaysAgo: 23,
    reminder: "Twice a week",
    reminderDaysOfWeek: [2, 5], // Wednesday (2) and Saturday (5)
    accentColor: "#F85C5C",
    prayedToday: true,
    avatarColor: "#7FD8BE",
    prayerItems: [],
  },
  {
    id: "juan",
    name: "Juan Aguirre",
    initials: "JA",
    relationship: "Friends",
    birthday: "September 5",
    intention: "Guidance and wisdom.",
    lastPrayedDaysAgo: 6,
    reminder: "Weekly",
    reminderDaysOfWeek: [1], // Monday (1)
    accentColor: "#5DADE2",
    prayedToday: true,
    avatarColor: "#7FD8BE",
    prayerItems: [],
  },
  {
    id: "kim",
    name: "Kim Crouch",
    initials: "KC",
    relationship: "Friends",
    birthday: "October 12",
    intention: "Joy and peace.",
    lastPrayedDaysAgo: 23,
    reminder: "Mondays",
    reminderDaysOfWeek: [1], // Monday (1)
    accentColor: "#F85C5C",
    prayedToday: true,
    avatarColor: "#7FD8BE",
    prayerItems: [],
  },
  {
    id: "richard",
    name: "Richard Juarez",
    initials: "RJ",
    relationship: "Friends",
    birthday: "November 20",
    intention: "Blessings and protection.",
    lastPrayedDaysAgo: 6,
    reminder: "Thursdays",
    reminderDaysOfWeek: [4], // Thursday (4)
    accentColor: "#5DADE2",
    prayedToday: true,
    avatarColor: "#7FD8BE",
    prayerItems: [],
  },
];

export const initialJournal: JournalEntry[] = [
  {
    id: "j1",
    personId: "cody",
    personName: "Cody Pattee",
    date: "Today",
    note: "Prayed for clarity before his client meeting and a peaceful conversation afterward.",
  },
  {
    id: "j2",
    personId: "damian",
    personName: "Damian Lopez",
    date: "Yesterday",
    note: "Asked for patience, safe travel, and the right people around him.",
  },
  {
    id: "j3",
    personId: "gary",
    personName: "Gary Martin",
    date: "Monday",
    note: "Prayed for healing and a reminder that he is not carrying everything alone.",
  },
];

export function markPersonPrayed(people: Person[], personId: string): Person[] {
  return people.map((person) =>
    person.id === personId ? { ...person, prayedToday: true, lastPrayedDaysAgo: 0 } : person,
  );
}

export function getNextPrayerPerson(people: Person[]): Person | undefined {
  return people.find((person) => !person.prayedToday) ?? people[0];
}

export function getDailyPrayerProgress(people: Person[]): { prayed: number; total: number } {
  return {
    prayed: people.filter((person) => person.prayedToday).length,
    total: people.length,
  };
}

export function shouldPrayForTodayByReminder(person: Person, dayOfWeek: number): boolean {
  return person.reminderDaysOfWeek.includes(dayOfWeek);
}

export function getPrayTodayList(people: Person[], dayOfWeek: number): Person[] {
  return people.filter((person) => shouldPrayForTodayByReminder(person, dayOfWeek));
}

export function togglePrayerItemUrgent(
  people: Person[],
  personId: string,
  itemId: string,
): Person[] {
  return people.map((person) =>
    person.id === personId
      ? {
          ...person,
          prayerItems: person.prayerItems.map((item) =>
            item.id === itemId ? { ...item, isUrgent: !item.isUrgent } : item,
          ),
        }
      : person,
  );
}

export function togglePrayerItemDone(
  people: Person[],
  personId: string,
  itemId: string,
): Person[] {
  return people.map((person) =>
    person.id === personId
      ? {
          ...person,
          prayerItems: person.prayerItems.map((item) =>
            item.id === itemId ? { ...item, isDone: !item.isDone } : item,
          ),
        }
      : person,
  );
}

export function addPrayerItem(
  people: Person[],
  personId: string,
  title: string,
): Person[] {
  const trimmed = title.trim();
  if (!trimmed) return people;

  return people.map((person) =>
    person.id === personId
      ? {
          ...person,
          prayerItems: [
            ...person.prayerItems,
            {
              id: `item-${Date.now()}`,
              title: trimmed,
              isUrgent: false,
              isDone: false,
            },
          ],
        }
      : person,
  );
}

export function removePrayerItem(
  people: Person[],
  personId: string,
  itemId: string,
): Person[] {
  return people.map((person) =>
    person.id === personId
      ? {
          ...person,
          prayerItems: person.prayerItems.filter((item) => item.id !== itemId),
        }
      : person,
  );
}

export function getUrgentPrayerItems(person: Person): PrayerItem[] {
  return person.prayerItems.filter((item) => item.isUrgent);
}

export function prependJournalEntry(
  journal: JournalEntry[],
  person: Person,
  note: string,
  id: string,
): JournalEntry[] {
  const trimmed = note.trim();
  if (!trimmed) {
    return journal;
  }

  return [
    {
      id,
      personId: person.id,
      personName: person.name,
      date: "Today",
      note: trimmed,
    },
    ...journal,
  ];
}

export function formatDaysSinceLastPrayer(days: number): string {
  if (days === 0) return "—";
  if (days === 1) return "1d";
  return `${days}d`;
}
