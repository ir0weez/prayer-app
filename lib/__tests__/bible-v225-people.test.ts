// ─── v225 "People, Through the Door" — pins ─────────────────────────────────
// The studio People page's pack (prayercircle-people.json) comes through
// the same door as v222/v223: parseStudioFile validates EVERYTHING
// before anything is applied. The merge is upsert-only (never deletes),
// dates move forward only, kinds map to PrayerItem flags, and a need's
// longer words live as a Journal moment deduped by (personId, needId).
// Export side: the backup gains studioPeople (the pack shape) and
// studioJournal (the News feed shape).

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

import { parseStudioFile, type StudioPeoplePack } from '../bible-v205/studio-import';
import { planDrivePack } from '../bible-v205/drive-folder';
import {
  applyStudioPeoplePack,
  collectStudioJournal,
  collectStudioPeople,
  mergeStudioPeople,
  studioMomentId,
} from '../bible-v205/studio-people';
import { relationshipColors, type Person } from '../prayercircle-data';
import type { PrayerJournalEntry } from '../prayer-journal';

beforeEach(() => {
  store.clear();
});

const NOW = new Date(2026, 9, 24, 12, 0, 0);

const PEOPLE_PACK: StudioPeoplePack = {
  people: [
    {
      id: 'studio-eva',
      name: 'Eva',
      relationship: 'Family',
      reminderFrequency: 'daily',
      reminderDaysOfWeek: [],
      lastPrayerCompletedDate: '2026-10-23',
      lastReached: '2026-10-20',
      lastMeetingLocation: 'Home',
      needs: [
        {
          id: 'need-rest',
          title: 'Rest',
          more: 'Rest and fresh energy for the school week ahead.',
          kind: 'Regular',
          isDone: false,
          isEmergency: false,
          isPraised: false,
        },
        {
          id: 'need-surgery',
          title: 'Surgery',
          more: '',
          kind: 'Emergency',
          isDone: false,
          isEmergency: true,
          emergencyExpiresAt: '2026-10-25T09:00:00.000Z',
          isPraised: false,
        },
        {
          id: 'need-job',
          title: 'New job',
          more: 'Thank You, Lord.',
          kind: 'Praise',
          isDone: true,
          isEmergency: false,
          isPraised: true,
          praiseExpiresAt: '2026-10-25T09:00:00.000Z',
        },
      ],
    },
    {
      id: 'studio-cody',
      name: 'Cody',
      relationship: 'Friends',
      reminderFrequency: 'weekly',
      reminderDaysOfWeek: [2, 4],
      lastPrayerCompletedDate: null,
      lastReached: null,
      needs: [
        {
          id: 'need-car',
          title: 'Car',
          more: '',
          kind: 'Regular',
          isDone: false,
          isEmergency: false,
          isPraised: false,
        },
      ],
    },
  ],
  journal: [
    { personId: 'studio-eva', personName: 'Eva', needId: 'need-job', text: 'Thank You, Lord.', kind: 'Praise' },
  ],
};

function rawPack(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(PEOPLE_PACK)) as Record<string, unknown>;
}

function makePerson(overrides: Partial<Person>): Person {
  return {
    id: 'p1',
    name: 'Eva',
    initials: 'EV',
    relationship: 'Family',
    lastPrayedDate: null,
    lastPrayerCompletedDate: null,
    reminderDaysOfWeek: [],
    accentColor: '#7C3AED',
    avatarColor: '#A78BFA',
    prayerItems: [],
    ...overrides,
  };
}

