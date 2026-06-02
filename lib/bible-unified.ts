import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Unified Bible Tracking System ────────────────────────────────────────────
// Consolidates bibleReadingProgress + bibleChapters into a single source of truth

export const UNIFIED_BIBLE_KEY = 'prayercircle.bible.unified.v1';
export const BIBLE_BOOK_STATUS_KEY = 'prayercircle.bible.bookstatus.v1';

export type BibleChapterStatus = {
  book: string;
  chapter: number;
  isRead: boolean;
  readDate?: string; // ISO date string
};

export type BibleBookStatus = 'not-started' | 'current' | 'complete';

export type UnifiedBibleState = {
  chapters: BibleChapterStatus[]; // All chapters with read status
  bookStatuses: Record<string, BibleBookStatus>; // Track book-level status
  lastReadDate?: string; // ISO date of last chapter read
};

export const BIBLE_BOOKS = [
  // Old Testament
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
  'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel',
  'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah',
  'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah',
  'Haggai', 'Zechariah', 'Malachi',
  // New Testament
  'Matthew', 'Mark', 'Luke', 'John',
  'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians',
  'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon',
  'Hebrews', 'James', '1 Peter', '2 Peter', '1 John',
  '2 John', '3 John', 'Jude', 'Revelation',
];

export const CHAPTER_COUNTS: Record<string, number> = {
  Genesis: 50, Exodus: 40, Leviticus: 27, Numbers: 36, Deuteronomy: 34,
  Joshua: 24, Judges: 21, Ruth: 4, '1 Samuel': 31, '2 Samuel': 24,
  '1 Kings': 22, '2 Kings': 25, '1 Chronicles': 29, '2 Chronicles': 36, Ezra: 10,
  Nehemiah: 13, Esther: 10, Job: 42, Psalms: 150, Proverbs: 31,
  Ecclesiastes: 12, Isaiah: 66, Jeremiah: 52, Lamentations: 5, Ezekiel: 48,
  Daniel: 12, Hosea: 14, Joel: 3, Amos: 9, Obadiah: 1,
  Jonah: 4, Micah: 7, Nahum: 3, Habakkuk: 3, Zephaniah: 3,
  Haggai: 2, Zechariah: 14, Malachi: 4,
  Matthew: 28, Mark: 16, Luke: 24, John: 21,
  Acts: 28, Romans: 16, '1 Corinthians': 16, '2 Corinthians': 13, Galatians: 6,
  Ephesians: 6, Philippians: 4, Colossians: 4, '1 Thessalonians': 5, '2 Thessalonians': 3,
  '1 Timothy': 6, '2 Timothy': 4, Titus: 3, Philemon: 1,
  Hebrews: 13, James: 5, '1 Peter': 5, '2 Peter': 3, '1 John': 5,
  '2 John': 1, '3 John': 1, Jude: 1, Revelation: 22,
};

// Initialize unified Bible state with all chapters
export async function initializeUnifiedBible(): Promise<UnifiedBibleState> {
  try {
    const existing = await AsyncStorage.getItem(UNIFIED_BIBLE_KEY);
    if (existing) return JSON.parse(existing);
  } catch (e) {
    // Ignore
  }

  // Create new state with all chapters
  const chapters: BibleChapterStatus[] = [];
  const bookStatuses: Record<string, BibleBookStatus> = {};

  for (const book of BIBLE_BOOKS) {
    bookStatuses[book] = 'not-started';
    const chapterCount = CHAPTER_COUNTS[book] || 1;
    for (let ch = 1; ch <= chapterCount; ch++) {
      chapters.push({ book, chapter: ch, isRead: false });
    }
  }

  const state: UnifiedBibleState = { chapters, bookStatuses };
  await saveUnifiedBible(state);
  return state;
}

// Load unified Bible state
export async function loadUnifiedBible(): Promise<UnifiedBibleState> {
  try {
    const data = await AsyncStorage.getItem(UNIFIED_BIBLE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    // Ignore
  }
  return initializeUnifiedBible();
}

// Save unified Bible state
export async function saveUnifiedBible(state: UnifiedBibleState): Promise<void> {
  try {
    await AsyncStorage.setItem(UNIFIED_BIBLE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save unified Bible state:', e);
  }
}

// Mark a chapter as read
export async function markChapterAsRead(book: string, chapter: number): Promise<UnifiedBibleState> {
  const state = await loadUnifiedBible();
  const chapterEntry = state.chapters.find((c) => c.book === book && c.chapter === chapter);
  if (chapterEntry) {
    chapterEntry.isRead = true;
    chapterEntry.readDate = new Date().toISOString().split('T')[0];
    state.lastReadDate = chapterEntry.readDate;
  }

  // Check if entire book is now complete
  const bookChapters = state.chapters.filter((c) => c.book === book);
  if (bookChapters.every((c) => c.isRead)) {
    state.bookStatuses[book] = 'complete';
  } else if (state.bookStatuses[book] === 'not-started') {
    state.bookStatuses[book] = 'current';
  }

  await saveUnifiedBible(state);
  return state;
}

// Get next unread chapter for a book
export function getNextUnreadChapter(state: UnifiedBibleState, book: string): BibleChapterStatus | null {
  const bookChapters = state.chapters.filter((c) => c.book === book && !c.isRead);
  return bookChapters.length > 0 ? bookChapters[0] : null;
}

// Get current book (first one marked as 'current', or first 'not-started')
export function getCurrentBook(state: UnifiedBibleState): string | null {
  const current = Object.entries(state.bookStatuses).find(([_, status]) => status === 'current');
  if (current) return current[0];
  
  const notStarted = Object.entries(state.bookStatuses).find(([_, status]) => status === 'not-started');
  return notStarted ? notStarted[0] : null;
}

// Get display string for current reading (e.g., "Genesis 5")
export function getCurrentBibleDisplay(state: UnifiedBibleState): string {
  const book = getCurrentBook(state);
  if (!book) return 'No book selected';
  
  const nextChapter = getNextUnreadChapter(state, book);
  if (nextChapter) {
    return `${book} ${nextChapter.chapter}`;
  }
  
  // All chapters read, show last chapter
  const lastChapter = state.chapters.filter((c) => c.book === book).pop();
  return lastChapter ? `${book} ${lastChapter.chapter}` : book;
}

// Get progress for a book (e.g., "5 of 50 chapters read")
export function getBookProgress(state: UnifiedBibleState, book: string): { read: number; total: number } {
  const bookChapters = state.chapters.filter((c) => c.book === book);
  const read = bookChapters.filter((c) => c.isRead).length;
  return { read, total: bookChapters.length };
}
