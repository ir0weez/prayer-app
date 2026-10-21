// Gear tempering (v160 feature wave): weapons + armor temper +1..+5.
// Each level multiplies the item's attack (weapon) or defense (armor)
// by (1 + 0.10 x level), rounded with Math.round. Hearts / XP / coin
// boosts are never tempered, and tempering never touches fasting
// hearts (a separate system — combat hearts via combatStats only).
// Cost: round((item.cost x 0.25 + 40) x (currentLevel + 1)), paid from
// the hometown coin ledger in the gear shop.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory AsyncStorage so temper state flows through the real paths.
const store = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      store.delete(k);
    }),
    clear: vi.fn(async () => {
      store.clear();
    }),
  },
}));

import {
  GEAR_BY_ID,
  GEAR_CATALOG,
  GEAR_TEMPER_KEY,
  MAX_TEMPER,
  TEMPER_STAT_MULT_PER_LEVEL,
  applyTemper,
  clampTemperLevel,
  combatStats,
  getCachedTemper,
  isTemperable,
  loadTemper,
  parseTemper,
  refreshTemperCache,
  saveTemper,
  setCachedTemper,
  temperCost,
  temperLevelFor,
} from "../gear";
import { setCachedBadges } from "../badges";
import { DEFAULT_STATS, saveStats } from "../character-stats";

const steelSword = GEAR_BY_ID["steel-sword"];
const woodenStaff = GEAR_BY_ID["wooden-staff"];
const ironPlate = GEAR_BY_ID["iron-plate"];
const clothGuard = GEAR_BY_ID["cloth-guard"];

beforeEach(async () => {
  store.clear();
  setCachedBadges([]);
  setCachedTemper({});
  // Warm the stat-boost cache to the all-1s defaults (Valor/Resolve/
  // Vigor/Zeal 1 -> +2 attack / +2 defense / +15 HP / +1.5% crit),
  // matching the combat-depth baselines.
  await saveStats({ ...DEFAULT_STATS });
});

describe("temper constants + storage key", () => {
  it("caps temper at +5 with +10% per level", () => {
    expect(MAX_TEMPER).toBe(5);
    expect(TEMPER_STAT_MULT_PER_LEVEL).toBe(0.1);
    expect(GEAR_TEMPER_KEY).toBe("prayercircle.gear.temper.v1");
  });

  it("only weapons and armor are temperable", () => {
    expect(isTemperable(steelSword)).toBe(true);
    expect(isTemperable(ironPlate)).toBe(true);
    expect(isTemperable(GEAR_BY_ID["tunic"])).toBe(false);
    expect(isTemperable(GEAR_BY_ID["copper-pick"])).toBe(false);
  });

  it("clamps levels into 0..5", () => {
    expect(clampTemperLevel(3)).toBe(3);
    expect(clampTemperLevel(99)).toBe(5);
    expect(clampTemperLevel(-2)).toBe(0);
    expect(clampTemperLevel(2.9)).toBe(2);
    expect(clampTemperLevel("3")).toBe(0);
    expect(clampTemperLevel(NaN)).toBe(0);
    expect(temperLevelFor("steel-sword", { "steel-sword": 4 })).toBe(4);
    expect(temperLevelFor("steel-sword", {})).toBe(0);
  });
});

