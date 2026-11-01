// ─── v395 "Keep Me Occupied" — the deal engine ──────────────────────────────
// Jonathan's own idea (Oct 31): a card for the worst fifteen minutes
// — a craving wave, a rough fasting minute. One tap DEALS one random
// mind-occupying thing (a mini-game, the Word Dig, or a random
// chapter); there is no menu and no choosing. Approved through
// three mockups; the final is keep-me-occupied-concept-v3.html,
// drawn inside his real Fasting Tracker. His build words: "I trust
// you know what to add. Just keep the material design expressive in
// everything. You don't have to for games, just the way to get
// there and get out."
//
// THE NO-LEDGER LAW (hard, pinned): nothing about this feature is
// persisted — no deal counts, no ratings, no minutes, no history,
// no storage keys written by this feature, ever. Everything here is
// pure functions over in-session values; the screen holds state in
// React memory and it dies with the flow. This module imports no
// storage at all.
//
// v397 SCOPE NOTE: the law above still governs THIS module and all
// WAVE data (ratings, minutes, taps, deals) without exception.
// What v397 added — scores, coin/XP earnings, game unlocks, best
// scores — lives in lib/kmo-progression.ts under its own stated
// law: game data may persist; wave data still may not.
//
// Every pool item is endless and UNFAILABLE: no game over, no score
// shame, no fail states. The helpers below are written so a miss
// can only ever produce "again", never "ended".

import { CHAPTER_COUNTS } from "@/lib/bible-v205";
import { bookReadCount } from "@/lib/bible-v205/reading-progress";
import type { StudyState } from "@/lib/bible-v205/study";
import type { VerseText } from "@/lib/bible-v205/verses";
import { TINT_DOT_HEX } from "@/lib/bible-v205/marks";

// ─── The pool ────────────────────────────────────────────────────────────────

export type KmoItemKind = "game" | "dig" | "chapter";

export type KmoItemId =
  | "echo-lights"
  | "sort-it-out"
  | "stack"
  | "backbeat"
  | "tend"
  | "word-dig"
  | "chapter";

export interface KmoPoolItem {
  id: KmoItemId;
  kind: KmoItemKind;
  /** The dealt screen's title. */
  title: string;
  /** The DEALT chip's words, e.g. "DEALT · A GAME". */
  chip: string;
  /** Wave-check verb line stem: "You ___ … for N minutes". */
  verb: string;
}

/** The whole pool, in shelf order. The deal draws from all of it. */
export const KMO_POOL: readonly KmoPoolItem[] = [
  { id: "echo-lights", kind: "game", title: "Echo Lights", chip: "DEALT · A GAME", verb: "played Echo Lights" },
  { id: "sort-it-out", kind: "game", title: "Sort It Out", chip: "DEALT · A GAME", verb: "played Sort It Out" },
  { id: "stack", kind: "game", title: "Stack", chip: "DEALT · A GAME", verb: "played Stack" },
  { id: "backbeat", kind: "game", title: "Backbeat", chip: "DEALT · A GAME", verb: "played Backbeat" },
  { id: "tend", kind: "game", title: "Tend", chip: "DEALT · A GAME", verb: "tended the garden" },
  { id: "word-dig", kind: "dig", title: "Word Dig", chip: "DEALT · THE DIG", verb: "dug in the Word" },
  { id: "chapter", kind: "chapter", title: "A Chapter", chip: "DEALT · A CHAPTER", verb: "read" },
];

export function poolItem(id: KmoItemId): KmoPoolItem {
  return KMO_POOL.find((item) => item.id === id) ?? KMO_POOL[0];
}

export type Rng = () => number;

function pickIndex(length: number, rng: Rng): number {
  if (length <= 0) return 0;
  const n = Math.floor(rng() * length);
  return Math.min(length - 1, Math.max(0, n));
}

