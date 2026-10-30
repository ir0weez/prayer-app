/**
 * v376 — Mississippi Pot Roast pins (Jonathan, Oct 30: "Can
 * you add the Mississippi Pot Roast Crockpot recipe in there
 * as well?"):
 *  - the seed: a full dish — the classic crockpot build (chuck
 *    roast, ranch mix, au jus mix, a stick of butter, whole
 *    pepperoncini), 10 minutes of prep and 8 hours on LOW;
 *  - resolution: "mississippi" in the notes names the dish,
 *    ahead of the generic pot-roast row — and plain "pot
 *    roast" still claims the existing pot-roast dish;
 *  - canonical edits: Mississippi edits win over the seed like
 *    every other dish (prayercircle.recipes.v1);
 *  - the v375 pick path: "Add to event" writes the title into
 *    the notes and it resolves straight back to this dish;
 *  - artwork: every skin's notes matcher claims the crockpot
 *    scene, and every registry carries the new scene id.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import {
  DISH_KEYS,
  SEED_RECIPES,
  filterDishKeys,
  isEditedDish,
  notesWithDish,
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

describe("v376 Mississippi Pot Roast seed recipe", () => {
  it("is a full dish in the chooser, in the roast family's seat", () => {
    expect(DISH_KEYS).toHaveLength(29);
    expect(DISH_KEYS).toContain("mississippi-pot-roast");
    expect(DISH_KEYS.indexOf("mississippi-pot-roast")).toBe(
      DISH_KEYS.indexOf("pot-roast") + 1,
    );
    const seed = SEED_RECIPES["mississippi-pot-roast"];
    expect(seed.title).toBe("Mississippi Pot Roast");
    expect(seed.serves).toBe("Serves 6");
    // 10 minutes of prep + 8 hours on LOW in the crockpot.
    expect(seed.minutes).toBe(490);
    expect(seed.ingredients).toHaveLength(5);
    expect(seed.steps).toHaveLength(6);
  });

  it("carries the classic build: chuck roast, ranch, au jus, butter, pepperoncini", () => {
    const seed = SEED_RECIPES["mississippi-pot-roast"];
    const byName = new Map(seed.ingredients.map((i) => [i.name, i]));
    expect(byName.get("Beef chuck roast")).toEqual({
      name: "Beef chuck roast",
      quantity: "3 lb",
      group: "Meat",
    });
    expect(byName.get("Ranch dressing mix")).toEqual({
      name: "Ranch dressing mix",
      quantity: "1 packet (1 oz)",
      group: "Pantry",
    });
    expect(byName.get("Au jus gravy mix")).toEqual({
      name: "Au jus gravy mix",
      quantity: "1 packet (1 oz)",
      group: "Pantry",
    });
    expect(byName.get("Butter")).toEqual({
      name: "Butter",
      quantity: "½ cup (1 stick)",
      group: "Dairy",
    });
    expect(byName.get("Pepperoncini peppers")?.group).toBe("Pantry");
    const steps = seed.steps.join(" ");
    expect(steps).toContain("slow cooker");
    expect(steps).toContain("LOW for 8 hours");
    expect(steps).toContain("fork-tender");
    expect(steps).toContain("Shred the beef");
  });
});

/* ------------------------------ resolution ------------------------------- */

describe("v376 Mississippi resolution from notes", () => {
  it("the name resolves, any case", () => {
    expect(resolveDishKeyFromNotes("mississippi pot roast tonight")).toBe(
      "mississippi-pot-roast",
    );
    expect(resolveDishKeyFromNotes("Mississippi Pot Roast")).toBe(
      "mississippi-pot-roast",
    );
    expect(resolveDishKeyFromNotes("the MISSISSIPPI one in the crockpot")).toBe(
      "mississippi-pot-roast",
    );
  });

  it("plain pot roast keeps its own dish — the roast family is not shadowed", () => {
    expect(resolveDishKeyFromNotes("pot roast")).toBe("pot-roast");
    expect(resolveDishKeyFromNotes("pot roast with carrots and potatoes")).toBe(
      "pot-roast",
    );
    expect(resolveDishKeyFromNotes("roast beef on Sunday")).toBe("pot-roast");
  });
});

/* ---------------------------- edit-canonical ----------------------------- */

