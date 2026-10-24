// ─── v237 "Ministry Knows Its Chapter" — pins ─────────────────────────────
// The studio's SCHEDULE editor asks for a Bible book/chapter when a
// line's kind is Ministry ("Commentary writing — Colossians 1"), and
// the pack row carries the pair. Until v237 the app's door validated
// Ministry rows and then dropped everything about them: the records
// travel by the ministries pack (v229), and a line born on the desk's
// Schedule tab has no such record. These pins hold the receiving end:
//   · the pair validates on Ministry rows only (malformed → the file
//     is rejected whole, the door's validate-first discipline);
//   · mergeStudioScheduleMinistries lands it on the ministry record —
//     matched by the door's (date, start, title) convention, created
//     when the schedule line is its only source — the store the
//     ministry cards and the Schedule tab's day lists actually read;
//   · a file carrying BOTH a ministries pack and schedule rows yields
//     ONE record (the pack lands first and stays the authority);
//   · the Drive planner collects the pair for the same landing;
//   · the app's own export projection now carries the pair too, and
//     rows/items without it are shape-identical to before.

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
  emptyStudioApplyCounts,
  formatStudioImportSummary,
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
  createScheduleMinistry,
  getMinistriesForDate,
  type ScheduleMinistry,
} from '../schedule-data';

beforeEach(() => {
  store.clear();
});

const NOW = new Date(2026, 9, 24, 12, 0, 0);

// Jonathan's line, shaped in the studio's Schedule editor: a Ministry
// session for Colossians 1, Monday Oct 26 at 11:00 AM for an hour.
const ministryRow = (overrides: Record<string, unknown> = {}) => ({
  title: 'Commentary writing — Colossians 1',
  day: 'Mon',
  date: '2026-10-26',
  start: '11:00',
  minutes: 60,
  type: 'Ministry',
  online: false,
  recur: 'none',
  notes: '',
  location: '',
  bibleBook: 'Colossians',
  bibleChapter: '1',
  ...overrides,
});

const packOf = (events: unknown[]): StudioSchedulePayload => {
  const pack = parseStudioFile({ weekOf: '2026-10-25', events });
  if (pack.kind !== 'schedule') throw new Error('expected a schedule pack');
  return pack.schedule;
};

describe('validation — the pair on Ministry rows', () => {
  it('a Ministry row carrying the pair validates, and the pair rides the input', () => {
    const schedule = packOf([ministryRow()]);
    expect(schedule.events[0]).toMatchObject({ bibleBook: 'Colossians', bibleChapter: '1' });
  });

  it('a malformed pair rejects the whole file, naming the field', () => {
    expect(() => packOf([ministryRow({ bibleBook: '' })])).toThrow(/bibleBook/);
    expect(() => packOf([ministryRow({ bibleBook: 3 })])).toThrow(/bibleBook/);
    expect(() => packOf([ministryRow({ bibleChapter: '' })])).toThrow(/bibleChapter/);
    expect(() => packOf([ministryRow({ bibleChapter: null })])).toThrow(/bibleChapter/);
    expect(() => packOf([ministryRow({ bibleChapter: 1 })])).toThrow(/bibleChapter/);
  });

  it('validate-first holds through the one door: one bad row rejects every section', () => {
    expect(() =>
      parseStudioFileFull({
        weekOf: '2026-10-25',
        events: [ministryRow({ bibleBook: '' })],
        studioMinistries: { ministries: [], deletedIds: [] },
      }),
    ).toThrow(/bibleBook/);
  });

  it('a Ministry row without the pair validates with neither key present', () => {
    const row = ministryRow();
    delete (row as Record<string, unknown>).bibleBook;
    delete (row as Record<string, unknown>).bibleChapter;
    const schedule = packOf([row]);
    expect('bibleBook' in schedule.events[0]).toBe(false);
    expect('bibleChapter' in schedule.events[0]).toBe(false);
  });

  it('the pair on a non-Ministry row is dropped, exactly as before', () => {
    const schedule = packOf([
      { ...ministryRow(), type: 'Event' },
      { ...ministryRow(), type: 'Todo', title: 'Chores' },
    ]);
    for (const ev of schedule.events) {
      expect('bibleBook' in ev).toBe(false);
      expect('bibleChapter' in ev).toBe(false);
    }
  });

  it('either half of the pair may ride alone', () => {
    const bookOnly = packOf([ministryRow({ bibleChapter: undefined })]);
    expect(bookOnly.events[0].bibleBook).toBe('Colossians');
    expect(bookOnly.events[0].bibleChapter).toBeUndefined();
  });
});

