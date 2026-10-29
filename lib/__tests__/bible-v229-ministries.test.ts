// ─── v229 "Ministries, Through the Door" — pins ────────────────────────────
// Ministries live in their own store (prayercircle.schedule.ministries.v1)
// as ScheduleMinistry records — DATED instances (date is required), with a
// ministry type, times, place, notes, linked people, and an optional Bible
// book/chapter. v229 gives them the bridge both ways: the backup gains a
// studioMinistries section of COMPLETE records (the studio manager's
// mirror) plus a type 'Ministry' projection in studioSchedule, and a
// ministries pack comes home through the door — upsert by id, with
// deletedIds tombstones as the bridge's one explicit deletion channel.
// These pins hold the round trip, the upsert/tombstone semantics, the
// validate-first rejections, and the importer's Ministry tolerance.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
import { planDrivePack } from '../bible-v205/drive-folder';
import { collectStudioSchedule } from '../bible-v205/studio-schedule';
import {
  applyStudioMinistriesPack,
  collectStudioMinistries,
  loadStoredMinistries,
  validateStudioMinistriesPack,
} from '../bible-v205/studio-ministries';
import {
  createScheduleMinistry,
  SCHEDULE_MINISTRIES_KEY,
  type ScheduleMinistry,
} from '../schedule-data';

beforeEach(() => {
  store.clear();
});

const NOW = new Date(2026, 9, 24, 12, 0, 0);

// A record carrying EVERY field the store's type holds, and a bare one.
const full: ScheduleMinistry = {
  ...createScheduleMinistry({
    title: 'Tuesday Bible Study',
    type: 'Bible Study',
    date: '2026-10-27',
    dueDate: '2026-10-26',
    startTime: '18:00',
    endTime: '19:30',
    location: 'Online',
    travelTimeMinutes: 15,
    notes: 'Colossians 1 this week',
    color: '#7C4DBD',
    linkedPeopleIds: ['person-cody'],
    bibleBook: 'Colossians',
    bibleChapter: '1',
  }),
  isCompleted: true,
  completedAt: '2026-10-20T19:32:00.000Z',
};
const bare: ScheduleMinistry = createScheduleMinistry({
  title: 'Food Bank Run',
  type: 'Service',
  date: '2026-10-29',
});

describe('studioMinistries — the full-records section', () => {
  it('carries every field the store holds, and no tombstones', () => {
    const section = collectStudioMinistries([full, bare]);
    expect(section.deletedIds).toEqual([]);
    expect(section.ministries).toEqual([full, bare]);
    expect(section.ministries[0]).toMatchObject({
      dueDate: '2026-10-26',
      travelTimeMinutes: 15,
      linkedPeopleIds: ['person-cody'],
      bibleBook: 'Colossians',
      bibleChapter: '1',
      isCompleted: true,
      completedAt: '2026-10-20T19:32:00.000Z',
    });
    // A bare record gains no invented fields on the way out.
    expect(Object.keys(section.ministries[1]).sort()).toEqual(
      ['date', 'id', 'isCompleted', 'title', 'type'].sort(),
    );
  });

  it('round-trip: export → import into an empty store → export is record-equal', () => {
    const section = collectStudioMinistries([full, bare]);
    // The standalone file shape the studio writes.
    const pack = parseStudioFile(JSON.parse(JSON.stringify(section)));
    expect(pack.kind).toBe('ministries');
    if (pack.kind !== 'ministries') return;
    const applied = applyStudioMinistriesPack([], pack.ministries);
    expect(applied.summary).toEqual({ added: 2, updated: 0, deleted: 0 });
    expect(collectStudioMinistries(applied.ministries)).toEqual(section);
  });

  it('the section inside a full export parses as a ministries pack too', () => {
    const section = collectStudioMinistries([bare]);
    const pack = parseStudioFile({ studioMinistries: section });
    expect(pack.kind).toBe('ministries');
    if (pack.kind !== 'ministries') return;
    expect(pack.ministries.ministries).toEqual([bare]);
  });

  it('loadStoredMinistries reads the real store key, loosely but safely', async () => {
    store.set(SCHEDULE_MINISTRIES_KEY, JSON.stringify([full, { title: 'no id' }, null, 'junk']));
    await expect(loadStoredMinistries()).resolves.toEqual([full]);
  });
});

