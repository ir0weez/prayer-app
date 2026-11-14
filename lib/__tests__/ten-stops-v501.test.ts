// ─── v501 — Ten Stops in the app, download-on-demand ───────────────────────
// Jonathan's design ("Love it. Let's do it.", Nov 11): a book's
// Ten Stops tour lives at the TOP of its book page, before
// chapter 1 — but the audio does NOT ship in the app. It is
// hosted, downloaded on demand (~5.6 MB for Hebrews), played
// through the same devotional player as a BOOK-level session, and
// removable at any time, with re-download just working. The cut
// and the length are his ruling: Hebrews' 18:30 middle cut is the
// app cut (standing target ~15–20 minutes a book). Pinned here:
//  - the registry's integrity (exact hosted facts, nothing else);
//  - the entry renders only for registered books;
//  - the download state machine, against a filesystem double —
//    progress, cancel cleans the partial, a wrong-size arrival is
//    discarded, delete frees and re-download works, and "ready"
//    is always DISK TRUTH, never a flag;
//  - the book-level player session: no chapter numeral, no verse
//    facts, the honest facts lines, the shared context line;
//  - and the APK rule: no Ten Stops audio lands in assets/.

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  devotionalBigIdea,
  devotionalContextLine,
  devotionalFacts,
  devotionalGuideposts,
  devotionalKey,
  formatClock,
  getDevotional,
} from '../devotionals';
import {
  formatTenStopsSize,
  getTenStops,
  tenStopsAsDevotional,
  tenStopsRegistry,
  tenStopsSubline,
} from '../ten-stops';
import {
  cancelTenStopsDownload,
  deleteTenStopsDownload,
  getTenStopsDownloadSnapshot,
  refreshTenStopsDownload,
  resetTenStopsDownloadsForTests,
  setTenStopsFileSystemForTests,
  startTenStopsDownload,
  tenStopsLocalSource,
  type TenStopsFileSystem,
} from '../ten-stops-download';

const root = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

const HEBREWS = getTenStops('Hebrews')!;
const FILE_URI = 'file:///docs/ten-stops/hebrews-ten-stops.m4a';
const tick = () => new Promise((r) => setTimeout(r, 0));

// ─── The filesystem double ──────────────────────────────────────────────────
// An in-memory disk plus downloads the test drives by hand: each
// createDownloadResumable parks a pending transfer the test can
// progress, complete (by writing the file's size first), or fail.

