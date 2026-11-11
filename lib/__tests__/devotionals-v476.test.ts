// v476 — "Send the Ruth devotionals to the app."
// All 4 NotebookLM narrations of his Ruth commentary,
// registered and bundled (speech-compressed) exactly the way Genesis
// (v293), Deuteronomy (v474) and Joshua (v475) went in: registry
// entries in lib/devotionals.ts, requires in lib/devotional-audio.ts,
// files in assets/audio/. The audio is a narration of his words, not
// a recording of him speaking — the player copy rule from v293 stands
// untouched.

import { statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { devotionalRegistry, getDevotional } from '../devotionals';
import { readFileSync } from 'fs';

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');

// The PROGRESS.md record (~/workspace/devotionals/PROGRESS.md) — the
// titles and durations the registry must carry, chapter by chapter.
const EXPECTED: [number, string, number][] = [
  [1, "God's Grace in Naomi's Bitterness", 120],
  [2, 'How Boaz Previews Jesus in Ruth', 105],
  [3, "Ruth's Midnight Proposal to Boaz", 95],
  [4, 'The Sandal Exchange That Redeemed Ruth', 86],
];

describe('v476 registry — all of Ruth, PROGRESS titles', () => {
  it('holds exactly 4 Ruth entries, every chapter 1–4 exactly once', () => {
    const reg = devotionalRegistry().filter((d) => d.book === 'Ruth');
    expect(reg.length).toBe(4);
    expect(reg.map((d) => d.chapter).sort((a, b) => a - b)).toEqual(EXPECTED.map(([n]) => n));
  });

  // v492 re-pin: the whole-registry total moved 112 → 143 when
  // 1 Samuel (31 chapters) registered; the per-book pins below stand.
  it('the whole registry is now 143 — Genesis 50 + Deuteronomy 34 + Joshua 24 + Ruth 4 + 1 Samuel 31', () => {
    expect(devotionalRegistry().length).toBe(143);
    expect(devotionalRegistry().filter((d) => d.book === 'Genesis').length).toBe(50);
    expect(devotionalRegistry().filter((d) => d.book === 'Deuteronomy').length).toBe(34);
    expect(devotionalRegistry().filter((d) => d.book === 'Joshua').length).toBe(24);
  });

  it('every entry carries its PROGRESS title, duration, and asset name', () => {
    for (const [n, title, dur] of EXPECTED) {
      const d = getDevotional('Ruth', n);
      expect(d, `Ruth ${n}`).not.toBeNull();
      expect(d!.title).toBe(title);
      expect(d!.durationSec).toBe(dur);
      expect(d!.audioFile).toBe(`devotional-ruth-${n}.m4a`);
      // No transcript exists for the narrations — no invented words.
      expect(d!.paragraphs).toEqual([]);
    }
  });

  it('the door rule: every Ruth chapter has one, nothing beyond', () => {
    expect(getDevotional('Ruth', 1)).not.toBeNull();
    expect(getDevotional('Ruth', 4)).not.toBeNull();
    expect(getDevotional('Ruth', 5)).toBeNull();
    expect(getDevotional('Judges', 1)).toBeNull();
  });
});

describe('v476 bundled audio — compressed, complete, wired', () => {
  it('all 4 assets exist, each voice-grade small, total ≤ 3 MB', () => {
    let total = 0;
    for (const [n] of EXPECTED) {
      const p = join(__dirname, '..', '..', 'assets', 'audio', `devotional-ruth-${n}.m4a`);
      const size = statSync(p).size;
      expect(size, `chapter ${n}`).toBeGreaterThan(100_000);
      expect(size, `chapter ${n}`).toBeLessThanOrEqual(700_000);
      total += size;
    }
    expect(total).toBeLessThanOrEqual(3_000_000);
  });

  it('the audio module requires exactly the 4 registered files', () => {
    const audio = read('lib/devotional-audio.ts');
    const requires = audio.match(/require\('@\/assets\/audio\/devotional-ruth-\d+\.m4a'\)/g) ?? [];
    expect(requires.length).toBe(4);
    for (const [n] of EXPECTED) {
      expect(audio).toContain(`[devotionalKey('Ruth', ${n})]: require('@/assets/audio/devotional-ruth-${n}.m4a')`);
    }
  });
});
