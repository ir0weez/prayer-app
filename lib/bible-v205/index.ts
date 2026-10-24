// ─── v205 Bible build — runtime accessors ────────────────────────────────────
// Pure helpers over the generated commentary data: chapter display model,
// Stories screen derivation, and the Highlight-first notes search. Kept
// free of React Native imports so the unit tests exercise exactly what
// the screens render.

import { COMMENTARY_DATA } from './data/index';
import { chapterStatus, type StudyState } from './study';
import { entrySourceCategory } from './categories';
import { lineText, marksFor, normalizeMarks, type EntryMarks, type KeeperField, type MarksMap, type TintColor } from './marks';
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

export { COMMENTARY_DATA };
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

/** v206: books carrying any state HE set in the app (an override or a
 * queue he built), canon order. This is the Books view's progress
 * group — computed from the study store alone. (v205 grouped by his
 * Notion databases via databaseBooks/bookStudySummary/seedStatus;
 * those helpers are gone with the seed they read.) */
export function booksWithProgress(state: StudyState, canon: string[]): string[] {
  return canon.filter((book) => {
    const total = chapterCountFor(book);
    for (let c = 1; c <= total; c++) {
      if (chapterStatus(state, book, c) !== 'none') return true;
    }
    return false;
  });
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

/** v207: verses per Stories slide for a chapter with nothing to pace
 * by — his ruling (2026-10-23): 3 verses each, the last slide takes
 * the remainder. */
export const BARE_STORY_CHUNK = 3;

/**
 * v207: a chapter with NEITHER commentary sections NOR his txt story
 * groupings — nothing in it can pace Stories. Grouped-but-noteless
 * chapters (Ecclesiastes 3–12: his groupings, zero comments) are NOT
 * bare: his groupings win exactly as they always have, and chapters
 * carrying his notes are never bare either.
 */
export function isBareChapter(chapter: V205ChapterData | null): boolean {
  return !chapter || (chapter.sections.length === 0 && chapter.stories.length === 0);
}

function chunkRun(start: number, end: number, size: number): DisplayEntry[] {
  const out: DisplayEntry[] = [];
  for (let v = start; v <= end; v += size) {
    out.push({ start: v, end: Math.min(v + size - 1, end), blocks: [], verseOnly: true });
  }
  return out;
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
  // v207: on a BARE chapter (no notes, no groupings — isBareChapter)
  // the plain run is chunked into ≤3-verse entries so Stories still
  // paces it slide by slide; on any chapter with his notes or his
  // groupings the run stays a single entry, exactly as before.
  const bare = isBareChapter(chapter);
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
          entries: bare
            ? chunkRun(start, v - 1, BARE_STORY_CHUNK)
            : [{ start, end: v - 1, blocks: [], verseOnly: true }],
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

/**
 * v207: merge consecutive verse-only entries inside each section into
 * runs of at most `size` verses. Read-only sections stay per-verse by
 * design (the reader's marking granularity — verse entries are the
 * pinned shape); this merge is applied ONLY to the sections handed to
 * Stories on a bare chapter in read-only mode, so Stories there walks
 * the same ≤3-verse slides the with-notes fallback builds, instead of
 * an unpaced run of single verses. Entries carrying blocks are never
 * merged, and merges never cross a section boundary — his groupings
 * keep their shape.
 */
export function mergeVerseOnlyEntries(
  sections: DisplaySection[],
  size: number = BARE_STORY_CHUNK,
): DisplaySection[] {
  return sections.map((s) => {
    const entries: DisplayEntry[] = [];
    for (const e of s.entries) {
      const prev = entries[entries.length - 1];
      const open = prev && prev.verseOnly && prev.blocks.length === 0;
      const fits =
        open &&
        e.verseOnly &&
        e.blocks.length === 0 &&
        prev.end + 1 === e.start &&
        prev.end - prev.start + 1 + (e.end - e.start + 1) <= size;
      if (fits) entries[entries.length - 1] = { ...prev, end: e.end };
      else entries.push({ ...e });
    }
    return { ...s, entries };
  });
}

// ─── v210: '#' verse splitting ───────────────────────────────────────────────
// His notation, from his own notes: a user note (marks layer) that STARTS
// with "#N" or "#N-M" belongs to exactly those verses. The display honors
// it by splitting the entry it was written on: the referenced verses
// stand as their own entry carrying the note, the rest keep theirs.
// RENDER-TIME ONLY — marks storage and entry keys never change, the note
// text stays verbatim (prefix included), and editing the "#" away
// re-merges the display on the next render. Both the chapter page and
// Stories consume sections that passed through here, so they split
// identically.

const HASH_REF_RE = /^#(?!#)(\d{1,3})(?:[-–](\d{1,3}))?(?=\s|$)/;

/**
 * Parse a note's leading verse reference. STRICT by design, pinned
 * against his real notes: start-anchored only ("#1 thing" mid-sentence
 * means "number one" and never fires), a single "#" only ("##…" opens
 * his markdown headings and never fires), the reference must be followed
 * by whitespace or end-of-string, and a reversed range is not a
 * reference. Returns null when the text carries no reference.
 */
export function parseHashVerseRef(text: string): { start: number; end: number } | null {
  const m = HASH_REF_RE.exec(text);
  if (!m) return null;
  const start = parseInt(m[1], 10);
  const end = m[2] !== undefined ? parseInt(m[2], 10) : start;
  if (end < start) return null;
  return { start, end };
}

export interface SplitPiece {
  entry: DisplayEntry;
  marks: EntryMarks;
  /**
   * v214: for each marks field, the index into the PARENT entry's
   * stored array of every line this piece carries, in piece order.
   * The bubble layer writes through these coordinates: a line shown
   * on a piece may live on the parent record (derived here) or on a
   * record stored at the piece's own key (appended after these).
   * Identity (every line, in order) when the entry did not split.
   */
  origins: Record<KeeperField, number[]>;
}

/**
 * Split one display entry by the '#' references in its user marks.
 * Returns a single piece — the entry and marks objects untouched — when
 * nothing splits (no reference, out-of-span reference, or a reference
 * covering the whole span). Otherwise the pieces tile the entry's span
 * in verse order:
 *  - each claimed range becomes a piece carrying its note;
 *  - a note whose range overlaps an already-claimed range does not split
 *    further — it rides the piece containing its range's start verse;
 *  - everything else in the marks (kept, tint, category, non-'#' lines)
 *    and the entry's own blocks stay with the piece containing the
 *    entry's FIRST verse.
 * His lines are processed in stored order within each kind, kinds in
 * the order the page renders them under the verses: plain notes first,
 * then Highlights, then Main Thoughts. Plain notes (v210) split by
 * exactly the same rules.
 */
export function splitEntryByHashNotes(entry: DisplayEntry, entryMarks: EntryMarks): SplitPiece[] {
  // v214: lines travel as their stored values — an authored line
  // (v214 object form) keeps its author through the split untouched;
  // only the '#' reference reads the words.
  const notes: { field: KeeperField; line: EntryMarks['notes'][number]; fieldIndex: number; text: string }[] = [
    ...(entryMarks.notes ?? []).map((line, fieldIndex) => ({ field: 'notes' as const, line, fieldIndex, text: lineText(line) })),
    ...(entryMarks.highlights ?? []).map((line, fieldIndex) => ({ field: 'highlights' as const, line, fieldIndex, text: lineText(line) })),
    ...(entryMarks.thoughts ?? []).map((line, fieldIndex) => ({ field: 'thoughts' as const, line, fieldIndex, text: lineText(line) })),
  ];
  const claims: { start: number; end: number }[] = [];
  const roles = notes.map((n) => {
    const ref = parseHashVerseRef(n.text);
    if (!ref || ref.start < entry.start || ref.end > entry.end) return { type: 'plain' as const };
    if (claims.some((c) => ref.start <= c.end && ref.end >= c.start)) {
      return { type: 'ride' as const, verse: ref.start };
    }
    claims.push({ start: ref.start, end: ref.end });
    return { type: 'claim' as const, claim: claims.length - 1 };
  });

  const identityOrigins: Record<KeeperField, number[]> = {
    notes: (entryMarks.notes ?? []).map((_, i) => i),
    highlights: (entryMarks.highlights ?? []).map((_, i) => i),
    thoughts: (entryMarks.thoughts ?? []).map((_, i) => i),
  };
  if (claims.length === 0) return [{ entry, marks: entryMarks, origins: identityOrigins }];
  // A lone claim over the whole span changes nothing on screen.
  if (claims.length === 1 && claims[0].start === entry.start && claims[0].end === entry.end) {
    return [{ entry, marks: entryMarks, origins: identityOrigins }];
  }

  const sorted = [...claims].sort((a, b) => a.start - b.start);
  const segs: { start: number; end: number; claimIdx: number | null }[] = [];
  let cursor = entry.start;
  for (const c of sorted) {
    if (c.start > cursor) segs.push({ start: cursor, end: c.start - 1, claimIdx: null });
    segs.push({ start: c.start, end: c.end, claimIdx: claims.indexOf(c) });
    cursor = c.end + 1;
  }
  if (cursor <= entry.end) segs.push({ start: cursor, end: entry.end, claimIdx: null });

  const segForVerse = (v: number) => segs.findIndex((s) => v >= s.start && v <= s.end);
  const firstSeg = segForVerse(entry.start);

  // v212: verse tints PARTITION by verse — each piece carries only the
  // tints of the verses inside its own span, like the lines partition
  // by claim. (The entry tint, by contrast, stays whole on the
  // first-verse piece, above.)
  const verseTintsWithin = (start: number, end: number): Record<number, TintColor> => {
    const out: Record<number, TintColor> = {};
    for (const [k, hue] of Object.entries(entryMarks.verseTints ?? {})) {
      const v = Number(k);
      if (v >= start && v <= end) out[v] = hue as TintColor;
    }
    return out;
  };

  const pieceMarks: EntryMarks[] = segs.map((s, i) => ({
    kept: i === firstSeg ? entryMarks.kept : false,
    highlights: [],
    thoughts: [],
    notes: [],
    tint: i === firstSeg ? entryMarks.tint : null,
    verseTints: verseTintsWithin(s.start, s.end),
    category: i === firstSeg ? entryMarks.category : null,
  }));
  const pieceOrigins: Record<KeeperField, number[]>[] = segs.map(() => ({
    notes: [],
    highlights: [],
    thoughts: [],
  }));
  notes.forEach((n, i) => {
    const role = roles[i];
    let target = firstSeg;
    if (role.type === 'claim') target = segs.findIndex((s) => s.claimIdx === role.claim);
    else if (role.type === 'ride') target = segForVerse(role.verse);
    if (target < 0) target = firstSeg;
    pieceMarks[target][n.field].push(n.line);
    pieceOrigins[target][n.field].push(n.fieldIndex);
  });

  return segs.map((s, i) => {
    const blocks = i === firstSeg ? entry.blocks : [];
    return {
      entry: { ...entry, start: s.start, end: s.end, blocks, verseOnly: blocks.length === 0 },
      marks: pieceMarks[i],
      origins: pieceOrigins[i],
    };
  });
}

/** v214: where a split piece's displayed lines actually live. */
export interface SplitProvenance {
  /** The unsplit entry this piece was derived from. */
  parentStart: number;
  parentEnd: number;
  /** Per field, the parent record's array index of each derived line
   * this piece displays, in display order. */
  origins: Record<KeeperField, number[]>;
  /** Per field, how many lines displayed after the derived ones come
   * from a record stored directly at the piece's own key. */
  appended: Record<KeeperField, number>;
}

export interface SplitSectionsResult {
  sections: DisplaySection[];
  /** The stored map plus one derived record per split piece, keyed by
   * the piece's own entry key so every existing marks join (page,
   * Stories, index) resolves pieces unchanged. A record he stored
   * directly at a piece key (an edit made on the piece) wins the scalar
   * fields; its lines append after the derived ones. The stored map
   * itself is never mutated. When nothing splits, both halves of the
   * result are the inputs, by reference. */
  marks: MarksMap;
  /** v214: per split piece (keyed by the piece's entry key), the
   * storage provenance of its lines — see SplitProvenance. Entries
   * that did not split have no record here: their displayed lines
   * are their stored lines, index for index. */
  provenance: Record<string, SplitProvenance>;
}

export function splitSectionsByHashNotes(
  sections: DisplaySection[],
  marks: MarksMap,
  book: string,
  chapter: number,
): SplitSectionsResult {
  let changed = false;
  const augmented: MarksMap = { ...marks };
  const provenance: Record<string, SplitProvenance> = {};
  const outSections = sections.map((section) => {
    let sectionChanged = false;
    const entries: DisplayEntry[] = [];
    for (const entry of section.entries) {
      const pieces = splitEntryByHashNotes(entry, marksFor(marks, book, chapter, entry.start, entry.end));
      if (pieces.length === 1 && pieces[0].entry === entry) {
        entries.push(entry);
        continue;
      }
      sectionChanged = true;
      for (const piece of pieces) {
        entries.push(piece.entry);
        const key = entryKey(book, chapter, piece.entry.start, piece.entry.end);
        const atKey = marks[key] ? normalizeMarks(marks[key]) : null;
        provenance[key] = {
          parentStart: entry.start,
          parentEnd: entry.end,
          origins: piece.origins,
          appended: {
            notes: atKey ? atKey.notes.length : 0,
            highlights: atKey ? atKey.highlights.length : 0,
            thoughts: atKey ? atKey.thoughts.length : 0,
          },
        };
        augmented[key] = atKey
          ? {
              kept: atKey.kept,
              highlights: [...piece.marks.highlights, ...atKey.highlights],
              thoughts: [...piece.marks.thoughts, ...atKey.thoughts],
              notes: [...piece.marks.notes, ...atKey.notes],
              tint: atKey.tint,
              // The piece-key record is a direct edit on the piece —
              // its per-verse tints win over the partitioned parent's.
              verseTints: { ...piece.marks.verseTints, ...atKey.verseTints },
              category: atKey.category,
            }
          : piece.marks;
      }
    }
    if (!sectionChanged) return section;
    changed = true;
    return { ...section, entries };
  });
  if (!changed) return { sections, marks, provenance };
  return { sections: outSections, marks: augmented, provenance };
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