describe('the ministries pack — upserts and tombstones', () => {
  it('updates a known record field for field, adds an unknown one, leaves the rest untouched', () => {
    const untouched = createScheduleMinistry({ title: 'Choir Practice', type: 'Worship', date: '2026-10-25' });
    const existing = [full, untouched];
    const changed: ScheduleMinistry = { ...full, notes: 'Colossians 2 now', location: 'The booth' };
    const added = createScheduleMinistry({ title: 'Park Outreach', type: 'Outreach', date: '2026-10-31' });
    const result = applyStudioMinistriesPack(existing, { ministries: [changed, added], deletedIds: [] });
    expect(result.summary).toEqual({ added: 1, updated: 1, deleted: 0 });
    expect(result.ministries).toEqual([changed, untouched, added]);
    // The input list was not mutated.
    expect(existing[0].notes).toBe('Colossians 1 this week');
  });

  it('a tombstone deletes exactly the named record; an unknown id is a quiet no-op', () => {
    const existing = [full, bare];
    const result = applyStudioMinistriesPack(existing, {
      ministries: [],
      deletedIds: [full.id, 'sch-never-existed'],
    });
    expect(result.summary).toEqual({ added: 0, updated: 0, deleted: 1 });
    expect(result.ministries).toEqual([bare]);
  });

  it('tombstones reach ministries only — an event sharing the id string is not in this store', () => {
    // The apply receives the ministries list alone; there is no path
    // from a tombstone to events, todos, or people. Pin the boundary:
    // deleting an id that only an EVENT holds changes nothing here.
    const result = applyStudioMinistriesPack([bare], { ministries: [], deletedIds: ['some-event-id'] });
    expect(result.summary.deleted).toBe(0);
    expect(result.ministries).toEqual([bare]);
  });
});

describe('validate-first — a malformed pack changes nothing', () => {
  const good = collectStudioMinistries([bare]).ministries[0];

  it('rejects an impossible date, a missing title, and a bad clock time', () => {
    expect(() => validateStudioMinistriesPack({ ministries: [{ ...good, date: '2026-13-40' }] })).toThrow(/date/);
    expect(() => validateStudioMinistriesPack({ ministries: [{ ...good, title: ' ' }] })).toThrow(/title/);
    expect(() => validateStudioMinistriesPack({ ministries: [{ ...good, startTime: '25:00' }] })).toThrow(/startTime/);
    expect(() => validateStudioMinistriesPack({ ministries: [{ ...good, dueDate: 'next Tuesday' }] })).toThrow(/dueDate/);
  });

  it('rejects duplicate ids and a non-string deletedIds entry', () => {
    expect(() => validateStudioMinistriesPack({ ministries: [good, good] })).toThrow(/twice/);
    expect(() =>
      validateStudioMinistriesPack({ ministries: [], deletedIds: [42] }),
    ).toThrow(/deletedIds/);
    expect(() => validateStudioMinistriesPack({ ministries: [], deletedIds: 'all' })).toThrow(/deletedIds/);
  });

  it('rejects an id listed as both present and deleted', () => {
    expect(() =>
      validateStudioMinistriesPack({ ministries: [good], deletedIds: [good.id] }),
    ).toThrow(/both present and deleted/);
  });

  it('rejects bad travel minutes, non-string linked people, and a bad completedAt', () => {
    expect(() => validateStudioMinistriesPack({ ministries: [{ ...good, travelTimeMinutes: -5 }] })).toThrow(/travelTimeMinutes/);
    expect(() => validateStudioMinistriesPack({ ministries: [{ ...good, travelTimeMinutes: 1.5 }] })).toThrow(/travelTimeMinutes/);
    expect(() => validateStudioMinistriesPack({ ministries: [{ ...good, linkedPeopleIds: [7] }] })).toThrow(/linkedPeopleIds/);
    expect(() => validateStudioMinistriesPack({ ministries: [{ ...good, completedAt: 'yesterday' }] })).toThrow(/completedAt/);
  });

  it('the door rejects the whole file — the error names the ministries pack', () => {
    expect(() => parseStudioFile({ ministries: [{ ...good, date: '2026-02-30' }] })).toThrow();
    expect(() => parseStudioFile({ unrelated: true })).toThrow(/prayercircle-ministries\.json/);
  });
});

describe('studioSchedule — the Ministry projection', () => {
  it('a dated ministry rides with type Ministry, its location, notes, and end−start minutes', () => {
    const section = collectStudioSchedule([], [], NOW, [full, bare]);
    const study = section.events.find((e) => e.title === 'Tuesday Bible Study');
    expect(study).toMatchObject({
      type: 'Ministry',
      date: '2026-10-27',
      day: 'Tue',
      start: '18:00',
      minutes: 90,
      notes: 'Colossians 1 this week',
    });
    // 'Online' obeys the same marker rule as events.
    expect(study?.online).toBe(true);
    expect(study?.location).toBe('');
    const run = section.events.find((e) => e.title === 'Food Bank Run');
    expect(run).toMatchObject({ type: 'Ministry', start: 'All day', minutes: 0 });
  });

  it('a ministry whose date is not a real date is excluded and counted, never re-dated', () => {
    const ghost: ScheduleMinistry = { ...bare, date: '2026-13-40' };
    const section = collectStudioSchedule([], [], NOW, [ghost, bare]);
    expect(section.undatedExcluded).toBe(1);
    expect(section.events.map((e) => e.title)).toEqual(['Food Bank Run']);
  });

  it('a start with no stored end reads as 60 minutes, like an event', () => {
    const timed: ScheduleMinistry = { ...bare, startTime: '09:00', endTime: undefined };
    const section = collectStudioSchedule([], [], NOW, [timed]);
    expect(section.events[0].minutes).toBe(60);
  });
});

