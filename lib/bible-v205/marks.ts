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
  /** Tint applied to the entry's first commentary paragraph. */
  tint: TintColor | null;
  /**
   * His color-code category applied to this entry in the app (blue =
   * definition, red = quote, yellow = good thought, orange =
   * conversation, green = personal story). User layer, like every
   * mark: a commentary re-import can never touch it.
   */
  category: NoteCategory | null;
}

export type MarksMap = Record<string, EntryMarks>;

const EMPTY: EntryMarks = { kept: false, highlights: [], thoughts: [], notes: [], tint: null, category: null };

export function emptyMarks(): EntryMarks {
  return { ...EMPTY, highlights: [], thoughts: [], notes: [] };
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
