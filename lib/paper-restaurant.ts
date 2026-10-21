// ---------- paper restaurant data: cuisine configs + ladders ----------
// The Taco Stand proved the paper cutout kit (lib/paper-interior) and
// Jonathan approved the direction for EVERY interior ("paper works
// much better. Theme it all to paper."). This file is the restaurant
// rollout's data half: one config per cuisine that routes through
// app/restaurant-interior.tsx — palette, floor treatment, signature
// piece, overhead dressing, the food that lands on the plates — plus
// the per-cuisine progression ladders in the kit's shape (every step
// ADDS pieces; piece scores pin the monotonicity in tests).
//
// The drawn cuisine themes (components/cuisine-themes.tsx) stay in
// the repo — their palettes still dress the screen chrome — but the
// rooms themselves render from these configs through the paper kit.

import { BAND_ROWS, ENTRANCE_ROWS } from "./paper-interior";

/* ------------------------------------------------------------------ */
/* Geometry — the booth kit's bands under a cuisine-sized wall stack.  */
/* The taco room's stack is a fixed 54; restaurant wall stacks vary    */
/* (the pizza party band stands under the oven wall), so floor top     */
/* and booth placement take the stack height as a parameter.           */
/* ------------------------------------------------------------------ */

/** Wall stack height for a booth room with no party band. */
export const RESTAURANT_WALL_ROWS = 50;

/** The pizza party band: stage, arcade row, prize counter — each
 *  stands only once its feature tier is bought (lib/pizza-features). */
export function pizzaPartyRows(tiers: { stage: number; arcade: number; prize: number }): number {
  return (tiers.stage > 0 ? 17 : 0) + (tiers.arcade > 0 ? 13 : 0) + (tiers.prize > 0 ? 13 : 0);
}

export function restaurantFloorTop(wallRows: number): number {
  return wallRows + 2;
}

export function restaurantBandCount(tableCount: number): number {
  return Math.max(1, Math.ceil(tableCount / 2));
}

export function restaurantRoomRows(wallRows: number, tableCount: number): number {
  return restaurantFloorTop(wallRows) + restaurantBandCount(tableCount) * BAND_ROWS + 2 + ENTRANCE_ROWS;
}

export type RestaurantBoothSide = "left" | "right";

/** Booth placement for table `tableIndex` under a wall stack of
 *  `wallRows` — the kit's boothForTable with the stack parameterized. */
export function restaurantBoothForTable(
  tableIndex: number,
  wallRows: number
): { side: RestaurantBoothSide; band: number; top: number } {
  const band = Math.floor(tableIndex / 2);
  const side: RestaurantBoothSide = tableIndex % 2 === 0 ? "left" : "right";
  return { side, band, top: restaurantFloorTop(wallRows) + band * BAND_ROWS };
}

/* Banquet geometry — one long table down the room's middle, a pair of
 * seats (one per side) every SEAT_ROWS, hero at the head. */
export const BANQUET_WALL_ROWS = 34;
export const BANQUET_SEAT_ROWS = 16;

export function banquetSeatPairs(dinerCount: number): number {
  return Math.max(1, Math.ceil(dinerCount / 2));
}

export function banquetRoomRows(dinerCount: number): number {
  return BANQUET_WALL_ROWS + 2 + banquetSeatPairs(dinerCount) * BANQUET_SEAT_ROWS + 2 + ENTRANCE_ROWS;
}

/* ------------------------------------------------------------------ */
/* Cuisine configs                                                     */
/* ------------------------------------------------------------------ */

export type PaperFoodKind = "pizza" | "burger" | "sushi" | "pie" | "bread" | "feast" | "supper";
export type PaperSignatureKind =
  | "pizza-oven"
  | "burger-counter"
  | "pie-case"
  | "sushi-counter"
  | "communion"
  | "bread-oven"
  | "goblet-shelf"
  | "garland"
  | "hearth";
export type PaperOverheadKind =
  | "bistro"
  | "awning"
  | "lanterns"
  | "pendants"
  | "oil-lamps"
  | "bakery-pendants"
  | "banners"
  | "stars";
export type PaperFloorKind =
  | "confetti"
  | "white-tile"
  | "checker-wood"
  | "planks"
  | "dark-planks"
  | "stone"
  | "grass";

