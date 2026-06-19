import { getTodayISOString } from "./prayercircle-data";

// ─── Storage Keys ────────────────────────────────────────────────────────────
export const SCHEDULE_EVENTS_KEY = "prayercircle.schedule.events.v1";
export const SCHEDULE_TODOS_KEY = "prayercircle.schedule.todos.v1";
export const SCHEDULE_MINISTRIES_KEY = "prayercircle.schedule.ministries.v1";
export const SCHEDULE_BIBLE_STUDIES_KEY = "prayercircle.schedule.biblestudies.v1";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ScheduleItemType = "event" | "todo" | "ministry" | "birthday";

export type ScheduleEvent = {
  id: string;
  title: string;
  date: string; // ISO YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  location?: string;
  notes?: string;
  isCompleted: boolean;
  completedAt?: string;
  color?: string; // Override color
  keyword?: string; // Detected keyword for illustration
  linkedPeopleIds?: string[]; // IDs of people from prayer list linked to this event
};

export type ScheduleTodo = {
  id: string;
  title: string;
  date: string; // ISO YYYY-MM-DD
  startTime?: string; // HH:mm
  isCompleted: boolean;
  completedAt?: string;
  icon?: string; // MaterialIcons name
  color?: string;
  order: number;
  linkedPeopleIds?: string[]; // IDs of people from prayer list linked to this todo
  linkedEventId?: string; // ID of event this todo is linked to
  linkedMinistryId?: string; // ID of ministry this todo is linked to
  linkedEventTitle?: string; // Cached title of linked event (for persistence)
  linkedMinistryTitle?: string; // Cached title of linked ministry (for persistence)
  linkedEventColor?: string; // Cached color of linked event
  linkedMinistryColor?: string; // Cached color of linked ministry
  tag?: string; // Tag for todo (Ministry/Event/Family/Therapy/Personal)
};

export type BibleStudySession = {
  id: string;
  book: string;
  chapter: number;
  date: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  isCompleted: boolean;
  completedAt?: string;
};

export type ScheduleMinistry = {
  id: string;
  title: string;
  type: string; // e.g., "Outreach", "Teaching", "Worship", "Service"
  date: string; // ISO YYYY-MM-DD
  dueDate?: string; // ISO YYYY-MM-DD (deadline)
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  location?: string;
  notes?: string;
  isCompleted: boolean;
  completedAt?: string;
  color?: string;
  linkedPeopleIds?: string[]; // IDs of people from prayer list linked to this ministry
  bibleBook?: string; // Bible book being read
  bibleChapter?: string; // Bible chapter being read
};

export type BirthdayEvent = {
  id: string;
  personName: string;
  date: string; // ISO YYYY-MM-DD (this year's birthday)
  originalBirthday: string; // MM/DD/YYYY
  type: "birthday";
};

// ─── Keyword → Illustration Mapping ─────────────────────────────────────────

export type EventKeyword = {
  keywords: string[];
  label: string;
  emoji: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  imageUrl?: string; // Full-bleed illustration URL
};

