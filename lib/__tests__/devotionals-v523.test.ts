// v523 — "Send the 2 Kings devotionals to the app."
// All 25 NotebookLM narrations of his 2 Kings commentary,
// registered and bundled (speech-compressed) exactly the way Genesis
// (v293), Deuteronomy (v474), Joshua (v475), Ruth (v476), 1 Samuel
// (v492), 2 Samuel (v493) and 1 Kings (v495) went in: registry entries
// in lib/devotionals.ts, requires in lib/devotional-audio.ts, files in
// assets/audio/. The audio is a narration of his words, not a
// recording of him speaking — the player copy rule from v293 stands
// untouched.
//
// No title traps in this book: all 25 titles are distinct. Ch 6's
// title is kept verbatim from NotebookLM (lowercase "floating axe and
// fiery chariots"); ch 16's title is kept verbatim ("Gods", no
// apostrophe).

import { statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { devotionalRegistry, getDevotional } from '../devotionals';
import { readFileSync } from 'fs';

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');

// The PROGRESS.md record (~/workspace/devotionals/PROGRESS.md) — the
// titles and durations the registry must carry, chapter by chapter.
const EXPECTED: [number, string, number][] = [
  [1, "Fire From Heaven Consumes Ahaziah's Men", 94],
  [2, "Elisha Takes Up Elijah's Mantle", 105],
  [3, 'Digging Ditches for Water Without Rain', 86],
  [4, 'Elisha Multiplies Oil and Raises the Dead', 94],
  [5, "Naaman's Healing and Gehazi's Leprosy", 96],
  [6, "Elisha's floating axe and fiery chariots", 110],
  [7, 'Four Lepers and a Trampled Officer', 85],
  [8, "Hazael's Betrayal and God's Unbroken Covenant", 89],
  [9, 'The Bloody Rise of King Jehu', 125],
  [10, 'Jehu Destroys Baal But Worships Golden Calves', 110],
  [11, 'How Baby Joash Survived Queen Athaliah', 92],
  [12, 'How Borrowed Faith Ruined King Joash', 87],
  [13, 'Why King Jehoash Stopped at Three Arrows', 98],
  [14, 'How God Balances Victories and Defeats', 85],
  [15, "Israel's Anarchy and Judah's Compromise", 106],
  [16, 'King Ahaz Replaces Gods Altar', 92],
  [17, 'Why Israel Fell to Assyria', 111],
  [18, 'Hezekiah Crushes Idols and Defies Assyria', 104],
  [19, 'God Defeats 185,000 Assyrians Overnight', 88],
  [20, 'Hezekiah Squandered His Extra Fifteen Years', 96],
  [21, 'How Manasseh and Amon Destroyed Judah', 93],
  [22, "King Josiah Finds God's Lost Law", 94],
  [23, "Why King Josiah's Revival Didn't Last", 110],
  [24, 'How Pride Handed Jerusalem to Babylon', 104],
  [25, 'The Fall of Judah to Babylon', 106],
];

describe('v523 registry — all of 2 Kings, PROGRESS titles', () => {
  it('holds exactly 25 2 Kings entries, every chapter 1–25 exactly once', () => {
    const reg = devotionalRegistry().filter((d) => d.book === '2 Kings');
    expect(reg.length).toBe(25);
    expect(reg.map((d) => d.chapter).sort((a, b) => a - b)).toEqual(EXPECTED.map(([n]) => n));
  });

    // v524 re-pin: the whole-registry total moved 214 → 245 when
  // Proverbs (31 chapters) registered; the per-book pins below stand.
  // v525 RE-BASE (2026-11-14): the whole-registry total moved 245 → 257 when
  // Ecclesiastes (12 chapters) registered; the per-book pins below stand.
  // v528 RE-BASE (2026-11-14): the whole-registry total moved 265 → 336 when
  // Isaiah (66 chapters), Obadiah (1) and Jonah (4) registered, downloadable
  // from the start (v527 model); the per-book pins below stand.
  // v531 RE-BASE (2026-11-15): the whole-registry total moved 409 → 419 when
  // Ephesians (6 chapters) and Philippians (4) registered, downloadable
  // from the start (v527 model); the per-book pins below stand.
  // v532 RE-BASE (2026-11-15): the whole-registry total moved 419 → 432 when
  // Hebrews (13 chapters) registered, downloadable from the start (v527
  // model); the per-book pins below stand.
// v529 RE-BASE (2026-11-14): the whole-registry total moved 336 → 380 when
// Mark (16 chapters) and Acts (28) registered, downloadable from the
// start (v527 model); the per-book pins below stand.
// v530 RE-BASE (2026-11-15): the whole-registry total moved 380 → 409 when
// 1 Corinthians (16 chapters) and 2 Corinthians (13) registered, downloadable
// from the start (v527 model); the per-book pins below stand.
// v534 RE-BASE (2026-11-15): the whole-registry total moved 432 → 453 when
// James (5 chapters), 1 Peter (5), 2 Peter (3), 1 John (5), 2 John (1),
// 3 John (1) and Jude (1) registered, downloadable from the start (v527
// model); the per-book pins below stand.
it('the whole registry is now 453 — Genesis 50 + Deuteronomy 34 + Joshua 24 + Ruth 4 + 1 Samuel 31 + 2 Samuel 24 + 1 Kings 22 + 2 Kings 25 + Proverbs 31 + Ecclesiastes 12 + Song of Solomon 8 + Isaiah 66 + Obadiah 1 + Jonah 4 + Mark 16 + Acts 28 + 1 Corinthians 16 + 2 Corinthians 13 + Ephesians 6 + Philippians 4 + Hebrews 13 + James 5 + 1 Peter 5 + 2 Peter 3 + 1 John 5 + 2 John 1 + 3 John 1 + Jude 1', () => {
    expect(devotionalRegistry().length).toBe(453);
    expect(devotionalRegistry().filter((d) => d.book === 'Genesis').length).toBe(50);
    expect(devotionalRegistry().filter((d) => d.book === 'Deuteronomy').length).toBe(34);
    expect(devotionalRegistry().filter((d) => d.book === 'Joshua').length).toBe(24);
    expect(devotionalRegistry().filter((d) => d.book === 'Ruth').length).toBe(4);
    expect(devotionalRegistry().filter((d) => d.book === '1 Samuel').length).toBe(31);
    expect(devotionalRegistry().filter((d) => d.book === '2 Samuel').length).toBe(24);
    expect(devotionalRegistry().filter((d) => d.book === '1 Kings').length).toBe(22);
  });

  it('every entry carries its PROGRESS title, duration, and asset name', () => {
    for (const [n, title, dur] of EXPECTED) {
      const d = getDevotional('2 Kings', n);
      expect(d, `2 Kings ${n}`).not.toBeNull();
      expect(d!.title).toBe(title);
      expect(d!.durationSec).toBe(dur);
      expect(d!.audioFile).toBe(`devotional-2kings-${n}.m4a`);
      // No transcript exists for the narrations — no invented words.
      expect(d!.paragraphs).toEqual([]);
    }
  });

  it('all 25 titles are distinct — no shared-title book in this one', () => {
    const titles = EXPECTED.map(([, t]) => t);
    expect(new Set(titles).size).toBe(25);
    const reg = devotionalRegistry().filter((d) => d.book === '2 Kings');
    expect(new Set(reg.map((d) => d.title)).size).toBe(25);
  });

  it('the door rule: every 2 Kings chapter has one, nothing beyond', () => {
    expect(getDevotional('2 Kings', 1)).not.toBeNull();
    expect(getDevotional('2 Kings', 25)).not.toBeNull();
    expect(getDevotional('2 Kings', 26)).toBeNull();
    expect(getDevotional('2 Kings', 0)).toBeNull();
  });
});

// v527 RE-BASE (2026-11-14): this book's audio is HOSTED now, not
// bundled — the chapter devotionals switched to download-on-demand
// (Jonathan: "Switch them all to downloadable"). The very bytes
// that shipped in assets/audio/ were uploaded to the public
// devotional-library release under the same names; the registry
// carries each chapter's hosted name and exact byte size, and
// nothing is bundled anymore. The full registry↔hosting table is
// pinned in devotionals-v527.test.ts.
describe('v523 hosted audio — hosted, complete, wired (was: bundled)', () => {
  it('all 25 chapters carry their hosted size, each voice-grade small, total ≤ 16 MB', () => {
    let total = 0;
    for (const [n] of EXPECTED) {
      const size = getDevotional('2 Kings', n)!.sizeBytes!;
      expect(size, `chapter ${n}`).toBeGreaterThan(100_000);
      expect(size, `chapter ${n}`).toBeLessThanOrEqual(700_000);
      total += size;
    }
    expect(total).toBeLessThanOrEqual(16_000_000);
  });

  it('the registry names exactly the 25 hosted files, and nothing is bundled', () => {
    for (const [n] of EXPECTED) {
      const d = getDevotional('2 Kings', n)!;
      expect(d.audioFile).toBe(`devotional-2kings-${n}.m4a`);
      // No bundled copy stands in the app anymore.
      expect(() => statSync(join(__dirname, '..', '..', 'assets', 'audio', d.audioFile))).toThrow();
    }
    // The bundled require map is gone with the bundle.
    expect(() => read('lib/devotional-audio.ts')).toThrow();
  });

  it('every registry entry in the whole book set carries a hosted name and exact size', () => {
    for (const d of devotionalRegistry()) {
      expect(d.audioFile, `${d.book} ${d.chapter}`).toMatch(/^devotional-.+-\d+\.m4a$/);
      expect(d.sizeBytes, `${d.book} ${d.chapter}`).toBeGreaterThan(0);
    }
  });
});