export type PaperCuisineConfig = {
  id: string;
  scene: "booth" | "banquet";
  wall: string;
  wallDark: string;
  wallPanel: string;
  floor: string;
  floorAlt: string;
  floorKind: PaperFloorKind;
  accent: string;
  /** Pale label/trim color that reads on the wall color. */
  pale: string;
  /** Tablecloth by tables tier (index 0 = bare wood, ""). */
  cloth: readonly string[];
  /** Bench frame + seat wood. */
  benchFrame: string;
  benchSeat: string;
  /** Bench cushion color by cushion level 0..3 (kit benchStyleFor). */
  cushions: readonly [string, string, string, string];
  tableWood: string;
  food: PaperFoodKind;
  drink: string;
  signature: PaperSignatureKind;
  overhead: PaperOverheadKind;
  /** Candlelit rooms grow sconces + a chandelier with level. */
  candlelit: boolean;
  /** The Marriage Supper stands under an open sky, not a roof. */
  outdoor?: boolean;
};

const GENERIC: PaperCuisineConfig = {
  id: "generic",
  scene: "booth",
  wall: "#3A2817",
  wallDark: "#2A1C0E",
  wallPanel: "#46301C",
  floor: "#6B4A2B",
  floorAlt: "#75522F",
  floorKind: "planks",
  accent: "#E0A63F",
  pale: "#F5E6D0",
  cloth: ["", "#F7EBD4", "#C9754A", "#7A3B2E"],
  benchFrame: "#5E3D22",
  benchSeat: "#8B5E34",
  cushions: ["#8B5E34", "#2E7D6B", "#C26D9C", "#7B2D8B"],
  tableWood: "#8B5E34",
  food: "feast",
  drink: "#C0392B",
  signature: "hearth",
  overhead: "bistro",
  candlelit: true,
};

