// ─── v205 Bible build — runtime accessors ────────────────────────────────────
// Pure helpers over the generated commentary data: chapter display model,
// Stories screen derivation, and the Highlight-first notes search. Kept
// free of React Native imports so the unit tests exercise exactly what
// the screens render.

import { COMMENTARY_DATA } from './data/index';
import { STUDY_SEED } from './study-seed';
import { entrySourceCategory } from './categories';
import {
  entryKey,
  type NoteCategory,
  type StudyStatus,
  type V205Block,
  type V205BookData,
  type V205ChapterData,
  type V205Entry,
  type V205Section,
} from './types';

export { COMMENTARY_DATA, STUDY_SEED };
export * from './types';

export function getBookData(book: string): V205BookData | null {
  return COMMENTARY_DATA[book] ?? null;
}

export function hasCommentary(book: string): boolean {
  return book in COMMENTARY_DATA;
}

/** Chapter counts for the whole canon — grids and prev/next navigation. */
export const CHAPTER_COUNTS: Record<string, number> = {
  Genesis: 50, Exodus: 40, Leviticus: 27, Numbers: 36, Deuteronomy: 34, Joshua: 24,
  Judges: 21, Ruth: 4, '1 Samuel': 31, '2 Samuel': 24, '1 Kings': 22, '2 Kings': 25,
  '1 Chronicles': 29, '2 Chronicles': 36, Ezra: 10, Nehemiah: 13, Esther: 10, Job: 42,
  Psalms: 150, Proverbs: 31, Ecclesiastes: 12, 'Song of Solomon': 8, Isaiah: 66,
  Jeremiah: 52, Lamentations: 5, Ezekiel: 48, Daniel: 12, Hosea: 14, Joel: 3, Amos: 9,
  Obadiah: 1, Jonah: 4, Micah: 7, Nahum: 3, Habakkuk: 3, Zephaniah: 3, Haggai: 2,
  Zechariah: 14, Malachi: 4, Matthew: 28, Mark: 16, Luke: 24, John: 21, Acts: 28,
  Romans: 16, '1 Corinthians': 16, '2 Corinthians': 13, Galatians: 6, Ephesians: 6,
  Philippians: 4, Colossians: 4, '1 Thessalonians': 5, '2 Thessalonians': 3,
  '1 Timothy': 6, '2 Timothy': 4, Titus: 3, Philemon: 1, Hebrews: 13, James: 5,
  '1 Peter': 5, '2 Peter': 3, '1 John': 5, '2 John': 1, '3 John': 1, Jude: 1, Revelation: 22,
};

/** Chapters to show for a book: the canon count, extended by his data. */
export function chapterCountFor(book: string): number {
  const data = COMMENTARY_DATA[book];
  const canon = CHAPTER_COUNTS[book] ?? 0;
  if (!data) return canon;
  const maxKey = Math.max(0, ...Object.keys(data.chapters).map((k) => parseInt(k, 10) || 0));
  return Math.max(canon, maxKey);
}

/** How many chapters of a book actually carry his notes. */
export function notesChapterCount(book: string): number {
  const data = COMMENTARY_DATA[book];
  return data ? Object.keys(data.chapters).length : 0;
}

export function getChapterData(book: string, chapter: number): V205ChapterData | null {
  return COMMENTARY_DATA[book]?.chapters[chapter] ?? null;
}

/** Books with his chapter notes, in canon order relative to the input list. */
export function notesBooks(canon: string[]): string[] {
  return canon.filter((b) => b in COMMENTARY_DATA);
}

/** Books his Studies databases track (chapter states), canon order. */
export function databaseBooks(canon: string[]): string[] {
  return canon.filter((b) => b in STUDY_SEED.statuses);
}

export interface BookStudySummary {
  tracked: number;
  counts: Partial<Record<StudyStatus, number>>;
}

