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
  // v493 re-pin: the whole-registry total moved 143 → 167 when
  // 2 Samuel (24 chapters) registered; the per-book pins below stand.
  // v495 re-pin: the whole-registry total moved 167 → 189 when
  // 1 Kings (22 chapters) registered; the per-book pins below stand.
  // v523 re-pin: the whole-registry total moved 189 → 214 when
  // 2 Kings (25 chapters) registered; the per-book pins below stand.
    // v524 re-pin: the whole-registry total moved 214 → 245 when
  // Proverbs (31 chapters) registered; the per-book pins below stand.
  // v525 RE-BASE (2026-11-14): the whole-registry total moved 245 → 257 when
  // Ecclesiastes (12 chapters) registered; the per-book pins below stand.
  // v528 RE-BASE (2026-11-14): the whole-registry total moved 265 → 336 when
  // Isaiah (66 chapters), Obadiah (1) and Jonah (4) registered, downloadable
  // from the start (v527 model); the per-book pins below stand.
// v529 RE-BASE (2026-11-14): the whole-registry total moved 336 → 380 when
// Mark (16 chapters) and Acts (28) registered, downloadable from the
// start (v527 model); the per-book pins below stand.
// v530 RE-BASE (2026-11-15): the whole-registry total moved 380 → 409 when
// 1 Corinthians (16 chapters) and 2 Corinthians (13) registered, downloadable
// from the start (v527 model); the per-book pins below stand.
it('the whole registry is now 409 — Genesis 50 + Deuteronomy 34 + Joshua 24 + Ruth 4 + 1 Samuel 31 + 2 Samuel 24 + 1 Kings 22 + 2 Kings 25 + Proverbs 31 + Ecclesiastes 12 + Song of Solomon 8 + Isaiah 66 + Obadiah 1 + Jonah 4 + Mark 16 + Acts 28 + 1 Corinthians 16 + 2 Corinthians 13', () => {
    expect(devotionalRegistry().length).toBe(409);
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

// v527 RE-BASE (2026-11-14): this book's audio is HOSTED now, not
// bundled — the chapter devotionals switched to download-on-demand
// (Jonathan: "Switch them all to downloadable"). The very bytes
// that shipped in assets/audio/ were uploaded to the public
// devotional-library release under the same names; the registry
// carries each chapter's hosted name and exact byte size, and
// nothing is bundled anymore. The full registry↔hosting table is
// pinned in devotionals-v527.test.ts.
describe('v476 hosted audio — hosted, complete, wired (was: bundled)', () => {
  it('all 4 chapters carry their hosted size, each voice-grade small, total ≤ 3 MB', () => {
    let total = 0;
    for (const [n] of EXPECTED) {
      const size = getDevotional('Ruth', n)!.sizeBytes!;
      expect(size, `chapter ${n}`).toBeGreaterThan(100_000);
      expect(size, `chapter ${n}`).toBeLessThanOrEqual(700_000);
      total += size;
    }
    expect(total).toBeLessThanOrEqual(3_000_000);
  });

  it('the registry names exactly the 4 hosted files, and nothing is bundled', () => {
    for (const [n] of EXPECTED) {
      const d = getDevotional('Ruth', n)!;
      expect(d.audioFile).toBe(`devotional-ruth-${n}.m4a`);
      // No bundled copy stands in the app anymore.
      expect(() => statSync(join(__dirname, '..', '..', 'assets', 'audio', d.audioFile))).toThrow();
    }
    // The bundled require map is gone with the bundle.
    expect(() => read('lib/devotional-audio.ts')).toThrow();
  });
});

