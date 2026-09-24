import { describe, expect, it } from 'vitest';
import { CLEANED_SONGOFSOLOMON_BY_VERSE, CLEANED_SONGOFSOLOMON_CHAPTERS } from './commentary-cleaned-songofsolomon';
import { getAllCommentariesForVerse, getStructuredCommentarySections } from './commentary-data';

const entryCount = Object.values(CLEANED_SONGOFSOLOMON_BY_VERSE)
  .reduce((total, entries) => total + entries.length, 0);
const quoteCount = Object.values(CLEANED_SONGOFSOLOMON_BY_VERSE)
  .flat()
  .filter((entry) => entry.kind === 'quote').length;
const sectionCount = Object.values(CLEANED_SONGOFSOLOMON_CHAPTERS)
  .reduce((total, sections) => total + sections.length, 0);

describe('cleaned Song of Solomon commentary', () => {
  it('imports all 8 chapters with exact literal totals', () => {
    expect(Object.keys(CLEANED_SONGOFSOLOMON_CHAPTERS)).toHaveLength(8);
    expect(sectionCount).toBe(42);
    expect(entryCount).toBe(307);
    expect(quoteCount).toBe(59);
  });

  it('keeps each chapter introduction before its verse sections', () => {
    for (const sections of Object.values(CLEANED_SONGOFSOLOMON_CHAPTERS)) {
      expect(sections[0]?.title).toBe('Introduction');
      expect(sections[0]?.entries.every((entry) => entry.isIntroduction)).toBe(true);
    }
  });

  it('preserves chapter-one subsection order and enclosing ranges', () => {
    expect(CLEANED_SONGOFSOLOMON_CHAPTERS[1]?.map((section) => section.title)).toEqual([
      'Introduction',
      'Who The Song Belongs Too',
      "The Woman's Love",
      'Looking for Sheep',
      'The Shepherds Answer',
      'Cleansing the Bride',
      'Plesant Sight and Smell',
      'The Place of Refuge',
    ]);
    const firstNote = CLEANED_SONGOFSOLOMON_BY_VERSE['songofsolomon_1_1']?.[0];
    expect(firstNote?.verse).toBe(1);
    expect(firstNote?.startVerse).toBe(1);
    expect(firstNote?.endVerse).toBe(1);
    expect(firstNote?.text).toContain('Solomon gets this out of the way');
    const rangeNote = CLEANED_SONGOFSOLOMON_BY_VERSE['songofsolomon_1_2']?.[0];
    expect(rangeNote?.verseLabel).toBe('2-4');
    expect(rangeNote?.startVerse).toBe(2);
    expect(rangeNote?.endVerse).toBe(4);
  });

  it('keeps Scripture quotations under their source verse header', () => {
    const entries = CLEANED_SONGOFSOLOMON_BY_VERSE['songofsolomon_1_2'];
    const quote = entries?.find((entry) => entry.kind === 'quote');
    expect(quote).toBeDefined();
    expect(quote?.author).toBe('Psalm 2:12');
    expect(quote?.authorHandle).toBe('');
    expect(quote?.quoteStyle).toBe('inline');
    expect(quote?.verse).toBe(2);
    expect(CLEANED_SONGOFSOLOMON_BY_VERSE['songofsolomon_1_12']?.some((entry) => entry.author === 'Psalm 2:12')).toBe(false);
  });

  it('integrates Song of Solomon into structured sections and range-aware lookup', () => {
    expect(getStructuredCommentarySections('Song of Solomon', 1)).toBe(CLEANED_SONGOFSOLOMON_CHAPTERS[1]);
    const notes = getAllCommentariesForVerse('Song of Solomon', 1, 4);
    expect(notes.length).toBeGreaterThan(0);
    expect(notes[0]?.book).toBe('Song of Solomon');
    expect(notes[0]?.startVerse).toBe(2);
    expect(notes[0]?.endVerse).toBe(4);
  });
});
