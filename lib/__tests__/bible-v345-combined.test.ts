// ─── v345 "One File" — pins ───────────────────────────────────────────────
// Jonathan (Oct 29 16:13, of the five-files-per-Save-to-app sprawl —
// "This can't all be read through one file? Why does it need 15?"):
// the Studio→app transfer becomes a single file. v345 is the app
// half: the door learns the combined pack (the five packs' flat union
// under a "pack": "combined" marker — the envelope contract lives on
// parseStudioFileFull in studio-import.ts), the import summary grows
// honest (schedule counts split by kind, dedupe matches named,
// repaired minutes counted), and schedule validation REPAIRS a row's
// invalid minutes (timed → 60, all day → 0 — the Studio's own -41
// rule) instead of refusing the whole file over it, the Oct 29
// incident where one null minutes killed an 801-row import.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => {}),
    removeItem: vi.fn(async () => {}),
    clear: vi.fn(async () => {}),
  },
}));

import {
  applyStudioChapters,
  emptyStudioApplyCounts,
  formatStudioImportSummary,
  mergeStudioSchedule,
  mergeStudioScheduleMinistries,
  parseStudioFileFull,
  studioFileHasSections,
  type StudioApplyCounts,
  type StudioFilePlan,
} from '../bible-v205/studio-import';
import { applyStudioPeoplePack } from '../bible-v205/studio-people';
import {
  applyStudioMinistriesPack,
  collectStudioMinistries,
} from '../bible-v205/studio-ministries';
import { applyStudioStatesReads } from '../bible-v205/studio-states';
import { chapterReadDate, chapterStatus, seedStudyState } from '../bible-v205/study';
import { transitionChapterStatus } from '../bible-v205/rewards';
import { createScheduleMinistry } from '../schedule-data';

// ── Fixtures ────────────────────────────────────────────────────────────────

const CHAPTER = {
  book: 'Colossians',
  chapter: 1,
  opener: { kind: 'previously', text: 'In our last chapter we met the church.' },
  sections: [{ start: 1, end: 29, title: null, entries: [{ start: 1, end: 2 }] }],
  notes: [
    {
      start: 1,
      end: 2,
      kind: 'note',
      category: null,
      blocks: [{ kind: 'para', text: 'Paul opens with grace.' }],
    },
  ],
  chapterState: 'write',
};

const PERSON = {
  id: 'studio-eva',
  name: 'Eva',
  relationship: 'Family',
  reminderFrequency: 'daily',
  reminderDaysOfWeek: [],
  lastPrayerCompletedDate: null,
  lastReached: '2026-10-23',
  needs: [
    { id: 'need-rest', title: 'Rest', more: '', kind: 'Regular', isDone: false, isEmergency: false, isPraised: false },
  ],
};

const PEOPLE_JOURNAL = [
  { personId: 'studio-eva', personName: 'Eva', needId: 'need-rest', text: 'Real rest.', kind: 'Regular' },
];

const EVENT_ROW = {
  title: 'Evening check-in',
  day: 'Sat',
  date: '2026-10-24',
  start: '20:00',
  minutes: 30,
  type: 'Event',
  online: false,
  recur: 'none',
};

const TODO_ROW = {
  title: 'Water the plants',
  day: 'Sat',
  date: '2026-10-24',
  start: '07:30',
  minutes: 15,
  type: 'Todo',
  online: false,
  recur: 'none',
};

const MINISTRY_ROW = {
  title: 'Food Bank Run',
  day: 'Sat',
  date: '2026-10-31',
  start: '09:00',
  minutes: 120,
  type: 'Ministry',
  online: false,
  recur: 'none',
  ministryType: 'Service',
  bibleBook: 'Colossians',
  bibleChapter: '1',
};

const ministry = createScheduleMinistry({ title: 'Food Bank Run', type: 'Service', date: '2026-10-31' });
const MINISTRIES_SECTION = collectStudioMinistries([ministry]);

/** The combined pack, exactly per the v345 envelope contract: the
 *  marker plus the five sections under their standalone shapes. */
function combinedFile(): Record<string, unknown> {
  return {
    pack: 'combined',
    chapters: [CHAPTER],
    studioStates: {
      chapters: [{ book: 'Genesis', chapter: 1, notesState: 'complete', readDate: '2026-10-24' }],
    },
    weekOf: '2026-10-25',
    events: [EVENT_ROW, TODO_ROW, MINISTRY_ROW],
    whiteSpace: {},
    people: [PERSON],
    journal: PEOPLE_JOURNAL,
    ministries: MINISTRIES_SECTION.ministries,
    deletedIds: MINISTRIES_SECTION.deletedIds,
  };
}

