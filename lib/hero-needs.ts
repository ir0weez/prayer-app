// Hero needs — the hero's gentle daily care loop (Jonathan's design,
// 2026-10-21): food, bathroom, shower, once a day. He takes care of
// himself regardless — if noon passes with needs still untended, he
// simply sees to them himself (the midday self-care settle) and the day
// goes on. There is NO downside anywhere in this system: no marks
// against the player, nothing lost, nothing owed. Tending all three in
// the morning is the only special case, and it is purely a gift: the
// "Set for the Day" boon — bonus Dark Forest HP and attack until
// midnight, scaled by the quality of the house's care fixtures (the
// kitchen hearth, the bath, and the shower).
//
// State lives in its own AsyncStorage key as one record per local day.
// No background timers: the day rollover and the noon self-care settle
// are computed from timestamps whenever the state is read or tended,
// like the other daily systems (forest energy, mini-games).

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CARE_BONUS_PER_TIER,
  CARE_FILL_BY_TIER,
  REST_FILL_BY_TIER,
  type HouseRoomId,
  type HouseState,
} from "./pawn-house";

export const HERO_NEEDS_KEY = "prayercircle.hero.needs.v1";

/** The morning window ends at local noon; tending after that is still
 *  welcome, it just settles through his own self-care like any day. */
export const MORNING_END_HOUR = 12;

export type NeedId = "food" | "bathroom" | "shower";

export const NEED_IDS: NeedId[] = ["food", "bathroom", "shower"];

export type HeroNeedsState = {
  /** Local date ("YYYY-MM-DD") this record belongs to. */
  day: string;
  /** Needs the player tended today, by hand. Never rewritten by the
   *  self-care settle — the record keeps what the player actually did. */
  tended: Record<NeedId, boolean>;
  /** True once the midday self-care settle has run for this day: the
   *  hero saw to any remaining needs himself. A good thing, stated
   *  plainly — he is always looked after. */
  selfCared: boolean;
  /** The "Set for the Day" boon: all three needs tended by the player
   *  before noon. Lasts until midnight (the state is per-day). */
  boonActive: boolean;
  /** Set the moment the third need is tended, recording that the boon
   *  question for the day is settled: boonActive was decided at that
   *  moment (before noon grants it) and later settles never revisit it. */
  boonLocked: boolean;
  /** Epoch ms when the third need was tended, or null. */
  allTendedAt: number | null;
};

export const NEED_META: Record<NeedId, { label: string; fixtureLabel: string }> = {
  food: { label: "Eat", fixtureLabel: "Hearth Kitchen" },
  bathroom: { label: "Use the bathroom", fixtureLabel: "Bath" },
  shower: { label: "Shower", fixtureLabel: "Shower" },
};

/** Which house slot cares for each need: room + furniture slot id. */
const NEED_FIXTURES: Record<NeedId, { room: HouseRoomId; slot: string }> = {
  food: { room: "kitchen", slot: "hearth" },
  bathroom: { room: "bathroom", slot: "tub" },
  shower: { room: "bathroom", slot: "shower" },
};

// ---- Dates ----

type NowInput = number | Date;

function toDate(now: NowInput): Date {
  return now instanceof Date ? now : new Date(now);
}

/** Local date as "YYYY-MM-DD" (same shape as forest-energy's). */
export function heroNeedsDayStr(now: NowInput = Date.now()): string {
  const d = toDate(now);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Epoch ms of local noon on the day containing `now`. */
function noonMs(now: NowInput): number {
  const d = toDate(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), MORNING_END_HOUR, 0, 0, 0).getTime();
}

// ---- Fixtures ----

/**
 * Tier (0..3) of the care fixture for a need. Read from the room's
 * furniture record; a locked room or a missing slot reads as 0.
 */
export function fixtureTierFor(house: HouseState, need: NeedId): number {
  const fixture = NEED_FIXTURES[need];
  const room = house?.rooms?.[fixture.room];
  if (!room?.unlocked) return 0;
  const tier = room.furniture?.[fixture.slot];
  if (typeof tier !== "number" || !Number.isFinite(tier)) return 0;
  return Math.max(0, Math.min(3, Math.floor(tier)));
}

/** Combined care-fixture quality: the three fixture tiers summed (0..9). */
export function fixtureQuality(house: HouseState): number {
  return NEED_IDS.reduce((sum, need) => sum + fixtureTierFor(house, need), 0);
}

// ---- State ----

