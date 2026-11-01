// ─── v404 chapter PDF export — pins ──────────────────────────────────────────
// Jonathan's pick (Nov 1, 2026): Concept 1 of the PDF concepts file —
// "The Chapter Page, Printed". Pins:
//  1. THE PAGE — builder output for 1 John 2 (his real shipped data)
//     carries the seed hero ("1 John 2", "Notes by Jonathan
//     Roberts"), a real KJV verse line, a phrase-highlight span in
//     its tint wash, a Main Thought box with its label and Studio
//     orange, and a scripture quote block.
//  2. NO CREAM — Concept 3's paper hex (#FBF3E2) appears nowhere.
//  3. ADDED LINES — lines added on the phone ride in as added-note
//     cards naming their author (his own, and another person's).
//  4. NOTELESS CHAPTERS — a chapter with no notes still exports:
//     hero, the whole chapter's verses, the footer machinery, and
//     no note cards of any kind.
//  5. PAGE NUMBERS — the footer is @page margin-box CSS with the
//     engine's own counter(page) / counter(pages); no total is ever
//     written into the document body.
//  6. BOTH SEATS — the chapter page's header PDF button and the
//     book panel's "Download PDF" both call the one shared
//     exporter (shareChapterPdf), and the share path prints with
//     mimeType application/pdf.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      store.delete(k);
    }),
    clear: vi.fn(async () => {
      store.clear();
    }),
  },
}));

// The share path's effectful edge is a seam (the drive-export
// pattern): the suite drives it with this fake printer instead of
// the expo modules, which need a native runtime.
const printToFileAsync = vi.fn(async (_opts: { html: string }) => ({
  uri: 'file:///cache/1-john-2.pdf',
}));
const shareAsync = vi.fn(async (_uri: string, _opts: { mimeType: string; dialogTitle: string }) => undefined);
const fakePrinter = { printToFileAsync, shareAsync };

import {
  assembleChapterPdfData,
  buildChapterPdfHtml,
  pdfThemeFromSeed,
  shareChapterPdf,
  type ChapterPdfData,
} from '../bible-v205/pdf-export';
import { getChapterData } from '../bible-v205/index';
import { embeddedVerses } from '../bible-v205/verses';
import { emptyMarks, type MarksMap } from '../bible-v205/marks';
import type { V205ChapterData } from '../bible-v205/types';
import type { Person } from '../prayercircle-data';

beforeEach(() => {
  store.clear();
  printToFileAsync.mockClear();
  shareAsync.mockClear();
});

const PROFILE = { name: 'Jonathan Roberts' };
const CODY = { id: 'p-cody', name: 'Cody', avatarColor: '#2E8C7A' } as unknown as Person;

/** His real 1 John 2, plus the one block kind the shipped chapter
 * does not happen to carry — a Main Thought — seated on its first
 * entry the way his Notion shape seats it, so the box's label and
 * colour pin against the real chapter around it. */
function firstJohnTwoData(): V205ChapterData {
  const real = getChapterData('1 John', 2);
  if (!real) throw new Error('1 John 2 commentary data missing');
  const data = JSON.parse(JSON.stringify(real)) as V205ChapterData;
  const firstEntry = data.sections[0].entries[0];
  firstEntry.blocks.push({
    kind: 'thought',
    text: 'The point is, Christ is a propitiation for the sins of the entire world, but only those that turn to Him will have their sins forgiven.',
  });
  return data;
}

function firstJohnTwoPdf(): { data: ChapterPdfData; html: string } {
  const verses = embeddedVerses('1 John', 2);
  if (!verses) throw new Error('1 John 2 embedded verses missing');
  const verse1 = verses[0].text;
  const phrase = 'we have an advocate with the Father';
  const start = verse1.indexOf(phrase);
  if (start < 0) throw new Error('verse 1 phrase missing');
  const marks: MarksMap = {
    '1 John|2|1-1': {
      ...emptyMarks(),
      phraseHighlights: [{ verse: 1, start, end: start + phrase.length, tint: 'yellow' }],
      notes: [
        'Preached this to the class — the room went quiet at “the whole world.”',
        { text: 'Walking as He walked — the test the whole chapter keeps coming back to.', authorId: 'p-cody', authorName: 'Cody' },
      ],
    },
  };
  const data = assembleChapterPdfData({
    book: '1 John',
    chapter: 2,
    chapterData: firstJohnTwoData(),
    marks,
    verses,
    people: [CODY],
    profile: PROFILE,
  });
  const html = buildChapterPdfHtml({ data, theme: pdfThemeFromSeed('#256EE6'), authorName: 'Jonathan Roberts' });
  return { data, html };
}

