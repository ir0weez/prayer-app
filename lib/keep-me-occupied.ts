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
// The original items are endless and UNFAILABLE: no game over, no
// score shame, no fail states — a miss there can only ever produce
// "again", never "ended". v398 scope note: the seven endless games
// added below are scored RUNS and a run CAN end (crash, fall, lost
// ball); ending settles the run's score through the same v397
// conversion and offers Again — the run ends, the occupation
// doesn't have to.

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
  | "runner"
  | "glide"
  | "jumper"
  | "snake"
  | "crossroads"
  | "breakout"
  | "drop-match"
  | "plinko-drop"
  | "cave-flyer"
  | "colour-rush"
  | "rockfall"
  | "mole-patrol"
  | "slide-2048"
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
  // v398 — the endless roster (Jonathan: "We need some scored
  // endless games and stuff. Like endless runners, or something…
  // so it's kind of neverending stuff to unlock."). These seven
  // are scored RUNS: a run can end (a crash, a fall, a lost ball),
  // and ending a run settles its score like any session segment.
  { id: "runner", kind: "game", title: "Runner", chip: "DEALT · A GAME", verb: "ran the road" },
  { id: "glide", kind: "game", title: "Glide", chip: "DEALT · A GAME", verb: "glided the gates" },
  { id: "jumper", kind: "game", title: "Jumper", chip: "DEALT · A GAME", verb: "climbed" },
  { id: "snake", kind: "game", title: "Snake", chip: "DEALT · A GAME", verb: "played Snake" },
  { id: "crossroads", kind: "game", title: "Crossroads", chip: "DEALT · A GAME", verb: "directed traffic" },
  { id: "breakout", kind: "game", title: "Breakout", chip: "DEALT · A GAME", verb: "played Breakout" },
  { id: "drop-match", kind: "game", title: "Drop Match", chip: "DEALT · A GAME", verb: "played Drop Match" },
  // v399 — six more doors on the ladder (Jonathan tapped "Add all
  // six to the ladder", Oct 31). Same law as the v398 runs: a score
  // with a best to beat, coins for playing, coins unlock more.
  { id: "plinko-drop", kind: "game", title: "Plinko Drop", chip: "DEALT · A GAME", verb: "dropped the balls" },
  { id: "cave-flyer", kind: "game", title: "Cave Flyer", chip: "DEALT · A GAME", verb: "flew the cave" },
  { id: "colour-rush", kind: "game", title: "Colour Rush", chip: "DEALT · A GAME", verb: "rushed the colours" },
  { id: "rockfall", kind: "game", title: "Rockfall", chip: "DEALT · A GAME", verb: "guarded the garden" },
  { id: "mole-patrol", kind: "game", title: "Mole Patrol", chip: "DEALT · A GAME", verb: "patrolled the beds" },
  { id: "slide-2048", kind: "game", title: "Slide 2048", chip: "DEALT · A GAME", verb: "slid the tiles" },
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

// ─── v398 endless games — pure logic ─────────────────────────────────────────
// Each run game keeps a small state object; step functions advance
// it by dt seconds and are pure enough to pin in tests. Components
// hold the state in a ref, tick it, render a snapshot, and report
// score deltas upward. Coordinates are logical pixels on a
// 320-wide field; components scale by their measured width.

// ─── Runner ──────────────────────────────────────────────────────────────────

export const RUNNER_W = 320;
export const RUNNER_GROUND_H = 150; // field height above the ground line the runner runs on
export const RUNNER_X = 54;
export const RUNNER_SIZE = 22;

export interface RunnerObstacle { id: number; x: number; w: number; h: number; counted: boolean }
export interface RunnerCoin { id: number; x: number; y: number; taken: boolean }
export interface RunnerState {
  alive: boolean;
  /** Metres run (float); the score floors it. */
  distance: number;
  speed: number;
  /** Runner's feet height above the ground, px. */
  y: number;
  vy: number;
  obstacles: RunnerObstacle[];
  coins: RunnerCoin[];
  coinCount: number;
  nearMisses: number;
  nextId: number;
  spawnIn: number;
}

export function runnerStart(): RunnerState {
  return {
    alive: true, distance: 0, speed: 120, y: 0, vy: 0,
    obstacles: [], coins: [], coinCount: 0, nearMisses: 0, nextId: 1, spawnIn: 190,
  };
}

/** Jump when grounded: a hop, or a higher big jump (the one extra-jump mechanic). */
export function runnerJump(state: RunnerState, big: boolean): RunnerState {
  if (!state.alive || state.y > 0.01) return state;
  return { ...state, vy: big ? 760 : 560 };
}

const RUNNER_GRAVITY = 1650;
const RUNNER_PX_PER_M = 46;

export function runnerStep(state: RunnerState, dt: number, rng: Rng): RunnerState {
  if (!state.alive) return state;
  const s: RunnerState = {
    ...state,
    obstacles: state.obstacles.map((o) => ({ ...o })),
    coins: state.coins.map((c) => ({ ...c })),
  };
  s.speed = Math.min(265, 120 + s.distance * 1.15);
  const dx = s.speed * dt;
  s.distance += dx / RUNNER_PX_PER_M;
  // Vertical physics.
  if (s.y > 0 || s.vy > 0) {
    s.vy -= RUNNER_GRAVITY * dt;
    s.y += s.vy * dt;
    if (s.y <= 0) { s.y = 0; s.vy = 0; }
  }
  // Obstacles and coins scroll toward the runner.
  for (const o of s.obstacles) o.x -= dx;
  for (const c of s.coins) c.x -= dx;
  // Spawn the next obstacle (and sometimes a coin string) off-screen right.
  s.spawnIn -= dx;
  if (s.spawnIn <= 0) {
    const h = 24 + Math.floor(rng() * 32); // 24–55
    const w = 20 + Math.floor(rng() * 14); // 20–33
    s.obstacles.push({ id: s.nextId++, x: RUNNER_W + 12, w, h, counted: false });
    if (rng() < 0.65) {
      const cy = rng() < 0.5 ? 16 : 78;
      for (let i = 0; i < 3; i++) s.coins.push({ id: s.nextId++, x: RUNNER_W + 30 + i * 26, y: cy, taken: false });
    }
    s.spawnIn = 165 + rng() * 130;
  }
  s.obstacles = s.obstacles.filter((o) => o.x + o.w > -20);
  s.coins = s.coins.filter((c) => c.x > -20 && !c.taken);
  // Coin pickups: the coin is at the runner's x and near his body.
  for (const c of s.coins) {
    if (Math.abs(c.x - RUNNER_X) < 20 && Math.abs(c.y - s.y) < 30) {
      c.taken = true;
      s.coinCount++;
    }
  }
  s.coins = s.coins.filter((c) => !c.taken);
  // Obstacles: collision, then the pass moment (near-miss lives there).
  for (const o of s.obstacles) {
    const overlapX = o.x < RUNNER_X + RUNNER_SIZE - 4 && o.x + o.w > RUNNER_X + 4;
    if (overlapX && s.y < o.h - 2) {
      s.alive = false;
      return s;
    }
    if (!o.counted && o.x + o.w < RUNNER_X) {
      o.counted = true;
      const clearance = s.y - o.h;
      if (clearance >= 0 && clearance < 20) s.nearMisses++;
    }
  }
  return s;
}

