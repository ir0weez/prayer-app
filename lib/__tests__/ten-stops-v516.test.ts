// ─── v516 — Ten Stops: Ruth registered (the fifth tour) ────────────────────
// Ruth joins the registry in exactly the v508/v511 shape: a
// NotebookLM Deep Dive tour of Jonathan's own commentary notes,
// from the stop list he approved on 2026-11-12 (the daily
// check-in sessions' verdicts on his best writing — the same
// logic as Joshua; all ten earned their seats on singling-out,
// no fill picks were needed, and the one generation steering
// call, the Ruth 2 gleaning material centred on its grace-first
// heart, was named to him before the tour was made) —
// generated, verified against its own transcript stop-by-stop
// in order, then hosted in the ten-stops-library release at the
// exact byte size pinned here. Everything the registry drives —
// the book page's card, the downloads home, the v507 chapter
// indicators — lights up for Ruth from the registry alone, and
// its session carries its transcript (226 segments) for the
// player's follow-along, pinned at the model level here; the
// render is pinned in ten-stops-v516-listen.test.tsx.
//
// Ruth is the first tour whose stops share chapters — its ten
// stops sit in just four chapters (1,1,1,2,2,2,3,3,4,4) — so
// the chapter map pins the model's own rule: every stop is a
// mark (tenStopMarks), and a chapter's seat (tenStopChapterMap)
// goes to the first stop in tour order, with stopMarksForChapter
// carrying the chapter's whole list.

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

// The stops exactly as the tour's stops.json carries them
// (read from ~/workspace/devotionals/transcripts/ruth-ten-stops/
// stops.json — the announcement seconds of the verified run).
const RUTH_STOPS = [
  { title: 'Naomi Widowed', passage: 'Ruth 1:1-5', startSec: 98.0 },
  { title: "Ruth's Loyalty", passage: 'Ruth 1:6-18', startSec: 285.2 },
  { title: 'Naomi and Ruth Return', passage: 'Ruth 1:19-22', startSec: 415.5 },
  { title: 'Ruth Meets Boaz', passage: 'Ruth 2:1-7', startSec: 487.1 },
  { title: 'Ruth Meets Boaz', passage: 'Ruth 2:8-13', startSec: 573.8 },
  { title: 'Ruth Meets Boaz', passage: 'Ruth 2:14-17', startSec: 647.6 },
  { title: 'The Threshing Floor', passage: 'Ruth 3:1-5', startSec: 767.3 },
  { title: 'The Threshing Floor', passage: 'Ruth 3:7-11', startSec: 852.3 },
  { title: 'The Heart and Home of Boaz', passage: 'Ruth 4:1-4', startSec: 993.1 },
  { title: 'The Heart and Home of Boaz', passage: 'Ruth 4:5-10', startSec: 1063.2 },
];

// ─── The registry holds five tours ──────────────────────────────────────────