export const EVENT_KEYWORD_MAP: EventKeyword[] = [
  { keywords: ["bbq", "barbecue", "grill"], label: "BBQ", emoji: "🍖🔥", bgColor: "#FFF3E0", textColor: "#E65100", accentColor: "#FF6D00", imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663609244773/nMR2WBPF4HZKAwU9JYNSWY/event-bbq-97bqCESdoVbdAzptsewrTq.webp" },
  { keywords: ["church", "service", "sunday"], label: "Church", emoji: "⛪", bgColor: "#E8EAF6", textColor: "#1A237E", accentColor: "#3F51B5", imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663609244773/nMR2WBPF4HZKAwU9JYNSWY/event-church-WqiT4f26sQR8Hye2vQMv8H.webp" },
  { keywords: ["worship", "praise"], label: "Worship", emoji: "🎵🙌", bgColor: "#F3E5F5", textColor: "#4A148C", accentColor: "#9C27B0", imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663609244773/nMR2WBPF4HZKAwU9JYNSWY/event-worship-QUx7n49Cz5dTeimaAz3yrf.webp" },
  { keywords: ["bible study", "bible", "devotion"], label: "Bible Study", emoji: "📖✨", bgColor: "#E8F5E9", textColor: "#1B5E20", accentColor: "#4CAF50", imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663609244773/nMR2WBPF4HZKAwU9JYNSWY/event-bible-study-dPfpybpEfcgVz5bYVPRntU.webp" },
  { keywords: ["doctor", "medical", "appointment", "dentist"], label: "Doctor", emoji: "🏥", bgColor: "#E3F2FD", textColor: "#0D47A1", accentColor: "#2196F3", imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663609244773/nMR2WBPF4HZKAwU9JYNSWY/event-doctor-HQ5bHzL2MSZy2MieuQCwjm.webp" },
  { keywords: ["baby shower", "shower"], label: "Baby Shower", emoji: "👶🎀", bgColor: "#FCE4EC", textColor: "#880E4F", accentColor: "#E91E63", imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663609244773/nMR2WBPF4HZKAwU9JYNSWY/event-baby-shower-A4jXQnm5YLUXzATALNXisG.webp" },
  { keywords: ["birthday", "bday"], label: "Birthday", emoji: "🎂🎈", bgColor: "#FFF9C4", textColor: "#F57F17", accentColor: "#FFC107", imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663609244773/nMR2WBPF4HZKAwU9JYNSWY/event-birthday-3PydinwRWdXFCXjkiXxzAE.webp" },
  { keywords: ["christmas", "xmas"], label: "Christmas", emoji: "🎄🎁", bgColor: "#E8F5E9", textColor: "#1B5E20", accentColor: "#C62828", imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663609244773/nMR2WBPF4HZKAwU9JYNSWY/event-christmas-aCYCSVHTwUa5rikTE9wzRW.webp" },
  { keywords: ["easter"], label: "Easter", emoji: "🐣✝️", bgColor: "#F3E5F5", textColor: "#6A1B9A", accentColor: "#AB47BC", imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663609244773/nMR2WBPF4HZKAwU9JYNSWY/event-easter-cvgMHagLs23TrgNXA4hJdJ.webp" },
  { keywords: ["thanksgiving"], label: "Thanksgiving", emoji: "🦃🍂", bgColor: "#FFF3E0", textColor: "#E65100", accentColor: "#FF8F00" },
  { keywords: ["wedding", "marriage"], label: "Wedding", emoji: "💒💍", bgColor: "#FFFDE7", textColor: "#F57F17", accentColor: "#FFD600" },
  { keywords: ["funeral", "memorial"], label: "Memorial", emoji: "🕊️", bgColor: "#ECEFF1", textColor: "#37474F", accentColor: "#607D8B" },
  { keywords: ["lunch", "dinner", "breakfast", "brunch", "meal"], label: "Meal", emoji: "🍽️", bgColor: "#FFF8E1", textColor: "#FF6F00", accentColor: "#FFB300" },
  { keywords: ["meeting", "conference"], label: "Meeting", emoji: "🤝", bgColor: "#E0F2F1", textColor: "#004D40", accentColor: "#009688" },
  { keywords: ["workout", "gym", "exercise", "run", "yoga"], label: "Workout", emoji: "💪", bgColor: "#FFEBEE", textColor: "#B71C1C", accentColor: "#F44336" },
  { keywords: ["prayer", "pray"], label: "Prayer", emoji: "🙏", bgColor: "#EDE7F6", textColor: "#311B92", accentColor: "#673AB7" },
  { keywords: ["mission", "outreach", "volunteer"], label: "Outreach", emoji: "🌍❤️", bgColor: "#E0F7FA", textColor: "#006064", accentColor: "#00BCD4" },
  { keywords: ["concert", "music", "band"], label: "Concert", emoji: "🎶", bgColor: "#F9FBE7", textColor: "#33691E", accentColor: "#8BC34A" },
  { keywords: ["travel", "trip", "vacation", "flight"], label: "Travel", emoji: "✈️🌴", bgColor: "#E1F5FE", textColor: "#01579B", accentColor: "#03A9F4" },
  { keywords: ["study", "exam", "class", "school"], label: "Study", emoji: "📚", bgColor: "#FBE9E7", textColor: "#BF360C", accentColor: "#FF5722" },
  { keywords: ["visit", "visiting"], label: "Visit", emoji: "👋🏠", bgColor: "#F0F4C3", textColor: "#558B2F", accentColor: "#9CCC65" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function detectEventKeyword(title: string): EventKeyword | null {
  const lower = title.toLowerCase();
  for (const entry of EVENT_KEYWORD_MAP) {
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) return entry;
    }
  }
  return null;
}

export function generateId(): string {
  return `sch-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createScheduleEvent(data: Omit<ScheduleEvent, "id" | "isCompleted" | "keyword">): ScheduleEvent {
  const keyword = detectEventKeyword(data.title)?.label;
  return {
    ...data,
    id: generateId(),
    isCompleted: false,
    keyword: keyword || undefined,
  };
}

export function createScheduleTodo(data: Omit<ScheduleTodo, "id" | "isCompleted" | "order">, existingCount: number): ScheduleTodo {
  return {
    ...data,
    id: generateId(),
    isCompleted: false,
    order: existingCount,
  };
}

export function createScheduleMinistry(data: Omit<ScheduleMinistry, "id" | "isCompleted">): ScheduleMinistry {
  return {
    ...data,
    id: generateId(),
    isCompleted: false,
  };
}

export function toggleEventCompleted(events: ScheduleEvent[], eventId: string): ScheduleEvent[] {
  return events.map((e) =>
    e.id === eventId
      ? { ...e, isCompleted: !e.isCompleted, completedAt: !e.isCompleted ? new Date().toISOString() : undefined }
      : e
  );
}

export function toggleTodoCompleted(todos: ScheduleTodo[], todoId: string): ScheduleTodo[] {
  return todos.map((t) =>
    t.id === todoId
      ? { ...t, isCompleted: !t.isCompleted, completedAt: !t.isCompleted ? new Date().toISOString() : undefined }
      : t
  );
}

export function toggleMinistryCompleted(ministries: ScheduleMinistry[], ministryId: string): ScheduleMinistry[] {
  return ministries.map((m) =>
    m.id === ministryId
      ? { ...m, isCompleted: !m.isCompleted, completedAt: !m.isCompleted ? new Date().toISOString() : undefined }
      : m
  );
}

export function getEventsForDate(events: ScheduleEvent[], date: string): ScheduleEvent[] {
  return events.filter((e) => e.date === date).sort((a, b) => (a.startTime || "00:00").localeCompare(b.startTime || "00:00"));
}

export function getTodosForDate(todos: ScheduleTodo[], date: string): ScheduleTodo[] {
  return todos.filter((t) => t.date === date).sort((a, b) => a.order - b.order);
}

export function getMinistriesForDate(ministries: ScheduleMinistry[], date: string): ScheduleMinistry[] {
  return ministries.filter((m) => m.date === date || m.dueDate === date).sort((a, b) => (a.startTime || "00:00").localeCompare(b.startTime || "00:00"));
}

// Parse birthday string "MM/DD/YYYY" → this year's ISO date
export function getBirthdayDateThisYear(birthday: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(birthday);
  if (!match) return null;
  const [, month, day] = match;
  const year = new Date().getFullYear();
  return `${year}-${month}-${day}`;
}

// Get all birthdays for a given date from people array
export function getBirthdaysForDate(people: Array<{ name: string; birthday?: string; isPersonal?: boolean }>, date: string): BirthdayEvent[] {
  const results: BirthdayEvent[] = [];
  for (const person of people) {
    if (person.isPersonal || !person.birthday) continue;
    const thisYearDate = getBirthdayDateThisYear(person.birthday);
    if (thisYearDate === date) {
      results.push({
        id: `bday-${person.name}-${date}`,
        personName: person.name,
        date,
        originalBirthday: person.birthday,
        type: "birthday",
      });
    }
  }
  return results;
}

// Get dates for the week strip (7 days starting from a given date)
export function getWeekDates(centerDate: string): string[] {
  const center = new Date(`${centerDate}T00:00:00Z`);
  const dates: string[] = [];
  // Start 3 days before center
  for (let i = -3; i <= 3; i++) {
    const d = new Date(center);
    d.setUTCDate(center.getUTCDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

export function formatDateHeader(date: string): { dayName: string; dayNum: string; monthName: string; year: string } {
  const d = new Date(`${date}T12:00:00Z`);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return {
    dayName: days[d.getUTCDay()] || "Mon",
    dayNum: String(d.getUTCDate()),
    monthName: months[d.getUTCMonth()] || "January",
    year: String(d.getUTCFullYear()),
  };
}

export function getShortDayName(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return days[d.getUTCDay()] || "MON";
}

export function getDayNumber(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  return String(d.getUTCDate());
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

// Ministry type options
export const MINISTRY_TYPES = [
  "Outreach",
  "Teaching",
  "Worship",
  "Service",
  "Prayer",
  "Youth",
  "Missions",
  "Hospitality",
  "Counseling",
  "Bible Study",
  "Read",
  "Other",
] as const;

export type MinistryType = (typeof MINISTRY_TYPES)[number];


// ─── Bible Study Helpers ─────────────────────────────────────────────────────

export function createBibleStudySession(data: Partial<BibleStudySession>): BibleStudySession {
  return {
    id: data.id || `bs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    book: data.book || "Genesis",
    chapter: data.chapter || 1,
    date: data.date || new Date().toISOString().split("T")[0],
    startTime: data.startTime,
    endTime: data.endTime,
    notes: data.notes,
    isCompleted: data.isCompleted || false,
    completedAt: data.completedAt,
  };
}

export function getBibleStudiesForDate(studies: BibleStudySession[], date: string): BibleStudySession[] {
  return studies
    .filter((s) => s.date === date)
    .sort((a, b) => {
      const aTime = a.startTime || "00:00";
      const bTime = b.startTime || "00:00";
      return aTime.localeCompare(bTime);
    });
}

export function toggleBibleStudyCompleted(studies: BibleStudySession[], id: string): BibleStudySession[] {
  return studies.map((s) =>
    s.id === id
      ? {
          ...s,
          isCompleted: !s.isCompleted,
          completedAt: !s.isCompleted ? new Date().toISOString() : undefined,
        }
      : s
  );
}
