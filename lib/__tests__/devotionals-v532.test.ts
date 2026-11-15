// v532 — Hebrews joins the devotional library. All 13
// NotebookLM narrations of Jonathan's own commentary for this
// book, registered the v527 way: DOWNLOADABLE from the start.
// Nothing is bundled — each chapter's audio was squeezed from
// the NotebookLM master to the library's speech spec (mono
// 44.1 kHz AAC, 40 kbps — the encode that reproduces the
// existing hosted files byte for byte) and uploaded to the
// public devotional-library release; the registry carries only
// metadata: the hosted name, its exact byte size, his title,
// his duration. The full registry↔hosting table (all 453) is
// pinned in devotionals-v527.test.ts; this file pins the new
// book.
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
// (Hebrews 2 file 91.86s vs PROGRESS 91 — the same convention
// v495/v523–v526/v528/v529/v530/v531 followed).

const EXPECTED_HEBREWS: [number, string, number][] = [
  [1, 'Why Jesus Is Superior to Angels', 82],
  [2, 'Why Angels Cannot Save Us', 91],
  [3, 'Why Jesus Is Greater Than Moses', 96],
  [4, 'Endless Grace for Weary Souls', 88],
  [5, 'How Jesus Learned Obedience Through Suffering', 96],
  [6, 'Anchoring Your Soul in God\'s Promises', 97],
  [7, 'Why Jesus Replaced Earthly Priests', 89],
  [8, 'Why Jesus Replaced the Old Covenant', 94],
  [9, 'Why Jesus Only Needed One Sacrifice', 94],
  [10, 'Holding Fast to Christ\'s Finished Sacrifice', 95],
  [11, 'The Radical Faith of Hebrews 11', 93],
  [12, 'God\'s Loving Discipline and Unshakeable Truth', 93],
  [13, 'Brotherly Love and Unchanging Grace', 91],
];

const BOOKS: [string, string, [number, string, number][]][] = [
  ['Hebrews', 'hebrews', EXPECTED_HEBREWS],
];

describe('v532 registry — Hebrews, PROGRESS titles', () => {
  for (const [book, , expected] of BOOKS) {
    it(`holds exactly ${expected.length} ${book} entries, every chapter exactly once`, () => {
      const reg = devotionalRegistry().filter((d) => d.book === book);
      expect(reg.length).toBe(expected.length);
      expect(reg.map((d) => d.chapter).sort((a, b) => a - b)).toEqual(expected.map(([n]) => n));
      expect(devotionalsForBook(book).length).toBe(expected.length);
    });
  }

  // v534 RE-BASE (2026-11-15): the whole registry moved 432 → 453
  // across 28 books when James (5), 1 Peter (5), 2 Peter (3),
  // 1 John (5), 2 John (1), 3 John (1) and Jude (1) registered,
  // downloadable from the start (v527 model); the book's per-book pins
  // below stand.
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

  it('titles are distinct within the book — and none collides with any other book', () => {
    for (const [book, , expected] of BOOKS) {
      const titles = expected.map(([, t]) => t);
      expect(new Set(titles).size, book).toBe(titles.length);
      const others = devotionalRegistry().filter((d) => d.book !== book).map((d) => d.title);
      for (const t of titles) expect(others, `${book}: ${t}`).not.toContain(t);
    }
  });

  it('the door rule: every chapter of the book has one, nothing beyond', () => {
    expect(getDevotional('Hebrews', 1)).not.toBeNull();
    expect(getDevotional('Hebrews', 13)).not.toBeNull();
    expect(getDevotional('Hebrews', 14)).toBeNull();
    expect(getDevotional('Hebrews', 0)).toBeNull();
    // Galatians and Colossians remain unregistered. James
    // registered at v534 (2026-11-15) with the six books after
    // it, and the next unregistered book after the newest
    // registration — Revelation — is the not-yet seat now.
    expect(getDevotional('Galatians', 1)).toBeNull();
    expect(getDevotional('Colossians', 1)).toBeNull();
    expect(getDevotional('James', 1)).not.toBeNull();
    expect(getDevotional('Revelation', 1)).toBeNull();
  });
});

describe('v532 hosted audio — hosted in the devotional-library, complete, wired', () => {
  it('every chapter carries its hosted size, each voice-grade small', () => {
    for (const [book, , expected] of BOOKS) {
      for (const [n] of expected) {
        const size = getDevotional(book, n)!.sizeBytes!;
        expect(size, `${book} ${n}`).toBeGreaterThan(100_000);
        expect(size, `${book} ${n}`).toBeLessThanOrEqual(700_000);
      }
    }
  });

  it('the book total is the hosted bytes, exactly', () => {
    expect(devotionalBookTotalBytes('Hebrews')).toBe(6_399_260);
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

  it('nothing of the book is bundled', () => {
    for (const [book, , expected] of BOOKS) {
      for (const [n] of expected) {
        const d = getDevotional(book, n)!;
        expect(() => statSync(join(__dirname, '..', '..', 'assets', 'audio', d.audioFile))).toThrow();
      }
    }
    expect(() => read('lib/devotional-audio.ts')).toThrow();
  });
});
