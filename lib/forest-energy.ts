// Dark Forest energy — the forest runs on the hero's strength, and his
// strength is his level. Max energy == the player's XP level (Jonathan,
// level 15, has 15 energy). Every wave fight costs 1 energy, spent on
// entry, win or lose; the Boss Gate is always free — the gate panel
// promises "Defeat costs nothing," and energy must never block a
// prestige. The whole store rekindles at local midnight.
//
// Since v177 the strength also returns one flame at a time: +1 base
// energy per full hour elapsed, settled from the stored `updatedAt`
// anchor whenever the store loads (no background timers, like every
// other system here). The trickle feeds the BASE only, capped at the
// level max; purchased bonus energy is untouched by it and still dies
// at midnight.
//
// State lives in its own AsyncStorage key as { date, energy }; the date
// rollover on read is the refill, like the other daily systems
// (mini-games, hometown stock). A sync cache in the badges/gear pattern
// lets the forest UI read the current store without awaiting storage.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadXPState } from "./xp-engine";

export const FOREST_ENERGY_KEY = "prayercircle.forest-energy.v1";

/** The hourly trickle: one flame back per full hour (v177). */
export const ENERGY_TRICKLE_MS = 3600 * 1000;

export type ForestEnergyState = {
  /** Local date ("YYYY-MM-DD") the stored energy belongs to. */
  date: string;
  /** Base energy (never above the level cap on its own). */
  energy: number;
  /**
   * Purchased bonus energy ABOVE the cap (diner coffee). Kept separate
   * from `energy` so the base store still clamps to the level cap; the
   * bonus is spent like normal energy and dies at midnight — the daily
   * refill resets the whole store to the cap as usual.
   */
  bonus?: number;
  /**
   * Epoch ms the hourly trickle clock last advanced to (v177). Absent
   * on stores written before v177: the clock starts at the first
   * v177 load — no retroactive trickle for time already gone.
   */
  updatedAt?: number;
};

export type ForestEnergy = {
  /** Energy left today. */
  energy: number;
  /** Today's max — the player's XP level. */
  max: number;
};

