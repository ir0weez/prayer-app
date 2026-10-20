// Mini-games for the Ministry Row interiors: Complete the Verse (Bible
// Study Hall), Training Reps (Gym), Pack the Boxes (Outreach Center),
// Keep the Candle Lit (Fasting House). Small, gentle, one-thumb games
// with modest payouts and DAILY CAPS — like the River's catch limit,
// plays reset at local midnight. Rewards flow through the same scaled
// coin/XP grants the interior actions use.
//
// The Gym game also grants a training bonus: +10% Dark Forest attack
// and defense until midnight (non-stacking), applied where hometown
// computes the hero's combat stats.

import AsyncStorage from "@react-native-async-storage/async-storage";

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
  | "grill";

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
};

const PLAYS_KEY = "prayercircle.minigames.plays.v1";
const TRAINING_BONUS_KEY = "prayercircle.minigames.training-bonus.v1";

/** Dark Forest attack/defense multiplier while the training bonus lasts. */
export const TRAINING_BONUS_MULT = 1.1;

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
    counts: { verse: 0, training: 0, packing: 0, candle: 0, popcorn: 0, garden: 0, serve: 0, rhythm: 0, trim: 0, tide: 0, grill: 0 },
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
