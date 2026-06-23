import { describe, it, expect } from 'vitest';
import { calculateAvailableTimeBlocks, getTimeBlockStats } from './time-blocks';

describe('Available Hours Calculation', () => {
  it('should calculate available hours correctly with 11 hours of scheduled items', () => {
    // Simulate a schedule with 11 hours of items
    const items = [
      { startTime: '06:00', endTime: '09:00' }, // 3h
      { startTime: '09:00', endTime: '12:00' }, // 3h
      { startTime: '12:00', endTime: '14:00' }, // 2h
      { startTime: '14:00', endTime: '17:00' }, // 3h
      // Total: 11 hours of scheduled time
    ];

    const availableBlocks = calculateAvailableTimeBlocks(items);
    const stats = getTimeBlockStats(availableBlocks);

    // From 6 AM to 5 PM = 11 hours scheduled
    // From 5 PM to 11 PM = 6 hours available
    // Total available: 6 hours = 360 minutes
    
    console.log('Available blocks:', availableBlocks);
    console.log('Total available minutes:', stats.totalAvailableMinutes);
    console.log('Total available hours:', Math.floor(stats.totalAvailableMinutes / 60));

    expect(stats.totalAvailableMinutes).toBe(360); // 6 hours
    expect(Math.floor(stats.totalAvailableMinutes / 60)).toBe(6);
  });

  it('should calculate available hours with gaps in schedule', () => {
    // Schedule with gaps
    const items = [
      { startTime: '06:00', endTime: '09:00' }, // 3h
      { startTime: '11:00', endTime: '12:00' }, // 1h
      { startTime: '14:00', endTime: '16:00' }, // 2h
    ];

    const availableBlocks = calculateAvailableTimeBlocks(items);
    const stats = getTimeBlockStats(availableBlocks);

    // 09:00-11:00 (2h) + 12:00-14:00 (2h) + 16:00-23:00 (7h) = 11h = 660 minutes
    expect(stats.totalAvailableMinutes).toBe(660);
    expect(Math.floor(stats.totalAvailableMinutes / 60)).toBe(11);
  });

  it('should handle full day availability (no scheduled items)', () => {
    const items: any[] = [];

    const availableBlocks = calculateAvailableTimeBlocks(items);
    const stats = getTimeBlockStats(availableBlocks);

    // 06:00-23:00 = 17 hours = 1020 minutes
    expect(stats.totalAvailableMinutes).toBe(1020);
    expect(Math.floor(stats.totalAvailableMinutes / 60)).toBe(17);
  });

  it('should handle full day scheduled (no available time)', () => {
    const items = [
      { startTime: '06:00', endTime: '23:00' }, // Full day
    ];

    const availableBlocks = calculateAvailableTimeBlocks(items);
    const stats = getTimeBlockStats(availableBlocks);

    // No available time
    expect(stats.totalAvailableMinutes).toBe(0);
    expect(Math.floor(stats.totalAvailableMinutes / 60)).toBe(0);
  });

  it('should correctly sum multiple available blocks', () => {
    const items = [
      { startTime: '08:00', endTime: '10:00' }, // 2h
      { startTime: '12:00', endTime: '14:00' }, // 2h
      { startTime: '16:00', endTime: '18:00' }, // 2h
    ];

    const availableBlocks = calculateAvailableTimeBlocks(items);
    const stats = getTimeBlockStats(availableBlocks);

    // 06:00-08:00 (2h) + 10:00-12:00 (2h) + 14:00-16:00 (2h) + 18:00-23:00 (5h) = 11h = 660 minutes
    expect(stats.totalAvailableMinutes).toBe(660);
    expect(Math.floor(stats.totalAvailableMinutes / 60)).toBe(11);
  });
});
