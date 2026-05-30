import { BibleChapter } from './prayercircle-data';

// List of all Bible books in order
export const BIBLE_BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
  'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel',
  'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah',
  'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah',
  'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John',
  'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians',
  'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews',
  'James', '1 Peter', '2 Peter', '1 John', '2 John',
  '3 John', 'Jude', 'Revelation'
];

// Chapter counts for each book
export const CHAPTER_COUNTS: Record<string, number> = {
  'Genesis': 50, 'Exodus': 40, 'Leviticus': 27, 'Numbers': 36, 'Deuteronomy': 34,
  'Joshua': 24, 'Judges': 21, 'Ruth': 4, '1 Samuel': 31, '2 Samuel': 24,
  '1 Kings': 22, '2 Kings': 25, '1 Chronicles': 29, '2 Chronicles': 36, 'Ezra': 10,
  'Nehemiah': 13, 'Esther': 10, 'Job': 42, 'Psalms': 150, 'Proverbs': 31,
  'Ecclesiastes': 12, 'Isaiah': 66, 'Jeremiah': 52, 'Lamentations': 5, 'Ezekiel': 48,
  'Daniel': 12, 'Hosea': 14, 'Joel': 3, 'Amos': 9, 'Obadiah': 1,
  'Jonah': 4, 'Micah': 7, 'Nahum': 3, 'Habakkuk': 3, 'Zephaniah': 3,
  'Haggai': 2, 'Zechariah': 14, 'Malachi': 4,
  'Matthew': 28, 'Mark': 16, 'Luke': 24, 'John': 21,
  'Acts': 28, 'Romans': 16, '1 Corinthians': 16, '2 Corinthians': 13, 'Galatians': 6,
  'Ephesians': 6, 'Philippians': 4, 'Colossians': 4, '1 Thessalonians': 5, '2 Thessalonians': 3,
  '1 Timothy': 6, '2 Timothy': 4, 'Titus': 3, 'Philemon': 1, 'Hebrews': 13,
  'James': 5, '1 Peter': 5, '2 Peter': 3, '1 John': 5, '2 John': 1,
  '3 John': 1, 'Jude': 1, 'Revelation': 22
};

export function getCurrentBibleProgress(chapters: BibleChapter[] | undefined): { book: string; chapter: number; totalChapters: number; progress: number } {
  if (!chapters || chapters.length === 0) {
    return { book: 'Genesis', chapter: 1, totalChapters: 50, progress: 0 };
  }

  // Find the first unread chapter
  for (const chapter of chapters) {
    if (!chapter.isRead) {
      const totalChapters = CHAPTER_COUNTS[chapter.book] || 1;
      const progress = chapters.filter(c => c.isRead).length;
      return { book: chapter.book, chapter: chapter.chapter, totalChapters, progress };
    }
  }

  // All chapters read, return last chapter
  const lastChapter = chapters[chapters.length - 1];
  const totalChapters = CHAPTER_COUNTS[lastChapter.book] || 1;
  const progress = chapters.filter(c => c.isRead).length;
  return { book: lastChapter.book, chapter: lastChapter.chapter, totalChapters, progress };
}

export function markChapterAsRead(chapters: BibleChapter[] | undefined, book: string, chapter: number): BibleChapter[] {
  const updatedChapters = [...(chapters || [])];
  const index = updatedChapters.findIndex(c => c.book === book && c.chapter === chapter);
  
  if (index >= 0) {
    updatedChapters[index] = { ...updatedChapters[index], isRead: true, readDate: new Date().toISOString().split('T')[0] };
  } else {
    updatedChapters.push({ book, chapter, isRead: true, readDate: new Date().toISOString().split('T')[0] });
  }
  
  return updatedChapters;
}


// Get the most recent Bible chapter read from AsyncStorage
export async function getMostRecentBibleChapter(): Promise<string> {
  try {
    const AsyncStorage = await import('@react-native-async-storage/async-storage').then(m => m.default);
    const data = await AsyncStorage.getItem('bibleReadChapters');
    if (!data) {
      return 'Genesis 1';
    }

    const readChapters = JSON.parse(data) as string[];
    if (readChapters.length === 0) {
      return 'Genesis 1';
    }

    // Get the last chapter read (most recent)
    const lastChapterId = readChapters[readChapters.length - 1];
    const [book, chapterStr] = lastChapterId.split('-');
    const chapter = parseInt(chapterStr, 10);

    // Find the next chapter to read
    const bookIndex = BIBLE_BOOKS.indexOf(book);
    const chaptersInBook = CHAPTER_COUNTS[book] || 1;

    if (chapter < chaptersInBook) {
      // Next chapter in same book
      return `${book} ${chapter + 1}`;
    } else if (bookIndex < BIBLE_BOOKS.length - 1) {
      // Next book
      const nextBook = BIBLE_BOOKS[bookIndex + 1];
      return `${nextBook} 1`;
    } else {
      // All chapters read
      return `${book} ${chapter}`;
    }
  } catch (error) {
    console.error('Error getting most recent Bible chapter:', error);
    return 'Genesis 1';
  }
}
