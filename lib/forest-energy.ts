// Dark Forest energy — the forest runs on the hero's strength, and his
// strength is his level. Max energy == the player's XP level (Jonathan,
// level 15, has 15 energy). Every wave fight costs 1 energy, spent on
// entry, win or lose; the Boss Gate is always free — the gate panel
// promises "Defeat costs nothing," and energy must never block a
// prestige. The whole store rekindles at local midnight.
//
// State lives in its own AsyncStorage key as { date, energy }; the date
// rollover on read is the refill, like the other daily systems
// (mini-games, hometown stock). A sync cache in the badges/gear pattern
// lets the forest UI read the current store without awaiting storage.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadXPState } from "./xp-engine";

export const FOREST_ENERGY_KEY = "prayercircle.forest-energy.v1";

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

/**
 * Pure: resolve a stored state against a level and today's date.
 * A stored date other than today means midnight has passed — the store
 * rekindles to full. Same-day energy is kept, clamped to the max (a
 * level drop can shrink the max under a stored value).
 */
export function resolveForestEnergy(raw: unknown, level: number, today: string): ForestEnergy {
  const max = maxForestEnergy(level);
  if (raw && typeof raw === "object") {
    const s = raw as Partial<ForestEnergyState>;
    if (s.date === today && typeof s.energy === "number" && Number.isFinite(s.energy)) {
      const base = Math.max(0, Math.min(max, Math.floor(s.energy)));
      const bonus =
        typeof s.bonus === "number" && Number.isFinite(s.bonus) ? Math.max(0, Math.floor(s.bonus)) : 0;
      return { energy: base + bonus, max };
    }
  }
  return { energy: max, max };
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

async function persistEnergy(state: ForestEnergy, today: string): Promise<void> {
  try {
    // Split the total back into base (≤ cap) + bonus (above the cap).
    // The bonus key is written only when positive, so the common-case
    // stored shape stays exactly { date, energy }.
    const bonus = Math.max(0, state.energy - state.max);
    const stored: ForestEnergyState =
      bonus > 0
        ? { date: today, energy: state.energy - bonus, bonus }
        : { date: today, energy: state.energy };
    await AsyncStorage.setItem(FOREST_ENERGY_KEY, JSON.stringify(stored));
  } catch {}
}

/**
 * Load today's energy store: the player's level sets the max, a stored
 * date from before today refills to full (and is re-stamped to today).
 * Updates the sync cache.
 */
export async function loadForestEnergy(): Promise<ForestEnergy> {
  const today = forestEnergyDateStr();
  const [xp, raw] = await Promise.all([loadXPState(), readStoredState()]);
  const resolved = resolveForestEnergy(raw, xp.level, today);
  const stored = raw as Partial<ForestEnergyState> | null;
  const storedTotal =
    stored && typeof stored.energy === "number"
      ? stored.energy + (typeof stored.bonus === "number" ? stored.bonus : 0)
      : null;
  if (!stored || stored.date !== today || storedTotal !== resolved.energy) {
    await persistEnergy(resolved, today);
  }
  setCachedForestEnergy(resolved);
  return resolved;
}

/**
 * Spend 1 energy on entering a wave fight. Returns false — and spends
 * nothing — when the store is empty. Boss Gate fights never call this:
 * the gate is free.
 */
export async function spendForestEnergy(): Promise<boolean> {
  const current = await loadForestEnergy();
  const next = spendFromEnergy(current);
  if (!next) return false;
  setCachedForestEnergy(next);
  await persistEnergy(next, forestEnergyDateStr());
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
  const current = await loadForestEnergy();
  const add = Math.max(0, Math.floor(amount) || 0);
  if (add <= 0) return current;
  const next: ForestEnergy = { energy: current.energy + add, max: current.max };
  setCachedForestEnergy(next);
  await persistEnergy(next, forestEnergyDateStr());
  return next;
}
