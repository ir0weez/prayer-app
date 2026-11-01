// ─── v404 chapter PDF export — "The Chapter Page, Printed" ─────────────────
// Jonathan's pick (Nov 1, 2026): Concept 1 of
// social-mockups/pdf-notes-export-concepts-v1.html — the chapter page
// laid onto paper, SIMPLE and professional: a seed-gradient hero with
// the book/chapter and his name, plain section bands (pill + title +
// hairline), the whole chapter's verses with his highlight colours
// painted on the words, his notes in the reader's own treatment (main
// text bare, the typed kinds boxed in their colours, scripture as the
// quote block), the chapter opener (Previously, then the
// Introduction — the page's own order) under its small seed-deep
// label, the lines added on the phone carried in as added-note
// cards with their author's name, and a plain footer. One chapter per
// PDF, for handing to people who missed the teaching (his original
// Oct 23 ask). NO cream anywhere — that was Concept 3's paper, not
// this one's.
//
// The builder is PURE: it takes the same display model the chapter
// page renders (buildDisplaySections + splitSectionsByHashNotes,
// the split's marks map, and the bubble pieces the page partitions
// lines into) plus a theme derived from his chosen app colour, and
// returns a complete HTML document for expo-print. Print colours are
// DERIVED from the seed over white paper (the print ground is always
// white), in the Bible palette's own roles — the band pill wears the
// primary-container mix, the quote block the palest seed tint, the
// deep shades walk bibleAccentInk's contrast walk — never a pinned
// blue. The meaning colours (his category code, the keeper
// yellow, the Studio Main Thought orange) are meanings, not accents,
// and stay constant exactly as they do in the reader.
//
// Page numbers: the footer rides the @page margin boxes —
// counter(page) / counter(pages) are the CSS engine's own counts,
// so the "of N" total is real wherever the engine supports margin
// boxes, and nothing is ever faked in the document body.

import type { Person } from '../prayercircle-data';
import { mix } from '../color-themes';
import {
  buildDisplaySections,
  getBookData,
  splitSectionsByHashNotes,
  type DisplaySection,
  type SplitProvenance,
} from './index';
import { entryKey, type V205Block, type V205ChapterData } from './types';
import {
  blockHighlightsFor,
  CHAPTER_PROSE_SPAN,
  lineHighlightsFor,
  loadMarks,
  resolvePhraseHighlights,
  resolveTintFields,
  TINT_DOT_HEX,
  type MarksMap,
  type PhraseHighlight,
  type TintColor,
  type VersePhraseHighlight,
} from './marks';
import { CATEGORY_META, blockCategory } from './categories';
import {
  buildBubblePieces,
  loadPeopleList,
  loadProfileIdentity,
  resolveBubbleAuthor,
  type BubbleLine,
  type BubblePiece,
  type LineStorageTarget,
  type ProfileIdentity,
} from './bubbles';
import { loadChapterVerses, type VerseText } from './verses';
import { loadStudioImports, resolveChapterData } from './studio-import';
import { bibleAccentInk, hexToHsl, hexToRgba, hslToHex } from './palette-accents';

// ─── Theme — the seed family on white paper ──────────────────────────────────

/** The print dress of one added-note card body, by line kind. */
export interface PdfLineStyle {
  bg: string;
  border: string;
  who: string;
}

export interface ChapterPdfTheme {
  /** The chosen app colour itself — hero gradient start, verse
   * numerals, his own face disc. */
  seed: string;
  /** The seed stepped toward black — the hero gradient's deep end
   * and the scripture reference's ink. */
  seedDeep: string;
  /** Deep seed ink for the section band pill's words. */
  seedInk: string;
  /** Primary container — the band pill's ground. */
  container: string;
  /** The palest seed tint — the scripture quote block's ground. */
  containerSoft: string;
  /** White with a breath of the seed — the page's soft surface. */
  paperSoft: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  line: string;
  /** Whole-entry tint washes (the reader's v212 strengths). */
  entryTints: Record<TintColor, string>;
  /** Whole-verse tint washes (stronger, one verse's stroke). */
  verseTints: Record<TintColor, string>;
  /** Phrase washes — the selection model's six, at its alphas. */
  phraseTints: Record<TintColor, string>;
  /** The Studio composer's Main Thought box (Concept 1's card). */
  mainThoughtBg: string;
  mainThoughtTag: string;
  /** The Highlight box — his keeper yellow class. */
  highlightBg: string;
  highlightTag: string;
  /** Added-note card bodies by line kind (Concept 1's card). */
  lineStyles: Record<BubbleLine['kind'], PdfLineStyle>;
}

