/**
 * Utility to detect and parse words of Christ in Bible verses
 * Uses common patterns and heuristics to identify red-letter text
 */

// Common patterns that indicate Christ is speaking in KJV
const CHRIST_SPEECH_PATTERNS = [
  /Jesus said/i,
  /Jesus saith/i,
  /Jesus answered/i,
  /Jesus unto/i,
  /Jesus said unto/i,
  /he said/i,
  /he saith/i,
  /he answered/i,
];

// Common starting phrases for Christ's direct speech
const DIRECT_SPEECH_STARTERS = [
  'Verily',
  'Verily, verily',
  'I say',
  'I tell',
  'I am',
  'Thou art',
  'Ye are',
  'Come',
  'Go',
  'Follow',
  'Believe',
  'Love',
  'Repent',
];

export interface VerseSegment {
  text: string;
  isChristWords: boolean;
}

/**
 * Parse a verse to identify segments that are Christ's words
 * This is a heuristic approach since the API doesn't provide metadata
 */
export function parseVerseForChristWords(verseText: string): VerseSegment[] {
  // For now, we'll use a simple heuristic:
  // If the verse contains common Christ-speaking patterns, mark the entire verse as Christ's words
  // This is not perfect but works for many cases

  const hasChristPattern = CHRIST_SPEECH_PATTERNS.some((pattern) =>
    pattern.test(verseText)
  );

  if (hasChristPattern) {
    // Find where the actual speech begins (usually after "said" or "saith")
    const speechMatch = verseText.match(
      /(?:Jesus\s+(?:said|saith|answered)|he\s+(?:said|saith|answered))[,;]?\s*(.+)/i
    );

    if (speechMatch && speechMatch[1]) {
      // Return the part before the speech and the speech itself
      const beforeSpeech = verseText.substring(
        0,
        verseText.indexOf(speechMatch[1])
      );
      const speech = speechMatch[1];

      return [
        { text: beforeSpeech, isChristWords: false },
        { text: speech, isChristWords: true },
      ];
    }
  }

  // Check if verse starts with common Christ speech patterns
  const startsWithDirect = DIRECT_SPEECH_STARTERS.some((starter) =>
    verseText.trim().startsWith(starter)
  );

  if (startsWithDirect) {
    return [{ text: verseText, isChristWords: true }];
  }

  // Default: treat entire verse as non-Christ words
  return [{ text: verseText, isChristWords: false }];
}

/**
 * Determine if a verse is likely to contain Christ's words
 */
export function likelyContainsChristWords(verseText: string): boolean {
  const segments = parseVerseForChristWords(verseText);
  return segments.some((seg) => seg.isChristWords);
}
