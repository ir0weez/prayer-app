// ─── v417 "Mark Changes, By Name Only" — the studioMarkChanges bridge ──────
// Until v417 the marks layer (marks.ts: his tints, phrase highlights,
// line highlights, block highlights) was import-proof BY RULE: no
// import could add, remove, or alter a phone highlight, so nothing he
// did to a highlight could ever leave the phone it was made on. The
// v390 block highlights did not even cross OUT — the v363 exporter had
// no array for them (that half is fixed in studio-import.ts: the
// studioHighlights section now carries blocks, and every item names
// the span of the record it came from).
//
// Jonathan's ruling (Nov 2): the Studio may EDIT his highlights and
// the edits come home — under a discipline that keeps the old rule's
// protection intact. The desk never sends a snapshot of the marks
// layer back. It sends a CHANGE LIST:
//
//   { id?, createdAt?, upserts: MarkChange[], removed: MarkChange[] }
//
// and the applier below merges it ITEM BY ITEM into the marks map.
// A change names exactly one highlight — its record (book, chapter,
// entry span) plus its own address inside that record — and can touch
// only that highlight:
//
//  · UPSERTS set the named highlight's hue, creating exactly that
//    highlight (or its record) when the phone doesn't hold it.
//  · REMOVALS ("tombstones", the ministries discipline) delete
//    exactly the named highlight. A removal naming something the
//    phone doesn't hold is a quiet no-op.
//  · NOTHING UNNAMED IS TOUCHED. Records the section doesn't address
//    are never written; on a record it does address, only the tint /
//    verseTints / phraseHighlights / lineHighlights / blockHighlights
//    field the change names is written — kept, notes, thoughts,
//    highlights, category are NEVER in this module's reach.
//  · Before ANY change lands, the applier stashes a one-deep rolling
//    snapshot of the whole pre-apply map (MARKS_SNAPSHOT_KEY), so a
//    bad change list is recoverable. An EMPTY change list writes no
//    snapshot and changes nothing.
//  · The merge is idempotent: applying the same section twice yields
//    the identical map.
//
// The section rides any file the One Door reads (parseStudioFileFull
// validates it COMPLETELY, like every other section — one malformed
// change rejects the whole file) and applies through both doors: the
// Settings import and the Drive folder check.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CHAPTER_COUNTS, chapterCountFor } from './index';
import {
  loadMarks,
  normalizeMarks,
  saveMarks,
  type EntryMarks,
  type KeeperField,
  type MarksMap,
  type TintColor,
} from './marks';
import { entryKey } from './types';

/** The one-deep rolling snapshot of the marks map, written before
 *  every non-empty mark-changes apply (see the header). */
export const MARKS_SNAPSHOT_KEY = 'prayercircle.bible.v205.marks.snapshot.v1';

// ── Wire shapes (the shared Studio contract) ───────────────────────────────
// One change, discriminated by kind. Every change is addressed to the
// marks record at entryKey(book, chapter, entryStart, entryEnd) — the
// same span the exporter's entryStart/entryEnd names — and then to
// exactly one highlight inside that record:
//   phrase — a verse phrase highlight, by (verse, start, end)
//   verse  — whole-verse tints over the verse span verseStart..verseEnd
//   entry  — the record's whole-entry tint
//   line   — a phrase highlight in one of his lines, by (field, index, start, end)
//   block  — a phrase highlight in a commentary block, by (block, start, end)
// `hue` is the six-key TintColor. Upserts must carry it; on removals
// it may be absent and is always ignored.

interface MarkChangeBase {
  book: string;
  chapter: number;
  entryStart: number;
  entryEnd: number;
  hue?: TintColor;
}

export interface PhraseMarkChange extends MarkChangeBase {
  kind: 'phrase';
  verse: number;
  start: number;
  end: number;
}

export interface VerseMarkChange extends MarkChangeBase {
  kind: 'verse';
  verseStart: number;
  verseEnd: number;
}

export interface EntryMarkChange extends MarkChangeBase {
  kind: 'entry';
}

export interface LineMarkChange extends MarkChangeBase {
  kind: 'line';
  field: KeeperField;
  index: number;
  start: number;
  end: number;
}

export interface BlockMarkChange extends MarkChangeBase {
  kind: 'block';
  block: number;
  start: number;
  end: number;
}

export type StudioMarkChange =
  | PhraseMarkChange
  | VerseMarkChange
  | EntryMarkChange
  | LineMarkChange
  | BlockMarkChange;