describe('mergeStudioScheduleMinistries — the pair lands on the record', () => {
  it("Jonathan's case: an unmatched row creates the session, tied to Colossians 1", () => {
    const { ministries, linked } = mergeStudioScheduleMinistries([], packOf([ministryRow()]));
    expect(linked).toBe(1);
    expect(ministries).toHaveLength(1);
    const [m] = ministries;
    expect(m).toMatchObject({
      title: 'Commentary writing — Colossians 1',
      date: '2026-10-26',
      startTime: '11:00',
      endTime: '12:00',
      bibleBook: 'Colossians',
      bibleChapter: '1',
      isCompleted: false,
    });
    expect(typeof m.id).toBe('string');
    expect(m.id.length).toBeGreaterThan(0);
  });

  it('the landed record is what the app surfaces read: the day list carries the pair', () => {
    const { ministries } = mergeStudioScheduleMinistries([], packOf([ministryRow()]));
    // getMinistriesForDate is the exact selector the Schedule tab
    // builds its day ministry lists from (schedule-tab.tsx), and the
    // ministry cards/detail render bibleBook/bibleChapter off it.
    const day = getMinistriesForDate(ministries, '2026-10-26');
    expect(day).toHaveLength(1);
    expect(`${day[0].bibleBook} ${day[0].bibleChapter}`).toBe('Colossians 1');
    expect(getMinistriesForDate(ministries, '2026-10-27')).toEqual([]);
  });

  it('a matching record is updated in place — same id, its own type kept', () => {
    const existing: ScheduleMinistry = createScheduleMinistry({
      title: 'Commentary writing — Colossians 1',
      type: 'Teaching',
      date: '2026-10-26',
      startTime: '11:00',
      endTime: '12:00',
    });
    const { ministries, linked } = mergeStudioScheduleMinistries([existing], packOf([ministryRow()]));
    expect(linked).toBe(1);
    expect(ministries).toHaveLength(1);
    expect(ministries[0].id).toBe(existing.id);
    expect(ministries[0].type).toBe('Teaching');
    expect(ministries[0].bibleBook).toBe('Colossians');
    expect(ministries[0].bibleChapter).toBe('1');
    // The caller's record is never mutated.
    expect(existing.bibleBook).toBeUndefined();
  });

  it('a unique (date, title) match lands even when the start disagrees', () => {
    const existing: ScheduleMinistry = createScheduleMinistry({
      title: 'Commentary writing — Colossians 1',
      type: 'Bible Study',
      date: '2026-10-26',
      startTime: '10:30',
    });
    const { ministries, linked } = mergeStudioScheduleMinistries([existing], packOf([ministryRow()]));
    expect(linked).toBe(1);
    expect(ministries).toHaveLength(1);
    expect(ministries[0].id).toBe(existing.id);
    expect(ministries[0].startTime).toBe('10:30');
    expect(ministries[0].bibleBook).toBe('Colossians');
  });

  it('an absent key preserves the stored half of the pair', () => {
    const existing: ScheduleMinistry = createScheduleMinistry({
      title: 'Commentary writing — Colossians 1',
      type: 'Bible Study',
      date: '2026-10-26',
      startTime: '11:00',
      bibleBook: 'Romans',
      bibleChapter: '3',
    });
    const row = ministryRow({ bibleBook: undefined, bibleChapter: '4' });
    const { ministries } = mergeStudioScheduleMinistries([existing], packOf([row]));
    expect(ministries[0].bibleBook).toBe('Romans');
    expect(ministries[0].bibleChapter).toBe('4');
  });

  it('rows without a pair, and non-Ministry rows, change nothing', () => {
    const bare = ministryRow();
    delete (bare as Record<string, unknown>).bibleBook;
    delete (bare as Record<string, unknown>).bibleChapter;
    const { ministries, linked } = mergeStudioScheduleMinistries(
      [],
      packOf([bare, { ...ministryRow(), type: 'Event', title: 'Picnic' }]),
    );
    expect(linked).toBe(0);
    expect(ministries).toEqual([]);
  });

  it('re-importing the same pack creates no duplicate', () => {
    const pack = packOf([ministryRow()]);
    const first = mergeStudioScheduleMinistries([], pack);
    const again = mergeStudioScheduleMinistries(first.ministries, pack);
    expect(again.ministries).toHaveLength(1);
    expect(again.ministries[0].id).toBe(first.ministries[0].id);
  });

  it('the schedule merge itself still lands no Ministry row as an event or todo', () => {
    const merged = mergeStudioSchedule([], [], packOf([ministryRow()]));
    expect(merged.added).toBe(0);
    expect(merged.events).toEqual([]);
    expect(merged.todos).toEqual([]);
  });
});

