import { describe, expect, it } from 'vitest';
import { CLEANED_1KINGS_BY_VERSE, CLEANED_1KINGS_CHAPTERS } from './commentary-cleaned-1kings';
import { CLEANED_2KINGS_BY_VERSE, CLEANED_2KINGS_CHAPTERS } from './commentary-cleaned-2kings';
import { getAllCommentariesForVerse, getStructuredCommentarySections } from './commentary-data';

const entryCount = (book: Record<string, { length: number }>) =>
  Object.values(book).reduce((total, entries) => total + entries.length, 0);

const sectionCount = (chapters: Record<number, unknown[]>) =>
  Object.values(chapters).reduce((total, sections) => total + sections.length, 0);

describe('cleaned 1–2 Kings commentary', () => {
  it('imports complete chapter coverage and exact literal totals', () => {
    expect(Object.keys(CLEANED_1KINGS_CHAPTERS)).toHaveLength(22);
    expect(Object.keys(CLEANED_2KINGS_CHAPTERS)).toHaveLength(25);
    expect(sectionCount(CLEANED_1KINGS_CHAPTERS)).toBe(169);
    expect(sectionCount(CLEANED_2KINGS_CHAPTERS)).toBe(170);
    expect(entryCount(CLEANED_1KINGS_BY_VERSE)).toBe(882);
    expect(entryCount(CLEANED_2KINGS_BY_VERSE)).toBe(790);
  });

  it('preserves chapter introductions before verse sections', () => {
    for (const chapters of [CLEANED_1KINGS_CHAPTERS, CLEANED_2KINGS_CHAPTERS]) {
      for (const sections of Object.values(chapters)) {
        expect(sections[0]?.title).toBe('Introduction');
        expect(sections[0]?.entries.every((entry) => entry.isIntroduction)).toBe(true);
      }
    }
  });

  it('preserves 1 Kings source order and subsection ranges', () => {
    const chapterOne = CLEANED_1KINGS_CHAPTERS[1];
    expect(chapterOne?.map((section) => section.title)).toEqual([
      'Introduction',
      'The Heat of David',
      'Adonijah Chases the Throne',
      'Solomon Should Be King',
      'Bathsheba Speaks to David',
      'Nathan Confirms',
      'The Promise of Solomon',
      'A Proclomation of the Throne',
      'Solomon Made King',
      'The News Comes to Adonijah',
      'Adonijah Bends',
    ]);
    const firstNote = CLEANED_1KINGS_BY_VERSE['1kings_1_1']?.[0];
    expect(firstNote?.startVerse).toBe(1);
    expect(firstNote?.endVerse).toBe(4);
    expect(firstNote?.text).toContain("David is so old at this point");
    const groupedRange = CLEANED_1KINGS_BY_VERSE['1kings_1_2']?.[0];
    expect(groupedRange?.startVerse).toBe(1);
    expect(groupedRange?.endVerse).toBe(4);
  });

  it('preserves 2 Kings source order and the book transition', () => {
    const firstNote = CLEANED_2KINGS_BY_VERSE['2kings_1_1']?.[0];
    expect(firstNote?.book).toBe('2 Kings');
    expect(firstNote?.id).toContain('2kings_1_1_');
    expect(firstNote?.text).toContain('Moab and Israel');
    expect(CLEANED_2KINGS_CHAPTERS[1]?.[1]).toMatchObject({
      title: 'Moab Rebels',
      startVerse: 1,
      endVerse: 2,
    });
  });

  it('integrates both books into structured sections and range-aware lookup', () => {
    expect(getStructuredCommentarySections('1 Kings', 1)).toBe(CLEANED_1KINGS_CHAPTERS[1]);
    expect(getStructuredCommentarySections('2 Kings', 25)).toBe(CLEANED_2KINGS_CHAPTERS[25]);
    const notes = getAllCommentariesForVerse('2 Kings', 1, 2);
    expect(notes[0]?.book).toBe('2 Kings');
    expect(notes[0]?.startVerse).toBe(1);
    expect(notes[0]?.endVerse).toBe(2);
  });
});
