// ─── v365 — the schedule bridge repair ─────────────────────────────────────
// Jonathan (Oct 30): he shapes his week at the Studio desk and sends it
// to the phone, but the round trip silently refused his edits — the
// Drive planner stamped every matched row "already in the app" and
// discarded its payload (colours, keywords never landed), notes and
// location never patched a matched record on any door, and nothing
// could ever come OFF the phone: clear a slot at the desk and the
// phone kept the item; move one and it doubled. His ruling: Option B
// auto-tombstones, with the hard protection that the desk can only
// ever delete what the desk itself has held.
//
// These pins cover the four repairs:
//  1. Drive parity — matched rows ride the merge; patches land by
//     folder exactly as by manual import; conflicts still hold.
//  2. Notes + location patch matched events / todos / ministry rows.
//  3. deletedSchedule tombstones — exact-key deletion on BOTH doors,
//     idempotent, blind to anything not named.
//  4. No clobber — the Schedule tab re-reads todos + ministries on
//     focus (the v336 events protection, extended).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

import {
  applyScheduleTombstones,
  emptyStudioApplyCounts,
  formatStudioImportSummary,
  mergeStudioSchedule,
  mergeStudioScheduleMinistries,
  parseStudioFile,
  parseStudioFileFull,
  type StudioSchedulePayload,
} from '../bible-v205/studio-import';
import {
  checkDriveFolder,
  DRIVE_LINK_KEY,
  planDrivePack,
  setDriveFolderOverridesForTests,
} from '../bible-v205/drive-folder';
import {
  createScheduleEvent,
  createScheduleMinistry,
  createScheduleTodo,
  SCHEDULE_EVENTS_KEY,
  SCHEDULE_MINISTRIES_KEY,
  SCHEDULE_TODOS_KEY,
  type ScheduleEvent,
  type ScheduleTodo,
} from '../schedule-data';

beforeEach(() => {
  store.clear();
});
afterEach(() => {
  setDriveFolderOverridesForTests(undefined);
});

// ── Fixtures ────────────────────────────────────────────────────────────────

const packOf = (events: unknown[], extra: Record<string, unknown> = {}): StudioSchedulePayload => {
  const pack = parseStudioFile({ weekOf: '2026-10-26', events, ...extra });
  if (pack.kind !== 'schedule') throw new Error('expected a schedule pack');
  return pack.schedule;
};

const row = (overrides: Record<string, unknown>): Record<string, unknown> => ({
  title: 'Shower',
  day: 'Tue',
  date: '2026-10-27',
  start: '07:00',
  minutes: 30,
  type: 'Event',
  online: false,
  recur: 'none',
  notes: '',
  location: '',
  ...overrides,
});

const storedShower = (): ScheduleEvent =>
  createScheduleEvent({
    title: 'Shower',
    date: '2026-10-27',
    startTime: '07:00',
    endTime: '07:30',
  });

// ── Repair 2 — notes + location patch matched records ──────────────────────

