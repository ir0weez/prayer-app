// ─── Ten Stops downloads (v501) ─────────────────────────────────────────────
// The on-demand half of the Ten Stops design (lib/ten-stops.ts): a
// book's tour is fetched when he asks, kept in the app's documents
// under ten-stops/, and removable at any time — the hosted master
// is untouched by anything here, so a deleted tour simply
// downloads again. NOTHING about the state below is a stored flag:
// a book reads as downloaded only because the file is on disk at
// the registry's exact byte size (refreshTenStopsDownload performs
// that check), and a partial or wrong-size file is never presented
// as ready — an interrupted download's leftovers are cleared, so
// the disk tells one story.
//
// The filesystem surface is the narrow slice below, loaded lazily
// (the studio-import seam's pattern): production gets
// expo-file-system/legacy, tests substitute a double through
// setTenStopsFileSystemForTests, and this module stays importable
// anywhere.

import { useSyncExternalStore } from 'react';
import type { TenStops } from './ten-stops';

export type TenStopsDownloadState =
  | { status: 'idle' }
  | { status: 'downloading'; writtenBytes: number; fraction: number }
  | { status: 'ready' }
  | { status: 'error'; message: string };

/** The slice of a resumable download this store drives. */
export interface TenStopsDownloadResumable {
  downloadAsync: () => Promise<{ uri: string; status: number } | undefined>;
  pauseAsync: () => Promise<unknown>;
}

/** The slice of the legacy expo-file-system surface the store
 * needs — nothing more, so a test double stays a page long. */
export interface TenStopsFileSystem {
  documentDirectory: string | null;
  getInfoAsync: (path: string) => Promise<{ exists: boolean; size?: number }>;
  makeDirectoryAsync: (path: string, options?: { intermediates?: boolean }) => Promise<void>;
  deleteAsync: (path: string, options?: { idempotent?: boolean }) => Promise<void>;
  createDownloadResumable: (
    url: string,
    fileUri: string,
    callback: (progress: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void,
  ) => TenStopsDownloadResumable;
}

let tenStopsFileSystemOverride: TenStopsFileSystem | null = null;

/** Test-only: substitute the filesystem surface the store sees.
 * Call with no argument (or null) to restore the real surface. */
export function setTenStopsFileSystemForTests(fileSystem?: TenStopsFileSystem | null): void {
  tenStopsFileSystemOverride = fileSystem ?? null;
}

function tenStopsFileSystem(): TenStopsFileSystem | null {
  if (tenStopsFileSystemOverride) return tenStopsFileSystemOverride;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FileSystem = require('expo-file-system/legacy');
    // Trust only a surface shaped like the real one — anything else
    // (a partial double in a neighbouring test, a platform without
    // documents) means "no downloads", never a crash.
    if (
      typeof FileSystem.documentDirectory !== 'string' ||
      FileSystem.documentDirectory.length === 0 ||
      typeof FileSystem.getInfoAsync !== 'function' ||
      typeof FileSystem.makeDirectoryAsync !== 'function' ||
      typeof FileSystem.deleteAsync !== 'function' ||
      typeof FileSystem.createDownloadResumable !== 'function'
    ) {
      return null;
    }
    return {
      documentDirectory: FileSystem.documentDirectory,
      getInfoAsync: (path: string) => FileSystem.getInfoAsync(path, { size: true }),
      makeDirectoryAsync: (path: string, options?: { intermediates?: boolean }) =>
        FileSystem.makeDirectoryAsync(path, options),
      deleteAsync: (path: string, options?: { idempotent?: boolean }) => FileSystem.deleteAsync(path, options),
      createDownloadResumable: (url, fileUri, callback) => FileSystem.createDownloadResumable(url, fileUri, {}, callback),
    } as TenStopsFileSystem;
  } catch {
    return null;
  }
}

/** The ten-stops/ directory URI inside the app's documents, or
 * null when there is no documents directory to hold it. */
