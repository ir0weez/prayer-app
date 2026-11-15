// v528 — Isaiah, Obadiah and Jonah join the devotional library.
// All 66 + 1 + 4 NotebookLM narrations of Jonathan's own commentary
// for these books, registered the v527 way: DOWNLOADABLE from the
// start. Nothing is bundled — each chapter's audio was squeezed
// from the NotebookLM master to the library's speech spec (mono
// 44.1 kHz AAC, 40 kbps — the encode that reproduces the existing
// hosted files byte for byte) and uploaded to the public
// devotional-library release; the registry carries only metadata:
// the hosted name, its exact byte size, his title, his duration.
// The full registry↔hosting table (all 409) is pinned in
// devotionals-v527.test.ts; this file pins the three new books.
//
// The audio is a narration of his words, not a recording of him
// speaking — the player copy rule from v293 stands untouched. No
// transcript exists for the narrations — paragraphs stay empty,
// no invented words (the standing rule: transcripts are Ten Stops
// tours only).

import { statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  devotionalBookTotalBytes,
  devotionalBooks,
  devotionalDownloadUrl,
  devotionalRegistry,
  devotionalsForBook,
  getDevotional,
} from '../devotionals';
import { readFileSync } from 'fs';

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');

// The PROGRESS.md record (~/workspace/devotionals/PROGRESS.md) — the
// titles and durations the registry must carry, chapter by chapter.
// Registry durations follow the PROGRESS record (the displayed
// durations) even where a master file runs a fraction past
// (Isaiah 1 file 104.05s vs PROGRESS 104, Isaiah 37 file 90.05s
// vs 89, Isaiah 54 file 87.01s vs 86, Jonah 4 file 87.01s vs 86 —
// the same convention v495/v523–v526 followed).

const EXPECTED_ISAIAH: [number, string, number][] = [
  [1, 'Why Empty Religion Exhausts God', 104],
  [2, 'Why Human Pride Cannot Save You', 82],
  [3, 'Why Rebellious Societies Crumble', 93],
  [4, 'Isaiah\'s Preview of the Great Tribulation', 91],
  [5, 'God\'s Judgment on the Disappointing Vineyard', 103],
  [6, 'Isaiah\'s Vision and His Devastating Mission', 99],
  [7, 'King Ahaz Rejects the Immanuel Sign', 104],
  [8, 'Trust God Over Worldly Alliances', 98],
  [9, 'Reaching for God\'s Outstretched Hand', 105],
  [10, 'God\'s About Face in Isaiah 10', 101],
  [11, 'Jesus Our Highway Out of Captivity', 89],
  [12, 'The Endless Well of Isaiah 12', 75],
  [13, 'God\'s Judgment on Babylon', 102],
  [14, 'Satan\'s Defeat in Isaiah 14', 80],
  [15, 'Why Fake Faith Destroyed Moab', 92],
  [16, 'Why God Wept Over Moab', 94],
  [17, 'The Cost of Ephraim\'s Syrian Alliance', 84],
  [18, 'How God Breaks Pride Through Captivity', 82],
  [19, 'The Real Purpose Behind Egypt\'s Judgment', 81],
  [20, 'Why Isaiah Walked Naked for Three Years', 91],
  [21, 'God\'s Grief Over Babylon\'s Fall', 95],
  [22, 'Why Jerusalem Chose Walls Over God', 102],
  [23, 'Tyre\'s Fall and Modern Church Greed', 88],
  [24, 'When God Turns Everything Upside Down', 100],
  [25, 'Trading Empty Religion for God\'s Banquet', 84],
  [26, 'True Peace Beyond Corrupt Leaders', 94],
  [27, 'Slaying Leviathan and Gathering His Children', 99],
  [28, 'How God Harvests Stubborn Fruit', 80],
  [29, 'Isaiah 29 Storm Warning and Redemption', 105],
  [30, 'Stop Running and Rest in God', 84],
  [31, 'Why God Is Your True Defender', 93],
  [32, 'True Freedom Under the Righteous King', 100],
  [33, 'Stop Treating God Like a Q-Tip', 88],
  [34, 'Why World Leaders Will Abandon You', 107],
  [35, 'The Highway of Holiness in Isaiah 35', 89],
  [36, 'When Assyria Threatens Jerusalem', 113],
  [37, 'Laying Your Fears Directly Before God', 89],
  [38, 'Hezekiah\'s Extra Years and Weak Faith', 90],
  [39, 'Hezekiah\'s Pride Doomed His Children', 84],
  [40, 'How Isaiah 40 Renews Our Strength', 90],
  [41, 'God Holds Your Right Hand', 87],
  [42, 'Why Jesus Is God\'s Only Elect', 86],
  [43, 'God Wants Presence Not Religious Checklists', 94],
  [44, 'Stop Worshipping Leftover Sawdust', 96],
  [45, 'How God Used Cyrus and Darkness', 81],
  [46, 'Stop Carrying Gods That Cannot Carry You', 96],
  [47, 'How Pride Destroyed Babylon', 97],
  [48, 'Peace in the Furnace of Affliction', 106],
  [49, 'Your Name Engraved on Pierced Hands', 88],
  [50, 'Stop Lighting Your Own Fire', 92],
  [51, 'Standing Against Moral Decay in Isaiah 51', 108],
  [52, 'Putting On Christ Every Day', 86],
  [53, 'Why Jesus Silently Endured the Cross', 90],
  [54, 'Why Your Trust Is Gods Currency', 86],
  [55, 'God\'s Free Invitation in Isaiah 55', 84],
  [56, 'Isaiah 56 Promises Royalty to Outcasts', 102],
  [57, 'Why Worldly Living Leaves You Empty', 98],
  [58, 'Why Starving Yourself Isn\'t Real Fasting', 91],
  [59, 'Why God Rejects Your Religious Checklist', 100],
  [60, 'God\'s Light Restores What Sin Scatters', 87],
  [61, 'How Isaiah 61 Challenges Modern Preaching', 94],
  [62, 'Stop Neglecting Your Spiritual Muscles', 103],
  [63, 'How God\'s Wrath Serves Your Redemption', 113],
  [64, 'Filthy Rags and the Potter\'s Wrath', 94],
  [65, 'The New Earth of Isaiah 65', 97],
  [66, 'God Defeats Satan With a Whisper', 102],
];

