// ─────────────────────────────────────────────────────────────────────────────
// v291 — The Walkable Town, Part 2: The Wide Street.
// v333 — THE HOMETOWN REBUILD: the town's STAGE, rebuilt whole.
//
// Jonathan rejected the town's look four times (v285, v307 twice,
// v327). The fourth shot (Oct 29 07:57, on v331) still showed flat
// slabs and a straight road, and he authorized a complete rebuild
// (Oct 29 07:59): "If it has to be completely rebuilt, so be it."
// The root cause, found by measuring the approved drawing
// (hometown-street-concepts-v1.html, Concept 2 — The Diorama, with
// Concept 3's gathering corner borrowed at the board) against the
// shipped town: the drawing is a FIXED single-frame stage, 11
// columns × 16 rows, while the shipped town was a roster-width
// scrolling world whose width grew with every home. No rendering
// pass could close that gap. v333 closes it in the derivation:
// the stage is fixed, and the existing place population is seated
// on it.
//
// What v333 changes is the STAGE GEOMETRY and its rendering only.
// Every mechanic and interaction carries over exactly: BFS
// tap-to-walk and tap-to-open, the café as sole producer with its
// coins WAITING at the register pile, the mine and Dark Forest
// interiors behind their fronts, the era system re-seated on the
// new geometry, and the migration below — untouched. The canonical
// ledger (lib/hometown.ts) is untouched; this module remains a
// DERIVATION over the book of record and writes nothing back,
// except the retirement migration, which runs through the record
// as it always has.
//
// The stage (tile space, STREET_W × STREET_H, aspect 2:3):
//   - rows 0–3 are the sky/hill band; rows 4–15 the ground plane.
//   - the lane is the drawing's vector path through LANE_POINTS
//     (normalised stage fractions), climbing from the river at the
//     bottom-left to the hill at the top-right; a tile is street
//     when its centre falls within the path's half-width.
//   - the river is an in-world band across the FULL stage width
//     at the bottom (row 15); the lane's south end runs into it.
//   - the forest is individual trees on the hill baseline at the
//     west; the mine is one hill at the east, its seat fixed.
//   - two strata only: back building bases at row 6.0 (37.5%),
//     front bases at row 10.35 (64.7%). His House stands back,
//     first (west); the café stands front, first (west); the Town
//     Shop is a real place on the front stratum; household homes
//     are cottages dealt along both strata — ALL of them on the
//     one frame, whatever the roster. The remaining gates stand
//     where the drawing's ground leaves room: the schoolhouse on
//     the back stratum, the Mission Field gate beside the board,
//     the well, the garden gate, the river gate and the two open
//     lots along the riverbank.
//   - the Missions board stands mid-stage; the gathering corner
//     is a paved widening of the lane at its feet (rows 11–12),
//     with assigned villager stand-points inside it.
// ─────────────────────────────────────────────────────────────────────────────

import {
  BUILDINGS,
  TOWN_LANDMARKS,
  cafeAnchorDiner,
  type MapState,
  type PlacedBuilding,
  type TownLandmark,
  type TownState,
} from "./hometown";
import type { WalkTile } from "./walkable-town";

// ── Geometry ────────────────────────────────────────────────────────────────

/** The stage's width in tiles — fixed, whatever the roster. */
export const STREET_W = 11;
/** The stage's height in tiles: sky/hill band, two strata, the
 *  climbing lane, the riverbank, the river. */
export const STREET_H = 16;
/** Legacy export: the old places' three-tile stature. v333 places
 *  carry their own drawn heights; nothing sizes by this anymore. */
export const STREET_PLACE_H = 3;

/** The drawing's stage, in its own units (360 × 540). Tile-space
 *  distances are measured here so the lane's widths are the
 *  drawing's widths, not tile-space approximations. */
const DRAW_W = 360;
const DRAW_H = 540;

/** The lane's centreline, as normalised stage fractions (x of
 *  stage width, y of stage height) — the drawing's path, point for
 *  point. The street view draws this same polyline, so the picture
 *  and the pathing can never draw different streets. */
export const LANE_POINTS: ReadonlyArray<readonly [number, number]> = [
  [0.06, 1.0],
  [0.15, 0.935],
  [0.25, 0.86],
  [0.35, 0.784],
  [0.45, 0.715],
  [0.55, 0.652],
  [0.65, 0.553],
  [0.75, 0.451],
  [0.86, 0.385],
];

/** Half the lane's outer width, in drawing units (0.16 × 360 / 2):
 *  a tile is street when its centre falls within this of the path. */
const LANE_HALF_DU = 28.8;

/** The lane centreline's y (a stage-height fraction) at a stage-
 *  width fraction: linear along the drawing's points, extrapolated
 *  along the end segments outside them. */
