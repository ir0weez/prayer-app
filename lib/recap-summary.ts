/**
 * Recap summary generator for completed Bible story sections
 * Generates brief summaries of verse passages for quick review
 */

import { BibleVerse } from './bible-section-parser';

export interface RecapSummary {
  verseRange: string;
  summary: string;
  keyPoints: string[];
}

/**
 * Generate a recap summary from a list of verses
 * Creates a concise overview suitable for quick review
 */
export function generateRecapSummary(verses: BibleVerse[]): RecapSummary {
  if (!verses || verses.length === 0) {
    return {
      verseRange: '',
      summary: 'No verses available',
      keyPoints: [],
    };
  }

  const startVerse = verses[0].verse;
  const endVerse = verses[verses.length - 1].verse;
  const verseRange = startVerse === endVerse ? `${startVerse}` : `${startVerse}-${endVerse}`;

  // Combine all verse text
  const fullText = verses.map((v) => v.text).join(' ');

  // Extract key points (sentences that contain important keywords)
  const sentences = fullText.match(/[^.!?]+[.!?]+/g) || [];
  const keyPoints: string[] = [];

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length > 20 && trimmed.length < 200) {
      // Avoid very short or very long sentences
      keyPoints.push(trimmed);
    }
    if (keyPoints.length >= 3) break; // Limit to 3 key points
  }

  // Create a summary by combining first and last sentence
  let summary = '';
  if (sentences && sentences.length > 0) {
    const firstSentence = sentences[0]?.trim() || '';
    const lastSentence = sentences[sentences.length - 1]?.trim() || '';

    if (firstSentence === lastSentence) {
      summary = firstSentence;
    } else {
      // Combine first and last for context
      summary = `${firstSentence} ... ${lastSentence}`;
    }

    // Truncate if too long
    if (summary.length > 300) {
      summary = summary.substring(0, 300) + '...';
    }
  } else {
    // Fallback: use first 200 characters
    summary = fullText.substring(0, 200);
    if (fullText.length > 200) {
      summary += '...';
    }
  }

  return {
    verseRange,
    summary,
    keyPoints: keyPoints.slice(0, 2), // Return top 2 key points
  };
}

/**
 * Format a recap summary for display
 */
export function formatRecapForDisplay(recap: RecapSummary): string {
  let formatted = `Verses ${recap.verseRange}\n\n`;
  formatted += recap.summary;

  if (recap.keyPoints.length > 0) {
    formatted += '\n\nKey points:\n';
    recap.keyPoints.forEach((point, idx) => {
      formatted += `${idx + 1}. ${point.trim()}\n`;
    });
  }

  return formatted;
}
