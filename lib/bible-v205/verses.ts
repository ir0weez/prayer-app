// ─── v205 verse text — KJV ───────────────────────────────────────────────────
// First source: the KJV text embedded in his own commentary txt (the
// prose-format books carry every verse they comment on). Everything else
// comes from the app's existing KJV path — the same API.Bible KJV edition
// BibleChapterViewer has always used — cached on device after first read.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { BOOK_IDS } from '../book-ids';
import { getChapterData } from './index';

export interface VerseText {
  verse: number;
  text: string;
}

const KJV_BIBLE_ID = 'de4e12af7f28f599-02';
const cacheKey = (book: string, chapter: number) => `prayercircle.bible.v205.verses.${book}.${chapter}`;

/** Verses carried inside his txt for this chapter, if it is a prose book. */
export function embeddedVerses(book: string, chapter: number): VerseText[] | null {
  const data = getChapterData(book, chapter);
  if (!data?.verses) return null;
  const verses = Object.entries(data.verses)
    .map(([n, text]) => ({ verse: parseInt(n, 10), text }))
    .sort((a, b) => a.verse - b.verse);
  return verses.length ? verses : null;
}

export function parseApiVerses(passageText: string): VerseText[] {
  const versePattern = /\[(\d+)\]\s+(.+?)(?=\[\d+\]|$)/gs;
  const parsed: VerseText[] = [];
  let match: RegExpExecArray | null;
  while ((match = versePattern.exec(passageText)) !== null) {
    const text = match[2]
      .trim()
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/ /g, ' ');
    if (text.length > 0) parsed.push({ verse: parseInt(match[1], 10), text });
  }
  return parsed;
}

export async function loadChapterVerses(book: string, chapter: number): Promise<VerseText[]> {
  const embedded = embeddedVerses(book, chapter);
  if (embedded) return embedded;

  try {
    const cached = await AsyncStorage.getItem(cacheKey(book, chapter));
    if (cached) {
      const parsed = JSON.parse(cached) as VerseText[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    // Cache is a convenience only.
  }

  const apiKey = process.env.EXPO_PUBLIC_APIBIBLE_KEY;
  if (!apiKey) throw new Error('API.Bible key not configured');
  const bookId = BOOK_IDS[book];
  if (!bookId) throw new Error(`Book "${book}" not found`);
  const response = await fetch(
    `https://api.scripture.api.bible/v1/bibles/${KJV_BIBLE_ID}/chapters/${bookId}.${chapter}?content-type=text&include-notes=false`,
    { headers: { 'api-key': apiKey } },
  );
  if (!response.ok) throw new Error(`Failed to load ${book} ${chapter}`);
  const data = await response.json();
  const content = data?.data?.content;
  if (!content) throw new Error('No passages found in response');
  const verses = parseApiVerses(content);
  if (!verses.length) throw new Error('No verses found in passage');
  try {
    await AsyncStorage.setItem(cacheKey(book, chapter), JSON.stringify(verses));
  } catch {
    // Non-fatal.
  }
  return verses;
}