describe('both doors in one file — the ministries pack stays the authority', () => {
  // A backup-shaped file: the full record (by the ministries section)
  // AND its schedule projection row, both carrying the pair.
  const record: ScheduleMinistry = createScheduleMinistry({
    title: 'Commentary writing — Colossians 1',
    type: 'Bible Study',
    date: '2026-10-26',
    startTime: '11:00',
    endTime: '12:00',
    bibleBook: 'Colossians',
    bibleChapter: '1',
  });

  it('pack first, then the row: exactly one ministry, the pack’s id, the pair intact', () => {
    const plan = parseStudioFileFull({
      weekOf: '2026-10-25',
      events: [ministryRow()],
      studioMinistries: collectStudioMinistries([record]),
    });
    expect(plan.schedule).toBeTruthy();
    expect(plan.ministries).toBeTruthy();
    // The door's order: ministries pack upserts by id first…
    const afterPack = applyStudioMinistriesPack([], plan.ministries!);
    expect(afterPack.ministries).toHaveLength(1);
    // …then the schedule row's pair merge finds that very record.
    const linked = mergeStudioScheduleMinistries(afterPack.ministries, plan.schedule!);
    expect(linked.linked).toBe(1);
    expect(linked.ministries).toHaveLength(1);
    expect(linked.ministries[0].id).toBe(record.id);
    expect(linked.ministries[0].bibleBook).toBe('Colossians');
    expect(linked.ministries[0].bibleChapter).toBe('1');
  });

  it('the Drive planner collects the pair for the same landing, and never slots the row', () => {
    const plan = parseStudioFileFull({
      weekOf: '2026-10-25',
      events: [ministryRow()],
      studioMinistries: collectStudioMinistries([record]),
    });
    const drive = planDriveFile(plan, () => 'none', [], []);
    expect(drive.ministryRows).toBe(1);
    expect(drive.ministryLinks).toHaveLength(1);
    expect(drive.ministryLinks[0]).toMatchObject({ bibleBook: 'Colossians', bibleChapter: '1' });
    expect(drive.autoSchedule).toEqual([]);
    expect(drive.heldSchedule).toEqual([]);
    // And the plan's own order lands one record, like the door's.
    const afterPack = applyStudioMinistriesPack([], drive.ministriesPack!);
    const linked = mergeStudioScheduleMinistries(afterPack.ministries, {
      weekOf: '',
      events: drive.ministryLinks,
    });
    expect(linked.ministries).toHaveLength(1);
    expect(linked.ministries[0].id).toBe(record.id);
  });

  it('a bare schedule pack through the Drive planner still offers its pair', () => {
    const pack = parseStudioFile({ weekOf: '2026-10-25', events: [ministryRow()] });
    if (pack.kind !== 'schedule') throw new Error('expected a schedule pack');
    const drive = planDrivePack(pack, () => 'none', [], []);
    expect(drive.ministryLinks).toHaveLength(1);
    const landed = mergeStudioScheduleMinistries([], { weekOf: '', events: drive.ministryLinks });
    expect(landed.ministries[0]).toMatchObject({ bibleBook: 'Colossians', bibleChapter: '1' });
  });
});

describe('export — the projection carries the pair home', () => {
  it('a ministry with a pair projects it onto its Ministry row', () => {
    const m: ScheduleMinistry = createScheduleMinistry({
      title: 'Tuesday Bible Study',
      type: 'Bible Study',
      date: '2026-10-27',
      startTime: '18:00',
      endTime: '19:30',
      bibleBook: 'Colossians',
      bibleChapter: '1',
    });
    const section = collectStudioSchedule([], [], NOW, [m]);
    expect(section.events[0]).toMatchObject({ bibleBook: 'Colossians', bibleChapter: '1' });
    // And the row comes home through the door onto the same session.
    const landed = mergeStudioScheduleMinistries([m], { weekOf: '', events: section.events });
    expect(landed.ministries).toHaveLength(1);
    expect(landed.ministries[0].id).toBe(m.id);
  });

  it('a ministry without a pair projects neither key — shape identical to before', () => {
    const m: ScheduleMinistry = createScheduleMinistry({
      title: 'Food Bank Run',
      type: 'Service',
      date: '2026-10-29',
    });
    const section = collectStudioSchedule([], [], NOW, [m]);
    expect('bibleBook' in section.events[0]).toBe(false);
    expect('bibleChapter' in section.events[0]).toBe(false);
  });
});

describe('the import summary', () => {
  it('names the chapter ties when a schedule pack landed any', () => {
    const plan = parseStudioFileFull({ weekOf: '2026-10-25', events: [ministryRow()] });
    const counts = { ...emptyStudioApplyCounts(), ministriesLinked: 1 };
    expect(formatStudioImportSummary(plan, counts)).toContain('Ministry chapters: 1 tied');
    expect(formatStudioImportSummary(plan, emptyStudioApplyCounts())).not.toContain(
      'Ministry chapters',
    );
  });
});
