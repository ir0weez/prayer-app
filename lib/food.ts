/**
 * v370 — the Food door (Jonathan, designed and picked Oct 29,
 * built Oct 30): a Meal event (Lunch/Dinner) opens a page with
 * two tabs — Groceries | Recipe (his Concept A2, with the grocery
 * tab wearing his Concept 2 grouping + Concept 3 total card).
 *
 * Dish resolution reuses the Oct 12 meal-scene vocabulary:
 * a food keyword written in the event's NOTES names the dish
 * (detectHomecookedMeal in schedule-tab.tsx matches the same
 * words, in the same order, to paint the card scene). Two leaf
 * refinements, both specific-before-general within one family,
 * because a recipe names a dish, not a picture: "grilled cheese"
 * resolves to the grilled-cheese dish rather than the sandwich
 * group it sits in for scenes, and "mexican pizza" to its own
 * dish rather than plain pizza (the scene matcher tests "pizza"
 * first, which leaves its mexican-pizza scene unreachable — a
 * recipe must not inherit that). Scene-only matches with no
 * seeded dish (salad, pasta, pancakes, eggs) resolve to null.
 * v371 adds a third refinement in the same family seat: "papa
 * joe" names the Papa Joe's dish, not the generic sandwich.
 * v372 adds a fourth: "shawarma" names the Loaded Shawarma-Style
 * Chicken & Rice Bar (the HelloFresh recipe he chose), ahead of
 * the generic chicken and salad rows the full name brushes past.
 * v373 adds a fifth in the rice family's seat: "risotto" names
 * the Bacon & Mushroom Risotto dish, while "fried rice" keeps
 * claiming the fried-rice dish below it.
 *
 * Stores — all `prayercircle.*` AsyncStorage keys, so they ride
 * the backup/export and restore exactly like the email digest
 * (lib/email-digest.ts):
 *   prayercircle.recipes.v1        his EDITED recipes, by dish.
 *                                  An edited dish is canonical:
 *                                  the seed never overrides it.
 *   prayercircle.price-book.v1     ingredient key → { price,
 *                                  checkedDate, store }. Ships
 *                                  absent; Eva's book arrives by
 *                                  backup import. The app never
 *                                  invents a price.
 *   prayercircle.grocery-checks.v1 per event+dish checked items.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  DISH_KEYS,
  RECIPE_GROUP_ORDER,
  SEED_RECIPES,
  type DishKey,
  type RecipeGroup,
  type SeedRecipe,
} from "@/lib/food-recipes";
import { SCHEDULE_EVENTS_KEY, type ScheduleEvent } from "@/lib/schedule-data";

export { DISH_KEYS, SEED_RECIPES };
export type { DishKey, RecipeGroup };

export const RECIPES_KEY = "prayercircle.recipes.v1";
export const PRICE_BOOK_KEY = "prayercircle.price-book.v1";
export const GROCERY_CHECKS_KEY = "prayercircle.grocery-checks.v1";

/** A recipe as the app works with it (seed or his edited copy). */
export interface Recipe {
  dish: DishKey;
  title: string;
  serves: string;
  minutes: number;
  ingredients: { name: string; quantity: string; group: RecipeGroup }[];
  steps: string[];
}

/* ------------------------------------------------------------------ */
/* Dish resolution — the Oct 12 matcher, mirrored.                     */
/* ------------------------------------------------------------------ */

/**
 * The notes matcher, in detectHomecookedMeal's exact order.
 * Each row: the words that name the dish, and the dish they name
 * (null = a scene exists but no seeded recipe dish does).
 */
