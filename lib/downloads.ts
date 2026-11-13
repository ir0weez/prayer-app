// ─── Downloaded audio (v502) ────────────────────────────────────────────────
// The Downloads home in Study (Jonathan, Nov 11 — on the
// book-colours drawing: "Love this. Build it."): a card on the
// Books screen, seated under the Restudy queue card, and a page
// behind it listing everything the phone has pulled down.
//
// DATA TRUTH — this module holds NO list of its own. What counts
// as downloaded is the v501 rule, read fresh from the disk: a
// Ten Stops registry entry (lib/ten-stops.ts) whose file exists in
// ten-stops/ at the registry's exact byte size — the same check
// lib/ten-stops-download.ts performs, through the same filesystem
// surface, so the card, this page, and the book page's own card
// can never disagree. Sizes and durations come from the registry
// and the files themselves, never from a string written here.
//
// The list is a small external store (the download store's own
// pattern): refreshDownloads() asks the disk, removals go through
// the v501 delete (local file only — the hosted master is never
// touched, so anything removed downloads again), and both Books
// and the Downloads page read the one snapshot.

import { useSyncExternalStore } from 'react';
import { BIBLE_BOOKS } from './bible-books';
import { formatClock } from './devotionals';
import {
  formatTenStopsSize,
  tenStopsRegistry,
  type TenStops,
} from './ten-stops';
import {
  deleteTenStopsDownload,
  getTenStopsDownloadSnapshot,
  refreshTenStopsDownload,
  tenStopsFileSystemSurface,
  tenStopsFileUri,
} from './ten-stops-download';

/** One verified download: the registry entry plus the facts the
 * disk itself confirmed (its true size, and when it landed). */
export interface DownloadedAudioItem {
  kind: 'ten-stops';
  entry: TenStops;
  /** Bytes on disk — identical to the registry's sizeBytes for a
   * verified item, read from the file, never assumed. */
  sizeBytes: number;
  /** The file's modification time (seconds), when the filesystem
   * reports one — orders the list newest-first. */
  modifiedAt: number | null;
}

// ─── The store ──────────────────────────────────────────────────────────────

let snapshot: DownloadedAudioItem[] = [];
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

export function getDownloadedAudioSnapshot(): DownloadedAudioItem[] {
  return snapshot;
}

/** React view over the verified-downloads list. */
export function useDownloadedAudio(): DownloadedAudioItem[] {
  return useSyncExternalStore(subscribe, getDownloadedAudioSnapshot, getDownloadedAudioSnapshot);
}

/**
 * Ask the disk what is downloaded. Each registry entry is first
 * settled through the v501 refresh (disk truth per book — a
 * wrong-size leftover is cleared there and never listed), then
 * read back: an item is listed only while its file exists at the
 * registry's exact size, with the size and landing time the file
 * itself reports. Newest first.
 */
export async function refreshDownloads(): Promise<DownloadedAudioItem[]> {
  const fs = tenStopsFileSystemSurface();
  const items: DownloadedAudioItem[] = [];
  for (const entry of tenStopsRegistry()) {
    await refreshTenStopsDownload(entry);
    if (getTenStopsDownloadSnapshot(entry.book).status !== 'ready') continue;
    if (!fs) continue;
    const uri = tenStopsFileUri(fs, entry);
    if (!uri) continue;
    try {
      const info = await fs.getInfoAsync(uri);
      if (info.exists && info.size === entry.sizeBytes) {
        items.push({
          kind: 'ten-stops',
          entry,
          sizeBytes: info.size,
          modifiedAt: typeof info.modificationTime === 'number' ? info.modificationTime : null,
        });
      }
    } catch {
      // A failed read proves nothing — the item is simply not
      // listed this pass; the next refresh asks again.
    }
  }
  items.sort((a, b) => (b.modifiedAt ?? 0) - (a.modifiedAt ?? 0));
  snapshot = items;
  emit();
  return snapshot;
}

/**
 * Remove one download — the v501 delete, which touches only the
 * local file. The list is re-read from the disk afterwards, so
 * what the page shows is what the disk says, not what the tap
 * hoped.
 */
export async function removeDownload(item: DownloadedAudioItem): Promise<DownloadedAudioItem[]> {
  await deleteTenStopsDownload(item.entry);
  return refreshDownloads();
}

/** Remove every download — each through the same local-only
 * delete, then one re-read. */
export async function removeAllDownloads(): Promise<DownloadedAudioItem[]> {
  for (const item of [...snapshot]) {
    await deleteTenStopsDownload(item.entry);
  }
  return refreshDownloads();
}

/** Test-only: drop the list back to a cold start. */
export function resetDownloadsForTests(): void {
  snapshot = [];
  emit();
}

// ─── The card model (Books screen) ──────────────────────────────────────────

export interface DownloadsCardModel {
  /** The card renders only while something is downloaded. */
  visible: boolean;
  /** The one summary line under the card's title. */
  line: string;
  /** The newest download's book — its family dresses the card. */
  newestBook: string | null;
  totalBytes: number;
}

