// ─── v555 — Ten Stops: 1 Kings registered (the eighth tour) ─────────────────
// 1 Kings joins the registry in exactly the v508/v511/v516/
// v518 shape: a NotebookLM Deep Dive tour of Jonathan's own
// commentary notes, from the stop list he locked on
// 2026-11-22 (the daily check-in sessions' verdicts on his
// best writing — all ten earned their seats on session
// singling-out, no fill picks needed) — generated, verified
// against its own transcript stop-by-stop in order, then
// hosted in the ten-stops-library release at the exact byte
// size pinned here. Two steering calls rode in the generation
// prompt and were named to him (Stop 7 centred provision as
// God's gift, not a wage for faithfulness; Stop 8 kept the
// church as the people — a hospital for spirits — not a
// building); both were verified in the audio, and his notes
// themselves went in whole and unedited. Everything the
// registry drives — the book pages' cards, the downloads home,
// the v507 chapter indicators — lights up for 1 Kings from
// the registry alone, and the session carries its transcript
// (227 segments) for the player's follow-along, pinned at the
// model level here; the render is pinned in
// ten-stops-v555-listen.test.tsx.
//
// The stops sit in distinct chapters (like the Samuel tours,
// unlike Ruth's shared seats), so each chapter map is one stop
// per chapter — the parse handles the book's own numeral
// ("1 Kings 22:5-12" reads chapter 22, never chapter 1)
// because the passage parser anchors on the LAST colon group.
// Stop 2 is a single-verse stop (1 Kings 6:1): its range
// label stands alone as "6:1".

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
const FIRST_KINGS = getTenStops('1 Kings')!;

// The stops exactly as the tour's stops.json file carries them
// (read from ~/workspace/devotionals/transcripts/1kings-
// ten-stops/stops.json — the announcement seconds of the
// verified run).
const FIRST_KINGS_STOPS = [
  { title: "David's Death", passage: '1 Kings 2:10-12', startSec: 112.2 },
  { title: 'A Long Time Coming', passage: '1 Kings 6:1', startSec: 205.2 },
  { title: 'Forgive', passage: '1 Kings 8:27-30', startSec: 337.7 },
  { title: 'Bad Leadership', passage: '1 Kings 12:6-11', startSec: 437.2 },
  { title: 'Back to Sin', passage: '1 Kings 13:33-34', startSec: 566.8 },
  { title: 'War Continues', passage: '1 Kings 15:1-6', startSec: 636.3 },
  { title: 'Refined Faith', passage: '1 Kings 17:8-16', startSec: 768.9 },
  { title: "Elijah and Ahab's Meeting", passage: '1 Kings 18:16-19', startSec: 857.2 },
  { title: 'A Little Comfort', passage: '1 Kings 19:4-8', startSec: 994.4 },
  { title: 'False Victory', passage: '1 Kings 22:5-12', startSec: 1096.3 },
];

// ─── The registry holds eight tours ─────────────────────────────────────────

describe('v555 Ten Stops registry — eight tours', () => {
  it('exactly eight, 1 Kings appended after 2 Samuel, Hebrews still first', () => {
    const all = tenStopsRegistry();
    expect(all.length).toBe(8);
    expect(all.map((e) => e.book)).toEqual([
      'Hebrews',
      'Genesis',
      'Deuteronomy',
      'Joshua',
      'Ruth',
      '1 Samuel',
      '2 Samuel',
      '1 Kings',
    ]);
    expect(all[0].book).toBe('Hebrews');
  });

  it('1 Kings at its hosted facts', () => {
    expect(FIRST_KINGS.title).toBe('Ten Stops in 1 Kings');
    expect(FIRST_KINGS.fileName).toBe('1kings-ten-stops.m4a');
    expect(FIRST_KINGS.sizeBytes).toBe(6808339);
    expect(FIRST_KINGS.durationSec).toBe(1289);
    expect(formatClock(FIRST_KINGS.durationSec)).toBe('21:29');
    const url = new URL(FIRST_KINGS.url);
    expect(url.host).toBe('github.com');
    expect(url.pathname).toBe(
      '/ir0weez/prayer-app/releases/download/ten-stops-library/1kings-ten-stops.m4a',
    );
  });

  it('1 Kings carries exactly the transcript’s ten stops', () => {
    expect(FIRST_KINGS.movements).toEqual(FIRST_KINGS_STOPS);
    expect(FIRST_KINGS.movements[0].startSec).toBe(112.2);
    expect(FIRST_KINGS.movements[9].startSec).toBe(1096.3);
  });

  it('the v508/v511/v516/v518 seven are untouched by the registration', () => {
    expect(HEBREWS.sizeBytes).toBe(5854696);
    expect(GENESIS.sizeBytes).toBe(7199654);
    expect(DEUTERONOMY.sizeBytes).toBe(6394966);
    expect(JOSHUA.sizeBytes).toBe(8094054);
    expect(RUTH.sizeBytes).toBe(6992442);
    expect(FIRST_SAMUEL.sizeBytes).toBe(4726980);
    expect(SECOND_SAMUEL.sizeBytes).toBe(4952875);
    expect(HEBREWS.movements).toHaveLength(10);
    expect(GENESIS.movements).toHaveLength(10);
    expect(DEUTERONOMY.movements).toHaveLength(10);
    expect(JOSHUA.movements).toHaveLength(10);
    expect(RUTH.movements).toHaveLength(10);
    expect(FIRST_SAMUEL.movements).toHaveLength(10);
    expect(SECOND_SAMUEL.movements).toHaveLength(10);
  });
});

