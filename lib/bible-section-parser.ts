/**
 * Parses Bible verses and auto-detects sections based on headings
 */

export interface BibleVerse {
  verse: number;
  text: string;
}

export interface BibleSection {
  id: string;
  title: string;
  startVerse: number;
  endVerse: number;
  verses: BibleVerse[];
}

/**
 * Detects if a line is a section heading (all caps or title case, short, no verse numbers)
 */
function isSectionHeading(text: string): boolean {
  // Remove extra whitespace
  const trimmed = text.trim();
  
  // Skip if too long (likely a verse)
  if (trimmed.length > 100) return false;
  
  // Skip if contains verse numbers or common verse patterns
  if (/^\d+:|[0-9]/.test(trimmed)) return false;
  
  // Skip if it looks like a regular sentence (ends with period or contains lowercase at start)
  if (trimmed.endsWith('.') || trimmed.endsWith(',')) return false;
  
  // Check if it looks like a heading (all caps)
  const isAllCaps = /^[A-Z\s'-]+$/.test(trimmed);
  
  // For title case, require multiple words and all words start with capital
  const words = trimmed.split(/\s+/);
  const isTitleCase = words.length >= 2 && words.every(word => /^[A-Z]/.test(word));
  
  return isAllCaps || isTitleCase;
}

/**
 * Parses verses and groups them into sections based on detected headings
 */
export function parseBibleSections(verses: BibleVerse[]): BibleSection[] {
  if (verses.length === 0) return [];

  const sections: BibleSection[] = [];
  let currentSection: BibleVerse[] = [];
  let currentTitle = 'Read';
  let startVerse = verses[0].verse;

  for (let i = 0; i < verses.length; i++) {
    const verse = verses[i];
    const text = verse.text.trim();

    // Check if this line is a section heading
    if (isSectionHeading(text)) {
      // Save previous section if it has verses
      if (currentSection.length > 0) {
        sections.push({
          id: `section-${startVerse}-${currentSection[currentSection.length - 1].verse}`,
          title: currentTitle,
          startVerse,
          endVerse: currentSection[currentSection.length - 1].verse,
          verses: currentSection,
        });
      }

      // Start new section
      currentTitle = text;
      currentSection = [];
      startVerse = i + 1 < verses.length ? verses[i + 1].verse : verse.verse;
    } else {
      // Add verse to current section
      currentSection.push(verse);
    }
  }

  // Add final section
  if (currentSection.length > 0) {
    sections.push({
      id: `section-${startVerse}-${currentSection[currentSection.length - 1].verse}`,
      title: currentTitle,
      startVerse,
      endVerse: currentSection[currentSection.length - 1].verse,
      verses: currentSection,
    });
  }

  // If no sections were detected, create one section for all verses
  if (sections.length === 0 && verses.length > 0) {
    sections.push({
      id: `section-${verses[0].verse}-${verses[verses.length - 1].verse}`,
      title: 'Read',
      startVerse: verses[0].verse,
      endVerse: verses[verses.length - 1].verse,
      verses,
    });
  }

  return sections;
}