/**
 * Deal one item from the pool. A re-deal (excludeId set) never deals
 * the item already on the table — "Something else" always changes
 * the screen.
 *
 * v397: when an owned-games list is passed, locked games stay out
 * of the deck. Chapters and the Word Dig are never locked (the dig
 * is a starter; scripture is not merchandise), so they are in every
 * deck whatever the list says. With no list passed, the whole pool
 * deals — the v395 behaviour the original pins hold.
 */
export function dealItem(rng: Rng, excludeId?: KmoItemId, unlocked?: readonly KmoItemId[]): KmoPoolItem {
  const candidates = KMO_POOL.filter((item) => {
    if (excludeId && item.id === excludeId) return false;
    if (unlocked && item.kind === "game" && item.id !== "word-dig" && !unlocked.includes(item.id)) return false;
    return true;
  });
  return candidates[pickIndex(candidates.length, rng)];
}

// ─── Chapter deals ───────────────────────────────────────────────────────────

export interface ChapterDeal {
  book: string;
  chapter: number;
}

/**
 * The weighted chapter pool, spec order: Psalms is ALWAYS eligible
 * and weighted heaviest (nobody was ever hurt by being dealt a
 * psalm); his current book next; then every chapter of every book
 * carrying reading progress; then — only if none of that exists —
 * the whole canon, so a deal can never come up empty.
 */
export function chapterPool(state: StudyState | null): ChapterDeal[] {
  const pool: ChapterDeal[] = [];
  const push = (book: string, weight: number) => {
    const total = CHAPTER_COUNTS[book] ?? 0;
    for (let w = 0; w < weight; w++) {
      for (let c = 1; c <= total; c++) pool.push({ book, chapter: c });
    }
  };
  push("Psalms", 3);
  if (state?.currentBook && state.currentBook !== "Psalms" && CHAPTER_COUNTS[state.currentBook]) {
    push(state.currentBook, 2);
  }
  if (state) {
    for (const book of Object.keys(CHAPTER_COUNTS)) {
      if (book === "Psalms" || book === state.currentBook) continue;
      if (bookReadCount(state, book) > 0) push(book, 1);
    }
  }
  if (pool.length === 0) {
    for (const book of Object.keys(CHAPTER_COUNTS)) push(book, 1);
  }
  return pool;
}

export function dealChapter(state: StudyState | null, rng: Rng): ChapterDeal {
  const pool = chapterPool(state);
  return pool[pickIndex(pool.length, rng)];
}

/**
 * Candidate (book, chapter) spots for the Word Dig's verse hunt, in
 * preference order: his current book's chapters, then chapters of
 * books with reading progress, then Psalms. The screen walks this
 * list through the reader's own verse access (embeddedVerses /
 * loadChapterVerses) until a verse with a diggable word turns up.
 */
export function digChapterCandidates(state: StudyState | null, rng: Rng): ChapterDeal[] {
  const books: string[] = [];
  if (state?.currentBook && CHAPTER_COUNTS[state.currentBook]) books.push(state.currentBook);
  if (state) {
    for (const book of Object.keys(CHAPTER_COUNTS)) {
      if (!books.includes(book) && bookReadCount(state, book) > 0) books.push(book);
    }
  }
  if (!books.includes("Psalms")) books.push("Psalms");
  const out: ChapterDeal[] = [];
  for (const book of books) {
    const total = CHAPTER_COUNTS[book] ?? 0;
    const chapters: number[] = [];
    for (let c = 1; c <= total; c++) chapters.push(c);
    // Shuffle this book's chapters so repeat digs wander the book.
    for (let i = chapters.length - 1; i > 0; i--) {
      const j = pickIndex(i + 1, rng);
      [chapters[i], chapters[j]] = [chapters[j], chapters[i]];
    }
    for (const chapter of chapters) out.push({ book, chapter });
  }
  return out;
}

// ─── The Word Dig ────────────────────────────────────────────────────────────

export const DIG_MAX_GUESSES = 6;