// The v212 wash bases the reader's palette paints entry/verse tints
// with: yellow/blue/red/orange are the selection model's dot hexes;
// rose and green kept their earlier, deeper bases when v361 grew
// the hue set (components/bible-v205/palette.ts — the values are
// mirrored here so this module stays free of component imports).
const WASH_BASE: Record<TintColor, string> = {
  yellow: TINT_DOT_HEX.yellow,
  rose: '#E64980',
  green: '#40A06E',
  blue: TINT_DOT_HEX.blue,
  red: TINT_DOT_HEX.red,
  orange: TINT_DOT_HEX.orange,
};
/** Entry-wash strengths, the reader's own per-hue alphas. */
const ENTRY_TINT_ALPHA: Record<TintColor, number> = {
  yellow: 0.32,
  rose: 0.22,
  green: 0.27,
  blue: 0.27,
  red: 0.27,
  orange: 0.3,
};
/** Phrase-wash strengths, the selection model's own alphas. */
const PHRASE_TINT_ALPHA: Record<TintColor, number> = {
  yellow: 0.48,
  rose: 0.42,
  green: 0.4,
  blue: 0.4,
  red: 0.42,
  orange: 0.44,
};

const rgba = hexToRgba;

/**
 * The whole print theme from the one seed the user picked in
 * Settings — the accent family derives exactly as the Bible palette
 * derives it (the seed over the page ground), with the page ground
 * fixed at white because paper is white. Ink and hairlines walk the
 * seed's own hue down its ramp, the way Concept 1's navy ramp walks
 * its blue.
 */
export function pdfThemeFromSeed(seedInput: string): ChapterPdfTheme {
  const paper = '#FFFFFF';
  const seed = seedInput;
  // The gradient's deep end — the seed stepped toward black, the
  // mockup's seed → seed-deep relationship (for the drawn blue:
  // #256EE6 → #1B4FA8; a contrast walk would leave a strong seed
  // untouched and flatten the gradient).
  const seedDeep = mix(seed, '#000000', 0.27);
  const container = mix(paper, seed, 0.16);
  const seedInk = bibleAccentInk(seed, container);
  const containerSoft = mix(paper, seed, 0.07);
  const { h, s } = hexToHsl(seed);
  const entryTints = {} as Record<TintColor, string>;
  const verseTints = {} as Record<TintColor, string>;
  const phraseTints = {} as Record<TintColor, string>;
  (Object.keys(WASH_BASE) as TintColor[]).forEach((t) => {
    entryTints[t] = rgba(WASH_BASE[t], ENTRY_TINT_ALPHA[t]);
    verseTints[t] = rgba(WASH_BASE[t], 0.45);
    phraseTints[t] = rgba(TINT_DOT_HEX[t], PHRASE_TINT_ALPHA[t]);
  });
  const goodThought = CATEGORY_META['good-thought'];
  return {
    seed,
    seedDeep,
    seedInk,
    container,
    containerSoft,
    paperSoft: mix(paper, seed, 0.035),
    ink: hslToHex({ h, s: Math.min(s, 0.38), l: 0.15 }),
    inkSoft: hslToHex({ h, s: Math.min(s, 0.3), l: 0.36 }),
    inkFaint: hslToHex({ h, s: Math.min(s, 0.24), l: 0.58 }),
    line: mix(paper, seed, 0.14),
    entryTints,
    verseTints,
    phraseTints,
    // Concept 1's Main Thought card — the Studio composer's orange.
    mainThoughtBg: '#FBEBD9',
    mainThoughtTag: '#E8862E',
    highlightBg: goodThought.bg,
    highlightTag: goodThought.ink,
    lineStyles: {
      // Concept 1's added-note body — a warm pale card, gold-edged.
      note: { bg: '#FFF6E0', border: '#EBD9A0', who: '#97790F' },
      thought: { bg: '#FFF6E0', border: '#EBD9A0', who: '#97790F' },
      // A Highlight line keeps the keeper yellow family, as in the
      // reader (palette yellowBg / yellowBorder / good-thought ink).
      highlight: { bg: goodThought.bg, border: '#EBD489', who: goodThought.ink },
      // Someone else's quoted words wear the reader's grey family
      // (palette greyBg / greyBorder / greyLabel).
      quote: { bg: '#F1F1EF', border: '#E1E1DC', who: '#7A766C' },
    },
  };
}

