// v492 — "Send the 1 Samuel devotionals to the app."
// All 31 NotebookLM narrations of his 1 Samuel commentary,
// registered and bundled (speech-compressed) exactly the way Genesis
// (v293), Deuteronomy (v474), Joshua (v475) and Ruth (v476) went in:
// registry entries in lib/devotionals.ts, requires in
// lib/devotional-audio.ts, files in assets/audio/. The audio is a
// narration of his words, not a recording of him speaking — the
// player copy rule from v293 stands untouched.
//
// The trap (same shape as Joshua 23/24): chapters 24 and 26 share
// ONE title ("Why David Refused to Kill Saul") — both are David
// sparing Saul, distinct audios, distinct durations (91s vs 84s).

import { statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { devotionalRegistry, getDevotional } from '../devotionals';
import { readFileSync } from 'fs';

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');

// The PROGRESS.md record (~/workspace/devotionals/PROGRESS.md) — the
// titles and durations the registry must carry, chapter by chapter.
const EXPECTED: [number, string, number][] = [
  [1, "Hannah's Desperate Prayer and Kept Vow", 102],
  [2, "Samuel Rises as Eli's House Falls", 108],
  [3, "Young Samuel Hears God's Voice", 109],
  [4, 'The Day Israel Lost the Ark', 100],
  [5, "Why the Philistines Couldn't Keep God's Ark", 98],
  [6, 'Why the Philistines Made Golden Hemorrhoids', 106],
  [7, 'Forsaking Idols and the Ebenezer Stone', 99],
  [8, 'Israel Rejects God for a King', 90],
  [9, 'From Lost Donkeys to King Saul', 89],
  [10, 'Why King Saul Hid Among the Luggage', 92],
  [11, 'King Saul Defeats the Ammonites', 103],
  [12, 'Choosing an Earthly King Over God', 88],
  [13, "King Saul's Disastrous Sacrifice", 90],
  [14, "Jonathan's Faith and Saul's Rash Vow", 97],
  [15, 'Why God Rejected King Saul', 97],
  [16, 'Why God Chose a Shepherd King', 95],
  [17, 'Trusting God Over Earthly Champions', 83],
  [18, "Saul's Javelin and David's Double Dowry", 86],
  [19, 'God Stops Saul From Killing David', 91],
  [20, "Jonathan's Arrow Signal and Tragic Farewell", 104],
  [21, "David Fakes Insanity in Goliath's Hometown", 88],
  [22, 'How God Forged David Among Misfits', 94],
  [23, 'How God Rescued David From Saul', 79],
  [24, 'Why David Refused to Kill Saul', 91],
  // NotebookLM's title verbatim — no apostrophe in "Davids".
  [25, 'How Abigail Stopped Davids Revenge', 99],
  [26, 'Why David Refused to Kill Saul', 84],
  [27, "David's Double Life in Ziklag", 93],
  [28, "Saul's Desperate Visit to the Witch", 86],
  [29, 'How God Rescued David From the Philistines', 98],
  [30, 'How David Recovered Everything at Ziklag', 98],
  [31, 'The Tragic Death of King Saul', 108],
];

describe('v492 registry — all of 1 Samuel, PROGRESS titles', () => {
  it('holds exactly 31 1 Samuel entries, every chapter 1–31 exactly once', () => {
    const reg = devotionalRegistry().filter((d) => d.book === '1 Samuel');
    expect(reg.length).toBe(31);
    expect(reg.map((d) => d.chapter).sort((a, b) => a - b)).toEqual(EXPECTED.map(([n]) => n));
  });

  // v493 re-pin: the whole-registry total moved 143 → 167 when
  // 2 Samuel (24 chapters) registered; the per-book pins below stand.
  // v495 re-pin: the whole-registry total moved 167 → 189 when
  // 1 Kings (22 chapters) registered; the per-book pins below stand.
  // v523 re-pin: the whole-registry total moved 189 → 214 when
  // 2 Kings (25 chapters) registered; the per-book pins below stand.
    // v524 re-pin: the whole-registry total moved 214 → 245 when
  // Proverbs (31 chapters) registered; the per-book pins below stand.
it('the whole registry is now 245 — Genesis 50 + Deuteronomy 34 + Joshua 24 + Ruth 4 + 1 Samuel 31 + 2 Samuel 24 + 1 Kings 22 + 2 Kings 25 + Proverbs 31', () => {
    expect(devotionalRegistry().length).toBe(245);
    expect(devotionalRegistry().filter((d) => d.book === 'Genesis').length).toBe(50);
    expect(devotionalRegistry().filter((d) => d.book === 'Deuteronomy').length).toBe(34);
    expect(devotionalRegistry().filter((d) => d.book === 'Joshua').length).toBe(24);
    expect(devotionalRegistry().filter((d) => d.book === 'Ruth').length).toBe(4);
  });

  it('every entry carries its PROGRESS title, duration, and asset name', () => {
    for (const [n, title, dur] of EXPECTED) {
      const d = getDevotional('1 Samuel', n);
      expect(d, `1 Samuel ${n}`).not.toBeNull();
      expect(d!.title).toBe(title);
      expect(d!.durationSec).toBe(dur);
      expect(d!.audioFile).toBe(`devotional-1samuel-${n}.m4a`);
      // No transcript exists for the narrations — no invented words.
      expect(d!.paragraphs).toEqual([]);
    }
  });

  it('chapters 24 and 26 share one title but are distinct entries', () => {
    const d24 = getDevotional('1 Samuel', 24)!;
    const d26 = getDevotional('1 Samuel', 26)!;
    expect(d24.title).toBe('Why David Refused to Kill Saul');
    expect(d26.title).toBe('Why David Refused to Kill Saul');
    expect(d24.durationSec).toBe(91);
    expect(d26.durationSec).toBe(84);
    expect(d24.audioFile).toBe('devotional-1samuel-24.m4a');
    expect(d26.audioFile).toBe('devotional-1samuel-26.m4a');
    expect(d24.audioFile).not.toBe(d26.audioFile);
  });

  it('the door rule: every 1 Samuel chapter has one, nothing beyond', () => {
    expect(getDevotional('1 Samuel', 1)).not.toBeNull();
    expect(getDevotional('1 Samuel', 31)).not.toBeNull();
    expect(getDevotional('1 Samuel', 32)).toBeNull();
    // v493 re-pin: 2 Samuel 1 now exists (registered in v493);
    // the forward-guard moves to the chapter past its end.
    expect(getDevotional('2 Samuel', 25)).toBeNull();
  });
});

describe('v492 bundled audio — compressed, complete, wired', () => {
  it('all 31 assets exist, each voice-grade small, total ≤ 17 MB', () => {
    let total = 0;
    for (const [n] of EXPECTED) {
      const p = join(__dirname, '..', '..', 'assets', 'audio', `devotional-1samuel-${n}.m4a`);
      const size = statSync(p).size;
      expect(size, `chapter ${n}`).toBeGreaterThan(100_000);
      expect(size, `chapter ${n}`).toBeLessThanOrEqual(700_000);
      total += size;
    }
    expect(total).toBeLessThanOrEqual(17_000_000);
  });

  it('the audio module requires exactly the 31 registered files', () => {
    const audio = read('lib/devotional-audio.ts');
    const requires = audio.match(/require\('@\/assets\/audio\/devotional-1samuel-\d+\.m4a'\)/g) ?? [];
    expect(requires.length).toBe(31);
    for (const [n] of EXPECTED) {
      expect(audio).toContain(`[devotionalKey('1 Samuel', ${n})]: require('@/assets/audio/devotional-1samuel-${n}.m4a')`);
    }
  });

  it('every registry entry in the whole book set has a matching require', () => {
    const audio = read('lib/devotional-audio.ts');
    for (const d of devotionalRegistry()) {
      expect(audio, `${d.book} ${d.chapter}`).toContain(`require('@/assets/audio/${d.audioFile}')`);
    }
  });
});
