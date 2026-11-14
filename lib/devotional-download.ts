// ─── Devotional downloads (v527) ────────────────────────────────────────────
// The chapter devotionals join the Ten Stops delivery model
// (Jonathan, Nov 14: "Switch them all to downloadable"). A
// chapter's audio is hosted in the devotional-library release —
// the very bytes that used to bundle — and the phone pulls down
// only the chapters he asks for, into the app's documents under
// devotionals/. A deleted chapter simply downloads again; the
// hosted master is never touched by anything here.
//
// NOTHING about the state below is a stored flag: a chapter reads
// as downloaded only because its file is on disk at the registry's
// exact byte size (refreshDevotionalDownload performs that check),
// and a partial or wrong-size file is never presented as ready —
// an interrupted download's leftovers are cleared, so the disk
// tells one story. The filesystem surface is the Ten Stops one
// (lib/ten-stops-download's, shared the way lib/downloads.ts
// already shares it), so every surface reads the same disk through
// the same door.

import { useSyncExternalStore } from 'react';
import {
  devotionalBookTotalBytes,
  devotionalDownloadUrl,
  devotionalKey,
  devotionalsForBook,
  type Devotional,
} from './devotionals';
import {
  tenStopsFileSystemSurface,
  type TenStopsFileSystem,
} from './ten-stops-download';

export type DevotionalDownloadState =
  | { status: 'idle' }
  | { status: 'downloading'; writtenBytes: number; fraction: number }
  | { status: 'ready' }
  | { status: 'error'; message: string };

/** The "Download all" run's state for one book: aggregate bytes
 * landed against the book's whole devotional set, and the chapter
 * currently in flight. The run's resting truth is not kept here —
 * it lives in the per-chapter states (a book is downloaded when
 * every chapter reads ready). */
export type BookDevotionalDownloadState =
  | { status: 'idle' }
  | { status: 'downloading'; downloadedBytes: number; totalBytes: number; fraction: number; chapter: number }
  | { status: 'error'; message: string };

/** The local URI a chapter's devotional downloads to (its hosted
 * file name, in the devotionals/ folder), or null without a
 * documents directory. */
export function devotionalFileUri(fs: TenStopsFileSystem, d: Devotional): string | null {
  const base = fs.documentDirectory;
  if (typeof base !== 'string' || base.length === 0) return null;
  return `${base.endsWith('/') ? base : `${base}/`}devotionals/${d.audioFile}`;
}

function devotionalsDirectoryUri(fs: TenStopsFileSystem): string | null {
  const base = fs.documentDirectory;
  if (typeof base !== 'string' || base.length === 0) return null;
  return `${base.endsWith('/') ? base : `${base}/`}devotionals/`;
}

// ─── The store ──────────────────────────────────────────────────────────────
// One state per chapter, behind useSyncExternalStore (the Ten
// Stops pattern). readyUris remembers WHERE a ready file lives so
// playback can resolve its source synchronously — it is only ever
// set by a disk check that found the complete file, or by a
// download this store verified itself.

const IDLE: DevotionalDownloadState = { status: 'idle' };
const BOOK_IDLE: BookDevotionalDownloadState = { status: 'idle' };
const states = new Map<string, DevotionalDownloadState>();
const readyUris = new Map<string, string>();
const bookStates = new Map<string, BookDevotionalDownloadState>();
const listeners = new Set<() => void>();
let storeVersion = 0;