// ─── The gathered chapter — the page's own display model ─────────────────────

export interface ChapterPdfData {
  book: string;
  chapter: number;
  chapterData: V205ChapterData | null;
  /** buildDisplaySections + splitSectionsByHashNotes output — the
   * very sections the chapter page renders in With-notes mode. */
  sections: DisplaySection[];
  /** The split's marks map (derived piece records included). */
  displayMarks: MarksMap;
  /** The stored marks map, untouched — line/block phrase highlights
   * resolve through their storage targets against this map, exactly
   * as the page resolves them. */
  rawMarks: MarksMap;
  provenance: Record<string, SplitProvenance>;
  /** Lines partitioned by authorship, as the page renders them. */
  bubblePieces: Map<string, BubblePiece>;
  verses: VerseText[];
  people: Person[];
  profile: ProfileIdentity;
}

/** Assemble the export model from already-loaded pieces — the
 * chapter page hands over its own state; the loader below gathers
 * the same pieces for the book screen. One assembly, both seats. */
export function assembleChapterPdfData(args: {
  book: string;
  chapter: number;
  chapterData: V205ChapterData | null;
  marks: MarksMap;
  verses: VerseText[];
  people: Person[];
  profile: ProfileIdentity;
}): ChapterPdfData {
  const { book, chapter } = args;
  const verseCount = args.verses.length ? args.verses[args.verses.length - 1].verse : 0;
  const rawSections = buildDisplaySections(args.chapterData, verseCount);
  const split = splitSectionsByHashNotes(rawSections, args.marks, book, chapter);
  return {
    book,
    chapter,
    chapterData: args.chapterData,
    sections: split.sections,
    displayMarks: split.marks,
    rawMarks: args.marks,
    provenance: split.provenance,
    bubblePieces: buildBubblePieces(split, book, chapter),
    verses: args.verses,
    people: args.people,
    profile: args.profile,
  };
}

/** Gather a chapter's export model from the stores — the book
 * screen's seat, which holds no chapter state of its own. */
export async function loadChapterPdfData(book: string, chapter: number): Promise<ChapterPdfData> {
  const [imports, marks, verses, people, profile] = await Promise.all([
    loadStudioImports(),
    loadMarks(),
    loadChapterVerses(book, chapter),
    loadPeopleList(),
    loadProfileIdentity(),
  ]);
  return assembleChapterPdfData({
    book,
    chapter,
    chapterData: resolveChapterData(book, chapter, imports),
    marks,
    verses,
    people,
    profile,
  });
}

// ─── HTML building ───────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escape a string for a CSS content: "..." value. */
function escapeCssContent(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

interface PaintRange {
  start: number;
  end: number;
  tint: TintColor;
}

/** Paint phrase-highlight ranges over a text as inline spans in
 * their tint washes — the words keep their colours on paper.
 * Ranges are clamped to the text; an overlapping later range gives
 * way to the first, as the reader's ranges never stack. */
function paintRanges(text: string, ranges: readonly PaintRange[], theme: ChapterPdfTheme): string {
  const valid = ranges
    .map((r) => ({
      start: Math.max(0, Math.min(r.start, text.length)),
      end: Math.max(0, Math.min(r.end, text.length)),
      tint: r.tint,
    }))
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start - b.start);
  let out = '';
  let cursor = 0;
  for (const r of valid) {
    if (r.start < cursor) continue;
    out += escapeHtml(text.slice(cursor, r.start));
    out += `<span class="hl" style="background:${theme.phraseTints[r.tint]}">${escapeHtml(text.slice(r.start, r.end))}</span>`;
    cursor = r.end;
  }
  out += escapeHtml(text.slice(cursor));
  return out;
}