function tenStopsDirectoryUri(fs: TenStopsFileSystem): string | null {
  const base = fs.documentDirectory;
  if (typeof base !== 'string' || base.length === 0) return null;
  return `${base.endsWith('/') ? base : `${base}/`}ten-stops/`;
}

/** The local URI a book's tour downloads to (its hosted file name,
 * in the ten-stops/ folder), or null without a documents directory. */
export function tenStopsFileUri(fs: TenStopsFileSystem, entry: TenStops): string | null {
  const dir = tenStopsDirectoryUri(fs);
  return dir ? `${dir}${entry.fileName}` : null;
}

// ─── The store ──────────────────────────────────────────────────────────────
// One state per book, behind useSyncExternalStore (the devotional
// player's pattern). readyUris remembers WHERE a ready file lives
// so playback can resolve its source synchronously — it is only
// ever set by a disk check that found the complete file, or by a
// download this store verified itself.

const IDLE: TenStopsDownloadState = { status: 'idle' };
const states = new Map<string, TenStopsDownloadState>();
const readyUris = new Map<string, string>();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getTenStopsDownloadSnapshot(book: string): TenStopsDownloadState {
  return states.get(book) ?? IDLE;
}

function setState(book: string, next: TenStopsDownloadState) {
  states.set(book, next);
  emit();
}

/** React view over a book's download state. */
export function useTenStopsDownloadState(entry: TenStops): TenStopsDownloadState {
  return useSyncExternalStore(
    subscribe,
    () => getTenStopsDownloadSnapshot(entry.book),
    () => getTenStopsDownloadSnapshot(entry.book),
  );
}

/**
 * The downloaded file as a player source ({ uri }), or null. Only
 * ever non-null after a disk truth check (or a verified download)
 * marked the book ready this session — a book that merely SAYS it
 * downloaded, without the complete file behind it, gets null.
 */
