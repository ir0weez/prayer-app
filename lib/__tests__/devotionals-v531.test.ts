// v531 — Ephesians and Philippians join the devotional
// library. All 6 + 4 NotebookLM narrations of Jonathan's own
// commentary for these books, registered the v527 way:
// DOWNLOADABLE from the start. Nothing is bundled — each
// chapter's audio was squeezed from the NotebookLM master to the
// library's speech spec (mono 44.1 kHz AAC, 40 kbps — the encode
// that reproduces the existing hosted files byte for byte) and
// uploaded to the public devotional-library release; the registry
// carries only metadata: the hosted name, its exact byte size,
// his title, his duration. The full registry↔hosting table (all
// 419) is pinned in devotionals-v527.test.ts; this file pins the
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
// (Philippians 1 file 82.96s vs PROGRESS 82 — the same convention
// v495/v523–v526/v528/v529/v530 followed).

const EXPECTED_EPHESIANS: [number, string, number][] = [
  [1, 'God Planned Your Adoption Before Creation', 99],
  [2, 'How Grace Destroys Church Division', 94],
  [3, 'Dwelling in God\'s Immeasurable Love', 107],
  [4, 'Freedom as a Prisoner of Christ', 99],
  [5, 'Ephesians 5 on Love Light and Marriage', 82],
  [6, 'Ready for Battle But Lacking Love', 92],
];

const EXPECTED_PHILIPPIANS: [number, string, number][] = [
  [1, 'Refill Your Pitcher Before You Burn Out', 82],
  [2, 'How True Selflessness Unifies the Church', 89],
  [3, 'Drop Your Religious Resume for Christ', 87],
  [4, 'Overcoming Worry and Disunity in Philippians 4', 96],
];

const BOOKS: [string, string, [number, string, number][]][] = [
  ['Ephesians', 'ephesians', EXPECTED_EPHESIANS],
  ['Philippians', 'philippians', EXPECTED_PHILIPPIANS],
];

describe('v531 registry — Ephesians and Philippians, PROGRESS titles', () => {
  for (const [book, , expected] of BOOKS) {
    it(`holds exactly ${expected.length} ${book} entries, every chapter exactly once`, () => {
      const reg = devotionalRegistry().filter((d) => d.book === book);
      expect(reg.length).toBe(expected.length);
      expect(reg.map((d) => d.chapter).sort((a, b) => a - b)).toEqual(expected.map(([n]) => n));
      expect(devotionalsForBook(book).length).toBe(expected.length);
    });
  }

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
    expect(getDevotional('Ephesians', 1)).not.toBeNull();
    expect(getDevotional('Ephesians', 6)).not.toBeNull();
    expect(getDevotional('Ephesians', 7)).toBeNull();
    expect(getDevotional('Ephesians', 0)).toBeNull();
    expect(getDevotional('Philippians', 1)).not.toBeNull();
    expect(getDevotional('Philippians', 4)).not.toBeNull();
    expect(getDevotional('Philippians', 5)).toBeNull();
    // Galatians remains unregistered, and the next unregistered
    // book after the newest registrations — Colossians — is the
    // not-yet seat now. Hebrews registered at v532 (2026-11-15)
    // and the seat moves on to James. James registered at v534
    // (2026-11-15) with 1 Peter, 2 Peter, 1 John, 2 John, 3 John
    // and Jude, and the seat moves on to Revelation. Revelation
    // registered at v540 (2026-11-15) — the final registration;
    // no canonical book stands after it, so the seat is gone.
    expect(getDevotional('Galatians', 1)).toBeNull();
    expect(getDevotional('Colossians', 1)).toBeNull();
    expect(getDevotional('James', 1)).not.toBeNull();
    expect(getDevotional('Revelation', 1)).not.toBeNull();
  });
});

describe('v531 hosted audio — hosted in the devotional-library, complete, wired', () => {
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
    expect(devotionalBookTotalBytes('Ephesians')).toBe(3_039_061);
    expect(devotionalBookTotalBytes('Philippians')).toBe(1_894_012);
    expect(
      devotionalBookTotalBytes('Ephesians') +
        devotionalBookTotalBytes('Philippians'),
    ).toBe(4_933_073);
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
