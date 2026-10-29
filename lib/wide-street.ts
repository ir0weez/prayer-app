// ─────────────────────────────────────────────────────────────────────────────
// v291 — The Walkable Town, Part 2: The Wide Street.
// v327 — THE HOMETOWN REBUILD: the street's COMPOSITION, rebuilt to
// the approved drawing (hometown-street-concepts-v1.html, Concept 2 —
// The Diorama; Jonathan approved it 2026-10-28 22:45, "Go ahead I
// trust you", after rejecting the wide street's look three times —
// the last shot showed one giant building front filling half the
// frame, an empty street slab, tiny distant villagers, and "Town
// Sh…" truncated).
//
// What v327 changes is the COMPOSITION ONLY. The street is no longer
// two flat rows of places along a straight slab: it is the Diorama —
// a street that CURVES from the river at the bottom-left up to the
// mine mouth in its hill at the top-right, the forest edge standing
// at the left, plots at TWO DEPTHS (front plots on the street, back
// plots behind a yard with a fence and a path spur to their door),
// and — borrowed from Concept 3, The Plaza, with his approval — a
// GATHERING CORNER where the street bends and widens around the
// Missions board, with bench, lamp and standing room. Every mechanic
// and interaction carries over exactly: the café is still the only
// producer, coins still WAIT at its register, the migration below is
// untouched, and every place keeps its identity in the record.
//
// Like Part 2, this module is a DERIVATION over the book of record
// (lib/hometown.ts): the town record still holds every building by
// identity; the street decides where each surviving place stands.
// The derivation writes nothing back. The one record change the
// street makes is the retirement migration below — and it runs
// through lib/hometown's own town record, in the load commit, like
// every other settle.
//
// The Diorama's shape (tile space, STREET_H rows):
//   - the street's centreline descends from row 9 at the west end
//     to row 4 at the east: centerY(x) = round(9 − 5·smoothstep),
//     so the lane climbs as it runs east to the mine. The walkable
//     band is four rows per column: apron, street, street, apron.
//   - the Dark Forest is the treeline block at the WEST edge; the
//     Mine is the hill at the east end of the north run; the river
//     holds the bottom-left corner.
//   - north-side and south-side slots pack along the lane exactly
//     as before (his house and the gates north; the café, homes,
//     gates and two open lots south), each slot taking the depth
//     its index deals it where the land allows: back where the
//     yard fits, front where it doesn't, a hillside terrace at the
//     high east end of the north side.
//   - the Missions board stands mid-lane at the bend; the south
//     packing leaves a gap of open ground there — the gathering
//     corner — and the board's doorstep is a corner tile.
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

/** The Diorama's height in tiles: skyline, hill country, the two
 *  plot depths, the climbing lane, and the river corner. */
export const STREET_H = 16;
/** Every place's footprint is three tiles tall, as it has always
 *  been — the composition changed, the places' stature didn't. */
export const STREET_PLACE_H = 3;

/** The treeline's width at the street's west end. */
const FOREST_W = 3;
/** The first plot column: forest face, then one bank column. */
const FIRST_SLOT_X = 4;
/** The mine hill's width at the north run's east end. */
const MINE_W = 4;

/** The river at the bottom-left corner: two banks of water tiles.
 *  Blocked ground — nobody walks on the water — drawn by the street
 *  view from these same rects, so the picture and the pathing can
 *  never disagree about where the river is. */
export const RIVER_RECTS: ReadonlyArray<{ x: number; y: number; w: number; h: number }> = [
  { x: 0, y: STREET_H - 2, w: 4, h: 2 },
  { x: 0, y: STREET_H - 1, w: 10, h: 1 },
];

function smoothstep(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return u * u * (3 - 2 * u);
}

/**
 * The street centreline's row at column `x` in a world `w` wide:
 * row 9 at the river end, row 4 at the mine end, easing through
 * the bend between. Pure and shared — the derivation lays plots
 * against it and the street view draws the lane along it, so the
 * two can never draw different streets.
 */
export function dioramaCenterY(x: number, w: number): number {
  if (w <= 4) return 9;
  return Math.round(9 - 5 * smoothstep((x - 3) / (w - 4)));
}

