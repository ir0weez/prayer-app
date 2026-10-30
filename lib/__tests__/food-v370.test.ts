/**
 * v370 — the Food door pins:
 *  - door routing: an event whose keyword resolves to "Meal"
 *    opens /food; other keywords don't; the News/Email claims
 *    are untouched;
 *  - dish resolution from notes (the Oct 12 matcher): a food
 *    word in the notes names the dish, in the matcher's order;
 *    scene-only words with no seeded dish resolve to null (the
 *    chooser's job);
 *  - edit-canonical: a stored edit always wins over the seed,
 *    through a serialize/parse round trip;
 *  - price-book-absent: no book ⇒ no prices anywhere, totals
 *    count items; a book prices only what it names;
 *  - the stores live under prayercircle.* keys, so the generic
 *    backup dump/restore carries them like the email digest.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { keywordPageKindForEvent, keywordPagePath } from "../keyword-pages";
import { detectEventKeyword } from "../schedule-data";
import {
  DISH_KEYS,
  GROCERY_CHECKS_KEY,
  PRICE_BOOK_KEY,
  RECIPES_KEY,
  SEED_RECIPES,
  formatCents,
  groceryStateKey,
  groceryTotals,
  groupIngredients,
  ingredientKeyFor,
  isEditedDish,
  parseGroceryChecks,
  parsePriceBook,
  parseRecipeStore,
  priceForIngredient,
  recipeForDish,
  resolveDishForEvent,
  resolveDishKeyFromNotes,
  toggleCheckedIngredient,
  withRecipeEdit,
  type RecipeStore,
} from "../food";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

/* ------------------------------ the door ------------------------------ */

describe("v370 Food door routing", () => {
  it("a stored Meal keyword is a Food door whatever the title says", () => {
    expect(keywordPageKindForEvent({ keyword: "Meal", title: "Tuesday" })).toBe("food");
    expect(keywordPageKindForEvent({ keyword: "Meal" })).toBe("food");
  });

  it("an unstored event whose keyword resolves to Meal is a Food door", () => {
    // The card passes its resolved label (stored label, else
    // detectEventKeyword over title/location/notes).
    expect(keywordPageKindForEvent({ title: "Lunch" }, "Meal")).toBe("food");
    expect(keywordPageKindForEvent({ title: "Dinner" }, detectEventKeyword("Dinner")?.label)).toBe(
      "food",
    );
    expect(
      keywordPageKindForEvent(
        { title: "Family meal" },
        detectEventKeyword("Family meal")?.label,
      ),
    ).toBe("food");
  });

  it("other keywords and resolutions are not Food doors", () => {
    expect(keywordPageKindForEvent({ keyword: "Church", title: "Dinner" })).toBeNull();
    expect(keywordPageKindForEvent({ keyword: "Garden", title: "Lunch" })).toBeNull();
    expect(keywordPageKindForEvent({ title: "Lunch" }, "Church")).toBeNull();
    expect(keywordPageKindForEvent({ title: "Lunch" })).toBeNull();
    expect(keywordPageKindForEvent({ title: "Church" }, "Church")).toBeNull();
    expect(keywordPageKindForEvent({}, null)).toBeNull();
  });

  it("the News/Email claims are untouched", () => {
    expect(keywordPageKindForEvent({ keyword: "News", title: "Lunch" }, "Meal")).toBe("news");
    expect(keywordPageKindForEvent({ keyword: "Email", title: "Dinner" }, "Meal")).toBe("email");
    expect(keywordPageKindForEvent({ title: "News" }, "Meal")).toBe("news");
    expect(keywordPageKindForEvent({ title: "Mail" }, "Meal")).toBe("email");
  });

  it("routes resolve to the three pages", () => {
    expect(keywordPagePath("news")).toBe("/news");
    expect(keywordPagePath("email")).toBe("/email");
    expect(keywordPagePath("food")).toBe("/food");
  });

  it("the day card passes its resolved label into the door detection", () => {
    const source = read("components/schedule-tab.tsx");
    expect(source).toContain("keywordPageKindForEvent(event, detectedKeyword?.label)");
  });
});

/* --------------------------- dish resolution --------------------------- */