const EXPECTED_OBADIAH: [number, string, number][] = [
  [1, 'Edom\'s Pride and Judgment in Obadiah', 99],
];

const EXPECTED_JONAH: [number, string, number][] = [
  [1, 'Why Jonah Fled to Tarshish', 100],
  [2, 'Did Jonah Die Inside the Fish', 100],
  [3, 'How Eight Words Saved Nineveh', 91],
  [4, 'Jonah Loved a Plant More Than Nineveh', 86],
];

const BOOKS: [string, string, [number, string, number][]][] = [
  ['Isaiah', 'isaiah', EXPECTED_ISAIAH],
  ['Obadiah', 'obadiah', EXPECTED_OBADIAH],
  ['Jonah', 'jonah', EXPECTED_JONAH],
];

describe('v528 registry — Isaiah, Obadiah and Jonah, PROGRESS titles', () => {
  for (const [book, , expected] of BOOKS) {
    it(`holds exactly ${expected.length} ${book} entries, every chapter exactly once`, () => {
      const reg = devotionalRegistry().filter((d) => d.book === book);
      expect(reg.length).toBe(expected.length);
      expect(reg.map((d) => d.chapter).sort((a, b) => a - b)).toEqual(expected.map(([n]) => n));
      expect(devotionalsForBook(book).length).toBe(expected.length);
    });
  }

  // v529 RE-BASE (2026-11-14): the whole registry moved 336 → 380
  // across 16 books when Mark (16) and Acts (28) registered,
  // downloadable from the start (v527 model); the three books'
  // per-book pins below stand.
  // v530 RE-BASE (2026-11-15): the whole registry moved 380 → 409
  // across 18 books when 1 Corinthians (16) and 2 Corinthians (13)
  // registered, downloadable from the start (v527 model); the
  // three books' per-book pins below stand.
  // v531 RE-BASE (2026-11-15): the whole registry moved 409 → 419
  // across 20 books when Ephesians (6) and Philippians (4)
  // registered, downloadable from the start (v527 model); the
  // three books' per-book pins below stand.
  it('the whole registry is now 419 across 20 books', () => {
    expect(devotionalRegistry().length).toBe(419);
    expect(devotionalBooks()).toEqual([
      'Genesis', 'Deuteronomy', 'Joshua', 'Ruth', '1 Samuel', '2 Samuel',
      '1 Kings', '2 Kings', 'Proverbs', 'Ecclesiastes', 'Song of Solomon',
      'Isaiah', 'Obadiah', 'Jonah', 'Mark', 'Acts', '1 Corinthians',
      '2 Corinthians', 'Ephesians', 'Philippians',
    ]);
    const counts: Record<string, number> = {
      Genesis: 50, Deuteronomy: 34, Joshua: 24, Ruth: 4, '1 Samuel': 31,
      '2 Samuel': 24, '1 Kings': 22, '2 Kings': 25, Proverbs: 31,
      Ecclesiastes: 12, 'Song of Solomon': 8, Isaiah: 66, Obadiah: 1, Jonah: 4,
      Mark: 16, Acts: 28, '1 Corinthians': 16, '2 Corinthians': 13,
      Ephesians: 6, Philippians: 4,
    };
    for (const [book, count] of Object.entries(counts)) {
      expect(devotionalRegistry().filter((d) => d.book === book).length, book).toBe(count);
    }
  });

  it('every entry carries its PROGRESS title, duration, and hosted name', () => {
    for (const [book, slug, expected] of BOOKS) {
      for (const [n, title, dur] of expected) {
        const d = getDevotional(book, n);
        expect(d, `${book} ${n}`).not.toBeNull();
        expect(d!.title).toBe(title);
        expect(d!.durationSec).toBe(dur);
        expect(d!.audioFile).toBe(`devotional-${slug}-${n}.m4a`);
        // No transcript exists for the narrations — no invented words.
        expect(d!.paragraphs).toEqual([]);
      }
    }
  });

  it('titles are distinct within each book — and none collides with any other book', () => {
    for (const [book, , expected] of BOOKS) {
      const titles = expected.map(([, t]) => t);
      expect(new Set(titles).size, book).toBe(titles.length);
      const others = devotionalRegistry().filter((d) => d.book !== book).map((d) => d.title);
      for (const t of titles) expect(others, `${book}: ${t}`).not.toContain(t);
    }
  });

  it('the door rule: every chapter of the three books has one, nothing beyond', () => {
    expect(getDevotional('Isaiah', 1)).not.toBeNull();
    expect(getDevotional('Isaiah', 66)).not.toBeNull();
    expect(getDevotional('Isaiah', 67)).toBeNull();
    expect(getDevotional('Isaiah', 0)).toBeNull();
    expect(getDevotional('Obadiah', 1)).not.toBeNull();
    expect(getDevotional('Obadiah', 2)).toBeNull();
    expect(getDevotional('Jonah', 1)).not.toBeNull();
    expect(getDevotional('Jonah', 4)).not.toBeNull();
    expect(getDevotional('Jonah', 5)).toBeNull();
    // The next unregistered book stays doorless.
    expect(getDevotional('Jeremiah', 1)).toBeNull();
  });
});

