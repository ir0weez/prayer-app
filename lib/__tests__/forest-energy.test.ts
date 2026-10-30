import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// In-memory AsyncStorage so energy state flows through the real
// load/save paths (same pattern as badges-prestige.test.ts).
const store = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => { store.set(k, v); }),
    removeItem: vi.fn(async (k: string) => { store.delete(k); }),
    clear: vi.fn(async () => { store.clear(); }),
  },
}));

import {
  FOREST_ENERGY_KEY,
  forestEnergyDateStr,
  getCachedForestEnergy,
  grantForestEnergy,
  loadForestEnergy,
  maxForestEnergy,
  resolveForestEnergy,
  setCachedForestEnergy,
  spendForestEnergy,
  spendFromEnergy,
} from "../forest-energy";
import { XP_STORAGE_KEY, xpRequiredForLevel } from "../xp-engine";

const seedLevel = (level: number) => {
  store.set(XP_STORAGE_KEY, JSON.stringify({ totalXP: xpRequiredForLevel(level) }));
};

const seedEnergy = (date: string, energy: number) => {
  store.set(FOREST_ENERGY_KEY, JSON.stringify({ date, energy }));
};

const dateStrDaysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return forestEnergyDateStr(d);
};

beforeEach(() => {
  store.clear();
  setCachedForestEnergy(null);
});

describe("max energy is the XP level", () => {
  it("pure: maxForestEnergy is the level itself", () => {
    expect(maxForestEnergy(1)).toBe(1);
    expect(maxForestEnergy(15)).toBe(15);
    expect(maxForestEnergy(100)).toBe(100);
    expect(maxForestEnergy(0)).toBe(0);
    expect(maxForestEnergy(15.9)).toBe(15);
  });

  it("a fresh store starts full at the player's level", async () => {
    for (const level of [1, 15, 30, 100]) {
      store.clear();
      seedLevel(level);
      await expect(loadForestEnergy()).resolves.toEqual({ energy: level, max: level });
    }
  });

  it("Jonathan at level 15 gets 15 energy", async () => {
    seedLevel(15);
    const e = await loadForestEnergy();
    expect(e.max).toBe(15);
    expect(e.energy).toBe(15);
    expect(getCachedForestEnergy()).toEqual(e);
  });
});

describe("midnight rollover", () => {
  it("a store stamped before today rekindles to full", async () => {
    seedLevel(15);
    seedEnergy(dateStrDaysAgo(1), 0);
    await expect(loadForestEnergy()).resolves.toEqual({ energy: 15, max: 15 });
    // ...and the stored date is re-stamped to today.
    const saved = JSON.parse(store.get(FOREST_ENERGY_KEY)!);
    expect(saved.date).toBe(forestEnergyDateStr());
    expect(saved.energy).toBe(15);
  });

  it("a store from several days ago also rekindles (no debt carried)", async () => {
    seedLevel(30);
    seedEnergy(dateStrDaysAgo(4), 2);
    await expect(loadForestEnergy()).resolves.toEqual({ energy: 30, max: 30 });
  });

  it("pure: resolveForestEnergy refills on date change, keeps same-day", () => {
    const today = forestEnergyDateStr();
    expect(resolveForestEnergy({ date: "1999-01-01", energy: 0 }, 15, today)).toEqual({ energy: 15, max: 15 });
    expect(resolveForestEnergy({ date: today, energy: 3 }, 15, today)).toEqual({ energy: 3, max: 15 });
    expect(resolveForestEnergy(null, 15, today)).toEqual({ energy: 15, max: 15 });
    expect(resolveForestEnergy("junk", 15, today)).toEqual({ energy: 15, max: 15 });
  });

  it("same-day energy is NOT refilled on reload", async () => {
    seedLevel(15);
    seedEnergy(forestEnergyDateStr(), 3);
    await expect(loadForestEnergy()).resolves.toEqual({ energy: 3, max: 15 });
  });

  it("a stored value above the max clamps down (level dropped)", async () => {
    seedLevel(15);
    seedEnergy(forestEnergyDateStr(), 99);
    await expect(loadForestEnergy()).resolves.toEqual({ energy: 15, max: 15 });
  });
});

