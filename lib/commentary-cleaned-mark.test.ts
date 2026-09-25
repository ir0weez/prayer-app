import { describe, expect, it } from 'vitest';
import { CLEANED_MARK_BY_VERSE, CLEANED_MARK_CHAPTERS } from './commentary-cleaned-mark';
import { getAllCommentariesForVerse, getStructuredCommentarySections } from './commentary-data';
import { groupCommentariesByRange } from './commentary-grouping';

const entries = Object.values(CLEANED_MARK_BY_VERSE).flat();

describe('cleaned Mark commentary', () => {
  it('imports all sixteen chapters with exact literal totals', () => {
    expect(Object.keys(CLEANED_MARK_CHAPTERS)).toHaveLength(16);
    expect(Object.values(CLEANED_MARK_CHAPTERS).reduce((total, sections) => total + sections.length, 0)).toBe(139);
    expect(entries).toHaveLength(966);
    expect(entries.filter((entry) => entry.kind === 'quote')).toHaveLength(121);
  });

  it('preserves chapter introductions and the first chapter subsection order', () => {
    expect(CLEANED_MARK_CHAPTERS[1]?.map((section) => section.title)).toEqual([
      'Introduction',
      'John The Baptizer',
      'Jesus Is Baptized',
      'Jesus Is Tempted',
      'The Kingdom of God',
      'Fishers of Men',
      'Controlling Demons',
      "Peter's Mother-In-Law",
      'Multitudes Healed',
      'All Men Need Christ',
      'Jesus Preaches',
      'A Leper Preaches',
    ]);
    for (const sections of Object.values(CLEANED_MARK_CHAPTERS)) {
      expect(sections[0]?.title).toBe('Introduction');
      expect(sections[0]?.entries.every((entry) => entry.isIntroduction)).toBe(true);
    }
  });

  it('uses each verse header for note ranges while retaining subsection ranges', () => {
    const single = CLEANED_MARK_BY_VERSE['mark_1_1']?.[0];
    expect(single?.verseLabel).toBe('1');
    expect(single?.startVerse).toBe(1);
    expect(single?.endVerse).toBe(1);

    const ranged = CLEANED_MARK_BY_VERSE['mark_1_2']?.[0];
    expect(ranged?.verseLabel).toBe('2-3');
    expect(ranged?.startVerse).toBe(2);
    expect(ranged?.endVerse).toBe(3);

    const section = CLEANED_MARK_CHAPTERS[1]?.find((item) => item.title === 'John The Baptizer');
    expect(section?.startVerse).toBe(1);
    expect(section?.endVerse).toBe(8);
  });

  it('keeps Scripture quotes inline and creates one carousel group per verse header', () => {
    const quote = CLEANED_MARK_BY_VERSE['mark_1_0']?.find((entry) => entry.author === 'Colossians 4:10');
    expect(quote?.kind).toBe('quote');
    expect(quote?.authorHandle).toBe('');
    expect(quote?.quoteStyle).toBe('inline');

    const section = CLEANED_MARK_CHAPTERS[1]?.find((item) => item.title === 'John The Baptizer');
    const groups = groupCommentariesByRange(section?.entries ?? []);
    expect(groups.map((group) => [group.startVerse, group.endVerse])).toEqual([
      [1, 1],
      [2, 3],
      [4, 4],
      [5, 5],
      [6, 6],
      [7, 8],
    ]);
  });

  it('integrates Mark into structured sections and verse lookup', () => {
    expect(getStructuredCommentarySections('Mark', 1)).toBe(CLEANED_MARK_CHAPTERS[1]);
    const notes = getAllCommentariesForVerse('Mark', 1, 2);
    expect(notes.length).toBeGreaterThan(0);
    expect(notes[0]?.book).toBe('Mark');
    expect(notes[0]?.startVerse).toBe(2);
    expect(notes[0]?.endVerse).toBe(3);
  });
});
