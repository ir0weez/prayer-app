// ─────────────────────────────────────────────────────────────────────────────
// v350 — UP NEXT THUMBNAIL MOTION (approved by Jonathan Oct 29
// 19:03–19:14 from the sample sheet social-mockups/
// upnext-thumb-motion-v1.html: "Yes love it! Do it to todos
// events and ministries"). Every keyword scene in
// components/keyword-thumb-art.tsx gets ONE small looping motion,
// fitted to what its emblem depicts — steam over hot food, a
// flicker for flames and candles, the screen shimmer for TV
// scenes, a bell swing for church. The sheet sampled twenty; this
// table extends the same vocabulary across the whole set.
//
// The motions are DATA: a spec per scene id, rendered only by the
// handful of tiles actually mounted in the Up Next card. Coverage
// is exact — one spec per scene id the routing can produce, the
// same set-equality discipline as the v320 thumb specs.
//
// Hard rules (the sheet's, and his standing motion rules): loops
// run 2.4–4s; transform and opacity only; no bounce, no springs,
// nothing frantic. The renderer lives in
// components/keyword-thumb-art.tsx and is JS-driven
// (useNativeDriver: false — the v339 cold-start lesson; the top
// fade is the precedent), render-loop only, no timers, and stills
// under the OS reduce-motion setting.
// ─────────────────────────────────────────────────────────────────────────────

import type { MinistryType } from "./schedule-data";
import { todoFlourishForTitle, type TodoFlourishId } from "./todo-flourish";

/** The motion vocabulary — the sheet's words, so the set can be
    talked about ("the steam one", "the flicker"). */
export type ThumbMotionKind =
  | "steam"
  | "flicker"
  | "breathe"
  | "sway"
  | "swing"
  | "bob"
  | "glow"
  | "blink"
  | "sparkle"
  | "shine"
  | "drip"
  | "drift"
  | "glide"
  | "pulse"
  | "shimmer"
  | "twinkle"
  | "flare";

/** One overlay spark for the twinkle/sparkle/shine kinds, in tile
 *  px (the sheet's own seats). */
export type ThumbSpark = { left: number; top: number; size: number; color: string };

export type ThumbMotionSpec = {
  kind: ThumbMotionKind;
  /** Full loop length in ms — always within [MIN, MAX]. */
  duration: number;
  /** v360 — per-scene spark seats for the particle kinds. The
   *  shared defaults were drawn for Birthday; scenes whose
   *  approved sheet cell seats its own sparks (Christmas's tree
   *  star, Clean's shine spark) name them here. Absent = the
   *  shared two-spark set. */
  sparks?: ThumbSpark[];
};

export const THUMB_MOTION_MIN_MS = 2400;
export const THUMB_MOTION_MAX_MS = 4000;

/** How a kind loops: "cycle" runs its keyframes 0→1 and restarts
    (particles, flickers, pulses); "pingpong" eases 0→1→0 (the
    calm two-state swells and slides). */
export const THUMB_MOTION_LOOP: Record<ThumbMotionKind, "cycle" | "pingpong"> = {
  steam: "cycle",
  flicker: "cycle",
  pulse: "cycle",
  drip: "cycle",
  blink: "cycle",
  sparkle: "cycle",
  shine: "cycle",
  twinkle: "cycle",
  breathe: "pingpong",
  sway: "pingpong",
  swing: "pingpong",
  bob: "pingpong",
  glow: "pingpong",
  drift: "pingpong",
  glide: "pingpong",
  shimmer: "pingpong",
  flare: "pingpong",
};

/** One motion per keyword scene id — exact coverage of the same
    id set as KEYWORD_THUMB_SPECS / allPaperSceneIds(). */
