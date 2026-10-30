/**
 * v370 — the Food page (Jonathan, designed and picked Oct 29,
 * built Oct 30). A Meal schedule event is a door, like News and
 * Email: tapping its day card lands here with the event's id in
 * the params, and the Finished bar at the foot of the page is
 * that event's check-off.
 *
 * Two tabs, his Concept A2: Groceries | Recipe. The dish comes
 * from the event's notes (lib/food.ts, the Oct 12 matcher); an
 * event that names no dish opens on the dish chooser, and
 * choosing there is view/edit only — nothing is written back
 * into the event's notes.
 *
 * Recipes are editable in place; an edit is stored and becomes
 * the canonical recipe for that dish (the seed never overrides
 * it). Prices, when the page shows any, come only from the
 * price book store (prayercircle.price-book.v1) — the app never
 * invents one.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { FinishedBar, KeywordPageHeader } from "@/components/keyword-page-chrome";
import { useNewsEmailMaterial } from "@/hooks/use-news-email-material";
import {
  DISH_KEYS,
  SEED_RECIPES,
  formatCents,
  groceryStateKey,
  groceryTotals,
  groupIngredients,
  ingredientKeyFor,
  isEditedDish,
  loadGroceryChecks,
  loadPriceBook,
  loadRecipeStore,
  loadScheduleEventById,
  priceForIngredient,
  recipeForDish,
  resolveDishForEvent,
  saveGroceryChecks,
  saveRecipeStore,
  toggleCheckedIngredient,
  withRecipeEdit,
  type DishKey,
  type GroceryChecks,
  type PriceBook,
  type Recipe,
  type RecipeStore,
} from "@/lib/food";
import { finishScheduleEvent } from "@/lib/finish-event";
import type { ScheduleEvent } from "@/lib/schedule-data";
import { format12HourTime } from "@/lib/utils";

type FoodTab = "groceries" | "recipe";

interface DraftIngredient {
  name: string;
  quantity: string;
  group: Recipe["ingredients"][number]["group"];
}

export default function FoodPage() {
  const m = useNewsEmailMaterial();
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId?: string; eventDate?: string }>();
  const eventId = typeof params.eventId === "string" && params.eventId ? params.eventId : null;

  // undefined = still reading the stores; null = no such event.
  const [event, setEvent] = useState<ScheduleEvent | null | undefined>(undefined);
  const [recipeStore, setRecipeStore] = useState<RecipeStore>({});
  const [priceBook, setPriceBook] = useState<PriceBook>({});
  const [checks, setChecks] = useState<GroceryChecks>({});
  const [tab, setTab] = useState<FoodTab>("recipe");
  const [chosenDish, setChosenDish] = useState<DishKey | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftIngredients, setDraftIngredients] = useState<DraftIngredient[]>([]);
  const [draftSteps, setDraftSteps] = useState<string[]>([]);

  useEffect(() => {
    let live = true;
    Promise.all([
      eventId ? loadScheduleEventById(eventId) : Promise.resolve(null),
      loadRecipeStore(),
      loadPriceBook(),
      loadGroceryChecks(),
    ]).then(([loadedEvent, recipes, book, groceryChecks]) => {
      if (!live) return;
      setEvent(loadedEvent);
      setRecipeStore(recipes);
      setPriceBook(book);
      setChecks(groceryChecks);
    });
    return () => {
      live = false;
    };
  }, [eventId]);

  const onFinished = useCallback(async () => {
    if (eventId) await finishScheduleEvent(eventId);
    router.back();
  }, [eventId, router]);

  const resolvedDish = event ? resolveDishForEvent(event) : null;
  const dishKey: DishKey | null = chosenDish ?? resolvedDish;
  const showChooser = browsing || dishKey === null;
  const recipe: Recipe | null =
    !showChooser && dishKey ? recipeForDish(dishKey, recipeStore) : null;

  const checksKey = dishKey ? groceryStateKey(eventId ?? "door", dishKey) : null;
  const checkedList: string[] = checksKey ? (checks[checksKey] ?? []) : [];

  const toggleIngredient = useCallback(
    (name: string) => {
      if (!checksKey) return;
      setChecks((prev) => {
        const next: GroceryChecks = {
          ...prev,
          [checksKey]: toggleCheckedIngredient(prev[checksKey] ?? [], name),
        };
        void saveGroceryChecks(next);
        return next;
      });
    },
    [checksKey],
  );

  const startEditing = useCallback(() => {
    if (!recipe) return;
    setDraftIngredients(recipe.ingredients.map((ing) => ({ ...ing })));
    setDraftSteps([...recipe.steps]);
    setEditing(true);
  }, [recipe]);

  const saveEditing = useCallback(() => {
    if (!recipe) return;
    const ingredients = draftIngredients
      .map((ing) => ({ ...ing, name: ing.name.trim(), quantity: ing.quantity.trim() }))
      .filter((ing) => ing.name.length > 0);
    const steps = draftSteps.map((step) => step.trim()).filter((step) => step.length > 0);
    if (ingredients.length === 0 || steps.length === 0) return;
    const nextRecipe: Recipe = {
      dish: recipe.dish,
      title: recipe.title,
      serves: recipe.serves,
      minutes: recipe.minutes,
      ingredients,
      steps,
    };
    const nextStore = withRecipeEdit(recipeStore, nextRecipe);
    setRecipeStore(nextStore);
    void saveRecipeStore(nextStore);
    setEditing(false);
  }, [recipe, draftIngredients, draftSteps, recipeStore]);

  const pickDish = useCallback((dish: DishKey) => {
    setChosenDish(dish);
    setBrowsing(false);
    setEditing(false);
  }, []);

  const today = new Date();
  const chipDate = event
    ? new Date(`${event.date}T12:00:00`)
    : today;
  const dateChip = chipDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const whenLine = event
    ? `for ${chipDate.toLocaleDateString("en-US", { weekday: "long" })}${event.startTime ? ` ${format12HourTime(event.startTime)}` : ""}`
    : "";

  const totals = recipe ? groceryTotals(recipe, priceBook, checkedList) : null;
  const groups = recipe ? groupIngredients(recipe) : [];

  return (
    <ScreenContainer className="p-0">
      <View style={{ flex: 1, backgroundColor: m.ground }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: eventId ? 112 : 40,
          }}
        >
          <KeywordPageHeader
            m={m}
            title={event?.title ?? "Food"}
            dateChip={dateChip}
            onBack={() => router.back()}
          />
          {whenLine ? (
            <Text style={[styles.when, { color: m.inkSoft }]}>{whenLine}</Text>
          ) : null}

          {event === undefined ? (
            <Text style={[styles.quiet, { color: m.inkSoft }]}>Opening the kitchen…</Text>
          ) : showChooser ? (
            <>
              <Text style={[styles.h1, { color: m.ink }]}>Recipes</Text>
              <View style={[styles.card, { backgroundColor: m.card }]}>
                {DISH_KEYS.map((dish, index) => {
                  const seed = SEED_RECIPES[dish];
                  return (
                    <Pressable
                      key={dish}
                      onPress={() => pickDish(dish)}
                      accessibilityRole="button"
                      accessibilityLabel={seed.title}
                      style={[
                        styles.dishRow,
                        index > 0 && { borderTopWidth: 1, borderTopColor: m.line },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.dishName, { color: m.ink }]}>{seed.title}</Text>
                        <Text style={[styles.dishFacts, { color: m.inkSoft }]}>
                          {seed.serves} · ~{seed.minutes} min
                          {isEditedDish(dish, recipeStore) ? " · your version" : ""}
                        </Text>
                      </View>
                      <MaterialIcons name="chevron-right" size={20} color={m.inkSoft} />
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : recipe ? (
            <>
              <Text style={[styles.h1, { color: m.ink }]}>{recipe.title}</Text>

              <View style={[styles.tabs, { backgroundColor: m.tonal }]}>
                {(["groceries", "recipe"] as FoodTab[]).map((key) => {
                  const active = tab === key;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => setTab(key)}
                      accessibilityRole="button"
                      accessibilityLabel={key === "groceries" ? "Groceries" : "Recipe"}
                      style={[
                        styles.tab,
                        active && { backgroundColor: m.seed },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tabText,
                          { color: active ? m.onSeed : m.deep },
                        ]}
                      >
                        {key === "groceries" ? "Groceries" : "Recipe"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {tab === "recipe" ? (
                <>
                  {!editing ? (
                    <>
                      <View style={[styles.card, { backgroundColor: m.card }]}>
                        <View style={styles.ingGrid}>
                          {recipe.ingredients.map((ing) => (
                            <View key={ingredientKeyFor(ing.name)} style={styles.ingItem}>
                              <Text style={[styles.tick, { color: m.deep }]}>✓</Text>
                              <Text style={[styles.ingText, { color: m.ink }]}>
                                {ing.name}
                                {ing.quantity ? (
                                  <Text style={{ color: m.inkSoft }}> · {ing.quantity}</Text>
                                ) : null}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                      <Text style={[styles.facts, { color: m.inkSoft }]}>
                        {recipe.serves} · ~{recipe.minutes} min
                      </Text>
                      <View style={[styles.card, { backgroundColor: m.card, paddingVertical: 6 }]}>
                        {recipe.steps.map((step, index) => (
                          <View
                            key={index}
                            style={[
                              styles.stepRow,
                              index > 0 && { borderTopWidth: 1, borderTopColor: m.line },
                            ]}
                          >
                            <View style={[styles.stepNum, { backgroundColor: m.tonal }]}>
                              <Text style={[styles.stepNumText, { color: m.deep }]}>
                                {index + 1}
                              </Text>
                            </View>
                            <Text style={[styles.stepText, { color: m.ink }]}>{step}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  ) : null}
                  {editing ? (
                    <View style={[styles.card, { backgroundColor: m.card }]}>
                      <Text style={[styles.editHead, { color: m.ink }]}>Ingredients</Text>
                      {draftIngredients.map((ing, index) => (
                        <View key={index} style={styles.editRow}>
                          <TextInput
                            value={ing.name}
                            onChangeText={(text) =>
                              setDraftIngredients((prev) =>
                                prev.map((row, i) => (i === index ? { ...row, name: text } : row)),
                              )
                            }
                            placeholder="Ingredient"
                            placeholderTextColor={m.inkSoft}
                            style={[styles.input, { color: m.ink, borderColor: m.line }]}
                          />
                          <TextInput
                            value={ing.quantity}
                            onChangeText={(text) =>
                              setDraftIngredients((prev) =>
                                prev.map((row, i) => (i === index ? { ...row, quantity: text } : row)),
                              )
                            }
                            placeholder="How much"
                            placeholderTextColor={m.inkSoft}
                            style={[styles.inputQty, { color: m.ink, borderColor: m.line }]}
                          />
                          <Pressable
                            onPress={() =>
                              setDraftIngredients((prev) => prev.filter((_, i) => i !== index))
                            }
                            accessibilityRole="button"
                            accessibilityLabel="Remove ingredient"
                            style={styles.removeBtn}
                          >
                            <MaterialIcons name="close" size={18} color={m.inkSoft} />
                          </Pressable>
                        </View>
                      ))}
                      <Pressable
                        onPress={() =>
                          setDraftIngredients((prev) => [
                            ...prev,
                            { name: "", quantity: "", group: "Pantry" },
                          ])
                        }
                        accessibilityRole="button"
                        accessibilityLabel="Add ingredient"
                        style={styles.addRow}
                      >
                        <MaterialIcons name="add" size={18} color={m.deep} />
                        <Text style={[styles.addText, { color: m.deep }]}>Add ingredient</Text>
                      </Pressable>
                      <Text style={[styles.editHead, { color: m.ink, marginTop: 14 }]}>Steps</Text>
                      {draftSteps.map((step, index) => (
                        <View key={index} style={styles.editRow}>
                          <Text style={[styles.stepIndex, { color: m.inkSoft }]}>
                            {index + 1}
                          </Text>
                          <TextInput
                            value={step}
                            onChangeText={(text) =>
                              setDraftSteps((prev) =>
                                prev.map((row, i) => (i === index ? text : row)),
                              )
                            }
                            placeholder="Step"
                            placeholderTextColor={m.inkSoft}
                            multiline
                            style={[styles.input, { color: m.ink, borderColor: m.line }]}
                          />
                          <Pressable
                            onPress={() =>
                              setDraftSteps((prev) => prev.filter((_, i) => i !== index))
                            }
                            accessibilityRole="button"
                            accessibilityLabel="Remove step"
                            style={styles.removeBtn}
                          >
                            <MaterialIcons name="close" size={18} color={m.inkSoft} />
                          </Pressable>
                        </View>
                      ))}
                      <Pressable
                        onPress={() => setDraftSteps((prev) => [...prev, ""])}
                        accessibilityRole="button"
                        accessibilityLabel="Add step"
                        style={styles.addRow}
                      >
                        <MaterialIcons name="add" size={18} color={m.deep} />
                        <Text style={[styles.addText, { color: m.deep }]}>Add step</Text>
                      </Pressable>
                      <View style={styles.editActions}>
                        <Pressable
                          onPress={() => setEditing(false)}
                          accessibilityRole="button"
                          accessibilityLabel="Cancel editing"
                          style={[styles.cancelBtn, { backgroundColor: m.tonal }]}
                        >
                          <Text style={[styles.cancelText, { color: m.tonalInk }]}>Cancel</Text>
                        </Pressable>
                        <Pressable
                          onPress={saveEditing}
                          accessibilityRole="button"
                          accessibilityLabel="Save recipe"
                          style={[styles.saveBtn, { backgroundColor: m.seed }]}
                        >
                          <Text style={[styles.saveText, { color: m.onSeed }]}>Save recipe</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.recipeActions}>
                      <Pressable
                        onPress={startEditing}
                        accessibilityRole="button"
                        accessibilityLabel="Edit recipe"
                        style={[styles.editBtn, { backgroundColor: m.tonal }]}
                      >
                        <MaterialIcons name="edit" size={15} color={m.tonalInk} />
                        <Text style={[styles.editBtnText, { color: m.tonalInk }]}>
                          Edit recipe
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setBrowsing(true)}
                        accessibilityRole="button"
                        accessibilityLabel="All dishes"
                        style={styles.allDishesBtn}
                      >
                        <Text style={[styles.allDishesText, { color: m.deep }]}>
                          All dishes
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </>
              ) : totals ? (
                <>
                  <View style={[styles.totalCard, { backgroundColor: m.openBox }]}>
                    {totals.pricedCount > 0 ? (
                      <>
                        <Text style={[styles.totalLabel, { color: m.openInkSoft }]}>
                          Left to spend
                        </Text>
                        <Text style={[styles.totalNum, { color: m.openInk }]}>
                          {formatCents(totals.remainingCents)}
                        </Text>
                        <Text style={[styles.totalOf, { color: m.openInkSoft }]}>
                          of {formatCents(totals.totalCents)} total ·{" "}
                          {formatCents(totals.spentCents)} in the cart
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={[styles.totalNum, { color: m.openInk }]}>
                          {totals.itemCount - totals.checkedCount}
                        </Text>
                        <Text style={[styles.totalOf, { color: m.openInkSoft }]}>
                          of {totals.itemCount} items · {totals.checkedCount} in the cart
                        </Text>
                      </>
                    )}
                    <View style={[styles.thread, { backgroundColor: m.card }]}>
                      <View
                        style={[
                          styles.threadFill,
                          {
                            backgroundColor: m.seed,
                            width: `${Math.round(totals.progress * 100)}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  {groups.map((group) => (
                    <View key={group.group}>
                      <Text style={[styles.sectHead, { color: m.deep }]}>
                        {group.group}
                      </Text>
                      <View style={[styles.card, { backgroundColor: m.card, marginTop: 6 }]}>
                        {group.ingredients.map((ing, index) => {
                          const key = ingredientKeyFor(ing.name);
                          const done = checkedList.includes(key);
                          const entry = priceForIngredient(priceBook, ing.name);
                          return (
                            <Pressable
                              key={key}
                              onPress={() => toggleIngredient(ing.name)}
                              accessibilityRole="checkbox"
                              accessibilityLabel={ing.name}
                              accessibilityState={{ checked: done }}
                              style={[
                                styles.grocRow,
                                index > 0 && { borderTopWidth: 1, borderTopColor: m.line },
                              ]}
                            >
                              <View
                                style={[
                                  styles.box,
                                  {
                                    borderColor: done ? m.seed : m.inkSoft,
                                    backgroundColor: done ? m.seed : "transparent",
                                  },
                                ]}
                              >
                                {done ? (
                                  <MaterialIcons name="check" size={16} color={m.onSeed} />
                                ) : null}
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={[
                                    styles.grocName,
                                    { color: done ? m.inkSoft : m.ink },
                                    done && styles.grocDone,
                                  ]}
                                >
                                  {ing.name}
                                </Text>
                                {ing.quantity ? (
                                  <Text style={[styles.grocQty, { color: m.inkSoft }]}>
                                    {ing.quantity}
                                  </Text>
                                ) : null}
                              </View>
                              {entry ? (
                                <View style={styles.priceCol}>
                                  <Text style={[styles.priceAmt, { color: m.ink }]}>
                                    {formatCents(Math.round(entry.price * 100))}
                                  </Text>
                                  {entry.store ? (
                                    <Text style={[styles.priceStore, { color: m.inkSoft }]}>
                                      {entry.store}
                                    </Text>
                                  ) : null}
                                </View>
                              ) : null}
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </View>
      {eventId ? <FinishedBar m={m} onFinished={onFinished} /> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  when: { fontSize: 13.5, fontWeight: "600", marginTop: 14 },
  quiet: { fontSize: 13.5, marginTop: 28 },
  h1: { fontSize: 27, fontWeight: "800", marginTop: 10, letterSpacing: -0.3 },
  card: { borderRadius: 24, marginTop: 14, paddingHorizontal: 16, paddingVertical: 10 },
  dishRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
  },
  dishName: { fontSize: 15.5, fontWeight: "600" },
  dishFacts: { fontSize: 12.5, marginTop: 2, fontWeight: "600" },
  tabs: {
    flexDirection: "row",
    borderRadius: 999,
    padding: 4,
    gap: 4,
    marginTop: 14,
  },
  tab: {
    flex: 1,
    height: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: { fontSize: 14.5, fontWeight: "700" },
  ingGrid: { flexDirection: "row", flexWrap: "wrap" },
  ingItem: {
    width: "50%",
    flexDirection: "row",
    alignItems: "baseline",
    gap: 7,
    paddingVertical: 5,
    paddingRight: 10,
  },
  tick: { fontSize: 13, fontWeight: "800" },
  ingText: { fontSize: 13.5, fontWeight: "600", lineHeight: 19, flex: 1 },
  facts: { fontSize: 12.5, fontWeight: "600", marginTop: 14, paddingHorizontal: 4 },
  stepRow: { flexDirection: "row", gap: 12, paddingVertical: 10, alignItems: "flex-start" },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepNumText: { fontSize: 13, fontWeight: "800" },
  stepText: { fontSize: 15, lineHeight: 22, flex: 1 },
  recipeActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  editBtnText: { fontSize: 13.5, fontWeight: "700" },
  allDishesBtn: { paddingHorizontal: 8, paddingVertical: 9 },
  allDishesText: { fontSize: 13.5, fontWeight: "700" },
  editHead: { fontSize: 14, fontWeight: "800", marginTop: 6, marginBottom: 4 },
  editRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  inputQty: {
    width: 96,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  removeBtn: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  stepIndex: { width: 16, textAlign: "center", fontWeight: "700", fontSize: 13 },
  addRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8 },
  addText: { fontSize: 14, fontWeight: "700" },
  editActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelText: { fontSize: 14.5, fontWeight: "700" },
  saveBtn: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveText: { fontSize: 14.5, fontWeight: "800" },
  totalCard: { borderRadius: 24, marginTop: 14, padding: 20 },
  totalLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  totalNum: { fontSize: 42, fontWeight: "800", letterSpacing: -0.5, marginTop: 4 },
  totalOf: { fontSize: 13, fontWeight: "600", marginTop: 4 },
  thread: { height: 6, borderRadius: 3, marginTop: 14, overflow: "hidden" },
  threadFill: { height: "100%", borderRadius: 3 },
  sectHead: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 18,
    paddingHorizontal: 4,
  },
  grocRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11 },
  box: {
    width: 25,
    height: 25,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  grocName: { fontSize: 15.5, fontWeight: "600" },
  grocDone: { textDecorationLine: "line-through" },
  grocQty: { fontSize: 12.5, marginTop: 2 },
  priceCol: { alignItems: "flex-end" },
  priceAmt: { fontSize: 15.5, fontWeight: "700" },
  priceStore: { fontSize: 11, fontWeight: "600", marginTop: 2 },
});