/** Pure function words a dig never buries — they'd be guess-noise, not a find. */
const DIG_STOPLIST = new Set([
  "WHICH", "THERE", "THEIR", "THESE", "THOSE", "WHERE", "ABOUT", "WOULD",
  "COULD", "SHOULD", "AFTER", "AGAIN", "BEING", "UNDER", "UNTIL", "WHILE",
  "WHOSE", "WHOM", "THEN", "THAN", "THAT", "THIS", "WITH", "FROM", "INTO",
  "UPON", "OVER", "WHEN", "WENT", "CAME", "SAID", "HATH", "THOU", "THEE",
  "THINE", "SHALL", "WILL", "HAVE", "HAS", "HAD", "NOT", "ALL", "ANY",
]);

/** Five-letter words buried in a verse's text, in verse order. */
export function digWordsIn(text: string): string[] {
  const found: string[] = [];
  for (const token of text.toUpperCase().split(/[^A-Z]+/)) {
    if (token.length !== 5) continue;
    if (DIG_STOPLIST.has(token)) continue;
    if (!found.includes(token)) found.push(token);
  }
  return found;
}

export interface DigTarget {
  book: string;
  chapter: number;
  verse: number;
  /** The full verse text, KJV. */
  verseText: string;
  /** The buried word, uppercase, five letters. */
  word: string;
}

/** Pick a dig target from a chapter's verses; null when none carries a word. */
export function pickDigTarget(book: string, chapter: number, verses: VerseText[], rng: Rng): DigTarget | null {
  const options: DigTarget[] = [];
  for (const v of verses) {
    for (const word of digWordsIn(v.text)) {
      options.push({ book, chapter, verse: v.verse, verseText: v.text, word });
    }
  }
  if (options.length === 0) return null;
  return options[pickIndex(options.length, rng)];
}

export type DigLetterState = "in-place" | "present" | "absent";

/** Wordle letter feedback with correct duplicate handling. */
export function digFeedback(guess: string, target: string): DigLetterState[] {
  const g = guess.toUpperCase().padEnd(5, " ").slice(0, 5).split("");
  const t = target.toUpperCase().padEnd(5, " ").slice(0, 5).split("");
  const out: DigLetterState[] = Array(5).fill("absent");
  const remaining = new Map<string, number>();
  for (let i = 0; i < 5; i++) {
    if (g[i] === t[i]) out[i] = "in-place";
    else remaining.set(t[i], (remaining.get(t[i]) ?? 0) + 1);
  }
  for (let i = 0; i < 5; i++) {
    if (out[i] === "in-place") continue;
    const left = remaining.get(g[i]) ?? 0;
    if (left > 0) {
      out[i] = "present";
      remaining.set(g[i], left - 1);
    }
  }
  return out;
}

/**
 * The feedback paints are HIS highlight tints (v361 selection
 * family): in-place wears the highlight yellow, present the
 * definition blue, absent fades to paper.
 */
export function digFeedbackTint(state: DigLetterState): { background: string; border: string } {
  if (state === "in-place") return { background: "#FBEA8C", border: "#D9B84A" };
  if (state === "present") return { background: TINT_DOT_HEX.blue, border: "#2F6FDE" };
  return { background: "transparent", border: "transparent" };
}

export type DigOutcome = "digging" | "found" | "revealed";

/**
 * The dig's only outcomes: still digging, found, or — after the
 * sixth guess — simply revealed and a new word dealt. There is no
 * loss state to return.
 */
export function digOutcome(guesses: string[], target: string): DigOutcome {
  const t = target.toUpperCase();
  if (guesses.some((g) => g.toUpperCase() === t)) return "found";
  if (guesses.length >= DIG_MAX_GUESSES) return "revealed";
  return "digging";
}

/**
 * The verse is the hint: every wrong guess uncovers more of it.
 * Words surface from the front in order; the buried word itself
 * stays blanked until the dig ends (found or revealed).
 */
export function digVerseReveal(target: DigTarget, wrongGuesses: number, ended: boolean): string {
  const words = target.verseText.split(/\s+/).filter(Boolean);
  const frac = ended ? 1 : Math.min(1, 0.25 + wrongGuesses * 0.15);
  const revealCount = Math.max(1, Math.floor(words.length * frac));
  return words
    .map((w, i) => {
      const bare = w.toUpperCase().replace(/[^A-Z]/g, "");
      if (bare === target.word) return ended ? w : "▁▁▁▁▁";
      return i < revealCount || ended ? w : "···";
    })
    .join(" ");
}

