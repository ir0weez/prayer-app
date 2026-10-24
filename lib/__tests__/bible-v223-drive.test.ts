// ─── v223 "Drive, On Its Own" — pins ─────────────────────────────────────────
// The SAF folder reader (Android-first, no Drive API/OAuth/server) plus
// Jonathan's six safety rules and the studio quote-kind mapping:
//  1. READ-ONLY on the folder (source pin: no mutating folder calls).
//  2. VALIDATE BEFORE APPLYING (v222's door, reused — malformed rejected).
//  3. SIGNATURE DEDUPE (name + content hash).
//  4. ADDITIVE-ONLY auto-apply (marks/prayer/streak/game never touched).
//  5. REVIEW-HOLD for regressions (backward states, schedule conflicts).
//  6. VISIBLE JOURNAL (last check + per-file counts, round-tripped).
// Plus: studio `quote` notes render attributed in-app, author preserved.

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
  DRIVE_HELD_KEY,
  DRIVE_JOURNAL_KEY,
  driveSignature,
  emptyJournal,
  hashText,
  heldItemLabel,
  isBackwardMove,
  planDrivePack,
  STATUS_RANK,
} from '../bible-v205/drive-folder';
import {
  convertStudioChapter,
  mergeStudioSchedule,
  parseStudioFile,
  type StudioChapterPayload,
} from '../bible-v205/studio-import';
import { getChapterData } from '../bible-v205/index';
import type { ScheduleEvent, ScheduleTodo } from '../schedule-data';

beforeEach(() => {
  store.clear();
});

const ROOT = join(__dirname, '..');

function notesPack(chapters: StudioChapterPayload[]) {
  return { kind: 'notes' as const, chapters };
}

function chapter(
  book: string,
  ch: number,
  chapterState: StudioChapterPayload['chapterState'],
  notes: StudioChapterPayload['notes'] = [],
): StudioChapterPayload {
  return {
    book,
    chapter: ch,
    opener: { kind: 'previously', text: 'In our last chapter…' },
    sections: [{ start: 1, end: 5, title: null, entries: [{ start: 1, end: 5 }] }],
    notes,
    ...(chapterState ? { chapterState } : {}),
  };
}

describe('Rule 3 — signature dedupe', () => {
  it('is deterministic and changes with content or name', () => {
    expect(driveSignature('a.json', 'hello')).toBe(driveSignature('a.json', 'hello'));
    expect(driveSignature('a.json', 'hello')).not.toBe(driveSignature('a.json', 'hell0'));
    expect(driveSignature('a.json', 'hello')).not.toBe(driveSignature('b.json', 'hello'));
    expect(hashText('')).toBe('811c9dc5');
  });
});

describe('Rule 5 — backward moves are held, forward moves auto-apply', () => {
  it('ranks progress none/not-started < write < in-progress < complete < restudy', () => {
    expect(STATUS_RANK['none']).toBe(0);
    expect(STATUS_RANK['not-started']).toBe(0);
    expect(STATUS_RANK.write).toBe(1);
    expect(STATUS_RANK['in-progress']).toBe(2);
    expect(STATUS_RANK.complete).toBe(3);
    expect(STATUS_RANK.restudy).toBe(4);
  });

  it('holds regressions, passes forward moves and same-state re-imports', () => {
    expect(isBackwardMove('complete', 'write')).toBe(true);
    expect(isBackwardMove('complete', 'in-progress')).toBe(true);
    expect(isBackwardMove('in-progress', 'write')).toBe(true);
    expect(isBackwardMove('restudy', 'complete')).toBe(true);
    expect(isBackwardMove('write', 'complete')).toBe(false);
    expect(isBackwardMove('complete', 'restudy')).toBe(false);
    expect(isBackwardMove('complete', 'complete')).toBe(false);
    expect(isBackwardMove('none', 'complete')).toBe(false);
  });

  it('plans a mixed pack: notes always auto, regressing state held, forward state auto', () => {
    const pack = notesPack([
      chapter('Colossians', 1, 'write', [
        { start: 1, end: 2, kind: 'note', blocks: [{ kind: 'para', text: 'His words here.' }] },
      ]),
      chapter('Leviticus', 19, 'in-progress'),
    ]);
    const current = (book: string, ch: number) =>
      book === 'Colossians' ? 'none' : book === 'Leviticus' ? 'complete' : 'none';
    const plan = planDrivePack(pack, current, [], []);
    // Notes auto-apply even though Leviticus's state is held.
    expect(plan.notesChapters).toHaveLength(2);
    expect(plan.autoStates).toEqual([{ book: 'Colossians', chapter: 1, to: 'write' }]);
    expect(plan.heldStates).toHaveLength(1);
    expect(plan.heldStates[0]).toMatchObject({ book: 'Leviticus', chapter: 19, from: 'complete', to: 'in-progress' });
    expect(heldItemLabel(plan.heldStates[0])).toContain('Leviticus 19');
  });
});

