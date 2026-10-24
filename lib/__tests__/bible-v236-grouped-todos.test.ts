// ─── v236 "Grouped Todos Travel" — pins ───────────────────────────────────
// A ScheduleTodo's grouped steps (subtasks: the Self-Care routine's
// Ring / Brush Teeth / … under one header) used to fall off at the
// studio bridge in BOTH directions: collectStudioSchedule never
// emitted them, and the door never restored them. These pins hold the
// wire shape (todo items gain optional subtasks: [{id, title,
// isCompleted}]), the validate-first treatment of a malformed list,
// the merge's update semantics (present replaces, absent preserves),
// the Drive plan pass-through, and the round trip home with ids,
// titles, and states intact — while a plain todo's pack shape stays
// byte-identical to what it was before v236.

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

import { planDriveFile, planDrivePack } from '../bible-v205/drive-folder';
import {
  mergeStudioSchedule,
  parseStudioFile,
  parseStudioFileFull,
  type StudioSchedulePayload,
} from '../bible-v205/studio-import';
import { collectStudioSchedule } from '../bible-v205/studio-schedule';
import {
  createScheduleTodo,
  type ScheduleTodo,
} from '../schedule-data';

beforeEach(() => {
  store.clear();
});

const NOW = new Date(2026, 9, 24, 12, 0, 0);

const td = (data: Parameters<typeof createScheduleTodo>[0], n = 0): ScheduleTodo =>
  createScheduleTodo(data, n);

// His real grouped todo: the Monday Morning Routine under "Self-Care".
const STEPS = [
  { id: 'ring', title: 'Ring', isCompleted: false },
  { id: 'brush', title: 'Brush Teeth', isCompleted: false },
  { id: 'deodorant', title: 'Deodorant', isCompleted: false },
  { id: 'coffee', title: 'Coffee', isCompleted: true },
  { id: 'permission', title: 'Internal Permission', isCompleted: false },
];

const groupedTodo = (): ScheduleTodo =>
  td(
    {
      title: 'Self-Care',
      date: '2026-10-26',
      startTime: '09:00',
      endTime: '09:30',
      notes: 'Monday Morning Routine',
      subtasks: STEPS.map((s) => ({ ...s })),
    },
    0,
  );

const groupedPackItem = (overrides: Record<string, unknown> = {}) => ({
  title: 'Self-Care',
  day: 'Mon',
  date: '2026-10-26',
  start: '09:00',
  minutes: 30,
  type: 'Todo',
  online: false,
  recur: 'none',
  notes: 'Monday Morning Routine',
  location: '',
  subtasks: STEPS.map((s) => ({ ...s })),
  ...overrides,
});

const packOf = (events: unknown[]): StudioSchedulePayload => {
  const parsed = parseStudioFile({ weekOf: '2026-10-25', events });
  if (parsed.kind !== 'schedule') throw new Error('expected a schedule pack');
  return parsed.schedule;
};

describe('collectStudioSchedule — grouped todos ride the pack', () => {
  it('emits a grouped todo’s steps as [{id, title, isCompleted}], in order', () => {
    const section = collectStudioSchedule([], [groupedTodo()], NOW);
    expect(section.events).toHaveLength(1);
    expect(section.events[0].subtasks).toEqual(STEPS);
  });

  it('does not put a step’s store-side description on the wire', () => {
    const withDesc = td(
      {
        title: 'Schoolwork',
        date: '2026-10-26',
        subtasks: [{ id: 'math', title: 'Finish math', description: 'Chapter 4', isCompleted: false }],
      },
      0,
    );
    const section = collectStudioSchedule([], [withDesc], NOW);
    expect(section.events[0].subtasks).toEqual([
      { id: 'math', title: 'Finish math', isCompleted: false },
    ]);
  });

  it('leaves a plain todo’s pack shape byte-identical — no subtasks key at all', () => {
    const section = collectStudioSchedule(
      [],
      [td({ title: 'Buy snapdragons', date: '2026-10-28' }, 0)],
      NOW,
    );
    expect(section.events).toEqual([
      {
        title: 'Buy snapdragons',
        day: 'Wed',
        date: '2026-10-28',
        start: 'All day',
        minutes: 0,
        type: 'Todo',
        online: false,
        recur: 'none',
        notes: '',
        location: '',
      },
    ]);
    expect('subtasks' in section.events[0]).toBe(false);
  });

  it('omits the key for a todo whose stored step list is empty', () => {
    const empty = td({ title: 'Bare header', date: '2026-10-26', subtasks: [] }, 0);
    const section = collectStudioSchedule([], [empty], NOW);
    expect('subtasks' in section.events[0]).toBe(false);
  });
});

