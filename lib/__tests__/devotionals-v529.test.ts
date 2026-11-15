// v529 — Mark and Acts join the devotional library.
// All 16 + 28 NotebookLM narrations of Jonathan's own commentary
// for these books, registered the v527 way: DOWNLOADABLE from the
// start. Nothing is bundled — each chapter's audio was squeezed
// from the NotebookLM master to the library's speech spec (mono
// 44.1 kHz AAC, 40 kbps — the encode that reproduces the existing
// hosted files byte for byte) and uploaded to the public
// devotional-library release; the registry carries only metadata:
// the hosted name, its exact byte size, his title, his duration.
// The full registry↔hosting table (all 409) is pinned in
// devotionals-v527.test.ts; this file pins the two new books.
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
// (Mark 3 file 108.02s vs PROGRESS 107, Mark 15 file 101.05s
// vs 100, Acts 6 file 103.05s vs 102 — the same convention
// v495/v523–v526/v528 followed).

const EXPECTED_MARK: [number, string, number][] = [
  [1, 'Authority and Compassion in Mark 1', 87],
  [2, 'Why Jesus Chose Forgiveness Over Miracles', 95],
  [3, 'Who Truly Belongs to God\'s Family', 107],
  [4, 'Trusting Christ Through Seeds and Storms', 80],
  [5, 'Jesus Conquers Demons, Disease, and Death', 112],
  [6, 'Jesus Feeds Five Thousand Despite Rejection', 91],
  [7, 'Dirty Hearts Not Dirty Hands', 94],
  [8, 'What Is Your Soul Worth', 106],
  [9, 'From Transfiguration to Childlike Faith', 92],
  [10, 'Jesus Redefines Greatness in Mark 10', 94],
  [11, 'Jesus Replaces Empty Religion', 105],
  [12, 'The Greatest Commandment and the Widow\'s Mite', 92],
  [13, 'Enduring Persecution Before Christ Returns', 86],
  [14, 'Betrayal and Denial in Mark 14', 89],
  [15, 'Jesus Takes the Place of Barabbas', 100],
  [16, 'Mark 16 and the Greatest Miracle', 92],
];

const EXPECTED_ACTS: [number, string, number][] = [
  [1, 'Waiting for Power and Choosing Matthias', 103],
  [2, 'How Peter\'s Sermon Saved 3,000 Souls', 98],
  [3, 'Acts 3 Miracles and Daily Repentance', 107],
  [4, 'Refusing to Be Silenced in Acts 4', 94],
  [5, 'Why the Apostles Rejoiced in Suffering', 98],
  [6, 'The First Deacons and Stephen\'s Wisdom', 102],
  [7, 'Stephen\'s Defense That Cost His Life', 91],
  [8, 'From Persecution to the Ethiopian Eunuch', 89],
  [9, 'From Church Enemy to Greatest Asset', 102],
  [10, 'God Shatters Peter\'s Religious Pride', 93],
  [11, 'How Antioch Redefined Christian Identity', 86],
  [12, 'Peter\'s Prison Escape and Herod\'s Demise', 87],
  [13, 'Paul\'s First Missionary Journey', 82],
  [14, 'Paul Survives a Stoning in Lystra', 83],
  [15, 'Grace Traditions and the Split Over Mark', 92],
  [16, 'How Midnight Worship Broke Prison Chains', 104],
  [17, 'How Paul Preached at Mars Hill', 96],
  [18, 'God Protects Paul in Corinth', 97],
  [19, 'When Ephesus Burned Their Magic Books', 88],
  [20, 'Paul\'s Challenge to the Ephesian Elders', 105],
  [21, 'Why Paul Chose Chains in Jerusalem', 94],
  [22, 'Paul Uses Testimony and Roman Citizenship', 90],
  [23, 'How Roman Soldiers Saved Paul', 99],
  [24, 'Paul on Trial Before Governor Felix', 93],
  [25, 'Paul Appeals to Caesar', 95],
  [26, 'Paul Almost Persuades King Agrippa', 98],
  [27, 'Paul\'s Ignored Warning and the Shipwreck', 98],
  [28, 'From Viper Bite to Nero\'s Execution', 99],
];

const BOOKS: [string, string, [number, string, number][]][] = [
  ['Mark', 'mark', EXPECTED_MARK],
  ['Acts', 'acts', EXPECTED_ACTS],
];

describe('v529 registry — Mark and Acts, PROGRESS titles', () => {
  for (const [book, , expected] of BOOKS) {
    it(`holds exactly ${expected.length} ${book} entries, every chapter exactly once`, () => {
      const reg = devotionalRegistry().filter((d) => d.book === book);
      expect(reg.length).toBe(expected.length);
      expect(reg.map((d) => d.chapter).sort((a, b) => a - b)).toEqual(expected.map(([n]) => n));
      expect(devotionalsForBook(book).length).toBe(expected.length);
    });
  }

  // v530 RE-BASE (2026-11-15): the whole registry moved 380 → 409
  // across 18 books when 1 Corinthians (16) and 2 Corinthians (13)
  // registered, downloadable from the start (v527 model); the two
  // books' per-book pins below stand.
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
    expect(getDevotional('Mark', 1)).not.toBeNull();
    expect(getDevotional('Mark', 16)).not.toBeNull();
    expect(getDevotional('Mark', 17)).toBeNull();
    expect(getDevotional('Mark', 0)).toBeNull();
    expect(getDevotional('Acts', 1)).not.toBeNull();
    expect(getDevotional('Acts', 28)).not.toBeNull();
    expect(getDevotional('Acts', 29)).toBeNull();
    // Romans and Galatians stay doorless, and the next
    // unregistered book after the newest registrations —
    // Colossians — is the not-yet seat now (v531 RE-BASE,
    // 2026-11-15; the seat was Galatians at v530). Hebrews
    // registered at v532 (2026-11-15) and the seat moves on
    // to James. James registered at v534 (2026-11-15) with
    // 1 Peter, 2 Peter, 1 John, 2 John, 3 John and Jude, and
    // the seat moves on to Revelation. Revelation registered
    // at v540 (2026-11-15) — the final registration; no
    // canonical book stands after it, so the seat is gone.
    expect(getDevotional('Romans', 1)).toBeNull();
    expect(getDevotional('Galatians', 1)).toBeNull();
    expect(getDevotional('Colossians', 1)).toBeNull();
    expect(getDevotional('James', 1)).not.toBeNull();
    expect(getDevotional('Revelation', 1)).not.toBeNull();
  });
});

describe('v529 hosted audio — hosted in the devotional-library, complete, wired', () => {
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
    expect(devotionalBookTotalBytes('Mark')).toBe(8_133_865);
    expect(devotionalBookTotalBytes('Acts')).toBe(14_203_171);
    expect(
      devotionalBookTotalBytes('Mark') +
        devotionalBookTotalBytes('Acts'),
    ).toBe(22_337_036);
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
