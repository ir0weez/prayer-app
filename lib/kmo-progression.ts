// ─── v397 "Keep Me Occupied" — the progression layer ───────────────────────
// v395 shipped KMO deliberately ledger-free. Jonathan then USED it
// (Sort It Out, 16 sorted) and directed this evolution, his words:
// "these should be games that at least [have] some sort of scoring
// system. I also feel like you should earn coins as you play, and
// that allows you to unlock more games and collect XP over time as
// well."
//
// So the games now keep score, a session's score converts into the
// app's ONE coin purse and ONE XP track (no parallel currencies —
// coin credit routes through lib/hometown.ts's canonical ledger,
// XP through lib/xp-engine.ts's awardCustomXP), and two games sit
// behind coin unlocks bought from that same purse.
//
// THE NEW LAW (v397, replacing v395's blanket no-ledger rule for
// GAME data only): this feature may persist exactly two things —
// (a) which games are unlocked, (b) per-game best scores — in the
// small store below, plus whatever the shared coin/XP systems
// record when earnings are credited. THE WAVE DATA IS STILL
// LEDGER-FREE, exactly as v395 held it: entry/exit strength
// ratings, minutes in the flow, tap counts and deal counts are
// never written anywhere. A pin in the v397 tests holds the
// whitelist of storage keys this layer may ever touch.
//
// A CHAPTER IS NEVER LOCKED and never costs anything — scripture
// is not merchandise. The deal pool always includes chapters
// whatever the unlock state says.

import AsyncStorage from "@react-native-async-storage/async-storage";

import { applyCoinsDelta, loadCoinsRecord } from "@/lib/hometown";
import type { KmoItemId, RockSize, TendCell } from "@/lib/keep-me-occupied";
import { awardCustomXP } from "@/lib/xp-engine";

export const KMO_PROGRESSION_KEY = "prayercircle.kmo-progression.v1";

// ─── The store ───────────────────────────────────────────────────────────────

export interface KmoProgression {
  /** Game ids he owns. Chapters and the dig are not games to own. */
  unlocked: KmoItemId[];
  /** Per-item best scores (arcade stats). Chapters record their 40s here too. */
  best: Partial<Record<KmoItemId, number>>;
}

/** Open from the start, before any coin is spent. */
export const KMO_DEFAULT_UNLOCKED: readonly KmoItemId[] = [
  "echo-lights",
  "sort-it-out",
  "stack",
  "word-dig",
];

/**
 * Coin prices for the locked games, bought from the shared purse.
 * Chapters have no price and never will; neither does the dig.
 * v398 ladder (Jonathan's order — "kind of neverending stuff to
 * unlock"): the Runner flagship sits early and cheap on purpose;
 * prices climb to Drop Match. Backbeat and Tend keep their v397
 * prices exactly. v399 climbs on from there to Slide 2048 at
 * 75,000 — the ladder is meant never to run out of next doors.
 */
export const KMO_UNLOCK_PRICES: Partial<Record<KmoItemId, number>> = {
  runner: 2000,
  backbeat: 3000,
  glide: 5000,
  jumper: 6500,
  tend: 7500,
  snake: 10000,
  crossroads: 12500,
  breakout: 15000,
  "drop-match": 25000,
  // v399: the ladder climbs on — six more doors, Slide 2048 at the top.
  "plinko-drop": 30000,
  "cave-flyer": 35000,
  "colour-rush": 40000,
  rockfall: 50000,
  "mole-patrol": 60000,
  "slide-2048": 75000,
};

const GAME_IDS: readonly KmoItemId[] = [
  "echo-lights", "sort-it-out", "stack", "backbeat", "tend",
  "runner", "glide", "jumper", "snake", "crossroads", "breakout", "drop-match",
  "plinko-drop", "cave-flyer", "colour-rush", "rockfall", "mole-patrol", "slide-2048",
];