describe('Rule 5 — schedule conflicts are held, dedupes skipped, new events auto', () => {
  const existing: ScheduleEvent[] = [
    { id: 'e1', title: 'Morning rundown', date: '2026-10-26', startTime: '09:00', endTime: '09:30' } as ScheduleEvent,
  ];
  const todos: ScheduleTodo[] = [];

  it('holds a different title on an occupied slot, skips the identical event, passes new ones', () => {
    const pack = {
      kind: 'schedule' as const,
      schedule: {
        weekOf: '2026-10-25',
        events: [
          { title: 'Morning rundown', day: 'Mon', date: '2026-10-26', start: '09:00', minutes: 30, type: 'Event' as const, online: false, recur: 'none' },
          { title: 'Commentary writing — Genesis 2', day: 'Mon', date: '2026-10-26', start: '09:00', minutes: 60, type: 'Event' as const, online: false, recur: 'none' },
          { title: 'Evening check-in', day: 'Mon', date: '2026-10-26', start: '20:00', minutes: 30, type: 'Event' as const, online: false, recur: 'none' },
        ],
      },
    };
    const plan = planDrivePack(pack, () => 'none', existing, todos);
    expect(plan.skippedSchedule).toBe(1);
    expect(plan.heldSchedule).toHaveLength(1);
    expect(plan.heldSchedule[0].conflictTitle).toBe('Morning rundown');
    expect(heldItemLabel(plan.heldSchedule[0])).toContain('Commentary writing — Genesis 2');
    expect(plan.autoSchedule).toHaveLength(1);
    expect(plan.autoSchedule[0].title).toBe('Evening check-in');
  });
});

describe('v224 — a Drive check maps notes + location through the same shared door', () => {
  it('parses a pack carrying notes/location, plans it, and merges with both fields mapped', () => {
    // The exact sequence checkDriveFolder runs: parse → plan → merge.
    const pack = parseStudioFile({
      weekOf: '2026-10-25',
      events: [
        {
          title: 'Commentary writing — Genesis 2',
          day: 'Tue',
          date: '2026-10-27',
          start: '11:00',
          minutes: 60,
          type: 'Event',
          online: true,
          recur: 'none',
          notes: 'Bring the Exodus setup pages',
          location: 'The booth',
        },
      ],
    });
    const plan = planDrivePack(pack, () => 'none', [], []);
    expect(plan.autoSchedule).toHaveLength(1);
    expect(plan.autoSchedule[0].notes).toBe('Bring the Exodus setup pages');
    expect(plan.autoSchedule[0].location).toBe('The booth');
    const merged = mergeStudioSchedule([], [], {
      weekOf: '2026-10-25',
      events: plan.autoSchedule,
    });
    expect(merged.added).toBe(1);
    expect(merged.events[0].notes).toBe('Bring the Exodus setup pages');
    expect(merged.events[0].location).toBe('The booth');
  });
});

describe('Rule 1 — the folder module never mutates the folder', () => {
  it('contains no folder-mutating folder calls, only list/read/ask calls', () => {
    const src = readFileSync(join(ROOT, 'bible-v205', 'drive-folder.ts'), 'utf8');
    for (const forbidden of [
      '.createFileAsync(',
      '.makeDirectoryAsync(',
      '.writeAsStringAsync(',
      '.deleteAsync(',
      '.moveAsync(',
      '.copyAsync(',
    ]) {
      expect(src).not.toContain(forbidden);
    }
    expect(src).toContain('requestDirectoryPermissionsAsync');
    expect(src).toContain('readDirectoryAsync');
    expect(src).toContain('readAsStringAsync');
  });
});

