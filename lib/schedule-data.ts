import { getTodayISOString } from "./prayercircle-data";

// ─── Storage Keys ────────────────────────────────────────────────────────────
export const SCHEDULE_EVENTS_KEY = "prayercircle.schedule.events.v1";
export const SCHEDULE_TODOS_KEY = "prayercircle.schedule.todos.v1";
export const SCHEDULE_MINISTRIES_KEY = "prayercircle.schedule.ministries.v1";
export const SCHEDULE_BIBLE_STUDIES_KEY = "prayercircle.schedule.biblestudies.v1";
export const SCHEDULE_WORSHIP_LINKS_KEY = "prayercircle.schedule.worship.links.v1";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ScheduleItemType = "event" | "todo" | "ministry" | "birthday";

export type ScheduleEvent = {
  id: string;
  title: string;
  date: string; // ISO YYYY-MM-DD
  isOffEvent?: boolean; // Only appears on marked time-off days
  posterImageUri?: string; // Optional poster/photo for time-off events
  posterColor?: string; // Dominant poster color used for the card background
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  reminderMinutesBefore?: number; // Optional local notification lead time
  travelTimeMinutes?: number; // "Time to leave" — minutes to get there, shown as dashed outline above event
  location?: string;
  notes?: string;
  isCompleted: boolean;
  completedAt?: string;
  color?: string; // Override color
  keyword?: string; // Detected keyword for illustration
  isHoliday?: boolean; // Auto-seeded US holiday (render-only, never editable/persisted)
  linkedPeopleIds?: string[]; // IDs of people from prayer list linked to this event
};

export type ScheduleTodo = {
  id: string;
  title: string;
  date: string; // ISO YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  notificationsEnabled?: boolean; // Whether this todo should create a local reminder
  isCompleted: boolean;
  completedAt?: string;
  icon?: string; // MaterialIcons name
  color?: string;
  order: number;
  notes?: string; // Optional notes for the todo
  linkedPeopleIds?: string[]; // IDs of people from prayer list linked to this todo
  linkedEventId?: string; // ID of event this todo is linked to
  linkedMinistryId?: string; // ID of ministry this todo is linked to
  linkedEventTitle?: string; // Cached title of linked event (for persistence)
  linkedMinistryTitle?: string; // Cached title of linked ministry (for persistence)
  linkedEventColor?: string; // Cached color of linked event
  linkedMinistryColor?: string; // Cached color of linked ministry
  tag?: string; // Tag for todo (Ministry/Event/Family/Therapy/Personal)
  groupId?: string; // ID of parent group if this todo is part of a group
  isGroup?: boolean; // True if this todo is a group header
  isGroupExpanded?: boolean; // True if group is expanded (only for group headers)
  subtasks?: Array<{
    id: string;
    title: string;
    description?: string;
    isCompleted: boolean;
  }>;
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
  travelTimeMinutes?: number; // "Time to leave" — minutes to get there
  notes?: string;
  isCompleted: boolean;
  completedAt?: string;
  color?: string;
  linkedPeopleIds?: string[]; // IDs of people from prayer list linked to this ministry
  bibleBook?: string; // Bible book being read
  bibleChapter?: string; // Bible chapter being read
};

export type WorshipListLink = {
  id: string;
  date: string; // ISO YYYY-MM-DD - which day this worship list is linked to
  worshipListId: string; // ID of the worship list
  worshipListName: string; // Cached name of the worship list
  worshipListImageUrl?: string; // Cached image URL
  createdAt: string; // ISO date
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
  icon: string; // Material Design icon name
  bgColor: string;
  textColor: string;
  accentColor: string;
  imageUrl?: string; // Full-bleed illustration URL
};