export interface StudioMarkChangesSection {
  /** The desk's id for this change list, when it gives one. */
  id?: string;
  /** When the desk made the list, when it says. */
  createdAt?: string;
  upserts: StudioMarkChange[];
  removed: StudioMarkChange[];
}

// ── Validation (the door's discipline: complete, or the file fails) ───────

const TINT_HUES: readonly string[] = ['yellow', 'rose', 'green', 'blue', 'red', 'orange'];
const KEEPER_FIELDS: readonly string[] = ['notes', 'highlights', 'thoughts'];
const MARK_CHANGE_KINDS: readonly string[] = ['phrase', 'verse', 'entry', 'line', 'block'];

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function fail(message: string): never {
  throw new Error(message);
}

function isInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v);
}

/** A char range the stored model can hold: whole offsets, 0 ≤ start < end. */
function validOffsets(raw: Record<string, unknown>, at: string): { start: number; end: number } {
  const { start, end } = raw;
  if (!isInt(start) || !isInt(end) || start < 0 || end <= start) {
    fail(`${at}: offsets must be whole numbers with 0 ≤ start < end.`);
  }
  return { start: start as number, end: end as number };
}

function validateMarkChange(raw: unknown, at: string, isUpsert: boolean): StudioMarkChange {
  if (!isRecord(raw)) fail(`${at}: expected an object.`);
  const kind = raw.kind;
  if (typeof kind !== 'string' || !MARK_CHANGE_KINDS.includes(kind)) {
    fail(`${at}: unknown kind "${String(kind)}"`);
  }
  const { book, chapter } = raw;
  if (typeof book !== 'string' || !(book in CHAPTER_COUNTS)) {
    fail(`${at}: unknown book "${String(book)}"`);
  }
  const total = chapterCountFor(book as string);
  if (!isInt(chapter) || chapter < 1 || chapter > total) {
    fail(`${at}: chapter ${String(chapter)} is outside ${book} (1–${total}).`);
  }
  // The owning record's span: verse spans live within 1–200; a start
  // of 0 is the chapter-prose pseudo-span (CHAPTER_PROSE_SPAN), which
  // only block changes can address in practice.
  const { entryStart, entryEnd } = raw;
  if (!isInt(entryStart) || !isInt(entryEnd) || entryStart < 0 || entryEnd < entryStart || entryEnd > 200) {
    fail(`${at}: the entry span (entryStart–entryEnd) is not a sane verse span.`);
  }
  // Hue: upserts must carry one of the six; a removal may omit it,
  // and when one rides it must still be a real hue (it is ignored).
  let hue: TintColor | undefined;
  if (raw.hue !== undefined) {
    if (typeof raw.hue !== 'string' || !TINT_HUES.includes(raw.hue)) {
      fail(`${at}: unknown hue "${String(raw.hue)}"`);
    }
    hue = raw.hue as TintColor;
  } else if (isUpsert) {
    fail(`${at}: an upsert must carry a hue.`);
  }
  const base: MarkChangeBase = {
    book: book as string,
    chapter: chapter as number,
    entryStart: entryStart as number,
    entryEnd: entryEnd as number,
    ...(hue !== undefined ? { hue } : {}),
  };
  switch (kind) {
    case 'phrase': {
      const { verse } = raw;
      if (!isInt(verse) || verse < 1 || verse > 200) {
        fail(`${at}: verse ${String(verse)} is outside 1–200.`);
      }
      const { start, end } = validOffsets(raw, at);
      return { ...base, kind: 'phrase', verse: verse as number, start, end };
    }
    case 'verse': {
      const { verseStart, verseEnd } = raw;
      if (!isInt(verseStart) || !isInt(verseEnd) || verseStart < 1 || verseEnd < verseStart || verseEnd > 200) {
        fail(`${at}: the verse span (verseStart–verseEnd) is outside 1–200.`);
      }
      return { ...base, kind: 'verse', verseStart: verseStart as number, verseEnd: verseEnd as number };
    }
    case 'entry':
      return { ...base, kind: 'entry' };
    case 'line': {
      const { field, index } = raw;
      if (typeof field !== 'string' || !KEEPER_FIELDS.includes(field)) {
        fail(`${at}: unknown line field "${String(field)}"`);
      }
      if (!isInt(index) || index < 0) {
        fail(`${at}: line index must be a whole number ≥ 0.`);
      }
      const { start, end } = validOffsets(raw, at);
      return { ...base, kind: 'line', field: field as KeeperField, index: index as number, start, end };
    }
    case 'block': {
      const { block } = raw;
      if (!isInt(block) || block < 0) {
        fail(`${at}: block index must be a whole number ≥ 0.`);
      }
      const { start, end } = validOffsets(raw, at);
      return { ...base, kind: 'block', block: block as number, start, end };
    }
    default:
      return fail(`${at}: unknown kind "${String(kind)}"`);
  }
}