function laneCenterYAtFrac(xFrac: number): number {
  const pts = LANE_POINTS;
  if (xFrac <= pts[0][0]) {
    const [x0, y0] = pts[0];
    const [x1, y1] = pts[1];
    return y0 + ((xFrac - x0) / (x1 - x0)) * (y1 - y0);
  }
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    if (xFrac <= x1) return y0 + ((xFrac - x0) / (x1 - x0)) * (y1 - y0);
  }
  const [xa, ya] = pts[pts.length - 2];
  const [xb, yb] = pts[pts.length - 1];
  return yb + ((xFrac - xb) / (xb - xa)) * (yb - ya);
}

/** The lane centreline's ROW at tile column `tileX` (fractional —
 *  the centreline runs between rows as often as on them). This is
 *  the measured contract: columns 1–9 read 15.1, 14.0, 12.9, 11.9,
 *  11.0, 9.9, 8.3, 6.9, 6.1 (±0.5). */
export function laneCenterRowAt(tileX: number): number {
  return laneCenterYAtFrac((tileX + 0.5) / STREET_W) * STREET_H;
}

/**
 * Compat wrapper (the v327 name): the lane centreline's row at
 * column `x` of a world `w` wide — under the fixed stage this is
 * the same centreline, sampled by fraction so any caller still
 * reads the one true lane.
 */
export function dioramaCenterY(x: number, w: number): number {
  if (w <= 0) return laneCenterRowAt(5);
  return laneCenterYAtFrac((x + 0.5) / w) * STREET_H;
}

/** The walkable band's rows at a column, around the centreline. */
export function streetBandRows(x: number, w: number): [number, number] {
  const c = dioramaCenterY(x, w);
  return [Math.floor(c - 0.9), Math.ceil(c + 0.9)];
}

/** Distance from a drawing-units point to the lane polyline. */
function laneDistDu(px: number, py: number): number {
  let best = Infinity;
  for (let i = 0; i + 1 < LANE_POINTS.length; i++) {
    const ax = LANE_POINTS[i][0] * DRAW_W;
    const ay = LANE_POINTS[i][1] * DRAW_H;
    const bx = LANE_POINTS[i + 1][0] * DRAW_W;
    const by = LANE_POINTS[i + 1][1] * DRAW_H;
    const vx = bx - ax;
    const vy = by - ay;
    const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)));
    const dx = px - (ax + t * vx);
    const dy = py - (ay + t * vy);
    const d = Math.hypot(dx, dy);
    if (d < best) best = d;
  }
  return best;
}

/** A tile is lane (street) when its centre falls within the
 *  path's half-width — the R3 rule, measured in drawing units. */
export function isLaneTile(tx: number, ty: number): boolean {
  const cx = ((tx + 0.5) * DRAW_W) / STREET_W;
  const cy = ((ty + 0.5) * DRAW_H) / STREET_H;
  return laneDistDu(cx, cy) <= LANE_HALF_DU;
}

/** The river: one in-world band across the full stage width at
 *  the bottom — top edge at 93.75% of stage height, bottom at
 *  100%. Blocked ground; drawn by the street view from this same
 *  rect, so the picture and the pathing can never disagree. */
export const RIVER_RECTS: ReadonlyArray<{ x: number; y: number; w: number; h: number }> = [
  { x: 0, y: STREET_H - 1, w: STREET_W, h: 1 },
];

/** The two strata's base rows (building foundations). */
const BACK_BASE = 6.0; // 37.5% of stage height
const FRONT_BASE = 10.35; // 64.7% of stage height
/** Door rows: the first walkable row at each stratum's feet. */
const BACK_DOOR_ROW = 6;
const FRONT_DOOR_ROW = 11;

const keyOf = (x: number, y: number) => `${x},${y}`;

// ── Places ──────────────────────────────────────────────────────────────────

export type StreetPlaceKind =
  | "cafe"
  | "mine"
  | "forest"
  | "house"
  | "home"
  | "gate"
  | "shop"
  | "empty-lot"
  | "board";

export type StreetPlace = {
  kind: StreetPlaceKind;
  /** The record building this place IS (identity), when it has one. */
  buildingId?: string;
  buildingType?: PlacedBuilding["type"];
  /** The town landmark this gate opens, for gate places. */
  landmark?: TownLandmark;
  /** Tile-space rect (fractional under the fixed stage): the
   *  place's drawn footprint, roof apex to foundation. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** The walkable tile in front of the place's door. A door tile
   *  is never blocked — every door stands on walkable ground. */
  door: WalkTile;
  /** Which stratum the place stands on (the bank and hill places
   *  report "front"; only the two strata carry buildings). */
  depth: "front" | "back";
  /** The whole plot the place stands on: footprint plus its yard.
   *  Yards are ground (a soft tint), never bordered rectangles,
   *  and never deeper than 2.2 rows in total. */
  plot: { x: number; y: number; w: number; h: number };
  /** The path tiles from the place's door to the lane — drawn as
   *  the door's path and walked as street. A place whose door
   *  already stands on open ground carries its door alone. */
  spur: WalkTile[];
  /** Tiles this place makes solid beyond the shared rules (the
   *  board's feet). Buildings derive theirs from their walls. */
  solidTiles?: WalkTile[];
  /** Accessibility name — and, where the composition names a
   *  place, the word its drawn plaque speaks (see `plaque`). */
  label: string;
  /** The name plaque the street draws under this place, in full —
   *  sized by its text, never clipped. Places the drawing leaves
   *  unnamed (homes, the forest, the lots) carry none; the board's
   *  name rides its own chip instead. */
  plaque?: string;
  /** The fast-week lot (v279's roped ground), worn by one empty lot
   *  once a fast week has opened it. */
  weekLot?: boolean;
};

