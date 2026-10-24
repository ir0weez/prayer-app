// ─── v205 user marks — his keeper system, grown inside the app ──────────────
// A separate layer over the commentary data, keyed by entry reference
// (book|chapter|start-end) — never by content. Re-importing or updating
// the commentary text therefore cannot wipe a mark: the data files are
// read-only inputs, and everything he adds lives here.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { entryKey, type NoteCategory } from './types';

export const MARKS_KEY = 'prayercircle.bible.v205.marks.v1';

export type TintColor = 'yellow' | 'rose' | 'green';

export interface EntryMarks {
  kept: boolean;
  /** His own Highlight lines (yellow callouts), in the order he added them. */
  highlights: string[];
  /** His own Main Thought lines (grey callouts). */
  thoughts: string[];
  /**
   * v210: his plain personal notes — no callout box, rendered as inset
   * body text like a commentary paragraph. Not everything he writes
   * down is a Highlight or a Main Thought (his words, 2026-10-23).
   */
  notes: string[];
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
   * His color-code category applied to this entry in the app (blue =
   * definition, red = quote, yellow = good thought, orange =
   * conversation, green = personal story). User layer, like every
   * mark: a commentary re-import can never touch it.
   */
  category: NoteCategory | null;
}

export type MarksMap = Record<string, EntryMarks>;

const EMPTY: EntryMarks = {
  kept: false,
  highlights: [],
  thoughts: [],
  notes: [],
  tint: null,
  verseTints: {},
  category: null,
};

export function emptyMarks(): EntryMarks {
  return { ...EMPTY, highlights: [], thoughts: [], notes: [], verseTints: {} };
}

const TINT_HUES: readonly string[] = ['yellow', 'rose', 'green'];

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
    highlights: Array.isArray(m.highlights) ? m.highlights : [],
    thoughts: Array.isArray(m.thoughts) ? m.thoughts : [],
    notes: Array.isArray(m.notes) ? m.notes : [],
    tint: m.tint ?? null,
    verseTints: sanitizeVerseTints(m.verseTints),
    category: m.category ?? null,
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
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
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
): MarksMap {
  const key = entryKey(book, chapter, start, end);
  // Normalize first: records stored before a field existed (e.g. notes,
  // added in v210) read with that field empty rather than undefined.
  const current = normalizeMarks(marks[key]);
  const field = kind === 'highlight' ? 'highlights' : kind === 'thought' ? 'thoughts' : 'notes';
  return { ...marks, [key]: { ...current, [field]: [...current[field], text] } };
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