export function bookStudySummary(book: string): BookStudySummary | null {
  const map = STUDY_SEED.statuses[book];
  if (!map) return null;
  const counts: Partial<Record<StudyStatus, number>> = {};
  for (const s of Object.values(map)) {
    if (s) counts[s] = (counts[s] ?? 0) + 1;
  }
  return { tracked: STUDY_SEED.trackedChapters[book] ?? Object.keys(map).length, counts };
}

export function seedStatus(book: string, chapter: number): StudyStatus {
  return STUDY_SEED.statuses[book]?.[chapter] ?? 'none';
}

// ─── Display model ───────────────────────────────────────────────────────────
// The chapter page renders ENTRIES: a verse (or his grouped run of verses)
// with its blocks beneath. Where his commentary covers only some verses
// of a range — or none of them (a noteless chapter) — verse-only entries
// fill the gaps so the page is always the full chapter, never a dead end.

export interface DisplayEntry extends V205Entry {
  /** True when the entry carries none of his commentary blocks. */
  verseOnly: boolean;
}

export interface DisplaySection extends Omit<V205Section, 'entries'> {
  entries: DisplayEntry[];
}

export function buildDisplaySections(
  chapter: V205ChapterData | null,
  verseCount: number,
): DisplaySection[] {
  const sections: DisplaySection[] = [];
  const covered = new Set<number>();
  if (chapter) {
    for (const s of chapter.sections) {
      const entries: DisplayEntry[] = s.entries.map((e) => ({ ...e, verseOnly: e.blocks.length === 0 }));
      // Fill gaps inside the section range with verse-only entries.
      const filled: DisplayEntry[] = [];
      let cursor = s.start;
      for (const e of [...entries].sort((a, b) => a.start - b.start)) {
        if (e.start > cursor) filled.push({ start: cursor, end: e.start - 1, blocks: [], verseOnly: true });
        filled.push(e);
        cursor = Math.max(cursor, e.end + 1);
      }
      if (cursor <= s.end && verseCount >= cursor) {
        filled.push({ start: cursor, end: Math.min(s.end, verseCount), blocks: [], verseOnly: true });
      }
      for (const e of filled) for (let v = e.start; v <= e.end; v++) covered.add(v);
      sections.push({ start: s.start, end: s.end, title: s.title, entries: filled });
    }
  }
  // Any verse not covered by a commentary section gets a plain section so
  // noteless chapters render whole.
  if (verseCount > 0 && covered.size < verseCount) {
    let start: number | null = null;
    for (let v = 1; v <= verseCount + 1; v++) {
      if (v <= verseCount && !covered.has(v)) {
        if (start === null) start = v;
      } else if (start !== null) {
        sections.push({
          start,
          end: v - 1,
          title: null,
          entries: [{ start, end: v - 1, blocks: [], verseOnly: true }],
        });
        start = null;
      }
    }
  }
  return sections.sort((a, b) => a.start - b.start);
}

/**
 * Read-only mode sections: the noteless-chapter reader generalized to
 * every chapter. Section breaks follow his txt "Bible Stories"
 * groupings (ranges only — no titles, no commentary), and every entry
 * is a single verse carrying no blocks at all, so nothing of his notes
 * can render while the marking tools stay live on every verse.
 */
export function buildReadOnlySections(
  chapter: V205ChapterData | null,
  verseCount: number,
): DisplaySection[] {
  if (verseCount <= 0) return [];
  const ranges: { start: number; end: number }[] = [];
  const stories = [...(chapter?.stories ?? [])].sort((a, b) => a.start - b.start);
  let cursor = 1;
  for (const r of stories) {
    const start = Math.max(r.start, cursor);
    const end = Math.min(r.end, verseCount);
    if (start > cursor) ranges.push({ start: cursor, end: start - 1 });
    if (end >= start) {
      ranges.push({ start, end });
      cursor = end + 1;
    }
  }
  if (cursor <= verseCount) ranges.push({ start: cursor, end: verseCount });
  if (!ranges.length) ranges.push({ start: 1, end: verseCount });
  return ranges.map((r) => ({
    start: r.start,
    end: r.end,
    title: null,
    entries: Array.from({ length: r.end - r.start + 1 }, (_, i) => ({
      start: r.start + i,
      end: r.start + i,
      blocks: [] as V205Block[],
      verseOnly: true,
    })),
  }));
}

