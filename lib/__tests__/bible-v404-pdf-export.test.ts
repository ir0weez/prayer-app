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
//  7. THE OPENER PRINTS — the chapter opener (Previously, then the
//     Introduction, the page's own order) rides after the hero,
//     under its seed-deep label; 1 Kings 4 is pinned whole: all
//     four section bands verbatim, all 34 verses, the opener
//     text, and a rendered-block count equal to the assembled
//     display model's count.
//  8. THE LIBRARY SWEEP — EVERY chapter in the shipped commentary
//     data is built and checked: every section title appears as
//     a band title in order, the rendered note-block count equals
//     the display-model count, the opener text appears, and every
//     verse of the chapter appears. Completeness is library-wide
//     (Jonathan, Nov 1: "It's other chapters. I never said
//     specific ones.").

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
import { COMMENTARY_DATA, getChapterData } from '../bible-v205/index';
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

// ─── Completeness helpers ────────────────────────────────────────────────────
// The builder escapes text with escapeHtml; the checks below mirror
// that escaping exactly so a title or verse is searched for in the
// form the HTML actually carries, then unescaped to compare the
// words themselves verbatim.

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function unesc(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function bodyOf(html: string): string {
  return html.slice(html.indexOf('<body>'));
}

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/** The band titles the HTML carries, in print order (escaped form). */
function bandTitles(html: string): string[] {
  const out: string[] = [];
  const re = /<span class="stitle">([^<]*)<\/span>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

/** One rendered note block = one bare main-text paragraph, one
 * kind box, or one scripture quote block — the three shapes
 * blockHtml emits. Added-note cards are counted separately. */
function renderedBlockCount(body: string): number {
  return (
    countOccurrences(body, '<p class="main-text">') +
    countOccurrences(body, '<div class="note-card"') +
    countOccurrences(body, '<div class="scripture-quote">')
  );
}

function addedNoteCount(body: string): number {
  return countOccurrences(body, '<div class="anote">');
}

/** The block accounting of one assembled chapter: every block in
 * the display model must surface exactly once — as a block element,
 * or (a quote block carrying a speaker id) as an added-note card,
 * mirroring entryHtml's filter and quoteBubbleLines' selection.
 * The opener's blocks and Previously paragraphs count too: they
 * render through the same block shapes. */
function modelBlockCounts(data: ChapterPdfData): { blockEls: number; addedNotes: number } {
  let blocks = 0;
  let bubbled = 0;
  let vanished = 0;
  for (const s of data.sections) {
    for (const e of s.entries) {
      for (const b of e.blocks) {
        blocks++;
        if (b.kind === 'quote' && typeof b.authorId === 'string' && b.authorId) {
          if (b.authorId.trim()) bubbled++;
          else vanished++;
        }
      }
    }
  }
  const opener = (data.chapterData?.intro.length ?? 0) + (data.chapterData?.previously.length ?? 0);
  return { blockEls: blocks - bubbled - vanished + opener, addedNotes: bubbled };
}

describe('v404 — 1 Kings 4, whole (his screenshot chapter)', () => {
  function kingsFourPdf(): { data: ChapterPdfData; html: string } {
    const chapterData = getChapterData('1 Kings', 4);
    if (!chapterData) throw new Error('1 Kings 4 commentary data missing');
    // 1 Kings carries no embedded verse text in the shipped data
    // (the app fetches it), so the test seats 34 verse rows the
    // way the device's loader hands them over.
    const verses = Array.from({ length: 34 }, (_, i) => ({
      verse: i + 1,
      text: `The ${i + 1} verse of the fourth chapter of the first book of the Kings.`,
    }));
    const data = assembleChapterPdfData({
      book: '1 Kings',
      chapter: 4,
      chapterData,
      marks: {},
      verses,
      people: [],
      profile: PROFILE,
    });
    const html = buildChapterPdfHtml({ data, theme: pdfThemeFromSeed('#256EE6'), authorName: 'Jonathan Roberts' });
    return { data, html };
  }

  it('prints all four section bands verbatim, in order, with their range pills', () => {
    const { html } = kingsFourPdf();
    expect(bandTitles(html).map(unesc)).toEqual([
      "Solomon's Closest",
      "Solomon's Officers",
      'A Prosperous Nation',
      'Wisdom Exceeding',
    ]);
    expect(html).toContain('VERSES 1–6');
    expect(html).toContain('VERSES 7–19');
    expect(html).toContain('VERSES 20–28');
    expect(html).toContain('VERSES 29–34');
  });

  it('prints all 34 verses', () => {
    const { html } = kingsFourPdf();
    for (let v = 1; v <= 34; v++) {
      expect(html).toContain(`<span class="vn">${v}</span>`);
    }
  });

  it('prints the chapter opener under its label, before the first band', () => {
    const { html } = kingsFourPdf();
    const body = bodyOf(html);
    expect(body).toContain('INTRODUCTION');
    // The opener's own words — his "Previously:" recap lives in
    // the introduction blocks of the shipped data for this
    // chapter, and every intro block's text stands on the page.
    expect(body).toContain('Previously: In our last chapter, we see Solomon struggle');
    const chapterData = getChapterData('1 Kings', 4);
    if (!chapterData) throw new Error('1 Kings 4 commentary data missing');
    for (const b of chapterData.intro) {
      expect(body).toContain(esc(b.text));
    }
    expect(body.indexOf('INTRODUCTION')).toBeLessThan(body.indexOf('VERSES 1–6'));
  });

  it('renders exactly the display model’s note blocks — none dropped, none doubled', () => {
    const { data, html } = kingsFourPdf();
    const body = bodyOf(html);
    const model = modelBlockCounts(data);
    expect(renderedBlockCount(body)).toBe(model.blockEls);
    expect(addedNoteCount(body)).toBe(model.addedNotes);
    // The chapter's own totals, counted from the shipped data:
    // 42 entry blocks + 4 opener blocks.
    expect(model.blockEls).toBe(46);
    expect(model.addedNotes).toBe(0);
  });
});

describe('v404 — the library sweep: every chapter, complete', () => {
  it(
    'no chapter in the shipped commentary loses a headline, a block, an opener, or a verse',
    { timeout: 300_000 },
    () => {
      const theme = pdfThemeFromSeed('#256EE6');
      const failures: string[] = [];
      let booksChecked = 0;
      let chaptersChecked = 0;
      let chaptersClean = 0;
      let titlesChecked = 0;
      let blocksChecked = 0;
      let versesChecked = 0;

      for (const [book, bookData] of Object.entries(COMMENTARY_DATA)) {
        booksChecked++;
        for (const [chapterKey, chapterData] of Object.entries(bookData.chapters)) {
          const chapter = parseInt(chapterKey, 10);
          const carries =
            chapterData.sections.length > 0 ||
            chapterData.intro.length > 0 ||
            chapterData.previously.length > 0;
          if (!carries) continue;
          chaptersChecked++;
          const where = `${book} ${chapter}`;
          const failuresBefore = failures.length;

          // Verses: the embedded text where the shipped data
          // carries it; elsewhere verse rows spanning the
          // chapter's covered range, as the device's fetch would
          // hand them over — the verse NUMBERS are then the check.
          const embedded = embeddedVerses(book, chapter);
          let maxVerse = 0;
          for (const s of chapterData.sections) {
            maxVerse = Math.max(maxVerse, s.end);
            for (const e of s.entries) maxVerse = Math.max(maxVerse, e.end);
          }
          for (const st of chapterData.stories) maxVerse = Math.max(maxVerse, st.end);
          const verses =
            embedded ??
            Array.from({ length: maxVerse }, (_, i) => ({ verse: i + 1, text: '' }));

          const data = assembleChapterPdfData({
            book,
            chapter,
            chapterData,
            marks: {},
            verses,
            people: [],
            profile: PROFILE,
          });
          const html = buildChapterPdfHtml({ data, theme, authorName: 'Jonathan Roberts' });
          const body = bodyOf(html);

          // (a) Every section title in the data is a band title in
          // the HTML, in the display model's order — and the
          // assembly itself neither drops nor invents a headline.
          const rawTitles = chapterData.sections.map((s) => s.title).filter(Boolean) as string[];
          const displayTitles = data.sections.map((s) => s.title).filter(Boolean) as string[];
          if ([...rawTitles].sort().join('') !== [...displayTitles].sort().join('')) {
            failures.push(`${where}: assembly changed the headline set`);
          }
          const printedTitles = bandTitles(body);
          titlesChecked += displayTitles.length;
          if (printedTitles.length !== displayTitles.length) {
            failures.push(
              `${where}: ${printedTitles.length} band titles printed for ${displayTitles.length} in the model`,
            );
          } else {
            displayTitles.forEach((title, i) => {
              if (printedTitles[i] !== esc(title)) {
                failures.push(`${where}: band ${i + 1} prints "${unesc(printedTitles[i])}", data says "${title}"`);
              }
            });
          }

          // (b) The rendered note-block count equals the display
          // model's — nothing dropped, nothing doubled.
          const model = modelBlockCounts(data);
          blocksChecked += model.blockEls + model.addedNotes;
          if (renderedBlockCount(body) !== model.blockEls) {
            failures.push(
              `${where}: ${renderedBlockCount(body)} blocks rendered, model carries ${model.blockEls}`,
            );
          }
          if (addedNoteCount(body) !== model.addedNotes) {
            failures.push(
              `${where}: ${addedNoteCount(body)} added-note cards rendered, model carries ${model.addedNotes}`,
            );
          }

          // (c) The opener text appears — every introduction block
          // and every Previously paragraph, when non-empty.
          for (const b of chapterData.intro) {
            if (b.text.trim() && !body.includes(esc(b.text))) {
              failures.push(`${where}: introduction block missing from the print: "${b.text.slice(0, 60)}…"`);
            }
          }
          for (const p of chapterData.previously) {
            if (p.trim() && !body.includes(esc(p))) {
              failures.push(`${where}: Previously paragraph missing from the print: "${p.slice(0, 60)}…"`);
            }
          }

          // (d) Every verse of the chapter appears — its text where
          // the shipped data embeds it, its number everywhere.
          if (embedded) {
            for (const v of embedded) {
              versesChecked++;
              if (v.text && !body.includes(esc(v.text))) {
                failures.push(`${where}: verse ${v.verse} text missing from the print`);
              }
            }
          } else {
            for (let v = 1; v <= maxVerse; v++) {
              versesChecked++;
              if (!body.includes(`<span class="vn">${v}</span>`)) {
                failures.push(`${where}: verse ${v} missing from the print`);
              }
            }
          }

          if (failures.length === failuresBefore) chaptersClean++;
        }
      }

      console.log(
        `LIBRARY SWEEP — books: ${booksChecked}, chapters checked: ${chaptersChecked}, ` +
          `chapters clean: ${chaptersClean}, section titles checked: ${titlesChecked}, ` +
          `note blocks checked: ${blocksChecked}, verses checked: ${versesChecked}, ` +
          `failures: ${failures.length}`,
      );
      expect(failures, failures.slice(0, 40).join('\n')).toEqual([]);
    },
  );
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
