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

  // v528 RE-BASE (2026-11-14): the whole-registry total moved 265 → 336 when
  // Isaiah (66 chapters), Obadiah (1) and Jonah (4) registered, downloadable
  // from the start (v527 model); the per-book pins below stand.
  // v531 RE-BASE (2026-11-15): the whole-registry total moved 409 → 419 when
  // Ephesians (6 chapters) and Philippians (4) registered, downloadable
  // from the start (v527 model); the per-book pins below stand.
  // v532 RE-BASE (2026-11-15): the whole-registry total moved 419 → 432 when
  // Hebrews (13 chapters) registered, downloadable from the start (v527
  // model); the per-book pins below stand.
  // v529 RE-BASE (2026-11-14): the whole-registry total moved 336 → 380 when
  // Mark (16 chapters) and Acts (28) registered, downloadable from the
  // start (v527 model); the per-book pins below stand.
  // v530 RE-BASE (2026-11-15): the whole-registry total moved 380 → 409 when
  // 1 Corinthians (16 chapters) and 2 Corinthians (13) registered, downloadable
  // from the start (v527 model); the per-book pins below stand.
  // v534 RE-BASE (2026-11-15): the whole-registry total moved 432 → 453 when
  // James (5 chapters), 1 Peter (5), 2 Peter (3), 1 John (5), 2 John (1),
  // 3 John (1) and Jude (1) registered, downloadable from the start (v527
  // model); the per-book pins below stand.
  // v540 RE-BASE (2026-11-15): the whole-registry total moved 453 → 475 when
  // Revelation (22 chapters) registered, downloadable from the start (v527
  // model); the per-book pins below stand.
  it('the whole registry is now 475 — Genesis 50 + Deuteronomy 34 + Joshua 24 + Ruth 4 + 1 Samuel 31 + 2 Samuel 24 + 1 Kings 22 + 2 Kings 25 + Proverbs 31 + Ecclesiastes 12 + Song of Solomon 8 + Isaiah 66 + Obadiah 1 + Jonah 4 + Mark 16 + Acts 28 + 1 Corinthians 16 + 2 Corinthians 13 + Ephesians 6 + Philippians 4 + Hebrews 13 + James 5 + 1 Peter 5 + 2 Peter 3 + 1 John 5 + 2 John 1 + 3 John 1 + Jude 1 + Revelation 22', () => {
    expect(devotionalRegistry().length).toBe(475);
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

// v527 RE-BASE (2026-11-14): this book's audio is HOSTED now, not
// bundled — the chapter devotionals switched to download-on-demand
// (Jonathan: "Switch them all to downloadable"). The very bytes
// that shipped in assets/audio/ were uploaded to the public
// devotional-library release under the same names; the registry
// carries each chapter's hosted name and exact byte size, and
// nothing is bundled anymore. The full registry↔hosting table is
// pinned in devotionals-v527.test.ts.
describe('v525 hosted audio — hosted, complete, wired (was: bundled)', () => {
  it('all 12 chapters carry their hosted size, each voice-grade small, total ≤ 6.5 MB', () => {
    let total = 0;
    for (const [n] of EXPECTED) {
      const size = getDevotional('Ecclesiastes', n)!.sizeBytes!;
      expect(size, `chapter ${n}`).toBeGreaterThan(100_000);
      expect(size, `chapter ${n}`).toBeLessThanOrEqual(700_000);
      total += size;
    }
    expect(total).toBeLessThanOrEqual(6_500_000);
  });

  it('the registry names exactly the 12 hosted files, and nothing is bundled', () => {
    for (const [n] of EXPECTED) {
      const d = getDevotional('Ecclesiastes', n)!;
      expect(d.audioFile).toBe(`devotional-ecclesiastes-${n}.m4a`);
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