/** All entries of a chapter in order, with their section title attached. */
export function flattenEntries(
  sections: DisplaySection[],
): { entry: DisplayEntry; sectionTitle: string | null; sectionStart: number; sectionEnd: number }[] {
  const out: { entry: DisplayEntry; sectionTitle: string | null; sectionStart: number; sectionEnd: number }[] = [];
  for (const s of sections) {
    for (const entry of s.entries) {
      out.push({ entry, sectionTitle: s.title, sectionStart: s.start, sectionEnd: s.end });
    }
  }
  return out;
}

export function entryHasHighlight(entry: V205Entry, userHighlightKeys: Set<string>, key: string): boolean {
  return entry.blocks.some((b) => b.kind === 'highlight') || userHighlightKeys.has(key);
}

export function entryHasScripture(entry: V205Entry): boolean {
  return entry.blocks.some((b) => b.kind === 'scripture');
}

// ─── Stories derivation ──────────────────────────────────────────────────────
// One cover screen, then per section a section card, then per entry a
// verse screen followed by its notes screen when the entry carries any of
// his words. An entry whose lead block is a Highlight gets the dedicated
// Highlight screen, like the mockup. Verses without notes flow straight
// on — no notes screen is ever inserted for them.

export type StoryScreen =
  | { t: 'cover' }
  | { t: 'section'; sectionStart: number; sectionEnd: number; title: string | null }
  | { t: 'verse'; entry: DisplayEntry; flowNote: boolean }
  | { t: 'notes'; entry: DisplayEntry }
  | { t: 'highlight'; entry: DisplayEntry }
  | { t: 'end' };

export function buildStoryScreens(sections: DisplaySection[]): StoryScreen[] {
  const screens: StoryScreen[] = [{ t: 'cover' }];
  let prevWasVerseOnly = false;
  for (const s of sections) {
    screens.push({ t: 'section', sectionStart: s.start, sectionEnd: s.end, title: s.title });
    for (const entry of s.entries) {
      screens.push({ t: 'verse', entry, flowNote: entry.verseOnly && !prevWasVerseOnly });
      prevWasVerseOnly = entry.verseOnly;
      if (!entry.verseOnly) {
        const lead = entry.blocks[0];
        if (lead && lead.kind === 'highlight') screens.push({ t: 'highlight', entry });
        else screens.push({ t: 'notes', entry });
      }
    }
  }
  screens.push({ t: 'end' });
  return screens;
}

// ─── Search — Highlight-first, scripture last ────────────────────────────────
// Mirrors the approved mockup: a reference query ("21", "1:21", "v27")
// goes straight to the verse; a word query answers with the entry's
// Highlight line first, then Main Thought, then commentary sentences —
// and only when his notes say nothing does the scripture text itself
// answer. Scoped to the open chapter, exactly like the mockup's sheet.

export interface SearchHit {
  entry: DisplayEntry;
  /** The line the result leads with. */
  display: string;
  tier: 'highlight' | 'thought' | 'commentary' | 'scripture';
  sectionTitle: string | null;
}

export function parseRefQuery(q: string, verseCount: number): number | null {
  const t = q.trim().toLowerCase();
  let m = t.match(/^(\d{1,3})$/);
  if (m) { const n = parseInt(m[1], 10); return n >= 1 && n <= verseCount ? n : -1; }
  m = t.match(/^v(?:er)?\.?\s*(\d{1,3})$/);
  if (m) { const n = parseInt(m[1], 10); return n >= 1 && n <= verseCount ? n : -1; }
  m = t.match(/(\d{1,3})\s*:\s*(\d{1,3})$/);
  if (m) { const n = parseInt(m[2], 10); return n >= 1 && n <= verseCount ? n : -1; }
  return null;
}