/** The Settings door's apply order, run against empty stores — the
 *  same sequence handleImportStudioPack performs. */
async function applyPlanWhole(plan: StudioFilePlan): Promise<StudioApplyCounts> {
  const counts = emptyStudioApplyCounts();
  const applied = applyStudioChapters({}, plan.notes!);
  counts.chaptersUpdated = applied.chaptersUpdated;

  let state = seedStudyState();
  for (const chapter of plan.notes!) {
    if (chapter.chapterState === undefined) continue;
    state = (await transitionChapterStatus(state, chapter.book, chapter.chapter, chapter.chapterState)).state;
    counts.statesSet += 1;
  }
  for (const entry of plan.states!.chapters) {
    if (entry.notesState === null) continue;
    state = (await transitionChapterStatus(state, entry.book, entry.chapter, entry.notesState)).state;
    counts.statesSet += 1;
  }
  const reads = applyStudioStatesReads(state, plan.states!.chapters);
  counts.readMarks = reads.applied;
  counts.readMarksAlreadyThere = reads.alreadyThere;
  expect(chapterReadDate(reads.state, 'Genesis', 1)).toBe('2026-10-24');
  expect(chapterStatus(reads.state, 'Colossians', 1)).toBe('write');

  const merged = mergeStudioSchedule([], [], plan.schedule!);
  counts.scheduleEventsAdded = merged.eventsAdded;
  counts.scheduleTodosAdded = merged.todosAdded;
  counts.scheduleEventsAlreadyThere = merged.eventsAlreadyThere;
  counts.scheduleTodosAlreadyThere = merged.todosAlreadyThere;
  counts.minutesRepaired = plan.schedule!.minutesRepaired ?? 0;

  const peopleResult = applyStudioPeoplePack([], [], plan.people!);
  counts.peopleUpdated = peopleResult.summary.peopleUpdated;
  counts.needs = peopleResult.summary.needs;
  counts.journalEntries = peopleResult.summary.journalEntries;

  const ministriesResult = applyStudioMinistriesPack([], plan.ministries!);
  counts.ministriesAdded = ministriesResult.summary.added;
  counts.ministriesUpdated = ministriesResult.summary.updated;
  counts.ministriesDeleted = ministriesResult.summary.deleted;

  // Schedule Ministry rows run last, onto the pack's own records.
  const linked = mergeStudioScheduleMinistries(ministriesResult.ministries, {
    weekOf: plan.schedule!.weekOf,
    events: plan.schedule!.events.filter((ev) => ev.type === 'Ministry'),
  });
  counts.ministriesLinked = linked.linked;
  return counts;
}

// ── The envelope ────────────────────────────────────────────────────────────

describe('the combined pack — one file, every section', () => {
  it('parses whole: all five sections detected under their own shapes', () => {
    const plan = parseStudioFileFull(combinedFile());
    expect(studioFileHasSections(plan)).toBe(true);
    expect(plan.notes).toHaveLength(1);
    expect(plan.states?.chapters).toHaveLength(1);
    expect(plan.schedule?.weekOf).toBe('2026-10-25');
    expect(plan.schedule?.events).toHaveLength(3);
    expect(plan.schedule?.minutesRepaired).toBe(0);
    expect(plan.people?.people).toHaveLength(1);
    expect(plan.people?.journal).toHaveLength(1);
    expect(plan.ministries?.ministries).toHaveLength(1);
    expect(plan.ministries?.deletedIds).toEqual([]);
  });

  it('the marker is the file’s identity, not its mechanism — presence still rules', () => {
    const bare = combinedFile();
    delete bare.pack;
    const plan = parseStudioFileFull(bare);
    expect(plan.notes).toHaveLength(1);
    expect(plan.schedule?.events).toHaveLength(3);
    expect(plan.ministries?.ministries).toHaveLength(1);
  });

  it('a section the file omits plans as absent; the rest still land', () => {
    const file = combinedFile();
    delete file.people;
    delete file.journal;
    const plan = parseStudioFileFull(file);
    expect(plan.people).toBeNull();
    expect(plan.notes).toHaveLength(1);
    expect(plan.schedule?.events).toHaveLength(3);
    expect(plan.ministries?.ministries).toHaveLength(1);
  });

  it('imports fully in one pass, and the one summary names every section honestly', async () => {
    const plan = parseStudioFileFull(combinedFile());
    const counts = await applyPlanWhole(plan);
    expect(formatStudioImportSummary(plan, counts)).toBe(
      'Notes: 1 chapters · States: 2 · Read marks: 1 · ' +
        'Schedule: 1 events + 1 todos added · 0 already there · ' +
        'Ministry chapters: 1 tied · People updated: 1 · ' +
        'Ministries: 1 added / 0 updated / 0 deleted',
    );
  });
});

