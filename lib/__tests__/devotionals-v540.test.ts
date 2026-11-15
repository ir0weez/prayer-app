// v540 — Revelation joins the devotional library, the FINAL
// registration: all 22 NotebookLM narrations of Jonathan's own
// commentary for the last book of the canon, registered the v527
// way: DOWNLOADABLE from the start. Nothing is bundled — each
// chapter's audio was squeezed from the NotebookLM master to the
// library's speech spec (mono 44.1 kHz AAC, 40 kbps — the encode
// that reproduces the existing hosted files byte for byte) and
// uploaded to the public devotional-library release; the registry
// carries only metadata: the hosted name, its exact byte size,
// his title, his duration. The full registry↔hosting table (all
// 475) is pinned in devotionals-v527.test.ts; this file pins the
// new book.
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
// (Revelation 2 file 111.97s vs PROGRESS 111 — the same convention
// v495/v523–v526/v528/v529/v530/v531/v532/v534 followed).

const EXPECTED_REVELATION: [number, string, number][] = [
  [1, 'Jesus Holds the Keys to Death', 89],
  [2, 'Jesus\'s Message to the Four Churches', 111],
  [3, 'Is Your Faith Dead or Lukewarm', 102],
  [4, 'Inside the Throne Room of Revelation 4', 108],
  [5, 'Only Jesus Can Open the Scroll', 110],
  [6, 'The Four Horsemen of Revelation 6', 104],
  [7, 'The 144,000 and the Great Multitude', 93],
  [8, 'Heaven\'s Silence and the Seven Trumpets', 105],
  [9, 'Demonic Torment and Humanity\'s Refusal to Repent', 102],
  [10, 'Why John Ate the Little Book', 90],
  [11, 'The Two Witnesses of Revelation 11', 107],
  [12, 'Jesus Defeats the Dragon in Revelation 12', 102],
  [13, 'Satan\'s Failed Imitations in Revelation 13', 105],
  [14, 'The Final Harvest of Revelation 14', 106],
  [15, 'The Seven Bowls of Wrath', 116],
  [16, 'How Revelation 16 Unmakes Creation', 103],
  [17, 'How Satan\'s Empire Destroys Itself', 90],
  [18, 'Why Babylon Falls in One Hour', 101],
  [19, 'Christ Defeats Evil With a Word', 100],
  [20, 'Revelation 20 and the Final Judgment', 96],
  [21, 'Why Eternity Needs No Temple', 107],
  [22, 'Revelation 22 and the Return to Eden', 90],
];

describe('v540 registry — Revelation, PROGRESS titles', () => {
  it('holds exactly 22 Revelation entries, every chapter exactly once', () => {
    const reg = devotionalRegistry().filter((d) => d.book === 'Revelation');
    expect(reg.length).toBe(22);
    expect(reg.map((d) => d.chapter).sort((a, b) => a - b)).toEqual(
      EXPECTED_REVELATION.map(([n]) => n),
    );
    expect(devotionalsForBook('Revelation').length).toBe(22);
  });

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
    for (const [n, title, dur] of EXPECTED_REVELATION) {
      const d = getDevotional('Revelation', n);
      expect(d, `Revelation ${n}`).not.toBeNull();
      expect(d!.title).toBe(title);
      expect(d!.durationSec).toBe(dur);
      expect(d!.audioFile).toBe(`devotional-revelation-${n}.m4a`);
      // No transcript exists for the narrations — no invented words.
      expect(d!.paragraphs).toEqual([]);
    }
  });

  it('titles are distinct within the book — and none collides with any other book', () => {
    const titles = EXPECTED_REVELATION.map(([, t]) => t);
    expect(new Set(titles).size).toBe(titles.length);
    const others = devotionalRegistry().filter((d) => d.book !== 'Revelation').map((d) => d.title);
    for (const t of titles) expect(others, `Revelation: ${t}`).not.toContain(t);
  });

  it('the door rule: every Revelation chapter has one, nothing beyond', () => {
    expect(getDevotional('Revelation', 1)).not.toBeNull();
    expect(getDevotional('Revelation', 22)).not.toBeNull();
    expect(getDevotional('Revelation', 23)).toBeNull();
    expect(getDevotional('Revelation', 0)).toBeNull();
    // Galatians and Colossians remain unregistered mid-canon; their
    // null assertions stand. The not-yet seat — the canonical next
    // unregistered book after the newest registration — no longer
    // exists: Revelation was that seat (v534), it is registered
    // now, and no canonical book stands after it. The registry's
    // last book is Revelation itself.
    expect(getDevotional('Galatians', 1)).toBeNull();
    expect(getDevotional('Colossians', 1)).toBeNull();
    const books = devotionalBooks();
    expect(books[books.length - 1]).toBe('Revelation');
  });
});

describe('v540 hosted audio — hosted in the devotional-library, complete, wired', () => {
  it('every chapter carries its hosted size, each voice-grade small', () => {
    for (const [n] of EXPECTED_REVELATION) {
      const size = getDevotional('Revelation', n)!.sizeBytes!;
      expect(size, `Revelation ${n}`).toBeGreaterThan(100_000);
      expect(size, `Revelation ${n}`).toBeLessThanOrEqual(700_000);
    }
  });

  it('the book total is the hosted bytes, exactly', () => {
    expect(devotionalBookTotalBytes('Revelation')).toBe(11_862_484);
  });

  it('the download URLs point at the devotional-library release assets', () => {
    for (const [n] of EXPECTED_REVELATION) {
      const url = new URL(devotionalDownloadUrl(getDevotional('Revelation', n)!));
      expect(url.protocol).toBe('https:');
      expect(url.host).toBe('github.com');
      expect(url.pathname).toBe(
        `/ir0weez/prayer-app/releases/download/devotional-library/devotional-revelation-${n}.m4a`,
      );
    }
  });

  it('nothing of Revelation is bundled', () => {
    for (const [n] of EXPECTED_REVELATION) {
      const d = getDevotional('Revelation', n)!;
      expect(() => statSync(join(__dirname, '..', '..', 'assets', 'audio', d.audioFile))).toThrow();
    }
    expect(() => read('lib/devotional-audio.ts')).toThrow();
  });
});
