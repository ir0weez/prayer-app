// v526 — "Send the Song of Solomon devotionals to the app."
// All 8 NotebookLM narrations of his Song of Solomon commentary,
// registered and bundled (speech-compressed) exactly the way Genesis
// (v293), Deuteronomy (v474), Joshua (v475), Ruth (v476), 1 Samuel
// (v492), 2 Samuel (v493), 1 Kings (v495), 2 Kings (v523), Proverbs
// (v524) and Ecclesiastes (v525) went in: registry entries in
// lib/devotionals.ts, requires in lib/devotional-audio.ts, files in
// assets/audio/. The audio is a narration of his words, not a
// recording of him speaking — the player copy rule from v293 stands
// untouched.
//
// No title traps in this book: all 8 titles are distinct, and none
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
// file runs a fraction under 1s past the displayed duration (ch 1
// file 83.9s vs PROGRESS 83, ch 2 100.4s vs 100, ch 3 94.7s vs 94,
// ch 4 89.9s vs 89, ch 5 100.0s vs 99, ch 6 100.2s vs 100, ch 7
// 84.8s vs 84, ch 8 91.2s vs 91 — the same convention
// v495/v523/v524/v525 followed).
const EXPECTED: [number, string, number][] = [
  [1, "The King's Table in Song of Solomon", 83],
  [2, 'Catching Little Foxes in Song of Solomon', 100],
  [3, 'Beholding Christ in Song of Solomon 3', 94],
  [4, 'How Christ Sees His Spotless Bride', 89],
  [5, 'Why Christ Is Altogether Lovely', 99],
  [6, 'Why Christ Chooses the Lowly Bride', 100],
  [7, 'How Christ Works Through His Bride', 84],
  [8, 'Unquenchable Love in Song of Solomon 8', 91],
];

describe('v526 registry — all of Song of Solomon, PROGRESS titles', () => {
  it('holds exactly 8 Song of Solomon entries, every chapter 1–8 exactly once', () => {
    const reg = devotionalRegistry().filter((d) => d.book === 'Song of Solomon');
    expect(reg.length).toBe(8);
    expect(reg.map((d) => d.chapter).sort((a, b) => a - b)).toEqual(EXPECTED.map(([n]) => n));
  });

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
    expect(devotionalRegistry().filter((d) => d.book === 'Proverbs').length).toBe(31);
    expect(devotionalRegistry().filter((d) => d.book === 'Ecclesiastes').length).toBe(12);
    expect(devotionalRegistry().filter((d) => d.book === 'Song of Solomon').length).toBe(8);
  });

  it('every entry carries its PROGRESS title, duration, and asset name', () => {
    for (const [n, title, dur] of EXPECTED) {
      const d = getDevotional('Song of Solomon', n);
      expect(d, `Song of Solomon ${n}`).not.toBeNull();
      expect(d!.title).toBe(title);
      expect(d!.durationSec).toBe(dur);
      expect(d!.audioFile).toBe(`devotional-songofsolomon-${n}.m4a`);
      // No transcript exists for the narrations — no invented words.
      expect(d!.paragraphs).toEqual([]);
    }
  });

  it('all 8 titles are distinct — and none collides with a title already in the registry', () => {
    const titles = EXPECTED.map(([, t]) => t);
    expect(new Set(titles).size).toBe(8);
    const reg = devotionalRegistry().filter((d) => d.book === 'Song of Solomon');
    expect(new Set(reg.map((d) => d.title)).size).toBe(8);
    const earlier = devotionalRegistry().filter((d) => d.book !== 'Song of Solomon').map((d) => d.title);
    for (const t of titles) expect(earlier).not.toContain(t);
  });

  it('the door rule: every Song of Solomon chapter has one, nothing beyond', () => {
    expect(getDevotional('Song of Solomon', 1)).not.toBeNull();
    expect(getDevotional('Song of Solomon', 8)).not.toBeNull();
    expect(getDevotional('Song of Solomon', 9)).toBeNull();
    expect(getDevotional('Song of Solomon', 0)).toBeNull();
  });
});

describe('v526 bundled audio — compressed, complete, wired', () => {
  it('all 8 assets exist, each voice-grade small, total ≤ 4.5 MB', () => {
    let total = 0;
    for (const [n] of EXPECTED) {
      const p = join(__dirname, '..', '..', 'assets', 'audio', `devotional-songofsolomon-${n}.m4a`);
      const size = statSync(p).size;
      expect(size, `chapter ${n}`).toBeGreaterThan(100_000);
      expect(size, `chapter ${n}`).toBeLessThanOrEqual(700_000);
      total += size;
    }
    expect(total).toBeLessThanOrEqual(4_500_000);
  });

  it('the audio module requires exactly the 8 registered files', () => {
    const audio = read('lib/devotional-audio.ts');
    const requires = audio.match(/require\('@\/assets\/audio\/devotional-songofsolomon-\d+\.m4a'\)/g) ?? [];
    expect(requires.length).toBe(8);
    for (const [n] of EXPECTED) {
      expect(audio).toContain(`[devotionalKey('Song of Solomon', ${n})]: require('@/assets/audio/devotional-songofsolomon-${n}.m4a')`);
    }
  });

  it('every registry entry in the whole book set has a matching require', () => {
    const audio = read('lib/devotional-audio.ts');
    for (const d of devotionalRegistry()) {
      expect(audio, `${d.book} ${d.chapter}`).toContain(`require('@/assets/audio/${d.audioFile}')`);
    }
  });
});
