/**
 * Remaining Time Calculator - Calculate free time within the day window (6 AM to 11 PM)
 * Properly accounts for scheduled items within the day window
 */

import { timeToMinutes } from './time-blocks';

export type ScheduleItem = {
  startTime?: string;
  endTime?: string;
  isCompleted?: boolean;
};

// Day window: 6:00 AM to 11:00 PM
const DAY_START_MINUTES = 6 * 60; // 6:00 AM = 360 minutes
const DAY_END_MINUTES = 23 * 60; // 11:00 PM = 1380 minutes
const TOTAL_DAY_MINUTES = DAY_END_MINUTES - DAY_START_MINUTES; // 17 hours = 1020 minutes

/**
 * Calculate available free time within the day window (6 AM to 11 PM)
 * Subtracts scheduled items from the total day window
 * @param items - Array of todos, events, ministries with times
 * @param currentDate - Current date in YYYY-MM-DD format
 * @returns Object with remaining minutes, hours, and formatted string
 */
export function calculateRemainingTime(
  items: ScheduleItem[],
  currentDate: string
): { remainingMinutes: number; remainingHours: number; formattedTime: string; nextFreeSlot?: { startTime: string; durationMinutes: number } } {
  // Filter scheduled items with times and only count those within the day window
  // Note: Include completed items so they still block calendar time (matching time blocks display)
  const scheduledItems = items
    .filter((item) => item.startTime)
    .map((item) => {
      const start = timeToMinutes(item.startTime!);
      const end = item.endTime ? timeToMinutes(item.endTime) : start + 60;
      
      // Clamp to day window (but don't clamp if item is outside the window entirely)
      const clampedStart = Math.max(start, DAY_START_MINUTES);
      const clampedEnd = Math.min(end, DAY_END_MINUTES);
      return {
        start: clampedStart,
        end: clampedEnd,
      };
    })
    .filter((item) => item.start < item.end) // Only keep valid items within day window
    .sort((a, b) => a.start - b.start);

  // Merge overlapping items
  const mergedItems: Array<{ start: number; end: number }> = [];
  for (const item of scheduledItems) {
    if (mergedItems.length === 0) {
      mergedItems.push(item);
    } else {
      const lastItem = mergedItems[mergedItems.length - 1];
      if (item.start <= lastItem.end) {
        // Overlapping or adjacent - merge
        lastItem.end = Math.max(lastItem.end, item.end);
      } else {
        // No overlap - add as new item
        mergedItems.push(item);
      }
    }
  }

  // Calculate total scheduled time
  let totalScheduledMinutes = 0;
  for (const item of mergedItems) {
    totalScheduledMinutes += item.end - item.start;
  }

  // Available time = total day time - scheduled time
  const totalFreeMinutes = TOTAL_DAY_MINUTES - totalScheduledMinutes;

  // Format the time
  const hours = Math.floor(totalFreeMinutes / 60);
  const minutes = totalFreeMinutes % 60;
  let formattedTime = '';
  if (hours > 0) {
    formattedTime = `${hours}h`;
    if (minutes > 0) {
      formattedTime += ` ${minutes}m`;
    }
  } else if (minutes > 0) {
    formattedTime = `${minutes}m`;
  } else {
    formattedTime = 'No free time';
  }

  // Find next free slot (gap between scheduled items or before first item)
  let nextFreeSlot: { startTime: string; durationMinutes: number } | undefined;
  
  if (mergedItems.length === 0) {
    // No scheduled items - entire day is free
    nextFreeSlot = {
      startTime: '06:00',
      durationMinutes: TOTAL_DAY_MINUTES,
    };
  } else if (mergedItems[0].start > DAY_START_MINUTES) {
    // Free time before first item
    const gapStart = DAY_START_MINUTES;
    const gapDuration = mergedItems[0].start - gapStart;
    const hours = Math.floor(gapStart / 60);
    const mins = gapStart % 60;
    nextFreeSlot = {
      startTime: `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`,
      durationMinutes: gapDuration,
    };
  } else {
    // Free time after last item
    const lastItem = mergedItems[mergedItems.length - 1];
    if (lastItem.end < DAY_END_MINUTES) {
      const gapStart = lastItem.end;
      const gapDuration = DAY_END_MINUTES - gapStart;
      const hours = Math.floor(gapStart / 60);
      const mins = gapStart % 60;
      nextFreeSlot = {
        startTime: `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`,
        durationMinutes: gapDuration,
      };
    }
  }

  return {
    remainingMinutes: totalFreeMinutes,
    remainingHours: hours,
    formattedTime,
    nextFreeSlot,
  };
}

/**
 * Get remaining time for today only
 */
export function getRemainingTimeForToday(items: ScheduleItem[]): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayISO = `${year}-${month}-${day}`;

  const result = calculateRemainingTime(items, todayISO);
  return result.formattedTime;
}
