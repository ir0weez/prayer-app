// ─── v508 — Ten Stops: Genesis + Deuteronomy registered, transcripts in ────
// Part A: two more tours join the registry (Hebrews, v501/v506,
// was the only one). Both were made the same way — NotebookLM
// Deep Dive tours of Jonathan's own commentary notes, from the
// stop lists he locked (Genesis: the daily check-in sessions'
// verdicts on his best writing; Deuteronomy: the same logic,
// four stops matching his own dinner list) — generated, then
// verified against their own transcripts stop-by-stop in order,
// then hosted in the ten-stops-library release at the exact byte
// sizes pinned here. Everything the registry drives — the book
// page's card, the downloads home, the v507 chapter indicators —
// lights up for both books from the registry alone.
//
// Part B: the transcript follow-along he was owed — the tour's
// own words in the player, not just the guidepost timings the
// transcript produced (v506). Each session now carries its
// transcript at segment level (lib/ten-stops-transcripts.ts,
// generated from the tours' word-timed transcripts, shipped
// as transcribed — ASR garbles and all; nothing smoothed,
// nothing invented). Pinned here at the model level; the
// player's render is pinned in ten-stops-v508-listen.test.tsx.

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { formatClock, getDevotional } from '../devotionals';
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

// The stops exactly as the tours' stops.json files carry them
// (read from ~/workspace/devotionals/transcripts/{book}-ten-stops/
// stops.json — the announcement seconds of the verified runs).
const GENESIS_STOPS = [
  { title: 'The Family of Seth', passage: 'Genesis 5:6-32', startSec: 88.9 },
  { title: 'The Purpose of Grace', passage: 'Genesis 6:8-22', startSec: 231.5 },
  { title: "God's Covenant With Noah", passage: 'Genesis 9:1-17', startSec: 377.6 },
  { title: 'God Makes Abraham', passage: 'Genesis 17:1-8', startSec: 525.3 },
  { title: 'The Lord Provides Himself', passage: 'Genesis 22:3-14', startSec: 632.7 },
  { title: 'A Split in Family Values', passage: 'Genesis 25:24-28', startSec: 759.3 },
  { title: 'Israel Is Born', passage: 'Genesis 32:22-32', startSec: 875.5 },
  { title: 'The Favorite Child', passage: 'Genesis 37:1-4', startSec: 1005.3 },
  { title: 'Joseph Reveals Himself', passage: 'Genesis 45:1-15', startSec: 1098.2 },
  { title: 'God Meant It For Good', passage: 'Genesis 50:15-21', startSec: 1188.5 },
];
const DEUTERONOMY_STOPS = [
  { title: "Israel's Refusal to Enter the Land", passage: 'Deuteronomy 1:19-33', startSec: 103.0 },
  { title: 'Turning Away Is Easy', passage: 'Deuteronomy 4:9-14', startSec: 292.2 },
  { title: 'The Great Commandment', passage: 'Deuteronomy 6:1-9', startSec: 477.3 },
  { title: "A Reminder About God's Leadership", passage: 'Deuteronomy 11:1-7', startSec: 608.7 },
  { title: 'One Place of Worship', passage: 'Deuteronomy 12:2-14', startSec: 723.1 },
  { title: 'God Provides', passage: 'Deuteronomy 16:9-12', startSec: 809.0 },
  { title: 'God Provides', passage: 'Deuteronomy 18:6-8', startSec: 905.3 },
  { title: 'Stoning Children', passage: 'Deuteronomy 21:18-21', startSec: 988.0 },
  { title: 'Unto You A God', passage: 'Deuteronomy 29:10-13', startSec: 1067.8 },
  { title: 'A Future Rebuilding', passage: 'Deuteronomy 30:1-10', startSec: 1118.0 },
];

// ─── Part A — the registry holds three tours ────────────────────────────────

