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
