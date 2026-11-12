// ─── v511 — Ten Stops: Joshua registered (the fourth tour) ─────────────────
// Joshua joins the registry in exactly the v508 shape: a
// NotebookLM Deep Dive tour of Jonathan's own commentary notes,
// from the stop list he approved on 2026-11-12 (the daily
// check-in sessions' verdicts on his best writing — the same
// logic as Genesis and Deuteronomy; no steering calls were
// needed, none of the ten carries a superseded position) —
// generated, verified against its own transcript stop-by-stop
// in order, then hosted in the ten-stops-library release at the
// exact byte size pinned here. Everything the registry drives —
// the book page's card, the downloads home, the v507 chapter
// indicators — lights up for Joshua from the registry alone,
// and its session carries its transcript (289 segments) for
// the player's follow-along, pinned at the model level here;
// the render is pinned in ten-stops-v511-listen.test.tsx.

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { formatClock } from '../devotionals';
import { getTenStops, tenStopsAsDevotional, tenStopsRegistry, type TenStops } from '../ten-stops';
import {
  activeTenStopsTranscriptSegment,
  tenStopsTranscript,
  tenStopsTranscriptRows,
} from '../ten-stops-transcripts';
import { stopMarkForChapter, tenStopChapterMap, tenStopMarks } from '../ten-stops-indicator';
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

// The stops exactly as the tour's stops.json carries them
// (read from ~/workspace/devotionals/transcripts/joshua-ten-stops/
// stops.json — the announcement seconds of the verified run).
const JOSHUA_STOPS = [
  { title: 'God Encourages Joshua', passage: 'Joshua 1:1-9', startSec: 119.9 },
  { title: 'Spies Sent', passage: 'Joshua 2:1-7', startSec: 270.0 },
  { title: 'A Time of Rest', passage: 'Joshua 5:2-9', startSec: 427.9 },
  { title: 'The Hurtful End', passage: 'Joshua 7:22-26', startSec: 565.6 },
  { title: 'Tricking Ai', passage: 'Joshua 8:3-9', startSec: 710.3 },
  { title: 'The Miracles of God', passage: 'Joshua 10:12-14', startSec: 824.4 },
  { title: 'Outside the Land', passage: 'Joshua 12:1-6', startSec: 950.7 },
  { title: 'A Promise Kept', passage: 'Joshua 14:13-15', startSec: 1075.2 },
  { title: "Land's Still Missing Inheritance", passage: 'Joshua 18:1-7', startSec: 1204.4 },
  { title: 'The Accusation', passage: 'Joshua 22:13-20', startSec: 1304.7 },
];

// ─── The registry holds four tours ──────────────────────────────────────────

describe('v511 Ten Stops registry — four tours', () => {
  it('exactly four, Joshua appended after Deuteronomy, Hebrews still first', () => {
    // v516 RE-BASE (2026-11-12): Ruth was generated, verified
    // and hosted the same way and registered in v516, appended
    // after Joshua — the registry now holds five; the four
    // tours of v511 still lead in the same order.
    const all = tenStopsRegistry();
    expect(all.length).toBe(5);
    expect(all.map((e) => e.book)).toEqual([
      'Hebrews',
      'Genesis',
      'Deuteronomy',
      'Joshua',
      'Ruth',
    ]);
    expect(all[0].book).toBe('Hebrews');
  });

  it('Joshua at its hosted facts', () => {
    expect(JOSHUA.title).toBe('Ten Stops in Joshua');
    expect(JOSHUA.fileName).toBe('joshua-ten-stops.m4a');
    expect(JOSHUA.sizeBytes).toBe(8094054);
    expect(JOSHUA.durationSec).toBe(1533);
    expect(formatClock(JOSHUA.durationSec)).toBe('25:33');
    const url = new URL(JOSHUA.url);
    expect(url.host).toBe('github.com');
    expect(url.pathname).toBe(
      '/ir0weez/prayer-app/releases/download/ten-stops-library/joshua-ten-stops.m4a',
    );
  });

  it('Joshua carries exactly the transcript’s ten stops', () => {
    expect(JOSHUA.movements).toEqual(JOSHUA_STOPS);
    expect(JOSHUA.movements[0].startSec).toBe(119.9);
    expect(JOSHUA.movements[9].startSec).toBe(1304.7);
  });

  it('the v508 three are untouched by the registration', () => {
    expect(HEBREWS.sizeBytes).toBe(5854696);
    expect(GENESIS.sizeBytes).toBe(7199654);
    expect(DEUTERONOMY.sizeBytes).toBe(6394966);
    expect(HEBREWS.movements).toHaveLength(10);
    expect(GENESIS.movements).toHaveLength(10);
    expect(DEUTERONOMY.movements).toHaveLength(10);
  });
});

// ─── The v507 indicators read Joshua from the registry ──────────────────────

describe('v511 indicators — Joshua stop chapters', () => {
  it('Joshua maps its ten stop chapters to their STOP numbers', () => {
    const map = tenStopChapterMap(JOSHUA);
    const asObj: Record<number, number> = {};
    for (const [ch, mark] of map) asObj[ch] = mark.stop;
    expect(asObj).toEqual({
      1: 1, 2: 2, 5: 3, 7: 4, 8: 5, 10: 6, 12: 7, 14: 8, 18: 9, 22: 10,
    });
    expect(tenStopMarks(JOSHUA)).toHaveLength(10);
  });

  it('Joshua 22 carries Stop 10 — The Accusation', () => {
    const mark = stopMarkForChapter(JOSHUA, 22);
    expect(mark?.stop).toBe(10);
    expect(mark?.title).toBe('The Accusation');
    expect(mark?.startSec).toBe(1304.7);
    expect(mark?.rangeLabel).toBe('22:13–20');
  });

  it('Joshua 1 carries Stop 1 — God Encourages Joshua', () => {
    const mark = stopMarkForChapter(JOSHUA, 1);
    expect(mark?.stop).toBe(1);
    expect(mark?.title).toBe('God Encourages Joshua');
    expect(mark?.startSec).toBe(119.9);
    expect(mark?.rangeLabel).toBe('1:1–9');
  });

  it('a Joshua chapter with no stop answers null, as most chapters do', () => {
    expect(stopMarkForChapter(JOSHUA, 3)).toBeNull();
    expect(stopMarkForChapter(JOSHUA, 24)).toBeNull();
  });
});

