import { generateId } from './schedule-data';

export interface TimeBlockTemplate {
  id: string;
  name: string;
  description?: string;
  blocks: TemplateBlock[];
  createdAt: string;
}

export interface TemplateBlock {
  title: string;
  startTime: string; // HH:mm
  durationMinutes: number;
  type: 'todo' | 'event' | 'ministry';
  category?: string; // For ministries
  notes?: string;
}

const DEFAULT_TEMPLATES: TimeBlockTemplate[] = [
  {
    id: 'template-productive-day',
    name: 'Productive Day',
    description: 'Balanced schedule with work, prayer, and breaks',
    blocks: [
      { title: 'Morning Prayer', startTime: '06:00', durationMinutes: 30, type: 'todo' },
      { title: 'Work Block 1', startTime: '07:00', durationMinutes: 180, type: 'event' },
      { title: 'Breakfast Break', startTime: '10:00', durationMinutes: 30, type: 'todo' },
      { title: 'Work Block 2', startTime: '10:30', durationMinutes: 180, type: 'event' },
      { title: 'Lunch', startTime: '13:30', durationMinutes: 60, type: 'event' },
      { title: 'Prayer & Meditation', startTime: '14:30', durationMinutes: 30, type: 'todo' },
      { title: 'Work Block 3', startTime: '15:00', durationMinutes: 180, type: 'event' },
      { title: 'Evening Reflection', startTime: '18:00', durationMinutes: 30, type: 'todo' },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'template-prayer-focused',
    name: 'Prayer-Focused Day',
    description: 'Day centered around prayer and spiritual growth',
    blocks: [
      { title: 'Early Morning Prayer', startTime: '05:30', durationMinutes: 60, type: 'todo' },
      { title: 'Bible Study', startTime: '06:30', durationMinutes: 60, type: 'ministry', category: 'Read' },
      { title: 'Breakfast', startTime: '07:30', durationMinutes: 30, type: 'event' },
      { title: 'Midday Prayer', startTime: '12:00', durationMinutes: 30, type: 'todo' },
      { title: 'Worship Time', startTime: '17:00', durationMinutes: 60, type: 'event' },
      { title: 'Evening Devotion', startTime: '20:00', durationMinutes: 45, type: 'todo' },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'template-balanced-wellness',
    name: 'Balanced Wellness',
    description: 'Exercise, work, and personal time',
    blocks: [
      { title: 'Morning Exercise', startTime: '06:00', durationMinutes: 60, type: 'event' },
      { title: 'Shower & Breakfast', startTime: '07:00', durationMinutes: 45, type: 'todo' },
      { title: 'Work Block', startTime: '08:00', durationMinutes: 240, type: 'event' },
      { title: 'Lunch Break', startTime: '12:00', durationMinutes: 60, type: 'event' },
      { title: 'Afternoon Work', startTime: '13:00', durationMinutes: 180, type: 'event' },
      { title: 'Personal Time', startTime: '16:00', durationMinutes: 120, type: 'todo' },
      { title: 'Dinner', startTime: '18:00', durationMinutes: 60, type: 'event' },
    ],
    createdAt: new Date().toISOString(),
  },
];

/**
 * Get all available templates (built-in + user-created)
 */
export function getAllTemplates(userTemplates: TimeBlockTemplate[] = []): TimeBlockTemplate[] {
  return [...DEFAULT_TEMPLATES, ...userTemplates];
}

/**
 * Create a new custom template
 */
export function createTemplate(
  name: string,
  blocks: TemplateBlock[],
  description?: string
): TimeBlockTemplate {
  return {
    id: generateId(),
    name,
    description,
    blocks,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Apply a template to a specific date
 * Returns the scheduled items that should be created
 */
export function applyTemplate(
  template: TimeBlockTemplate,
  date: string
): Array<{
  title: string;
  startTime: string;
  endTime: string;
  type: 'todo' | 'event' | 'ministry';
  category?: string;
  notes?: string;
}> {
  return template.blocks.map((block) => {
    const startMinutes = timeToMinutes(block.startTime);
    const endMinutes = startMinutes + block.durationMinutes;
    return {
      title: block.title,
      startTime: block.startTime,
      endTime: minutesToTime(endMinutes),
      type: block.type,
      category: block.category,
      notes: block.notes,
    };
  });
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
