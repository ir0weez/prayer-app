// ---------- paper town: exterior data (no React Native) ----------
// The PAPER CUTOUT language moves outside. Jonathan's verdict on the
// paper interiors ("paper works much better. Theme it all to paper.")
// extends to the maps: every building exterior on the town, city and
// School Campus maps, the hub landmarks, the construction cover, and
// the people themselves are now layered paper pieces — flat shapes,
// soft offset shadows, warm palette — drawn by
// components/paper-building-art.tsx on the shared PaperCanvas kit.
//
// The storybook kit (v144) taught the exteriors their manners, and the
// paper data keeps every one of them:
//   - each type keeps its own palette, roof, sign and storefront;
//   - each LEVEL still visibly adds pieces (the ladder below is the
//     same discipline as the interiors': scores strictly climb);
//   - at night every window that flows through the shared lit pattern
//     glows warm amber from inside — the light lives in the art itself
//     (the v145 fix), never in floating overlay panes.
// The Dark Forest is NOT here and never will be: the forest stays
// pixel, by deliberate contrast (home is paper, the wild is pixels).

import { paperDinerLookFor, type PaperDinerLook } from "./paper-interior";

/** Building canvases are this many paper units wide; rows follow the
 *  art's aspect (tall buildings extend above their square). */
export const PAPER_TOWN_COLS = 100;

export function paperTownRows(size: number, artH?: number): number {
  const h = artH ?? size;
  return Math.max(60, Math.round((h / Math.max(size, 1)) * PAPER_TOWN_COLS));
}

/* ------------------------------------------------------------------ */
/* The lit pattern — the storybook hash, kept byte-for-byte so day    */
/* art lights the same windows it always did. At night, every window  */
/* in the pattern is lit (the v145 rule: real glass glowing amber).   */
/* ------------------------------------------------------------------ */

export const PAPER_GLASS_DAY = "#BFDBFE";
export const PAPER_GLASS_LIT = "#FDE68A";

export function paperLitRatio(level: number): number {
  return level >= 3 ? 0.9 : level === 2 ? 0.6 : 0.3;
}

export function paperWindowLit(night: boolean, i: number, j: number, level: number): boolean {
  if (night) return true;
  return ((i * 7 + j * 13 + level * 5) % 10) < paperLitRatio(level) * 10;
}

/** The glass a paper window shows: warm interiors (upper room, manna
 *  house, fasting house candles) glow in the daytime too. */
export function paperGlassFor(opts: {
  night: boolean;
  warm?: boolean;
  lit: boolean;
  day?: string;
}): string {
  if (opts.night || opts.warm || opts.lit) return PAPER_GLASS_LIT;
  return opts.day ?? PAPER_GLASS_DAY;
}

/* ------------------------------------------------------------------ */
/* The exterior ladder — an upgrade must be visible from the street.  */
/* Mirrors the storybook kit's growth exactly:                        */
/*   L1 modest — sign medallion, one window, plain door and roof.     */
/*   L2 grown  — second window, plant pots by the door, door glass.   */
/*   L3 grand  — gold trim, flower boxes + pots in bloom, banners,    */
/*               gilded roof inset, a stone step under the door.      */
/* ------------------------------------------------------------------ */

export type ExteriorDressing = {
  /** Side windows drawn (1 at L1, a pair from L2). */
  windows: number;
  /** Plant pots at the base corners. */
  pots: boolean;
  /** The door wears a little glass pane. */
  doorGlass: boolean;
  /** Gold trim under the eaves + on the sign ring. */
  goldTrim: boolean;
  /** Flower boxes under the side windows. */
  flowerBoxes: boolean;
  /** Banners flanking the door. */
  banners: boolean;
  /** A lighter inset on the gable — the gilded roof. */
  gildedRoof: boolean;
  /** A stone step under the door. */
  stoneStep: boolean;
};

export function exteriorDressingFor(level: number): ExteriorDressing {
  const lv = Math.min(Math.max(level, 1), 3);
  return {
    windows: lv >= 2 ? 2 : 1,
    pots: lv >= 2,
    doorGlass: lv >= 2,
    goldTrim: lv >= 3,
    flowerBoxes: lv >= 3,
    banners: lv >= 3,
    gildedRoof: lv >= 3,
    stoneStep: lv >= 3,
  };
}

