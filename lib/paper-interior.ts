// ---------- paper interior kit: data + layout (no React Native) ----------
// The shared brain of the PAPER CUTOUT interiors. Jonathan first picked
// 8-bit pixel for the interiors, but after two honest builds (v149's
// muddy miniature, v151's chunk pass) his verdict stood: code-drawn
// pixel rooms don't reach the painted mockups — booths became slabs,
// diners shrank, the palette stayed murky. He proposed the paper one
// himself ("Maybe we should just try the paper one?") — the diorama
// mockup he loved, and the style already slated for the School Campus.
// Paper is now the direction for EVERY interior; the Taco Stand is the
// proof, and the pixel kit stays in the repo shelved, untouched.
//
// Everything visual renders from the numbers in this file: room
// geometry, booth placement, and — most importantly — the LEVEL / TIER
// PROGRESSION as data. Higher building level = more pieces pinned into
// the room; higher furniture tiers = richer tabletops and seating. The
// ladders deliberately mirror the pixel kit's data model (same shapes,
// paper fields), so a room's growth reads the same in either kit.
// Rollout rooms reuse these helpers so an upgrade grows every room the
// same way.

/** Deterministic string hash (FNV-1a) — stable per person / per tile. */
export function paperHash(s: string): number {
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
export function paperPick<T>(hash: number, list: readonly T[]): T {
  return list[(hash >>> 0) % list.length];
}

/* ------------------------------------------------------------------ */
/* Room geometry (in paper units; the renderer scales units -> points)*/
/* ------------------------------------------------------------------ */

/** Every paper room is this many paper units wide. The unit is a
 *  drawing unit, not a pixel: shapes are smooth paper pieces, so the
 *  grid can be finer than the pixel kit's — what keeps people BIG is
 *  FIGURE_W below, pinned by guard tests. */
export const PAPER_ROOM_COLS = 100;

/** Wall + arch + hood + counter stack at the top of the taco room. */
export const WALL_STACK_ROWS = 54;
/** Open floor begins here (bands of booths live below). */
export const FLOOR_TOP = WALL_STACK_ROWS + 2;
/** One band = one booth deep, plus breathing room below it. */
export const BAND_ROWS = 36;
/** Entrance threshold + mat at the room's foot. */
export const ENTRANCE_ROWS = 10;

/** A seated paper figure's footprint. PEOPLE ARE LARGE in the paper
 *  mockup — a diner's head alone is a plate's width — so the figure
 *  spans 12% of the room's width. Guard tests pin this: if figures
 *  shrink relative to the room, the diorama feel dies with them. */
export const FIGURE_W = 12;
export const FIGURE_H = 14;

/** Booth footprint inside a band (local units, authored for the left
 *  wall). A booth is a bench against the wall + a table in front of
 *  it + stools on the room side — furniture hugs the wall and the
 *  floor's middle stays open. Two booths (one per wall) take 66 of
 *  100 units, leaving a real aisle: booths must never become the
 *  monolith slabs the v151 pixel room shipped. */
export const BOOTH = {
  w: 33,
  h: 32,
  /** Bench diner figure anchor. */
  benchX: 2.5,
  /** Stool diner figure anchor. */
  stoolX: 21,
  /** Seat rows for the two seats along the bench (and their stools). */
  seatY: [3, 19] as const,
  /** The table block inside the booth. */
  table: { x: 12, y: 4, w: 12, h: 26 },
} as const;

/** How many side-by-side bands the floor needs for N tables. */
export function bandCount(tableCount: number): number {
  return Math.max(1, Math.ceil(tableCount / 2));
}

/** Total room height in paper units for a room with N tables. */
export function roomRows(tableCount: number): number {
  return FLOOR_TOP + bandCount(tableCount) * BAND_ROWS + 2 + ENTRANCE_ROWS;
}

export type BoothSide = "left" | "right";

/** Where table `tableIndex` sits: booths hug the walls, alternating
 *  sides, two tables share a band (one per wall), the next band down
 *  hosts the next pair — perimeter seating, open floor in the middle. */
export function boothForTable(tableIndex: number): { side: BoothSide; band: number; top: number } {
  const band = Math.floor(tableIndex / 2);
  const side: BoothSide = tableIndex % 2 === 0 ? "left" : "right";
  return { side, band, top: FLOOR_TOP + band * BAND_ROWS };
}

/** Room-unit x of a booth's left edge. */
export function boothX(side: BoothSide): number {
  return side === "left" ? 0 : PAPER_ROOM_COLS - BOOTH.w;
}

export type BoothSeatKind = "bench" | "stool";

/** A diner's figure anchor (room units) + facing for a seat in a
 *  booth. The authored figure faces RIGHT: bench diners face the
 *  table (inward), stool diners face the bench (back toward the
 *  room's center). */
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
  return { x: bx + (BOOTH.w - local - FIGURE_W), y, flipX: kind === "bench" };
}