/**
 * Validate a studioMarkChanges section COMPLETELY (the door's
 * discipline: a malformed section changes nothing). Accepts the
 * section object itself; returns the normalized section — the change
 * items rebuilt carrying only the fields their kind names.
 */
export function validateStudioMarkChanges(
  raw: unknown,
  where = 'studioMarkChanges',
): StudioMarkChangesSection {
  if (!isRecord(raw)) fail(`${where}: expected an object with upserts and removed lists.`);
  if (!Array.isArray(raw.upserts)) fail(`${where}: upserts must be a list.`);
  if (!Array.isArray(raw.removed)) fail(`${where}: removed must be a list.`);
  const section: StudioMarkChangesSection = {
    upserts: raw.upserts.map((c, i) => validateMarkChange(c, `${where} upsert ${i}`, true)),
    removed: raw.removed.map((c, i) => validateMarkChange(c, `${where} removal ${i}`, false)),
  };
  if (raw.id !== undefined) {
    if (typeof raw.id !== 'string') fail(`${where}: id must be text.`);
    section.id = raw.id;
  }
  if (raw.createdAt !== undefined) {
    if (typeof raw.createdAt !== 'string' || Number.isNaN(Date.parse(raw.createdAt))) {
      fail(`${where}: createdAt must be a readable time.`);
    }
    section.createdAt = raw.createdAt;
  }
  return section;
}

// ── The merge: item by item, by name only ──────────────────────────────────

export interface StudioMarkChangesSummary {
  /** Upserts applied (each one writes exactly the highlight it names). */
  upserted: number;
  /** Removals that removed something (a removal naming a missing
   *  highlight is a no-op and does not count). */
  removed: number;
  /** Distinct marks records written. */
  recordsTouched: number;
}

interface WorkingRecord {
  key: string;
  marks: EntryMarks;
  dirty: boolean;
}

/**
 * The pure merge core: apply a validated section to a marks map and
 * return the next map plus the counts. Only records the section
 * addresses are ever rebuilt; on those, only the one highlight field
 * each change names is written (see the header rules).
 */