describe('v225 — the door validates people packs whole', () => {
  it('accepts a well-formed people pack', () => {
    const pack = parseStudioFile(rawPack());
    expect(pack.kind).toBe('people');
    if (pack.kind !== 'people') throw new Error('unreachable');
    expect(pack.people.people).toHaveLength(2);
    expect(pack.people.journal).toHaveLength(1);
  });

  it('rejects an unknown relationship type', () => {
    const raw = rawPack();
    (raw.people as Record<string, unknown>[])[0].relationship = 'Cousin';
    expect(() => parseStudioFile(raw)).toThrow(/unknown relationship type/);
  });

  it('rejects bad dates', () => {
    const badReached = rawPack();
    (badReached.people as Record<string, unknown>[])[0].lastReached = '2026-13-40';
    expect(() => parseStudioFile(badReached)).toThrow(/lastReached is not a valid date/);
    const badPrayed = rawPack();
    (badPrayed.people as Record<string, unknown>[])[0].lastPrayerCompletedDate = '10/23/2026';
    expect(() => parseStudioFile(badPrayed)).toThrow(/lastPrayerCompletedDate is not a valid date/);
    const badExpiry = rawPack();
    const needs = (badExpiry.people as Record<string, unknown>[])[0].needs as Record<string, unknown>[];
    needs[1].emergencyExpiresAt = 'tomorrow';
    expect(() => parseStudioFile(badExpiry)).toThrow(/bad emergencyExpiresAt date/);
  });

  it('rejects a need kind outside Regular / Praise / Emergency, and a missing kind', () => {
    const badKind = rawPack();
    ((badKind.people as Record<string, unknown>[])[0].needs as Record<string, unknown>[])[0].kind = 'Urgent';
    expect(() => parseStudioFile(badKind)).toThrow(/kind must be Regular, Praise, or Emergency/);
    const noKind = rawPack();
    delete ((noKind.people as Record<string, unknown>[])[0].needs as Record<string, unknown>[])[0].kind;
    expect(() => parseStudioFile(noKind)).toThrow(/kind must be Regular, Praise, or Emergency/);
  });

  it('rejects wrong shapes: duplicate ids, non-boolean flags, a non-list journal', () => {
    const dupPerson = rawPack();
    (dupPerson.people as Record<string, unknown>[])[1].id = 'studio-eva';
    expect(() => parseStudioFile(dupPerson)).toThrow(/twice/);
    const dupNeed = rawPack();
    ((dupNeed.people as Record<string, unknown>[])[0].needs as Record<string, unknown>[])[1].id = 'need-rest';
    expect(() => parseStudioFile(dupNeed)).toThrow(/duplicate need id/);
    const badFlag = rawPack();
    ((badFlag.people as Record<string, unknown>[])[0].needs as Record<string, unknown>[])[0].isDone = 'yes';
    expect(() => parseStudioFile(badFlag)).toThrow(/isDone must be true or false/);
    const badJournal = rawPack();
    badJournal.journal = 'later';
    expect(() => parseStudioFile(badJournal)).toThrow(/journal is not a list/);
    expect(() => parseStudioFile({ people: 'everyone' })).toThrow(/not a studio pack/);
  });
});

