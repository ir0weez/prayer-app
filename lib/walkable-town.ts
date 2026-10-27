// ---------- walkable town (v290): pure world logic, no React Native ----------
// Part 1 of the walkable Hometown: a new way to MOVE through the town
// Jonathan already owns. This module derives everything the walkable
// surface needs from the existing book of record (lib/hometown.ts) —
// it writes nothing, settles nothing, and collects nothing. Buildings
// enter by identity (same ids, same tiles, same levels, same waiting
// coins); the save shape does not change.
//
// The walking rules:
//   - a tile is walkable when nothing physical stands on it: no
//     building footprint, no decoration, no hub landmark, and no
//     stream water (bridges over the stream stay walkable);
//   - a tap plans a path over walkable tiles only (4-way BFS), so the
//     Hero reaches a building's door without crossing its footprint;
//   - when the tapped tile itself is blocked (a building's body, a
//     landmark), the goal becomes the nearest walkable tile to it —
//     the doorstep the building actually opens onto.

import {
  TOWN_LANDMARKS,
  buildingFootprint,
  hasFixedFootprint,
  isBridgeTile,
  isStreamTile,
  mapGridSize,
  type MapState,
  type PlacedBuilding,
} from "./hometown";

export type WalkTile = { x: number; y: number };

const keyOf = (x: number, y: number) => `${x},${y}`;

/** Town grid dimensions the walkable surface covers. */
export function walkGridSize(): { w: number; h: number } {
  return mapGridSize("town");
}

function inBounds(x: number, y: number): boolean {
  const { w, h } = walkGridSize();
  return x >= 0 && y >= 0 && x < w && y < h;
}

/** Every tile the Hero may NOT stand on, for the given town map. */
export function walkBlockedTiles(map: MapState): Set<string> {
  const blocked = new Set<string>();
  for (const b of map.buildings) {
    const fp = buildingFootprint(b.level || 1, b.type, hasFixedFootprint(b));
    for (let dx = 0; dx < fp.w; dx++) {
      for (let dy = 0; dy < fp.h; dy++) {
        blocked.add(keyOf(b.x + dx, b.y + dy));
      }
    }
  }
  for (const d of map.decorations) blocked.add(keyOf(d.x, d.y));
  for (const lm of TOWN_LANDMARKS) {
    for (let dx = 0; dx < lm.w; dx++) {
      for (let dy = 0; dy < lm.h; dy++) {
        blocked.add(keyOf(lm.x + dx, lm.y + dy));
      }
    }
  }
  const { w, h } = walkGridSize();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (isStreamTile(x, y) && !isBridgeTile(x, y)) blocked.add(keyOf(x, y));
    }
  }
  return blocked;
}

export function isWalkableTile(blocked: Set<string>, t: WalkTile): boolean {
  return inBounds(t.x, t.y) && !blocked.has(keyOf(t.x, t.y));
}

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** The walkable tile nearest to `target` (the target itself when it is
 *  already walkable). Breadth-first by ring, so the doorstep a tap
 *  resolves to is the closest ground the Hero can actually stand on. */
export function nearestWalkableTile(
  blocked: Set<string>,
  target: WalkTile
): WalkTile | null {
  if (isWalkableTile(blocked, target)) return { x: target.x, y: target.y };
  const seen = new Set<string>([keyOf(target.x, target.y)]);
  const queue: WalkTile[] = [{ x: target.x, y: target.y }];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const [dx, dy] of DIRS) {
      const n = { x: cur.x + dx, y: cur.y + dy };
      if (!inBounds(n.x, n.y)) continue;
      const k = keyOf(n.x, n.y);
      if (seen.has(k)) continue;
      seen.add(k);
      if (isWalkableTile(blocked, n)) return n;
      queue.push(n);
    }
  }
  return null;
}

/** 4-way BFS over walkable tiles from `from` to `goal` (both already
 *  walkable). Returns the tile path including both ends, or null when
 *  the goal cannot be reached on foot. */
export function findWalkPath(
  blocked: Set<string>,
  from: WalkTile,
  goal: WalkTile
): WalkTile[] | null {
  const startK = keyOf(from.x, from.y);
  const goalK = keyOf(goal.x, goal.y);
  if (startK === goalK) return [{ x: from.x, y: from.y }];
  const prev = new Map<string, string | null>([[startK, null]]);
  const queue: WalkTile[] = [{ x: from.x, y: from.y }];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const [dx, dy] of DIRS) {
      const n = { x: cur.x + dx, y: cur.y + dy };
      if (!isWalkableTile(blocked, n)) continue;
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
        rev.unshift({ x: from.x, y: from.y });
        return rev;
      }
      queue.push(n);
    }
  }
  return null;
}

export type WalkPlan = {
  /** Tile waypoints, hero's current tile first, doorstep last. */
  tiles: WalkTile[];
  /** The walkable tile the Hero ends standing on. */
  goal: WalkTile;
};

/**
 * Plan a tap-to-walk: from the Hero's tile to the tapped tile. Blocked
 * endpoints snap to their nearest walkable tile (a building tap lands
 * the Hero at its doorstep). Null when no route exists on foot — the
 * caller then falls back to the old immediate behavior.
 */
export function planWalkTo(map: MapState, from: WalkTile, target: WalkTile): WalkPlan | null {
  const blocked = walkBlockedTiles(map);
  const start = isWalkableTile(blocked, from) ? from : nearestWalkableTile(blocked, from);
  const goal = isWalkableTile(blocked, target) ? target : nearestWalkableTile(blocked, target);
  if (!start || !goal) return null;
  const tiles = findWalkPath(blocked, start, goal);
  if (!tiles) return null;
  return { tiles, goal };
}

/* ------------------------------------------------------------------ */
/* World derivation — the renderer's view of the book of record.      */
/* Identity is the contract: a spot IS the building (same id, same    */
/* tiles, same level, same waiting coins), never a copy or a re-seed.  */
/* ------------------------------------------------------------------ */

export type WalkSpot = {
  buildingId: string;
  type: PlacedBuilding["type"];
  x: number;
  y: number;
  /** Footprint in tiles, from the same helper the map art uses. */
  w: number;
  h: number;
  level: number;
  /** Coins waiting at this building, exactly as the record holds them. */
  accumulated: number;
  townLotId?: string;
};

export function deriveWalkSpots(map: MapState): WalkSpot[] {
  return map.buildings.map((b) => {
    const fp = buildingFootprint(b.level || 1, b.type, hasFixedFootprint(b));
    return {
      buildingId: b.id,
      type: b.type,
      x: b.x,
      y: b.y,
      w: fp.w,
      h: fp.h,
      level: b.level || 1,
      accumulated: b.accumulated || 0,
      townLotId: b.townLotId,
    };
  });
}

/** The building the café scene hangs on: the same diner the town map's
 *  café anchor follows (north-most, then west-most standing diner). */
export function cafeAnchorBuilding(map: MapState): PlacedBuilding | null {
  const diner = map.buildings
    .filter((b) => b.type === "diner")
    .sort((a, b) => a.y - b.y || a.x - b.x)[0];
  return diner ?? null;
}

/** Desired camera scroll offset (px) that centers the Hero in the
 *  viewport, clamped so the world never scrolls past its own edges. */
export function cameraScrollFor(heroPx: number, viewport: number, world: number): number {
  if (world <= viewport) return 0;
  const desired = heroPx - viewport / 2;
  return Math.max(0, Math.min(world - viewport, desired));
}
