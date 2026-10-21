// ---------- pixel interior kit: data + layout (no React Native) ----------
// The shared brain of the pixel-art interiors (Jonathan's pick, 2026-10-20:
// "100% all of them 8-bit pixel... in a Stardew Valley kind of way").
//
// Everything visual renders from the numbers in this file: room geometry,
// booth placement, and — most importantly — the LEVEL / TIER PROGRESSION
// as data. Higher building level = more booths AND more wall dressing;
// higher furniture tiers = richer tabletops and seating. Rollout phases
// (other restaurants, church, hospital, homes...) reuse these helpers so
// an upgrade reads as the room itself growing, everywhere, the same way.

/** Deterministic string hash (FNV-1a) — stable per person / per tile. */
export function pixelHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Pick from a list by hash — the same choice every render, forever.
 *  The hash is normalized unsigned first: callers pass bit-shifted
 *  hashes (h >> 3), which go negative for half of all inputs, and a
 *  negative index would silently pick undefined. */
export function pixelPick<T>(hash: number, list: readonly T[]): T {
  return list[(hash >>> 0) % list.length];
}

/* ------------------------------------------------------------------ */
/* Room geometry (in pixel units; the renderer scales units -> points) */
/* ------------------------------------------------------------------ */

/** Every pixel room is this many pixel units wide. CHUNK IS THE LOOK
 *  (Jonathan, on v149: "It's certainly not the same as the mockup") —
 *  the grid is deliberately COARSE: at a typical 360pt room width one
 *  unit is ~6pt, so faces, plates and furniture read at arm's length.
 *  Do not raise this without raising every sprite with it: a finer
 *  grid at the same screen width is exactly the muddy miniature v149
 *  shipped. Guard tests pin this value. */
export const PIXEL_ROOM_COLS = 60;

/** Wall + signature + counter stack at the top of the taco room. */
export const WALL_STACK_ROWS = 46;
/** Open floor begins here (bands of booths live below). */
export const FLOOR_TOP = WALL_STACK_ROWS + 2;
/** One band = one booth deep, plus breathing room below it. */
export const BAND_ROWS = 36;
/** Entrance mat + stone border at the room's foot. */
export const ENTRANCE_ROWS = 8;

/** Booth footprint inside a band (local units, authored for the left wall). */
export const BOOTH = {
  w: 23,
  h: 30,
  /** Bench diner sprite anchor (sprite is DINER_W x DINER_H). */
  benchX: 1,
  /** Stool diner sprite anchor. */
  stoolX: 12,
  /** Seat rows for the two seats along the bench (and their stools). */
  seatY: [2, 16] as const,
  /** The table block inside the booth. */
  table: { x: 8, y: 4, w: 11, h: 22 },
} as const;

/** Seated diner sprite size in pixel units. */
export const DINER_W = 11;
export const DINER_H = 14;

/** How many side-by-side bands the floor needs for N tables. */
export function bandCount(tableCount: number): number {
  return Math.max(1, Math.ceil(tableCount / 2));
}

/** Total room height in pixel units for a room with N tables. */
export function roomRows(tableCount: number): number {
  return FLOOR_TOP + bandCount(tableCount) * BAND_ROWS + 2 + ENTRANCE_ROWS;
}

export type BoothSide = "left" | "right";

/** Where table `tableIndex` sits: booths hug the walls, alternating sides,
 *  two tables share a band (one per wall), the next band down hosts the next
 *  pair — the mockup's perimeter seating with an open floor in the middle. */
export function boothForTable(tableIndex: number): { side: BoothSide; band: number; top: number } {
  const band = Math.floor(tableIndex / 2);
  const side: BoothSide = tableIndex % 2 === 0 ? "left" : "right";
  return { side, band, top: FLOOR_TOP + band * BAND_ROWS };
}

/** Room-unit x of a booth's left edge. */
export function boothX(side: BoothSide): number {
  return side === "left" ? 0 : PIXEL_ROOM_COLS - BOOTH.w;
}

export type BoothSeatKind = "bench" | "stool";

/** A diner's sprite anchor (room units) + facing for a seat in a booth.
 *  The authored sprite faces RIGHT: bench diners face the table (inward),
 *  stool diners face the bench (back toward the room's center). */
export function boothSeatPos(
  side: BoothSide,
  kind: BoothSeatKind,
  seatIndex: 0 | 1,
  bandTop: number
): { x: number; y: number; flipX: boolean } {
  const bx = boothX(side);
  const y = bandTop + BOOTH.seatY[seatIndex];
  if (side === "left") {
    return kind === "bench"
      ? { x: bx + BOOTH.benchX, y, flipX: false }
      : { x: bx + BOOTH.stoolX, y, flipX: true };
  }
  // Right wall: the booth is the left booth mirrored.
  const local = kind === "bench" ? BOOTH.benchX : BOOTH.stoolX;
  return { x: bx + (BOOTH.w - local - DINER_W), y, flipX: kind === "bench" };
}

/* ------------------------------------------------------------------ */
/* Progression as data — the "upgrades get the same love" contract.    */
/* Every step is structural (more things in the room), never a recolor.*/
/* ------------------------------------------------------------------ */

