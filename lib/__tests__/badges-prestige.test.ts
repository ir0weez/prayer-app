import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory AsyncStorage so prestige state flows through the real
// load/save paths.
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
  BADGES, BADGE_BY_ID, bossForBadge, bossGateFor, nextBoss, sanitizeBadgeIds,
  badgeGearMultipliers, setCachedBadges,
} from "../badges";
import {
  cityExists, emptyPrestigeState, loadPrestigeState, parsePrestigeState,
  performPrestige, prestigeOffer, recordBossVictory, offerBossCleared,
} from "../prestige";
import { GEAR_BY_ID, combatStats } from "../gear";
import { FOREST_ZONES, ALL_DEMON_NAMES } from "../dark-forest";
import type { PersonalFast } from "../prayercircle-fasting";

const fast = (id: string, durationDays: number): PersonalFast => ({
  id,
  name: "Test fast",
  startDate: "2026-01-01",
  durationDays,
  type: "Health",
  focusItems: [],
  dayStatuses: {},
  createdAt: "2026-01-01T00:00:00.000Z",
});

beforeEach(() => {
  store.clear();
  setCachedBadges([]);
});

describe("badge catalog", () => {
  it("has ten badges, one per boss, in zone order 0-9", () => {
    expect(BADGES).toHaveLength(10);
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(10);
    BADGES.forEach((b, i) => expect(b.zoneIndex).toBe(i));
    expect(BADGE_BY_ID.throne.bossName).toBe("The Throne Usurper");
    expect(BADGE_BY_ID.gloaming.bossName).toBe("Thicketmaw");
  });

  it("sanitizes junk badge lists", () => {
    expect(sanitizeBadgeIds(["ember", "nope", 42, "mist", "ember"])).toEqual(["mist", "ember"]);
    expect(sanitizeBadgeIds(null)).toEqual([]);
    expect(sanitizeBadgeIds("throne")).toEqual([]);
  });
});

describe("boss ladder", () => {
  it("walks the ladder by badges owned", () => {
    expect(nextBoss([], 0).badge.id).toBe("gloaming");
    expect(nextBoss(["gloaming", "mist", "ember"], 0).badge.id).toBe("frost");
    const all = BADGES.map((b) => b.id);
    const again = nextBoss(all, 3);
    expect(again.badge.id).toBe("throne");
    expect(again.deepened).toBe(3);
  });

  it("uses the tuned stat formula", () => {
    const b1 = bossForBadge(BADGES[0], 0, 0);
    expect(b1.hp).toBe(2300);
    expect(b1.attack).toBe(30);
    const b10 = bossForBadge(BADGES[9], 9, 0);
    expect(b10.hp).toBe(Math.round(2300 * Math.pow(1.38, 9)));
    expect(b10.attack).toBe(Math.round(30 * Math.pow(1.35, 9)));
    const deep = bossForBadge(BADGES[9], 9, 2);
    expect(deep.hp).toBeGreaterThan(b10.hp);
    expect(deep.displayName).toContain("Deepened ×2");
  });

  it("is tuned so current-tier gear + badges wins with effort (~15-45 strikes)", () => {
    // Boss i is faced while wearing tier-i gear (Crown i) with the badges
    // earned so far — the fight should take real effort, not a wall.
    const badgeIds = BADGES.map((b) => b.id);
    for (let i = 0; i < 10; i++) {
      setCachedBadges(badgeIds.slice(0, i));
      const tier = i + 1;
      const weapon = Object.values(GEAR_BY_ID).find((g) => g.type === "weapon" && g.unlockPrestige === tier)!;
      const armor = Object.values(GEAR_BY_ID).find((g) => g.type === "armor" && g.unlockPrestige === tier)!;
      const stats = combatStats({ weapon: weapon.id, armor: armor.id, clothes: null, tool: null });
      const boss = bossGateFor(badgeIds.slice(0, i), 0);
      const strikes = boss.hp / (stats.attack * 0.95); // ~expected strike damage
      expect(strikes, `boss ${i + 1} strikes`).toBeGreaterThan(12);
      expect(strikes, `boss ${i + 1} strikes`).toBeLessThan(48);
      // Survivable: boss damage per hit after defense must not two-shot.
      const perHit = Math.max(1, boss.attack - stats.defense);
      expect(perHit * 4, `boss ${i + 1} hits-to-kill`).toBeLessThan(stats.maxHp);
    }
  });
});

