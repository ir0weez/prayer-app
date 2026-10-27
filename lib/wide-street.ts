// ─────────────────────────────────────────────────────────────────────────────
// v291 — The Walkable Town, Part 2: The Wide Street.
//
// Jonathan's direction (Oct 27, 15:08–15:12, inside his 14:48
// delegation "I'll trust you with the rebuild... and how it works"):
// Part 2 re-lays the town as a WIDE left-right street; the buildings
// are completely redesigned as PLACES — café-style walk-in places
// with roles in his practices; for now the CAFÉ IS THE ONLY building
// that produces; the mine and the forest may be redesigned in look
// and format, but HOW THEY WORK is protected and carries over
// exactly (their mechanics live in lib/mountain, lib/mine-descent,
// lib/dark-forest and lib/hero-health — untouched by this build).
//
// Like Part 1, this module is a DERIVATION over the book of record
// (lib/hometown.ts): the town record still holds every building by
// identity; the street decides where each surviving place stands.
// The derivation writes nothing back. The one record change Part 2
// does make is the retirement migration below — and it runs through
// lib/hometown's own town record, in the load commit, like every
// other settle.
//
// The street's shape:
//   - one main street running left→right (two walkable rows), with a
//     walkable apron in front of each side's places;
//   - the Dark Forest is the treeline at the WEST end; the Mine is
//     the rock face at the EAST end of the north side; his house and
//     the café stand near the west-center where the Hero starts;
//   - people's homes and the town's gates (the landmarks) fill the
//     lots between; empty lots wait at the far (east) end of the
//     south side — plain ground, room to grow, nothing teased.
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

/** Street rows: sky/horizon at 0, north places stand on 1–3 with
 *  their apron (doorstep row) at 4, the street itself at 5–6, the
 *  south apron at 7, south places on 8–10. */
export const STREET_H = 11;
export const STREET_NORTH_Y = 1;
export const STREET_NORTH_DOOR_Y = 4;
export const STREET_ROW_TOP = 5;
export const STREET_ROW_BOTTOM = 6;
export const STREET_SOUTH_DOOR_Y = 7;
export const STREET_SOUTH_Y = 8;
export const STREET_PLACE_H = 3;

const keyOf = (x: number, y: number) => `${x},${y}`;

// ── Places ──────────────────────────────────────────────────────────────────

export type StreetPlaceKind =
  | "cafe"
  | "mine"
  | "forest"
  | "house"
  | "home"
  | "gate"
  | "empty-lot";

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
  /** Accessibility name only — the street draws no captions. */
  label: string;
  /** The fast-week lot (v279's roped ground), worn by one empty lot
   *  once a fast week has opened it. */
  weekLot?: boolean;
};

export type StreetWorld = {
  /** Street width in tiles (the height is always STREET_H). */
  w: number;
  h: number;
  places: StreetPlace[];
  /** Tiles nothing may stand on: footprints, the treeline, the sky. */
  blocked: Set<string>;
  /** The road network the pawn and villagers path along: the aprons
   *  and the street rows, end to end. */
  roads: WalkTile[];
  cafe: StreetPlace | null;
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
 * Derive the wide street from the town record. Deterministic: the
 * same record always derives the same street. Homes are the record's
 * villager cottages and houses in (y, x, id) reading order — the
 * order cottageResidents deals by, so a villager's street home is
 * the cottage the record says is theirs.
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

  const places: StreetPlace[] = [];
  // The treeline: the Dark Forest closes the street's west end.
  places.push({
    kind: "forest",
    x: 0,
    y: 0,
    w: 3,
    h: STREET_H,
    door: { x: 3, y: STREET_ROW_TOP },
    label: "Dark Forest",
  });

  let northExtent = 4;
  {
    let cx = 4;
    for (const slot of northSlots) {
      const w = SLOT_W[slot.kind];
      places.push(slotPlace(slot, cx, STREET_NORTH_Y, STREET_NORTH_DOOR_Y));
      cx += w + 1;
    }
    // The Mine: the rock face at the street's east end (north side).
    places.push({
      kind: "mine",
      x: cx,
      y: STREET_NORTH_Y,
      w: 4,
      h: STREET_PLACE_H,
      door: { x: cx + 2, y: STREET_NORTH_DOOR_Y },
      label: "The Mine",
    });
    northExtent = cx + 4;
  }
  let southExtent = 4;
  {
    let cx = 4;
    let empties = 0;
    for (const slot of southSlots) {
      const w = SLOT_W[slot.kind];
      const place = slotPlace(slot, cx, STREET_SOUTH_Y, STREET_SOUTH_DOOR_Y);
      if (slot.kind === "empty-lot") {
        empties += 1;
        if (empties === 1 && (opts.weekLots ?? 0) >= 1) place.weekLot = true;
      }
      places.push(place);
      cx += w + 1;
    }
    southExtent = cx - 1;
  }

  const w = Math.max(northExtent, southExtent) + 1;

  const blocked = new Set<string>();
  for (let x = 0; x < w; x++) blocked.add(keyOf(x, 0)); // the skyline row
  for (const p of places) {
    if (p.kind === "empty-lot") continue; // plain ground — walkable
    for (let dx = 0; dx < p.w; dx++) {
      for (let dy = 0; dy < p.h; dy++) {
        blocked.add(keyOf(p.x + dx, p.y + dy));
      }
    }
  }

  const roads: WalkTile[] = [];
  for (let x = 3; x < w; x++) {
    for (let y = STREET_NORTH_DOOR_Y; y <= STREET_SOUTH_DOOR_Y; y++) {
      roads.push({ x, y });
    }
  }

  const cafe = places.find((p) => p.kind === "cafe") ?? null;
  return {
    w,
    h: STREET_H,
    places,
    blocked,
    roads,
    cafe,
    cafeBuildingId: anchor?.id ?? null,
    cafePile: (anchor?.accumulated || 0) + pendingRegister,
  };
}

function slotPlace(slot: Slot, x: number, y: number, doorY: number): StreetPlace {
  const w = SLOT_W[slot.kind];
  const door = { x: x + Math.floor(w / 2), y: doorY };
  switch (slot.kind) {
    case "house":
      return {
        kind: "house",
        buildingId: slot.building.id,
        buildingType: slot.building.type,
        x, y, w, h: STREET_PLACE_H, door,
        label: "Your House",
      };
    case "cafe":
      return {
        kind: "cafe",
        buildingId: slot.building?.id,
        buildingType: slot.building?.type,
        x, y, w, h: STREET_PLACE_H, door,
        label: "The Café",
      };
    case "home":
      return {
        kind: "home",
        buildingId: slot.building.id,
        buildingType: slot.building.type,
        x, y, w, h: STREET_PLACE_H, door,
        label: BUILDINGS[slot.building.type].name,
      };
    case "gate":
      return {
        kind: "gate",
        landmark: slot.landmark,
        x, y, w, h: STREET_PLACE_H, door,
        label: slot.landmark.name,
      };
    case "empty-lot":
      return { kind: "empty-lot", x, y, w, h: STREET_PLACE_H, door, label: "Open ground" };
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