describe('v225 — the merge: upsert only, dates forward only', () => {
  it('creates new people with app defaults, lastReached landing on lastPrayedDate', () => {
    const { people } = mergeStudioPeople([], PEOPLE_PACK);
    const eva = people.find((p) => p.id === 'studio-eva');
    expect(eva).toBeDefined();
    expect(eva?.initials).toBe('E'); // the app's own derivation: first letter per name word
    expect(eva?.avatarColor).toBe(relationshipColors.Family.avatar);
    expect(eva?.accentColor).toBe(relationshipColors.Family.accent);
    expect(eva?.lastPrayedDate).toBe('2026-10-20');
    expect(eva?.lastPrayerCompletedDate).toBe('2026-10-23');
    expect(eva?.lastMeetingLocation).toBe('Home');
    expect(eva?.reminderFrequency).toBe('daily');
    const cody = people.find((p) => p.id === 'studio-cody');
    expect(cody?.reminderDaysOfWeek).toEqual([2, 4]);
    expect(cody?.lastPrayedDate).toBeNull();
  });

  it('maps kinds to PrayerItem flags (Emergency ⇒ urgent + expiry, Praise ⇒ praised + expiry)', () => {
    const { people } = mergeStudioPeople([], PEOPLE_PACK);
    const items = people.find((p) => p.id === 'studio-eva')?.prayerItems ?? [];
    const rest = items.find((i) => i.id === 'need-rest');
    expect(rest?.isEmergency).toBeUndefined();
    expect(rest?.isPraised).toBeUndefined();
    expect(rest?.isUrgent).toBe(false);
    const surgery = items.find((i) => i.id === 'need-surgery');
    expect(surgery?.isEmergency).toBe(true);
    expect(surgery?.isUrgent).toBe(true);
    expect(surgery?.emergencyExpiresAt).toBe('2026-10-25T09:00:00.000Z');
    const job = items.find((i) => i.id === 'need-job');
    expect(job?.isPraised).toBe(true);
    expect(job?.praiseExpiresAt).toBe('2026-10-25T09:00:00.000Z');
    expect(job?.isDone).toBe(true);
  });

  it('matches by id, then by exact name (keeping the app id), and never deletes', () => {
    const existing: Person[] = [
      makePerson({
        id: 'studio-eva',
        name: 'Eva R.',
        prayerItems: [{ id: 'app-only-need', title: 'Kept', isUrgent: false, isDone: false }],
      }),
      makePerson({ id: 'app-cody', name: 'Cody', relationship: 'Friends' }),
      makePerson({ id: 'app-mom', name: 'Mom', relationship: 'Family' }),
    ];
    const { people, idMap } = mergeStudioPeople(existing, PEOPLE_PACK);
    expect(people).toHaveLength(3);
    const eva = people.find((p) => p.id === 'studio-eva');
    expect(eva?.name).toBe('Eva');
    expect(eva?.prayerItems.some((i) => i.id === 'app-only-need')).toBe(true);
    expect(eva?.prayerItems.some((i) => i.id === 'need-rest')).toBe(true);
    const cody = people.find((p) => p.id === 'app-cody');
    expect(cody?.prayerItems.some((i) => i.id === 'need-car')).toBe(true);
    expect(idMap['studio-cody']).toBe('app-cody');
    expect(people.some((p) => p.id === 'app-mom')).toBe(true);
  });

  it('never moves a date backward, and a missing location never erases one', () => {
    const existing: Person[] = [
      makePerson({
        id: 'studio-eva',
        lastPrayedDate: '2026-10-22',
        lastPrayerCompletedDate: '2026-10-24',
        lastMeetingLocation: 'Coffee shop',
      }),
    ];
    const pack: StudioPeoplePack = {
      people: [
        {
          id: 'studio-eva',
          name: 'Eva',
          relationship: 'Family',
          lastPrayerCompletedDate: '2026-10-23',
          lastReached: '2026-10-20',
          needs: [],
        },
      ],
      journal: [],
    };
    const { people } = mergeStudioPeople(existing, pack);
    expect(people[0].lastPrayedDate).toBe('2026-10-22');
    expect(people[0].lastPrayerCompletedDate).toBe('2026-10-24');
    expect(people[0].lastMeetingLocation).toBe('Coffee shop');
    // And forward motion still lands.
    const forward: StudioPeoplePack = {
      people: [{ ...pack.people[0], lastReached: '2026-10-24', lastPrayerCompletedDate: '2026-10-24' }],
      journal: [],
    };
    const again = mergeStudioPeople(people, forward);
    expect(again.people[0].lastPrayedDate).toBe('2026-10-24');
  });
});

describe('v225 — journal moments: the "more" text, deduped by (personId, needId)', () => {
  it('creates moments from need "more" text AND the journal list — as one moment per pair', () => {
    const { journal, summary } = applyStudioPeoplePack([], [], PEOPLE_PACK, NOW);
    const rest = journal.find((e) => e.id === studioMomentId('studio-eva', 'need-rest'));
    expect(rest?.body).toBe('Rest and fresh energy for the school week ahead.');
    expect(rest?.taggedPeople[0]?.id).toBe('studio-eva');
    expect(rest?.taggedPeople[0]?.name).toBe('Eva');
    // need-job has BOTH an explicit journal entry and a "more" — one moment.
    const jobMoments = journal.filter((e) => e.id === studioMomentId('studio-eva', 'need-job'));
    expect(jobMoments).toHaveLength(1);
    expect(jobMoments[0].body).toBe('Thank You, Lord.');
    expect(summary).toEqual({ peopleUpdated: 2, needs: 4, journalEntries: 2 });
  });

  it('re-import updates the moment instead of duplicating it', () => {
    const first = applyStudioPeoplePack([], [], PEOPLE_PACK, NOW);
    const changed: StudioPeoplePack = JSON.parse(JSON.stringify(PEOPLE_PACK)) as StudioPeoplePack;
    changed.people[0].needs[0].more = 'Even more rest than that.';
    const second = applyStudioPeoplePack(first.people, first.journal, changed, NOW);
    const moments = second.journal.filter((e) => e.id === studioMomentId('studio-eva', 'need-rest'));
    expect(moments).toHaveLength(1);
    expect(moments[0].body).toBe('Even more rest than that.');
    expect(second.journal).toHaveLength(first.journal.length);
  });

  it('resolves journal entries through the id map when the app person matched by name', () => {
    const existing: Person[] = [makePerson({ id: 'app-cody', name: 'Cody', relationship: 'Friends' })];
    const pack: StudioPeoplePack = {
      people: [
        {
          id: 'studio-cody',
          name: 'Cody',
          relationship: 'Friends',
          needs: [{ id: 'need-car', title: 'Car', more: '', kind: 'Regular', isDone: false, isEmergency: false, isPraised: false }],
        },
      ],
      journal: [{ personId: 'studio-cody', needId: 'need-car', text: 'Provision for the car.', kind: 'Regular' }],
    };
    const { journal } = applyStudioPeoplePack(existing, [], pack, NOW);
    const moment = journal.find((e) => e.id === studioMomentId('app-cody', 'need-car'));
    expect(moment?.body).toBe('Provision for the car.');
    expect(moment?.taggedPeople[0]?.id).toBe('app-cody');
  });

  it('throws (applying nothing) when a journal entry matches nobody', () => {
    const pack: StudioPeoplePack = {
      people: [],
      journal: [{ personId: 'nobody', personName: 'Ghost', needId: 'n1', text: 'Hello?', kind: 'Regular' }],
    };
    expect(() => applyStudioPeoplePack([], [], pack, NOW)).toThrow(/does not match anyone/);
  });
});