export const EVENT_KEYWORD_MAP: EventKeyword[] = [
  { keywords: ["bbq", "barbecue", "grill"], label: "BBQ", emoji: "🍖🔥", icon: "outdoor-grill", bgColor: "#5D2E1E", textColor: "#E65100", accentColor: "#FF6D00", imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663609244773/nMR2WBPF4HZKAwU9JYNSWY/event-bbq-97bqCESdoVbdAzptsewrTq.webp" },
  { keywords: ["church", "service", "sunday"], label: "Church", emoji: "⛪", icon: "church", bgColor: "#3E6B8E", textColor: "#1A237E", accentColor: "#3F51B5", imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663609244773/nMR2WBPF4HZKAwU9JYNSWY/event-church-WqiT4f26sQR8Hye2vQMv8H.webp" },
  { keywords: ["worship", "praise"], label: "Worship", emoji: "🎵🙌", icon: "music-note", bgColor: "#4E2E6E", textColor: "#4A148C", accentColor: "#9C27B0", imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663609244773/nMR2WBPF4HZKAwU9JYNSWY/event-worship-QUx7n49Cz5dTeimaAz3yrf.webp" },
  { keywords: ["bible study", "bible", "devotion"], label: "Bible Study", emoji: "📖✨", icon: "book", bgColor: "#5D4028", textColor: "#1B5E20", accentColor: "#4CAF50", imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663609244773/nMR2WBPF4HZKAwU9JYNSWY/event-bible-study-dPfpybpEfcgVz5bYVPRntU.webp" },
  { keywords: ["therapy", "therapist", "counseling", "counselling", "counselor"], label: "Therapy", emoji: "🧠", icon: "psychology", bgColor: "#5A4A7E", textColor: "#6B21A8", accentColor: "#9333EA" },
  { keywords: ["doctor", "medical", "appointment", "dentist"], label: "Doctor", emoji: "🏥", icon: "local-hospital", bgColor: "#2B7A9E", textColor: "#0D47A1", accentColor: "#2196F3", imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663609244773/nMR2WBPF4HZKAwU9JYNSWY/event-doctor-HQ5bHzL2MSZy2MieuQCwjm.webp" },
  { keywords: ["gardening", "garden", "planting", "plants", "yard work", "yard", "lawn", "grass"], label: "Gardening", emoji: "🌿", icon: "yard", bgColor: "#6FAED9", textColor: "#166534", accentColor: "#16A34A" },
  { keywords: ["baby shower", "shower"], label: "Baby Shower", emoji: "👶🎀", icon: "child-care", bgColor: "#A85D7A", textColor: "#880E4F", accentColor: "#E91E63", imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663609244773/nMR2WBPF4HZKAwU9JYNSWY/event-baby-shower-A4jXQnm5YLUXzATALNXisG.webp" },
  { keywords: ["birthday", "bday"], label: "Birthday", emoji: "🎂🎈", icon: "cake", bgColor: "#5E2E8E", textColor: "#F57F17", accentColor: "#FFC107", imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663609244773/nMR2WBPF4HZKAwU9JYNSWY/event-birthday-3PydinwRWdXFCXjkiXxzAE.webp" },
  { keywords: ["christmas", "xmas"], label: "Christmas", emoji: "🎄🎁", icon: "card-giftcard", bgColor: "#1B4332", textColor: "#E8F5E9", accentColor: "#FF5252", imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663609244773/nMR2WBPF4HZKAwU9JYNSWY/event-christmas-aCYCSVHTwUa5rikTE9wzRW.webp" },
  { keywords: ["easter"], label: "Easter", emoji: "🐣✝️", icon: "card-giftcard", bgColor: "#8FC7A8", textColor: "#6A1B9A", accentColor: "#AB47BC", imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663609244773/nMR2WBPF4HZKAwU9JYNSWY/event-easter-cvgMHagLs23TrgNXA4hJdJ.webp" },
  { keywords: ["thanksgiving"], label: "Thanksgiving", emoji: "🦃🍂", icon: "restaurant", bgColor: "#6B4215", textColor: "#FFCC80", accentColor: "#FF8F00" },
  { keywords: ["wedding", "marriage"], label: "Wedding", emoji: "💒💍", icon: "favorite", bgColor: "#8E5A6A", textColor: "#F57F17", accentColor: "#FFD600" },
  { keywords: ["funeral", "memorial"], label: "Memorial", emoji: "🕊️", icon: "sentiment-very-satisfied", bgColor: "#3E4E5E", textColor: "#37474F", accentColor: "#607D8B" },
  { keywords: ["lunch", "dinner", "breakfast", "brunch", "meal"], label: "Meal", emoji: "🍽️", icon: "restaurant", bgColor: "#B86A28", textColor: "#FF6F00", accentColor: "#FFB300" },
  { keywords: ["meeting", "conference"], label: "Meeting", emoji: "🤝", icon: "people", bgColor: "#265F6E", textColor: "#004D40", accentColor: "#009688" },
  { keywords: ["workout", "gym", "exercise", "run", "yoga"], label: "Workout", emoji: "💪", icon: "fitness-center", bgColor: "#8E2F22", textColor: "#B71C1C", accentColor: "#F44336" },
  { keywords: ["basketball"], label: "Basketball", emoji: "🏀", icon: "sports-basketball", bgColor: "#B85C1E", textColor: "#E65100", accentColor: "#FF9800" },
  { keywords: ["soccer", "football"], label: "Soccer", emoji: "⚽", icon: "sports-soccer", bgColor: "#2E7D3A", textColor: "#1B5E20", accentColor: "#4CAF50" },
  { keywords: ["game", "games"], label: "Game", emoji: "🎮", icon: "sports-esports", bgColor: "#2A2A52", textColor: "#311B92", accentColor: "#673AB7" },
  { keywords: ["movie", "movies", "film"], label: "Movie", emoji: "🎬", icon: "movie", bgColor: "#3E1F2E", textColor: "#880E4F", accentColor: "#E91E63" },
  { keywords: ["full moon"], label: "Full Moon", emoji: "🌕", icon: "brightness-3", bgColor: "#101828", textColor: "#1A237E", accentColor: "#5C6BC0" },
  { keywords: ["prayer", "pray"], label: "Prayer", emoji: "🙏", icon: "pan-tool", bgColor: "#35245A", textColor: "#311B92", accentColor: "#673AB7" },
  { keywords: ["mission", "outreach", "volunteer"], label: "Outreach", emoji: "🌍❤️", icon: "public", bgColor: "#17695E", textColor: "#006064", accentColor: "#00BCD4" },
  { keywords: ["concert", "music", "band"], label: "Concert", emoji: "🎶", icon: "music-note", bgColor: "#1E1E2A", textColor: "#33691E", accentColor: "#8BC34A" },
  { keywords: ["travel", "trip", "vacation", "flight"], label: "Travel", emoji: "✈️🌴", icon: "flight", bgColor: "#3E8EBA", textColor: "#01579B", accentColor: "#03A9F4" },
  { keywords: ["hotel", "motel", "airbnb", "resort", "inn", "lodge", "hostel", "bed and breakfast", "bnb"], label: "Hotel", emoji: "🏨", icon: "hotel", bgColor: "#3E5A7E", textColor: "#E8EAF6", accentColor: "#FF8F00" },
  { keywords: ["study", "exam", "class", "school"], label: "Study", emoji: "📚", icon: "school", bgColor: "#3B4657", textColor: "#BF360C", accentColor: "#FF5722" },
  { keywords: ["visit", "visiting"], label: "Visit", emoji: "👋🏠", icon: "home", bgColor: "#CE8A3E", textColor: "#558B2F", accentColor: "#9CCC65" },
  { keywords: ["amusement park", "six flags", "knott's", "disneyland", "universal", "theme park"], label: "Amusement Park", emoji: "🎢🎡", icon: "attractions", bgColor: "#5E2E8E", textColor: "#6A1B9A", accentColor: "#E91E63" },
  { keywords: ["new year", "new years", "nye"], label: "New Year", emoji: "🎆", icon: "celebration", bgColor: "#1A237E", textColor: "#FFF9C4", accentColor: "#FFD600" },
  { keywords: ["valentine", "valentines"], label: "Valentine's Day", emoji: "💕", icon: "favorite", bgColor: "#5C1031", textColor: "#F8BBD0", accentColor: "#EC407A" },
  { keywords: ["halloween"], label: "Halloween", emoji: "🎃", icon: "dark-mode", bgColor: "#1A2340", textColor: "#FFCC80", accentColor: "#FF6D00" },
  { keywords: ["st patrick", "saint patrick", "st. patrick"], label: "St. Patrick's Day", emoji: "🍀", icon: "eco", bgColor: "#1B5E20", textColor: "#C8E6C9", accentColor: "#00E676" },
  { keywords: ["rest", "nap", "siesta", "unwind", "recharge"], label: "Rest", emoji: "🌙", icon: "nights-stay", bgColor: "#232347", textColor: "#E8EAF6", accentColor: "#9FA8DA" },
  { keywords: ["tv", "tv show", "television", "show", "episode", "series"], label: "TV Show", emoji: "📺", icon: "tv", bgColor: "#2A2A4E", textColor: "#1A237E", accentColor: "#5C6BC0" },
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
  return todos.map((todo) => {
    if (todo.id !== todoId) return todo;
    const isCompleted = !todo.isCompleted;
    return {
      ...todo,
      isCompleted,
      completedAt: isCompleted ? new Date().toISOString() : undefined,
      isGroupExpanded: isCompleted ? false : todo.isGroupExpanded,
      subtasks: todo.subtasks?.map((subtask) => ({ ...subtask, isCompleted })),
    };
  });
}

/** Removes a todo as one unit, including any nested subtasks stored on that parent. */
export function removeScheduleTodo(todos: ScheduleTodo[], todoId: string): ScheduleTodo[] {
  return todos.filter((todo) => todo.id !== todoId);
}

export function toggleSubtaskCompleted(todos: ScheduleTodo[], todoId: string, subtaskId: string): ScheduleTodo[] {
  return todos.map((todo) => {
    if (todo.id !== todoId || !todo.subtasks) return todo;
    const subtasks = todo.subtasks.map((subtask) =>
      subtask.id === subtaskId ? { ...subtask, isCompleted: !subtask.isCompleted } : subtask,
    );
    const isCompleted = subtasks.length > 0 && subtasks.every((subtask) => subtask.isCompleted);
    return {
      ...todo,
      subtasks,
      isCompleted,
      completedAt: isCompleted ? new Date().toISOString() : undefined,
      isGroupExpanded: isCompleted ? false : todo.isGroupExpanded,
    };
  });
}

export function partitionGroupedTodosForSchedule(todos: ScheduleTodo[]): {
  timelineTodos: ScheduleTodo[];
  completedGroups: ScheduleTodo[];
} {
  const isGroupedTodo = (todo: ScheduleTodo) => todo.isGroup || (todo.subtasks?.length ?? 0) > 0;
  return {
    timelineTodos: todos.filter((todo) => !(isGroupedTodo(todo) && todo.isCompleted)),
    completedGroups: todos.filter((todo) => isGroupedTodo(todo) && todo.isCompleted),
  };
}

export function toggleTodoGroupExpanded(todos: ScheduleTodo[], todoId: string): ScheduleTodo[] {
  return todos.map((todo) =>
    todo.id === todoId ? { ...todo, isGroupExpanded: !todo.isGroupExpanded } : todo,
  );
}

export function getSubtaskProgress(todo: ScheduleTodo): { completed: number; total: number; ratio: number } {
  const total = todo.subtasks?.length ?? 0;
  const completed = todo.subtasks?.filter((subtask) => subtask.isCompleted).length ?? 0;
  return { completed, total, ratio: total === 0 ? 0 : completed / total };
}

/**
 * Counts the actionable todo units for the Schedule summary. A grouped todo is
 * represented by its subtasks rather than also counting the group header as a
 * separate todo, while ordinary todos continue to count as one unit.
 */
export function getTodoSummaryCounts(todos: ScheduleTodo[]): { completed: number; total: number; remaining: number } {
  const counts = todos.reduce(
    (counts, todo) => {
      const subtasks = todo.subtasks ?? [];
      if (subtasks.length > 0) {
        counts.total += subtasks.length;
        counts.completed += subtasks.filter((subtask) => subtask.isCompleted).length;
      } else {
        counts.total += 1;
        if (todo.isCompleted) counts.completed += 1;
      }
      return counts;
    },
    { completed: 0, total: 0 },
  );
  return { ...counts, remaining: counts.total - counts.completed };
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
  return todos.filter((t) => t.date === date).sort((a, b) => {
    // Completed todos go to bottom
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    return a.order - b.order;
  });
}

export function getOverdueTodos(todos: ScheduleTodo[], currentDate: string): ScheduleTodo[] {
  // Get all incomplete todos with dates before the current date
  return todos.filter((t) => !t.isCompleted && t.date < currentDate).sort((a, b) => a.date.localeCompare(b.date));
}

export function getMinistriesForDate(ministries: ScheduleMinistry[], date: string): ScheduleMinistry[] {
  return ministries.filter((m) => m.date === date || m.dueDate === date).sort((a, b) => (a.startTime || "00:00").localeCompare(b.startTime || "00:00"));
}

// Parse birthday string "MM/DD/YYYY" or "MM/DD" (year optional) → this year's ISO date
export function getBirthdayDateThisYear(birthday: string): string | null {
  const match = /^(\d{2})\/(\d{2})(?:\/(\d{4}))?$/.exec(birthday.trim());
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

// Get dates for the week strip (Sunday-Saturday calendar week containing the given date)
export function getWeekDates(date: string): string[] {
  const d = new Date(`${date}T00:00:00Z`);
  const sunday = new Date(d);
  sunday.setUTCDate(d.getUTCDate() - d.getUTCDay());
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(sunday);
    dt.setUTCDate(sunday.getUTCDate() + i);
    dates.push(dt.toISOString().split("T")[0]);
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
  "Marriage",
  "Parenting",
  "Read",
  "Other",
] as const;

export type MinistryType = (typeof MINISTRY_TYPES)[number];

// Ministry type to icon mapping
export const MINISTRY_TYPE_ICONS: Record<MinistryType, string> = {
  "Outreach": "public",
  "Teaching": "school",
  "Worship": "music-note",
  "Service": "volunteer-activism",
  "Prayer": "pan-tool",
  "Youth": "child-care",
  "Missions": "flight",
  "Hospitality": "restaurant",
  "Counseling": "people",
  "Bible Study": "book",
  "Marriage": "favorite",
  "Parenting": "family-restroom",
  "Read": "library-books",
  "Other": "event-note",
};

// Helper function to get icon for ministry type
export function getMinistryTypeIcon(type: MinistryType): string {
  return MINISTRY_TYPE_ICONS[type] || "event-note";
}


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