describe('v516 Ten Stops registry — five tours', () => {
  it('exactly five, Ruth appended after Joshua, Hebrews still first', () => {
    // v518 RE-BASE (2026-11-12): 1 Samuel and 2 Samuel were
    // generated, verified and hosted the same way and
    // registered together in v518, appended after Ruth — the
    // registry now holds seven; the five tours of v516 still
    // lead in the same order.
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

  it('Ruth at its hosted facts', () => {
    expect(RUTH.title).toBe('Ten Stops in Ruth');
    expect(RUTH.fileName).toBe('ruth-ten-stops.m4a');
    expect(RUTH.sizeBytes).toBe(6992442);
    expect(RUTH.durationSec).toBe(1323);
    expect(formatClock(RUTH.durationSec)).toBe('22:03');
    const url = new URL(RUTH.url);
    expect(url.host).toBe('github.com');
    expect(url.pathname).toBe(
      '/ir0weez/prayer-app/releases/download/ten-stops-library/ruth-ten-stops.m4a',
    );
  });

  it('Ruth carries exactly the transcript’s ten stops', () => {
    expect(RUTH.movements).toEqual(RUTH_STOPS);
    expect(RUTH.movements[0].startSec).toBe(98.0);
    expect(RUTH.movements[9].startSec).toBe(1063.2);
  });

  it('the v508/v511 four are untouched by the registration', () => {
    expect(HEBREWS.sizeBytes).toBe(5854696);
    expect(GENESIS.sizeBytes).toBe(7199654);
    expect(DEUTERONOMY.sizeBytes).toBe(6394966);
    expect(JOSHUA.sizeBytes).toBe(8094054);
    expect(HEBREWS.movements).toHaveLength(10);
    expect(GENESIS.movements).toHaveLength(10);
    expect(DEUTERONOMY.movements).toHaveLength(10);
    expect(JOSHUA.movements).toHaveLength(10);
  });
});

// ─── The v507 indicators read Ruth from the registry ────────────────────────

describe('v516 indicators — Ruth stop chapters', () => {
  it('every Ruth stop resolves to a mark, in tour order', () => {
    const marks = tenStopMarks(RUTH);
    expect(marks).toHaveLength(10);
    expect(marks.map((m) => m.stop)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(marks.map((m) => m.chapter)).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 4, 4]);
  });

  it('the chapter map seats each chapter’s first stop — Ruth’s stops share chapters', () => {
    const map = tenStopChapterMap(RUTH);
    const asObj: Record<number, number> = {};
    for (const [ch, mark] of map) asObj[ch] = mark.stop;
    expect(asObj).toEqual({ 1: 1, 2: 4, 3: 7, 4: 9 });
  });

  it('stopMarksForChapter carries every stop a chapter holds', () => {
    expect(stopMarksForChapter(RUTH, 1).map((m) => m.stop)).toEqual([1, 2, 3]);
    expect(stopMarksForChapter(RUTH, 2).map((m) => m.stop)).toEqual([4, 5, 6]);
    expect(stopMarksForChapter(RUTH, 3).map((m) => m.stop)).toEqual([7, 8]);
    expect(stopMarksForChapter(RUTH, 4).map((m) => m.stop)).toEqual([9, 10]);
  });

  it('Ruth 1 carries Stop 1 — Naomi Widowed', () => {
    const mark = stopMarkForChapter(RUTH, 1);
    expect(mark?.stop).toBe(1);
    expect(mark?.title).toBe('Naomi Widowed');
    expect(mark?.startSec).toBe(98.0);
    expect(mark?.rangeLabel).toBe('1:1–5');
  });

  it('Ruth 4 carries Stop 9 — The Heart and Home of Boaz', () => {
    const mark = stopMarkForChapter(RUTH, 4);
    expect(mark?.stop).toBe(9);
    expect(mark?.title).toBe('The Heart and Home of Boaz');
    expect(mark?.startSec).toBe(993.1);
    expect(mark?.rangeLabel).toBe('4:1–4');
  });

  it('a chapter beyond the book answers null', () => {
    expect(stopMarkForChapter(RUTH, 5)).toBeNull();
  });
});

// ─── The downloads model lists all five, in their book colours ─────────────

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

describe('v516 downloads — all five tours, disk truth and book colours', () => {
  it('lists all five at their registry sizes, newest first', async () => {
    fake.files.set(uriFor(HEBREWS), { size: HEBREWS.sizeBytes, mtime: 100 });
    fake.files.set(uriFor(GENESIS), { size: GENESIS.sizeBytes, mtime: 200 });
    fake.files.set(uriFor(DEUTERONOMY), { size: DEUTERONOMY.sizeBytes, mtime: 300 });
    fake.files.set(uriFor(JOSHUA), { size: JOSHUA.sizeBytes, mtime: 400 });
    fake.files.set(uriFor(RUTH), { size: RUTH.sizeBytes, mtime: 500 });
    const items = await refreshDownloads();
    expect(items.map((i) => i.entry.book)).toEqual([
      'Ruth',
      'Joshua',
      'Deuteronomy',
      'Genesis',
      'Hebrews',
    ]);
    expect(items.map((i) => i.sizeBytes)).toEqual([
      RUTH.sizeBytes,
      JOSHUA.sizeBytes,
      DEUTERONOMY.sizeBytes,
      GENESIS.sizeBytes,
      HEBREWS.sizeBytes,
    ]);
    expect(items.every((i) => i.kind === 'ten-stops')).toBe(true);
  });

  it('Ruth dresses in the ORANGE family — the Joshua–Esther band, Joshua’s own', () => {
    const ruth = bookColorsFor('Ruth', false)!;
    const joshua = bookColorsFor('Joshua', false)!;
    const genesis = bookColorsFor('Genesis', false)!;
    const hebrews = bookColorsFor('Hebrews', false)!;
    // The v420 bands: Joshua–Esther is the ORANGE band, and Ruth
    // sits in it beside Joshua; the Law books wear RED, Hebrews
    // wears VIOLET.
    expect(ruth.hue).toBe('orange');
    expect(ruth.primary).toBe(joshua.primary);
    expect(ruth.primary).not.toBe(genesis.primary);
    expect(ruth.primary).not.toBe(hebrews.primary);
    expect(genesis.hue).toBe('red');
    expect(hebrews.hue).toBe('violet');
  });
});

// ─── The Ruth transcript data and its model ─────────────────────────────────

describe('v516 transcript — Ruth’s own words, at segment level', () => {
  it('the Ruth transcript is present at its transcribed segment count', () => {
    expect(tenStopsTranscript('Ruth')).toHaveLength(226);
  });

  it('segments open at 0 and stay in spoken order', () => {
    const segs = tenStopsTranscript('Ruth')!;
    expect(segs[0].startSec).toBe(0);
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i].startSec).toBeGreaterThanOrEqual(segs[i - 1].startSec);
    }
    expect(segs.every((s) => s.text.length > 0)).toBe(true);
    expect(segs[segs.length - 1].startSec).toBeLessThan(RUTH.durationSec);
  });

  it('the Ruth session carries its transcript through tenStopsAsDevotional', () => {
    const session = tenStopsAsDevotional(RUTH);
    expect(session.transcriptSegments).toBe(tenStopsTranscript('Ruth'));
    expect(session.transcriptSegments).toHaveLength(226);
    expect(session.movements).toEqual(RUTH.movements);
  });

  it('rows group pre-Stop-1 segments under Introduction, then under their stops', () => {
    const segs = tenStopsTranscript('Ruth')!;
    const rows = tenStopsTranscriptRows(segs, RUTH.movements);
    const headers = rows.filter((r) => r.kind === 'header');
    expect(headers).toHaveLength(11); // Introduction + the ten stops
    expect(headers[0]).toEqual({ kind: 'header', label: 'Introduction' });
    expect(headers[1]).toEqual({
      kind: 'header',
      label: 'Naomi Widowed',
      passage: 'Ruth 1:1-5',
    });
    expect(headers[10]).toEqual({
      kind: 'header',
      label: 'The Heart and Home of Boaz',
      passage: 'Ruth 4:5-10',
    });
    const segRows = rows.filter((r) => r.kind === 'segment');
    expect(segRows).toHaveLength(segs.length);
    const introCount = segs.filter((s) => s.startSec < RUTH.movements[0].startSec).length;
    const firstHeaderAt = rows.findIndex(
      (r) => r.kind === 'header' && r.label === 'Naomi Widowed',
    );
    expect(rows.slice(1, firstHeaderAt).filter((r) => r.kind === 'segment')).toHaveLength(
      introCount,
    );
  });

  it('the active segment is the last one begun at the position', () => {
    const segs = tenStopsTranscript('Ruth')!;
    expect(activeTenStopsTranscriptSegment(segs, 0)).toBe(0);
    expect(activeTenStopsTranscriptSegment(segs, -5)).toBe(-1);
    // At Stop 10's first second, the lit segment is the first one
    // at or after it — the segment the announcement opens.
    const at = activeTenStopsTranscriptSegment(segs, 1063.2);
    expect(segs[at].startSec).toBeLessThanOrEqual(1063.2);
    expect(segs[at + 1].startSec).toBeGreaterThan(1063.2);
    // Deep in the last stop, the active segment is near the end.
    const late = activeTenStopsTranscriptSegment(segs, 1300);
    expect(late).toBeGreaterThan(segs.length - 10);
  });
});