export function defaultNeedsState(day: string): HeroNeedsState {
  return {
    day,
    tended: { food: false, bathroom: false, shower: false },
    selfCared: false,
    boonActive: false,
    boonLocked: false,
    allTendedAt: null,
  };
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Guarded parse of a stored value (object or JSON string). */
export function parseNeedsState(value: unknown): HeroNeedsState {
  let v: unknown = value;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      v = null;
    }
  }
  if (!v || typeof v !== "object") return defaultNeedsState(heroNeedsDayStr());
  const s = v as Partial<HeroNeedsState> & { tended?: unknown };
  if (typeof s.day !== "string" || !DAY_RE.test(s.day)) {
    return defaultNeedsState(heroNeedsDayStr());
  }
  const tendedRaw = s.tended && typeof s.tended === "object" ? (s.tended as Record<string, unknown>) : {};
  return {
    day: s.day,
    tended: {
      food: tendedRaw.food === true,
      bathroom: tendedRaw.bathroom === true,
      shower: tendedRaw.shower === true,
    },
    selfCared: s.selfCared === true,
    boonActive: s.boonActive === true,
    boonLocked: s.boonLocked === true,
    allTendedAt:
      typeof s.allTendedAt === "number" && Number.isFinite(s.allTendedAt) ? s.allTendedAt : null,
  };
}

function allTended(state: HeroNeedsState): boolean {
  return NEED_IDS.every((id) => state.tended[id]);
}

/**
 * Pure settle against `now` (epoch ms or Date):
 * - A record from another day is replaced by a fresh one for today.
 * - Same day at/after noon, with needs still untended and the self-care
 *   settle not yet run: selfCared becomes true. The hero saw to the
 *   remaining needs himself; the tended flags stay exactly as the
 *   player left them, and no boon is granted for the day.
 * - A boon already locked in that morning is never revisited.
 * Returns the same object when nothing changed.
 */
export function settleNeeds(state: HeroNeedsState, now: NowInput): HeroNeedsState {
  const today = heroNeedsDayStr(now);
  if (state.day !== today) return defaultNeedsState(today);
  if (state.selfCared || allTended(state)) return state;
  if (toDate(now).getTime() >= noonMs(now)) {
    return { ...state, selfCared: true, boonActive: false };
  }
  return state;
}

/**
 * Pure: tend one need. Settles first, so a first touch after noon lands
 * on the self-cared day and changes nothing, and a touch on a new day
 * tends on the fresh record. No-op when the need is already tended or
 * the day has already self-cared. When this tend completes all three,
 * the boon locks in: active only when the completion is before noon.
 */
export function tendNeed(state: HeroNeedsState, need: NeedId, now: NowInput): HeroNeedsState {
  const settled = settleNeeds(state, now);
  if (settled.selfCared || settled.tended[need]) return settled;
  const tended = { ...settled.tended, [need]: true };
  const next: HeroNeedsState = { ...settled, tended };
  if (allTended(next)) {
    const nowMs = toDate(now).getTime();
    next.allTendedAt = nowMs;
    next.boonLocked = true;
    next.boonActive = nowMs < noonMs(now);
  }
  return next;
}

// ---- Care stats (Rider H) ----
// Four gentle stats for the day, 0..100, DERIVED — never stored. They
// are read from the settled needs record plus the house's fixture
// tiers, so there is nothing extra to persist and nothing to drift:
// - Fed / Relieved / Washed: tending that need fills the stat to the
//   fixture's tier value (CARE_FILL_BY_TIER: tier 0 ≈ 60, t1 ≈ 75,
//   t2 ≈ 90, t3 = 100). The care-adjacent pieces add on top: herb pots
//   +CARE_BONUS_PER_TIER per tier to Fed, linen shelf the same to
//   Washed, capped at 100.
// - Rested: filled overnight by the bed — readable any time as the
//   night's rest at the bed's tier (REST_FILL_BY_TIER: t0 ≈ 55 → 100).
// - The midday self-care settle fills any stat the player didn't tend
//   to a plain SELF_CARE_BASELINE of 50: he saw to himself, simply.
// A stat nobody has tended yet (and no self-care yet) reads 0 — plain
// information about the morning so far, never a penalty or a mood.

export type CareStatId = "fed" | "washed" | "relieved" | "rested";

export type CareStats = Record<CareStatId, number>;

export const CARE_STAT_IDS: CareStatId[] = ["fed", "washed", "relieved", "rested"];

export const CARE_STAT_LABELS: Record<CareStatId, string> = {
  fed: "Fed",
  washed: "Washed",
  relieved: "Relieved",
  rested: "Rested",
};

