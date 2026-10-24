// ─── v227 "The Schedule Answers Back" — pins ────────────────────────────────
// The return road for the schedule: the DATA backup's studioSchedule
// section carries every dated event/todo in the app's stores, serialized
// in the EXACT pack shape the studio emits and the v222 importer
// accepts. These pins hold the shape conventions (day/start/minutes/
// online/recur), the undated exclusion count, and the round trip home
// through parseStudioFile + mergeStudioSchedule into an empty store.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      store.delete(k);
    }),
    clear: vi.fn(async () => {
      store.clear();
    }),
  },
}));

import { mergeStudioSchedule, parseStudioFile } from '../bible-v205/studio-import';
import { collectStudioSchedule } from '../bible-v205/studio-schedule';
import {
  createScheduleEvent,
  createScheduleTodo,
  type ScheduleEvent,
  type ScheduleTodo,
} from '../schedule-data';

beforeEach(() => {
  store.clear();
});

const NOW = new Date(2026, 9, 24, 12, 0, 0);

const ev = (data: Parameters<typeof createScheduleEvent>[0]): ScheduleEvent => createScheduleEvent(data);
const td = (data: Parameters<typeof createScheduleTodo>[0], n = 0): ScheduleTodo => createScheduleTodo(data, n);

describe('collectStudioSchedule — pack shape', () => {
  it('serializes a timed event with the studio conventions (day short name, HH:mm start, end−start minutes)', () => {
    const section = collectStudioSchedule(
      [ev({ title: 'Commentary writing — Genesis 2', date: '2026-10-27', startTime: '11:00', endTime: '12:00' })],
      [],
      NOW,
    );
    expect(section.exportedAt).toBe(NOW.toISOString());
    expect(section.undatedExcluded).toBe(0);
    expect(section.events).toEqual([
      {
        title: 'Commentary writing — Genesis 2',
        day: 'Tue', // 2026-10-27 is a Tuesday
        date: '2026-10-27',
        start: '11:00',
        minutes: 60,
        type: 'Event',
        online: false,
        recur: 'none',
        notes: '',
        location: '',
      },
    ]);
  });

  it('re-pads a single-digit stored hour to the pack’s two-digit HH:mm', () => {
    const section = collectStudioSchedule(
      [ev({ title: 'Morning rundown', date: '2026-10-26', startTime: '9:05', endTime: '9:35' })],
      [],
      NOW,
    );
    expect(section.events[0].start).toBe('09:05');
    expect(section.events[0].minutes).toBe(30);
    expect(section.events[0].day).toBe('Mon');
  });

  it('carries a todo’s notes, and puts an all-day item out as start All day with 0 minutes', () => {
    const section = collectStudioSchedule(
      [],
      [
        td({ title: 'Call Mom about Thursday', date: '2026-10-27', startTime: '10:00', notes: 'Ask about the appointment ride' }, 0),
        td({ title: 'Buy snapdragons', date: '2026-10-28' }, 1),
      ],
      NOW,
    );
    const call = section.events.find((e) => e.title.startsWith('Call Mom'));
    expect(call?.type).toBe('Todo');
    expect(call?.notes).toBe('Ask about the appointment ride');
    expect(call?.minutes).toBe(30); // start with no end: the todos' 30-minute house rule
    const flowers = section.events.find((e) => e.title === 'Buy snapdragons');
    expect(flowers?.start).toBe('All day');
    expect(flowers?.minutes).toBe(0);
    expect(flowers?.day).toBe('Wed');
  });

  it('gives a start-only event the app’s own 60 minutes, and an exactly-equal end 0', () => {
    const section = collectStudioSchedule(
      [
        ev({ title: 'Garden photos', date: '2026-10-25', startTime: '18:30' }),
        ev({ title: 'Hunter’s Moon', date: '2026-10-25', startTime: '20:00', endTime: '20:00' }),
      ],
      [],
      NOW,
    );
    expect(section.events.find((e) => e.title === 'Garden photos')?.minutes).toBe(60);
    expect(section.events.find((e) => e.title === 'Hunter’s Moon')?.minutes).toBe(0);
  });

  it('runs an after-midnight end past the day boundary (+24h)', () => {
    const section = collectStudioSchedule(
      [ev({ title: 'Scary movie night', date: '2026-10-24', startTime: '23:00', endTime: '01:00' })],
      [],
      NOW,
    );
    expect(section.events[0].minutes).toBe(120);
  });

  it('an end with no start cannot be expressed — the item rides as All day', () => {
    const section = collectStudioSchedule(
      [ev({ title: 'Loose end', date: '2026-10-26', endTime: '15:00' })],
      [],
      NOW,
    );
    expect(section.events[0].start).toBe('All day');
    expect(section.events[0].minutes).toBe(0);
  });

  it('exports a far-out one-off on its true date — no window trimming', () => {
    const section = collectStudioSchedule(
      [
        ev({ title: 'Wildwood tickets', date: '2026-10-27', startTime: '19:00', endTime: '21:00' }),
        ev({ title: 'Novalee’s checkup', date: '2026-10-29', startTime: '10:00', endTime: '11:00' }),
        ev({ title: 'Anniversary trip', date: '2027-06-12', startTime: '09:00', endTime: '10:00' }),
        ev({ title: 'Old receipt run', date: '2025-01-06', startTime: '08:00', endTime: '08:30' }),
      ],
      [],
      NOW,
    );
    expect(section.events.map((e) => e.date)).toEqual([
      '2025-01-06',
      '2026-10-27',
      '2026-10-29',
      '2027-06-12',
    ]);
  });

  it('sorts all-day before timed on the same date, deterministically', () => {
    const events = [
      ev({ title: 'Timed', date: '2026-10-26', startTime: '09:00', endTime: '10:00' }),
      ev({ title: 'All day one', date: '2026-10-26' }),
    ];
    const a = collectStudioSchedule(events, [], NOW);
    const b = collectStudioSchedule([...events].reverse(), [], NOW);
    expect(a.events.map((e) => e.title)).toEqual(['All day one', 'Timed']);
    expect(b.events).toEqual(a.events);
  });
});