// ── The honest summary ──────────────────────────────────────────────────────

describe('the honest summary — added and already-there, by kind', () => {
  it('a full-dedupe re-import reads as the no-op it is', () => {
    const plan = parseStudioFileFull({
      weekOf: '2026-10-25',
      events: [EVENT_ROW, TODO_ROW],
    });
    const first = mergeStudioSchedule([], [], plan.schedule!);
    expect(first.added).toBe(2);
    const second = mergeStudioSchedule(first.events, first.todos, plan.schedule!);
    expect(second.added).toBe(0);
    expect(second.eventsAdded).toBe(0);
    expect(second.todosAdded).toBe(0);
    expect(second.eventsAlreadyThere).toBe(1);
    expect(second.todosAlreadyThere).toBe(1);
    const counts = {
      ...emptyStudioApplyCounts(),
      scheduleEventsAdded: second.eventsAdded,
      scheduleTodosAdded: second.todosAdded,
      scheduleEventsAlreadyThere: second.eventsAlreadyThere,
      scheduleTodosAlreadyThere: second.todosAlreadyThere,
    };
    expect(formatStudioImportSummary(plan, counts)).toBe(
      'Schedule: 0 events + 0 todos added · 2 already there',
    );
  });

  it('a partial match splits cleanly — new rows added, matched rows named', () => {
    const plan = parseStudioFileFull({
      weekOf: '2026-10-25',
      events: [EVENT_ROW, TODO_ROW],
    });
    const first = mergeStudioSchedule([], [], plan.schedule!);
    const second = mergeStudioSchedule(first.events, [], plan.schedule!);
    expect(second.eventsAdded).toBe(0);
    expect(second.eventsAlreadyThere).toBe(1);
    expect(second.todosAdded).toBe(1);
    expect(second.todosAlreadyThere).toBe(0);
  });

  it('read marks already there are named, not silently skipped', () => {
    const state = seedStudyState();
    const entries = [
      { book: 'Genesis', chapter: 1, notesState: null, readDate: '2026-10-24' },
      { book: 'Genesis', chapter: 2, notesState: null, readDate: '2026-10-24' },
    ];
    const first = applyStudioStatesReads(state, entries);
    expect(first.applied).toBe(2);
    expect(first.alreadyThere).toBe(0);
    const second = applyStudioStatesReads(first.state, entries);
    expect(second.applied).toBe(0);
    expect(second.alreadyThere).toBe(2);
    const plan = parseStudioFileFull({
      studioStates: {
        chapters: entries.map((e) => ({ book: e.book, chapter: e.chapter, notesState: null, readDate: e.readDate })),
      },
    });
    const counts = {
      ...emptyStudioApplyCounts(),
      readMarks: second.applied,
      readMarksAlreadyThere: second.alreadyThere,
    };
    expect(formatStudioImportSummary(plan, counts)).toBe('States: 0 · Read marks: 0 · 2 already there');
  });
});

// ── The minutes repair ──────────────────────────────────────────────────────