/** The walkable band's rows at a column: [apron, street, street,
 *  apron] around the centreline. Returns [top, bottom]. */
export function streetBandRows(x: number, w: number): [number, number] {
  const c = dioramaCenterY(x, w);
  return [c - 1, c + 2];
}

const keyOf = (x: number, y: number) => `${x},${y}`;

// ── Places ──────────────────────────────────────────────────────────────────

export type StreetPlaceKind =
  | "cafe"
  | "mine"
  | "forest"
  | "house"
  | "home"
  | "gate"
  | "empty-lot"
  | "board";

export type StreetPlace = {
  kind: StreetPlaceKind;
  /** The record building this place IS (identity), when it has one. */
  buildingId?: string;
  buildingType?: PlacedBuilding["type"];
  /** The town landmark this gate opens, for gate places. */
  landmark?: TownLandmark;
  x: number;
  y: number;
  w: number;
  h: number;
  /** The walkable tile in front of the place's door. */
  door: WalkTile;
  /** The depth this plot stands at: "front" on the street itself,
   *  "back" behind its yard, reached by the spur. */
  depth: "front" | "back";
  /** The whole plot the place stands on: footprint plus its yard
   *  (front plots: the footprint and its doorstep strip). The
   *  street view pads and fences the plot, never the bare grass. */
  plot: { x: number; y: number; w: number; h: number };
  /** The path tiles from the place's door to the street band —
   *  the spur a back plot is reached by; a front place's spur is
   *  its door tile alone. All spur tiles are street (roads). */
  spur: WalkTile[];
  /** Accessibility name — and, where the composition names a
   *  place, the word its drawn plaque speaks (see `plaque`). */
  label: string;
  /** The name plaque the street draws under this place, in full —
   *  sized by its text, never clipped (v327 label rule). Places
   *  the drawing leaves unnamed (homes, the forest, the lots)
   *  carry none; the board's name rides its own chip instead. */
  plaque?: string;
  /** The fast-week lot (v279's roped ground), worn by one empty lot
   *  once a fast week has opened it. */
  weekLot?: boolean;
};

export type StreetWorld = {
  /** Street width in tiles (the height is always STREET_H). */
  w: number;
  h: number;
  places: StreetPlace[];
  /** Tiles nothing may stand on: footprints, the treeline, the
   *  river, the skyline row, the board's feet. */
  blocked: Set<string>;
  /** The road network the pawn and villagers path along: the
   *  street band end to end, every spur, and the gathering
   *  corner. */
  roads: WalkTile[];
  cafe: StreetPlace | null;
  /** The Missions board's place, mid-lane at the bend. */
  board: StreetPlace | null;
  /** The gathering corner's tiles (one row, at the board's feet):
   *  where the street widens and his people stand together. */
  corner: { x: number; y: number; w: number };
  /** The anchor diner's id, or null until a diner stands. */
  cafeBuildingId: string | null;
  /** Coins waiting at the café's register: the anchor diner's pile
   *  plus any migrated sum still waiting for a diner to land on. */
  cafePile: number;
};

const GATE_NORTH_IDS = ["landmark-school", "landmark-garden", "landmark-mission"];
const GATE_SOUTH_IDS = ["landmark-well", "landmark-river"];

function interleave<T>(a: T[], b: T[]): T[] {
  const out: T[] = [];
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}

type Slot =
  | { kind: "house"; building: PlacedBuilding }
  | { kind: "cafe"; building: PlacedBuilding | null }
  | { kind: "home"; building: PlacedBuilding }
  | { kind: "gate"; landmark: TownLandmark }
  | { kind: "empty-lot" };

const SLOT_W: Record<Slot["kind"], number> = {
  house: 3,
  cafe: 5,
  home: 3,
  gate: 3,
  "empty-lot": 3,
};