/** Piece count of a dressing set — the ladder's monotonicity contract.
 *  Every level must ADD paper, never just swap colors. */
export function exteriorPieceScore(d: ExteriorDressing): number {
  return (
    d.windows +
    (d.pots ? 2 : 0) +
    (d.doorGlass ? 1 : 0) +
    (d.goldTrim ? 2 : 0) +
    (d.flowerBoxes ? 2 : 0) +
    (d.banners ? 2 : 0) +
    (d.gildedRoof ? 1 : 0) +
    (d.stoneStep ? 1 : 0)
  );
}

/* ------------------------------------------------------------------ */
/* Sign + display glyph vocabularies. The medallion over the door is  */
/* the building's identity; the storefront glass shows its wares.     */
/* Glyphs are drawn by the renderer in a 24x24 box.                   */
/* ------------------------------------------------------------------ */

export type PaperSignKind =
  | "star" | "coin" | "loaf" | "apple" | "scissors" | "shirt" | "shield"
  | "swords" | "hammer" | "cloche" | "book" | "joystick" | "chalkboard"
  | "pizza" | "palms" | "sun" | "sushi" | "coffee" | "candle" | "wheat"
  | "goblet" | "note" | "flask" | "palette" | "basketball" | "tray"
  | "saw" | "frame" | "bean" | "flower" | "wave" | "cross" | "heart"
  | "mortar" | "envelope" | "kettlebell";

export type PaperDisplayKind =
  | "goods" | "loaves" | "produce" | "chairs" | "shirt" | "anvil" | "tools"
  | "stalls" | "spines" | "cabinets" | "desks" | "pizza" | "burger" | "taco"
  | "plates" | "stools" | "shelves" | "bottles" | "bolts" | "frames" | "hoop"
  | "bowls" | "sacks" | "blooms" | "eq";

/* ------------------------------------------------------------------ */
/* The story painter's config — one row per storefront type. The      */
/* palettes are the storybook buildings' own, carried across the      */
/* pivot so a building keeps its identity; only the medium changed.   */
/* ------------------------------------------------------------------ */

export type PaperStoryFront =
  | "barber-pole" | "crates" | "logs" | "sushi" | "string-lights"
  | "columns" | "flag" | "dome" | "skylight";

export type PaperStoryConfig = {
  wall: string;
  /** Outline ink for windows/door/sign ring. */
  ink: string;
  roof: string;
  roofStyle?: "gable" | "flat";
  door?: string;
  doorAt?: "center" | "right";
  doorWide?: boolean;
  trim?: string;
  awning?: [string, string];
  glass?: string;
  /** Windows glow warm even by day. */
  warm?: boolean;
  /** Body width in paper units (default 88). */
  w?: number;
  /** Body height as a fraction of the canvas rows (default 0.5). */
  bodyHFrac?: number;
  /** A pair of small windows above the main floor. */
  upperWin?: boolean;
  chimney?: string;
  banner?: string;
  sign?: PaperSignKind;
  signBg?: string;
  display?: PaperDisplayKind;
  displayGlass?: string;
  front?: PaperStoryFront;
};

