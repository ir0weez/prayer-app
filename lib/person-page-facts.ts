// ─── v406 — the person page's derived facts ─────────────────────────
// Pure date/log arithmetic behind the redesigned profile's fact
// rows (portrait-band birthday chip, THIS WEEK dots, CONNECTION
// rows). Everything here reads only what the app's own records
// prove: the v279 prayedDates forward log (plus the single
// lastPrayerCompletedDate, exactly as that log's contract allows)
// and the reached-stamps store. No inferred history and no
// scoring — the page shows facts, not a grade.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parse an ISO YYYY-MM-DD date to a UTC-midnight timestamp. */
function parseIsoDay(iso: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const ms = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const d = new Date(ms);
  if (d.getUTCFullYear() !== Number(match[1]) || d.getUTCMonth() !== Number(match[2]) - 1 || d.getUTCDate() !== Number(match[3])) return null;
  return ms;
}

function toIsoDay(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Whole days from ISO day `from` to ISO day `to` (negative when `to` is earlier). */
export function diffIsoDays(from: string, to: string): number | null {
  const a = parseIsoDay(from);
  const b = parseIsoDay(to);
  if (a === null || b === null) return null;
  return Math.round((b - a) / DAY_MS);
}

export function addIsoDays(iso: string, days: number): string | null {
  const ms = parseIsoDay(iso);
  if (ms === null) return null;
  return toIsoDay(ms + days * DAY_MS);
}

/**
 * Days until the person's next birthday (0 = today), from the stored
 * birthday string ("MM/DD/YYYY" or "MM/DD"). Null when there is no
 * usable birthday.
 */
export function daysUntilBirthday(birthday: string | undefined, todayIso: string): number | null {
  if (!birthday) return null;
  const match = /^(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?$/.exec(birthday.trim());
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const todayMs = parseIsoDay(todayIso);
  if (todayMs === null) return null;
  const year = new Date(todayMs).getUTCFullYear();
  // Feb 29 birthdays celebrate on Feb 28 in common years — clamp the
  // day into the month rather than rolling into March.
  const clampDay = (y: number) => Math.min(day, new Date(Date.UTC(y, month, 0)).getUTCDate());
  let next = Date.UTC(year, month - 1, clampDay(year));
  if (next < todayMs) next = Date.UTC(year + 1, month - 1, clampDay(year + 1));
  return Math.round((next - todayMs) / DAY_MS);
}

export type WeekDot = {
  iso: string;
  /** Single-letter day label, Monday first (M T W T F S S). */
  label: string;
  filled: boolean;
  isToday: boolean;
};

const WEEK_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;

/** The set of days the records prove this person was prayed for:
 *  the v279 forward log plus lastPrayerCompletedDate (its contract). */
export function prayedDaySet(prayedDates: string[] | undefined, lastPrayerCompletedDate?: string | null): Set<string> {
  const set = new Set<string>((prayedDates ?? []).filter((d) => parseIsoDay(d) !== null));
  if (lastPrayerCompletedDate && parseIsoDay(lastPrayerCompletedDate) !== null) set.add(lastPrayerCompletedDate);
  return set;
}

/** The seven dots of the current week (Monday–Sunday) around today. */
export function buildWeekDots(
  prayedDates: string[] | undefined,
  lastPrayerCompletedDate: string | null | undefined,
  todayIso: string,
): WeekDot[] {
  const todayMs = parseIsoDay(todayIso);
  if (todayMs === null) return [];
  const prayed = prayedDaySet(prayedDates, lastPrayerCompletedDate);
  const dow = new Date(todayMs).getUTCDay(); // 0 = Sunday
  const mondayMs = todayMs - ((dow + 6) % 7) * DAY_MS;
  return WEEK_LABELS.map((label, i) => {
    const iso = toIsoDay(mondayMs + i * DAY_MS);
    return { iso, label, filled: prayed.has(iso), isToday: iso === todayIso };
  });
}

/** How many distinct days this calendar month the person was prayed for. */
export function countPrayedThisMonth(
  prayedDates: string[] | undefined,
  lastPrayerCompletedDate: string | null | undefined,
  todayIso: string,
): number {
  const monthPrefix = todayIso.slice(0, 7);
  let count = 0;
  prayedDaySet(prayedDates, lastPrayerCompletedDate).forEach((iso) => {
    if (iso.startsWith(monthPrefix)) count += 1;
  });
  return count;
}

/**
 * "Reached every ~N days": the MEAN gap between consecutive reached
 * stamps, rounded. Null until at least three stamps exist (two gaps)
 * — one gap is an anecdote, not a rhythm.
 */
export function meanReachedGapDays(stampDates: string[]): number | null {
  const days = stampDates
    .map((d) => parseIsoDay(d))
    .filter((ms): ms is number => ms !== null)
    .sort((a, b) => a - b);
  // One stamp per day in the store (upsert), but dedupe defensively.
  const unique = [...new Set(days)];
  if (unique.length < 3) return null;
  const gaps: number[] = [];
  for (let i = 1; i < unique.length; i += 1) gaps.push((unique[i] - unique[i - 1]) / DAY_MS);
  return Math.round(gaps.reduce((sum, g) => sum + g, 0) / gaps.length);
}

export type CheckInStatus = {
  /** ISO day the 14-day check-in falls due. */
  dueIso: string;
  /** Days until due; negative when overdue (absolute value = days overdue). */
  days: number;
};

/** The 14-day check-in standing: due = last reached + 14 days. */
export function checkInStatus(lastPrayedDate: string | null | undefined, todayIso: string): CheckInStatus | null {
  if (!lastPrayedDate) return null;
  const dueIso = addIsoDays(lastPrayedDate, 14);
  if (!dueIso) return null;
  const days = diffIsoDays(todayIso, dueIso);
  if (days === null) return null;
  return { dueIso, days };
}