export type StreetWorld = {
  /** Stage width in tiles — always STREET_W (the fixed stage). */
  w: number;
  h: number;
  places: StreetPlace[];
  /** Tiles nothing may stand on: building walls, the treeline,
   *  the river, the hill band, the board's feet — minus every
   *  place's door tile, which is never blocked. */
  blocked: Set<string>;
  /** The road network the pawn and villagers path along: the lane
   *  band end to end, every spur, the gathering corner, every
   *  door. */
  roads: WalkTile[];
  cafe: StreetPlace | null;
  /** The Missions board's place, mid-stage. */
  board: StreetPlace | null;
  /** The gathering corner: the lane's paved widening at the
   *  board's feet — six columns × two rows of open street. */
  corner: { x: number; y: number; w: number; h: number };
  /** The forest as individual trees (tile units: x = centre,
   *  y = base row, s = height in rows) — no forest place-rect of
   *  trees is ever drawn; these ARE the forest's picture. */
  forestTrees: Array<{ x: number; y: number; s: number }>;
  /** Assigned villager stand-points inside the gathering corner
   *  (≥3 whenever the corner's doors leave room, which they do):
   *  idle seats, in addition to strolling. */
  cornerStands: WalkTile[];
  /** The anchor diner's id, or null until a diner stands. */
  cafeBuildingId: string | null;
  /** Coins waiting at the café's register: the anchor diner's pile
   *  plus any migrated sum still waiting for a diner to land on. */
  cafePile: number;
};

/** The forest's trees: individual pines on the hill baseline
 *  (bases at rows 3.80–3.90 — y ≈ 23.8–24.4% of stage height —
 *  heights 1.30–1.90 rows, 8.1–11.9% of stage height, all within
 *  the west 27% of the stage, nothing below y = 30%). */
const FOREST_TREES: Array<{ x: number; y: number; s: number }> = [
  { x: 0.45, y: 3.82, s: 1.75 },
  { x: 1.05, y: 3.88, s: 1.45 },
  { x: 1.65, y: 3.8, s: 1.9 },
  { x: 2.25, y: 3.9, s: 1.3 },
  { x: 2.7, y: 3.84, s: 1.6 },
];

/** The mine's seat — fixed, whatever else the roster seats: one
 *  hill, apex at (0.83, 0.06) as its art peaks, base at row 3.84
 *  (24%), spanning x 0.664–0.99 of the stage. */
const MINE_RECT = { x: 7.3, y: 0.97, w: 3.6, h: 2.87 };
const MINE_DOOR: WalkTile = { x: 10, y: 6 };

type RowSeat = {
  kind: "house" | "cafe" | "shop" | "home" | "gate";
  building?: PlacedBuilding | null;
  landmark?: TownLandmark;
  /** Drawn width in tiles (homes are dealt theirs by the pack). */
  w: number;
  /** Drawn height in tiles. */
  h: number;
};

/**
 * Pack one stratum's seats west→east across a span: fixed-width
 * seats keep their drawn widths; the homes share what remains at
 * an even pitch (capped at 1.6 tiles wide — beyond that the slack
 * simply falls to the span's east end). Returns each seat's x and
 * dealt width. This is what lets every home stand on the one
 * frame: the cottages narrow, the stage never widens.
 */
function packRow(
  seats: RowSeat[],
  spanStart: number,
  spanEnd: number
): Array<{ seat: RowSeat; x: number; w: number }> {
  const GAP = 0.12;
  const homes = seats.filter((s) => s.kind === "home").length;
  const fixed = seats.reduce((sum, s) => sum + (s.kind === "home" ? 0 : s.w), 0);
  const gaps = GAP * Math.max(0, seats.length - 1);
  const avail = spanEnd - spanStart - fixed - gaps;
  const homeW = homes > 0 ? Math.max(0.3, Math.min(1.6, avail / homes)) : 0;
  let cx = spanStart;
  return seats.map((seat) => {
    const w = seat.kind === "home" ? homeW : seat.w;
    const x = cx;
    cx += w + GAP;
    return { seat, x, w };
  });
}

/** A stratum place from its packed seat: foundation on the base
 *  row, door on the door row at the seat's heart (the café's door
 *  rides east, as drawn), yard plot behind the footprint. */
