import { describe, expect, it } from 'vitest';
import { CLEANED_ISAIAH_BY_VERSE, CLEANED_ISAIAH_CHAPTERS } from './commentary-cleaned-isaiah';
import { getAllCommentariesForVerse, getStructuredCommentarySections } from './commentary-data';

const entryCount = Object.values(CLEANED_ISAIAH_BY_VERSE)
  .reduce((total, entries) => total + entries.length, 0);
const quoteCount = Object.values(CLEANED_ISAIAH_BY_VERSE)
  .flat()
  .filter((entry) => entry.kind === 'quote').length;
const sectionCount = Object.values(CLEANED_ISAIAH_CHAPTERS)
  .reduce((total, sections) => total + sections.length, 0);

describe('cleaned Isaiah commentary', () => {
  it('imports all 66 chapters with exact literal totals', () => {
    expect(Object.keys(CLEANED_ISAIAH_CHAPTERS)).toHaveLength(66);
    expect(sectionCount).toBe(378);
    expect(entryCount).toBe(3457);
    expect(quoteCount).toBe(764);
  });

  it('keeps each chapter introduction before its verse sections', () => {
    for (const sections of Object.values(CLEANED_ISAIAH_CHAPTERS)) {
      expect(sections[0]?.title).toBe('Introduction');
      expect(sections[0]?.entries.every((entry) => entry.isIntroduction)).toBe(true);
    }
  });

  it('preserves chapter-one subsection order and enclosing ranges', () => {
    expect(CLEANED_ISAIAH_CHAPTERS[1]?.slice(0, 3).map((section) => section.title)).toEqual([
      'Introduction',
      'The Rebellious Israel',
      'Fake Practices',
    ]);
    const firstNote = CLEANED_ISAIAH_BY_VERSE['isaiah_1_1']?.[0];
    expect(firstNote?.verse).toBe(1);
    expect(firstNote?.startVerse).toBe(1);
    expect(firstNote?.endVerse).toBe(9);
    expect(firstNote?.text).toContain('Right from the start');
    const rangeNote = CLEANED_ISAIAH_BY_VERSE['isaiah_1_8']?.[0];
    expect(rangeNote?.verseLabel).toBe('8-9');
    expect(rangeNote?.startVerse).toBe(1);
    expect(rangeNote?.endVerse).toBe(9);
  });

  it('keeps Scripture quotations under their source verse header', () => {
    const entries = CLEANED_ISAIAH_BY_VERSE['isaiah_1_1'];
    const quote = entries?.find((entry) => entry.kind === 'quote');
    expect(quote).toBeDefined();
    expect(quote?.author).toBe('2 Timothy 3:16');
    expect(quote?.authorHandle).toBe('');
    expect(quote?.quoteStyle).toBe('inline');
    expect(quote?.verse).toBe(1);
    expect(CLEANED_ISAIAH_BY_VERSE['isaiah_1_1']?.some((entry) => entry.author === '2 Timothy 3:16')).toBe(true);
  });

  it('integrates Isaiah into structured sections and range-aware lookup', () => {
    expect(getStructuredCommentarySections('Isaiah', 1)).toBe(CLEANED_ISAIAH_CHAPTERS[1]);
    const notes = getAllCommentariesForVerse('Isaiah', 1, 9);
    expect(notes.length).toBeGreaterThan(0);
    expect(notes[0]?.book).toBe('Isaiah');
    expect(notes[0]?.startVerse).toBe(1);
    expect(notes[0]?.endVerse).toBe(9);
  });
});