export function runnerScore(state: RunnerState): number {
  return Math.floor(state.distance) + state.coinCount * 25 + state.nearMisses * 5;
}

// ─── Glide ───────────────────────────────────────────────────────────────────

export const GLIDE_W = 320;
export const GLIDE_H = 300;
export const GLIDE_X = 66;
export const GLIDE_SIZE = 20;

export interface GlideGate { id: number; x: number; gapY: number; passed: boolean }
export interface GlideState {
  alive: boolean;
  y: number;
  vy: number;
  gates: GlideGate[];
  gatesCleared: number;
  nextId: number;
  spawnIn: number;
}

export function glideStart(): GlideState {
  return { alive: true, y: GLIDE_H / 2, vy: 0, gates: [], gatesCleared: 0, nextId: 1, spawnIn: 210 };
}

const GLIDE_GRAVITY = 1350;
const GLIDE_FLAP = -430;
const GLIDE_GAP = 112;
const GLIDE_SPEED = 118;

export function glideStep(state: GlideState, dt: number, flap: boolean, rng: Rng): GlideState {
  if (!state.alive) return state;
  const s: GlideState = { ...state, gates: state.gates.map((g) => ({ ...g })) };
  s.vy = flap ? GLIDE_FLAP : s.vy + GLIDE_GRAVITY * dt;
  s.y += s.vy * dt;
  const dx = GLIDE_SPEED * dt;
  for (const g of s.gates) g.x -= dx;
  s.spawnIn -= dx;
  if (s.spawnIn <= 0) {
    s.gates.push({ id: s.nextId++, x: GLIDE_W + 10, gapY: 60 + rng() * (GLIDE_H - 120 - GLIDE_GAP), passed: false });
    s.spawnIn = 168;
  }
  s.gates = s.gates.filter((g) => g.x > -60);
  if (s.y <= 0 || s.y >= GLIDE_H - GLIDE_SIZE) {
    s.alive = false;
    return s;
  }
  for (const g of s.gates) {
    const inGateX = g.x < GLIDE_X + GLIDE_SIZE - 3 && g.x + 46 > GLIDE_X + 3;
    if (inGateX) {
      const inGap = s.y > g.gapY + 2 && s.y + GLIDE_SIZE < g.gapY + GLIDE_GAP - 2;
      if (!inGap) {
        s.alive = false;
        return s;
      }
    }
    if (!g.passed && g.x + 46 < GLIDE_X) {
      g.passed = true;
      s.gatesCleared++;
    }
  }
  return s;
}

export function glideScore(state: GlideState): number {
  return state.gatesCleared * 20;
}

// ─── Snake ───────────────────────────────────────────────────────────────────

export const SNAKE_COLS = 14;
export const SNAKE_ROWS = 14;
export const SNAKE_TICK_MS = 160;

export type SnakeDir = { x: number; y: number };
export interface SnakeCell { x: number; y: number }
export interface SnakeState {
  alive: boolean;
  cells: SnakeCell[];
  dir: SnakeDir;
  pendingDir: SnakeDir;
  food: SnakeCell;
  foodEaten: number;
  ticks: number;
}

function snakeSpawnFood(cells: SnakeCell[], rng: Rng): SnakeCell {
  for (let guard = 0; guard < 200; guard++) {
    const spot = { x: Math.floor(rng() * SNAKE_COLS), y: Math.floor(rng() * SNAKE_ROWS) };
    if (!cells.some((c) => c.x === spot.x && c.y === spot.y)) return spot;
  }
  return { x: 0, y: 0 };
}

export function snakeStart(rng: Rng): SnakeState {
  const cells = [{ x: 6, y: 7 }, { x: 5, y: 7 }, { x: 4, y: 7 }];
  return {
    alive: true, cells, dir: { x: 1, y: 0 }, pendingDir: { x: 1, y: 0 },
    food: snakeSpawnFood(cells, rng), foodEaten: 0, ticks: 0,
  };
}

/** Queue a turn; reversing into your own neck is refused. */
export function snakeTurn(state: SnakeState, dir: SnakeDir): SnakeState {
  if (dir.x === -state.dir.x && dir.y === -state.dir.y) return state;
  return { ...state, pendingDir: dir };
}

export function snakeStep(state: SnakeState, rng: Rng): SnakeState {
  if (!state.alive) return state;
  const dir = state.pendingDir;
  const head = { x: state.cells[0].x + dir.x, y: state.cells[0].y + dir.y };
  if (head.x < 0 || head.y < 0 || head.x >= SNAKE_COLS || head.y >= SNAKE_ROWS) {
    return { ...state, alive: false, dir };
  }
  const eating = head.x === state.food.x && head.y === state.food.y;
  const bodyToCheck = eating ? state.cells : state.cells.slice(0, -1);
  if (bodyToCheck.some((c) => c.x === head.x && c.y === head.y)) {
    return { ...state, alive: false, dir };
  }
  const cells = [head, ...state.cells];
  if (!eating) cells.pop();
  return {
    alive: true,
    cells,
    dir,
    pendingDir: dir,
    food: eating ? snakeSpawnFood(cells, rng) : state.food,
    foodEaten: state.foodEaten + (eating ? 1 : 0),
    ticks: state.ticks + 1,
  };
}

export function snakeScore(state: SnakeState): number {
  return state.foodEaten * 15 + Math.floor((state.ticks * SNAKE_TICK_MS) / 1000);
}

// ─── Breakout ────────────────────────────────────────────────────────────────

export const BREAKOUT_W = 320;
export const BREAKOUT_H = 300;
export const BREAKOUT_PADDLE_W = 64;
export const BREAKOUT_PADDLE_Y = BREAKOUT_H - 26;

export interface BreakoutBrick { id: number; row: number; x: number; y: number; alive: boolean }
export interface BreakoutState {
  alive: boolean;
  paddleX: number;
  ball: { x: number; y: number; vx: number; vy: number };
  bricks: BreakoutBrick[];
  bricksBroken: number;
  rowsCleared: number;
  rowsSpawned: number;
  nextId: number;
  rowTimer: number;
  clearedRows: number[];
}

const BRICK_COLS = 6;
const BRICK_W = 48;
const BRICK_H = 15;
const BRICK_GAP = 4;

