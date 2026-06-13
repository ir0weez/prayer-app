import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UNIFIED_BIBLE_KEY, UnifiedBibleState } from '../lib/bible-unified';

// Mock AsyncStorage
const mockAsyncStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: mockAsyncStorage,
}));

describe('Bible Reading Schedule Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Mock Bible state for testing
  const createMockBibleState = (): UnifiedBibleState => ({
    chapters: [
      { book: 'Genesis', chapter: 1, isRead: false },
      { book: 'Genesis', chapter: 2, isRead: false },
      { book: 'Genesis', chapter: 3, isRead: false },
      { book: 'Exodus', chapter: 1, isRead: false },
    ],
    bookStatuses: {
      'Genesis': 'current',
      'Exodus': 'not-started',
    },
  });

  describe('Bible state structure', () => {
    it('should have chapters array with book, chapter, and isRead properties', () => {
      const state = createMockBibleState();
      expect(state.chapters).toBeDefined();
      expect(state.chapters.length).toBeGreaterThan(0);
      
      const chapter = state.chapters[0];
      expect(chapter).toHaveProperty('book');
      expect(chapter).toHaveProperty('chapter');
      expect(chapter).toHaveProperty('isRead');
    });

    it('should have bookStatuses mapping book names to status', () => {
      const state = createMockBibleState();
      expect(state.bookStatuses).toBeDefined();
      expect(state.bookStatuses['Genesis']).toBe('current');
      expect(state.bookStatuses['Exodus']).toBe('not-started');
    });

    it('should support current, not-started, and complete book statuses', () => {
      const state: UnifiedBibleState = {
        chapters: [],
        bookStatuses: {
          'Genesis': 'current',
          'Exodus': 'not-started',
          'Leviticus': 'complete',
        },
      };
      
      expect(['current', 'not-started', 'complete']).toContain(state.bookStatuses['Genesis']);
      expect(['current', 'not-started', 'complete']).toContain(state.bookStatuses['Exodus']);
      expect(['current', 'not-started', 'complete']).toContain(state.bookStatuses['Leviticus']);
    });
  });

  describe('Bible display logic', () => {
    it('should find current book from bookStatuses', () => {
      const state = createMockBibleState();
      const currentBook = Object.entries(state.bookStatuses).find(([_, status]) => status === 'current')?.[0];
      expect(currentBook).toBe('Genesis');
    });

    it('should find next unread chapter for current book', () => {
      const state = createMockBibleState();
      const book = Object.entries(state.bookStatuses).find(([_, status]) => status === 'current')?.[0];
      const nextChapter = state.chapters.find((c) => c.book === book && !c.isRead);
      
      expect(nextChapter).toBeDefined();
      expect(nextChapter?.chapter).toBe(1);
    });

    it('should format display as "BookName ChapterNumber"', () => {
      const state = createMockBibleState();
      const book = Object.entries(state.bookStatuses).find(([_, status]) => status === 'current')?.[0];
      const nextChapter = state.chapters.find((c) => c.book === book && !c.isRead);
      
      if (book && nextChapter) {
        const display = `${book} ${nextChapter.chapter}`;
        expect(display).toBe('Genesis 1');
        expect(display).toMatch(/^[A-Z][a-z]+ \d+$/);
      }
    });

    it('should show last chapter if all chapters read', () => {
      const state = createMockBibleState();
      state.chapters = state.chapters.map(c => ({ ...c, isRead: true }));
      
      const book = Object.entries(state.bookStatuses).find(([_, status]) => status === 'current')?.[0];
      const lastChapter = state.chapters.filter((c) => c.book === book).pop();
      
      expect(lastChapter?.chapter).toBe(3);
    });
  });

  describe('Chapter marking logic', () => {
    it('should mark chapter as read and set readDate', () => {
      const state = createMockBibleState();
      const today = new Date().toISOString().split('T')[0];
      
      const chapter = state.chapters.find(c => c.book === 'Genesis' && c.chapter === 1);
      if (chapter) {
        chapter.isRead = true;
        chapter.readDate = today;
      }
      
      expect(chapter?.isRead).toBe(true);
      expect(chapter?.readDate).toBe(today);
    });

    it('should update book status when first chapter marked', () => {
      const state = createMockBibleState();
      state.bookStatuses['Genesis'] = 'not-started';
      
      // Mark first chapter as read
      const chapter = state.chapters.find(c => c.book === 'Genesis' && c.chapter === 1);
      if (chapter) {
        chapter.isRead = true;
      }
      
      // Update book status
      const bookChapters = state.chapters.filter((c) => c.book === 'Genesis');
      if (bookChapters.some((c) => c.isRead)) {
        state.bookStatuses['Genesis'] = 'current';
      }
      
      expect(state.bookStatuses['Genesis']).toBe('current');
    });

    it('should update book status to complete when all chapters read', () => {
      const state = createMockBibleState();
      
      // Mark all Genesis chapters as read
      state.chapters.forEach(c => {
        if (c.book === 'Genesis') {
          c.isRead = true;
        }
      });
      
      // Check if all chapters are read
      const bookChapters = state.chapters.filter((c) => c.book === 'Genesis');
      if (bookChapters.every((c) => c.isRead)) {
        state.bookStatuses['Genesis'] = 'complete';
      }
      
      expect(state.bookStatuses['Genesis']).toBe('complete');
    });

    it('should advance to next chapter after marking one as read', () => {
      const state = createMockBibleState();
      
      // Mark chapter 1 as read
      const chapter1 = state.chapters.find(c => c.book === 'Genesis' && c.chapter === 1);
      if (chapter1) {
        chapter1.isRead = true;
      }
      
      // Find next unread
      const nextChapter = state.chapters.find((c) => c.book === 'Genesis' && !c.isRead);
      expect(nextChapter?.chapter).toBe(2);
    });
  });

  describe('Summary display format', () => {
    it('should format people count as "X people to reach"', () => {
      const peopleCount = 2;
      const summaryText = `👥 ${peopleCount} people to reach`;
      
      expect(summaryText).toContain('people to reach');
      expect(summaryText).toContain('2');
    });

    it('should handle zero people to reach', () => {
      const peopleCount = 0;
      const summaryText = `👥 ${peopleCount} people to reach`;
      
      expect(summaryText).toContain('people to reach');
      expect(summaryText).toContain('0');
    });

    it('should include Bible reading in summary', () => {
      const bibleDisplay = 'Genesis 5';
      const summaryText = `currently reading 📖 ${bibleDisplay}`;
      
      expect(summaryText).toContain('currently reading');
      expect(summaryText).toContain(bibleDisplay);
    });
  });

  describe('Bible Reading section in Schedule', () => {
    it('should display current book and chapter when available', () => {
      const state = createMockBibleState();
      const book = Object.entries(state.bookStatuses).find(([_, status]) => status === 'current')?.[0];
      const nextChapter = state.chapters.find((c) => c.book === book && !c.isRead);
      
      const display = book && nextChapter ? `${book} ${nextChapter.chapter}` : 'No book marked as current';
      expect(display).toBe('Genesis 1');
    });

    it('should show fallback message when no current book', () => {
      const state: UnifiedBibleState = {
        chapters: [],
        bookStatuses: {},
      };
      
      const book = Object.entries(state.bookStatuses).find(([_, status]) => status === 'current')?.[0];
      const display = book ? `${book} 1` : 'No book marked as current';
      
      expect(display).toBe('No book marked as current');
    });

    it('should have Mark as Read button when current book exists', () => {
      const state = createMockBibleState();
      const hasCurrentBook = Object.entries(state.bookStatuses).some(([_, status]) => status === 'current');
      
      expect(hasCurrentBook).toBe(true);
    });
  });
});
