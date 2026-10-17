/**
 * Character stats system — Fallout-style SPECIAL, prayer-themed.
 *
 * 7 stats (Faith, Wisdom, Discipline, Generosity, Endurance, Charisma, Devotion),
 * each 1-10 starting at 1. 1 stat point is earned per XP level-up.
 * Stats grant passive boosts; perks unlock at thresholds 5 and 8.
 */

export type StatId =
  | "faith"
  | "wisdom"
  | "discipline"
  | "generosity"
  | "endurance"
  | "charisma"
  | "devotion";

export type CharacterStats = Record<StatId, number>;

export const STAT_IDS: StatId[] = [
  "faith",
  "wisdom",
  "discipline",
  "generosity",
  "endurance",
  "charisma",
  "devotion",
];

export const MAX_STAT = 10;

export type StatDef = {
  id: StatId;
  name: string;
  icon: string; // MaterialIcons name
  color: string;
  description: string;
  effectLabel: string;
};

export const STAT_DEFS: StatDef[] = [
  {
    id: "faith",
    name: "Faith",
    icon: "favorite",
    color: "#F472B6",
    description: "Trust that moves mountains.",
    effectLabel: "+2% prayer XP per point",
  },
  {
    id: "wisdom",
    name: "Wisdom",
    icon: "menu-book",
    color: "#60A5FA",
    description: "Understanding of the Word.",
    effectLabel: "+2% Bible study XP per point",
  },
  {
    id: "discipline",
    name: "Discipline",
    icon: "shield",
    color: "#A78BFA",
    description: "Steadfast when it's hard.",
    effectLabel: "+1 streak grace day / month per point",
  },
  {
    id: "generosity",
    name: "Generosity",
    icon: "volunteer-activism",
    color: "#4ADE80",
    description: "A cheerful giver.",
    effectLabel: "+3% coin earnings per point",
  },
  {
    id: "endurance",
    name: "Endurance",
    icon: "fitness-center",
    color: "#FB923C",
    description: "Built for the long fast.",
    effectLabel: "+2% fast-day XP per point",
  },
  {
    id: "charisma",
    name: "Charisma",
    icon: "record-voice-over",
    color: "#FACC15",
    description: "Inspires those around you.",
    effectLabel: "+5% mission rewards per point",
  },
  {
    id: "devotion",
    name: "Devotion",
    icon: "spa",
    color: "#2DD4BF",
    description: "Set apart, growing daily.",
    effectLabel: "+5% hair & beard growth per point",
  },
];

export type Perk = {
  id: string;
  name: string;
  stat: StatId;
  required: number;
  icon: string;
  description: string;
};

export const PERKS: Perk[] = [
  {
    id: "prayer-warrior",
    name: "Prayer Warrior",
    stat: "faith",
    required: 5,
    icon: "bolt",
    description: "+10% prayer XP",
  },
  {
    id: "intercessor",
    name: "Intercessor",
    stat: "faith",
    required: 8,
    icon: "group",
    description: "Prayers for others give double XP",
  },
  {
    id: "scholar",
    name: "Scholar",
    stat: "wisdom",
    required: 5,
    icon: "school",
    description: "+10% Bible study XP",
  },
  {
    id: "unshakeable",
    name: "Unshakeable",
    stat: "discipline",
    required: 5,
    icon: "verified",
    description: "+2 streak grace days / month",
  },
  {
    id: "cheerful-giver",
    name: "Cheerful Giver",
    stat: "generosity",
    required: 5,
    icon: "card-giftcard",
    description: "+15% coin earnings",
  },
  {
    id: "marathon",
    name: "Marathon",
    stat: "endurance",
    required: 8,
    icon: "emoji-events",
    description: "+25% fast-day XP",
  },
  {
    id: "inspiring",
    name: "Inspiring",
    stat: "charisma",
    required: 5,
    icon: "campaign",
    description: "+15% mission rewards",
  },
];

export const STATS_STORAGE_KEY = "prayercircle.character.stats.v1";
export const STAT_POINTS_STORAGE_KEY = "prayercircle.character.stat-points.v1";

export const DEFAULT_STATS: CharacterStats = {
  faith: 1,
  wisdom: 1,
  discipline: 1,
  generosity: 1,
  endurance: 1,
  charisma: 1,
  devotion: 1,
};

function normalizeStats(value: unknown): CharacterStats {
  const out = { ...DEFAULT_STATS };
  if (value && typeof value === "object") {
    for (const id of STAT_IDS) {
      const v = (value as Record<string, unknown>)[id];
      if (typeof v === "number" && Number.isFinite(v)) {
        out[id] = Math.max(1, Math.min(MAX_STAT, Math.floor(v)));
      }
    }
  }
  return out;
}

async function getAsyncStorage() {
  return (await import("@react-native-async-storage/async-storage")).default;
}