function emit() {
  storeVersion += 1;
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDevotionalDownloadSnapshot(book: string, chapter: number): DevotionalDownloadState {
  return states.get(devotionalKey(book, chapter)) ?? IDLE;
}

function setState(d: Devotional, next: DevotionalDownloadState) {
  states.set(devotionalKey(d.book, d.chapter), next);
  emit();
}

/** React view over a chapter's download state. */
export function useDevotionalDownloadState(d: Devotional): DevotionalDownloadState {
  return useSyncExternalStore(
    subscribe,
    () => getDevotionalDownloadSnapshot(d.book, d.chapter),
    () => getDevotionalDownloadSnapshot(d.book, d.chapter),
  );
}

export function getBookDevotionalDownloadSnapshot(book: string): BookDevotionalDownloadState {
  return bookStates.get(book) ?? BOOK_IDLE;
}

function setBookState(book: string, next: BookDevotionalDownloadState) {
  bookStates.set(book, next);
  emit();
}

/** React view over a book's "Download all" run state. */
export function useBookDevotionalDownloadState(book: string): BookDevotionalDownloadState {
  return useSyncExternalStore(
    subscribe,
    () => getBookDevotionalDownloadSnapshot(book),
    () => getBookDevotionalDownloadSnapshot(book),
  );
}

/**
 * The downloaded file as a player source ({ uri }), or null. Only
 * ever non-null after a disk truth check (or a verified download)
 * marked the chapter ready this session — a chapter that merely
 * SAYS it downloaded, without the complete file behind it, gets
 * null.
 */
export function devotionalLocalSource(d: Devotional): { uri: string } | null {
  const uri = readyUris.get(devotionalKey(d.book, d.chapter));
  return uri ? { uri } : null;
}

async function deleteQuietly(fs: TenStopsFileSystem, uri: string): Promise<void> {
  try {
    await fs.deleteAsync(uri, { idempotent: true });
  } catch {
    // Already gone is the goal state anyway.
  }
}

/**
 * Ask the disk what is true: the chapter is READY only when its
 * file exists at the registry's exact size. A wrong-size file is a
 * partial by definition — it is cleared and the chapter reads
 * idle, never ready. While a download is in flight this is a no-op
 * (the in-flight write owns the file until it lands or is
 * cancelled).
 */
export async function refreshDevotionalDownload(d: Devotional): Promise<DevotionalDownloadState> {
  if (getDevotionalDownloadSnapshot(d.book, d.chapter).status === 'downloading') {
    return getDevotionalDownloadSnapshot(d.book, d.chapter);
  }
  const fs = tenStopsFileSystemSurface();
  if (!fs) return getDevotionalDownloadSnapshot(d.book, d.chapter);
  const uri = devotionalFileUri(fs, d);
  if (!uri) return getDevotionalDownloadSnapshot(d.book, d.chapter);
  const key = devotionalKey(d.book, d.chapter);
  try {
    const info = await fs.getInfoAsync(uri);
    if (info.exists && info.size === d.sizeBytes) {
      readyUris.set(key, uri);
      setState(d, { status: 'ready' });
    } else {
      readyUris.delete(key);
      if (info.exists) await deleteQuietly(fs, uri);
      setState(d, IDLE);
    }
  } catch {
    // A failed check proves nothing either way — report not-ready
    // rather than guess, and leave any file exactly where it was.
    readyUris.delete(key);
    setState(d, IDLE);
  }
  return getDevotionalDownloadSnapshot(d.book, d.chapter);
}

/** Ask the disk about every chapter of a book (the "Download all"
 * bar's mount truth). */
export async function refreshBookDevotionalDownloads(book: string): Promise<void> {
  for (const d of devotionalsForBook(book)) {
    await refreshDevotionalDownload(d);
  }
}

// ─── One chapter's transfer ─────────────────────────────────────────────────

interface ActiveDownload {
  resumable: { pauseAsync: () => Promise<unknown> } | null;
  cancelled: boolean;
}

const activeDownloads = new Map<string, ActiveDownload>();

type DownloadOutcome = 'ready' | 'error' | 'cancelled';

/**
 * Fetch one chapter. Progress lands in the chapter's state as
 * bytes written and a fraction of the expected size; onProgress
 * also hears each tick (the "Download all" runner aggregates from
 * it). On completion the file is VERIFIED against the registry's
 * size before the chapter may read ready: a short or overlong
 * arrival is discarded and the state is an honest error with a
 * retry, never a partial kept as a download.
 */
async function downloadChapter(
  d: Devotional,
  onProgress?: (writtenBytes: number) => void,
): Promise<DownloadOutcome> {
  const key = devotionalKey(d.book, d.chapter);
  const fs = tenStopsFileSystemSurface();
  if (!fs) {
    setState(d, { status: 'error', message: 'Downloads are not available on this device.' });
    return 'error';
  }
  const uri = devotionalFileUri(fs, d);
  const dir = devotionalsDirectoryUri(fs);
  if (!uri || !dir) {
    setState(d, { status: 'error', message: 'Downloads are not available on this device.' });
    return 'error';
  }
  const record: ActiveDownload = { resumable: null, cancelled: false };
  activeDownloads.set(key, record);
  setState(d, { status: 'downloading', writtenBytes: 0, fraction: 0 });
  try {
    await fs.makeDirectoryAsync(dir, { intermediates: true });
    if (record.cancelled) return 'cancelled'; // cancelled while the folder was being made
    const resumable = fs.createDownloadResumable(devotionalDownloadUrl(d), uri, (progress) => {
      if (record.cancelled) return;
      const expected =
        progress.totalBytesExpectedToWrite > 0 ? progress.totalBytesExpectedToWrite : (d.sizeBytes ?? 0);
      const fraction = Math.max(0, Math.min(1, progress.totalBytesWritten / expected));
      setState(d, { status: 'downloading', writtenBytes: progress.totalBytesWritten, fraction });
      onProgress?.(progress.totalBytesWritten);
    });
    record.resumable = resumable;
    const result = await resumable.downloadAsync();
    if (record.cancelled) return 'cancelled'; // cancelDevotionalDownload already cleaned up and settled the state
    if (!result) throw new Error('download interrupted');
    const info = await fs.getInfoAsync(uri);
    if (info.exists && info.size === d.sizeBytes) {
      readyUris.set(key, uri);
      setState(d, { status: 'ready' });
      return 'ready';
    }
    await deleteQuietly(fs, uri);
    readyUris.delete(key);
    setState(d, {
      status: 'error',
      message: 'The download did not arrive complete. Please try again.',
    });
    return 'error';
  } catch {
    if (record.cancelled) return 'cancelled'; // the cancel path owns cleanup and state
    await deleteQuietly(fs, uri);
    readyUris.delete(key);
    setState(d, { status: 'error', message: 'The download could not finish. Please try again.' });
    return 'error';
  } finally {
    if (activeDownloads.get(key) === record) activeDownloads.delete(key);
  }
}

/** Fetch a chapter's devotional (no-op while one is in flight). */
export async function startDevotionalDownload(d: Devotional): Promise<void> {
  if (getDevotionalDownloadSnapshot(d.book, d.chapter).status === 'downloading') return;
  await downloadChapter(d);
}

/**
 * Abort a chapter's in-flight download: pause the transfer,
 * remove the partial file, and settle back to idle — the chapter
 * can be downloaded again from the top, never resumed from a
 * partial this store does not trust.
 */
export async function cancelDevotionalDownload(d: Devotional): Promise<void> {
  const key = devotionalKey(d.book, d.chapter);
  const record = activeDownloads.get(key);
  if (!record) return;
  record.cancelled = true;
  activeDownloads.delete(key);
  try {
    await record.resumable?.pauseAsync();
  } catch {
    // Pausing a finished or never-started transfer is harmless.
  }
  const fs = tenStopsFileSystemSurface();
  if (fs) {
    const uri = devotionalFileUri(fs, d);
    if (uri) await deleteQuietly(fs, uri);
  }
  readyUris.delete(key);
  setState(d, IDLE);
}

/**
 * Remove a chapter's download: the local file only. The hosted
 * master is never touched, so the chapter returns to its
 * not-downloaded state and a later download fetches it again.
 */
export async function deleteDevotionalDownload(d: Devotional): Promise<void> {
  if (getDevotionalDownloadSnapshot(d.book, d.chapter).status === 'downloading') {
    await cancelDevotionalDownload(d);
  }
  const fs = tenStopsFileSystemSurface();
  if (fs) {
    const uri = devotionalFileUri(fs, d);
    if (uri) await deleteQuietly(fs, uri);
  }
  readyUris.delete(devotionalKey(d.book, d.chapter));
  setState(d, IDLE);
}

// ─── The book set ("Download all") ──────────────────────────────────────────

export interface BookDevotionalProgress {
  chapterCount: number;
  downloadedCount: number;
  downloadedBytes: number;
  totalBytes: number;
  /** Every chapter of the book is on disk at its exact size. */
  allDownloaded: boolean;
}

/** A book's download truth, read from the per-chapter states
 * (which are disk truth — they only read ready off a verified
 * file). Chapters never refreshed this session count as not
 * downloaded until a refresh asks the disk. */
export function bookDevotionalProgress(book: string): BookDevotionalProgress {
  const entries = devotionalsForBook(book);
  let downloadedCount = 0;
  let downloadedBytes = 0;
  for (const d of entries) {
    if (getDevotionalDownloadSnapshot(d.book, d.chapter).status === 'ready') {
      downloadedCount += 1;
      downloadedBytes += d.sizeBytes ?? 0;
    }
  }
  return {
    chapterCount: entries.length,
    downloadedCount,
    downloadedBytes,
    totalBytes: devotionalBookTotalBytes(book),
    allDownloaded: entries.length > 0 && downloadedCount === entries.length,
  };
}

// The progress object allocates, so the React view caches it per
// book against the store's version — getSnapshot must return a
// stable reference between changes or the external store loops.
const progressCache = new Map<string, { version: number; progress: BookDevotionalProgress }>();

function bookDevotionalProgressSnapshot(book: string): BookDevotionalProgress {
  const hit = progressCache.get(book);
  if (hit && hit.version === storeVersion) return hit.progress;
  const progress = bookDevotionalProgress(book);
  progressCache.set(book, { version: storeVersion, progress });
  return progress;
}

/** React view over a book's download truth. */
export function useBookDevotionalProgress(book: string): BookDevotionalProgress {
  return useSyncExternalStore(
    subscribe,
    () => bookDevotionalProgressSnapshot(book),
    () => bookDevotionalProgressSnapshot(book),
  );
}

interface ActiveBookRun {
  cancelled: boolean;
  waiters: (() => void)[];
  current: Devotional | null;
}

const activeBookRuns = new Map<string, ActiveBookRun>();

/**
 * "Download all": fetch every chapter of the book that is not
 * already on disk, one at a time, in chapter order. The run's
 * state carries the aggregate — bytes landed (chapters already
 * home count from the start) against the book's whole set — and
 * the chapter in flight. A chapter that fails stops the run with
 * its error; chapters already landed stay landed.
 */
export async function startBookDevotionalDownload(book: string): Promise<void> {
  if (activeBookRuns.has(book)) return;
  const entries = devotionalsForBook(book);
  if (entries.length === 0) return;
  const run: ActiveBookRun = { cancelled: false, waiters: [], current: null };
  activeBookRuns.set(book, run);
  try {
    await refreshBookDevotionalDownloads(book);
    if (run.cancelled) return;
    const totalBytes = devotionalBookTotalBytes(book);
    let landedBytes = bookDevotionalProgress(book).downloadedBytes;
    for (const d of entries) {
      if (run.cancelled) return;
      if (getDevotionalDownloadSnapshot(d.book, d.chapter).status === 'ready') continue;
      run.current = d;
      setBookState(book, {
        status: 'downloading',
        downloadedBytes: landedBytes,
        totalBytes,
        fraction: totalBytes > 0 ? landedBytes / totalBytes : 0,
        chapter: d.chapter,
      });
      const outcome = await Promise.race([
        downloadChapter(d, (written) => {
          if (run.cancelled) return;
          const bytes = landedBytes + written;
          setBookState(book, {
            status: 'downloading',
            downloadedBytes: bytes,
            totalBytes,
            fraction: totalBytes > 0 ? bytes / totalBytes : 0,
            chapter: d.chapter,
          });
        }),
        new Promise<'cancelled'>((resolve) => {
          run.waiters.push(() => resolve('cancelled'));
        }),
      ]);
      run.current = null;
      run.waiters = [];
      if (run.cancelled || outcome === 'cancelled') return;
      if (outcome === 'error') {
        const chapterState = getDevotionalDownloadSnapshot(d.book, d.chapter);
        setBookState(book, {
          status: 'error',
          message:
            chapterState.status === 'error' ? chapterState.message : 'The download could not finish. Please try again.',
        });
        return;
      }
      landedBytes += d.sizeBytes ?? 0;
    }
    setBookState(book, BOOK_IDLE);
  } finally {
    if (activeBookRuns.get(book) === run) activeBookRuns.delete(book);
    // A run that ends without settling its own state (completed,
    // or cancelled from elsewhere) leaves the resting state to the
    // per-chapter truth; an error state the run set stands.
    if (getBookDevotionalDownloadSnapshot(book).status === 'downloading') {
      setBookState(book, BOOK_IDLE);
    }
  }
}

/**
 * Abort a book's "Download all" run: the chapter in flight is
 * cancelled (its partial cleaned), chapters already landed stay
 * on disk, and the run settles back to idle.
 */
export async function cancelBookDevotionalDownload(book: string): Promise<void> {
  const run = activeBookRuns.get(book);
  if (!run) return;
  run.cancelled = true;
  activeBookRuns.delete(book);
  for (const wake of run.waiters) wake();
  run.waiters = [];
  if (run.current) await cancelDevotionalDownload(run.current);
  setBookState(book, BOOK_IDLE);
}

/** Remove every downloaded chapter of a book — local files only. */
export async function deleteBookDevotionalDownloads(book: string): Promise<void> {
  if (activeBookRuns.has(book)) await cancelBookDevotionalDownload(book);
  for (const d of devotionalsForBook(book)) {
    await deleteDevotionalDownload(d);
  }
  setBookState(book, BOOK_IDLE);
}

/** Test-only: drop every state back to a cold start. */
export function resetDevotionalDownloadsForTests(): void {
  states.clear();
  readyUris.clear();
  bookStates.clear();
  activeDownloads.clear();
  activeBookRuns.clear();
  progressCache.clear();
  emit();
}
