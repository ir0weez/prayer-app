// ─── v239 "Nothing Left Behind" — pins ──────────────────────────────────
// Until v239 the studio bridge carried only an item's identity —
// date/start/minutes/title/type/online/recur/notes/location, a grouped
// todo's steps (v236), a ministry's bible pair (v237). Everything else
// a record holds in the app was silently dropped in one or both
// directions: keywords, genres, colors, linked people, completion,
// an event's travel/reminder/season/episode/poster fields, a todo's
// tag/icon/order/links/group shape, a step's description. These pins
// hold the completed bridge:
//   · export emits every field a record carries (omitting unset ones,
//     so a plain item's pack object is byte-identical to before);
//   · the door validates the new keys validate-first (a malformed
//     present key rejects the whole file) and lands them present-wins
//     / absent-preserves on created AND matched records;
//   · the round trip is exact: record → pack → door → record → pack
//     yields identical pack items, one fully-loaded item per kind;
//   · Ministry rows land their genre/dueDate/travel/color/links/
//     completion on the ministry record, through both doors.

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
  mergeStudioScheduleMinistries,
  parseStudioFile,
  parseStudioFileFull,
  type StudioSchedulePayload,
} from '../bible-v205/studio-import';
import {
  applyStudioMinistriesPack,
  collectStudioMinistries,
} from '../bible-v205/studio-ministries';
import { collectStudioSchedule } from '../bible-v205/studio-schedule';
import {
  createScheduleEvent,
  createScheduleMinistry,
  createScheduleTodo,
  type ScheduleEvent,
  type ScheduleMinistry,
  type ScheduleTodo,
} from '../schedule-data';

beforeEach(() => {
  store.clear();
});

const NOW = new Date(2026, 9, 24, 12, 0, 0);

/** Export records and read the section back through the one door, as
 *  a backup's studioSchedule section — the full validate path. */
function doorSchedule(
  events: ScheduleEvent[],
  todos: ScheduleTodo[],
  ministries: ScheduleMinistry[] = [],
): StudioSchedulePayload {
  const section = collectStudioSchedule(events, todos, NOW, ministries);
  const plan = parseStudioFileFull({ studioSchedule: section });
  if (!plan.schedule) throw new Error('expected a schedule plan');
  return plan.schedule;
}

const withoutId = <T extends { id: string }>(record: T): Omit<T, 'id'> => {
  const { id: _id, ...rest } = record;
  return rest;
};

// ── One fully-loaded record per kind ─────────────────────────────────────

const fullEvent: ScheduleEvent = {
  id: 'ev-full',
  title: 'Scary movie night',
  date: '2026-10-31',
  startTime: '19:00',
  endTime: '21:30',
  location: 'Backyard',
  notes: 'Hunter’s Moon showing',
  isCompleted: true,
  completedAt: '2026-10-31T21:45:00.000Z',
  color: '#7C4DFF',
  // Detection would label this title 'Scary Movie Night'; the stored
  // keyword is the proof the pack's value, not detection, lands.
  keyword: 'Movie',
  linkedPeopleIds: ['p-melody', 'p-eva'],
  travelTimeMinutes: 15,
  reminderMinutesBefore: 30,
  season: 2,
  episode: 5,
  posterImageUri: 'file:///posters/moon.png',
  posterColor: '#101828',
  isOffEvent: true,
};

const fullTodo: ScheduleTodo = {
  id: 'td-full',
  title: 'Monday Morning Routine',
  date: '2026-10-26',
  startTime: '07:00',
  endTime: '07:30',
  notes: 'Self-care',
  isCompleted: false,
  icon: 'wb-sunny',
  color: '#FFB300',
  order: 7,
  tag: 'Personal',
  notificationsEnabled: false,
  linkedPeopleIds: ['p-jonathan'],
  linkedEventId: 'ev-morning',
  linkedMinistryId: 'min-prayer',
  linkedEventTitle: 'Morning Meeting',
  linkedMinistryTitle: 'Garden Prayer',
  linkedEventColor: '#265F6E',
  linkedMinistryColor: '#6B7280',
  groupId: 'grp-selfcare',
  isGroup: true,
  isGroupExpanded: false,
  subtasks: [
    { id: 'ring', title: 'Ring', isCompleted: true, description: 'Put the ring back on' },
    { id: 'coffee', title: 'Coffee', isCompleted: false },
  ],
};

