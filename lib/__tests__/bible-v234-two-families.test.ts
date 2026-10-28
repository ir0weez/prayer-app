// ─── v234 "Two Families" — pins ─────────────────────────────────────
// Jonathan's ruling (2026-10-24): "separate what is commentary buttons
// and what is personal study buttons." v311 (approved drawing,
// 2026-10-28 12:42) carries the same separation into the chapter
// SHEET under the drawing's group names — READING (Read Chapter ·
// Read as Stories · the read-mark switch) and MY WRITING (the
// notes-written pipeline chips) — ReStudy standing ONCE, as a chip
// in My Writing (the old second door, the Your Study "Add to
// ReStudy Queue" button, is retired). Presentation only: the v233
// display model (chapterDisplayMarks) still decides what shows,
// untouched.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('the chapter sheet — two labeled groups', () => {
  const src = read('app/bible-book.tsx');
  const readingAt = src.indexOf('>Reading</Text>');
  const writingAt = src.indexOf('>My Writing</Text>');

  it('both group headers render, reading first', () => {
    expect(readingAt).toBeGreaterThanOrEqual(0);
    expect(writingAt).toBeGreaterThan(readingAt);
  });

  it('the reading controls live under READING', () => {
    // Distinctive wiring for each reading-family control, all
    // between the two headers.
    const controls: Array<[string, string]> = [
      ['Read Chapter', 'openChapter(false)'],
      ['Read as Stories', 'openChapter(true)'],
      ['the read-mark switch', '<Switch'],
      ['the switch wired to the read door', 'v ? applyRead() : clearRead()'],
      ['the read date line', 'formatReadDate(selReadDate)'],
    ];
    for (const [name, needle] of controls) {
      const at = src.indexOf(needle);
      expect(at, name).toBeGreaterThan(readingAt);
      expect(at, name).toBeLessThan(writingAt);
    }
  });

  it('the writing chips render under MY WRITING — every chapter, noted or not', () => {
    // The chip row walks the one applyStatus door, in the drawing's
    // order; it renders unconditionally (v278's guarantee: a stored
    // state on a noteless chapter stays changeable — study-v278
    // carries the model pins).
    for (const needle of ['SHEET_STATUS_ORDER.map', 'sheetChipDress', 'applyStatus(s)']) {
      expect(src.indexOf(needle, writingAt), needle).toBeGreaterThan(writingAt);
    }
    // Not Started and None are one unset state with one clear path.
    expect(src).toContain("applyStatus('none')");
    expect(src).toContain('Clear state');
    // ReStudy stands ONCE in the whole sheet: its chip label is the
    // only ReStudy action (no separate queue button survives).
    expect(src).not.toContain('Add to ReStudy Queue');
    expect(src.split("restudy: 'Restudy'").length - 1).toBe(1);
  });
});

describe('the chapter page strip — the same two families, labeled', () => {
  const src = read('components/bible-v205/chapter-page.tsx');
  const stripAt = src.indexOf('styles.strip,');

  it('the strip labels its COMMENTARY and STUDY lines', () => {
    expect(src.indexOf('>Commentary</Text>')).toBeGreaterThan(stripAt);
    expect(src.indexOf('>Study</Text>')).toBeGreaterThan(stripAt);
    expect(src).toContain('stripLabel');
    // Both marks still ride the strip, each on its family's line:
    // the notes chip under Commentary, the read chip under Study.
    expect(src.indexOf('<StatusChip')).toBeGreaterThan(src.indexOf('>Commentary</Text>'));
    expect(src.indexOf('<ReadChip')).toBeGreaterThan(src.indexOf('>Study</Text>'));
  });

  it('the read line keeps its words — a read date still shows on the strip', () => {
    expect(src).toContain('✓ Read ${formatReadDate(readDate)}');
    // …and the v233 noteless headline sentences are unchanged.
    expect(src).toContain('No notes for this chapter — reading is the whole mark.');
    expect(src).toContain('so a Complete here counts as Read.');
  });
});
