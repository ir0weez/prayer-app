/**
 * v372 — Loaded Shawarma-Style Chicken & Rice Bar pins
 * (Jonathan, Oct 30: the HelloFresh recipe he sent and chose):
 *  - the seed: a full 27th dish — HelloFresh's family-style
 *    shawarma chicken and rice bar for two, kept faithful
 *    (roasted peppers and onion, tomato-cuke salad, lemon-garlic
 *    hummus, crema and feta served separately);
 *  - resolution: "shawarma" in the notes names the dish, ahead
 *    of the generic chicken and salad rows; plain chicken notes
 *    are untouched;
 *  - canonical edits: Rice Bar edits win over the seed like
 *    every other dish (prayercircle.recipes.v1);
 *  - artwork: every skin's notes matcher claims the rice-bar
 *    scene ahead of the roast-chicken scene, and every registry
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

describe("v372 Shawarma Rice Bar seed recipe", () => {
  it("is a full dish in the chooser, in the chicken family's seat", () => {
    expect(DISH_KEYS).toHaveLength(27);
    expect(DISH_KEYS).toContain("shawarma-rice-bar");
    expect(DISH_KEYS.indexOf("shawarma-rice-bar")).toBe(
      DISH_KEYS.indexOf("roast-chicken") + 1,
    );
    const seed = SEED_RECIPES["shawarma-rice-bar"];
    expect(seed.title).toBe("Loaded Shawarma-Style Chicken & Rice Bar");
    expect(seed.serves).toBe("Serves 2");
    expect(seed.minutes).toBe(30);
    expect(seed.ingredients).toHaveLength(14);
    expect(seed.steps).toHaveLength(7);
  });

  it("carries HelloFresh's build: chicken, rice, roasted veg, salad, hummus, crema, feta", () => {
    const seed = SEED_RECIPES["shawarma-rice-bar"];
    const byName = new Map(seed.ingredients.map((i) => [i.name, i]));
    expect(byName.get("Chicken cutlets")).toEqual({
      name: "Chicken cutlets",
      quantity: "10 oz",
      group: "Meat",
    });
    expect(byName.get("Bell pepper")?.group).toBe("Produce");
    expect(byName.get("Red onion")?.group).toBe("Produce");
    expect(byName.get("Mini cucumber")?.group).toBe("Produce");
    expect(byName.get("Tomato")?.group).toBe("Produce");
    expect(byName.get("Lemon")?.group).toBe("Produce");
    expect(byName.get("Jasmine rice")).toEqual({
      name: "Jasmine rice",
      quantity: "¾ cup",
      group: "Pantry",
    });
    expect(byName.get("Shawarma spice blend")?.quantity).toBe("1 tbsp");
    expect(byName.get("Garlic powder")?.quantity).toBe("1 tsp");
    expect(byName.get("Olive oil")?.quantity).toBe("4 tsp, plus drizzles");
    expect(byName.get("Hummus")?.group).toBe("Dairy");
    expect(byName.get("Sour cream")?.quantity).toBe("3 tbsp");
    expect(byName.get("Feta cheese")?.quantity).toBe("½ cup");
    expect(byName.get("Butter")?.group).toBe("Dairy");
    const steps = seed.steps.join(" ");
    expect(steps).toContain("425°F");
    expect(steps).toContain("1¼ cups water");
    expect(steps).toContain("165°");
    expect(steps).toContain("tomato-cuke salad");
    expect(steps).toContain("family style");
  });
});

/* ------------------------------ resolution ------------------------------- */