interface PendingDownload {
  url: string;
  fileUri: string;
  callback: (p: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void;
  resolve: (r: { uri: string; status: number } | undefined) => void;
  reject: (e: unknown) => void;
  pauseCalls: number;
}

function makeFakeFileSystem() {
  const files = new Map<string, number>();
  const pending: PendingDownload[] = [];
  const fs: TenStopsFileSystem = {
    documentDirectory: 'file:///docs/',
    getInfoAsync: async (path: string) =>
      files.has(path) ? { exists: true, size: files.get(path) } : { exists: false },
    makeDirectoryAsync: async () => undefined,
    deleteAsync: async (path: string) => {
      files.delete(path);
    },
    createDownloadResumable: (url, fileUri, callback) => {
      let resolveFn!: PendingDownload['resolve'];
      let rejectFn!: PendingDownload['reject'];
      const promise = new Promise<{ uri: string; status: number } | undefined>((res, rej) => {
        resolveFn = res;
        rejectFn = rej;
      });
      const item: PendingDownload = { url, fileUri, callback, resolve: resolveFn, reject: rejectFn, pauseCalls: 0 };
      pending.push(item);
      return {
        downloadAsync: () => promise,
        pauseAsync: async () => {
          item.pauseCalls += 1;
          item.resolve(undefined);
        },
      };
    },
  };
  return { fs, files, pending };
}

let fake = makeFakeFileSystem();

beforeEach(() => {
  fake = makeFakeFileSystem();
  resetTenStopsDownloadsForTests();
  setTenStopsFileSystemForTests(fake.fs);
});

afterAll(() => {
  setTenStopsFileSystemForTests(null);
  resetTenStopsDownloadsForTests();
});

/** Start a download and wait until its transfer is parked. */
async function startAndPark() {
  const done = startTenStopsDownload(HEBREWS);
  await tick();
  expect(fake.pending.length).toBeGreaterThan(0);
  return { done, transfer: fake.pending[fake.pending.length - 1] };
}

// ─── The registry ───────────────────────────────────────────────────────────

describe('v501 Ten Stops registry', () => {
  it('carries the tours at their hosted facts, Hebrews first', () => {
    // v508 RE-BASE (2026-11-11): v501 shipped with exactly one
    // tour (Hebrews). Genesis and Deuteronomy were generated,
    // verified and hosted the same way and registered in v508 —
    // the registry now holds three; Hebrews still leads.
    // v511 RE-BASE (2026-11-12): Joshua was generated, verified
    // and hosted the same way and registered in v511 — the
    // registry now holds four; Hebrews still leads.
    // v516 RE-BASE (2026-11-12): Ruth was generated, verified
    // and hosted the same way and registered in v516 — the
    // registry now holds five; Hebrews still leads.
    // v518 RE-BASE (2026-11-12): 1 Samuel and 2 Samuel were
    // generated, verified and hosted the same way and
    // registered together in v518 — the registry now holds
    // seven; Hebrews still leads.
    const all = tenStopsRegistry();
    expect(all.length).toBe(7);
    const e = all[0];
    expect(e.book).toBe('Hebrews');
    expect(e.title).toBe('Ten Stops in Hebrews');
    expect(e.fileName).toBe('hebrews-ten-stops.m4a');
    expect(e.sizeBytes).toBe(5854696);
    expect(e.sizeBytes).toBeGreaterThan(0);
  });

  it('the URL is the ten-stops-library release asset, exact host and path', () => {
    const url = new URL(HEBREWS.url);
    expect(url.protocol).toBe('https:');
    expect(url.host).toBe('github.com');
    expect(url.pathname).toBe(
      '/ir0weez/prayer-app/releases/download/ten-stops-library/hebrews-ten-stops.m4a',
    );
    expect(HEBREWS.url.endsWith(`/${HEBREWS.fileName}`)).toBe(true);
  });

  it('the duration is the shown 18:30, everywhere it is rendered', () => {
    expect(HEBREWS.durationSec).toBe(1110);
    expect(formatClock(HEBREWS.durationSec)).toBe('18:30');
    expect(tenStopsSubline(HEBREWS)).toBe('18:30 · a tour of the book in ten stops');
    expect(formatTenStopsSize(HEBREWS.sizeBytes)).toBe('5.6 MB');
  });

  it('books without a tour get null — no entry, no dead door', () => {
    // v508 RE-BASE (2026-11-11): Genesis held this null seat in
    // v501; it has a tour now. Joshua (commentary complete, no
    // tour) carries the null case instead.
    // v511 RE-BASE (2026-11-12): Joshua has a tour now too.
    // Ruth (commentary complete, no tour) carries the null
    // case instead.
    // v516 RE-BASE (2026-11-12): Ruth has a tour now too.
    // 1 Samuel (commentary complete, no tour) carries the null
    // case instead.
    // v518 RE-BASE (2026-11-12): 1 Samuel and 2 Samuel have
    // tours now too. 1 Kings (commentary complete, no tour)
    // carries the null case instead.
    expect(getTenStops('1 Kings')).toBeNull();
    expect(getTenStops('Romans')).toBeNull();
    expect(getTenStops('Not A Book')).toBeNull();
  });

  it('the registry hands out copies, never its own entries', () => {
    const copy = tenStopsRegistry();
    copy[0].sizeBytes = 1;
    expect(getTenStops('Hebrews')!.sizeBytes).toBe(5854696);
  });
});

// ─── The download state machine ─────────────────────────────────────────────

describe('v501 Ten Stops download state machine', () => {
  it('idle → downloading (with real progress) → ready, verified by size', async () => {
    expect(getTenStopsDownloadSnapshot('Hebrews')).toEqual({ status: 'idle' });
    const { done, transfer } = await startAndPark();
    expect(transfer.url).toBe(HEBREWS.url);
    expect(transfer.fileUri).toBe(FILE_URI);
    expect(getTenStopsDownloadSnapshot('Hebrews')).toEqual({
      status: 'downloading',
      writtenBytes: 0,
      fraction: 0,
    });
    transfer.callback({ totalBytesWritten: 2927348, totalBytesExpectedToWrite: 5854696 });
    const mid = getTenStopsDownloadSnapshot('Hebrews');
    expect(mid.status).toBe('downloading');
    if (mid.status === 'downloading') {
      expect(mid.writtenBytes).toBe(2927348);
      expect(mid.fraction).toBeCloseTo(0.5, 3);
    }
    fake.files.set(FILE_URI, HEBREWS.sizeBytes);
    transfer.resolve({ uri: FILE_URI, status: 200 });
    await done;
    expect(getTenStopsDownloadSnapshot('Hebrews')).toEqual({ status: 'ready' });
    expect(tenStopsLocalSource(HEBREWS)).toEqual({ uri: FILE_URI });
  });

  it('a wrong-size arrival is discarded — never a partial kept as ready', async () => {
    const { done, transfer } = await startAndPark();
    fake.files.set(FILE_URI, 12345);
    transfer.resolve({ uri: FILE_URI, status: 200 });
    await done;
    const s = getTenStopsDownloadSnapshot('Hebrews');
    expect(s.status).toBe('error');
    expect(fake.files.has(FILE_URI)).toBe(false);
    expect(tenStopsLocalSource(HEBREWS)).toBeNull();
  });

  it('a failed transfer errors and leaves no file behind', async () => {
    const { done, transfer } = await startAndPark();
    fake.files.set(FILE_URI, 999);
    transfer.reject(new Error('network down'));
    await done;
    expect(getTenStopsDownloadSnapshot('Hebrews').status).toBe('error');
    expect(fake.files.has(FILE_URI)).toBe(false);
  });

  it('an interrupted transfer (no result, no cancel) errors too', async () => {
    const { done, transfer } = await startAndPark();
    transfer.resolve(undefined);
    await done;
    expect(getTenStopsDownloadSnapshot('Hebrews').status).toBe('error');
  });

  it('cancel pauses, removes the partial, and settles to idle', async () => {
    const { done, transfer } = await startAndPark();
    transfer.callback({ totalBytesWritten: 1000000, totalBytesExpectedToWrite: 5854696 });
    fake.files.set(FILE_URI, 1000000); // the partial on disk
    await cancelTenStopsDownload(HEBREWS);
    await done;
    expect(transfer.pauseCalls).toBe(1);
    expect(getTenStopsDownloadSnapshot('Hebrews')).toEqual({ status: 'idle' });
    expect(fake.files.has(FILE_URI)).toBe(false);
    expect(tenStopsLocalSource(HEBREWS)).toBeNull();
  });

  it('delete removes only the local file; re-download reaches ready again', async () => {
    const first = await startAndPark();
    fake.files.set(FILE_URI, HEBREWS.sizeBytes);
    first.transfer.resolve({ uri: FILE_URI, status: 200 });
    await first.done;
    expect(getTenStopsDownloadSnapshot('Hebrews')).toEqual({ status: 'ready' });

    await deleteTenStopsDownload(HEBREWS);
    expect(getTenStopsDownloadSnapshot('Hebrews')).toEqual({ status: 'idle' });
    expect(fake.files.has(FILE_URI)).toBe(false);
    expect(tenStopsLocalSource(HEBREWS)).toBeNull();

    const second = await startAndPark();
    fake.files.set(FILE_URI, HEBREWS.sizeBytes);
    second.transfer.resolve({ uri: FILE_URI, status: 200 });
    await second.done;
    expect(getTenStopsDownloadSnapshot('Hebrews')).toEqual({ status: 'ready' });
    expect(tenStopsLocalSource(HEBREWS)).toEqual({ uri: FILE_URI });
  });

  it('ready is disk truth: a complete file already on disk reads ready with no download', async () => {
    fake.files.set(FILE_URI, HEBREWS.sizeBytes);
    const s = await refreshTenStopsDownload(HEBREWS);
    expect(s).toEqual({ status: 'ready' });
    expect(fake.pending.length).toBe(0);
    expect(tenStopsLocalSource(HEBREWS)).toEqual({ uri: FILE_URI });
  });

  it('a wrong-size file on disk is a partial: refresh clears it and reads idle', async () => {
    fake.files.set(FILE_URI, 42);
    const s = await refreshTenStopsDownload(HEBREWS);
    expect(s).toEqual({ status: 'idle' });
    expect(fake.files.has(FILE_URI)).toBe(false);
    expect(tenStopsLocalSource(HEBREWS)).toBeNull();
  });

  it('refresh during a download is a no-op — the in-flight write owns the file', async () => {
    const { done, transfer } = await startAndPark();
    const s = await refreshTenStopsDownload(HEBREWS);
    expect(s.status).toBe('downloading');
    fake.files.set(FILE_URI, HEBREWS.sizeBytes);
    transfer.resolve({ uri: FILE_URI, status: 200 });
    await done;
    expect(getTenStopsDownloadSnapshot('Hebrews')).toEqual({ status: 'ready' });
  });
});

// ─── The book-level player session ──────────────────────────────────────────

// The shared player controller, against a fake expo-audio player
// (the v293 pattern).
const fakeAudio = vi.hoisted(() => {
  const calls = { play: 0, pause: 0, replace: [] as unknown[] };
  const listeners = new Map<string, (status: unknown) => void>();
  const player = {
    play() {
      calls.play += 1;
    },
    pause() {
      calls.pause += 1;
    },
    seekTo() {
      return Promise.resolve();
    },
    replace(src: unknown) {
      calls.replace.push(src);
    },
    addListener(event: string, cb: (status: unknown) => void) {
      listeners.set(event, cb);
      return { remove: () => listeners.delete(event) };
    },
  };
  return {
    calls,
    createAudioPlayer: (_src: unknown, _opts: unknown) => player,
    reset() {
      calls.play = 0;
      calls.pause = 0;
      calls.replace = [];
    },
  };
});

vi.mock('expo-audio', () => ({ createAudioPlayer: fakeAudio.createAudioPlayer }));

import { getDevotionalPlayerSnapshot, openDevotional, stopDevotional } from '../devotional-player';

describe('v501 book-level player session', () => {
  beforeEach(() => {
    stopDevotional();
    fakeAudio.reset();
  });

  it('the tour as a devotional: book-level, chapter 0, no paragraphs, the real duration', () => {
    const d = tenStopsAsDevotional(HEBREWS);
    expect(d.bookLevel).toBe(true);
    expect(d.book).toBe('Hebrews');
    expect(d.chapter).toBe(0);
    expect(d.title).toBe('Ten Stops in Hebrews');
    expect(d.durationSec).toBe(1110);
    expect(d.paragraphs).toEqual([]);
    expect(d.audioFile).toBe('hebrews-ten-stops.m4a');
    // Its session key can never collide with a chapter's.
    expect(devotionalKey(d.book, d.chapter)).toBe('Hebrews|0');
  });

  it('no chapter facts are fabricated: the facts say what the tour IS', () => {
    const d = tenStopsAsDevotional(HEBREWS);
    expect(devotionalFacts(d, null, d.durationSec)).toEqual({
      range: 'Hebrews · the whole book',
      chapterLine: 'Ten stops',
      durationLine: '18:30 · a reading of his commentary',
    });
    // Even if a caller hands it a verse number, no verse range appears.
    expect(devotionalFacts(d, 176, d.durationSec).range).toBe('Hebrews · the whole book');
    // And the chapter facts are exactly as they were.
    const genesis12 = getDevotional('Genesis', 12)!;
    expect(devotionalFacts(genesis12, 20, genesis12.durationSec)).toEqual({
      range: 'Genesis 12:1–20',
      chapterLine: 'Chapter 12 of 50',
      durationLine: `${formatClock(genesis12.durationSec)} · a reading of his commentary`,
    });
  });

  it('no big-idea line is invented for the tour — and its guideposts are the transcript’s, not inventions', () => {
    // RE-BASE (v506, 2026-11-11): this pin originally expected
    // devotionalGuideposts(tour) to be null, on the v501 premise
    // that no timed source existed for the tour. That premise
    // ended when the tour's own transcript was produced and its
    // ten stop timings verified in order — the stops are real
    // data now, carried on the registry entry, so the guideposts
    // read as the ten stops. The big-idea half is unchanged: no
    // source carries one, so no line is invented.
    const d = tenStopsAsDevotional(HEBREWS);
    expect(devotionalBigIdea(d)).toBeNull();
    const guideposts = devotionalGuideposts(d);
    expect(guideposts).toHaveLength(10);
    expect(guideposts![0]).toEqual({ title: 'Lower Than Angels', passage: 'Hebrews 2:5-8', startSec: 109.3 });
    expect(guideposts![9]).toEqual({ title: 'Focus on Love', passage: 'Hebrews 13:1-7', startSec: 959.3 });
  });

  it('the context line is shared by pill and page, per level', () => {
    expect(devotionalContextLine(tenStopsAsDevotional(HEBREWS))).toBe('Hebrews · Ten Stops');
    expect(devotionalContextLine(getDevotional('Genesis', 12)!)).toBe('Genesis 12 · Devotional');
  });

  it('the controller loads the tour from its local file source and plays it', () => {
    const d = tenStopsAsDevotional(HEBREWS);
    expect(openDevotional(d, { uri: FILE_URI })).toBe(true);
    expect(fakeAudio.calls.play).toBe(1);
    const s = getDevotionalPlayerSnapshot();
    expect(s.devotional?.bookLevel).toBe(true);
    expect(s.devotional?.title).toBe('Ten Stops in Hebrews');
    expect(s.durationSec).toBe(1110);
    expect(s.playing).toBe(true);
  });

  it('without a local source the tour does not load; reopening it never restarts it', () => {
    const d = tenStopsAsDevotional(HEBREWS);
    expect(openDevotional(d, null)).toBe(false);
    expect(getDevotionalPlayerSnapshot().devotional).toBeNull();
    expect(openDevotional(d, { uri: FILE_URI })).toBe(true);
    fakeAudio.reset();
    expect(openDevotional(d, { uri: FILE_URI })).toBe(true);
    expect(fakeAudio.calls.replace.length).toBe(0);
    expect(fakeAudio.calls.play).toBe(0);
  });

  it('a chapter devotional opened after the tour replaces it, as any different devotional does', () => {
    openDevotional(tenStopsAsDevotional(HEBREWS), { uri: FILE_URI });
    fakeAudio.reset();
    openDevotional(getDevotional('Genesis', 12)!, 101);
    expect(fakeAudio.calls.replace).toEqual([101]);
    expect(getDevotionalPlayerSnapshot().devotional?.book).toBe('Genesis');
  });
});

// ─── The surfaces, in source ────────────────────────────────────────────────

describe('v501 surfaces — in source', () => {
  it('the book page renders the entry only where a tour exists, above the grid', () => {
    const book = read('app/bible-book.tsx');
    expect(book).toContain('getTenStops(book)');
    expect(book).toContain('{tenStops ? <TenStopsCard entry={tenStops} palette={bookPal} /> : null}');
    // The entry sits before the chapter grid in the page.
    expect(book.indexOf('<TenStopsCard')).toBeLessThan(book.indexOf('styles.grid}'));
  });

  it('the card carries the whole lifecycle, dressed from the book palette', () => {
    const card = read('components/ten-stops-card.tsx');
    expect(card).toContain('tenStopsSubline(entry)');
    expect(card).toContain('formatTenStopsSize(entry.sizeBytes)');
    expect(card).toContain('refreshTenStopsDownload(entry)');
    expect(card).toContain('startTenStopsDownload(entry)');
    expect(card).toContain('cancelTenStopsDownload(entry)');
    expect(card).toContain('deleteTenStopsDownload(entry)');
    expect(card).toContain('Remove download');
    expect(card).toContain('name="explore"');
    expect(card).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    // Play loads the book-level session from the local file and
    // opens the player route bare (the session path).
    expect(card).toContain('openDevotional(tenStopsAsDevotional(entry), source)');
    expect(card).toContain("router.push({ pathname: '/devotional', params: {} })");
  });

  it('the player page: book name in the hero seat, local-file source, shared context line', () => {
    const listen = read('components/devotional-listen.tsx');
    // v519 RE-BASE (2026-11-13): the hero stands in the
    // memoised PlayerFace leaf — the seat choice (book name
    // for a book-level session, chapter numeral otherwise)
    // reads off its props, and the parent hands it the
    // session's own bookLevel flag. Same seat, same choice.
    expect(listen).toContain('{props.bookLevel ? props.book : props.chapter}');
    expect(listen).toContain('bookLevel={!!devotional.bookLevel}');
    expect(listen).toContain('styles.numeralBook');
    expect(listen).toContain('tenStopsLocalSource(tenStopsEntry)');
    expect(listen).toContain('devotionalContextLine(devotional)');
    // No verses are loaded for a book-level session.
    expect(listen).toContain('if (devotional.bookLevel) return;');
  });

  it('the pill: the tour’s title stack, and expand lands on the session, not chapter params', () => {
    const pill = read('components/devotional-pill.tsx');
    expect(pill).toContain('devotionalContextLine(devotional)');
    expect(pill).toContain('if (devotional.bookLevel)');
    expect(pill).toContain("router.push({ pathname: '/devotional', params: {} })");
    // The chapter path is untouched beside it.
    expect(pill).toContain('params: { book: devotional.book, chapter: String(devotional.chapter) }');
  });

  it('the controller’s source is the agnostic AudioSource (asset number or file uri)', () => {
    const player = read('lib/devotional-player.ts');
    expect(player).toContain('type AudioSource');
    expect(player).toContain('source: AudioSource');
  });
});

// ─── The APK rule ───────────────────────────────────────────────────────────

describe('v501 — no audio ships in the app', () => {
  function walk(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, name.name);
      if (name.isDirectory()) out.push(...walk(p));
      else out.push(p);
    }
    return out;
  }

  // v523 re-pin: the bundled set moved 189 → 214 when 2 Kings
  // (25 chapters) registered.
  // v524 re-pin: the bundled set moved 214 → 245 when Proverbs
  // (31 chapters) registered.
  // v525 RE-BASE (2026-11-14): the bundled set moved 245 → 257 when Ecclesiastes
  // (12 chapters) registered.
  // v526 RE-BASE (2026-11-14): the bundled set moved 257 → 265 when Song of Solomon
  // (8 chapters) registered.
  it('no Ten Stops audio anywhere under assets/, and the bundled set is still the 265 chapters', () => {
    const files = walk(join(root, 'assets'));
    expect(files.filter((f) => f.toLowerCase().includes('ten-stops'))).toEqual([]);
    expect(files.filter((f) => f.toLowerCase().includes('ten_stops'))).toEqual([]);
    expect(files.filter((f) => f.endsWith('.m4a')).length).toBe(265);
  });

  it('the ten-stops modules never reach into the bundled assets', () => {
    expect(read('lib/ten-stops.ts')).not.toContain('assets/');
    expect(read('lib/ten-stops-download.ts')).not.toContain('assets/');
    expect(read('lib/ten-stops.ts')).not.toContain('require(');
  });
});