export const KEYWORD_THUMB_MOTIONS: Record<string, ThumbMotionSpec> = {
  "baby-shower": { kind: "breathe", duration: 3600 },
  "basketball": { kind: "bob", duration: 2800 },
  "bbq": { kind: "flicker", duration: 2600 },
  "beach": { kind: "drift", duration: 3600 },
  "bible-study": { kind: "glow", duration: 3200 },
  "birthday": { kind: "sparkle", duration: 3000 },
  "breakfast": { kind: "glow", duration: 3200 },
  "christmas": { kind: "twinkle", duration: 3000, sparks: [{ left: 14.5, top: 0.5, size: 11, color: "#FFD54F" }] },
  "christmas-breakfast": { kind: "steam", duration: 3000 },
  "christmas-dinner": { kind: "steam", duration: 3000 },
  "christmas-movie": { kind: "twinkle", duration: 3000 },
  "church": { kind: "swing", duration: 3200 },
  "clean": { kind: "shine", duration: 3400, sparks: [{ left: 25, top: 3, size: 10, color: "#E1F5FE" }] },
  "concert": { kind: "bob", duration: 2800 },
  "dinner": { kind: "steam", duration: 3000 },
  "doctor": { kind: "pulse", duration: 2800 },
  "easter": { kind: "bob", duration: 2800 },
  "email": { kind: "glide", duration: 3000 },
  "fast": { kind: "flicker", duration: 2600 },
  "full-moon": { kind: "shimmer", duration: 3600 },
  "game": { kind: "bob", duration: 2800 },
  "gardening": { kind: "sway", duration: 3400 },
  "get-gas": { kind: "bob", duration: 2800 },
  "graduation": { kind: "bob", duration: 2800 },
  "grocery": { kind: "bob", duration: 2800 },
  "haircut": { kind: "sway", duration: 3400 },
  "halloween": { kind: "flicker", duration: 2600 },
  "harvest": { kind: "sway", duration: 3400 },
  "hotel": { kind: "bob", duration: 2800 },
  "lunch": { kind: "bob", duration: 2800 },
  "meeting": { kind: "bob", duration: 2800 },
  "memorial": { kind: "flicker", duration: 2600 },
  "movie": { kind: "twinkle", duration: 3000 },
  "mow-lawn": { kind: "drift", duration: 3600 },
  "mv-avengers-doomsday": { kind: "pulse", duration: 2800 },
  "mv-backrooms": { kind: "flicker", duration: 2600 },
  "mv-black-phone": { kind: "swing", duration: 3200 },
  "mv-buddy": { kind: "twinkle", duration: 3000 },
  "mv-deadpool": { kind: "pulse", duration: 2800 },
  "mv-exit-8": { kind: "glide", duration: 3000 },
  "mv-fnaf": { kind: "shimmer", duration: 3600 },
  "mv-hunger-games": { kind: "flicker", duration: 2600 },
  "mv-idiots": { kind: "twinkle", duration: 3000 },
  "mv-iron-lung": { kind: "pulse", duration: 2800 },
  "mv-mario": { kind: "bob", duration: 2800 },
  "mv-nimrods": { kind: "twinkle", duration: 3000 },
  "mv-nobody": { kind: "twinkle", duration: 3000 },
  "mv-resident-evil": { kind: "pulse", duration: 2800 },
  "mv-shrek": { kind: "bob", duration: 2800 },
  "mv-spiderman": { kind: "swing", duration: 3200 },
  "mv-street-fighter": { kind: "pulse", duration: 2800 },
  "mv-toy-story": { kind: "twinkle", duration: 3000 },
  "mv-wildwood": { kind: "sway", duration: 3400 },
  "mv-zootopia": { kind: "bob", duration: 2800 },
  "new-year": { kind: "flare", duration: 3600 },
  "news": { kind: "bob", duration: 2800 },
  "outreach": { kind: "breathe", duration: 3600 },
  "park": { kind: "sway", duration: 3400 },
  "park-disney": { kind: "twinkle", duration: 3000 },
  "park-generic": { kind: "twinkle", duration: 3000 },
  "park-knotts": { kind: "bob", duration: 2800 },
  "park-legoland": { kind: "bob", duration: 2800 },
  "park-seaworld": { kind: "drift", duration: 3600 },
  "park-sixflags": { kind: "sway", duration: 3400 },
  "park-universal": { kind: "drift", duration: 3600 },
  "party": { kind: "sparkle", duration: 3000 },
  "photo": { kind: "blink", duration: 3000 },
  "prayer": { kind: "breathe", duration: 3600 },
  "prune": { kind: "sway", duration: 3400 },
  "reach-out": { kind: "bob", duration: 2800 },
  "rest-chicken": { kind: "steam", duration: 3000 },
  "rest-chinese": { kind: "steam", duration: 3000 },
  "rest-coffee": { kind: "steam", duration: 3000 },
  "rest-dessert": { kind: "sparkle", duration: 3000 },
  "rest-diner": { kind: "steam", duration: 3000 },
  "rest-donut": { kind: "sparkle", duration: 3000 },
  "rest-healthy": { kind: "sway", duration: 3400 },
  "rest-indian": { kind: "steam", duration: 3000 },
  "rest-italian": { kind: "steam", duration: 3000 },
  "rest-pizza": { kind: "steam", duration: 3000 },
  "rest-sandwich": { kind: "bob", duration: 2800 },
  "rest-seafood": { kind: "drift", duration: 3600 },
  "rest-sushi": { kind: "bob", duration: 2800 },
  "rest-taco": { kind: "steam", duration: 3000 },
  "scary-movie": { kind: "bob", duration: 2800 },
  "school": { kind: "bob", duration: 2800 },
  "shower": { kind: "drip", duration: 2400 },
  "soccer": { kind: "bob", duration: 2800 },
  "st-patricks": { kind: "sway", duration: 3400 },
  "study": { kind: "glow", duration: 3200 },
  "sunrise-service": { kind: "glow", duration: 3200 },
  "td-burger": { kind: "steam", duration: 3000 },
  "td-burrito": { kind: "steam", duration: 3000 },
  "td-casserole": { kind: "steam", duration: 3000 },
  "td-cereal": { kind: "bob", duration: 2800 },
  "td-eggs": { kind: "glow", duration: 3200 },
  "td-fried-rice": { kind: "steam", duration: 3000 },
  "td-hot-dog": { kind: "steam", duration: 3000 },
  "td-hot-wings": { kind: "steam", duration: 3000 },
  "td-meatloaf": { kind: "steam", duration: 3000 },
  "td-mexican-pizza": { kind: "steam", duration: 3000 },
  "td-nachos": { kind: "steam", duration: 3000 },
  "td-oatmeal": { kind: "steam", duration: 3000 },
  "td-pancakes": { kind: "steam", duration: 3000 },
  "td-papa-joe": { kind: "bob", duration: 2800 },
  "td-pasta": { kind: "steam", duration: 3000 },
  "td-pizza": { kind: "steam", duration: 3000 },
  "td-pot-roast": { kind: "steam", duration: 3000 },
  "td-pupusas": { kind: "steam", duration: 3000 },
  "td-quesadilla": { kind: "steam", duration: 3000 },
  "td-ramen": { kind: "steam", duration: 3000 },
  "td-risotto": { kind: "steam", duration: 3000 },
  "td-roast-chicken": { kind: "steam", duration: 3000 },
  "td-shawarma-rice-bar": { kind: "steam", duration: 3000 },
  "td-salad": { kind: "bob", duration: 2800 },
  "td-sandwich": { kind: "bob", duration: 2800 },
  "td-soup": { kind: "steam", duration: 3000 },
  "td-steak": { kind: "steam", duration: 3000 },
  "td-stir-fry": { kind: "steam", duration: 3000 },
  "td-tacos": { kind: "steam", duration: 3000 },
  "td-tostadas": { kind: "steam", duration: 3000 },
  "td-tv-dinner": { kind: "steam", duration: 3000 },
  "thanksgiving": { kind: "steam", duration: 3000 },
  "theater": { kind: "twinkle", duration: 3000 },
  "therapy": { kind: "breathe", duration: 3600 },
  "travel": { kind: "glide", duration: 3000 },
  "tv-avatar": { kind: "shimmer", duration: 3600 },
  "tv-bear": { kind: "shimmer", duration: 3600 },
  "tv-better-call-saul": { kind: "shimmer", duration: 3600 },
  "tv-bluey": { kind: "shimmer", duration: 3600 },
  "tv-boys": { kind: "flicker", duration: 2600 },
  "tv-breaking-bad": { kind: "shimmer", duration: 3600 },
  "tv-carrie": { kind: "shimmer", duration: 3600 },
  "tv-chosen": { kind: "drift", duration: 3600 },
  "tv-chucky": { kind: "shimmer", duration: 3600 },
  "tv-daredevil": { kind: "shimmer", duration: 3600 },
  "tv-dbz": { kind: "pulse", duration: 2800 },
  "tv-dexter": { kind: "shimmer", duration: 3600 },
  "tv-dexter-new-blood": { kind: "shimmer", duration: 3600 },
  "tv-dexter-original-sin": { kind: "shimmer", duration: 3600 },
  "tv-dexter-resurrection": { kind: "shimmer", duration: 3600 },
  "tv-duggee": { kind: "shimmer", duration: 3600 },
  "tv-fallout": { kind: "shimmer", duration: 3600 },
  "tv-from": { kind: "shimmer", duration: 3600 },
  "tv-got": { kind: "shimmer", duration: 3600 },
  "tv-harry-potter": { kind: "twinkle", duration: 3000 },
  "tv-it-derry": { kind: "shimmer", duration: 3600 },
  "tv-legacies": { kind: "shimmer", duration: 3600 },
  "tv-lost": { kind: "shimmer", duration: 3600 },
  "tv-one-piece": { kind: "shimmer", duration: 3600 },
  "tv-originals": { kind: "shimmer", duration: 3600 },
  "tv-pluribus": { kind: "shimmer", duration: 3600 },
  "tv-prison-break": { kind: "shimmer", duration: 3600 },
  "tv-reacher": { kind: "shimmer", duration: 3600 },
  "tv-show": { kind: "shimmer", duration: 3600 },
  "tv-skins": { kind: "shimmer", duration: 3600 },
  "tv-soa": { kind: "shimmer", duration: 3600 },
  "tv-sopranos": { kind: "shimmer", duration: 3600 },
  "tv-stranger-things": { kind: "shimmer", duration: 3600 },
  "tv-ted-lasso": { kind: "shimmer", duration: 3600 },
  "tv-vampire-diaries": { kind: "shimmer", duration: 3600 },
  "tv-walking-dead": { kind: "shimmer", duration: 3600 },
  "tv-wednesday": { kind: "shimmer", duration: 3600 },
  "tv-yellowstone": { kind: "shimmer", duration: 3600 },
  "tv-you": { kind: "blink", duration: 3000 },
  "valentines": { kind: "pulse", duration: 2800 },
  "visit": { kind: "breathe", duration: 3600 },
  "wash-car": { kind: "drip", duration: 2400 },
  "water-park": { kind: "drift", duration: 3600 },
  "wedding": { kind: "pulse", duration: 2800 },
  "workout": { kind: "pulse", duration: 2800 },
  "worship": { kind: "bob", duration: 2800 },
};

