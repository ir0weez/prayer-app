export type PrayerItem = {
  id: string;
  title: string;
  isUrgent: boolean;
  isDone: boolean;
  isEmergency?: boolean;
  emergencyExpiresAt?: string;
};

export type RelationshipType = "Family" | "Friends" | "Ministry" | "Prospect";
export type ReminderFrequency = "none" | "daily" | "weekly" | "monthly";
export type FamilyType = "Spouse" | "Child" | "Other"; // For organizing family hierarchy

export type PersonalTodo = {
  id: string;
  title: string;
  description?: string;
  scheduledTime: string; // ISO datetime string (YYYY-MM-DDTHH:mm:ss) or HH:mm time only
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday. If empty, shows every day.
  color?: string; // Hex color code (e.g., "#8B5CF6", "#EF4444", "#10B981", "#F59E0B", "#3B82F6")
  isDone: boolean;
  completedAt?: string; // ISO datetime string when completed
  order: number; // Sequential order for completion
};

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
  familyId?: string; // ID of the family group this person belongs to (if any)
  familyName?: string; // Display name for the family group (e.g., "Gutierrez Family")
  spouseId?: string; // ID of spouse if married (for organizing family hierarchy)
  familyType?: FamilyType; // Type of family member: Spouse, Child, or Other
  isPersonal?: boolean; // Mark this contact as yourself for personal to-do list
  personalTodos?: PersonalTodo[]; // To-do items for personal profile
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

  // Parse the date string (format: YYYY-MM-DD) and create a local date
  const [year, month, day] = lastPrayedDate.split('-').map(Number);
  const last = new Date(year, month - 1, day, 0, 0, 0, 0);
  
  // Get today's local date
  const today = new Date();
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);

  const diff = todayLocal.getTime() - last.getTime();
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

// Helper: Get today's ISO date string (using local device date, not UTC)
export function getTodayISOString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const date = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
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
      personalTodos: Array.isArray(person.personalTodos) ? person.personalTodos : [],
      lastPrayedDate: person.lastPrayedDate ?? null,
      lastPrayerCompletedDate: person.lastPrayerCompletedDate ?? null,
      isPersonal: person.isPersonal ?? false,
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
      personalTodos: [],
      reminderDaysOfWeek: reminderFrequency === "weekly" ? reminderDaysOfWeek : [],
      isPersonal: false,
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

// Helper: Extract last name from full name
function getLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
}

// Helper: Get family members (people with the same familyId)
export function getFamilyMembers(people: Person[], familyId: string): Person[] {
  return people.filter((p) => p.familyId === familyId);
}

// Helper: Get all family groups
export function getFamilyGroups(people: Person[]): Array<{ familyId: string; familyName: string; members: Person[] }> {
  const grouped = new Map<string, Person[]>();
  people.forEach((person) => {
    if (person.familyId) {
      const members = grouped.get(person.familyId) || [];
      members.push(person);
      grouped.set(person.familyId, members);
    }
  });
  return Array.from(grouped.entries()).map(([familyId, members]) => ({
    familyId,
    familyName: members[0]?.familyName || "Family",
    members,
  }));
}