describe('v528 hosted audio — hosted in the devotional-library, complete, wired', () => {
  it('every chapter carries its hosted size, each voice-grade small', () => {
    for (const [book, , expected] of BOOKS) {
      for (const [n] of expected) {
        const size = getDevotional(book, n)!.sizeBytes!;
        expect(size, `${book} ${n}`).toBeGreaterThan(100_000);
        expect(size, `${book} ${n}`).toBeLessThanOrEqual(700_000);
      }
    }
  });

  it('the book totals are the hosted bytes, exactly', () => {
    expect(devotionalBookTotalBytes('Isaiah')).toBe(33_076_269);
    expect(devotionalBookTotalBytes('Obadiah')).toBe(526_374);
    expect(devotionalBookTotalBytes('Jonah')).toBe(2_007_789);
    expect(
      devotionalBookTotalBytes('Isaiah') +
        devotionalBookTotalBytes('Obadiah') +
        devotionalBookTotalBytes('Jonah'),
    ).toBe(35_610_432);
  });

  it('the download URLs point at the devotional-library release assets', () => {
    for (const [book, slug, expected] of BOOKS) {
      for (const [n] of expected) {
        const url = new URL(devotionalDownloadUrl(getDevotional(book, n)!));
        expect(url.protocol).toBe('https:');
        expect(url.host).toBe('github.com');
        expect(url.pathname).toBe(
          `/ir0weez/prayer-app/releases/download/devotional-library/devotional-${slug}-${n}.m4a`,
        );
      }
    }
  });

  it('nothing of the three books is bundled', () => {
    for (const [book, , expected] of BOOKS) {
      for (const [n] of expected) {
        const d = getDevotional(book, n)!;
        expect(() => statSync(join(__dirname, '..', '..', 'assets', 'audio', d.audioFile))).toThrow();
      }
    }
    expect(() => read('lib/devotional-audio.ts')).toThrow();
  });
});
