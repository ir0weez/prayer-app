// v475 — "Send the Joshua devotionals to the app."
// All 24 NotebookLM narrations of his Joshua commentary,
// registered and bundled (speech-compressed) exactly the way Genesis
// (v293) and Deuteronomy (v474) went in: registry entries in
// lib/devotionals.ts, requires in lib/devotional-audio.ts, files in
// assets/audio/. The audio is a narration of his words, not a
// recording of him speaking — the player copy rule from v293 stands
// untouched.
//
// The trap: chapters 23 and 24 share ONE title ("Joshua's Final
// Warning to Israel") — both are farewell addresses, distinct audios,
// distinct durations (102s vs 106s). A duplicate ch-23 generation,
// "Joshua's Final Ultimatum to Israel" (1:49), was deleted in
// NotebookLM and must NOT appear anywhere in the registry.

import { statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { devotionalRegistry, getDevotional } from '../devotionals';
import { readFileSync } from 'fs';

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');

// The PROGRESS.md record (~/workspace/devotionals/PROGRESS.md) — the
// titles and durations the registry must carry, chapter by chapter.
const EXPECTED: [number, string, number][] = [
  [1, 'Stop Settling Outside the Promised Land', 93],
  [2, 'How Rahab Saved Israels Spies', 85],
  [3, 'When the Jordan River Stopped', 95],
  [4, "Joshua's Twelve Stones of Testimony", 97],
  [5, "God's Unexpected Pause Before Battle", 90],
  [6, "How Shouting Brought Down Jericho's Walls", 97],
  [7, "How Achan's Hidden Sin Defeated Israel", 105],
  [8, 'Defeating the Flesh in Joshua 8', 94],
  [9, 'How the Gibeonites Tricked Israel', 100],
  [10, 'Why God Stopped the Sun for Joshua', 91],
  [11, 'Joshua Defeats the Anakim Giants', 104],
  [12, 'How Israel Defeated 31 Kings', 112],
  [13, 'Stop Settling for Ten Percent', 86],
  [14, 'Caleb Claims Hebron at 85', 91],
  [15, "Caleb's Faith and Judah's Unfinished Battle", 95],
  [16, "Don't Make Peace With Your Canaanites", 92],
  [17, 'Stop Complaining and Grab an Axe', 104],
  [18, 'Stop Slacking and Claim Your Promised Land', 90],
  [19, 'Why Joshua Chose the Leftover Land', 86],
  [20, 'Cities of Refuge Point to Jesus', 106],
  [21, 'Why God Scattered the Levites', 99],
  [22, 'The Altar That Almost Sparked Civil War', 84],
  [23, "Joshua's Final Warning to Israel", 102],
  [24, "Joshua's Final Warning to Israel", 106],
];

describe('v475 registry — all of Joshua, PROGRESS titles', () => {
  it('holds exactly 24 Joshua entries, every chapter 1–24 exactly once', () => {
    const reg = devotionalRegistry().filter((d) => d.book === 'Joshua');
    expect(reg.length).toBe(24);
    expect(reg.map((d) => d.chapter).sort((a, b) => a - b)).toEqual(EXPECTED.map(([n]) => n));
  });

  it('the whole registry is now 108 — Genesis 50 + Deuteronomy 34 + Joshua 24', () => {
    expect(devotionalRegistry().length).toBe(108);
    expect(devotionalRegistry().filter((d) => d.book === 'Genesis').length).toBe(50);
    expect(devotionalRegistry().filter((d) => d.book === 'Deuteronomy').length).toBe(34);
  });

  it('every entry carries its PROGRESS title, duration, and asset name', () => {
    for (const [n, title, dur] of EXPECTED) {
      const d = getDevotional('Joshua', n);
      expect(d, `Joshua ${n}`).not.toBeNull();
      expect(d!.title).toBe(title);
      expect(d!.durationSec).toBe(dur);
      expect(d!.audioFile).toBe(`devotional-joshua-${n}.m4a`);
      // No transcript exists for the narrations — no invented words.
      expect(d!.paragraphs).toEqual([]);
    }
  });

  it('chapters 23 and 24 share one title but are distinct entries', () => {
    const d23 = getDevotional('Joshua', 23)!;
    const d24 = getDevotional('Joshua', 24)!;
    expect(d23.title).toBe("Joshua's Final Warning to Israel");
    expect(d24.title).toBe("Joshua's Final Warning to Israel");
    expect(d23.durationSec).toBe(102);
    expect(d24.durationSec).toBe(106);
    expect(d23.audioFile).toBe('devotional-joshua-23.m4a');
    expect(d24.audioFile).toBe('devotional-joshua-24.m4a');
    expect(d23.audioFile).not.toBe(d24.audioFile);
  });

  it('the deleted duplicate title never appears in the registry', () => {
    expect(devotionalRegistry().some((d) => d.title.includes('Ultimatum'))).toBe(false);
  });

  it('the door rule: every Joshua chapter has one, nothing beyond', () => {
    expect(getDevotional('Joshua', 1)).not.toBeNull();
    expect(getDevotional('Joshua', 24)).not.toBeNull();
    expect(getDevotional('Joshua', 25)).toBeNull();
    expect(getDevotional('Judges', 1)).toBeNull();
  });
});

describe('v475 bundled audio — compressed, complete, wired', () => {
  it('all 24 assets exist, each voice-grade small, total ≤ 15 MB', () => {
    let total = 0;
    for (const [n] of EXPECTED) {
      const p = join(__dirname, '..', '..', 'assets', 'audio', `devotional-joshua-${n}.m4a`);
      const size = statSync(p).size;
      expect(size, `chapter ${n}`).toBeGreaterThan(100_000);
      expect(size, `chapter ${n}`).toBeLessThanOrEqual(700_000);
      total += size;
    }
    expect(total).toBeLessThanOrEqual(15_000_000);
  });

  it('the audio module requires exactly the 24 registered files', () => {
    const audio = read('lib/devotional-audio.ts');
    const requires = audio.match(/require\('@\/assets\/audio\/devotional-joshua-\d+\.m4a'\)/g) ?? [];
    expect(requires.length).toBe(24);
    for (const [n] of EXPECTED) {
      expect(audio).toContain(`[devotionalKey('Joshua', ${n})]: require('@/assets/audio/devotional-joshua-${n}.m4a')`);
    }
  });
});