export function parseKmoProgression(value: unknown): KmoProgression {
  const raw = (value && typeof value === "object" ? value : {}) as Partial<KmoProgression>;
  const unlocked = new Set<KmoItemId>(KMO_DEFAULT_UNLOCKED);
  if (Array.isArray(raw.unlocked)) {
    for (const id of raw.unlocked) {
      if (GAME_IDS.includes(id as KmoItemId)) unlocked.add(id as KmoItemId);
    }
  }
  const best: Partial<Record<KmoItemId, number>> = {};
  if (raw.best && typeof raw.best === "object") {
    for (const [id, score] of Object.entries(raw.best)) {
      if ((GAME_IDS as readonly string[]).includes(id) || id === "word-dig" || id === "chapter") {
        if (typeof score === "number" && Number.isFinite(score) && score > 0) {
          best[id as KmoItemId] = Math.floor(score);
        }
      }
    }
  }
  return { unlocked: [...unlocked], best };
}

export async function loadKmoProgression(): Promise<KmoProgression> {
  try {
    const raw = await AsyncStorage.getItem(KMO_PROGRESSION_KEY);
    return parseKmoProgression(raw ? JSON.parse(raw) : null);
  } catch {
    return parseKmoProgression(null);
  }
}

async function saveKmoProgression(next: KmoProgression): Promise<KmoProgression> {
  try {
    await AsyncStorage.setItem(KMO_PROGRESSION_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

/** Chapters and the dig are never locked; games check the store. */
export function isItemUnlocked(progression: KmoProgression, id: KmoItemId): boolean {
  if (id === "chapter" || id === "word-dig") return true;
  return progression.unlocked.includes(id);
}

/** The coin price of a locked game; null when it isn't for sale. */
export function unlockPrice(id: KmoItemId): number | null {
  return KMO_UNLOCK_PRICES[id] ?? null;
}

export interface UnlockResult {
  /** True when the game is owned after the call (bought now or already owned). */
  owned: boolean;
  /** True only when this call actually spent coins. */
  bought: boolean;
  progression: KmoProgression;
  /** The shared purse balance after any spend. */
  balance: number;
}

/**
 * Buy a game with coins from the shared purse. Spending routes
 * through the canonical coin ledger (applyCoinsDelta) so it can
 * never clobber a fresher balance; an unaffordable price spends
 * nothing and unlocks nothing.
 */
export async function unlockGame(id: KmoItemId): Promise<UnlockResult> {
  const progression = await loadKmoProgression();
  const coins = await loadCoinsRecord();
  if (isItemUnlocked(progression, id)) {
    return { owned: true, bought: false, progression, balance: coins.balance };
  }
  const price = unlockPrice(id);
  if (price == null || coins.balance < price) {
    return { owned: false, bought: false, progression, balance: coins.balance };
  }
  const after = await applyCoinsDelta(-price, "none");
  const next = await saveKmoProgression({
    ...progression,
    unlocked: [...progression.unlocked, id],
  });
  return { owned: true, bought: true, progression: next, balance: after.balance };
}

/**
 * Record a session's score as the item's best when it beats the
 * standing one. Returns the best that stands after the call.
 */
export async function recordBestScore(id: KmoItemId, score: number): Promise<number> {
  const clean = Math.max(0, Math.floor(score));
  const progression = await loadKmoProgression();
  const standing = progression.best[id] ?? 0;
  if (clean <= standing) return standing;
  await saveKmoProgression({ ...progression, best: { ...progression.best, [id]: clean } });
  return clean;
}

// ─── Scoring (pure; the games report, these rules decide) ────────────────────

// Sort It Out: +10 per correct sort, and once the streak runs past
// three, each further consecutive correct adds +2 per streak step
// beyond three (4th in a row: +12, 5th: +14, …). A wrong bin
// resets the streak; points are never taken away.
export interface SortScoreState {
  streak: number;
  score: number;
}

export function sortScored(state: SortScoreState, correct: boolean): SortScoreState {
  if (!correct) return { streak: 0, score: state.score };
  const streak = state.streak + 1;
  const points = 10 + 2 * Math.max(0, streak - 3);
  return { streak, score: state.score + points };
}

// Echo Lights: +15 per pad correctly repeated, +50 for finishing
// the pattern. A run that breaks mid-way still banks the pads it
// got right before the break — a miss costs the round's bonus,
// never the pads.
export const ECHO_PAD_POINTS = 15;
export const ECHO_ROUND_BONUS = 50;

export function echoRunPoints(pattern: number[], input: number[]): number {
  let correct = 0;
  for (let i = 0; i < input.length && i < pattern.length; i++) {
    if (input[i] !== pattern[i]) break;
    correct++;
  }
  const complete = input.length >= pattern.length && correct === pattern.length;
  return correct * ECHO_PAD_POINTS + (complete ? ECHO_ROUND_BONUS : 0);
}

// Stack: +10 per block landed, +5 more when the landing is
// near-perfect — the placed block keeps at least 98% of the width
// it could have kept.
export const STACK_LAND_POINTS = 10;
export const STACK_PERFECT_BONUS = 5;

export function stackLandingPoints(movingWidth: number, placedWidth: number): number {
  const perfect = movingWidth > 0 && placedWidth >= movingWidth * 0.98;
  return STACK_LAND_POINTS + (perfect ? STACK_PERFECT_BONUS : 0);
}

// Backbeat: +10 for a tap right on a pattern step, +4 for one a
// step either side (the same forgiving window the grading uses).
export function beatTapPoints(step: number, pattern: number[]): number {
  if (pattern.includes(step)) return 10;
  if (pattern.some((s) => Math.abs(s - step) === 1)) return 4;
  return 0;
}

// Tend: +5 per weed cleared or dry spot watered. Helping a sprout
// along is kindness, not commerce — it scores nothing.
export function tendTapPoints(before: TendCell): number {
  return before === "weed" || before === "dry" ? 5 : 0;
}

// Word Dig: a find in n guesses scores 120 − 20×(n−1), so a
// first-dig find is 120 and a sixth-dig find is 20. A revealed
// word scores 0 — and still never reads as a loss.
export function digScoreForGuesses(guessesUsed: number, found: boolean): number {
  if (!found) return 0;
  const n = Math.min(6, Math.max(1, Math.floor(guessesUsed)));
  return 120 - 20 * (n - 1);
}

// A Chapter: opening the dealt chapter credits a flat read score.
// (Credited on the Open tap — the reader offers no read-completion
// signal the flow could honestly wait for.)
export const CHAPTER_READ_SCORE = 40;

// ─── v398 endless games — scoring ────────────────────────────────────────────
// Each is a scored RUN. A run's score is composed by these rules in
// the game's lib state; the numbers here are the single source the
// components display and the pins hold.

// Runner: +1 per metre, +25 per coin, +5 per near-miss (clearing an
// obstacle by a whisker, detected at the pass moment).
export const RUNNER_COIN_POINTS = 25;
export const RUNNER_NEAR_MISS_POINTS = 5;
export function runnerScoreFor(distanceM: number, coins: number, nearMisses: number): number {
  return Math.floor(distanceM) + coins * RUNNER_COIN_POINTS + nearMisses * RUNNER_NEAR_MISS_POINTS;
}

// Glide: +20 per gate cleared.
export const GLIDE_GATE_POINTS = 20;
export function glideScoreFor(gates: number): number {
  return gates * GLIDE_GATE_POINTS;
}

// Snake: +15 per food, +1 per second survived.
export const SNAKE_FOOD_POINTS = 15;
export function snakeScoreFor(food: number, seconds: number): number {
  return food * SNAKE_FOOD_POINTS + Math.floor(seconds);
}

// Breakout: +10 per brick, +100 per full row cleared.
export const BREAKOUT_BRICK_POINTS = 10;
export const BREAKOUT_ROW_BONUS = 100;
export function breakoutScoreFor(bricks: number, rows: number): number {
  return bricks * BREAKOUT_BRICK_POINTS + rows * BREAKOUT_ROW_BONUS;
}

// Drop Match: +8 per block cleared, times the chain multiplier
// (consecutive clears without a new row landing: ×1, ×2, ×3…).
export const DROP_BLOCK_POINTS = 8;
export function dropMatchClearPoints(blocks: number, chain: number): number {
  return blocks * DROP_BLOCK_POINTS * Math.max(1, Math.floor(chain));
}

// Crossroads: +10 per car home safe, +15 per near-miss.
export const CROSSROADS_CLEAR_POINTS = 10;
export const CROSSROADS_NEAR_MISS_POINTS = 15;
export function crossroadsScoreFor(cleared: number, nearMisses: number): number {
  return cleared * CROSSROADS_CLEAR_POINTS + nearMisses * CROSSROADS_NEAR_MISS_POINTS;
}

// Jumper: +1 per altitude unit climbed, +20 per coin.
export const JUMPER_COIN_POINTS = 20;
export function jumperScoreFor(altitude: number, coins: number): number {
  return Math.floor(altitude) + coins * JUMPER_COIN_POINTS;
}

// ─── v399 games — scoring ────────────────────────────────────────────────────

// Plinko Drop: a run is ten balls; each banks its landing slot —
// the edges pay (250/100), the near slots 25, the mid 50, and the
// dead centre just 10.
export const PLINKO_SLOT_VALUES = [250, 100, 50, 25, 10, 25, 50, 100, 250] as const;
export function plinkoScoreForSlot(slot: number): number {
  return PLINKO_SLOT_VALUES[Math.min(PLINKO_SLOT_VALUES.length - 1, Math.max(0, Math.floor(slot)))] ?? 0;
}

// Cave Flyer: +1 per metre, +30 per coin ring flown through.
export const CAVE_RING_POINTS = 30;
export function caveScoreFor(distanceM: number, rings: number): number {
  return Math.floor(distanceM) + rings * CAVE_RING_POINTS;
}

// Colour Rush: +15 for tapping the ink (not the word), +5 more
// when the answer lands inside a second.
export const RUSH_CORRECT_POINTS = 15;
export const RUSH_FAST_BONUS = 5;
export function rushAnswerPoints(elapsedMs: number): number {
  return RUSH_CORRECT_POINTS + (elapsedMs < 1000 ? RUSH_FAST_BONUS : 0);
}

// Rockfall: cracking a rock pays by size — small 10, medium 20,
// large 30 (and the large splits into two fast smalls on top).
export function rockPointsForSize(size: RockSize): number {
  return size === "small" ? 10 : size === "medium" ? 20 : 30;
}

// Mole Patrol: a mole pays 10 plus 2 per chain step; the golden
// mole pays a flat 100.
export const MOLE_TAP_POINTS = 10;
export const MOLE_GOLDEN_POINTS = 100;
export const MOLE_CHAIN_STEP = 2;
export function moleTapPoints(chain: number): number {
  return MOLE_TAP_POINTS + MOLE_CHAIN_STEP * Math.max(0, Math.floor(chain));
}

// Slide 2048 needs no table: the score IS the sum of merged tiles,
// composed by the merge itself (pinned in the game logic tests).

// ─── Conversion ──────────────────────────────────────────────────────────────

export function scoreToCoins(score: number): number {
  return Math.max(0, Math.floor(score));
}

export function scoreToXp(score: number): number {
  return Math.ceil(scoreToCoins(score) / 2);
}

export interface SessionEarnings {
  coins: number;
  /** The XP actually credited (the engine's standing boosts may raise it). */
  xp: number;
}

/**
 * Tokens already converted in this process. Session tokens are
 * minted in memory by the screen and die with the flow, so an
 * in-memory guard is the right scope: it makes conversion
 * exactly-once per session-end even if a caller double-fires.
 */
const convertedTokens = new Set<string>();

/**
 * Convert one finished game session's score into the shared purse
 * and XP track — exactly once per session token. Coins credit
 * directly through the canonical ledger (game earnings don't wait
 * in any collect tray); XP rides awardCustomXP, whose own
 * idempotency ledger is the second lock on the same door. A zero
 * score converts nothing and writes nothing.
 */
export async function convertSessionScore(
  score: number,
  sessionToken: string,
): Promise<SessionEarnings> {
  const coins = scoreToCoins(score);
  if (coins <= 0 || convertedTokens.has(sessionToken)) return { coins: 0, xp: 0 };
  convertedTokens.add(sessionToken);
  await applyCoinsDelta(coins, "none");
  const xpResult = await awardCustomXP(scoreToXp(coins), `kmo:${sessionToken}`);
  return { coins, xp: xpResult.awarded ? xpResult.points : 0 };
}