/**
 * Derive the Diorama from the town record. Deterministic: the
 * same record always derives the same street. Homes are the
 * record's villager cottages and houses in (y, x, id) reading
 * order — the order cottageResidents deals by, so a villager's
 * street home is the cottage the record says is theirs.
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
  const homesNorth = homes.filter((_, i) => i % 2 === 0);
  const homesSouth = homes.filter((_, i) => i % 2 === 1);
  const gatesNorth = TOWN_LANDMARKS.filter((l) => GATE_NORTH_IDS.includes(l.id));
  const gatesSouth = TOWN_LANDMARKS.filter((l) => GATE_SOUTH_IDS.includes(l.id));

  const northSlots: Slot[] = [
    ...(heroHouse ? [{ kind: "house", building: heroHouse } as Slot] : []),
    ...interleave(
      homesNorth.map((building) => ({ kind: "home", building }) as Slot),
      gatesNorth.map((landmark) => ({ kind: "gate", landmark }) as Slot)
    ),
  ];
  const southSlots: Slot[] = [
    { kind: "cafe", building: anchor } as Slot,
    ...interleave(
      homesSouth.map((building) => ({ kind: "home", building }) as Slot),
      gatesSouth.map((landmark) => ({ kind: "gate", landmark }) as Slot)
    ),
    { kind: "empty-lot" } as Slot,
    { kind: "empty-lot" } as Slot,
  ];

  // Pass 1 — extents. Slot widths don't depend on the land, so the
  // world's width is settled before any plot is laid: the north
  // run (slots, then the mine hill) against the south run (slots
  // packed plain; the corner gap is measured in pass 2 and can
  // only widen the world, never narrow it).
  let northExtent = FIRST_SLOT_X;
  for (const slot of northSlots) northExtent += SLOT_W[slot.kind] + 1;
  northExtent += MINE_W; // the mine stands on the run's next column, gap and all
  let southPlain = FIRST_SLOT_X;
  for (const slot of southSlots) southPlain += SLOT_W[slot.kind] + 1;
  southPlain -= 1;
  const w0 = Math.max(northExtent, southPlain) + 1;

  // The bend: the centreline's steepest reach, mid-world. The
  // board stands there and the south packing leaves its gap.
  const bendX = Math.round(3 + (w0 - 4) / 2);
  const gapLo = bendX - 3;
  const gapHi = bendX + 3;

  // Pass 2 — pack the south run for real, jumping the corner gap:
  // no south footprint starts inside the gap columns (the café,
  // first on the run, is exempt — its ground is rows below the
  // corner's row, as the drawing has it, so an overhang there can
  // never touch the corner).
  const southXs: number[] = [];
  {
    let cx = FIRST_SLOT_X;
    southSlots.forEach((slot, i) => {
      if (i > 0 && cx + SLOT_W[slot.kind] > gapLo && cx < gapHi + 1) {
        cx = Math.max(cx, gapHi + 1);
      }
      if (i > 0 && cx > gapLo && cx < gapHi + 1) cx = gapHi + 1;
      southXs.push(cx);
      cx += SLOT_W[slot.kind] + 1;
    });
  }
  const southExtent = southXs.length
    ? southXs[southXs.length - 1] + SLOT_W[southSlots[southSlots.length - 1].kind]
    : FIRST_SLOT_X;
  const w = Math.max(northExtent, southExtent) + 1;

  const centerAt = (x: number) => dioramaCenterY(x, w);
  const places: StreetPlace[] = [];

  // The treeline: the Dark Forest closes the street's west end,
  // standing over the river corner.
  const forestDoor = { x: FOREST_W, y: centerAt(FOREST_W) };
  places.push({
    kind: "forest",
    x: 0,
    y: 0,
    w: FOREST_W,
    h: STREET_H - 2,
    door: forestDoor,
    depth: "front",
    plot: { x: 0, y: 0, w: FOREST_W, h: STREET_H - 2 },
    spur: [forestDoor],
    label: "Dark Forest",
  });

  // The north run, then the mine hill at its east end.
  {
    let cx = FIRST_SLOT_X;
    northSlots.forEach((slot, i) => {
      places.push(northSlotPlace(slot, cx, i, centerAt));
      cx += SLOT_W[slot.kind] + 1;
    });
    const door = { x: cx + 2, y: STREET_PLACE_H };
    places.push({
      kind: "mine",
      x: cx,
      y: 0,
      w: MINE_W,
      h: STREET_PLACE_H,
      door,
      depth: "front",
      plot: { x: cx, y: 0, w: MINE_W, h: STREET_PLACE_H + 1 },
      spur: spurTiles("north", cx, 0, MINE_W, STREET_PLACE_H, door, centerAt),
      label: "The Mine",
      plaque: "The Mine",
    });
  }

  // The board at the bend, and its gathering corner: the corner
  // row runs at the board's feet, six tiles wide, walkable street
  // the lane widens into.
  const bendC = centerAt(bendX);
  const corner = { x: bendX - 2, y: bendC + 3, w: 6 };
  const boardDoor = { x: bendX, y: corner.y };
  const board: StreetPlace = {
    kind: "board",
    x: bendX,
    y: bendC,
    w: 2,
    h: 1,
    door: boardDoor,
    depth: "front",
    plot: { x: bendX, y: bendC, w: 2, h: 1 },
    spur: [boardDoor],
    label: "Missions",
  };
  places.push(board);

  // The south run, on its pass-2 columns.
  {
    let empties = 0;
    southSlots.forEach((slot, i) => {
      const place = southSlotPlace(slot, southXs[i], i, centerAt);
      if (slot.kind === "empty-lot") {
        empties += 1;
        if (empties === 1 && (opts.weekLots ?? 0) >= 1) place.weekLot = true;
      }
      places.push(place);
    });
  }

  const blocked = new Set<string>();
  for (let x = 0; x < w; x++) blocked.add(keyOf(x, 0)); // the skyline row
  for (const r of RIVER_RECTS) {
    for (let dx = 0; dx < r.w; dx++) {
      for (let dy = 0; dy < r.h; dy++) blocked.add(keyOf(r.x + dx, r.y + dy));
    }
  }
  for (const p of places) {
    if (p.kind === "empty-lot") continue; // plain ground — walkable
    for (let dx = 0; dx < p.w; dx++) {
      for (let dy = 0; dy < p.h; dy++) {
        blocked.add(keyOf(p.x + dx, p.y + dy));
      }
    }
  }

  // The road network: the band end to end (from the forest's face
  // to the world's east edge), every place's spur, the board's
  // corner. Blocked tiles (the board's feet) are never roads.
  const roadSet = new Map<string, WalkTile>();
  const addRoad = (t: WalkTile) => {
    if (!blocked.has(keyOf(t.x, t.y))) roadSet.set(keyOf(t.x, t.y), t);
  };
  for (let x = FOREST_W; x < w; x++) {
    const [top, bottom] = streetBandRows(x, w);
    for (let y = top; y <= bottom; y++) addRoad({ x, y });
  }
  for (let dx = 0; dx < corner.w; dx++) addRoad({ x: corner.x + dx, y: corner.y });
  for (const p of places) for (const t of p.spur) addRoad(t);
  const roads = [...roadSet.values()].sort((a, b) => a.y - b.y || a.x - b.x);

  const cafe = places.find((p) => p.kind === "cafe") ?? null;
  return {
    w,
    h: STREET_H,
    places,
    blocked,
    roads,
    cafe,
    board,
    corner,
    cafeBuildingId: anchor?.id ?? null,
    cafePile: (anchor?.accumulated || 0) + pendingRegister,
  };
}

/** The path tiles from a place's door to the street band, along
 *  the door's column: a back plot's spur crosses its yard; a front
 *  place's spur is its door tile alone (the door stands on the
 *  band's own edge). Always includes the door itself. */