describe('v508 Ten Stops registry — three tours', () => {
  it('exactly three, in the order Hebrews, Genesis, Deuteronomy', () => {
    // v511 RE-BASE (2026-11-12): Joshua was generated, verified
    // and hosted the same way and registered in v511, appended
    // after Deuteronomy — the registry now holds four; the
    // v508 three still lead in the same order.
    // v516 RE-BASE (2026-11-12): Ruth was generated, verified
    // and hosted the same way and registered in v516, appended
    // after Joshua — the registry now holds five; the v508
    // three still lead in the same order.
    const all = tenStopsRegistry();
    expect(all.length).toBe(5);
    expect(all.map((e) => e.book)).toEqual([
      'Hebrews',
      'Genesis',
      'Deuteronomy',
      'Joshua',
      'Ruth',
    ]);
  });

  it('Genesis at its hosted facts', () => {
    expect(GENESIS.title).toBe('Ten Stops in Genesis');
    expect(GENESIS.fileName).toBe('genesis-ten-stops.m4a');
    expect(GENESIS.sizeBytes).toBe(7199654);
    expect(GENESIS.durationSec).toBe(1365);
    expect(formatClock(GENESIS.durationSec)).toBe('22:45');
    const url = new URL(GENESIS.url);
    expect(url.host).toBe('github.com');
    expect(url.pathname).toBe(
      '/ir0weez/prayer-app/releases/download/ten-stops-library/genesis-ten-stops.m4a',
    );
  });

  it('Deuteronomy at its hosted facts', () => {
    expect(DEUTERONOMY.title).toBe('Ten Stops in Deuteronomy');
    expect(DEUTERONOMY.fileName).toBe('deuteronomy-ten-stops.m4a');
    expect(DEUTERONOMY.sizeBytes).toBe(6394966);
    expect(DEUTERONOMY.durationSec).toBe(1211);
    expect(formatClock(DEUTERONOMY.durationSec)).toBe('20:11');
    const url = new URL(DEUTERONOMY.url);
    expect(url.host).toBe('github.com');
    expect(url.pathname).toBe(
      '/ir0weez/prayer-app/releases/download/ten-stops-library/deuteronomy-ten-stops.m4a',
    );
  });

  it('Genesis carries exactly the transcript’s ten stops', () => {
    expect(GENESIS.movements).toEqual(GENESIS_STOPS);
    expect(GENESIS.movements[0].startSec).toBe(88.9);
    expect(GENESIS.movements[9].startSec).toBe(1188.5);
  });

  it('Deuteronomy carries exactly the transcript’s ten stops', () => {
    expect(DEUTERONOMY.movements).toEqual(DEUTERONOMY_STOPS);
    expect(DEUTERONOMY.movements[0].startSec).toBe(103.0);
    expect(DEUTERONOMY.movements[9].startSec).toBe(1118.0);
  });

  it('Hebrews is untouched by the registration', () => {
    expect(HEBREWS.sizeBytes).toBe(5854696);
    expect(HEBREWS.durationSec).toBe(1110);
    expect(HEBREWS.movements).toHaveLength(10);
    expect(HEBREWS.movements[0].startSec).toBe(109.3);
    expect(HEBREWS.movements[9].startSec).toBe(959.3);
  });
});

// ─── Part A — the v507 indicators read the new tours from the registry ─────

describe('v508 indicators — Genesis and Deuteronomy stop chapters', () => {
  it('Genesis maps its ten stop chapters to their STOP numbers', () => {
    const map = tenStopChapterMap(GENESIS);
    const asObj: Record<number, number> = {};
    for (const [ch, mark] of map) asObj[ch] = mark.stop;
    expect(asObj).toEqual({
      5: 1, 6: 2, 9: 3, 17: 4, 22: 5, 25: 6, 32: 7, 37: 8, 45: 9, 50: 10,
    });
    expect(tenStopMarks(GENESIS)).toHaveLength(10);
  });

  it('Genesis 32 carries Stop 7 — Israel Is Born', () => {
    const mark = stopMarkForChapter(GENESIS, 32);
    expect(mark?.stop).toBe(7);
    expect(mark?.title).toBe('Israel Is Born');
    expect(mark?.startSec).toBe(875.5);
    expect(mark?.rangeLabel).toBe('32:22–32');
  });

  it('Deuteronomy maps its ten stop chapters to their STOP numbers', () => {
    const map = tenStopChapterMap(DEUTERONOMY);
    const asObj: Record<number, number> = {};
    for (const [ch, mark] of map) asObj[ch] = mark.stop;
    expect(asObj).toEqual({
      1: 1, 4: 2, 6: 3, 11: 4, 12: 5, 16: 6, 18: 7, 21: 8, 29: 9, 30: 10,
    });
    expect(tenStopMarks(DEUTERONOMY)).toHaveLength(10);
  });

  it('Deuteronomy 18 carries Stop 7 — God Provides, at the steering-verified stop', () => {
    const mark = stopMarkForChapter(DEUTERONOMY, 18);
    expect(mark?.stop).toBe(7);
    expect(mark?.title).toBe('God Provides');
    expect(mark?.startSec).toBe(905.3);
    expect(mark?.rangeLabel).toBe('18:6–8');
  });

  it('a Genesis chapter with no stop answers null, as most chapters do', () => {
    expect(stopMarkForChapter(GENESIS, 1)).toBeNull();
    expect(stopMarkForChapter(DEUTERONOMY, 2)).toBeNull();
  });
});

// ─── Part A — the downloads model lists all three, in their book colours ───

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

describe('v508 downloads — all three tours, disk truth and book colours', () => {
  it('lists all three at their registry sizes, newest first', async () => {
    fake.files.set(uriFor(HEBREWS), { size: HEBREWS.sizeBytes, mtime: 100 });
    fake.files.set(uriFor(DEUTERONOMY), { size: DEUTERONOMY.sizeBytes, mtime: 200 });
    fake.files.set(uriFor(GENESIS), { size: GENESIS.sizeBytes, mtime: 300 });
    const items = await refreshDownloads();
    expect(items.map((i) => i.entry.book)).toEqual(['Genesis', 'Deuteronomy', 'Hebrews']);
    expect(items.map((i) => i.sizeBytes)).toEqual([
      GENESIS.sizeBytes,
      DEUTERONOMY.sizeBytes,
      HEBREWS.sizeBytes,
    ]);
    expect(items.every((i) => i.kind === 'ten-stops')).toBe(true);
  });

  it('each tour dresses in its own book’s colours — both Law books in the RED family', () => {
    const genesis = bookColorsFor('Genesis', false)!;
    const deuteronomy = bookColorsFor('Deuteronomy', false)!;
    const hebrews = bookColorsFor('Hebrews', false)!;
    // The v420 bands: Genesis–Deuteronomy is the RED band, so the
    // two new tours share a family; Hebrews wears VIOLET.
    expect(genesis.hue).toBe('red');
    expect(deuteronomy.hue).toBe('red');
    expect(genesis.primary).toBe(deuteronomy.primary);
    expect(hebrews.hue).toBe('violet');
    expect(hebrews.primary).not.toBe(genesis.primary);
  });
});

