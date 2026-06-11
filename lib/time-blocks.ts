/**
 * Time Block Helpers - Calculate available "white spaces" in the schedule
 * Used for leadership planning and identifying available time slots
 */

export type TimeBlock = {
  id: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  label: string; // e.g., "2h 30m available"
  color?: string; // Optional user-selected color (hex)
  isExpired?: boolean; // Whether the time block has passed
};

/**
 * Convert time string (HH:mm) to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:mm)
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/**
 * Format duration in minutes to readable string (e.g., "2h 30m")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

export type ScheduleItem = {
  startTime?: string;
  endTime?: string;
  isCompleted?: boolean;
};

/**
 * Calculate available time blocks for a given day
 * Assumes business hours: 6:00 AM to 11:00 PM
 * @param items - Array of todos, events, ministries with times
 * @param businessHourStart - Start time in HH:mm (default: 06:00)
 * @param businessHourEnd - End time in HH:mm (default: 23:00)
 * @returns Array of available time blocks
 */
export function calculateAvailableTimeBlocks(
  items: ScheduleItem[],
  businessHourStart: string = "06:00",
  businessHourEnd: string = "23:00"
): TimeBlock[] {
  // Filter items with times and sort by start time
  const scheduledItems = items
    .filter((item) => item.startTime && !item.isCompleted)
    .map((item) => ({
      start: timeToMinutes(item.startTime!),
      end: item.endTime ? timeToMinutes(item.endTime) : timeToMinutes(item.startTime!) + 60,
    }))
    .sort((a, b) => a.start - b.start);

  const dayStart = timeToMinutes(businessHourStart);
  const dayEnd = timeToMinutes(businessHourEnd);
  const availableBlocks: TimeBlock[] = [];
  let currentTime = dayStart;

  // Find gaps between scheduled items
  for (const item of scheduledItems) {
    // Skip items that start before current time
    if (item.start <= currentTime) {
      currentTime = Math.max(currentTime, item.end);
      continue;
    }

    // Found a gap
    if (item.start > currentTime) {
      const gapDuration = item.start - currentTime;
      availableBlocks.push({
        id: `gap-${currentTime}-${item.start}`,
        startTime: minutesToTime(currentTime),
        endTime: minutesToTime(item.start),
        durationMinutes: gapDuration,
        label: formatDuration(gapDuration),
      });
    }

    currentTime = Math.max(currentTime, item.end);
  }

  // Add final block if there's time left in the day
  if (currentTime < dayEnd) {
    const finalDuration = dayEnd - currentTime;
    availableBlocks.push({
      id: `gap-${currentTime}-${dayEnd}`,
      startTime: minutesToTime(currentTime),
      endTime: minutesToTime(dayEnd),
      durationMinutes: finalDuration,
      label: formatDuration(finalDuration),
    });
  }

  return availableBlocks;
}

/**
 * Filter out expired time blocks based on current time
 */
export function filterExpiredTimeBlocks(blocks: TimeBlock[]): TimeBlock[] {
  const now = new Date();
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
  
  return blocks.filter((block) => {
    const blockEndMinutes = timeToMinutes(block.endTime);
    return blockEndMinutes > currentTimeMinutes;
  });
}

/**
 * Get summary statistics about available time
 */
export function getTimeBlockStats(blocks: TimeBlock[]) {
  const totalMinutes = blocks.reduce((sum, block) => sum + block.durationMinutes, 0);
  const largestBlock = blocks.length > 0 ? Math.max(...blocks.map((b) => b.durationMinutes)) : 0;
  const smallestBlock = blocks.length > 0 ? Math.min(...blocks.map((b) => b.durationMinutes)) : 0;

  return {
    totalAvailableMinutes: totalMinutes,
    totalAvailableLabel: formatDuration(totalMinutes),
    blockCount: blocks.length,
    largestBlockMinutes: largestBlock,
    largestBlockLabel: formatDuration(largestBlock),
    smallestBlockMinutes: smallestBlock,
    smallestBlockLabel: formatDuration(smallestBlock),
  };
}