export type LevelDressing = {
  /** Drawn menu boards flank the signature arch. */
  menuBoards: boolean;
  /** Sunset stripes on the grill front (2 plain -> 4 rich). */
  grillStripes: number;
  /** Patterned medallion rug in the open floor. */
  rug: boolean;
  /** Potted plants standing in the floor corners (0, 1 or 2). */
  cornerPlants: number;
  /** A barrel joins the dressing (the room is lived-in). */
  barrel: boolean;
  /** Hanging lanterns over the floor (in addition to the top one). */
  extraLanterns: number;
  /** Sombreros hang on the walls (the mockup's dressing) at the top level. */
  sombreros: boolean;
};

export function dressingForLevel(level: number): LevelDressing {
  const lv = Math.min(Math.max(level, 1), 3);
  return {
    menuBoards: lv >= 2,
    grillStripes: lv >= 3 ? 4 : lv >= 2 ? 3 : 2,
    rug: lv >= 3,
    cornerPlants: lv >= 3 ? 2 : lv >= 2 ? 1 : 0,
    barrel: lv >= 2,
    extraLanterns: lv >= 3 ? 2 : lv >= 2 ? 1 : 0,
    sombreros: lv >= 3,
  };
}

export type TableDressing = {
  /** Cups with straws on the table. */
  cups: boolean;
  /** Tacos on the plates + red/green salsa bowls between the seats. */
  food: boolean;
  /** A serving tray rides the table. */
  tray: boolean;
  /** Two-tone fringe along the table's inner edge. */
  fringe: boolean;
};

export function tableDressingFor(tablesTier: number): TableDressing {
  const t = Math.min(Math.max(tablesTier, 0), 3);
  return { cups: t >= 1, food: t >= 2, tray: t >= 3, fringe: t >= 3 };
}

export type BenchStyle = {
  /** Cushion treatment: bare wood, a teal vinyl strip, a full pink
   *  cushion, or the grand tufted back with gold trim. */
  cushion: "wood" | "teal" | "pink" | "grand";
  tufted: boolean;
  goldTrim: boolean;
};

export function benchStyleFor(chairsTier: number): BenchStyle {
  const t = Math.min(Math.max(chairsTier, 0), 3);
  return {
    cushion: t >= 3 ? "grand" : t >= 2 ? "pink" : t >= 1 ? "teal" : "wood",
    tufted: t >= 3,
    goldTrim: t >= 3,
  };
}

export type KitchenDressing = {
  /** The counter front: planks at tier 0, cantina tile from tier 1. */
  tiled: boolean;
  /** Tile rows on the counter front (deeper with tier). */
  tileRows: number;
  /** Canisters standing on the counter slab. */
  canisters: number;
  /** A chili ristra hangs by the pots. */
  ristra: boolean;
  /** A row of ready tacos under the grill. */
  trayRow: boolean;
  /** Steam curls off the grill pass. */
  steam: boolean;
};

export function kitchenDressingFor(kitchenTier: number): KitchenDressing {
  const t = Math.min(Math.max(kitchenTier, 0), 3);
  return {
    tiled: t >= 1,
    tileRows: t >= 2 ? 3 : 2,
    canisters: t >= 3 ? 4 : 3,
    ristra: t >= 2,
    trayRow: t >= 3,
    steam: t >= 1,
  };
}

/* ------------------------------------------------------------------ */
/* Diner looks — deterministic per person (hair / skin / shirt).       */
/* A villager looks the same at every table, every day.                */
/* ------------------------------------------------------------------ */

export type DinerHairStyle = "short" | "long" | "bun";

export type DinerLook = {
  skin: string;
  hair: string;
  hairStyle: DinerHairStyle;
  shirt: string;
  pants: string;
};

export const DINER_SKINS = ["#F5D0A9", "#E8B88A", "#C98B5E", "#9C6644", "#7A4A2B", "#F8DCC0"] as const;
export const DINER_HAIR_COLORS = ["#2B2118", "#6B4423", "#A0522D", "#D9A441", "#8A8D91", "#B5461F", "#3E5C50", "#7B2D8B"] as const;
export const DINER_SHIRTS = ["#C9573F", "#3E7D8C", "#5B8C4A", "#D9A441", "#7B5EA7", "#C26D9C", "#4A6FA5", "#8C4A2F"] as const;
export const DINER_PANTS = ["#3E4A5C", "#5C4633", "#4A3E5C", "#33413A"] as const;
const DINER_HAIR_STYLES: readonly DinerHairStyle[] = ["short", "long", "bun"];

export function dinerLookFor(person: { id: string; accentColor?: string }): DinerLook {
  const h = pixelHash(person.id || "guest");
  return {
    skin: pixelPick(h >> 3, DINER_SKINS),
    hair: pixelPick(h >> 7, DINER_HAIR_COLORS),
    hairStyle: pixelPick(h >> 11, DINER_HAIR_STYLES),
    // Their prayer-light color leads when the person carries one.
    shirt: person.accentColor || pixelPick(h >> 5, DINER_SHIRTS),
    pants: pixelPick(h >> 13, DINER_PANTS),
  };
}