describe("v372 Shawarma Rice Bar resolution from notes", () => {
  it("the word shawarma resolves, in any case and in the full dish name", () => {
    expect(resolveDishKeyFromNotes("shawarma tonight")).toBe("shawarma-rice-bar");
    expect(resolveDishKeyFromNotes("SHAWARMA chicken")).toBe("shawarma-rice-bar");
    expect(
      resolveDishKeyFromNotes("Loaded Shawarma-Style Chicken & Rice Bar"),
    ).toBe("shawarma-rice-bar");
    expect(resolveDishKeyFromNotes("the shawarma bar, family style")).toBe(
      "shawarma-rice-bar",
    );
  });

  it("wins ahead of the generic rows — and only when named", () => {
    expect(resolveDishKeyFromNotes("shawarma chicken with a salad")).toBe(
      "shawarma-rice-bar",
    );
    expect(resolveDishKeyFromNotes("roast chicken")).toBe("roast-chicken");
    expect(resolveDishKeyFromNotes("baked chicken")).toBe("roast-chicken");
    expect(resolveDishKeyFromNotes("chicken dinner")).toBeNull();
    expect(resolveDishKeyFromNotes("chicken salad")).toBeNull();
  });
});

/* ---------------------------- edit-canonical ----------------------------- */

describe("v372 Shawarma Rice Bar edits are canonical like the other dishes", () => {
  it("an unedited Rice Bar reads as its seed; a stored edit wins and round-trips", () => {
    expect(recipeForDish("shawarma-rice-bar", {}).title).toBe(
      "Loaded Shawarma-Style Chicken & Rice Bar",
    );
    expect(isEditedDish("shawarma-rice-bar", {})).toBe(false);
    const seed = recipeForDish("shawarma-rice-bar", {});
    const edited = {
      ...seed,
      steps: ["His way first — extra feta.", ...seed.steps.slice(1)],
    };
    const store: RecipeStore = withRecipeEdit({}, edited);
    const roundTripped = parseRecipeStore(JSON.stringify(store));
    expect(isEditedDish("shawarma-rice-bar", roundTripped)).toBe(true);
    expect(recipeForDish("shawarma-rice-bar", roundTripped).steps[0]).toBe(
      "His way first — extra feta.",
    );
    // The neighbours still read as seeds from the same store.
    expect(recipeForDish("roast-chicken", roundTripped).title).toBe(
      SEED_RECIPES["roast-chicken"].title,
    );
  });
});

/* -------------------------------- artwork -------------------------------- */

describe("v372 Shawarma Rice Bar artwork claims its own scene", () => {
  it("the skin routing claims td-shawarma-rice-bar ahead of td-roast-chicken", () => {
    expect(paperSceneIdFor("Meal", "Lunch", "", "shawarma tonight")).toBe(
      "td-shawarma-rice-bar",
    );
    expect(
      paperSceneIdFor(
        "Meal",
        "Dinner",
        "",
        "Loaded Shawarma-Style Chicken & Rice Bar",
      ),
    ).toBe("td-shawarma-rice-bar");
    expect(paperSceneIdFor("Meal", "Lunch", "", "roast chicken")).toBe(
      "td-roast-chicken",
    );
    expect(paperSceneIdFor("Meal", "Lunch", "", "chicken salad")).toBe("td-salad");
  });

  it("the classic matcher claims the Rice Bar scene before the generic scenes", () => {
    const source = read("components/schedule-tab.tsx");
    const bar = source.indexOf(
      'if (match("shawarma")) return <TopDownShawarmaRiceBarScene />;',
    );
    const salad = source.indexOf('if (match("salad"))');
    const roast = source.indexOf('if (match("roast chicken"');
    expect(bar).toBeGreaterThan(-1);
    expect(salad).toBeGreaterThan(-1);
    expect(roast).toBeGreaterThan(-1);
    expect(bar).toBeLessThan(salad);
    expect(bar).toBeLessThan(roast);
    expect(source).toContain("function TopDownShawarmaRiceBarScene()");
  });

  it("every skin registry and the thumb tables carry the scene", () => {
    expect(read("components/paper-keyword-scenes.tsx")).toContain(
      '"td-shawarma-rice-bar":',
    );
    expect(read("components/pixel-keyword-scenes.tsx")).toContain(
      '"td-shawarma-rice-bar":',
    );
    expect(read("components/terminal-keyword-scenes.tsx")).toContain(
      '"td-shawarma-rice-bar":',
    );
    expect(read("components/keyword-thumb-art.tsx")).toContain(
      '"td-shawarma-rice-bar":',
    );
    expect(read("lib/keyword-thumb-motion.ts")).toContain(
      '"td-shawarma-rice-bar":',
    );
  });
});
