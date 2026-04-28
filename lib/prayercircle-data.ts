export type Person = {
  id: string;
  name: string;
  initials: string;
  relationship: string;
  birthday: string;
  intention: string;
  lastPrayed: string;
  reminder: string;
  accent: string;
  prayedToday: boolean;
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
    id: "mara",
    name: "Mara Lewis",
    initials: "ML",
    relationship: "Sister",
    birthday: "Today",
    intention: "Peace during her move and encouragement for the next step.",
    lastPrayed: "Yesterday",
    reminder: "Every morning at 8:30",
    accent: "#8C6DFF",
    prayedToday: false,
  },
  {
    id: "daniel",
    name: "Daniel Park",
    initials: "DP",
    relationship: "Friend",
    birthday: "May 6",
    intention: "Wisdom at work and a steady rhythm of rest.",
    lastPrayed: "Today",
    reminder: "Mondays and Thursdays",
    accent: "#6E8BFF",
    prayedToday: true,
  },
  {
    id: "elena",
    name: "Elena Cruz",
    initials: "EC",
    relationship: "Neighbor",
    birthday: "June 14",
    intention: "Healing, practical support, and a hopeful week.",
    lastPrayed: "3 days ago",
    reminder: "Weekly on Saturday",
    accent: "#B06BFF",
    prayedToday: false,
  },
];

export const initialJournal: JournalEntry[] = [
  {
    id: "j1",
    personId: "daniel",
    personName: "Daniel Park",
    date: "Today",
    note: "Prayed for clarity before his client meeting and a peaceful conversation afterward.",
  },
  {
    id: "j2",
    personId: "mara",
    personName: "Mara Lewis",
    date: "Yesterday",
    note: "Asked for patience, safe travel, and the right people around her during the move.",
  },
  {
    id: "j3",
    personId: "elena",
    personName: "Elena Cruz",
    date: "Monday",
    note: "Prayed for healing and a reminder that she is not carrying everything alone.",
  },
];

export function markPersonPrayed(people: Person[], personId: string): Person[] {
  return people.map((person) =>
    person.id === personId ? { ...person, prayedToday: true, lastPrayed: "Today" } : person,
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
