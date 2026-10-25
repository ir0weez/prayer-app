// ─── v214 "Living Bubble" — the model behind the margin faces ───────────────
// v217 "Your Words in the Text" (his ruling, from his hands-on v214
// verdict + approved mockup): AUTHORSHIP decides how a marks line
// renders. HIS OWN lines (no author — plain string, or an authored
// object with no authorId) sit IN THE TEXT FLOW under their verses,
// always visible. OTHER PEOPLE's lines live as faces in the entry's
// right margin, and a press blooms them into note cards over the
// verses — a conversation when there are two or more of them. This
// module is the pure half: which lines an entry shows, in which
// order, on which side, who each line belongs to, and where each
// displayed line is actually STORED (a line shown on a '#' split
// piece may live on the parent entry's record — writes must land
// where the line lives).

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Person } from '../prayercircle-data';
import { PEOPLE_STORAGE_KEY, PROFILE_STORAGE_KEY } from '../prayercircle-storage';
import {
  lineAuthor,
  lineText,
  marksFor,
  type EntryMarks,
  type KeeperField,
  type KeeperLine,
  type LineAuthor,
} from './marks';
import type { SplitProvenance, SplitSectionsResult } from './index';
import { entryKey, type V205Block } from './types';

export type BubbleKind = 'note' | 'highlight' | 'thought' | 'quote';

/** Render order of his own lines under an entry — the order his lines
 * have always read in: plain notes first, then Highlights, then Main
 * Thoughts (v210's in-flow order, carried into the bubbles). */
export const BUBBLE_KIND_ORDER: { kind: BubbleKind; field: KeeperField }[] = [
  { kind: 'note', field: 'notes' },
  { kind: 'highlight', field: 'highlights' },
  { kind: 'thought', field: 'thoughts' },
];

export interface BubbleLine {
  kind: BubbleKind;
  text: string;
  /** The line's stored authorship; null = the user themself. */
  author: LineAuthor | null;
  /**
   * Conversation side: a lone line is 'solo' (its card grows from the
   * face at the right margin); with 2+ lines the cards alternate —
   * the first settles left, the next right, then left again.
   */
  side: 'solo' | 'left' | 'right';
  /** Index of this line within its own field's displayed array. */
  fieldIndex: number;
  /**
   * Where the line lives: 'marks' = his marks layer (editable from
   * the chapter page, the v214 way); 'quote' = a studio quote BLOCK
   * on the entry (v244) — it renders as a face bubble but is edited
   * in the studio, never through the marks composer, so the page
   * shows no edit/remove for it and its storage target is a sentinel.
   */
  source: 'marks' | 'quote';
}

/** Every user line of an entry, flattened in render order (plain
 * notes, then Highlights, then Main Thoughts), sides unassigned. */
function flatLinesFor(marks: EntryMarks | undefined): Omit<BubbleLine, 'side'>[] {
  if (!marks) return [];
  const flat: Omit<BubbleLine, 'side'>[] = [];
  for (const { kind, field } of BUBBLE_KIND_ORDER) {
    (marks[field] ?? []).forEach((line: KeeperLine, fieldIndex: number) => {
      flat.push({ kind, text: lineText(line), author: lineAuthor(line), fieldIndex, source: 'marks' });
    });
  }
  return flat;
}

/**
 * v244: an entry's studio QUOTE blocks that carry a speaker id, as
 * bubble lines. A quote block with an authorId is someone else's
 * words with a face behind them — it joins the margin bubbles and
 * resolves through the same author resolution as a credited marks
 * line. A name-only quote is NOT a bubble line: it keeps the v223
 * ❝ callout rendering in the block flow.
 */
export function quoteBubbleLines(blocks: V205Block[]): Omit<BubbleLine, 'side'>[] {
  const out: Omit<BubbleLine, 'side'>[] = [];
  blocks.forEach((block, fieldIndex) => {
    if (block.kind !== 'quote') return;
    const authorId = typeof block.authorId === 'string' ? block.authorId.trim() : '';
    if (!authorId) return;
    out.push({
      kind: 'quote',
      text: block.text,
      author: { authorId, authorName: block.authorName ?? '' },
      fieldIndex,
      source: 'quote',
    });
  });
  return out;
}