function breakoutRow(row: number, y: number, nextId: number): BreakoutBrick[] {
  const out: BreakoutBrick[] = [];
  for (let c = 0; c < BRICK_COLS; c++) {
    out.push({ id: nextId + c, row, x: 6 + c * (BRICK_W + BRICK_GAP), y, alive: true });
  }
  return out;
}

export function breakoutStart(): BreakoutState {
  const bricks = [...breakoutRow(0, 18, 1), ...breakoutRow(1, 18 + BRICK_H + 6, 100)];
  return {
    alive: true,
    paddleX: (BREAKOUT_W - BREAKOUT_PADDLE_W) / 2,
    ball: { x: BREAKOUT_W / 2, y: BREAKOUT_PADDLE_Y - 30, vx: 130, vy: -190 },
    bricks, bricksBroken: 0, rowsCleared: 0, rowsSpawned: 2, nextId: 200, rowTimer: 0, clearedRows: [],
  };
}

export function breakoutStep(state: BreakoutState, dt: number): BreakoutState {
  if (!state.alive) return state;
  const s: BreakoutState = {
    ...state,
    ball: { ...state.ball },
    bricks: state.bricks.map((b) => ({ ...b })),
    clearedRows: [...state.clearedRows],
  };
  // A fresh row lands every six seconds; standing rows ease down,
  // and any brick that slides past the paddle line is swept away
  // (the only way this run ends is losing the ball).
  s.rowTimer += dt;
  if (s.rowTimer >= 6) {
    s.rowTimer = 0;
    for (const b of s.bricks) b.y += BRICK_H + 6;
    const rowIndex = s.rowsSpawned++;
    s.bricks.push(...breakoutRow(rowIndex, 18, s.nextId));
    s.nextId += 100;
  }
  s.bricks = s.bricks.filter((b) => b.y < BREAKOUT_PADDLE_Y - 6);
  // Ball flight.
  const b = s.ball;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  if (b.x < 8) { b.x = 8; b.vx = Math.abs(b.vx); }
  if (b.x > BREAKOUT_W - 8) { b.x = BREAKOUT_W - 8; b.vx = -Math.abs(b.vx); }
  if (b.y < 8) { b.y = 8; b.vy = Math.abs(b.vy); }
  if (b.y > BREAKOUT_H + 12) {
    s.alive = false;
    return s;
  }
  // Paddle bounce: angle follows where the ball met the paddle.
  if (b.vy > 0 && b.y + 8 >= BREAKOUT_PADDLE_Y && b.y < BREAKOUT_PADDLE_Y + 12 && b.x >= s.paddleX - 6 && b.x <= s.paddleX + BREAKOUT_PADDLE_W + 6) {
    const offset = (b.x - (s.paddleX + BREAKOUT_PADDLE_W / 2)) / (BREAKOUT_PADDLE_W / 2);
    const speed = Math.min(300, Math.hypot(b.vx, b.vy) * 1.02);
    const angle = offset * 1.05;
    b.vx = speed * Math.sin(angle);
    b.vy = -speed * Math.cos(angle);
    b.y = BREAKOUT_PADDLE_Y - 9;
  }
  // Brick hits.
  for (const brick of s.bricks) {
    if (!brick.alive) continue;
    if (b.x + 7 >= brick.x && b.x - 7 <= brick.x + BRICK_W && b.y + 7 >= brick.y && b.y - 7 <= brick.y + BRICK_H) {
      brick.alive = false;
      s.bricksBroken++;
      b.vy = -b.vy;
      const rowAlive = s.bricks.some((o) => o.row === brick.row && o.alive);
      if (!rowAlive && !s.clearedRows.includes(brick.row)) {
        s.clearedRows.push(brick.row);
        s.rowsCleared++;
      }
      break;
    }
  }
  return s;
}

export function breakoutScore(state: BreakoutState): number {
  return state.bricksBroken * 10 + state.rowsCleared * 100;
}

// ─── Drop Match ──────────────────────────────────────────────────────────────

export const DROP_COLS = 6;
export const DROP_ROWS = 10;
export const DROP_COLORS = ["#C9452F", "#F5C04A", "#7FB069", "#4A7FC9", "#8B6FD8"] as const;
export type DropColor = (typeof DROP_COLORS)[number];

/** Columns, each a bottom-up stack of colours (index 0 = the floor). */
export type DropGrid = DropColor[][];

export function dropStart(): DropGrid {
  return Array.from({ length: DROP_COLS }, () => []);
}

/** A new row lands: one block per column, inserted at the floor. True when the pile tops out. */
export function dropAddRow(grid: DropGrid, rng: Rng): { grid: DropGrid; toppedOut: boolean } {
  const next = grid.map((col, c) => {
    const color = DROP_COLORS[Math.min(DROP_COLORS.length - 1, Math.floor(rng() * DROP_COLORS.length))];
    void c;
    return [color, ...col];
  });
  return { grid: next, toppedOut: next.some((col) => col.length > DROP_ROWS) };
}

/** The connected same-colour group touching (col, row), row counted from the floor. */
export function dropFindGroup(grid: DropGrid, col: number, row: number): { col: number; row: number }[] {
  const color = grid[col]?.[row];
  if (!color) return [];
  const seen = new Set<string>([`${col},${row}`]);
  const queue = [{ col, row }];
  const out: { col: number; row: number }[] = [];
  while (queue.length) {
    const cell = queue.pop()!;
    out.push(cell);
    const neighbours = [
      { col: cell.col + 1, row: cell.row }, { col: cell.col - 1, row: cell.row },
      { col: cell.col, row: cell.row + 1 }, { col: cell.col, row: cell.row - 1 },
    ];
    for (const n of neighbours) {
      const key = `${n.col},${n.row}`;
      if (seen.has(key)) continue;
      if (grid[n.col]?.[n.row] === color) {
        seen.add(key);
        queue.push(n);
      }
    }
  }
  return out;
}

/** Clear a group (3+): those blocks vanish and each column settles. Smaller taps do nothing. */
export function dropClearGroup(grid: DropGrid, group: { col: number; row: number }[]): DropGrid {
  if (group.length < 3) return grid;
  const removed = new Set(group.map((g) => `${g.col},${g.row}`));
  return grid.map((column, c) => column.filter((_, r) => !removed.has(`${c},${r}`)));
}

// ─── Crossroads ──────────────────────────────────────────────────────────────

export const CROSS_SIZE = 300;
export const CROSS_CENTER = CROSS_SIZE / 2;
export const CROSS_BOX = 34; // half-width of the middle box a crossing pair can share

export type CrossDir = "N" | "S" | "E" | "W";
export interface CrossCar {
  id: number;
  dir: CrossDir;
  /** Distance along its approach axis, px; the intersection centre sits at CROSS_CENTER. */
  pos: number;
  stopped: boolean;
  nearCounted: boolean;
}
export interface CrossState {
  alive: boolean;
  cars: CrossCar[];
  cleared: number;
  nearMisses: number;
  elapsed: number;
  nextId: number;
  spawnIn: number;
  countedPairs: string[];
}

