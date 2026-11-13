// v523 — "Send the 2 Kings devotionals to the app."
// All 25 NotebookLM narrations of his 2 Kings commentary,
// registered and bundled (speech-compressed) exactly the way Genesis
// (v293), Deuteronomy (v474), Joshua (v475), Ruth (v476), 1 Samuel
// (v492), 2 Samuel (v493) and 1 Kings (v495) went in: registry entries
// in lib/devotionals.ts, requires in lib/devotional-audio.ts, files in
// assets/audio/. The audio is a narration of his words, not a
// recording of him speaking — the player copy rule from v293 stands
// untouched.
//
// No title traps in this book: all 25 titles are distinct. Ch 6's
// title is kept verbatim from NotebookLM (lowercase "floating axe and
// fiery chariots"); ch 16's title is kept verbatim ("Gods", no
// apostrophe).

import { statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { devotionalRegistry, getDevotional } from '../devotionals';
import { readFileSync } from 'fs';

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');

// The PROGRESS.md record (~/workspace/devotionals/PROGRESS.md) — the
// titles and durations the registry must carry, chapter by chapter.
const EXPECTED: [number, string, number][] = [
  [1, "Fire From Heaven Consumes Ahaziah's Men", 94],
  [2, "Elisha Takes Up Elijah's Mantle", 105],
  [3, 'Digging Ditches for Water Without Rain', 86],
  [4, 'Elisha Multiplies Oil and Raises the Dead', 94],
  [5, "Naaman's Healing and Gehazi's Leprosy", 96],
  [6, "Elisha's floating axe and fiery chariots", 110],
  [7, 'Four Lepers and a Trampled Officer', 85],
  [8, "Hazael's Betrayal and God's Unbroken Covenant", 89],
  [9, 'The Bloody Rise of King Jehu', 125],
  [10, 'Jehu Destroys Baal But Worships Golden Calves', 110],
  [11, 'How Baby Joash Survived Queen Athaliah', 92],
  [12, 'How Borrowed Faith Ruined King Joash', 87],
  [13, 'Why King Jehoash Stopped at Three Arrows', 98],
  [14, 'How God Balances Victories and Defeats', 85],
  [15, "Israel's Anarchy and Judah's Compromise", 106],
  [16, 'King Ahaz Replaces Gods Altar', 92],
  [17, 'Why Israel Fell to Assyria', 111],
  [18, 'Hezekiah Crushes Idols and Defies Assyria', 104],
  [19, 'God Defeats 185,000 Assyrians Overnight', 88],
  [20, 'Hezekiah Squandered His Extra Fifteen Years', 96],
  [21, 'How Manasseh and Amon Destroyed Judah', 93],
  [22, "King Josiah Finds God's Lost Law", 94],
  [23, "Why King Josiah's Revival Didn't Last", 110],
  [24, 'How Pride Handed Jerusalem to Babylon', 104],
  [25, 'The Fall of Judah to Babylon', 106],
];

describe('v523 registry — all of 2 Kings, PROGRESS titles', () => {
  it('holds exactly 25 2 Kings entries, every chapter 1–25 exactly once', () => {
    const reg = devotionalRegistry().filter((d) => d.book === '2 Kings');
    expect(reg.length).toBe(25);
    expect(reg.map((d) => d.chapter).sort((a, b) => a - b)).toEqual(EXPECTED.map(([n]) => n));
  });

  it('the whole registry is now 214 — Genesis 50 + Deuteronomy 34 + Joshua 24 + Ruth 4 + 1 Samuel 31 + 2 Samuel 24 + 1 Kings 22 + 2 Kings 25', () => {
    expect(devotionalRegistry().length).toBe(214);
    expect(devotionalRegistry().filter((d) => d.book === 'Genesis').length).toBe(50);
    expect(devotionalRegistry().filter((d) => d.book === 'Deuteronomy').length).toBe(34);
    expect(devotionalRegistry().filter((d) => d.book === 'Joshua').length).toBe(24);
    expect(devotionalRegistry().filter((d) => d.book === 'Ruth').length).toBe(4);
    expect(devotionalRegistry().filter((d) => d.book === '1 Samuel').length).toBe(31);
    expect(devotionalRegistry().filter((d) => d.book === '2 Samuel').length).toBe(24);
    expect(devotionalRegistry().filter((d) => d.book === '1 Kings').length).toBe(22);
  });

  it('every entry carries its PROGRESS title, duration, and asset name', () => {
    for (const [n, title, dur] of EXPECTED) {
      const d = getDevotional('2 Kings', n);
      expect(d, `2 Kings ${n}`).not.toBeNull();
      expect(d!.title).toBe(title);
      expect(d!.durationSec).toBe(dur);
      expect(d!.audioFile).toBe(`devotional-2kings-${n}.m4a`);
      // No transcript exists for the narrations — no invented words.
      expect(d!.paragraphs).toEqual([]);
    }
  });

  it('all 25 titles are distinct — no shared-title book in this one', () => {
    const titles = EXPECTED.map(([, t]) => t);
    expect(new Set(titles).size).toBe(25);
    const reg = devotionalRegistry().filter((d) => d.book === '2 Kings');
    expect(new Set(reg.map((d) => d.title)).size).toBe(25);
  });

  it('the door rule: every 2 Kings chapter has one, nothing beyond', () => {
    expect(getDevotional('2 Kings', 1)).not.toBeNull();
    expect(getDevotional('2 Kings', 25)).not.toBeNull();
    expect(getDevotional('2 Kings', 26)).toBeNull();
    expect(getDevotional('2 Kings', 0)).toBeNull();
  });
});

describe('v523 bundled audio — compressed, complete, wired', () => {
  it('all 25 assets exist, each voice-grade small, total ≤ 16 MB', () => {
    let total = 0;
    for (const [n] of EXPECTED) {
      const p = join(__dirname, '..', '..', 'assets', 'audio', `devotional-2kings-${n}.m4a`);
      const size = statSync(p).size;
      expect(size, `chapter ${n}`).toBeGreaterThan(100_000);
      expect(size, `chapter ${n}`).toBeLessThanOrEqual(700_000);
      total += size;
    }
    expect(total).toBeLessThanOrEqual(16_000_000);
  });

  it('the audio module requires exactly the 25 registered files', () => {
    const audio = read('lib/devotional-audio.ts');
    const requires = audio.match(/require\('@\/assets\/audio\/devotional-2kings-\d+\.m4a'\)/g) ?? [];
    expect(requires.length).toBe(25);
    for (const [n] of EXPECTED) {
      expect(audio).toContain(`[devotionalKey('2 Kings', ${n})]: require('@/assets/audio/devotional-2kings-${n}.m4a')`);
    }
  });

  it('every registry entry in the whole book set has a matching require', () => {
    const audio = read('lib/devotional-audio.ts');
    for (const d of devotionalRegistry()) {
      expect(audio, `${d.book} ${d.chapter}`).toContain(`require('@/assets/audio/${d.audioFile}')`);
    }
  });
});
