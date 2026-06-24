/**
 * Remaining Time Calculator - Calculate actual free time from now until midnight
 * Properly accounts for current time and all scheduled items
 */

import { timeToMinutes } from './time-blocks';

export type ScheduleItem = {
  startTime?: string;
  endTime?: string;
  isCompleted?: boolean;
};

/**
 * Calculate remaining free time from now until midnight (23:59)
 * @param items - Array of todos, events, ministries with times
 * @param currentDate - Current date in YYYY-MM-DD format
 * @returns Object with remaining minutes, hours, and formatted string
 */
export function calculateRemainingTime(
  items: ScheduleItem[],
  currentDate: string
): { remainingMinutes: number; remainingHours: number; formattedTime: string; nextFreeSlot?: { startTime: string; durationMinutes: number } } {
  const now = new Date();
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
  const dayEnd = 23 * 60 + 59; // 23:59 in minutes

  // Filter scheduled items with times and sort by start time
  const scheduledItems = items
    .filter((item) => item.startTime && !item.isCompleted)
    .map((item) => ({
      start: timeToMinutes(item.startTime!),
      end: item.endTime ? timeToMinutes(item.endTime) : timeToMinutes(item.startTime!) + 60,
    }))
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

  // Calculate free time from now until midnight
  let totalFreeMinutes = 0;
  let nextFreeSlot: { startTime: string; durationMinutes: number } | undefined;
  let currentTime = currentTimeMinutes;

  for (const item of mergedItems) {
    // Skip items that have already ended
    if (item.end <= currentTime) {
      continue;
    }

    // If there's a gap before this item
    if (item.start > currentTime) {
      const gapDuration = item.start - currentTime;
      totalFreeMinutes += gapDuration;

      // Record the first free slot
      if (!nextFreeSlot) {
        const hours = Math.floor(item.start / 60);
        const minutes = item.start % 60;
        nextFreeSlot = {
          startTime: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
          durationMinutes: gapDuration,
        };
      }

      currentTime = item.end;
    } else {
      // Item starts before or at current time - move current time past it
      currentTime = Math.max(currentTime, item.end);
    }
  }

  // Add remaining time until midnight
  if (currentTime < dayEnd) {
    const remainingUntilMidnight = dayEnd - currentTime;
    totalFreeMinutes += remainingUntilMidnight;

    // If no free slot found yet, this is the first one
    if (!nextFreeSlot) {
      const hours = Math.floor(currentTime / 60);
      const minutes = currentTime % 60;
      nextFreeSlot = {
        startTime: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
        durationMinutes: remainingUntilMidnight,
      };
    }
  }

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
