// City celebrations + little rewards for PrayerCircle Hometown.
//
// Achievement celebrations (make Jonathan feel special):
// - Level up: golden coin rain + fireworks
// - First city building: "Mayor ceremony" — confetti + cheering villagers
// - Coin milestones: street parade — banner + confetti + fireworks
// - All daily prayers complete: bell rings + white doves rise
// - New map unlocked: fireworks + cheering
//
// Little rewards in the city:
// - Hidden coin caches: sparkling spots on city streets, tap once per day
// - Wishing fountain: toss a coin, receive a random blessing (hourly)
// - Street performer: tip them, they play a tune, small XP (hourly)

export type CelebrationKind = "level-up" | "mayor" | "milestone" | "prayers" | "map";

export type CelebrationSpec = {
  id: number;
  kind: CelebrationKind;
  title: string;
  subtitle?: string;
};

export const CELEBRATIONS_KEY = "prayercircle.hometown.celebrations.v1";

export type CelebrationState = {
  /** Highest XP level a celebration has fired for (null = never synced). */
  lastLevelCelebrated: number | null;
  /** Highest coin-milestone threshold celebrated (0 = never synced). */
  lastMilestoneThreshold: number;
  /** Mayor ceremony fired for the first city building. */
  mayorCeremonyDone: boolean;
  /** Local date (YYYY-MM-DD) the all-prayers celebration last fired. */
  lastPrayerCompleteDate: string | null;
  /** Map ids already celebrated on unlock. */
  mapsCelebrated: string[];
  /** Coin-cache spot id -> local date claimed. */
  cacheClaimed: Record<string, string>;
  /** Epoch ms of the last wishing-fountain toss. */
  fountainLastTossMs: number;
  /** Epoch ms of the last street-performer tip. */
  performerLastTipMs: number;
};

export function emptyCelebrations(): CelebrationState {
  return {
    lastLevelCelebrated: null,
    lastMilestoneThreshold: 0,
    mayorCeremonyDone: false,
    lastPrayerCompleteDate: null,
    mapsCelebrated: [],
    cacheClaimed: {},
    fountainLastTossMs: 0,
    performerLastTipMs: 0,
  };
}

export function todayStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function loadCelebrations(): Promise<CelebrationState> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem(CELEBRATIONS_KEY);
    if (!raw) return emptyCelebrations();
    const s = JSON.parse(raw);
    const base = emptyCelebrations();
    return {
      lastLevelCelebrated: typeof s.lastLevelCelebrated === "number" ? s.lastLevelCelebrated : base.lastLevelCelebrated,
      lastMilestoneThreshold: typeof s.lastMilestoneThreshold === "number" ? s.lastMilestoneThreshold : base.lastMilestoneThreshold,
      mayorCeremonyDone: s.mayorCeremonyDone === true,
      lastPrayerCompleteDate: typeof s.lastPrayerCompleteDate === "string" ? s.lastPrayerCompleteDate : null,
      mapsCelebrated: Array.isArray(s.mapsCelebrated) ? s.mapsCelebrated.filter((x: unknown) => typeof x === "string") : [],
      cacheClaimed: s.cacheClaimed && typeof s.cacheClaimed === "object" ? s.cacheClaimed : {},
      fountainLastTossMs: typeof s.fountainLastTossMs === "number" ? s.fountainLastTossMs : 0,
      performerLastTipMs: typeof s.performerLastTipMs === "number" ? s.performerLastTipMs : 0,
    };
  } catch {
    return emptyCelebrations();
  }
}

export async function saveCelebrations(s: CelebrationState): Promise<void> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.setItem(CELEBRATIONS_KEY, JSON.stringify(s));
  } catch {}
}

// ---- Hidden coin caches (city streets) ----

export type CacheSpot = { id: string; x: number; y: number };

/** Sparkling spots on city streets. All are road tiles, clear of plots. */
export const COIN_CACHE_SPOTS: CacheSpot[] = [
  { id: "cache-west", x: 2, y: 7 },
  { id: "cache-east", x: 5, y: 12 },
  { id: "cache-mid", x: 7, y: 10 },
];

/** Coins found in a cache: 3-8. */
export function cacheReward(): number {
  return 3 + Math.floor(Math.random() * 6);
}

export function cacheClaimedToday(state: CelebrationState, spotId: string): boolean {
  return state.cacheClaimed[spotId] === todayStr();
}

// ---- Wishing fountain (city) ----

export const WISHING_FOUNTAIN_TILE = { x: 8, y: 6 };
export const FOUNTAIN_TOSS_COST = 1;
export const FOUNTAIN_COOLDOWN_MS = 60 * 60 * 1000;

export type FountainBlessing =
  | { kind: "coins"; coins: number }
  | { kind: "xp"; xp: number }
  | { kind: "verse"; text: string; ref: string };

const WISH_VERSES: Array<{ text: string; ref: string }> = [
  { text: "Delight thyself also in the LORD; and he shall give thee the desires of thine heart.", ref: "Psalm 37:4" },
  { text: "Every good gift and every perfect gift is from above.", ref: "James 1:17" },
  { text: "Ask, and it shall be given you; seek, and ye shall find.", ref: "Matthew 7:7" },
  { text: "The LORD shall open unto thee his good treasure.", ref: "Deuteronomy 28:12" },
  { text: "He that giveth unto the poor shall not lack.", ref: "Proverbs 28:27" },
];

/** A random blessing for tossing a coin in: coins (2-12), XP (5-20), or a verse. */
export function fountainBlessing(): FountainBlessing {
  const roll = Math.random();
  if (roll < 0.4) return { kind: "coins", coins: 2 + Math.floor(Math.random() * 11) };
  if (roll < 0.75) return { kind: "xp", xp: 5 + Math.floor(Math.random() * 16) };
  const v = WISH_VERSES[Math.floor(Math.random() * WISH_VERSES.length)];
  return { kind: "verse", text: v.text, ref: v.ref };
}

export function fountainMsRemaining(state: CelebrationState, now: number = Date.now()): number {
  return Math.max(0, FOUNTAIN_COOLDOWN_MS - (now - state.fountainLastTossMs));
}

// ---- Street performer (city) ----

export const STREET_PERFORMER_TILE = { x: 8, y: 1 };
export const PERFORMER_TIP_COST = 5;
export const PERFORMER_XP = 12;
export const PERFORMER_COOLDOWN_MS = 60 * 60 * 1000;

export function performerMsRemaining(state: CelebrationState, now: number = Date.now()): number {
  return Math.max(0, PERFORMER_COOLDOWN_MS - (now - state.performerLastTipMs));
}

/** "12m" / "45s" style cooldown label. */
export function formatCooldown(ms: number): string {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.ceil(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