describe('collectStudioSchedule — the Online marker rule', () => {
  it("an event located 'Online' travels as online:true with an empty location; a real location rides as itself", () => {
    const section = collectStudioSchedule(
      [
        ev({ title: 'Online study group', date: '2026-10-27', startTime: '18:00', endTime: '19:00', location: 'Online' }),
        ev({ title: 'Dinner at Anna’s', date: '2026-10-27', startTime: '17:00', endTime: '19:00', location: 'Anna’s house', notes: 'Bring the snapdragons' }),
      ],
      [],
      NOW,
    );
    const online = section.events.find((e) => e.title === 'Online study group');
    expect(online?.online).toBe(true);
    expect(online?.location).toBe('');
    const dinner = section.events.find((e) => e.title === 'Dinner at Anna’s');
    expect(dinner?.online).toBe(false);
    expect(dinner?.location).toBe('Anna’s house');
    expect(dinner?.notes).toBe('Bring the snapdragons');
  });
});

describe('collectStudioSchedule — undated items are excluded and counted', () => {
  it('counts missing, empty, malformed, and impossible dates — and still exports the dated', () => {
    const undatedEvent = { ...ev({ title: 'Ghost event', date: '2026-10-26' }), date: '2026-13-40' };
    const undatedTodoA = td({ title: 'Someday', date: '' }, 0);
    const undatedTodoB = { ...td({ title: 'No date at all', date: '2026-10-26' }, 1), date: undefined } as unknown as ScheduleTodo;
    const malformedTodo = td({ title: 'Slashes', date: '10/24/2026' }, 2);
    const section = collectStudioSchedule(
      [undatedEvent, ev({ title: 'Real event', date: '2026-10-26', startTime: '08:00', endTime: '09:00' })],
      [undatedTodoA, undatedTodoB, malformedTodo],
      NOW,
    );
    expect(section.undatedExcluded).toBe(4);
    expect(section.events.map((e) => e.title)).toEqual(['Real event']);
  });
});

describe('studioSchedule — the round trip home', () => {
  const appEvents: ScheduleEvent[] = [
    ev({ title: 'Commentary writing — Genesis 2', date: '2026-10-27', startTime: '11:00', endTime: '12:00' }),
    ev({ title: 'Online study group', date: '2026-10-27', startTime: '18:00', endTime: '19:00', location: 'Online' }),
    ev({ title: 'Scary movie night', date: '2026-10-24', startTime: '23:00', endTime: '01:00', location: 'Backyard' }),
    ev({ title: 'Time off', date: '2026-10-28' }),
  ];
  const appTodos: ScheduleTodo[] = [
    td({ title: 'Call Mom about Thursday', date: '2026-10-27', startTime: '10:00', notes: 'Ask about the appointment ride' }, 0),
    td({ title: 'Buy snapdragons', date: '2026-10-28' }, 1),
  ];

  it('exported events pass the door’s own validation and land in an empty store as the same (date, start, title) set', () => {
    const section = collectStudioSchedule(appEvents, appTodos, NOW);
    const parsed = parseStudioFile({ weekOf: '2026-10-25', events: section.events });
    expect(parsed.kind).toBe('schedule');
    if (parsed.kind !== 'schedule') return;
    const merged = mergeStudioSchedule([], [], parsed.schedule);
    expect(merged.added).toBe(section.events.length);

    const exportedSet = section.events
      .map((e) => `${e.date}|${e.start}|${e.title}`)
      .sort();
    const landedSet = [
      ...merged.events.map((e) => `${e.date}|${e.startTime ?? 'All day'}|${e.title}`),
      ...merged.todos.map((t) => `${t.date}|${t.startTime ?? 'All day'}|${t.title}`),
    ].sort();
    expect(landedSet).toEqual(exportedSet);
  });

  it('the Online marker survives the round trip via the importer’s location rule', () => {
    const section = collectStudioSchedule(appEvents, appTodos, NOW);
    const parsed = parseStudioFile({ weekOf: '2026-10-25', events: section.events });
    if (parsed.kind !== 'schedule') throw new Error('expected a schedule pack');
    const merged = mergeStudioSchedule([], [], parsed.schedule);
    const online = merged.events.find((e) => e.title === 'Online study group');
    expect(online?.location).toBe('Online');
    const movie = merged.events.find((e) => e.title === 'Scary movie night');
    expect(movie?.location).toBe('Backyard');
    expect(movie?.startTime).toBe('23:00');
    expect(movie?.endTime).toBe('01:00'); // past-midnight end comes home whole
    const call = merged.todos.find((t) => t.title === 'Call Mom about Thursday');
    expect(call?.notes).toBe('Ask about the appointment ride');
    const off = merged.events.find((e) => e.title === 'Time off');
    expect(off?.startTime).toBeUndefined(); // all-day stays all-day
  });
});
