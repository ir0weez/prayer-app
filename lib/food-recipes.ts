/**
 * v370 — the Food door's SEED recipes (Jonathan, Oct 29: built-in
 * recipes are only the seed). One plain, short, weeknight recipe
 * per dish from his Oct 12 homecooked list — the same dishes the
 * meal card scenes know. The moment he edits a dish in the app,
 * his version is stored (lib/food.ts) and becomes canonical for
 * that dish; nothing here ever overrides an edit.
 *
 * Quantities are a home cook's shorthand ("1 lb", "2 cloves"),
 * and each ingredient carries the grocery section it is found in,
 * which is the grouping the Grocery tab wears.
 *
 * v371 (Oct 30): Papa Joe's — the Jason's Deli sandwich he used
 * to make all the time at home — joins the seeds as a full dish
 * (recipe + card artwork), in the sandwich family's seat.
 *
 * v372 (Oct 30): Loaded Shawarma-Style Chicken & Rice Bar — the
 * HelloFresh recipe he sent and chose — joins the seeds the
 * same way, in the chicken family's seat:
 * HelloFresh's own recipe for two, kept faithful, served family
 * style, with card artwork in every skin.
 */

export type RecipeGroup = "Produce" | "Meat" | "Bakery" | "Dairy" | "Frozen" | "Pantry";

/** The Grocery tab's section order. */
export const RECIPE_GROUP_ORDER: RecipeGroup[] = [
  "Produce",
  "Meat",
  "Bakery",
  "Dairy",
  "Frozen",
  "Pantry",
];

export interface RecipeIngredient {
  name: string;
  quantity: string;
  group: RecipeGroup;
}

export interface SeedRecipe {
  /** Display name of the dish ("Bean Burritos"). */
  title: string;
  serves: string;
  minutes: number;
  ingredients: RecipeIngredient[];
  steps: string[];
}

/** Every dish the Food door knows, by its store key. */
export type DishKey =
  | "soup"
  | "bean-burritos"
  | "tacos"
  | "sandwich"
  | "papa-joes"
  | "tv-dinner"
  | "pizza"
  | "grilled-cheese"
  | "mexican-pizza"
  | "pupusas"
  | "steak"
  | "tostadas"
  | "hot-wings"
  | "burgers"
  | "roast-chicken"
  | "shawarma-rice-bar"
  | "meatloaf"
  | "pot-roast"
  | "casserole"
  | "hot-dogs"
  | "nachos"
  | "quesadilla"
  | "ramen"
  | "stir-fry"
  | "fried-rice"
  | "oatmeal"
  | "cereal";

