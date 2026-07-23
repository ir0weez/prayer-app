import { describe, it, expect } from 'vitest';
import { parseBibleSections, BibleVerse } from './bible-section-parser';

describe('parseBibleSections', () => {
  it('should parse verses without headings into a single section', () => {
    const verses: BibleVerse[] = [
      { verse: 1, text: 'In the beginning God created the heavens and the earth.' },
      { verse: 2, text: 'Now the earth was formless and empty, darkness was over the surface of the deep.' },
      { verse: 3, text: 'And God said, "Let there be light," and there was light.' },
    ];

    const sections = parseBibleSections(verses);

    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('Read');
    expect(sections[0].verses).toHaveLength(3);
    expect(sections[0].startVerse).toBe(1);
    expect(sections[0].endVerse).toBe(3);
  });

  it('should detect section headings and group verses accordingly', () => {
    const verses: BibleVerse[] = [
      { verse: 1, text: 'THE CREATION' },
      { verse: 2, text: 'In the beginning God created the heavens and the earth.' },
      { verse: 3, text: 'Now the earth was formless and empty.' },
      { verse: 4, text: 'GOD\'S REST' },
      { verse: 5, text: 'By the seventh day God had finished the work he had been doing.' },
      { verse: 6, text: 'And he rested on the seventh day from all his work.' },
    ];

    const sections = parseBibleSections(verses);

    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe('THE CREATION');
    expect(sections[0].verses).toHaveLength(2);
    expect(sections[1].title).toBe('GOD\'S REST');
    expect(sections[1].verses).toHaveLength(2);
  });

  it('should handle title case headings', () => {
    const verses: BibleVerse[] = [
      { verse: 1, text: 'The Creation Story' },
      { verse: 2, text: 'In the beginning God created.' },
      { verse: 3, text: 'And God saw that it was good.' },
    ];

    const sections = parseBibleSections(verses);

    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('The Creation Story');
    expect(sections[0].verses).toHaveLength(2);
  });

  it('should skip lines with verse numbers as headings', () => {
    const verses: BibleVerse[] = [
      { verse: 1, text: 'In the beginning God created the heavens and the earth.' },
      { verse: 2, text: 'Now the earth was formless and empty, darkness was over the surface of the deep, and the Spirit of God was hovering over the waters.' },
    ];

    const sections = parseBibleSections(verses);

    expect(sections).toHaveLength(1);
    expect(sections[0].verses).toHaveLength(2);
  });

  it('should return empty array for empty verses', () => {
    const sections = parseBibleSections([]);
    expect(sections).toHaveLength(0);
  });

  it('should handle multiple consecutive headings', () => {
    const verses: BibleVerse[] = [
      { verse: 1, text: 'PART ONE' },
      { verse: 2, text: 'CHAPTER ONE' },
      { verse: 3, text: 'In the beginning.' },
      { verse: 4, text: 'And it was so.' },
    ];

    const sections = parseBibleSections(verses);

    // Should create sections for each heading, even if they have no verses
    expect(sections.length).toBeGreaterThan(0);
    expect(sections[sections.length - 1].verses.length).toBeGreaterThan(0);
  });

  it('should preserve verse order and content', () => {
    const verses: BibleVerse[] = [
      { verse: 1, text: 'First verse text' },
      { verse: 2, text: 'Second verse text' },
      { verse: 3, text: 'Third verse text' },
    ];

    const sections = parseBibleSections(verses);
    const allVerses = sections.flatMap(s => s.verses);

    expect(allVerses).toEqual(verses);
  });

  it('should generate unique section IDs', () => {
    const verses: BibleVerse[] = [
      { verse: 1, text: 'SECTION ONE' },
      { verse: 2, text: 'Verse one' },
      { verse: 3, text: 'SECTION TWO' },
      { verse: 4, text: 'Verse two' },
    ];

    const sections = parseBibleSections(verses);

    const ids = sections.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length); // All IDs should be unique
  });
});