describe("v370 dish resolution from notes", () => {
  it("a food word in the notes names the dish", () => {
    expect(resolveDishKeyFromNotes("burger night")).toBe("burgers");
    expect(resolveDishKeyFromNotes("Tacos, the good ones")).toBe("tacos");
    expect(resolveDishKeyFromNotes("chicken soup for Eva")).toBe("soup");
    expect(resolveDishKeyFromNotes("bean burritos")).toBe("bean-burritos");
    expect(resolveDishForEvent({ notes: "leftover pot roast" })).toBe("pot-roast");
    expect(resolveDishForEvent({ notes: "ramen!!" })).toBe("ramen");
  });

  it("the matcher's order decides when two foods are named", () => {
    // detectHomecookedMeal tests taco before soup: tacos win.
    expect(resolveDishKeyFromNotes("taco soup")).toBe("tacos");
    // Burrito is tested before taco.
    expect(resolveDishKeyFromNotes("burritos and tacos")).toBe("bean-burritos");
  });

  it("the specific dish wins inside its family", () => {
    expect(resolveDishKeyFromNotes("grilled cheese sandwiches")).toBe("grilled-cheese");
    expect(resolveDishKeyFromNotes("mexican pizza night")).toBe("mexican-pizza");
    expect(resolveDishKeyFromNotes("plain cheese pizza")).toBe("pizza");
    expect(resolveDishKeyFromNotes("a sandwich run")).toBe("sandwich");
  });

  it("scene-only words with no seeded dish resolve to no dish", () => {
    expect(resolveDishKeyFromNotes("big salad")).toBeNull();
    expect(resolveDishKeyFromNotes("pasta bake")).toBeNull();
    expect(resolveDishKeyFromNotes("pancakes")).toBeNull();
    expect(resolveDishKeyFromNotes("scrambled eggs")).toBeNull();
  });

  it("no notes, no dish — the chooser's case", () => {
    expect(resolveDishKeyFromNotes(undefined)).toBeNull();
    expect(resolveDishKeyFromNotes(null)).toBeNull();
    expect(resolveDishKeyFromNotes("")).toBeNull();
    expect(resolveDishKeyFromNotes("bring the good plates")).toBeNull();
    expect(resolveDishForEvent({})).toBeNull();
  });
});

/* ------------------------------ seed data ------------------------------ */