/** Unfilled stats settle here once the hero sees to himself at midday. */
export const SELF_CARE_BASELINE = 50;

/** Tier (0..3) of the bedroom bed — the rest fixture. */
export function bedTierFor(house: HouseState): number {
  const room = house?.rooms?.bedroom;
  if (!room?.unlocked) return 0;
  const tier = room.furniture?.bed;
  if (typeof tier !== "number" || !Number.isFinite(tier)) return 0;
  return Math.max(0, Math.min(3, Math.floor(tier)));
}

/** Tier (0..3) of a care-adjacent bonus piece (herb pots / linen shelf). */
function careBonusTierFor(house: HouseState, room: HouseRoomId, slot: string): number {
  const r = house?.rooms?.[room];
  if (!r?.unlocked) return 0;
  const tier = r.furniture?.[slot];
  if (typeof tier !== "number" || !Number.isFinite(tier)) return 0;
  return Math.max(0, Math.min(3, Math.floor(tier)));
}

function fillFor(state: HeroNeedsState, house: HouseState, need: NeedId): number {
  if (state.tended[need]) {
    let fill = CARE_FILL_BY_TIER[fixtureTierFor(house, need)];
    if (need === "food") fill += CARE_BONUS_PER_TIER * careBonusTierFor(house, "kitchen", "herbPots");
    if (need === "shower") fill += CARE_BONUS_PER_TIER * careBonusTierFor(house, "bathroom", "linenShelf");
    return Math.min(100, fill);
  }
  return state.selfCared ? SELF_CARE_BASELINE : 0;
}

/**
 * The day's four care stats. Pass `now` to settle the record first
 * (new day / midday self-care); omit it to read the record as-is —
 * boonFor does that, since its callers pass the settled record from
 * loadHeroNeeds.
 */
export function careStatsFor(state: HeroNeedsState, house: HouseState, now?: NowInput): CareStats {
  const s = now === undefined ? state : settleNeeds(state, now);
  return {
    fed: fillFor(s, house, "food"),
    relieved: fillFor(s, house, "bathroom"),
    washed: fillFor(s, house, "shower"),
    rested: REST_FILL_BY_TIER[bedTierFor(house)],
  };
}

/** Mean of the four care stats, 0..100. */
export function averageCareStats(stats: CareStats): number {
  return (stats.fed + stats.washed + stats.relieved + stats.rested) / CARE_STAT_IDS.length;
}

// ---- The boon ----

export type HeroBoon = { active: boolean; hpPct: number; atkPct: number };

/**
 * The "Set for the Day" boon for the Dark Forest: bonus HP and attack
 * as fractions of the hero's base stats (0.10 = +10%). The base gift
 * scales with the care fixtures' combined quality (the formula this
 * system shipped with), MODULATED by the day's care stats:
 *
 *   boon = base(fixtureQuality) × (0.6 + 0.4 × averageCareStats / 100)
 *
 * At a perfect morning (every stat 100) the factor is exactly 1 and
 * the boon is the full fixture formula; a plainer morning keeps 60% of
 * it at minimum. Higher stats always mean a bigger boon, never a
 * penalty — the boon is a gift either way, until midnight.
 */
export function boonFor(state: HeroNeedsState, house: HouseState): HeroBoon {
  if (!state.boonActive) return { active: false, hpPct: 0, atkPct: 0 };
  const quality = fixtureQuality(house);
  const factor = 0.6 + 0.4 * (averageCareStats(careStatsFor(state, house)) / 100);
  return {
    active: true,
    hpPct: (0.1 + 0.02 * quality) * factor,
    atkPct: (0.05 + 0.015 * quality) * factor,
  };
}

// ---- Storage ----

/**
 * Load today's needs: parse, settle against now (new day / midday
 * self-care), and persist when the settle changed the record.
 */
export async function loadHeroNeeds(): Promise<HeroNeedsState> {
  let parsed: HeroNeedsState;
  try {
    const raw = await AsyncStorage.getItem(HERO_NEEDS_KEY);
    parsed = parseNeedsState(raw ? JSON.parse(raw) : null);
  } catch {
    parsed = defaultNeedsState(heroNeedsDayStr());
  }
  const settled = settleNeeds(parsed, Date.now());
  if (JSON.stringify(settled) !== JSON.stringify(parsed)) {
    await saveHeroNeeds(settled);
  }
  return settled;
}

export async function saveHeroNeeds(state: HeroNeedsState): Promise<void> {
  try {
    await AsyncStorage.setItem(HERO_NEEDS_KEY, JSON.stringify(state));
  } catch {}
}