function strataPlace(
  seat: RowSeat,
  x: number,
  w: number,
  base: number,
  doorRow: number
): StreetPlace {
  const h = seat.h;
  const y = base - h;
  const doorX =
    seat.kind === "cafe"
      ? Math.floor(x + w * 0.85)
      : Math.floor(x + w / 2);
  const door: WalkTile = {
    x: Math.max(0, Math.min(STREET_W - 1, doorX)),
    y: doorRow,
  };
  // The plot: footprint + yard, ≤ 2.2 rows deep in total (R9).
  const yardH = Math.min(1.7, h * 0.55);
  const plot = { x: x - 0.15, y: base - yardH, w: w + 0.3, h: yardH + 0.45 };
  const baseFields = {
    x,
    y,
    w,
    h,
    door,
    depth: (base === BACK_BASE ? "back" : "front") as "front" | "back",
    plot,
    spur: [{ ...door }],
  };
  switch (seat.kind) {
    case "house":
      return {
        ...baseFields,
        kind: "house",
        buildingId: seat.building!.id,
        buildingType: seat.building!.type,
        label: "His House",
        plaque: "His House",
      };
    case "cafe":
      return {
        ...baseFields,
        kind: "cafe",
        buildingId: seat.building?.id,
        buildingType: seat.building?.type,
        label: "The Café",
        plaque: "Café",
      };
    case "shop":
      return { ...baseFields, kind: "shop", label: "Town Shop", plaque: "Town Shop" };
    case "home":
      return {
        ...baseFields,
        kind: "home",
        buildingId: seat.building!.id,
        buildingType: seat.building!.type,
        label: BUILDINGS[seat.building!.type].name,
      };
    case "gate":
      return {
        ...baseFields,
        kind: "gate",
        landmark: seat.landmark,
        label: seat.landmark!.name,
        plaque: seat.landmark!.name,
      };
  }
}

/** A gate or lot standing on the riverbank (or, for the Mission
 *  Field, beside the board): a plain rect place, door on the bank
 *  row in front of it. */
function bankPlace(fields: {
  kind: "gate" | "empty-lot";
  landmark?: TownLandmark;
  rect: { x: number; y: number; w: number; h: number };
  door: WalkTile;
}): StreetPlace {
  const { rect, door } = fields;
  return {
    kind: fields.kind,
    landmark: fields.landmark,
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h,
    door,
    depth: "front",
    plot: { ...rect },
    spur: [{ ...door }],
    label: fields.landmark ? fields.landmark.name : "Open ground",
    plaque: fields.landmark ? fields.landmark.name : undefined,
  };
}

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function streetInBounds(world: { w: number; h: number }, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < world.w && y < world.h;
}

/**
 * Derive the fixed stage from the town record. Deterministic: the
 * same record always derives the same stage. Homes are the
 * record's villager cottages and houses in (y, x, id) reading
 * order — the order cottageResidents deals by, so a villager's
 * street home is the cottage the record says is theirs — dealt
 * even-index to the back stratum, odd to the front.
 */