describe('v365 — notes + location patch matched records (manual door merge)', () => {
  it("a matched event takes the pack's notes + location; an absent word preserves", () => {
    const existing: ScheduleEvent = {
      ...storedShower(),
      notes: 'Old note',
      location: 'Garden',
    };
    const patched = mergeStudioSchedule(
      [existing],
      [],
      packOf([row({ notes: 'Changed at the desk', location: 'Beach' })]),
    );
    expect(patched.added).toBe(0);
    expect(patched.eventsAlreadyThere).toBe(1);
    expect(patched.eventsUpdated).toBe(1);
    expect(patched.events[0].notes).toBe('Changed at the desk');
    expect(patched.events[0].location).toBe('Beach');
    // Identity never moved: no duplicate was born.
    expect(patched.events).toHaveLength(1);

    // The wire's '' is its unset word: it preserves, both fields.
    const preserved = mergeStudioSchedule([patched.events[0]], [], packOf([row({})]));
    expect(preserved.events[0].notes).toBe('Changed at the desk');
    expect(preserved.events[0].location).toBe('Beach');
    expect(preserved.eventsUpdated).toBe(0);
  });

  it("a matched todo takes the pack's notes (and still no location is invented)", () => {
    const existing: ScheduleTodo = {
      ...createScheduleTodo(
        { title: 'App Update', date: '2026-10-27', startTime: '08:00', notes: 'Old' },
        0,
      ),
      color: '#F97316',
    };
    const merged = mergeStudioSchedule(
      [],
      [existing],
      packOf([
        row({
          title: 'App Update',
          start: '08:00',
          type: 'Todo',
          notes: 'Do it Friday',
          location: 'Nowhere',
        }),
      ]),
    );
    expect(merged.todos[0].notes).toBe('Do it Friday');
    expect(merged.todos[0].color).toBe('#F97316');
    expect('location' in merged.todos[0]).toBe(false);
    expect(merged.todosUpdated).toBe(1);
  });

  it("a matched ministry row takes the pack's location + notes", () => {
    const existing = createScheduleMinistry({
      title: 'Garden Prayer',
      type: 'Prayer',
      date: '2026-10-27',
      startTime: '06:30',
      location: 'Garden',
      notes: 'Old',
    });
    const linked = mergeStudioScheduleMinistries(
      [existing],
      packOf([
        row({
          title: 'Garden Prayer',
          start: '06:30',
          type: 'Ministry',
          location: 'Beach',
          notes: 'Bring the list',
        }),
      ]),
    );
    expect(linked.linked).toBe(1);
    expect(linked.ministries).toHaveLength(1);
    expect(linked.ministries[0].location).toBe('Beach');
    expect(linked.ministries[0].notes).toBe('Bring the list');
  });

  it('a same-value patch counts no update (the counts stay honest)', () => {
    const existing: ScheduleEvent = { ...storedShower(), color: '#EF4444' };
    const merged = mergeStudioSchedule([existing], [], packOf([row({ color: '#EF4444' })]));
    expect(merged.eventsAlreadyThere).toBe(1);
    expect(merged.eventsUpdated).toBe(0);
  });
});

// ── Repair 3 — the tombstone wire + applier ────────────────────────────────