// Action: Group people into a family
export function groupIntoFamily(people: Person[], personIds: string[], familyTypes?: Record<string, FamilyType | undefined>): Person[] {
  if (personIds.length < 2) return people; // Need at least 2 people to form a family

  // Check if any of the selected people are already in a family
  const existingFamilyIds = new Set<string>();
  const selectedPeople = people.filter((p) => personIds.includes(p.id));
  selectedPeople.forEach((person) => {
    if (person.familyId) {
      existingFamilyIds.add(person.familyId);
    }
  });

  // If there are existing families, merge them all into one
  // Use the first existing familyId if available, otherwise create a new one
  let familyId: string;
  if (existingFamilyIds.size > 0) {
    // Reuse the first existing family ID
    familyId = Array.from(existingFamilyIds)[0];
  } else {
    // Create a new family ID
    familyId = `family-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  const lastName = getLastName(selectedPeople[0]?.name || "Family");
  const familyName = `${lastName} Family`;

  // Add all selected people to the family, and also add any existing family members
  const allFamilyMemberIds = new Set(personIds);
  people.forEach((person) => {
    if (existingFamilyIds.has(person.familyId || "")) {
      allFamilyMemberIds.add(person.id);
    }
  });

  return people.map((person) =>
    allFamilyMemberIds.has(person.id)
      ? {
          ...person,
          familyId,
          familyName,
          familyType: familyTypes?.[person.id],
        }
      : person,
  );
}

// Action: Remove person from family (ungroup)
export function ungroupFromFamily(people: Person[], personId: string): Person[] {
  return people.map((person) =>
    person.id === personId
      ? {
          ...person,
          familyId: undefined,
          familyName: undefined,
        }
      : person,
  );
}

// Helper: Get initial state
export function getInitialState() {
  return {
    people: initialPeople,
    journal: initialJournal,
  };
}

// Helper: Add emergency prayer to a person
export function addEmergencyPrayer(person: Person, title: string, durationHours: number = 24): Person {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
  const emergencyItem: PrayerItem = {
    id: `emergency-${Date.now()}`,
    title,
    isUrgent: true,
    isDone: false,
    isEmergency: true,
    emergencyExpiresAt: expiresAt,
  };
  return {
    ...person,
    prayerItems: [emergencyItem, ...person.prayerItems],
  };
}

// Helper: Remove expired emergency prayers
export function removeExpiredEmergencyPrayers(person: Person): Person {
  const now = new Date().toISOString();
  return {
    ...person,
    prayerItems: person.prayerItems.filter(
      (item) => !item.isEmergency || !item.emergencyExpiresAt || item.emergencyExpiresAt > now,
    ),
  };
}

// Helper: Remove expired emergency prayers from all people
export function removeExpiredEmergencyPrayersFromAll(people: Person[]): Person[] {
  return people.map(removeExpiredEmergencyPrayers);
}

// Helper: Get remaining time for emergency prayer in milliseconds
export function getEmergencyPrayerTimeRemaining(emergencyExpiresAt: string | undefined): number {
  if (!emergencyExpiresAt) return 0;
  const expiresTime = new Date(emergencyExpiresAt).getTime();
  const now = new Date().getTime();
  return Math.max(0, expiresTime - now);
}

// Helper: Format remaining time as "Xh Ym" or "Xm Ys"
export function formatEmergencyPrayerCountdown(millisRemaining: number): string {
  if (millisRemaining <= 0) return "Expired";
  
  const totalSeconds = Math.floor(millisRemaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

// Helper: Get all active emergency prayers across all people
export function getAllActiveEmergencyPrayers(people: Person[]): Array<{ person: Person; item: PrayerItem }> {
  const now = new Date().toISOString();
  const emergencies: Array<{ person: Person; item: PrayerItem }> = [];
  
  people.forEach((person) => {
    person.prayerItems.forEach((item) => {
      if (item.isEmergency && item.emergencyExpiresAt && item.emergencyExpiresAt > now) {
        emergencies.push({ person, item });
      }
    });
  });
  
  return emergencies;
}

// Helper: Get progress percentage (0-1) for emergency prayer countdown
export function getEmergencyPrayerProgress(emergencyExpiresAt: string | undefined): number {
  if (!emergencyExpiresAt) return 1;
  
  const expiresTime = new Date(emergencyExpiresAt).getTime();
  const createdTime = expiresTime - (24 * 60 * 60 * 1000); // 24 hours in ms
  const now = new Date().getTime();
  
  const totalDuration = expiresTime - createdTime;
  const elapsed = now - createdTime;
  
  return Math.max(0, Math.min(1, 1 - (elapsed / totalDuration)));
}

// Helper: Add personal to-do to a person
export function addPersonalTodo(person: Person, title: string, scheduledTime: string, description?: string, daysOfWeek?: number[], color?: string): Person {
  if (!person.isPersonal) return person;
  
  const todos = person.personalTodos || [];
  const maxOrder = todos.length > 0 ? Math.max(...todos.map(t => t.order)) : -1;
  
  const newTodo: PersonalTodo = {
    id: `todo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: title.trim(),
    description: description?.trim(),
    scheduledTime,
    daysOfWeek: daysOfWeek && daysOfWeek.length > 0 ? daysOfWeek : undefined,
    color: color || "#8B5CF6",
    isDone: false,
    order: maxOrder + 1,
  };
  
  return {
    ...person,
    personalTodos: [...todos, newTodo],
  };
}

// Helper: Mark personal to-do as done
export function completePersonalTodo(person: Person, todoId: string): Person {
  if (!person.isPersonal || !person.personalTodos) return person;
  
  return {
    ...person,
    personalTodos: person.personalTodos.map(todo =>
      todo.id === todoId
        ? { ...todo, isDone: true, completedAt: new Date().toISOString() }
        : todo
    ),
  };
}

