import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";
import {
  BUILDINGS,
  buildingFootprint,
  townsfolkForHouse,
  type MapState,
} from "@/lib/hometown";

const NPC_SIZE = 16;
const SPEED_PX_PER_SEC = 42;
const MAX_NPCS = 24;

// Soft pastel body colors — cute, not distracting
const NPC_COLORS = [
  "#F9A8D4",
  "#93C5FD",
  "#86EFAC",
  "#FDE68A",
  "#C4B5FD",
  "#FCA5A5",
  "#67E8F9",
  "#FDBA74",
];

type Tile = { x: number; y: number };
type Px = { x: number; y: number };

type NpcDef = {
  id: string;
  homeId: string;
  homeTile: Tile;
  color: string;
};

type NpcLogic = {
  id: string;
  homeId: string;
  homeTile: Tile;
  color: string;
  pos: Animated.ValueXY;
  bob: Animated.Value;
  state: "idle" | "walking" | "visiting" | "returning";
  waitUntil: number;
  waypoints: Px[];
  wpIndex: number;
  px: number;
  py: number;
  anim: Animated.CompositeAnimation | null;
};

const tileKey = (x: number, y: number) => `${x},${y}`;

function nearestRoad(roads: Tile[], tx: number, ty: number): Tile | null {
  let best: Tile | null = null;
  let bestD = Infinity;
  for (const r of roads) {
    const d = Math.abs(r.x - tx) + Math.abs(r.y - ty);
    if (d < bestD) {
      bestD = d;
      best = r;
    }
  }
  return best;
}

function bfsRoadPath(roadSet: Set<string>, from: Tile, to: Tile): Tile[] | null {
  const start = tileKey(from.x, from.y);
  const goal = tileKey(to.x, to.y);
  if (start === goal) return [from];
  const prev = new Map<string, string | null>([[start, null]]);
  const queue: Tile[] = [from];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const k = tileKey(nx, ny);
      if (!roadSet.has(k) || prev.has(k)) continue;
      prev.set(k, tileKey(cur.x, cur.y));
      if (k === goal) {
        // reconstruct path back to start
        const rev: Tile[] = [{ x: to.x, y: to.y }];
        let cursor: string | null = prev.get(k) ?? null;
        while (cursor && cursor !== start) {
          const [cx, cy] = cursor.split(",").map(Number);
          rev.unshift({ x: cx, y: cy });
          cursor = prev.get(cursor) ?? null;
        }
        rev.unshift({ x: from.x, y: from.y });
        return rev;
      }
      queue.push({ x: nx, y: ny });
    }
  }
  return null;
}

/** Build a pixel-space waypoint path from one tile to another, preferring roads. */
function buildPath(mapState: MapState, fromTile: Tile, toTile: Tile, cellSize: number): Px[] {
  const toPx = (t: Tile): Px => ({ x: (t.x + 0.5) * cellSize, y: (t.y + 0.5) * cellSize - 4 });
  const dest = toPx(toTile);
  const roads = mapState.roads;
  if (roads.length === 0) return [dest];
  const roadSet = new Set(roads.map((r) => tileKey(r.x, r.y)));
  const r1 = nearestRoad(roads, Math.floor(fromTile.x), Math.floor(fromTile.y));
  const r2 = nearestRoad(roads, Math.floor(toTile.x), Math.floor(toTile.y));
  if (!r1 || !r2) return [dest];
  const roadPath = bfsRoadPath(roadSet, r1, r2);
  if (!roadPath || roadPath.length === 0) return [dest];
  const pts: Px[] = roadPath.map(toPx);
  pts.push(dest);
  // dedupe consecutive near-duplicates
  const out: Px[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 2) out.push(p);
  }
  return out.length > 0 ? out : [dest];
}

/** Number of hometown NPCs (2 + 1 per house level, capped) — the single source of population. */
export function countHometownNpcs(townBuildings: { type: string; level?: number }[]): number {
  const total = townBuildings
    .filter((b) => b.type === "house")
    .reduce((sum, b) => sum + townsfolkForHouse(b.level || 1), 0);
  return Math.min(total, MAX_NPCS);
}

