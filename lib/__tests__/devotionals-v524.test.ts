// v524 — "Send the Proverbs devotionals to the app."
// All 31 NotebookLM narrations of his Proverbs commentary,
// registered and bundled (speech-compressed) exactly the way Genesis
// (v293), Deuteronomy (v474), Joshua (v475), Ruth (v476), 1 Samuel
// (v492), 2 Samuel (v493), 1 Kings (v495) and 2 Kings (v523) went in:
// registry entries in lib/devotionals.ts, requires in
// lib/devotional-audio.ts, files in assets/audio/. The audio is a
// narration of his words, not a recording of him speaking — the
// player copy rule from v293 stands untouched.
//
// No title traps in this book: all 31 titles are distinct, and none
// is shared with an earlier book.

import { statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { devotionalRegistry, getDevotional } from '../devotionals';
import { readFileSync } from 'fs';

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');

// The PROGRESS.md record (~/workspace/devotionals/PROGRESS.md) — the
// titles and durations the registry must carry, chapter by chapter.
const EXPECTED: [number, string, number][] = [
  [1, "Solomon's Plea to Choose Godly Wisdom", 84],
  [2, 'What Proverbs 2 Says About Dating', 80],
  [3, 'Practical Wisdom from Proverbs 3', 93],
  [4, 'Guarding Your Heart with Godly Wisdom', 99],
  [5, 'Guarding Your Marriage Against Sexual Temptation', 94],
  [6, 'Financial Traps and Adultery in Proverbs 6', 99],
  [7, "Guarding Wisdom Against Sin's Traps", 92],
  [8, 'Why Wisdom Is Actually Jesus Christ', 90],
  [9, "Choosing Wisdom Over a Fool's Feast", 96],
  [10, 'Why Wise Hearts Crave Correction', 94],
  [11, 'Proverbs 11 on True Integrity', 95],
  [12, 'Stop Fighting Correction in Proverbs 12', 107],
  [13, 'Why Faith Is Your Greatest Inheritance', 81],
  [14, "Building Your House on God's Blueprint", 79],
  [15, 'How Soft Answers Reveal True Wisdom', 92],
  [16, "Choosing God's Path Over Your Own", 92],
  [17, 'Authentic Faith and Loyalty in Adversity', 85],
  [18, 'The Truest Friend in Proverbs 18', 90],
  [19, 'How Haste and Wealth Ruin Relationships', 99],
  [20, 'Choosing Integrity Over Revenge', 92],
  [21, 'How God Controls Bad Leaders', 79],
  [22, 'Why a Good Name Beats Riches', 95],
  [23, 'Buy the Truth and Never Sell It', 90],
  [24, 'Why Comfort Destroys Your Progress', 79],
  [25, 'How to Balance Grace and Truth', 95],
  [26, 'Foolishness, Sloth, and Fake Worth', 92],
  [27, 'Why True Friends Tell Hard Truths', 82],
  [28, 'Righteous Leadership and the Foolish Heart', 99],
  [29, 'Why Anger Never Fixes Your Problems', 102],
  [30, "God's Providence in Ants and Spiders", 92],
  [31, "King Lemuel's Mother on Leadership and Virtue", 97],
];

describe('v524 registry — all of Proverbs, PROGRESS titles', () => {
  it('holds exactly 31 Proverbs entries, every chapter 1–31 exactly once', () => {
    const reg = devotionalRegistry().filter((d) => d.book === 'Proverbs');
    expect(reg.length).toBe(31);
    expect(reg.map((d) => d.chapter).sort((a, b) => a - b)).toEqual(EXPECTED.map(([n]) => n));
  });

  // v525 RE-BASE (2026-11-14): the whole-registry total moved 245 → 257 when
  // Ecclesiastes (12 chapters) registered; the per-book pins below stand.
  // v526 RE-BASE (2026-11-14): the whole-registry total moved 257 → 265 when
  // Song of Solomon (8 chapters) registered; the per-book pins below stand.
  it('the whole registry is now 265 — Genesis 50 + Deuteronomy 34 + Joshua 24 + Ruth 4 + 1 Samuel 31 + 2 Samuel 24 + 1 Kings 22 + 2 Kings 25 + Proverbs 31 + Ecclesiastes 12 + Song of Solomon 8', () => {
    expect(devotionalRegistry().length).toBe(265);
    expect(devotionalRegistry().filter((d) => d.book === 'Genesis').length).toBe(50);
    expect(devotionalRegistry().filter((d) => d.book === 'Deuteronomy').length).toBe(34);
    expect(devotionalRegistry().filter((d) => d.book === 'Joshua').length).toBe(24);
    expect(devotionalRegistry().filter((d) => d.book === 'Ruth').length).toBe(4);
    expect(devotionalRegistry().filter((d) => d.book === '1 Samuel').length).toBe(31);
    expect(devotionalRegistry().filter((d) => d.book === '2 Samuel').length).toBe(24);
    expect(devotionalRegistry().filter((d) => d.book === '1 Kings').length).toBe(22);
    expect(devotionalRegistry().filter((d) => d.book === '2 Kings').length).toBe(25);
  });

  it('every entry carries its PROGRESS title, duration, and asset name', () => {
    for (const [n, title, dur] of EXPECTED) {
      const d = getDevotional('Proverbs', n);
      expect(d, `Proverbs ${n}`).not.toBeNull();
      expect(d!.title).toBe(title);
      expect(d!.durationSec).toBe(dur);
      expect(d!.audioFile).toBe(`devotional-proverbs-${n}.m4a`);
      // No transcript exists for the narrations — no invented words.
      expect(d!.paragraphs).toEqual([]);
    }
  });

  it('all 31 titles are distinct — no shared-title book in this one', () => {
    const titles = EXPECTED.map(([, t]) => t);
    expect(new Set(titles).size).toBe(31);
    const reg = devotionalRegistry().filter((d) => d.book === 'Proverbs');
    expect(new Set(reg.map((d) => d.title)).size).toBe(31);
  });

  it('the door rule: every Proverbs chapter has one, nothing beyond', () => {
    expect(getDevotional('Proverbs', 1)).not.toBeNull();
    expect(getDevotional('Proverbs', 31)).not.toBeNull();
    expect(getDevotional('Proverbs', 32)).toBeNull();
    expect(getDevotional('Proverbs', 0)).toBeNull();
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
describe('v524 hosted audio — hosted, complete, wired (was: bundled)', () => {
  it('all 31 chapters carry their hosted size, each voice-grade small, total ≤ 16 MB', () => {
    let total = 0;
    for (const [n] of EXPECTED) {
      const size = getDevotional('Proverbs', n)!.sizeBytes!;
      expect(size, `chapter ${n}`).toBeGreaterThan(100_000);
      expect(size, `chapter ${n}`).toBeLessThanOrEqual(700_000);
      total += size;
    }
    expect(total).toBeLessThanOrEqual(16_000_000);
  });

  it('the registry names exactly the 31 hosted files, and nothing is bundled', () => {
    for (const [n] of EXPECTED) {
      const d = getDevotional('Proverbs', n)!;
      expect(d.audioFile).toBe(`devotional-proverbs-${n}.m4a`);
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