// ─── Echo Lights ─────────────────────────────────────────────────────────────

export type EchoState = "showing" | "input" | "replay" | "round-complete";

/** Extend the pattern by one pad (0–3). Patterns only ever grow. */
export function echoExtend(pattern: number[], rng: Rng): number[] {
  return [...pattern, pickIndex(4, rng)];
}

/**
 * Grade one full input run against the pattern. A miss NEVER ends
 * anything: the game simply shows the pattern again ("replay").
 */
export function echoGrade(pattern: number[], input: number[]): "round-complete" | "replay" | "pending" {
  for (let i = 0; i < input.length; i++) {
    if (input[i] !== pattern[i]) return "replay";
  }
  return input.length >= pattern.length ? "round-complete" : "pending";
}

// ─── Sort It Out ─────────────────────────────────────────────────────────────

export interface SortDeck {
  id: string;
  /** The bins on screen, in order. */
  bins: string[];
  /** Item label → the bin it belongs in. */
  items: { label: string; bin: number }[];
}

export const SORT_DECKS: readonly SortDeck[] = [
  {
    id: "colors",
    bins: ["Red", "Blue", "Green", "Gold"],
    items: [
      { label: "🔴 Ruby stone", bin: 0 }, { label: "🔵 River stone", bin: 1 },
      { label: "🟢 Moss stone", bin: 2 }, { label: "🟡 Sun stone", bin: 3 },
      { label: "🔴 Brick tile", bin: 0 }, { label: "🔵 Wave tile", bin: 1 },
      { label: "🟢 Leaf tile", bin: 2 }, { label: "🟡 Honey tile", bin: 3 },
    ],
  },
  {
    id: "numbers",
    bins: ["1–3", "4–6", "7–9"],
    items: [
      { label: "Two", bin: 0 }, { label: "Five", bin: 1 }, { label: "Eight", bin: 2 },
      { label: "One", bin: 0 }, { label: "Nine", bin: 2 }, { label: "Four", bin: 1 },
      { label: "Seven", bin: 2 }, { label: "Three", bin: 0 }, { label: "Six", bin: 1 },
    ],
  },
  {
    id: "kinds",
    bins: ["Animals", "Food", "Tools"],
    items: [
      { label: "🐑 Lamb", bin: 0 }, { label: "🍞 Loaf", bin: 1 }, { label: "🔨 Hammer", bin: 2 },
      { label: "🕊️ Dove", bin: 0 }, { label: "🐟 Fish", bin: 1 }, { label: "🪚 Saw", bin: 2 },
      { label: "🦁 Lion", bin: 0 }, { label: "🍇 Grapes", bin: 1 }, { label: "🪓 Axe", bin: 2 },
    ],
  },
];

/** Deal the next sort round: a deck plus its next item. Endless by construction. */
export function sortDeal(round: number, rng: Rng): { deck: SortDeck; item: { label: string; bin: number } } {
  const deck = SORT_DECKS[round % SORT_DECKS.length];
  const item = deck.items[pickIndex(deck.items.length, rng)];
  return { deck, item };
}

/** A sort attempt: right bin sorts it home; wrong bin just bounces it back. */
export function sortResolve(item: { bin: number }, chosenBin: number): "sorted" | "bounced" {
  return item.bin === chosenBin ? "sorted" : "bounced";
}

// ─── Stack ───────────────────────────────────────────────────────────────────

export interface StackBlock { left: number; width: number }

/**
 * Drop the moving block over the block below. Overhang trims to
 * the overlap; a total miss returns null — the game answers by
 * placing a fresh base block, never by ending.
 */
export function stackDrop(below: StackBlock, moving: StackBlock): StackBlock | null {
  const left = Math.max(below.left, moving.left);
  const right = Math.min(below.left + below.width, moving.left + moving.width);
  if (right <= left) return null;
  return { left, width: right - left };
}

