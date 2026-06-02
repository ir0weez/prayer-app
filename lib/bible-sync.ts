import AsyncStorage from '@react-native-async-storage/async-storage';
import { UnifiedBibleState } from './bible-unified';

// Sync unified Bible state to old bibleReadingProgress system (used by app/bible-chapters.tsx)
export async function syncToOldBibleReadingProgress(state: UnifiedBibleState): Promise<void> {
  try {
    const readChapterIds = state.chapters
      .filter((c) => c.isRead)
      .map((c) => `${c.book}-${c.chapter}`);
    await AsyncStorage.setItem('bibleReadingProgress', JSON.stringify(readChapterIds));
  } catch (e) {
    console.error('Failed to sync to bibleReadingProgress:', e);
  }
}

// Sync unified Bible state to old bibleBookStatus system (used by app/bible-chapters.tsx)
export async function syncToOldBibleBookStatus(state: UnifiedBibleState): Promise<void> {
  try {
    await AsyncStorage.setItem('bibleBookStatus', JSON.stringify(state.bookStatuses));
  } catch (e) {
    console.error('Failed to sync to bibleBookStatus:', e);
  }
}

// Sync unified Bible state to old bibleChapters system (used by app/bible-tracker.tsx)
export async function syncToOldBibleChapters(state: UnifiedBibleState): Promise<void> {
  try {
    const chapters = state.chapters.map((c) => ({
      book: c.book,
      chapter: c.chapter,
      isRead: c.isRead,
      readDate: c.readDate,
    }));
    await AsyncStorage.setItem('bibleChapters', JSON.stringify(chapters));
  } catch (e) {
    console.error('Failed to sync to bibleChapters:', e);
  }
}

// Sync unified Bible state to all old systems
export async function syncUnifiedBibleToAllOldSystems(state: UnifiedBibleState): Promise<void> {
  await Promise.all([
    syncToOldBibleReadingProgress(state),
    syncToOldBibleBookStatus(state),
    syncToOldBibleChapters(state),
  ]);
}
