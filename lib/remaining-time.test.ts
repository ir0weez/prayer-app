import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateRemainingTime } from './remaining-time';

describe('Remaining Time Calculator', () => {
  beforeEach(() => {
    // Mock current time to 14:00 (2 PM)
    vi.setSystemTime(new Date('2026-06-30T14:00:00'));
  });

  it('should calculate remaining time with no scheduled items', () => {
    const result = calculateRemainingTime([], '2026-06-30');
    // From 14:00 to 23:59 = 9h 59m = 599 minutes
    expect(result.remainingMinutes).toBe(599);
    expect(result.remainingHours).toBe(9);
  });

  it('should calculate remaining time with scheduled items', () => {
    const items = [
      { startTime: '15:00', endTime: '16:00' }, // 3 PM - 4 PM (1 hour)
      { startTime: '17:00', endTime: '18:00' }, // 5 PM - 6 PM (1 hour)
    ];
    const result = calculateRemainingTime(items, '2026-06-30');
    // From 14:00 to 23:59 = 9h 59m = 599 minutes
    // Minus 15:00-16:00 (60 min) and 17:00-18:00 (60 min) = 479 minutes
    expect(result.remainingMinutes).toBe(479);
    expect(result.remainingHours).toBe(7);
  });

  it('should handle overlapping items', () => {
    const items = [
      { startTime: '15:00', endTime: '16:30' },
      { startTime: '16:00', endTime: '17:00' }, // Overlaps with first
    ];
    const result = calculateRemainingTime(items, '2026-06-30');
    // From 14:00 to 23:59 = 599 minutes
    // Minus merged 15:00-17:00 (120 min) = 479 minutes
    expect(result.remainingMinutes).toBe(479);
  });

  it('should ignore completed items', () => {
    const items = [
      { startTime: '15:00', endTime: '16:00', isCompleted: true }, // Should be ignored
      { startTime: '17:00', endTime: '18:00', isCompleted: false },
    ];
    const result = calculateRemainingTime(items, '2026-06-30');
    // From 14:00 to 23:59 = 599 minutes
    // Minus only 17:00-18:00 (60 min) = 539 minutes
    expect(result.remainingMinutes).toBe(539);
  });

  it('should identify next free slot', () => {
    const items = [
      { startTime: '14:30', endTime: '15:30' }, // 2:30 PM - 3:30 PM
      { startTime: '16:00', endTime: '17:00' }, // 4 PM - 5 PM
    ];
    const result = calculateRemainingTime(items, '2026-06-30');
    expect(result.nextFreeSlot).toBeDefined();
    expect(result.nextFreeSlot?.startTime).toBe('14:30'); // Free from 2:30 PM
    expect(result.nextFreeSlot?.durationMinutes).toBe(30); // 30 minutes until 3:30 PM
  });

  it('should handle items that have already passed', () => {
    const items = [
      { startTime: '12:00', endTime: '13:00' }, // Already passed
      { startTime: '15:00', endTime: '16:00' }, // Future
    ];
    const result = calculateRemainingTime(items, '2026-06-30');
    // From 14:00 to 23:59 = 599 minutes
    // Minus only 15:00-16:00 (60 min) = 539 minutes
    expect(result.remainingMinutes).toBe(539);
  });

  it('should format time correctly', () => {
    const items = [
      { startTime: '14:00', endTime: '14:30' }, // 30 minutes
      { startTime: '15:00', endTime: '22:00' }, // 7 hours
    ];
    const result = calculateRemainingTime(items, '2026-06-30');
    // Free time: 14:30-15:00 (30 min) + 22:00-23:59 (119 min) = 149 minutes = 2h 29m
    expect(result.formattedTime).toContain('h');
    expect(result.formattedTime).toContain('m');
  });

  it('should handle todos with only start time (default 1 hour)', () => {
    const items = [
      { startTime: '15:00' }, // No end time - defaults to 1 hour
    ];
    const result = calculateRemainingTime(items, '2026-06-30');
    // From 14:00 to 23:59 = 599 minutes
    // Minus 15:00-16:00 (60 min) = 539 minutes
    expect(result.remainingMinutes).toBe(539);
  });
});