describe('v404 — the chapter page, printed (1 John 2)', () => {
  it('carries the seed hero with the book, chapter and his name', () => {
    const { html } = firstJohnTwoPdf();
    expect(html).toContain('FIRST JOHN · KING JAMES VERSION');
    expect(html).toContain('<h1>1 John 2</h1>');
    expect(html).toContain('Notes by Jonathan Roberts');
    expect(html).toContain('linear-gradient(135deg, #256EE6');
    expect(html).toContain('Whole chapter, with highlights and added notes');
  });

  it('prints real verse lines of the chapter', () => {
    const { html } = firstJohnTwoPdf();
    expect(html).toContain('My little children, these things write I unto you, that ye sin not.');
    expect(html).toContain('And he is the');
    expect(html).toContain('propitiation for our sins');
    // The last verse of the chapter stands too — the whole chapter.
    expect(html).toContain('<span class="vn">29</span>');
  });

  it('paints a phrase highlight as an inline span in its tint wash', () => {
    const { html } = firstJohnTwoPdf();
    // Phrase yellow at the selection model's alpha (.48) over the
    // model's own dot hex #F5C542.
    expect(html).toContain(
      '<span class="hl" style="background:rgba(245,197,66,0.48)">we have an advocate with the Father</span>',
    );
  });

  it('boxes a Main Thought with its label in the Studio orange', () => {
    const { html } = firstJohnTwoPdf();
    expect(html).toContain('background:#FBEBD9');
    expect(html).toContain('color:#E8862E">Main Thought</div>');
    expect(html).toContain('Christ is a propitiation for the sins of the entire world');
  });

  it('renders a scripture block as the quote-style block with its reference', () => {
    const { html } = firstJohnTwoPdf();
    expect(html).toContain('class="scripture-quote"');
    expect(html).toContain('Thou therefore, my son, be strong in the grace that is in Christ Jesus.');
    expect(html).toContain('>2 Timothy 2:1</div>');
  });

  it('has no cream anywhere — Concept 3 paper stays out', () => {
    const { html } = firstJohnTwoPdf();
    expect(html).not.toContain('#FBF3E2');
    expect(html.toLowerCase()).not.toContain('#fbf3e2');
  });

  it('carries added lines as added-note cards naming their authors', () => {
    const { html } = firstJohnTwoPdf();
    expect(html).toContain('class="anote"');
    expect(html).toContain('Jonathan Roberts · ON V. 1');
    expect(html).toContain('Preached this to the class — the room went quiet at “the whole world.”');
    expect(html).toContain('Cody · ON V. 1');
    expect(html).toContain('Walking as He walked — the test the whole chapter keeps coming back to.');
    // His face disc wears the seed; Cody's wears his own colour.
    expect(html).toContain('<div class="aface" style="background:#256EE6">JR</div>');
    expect(html).toContain('<div class="aface" style="background:#2E8C7A">C</div>');
  });

  it('derives the print family from the seed — a different seed recolours the hero', () => {
    const theme = pdfThemeFromSeed('#E86A10');
    expect(theme.seed).toBe('#E86A10');
    const { data } = firstJohnTwoPdf();
    const html = buildChapterPdfHtml({ data, theme, authorName: 'Jonathan Roberts' });
    expect(html).toContain('linear-gradient(135deg, #E86A10');
    expect(html).not.toContain('#256EE6');
  });
});

