import { describe, expect, it } from 'vitest';
import { CLEANED_OBADIAH_BY_VERSE, CLEANED_OBADIAH_CHAPTERS } from './commentary-cleaned-obadiah';
import { getAllCommentariesForVerse, getStructuredCommentarySections } from './commentary-data';
import { groupCommentariesByRange } from './commentary-grouping';

const entries = Object.values(CLEANED_OBADIAH_BY_VERSE).flat();

describe('cleaned Obadiah commentary', () => {
  it('imports the single chapter with exact literal totals', () => {
    expect(Object.keys(CLEANED_OBADIAH_CHAPTERS)).toEqual(['1']);
    expect(CLEANED_OBADIAH_CHAPTERS[1]).toHaveLength(7);
    expect(entries).toHaveLength(52);
    expect(entries.filter((entry) => entry.kind === 'quote')).toHaveLength(9);
  });

  it('preserves the introduction and subsection order', () => {
    expect(CLEANED_OBADIAH_CHAPTERS[1]?.map((section) => section.title)).toEqual([
      'Introduction',
      'A Word for Edom',
      "Edom's Thieves",
      "Edom's Sentence",
      'The Day of the Lord',
      'Look and Live',
      'Judgement To Come',
    ]);
    expect(CLEANED_OBADIAH_CHAPTERS[1]?.[0]?.entries.every((entry) => entry.isIntroduction)).toBe(true);
  });

  it('uses each verse header for note ranges and keeps subsection ranges separate', () => {
    const first = CLEANED_OBADIAH_BY_VERSE['obadiah_1_1']?.[0];
    expect(first?.verseLabel).toBe('1');
    expect(first?.startVerse).toBe(1);
    expect(first?.endVerse).toBe(1);

    const verseRange = CLEANED_OBADIAH_BY_VERSE['obadiah_1_13']?.[0];
    expect(verseRange?.verseLabel).toBe('13-14');
    expect(verseRange?.startVerse).toBe(13);
    expect(verseRange?.endVerse).toBe(14);

    const section = CLEANED_OBADIAH_CHAPTERS[1]?.find((item) => item.title === "Edom's Sentence");
    expect(section?.startVerse).toBe(10);
    expect(section?.endVerse).toBe(14);
  });

  it('keeps Scripture quotes inline and groups the first subsection by verse header', () => {
    const quote = CLEANED_OBADIAH_BY_VERSE['obadiah_1_4']?.find((entry) => entry.kind === 'quote');
    expect(quote?.author).toBe('Matthew 7:24-27');
    expect(quote?.authorHandle).toBe('');
    expect(quote?.quoteStyle).toBe('inline');

    const section = CLEANED_OBADIAH_CHAPTERS[1]?.find((item) => item.title === 'A Word for Edom');
    const groups = groupCommentariesByRange(section?.entries ?? []);
    expect(groups.map((group) => [group.startVerse, group.endVerse])).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
    ]);
  });

  it('integrates Obadiah into structured sections and verse lookup', () => {
    expect(getStructuredCommentarySections('Obadiah', 1)).toBe(CLEANED_OBADIAH_CHAPTERS[1]);
    const notes = getAllCommentariesForVerse('Obadiah', 1, 13);
    expect(notes.length).toBeGreaterThan(0);
    expect(notes[0]?.book).toBe('Obadiah');
    expect(notes[0]?.startVerse).toBe(13);
    expect(notes[0]?.endVerse).toBe(14);
  });
});