const fullMinistry: ScheduleMinistry = {
  id: 'min-full',
  title: 'Commentary writing — Colossians 1',
  type: 'Teaching',
  date: '2026-10-26',
  dueDate: '2026-10-30',
  startTime: '11:00',
  endTime: '12:00',
  location: 'Studio booth',
  travelTimeMinutes: 10,
  notes: 'Colossians 1 this week',
  isCompleted: true,
  completedAt: '2026-10-26T12:05:00.000Z',
  color: '#3E6B8E',
  linkedPeopleIds: ['p-cody'],
  bibleBook: 'Colossians',
  bibleChapter: '1',
};

describe('the round trip — one fully-loaded item per kind', () => {
  it('event: every field crosses, lands field-for-field, and re-exports identically', () => {
    const section = collectStudioSchedule([fullEvent], [], NOW);
    const [item] = section.events;
    expect(item).toMatchObject({
      keyword: 'Movie',
      color: '#7C4DFF',
      linkedPeopleIds: ['p-melody', 'p-eva'],
      isCompleted: true,
      completedAt: '2026-10-31T21:45:00.000Z',
      travelTimeMinutes: 15,
      reminderMinutesBefore: 30,
      season: 2,
      episode: 5,
      posterImageUri: 'file:///posters/moon.png',
      posterColor: '#101828',
      isOffEvent: true,
    });

    const merged = mergeStudioSchedule([], [], doorSchedule([fullEvent], []));
    expect(merged.added).toBe(1);
    expect(withoutId(merged.events[0])).toEqual(withoutId(fullEvent));

    const again = collectStudioSchedule(merged.events, [], NOW);
    expect(again.events).toEqual(section.events);
  });

  it('grouped todo: group shape, links, and a step description all cross and return', () => {
    const section = collectStudioSchedule([], [fullTodo], NOW);
    const [item] = section.events;
    expect(item).toMatchObject({
      color: '#FFB300',
      linkedPeopleIds: ['p-jonathan'],
      tag: 'Personal',
      icon: 'wb-sunny',
      order: 7,
      notificationsEnabled: false,
      linkedEventId: 'ev-morning',
      linkedMinistryId: 'min-prayer',
      linkedEventTitle: 'Morning Meeting',
      linkedMinistryTitle: 'Garden Prayer',
      linkedEventColor: '#265F6E',
      linkedMinistryColor: '#6B7280',
      groupId: 'grp-selfcare',
      isGroup: true,
      isGroupExpanded: false,
    });
    expect(item.subtasks).toEqual([
      { id: 'ring', title: 'Ring', isCompleted: true, description: 'Put the ring back on' },
      { id: 'coffee', title: 'Coffee', isCompleted: false },
    ]);
    // An uncompleted todo carries no completion keys at all.
    expect('isCompleted' in item).toBe(false);
    expect('completedAt' in item).toBe(false);

    const merged = mergeStudioSchedule([], [], doorSchedule([], [fullTodo]));
    expect(merged.added).toBe(1);
    expect(withoutId(merged.todos[0])).toEqual(withoutId(fullTodo));

    const again = collectStudioSchedule([], merged.todos, NOW);
    expect(again.events).toEqual(section.events);
  });

  it('ministry: genre, dueDate, travel, and the pair land on the record and return', () => {
    const section = collectStudioSchedule([], [], NOW, [fullMinistry]);
    const [row] = section.events;
    expect(row).toMatchObject({
      ministryType: 'Teaching',
      dueDate: '2026-10-30',
      travelTimeMinutes: 10,
      color: '#3E6B8E',
      linkedPeopleIds: ['p-cody'],
      isCompleted: true,
      completedAt: '2026-10-26T12:05:00.000Z',
      bibleBook: 'Colossians',
      bibleChapter: '1',
    });

    // The schedule merge lands nothing; the ministry link merge does.
    const plan = doorSchedule([], [], [fullMinistry]);
    expect(mergeStudioSchedule([], [], plan).added).toBe(0);
    const landed = mergeStudioScheduleMinistries([], plan);
    expect(landed.linked).toBe(1);
    expect(withoutId(landed.ministries[0])).toEqual(withoutId(fullMinistry));

    const again = collectStudioSchedule([], [], NOW, landed.ministries);
    expect(again.events).toEqual(section.events);
  });

  it('a ministries pack and a schedule row in one file still yield ONE record', () => {
    const plan = parseStudioFileFull({
      studioSchedule: collectStudioSchedule([], [], NOW, [fullMinistry]),
      studioMinistries: collectStudioMinistries([fullMinistry]),
    });
    const afterPack = applyStudioMinistriesPack([], plan.ministries!);
    expect(afterPack.ministries).toHaveLength(1);
    const linked = mergeStudioScheduleMinistries(afterPack.ministries, plan.schedule!);
    expect(linked.ministries).toHaveLength(1);
    expect(linked.ministries[0].id).toBe(fullMinistry.id);
    expect(withoutId(linked.ministries[0])).toEqual(withoutId(fullMinistry));
  });
});