function sentencesMatching(blocks: V205Block[], kind: V205Block['kind'], terms: string[]): string | null {
  for (const b of blocks) {
    if (b.kind !== kind) continue;
    const lower = b.text.toLowerCase();
    if (terms.every((t) => lower.includes(t))) return b.text;
  }
  return null;
}

function firstSentenceWith(text: string, terms: string[]): string | null {
  const sentences = text.split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    const lower = s.toLowerCase();
    if (terms.every((t) => lower.includes(t))) return s;
  }
  return null;
}

export function searchChapter(
  sections: DisplaySection[],
  verses: { verse: number; text: string }[],
  query: string,
): SearchHit[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const hits: SearchHit[] = [];
  const verseText = new Map(verses.map((v) => [v.verse, v.text]));
  for (const { entry, sectionTitle } of flattenEntries(sections)) {
    const hl = sentencesMatching(entry.blocks, 'highlight', terms);
    if (hl) { hits.push({ entry, display: hl, tier: 'highlight', sectionTitle }); continue; }
    const th = sentencesMatching(entry.blocks, 'thought', terms);
    if (th) { hits.push({ entry, display: th, tier: 'thought', sectionTitle }); continue; }
    let cmt: string | null = null;
    for (const b of entry.blocks) {
      if (b.kind === 'para' || b.kind === 'conversation' || b.kind === 'scripture') {
        cmt = firstSentenceWith(b.text, terms);
        if (cmt) break;
      }
    }
    if (cmt) { hits.push({ entry, display: cmt, tier: 'commentary', sectionTitle }); continue; }
    // Scripture fallback: the verse text itself.
    for (let v = entry.start; v <= entry.end; v++) {
      const text = verseText.get(v);
      if (text && terms.every((t) => text.toLowerCase().includes(t))) {
        hits.push({ entry, display: text, tier: 'scripture', sectionTitle });
        break;
      }
    }
  }
  const tierRank = { highlight: 0, thought: 1, commentary: 2, scripture: 3 } as const;
  return hits.sort((a, b) => tierRank[a.tier] - tierRank[b.tier] || a.entry.start - b.entry.start);
}

// ─── Category browse — his color code as a search class ─────────────────────
// Each of his five categories is findable on its own: his yellow
// good-thoughts are his speaking material, and the same door serves
// the rest. An entry belongs to a category when he marked it so in the
// app (user layer wins) or when its own blocks carry the category —
// today that means his Highlight callouts (the yellow class). Imported
// text is otherwise uncategorized: never guessed from content.

export interface CategoryBrowseHit {
  entry: DisplayEntry;
  display: string;
  sectionTitle: string | null;
}

export function browseCategory(
  sections: DisplaySection[],
  verses: { verse: number; text: string }[],
  book: string,
  chapter: number,
  category: NoteCategory,
  userCategories: Map<string, NoteCategory | null>,
): CategoryBrowseHit[] {
  const verseText = new Map(verses.map((v) => [v.verse, v.text]));
  const hits: CategoryBrowseHit[] = [];
  for (const { entry, sectionTitle } of flattenEntries(sections)) {
    const key = entryKey(book, chapter, entry.start, entry.end);
    const effective = userCategories.get(key) ?? entrySourceCategory(entry.blocks);
    if (effective !== category) continue;
    let display = '';
    if (category === 'good-thought') {
      display = entry.blocks.find((b) => b.kind === 'highlight')?.text ?? '';
    }
    if (!display) display = entry.blocks[0]?.text ?? '';
    if (!display) display = verseText.get(entry.start) ?? '';
    hits.push({ entry, display, sectionTitle });
  }
  return hits;
}
