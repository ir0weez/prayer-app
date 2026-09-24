import { describe, expect, it } from 'vitest';
import { CLEANED_PROVERBS_BY_VERSE, CLEANED_PROVERBS_CHAPTERS } from './commentary-cleaned-proverbs';
import { getAllCommentariesForVerse, getStructuredCommentarySections } from './commentary-data';

const entryCount = Object.values(CLEANED_PROVERBS_BY_VERSE)
  .reduce((total, entries) => total + entries.length, 0);
const quoteCount = Object.values(CLEANED_PROVERBS_BY_VERSE)
  .flat()
  .filter((entry) => entry.kind === 'quote').length;
const sectionCount = Object.values(CLEANED_PROVERBS_CHAPTERS)
  .reduce((total, sections) => total + sections.length, 0);

describe('cleaned Proverbs commentary', () => {
  it('imports all 31 chapters with exact literal totals', () => {
    expect(Object.keys(CLEANED_PROVERBS_CHAPTERS)).toHaveLength(31);
    expect(sectionCount).toBe(160);
    expect(entryCount).toBe(1404);
    expect(quoteCount).toBe(294);
  });

  it('keeps each chapter introduction before its verse sections', () => {
    for (const sections of Object.values(CLEANED_PROVERBS_CHAPTERS)) {
      expect(sections[0]?.title).toBe('Introduction');
      expect(sections[0]?.entries.every((entry) => entry.isIntroduction)).toBe(true);
    }
  });

  it('preserves chapter-one subsection order and exact verse-header ranges', () => {
    expect(CLEANED_PROVERBS_CHAPTERS[1]?.map((section) => section.title)).toEqual([
      'Introduction',
      'The Purpose and Plan For Writing',
      'Seek Wisdom, Not Evil',
      'Wisdom Is Crying',
    ]);
    const firstNote = CLEANED_PROVERBS_BY_VERSE['proverbs_1_1']?.[0];
    expect(firstNote?.verse).toBe(1);
    expect(firstNote?.startVerse).toBe(1);
    expect(firstNote?.endVerse).toBe(1);
    expect(firstNote?.text).toContain('Solomon identifies himself');
    const verseRangeNote = CLEANED_PROVERBS_BY_VERSE['proverbs_1_2']?.[0];
    expect(verseRangeNote?.verseLabel).toBe('2-4');
    expect(verseRangeNote?.startVerse).toBe(2);
    expect(verseRangeNote?.endVerse).toBe(4);
  });

  it('keeps standalone quotes as separate quote entries', () => {
    const entries = CLEANED_PROVERBS_BY_VERSE['proverbs_1_2'];
    const quote = entries?.find((entry) => entry.kind === 'quote');
    expect(quote).toBeDefined();
    expect(quote?.text).toContain('know wisdom');
    expect(quote?.author).toBe('Someone');
    expect(quote?.authorHandle).toBe('@Someone');
  });

  it('integrates Proverbs into structured sections and range-aware lookup', () => {
    expect(getStructuredCommentarySections('Proverbs', 1)).toBe(CLEANED_PROVERBS_CHAPTERS[1]);
    const notes = getAllCommentariesForVerse('Proverbs', 1, 4);
    expect(notes.length).toBeGreaterThan(0);
    expect(notes[0]?.book).toBe('Proverbs');
    expect(notes[0]?.startVerse).toBe(2);
    expect(notes[0]?.endVerse).toBe(4);
  });
});
