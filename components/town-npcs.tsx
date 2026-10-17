import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import {
  BUILDINGS,
  buildingFootprint,
  townsfolkForHouse,
  PRAYER_VILLAGER_CAP,
  isRestaurantType,
  isGatheringTime,
  type MapState,
  type PrayedPerson,
} from "@/lib/hometown";
import { getTimeOfDay } from "@/lib/daynight";

const NPC_SIZE = 16;
const SPEED_PX_PER_SEC = 42;
const MAX_NPCS = 24;

// Animated Pressable so blessed villagers can be tapped without losing their
// native-driver movement transform.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  /** Blessed prayer visitor (golden glow) vs. regular house villager. */
  blessed?: boolean;
  /** Prayer contact name (blessed villagers only). */
  name?: string;
  /** Prayer contact id (blessed villagers only). */
  prayerId?: string;
};

type NpcLogic = {
  id: string;
  homeId: string;
  homeTile: Tile;
  color: string;
  blessed?: boolean;
  name?: string;
  prayerId?: string;
  pos: Animated.ValueXY;
  bob: Animated.Value;
  snore: Animated.Value;
  state: "idle" | "walking" | "visiting" | "returning";
  waitUntil: number;
  waypoints: Px[];
  wpIndex: number;
  px: number;
  py: number;
  anim: Animated.CompositeAnimation | null;
  destBuildingId?: string;
  destType?: string;
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

export function TownNPCs({
  mapState,
  cellSize,
  onBankVisit,
  prayerPeople,
  onPrayerVillagerTap,
}: {
  mapState: MapState;
  cellSize: number;
  /** Called when an NPC arrives at a bank/bank-tower: (buildingId). */
  onBankVisit?: (buildingId: string) => void;
  /** Prayer contacts prayed for today — each spawns a blessed golden villager. */
  prayerPeople?: PrayedPerson[];
  /** Called when a blessed prayer villager is tapped: ({ id, name }). */
  onPrayerVillagerTap?: (person: { id: string; name: string }) => void;
}) {
  const logicRef = useRef<Record<string, NpcLogic>>({});
  const mapStateRef = useRef(mapState);
  mapStateRef.current = mapState;
  const visitRef = useRef(onBankVisit);
  visitRef.current = onBankVisit;
  const tapRef = useRef(onPrayerVillagerTap);
  tapRef.current = onPrayerVillagerTap;
  const [renderIds, setRenderIds] = useState<string[]>([]);
  // Villagers asleep at home (night && idle). Synced in tick; drives the 💤 render.
  const [sleepingIds, setSleepingIds] = useState<Set<string>>(new Set());
  const sleepingRef = useRef<Set<string>>(new Set());
  // Blessed villagers currently visiting the church or a restaurant show their
  // name above them (the fellowship moment). Capped at 15, closest first.
  const [namedIds, setNamedIds] = useState<Set<string>>(new Set());
  const namedRef = useRef<Set<string>>(new Set());
  const nightRef = useRef<boolean>(getTimeOfDay() === "night");

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
    // Blessed prayer visitors: each contact prayed for today sends a golden
    // villager into town for the day. They gather at the church (or town
    // center if no church yet) and wander like everyone else.
    const church = mapState.buildings.find((b) => b.type === "church");
    const cfp = church ? buildingFootprint(church.level || 1, church.type) : null;
    const prayerHome: Tile = church && cfp
      ? { x: church.x + cfp.w / 2 - 0.5, y: church.y + cfp.h / 2 - 0.5 }
      : { x: 3.5, y: 3.5 };
    const prayerList = (prayerPeople || []).slice(0, PRAYER_VILLAGER_CAP);
    for (let pi = 0; pi < prayerList.length; pi++) {
      const p = prayerList[pi];
      defs.push({
        id: `prayer-${p.id}`,
        homeId: church ? church.id : "prayer-gate",
        homeTile: {
          x: prayerHome.x + (pi % 4) * 0.3,
          y: prayerHome.y + Math.floor(pi / 4) * 0.3,
        },
        color: "#FBBF24",
        blessed: true,
        name: p.name,
        prayerId: String(p.id),
      });
    }
    return defs;
  }, [mapState.buildings, prayerPeople]);

  useEffect(() => {
    const toPx = (t: Tile): Px => ({ x: (t.x + 0.5) * cellSize, y: (t.y + 0.5) * cellSize - 4 });
    const logic = logicRef.current;

    const pickDestination = (npc: NpcLogic): { tile: Tile; buildingId: string; type: string } | null => {
      const ms = mapStateRef.current;
      const businesses = ms.buildings.filter((b) => {
        if (b.id === npc.homeId) return false;
        const def = BUILDINGS[b.type];
        return !!def && (def.incomePerDay > 0 || def.xpPerDay > 0);
      });
      let pool = businesses;
      // The Gathering: blessed prayer villagers head to Restaurant Row to break
      // bread together (Mon/Wed/Fri 6-8pm). A shared meal, not just a visit.
      if (npc.blessed && isGatheringTime()) {
        const restaurants = businesses.filter((b) => isRestaurantType(b.type));
        if (restaurants.length > 0) pool = restaurants;
      }
      if (pool.length === 0) {
        // no shops yet — visit a neighbor's cottage instead
        pool = ms.buildings.filter((b) => b.type === "house" && b.id !== npc.homeId);
      }
      if (pool.length === 0) return null;
      const b = pool[Math.floor(Math.random() * pool.length)];
      const fp = buildingFootprint(b.level || 1, b.type);
      return {
        tile: { x: b.x + fp.w / 2 - 0.5, y: b.y + fp.h / 2 - 0.5 },
        buildingId: b.id,
        type: b.type,
      };
    };

    const arrive = (npc: NpcLogic) => {
      const now = Date.now();
      const nightNow = getTimeOfDay() === "night";
      if (npc.state === "walking") {
        npc.state = "visiting";
        // At night the town is asleep — just a quick peek before heading home.
        // Businesses are closed, so no bank-visit bonus either.
        // During the gathering, blessed villagers linger for a real shared meal.
        const gatheringMeal = npc.blessed && isGatheringTime() && npc.destType && isRestaurantType(npc.destType as any);
        npc.waitUntil = now + (nightNow ? 1200 : gatheringMeal ? 12000 + Math.random() * 8000 : 3000 + Math.random() * 5000);
        // Visiting a bank? Customers doing business — bonus coins for the bank.
        if (!nightNow && (npc.destType === "bank" || npc.destType === "bank-tower") && npc.destBuildingId) {
          try {
            visitRef.current?.(npc.destBuildingId);
          } catch {}
        }
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
      const night = getTimeOfDay() === "night";
      if (night !== nightRef.current) {
        nightRef.current = night;
        if (!night) {
          // Morning: stagger the wake-up so the whole town doesn't pour out at once.
          for (const npc of Object.values(logic)) {
            if (npc.state === "idle") npc.waitUntil = now + 1500 + Math.random() * 5000;
          }
        }
      }
      for (const npc of Object.values(logic)) {
        if (night) {
          if (npc.state === "idle") continue; // home asleep — stay put
          if (npc.state === "visiting") {
            // Cut the visit short so they head home; the branch below sends them.
            if (now < npc.waitUntil) npc.waitUntil = now;
          } else {
            continue; // walking / returning: let them finish the current leg, no teleports
          }
        }
        if (npc.state === "idle" && now >= npc.waitUntil) {
          const dest = pickDestination(npc);
          if (!dest) {
            npc.waitUntil = now + 4000;
            continue;
          }
          const fromTile: Tile = { x: npc.px / cellSize - 0.5, y: npc.py / cellSize - 0.5 };
          npc.waypoints = buildPath(mapStateRef.current, fromTile, dest.tile, cellSize);
          npc.wpIndex = 0;
          npc.destBuildingId = dest.buildingId;
          npc.destType = dest.type;
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
      // Sync the sleeping set for the 💤 render (only fires when someone dozes off / wakes).
      const next = new Set<string>();
      if (night) {
        for (const npc of Object.values(logic)) {
          if (npc.state === "idle") next.add(npc.id);
        }
      }
      const prev = sleepingRef.current;
      let changed = next.size !== prev.size;
      if (!changed) {
        for (const id of next) {
          if (!prev.has(id)) { changed = true; break; }
        }
      }
      if (changed) {
        sleepingRef.current = next;
        setSleepingIds(next);
      }
      // Sync name labels: blessed villagers visiting the church or a restaurant
      // show their names (the fellowship moment). Cap at 15, closest to the
      // building center first, so busy days don't turn into label chaos.
      const candidates: { id: string; d: number }[] = [];
      if (!night) {
        for (const npc of Object.values(logic)) {
          if (!npc.blessed || npc.state !== "visiting" || !npc.name) continue;
          const dt = npc.destType;
          if (dt !== "church" && !isRestaurantType(dt as any)) continue;
          let d = 0;
          const b = mapStateRef.current.buildings.find((x) => x.id === npc.destBuildingId);
          if (b) {
            const fp = buildingFootprint(b.level || 1, b.type);
            const cx = (b.x + fp.w / 2) * cellSize;
            const cy = (b.y + fp.h / 2) * cellSize;
            d = Math.hypot(npc.px - cx, npc.py - cy);
          }
          candidates.push({ id: npc.id, d });
        }
      }
      candidates.sort((a, b) => a.d - b.d);
      const nextNamed = new Set(candidates.slice(0, 15).map((c) => c.id));
      const prevNamed = namedRef.current;
      let namedChanged = nextNamed.size !== prevNamed.size;
      if (!namedChanged) {
        for (const id of nextNamed) {
          if (!prevNamed.has(id)) { namedChanged = true; break; }
        }
      }
      if (namedChanged) {
        namedRef.current = nextNamed;
        setNamedIds(nextNamed);
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
        existing.blessed = def.blessed;
        existing.name = def.name;
        existing.prayerId = def.prayerId;
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
        // Slow rising 💤 loop — only rendered while the villager sleeps.
        const snore = new Animated.Value(0);
        Animated.loop(
          Animated.sequence([
            Animated.timing(snore, {
              toValue: 1,
              duration: 1500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(snore, {
              toValue: 0,
              duration: 1500,
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
          blessed: def.blessed,
          name: def.name,
          prayerId: def.prayerId,
          pos: new Animated.ValueXY(homePx),
          bob,
          snore,
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

    // Initial night/sleep sync (app opened at night → villagers already asleep).
    {
      const night0 = getTimeOfDay() === "night";
      nightRef.current = night0;
      const s0 = new Set<string>();
      if (night0) {
        for (const [id, npc] of Object.entries(logic)) {
          if (npc.state === "idle") s0.add(id);
        }
      }
      sleepingRef.current = s0;
      setSleepingIds(s0);
    }

    const timer = setInterval(tick, 700);
    return () => clearInterval(timer);
  }, [npcDefs, cellSize]);

  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}
    >
      {renderIds.map((id) => {
        const npc = logicRef.current[id];
        if (!npc) return null;
        const bobY = npc.bob.interpolate({ inputRange: [0, 1], outputRange: [0, -2.5] });
        const asleep = sleepingIds.has(id);
        const blessed = !!npc.blessed;
        const showName = blessed && namedIds.has(id) && !!npc.name;
        const body = (
          <>
            {/* golden halo for blessed prayer visitors */}
            {blessed ? (
              <View
                style={{
                  position: "absolute",
                  top: -6,
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: "#FBBF24",
                  opacity: 0.3,
                }}
              />
            ) : null}
            {/* 💤 while asleep at home */}
            {asleep ? (
              <Animated.Text
                style={{
                  position: "absolute",
                  top: -16,
                  fontSize: 11,
                  opacity: npc.snore.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
                  transform: [
                    { translateY: npc.snore.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) },
                  ],
                }}
              >
                💤
              </Animated.Text>
            ) : null}
            {/* name label — only while visiting the church or a restaurant */}
            {showName ? (
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  position: "absolute",
                  top: -30,
                  left: -37,
                  width: 90,
                  textAlign: "center",
                  fontSize: 10,
                  fontWeight: "700",
                  color: "#FDE68A",
                  textShadowColor: "rgba(0,0,0,0.65)",
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }}
              >
                {npc.name}
              </Text>
            ) : null}
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
          </>
        );
        const frameStyle = {
          position: "absolute" as const,
          left: -NPC_SIZE / 2,
          top: -(NPC_SIZE + 6) / 2,
          width: NPC_SIZE,
          height: NPC_SIZE + 6,
          alignItems: "center" as const,
          transform: [...npc.pos.getTranslateTransform(), { translateY: bobY }],
        };
        // Blessed villagers are tappable — tap to see who they are.
        // House villagers stay ambient and never intercept touches.
        return blessed ? (
          <AnimatedPressable
            key={id}
            onPress={() => tapRef.current?.({ id: npc.prayerId || npc.id, name: npc.name || "Friend" })}
            style={frameStyle}
          >
            {body}
          </AnimatedPressable>
        ) : (
          <Animated.View key={id} pointerEvents="none" style={frameStyle}>
            {body}
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
  destBuildingId?: string;
  destType?: string;
  /** Workers clock out at night (hidden until morning). */
  offShift?: boolean;
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

function cityBuildingCenterTiles(mapState: MapState): { tile: Tile; id: string; type: string }[] {
  const out: { tile: Tile; id: string; type: string }[] = [];
  for (const b of mapState.buildings) {
    const fp = buildingFootprint(b.level || 1, b.type, !!(b as any).plotId);
    out.push({
      tile: { x: b.x + fp.w / 2 - 0.5, y: b.y + fp.h / 2 - 0.5 },
      id: b.id,
      type: b.type,
    });
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
  onBankVisit,
}: {
  mapState: MapState;
  cellSize: number;
  hometownNpcCount: number;
  /** Called when a commuter arrives at a bank/bank-tower: (buildingId). */
  onBankVisit?: (buildingId: string) => void;
}) {
  const logicRef = useRef<Record<string, CityNpcLogic>>({});
  const mapStateRef = useRef(mapState);
  mapStateRef.current = mapState;
  const countRef = useRef(hometownNpcCount);
  countRef.current = hometownNpcCount;
  const visitRef = useRef(onBankVisit);
  visitRef.current = onBankVisit;
  const nextSpawnAt = useRef<number>(0);
  const [renderIds, setRenderIds] = useState<string[]>([]);
  const nightRef = useRef<boolean>(getTimeOfDay() === "night");

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
      // Commuter visiting a bank? Customers doing business — bonus coins for the bank.
      // (Closed at night — the city is asleep.)
      if (
        npc.kind === "commuter" &&
        getTimeOfDay() !== "night" &&
        (npc.destType === "bank" || npc.destType === "bank-tower") &&
        npc.destBuildingId
      ) {
        try {
          visitRef.current?.(npc.destBuildingId);
        } catch {}
      }
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

    const pickCommuterDest = (): { tile: Tile; id: string; type: string } | null => {
      const ms = mapStateRef.current;
      const spots = cityBuildingCenterTiles(ms);
      if (spots.length === 0) return null;
      return spots[Math.floor(Math.random() * spots.length)];
    };

    const tick = () => {
      const now = Date.now();
      const night = getTimeOfDay() === "night";
      if (night !== nightRef.current) {
        nightRef.current = night;
        if (night) {
          // Night falls: workers clock out, commuters head home. The city sleeps.
          for (const npc of Object.values(logic)) {
            if (npc.kind === "worker") {
              npc.anim?.stop();
              npc.offShift = true;
              npc.state = "idle";
              npc.waypoints = [];
              npc.wpIndex = 0;
            } else if (npc.state === "visiting") {
              npc.visitsLeft = 0;
              npc.waitUntil = now;
            }
          }
        } else {
          // Morning: workers clock back in, staggered.
          for (const npc of Object.values(logic)) {
            if (npc.kind === "worker" && npc.offShift) {
              npc.offShift = false;
              npc.state = "idle";
              npc.waitUntil = now + Math.random() * 5000;
            }
          }
        }
        setRenderIds(Object.keys(logic)); // re-render to hide / show workers
      }
      // Commuter spawner — keep the target population topped up (nobody commutes at night)
      const activeCommuters = Object.values(logic).filter((n) => n.kind === "commuter").length;
      const target = night ? 0 : Math.round((countRef.current || 0) * 0.25);
      if (activeCommuters < target && now >= nextSpawnAt.current) {
        const id = `commuter-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
        logic[id] = makeNpc(id, "commuter", "commuter", randomEdgeTile());
        nextSpawnAt.current = now + 9000 + Math.random() * 9000;
        setRenderIds(Object.keys(logic));
      }
      const startWalk = (npc: CityNpcLogic, dest: Tile | { tile: Tile; id: string; type: string }) => {
        const tile = (dest as { tile?: Tile }).tile ?? (dest as Tile);
        const fromTile: Tile = { x: npc.px / cellSize - 0.5, y: npc.py / cellSize - 0.5 };
        npc.waypoints = buildPath(mapStateRef.current, fromTile, tile, cellSize);
        npc.wpIndex = 0;
        if ((dest as { id?: string }).id) {
          npc.destBuildingId = (dest as { id: string }).id;
          npc.destType = (dest as { type: string }).type;
        } else {
          npc.destBuildingId = undefined;
          npc.destType = undefined;
        }
        npc.state = "walking";
        stepNpc(npc);
      };
      for (const npc of Object.values(logic)) {
        if (npc.offShift) continue; // clocked out for the night
        if (night && npc.kind === "commuter") npc.visitsLeft = 0; // no late-night errands
        if (npc.state === "idle" && now >= npc.waitUntil) {
          const dest = npc.kind === "worker" ? pickWorkerDest(npc) : pickCommuterDest();
          if (!dest) { npc.waitUntil = now + 4000; continue; }
          startWalk(npc, dest);
        } else if (npc.state === "visiting" && now >= npc.waitUntil) {
          if (npc.kind === "commuter") {
            npc.visitsLeft -= 1;
            if (npc.visitsLeft <= 0) {
              // Head home — walk to the nearest edge and despawn
              const fromTile: Tile = { x: npc.px / cellSize - 0.5, y: npc.py / cellSize - 0.5 };
              npc.waypoints = buildPath(mapStateRef.current, fromTile, randomEdgeTile(), cellSize);
              npc.wpIndex = 0;
              npc.destBuildingId = undefined;
              npc.destType = undefined;
              npc.state = "leaving";
              stepNpc(npc);
              continue;
            }
          }
          const dest = npc.kind === "worker" ? pickWorkerDest(npc) : pickCommuterDest();
          if (!dest) { npc.waitUntil = now + 4000; continue; }
          startWalk(npc, dest);
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
        if (!npc || npc.offShift) return null;
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
