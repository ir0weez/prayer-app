// ---- Diner coffee: three cups a day, forest fuel ----
// The diner sells coffee, max 3 cups per day (own daily counter, resets
// at local midnight like the other daily systems). Each cup grants
// +1 Dark Forest energy immediately — allowed to exceed the level cap
// via grantForestEnergy's bonus store — plus 10 XP. The diner interior
// owns the purchase; this module owns the counter.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { forestEnergyDateStr, grantForestEnergy } from "./forest-energy";

export const DINER_COFFEE_KEY = "prayercircle.diner.coffee.v1";
export const COFFEE_PRICE = 150;
export const COFFEE_MAX_PER_DAY = 3;
export const COFFEE_XP = 10;

export type DinerCoffeeState = {
  /** Local date ("YYYY-MM-DD") the count belongs to. */
  date: string;
  /** Cups bought that day. */
  count: number;
};

/** Pure: cups bought today from a stored state (yesterday's count is 0). */
export function resolveCoffeeCount(raw: unknown, today: string): number {
  if (raw && typeof raw === "object") {
    const s = raw as Partial<DinerCoffeeState>;
    if (s.date === today && typeof s.count === "number" && Number.isFinite(s.count)) {
      return Math.max(0, Math.min(COFFEE_MAX_PER_DAY, Math.floor(s.count)));
    }
  }
  return 0;
}

async function loadCoffeeState(): Promise<{ state: DinerCoffeeState; today: string }> {
  const today = forestEnergyDateStr();
  try {
    const raw = await AsyncStorage.getItem(DINER_COFFEE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return { state: { date: today, count: resolveCoffeeCount(parsed, today) }, today };
  } catch {
    return { state: { date: today, count: 0 }, today };
  }
}

/** Cups still available today (0..3). */
export async function coffeesLeftToday(): Promise<number> {
  const { state } = await loadCoffeeState();
  return COFFEE_MAX_PER_DAY - state.count;
}

/**
 * Record one purchased cup. Returns cups left afterwards, or -1 when
 * the day's three are already gone (nothing recorded).
 */
export async function recordCoffeePurchase(): Promise<number> {
  const { state, today } = await loadCoffeeState();
  if (state.count >= COFFEE_MAX_PER_DAY) return -1;
  const next: DinerCoffeeState = { date: today, count: state.count + 1 };
  try {
    await AsyncStorage.setItem(DINER_COFFEE_KEY, JSON.stringify(next));
  } catch {}
  return COFFEE_MAX_PER_DAY - next.count;
}

/** The energy half of a cup: +1 forest energy, over the cap if needed. */
export async function grantCoffeeEnergy(): Promise<void> {
  await grantForestEnergy(1);
}
