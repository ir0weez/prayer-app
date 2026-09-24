import { describe, expect, it } from 'vitest';

import { DEFAULT_COMMENTARY, getAllCommentariesForVerse } from './commentary-data';
import { IMPORTED_COMMENTARY } from './commentary-imported';
import { IMPORTED_COMMENTARY_NEW } from './commentary-imported-new';
import { CLEANED_1SAMUEL_BY_VERSE, CLEANED_1SAMUEL_CHAPTERS } from './commentary-cleaned-1samuel';
import { CLEANED_2SAMUEL_BY_VERSE, CLEANED_2SAMUEL_CHAPTERS } from './commentary-cleaned-2samuel';

describe('Deuteronomy 11–20 commentary import', () => {
  it('covers the supplied ten-chapter range with the parsed verse and paragraph totals', () => {
    const importedEntries = Object.entries(DEFAULT_COMMENTARY).filter(([key]) => {
      const match = key.match(/^deuteronomy_(\d+)_(\d+)$/);
      return match !== null && Number(match[1]) >= 11 && Number(match[1]) <= 20;
    });
    const paragraphCount = importedEntries.reduce((total, [, notes]) => total + notes.length, 0);

    expect(importedEntries).toHaveLength(126);
    expect(paragraphCount).toBe(411);
  });

  it('keeps multiple ordered comments available for a referenced verse', () => {
    const notes = getAllCommentariesForVerse('Deuteronomy', 11, 1);

    expect(notes).toHaveLength(3);
    expect(notes[0].author).toBe('Tried By Fire');
    expect(notes[1].text).toContain('Romans 5:8');
  });
});

describe('Deuteronomy 1–10 commentary replacement import', () => {
  it('replaces the full supplied range with the parsed verse and paragraph totals', () => {
    const importedEntries = Object.entries(DEFAULT_COMMENTARY).filter(([key]) => {
      const match = key.match(/^deuteronomy_(\d+)_(\d+)$/);
      return match !== null && Number(match[1]) >= 1 && Number(match[1]) <= 10;
    });
    const paragraphCount = importedEntries.reduce((total, [, notes]) => total + notes.length, 0);

    expect(importedEntries).toHaveLength(143);
    expect(paragraphCount).toBe(384);
  });

  it('preserves separately attributed source comments from the supplied notes', () => {
    const notes = getAllCommentariesForVerse('Deuteronomy', 4, 14);
    expect(notes.length).toBeGreaterThan(0);
    expect(notes.some((note) => note.author === 'Tried By Fire')).toBe(true);
  });
});

describe('Deuteronomy 21–30 commentary import', () => {
  it('covers the supplied ten-chapter range with the parsed verse and paragraph totals', () => {
    const importedEntries = Object.entries(DEFAULT_COMMENTARY).filter(([key]) => {
      const match = key.match(/^deuteronomy_(\d+)_(\d+)$/);
      return match !== null && Number(match[1]) >= 21 && Number(match[1]) <= 30;
    });
    const paragraphCount = importedEntries.reduce((total, [, notes]) => total + notes.length, 0);

    expect(importedEntries).toHaveLength(137);
    expect(paragraphCount).toBe(368);
  });

  it('keeps explicitly attributed author comments attached to the source verse', () => {
    const notes = getAllCommentariesForVerse('Deuteronomy', 29, 4);

    expect(notes.length).toBeGreaterThan(0);
    expect(notes.every((note) => note.author === 'Tried By Fire')).toBe(true);
  });
});

describe('Deuteronomy 31–34 commentary import', () => {
  it('covers the supplied final chapters with the parsed verse and paragraph totals', () => {
    const importedEntries = Object.entries(DEFAULT_COMMENTARY).filter(([key]) => {
      const match = key.match(/^deuteronomy_(\d+)_(\d+)$/);
      return match !== null && Number(match[1]) >= 31 && Number(match[1]) <= 34;
    });
    const paragraphCount = importedEntries.reduce((total, [, notes]) => total + notes.length, 0);

    expect(importedEntries).toHaveLength(66);
    expect(paragraphCount).toBe(181);
  });

  it('keeps multiple comments available for the Deuteronomy 31:8 study note', () => {
    const notes = getAllCommentariesForVerse('Deuteronomy', 31, 8);

    expect(notes).toHaveLength(11);
    expect(notes[0].author).toBe('Tried By Fire');
  });
});

describe('Joshua 1–10 commentary import', () => {
  it('covers the supplied chapters with the parsed verse and paragraph totals', () => {
    const importedEntries = Object.entries(DEFAULT_COMMENTARY).filter(([key]) => {
      const match = key.match(/^joshua_(\d+)_(\d+)$/);
      return match !== null && Number(match[1]) >= 1 && Number(match[1]) <= 10;
    });
    const paragraphCount = importedEntries.reduce((total, [, notes]) => total + notes.length, 0);

    expect(importedEntries).toHaveLength(146);
    expect(paragraphCount).toBe(335);
  });

  it('keeps the multiple Joshua 1:1 commentary notes in order', () => {
    const notes = getAllCommentariesForVerse('Joshua', 1, 1);

    expect(notes).toHaveLength(8);
    expect(notes[0].author).toBe('Tried By Fire');
    expect(notes[0].text).toContain('"Now" states');
  });
});