describe('the round trip home — grouped todos', () => {
  it('a todo with 5 subtasks (one completed) exports and re-imports with ids, titles, and states intact', () => {
    const section = collectStudioSchedule([], [groupedTodo()], NOW);
    // Through the file and back, the way the door actually reads it.
    const revived = JSON.parse(JSON.stringify({ weekOf: '2026-10-25', events: section.events }));
    const pack = packOf(revived.events);
    const merged = mergeStudioSchedule([], [], pack);
    expect(merged.added).toBe(1);
    expect(merged.todos).toHaveLength(1);
    const landed = merged.todos[0];
    expect(landed.title).toBe('Self-Care');
    expect(landed.subtasks).toEqual(STEPS);
    expect(landed.subtasks?.filter((s) => s.isCompleted).map((s) => s.id)).toEqual(['coffee']);
  });

  it('a plain todo rides the same round trip with its pack shape unchanged', () => {
    const section = collectStudioSchedule(
      [],
      [td({ title: 'Call Mom about Thursday', date: '2026-10-27', startTime: '10:00' }, 0)],
      NOW,
    );
    expect(section.events[0]).toEqual({
      title: 'Call Mom about Thursday',
      day: 'Tue',
      date: '2026-10-27',
      start: '10:00',
      minutes: 30,
      type: 'Todo',
      online: false,
      recur: 'none',
      notes: '',
      location: '',
    });
    const pack = packOf(JSON.parse(JSON.stringify(section.events)));
    const merged = mergeStudioSchedule([], [], pack);
    expect(merged.todos).toHaveLength(1);
    expect(merged.todos[0].subtasks).toBeUndefined();
  });
});

describe('mergeStudioSchedule — subtask update semantics', () => {
  it('creates a todo born with its steps', () => {
    const merged = mergeStudioSchedule([], [], packOf([groupedPackItem()]));
    expect(merged.added).toBe(1);
    expect(merged.todos[0].subtasks).toEqual(STEPS);
  });

  it('applies steps onto a matching todo that had none — an update, not an add', () => {
    const existing = td({ title: 'Self-Care', date: '2026-10-26', startTime: '09:00' }, 0);
    const merged = mergeStudioSchedule([], [existing], packOf([groupedPackItem()]));
    expect(merged.added).toBe(0);
    expect(merged.todos).toHaveLength(1);
    expect(merged.todos[0].subtasks).toEqual(STEPS);
    // The caller's stored object is never mutated under it.
    expect(existing.subtasks).toBeUndefined();
  });

  it('an item that OMITS subtasks leaves an existing todo’s steps untouched', () => {
    const existing = groupedTodo();
    const bare = groupedPackItem();
    delete (bare as Record<string, unknown>).subtasks;
    const merged = mergeStudioSchedule([], [existing], packOf([bare]));
    expect(merged.added).toBe(0);
    expect(merged.todos[0].subtasks).toEqual(STEPS);
  });

  it('an item WITH subtasks replaces the existing list whole', () => {
    const existing = groupedTodo();
    const fewer = [
      { id: 'ring', title: 'Ring', isCompleted: true },
      { id: 'coffee', title: 'Coffee', isCompleted: false },
    ];
    const merged = mergeStudioSchedule([], [existing], packOf([groupedPackItem({ subtasks: fewer })]));
    expect(merged.todos[0].subtasks).toEqual(fewer);
  });

  it('an explicit empty list clears the steps', () => {
    const existing = groupedTodo();
    const merged = mergeStudioSchedule([], [existing], packOf([groupedPackItem({ subtasks: [] })]));
    expect(merged.todos[0].subtasks ?? []).toEqual([]);
    expect(merged.todos[0].subtasks?.length ?? 0).toBe(0);
  });

  it('re-importing the same grouped pack adds nothing and changes nothing', () => {
    const first = mergeStudioSchedule([], [], packOf([groupedPackItem()]));
    const again = mergeStudioSchedule(first.events, first.todos, packOf([groupedPackItem()]));
    expect(again.added).toBe(0);
    expect(again.todos).toHaveLength(1);
    expect(again.todos[0].subtasks).toEqual(STEPS);
  });
});

