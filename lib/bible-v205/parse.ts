// ─── v205 parsers ────────────────────────────────────────────────────────────
// Pure, dependency-free parsing for Jonathan's two commentary txt formats,
// his Notion chapter-page markdown, and his Studies CSVs. The generator
// script (scripts/build-bible-v205.ts) runs these over the canonical files
// and emits the data modules the app ships; the unit tests run them over
// real excerpts and the generated output.

import type {
  StudyStatus,
  V205Block,
  V205BookData,
  V205ChapterData,
  V205Entry,
  V205OutlineItem,
  V205Section,
} from './types';

export const CANON_BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
  'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel',
  'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah',
  'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah',
  'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John',
  'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians',
  'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon',
  'Hebrews', 'James', '1 Peter', '2 Peter', '1 John',
  '2 John', '3 John', 'Jude', 'Revelation',
];

const BOOK_SET = new Set(CANON_BOOKS);

export function displayName(book: string): string {
  return book
    .replace(/^1 /, 'First ')
    .replace(/^2 /, 'Second ')
    .replace(/^3 /, 'Third ');
}

export function bookSlug(book: string): string {
  return book.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Collapse whitespace and unify punctuation for cross-source matching. */
export function normalizeForMatch(s: string): string {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Split prose into sentences, keeping the punctuation on each sentence. */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  const re = /[^.!?]+[.!?]+["'”’)]*\s*|[^.!?]+$/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const s = m[0].trim();
    if (s) out.push(s);
  }
  return out.length ? out : [text.trim()];
}

const REF_TAIL = /\s((?:[123] )?[A-Z][A-Za-z ]*?) (\d+):(\d+)(?:-(\d+))?\s*$/;

/**
 * A paragraph that is exactly one quoted scripture passage with its
 * reference at the end — his cross-reference callout shape, in both the
 * txt ("..." Ref 1:2) and Notion ('*"..."* **Ref 1:2**') sources.
 */
export function parseScriptureQuote(raw: string): { quote: string; ref: string } | null {
  let t = raw.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  if (t.startsWith('>')) t = t.replace(/^>\s?/, '').trim();
  t = t.replace(/^\*\s*/, '').trim();
  const m = t.match(/^["“]([\s\S]*)["”]\*?\s+(.+)$/);
  if (!m) return null;
  const ref = m[2].trim();
  if (!REF_TAIL.test(` ${ref}`) && !/^\d/.test(ref)) {
    // Reference must look like "Book C:V" (or "C:V" shorthand) — be strict
    // so ordinary quoted speech inside commentary is never reclassified.
    if (!/^([123] )?[A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+)* \d+:\d+/.test(ref)) return null;
  }
  if (!/\d+:\d+/.test(ref)) return null;
  return { quote: m[1].trim(), ref };
}

function paraToBlock(raw: string): V205Block {
  const q = parseScriptureQuote(raw);
  if (q) return { kind: 'scripture', text: q.quote, ref: q.ref };
  return { kind: 'para', text: raw.replace(/\s+/g, ' ').trim() };
}

/** Split a chunk of prose into paragraphs → blocks. His txt separates
 * paragraphs by blank lines AND by tab-indented continuation lines. */
export function paragraphsToBlocks(chunk: string): V205Block[] {
  return chunk
    .split(/\n\s*\n|\n\t+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map(paraToBlock);
}

// ─── TXT format A — "Bible Stories sections" + "Comment N:" ─────────────────

interface AChapter {
  chapter: number;
  stories: { start: number; end: number }[];
  entries: V205Entry[];
}

function parseStoriesLine(line: string): { start: number; end: number }[] {
  const body = line.replace(/^V\.\s*/, '').replace(/\.\s*$/, '');
  return body
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^(\d+)(?:-(\d+))?$/);
      if (!m) return null;
      const start = parseInt(m[1], 10);
      return { start, end: m[2] ? parseInt(m[2], 10) : start };
    })
    .filter((r): r is { start: number; end: number } => r !== null);
}

