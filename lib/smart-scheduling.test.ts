import { describe, it, expect } from 'vitest';
import { suggestTimeSlots } from './smart-scheduling';
import { createTemplate, applyTemplate, getAllTemplates } from './time-block-templates';
import type { ScheduleEvent, ScheduleTodo } from './schedule-data';

describe('Smart Scheduling', () => {
  it('should suggest time slots for 1-hour event with no conflicts', () => {
    const items: ScheduleEvent[] = [];
    const suggestion = suggestTimeSlots(items, 60);
    
    expect(suggestion.slots.length).toBeGreaterThan(0);
    expect(suggestion.slots[0].startTime).toBe('06:00');
    expect(suggestion.slots[0].durationMinutes).toBeGreaterThanOrEqual(60);
  });

  it('should find gaps between scheduled events', () => {
    const items: ScheduleEvent[] = [
      {
        id: '1',
        title: 'Meeting',
        date: '2026-06-24',
        startTime: '09:00',
        endTime: '10:00',
        location: 'Office',
        notes: '',
        isCompleted: false,
      },
      {
        id: '2',
        title: 'Lunch',
        date: '2026-06-24',
        startTime: '12:00',
        endTime: '13:00',
        location: 'Cafe',
        notes: '',
        isCompleted: false,
      },
    ];

    const suggestion = suggestTimeSlots(items, 60);
    
    // Should find gap between 10:00 and 12:00
    const gapBetween = suggestion.slots.find(
      (s) => s.startTime === '10:00' && s.endTime === '12:00'
    );
    expect(gapBetween).toBeDefined();
    expect(gapBetween?.durationMinutes).toBe(120);
  });

  it('should mark excellent quality slots for large gaps', () => {
    const items: ScheduleEvent[] = [
      {
        id: '1',
        title: 'Event',
        date: '2026-06-24',
        startTime: '09:00',
        endTime: '10:00',
        location: '',
        notes: '',
        isCompleted: false,
      },
    ];

    const suggestion = suggestTimeSlots(items, 60);
    const excellentSlots = suggestion.slots.filter((s) => s.quality === 'excellent');
    
    expect(excellentSlots.length).toBeGreaterThan(0);
  });

  it('should return recommendation when schedule is full', () => {
    const items: ScheduleEvent[] = [
      {
        id: '1',
        title: 'Event 1',
        date: '2026-06-24',
        startTime: '06:00',
        endTime: '23:00',
        location: '',
        notes: '',
        isCompleted: false,
      },
    ];

    const suggestion = suggestTimeSlots(items, 1440);
    
    expect(suggestion.recommendation).toContain('fully booked');
  });
});

describe('Time Block Templates', () => {
  it('should create a new template', () => {
    const template = createTemplate('Test Template', [
      {
        title: 'Task 1',
        startTime: '09:00',
        durationMinutes: 60,
        type: 'todo',
      },
    ]);

    expect(template.name).toBe('Test Template');
    expect(template.blocks.length).toBe(1);
    expect(template.id).toBeDefined();
  });

  it('should apply template to a date', () => {
    const template = createTemplate('Test', [
      {
        title: 'Morning Task',
        startTime: '06:00',
        durationMinutes: 60,
        type: 'todo',
      },
      {
        title: 'Afternoon Task',
        startTime: '14:00',
        durationMinutes: 120,
        type: 'event',
      },
    ]);

    const scheduled = applyTemplate(template, '2026-06-24');

    expect(scheduled.length).toBe(2);
    expect(scheduled[0].title).toBe('Morning Task');
    expect(scheduled[0].startTime).toBe('06:00');
    expect(scheduled[0].endTime).toBe('07:00');
    expect(scheduled[1].endTime).toBe('16:00');
  });

  it('should get all templates including defaults', () => {
    const userTemplates = createTemplate('Custom', [
      {
        title: 'Custom Task',
        startTime: '10:00',
        durationMinutes: 30,
        type: 'todo',
      },
    ]);

    const allTemplates = getAllTemplates([userTemplates]);

    expect(allTemplates.length).toBeGreaterThan(1);
    expect(allTemplates.some((t) => t.name === 'Custom')).toBe(true);
    expect(allTemplates.some((t) => t.name === 'Productive Day')).toBe(true);
  });

  it('should have default templates with valid blocks', () => {
    const templates = getAllTemplates();

    templates.forEach((template) => {
      expect(template.blocks.length).toBeGreaterThan(0);
      template.blocks.forEach((block) => {
        expect(block.title).toBeDefined();
        expect(block.startTime).toMatch(/^\d{2}:\d{2}$/);
        expect(block.durationMinutes).toBeGreaterThan(0);
        expect(['todo', 'event', 'ministry']).toContain(block.type);
      });
    });
  });
});
