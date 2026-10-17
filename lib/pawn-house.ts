// ---- Pawn House: rooms, themes, furniture tiers, desirables ----
// Material-style home system. Rooms unlock with coins; each room has color
// themes and tiered furniture that grant small permanent bonuses.

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  COIN_MILESTONES,
  COINS_STORAGE_KEY,
  MAP_UNLOCKED_KEY,
  PAWN_HOUSE_STORAGE_KEY,
  parseCoins,
  parseUnlockedMaps,
} from "./hometown";
import { MONUMENT_STORAGE_KEY } from "./monuments";
import { FASTS_STORAGE_KEY } from "./prayercircle-storage";

export type HouseRoomId =
  | "bedroom"
  | "living"
  | "kitchen"
  | "bathroom"
  | "study"
  | "prayer"
  | "trophy"
  | "garden";

export type RoomTheme = {
  id: string;
  name: string;
  cost: number; // 0 = default theme
  wall: string;
  floor: string;
  accent: string; // soft goods (bedding, cushions, rug)
  trim: string; // wood tones
};

export type RoomSlot = {
  id: string; // matches RoomPieceId in components/room-furniture-art.tsx
  name: string;
  tierNames: [string, string, string];
  costs: [number, number, number];
  pos: { x: number; y: number }; // fractions within the room view
  size: number; // art pixel size
};

export type RoomDef = {
  id: HouseRoomId;
  name: string;
  unlockCost: number; // 0 = starts unlocked
  bonusText: string;
  kind: "living" | "prayer" | "trophy" | "garden";
  slots: RoomSlot[];
  themes: RoomTheme[];
};

