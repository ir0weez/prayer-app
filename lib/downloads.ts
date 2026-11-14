// ─── Downloaded audio (v502 → v527) ─────────────────────────────────────────
// The Downloads home in Study (Jonathan, Nov 11 — on the
// book-colours drawing: "Love this. Build it."): a card on the
// Books screen, seated under the Restudy queue card, and a page
// behind it listing everything the phone has pulled down.
//
// DATA TRUTH — this module holds NO list of its own. What counts
// as downloaded is the v501 rule, read fresh from the disk: a
// registry entry whose file exists in its folder at the registry's
// exact byte size — the same check the per-kind download stores
// perform, through the same filesystem surface, so the card, this
// page, and the book page's own cards can never disagree. Sizes
// and durations come from the registry and the files themselves,
// never from a string written here.
//
// v527: the chapter devotionals are downloads too (Jonathan,
// Nov 14: "Switch them all to downloadable") — a devotional
// registry entry (lib/devotionals.ts) whose file exists in
// devotionals/ at its exact size, checked through
// lib/devotional-download.ts under the same rule. The snapshot
// holds both kinds; the page shelves them in their own groups.
//
// The list is a small external store (the download store's own
// pattern): refreshDownloads() asks the disk, removals go through
// the per-kind delete (local file only — the hosted master is
// never touched, so anything removed downloads again), and both
// Books and the Downloads page read the one snapshot.

import { useSyncExternalStore } from 'react';
import { BIBLE_BOOKS } from './bible-books';
import {
  devotionalKey,
  devotionalRegistry,
  formatClock,
  type Devotional,
} from './devotionals';
import {
  deleteDevotionalDownload,
  devotionalFileUri,
  getDevotionalDownloadSnapshot,
  refreshDevotionalDownload,
} from './devotional-download';
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
 * disk itself confirmed (its true size, and when it landed). A
 * Ten Stops tour (v501) or a chapter devotional (v527) — the two
 * kinds the phone can pull down. */
export type DownloadedAudioItem =
  | {
      kind: 'ten-stops';
      entry: TenStops;
      /** Bytes on disk — identical to the registry's sizeBytes for
       * a verified item, read from the file, never assumed. */
      sizeBytes: number;
      /** The file's modification time (seconds), when the
       * filesystem reports one — orders the list newest-first. */
      modifiedAt: number | null;
    }
  | {
      kind: 'devotional';
      entry: Devotional;
      sizeBytes: number;
      modifiedAt: number | null;
    };

/** A row's stable identity across both kinds: the tour's book, or
 * the devotional's book + chapter. */
export function downloadItemKey(item: DownloadedAudioItem): string {
  return item.kind === 'ten-stops'
    ? `ten-stops|${item.entry.book}`
    : `devotional|${devotionalKey(item.entry.book, item.entry.chapter)}`;
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
  // v527: the chapter devotionals, through the same rule in their
  // own store — ready in the store AND re-read from the file here,
  // so the list never stands on a state the disk disowns.
  for (const entry of devotionalRegistry()) {
    if (entry.bookLevel) continue;
    await refreshDevotionalDownload(entry);
    if (getDevotionalDownloadSnapshot(entry.book, entry.chapter).status !== 'ready') continue;
    if (!fs) continue;
    const uri = devotionalFileUri(fs, entry);
    if (!uri) continue;
    try {
      const info = await fs.getInfoAsync(uri);
      const expected = entry.sizeBytes;
      if (info.exists && expected !== undefined && info.size === expected) {
        items.push({
          kind: 'devotional',
          entry,
          sizeBytes: info.size,
          modifiedAt: typeof info.modificationTime === 'number' ? info.modificationTime : null,
        });
      }
    } catch {
      // As above: a failed read lists nothing this pass.
    }
  }
  items.sort((a, b) => (b.modifiedAt ?? 0) - (a.modifiedAt ?? 0));
  snapshot = items;
  emit();
  return snapshot;
}

