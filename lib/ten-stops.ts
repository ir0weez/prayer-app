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

import { formatClock, type Devotional, type DevotionalMovement } from './devotionals';

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
  /** The tour's ten stops as player guideposts (v506): his titles
   * and passages, each with the second it begins in the audio —
   * real only where a timed source (a transcript of the tour
   * itself) produced them. */
  movements: DevotionalMovement[];
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
    // The ten stops (v506), from the tour's own transcript (local
    // faster-whisper run over the 18:30 app cut, 2026-11-11):
    // each startSec is the moment that stop is ANNOUNCED by name
    // in the audio, verified stop-by-stop in order against the
    // transcript text. Titles and passages are Jonathan's, from
    // his Ten Stops skeleton — nothing here is derived or guessed.
    movements: [
      { title: 'Lower Than Angels', passage: 'Hebrews 2:5-8', startSec: 109.3 },
      { title: 'Grace For Sin', passage: 'Hebrews 4:14-16', startSec: 206.2 },
      { title: 'Growing In Wisdom', passage: 'Hebrews 5:11-14', startSec: 312.0 },
      { title: 'Growing In Faith', passage: 'Hebrews 6:1-8', startSec: 401.9 },
      { title: 'Old Vs. New', passage: 'Hebrews 8:8-9', startSec: 496.0 },
      { title: 'Power In the Blood', passage: 'Hebrews 9:15-22', startSec: 605.8 },
      { title: 'Hold Fast to Jesus', passage: 'Hebrews 10:23', startSec: 690.3 },
      { title: 'Proven By Faith', passage: 'Hebrews 11:3-12', startSec: 776.3 },
      { title: 'Give Peace', passage: 'Hebrews 12:14-17', startSec: 862.9 },
      { title: 'Focus on Love', passage: 'Hebrews 13:1-7', startSec: 959.3 },
    ],
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
 * (the player shows none, exactly as it does for the chapter
 * narrations). The tour DOES carry guideposts (v506): the ten
 * stops ride through as movements, so the player's guideposts
 * panel lists them and a tap seeks to the stop's first second.
 * chapter is 0, the deliberate non-chapter marker; the session's
 * identity still keys on book + chapter, so a tour and a chapter
 * of the same book can never be mistaken for each other.
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
    movements: entry.movements.map((m) => ({ ...m })),
  };
}
