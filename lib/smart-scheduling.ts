import { ScheduleEvent, ScheduleMinistry, ScheduleTodo } from './schedule-data';

export interface TimeSlot {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  quality: 'excellent' | 'good' | 'fair'; // Based on slot size and position
}

export interface SchedulingSuggestion {
  slots: TimeSlot[];
  recommendation: string;
}

/**
 * Suggests optimal time slots for scheduling new items based on:
 * - Available gaps in the schedule
 * - Preferred slot sizes (e.g., 1h, 2h blocks)
 * - Time of day preferences (morning, afternoon, evening)
 */
export function suggestTimeSlots(
  items: Array<ScheduleEvent | ScheduleMinistry | ScheduleTodo>,
  durationMinutes: number = 60,
  selectedDate?: string
): SchedulingSuggestion {
  // Convert items to time blocks
  const blocks = items
    .filter((item) => {
      const todo = item as ScheduleTodo;
      const event = item as ScheduleEvent;
      return todo.startTime || (event.startTime && event.endTime);
    })
    .map((item) => {
      const todo = item as ScheduleTodo;
      const event = item as ScheduleEvent;
      const startTime = todo.startTime || event.startTime || '';
      const endTime = todo.startTime ? addMinutesToTime(startTime, 60) : event.endTime || '';
      return { start: timeToMinutes(startTime), end: timeToMinutes(endTime) };
    })
    .sort((a, b) => a.start - b.start);

  // Find gaps between scheduled items
  const gaps: TimeSlot[] = [];
  const DAY_START = 6 * 60; // 6 AM
  const DAY_END = 23 * 60; // 11 PM

  let currentTime = DAY_START;

  for (const block of blocks) {
    if (currentTime < block.start) {
      const gapDuration = block.start - currentTime;
      if (gapDuration >= durationMinutes) {
        gaps.push({
          startTime: minutesToTime(currentTime),
          endTime: minutesToTime(block.start),
          durationMinutes: gapDuration,
          quality: gapDuration >= durationMinutes * 2 ? 'excellent' : 'good',
        });
      }
    }
    currentTime = Math.max(currentTime, block.end);
  }

  // Add final gap if available
  if (currentTime < DAY_END) {
    const gapDuration = DAY_END - currentTime;
    if (gapDuration >= durationMinutes) {
      gaps.push({
        startTime: minutesToTime(currentTime),
        endTime: minutesToTime(DAY_END),
        durationMinutes: gapDuration,
        quality: gapDuration >= durationMinutes * 2 ? 'excellent' : 'fair',
      });
    }
  }

  // Generate recommendation
  let recommendation = '';
  if (gaps.length === 0) {
    recommendation = 'Your schedule is fully booked. Consider removing or rescheduling existing items.';
  } else if (gaps.some((g) => g.quality === 'excellent')) {
    const excellentSlot = gaps.find((g) => g.quality === 'excellent')!;
    recommendation = `Best slot: ${excellentSlot.startTime} - ${excellentSlot.endTime} (${excellentSlot.durationMinutes} min)`;
  } else {
    recommendation = `Available slots found. Earliest: ${gaps[0].startTime} - ${gaps[0].endTime}`;
  }

  return { slots: gaps, recommendation };
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Add minutes to a time string
 */
function addMinutesToTime(time: string, minutes: number): string {
  return minutesToTime(timeToMinutes(time) + minutes);
}