export function deriveStreetWorld(
  map: MapState,
  opts: { pendingRegister?: number; weekLots?: number } = {}
): StreetWorld {
  const pendingRegister = opts.pendingRegister ?? 0;
  const anchor = cafeAnchorDiner(map);
  const heroHouse =
    map.buildings
      .filter((b) => b.type === "pawn-house")
      .sort((a, b) => a.y - b.y || a.x - b.x || (a.id < b.id ? -1 : 1))[0] ?? null;
  const homes = map.buildings
    .filter((b) => b.type === "villager-cottage" || b.type === "house")
    .sort((a, b) => a.y - b.y || a.x - b.x || (a.id < b.id ? -1 : 1));
  const homesBack = homes.filter((_, i) => i % 2 === 0);
  const homesFront = homes.filter((_, i) => i % 2 === 1);
  const gateById = (id: string) => TOWN_LANDMARKS.find((l) => l.id === id)!;
  const schoolGate = gateById("landmark-school");
  const missionGate = gateById("landmark-mission");
  const wellGate = gateById("landmark-well");
  const gardenGate = gateById("landmark-garden");
  const riverGate = gateById("landmark-river");

  const places: StreetPlace[] = [];

  // The forest: individual trees on the hill baseline at the west.
  // Its place is the treeline itself — the doorstep is the
  // treeline's foot, and tapping it opens the forest interior.
  const forestDoor: WalkTile = { x: 0, y: 4 };
  places.push({
    kind: "forest",
    x: 0,
    y: 1.9,
    w: 2.97,
    h: 1.95,
    door: forestDoor,
    depth: "front",
    plot: { x: 0, y: 1.9, w: 2.97, h: 1.95 },
    spur: [{ ...forestDoor }],
    label: "Dark Forest",
  });

  // The back stratum (bases at row 6.0): His House first (west),
  // then the cottages with the schoolhouse gate dealt among them.
  // The span leaves the west columns open under the trees (the
  // forest's doorstep) and keeps cottages off the mine's spur.
  {
    const seats: RowSeat[] = [];
    if (heroHouse) seats.push({ kind: "house", building: heroHouse, w: 2.95, h: 2.67 });
    const gateSeats: RowSeat[] = [{ kind: "gate", landmark: schoolGate, w: 1.1, h: 2.3 }];
    const n = Math.max(homesBack.length, gateSeats.length);
    for (let i = 0; i < n; i++) {
      if (i < homesBack.length) seats.push({ kind: "home", building: homesBack[i], w: 0, h: 1.92 });
      if (i < gateSeats.length) seats.push(gateSeats[i]);
    }
    for (const { seat, x, w } of packRow(seats, 1.15, 9.9)) {
      places.push(strataPlace(seat, x, w, BACK_BASE, BACK_DOOR_ROW));
    }
  }

  // The mine hill at the east — its seat never moves.
  places.push({
    kind: "mine",
    x: MINE_RECT.x,
    y: MINE_RECT.y,
    w: MINE_RECT.w,
    h: MINE_RECT.h,
    door: { ...MINE_DOOR },
    depth: "front",
    plot: { ...MINE_RECT },
    spur: [
      { x: 10, y: 4 },
      { x: 10, y: 5 },
      { ...MINE_DOOR },
    ],
    label: "The Mine",
    plaque: "The Mine",
  });

  // The Missions board, mid-stage (centre (0.53, 0.50) of the
  // stage): its feet are solid; its doorstep is the open ground
  // at its south edge, on the lane's reach there.
  const boardDoor: WalkTile = { x: 5, y: 10 };
  const board: StreetPlace = {
    kind: "board",
    x: 4.71,
    y: 7.23,
    w: 2.32,
    h: 1.92,
    door: boardDoor,
    depth: "front",
    plot: { x: 4.71, y: 7.23, w: 2.32, h: 1.92 },
    spur: [{ ...boardDoor }],
    solidTiles: [
      { x: 5, y: 7 },
      { x: 6, y: 7 },
      { x: 5, y: 8 },
      { x: 6, y: 8 },
    ],
    label: "Missions",
  };
  places.push(board);

  // The front stratum (bases at row 10.35): the café first (west),
  // the cottages after it, the Town Shop last (east) — a real
  // place with the drawing's shop front.
  {
    const seats: RowSeat[] = [
      { kind: "cafe", building: anchor, w: 3.54, h: 3.73 },
      ...homesFront.map(
        (building) => ({ kind: "home", building, w: 0, h: 1.92 }) as RowSeat
      ),
      { kind: "shop", w: 3.05, h: 3.26 },
    ];
    for (const { seat, x, w } of packRow(seats, 0.15, 10.85)) {
      places.push(strataPlace(seat, x, w, FRONT_BASE, FRONT_DOOR_ROW));
    }
  }

  // The Mission Field gate beside the board, its pole clearing
  // the shop's west post; its doorstep stands on the lane.
  places.push(
    bankPlace({
      kind: "gate",
      landmark: missionGate,
      rect: { x: 7.08, y: 7.8, w: 0.82, h: 1.5 },
      door: { x: 7, y: 10 },
    })
  );

  // The riverbank (bases at the water's edge, row 15): the well,
  // the two open lots (Garden Tending west, Tide Pools east — the
  // screen deals the games to the lots in x order), the garden
  // gate, the river gate.
  const weekLot = (opts.weekLots ?? 0) >= 1;
  places.push(
    bankPlace({ kind: "gate", landmark: wellGate, rect: { x: 3.6, y: 13.35, w: 0.9, h: 1.5 }, door: { x: 4, y: 14 } })
  );
  const gardenLot = bankPlace({
    kind: "empty-lot",
    rect: { x: 5.0, y: 13.45, w: 1.7, h: 1.45 },
    door: { x: 5, y: 14 },
  });
  if (weekLot) gardenLot.weekLot = true;
  places.push(gardenLot);
  places.push(
    bankPlace({ kind: "empty-lot", rect: { x: 6.95, y: 13.45, w: 1.7, h: 1.45 }, door: { x: 7, y: 14 } })
  );
  places.push(
    bankPlace({ kind: "gate", landmark: gardenGate, rect: { x: 8.8, y: 13.25, w: 0.95, h: 1.6 }, door: { x: 9, y: 14 } })
  );
  places.push(
    bankPlace({ kind: "gate", landmark: riverGate, rect: { x: 9.9, y: 13.4, w: 1.0, h: 1.5 }, door: { x: 10, y: 14 } })
  );

  // ── Solidity ──────────────────────────────────────────────────
  // Walls block; roofs don't (pawns walk behind a roof, depth-
  // sorted — which is what lets His House's path thread east of
  // the café, as the drawing draws it). Small gates, the mine and
  // the treeline block whole; the board blocks its feet; lots are
  // open ground. The hill band (rows 0–3) and the river block
  // whole. A door tile is NEVER blocked.
  const solid = new Set<string>();
  const addRectTiles = (r: { x: number; y: number; w: number; h: number }) => {
    for (let tx = Math.floor(r.x); tx < Math.ceil(r.x + r.w); tx++) {
      for (let ty = Math.floor(r.y); ty < Math.ceil(r.y + r.h); ty++) {
        if (tx < r.x + r.w && tx + 1 > r.x && ty < r.y + r.h && ty + 1 > r.y) {
          if (tx >= 0 && tx < STREET_W && ty >= 0 && ty < STREET_H) solid.add(keyOf(tx, ty));
        }
      }
    }
  };
  for (let tx = 0; tx < STREET_W; tx++) {
    for (let ty = 0; ty < 4; ty++) solid.add(keyOf(tx, ty));
  }
  for (const r of RIVER_RECTS) addRectTiles(r);
  for (const p of places) {
    if (p.solidTiles) {
      for (const t of p.solidTiles) solid.add(keyOf(t.x, t.y));
      continue;
    }
    switch (p.kind) {
      case "empty-lot":
        break; // open ground
      case "forest":
      case "mine":
        addRectTiles(p);
        break;
      case "gate":
        // A gate is posts and an arch: it blocks only the ground
        // NORTH of its door row — its doorstep row stays open, so
        // a gate never walls off its own door (the bank gates'
        // doors sit inside their rects' south reach).
        addRectTiles({ x: p.x, y: p.y, w: p.w, h: Math.max(0, p.door.y - p.y) });
        break;
      default:
        // buildings: the walls (lower 60%) block; the roof doesn't
        addRectTiles({ x: p.x + p.w * 0.06, y: p.y + p.h * 0.4, w: p.w * 0.88, h: p.h * 0.6 });
    }
  }
  const doorKeys = new Set(places.map((p) => keyOf(p.door.x, p.door.y)));
  const blocked = new Set<string>();
  for (const k of solid) if (!doorKeys.has(k)) blocked.add(k);
  // The lane is the town's circulation: it is NEVER walled off.
  // Where the lane's climb crosses a front cottage's wall band
  // (the roster seats cottages across the bend the drawing leaves
  // open), the lane runs in front of the foundation, as drawn —
  // the alternative is a sealed town. The river row stays water:
  // the lane terminates into it, it does not cross it.
  for (let tx = 0; tx < STREET_W; tx++) {
    for (let ty = 0; ty < STREET_H - 1; ty++) {
      if (isLaneTile(tx, ty)) blocked.delete(keyOf(tx, ty));
    }
  }

  const dims = { w: STREET_W, h: STREET_H };
  const walkable = (t: WalkTile) => streetInBounds(dims, t.x, t.y) && !blocked.has(keyOf(t.x, t.y));

  // ── Spurs ─────────────────────────────────────────────────────
  // Every stratum door gets its drawn path to the lane: the
  // shortest walk over open ground (BFS, deterministic neighbour
  // order), door and lane tile included. His House's spur is long
  // — the drawing draws it long, threading behind the café's roof;
  // the lane-side doors' spurs are a tile or two. The forest, the
  // board, the mission gate and the bank places stand on open
  // ground already: their spur is their doorstep alone.
  const bfsSpur = (door: WalkTile): WalkTile[] => {
    if (isLaneTile(door.x, door.y)) return [{ ...door }];
    const prev = new Map<string, string | null>([[keyOf(door.x, door.y), null]]);
    const queue: WalkTile[] = [{ ...door }];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const [dx, dy] of DIRS) {
        const n = { x: cur.x + dx, y: cur.y + dy };
        if (!walkable(n)) continue;
        const k = keyOf(n.x, n.y);
        if (prev.has(k)) continue;
        prev.set(k, keyOf(cur.x, cur.y));
        if (isLaneTile(n.x, n.y)) {
          const rev: WalkTile[] = [{ ...n }];
          let cursor: string | null = prev.get(k) ?? null;
          while (cursor) {
            const [cx, cy] = cursor.split(",").map(Number);
            rev.unshift({ x: cx, y: cy });
            cursor = prev.get(cursor) ?? null;
          }
          return rev;
        }
        queue.push(n);
      }
    }
    return [{ ...door }];
  };
  for (const p of places) {
    if (p.kind === "house" || p.kind === "cafe" || p.kind === "shop" || p.kind === "home" || (p.kind === "gate" && p.depth === "back")) {
      p.spur = bfsSpur(p.door);
    }
  }

  // ── The gathering corner ──────────────────────────────────────
  // Rows 11–12 are the one six-wide window the lane widens into
  // at the board's feet (the front strata's walls end at row 10).
  const corner = { x: 3, y: 11, w: 6, h: 2 };
  const cornerStands: WalkTile[] = [];
  {
    const candidates: WalkTile[] = [];
    for (let ty = corner.y; ty < corner.y + corner.h; ty++) {
      for (let tx = corner.x; tx < corner.x + corner.w; tx++) {
        const t = { x: tx, y: ty };
        if (doorKeys.has(keyOf(tx, ty))) continue;
        if (!walkable(t)) continue;
        candidates.push(t);
      }
    }
    // Centre-out preference, then greedy with elbow room
    // (Chebyshev ≥ 2); if the doors crowd the corner, relax to
    // distinct tiles rather than seat fewer than three.
    candidates.sort(
      (a, b) =>
        Math.abs(a.x + 0.5 - 5.5) + Math.abs(a.y + 0.5 - 11.5) -
          (Math.abs(b.x + 0.5 - 5.5) + Math.abs(b.y + 0.5 - 11.5)) ||
        a.x - b.x ||
        a.y - b.y
    );
    for (const minGap of [2, 1]) {
      for (const t of candidates) {
        if (cornerStands.length >= 4) break;
        if (cornerStands.some((s) => s.x === t.x && s.y === t.y)) continue;
        if (cornerStands.every((s) => Math.max(Math.abs(s.x - t.x), Math.abs(s.y - t.y)) >= minGap)) {
          cornerStands.push(t);
        }
      }
      if (cornerStands.length >= 3) break;
    }
  }

  // ── Roads ─────────────────────────────────────────────────────
  const roadSet = new Map<string, WalkTile>();
  const addRoad = (t: WalkTile) => {
    if (walkable(t)) roadSet.set(keyOf(t.x, t.y), t);
  };
  for (let tx = 0; tx < STREET_W; tx++) {
    for (let ty = 0; ty < STREET_H; ty++) {
      if (isLaneTile(tx, ty)) addRoad({ x: tx, y: ty });
    }
  }
  for (let ty = corner.y; ty < corner.y + corner.h; ty++) {
    for (let tx = corner.x; tx < corner.x + corner.w; tx++) addRoad({ x: tx, y: ty });
  }
  for (const p of places) {
    for (const t of p.spur) addRoad(t);
    addRoad(p.door);
  }
  const roads = [...roadSet.values()].sort((a, b) => a.y - b.y || a.x - b.x);

  const cafe = places.find((p) => p.kind === "cafe") ?? null;
  return {
    w: STREET_W,
    h: STREET_H,
    places,
    blocked,
    roads,
    cafe,
    board,
    corner,
    forestTrees: FOREST_TREES.map((t) => ({ ...t })),
    cornerStands,
    cafeBuildingId: anchor?.id ?? null,
    cafePile: (anchor?.accumulated || 0) + pendingRegister,
  };
}