export const HOUSE_ROOMS: RoomDef[] = [
  {
    id: "bedroom",
    name: "Bedroom",
    unlockCost: 0,
    bonusText: "+2% all XP per furniture tier (well rested)",
    kind: "living",
    slots: [
      { id: "bed", name: "Bed", tierNames: ["Simple Bed", "Carved Bed", "Four-Poster"], costs: [15, 60, 150], pos: { x: 0.30, y: 0.60 }, size: 120 },
      { id: "nightstand", name: "Nightstand", tierNames: ["Crate Stand", "Drawer Stand", "Heirloom Stand"], costs: [8, 30, 80], pos: { x: 0.62, y: 0.66 }, size: 80 },
      { id: "lamp", name: "Lamp", tierNames: ["Simple Lamp", "Tall Lamp", "Glow Lamp"], costs: [10, 35, 90], pos: { x: 0.82, y: 0.58 }, size: 90 },
      { id: "rug", name: "Rug", tierNames: ["Flat Rug", "Bordered Rug", "Medallion Rug"], costs: [6, 25, 70], pos: { x: 0.45, y: 0.86 }, size: 100 },
    ],
    themes: [
      { id: "amber", name: "Cozy Amber", cost: 0, wall: "#F5E6D0", floor: "#D9B98F", accent: "#C97B4A", trim: "#8B5E34" },
      { id: "slate", name: "Cool Slate", cost: 30, wall: "#E2E8F0", floor: "#B8C2D1", accent: "#64748B", trim: "#475569" },
      { id: "moss", name: "Forest Moss", cost: 60, wall: "#E4EBDD", floor: "#A9BC96", accent: "#5B7A4E", trim: "#6B4F35" },
      { id: "mist", name: "Ocean Mist", cost: 90, wall: "#DCEEF2", floor: "#A9CBD6", accent: "#4E8FA3", trim: "#7A5C3E" },
    ],
  },
  {
    id: "living",
    name: "Living Room",
    unlockCost: 100,
    bonusText: "+1% coin income per furniture tier",
    kind: "living",
    slots: [
      { id: "sofa", name: "Sofa", tierNames: ["Simple Sofa", "Cushioned Sofa", "Lounge Sofa"], costs: [20, 70, 160], pos: { x: 0.30, y: 0.60 }, size: 120 },
      { id: "coffeeTable", name: "Coffee Table", tierNames: ["Plank Table", "Shelf Table", "Styled Table"], costs: [12, 40, 100], pos: { x: 0.58, y: 0.72 }, size: 90 },
      { id: "bookshelf", name: "Bookshelf", tierNames: ["Two-Shelf", "Library Shelf", "Grand Shelf"], costs: [18, 60, 140], pos: { x: 0.84, y: 0.55 }, size: 100 },
      { id: "fireplace", name: "Fireplace", tierNames: ["Brick Hearth", "Mantel Hearth", "Stone Hearth"], costs: [25, 80, 180], pos: { x: 0.08, y: 0.55 }, size: 100 },
    ],
    themes: [
      { id: "hearth", name: "Warm Hearth", cost: 0, wall: "#F3E2CF", floor: "#Cfa878", accent: "#B4563C", trim: "#7A4A2B" },
      { id: "modern", name: "Modern Grey", cost: 30, wall: "#EDEEF0", floor: "#C3C7CE", accent: "#5B6470", trim: "#3E4450" },
      { id: "botanical", name: "Botanical", cost: 60, wall: "#E6EFE3", floor: "#AEC6A4", accent: "#3F7048", trim: "#6B4F35" },
      { id: "coastal", name: "Coastal", cost: 90, wall: "#E3F0F4", floor: "#B9D2DC", accent: "#3E7E96", trim: "#8A6A45" },
    ],
  },
  {
    id: "kitchen",
    name: "Kitchen",
    unlockCost: 200,
    bonusText: "+1% fast XP per furniture tier",
    kind: "living",
    slots: [
      { id: "ktable", name: "Table", tierNames: ["Round Table", "Cloth Table", "Farmhouse Table"], costs: [15, 55, 140], pos: { x: 0.38, y: 0.62 }, size: 110 },
      { id: "chairs", name: "Chairs", tierNames: ["Stool", "Cushioned Chair", "Chair Pair"], costs: [10, 40, 110], pos: { x: 0.64, y: 0.64 }, size: 100 },
      { id: "stove", name: "Stove", tierNames: ["Cook Box", "Oven Stove", "Chef's Stove"], costs: [20, 65, 150], pos: { x: 0.12, y: 0.55 }, size: 100 },
      { id: "shelf", name: "Pantry Shelf", tierNames: ["Bare Shelves", "Stocked Shelves", "Full Pantry"], costs: [12, 45, 120], pos: { x: 0.84, y: 0.42 }, size: 100 },
    ],
    themes: [
      { id: "buttery", name: "Buttery", cost: 0, wall: "#FAF0DC", floor: "#E3CDA1", accent: "#D9A441", trim: "#8B5E34" },
      { id: "sage", name: "Sage", cost: 30, wall: "#E8EFE4", floor: "#B7C9AE", accent: "#6E8F5F", trim: "#6B4F35" },
      { id: "terracotta", name: "Terracotta", cost: 60, wall: "#F5E3D5", floor: "#D9A983", accent: "#B45F3C", trim: "#7A4A2B" },
      { id: "midnight", name: "Midnight", cost: 90, wall: "#DEE2EA", floor: "#9AA3B5", accent: "#3B4763", trim: "#2E3440" },
    ],
  },
  {
    id: "bathroom",
    name: "Bathroom",
    unlockCost: 300,
    bonusText: "+1% prayer XP per furniture tier",
    kind: "living",
    slots: [
      { id: "tub", name: "Tub", tierNames: ["Simple Tub", "Clawfoot Tub", "Soaking Tub"], costs: [18, 60, 150], pos: { x: 0.28, y: 0.62 }, size: 115 },
      { id: "sink", name: "Sink", tierNames: ["Basin", "Pedestal Sink", "Vanity Sink"], costs: [12, 45, 120], pos: { x: 0.60, y: 0.60 }, size: 95 },
      { id: "mirror", name: "Mirror", tierNames: ["Oval Mirror", "Framed Mirror", "Grand Mirror"], costs: [8, 35, 100], pos: { x: 0.60, y: 0.32 }, size: 80 },
      { id: "plant", name: "Plant", tierNames: ["Sprout", "Fern", "Blooming Plant"], costs: [6, 25, 70], pos: { x: 0.86, y: 0.68 }, size: 90 },
    ],
    themes: [
      { id: "spa", name: "Spa White", cost: 0, wall: "#F4F6F5", floor: "#D5DDD9", accent: "#7FA39A", trim: "#8A7A63" },
      { id: "seafoam", name: "Seafoam", cost: 30, wall: "#E2F0EC", floor: "#AECFC4", accent: "#4E8F7F", trim: "#6B5B45" },
      { id: "sandstone", name: "Sandstone", cost: 60, wall: "#F2E8D8", floor: "#D6C096", accent: "#B08D4F", trim: "#7A5C3E" },
      { id: "charcoal", name: "Charcoal", cost: 90, wall: "#E8EAED", floor: "#A9AEB8", accent: "#4A4F59", trim: "#33373F" },
    ],
  },
  {
    id: "study",
    name: "Study",
    unlockCost: 400,
    bonusText: "+2% Bible study XP per furniture tier",
    kind: "living",
    slots: [
      { id: "desk", name: "Desk", tierNames: ["Plank Desk", "Drawer Desk", "Scholar's Desk"], costs: [18, 65, 160], pos: { x: 0.32, y: 0.60 }, size: 115 },
      { id: "chair", name: "Chair", tierNames: ["Stool", "Cushioned Chair", "Armchair"], costs: [10, 40, 110], pos: { x: 0.32, y: 0.80 }, size: 90 },
      { id: "lamp", name: "Desk Lamp", tierNames: ["Simple Lamp", "Tall Lamp", "Glow Lamp"], costs: [10, 35, 90], pos: { x: 0.58, y: 0.52 }, size: 85 },
      { id: "bookshelf", name: "Bookshelf", tierNames: ["Two-Shelf", "Library Shelf", "Grand Shelf"], costs: [18, 60, 140], pos: { x: 0.84, y: 0.55 }, size: 100 },
    ],
    themes: [
      { id: "walnut", name: "Walnut", cost: 0, wall: "#EFE3D2", floor: "#C8A071", accent: "#8B5E34", trim: "#5E3D22" },
      { id: "ivory", name: "Ivory", cost: 30, wall: "#FAF6EE", floor: "#E0D5BE", accent: "#A08B5B", trim: "#7A6540" },
      { id: "emerald", name: "Emerald", cost: 60, wall: "#E2EEE6", floor: "#A9C6B2", accent: "#2F6B4F", trim: "#4A3B28" },
      { id: "navy", name: "Navy", cost: 90, wall: "#E0E6F0", floor: "#A3AEC6", accent: "#33415E", trim: "#3A3F4D" },
    ],
  },
  {
    id: "prayer",
    name: "Prayer Room",
    unlockCost: 150,
    bonusText: "+1% coin income per lit candle (pray for someone to light theirs)",
    kind: "prayer",
    slots: [],
    themes: [
      { id: "sanctuary", name: "Sanctuary", cost: 0, wall: "#2A1E16", floor: "#4A3524", accent: "#FFB84D", trim: "#6B4A2B" },
      { id: "dawn", name: "Dawn", cost: 40, wall: "#3A2A3E", floor: "#54405A", accent: "#E8937C", trim: "#5E3D4A" },
      { id: "olive", name: "Olive Garden", cost: 80, wall: "#232B1E", floor: "#3E4A30", accent: "#C9D18B", trim: "#4A5A35" },
    ],
  },
  {
    id: "trophy",
    name: "Trophy Room",
    unlockCost: 250,
    bonusText: "+0.5% coin income per trophy earned",
    kind: "trophy",
    slots: [],
    themes: [
      { id: "oak", name: "Oak Panel", cost: 0, wall: "#E9DCC3", floor: "#B99B6B", accent: "#8B5E34", trim: "#5E3D22" },
      { id: "mahogany", name: "Mahogany", cost: 40, wall: "#EBD5C8", floor: "#A9765B", accent: "#7A3B28", trim: "#4E2418" },
      { id: "slate", name: "Slate Hall", cost: 80, wall: "#E4E7EC", floor: "#AEB6C2", accent: "#4A5568", trim: "#2D3748" },
    ],
  },
  {
    id: "garden",
    name: "Garden",
    unlockCost: 200,
    bonusText: "+0.1% coin income per blooming flower (one per completed fast day)",
    kind: "garden",
    slots: [],
    themes: [
      { id: "meadow", name: "Meadow", cost: 0, wall: "#BFE3C6", floor: "#7BAF7E", accent: "#E86A92", trim: "#5B7A4E" },
      { id: "sunset", name: "Sunset Beds", cost: 40, wall: "#F5D9B8", floor: "#C99B6A", accent: "#D46A4E", trim: "#7A5A35" },
      { id: "twilight", name: "Twilight", cost: 80, wall: "#C9C9E8", floor: "#7E7EA8", accent: "#9C6FB5", trim: "#4E4E6B" },
    ],
  },
];