export function tenStopsLocalSource(entry: TenStops): { uri: string } | null {
  const uri = readyUris.get(entry.book);
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
 * Ask the disk what is true: the book is READY only when its file
 * exists at the registry's exact size. A wrong-size file is a
 * partial by definition — it is cleared and the book reads idle,
 * never ready. While a download is in flight this is a no-op (the
 * in-flight write owns the file until it lands or is cancelled).
 */
export async function refreshTenStopsDownload(entry: TenStops): Promise<TenStopsDownloadState> {
  if (getTenStopsDownloadSnapshot(entry.book).status === 'downloading') {
    return getTenStopsDownloadSnapshot(entry.book);
  }
  const fs = tenStopsFileSystem();
  if (!fs) return getTenStopsDownloadSnapshot(entry.book);
  const uri = tenStopsFileUri(fs, entry);
  if (!uri) return getTenStopsDownloadSnapshot(entry.book);
  try {
    const info = await fs.getInfoAsync(uri);
    if (info.exists && info.size === entry.sizeBytes) {
      readyUris.set(entry.book, uri);
      setState(entry.book, { status: 'ready' });
    } else {
      readyUris.delete(entry.book);
      if (info.exists) await deleteQuietly(fs, uri);
      setState(entry.book, IDLE);
    }
  } catch {
    // A failed check proves nothing either way — report not-ready
    // rather than guess, and leave any file exactly where it was.
    readyUris.delete(entry.book);
    setState(entry.book, IDLE);
  }
  return getTenStopsDownloadSnapshot(entry.book);
}

interface ActiveDownload {
  resumable: TenStopsDownloadResumable;
  cancelled: boolean;
}

const activeDownloads = new Map<string, ActiveDownload>();

/**
 * Fetch the tour. Progress lands in the store as bytes written and
 * a fraction of the expected size. On completion the file is
 * VERIFIED against the registry's size before the book may read
 * ready: a short or overlong arrival is discarded and the state is
 * an honest error with a retry, never a partial kept as a download.
 */
export async function startTenStopsDownload(entry: TenStops): Promise<void> {
  if (getTenStopsDownloadSnapshot(entry.book).status === 'downloading') return;
  const fs = tenStopsFileSystem();
  if (!fs) {
    setState(entry.book, { status: 'error', message: 'Downloads are not available on this device.' });
    return;
  }
  const uri = tenStopsFileUri(fs, entry);
  const dir = tenStopsDirectoryUri(fs);
  if (!uri || !dir) {
    setState(entry.book, { status: 'error', message: 'Downloads are not available on this device.' });
    return;
  }
  const record: ActiveDownload = { resumable: null as unknown as TenStopsDownloadResumable, cancelled: false };
  activeDownloads.set(entry.book, record);
  setState(entry.book, { status: 'downloading', writtenBytes: 0, fraction: 0 });
  try {
    await fs.makeDirectoryAsync(dir, { intermediates: true });
    if (record.cancelled) return; // cancelled while the folder was being made
    const resumable = fs.createDownloadResumable(entry.url, uri, (progress) => {
      if (record.cancelled) return;
      const expected =
        progress.totalBytesExpectedToWrite > 0 ? progress.totalBytesExpectedToWrite : entry.sizeBytes;
      const fraction = Math.max(0, Math.min(1, progress.totalBytesWritten / expected));
      setState(entry.book, { status: 'downloading', writtenBytes: progress.totalBytesWritten, fraction });
    });
    record.resumable = resumable;
    const result = await resumable.downloadAsync();
    if (record.cancelled) return; // cancelTenStopsDownload already cleaned up and settled the state
    if (!result) throw new Error('download interrupted');
    const info = await fs.getInfoAsync(uri);
    if (info.exists && info.size === entry.sizeBytes) {
      readyUris.set(entry.book, uri);
      setState(entry.book, { status: 'ready' });
    } else {
      await deleteQuietly(fs, uri);
      readyUris.delete(entry.book);
      setState(entry.book, {
        status: 'error',
        message: 'The download did not arrive complete. Please try again.',
      });
    }
  } catch {
    if (record.cancelled) return; // the cancel path owns cleanup and state
    await deleteQuietly(fs, uri);
    readyUris.delete(entry.book);
    setState(entry.book, { status: 'error', message: 'The download could not finish. Please try again.' });
  } finally {
    if (activeDownloads.get(entry.book) === record) activeDownloads.delete(entry.book);
  }
}

/**
 * Abort the in-flight download: pause the transfer, remove the
 * partial file, and settle back to idle — the book can be
 * downloaded again from the top, never resumed from a partial
 * this store does not trust.
 */
export async function cancelTenStopsDownload(entry: TenStops): Promise<void> {
  const record = activeDownloads.get(entry.book);
  if (!record) return;
  record.cancelled = true;
  activeDownloads.delete(entry.book);
  try {
    await record.resumable.pauseAsync();
  } catch {
    // Pausing a finished or never-started transfer is harmless.
  }
  const fs = tenStopsFileSystem();
  if (fs) {
    const uri = tenStopsFileUri(fs, entry);
    if (uri) await deleteQuietly(fs, uri);
  }
  readyUris.delete(entry.book);
  setState(entry.book, IDLE);
}

/**
 * Remove the download: the local file only. The hosted master is
 * never touched, so the entry returns to its not-downloaded state
 * and a later download fetches the same tour again.
 */
export async function deleteTenStopsDownload(entry: TenStops): Promise<void> {
  if (getTenStopsDownloadSnapshot(entry.book).status === 'downloading') {
    await cancelTenStopsDownload(entry);
  }
  const fs = tenStopsFileSystem();
  if (fs) {
    const uri = tenStopsFileUri(fs, entry);
    if (uri) await deleteQuietly(fs, uri);
  }
  readyUris.delete(entry.book);
  setState(entry.book, IDLE);
}

/** Test-only: drop every book's state back to a cold start. */
export function resetTenStopsDownloadsForTests(): void {
  states.clear();
  readyUris.clear();
  activeDownloads.clear();
  emit();
}
