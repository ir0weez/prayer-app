// ─── v551 verse purity — pins ────────────────────────────────────────────────
// Device evidence (2026-11-17): 1 Corinthians 7:14 rendered Jonathan's own
// note prose ("I made a grave mistake as a newborn Christian in ministry…")
// inside the verse paragraph, in verse dress. Proven cause: the generator
// (scripts/build-bible-v205.ts → parseTxtFormatB/splitVerseBlock) read his
// canonical txt, where the commentary written straight after a verse run —
// same block, no blank line — was swallowed into the LAST verse of the run:
// splitVerseBlock assigned everything after the final verse-number cut to
// that verse. Four verses shipped corrupt: 1 Cor 7:14, Isa 6:3, Isa 19:10,
// Isa 21:12 (census vs the clean KJV: every other generated verse is exact,
// an edition variant, or a one-word spelling difference — never prose).
//
// The pins are layered so this can never silently return:
//  1. The four repaired verses, verbatim, in the shipped data.
//  2. A census of ALL shipped verses: no verse contains the text of a
//     non-scripture note block from its own chapter. (Scripture blocks are
//     exempt — his notes legitimately quote the chapter's own verses, e.g.
//     Hebrews 8. His prose in a verse is always corruption.)
//  3. A census of the generator itself: parsing the canonical txts with
//     the shipped parser must reproduce the shipped verses exactly, verse
//     for verse — so a re-broken parser or a corrupt regeneration fails
//     here even where the fused prose never became a note block (the
//     Isaiah pattern: the prose lived ONLY inside the verse).
//  4. The mechanism, synthetically: a verse run with commentary glued
//     underneath it in one block yields clean verses, and the prose lands
//     in the entry's note blocks where it belongs.

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { COMMENTARY_DATA } from '../bible-v205/data/index';
import { parseCommentaryTxt, splitVerseBlock } from '../bible-v205/parse';

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

describe('v551 — the four fused verses are clean in the shipped data', () => {
  it('pins each repaired verse verbatim', () => {
    expect(COMMENTARY_DATA['1 Corinthians'].chapters[7].verses?.[14]).toBe(
      'For the unbelieving husband is sanctified by the wife, and the unbelieving wife is sanctified by the husband: else were your children unclean; but now are they holy.',
    );
    expect(COMMENTARY_DATA['Isaiah'].chapters[6].verses?.[3]).toBe(
      'And one cried unto another, and said, Holy, holy, holy, is the Lord of hosts: the whole earth is full of his glory.',
    );
    expect(COMMENTARY_DATA['Isaiah'].chapters[19].verses?.[10]).toBe(
      'And they shall be broken in the purposes thereof, all that make sluices and ponds for fish.',
    );
    expect(COMMENTARY_DATA['Isaiah'].chapters[21].verses?.[12]).toBe(
      'The watchman said, The morning cometh, and also the night: if ye will enquire, enquire ye: return, come.',
    );
  });

  it('keeps the prose in its note blocks — 1 Cor 7 entry (12,14) still carries it, typed', () => {
    const ch = COMMENTARY_DATA['1 Corinthians'].chapters[7];
    const entry = ch.sections
      .flatMap((s) => s.entries)
      .find((e) => e.start === 12 && e.end === 14);
    expect(entry).toBeDefined();
    const kinds = (entry?.blocks ?? []).map((b) => b.kind);
    expect(kinds).toContain('conversation');
    expect(kinds).toContain('scripture');
    const convo = entry?.blocks.find((b) => b.kind === 'conversation');
    expect(convo?.text).toContain('I made a grave mistake as a newborn Christian in ministry.');
  });
});