const NOTES_DISH_TABLE: { names: string[]; dish: DishKey | null }[] = [
  { names: ["tv dinner", "frozen meal", "microwave meal", "hungry man", "lean cuisine"], dish: "tv-dinner" },
  { names: ["burrito"], dish: "bean-burritos" },
  { names: ["tostada", "tostadas"], dish: "tostadas" },
  { names: ["taco"], dish: "tacos" },
  // Specific before general (v372): "shawarma" names the Rice
  // Bar dish outright, ahead of the salad and chicken rows.
  { names: ["shawarma"], dish: "shawarma-rice-bar" },
  // Specific before general (see the file header): "mexican
  // pizza" names its own dish, not plain pizza.
  { names: ["mexican pizza"], dish: "mexican-pizza" },
  { names: ["pizza"], dish: "pizza" },
  // Specific before general within the sandwich family: the
  // Papa Joe names its own dish (v371); the bare "papa joe"
  // also covers "papa joe's" and "papa joes" as substrings.
  { names: ["papa joe's", "papa joes", "papa joe"], dish: "papa-joes" },
  { names: ["grilled cheese"], dish: "grilled-cheese" },
  { names: ["sandwich", "panini"], dish: "sandwich" },
  { names: ["salad"], dish: null },
  { names: ["pasta", "spaghetti", "lasagna", "mac and cheese", "mac n cheese"], dish: null },
  { names: ["pancake", "waffle", "french toast"], dish: null },
  { names: ["soup", "stew", "chili", "chowder"], dish: "soup" },
  { names: ["omelet", "omelette", "scrambled", "fried egg", "eggs"], dish: null },
  { names: ["pupusa", "pupusas"], dish: "pupusas" },
  { names: ["steak", "ribeye", "filet", "sirloin"], dish: "steak" },
  { names: ["burger", "hamburger", "cheeseburger"], dish: "burgers" },
  { names: ["roast chicken", "rotisserie chicken", "baked chicken"], dish: "roast-chicken" },
  { names: ["meatloaf"], dish: "meatloaf" },
  { names: ["pot roast", "roast beef"], dish: "pot-roast" },
  { names: ["casserole", "baked ziti", "hotdish"], dish: "casserole" },
  { names: ["hot dog", "hotdog", "corn dog"], dish: "hot-dogs" },
  { names: ["nachos"], dish: "nachos" },
  { names: ["quesadilla"], dish: "quesadilla" },
  { names: ["hot wings", "buffalo wings", "wings"], dish: "hot-wings" },
  { names: ["ramen", "pho"], dish: "ramen" },
  { names: ["stir fry", "stir-fry"], dish: "stir-fry" },
  // Specific within the rice family (v373): "risotto" names
  // its own dish; "fried rice" keeps the row below.
  { names: ["risotto"], dish: "bacon-mushroom-risotto" },
  { names: ["fried rice"], dish: "fried-rice" },
  { names: ["oatmeal", "porridge"], dish: "oatmeal" },
  { names: ["cereal"], dish: "cereal" },
];

/** The dish an event's notes name, or null when they name none. */
export function resolveDishKeyFromNotes(
  notes: string | undefined | null,
): DishKey | null {
  if (!notes) return null;
  const n = notes.toLowerCase();
  if (!n.trim()) return null;
  for (const row of NOTES_DISH_TABLE) {
    if (row.names.some((name) => n.includes(name))) return row.dish;
  }
  return null;
}

/** The dish for a schedule event — its notes, or no dish. */
export function resolveDishForEvent(event: {
  notes?: string;
}): DishKey | null {
  return resolveDishKeyFromNotes(event.notes);
}

/* ------------------------------------------------------------------ */
/* The recipe store — his edits are canonical.                         */
/* ------------------------------------------------------------------ */

/** Edited recipes only, keyed by dish. */
export type RecipeStore = Partial<Record<DishKey, Recipe>>;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isDishKey(value: string): value is DishKey {
  return (DISH_KEYS as string[]).includes(value);
}

function parseRecipe(value: unknown, dish: DishKey): Recipe | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const ingredientsRaw = Array.isArray(row.ingredients) ? row.ingredients : [];
  const ingredients = ingredientsRaw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const ing = entry as Record<string, unknown>;
      const name = asString(ing.name).trim();
      if (!name) return null;
      const groupRaw = asString(ing.group);
      const group = (RECIPE_GROUP_ORDER as string[]).includes(groupRaw)
        ? (groupRaw as RecipeGroup)
        : "Pantry";
      return { name, quantity: asString(ing.quantity), group };
    })
    .filter((ing): ing is NonNullable<typeof ing> => ing !== null);
  const steps = (Array.isArray(row.steps) ? row.steps : [])
    .map((step) => asString(step).trim())
    .filter((step) => step.length > 0);
  if (ingredients.length === 0 || steps.length === 0) return null;
  const seed = SEED_RECIPES[dish];
  return {
    dish,
    title: asString(row.title).trim() || seed.title,
    serves: asString(row.serves) || seed.serves,
    minutes:
      typeof row.minutes === "number" && row.minutes > 0
        ? row.minutes
        : seed.minutes,
    ingredients,
    steps,
  };
}