function withSides(flat: Omit<BubbleLine, 'side'>[]): BubbleLine[] {
  return flat.map((l, i) => ({
    ...l,
    side: flat.length <= 1 ? ('solo' as const) : i % 2 === 0 ? ('left' as const) : ('right' as const),
  }));
}

/** An entry's user lines as bubbles: render order, sides assigned. */
export function bubbleLinesFor(marks: EntryMarks | undefined): BubbleLine[] {
  return withSides(flatLinesFor(marks));
}

/**
 * v217: is this line HIS OWN? A line is his when it carries no
 * author — a plain string, or an authored object with no authorId
 * (lineAuthor already normalizes both to null, the same test
 * resolveBubbleAuthor uses to hand a line to the profile).
 */
export function isSelfLine(line: Pick<BubbleLine, 'author'>): boolean {
  return !line.author || !line.author.authorId;
}

export interface PartitionedLines {
  /** His own lines — rendered in the text flow. */
  selfLines: BubbleLine[];
  /** Other people's lines — rendered as margin bubbles. Sides are
   * assigned WITHIN this group: a conversation forms among other
   * people's lines alone, alternating from the left as in v214. */
  bubbleLines: BubbleLine[];
}

/** An entry's user lines split by authorship (the v217 rule). */
export function partitionBubbleLines(marks: EntryMarks | undefined): PartitionedLines {
  const flat = flatLinesFor(marks);
  return {
    selfLines: withSides(flat.filter((l) => isSelfLine(l))),
    bubbleLines: withSides(flat.filter((l) => !isSelfLine(l))),
  };
}

// ─── Storage resolution — where a displayed line actually lives ─────────────

export interface LineStorageTarget {
  start: number;
  end: number;
  field: KeeperField;
  index: number;
}

/**
 * Resolve a displayed line (its piece span + field + index within the
 * piece's displayed array for that field) to the stored record and
 * index a write must touch:
 *  - no provenance (the entry never split): the piece's own record,
 *    index for index;
 *  - a derived line: the PARENT entry's record, at the parent index
 *    the split recorded for it;
 *  - a line past the derived ones: the piece's own record, offset by
 *    the derived count.
 */
export function resolveLineStorage(
  provenance: SplitProvenance | undefined,
  pieceStart: number,
  pieceEnd: number,
  field: KeeperField,
  displayIndex: number,
): LineStorageTarget {
  if (!provenance) return { start: pieceStart, end: pieceEnd, field, index: displayIndex };
  const origins = provenance.origins[field] ?? [];
  if (displayIndex < origins.length) {
    return { start: provenance.parentStart, end: provenance.parentEnd, field, index: origins[displayIndex] };
  }
  return { start: pieceStart, end: pieceEnd, field, index: displayIndex - origins.length };
}

// ─── Piece assembly — everything the chapter page renders per entry ─────────

export interface BubblePiece {
  /** The rendered piece's span (a split piece, or the entry itself). */
  start: number;
  end: number;
  /** The unsplit entry the piece came from; equals the piece's own
   * span when nothing split. A piece whose span is a proper subset
   * of its parent's labels its cards "on vv. X–Y". */
  parentStart: number;
  parentEnd: number;
  /** v217: OTHER PEOPLE's lines only — the margin bubbles. (In v214
   * this carried every line; his own lines moved to `selfLines`.) */
  lines: BubbleLine[];
  /** Write targets, aligned with `lines` index for index. */
  targets: LineStorageTarget[];
  /** v217: HIS OWN lines — rendered in the text flow. */
  selfLines: BubbleLine[];
  /** Write targets, aligned with `selfLines` index for index. */
  selfTargets: LineStorageTarget[];
}

/**
 * Every piece of a split chapter result that carries user lines,
 * keyed by the piece's entry key, partitioned by authorship (v217).
 * Drives both chapter-page modes: With-notes renders pieces
 * directly; Read-only (per-verse entries) anchors each piece's lines
 * on the verse where the piece starts.
 */
