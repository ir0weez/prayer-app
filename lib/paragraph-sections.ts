/**
 * Paragraph-based section parser for Bible chapters
 * Groups verses into paragraphs (sections) for the Stories bar
 */

export interface ParagraphSection {
  id: string;
  title: string;
  startVerse: number;
  endVerse: number;
  verses: Array<{ verse: number; text: string }>;
}

/**
 * Create default paragraph sections by grouping verses
 * Uses DETERMINISTIC grouping: 3 verses per section (no randomness)
 * This ensures verse counts stay consistent across app refreshes
 */
export function createDefaultParagraphs(
  verses: Array<{ verse: number; text: string }>
): ParagraphSection[] {
  if (verses.length === 0) return [];

  const sections: ParagraphSection[] = [];
  const VERSES_PER_SECTION = 3; // Fixed: deterministic grouping

  for (let i = 0; i < verses.length; i += VERSES_PER_SECTION) {
    const sectionVerses = verses.slice(i, i + VERSES_PER_SECTION);
    if (sectionVerses.length === 0) break;

    const sectionStart = sectionVerses[0].verse;
    const sectionEnd = sectionVerses[sectionVerses.length - 1].verse;
    const sectionId = `para-${sectionStart}-${sectionEnd}`;
    const title = `Verses ${sectionStart}-${sectionEnd}`;

    sections.push({
      id: sectionId,
      title,
      startVerse: sectionStart,
      endVerse: sectionEnd,
      verses: sectionVerses,
    });
  }

  return sections;
}

/**
 * Parse custom paragraph definitions from user input
 * Format: "1-3, 4-7, 8-12" or "1:3, 4:7, 8:12"
 */
export function parseCustomParagraphs(
  input: string,
  verses: Array<{ verse: number; text: string }>
): ParagraphSection[] {
  const sections: ParagraphSection[] = [];
  
  try {
    // Split by comma and parse each range
    const ranges = input.split(',').map(r => r.trim());
    
    for (const range of ranges) {
      // Support both "1-3" and "1:3" formats
      const match = range.match(/(\d+)[-:](\d+)/);
      if (!match) continue;

      const startVerse = parseInt(match[1]);
      const endVerse = parseInt(match[2]);

      // Get verses in this range
      const rangeVerses = verses.filter(v => v.verse >= startVerse && v.verse <= endVerse);
      
      if (rangeVerses.length === 0) continue;

      const sectionId = `para-${startVerse}-${endVerse}`;
      const title = `Verses ${startVerse}-${endVerse}`;

      sections.push({
        id: sectionId,
        title,
        startVerse,
        endVerse,
        verses: rangeVerses,
      });
    }

    return sections.length > 0 ? sections : createDefaultParagraphs(verses);
  } catch (err) {
    console.error('Error parsing custom paragraphs:', err);
    return createDefaultParagraphs(verses);
  }
}

/**
 * Load custom paragraph definitions from AsyncStorage
 */
export async function loadCustomParagraphs(
  book: string,
  chapter: number
): Promise<string | null> {
  try {
    const AsyncStorage = await import('@react-native-async-storage/async-storage').then(m => m.default);
    const key = `custom-paragraphs-${book}-${chapter}`;
    return await AsyncStorage.getItem(key);
  } catch (err) {
    console.error('Error loading custom paragraphs:', err);
    return null;
  }
}

/**
 * Save custom paragraph definitions to AsyncStorage
 */
export async function saveCustomParagraphs(
  book: string,
  chapter: number,
  definitions: string
): Promise<void> {
  try {
    const AsyncStorage = await import('@react-native-async-storage/async-storage').then(m => m.default);
    const key = `custom-paragraphs-${book}-${chapter}`;
    await AsyncStorage.setItem(key, definitions);
  } catch (err) {
    console.error('Error saving custom paragraphs:', err);
  }
}

/**
 * Get completion key for a section
 */
export function getSectionCompletionKey(book: string, chapter: number, sectionId: string): string {
  return `section-complete-${book}-${chapter}-${sectionId}`;
}

/**
 * Load completed sections from AsyncStorage
 */
export async function loadCompletedSections(
  book: string,
  chapter: number
): Promise<Set<string>> {
  try {
    const AsyncStorage = await import('@react-native-async-storage/async-storage').then(m => m.default);
    const key = `completed-sections-${book}-${chapter}`;
    const data = await AsyncStorage.getItem(key);
    return data ? new Set(JSON.parse(data)) : new Set();
  } catch (err) {
    console.error('Error loading completed sections:', err);
    return new Set();
  }
}

/**
 * Save completed sections to AsyncStorage
 */
export async function saveCompletedSections(
  book: string,
  chapter: number,
  completedIds: Set<string>
): Promise<void> {
  try {
    const AsyncStorage = await import('@react-native-async-storage/async-storage').then(m => m.default);
    const key = `completed-sections-${book}-${chapter}`;
    await AsyncStorage.setItem(key, JSON.stringify(Array.from(completedIds)));
  } catch (err) {
    console.error('Error saving completed sections:', err);
  }
}

/**
 * Mark a section as complete and move it to the end
 */
export async function markSectionComplete(
  book: string,
  chapter: number,
  sectionId: string
): Promise<void> {
  try {
    const completed = await loadCompletedSections(book, chapter);
    completed.add(sectionId);
    await saveCompletedSections(book, chapter, completed);
  } catch (err) {
    console.error('Error marking section complete:', err);
  }
}