describe('validate-first — malformed subtasks reject the pack', () => {
  const badLists: Record<string, unknown> = {
    'not an array': 'five steps',
    'an entry that is not an object': ['Ring'],
    'an entry with no id': [{ title: 'Ring', isCompleted: false }],
    'an entry with a non-string id': [{ id: 7, title: 'Ring', isCompleted: false }],
    'an entry with no title': [{ id: 'ring', isCompleted: false }],
    'an entry whose completion is not a boolean': [{ id: 'ring', title: 'Ring', isCompleted: 'yes' }],
  };
  for (const [label, subtasks] of Object.entries(badLists)) {
    it(`rejects subtasks that are ${label}`, () => {
      expect(() => packOf([groupedPackItem({ subtasks })])).toThrow(/subtask/i);
    });
  }

  it('one malformed item rejects the whole file — the good item in it never applies', () => {
    const file = {
      studioSchedule: {
        exportedAt: NOW.toISOString(),
        events: [groupedPackItem(), groupedPackItem({ title: 'Broken', subtasks: 'nope' })],
      },
    };
    expect(() => parseStudioFileFull(JSON.parse(JSON.stringify(file)))).toThrow(/subtask/i);
  });

  it('extra keys on a step are stripped to the wire fields, not carried', () => {
    const pack = packOf([
      groupedPackItem({
        subtasks: [{ id: 'ring', title: 'Ring', isCompleted: false, description: 'not wire' }],
      }),
    ]);
    expect(pack.events[0].subtasks).toEqual([{ id: 'ring', title: 'Ring', isCompleted: false }]);
  });
});

describe('the Drive road — subtasks flow through the full-file plan', () => {
  const noStatus = () => 'none';

  it('a backup’s studioSchedule section carries steps into the plan, and the plan’s apply lands them', () => {
    const section = collectStudioSchedule([], [groupedTodo()], NOW);
    const file = JSON.parse(
      JSON.stringify({
        format: 'prayercircle-backup',
        studioSchedule: { exportedAt: section.exportedAt, events: section.events },
      }),
    );
    const plan = parseStudioFileFull(file);
    expect(plan.schedule?.events[0].subtasks).toEqual(STEPS);

    const drivePlan = planDriveFile(plan, noStatus, [], []);
    expect(drivePlan.heldSchedule).toHaveLength(0);
    expect(drivePlan.autoSchedule).toHaveLength(1);
    expect(drivePlan.autoSchedule[0].subtasks).toEqual(STEPS);

    const merged = mergeStudioSchedule([], [], { weekOf: '', events: drivePlan.autoSchedule });
    expect(merged.todos).toHaveLength(1);
    expect(merged.todos[0].subtasks).toEqual(STEPS);
  });

  it('a standalone schedule pack keeps its steps through planDrivePack', () => {
    const parsed = parseStudioFile({ weekOf: '2026-10-25', events: [groupedPackItem()] });
    if (parsed.kind !== 'schedule') throw new Error('expected a schedule pack');
    const drivePlan = planDrivePack(parsed, noStatus, [], []);
    expect(drivePlan.autoSchedule).toHaveLength(1);
    expect(drivePlan.autoSchedule[0].subtasks).toEqual(STEPS);
    const merged = mergeStudioSchedule([], [], { weekOf: '', events: drivePlan.autoSchedule });
    expect(merged.todos[0].subtasks).toEqual(STEPS);
  });
});
