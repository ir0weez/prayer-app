// ─── v205 user marks — his keeper system, grown inside the app ──────────────
// A separate layer over the commentary data, keyed by entry reference
// (book|chapter|start-end) — never by content. Re-importing or updating
// the commentary text therefore cannot wipe a mark: the data files are
// read-only inputs, and everything he adds lives here.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeCategory } from './categories';
import { entryKey, type NoteCategory } from './types';

export const MARKS_KEY = 'prayercircle.bible.v205.marks.v1';

/**
 * The tint hues. v212 shipped three (yellow / rose / green); v361
 * grows the set to the six of his approved selection model (Oct 30):
 * blue, red and orange join. The stored keys of the original three
 * are unchanged, so every tint he already has reads back identically.
 */
export type TintColor = 'yellow' | 'rose' | 'green' | 'blue' | 'red' | 'orange';

/** The six hues in the order the selection bar offers them. */
export const TINT_ORDER: readonly TintColor[] = ['yellow', 'rose', 'green', 'blue', 'red', 'orange'];

/** The selection bar's solid dot for each hue (the mockup's dots). */
export const TINT_DOT_HEX: Record<TintColor, string> = {
  yellow: '#F5C542',
  rose: '#F08BB4',
  green: '#63BE82',
  blue: '#6EA8F0',
  red: '#F0766B',
  orange: '#F59E4C',
};

/**
 * v214: one user line, with the person who SAID it. A line he wrote
 * himself is stored as a plain string — no author means HIM (the
 * profile), which is also what every line stored before v214 reads
 * as. A line credited to someone in his People carries that person's
 * id (so their CURRENT photo/name resolve at render) plus a snapshot
 * of their name, which survives the person being deleted.
 */
export interface AuthoredLine {
  text: string;
  /** People person id; absent = the user themself. */
  authorId?: string;
  /** Name snapshot taken when the author was picked. */
  authorName?: string;
}

export type KeeperLine = string | AuthoredLine;

/** The authorship a composer pick stores on a line (null = Me). */
export interface LineAuthor {
  authorId: string;
  authorName: string;
}

/** A line's words, whether it is stored plain or authored. */
export function lineText(line: KeeperLine): string {
  return typeof line === 'string' ? line : line.text;
}

/** A line's authorship; null when the line is his own (or legacy). */
export function lineAuthor(line: KeeperLine): LineAuthor | null {
  if (typeof line === 'string') return null;
  if (!line.authorId) return null;
  return { authorId: line.authorId, authorName: line.authorName ?? '' };
}

/** Re-face (or un-face) a line: same words, new author. Credit
 * removed returns the line to its plain-string form. */
export function withLineAuthor(line: KeeperLine, author: LineAuthor | null): KeeperLine {
  const text = lineText(line);
  if (!author) return text;
  return { text, authorId: author.authorId, authorName: author.authorName };
}

/**
 * Stored lines read back clean: strings pass through (legacy = no
 * author), authored objects keep only their known fields, anything
 * else is dropped rather than rendered.
 */
export function normalizeLines(raw: unknown): KeeperLine[] {
  if (!Array.isArray(raw)) return [];
  const out: KeeperLine[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      out.push(item);
    } else if (item && typeof item === 'object' && typeof (item as AuthoredLine).text === 'string') {
      const o = item as AuthoredLine;
      const line: AuthoredLine = { text: o.text };
      if (typeof o.authorId === 'string' && o.authorId) line.authorId = o.authorId;
      if (typeof o.authorName === 'string' && o.authorName) line.authorName = o.authorName;
      out.push(line);
    }
  }
  return out;
}

/** v361: one drag-selected range of text wearing a tint. Offsets
 * are character positions in the target text, start < end. */
export interface PhraseHighlight {
  start: number;
  end: number;
  tint: TintColor;
}

/** v361: a phrase highlight on a verse's Scripture text. */
export interface VersePhraseHighlight extends PhraseHighlight {
  verse: number;
}

