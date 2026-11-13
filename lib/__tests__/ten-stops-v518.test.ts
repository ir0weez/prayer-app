// ─── v518 — Ten Stops: 1 Samuel and 2 Samuel registered (the sixth
// and seventh tours) ───────────────────────────────────────────────────────
// Both Samuel books join the registry in exactly the v508/v511/
// v516 shape, registered together the way Genesis and Deuteronomy
// were in v508: NotebookLM Deep Dive tours of Jonathan's own
// commentary notes, from the stop lists he approved on
// 2026-11-12 (the daily check-in sessions' verdicts on his best
// writing — for 1 Samuel all ten earned their seats on session
// singling-out, and for 2 Samuel every chapter of the book earned
// one, so the ten stand on merit with ranked reserves behind
// them) — generated, verified against their own transcripts
// stop-by-stop in order, then hosted in the ten-stops-library
// release at the exact byte sizes pinned here. Everything the
// registry drives — the book pages' cards, the downloads home,
// the v507 chapter indicators — lights up for both books from
// the registry alone, and each session carries its transcript
// (326 and 388 segments) for the player's follow-along, pinned
// at the model level here; the 1 Samuel render is pinned in
// ten-stops-v518-listen.test.tsx.
//
// Both books' stops sit in distinct chapters (unlike Ruth's
// shared seats), so each chapter map is one stop per chapter —
// the parse handles the books' own numerals ("1 Samuel 28:3-6"
// reads chapter 28, never chapter 1) because the passage parser
// anchors on the LAST colon group.

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { formatClock } from '../devotionals';
import { getTenStops, tenStopsAsDevotional, tenStopsRegistry, type TenStops } from '../ten-stops';
import {
  activeTenStopsTranscriptSegment,
  tenStopsTranscript,
  tenStopsTranscriptRows,
} from '../ten-stops-transcripts';
import {
  stopMarkForChapter,
  stopMarksForChapter,
  tenStopChapterMap,
  tenStopMarks,
} from '../ten-stops-indicator';
import { bookColorsFor } from '../bible-v205/book-colors';
import {
  resetTenStopsDownloadsForTests,
  setTenStopsFileSystemForTests,
  type TenStopsFileSystem,
} from '../ten-stops-download';
import { refreshDownloads, resetDownloadsForTests } from '../downloads';

const HEBREWS = getTenStops('Hebrews')!;
const GENESIS = getTenStops('Genesis')!;
const DEUTERONOMY = getTenStops('Deuteronomy')!;
const JOSHUA = getTenStops('Joshua')!;
const RUTH = getTenStops('Ruth')!;
const FIRST_SAMUEL = getTenStops('1 Samuel')!;
const SECOND_SAMUEL = getTenStops('2 Samuel')!;

// The stops exactly as the tours' stops.json files carry them
// (read from ~/workspace/devotionals/transcripts/{1,2}samuel-
// ten-stops/stops.json — the announcement seconds of the
// verified runs).
const FIRST_SAMUEL_STOPS = [
  { title: "Hannah's Prayer", passage: '1 Samuel 1:1-18', startSec: 102.2 },
  { title: "Eli's Evil Sons", passage: '1 Samuel 2:12-17', startSec: 181.3 },
  { title: 'The Call of Samuel', passage: '1 Samuel 3:1-21', startSec: 248.0 },
  { title: 'The Ark Captured', passage: '1 Samuel 4:1-11', startSec: 332.8 },
  { title: "Saul's Schedule", passage: '1 Samuel 10:1-8', startSec: 401.7 },
  { title: 'The Choice Between Seeking and Forsaking', passage: '1 Samuel 12:19-25', startSec: 477.8 },
  { title: 'Saul Pleads With Samuel', passage: '1 Samuel 15:24-31', startSec: 534.9 },
  { title: 'David Asks to Fight', passage: '1 Samuel 17:31-40', startSec: 588.6 },
  { title: 'David Requests Peace', passage: '1 Samuel 24:8-15', startSec: 652.9 },
  { title: 'Facing the Philistines', passage: '1 Samuel 28:3-6', startSec: 716.1 },
];