describe("applyTemper math (pure)", () => {
  it("level 0 / missing entry leaves a weapon untouched", () => {
    expect(applyTemper(steelSword.boost, steelSword, {})).toEqual(steelSword.boost);
    expect(applyTemper(steelSword.boost, steelSword, { "steel-sword": 0 })).toEqual(
      steelSword.boost
    );
  });

  it("weapon +1 multiplies attack by 1.1, rounded", () => {
    // Steel Sword 18 x 1.1 = 19.8 -> 20; XP boost untouched.
    const out = applyTemper(steelSword.boost, steelSword, { "steel-sword": 1 });
    expect(out.attack).toBe(20);
    expect(out.xpMult).toBe(steelSword.boost.xpMult);
    // Wooden Staff 8 x 1.1 = 8.8 -> 9.
    expect(applyTemper(woodenStaff.boost, woodenStaff, { "wooden-staff": 1 }).attack).toBe(9);
  });

  it("weapon +5 multiplies attack by 1.5", () => {
    expect(applyTemper(steelSword.boost, steelSword, { "steel-sword": 5 }).attack).toBe(27);
    expect(applyTemper(woodenStaff.boost, woodenStaff, { "wooden-staff": 5 }).attack).toBe(12);
    const seraphim = GEAR_BY_ID["seraphim-edge"];
    expect(applyTemper(seraphim.boost, seraphim, { "seraphim-edge": 5 }).attack).toBe(93);
  });

  it("armor tempers defense, never hearts", () => {
    // Iron Plate 5 x 1.1 = 5.5 -> 6 (Math.round); hearts stay 2.
    const one = applyTemper(ironPlate.boost, ironPlate, { "iron-plate": 1 });
    expect(one.defense).toBe(6);
    expect(one.hearts).toBe(2);
    // +5: 5 x 1.5 = 7.5 -> 8.
    const five = applyTemper(ironPlate.boost, ironPlate, { "iron-plate": 5 });
    expect(five.defense).toBe(8);
    expect(five.hearts).toBe(2);
    // Small values round sensibly: Cloth Guard 2 x 1.1 = 2.2 -> 2; +5 -> 3.
    expect(applyTemper(clothGuard.boost, clothGuard, { "cloth-guard": 1 }).defense).toBe(2);
    expect(applyTemper(clothGuard.boost, clothGuard, { "cloth-guard": 5 }).defense).toBe(3);
  });

  it("weapon temper never touches defense/hearts slots and armor never touches attack", () => {
    const w = applyTemper(steelSword.boost, steelSword, { "steel-sword": 5 });
    expect(w.defense).toBeUndefined();
    const a = applyTemper(ironPlate.boost, ironPlate, { "iron-plate": 5 });
    expect(a.attack).toBeUndefined();
  });

  it("non-gear types are unaffected even when the map names them", () => {
    const tunic = GEAR_BY_ID["tunic"];
    expect(applyTemper(tunic.boost, tunic, { tunic: 5 })).toEqual(tunic.boost);
    const robe = GEAR_BY_ID["shepherds-robe"];
    expect(applyTemper(robe.boost, robe, { "shepherds-robe": 5 })).toEqual(robe.boost);
    const pick = GEAR_BY_ID["copper-pick"];
    expect(applyTemper(pick.boost, pick, { "copper-pick": 5 })).toEqual(pick.boost);
  });

  it("returns a new object and never mutates the catalog boost", () => {
    const before = { ...steelSword.boost };
    const out = applyTemper(steelSword.boost, steelSword, { "steel-sword": 3 });
    expect(out).not.toBe(steelSword.boost);
    expect(steelSword.boost).toEqual(before);
    // 18 x 1.3 = 23.4 -> 23.
    expect(out.attack).toBe(23);
  });

  it("out-of-range stored levels behave as the clamped level", () => {
    expect(applyTemper(steelSword.boost, steelSword, { "steel-sword": 99 }).attack).toBe(27);
  });
});

