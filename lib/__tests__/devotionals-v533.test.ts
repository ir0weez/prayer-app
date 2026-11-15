/**
 * v533 — the "Download all" bar gains its naming header
 * (Concept 3 from download-all-label-v1.html, Jonathan's pick,
 * Nov 15: "Concept 3"). The bar alone never said WHAT "all"
 * was; directly above it now stands a quiet section header —
 * "Devotionals" in small letterspaced caps in the book's own
 * colour family, and at the right the book's disk truth in
 * words: "N of M on this phone".
 *
 * What these pins hold (the model half; the bar component's
 * render is pinned in devotionals-v533-bar.test.tsx):
 *
 *  1. The wording is exactly "N of M on this phone" — the
 *     drawing's own words, at idle (0 of M), partial, and
 *     complete (M of M).
 *  2. The count is the SAME progress the bar reads
 *     (bookDevotionalProgress over the per-chapter states):
 *     a chapter counts only when its file is on disk at the
 *     registry's exact byte size — a wrong-size file never
 *     counts and is cleared, exactly as the downloads page
 *     reads the disk. No second counting path exists.
 *  3. A book with no registered devotionals has no count to
 *     show (chapterCount 0) — the seat where the component
 *     renders nothing at all.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { devotionalsForBook, type Devotional } from '../devotionals';
import {
  bookDevotionalProgress,
  deleteDevotionalDownload,
  devotionalOnPhoneLabel,
  refreshBookDevotionalDownloads,
  resetDevotionalDownloadsForTests,
  type BookDevotionalProgress,
} from '../devotional-download';
import {
  setTenStopsFileSystemForTests,
  type TenStopsFileSystem,
} from '../ten-stops-download';

// ─── The fake file system (the v527 harness shape) ──────────────────────────

function makeFakeFileSystem() {
  const files = new Map<string, number>();
  const fs: TenStopsFileSystem = {
    documentDirectory: 'file:///docs/',
    getInfoAsync: async (path: string) =>
      files.has(path)
        ? { exists: true, size: files.get(path), modificationTime: 1000 }
        : { exists: false },
    makeDirectoryAsync: async () => undefined,
    deleteAsync: async (path: string) => {
      files.delete(path);
    },
    createDownloadResumable: () => {
      throw new Error('v533 model tests never start a transfer');
    },
  };
  return { fs, files };
}

let fake = makeFakeFileSystem();

beforeEach(() => {
  fake = makeFakeFileSystem();
  resetDevotionalDownloadsForTests();
  setTenStopsFileSystemForTests(fake.fs);
});

afterAll(() => {
  setTenStopsFileSystemForTests(null);
  resetDevotionalDownloadsForTests();
});

const uriFor = (d: Devotional) => `file:///docs/devotionals/${d.audioFile}`;

/** Seed a chapter's file on the fake disk at an exact size. */
function seed(d: Devotional, size: number = d.sizeBytes!) {
  fake.files.set(uriFor(d), size);
}

const progressOf = (downloadedCount: number, chapterCount: number): BookDevotionalProgress => ({
  chapterCount,
  downloadedCount,
  downloadedBytes: 0,
  totalBytes: 0,
  allDownloaded: chapterCount > 0 && downloadedCount === chapterCount,
});

// ─── The wording ────────────────────────────────────────────────────────────

describe('v533 header — the count in words', () => {
  it('idle reads "0 of M on this phone" (the drawing’s own Genesis example)', () => {
    expect(devotionalOnPhoneLabel(progressOf(0, 50))).toBe('0 of 50 on this phone');
  });

  it('partial reads the landed count against the whole set', () => {
    expect(devotionalOnPhoneLabel(progressOf(23, 50))).toBe('23 of 50 on this phone');
    expect(devotionalOnPhoneLabel(progressOf(2, 4))).toBe('2 of 4 on this phone');
  });

  it('complete reads "M of M on this phone"', () => {
    expect(devotionalOnPhoneLabel(progressOf(50, 50))).toBe('50 of 50 on this phone');
    expect(devotionalOnPhoneLabel(progressOf(4, 4))).toBe('4 of 4 on this phone');
  });

  it('a one-chapter book reads plainly', () => {
    expect(devotionalOnPhoneLabel(progressOf(0, 1))).toBe('0 of 1 on this phone');
    expect(devotionalOnPhoneLabel(progressOf(1, 1))).toBe('1 of 1 on this phone');
  });
});

// ─── The count is disk truth, through the one model ─────────────────────────

describe('v533 header — the count derives from the disk, via bookDevotionalProgress', () => {
  const ruth = devotionalsForBook('Ruth');

  it('the book set is the registry’s (Ruth carries four chapters)', () => {
    expect(ruth.length).toBe(4);
  });

  it('nothing on disk: 0 of 4 after the mount refresh asks the disk', async () => {
    await refreshBookDevotionalDownloads('Ruth');
    const progress = bookDevotionalProgress('Ruth');
    expect(progress.downloadedCount).toBe(0);
    expect(progress.chapterCount).toBe(4);
    expect(progress.allDownloaded).toBe(false);
    expect(devotionalOnPhoneLabel(progress)).toBe('0 of 4 on this phone');
  });

  it('chapters at their exact size count, one by one', async () => {
    seed(ruth[0]);
    seed(ruth[2]);
    await refreshBookDevotionalDownloads('Ruth');
    const progress = bookDevotionalProgress('Ruth');
    expect(progress.downloadedCount).toBe(2);
    expect(devotionalOnPhoneLabel(progress)).toBe('2 of 4 on this phone');
  });

  it('a wrong-size file never counts — and is cleared, like everywhere else', async () => {
    seed(ruth[0]);
    seed(ruth[1], ruth[1].sizeBytes! + 1);
    await refreshBookDevotionalDownloads('Ruth');
    const progress = bookDevotionalProgress('Ruth');
    expect(progress.downloadedCount).toBe(1);
    expect(devotionalOnPhoneLabel(progress)).toBe('1 of 4 on this phone');
    expect(fake.files.has(uriFor(ruth[1]))).toBe(false);
  });

  it('the whole book at exact size: 4 of 4, all downloaded', async () => {
    for (const d of ruth) seed(d);
    await refreshBookDevotionalDownloads('Ruth');
    const progress = bookDevotionalProgress('Ruth');
    expect(progress.downloadedCount).toBe(4);
    expect(progress.allDownloaded).toBe(true);
    expect(devotionalOnPhoneLabel(progress)).toBe('4 of 4 on this phone');
  });

  it('removing a chapter lowers the count again', async () => {
    for (const d of ruth) seed(d);
    await refreshBookDevotionalDownloads('Ruth');
    await deleteDevotionalDownload(ruth[1]);
    const progress = bookDevotionalProgress('Ruth');
    expect(progress.downloadedCount).toBe(3);
    expect(progress.allDownloaded).toBe(false);
    expect(devotionalOnPhoneLabel(progress)).toBe('3 of 4 on this phone');
  });

  it('a book with no registered devotionals has no count to show', () => {
    const progress = bookDevotionalProgress('Exodus');
    expect(progress.chapterCount).toBe(0);
    expect(progress.downloadedCount).toBe(0);
    expect(progress.allDownloaded).toBe(false);
  });
});
