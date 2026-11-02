// ─── v420 — the ROYGBIV book colours ─────────────────────────────────────────
// Jonathan's ruling (Nov 2, approved drawing books-roygbiv-concepts-v3,
// "Yes perfect build it"): every book wears its commentary section's
// spectrum colour on its own pages instead of the Settings seed.
// These pins hold the three halves of the build:
//   · the mapping — all 66 canonical books, exactly one hue each, in
//     the volumes' ranges (5 / 12 / 5 / 5 / 12 / 5 / 22), boundaries
//     spot-checked at every seam;
//   · the values — the drawing's light constants verbatim, and the
//     dark pair derived the v419 way (containers to the hue's deep
//     tonal, accents/inks to its light tonal);
//   · the routing — buildBiblePalette with a book name returns the
//     palette the four surfaces consume with the pinned roles in the
//     book's values, while the seed palette and everything that must
//     stay seed (PDF theme, Study Queue, progress header) are pinned
//     to their sources.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// The palette module imports use-colors; buildBiblePalette takes
// its colors directly here, but the hook's module chain must not
// load (the standing mock shape from v250/v311).
vi.mock('@/hooks/use-colors', async () => {
  const { getThemedPalette } = await import('@/lib/color-themes');
  return { useColors: () => getThemedPalette('light', 'default' as any) };
});

import { BIBLE_BOOKS } from '@/lib/bible-books';
import type { ThemeColorPalette } from '@/constants/theme';
import { getThemedPalette, mix } from '@/lib/color-themes';
import { hexLuminance } from '@/lib/skin-themes';
import {
  BOOK_HUE_BY_NAME,
  BOOK_HUE_LIGHT,
  bookColorsFor,
  bookHueFor,
  type BookHueId,
} from '@/lib/bible-v205/book-colors';
import { buildBiblePalette, cellDressFor, sectionToneFor } from '@/components/bible-v205/palette';

const root = join(__dirname, '..', '..');
const src = (rel: string) => readFileSync(join(root, rel), 'utf8');

describe('v420 mapping — the whole canon, one hue each', () => {
  it('covers all 66 canonical books', () => {
    expect(BIBLE_BOOKS).toHaveLength(66);
    for (const book of BIBLE_BOOKS) {
      expect(bookHueFor(book), `${book} has a hue`).not.toBeNull();
    }
    expect(Object.keys(BOOK_HUE_BY_NAME).sort()).toEqual([...BIBLE_BOOKS].sort());
  });

  it('counts the seven sections at the volumes’ ranges', () => {
    const counts: Record<BookHueId, number> = {
      red: 0, orange: 0, yellow: 0, green: 0, blue: 0, indigo: 0, violet: 0,
    };
    for (const book of BIBLE_BOOKS) counts[bookHueFor(book)!] += 1;
    expect(counts).toEqual({ red: 5, orange: 12, yellow: 5, green: 5, blue: 12, indigo: 5, violet: 22 });
  });

  it('spot-checks every boundary', () => {
    const spots: [string, BookHueId][] = [
      ['Genesis', 'red'], ['Deuteronomy', 'red'],
      ['Joshua', 'orange'], ['Esther', 'orange'],
      ['Job', 'yellow'], ['Song of Solomon', 'yellow'],
      ['Isaiah', 'green'], ['Daniel', 'green'],
      ['Hosea', 'blue'], ['Malachi', 'blue'],
      ['Matthew', 'indigo'], ['Acts', 'indigo'],
      ['Romans', 'violet'], ['Revelation', 'violet'],
    ];
    for (const [book, hue] of spots) expect(bookHueFor(book), book).toBe(hue);
  });

  it('returns null outside the canon', () => {
    expect(bookHueFor('Not A Book')).toBeNull();
    expect(bookColorsFor('Not A Book', false)).toBeNull();
  });
});