export function buildBubblePieces(
  split: SplitSectionsResult,
  book: string,
  chapter: number,
): Map<string, BubblePiece> {
  const out = new Map<string, BubblePiece>();
  for (const section of split.sections) {
    for (const entry of section.entries) {
      const key = entryKey(book, chapter, entry.start, entry.end);
      const { selfLines, bubbleLines } = partitionBubbleLines(
        marksFor(split.marks, book, chapter, entry.start, entry.end),
      );
      // v244: studio quote blocks carrying a speaker id join the
      // bubble group — after the marks lines, in block order — and
      // the conversation sides are dealt across the merged group so
      // a quote takes its turn in the alternation like any line.
      const quotes = quoteBubbleLines(entry.blocks);
      if (!selfLines.length && !bubbleLines.length && !quotes.length) continue;
      const prov = split.provenance[key];
      const targetsFor = (group: BubbleLine[]) =>
        group.map((l) => {
          const field = BUBBLE_KIND_ORDER.find((k) => k.kind === l.kind)!.field;
          return resolveLineStorage(prov, entry.start, entry.end, field, l.fieldIndex);
        });
      let lines = bubbleLines;
      let targets = targetsFor(bubbleLines);
      if (quotes.length) {
        lines = withSides([
          ...bubbleLines.map(({ side: _side, ...rest }) => rest),
          ...quotes,
        ]);
        targets = [
          ...targets,
          // Quote lines are not marks: their sentinel target (index
          // −1) can never address a stored line, and the page hides
          // edit/remove for them — they are edited in the studio.
          ...quotes.map(
            (): LineStorageTarget => ({ start: entry.start, end: entry.end, field: 'notes', index: -1 }),
          ),
        ];
      }
      out.set(key, {
        start: entry.start,
        end: entry.end,
        parentStart: prov ? prov.parentStart : entry.start,
        parentEnd: prov ? prov.parentEnd : entry.end,
        lines,
        targets,
        selfLines,
        selfTargets: targetsFor(selfLines),
      });
    }
  }
  return out;
}

// ─── v244 open geometry — the big bubble, docked off its verses ─────────────

/**
 * The open card's width (his ask, 2026-10-25): BIG — it stretches
 * across the screen, still a bubble. A lone bubble takes ~92% of
 * the screen width; a conversation's cards take ~86% so the
 * left/right alternation still reads. Never wider than the strip
 * the cards are laid out in.
 */
export function openCardWidth(input: { solo: boolean; windowWidth: number; stripWidth: number }): number {
  const fraction = input.solo ? 0.92 : 0.86;
  return Math.max(200, Math.min(Math.round(input.windowWidth * fraction), input.stripWidth));
}

/**
 * Where the open thread docks: BELOW its verses by default, so the
 * verses stay on screen, uncovered. When the space below the verses
 * is the smaller of the two and the space above the entry is
 * roomier, the thread docks ABOVE the entry instead. (A thread
 * taller than either space still caps and scrolls internally, the
 * v214 way.)
 */
export function bubbleDock(input: {
  /** The entry's top edge in viewport coordinates (null = unknown). */
  entryScreenTop: number | null;
  /** Entry-relative y where the verses end (the head's height). */
  versesBottom: number;
  /** The thread's natural (uncapped) height. */
  cardsHeight: number;
  viewportHeight: number;
  topChrome: number;
  bottomReserve: number;
  gap: number;
}): 'below' | 'above' {
  if (input.entryScreenTop === null) return 'below';
  const belowSpace =
    input.viewportHeight - input.bottomReserve - (input.entryScreenTop + input.versesBottom + input.gap);
  if (input.cardsHeight <= belowSpace) return 'below';
  const aboveSpace = input.entryScreenTop - input.topChrome - input.gap;
  return aboveSpace > belowSpace ? 'above' : 'below';
}

// ─── Scroll cap — the open conversation never outgrows the screen ───────────