/** v361: a phrase highlight inside one of his own stored lines,
 * addressed by the line's storage coordinate on the same record. */
export interface LinePhraseHighlight extends PhraseHighlight {
  field: KeeperField;
  index: number;
}

export interface EntryMarks {
  kept: boolean;
  /** His own Highlight lines (yellow callouts), in the order he added them. */
  highlights: KeeperLine[];
  /** His own Main Thought lines (grey callouts). */
  thoughts: KeeperLine[];
  /**
   * v210: his plain personal notes — no callout box, rendered as inset
   * body text like a commentary paragraph. Not everything he writes
   * down is a Highlight or a Main Thought (his words, 2026-10-23).
   */
  notes: KeeperLine[];
  /**
   * Tint washed over the WHOLE entry — verses and body together
   * (v212; before that it painted only the first commentary paragraph
   * and landed nowhere at all on verse-only entries).
   */
  tint: TintColor | null;
  /**
   * v212: per-verse tints — verse number → hue key, same palette as
   * the entry tint. A verse tint is a highlighter stroke on that
   * verse's text alone, set by tapping the verse's number and then a
   * tint color in the markbar.
   */
  verseTints: Record<number, TintColor>;
  /**
   * v361: phrase highlights on the chapter's VERSES — drag-selected
   * ranges of the Scripture text itself. Offsets are character
   * positions inside that one verse's text (the verse number is not
   * part of the string), word-snapped at selection time. Stored on
   * the entry record like verseTints; the '#' split partitions them
   * by verse exactly as it partitions verseTints.
   */
  phraseHighlights: VersePhraseHighlight[];
  /**
   * v361: phrase highlights inside HIS OWN lines — ranges of a
   * stored line's body text, addressed by the line's storage
   * coordinate (field + index on THIS record). Unlike the verse
   * ranges these are never partitioned into split-piece records:
   * a displayed line resolves its highlights through its storage
   * target (resolveLineStorage) against the raw marks map, so the
   * ranges always sit on the record the line itself lives on.
   */
  lineHighlights: LinePhraseHighlight[];
  /**
   * His color-code category applied to this entry in the app (blue =
   * definition, red = quote, yellow = good thought, green = personal
   * story — the working set of four since v245; a pre-merge stored
   * 'conversation' normalizes to personal-story at load). User layer,
   * like every mark: a commentary re-import can never touch it.
   */
  category: NoteCategory | null;
}

export type MarksMap = Record<string, EntryMarks>;

/**
 * v356: the people most often credited on his stored lines — the
 * note composer's Top 5. Counts author ids across every entry's
 * highlights, thoughts and notes in the marks map (the attribution
 * the composer itself has stored since v214 — no invented signal).
 * Most-credited first; ties break by the credited name, then id,
 * so the order is deterministic. Returns person ids.
 */
export function rankedAuthorIds(marks: MarksMap, limit = 5): string[] {
  const counts = new Map<string, { count: number; name: string }>();
  for (const entry of Object.values(marks)) {
    for (const line of [...entry.highlights, ...entry.thoughts, ...entry.notes]) {
      const author = lineAuthor(line);
      if (!author) continue;
      const prev = counts.get(author.authorId);
      counts.set(author.authorId, {
        count: (prev?.count ?? 0) + 1,
        name: author.authorName || prev?.name || '',
      });
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[1].name.localeCompare(b[1].name) || a[0].localeCompare(b[0]))
    .slice(0, Math.max(0, limit))
    .map(([id]) => id);
}

const EMPTY: EntryMarks = {
  kept: false,
  highlights: [],
  thoughts: [],
  notes: [],
  tint: null,
  verseTints: {},
  phraseHighlights: [],
  lineHighlights: [],
  category: null,
};

export function emptyMarks(): EntryMarks {
  return { ...EMPTY, highlights: [], thoughts: [], notes: [], verseTints: {}, phraseHighlights: [], lineHighlights: [] };
}

const TINT_HUES: readonly string[] = ['yellow', 'rose', 'green', 'blue', 'red', 'orange'];

const KEEPER_FIELDS: readonly string[] = ['notes', 'highlights', 'thoughts'];

function validRange(raw: unknown): { start: number; end: number; tint: TintColor } | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as { start?: unknown; end?: unknown; tint?: unknown };
  if (!Number.isInteger(o.start) || !Number.isInteger(o.end)) return null;
  const start = o.start as number;
  const end = o.end as number;
  if (start < 0 || end <= start) return null;
  if (typeof o.tint !== 'string' || !TINT_HUES.includes(o.tint)) return null;
  return { start, end, tint: o.tint as TintColor };
}