export const PAPER_STORY_CONFIGS: Record<string, PaperStoryConfig> = {
  "pawn-house": {
    wall: "#EDE9FE", ink: "#6D28D9", roof: "#7C3AED",
    door: "#4C1D95", chimney: "#A78BFA", sign: "star",
  },
  shop: {
    wall: "#FEF3C7", ink: "#92400E", roof: "#B91C1C",
    awning: ["#DC2626", "#FFFFFF"], sign: "coin", display: "goods",
  },
  bakery: {
    wall: "#FDEBD0", ink: "#92400E", roof: "#92400E", chimney: "#A8A29E",
    awning: ["#D97706", "#FFF7ED"], sign: "loaf", display: "loaves",
  },
  market: {
    wall: "#E0F2FE", ink: "#0369A1", roof: "#0369A1",
    w: 96, bodyHFrac: 0.52, sign: "apple", display: "produce", front: "crates",
  },
  barbershop: {
    wall: "#F8FAFC", ink: "#64748B", roof: "#475569",
    awning: ["#3B82F6", "#FFFFFF"], sign: "scissors", display: "chairs", front: "barber-pole",
  },
  "clothes-shop": {
    wall: "#FEF3C7", ink: "#B45309", roof: "#D97706",
    awning: ["#F59E0B", "#FFFBEB"], sign: "shirt", display: "shirt",
  },
  armory: {
    wall: "#E5E7EB", ink: "#4B5563", roof: "#374151", roofStyle: "flat",
    door: "#374151", sign: "shield", banner: "#374151",
  },
  weaponsmith: {
    wall: "#FDE8E8", ink: "#991B1B", roof: "#7F1D1D",
    door: "#450A0A", sign: "swords", display: "anvil",
  },
  toolshop: {
    wall: "#FEF3C7", ink: "#92400E", roof: "#B45309",
    sign: "hammer", display: "tools",
  },
  "food-court": {
    wall: "#FFF7ED", ink: "#C2410C", roof: "#EA580C",
    w: 95, awning: ["#F97316", "#FFFFFF"], sign: "cloche", display: "stalls",
  },
  bookstore: {
    wall: "#F5E6D3", ink: "#78350F", roof: "#92400E",
    awning: ["#B45309", "#FEF3C7"], sign: "book", display: "spines",
  },
  arcade: {
    wall: "#5B21B6", ink: "#2E1065", roof: "#4C1D95", roofStyle: "flat",
    door: "#1E1B4B", trim: "#F0ABFC", glass: "#F0ABFC",
    sign: "joystick", signBg: "#EDE9FE", display: "cabinets", displayGlass: "#2E1065",
  },
  library: {
    wall: "#D7F0EC", ink: "#0F766E", roof: "#0F766E",
    bodyHFrac: 0.56, door: "#134E4A", sign: "book", display: "spines",
  },
  classroom: {
    wall: "#E9F7E4", ink: "#15803D", roof: "#16A34A",
    door: "#14532D", sign: "chalkboard", display: "desks", front: "flag",
  },
  "pizza-place": {
    wall: "#EDE9FE", ink: "#6D28D9", roof: "#6D28D9", roofStyle: "flat",
    door: "#4C1D95", chimney: "#B45309", awning: ["#DC2626", "#FFFFFF"],
    sign: "pizza", display: "pizza", displayGlass: "#F5F0FF",
  },
  "burger-joint": {
    wall: "#FFFFFF", ink: "#D22630", roof: "#D22630", roofStyle: "flat",
    door: "#991B1B", chimney: "#B91C1C", trim: "#D22630",
    awning: ["#D22630", "#FFFFFF"], sign: "palms", signBg: "#FFFFFF", display: "burger",
  },
  "taco-stand": {
    wall: "#FEF3C7", ink: "#7C3AED", roof: "#14B8A6",
    door: "#5B21B6", trim: "#F472B6", sign: "sun", display: "taco",
  },
  "sushi-bar": {
    wall: "#F8FAFC", ink: "#1F2937", roof: "#334155",
    door: "#111827", sign: "sushi", display: "plates", front: "sushi",
  },
  diner: {
    wall: "#FFF7ED", ink: "#9A3412", roof: "#F39C2C", roofStyle: "flat",
    door: "#7C2D12", doorAt: "right", w: 96, bodyHFrac: 0.44, trim: "#DC2626",
    sign: "coffee", display: "stools",
  },
  "upper-room": {
    wall: "#FDE9C8", ink: "#92400E", roof: "#B45309",
    warm: true, door: "#78350F", banner: "#7C2D3E",
    sign: "candle", front: "string-lights",
  },
  "manna-house": {
    wall: "#FEF3C7", ink: "#B45309", roof: "#D97706",
    warm: true, door: "#92400E", sign: "wheat", display: "shelves",
  },
  "feast-hall": {
    wall: "#F3E3BC", ink: "#7C2D12", roof: "#7C2D12",
    w: 96, bodyHFrac: 0.56, warm: true, door: "#451A03", doorWide: true,
    banner: "#7C2D12", sign: "goblet", front: "columns",
  },
  "music-room": {
    wall: "#EDE9FE", ink: "#6D28D9", roof: "#7C3AED",
    door: "#4C1D95", sign: "note", banner: "#7C3AED",
  },
  "science-lab": {
    wall: "#ECFDF5", ink: "#0F766E", roof: "#0F766E", roofStyle: "flat",
    door: "#134E4A", sign: "flask", display: "bottles", front: "dome",
  },
  "art-studio": {
    wall: "#FFF1F2", ink: "#BE3455", roof: "#9F1239",
    door: "#881337", sign: "palette", display: "frames",
  },
  gymnasium: {
    wall: "#FDEBD0", ink: "#92400E", roof: "#92400E", roofStyle: "flat",
    door: "#451A03", w: 96, bodyHFrac: 0.56,
    sign: "basketball", signBg: "#FFF7ED", display: "hoop", displayGlass: "#FFF7ED",
  },
  cafeteria: {
    wall: "#FEF3C7", ink: "#B45309", roof: "#B45309",
    awning: ["#D97706", "#FFFFFF"], sign: "tray", display: "bowls",
  },
  "school-workshop": {
    wall: "#E3C08D", ink: "#6B4A2F", roof: "#6B4A2F",
    door: "#4E3421", doorWide: true, sign: "saw", front: "logs",
  },
  "art-gallery": {
    wall: "#FAF5EF", ink: "#78716C", roof: "#57534E", roofStyle: "flat",
    door: "#44403C", sign: "frame", display: "frames", front: "skylight",
  },
  "coffee-roastery": {
    wall: "#EFEBE4", ink: "#5E3D22", roof: "#6B4423",
    door: "#3E2723", chimney: "#78716C", sign: "bean", display: "sacks",
  },
  "flower-market": {
    wall: "#FFFBEB", ink: "#B45309", roof: "#B45309",
    awning: ["#EC4899", "#FFFFFF"], w: 95, bodyHFrac: 0.5,
    sign: "flower", display: "blooms",
  },
  "music-studio": {
    wall: "#E0E7FF", ink: "#4338CA", roof: "#3730A3", roofStyle: "flat",
    door: "#1E1B4B", trim: "#818CF8", sign: "wave", display: "eq", displayGlass: "#1E1B4B",
  },
  apothecary: {
    wall: "#F3E8EE", ink: "#5B21B6", roof: "#7C3AED",
    door: "#5B21B6", sign: "mortar", display: "bottles",
  },
};

