// Daily town visit streak for Hometown.
//
// Opening Hometown once per calendar day increments the streak. Missing a
// calendar day resets it. Milestone days pay growing coin/XP rewards and
// award titles. All date math uses local calendar days (timezone-safe).

export const STREAK_STORAGE_KEY = "prayercircle.hometown.streak.v1";

export type StreakState = {
  /** Local date (YYYY-MM-DD) of the last visit, or null if never. */
  lastVisitDate: string | null;
  /** Current consecutive-day streak. */
  streak: number;
  /** Best streak ever achieved. */
  bestStreak: number;
  /** Titles earned from streak milestones. */
  titles: string[];
};

export type StreakMilestone = {
  day: number;
  coins: number;
  xp: number;
  title?: string;
  label: string;
};

export const STREAK_MILESTONES: StreakMilestone[] = [
  { day: 1, coins: 5, xp: 0, label: "First visit" },
  { day: 3, coins: 15, xp: 0, label: "3-day streak" },
  { day: 7, coins: 40, xp: 25, label: "One week strong" },
  { day: 14, coins: 100, xp: 50, label: "Two weeks strong" },
  { day: 30, coins: 250, xp: 100, title: "Faithful Resident", label: "A full month" },
];

/** Next milestone after the given streak day (null when all are passed). */
export function nextMilestoneFor(streak: number): StreakMilestone | null {
  return STREAK_MILESTONES.find((m) => m.day > streak) ?? null;
}

export function milestoneForDay(day: number): StreakMilestone | null {
  return STREAK_MILESTONES.find((m) => m.day === day) ?? null;
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function yesterdayStr(d: Date = new Date()): string {
  const y = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  return localDateStr(y);
}

export function emptyStreak(): StreakState {
  return { lastVisitDate: null, streak: 0, bestStreak: 0, titles: [] };
}

export async function loadStreak(): Promise<StreakState> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem(STREAK_STORAGE_KEY);
    if (!raw) return emptyStreak();
    const s = JSON.parse(raw);
    const base = emptyStreak();
    return {
      lastVisitDate: typeof s.lastVisitDate === "string" ? s.lastVisitDate : null,
      streak: typeof s.streak === "number" && isFinite(s.streak) ? Math.max(0, Math.floor(s.streak)) : 0,
      bestStreak: typeof s.bestStreak === "number" && isFinite(s.bestStreak) ? Math.max(0, Math.floor(s.bestStreak)) : 0,
      titles: Array.isArray(s.titles) ? s.titles.filter((x: unknown) => typeof x === "string") : [],
    };
  } catch {
    return emptyStreak();
  }
}

export async function saveStreak(s: StreakState): Promise<void> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

export type StreakCheckIn = {
  state: StreakState;
  /** True when this is the first visit of the calendar day. */
  isNewDay: boolean;
  /** Milestone hit by this visit, if any. */
  milestone: StreakMilestone | null;
  /** True when the streak was reset by a missed day. */
  wasReset: boolean;
};

/**
 * Record a Hometown visit. Safe to call on every open — only the first
 * visit per calendar day changes anything.
 */
export async function checkInStreak(now: Date = new Date()): Promise<StreakCheckIn> {
  const state = await loadStreak();
  const today = localDateStr(now);
  if (state.lastVisitDate === today) {
    return { state, isNewDay: false, milestone: null, wasReset: false };
  }
  const continued = state.lastVisitDate === yesterdayStr(now);
  const wasReset = !continued && state.streak > 0;
  const streak = continued ? state.streak + 1 : 1;
  const titles = [...state.titles];
  const milestone = milestoneForDay(streak);
  if (milestone?.title && !titles.includes(milestone.title)) {
    titles.push(milestone.title);
  }
  const next: StreakState = {
    lastVisitDate: today,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    titles,
  };
  await saveStreak(next);
  return { state: next, isNewDay: true, milestone, wasReset };
}