describe('minutes — repaired, never a whole-file refusal', () => {
  const scheduleOf = (row: Record<string, unknown>) =>
    parseStudioFileFull({ weekOf: '2026-11-01', events: [row] }).schedule!;
  const base = { title: 'Dexter Resurrection', day: 'Fri', date: '2026-11-06', type: 'Event', online: false, recur: 'none' };

  it('a timed row with null minutes reads as 60 — the Oct 29 incident row', () => {
    const schedule = scheduleOf({ ...base, start: '09:00', minutes: null });
    expect(schedule.events[0].minutes).toBe(60);
    expect(schedule.minutesRepaired).toBe(1);
  });

  it('missing, float, string, and negative minutes all repair to 60 on a timed row', () => {
    for (const minutes of [undefined, 45.5, '30', -5]) {
      const row: Record<string, unknown> = { ...base, start: '09:00' };
      if (minutes !== undefined) row.minutes = minutes;
      const schedule = scheduleOf(row);
      expect(schedule.events[0].minutes).toBe(60);
      expect(schedule.minutesRepaired).toBe(1);
    }
  });

  it('an all-day row repairs to 0', () => {
    const schedule = scheduleOf({ ...base, start: 'All day', minutes: null });
    expect(schedule.events[0].minutes).toBe(0);
    expect(schedule.minutesRepaired).toBe(1);
  });

  it('valid minutes pass untouched and uncounted — 0 included', () => {
    for (const minutes of [0, 30, 59]) {
      const schedule = scheduleOf({ ...base, start: '23:00', minutes });
      expect(schedule.events[0].minutes).toBe(minutes);
      expect(schedule.minutesRepaired).toBe(0);
    }
  });

  it('repairs count per row and surface in the summary', () => {
    const plan = parseStudioFileFull({
      weekOf: '2026-11-01',
      events: [
        { ...base, start: '09:00', minutes: null },
        { ...base, title: 'Late show', start: 'All day', minutes: undefined },
        { ...base, title: 'Fine row', start: '10:00', minutes: 45 },
      ],
    });
    expect(plan.schedule?.minutesRepaired).toBe(2);
    const counts = {
      ...emptyStudioApplyCounts(),
      minutesRepaired: plan.schedule?.minutesRepaired ?? 0,
    };
    expect(formatStudioImportSummary(plan, counts)).toBe(
      'Schedule: 0 events + 0 todos added · 0 already there · 2 repaired',
    );
  });

  it('the backup’s studioSchedule section repairs the same way', () => {
    const plan = parseStudioFileFull({
      studioSchedule: { events: [{ ...base, start: '09:00', minutes: null }] },
    });
    expect(plan.schedule?.events[0].minutes).toBe(60);
    expect(plan.schedule?.minutesRepaired).toBe(1);
  });

  it('a genuinely invalid OTHER field still refuses the whole file', () => {
    expect(() =>
      parseStudioFileFull({ weekOf: '2026-11-01', events: [{ ...base, start: '09:00', minutes: null, type: 'Bogus' }] }),
    ).toThrow(/Event, Todo, or Ministry/);
    expect(() =>
      parseStudioFileFull({ weekOf: '2026-11-01', events: [{ ...base, date: 'Nov 6', start: '09:00', minutes: null }] }),
    ).toThrow(/valid date/);
    expect(() =>
      parseStudioFileFull({
        weekOf: '2026-11-01',
        events: [{ ...base, start: '09:00', minutes: null, subtasks: [{ id: 's1', title: 'Step' }] }],
      }),
    ).toThrow(/completion state/);
    // …and one bad row still refuses a COMBINED file whole, sections and all.
    const file = combinedFile();
    file.events = [{ ...EVENT_ROW, type: 'Ministryy' }];
    expect(() => parseStudioFileFull(file)).toThrow(/Event, Todo, or Ministry/);
  });
});

// ── Back-compat — the five files in the field keep their meaning ────────────

describe('back-compat — single-kind packs unchanged', () => {
  it('each standalone pack plans exactly its own section', () => {
    const notes = parseStudioFileFull(CHAPTER);
    expect(notes.notes).toHaveLength(1);
    expect(notes.schedule).toBeNull();

    const schedule = parseStudioFileFull({ weekOf: '2026-10-25', events: [EVENT_ROW] });
    expect(schedule.schedule?.events).toHaveLength(1);
    expect(schedule.schedule?.minutesRepaired).toBe(0);
    expect(schedule.notes).toBeNull();

    const people = parseStudioFileFull({ people: [PERSON], journal: PEOPLE_JOURNAL });
    expect(people.people?.people).toHaveLength(1);
    expect(people.ministries).toBeNull();

    const ministries = parseStudioFileFull(MINISTRIES_SECTION);
    expect(ministries.ministries?.ministries).toHaveLength(1);
    expect(ministries.people).toBeNull();

    const library = parseStudioFileFull({
      chapters: [CHAPTER],
      studioStates: { chapters: [{ book: 'Genesis', chapter: 1, notesState: null, readDate: '2026-10-24' }] },
    });
    expect(library.notes).toHaveLength(1);
    expect(library.states?.chapters).toHaveLength(1);
  });

  it('the door wires the split counts and the repair count (source pin)', () => {
    const src = readFileSync(join(process.cwd(), 'app', '(tabs)', 'index.tsx'), 'utf8');
    expect(src).toContain('counts.scheduleEventsAdded = merged.eventsAdded');
    expect(src).toContain('counts.scheduleTodosAlreadyThere = merged.todosAlreadyThere');
    expect(src).toContain('counts.minutesRepaired = plan.schedule.minutesRepaired ?? 0');
    expect(src).toContain('counts.readMarksAlreadyThere = reads.alreadyThere');
    expect(src).toContain('formatStudioImportSummary(plan, counts)');
  });
});