/** The place a street tile belongs to: its doorstep first (doors
 *  are unique), then the first drawn rect over the point, then
 *  the frontage row in front of a door. */
export function streetPlaceAt(world: StreetWorld, x: number, y: number): StreetPlace | null {
  for (const p of world.places) {
    if (p.door.x === x && p.door.y === y) return p;
  }
  for (const p of world.places) {
    if (x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) return p;
  }
  for (const p of world.places) {
    if (y === p.door.y && x >= p.x && x < p.x + p.w) return p;
  }
  return null;
}

export function streetPlaceByBuildingId(
  world: StreetWorld,
  buildingId: string
): StreetPlace | null {
  return world.places.find((p) => p.buildingId === buildingId) ?? null;
}

// ── Walking the street ──────────────────────────────────────────────────────

export function isStreetWalkable(world: StreetWorld, t: WalkTile): boolean {
  return streetInBounds(world, t.x, t.y) && !world.blocked.has(keyOf(t.x, t.y));
}

/** The walkable street tile nearest to `target` (itself when clear). */
export function nearestStreetWalkable(world: StreetWorld, target: WalkTile): WalkTile | null {
  if (isStreetWalkable(world, target)) return { x: target.x, y: target.y };
  const seen = new Set<string>([keyOf(target.x, target.y)]);
  const queue: WalkTile[] = [{ x: target.x, y: target.y }];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const [dx, dy] of DIRS) {
      const n = { x: cur.x + dx, y: cur.y + dy };
      if (!streetInBounds(world, n.x, n.y)) continue;
      const k = keyOf(n.x, n.y);
      if (seen.has(k)) continue;
      seen.add(k);
      if (isStreetWalkable(world, n)) return n;
      queue.push(n);
    }
  }
  return null;
}

