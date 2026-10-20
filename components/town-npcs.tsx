import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Line } from "react-native-svg";
import {
  BUILDINGS,
  buildingFootprint,
  cottageHomeFor,
  PRAYER_VILLAGER_CAP,
  isRestaurantType,
  isGatheringTime,
  isStreamTile,
  type BuildingType,
  type MapState,
} from "@/lib/hometown";
import { getTimeOfDay } from "@/lib/daynight";
import { WORK_KINDS } from "@/lib/villager-work";

/** Work badge icon per work kind — shown above a light on a shift. */
const WORK_BADGE_ICONS: Record<string, string> = Object.fromEntries(
  Object.entries(WORK_KINDS).map(([kind, def]) => [kind, def.badgeIcon])
);

const NPC_SIZE = 16;
const SPEED_PX_PER_SEC = 42;
/** Prayer lights: golden villagers for everyone prayed for today. Max 40. */
const MAX_LIGHTS = PRAYER_VILLAGER_CAP;

// Animated Pressable so villagers can be tapped without losing their
// native-driver movement transform.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Fallback body color (unused — lights are always golden)
const LIGHT_COLOR = "#FBBF24";

/** Activity icon per building type — shown above a light while visiting.
 *  MaterialIcons only (no emojis); weaponsmith gets a tiny drawn glyph
 *  since the icon font has no swords. */
const ACTIVITY_ICONS: Record<string, string> = {
  barbershop: "content-cut",
  "pizza-place": "restaurant",
  "burger-joint": "restaurant",
  "taco-stand": "restaurant",
  "sushi-bar": "restaurant",
  diner: "restaurant",
  "upper-room": "restaurant",
  "manna-house": "restaurant",
  "feast-hall": "restaurant",
  bank: "account-balance",
  "bank-tower": "account-balance",
  church: "church",
  farm: "agriculture",
  armory: "shield",
  bakery: "bakery-dining",
  market: "shopping-basket",
  "clothes-shop": "checkroom",
  toolshop: "handyman",
  shop: "store",
  weaponsmith: "__swords__",
  /** Gathering places — villagers tending, gathering, resting together. */
  "community-garden": "spa",
  "fountain-plaza": "people",
  /** Schedule sync — the pawn mimics Jonathan's day; villagers join people events. */
  "amphitheater": "theater-comedy",
  "hospital": "local-hospital",
  "pawn-house": "home",
  __barbecue__: "outdoor-grill",
  /** Villager home life (pseudo-types, keyed the same way as building types). */
  __resting__: "bedtime",
  __visiting__: "people",
};

function ActivityGlyph({ type }: { type: string }) {
  if (type === "weaponsmith") {
    return (
      <Svg width={11} height={11} viewBox="0 0 12 12">
        <Line x1="2.5" y1="9.5" x2="9.5" y2="2.5" stroke="#92400E" strokeWidth={1.7} strokeLinecap="round" />
        <Line x1="9.5" y1="9.5" x2="2.5" y2="2.5" stroke="#92400E" strokeWidth={1.7} strokeLinecap="round" />
        <Line x1="1.6" y1="8.6" x2="3.4" y2="10.4" stroke="#92400E" strokeWidth={1.3} strokeLinecap="round" />
        <Line x1="10.4" y1="8.6" x2="8.6" y2="10.4" stroke="#92400E" strokeWidth={1.3} strokeLinecap="round" />
      </Svg>
    );
  }
  const name = ACTIVITY_ICONS[type];
  if (!name) return null;
  return <MaterialIcons name={name as any} size={11} color="#92400E" />;
}

/** Pseudo-destination for free wandering: a stroll to a street corner, a
 *  quiet lane, or the far ends of town. Not a building — no activity badge,
 *  no bank bonus, no name label. Just exploring. */
const STROLL_TYPE = "__stroll__";

/** Villager meetups — two lights crossing paths pause for a quick chat. */
const CHAT_RANGE_PX = 34;
const CHAT_COOLDOWN_MS = 25000;
const MAX_CHAT_PAIRS = 6;

type Tile = { x: number; y: number };
type Px = { x: number; y: number };

/** A prayer light — someone Jonathan prayed for today, glowing golden. */
export type LightInfo = {
  personId: string;
  name: string;
};

type NpcDef = {
  id: string;
  homeId: string;
  homeTile: Tile;
  color: string;
  /** Person's name — shown at church/restaurants (the fellowship moment). */
  name?: string;
  /** Prayer contact id. */
  prayerId?: string;
};

