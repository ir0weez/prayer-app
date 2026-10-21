// Restaurant theming overhaul: pizza party features, Token Toss, retro
// taco / red-white burger / warm diner themes, and the diner coffee
// counter. Pure logic is exercised directly; the rest is source-guarded
// so the wiring (shared mini-game host, grant path) can't quietly drift.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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
  PIZZA_FEATURES,
  arcadeCabinetsForTier,
  loadPizzaFeatures,
  parsePizzaFeatures,
  pizzaFeaturesBonusPct,
  savePizzaFeatures,
} from "../pizza-features";
import {
  COFFEE_MAX_PER_DAY,
  coffeesLeftToday,
  recordCoffeePurchase,
  resolveCoffeeCount,
} from "../diner-coffee";
import { forestEnergyDateStr } from "../forest-energy";
import { tokenScoreForPower, tokenTossReward } from "../mini-games";

function readSrc(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

beforeEach(() => {
  store.clear();
});

describe("pizza party features", () => {
  it("three features, three tiers each, in the furniture cost band", () => {
    expect(PIZZA_FEATURES.map((f) => f.id)).toEqual(["stage", "arcade", "prize"]);
    for (const f of PIZZA_FEATURES) {
      expect(f.tierNames).toHaveLength(3);
      expect(f.costs).toHaveLength(3);
      expect(f.bonusPct).toHaveLength(3);
      expect(f.costs[0]).toBeGreaterThanOrEqual(100);
      expect(f.costs[2]).toBeLessThanOrEqual(1500);
    }
  });

  it("arcade cabinets: 0 → 2 → 4 → 6 by tier", () => {
    expect(arcadeCabinetsForTier(0)).toBe(0);
    expect(arcadeCabinetsForTier(1)).toBe(2);
    expect(arcadeCabinetsForTier(2)).toBe(4);
    expect(arcadeCabinetsForTier(3)).toBe(6);
    expect(arcadeCabinetsForTier(9)).toBe(6);
  });

  it("parse clamps tiers and drops unknown features", () => {
    const s = parsePizzaFeatures({ features: { stage: 9, arcade: 2, bogus: 3 } });
    expect(s.features.stage).toBe(3);
    expect(s.features.arcade).toBe(2);
    expect("bogus" in s.features).toBe(false);
    expect(parsePizzaFeatures(null)).toEqual({ features: {} });
    expect(parsePizzaFeatures("junk")).toEqual({ features: {} });
  });

  it("bonus pct sums owned tiers only", () => {
    expect(pizzaFeaturesBonusPct({ features: {} })).toBe(0);
    expect(pizzaFeaturesBonusPct({ features: { stage: 1 } })).toBe(4);
    expect(pizzaFeaturesBonusPct({ features: { stage: 3, arcade: 3, prize: 3 } })).toBe(30);
  });

  it("state round-trips through storage per building", async () => {
    await savePizzaFeatures("b1", { features: { stage: 2, prize: 1 } });
    await expect(loadPizzaFeatures("b1")).resolves.toEqual({ features: { stage: 2, prize: 1 } });
    await expect(loadPizzaFeatures("other")).resolves.toEqual({ features: {} });
  });

  it("the features ride the restaurant income hook", () => {
    const src = readSrc("lib/restaurant-interior.ts");
    expect(src).toContain("pizzaFeaturesBonusPct(await loadPizzaFeatures(buildingId))");
  });
});

describe("Token Toss scoring", () => {
  it("dead center is the bullseye; the rings fall off with distance", () => {
    expect(tokenScoreForPower(0.5)).toBe(50);
    expect(tokenScoreForPower(0.55)).toBe(50);
    expect(tokenScoreForPower(0.6)).toBe(25);
    expect(tokenScoreForPower(0.4)).toBe(25);
    expect(tokenScoreForPower(0.75)).toBe(10);
    expect(tokenScoreForPower(0.25)).toBe(10);
    expect(tokenScoreForPower(0.9)).toBe(0);
    expect(tokenScoreForPower(0.05)).toBe(0);
  });

  it("payout is XP-weighted with small coins, capped", () => {
    expect(tokenTossReward(250)).toEqual({ coins: 15, xp: 40 });
    expect(tokenTossReward(100)).toEqual({ coins: 8, xp: 32 });
    expect(tokenTossReward(0)).toEqual({ coins: 0, xp: 0 });
  });

  it("the pizza interior hosts it via the shared host hook, gated on the arcade row", () => {
    const src = readSrc("app/restaurant-interior.tsx");
    expect(src).toContain('useMiniGameHost("arcade"');
    expect(src).toContain("TokenTossGame");
    expect(src).toContain("arcadeTier >= 1");
  });
});

describe("diner coffee counter", () => {
  it("resolve: stale dates and junk read as zero, counts clamp to the daily max", () => {
    const today = forestEnergyDateStr();
    expect(resolveCoffeeCount({ date: today, count: 2 }, today)).toBe(2);
    expect(resolveCoffeeCount({ date: today, count: 99 }, today)).toBe(COFFEE_MAX_PER_DAY);
    expect(resolveCoffeeCount({ date: "2000-01-01", count: 3 }, today)).toBe(0);
    expect(resolveCoffeeCount(null, today)).toBe(0);
  });

  it("three cups a day, then the pot is empty", async () => {
    await expect(coffeesLeftToday()).resolves.toBe(3);
    await expect(recordCoffeePurchase()).resolves.toBe(2);
    await expect(recordCoffeePurchase()).resolves.toBe(1);
    await expect(recordCoffeePurchase()).resolves.toBe(0);
    await expect(recordCoffeePurchase()).resolves.toBe(-1);
    await expect(coffeesLeftToday()).resolves.toBe(0);
  });

  it("the diner screen sells coffee through the grant path", () => {
    const src = readSrc("app/restaurant-interior.tsx");
    expect(src).toContain("recordCoffeePurchase()");
    expect(src).toContain("grantCoffeeEnergy()");
    expect(src).toContain("DinerCoffeeStation");
  });
});

describe("theme palettes", () => {
  it("burger is cold red-and-white, taco is retro pink/purple, diner is warm orange", () => {
    // Palettes live in the component file (not importable under vitest),
    // so the signature colors are pinned at the source.
    const themes = readSrc("components/cuisine-themes.tsx");
    const block = (id: string) => {
      const quoted = themes.indexOf(`"${id}": {`);
      const a = quoted >= 0 ? quoted : themes.indexOf(`\n  ${id}: {`);
      expect(a).toBeGreaterThan(-1);
      return themes.slice(a, a + 420);
    };
    expect(block("burger-joint")).toContain('accent: "#D22630"');
    expect(block("burger-joint")).toContain('wall: "#FFFFFF"');
    expect(block("taco-stand")).toContain('accent: "#FF7BAC"');
    expect(block("taco-stand")).toContain('wall: "#3A2260"');
    expect(block("diner")).toContain('accent: "#F39C2C"');
    expect(block("pizza-place")).toContain('wall: "#3A2150"');
  });

  it("the signature pieces exist: crossed-palm counter, retro cantina, party stage", () => {
    const themes = readSrc("components/cuisine-themes.tsx");
    expect(themes).toContain("BurgerCounter");
    expect(themes).toContain("RetroCantina");
    expect(themes).toContain("DinerCoffeeStation");
    const party = readSrc("components/pizza-party.tsx");
    expect(party).toContain("AnimatronicStage");
    expect(party).toContain("ArcadeCabinetRow");
    expect(party).toContain("PrizeCounter");
  });

  it("no trademarked logos in the theme code", () => {
    const themes = readSrc("components/cuisine-themes.tsx").toLowerCase();
    for (const brand of ["chuck e", "in-n-out", "in n out", "taco bell", "denny", "fnaf", "five nights"]) {
      expect(themes).not.toContain(brand);
    }
  });
});
