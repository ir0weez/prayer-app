// ─── v231 "One Door" — pins ────────────────────────────────────────────────
// Jonathan (Oct 24 11:57, from his Settings screenshot): three studio
// import rows — Studio / People / Ministries — because parseStudioFile
// returns ONE pack kind per file, with precedence routing. He was
// promised one door. v231: parseStudioFileFull reads a WHOLE file
// (every section it carries, standalone pack or full backup), the
// Settings screen keeps exactly one Import Studio Pack row, and the
// Drive planner consumes the same full-file plan — per-section safety
// rules (states regression-hold, schedule conflict-hold) unchanged.

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

import {
  applyStudioChapters,
  emptyStudioApplyCounts,
  formatStudioImportSummary,
  mergeStudioSchedule,
  parseStudioFile,
  parseStudioFileFull,
  studioFileHasSections,
  studioFilePlanFromPack,
} from '../bible-v205/studio-import';
import { applyStudioPeoplePack } from '../bible-v205/studio-people';
import { applyStudioMinistriesPack, collectStudioMinistries } from '../bible-v205/studio-ministries';
import { planDriveFile, planDrivePack } from '../bible-v205/drive-folder';
import { chapterReadDate, chapterStatus, seedStudyState, setChapterStatus } from '../bible-v205/study';
import { transitionChapterStatus } from '../bible-v205/rewards';
import { applyStudioStatesReads } from '../bible-v205/studio-states';
import { createScheduleMinistry, type ScheduleEvent } from '../schedule-data';

beforeEach(() => {
  store.clear();
});

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

const SCHEDULE_EVENT = {
  title: 'Evening check-in',
  day: 'Sat',
  date: '2026-10-24',
  start: '20:00',
  minutes: 30,
  type: 'Event',
  online: false,
  recur: 'none',
};

const ministry = createScheduleMinistry({ title: 'Food Bank Run', type: 'Service', date: '2026-10-31' });

/** A file carrying every section at once — a backup's sections plus a
 *  notes library, the worst case the one door has to swallow whole. */
function fullFile(): Record<string, unknown> {
  return {
    format: 'prayercircle-backup',
    version: 1,
    exportedAt: '2026-10-24T18:00:00.000Z',
    storage: {},
    chapters: [CHAPTER],
    studioStates: {
      chapters: [{ book: 'Genesis', chapter: 1, notesState: 'complete', readDate: '2026-10-24' }],
    },
    studioSchedule: { exportedAt: '2026-10-24T18:00:00.000Z', undatedExcluded: 0, events: [SCHEDULE_EVENT] },
    studioPeople: { people: [PERSON], journal: PEOPLE_JOURNAL },
    studioMinistries: collectStudioMinistries([ministry]),
  };
}

describe('parseStudioFileFull — every section, either placement', () => {
  it('detects all five sections in one file', () => {
    const plan = parseStudioFileFull(fullFile());
    expect(studioFileHasSections(plan)).toBe(true);
    expect(plan.notes).toHaveLength(1);
    expect(plan.notes?.[0]).toMatchObject({ book: 'Colossians', chapter: 1, chapterState: 'write' });
    expect(plan.states?.chapters).toEqual([
      { book: 'Genesis', chapter: 1, notesState: 'complete', readDate: '2026-10-24' },
    ]);
    // The backup section normalizes to pack shape; it has no weekOf.
    expect(plan.schedule?.weekOf).toBe('');
    expect(plan.schedule?.events).toHaveLength(1);
    expect(plan.people?.people).toHaveLength(1);
    expect(plan.people?.journal).toHaveLength(1);
    expect(plan.ministries?.ministries).toHaveLength(1);
    expect(plan.ministries?.deletedIds).toEqual([]);
  });

  it('a real backup (no notes payload — backups never carry one) still plans whole', () => {
    const file = fullFile();
    delete file.chapters;
    const plan = parseStudioFileFull(file);
    expect(plan.notes).toBeNull();
    expect(plan.states).not.toBeNull();
    expect(plan.schedule).not.toBeNull();
    expect(plan.people).not.toBeNull();
    expect(plan.ministries).not.toBeNull();
  });

  it('each single-section file behaves exactly as its pack did before', () => {
    const notes = parseStudioFileFull(CHAPTER);
    expect(notes.notes).toHaveLength(1);
    expect(notes.states).toBeNull();
    expect(notes.schedule).toBeNull();
    expect(notes.people).toBeNull();
    expect(notes.ministries).toBeNull();

    const schedule = parseStudioFileFull({ weekOf: '2026-10-25', events: [SCHEDULE_EVENT] });
    expect(schedule.schedule?.weekOf).toBe('2026-10-25');
    expect(schedule.schedule?.events).toHaveLength(1);
    expect(schedule.notes).toBeNull();

    const people = parseStudioFileFull({ people: [PERSON], journal: PEOPLE_JOURNAL });
    expect(people.people?.people).toHaveLength(1);
    expect(people.ministries).toBeNull();

    const ministriesPack = parseStudioFileFull(collectStudioMinistries([ministry]));
    expect(ministriesPack.ministries?.ministries).toHaveLength(1);
    expect(ministriesPack.people).toBeNull();

    const states = parseStudioFileFull({
      studioStates: { chapters: [{ book: 'Genesis', chapter: 1, notesState: null, readDate: '2026-10-24' }] },
    });
    expect(states.states?.chapters).toHaveLength(1);
    expect(states.notes).toBeNull();
  });

  it('a file with no studio sections at all is refused, in plain words', () => {
    expect(() => parseStudioFileFull({ unrelated: true })).toThrow(/not a studio pack/);
    expect(() => parseStudioFileFull(null)).toThrow();
    expect(() => parseStudioFileFull(42)).toThrow();
    expect(() => parseStudioFileFull({ chapters: [] })).toThrow(/no chapters/);
  });
});

