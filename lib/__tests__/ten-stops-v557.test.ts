// ─── v557 — Ten Stops: 2 Kings registered (the ninth tour) ──────────────────
// 2 Kings joins the registry in exactly the v508/v511/v516/
// v518/v555 shape: a NotebookLM Deep Dive tour of Jonathan's
// own commentary notes, from the stop list he locked on
// 2026-11-23 (the daily check-in sessions' verdicts on his
// best writing — all ten earned their seats on session
// singling-out, no fill picks needed) — generated, verified
// against its own transcript stop-by-stop in order, then
// hosted in the ten-stops-library release at the exact byte
// size pinned here. No steering calls were needed: the list
// was checked against his settled positions before
// generation and none of the ten carries a superseded one;
// his notes themselves went in whole and unedited. The
// NotebookLM title is "2 Kings as a Survival Blueprint"; its
// shown 25:33 stands 33 seconds past the ~25-minute
// rich-book ceiling — the same overage as Joshua — and the
// tour stands as generated, nothing trimmed. Everything the
// registry drives — the book pages' cards, the downloads
// home, the v507 chapter indicators — lights up for 2 Kings
// from the registry alone, and the session carries its
// transcript (273 segments) for the player's follow-along,
// pinned at the model level here; the render is pinned in
// ten-stops-v557-listen.test.tsx.
//
// The stops sit in distinct chapters (like the Samuel and
// 1 Kings tours), so each chapter map is one stop per
// chapter — the parse handles the book's own numeral
// ("2 Kings 25:27-30" reads chapter 25, never chapter 2)
// because the passage parser anchors on the LAST colon group.

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
const SECOND_KINGS = getTenStops('2 Kings')!;

// The stops exactly as the tour's stops.json file carries them
// (read from ~/workspace/devotionals/transcripts/2kings-
// ten-stops/stops.json — the announcement seconds of the
// verified run).
const SECOND_KINGS_STOPS = [
  { title: 'A Test of Faith', passage: '2 Kings 2:1-8', startSec: 95.0 },
  { title: 'Fill The Pots', passage: '2 Kings 4:1-7', startSec: 216.7 },
  { title: 'A Gift For Ministry', passage: '2 Kings 5:15-19', startSec: 354.2 },
  { title: 'Open Eyes', passage: '2 Kings 6:14-19', startSec: 524.5 },
  { title: 'Just As God Said', passage: '2 Kings 7:16-20', startSec: 738.7 },
  { title: "The North's Defeat", passage: '2 Kings 13:1-9', startSec: 844.2 },
  { title: 'A Reminder We Miss', passage: '2 Kings 17:34-41', startSec: 1015.1 },
  { title: "Hezekiah's Prayer", passage: '2 Kings 19:14-19', startSec: 1121.7 },
  { title: 'The Law of God', passage: '2 Kings 22:8-13', startSec: 1227.1 },
  { title: 'A Man Named Evil', passage: '2 Kings 25:27-30', startSec: 1354.1 },
];

// ─── The registry holds nine tours ──────────────────────────────────────────

describe('v557 Ten Stops registry — nine tours', () => {
  it('exactly nine, 2 Kings appended after 1 Kings, Hebrews still first', () => {
    const all = tenStopsRegistry();
    expect(all.length).toBe(9);
    expect(all.map((e) => e.book)).toEqual([
      'Hebrews',
      'Genesis',
      'Deuteronomy',
      'Joshua',
      'Ruth',
      '1 Samuel',
      '2 Samuel',
      '1 Kings',
      '2 Kings',
    ]);
    expect(all[0].book).toBe('Hebrews');
  });

  it('2 Kings at its hosted facts', () => {
    expect(SECOND_KINGS.title).toBe('Ten Stops in 2 Kings');
    expect(SECOND_KINGS.fileName).toBe('2kings-ten-stops.m4a');
    expect(SECOND_KINGS.sizeBytes).toBe(8101694);
    expect(SECOND_KINGS.durationSec).toBe(1533);
    expect(formatClock(SECOND_KINGS.durationSec)).toBe('25:33');
    const url = new URL(SECOND_KINGS.url);
    expect(url.host).toBe('github.com');
    expect(url.pathname).toBe(
      '/ir0weez/prayer-app/releases/download/ten-stops-library/2kings-ten-stops.m4a',
    );
  });

  it('2 Kings carries exactly the transcript’s ten stops', () => {
    expect(SECOND_KINGS.movements).toEqual(SECOND_KINGS_STOPS);
    expect(SECOND_KINGS.movements[0].startSec).toBe(95.0);
    expect(SECOND_KINGS.movements[9].startSec).toBe(1354.1);
  });

  it('the v508/v511/v516/v518/v555 eight are untouched by the registration', () => {
    expect(HEBREWS.sizeBytes).toBe(5854696);
    expect(GENESIS.sizeBytes).toBe(7199654);
    expect(DEUTERONOMY.sizeBytes).toBe(6394966);
    expect(JOSHUA.sizeBytes).toBe(8094054);
    expect(RUTH.sizeBytes).toBe(6992442);
    expect(FIRST_SAMUEL.sizeBytes).toBe(4726980);
    expect(SECOND_SAMUEL.sizeBytes).toBe(4952875);
    expect(FIRST_KINGS.sizeBytes).toBe(6808339);
    expect(HEBREWS.movements).toHaveLength(10);
    expect(GENESIS.movements).toHaveLength(10);
    expect(DEUTERONOMY.movements).toHaveLength(10);
    expect(JOSHUA.movements).toHaveLength(10);
    expect(RUTH.movements).toHaveLength(10);
    expect(FIRST_SAMUEL.movements).toHaveLength(10);
    expect(SECOND_SAMUEL.movements).toHaveLength(10);
    expect(FIRST_KINGS.movements).toHaveLength(10);
  });
});