/** Local date as "YYYY-MM-DD" (same shape as hometown's localDateStr). */
export function forestEnergyDateStr(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Max forest energy for an XP level: the level itself (Lv 15 = 15). */
export function maxForestEnergy(level: number): number {
  return Math.max(0, Math.floor(level) || 0);
}

/** A resolved store: the public energy view plus its trickle anchor. */
type ResolvedEnergyStore = ForestEnergy & { updatedAt: number };

/**
 * Pure: resolve a stored state against a level, today's date, and the
 * current time.
 * A stored date other than today means midnight has passed — the store
 * rekindles to full. Same-day energy is kept, clamped to the max (a
 * level drop can shrink the max under a stored value), and the hourly
 * trickle settles on top of the BASE: +1 per full hour elapsed since
 * the stored `updatedAt` anchor, capped at the max. Bonus energy is
 * untouched by the trickle. The anchor advances by the whole hours
 * consumed (leftover partial time carries), rests at `nowMs` while
 * the base sits at the cap (no banking past full), and starts at
 * `nowMs` for a legacy store that has none — never retroactive.
 */
function resolveEnergyStore(raw: unknown, level: number, today: string, nowMs: number): ResolvedEnergyStore {
  const max = maxForestEnergy(level);
  if (raw && typeof raw === "object") {
    const s = raw as Partial<ForestEnergyState>;
    if (s.date === today && typeof s.energy === "number" && Number.isFinite(s.energy)) {
      let base = Math.max(0, Math.min(max, Math.floor(s.energy)));
      const bonus =
        typeof s.bonus === "number" && Number.isFinite(s.bonus) ? Math.max(0, Math.floor(s.bonus)) : 0;
      const anchorIn =
        typeof s.updatedAt === "number" && Number.isFinite(s.updatedAt) && s.updatedAt >= 0
          ? s.updatedAt
          : null;
      let anchor = anchorIn ?? nowMs;
      if (base >= max) {
        anchor = nowMs;
      } else if (anchorIn !== null) {
        const elapsed = nowMs - anchorIn;
        const periods = elapsed > 0 ? Math.floor(elapsed / ENERGY_TRICKLE_MS) : 0;
        if (periods > 0) {
          base = Math.min(max, base + periods);
          anchor = base >= max ? nowMs : anchorIn + periods * ENERGY_TRICKLE_MS;
        }
      }
      return { energy: base + bonus, max, updatedAt: anchor };
    }
  }
  return { energy: max, max, updatedAt: nowMs };
}

/**
 * Pure: resolve a stored state against a level and today's date (the
 * public view — { energy, max } only; the trickle anchor stays an
 * internal storage concern).
 */
export function resolveForestEnergy(
  raw: unknown,
  level: number,
  today: string,
  nowMs: number = Date.now(),
): ForestEnergy {
  const { energy, max } = resolveEnergyStore(raw, level, today, nowMs);
  return { energy, max };
}

/** Pure: spend one point. Returns the next store, or null when empty. */
export function spendFromEnergy(current: ForestEnergy): ForestEnergy | null {
  if (current.energy <= 0) return null;
  return { energy: current.energy - 1, max: current.max };
}

// ---- Sync cache (badges/gear pattern) ----

let cachedEnergy: ForestEnergy | null = null;

export function getCachedForestEnergy(): ForestEnergy | null {
  return cachedEnergy;
}

export function setCachedForestEnergy(value: ForestEnergy | null): void {
  cachedEnergy = value ? { energy: value.energy, max: value.max } : null;
}

// ---- Storage ----

async function readStoredState(): Promise<unknown> {
  try {
    const raw = await AsyncStorage.getItem(FOREST_ENERGY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Split a total into the stored base (≤ cap) + bonus (above it). */
function splitEnergy(state: ForestEnergy): { base: number; bonus: number } {
  const bonus = Math.max(0, state.energy - state.max);
  return { base: state.energy - bonus, bonus };
}

async function persistStore(state: ResolvedEnergyStore, today: string): Promise<void> {
  try {
    // Split the total back into base (≤ cap) + bonus (above the cap).
    // The bonus key is written only when positive, so the common-case
    // stored shape stays { date, energy } plus the v177 trickle anchor.
    const { base, bonus } = splitEnergy(state);
    const stored: ForestEnergyState =
      bonus > 0
        ? { date: today, energy: base, bonus, updatedAt: state.updatedAt }
        : { date: today, energy: base, updatedAt: state.updatedAt };
    await AsyncStorage.setItem(FOREST_ENERGY_KEY, JSON.stringify(stored));
  } catch {}
}

/**
 * Load today's energy store, settled: the player's level sets the max,
 * a stored date from before today refills to full (and is re-stamped
 * to today), and the hourly trickle settles against the stored anchor.
 * Persists whenever the settled store differs from what was stored —
 * including a bare anchor stamp on a legacy store. Updates the sync
 * cache with the public { energy, max } view.
 */
async function loadEnergyStore(): Promise<ResolvedEnergyStore> {
  const today = forestEnergyDateStr();
  const [xp, raw] = await Promise.all([loadXPState(), readStoredState()]);
  const resolved = resolveEnergyStore(raw, xp.level, today, Date.now());
  const stored = raw as Partial<ForestEnergyState> | null;
  const { base, bonus } = splitEnergy(resolved);
  const storedBase = stored && typeof stored.energy === "number" ? stored.energy : null;
  const storedBonus = stored && typeof stored.bonus === "number" ? stored.bonus : 0;
  if (
    !stored ||
    stored.date !== today ||
    storedBase !== base ||
    storedBonus !== bonus ||
    stored.updatedAt !== resolved.updatedAt
  ) {
    await persistStore(resolved, today);
  }
  setCachedForestEnergy({ energy: resolved.energy, max: resolved.max });
  return resolved;
}

/** Load today's settled energy store (public { energy, max } view). */
export async function loadForestEnergy(): Promise<ForestEnergy> {
  const { energy, max } = await loadEnergyStore();
  return { energy, max };
}

/**
 * Spend 1 energy on entering a wave fight. Returns false — and spends
 * nothing — when the store is empty. Boss Gate fights never call this:
 * the gate is free. The trickle anchor rides through untouched: the
 * hourly flame arrives on the anchor's schedule whether or not a
 * spend happened inside the hour (hero-health's carry semantics).
 */
export async function spendForestEnergy(): Promise<boolean> {
  const current = await loadEnergyStore();
  const next = spendFromEnergy(current);
  if (!next) return false;
  const nextStore: ResolvedEnergyStore = { ...next, updatedAt: current.updatedAt };
  setCachedForestEnergy(next);
  await persistStore(nextStore, forestEnergyDateStr());
  return true;
}

/**
 * Grant bonus energy (diner coffee): +amount on top of today's store,
 * ALLOWED to exceed the level cap. The excess is stored as `bonus`, so
 * it survives re-reads of the base store, is spent like normal energy,
 * and disappears at midnight when the store rekindles to the cap.
 * Updates the sync cache so the forest panel sees it immediately.
 */
export async function grantForestEnergy(amount: number): Promise<ForestEnergy> {
  const current = await loadEnergyStore();
  const add = Math.max(0, Math.floor(amount) || 0);
  if (add <= 0) return { energy: current.energy, max: current.max };
  const nextStore: ResolvedEnergyStore = {
    energy: current.energy + add,
    max: current.max,
    updatedAt: current.updatedAt,
  };
  setCachedForestEnergy({ energy: nextStore.energy, max: nextStore.max });
  await persistStore(nextStore, forestEnergyDateStr());
  return { energy: nextStore.energy, max: nextStore.max };
}
