// Surprise visitors for Hometown — 1-3 random encounters per day.
//
// Seeded per calendar day (local timezone) so they don't spam: the same set
// appears all day, then a fresh set tomorrow. Types:
// - Traveling Merchant: sells a rare deal (unowned gear at 30% off, or a blessing)
// - Stranger with a Request: a quick prayer request for coins + XP
// - Rare Golden Light: big reward if tapped within 30 seconds

export const SURPRISE_STORAGE_KEY = "prayercircle.hometown.surprises.v1";

export type VisitorType = "merchant" | "stranger" | "golden";

export type MerchantDeal = {
  gearId: string | null; // null = blessing bundle (no gear left to sell)
  name: string;
  description: string;
  price: number; // coins
  xpReward: number; // blessing bundle grants XP instead of gear
};

export type Visitor = {
  id: string;
  type: VisitorType;
  /** Grid coords on the town map (10x18). */
  x: number;
  y: number;
  /** Epoch ms when this visitor expires (golden light only). */
  expiresAtMs: number | null;
  claimed: boolean;
  merchantDeal?: MerchantDeal;
  strangerText?: string;
  strangerCoins?: number;
  strangerXp?: number;
  goldenCoins?: number;
  goldenXp?: number;
};

export type SurpriseState = {
  /** Local date (YYYY-MM-DD) these visitors belong to. */
  date: string;
  visitors: Visitor[];
};

function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** FNV-1a hash of a string → 32-bit seed. */
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mulberry32 seeded RNG. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STRANGER_REQUESTS = [
  { text: "A weary traveler asks: \"Will you pray for my family back home?\"", coins: 12, xp: 10 },
  { text: "A stranger whispers: \"I lost my way. Pray I find my road.\"", coins: 10, xp: 12 },
  { text: "An old pilgrim asks: \"Remember my village in your prayers tonight.\"", coins: 15, xp: 8 },
  { text: "A young mother pleads: \"Pray for my sick child.\"", coins: 14, xp: 14 },
  { text: "A merchant's guard asks: \"Pray for safe travels on the road ahead.\"", coins: 11, xp: 9 },
];

export function emptySurprises(): SurpriseState {
  return { date: "", visitors: [] };
}

export async function loadSurprises(): Promise<SurpriseState> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem(SURPRISE_STORAGE_KEY);
    if (!raw) return emptySurprises();
    const s = JSON.parse(raw);
    return {
      date: typeof s.date === "string" ? s.date : "",
      visitors: Array.isArray(s.visitors) ? s.visitors.filter((v: unknown) => v && typeof (v as Visitor).id === "string") : [],
    };
  } catch {
    return emptySurprises();
  }
}

export async function saveSurprises(s: SurpriseState): Promise<void> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.setItem(SURPRISE_STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

/**
 * Get today's visitors, generating them (seeded) if needed. Golden lights
 * that expired are filtered out. Safe to call on every open.
 */
export async function getTodayVisitors(now: Date = new Date()): Promise<SurpriseState> {
  const today = localDateStr(now);
  let state = await loadSurprises();
  if (state.date !== today) {
    state = generateVisitors(today, now.getTime());
    await saveSurprises(state);
  } else {
    // Drop expired golden lights.
    const alive = state.visitors.filter((v) => v.type !== "golden" || v.claimed || (v.expiresAtMs ?? 0) > now.getTime());
    if (alive.length !== state.visitors.length) {
      state = { ...state, visitors: alive };
      await saveSurprises(state);
    }
  }
  return state;
}

function generateVisitors(date: string, nowMs: number): SurpriseState {
  const rng = mulberry32(hashStr(`surprise:${date}`));
  const count = 1 + Math.floor(rng() * 3); // 1-3 visitors
  // Shuffle types so there's variety.
  const types: VisitorType[] = ["merchant", "stranger", "golden"];
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  const visitors: Visitor[] = [];
  const used = new Set<string>();
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    let x = 1 + Math.floor(rng() * 8);
    let y = 2 + Math.floor(rng() * 14);
    let guard = 0;
    while (used.has(`${x},${y}`) && guard++ < 20) {
      x = 1 + Math.floor(rng() * 8);
      y = 2 + Math.floor(rng() * 14);
    }
    used.add(`${x},${y}`);
    const id = `${date}:${type}:${i}`;
    if (type === "merchant") {
      visitors.push({ id, type, x, y, expiresAtMs: null, claimed: false });
    } else if (type === "stranger") {
      const req = STRANGER_REQUESTS[Math.floor(rng() * STRANGER_REQUESTS.length)];
      visitors.push({ id, type, x, y, expiresAtMs: null, claimed: false, strangerText: req.text, strangerCoins: req.coins, strangerXp: req.xp });
    } else {
      const coins = 25 + Math.floor(rng() * 26); // 25-50
      const xp = 15 + Math.floor(rng() * 16); // 15-30
      visitors.push({ id, type, x, y, expiresAtMs: nowMs + 30000, claimed: false, goldenCoins: coins, goldenXp: xp });
    }
  }
  return { date, visitors };
}

/**
 * Build the merchant's deal: a random unowned gear piece at 30% off, or a
 * blessing bundle when everything is owned.
 */
export async function buildMerchantDeal(): Promise<MerchantDeal> {
  const { GEAR_CATALOG, loadInventory } = await import("./gear");
  const owned = new Set(await loadInventory());
  const unowned = GEAR_CATALOG.filter((g) => g.cost > 0 && !owned.has(g.id));
  if (unowned.length === 0) {
    return {
      gearId: null,
      name: "Traveler's Blessing",
      description: "The merchant has sold all his wares — but he offers a blessing for your journey.",
      price: 20,
      xpReward: 50,
    };
  }
  // Deterministic pick per day so the deal doesn't change on re-open.
  const rng = mulberry32(hashStr(`merchant:${localDateStr()}`));
  const gear = unowned[Math.floor(rng() * unowned.length)];
  const price = Math.max(1, Math.round(gear.cost * 0.7));
  return {
    gearId: gear.id,
    name: gear.name,
    description: `${gear.description} (Traveler's price — 30% off!)`,
    price,
    xpReward: 0,
  };
}

export async function markVisitorClaimed(id: string, now: Date = new Date()): Promise<void> {
  const state = await loadSurprises();
  const visitors = state.visitors.map((v) => (v.id === id ? { ...v, claimed: true } : v));
  await saveSurprises({ ...state, visitors });
}