describe("temperCost", () => {
  it("follows round((cost x 0.25 + 40) x (level + 1))", () => {
    // Steel Sword (120): base 70 -> 70 / 140 / 210 / 280 / 350.
    expect(temperCost(steelSword, 0)).toBe(70);
    expect(temperCost(steelSword, 1)).toBe(140);
    expect(temperCost(steelSword, 4)).toBe(350);
    // Wooden Staff (25): base 46.25 -> 46 at level 0.
    expect(temperCost(woodenStaff, 0)).toBe(46);
    // Seraphim Edge (1400): base 390 at level 0.
    expect(temperCost(GEAR_BY_ID["seraphim-edge"], 0)).toBe(390);
  });

  it("is strictly monotonic in level for temperable items", () => {
    for (const id of ["wooden-staff", "steel-sword", "cloth-guard", "mithril-plate", "ember-spear"]) {
      const item = GEAR_BY_ID[id];
      const costs = [0, 1, 2, 3, 4].map((lv) => temperCost(item, lv));
      for (let i = 1; i < costs.length; i++) {
        expect(costs[i], `${id} L${i}`).toBeGreaterThan(costs[i - 1]);
      }
    }
  });

  it("is 0 at max temper and for non-temperable items", () => {
    expect(temperCost(steelSword, MAX_TEMPER)).toBe(0);
    expect(temperCost(steelSword, 99)).toBe(0);
    expect(temperCost(GEAR_BY_ID["tunic"], 0)).toBe(0);
    expect(temperCost(GEAR_BY_ID["copper-pick"], 0)).toBe(0);
  });
});

describe("temper storage (parse guards + round-trip + cache)", () => {
  it("parseTemper drops junk, unknown ids, clothes/tools and level 0", () => {
    expect(
      parseTemper({
        "steel-sword": 3,
        "iron-plate": 99, // clamps to 5
        tunic: 4, // clothes: not temperable
        "copper-pick": 2, // tool: not temperable
        "no-such-item": 5,
        "wooden-staff": 0, // untempered: not stored
        "bronze-mace": 2.9, // floors to 2
        "ember-spear": "3", // non-number: dropped
      })
    ).toEqual({ "steel-sword": 3, "iron-plate": 5, "bronze-mace": 2 });
    expect(parseTemper(null)).toEqual({});
    expect(parseTemper("tempered")).toEqual({});
    expect(parseTemper([1, 2])).toEqual({});
  });

  it("saveTemper -> loadTemper round-trips through AsyncStorage and warms the cache", async () => {
    await saveTemper({ "steel-sword": 2, "starsteel-plate": 5 });
    expect(store.get(GEAR_TEMPER_KEY)).toBeTruthy();
    expect(await loadTemper()).toEqual({ "steel-sword": 2, "starsteel-plate": 5 });
    expect(getCachedTemper()).toEqual({ "steel-sword": 2, "starsteel-plate": 5 });
  });

  it("refreshTemperCache reloads the cache from storage", async () => {
    store.set(GEAR_TEMPER_KEY, JSON.stringify({ "iron-plate": 4 }));
    setCachedTemper({});
    expect(getCachedTemper()).toEqual({});
    expect(await refreshTemperCache()).toEqual({ "iron-plate": 4 });
    expect(getCachedTemper()).toEqual({ "iron-plate": 4 });
  });

  it("setCachedTemper sanitizes like storage", () => {
    setCachedTemper({ "steel-sword": 7, tunic: 3 } as Record<string, number>);
    expect(getCachedTemper()).toEqual({ "steel-sword": 5 });
  });

  it("corrupt storage reads as untempered", async () => {
    store.set(GEAR_TEMPER_KEY, "{not json");
    expect(await loadTemper()).toEqual({});
  });
});