export function parseTxtFormatA(text: string): V205BookData[] {
  // A stories header can be glued to the previous chapter's ranges line
  // ("…16-20.Ecclesiastes 11 Bible Stories sections:") — split those first.
  // Only exact canon book names count, and never at a line start.
  const bookAlt = CANON_BOOKS.map((b) => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const unglued = text.replace(
    new RegExp(`([^\\n])((?:${bookAlt}) \\d+ Bible Stories sections:)`, 'g'),
    '$1\n$2',
  );
  const lines = unglued.split(/\r?\n/);
  const books = new Map<string, { chapters: Map<number, AChapter> }>();
  let book: string | null = null;
  let ch: AChapter | null = null;
  let entry: V205Entry | null = null;
  let commentBuf: string[] = [];
  let inComment = false;

  const flushComment = () => {
    if (entry && commentBuf.length) {
      entry.blocks.push(...paragraphsToBlocks(commentBuf.join('\n')));
    }
    commentBuf = [];
    inComment = false;
  };
  const ensureBook = (name: string) => {
    if (!books.has(name)) books.set(name, { chapters: new Map() });
    return books.get(name)!;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const storiesM = line.match(/^(.+?) (\d+) Bible Stories sections:\s*$/);
    if (storiesM && BOOK_SET.has(storiesM[1])) {
      flushComment();
      book = storiesM[1];
      const num = parseInt(storiesM[2], 10);
      const next = lines[i + 1] ?? '';
      ch = { chapter: num, stories: parseStoriesLine(next), entries: [] };
      ensureBook(book).chapters.set(num, ch);
      entry = null;
      i++; // consume the ranges line
      continue;
    }
    const verseM = line.match(/^(.+?) (\d+):(\d+):\s*$/);
    if (verseM && book && ch && BOOK_SET.has(verseM[1]) && parseInt(verseM[2], 10) === ch.chapter) {
      flushComment();
      const v = parseInt(verseM[3], 10);
      entry = { start: v, end: v, blocks: [] };
      ch.entries.push(entry);
      continue;
    }
    if (/^Comment \d+:\s*$/.test(line.trim())) {
      flushComment();
      inComment = true;
      continue;
    }
    if (inComment) commentBuf.push(line);
  }
  flushComment();

  return [...books.entries()].map(([name, b]) => {
    const chapters: Record<number, V205ChapterData> = {};
    for (const [num, c] of [...b.chapters.entries()].sort((a, z) => a[0] - z[0])) {
      chapters[num] = {
        chapter: num,
        intro: [],
        previously: [],
        outline: [],
        sections: c.stories.map((r) => ({
          start: r.start,
          end: r.end,
          title: null,
          entries: c.entries.filter((e) => e.start >= r.start && e.start <= r.end),
        })),
        stories: c.stories,
      };
      // Entries outside every stories range still belong to the chapter.
      const placed = new Set(chapters[num].sections.flatMap((s) => s.entries));
      const orphans = c.entries.filter((e) => !placed.has(e));
      if (orphans.length) {
        chapters[num].sections.push({
          start: orphans[0].start,
          end: orphans[orphans.length - 1].end,
          title: null,
          entries: orphans,
        });
      }
    }
    return { book: name, display: displayName(name), chapters };
  });
}

// ─── TXT format B — prose: Introduction / Ver. sections / verse lines ───────

interface BChapter {
  chapter: number;
  intro: V205Block[];
  previously: string[];
  outline: V205OutlineItem[];
  sections: V205Section[];
  verses: Record<number, string>;
}

/** Split one verse-block's text into per-verse segments by sequence. */
export function splitVerseBlock(blockText: string, firstVerse: number): { verse: number; text: string }[] {
  const text = blockText.replace(/\s+/g, ' ').trim();
  const cuts: number[] = [];
  let exp = firstVerse + 1;
  const re = /(\s)(\d+)\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (parseInt(m[2], 10) === exp) {
      cuts.push(m.index + m[1].length);
      exp++;
    }
  }
  const segments: { verse: number; text: string }[] = [];
  let last = 0;
  let verse = firstVerse;
  for (const cut of cuts) {
    segments.push({ verse, text: text.slice(last, cut).replace(new RegExp(`^${verse}\\s+`), '').trim() });
    last = cut;
    verse++;
  }
  segments.push({ verse, text: text.slice(last).replace(new RegExp(`^${verse}\\s+`), '').trim() });
  return segments.filter((s) => s.text.length > 0);
}