describe('key-set stability — plain items are byte-identical to before', () => {
  it('a plain event exports exactly the pre-v239 object', () => {
    const plain = createScheduleEvent({
      title: 'Commentary writing — Genesis 2',
      date: '2026-10-27',
      startTime: '11:00',
      endTime: '12:00',
    });
    const section = collectStudioSchedule([plain], [], NOW);
    expect(section.events).toEqual([
      {
        title: 'Commentary writing — Genesis 2',
        day: 'Tue',
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

  it('a plain todo in stored order exports exactly the pre-v239 object', () => {
    const plain = createScheduleTodo(
      { title: 'Call Mom about Thursday', date: '2026-10-27', startTime: '10:00' },
      0,
    );
    const section = collectStudioSchedule([], [plain], NOW);
    expect(section.events).toEqual([
      {
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
      },
    ]);
  });

  it('a bare ministry (creation-default genre, nothing else) exports the pre-v239 row', () => {
    const bare = createScheduleMinistry({
      title: 'Food Bank Run',
      type: 'Bible Study',
      date: '2026-10-29',
    });
    const section = collectStudioSchedule([], [], NOW, [bare]);
    expect(section.events).toEqual([
      {
        title: 'Food Bank Run',
        day: 'Thu',
        date: '2026-10-29',
        start: 'All day',
        minutes: 0,
        type: 'Ministry',
        online: false,
        recur: 'none',
        notes: '',
        location: '',
      },
    ]);
  });
});

describe('validation — a malformed present key rejects the whole file', () => {
  const row = (overrides: Record<string, unknown>): Record<string, unknown> => ({
    title: 'Item',
    day: 'Mon',
    date: '2026-10-26',
    start: '09:00',
    minutes: 30,
    type: 'Event',
    online: false,
    recur: 'none',
    notes: '',
    location: '',
    ...overrides,
  });
  const rejects = (events: unknown[], pattern: RegExp) =>
    expect(() => parseStudioFile({ weekOf: '2026-10-25', events })).toThrow(pattern);

  it('event keys', () => {
    rejects([row({ travelTimeMinutes: '15' })], /travelTimeMinutes/);
    rejects([row({ season: -1 })], /season/);
    rejects([row({ isOffEvent: 'yes' })], /isOffEvent/);
    rejects([row({ posterColor: 12 })], /posterColor/);
  });

  it('todo keys', () => {
    rejects([row({ type: 'Todo', isGroup: 'yes' })], /isGroup/);
    rejects([row({ type: 'Todo', order: 1.5 })], /order/);
    rejects([row({ type: 'Todo', notificationsEnabled: 1 })], /notificationsEnabled/);
  });

  it('ministry keys', () => {
    rejects([row({ type: 'Ministry', ministryType: 3 })], /ministryType/);
    rejects([row({ type: 'Ministry', dueDate: '10/30/2026' })], /dueDate/);
    rejects([row({ type: 'Ministry', travelTimeMinutes: '10' })], /travelTimeMinutes/);
  });

  it('shared keys and the step description', () => {
    rejects([row({ linkedPeopleIds: 'p-melody' })], /linkedPeopleIds/);
    rejects([row({ linkedPeopleIds: ['ok', 4] })], /linkedPeopleIds/);
    rejects([row({ isCompleted: 'yes' })], /isCompleted/);
    rejects([row({ completedAt: 'yesterday' })], /completedAt/);
    rejects([row({ keyword: '' })], /keyword/);
    rejects(
      [row({ type: 'Todo', subtasks: [{ id: 's', title: 'S', isCompleted: false, description: 42 }] })],
      /description/,
    );
  });

  it('a key riding the wrong kind is dropped, exactly like the bible pair', () => {
    const pack = parseStudioFile({
      weekOf: '2026-10-25',
      events: [
        row({ tag: 'Personal', ministryType: 'Teaching', dueDate: '2026-10-30' }),
        row({ type: 'Todo', title: 'Chores', travelTimeMinutes: 5, season: 1 }),
        row({ type: 'Ministry', title: 'Visit', tag: 'Family', icon: 'home' }),
      ],
    });
    if (pack.kind !== 'schedule') throw new Error('expected a schedule pack');
    const [ev, td, min] = pack.schedule.events;
    expect('tag' in ev).toBe(false);
    expect('ministryType' in ev).toBe(false);
    expect('dueDate' in ev).toBe(false);
    expect('travelTimeMinutes' in td).toBe(false);
    expect('season' in td).toBe(false);
    expect('tag' in min).toBe(false);
    expect('icon' in min).toBe(false);
  });
});

describe('landing — present wins, absent preserves', () => {
  const packOf = (events: unknown[]): StudioSchedulePayload => {
    const pack = parseStudioFile({ weekOf: '2026-10-25', events });
    if (pack.kind !== 'schedule') throw new Error('expected a schedule pack');
    return pack.schedule;
  };
  const row = (overrides: Record<string, unknown>): Record<string, unknown> => ({
    title: 'Garden work',
    day: 'Mon',
    date: '2026-10-26',
    start: '09:00',
    minutes: 60,
    type: 'Event',
    online: false,
    recur: 'none',
    notes: '',
    location: '',
    ...overrides,
  });

  it('a matched event with no bridge keys is left object-identical', () => {
    const existing = createScheduleEvent({
      title: 'Garden work',
      date: '2026-10-26',
      startTime: '09:00',
      endTime: '10:00',
      color: '#111111',
    });
    const merged = mergeStudioSchedule([existing], [], packOf([row({})]));
    expect(merged.added).toBe(0);
    expect(merged.events[0]).toBe(existing);
  });

  it('a matched event takes present keys and keeps the rest', () => {
    const existing: ScheduleEvent = {
      ...createScheduleEvent({
        title: 'Garden work',
        date: '2026-10-26',
        startTime: '09:00',
        endTime: '10:00',
      }),
      color: '#111111',
      travelTimeMinutes: 20,
    };
    const merged = mergeStudioSchedule(
      [existing],
      [],
      packOf([row({ color: '#222222', season: 3 })]),
    );
    expect(merged.events[0].color).toBe('#222222');
    expect(merged.events[0].season).toBe(3);
    expect(merged.events[0].travelTimeMinutes).toBe(20);
    expect(existing.color).toBe('#111111'); // the caller's record is never mutated
  });

  it('completion lands both ways: completed by a pack, un-completed by a pack', () => {
    const done = mergeStudioSchedule(
      [],
      [],
      packOf([row({ isCompleted: true, completedAt: '2026-10-26T10:05:00.000Z' })]),
    );
    expect(done.events[0].isCompleted).toBe(true);
    expect(done.events[0].completedAt).toBe('2026-10-26T10:05:00.000Z');

    const undone = mergeStudioSchedule(done.events, [], packOf([row({ isCompleted: false })]));
    expect(undone.events[0].isCompleted).toBe(false);
    expect(undone.events[0].completedAt).toBeUndefined();
  });

  it('a matched todo keeps its steps when the pack omits them, and its tag when the pack carries steps only', () => {
    const existing: ScheduleTodo = {
      ...createScheduleTodo(
        { title: 'Routine', date: '2026-10-26', startTime: '07:00', tag: 'Personal' },
        0,
      ),
      subtasks: [{ id: 'a', title: 'A', isCompleted: false }],
    };
    const stepsOnly = packOf([
      row({
        type: 'Todo',
        title: 'Routine',
        start: '07:00',
        subtasks: [{ id: 'b', title: 'B', isCompleted: true, description: 'Bee' }],
      }),
    ]);
    const merged = mergeStudioSchedule([], [existing], stepsOnly);
    expect(merged.todos[0].tag).toBe('Personal');
    expect(merged.todos[0].subtasks).toEqual([
      { id: 'b', title: 'B', isCompleted: true, description: 'Bee' },
    ]);
  });

  it('a ministry row without ministryType never stomps a stored genre', () => {
    const existing = createScheduleMinistry({
      title: 'Hospital visits',
      type: 'Worship',
      date: '2026-10-26',
      startTime: '09:00',
    });
    const pairOnly = packOf([
      row({ type: 'Ministry', title: 'Hospital visits', bibleBook: 'Psalms', bibleChapter: '23' }),
    ]);
    const kept = mergeStudioScheduleMinistries([existing], pairOnly);
    expect(kept.ministries[0].type).toBe('Worship');
    expect(kept.ministries[0].bibleBook).toBe('Psalms');

    const genreRow = packOf([
      row({ type: 'Ministry', title: 'Hospital visits', ministryType: 'Teaching' }),
    ]);
    const changed = mergeStudioScheduleMinistries([existing], genreRow);
    expect(changed.ministries[0].type).toBe('Teaching');
    expect(changed.ministries[0].id).toBe(existing.id);
  });

  it('a bare ministry row still lands nothing and creates nothing', () => {
    const bare = packOf([row({ type: 'Ministry', title: 'Just a projection' })]);
    const { ministries, linked } = mergeStudioScheduleMinistries([], bare);
    expect(linked).toBe(0);
    expect(ministries).toEqual([]);
  });

  it('a row carrying only a genre creates the record in that genre (not the Bible Study default)', () => {
    const genreOnly = packOf([
      row({ type: 'Ministry', title: 'Food Bank Run', ministryType: 'Service', start: 'All day', minutes: 0 }),
    ]);
    const { ministries, linked } = mergeStudioScheduleMinistries([], genreOnly);
    expect(linked).toBe(1);
    expect(ministries[0].type).toBe('Service');
  });
});

describe('the Drive path — the same keys ride the planner', () => {
  it('a fully-loaded event flows through planDriveFile and lands its fields', () => {
    const plan = parseStudioFileFull({
      studioSchedule: collectStudioSchedule([fullEvent], [], NOW),
    });
    const drive = planDriveFile(plan, () => 'none', [], []);
    expect(drive.autoSchedule).toHaveLength(1);
    expect(drive.autoSchedule[0]).toMatchObject({
      keyword: 'Movie',
      season: 2,
      travelTimeMinutes: 15,
      isOffEvent: true,
    });
    const merged = mergeStudioSchedule([], [], { weekOf: '', events: drive.autoSchedule });
    expect(withoutId(merged.events[0])).toEqual(withoutId(fullEvent));
  });

  it('a ministry genre row is collected for the link merge and lands its genre', () => {
    const pack = parseStudioFile({
      weekOf: '2026-10-25',
      events: [
        {
          title: 'Food Bank Run',
          day: 'Thu',
          date: '2026-10-29',
          start: 'All day',
          minutes: 0,
          type: 'Ministry',
          online: false,
          recur: 'none',
          notes: '',
          location: '',
          ministryType: 'Outreach',
          dueDate: '2026-10-30',
        },
      ],
    });
    if (pack.kind !== 'schedule') throw new Error('expected a schedule pack');
    const drive = planDrivePack(pack, () => 'none', [], []);
    expect(drive.ministryLinks).toHaveLength(1);
    const landed = mergeStudioScheduleMinistries([], { weekOf: '', events: drive.ministryLinks });
    expect(landed.ministries[0]).toMatchObject({ type: 'Outreach', dueDate: '2026-10-30' });
  });

  it('a bare ministry row is collected but lands nothing through the merge', () => {
    const pack = parseStudioFile({
      weekOf: '2026-10-25',
      events: [
        {
          title: 'Just a projection',
          day: 'Thu',
          date: '2026-10-29',
          start: 'All day',
          minutes: 0,
          type: 'Ministry',
          online: false,
          recur: 'none',
          notes: '',
          location: '',
        },
      ],
    });
    if (pack.kind !== 'schedule') throw new Error('expected a schedule pack');
    const drive = planDrivePack(pack, () => 'none', [], []);
    expect(drive.ministryLinks).toHaveLength(1);
    const landed = mergeStudioScheduleMinistries([], { weekOf: '', events: drive.ministryLinks });
    expect(landed.linked).toBe(0);
    expect(landed.ministries).toEqual([]);
  });
});