describe("spending", () => {
  it("pure: spendFromEnergy decrements and refuses at zero", () => {
    expect(spendFromEnergy({ energy: 3, max: 15 })).toEqual({ energy: 2, max: 15 });
    expect(spendFromEnergy({ energy: 1, max: 15 })).toEqual({ energy: 0, max: 15 });
    expect(spendFromEnergy({ energy: 0, max: 15 })).toBeNull();
  });

  it("spend decrements, persists, and updates the cache", async () => {
    seedLevel(15);
    await loadForestEnergy();
    await expect(spendForestEnergy()).resolves.toBe(true);
    expect(getCachedForestEnergy()).toEqual({ energy: 14, max: 15 });
    const saved = JSON.parse(store.get(FOREST_ENERGY_KEY)!);
    expect(saved).toEqual({ date: forestEnergyDateStr(), energy: 14, updatedAt: expect.any(Number) });
    // A reload sees the spent value — no double life.
    await expect(loadForestEnergy()).resolves.toEqual({ energy: 14, max: 15 });
  });

  it("spending the whole store works, then refuses at zero", async () => {
    seedLevel(3);
    await expect(spendForestEnergy()).resolves.toBe(true);
    await expect(spendForestEnergy()).resolves.toBe(true);
    await expect(spendForestEnergy()).resolves.toBe(true);
    await expect(spendForestEnergy()).resolves.toBe(false);
    await expect(spendForestEnergy()).resolves.toBe(false);
    await expect(loadForestEnergy()).resolves.toEqual({ energy: 0, max: 3 });
  });
});

describe("boss gate fights never spend energy", () => {
  // The Boss Gate is wired in the DarkForest component: startBoss is the
  // only boss entry point, and the energy spend lives in startWave.
  // Guard the wiring at the source so a future refactor can't quietly
  // start charging for the gate ("Defeat costs nothing").
  const src = readFileSync(join(process.cwd(), "components/dark-forest.tsx"), "utf8");
  const sliceFn = (from: string, to: string): string => {
    const a = src.indexOf(from);
    const b = src.indexOf(to, a);
    expect(a).toBeGreaterThan(-1);
    expect(b).toBeGreaterThan(a);
    return src.slice(a, b);
  };

  it("startWave spends energy on entry", () => {
    const body = sliceFn("const startWave", "const startBoss");
    expect(body).toContain("spendEnergyForWave()");
  });

  it("startBoss contains no energy spend", () => {
    const body = sliceFn("const startBoss", "const leaveBoss");
    expect(body).not.toContain("spendEnergyForWave");
    expect(body).not.toContain("spendForestEnergy");
    expect(body).not.toContain("startWave");
  });

  it("the Boss Gate button still calls startBoss", () => {
    expect(src).toContain("onPress={startBoss}");
  });
});

describe("granting energy (diner coffee) — clamped at the cap (RE-BASED v343)", () => {
  // RE-BASED (v343): the above-cap bonus pool is REMOVED. A stored
  // legacy bonus is dropped on resolve, grants clamp at the level
  // cap, and the stored record never carries a bonus key again.
  it("pure: resolve drops a stored bonus and clamps the base at the cap", () => {
    const today = forestEnergyDateStr();
    expect(resolveForestEnergy({ date: today, energy: 15, bonus: 2 }, 15, today)).toEqual({ energy: 15, max: 15 });
    expect(resolveForestEnergy({ date: today, energy: 99, bonus: 1 }, 15, today)).toEqual({ energy: 15, max: 15 });
    expect(resolveForestEnergy({ date: today, energy: 3, bonus: 0 }, 15, today)).toEqual({ energy: 3, max: 15 });
  });

  it("a stale-date bonus dies at midnight with the rest of the store", () => {
    const today = forestEnergyDateStr();
    expect(resolveForestEnergy({ date: dateStrDaysAgo(1), energy: 15, bonus: 3 }, 15, today)).toEqual({ energy: 15, max: 15 });
  });

  it("grant at a full store clamps at the cap and persists without a bonus key", async () => {
    seedLevel(15);
    await expect(grantForestEnergy(1)).resolves.toEqual({ energy: 15, max: 15 });
    expect(getCachedForestEnergy()).toEqual({ energy: 15, max: 15 });
    const saved = JSON.parse(store.get(FOREST_ENERGY_KEY)!);
    expect(saved).toEqual({ date: forestEnergyDateStr(), energy: 15, updatedAt: expect.any(Number) });
    await expect(loadForestEnergy()).resolves.toEqual({ energy: 15, max: 15 });
  });

  it("granted energy is spent like normal energy — there is one pool", async () => {
    seedLevel(15);
    seedEnergy(forestEnergyDateStr(), 13);
    await grantForestEnergy(2); // 13 + 2 = 15, exactly the cap
    await expect(spendForestEnergy()).resolves.toBe(true);
    await expect(loadForestEnergy()).resolves.toEqual({ energy: 14, max: 15 });
    const saved = JSON.parse(store.get(FOREST_ENERGY_KEY)!);
    expect(saved).toEqual({ date: forestEnergyDateStr(), energy: 14, updatedAt: expect.any(Number) });
  });

  it("grant tops up a partly spent store", async () => {
    seedLevel(15);
    seedEnergy(forestEnergyDateStr(), 3);
    await expect(grantForestEnergy(1)).resolves.toEqual({ energy: 4, max: 15 });
    const saved = JSON.parse(store.get(FOREST_ENERGY_KEY)!);
    expect(saved).toEqual({ date: forestEnergyDateStr(), energy: 4, updatedAt: expect.any(Number) });
  });

  it("grant of zero or negative is a no-op", async () => {
    seedLevel(15);
    await expect(grantForestEnergy(0)).resolves.toEqual({ energy: 15, max: 15 });
    await expect(grantForestEnergy(-3)).resolves.toEqual({ energy: 15, max: 15 });
  });
});

