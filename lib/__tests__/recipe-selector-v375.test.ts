/**
 * v375 — the recipe selector (Jonathan's flow, approved Oct 30).
 * The pins cover the seams the flow stands on:
 *  - the editor's Recipe row shows for Lunch/Dinner titles only;
 *  - the chooser's search filters the dish list;
 *  - "Add to event" writes the dish into the notes by REPLACING
 *    the dish already named (never stacking), preserving every
 *    other word;
 *  - the editor's attached state is the notes resolution itself;
 *  - the hand-off slot carries a pick for a saved event AND for
 *    a not-yet-saved one, consumed exactly once, by token.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  DISH_KEYS,
  SEED_RECIPES,
  filterDishKeys,
  groupDishesForPicker,
  isMealEventTitle,
  notesWithDish,
  resolveDishKeyFromNotes,
  withRecipeEdit,
  type RecipeStore,
} from "../food";
import {
  beginRecipePick,
  cancelRecipePick,
  completeRecipePick,
  consumeRecipePickResult,
  peekRecipePickRequest,
  resetRecipePickForTests,
} from "../recipe-pick";

const read = (rel: string) => readFileSync(join(__dirname, "..", "..", rel), "utf8");

describe("v375 the Recipe row's title rule", () => {
  it("shows for Lunch and Dinner titles, any case, anywhere in the title", () => {
    expect(isMealEventTitle("Lunch")).toBe(true);
    expect(isMealEventTitle("Dinner")).toBe(true);
    expect(isMealEventTitle("family DINNER at home")).toBe(true);
    expect(isMealEventTitle("lunch with Mom")).toBe(true);
  });

  it("stays hidden for everything else", () => {
    expect(isMealEventTitle("Breakfast")).toBe(false);
    expect(isMealEventTitle("Brunch")).toBe(false);
    expect(isMealEventTitle("Church supper")).toBe(false);
    expect(isMealEventTitle("")).toBe(false);
    expect(isMealEventTitle(null)).toBe(false);
    expect(isMealEventTitle(undefined)).toBe(false);
  });

  it("the editor derives the row from the live title text", () => {
    const form = read("components/event-edit-form.tsx");
    expect(form).toContain("isMealEventTitle(formTitle)");
    expect(form).toContain("showRecipeRow");
  });
});

describe("v375 Add to event writes the notes — replace, never stack", () => {
  it("empty notes become the dish's title, and resolve straight back", () => {
    for (const dish of DISH_KEYS) {
      const notes = notesWithDish("", dish);
      expect(notes).toBe(SEED_RECIPES[dish].title);
      expect(resolveDishKeyFromNotes(notes)).toBe(dish);
    }
  });

  it("every dish, added to neutral notes, resolves to itself", () => {
    for (const dish of DISH_KEYS) {
      const notes = notesWithDish("At home, at the table", dish);
      expect(resolveDishKeyFromNotes(notes)).toBe(dish);
      expect(notes).toContain("At home, at the table");
    }
  });

  it("replaces the dish already named instead of stacking a second one", () => {
    const notes = notesWithDish("Tacos with the kids", "soup");
    expect(notes).toBe("Soup with the kids");
    expect(resolveDishKeyFromNotes(notes)).toBe("soup");
    expect(notes.toLowerCase()).not.toContain("taco");
  });

  it("preserves every other word of the notes around the swap", () => {
    const notes = notesWithDish(
      "Bring the big pot. We're having tacos tonight, early.",
      "papa-joes",
    );
    expect(notes).toContain("Bring the big pot.");
    expect(notes).toContain("tonight, early.");
    expect(resolveDishKeyFromNotes(notes)).toBe("papa-joes");
  });

  it("a scene-only food word is replaced too, so the dish actually claims the event", () => {
    const notes = notesWithDish("green salad night", "soup");
    expect(resolveDishKeyFromNotes(notes)).toBe("soup");
    expect(notes).toContain("night");
  });

  it("re-adding the dish already named changes nothing", () => {
    expect(notesWithDish("Taco Tuesday at home", "tacos")).toBe("Taco Tuesday at home");
  });
});

describe("v375 the chooser's search", () => {
  it("filters by title substring, case-insensitive, in chooser order", () => {
    expect(filterDishKeys("papa")).toEqual(["papa-joes"]);
    expect(filterDishKeys("RICE")).toEqual(
      DISH_KEYS.filter((d) => SEED_RECIPES[d].title.toLowerCase().includes("rice")),
    );
    expect(filterDishKeys("zzz-no-match")).toEqual([]);
  });

  it("an empty query returns the whole list", () => {
    expect(filterDishKeys("")).toEqual([...DISH_KEYS]);
    expect(filterDishKeys("   ")).toEqual([...DISH_KEYS]);
  });

  it("edited dishes group first in the picker, and the search cuts both groups", () => {
    const seed = SEED_RECIPES.tacos;
    const store: RecipeStore = withRecipeEdit({}, {
      dish: "tacos",
      title: seed.title,
      serves: seed.serves,
      minutes: seed.minutes,
      ingredients: seed.ingredients.map((i) => ({ ...i })),
      steps: [...seed.steps],
    });
    const groups = groupDishesForPicker("", store);
    expect(groups.yours).toEqual(["tacos"]);
    expect(groups.all).not.toContain("tacos");
    expect(groups.all.length).toBe(DISH_KEYS.length - 1);
    expect(groupDishesForPicker("taco", store).yours).toEqual(["tacos"]);
    expect(groupDishesForPicker("soup", store).yours).toEqual([]);
  });
});

describe("v375 the hand-off slot — saved and unsaved events alike", () => {
  it("carries a saved event's snapshot and returns the pick exactly once", () => {
    resetRecipePickForTests();
    const token = beginRecipePick({
      eventId: "ev-dinner-1",
      title: "Dinner",
      date: "2026-10-30",
      startTime: "18:00",
      notes: "Tacos with the kids",
    });
    const request = peekRecipePickRequest(token);
    expect(request?.eventId).toBe("ev-dinner-1");
    expect(request?.notes).toBe("Tacos with the kids");
    expect(peekRecipePickRequest(token + 99)).toBeNull();

    completeRecipePick(token, "soup", notesWithDish("Tacos with the kids", "soup"));
    const result = consumeRecipePickResult(token);
    expect(result?.dish).toBe("soup");
    expect(result?.notes).toBe("Soup with the kids");
    expect(consumeRecipePickResult(token)).toBeNull();
  });

  it("a brand-new event (no id yet) hands off the same way — the dish rides back into the editor's notes state", () => {
    resetRecipePickForTests();
    const token = beginRecipePick({
      eventId: null,
      title: "Lunch",
      date: "2026-10-31",
      notes: "",
    });
    expect(peekRecipePickRequest(token)?.eventId).toBeNull();
    completeRecipePick(token, "papa-joes", notesWithDish("", "papa-joes"));
    const result = consumeRecipePickResult(token);
    expect(result?.notes).toBe("Papa Joe's");
    expect(resolveDishKeyFromNotes(result?.notes)).toBe("papa-joes");
  });

  it("a new pick supersedes an unfinished one; a cancelled pick leaves no result", () => {
    resetRecipePickForTests();
    const stale = beginRecipePick({ eventId: null, title: "Lunch", date: "2026-10-31", notes: "" });
    const live = beginRecipePick({ eventId: null, title: "Dinner", date: "2026-10-31", notes: "" });
    expect(peekRecipePickRequest(stale)).toBeNull();
    expect(peekRecipePickRequest(live)).not.toBeNull();
    cancelRecipePick(live);
    expect(peekRecipePickRequest(live)).toBeNull();
    expect(consumeRecipePickResult(live)).toBeNull();
  });

  it("cancelling never erases a completed pick", () => {
    resetRecipePickForTests();
    const token = beginRecipePick({ eventId: "ev-1", title: "Dinner", date: "2026-10-30", notes: "" });
    completeRecipePick(token, "tacos", "Tacos");
    cancelRecipePick(token);
    expect(consumeRecipePickResult(token)?.dish).toBe("tacos");
  });
});

describe("v375 the wiring — editor and Food page", () => {
  it("the editor's attached state IS the notes resolution, and the Modal hides while picking", () => {
    const form = read("components/event-edit-form.tsx");
    expect(form).toContain("resolveDishKeyFromNotes(formNotes)");
    expect(form).toContain("beginRecipePick");
    expect(form).toContain("consumeRecipePickResult");
    expect(form).toContain("visible && !pickingRecipe");
    expect(form).toContain('pathname: "/food"');
    expect(form).toContain("Pick a recipe");
    expect(form).toContain("Change");
  });

  it("the Food page's pick mode: search, Add to event, and the day-card route untouched", () => {
    const page = read("app/food.tsx");
    expect(page).toContain("Search recipes");
    expect(page).toContain("groupDishesForPicker");
    expect(page).toContain("Add to event");
    expect(page).toContain("notesWithDish");
    expect(page).toContain("completeRecipePick");
    // The day-card door keeps its own bar and its view/edit-only chooser.
    expect(page).toContain("<FinishedBar");
    expect(page).toContain("pickMode ?");
  });
});
