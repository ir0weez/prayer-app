import { describe, expect, it } from 'vitest';
import { CLEANED_JOSHUA_BY_VERSE, CLEANED_JOSHUA_CHAPTERS } from './commentary-cleaned-joshua';

describe('cleaned Joshua commentary structure', () => {
  it('keeps all 24 chapter introductions before each chapter subsection list', () => {
    expect(Object.keys(CLEANED_JOSHUA_CHAPTERS)).toHaveLength(24);
    for (let chapter = 1; chapter <= 24; chapter += 1) {
      expect(CLEANED_JOSHUA_CHAPTERS[chapter]?.[0].title).toBe('Introduction');
      expect(CLEANED_JOSHUA_CHAPTERS[chapter]?.[0].entries.every((entry) => entry.isIntroduction)).toBe(true);
    }
  });

  it('preserves Joshua custom subsection ranges and titles', () => {
    const chapterOne = CLEANED_JOSHUA_CHAPTERS[1];
    expect(chapterOne.find((section) => section.title === 'God Encourages Joshua')).toMatchObject({
      startVerse: 1,
      endVerse: 9,
    });
    expect(chapterOne.find((section) => section.title === 'The Son of Fish')).toMatchObject({
      startVerse: 10,
      endVerse: 11,
    });
  });

  it('keeps verse entries in source order and distinguishes Scripture quotes from commentary', () => {
    const entries = CLEANED_JOSHUA_BY_VERSE['joshua_1_1'];
    expect(entries.length).toBeGreaterThan(1);
    expect(entries.every((entry) => entry.book === 'Joshua' && entry.chapter === 1 && entry.verse === 1)).toBe(true);
    expect(entries[0].author).toBe('Tried By Fire');
    expect(entries[0].text).toContain('"Now" states');
    expect(entries.some((entry) => entry.quoteStyle === 'inline' && entry.authorHandle === '')).toBe(true);
  });
});