describe('v404 — a noteless chapter still exports whole', () => {
  it('prints hero, verses and footer with no note cards', () => {
    const verses = [
      { verse: 1, text: 'Now there was a certain man of Ramathaimzophim.' },
      { verse: 2, text: 'And he had two wives; the name of the one was Hannah.' },
      { verse: 3, text: 'And this man went up out of his city yearly to worship.' },
    ];
    const data = assembleChapterPdfData({
      book: '1 Samuel',
      chapter: 1,
      chapterData: null,
      marks: {},
      verses,
      people: [],
      profile: PROFILE,
    });
    const html = buildChapterPdfHtml({ data, theme: pdfThemeFromSeed('#256EE6'), authorName: 'Jonathan Roberts' });
    expect(html).toContain('<h1>1 Samuel 1</h1>');
    expect(html).toContain('Notes by Jonathan Roberts');
    expect(html).toContain('Now there was a certain man of Ramathaimzophim.');
    expect(html).toContain('And this man went up out of his city yearly to worship.');
    expect(html).not.toContain('<div class="note-card"');
    expect(html).not.toContain('<div class="anote"');
    expect(html).not.toContain('<div class="scripture-quote"');
    // The hero does not claim notes that are not there.
    expect(html).not.toContain('with highlights and added notes');
    expect(html.toLowerCase()).not.toContain('#fbf3e2');
  });
});

describe('v404 — footer and page numbers', () => {
  it('rides @page margin boxes with the engine’s own counters — no total is faked in the body', () => {
    const { html } = firstJohnTwoPdf();
    expect(html).toContain('@page');
    expect(html).toContain('counter(page)');
    expect(html).toContain('counter(pages)');
    expect(html).toContain('1 JOHN 2 · NOTES BY JONATHAN ROBERTS');
    // The running footer text lives ONLY in the @page rule.
    const body = html.slice(html.indexOf('</style>'));
    expect(body).not.toContain('NOTES BY JONATHAN ROBERTS');
    expect(body).not.toMatch(/PAGE \d+ OF \d+/);
  });
});

describe('v404 — the shared generate + share path', () => {
  it('prints the built HTML and shares it as application/pdf', async () => {
    const { data } = firstJohnTwoPdf();
    await shareChapterPdf(
      { data, theme: pdfThemeFromSeed('#256EE6'), authorName: 'Jonathan Roberts' },
      fakePrinter,
    );
    expect(printToFileAsync).toHaveBeenCalledTimes(1);
    const printed = printToFileAsync.mock.calls[0][0];
    expect(printed.html).toContain('<h1>1 John 2</h1>');
    expect(shareAsync).toHaveBeenCalledTimes(1);
    expect(shareAsync.mock.calls[0][0]).toBe('file:///cache/1-john-2.pdf');
    expect(shareAsync.mock.calls[0][1]).toMatchObject({ mimeType: 'application/pdf' });
  });

  it('loads the expo modules lazily — the builder module imports clean anywhere', () => {
    const src = readFileSync(join(__dirname, '..', 'bible-v205', 'pdf-export.ts'), 'utf8');
    expect(src).toContain("require('expo-print')");
    expect(src).toContain("require('expo-sharing')");
    expect(src).not.toMatch(/^import .* from 'expo-print'/m);
    expect(src).not.toMatch(/^import .* from 'expo-sharing'/m);
  });
});

describe('v404 — both seats call the shared exporter', () => {
  const chapterPageSrc = readFileSync(
    join(__dirname, '..', '..', 'components', 'bible-v205', 'chapter-page.tsx'),
    'utf8',
  );
  const bookSrc = readFileSync(join(__dirname, '..', '..', 'app', 'bible-book.tsx'), 'utf8');

  it('the chapter page header carries the PDF button on the shared path', () => {
    expect(chapterPageSrc).toContain('shareChapterPdf');
    expect(chapterPageSrc).toContain('assembleChapterPdfData');
    expect(chapterPageSrc).toContain('name="picture-as-pdf"');
  });

  it('the book panel’s Reading group carries Download PDF on the shared path', () => {
    expect(bookSrc).toContain('shareChapterPdf');
    expect(bookSrc).toContain('loadChapterPdfData');
    expect(bookSrc).toContain('Download PDF');
  });

  it('expo-print is a declared dependency', () => {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies['expo-print']).toBeTruthy();
  });
});