export type StreetWalkPlan = {
  tiles: WalkTile[];
  goal: WalkTile;
};

/**
 * Plan a walk on the street: 4-way BFS over walkable tiles only, so
 * the Hero reaches a place's doorstep without crossing its
 * footprint — Part 1's contract, on the street's ground. Null when
 * no route exists; the caller falls back to acting immediately.
 */
export function planStreetWalk(
  world: StreetWorld,
  from: WalkTile,
  target: WalkTile
): StreetWalkPlan | null {
  const start = isStreetWalkable(world, from) ? from : nearestStreetWalkable(world, from);
  const goal = isStreetWalkable(world, target) ? target : nearestStreetWalkable(world, target);
  if (!start || !goal) return null;
  const startK = keyOf(start.x, start.y);
  const goalK = keyOf(goal.x, goal.y);
  if (startK === goalK) return { tiles: [{ ...start }], goal: { ...goal } };
  const prev = new Map<string, string | null>([[startK, null]]);
  const queue: WalkTile[] = [{ ...start }];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const [dx, dy] of DIRS) {
      const n = { x: cur.x + dx, y: cur.y + dy };
      if (!isStreetWalkable(world, n)) continue;
      const k = keyOf(n.x, n.y);
      if (prev.has(k)) continue;
      prev.set(k, keyOf(cur.x, cur.y));
      if (k === goalK) {
        const rev: WalkTile[] = [{ x: goal.x, y: goal.y }];
        let cursor: string | null = prev.get(k) ?? null;
        while (cursor && cursor !== startK) {
          const [cx, cy] = cursor.split(",").map(Number);
          rev.unshift({ x: cx, y: cy });
          cursor = prev.get(cursor) ?? null;
        }
        rev.unshift({ x: start.x, y: start.y });
        return { tiles: rev, goal: { ...goal } };
      }
      queue.push(n);
    }
  }
  return null;
}