// ─── The v507 indicators read 2 Kings from the registry ─────────────────────

describe('v557 indicators — 2 Kings stop chapters', () => {
  it('every 2 Kings stop resolves to a mark, in tour order, one per chapter', () => {
    const marks = tenStopMarks(SECOND_KINGS);
    expect(marks).toHaveLength(10);
    expect(marks.map((m) => m.stop)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(marks.map((m) => m.chapter)).toEqual([2, 4, 5, 6, 7, 13, 17, 19, 22, 25]);
  });

  it('the chapter map seats each chapter’s only stop', () => {
    const map = tenStopChapterMap(SECOND_KINGS);
    const asObj: Record<number, number> = {};
    for (const [ch, mark] of map) asObj[ch] = mark.stop;
    expect(asObj).toEqual({ 2: 1, 4: 2, 5: 3, 6: 4, 7: 5, 13: 6, 17: 7, 19: 8, 22: 9, 25: 10 });
    for (const ch of [2, 4, 5, 6, 7, 13, 17, 19, 22, 25]) {
      expect(stopMarksForChapter(SECOND_KINGS, ch)).toHaveLength(1);
    }
  });

  it('2 Kings 2 carries Stop 1 — A Test of Faith', () => {
    const mark = stopMarkForChapter(SECOND_KINGS, 2);
    expect(mark?.stop).toBe(1);
    expect(mark?.title).toBe('A Test of Faith');
    expect(mark?.startSec).toBe(95.0);
    expect(mark?.rangeLabel).toBe('2:1–8');
  });

  it('2 Kings 25 carries Stop 10 — A Man Named Evil (the book’s own numeral never reads as the chapter)', () => {
    const mark = stopMarkForChapter(SECOND_KINGS, 25);
    expect(mark?.stop).toBe(10);
    expect(mark?.title).toBe('A Man Named Evil');
    expect(mark?.startSec).toBe(1354.1);
    expect(mark?.rangeLabel).toBe('25:27–30');
  });

  it('a chapter with no stop — and one beyond the book — answer null', () => {
    expect(stopMarkForChapter(SECOND_KINGS, 1)).toBeNull();
    expect(stopMarkForChapter(SECOND_KINGS, 26)).toBeNull();
  });
});

// ─── The downloads model lists all nine, in their book colours ──────────────

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

describe('v557 downloads — all nine tours, disk truth and book colours', () => {
  it('lists all nine at their registry sizes, newest first', async () => {
    fake.files.set(uriFor(HEBREWS), { size: HEBREWS.sizeBytes, mtime: 100 });
    fake.files.set(uriFor(GENESIS), { size: GENESIS.sizeBytes, mtime: 200 });
    fake.files.set(uriFor(DEUTERONOMY), { size: DEUTERONOMY.sizeBytes, mtime: 300 });
    fake.files.set(uriFor(JOSHUA), { size: JOSHUA.sizeBytes, mtime: 400 });
    fake.files.set(uriFor(RUTH), { size: RUTH.sizeBytes, mtime: 500 });
    fake.files.set(uriFor(FIRST_SAMUEL), { size: FIRST_SAMUEL.sizeBytes, mtime: 600 });
    fake.files.set(uriFor(SECOND_SAMUEL), { size: SECOND_SAMUEL.sizeBytes, mtime: 700 });
    fake.files.set(uriFor(FIRST_KINGS), { size: FIRST_KINGS.sizeBytes, mtime: 800 });
    fake.files.set(uriFor(SECOND_KINGS), { size: SECOND_KINGS.sizeBytes, mtime: 900 });
    const items = await refreshDownloads();
    expect(items.map((i) => i.entry.book)).toEqual([
      '2 Kings',
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
      SECOND_KINGS.sizeBytes,
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

  it('2 Kings dresses in the ORANGE family — the Joshua–Esther band, Joshua’s own', () => {
    const kings = bookColorsFor('2 Kings', false)!;
    const joshua = bookColorsFor('Joshua', false)!;
    const genesis = bookColorsFor('Genesis', false)!;
    const hebrews = bookColorsFor('Hebrews', false)!;
    // The v420 bands: Joshua–Esther is the ORANGE band, and
    // 2 Kings sits in it beside Joshua, Ruth and both Samuels
    // and 1 Kings; the Law books wear RED, Hebrews wears
    // VIOLET.
    expect(kings.hue).toBe('orange');
    expect(kings.primary).toBe(joshua.primary);
    expect(kings.primary).not.toBe(genesis.primary);
    expect(kings.primary).not.toBe(hebrews.primary);
    expect(genesis.hue).toBe('red');
    expect(hebrews.hue).toBe('violet');
  });
});

// ─── The 2 Kings transcript's data and its model ────────────────────────────

describe('v557 transcripts — the 2 Kings tour’s own words, at segment level', () => {
  it('the transcript is present at its transcribed segment count', () => {
    expect(tenStopsTranscript('2 Kings')).toHaveLength(273);
  });

  it('segments open at 0 and stay in spoken order', () => {
    const segs = tenStopsTranscript('2 Kings')!;
    expect(segs[0].startSec).toBe(0);
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i].startSec).toBeGreaterThanOrEqual(segs[i - 1].startSec);
    }
    expect(segs.every((s) => s.text.length > 0)).toBe(true);
    expect(segs[segs.length - 1].startSec).toBeLessThan(SECOND_KINGS.durationSec);
  });

  it('the session carries its transcript through tenStopsAsDevotional', () => {
    const session = tenStopsAsDevotional(SECOND_KINGS);
    expect(session.transcriptSegments).toBe(tenStopsTranscript('2 Kings'));
    expect(session.transcriptSegments).toHaveLength(273);
    expect(session.movements).toEqual(SECOND_KINGS.movements);
  });

  it('rows group pre-Stop-1 segments under Introduction, then under their stops', () => {
    const segs = tenStopsTranscript('2 Kings')!;
    const rows = tenStopsTranscriptRows(segs, SECOND_KINGS.movements);
    const headers = rows.filter((r) => r.kind === 'header');
    expect(headers).toHaveLength(11); // Introduction + the ten stops
    expect(headers[0]).toEqual({ kind: 'header', label: 'Introduction' });
    expect(headers[1]).toEqual({
      kind: 'header',
      label: 'A Test of Faith',
      passage: '2 Kings 2:1-8',
    });
    expect(headers[10]).toEqual({
      kind: 'header',
      label: 'A Man Named Evil',
      passage: '2 Kings 25:27-30',
    });
    const segRows = rows.filter((r) => r.kind === 'segment');
    expect(segRows).toHaveLength(segs.length);
    const introCount = segs.filter((s) => s.startSec < SECOND_KINGS.movements[0].startSec).length;
    const firstHeaderAt = rows.findIndex((r) => r.kind === 'header' && r.label === 'A Test of Faith');
    expect(rows.slice(1, firstHeaderAt).filter((r) => r.kind === 'segment')).toHaveLength(
      introCount,
    );
  });

  it('the active segment is the last one begun at the position', () => {
    const segs = tenStopsTranscript('2 Kings')!;
    expect(activeTenStopsTranscriptSegment(segs, 0)).toBe(0);
    expect(activeTenStopsTranscriptSegment(segs, -5)).toBe(-1);
    // At Stop 10's first second, the lit segment is the first one
    // at or after it — the segment the announcement opens.
    const at = activeTenStopsTranscriptSegment(segs, 1354.1);
    expect(segs[at].startSec).toBeLessThanOrEqual(1354.1);
    expect(segs[at + 1].startSec).toBeGreaterThan(1354.1);
    // Deep in the last stop, the active segment is near the end.
    const late = activeTenStopsTranscriptSegment(segs, 1520);
    expect(late).toBeGreaterThan(segs.length - 10);
  });
});
