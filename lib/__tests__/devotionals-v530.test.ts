// v530 — 1 Corinthians and 2 Corinthians join the devotional
// library. All 16 + 13 NotebookLM narrations of Jonathan's own
// commentary for these books, registered the v527 way:
// DOWNLOADABLE from the start. Nothing is bundled — each
// chapter's audio was squeezed from the NotebookLM master to the
// library's speech spec (mono 44.1 kHz AAC, 40 kbps — the encode
// that reproduces the existing hosted files byte for byte) and
// uploaded to the public devotional-library release; the registry
// carries only metadata: the hosted name, its exact byte size,
// his title, his duration. The full registry↔hosting table (all
// 409) is pinned in devotionals-v527.test.ts; this file pins the
// two new books.
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
// (1 Corinthians 9 file 92.04s vs PROGRESS 91, 2 Corinthians 6
// file 92.86s vs 92 — the same convention v495/v523–v526/v528/v529
// followed).

const EXPECTED_1CORINTHIANS: [number, string, number][] = [
  [1, 'Staying Full on Christ in Toxic Culture', 99],
  [2, 'Human Wisdom Cannot Reveal God\'s Truth', 80],
  [3, 'Building an Indestructible Faith on Christ', 94],
  [4, 'Faithful Stewardship Over Worldly Success', 92],
  [5, 'Clean House Before Judging the World', 101],
  [6, 'Why Believers Shouldn\'t Sue Each Other', 105],
  [7, 'Marriage and Singleness as Holy Gifts', 87],
  [8, 'Choosing Love Over Personal Liberty', 101],
  [9, 'Surrendering Your Rights for the Gospel', 91],
  [10, 'Don\'t Worship Provisions Over the Provider', 80],
  [11, '1 Corinthians 11 Head Coverings and Communion', 107],
  [12, 'How Spiritual Gifts Build the Church', 94],
  [13, 'Knowledge Without Love Is Just Noise', 106],
  [14, 'Clear Teaching Over Confusing Tongues', 106],
  [15, 'Why Faith Depends on the Resurrection', 102],
  [16, 'Serving the Saints with Courage and Grace', 87],
];

const EXPECTED_2CORINTHIANS: [number, string, number][] = [
  [1, 'God\'s Comfort and Keeping Your Promises', 89],
  [2, 'Radical Forgiveness in 2 Corinthians', 91],
  [3, 'Trading Religious Rules for the Spirit', 106],
  [4, 'Carrying Gospel Treasure in Clay Jars', 91],
  [5, 'Living as Heaven\'s Ambassador', 96],
  [6, '2 Corinthians 6 Blueprint for Ministry', 92],
  [7, 'Godly Sorrow and Restoring the Repentant', 95],
  [8, 'Never Let Ministry Rob Your Family', 89],
  [9, 'Why God Loves a Cheerful Giver', 89],
  [10, 'Fighting Spiritual Battles with Eternal Weapons', 115],
  [11, 'Why Paul Boasted in His Suffering', 109],
  [12, 'Why Hardship Proves True Leadership', 112],
  [13, 'Why True Ministry Requires Weakness', 90],
];

const BOOKS: [string, string, [number, string, number][]][] = [
  ['1 Corinthians', '1corinthians', EXPECTED_1CORINTHIANS],
  ['2 Corinthians', '2corinthians', EXPECTED_2CORINTHIANS],
];

