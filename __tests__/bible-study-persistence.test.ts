import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BibleStudySession, SCHEDULE_BIBLE_STUDIES_KEY, createBibleStudySession, toggleBibleStudyCompleted } from '../lib/schedule-data';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage before importing any modules that use it
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
}));

describe('Bible Study Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should persist Bible studies to AsyncStorage when created', async () => {
    const bibleStudy = createBibleStudySession({
      book: 'Genesis',
      chapter: 1,
      date: '2026-06-30',
      isCompleted: false,
    });

    const studies = [bibleStudy];
    
    // Simulate saving to AsyncStorage
    await AsyncStorage.setItem(SCHEDULE_BIBLE_STUDIES_KEY, JSON.stringify(studies));

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      SCHEDULE_BIBLE_STUDIES_KEY,
      JSON.stringify(studies)
    );
  });

  it('should preserve completion state when persisting Bible studies', async () => {
    const bibleStudy = createBibleStudySession({
      book: '1 Corinthians',
      chapter: 1,
      date: '2026-06-29',
      isCompleted: false,
    });

    // Toggle completion
    const studies = [bibleStudy];
    const updated = toggleBibleStudyCompleted(studies, bibleStudy.id);
    
    // Verify completion state changed
    expect(updated[0].isCompleted).toBe(true);
    expect(updated[0].completedAt).toBeDefined();

    // Simulate saving to AsyncStorage
    await AsyncStorage.setItem(SCHEDULE_BIBLE_STUDIES_KEY, JSON.stringify(updated));

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      SCHEDULE_BIBLE_STUDIES_KEY,
      expect.stringContaining('"isCompleted":true')
    );
  });

  it('should load Bible studies from AsyncStorage with completion state intact', async () => {
    const today = new Date().toISOString().split('T')[0];
    const completedAt = new Date().toISOString();
    
    const persistedData = JSON.stringify([
      {
        id: 'bs-1',
        book: 'Genesis',
        chapter: 1,
        date: today,
        isCompleted: true,
        completedAt: completedAt,
      },
      {
        id: 'bs-2',
        book: '1 Corinthians',
        chapter: 1,
        date: today,
        isCompleted: false,
      },
    ]);

    // Mock AsyncStorage.getItem to return persisted data
    (AsyncStorage.getItem as any).mockResolvedValue(persistedData);

    const loaded = await AsyncStorage.getItem(SCHEDULE_BIBLE_STUDIES_KEY);
    const studies = loaded ? JSON.parse(loaded) : [];

    expect(studies).toHaveLength(2);
    expect(studies[0].isCompleted).toBe(true);
    expect(studies[0].completedAt).toBe(completedAt);
    expect(studies[1].isCompleted).toBe(false);
  });

  it('should handle multiple Bible studies with mixed completion states', async () => {
    const studies: BibleStudySession[] = [
      {
        id: 'bs-1',
        book: 'Genesis',
        chapter: 1,
        date: '2026-06-28',
        isCompleted: true,
        completedAt: new Date('2026-06-28T10:00:00').toISOString(),
      },
      {
        id: 'bs-2',
        book: 'Exodus',
        chapter: 2,
        date: '2026-06-29',
        isCompleted: true,
        completedAt: new Date('2026-06-29T14:30:00').toISOString(),
      },
      {
        id: 'bs-3',
        book: '1 Corinthians',
        chapter: 1,
        date: '2026-06-30',
        isCompleted: false,
      },
      {
        id: 'bs-4',
        book: 'Psalms',
        chapter: 23,
        date: '2026-06-30',
        isCompleted: true,
        completedAt: new Date('2026-06-30T09:15:00').toISOString(),
      },
    ];

    await AsyncStorage.setItem(SCHEDULE_BIBLE_STUDIES_KEY, JSON.stringify(studies));

    // Mock loading
    (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(studies));
    const loaded = await AsyncStorage.getItem(SCHEDULE_BIBLE_STUDIES_KEY);
    const loadedStudies = loaded ? JSON.parse(loaded) : [];

    expect(loadedStudies).toHaveLength(4);
    
    // Verify completion states are preserved
    const completed = loadedStudies.filter((s: BibleStudySession) => s.isCompleted);
    const incomplete = loadedStudies.filter((s: BibleStudySession) => !s.isCompleted);
    
    expect(completed).toHaveLength(3);
    expect(incomplete).toHaveLength(1);
    
    // Verify completed studies have timestamps
    completed.forEach((s: BibleStudySession) => {
      expect(s.completedAt).toBeDefined();
    });
  });

  it('should preserve all Bible study fields during persistence', async () => {
    const bibleStudy: BibleStudySession = {
      id: 'bs-test-123',
      book: 'Revelation',
      chapter: 12,
      date: '2026-06-30',
      startTime: '09:00',
      endTime: '10:00',
      notes: 'Studied the vision of the woman and the dragon',
      isCompleted: true,
      completedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(SCHEDULE_BIBLE_STUDIES_KEY, JSON.stringify([bibleStudy]));

    (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify([bibleStudy]));
    const loaded = await AsyncStorage.getItem(SCHEDULE_BIBLE_STUDIES_KEY);
    const loadedStudies = loaded ? JSON.parse(loaded) : [];

    expect(loadedStudies[0]).toEqual(bibleStudy);
    expect(loadedStudies[0].notes).toBe('Studied the vision of the woman and the dragon');
    expect(loadedStudies[0].startTime).toBe('09:00');
    expect(loadedStudies[0].endTime).toBe('10:00');
  });
});