describe('validate EVERYTHING first — one bad section rejects the whole file', () => {
  // The door applies nothing when the parse throws (parse precedes every
  // apply in the handler and in the Drive check), so a throw here IS
  // the nothing-applied guarantee for every section, valid ones too.
  it('a bad states section rejects a file whose other sections are fine', () => {
    const file = fullFile();
    file.studioStates = { chapters: [{ book: 'Genesis', chapter: 1, notesState: 'bogus', readDate: null }] };
    expect(() => parseStudioFileFull(file)).toThrow(/notesState/);
  });

  it('a bad ministries section rejects the whole file', () => {
    const file = fullFile();
    file.studioMinistries = { ministries: [{ ...ministry, date: '2026-02-30' }], deletedIds: [] };
    expect(() => parseStudioFileFull(file)).toThrow();
  });

  it('a bad people section rejects the whole file', () => {
    const file = fullFile();
    file.studioPeople = { people: [{ ...PERSON, relationship: 'Alien' }], journal: [] };
    expect(() => parseStudioFileFull(file)).toThrow(/relationship/);
  });

  it('a bad notes section rejects the whole file', () => {
    const file = fullFile();
    file.chapters = [
      { ...CHAPTER, notes: [{ start: 30, end: 31, kind: 'note', blocks: [{ kind: 'para', text: 'Orphan.' }] }] },
    ];
    expect(() => parseStudioFileFull(file)).toThrow(/outside every section/);
  });

  it('a bad schedule section rejects the whole file', () => {
    const file = fullFile();
    file.studioSchedule = { events: [{ ...SCHEDULE_EVENT, type: 'Ministryy' }] };
    expect(() => parseStudioFileFull(file)).toThrow(/Event, Todo, or Ministry/);
  });
});

describe('the door’s apply — every section lands, one combined summary', () => {
  it('applies notes, states, schedule, people, and ministries from one file', async () => {
    const plan = parseStudioFileFull(fullFile());
    const counts = emptyStudioApplyCounts();

    // Notes → overrides + their chapterState through the transition door.
    const applied = applyStudioChapters({}, plan.notes!);
    counts.chaptersUpdated = applied.chaptersUpdated;
    expect(applied.next['Colossians|1']).toBeDefined();

    let state = seedStudyState();
    for (const chapter of plan.notes!) {
      if (chapter.chapterState === undefined) continue;
      state = (await transitionChapterStatus(state, chapter.book, chapter.chapter, chapter.chapterState)).state;
      counts.statesSet += 1;
    }
    // States section → notes states through the same door, reads merge.
    for (const entry of plan.states!.chapters) {
      if (entry.notesState === null) continue;
      state = (await transitionChapterStatus(state, entry.book, entry.chapter, entry.notesState)).state;
      counts.statesSet += 1;
    }
    const reads = applyStudioStatesReads(state, plan.states!.chapters);
    state = reads.state;
    counts.readMarks = reads.applied;
    expect(chapterStatus(state, 'Colossians', 1)).toBe('write');
    expect(chapterStatus(state, 'Genesis', 1)).toBe('complete');
    expect(chapterReadDate(state, 'Genesis', 1)).toBe('2026-10-24');

    // Schedule → the merge, deduped as ever.
    const merged = mergeStudioSchedule([], [], plan.schedule!);
    counts.eventsAdded = merged.added;
    expect(merged.events.map((e) => e.title)).toEqual(['Evening check-in']);

    // People → the merge (upsert-only, forward-only dates).
    const peopleResult = applyStudioPeoplePack([], [], plan.people!);
    counts.peopleUpdated = peopleResult.summary.peopleUpdated;
    counts.needs = peopleResult.summary.needs;
    counts.journalEntries = peopleResult.summary.journalEntries;
    expect(peopleResult.people.map((p) => p.name)).toEqual(['Eva']);
    expect(peopleResult.journal).toHaveLength(1);

    // Ministries → upserts + tombstones.
    const ministriesResult = applyStudioMinistriesPack([], plan.ministries!);
    counts.ministriesAdded = ministriesResult.summary.added;
    counts.ministriesUpdated = ministriesResult.summary.updated;
    counts.ministriesDeleted = ministriesResult.summary.deleted;
    expect(ministriesResult.ministries.map((m) => m.title)).toEqual(['Food Bank Run']);

    // The one summary names every section the file carried.
    expect(formatStudioImportSummary(plan, counts)).toBe(
      'Notes: 1 chapters · States: 2 · Read marks: 1 · Events added: 1 · ' +
        'People updated: 1 · Ministries: 1 added / 0 updated / 0 deleted',
    );
  });

  it('the summary speaks only for the sections a file carried', () => {
    const plan = parseStudioFileFull({ people: [PERSON], journal: PEOPLE_JOURNAL });
    const counts = { ...emptyStudioApplyCounts(), peopleUpdated: 1 };
    expect(formatStudioImportSummary(plan, counts)).toBe('People updated: 1');
  });
});

