// ─── Ten Stops registry (v501) ──────────────────────────────────────────────
// One entry per book: a spoken tour of the whole book in ten stops,
// made by NotebookLM from Jonathan's own commentary notes — the
// stops are the places his highlighter kept returning to. His
// design, in his words: "Love it. Let's do it." — the tour does NOT
// ship inside the app. Each book's audio is hosted (the
// ten-stops-library release), the book page offers it as a
// download-on-demand (lib/ten-stops-download.ts), and the phone
// keeps only the books he has actually pulled down; deleting one
// frees the space and the download simply comes back. The masters
// live outside the repo entirely — this registry carries only the
// facts a download needs: where it is, how big it is, how long.
//
// Length (his ruling, Nov 11): the app cut targets ~15–20 minutes
// a book. Hebrews' 18:30 middle cut is that cut — the 52-minute
// Full Tour stays a library master, not an app download.

import { formatClock, type Devotional } from './devotionals';

export interface TenStops {
  book: string;
  /** The tour's spoken title — the player page's and pill's headline. */
  title: string;
  /** The shown duration, in seconds (18:30 for Hebrews). */
  durationSec: number;
  /** The hosted file's exact size — a download counts as arrived
   * only when the file on disk matches this, byte for byte. */
  sizeBytes: number;
  /** The public download URL (the ten-stops-library release). */
  url: string;
  /** The file's name, on the host and in the app's ten-stops/ folder. */
  fileName: string;
}

const REGISTRY: TenStops[] = [
  {
    book: 'Hebrews',
    title: 'Ten Stops in Hebrews',
    // The shown duration: 18:30 = 1110s. The file itself probes at
    // 1110.7s; the registry carries the displayed 1110 so every
    // surface says 18:30, and the player reports the real duration
    // once the file loads, as it does for chapter devotionals.
    durationSec: 1110,
    sizeBytes: 5854696,
    url: 'https://github.com/ir0weez/prayer-app/releases/download/ten-stops-library/hebrews-ten-stops.m4a',
    fileName: 'hebrews-ten-stops.m4a',
  },
];

/** Every Ten Stops tour the app knows about (a copy — callers
 * cannot mutate the registry). */
export function tenStopsRegistry(): TenStops[] {
  return REGISTRY.map((e) => ({ ...e }));
}

/** The tour for a book, or null — the book page renders its Ten
 * Stops entry only where this returns an entry, so a book with no
 * tour shows nothing at all: no dead door, no placeholder. */
export function getTenStops(book: string): TenStops | null {
  return REGISTRY.find((e) => e.book === book) ?? null;
}

/** "{duration} · a tour of the book in ten stops" — the book-page
 * entry's subline, from the registry's own numbers only. */
export function tenStopsSubline(entry: TenStops): string {
  return `${formatClock(entry.durationSec)} · a tour of the book in ten stops`;
}

/** "5.6 MB" — the download's size in the units a phone shows
 * (1024-based, one decimal). */
export function formatTenStopsSize(sizeBytes: number): string {
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The tour as a devotional-player session: a BOOK-level Devotional
 * (lib/devotionals' bookLevel) — the book's name where a chapter
 * numeral would sit, no verse facts, no follow-along paragraphs
 * (no transcript exists for the tours, so the player shows none,
 * exactly as it does for the chapter narrations). chapter is 0,
 * the deliberate non-chapter marker; the session's identity still
 * keys on book + chapter, so a tour and a chapter of the same book
 * can never be mistaken for each other.
 */
export function tenStopsAsDevotional(entry: TenStops): Devotional {
  return {
    book: entry.book,
    chapter: 0,
    title: entry.title,
    audioFile: entry.fileName,
    durationSec: entry.durationSec,
    paragraphs: [],
    bookLevel: true,
  };
}
