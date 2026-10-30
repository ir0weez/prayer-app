/**
 * v371 — Papa Joe's pins (Jonathan, Oct 30: "Can you make Papa
 * Joe's from Jason's Deli a recipe? I used to make them all the
 * time when I was at home. Give it artwork too like the other
 * ones."):
 *  - the seed: a full 26th dish — the Jason's Deli sandwich
 *    (roasted turkey, Asiago, roasted tomatoes, pesto aioli on
 *    herb focaccia, chips + pickle) as a plain home version;
 *  - resolution: "papa joe" in the notes names the dish, ahead
 *    of the generic sandwich, apostrophes tolerated; plain
 *    sandwich notes are untouched;
 *  - canonical edits: Papa Joe's edits win over the seed like
 *    every other dish (prayercircle.recipes.v1);
 *  - artwork: every skin's notes matcher claims the papa-joe
 *    scene ahead of the sandwich scene, and every registry
 *    carries the new scene id.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import {
  DISH_KEYS,
  SEED_RECIPES,
  isEditedDish,
  parseRecipeStore,
  recipeForDish,
  resolveDishKeyFromNotes,
  withRecipeEdit,
  type RecipeStore,
} from "../food";
import { paperSceneIdFor } from "../paper-keywords";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

/* -------------------------------- the seed ------------------------------- */

describe("v371 Papa Joe's seed recipe", () => {
  it("is a full dish in the chooser, in the sandwich family's seat", () => {
    expect(DISH_KEYS).toHaveLength(26);
    expect(DISH_KEYS).toContain("papa-joes");
    expect(DISH_KEYS.indexOf("papa-joes")).toBe(DISH_KEYS.indexOf("sandwich") + 1);
    const seed = SEED_RECIPES["papa-joes"];
    expect(seed.title).toBe("Papa Joe's");
    expect(seed.ingredients.length).toBeGreaterThanOrEqual(3);
    expect(seed.steps.length).toBeGreaterThanOrEqual(3);
  });

  it("carries the Jason's Deli build: turkey, Asiago, roasted tomato, pesto aioli, focaccia", () => {
    const seed = SEED_RECIPES["papa-joes"];
    const byName = new Map(seed.ingredients.map((i) => [i.name, i]));
    expect(byName.get("Herb focaccia bread")?.group).toBe("Bakery");
    expect(byName.get("Roasted turkey breast")?.group).toBe("Meat");
    expect(byName.get("Asiago cheese")?.group).toBe("Dairy");
    expect(byName.get("Roma tomatoes")?.group).toBe("Produce");
    // The pesto is the brief's basil pesto, from the pantry shelf.
    expect(byName.get("Basil pesto")).toEqual({
      name: "Basil pesto",
      quantity: "3 tbsp",
      group: "Pantry",
    });
    expect(byName.get("Mayonnaise")?.group).toBe("Pantry");
    expect(byName.has("Potato chips")).toBe(true);
    expect(byName.has("Dill pickle spears")).toBe(true);
    const steps = seed.steps.join(" ");
    expect(steps).toContain("pesto aioli");
    expect(steps).toContain("roast");
  });
});

/* ------------------------------ resolution ------------------------------- */

describe("v371 Papa Joe's resolution from notes", () => {
  it("the name resolves in its apostrophe variants, any case", () => {
    expect(resolveDishKeyFromNotes("Papa Joe's tonight")).toBe("papa-joes");
    expect(resolveDishKeyFromNotes("papa joes for lunch")).toBe("papa-joes");
    expect(resolveDishKeyFromNotes("PAPA JOE")).toBe("papa-joes");
    expect(resolveDishKeyFromNotes("making a papa joe like I used to")).toBe("papa-joes");
  });

  it("wins ahead of the generic sandwich — and only when named", () => {
    expect(resolveDishKeyFromNotes("papa joe's sandwich night")).toBe("papa-joes");
    expect(resolveDishKeyFromNotes("a sandwich run")).toBe("sandwich");
    expect(resolveDishKeyFromNotes("turkey sandwich")).toBe("sandwich");
    expect(resolveDishKeyFromNotes("grilled cheese sandwiches")).toBe("grilled-cheese");
    // A different papa's name is not this dish.
    expect(resolveDishKeyFromNotes("papa john's pizza")).toBe("pizza");
  });
});

/* ---------------------------- edit-canonical ----------------------------- */

describe("v371 Papa Joe's edits are canonical like the other dishes", () => {
  it("an unedited Papa Joe's reads as its seed; a stored edit wins and round-trips", () => {
    expect(recipeForDish("papa-joes", {}).title).toBe("Papa Joe's");
    expect(isEditedDish("papa-joes", {})).toBe(false);
    const seed = recipeForDish("papa-joes", {});
    const edited = {
      ...seed,
      steps: ["His way first — extra pesto.", ...seed.steps.slice(1)],
    };
    const store: RecipeStore = withRecipeEdit({}, edited);
    const roundTripped = parseRecipeStore(JSON.stringify(store));
    expect(isEditedDish("papa-joes", roundTripped)).toBe(true);
    expect(recipeForDish("papa-joes", roundTripped).steps[0]).toBe(
      "His way first — extra pesto.",
    );
    // The neighbours still read as seeds from the same store.
    expect(recipeForDish("sandwich", roundTripped).title).toBe(
      SEED_RECIPES["sandwich"].title,
    );
  });
});

/* -------------------------------- artwork -------------------------------- */

describe("v371 Papa Joe's artwork claims its own scene", () => {
  it("the skin routing claims td-papa-joe ahead of td-sandwich", () => {
    expect(paperSceneIdFor("Meal", "Lunch", "", "Papa Joe's tonight")).toBe("td-papa-joe");
    expect(paperSceneIdFor("Meal", "Dinner", "", "papa joes")).toBe("td-papa-joe");
    expect(paperSceneIdFor("Meal", "Lunch", "", "turkey sandwich")).toBe("td-sandwich");
    expect(paperSceneIdFor("Meal", "Lunch", "", "grilled cheese")).toBe("td-sandwich");
  });

  it("the classic matcher claims the Papa Joe scene before the sandwich scene", () => {
    const source = read("components/schedule-tab.tsx");
    const papa = source.indexOf('if (match("papa joe")) return <TopDownPapaJoeScene />;');
    const sandwich = source.indexOf('if (match("sandwich", "panini", "grilled cheese"))');
    expect(papa).toBeGreaterThan(-1);
    expect(sandwich).toBeGreaterThan(-1);
    expect(papa).toBeLessThan(sandwich);
    expect(source).toContain("function TopDownPapaJoeScene()");
  });

  it("every skin registry and the thumb tables carry the scene", () => {
    expect(read("components/paper-keyword-scenes.tsx")).toContain('"td-papa-joe":');
    expect(read("components/pixel-keyword-scenes.tsx")).toContain('"td-papa-joe":');
    expect(read("components/terminal-keyword-scenes.tsx")).toContain('"td-papa-joe":');
    expect(read("components/keyword-thumb-art.tsx")).toContain('"td-papa-joe":');
    expect(read("lib/keyword-thumb-motion.ts")).toContain('"td-papa-joe":');
  });
});