// ─── The v507 indicators read 1 Kings from the registry ─────────────────────

describe('v555 indicators — 1 Kings stop chapters', () => {
  it('every 1 Kings stop resolves to a mark, in tour order, one per chapter', () => {
    const marks = tenStopMarks(FIRST_KINGS);
    expect(marks).toHaveLength(10);
    expect(marks.map((m) => m.stop)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(marks.map((m) => m.chapter)).toEqual([2, 6, 8, 12, 13, 15, 17, 18, 19, 22]);
  });

  it('the chapter map seats each chapter’s only stop', () => {
    const map = tenStopChapterMap(FIRST_KINGS);
    const asObj: Record<number, number> = {};
    for (const [ch, mark] of map) asObj[ch] = mark.stop;
    expect(asObj).toEqual({ 2: 1, 6: 2, 8: 3, 12: 4, 13: 5, 15: 6, 17: 7, 18: 8, 19: 9, 22: 10 });
    for (const ch of [2, 6, 8, 12, 13, 15, 17, 18, 19, 22]) {
      expect(stopMarksForChapter(FIRST_KINGS, ch)).toHaveLength(1);
    }
  });

  it('1 Kings 2 carries Stop 1 — David’s Death', () => {
    const mark = stopMarkForChapter(FIRST_KINGS, 2);
    expect(mark?.stop).toBe(1);
    expect(mark?.title).toBe("David's Death");
    expect(mark?.startSec).toBe(112.2);
    expect(mark?.rangeLabel).toBe('2:10–12');
  });

  it('1 Kings 6 carries Stop 2 — A Long Time Coming, a single-verse stop whose label stands alone', () => {
    const mark = stopMarkForChapter(FIRST_KINGS, 6);
    expect(mark?.stop).toBe(2);
    expect(mark?.title).toBe('A Long Time Coming');
    expect(mark?.startSec).toBe(205.2);
    expect(mark?.rangeLabel).toBe('6:1');
  });

  it('1 Kings 22 carries Stop 10 — False Victory (the book’s own numeral never reads as the chapter)', () => {
    const mark = stopMarkForChapter(FIRST_KINGS, 22);
    expect(mark?.stop).toBe(10);
    expect(mark?.title).toBe('False Victory');
    expect(mark?.startSec).toBe(1096.3);
    expect(mark?.rangeLabel).toBe('22:5–12');
  });

  it('a chapter with no stop — and one beyond the book — answer null', () => {
    expect(stopMarkForChapter(FIRST_KINGS, 1)).toBeNull();
    expect(stopMarkForChapter(FIRST_KINGS, 23)).toBeNull();
  });
});

// ─── The downloads model lists all eight, in their book colours ─────────────

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

describe('v555 downloads — all eight tours, disk truth and book colours', () => {
  it('lists all eight at their registry sizes, newest first', async () => {
    fake.files.set(uriFor(HEBREWS), { size: HEBREWS.sizeBytes, mtime: 100 });
    fake.files.set(uriFor(GENESIS), { size: GENESIS.sizeBytes, mtime: 200 });
    fake.files.set(uriFor(DEUTERONOMY), { size: DEUTERONOMY.sizeBytes, mtime: 300 });
    fake.files.set(uriFor(JOSHUA), { size: JOSHUA.sizeBytes, mtime: 400 });
    fake.files.set(uriFor(RUTH), { size: RUTH.sizeBytes, mtime: 500 });
    fake.files.set(uriFor(FIRST_SAMUEL), { size: FIRST_SAMUEL.sizeBytes, mtime: 600 });
    fake.files.set(uriFor(SECOND_SAMUEL), { size: SECOND_SAMUEL.sizeBytes, mtime: 700 });
    fake.files.set(uriFor(FIRST_KINGS), { size: FIRST_KINGS.sizeBytes, mtime: 800 });
    const items = await refreshDownloads();
    expect(items.map((i) => i.entry.book)).toEqual([
      '1 Kings',
      '2 Samuel',
      '1 Samuel',
      'Ruth',
      'Joshua',
      'Deuteronomy',
      'Genesis',
      'Hebrews',
    ]);
    expect(items.map((i) => i.sizeBytes)).toEqual([
      FIRST_KINGS.sizeBytes,
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

  it('1 Kings dresses in the ORANGE family — the Joshua–Esther band, Joshua’s own', () => {
    const kings = bookColorsFor('1 Kings', false)!;
    const joshua = bookColorsFor('Joshua', false)!;
    const genesis = bookColorsFor('Genesis', false)!;
    const hebrews = bookColorsFor('Hebrews', false)!;
    // The v420 bands: Joshua–Esther is the ORANGE band, and
    // 1 Kings sits in it beside Joshua, Ruth and both Samuels;
    // the Law books wear RED, Hebrews wears VIOLET.
    expect(kings.hue).toBe('orange');
    expect(kings.primary).toBe(joshua.primary);
    expect(kings.primary).not.toBe(genesis.primary);
    expect(kings.primary).not.toBe(hebrews.primary);
    expect(genesis.hue).toBe('red');
    expect(hebrews.hue).toBe('violet');
  });
});

// ─── The 1 Kings transcript's data and its model ────────────────────────────

describe('v555 transcripts — the 1 Kings tour’s own words, at segment level', () => {
  it('the transcript is present at its transcribed segment count', () => {
    expect(tenStopsTranscript('1 Kings')).toHaveLength(227);
  });

  it('segments open at 0 and stay in spoken order', () => {
    const segs = tenStopsTranscript('1 Kings')!;
    expect(segs[0].startSec).toBe(0);
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i].startSec).toBeGreaterThanOrEqual(segs[i - 1].startSec);
    }
    expect(segs.every((s) => s.text.length > 0)).toBe(true);
    expect(segs[segs.length - 1].startSec).toBeLessThan(FIRST_KINGS.durationSec);
  });

  it('the session carries its transcript through tenStopsAsDevotional', () => {
    const session = tenStopsAsDevotional(FIRST_KINGS);
    expect(session.transcriptSegments).toBe(tenStopsTranscript('1 Kings'));
    expect(session.transcriptSegments).toHaveLength(227);
    expect(session.movements).toEqual(FIRST_KINGS.movements);
  });

  it('rows group pre-Stop-1 segments under Introduction, then under their stops', () => {
    const segs = tenStopsTranscript('1 Kings')!;
    const rows = tenStopsTranscriptRows(segs, FIRST_KINGS.movements);
    const headers = rows.filter((r) => r.kind === 'header');
    expect(headers).toHaveLength(11); // Introduction + the ten stops
    expect(headers[0]).toEqual({ kind: 'header', label: 'Introduction' });
    expect(headers[1]).toEqual({
      kind: 'header',
      label: "David's Death",
      passage: '1 Kings 2:10-12',
    });
    expect(headers[10]).toEqual({
      kind: 'header',
      label: 'False Victory',
      passage: '1 Kings 22:5-12',
    });
    const segRows = rows.filter((r) => r.kind === 'segment');
    expect(segRows).toHaveLength(segs.length);
    const introCount = segs.filter((s) => s.startSec < FIRST_KINGS.movements[0].startSec).length;
    const firstHeaderAt = rows.findIndex((r) => r.kind === 'header' && r.label === "David's Death");
    expect(rows.slice(1, firstHeaderAt).filter((r) => r.kind === 'segment')).toHaveLength(
      introCount,
    );
  });

  it('the active segment is the last one begun at the position', () => {
    const segs = tenStopsTranscript('1 Kings')!;
    expect(activeTenStopsTranscriptSegment(segs, 0)).toBe(0);
    expect(activeTenStopsTranscriptSegment(segs, -5)).toBe(-1);
    // At Stop 10's first second, the lit segment is the first one
    // at or after it — the segment the announcement opens.
    const at = activeTenStopsTranscriptSegment(segs, 1096.3);
    expect(segs[at].startSec).toBeLessThanOrEqual(1096.3);
    expect(segs[at + 1].startSec).toBeGreaterThan(1096.3);
    // Deep in the last stop, the active segment is near the end.
    const late = activeTenStopsTranscriptSegment(segs, 1280);
    expect(late).toBeGreaterThan(segs.length - 10);
  });
});