describe("no mid-day refill — midnight is the only rekindle (RE-BASED v343)", () => {
  // RE-BASED (v343): the v177 hourly trickle is REMOVED. Hours
  // passing inside a day change nothing; the store rekindles to
  // full when the stored date rolls over, and that is all.
  const HOUR_MS = 3600 * 1000;
  // A fixed local noon so "today" is unambiguous.
  const T0 = new Date(2026, 9, 22, 12, 0, 0, 0).getTime();
  const today = forestEnergyDateStr(new Date(T0));

  it("pure: hours passing inside the day return nothing", () => {
    const stored = { date: today, energy: 3, updatedAt: T0 };
    expect(resolveForestEnergy(stored, 15, today, T0 + 59 * 60 * 1000)).toEqual({ energy: 3, max: 15 });
    expect(resolveForestEnergy(stored, 15, today, T0 + HOUR_MS)).toEqual({ energy: 3, max: 15 });
    expect(resolveForestEnergy(stored, 15, today, T0 + 9 * HOUR_MS)).toEqual({ energy: 3, max: 15 });
    expect(resolveForestEnergy({ date: today, energy: 14, updatedAt: T0 }, 15, today, T0 + 9 * HOUR_MS)).toEqual({
      energy: 14,
      max: 15,
    });
  });

  it("pure: a stale date rekindles to the cap — bonus and anchor ride nowhere", () => {
    expect(
      resolveForestEnergy({ date: "2026-10-21", energy: 3, bonus: 2, updatedAt: T0 - 24 * HOUR_MS }, 15, today, T0)
    ).toEqual({ energy: 15, max: 15 });
  });

  it("load: a mid-day legacy save loads as-is — no windfall", async () => {
    seedLevel(15);
    seedEnergy(forestEnergyDateStr(), 4);
    await expect(loadForestEnergy()).resolves.toEqual({ energy: 4, max: 15 });
    const saved = JSON.parse(store.get(FOREST_ENERGY_KEY)!);
    expect(saved.energy).toBe(4);
    // Reloading straight away changes nothing.
    await expect(loadForestEnergy()).resolves.toEqual({ energy: 4, max: 15 });
  });

  it("load: hours-old anchors settle nothing — the stored count stands", async () => {
    vi.useFakeTimers();
    try {
      const now = new Date(2026, 9, 22, 15, 30, 0, 0).getTime();
      vi.setSystemTime(now);
      seedLevel(15);
      store.set(
        FOREST_ENERGY_KEY,
        JSON.stringify({ date: forestEnergyDateStr(new Date(now)), energy: 2, updatedAt: now - 3 * HOUR_MS - 10 * 60 * 1000 })
      );
      await expect(loadForestEnergy()).resolves.toEqual({ energy: 2, max: 15 });
      // Hours later, same day: still 2.
      vi.setSystemTime(now + 5 * HOUR_MS);
      await expect(loadForestEnergy()).resolves.toEqual({ energy: 2, max: 15 });
    } finally {
      vi.useRealTimers();
    }
  });

  it("load: a spend composes with time passing — spent flames stay spent all day", async () => {
    vi.useFakeTimers();
    try {
      const now = new Date(2026, 9, 22, 9, 0, 0, 0).getTime();
      vi.setSystemTime(now);
      seedLevel(15);
      store.set(
        FOREST_ENERGY_KEY,
        JSON.stringify({ date: forestEnergyDateStr(new Date(now)), energy: 5, updatedAt: now })
      );
      await expect(spendForestEnergy()).resolves.toBe(true);
      await expect(loadForestEnergy()).resolves.toEqual({ energy: 4, max: 15 });
      // Six hours later: still 4 — no trickle arrives to mask the spend.
      vi.setSystemTime(now + 6 * HOUR_MS);
      await expect(loadForestEnergy()).resolves.toEqual({ energy: 4, max: 15 });
    } finally {
      vi.useRealTimers();
    }
  });
});