describe("gear tiers 4-10", () => {
  it("extends the Crown ladder to tier 10 at 3x price steps", () => {
    const expected: Record<number, { w: string; a: string; price: number }> = {
      4: { w: "powers-blade", a: "powers-aegis", price: 1_500_000 },
      5: { w: "virtues-blade", a: "virtues-aegis", price: 4_500_000 },
      6: { w: "dominions-blade", a: "dominions-aegis", price: 13_500_000 },
      7: { w: "thrones-blade", a: "thrones-aegis", price: 40_500_000 },
      8: { w: "cherubim-blade", a: "cherubim-aegis", price: 121_500_000 },
      9: { w: "seraphim-blade", a: "seraphim-aegis", price: 364_500_000 },
      10: { w: "dragonbone-blade", a: "dragonbone-plate", price: 1_093_500_000 },
    };
    let prevAtk = GEAR_BY_ID["heavenly-blade"].boost.attack!;
    for (let tier = 4; tier <= 10; tier++) {
      const e = expected[tier];
      const w = GEAR_BY_ID[e.w];
      const a = GEAR_BY_ID[e.a];
      expect(w, e.w).toBeTruthy();
      expect(a, e.a).toBeTruthy();
      expect(w.unlockPrestige).toBe(tier);
      expect(a.unlockPrestige).toBe(tier);
      expect(w.cost).toBe(e.price);
      expect(a.cost).toBe(e.price);
      const ratio = w.boost.attack! / prevAtk;
      expect(ratio).toBeGreaterThan(1.3);
      expect(ratio).toBeLessThan(1.42);
      prevAtk = w.boost.attack!;
    }
    expect(GEAR_BY_ID["dragonbone-blade"].name).toBe("Dragonbone Blade");
    expect(GEAR_BY_ID["dragonbone-plate"].name).toBe("Dragonbone Plate");
  });

  it("badge multipliers empower combat stats", () => {
    const equipped = { weapon: "heavenly-blade", armor: "heavenly-aegis", clothes: null, tool: null };
    const bare = combatStats(equipped);
    setCachedBadges(["gloaming", "ember", "frost", "fen", "throne"]);
    const blessed = combatStats(equipped);
    expect(blessed.attack).toBeGreaterThan(bare.attack);
    expect(blessed.defense).toBeGreaterThan(bare.defense);
    expect(blessed.maxHp).toBeGreaterThan(bare.maxHp);
    const mults = badgeGearMultipliers(["gloaming", "throne"]);
    expect(mults.all).toBeCloseTo(1.1 * 1.25);
  });
});

describe("city existence (no grandfathering)", () => {
  it("exists only at prestige >= 1", () => {
    expect(cityExists(0)).toBe(false);
    expect(cityExists(1)).toBe(true);
    expect(cityExists(7)).toBe(true);
  });
});

describe("prestige state + boss gate", () => {
  it("round-trips the badge fields and defaults them for old saves", () => {
    const parsed = parsePrestigeState({ badges: ["mist", "bogus"], bossClearedFastId: "f9", throneVictories: 2 });
    expect(parsed.badges).toEqual(["mist"]);
    expect(parsed.bossClearedFastId).toBe("f9");
    expect(parsed.throneVictories).toBe(2);
    const legacy = parsePrestigeState({ devotionBonus: 0.05 });
    expect(legacy.badges).toEqual([]);
    expect(legacy.bossClearedFastId).toBeNull();
    expect(legacy.throneVictories).toBe(0);
    expect(emptyPrestigeState().badges).toEqual([]);
  });

  it("performPrestige refuses while the Boss Gate is shut", async () => {
    const fasts = [fast("f1", 40)];
    expect(await performPrestige(fasts)).toBeNull();
  });

  it("a boss victory earns the badge, clears the gate, and prestige keeps badges", async () => {
    const fasts = [fast("f1", 40)];
    const after = await recordBossVictory(fasts, "gloaming");
    expect(after.badges).toEqual(["gloaming"]);
    expect(after.bossClearedFastId).toBe("f1");
    expect(offerBossCleared(after, prestigeOffer(fasts, after))).toBe(true);

    const res = await performPrestige(fasts);
    expect(res).not.toBeNull();
    expect(res!.devotionBonus).toBeCloseTo(0.25);

    const state = await loadPrestigeState();
    expect(state.badges).toEqual(["gloaming"]); // badges are NEVER reset
    expect(state.bossClearedFastId).toBeNull(); // the gate re-shuts
    expect(state.totalPrestiges).toBe(1);
  });

  it("re-beating the Throne Usurper deepens him and keeps counting", async () => {
    const fasts = [fast("f1", 365)];
    await recordBossVictory(fasts, "throne");
    const again = await recordBossVictory(fasts, "throne");
    expect(again.badges).toEqual(["throne"]);
    expect(again.throneVictories).toBe(2);
    const gate = bossGateFor(again.badges, again.throneVictories);
    // Only one badge owned -> next boss is still boss 2 by ladder order.
    expect(gate.badgeId).toBe("mist");
  });
});

describe("forest zones 11-15", () => {
  it("has fifteen zones with demon pools", () => {
    expect(FOREST_ZONES).toHaveLength(15);
    const names = FOREST_ZONES.slice(10).map((z) => z.name);
    expect(names).toEqual([
      "The Howling Barrens",
      "The Starless Deep",
      "The Thornwild",
      "The Hollow Mountain",
      "The Dragon's Graveyard",
    ]);
    for (const z of FOREST_ZONES.slice(10)) {
      expect(z.demons.lesser.length).toBeGreaterThanOrEqual(5);
      expect(z.demons.greater.length).toBeGreaterThanOrEqual(4);
      expect(z.demons.nightmare.length).toBeGreaterThanOrEqual(3);
    }
    expect(FOREST_ZONES[11].moonKind).toBe("none"); // the Starless Deep has no moon
    expect(ALL_DEMON_NAMES.length).toBeGreaterThan(100);
  });
});
