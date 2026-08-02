import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAllTimeOff,
  createTimeOff,
  updateTimeOff,
  deleteTimeOff,
  getTimeOffForDate,
  isDateDuringTimeOff,
  getActiveTimeOff,
  calculateTimeOffDuration,
  getTimeOffWithDuration,
  getTimeOffColor,
  getTimeOffTextColor,
  getTimeOffIcon,
  getTimeOffLabel,
  TIME_OFF_STORAGE_KEY,
  type TimeOff,
} from '../lib/time-off';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
}));

// Mock generateId
vi.mock('../lib/schedule-data', () => ({
  generateId: () => 'test-id-' + Math.random().toString(36).substr(2, 9),
}));

describe('Time-Off Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllTimeOff', () => {
    it('should return empty array when no data exists', async () => {
      (AsyncStorage.getItem as any).mockResolvedValue(null);
      const result = await getAllTimeOff();
      expect(result).toEqual([]);
    });

    it('should return parsed time-off data', async () => {
      const mockData: TimeOff[] = [
        {
          id: '1',
          title: 'Summer Vacation',
          type: 'vacation',
          startDate: '2026-07-01',
          endDate: '2026-07-14',
          notes: 'Beach trip',
          color: '#E1F5FE',
          createdAt: '2026-06-01T00:00:00Z',
          updatedAt: '2026-06-01T00:00:00Z',
        },
      ];
      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(mockData));
      const result = await getAllTimeOff();
      expect(result).toEqual(mockData);
    });
  });

  describe('createTimeOff', () => {
    it('should create and store a new time-off period', async () => {
      (AsyncStorage.getItem as any).mockResolvedValue(null);
      const result = await createTimeOff('Sick Leave', 'sick', '2026-08-05', '2026-08-06', 'Flu');
      
      expect(result).toMatchObject({
        title: 'Sick Leave',
        type: 'sick',
        startDate: '2026-08-05',
        endDate: '2026-08-06',
        notes: 'Flu',
      });
      expect(result.id).toBeDefined();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        TIME_OFF_STORAGE_KEY,
        expect.stringContaining('Sick Leave')
      );
    });

    it('should append to existing time-off periods', async () => {
      const existing: TimeOff[] = [
        {
          id: '1',
          title: 'Vacation',
          type: 'vacation',
          startDate: '2026-07-01',
          endDate: '2026-07-14',
          color: '#E1F5FE',
          createdAt: '2026-06-01T00:00:00Z',
          updatedAt: '2026-06-01T00:00:00Z',
        },
      ];
      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(existing));
      await createTimeOff('Personal Day', 'personal', '2026-08-10', '2026-08-10');
      
      const savedData = (AsyncStorage.setItem as any).mock.calls[0][1];
      const parsed = JSON.parse(savedData);
      expect(parsed).toHaveLength(2);
      expect(parsed[1].title).toBe('Personal Day');
    });
  });

  describe('updateTimeOff', () => {
    it('should update an existing time-off period', async () => {
      const existing: TimeOff[] = [
        {
          id: '1',
          title: 'Vacation',
          type: 'vacation',
          startDate: '2026-07-01',
          endDate: '2026-07-14',
          color: '#E1F5FE',
          createdAt: '2026-06-01T00:00:00Z',
          updatedAt: '2026-06-01T00:00:00Z',
        },
      ];
      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(existing));
      const result = await updateTimeOff('1', { title: 'Summer Break' });
      
      expect(result?.title).toBe('Summer Break');
      expect(result?.id).toBe('1');
    });

    it('should return null if time-off not found', async () => {
      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify([]));
      const result = await updateTimeOff('nonexistent', { title: 'Updated' });
      expect(result).toBeNull();
    });
  });

  describe('deleteTimeOff', () => {
    it('should delete a time-off period', async () => {
      const existing: TimeOff[] = [
        {
          id: '1',
          title: 'Vacation',
          type: 'vacation',
          startDate: '2026-07-01',
          endDate: '2026-07-14',
          color: '#E1F5FE',
          createdAt: '2026-06-01T00:00:00Z',
          updatedAt: '2026-06-01T00:00:00Z',
        },
      ];
      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(existing));
      const result = await deleteTimeOff('1');
      
      expect(result).toBe(true);
      const savedData = (AsyncStorage.setItem as any).mock.calls[0][1];
      const parsed = JSON.parse(savedData);
      expect(parsed).toHaveLength(0);
    });

    it('should return false if time-off not found', async () => {
      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify([]));
      const result = await deleteTimeOff('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('getTimeOffForDate', () => {
    const timeOffList: TimeOff[] = [
      {
        id: '1',
        title: 'Vacation',
        type: 'vacation',
        startDate: '2026-07-01',
        endDate: '2026-07-14',
        color: '#E1F5FE',
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      },
      {
        id: '2',
        title: 'Sick Leave',
        type: 'sick',
        startDate: '2026-08-05',
        endDate: '2026-08-06',
        color: '#FCE4EC',
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
      },
    ];

    it('should return time-off periods for a given date', () => {
      const result = getTimeOffForDate(timeOffList, '2026-07-05');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should return empty array if no time-off for date', () => {
      const result = getTimeOffForDate(timeOffList, '2026-09-01');
      expect(result).toHaveLength(0);
    });

    it('should include time-off on start and end dates', () => {
      expect(getTimeOffForDate(timeOffList, '2026-07-01')).toHaveLength(1);
      expect(getTimeOffForDate(timeOffList, '2026-07-14')).toHaveLength(1);
    });
  });

  describe('isDateDuringTimeOff', () => {
    const timeOffList: TimeOff[] = [
      {
        id: '1',
        title: 'Vacation',
        type: 'vacation',
        startDate: '2026-07-01',
        endDate: '2026-07-14',
        color: '#E1F5FE',
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      },
    ];

    it('should return true if date is during time-off', () => {
      expect(isDateDuringTimeOff(timeOffList, '2026-07-05')).toBe(true);
    });

    it('should return false if date is not during time-off', () => {
      expect(isDateDuringTimeOff(timeOffList, '2026-09-01')).toBe(false);
    });
  });

  describe('calculateTimeOffDuration', () => {
    it('should calculate duration in days', () => {
      const duration = calculateTimeOffDuration('2026-07-01', '2026-07-14');
      expect(duration).toBe(14);
    });

    it('should handle single-day time-off', () => {
      const duration = calculateTimeOffDuration('2026-08-05', '2026-08-05');
      expect(duration).toBe(1);
    });
  });

  describe('getTimeOffWithDuration', () => {
    it('should include calculated duration', () => {
      const timeOff: TimeOff = {
        id: '1',
        title: 'Vacation',
        type: 'vacation',
        startDate: '2026-07-01',
        endDate: '2026-07-14',
        color: '#E1F5FE',
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      };
      const result = getTimeOffWithDuration(timeOff);
      expect(result.durationDays).toBe(14);
    });
  });

  describe('Helper functions', () => {
    it('getTimeOffColor should return correct color for type', () => {
      expect(getTimeOffColor('vacation')).toBe('#E1F5FE');
      expect(getTimeOffColor('sick')).toBe('#FCE4EC');
      expect(getTimeOffColor('personal')).toBe('#F3E5F5');
    });

    it('getTimeOffTextColor should return correct text color for type', () => {
      expect(getTimeOffTextColor('vacation')).toBe('#01579B');
      expect(getTimeOffTextColor('sick')).toBe('#880E4F');
    });

    it('getTimeOffIcon should return correct icon for type', () => {
      expect(getTimeOffIcon('vacation')).toBe('beach-access');
      expect(getTimeOffIcon('sick')).toBe('local-hospital');
      expect(getTimeOffIcon('personal')).toBe('person');
    });

    it('getTimeOffLabel should return correct label for type', () => {
      expect(getTimeOffLabel('vacation')).toBe('Vacation');
      expect(getTimeOffLabel('sick')).toBe('Sick Leave');
      expect(getTimeOffLabel('personal')).toBe('Personal Time');
      expect(getTimeOffLabel('sabbatical')).toBe('Sabbatical');
    });
  });
});