describe('v225 — the Drive path reuses the same door', () => {
  it('plans a people pack as a whole-pack merge with nothing held', () => {
    const pack = parseStudioFile(rawPack());
    const plan = planDrivePack(pack, () => 'none', [], []);
    expect(plan.peoplePack?.people).toHaveLength(2);
    expect(plan.heldStates).toHaveLength(0);
    expect(plan.heldSchedule).toHaveLength(0);
    expect(plan.autoSchedule).toHaveLength(0);
  });

  it('the drive module applies people packs through studio-people and journals the merge-only note', () => {
    const src = readFileSync(join(process.cwd(), 'lib', 'bible-v205', 'drive-folder.ts'), 'utf8');
    expect(src).toContain('applyStudioPeoplePack');
    expect(src).toContain('loadStoredPeople');
    expect(src).toContain('People pack — merge only: nothing deleted, dates move forward only');
  });

  it('the journal record carries the note through a JSON round-trip', () => {
    const record = {
      signature: 'prayercircle-people.json|abcd1234',
      applied: 7,
      held: 0,
      skipped: false,
      note: 'People pack — merge only: nothing deleted, dates move forward only',
      checkedAt: '2026-10-24T12:00:00.000Z',
    };
    const back = JSON.parse(JSON.stringify(record)) as typeof record;
    expect(back.note).toBe(record.note);
  });
});