function spurTiles(
  side: "north" | "south",
  x: number,
  y: number,
  w: number,
  h: number,
  door: WalkTile,
  centerAt: (x: number) => number
): WalkTile[] {
  const c = centerAt(door.x);
  const out: WalkTile[] = [];
  if (side === "north") {
    const from = y + h; // first tile below the footprint
    const to = c - 1; // the band's north apron row
    for (let ry = from; ry <= to; ry++) out.push({ x: door.x, y: ry });
  } else {
    const from = c + 2; // the band's south apron row
    const to = y - 1; // last tile above the footprint
    for (let ry = from; ry <= to; ry++) out.push({ x: door.x, y: ry });
  }
  if (!out.some((t) => t.x === door.x && t.y === door.y)) out.push({ ...door });
  return out;
}

function northSlotPlace(
  slot: Slot,
  x: number,
  index: number,
  centerAt: (x: number) => number
): StreetPlace {
  const w = SLOT_W[slot.kind];
  const doorX = x + Math.floor(w / 2);
  const c = centerAt(doorX);
  // Depth by the slot's dealing, where the land allows: even slots
  // stand back behind a yard (his house first among them, as the
  // drawing has it); a back yard needs the high ground (c ≥ 8),
  // else the plot comes forward. At the lane's high east end
  // (c ≤ 4) even a front plot terraces into the hillside.
  const wantsBack = index % 2 === 0;
  let y: number;
  let door: WalkTile;
  let depth: "front" | "back";
  let plot: StreetPlace["plot"];
  if (wantsBack && c >= 8) {
    depth = "back";
    y = c - 7;
    door = { x: doorX, y: c - 4 };
    plot = { x, y, w, h: 7 };
  } else if (c >= 5) {
    depth = "front";
    y = c - 4;
    door = { x: doorX, y: c - 1 };
    plot = { x, y, w, h: 4 };
  } else {
    depth = "front";
    y = 1;
    door = { x: doorX, y: 4 };
    plot = { x, y: 1, w, h: 4 };
  }
  const base = {
    x, y, w, h: STREET_PLACE_H, door, depth, plot,
    spur: spurTiles("north", x, y, w, STREET_PLACE_H, door, centerAt),
  };
  switch (slot.kind) {
    case "house":
      return { ...base, kind: "house", buildingId: slot.building.id, buildingType: slot.building.type, label: "His House", plaque: "His House" };
    case "home":
      return { ...base, kind: "home", buildingId: slot.building.id, buildingType: slot.building.type, label: BUILDINGS[slot.building.type].name };
    case "gate":
      return { ...base, kind: "gate", landmark: slot.landmark, label: slot.landmark.name, plaque: slot.landmark.name };
    default:
      throw new Error(`north slot of unexpected kind: ${slot.kind}`);
  }
}