export const PAPER_CUISINES: Record<string, PaperCuisineConfig> = {
  "pizza-place": {
    id: "pizza-place",
    scene: "booth",
    // Party-palace purple, pink-red stage accent (the drawn theme's set).
    wall: "#43265E",
    wallDark: "#2E1A42",
    wallPanel: "#553273",
    floor: "#4A2A63",
    floorAlt: "#5B3480",
    floorKind: "confetti",
    accent: "#FF5A7A",
    pale: "#F3D9F7",
    cloth: ["", "#F5EFE0", "#C0392B", "#7B2D8B"],
    benchFrame: "#5E2E1A",
    benchSeat: "#8B4A2E",
    cushions: ["#8B4A2E", "#C0392B", "#D6336C", "#7B2D8B"],
    tableWood: "#8B5E34",
    food: "pizza",
    drink: "#FF5A7A",
    signature: "pizza-oven",
    overhead: "bistro",
    candlelit: false,
  },
  "burger-joint": {
    id: "burger-joint",
    scene: "booth",
    // Cold, bright red-and-white — the one LIGHT paper room; flat paper
    // whites with red trim, dark ink.
    wall: "#FFFFFF",
    wallDark: "#E9E2D6",
    wallPanel: "#F1EDE4",
    floor: "#F7F4EE",
    floorAlt: "#FFFFFF",
    floorKind: "white-tile",
    accent: "#D22630",
    pale: "#6E625A",
    cloth: ["", "#FFFFFF", "#D22630", "#F3E9D2"],
    benchFrame: "#7A1D22",
    benchSeat: "#B02A30",
    cushions: ["#B02A30", "#D22630", "#E4572E", "#8C1D25"],
    tableWood: "#C89B6D",
    food: "burger",
    drink: "#D22630",
    signature: "burger-counter",
    overhead: "awning",
    candlelit: false,
  },
  "sushi-bar": {
    id: "sushi-bar",
    scene: "booth",
    wall: "#2B2F38",
    wallDark: "#1A1C22",
    wallPanel: "#363B46",
    floor: "#3E3226",
    floorAlt: "#473827",
    floorKind: "dark-planks",
    accent: "#C0392B",
    pale: "#EDE8DC",
    cloth: ["", "#2E3138", "#C0392B", "#1A1C22"],
    benchFrame: "#1A1410",
    benchSeat: "#2E2419",
    cushions: ["#2E2419", "#2E7D6B", "#C0392B", "#101216"],
    tableWood: "#2E2419",
    food: "sushi",
    drink: "#7AC8A8",
    signature: "sushi-counter",
    overhead: "lanterns",
    candlelit: false,
  },
  diner: {
    id: "diner",
    scene: "booth",
    // Classic American diner: warm browns, orange booth warmth, gold.
    wall: "#54381F",
    wallDark: "#3A2513",
    wallPanel: "#66462A",
    floor: "#5D4128",
    floorAlt: "#68492D",
    floorKind: "checker-wood",
    accent: "#F39C2C",
    pale: "#FBEED8",
    cloth: ["", "#F7EBD4", "#E67E22", "#8B3A1E"],
    benchFrame: "#5E3D22",
    benchSeat: "#8B5E34",
    cushions: ["#8B5E34", "#E67E22", "#C9573F", "#8B3A1E"],
    tableWood: "#8B5E34",
    food: "pie",
    drink: "#7A4A21",
    signature: "pie-case",
    overhead: "pendants",
    candlelit: false,
  },
  "upper-room": {
    id: "upper-room",
    scene: "booth",
    wall: "#46351F",
    wallDark: "#2E2113",
    wallPanel: "#57452A",
    floor: "#6B5E4A",
    floorAlt: "#75664E",
    floorKind: "stone",
    accent: "#E0A63F",
    pale: "#F5EAD6",
    cloth: ["", "#F7F0DC", "#E0A63F", "#8B6A3A"],
    benchFrame: "#6B4E28",
    benchSeat: "#9B7443",
    cushions: ["#9B7443", "#5E7A3A", "#C8A24A", "#8B6A3A"],
    tableWood: "#9B7443",
    food: "bread",
    drink: "#8B2E2E",
    signature: "communion",
    overhead: "oil-lamps",
    candlelit: true,
  },
  "manna-house": {
    id: "manna-house",
    scene: "booth",
    wall: "#543D20",
    wallDark: "#38270F",
    wallPanel: "#66492A",
    floor: "#7A5E38",
    floorAlt: "#84663E",
    floorKind: "planks",
    accent: "#E8A84C",
    pale: "#F8ECD8",
    cloth: ["", "#F5EBD0", "#D4883A", "#8B5A24"],
    benchFrame: "#4E3822",
    benchSeat: "#7A5A38",
    cushions: ["#7A5A38", "#7A8B3A", "#D4883A", "#8B5A24"],
    tableWood: "#7A5A38",
    food: "bread",
    drink: "#C8A24A",
    signature: "bread-oven",
    overhead: "bakery-pendants",
    candlelit: true,
  },
  "feast-hall": {
    id: "feast-hall",
    scene: "banquet",
    wall: "#463322",
    wallDark: "#2E2114",
    wallPanel: "#57422A",
    floor: "#5E4E3A",
    floorAlt: "#685740",
    floorKind: "stone",
    accent: "#E0A63F",
    pale: "#F5EAD0",
    cloth: ["", "#F7ECD4", "#7A2E2E", "#4E1E1E"],
    benchFrame: "#5E4A30",
    benchSeat: "#8B6A48",
    cushions: ["#8B6A48", "#7A2E2E", "#96292F", "#4E1E1E"],
    tableWood: "#8B6A48",
    food: "feast",
    drink: "#8B2E2E",
    signature: "goblet-shelf",
    overhead: "banners",
    candlelit: true,
  },
  "banquet-table": {
    id: "banquet-table",
    scene: "banquet",
    // The Marriage Supper: open sky over a green — deep evening blue
    // above, meadow below, white-and-gold cloth.
    wall: "#2A3450",
    wallDark: "#1E2740",
    wallPanel: "#36436A",
    floor: "#3E5A3E",
    floorAlt: "#476647",
    floorKind: "grass",
    accent: "#FFD97A",
    pale: "#F0EDE0",
    cloth: ["", "#F8F4E8", "#FFD97A", "#E8E0C8"],
    benchFrame: "#5E4A30",
    benchSeat: "#8B6A48",
    cushions: ["#8B6A48", "#F8F4E8", "#FFD97A", "#E8E0C8"],
    tableWood: "#8B6A48",
    food: "supper",
    drink: "#FFD97A",
    signature: "garland",
    overhead: "stars",
    candlelit: false,
    outdoor: true,
  },
};

/** The paper config for a cuisine id — unknown ids get the generic
 *  candlelit room (the screen's own fallback behavior, in paper). */
export function paperCuisineFor(cuisine: string): PaperCuisineConfig {
  return PAPER_CUISINES[cuisine] ?? GENERIC;
}

/* ------------------------------------------------------------------ */
/* Progression as data — the kit's contract, per cuisine. Every step   */
/* ADDS paper pieces; scores pin it.                                   */
/* ------------------------------------------------------------------ */

export type PaperRoomDressing = {
  /** Overhead pieces (string-light bulbs, pendants, lanterns, stars). */
  overheadCount: number;
  /** Framed wall art stands (needs the wall-art furniture tier too). */
  wallArt: boolean;
  /** Chandelier for candlelit rooms: 0 none, 1 candle ring, 2 grand. */
  chandelier: 0 | 1 | 2;
  /** Sconce glows on the walls (candlelit rooms at the top level). */
  sconces: boolean;
  /** A rug in the open floor (or garland dressing outdoors) at L3. */
  rug: boolean;
  /** The signature piece grows grander at L3. */
  signatureGrand: boolean;
};