describe('v225 — export: studioPeople + studioJournal', () => {
  const appPeople: Person[] = [
    makePerson({
      id: 'p-eva',
      name: 'Eva',
      lastPrayedDate: '2026-10-20',
      lastPrayerCompletedDate: '2026-10-23',
      lastMeetingLocation: 'Home',
      reminderFrequency: 'daily',
      prayerItems: [
        { id: 'n-rest', title: 'Rest', isUrgent: false, isDone: false },
        {
          id: 'n-surgery',
          title: 'Surgery',
          isUrgent: true,
          isDone: false,
          isEmergency: true,
          emergencyExpiresAt: '2026-10-25T09:00:00.000Z',
        },
      ],
    }),
    makePerson({
      id: 'p-cody',
      name: 'Cody',
      relationship: 'Friends',
      reminderFrequency: 'weekly',
      reminderDaysOfWeek: [2, 4],
      prayerItems: [{ id: 'n-car', title: 'Car', isUrgent: false, isDone: false }],
    }),
  ];
  const appJournal: PrayerJournalEntry[] = [
    {
      id: studioMomentId('p-eva', 'n-rest'),
      body: 'Rest and fresh energy.',
      date: '2026-10-24',
      taggedPeople: [{ id: 'p-eva', name: 'Eva', initials: 'EV', avatarColor: '#A78BFA', accentColor: '#7C3AED' }],
      isBookmarked: false,
      replies: [],
      createdAt: '2026-10-24T12:00:00.000Z',
      updatedAt: '2026-10-24T12:00:00.000Z',
    },
    {
      id: 'ordinary-moment',
      body: 'A walk in the garden.',
      date: '2026-10-24',
      taggedPeople: [],
      isBookmarked: false,
      replies: [],
      createdAt: '2026-10-24T13:00:00.000Z',
      updatedAt: '2026-10-24T13:00:00.000Z',
    },
  ];

  it('serializes people in the pack shape (lastReached read back out of lastPrayedDate)', () => {
    const pack = collectStudioPeople(appPeople, appJournal);
    const eva = pack.people.find((p) => p.id === 'p-eva');
    expect(eva?.lastReached).toBe('2026-10-20');
    expect(eva?.lastPrayerCompletedDate).toBe('2026-10-23');
    expect(eva?.lastMeetingLocation).toBe('Home');
    const rest = eva?.needs.find((n) => n.id === 'n-rest');
    expect(rest?.kind).toBe('Regular');
    expect(rest?.more).toBe('Rest and fresh energy.');
    const surgery = eva?.needs.find((n) => n.id === 'n-surgery');
    expect(surgery?.kind).toBe('Emergency');
    expect(surgery?.isEmergency).toBe(true);
    // Only need-linked moments ride the pack's journal — ordinary moments don't.
    expect(pack.journal).toHaveLength(1);
    expect(pack.journal[0]).toEqual({
      personId: 'p-eva',
      personName: 'Eva',
      needId: 'n-rest',
      text: 'Rest and fresh energy.',
      kind: 'Regular',
    });
  });

  it('round-trips: export → import into an empty store → export is the same pack', () => {
    const pack1 = collectStudioPeople(appPeople, appJournal);
    const applied = applyStudioPeoplePack([], [], pack1, NOW);
    const eva = applied.people.find((p) => p.id === 'p-eva');
    expect(eva?.lastPrayedDate).toBe('2026-10-20');
    expect(eva?.prayerItems.find((i) => i.id === 'n-surgery')?.isEmergency).toBe(true);
    const pack2 = collectStudioPeople(applied.people, applied.journal);
    expect(pack2).toEqual(pack1);
  });

  it('serializes the journal feed: day, headline, body, first tagged person, kind', () => {
    const feed = collectStudioJournal([
      {
        id: 'm-photo',
        title: 'Garden morning',
        body: 'The roses are back.',
        date: '2026-10-24',
        taggedPeople: [{ id: 'p-eva', name: 'Eva', initials: 'EV', avatarColor: '#A78BFA', accentColor: '#7C3AED' }],
        photos: ['file:///rose.jpg'],
        isBookmarked: false,
        replies: [],
        createdAt: '2026-10-24T08:00:00.000Z',
        updatedAt: '2026-10-24T08:00:00.000Z',
      },
      {
        id: 'm-mood',
        body: '',
        date: '2026-10-24',
        taggedPeople: [],
        mood: { id: 'grateful', intensity: 2 },
        isBookmarked: false,
        replies: [],
        createdAt: '2026-10-24T09:00:00.000Z',
        updatedAt: '2026-10-24T09:00:00.000Z',
      },
      {
        id: 'm-note',
        body: 'A quiet note.',
        date: '2026-10-23',
        taggedPeople: [],
        isBookmarked: false,
        replies: [],
        createdAt: '2026-10-23T09:00:00.000Z',
        updatedAt: '2026-10-23T09:00:00.000Z',
      },
    ]);
    expect(feed.map((f) => f.id)).toEqual(['m-mood', 'm-photo', 'm-note']);
    expect(feed[1]).toEqual({
      id: 'm-photo',
      date: '2026-10-24',
      title: 'Garden morning',
      text: 'The roses are back.',
      personId: 'p-eva',
      personName: 'Eva',
      kind: 'photo',
    });
    expect(feed[0].kind).toBe('mood');
    expect(feed[0].text).toBe('');
    expect(feed[2]).toEqual({ id: 'm-note', date: '2026-10-23', text: 'A quiet note.', kind: 'note' });
  });
});

describe('v225 — the DATA screen wiring (source pins)', () => {
  const src = readFileSync(join(process.cwd(), 'app', '(tabs)', 'index.tsx'), 'utf8');

  it('has an Import People Pack row with its own handler and the plain summary', () => {
    expect(src).toContain('Import People Pack');
    expect(src).toContain('handleImportPeoplePack');
    expect(src).toContain('applyStudioPeoplePack');
    expect(src).toContain('People updated: ${result.summary.peopleUpdated} · Needs: ${result.summary.needs} · Journal entries: ${result.summary.journalEntries}');
  });

  it('the backup payload carries studioPeople and studioJournal sections', () => {
    expect(src).toContain('collectStudioPeople');
    expect(src).toContain('collectStudioJournal');
    expect(src).toContain('studioPeople, studioJournal');
  });

  it('the drive journal list renders the per-file note', () => {
    expect(src).toContain('record.note');
  });
});