export function roomDef(id: HouseRoomId): RoomDef {
  return HOUSE_ROOMS.find((r) => r.id === id)!;
}

// ---- State ----

export type RoomState = {
  unlocked: boolean;
  theme: string;
  ownedThemes: string[];
  furniture: Record<string, number>; // slotId -> tier 0..3
};

export type HouseState = {
  rooms: Record<HouseRoomId, RoomState>;
};

function defaultRoomState(def: RoomDef): RoomState {
  return {
    unlocked: def.unlockCost === 0,
    theme: def.themes[0].id,
    ownedThemes: [def.themes[0].id],
    furniture: {},
  };
}

export function defaultHouseState(): HouseState {
  const rooms = {} as Record<HouseRoomId, RoomState>;
  for (const def of HOUSE_ROOMS) rooms[def.id] = defaultRoomState(def);
  return { rooms };
}

// Legacy furniture types -> new room slots (all migrate as tier 1).
const LEGACY_FURNITURE_MAP: Record<string, { room: HouseRoomId; slot: string }> = {
  bed: { room: "bedroom", slot: "bed" },
  lamp: { room: "bedroom", slot: "lamp" },
  rug: { room: "bedroom", slot: "rug" },
  chair: { room: "study", slot: "chair" },
  table: { room: "kitchen", slot: "ktable" },
  plant: { room: "bathroom", slot: "plant" },
  bookshelf: { room: "living", slot: "bookshelf" },
  fireplace: { room: "living", slot: "fireplace" },
};