/** "JR" for Jonathan Roberts — the added-note card's face disc. */
function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

// A deleted person's disc keeps the colour the reader's snapshot
// faces hash to (components/bible-v205/bubbles.tsx SNAPSHOT_COLORS —
// mirrored here so print and screen agree about a face).
const SNAPSHOT_DISC_COLORS = ['#2E8C7A', '#B45BC2', '#E0643C', '#1F5F8B', '#96791A', '#6D3BBF'];
function snapshotDiscColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return SNAPSHOT_DISC_COLORS[h % SNAPSHOT_DISC_COLORS.length];
}

const LINE_KIND_WORD: Record<BubbleLine['kind'], string> = {
  note: 'Note',
  highlight: 'Highlight',
  thought: 'Main Thought',
  quote: 'Quote',
};

interface BuildCtx {
  data: ChapterPdfData;
  theme: ChapterPdfTheme;
  verseText: Map<number, string>;
}

function verseHtml(
  ctx: BuildCtx,
  verse: number,
  verseTint: TintColor | null,
  phrases: readonly VersePhraseHighlight[],
): string {
  const text = ctx.verseText.get(verse) ?? '';
  const vn = `<span class="vn">${verse}</span>`;
  if (!text) return `<p class="verse">${vn}</p>`;
  const painted = paintRanges(text, phrases.filter((p) => p.verse === verse), ctx.theme);
  const body = verseTint
    ? `<span class="vtint" style="background:${ctx.theme.verseTints[verseTint]}">${painted}</span>`
    : painted;
  return `<p class="verse">${vn}${body}</p>`;
}

function kindBox(bg: string, tagColor: string, tag: string, bodyHtml: string): string {
  return `<div class="note-card" style="background:${bg}"><div class="tag" style="color:${tagColor}">${escapeHtml(tag)}</div><p>${bodyHtml}</p></div>`;
}

/** One commentary block in the reader's own treatment (v311):
 * main text bare, the typed kinds boxed in their colours, scripture
 * as the quote-style block. */
function blockHtml(ctx: BuildCtx, block: V205Block, highlights: readonly PhraseHighlight[]): string {
  const { theme } = ctx;
  const painted = paintRanges(block.text, highlights, theme);
  if (block.kind === 'scripture') {
    return (
      `<div class="scripture-quote"><p>&ldquo;${painted}&rdquo;</p>` +
      (block.ref ? `<div class="ref">${escapeHtml(block.ref)}</div>` : '') +
      `</div>`
    );
  }
  if (block.kind === 'highlight') {
    return kindBox(theme.highlightBg, theme.highlightTag, 'Highlight', painted);
  }
  if (block.kind === 'thought') {
    return kindBox(theme.mainThoughtBg, theme.mainThoughtTag, 'Main Thought', painted);
  }
  if (block.kind === 'quote') {
    const meta = CATEGORY_META.quote;
    return kindBox(meta.bg, meta.ink, block.authorName ? `Quote — ${block.authorName}` : 'Quote', painted);
  }
  // para | note | conversation — a categorized paragraph sits in
  // its family box; everything else flows as bare text.
  const cat = blockCategory(block);
  if (cat) {
    const meta = CATEGORY_META[cat];
    return kindBox(meta.bg, meta.ink, meta.label, painted);
  }
  if (block.kind === 'conversation') {
    return `<p class="main-text"><b>Conversation — </b><i>${painted}</i></p>`;
  }
  return `<p class="main-text">${painted}</p>`;
}

/** One added line — his own or someone else's — as Concept 1's
 * added-note card: the author's face disc, their name and the
 * verse span it rides on, and the words (their own phrase
 * highlights painted, like the page paints them). */