describe("combatStats includes temper via the sync cache", () => {
  const equipped = { weapon: "steel-sword", armor: "iron-plate", clothes: null, tool: null };

  it("baseline (no temper) matches the known composition", () => {
    const s = combatStats(equipped);
    expect(s.attack).toBe(25); // 5 + 18 + Valor 2
    expect(s.defense).toBe(7); // 5 + Resolve 2
    expect(s.maxHp).toBe(155); // 100 + 2 hearts x 20 + Vigor 15
  });

  it("tempered weapon raises attack only", () => {
    setCachedTemper({ "steel-sword": 1 });
    const s = combatStats(equipped);
    expect(s.attack).toBe(27); // 5 + round(18 x 1.1)=20 + 2
    expect(s.defense).toBe(7);
    setCachedTemper({ "steel-sword": 5 });
    expect(combatStats(equipped).attack).toBe(34); // 5 + 27 + 2
  });

  it("tempered armor raises defense only — max HP (hearts) is untempered", () => {
    setCachedTemper({ "iron-plate": 5 });
    const s = combatStats(equipped);
    expect(s.defense).toBe(10); // round(5 x 1.5)=8 + Resolve 2
    expect(s.maxHp).toBe(155); // hearts are never tempered
    expect(s.attack).toBe(25);
  });

  it("temper composes under badge multipliers (badges empower tempered gear)", () => {
    setCachedBadges(["ember", "frost"]);
    setCachedTemper({ "steel-sword": 5, "iron-plate": 5 });
    const s = combatStats(equipped);
    // attack: 5 + round(27 x 1.15) = 5 + 31 = 36, + Valor 2 = 38.
    expect(s.attack).toBe(38);
    // defense: round(8 x 1.15) = 9, + Resolve 2 = 11.
    expect(s.defense).toBe(11);
  });

  it("combatStats source is wired to the temper cache", () => {
    const src = readFileSync(join(process.cwd(), "lib/gear.ts"), "utf8");
    expect(src).toContain("applyTemper(weapon.boost, weapon, cachedTemper)");
    expect(src).toContain("applyTemper(armor.boost, armor, cachedTemper)");
    expect(src).toContain("export async function refreshTemperCache()");
  });
});