const SECOND_SAMUEL_STOPS = [
  { title: 'Weeping Over the Lost', passage: '2 Samuel 1:11-16', startSec: 99.7 },
  { title: 'A Second Battle', passage: '2 Samuel 5:22-25', startSec: 222.4 },
  { title: 'A Proper Worship', passage: '2 Samuel 6:20-23', startSec: 312.1 },
  { title: "David's Prayer", passage: '2 Samuel 7:18-29', startSec: 390.3 },
  { title: 'Accepted Instantly', passage: '2 Samuel 9:9-13', startSec: 450.1 },
  { title: "The Child's Death", passage: '2 Samuel 12:16-23', startSec: 529.0 },
  { title: 'Absalom Is Angry', passage: '2 Samuel 13:20-22', startSec: 597.9 },
  { title: 'Absalom and Hushai', passage: '2 Samuel 16:15-19', startSec: 651.9 },
  { title: 'Shimei Forgiven', passage: '2 Samuel 19:21-23', startSec: 717.3 },
  { title: 'A Worthy Sacrifice', passage: '2 Samuel 24:18-25', startSec: 776.6 },
];

// ─── The registry holds seven tours ─────────────────────────────────────────

describe('v518 Ten Stops registry — seven tours', () => {
  it('exactly seven, 1 Samuel and 2 Samuel appended after Ruth, Hebrews still first', () => {
    const all = tenStopsRegistry();
    expect(all.length).toBe(7);
    expect(all.map((e) => e.book)).toEqual([
      'Hebrews',
      'Genesis',
      'Deuteronomy',
      'Joshua',
      'Ruth',
      '1 Samuel',
      '2 Samuel',
    ]);
    expect(all[0].book).toBe('Hebrews');
  });

  it('1 Samuel at its hosted facts', () => {
    expect(FIRST_SAMUEL.title).toBe('Ten Stops in 1 Samuel');
    expect(FIRST_SAMUEL.fileName).toBe('1samuel-ten-stops.m4a');
    expect(FIRST_SAMUEL.sizeBytes).toBe(4726980);
    expect(FIRST_SAMUEL.durationSec).toBe(853);
    expect(formatClock(FIRST_SAMUEL.durationSec)).toBe('14:13');
    const url = new URL(FIRST_SAMUEL.url);
    expect(url.host).toBe('github.com');
    expect(url.pathname).toBe(
      '/ir0weez/prayer-app/releases/download/ten-stops-library/1samuel-ten-stops.m4a',
    );
  });

  it('2 Samuel at its hosted facts', () => {
    expect(SECOND_SAMUEL.title).toBe('Ten Stops in 2 Samuel');
    expect(SECOND_SAMUEL.fileName).toBe('2samuel-ten-stops.m4a');
    expect(SECOND_SAMUEL.sizeBytes).toBe(4952875);
    expect(SECOND_SAMUEL.durationSec).toBe(893);
    expect(formatClock(SECOND_SAMUEL.durationSec)).toBe('14:53');
    const url = new URL(SECOND_SAMUEL.url);
    expect(url.host).toBe('github.com');
    expect(url.pathname).toBe(
      '/ir0weez/prayer-app/releases/download/ten-stops-library/2samuel-ten-stops.m4a',
    );
  });

  it('1 Samuel carries exactly the transcript’s ten stops', () => {
    expect(FIRST_SAMUEL.movements).toEqual(FIRST_SAMUEL_STOPS);
    expect(FIRST_SAMUEL.movements[0].startSec).toBe(102.2);
    expect(FIRST_SAMUEL.movements[9].startSec).toBe(716.1);
  });

  it('2 Samuel carries exactly the transcript’s ten stops', () => {
    expect(SECOND_SAMUEL.movements).toEqual(SECOND_SAMUEL_STOPS);
    expect(SECOND_SAMUEL.movements[0].startSec).toBe(99.7);
    expect(SECOND_SAMUEL.movements[9].startSec).toBe(776.6);
  });

  it('the v508/v511/v516 five are untouched by the registration', () => {
    expect(HEBREWS.sizeBytes).toBe(5854696);
    expect(GENESIS.sizeBytes).toBe(7199654);
    expect(DEUTERONOMY.sizeBytes).toBe(6394966);
    expect(JOSHUA.sizeBytes).toBe(8094054);
    expect(RUTH.sizeBytes).toBe(6992442);
    expect(HEBREWS.movements).toHaveLength(10);
    expect(GENESIS.movements).toHaveLength(10);
    expect(DEUTERONOMY.movements).toHaveLength(10);
    expect(JOSHUA.movements).toHaveLength(10);
    expect(RUTH.movements).toHaveLength(10);
  });
});