export function crossStart(): CrossState {
  return { alive: true, cars: [], cleared: 0, nearMisses: 0, elapsed: 0, nextId: 1, spawnIn: 0.4, countedPairs: [] };
}

const CROSS_DIRS: CrossDir[] = ["N", "S", "E", "W"];
const perpendicular = (a: CrossDir, b: CrossDir) => (a === "N" || a === "S") !== (b === "N" || b === "S");
const crossSpeed = (elapsed: number) => Math.min(96, 46 + elapsed * 0.55);
const crossInBox = (car: CrossCar) => Math.abs(car.pos - CROSS_CENTER) < CROSS_BOX;

export function crossToggle(state: CrossState, id: number): CrossState {
  return { ...state, cars: state.cars.map((c) => (c.id === id ? { ...c, stopped: !c.stopped } : c)) };
}

export function crossStep(state: CrossState, dt: number, rng: Rng): CrossState {
  if (!state.alive) return state;
  const s: CrossState = {
    ...state,
    cars: state.cars.map((c) => ({ ...c })),
    countedPairs: [...state.countedPairs],
  };
  s.elapsed += dt;
  // Spawning ramps: the gap between cars shrinks as the run ages.
  s.spawnIn -= dt;
  if (s.spawnIn <= 0) {
    const dir = CROSS_DIRS[Math.min(3, Math.floor(rng() * 4))];
    if (!s.cars.some((c) => c.dir === dir && c.pos < 46)) {
      s.cars.push({ id: s.nextId++, dir, pos: -24, stopped: false, nearCounted: false });
    }
    s.spawnIn = Math.max(0.85, 2.1 - s.elapsed * 0.016) * (0.75 + rng() * 0.5);
  }
  const speed = crossSpeed(s.elapsed);
  // Movement: stopped cars wait; a moving car also waits behind a
  // slower/stopped car in its own lane. No impatience — they just queue.
  for (const car of s.cars) {
    if (car.stopped) continue;
    const ahead = s.cars.some((o) => o.id !== car.id && o.dir === car.dir && o.pos > car.pos && o.pos - car.pos < 44);
    if (!ahead) car.pos += speed * dt;
  }
  // Cleared the far side: +1 car home safe.
  const before = s.cars.length;
  s.cars = s.cars.filter((c) => c.pos < CROSS_SIZE + 26);
  s.cleared += before - s.cars.length;
  // Collision: two cars from crossing directions inside the middle
  // box at the same time. (Same-axis pairs pass on offset lanes.)
  for (let i = 0; i < s.cars.length; i++) {
    for (let j = i + 1; j < s.cars.length; j++) {
      const a = s.cars[i];
      const b = s.cars[j];
      if (perpendicular(a.dir, b.dir) && crossInBox(a) && crossInBox(b)) {
        s.alive = false;
        return s;
      }
    }
  }
  // Near-miss: a car leaves the box while a crossing car is in the
  // wider near zone but NOT in the box — they threaded the needle.
  for (const car of s.cars) {
    if (car.nearCounted) continue;
    if (Math.abs(car.pos - CROSS_CENTER) >= CROSS_BOX && car.pos > CROSS_CENTER) {
      const other = s.cars.find(
        (o) => o.id !== car.id && perpendicular(o.dir, car.dir) && Math.abs(o.pos - CROSS_CENTER) < 68 && !crossInBox(o),
      );
      if (other) {
        const key = [Math.min(car.id, other.id), Math.max(car.id, other.id)].join(":");
        if (!s.countedPairs.includes(key)) {
          s.countedPairs.push(key);
          s.nearMisses++;
        }
      }
      car.nearCounted = true;
    }
  }
  return s;
}

export function crossScore(state: CrossState): number {
  return state.cleared * 10 + state.nearMisses * 15;
}

// ─── Jumper ──────────────────────────────────────────────────────────────────

export const JUMP_VIEW = 340;
export const JUMP_W = 320;

export type JumpPlatformType = "steady" | "moving" | "crumble";
export interface JumpPlatform { id: number; x: number; y: number; type: JumpPlatformType; vx: number; used: boolean }
export interface JumpCoin { id: number; x: number; y: number; taken: boolean }
export interface JumpState {
  alive: boolean;
  x: number;
  /** World altitude of the player's feet (up is positive). */
  y: number;
  vy: number;
  camY: number;
  altMax: number;
  coinsCollected: number;
  platforms: JumpPlatform[];
  coins: JumpCoin[];
  nextId: number;
  topY: number;
}

const JUMP_GRAVITY = 1500;
const JUMP_BOUNCE = 640;
const JUMP_STEER = 235;
export const JUMP_PLAT_W = 56;

function jumpPlatform(id: number, y: number, rng: Rng): JumpPlatform {
  const roll = rng();
  const type: JumpPlatformType = roll < 0.55 ? "steady" : roll < 0.8 ? "moving" : "crumble";
  return {
    id, x: rng() * (JUMP_W - JUMP_PLAT_W), y, type,
    vx: type === "moving" ? (rng() < 0.5 ? -42 : 42) : 0, used: false,
  };
}

export function jumpStart(rng: Rng): JumpState {
  const platforms: JumpPlatform[] = [{ id: 0, x: JUMP_W / 2 - JUMP_PLAT_W / 2, y: 0, type: "steady", vx: 0, used: false }];
  const coins: JumpCoin[] = [];
  let y = 0;
  let id = 1;
  while (y < JUMP_VIEW + 160) {
    y += 52 + rng() * 30;
    const p = jumpPlatform(id++, y, rng);
    platforms.push(p);
    if (rng() < 0.3) coins.push({ id: id++, x: p.x + JUMP_PLAT_W / 2 - 7, y: y + 26, taken: false });
  }
  return {
    alive: true, x: JUMP_W / 2, y: 8, vy: JUMP_BOUNCE, camY: 0, altMax: 0,
    coinsCollected: 0, platforms, coins, nextId: id, topY: y,
  };
}