/** Parse a stored recipe store. Malformed entries drop out; a
 * dish that fails to parse falls back to its seed, never to a
 * half-read edit. */
export function parseRecipeStore(raw: string | null): RecipeStore {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object") return {};
  const store: RecipeStore = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!isDishKey(key)) continue;
    const recipe = parseRecipe(value, key);
    if (recipe) store[key] = recipe;
  }
  return store;
}

export async function loadRecipeStore(): Promise<RecipeStore> {
  try {
    return parseRecipeStore(await AsyncStorage.getItem(RECIPES_KEY));
  } catch {
    return {};
  }
}

/**
 * The recipe a dish shows: his edit when one is stored, the
 * seed otherwise. This is the ONLY read path — the canonical
 * rule lives here: a stored edit always wins, and nothing ever
 * writes a seed over a stored dish (saveRecipeEdit included).
 */
export function recipeForDish(dish: DishKey, store: RecipeStore): Recipe {
  const edited = store[dish];
  if (edited) return edited;
  const seed: SeedRecipe = SEED_RECIPES[dish];
  return {
    dish,
    title: seed.title,
    serves: seed.serves,
    minutes: seed.minutes,
    ingredients: seed.ingredients.map((ing) => ({ ...ing })),
    steps: [...seed.steps],
  };
}

/** True when the dish he sees differs from the shipped seed
 * because he edited it. */
export function isEditedDish(dish: DishKey, store: RecipeStore): boolean {
  return Boolean(store[dish]);
}

/**
 * Save an edit: returns the new store with this dish's recipe
 * recorded. Saving is per-dish and total for that dish — the
 * stored recipe IS the dish from then on.
 */
export function withRecipeEdit(store: RecipeStore, recipe: Recipe): RecipeStore {
  return { ...store, [recipe.dish]: recipe };
}

export async function saveRecipeStore(store: RecipeStore): Promise<void> {
  await AsyncStorage.setItem(RECIPES_KEY, JSON.stringify(store));
}

/* ------------------------------------------------------------------ */
/* The price book — Eva's prices, never the app's invention.           */
/* ------------------------------------------------------------------ */

export interface PriceBookEntry {
  /** Dollars. */
  price: number;
  /** ISO date the price was checked. */
  checkedDate: string;
  store?: string;
}

/** Ingredient key → the book's entry for it. */
export type PriceBook = Record<string, PriceBookEntry>;

/** The key an ingredient is priced under: its plain name, folded. */
export function ingredientKeyFor(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parsePriceBook(raw: string | null): PriceBook {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object") return {};
  const book: PriceBook = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const row = value as Record<string, unknown>;
    const price = typeof row.price === "number" ? row.price : NaN;
    if (!Number.isFinite(price) || price < 0) continue;
    const entry: PriceBookEntry = {
      price,
      checkedDate: asString(row.checkedDate),
    };
    const storeName = asString(row.store).trim();
    if (storeName) entry.store = storeName;
    book[ingredientKeyFor(key)] = entry;
  }
  return book;
}

export async function loadPriceBook(): Promise<PriceBook> {
  try {
    return parsePriceBook(await AsyncStorage.getItem(PRICE_BOOK_KEY));
  } catch {
    return {};
  }
}

/** The book's entry for an ingredient, or null — no entry, no
 * price, and the UI shows none. */
export function priceForIngredient(
  book: PriceBook,
  ingredientName: string,
): PriceBookEntry | null {
  return book[ingredientKeyFor(ingredientName)] ?? null;
}

/* ------------------------------------------------------------------ */
/* Grocery checklist state — per event + dish.                         */
/* ------------------------------------------------------------------ */

/** Checked ingredient keys per `${eventId}::${dish}` state key. */
export type GroceryChecks = Record<string, string[]>;

export function groceryStateKey(eventId: string, dish: DishKey): string {
  return `${eventId}::${dish}`;
}