/**
 * The open thread's height: its natural stacked height, capped at
 * the visible area the overlay may use (viewport minus the chapter
 * chrome above and the FAB/nav allowance below). At or under the cap
 * the thread sits at natural height and never scrolls.
 */
export function conversationViewport(input: {
  naturalHeight: number;
  viewportHeight: number;
  topChrome: number;
  bottomReserve: number;
}): { regionHeight: number; scrollable: boolean } {
  const available = Math.max(120, input.viewportHeight - input.topChrome - input.bottomReserve);
  const regionHeight = Math.min(input.naturalHeight, available);
  return { regionHeight, scrollable: input.naturalHeight > available };
}

/**
 * How far the open region must shift UP from the face's anchor so
 * the whole region stays on screen when the entry sits low: only as
 * far as the visible bottom demands, and never so far that the
 * region's top leaves the usable area under the chrome.
 */
export function conversationShiftUp(input: {
  /** The face anchor's distance below the entry container's top. */
  anchorTop: number;
  /** The entry container's top edge, in viewport coordinates. */
  entryScreenTop: number;
  regionHeight: number;
  viewportHeight: number;
  topChrome: number;
  bottomReserve: number;
}): number {
  const regionScreenTop = input.entryScreenTop + input.anchorTop;
  const overflow = regionScreenTop + input.regionHeight - (input.viewportHeight - input.bottomReserve);
  if (overflow <= 0) return 0;
  const maxShift = Math.max(0, regionScreenTop - input.topChrome);
  return Math.min(overflow, maxShift);
}

// ─── Authorship ──────────────────────────────────────────────────────────────

/** The signed-in user's identity card (their profile), for faces. */
export interface ProfileIdentity {
  name: string;
  photoUri?: string;
  avatarAsset?: string;
}

export interface ResolvedAuthor {
  /** Display name: current People name, profile name, snapshot, or "You". */
  name: string;
  /** The People record when the author resolves to one. */
  person: Person | null;
  /** True when the author is the user themself (profile face). */
  isSelf: boolean;
  /** True when the author id no longer resolves — the face falls
   * back to the stored name snapshot's initial disc. */
  isSnapshot: boolean;
  /** The profile's own face, set when isSelf. */
  photoUri?: string;
  avatarAsset?: string;
}

/**
 * Who a bubble wears: no author (or the profile's own line) → the
 * user; an authorId that still resolves → that person's CURRENT
 * record (name/photo follow the People list, not the snapshot); an
 * authorId that is gone → the snapshot name the line was stored
 * with.
 */
export function resolveBubbleAuthor(
  author: LineAuthor | null,
  people: Person[],
  profile: ProfileIdentity,
): ResolvedAuthor {
  if (!author || !author.authorId) {
    return {
      name: profile.name || 'You',
      person: null,
      isSelf: true,
      isSnapshot: false,
      photoUri: profile.photoUri,
      avatarAsset: profile.avatarAsset,
    };
  }
  const person = people.find((p) => p.id === author.authorId) ?? null;
  if (person) return { name: person.name, person, isSelf: false, isSnapshot: false };
  return { name: author.authorName || 'Someone', person: null, isSelf: false, isSnapshot: true };
}

/** The People list for author resolution + the picker — the same
 * stored list the Journal's @mentions read, so a person id means
 * the same person in both places. */
export async function loadPeopleList(): Promise<Person[]> {
  try {
    const raw = await AsyncStorage.getItem(PEOPLE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Person[]) : [];
  } catch {
    return [];
  }
}

/** The profile identity (name + face) from the profile store. */
export async function loadProfileIdentity(): Promise<ProfileIdentity> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return { name: '' };
    const parsed = JSON.parse(raw) as { name?: unknown; photoUri?: unknown; avatarAsset?: unknown };
    return {
      name: typeof parsed?.name === 'string' ? parsed.name.trim() : '',
      photoUri: typeof parsed?.photoUri === 'string' && parsed.photoUri ? parsed.photoUri : undefined,
      avatarAsset: typeof parsed?.avatarAsset === 'string' && parsed.avatarAsset ? parsed.avatarAsset : undefined,
    };
  } catch {
    return { name: '' };
  }
}
