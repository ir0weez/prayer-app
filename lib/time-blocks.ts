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
 * Ensures the time is in valid 24-hour format before conversion
 */
export function timeToMinutes(time: string): number {
  if (!time || typeof time !== 'string') {
    console.warn(`Invalid time input: ${time}`);
    return 0;
  }
  
  const trimmed = time.trim();
  const parts = trimmed.split(":");
  
  if (parts.length !== 2) {
    console.warn(`Invalid time format: ${time}. Expected HH:mm`);
    return 0;
  }
  
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  
  // Validate ranges
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    console.warn(`Invalid time values: hours=${hours}, minutes=${minutes}`);
    return 0;
  }
  
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
  id?: string;
  startTime?: string;
  endTime?: string;
  isCompleted?: boolean;
};

export type LiveCursorPosition = {
  activeItemId: string | null;
  progress: number;
  currentMinutes: number;
};

/**
 * Returns the live position of the schedule cursor. During a scheduled block,
 * progress moves from 0 to 1. During a gap, activeItemId is null and the cursor
 * remains at the gap boundary until the next scheduled block begins.
 */
export function getLiveCursorPosition(
  items: ScheduleItem[],
  now = new Date(),
): LiveCursorPosition {
  const currentMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const scheduled = items
    .filter((item) => item.startTime)
    .map((item, index) => {
      const start = timeToMinutes(item.startTime!);
      const end = item.endTime ? timeToMinutes(item.endTime) : start + 60;
      return { item, index, start, end: Math.max(end, start + 1) };
    })
    .sort((a, b) => a.start - b.start || a.index - b.index);

  const active = scheduled.find(({ start, end }) => currentMinutes >= start && currentMinutes < end);
  if (!active) {
    return { activeItemId: null, progress: 0, currentMinutes };
  }

  return {
    activeItemId: active.item.id ?? null,
    progress: Math.min(1, Math.max(0, (currentMinutes - active.start) / (active.end - active.start))),
    currentMinutes,
  };
}

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
  // Note: Include completed items so they still block calendar time
  const scheduledItems = items
    .filter((item) => item.startTime)
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
 * Only filters if the selectedDate is today
 */
export function filterExpiredTimeBlocks(blocks: TimeBlock[], selectedDate?: string, now = new Date()): TimeBlock[] {
  // Get today's date in ISO format (YYYY-MM-DD)
  const today = now;
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayISO = `${year}-${month}-${day}`;
  
  // Only filter if the selected date is today
  if (selectedDate !== todayISO) {
    return blocks;
  }
  
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

  return blocks.flatMap((block) => {
    const blockStartMinutes = timeToMinutes(block.startTime);
    const blockEndMinutes = timeToMinutes(block.endTime);
    if (blockEndMinutes <= currentTimeMinutes) return [];

    // A live block must begin at the current minute so its range, badge, and summary
    // all describe the same remaining time rather than the original full duration.
    if (blockStartMinutes < currentTimeMinutes) {
      const durationMinutes = blockEndMinutes - currentTimeMinutes;
      return [{
        ...block,
        startTime: minutesToTime(currentTimeMinutes),
        durationMinutes,
        label: formatDuration(durationMinutes),
      }];
    }

    return [block];
  });
}

/**
 * Calculate the free-time blocks that should be visible for a selected day.
 * Completed items remain scheduled commitments, so checking an item off does
 * not make the available-hours total jump. Past days intentionally return no
 * remaining availability, while today's first live block is clipped to now.
 */
export function calculateActiveAvailableTimeBlocks(
  items: ScheduleItem[],
  selectedDate: string,
  now = new Date(),
  businessHourStart = "06:00",
  businessHourEnd = "23:00",
): TimeBlock[] {
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (selectedDate < todayISO) return [];

  const blocks = calculateAvailableTimeBlocks(items, businessHourStart, businessHourEnd);
  return filterExpiredTimeBlocks(blocks, selectedDate, now);
}

/**
 * Return the index where the NOW marker belongs. An item that begins at the
 * exact current minute follows the marker, placing the line on its top edge
 * rather than below the item.
 */
export function getCurrentTimeInsertionIndex(
  items: Array<{ sortTime: string }>,
  currentTime: string,
): number {
  const index = items.findIndex((item) => item.sortTime.localeCompare(currentTime) >= 0);
  return index === -1 ? items.length : index;
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