/** Level dressing for a paper restaurant room. Overhead counts grow
 *  with BOTH building level and the string-lights furniture tier —
 *  the drawn rooms behaved the same (overhead appeared from L2 or
 *  with lights bought, and richer at L3). Wall art needs the wall-art
 *  furniture tier, exactly as the drawn CuisineWallDecor did. */
export function paperRoomDressingFor(
  config: PaperCuisineConfig,
  level: number,
  lightsTier: number,
  artTier: number
): PaperRoomDressing {
  const lv = Math.min(Math.max(level, 1), 3);
  const lights = Math.min(Math.max(lightsTier, 0), 3);
  const base = lv >= 3 ? 10 : lv >= 2 ? 7 : lights > 0 ? 5 : 0;
  return {
    // for the burger awning this count is its stripe count — the
    // canopy widens its stripes on the same ladder as the lights
    overheadCount: Math.min(14, base + lights * 2),
    wallArt: artTier >= 1,
    chandelier: config.candlelit ? (lv >= 3 ? 2 : lv >= 2 ? 1 : 0) : 0,
    sconces: config.candlelit && lv >= 3,
    rug: lv >= 3,
    signatureGrand: lv >= 3,
  };
}

export function paperRoomScore(d: PaperRoomDressing): number {
  return (
    d.overheadCount +
    (d.wallArt ? 2 : 0) +
    d.chandelier * 2 +
    (d.sconces ? 2 : 0) +
    (d.rug ? 1 : 0) +
    (d.signatureGrand ? 1 : 0)
  );
}

export type PaperKitchenDressing = {
  /** Counter front: plain planks, paneled wood, then full tile/panel work. */
  front: "planks" | "paneled" | "tiled";
  /** Pots, jars and canisters standing on the counter (2 → 3 → 4). */
  items: number;
  /** A hanging garnish by the counter (garlic, herbs, chili — by cuisine). */
  hanging: boolean;
  /** A row of ready food rides the pass. */
  readyRow: boolean;
  /** Steam curls off the hot pass. */
  steam: boolean;
};

export function paperKitchenFor(kitchenTier: number): PaperKitchenDressing {
  const t = Math.min(Math.max(kitchenTier, 0), 3);
  return {
    front: t >= 2 ? "tiled" : t >= 1 ? "paneled" : "planks",
    items: t >= 3 ? 4 : t >= 1 ? 3 : 2,
    hanging: t >= 2,
    readyRow: t >= 3,
    steam: t >= 1,
  };
}

export function paperKitchenScore(d: PaperKitchenDressing): number {
  return (
    (d.front === "tiled" ? 2 : d.front === "paneled" ? 1 : 0) +
    d.items +
    (d.hanging ? 1 : 0) +
    (d.readyRow ? 1 : 0) +
    (d.steam ? 1 : 0)
  );
}

/** Signature-piece richness by cuisine + level + kitchen tier, as a
 *  piece count — the signature grows structurally (more pies in the
 *  case, a taller bamboo stand, loaves in the oven), never recolors. */
export function paperSignatureCount(config: PaperCuisineConfig, level: number, kitchenTier: number): number {
  const lv = Math.min(Math.max(level, 1), 3);
  const kt = Math.min(Math.max(kitchenTier, 0), 3);
  switch (config.signature) {
    case "pie-case":
      // Pies in the case: 2 → 3 → 4 by level (the drawn PieCase's ladder).
      return lv + 1;
    case "pizza-oven":
      // The pizza joins the oven at kitchen tier 1; the peel at L2.
      return 1 + (kt >= 1 ? 1 : 0) + (lv >= 2 ? 1 : 0);
    case "sushi-counter":
      // Bamboo stands taller at L3; the conveyor plates ride from kt1.
      return 2 + (lv >= 3 ? 1 : 0) + (kt >= 1 ? 1 : 0);
    case "bread-oven":
      // Loaves on the shelf: one more per kitchen tier.
      return 1 + kt;
    case "burger-counter":
      // Menu boards: 2 → 3, and the palms cross from L2.
      return 2 + (lv >= 2 ? 1 : 0) + (lv >= 3 ? 1 : 0);
    case "communion":
      // Cup, then bread, then the full cloth-draped table at L3.
      return 1 + (lv >= 2 ? 1 : 0) + (lv >= 3 ? 1 : 0);
    case "goblet-shelf":
      // Goblets on the shelf: two per level.
      return lv * 2;
    case "garland":
      // Flower clusters in the swag: more per level.
      return 2 + lv;
    case "hearth":
      return 1 + (kt >= 2 ? 1 : 0) + (lv >= 3 ? 1 : 0);
  }
}