export function mergeStudioMarkChanges(
  marks: MarksMap,
  section: StudioMarkChangesSection,
): { marks: MarksMap; summary: StudioMarkChangesSummary } {
  let next = marks;
  const touched = new Set<string>();
  let upserted = 0;
  let removed = 0;

  const open = (change: StudioMarkChange, create: boolean): WorkingRecord | null => {
    const key = entryKey(change.book, change.chapter, change.entryStart, change.entryEnd);
    const existing = next[key];
    if (!existing && !create) return null;
    return { key, marks: normalizeMarks(existing), dirty: false };
  };
  const close = (rec: WorkingRecord) => {
    if (!rec.dirty) return;
    next = { ...next, [rec.key]: rec.marks };
    touched.add(rec.key);
  };

  for (const change of section.upserts) {
    // Validation guarantees the hue on an upsert.
    const hue = change.hue as TintColor;
    const rec = open(change, true) as WorkingRecord;
    switch (change.kind) {
      case 'entry':
        rec.marks = { ...rec.marks, tint: hue };
        rec.dirty = true;
        break;
      case 'verse': {
        const verseTints = { ...rec.marks.verseTints };
        for (let v = change.verseStart; v <= change.verseEnd; v++) verseTints[v] = hue;
        rec.marks = { ...rec.marks, verseTints };
        rec.dirty = true;
        break;
      }
      case 'phrase': {
        const item = { verse: change.verse, start: change.start, end: change.end, tint: hue };
        const at = rec.marks.phraseHighlights.findIndex(
          (h) => h.verse === change.verse && h.start === change.start && h.end === change.end,
        );
        const phraseHighlights =
          at >= 0
            ? rec.marks.phraseHighlights.map((h, i) => (i === at ? item : h))
            : [...rec.marks.phraseHighlights, item];
        rec.marks = { ...rec.marks, phraseHighlights };
        rec.dirty = true;
        break;
      }
      case 'line': {
        const item = {
          field: change.field,
          index: change.index,
          start: change.start,
          end: change.end,
          tint: hue,
        };
        const at = rec.marks.lineHighlights.findIndex(
          (h) =>
            h.field === change.field &&
            h.index === change.index &&
            h.start === change.start &&
            h.end === change.end,
        );
        const lineHighlights =
          at >= 0
            ? rec.marks.lineHighlights.map((h, i) => (i === at ? item : h))
            : [...rec.marks.lineHighlights, item];
        rec.marks = { ...rec.marks, lineHighlights };
        rec.dirty = true;
        break;
      }
      case 'block': {
        const item = {
          surface: 'blocks' as const,
          index: change.block,
          start: change.start,
          end: change.end,
          tint: hue,
        };
        const at = rec.marks.blockHighlights.findIndex(
          (h) =>
            h.surface === 'blocks' &&
            h.index === change.block &&
            h.start === change.start &&
            h.end === change.end,
        );
        const blockHighlights =
          at >= 0
            ? rec.marks.blockHighlights.map((h, i) => (i === at ? item : h))
            : [...rec.marks.blockHighlights, item];
        rec.marks = { ...rec.marks, blockHighlights };
        rec.dirty = true;
        break;
      }
    }
    close(rec);
    upserted += 1;
  }

  for (const change of section.removed) {
    const rec = open(change, false);
    if (!rec) continue;
    switch (change.kind) {
      case 'entry':
        if (rec.marks.tint !== null) {
          rec.marks = { ...rec.marks, tint: null };
          rec.dirty = true;
        }
        break;
      case 'verse': {
        const verseTints = { ...rec.marks.verseTints };
        let hit = false;
        for (let v = change.verseStart; v <= change.verseEnd; v++) {
          if (verseTints[v] !== undefined) {
            delete verseTints[v];
            hit = true;
          }
        }
        if (hit) {
          rec.marks = { ...rec.marks, verseTints };
          rec.dirty = true;
        }
        break;
      }
      case 'phrase': {
        const phraseHighlights = rec.marks.phraseHighlights.filter(
          (h) => !(h.verse === change.verse && h.start === change.start && h.end === change.end),
        );
        if (phraseHighlights.length !== rec.marks.phraseHighlights.length) {
          rec.marks = { ...rec.marks, phraseHighlights };
          rec.dirty = true;
        }
        break;
      }
      case 'line': {
        const lineHighlights = rec.marks.lineHighlights.filter(
          (h) =>
            !(
              h.field === change.field &&
              h.index === change.index &&
              h.start === change.start &&
              h.end === change.end
            ),
        );
        if (lineHighlights.length !== rec.marks.lineHighlights.length) {
          rec.marks = { ...rec.marks, lineHighlights };
          rec.dirty = true;
        }
        break;
      }
      case 'block': {
        const blockHighlights = rec.marks.blockHighlights.filter(
          (h) =>
            !(
              h.surface === 'blocks' &&
              h.index === change.block &&
              h.start === change.start &&
              h.end === change.end
            ),
        );
        if (blockHighlights.length !== rec.marks.blockHighlights.length) {
          rec.marks = { ...rec.marks, blockHighlights };
          rec.dirty = true;
        }
        break;
      }
    }
    if (rec.dirty) {
      close(rec);
      removed += 1;
    }
  }

  return { marks: next, summary: { upserted, removed, recordsTouched: touched.size } };
}

/**
 * The door's applier: load the marks map, snapshot it, merge, save.
 * An empty change list is a true no-op — no snapshot, no write.
 * The snapshot is written BEFORE the merge runs, from the map exactly
 * as loaded; it overwrites the previous one (one-deep rolling).
 */
export async function applyStudioMarkChanges(
  section: StudioMarkChangesSection,
): Promise<StudioMarkChangesSummary> {
  if (section.upserts.length === 0 && section.removed.length === 0) {
    return { upserted: 0, removed: 0, recordsTouched: 0 };
  }
  const marks = await loadMarks();
  try {
    await AsyncStorage.setItem(
      MARKS_SNAPSHOT_KEY,
      JSON.stringify({ at: new Date().toISOString(), marks }),
    );
  } catch {
    // A failed snapshot write never blocks the merge — the marks
    // store's own discipline (saveMarks) is the same.
  }
  const { marks: next, summary } = mergeStudioMarkChanges(marks, section);
  await saveMarks(next);
  return summary;
}
