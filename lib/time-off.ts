/**
 * Time-off management for Prayer Circle
 * Allows users to schedule vacation, sick days, or other unavailable periods
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from './schedule-data';

export const TIME_OFF_STORAGE_KEY = 'prayercircle.timeoff.v1';

export type TimeOffType = 'vacation' | 'sick' | 'personal' | 'sabbatical' | 'other';

export interface TimeOff {
  id: string;
  title: string;
  type: TimeOffType;
  startDate: string; // ISO YYYY-MM-DD
  endDate: string; // ISO YYYY-MM-DD
  notes?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeOffWithDuration extends TimeOff {
  durationDays: number;
}

const TIME_OFF_COLORS: Record<TimeOffType, string> = {
  vacation: '#E1F5FE',
  sick: '#FCE4EC',
  personal: '#F3E5F5',
  sabbatical: '#E8F5E9',
  other: '#FFF3E0',
};

const TIME_OFF_TEXT_COLORS: Record<TimeOffType, string> = {
  vacation: '#01579B',
  sick: '#880E4F',
  personal: '#4A148C',
  sabbatical: '#1B5E20',
  other: '#E65100',
};

/**
 * Get all time-off periods
 */
export async function getAllTimeOff(): Promise<TimeOff[]> {
  try {
    const stored = await AsyncStorage.getItem(TIME_OFF_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading time-off data:', error);
    return [];
  }
}

/**
 * Create a new time-off period
 */
export async function createTimeOff(
  title: string,
  type: TimeOffType,
  startDate: string,
  endDate: string,
  notes?: string
): Promise<TimeOff> {
  const now = new Date().toISOString();
  const timeOff: TimeOff = {
    id: generateId(),
    title,
    type,
    startDate,
    endDate,
    notes,
    color: TIME_OFF_COLORS[type],
    createdAt: now,
    updatedAt: now,
  };

  const allTimeOff = await getAllTimeOff();
  allTimeOff.push(timeOff);
  await AsyncStorage.setItem(TIME_OFF_STORAGE_KEY, JSON.stringify(allTimeOff));

  return timeOff;
}

/**
 * Update a time-off period
 */
export async function updateTimeOff(
  id: string,
  updates: Partial<Omit<TimeOff, 'id' | 'createdAt'>>
): Promise<TimeOff | null> {
  const allTimeOff = await getAllTimeOff();
  const index = allTimeOff.findIndex((t) => t.id === id);

  if (index === -1) {
    return null;
  }

  const updated: TimeOff = {
    ...allTimeOff[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  allTimeOff[index] = updated;
  await AsyncStorage.setItem(TIME_OFF_STORAGE_KEY, JSON.stringify(allTimeOff));

  return updated;
}

/**
 * Delete a time-off period
 */
export async function deleteTimeOff(id: string): Promise<boolean> {
  const allTimeOff = await getAllTimeOff();
  const filtered = allTimeOff.filter((t) => t.id !== id);

  if (filtered.length === allTimeOff.length) {
    return false;
  }

  await AsyncStorage.setItem(TIME_OFF_STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Get time-off periods for a specific date
 */
export function getTimeOffForDate(timeOffList: TimeOff[], date: string): TimeOff[] {
  return timeOffList.filter((timeOff) => {
    return date >= timeOff.startDate && date <= timeOff.endDate;
  });
}

/**
 * Check if a date is during time-off
 */
export function isDateDuringTimeOff(timeOffList: TimeOff[], date: string): boolean {
  return getTimeOffForDate(timeOffList, date).length > 0;
}

/**
 * Get active time-off periods (currently ongoing or upcoming)
 */
export function getActiveTimeOff(timeOffList: TimeOff[]): TimeOff[] {
  const today = new Date().toISOString().split('T')[0];
  return timeOffList.filter((timeOff) => timeOff.endDate >= today);
}

/**
 * Calculate duration of time-off in days
 */
export function calculateTimeOffDuration(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}

/**
 * Get time-off with calculated duration
 */
export function getTimeOffWithDuration(timeOff: TimeOff): TimeOffWithDuration {
  return {
    ...timeOff,
    durationDays: calculateTimeOffDuration(timeOff.startDate, timeOff.endDate),
  };
}

/**
 * Get color for time-off type
 */
export function getTimeOffColor(type: TimeOffType): string {
  return TIME_OFF_COLORS[type];
}

/**
 * Get text color for time-off type
 */
export function getTimeOffTextColor(type: TimeOffType): string {
  return TIME_OFF_TEXT_COLORS[type];
}

/**
 * Get icon for time-off type
 */
export function getTimeOffIcon(type: TimeOffType): string {
  const icons: Record<TimeOffType, string> = {
    vacation: 'beach-access',
    sick: 'local-hospital',
    personal: 'person',
    sabbatical: 'self-improvement',
    other: 'event-busy',
  };
  return icons[type];
}

/**
 * Get label for time-off type
 */
export function getTimeOffLabel(type: TimeOffType): string {
  const labels: Record<TimeOffType, string> = {
    vacation: 'Vacation',
    sick: 'Sick Leave',
    personal: 'Personal Time',
    sabbatical: 'Sabbatical',
    other: 'Time Off',
  };
  return labels[type];
}