// ─── Backbeat ────────────────────────────────────────────────────────────────

/** An 8-step beat grid; the steps that carry a hit. */
export function beatPattern(length: number, rng: Rng): number[] {
  const steps = new Set<number>();
  let guard = 0;
  while (steps.size < Math.min(length, 8) && guard++ < 64) {
    steps.add(pickIndex(8, rng));
  }
  return [...steps].sort((a, b) => a - b);
}

/**
 * Forgiving grading: every pattern step needs a tap within one
 * step either side. Extra taps cost nothing. There is no way to
 * fail — a short count just plays the pattern again.
 */
export function beatGrade(pattern: number[], taps: number[]): "matched" | "again" {
  const ok = pattern.every((step) => taps.some((tap) => Math.abs(tap - step) <= 1));
  return ok ? "matched" : "again";
}

// ─── Tend ────────────────────────────────────────────────────────────────────

export type TendCell = "bloom" | "dry" | "weed" | "sprout";

export const TEND_CELLS = 12;

/** A calm starting garden: mostly bloom, a sprout, room to tend. */
export function tendStart(rng: Rng): TendCell[] {
  const cells: TendCell[] = Array(TEND_CELLS).fill("bloom");
  cells[pickIndex(TEND_CELLS, rng)] = "sprout";
  cells[pickIndex(TEND_CELLS, rng)] = "dry";
  return cells;
}

/**
 * Time passing, gently: one cell may dry out or sprout a weed.
 * Nothing ever dies and nothing is scored.
 */
export function tendTick(cells: TendCell[], rng: Rng): TendCell[] {
  const next = [...cells];
  const idx = pickIndex(next.length, rng);
  if (next[idx] === "bloom" && rng() < 0.7) next[idx] = rng() < 0.5 ? "dry" : "weed";
  else if (next[idx] === "sprout") next[idx] = "bloom";
  return next;
}

/** A tap tends: weed → sprout, dry → bloom, sprout → bloom. Bloom just glows. */
export function tendTap(cells: TendCell[], index: number): TendCell[] {
  const next = [...cells];
  const cell = next[index];
  if (cell === "weed") next[index] = "sprout";
  else if (cell === "dry" || cell === "sprout") next[index] = "bloom";
  return next;
}

// ─── The session (memory only) ───────────────────────────────────────────────

export interface KmoSession {
  /** When the flow opened. Displayed once at the wave check, then forgotten. */
  startedAt: number;
  /** The optional entry rating (1–10), if he gave one. Never required. */
  entryRating: number | null;
  /** The item on the table and when it was dealt. */
  itemId: KmoItemId;
  dealtAt: number;
  /** Display label for the activity line, e.g. "Psalm 91" for a chapter. */
  activityLabel: string;
}

export function startSession(itemId: KmoItemId, activityLabel: string, now: number): KmoSession {
  return { startedAt: now, entryRating: null, itemId, dealtAt: now, activityLabel };
}

/** "under a minute" / "1 minute" / "11 minutes" — for the wave-check line. */
export function formatElapsed(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60000);
  if (minutes <= 0) return "under a minute";
  if (minutes === 1) return "1 minute";
  return `${minutes} minutes`;
}

/** The wave-check's one honest line: what he did, and for how long. */
export function sessionLine(session: KmoSession, now: number): string {
  const item = poolItem(session.itemId);
  const elapsed = formatElapsed(now - session.dealtAt);
  if (item.kind === "chapter") return `You read ${session.activityLabel} for ${elapsed}.`;
  return `You ${item.verb} for ${elapsed}.`;
}

/** The wave check's three doors, in the order the mockup draws them. */
export const WAVE_DOORS = [
  { id: "another", label: "Deal me another", sub: "no shame in round two" },
  { id: "pray", label: "Pray it out", sub: "opens your prayer list" },
  { id: "day", label: "Back to my day", sub: "wave ridden · the wave itself is never logged" },
] as const;

export type WaveDoorId = (typeof WAVE_DOORS)[number]["id"];