// ─── Part B — the transcript data and its model ─────────────────────────────

describe('v508 transcripts — the tours’ own words, at segment level', () => {
  it('each tour’s transcript is present at its transcribed segment count', () => {
    expect(tenStopsTranscript('Hebrews')).toHaveLength(201);
    expect(tenStopsTranscript('Genesis')).toHaveLength(506);
    expect(tenStopsTranscript('Deuteronomy')).toHaveLength(400);
    // v511 RE-BASE (2026-11-12): Joshua's transcript landed
    // with its tour in v511 (289 segments; pinned in
    // ten-stops-v511.test.ts). Ruth — no tour — carries the
    // null case instead.
    // v516 RE-BASE (2026-11-12): Ruth's transcript landed with
    // its tour in v516 (226 segments; pinned in
    // ten-stops-v516.test.ts). 1 Samuel — no tour — carries
    // the null case instead.
    expect(tenStopsTranscript('Joshua')).toHaveLength(289);
    expect(tenStopsTranscript('Ruth')).toHaveLength(226);
    expect(tenStopsTranscript('1 Samuel')).toBeNull();
  });

  it('segments open at 0 and stay in spoken order for every tour', () => {
    for (const book of ['Hebrews', 'Genesis', 'Deuteronomy']) {
      const segs = tenStopsTranscript(book)!;
      expect(segs[0].startSec).toBe(0);
      for (let i = 1; i < segs.length; i++) {
        expect(segs[i].startSec).toBeGreaterThanOrEqual(segs[i - 1].startSec);
      }
      expect(segs.every((s) => s.text.length > 0)).toBe(true);
    }
  });

  it('sessions carry their transcript; chapter devotionals carry none', () => {
    for (const entry of [HEBREWS, GENESIS, DEUTERONOMY]) {
      const session = tenStopsAsDevotional(entry);
      expect(session.transcriptSegments).toBe(tenStopsTranscript(entry.book));
      expect(session.transcriptSegments!.length).toBeGreaterThan(0);
    }
    const chapter = getDevotional('Genesis', 1)!;
    expect(chapter.transcriptSegments).toBeUndefined();
  });

  it('rows group pre-Stop-1 segments under Introduction, then under their stops', () => {
    const segs = tenStopsTranscript('Genesis')!;
    const rows = tenStopsTranscriptRows(segs, GENESIS.movements);
    const headers = rows.filter((r) => r.kind === 'header');
    expect(headers).toHaveLength(11); // Introduction + the ten stops
    expect(headers[0]).toEqual({ kind: 'header', label: 'Introduction' });
    expect(headers[1]).toEqual({
      kind: 'header',
      label: 'The Family of Seth',
      passage: 'Genesis 5:6-32',
    });
    expect(headers[10]).toEqual({
      kind: 'header',
      label: 'God Meant It For Good',
      passage: 'Genesis 50:15-21',
    });
    // Every segment appears exactly once, in order.
    const segRows = rows.filter((r) => r.kind === 'segment');
    expect(segRows).toHaveLength(segs.length);
    // The Introduction holds exactly the segments spoken before
    // Stop 1's announcement.
    const introCount = segs.filter((s) => s.startSec < GENESIS.movements[0].startSec).length;
    const firstHeaderAt = rows.findIndex((r) => r.kind === 'header' && r.label === 'The Family of Seth');
    expect(rows.slice(1, firstHeaderAt).filter((r) => r.kind === 'segment')).toHaveLength(introCount);
  });

  it('the active segment is the last one begun at the position', () => {
    const segs = tenStopsTranscript('Hebrews')!;
    expect(activeTenStopsTranscriptSegment(segs, 0)).toBe(0);
    expect(activeTenStopsTranscriptSegment(segs, -5)).toBe(-1);
    // At Stop 6's first second, the lit segment is the first one
    // at or after it — the segment the announcement opens.
    const at = activeTenStopsTranscriptSegment(segs, 605.8);
    expect(segs[at].startSec).toBeLessThanOrEqual(605.8);
    expect(segs[at + 1].startSec).toBeGreaterThan(605.8);
    // Deep in the last stop, the active segment is near the end.
    const late = activeTenStopsTranscriptSegment(segs, 1100);
    expect(late).toBeGreaterThan(segs.length - 10);
  });
});
