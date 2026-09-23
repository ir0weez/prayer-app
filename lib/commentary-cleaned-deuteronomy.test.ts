import { describe, expect, it } from 'vitest';
import { CLEANED_DEUTERONOMY_BY_VERSE, CLEANED_DEUTERONOMY_CHAPTERS } from './commentary-cleaned-deuteronomy';

describe('cleaned Deuteronomy commentary structure', () => {
  it('keeps each chapter introduction before its subsection blocks', () => {
    const sections = CLEANED_DEUTERONOMY_CHAPTERS[1];
    expect(sections[0].title).toBe('Introduction');
    expect(sections[0].entries.length).toBeGreaterThan(0);
    expect(sections[1].title).toBe('The Command to Leave Horeb');
  });

  it('preserves custom subsection ranges instead of fixed verse chunks', () => {
    const sections = CLEANED_DEUTERONOMY_CHAPTERS[2];
    const journeyThroughMoab = sections.find((section) => section.title === 'Journey Through Moab');
    expect(journeyThroughMoab).toMatchObject({ startVerse: 8, endVerse: 15 });
  });

  it('keeps verse subheaders and source text available by verse', () => {
    const entries = CLEANED_DEUTERONOMY_BY_VERSE['deuteronomy_1_5'];
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((entry) => entry.book === 'Deuteronomy')).toBe(true);
    expect(entries.every((entry) => entry.sectionTitle === 'The Command to Leave Horeb')).toBe(true);
  });
});
