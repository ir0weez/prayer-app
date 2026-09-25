import { describe, expect, it } from 'vitest';
import { CLEANED_JONAH_BY_VERSE, CLEANED_JONAH_CHAPTERS } from './commentary-cleaned-jonah';
import { getAllCommentariesForVerse, getStructuredCommentarySections } from './commentary-data';
import { groupCommentariesByRange } from './commentary-grouping';

const entries = Object.values(CLEANED_JONAH_BY_VERSE).flat();

describe('cleaned Jonah commentary', () => {
  it('imports all four chapters with exact literal totals', () => {
    expect(Object.keys(CLEANED_JONAH_CHAPTERS)).toEqual(['1', '2', '3', '4']);
    expect(Object.values(CLEANED_JONAH_CHAPTERS).reduce((total, sections) => total + sections.length, 0)).toBe(16);
    expect(entries).toHaveLength(175);
    expect(entries.filter((entry) => entry.kind === 'quote')).toHaveLength(35);
  });

  it('preserves chapter introductions and subsection order', () => {
    expect(CLEANED_JONAH_CHAPTERS[1]?.map((section) => section.title)).toEqual([
      'Introduction',
      'Run Jonah, Run',
      'Jonah is Caught',
      "Jonah's Solution",
      'Swallowed By a Whale',
    ]);
    expect(CLEANED_JONAH_CHAPTERS[2]?.map((section) => section.title)).toEqual([
      'Introduction',
      "Jonah's Prayer",
      'Vomited On Land',
    ]);
    for (const sections of Object.values(CLEANED_JONAH_CHAPTERS)) {
      expect(sections[0]?.title).toBe('Introduction');
      expect(sections[0]?.entries.every((entry) => entry.isIntroduction)).toBe(true);
    }
  });

  it('uses each verse header for note ranges while retaining subsection ranges', () => {
    const first = CLEANED_JONAH_BY_VERSE['jonah_1_1']?.[0];
    expect(first?.verseLabel).toBe('1');
    expect(first?.startVerse).toBe(1);
    expect(first?.endVerse).toBe(1);

    const ranged = CLEANED_JONAH_BY_VERSE['jonah_3_1']?.[0];
    expect(ranged?.verseLabel).toBe('1-2');
    expect(ranged?.startVerse).toBe(1);
    expect(ranged?.endVerse).toBe(2);

    const section = CLEANED_JONAH_CHAPTERS[3]?.find((item) => item.title === 'Jonah Preaches');
    expect(section?.startVerse).toBe(1);
    expect(section?.endVerse).toBe(4);
  });

  it('keeps Scripture quotes inline and creates one carousel group per verse header', () => {
    const introQuote = CLEANED_JONAH_BY_VERSE['jonah_1_0']?.find((entry) => entry.author === 'Matthew 12:40');
    expect(introQuote?.kind).toBe('quote');
    expect(introQuote?.authorHandle).toBe('');
    expect(introQuote?.quoteStyle).toBe('inline');

    const section = CLEANED_JONAH_CHAPTERS[1]?.find((item) => item.title === 'Run Jonah, Run');
    const groups = groupCommentariesByRange(section?.entries ?? []);
    expect(groups.map((group) => [group.startVerse, group.endVerse])).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
    ]);
  });

  it('integrates Jonah into structured sections and verse lookup', () => {
    expect(getStructuredCommentarySections('Jonah', 3)).toBe(CLEANED_JONAH_CHAPTERS[3]);
    const notes = getAllCommentariesForVerse('Jonah', 3, 1);
    expect(notes.length).toBeGreaterThan(0);
    expect(notes[0]?.book).toBe('Jonah');
    expect(notes[0]?.startVerse).toBe(1);
    expect(notes[0]?.endVerse).toBe(2);
  });
});
