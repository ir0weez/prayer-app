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