export function jumpStep(state: JumpState, dt: number, steer: -1 | 0 | 1, rng: Rng): JumpState {
  if (!state.alive) return state;
  const s: JumpState = {
    ...state,
    platforms: state.platforms.map((p) => ({ ...p })),
    coins: state.coins.map((c) => ({ ...c })),
  };
  const prevFeet = s.y;
  s.vy -= JUMP_GRAVITY * dt;
  s.y += s.vy * dt;
  s.x += steer * JUMP_STEER * dt;
  if (s.x < -18) s.x = JUMP_W + 18;
  if (s.x > JUMP_W + 18) s.x = -18;
  // Moving platforms patrol their stretch.
  for (const p of s.platforms) {
    if (p.type === "moving") {
      p.x += p.vx * dt;
      if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx); }
      if (p.x > JUMP_W - JUMP_PLAT_W) { p.x = JUMP_W - JUMP_PLAT_W; p.vx = -Math.abs(p.vx); }
    }
  }
  // Bounce: only while falling, only crossing a platform top.
  if (s.vy < 0) {
    for (const p of s.platforms) {
      if (p.used && p.type === "crumble") continue;
      const crossed = prevFeet >= p.y && s.y <= p.y;
      const overX = s.x + 14 > p.x && s.x - 14 < p.x + JUMP_PLAT_W;
      if (crossed && overX) {
        s.y = p.y;
        s.vy = JUMP_BOUNCE;
        if (p.type === "crumble") p.used = true;
        break;
      }
    }
  }
  s.platforms = s.platforms.filter((p) => !(p.type === "crumble" && p.used && p.y < s.y - 4));
  // Coins hang just above platforms; passing through one collects it.
  for (const c of s.coins) {
    if (!c.taken && Math.abs(c.x + 7 - s.x) < 22 && Math.abs(c.y - (s.y + 16)) < 24) {
      c.taken = true;
      s.coinsCollected++;
    }
  }
  // The camera only climbs; fresh platforms and coins spawn above.
  s.altMax = Math.max(s.altMax, s.y);
  if (s.y - s.camY > JUMP_VIEW * 0.45) s.camY = s.y - JUMP_VIEW * 0.45;
  while (s.topY < s.camY + JUMP_VIEW + 140) {
    s.topY += 52 + rng() * 30;
    const p = jumpPlatform(s.nextId++, s.topY, rng);
    s.platforms.push(p);
    if (rng() < 0.3) s.coins.push({ id: s.nextId++, x: p.x + JUMP_PLAT_W / 2 - 7, y: s.topY + 26, taken: false });
  }
  s.platforms = s.platforms.filter((p) => p.y > s.camY - 30);
  s.coins = s.coins.filter((c) => !c.taken && c.y > s.camY - 30);
  // Fell below the camera: the run ends.
  if (s.y < s.camY - 6) s.alive = false;
  return s;
}

export function jumpScore(state: JumpState): number {
  return Math.floor(state.altMax) + state.coinsCollected * 20;
}

// ─── v399 — six more run games ───────────────────────────────────────────────
// Same architecture as the v398 seven: a small state object, pure
// step functions, the score composed in the state or by a score fn.
// A run CAN end in each of them — Plinko after its tenth ball,
// Cave Flyer on the cave wall, Colour Rush on its third lost life,
// Rockfall when the garden's third life goes, Mole Patrol when its
// sixty seconds run out, Slide 2048 when no move remains — and
// ending settles through the same v397 conversion.

// ─── Plinko Drop ─────────────────────────────────────────────────────────────

export const PLINKO_W = 320;
export const PLINKO_ROWS = 8; // peg rows — eight deflections, nine slots
export const PLINKO_BALLS_PER_RUN = 10;
/** Slot values, left to right: the edges pay, the centre barely does. */
export const PLINKO_SLOTS = [250, 100, 50, 25, 10, 25, 50, 100, 250] as const;

export interface PlinkoBall {
  /** Position in slot units (0–8); each peg row shifts it half a slot. */
  bin: number;
  /** Peg rows passed so far. */
  row: number;
}
export interface PlinkoState {
  over: boolean;
  /** Where the next ball will drop, in slot units (0–8). */
  aim: number;
  ball: PlinkoBall | null;
  /** Balls dropped so far this run. */
  dropped: number;
  score: number;
  lastSlot: number | null;
  lastPoints: number;
}

export function plinkoStart(): PlinkoState {
  return { over: false, aim: 4, ball: null, dropped: 0, score: 0, lastSlot: null, lastPoints: 0 };
}

/** Slide the drop point along the top rail. Applies to the next drop. */
export function plinkoAim(state: PlinkoState, aim: number): PlinkoState {
  return { ...state, aim: Math.min(8, Math.max(0, aim)) };
}

/** Release a ball from the chute the aim sits over. One at a time. */
export function plinkoDrop(state: PlinkoState): PlinkoState {
  if (state.over || state.ball || state.dropped >= PLINKO_BALLS_PER_RUN) return state;
  return {
    ...state,
    ball: { bin: Math.round(state.aim), row: 0 },
    dropped: state.dropped + 1,
    lastSlot: null,
    lastPoints: 0,
  };
}

/**
 * The ball falls one peg row per step, deflecting half a slot left
 * or right at each peg (the walls keep it on the board). After the
 * eighth row it settles into a slot and banks that slot's value;
 * the run ends when the tenth ball settles.
 */
export function plinkoStep(state: PlinkoState, rng: Rng): PlinkoState {
  const ball = state.ball;
  if (!ball || state.over) return state;
  if (ball.row >= PLINKO_ROWS) {
    const slot = Math.min(PLINKO_SLOTS.length - 1, Math.max(0, Math.round(ball.bin)));
    const points = PLINKO_SLOTS[slot];
    return {
      ...state,
      ball: null,
      score: state.score + points,
      lastSlot: slot,
      lastPoints: points,
      over: state.dropped >= PLINKO_BALLS_PER_RUN,
    };
  }
  const bin = Math.min(8, Math.max(0, ball.bin + (rng() < 0.5 ? -0.5 : 0.5)));
  return { ...state, ball: { bin, row: ball.row + 1 } };
}

export function plinkoScore(state: PlinkoState): number {
  return state.score;
}

// ─── Cave Flyer ──────────────────────────────────────────────────────────────

export const CAVE_W = 320;
export const CAVE_H = 300;
export const CAVE_X = 62;
export const CAVE_SIZE = 18;
export const CAVE_COL_W = 26;
export const CAVE_COLS = Math.ceil(CAVE_W / CAVE_COL_W) + 3;
export const CAVE_RING_POINTS = 30;

export interface CaveRing { id: number; x: number; y: number; taken: boolean }
export interface CaveState {
  alive: boolean;
  /** The flyer's centre height, px from the top. */
  y: number;
  vy: number;
  /** Metres flown (float); the score floors it. */
  distance: number;
  /** Ceiling bottom edge per screen column. */
  ceil: number[];
  /** Floor top edge per screen column. */
  floor: number[];
  /** Sub-column scroll, px. */
  scroll: number;
  gapCenter: number;
  gapHalf: number;
  rings: CaveRing[];
  ringsCollected: number;
  nextId: number;
}

const CAVE_PX_PER_M = 46;
const CAVE_GRAVITY = 1080;
const CAVE_THRUST = -1980;
const caveSpeed = (distance: number) => Math.min(192, 128 + distance * 0.55);
const caveColOfFlyer = Math.floor(CAVE_X / CAVE_COL_W);