export function parseGroceryChecks(raw: string | null): GroceryChecks {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object") return {};
  const checks: GroceryChecks = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue;
    checks[key] = value.filter((v): v is string => typeof v === "string");
  }
  return checks;
}

export async function loadGroceryChecks(): Promise<GroceryChecks> {
  try {
    return parseGroceryChecks(await AsyncStorage.getItem(GROCERY_CHECKS_KEY));
  } catch {
    return {};
  }
}

export async function saveGroceryChecks(checks: GroceryChecks): Promise<void> {
  await AsyncStorage.setItem(GROCERY_CHECKS_KEY, JSON.stringify(checks));
}

/** Flip one ingredient's checked state inside a checks list. */
export function toggleCheckedIngredient(
  checked: string[],
  ingredientName: string,
): string[] {
  const key = ingredientKeyFor(ingredientName);
  return checked.includes(key)
    ? checked.filter((k) => k !== key)
    : [...checked, key];
}

/* ------------------------------------------------------------------ */
/* Grocery grouping + totals.                                          */
/* ------------------------------------------------------------------ */

export interface GroceryGroup {
  group: RecipeGroup;
  ingredients: Recipe["ingredients"];
}

/** The recipe's ingredients in Concept 2's store sections. */
export function groupIngredients(recipe: Recipe): GroceryGroup[] {
  const groups: GroceryGroup[] = [];
  for (const group of RECIPE_GROUP_ORDER) {
    const items = recipe.ingredients.filter((ing) => ing.group === group);
    if (items.length > 0) groups.push({ group, ingredients: items });
  }
  // Any group outside the known order (a future edit) still shows.
  const known = new Set<string>(RECIPE_GROUP_ORDER);
  for (const ing of recipe.ingredients) {
    if (known.has(ing.group)) continue;
    const existing = groups.find((g) => g.group === ing.group);
    if (existing) existing.ingredients.push(ing);
    else groups.push({ group: ing.group, ingredients: [ing] });
  }
  return groups;
}

export interface GroceryTotals {
  itemCount: number;
  checkedCount: number;
  /** Ingredients the book prices. 0 ⇒ no money anywhere. */
  pricedCount: number;
  totalCents: number;
  spentCents: number;
  remainingCents: number;
  /** 0..1 — spent share of the total (money when priced, items otherwise). */
  progress: number;
}

/**
 * The total card's numbers. Money exists only where the book
 * prices an ingredient; checked priced items are "spent", the
 * rest "remaining". With no prices at all, the card counts
 * items instead — the same shape, no invented dollars.
 */
export function groceryTotals(
  recipe: Recipe,
  book: PriceBook,
  checked: string[],
): GroceryTotals {
  const checkedSet = new Set(checked);
  let pricedCount = 0;
  let totalCents = 0;
  let spentCents = 0;
  let checkedCount = 0;
  for (const ing of recipe.ingredients) {
    const key = ingredientKeyFor(ing.name);
    const isChecked = checkedSet.has(key);
    if (isChecked) checkedCount += 1;
    const entry = book[key];
    if (entry) {
      pricedCount += 1;
      const cents = Math.round(entry.price * 100);
      totalCents += cents;
      if (isChecked) spentCents += cents;
    }
  }
  const progress =
    pricedCount > 0
      ? totalCents > 0
        ? spentCents / totalCents
        : 0
      : recipe.ingredients.length > 0
        ? checkedCount / recipe.ingredients.length
        : 0;
  return {
    itemCount: recipe.ingredients.length,
    checkedCount,
    pricedCount,
    totalCents,
    spentCents,
    remainingCents: totalCents - spentCents,
    progress,
  };
}

/** "$11.02" from cents. */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/* ------------------------------------------------------------------ */
/* The event the door was opened from.                                 */
/* ------------------------------------------------------------------ */

/** Load one schedule event by id (the Food page's host event). */
export async function loadScheduleEventById(
  eventId: string,
): Promise<ScheduleEvent | null> {
  if (!eventId) return null;
  try {
    const raw = await AsyncStorage.getItem(SCHEDULE_EVENTS_KEY);
    if (!raw) return null;
    const events = JSON.parse(raw) as ScheduleEvent[];
    if (!Array.isArray(events)) return null;
    return events.find((event) => event.id === eventId) ?? null;
  } catch {
    return null;
  }
}
