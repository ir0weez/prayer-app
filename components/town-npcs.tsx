import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";
import {
  BUILDINGS,
  buildingFootprint,
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

export function TownNPCs({ mapState, cellSize }: { mapState: MapState; cellSize: number }) {
  const logicRef = useRef<Record<string, NpcLogic>>({});
  const mapStateRef = useRef(mapState);
  mapStateRef.current = mapState;
  const [renderIds, setRenderIds] = useState<string[]>([]);

  // 2 NPCs per cottage ("house"). Nothing else is residential.
  const npcDefs = useMemo<NpcDef[]>(() => {
    const defs: NpcDef[] = [];
    const houses = mapState.buildings.filter((b) => b.type === "house");
    for (const h of houses) {
      const fp = buildingFootprint(h.level || 1);
      const cx = h.x + fp.w / 2;
      const cy = h.y + fp.h / 2;
      for (let i = 0; i < 2 && defs.length < MAX_NPCS; i++) {
        defs.push({
          id: `${h.id}-npc${i}`,
          homeId: h.id,
          // slight per-NPC offset so the pair don't stack
          homeTile: { x: cx - 0.5 + i * 0.35, y: cy - 0.5 },
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
      const fp = buildingFootprint(b.level || 1);
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