/* ------------------------------------------------------------------ */
/* Towers — the city's pseudo-3D blocks become stacked paper sheets:  */
/* a front sheet, a darker side flap, a roof cap, a grid of windows.  */
/* ------------------------------------------------------------------ */

export type PaperTowerConfig = {
  front: string;
  side: string;
  roof: string;
  cols: number;
  /** Rows at L1; towers grow rows or lit windows with level/floors. */
  rows: number;
  winOff: string;
  w: number;
  /** Special cap dressing. */
  cap?: "awning" | "hotel-sign" | "crest" | "flags";
};

export const PAPER_TOWER_CONFIGS: Record<string, PaperTowerConfig> = {
  "bank-tower": { front: "#2748A8", side: "#1B3170", roof: "#172554", cols: 3, rows: 1, winOff: "#1E3A8A", w: 62 },
  "department-store": { front: "#7C3AED", side: "#5B21B6", roof: "#4C1D95", cols: 3, rows: 2, winOff: "#4C1D95", w: 95, cap: "awning" },
  hotel: { front: "#B45309", side: "#8A3F06", roof: "#78350F", cols: 2, rows: 3, winOff: "#78350F", w: 70, cap: "hotel-sign" },
  office: { front: "#93C5FD", side: "#5B8BD0", roof: "#1E40AF", cols: 2, rows: 4, winOff: "#1E40AF", w: 65 },
  "grand-library": { front: "#3B4A6B", side: "#27324B", roof: "#1B2338", cols: 3, rows: 3, winOff: "#232D47", w: 78, cap: "crest" },
  embassy: { front: "#E8E2D4", side: "#C9BFAE", roof: "#8A7F6A", cols: 3, rows: 3, winOff: "#B8AE99", w: 72, cap: "flags" },
};

/** Window rows a tower shows: bank towers stack by FLOOR, the library
 *  and embassy grow with LEVEL, department stores add a row at L2. */
export function paperTowerRows(type: string, level: number, floors: number): number {
  switch (type) {
    case "bank-tower":
      return Math.min(Math.max(floors || 1, 1), 5);
    case "grand-library":
      return level >= 3 ? 6 : level >= 2 ? 4 : 3;
    case "embassy":
      return level >= 3 ? 4 : 3;
    case "department-store":
      return 2 + (level >= 2 ? 1 : 0);
    default:
      return PAPER_TOWER_CONFIGS[type]?.rows ?? 3;
  }
}

