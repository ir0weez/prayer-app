import { describe, expect, it } from 'vitest';
import { CLEANED_ECCLESIASTES_BY_VERSE, CLEANED_ECCLESIASTES_CHAPTERS } from './commentary-cleaned-ecclesiastes';
import { getAllCommentariesForVerse, getStructuredCommentarySections } from './commentary-data';

const entryCount = Object.values(CLEANED_ECCLESIASTES_BY_VERSE)
  .reduce((total, entries) => total + entries.length, 0);
const quoteCount = Object.values(CLEANED_ECCLESIASTES_BY_VERSE)
  .flat()
  .filter((entry) => entry.kind === 'quote').length;
const sectionCount = Object.values(CLEANED_ECCLESIASTES_CHAPTERS)
  .reduce((total, sections) => total + sections.length, 0);

describe('cleaned Ecclesiastes commentary', () => {
  it('imports all 12 chapters with exact literal totals', () => {
    expect(Object.keys(CLEANED_ECCLESIASTES_CHAPTERS)).toHaveLength(12);
    expect(sectionCount).toBe(58);
    expect(entryCount).toBe(636);
    expect(quoteCount).toBe(120);
  });

  it('keeps each chapter introduction before its verse sections', () => {
    for (const sections of Object.values(CLEANED_ECCLESIASTES_CHAPTERS)) {
      expect(sections[0]?.title).toBe('Introduction');
      expect(sections[0]?.entries.every((entry) => entry.isIntroduction)).toBe(true);
    }
  });

  it('preserves chapter-one subsection order and enclosing ranges', () => {
    expect(CLEANED_ECCLESIASTES_CHAPTERS[1]?.map((section) => section.title)).toEqual([
      'Introduction',
      'Vanities of Life',
      'The Preacher King',
    ]);
    const firstNote = CLEANED_ECCLESIASTES_BY_VERSE['ecclesiastes_1_1']?.[0];
    expect(firstNote?.verse).toBe(1);
    expect(firstNote?.startVerse).toBe(1);
    expect(firstNote?.endVerse).toBe(11);
    expect(firstNote?.text).toContain('the “Preacher.”');
    const verseRangeNote = CLEANED_ECCLESIASTES_BY_VERSE['ecclesiastes_1_6']?.[0];
    expect(verseRangeNote?.verseLabel).toBe('6-7');
    expect(verseRangeNote?.startVerse).toBe(1);
    expect(verseRangeNote?.endVerse).toBe(11);
  });

  it('keeps Scripture quotations inline without a profile handle', () => {
    const entries = CLEANED_ECCLESIASTES_BY_VERSE['ecclesiastes_1_1'];
    const quote = entries?.find((entry) => entry.kind === 'quote');
    expect(quote).toBeDefined();
    expect(quote?.author).toBe('1 Chronicles 3:1-9');
    expect(quote?.authorHandle).toBe('');
    expect(quote?.quoteStyle).toBe('inline');
  });

  it('integrates Ecclesiastes into structured sections and range-aware lookup', () => {
    expect(getStructuredCommentarySections('Ecclesiastes', 1)).toBe(CLEANED_ECCLESIASTES_CHAPTERS[1]);
    const notes = getAllCommentariesForVerse('Ecclesiastes', 1, 10);
    expect(notes.length).toBeGreaterThan(0);
    expect(notes[0]?.book).toBe('Ecclesiastes');
    expect(notes[0]?.startVerse).toBe(1);
    expect(notes[0]?.endVerse).toBe(11);
  });
});