export function parseTxtFormatB(text: string): V205BookData[] {
  // Form feeds mark chapter/book boundaries and are often glued to the
  // last paragraph of the previous chapter — normalize them onto their
  // own lines, then force header lines into their own blocks.
  let cleaned = text.replace(/\f/g, '\n');
  cleaned = cleaned.replace(/^(Chapter \d+)$/gm, '\n\n$1\n\n');
  cleaned = cleaned.replace(/^(Ver\.\s*\d+(?:-\d+)?:\s*.+)$/gm, '\n\n$1\n\n');
  for (const name of CANON_BOOKS) {
    cleaned = cleaned.replace(new RegExp(`^(${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})$`, 'gm'), '\n\n$1\n\n');
  }
  const books = new Map<string, { chapters: Map<number, BChapter> }>();
  let book: string | null = null;
  let ch: BChapter | null = null;
  let section: V205Section | null = null;
  let pendingVerses: { verse: number; text: string }[] = [];
  let mode: 'start' | 'intro' | 'body' = 'start';

  const ensureBook = (name: string) => {
    if (!books.has(name)) books.set(name, { chapters: new Map() });
    return books.get(name)!;
  };
  const flushEntry = (blocks: V205Block[]) => {
    if (!section || pendingVerses.length === 0) return;
    section.entries.push({
      start: pendingVerses[0].verse,
      end: pendingVerses[pendingVerses.length - 1].verse,
      blocks,
    });
    pendingVerses = [];
  };

  // Work on a mutable queue of blank-line-separated blocks; header lines
  // glued to following content are split off and re-queued.
  const queue: string[] = cleaned
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  const blockLines = (b: string) => b.split(/\n/).map((l) => l.trim()).filter(Boolean);

  for (let qi = 0; qi < queue.length; qi++) {
    const block = queue[qi];
    const blines = blockLines(block);
    if (!blines.length) continue;
    const first = blines[0];

    // Book header: a lone book-name block. A name alone can also occur
    // inside commentary (Acts 9 talks about Isaiah), so a switch is only
    // honored when the next block opens "Chapter 1" — or no book is open.
    if (blines.length === 1 && BOOK_SET.has(first)) {
      const next = queue.slice(qi + 1).find((b) => b.trim().length > 0) ?? '';
      const nextFirst = next.split(/\n/).map((l) => l.trim()).find(Boolean) ?? '';
      if (!book || /^Chapter 1$/.test(nextFirst)) {
        flushEntry([]);
        book = first;
        ch = null;
        section = null;
        mode = 'start';
        continue;
      }
      continue;
    }
    const chapterM = first.match(/^Chapter (\d+)$/);
    if (chapterM && book) {
      flushEntry([]);
      const num = parseInt(chapterM[1], 10);
      ch = { chapter: num, intro: [], previously: [], outline: [], sections: [], verses: {} };
      ensureBook(book).chapters.set(num, ch);
      section = null;
      mode = 'intro';
      const rest = blines.slice(1).join('\n');
      if (rest) queue.splice(qi + 1, 0, rest);
      continue;
    }
    if (!ch) continue;

    const secM = first.match(/^Ver\.\s*(\d+)(?:-(\d+))?:\s*(.+)$/);
    if (secM) {
      flushEntry([]);
      section = {
        start: parseInt(secM[1], 10),
        end: secM[2] ? parseInt(secM[2], 10) : parseInt(secM[1], 10),
        title: secM[3].trim(),
        entries: [],
      };
      ch.sections.push(section);
      mode = 'body';
      const rest = blines.slice(1).join('\n');
      if (rest) queue.splice(qi + 1, 0, rest);
      continue;
    }

    if (mode === 'intro') {
      // Introduction / Previously / outline / intro quote blocks.
      if (/^Previously[:,\s]/.test(first)) {
        ch.previously.push(block.replace(/^Previously[:\s]*/, '').replace(/\s+/g, ' ').trim());
        continue;
      }
      if (/^Introduction:/.test(first)) {
        ch.intro.push(...paragraphsToBlocks(block.replace(/^Introduction:\s*/, '')));
        continue;
      }
      // Outline: every line looks like "Title, range".
      const outlineItems: V205OutlineItem[] = [];
      let allOutline = blines.length > 0;
      for (const l of blines) {
        const om = l.match(/^(.+?),\s*(\d+:\d+(?:-\d+)?|\d+-\d+|\d+)\s*$/);
        if (!om) { allOutline = false; break; }
        outlineItems.push({ title: om[1].trim(), range: om[2].trim() });
      }
      if (allOutline && outlineItems.length >= 2) {
        ch.outline.push(...outlineItems);
        continue;
      }
      ch.intro.push(...paragraphsToBlocks(block));
      continue;
    }

    // Body: verse block or commentary block.
    const verseStart = first.match(/^(\d+)\s+/);
    if (verseStart && section) {
      const firstNum = parseInt(verseStart[1], 10);
      const lastKnown = pendingVerses.length
        ? pendingVerses[pendingVerses.length - 1].verse
        : section.entries.length
          ? section.entries[section.entries.length - 1].end
          : section.start - 1;
      if (firstNum === lastKnown + 1) {
        const segs = splitVerseBlock(block, firstNum);
        for (const s of segs) {
          pendingVerses.push(s);
          ch.verses[s.verse] = s.text;
        }
        continue;
      }
    }
    // Commentary block: attach to pending verses; if none pending and the
    // last entry exists, append to it (a quote block after commentary).
    const blocks = paragraphsToBlocks(block);
    if (pendingVerses.length) {
      flushEntry(blocks);
    } else if (section && section.entries.length) {
      section.entries[section.entries.length - 1].blocks.push(...blocks);
    } else if (section) {
      // Commentary before any verse in a section — keep as a lead-in entry
      // anchored at the section start.
      section.entries.push({ start: section.start, end: section.start, blocks });
    }
  }
  flushEntry([]);

  return [...books.entries()].map(([name, b]) => {
    const chapters: Record<number, V205ChapterData> = {};
    for (const [num, c] of [...b.chapters.entries()].sort((a, z) => a[0] - z[0])) {
      chapters[num] = {
        chapter: num,
        intro: c.intro,
        previously: c.previously,
        outline: c.outline,
        sections: c.sections,
        stories: c.sections.flatMap((s) => s.entries.map((e) => ({ start: e.start, end: e.end }))),
        verses: c.verses,
      };
    }
    return { book: name, display: displayName(name), chapters };
  });
}

