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
import { tenStopsTranscript } from './ten-stops-transcripts';

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
  {
    book: 'Genesis',
    title: 'Ten Stops in Genesis',
    // The shown duration: 22:45 = 1365s. The file itself probes
    // at 1365.7s; the registry carries 1365 so every surface
    // says 22:45 (NotebookLM's own shown length for the tour),
    // as Hebrews carries its shown 1110.
    durationSec: 1365,
    sizeBytes: 7199654,
    url: 'https://github.com/ir0weez/prayer-app/releases/download/ten-stops-library/genesis-ten-stops.m4a',
    fileName: 'genesis-ten-stops.m4a',
    // The ten stops (v508), from the tour's own transcript (local
    // faster-whisper run over the phone copy, 2026-11-11): each
    // startSec is the moment that stop is ANNOUNCED in the audio,
    // verified stop-by-stop in order. The stops are the list
    // Jonathan locked from the daily check-in sessions' verdicts
    // on his best writing — his titles, his passages.
    movements: [
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
    ],
  },
  {
    book: 'Deuteronomy',
    title: 'Ten Stops in Deuteronomy',
    // The shown duration: 20:11 = 1211s. The file itself probes
    // at 1211.5s; the registry carries 1211 so every surface
    // says 20:11 (NotebookLM's own shown length), as above.
    durationSec: 1211,
    sizeBytes: 6394966,
    url: 'https://github.com/ir0weez/prayer-app/releases/download/ten-stops-library/deuteronomy-ten-stops.m4a',
    fileName: 'deuteronomy-ten-stops.m4a',
    // The ten stops (v508), from the tour's own transcript (local
    // faster-whisper run over the phone copy, 2026-11-11): each
    // startSec is the announcement moment, verified in order.
    // The stops are Jonathan's session-verdict list, approved
    // 2026-11-11, with the two steering calls he delegated
    // verified in the audio (Stop 7 carries no busy-work
    // provision framing; Stop 5 centres on God's presence).
    movements: [
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
    ],
  },
  {
    book: 'Joshua',
    title: 'Ten Stops in Joshua',
    // The shown duration: 25:33 = 1533s. The file itself probes
    // at 1533.5s; the registry carries 1533 so every surface
    // says 25:33 (NotebookLM's own shown length), as above.
    durationSec: 1533,
    sizeBytes: 8094054,
    url: 'https://github.com/ir0weez/prayer-app/releases/download/ten-stops-library/joshua-ten-stops.m4a',
    fileName: 'joshua-ten-stops.m4a',
    // The ten stops (v511), from the tour's own transcript (local
    // faster-whisper run over the phone copy, 2026-11-12): each
    // startSec is the announcement moment, verified in order.
    // The stops are Jonathan's session-verdict list, approved
    // 2026-11-12 — no steering calls were needed (none of the
    // ten carries a superseded position).
    movements: [
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
    ],
  },
  {
    book: 'Ruth',
    title: 'Ten Stops in Ruth',
    // The shown duration: 22:03 = 1323s. The file itself probes
    // at 1323.2s; the registry carries 1323 so every surface
    // says 22:03, as above.
    durationSec: 1323,
    sizeBytes: 6992442,
    url: 'https://github.com/ir0weez/prayer-app/releases/download/ten-stops-library/ruth-ten-stops.m4a',
    fileName: 'ruth-ten-stops.m4a',
    // The ten stops (v516), from the tour's own transcript (local
    // faster-whisper run over the phone copy, 2026-11-12): each
    // startSec is the announcement moment, verified in order.
    // The stops are Jonathan's session-verdict list, approved
    // 2026-11-12 — all ten earned their seats on session
    // singling-out, no fill picks needed. One steering call was
    // made in the generation prompt (the Ruth 2 gleaning material
    // centred on its grace-first heart) and named to him; his
    // notes themselves went in whole and unedited.
    movements: [
      { title: 'Naomi Widowed', passage: 'Ruth 1:1-5', startSec: 98.0 },
      { title: "Ruth's Loyalty", passage: 'Ruth 1:6-18', startSec: 285.2 },
      { title: 'Naomi and Ruth Return', passage: 'Ruth 1:19-22', startSec: 415.5 },
      { title: 'Ruth Meets Boaz', passage: 'Ruth 2:1-7', startSec: 487.1 },
      { title: 'Ruth Meets Boaz', passage: 'Ruth 2:8-13', startSec: 573.8 },
      { title: 'Ruth Meets Boaz', passage: 'Ruth 2:14-17', startSec: 647.6 },
      { title: 'The Threshing Floor', passage: 'Ruth 3:1-5', startSec: 767.3 },
      { title: 'The Threshing Floor', passage: 'Ruth 3:7-11', startSec: 852.3 },
      { title: 'The Heart and Home of Boaz', passage: 'Ruth 4:1-4', startSec: 993.1 },
      { title: 'The Heart and Home of Boaz', passage: 'Ruth 4:5-10', startSec: 1063.2 },
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
 * v508: it also carries its transcript (lib/ten-stops-
 * transcripts.ts) — the tour's own words at segment level, for
 * the player's TRANSCRIPT follow-along. chapter is 0, the
 * deliberate non-chapter marker; the session's
 * identity still keys on book + chapter, so a tour and a chapter
 * of the same book can never be mistaken for each other.
 */
export function tenStopsAsDevotional(entry: TenStops): Devotional {
  const transcript = tenStopsTranscript(entry.book);
  return {
    book: entry.book,
    chapter: 0,
    title: entry.title,
    audioFile: entry.fileName,
    durationSec: entry.durationSec,
    paragraphs: [],
    bookLevel: true,
    movements: entry.movements.map((m) => ({ ...m })),
    ...(transcript ? { transcriptSegments: transcript } : {}),
  };
}