describe('Rule 2 — malformed packs are rejected whole by the reused door', () => {
  it('rejects an unknown book, an out-of-range chapter, and a note outside every section', () => {
    const base = {
      opener: { kind: 'previously' as const, text: 'In our last chapter…' },
      sections: [{ start: 1, end: 5, title: null, entries: [{ start: 1, end: 5 }] }],
      notes: [],
    };
    expect(() => parseStudioFile({ ...base, book: 'Nope', chapter: 1 })).toThrow();
    expect(() => parseStudioFile({ ...base, book: 'Genesis', chapter: 999 })).toThrow();
    expect(() =>
      parseStudioFile({
        ...base,
        book: 'Genesis',
        chapter: 1,
        notes: [{ start: 40, end: 41, kind: 'note', blocks: [{ kind: 'para', text: 'Lost words' }] }],
      }),
    ).toThrow(/outside every section/);
  });
});

describe('Rule 6 — the journal round-trips', () => {
  it('empty journal serializes and parses back with its keys', () => {
    const journal = emptyJournal();
    journal.lastCheckAt = '2026-10-24T06:00:00.000Z';
    journal.files['prayercircle-notes.json'] = {
      signature: 'prayercircle-notes.json|abcdef01',
      applied: 2,
      held: 1,
      skipped: false,
      checkedAt: '2026-10-24T06:00:00.000Z',
    };
    const roundTripped = JSON.parse(JSON.stringify(journal));
    expect(roundTripped.lastCheckAt).toBe('2026-10-24T06:00:00.000Z');
    expect(roundTripped.files['prayercircle-notes.json'].applied).toBe(2);
    expect(roundTripped.files['prayercircle-notes.json'].held).toBe(1);
    expect(DRIVE_JOURNAL_KEY).toBe('prayercircle.bible.v205.drive-journal.v1');
    expect(DRIVE_HELD_KEY).toBe('prayercircle.bible.v205.drive-held.v1');
  });
});

describe('studio quote kind — attributed in-app, never a plain note', () => {
  const quotePack = {
    book: 'Colossians',
    chapter: 1,
    opener: { kind: 'previously' as const, text: 'In our last chapter…' },
    sections: [{ start: 1, end: 5, title: null, entries: [{ start: 1, end: 5 }] }],
    notes: [
      {
        start: 1,
        end: 2,
        kind: 'quote' as const,
        author: 'Vernon McGee',
        blocks: [{ kind: 'para' as const, text: 'Grace upon grace.' }],
      },
    ],
  };

  it('parses a quote note with its author attached', () => {
    const pack = parseStudioFile(quotePack);
    expect(pack.kind).toBe('notes');
    if (pack.kind !== 'notes') return;
    expect(pack.chapters[0].notes[0].kind).toBe('quote');
    expect(pack.chapters[0].notes[0].author).toBe('Vernon McGee');
  });

  it('converts a quote note to attributed quote blocks, preserved through a JSON round-trip', () => {
    const converted = convertStudioChapter(quotePack, getChapterData('Colossians', 1));
    const quoteBlocks = converted.sections.flatMap((s) => s.entries.flatMap((e) => e.blocks)).filter((b) => b.kind === 'quote');
    expect(quoteBlocks.length).toBeGreaterThan(0);
    expect(quoteBlocks[0].authorName).toBe('Vernon McGee');
    expect(quoteBlocks[0].text).toBe('Grace upon grace.');
    const roundTripped = JSON.parse(JSON.stringify(converted));
    const again = roundTripped.sections.flatMap((s: { entries: { blocks: { kind: string; authorName?: string }[] }[] }) =>
      s.entries.flatMap((e) => e.blocks),
    ).filter((b: { kind: string }) => b.kind === 'quote');
    expect(again[0].authorName).toBe('Vernon McGee');
  });

  it('renders quote blocks with the author shown (BlockView branch pin)', () => {
    const src = readFileSync(join(ROOT, '..', 'components', 'bible-v205', 'blocks.tsx'), 'utf8');
    expect(src).toContain("block.kind === 'quote'");
    expect(src).toContain('block.authorName');
    expect(src).toContain('Quote —');
  });
});