describe('v420 values — the drawing’s constants, light and dark', () => {
  it('light returns the approved table verbatim', () => {
    expect(bookColorsFor('Genesis', false)).toEqual({ hue: 'red', ...BOOK_HUE_LIGHT.red });
    expect(bookColorsFor('Romans', false)).toEqual({ hue: 'violet', ...BOOK_HUE_LIGHT.violet });
    expect(BOOK_HUE_LIGHT.red).toEqual({
      primary: '#C62828', deep: '#8E1414', tintA: '#F9DEDC', tintB: '#F3C6C1', ink: '#4A0E0E',
    });
    expect(BOOK_HUE_LIGHT.violet).toEqual({
      primary: '#7B1FA2', deep: '#4A148C', tintA: '#EDDEF5', tintB: '#DEC3F0', ink: '#2E0A4A',
    });
  });

  it('dark derives the v419 pair: deep-tonal containers, light-tonal accents', () => {
    for (const book of ['Genesis', 'Romans', 'Job'] as const) {
      const light = bookColorsFor(book, false)!;
      const dark = bookColorsFor(book, true)!;
      expect(dark.hue).toBe(light.hue);
      // Containers step DOWN in luminance; accents and inks step UP.
      expect(hexLuminance(dark.tintA)).toBeLessThan(hexLuminance(light.tintA));
      expect(hexLuminance(dark.tintB)).toBeLessThan(hexLuminance(light.tintB));
      expect(hexLuminance(dark.deep)).toBeGreaterThan(hexLuminance(light.deep));
      expect(hexLuminance(dark.ink)).toBeGreaterThan(hexLuminance(light.ink));
      // The fills stay in the hue — a mix of the hue toward white,
      // never a foreign colour.
      expect(dark.primary).toBe(mix(light.primary, '#FFFFFF', 0.38));
      expect(dark.tintA).toBe(mix(light.primary, '#000000', 0.58));
    }
  });
});