// ─── The downloads model lists all four, in their book colours ──────────────

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

describe('v511 downloads — all four tours, disk truth and book colours', () => {
  it('lists all four at their registry sizes, newest first', async () => {
    fake.files.set(uriFor(HEBREWS), { size: HEBREWS.sizeBytes, mtime: 100 });
    fake.files.set(uriFor(GENESIS), { size: GENESIS.sizeBytes, mtime: 200 });
    fake.files.set(uriFor(DEUTERONOMY), { size: DEUTERONOMY.sizeBytes, mtime: 300 });
    fake.files.set(uriFor(JOSHUA), { size: JOSHUA.sizeBytes, mtime: 400 });
    const items = await refreshDownloads();
    expect(items.map((i) => i.entry.book)).toEqual([
      'Joshua',
      'Deuteronomy',
      'Genesis',
      'Hebrews',
    ]);
    expect(items.map((i) => i.sizeBytes)).toEqual([
      JOSHUA.sizeBytes,
      DEUTERONOMY.sizeBytes,
      GENESIS.sizeBytes,
      HEBREWS.sizeBytes,
    ]);
    expect(items.every((i) => i.kind === 'ten-stops')).toBe(true);
  });

  it('Joshua dresses in the ORANGE family — the Joshua–Esther band', () => {
    const joshua = bookColorsFor('Joshua', false)!;
    const genesis = bookColorsFor('Genesis', false)!;
    const hebrews = bookColorsFor('Hebrews', false)!;
    // The v420 bands: Joshua–Esther is the ORANGE band; the Law
    // books wear RED, Hebrews wears VIOLET.
    expect(joshua.hue).toBe('orange');
    expect(joshua.primary).not.toBe(genesis.primary);
    expect(joshua.primary).not.toBe(hebrews.primary);
    expect(genesis.hue).toBe('red');
    expect(hebrews.hue).toBe('violet');
  });
});

// ─── The Joshua transcript data and its model ───────────────────────────────

describe('v511 transcript — Joshua’s own words, at segment level', () => {
  it('the Joshua transcript is present at its transcribed segment count', () => {
    expect(tenStopsTranscript('Joshua')).toHaveLength(289);
  });

  it('segments open at 0 and stay in spoken order', () => {
    const segs = tenStopsTranscript('Joshua')!;
    expect(segs[0].startSec).toBe(0);
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i].startSec).toBeGreaterThanOrEqual(segs[i - 1].startSec);
    }
    expect(segs.every((s) => s.text.length > 0)).toBe(true);
    expect(segs[segs.length - 1].startSec).toBeLessThan(JOSHUA.durationSec);
  });

  it('the Joshua session carries its transcript through tenStopsAsDevotional', () => {
    const session = tenStopsAsDevotional(JOSHUA);
    expect(session.transcriptSegments).toBe(tenStopsTranscript('Joshua'));
    expect(session.transcriptSegments).toHaveLength(289);
    expect(session.movements).toEqual(JOSHUA.movements);
  });

  it('rows group pre-Stop-1 segments under Introduction, then under their stops', () => {
    const segs = tenStopsTranscript('Joshua')!;
    const rows = tenStopsTranscriptRows(segs, JOSHUA.movements);
    const headers = rows.filter((r) => r.kind === 'header');
    expect(headers).toHaveLength(11); // Introduction + the ten stops
    expect(headers[0]).toEqual({ kind: 'header', label: 'Introduction' });
    expect(headers[1]).toEqual({
      kind: 'header',
      label: 'God Encourages Joshua',
      passage: 'Joshua 1:1-9',
    });
    expect(headers[10]).toEqual({
      kind: 'header',
      label: 'The Accusation',
      passage: 'Joshua 22:13-20',
    });
    const segRows = rows.filter((r) => r.kind === 'segment');
    expect(segRows).toHaveLength(segs.length);
    const introCount = segs.filter((s) => s.startSec < JOSHUA.movements[0].startSec).length;
    const firstHeaderAt = rows.findIndex(
      (r) => r.kind === 'header' && r.label === 'God Encourages Joshua',
    );
    expect(rows.slice(1, firstHeaderAt).filter((r) => r.kind === 'segment')).toHaveLength(
      introCount,
    );
  });

  it('the active segment is the last one begun at the position', () => {
    const segs = tenStopsTranscript('Joshua')!;
    expect(activeTenStopsTranscriptSegment(segs, 0)).toBe(0);
    expect(activeTenStopsTranscriptSegment(segs, -5)).toBe(-1);
    // At Stop 10's first second, the lit segment is the first one
    // at or after it — the segment the announcement opens.
    const at = activeTenStopsTranscriptSegment(segs, 1304.7);
    expect(segs[at].startSec).toBeLessThanOrEqual(1304.7);
    expect(segs[at + 1].startSec).toBeGreaterThan(1304.7);
    // Deep in the last stop, the active segment is near the end.
    const late = activeTenStopsTranscriptSegment(segs, 1500);
    expect(late).toBeGreaterThan(segs.length - 10);
  });
});