// ─────────────────────────────────────────────────────────────────────────────
// v353 — UP NEXT-ONLY THUMB SCENES. A device trace on shipped v352
// proved two holes of one class: identities the app already knows
// in one system never reached the Up Next thumb layer. Feed is a
// flourish keyword (lib/todo-flourish.ts) but was never an event
// keyword, so its Up Next todo tile fell back to a check glyph;
// Rest IS an event keyword but has no paper scene (its card swaps
// its own sky), so its tile fell back to a static crescent with no
// motion. These scenes live ONLY in the thumb layer — they are not
// paper scenes (paperSceneIdFor is untouched, Rest's null pin
// stands) — one spec in UP_NEXT_THUMB_SPECS
// (components/keyword-thumb-art.tsx) and one motion here, keyed
// identically. The v350 set-equality discipline is unchanged for
// the paper set; this extension set is pinned exactly in
// keyword-thumb-v353.test.ts.
// ─────────────────────────────────────────────────────────────────────────────

export const UP_NEXT_THUMB_MOTIONS: Record<string, ThumbMotionSpec> = {
  "feed": { kind: "bob", duration: 2800 },
  "duolingo": { kind: "bob", duration: 2800 },
  "brush-teeth": { kind: "sparkle", duration: 3000 },
  "app-update": { kind: "glide", duration: 3000 },
  "trash": { kind: "bob", duration: 2600 },
  "rest": { kind: "breathe", duration: 3600 },
};