describe('v365 — deletedSchedule: parse, validate, apply', () => {
  it('parses tombstones from a combined pack and from a backup schedule section', () => {
    const tombstones = [{ date: '2026-10-28', start: '09:00', title: 'Gardening' }];
    const flat = parseStudioFileFull({
      pack: 'combined',
      weekOf: '2026-10-26',
      events: [],
      deletedSchedule: tombstones,
    });
    expect(flat.schedule?.deletedSchedule).toEqual(tombstones);

    const nested = parseStudioFileFull({
      studioSchedule: { events: [], deletedSchedule: [{ date: '2026-10-29', title: 'Water plants' }] },
    });
    // An absent start normalizes to the row's own word: 'All day'.
    expect(nested.schedule?.deletedSchedule).toEqual([
      { date: '2026-10-29', start: 'All day', title: 'Water plants' },
    ]);

    const bare = parseStudioFileFull({ weekOf: '2026-10-26', events: [] });
    expect(bare.schedule?.deletedSchedule).toBeUndefined();
  });

  it('a malformed tombstone rejects the whole file', () => {
    expect(() =>
      parseStudioFileFull({
        weekOf: '2026-10-26',
        events: [],
        deletedSchedule: [{ date: 'Oct 28', start: '09:00', title: 'Gardening' }],
      }),
    ).toThrow();
    expect(() =>
      parseStudioFileFull({
        weekOf: '2026-10-26',
        events: [],
        deletedSchedule: [{ date: '2026-10-28', start: '9am', title: 'Gardening' }],
      }),
    ).toThrow();
  });

  it('applyScheduleTombstones deletes by exact key — and nothing else', () => {
    const events: ScheduleEvent[] = [
      createScheduleEvent({ title: 'Gardening', date: '2026-10-28', startTime: '09:00' }),
      // Same title, same date, DIFFERENT start: a different key — survives.
      createScheduleEvent({ title: 'Gardening', date: '2026-10-28', startTime: '18:00' }),
      // An app-only item the desk never held: no tombstone can name it.
      createScheduleEvent({ title: 'Anniversary dinner', date: '2027-05-14', startTime: '19:00' }),
    ];
    const todos: ScheduleTodo[] = [
      createScheduleTodo({ title: 'Water plants', date: '2026-10-29' }, 0),
      createScheduleTodo({ title: 'Water plants', date: '2026-10-30' }, 1),
    ];
    const tombstones = [
      { date: '2026-10-28', start: '09:00', title: 'Gardening' },
      { date: '2026-10-29', start: 'All day', title: 'Water plants' },
      // Names nothing stored: a no-op, not an error.
      { date: '2026-10-28', start: '09:00', title: 'Not there' },
    ];
    const once = applyScheduleTombstones(events, todos, tombstones);
    expect(once.removed).toBe(2);
    expect(once.events.map((e) => e.startTime)).toEqual(['18:00', '19:00']);
    expect(once.todos.map((t) => t.date)).toEqual(['2026-10-30']);

    // Idempotent: the same list over the result removes nothing more.
    const twice = applyScheduleTombstones(once.events, once.todos, tombstones);
    expect(twice.removed).toBe(0);
    expect(twice.events).toHaveLength(2);

    // Absent / empty lists return the caller's arrays untouched.
    const none = applyScheduleTombstones(events, todos, undefined);
    expect(none.removed).toBe(0);
    expect(none.events).toBe(events);
    expect(none.todos).toBe(todos);
  });

  it('the import summary names removals', () => {
    const plan = parseStudioFileFull({
      weekOf: '2026-10-26',
      events: [],
      deletedSchedule: [{ date: '2026-10-28', start: '09:00', title: 'Gardening' }],
    });
    const counts = { ...emptyStudioApplyCounts(), scheduleRemoved: 2 };
    expect(formatStudioImportSummary(plan, counts)).toContain('Removed: 2');
    const quiet = { ...emptyStudioApplyCounts(), scheduleRemoved: 0 };
    expect(formatStudioImportSummary(plan, quiet)).not.toContain('Removed');
  });
});

// ── Repairs 1 + 3 — the Drive door, end to end ─────────────────────────────

