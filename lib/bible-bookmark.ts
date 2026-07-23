/**
 * Bible bookmark management for tracking last read verse
 */

export interface BibleBookmark {
  book: string;
  chapter: number;
  verse: number;
  version: 'kjv' | 'csb';
  timestamp: number;
}

const BOOKMARK_STORAGE_KEY = 'bible_bookmark';

/**
 * Save a bookmark for the last read verse
 */
export async function saveBookmark(
  book: string,
  chapter: number,
  verse: number,
  version: 'kjv' | 'csb'
): Promise<void> {
  try {
    const AsyncStorage = await import('@react-native-async-storage/async-storage').then(m => m.default);
    const bookmark: BibleBookmark = {
      book,
      chapter,
      verse,
      version,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(bookmark));
  } catch (err) {
    console.error('Error saving Bible bookmark:', err);
  }
}

/**
 * Load the saved bookmark
 */
export async function loadBookmark(): Promise<BibleBookmark | null> {
  try {
    const AsyncStorage = await import('@react-native-async-storage/async-storage').then(m => m.default);
    const saved = await AsyncStorage.getItem(BOOKMARK_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    return null;
  } catch (err) {
    console.error('Error loading Bible bookmark:', err);
    return null;
  }
}

/**
 * Clear the bookmark
 */
export async function clearBookmark(): Promise<void> {
  try {
    const AsyncStorage = await import('@react-native-async-storage/async-storage').then(m => m.default);
    await AsyncStorage.removeItem(BOOKMARK_STORAGE_KEY);
  } catch (err) {
    console.error('Error clearing Bible bookmark:', err);
  }
}