/** Dispatch on format: the "Bible Stories sections" marker means format A. */
export function parseCommentaryTxt(text: string): V205BookData[] {
  return text.includes('Bible Stories sections:') ? parseTxtFormatA(text) : parseTxtFormatB(text);
}

// ─── Notion chapter pages ────────────────────────────────────────────────────
// His Notion anatomy, exported as markdown. Two dialects:
//   Commentary pages: "- 1 **verse**" bullets, asides carry the callouts.
//   Studies pages:    "- **1 verse**" bullets with sentence sub-bullets,
//                     "## **Introduction: …**" heading, plain quote asides.
// Only STRUCTURE is taken from here (introductions for the stories-format
// books, section titles, callout kinds + placement). The words that render
// come from the txt wherever the txt carries them.

export interface NotionCallout {
  kind: 'scripture' | 'highlight' | 'thought' | 'conversation';
  text: string;
  ref?: string;
  entryStart: number;
  entryEnd: number;
}

export interface NotionChapter {
  intro: V205Block[];
  previously: string[];
  outline: V205OutlineItem[];
  sections: { start: number; end: number; title: string }[];
  callouts: NotionCallout[];
}

const ASIDE_KIND: Record<string, NotionCallout['kind']> = {
  bookmark_lightgray: 'scripture',
  thinking_orange: 'thought',
  flashlight_yellow: 'highlight',
  conversation_green: 'conversation',
};