export async function loadStats(): Promise<CharacterStats> {
  try {
    const AsyncStorage = await getAsyncStorage();
    const raw = await AsyncStorage.getItem(STATS_STORAGE_KEY);
    return normalizeStats(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export async function saveStats(stats: CharacterStats): Promise<void> {
  try {
    const AsyncStorage = await getAsyncStorage();
    await AsyncStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(normalizeStats(stats)));
    await refreshStatBoostCache();
  } catch {}
}

export type StatPointsState = { available: number; grantedForLevel: number };

async function loadPointsState(): Promise<StatPointsState> {
  try {
    const AsyncStorage = await getAsyncStorage();
    const raw = await AsyncStorage.getItem(STAT_POINTS_STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        available: Math.max(0, Math.floor(p.available) || 0),
        grantedForLevel: Math.max(1, Math.floor(p.grantedForLevel) || 1),
      };
    }
  } catch {}
  return { available: 0, grantedForLevel: 1 };
}

async function savePointsState(state: StatPointsState): Promise<void> {
  try {
    const AsyncStorage = await getAsyncStorage();
    await AsyncStorage.setItem(STAT_POINTS_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export async function availableStatPoints(): Promise<number> {
  return (await loadPointsState()).available;
}

/**
 * Grants 1 stat point per level above the highest level already granted for.
 * Called on level-up; also backfills for existing high-level users on next grant.
 */
export async function grantStatPointsForLevel(level: number): Promise<number> {
  const safeLevel = Math.max(1, Math.floor(level));
  const state = await loadPointsState();
  if (safeLevel <= state.grantedForLevel) return state.available;
  const newlyGranted = safeLevel - state.grantedForLevel;
  const next = {
    available: state.available + newlyGranted,
    grantedForLevel: safeLevel,
  };
  await savePointsState(next);
  return next.available;
}

/** Spend one available point on a stat (if below max). Returns success. */
export async function allocateStatPoint(stat: StatId): Promise<boolean> {
  const [stats, points] = await Promise.all([loadStats(), loadPointsState()]);
  if (points.available <= 0) return false;
  if (stats[stat] >= MAX_STAT) return false;
  stats[stat] += 1;
  await Promise.all([
    saveStats(stats),
    savePointsState({ ...points, available: points.available - 1 }),
  ]);
  return true;
}

/** Perks currently unlocked by these stats. */
export function activePerks(stats: CharacterStats): Perk[] {
  return PERKS.filter((p) => (stats[p.stat] || 1) >= p.required);
}

export function isPerkActive(stats: CharacterStats, perkId: string): boolean {
  const perk = PERKS.find((p) => p.id === perkId);
  return !!perk && (stats[perk.stat] || 1) >= perk.required;
}

// ---------------------------------------------------------------------------
// Boost computation (cached sync access, same pattern as gear boosts)
// ---------------------------------------------------------------------------

export type StatBoosts = {
  prayerXpMult: number;
  bibleXpMult: number;
  fastXpMult: number;
  coinMult: number;
  missionMult: number;
  growthMult: number;
  graceDaysPerMonth: number;
  intercessor: boolean;
};

const ZERO_BOOSTS: StatBoosts = {
  prayerXpMult: 0,
  bibleXpMult: 0,
  fastXpMult: 0,
  coinMult: 0,
  missionMult: 0,
  growthMult: 0,
  graceDaysPerMonth: 0,
  intercessor: false,
};

let cachedStatBoosts: StatBoosts = { ...ZERO_BOOSTS };

export function getCachedStatBoosts(): StatBoosts {
  return cachedStatBoosts;
}

export function computeStatBoosts(stats: CharacterStats): StatBoosts {
  const s = normalizeStats(stats);
  const perks = activePerks(s);
  const has = (id: string) => perks.some((p) => p.id === id);
  return {
    prayerXpMult: (s.faith - 1) * 0.02 + (has("prayer-warrior") ? 0.1 : 0),
    bibleXpMult: (s.wisdom - 1) * 0.02 + (has("scholar") ? 0.1 : 0),
    fastXpMult: (s.endurance - 1) * 0.02 + (has("marathon") ? 0.25 : 0),
    coinMult: (s.generosity - 1) * 0.03 + (has("cheerful-giver") ? 0.15 : 0),
    missionMult: (s.charisma - 1) * 0.05 + (has("inspiring") ? 0.15 : 0),
    growthMult: (s.devotion - 1) * 0.05,
    graceDaysPerMonth: (s.discipline - 1) + (has("unshakeable") ? 2 : 0),
    intercessor: has("intercessor"),
  };
}

export async function refreshStatBoostCache(): Promise<StatBoosts> {
  try {
    cachedStatBoosts = computeStatBoosts(await loadStats());
    // Push the growth multiplier into pawn lib (dynamic import: no static cycle).
    import("./pawn")
      .then((m) => m.setCachedGrowthMult(cachedStatBoosts.growthMult))
      .catch(() => {});
  } catch {
    cachedStatBoosts = { ...ZERO_BOOSTS };
  }
  return cachedStatBoosts;
}

/** Streak grace days available per calendar month from Discipline. */
export async function graceDaysPerMonth(): Promise<number> {
  return getCachedStatBoosts().graceDaysPerMonth;
}
