// v493 — "Send the 2 Samuel devotionals to the app."
// All 24 NotebookLM narrations of his 2 Samuel commentary,
// registered and bundled (speech-compressed) exactly the way Genesis
// (v293), Deuteronomy (v474), Joshua (v475), Ruth (v476) and
// 1 Samuel (v492) went in: registry entries in lib/devotionals.ts,
// requires in lib/devotional-audio.ts, files in assets/audio/. The
// audio is a narration of his words, not a recording of him
// speaking — the player copy rule from v293 stands untouched.
//
// No title traps in this book: all 24 titles are distinct.

import { statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { devotionalRegistry, getDevotional } from '../devotionals';
import { readFileSync } from 'fs';

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');

// The PROGRESS.md record (~/workspace/devotionals/PROGRESS.md) — the
// titles and durations the registry must carry, chapter by chapter.
const EXPECTED: [number, string, number][] = [
  [1, "Why David Executed King Saul's Messenger", 95],
  [2, "David's Patience and Israel's Civil War", 88],
  [3, 'Stepping Outside the City of Refuge', 94],
  [4, "Why David Executed Ishbosheth's Murderers", 81],
  [5, 'Why King David Asked God First', 97],
  [6, 'Why Uzzah Died and David Danced', 99],
  [7, "Why God Stopped David's Temple", 104],
  [8, 'How King David Expanded His Kingdom', 88],
  [9, 'David Welcomes Mephibosheth to His Table', 91],
  [10, "Why King Hanun Rejected David's Grace", 106],
  [11, "King David's Deadly Betrayal of Uriah", 99],
  [12, "Nathan's Rebuke and David's Redemption", 101],
  [13, "David's Passive Parenting Destroyed His Family", 98],
  [14, "David's Refusal to Forgive Absalom", 94],
  [15, "When Absalom Stole David's Kingdom", 107],
  [16, 'King David Endures Curses and Betrayal', 102],
  [17, 'How Hushai Saved David from Absalom', 89],
  [18, 'King David Mourns His Son Absalom', 94],
  [19, 'How David Restored Israel After Absalom', 106],
  [20, "A Wise Woman Ends Sheba's Rebellion", 85],
  [21, "When David Couldn't Fight Giants Anymore", 101],
  [22, "King David's Song of Deliverance", 103],
  [23, "David's Final Words and Mighty Men", 101],
  [24, 'Why David Refused a Free Sacrifice', 92],
];

describe('v493 registry — all of 2 Samuel, PROGRESS titles', () => {
  it('holds exactly 24 2 Samuel entries, every chapter 1–24 exactly once', () => {
    const reg = devotionalRegistry().filter((d) => d.book === '2 Samuel');
    expect(reg.length).toBe(24);
    expect(reg.map((d) => d.chapter).sort((a, b) => a - b)).toEqual(EXPECTED.map(([n]) => n));
  });

  // v495 re-pin: the whole-registry total moved 167 → 189 when
  // 1 Kings (22 chapters) registered; the per-book pins below stand.
  // v523 re-pin: the whole-registry total moved 189 → 214 when
  // 2 Kings (25 chapters) registered; the per-book pins below stand.
    // v524 re-pin: the whole-registry total moved 214 → 245 when
  // Proverbs (31 chapters) registered; the per-book pins below stand.
  // v525 RE-BASE (2026-11-14): the whole-registry total moved 245 → 257 when
  // Ecclesiastes (12 chapters) registered; the per-book pins below stand.
it('the whole registry is now 257 — Genesis 50 + Deuteronomy 34 + Joshua 24 + Ruth 4 + 1 Samuel 31 + 2 Samuel 24 + 1 Kings 22 + 2 Kings 25 + Proverbs 31 + Ecclesiastes 12', () => {
    expect(devotionalRegistry().length).toBe(257);
    expect(devotionalRegistry().filter((d) => d.book === 'Genesis').length).toBe(50);
    expect(devotionalRegistry().filter((d) => d.book === 'Deuteronomy').length).toBe(34);
    expect(devotionalRegistry().filter((d) => d.book === 'Joshua').length).toBe(24);
    expect(devotionalRegistry().filter((d) => d.book === 'Ruth').length).toBe(4);
    expect(devotionalRegistry().filter((d) => d.book === '1 Samuel').length).toBe(31);
  });

  it('every entry carries its PROGRESS title, duration, and asset name', () => {
    for (const [n, title, dur] of EXPECTED) {
      const d = getDevotional('2 Samuel', n);
      expect(d, `2 Samuel ${n}`).not.toBeNull();
      expect(d!.title).toBe(title);
      expect(d!.durationSec).toBe(dur);
      expect(d!.audioFile).toBe(`devotional-2samuel-${n}.m4a`);
      // No transcript exists for the narrations — no invented words.
      expect(d!.paragraphs).toEqual([]);
    }
  });

  it('all 24 titles are distinct — no shared-title book in this one', () => {
    const titles = EXPECTED.map(([, t]) => t);
    expect(new Set(titles).size).toBe(24);
    const reg = devotionalRegistry().filter((d) => d.book === '2 Samuel');
    expect(new Set(reg.map((d) => d.title)).size).toBe(24);
  });

  it('the door rule: every 2 Samuel chapter has one, nothing beyond', () => {
    expect(getDevotional('2 Samuel', 1)).not.toBeNull();
    expect(getDevotional('2 Samuel', 24)).not.toBeNull();
    expect(getDevotional('2 Samuel', 25)).toBeNull();
    expect(getDevotional('2 Samuel', 0)).toBeNull();
  });
});

describe('v493 bundled audio — compressed, complete, wired', () => {
  it('all 24 assets exist, each voice-grade small, total ≤ 14 MB', () => {
    let total = 0;
    for (const [n] of EXPECTED) {
      const p = join(__dirname, '..', '..', 'assets', 'audio', `devotional-2samuel-${n}.m4a`);
      const size = statSync(p).size;
      expect(size, `chapter ${n}`).toBeGreaterThan(100_000);
      expect(size, `chapter ${n}`).toBeLessThanOrEqual(700_000);
      total += size;
    }
    expect(total).toBeLessThanOrEqual(14_000_000);
  });

  it('the audio module requires exactly the 24 registered files', () => {
    const audio = read('lib/devotional-audio.ts');
    const requires = audio.match(/require\('@\/assets\/audio\/devotional-2samuel-\d+\.m4a'\)/g) ?? [];
    expect(requires.length).toBe(24);
    for (const [n] of EXPECTED) {
      expect(audio).toContain(`[devotionalKey('2 Samuel', ${n})]: require('@/assets/audio/devotional-2samuel-${n}.m4a')`);
    }
  });

  it('every registry entry in the whole book set has a matching require', () => {
    const audio = read('lib/devotional-audio.ts');
    for (const d of devotionalRegistry()) {
      expect(audio, `${d.book} ${d.chapter}`).toContain(`require('@/assets/audio/${d.audioFile}')`);
    }
  });
});