export function parseNotionChapterMd(md: string): NotionChapter {
  const out: NotionChapter = { intro: [], previously: [], outline: [], sections: [], callouts: [] };
  const lines = md.split(/\r?\n/);
  let mode: 'pre' | 'body' = 'pre';
  let curEntry: { start: number; end: number } | null = null;
  let aside: { kind: NotionCallout['kind'] | 'section' | null; buf: string[] } | null = null;

  const pushCallout = (kind: NotionCallout['kind'], raw: string) => {
    const text = raw.replace(/\s+/g, ' ').trim();
    if (!text || !curEntry) return;
    if (kind === 'scripture') {
      const q = parseScriptureQuote(text);
      out.callouts.push({
        kind,
        text: q ? q.quote : text,
        ref: q?.ref,
        entryStart: curEntry.start,
        entryEnd: curEntry.end,
      });
    } else {
      out.callouts.push({ kind, text, entryStart: curEntry.start, entryEnd: curEntry.end });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    if (line === '<aside>') { aside = { kind: null, buf: [] }; continue; }
    if (line === '</aside>') {
      if (aside) {
        const body = aside.buf.join('\n');
        if (aside.kind === 'section') {
          const sm = body.match(/Ver\.\s*(\d+)(?:-(\d+))?:\s*(.+)/);
          if (sm) {
            out.sections.push({
              start: parseInt(sm[1], 10),
              end: sm[2] ? parseInt(sm[2], 10) : parseInt(sm[1], 10),
              title: sm[3].replace(/\*\*/g, '').trim(),
            });
            mode = 'body';
          }
        } else if (aside.kind) {
          pushCallout(aside.kind, body);
        } else {
          // Unlabeled aside: a bare quote block is a scripture callout.
          const stripped = body.replace(/^>\s?/gm, '').trim();
          if (stripped.startsWith('"') || stripped.startsWith('“') || stripped.startsWith('*"')) {
            pushCallout('scripture', stripped);
          }
        }
      }
      aside = null;
      continue;
    }
    if (aside) {
      const img = line.match(/icons\/([a-z_]+)\.svg/);
      if (img && ASIDE_KIND[img[1]]) { aside.kind = ASIDE_KIND[img[1]]; continue; }
      if (/^#{2,4}\s/.test(line) && /Ver\./.test(line)) { aside.kind = 'section'; aside.buf.push(line); continue; }
      if (line.startsWith('<img')) continue;
      // Strip callout labels ("**Highlight**", "**Main Thought**", "**Conversation**").
      const stripped = line
        .replace(/^\*\*(Highlight|Main Thought|Conversation)\*\*\s*/, '')
        .replace(/^>\s?/, '');
      if (stripped) aside.buf.push(stripped);
      continue;
    }

    // Section headers outside asides (Studies dialect).
    const secM = line.match(/^#{2,4}\s*(?:\*\*)?Ver\.\s*(\d+)(?:-(\d+))?:\s*(.+?)(?:\*\*)?\s*$/);
    if (secM) {
      out.sections.push({
        start: parseInt(secM[1], 10),
        end: secM[2] ? parseInt(secM[2], 10) : parseInt(secM[1], 10),
        title: secM[3].replace(/\*\*/g, '').trim(),
      });
      mode = 'body';
      curEntry = null;
      continue;
    }

    if (mode === 'pre') {
      if (!line || line.startsWith('# ')) continue;
      if (/^Previously[:,\s]/.test(line)) {
        out.previously.push(line.replace(/^Previously[:\s]*/, '').replace(/\*\*/g, '').trim());
        continue;
      }
      const introM = line.match(/^(?:#{2,4}\s*)?\*\*Introduction:\s*([\s\S]*?)\*\*\s*$/) ||
        line.match(/^\*\*Introduction:\*\*\s*(.+)$/) ||
        line.match(/^Introduction:\s*(.+)$/);
      if (introM) {
        out.intro.push({ kind: 'para', text: introM[1].replace(/\s+/g, ' ').trim() });
        continue;
      }
      const om = line.match(/^\d+\.\s+(.+?),\s*(\d+:\d+(?:-\d+)?|\d+-\d+|\d+)\s*$/);
      if (om) {
        out.outline.push({ title: om[1].trim(), range: om[2].trim() });
        continue;
      }
      if (line.startsWith('- ') || line.startsWith('-\t')) { mode = 'body'; /* fall through */ }
      else {
        const q = parseScriptureQuote(line);
        if (q) out.intro.push({ kind: 'scripture', text: q.quote, ref: q.ref });
        else if (!line.startsWith('<')) out.intro.push({ kind: 'para', text: line.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim() });
        continue;
      }
    }

    // Body: verse bullets define the current entry's verse range.
    if (line.startsWith('- ')) {
      const bolds = [...line.matchAll(/\*\*(.+?)\*\*/g)].map((x) => x[1]);
      if (bolds.length) {
        const nums: number[] = [];
        // Commentary dialect: "- 5 **v5** 6 **v6** …" — numbers outside bold.
        const outside = line.replace(/\*\*.+?\*\*/g, '§');
        const outsideNums = [...outside.matchAll(/(?:^|§|\s)(\d+)\s*(?=§|\s|$)/g)].map((x) => parseInt(x[1], 10));
        for (const b of bolds) {
          const inner = b.match(/^(\d+)\s+/);
          if (inner) nums.push(parseInt(inner[1], 10));
        }
        const all = nums.length ? nums : outsideNums;
        if (all.length) {
          curEntry = { start: Math.min(...all), end: Math.max(...all) };
        }
      }
    }
  }
  return out;
}

// ─── Merge: txt words wearing Notion shape ──────────────────────────────────

export interface MergeStats {
  calloutsPlaced: number;
  calloutsSplitFromText: number;
  calloutsInsertedUnmatched: number;
  calloutsDeduped: number;
}

/** Try to split one paragraph block at the sentences the callout carries. */
function splitParaAtCallout(
  para: V205Block,
  calloutText: string,
): { before?: string; after?: string } | null {
  const sentences = splitSentences(para.text);
  const target = normalizeForMatch(calloutText);
  for (let i = 0; i < sentences.length; i++) {
    let acc = '';
    for (let j = i; j < sentences.length; j++) {
      acc = acc ? `${acc} ${sentences[j]}` : sentences[j];
      if (normalizeForMatch(acc) === target) {
        const before = sentences.slice(0, i).join(' ');
        const after = sentences.slice(j + 1).join(' ');
        return { before: before || undefined, after: after || undefined };
      }
      if (normalizeForMatch(acc).length > target.length + 12) break;
    }
  }
  return null;
}

export function mergeNotionIntoChapter(
  chapter: V205ChapterData,
  notion: NotionChapter,
  stats: MergeStats,
): V205ChapterData {
  const out: V205ChapterData = {
    ...chapter,
    intro: chapter.intro.length ? chapter.intro : notion.intro,
    previously: chapter.previously.length ? chapter.previously : notion.previously,
    outline: chapter.outline.length ? chapter.outline : notion.outline,
    sections: chapter.sections.map((s) => ({ ...s, entries: s.entries.map((e) => ({ ...e, blocks: [...e.blocks] })) })),
  };

  // Section titles/ranges from Notion win when Notion has them.
  if (notion.sections.length) {
    const allEntries = out.sections.flatMap((s) => s.entries);
    out.sections = notion.sections.map((ns) => ({
      start: ns.start,
      end: ns.end,
      title: ns.title,
      entries: allEntries.filter((e) => e.start >= ns.start && e.start <= ns.end),
    }));
    const placed = new Set(out.sections.flatMap((s) => s.entries));
    const orphans = allEntries.filter((e) => !placed.has(e));
    if (orphans.length) {
      out.sections.push({
        start: orphans[0].start,
        end: orphans[orphans.length - 1].end,
        title: null,
        entries: orphans,
      });
    }
  }

  const findEntry = (start: number): V205Entry | null => {
    for (const s of out.sections) {
      for (const e of s.entries) {
        if (start >= e.start && start <= e.end) return e;
      }
    }
    return null;
  };

  for (const callout of notion.callouts) {
    const entry = findEntry(callout.entryStart);
    if (!entry) continue;
    if (callout.kind === 'scripture') {
      const dupe = entry.blocks.some(
        (b) => b.kind === 'scripture' && b.ref === callout.ref &&
          normalizeForMatch(b.text).slice(0, 60) === normalizeForMatch(callout.text).slice(0, 60),
      );
      if (dupe) { stats.calloutsDeduped++; continue; }
    }
    // Try to carve the callout out of a paragraph (his Notion callouts are
    // sentence extracts of the same prose the txt carries in full).
    let placed = false;
    for (let bi = 0; bi < entry.blocks.length && !placed; bi++) {
      const b = entry.blocks[bi];
      if (b.kind !== 'para') continue;
      const split = splitParaAtCallout(b, callout.text);
      if (split) {
        const replacement: V205Block[] = [];
        if (split.before) replacement.push({ kind: 'para', text: split.before });
        replacement.push({ kind: callout.kind, text: callout.text, ref: callout.ref });
        if (split.after) replacement.push({ kind: 'para', text: split.after });
        entry.blocks.splice(bi, 1, ...replacement);
        placed = true;
        stats.calloutsSplitFromText++;
      }
    }
    if (!placed) {
      // His Notion words stand on their own at the end of the entry's
      // blocks — structure preserved, nothing silently dropped.
      entry.blocks.push({ kind: callout.kind, text: callout.text, ref: callout.ref });
      stats.calloutsInsertedUnmatched++;
    }
    stats.calloutsPlaced++;
  }
  return out;
}

// ─── Studies CSVs ────────────────────────────────────────────────────────────

export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function statusFromLabel(label: string): StudyStatus {
  switch (label.trim().toLowerCase()) {
    case 'complete': return 'complete';
    case 'in progress': return 'in-progress';
    case 'write': return 'write';
    case 'restudy': return 'restudy';
    case 'not started': return 'not-started';
    default: return 'none';
  }
}

const STATUS_RANK: Record<StudyStatus, number> = {
  complete: 5, restudy: 4, 'in-progress': 3, write: 2, 'not-started': 1, none: 0,
};

/** Parse one book's status CSV (schema Book, Chapter, Status), deduped by
 * chapter — when a chapter is double-listed (Exodus), the stronger status
 * wins and a real status always beats "None". */
export function parseStatusCsv(csv: string): { chapter: number; status: StudyStatus }[] {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  const byChapter = new Map<number, StudyStatus>();
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    if (cells.length < 3) continue;
    const cm = cells[1].match(/(\d+)/);
    if (!cm) continue;
    const chapter = parseInt(cm[1], 10);
    const status = statusFromLabel(cells[2]);
    const prev = byChapter.get(chapter);
    if (!prev || STATUS_RANK[status] > STATUS_RANK[prev]) byChapter.set(chapter, status);
  }
  return [...byChapter.entries()]
    .map(([chapter, status]) => ({ chapter, status }))
    .sort((a, b) => a.chapter - b.chapter);
}

/** Parse a Current/Next queue CSV (schema Assignment, Chapter, Status, Date). */
export function parseQueueCsv(csv: string): { book: string; chapter: number }[] {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  const out: { book: string; chapter: number }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    if (cells.length < 2) continue;
    const book = cells[0].replace(/\s+Notes\s*$/i, '').trim();
    const cm = cells[1].match(/(\d+)/);
    if (!book || !cm) continue;
    out.push({ book, chapter: parseInt(cm[1], 10) });
  }
  return out;
}