export function TownNPCs({ mapState, cellSize }: { mapState: MapState; cellSize: number }) {
  const logicRef = useRef<Record<string, NpcLogic>>({});
  const mapStateRef = useRef(mapState);
  mapStateRef.current = mapState;
  const [renderIds, setRenderIds] = useState<string[]>([]);

  // NPCs per house scale with house level (L1=2 … L5/Mansion=6). Nothing else is residential.
  const npcDefs = useMemo<NpcDef[]>(() => {
    const defs: NpcDef[] = [];
    const houses = mapState.buildings.filter((b) => b.type === "house");
    for (const h of houses) {
      const fp = buildingFootprint(h.level || 1, h.type);
      const cx = h.x + fp.w / 2;
      const cy = h.y + fp.h / 2;
      const count = townsfolkForHouse(h.level || 1);
      for (let i = 0; i < count && defs.length < MAX_NPCS; i++) {
        defs.push({
          id: `${h.id}-npc${i}`,
          homeId: h.id,
          // slight per-NPC offset so they don't stack
          homeTile: { x: cx - 0.5 + (i % 3) * 0.35, y: cy - 0.5 + Math.floor(i / 3) * 0.3 },
          color: NPC_COLORS[(defs.length * 3 + h.x + h.y) % NPC_COLORS.length],
        });
      }
    }
    return defs;
  }, [mapState.buildings]);

  useEffect(() => {
    const toPx = (t: Tile): Px => ({ x: (t.x + 0.5) * cellSize, y: (t.y + 0.5) * cellSize - 4 });
    const logic = logicRef.current;

    const pickDestination = (npc: NpcLogic): Tile | null => {
      const ms = mapStateRef.current;
      const businesses = ms.buildings.filter((b) => {
        if (b.id === npc.homeId) return false;
        const def = BUILDINGS[b.type];
        return !!def && (def.incomePerDay > 0 || def.xpPerDay > 0);
      });
      let pool = businesses;
      if (pool.length === 0) {
        // no shops yet — visit a neighbor's cottage instead
        pool = ms.buildings.filter((b) => b.type === "house" && b.id !== npc.homeId);
      }
      if (pool.length === 0) return null;
      const b = pool[Math.floor(Math.random() * pool.length)];
      const fp = buildingFootprint(b.level || 1, b.type);
      return { x: b.x + fp.w / 2 - 0.5, y: b.y + fp.h / 2 - 0.5 };
    };

    const arrive = (npc: NpcLogic) => {
      const now = Date.now();
      if (npc.state === "walking") {
        npc.state = "visiting";
        npc.waitUntil = now + 3000 + Math.random() * 5000;
      } else if (npc.state === "returning") {
        npc.state = "idle";
        npc.waitUntil = now + 2000 + Math.random() * 4000;
      }
    };

    const stepNpc = (npc: NpcLogic) => {
      const wp = npc.waypoints[npc.wpIndex];
      if (!wp) {
        arrive(npc);
        return;
      }
      const dist = Math.hypot(wp.x - npc.px, wp.y - npc.py);
      const duration = Math.max(350, (dist / SPEED_PX_PER_SEC) * 1000);
      npc.anim?.stop();
      npc.anim = Animated.timing(npc.pos, {
        toValue: { x: wp.x, y: wp.y },
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      });
      npc.anim.start(({ finished }) => {
        if (!finished) return;
        npc.px = wp.x;
        npc.py = wp.y;
        npc.wpIndex += 1;
        stepNpc(npc);
      });
    };

    const tick = () => {
      const now = Date.now();
      for (const npc of Object.values(logic)) {
        if (npc.state === "idle" && now >= npc.waitUntil) {
          const dest = pickDestination(npc);
          if (!dest) {
            npc.waitUntil = now + 4000;
            continue;
          }
          const fromTile: Tile = { x: npc.px / cellSize - 0.5, y: npc.py / cellSize - 0.5 };
          npc.waypoints = buildPath(mapStateRef.current, fromTile, dest, cellSize);
          npc.wpIndex = 0;
          npc.state = "walking";
          stepNpc(npc);
        } else if (npc.state === "visiting" && now >= npc.waitUntil) {
          const fromTile: Tile = { x: npc.px / cellSize - 0.5, y: npc.py / cellSize - 0.5 };
          npc.waypoints = buildPath(mapStateRef.current, fromTile, npc.homeTile, cellSize);
          npc.wpIndex = 0;
          npc.state = "returning";
          stepNpc(npc);
        }
      }
    };

    // Reconcile NPCs with current buildings
    const seen = new Set<string>();
    for (const def of npcDefs) {
      seen.add(def.id);
      const homePx = toPx(def.homeTile);
      const existing = logic[def.id];
      if (existing) {
        existing.homeId = def.homeId;
        existing.homeTile = def.homeTile;
        existing.color = def.color;
        if (existing.state === "idle") {
          existing.anim?.stop();
          existing.anim = null;
          existing.pos.setValue(homePx);
          existing.px = homePx.x;
          existing.py = homePx.y;
        }
      } else {
        const bob = new Animated.Value(0);
        const bobDur = 900 + Math.random() * 700;
        Animated.loop(
          Animated.sequence([
            Animated.timing(bob, {
              toValue: 1,
              duration: bobDur,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(bob, {
              toValue: 0,
              duration: bobDur,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        ).start();
        logic[def.id] = {
          id: def.id,
          homeId: def.homeId,
          homeTile: def.homeTile,
          color: def.color,
          pos: new Animated.ValueXY(homePx),
          bob,
          state: "idle",
          waitUntil: Date.now() + 1500 + Math.random() * 5000,
          waypoints: [],
          wpIndex: 0,
          px: homePx.x,
          py: homePx.y,
          anim: null,
        };
      }
    }
    for (const id of Object.keys(logic)) {
      if (!seen.has(id)) {
        logic[id].anim?.stop();
        delete logic[id];
      }
    }
    setRenderIds(Object.keys(logic));

    const timer = setInterval(tick, 700);
    return () => clearInterval(timer);
  }, [npcDefs, cellSize]);

  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}
    >
      {renderIds.map((id) => {
        const npc = logicRef.current[id];
        if (!npc) return null;
        const bobY = npc.bob.interpolate({ inputRange: [0, 1], outputRange: [0, -2.5] });
        return (
          <Animated.View
            key={id}
            style={{
              position: "absolute",
              left: -NPC_SIZE / 2,
              top: -(NPC_SIZE + 6) / 2,
              width: NPC_SIZE,
              height: NPC_SIZE + 6,
              alignItems: "center",
              transform: [...npc.pos.getTranslateTransform(), { translateY: bobY }],
            }}
          >
            {/* head */}
            <View
              style={{
                width: 9,
                height: 9,
                borderRadius: 4.5,
                backgroundColor: npc.color,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View style={{ flexDirection: "row", gap: 2 }}>
                <View style={{ width: 1.5, height: 1.5, borderRadius: 1, backgroundColor: "#1F2937" }} />
                <View style={{ width: 1.5, height: 1.5, borderRadius: 1, backgroundColor: "#1F2937" }} />
              </View>
            </View>
            {/* body */}
            <View
              style={{
                width: 11,
                height: 8,
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                borderBottomLeftRadius: 2,
                borderBottomRightRadius: 2,
                backgroundColor: npc.color,
                marginTop: 0.5,
                opacity: 0.92,
              }}
            />
          </Animated.View>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// CityNPCs: downtown life — plot-building workers + hometown commuters.
// Workers: L2 plot buildings get 2, L3 get 4. They wander the building perimeter.
// Commuters: 25% of the hometown NPC population (rounded) visit the city, wander
// between buildings, then head home. No houses in town = no commuters.
// ---------------------------------------------------------------------------

type CityNpcKind = "worker" | "commuter";

type CityNpcLogic = {
  id: string;
  kind: CityNpcKind;
  anchorId: string; // plot building id (worker) or "commuter"
  color: string;
  pos: Animated.ValueXY;
  bob: Animated.Value;
  state: "idle" | "walking" | "visiting" | "leaving";
  waitUntil: number;
  waypoints: Px[];
  wpIndex: number;
  px: number;
  py: number;
  anim: Animated.CompositeAnimation | null;
  visitsLeft: number;
};

// Slightly more "downtown" palette for city folk
const CITY_NPC_COLORS = [
  "#60A5FA",
  "#94A3B8",
  "#F472B6",
  "#34D399",
  "#FBBF24",
  "#A78BFA",
  "#F87171",
  "#22D3EE",
];

function cityBuildingCenterTiles(mapState: MapState): Tile[] {
  const out: Tile[] = [];
  for (const b of mapState.buildings) {
    const fp = buildingFootprint(b.level || 1, b.type, !!(b as any).plotId);
    out.push({ x: b.x + fp.w / 2 - 0.5, y: b.y + fp.h / 2 - 0.5 });
  }
  return out;
}

function perimeterTiles(b: { x: number; y: number }, fp: { w: number; h: number }): Tile[] {
  const out: Tile[] = [];
  for (let dx = -1; dx <= fp.w; dx++) {
    for (let dy = -1; dy <= fp.h; dy++) {
      const inside = dx >= 0 && dx < fp.w && dy >= 0 && dy < fp.h;
      if (inside) continue;
      const tx = b.x + dx, ty = b.y + dy;
      if (tx < 0 || ty < 0 || tx >= 8 || ty >= 8) continue;
      out.push({ x: tx, y: ty });
    }
  }
  return out;
}

function randomEdgeTile(): Tile {
  const edge = Math.floor(Math.random() * 4);
  const t = Math.floor(Math.random() * 8);
  if (edge === 0) return { x: t, y: 0 };
  if (edge === 1) return { x: t, y: 7 };
  if (edge === 2) return { x: 0, y: t };
  return { x: 7, y: t };
}

export function CityNPCs({
  mapState,
  cellSize,
  hometownNpcCount,
}: {
  mapState: MapState;
  cellSize: number;
  hometownNpcCount: number;
}) {
  const logicRef = useRef<Record<string, CityNpcLogic>>({});
  const mapStateRef = useRef(mapState);
  mapStateRef.current = mapState;
  const countRef = useRef(hometownNpcCount);
  countRef.current = hometownNpcCount;
  const nextSpawnAt = useRef<number>(0);
  const [renderIds, setRenderIds] = useState<string[]>([]);

  // Worker defs: 2 per L2 plot building, 4 per L3. L1 is quiet.
  const workerDefs = useMemo(() => {
    const defs: { id: string; buildingId: string; bx: number; by: number; fp: { w: number; h: number } }[] = [];
    for (const b of mapState.buildings) {
      if (!(b as any).plotId) continue;
      const level = b.level || 1;
      const n = level >= 3 ? 4 : level === 2 ? 2 : 0;
      if (n === 0) continue;
      const fp = buildingFootprint(level, b.type, true);
      for (let i = 0; i < n; i++) {
        defs.push({
          id: `worker-${b.id}-${i}`,
          buildingId: b.id,
          bx: b.x, by: b.y, fp,
        });
      }
    }
    return defs;
  }, [mapState.buildings]);

  const commuterTarget = Math.round((hometownNpcCount || 0) * 0.25);

  useEffect(() => {
    const toPx = (t: Tile): Px => ({ x: (t.x + 0.5) * cellSize, y: (t.y + 0.5) * cellSize - 4 });
    const logic = logicRef.current;

    const makeNpc = (id: string, kind: CityNpcKind, anchorId: string, startTile: Tile): CityNpcLogic => {
      const bob = new Animated.Value(0);
      const bobDur = 900 + Math.random() * 700;
      Animated.loop(
        Animated.sequence([
          Animated.timing(bob, { toValue: 1, duration: bobDur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(bob, { toValue: 0, duration: bobDur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
      const p = toPx(startTile);
      return {
        id, kind, anchorId,
        color: CITY_NPC_COLORS[Math.floor(Math.random() * CITY_NPC_COLORS.length)],
        pos: new Animated.ValueXY(p),
        bob,
        state: "idle",
        waitUntil: Date.now() + 1000 + Math.random() * 3000,
        waypoints: [], wpIndex: 0,
        px: p.x, py: p.y,
        anim: null,
        visitsLeft: kind === "commuter" ? 2 + Math.floor(Math.random() * 2) : Infinity,
      };
    };

    const stepNpc = (npc: CityNpcLogic) => {
      const wp = npc.waypoints[npc.wpIndex];
      if (!wp) { arrive(npc); return; }
      const dist = Math.hypot(wp.x - npc.px, wp.y - npc.py);
      const duration = Math.max(350, (dist / SPEED_PX_PER_SEC) * 1000);
      npc.anim?.stop();
      npc.anim = Animated.timing(npc.pos, {
        toValue: { x: wp.x, y: wp.y },
        duration, easing: Easing.linear, useNativeDriver: true,
      });
      npc.anim.start(({ finished }) => {
        if (!finished) return;
        npc.px = wp.x; npc.py = wp.y;
        npc.wpIndex += 1;
        stepNpc(npc);
      });
    };

    const arrive = (npc: CityNpcLogic) => {
      const now = Date.now();
      if (npc.state === "leaving") {
        // Commuter reached the edge — despawn (heads home)
        npc.anim?.stop();
        delete logic[npc.id];
        setRenderIds(Object.keys(logic));
        return;
      }
      npc.state = "visiting";
      npc.waitUntil = now + (npc.kind === "worker" ? 2000 + Math.random() * 2500 : 3000 + Math.random() * 4000);
    };

    const pickWorkerDest = (npc: CityNpcLogic): Tile | null => {
      const ms = mapStateRef.current;
      const b = ms.buildings.find((x) => x.id === npc.anchorId);
      if (!b) return null;
      const fp = buildingFootprint(b.level || 1, b.type, true);
      const per = perimeterTiles({ x: b.x, y: b.y }, fp);
      if (per.length === 0) return null;
      return per[Math.floor(Math.random() * per.length)];
    };

    const pickCommuterDest = (): Tile | null => {
      const ms = mapStateRef.current;
      const spots = cityBuildingCenterTiles(ms);
      if (spots.length === 0) return null;
      return spots[Math.floor(Math.random() * spots.length)];
    };

    const tick = () => {
      const now = Date.now();
      // Commuter spawner — keep the target population topped up
      const activeCommuters = Object.values(logic).filter((n) => n.kind === "commuter").length;
      const target = Math.round((countRef.current || 0) * 0.25);
      if (activeCommuters < target && now >= nextSpawnAt.current) {
        const id = `commuter-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
        logic[id] = makeNpc(id, "commuter", "commuter", randomEdgeTile());
        nextSpawnAt.current = now + 9000 + Math.random() * 9000;
        setRenderIds(Object.keys(logic));
      }
      for (const npc of Object.values(logic)) {
        if (npc.state === "idle" && now >= npc.waitUntil) {
          const dest = npc.kind === "worker" ? pickWorkerDest(npc) : pickCommuterDest();
          if (!dest) { npc.waitUntil = now + 4000; continue; }
          const fromTile: Tile = { x: npc.px / cellSize - 0.5, y: npc.py / cellSize - 0.5 };
          npc.waypoints = buildPath(mapStateRef.current, fromTile, dest, cellSize);
          npc.wpIndex = 0;
          npc.state = "walking";
          stepNpc(npc);
        } else if (npc.state === "visiting" && now >= npc.waitUntil) {
          if (npc.kind === "commuter") {
            npc.visitsLeft -= 1;
            if (npc.visitsLeft <= 0) {
              // Head home — walk to the nearest edge and despawn
              const fromTile: Tile = { x: npc.px / cellSize - 0.5, y: npc.py / cellSize - 0.5 };
              npc.waypoints = buildPath(mapStateRef.current, fromTile, randomEdgeTile(), cellSize);
              npc.wpIndex = 0;
              npc.state = "leaving";
              stepNpc(npc);
              continue;
            }
          }
          const dest = npc.kind === "worker" ? pickWorkerDest(npc) : pickCommuterDest();
          if (!dest) { npc.waitUntil = now + 4000; continue; }
          const fromTile: Tile = { x: npc.px / cellSize - 0.5, y: npc.py / cellSize - 0.5 };
          npc.waypoints = buildPath(mapStateRef.current, fromTile, dest, cellSize);
          npc.wpIndex = 0;
          npc.state = "walking";
          stepNpc(npc);
        }
      }
    };

    // Reconcile workers with plot buildings
    const seen = new Set<string>();
    for (const def of workerDefs) {
      seen.add(def.id);
      if (!logic[def.id]) {
        const cx = def.bx + def.fp.w / 2 - 0.5;
        const cy = def.by + def.fp.h / 2 - 0.5;
        logic[def.id] = makeNpc(def.id, "worker", def.buildingId, { x: cx, y: cy });
      } else {
        logic[def.id].anchorId = def.buildingId;
      }
    }
    for (const id of Object.keys(logic)) {
      const npc = logic[id];
      if (npc.kind === "worker" && !seen.has(id)) {
        npc.anim?.stop();
        delete logic[id];
      }
    }
    setRenderIds(Object.keys(logic));

    const timer = setInterval(tick, 700);
    return () => clearInterval(timer);
  }, [workerDefs, cellSize]);

  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}>
      {renderIds.map((id) => {
        const npc = logicRef.current[id];
        if (!npc) return null;
        const bobY = npc.bob.interpolate({ inputRange: [0, 1], outputRange: [0, -2.5] });
        return (
          <Animated.View
            key={id}
            style={{
              position: "absolute",
              left: -NPC_SIZE / 2,
              top: -(NPC_SIZE + 6) / 2,
              width: NPC_SIZE,
              height: NPC_SIZE + 6,
              alignItems: "center",
              transform: [...npc.pos.getTranslateTransform(), { translateY: bobY }],
            }}
          >
            <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: npc.color, alignItems: "center", justifyContent: "center" }}>
              <View style={{ flexDirection: "row", gap: 2 }}>
                <View style={{ width: 1.5, height: 1.5, borderRadius: 1, backgroundColor: "#1F2937" }} />
                <View style={{ width: 1.5, height: 1.5, borderRadius: 1, backgroundColor: "#1F2937" }} />
              </View>
            </View>
            <View style={{ width: 11, height: 8, borderTopLeftRadius: 4, borderTopRightRadius: 4, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, backgroundColor: npc.color, marginTop: 0.5, opacity: 0.92 }} />
          </Animated.View>
        );
      })}
    </View>
  );
}