describe("v370 seed recipes", () => {
  it("ships exactly the 25 dishes from his Oct 12 list", () => {
    // v371 amendment: Papa Joe's (his Oct 30 ask) joins the list
    // in the sandwich family's seat — 26 dishes then.
    // v372 amendment: the Loaded Shawarma-Style Chicken & Rice
    // Bar (the HelloFresh recipe he chose) joins in the chicken
    // family's seat — 27 dishes now.
    expect(DISH_KEYS).toHaveLength(27);
    expect(DISH_KEYS).toEqual([
      "soup",
      "bean-burritos",
      "tacos",
      "sandwich",
      "papa-joes",
      "tv-dinner",
      "pizza",
      "grilled-cheese",
      "mexican-pizza",
      "pupusas",
      "steak",
      "tostadas",
      "hot-wings",
      "burgers",
      "roast-chicken",
      "shawarma-rice-bar",
      "meatloaf",
      "pot-roast",
      "casserole",
      "hot-dogs",
      "nachos",
      "quesadilla",
      "ramen",
      "stir-fry",
      "fried-rice",
      "oatmeal",
      "cereal",
    ]);
  });

  it("every seeded dish is a whole recipe: ingredients with quantities, numbered steps", () => {
    for (const dish of DISH_KEYS) {
      const seed = SEED_RECIPES[dish];
      expect(seed.title.length).toBeGreaterThan(0);
      expect(seed.ingredients.length).toBeGreaterThanOrEqual(3);
      for (const ing of seed.ingredients) {
        expect(ing.name.length).toBeGreaterThan(0);
        expect(ing.quantity.length).toBeGreaterThan(0);
      }
      expect(seed.steps.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("the burgers seed is the mockup's own list", () => {
    const names = SEED_RECIPES["burgers"].ingredients.map((i) => i.name);
    expect(names).toContain("Burger buns");
    expect(names).toContain("Ground beef 80/20");
    expect(names).toContain("Pickles");
  });
});

/* --------------------------- edit-canonical ---------------------------- */

describe("v370 edited recipes are canonical", () => {
  it("an unedited dish reads as its seed", () => {
    const recipe = recipeForDish("tacos", {});
    expect(recipe.title).toBe(SEED_RECIPES["tacos"].title);
    expect(recipe.steps).toEqual([...SEED_RECIPES["tacos"].steps]);
    expect(isEditedDish("tacos", {})).toBe(false);
  });

  it("a stored edit wins over the seed, and survives a round trip", () => {
    const seed = recipeForDish("tacos", {});
    const edited = {
      ...seed,
      ingredients: [
        { name: "Corn tortillas", quantity: "12", group: "Bakery" as const },
        ...seed.ingredients.slice(1),
      ],
      steps: ["His way first.", ...seed.steps.slice(1)],
    };
    const store: RecipeStore = withRecipeEdit({}, edited);
    expect(isEditedDish("tacos", store)).toBe(true);

    const roundTripped = parseRecipeStore(JSON.stringify(store));
    const reread = recipeForDish("tacos", roundTripped);
    expect(reread.ingredients[0].name).toBe("Corn tortillas");
    expect(reread.steps[0]).toBe("His way first.");
    // Other dishes still read as seeds from the same store.
    expect(recipeForDish("soup", roundTripped).title).toBe(SEED_RECIPES["soup"].title);
  });

  it("a malformed stored dish falls back to its seed, never half-read", () => {
    const store = parseRecipeStore(
      JSON.stringify({ tacos: { ingredients: "nope", steps: 4 }, soup: { ingredients: [], steps: [] } }),
    );
    expect(store).toEqual({});
    expect(recipeForDish("tacos", store).steps.length).toBeGreaterThan(0);
    expect(parseRecipeStore("not json")).toEqual({});
    expect(parseRecipeStore(null)).toEqual({});
  });
});

/* ------------------------------ price book ----------------------------- */

describe("v370 price book honesty", () => {
  const recipe = recipeForDish("burgers", {});

  it("the stores ride under prayercircle.* keys, like the email digest", () => {
    for (const key of [RECIPES_KEY, PRICE_BOOK_KEY, GROCERY_CHECKS_KEY]) {
      expect(key.startsWith("prayercircle.")).toBe(true);
    }
    expect(PRICE_BOOK_KEY).toBe("prayercircle.price-book.v1");
  });

  it("an absent book parses empty and prices nothing", () => {
    expect(parsePriceBook(null)).toEqual({});
    expect(parsePriceBook("junk")).toEqual({});
    expect(priceForIngredient({}, "Burger buns")).toBeNull();
    const totals = groceryTotals(recipe, {}, []);
    expect(totals.pricedCount).toBe(0);
    expect(totals.totalCents).toBe(0);
    expect(totals.remainingCents).toBe(0);
  });

  it("with no prices the total card counts items, and progress follows checks", () => {
    const none = groceryTotals(recipe, {}, []);
    expect(none.itemCount).toBe(recipe.ingredients.length);
    expect(none.checkedCount).toBe(0);
    expect(none.progress).toBe(0);
    const some = groceryTotals(recipe, {}, [
      ingredientKeyFor("Burger buns"),
      ingredientKeyFor("Pickles"),
    ]);
    expect(some.checkedCount).toBe(2);
    expect(some.progress).toBeCloseTo(2 / recipe.ingredients.length);
  });

  it("a book prices only what it names; checked priced items are spent", () => {
    const book = parsePriceBook(
      JSON.stringify({
        "burger buns": { price: 3.5, checkedDate: "2026-10-30", store: "Walmart" },
        "Ground Beef 80/20": { price: 6.8, checkedDate: "2026-10-30" },
        bogus: { price: "free" },
      }),
    );
    expect(Object.keys(book).sort()).toEqual(["burger buns", "ground beef 80/20"]);
    expect(priceForIngredient(book, "Burger Buns")?.price).toBe(3.5);
    expect(priceForIngredient(book, "Lettuce")).toBeNull();

    const totals = groceryTotals(recipe, book, [ingredientKeyFor("Burger buns")]);
    expect(totals.pricedCount).toBe(2);
    expect(totals.totalCents).toBe(1030);
    expect(totals.spentCents).toBe(350);
    expect(totals.remainingCents).toBe(680);
    expect(totals.progress).toBeCloseTo(350 / 1030);
    expect(formatCents(totals.remainingCents)).toBe("$6.80");
  });
});

/* ---------------------------- grocery checks --------------------------- */

describe("v370 grocery checklist state", () => {
  it("state is keyed by event + dish and toggles by ingredient", () => {
    expect(groceryStateKey("ev-1", "tacos")).toBe("ev-1::tacos");
    const on = toggleCheckedIngredient([], "Burger Buns");
    expect(on).toEqual(["burger buns"]);
    expect(toggleCheckedIngredient(on, "burger buns")).toEqual([]);
  });

  it("checks survive a round trip; malformed rows drop", () => {
    const parsed = parseGroceryChecks(
      JSON.stringify({ "ev-1::tacos": ["taco shells", 4, "ground beef 80/20"], bad: "x" }),
    );
    expect(parsed).toEqual({ "ev-1::tacos": ["taco shells", "ground beef 80/20"] });
    expect(parseGroceryChecks(null)).toEqual({});
  });

  it("ingredients group into the Concept 2 store sections, in order", () => {
    const groups = groupIngredients(recipeForDish("burgers", {}));
    expect(groups.map((g) => g.group)).toEqual(["Produce", "Meat", "Bakery", "Dairy", "Pantry"]);
    expect(groups.find((g) => g.group === "Produce")?.ingredients.map((i) => i.name)).toEqual([
      "Lettuce",
      "Tomato",
      "Red onion",
    ]);
  });
});

/* ------------------------------- the page ------------------------------ */

describe("v370 the Food page", () => {
  it("exists, carries the Finished check-off, and reads the food stores", () => {
    const page = read("app/food.tsx");
    expect(page).toContain("finishScheduleEvent");
    expect(page).toContain("FinishedBar");
    expect(page).toContain("loadRecipeStore");
    expect(page).toContain("loadPriceBook");
    expect(page).toContain("resolveDishForEvent");
  });

  it("choosing a dish writes nothing into the event's notes", () => {
    const page = read("app/food.tsx");
    expect(page).not.toContain("notes:");
    expect(page).not.toMatch(/setItem\(SCHEDULE_EVENTS_KEY/);
  });
});
