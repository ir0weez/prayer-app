import { describe, it, expect } from 'vitest';
import {
  addDays,
  getWeekStart,
  getMonthStart,
  getMonthEnd,
  formatDateISO,
  isSameDay,
  getDaysInMonth,
  getWeekOfMonth,
  getWeeksInMonth,
} from '../date-utils';

describe('date-utils', () => {
  describe('addDays', () => {
    it('should add days to a date', () => {
      const date = new Date('2026-07-09');
      const result = addDays(date, 5);
      expect(result.getDate()).toBe(14);
    });

    it('should subtract days when negative', () => {
      const date = new Date('2026-07-09');
      const result = addDays(date, -3);
      expect(result.getDate()).toBe(6);
    });

    it('should handle month boundaries', () => {
      const date = new Date('2026-07-31');
      const result = addDays(date, 1);
      expect(result.getMonth()).toBe(7); // August
      expect(result.getDate()).toBe(1);
    });
  });

  describe('getWeekStart', () => {
    it('should return Sunday for any day in the week', () => {
      // July 9, 2026 is a Wednesday
      const date = new Date('2026-07-09');
      const weekStart = getWeekStart(date);
      expect(weekStart.getDay()).toBe(0); // Sunday
      expect(weekStart.getDate()).toBe(5); // Previous Sunday
    });

    it('should return the same date if it is Sunday', () => {
      // July 5, 2026 is a Sunday
      const date = new Date('2026-07-05');
      const weekStart = getWeekStart(date);
      expect(weekStart.getDay()).toBe(0);
      expect(weekStart.getDate()).toBe(5);
    });
  });

  describe('getMonthStart', () => {
    it('should return the first day of the month', () => {
      const date = new Date('2026-07-15');
      const monthStart = getMonthStart(date);
      expect(monthStart.getDate()).toBe(1);
      expect(monthStart.getMonth()).toBe(6); // July
    });
  });

  describe('getMonthEnd', () => {
    it('should return the last day of the month', () => {
      const date = new Date('2026-07-15');
      const monthEnd = getMonthEnd(date);
      expect(monthEnd.getDate()).toBe(31);
      expect(monthEnd.getMonth()).toBe(6); // July
    });

    it('should handle February in non-leap year', () => {
      const date = new Date('2027-02-15');
      const monthEnd = getMonthEnd(date);
      expect(monthEnd.getDate()).toBe(28);
    });
  });

  describe('formatDateISO', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date('2026-07-09');
      const formatted = formatDateISO(date);
      expect(formatted).toMatch(/2026-07-09/);
    });
  });

  describe('isSameDay', () => {
    it('should return true for same day', () => {
      const date1 = new Date('2026-07-09T10:00:00');
      const date2 = new Date('2026-07-09T20:00:00');
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('should return false for different days', () => {
      const date1 = new Date('2026-07-09');
      const date2 = new Date('2026-07-10');
      expect(isSameDay(date1, date2)).toBe(false);
    });
  });

  describe('getDaysInMonth', () => {
    it('should return all days in July (31 days)', () => {
      const date = new Date('2026-07-15');
      const days = getDaysInMonth(date);
      expect(days.length).toBe(31);
      expect(days[0].getDate()).toBe(1);
      expect(days[30].getDate()).toBe(31);
    });

    it('should return all days in February (28 days in 2027)', () => {
      const date = new Date('2027-02-15');
      const days = getDaysInMonth(date);
      expect(days.length).toBe(28);
    });
  });

  describe('getWeekOfMonth', () => {
    it('should return correct week number', () => {
      // July 1, 2026 is a Wednesday (week 1)
      const date1 = new Date('2026-07-01');
      expect(getWeekOfMonth(date1)).toBe(1);

      // July 12, 2026 is a Sunday (week 3)
      const date2 = new Date('2026-07-12');
      expect(getWeekOfMonth(date2)).toBe(3);
    });
  });

  describe('getWeeksInMonth', () => {
    it('should return all weeks in a month', () => {
      const date = new Date('2026-07-15');
      const weeks = getWeeksInMonth(date);
      
      // July 2026 should have 5 weeks (starts on Wed, ends on Fri)
      expect(weeks.length).toBeGreaterThanOrEqual(4);
      
      // Each week should have 7 days
      weeks.forEach(week => {
        expect(week.length).toBe(7);
      });
    });
  });
});