/* ------------------------------------------------------------------ */
/* Progression as data — the "upgrades get the same love" contract.    */
/* Every step is structural (more paper pieces in the room), never a   */
/* mere recolor. Field shapes mirror the shelved pixel kit's ladders.  */
/* ------------------------------------------------------------------ */

export type LevelDressing = {
  /** Drawn menu boards flank the signature arch. */
  menuBoards: boolean;
  /** Sunset stripes on the grill hood (2 plain -> 4 rich). */
  hoodStripes: number;
  /** Patterned medallion rug in the open floor. */
  rug: boolean;
  /** Potted cacti standing in the floor corners (0, 1 or 2). */
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
    hoodStripes: lv >= 3 ? 4 : lv >= 2 ? 3 : 2,
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
  /** Paper fringe along the table's inner edge. */
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
  /** A row of ready tacos on the slab. */
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

/** A rough "how many distinct pieces exist in the room" score for a
 *  dressing set — the ladders' monotonicity contract, as data. Each
 *  level / tier must ADD pieces, never just swap colors. Guard tests
 *  pin the scores strictly rising. */
export function levelPieceScore(d: LevelDressing): number {
  return (
    (d.menuBoards ? 2 : 0) +
    d.hoodStripes +
    (d.rug ? 1 : 0) +
    d.cornerPlants +
    (d.barrel ? 1 : 0) +
    d.extraLanterns +
    (d.sombreros ? 2 : 0)
  );
}

export function tablePieceScore(d: TableDressing): number {
  return (d.cups ? 1 : 0) + (d.food ? 2 : 0) + (d.tray ? 1 : 0) + (d.fringe ? 1 : 0);
}

export function benchPieceScore(d: BenchStyle): number {
  // The cushion itself grows by material: a teal strip (1) is less
  // paper than a full pink cushion panel (2), which is less than the
  // grand tufted back (3) — plus its buttons and gold trim.
  const cushion = d.cushion === "grand" ? 3 : d.cushion === "pink" ? 2 : d.cushion === "teal" ? 1 : 0;
  return cushion + (d.tufted ? 1 : 0) + (d.goldTrim ? 1 : 0);
}

export function kitchenPieceScore(d: KitchenDressing): number {
  return (
    (d.tiled ? d.tileRows : 0) + d.canisters + (d.ristra ? 1 : 0) + (d.trayRow ? 1 : 0) + (d.steam ? 1 : 0)
  );
}

/* ------------------------------------------------------------------ */
/* Diner looks — deterministic per person (hair / skin / shirt).       */
/* A villager looks the same at every table, every day. The paper      */
/* figures are smooth shapes, but the look DATA is the pixel kit's:    */
/* the same palettes, the same hash, so a person keeps their colors    */
/* across the style pivot.                                             */
/* ------------------------------------------------------------------ */

export type PaperHairStyle = "short" | "long" | "bun";

export type PaperDinerLook = {
  skin: string;
  hair: string;
  hairStyle: PaperHairStyle;
  shirt: string;
  pants: string;
};

export const PAPER_DINER_SKINS = ["#F5D0A9", "#E8B88A", "#C98B5E", "#9C6644", "#7A4A2B", "#F8DCC0"] as const;
export const PAPER_DINER_HAIR_COLORS = ["#2B2118", "#6B4423", "#A0522D", "#D9A441", "#8A8D91", "#B5461F", "#3E5C50", "#7B2D8B"] as const;
export const PAPER_DINER_SHIRTS = ["#C9573F", "#3E7D8C", "#5B8C4A", "#D9A441", "#7B5EA7", "#C26D9C", "#4A6FA5", "#8C4A2F"] as const;
export const PAPER_DINER_PANTS = ["#3E4A5C", "#5C4633", "#4A3E5C", "#33413A"] as const;
const PAPER_HAIR_STYLES: readonly PaperHairStyle[] = ["short", "long", "bun"];

export function paperDinerLookFor(person: { id: string; accentColor?: string }): PaperDinerLook {
  const h = paperHash(person.id || "guest");
  return {
    skin: paperPick(h >> 3, PAPER_DINER_SKINS),
    hair: paperPick(h >> 7, PAPER_DINER_HAIR_COLORS),
    hairStyle: paperPick(h >> 11, PAPER_HAIR_STYLES),
    // Their prayer-light color leads when the person carries one.
    shirt: person.accentColor || paperPick(h >> 5, PAPER_DINER_SHIRTS),
    pants: paperPick(h >> 13, PAPER_DINER_PANTS),
  };
}