function lineHtml(
  ctx: BuildCtx,
  line: BubbleLine,
  target: LineStorageTarget | undefined,
  piece: BubblePiece,
): string {
  const { data, theme } = ctx;
  const author = resolveBubbleAuthor(line.author, data.people, data.profile);
  const ranges = target ? lineHighlightsFor(data.rawMarks, data.book, data.chapter, target) : [];
  const painted = paintRanges(line.text, ranges, theme);
  const style = theme.lineStyles[line.kind];
  const disc = author.isSelf
    ? theme.seed
    : author.person
      ? author.person.avatarColor || theme.seedDeep
      : snapshotDiscColor(author.name);
  const span =
    piece.start === piece.end ? `ON V. ${piece.start}` : `ON VV. ${piece.start}–${piece.end}`;
  const who = `${author.name}${line.kind !== 'note' ? ` · ${LINE_KIND_WORD[line.kind]}` : ''} · ${span}`;
  return (
    `<div class="anote"><div class="aface" style="background:${disc}">${escapeHtml(initialsFor(author.name))}</div>` +
    `<div class="abody" style="background:${style.bg};border-color:${style.border}">` +
    `<div class="who" style="color:${style.who}">${escapeHtml(who)}</div>${painted}</div></div>`
  );
}

function entryHtml(ctx: BuildCtx, entry: DisplaySection['entries'][number]): string {
  const { data, theme } = ctx;
  const { book, chapter } = data;
  const key = entryKey(book, chapter, entry.start, entry.end);
  const { tint, verseTints } = resolveTintFields(data.displayMarks, book, chapter, entry.start, entry.end);
  const phrases = resolvePhraseHighlights(data.displayMarks, book, chapter, entry.start, entry.end);
  const piece = data.bubblePieces.get(key);
  const prov = data.provenance[key];
  const blockSpan = prov
    ? { start: prov.parentStart, end: prov.parentEnd }
    : { start: entry.start, end: entry.end };

  let out = '';
  for (let v = entry.start; v <= entry.end; v++) {
    out += verseHtml(ctx, v, verseTints[v] ?? null, phrases);
  }
  // His own lines ride in the flow under the verses (the page's
  // order), then the commentary blocks, then other people's lines.
  if (piece) {
    piece.selfLines.forEach((line, i) => {
      out += lineHtml(ctx, line, piece.selfTargets[i], piece);
    });
  }
  // A studio quote block carrying a speaker id is NOT a block on
  // the page — it renders as that person's bubble line (the piece
  // already carries it), so the block flow skips it here too.
  entry.blocks
    .map((b, idx) => ({ b, idx }))
    .filter(({ b }) => !(b.kind === 'quote' && b.authorId))
    .forEach(({ b, idx }) => {
      out += blockHtml(ctx, b, blockHighlightsFor(data.rawMarks, book, chapter, blockSpan, 'blocks', idx));
    });
  if (piece) {
    piece.lines.forEach((line, i) => {
      out += lineHtml(ctx, line, piece.targets[i], piece);
    });
  }
  const wash = tint ? theme.entryTints[tint] : null;
  return `<div class="entry"${wash ? ` style="background:${wash}"` : ''}>${out}</div>`;
}

/** The chapter opener — Previously first, then the Introduction,
 * the chapter page's own order — under its small seed-deep label,
 * in the Concept 1 dress the Studio print uses. The blocks render
 * with the same treatment as entry blocks (plain paragraphs bare,
 * typed kinds boxed); his prose phrase highlights (v390) ride
 * along, resolved off the chapter-prose record exactly as the
 * page resolves them. The opener is read from the RESOLVED
 * chapter data, so a Studio-written opener prints too. An absent
 * or empty opener prints nothing. */
function openerHtml(ctx: BuildCtx): string {
  const { data, theme } = ctx;
  const cd = data.chapterData;
  if (!cd) return '';
  const { book, chapter } = data;
  let out = '';
  if (cd.previously?.length) {
    const paras = cd.previously
      .map(
        (p, i) =>
          `<p class="main-text">${paintRanges(
            p,
            blockHighlightsFor(data.rawMarks, book, chapter, CHAPTER_PROSE_SPAN, 'previously', i),
            theme,
          )}</p>`,
      )
      .join('');
    out += `<div class="opener"><div class="opener-label">PREVIOUSLY</div>${paras}</div>`;
  }
  if (cd.intro?.length) {
    const blocks = cd.intro
      .map((b, i) =>
        blockHtml(ctx, b, blockHighlightsFor(data.rawMarks, book, chapter, CHAPTER_PROSE_SPAN, 'intro', i)),
      )
      .join('');
    out += `<div class="opener"><div class="opener-label">INTRODUCTION</div>${blocks}</div>`;
  }
  return out;
}

