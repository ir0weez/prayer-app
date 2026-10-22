// Hero health — Dark Forest HP that persists between runs
// (Jonathan's design, 2026-10-21). Combat HP does NOT snap back to
// full: it carries across forest runs in a day and comes back gently
// on its own — an hourly mend (+10% of max HP per full hour, the
// v177 rate; it was a slower ~4-hour tick before), an overnight rest
// at home (the bed fixture sets how much), and the hospital's free
// daily heals. Waking after a defeat starts the hero at a small floor
// of health, never at zero, with nothing else taken.
//
// No background timers: everything settles from timestamps whenever a
// caller who knows the hero's max HP reads the state. Storage is kept
// RAW on purpose — loadHeroHealthRaw parses and guards but does not
// settle, because settling needs maxHp (and the bed's rest rate),
// which only the caller knows.

import AsyncStorage from "@react-native-async-storage/async-storage";

export const HERO_HEALTH_KEY = "prayercircle.hero.health.v1";

/** Free full heals at the hospital per day. Care, never the wallet. */
export const HOSPITAL_HEALS_PER_DAY = 2;

/** The hourly mend: one tick every hour (v177; was ~4-hourly). */
export const TRICKLE_MS = 3600 * 1000;
/** Each hourly tick restores this fraction of max HP (v177; was 5%). */
export const TRICKLE_PCT = 0.1;

/** After a defeat the hero wakes at home with this fraction of max HP. */
export const DEFEAT_WAKE_PCT = 0.1;

export type HeroHealthState = {
  /** Current HP, or null for a brand-new hero (settles to full). */
  hp: number | null;
  /** Epoch ms the hourly mend clock last advanced to. */
  updatedAt: number;
  /** Local date ("YYYY-MM-DD") the daily counters belong to. */
  day: string;
  /** Hospital heals used on `day` (cap HOSPITAL_HEALS_PER_DAY). */
  hospitalHealsUsed: number;
};

// ---- Dates ----

type NowInput = number | Date;

function toMs(now: NowInput): number {
  return now instanceof Date ? now.getTime() : now;
}

/** Local date as "YYYY-MM-DD" (same shape as forest-energy's). */
export function heroHealthDayStr(now: NowInput = Date.now()): string {
  const d = new Date(toMs(now));
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// ---- State ----

export function defaultHeroHealthState(now: NowInput = Date.now()): HeroHealthState {
  return { hp: null, updatedAt: toMs(now), day: heroHealthDayStr(now), hospitalHealsUsed: 0 };
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Guarded parse of a stored value (object or JSON string). No settling. */
export function parseHeroHealthState(value: unknown): HeroHealthState {
  let v: unknown = value;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      v = null;
    }
  }
  if (!v || typeof v !== "object") return defaultHeroHealthState();
  const s = v as Partial<HeroHealthState>;
  return {
    hp:
      typeof s.hp === "number" && Number.isFinite(s.hp) ? Math.max(0, s.hp) : null,
    updatedAt:
      typeof s.updatedAt === "number" && Number.isFinite(s.updatedAt) && s.updatedAt >= 0
        ? s.updatedAt
        : 0,
    day: typeof s.day === "string" && DAY_RE.test(s.day) ? s.day : heroHealthDayStr(),
    hospitalHealsUsed:
      typeof s.hospitalHealsUsed === "number" && Number.isFinite(s.hospitalHealsUsed)
        ? Math.max(0, Math.floor(s.hospitalHealsUsed))
        : 0,
  };
}

/** Overnight rest rate from the bedroom bed tier (0..3 → 0.25..0.55). */
export function restPctForBedTier(tier: number): number {
  const t = typeof tier === "number" && Number.isFinite(tier) ? Math.max(0, Math.min(3, Math.floor(tier))) : 0;
  return 0.25 + 0.1 * t;
}

/**
 * Pure settle against `now` (epoch ms or Date). Returns the next state
 * and whether anything changed.
 *
 * - hp null (new hero) settles to full maxHp.
 * - Day rollover: the overnight rest restores restPct × maxHp (capped),
 *   the hospital heal count resets, and the trickle clock restarts at
 *   `now`. One rest per rollover, however long the absence.
 * - Same day: each full TRICKLE_MS period elapsed since updatedAt
 *   restores TRICKLE_PCT × maxHp (capped at maxHp). updatedAt advances
 *   by the whole periods consumed, so leftover partial time carries.
 */
