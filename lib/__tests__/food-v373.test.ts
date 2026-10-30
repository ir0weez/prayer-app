/**
 * v373 — Bacon & Mushroom Risotto pins (Jonathan, Oct 30: he
 * sent the HelloFresh recipe — "This one too!"):
 *  - the seed: a full dish — HelloFresh's Bacon & Mushroom
 *    Risotto with Thyme, Parmesan & Scallions (bacon and
 *    mushrooms roasted, rice toasted in garlicky butter, stock
 *    ladled in, cheese roux + sour cream to finish);
 *  - resolution: "risotto" in the notes names the dish, ahead
 *    of nothing it could shadow — and "fried rice" still
 *    claims the fried-rice dish, untouched;
 *  - canonical edits: risotto edits win over the seed like
 *    every other dish (prayercircle.recipes.v1);
 *  - artwork: every skin's notes matcher claims the risotto
 *    scene, and every registry carries the new scene id.
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

describe("v373 Bacon & Mushroom Risotto seed recipe", () => {
  it("is a full dish in the chooser, in the rice family's seat", () => {
    // v376 amendment: Mississippi Pot Roast joined the list
    // after this pin was written — 29 dishes now.
    expect(DISH_KEYS).toHaveLength(29);
    expect(DISH_KEYS).toContain("bacon-mushroom-risotto");
    expect(DISH_KEYS.indexOf("bacon-mushroom-risotto")).toBe(
      DISH_KEYS.indexOf("fried-rice") + 1,
    );
    const seed = SEED_RECIPES["bacon-mushroom-risotto"];
    expect(seed.title).toBe("Bacon & Mushroom Risotto");
    expect(seed.serves).toBe("Serves 2");
    expect(seed.minutes).toBe(50);
    expect(seed.ingredients.length).toBeGreaterThanOrEqual(3);
    expect(seed.steps.length).toBeGreaterThanOrEqual(3);
  });

  it("carries the HelloFresh build: bacon, mushrooms, arborio, thyme, Parmesan", () => {
    const seed = SEED_RECIPES["bacon-mushroom-risotto"];
    const byName = new Map(seed.ingredients.map((i) => [i.name, i]));
    expect(byName.get("Bacon")).toEqual({
      name: "Bacon",
      quantity: "4 oz",
      group: "Meat",
    });
    expect(byName.get("Button mushrooms")?.group).toBe("Produce");
    expect(byName.get("Scallions")?.group).toBe("Produce");
    expect(byName.get("Arborio rice")).toEqual({
      name: "Arborio rice",
      quantity: "¾ cup",
      group: "Pantry",
    });
    expect(byName.get("Dried thyme")?.group).toBe("Pantry");
    expect(byName.get("Vidalia onion paste")?.group).toBe("Pantry");
    expect(byName.get("Chicken stock concentrate")?.group).toBe("Pantry");
    expect(byName.get("Cheese roux concentrate")?.group).toBe("Pantry");
    expect(byName.get("Sour cream")?.group).toBe("Dairy");
    expect(byName.get("Parmesan cheese")?.group).toBe("Dairy");
    expect(byName.get("Butter")?.group).toBe("Dairy");
    const steps = seed.steps.join(" ");
    expect(steps).toContain("425°F");
    expect(steps).toContain("al dente");
    expect(steps).toContain("scallion greens");
  });
});

/* ------------------------------ resolution ------------------------------- */

describe("v373 risotto resolution from notes", () => {
  it("the name resolves, any case", () => {
    expect(resolveDishKeyFromNotes("risotto tonight")).toBe(
      "bacon-mushroom-risotto",
    );
    expect(resolveDishKeyFromNotes("Bacon & Mushroom Risotto")).toBe(
      "bacon-mushroom-risotto",
    );
    expect(resolveDishKeyFromNotes("making the RISOTTO from HelloFresh")).toBe(
      "bacon-mushroom-risotto",
    );
  });

  it("fried rice keeps its own dish — the rice family is not shadowed", () => {
    expect(resolveDishKeyFromNotes("fried rice")).toBe("fried-rice");
    expect(resolveDishKeyFromNotes("shrimp fried rice night")).toBe(
      "fried-rice",
    );
    expect(resolveDishKeyFromNotes("chicken fried rice and egg rolls")).toBe(
      "fried-rice",
    );
    // Plain rice names no dish at all.
    expect(resolveDishKeyFromNotes("rice and beans")).toBeNull();
    expect(resolveDishKeyFromNotes("steamed rice")).toBeNull();
  });
});

/* ---------------------------- edit-canonical ----------------------------- */

describe("v373 risotto edits are canonical like the other dishes", () => {
  it("an unedited risotto reads as its seed; a stored edit wins and round-trips", () => {
    expect(recipeForDish("bacon-mushroom-risotto", {}).title).toBe(
      "Bacon & Mushroom Risotto",
    );
    expect(isEditedDish("bacon-mushroom-risotto", {})).toBe(false);
    const seed = recipeForDish("bacon-mushroom-risotto", {});
    const edited = {
      ...seed,
      steps: ["His way first — extra bacon.", ...seed.steps.slice(1)],
    };
    const store: RecipeStore = withRecipeEdit({}, edited);
    const roundTripped = parseRecipeStore(JSON.stringify(store));
    expect(isEditedDish("bacon-mushroom-risotto", roundTripped)).toBe(true);
    expect(recipeForDish("bacon-mushroom-risotto", roundTripped).steps[0]).toBe(
      "His way first — extra bacon.",
    );
    // The neighbours still read as seeds from the same store.
    expect(recipeForDish("fried-rice", roundTripped).title).toBe(
      SEED_RECIPES["fried-rice"].title,
    );
  });
});

/* -------------------------------- artwork -------------------------------- */

describe("v373 risotto artwork claims its own scene", () => {
  it("the skin routing claims td-risotto — and fried rice keeps td-fried-rice", () => {
    expect(paperSceneIdFor("Meal", "Dinner", "", "risotto tonight")).toBe(
      "td-risotto",
    );
    expect(paperSceneIdFor("Meal", "Lunch", "", "Bacon & Mushroom Risotto")).toBe(
      "td-risotto",
    );
    expect(paperSceneIdFor("Meal", "Dinner", "", "fried rice")).toBe(
      "td-fried-rice",
    );
  });

  it("the classic matcher claims the risotto scene ahead of the fried-rice scene", () => {
    const source = read("components/schedule-tab.tsx");
    const risotto = source.indexOf('if (match("risotto")) return <TopDownRisottoScene />;');
    const friedRice = source.indexOf('if (match("fried rice")) return <TopDownFriedRiceScene />;');
    expect(risotto).toBeGreaterThan(-1);
    expect(friedRice).toBeGreaterThan(-1);
    expect(risotto).toBeLessThan(friedRice);
    expect(source).toContain("function TopDownRisottoScene()");
  });

  it("every skin registry and the thumb tables carry the scene", () => {
    expect(read("components/paper-keyword-scenes.tsx")).toContain('"td-risotto":');
    expect(read("components/pixel-keyword-scenes.tsx")).toContain('"td-risotto":');
    expect(read("components/terminal-keyword-scenes.tsx")).toContain('"td-risotto":');
    expect(read("components/keyword-thumb-art.tsx")).toContain('"td-risotto":');
    expect(read("lib/keyword-thumb-motion.ts")).toContain('"td-risotto":');
  });
});