export function thumbMotionForScene(sceneId: string): ThumbMotionSpec | null {
  return KEYWORD_THUMB_MOTIONS[sceneId] ?? UP_NEXT_THUMB_MOTIONS[sceneId] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MINISTRY TILES (his ruling, Oct 29 19:15): a ministry row's tile
// keys off the LINKED MINISTRY TYPE (ScheduleMinistry.type — the
// type chosen when the ministry is created), never the free-text
// title. Each type maps to the keyword scene whose subject matches
// it — by the type's own glyph where a scene carries it (Outreach
// → the public-globe scene, Prayer → the praying-hands scene,
// Youth → the child-care scene), by subject where it doesn't
// (Hospitality → the dinner cloche, Counseling → therapy,
// Marriage → wedding). "Other" has no subject to match, so it
// keeps the plain glyph tile (with the breathe every unmapped
// tile gets). Two ministries with different titles but the same
// type therefore always get the same tile.
// ─────────────────────────────────────────────────────────────────────────────

export const MINISTRY_TYPE_THUMB_SCENE: Record<MinistryType, string | null> = {
  "Outreach": "outreach",
  "Teaching": "school",
  "Worship": "worship",
  "Service": "outreach",
  "Prayer": "prayer",
  "Youth": "baby-shower",
  "Missions": "travel",
  "Hospitality": "dinner",
  "Counseling": "therapy",
  "Bible Study": "bible-study",
  "Marriage": "wedding",
  "Parenting": "baby-shower",
  "Fast": "fast",
  "Read": "study",
  "Other": null,
};

export function ministryThumbSceneForType(type: string): string | null {
  return (MINISTRY_TYPE_THUMB_SCENE as Record<string, string | null>)[type] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// v353 — TODO TILES: THE FLOURISH IDENTITY COUNTS TOO. The todo
// arm's first route is the event-keyword routing (v350); when a
// title carries no event keyword, the tile now consults the SAME
// keyword identity the check-off flourishes use
// (todoFlourishForTitle — word boundaries and the quiet set
// included, so "Feedback" never fires Feed and Pray/Sleep/Stitch
// stay sceneless). Each flourish id lands on the thumb scene whose
// subject matches it: caffeine borrows the coffee scene (steam),
// Read the study scene (glow), Break the rest scene (breathe);
// the rest are the Up Next-only scenes above. Photo already
// resolves through the event routing; it is listed here so the
// map covers the whole flourish set exactly.
// ─────────────────────────────────────────────────────────────────────────────

export const TODO_FLOURISH_THUMB_SCENE: Record<TodoFlourishId, string> = {
  "feed": "feed",
  "duolingo": "duolingo",
  "caffeine": "rest-coffee",
  "brush-teeth": "brush-teeth",
  "photo": "photo",
  "app-update": "app-update",
  "trash": "trash",
  "read": "study",
  "break": "rest",
};

export function todoThumbSceneForTitle(title: string): string | null {
  const flourish = todoFlourishForTitle(title);
  return flourish ? TODO_FLOURISH_THUMB_SCENE[flourish] : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// v353 — EVENT TILES: KEYWORD LABELS WITH NO PAPER SCENE. Rest's
// paper routing stays null on purpose (the Rest card swaps its own
// living sky; RestSquare is untouched), but its Up Next tile is a
// thumbnail like every other — the crescent on Rest's own navy
// ground, breathing. Keyed by the keyword LABEL, consulted only
// where paperSceneIdFor returns null.
// ─────────────────────────────────────────────────────────────────────────────

export const KEYWORD_LABEL_THUMB_SCENE: Record<string, string> = {
  "Rest": "rest",
};

export function thumbSceneForKeywordLabel(label: string): string | null {
  return KEYWORD_LABEL_THUMB_SCENE[label] ?? null;
}