describe('importer tolerance — Ministry rows in a schedule pack', () => {
  it('validate as a known type, apply nothing, and never become events or todos', () => {
    const section = collectStudioSchedule([], [], NOW, [full]);
    const pack = parseStudioFile({ weekOf: '2026-10-25', events: section.events });
    expect(pack.kind).toBe('schedule');
    if (pack.kind !== 'schedule') return;
    const merged = mergeStudioSchedule([], [], pack.schedule);
    expect(merged.added).toBe(0);
    expect(merged.events).toEqual([]);
    expect(merged.todos).toEqual([]);
  });

  it('a near-miss type name is still rejected', () => {
    expect(() =>
      parseStudioFile({
        weekOf: '2026-10-25',
        events: [
          { title: 'X', day: 'Tue', date: '2026-10-27', start: '10:00', minutes: 30, type: 'Ministryy', online: false, recur: 'none' },
        ],
      }),
    ).toThrow(/Event, Todo, or Ministry/);
  });
});

describe('Drive parity — the planner treats ministries like the door does', () => {
  it('a ministries pack rides whole: planned as a pack, nothing held, tombstones intact', () => {
    const pack = parseStudioFile({
      ministries: collectStudioMinistries([bare]).ministries,
      deletedIds: [full.id],
    });
    const plan = planDrivePack(pack, () => 'none', [], []);
    expect(plan.ministriesPack?.ministries).toHaveLength(1);
    expect(plan.ministriesPack?.deletedIds).toEqual([full.id]);
    expect(plan.heldStates).toEqual([]);
    expect(plan.heldSchedule).toEqual([]);
    // And the apply the check runs lands the tombstone.
    const result = applyStudioMinistriesPack([full, bare], plan.ministriesPack!);
    expect(result.ministries).toEqual([bare]);
    expect(result.summary.deleted).toBe(1);
  });

  it('Ministry rows in a schedule pack are noted, never slotted, held, or auto-applied', () => {
    const ministryRow = collectStudioSchedule([], [], NOW, [full]).events[0];
    const eventRow = { ...ministryRow, type: 'Event' as const, title: 'Same slot event' };
    const pack = parseStudioFile({ weekOf: '2026-10-25', events: [ministryRow, eventRow] });
    const plan = planDrivePack(pack, () => 'none', [], []);
    expect(plan.ministryRows).toBe(1);
    expect(plan.heldSchedule).toEqual([]);
    expect(plan.skippedSchedule).toBe(0);
    // The ministry row did not occupy the slot: the real event applies.
    expect(plan.autoSchedule.map((e) => e.title)).toEqual(['Same slot event']);
  });
});

describe('surfaces — the backup and the DATA rows carry ministries', () => {
  const src = readFileSync(join(process.cwd(), 'app/(tabs)/index.tsx'), 'utf8');

  it('the DATA export carries studioMinistries and feeds ministries into the schedule section', () => {
    expect(src).toContain('collectStudioMinistries');
    expect(src).toContain('studioMinistries');
    expect(src).toContain('studioSchedule, studioStates, studioMinistries');
    expect(src).toContain('collectStudioSchedule(exportEvents, exportTodos, new Date(), exportMinistries)');
  });

  // v231 "One Door" superseded the dedicated Ministries row and its
  // per-pack alert this test originally pinned: ministries ride the
  // single Import Studio Pack row now, and the counts land in the one
  // combined summary. (Updated in v231 — bible-v231-onedoor.test.ts
  // pins the one-door wiring in full.)
  it('the one door applies ministries and names them in its subtitle', () => {
    expect(src).toContain('applyStudioMinistriesPack');
    expect(src).toContain('counts.ministriesAdded = result.summary.added');
    expect(src).not.toContain('Import Ministries Pack');
    expect(src).not.toContain('handleImportMinistriesPack');
    // v315 re-pin: the door, its handler, and the combined summary
    // are untouched — the row's SUBTITLE copy now follows the
    // approved Settings drawing ("Notes, people & schedule from the
    // Studio") instead of the v229-era sentence.
    expect(src).toContain('title: "Import Studio Pack", sub: "Notes, people & schedule from the Studio"');
    expect(src).toContain('formatStudioImportSummary');
  });
});