describe('Drive parity — the planner consumes the same full-file plan', () => {
  it('plans all sections at once, per-section safety rules intact', () => {
    const plan = parseStudioFileFull(fullFile());
    // Genesis 1 sits at restudy in the app; the file's 'complete' is a
    // backward move — it waits, exactly as a states pack's would.
    const current = setChapterStatus(seedStudyState(), 'Genesis', 1, 'restudy');
    const drive = planDriveFile(plan, (b, c) => chapterStatus(current, b, c), [], []);
    expect(drive.notesChapters).toHaveLength(1);
    // The notes payload's own chapterState (none → write) still applies.
    expect(drive.autoStates).toEqual([{ book: 'Colossians', chapter: 1, to: 'write' }]);
    expect(drive.heldStates).toHaveLength(1);
    expect(drive.heldStates[0]).toMatchObject({ book: 'Genesis', chapter: 1, from: 'restudy', to: 'complete' });
    // The read mark rides whole, unheld.
    expect(drive.statesReads).toHaveLength(1);
    expect(drive.autoSchedule.map((e) => e.title)).toEqual(['Evening check-in']);
    expect(drive.peoplePack?.people).toHaveLength(1);
    expect(drive.ministriesPack?.ministries).toHaveLength(1);
  });

  it('a schedule conflict inside a multi-section file is still held', () => {
    const plan = parseStudioFileFull(fullFile());
    const existing: ScheduleEvent[] = [
      { id: 'e1', title: 'Family dinner', date: '2026-10-24', startTime: '20:00', endTime: '21:00' } as ScheduleEvent,
    ];
    const drive = planDriveFile(plan, () => 'none', existing, []);
    expect(drive.heldSchedule).toHaveLength(1);
    expect(drive.heldSchedule[0].conflictTitle).toBe('Family dinner');
    expect(drive.autoSchedule).toHaveLength(0);
    // The hold is per-section: the rest of the file still plans to apply.
    expect(drive.peoplePack).not.toBeNull();
    expect(drive.ministriesPack).not.toBeNull();
  });

  it('planDrivePack is planDriveFile over the one-section plan — same plan out', () => {
    const pack = parseStudioFile({
      studioStates: {
        chapters: [
          { book: 'Genesis', chapter: 1, notesState: 'write', readDate: '2026-10-24' },
          { book: 'Genesis', chapter: 2, notesState: 'in-progress', readDate: null },
        ],
      },
    });
    const current = setChapterStatus(seedStudyState(), 'Genesis', 1, 'complete');
    const viaPack = planDrivePack(pack, (b, c) => chapterStatus(current, b, c), [], []);
    const viaFile = planDriveFile(studioFilePlanFromPack(pack), (b, c) => chapterStatus(current, b, c), [], []);
    expect(viaPack).toEqual(viaFile);
    expect(viaFile.heldStates).toHaveLength(1);
  });
});

describe('surfaces — Settings keeps exactly one studio door', () => {
  const src = readFileSync(join(process.cwd(), 'app', '(tabs)', 'index.tsx'), 'utf8');

  it('one Import Studio Pack row; the People and Ministries rows are gone', () => {
    expect(src.match(/"Import Studio Pack"/g)).toHaveLength(1);
    expect(src).not.toContain('"Import People Pack"');
    expect(src).not.toContain('"Import Ministries Pack"');
    expect(src).not.toContain('handleImportPeoplePack');
    expect(src).not.toContain('handleImportMinistriesPack');
  });

  it('the one row runs the full-file door and speaks the combined summary', () => {
    expect(src).toContain('handleImportStudioPack');
    expect(src).toContain('parseStudioFileFull');
    expect(src).toContain('formatStudioImportSummary(plan, counts)');
    expect(src).toContain('one file can carry them all');
  });

  it('Import Data — the legacy whole-backup restore — stands untouched beside it', () => {
    expect(src).toContain('"Import Data"');
    expect(src).toContain('handleImportData');
    expect(src).toContain('"Export Data"');
  });
});
