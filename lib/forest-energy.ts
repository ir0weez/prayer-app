// Dark Forest energy — the forest runs on the hero's strength, and his
// strength is his level. Max energy == the player's XP level (Jonathan,
// level 15, has 15 energy). Every wave fight costs 1 energy, spent on
// entry, win or lose; the Boss Gate is always free — the gate panel
// promises "Defeat costs nothing," and energy must never block a
// prestige. The whole store rekindles at local midnight.
//
// v343: the v177 hourly trickle is REMOVED — the store rekindles at
// local midnight and that is the only refill; nothing returns
// mid-day. The above-cap bonus pool goes with it: grants (diner
// coffee) clamp at the level cap like everything else. (The stored
// `updatedAt` anchor and `bonus` field stay readable for old saves;
// a stored bonus is dropped on the next resolve, never spent.)
//
// State lives in its own AsyncStorage key as { date, energy }; the date
// rollover on read is the refill, like the other daily systems
// (mini-games, hometown stock). A sync cache in the badges/gear pattern
// lets the forest UI read the current store without awaiting storage.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadXPState } from "./xp-engine";

export const FOREST_ENERGY_KEY = "prayercircle.forest-energy.v1";

/** RE-BASED v343: ENERGY_TRICKLE_MS is removed with the trickle it
 *  paced — midnight is the only refill now. */

export type ForestEnergyState = {
  /** Local date ("YYYY-MM-DD") the stored energy belongs to. */
  date: string;
  /** Base energy (never above the level cap on its own). */
  energy: number;
  /**
   * Legacy (pre-v343): purchased bonus energy above the cap. The
   * pool is removed — the resolver drops it on read and nothing
   * writes it any more. Kept in the type so old stores still parse.
   */
  bonus?: number;
  /**
   * Legacy (v177–v342): the hourly trickle's anchor. The resolver no
   * longer advances energy from it; new writes simply carry `now`.
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

/** A resolved store: the public energy view plus its anchor stamp. */
type ResolvedEnergyStore = ForestEnergy & { updatedAt: number };

/**
 * Pure: resolve a stored state against a level, today's date, and the
 * current time.
 * A stored date other than today means midnight has passed — the store
 * rekindles to full. Same-day energy is kept, clamped to the max (a
 * level drop can shrink the max under a stored value). v343: NO
 * hourly trickle settles here, and a legacy stored `bonus` is dropped
 * — energy never exceeds the level cap. The anchor is carried as
 * `nowMs` purely so old stores keep their shape.
 */
function resolveEnergyStore(raw: unknown, level: number, today: string, nowMs: number): ResolvedEnergyStore {
  const max = maxForestEnergy(level);
  if (raw && typeof raw === "object") {
    const s = raw as Partial<ForestEnergyState>;
    if (s.date === today && typeof s.energy === "number" && Number.isFinite(s.energy)) {
      const base = Math.max(0, Math.min(max, Math.floor(s.energy)));
      return { energy: base, max, updatedAt: nowMs };
    }
  }
  return { energy: max, max, updatedAt: nowMs };
}

/**
 * Pure: resolve a stored state against a level and today's date (the
 * public view — { energy, max } only).
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

/** Split a total into the stored base (≤ cap) + bonus. v343: the
 * bonus pool is removed — energy clamps at the cap, bonus is 0. */
function splitEnergy(state: ForestEnergy): { base: number; bonus: number } {
  return { base: Math.max(0, Math.min(state.max, state.energy)), bonus: 0 };
}

async function persistStore(state: ResolvedEnergyStore, today: string): Promise<void> {
  try {
    // The stored shape stays { date, energy, updatedAt }; the bonus
    // key is never written any more (v343).
    const { base, bonus } = splitEnergy(state);
    const stored: ForestEnergyState =
      bonus > 0
        ? { date: today, energy: base, bonus, updatedAt: state.updatedAt }
        : { date: today, energy: base, updatedAt: state.updatedAt };
    await AsyncStorage.setItem(FOREST_ENERGY_KEY, JSON.stringify(stored));
  } catch {}
}

/**
 * Load today's energy store, settled: the player's level sets the
 * max, and a stored date from before today refills to full (and is
 * re-stamped to today) — midnight is the only refill (v343).
 * Persists whenever the settled store differs from what was stored.
 * Updates the sync cache with the public { energy, max } view.
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
    storedBonus !== bonus
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
 * the gate is free.
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
 * Grant energy (diner coffee): +amount on today's store, CLAMPED at
 * the level cap (v343 — the above-cap bonus pool is removed; a grant
 * at a full store is a no-op, as is any non-positive amount).
 * Updates the sync cache so the forest panel sees it immediately.
 */
export async function grantForestEnergy(amount: number): Promise<ForestEnergy> {
  const current = await loadEnergyStore();
  const add = Math.max(0, Math.floor(amount) || 0);
  if (add <= 0) return { energy: current.energy, max: current.max };
  const nextStore: ResolvedEnergyStore = {
    energy: Math.min(current.max, current.energy + add),
    max: current.max,
    updatedAt: current.updatedAt,
  };
  setCachedForestEnergy({ energy: nextStore.energy, max: nextStore.max });
  await persistStore(nextStore, forestEnergyDateStr());
  return { energy: nextStore.energy, max: nextStore.max };
}
