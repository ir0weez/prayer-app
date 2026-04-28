export type Person = {
  id: string;
  name: string;
  initials: string;
  relationship: string;
  birthday: string;
  intention: string;
  lastPrayedDaysAgo: number;
  reminder: string;
  accentColor: string;
  prayedToday: boolean;
  avatarColor: string;
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
    accentColor: "#5DADE2",
    prayedToday: true,
    avatarColor: "#D4A574",
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
    accentColor: "#F85C5C",
    prayedToday: true,
    avatarColor: "#7FD8BE",
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
    accentColor: "#5DADE2",
    prayedToday: true,
    avatarColor: "#7FD8BE",
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
    accentColor: "#F85C5C",
    prayedToday: true,
    avatarColor: "#7FD8BE",
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
    accentColor: "#5DADE2",
    prayedToday: true,
    avatarColor: "#7FD8BE",
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
    accentColor: "#F85C5C",
    prayedToday: true,
    avatarColor: "#7FD8BE",
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
    accentColor: "#5DADE2",
    prayedToday: true,
    avatarColor: "#7FD8BE",
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
