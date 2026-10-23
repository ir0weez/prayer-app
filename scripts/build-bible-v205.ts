/**
 * v205 data generator — run with: npx tsx scripts/build-bible-v205.ts
 *
 * Reads Jonathan's canonical commentary txt (WORDS, master) and his Notion
 * exports (STRUCTURE: introductions, section titles, Highlight / Main
 * Thought callouts, cross-reference placement) plus his Studies CSVs
 * (chapter states + Current/Next queues), and emits the data modules the
 * app ships under lib/bible-v205/data/ and lib/bible-v205/study-seed.ts.
 *
 * Source dirs default to the canonical stored copies; override with
 * COMMENTARY_TXT_DIR / NOTION_EXPORT_DIR when re-running elsewhere.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CANON_BOOKS,
  bookSlug,
  mergeNotionIntoChapter,
  parseCommentaryTxt,
  parseNotionChapterMd,
  parseQueueCsv,
  parseStatusCsv,
  type MergeStats,
} from '../lib/bible-v205/parse';
import type { StudyStatus, V205BookData, V205ChapterData } from '../lib/bible-v205/types';

const HOME = process.env.HOME ?? '';
const TXT_DIR =
  process.env.COMMENTARY_TXT_DIR ??
  join(HOME, 'workspace/goals/prayercircle-apk-build/hidden_files/commentary-txt');
const NOTION_DIR =
  process.env.NOTION_EXPORT_DIR ??
  join(HOME, 'workspace/goals/prayercircle-apk-build/hidden_files/notion-export');
const OUT_DIR = join(__dirname, '..', 'lib', 'bible-v205', 'data');

const report: string[] = [];
const log = (s: string) => report.push(s);

// ── 1. Parse the canonical txt set ──────────────────────────────────────────
const books = new Map<string, V205BookData>();
for (const file of readdirSync(TXT_DIR).filter((f) => f.endsWith('.txt')).sort()) {
  const parsed = parseCommentaryTxt(readFileSync(join(TXT_DIR, file), 'utf8'));
  for (const book of parsed) {
    const existing = books.get(book.book);
    if (existing) {
      Object.assign(existing.chapters, book.chapters);
    } else {
      books.set(book.book, book);
    }
  }
}
log(`txt: ${books.size} books`);

// ── 2. Notion structure ─────────────────────────────────────────────────────
interface NotionSource {
  kind: 'commentary' | 'studies';
  chapters: Map<number, string>; // chapter -> markdown
}

function loadCommentaryChapters(book: string): NotionSource | null {
  const dir = join(NOTION_DIR, 'b', 'Commentary', book, 'Chapters');
  if (!existsSync(dir)) return null;
  const chapters = new Map<number, string>();
  for (const f of readdirSync(dir)) {
    const m = f.match(/^Chapter (\d+) /);
    if (m) chapters.set(parseInt(m[1], 10), readFileSync(join(dir, f), 'utf8'));
  }
  return chapters.size ? { kind: 'commentary', chapters } : null;
}

function sectionSignature(sections: { start: number; end: number }[]): string {
  return sections.map((s) => `${s.start}-${s.end}`).join(',');
}

function loadStudiesNotes(bookData: V205BookData): NotionSource | null {
  const fullList = join(NOTION_DIR, 'a', 'Studies', 'Full List');
  if (!existsSync(fullList)) return null;
  const folder = readdirSync(fullList).find((d) => d.replace(/^\d+\s+/, '') === bookData.book);
  if (!folder) return null;
  const dir = join(fullList, folder);
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  if (!files.length) return null;
  // Assign each notes page to a chapter by matching its section signature
  // against the txt chapter's sections/stories.
  const sigToChapter = new Map<string, number>();
  for (const [numStr, ch] of Object.entries(bookData.chapters)) {
    const num = parseInt(numStr, 10);
    sigToChapter.set(sectionSignature(ch.sections), num);
    sigToChapter.set(sectionSignature(ch.stories.map((s) => ({ start: s.start, end: s.end }))), num);
  }
  const chapters = new Map<number, string>();
  for (const f of files) {
    const md = readFileSync(join(dir, f), 'utf8');
    const parsed = parseNotionChapterMd(md);
    const sig = sectionSignature(parsed.sections);
    const num = sigToChapter.get(sig);
    if (num !== undefined && !chapters.has(num)) chapters.set(num, md);
  }
  return chapters.size ? { kind: 'studies', chapters } : null;
}

const stats: MergeStats = { calloutsPlaced: 0, calloutsSplitFromText: 0, calloutsInsertedUnmatched: 0, calloutsDeduped: 0 };
for (const bookData of books.values()) {
  // Commentary chapter pages win per chapter; Studies notes pages fill the
  // chapters the Commentary tree left as stubs (e.g. Genesis).
  const commentary = loadCommentaryChapters(bookData.book);
  const studies = loadStudiesNotes(bookData);
  if (!commentary && !studies) {
    log(`notion: ${bookData.book} — none (txt structure only)`);
    continue;
  }
  const kinds = new Set<string>();
  let mergedChapters = 0;
  const chapterNums = new Set([
    ...(commentary ? [...commentary.chapters.keys()] : []),
    ...(studies ? [...studies.chapters.keys()] : []),
  ]);
  for (const num of chapterNums) {
    const ch = bookData.chapters[num];
    if (!ch) continue;
    const usable = (md?: string) =>
      md !== undefined && md.replace(/^#.*$/gm, '').trim().length >= 40 ? md : undefined;
    const fromCommentary = usable(commentary?.chapters.get(num));
    const md = fromCommentary ?? usable(studies?.chapters.get(num));
    if (!md) continue;
    const notion = parseNotionChapterMd(md);
    if (!notion.sections.length && !notion.callouts.length && !notion.intro.length) continue;
    bookData.chapters[num] = mergeNotionIntoChapter(ch, notion, stats);
    kinds.add(fromCommentary ? 'commentary' : 'studies');
    mergedChapters++;
  }
  log(`notion: ${bookData.book} — ${[...kinds].join('+') || 'none'} structure merged into ${mergedChapters} chapters`);
}
log(
  `callouts: ${stats.calloutsPlaced} placed (${stats.calloutsSplitFromText} split out of txt paragraphs, ` +
    `${stats.calloutsInsertedUnmatched} inserted unmatched, ${stats.calloutsDeduped} deduped)`,
);

// ── 3. Studies CSVs → study seed ────────────────────────────────────────────
const fullList = join(NOTION_DIR, 'a', 'Studies', 'Full List');
const statuses: Record<string, Partial<Record<number, StudyStatus>>> = {};
const trackedChapters: Record<string, number> = {};
if (existsSync(fullList)) {
  for (const f of readdirSync(fullList)) {
    if (!f.endsWith('.csv') || f.endsWith('_all.csv')) continue;
    const csv = readFileSync(join(fullList, f), 'utf8');
    // The filename's book name is authoritative — the Book column inside
    // can differ ("Psalm Notes" for Psalms).
    const bookName = f
      .replace(/\.csv$/, '')
      .replace(/^\d+\s+/, '')
      .replace(/\s+[0-9a-f]{16,}.*$/i, '')
      .trim();
    if (!bookName || !(CANON_BOOKS as string[]).includes(bookName)) continue;
    const rows = parseStatusCsv(csv);
    if (!rows.length) continue;
    const map: Partial<Record<number, StudyStatus>> = {};
    for (const r of rows) map[r.chapter] = r.status;
    statuses[bookName] = map;
    trackedChapters[bookName] = rows.length;
  }
}
const readQueue = (sub: string) => {
  const dir = join(NOTION_DIR, 'a', 'Studies', sub);
  if (!existsSync(dir)) return [];
  const csvFile = readdirSync(dir).find((f) => f.endsWith('.csv') && !f.endsWith('_all.csv'));
  if (!csvFile) return [];
  return parseQueueCsv(readFileSync(join(dir, csvFile), 'utf8'));
};
const writeQueue = readQueue('Next');
const restudyQueue = readQueue('Current');
log(`csvs: ${Object.keys(statuses).length} books with chapter states; queues write=${writeQueue.length} restudy=${restudyQueue.length}`);

// ── 4. Emit ─────────────────────────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });
const indexLines: string[] = [
  '// AUTO-GENERATED by scripts/build-bible-v205.ts — do not edit by hand.',
  "import type { V205BookData } from '../types';",
];
const registry: string[] = [];
for (const bookData of [...books.values()].sort((a, b) => a.book.localeCompare(b.book))) {
  const slug = bookSlug(bookData.book);
  const chapterLines = Object.entries(bookData.chapters)
    .sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10))
    .map(([num, ch]) => `${JSON.stringify(num)}: ${JSON.stringify(ch)}`);
  const body = [
    '// AUTO-GENERATED by scripts/build-bible-v205.ts — do not edit by hand.',
    '// Words: Jonathan\'s canonical commentary txt. Structure: his Notion pages.',
    "import type { V205BookData } from '../types';",
    '',
    `export const DATA: V205BookData = {`,
    `  book: ${JSON.stringify(bookData.book)},`,
    `  display: ${JSON.stringify(bookData.display)},`,
    `  chapters: {`,
    ...chapterLines.map((l) => `    ${l},`),
    `  },`,
    `};`,
    '',
  ].join('\n');
  writeFileSync(join(OUT_DIR, `${slug}.ts`), body);
  const camel = slug.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()).replace(/-/g, '');
  const varName = /^[0-9]/.test(camel) ? `book${camel}` : camel;
  indexLines.push(`import { DATA as ${varName} } from './${slug}';`);
  registry.push(`  ${JSON.stringify(bookData.book)}: ${varName},`);
}
indexLines.push('', 'export const COMMENTARY_DATA: Record<string, V205BookData> = {', ...registry, '};', '');
writeFileSync(join(OUT_DIR, 'index.ts'), indexLines.join('\n'));

const seedBody = [
  '// AUTO-GENERATED by scripts/build-bible-v205.ts — do not edit by hand.',
  '// Chapter states + Current/Next queues, exactly as his Studies databases record them.',
  "import type { StudySeed } from './types';",
  '',
  `export const STUDY_SEED: StudySeed = ${JSON.stringify({ statuses, trackedChapters, writeQueue, restudyQueue }, null, 1)};`,
  '',
].join('\n');
writeFileSync(join(__dirname, '..', 'lib', 'bible-v205', 'study-seed.ts'), seedBody);

// ── 5. Diagnostics ──────────────────────────────────────────────────────────
for (const bookData of [...books.values()].sort((a, b) => a.book.localeCompare(b.book))) {
  const chs = Object.values(bookData.chapters) as V205ChapterData[];
  const entries = chs.reduce((n, c) => n + c.sections.reduce((m, s) => m + s.entries.length, 0), 0);
  const blocks = chs.reduce(
    (n, c) => n + c.sections.reduce((m, s) => m + s.entries.reduce((k, e) => k + e.blocks.length, 0), 0),
    0,
  );
  const noSections = chs.filter((c) => c.sections.length === 0).map((c) => c.chapter);
  log(
    `book: ${bookData.book} — ${chs.length} chapters, ${entries} entries, ${blocks} blocks` +
      (noSections.length ? `, NO SECTIONS in chapters: ${noSections.join(',')}` : ''),
  );
}
const cor1 = books.get('1 Corinthians')?.chapters[1];
if (cor1) {
  const flat = cor1.sections.flatMap((s) => s.entries);
  const e21 = flat.find((e) => e.start === 21);
  const e26 = flat.find((e) => e.start === 26);
  const e1 = flat.find((e) => e.start === 1);
  log(`pin 1 Cor 1:21 highlight: ${JSON.stringify(e21?.blocks.find((b) => b.kind === 'highlight')?.text)}`);
  log(`pin 1 Cor 1:26-29 highlight: ${JSON.stringify(e26?.blocks.filter((b) => b.kind === 'highlight').map((b) => b.text))}`);
  log(`pin 1 Cor 1:1 scripture refs: ${JSON.stringify(e1?.blocks.filter((b) => b.kind === 'scripture').map((b) => b.ref))}`);
  log(`pin 1 Cor 1 entries: ${flat.map((e) => `${e.start}-${e.end}`).join(' ')}`);
  log(`pin 1 Cor 1 sections: ${cor1.sections.map((s) => `${s.start}-${s.end}:${s.title}`).join(' | ')}`);
}
console.log(report.join('\n'));
