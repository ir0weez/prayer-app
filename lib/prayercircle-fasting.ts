import { getTodayISOString } from "./prayercircle-data";

export type FastDayStatus = "completed" | "skipped" | "missed";
export type FastType = "Health" | "Finances" | "Worry" | "Hope" | "Change" | "Closeness" | "Protection" | "Growth" | "Challenge" | "Custom";

export type PersonalFast = {
  id: string;
  name: string;
  startDate: string; // Stored as ISO YYYY-MM-DD for reliable calendar math.
  durationDays: number;
  type: FastType;
  focusItems: string[];
  dayStatuses: Record<string, FastDayStatus>;
  createdAt: string;
};

export const FAST_DURATIONS = [1, 7, 30, 40, 90, 365] as const;
export const FAST_TYPES: { type: FastType; icon: string; color: string }[] = [
  { type: "Health", icon: "fitness-center", color: "#16A34A" },
  { type: "Finances", icon: "savings", color: "#CA8A04" },
  { type: "Worry", icon: "cloud", color: "#0EA5E9" },
  { type: "Hope", icon: "volunteer-activism", color: "#7C3AED" },
  { type: "Change", icon: "sync", color: "#2563EB" },
  { type: "Closeness", icon: "favorite", color: "#E11D48" },
  { type: "Protection", icon: "shield", color: "#475569" },
  { type: "Growth", icon: "eco", color: "#22C55E" },
  { type: "Challenge", icon: "bolt", color: "#F97316" },
  { type: "Custom", icon: "edit", color: "#8557D9" },
];

export function normalizeFastDateInput(value: string): string | null {
  const trimmed = value.trim();
  const displayMatch = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
  if (displayMatch) {
    const [, month, day, year] = displayMatch;
    const iso = `${year}-${month}-${day}`;
    return isValidIsoDate(iso) ? iso : null;
  }
  return isValidIsoDate(trimmed) ? trimmed : null;
}

export function formatIsoToMmDdYyyy(dateString: string | null | undefined): string {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  if (!year || !month || !day) return dateString;
  return `${month}-${day}-${year}`;
}

export function isValidMmDdYyyy(value: string): boolean {
  return normalizeFastDateInput(value) !== null;
}

export function getFastCalendarDays(fast: PersonalFast): string[] {
  const days: string[] = [];
  const start = new Date(`${fast.startDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return days;
  for (let index = 0; index < fast.durationDays; index += 1) {
    const next = new Date(start);
    next.setUTCDate(start.getUTCDate() + index);
    days.push(next.toISOString().split("T")[0]);
  }
  return days;
}

export function getFastEndDate(fast: PersonalFast): string {
  const days = getFastCalendarDays(fast);
  return days[days.length - 1] ?? fast.startDate;
}

export function getActiveFast(fasts: PersonalFast[], dateString = getTodayISOString()): PersonalFast | null {
  return fasts.find((fast) => fast.startDate <= dateString && getFastEndDate(fast) >= dateString) ?? fasts[0] ?? null;
}

export function calculateFastStreak(fast: PersonalFast, throughDate = getTodayISOString()): number {
  let streak = 0;
  for (const date of getFastCalendarDays(fast)) {
    if (date > throughDate) break;
    const status = fast.dayStatuses[date];
    if (status === "completed") {
      streak += 1;
    } else if (status === "missed") {
      streak = 0;
    }
  }
  return streak;
}

export function getFastProgress(fast: PersonalFast): { completed: number; skipped: number; missed: number; total: number } {
  const statuses = getFastCalendarDays(fast).map((date) => fast.dayStatuses[date]);
  return {
    completed: statuses.filter((status) => status === "completed").length,
    skipped: statuses.filter((status) => status === "skipped").length,
    missed: statuses.filter((status) => status === "missed").length,
    total: fast.durationDays,
  };
}

export function upsertFastDayStatus(fasts: PersonalFast[], fastId: string, dateString: string, status: FastDayStatus): PersonalFast[] {
  return fasts.map((fast) =>
    fast.id === fastId
      ? {
          ...fast,
          dayStatuses: {
            ...fast.dayStatuses,
            [dateString]: status,
          },
        }
      : fast,
  );
}

export function createPersonalFast(input: {
  name: string;
  startDate: string;
  durationDays: number;
  type: FastType;
  focusItems: string[];
  existingCount?: number;
}): PersonalFast | null {
  const trimmedName = input.name.trim();
  const normalizedStartDate = normalizeFastDateInput(input.startDate);
  if (!trimmedName || !normalizedStartDate || !FAST_DURATIONS.includes(input.durationDays as (typeof FAST_DURATIONS)[number])) return null;
  const focusItems = input.focusItems.map((item) => item.trim()).filter(Boolean);
  return {
    id: `fast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${input.existingCount ?? 0}`,
    name: trimmedName,
    startDate: normalizedStartDate,
    durationDays: input.durationDays,
    type: input.type,
    focusItems,
    dayStatuses: {},
    createdAt: new Date().toISOString(),
  };
}

export function normalizeFastsForStorage(value: unknown): PersonalFast[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate, index) => {
    const fast = candidate as Partial<PersonalFast>;
    const startDate = normalizeFastDateInput(typeof fast.startDate === "string" ? fast.startDate : "");
    const durationDays = typeof fast.durationDays === "number" && fast.durationDays > 0 ? Math.floor(fast.durationDays) : 40;
    const type = FAST_TYPES.some((entry) => entry.type === fast.type) ? (fast.type as FastType) : "Custom";
    const name = typeof fast.name === "string" && fast.name.trim() ? fast.name.trim() : `${durationDays}-Day ${type} Fast`;
    if (!startDate) return [];
    const rawStatuses = fast.dayStatuses && typeof fast.dayStatuses === "object" ? fast.dayStatuses : {};
    const dayStatuses = Object.fromEntries(
      Object.entries(rawStatuses).filter(([, status]) => status === "completed" || status === "skipped" || status === "missed"),
    ) as Record<string, FastDayStatus>;
    return [{
      id: typeof fast.id === "string" && fast.id.trim() ? fast.id.trim() : `fast-migrated-${index}`,
      name,
      startDate,
      durationDays,
      type,
      focusItems: Array.isArray(fast.focusItems) ? fast.focusItems.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()) : [],
      dayStatuses,
      createdAt: typeof fast.createdAt === "string" ? fast.createdAt : new Date().toISOString(),
    }];
  });
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}