/** The per-kind local-only delete behind a row's removal. */
async function deleteDownload(item: DownloadedAudioItem): Promise<void> {
  if (item.kind === 'ten-stops') {
    await deleteTenStopsDownload(item.entry);
  } else {
    await deleteDevotionalDownload(item.entry);
  }
}

/**
 * Remove one download — the per-kind delete, which touches only
 * the local file. The list is re-read from the disk afterwards, so
 * what the page shows is what the disk says, not what the tap
 * hoped.
 */
export async function removeDownload(item: DownloadedAudioItem): Promise<DownloadedAudioItem[]> {
  await deleteDownload(item);
  return refreshDownloads();
}

/** Remove every download — each through the same local-only
 * delete, then one re-read. */
export async function removeAllDownloads(): Promise<DownloadedAudioItem[]> {
  for (const item of [...snapshot]) {
    await deleteDownload(item);
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
  /** The item's own identity (downloadItemKey) — several items
   * can share a book now (a tour and its chapters), so the bar's
   * slices key on the item, not the book. */
  id: string;
  book: string;
  sizeBytes: number;
  /** This item's share of the whole — the bar segment's width. */
  fraction: number;
}

export interface DownloadsGroup {
  id: 'tours' | 'devotionals' | 'voice';
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
    id: downloadItemKey(i),
    book: i.entry.book,
    sizeBytes: i.sizeBytes,
    fraction: totalBytes > 0 ? i.sizeBytes / totalBytes : 0,
  }));
  const tours = ordered.filter((i) => i.kind === 'ten-stops');
  // v527: the chapter devotionals shelf in the same canonical
  // walk — book order first, then chapter order within the book,
  // so a book's chapters read down the shelf in the order he
  // studies them.
  const devotionals = ordered
    .filter((i) => i.kind === 'devotional')
    .sort((a, b) => {
      // Book order first (the same canonical walk), chapter only
      // within the book — a chapter number compared across books
      // would scramble the shelf.
      const byBook = byCanonicalBookOrder(a, b);
      if (byBook !== 0) return byBook;
      return a.kind === 'devotional' && b.kind === 'devotional'
        ? a.entry.chapter - b.entry.chapter
        : 0;
    });
  const groups: DownloadsGroup[] = [];
  // The Tours group renders only while it has rows; the Your
  // Voice group always stands, carrying its empty line until his
  // own recordings exist to fill it (none do yet — the group is
  // structural, its rows arrive with the own-voice work).
  if (tours.length > 0) {
    groups.push({ id: 'tours', label: 'TEN STOPS TOURS', items: tours, emptyLine: null });
  }
  // v527: the devotionals group stands between the tours and
  // Your Voice, only while it has rows — the same rule as Tours.
  if (devotionals.length > 0) {
    groups.push({ id: 'devotionals', label: 'CHAPTER DEVOTIONALS', items: devotionals, emptyLine: null });
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

/** The kind tag a row wears: TOUR for a Ten Stops tour,
 * DEVOTIONAL for a chapter devotional. */
export function downloadKindLabel(item: DownloadedAudioItem): string {
  if (item.kind === 'ten-stops') return 'TOUR';
  if (item.kind === 'devotional') return 'DEVOTIONAL';
  return 'YOUR VOICE';
}

/** A row's meta line, from the registry's duration and the file's
 * own size. A tour reads "{duration} · {size}"; a chapter
 * devotional names its chapter first — its title alone doesn't
 * always say which chapter it is — then the same facts. */
export function downloadRowMeta(item: DownloadedAudioItem): string {
  if (item.kind === 'devotional') {
    return `${item.entry.book} ${item.entry.chapter} · ${formatClock(item.entry.durationSec)} · ${formatTenStopsSize(item.sizeBytes)}`;
  }
  return `${formatClock(item.entry.durationSec)} · ${formatTenStopsSize(item.sizeBytes)}`;
}
