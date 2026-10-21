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
    expect(saved).toEqual({ date: forestEnergyDateStr(), energy: 14 });
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

describe("granting bonus energy (diner coffee)", () => {
  it("pure: resolve adds a same-day bonus on top of the clamped base", () => {
    const today = forestEnergyDateStr();
    expect(resolveForestEnergy({ date: today, energy: 15, bonus: 2 }, 15, today)).toEqual({ energy: 17, max: 15 });
    expect(resolveForestEnergy({ date: today, energy: 99, bonus: 1 }, 15, today)).toEqual({ energy: 16, max: 15 });
    expect(resolveForestEnergy({ date: today, energy: 3, bonus: 0 }, 15, today)).toEqual({ energy: 3, max: 15 });
  });

  it("a stale-date bonus dies at midnight with the rest of the store", () => {
    const today = forestEnergyDateStr();
    expect(resolveForestEnergy({ date: dateStrDaysAgo(1), energy: 15, bonus: 3 }, 15, today)).toEqual({ energy: 15, max: 15 });
  });

  it("grant pushes past the cap, persists as base + bonus, and reloads whole", async () => {
    seedLevel(15);
    await expect(grantForestEnergy(1)).resolves.toEqual({ energy: 16, max: 15 });
    expect(getCachedForestEnergy()).toEqual({ energy: 16, max: 15 });
    const saved = JSON.parse(store.get(FOREST_ENERGY_KEY)!);
    expect(saved).toEqual({ date: forestEnergyDateStr(), energy: 15, bonus: 1 });
    await expect(loadForestEnergy()).resolves.toEqual({ energy: 16, max: 15 });
  });

  it("bonus energy is spent like normal energy, bonus first in effect", async () => {
    seedLevel(15);
    await grantForestEnergy(2); // 17 total: 15 base + 2 bonus
    await expect(spendForestEnergy()).resolves.toBe(true);
    await expect(loadForestEnergy()).resolves.toEqual({ energy: 16, max: 15 });
    const saved = JSON.parse(store.get(FOREST_ENERGY_KEY)!);
    expect(saved).toEqual({ date: forestEnergyDateStr(), energy: 15, bonus: 1 });
  });

  it("grant tops up a partly spent store", async () => {
    seedLevel(15);
    seedEnergy(forestEnergyDateStr(), 3);
    await expect(grantForestEnergy(1)).resolves.toEqual({ energy: 4, max: 15 });
    const saved = JSON.parse(store.get(FOREST_ENERGY_KEY)!);
    expect(saved).toEqual({ date: forestEnergyDateStr(), energy: 4 });
  });

  it("grant of zero or negative is a no-op", async () => {
    seedLevel(15);
    await expect(grantForestEnergy(0)).resolves.toEqual({ energy: 15, max: 15 });
    await expect(grantForestEnergy(-3)).resolves.toEqual({ energy: 15, max: 15 });
  });
});
