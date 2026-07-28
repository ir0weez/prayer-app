/**
 * Paragraph-based section parser for Bible chapters
 * Groups verses into paragraphs (sections) for the Stories bar
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ParagraphSection {
  id: string;
  title: string;
  startVerse: number;
  endVerse: number;
  verses: Array<{ verse: number; text: string }>;
}

const COMPLETED_SECTIONS_KEY = 'prayer_circle_completed_sections';

/**
 * Get the storage key for a section completion status
 */
export function getSectionCompletionKey(book: string, chapter: number, sectionId: string): string {
  return `${book.toLowerCase().replace(/\s+/g, '_')}_${chapter}_${sectionId}`;
}

/**
 * Load completed sections from storage
 */
export async function loadCompletedSections(): Promise<Set<string>> {
  try {
    const stored = await AsyncStorage.getItem(COMPLETED_SECTIONS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch (error) {
    console.error('Error loading completed sections:', error);
    return new Set();
  }
}

/**
 * Mark a section as complete
 */
export async function markSectionComplete(book: string, chapter: number, sectionId: string): Promise<void> {
  try {
    const completed = await loadCompletedSections();
    const key = getSectionCompletionKey(book, chapter, sectionId);
    completed.add(key);
    await AsyncStorage.setItem(COMPLETED_SECTIONS_KEY, JSON.stringify(Array.from(completed)));
  } catch (error) {
    console.error('Error marking section complete:', error);
  }
}

/**
 * Create default paragraph sections by grouping verses
 * Uses custom grouping for Genesis 1, deterministic for others
 */
export function createDefaultParagraphs(
  verses: Array<{ verse: number; text: string }>,
  book?: string,
  chapter?: number
): ParagraphSection[] {
  if (verses.length === 0) return [];

  // Custom grouping for Genesis 1
  if (book === 'Genesis' && chapter === 1) {
    const customGroups = [
      [1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [9, 10, 11, 12, 13],
      [14, 15, 16, 17, 18, 19],
      [20, 21, 22, 23],
      [24, 25, 26, 27],
      [28, 29, 30, 31],
    ];

    const sections: ParagraphSection[] = [];
    for (const verseNumbers of customGroups) {
      const sectionVerses = verses.filter(v => verseNumbers.includes(v.verse));
      if (sectionVerses.length === 0) continue;

      const sectionStart = verseNumbers[0];
      const sectionEnd = verseNumbers[verseNumbers.length - 1];
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

  // Custom grouping for Genesis 4
  if (book === 'Genesis' && chapter === 4) {
    const customGroups = [
      [1, 2, 3, 4, 5],
      [6, 7],
      [8, 9, 10, 11, 12, 13, 14, 15],
      [16, 17, 18, 19, 20, 21, 22, 23, 24],
      [25, 26],
    ];

    const sections: ParagraphSection[] = [];
    for (const verseNumbers of customGroups) {
      const sectionVerses = verses.filter(v => verseNumbers.includes(v.verse));
      if (sectionVerses.length === 0) continue;

      const sectionStart = verseNumbers[0];
      const sectionEnd = verseNumbers[verseNumbers.length - 1];
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

  // Custom grouping for Genesis 5
  if (book === 'Genesis' && chapter === 5) {
    const customGroups = [
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32],
    ];

    const sections: ParagraphSection[] = [];
    for (const verseNumbers of customGroups) {
      const sectionVerses = verses.filter(v => verseNumbers.includes(v.verse));
      if (sectionVerses.length === 0) continue;

      const sectionStart = verseNumbers[0];
      const sectionEnd = verseNumbers[verseNumbers.length - 1];
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

  // Custom grouping for Genesis 6
  if (book === 'Genesis' && chapter === 6) {
    const customGroups = [
      [1, 2, 3, 4, 5, 6, 7, 8],
      [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
    ];

    const sections: ParagraphSection[] = [];
    for (const verseNumbers of customGroups) {
      const sectionVerses = verses.filter(v => verseNumbers.includes(v.verse));
      if (sectionVerses.length === 0) continue;

      const sectionStart = verseNumbers[0];
      const sectionEnd = verseNumbers[verseNumbers.length - 1];
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

  // Custom grouping for Genesis 7
  if (book === 'Genesis' && chapter === 7) {
    const customGroups = [
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
    ];

    const sections: ParagraphSection[] = [];
    for (const verseNumbers of customGroups) {
      const sectionVerses = verses.filter(v => verseNumbers.includes(v.verse));
      if (sectionVerses.length === 0) continue;

      const sectionStart = verseNumbers[0];
      const sectionEnd = verseNumbers[verseNumbers.length - 1];
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

  // Custom grouping for Genesis 8
  if (book === 'Genesis' && chapter === 8) {
    const customGroups = [
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      [13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
    ];

    const sections: ParagraphSection[] = [];
    for (const verseNumbers of customGroups) {
      const sectionVerses = verses.filter(v => verseNumbers.includes(v.verse));
      if (sectionVerses.length === 0) continue;

      const sectionStart = verseNumbers[0];
      const sectionEnd = verseNumbers[verseNumbers.length - 1];
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

  // Custom grouping for Genesis 9
  if (book === 'Genesis' && chapter === 9) {
    const customGroups = [
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
    ];

    const sections: ParagraphSection[] = [];
    for (const verseNumbers of customGroups) {
      const sectionVerses = verses.filter(v => verseNumbers.includes(v.verse));
      if (sectionVerses.length === 0) continue;

      const sectionStart = verseNumbers[0];
      const sectionEnd = verseNumbers[verseNumbers.length - 1];
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

  // Custom grouping for Genesis 10
  if (book === 'Genesis' && chapter === 10) {
    const customGroups = [
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
      [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32],
    ];

    const sections: ParagraphSection[] = [];
    for (const verseNumbers of customGroups) {
      const sectionVerses = verses.filter(v => verseNumbers.includes(v.verse));
      if (sectionVerses.length === 0) continue;

      const sectionStart = verseNumbers[0];
      const sectionEnd = verseNumbers[verseNumbers.length - 1];
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

  // Custom grouping for Genesis 11
  if (book === 'Genesis' && chapter === 11) {
    const customGroups = [
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
      [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32],
    ];

    const sections: ParagraphSection[] = [];
    for (const verseNumbers of customGroups) {
      const sectionVerses = verses.filter(v => verseNumbers.includes(v.verse));
      if (sectionVerses.length === 0) continue;

      const sectionStart = verseNumbers[0];
      const sectionEnd = verseNumbers[verseNumbers.length - 1];
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

  // Custom grouping for Genesis 12
  if (book === 'Genesis' && chapter === 12) {
    const customGroups = [
      [1, 2, 3],
      [4, 5, 6, 7, 8, 9],
      [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    ];

    const sections: ParagraphSection[] = [];
    for (const verseNumbers of customGroups) {
      const sectionVerses = verses.filter(v => verseNumbers.includes(v.verse));
      if (sectionVerses.length === 0) continue;

      const sectionStart = verseNumbers[0];
      const sectionEnd = verseNumbers[verseNumbers.length - 1];
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

  // Custom grouping for Genesis 13
  if (book === 'Genesis' && chapter === 13) {
    const customGroups = [
      [1, 2, 3, 4],
      [5, 6, 7, 8, 9, 10, 11, 12, 13],
      [14, 15, 16, 17, 18],
    ];

    const sections: ParagraphSection[] = [];
    for (const verseNumbers of customGroups) {
      const sectionVerses = verses.filter(v => verseNumbers.includes(v.verse));
      if (sectionVerses.length === 0) continue;

      const sectionStart = verseNumbers[0];
      const sectionEnd = verseNumbers[verseNumbers.length - 1];
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

  // Custom grouping for Genesis 14
  if (book === 'Genesis' && chapter === 14) {
    const customGroups = [
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      [13, 14, 15, 16],
      [17, 18, 19, 20, 21, 22, 23, 24],
    ];

    const sections: ParagraphSection[] = [];
    for (const verseNumbers of customGroups) {
      const sectionVerses = verses.filter(v => verseNumbers.includes(v.verse));
      if (sectionVerses.length === 0) continue;

      const sectionStart = verseNumbers[0];
      const sectionEnd = verseNumbers[verseNumbers.length - 1];
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

  // Custom grouping for Genesis 15
  if (book === 'Genesis' && chapter === 15) {
    const customGroups = [
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      [12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
    ];

    const sections: ParagraphSection[] = [];
    for (const verseNumbers of customGroups) {
      const sectionVerses = verses.filter(v => verseNumbers.includes(v.verse));
      if (sectionVerses.length === 0) continue;

      const sectionStart = verseNumbers[0];
      const sectionEnd = verseNumbers[verseNumbers.length - 1];
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

  // Custom grouping for Genesis 16
  if (book === 'Genesis' && chapter === 16) {
    const customGroups = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9, 10, 11, 12, 13, 14],
      [15, 16],
    ];

    const sections: ParagraphSection[] = [];
    for (const verseNumbers of customGroups) {
      const sectionVerses = verses.filter(v => verseNumbers.includes(v.verse));
      if (sectionVerses.length === 0) continue;

      const sectionStart = verseNumbers[0];
      const sectionEnd = verseNumbers[verseNumbers.length - 1];
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

  // Custom grouping for Genesis 17
  if (book === 'Genesis' && chapter === 17) {
    const customGroups = [
      [1, 2, 3, 4, 5, 6, 7, 8],
      [9, 10, 11, 12, 13, 14],
      [15, 16, 17, 18, 19, 20, 21, 22],
      [23, 24, 25, 26, 27],
    ];

    const sections: ParagraphSection[] = [];
    for (const verseNumbers of customGroups) {
      const sectionVerses = verses.filter(v => verseNumbers.includes(v.verse));
      if (sectionVerses.length === 0) continue;

      const sectionStart = verseNumbers[0];
      const sectionEnd = verseNumbers[verseNumbers.length - 1];
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

  // Custom grouping for Genesis 18
  if (book === 'Genesis' && chapter === 18) {
    const customGroups = [
      [1, 2, 3, 4, 5, 6, 7, 8],
      [9, 10, 11, 12, 13, 14, 15],
      [16, 17, 18, 19, 20, 21, 22],
      [23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33],
    ];

    const sections: ParagraphSection[] = [];
    for (const verseNumbers of customGroups) {
      const sectionVerses = verses.filter(v => verseNumbers.includes(v.verse));
      if (sectionVerses.length === 0) continue;

      const sectionStart = verseNumbers[0];
      const sectionEnd = verseNumbers[verseNumbers.length - 1];
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

  // Custom grouping for Genesis 19
  if (book === 'Genesis' && chapter === 19) {
    const customGroups = [
      [1, 2, 3],
      [4, 5, 6, 7, 8, 9, 10, 11],
      [12, 13, 14],
      [15, 16],
      [17, 18, 19, 20, 21, 22],
      [23, 24, 25, 26, 27, 28],
      [29, 30, 31, 32, 33, 34, 35, 36, 37, 38],
    ];

    const sections: ParagraphSection[] = [];
    for (const verseNumbers of customGroups) {
      const sectionVerses = verses.filter(v => verseNumbers.includes(v.verse));
      if (sectionVerses.length === 0) continue;

      const sectionStart = verseNumbers[0];
      const sectionEnd = verseNumbers[verseNumbers.length - 1];
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

  // Custom grouping for Genesis 20
  if (book === 'Genesis' && chapter === 20) {
    const customGroups = [
      [1, 2, 3, 4, 5, 6, 7],
      [8, 9, 10, 11, 12, 13, 14, 15, 16],
      [17, 18],
    ];

    const sections: ParagraphSection[] = [];
    for (const verseNumbers of customGroups) {
      const sectionVerses = verses.filter(v => verseNumbers.includes(v.verse));
      if (sectionVerses.length === 0) continue;

      const sectionStart = verseNumbers[0];
      const sectionEnd = verseNumbers[verseNumbers.length - 1];
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

  // Default grouping: 3 verses per section (deterministic)
  const sections: ParagraphSection[] = [];
  const VERSES_PER_SECTION = 3;

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
 * Load custom paragraphs from storage
 */
export async function loadCustomParagraphs(
  book: string,
  chapter: number,
  verses: Array<{ verse: number; text: string }>
): Promise<ParagraphSection[] | null> {
  try {
    const key = `custom_paragraphs_${book.toLowerCase().replace(/\s+/g, '_')}_${chapter}`;
    const stored = await AsyncStorage.getItem(key);
    if (!stored) return null;

    const customInput = stored;
    return parseCustomParagraphs(customInput, verses);
  } catch (error) {
    console.error('Error loading custom paragraphs:', error);
    return null;
  }
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
  const ranges = input.split(',').map(s => s.trim());

  for (const range of ranges) {
    const match = range.match(/^(\d+)[:\-](\d+)$/);
    if (!match) continue;

    const start = parseInt(match[1], 10);
    const end = parseInt(match[2], 10);
    const sectionVerses = verses.filter(v => v.verse >= start && v.verse <= end);

    if (sectionVerses.length === 0) continue;

    sections.push({
      id: `para-${start}-${end}`,
      title: `Verses ${start}-${end}`,
      startVerse: start,
      endVerse: end,
      verses: sectionVerses,
    });
  }

  return sections;
}
