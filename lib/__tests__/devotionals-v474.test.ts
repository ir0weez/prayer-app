// v474 — "Send the Deuteronomy devotionals to the app."
// All 34 NotebookLM narrations of his Deuteronomy commentary,
// registered and bundled (speech-compressed) exactly the way Genesis
// went in v293: registry entries in lib/devotionals.ts, requires in
// lib/devotional-audio.ts, files in assets/audio/. The audio is a
// narration of his words, not a recording of him speaking — the
// player copy rule from v293 stands untouched.

import { statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { devotionalRegistry, getDevotional } from '../devotionals';
import { readFileSync } from 'fs';

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');

// The PROGRESS.md record (~/workspace/devotionals/PROGRESS.md) — the
// titles and durations the registry must carry, chapter by chapter.
const EXPECTED: [number, string, number][] = [
  [1, 'Why Eleven Days Became Thirty Eight Years', 98],
  [2, 'Stop Circling the Wilderness', 85],
  [3, 'Defeating King Og and Preparing Joshua', 96],
  [4, 'Why We Create Cheap Gods', 104],
  [5, 'Why God Gave the Ten Commandments', 84],
  [6, 'Why Comfort Is Your Greatest Spiritual Threat', 97],
  [7, 'Why God Chooses the Weakest', 90],
  [8, "Don't Forget God in the Promised Land", 83],
  [9, 'Why Israel Survived the Golden Calf', 95],
  [10, 'Why God Is Your True Inheritance', 95],
  [11, "Trading Egyptian Hustle for God's Rain", 93],
  [12, 'Destroying Pagan Altars for Pure Worship', 88],
  [13, 'Spotting Deception from Preachers and Family', 88],
  [14, 'Why Deuteronomy 14 Calls Us Set Apart', 82],
  [15, 'Erasing Debts Every Seven Years', 83],
  [16, 'How Past Slavery Fuels Present Joy', 86],
  [17, "God's Rules for Worship and Kings", 94],
  [18, 'Supporting Levites and Spotting False Prophets', 102],
  [19, 'Cities of Refuge and Witness Laws', 92],
  [20, 'Facing Impossible Battles with Undivided Trust', 93],
  [21, 'How Christ Took the Deuteronomy Curse', 106],
  [22, 'Why Deuteronomy 22 Still Matters', 108],
  [23, 'Guarding Your Camp and Keeping Vows', 108],
  [24, 'Deuteronomy 24 on Marriage, Fairness, and Mercy', 98],
  [25, 'Protecting Widows and Blotting Out Amalek', 100],
  [26, 'The Original Thanksgiving in Deuteronomy 26', 108],
  [27, 'Why Deuteronomy 27 Requires Daily Renewal', 86],
  [28, 'The Cost of Rebellion in Deuteronomy 28', 101],
  [29, "Conditions for Living in God's Promises", 108],
  [30, 'God Wants Your Heart Not Your Service', 83],
  [31, 'Why Comfort Causes Spiritual Amnesia', 90],
  [32, 'When Comfort Makes Us Forget God', 111],
  [33, "Moses' Final Blessings to Israel's Tribes", 92],
  [34, 'Moses Dies Outside the Promised Land', 88],
];

describe('v474 registry — all of Deuteronomy, PROGRESS titles', () => {
  it('holds exactly 34 Deuteronomy entries, every chapter 1–34 exactly once', () => {
    const reg = devotionalRegistry().filter((d) => d.book === 'Deuteronomy');
    expect(reg.length).toBe(34);
    expect(reg.map((d) => d.chapter).sort((a, b) => a - b)).toEqual(EXPECTED.map(([n]) => n));
  });

  // v475 amendment: Joshua 1–24 joined the registry, so the whole-
  // registry total moved to the v475 test (now 108). This test keeps
  // the Deuteronomy count pinned; the total lives in v475.
  it('the Deuteronomy slice is still exactly 34, Genesis still 50', () => {
    expect(devotionalRegistry().filter((d) => d.book === 'Deuteronomy').length).toBe(34);
    expect(devotionalRegistry().filter((d) => d.book === 'Genesis').length).toBe(50);
  });

  it('every entry carries its PROGRESS title, duration, and asset name', () => {
    for (const [n, title, dur] of EXPECTED) {
      const d = getDevotional('Deuteronomy', n);
      expect(d, `Deuteronomy ${n}`).not.toBeNull();
      expect(d!.title).toBe(title);
      expect(d!.durationSec).toBe(dur);
      expect(d!.audioFile).toBe(`devotional-deuteronomy-${n}.m4a`);
      // No transcript exists for the narrations — no invented words.
      expect(d!.paragraphs).toEqual([]);
    }
  });

  it('the door rule: every Deuteronomy chapter has one, nothing beyond', () => {
    expect(getDevotional('Deuteronomy', 1)).not.toBeNull();
    expect(getDevotional('Deuteronomy', 34)).not.toBeNull();
    expect(getDevotional('Deuteronomy', 35)).toBeNull();
    expect(getDevotional('Exodus', 1)).toBeNull();
  });
});

describe('v474 bundled audio — compressed, complete, wired', () => {
  it('all 34 assets exist, each voice-grade small, total ≤ 20 MB', () => {
    let total = 0;
    for (const [n] of EXPECTED) {
      const p = join(__dirname, '..', '..', 'assets', 'audio', `devotional-deuteronomy-${n}.m4a`);
      const size = statSync(p).size;
      expect(size, `chapter ${n}`).toBeGreaterThan(100_000);
      expect(size, `chapter ${n}`).toBeLessThanOrEqual(700_000);
      total += size;
    }
    expect(total).toBeLessThanOrEqual(20_000_000);
  });

  it('the audio module requires exactly the 34 registered files', () => {
    const audio = read('lib/devotional-audio.ts');
    const requires = audio.match(/require\('@\/assets\/audio\/devotional-deuteronomy-\d+\.m4a'\)/g) ?? [];
    expect(requires.length).toBe(34);
    for (const [n] of EXPECTED) {
      expect(audio).toContain(`[devotionalKey('Deuteronomy', ${n})]: require('@/assets/audio/devotional-deuteronomy-${n}.m4a')`);
    }
  });
});
