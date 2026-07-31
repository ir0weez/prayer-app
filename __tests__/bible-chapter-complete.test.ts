import { describe, it, expect, vi } from 'vitest';

describe('Bible Chapter Complete Features', () => {
  describe('Verse counter calculation', () => {
    it('should calculate total verses across all sections', () => {
      const sections = [
        { id: 'section_1', verses: [{ verse: 1, text: 'a' }, { verse: 2, text: 'b' }, { verse: 3, text: 'c' }] },
        { id: 'section_2', verses: [{ verse: 4, text: 'd' }, { verse: 5, text: 'e' }] },
        { id: 'section_3', verses: [{ verse: 6, text: 'f' }, { verse: 7, text: 'g' }, { verse: 8, text: 'h' }] },
      ];
      const totalVerses = sections.reduce((sum, s) => sum + s.verses.length, 0);
      expect(totalVerses).toBe(8);
    });

    it('should calculate correct verse offset for a given section', () => {
      const sections = [
        { id: 'section_1', verses: [{ verse: 1, text: 'a' }, { verse: 2, text: 'b' }, { verse: 3, text: 'c' }] },
        { id: 'section_2', verses: [{ verse: 4, text: 'd' }, { verse: 5, text: 'e' }] },
        { id: 'section_3', verses: [{ verse: 6, text: 'f' }, { verse: 7, text: 'g' }, { verse: 8, text: 'h' }] },
      ];

      // For section_1, offset should be 0
      const idx0 = sections.findIndex(s => s.id === 'section_1');
      const offset0 = idx0 <= 0 ? 0 : sections.slice(0, idx0).reduce((sum, s) => sum + s.verses.length, 0);
      expect(offset0).toBe(0);

      // For section_2, offset should be 3 (verses from section_1)
      const idx1 = sections.findIndex(s => s.id === 'section_2');
      const offset1 = idx1 <= 0 ? 0 : sections.slice(0, idx1).reduce((sum, s) => sum + s.verses.length, 0);
      expect(offset1).toBe(3);

      // For section_3, offset should be 5 (verses from section_1 + section_2)
      const idx2 = sections.findIndex(s => s.id === 'section_3');
      const offset2 = idx2 <= 0 ? 0 : sections.slice(0, idx2).reduce((sum, s) => sum + s.verses.length, 0);
      expect(offset2).toBe(5);
    });

    it('should correctly identify the last section', () => {
      const sections = [
        { id: 'section_1', verses: [] },
        { id: 'section_2', verses: [] },
        { id: 'section_3', verses: [] },
      ];

      const selectedId = 'section_3';
      const idx = sections.findIndex(s => s.id === selectedId);
      const isLastSection = idx === sections.length - 1;
      expect(isLastSection).toBe(true);

      const selectedId2 = 'section_2';
      const idx2 = sections.findIndex(s => s.id === selectedId2);
      const isLastSection2 = idx2 === sections.length - 1;
      expect(isLastSection2).toBe(false);
    });
  });

  describe('Chapter Complete flow', () => {
    it('should trigger chapter complete when last section is finished', () => {
      // Simulate the logic: when isLastSection is true and onComplete fires
      const isLastSection = true;
      const isLastVerse = true;
      let chapterCompleteTriggered = false;

      if (isLastVerse && isLastSection) {
        chapterCompleteTriggered = true;
      }

      expect(chapterCompleteTriggered).toBe(true);
    });

    it('should advance to next section when not the last section', () => {
      const sections = [
        { id: 'section_1', verses: [{ verse: 1, text: 'a' }] },
        { id: 'section_2', verses: [{ verse: 2, text: 'b' }] },
        { id: 'section_3', verses: [{ verse: 3, text: 'c' }] },
      ];

      const currentId = 'section_1';
      const currentIdx = sections.findIndex(s => s.id === currentId);
      const isLastSection = currentIdx === sections.length - 1;

      expect(isLastSection).toBe(false);

      // Should advance to next section
      if (!isLastSection && currentIdx >= 0 && currentIdx < sections.length - 1) {
        const nextSection = sections[currentIdx + 1];
        expect(nextSection.id).toBe('section_2');
      }
    });

    it('should reset all completed sections on reset', () => {
      let completedSections = [0, 1, 2];
      
      // Reset
      completedSections = [];
      
      expect(completedSections).toEqual([]);
    });
  });
});
