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
 * Default: 3-4 verses per paragraph, adjusted for natural breaks
 */
export function createDefaultParagraphs(
  verses: Array<{ verse: number; text: string }>
): ParagraphSection[] {
  if (verses.length === 0) return [];

  const sections: ParagraphSection[] = [];
  let currentSection: Array<{ verse: number; text: string }> = [];
  let sectionStart = verses[0].verse;

  // Group verses into paragraphs (3-4 verses per paragraph)
  for (let i = 0; i < verses.length; i++) {
    const verse = verses[i];
    currentSection.push(verse);

    // Start new section after 3-4 verses, or at the end
    const shouldBreak = currentSection.length >= 3 && (i === verses.length - 1 || Math.random() > 0.6);
    const isLastVerse = i === verses.length - 1;

    if (shouldBreak || isLastVerse) {
      const sectionEnd = verse.verse;
      const sectionId = `para-${sectionStart}-${sectionEnd}`;
      
      // Create a title based on verse range and first few words
      const firstText = currentSection[0].text.substring(0, 30);
      const title = `Verses ${sectionStart}-${sectionEnd}`;

      sections.push({
        id: sectionId,
        title,
        startVerse: sectionStart,
        endVerse: sectionEnd,
        verses: [...currentSection],
      });

      currentSection = [];
      if (i < verses.length - 1) {
        sectionStart = verses[i + 1].verse;
      }
    }
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