// ── The retirement migration ────────────────────────────────────────────────

export const WIDE_STREET_KEY = "prayercircle.hometown.widestreet.v1";

export type WideStreetState = {
  /** True once the retirement sweep has run (the stored flag). */
  migrated: boolean;
  /** Coins swept from retired buildings while no diner stood to
   *  receive them. They wait at the café — visible as its register
   *  pile — and land on the first anchor diner's pile the moment
   *  one stands. Never deleted, never folded into the balance. */
  pendingRegister: number;
};

export function defaultWideStreetState(): WideStreetState {
  return { migrated: false, pendingRegister: 0 };
}

export function parseWideStreetState(value: unknown): WideStreetState {
  const v = value as { migrated?: unknown; pendingRegister?: unknown } | null;
  const pending =
    typeof v?.pendingRegister === "number" && Number.isFinite(v.pendingRegister) && v.pendingRegister > 0
      ? v.pendingRegister
      : 0;
  return { migrated: v?.migrated === true || pending > 0, pendingRegister: pending };
}

/**
 * The retirement sweep, pure: every coin WAITING (accumulated,
 * uncollected) on a town-map building other than the café's anchor
 * diner moves to the café's register pile — the anchor's own
 * `accumulated`, where the café scene already reads its pile and
 * the map's collect flow already collects it. Nothing is deleted
 * and nothing touches the coin balance: the sum that was waiting
 * across the old town is the sum waiting at the register. With no
 * diner standing, the sum waits in `pendingRegister` instead and
 * lands on the first anchor that appears. Idempotent: once swept,
 * the sources stand at zero and a second settle changes nothing.
 */
export function settleWideStreetMigration(
  town: TownState,
  state: WideStreetState
): { town: TownState; state: WideStreetState; changed: boolean } {
  const map = town.maps.town;
  const anchor = cafeAnchorDiner(map);
  const swept = map.buildings.reduce(
    (sum, b) => sum + (anchor && b.id === anchor.id ? 0 : b.accumulated || 0),
    0
  );
  let pending = (state.pendingRegister || 0) + swept;
  let buildings = map.buildings;
  let changed = false;
  if (swept > 0) {
    buildings = buildings.map((b) =>
      anchor && b.id === anchor.id ? b : b.accumulated ? { ...b, accumulated: 0 } : b
    );
    changed = true;
  }
  if (anchor && pending > 0) {
    buildings = buildings.map((b) =>
      b.id === anchor.id ? { ...b, accumulated: (b.accumulated || 0) + pending } : b
    );
    pending = 0;
    changed = true;
  }
  const nextTown =
    buildings !== map.buildings
      ? { ...town, maps: { ...town.maps, town: { ...map, buildings } } }
      : town;
  const nextState: WideStreetState = { migrated: true, pendingRegister: pending };
  if (nextState.migrated !== state.migrated || nextState.pendingRegister !== (state.pendingRegister || 0)) {
    changed = true;
  }
  return { town: nextTown, state: nextState, changed };
}

/** Coins waiting at the café's register for this town map right now. */
export function cafeRegisterPile(map: MapState, pendingRegister: number): number {
  const anchor = cafeAnchorDiner(map);
  return (anchor?.accumulated || 0) + (pendingRegister || 0);
}

// ── Storage (the hometown screen's pattern: read on open) ───────────────────

export async function loadWideStreetState(): Promise<WideStreetState> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem(WIDE_STREET_KEY);
    return parseWideStreetState(raw ? JSON.parse(raw) : null);
  } catch {
    return defaultWideStreetState();
  }
}

export async function saveWideStreetState(state: WideStreetState): Promise<void> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.setItem(WIDE_STREET_KEY, JSON.stringify(state));
  } catch {
    // The migration re-derives from the town record on the next
    // load; a failed flag write can double nothing (the sources
    // stand at zero once swept, and pending folds only forward).
  }
}