export function parseHouseState(value: unknown): HouseState {
  const fallback = defaultHouseState();
  if (!value || typeof value !== "object") return fallback;
  const h = value as any;
  // New shape
  if (h.rooms && typeof h.rooms === "object") {
    const rooms = { ...fallback.rooms };
    for (const def of HOUSE_ROOMS) {
      const r = h.rooms[def.id];
      if (r && typeof r === "object") {
        const furniture: Record<string, number> = {};
        if (r.furniture && typeof r.furniture === "object") {
          for (const slot of def.slots) {
            const t = r.furniture[slot.id];
            if (typeof t === "number") furniture[slot.id] = Math.max(0, Math.min(3, Math.floor(t)));
          }
        }
        const ownedThemes = Array.isArray(r.ownedThemes)
          ? r.ownedThemes.filter((t: any) => def.themes.some((th) => th.id === t))
          : [def.themes[0].id];
        rooms[def.id] = {
          unlocked: r.unlocked === true || def.unlockCost === 0,
          theme: def.themes.some((th) => th.id === r.theme) ? r.theme : def.themes[0].id,
          ownedThemes: ownedThemes.length > 0 ? ownedThemes : [def.themes[0].id],
          furniture,
        };
      }
    }
    return { rooms };
  }
  // Legacy shape: { furniture: [{type...}], size } -> migrate to tier 1 pieces
  if (Array.isArray(h.furniture)) {
    const next = defaultHouseState();
    for (const f of h.furniture) {
      const map = f && typeof f.type === "string" ? LEGACY_FURNITURE_MAP[f.type] : undefined;
      if (map) {
        const room = next.rooms[map.room];
        room.unlocked = true;
        if (!room.furniture[map.slot]) room.furniture[map.slot] = 1;
      }
    }
    return next;
  }
  return fallback;
}

