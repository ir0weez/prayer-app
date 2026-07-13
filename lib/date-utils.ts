/**
 * Add days to a date
 * @param date - The starting date
 * @param days - Number of days to add (can be negative)
 * @returns New date with days added
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get the start of the week (Sunday) for a given date
 * @param date - The date to get the week start for
 * @returns The Sunday of that week
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

/**
 * Get the start of the month for a given date
 * @param date - The date to get the month start for
 * @returns The first day of that month
 */
export function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Get the end of the month for a given date
 * @param date - The date to get the month end for
 * @returns The last day of that month
 */
export function getMonthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Format a date as YYYY-MM-DD in LOCAL timezone (not UTC)
 * @param date - The date to format
 * @returns Formatted date string in YYYY-MM-DD format using local timezone
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a date as YYYY-MM-DD using local timezone (same as formatDateISO)
 * Use this instead of date.toISOString().split('T')[0] to avoid UTC conversion
 * @param date - The date to format
 * @returns Formatted date string in YYYY-MM-DD format
 */
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if two dates are the same day
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Get all days in a month as an array of dates
 * @param date - Any date in the month
 * @returns Array of dates for all days in the month
 */
export function getDaysInMonth(date: Date): Date[] {
  const monthStart = getMonthStart(date);
  const monthEnd = getMonthEnd(date);
  const days: Date[] = [];
  
  for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  
  return days;
}

/**
 * Get the week number of a date within its month
 * @param date - The date
 * @returns Week number (1-6)
 */
export function getWeekOfMonth(date: Date): number {
  const monthStart = getMonthStart(date);
  const firstWeekStart = getWeekStart(monthStart);
  const dateWeekStart = getWeekStart(date);
  const diffMs = dateWeekStart.getTime() - firstWeekStart.getTime();
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
}

/**
 * Get all weeks in a month as arrays of dates
 * @param date - Any date in the month
 * @returns Array of weeks, each week is an array of 7 dates
 */
export function getWeeksInMonth(date: Date): Date[][] {
  const monthStart = getMonthStart(date);
  const monthEnd = getMonthEnd(date);
  const firstWeekStart = getWeekStart(monthStart);
  
  const weeks: Date[][] = [];
  let currentWeekStart = new Date(firstWeekStart);
  
  while (currentWeekStart <= monthEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(addDays(currentWeekStart, i));
    }
    weeks.push(week);
    currentWeekStart = addDays(currentWeekStart, 7);
  }
  
  return weeks;
}