function southSlotPlace(
  slot: Slot,
  x: number,
  index: number,
  centerAt: (x: number) => number
): StreetPlace {
  const w = SLOT_W[slot.kind];
  const doorX = x + Math.floor(w / 2);
  const c = centerAt(doorX);
  // The café stands front, at the river end, as the drawing has
  // it; odd slots after it stand back where the low ground allows
  // (c ≤ 7 leaves yard room above the river corner), else front.
  const wantsBack = index > 0 && index % 2 === 1;
  let y: number;
  let door: WalkTile;
  let depth: "front" | "back";
  let plot: StreetPlace["plot"];
  if (wantsBack && c <= 7) {
    depth = "back";
    y = c + 6;
    door = { x: doorX, y: c + 3 };
    plot = { x, y: c + 2, w, h: 7 };
  } else {
    depth = "front";
    y = c + 3;
    door = { x: doorX, y: c + 2 };
    plot = { x, y: c + 2, w, h: 4 };
  }
  const base = {
    x, y, w, h: STREET_PLACE_H, door, depth, plot,
    spur: spurTiles("south", x, y, w, STREET_PLACE_H, door, centerAt),
  };
  switch (slot.kind) {
    case "cafe":
      return { ...base, kind: "cafe", buildingId: slot.building?.id, buildingType: slot.building?.type, label: "The Café", plaque: "Café" };
    case "home":
      return { ...base, kind: "home", buildingId: slot.building.id, buildingType: slot.building.type, label: BUILDINGS[slot.building.type].name };
    case "gate":
      return { ...base, kind: "gate", landmark: slot.landmark, label: slot.landmark.name, plaque: slot.landmark.name };
    case "empty-lot":
      return { ...base, kind: "empty-lot", label: "Open ground" };
    default:
      throw new Error(`south slot of unexpected kind: ${slot.kind}`);
  }
}

/** The place a street tile belongs to: its footprint, or the
 *  frontage in front of its door. */
export function streetPlaceAt(world: StreetWorld, x: number, y: number): StreetPlace | null {
  for (const p of world.places) {
    if (x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) return p;
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

function streetInBounds(world: StreetWorld, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < world.w && y < world.h;
}

export function isStreetWalkable(world: StreetWorld, t: WalkTile): boolean {
  return streetInBounds(world, t.x, t.y) && !world.blocked.has(keyOf(t.x, t.y));
}

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

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