export async function loadHouseState(): Promise<HouseState> {
  try {
    const raw = await AsyncStorage.getItem(PAWN_HOUSE_STORAGE_KEY);
    return parseHouseState(raw ? JSON.parse(raw) : null);
  } catch {
    return defaultHouseState();
  }
}

export async function saveHouseState(state: HouseState): Promise<void> {
  try {
    await AsyncStorage.setItem(PAWN_HOUSE_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

// ---- Room furniture bonuses (pure) ----

/** Total tier-points in a room (sum of tiers across slots). */
export function roomTierPoints(state: HouseState, roomId: HouseRoomId): number {
  const room = state.rooms[roomId];
  if (!room?.unlocked) return 0;
  return Object.values(room.furniture).reduce((s, t) => s + (t || 0), 0);
}

export type HouseBonuses = {
  coinMult: number; // additive: 0.12 = +12% coin income
  allXpMult: number;
  prayerXpMult: number;
  bibleXpMult: number;
  fastXpMult: number;
};

export const ZERO_HOUSE_BONUSES: HouseBonuses = {
  coinMult: 0,
  allXpMult: 0,
  prayerXpMult: 0,
  bibleXpMult: 0,
  fastXpMult: 0,
};

/** Bonuses from room furniture only (desirables added by refreshHouseBonusCache). */
export function furnitureBonuses(state: HouseState): HouseBonuses {
  return {
    coinMult: roomTierPoints(state, "living") * 0.01,
    allXpMult: roomTierPoints(state, "bedroom") * 0.02,
    prayerXpMult: roomTierPoints(state, "bathroom") * 0.01,
    bibleXpMult: roomTierPoints(state, "study") * 0.02,
    fastXpMult: roomTierPoints(state, "kitchen") * 0.01,
  };
}

// ---- Desirables ----

export type CandlePerson = { id: string; name: string; lit: boolean; color?: string };
export const PRAYER_CANDLE_CAP = 12;

function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** All prayer contacts; lit = prayed for today. */
export async function getPrayerCandles(): Promise<CandlePerson[]> {
  try {
    const raw = await AsyncStorage.getItem("prayercircle.people.v1");
    if (!raw) return [];
    const people = JSON.parse(raw);
    if (!Array.isArray(people)) return [];
    const today = todayStr();
    return people.slice(0, 24).map((p: any, i: number) => ({
      id: String(p?.id ?? p?.name ?? `person-${i}`),
      name: String(p?.name ?? "Friend"),
      lit: p?.lastPrayerCompletedDate === today,
      color: typeof p?.accentColor === "string" ? p.accentColor : undefined,
    }));
  } catch {
    return [];
  }
}

export type Trophy = { id: string; name: string; icon: string; desc: string };
export const TROPHY_CAP = 20;
export const TROPHY_COIN_EACH = 0.005;

/** Earned achievements: completed fasts, coin milestones, monuments, unlocked maps. */
export async function computeTrophies(): Promise<Trophy[]> {
  const trophies: Trophy[] = [];
  try {
    // Completed fasts
    const fastsRaw = await AsyncStorage.getItem(FASTS_STORAGE_KEY);
    if (fastsRaw) {
      const fasts = JSON.parse(fastsRaw);
      if (Array.isArray(fasts)) {
        for (const f of fasts) {
          if (trophies.length >= TROPHY_CAP) break;
          const statuses = f?.dayStatuses && typeof f.dayStatuses === "object" ? Object.values(f.dayStatuses) : [];
          const done = statuses.filter((s) => s === "completed").length;
          const total = typeof f?.durationDays === "number" ? f.durationDays : 0;
          if (total > 0 && done >= total) {
            trophies.push({
              id: `fast-${f.id}`,
              name: String(f?.name ?? "Fast").slice(0, 24),
              icon: "military_tech",
              desc: `Completed ${total}-day fast`,
            });
          }
        }
      }
    }
    // Coin milestones
    try {
      const coinsRaw = await AsyncStorage.getItem(COINS_STORAGE_KEY);
      const coins = parseCoins(coinsRaw ? JSON.parse(coinsRaw) : {});
      for (const m of COIN_MILESTONES) {
        if (trophies.length >= TROPHY_CAP) break;
        if (coins.lifetimeEarned >= m.threshold) {
          trophies.push({ id: `milestone-${m.threshold}`, name: m.name, icon: "emoji_events", desc: `Earned ${m.threshold} lifetime coins` });
        }
      }
    } catch {}
    // Monuments (cap 6) — storage is Record<date, design>
    try {
      const monRaw = await AsyncStorage.getItem(MONUMENT_STORAGE_KEY);
      const mons = monRaw ? JSON.parse(monRaw) : {};
      const entries = mons && typeof mons === "object" ? Object.entries(mons) : [];
      for (const [date, design] of entries.slice(0, 6)) {
        if (trophies.length >= TROPHY_CAP) break;
        trophies.push({
          id: `monument-${date}`,
          name: "Testimony",
          icon: "landscape",
          desc: `Monument raised ${date}`,
        });
      }
    } catch {}
    // Unlocked maps
    try {
      const unlockedRaw = await AsyncStorage.getItem(MAP_UNLOCKED_KEY);
      const unlocked = parseUnlockedMaps(unlockedRaw ? JSON.parse(unlockedRaw) : ["town"]);
      const mapNames: Record<string, string> = { city: "City Founder", mall: "Mall Pioneer", school: "School Builder" };
      for (const id of ["city", "mall", "school"]) {
        if (trophies.length >= TROPHY_CAP) break;
        if (unlocked.includes(id as any)) {
          trophies.push({ id: `map-${id}`, name: mapNames[id], icon: "location_city", desc: `Unlocked the ${id}` });
        }
      }
    } catch {}
  } catch {}
  return trophies;
}

export type GardenData = { completed: number; total: number; fastName: string };
export const GARDEN_COIN_EACH = 0.001;
export const GARDEN_FLOWER_CAP = 365;

/** Completed days in the most recent fast -> blooming flowers. */
export async function getGardenData(): Promise<GardenData> {
  try {
    const raw = await AsyncStorage.getItem(FASTS_STORAGE_KEY);
    const fasts = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(fasts) || fasts.length === 0) return { completed: 0, total: 0, fastName: "" };
    const sorted = [...fasts].sort((a, b) => String(b?.startDate ?? "").localeCompare(String(a?.startDate ?? "")));
    const f = sorted[0];
    const statuses = f?.dayStatuses && typeof f.dayStatuses === "object" ? Object.values(f.dayStatuses) : [];
    const completed = statuses.filter((s) => s === "completed").length;
    return {
      completed: Math.min(completed, GARDEN_FLOWER_CAP),
      total: typeof f?.durationDays === "number" ? f.durationDays : 0,
      fastName: String(f?.name ?? ""),
    };
  } catch {
    return { completed: 0, total: 0, fastName: "" };
  }
}

// ---- Cached bonuses (sync access for xp-engine + income tick) ----

let cachedHouseBonuses: HouseBonuses = { ...ZERO_HOUSE_BONUSES };

export function getCachedHouseBonuses(): HouseBonuses {
  return cachedHouseBonuses;
}

/** Recompute all house bonuses (furniture + desirables). Call after house changes and on Hometown open. */
export async function refreshHouseBonusCache(): Promise<HouseBonuses> {
  try {
    const state = await loadHouseState();
    const b = furnitureBonuses(state);
    // Prayer room: +1% per lit candle
    if (state.rooms.prayer.unlocked) {
      const candles = await getPrayerCandles();
      const lit = candles.filter((c) => c.lit).length;
      b.coinMult += Math.min(lit, PRAYER_CANDLE_CAP) * 0.01;
    }
    // Trophy room: +0.5% per trophy
    if (state.rooms.trophy.unlocked) {
      const trophies = await computeTrophies();
      b.coinMult += Math.min(trophies.length, TROPHY_CAP) * TROPHY_COIN_EACH;
    }
    // Garden: +0.1% per blooming flower
    if (state.rooms.garden.unlocked) {
      const garden = await getGardenData();
      b.coinMult += Math.min(garden.completed, GARDEN_FLOWER_CAP) * GARDEN_COIN_EACH;
    }
    cachedHouseBonuses = b;
    return b;
  } catch {
    return cachedHouseBonuses;
  }
}
