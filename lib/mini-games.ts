// Mini-games for the Ministry Row interiors: Complete the Verse (Bible
// Study Hall), Training Reps (Gym), Pack the Boxes (Outreach Center),
// Keep the Candle Lit (Fasting House). Token Toss (arcade) plays at the
// Pizza Place once its arcade row is built. The October 2026 games wave
// added thirteen more — Bell Peal (Church), Gentle Rounds (Hospital),
// Coin Cascade (Bank), Shelf It Right (Market), Harvest Rows (Farm),
// Shelve the Stories (Bookstore), True the Beam (Carpenter), Center
// the Clay (Pottery), Thread the Needle (Tailor), Brew the Tonic
// (Apothecary), Encore Echo (Music Hall), Chart the Stars
// (Observatory), Hearth Keeper (Hero's House) — so every enterable
// building hosts a game. Small, gentle, one-thumb games with modest
// payouts and DAILY CAPS — like the River's catch limit, plays reset
// at local midnight. Rewards flow through the same scaled coin/XP
// grants the interior actions use.
//
// The Gym game also grants a training bonus: +10% Dark Forest attack
// and defense until midnight (non-stacking), applied where hometown
// computes the hero's combat stats.
//
// TIMING STANDARD (Jonathan's standing rule — it applies to ALL
// games in this registry, timed or not): capture input on onPressIn
// (finger DOWN — onPress waits for release and adds 60–120 ms of
// phantom travel), animate sweeps/gauges/motion on the native driver,
// and read values back via stopAnimation's callback. No per-frame
// React state (no setInterval/setState) in any game loop — motion
// lives on Animated values, and game state changes on events (a tap,
// an arrival, a deadline), never on frame ticks. Reference builds:
// the Steady Trim (components/trim-game.tsx) and Token Toss
// (components/token-toss-game.tsx), whose header carries the full
// note.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { VIOLET_MINIGAME_MULT, hasCachedBadge } from "./badges";

export type MiniGameId =
  | "verse"
  | "training"
  | "packing"
  | "candle"
  | "popcorn"
  | "garden"
  | "serve"
  | "rhythm"
  | "trim"
  | "tide"
  | "grill"
  | "arcade"
  | "bell"
  | "rounds"
  | "cascade"
  | "shelf"
  | "harvest"
  | "shelve"
  | "beam"
  | "clay"
  | "needle"
  | "brew"
  | "echo"
  | "stars"
  | "hearth";

/** Max plays per day, per game. */
export const MINI_GAME_CAPS: Record<MiniGameId, number> = {
  verse: 3,
  training: 3,
  packing: 3,
  candle: 2,
  popcorn: 3,
  garden: 3,
  serve: 3,
  rhythm: 3,
  trim: 3,
  tide: 3,
  grill: 3,
  arcade: 3,
  bell: 3,
  rounds: 3,
  cascade: 3,
  shelf: 3,
  harvest: 3,
  shelve: 3,
  beam: 3,
  clay: 3,
  needle: 3,
  brew: 3,
  echo: 3,
  stars: 3,
  hearth: 3,
};

const PLAYS_KEY = "prayercircle.minigames.plays.v1";
const TRAINING_BONUS_KEY = "prayercircle.minigames.training-bonus.v1";

/** Dark Forest attack/defense multiplier while the training bonus lasts. */
export const TRAINING_BONUS_MULT = 1.1;

/**
 * The Violet Badge (boss 8) blesses mini-game payouts with +15%. Every
 * mini-game completion handler runs its scaled reward through here, so
 * the perk lands on every game at once.
 */
export function scaleMiniGamePayout(coins: number, xp: number): { coins: number; xp: number } {
  const m = hasCachedBadge("violet") ? VIOLET_MINIGAME_MULT : 1;
  if (m === 1) return { coins, xp };
  return { coins: Math.round(coins * m * 100) / 100, xp: Math.round(xp * m) };
}

function todayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Timestamp of the next local midnight. */
export function nextMidnightMs(from: number = Date.now()): number {
  const d = new Date(from);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

type PlaysState = {
  day: string;
  counts: Record<MiniGameId, number>;
};

function emptyPlays(): PlaysState {
  return {
    day: todayString(),
    counts: {
      verse: 0, training: 0, packing: 0, candle: 0, popcorn: 0, garden: 0,
      serve: 0, rhythm: 0, trim: 0, tide: 0, grill: 0, arcade: 0,
      bell: 0, rounds: 0, cascade: 0, shelf: 0, harvest: 0, shelve: 0,
      beam: 0, clay: 0, needle: 0, brew: 0, echo: 0, stars: 0, hearth: 0,
    },
  };
}

async function loadPlaysState(): Promise<PlaysState> {
  try {
    const raw = await AsyncStorage.getItem(PLAYS_KEY);
    if (!raw) return emptyPlays();
    const parsed = JSON.parse(raw) as Partial<PlaysState>;
    if (parsed.day !== todayString()) return emptyPlays(); // a new day dawns
    const base = emptyPlays();
    for (const id of Object.keys(base.counts) as MiniGameId[]) {
      const v = parsed.counts?.[id];
      if (typeof v === "number" && v >= 0) base.counts[id] = Math.floor(v);
    }
    return base;
  } catch {
    return emptyPlays();
  }
}

/** Plays remaining today for a game (0..cap). */
export async function playsLeftToday(id: MiniGameId): Promise<number> {
  const state = await loadPlaysState();
  return Math.max(0, MINI_GAME_CAPS[id] - state.counts[id]);
}

/** Record one finished play. Returns the plays left afterwards. */
export async function recordPlay(id: MiniGameId): Promise<number> {
  const state = await loadPlaysState();
  state.counts[id] = Math.min(MINI_GAME_CAPS[id], state.counts[id] + 1);
  try {
    await AsyncStorage.setItem(PLAYS_KEY, JSON.stringify(state));
  } catch {
    // Losing a count is unfortunate but never fatal.
  }
  return Math.max(0, MINI_GAME_CAPS[id] - state.counts[id]);
}

// ---------------------------------------------------------------------------
// Gym training bonus — +10% forest attack/defense until midnight.
// ---------------------------------------------------------------------------

/** Grant (or refresh) the training bonus. Non-stacking by construction:
 *  the stored value is just an expiry timestamp. */
export async function grantTrainingBonus(): Promise<void> {
  try {
    await AsyncStorage.setItem(TRAINING_BONUS_KEY, String(nextMidnightMs()));
  } catch {}
}

/** Whether the training bonus is active right now, and until when. */
export async function loadTrainingBonus(): Promise<{ active: boolean; untilMs: number }> {
  try {
    const raw = await AsyncStorage.getItem(TRAINING_BONUS_KEY);
    const untilMs = raw ? parseInt(raw, 10) || 0 : 0;
    return { active: untilMs > Date.now(), untilMs };
  } catch {
    return { active: false, untilMs: 0 };
  }
}

// ---------------------------------------------------------------------------
// Complete the Verse — KJV verses with one key word blanked.
// `before` + answer + `after` reassembles the verse exactly.
// ---------------------------------------------------------------------------

export type VerseItem = {
  ref: string;
  before: string;
  answer: string;
  after: string;
  /** Four choices, including the answer (shuffled at play time). */
  choices: string[];
};

export const VERSES: VerseItem[] = [
  { ref: "John 3:16", before: "For God so ", answer: "loved", after: " the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.", choices: ["loved", "made", "saw", "blessed"] },
  { ref: "Psalm 23:1", before: "The LORD is my ", answer: "shepherd", after: "; I shall not want.", choices: ["shepherd", "king", "rock", "portion"] },
  { ref: "Proverbs 3:5", before: "Trust in the LORD with all thine ", answer: "heart", after: "; and lean not unto thine own understanding.", choices: ["heart", "mind", "strength", "soul"] },
  { ref: "Philippians 4:13", before: "I can do all things through ", answer: "Christ", after: " which strengtheneth me.", choices: ["Christ", "faith", "prayer", "hope"] },
  { ref: "Genesis 1:1", before: "In the beginning God created the heaven and the ", answer: "earth", after: ".", choices: ["earth", "stars", "sea", "light"] },
  { ref: "Psalm 46:10", before: "Be ", answer: "still", after: ", and know that I am God.", choices: ["still", "glad", "strong", "silent"] },
  { ref: "Isaiah 40:31", before: "But they that wait upon the LORD shall renew their ", answer: "strength", after: "; they shall mount up with wings as eagles.", choices: ["strength", "hope", "faith", "joy"] },
  { ref: "Romans 8:28", before: "And we know that all things work together for ", answer: "good", after: " to them that love God.", choices: ["good", "glory", "peace", "blessing"] },
  { ref: "Matthew 11:28", before: "Come unto me, all ye that labour and are heavy laden, and I will give you ", answer: "rest", after: ".", choices: ["rest", "peace", "strength", "hope"] },
  { ref: "John 1:1", before: "In the beginning was the ", answer: "Word", after: ", and the Word was with God, and the Word was God.", choices: ["Word", "Light", "Lamb", "Spirit"] },
  { ref: "Psalm 119:105", before: "Thy word is a ", answer: "lamp", after: " unto my feet, and a light unto my path.", choices: ["lamp", "guide", "torch", "sword"] },
  { ref: "Joshua 1:9", before: "Be strong and of a good ", answer: "courage", after: "; be not afraid, neither be thou dismayed.", choices: ["courage", "heart", "faith", "mind"] },
  { ref: "Hebrews 11:1", before: "Now ", answer: "faith", after: " is the substance of things hoped for, the evidence of things not seen.", choices: ["faith", "hope", "love", "prayer"] },
  { ref: "1 Corinthians 13:13", before: "And now abideth faith, hope, charity, these three; but the greatest of these is ", answer: "charity", after: ".", choices: ["charity", "faith", "hope", "love"] },
  { ref: "Matthew 5:9", before: "Blessed are the ", answer: "peacemakers", after: ": for they shall be called the children of God.", choices: ["peacemakers", "merciful", "meek", "poor in spirit"] },
  { ref: "Psalm 100:4", before: "Enter into his gates with ", answer: "thanksgiving", after: ", and into his courts with praise.", choices: ["thanksgiving", "singing", "joy", "reverence"] },
  { ref: "Micah 6:8", before: "…to do justly, and to love ", answer: "mercy", after: ", and to walk humbly with thy God.", choices: ["mercy", "justice", "kindness", "truth"] },
  { ref: "Galatians 5:22", before: "But the fruit of the Spirit is ", answer: "love", after: ", joy, peace, longsuffering, gentleness, goodness, faith…", choices: ["love", "hope", "grace", "faith"] },
  { ref: "John 14:6", before: "I am the way, the truth, and the ", answer: "life", after: ": no man cometh unto the Father, but by me.", choices: ["life", "light", "door", "vine"] },
  { ref: "Psalm 150:6", before: "Let every thing that hath breath ", answer: "praise", after: " the LORD.", choices: ["praise", "worship", "serve", "thank"] },
  { ref: "Isaiah 41:10", before: "Fear thou not; for I am with thee: be not dismayed; for I am thy ", answer: "God", after: ".", choices: ["God", "shield", "strength", "rock"] },
  { ref: "Lamentations 3:22–23", before: "They are new every morning: great is thy ", answer: "faithfulness", after: ".", choices: ["faithfulness", "mercy", "kindness", "love"] },
  { ref: "2 Timothy 1:7", before: "For God hath not given us the spirit of fear; but of power, and of love, and of a sound ", answer: "mind", after: ".", choices: ["mind", "heart", "faith", "spirit"] },
  { ref: "Matthew 6:33", before: "But seek ye first the ", answer: "kingdom", after: " of God, and his righteousness.", choices: ["kingdom", "glory", "mercy", "wisdom"] },
  { ref: "Psalm 19:14", before: "Let the words of my mouth, and the meditation of my heart, be ", answer: "acceptable", after: " in thy sight, O LORD.", choices: ["acceptable", "pleasing", "holy", "worthy"] },
  { ref: "Romans 12:2", before: "And be not ", answer: "conformed", after: " to this world: but be ye transformed by the renewing of your mind.", choices: ["conformed", "given", "bound", "subject"] },
  { ref: "James 1:22", before: "But be ye ", answer: "doers", after: " of the word, and not hearers only.", choices: ["doers", "keepers", "lovers", "students"] },
  { ref: "Ephesians 2:8", before: "For by ", answer: "grace", after: " are ye saved through faith.", choices: ["grace", "mercy", "works", "faith"] },
  { ref: "Psalm 118:24", before: "This is the day which the LORD hath made; we will ", answer: "rejoice", after: " and be glad in it.", choices: ["rejoice", "sing", "rest", "worship"] },
  { ref: "John 8:12", before: "I am the ", answer: "light", after: " of the world: he that followeth me shall not walk in darkness.", choices: ["light", "life", "way", "bread"] },
];

// ---------------------------------------------------------------------------
// Pack the Boxes — pantry items and their box categories.
// ---------------------------------------------------------------------------

export type PackCategory = "grains" | "canned" | "produce" | "dairy";

export const PACK_CATEGORY_LABELS: Record<PackCategory, string> = {
  grains: "Grains",
  canned: "Canned",
  produce: "Produce",
  dairy: "Dairy",
};

export type PackItem = {
  name: string;
  category: PackCategory;
  /** Icon key drawn by the game component. */
  icon: string;
};

export const PACK_ITEMS: PackItem[] = [
  { name: "Bread Loaf", category: "grains", icon: "bread" },
  { name: "Cereal Box", category: "grains", icon: "cereal" },
  { name: "Rice Bag", category: "grains", icon: "rice" },
  { name: "Pasta Box", category: "grains", icon: "pasta" },
  { name: "Soup Can", category: "canned", icon: "can-soup" },
  { name: "Beans Can", category: "canned", icon: "can-beans" },
  { name: "Tuna Can", category: "canned", icon: "can-tuna" },
  { name: "Corn Can", category: "canned", icon: "can-corn" },
  { name: "Apple", category: "produce", icon: "apple" },
  { name: "Carrot", category: "produce", icon: "carrot" },
  { name: "Banana", category: "produce", icon: "banana" },
  { name: "Broccoli", category: "produce", icon: "broccoli" },
  { name: "Milk Carton", category: "dairy", icon: "milk" },
  { name: "Cheese Wedge", category: "dairy", icon: "cheese" },
  { name: "Yogurt Cup", category: "dairy", icon: "yogurt" },
  { name: "Butter Dish", category: "dairy", icon: "butter" },
];

// ---------------------------------------------------------------------------
// Serve the Table — dishes per cuisine. Keyed by restaurant building type
// (the same id the cuisine-themes system uses); "generic" is the fallback
// for any type without its own menu. `icon` keys are drawn by the game.
// ---------------------------------------------------------------------------

export type ServeDish = {
  name: string;
  /** Icon key drawn by the game component. */
  icon: string;
};

export const SERVE_MENUS: Record<string, ServeDish[]> = {
  "pizza-place": [
    { name: "Pizza Slice", icon: "pizza" },
    { name: "Garlic Bread", icon: "bread" },
    { name: "Pasta Bowl", icon: "bowl" },
    { name: "Garden Salad", icon: "salad" },
    { name: "Cola Cup", icon: "drink" },
    { name: "Gelato Cup", icon: "cake" },
  ],
  "burger-joint": [
    { name: "Smash Burger", icon: "burger" },
    { name: "Crispy Fries", icon: "fries" },
    { name: "Berry Shake", icon: "shake" },
    { name: "Apple Pie", icon: "pie" },
    { name: "Coffee", icon: "coffee" },
    { name: "Side Salad", icon: "salad" },
  ],
  "taco-stand": [
    { name: "Street Taco", icon: "taco" },
    { name: "Burrito", icon: "burrito" },
    { name: "Elote Corn", icon: "corn" },
    { name: "Salsa Bowl", icon: "bowl" },
    { name: "Agua Fresca", icon: "drink" },
    { name: "Churros", icon: "cake" },
  ],
  "sushi-bar": [
    { name: "Nigiri Plate", icon: "sushi" },
    { name: "Miso Soup", icon: "soup" },
    { name: "Edamame Bowl", icon: "bowl" },
    { name: "Green Tea", icon: "coffee" },
    { name: "Mochi", icon: "cake" },
    { name: "Seaweed Salad", icon: "salad" },
  ],
  diner: [
    { name: "Pancake Stack", icon: "cake" },
    { name: "Fried Eggs", icon: "egg" },
    { name: "Coffee", icon: "coffee" },
    { name: "Buttered Toast", icon: "bread" },
    { name: "Tomato Soup", icon: "soup" },
    { name: "Pie Slice", icon: "pie" },
  ],
  "upper-room": [
    { name: "Bread Loaf", icon: "bread" },
    { name: "Baked Fish", icon: "fish" },
    { name: "Grapes", icon: "grapes" },
    { name: "Honey Bowl", icon: "bowl" },
    { name: "Olive Salad", icon: "salad" },
    { name: "Water Cup", icon: "drink" },
  ],
  "manna-house": [
    { name: "Manna Bowl", icon: "bowl" },
    { name: "Quail Skewer", icon: "skewer" },
    { name: "Fresh Bread", icon: "bread" },
    { name: "Milk Cup", icon: "drink" },
    { name: "Dates & Grapes", icon: "grapes" },
    { name: "Honey Cake", icon: "cake" },
  ],
  "feast-hall": [
    { name: "Roast Platter", icon: "skewer" },
    { name: "Bread Basket", icon: "bread" },
    { name: "Soup Tureen", icon: "soup" },
    { name: "Fruit & Grapes", icon: "grapes" },
    { name: "Harvest Pie", icon: "pie" },
    { name: "Cider Mug", icon: "drink" },
  ],
  "banquet-table": [
    { name: "Roast Platter", icon: "skewer" },
    { name: "Bread Basket", icon: "bread" },
    { name: "Garden Salad", icon: "salad" },
    { name: "Soup Tureen", icon: "soup" },
    { name: "Grapes", icon: "grapes" },
    { name: "Celebration Cake", icon: "cake" },
  ],
  // The School Cafeteria's own lunch line (Serve the Table on campus).
  cafeteria: [
    { name: "Tomato Soup", icon: "soup" },
    { name: "Grilled Cheese", icon: "bread" },
    { name: "Garden Salad", icon: "salad" },
    { name: "Milk Carton", icon: "drink" },
    { name: "Fruit Cup", icon: "grapes" },
    { name: "Pudding Cup", icon: "cake" },
  ],
  generic: [
    { name: "Chef's Burger", icon: "burger" },
    { name: "Fries", icon: "fries" },
    { name: "House Salad", icon: "salad" },
    { name: "Soup of the Day", icon: "soup" },
    { name: "Coffee", icon: "coffee" },
    { name: "Pie Slice", icon: "pie" },
  ],
};

/** The dish list for a restaurant type, generic menu as the fallback. */
export function serveMenuFor(cuisine: string): ServeDish[] {
  return SERVE_MENUS[cuisine] ?? SERVE_MENUS.generic;
}

// ---------------------------------------------------------------------------
// Token Toss — the Pizza Place arcade game. A power marker sweeps a sine
// arc; the toss lands by distance from dead center (p = 0.5). XP-weighted
// payout: the arcade pays in experience, coins are the small change.
// ---------------------------------------------------------------------------

/** Score for a toss at power p (0..1, 0.5 = dead center). */
export function tokenScoreForPower(p: number): number {
  const d = Math.abs(p - 0.5);
  if (d <= 0.06) return 50; // bullseye
  if (d <= 0.16) return 25; // middle ring
  if (d <= 0.3) return 10; // outer ring
  return 0; // short or long — off the board
}

/** Raw payout for a finished Token Toss play (score = summed rings). */
export function tokenTossReward(score: number): { coins: number; xp: number } {
  return {
    coins: Math.min(15, Math.round(score * 0.08)),
    xp: Math.min(40, Math.round(score * 0.32)),
  };
}

// ---------------------------------------------------------------------------
// The October 2026 games wave — thirteen new games, one per building
// that had none. Reward helpers live here (like tokenTossReward) so
// the payout envelope stays testable and consistent: every game pays
// inside the same modest band as the original twelve after the host's
// hometown + Violet scaling.
// ---------------------------------------------------------------------------

/** Bell Peal (Church) — sequence lengths 3,4,5,6,7 over five rounds. */
export function bellReward(roundsCleared: number, correctTaps: number): { coins: number; xp: number } {
  return {
    coins: Math.min(30, correctTaps + roundsCleared * 2),
    xp: Math.min(90, correctTaps * 3 + roundsCleared * 6),
  };
}

/** Encore Echo (Music Hall) — melody lengths 4,5,6,7 over four rounds. */
export function echoReward(roundsCleared: number, correctTaps: number): { coins: number; xp: number } {
  return {
    coins: Math.min(35, correctTaps + roundsCleared * 3),
    xp: Math.min(95, correctTaps * 3 + roundsCleared * 8),
  };
}

/** Gentle Rounds (Hospital) — pay per patient need served. */
export function roundsReward(served: number): { coins: number; xp: number } {
  return { coins: Math.min(60, served * 6), xp: Math.min(60, served * 5) };
}

/** Coin Cascade (Bank) — gold coins are the rich catch. */
export function cascadeReward(regular: number, gold: number): { coins: number; xp: number } {
  return {
    coins: Math.min(78, regular * 2 + gold * 5),
    xp: Math.min(42, regular + gold * 2),
  };
}

// ---------------------------------------------------------------------------
// Shelf It Right — the Market's grocery shelves. Same four-way sorting
// heart as Pack the Boxes, with the market's own goods and sections.
// ---------------------------------------------------------------------------

export type ShelfCategory = "produce" | "dairy" | "bakery" | "dry-goods";

export const SHELF_CATEGORY_LABELS: Record<ShelfCategory, string> = {
  produce: "Produce",
  dairy: "Dairy",
  bakery: "Bakery",
  "dry-goods": "Dry Goods",
};

export type ShelfItem = {
  name: string;
  category: ShelfCategory;
  /** Icon key drawn by the game component. */
  icon: string;
};

export const SHELF_ITEMS: ShelfItem[] = [
  { name: "Apple", category: "produce", icon: "apple" },
  { name: "Carrot Bunch", category: "produce", icon: "carrot" },
  { name: "Banana", category: "produce", icon: "banana" },
  { name: "Broccoli", category: "produce", icon: "broccoli" },
  { name: "Milk Bottle", category: "dairy", icon: "milk" },
  { name: "Cheese Wheel", category: "dairy", icon: "cheese" },
  { name: "Yogurt Pot", category: "dairy", icon: "yogurt" },
  { name: "Butter Block", category: "dairy", icon: "butter" },
  { name: "Sourdough Loaf", category: "bakery", icon: "bread" },
  { name: "Berry Muffin", category: "bakery", icon: "cake" },
  { name: "Apple Pie", category: "bakery", icon: "pie" },
  { name: "Oat Cookie", category: "bakery", icon: "cookie" },
  { name: "Rice Sack", category: "dry-goods", icon: "rice" },
  { name: "Pasta Twists", category: "dry-goods", icon: "pasta" },
  { name: "Cereal Carton", category: "dry-goods", icon: "cereal" },
  { name: "Soup Tin", category: "dry-goods", icon: "can-soup" },
];

/** Shelf It Right (Market) — same envelope as Pack the Boxes. */
export function shelfReward(packed: number): { coins: number; xp: number } {
  return { coins: Math.min(80, packed * 4), xp: Math.min(40, packed * 2) };
}

// ---------------------------------------------------------------------------
// Harvest Rows — the Farm's crop kinds (art drawn by the game).
// ---------------------------------------------------------------------------

export type HarvestCrop = { kind: string; name: string };

export const HARVEST_CROPS: HarvestCrop[] = [
  { kind: "carrot", name: "Carrots" },
  { kind: "wheat", name: "Wheat" },
  { kind: "tomato", name: "Tomatoes" },
  { kind: "corn", name: "Corn" },
  { kind: "pumpkin", name: "Pumpkins" },
];

/** Harvest Rows (Farm) — golden crops pay double-ish. */
export function harvestReward(regular: number, golden: number): { coins: number; xp: number } {
  return {
    coins: Math.min(85, regular * 4 + golden * 8),
    xp: Math.min(52, regular * 2 + golden * 4),
  };
}

// ---------------------------------------------------------------------------
// Shelve the Stories — the Bookstore's sections and returned books.
// ---------------------------------------------------------------------------

export type ShelveSection = {
  id: string;
  name: string;
  /** MaterialIcons glyph for the section mark. */
  icon: string;
  color: string;
};

export const SHELVE_SECTIONS: ShelveSection[] = [
  { id: "stories", name: "Stories", icon: "menu-book", color: "#B45309" },
  { id: "songs", name: "Psalms & Songs", icon: "library-music", color: "#7C3AED" },
  { id: "journeys", name: "Journeys", icon: "explore", color: "#0F766E" },
  { id: "little-ones", name: "Little Ones", icon: "child-care", color: "#DB2777" },
];

export const SHELVE_BOOK_TITLES: Record<string, string[]> = {
  stories: ["The Prodigal Road", "A Lamp in the Window", "The Shepherd's Field", "Two Brothers"],
  songs: ["Songs in the Night", "A New Psalm", "Hymns by Lamplight", "The Morning Chorus"],
  journeys: ["Road to Damascus", "Across the Jordan", "The Long Way Home", "Ships to Tarshish"],
  "little-ones": ["The Smallest Seed", "Noah's Big Boat", "The Lost Lamb", "David and the Giant"],
};

/** Shelve the Stories (Bookstore) — finishing the whole returns cart adds a bonus. */
export function shelveReward(shelved: number, allDone: boolean): { coins: number; xp: number } {
  return {
    coins: Math.min(72, shelved * 5 + (allDone ? 8 : 0)),
    xp: Math.min(48, shelved * 4),
  };
}

// ---------------------------------------------------------------------------
// True the Beam (Carpenter) — 8 passes, 3/2/0 points like the Steady
// Trim; Thread the Needle (Tailor) — 6 needles, same 3/2/0 heart.
// ---------------------------------------------------------------------------

export const BEAM_MAX_POINTS = 8 * 3;
export function beamReward(points: number): { coins: number; xp: number } {
  const f = Math.max(0, Math.min(1, points / BEAM_MAX_POINTS));
  return { coins: Math.round(f * 25), xp: Math.round(f * 85) };
}

export const NEEDLE_MAX_POINTS = 6 * 3;
export function needleReward(points: number): { coins: number; xp: number } {
  const f = Math.max(0, Math.min(1, points / NEEDLE_MAX_POINTS));
  return { coins: Math.round(f * 21), xp: Math.round(f * 84) };
}

/** Center the Clay (Pottery) — pay follows the share of the round the
 *  clay spent inside the centered band. */
export function clayReward(centeredFrac: number): { coins: number; xp: number } {
  const f = Math.max(0, Math.min(1, centeredFrac));
  return { coins: Math.round(f * 20), xp: Math.round(f * 80) };
}

// ---------------------------------------------------------------------------
// Brew the Tonic — the Apothecary's jars. A recipe is a short ordered
// run of ingredients; four tonics make a round.
// ---------------------------------------------------------------------------

export type BrewIngredient = {
  id: string;
  name: string;
  /** Jar contents color, drawn by the game component. */
  color: string;
};

export const BREW_INGREDIENTS: BrewIngredient[] = [
  { id: "honey", name: "Honey", color: "#F59E0B" },
  { id: "mint", name: "Mint", color: "#34D399" },
  { id: "ginger", name: "Ginger", color: "#D6A860" },
  { id: "berry", name: "Elderberry", color: "#8B5CF6" },
  { id: "lemon", name: "Lemon", color: "#FDE047" },
  { id: "chamomile", name: "Chamomile", color: "#FDE68A" },
];

export const BREW_TONIC_NAMES = [
  "Quiet Evening Tonic",
  "Traveler's Cheer",
  "Garden Rest Draught",
  "Morning Light Tonic",
  "Shepherd's Comfort",
  "Harvest Warmth Tonic",
];

/** Brew the Tonic (Apothecary) — steady hands and a clean slate pay best. */
export function brewReward(tonics: number, mistakes: number): { coins: number; xp: number } {
  return {
    coins: Math.min(30, tonics * 6 + (tonics > 0 && mistakes === 0 ? 4 : 0)),
    xp: Math.min(88, tonics * 20 + (tonics > 0 ? Math.max(0, 8 - mistakes * 2) : 0)),
  };
}

// ---------------------------------------------------------------------------
// Chart the Stars — the Observatory's constellations. Star positions
// are fractions of the scene; the order shown is the order drawn.
// ---------------------------------------------------------------------------

export type StarPoint = { x: number; y: number };
export type Constellation = { name: string; flavor: string; stars: StarPoint[] };

export const CONSTELLATIONS: Constellation[] = [
  {
    name: "The Shepherd's Staff",
    flavor: "The staff that watched over the night fields.",
    stars: [
      { x: 0.22, y: 0.68 }, { x: 0.3, y: 0.5 }, { x: 0.38, y: 0.34 },
      { x: 0.5, y: 0.24 }, { x: 0.64, y: 0.22 }, { x: 0.74, y: 0.3 },
    ],
  },
  {
    name: "The Fisher's Net",
    flavor: "Cast wide on the far side of the boat.",
    stars: [
      { x: 0.18, y: 0.3 }, { x: 0.38, y: 0.22 }, { x: 0.58, y: 0.3 },
      { x: 0.66, y: 0.5 }, { x: 0.48, y: 0.62 }, { x: 0.28, y: 0.56 },
      { x: 0.2, y: 0.42 },
    ],
  },
  {
    name: "The Crown",
    flavor: "The crown that outlasts every kingdom of the night.",
    stars: [
      { x: 0.16, y: 0.55 }, { x: 0.3, y: 0.36 }, { x: 0.44, y: 0.5 },
      { x: 0.56, y: 0.3 }, { x: 0.68, y: 0.48 }, { x: 0.82, y: 0.34 },
    ],
  },
];

export type ChartSegment = { x1: number; y1: number; x2: number; y2: number };

/** The line segments joining a charted sequence, in scene fractions.
 *  Pure and total: a charted index that does not exist in `stars` is
 *  skipped, never dereferenced. That guard matters — the game once
 *  crashed the moment the 7-star Fisher's Net was completed, because
 *  advancing to the 6-star Crown rendered one frame with the new
 *  constellation but the previous constellation's finished `charted`
 *  list (the state reset lived in an effect that runs after render),
 *  and charted index 6 has no star in a 6-star constellation. The game
 *  now also resets its per-constellation state in the same update
 *  that advances the constellation; this function staying total means
 *  no stale sequence can ever take the renderer down again. */
export function chartSegments(
  stars: ReadonlyArray<StarPoint>,
  charted: readonly number[],
): ChartSegment[] {
  const segments: ChartSegment[] = [];
  for (let i = 1; i < charted.length; i += 1) {
    const prev = stars[charted[i - 1]];
    const cur = stars[charted[i]];
    if (!prev || !cur) continue;
    segments.push({ x1: prev.x, y1: prev.y, x2: cur.x, y2: cur.y });
  }
  return segments;
}

/** Chart the Stars (Observatory) — every star placed in order counts. */
export function starsReward(starsInOrder: number, constellationsDone: number): { coins: number; xp: number } {
  return {
    coins: Math.min(26, starsInOrder + constellationsDone * 3),
    xp: Math.min(90, starsInOrder * 4 + constellationsDone * 10),
  };
}

/** Hearth Keeper (Hero's House) — pay follows the warmth kept across
 *  the round, plus each kettle/bread moment caught in time. */
export function hearthReward(warmthFrac: number, moments: number): { coins: number; xp: number } {
  const f = Math.max(0, Math.min(1, warmthFrac));
  return {
    coins: Math.min(24, Math.round(f * 16) + moments * 2),
    xp: Math.min(85, Math.round(f * 70) + moments * 5),
  };
}
