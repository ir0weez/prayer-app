import { describe, expect, it } from 'vitest';
import { CLEANED_RUTH_BY_VERSE, CLEANED_RUTH_CHAPTERS } from './commentary-cleaned-ruth';

describe('cleaned Ruth commentary structure', () => {
  it('keeps all four chapter introductions before each chapter subsection list', () => {
    expect(Object.keys(CLEANED_RUTH_CHAPTERS)).toHaveLength(4);
    for (let chapter = 1; chapter <= 4; chapter += 1) {
      expect(CLEANED_RUTH_CHAPTERS[chapter]?.[0].title).toBe('Introduction');
      expect(CLEANED_RUTH_CHAPTERS[chapter]?.[0].entries.every((entry) => entry.isIntroduction)).toBe(true);
    }
  });

  it('preserves Ruth subsection titles and uneven source-defined ranges', () => {
    expect(CLEANED_RUTH_CHAPTERS[1].find((section) => section.title === 'Naomi Widowed')).toMatchObject({
      startVerse: 1,
      endVerse: 5,
    });
    expect(CLEANED_RUTH_CHAPTERS[1].find((section) => section.title === 'Ruth’s Loyalty')).toMatchObject({
      startVerse: 6,
      endVerse: 18,
    });
    expect(CLEANED_RUTH_CHAPTERS[4].find((section) => section.title === 'David’s Genealogy')).toMatchObject({
      startVerse: 18,
      endVerse: 22,
    });
  });

  it('keeps Ruth 1:1 comments in source order and classifies Scripture quotes inline', () => {
    const entries = CLEANED_RUTH_BY_VERSE['ruth_1_1'];
    expect(entries.length).toBeGreaterThan(1);
    expect(entries.every((entry) => entry.book === 'Ruth' && entry.chapter === 1 && entry.verse === 1)).toBe(true);
    expect(entries[0].author).toBe('Tried By Fire');
    expect(entries[0].text).toContain('Bethlehem is a known location');
    expect(entries.some((entry) => entry.quoteStyle === 'inline' && entry.authorHandle === '')).toBe(true);
  });
});