interface CaveColumn { ceil: number; floor: number; center: number; half: number }

/** Generate the next column past the right edge: the gap wanders, narrows, roughens. */
function caveNextColumn(center: number, half: number, distance: number, rng: Rng): CaveColumn {
  const targetHalf = Math.max(54, 96 - distance * 0.3);
  const nextHalf = half + Math.max(-1.5, Math.min(1.5, targetHalf - half));
  const wander = Math.min(26, 10 + distance * 0.012);
  const nextCenter = Math.min(
    CAVE_H - nextHalf - 10,
    Math.max(nextHalf + 10, center + (rng() - 0.5) * 2 * wander),
  );
  const ceil = Math.min(CAVE_H - 84, Math.max(2, nextCenter - nextHalf + (rng() - 0.5) * 13));
  const floor = Math.max(ceil + 66, Math.min(CAVE_H - 2, nextCenter + nextHalf + (rng() - 0.5) * 13));
  return { ceil, floor, center: nextCenter, half: nextHalf };
}

export function caveStart(): CaveState {
  const ceil: number[] = [];
  const floor: number[] = [];
  for (let i = 0; i < CAVE_COLS; i++) {
    ceil.push(CAVE_H / 2 - 96);
    floor.push(CAVE_H / 2 + 96);
  }
  return {
    alive: true, y: CAVE_H / 2, vy: 0, distance: 0,
    ceil, floor, scroll: 0, gapCenter: CAVE_H / 2, gapHalf: 96,
    rings: [], ringsCollected: 0, nextId: 1,
  };
}

/**
 * One step of the cave. Hold to rise, release to fall — the old
 * helicopter contract. The terrain scrolls left; a fresh column
 * generates per column-width scrolled, and its gap is a little
 * meaner than the last. Touching ceiling or floor ends the run.
 */
export function caveStep(state: CaveState, dt: number, thrust: boolean, rng: Rng): CaveState {
  if (!state.alive) return state;
  const s: CaveState = {
    ...state,
    ceil: [...state.ceil],
    floor: [...state.floor],
    rings: state.rings.map((r) => ({ ...r })),
  };
  s.vy += (thrust ? CAVE_THRUST : CAVE_GRAVITY) * dt;
  s.vy = Math.max(-335, Math.min(385, s.vy));
  s.y += s.vy * dt;
  const dx = caveSpeed(s.distance) * dt;
  s.distance += dx / CAVE_PX_PER_M;
  // Scroll: whole columns shift out, new ones generate in.
  s.scroll += dx;
  while (s.scroll >= CAVE_COL_W) {
    s.scroll -= CAVE_COL_W;
    s.ceil.shift();
    s.floor.shift();
    const col = caveNextColumn(s.gapCenter, s.gapHalf, s.distance, rng);
    s.ceil.push(col.ceil);
    s.floor.push(col.floor);
    s.gapCenter = col.center;
    s.gapHalf = col.half;
    if (rng() < 0.14) {
      s.rings.push({
        id: s.nextId++,
        x: CAVE_W + 26,
        y: col.center + (rng() - 0.5) * col.half * 0.8,
        taken: false,
      });
    }
  }
  // Rings drift with the terrain; flying through one pays 30.
  for (const ring of s.rings) {
    ring.x -= dx;
    if (!ring.taken && Math.abs(ring.x - CAVE_X) < 17 && Math.abs(ring.y - s.y) < 27) {
      ring.taken = true;
      s.ringsCollected++;
    }
  }
  s.rings = s.rings.filter((r) => !r.taken && r.x > -24);
  // The wall is the end of it.
  const ceilY = s.ceil[caveColOfFlyer] ?? 0;
  const floorY = s.floor[caveColOfFlyer] ?? CAVE_H;
  if (s.y - CAVE_SIZE / 2 <= ceilY || s.y + CAVE_SIZE / 2 >= floorY) {
    s.alive = false;
  }
  return s;
}

export function caveScore(state: CaveState): number {
  return Math.floor(state.distance) + state.ringsCollected * CAVE_RING_POINTS;
}

// ─── Colour Rush ─────────────────────────────────────────────────────────────

export interface RushColor { name: string; hex: string }
export const RUSH_COLORS: readonly RushColor[] = [
  { name: "RED", hex: "#C0392B" },
  { name: "BLUE", hex: "#2F6FDE" },
  { name: "GREEN", hex: "#3E8E4F" },
  { name: "GOLD", hex: "#D9940A" },
  { name: "PURPLE", hex: "#7C4DBD" },
];
export const RUSH_START_LIVES = 3;
export const RUSH_CORRECT_POINTS = 15;
export const RUSH_FAST_BONUS = 5;
export const RUSH_FAST_MS = 1000;

export interface RushRound {
  /** Index of the word's colour name. */
  word: number;
  /** Index of the ink it is printed in — the answer. */
  ink: number;
  /** The four answer swatches (colour indices), shuffled. */
  choices: number[];
}
export interface RushState {
  alive: boolean;
  lives: number;
  correct: number;
  score: number;
  round: RushRound;
}

