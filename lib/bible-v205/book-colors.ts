// ─── v420: the ROYGBIV book colours ─────────────────────────────────────────
// Jonathan's books are colour-separated by his seven commentary
// sections (his ruling, Nov 2, with the approved drawing
// books-roygbiv-concepts-v3.html — "Yes perfect build it"): every
// book wears its section's spectrum colour on its own pages instead
// of the Settings seed. The mapping runs in canonical order over the
// app's own book list, in the volumes' ranges:
//
//   RED    Genesis – Deuteronomy      (the Law)
//   ORANGE Joshua – Esther            (History)
//   YELLOW Job – Song of Solomon      (Poetry)
//   GREEN  Isaiah – Daniel            (Major Prophets)
//   BLUE   Hosea – Malachi            (Minor Prophets)
//   INDIGO Matthew – Acts             (Gospels + Acts)
//   VIOLET Romans – Revelation        (Epistles + Revelation)
//
// The LIGHT values are the approved drawing's constants — pinned,
// never re-derived from the seed (a book's colour is identity, not
// theme, exactly like the v419 box kind hues). DARK follows the same
// construction the v419 dresses use: containers become the hue's
// deep tonal, accents and inks become its light tonal, computed from
// the same constants with the app's own mix so the pair can never
// drift apart.
//
// The rule the drawing settled rides with the values: book-owned
// elements wear the book colour (tiles, section cards, threads,
// pills on the book's own surfaces); shared chrome (tab bar, the
// Books list's header, the Study Queue pill, the multi-book study
// progress header) stays the seed. components/bible-v205/palette.ts
// is where these values enter the palette the surfaces consume
// (useBookBiblePalette); the seed palette is untouched.

import { BIBLE_BOOKS } from '../bible-books';
import { mix } from '../color-themes';

export type BookHueId = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'indigo' | 'violet';

export interface BookHueValues {
  /** Solid fills: chapter tiles, progress fill, written thread. */
  primary: string;
  /** The text-grade accent: verse numbers, section dots, pill text. */
  deep: string;
  /** First section tint — also the pill tint and the thread track. */
  tintA: string;
  /** Second section tint (section cards alternate A / B). */
  tintB: string;
  /** Ink for text sitting on the hue's own filled surfaces. */
  ink: string;
}

/** The approved light values, per hue (the drawing's table). */
export const BOOK_HUE_LIGHT: Record<BookHueId, BookHueValues> = {
  red: { primary: '#C62828', deep: '#8E1414', tintA: '#F9DEDC', tintB: '#F3C6C1', ink: '#4A0E0E' },
  orange: { primary: '#E8710A', deep: '#9A3F06', tintA: '#FBE3CC', tintB: '#F7CFA1', ink: '#4A2403' },
  yellow: { primary: '#DFA008', deep: '#8A6100', tintA: '#FBF0C3', tintB: '#F6E08C', ink: '#4A3700' },
  green: { primary: '#2E7D32', deep: '#1B5E20', tintA: '#D8EDD8', tintB: '#BCE0BC', ink: '#0E3312' },
  blue: { primary: '#1565C0', deep: '#0D47A1', tintA: '#D6E7F7', tintB: '#B7D3F0', ink: '#0A2A52' },
  indigo: { primary: '#3949AB', deep: '#232C73', tintA: '#DDE1F5', tintB: '#C0C8EC', ink: '#10164A' },
  violet: { primary: '#7B1FA2', deep: '#4A148C', tintA: '#EDDEF5', tintB: '#DEC3F0', ink: '#2E0A4A' },
};

/** The seven sections as ordered ranges over the canonical list:
 * [hue, book count] — 5 / 12 / 5 / 5 / 12 / 5 / 22 = 66. */
const BOOK_HUE_RANGES: readonly (readonly [BookHueId, number])[] = [
  ['red', 5],
  ['orange', 12],
  ['yellow', 5],
  ['green', 5],
  ['blue', 12],
  ['indigo', 5],
  ['violet', 22],
];

/** Every canonical book's hue, built from the ranges so the map is
 * complete over the canon by construction. */
export const BOOK_HUE_BY_NAME: Readonly<Record<string, BookHueId>> = (() => {
  const map: Record<string, BookHueId> = {};
  let i = 0;
  for (const [hue, count] of BOOK_HUE_RANGES) {
    for (let n = 0; n < count && i < BIBLE_BOOKS.length; n++, i++) {
      map[BIBLE_BOOKS[i]] = hue;
    }
  }
  return map;
})();

/** A book's spectrum hue, or null for a name outside the canon. */
export function bookHueFor(book: string): BookHueId | null {
  return BOOK_HUE_BY_NAME[book] ?? null;
}

export interface BookColors extends BookHueValues {
  hue: BookHueId;
}

/**
 * The book's colour set for one appearance. Light returns the
 * approved constants untouched. Dark derives the pair the v419 way
 * from the same constants: fills step to a mid-light tonal so they
 * stay present on the dark ground, the text accent lightens
 * further, the tints become the hue's deep tonals (containers), and
 * the ink becomes its palest tonal.
 */
export function bookColorsFor(book: string, isDark: boolean): BookColors | null {
  const hue = bookHueFor(book);
  if (!hue) return null;
  const light = BOOK_HUE_LIGHT[hue];
  if (!isDark) return { hue, ...light };
  return {
    hue,
    primary: mix(light.primary, '#FFFFFF', 0.38),
    deep: mix(light.primary, '#FFFFFF', 0.7),
    tintA: mix(light.primary, '#000000', 0.58),
    tintB: mix(light.primary, '#000000', 0.47),
    ink: mix(light.primary, '#FFFFFF', 0.82),
  };
}
