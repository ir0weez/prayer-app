import { describe, expect, it } from 'vitest';
import { CLEANED_GENESIS_CHAPTERS, CLEANED_GENESIS_BY_VERSE } from './commentary-cleaned-genesis';

describe('cleaned Genesis commentary structure', () => {
  it('keeps the chapter introduction as the first block', () => {
    const sections = CLEANED_GENESIS_CHAPTERS[1];
    expect(sections[0].title).toBe('Introduction');
    expect(sections[0].entries).toHaveLength(5);
    expect(sections[0].entries.every((entry) => entry.isIntroduction)).toBe(true);
  });

  it('keeps subsection titles and source order', () => {
    const sections = CLEANED_GENESIS_CHAPTERS[1];
    expect(sections.slice(1, 4).map((section) => section.title)).toEqual([
      'The Original Creation',
      'The First Day',
      'The Second Day',
    ]);
    expect(sections[1].entries.map((entry) => entry.verseLabel)).toEqual(['1', '1', '1', '1', '1', '1', '1', '2', '2']);
  });

  it('keeps Scripture quotes as separate inline entries', () => {
    const entries = CLEANED_GENESIS_BY_VERSE['genesis_1_1'];
    const quote = entries.find((entry) => entry.kind === 'quote');
    expect(quote).toBeDefined();
    expect(quote?.text).toContain('2 Peter 3:8');
    expect(quote?.quoteStyle).toBe('inline');
    expect(quote?.authorHandle).toBe('');
  });

  it('keeps a verse range as one exact sub-header inside its subsection', () => {
    const entries = CLEANED_GENESIS_BY_VERSE['genesis_1_3'];
    expect(entries.every((entry) => entry.startVerse === 3 && entry.endVerse === 5)).toBe(true);
    expect(entries[0].sectionTitle).toBe('The First Day');
  });
});
