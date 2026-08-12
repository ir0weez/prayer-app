import { describe, expect, it } from 'vitest';

import { DEFAULT_COMMENTARY, getAllCommentariesForVerse } from './commentary-data';

describe('Deuteronomy 11–20 commentary import', () => {
  it('covers the supplied ten-chapter range with the parsed verse and paragraph totals', () => {
    const importedEntries = Object.entries(DEFAULT_COMMENTARY).filter(([key]) => {
      const match = key.match(/^deuteronomy_(\d+)_(\d+)$/);
      return match !== null && Number(match[1]) >= 11 && Number(match[1]) <= 20;
    });
    const paragraphCount = importedEntries.reduce((total, [, notes]) => total + notes.length, 0);

    expect(importedEntries).toHaveLength(116);
    expect(paragraphCount).toBe(346);
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

    expect(importedEntries).toHaveLength(133);
    expect(paragraphCount).toBe(315);
  });

  it('preserves separately attributed source comments from the supplied notes', () => {
    const notes = getAllCommentariesForVerse('Deuteronomy', 4, 14);
    const authors = notes.map((note) => note.author);

    expect(authors).toContain('Dwight Moody');
    expect(authors).toContain('Martin Luther');
  });
});

describe('Deuteronomy 21–30 commentary import', () => {
  it('covers the supplied ten-chapter range with the parsed verse and paragraph totals', () => {
    const importedEntries = Object.entries(DEFAULT_COMMENTARY).filter(([key]) => {
      const match = key.match(/^deuteronomy_(\d+)_(\d+)$/);
      return match !== null && Number(match[1]) >= 21 && Number(match[1]) <= 30;
    });
    const paragraphCount = importedEntries.reduce((total, [, notes]) => total + notes.length, 0);

    expect(importedEntries).toHaveLength(124);
    expect(paragraphCount).toBe(320);
  });

  it('keeps explicitly attributed author comments attached to the source verse', () => {
    const notes = getAllCommentariesForVerse('Deuteronomy', 29, 4);

    expect(notes.some((note) => note.author === 'D.L. Moody')).toBe(true);
  });
});

describe('Deuteronomy 31–34 commentary import', () => {
  it('covers the supplied final chapters with the parsed verse and paragraph totals', () => {
    const importedEntries = Object.entries(DEFAULT_COMMENTARY).filter(([key]) => {
      const match = key.match(/^deuteronomy_(\d+)_(\d+)$/);
      return match !== null && Number(match[1]) >= 31 && Number(match[1]) <= 34;
    });
    const paragraphCount = importedEntries.reduce((total, [, notes]) => total + notes.length, 0);

    expect(importedEntries).toHaveLength(62);
    expect(paragraphCount).toBe(137);
  });

  it('keeps multiple comments available for the Deuteronomy 31:8 study note', () => {
    const notes = getAllCommentariesForVerse('Deuteronomy', 31, 8);

    expect(notes).toHaveLength(6);
    expect(notes[0].author).toBe('Tried By Fire');
  });
});
