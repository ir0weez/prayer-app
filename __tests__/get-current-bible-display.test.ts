import { describe, it, expect } from 'vitest';
import { getCurrentBibleDisplay, BIBLE_BOOKS, CHAPTER_COUNTS } from '../lib/bible-unified';

describe('getCurrentBibleDisplay', () => {
  it('should return Lamentations with next unread chapter when Lamentations is current', () => {
    // Create a mock state with Lamentations marked as current
    const mockState = {
      bookStatuses: {
        Genesis: 'not-started',
        Exodus: 'not-started',
        Lamentations: 'current', // Lamentations is marked as current
        '1 Timothy': 'not-started',
        '2 Timothy': 'not-started',
      },
      chapters: [
        // Lamentations has 5 chapters
        { book: 'Lamentations', chapter: 1, isRead: true, readDate: '2026-06-25' },
        { book: 'Lamentations', chapter: 2, isRead: false, readDate: null },
        { book: 'Lamentations', chapter: 3, isRead: false, readDate: null },
        { book: 'Lamentations', chapter: 4, isRead: false, readDate: null },
        { book: 'Lamentations', chapter: 5, isRead: false, readDate: null },
      ],
      lastReadDate: '2026-06-25',
    };

    const result = getCurrentBibleDisplay(mockState as any);
    expect(result).toBe('Lamentations 2');
  });

  it('should return 2 Timothy when 2 Timothy is current', () => {
    const mockState = {
      bookStatuses: {
        Genesis: 'not-started',
        '2 Timothy': 'current', // 2 Timothy is marked as current
        Lamentations: 'not-started',
      },
      chapters: [
        { book: '2 Timothy', chapter: 1, isRead: false, readDate: null },
        { book: '2 Timothy', chapter: 2, isRead: false, readDate: null },
        { book: '2 Timothy', chapter: 3, isRead: false, readDate: null },
        { book: '2 Timothy', chapter: 4, isRead: false, readDate: null },
      ],
      lastReadDate: null,
    };

    const result = getCurrentBibleDisplay(mockState as any);
    expect(result).toBe('2 Timothy 1');
  });

  it('should return empty string when no book is marked as current', () => {
    const mockState = {
      bookStatuses: {
        Genesis: 'not-started',
        Exodus: 'not-started',
      },
      chapters: [],
      lastReadDate: null,
    };

    const result = getCurrentBibleDisplay(mockState as any);
    expect(result).toBe('');
  });
});