function sectionHtml(ctx: BuildCtx, section: DisplaySection): string {
  const pill =
    section.start === section.end ? `VERSE ${section.start}` : `VERSES ${section.start}–${section.end}`;
  let out =
    `<div class="secband"><span class="pill">${pill}</span>` +
    (section.title ? `<span class="stitle">${escapeHtml(section.title)}</span>` : '') +
    `<span class="leader"></span></div>`;
  for (const entry of section.entries) out += entryHtml(ctx, entry);
  return out;
}

/**
 * The complete PDF document for one chapter — Concept 1, "The
 * Chapter Page, Printed". A chapter with no notes exports whole
 * too: hero, every verse, footer, and no note cards.
 */
export function buildChapterPdfHtml(input: {
  data: ChapterPdfData;
  theme: ChapterPdfTheme;
  authorName: string;
}): string {
  const { data, theme } = input;
  const authorName = input.authorName.trim() || 'Jonathan Roberts';
  const display = getBookData(data.book)?.display ?? data.book;
  const hasNotes =
    data.sections.some((s) => s.entries.some((e) => e.blocks.length > 0)) || data.bubblePieces.size > 0;
  const ctx: BuildCtx = {
    data,
    theme,
    verseText: new Map(data.verses.map((v) => [v.verse, v.text])),
  };
  const footerLeft = `${data.book} ${data.chapter} · Notes by ${authorName}`.toUpperCase();
  const css = `
    * { print-color-adjust: exact; -webkit-print-color-adjust: exact; box-sizing: border-box; }
    @page {
      size: Letter;
      margin: 16mm 15mm 18mm 15mm;
      @bottom-left { content: "${escapeCssContent(footerLeft)}"; font-family: Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 8pt; font-weight: 600; letter-spacing: 0.6px; color: ${theme.inkFaint}; }
      @bottom-right { content: "PAGE " counter(page) " OF " counter(pages); font-family: Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 8pt; font-weight: 600; letter-spacing: 0.6px; color: ${theme.inkFaint}; }
    }
    body { margin: 0; font-family: Roboto, "Helvetica Neue", Arial, sans-serif; color: ${theme.ink}; }
    .hero { background: linear-gradient(135deg, ${theme.seed} 0%, ${theme.seedDeep} 100%); border-radius: 28px; padding: 26px 30px; color: #FFFFFF; break-inside: avoid; }
    .hero .kicker { font-size: 10.5px; font-weight: 800; letter-spacing: 2.2px; opacity: 0.85; text-transform: uppercase; }
    .hero h1 { font-size: 40px; font-weight: 800; margin: 4px 0 0 0; letter-spacing: 0.2px; }
    .hero .meta { margin-top: 8px; font-size: 12.5px; opacity: 0.92; line-height: 1.5; }
    .opener { margin: 20px 0 0 0; }
    .opener-label { font-size: 10.5px; font-weight: 800; letter-spacing: 2px; color: ${theme.seedDeep}; margin-bottom: 2px; break-after: avoid; }
    .secband { display: flex; align-items: center; gap: 10px; margin: 24px 0 2px 0; break-after: avoid; }
    .secband .pill { background: ${theme.container}; color: ${theme.seedInk}; font-size: 11px; font-weight: 800; letter-spacing: 1.2px; padding: 5px 12px; border-radius: 999px; white-space: nowrap; }
    .secband .stitle { font-size: 11.5px; color: ${theme.inkFaint}; font-weight: 700; white-space: nowrap; }
    .secband .leader { flex: 1; border-top: 1.5px solid ${theme.line}; }
    .entry { border-radius: 12px; padding: 6px 12px; margin: 2px 0; }
    .verse { font-size: 13.8px; line-height: 1.62; margin: 7px 0; orphans: 2; widows: 2; }
    .vn { color: ${theme.seed}; font-weight: 800; font-size: 10.5px; vertical-align: super; margin-right: 3px; }
    .hl { border-radius: 4px; padding: 0 2px; }
    .vtint { border-radius: 4px; padding: 0 2px; }
    .main-text { font-size: 13px; line-height: 1.62; margin: 10px 0; }
    .note-card { border-radius: 20px; padding: 14px 18px; margin: 12px 0; break-inside: avoid; }
    .note-card .tag { font-size: 10px; font-weight: 800; letter-spacing: 1.6px; margin-bottom: 5px; text-transform: uppercase; }
    .note-card p { font-size: 13px; line-height: 1.6; margin: 0; }
    .scripture-quote { border-left: 4px solid ${theme.seed}; background: ${theme.containerSoft}; border-radius: 0 16px 16px 0; padding: 11px 16px; margin: 12px 0; break-inside: avoid; }
    .scripture-quote p { font-size: 13px; line-height: 1.6; font-style: italic; margin: 0; }
    .scripture-quote .ref { font-size: 11px; font-weight: 800; color: ${theme.seedDeep}; letter-spacing: 0.6px; margin-top: 4px; text-transform: uppercase; }
    .anote { display: flex; gap: 10px; margin: 12px 0; align-items: flex-start; break-inside: avoid; }
    .anote .aface { width: 30px; height: 30px; border-radius: 50%; color: #FFFFFF; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex: none; }
    .anote .abody { flex: 1; border: 1.5px solid; border-radius: 4px 18px 18px 18px; padding: 10px 14px; font-size: 12.8px; line-height: 1.55; }
    .anote .abody .who { font-size: 10px; font-weight: 800; letter-spacing: 1.2px; margin-bottom: 3px; }
  `;
  const body =
    `<div class="hero"><div class="kicker">${escapeHtml(display.toUpperCase())} · KING JAMES VERSION</div>` +
    `<h1>${escapeHtml(data.book)} ${data.chapter}</h1>` +
    `<div class="meta">Notes by ${escapeHtml(authorName)}<br>${
      hasNotes ? 'Whole chapter, with highlights and added notes' : 'Whole chapter'
    }</div></div>` +
    openerHtml(ctx) +
    data.sections.map((s) => sectionHtml(ctx, s)).join('');
  return `<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;
}

// ─── Generate + share — the one path both seats run ──────────────────────────

/** The effectful edge of the export — print to a file, then share
 * it — behind a seam so the suite can drive the shared path with
 * fakes (the drive-export pattern). On device the seam is filled
 * by the lazy requires below. */
export interface ChapterPdfPrinter {
  printToFileAsync: (opts: { html: string }) => Promise<{ uri: string }>;
  shareAsync: (uri: string, opts: { mimeType: string; dialogTitle: string }) => Promise<unknown>;
}

function devicePrinter(): ChapterPdfPrinter {
  // Lazy requires (the drive-export discipline): the builder above
  // stays importable anywhere — the suite imports it with no native
  // runtime — while the expo print/share modules reach for native
  // globals at import time, so they load only here, at the tap.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Print = require('expo-print') as typeof import('expo-print');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sharing = require('expo-sharing') as typeof import('expo-sharing');
  return {
    printToFileAsync: (opts) => Print.printToFileAsync(opts),
    shareAsync: (uri, opts) => Sharing.shareAsync(uri, opts),
  };
}

/**
 * Build the chapter's PDF and hand it to the system share sheet.
 * Throws on failure — each seat catches and speaks in its own
 * idiom; nothing here alerts or navigates.
 */
export async function shareChapterPdf(
  input: {
    data: ChapterPdfData;
    theme: ChapterPdfTheme;
    authorName: string;
  },
  printer: ChapterPdfPrinter = devicePrinter(),
): Promise<void> {
  const html = buildChapterPdfHtml(input);
  const { uri } = await printer.printToFileAsync({ html });
  await printer.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `${input.data.book} ${input.data.chapter} — notes by ${input.authorName}`,
  });
}