describe("catalog additions (v160 wave)", () => {
  it("every catalog id is unique (global pin)", () => {
    const ids = GEAR_CATALOG.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("adds two weapons + two armor in line with their neighbours", () => {
    const bronze = GEAR_BY_ID["bronze-mace"];
    expect(bronze).toMatchObject({ name: "Bronze Mace", type: "weapon", cost: 65, minShopLevel: 1 });
    expect(bronze.boost.attack).toBe(12);
    expect(bronze.boost.attack!).toBeGreaterThan(woodenStaff.boost.attack!);
    expect(bronze.boost.attack!).toBeLessThan(steelSword.boost.attack!);

    const ember = GEAR_BY_ID["ember-spear"];
    expect(ember).toMatchObject({ name: "Ember Spear", type: "weapon", cost: 950, minShopLevel: 3, unlockDays: 200 });
    expect(ember.boost.attack).toBe(54);
    expect(ember.boost.attack!).toBeGreaterThan(GEAR_BY_ID["runeblade"].boost.attack!);
    expect(ember.boost.attack!).toBeLessThan(GEAR_BY_ID["seraphim-edge"].boost.attack!);

    const leather = GEAR_BY_ID["leather-brigandine"];
    expect(leather).toMatchObject({ name: "Leather Brigandine", type: "armor", cost: 75, minShopLevel: 1 });
    expect(leather.boost).toEqual({ hearts: 1, defense: 3 });
    expect(leather.boost.defense!).toBeGreaterThan(clothGuard.boost.defense!);
    expect(leather.boost.defense!).toBeLessThan(ironPlate.boost.defense!);

    const starsteel = GEAR_BY_ID["starsteel-plate"];
    expect(starsteel).toMatchObject({ name: "Starsteel Plate", type: "armor", cost: 1050, minShopLevel: 3, unlockDays: 250 });
    expect(starsteel.boost).toEqual({ hearts: 5, defense: 17 });
    expect(starsteel.boost.defense!).toBeGreaterThan(GEAR_BY_ID["mithril-plate"].boost.defense!);
    expect(starsteel.boost.defense!).toBeLessThan(GEAR_BY_ID["celestial-bulwark"].boost.defense!);
  });

  it("the new set includes a high-end (shop Lv 3) piece", () => {
    const fresh = ["bronze-mace", "ember-spear", "leather-brigandine", "starsteel-plate"].map(
      (id) => GEAR_BY_ID[id]
    );
    expect(fresh.some((g) => g.minShopLevel === 3 || (g.unlockPrestige || 0) > 0)).toBe(true);
  });

  const NEW_CLOTHES = [
    "gardeners-apron",
    "smiths-workshirt",
    "sunday-best",
    "celebration-vest",
    "harvest-flannel",
    "winter-wrap",
  ] as const;

  it("adds the six named clothes with the expected categories", () => {
    expect(GEAR_BY_ID["gardeners-apron"].name).toBe("Gardener's Apron");
    expect(GEAR_BY_ID["smiths-workshirt"].name).toBe("Smith's Workshirt");
    expect(GEAR_BY_ID["sunday-best"].name).toBe("Sunday Best");
    expect(GEAR_BY_ID["celebration-vest"].name).toBe("Celebration Vest");
    expect(GEAR_BY_ID["harvest-flannel"].name).toBe("Harvest Flannel");
    expect(GEAR_BY_ID["winter-wrap"].name).toBe("Winter Wrap");
    for (const id of NEW_CLOTHES) {
      expect(GEAR_BY_ID[id].type, id).toBe("clothes");
    }
  });

  it("new clothes each wear a distinct visual (unique color and color+pattern combo)", () => {
    const colors = NEW_CLOTHES.map((id) => GEAR_BY_ID[id].visual.bodyColor);
    expect(colors.every((c) => typeof c === "string" && c.length > 0)).toBe(true);
    expect(new Set(colors).size).toBe(NEW_CLOTHES.length);
    const combos = NEW_CLOTHES.map(
      (id) => `${GEAR_BY_ID[id].visual.bodyColor}|${GEAR_BY_ID[id].visual.pattern || ""}`
    );
    expect(new Set(combos).size).toBe(NEW_CLOTHES.length);
    const validPatterns = ["stripes", "dots", "belt", "collar"];
    for (const id of NEW_CLOTHES) {
      expect(validPatterns, id).toContain(GEAR_BY_ID[id].visual.pattern);
    }
    // Distinct from every pre-existing clothes color too, so the paper
    // hero visibly wears something new.
    const fresh = new Set(colors);
    for (const g of GEAR_CATALOG) {
      if (g.type !== "clothes" || (NEW_CLOTHES as readonly string[]).includes(g.id)) continue;
      expect(fresh.has(g.visual.bodyColor), `${g.id} color clash`).toBe(false);
    }
  });

  it("new clothes boosts stay modest xp/coin flavour (no hearts)", () => {
    for (const id of NEW_CLOTHES) {
      const b = GEAR_BY_ID[id].boost;
      expect(b.hearts || 0, id).toBe(0);
      expect(b.attack || 0, id).toBe(0);
      expect(b.defense || 0, id).toBe(0);
      expect(Math.abs(b.xpMult || 0), id).toBeLessThanOrEqual(0.1);
      expect(Math.abs(b.coinMult || 0), id).toBeLessThanOrEqual(0.1);
    }
  });

  it("new clothes mix plain buys, level gates and shop levels", () => {
    const items = NEW_CLOTHES.map((id) => GEAR_BY_ID[id]);
    expect(items.some((g) => !g.unlockLevel && !g.unlockDays)).toBe(true); // plain coin buy
    expect(items.some((g) => (g.unlockLevel || 0) > 0)).toBe(true); // level-gated
    expect(new Set(items.map((g) => g.minShopLevel)).size).toBeGreaterThanOrEqual(3);
  });
});

describe("gear shop temper UI wiring", () => {
  const src = readFileSync(join(process.cwd(), "app/gear-shop.tsx"), "utf8");

  it("shop pays temper from the hometown coin ledger and persists temper", () => {
    expect(src).toContain("temperCost");
    expect(src).toContain("saveTemper");
    expect(src).toContain("refreshTemperCache");
    expect(src).toContain("COINS_STORAGE_KEY");
    expect(src).toContain("Fully tempered");
    expect(src).toContain("formatCoins(temperCostNext)");
  });
});