export const SEED_RECIPES: Record<DishKey, SeedRecipe> = {
  "soup": {
    title: "Soup",
    serves: "Serves 4",
    minutes: 40,
    ingredients: [
      { name: "Chicken broth", quantity: "2 cartons (32 oz)", group: "Pantry" },
      { name: "Chicken breast", quantity: "1 lb", group: "Meat" },
      { name: "Carrots", quantity: "3", group: "Produce" },
      { name: "Celery", quantity: "3 stalks", group: "Produce" },
      { name: "Yellow onion", quantity: "1", group: "Produce" },
      { name: "Egg noodles", quantity: "2 cups dry", group: "Pantry" },
      { name: "Salt & pepper", quantity: "At home", group: "Pantry" },
    ],
    steps: [
      "Dice the onion, carrots and celery; cube the chicken.",
      "Soften the vegetables in a little oil for 5 minutes.",
      "Add the broth and chicken; simmer 20 minutes.",
      "Stir in the noodles and cook until tender, about 8 minutes.",
      "Salt and pepper to taste; rest 5 minutes before serving.",
    ],
  },
  "bean-burritos": {
    title: "Bean Burritos",
    serves: "Serves 4",
    minutes: 20,
    ingredients: [
      { name: "Flour tortillas", quantity: "8 large", group: "Bakery" },
      { name: "Refried beans", quantity: "2 cans (16 oz)", group: "Pantry" },
      { name: "Mexican cheese blend", quantity: "2 cups shredded", group: "Dairy" },
      { name: "Spanish rice mix", quantity: "1 box", group: "Pantry" },
      { name: "Sour cream", quantity: "1 small tub", group: "Dairy" },
      { name: "Hot sauce", quantity: "At home", group: "Pantry" },
    ],
    steps: [
      "Cook the rice mix as the box directs.",
      "Warm the refried beans in a saucepan with a splash of water.",
      "Warm the tortillas so they fold without tearing.",
      "Fill each with beans, rice and cheese; fold the sides in and roll.",
      "Toast seam-side down in a dry pan for a minute; serve with sour cream and hot sauce.",
    ],
  },
  "tacos": {
    title: "Tacos",
    serves: "Serves 4",
    minutes: 25,
    ingredients: [
      { name: "Ground beef 80/20", quantity: "1 lb", group: "Meat" },
      { name: "Taco seasoning", quantity: "1 packet", group: "Pantry" },
      { name: "Taco shells", quantity: "12", group: "Bakery" },
      { name: "Mexican cheese blend", quantity: "2 cups shredded", group: "Dairy" },
      { name: "Lettuce", quantity: "1 head", group: "Produce" },
      { name: "Tomato", quantity: "2", group: "Produce" },
      { name: "Sour cream", quantity: "1 small tub", group: "Dairy" },
    ],
    steps: [
      "Brown the beef, breaking it up; drain the fat.",
      "Stir in the seasoning and 2/3 cup water; simmer 5 minutes.",
      "Warm the shells as the package directs.",
      "Shred the lettuce and dice the tomatoes.",
      "Fill the shells with beef, cheese, lettuce, tomato and a spoon of sour cream.",
    ],
  },
  "sandwich": {
    title: "Sandwich",
    serves: "Serves 4",
    minutes: 10,
    ingredients: [
      { name: "Sandwich bread", quantity: "8 slices", group: "Bakery" },
      { name: "Deli turkey", quantity: "3/4 lb sliced", group: "Meat" },
      { name: "Sliced cheddar", quantity: "4 slices", group: "Dairy" },
      { name: "Lettuce", quantity: "4 leaves", group: "Produce" },
      { name: "Tomato", quantity: "1", group: "Produce" },
      { name: "Mayonnaise", quantity: "At home", group: "Pantry" },
      { name: "Mustard", quantity: "At home", group: "Pantry" },
    ],
    steps: [
      "Slice the tomato; wash and dry the lettuce.",
      "Spread mayonnaise on one slice, mustard on the other.",
      "Layer turkey, cheddar, tomato and lettuce.",
      "Close, press gently, and cut on the diagonal.",
    ],
  },
  "papa-joes": {
    title: "Papa Joe's",
    serves: "Serves 2",
    minutes: 25,
    ingredients: [
      { name: "Herb focaccia bread", quantity: "2 sandwich pieces", group: "Bakery" },
      { name: "Roasted turkey breast", quantity: "8 oz, sliced", group: "Meat" },
      { name: "Asiago cheese", quantity: "4 slices", group: "Dairy" },
      { name: "Roma tomatoes", quantity: "2", group: "Produce" },
      { name: "Basil pesto", quantity: "3 tbsp", group: "Pantry" },
      { name: "Mayonnaise", quantity: "2 tbsp", group: "Pantry" },
      { name: "Olive oil", quantity: "1 tbsp", group: "Pantry" },
      { name: "Potato chips", quantity: "2 handfuls, to serve", group: "Pantry" },
      { name: "Dill pickle spears", quantity: "2, to serve", group: "Produce" },
    ],
    steps: [
      "Heat the oven to 425°F; slice the tomatoes, lay them on a lined tray, drizzle with olive oil and a pinch of salt, and roast 12–15 minutes until softened and sweet.",
      "Stir the pesto and mayo together into a pesto aioli.",
      "Split the focaccia and toast cut-side down in a dry skillet or under the broiler until golden at the edges.",
      "Spread pesto aioli on both cut sides.",
      "Layer the turkey and Asiago on the bottom halves; broil 1–2 minutes until the cheese melts and the turkey is hot.",
      "Top with the roasted tomatoes, close, press gently, and cut in half.",
      "Serve with chips and a pickle spear.",
    ],
  },
  "tv-dinner": {
    title: "TV Dinner",
    serves: "Serves 1 each",
    minutes: 8,
    ingredients: [
      { name: "Frozen dinner tray", quantity: "1 per person", group: "Frozen" },
      { name: "Frozen garlic bread", quantity: "1 box", group: "Frozen" },
      { name: "Bagged salad kit", quantity: "1 bag", group: "Produce" },
    ],
    steps: [
      "Heat the oven for the garlic bread as its box directs.",
      "Vent the film on each tray and microwave as the box directs.",
      "Rest the trays a minute — the gravy is lava.",
      "Toss the salad kit in a bowl while the bread finishes.",
      "Serve tray, bread and salad together.",
    ],
  },
  "pizza": {
    title: "Pizza",
    serves: "Serves 4",
    minutes: 30,
    ingredients: [
      { name: "Pizza dough", quantity: "1 lb ball", group: "Bakery" },
      { name: "Pizza sauce", quantity: "1 jar", group: "Pantry" },
      { name: "Mozzarella", quantity: "2 cups shredded", group: "Dairy" },
      { name: "Pepperoni", quantity: "1 pack", group: "Meat" },
      { name: "Flour (for dusting)", quantity: "At home", group: "Pantry" },
      { name: "Olive oil", quantity: "At home", group: "Pantry" },
    ],
    steps: [
      "Heat the oven to 475°F with the pan inside.",
      "Stretch the dough on a floured counter to the pan's size.",
      "Sauce to the edge, then cheese, then pepperoni.",
      "Bake 12–15 minutes, until the crust is golden and the cheese bubbles.",
      "Rest 5 minutes before slicing.",
    ],
  },
  "grilled-cheese": {
    title: "Grilled Cheese",
    serves: "Serves 4",
    minutes: 15,
    ingredients: [
      { name: "Sandwich bread", quantity: "8 slices", group: "Bakery" },
      { name: "Sliced American cheese", quantity: "8 slices", group: "Dairy" },
      { name: "Butter", quantity: "2 tbsp", group: "Dairy" },
    ],
    steps: [
      "Butter one side of every slice.",
      "Two slices of cheese between the unbuttered sides.",
      "Cook butter-side out in a pan over medium heat, 3 minutes per side, until deep golden.",
      "Rest a minute; cut on the diagonal.",
    ],
  },
  "mexican-pizza": {
    title: "Mexican Pizza",
    serves: "Serves 4",
    minutes: 30,
    ingredients: [
      { name: "Flour tortillas", quantity: "8 small", group: "Bakery" },
      { name: "Ground beef 80/20", quantity: "1/2 lb", group: "Meat" },
      { name: "Taco seasoning", quantity: "1 packet", group: "Pantry" },
      { name: "Refried beans", quantity: "1 can (16 oz)", group: "Pantry" },
      { name: "Enchilada sauce", quantity: "1 small can", group: "Pantry" },
      { name: "Mexican cheese blend", quantity: "1 1/2 cups shredded", group: "Dairy" },
      { name: "Tomato", quantity: "1, diced", group: "Produce" },
      { name: "Green onions", quantity: "2", group: "Produce" },
    ],
    steps: [
      "Crisp the tortillas in a dry pan or a 400°F oven until firm.",
      "Brown the beef with the seasoning; warm the beans.",
      "Spread beans on four tortillas, top with beef, cap with the other four.",
      "Spoon enchilada sauce over the tops; cover with cheese.",
      "Bake at 400°F for 8–10 minutes; scatter tomato and green onion over.",
    ],
  },
  "pupusas": {
    title: "Pupusas",
    serves: "Serves 4",
    minutes: 45,
    ingredients: [
      { name: "Masa harina", quantity: "2 cups", group: "Pantry" },
      { name: "Warm water", quantity: "1 1/2 cups", group: "Pantry" },
      { name: "Refried beans", quantity: "1 can (16 oz)", group: "Pantry" },
      { name: "Mozzarella", quantity: "1 1/2 cups shredded", group: "Dairy" },
      { name: "Cabbage slaw (curtido)", quantity: "1 bag or jar", group: "Produce" },
      { name: "Salsa", quantity: "1 jar", group: "Pantry" },
    ],
    steps: [
      "Stir masa, water and a pinch of salt into a soft dough; rest 10 minutes.",
      "Divide into 8 balls; flatten each into a thick disc in your palm.",
      "Spoon beans and cheese into the centre; pinch closed and pat flat again.",
      "Cook on a hot dry griddle 3–4 minutes per side, until spotted and puffed.",
      "Serve with curtido and salsa over the top.",
    ],
  },
  "steak": {
    title: "Steak",
    serves: "Serves 4",
    minutes: 30,
    ingredients: [
      { name: "Steaks (ribeye or sirloin)", quantity: "4", group: "Meat" },
      { name: "Butter", quantity: "3 tbsp", group: "Dairy" },
      { name: "Garlic", quantity: "3 cloves", group: "Produce" },
      { name: "Baked potatoes", quantity: "4", group: "Produce" },
      { name: "Salt & coarse pepper", quantity: "At home", group: "Pantry" },
    ],
    steps: [
      "Salt the steaks and let them sit out 30 minutes.",
      "Bake or microwave the potatoes until soft.",
      "Sear the steaks in a ripping-hot pan, 4 minutes per side for medium.",
      "Add butter and crushed garlic; baste for a minute.",
      "Rest 10 minutes before slicing; serve with the potatoes.",
    ],
  },
  "tostadas": {
    title: "Tostadas",
    serves: "Serves 4",
    minutes: 20,
    ingredients: [
      { name: "Tostada shells", quantity: "8", group: "Bakery" },
      { name: "Refried beans", quantity: "1 can (16 oz)", group: "Pantry" },
      { name: "Shredded chicken", quantity: "2 cups (rotisserie)", group: "Meat" },
      { name: "Lettuce", quantity: "1/2 head, shredded", group: "Produce" },
      { name: "Tomato", quantity: "1, diced", group: "Produce" },
      { name: "Queso fresco", quantity: "1/2 cup crumbled", group: "Dairy" },
      { name: "Sour cream", quantity: "1 small tub", group: "Dairy" },
    ],
    steps: [
      "Warm the beans; warm the shredded chicken in a pan.",
      "Spread beans over each shell.",
      "Top with chicken, lettuce, tomato and queso fresco.",
      "Finish with a drizzle of sour cream thinned with a little water.",
    ],
  },
  "hot-wings": {
    title: "Hot Wings",
    serves: "Serves 4",
    minutes: 50,
    ingredients: [
      { name: "Chicken wings", quantity: "3 lbs", group: "Meat" },
      { name: "Hot sauce (Frank's)", quantity: "1/2 cup", group: "Pantry" },
      { name: "Butter", quantity: "4 tbsp", group: "Dairy" },
      { name: "Baking powder", quantity: "1 tbsp", group: "Pantry" },
      { name: "Celery", quantity: "4 stalks", group: "Produce" },
      { name: "Ranch dressing", quantity: "1 bottle", group: "Pantry" },
    ],
    steps: [
      "Toss the wings with baking powder and salt; rest on a rack 15 minutes.",
      "Bake at 425°F for 40–45 minutes, turning once, until crisp.",
      "Melt the butter into the hot sauce.",
      "Toss the wings in the sauce until glossy.",
      "Serve with celery and ranch.",
    ],
  },
  "burgers": {
    title: "Burgers",
    serves: "Serves 4",
    minutes: 25,
    ingredients: [
      { name: "Burger buns", quantity: "1 pack", group: "Bakery" },
      { name: "Ground beef 80/20", quantity: "1 lb", group: "Meat" },
      { name: "American cheese slices", quantity: "1 pack", group: "Dairy" },
      { name: "Lettuce", quantity: "1 head", group: "Produce" },
      { name: "Tomato", quantity: "1", group: "Produce" },
      { name: "Red onion", quantity: "1", group: "Produce" },
      { name: "Pickles", quantity: "1 jar", group: "Pantry" },
      { name: "Ketchup", quantity: "At home", group: "Pantry" },
    ],
    steps: [
      "Season the beef with salt and pepper; form four patties, slightly wider than the buns.",
      "Grill or pan-sear 4 minutes per side; lay the cheese on for the last minute.",
      "Toast the buns face-down in the pan drippings.",
      "Sauce, lettuce, tomato, onion, pickles — stack and serve.",
    ],
  },
  "roast-chicken": {
    title: "Roast Chicken",
    serves: "Serves 4–6",
    minutes: 75,
    ingredients: [
      { name: "Whole chicken", quantity: "1 (about 4 lbs)", group: "Meat" },
      { name: "Butter", quantity: "3 tbsp, soft", group: "Dairy" },
      { name: "Lemon", quantity: "1", group: "Produce" },
      { name: "Garlic", quantity: "1 head", group: "Produce" },
      { name: "Baby potatoes", quantity: "1 1/2 lbs", group: "Produce" },
      { name: "Salt & pepper", quantity: "At home", group: "Pantry" },
    ],
    steps: [
      "Heat the oven to 425°F; halve the potatoes into a roasting pan.",
      "Rub the chicken with butter, salt and pepper; stuff with the lemon halves and garlic.",
      "Set the chicken on the potatoes; tie the legs if you like.",
      "Roast about 1 hour, until the thigh juices run clear.",
      "Rest 15 minutes before carving.",
    ],
  },
  "shawarma-rice-bar": {
    title: "Loaded Shawarma-Style Chicken & Rice Bar",
    serves: "Serves 2",
    minutes: 30,
    ingredients: [
      { name: "Chicken cutlets", quantity: "10 oz", group: "Meat" },
      { name: "Bell pepper", quantity: "1", group: "Produce" },
      { name: "Red onion", quantity: "1", group: "Produce" },
      { name: "Mini cucumber", quantity: "1", group: "Produce" },
      { name: "Tomato", quantity: "1", group: "Produce" },
      { name: "Lemon", quantity: "1", group: "Produce" },
      { name: "Jasmine rice", quantity: "¾ cup", group: "Pantry" },
      { name: "Shawarma spice blend", quantity: "1 tbsp", group: "Pantry" },
      { name: "Garlic powder", quantity: "1 tsp", group: "Pantry" },
      { name: "Olive oil", quantity: "4 tsp, plus drizzles", group: "Pantry" },
      { name: "Hummus", quantity: "4 tbsp", group: "Dairy" },
      { name: "Sour cream", quantity: "3 tbsp", group: "Dairy" },
      { name: "Feta cheese", quantity: "½ cup", group: "Dairy" },
      { name: "Butter", quantity: "1 tbsp", group: "Dairy" },
    ],
    steps: [
      "Adjust a rack to the top position and preheat the oven to 425°F; wash and dry the produce. Halve, peel and thinly slice the onion, then mince a few slices until you have 1 tbsp. Halve, core and thinly slice the bell pepper into strips; finely dice the cucumber; dice the tomato into ¼-inch pieces; quarter the lemon.",
      "In a small pot, combine the rice, 1¼ cups water and a pinch of salt; bring to a boil, cover, reduce to a low simmer and cook 15–18 minutes until tender; keep covered off the heat until serving.",
      "Toss the sliced onion and bell pepper on a baking sheet with a drizzle of oil, 1 tsp of the shawarma spice, salt and pepper; push the veggies to one side of the sheet.",
      "Pat the chicken dry and place it on the empty side of the sheet; rub with a drizzle of oil and season all over with the remaining shawarma spice, salt and pepper. Roast on the top rack 15–20 minutes, until the chicken is cooked through (165°) and the veggies are tender.",
      "In a medium bowl, combine the cucumber, tomato, minced onion, ½ tsp garlic powder and the juice from one lemon wedge; add a drizzle of olive oil, season with salt and pepper, and stir.",
      "In a small bowl, combine the hummus, the remaining garlic powder, 1 tbsp olive oil and the juice from one lemon wedge, thinning with water 1 tsp at a time to a drizzling consistency; season with salt and pepper. Put the sour cream in a separate small bowl, thin the same way, and season with salt.",
      "Fluff the rice with a fork and stir in 1 tbsp butter; slice the chicken crosswise. Serve everything family style — chicken, rice, veggies, tomato-cuke salad, hummus, crema, feta and the remaining lemon wedges — and let everyone build their own bowl.",
    ],
  },
  "meatloaf": {
    title: "Meatloaf",
    serves: "Serves 6",
    minutes: 70,
    ingredients: [
      { name: "Ground beef 80/20", quantity: "2 lbs", group: "Meat" },
      { name: "Breadcrumbs", quantity: "3/4 cup", group: "Pantry" },
      { name: "Eggs", quantity: "2", group: "Dairy" },
      { name: "Milk", quantity: "1/2 cup", group: "Dairy" },
      { name: "Yellow onion", quantity: "1, finely diced", group: "Produce" },
      { name: "Ketchup", quantity: "1/2 cup, plus more for the top", group: "Pantry" },
    ],
    steps: [
      "Heat the oven to 350°F.",
      "Mix everything but the topping ketchup, gently — overworking makes it dense.",
      "Shape into a loaf in a baking dish; spread ketchup over the top.",
      "Bake about 1 hour, until the centre reads 160°F.",
      "Rest 10 minutes before slicing.",
    ],
  },
  "pot-roast": {
    title: "Pot Roast",
    serves: "Serves 6",
    minutes: 210,
    ingredients: [
      { name: "Beef chuck roast", quantity: "3 lbs", group: "Meat" },
      { name: "Baby potatoes", quantity: "1 1/2 lbs", group: "Produce" },
      { name: "Carrots", quantity: "4, in chunks", group: "Produce" },
      { name: "Yellow onion", quantity: "1, quartered", group: "Produce" },
      { name: "Beef broth", quantity: "2 cups", group: "Pantry" },
      { name: "Salt, pepper & garlic powder", quantity: "At home", group: "Pantry" },
    ],
    steps: [
      "Season the roast all over; sear in a hot pot until browned on both sides.",
      "Add broth, onion, carrots and potatoes around the meat.",
      "Cover and cook low — 300°F oven for about 3 hours, until it falls apart.",
      "Rest 15 minutes; pull into chunks.",
      "Serve with the vegetables and pan juices over everything.",
    ],
  },
  "casserole": {
    title: "Casserole",
    serves: "Serves 6",
    minutes: 55,
    ingredients: [
      { name: "Chicken breast", quantity: "1 1/2 lbs, cubed", group: "Meat" },
      { name: "Long-grain rice", quantity: "1 1/2 cups uncooked", group: "Pantry" },
      { name: "Cream of chicken soup", quantity: "2 cans", group: "Pantry" },
      { name: "Frozen peas & carrots", quantity: "2 cups", group: "Frozen" },
      { name: "Cheddar", quantity: "1 1/2 cups shredded", group: "Dairy" },
      { name: "Chicken broth", quantity: "2 1/2 cups", group: "Pantry" },
    ],
    steps: [
      "Heat the oven to 375°F; grease a 9×13 dish.",
      "Stir rice, broth and soup together in the dish.",
      "Fold in the chicken and the frozen vegetables; cover tightly with foil.",
      "Bake 45 minutes, until the rice is tender.",
      "Uncover, scatter the cheddar, and bake 5 more minutes.",
    ],
  },
  "hot-dogs": {
    title: "Hot Dogs",
    serves: "Serves 4",
    minutes: 15,
    ingredients: [
      { name: "Hot dogs", quantity: "8", group: "Meat" },
      { name: "Hot dog buns", quantity: "1 pack", group: "Bakery" },
      { name: "Ketchup", quantity: "At home", group: "Pantry" },
      { name: "Mustard", quantity: "At home", group: "Pantry" },
      { name: "Relish", quantity: "1 jar", group: "Pantry" },
      { name: "Yellow onion", quantity: "1/2, diced fine", group: "Produce" },
    ],
    steps: [
      "Grill or pan-fry the dogs until blistered all over.",
      "Warm the buns over the heat for a minute.",
      "Dog in bun; ketchup, mustard, relish and onion to taste.",
    ],
  },
  "nachos": {
    title: "Nachos",
    serves: "Serves 4",
    minutes: 20,
    ingredients: [
      { name: "Tortilla chips", quantity: "1 big bag", group: "Pantry" },
      { name: "Mexican cheese blend", quantity: "3 cups shredded", group: "Dairy" },
      { name: "Black beans", quantity: "1 can, drained", group: "Pantry" },
      { name: "Jalapeños", quantity: "1 jar, sliced", group: "Pantry" },
      { name: "Tomato", quantity: "1, diced", group: "Produce" },
      { name: "Sour cream", quantity: "1 small tub", group: "Dairy" },
      { name: "Salsa", quantity: "1 jar", group: "Pantry" },
    ],
    steps: [
      "Heat the oven to 400°F; line a sheet pan.",
      "Spread chips in one layer; scatter beans over.",
      "Cover generously with cheese and jalapeños.",
      "Bake 8–10 minutes, until the cheese is fully melted.",
      "Top with tomato; serve with sour cream and salsa.",
    ],
  },
  "quesadilla": {
    title: "Quesadilla",
    serves: "Serves 4",
    minutes: 15,
    ingredients: [
      { name: "Flour tortillas", quantity: "8 large", group: "Bakery" },
      { name: "Mexican cheese blend", quantity: "3 cups shredded", group: "Dairy" },
      { name: "Butter or oil", quantity: "At home", group: "Pantry" },
      { name: "Salsa", quantity: "1 jar", group: "Pantry" },
      { name: "Sour cream", quantity: "1 small tub", group: "Dairy" },
    ],
    steps: [
      "Cheese over half of each tortilla; fold in half.",
      "Cook in a lightly buttered pan over medium heat, 2–3 minutes per side, until crisp and melted.",
      "Rest a minute; cut into wedges.",
      "Serve with salsa and sour cream.",
    ],
  },
  "ramen": {
    title: "Ramen",
    serves: "Serves 2",
    minutes: 20,
    ingredients: [
      { name: "Ramen noodle packs", quantity: "2", group: "Pantry" },
      { name: "Eggs", quantity: "2", group: "Dairy" },
      { name: "Green onions", quantity: "3", group: "Produce" },
      { name: "Frozen corn", quantity: "1/2 cup", group: "Frozen" },
      { name: "Soy sauce", quantity: "At home", group: "Pantry" },
      { name: "Hot sauce", quantity: "At home", group: "Pantry" },
    ],
    steps: [
      "Soft-boil the eggs 6 1/2 minutes; cool in cold water and peel.",
      "Cook the noodles in their broth with the corn stirred in.",
      "Slice the green onions.",
      "Bowl the noodles and broth; halve the eggs on top; scatter green onion.",
      "Soy sauce and hot sauce at the table.",
    ],
  },
  "stir-fry": {
    title: "Stir Fry",
    serves: "Serves 4",
    minutes: 30,
    ingredients: [
      { name: "Chicken breast", quantity: "1 lb, sliced thin", group: "Meat" },
      { name: "Frozen stir-fry vegetables", quantity: "1 big bag", group: "Frozen" },
      { name: "Soy sauce", quantity: "1/4 cup", group: "Pantry" },
      { name: "Garlic", quantity: "3 cloves, minced", group: "Produce" },
      { name: "Rice", quantity: "2 cups uncooked", group: "Pantry" },
      { name: "Cornstarch", quantity: "1 tbsp", group: "Pantry" },
    ],
    steps: [
      "Start the rice.",
      "Sear the chicken in a hot oiled wok until cooked through; set aside.",
      "Stir-fry the vegetables until crisp-tender; add the garlic for the last minute.",
      "Return the chicken; pour in soy sauce with the cornstarch stirred into 1/4 cup water.",
      "Toss until the sauce glazes everything; serve over rice.",
    ],
  },
  "fried-rice": {
    title: "Fried Rice",
    serves: "Serves 4",
    minutes: 20,
    ingredients: [
      { name: "Cooked rice, day-old", quantity: "4 cups", group: "Pantry" },
      { name: "Eggs", quantity: "3", group: "Dairy" },
      { name: "Frozen peas & carrots", quantity: "1 1/2 cups", group: "Frozen" },
      { name: "Green onions", quantity: "4", group: "Produce" },
      { name: "Soy sauce", quantity: "3 tbsp", group: "Pantry" },
      { name: "Sesame oil", quantity: "1 tsp", group: "Pantry" },
    ],
    steps: [
      "Scramble the eggs in a hot wok; set aside.",
      "Fry the rice, breaking up clumps, until it crisps at the edges.",
      "Add peas and carrots; cook until hot through.",
      "Fold the eggs back in with the soy sauce and sesame oil.",
      "Scatter green onions over and serve.",
    ],
  },
  "oatmeal": {
    title: "Oatmeal",
    serves: "Serves 2",
    minutes: 10,
    ingredients: [
      { name: "Rolled oats", quantity: "1 cup", group: "Pantry" },
      { name: "Milk or water", quantity: "2 cups", group: "Dairy" },
      { name: "Brown sugar", quantity: "2 tbsp", group: "Pantry" },
      { name: "Banana", quantity: "1", group: "Produce" },
      { name: "Cinnamon", quantity: "At home", group: "Pantry" },
    ],
    steps: [
      "Bring the milk (or water) to a simmer with a pinch of salt.",
      "Stir in the oats; cook 5 minutes, stirring now and then.",
      "Rest a minute off the heat to thicken.",
      "Serve with brown sugar, sliced banana and cinnamon.",
    ],
  },
  "cereal": {
    title: "Cereal",
    serves: "Serves 1 each",
    minutes: 2,
    ingredients: [
      { name: "Cereal", quantity: "1 box", group: "Pantry" },
      { name: "Milk", quantity: "1/2 gallon", group: "Dairy" },
      { name: "Banana", quantity: "1", group: "Produce" },
    ],
    steps: [
      "Cereal in the bowl first, then the milk.",
      "Slice the banana over the top if you like.",
      "Eat before it goes soggy.",
    ],
  },
};

/** The seeded dishes, in chooser order: his Oct 12 list order. */
export const DISH_KEYS: DishKey[] = [
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
];
