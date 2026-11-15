// v534 — the seven small books join the devotional library:
// James, 1 Peter, 2 Peter, 1 John, 2 John, 3 John and Jude.
// All 21 NotebookLM narrations of Jonathan's own commentary
// for these books, registered the v527 way: DOWNLOADABLE from
// the start. Nothing is bundled — each chapter's audio was
// squeezed from the NotebookLM master to the library's speech
// spec (mono 44.1 kHz AAC, 40 kbps — the encode that
// reproduces the existing hosted files byte for byte) and
// uploaded to the public devotional-library release; the
// registry carries only metadata: the hosted name, its exact
// byte size, his title, his duration. The full registry↔hosting
// table (all 453) is pinned in devotionals-v527.test.ts; this
// file pins the new books.
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
// (1 Peter 2 file 101.38s vs PROGRESS 101 — the same convention
// v495/v523–v526/v528/v529/v530/v531/v532 followed).

const EXPECTED_JAMES: [number, string, number][] = [
  [1, 'How Life\'s Hardships Build True Faith', 86],
  [2, 'Your Actions Prove Your Faith', 78],
  [3, 'Only Christ Can Tame Your Tongue', 104],
  [4, 'Drop the Gavel and Choose Grace', 95],
  [5, 'Patient Endurance and Powerful Prayer', 104],
];

const EXPECTED_1PETER: [number, string, number][] = [
  [1, 'Why Trials Cannot Steal Your Joy', 100],
  [2, '1 Peter 2 and Enduring Unfair Suffering', 101],
  [3, 'Suffering for Doing What Is Right', 93],
  [4, 'Why Suffering Is Guaranteed for Christians', 88],
  [5, 'Finding Peace in 1 Peter 5', 92],
];

const EXPECTED_2PETER: [number, string, number][] = [
  [1, 'Peter\'s Eyewitness Account of the Transfiguration', 94],
  [2, 'How God Delivers Us from False Teachers', 97],
  [3, 'Why God Delays Christ\'s Return', 96],
];

const EXPECTED_1JOHN: [number, string, number][] = [
  [1, 'Freedom From Guilt in 1 John 1', 91],
  [2, 'Trusting Christ When Church Leaders Fail', 97],
  [3, 'Loving Others in Deed and Truth', 91],
  [4, 'Testing the Spirits and Sacrificial Love', 88],
  [5, 'When Religious Routines Become Idols', 101],
];

const EXPECTED_2JOHN: [number, string, number][] = [
  [1, 'Why Texting Cannot Replace Real Presence', 101],
];

const EXPECTED_3JOHN: [number, string, number][] = [
  [1, 'How Arrogant Leaders Ruin the Church', 100],
];

const EXPECTED_JUDE: [number, string, number][] = [
  [1, 'How False Teachers Sneak Into Church', 82],
];

const BOOKS: [string, string, [number, string, number][]][] = [
  ['James', 'james', EXPECTED_JAMES],
  ['1 Peter', '1peter', EXPECTED_1PETER],
  ['2 Peter', '2peter', EXPECTED_2PETER],
  ['1 John', '1john', EXPECTED_1JOHN],
  ['2 John', '2john', EXPECTED_2JOHN],
  ['3 John', '3john', EXPECTED_3JOHN],
  ['Jude', 'jude', EXPECTED_JUDE],
];