export function settleHealth(
  state: HeroHealthState,
  now: NowInput,
  maxHp: number,
  restPct: number,
): { state: HeroHealthState; changed: boolean } {
  const nowMs = toMs(now);
  const max = Math.max(0, maxHp);
  const today = heroHealthDayStr(nowMs);

  if (state.hp === null) {
    const next: HeroHealthState = {
      hp: max,
      updatedAt: nowMs,
      day: today,
      hospitalHealsUsed: state.day === today ? state.hospitalHealsUsed : 0,
    };
    // hp itself always changes here (null -> full), so this is a change
    // even when the other fields happen to already match.
    return { state: next, changed: true };
  }

  if (state.day !== today) {
    const rested = Math.min(max, Math.max(0, state.hp) + Math.max(0, restPct) * max);
    const next: HeroHealthState = {
      hp: rested,
      updatedAt: nowMs,
      day: today,
      hospitalHealsUsed: 0,
    };
    return { state: next, changed: true };
  }

  const elapsed = nowMs - state.updatedAt;
  const periods = elapsed > 0 ? Math.floor(elapsed / TRICKLE_MS) : 0;
  if (periods <= 0) return { state, changed: false };
  const next: HeroHealthState = {
    ...state,
    hp: Math.min(max, Math.max(0, state.hp) + periods * TRICKLE_PCT * max),
    updatedAt: state.updatedAt + periods * TRICKLE_MS,
  };
  return { state: next, changed: true };
}

/**
 * Pure: one free hospital heal to full. Callers settle first (a stored
 * day from before today has its count reset by the rollover). ok=false
 * — and the state is returned untouched — once the day's free heals
 * (HOSPITAL_HEALS_PER_DAY) are used.
 */
export function hospitalHeal(
  state: HeroHealthState,
  maxHp: number,
  now: NowInput = Date.now(),
): { state: HeroHealthState; ok: boolean } {
  if (state.hospitalHealsUsed >= HOSPITAL_HEALS_PER_DAY) return { state, ok: false };
  return {
    state: {
      ...state,
      hp: Math.max(0, maxHp),
      hospitalHealsUsed: state.hospitalHealsUsed + 1,
      updatedAt: toMs(now),
    },
    ok: true,
  };
}

/** A cave-in in the mine costs the hero this fraction of max HP
 *  (v170, Jonathan's ask: "an HP hit or something with cave-ins"). */
export const CAVE_IN_DAMAGE_PCT = 0.2;

/**
 * Pure: a cave-in in the mine (lib/mountain) hits the hero for
 * `damagePct` of max HP (CAVE_IN_DAMAGE_PCT unless the mine passes
 * its Cave Boots rate, v175) through this same store — the mine
 * never keeps a parallel health value. If the hit would take him
 * to/below zero he wakes at home at the defeat floor instead, by the
 * exact forest-defeat path (wakeAfterDefeat), and `wokeAtHome` says
 * so. A null hp (new hero) is treated as full before the hit lands.
 * Fasting hearts are never involved — this is combat HP only.
 */
export function applyCaveInDamage(
  state: HeroHealthState,
  maxHp: number,
  now: NowInput = Date.now(),
  damagePct: number = CAVE_IN_DAMAGE_PCT,
): { state: HeroHealthState; damage: number; wokeAtHome: boolean } {
  const max = Math.max(0, maxHp);
  const damage = Math.round(damagePct * max);
  const current = state.hp ?? max;
  const next = current - damage;
  if (next <= 0) {
    return { state: wakeAfterDefeat({ ...state, hp: 0 }, max, now), damage, wokeAtHome: true };
  }
  return { state: { ...state, hp: next, updatedAt: toMs(now) }, damage, wokeAtHome: false };
}

/**
 * Pure: heal to full WITHOUT spending one of the hospital's daily
 * free heals — the still pool's gift (v170), not the hospital's.
 */
export function healToFull(
  state: HeroHealthState,
  maxHp: number,
  now: NowInput = Date.now(),
): HeroHealthState {
  return { ...state, hp: Math.max(0, maxHp), updatedAt: toMs(now) };
}

/**
 * Pure: the hero wakes at home after a defeat with at least
 * DEFEAT_WAKE_PCT of max HP. Only ever raises HP to that floor — if he
 * somehow wakes with more, the higher value stands.
 */
export function wakeAfterDefeat(
  state: HeroHealthState,
  maxHp: number,
  now: NowInput = Date.now(),
): HeroHealthState {
  const wakeHp = Math.ceil(DEFEAT_WAKE_PCT * Math.max(0, maxHp));
  const current = state.hp ?? 0;
  if (current >= wakeHp) return state;
  return { ...state, hp: wakeHp, updatedAt: toMs(now) };
}

// ---- Storage (raw: settling is the caller's job — see header) ----

/** Load the stored health state, parsed and guarded, WITHOUT settling. */
export async function loadHeroHealthRaw(): Promise<HeroHealthState> {
  try {
    const raw = await AsyncStorage.getItem(HERO_HEALTH_KEY);
    return parseHeroHealthState(raw ? JSON.parse(raw) : null);
  } catch {
    return defaultHeroHealthState();
  }
}

export async function saveHeroHealth(state: HeroHealthState): Promise<void> {
  try {
    await AsyncStorage.setItem(HERO_HEALTH_KEY, JSON.stringify(state));
  } catch {}
}