// Helper: Remove personal to-do
export function removePersonalTodo(person: Person, todoId: string): Person {
  if (!person.isPersonal || !person.personalTodos) return person;
  
  return {
    ...person,
    personalTodos: person.personalTodos.filter(todo => todo.id !== todoId),
  };
}

// Helper: Get next incomplete personal to-do
export function getNextPersonalTodo(person: Person): PersonalTodo | undefined {
  if (!person.isPersonal || !person.personalTodos) return undefined;
  
  const incomplete = person.personalTodos.filter(todo => !todo.isDone);
  if (incomplete.length === 0) return undefined;
  
  // Sort by order and return the first one
  return incomplete.sort((a, b) => a.order - b.order)[0];
}

// Helper: Get due personal to-dos (scheduled time has passed)
export function getDuePersonalTodos(person: Person): PersonalTodo[] {
  if (!person.isPersonal || !person.personalTodos) return [];
  
  const now = new Date();
  const currentDayOfWeek = now.getDay();
  
  // Return all pending to-dos (not done) that match the current day of week
  // They will show in the thought bubble regardless of time
  return person.personalTodos.filter(todo => {
    if (todo.isDone) return false;
    
    // If no specific days are set, show on all days
    if (!todo.daysOfWeek || todo.daysOfWeek.length === 0) return true;
    
    // Check if today is in the allowed days of week
    return todo.daysOfWeek.includes(currentDayOfWeek);
  }).sort((a, b) => a.order - b.order);
}

// Helper: Mark a contact as personal
export function setPersonAsPersonal(people: Person[], personId: string, isPersonal: boolean): Person[] {
  return people.map(person =>
    person.id === personId
      ? {
          ...person,
          isPersonal,
          personalTodos: isPersonal ? (person.personalTodos || []) : undefined,
        }
      : person
  );
}

// Helper: Get all personal contacts
export function getPersonalContacts(people: Person[]): Person[] {
  return people.filter(person => person.isPersonal);
}


// Helper: Get icon name based on to-do title keywords
export function getIconForTodo(title: string): string {
  const lower = title.toLowerCase();
  
  // Prayer-related
  if (lower.includes("pray") || lower.includes("prayer")) return "favorite";
  
  // Dental/Teeth-related
  if (lower.includes("brush") || lower.includes("teeth") || lower.includes("tooth") || lower.includes("dental") || lower.includes("floss")) return "cleaning-services";
  
  // Mental health/Therapy-related
  if (lower.includes("therapy") || lower.includes("counseling") || lower.includes("permission") || lower.includes("internal") || lower.includes("meditation")) return "sentiment-satisfied";
  
  // Questions/Learning-related
  if (lower.includes("question") || lower.includes("answer") || lower.includes("quiz") || lower.includes("test")) return "help";
  
  // Language learning (Duolingo, etc.)
  if (lower.includes("duolingo") || lower.includes("language") || lower.includes("spanish") || lower.includes("french") || lower.includes("german") || lower.includes("learn language")) return "translate";
  
  // Schedule/Plan-related
  if (lower.includes("schedule") || lower.includes("plan") || lower.includes("meeting")) return "event";
  
  // Eat/Food-related
  if (lower.includes("eat") || lower.includes("meal") || lower.includes("lunch") || lower.includes("dinner") || lower.includes("breakfast") || lower.includes("food") || lower.includes("snack")) return "restaurant";
  
  // Sleep/Rest-related
  if (lower.includes("sleep") || lower.includes("rest") || lower.includes("nap") || lower.includes("bed")) return "nights-stay";
  
  // Exercise/Fitness-related
  if (lower.includes("exercise") || lower.includes("workout") || lower.includes("run") || lower.includes("gym") || lower.includes("walk") || lower.includes("sport") || lower.includes("yoga")) return "directions-run";
  
  // Study/Learn-related (excluding language learning which is handled above)
  if ((lower.includes("study") || lower.includes("learn") || lower.includes("read") || lower.includes("book")) && !lower.includes("language")) return "school";
  
  // Work-related
  if (lower.includes("work") || lower.includes("project") || lower.includes("task") || lower.includes("email")) return "work";
  
  // Call/Communication-related
  if (lower.includes("call") || lower.includes("text") || lower.includes("message") || lower.includes("contact")) return "phone";
  
  // Shopping/Errands
  if (lower.includes("shop") || lower.includes("buy") || lower.includes("errand") || lower.includes("store")) return "shopping-cart";
  
  // Health/Doctor
  if (lower.includes("doctor") || lower.includes("health") || lower.includes("medicine") || lower.includes("appointment")) return "local-hospital";
  
  // Default icon
  return "task-alt";
}