describe('Joshua 11–20 commentary import', () => {
  it('covers the supplied chapters with the parsed verse and paragraph totals', () => {
    const importedEntries = Object.entries(DEFAULT_COMMENTARY).filter(([key]) => {
      const match = key.match(/^joshua_(\d+)_(\d+)$/);
      return match !== null && Number(match[1]) >= 11 && Number(match[1]) <= 20;
    });
    const paragraphCount = importedEntries.reduce((total, [, notes]) => total + notes.length, 0);

    expect(importedEntries).toHaveLength(195);
    expect(paragraphCount).toBe(390);
  });

  it('keeps the multiple Joshua 11:12 commentary notes in order', () => {
    const notes = getAllCommentariesForVerse('Joshua', 11, 12);

    expect(notes).toHaveLength(7);
    expect(notes[0].author).toBe('Tried By Fire');
    expect(notes[0].text).toContain('"Hazor" means "Castle."');
  });
});

describe('Ruth, 1 Samuel, and 2 Samuel commentary import', () => {
  it('imports every Samuel chapter with the introduction first', () => {
    expect(Object.keys(CLEANED_1SAMUEL_CHAPTERS)).toHaveLength(31);
    expect(Object.keys(CLEANED_2SAMUEL_CHAPTERS)).toHaveLength(24);
    for (const chapters of [CLEANED_1SAMUEL_CHAPTERS, CLEANED_2SAMUEL_CHAPTERS]) {
      for (const sections of Object.values(chapters)) {
        expect(sections[0]?.title).toBe('Introduction');
        expect(sections[0]?.entries.every((entry) => entry.isIntroduction)).toBe(true);
      }
    }
  });

  it('keeps Samuel subsection ranges and source order intact', () => {
    const chapterOne = CLEANED_1SAMUEL_CHAPTERS[1];
    expect(chapterOne.find((section) => section.title === "Hannah's Prayer")).toMatchObject({ startVerse: 1, endVerse: 18 });
    expect(chapterOne.find((section) => section.title === 'The Birth of Samuel')).toMatchObject({ startVerse: 19, endVerse: 23 });
    const notes = CLEANED_2SAMUEL_BY_VERSE['2samuel_1_1'];
    expect(notes[0]?.id).toContain('2samuel_1_1_');
    expect(notes[0]?.text).toContain('It seems that this man went out of his way');
    expect(CLEANED_1SAMUEL_BY_VERSE['1samuel_1_1']?.every((entry) => entry.book === '1 Samuel')).toBe(true);
  });

  it('imports all continuation notes into the verse lookup', () => {
    const importedNotes = Object.values(IMPORTED_COMMENTARY).flat();

    expect(Object.keys(IMPORTED_COMMENTARY)).toHaveLength(989);
    expect(importedNotes).toHaveLength(1619);
    expect(Object.keys(DEFAULT_COMMENTARY)).toEqual(expect.arrayContaining([
      'ruth_1_1',
      'ruth_4_17',
      '1samuel_1_1',
      '1samuel_31_11',
      '2samuel_1_1',
      '2samuel_24_24',
    ]));
  });

  it('preserves note order and verse attribution for the new books', () => {
    const notes = getAllCommentariesForVerse('2 Samuel', 11, 1);

    expect(notes).toHaveLength(1);
    expect(notes[0].id).toContain('2samuel_11_1_');
    expect(notes[0].verse).toBe(1);
    expect(notes[0].author).toBe('Tried By Fire');
  });
});

describe('commentary subsection ranges', () => {
  it('stores both Genesis 1:5 notes under the source Genesis 1:3–5 subsection', () => {
    const notes = getAllCommentariesForVerse('Genesis', 1, 5);

    expect(notes).toHaveLength(2);
    expect(notes.every((note) => note.startVerse === 3 && note.endVerse === 5)).toBe(true);
  });
});

describe('Genesis replacement and new book commentary import', () => {
  it('imports Genesis chapters 1–2 from the replacement source', () => {
    expect(IMPORTED_COMMENTARY_NEW['genesis_1_1']?.length).toBeGreaterThan(0);
    expect(IMPORTED_COMMENTARY_NEW['genesis_2_23']?.length).toBeGreaterThan(0);
    expect(getAllCommentariesForVerse('Genesis', 1, 1)[0].text).toContain('In the beginning');
  });

  it('imports 1 Kings, 2 Kings, and Proverbs into the default lookup', () => {
    expect(IMPORTED_COMMENTARY_NEW['1kings_1_1']?.length).toBeGreaterThan(0);
    expect(IMPORTED_COMMENTARY_NEW['2kings_1_1']?.length).toBeGreaterThan(0);
    expect(IMPORTED_COMMENTARY_NEW['proverbs_1_1']?.length).toBeGreaterThan(0);
    expect(getAllCommentariesForVerse('Proverbs', 31, 31).length).toBeGreaterThan(0);
  });

  it('attaches new notes to their source subsection ranges', () => {
    const notes = getAllCommentariesForVerse('1 Kings', 1, 1);
    expect(notes.every((note) => note.startVerse === 1 && note.endVerse === 4)).toBe(true);
  });
});