function rushShuffle(values: number[], rng: Rng): number[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = pickIndex(i + 1, rng);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Deal a round: three times in four the word lies about the ink —
 * that disagreement is the whole game. The ink is always among the
 * four swatches.
 */
export function rushRound(rng: Rng): RushRound {
  const ink = pickIndex(RUSH_COLORS.length, rng);
  let word = ink;
  if (rng() < 0.75) {
    do {
      word = pickIndex(RUSH_COLORS.length, rng);
    } while (word === ink);
  }
  const distractors = rushShuffle(
    RUSH_COLORS.map((_, i) => i).filter((i) => i !== ink),
    rng,
  ).slice(0, 3);
  return { word, ink, choices: rushShuffle([ink, ...distractors], rng) };
}

/** +15 for the right ink, +5 more when the answer lands inside a second. */
export function rushPoints(elapsedMs: number): number {
  return RUSH_CORRECT_POINTS + (elapsedMs < RUSH_FAST_MS ? RUSH_FAST_BONUS : 0);
}

/** The per-round clock: three seconds at first, shrinking toward 1.2s. */
export function rushTimeLimitMs(correct: number): number {
  return Math.max(1200, 3000 - correct * 80);
}

export function rushStart(rng: Rng): RushState {
  return { alive: true, lives: RUSH_START_LIVES, correct: 0, score: 0, round: rushRound(rng) };
}

export interface RushAnswerResult {
  state: RushState;
  result: "correct" | "wrong" | "over";
}

/** Answer a round: right ink banks the points; a wrong one costs a life. */
export function rushAnswer(state: RushState, choice: number, elapsedMs: number, rng: Rng): RushAnswerResult {
  if (!state.alive) return { state, result: "over" };
  if (choice === state.round.ink) {
    const next: RushState = {
      ...state,
      correct: state.correct + 1,
      score: state.score + rushPoints(elapsedMs),
      round: rushRound(rng),
    };
    return { state: next, result: "correct" };
  }
  const lives = state.lives - 1;
  const next: RushState = {
    ...state,
    lives,
    alive: lives > 0,
    round: lives > 0 ? rushRound(rng) : state.round,
  };
  return { state: next, result: "wrong" };
}

/** The clock running out costs exactly what a wrong tap costs. */
export function rushTimeout(state: RushState, rng: Rng): RushState {
  if (!state.alive) return state;
  const lives = state.lives - 1;
  return {
    ...state,
    lives,
    alive: lives > 0,
    round: lives > 0 ? rushRound(rng) : state.round,
  };
}

export function rushScore(state: RushState): number {
  return state.score;
}

// ─── Rockfall ────────────────────────────────────────────────────────────────

export const ROCK_W = 320;
export const ROCK_H = 300;
export const ROCK_GARDEN_Y = ROCK_H - 34;
export const ROCK_START_LIVES = 3;

export type RockSize = "small" | "medium" | "large";
export const ROCK_HP: Record<RockSize, number> = { small: 1, medium: 2, large: 3 };
export const ROCK_POINTS: Record<RockSize, number> = { small: 10, medium: 20, large: 30 };
export const ROCK_RADIUS: Record<RockSize, number> = { small: 13, medium: 19, large: 27 };

export interface Rock {
  id: number;
  x: number;
  y: number;
  size: RockSize;
  hp: number;
  /** Fall speed, px/s, snapshotted at spawn (splits fall faster). */
  speed: number;
  fast: boolean;
}
export interface RockState {
  alive: boolean;
  lives: number;
  rocks: Rock[];
  score: number;
  elapsed: number;
  spawnIn: number;
  nextId: number;
}

const rockBaseSpeed = (size: RockSize) => (size === "small" ? 58 : size === "medium" ? 50 : 42);
const rockRamp = (elapsed: number) => 1 + elapsed * 0.012;

function rockSpawn(state: RockState, rng: Rng): Rock {
  const roll = rng();
  const size: RockSize = roll < 0.45 ? "small" : roll < 0.78 ? "medium" : "large";
  return {
    id: state.nextId,
    x: 24 + rng() * (ROCK_W - 48),
    y: -ROCK_RADIUS[size],
    size,
    hp: ROCK_HP[size],
    speed: rockBaseSpeed(size) * rockRamp(state.elapsed),
    fast: false,
  };
}

export function rockStart(): RockState {
  return { alive: true, lives: ROCK_START_LIVES, rocks: [], score: 0, elapsed: 0, spawnIn: 0.5, nextId: 1 };
}

/**
 * Rocks fall; spawns thicken and everything falls a little faster
 * as the run ages. A rock that reaches the garden strip costs one
 * of three garden lives; the third costs the run.
 */
export function rockStep(state: RockState, dt: number, rng: Rng): RockState {
  if (!state.alive) return state;
  const s: RockState = { ...state, rocks: state.rocks.map((r) => ({ ...r })) };
  s.elapsed += dt;
  s.spawnIn -= dt;
  if (s.spawnIn <= 0) {
    s.rocks.push(rockSpawn(s, rng));
    s.nextId++;
    s.spawnIn = Math.max(0.55, 1.15 - s.elapsed * 0.008) * (0.7 + rng() * 0.6);
  }
  let lives = s.lives;
  const kept: Rock[] = [];
  for (const rock of s.rocks) {
    rock.y += rock.speed * dt;
    if (rock.y + ROCK_RADIUS[rock.size] >= ROCK_GARDEN_Y) {
      lives--;
      continue;
    }
    kept.push(rock);
  }
  s.rocks = kept;
  s.lives = Math.max(0, lives);
  if (s.lives <= 0) s.alive = false;
  return s;
}

/**
 * Tap a rock to crack it. Small rocks break in one tap, mediums in
 * two, larges in three — and a large, when it finally breaks, pays
 * its 30 and splits into two fast smalls where it fell.
 */
export function rockTap(state: RockState, id: number): RockState {
  if (!state.alive) return state;
  const rock = state.rocks.find((r) => r.id === id);
  if (!rock) return state;
  const hp = rock.hp - 1;
  if (hp > 0) {
    return { ...state, rocks: state.rocks.map((r) => (r.id === id ? { ...r, hp } : r)) };
  }
  const rocks = state.rocks.filter((r) => r.id !== id);
  let nextId = state.nextId;
  if (rock.size === "large") {
    for (const offset of [-17, 17]) {
      rocks.push({
        id: nextId++,
        x: Math.min(ROCK_W - 16, Math.max(16, rock.x + offset)),
        y: rock.y,
        size: "small",
        hp: ROCK_HP.small,
        speed: rockBaseSpeed("small") * rockRamp(state.elapsed) * 1.6,
        fast: true,
      });
    }
  }
  return {
    ...state,
    rocks,
    nextId,
    score: state.score + ROCK_POINTS[rock.size],
  };
}

export function rockScore(state: RockState): number {
  return state.score;
}

// ─── Mole Patrol ─────────────────────────────────────────────────────────────

export const MOLE_HOLES = 9;
export const MOLE_RUN_SECONDS = 60;
export const MOLE_TAP_POINTS = 10;
export const MOLE_GOLDEN_POINTS = 100;
export const MOLE_CHAIN_STEP = 2;
export const MOLE_CHAIN_WINDOW = 1.6; // seconds between taps before the chain cools

export type MoleKind = "mole" | "golden" | "flower";
export interface MoleHole { kind: MoleKind; age: number }
export interface MoleState {
  over: boolean;
  holes: (MoleHole | null)[];
  score: number;
  /** Consecutive scoring taps inside the window. */
  chain: number;
  chainAge: number;
  timeLeft: number;
  spawnIn: number;
}

/** How long each visitor stays up, in seconds. Gold is in a hurry. */
export function moleLifetime(kind: MoleKind): number {
  return kind === "golden" ? 0.75 : kind === "flower" ? 1.4 : 1.15;
}

export function moleStart(): MoleState {
  return {
    over: false,
    holes: Array(MOLE_HOLES).fill(null),
    score: 0,
    chain: 0,
    chainAge: 0,
    timeLeft: MOLE_RUN_SECONDS,
    spawnIn: 0.25,
  };
}

/**
 * The sixty-second patrol: visitors pop on a quickening clock —
 * moles mostly, a rare golden, and (once the run is ten seconds
 * old) the odd flower you must NOT tap. Un-tapped visitors duck
 * back down on their own; only the clock ends this run.
 */
export function moleStep(state: MoleState, dt: number, rng: Rng): MoleState {
  if (state.over) return state;
  const s: MoleState = { ...state, holes: state.holes.map((h) => (h ? { ...h } : null)) };
  s.timeLeft -= dt;
  if (s.timeLeft <= 0) {
    return { ...s, timeLeft: 0, over: true };
  }
  s.chainAge += dt;
  if (s.chainAge > MOLE_CHAIN_WINDOW) s.chain = 0;
  const elapsed = MOLE_RUN_SECONDS - s.timeLeft;
  for (let i = 0; i < s.holes.length; i++) {
    const hole = s.holes[i];
    if (!hole) continue;
    hole.age += dt;
    if (hole.age >= moleLifetime(hole.kind)) s.holes[i] = null;
  }
  s.spawnIn -= dt;
  if (s.spawnIn <= 0) {
    const empty = s.holes.map((h, i) => (h ? -1 : i)).filter((i) => i >= 0);
    if (empty.length > 0) {
      const idx = empty[pickIndex(empty.length, rng)];
      const roll = rng();
      const kind: MoleKind = roll < 0.06 ? "golden" : elapsed > 10 && roll < 0.22 ? "flower" : "mole";
      s.holes[idx] = { kind, age: 0 };
    }
    s.spawnIn = Math.max(0.38, 0.85 - elapsed * 0.006) * (0.7 + rng() * 0.6);
  }
  return s;
}

/**
 * Tap a bed. A mole pays 10 plus the chain (2 per step); the golden
 * mole pays a flat 100. An empty bed — or the flower — breaks the
 * chain and pays nothing; no tap here can cost a life.
 */
export function moleTap(state: MoleState, index: number): MoleState {
  if (state.over) return state;
  const hole = state.holes[index];
  const holes = [...state.holes];
  if (!hole || hole.kind === "flower") {
    holes[index] = null;
    return { ...state, holes, chain: 0, chainAge: 0 };
  }
  const points = hole.kind === "golden"
    ? MOLE_GOLDEN_POINTS
    : MOLE_TAP_POINTS + MOLE_CHAIN_STEP * state.chain;
  holes[index] = null;
  return {
    ...state,
    holes,
    score: state.score + points,
    chain: state.chain + 1,
    chainAge: 0,
  };
}

export function moleScore(state: MoleState): number {
  return state.score;
}

// ─── Slide 2048 ──────────────────────────────────────────────────────────────

export const SLIDE_SIZE = 4;
export const SLIDE_CELLS = SLIDE_SIZE * SLIDE_SIZE;

export type SlideGrid = number[];
export type SlideDirection = "left" | "right" | "up" | "down";
export interface SlideState {
  grid: SlideGrid;
  score: number;
  bestTile: number;
  over: boolean;
}

/**
 * The four lines a direction slides, as cell indices in traversal
 * order — running from the edge the tiles slide TOWARD, so a line
 * always reads front-to-back the way slideMergeLine compacts it.
 */
function slideLines(dir: SlideDirection): number[][] {
  const lines: number[][] = [];
  for (let a = 0; a < SLIDE_SIZE; a++) {
    const line: number[] = [];
    for (let b = 0; b < SLIDE_SIZE; b++) {
      const t = dir === "left" || dir === "up" ? b : SLIDE_SIZE - 1 - b;
      line.push(dir === "left" || dir === "right" ? a * SLIDE_SIZE + t : t * SLIDE_SIZE + a);
    }
    lines.push(line);
  }
  return lines;
}

/** Compact one line toward its front, merging each pair once. Returns the merged sum. */
function slideMergeLine(values: number[]): { line: number[]; gained: number } {
  const tiles = values.filter((v) => v > 0);
  const line: number[] = [];
  let gained = 0;
  for (let i = 0; i < tiles.length; i++) {
    if (i + 1 < tiles.length && tiles[i] === tiles[i + 1]) {
      const merged = tiles[i] * 2;
      line.push(merged);
      gained += merged;
      i++;
    } else {
      line.push(tiles[i]);
    }
  }
  while (line.length < SLIDE_SIZE) line.push(0);
  return { line, gained };
}

export interface SlideMoveResult {
  grid: SlideGrid;
  /** The sum of the tiles this move merged — the score it earned. */
  gained: number;
  moved: boolean;
}

/** Slide the whole grid one way (no spawn — slideSwipe owns the full turn). */
export function slideMoveGrid(grid: SlideGrid, dir: SlideDirection): SlideMoveResult {
  const next = [...grid];
  let gained = 0;
  let moved = false;
  for (const line of slideLines(dir)) {
    const values = line.map((idx) => grid[idx]);
    const { line: merged, gained: g } = slideMergeLine(values);
    gained += g;
    line.forEach((idx, i) => {
      if (next[idx] !== merged[i]) moved = true;
      next[idx] = merged[i];
    });
  }
  return { grid: next, gained, moved };
}

/** A fresh tile in a random empty cell: a 2 nine times in ten, else a 4. */
export function slideSpawn(grid: SlideGrid, rng: Rng): SlideGrid {
  const empty = grid.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0);
  if (empty.length === 0) return grid;
  const next = [...grid];
  next[empty[pickIndex(empty.length, rng)]] = rng() < 0.9 ? 2 : 4;
  return next;
}