describe('v534 registry — the seven small books, PROGRESS titles', () => {
  for (const [book, , expected] of BOOKS) {
    it(`holds exactly ${expected.length} ${book} entries, every chapter exactly once`, () => {
      const reg = devotionalRegistry().filter((d) => d.book === book);
      expect(reg.length).toBe(expected.length);
      expect(reg.map((d) => d.chapter).sort((a, b) => a - b)).toEqual(expected.map(([n]) => n));
      expect(devotionalsForBook(book).length).toBe(expected.length);
    });
  }

  it('the whole registry is now 453 across 28 books', () => {
    expect(devotionalRegistry().length).toBe(453);
    expect(devotionalBooks()).toEqual([
      'Genesis', 'Deuteronomy', 'Joshua', 'Ruth', '1 Samuel', '2 Samuel',
      '1 Kings', '2 Kings', 'Proverbs', 'Ecclesiastes', 'Song of Solomon',
      'Isaiah', 'Obadiah', 'Jonah', 'Mark', 'Acts', '1 Corinthians',
      '2 Corinthians', 'Ephesians', 'Philippians', 'Hebrews', 'James',
      '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude',
    ]);
    const counts: Record<string, number> = {
      Genesis: 50, Deuteronomy: 34, Joshua: 24, Ruth: 4, '1 Samuel': 31,
      '2 Samuel': 24, '1 Kings': 22, '2 Kings': 25, Proverbs: 31,
      Ecclesiastes: 12, 'Song of Solomon': 8, Isaiah: 66, Obadiah: 1, Jonah: 4,
      Mark: 16, Acts: 28, '1 Corinthians': 16, '2 Corinthians': 13,
      Ephesians: 6, Philippians: 4, Hebrews: 13, James: 5, '1 Peter': 5,
      '2 Peter': 3, '1 John': 5, '2 John': 1, '3 John': 1, Jude: 1,
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

  it('the door rule: every chapter of the seven books has one, nothing beyond', () => {
    expect(getDevotional('James', 1)).not.toBeNull();
    expect(getDevotional('James', 5)).not.toBeNull();
    expect(getDevotional('James', 6)).toBeNull();
    expect(getDevotional('James', 0)).toBeNull();
    expect(getDevotional('1 Peter', 1)).not.toBeNull();
    expect(getDevotional('1 Peter', 5)).not.toBeNull();
    expect(getDevotional('1 Peter', 6)).toBeNull();
    expect(getDevotional('2 Peter', 1)).not.toBeNull();
    expect(getDevotional('2 Peter', 3)).not.toBeNull();
    expect(getDevotional('2 Peter', 4)).toBeNull();
    expect(getDevotional('1 John', 1)).not.toBeNull();
    expect(getDevotional('1 John', 5)).not.toBeNull();
    expect(getDevotional('1 John', 6)).toBeNull();
    expect(getDevotional('2 John', 1)).not.toBeNull();
    expect(getDevotional('2 John', 2)).toBeNull();
    expect(getDevotional('3 John', 1)).not.toBeNull();
    expect(getDevotional('3 John', 2)).toBeNull();
    expect(getDevotional('Jude', 1)).not.toBeNull();
    expect(getDevotional('Jude', 2)).toBeNull();
    // Galatians and Colossians remain unregistered, and the next
    // unregistered book after the newest registration — Revelation —
    // is the not-yet seat now.
    expect(getDevotional('Galatians', 1)).toBeNull();
    expect(getDevotional('Colossians', 1)).toBeNull();
    expect(getDevotional('Revelation', 1)).toBeNull();
  });
});

describe('v534 hosted audio — hosted in the devotional-library, complete, wired', () => {
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
    expect(devotionalBookTotalBytes('James')).toBe(2_490_824);
    expect(devotionalBookTotalBytes('1 Peter')).toBe(2_508_650);
    expect(devotionalBookTotalBytes('2 Peter')).toBe(1_536_570);
    expect(devotionalBookTotalBytes('1 John')).toBe(2_494_517);
    expect(devotionalBookTotalBytes('2 John')).toBe(534_981);
    expect(devotionalBookTotalBytes('3 John')).toBe(537_455);
    expect(devotionalBookTotalBytes('Jude')).toBe(443_242);
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

  it('nothing of the seven books is bundled', () => {
    for (const [book, , expected] of BOOKS) {
      for (const [n] of expected) {
        const d = getDevotional(book, n)!;
        expect(() => statSync(join(__dirname, '..', '..', 'assets', 'audio', d.audioFile))).toThrow();
      }
    }
    expect(() => read('lib/devotional-audio.ts')).toThrow();
  });
});