/** Stored verse phrase highlights read back clean: known hues,
 * sane offsets, a real verse number — anything else is dropped. */
export function sanitizeVersePhraseHighlights(raw: unknown): VersePhraseHighlight[] {
  if (!Array.isArray(raw)) return [];
  const out: VersePhraseHighlight[] = [];
  for (const item of raw) {
    const base = validRange(item);
    const verse = (item as { verse?: unknown })?.verse;
    if (base && Number.isInteger(verse) && (verse as number) > 0) {
      out.push({ verse: verse as number, ...base });
    }
  }
  return out;
}

/** Stored line phrase highlights read back clean, same discipline. */
export function sanitizeLinePhraseHighlights(raw: unknown): LinePhraseHighlight[] {
  if (!Array.isArray(raw)) return [];
  const out: LinePhraseHighlight[] = [];
  for (const item of raw) {
    const base = validRange(item);
    const o = item as { field?: unknown; index?: unknown };
    if (base && typeof o?.field === 'string' && KEEPER_FIELDS.includes(o.field) && Number.isInteger(o?.index) && (o.index as number) >= 0) {
      out.push({ field: o.field as KeeperField, index: o.index as number, ...base });
    }
  }
  return out;
}

/** Stored verse tints read back clean: numeric verse keys, known hues only. */
export function sanitizeVerseTints(raw: unknown): Record<number, TintColor> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<number, TintColor> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = Number(k);
    if (Number.isInteger(n) && n > 0 && typeof v === 'string' && TINT_HUES.includes(v)) {
      out[n] = v as TintColor;
    }
  }
  return out;
}

/** Stored marks from before a field existed read as that field's empty value. */
export function normalizeMarks(m: Partial<EntryMarks> | undefined): EntryMarks {
  if (!m) return emptyMarks();
  return {
    kept: !!m.kept,
    highlights: normalizeLines(m.highlights),
    thoughts: normalizeLines(m.thoughts),
    notes: normalizeLines(m.notes),
    tint: m.tint ?? null,
    verseTints: sanitizeVerseTints(m.verseTints),
    phraseHighlights: sanitizeVersePhraseHighlights(m.phraseHighlights),
    lineHighlights: sanitizeLinePhraseHighlights(m.lineHighlights),
    // v245: a stored 'conversation' (pre-merge) reads as personal-story.
    category: normalizeCategory(m.category),
  };
}

export function marksFor(marks: MarksMap, book: string, chapter: number, start: number, end: number): EntryMarks {
  return marks[entryKey(book, chapter, start, end)] ?? EMPTY;
}

/** Entries whose source blocks carry a Highlight start out kept — that is
 * how his marked notes read on his Notion page (♥ lit in the margin). */
export function isKept(
  marks: MarksMap,
  book: string,
  chapter: number,
  start: number,
  end: number,
  sourceHasHighlight: boolean,
): boolean {
  const m = marks[entryKey(book, chapter, start, end)];
  if (m) return m.kept;
  return sourceHasHighlight;
}

