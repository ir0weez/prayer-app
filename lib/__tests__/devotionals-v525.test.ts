// v525 — "Send the Ecclesiastes devotionals to the app."
// All 12 NotebookLM narrations of his Ecclesiastes commentary,
// registered and bundled (speech-compressed) exactly the way Genesis
// (v293), Deuteronomy (v474), Joshua (v475), Ruth (v476), 1 Samuel
// (v492), 2 Samuel (v493), 1 Kings (v495), 2 Kings (v523) and
// Proverbs (v524) went in: registry entries in lib/devotionals.ts,
// requires in lib/devotional-audio.ts, files in assets/audio/. The
// audio is a narration of his words, not a recording of him
// speaking — the player copy rule from v293 stands untouched.
//
// No title traps in this book: all 12 titles are distinct, and none
// is shared with an earlier book (checked against the whole
// registry, pinned below).

import { statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { devotionalRegistry, getDevotional } from '../devotionals';
import { readFileSync } from 'fs';

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');

// The PROGRESS.md record (~/workspace/devotionals/PROGRESS.md) — the
// titles and durations the registry must carry, chapter by chapter.
// Registry durations follow the PROGRESS record even where a source
// file runs ~1s past the displayed duration (ch 3 file 99.0s vs
// PROGRESS 98, ch 7 file 101.0s vs PROGRESS 100 — the same
// convention v495/v523/v524 followed).
const EXPECTED: [number, string, number][] = [
  [1, 'Why Life Feels Like Chasing Wind', 98],
  [2, 'Why Earthly Wealth Cannot Cure Death', 92],
  [3, 'Why Hard Seasons Build Spiritual Endurance', 98],
  [4, 'The Trap of Doing Life Alone', 95],
  [5, 'Why Hollow Religion and Wealth Fail', 92],
  [6, 'Why Chasing Wealth Leaves You Empty', 87],
  [7, 'Stop Walking the Middle Road', 100],
  [8, 'No Room for Lukewarm Faith', 74],
  [9, 'The Forgotten Hero of Ecclesiastes 9', 81],
  [10, 'How Small Mistakes Destroy Good Leadership', 81],
  [11, "Don't Wait for Perfect Conditions to Give", 94],
  [12, 'Fear God and Prepare for Eternity', 89],
];

describe('v525 registry — all of Ecclesiastes, PROGRESS titles', () => {
  it('holds exactly 12 Ecclesiastes entries, every chapter 1–12 exactly once', () => {
    const reg = devotionalRegistry().filter((d) => d.book === 'Ecclesiastes');
    expect(reg.length).toBe(12);
    expect(reg.map((d) => d.chapter).sort((a, b) => a - b)).toEqual(EXPECTED.map(([n]) => n));
  });

  it('the whole registry is now 257 — Genesis 50 + Deuteronomy 34 + Joshua 24 + Ruth 4 + 1 Samuel 31 + 2 Samuel 24 + 1 Kings 22 + 2 Kings 25 + Proverbs 31 + Ecclesiastes 12', () => {
    expect(devotionalRegistry().length).toBe(257);
    expect(devotionalRegistry().filter((d) => d.book === 'Genesis').length).toBe(50);
    expect(devotionalRegistry().filter((d) => d.book === 'Deuteronomy').length).toBe(34);
    expect(devotionalRegistry().filter((d) => d.book === 'Joshua').length).toBe(24);
    expect(devotionalRegistry().filter((d) => d.book === 'Ruth').length).toBe(4);
    expect(devotionalRegistry().filter((d) => d.book === '1 Samuel').length).toBe(31);
    expect(devotionalRegistry().filter((d) => d.book === '2 Samuel').length).toBe(24);
    expect(devotionalRegistry().filter((d) => d.book === '1 Kings').length).toBe(22);
    expect(devotionalRegistry().filter((d) => d.book === '2 Kings').length).toBe(25);
    expect(devotionalRegistry().filter((d) => d.book === 'Proverbs').length).toBe(31);
  });

  it('every entry carries its PROGRESS title, duration, and asset name', () => {
    for (const [n, title, dur] of EXPECTED) {
      const d = getDevotional('Ecclesiastes', n);
      expect(d, `Ecclesiastes ${n}`).not.toBeNull();
      expect(d!.title).toBe(title);
      expect(d!.durationSec).toBe(dur);
      expect(d!.audioFile).toBe(`devotional-ecclesiastes-${n}.m4a`);
      // No transcript exists for the narrations — no invented words.
      expect(d!.paragraphs).toEqual([]);
    }
  });

  it('all 12 titles are distinct — and none collides with a title already in the registry', () => {
    const titles = EXPECTED.map(([, t]) => t);
    expect(new Set(titles).size).toBe(12);
    const reg = devotionalRegistry().filter((d) => d.book === 'Ecclesiastes');
    expect(new Set(reg.map((d) => d.title)).size).toBe(12);
    const earlier = devotionalRegistry().filter((d) => d.book !== 'Ecclesiastes').map((d) => d.title);
    for (const t of titles) expect(earlier).not.toContain(t);
  });

  it('the door rule: every Ecclesiastes chapter has one, nothing beyond', () => {
    expect(getDevotional('Ecclesiastes', 1)).not.toBeNull();
    expect(getDevotional('Ecclesiastes', 12)).not.toBeNull();
    expect(getDevotional('Ecclesiastes', 13)).toBeNull();
    expect(getDevotional('Ecclesiastes', 0)).toBeNull();
  });
});

describe('v525 bundled audio — compressed, complete, wired', () => {
  it('all 12 assets exist, each voice-grade small, total ≤ 6.5 MB', () => {
    let total = 0;
    for (const [n] of EXPECTED) {
      const p = join(__dirname, '..', '..', 'assets', 'audio', `devotional-ecclesiastes-${n}.m4a`);
      const size = statSync(p).size;
      expect(size, `chapter ${n}`).toBeGreaterThan(100_000);
      expect(size, `chapter ${n}`).toBeLessThanOrEqual(700_000);
      total += size;
    }
    expect(total).toBeLessThanOrEqual(6_500_000);
  });

  it('the audio module requires exactly the 12 registered files', () => {
    const audio = read('lib/devotional-audio.ts');
    const requires = audio.match(/require\('@\/assets\/audio\/devotional-ecclesiastes-\d+\.m4a'\)/g) ?? [];
    expect(requires.length).toBe(12);
    for (const [n] of EXPECTED) {
      expect(audio).toContain(`[devotionalKey('Ecclesiastes', ${n})]: require('@/assets/audio/devotional-ecclesiastes-${n}.m4a')`);
    }
  });

  it('every registry entry in the whole book set has a matching require', () => {
    const audio = read('lib/devotional-audio.ts');
    for (const d of devotionalRegistry()) {
      expect(audio, `${d.book} ${d.chapter}`).toContain(`require('@/assets/audio/${d.audioFile}')`);
    }
  });
});