describe('v551 — census: no shipped verse contains his note prose', () => {
  it('finds zero verses carrying a non-scripture block from their own chapter', () => {
    const violations: string[] = [];
    for (const bookData of Object.values(COMMENTARY_DATA)) {
      for (const ch of Object.values(bookData.chapters)) {
        if (!ch.verses) continue;
        const prose: string[] = [];
        const collect = (text: string | undefined, kind: string | undefined) => {
          if (!text || kind === 'scripture') return;
          const t = norm(text);
          if (t.length >= 30) prose.push(t);
        };
        for (const s of ch.sections) {
          for (const e of s.entries) for (const b of e.blocks) collect(b.text, b.kind);
        }
        for (const b of ch.intro) collect(b.text, b.kind);
        for (const p of ch.previously) collect(p, 'previously');
        if (!prose.length) continue;
        for (const [v, text] of Object.entries(ch.verses)) {
          const vt = norm(text);
          if (prose.some((p) => vt.includes(p))) {
            violations.push(`${bookData.book} ${ch.chapter}:${v}`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

describe('v551 — census: the generator reproduces the shipped verses exactly', () => {
  const TXT_DIR = join(
    process.cwd(),
    '..',
    'goals',
    'prayercircle-apk-build',
    'hidden_files',
    'commentary-txt',
  );

  it('parses every canonical txt and matches the shipped verse maps verse for verse', () => {
    const parsed = new Map<string, string>();
    for (const file of readdirSync(TXT_DIR).filter((f) => f.endsWith('.txt')).sort()) {
      for (const book of parseCommentaryTxt(readFileSync(join(TXT_DIR, file), 'utf8'))) {
        for (const [num, ch] of Object.entries(book.chapters)) {
          if (!ch.verses) continue;
          for (const [v, t] of Object.entries(ch.verses)) {
            parsed.set(`${book.book}|${num}|${v}`, t);
          }
        }
      }
    }
    const shipped = new Map<string, string>();
    for (const bookData of Object.values(COMMENTARY_DATA)) {
      for (const [num, ch] of Object.entries(bookData.chapters)) {
        if (!ch.verses) continue;
        for (const [v, t] of Object.entries(ch.verses)) {
          shipped.set(`${bookData.book}|${num}|${v}`, t);
        }
      }
    }
    const mismatches: string[] = [];
    for (const key of new Set([...parsed.keys(), ...shipped.keys()])) {
      if (parsed.get(key) !== shipped.get(key)) mismatches.push(key);
    }
    expect(mismatches).toEqual([]);
    expect(shipped.size).toBeGreaterThan(4000);
  });
});

describe('v551 — the overrun mechanism stays closed', () => {
  it('splitVerseBlock never takes text past the verse run’s own line', () => {
    const segs = splitVerseBlock(
      '1 In the beginning God created the heaven and the earth. 2 And the earth was without form, and void.\nHis own note prose, glued underneath.',
      1,
    );
    expect(segs).toEqual([
      { verse: 1, text: 'In the beginning God created the heaven and the earth.' },
      { verse: 2, text: 'And the earth was without form, and void.' },
    ]);
  });

  it('a glued commentary block lands in the entry’s blocks, not the verse', () => {
    const txt = [
      'Genesis',
      '',
      'Chapter 1',
      '',
      'Ver. 1-2: The Beginning',
      '',
      '1 In the beginning God created the heaven and the earth. 2 And the earth was without form, and void.',
      '\tThis is his own note prose, written straight after the verses.',
      '"And God said, Let there be light: and there was light." Genesis 1:3',
      '',
    ].join('\n');
    const books = parseCommentaryTxt(txt);
    const genesis = books.find((b) => b.book === 'Genesis');
    const ch = genesis?.chapters[1];
    expect(ch?.verses).toEqual({
      1: 'In the beginning God created the heaven and the earth.',
      2: 'And the earth was without form, and void.',
    });
    const entry = ch?.sections[0]?.entries[0];
    expect(entry?.start).toBe(1);
    expect(entry?.end).toBe(2);
    const blockTexts = (entry?.blocks ?? []).map((b) => b.text).join('\n');
    expect(blockTexts).toContain('This is his own note prose, written straight after the verses.');
    expect(blockTexts).toContain('Let there be light');
    for (const t of Object.values(ch?.verses ?? {})) {
      expect(t).not.toContain('note prose');
    }
  });
});