describe('v530 registry — 1 Corinthians and 2 Corinthians, PROGRESS titles', () => {
  for (const [book, , expected] of BOOKS) {
    it(`holds exactly ${expected.length} ${book} entries, every chapter exactly once`, () => {
      const reg = devotionalRegistry().filter((d) => d.book === book);
      expect(reg.length).toBe(expected.length);
      expect(reg.map((d) => d.chapter).sort((a, b) => a - b)).toEqual(expected.map(([n]) => n));
      expect(devotionalsForBook(book).length).toBe(expected.length);
    });
  }

  // v531 RE-BASE (2026-11-15): the whole registry moved 409 → 419
  // across 20 books when Ephesians (6) and Philippians (4)
  // registered, downloadable from the start (v527 model); the two
  // books' per-book pins below stand.
  // v532 RE-BASE (2026-11-15): the whole registry moved 419 → 432
  // across 21 books when Hebrews (13) registered, downloadable
  // from the start (v527 model); the two books' per-book pins
  // below stand.
  // v534 RE-BASE (2026-11-15): the whole registry moved 432 → 453
  // across 28 books when James (5), 1 Peter (5), 2 Peter (3),
  // 1 John (5), 2 John (1), 3 John (1) and Jude (1) registered,
  // downloadable from the start (v527 model); the two books' per-book pins
  // below stand.
  // v540 RE-BASE (2026-11-15): the whole registry moved 453 → 475
  // across 29 books when Revelation (22) registered, downloadable
  // from the start (v527 model); the two books' per-book pins
  // below stand.
  it('the whole registry is now 475 across 29 books', () => {
    expect(devotionalRegistry().length).toBe(475);
    expect(devotionalBooks()).toEqual([
      'Genesis', 'Deuteronomy', 'Joshua', 'Ruth', '1 Samuel', '2 Samuel',
      '1 Kings', '2 Kings', 'Proverbs', 'Ecclesiastes', 'Song of Solomon',
      'Isaiah', 'Obadiah', 'Jonah', 'Mark', 'Acts', '1 Corinthians',
      '2 Corinthians', 'Ephesians', 'Philippians', 'Hebrews', 'James',
      '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude',
      'Revelation',
    ]);
    const counts: Record<string, number> = {
      Genesis: 50, Deuteronomy: 34, Joshua: 24, Ruth: 4, '1 Samuel': 31,
      '2 Samuel': 24, '1 Kings': 22, '2 Kings': 25, Proverbs: 31,
      Ecclesiastes: 12, 'Song of Solomon': 8, Isaiah: 66, Obadiah: 1, Jonah: 4,
      Mark: 16, Acts: 28, '1 Corinthians': 16, '2 Corinthians': 13,
      Ephesians: 6, Philippians: 4, Hebrews: 13, James: 5, '1 Peter': 5,
      '2 Peter': 3, '1 John': 5, '2 John': 1, '3 John': 1, Jude: 1,
      Revelation: 22,
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

  it('the door rule: every chapter of the two books has one, nothing beyond', () => {
    expect(getDevotional('1 Corinthians', 1)).not.toBeNull();
    expect(getDevotional('1 Corinthians', 16)).not.toBeNull();
    expect(getDevotional('1 Corinthians', 17)).toBeNull();
    expect(getDevotional('1 Corinthians', 0)).toBeNull();
    expect(getDevotional('2 Corinthians', 1)).not.toBeNull();
    expect(getDevotional('2 Corinthians', 13)).not.toBeNull();
    expect(getDevotional('2 Corinthians', 14)).toBeNull();
    // The next unregistered books stay doorless — Galatians, and
    // Colossians, the not-yet seat after Ephesians and Philippians
    // registered (v531 RE-BASE, 2026-11-15). Hebrews registered
    // at v532 (2026-11-15) and the seat moves on to James. James
    // registered at v534 (2026-11-15) with 1 Peter, 2 Peter,
    // 1 John, 2 John, 3 John and Jude, and the seat moves on to
    // Revelation. Revelation registered at v540 (2026-11-15) —
    // the final registration; no canonical book stands after
    // it, so the seat is gone.
    expect(getDevotional('Galatians', 1)).toBeNull();
    expect(getDevotional('Colossians', 1)).toBeNull();
    expect(getDevotional('James', 1)).not.toBeNull();
    expect(getDevotional('Revelation', 1)).not.toBeNull();
  });
});

describe('v530 hosted audio — hosted in the devotional-library, complete, wired', () => {
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
    expect(devotionalBookTotalBytes('1 Corinthians')).toBe(8_170_618);
    expect(devotionalBookTotalBytes('2 Corinthians')).toBe(6_727_749);
    expect(
      devotionalBookTotalBytes('1 Corinthians') +
        devotionalBookTotalBytes('2 Corinthians'),
    ).toBe(14_898_367);
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

  it('nothing of the two books is bundled', () => {
    for (const [book, , expected] of BOOKS) {
      for (const [n] of expected) {
        const d = getDevotional(book, n)!;
        expect(() => statSync(join(__dirname, '..', '..', 'assets', 'audio', d.audioFile))).toThrow();
      }
    }
    expect(() => read('lib/devotional-audio.ts')).toThrow();
  });
});