export function downloadsCardModel(items: DownloadedAudioItem[]): DownloadsCardModel {
  const totalBytes = items.reduce((sum, i) => sum + i.sizeBytes, 0);
  if (items.length === 0) {
    return { visible: false, line: '', newestBook: null, totalBytes: 0 };
  }
  const newest = items[0];
  const line =
    items.length === 1
      ? `${newest.entry.title} · ${formatTenStopsSize(totalBytes)} on this phone`
      : `${items.length} items · ${formatTenStopsSize(totalBytes)} on this phone`;
  return { visible: true, line, newestBook: newest.entry.book, totalBytes };
}

// ─── The page model ─────────────────────────────────────────────────────────

export interface DownloadsSegment {
  book: string;
  sizeBytes: number;
  /** This item's share of the whole — the bar segment's width. */
  fraction: number;
}

export interface DownloadsGroup {
  id: 'tours' | 'voice';
  label: string;
  items: DownloadedAudioItem[];
  /** The line a group shows in place of rows it doesn't have. */
  emptyLine: string | null;
}

export const DOWNLOADS_FOOTER_LINE =
  "Removing a download frees space on this phone. It doesn't delete anything from the library — you can download it again any time.";

export const VOICE_EMPTY_LINE = 'Nothing yet — chapters land here as you record them.';

export interface DownloadsPageModel {
  totalBytes: number;
  /** "{total} used by downloads" — the storage card's headline. */
  totalLine: string;
  /** "1 item" / "N items" — the storage card's meta line. */
  countLine: string;
  segments: DownloadsSegment[];
  groups: DownloadsGroup[];
  footerLine: string;
}

/**
 * v517 — canonical book order for the Downloads PAGE (Jonathan,
 * Nov 12: "can we put these in book order?"). The snapshot stays
 * newest-first — the Books card's dress follows the newest
 * download, and that truth is the card's — but the page presents
 * its rows and its storage-bar segments in the Bible's own
 * order, by each book's index in the canonical list. A book
 * outside the canon (no registry entry can be one today) keeps
 * its place after the canon, in snapshot order.
 */
export function byCanonicalBookOrder(a: DownloadedAudioItem, b: DownloadedAudioItem): number {
  const ia = BIBLE_BOOKS.indexOf(a.entry.book);
  const ib = BIBLE_BOOKS.indexOf(b.entry.book);
  return (ia === -1 ? BIBLE_BOOKS.length : ia) - (ib === -1 ? BIBLE_BOOKS.length : ib);
}

export function downloadsPageModel(items: DownloadedAudioItem[]): DownloadsPageModel {
  const totalBytes = items.reduce((sum, i) => sum + i.sizeBytes, 0);
  // v517: the page's order is canonical book order — the bar's
  // segments and the Tours rows read from the same ordering, so
  // the bar always walks the shelf the rows show.
  const ordered = [...items].sort(byCanonicalBookOrder);
  const segments: DownloadsSegment[] = ordered.map((i) => ({
    book: i.entry.book,
    sizeBytes: i.sizeBytes,
    fraction: totalBytes > 0 ? i.sizeBytes / totalBytes : 0,
  }));
  const tours = ordered.filter((i) => i.kind === 'ten-stops');
  const groups: DownloadsGroup[] = [];
  // The Tours group renders only while it has rows; the Your
  // Voice group always stands, carrying its empty line until his
  // own recordings exist to fill it (none do yet — the group is
  // structural, its rows arrive with the own-voice work).
  if (tours.length > 0) {
    groups.push({ id: 'tours', label: 'TEN STOPS TOURS', items: tours, emptyLine: null });
  }
  groups.push({ id: 'voice', label: 'YOUR COMMENTARY · YOUR VOICE', items: [], emptyLine: VOICE_EMPTY_LINE });
  return {
    totalBytes,
    totalLine: `${formatTenStopsSize(totalBytes)} used by downloads`,
    countLine: `${items.length} ${items.length === 1 ? 'item' : 'items'}`,
    segments,
    groups,
    footerLine: DOWNLOADS_FOOTER_LINE,
  };
}

// ─── Row facts ──────────────────────────────────────────────────────────────

/** The disc's short code, as drawn (HEB for Hebrews): the book
 * name with spaces removed, first three letters, uppercased. */
export function downloadDiscCode(book: string): string {
  return book.replace(/\s+/g, '').slice(0, 3).toUpperCase();
}

/** The kind tag a row wears: TOUR for a Ten Stops tour. */
export function downloadKindLabel(item: DownloadedAudioItem): string {
  return item.kind === 'ten-stops' ? 'TOUR' : 'YOUR VOICE';
}

/** "{duration} · {size}" — a row's meta line, from the registry's
 * duration and the file's own size. */
export function downloadRowMeta(item: DownloadedAudioItem): string {
  return `${formatClock(item.entry.durationSec)} · ${formatTenStopsSize(item.sizeBytes)}`;
}