describe('v365 — the Drive door honours edits and tombstones', () => {
  const packJson = JSON.stringify({
    pack: 'combined',
    weekOf: '2026-10-26',
    events: [
      // The diagnosis' own repro rows: colour + keyword changed at the desk.
      { ...row({ color: '#EF4444', keyword: 'Gardening' }) },
      {
        ...row({ title: 'App Update', start: '08:00', type: 'Todo', color: '#3B82F6', notes: 'Do it Friday' }),
      },
      // A different title on Shower's slot: still a Rule 5 hold.
      { ...row({ title: 'Cold plunge', color: '#3B82F6' }) },
    ],
    deletedSchedule: [
      { date: '2026-10-28', start: '09:00', title: 'Gardening' },
      { date: '2026-10-29', start: 'All day', title: 'Water plants' },
    ],
  });

  const seedFolder = () => {
    store.set(DRIVE_LINK_KEY, JSON.stringify({ uri: 'content://folder', name: 'PrayerCircle' }));
    store.set(
      SCHEDULE_EVENTS_KEY,
      JSON.stringify([
        storedShower(),
        createScheduleEvent({ title: 'Gardening', date: '2026-10-28', startTime: '09:00' }),
        createScheduleEvent({ title: 'Gardening', date: '2026-10-28', startTime: '18:00' }),
      ]),
    );
    store.set(
      SCHEDULE_TODOS_KEY,
      JSON.stringify([
        { ...createScheduleTodo({ title: 'App Update', date: '2026-10-27', startTime: '08:00' }, 0), color: '#F97316' },
        createScheduleTodo({ title: 'Water plants', date: '2026-10-29' }, 1),
      ]),
    );
    setDriveFolderOverridesForTests({
      android: true,
      saf: {
        requestDirectoryPermissionsAsync: async () => ({ granted: false, directoryUri: '' }),
        readDirectoryAsync: async () => ['content://folder/prayercircle-pack.json'],
        readAsStringAsync: async () => packJson,
      },
    });
  };

  it('plans matched rows into the merge (not the skip counter); conflicts still hold', () => {
    const plan = planDrivePack(
      (() => {
        const pack = parseStudioFile(JSON.parse(packJson));
        if (pack.kind !== 'schedule') throw new Error('expected schedule');
        return pack;
      })(),
      () => 'none',
      [storedShower()],
      [{ ...createScheduleTodo({ title: 'App Update', date: '2026-10-27', startTime: '08:00' }, 0), color: '#F97316' }],
    );
    expect(plan.skippedSchedule).toBe(0);
    expect(plan.autoSchedule.map((e) => e.title)).toEqual(['Shower', 'App Update']);
    expect(plan.heldSchedule).toHaveLength(1);
    expect(plan.heldSchedule[0].conflictTitle).toBe('Shower');
    expect(plan.scheduleTombstones).toHaveLength(2);
  });

  it('a folder check lands the edits, removes the named, keeps the rest', async () => {
    seedFolder();
    const summary = await checkDriveFolder();
    expect(summary.errors).toEqual([]);
    expect(summary.held).toBe(1);

    const events = JSON.parse(store.get(SCHEDULE_EVENTS_KEY)!) as ScheduleEvent[];
    const shower = events.find((e) => e.title === 'Shower');
    expect(shower?.color).toBe('#EF4444');
    expect(shower?.keyword).toBe('Gardening');
    // The 09:00 Gardening was tombstoned; the 18:00 namesake survives.
    expect(events.filter((e) => e.title === 'Gardening').map((e) => e.startTime)).toEqual(['18:00']);

    const todos = JSON.parse(store.get(SCHEDULE_TODOS_KEY)!) as ScheduleTodo[];
    const appUpdate = todos.find((t) => t.title === 'App Update');
    expect(appUpdate?.color).toBe('#3B82F6');
    expect(appUpdate?.notes).toBe('Do it Friday');
    expect(todos.some((t) => t.title === 'Water plants')).toBe(false);

    // A second check over the same file changes nothing further: the
    // signature skip fires, and the stores stay exactly as landed.
    const eventsAfterFirst = store.get(SCHEDULE_EVENTS_KEY);
    const todosAfterFirst = store.get(SCHEDULE_TODOS_KEY);
    await checkDriveFolder();
    expect(store.get(SCHEDULE_EVENTS_KEY)).toBe(eventsAfterFirst);
    expect(store.get(SCHEDULE_TODOS_KEY)).toBe(todosAfterFirst);
  });
});

// ── Repair 4 — no clobber: the tab re-reads all three stores on focus ─────

describe('v365 — the Schedule tab focus reload covers todos + ministries', () => {
  it('schedule-tab.tsx re-reads events, todos, and ministries in the focus effect', () => {
    const tab = readFileSync(join(process.cwd(), 'components/schedule-tab.tsx'), 'utf8');
    expect(tab).toContain('const storedEvents = await AsyncStorage.getItem(SCHEDULE_EVENTS_KEY);');
    expect(tab).toContain('const storedTodos = await AsyncStorage.getItem(SCHEDULE_TODOS_KEY);');
    expect(tab).toContain('if (storedTodos) setTodos(JSON.parse(storedTodos));');
    expect(tab).toContain('const storedMinistries = await AsyncStorage.getItem(SCHEDULE_MINISTRIES_KEY);');
    expect(tab).toContain('if (storedMinistries) setMinistries(JSON.parse(storedMinistries));');
  });
});