type NpcLogic = {
  id: string;
  homeId: string;
  homeTile: Tile;
  color: string;
  name?: string;
  prayerId?: string;
  pos: Animated.ValueXY;
  bob: Animated.Value;
  snore: Animated.Value;
  state: "idle" | "walking" | "visiting" | "returning" | "chatting";
  waitUntil: number;
  waypoints: Px[];
  wpIndex: number;
  px: number;
  py: number;
  anim: Animated.CompositeAnimation | null;
  destBuildingId?: string;
  destType?: string;
  /** The building this light visited last — the next pick prefers somewhere
   *  new so they don't pace between the same two doors. */
  lastDestBuildingId?: string;
  /** Meetup bookkeeping. */
  chatUntil: number;
  chatPartnerId?: string;
  lastChatAt: number;
  prevState?: "idle" | "walking" | "visiting" | "returning";
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

/** Number of prayer lights — the prayed-for count, capped. The single source of population. */
export function countHometownNpcs(prayedCount: number): number {
  return Math.min(Math.max(prayedCount || 0, 0), PRAYER_VILLAGER_CAP);
}

function TownNPCsImpl({
  mapState,
  cellSize,
  onBankVisit,
  lights,
  onVillagerTap,
  missionWaitingIds,
  missionGuides,
  onMissionArrival,
  workGuides,
  workMap,
  onWorkArrival,
  scheduleGuides,
  scheduleMap,
  scheduleKind,
  bare,
  positionsRef,
}: {
  mapState: MapState;
  cellSize: number;
  /** Called when an NPC arrives at a bank/bank-tower: (buildingId). */
  onBankVisit?: (buildingId: string) => void;
  /** People prayed for today — golden lights (max 40). */
  lights?: LightInfo[];
  /** Called when a villager is tapped: ({ id, name }). */
  onVillagerTap?: (person: { id: string; name: string }) => void;
  /** personIds of lights with a waiting villager mission — they stand still with a "?". */
  missionWaitingIds?: Set<string>;
  /** personId -> forced destination while guiding a villager mission. */
  missionGuides?: Record<string, { tile: { x: number; y: number }; buildingId: string; type: string }>;
  /** Called when a guided light arrives at its mission target. */
  onMissionArrival?: (personId: string) => void;
  /** personId -> forced destination for a Jonathan-assigned work shift. */
  workGuides?: Record<string, { tile: { x: number; y: number }; buildingId: string; type: string }>;
  /** personId -> work-shift info while the light is on the job (en-route or working). */
  workMap?: Record<string, { untilMs: number; kind: string }>;
  /** Called when a work-guided light arrives at its work site. */
  onWorkArrival?: (personId: string) => void;
  /** personId -> forced destination for a schedule event (Jonathan's pawn
      mimics his day; villagers join people events — meals, movies, ministry). */
  scheduleGuides?: Record<string, { tile: { x: number; y: number }; buildingId: string; type: string }>;
  /** personId -> schedule-event info while the light is at the event. */
  scheduleMap?: Record<string, { untilMs: number; kind: string }>;
  /** The kind of the active schedule event (drives the badge icon). */
  scheduleKind?: string;
  /** Render entities directly (no container) so the parent can depth-sort
      them with buildings via zIndex — villagers walk BEHIND tall buildings. */
  bare?: boolean;
  /** Optional ref that receives live villager tile positions [{x, y}, ...],
      updated on each render pass. Used for presence-gated building income. */
  positionsRef?: React.MutableRefObject<Array<{ x: number; y: number }>>;
}) {
  const logicRef = useRef<Record<string, NpcLogic>>({});
  const mapStateRef = useRef(mapState);
  mapStateRef.current = mapState;
  const positionsRefHolder = useRef(positionsRef);
  positionsRefHolder.current = positionsRef;
  const visitRef = useRef(onBankVisit);
  visitRef.current = onBankVisit;
  const tapRef = useRef(onVillagerTap);
  tapRef.current = onVillagerTap;
  // Villager missions: a light with a waiting request stands still with a "?";
  // a guided light walks straight to its mission target.
  const missionWaitingRef = useRef<Set<string> | undefined>(missionWaitingIds);
  missionWaitingRef.current = missionWaitingIds;
  const missionGuidesRef = useRef(missionGuides);
  missionGuidesRef.current = missionGuides;
  const missionArrivalRef = useRef(onMissionArrival);
  missionArrivalRef.current = onMissionArrival;
  // Villager work assignments: Jonathan sends a light to do timed work.
  const workGuidesRef = useRef(workGuides);
  workGuidesRef.current = workGuides;
  const workMapRef = useRef(workMap);
  workMapRef.current = workMap;
  const workArrivalRef = useRef(onWorkArrival);
  workArrivalRef.current = onWorkArrival;
  // Schedule sync: the pawn mimics Jonathan's day; villagers join people events.
  const scheduleGuidesRef = useRef(scheduleGuides);
  scheduleGuidesRef.current = scheduleGuides;
  const scheduleMapRef = useRef(scheduleMap);
  scheduleMapRef.current = scheduleMap;
  const [renderIds, setRenderIds] = useState<string[]>([]);
  // Villagers asleep at home (night && idle). Synced in tick; drives the 💤 render.
  const [sleepingIds, setSleepingIds] = useState<Set<string>>(new Set());
  const sleepingRef = useRef<Set<string>>(new Set());
  // Lights at the church or a restaurant show their name (the fellowship
  // moment). Capped at 15, closest first, so busy days don't turn into label chaos.
  const [namedIds, setNamedIds] = useState<Set<string>>(new Set());
  const namedRef = useRef<Set<string>>(new Set());
  // Activity badges: id -> building type while a light is visiting (haircut,
  // meal, errand...). Synced in tick; drives the badge render.
  const [activityMap, setActivityMap] = useState<Record<string, string>>({});
  const activityRef = useRef<Record<string, string>>({});
  // Work badges: npc id -> work kind while a light is on a Jonathan-assigned
  // shift (hammer, broom...). Takes precedence over the activity badge.
  const [workBadgeMap, setWorkBadgeMap] = useState<Record<string, string>>({});
  const workBadgeRef = useRef<Record<string, string>>({});
  // Lights clocked in at their work site — they rock side-to-side (busy)
  // instead of the idle bob, so a shift looks like work, not loitering.
  const [workingIds, setWorkingIds] = useState<Set<string>>(new Set());
  const workingRef = useRef<Set<string>>(new Set());
  // Lights currently paused for a chat meetup. Synced in tick; drives bubbles.
  const [chattingIds, setChattingIds] = useState<Set<string>>(new Set());
  const chattingRef = useRef<Set<string>>(new Set());
  const nightRef = useRef<boolean>(getTimeOfDay() === "night");

  // Prayer lights: everyone Jonathan prayed for today appears as a golden
  // light. They gather at the church and wander town. Gone by midnight —
  // each day brings a new set of lights.
  const npcDefs = useMemo<NpcDef[]>(() => {
    const defs: NpcDef[] = [];
    const church = mapState.buildings.find((b) => b.type === "church");
    const cfp = church ? buildingFootprint(church.level || 1, church.type) : null;
    const churchHome: Tile = church && cfp
      ? { x: church.x + cfp.w / 2 - 0.5, y: church.y + cfp.h / 2 - 0.5 }
      : { x: 3.5, y: 3.5 };
    const lightList = (lights || []).slice(0, MAX_LIGHTS);
    for (let pi = 0; pi < lightList.length; pi++) {
      const p = lightList[pi];
      // Villager homes: each light is assigned a cottage (stable by id). At
      // night they walk home and sleep there; by day they sometimes rest at
      // home or visit a friend's cottage. Residents, not wanderers.
      const cottage = cottageHomeFor(mapState.buildings, p.personId);
      let homeId = church ? church.id : "prayer-gate";
      let homeTile: Tile = {
        x: churchHome.x + (pi % 4) * 0.3,
        y: churchHome.y + Math.floor(pi / 4) * 0.3,
      };
      if (cottage) {
        // Sleep on the front lawn — visible under the stars. (Depth sorting
        // would tuck them behind the 1x1 cottage if they slept at its center.)
        homeId = cottage.id;
        homeTile = {
          x: cottage.x + (((pi * 37) % 5) - 2) * 0.18,
          y: cottage.y + 0.85,
        };
      }
      defs.push({
        id: `light-${p.personId}`,
        homeId,
        homeTile,
        color: LIGHT_COLOR,
        name: p.name,
        prayerId: String(p.personId),
      });
    }
    return defs;
  }, [mapState.buildings, lights]);

  useEffect(() => {
    const toPx = (t: Tile): Px => ({ x: (t.x + 0.5) * cellSize, y: (t.y + 0.5) * cellSize - 4 });
    const logic = logicRef.current;

    /** How many other villagers are already heading to (or at) this
     *  building — the spread-out metric. */
    const crowdAt = (buildingId: string, selfId: string): number => {
      let n = 0;
      for (const other of Object.values(logic)) {
        if (other.id === selfId) continue;
        if (other.destBuildingId !== buildingId) continue;
        if (other.state === "walking" || other.state === "visiting" || other.state === "chatting") n++;
      }
      return n;
    };

    const buildingDest = (b: { id: string; level?: number; type: BuildingType; x: number; y: number }) => {
      const fp = buildingFootprint(b.level || 1, b.type);
      return {
        tile: { x: b.x + fp.w / 2 - 0.5, y: b.y + fp.h / 2 - 0.5 },
        buildingId: b.id,
        type: b.type,
      };
    };

    /** Pick among candidate buildings with separation: draw a few at random
     *  and take the least crowded (ties broken randomly), avoiding the last
     *  place this villager visited — so they spread out instead of all
     *  queueing at the same door or pacing the same two shops. */
    const pickSpread = <T extends { id: string }>(
      npc: NpcLogic,
      candidates: T[],
      toDest: (c: T) => { tile: Tile; buildingId: string; type: string }
    ): { tile: Tile; buildingId: string; type: string } | null => {
      if (candidates.length === 0) return null;
      let best: T | null = null;
      let bestScore = Infinity;
      const draws = Math.min(4, candidates.length);
      for (let i = 0; i < draws; i++) {
        const c = candidates[Math.floor(Math.random() * candidates.length)];
        if (best && c.id === best.id) continue;
        const score =
          crowdAt(c.id, npc.id) * 10 +
          (c.id === npc.lastDestBuildingId ? 4 : 0) +
          Math.random() * 2;
        if (score < bestScore) {
          bestScore = score;
          best = c;
        }
      }
      return best ? toDest(best) : null;
    };

    /** A free stroll: head to a street corner somewhere else on the map.
     *  Draws 3 road tiles and takes the farthest from the villager's current
     *  spot — villagers end up exploring the far ends of town, quiet lanes,
     *  and the stream banks instead of pacing the same block. */
    const pickStroll = (npc: NpcLogic): Tile | null => {
      const ms = mapStateRef.current;
      const roads = ms.roads.filter((r) => !isStreamTile(r.x, r.y));
      if (roads.length === 0) return null;
      const cx = npc.px / cellSize - 0.5;
      const cy = npc.py / cellSize - 0.5;
      let best: Tile | null = null;
      let bestD = -1;
      for (let i = 0; i < 3; i++) {
        const r = roads[Math.floor(Math.random() * roads.length)];
        const d = Math.abs(r.x - cx) + Math.abs(r.y - cy);
        if (d > bestD) {
          bestD = d;
          best = r;
        }
      }
      return best;
    };

    /** Send a villager walking to a destination (shared by the idle picker
     *  and the keep-exploring chain below). */
    const startWalkTo = (
      npc: NpcLogic,
      dest: { tile: Tile; buildingId: string; type: string }
    ) => {
      const fromTile: Tile = { x: npc.px / cellSize - 0.5, y: npc.py / cellSize - 0.5 };
      npc.waypoints = buildPath(mapStateRef.current, fromTile, dest.tile, cellSize);
      npc.wpIndex = 0;
      npc.destBuildingId = dest.buildingId;
      npc.destType = dest.type;
      npc.lastDestBuildingId = dest.buildingId;
      npc.state = "walking";
      stepNpc(npc);
    };

    const pickDestination = (npc: NpcLogic): { tile: Tile; buildingId: string; type: string } | null => {
      const ms = mapStateRef.current;
      const businesses = ms.buildings.filter((b) => {
        if (b.id === npc.homeId) return false;
        const def = BUILDINGS[b.type];
        return !!def && (def.incomePerDay > 0 || def.xpPerDay > 0);
      });
      let pool = businesses;
      // The Gathering: prayer lights head to Restaurant Row to break
      // bread together (Mon/Wed/Fri 6-8pm). A shared meal, not just a visit.
      // But when the Marriage Supper is prepared, EVERY light gathers at the
      // one table instead — the whole town as one.
      if (isGatheringTime()) {
        const banquet = ms.buildings.find((b) => b.type === "banquet-table");
        if (banquet) {
          const fp = buildingFootprint(banquet.level || 1, banquet.type);
          return {
            tile: { x: banquet.x + fp.w / 2 - 0.5, y: banquet.y + fp.h / 2 - 0.5 },
            buildingId: banquet.id,
            type: banquet.type,
          };
        }
        const restaurants = businesses.filter((b) => isRestaurantType(b.type));
        if (restaurants.length > 0) pool = restaurants;
      }
      const roll = Math.random();
      // Free wandering: a stroll across the map — the far ends, quiet lanes,
      // the stream banks. This is what makes them explorers, not errand-runners.
      if (roll < 0.38 && !isGatheringTime()) {
        const stroll = pickStroll(npc);
        if (stroll) return { tile: stroll, buildingId: STROLL_TYPE, type: STROLL_TYPE };
      }
      // Home life: villagers with a cottage sometimes stay home to rest, or
      // visit a friend's cottage. This is what makes them residents, not wanderers.
      const homeBuilding = ms.buildings.find((b) => b.id === npc.homeId);
      if (roll < 0.50 && homeBuilding && homeBuilding.type === "villager-cottage") {
        const cottages = ms.buildings.filter((b) => b.type === "villager-cottage");
        const target = cottages.length > 1 && Math.random() < 0.5
          ? cottages[Math.floor(Math.random() * cottages.length)]
          : homeBuilding;
        const fp = buildingFootprint(target.level || 1, target.type);
        return {
          tile: { x: target.x + fp.w / 2 - 0.5, y: target.y + fp.h / 2 - 0.5 },
          buildingId: target.id,
          type: target.type,
        };
      }
      // Gathering places: villagers visit the Community Garden to tend crops,
      // and the Fountain Plaza to gather and rest. These are the heart of
      // community life — not businesses, but places to be together.
      if (roll < 0.62 && !isGatheringTime()) {
        const gathering = ms.buildings.filter(
          (b) => b.type === "community-garden" || b.type === "fountain-plaza"
        );
        const picked = pickSpread(npc, gathering, buildingDest);
        if (picked) return picked;
      }
      if (pool.length === 0) {
        // no shops yet — gather at the church instead
        const church = ms.buildings.find((b) => b.type === "church");
        if (church) {
          const fp = buildingFootprint(church.level || 1, church.type);
          return {
            tile: { x: church.x + fp.w / 2 - 0.5, y: church.y + fp.h / 2 - 0.5 },
            buildingId: church.id,
            type: church.type,
          };
        }
        return null;
      }
      // Shops and errands — with separation, so the town doesn't pile into
      // one storefront while the rest of the street sits empty.
      return pickSpread(npc, pool, buildingDest);
    };

    const arrive = (npc: NpcLogic) => {
      const now = Date.now();
      const nightNow = getTimeOfDay() === "night";
      if (npc.state === "walking") {
        npc.state = "visiting";
        // At night the town is asleep — just a quick peek before heading home.
        // Businesses are closed, so no bank-visit bonus either.
        // During the gathering, lights linger for a real shared meal —
        // at the restaurants, or all as one at the Marriage Supper.
        const gatheringMeal = isGatheringTime() && npc.destType && (isRestaurantType(npc.destType as any) || npc.destType === "banquet-table");
        const strolling = npc.destType === STROLL_TYPE;
        npc.waitUntil = now + (nightNow ? 1200 : gatheringMeal ? 12000 + Math.random() * 8000 : strolling ? 1500 + Math.random() * 3000 : 3000 + Math.random() * 5000);
        // Visiting a bank? Customers doing business — bonus coins for the bank.
        if (!nightNow && (npc.destType === "bank" || npc.destType === "bank-tower") && npc.destBuildingId) {
          try {
            visitRef.current?.(npc.destBuildingId);
          } catch {}
        }
        // Guiding a villager mission? Jonathan's help brought them here —
        // let the parent complete the mission with its reward.
        const guide = missionGuidesRef.current?.[String(npc.prayerId || npc.id)];
        if (guide && npc.destBuildingId === guide.buildingId) {
          try {
            missionArrivalRef.current?.(String(npc.prayerId || npc.id));
          } catch {}
        }
        // On a Jonathan-assigned work shift? Stay put until the shift ends —
        // the timer lives in the parent, so pin the visit to it.
        const winfo = workMapRef.current?.[String(npc.prayerId || npc.id)];
        if (winfo) {
          npc.waitUntil = Math.max(npc.waitUntil, winfo.untilMs);
          try {
            workArrivalRef.current?.(String(npc.prayerId || npc.id));
          } catch {}
        }
        // At a schedule event? Stay for the whole thing — the pawn mimics
        // Jonathan's day, and the villagers share people events with him.
        const sinfo = scheduleMapRef.current?.[String(npc.prayerId || npc.id)];
        if (sinfo) {
          npc.waitUntil = Math.max(npc.waitUntil, sinfo.untilMs);
        }
      } else if (npc.state === "returning") {
        npc.state = "idle";
        npc.waitUntil = now + 2000 + Math.random() * 4000;
      }
    };

    /** End a chat meetup and resume whatever the villager was doing.
     *  Returns the restored state. */
    const endChat = (npc: NpcLogic, now: number): NpcLogic["state"] => {
      const prev = npc.prevState || "idle";
      npc.prevState = undefined;
      npc.chatPartnerId = undefined;
      npc.state = prev;
      if (prev === "walking" || prev === "returning") {
        stepNpc(npc);
      } else {
        npc.waitUntil = Math.max(npc.waitUntil, now + 1200);
      }
      return prev;
    };

    /** Two lights meet on the street — pause for a quick, sweet chat. */
    const startChat = (a: NpcLogic, b: NpcLogic, now: number) => {
      const until = now + 2500 + Math.random() * 2000;
      for (const [npc, partner] of [[a, b], [b, a]] as [NpcLogic, NpcLogic][]) {
        if (npc.state === "walking") npc.anim?.stop();
        npc.prevState = npc.state as NpcLogic["prevState"];
        npc.state = "chatting";
        npc.chatUntil = until;
        npc.chatPartnerId = partner.id;
        npc.lastChatAt = now;
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

    /** Jonathan assigned a shift: drop whatever the light is doing and head
     *  to the work site RIGHT NOW — no finishing the current visit or chat
     *  first. Returns true when an interrupt happened (caller should continue).
     *  Mission-guided walks are left alone so an in-progress "help" errand
     *  isn't stranded; night never interrupts (the town sleeps). */
    const interruptForWork = (npc: NpcLogic, now: number): boolean => {
      const pid = String(npc.prayerId || npc.id);
      const guide = workGuidesRef.current?.[pid];
      if (!guide) return false;
      const winfo = workMapRef.current?.[pid];
      if (!winfo) return false;
      // Already heading there — let the walk finish.
      if (npc.state === "walking" && npc.destBuildingId === guide.buildingId) return false;
      // Already on site (was visiting for fun) — clock in immediately.
      if (npc.state === "visiting" && npc.destBuildingId === guide.buildingId) {
        npc.waitUntil = Math.max(npc.waitUntil, winfo.untilMs);
        try {
          workArrivalRef.current?.(pid);
        } catch {}
        return true;
      }
      // On a villager-mission errand? Let the quick mission walk finish first.
      const mguide = missionGuidesRef.current?.[pid];
      if (mguide && npc.state === "walking" && npc.destBuildingId === mguide.buildingId) return false;
      // Work site gone (sold/demolished mid-shift)? Don't chase a ghost.
      const stillThere = mapStateRef.current.buildings.some((b) => b.id === guide.buildingId);
      if (!stillThere) return false;
      // Drop the chat gracefully — the partner goes back to what they were doing.
      if (npc.state === "chatting") {
        const partner = Object.values(logic).find((n) => n.id === npc.chatPartnerId);
        npc.prevState = undefined;
        npc.chatPartnerId = undefined;
        if (partner && partner.state === "chatting") endChat(partner, now);
      }
      npc.anim?.stop();
      npc.anim = null;
      const fromTile: Tile = { x: npc.px / cellSize - 0.5, y: npc.py / cellSize - 0.5 };
      npc.waypoints = buildPath(mapStateRef.current, fromTile, guide.tile, cellSize);
      npc.wpIndex = 0;
      npc.destBuildingId = guide.buildingId;
      npc.destType = guide.type;
      npc.state = "walking";
      stepNpc(npc);
      return true;
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
          if (npc.state === "chatting") {
            // Cut the chat short — everyone heads home for the night.
            const restored = endChat(npc, now);
            if (restored === "visiting" && now < npc.waitUntil) npc.waitUntil = now;
            continue;
          }
          if (npc.state === "idle") continue; // home asleep — stay put
          if (npc.state === "visiting") {
            // Cut the visit short so they head home; the branch below sends them.
            if (now < npc.waitUntil) npc.waitUntil = now;
          } else {
            continue; // walking / returning: let them finish the current leg, no teleports
          }
        }
        // Work interrupt: a fresh assignment sends the light to the site NOW —
        // no finishing the current visit or chat first. (Night wins: asleep.)
        if (!night && interruptForWork(npc, now)) continue;
        if (npc.state === "chatting") {
          if (now >= npc.chatUntil) endChat(npc, now);
          continue;
        }
        if (npc.state === "idle" && now >= npc.waitUntil) {
          const pid = String(npc.prayerId || npc.id);
          // Villager missions: a light with a waiting request stands still
          // until Jonathan helps them — no wandering off.
          if (missionWaitingRef.current?.has(pid)) {
            npc.waitUntil = now + 15000;
            continue;
          }
          // Jonathan-assigned work: walk straight to the work site.
          let dest: { tile: Tile; buildingId: string; type: string } | null = null;
          const workGuide = workGuidesRef.current?.[pid];
          if (workGuide) {
            const stillThere =
              mapStateRef.current.buildings.some((b) => b.id === workGuide.buildingId);
            if (stillThere) dest = workGuide;
          }
          // Guiding a mission: walk straight to the mission target.
          if (!dest) {
            const guide = missionGuidesRef.current?.[pid];
            if (guide) {
              const stillThere = mapStateRef.current.buildings.some((b) => b.id === guide.buildingId);
              if (stillThere) dest = guide;
            }
          }
          // Schedule sync: the pawn mimics Jonathan's day — if a schedule
          // event is happening, villagers join people events (meals, movies,
          // ministry, BBQs) instead of wandering. They stay until it ends.
          if (!dest) {
            const sched = scheduleMapRef.current?.[pid];
            const guide = scheduleGuidesRef.current?.[pid];
            if (sched && guide && now < sched.untilMs) {
              const stillThere = mapStateRef.current.buildings.some((b) => b.id === guide.buildingId);
              if (stillThere) dest = guide;
            }
          }
          if (!dest) {
            const picked = pickDestination(npc);
            if (!picked) {
              npc.waitUntil = now + 4000;
              continue;
            }
            dest = picked;
          }
          startWalkTo(npc, dest);
        } else if (npc.state === "visiting" && now >= npc.waitUntil) {
          // Daytime wanderers keep exploring instead of always heading home
          // first — visit to visit, across the whole map. They still go home
          // to sleep at night, and they disperse after gatherings.
          const nightNow = getTimeOfDay() === "night";
          if (!nightNow && !isGatheringTime() && Math.random() < 0.6) {
            const chained = pickDestination(npc);
            if (chained) {
              startWalkTo(npc, chained);
              continue;
            }
          }
          const fromTile: Tile = { x: npc.px / cellSize - 0.5, y: npc.py / cellSize - 0.5 };
          npc.waypoints = buildPath(mapStateRef.current, fromTile, npc.homeTile, cellSize);
          npc.wpIndex = 0;
          npc.state = "returning";
          stepNpc(npc);
        }
      }
      // Villager meetups: lights crossing paths pause for a quick chat.
      // Small, sweet, no dialogue — just neighbors acknowledging each other.
      if (!night) {
        const candidates = Object.values(logic).filter(
          (n) =>
            (n.state === "walking" || n.state === "idle" || n.state === "visiting") &&
            now - n.lastChatAt > CHAT_COOLDOWN_MS &&
            !missionWaitingRef.current?.has(String(n.prayerId || n.id)) &&
            // On a Jonathan-assigned shift? Let them work — no street chats.
            !workingRef.current.has(n.id)
        );
        let activePairs = 0;
        for (const n of Object.values(logic)) if (n.state === "chatting") activePairs++;
        activePairs = Math.floor(activePairs / 2);
        for (let i = 0; i < candidates.length && activePairs < MAX_CHAT_PAIRS; i++) {
          const a = candidates[i];
          if (a.state === "chatting") continue;
          for (let j = i + 1; j < candidates.length && activePairs < MAX_CHAT_PAIRS; j++) {
            const b = candidates[j];
            if (b.state === "chatting") continue;
            if (Math.hypot(a.px - b.px, a.py - b.py) < CHAT_RANGE_PX) {
              startChat(a, b, now);
              activePairs++;
              break;
            }
          }
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
      // Sync activity badges: visiting lights show what they're doing at
      // each building (haircut, meal, errand...). Chatting lights show the
      // chat bubble instead of the badge.
      const nextActivity: Record<string, string> = {};
      const nextChatting = new Set<string>();
      if (!night) {
        for (const npc of Object.values(logic)) {
          if (npc.state === "visiting" && npc.destType) {
            if (npc.destType === "villager-cottage") {
              // Resting at their own cottage, or visiting a friend's.
              nextActivity[npc.id] = npc.destBuildingId === npc.homeId ? "__resting__" : "__visiting__";
            } else if (ACTIVITY_ICONS[npc.destType]) {
              nextActivity[npc.id] = npc.destType;
            }
          } else if (npc.state === "chatting") {
            nextChatting.add(npc.id);
          }
        }
      }
      const prevAct = activityRef.current;
      let actChanged = Object.keys(nextActivity).length !== Object.keys(prevAct).length;
      if (!actChanged) {
        for (const k of Object.keys(nextActivity)) {
          if (prevAct[k] !== nextActivity[k]) { actChanged = true; break; }
        }
      }
      if (actChanged) {
        activityRef.current = nextActivity;
        setActivityMap(nextActivity);
      }
      // Sync work badges: lights on a Jonathan-assigned shift show their
      // work icon (hammer, broom...) instead of the activity badge.
      const nextWorkBadge: Record<string, string> = {};
      if (!night) {
        const wm = workMapRef.current;
        if (wm) {
          for (const npc of Object.values(logic)) {
            const w = wm[String(npc.prayerId || npc.id)];
            if (w) nextWorkBadge[npc.id] = w.kind;
          }
        }
      }
      const prevWork = workBadgeRef.current;
      let workChanged = Object.keys(nextWorkBadge).length !== Object.keys(prevWork).length;
      if (!workChanged) {
        for (const k of Object.keys(nextWorkBadge)) {
          if (prevWork[k] !== nextWorkBadge[k]) { workChanged = true; break; }
        }
      }
      if (workChanged) {
        workBadgeRef.current = nextWorkBadge;
        setWorkBadgeMap(nextWorkBadge);
      }
      // Sync the working set: lights clocked in at their site (in workMap but
      // no longer en-route) get the working rock — busy, not loitering.
      const nextWorking = new Set<string>();
      if (!night) {
        const wm = workMapRef.current;
        const wg = workGuidesRef.current;
        if (wm) {
          for (const npc of Object.values(logic)) {
            const pid = String(npc.prayerId || npc.id);
            if (wm[pid] && !(wg && wg[pid]) && npc.state === "visiting") {
              nextWorking.add(npc.id);
            }
          }
        }
      }
      const prevWorking = workingRef.current;
      let workingChanged = nextWorking.size !== prevWorking.size;
      if (!workingChanged) {
        for (const id of nextWorking) {
          if (!prevWorking.has(id)) { workingChanged = true; break; }
        }
      }
      if (workingChanged) {
        workingRef.current = nextWorking;
        setWorkingIds(nextWorking);
      }
      const prevChatting = chattingRef.current;
      let chattingChanged = nextChatting.size !== prevChatting.size;
      if (!chattingChanged) {
        for (const id of nextChatting) {
          if (!prevChatting.has(id)) { chattingChanged = true; break; }
        }
      }
      if (chattingChanged) {
        chattingRef.current = nextChatting;
        setChattingIds(nextChatting);
      }
      // Sync name labels: names show at the church or a restaurant (the
      // fellowship moment). Capped at 15, closest first, so busy days don't
      // turn into label chaos. Tapping any light shows their name anytime.
      const candidates: { id: string; d: number }[] = [];
      if (!night) {
        for (const npc of Object.values(logic)) {
          if (!npc.name) continue;
          if (npc.state !== "visiting") continue;
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
          chatUntil: 0,
          lastChatAt: 0,
          lastDestBuildingId: undefined,
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

      // Publish live villager tile positions for presence-gated income.
      // The parent reads positionsRef.current in its income tick.
      const pr = positionsRefHolder.current;
      if (pr) {
        const arr: Array<{ x: number; y: number }> = [];
        for (const npc of Object.values(logic)) {
          // px/py are pixel centers; convert to tile coords.
          arr.push({ x: npc.px / cellSize - 0.5, y: npc.py / cellSize - 0.5 });
        }
        pr.current = arr;
      }
    }

    const timer = setInterval(tick, 700);
    return () => clearInterval(timer);
  }, [npcDefs, cellSize]);

  // Entities as a fragment when bare — the parent depth-sorts them with
  // buildings via zIndex (villagers walk BEHIND tall buildings).
  const townEntities = renderIds.map((id) => {
        const npc = logicRef.current[id];
        if (!npc) return null;
        const bobY = npc.bob.interpolate({ inputRange: [0, 1], outputRange: [0, -2.5] });
        const asleep = sleepingIds.has(id);
        const showName = namedIds.has(id) && !!npc.name;
        const activityType = activityMap[id];
        // Work badge takes precedence over the activity badge.
        const workKind = workBadgeMap[id];
        const workIcon = workKind ? WORK_BADGE_ICONS[workKind] : undefined;
        const shownActivityType = workIcon ? undefined : activityType;
        const isChatting = chattingIds.has(id);
        const isWorking = workingIds.has(id);
        // Clocked in: rock side-to-side on the same bob loop — a scrubbing,
        // busy motion instead of the idle bob. The tool badge rides along.
        const workRock = npc.bob.interpolate({
          inputRange: [0, 1],
          outputRange: ["-10deg", "10deg"],
        });
        const floatY = npc.bob.interpolate({ inputRange: [0, 1], outputRange: [0, -2] });
        // Alternate bubble content so meetups feel alive: heart or "...".
        const chatHeart = id.charCodeAt(id.length - 1) % 2 === 0;
        // All lights glow golden — they're the people Jonathan prayed for today.
        const bodyColor = "#FBBF24";
        const body = (
          <>
            {/* golden halo */}
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
            {/* work badge — on a Jonathan-assigned shift (takes precedence) */}
            {workIcon && !asleep ? (
              <Animated.View
                style={{
                  position: "absolute",
                  top: -21,
                  left: 9,
                  transform: [{ translateY: floatY }],
                }}
              >
                <View
                  style={{
                    width: 17,
                    height: 17,
                    borderRadius: 8.5,
                    backgroundColor: "#FFFFFF",
                    borderWidth: 1.5,
                    borderColor: "#059669",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialIcons name={workIcon as any} size={11} color="#059669" />
                </View>
              </Animated.View>
            ) : null}
            {/* activity badge — what they're doing at this building */}
            {shownActivityType && !asleep ? (
              <Animated.View
                style={{
                  position: "absolute",
                  top: -21,
                  left: 9,
                  transform: [{ translateY: floatY }],
                }}
              >
                <View
                  style={{
                    width: 17,
                    height: 17,
                    borderRadius: 8.5,
                    backgroundColor: "#FFFFFF",
                    borderWidth: 1.5,
                    borderColor: "#D4AF37",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ActivityGlyph type={shownActivityType} />
                </View>
              </Animated.View>
            ) : null}
            {/* villager mission — a "?" request; this light waits for Jonathan's help */}
            {missionWaitingIds?.has(String(npc.prayerId || npc.id)) && !asleep ? (
              <Animated.View
                style={{
                  position: "absolute",
                  top: -23,
                  left: 9,
                  transform: [
                    { translateY: floatY },
                    { scale: npc.bob.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
                  ],
                }}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: "#FFFFFF",
                    borderWidth: 1.5,
                    borderColor: "#7C3AED",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialIcons name="help-outline" size={12} color="#7C3AED" />
                </View>
              </Animated.View>
            ) : null}
            {/* chat bubble — meeting a fellow light on the street */}
            {isChatting && !asleep ? (
              <Animated.View
                style={{
                  position: "absolute",
                  top: -40,
                  left: -10,
                  width: 36,
                  alignItems: "center",
                  transform: [{ translateY: floatY }],
                }}
              >
                <View
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 9,
                    paddingHorizontal: 5,
                    paddingVertical: 2,
                    borderWidth: 1,
                    borderColor: "#F9A8D4",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 22,
                  }}
                >
                  {chatHeart ? (
                    <MaterialIcons name="favorite" size={10} color="#EC4899" />
                  ) : (
                    <Text style={{ fontSize: 10, fontWeight: "800", color: "#EC4899", lineHeight: 12 }}>...</Text>
                  )}
                </View>
                <View
                  style={{
                    width: 0,
                    height: 0,
                    borderLeftWidth: 3.5,
                    borderRightWidth: 3.5,
                    borderTopWidth: 5,
                    borderLeftColor: "transparent",
                    borderRightColor: "transparent",
                    borderTopColor: "#FFFFFF",
                    marginTop: -1,
                  }}
                />
              </Animated.View>
            ) : null}
            {/* name label — at church/restaurants (the fellowship moment) */}
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
                backgroundColor: bodyColor,
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
                backgroundColor: bodyColor,
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
          transform: [
            ...npc.pos.getTranslateTransform(),
            { translateY: bobY },
            // Working: rock side-to-side — busy, not loitering.
            { rotate: isWorking ? workRock : "0deg" },
          ],
          // Depth sort by feet Y: villagers behind a tall building (north of its
          // base) draw first so the building overlaps them. Visiting lights and
          // lights waiting with a "?" stay in front so badges stay visible.
          zIndex: npc.state === "visiting" || !!missionWaitingIds?.has(String(npc.prayerId || npc.id))
            ? 1000000
            : Math.round(npc.py),
        };
        // All lights are tappable — tap to see who they are.
        return (
          <AnimatedPressable
            key={id}
            onPress={() => tapRef.current?.({ id: npc.prayerId || npc.id, name: npc.name || "Friend" })}
            style={frameStyle}
          >
            {body}
          </AnimatedPressable>
        );
      });
  if (bare) return <>{townEntities}</>;
  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}
    >
      {townEntities}
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

function CityNPCsImpl({
  mapState,
  cellSize,
  hometownNpcCount,
  onBankVisit,
  bare,
  positionsRef,
}: {
  mapState: MapState;
  cellSize: number;
  hometownNpcCount: number;
  /** Called when a commuter arrives at a bank/bank-tower: (buildingId). */
  onBankVisit?: (buildingId: string) => void;
  /** Render entities directly (no container) so the parent can depth-sort
      them with buildings via zIndex. */
  bare?: boolean;
  /** Optional ref that receives live commuter tile positions [{x, y}, ...]. */
  positionsRef?: React.MutableRefObject<Array<{ x: number; y: number }>>;
}) {
  const logicRef = useRef<Record<string, CityNpcLogic>>({});
  const mapStateRef = useRef(mapState);
  mapStateRef.current = mapState;
  const positionsRefHolder = useRef(positionsRef);
  positionsRefHolder.current = positionsRef;
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

    const pickCommuterDest = (npc: CityNpcLogic): { tile: Tile; id: string; type: string } | null => {
      const ms = mapStateRef.current;
      // Street stroll: wander the city streets, not just building to building.
      // Draws 3 street tiles and takes the farthest — commuters explore the
      // far ends of the city instead of pacing the same block.
      if (ms.roads.length > 0 && Math.random() < 0.3) {
        const streets = ms.roads.filter((r) => !isStreamTile(r.x, r.y));
        if (streets.length > 0) {
          const cx = npc.px / cellSize - 0.5;
          const cy = npc.py / cellSize - 0.5;
          let best: Tile | null = null;
          let bestD = -1;
          for (let i = 0; i < 3; i++) {
            const r = streets[Math.floor(Math.random() * streets.length)];
            const d = Math.abs(r.x - cx) + Math.abs(r.y - cy);
            if (d > bestD) {
              bestD = d;
              best = r;
            }
          }
          if (best) return { tile: best, id: STROLL_TYPE, type: STROLL_TYPE };
        }
      }
      const spots = cityBuildingCenterTiles(ms);
      if (spots.length === 0) return null;
      // Spread out — prefer the quiet spots (least crowded of 4 draws) so
      // commuters don't all pile into the same storefront.
      let bestSpot: { tile: Tile; id: string; type: string } | null = null;
      let bestScore = Infinity;
      for (let i = 0; i < 4; i++) {
        const s = spots[Math.floor(Math.random() * spots.length)];
        let crowd = 0;
        for (const other of Object.values(logic)) {
          if (other.id === npc.id) continue;
          if (other.destBuildingId !== s.id) continue;
          if (other.state === "walking" || other.state === "visiting") crowd++;
        }
        const score = crowd * 10 + Math.random() * 2;
        if (score < bestScore) {
          bestScore = score;
          bestSpot = s;
        }
      }
      return bestSpot;
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
          const dest = npc.kind === "worker" ? pickWorkerDest(npc) : pickCommuterDest(npc);
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
          const dest = npc.kind === "worker" ? pickWorkerDest(npc) : pickCommuterDest(npc);
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

    // Publish live commuter tile positions for presence-gated income.
    const pr = positionsRefHolder.current;
    if (pr) {
      const arr: Array<{ x: number; y: number }> = [];
      for (const npc of Object.values(logic)) {
        arr.push({ x: npc.px / cellSize - 0.5, y: npc.py / cellSize - 0.5 });
      }
      pr.current = arr;
    }

    const timer = setInterval(tick, 700);
    return () => clearInterval(timer);
  }, [workerDefs, cellSize]);

  // Entities as a fragment when bare — the parent depth-sorts them with
  // buildings via zIndex (workers/commuters walk BEHIND tall buildings).
  const cityEntities = renderIds.map((id) => {
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
          // Depth sort by feet Y; visiting workers stay in front.
          zIndex: npc.state === "visiting" ? 1000000 : Math.round(npc.py),
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
  });
  if (bare) return <>{cityEntities}</>;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}>
      {cityEntities}
    </View>
  );
}

/** Memoized: with stable props from the hometown screen (memoized lights,
 *  useCallback handlers, refs), the villager layers skip re-renders when
 *  the screen re-renders for unrelated reasons. */
export const TownNPCs = memo(TownNPCsImpl);
export const CityNPCs = memo(CityNPCsImpl);