/** Embassy flags multiply with level: 2 -> 3 -> 5. */
export function paperEmbassyFlags(level: number): number {
  return level >= 3 ? 5 : level >= 2 ? 3 : 2;
}
export const PAPER_FLAG_COLORS = ["#B91C1C", "#1D4ED8", "#16A34A", "#F59E0B", "#7C3AED"] as const;

/* ------------------------------------------------------------------ */
/* Bespoke scenes — types whose silhouette is their identity (the     */
/* church's steeple, the farm's barn, the fountain's arcs). The       */
/* renderer draws each as its own paper scene; this set is the        */
/* contract that every BuildingType routes somewhere.                 */
/* ------------------------------------------------------------------ */

export const PAPER_SPECIAL_SCENES: ReadonlySet<string> = new Set([
  "house", "villager-cottage", "farm", "church", "chapel", "bank",
  "banquet-table", "community-garden", "amphitheater", "fountain-plaza",
  "hospital", "inn", "carpenter", "pottery", "music-hall", "tailor",
  "observatory", "bathhouse", "town-hall", "post-office",
  "bible-study-hall", "fasting-house", "gym", "outreach-center",
  "opera-house", "museum", "clock-tower", "cinema", "main-office",
  "bell-tower", "apartments", "city-market", "theater",
]);

/** Which renderer a building type flows through. Every member of the
 *  BuildingType union must land in exactly one bucket. */
export function paperRendererFor(type: string): "story" | "tower" | "special" | null {
  if (PAPER_SPECIAL_SCENES.has(type)) return "special";
  if (PAPER_TOWER_CONFIGS[type]) return "tower";
  if (PAPER_STORY_CONFIGS[type]) return "story";
  return null;
}

/* ------------------------------------------------------------------ */
/* The map-facing villager look. THE identity contract: the person    */
/* you meet on the street is the person seated in the cantina — same   */
/* deterministic look, same function, no second vocabulary. City      */
/* commuters/workers are NOT prayer people: they get synthetic ids    */
/* in their own namespace, so they can never borrow a real person's   */
/* face.                                                              */
/* ------------------------------------------------------------------ */

export function paperMapLookFor(person: { id: string; accentColor?: string }): PaperDinerLook {
  return paperDinerLookFor(person);
}

export function paperCityLookFor(npcId: string, color?: string): PaperDinerLook {
  return paperDinerLookFor({ id: `citynpc:${npcId}`, accentColor: color });
}

/* ------------------------------------------------------------------ */
/* Hub landmarks — the five gates to the other maps, in paper.        */
/* ------------------------------------------------------------------ */

export type PaperLandmarkKind = "well" | "garden-gate" | "mission-field" | "dark-forest" | "river-dock";

export const PAPER_LANDMARKS: readonly PaperLandmarkKind[] = [
  "well", "garden-gate", "mission-field", "dark-forest", "river-dock",
];

/* ------------------------------------------------------------------ */
/* Ground — the map's paper sheets: grass, plots, sand, street.       */
/* ------------------------------------------------------------------ */

export const PAPER_GROUND = {
  /** Empty grass — a warm paper green, never the old UI grey. */
  grass: "#DDECC8",
  grassEdge: "#C3D9A8",
  /** A built plot reads a breath warmer than open grass. */
  plot: "#E6F2D2",
  /** The beach district's sand sheet. */
  sand: "#F7E3AC",
  sandEdge: "#EDD28C",
  /** Streets: warm stone paper with a cream dashed center line. */
  road: "#CFC4AE",
  roadLine: "#F7EFDA",
  selected: "#FEF3C7",
  selectedEdge: "#F59E0B",
  stream: "#7DD3FC",
  streamEdge: "#38BDF8",
} as const;

/** Map a placed decoration's art id (lib/hometown DECORATIONS) to the
 *  paper decoration component's kind; null for anything unmapped. */
export function paperDecorationKind(
  art: string
): "fountain" | "statue" | "garden" | "lantern" | null {
  switch (art) {
    case "fountain":
      return "fountain";
    case "statue":
      return "statue";
    case "garden":
      return "garden";
    case "lantern":
      return "lantern";
    default:
      return null;
  }
}
