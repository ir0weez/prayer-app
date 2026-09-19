export type PrayerStreakRecord = {
  streak: number;
  lastCompletedDate: string | null;
};

function parseDate(value: string): Date | null {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getPreviousDate(dateString: string): string {
  const date = parseDate(dateString) ?? new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().split("T")[0];
}

export function normalizePrayerStreakRecord(
  value: unknown,
  today: string,
): PrayerStreakRecord {
  if (!value || typeof value !== "object") {
    return { streak: 0, lastCompletedDate: null };
  }
  const candidate = value as Partial<PrayerStreakRecord>;
  const streak = typeof candidate.streak === "number" && Number.isFinite(candidate.streak) && candidate.streak > 0
    ? Math.floor(candidate.streak)
    : 0;
  const lastCompletedDate = typeof candidate.lastCompletedDate === "string" && parseDate(candidate.lastCompletedDate)
    ? candidate.lastCompletedDate
    : null;
  if (!lastCompletedDate || lastCompletedDate === today || lastCompletedDate === getPreviousDate(today)) {
    return { streak, lastCompletedDate };
  }
  return { streak: 0, lastCompletedDate: null };
}

export function advancePrayerStreak(
  previous: PrayerStreakRecord,
  completedDate: string,
): PrayerStreakRecord {
  if (previous.lastCompletedDate === completedDate) return previous;
  const nextStreak = previous.lastCompletedDate === getPreviousDate(completedDate)
    ? previous.streak + 1
    : 1;
  return { streak: nextStreak, lastCompletedDate: completedDate };
}
