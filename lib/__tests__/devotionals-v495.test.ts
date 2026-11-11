// v495 — "Send the 1 Kings devotionals to the app."
// All 22 NotebookLM narrations of his 1 Kings commentary,
// registered and bundled (speech-compressed) exactly the way Genesis
// (v293), Deuteronomy (v474), Joshua (v475), Ruth (v476), 1 Samuel
// (v492) and 2 Samuel (v493) went in: registry entries in
// lib/devotionals.ts, requires in lib/devotional-audio.ts, files in
// assets/audio/. The audio is a narration of his words, not a
// recording of him speaking — the player copy rule from v293 stands
// untouched.
//
// No title traps in this book: all 22 titles are distinct. Ch 4's
// title is kept verbatim from NotebookLM ("Solomons", no apostrophe).

import { statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { devotionalRegistry, getDevotional } from '../devotionals';
import { readFileSync } from 'fs';

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');

// The PROGRESS.md record (~/workspace/devotionals/PROGRESS.md) — the
// titles and durations the registry must carry, chapter by chapter.
const EXPECTED: [number, string, number][] = [
  [1, 'Solomon Takes the Throne from Adonijah', 94],
  [2, 'How Solomon Secured His Kingdom', 108],
  [3, 'Why Solomon Asked God for Wisdom', 95],
  [4, 'How Solomons Wisdom Built a Prosperous Kingdom', 111],
  [5, 'How Solomon United the Temple Builders', 88],
  [6, "Why God Interrupted Solomon's Temple Project", 94],
  [7, "Solomon's Extravagant Palace and Gold Temple", 98],
  [8, "God's Glory Fills Solomon's Temple", 87],
  [9, "The Hidden Warning in Solomon's Success", 90],
  [10, 'Why Solomon Chose Wisdom Over Wealth', 92],
  [11, "How Solomon's Idolatry Divided Israel", 84],
  [12, "Rehoboam's Pride and the Golden Calves", 99],
  [13, 'The Prophet Who Believed a Lie', 100],
  [14, 'Trading Gold Shields for Cheap Brass', 93],
  [15, "King Asa and Israel's Corrupt Kings", 84],
  [16, "Israel's Spiral from Baasha to Ahab", 109],
  [17, "Elijah's Drought at Cherith and Zarephath", 95],
  [18, 'God Answers Elijah with Fire', 87],
  [19, "How God Heals Elijah's Burnout", 85],
  [20, 'Ahab Defeats Syria But Spares Benhadad', 96],
  [21, "Ahab's Stolen Vineyard and God's Shocking Mercy", 90],
  [22, "A Disguise Couldn't Save King Ahab", 115],
];

describe('v495 registry — all of 1 Kings, PROGRESS titles', () => {
  it('holds exactly 22 1 Kings entries, every chapter 1–22 exactly once', () => {
    const reg = devotionalRegistry().filter((d) => d.book === '1 Kings');
    expect(reg.length).toBe(22);
    expect(reg.map((d) => d.chapter).sort((a, b) => a - b)).toEqual(EXPECTED.map(([n]) => n));
  });

  it('the whole registry is now 189 — Genesis 50 + Deuteronomy 34 + Joshua 24 + Ruth 4 + 1 Samuel 31 + 2 Samuel 24 + 1 Kings 22', () => {
    expect(devotionalRegistry().length).toBe(189);
    expect(devotionalRegistry().filter((d) => d.book === 'Genesis').length).toBe(50);
    expect(devotionalRegistry().filter((d) => d.book === 'Deuteronomy').length).toBe(34);
    expect(devotionalRegistry().filter((d) => d.book === 'Joshua').length).toBe(24);
    expect(devotionalRegistry().filter((d) => d.book === 'Ruth').length).toBe(4);
    expect(devotionalRegistry().filter((d) => d.book === '1 Samuel').length).toBe(31);
    expect(devotionalRegistry().filter((d) => d.book === '2 Samuel').length).toBe(24);
  });

  it('every entry carries its PROGRESS title, duration, and asset name', () => {
    for (const [n, title, dur] of EXPECTED) {
      const d = getDevotional('1 Kings', n);
      expect(d, `1 Kings ${n}`).not.toBeNull();
      expect(d!.title).toBe(title);
      expect(d!.durationSec).toBe(dur);
      expect(d!.audioFile).toBe(`devotional-1kings-${n}.m4a`);
      // No transcript exists for the narrations — no invented words.
      expect(d!.paragraphs).toEqual([]);
    }
  });

  it('all 22 titles are distinct — no shared-title book in this one', () => {
    const titles = EXPECTED.map(([, t]) => t);
    expect(new Set(titles).size).toBe(22);
    const reg = devotionalRegistry().filter((d) => d.book === '1 Kings');
    expect(new Set(reg.map((d) => d.title)).size).toBe(22);
  });

  it('the door rule: every 1 Kings chapter has one, nothing beyond', () => {
    expect(getDevotional('1 Kings', 1)).not.toBeNull();
    expect(getDevotional('1 Kings', 22)).not.toBeNull();
    expect(getDevotional('1 Kings', 23)).toBeNull();
    expect(getDevotional('1 Kings', 0)).toBeNull();
  });
});

describe('v495 bundled audio — compressed, complete, wired', () => {
  it('all 22 assets exist, each voice-grade small, total ≤ 14 MB', () => {
    let total = 0;
    for (const [n] of EXPECTED) {
      const p = join(__dirname, '..', '..', 'assets', 'audio', `devotional-1kings-${n}.m4a`);
      const size = statSync(p).size;
      expect(size, `chapter ${n}`).toBeGreaterThan(100_000);
      expect(size, `chapter ${n}`).toBeLessThanOrEqual(700_000);
      total += size;
    }
    expect(total).toBeLessThanOrEqual(14_000_000);
  });

  it('the audio module requires exactly the 22 registered files', () => {
    const audio = read('lib/devotional-audio.ts');
    const requires = audio.match(/require\('@\/assets\/audio\/devotional-1kings-\d+\.m4a'\)/g) ?? [];
    expect(requires.length).toBe(22);
    for (const [n] of EXPECTED) {
      expect(audio).toContain(`[devotionalKey('1 Kings', ${n})]: require('@/assets/audio/devotional-1kings-${n}.m4a')`);
    }
  });

  it('every registry entry in the whole book set has a matching require', () => {
    const audio = read('lib/devotional-audio.ts');
    for (const d of devotionalRegistry()) {
      expect(audio, `${d.book} ${d.chapter}`).toContain(`require('@/assets/audio/${d.audioFile}')`);
    }
  });
});