export async function loadMarks(): Promise<MarksMap> {
  try {
    const raw = await AsyncStorage.getItem(MARKS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as MarksMap;
    if (typeof parsed !== 'object' || parsed === null) return {};
    // v245: the load IS the read boundary — every entry is normalized
    // on the way in (missing fields read as their empty values, and a
    // pre-merge 'conversation' category reads as personal-story), so
    // no consumer ever sees a raw stored shape. The next saveMarks on
    // any normal path persists the healed map; the stored file is
    // never rewritten wholesale behind his back.
    const healed: MarksMap = {};
    for (const [key, entry] of Object.entries(parsed)) {
      healed[key] = normalizeMarks(entry as Partial<EntryMarks>);
    }
    return healed;
  } catch {
    return {};
  }
}

export async function saveMarks(marks: MarksMap): Promise<void> {
  try {
    await AsyncStorage.setItem(MARKS_KEY, JSON.stringify(marks));
  } catch {
    // Storage failure leaves the in-memory marks intact for the session.
  }
}

export function withMarks(
  marks: MarksMap,
  book: string,
  chapter: number,
  start: number,
  end: number,
  patch: Partial<EntryMarks>,
): MarksMap {
  const key = entryKey(book, chapter, start, end);
  const current = marks[key] ?? emptyMarks();
  return { ...marks, [key]: { ...current, ...patch } };
}

export function toggleKept(
  marks: MarksMap,
  book: string,
  chapter: number,
  start: number,
  end: number,
  sourceHasHighlight: boolean,
): MarksMap {
  const key = entryKey(book, chapter, start, end);
  const current = marks[key] ?? { ...emptyMarks(), kept: sourceHasHighlight };
  return { ...marks, [key]: { ...current, kept: !current.kept } };
}

export function addKeeperLine(
  marks: MarksMap,
  book: string,
  chapter: number,
  start: number,
  end: number,
  kind: 'highlight' | 'thought' | 'note',
  text: string,
  author?: LineAuthor | null,
): MarksMap {
  const key = entryKey(book, chapter, start, end);
  // Normalize first: records stored before a field existed (e.g. notes,
  // added in v210) read with that field empty rather than undefined.
  const current = normalizeMarks(marks[key]);
  const field = kind === 'highlight' ? 'highlights' : kind === 'thought' ? 'thoughts' : 'notes';
  // v214: his own line stays a plain string; a credited line stores
  // the author object.
  const line: KeeperLine = author ? { text, authorId: author.authorId, authorName: author.authorName } : text;
  return { ...marks, [key]: { ...current, [field]: [...current[field], line] } };
}

export type KeeperField = 'notes' | 'highlights' | 'thoughts';

/**
 * v214: rewrite one stored line in place — new words and/or a new
 * author (the open bubble's edit + re-face path). The target is a
 * STORAGE coordinate (see resolveLineStorage in bubbles.ts: a line
 * displayed on a split piece may live on the parent entry's record).
 * Out-of-range targets change nothing.
 */
export function updateKeeperLineAt(
  marks: MarksMap,
  book: string,
  chapter: number,
  start: number,
  end: number,
  field: KeeperField,
  index: number,
  patch: { text?: string; author?: LineAuthor | null },
): MarksMap {
  const key = entryKey(book, chapter, start, end);
  const current = normalizeMarks(marks[key]);
  if (index < 0 || index >= current[field].length) return marks;
  const lines = [...current[field]];
  let line = lines[index];
  // v361: a text edit retires the line's phrase highlights — their
  // offsets addressed the old words. A re-face (author only) keeps
  // them: the words never moved.
  let lineHighlights = current.lineHighlights;
  if (patch.text !== undefined && patch.text !== lineText(line)) {
    lineHighlights = lineHighlights.filter((h) => !(h.field === field && h.index === index));
  }
  if (patch.text !== undefined) {
    line = typeof line === 'string' ? patch.text : { ...line, text: patch.text };
  }
  if (patch.author !== undefined) {
    line = withLineAuthor(line, patch.author);
  }
  lines[index] = line;
  return { ...marks, [key]: { ...current, [field]: lines, lineHighlights } };
}

/** v214: remove one stored line (the open bubble's trash). */
export function removeKeeperLineAt(
  marks: MarksMap,
  book: string,
  chapter: number,
  start: number,
  end: number,
  field: KeeperField,
  index: number,
): MarksMap {
  const key = entryKey(book, chapter, start, end);
  const current = normalizeMarks(marks[key]);
  if (index < 0 || index >= current[field].length) return marks;
  const lines = current[field].filter((_, i) => i !== index);
  // v361: the removed line's phrase highlights go with it, and the
  // highlights of every line after it shift down one index, so each
  // range stays on the words it was made on.
  const lineHighlights = current.lineHighlights
    .filter((h) => !(h.field === field && h.index === index))
    .map((h) => (h.field === field && h.index > index ? { ...h, index: h.index - 1 } : h));
  return { ...marks, [key]: { ...current, [field]: lines, lineHighlights } };
}

/** Count of kept entries in one chapter — the ♥ N kept pill. */
export function keptCountForChapter(
  marks: MarksMap,
  book: string,
  chapter: number,
  entries: { start: number; end: number; sourceHasHighlight: boolean }[],
): number {
  return entries.filter((e) => isKept(marks, book, chapter, e.start, e.end, e.sourceHasHighlight)).length;
}

// ─── v212: verse-level tints — selection + resolution helpers ───────────────
// His interaction, in his words: "Tap a verse number to select it, then
// tap a tint color." Selection itself is ephemeral UI state in the
// chapter page (a per-entry set of verse numbers); everything that
// touches the stored marks lives here as pure functions so the rules
// are pinned by tests, not by component wiring.

/** Toggle one verse in a selection set. Returns a new array. */
export function toggleVerseInSelection(selected: readonly number[], verse: number): number[] {
  return selected.includes(verse) ? selected.filter((v) => v !== verse) : [...selected, verse];
}

/**
 * Apply a hue to every selected verse, per-verse toggle: a verse that
 * already carries the hue loses its tint; any other verse takes the
 * hue (replacing a different one). Verses outside the selection are
 * untouched. Returns a new record.
 */
export function applyTintToSelection(
  verseTints: Record<number, TintColor>,
  selected: readonly number[],
  hue: TintColor,
): Record<number, TintColor> {
  const out = { ...verseTints };
  for (const v of selected) {
    if (out[v] === hue) delete out[v];
    else out[v] = hue;
  }
  return out;
}

/** Split an entry key ("Book|chapter|start-end") back into its parts. */
export function parseEntryKey(key: string): { book: string; chapter: number; start: number; end: number } | null {
  const parts = key.split('|');
  if (parts.length !== 3) return null;
  const chapter = Number(parts[1]);
  const span = /^(\d+)-(\d+)$/.exec(parts[2]);
  if (!span || !Number.isInteger(chapter)) return null;
  return { book: parts[0], chapter, start: Number(span[1]), end: Number(span[2]) };
}

interface CoveringRecord {
  key: string;
  start: number;
  end: number;
  marks: EntryMarks;
}

/** Stored records in this chapter whose span covers [start, end],
 * most specific (smallest span) first. Includes an exact-span record. */
function coveringRecords(marks: MarksMap, book: string, chapter: number, start: number, end: number): CoveringRecord[] {
  const out: CoveringRecord[] = [];
  for (const [key, rec] of Object.entries(marks)) {
    const p = parseEntryKey(key);
    if (!p || p.book !== book || p.chapter !== chapter) continue;
    if (p.start <= start && p.end >= end) {
      out.push({ key, start: p.start, end: p.end, marks: normalizeMarks(rec) });
    }
  }
  return out.sort((a, b) => a.end - a.start - (b.end - b.start));
}

/**
 * The tint fields a rendered span should show. A record stored at the
 * span's own key is authoritative — this is what keeps a '#' split
 * piece from inheriting its parent entry's tint (the piece's derived
 * record is already in the display map). Only when NO record exists at
 * the span's key do covering records resolve it — that is the
 * read-only case, where per-verse entries meet marks stored on the
 * grouped with-notes entries. Among covering records the most
 * specific wins: per verse for verseTints, and for the entry tint.
 */
export function resolveTintFields(
  marks: MarksMap,
  book: string,
  chapter: number,
  start: number,
  end: number,
): { tint: TintColor | null; verseTints: Record<number, TintColor> } {
  const exact = marks[entryKey(book, chapter, start, end)];
  if (exact) {
    const m = normalizeMarks(exact);
    return { tint: m.tint, verseTints: m.verseTints };
  }
  const covering = coveringRecords(marks, book, chapter, start, end);
  const verseTints: Record<number, TintColor> = {};
  // Largest span first, so the most specific record wins each verse.
  for (const c of [...covering].reverse()) Object.assign(verseTints, c.marks.verseTints);
  const tinted = covering.find((c) => c.marks.tint !== null);
  return { tint: tinted ? tinted.marks.tint : null, verseTints };
}

/**
 * The span a tint write for a rendered span should land on when the
 * span itself holds no record: the most specific stored record
 * covering it (so read-only writes land where read-only reads), or
 * null when nothing covers it.
 */
export function findCoveringTintSpan(
  marks: MarksMap,
  book: string,
  chapter: number,
  start: number,
  end: number,
): { start: number; end: number } | null {
  const covering = coveringRecords(marks, book, chapter, start, end);
  return covering.length ? { start: covering[0].start, end: covering[0].end } : null;
}

/**
 * Remove verse tints from every stored record covering those verses,
 * except one key (the record a write just landed on). A removal made
 * on a split piece or a read-only verse must also leave the parent /
 * grouped record it was resolved from, or the covering resolution
 * would paint the tint straight back.
 */
// ─── v361: phrase highlights — apply / resolve / scrub ──────────────────────
// His interaction, in his words: "Drag across the words" — in the
// Bible, or in his own notes — "and the little bar offers six
// colours, a bubble, or a note." Selection itself is ephemeral UI
// state in the components; everything that touches the stored marks
// lives here as pure functions, pinned by tests like the v212 rules.

const rangesOverlap = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
  aStart < bEnd && bStart < aEnd;

/**
 * Apply a hue to a drag-selected range of one verse. An exact
 * re-selection of a range already wearing this hue lifts it (the
 * v212 toggle, at phrase grain); any other application strips the
 * ranges it overlaps on that verse and lays the new one down, so a
 * verse's ranges never stack. Other verses are untouched.
 */
export function applyVersePhraseHighlight(
  list: readonly VersePhraseHighlight[],
  range: VersePhraseHighlight,
): VersePhraseHighlight[] {
  const exact = list.find(
    (h) => h.verse === range.verse && h.start === range.start && h.end === range.end && h.tint === range.tint,
  );
  if (exact) {
    return list.filter((h) => h !== exact);
  }
  const kept = list.filter(
    (h) => !(h.verse === range.verse && rangesOverlap(h.start, h.end, range.start, range.end)),
  );
  return [...kept, range].sort((a, b) => a.verse - b.verse || a.start - b.start);
}

/** The same application inside one of his own lines (field + index
 * on the line's storage record): toggle on an exact re-selection,
 * strip overlaps on that line only, never touch another line. */
export function applyLinePhraseHighlight(
  list: readonly LinePhraseHighlight[],
  target: { field: KeeperField; index: number },
  range: PhraseHighlight,
): LinePhraseHighlight[] {
  const mine = (h: LinePhraseHighlight) => h.field === target.field && h.index === target.index;
  const exact = list.find(
    (h) => mine(h) && h.start === range.start && h.end === range.end && h.tint === range.tint,
  );
  if (exact) {
    return list.filter((h) => h !== exact);
  }
  const kept = list.filter((h) => !(mine(h) && rangesOverlap(h.start, h.end, range.start, range.end)));
  return [...kept, { field: target.field, index: target.index, ...range }].sort(
    (a, b) => a.start - b.start,
  );
}

/** The phrase highlights one stored line carries (its storage
 * record's list, addressed by the line's own coordinate). */
export function lineHighlightsFor(
  marks: MarksMap,
  book: string,
  chapter: number,
  target: { start: number; end: number; field: KeeperField; index: number },
): PhraseHighlight[] {
  const rec = normalizeMarks(marks[entryKey(book, chapter, target.start, target.end)]);
  return rec.lineHighlights
    .filter((h) => h.field === target.field && h.index === target.index)
    .map(({ start, end, tint }) => ({ start, end, tint }));
}

/**
 * The verse phrase highlights a rendered span should show — the
 * resolveTintFields discipline, at phrase grain: a record stored at
 * the span's own key is authoritative (that is what keeps a '#'
 * split piece from inheriting its parent's ranges — the partition
 * in splitEntryByHashNotes already dealt the piece its own); only
 * when NO record exists at the span's key do covering records
 * resolve it, most specific winning per identical range.
 */
export function resolvePhraseHighlights(
  marks: MarksMap,
  book: string,
  chapter: number,
  start: number,
  end: number,
): VersePhraseHighlight[] {
  const within = (list: readonly VersePhraseHighlight[]) =>
    list.filter((h) => h.verse >= start && h.verse <= end);
  const exact = marks[entryKey(book, chapter, start, end)];
  if (exact) {
    return within(normalizeMarks(exact).phraseHighlights);
  }
  const covering = coveringRecords(marks, book, chapter, start, end);
  const byKey = new Map<string, VersePhraseHighlight>();
  // Largest span first, so the most specific record wins a range.
  for (const c of [...covering].reverse()) {
    for (const h of within(c.marks.phraseHighlights)) {
      byKey.set(`${h.verse}:${h.start}:${h.end}`, h);
    }
  }
  return [...byKey.values()].sort((a, b) => a.verse - b.verse || a.start - b.start);
}

/**
 * Remove verse phrase highlights overlapping a range from every
 * stored record covering that verse, except one key (the record a
 * write just landed on) — the scrubVerseTints discipline, so a
 * range stripped on the write record cannot be repainted by the
 * covering resolution from a parent or sibling record.
 */
export function scrubPhraseHighlights(
  marks: MarksMap,
  book: string,
  chapter: number,
  verse: number,
  selStart: number,
  selEnd: number,
  exceptKey: string,
): MarksMap {
  let out = marks;
  for (const [key, rec] of Object.entries(marks)) {
    if (key === exceptKey) continue;
    const p = parseEntryKey(key);
    if (!p || p.book !== book || p.chapter !== chapter) continue;
    if (verse < p.start || verse > p.end) continue;
    const current = normalizeMarks(rec);
    const hit = current.phraseHighlights.some(
      (h) => h.verse === verse && rangesOverlap(h.start, h.end, selStart, selEnd),
    );
    if (!hit) continue;
    const phraseHighlights = current.phraseHighlights.filter(
      (h) => !(h.verse === verse && rangesOverlap(h.start, h.end, selStart, selEnd)),
    );
    out = { ...out, [key]: { ...current, phraseHighlights } };
  }
  return out;
}

export function scrubVerseTints(
  marks: MarksMap,
  book: string,
  chapter: number,
  verses: readonly number[],
  exceptKey: string,
): MarksMap {
  let out = marks;
  for (const [key, rec] of Object.entries(marks)) {
    if (key === exceptKey) continue;
    const p = parseEntryKey(key);
    if (!p || p.book !== book || p.chapter !== chapter) continue;
    const current = normalizeMarks(rec);
    const hit = verses.filter((v) => v >= p.start && v <= p.end && current.verseTints[v] !== undefined);
    if (!hit.length) continue;
    const verseTints = { ...current.verseTints };
    for (const v of hit) delete verseTints[v];
    out = { ...out, [key]: { ...current, verseTints } };
  }
  return out;
}