describe('v420 palette routing — the surfaces consume the book’s values', () => {
  // getThemedPalette's own alias differs from the runtime palette
  // type buildBiblePalette takes — use-colors bridges the same gap
  // with a cast; the fixtures do the same.
  const lightColors = getThemedPalette('light', 'default') as unknown as ThemeColorPalette;
  const darkColors = getThemedPalette('dark', 'default') as unknown as ThemeColorPalette;

  it('Genesis (light): the pinned roles wear Red', () => {
    const pal = buildBiblePalette(lightColors, 'Genesis');
    expect(pal.rasp).toBe('#C62828'); // tiles / progress / thread fill
    expect(pal.raspDeep).toBe('#8E1414'); // verse numbers, dots, pill text
    expect(pal.band).toBe('#F9DEDC'); // pill tint
    expect(pal.raspTint).toBe('#F9DEDC'); // thread track
    expect(pal.primCont).toBe('#F9DEDC');
    expect(pal.sections).toEqual([
      { bg: '#F9DEDC', deep: '#8E1414', hue: '#C62828' },
      { bg: '#F3C6C1', deep: '#8E1414', hue: '#C62828' },
    ]);
    // Section cards alternate A / B / A.
    expect(sectionToneFor(pal, 0).bg).toBe('#F9DEDC');
    expect(sectionToneFor(pal, 1).bg).toBe('#F3C6C1');
    expect(sectionToneFor(pal, 2).bg).toBe('#F9DEDC');
  });

  it('Romans (light): the pinned roles wear Violet', () => {
    const pal = buildBiblePalette(lightColors, 'Romans');
    expect(pal.rasp).toBe('#7B1FA2');
    expect(pal.raspDeep).toBe('#4A148C');
    expect(pal.band).toBe('#EDDEF5');
    expect(pal.raspTint).toBe('#EDDEF5');
    expect(sectionToneFor(pal, 0).bg).toBe('#EDDEF5');
    expect(sectionToneFor(pal, 1).bg).toBe('#DEC3F0');
  });

  it('Genesis (dark): fills, accents and tints all step the v419 way', () => {
    const pal = buildBiblePalette(darkColors, 'Genesis');
    const set = bookColorsFor('Genesis', true)!;
    expect(pal.rasp).toBe(set.primary);
    expect(pal.raspDeep).toBe(set.deep);
    expect(pal.band).toBe(set.tintA);
    expect(sectionToneFor(pal, 0)).toEqual({ bg: set.tintA, deep: set.deep, hue: set.primary });
    expect(sectionToneFor(pal, 1).bg).toBe(set.tintB);
  });

  it('Genesis tiles: the complete cell is the Red primary with white numerals', () => {
    const pal = buildBiblePalette(lightColors, 'Genesis');
    expect(cellDressFor(pal, 'complete')).toEqual({ backgroundColor: '#C62828', color: '#FFFFFF' });
  });

  it('a Romans list card’s threads: written = Violet primary on its tint, read = its deep', () => {
    // The row applies exactly these fields (bible-chapters BookRow +
    // reading-progress-card BookReadingThread): written track
    // raspTint, written fill rasp, read fill raspDeep.
    const pal = buildBiblePalette(lightColors, 'Romans');
    expect(pal.raspTint).toBe('#EDDEF5');
    expect(pal.rasp).toBe('#7B1FA2');
    expect(pal.raspDeep).toBe('#4A148C');
  });

  it('the seed palette is untouched by the book path', () => {
    const seed = buildBiblePalette(lightColors);
    expect(seed.rasp).toBe(lightColors.primary);
    expect(seed.sections).toHaveLength(4);
    // An unknown book name falls back to the seed palette whole.
    const fallback = buildBiblePalette(lightColors, 'Not A Book');
    expect(fallback.rasp).toBe(lightColors.primary);
    expect(fallback.sections).toHaveLength(4);
  });

  it('meaning colours never move: washes and keeper yellow are shared', () => {
    const seed = buildBiblePalette(lightColors);
    const book = buildBiblePalette(lightColors, 'Genesis');
    expect(book.tintYellow).toBe(seed.tintYellow);
    expect(book.yellowBg).toBe(seed.yellowBg);
    expect(book.paper).toBe(seed.paper);
    expect(book.ink).toBe(seed.ink);
  });
});

describe('v420 sources — what converted, what stayed seed', () => {
  it('book page: grid + caps ride the book palette; queue pill and PDF theme stay seed', () => {
    const s = src('app/bible-book.tsx');
    expect(s).toContain('useBookBiblePalette(book)');
    expect(s).toContain('cellDressFor(bookPal, d.status)');
    expect(s).toContain('color: bookPal.rasp }]}>PrayerCircle · Bible');
    expect(s).toContain('color: palette.raspDeep }]}>Study Queue');
    expect(s).toContain('pdfThemeFromSeed(palette.rasp)');
  });

  it('books list: rows ride per-book palettes; the progress header stays seed', () => {
    const s = src('app/bible-chapters.tsx');
    expect(s).toContain('const bookPal = useBookBiblePalette(book);');
    expect(s).toContain('color: bookPal.rasp }}>›</Text>');
    expect(s).toContain('backgroundColor: bookPal.rasp');
    expect(s).toContain('<BookReadingThread read={readCount} total={total} palette={bookPal} />');
    expect(s).toContain('<StudyProgressHeader\n            progress={progress}\n            palette={palette}');
    // CurrentPill resolves its own book's palette.
    expect(s).toContain('const palette = useBookBiblePalette(book);');
  });

  it('chapter page: the page palette is the book’s; the PDF theme stays seed', () => {
    const s = src('components/bible-v205/chapter-page.tsx');
    expect(s).toContain('const palette = useBookBiblePalette(book);');
    expect(s).toContain('pdfThemeFromSeed(seedPalette.rasp)');
  });
});