// ─── The v507 indicators read both Samuel books from the registry ───────────

describe('v518 indicators — 1 Samuel stop chapters', () => {
  it('every 1 Samuel stop resolves to a mark, in tour order, one per chapter', () => {
    const marks = tenStopMarks(FIRST_SAMUEL);
    expect(marks).toHaveLength(10);
    expect(marks.map((m) => m.stop)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(marks.map((m) => m.chapter)).toEqual([1, 2, 3, 4, 10, 12, 15, 17, 24, 28]);
  });

  it('the chapter map seats each chapter’s only stop', () => {
    const map = tenStopChapterMap(FIRST_SAMUEL);
    const asObj: Record<number, number> = {};
    for (const [ch, mark] of map) asObj[ch] = mark.stop;
    expect(asObj).toEqual({ 1: 1, 2: 2, 3: 3, 4: 4, 10: 5, 12: 6, 15: 7, 17: 8, 24: 9, 28: 10 });
    for (const ch of [1, 2, 3, 4, 10, 12, 15, 17, 24, 28]) {
      expect(stopMarksForChapter(FIRST_SAMUEL, ch)).toHaveLength(1);
    }
  });

  it('1 Samuel 1 carries Stop 1 — Hannah’s Prayer', () => {
    const mark = stopMarkForChapter(FIRST_SAMUEL, 1);
    expect(mark?.stop).toBe(1);
    expect(mark?.title).toBe("Hannah's Prayer");
    expect(mark?.startSec).toBe(102.2);
    expect(mark?.rangeLabel).toBe('1:1–18');
  });

  it('1 Samuel 28 carries Stop 10 — Facing the Philistines (the book’s own numeral never reads as the chapter)', () => {
    const mark = stopMarkForChapter(FIRST_SAMUEL, 28);
    expect(mark?.stop).toBe(10);
    expect(mark?.title).toBe('Facing the Philistines');
    expect(mark?.startSec).toBe(716.1);
    expect(mark?.rangeLabel).toBe('28:3–6');
  });

  it('a chapter with no stop — and one beyond the book — answer null', () => {
    expect(stopMarkForChapter(FIRST_SAMUEL, 5)).toBeNull();
    expect(stopMarkForChapter(FIRST_SAMUEL, 32)).toBeNull();
  });
});

describe('v518 indicators — 2 Samuel stop chapters', () => {
  it('every 2 Samuel stop resolves to a mark, in tour order, one per chapter', () => {
    const marks = tenStopMarks(SECOND_SAMUEL);
    expect(marks).toHaveLength(10);
    expect(marks.map((m) => m.stop)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(marks.map((m) => m.chapter)).toEqual([1, 5, 6, 7, 9, 12, 13, 16, 19, 24]);
  });

  it('the chapter map seats each chapter’s only stop', () => {
    const map = tenStopChapterMap(SECOND_SAMUEL);
    const asObj: Record<number, number> = {};
    for (const [ch, mark] of map) asObj[ch] = mark.stop;
    expect(asObj).toEqual({ 1: 1, 5: 2, 6: 3, 7: 4, 9: 5, 12: 6, 13: 7, 16: 8, 19: 9, 24: 10 });
    for (const ch of [1, 5, 6, 7, 9, 12, 13, 16, 19, 24]) {
      expect(stopMarksForChapter(SECOND_SAMUEL, ch)).toHaveLength(1);
    }
  });

  it('2 Samuel 12 carries Stop 6 — The Child’s Death', () => {
    const mark = stopMarkForChapter(SECOND_SAMUEL, 12);
    expect(mark?.stop).toBe(6);
    expect(mark?.title).toBe("The Child's Death");
    expect(mark?.startSec).toBe(529.0);
    expect(mark?.rangeLabel).toBe('12:16–23');
  });

  it('2 Samuel 24 carries Stop 10 — A Worthy Sacrifice', () => {
    const mark = stopMarkForChapter(SECOND_SAMUEL, 24);
    expect(mark?.stop).toBe(10);
    expect(mark?.title).toBe('A Worthy Sacrifice');
    expect(mark?.startSec).toBe(776.6);
    expect(mark?.rangeLabel).toBe('24:18–25');
  });

  it('a chapter with no stop — and one beyond the book — answer null', () => {
    expect(stopMarkForChapter(SECOND_SAMUEL, 2)).toBeNull();
    expect(stopMarkForChapter(SECOND_SAMUEL, 25)).toBeNull();
  });
});

// ─── The downloads model lists all seven, in their book colours ─────────────

function makeFakeFileSystem() {
  const files = new Map<string, { size: number; mtime: number }>();
  const fs: TenStopsFileSystem = {
    documentDirectory: 'file:///docs/',
    getInfoAsync: async (path: string) => {
      const f = files.get(path);
      return f ? { exists: true, size: f.size, modificationTime: f.mtime } : { exists: false };
    },
    makeDirectoryAsync: async () => undefined,
    deleteAsync: async (path: string) => {
      files.delete(path);
    },
    createDownloadResumable: () => {
      throw new Error('the downloads list never starts a transfer');
    },
  };
  return { fs, files };
}

let fake = makeFakeFileSystem();

beforeEach(() => {
  fake = makeFakeFileSystem();
  resetTenStopsDownloadsForTests();
  resetDownloadsForTests();
  setTenStopsFileSystemForTests(fake.fs);
});

afterAll(() => {
  setTenStopsFileSystemForTests(null);
  resetTenStopsDownloadsForTests();
  resetDownloadsForTests();
});

const uriFor = (e: TenStops) => `file:///docs/ten-stops/${e.fileName}`;

describe('v518 downloads — all seven tours, disk truth and book colours', () => {
  it('lists all seven at their registry sizes, newest first', async () => {
    fake.files.set(uriFor(HEBREWS), { size: HEBREWS.sizeBytes, mtime: 100 });
    fake.files.set(uriFor(GENESIS), { size: GENESIS.sizeBytes, mtime: 200 });
    fake.files.set(uriFor(DEUTERONOMY), { size: DEUTERONOMY.sizeBytes, mtime: 300 });
    fake.files.set(uriFor(JOSHUA), { size: JOSHUA.sizeBytes, mtime: 400 });
    fake.files.set(uriFor(RUTH), { size: RUTH.sizeBytes, mtime: 500 });
    fake.files.set(uriFor(FIRST_SAMUEL), { size: FIRST_SAMUEL.sizeBytes, mtime: 600 });
    fake.files.set(uriFor(SECOND_SAMUEL), { size: SECOND_SAMUEL.sizeBytes, mtime: 700 });
    const items = await refreshDownloads();
    expect(items.map((i) => i.entry.book)).toEqual([
      '2 Samuel',
      '1 Samuel',
      'Ruth',
      'Joshua',
      'Deuteronomy',
      'Genesis',
      'Hebrews',
    ]);
    expect(items.map((i) => i.sizeBytes)).toEqual([
      SECOND_SAMUEL.sizeBytes,
      FIRST_SAMUEL.sizeBytes,
      RUTH.sizeBytes,
      JOSHUA.sizeBytes,
      DEUTERONOMY.sizeBytes,
      GENESIS.sizeBytes,
      HEBREWS.sizeBytes,
    ]);
    expect(items.every((i) => i.kind === 'ten-stops')).toBe(true);
  });

  it('both Samuel books dress in the ORANGE family — the Joshua–Esther band, Joshua’s own', () => {
    const first = bookColorsFor('1 Samuel', false)!;
    const second = bookColorsFor('2 Samuel', false)!;
    const joshua = bookColorsFor('Joshua', false)!;
    const genesis = bookColorsFor('Genesis', false)!;
    const hebrews = bookColorsFor('Hebrews', false)!;
    // The v420 bands: Joshua–Esther is the ORANGE band, and both
    // Samuel books sit in it beside Joshua and Ruth; the Law
    // books wear RED, Hebrews wears VIOLET.
    expect(first.hue).toBe('orange');
    expect(second.hue).toBe('orange');
    expect(first.primary).toBe(joshua.primary);
    expect(second.primary).toBe(joshua.primary);
    expect(first.primary).not.toBe(genesis.primary);
    expect(first.primary).not.toBe(hebrews.primary);
    expect(genesis.hue).toBe('red');
    expect(hebrews.hue).toBe('violet');
  });
});

// ─── The Samuel transcripts' data and their model ───────────────────────────

describe('v518 transcripts — the Samuel tours’ own words, at segment level', () => {
  it('both transcripts are present at their transcribed segment counts', () => {
    expect(tenStopsTranscript('1 Samuel')).toHaveLength(326);
    expect(tenStopsTranscript('2 Samuel')).toHaveLength(388);
  });

  it('segments open at 0 and stay in spoken order for both tours', () => {
    for (const [book, entry] of [
      ['1 Samuel', FIRST_SAMUEL],
      ['2 Samuel', SECOND_SAMUEL],
    ] as const) {
      const segs = tenStopsTranscript(book)!;
      expect(segs[0].startSec).toBe(0);
      for (let i = 1; i < segs.length; i++) {
        expect(segs[i].startSec).toBeGreaterThanOrEqual(segs[i - 1].startSec);
      }
      expect(segs.every((s) => s.text.length > 0)).toBe(true);
      expect(segs[segs.length - 1].startSec).toBeLessThan(entry.durationSec);
    }
  });

  it('both sessions carry their transcript through tenStopsAsDevotional', () => {
    const first = tenStopsAsDevotional(FIRST_SAMUEL);
    expect(first.transcriptSegments).toBe(tenStopsTranscript('1 Samuel'));
    expect(first.transcriptSegments).toHaveLength(326);
    expect(first.movements).toEqual(FIRST_SAMUEL.movements);
    const second = tenStopsAsDevotional(SECOND_SAMUEL);
    expect(second.transcriptSegments).toBe(tenStopsTranscript('2 Samuel'));
    expect(second.transcriptSegments).toHaveLength(388);
    expect(second.movements).toEqual(SECOND_SAMUEL.movements);
  });

  it('1 Samuel rows group pre-Stop-1 segments under Introduction, then under their stops', () => {
    const segs = tenStopsTranscript('1 Samuel')!;
    const rows = tenStopsTranscriptRows(segs, FIRST_SAMUEL.movements);
    const headers = rows.filter((r) => r.kind === 'header');
    expect(headers).toHaveLength(11); // Introduction + the ten stops
    expect(headers[0]).toEqual({ kind: 'header', label: 'Introduction' });
    expect(headers[1]).toEqual({
      kind: 'header',
      label: "Hannah's Prayer",
      passage: '1 Samuel 1:1-18',
    });
    expect(headers[10]).toEqual({
      kind: 'header',
      label: 'Facing the Philistines',
      passage: '1 Samuel 28:3-6',
    });
    const segRows = rows.filter((r) => r.kind === 'segment');
    expect(segRows).toHaveLength(segs.length);
    const introCount = segs.filter((s) => s.startSec < FIRST_SAMUEL.movements[0].startSec).length;
    const firstHeaderAt = rows.findIndex(
      (r) => r.kind === 'header' && r.label === "Hannah's Prayer",
    );
    expect(rows.slice(1, firstHeaderAt).filter((r) => r.kind === 'segment')).toHaveLength(
      introCount,
    );
  });

  it('2 Samuel rows end under A Worthy Sacrifice', () => {
    const segs = tenStopsTranscript('2 Samuel')!;
    const rows = tenStopsTranscriptRows(segs, SECOND_SAMUEL.movements);
    const headers = rows.filter((r) => r.kind === 'header');
    expect(headers).toHaveLength(11);
    expect(headers[1]).toEqual({
      kind: 'header',
      label: 'Weeping Over the Lost',
      passage: '2 Samuel 1:11-16',
    });
    expect(headers[10]).toEqual({
      kind: 'header',
      label: 'A Worthy Sacrifice',
      passage: '2 Samuel 24:18-25',
    });
  });

  it('the active segment is the last one begun at the position', () => {
    const segs = tenStopsTranscript('1 Samuel')!;
    expect(activeTenStopsTranscriptSegment(segs, 0)).toBe(0);
    expect(activeTenStopsTranscriptSegment(segs, -5)).toBe(-1);
    // At Stop 10's first second, the lit segment is the first one
    // at or after it — the segment the announcement opens.
    const at = activeTenStopsTranscriptSegment(segs, 716.1);
    expect(segs[at].startSec).toBeLessThanOrEqual(716.1);
    expect(segs[at + 1].startSec).toBeGreaterThan(716.1);
    // Deep in the last stop, the active segment is near the end.
    const late = activeTenStopsTranscriptSegment(segs, 840);
    expect(late).toBeGreaterThan(segs.length - 10);
  });
});