export function slideBestTile(grid: SlideGrid): number {
  return grid.reduce((max, v) => Math.max(max, v), 0);
}

/** No moves remain: a full board with no equal neighbours. */
export function slideGameOver(grid: SlideGrid): boolean {
  for (let i = 0; i < SLIDE_CELLS; i++) {
    if (grid[i] === 0) return false;
    const row = Math.floor(i / SLIDE_SIZE);
    const col = i % SLIDE_SIZE;
    if (col + 1 < SLIDE_SIZE && grid[i + 1] === grid[i]) return false;
    if (row + 1 < SLIDE_SIZE && grid[i + SLIDE_SIZE] === grid[i]) return false;
  }
  return true;
}

export function slideStart(rng: Rng): SlideState {
  const grid = slideSpawn(slideSpawn(Array(SLIDE_CELLS).fill(0), rng), rng);
  return { grid, score: 0, bestTile: slideBestTile(grid), over: false };
}

/**
 * One full turn: slide, and only if something actually moved,
 * spawn the next tile. The score is the classic one — the sum of
 * everything you merged. No moves left ends the run.
 */
export function slideSwipe(state: SlideState, dir: SlideDirection, rng: Rng): SlideState {
  if (state.over) return state;
  const { grid, gained, moved } = slideMoveGrid(state.grid, dir);
  if (!moved) return state;
  const spawned = slideSpawn(grid, rng);
  return {
    grid: spawned,
    score: state.score + gained,
    bestTile: Math.max(state.bestTile, slideBestTile(spawned)),
    over: slideGameOver(spawned),
  };
}

export function slideScore(state: SlideState): number {
  return state.score;
}