describe("v376 Mississippi edits are canonical like the other dishes", () => {
  it("an unedited Mississippi reads as its seed; a stored edit wins and round-trips", () => {
    expect(recipeForDish("mississippi-pot-roast", {}).title).toBe(
      "Mississippi Pot Roast",
    );
    expect(isEditedDish("mississippi-pot-roast", {})).toBe(false);
    const seed = recipeForDish("mississippi-pot-roast", {});
    const edited = {
      ...seed,
      steps: ["His way first — extra pepperoncini.", ...seed.steps.slice(1)],
    };
    const store: RecipeStore = withRecipeEdit({}, edited);
    const roundTripped = parseRecipeStore(JSON.stringify(store));
    expect(isEditedDish("mississippi-pot-roast", roundTripped)).toBe(true);
    expect(recipeForDish("mississippi-pot-roast", roundTripped).steps[0]).toBe(
      "His way first — extra pepperoncini.",
    );
    // The neighbours still read as seeds from the same store.
    expect(recipeForDish("pot-roast", roundTripped).title).toBe(
      SEED_RECIPES["pot-roast"].title,
    );
  });
});

/* ------------------------- v375 pick-mode coverage ------------------------ */

describe("v376 the dish rides the v375 selector like every other dish", () => {
  it("the pick-mode search finds it by name", () => {
    expect(filterDishKeys("mississippi")).toEqual(["mississippi-pot-roast"]);
    expect(filterDishKeys("MISSISSIPPI")).toEqual(["mississippi-pot-roast"]);
  });

  it("Add to event writes the title and it resolves straight back", () => {
    const notes = notesWithDish("", "mississippi-pot-roast");
    expect(notes).toBe("Mississippi Pot Roast");
    expect(resolveDishKeyFromNotes(notes)).toBe("mississippi-pot-roast");
  });

  it("picking it over a pot-roast event replaces the name, never stacks", () => {
    const notes = notesWithDish("pot roast, in by nine", "mississippi-pot-roast");
    expect(notes).toBe("Mississippi Pot Roast, in by nine");
    expect(resolveDishKeyFromNotes(notes)).toBe("mississippi-pot-roast");
    // And re-adding it changes nothing.
    expect(notesWithDish(notes, "mississippi-pot-roast")).toBe(notes);
  });
});

/* -------------------------------- artwork -------------------------------- */

describe("v376 Mississippi artwork claims its own scene", () => {
  it("the skin routing claims td-mississippi-pot-roast — and pot roast keeps td-pot-roast", () => {
    expect(paperSceneIdFor("Meal", "Dinner", "", "mississippi pot roast")).toBe(
      "td-mississippi-pot-roast",
    );
    expect(paperSceneIdFor("Meal", "Lunch", "", "Mississippi in the crockpot")).toBe(
      "td-mississippi-pot-roast",
    );
    expect(paperSceneIdFor("Meal", "Dinner", "", "pot roast")).toBe(
      "td-pot-roast",
    );
  });

  it("the classic matcher claims the crockpot scene ahead of the pot-roast scene", () => {
    const source = read("components/schedule-tab.tsx");
    const mississippi = source.indexOf('if (match("mississippi")) return <TopDownMississippiPotRoastScene />;');
    const potRoast = source.indexOf('if (match("pot roast", "roast beef")) return <TopDownPotRoastScene />;');
    expect(mississippi).toBeGreaterThan(-1);
    expect(potRoast).toBeGreaterThan(-1);
    expect(mississippi).toBeLessThan(potRoast);
    expect(source).toContain("function TopDownMississippiPotRoastScene()");
  });

  it("every skin registry and the thumb tables carry the scene", () => {
    expect(read("components/paper-keyword-scenes.tsx")).toContain('"td-mississippi-pot-roast":');
    expect(read("components/pixel-keyword-scenes.tsx")).toContain('"td-mississippi-pot-roast":');
    expect(read("components/terminal-keyword-scenes.tsx")).toContain('"td-mississippi-pot-roast":');
    expect(read("components/keyword-thumb-art.tsx")).toContain('"td-mississippi-pot-roast":');
    expect(read("lib/keyword-thumb-motion.ts")).toContain('"td-mississippi-pot-roast":');
  });
});
