import AsyncStorage from '@react-native-async-storage/async-storage';
import { bibleEventEmitter } from './bible-events';

export interface BibleHighlight {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  version: 'kjv' | 'csb';
  text: string;
  color: 'yellow' | 'green' | 'pink' | 'blue';
  createdAt: string;
}

const HIGHLIGHTS_KEY = 'prayercircle.bible.highlights.v1';

/**
 * Get all highlights for a specific verse
 */
export async function getVerseHighlights(
  book: string,
  chapter: number,
  verse: number,
  version: 'kjv' | 'csb' = 'kjv'
): Promise<BibleHighlight[]> {
  try {
    const data = await AsyncStorage.getItem(HIGHLIGHTS_KEY);
    if (!data) return [];

    const highlights: BibleHighlight[] = JSON.parse(data);
    return highlights.filter(
      (h) => h.book === book && h.chapter === chapter && h.verse === verse && h.version === version
    );
  } catch (error) {
    console.error('Error getting verse highlights:', error);
    return [];
  }
}

/**
 * Check if a verse is highlighted
 */
export async function isVerseHighlighted(
  book: string,
  chapter: number,
  verse: number,
  version: 'kjv' | 'csb' = 'kjv'
): Promise<boolean> {
  const highlights = await getVerseHighlights(book, chapter, verse, version);
  return highlights.length > 0;
}

/**
 * Add a highlight to a verse
 */
export async function addHighlight(
  book: string,
  chapter: number,
  verse: number,
  text: string,
  version: 'kjv' | 'csb' = 'kjv',
  color: 'yellow' | 'green' | 'pink' | 'blue' = 'yellow'
): Promise<BibleHighlight> {
  try {
    const data = await AsyncStorage.getItem(HIGHLIGHTS_KEY);
    const highlights: BibleHighlight[] = data ? JSON.parse(data) : [];

    const highlight: BibleHighlight = {
      id: `${book}-${chapter}-${verse}-${Date.now()}`,
      book,
      chapter,
      verse,
      version,
      text,
      color,
      createdAt: new Date().toISOString(),
    };

    highlights.push(highlight);
    await AsyncStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(highlights));

    // Emit event for real-time sync
    bibleEventEmitter.emit({
      type: 'highlight-added',
      book,
      chapter,
      verse,
    });

    return highlight;
  } catch (error) {
    console.error('Error adding highlight:', error);
    throw error;
  }
}

/**
 * Remove a highlight from a verse
 */
export async function removeHighlight(
  book: string,
  chapter: number,
  verse: number,
  version: 'kjv' | 'csb' = 'kjv'
): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(HIGHLIGHTS_KEY);
    if (!data) return;

    const highlights: BibleHighlight[] = JSON.parse(data);
    const filtered = highlights.filter(
      (h) => !(h.book === book && h.chapter === chapter && h.verse === verse && h.version === version)
    );

    await AsyncStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(filtered));

    // Emit event for real-time sync
    bibleEventEmitter.emit({
      type: 'highlight-removed',
      book,
      chapter,
      verse,
    });
  } catch (error) {
    console.error('Error removing highlight:', error);
    throw error;
  }
}

/**
 * Get all highlights for a chapter
 */
export async function getChapterHighlights(
  book: string,
  chapter: number,
  version: 'kjv' | 'csb' = 'kjv'
): Promise<BibleHighlight[]> {
  try {
    const data = await AsyncStorage.getItem(HIGHLIGHTS_KEY);
    if (!data) return [];

    const highlights: BibleHighlight[] = JSON.parse(data);
    return highlights.filter((h) => h.book === book && h.chapter === chapter && h.version === version);
  } catch (error) {
    console.error('Error getting chapter highlights:', error);
    return [];
  }
}

/**
 * Get all highlights
 */
export async function getAllHighlights(): Promise<BibleHighlight[]> {
  try {
    const data = await AsyncStorage.getItem(HIGHLIGHTS_KEY);
    if (!data) return [];

    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting all highlights:', error);
    return [];
  }
}
