// Auto-seeded US holidays for the schedule. Holidays are injected at render
// time only — they are never persisted, exported, or editable.

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  keyword: string; // EVENT_KEYWORD_MAP label, or "" for a plain (non-illustrated) holiday
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function iso(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Day of month for the nth weekday of a month (weekday 0=Sun..6=Sat; n=-1 for last). */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): number {
  if (n > 0) {
    const firstWeekday = new Date(year, month - 1, 1).getDay();
    return 1 + ((weekday - firstWeekday + 7) % 7) + (n - 1) * 7;
  }
  const lastDay = new Date(year, month, 0).getDate();
  const lastWeekday = new Date(year, month - 1, lastDay).getDay();
  return lastDay - ((lastWeekday - weekday + 7) % 7);
}

/** Western (Gregorian) computus — returns Easter Sunday as { month, day }. */
function easterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

/** All US holidays for a year, sorted by date. */
export function getHolidaysForYear(year: number): Holiday[] {
  const easter = easterSunday(year);
  const holidays: Holiday[] = [
    { date: iso(year, 1, 1), name: "New Year's Day", keyword: "New Year" },
    { date: iso(year, 1, nthWeekdayOfMonth(year, 1, 1, 3)), name: "Martin Luther King Jr. Day", keyword: "" },
    { date: iso(year, 2, nthWeekdayOfMonth(year, 2, 1, 3)), name: "Presidents' Day", keyword: "" },
    { date: iso(year, 2, 14), name: "Valentine's Day", keyword: "Valentine's Day" },
    { date: iso(year, 3, 17), name: "St. Patrick's Day", keyword: "St. Patrick's Day" },
    { date: iso(year, easter.month, easter.day), name: "Easter", keyword: "Easter" },
    { date: iso(year, 5, nthWeekdayOfMonth(year, 5, 1, -1)), name: "Memorial Day", keyword: "" },
    { date: iso(year, 6, 19), name: "Juneteenth", keyword: "" },
    { date: iso(year, 7, 4), name: "Independence Day", keyword: "" },
    { date: iso(year, 9, nthWeekdayOfMonth(year, 9, 1, 1)), name: "Labor Day", keyword: "" },
    { date: iso(year, 10, 31), name: "Halloween", keyword: "Halloween" },
    { date: iso(year, 11, 11), name: "Veterans Day", keyword: "" },
    { date: iso(year, 11, nthWeekdayOfMonth(year, 11, 4, 4)), name: "Thanksgiving", keyword: "Thanksgiving" },
    { date: iso(year, 12, 25), name: "Christmas", keyword: "Christmas" },
  ];
  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}
