// Paper keyword routing (v174, completed in v176) — the pure half of
// the schedule's theme-adaptive keyword art. Under the Paper skin, the
// schedule asks this module which paper rendition a card's keyword
// gets; components/paper-keyword-scenes.tsx turns the id into
// cut-paper artwork. Under Classic this is never consulted and the
// original scenes render byte-for-byte as before.
//
// v176 completes the coverage v174 started: the routing below mirrors
// KeywordAmbientAnimation's dispatch in schedule-tab.tsx EXACTLY —
// same order, same match tables, same context guards — so the paper
// rendition is always the paper version of the very scene Classic
// would have shown. If Classic renders a scene, Paper renders its
// paper rendition; the id is null only where Classic renders nothing.

/** Every scene id the paper renderer knows. */
export type PaperSceneId = string;

type MatchEntry = { id: PaperSceneId; names: string[] };

function firstMatch(text: string, entries: MatchEntry[]): PaperSceneId | null {
  for (const entry of entries) {
    if (entry.names.some((n) => text.includes(n))) return entry.id;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Meal sub-dispatch — mirrors detectHomecookedMeal (notes first),     */
/* then detectRestaurantScene (location), then the meal in the title.  */
/* ------------------------------------------------------------------ */

const HOMECOOKED: MatchEntry[] = [
  { id: "td-tv-dinner", names: ["tv dinner", "frozen meal", "microwave meal", "hungry man", "lean cuisine"] },
  { id: "td-burrito", names: ["burrito"] },
  { id: "td-tostadas", names: ["tostada", "tostadas"] },
  { id: "td-tacos", names: ["taco"] },
  { id: "td-pizza", names: ["pizza"] },
  { id: "td-sandwich", names: ["sandwich", "panini", "grilled cheese"] },
  { id: "td-salad", names: ["salad"] },
  { id: "td-pasta", names: ["pasta", "spaghetti", "lasagna", "mac and cheese", "mac n cheese"] },
  { id: "td-pancakes", names: ["pancake", "waffle", "french toast"] },
  { id: "td-soup", names: ["soup", "stew", "chili", "chowder"] },
  { id: "td-eggs", names: ["omelet", "omelette", "scrambled", "fried egg", "eggs"] },
  { id: "td-mexican-pizza", names: ["mexican pizza"] },
  { id: "td-pupusas", names: ["pupusa", "pupusas"] },
  { id: "td-steak", names: ["steak", "ribeye", "filet", "sirloin"] },
  { id: "td-burger", names: ["burger", "hamburger", "cheeseburger"] },
  { id: "td-roast-chicken", names: ["roast chicken", "rotisserie chicken", "baked chicken"] },
  { id: "td-meatloaf", names: ["meatloaf"] },
  { id: "td-pot-roast", names: ["pot roast", "roast beef"] },
  { id: "td-casserole", names: ["casserole", "baked ziti", "hotdish"] },
  { id: "td-hot-dog", names: ["hot dog", "hotdog", "corn dog"] },
  { id: "td-nachos", names: ["nachos"] },
  { id: "td-quesadilla", names: ["quesadilla"] },
  { id: "td-hot-wings", names: ["hot wings", "buffalo wings", "wings"] },
  { id: "td-ramen", names: ["ramen", "pho"] },
  { id: "td-stir-fry", names: ["stir fry", "stir-fry"] },
  { id: "td-fried-rice", names: ["fried rice"] },
  { id: "td-oatmeal", names: ["oatmeal", "porridge"] },
  { id: "td-cereal", names: ["cereal"] },
];

const RESTAURANTS: MatchEntry[] = [
  { id: "rest-taco", names: ["taco bell", "del taco", "chipotle", "qdoba", "baja fresh"] },
  { id: "rest-sandwich", names: ["subway", "panera", "jersey mike", "jimmy john", "firehouse sub", "quiznos"] },
  { id: "rest-pizza", names: ["pizza hut", "domino", "little caesar", "papa john", "round table", "mod pizza"] },
  { id: "rest-chicken", names: ["kfc", "chick-fil-a", "chick fil a", "popeyes", "raising cane", "canes", "wingstop", "church's chicken"] },
  { id: "rest-donut", names: ["krispy kreme", "donut"] },
  { id: "rest-coffee", names: ["starbucks", "dunkin", "peet", "coffee bean", "dutch bros", "coffee"] },
  { id: "rest-sushi", names: ["sushi", "poke", "benihana", "raw fish"] },
  { id: "rest-chinese", names: ["panda express", "p.f. chang", "pf chang", "chinese"] },
  { id: "rest-diner", names: ["ihop", "denny", "black bear", "diner"] },
  { id: "rest-dessert", names: ["baskin", "dairy queen", "cold stone", "ice cream", "frozen yogurt", "yogurtland", "menchie"] },
  { id: "rest-italian", names: ["olive garden", "fazoli", "italian", "pasta", "macaroni grill", "carrabba"] },
  { id: "rest-seafood", names: ["red lobster", "long john", "seafood", "joe's crab", "captain d"] },
  { id: "rest-healthy", names: ["sweetgreen", "jamba", "nekter", "salad", "smoothie"] },
  { id: "rest-indian", names: ["indian", "curry"] },
  { id: "bbq", names: ["dickey", "famous dave", "lucille", "bbq", "barbecue", "smokehouse"] },
  { id: "lunch", names: ["mcdonald", "in-n-out", "in n out", "burger king", "wendy", "five guys", "shake shack", "carl's jr", "carls jr", "jack in the box", "sonic", "habit burger"] },
];

function mealSceneId(title: string, location: string, notes: string): PaperSceneId {
  const homecooked = firstMatch(notes.toLowerCase(), HOMECOOKED);
  if (homecooked) return homecooked;
  const restaurant = firstMatch(location.toLowerCase(), RESTAURANTS);
  if (restaurant) return restaurant;
  const t = title.toLowerCase();
  if (t.includes("breakfast") || t.includes("brunch")) return "breakfast";
  if (t.includes("lunch")) return "lunch";
  if (t.includes("dinner")) return "dinner";
  return "lunch";
}

/* ------------------------------------------------------------------ */
/* Amusement parks — mirrors detectParkScene.                          */
/* ------------------------------------------------------------------ */

const PARKS: MatchEntry[] = [
  { id: "park-knotts", names: ["knott", "boysenberry"] },
  { id: "park-sixflags", names: ["six flags", "sixflags"] },
  { id: "park-disney", names: ["disneyland", "disney world", "disney"] },
  { id: "park-universal", names: ["universal"] },
  { id: "park-legoland", names: ["legoland", "lego"] },
  { id: "park-seaworld", names: ["seaworld", "sea world"] },
];

/* ------------------------------------------------------------------ */
/* TV shows — mirrors detectTVShowScene, including its context        */
/* guards for common words ("from", "you", "lost", "carrie",           */
/* "wednesday", "it"). Order matters: Dexter variants before Dexter.   */
/* ------------------------------------------------------------------ */

function tvSceneId(title: string, notes: string): PaperSceneId {
  const text = `${title ?? ""} ${notes ?? ""}`.toLowerCase();
  if (!text.trim()) return "tv-show";
  const has = (...names: string[]) => names.some((n) => text.includes(n));
  if (has("new blood")) return "tv-dexter-new-blood";
  if (has("original sin")) return "tv-dexter-original-sin";
  if (has("resurrection")) return "tv-dexter-resurrection";
  if (has("dexter")) return "tv-dexter";
  if (has("walking dead")) return "tv-walking-dead";
  if (has("the chosen")) return "tv-chosen";
  if (has("the bear", "yes chef")) return "tv-bear";
  if (has("sopranos")) return "tv-sopranos";
  if (has("skins")) return "tv-skins";
  if (has("game of thrones", "winterfell", "westeros") || /\bgot\b/.test(text)) return "tv-got";
  if (has("dragon ball", "dbz")) return "tv-dbz";
  if (has("sons of anarchy") || /\bsoa\b/.test(text)) return "tv-soa";
  if (has("reacher")) return "tv-reacher";
  if (/\bfrom\b/.test(text) && /\b(tv|series|show|episode|season|mgm)\b/.test(text)) return "tv-from";
  if (has("daredevil")) return "tv-daredevil";
  if (has("pluribus")) return "tv-pluribus";
  if (has("breaking bad")) return "tv-breaking-bad";
  if (has("better call saul", "saul goodman")) return "tv-better-call-saul";
  if (has("fallout")) return "tv-fallout";
  if (has("ted lasso")) return "tv-ted-lasso";
  if (has("one piece")) return "tv-one-piece";
  if (has("stranger things")) return "tv-stranger-things";
  if (has("bluey")) return "tv-bluey";
  if (has("duggee", "hey duggee")) return "tv-duggee";
  if (has("avatar the last airbender", "last airbender", "airbender", "avatar live action")) return "tv-avatar";
  if (has("yellowstone")) return "tv-yellowstone";
  if (has("the boys")) return "tv-boys";
  if (/\byou\b/.test(text) && /\b(tv|series|show|episode|season|netflix)\b/.test(text)) return "tv-you";
  if (has("chucky")) return "tv-chucky";
  if (/\blost\b/.test(text) && /\b(tv|series|show|episode|season|island|oceanic)\b/.test(text)) return "tv-lost";
  if (has("prison break")) return "tv-prison-break";
  if (has("it welcome to derry", "welcome to derry") || (/\bit\b/.test(text) && /\b(tv|series|show)\b/.test(text))) return "tv-it-derry";
  if (/\bcarrie\b/.test(text) && /\b(tv|series|show)\b/.test(text)) return "tv-carrie";
  if (has("harry potter", "hogwarts")) return "tv-harry-potter";
  if (has("wednesday addams", "nevermore") || (/\bwednesday\b/.test(text) && /\b(tv|series|show|episode|season|netflix)\b/.test(text))) return "tv-wednesday";
  if (has("vampire diaries", "mystic falls")) return "tv-vampire-diaries";
  if (has("the originals")) return "tv-originals";
  if (has("legacies")) return "tv-legacies";
  return "tv-show";
}

/* ------------------------------------------------------------------ */
/* Movies — mirrors detectMovieScene, including its movie-context     */
/* guards for common words.                                            */
/* ------------------------------------------------------------------ */

function movieSceneId(title: string, notes: string): PaperSceneId | null {
  const text = `${title ?? ""} ${notes ?? ""}`.toLowerCase();
  if (!text.trim()) return null;
  const has = (...names: string[]) => names.some((n) => text.includes(n));
  const movieCtx = /\b(movie|film|cinema|theater|theatre)\b/.test(text);
  if (has("resident evil")) return "mv-resident-evil";
  if (/\bbuddy\b/.test(text) && movieCtx) return "mv-buddy";
  if (has("black phone")) return "mv-black-phone";
  if (has("backrooms")) return "mv-backrooms";
  if (has("exit 8")) return "mv-exit-8";
  if (has("deadpool")) return "mv-deadpool";
  if (has("five nights at freddy", "fnaf", "freddy fazbear")) return "mv-fnaf";
  if (has("iron lung")) return "mv-iron-lung";
  if (/\bnimrods\b/.test(text) && movieCtx) return "mv-nimrods";
  if (/\bidiots\b/.test(text) && movieCtx) return "mv-idiots";
  if (/\bnobody\b/.test(text) && movieCtx) return "mv-nobody";
  if (has("super mario bros movie", "mario movie")) return "mv-mario";
  if (has("toy story")) return "mv-toy-story";
  if (has("zootopia")) return "mv-zootopia";
  if (has("spider-man", "spiderman")) return "mv-spiderman";
  if (has("avengers doomsday", "doomsday movie")) return "mv-avengers-doomsday";
  if (has("shrek 5", "shrek")) return "mv-shrek";
  if (has("hunger games", "sunrise on the reaping", "mockingjay")) return "mv-hunger-games";
  if (has("street fighter")) return "mv-street-fighter";
  if (has("wildwood")) return "mv-wildwood";
  return null;
}

/* ------------------------------------------------------------------ */
/* The label dispatch — mirrors KeywordAmbientAnimation's switch.      */
/* ------------------------------------------------------------------ */

const LABEL_SCENES: Record<string, PaperSceneId> = {
  "BBQ": "bbq",
  "Fast": "fast",
  "Church": "church",
  "Worship": "worship",
  "Bible Study": "bible-study",
  "Therapy": "therapy",
  "Doctor": "doctor",
  "Haircut": "haircut",
  "Gardening": "gardening",
  "Mow Lawn": "mow-lawn",
  "Prune": "prune",
  "Harvest": "harvest",
  "Park": "park",
  "Party": "party",
  "School": "school",
  "Water Park": "water-park",
  "Beach": "beach",
  "Baby Shower": "baby-shower",
  "Birthday": "birthday",
  "Christmas": "christmas",
  "Easter": "easter",
  "Sunrise Service": "sunrise-service",
  "Thanksgiving": "thanksgiving",
  "Wedding": "wedding",
  "Memorial": "memorial",
  "Meeting": "meeting",
  "Workout": "workout",
  "Basketball": "basketball",
  "Soccer": "soccer",
  "Game": "game",
  "Photo": "photo",
  "Scary Movie Night": "scary-movie",
  "Christmas Movie Night": "christmas-movie",
  "Christmas Breakfast": "christmas-breakfast",
  "Christmas Dinner": "christmas-dinner",
  "Full Moon": "full-moon",
  "Prayer": "prayer",
  "Outreach": "outreach",
  "Concert": "concert",
  "Travel": "travel",
  "Hotel": "hotel",
  "Shower": "shower",
  "Study": "study",
  "Graduation": "graduation",
  "Visit": "visit",
  "Reach Out": "reach-out",
  "Clean": "clean",
  "Wash Car": "wash-car",
  "Get Gas": "get-gas",
  "Grocery": "grocery",
  "New Year": "new-year",
  "Valentine's Day": "valentines",
  "Halloween": "halloween",
  "St. Patrick's Day": "st-patricks",
};

/**
 * The paper scene id for a keyword card, or null exactly where the
 * classic dispatch renders no scene (unknown label).
 */
export function paperSceneIdFor(
  label: string,
  title = "",
  location = "",
  notes = "",
): PaperSceneId | null {
  if (label === "Meal") return mealSceneId(title, location, notes);
  if (label === "Movie") return movieSceneId(title, notes) ?? "movie";
  if (label === "Theater") return movieSceneId(title, notes) ?? "theater";
  if (label === "TV Show") return tvSceneId(title, notes);
  if (label === "Amusement Park") {
    return firstMatch(location.toLowerCase(), PARKS) ?? "park-generic";
  }
  return LABEL_SCENES[label] ?? null;
}

/** All scene ids the routing can produce — the renderer's checklist. */
export function allPaperSceneIds(): PaperSceneId[] {
  const ids = new Set<PaperSceneId>([
    ...Object.values(LABEL_SCENES),
    ...HOMECOOKED.map((e) => e.id),
    ...RESTAURANTS.map((e) => e.id),
    ...PARKS.map((e) => e.id),
    "breakfast",
    "lunch",
    "dinner",
    "park-generic",
    "movie",
    "theater",
    "tv-show",
    "tv-dexter-new-blood",
    "tv-dexter-original-sin",
    "tv-dexter-resurrection",
    "tv-dexter",
    "tv-walking-dead",
    "tv-chosen",
    "tv-bear",
    "tv-sopranos",
    "tv-skins",
    "tv-got",
    "tv-dbz",
    "tv-soa",
    "tv-reacher",
    "tv-from",
    "tv-daredevil",
    "tv-pluribus",
    "tv-breaking-bad",
    "tv-better-call-saul",
    "tv-fallout",
    "tv-ted-lasso",
    "tv-one-piece",
    "tv-stranger-things",
    "tv-bluey",
    "tv-duggee",
    "tv-avatar",
    "tv-yellowstone",
    "tv-boys",
    "tv-you",
    "tv-chucky",
    "tv-lost",
    "tv-prison-break",
    "tv-it-derry",
    "tv-carrie",
    "tv-harry-potter",
    "tv-wednesday",
    "tv-vampire-diaries",
    "tv-originals",
    "tv-legacies",
    "mv-resident-evil",
    "mv-buddy",
    "mv-black-phone",
    "mv-backrooms",
    "mv-exit-8",
    "mv-deadpool",
    "mv-fnaf",
    "mv-iron-lung",
    "mv-nimrods",
    "mv-idiots",
    "mv-nobody",
    "mv-mario",
    "mv-toy-story",
    "mv-zootopia",
    "mv-spiderman",
    "mv-avengers-doomsday",
    "mv-shrek",
    "mv-hunger-games",
    "mv-street-fighter",
    "mv-wildwood",
  ]);
  return [...ids];
}
