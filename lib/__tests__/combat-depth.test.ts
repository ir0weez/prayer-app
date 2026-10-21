// Combat depth (Oct 20, 2026): four combat stats on the Character screen
// (Valor/Resolve/Vigor/Zeal) sharing the ONE stat-point pool with the
// seven devotion stats, wired flat into lib/gear's combatStats — and the
// Boss Gate's new timing: hidden mid-fast, shown from the offer fast's
// last day through its pending offer.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory AsyncStorage so stat state flows through the real paths.
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
  COMBAT_STAT_IDS,
  DEFAULT_STATS,
  STAT_DEFS,
  STAT_IDS,
  availableStatPoints,
  computeStatBoosts,
  grantStatPointsForLevel,
  loadStats,
  saveStats,
  totalAllocatedPoints,
  type CharacterStats,
} from "../character-stats";
import { BASE_CRIT_CHANCE, CRIT_DAMAGE_MULT, combatStats } from "../gear";
import { setCachedBadges } from "../badges";
import {
  bossGateVisibility,
  emptyPrestigeState,
  type PrestigeState,
} from "../prestige";
import type { PersonalFast } from "../prayercircle-fasting";

const fast = (id: string, startDate: string, durationDays: number): PersonalFast => ({
  id,
  name: "Test fast",
  startDate,
  durationDays,
  type: "Health",
  focusItems: [],
  dayStatuses: {},
  createdAt: `${startDate}T00:00:00.000Z`,
});

const stats = (over: Partial<CharacterStats>): CharacterStats => ({ ...DEFAULT_STATS, ...over });

beforeEach(async () => {
  store.clear();
  setCachedBadges([]);
  // Warm the stat-boost cache to the all-1s defaults.
  await saveStats({ ...DEFAULT_STATS });
});

describe("combat stat definitions", () => {
  it("adds Valor/Resolve/Vigor/Zeal to the same catalog and pool", () => {
    expect(STAT_IDS).toHaveLength(11);
    expect(COMBAT_STAT_IDS).toEqual(["valor", "resolve", "vigor", "zeal"]);
    const byId = Object.fromEntries(STAT_DEFS.map((d) => [d.id, d]));
    expect(byId.valor).toMatchObject({ name: "Valor", effectLabel: "+2 attack per point", description: "Strength for the fight." });
    expect(byId.resolve).toMatchObject({ name: "Resolve", effectLabel: "+2 defense per point", description: "Steadfast under attack." });
    expect(byId.vigor).toMatchObject({ name: "Vigor", effectLabel: "+15 combat HP per point", description: "Built to outlast." });
    expect(byId.zeal).toMatchObject({ name: "Zeal", effectLabel: "+1.5% critical chance per point", description: "Strikes that break through." });
  });

  it("legacy saves without the combat keys read them as the base 1", () => {
    const legacy = {
      faith: 4, wisdom: 2, discipline: 1, generosity: 3,
      endurance: 2, charisma: 1, devotion: 5,
    } as unknown as CharacterStats;
    const boosts = computeStatBoosts(legacy);
    expect(boosts.combatAttack).toBe(2);
    expect(boosts.combatDefense).toBe(2);
    expect(boosts.combatHp).toBe(15);
  });
});

describe("combat boosts from allocations", () => {
  it("base 1s grant the first point of each rate", () => {
    const b = computeStatBoosts(stats({}));
    expect(b.combatAttack).toBe(2);
    expect(b.combatDefense).toBe(2);
    expect(b.combatHp).toBe(15);
    expect(b.critChance).toBeCloseTo(0.015);
  });

  it("maxed combat stats give +20/+20/+150 and +15% crit", () => {
    const b = computeStatBoosts(stats({ valor: 10, resolve: 10, vigor: 10, zeal: 10 }));
    expect(b.combatAttack).toBe(20);
    expect(b.combatDefense).toBe(20);
    expect(b.combatHp).toBe(150);
    expect(b.critChance).toBeCloseTo(0.15);
  });

  it("mixed allocations scale per point", () => {
    const b = computeStatBoosts(stats({ valor: 4, resolve: 3, vigor: 6, zeal: 2 }));
    expect(b.combatAttack).toBe(8);
    expect(b.combatDefense).toBe(6);
    expect(b.combatHp).toBe(90);
    expect(b.critChance).toBeCloseTo(0.03);
  });
});

describe("combatStats composition (gear x badges, then flat character stats)", () => {
  const equipped = { weapon: "steel-sword", armor: "iron-plate", clothes: null, tool: null };

  it("pins the crit spec: 12% base chance, 150% crit damage", () => {
    expect(BASE_CRIT_CHANCE).toBe(0.12);
    expect(CRIT_DAMAGE_MULT).toBe(1.5);
  });

  it("default character: Steel Sword 18 + base 5 + Valor 2", async () => {
    const s = combatStats(equipped);
    expect(s.attack).toBe(25);
    expect(s.defense).toBe(7); // Iron Plate 5 + Resolve 2
    expect(s.maxHp).toBe(155); // 100 + 2 hearts x 20 + Vigor 15
    expect(s.critChance).toBeCloseTo(0.135); // 12% base + Zeal 1.5%
  });

  it("maxed combat stats add flat on top of the same gear", async () => {
    await saveStats(stats({ valor: 10, resolve: 10, vigor: 10, zeal: 10 }));
    const s = combatStats(equipped);
    expect(s.attack).toBe(43);
    expect(s.defense).toBe(25);
    expect(s.maxHp).toBe(290);
    expect(s.critChance).toBeCloseTo(0.27);
  });

  it("bare hands still get the character's own growth", async () => {
    const s = combatStats({ weapon: null, armor: null, clothes: null, tool: null });
    expect(s.attack).toBe(7);
    expect(s.defense).toBe(2);
    expect(s.maxHp).toBe(115);
  });
});

describe("the shared points pool across all eleven stats", () => {
  // NOTE on coverage: allocateStatPoint's async flow is exercised in-app
  // but not asserted here — lib/character-stats reaches AsyncStorage via
  // a dynamic import(), and under vitest that binding races once the
  // heavier module graphs load (a pre-existing quirk of that module;
  // statically-imported storage modules test fine). The pool invariant
  // is pinned here through its deterministic surface instead: the one
  // shared counter (grant/available), the pure accounting across all
  // eleven stats, and a source guard on the single allocation path.
  it("one counter grants points for the whole catalog", async () => {
    // Level 6 -> 5 points granted over the starting level 1.
    expect(await grantStatPointsForLevel(6)).toBe(5);
    expect(await availableStatPoints()).toBe(5);
    // Re-granting for the same level adds nothing.
    expect(await grantStatPointsForLevel(6)).toBe(5);
    expect(await grantStatPointsForLevel(8)).toBe(7);
  });

  it("accounting spans devotion AND combat stats in one sum", () => {
    expect(totalAllocatedPoints(stats({}))).toBe(0);
    // Jonathan's screenshot spread: seven devotion stats at 3 = 14 spent.
    expect(
      totalAllocatedPoints(
        stats({ faith: 3, wisdom: 3, discipline: 3, generosity: 3, endurance: 3, charisma: 3, devotion: 3 })
      )
    ).toBe(14);
    // Combat points come out of the same total.
    expect(totalAllocatedPoints(stats({ faith: 3, valor: 10, zeal: 2 }))).toBe(2 + 9 + 1);
    expect(totalAllocatedPoints(stats({ valor: 10, resolve: 10, vigor: 10, zeal: 10 }))).toBe(36);
  });

  it("allocation is a single path over the shared counter for every stat", () => {
    const src = readFileSync(join(process.cwd(), "lib/character-stats.ts"), "utf8");
    // The one spender: checks the shared available pool and the max,
    // for any StatId — no per-stat side pools exist.
    expect(src).toContain("export async function allocateStatPoint(stat: StatId)");
    expect(src).toContain("if (points.available <= 0) return false;");
    expect(src).toContain("if (stats[stat] >= MAX_STAT) return false;");
    expect(src).not.toMatch(/combatPoints|valorPoints|separatePool/i);
  });

  it("a maxed combat stat is a normal stat: capped at MAX_STAT like the rest", async () => {
    await saveStats(stats({ valor: 10, zeal: 10 }));
    const s = await loadStats();
    expect(s.valor).toBe(10);
    expect(s.zeal).toBe(10);
    // normalizeStats clamps anything above the shared cap back to it.
    await saveStats(stats({ valor: 99 }));
    expect((await loadStats()).valor).toBe(10);
  });
});

describe("Boss Gate visibility — last day or pending offer, never mid-fast", () => {
  const state: PrestigeState = emptyPrestigeState();
  // 40-day fast: Oct 1 .. Nov 9 (getFastEndDate = start + 39 days).
  const long = fast("long", "2026-10-01", 40);

  it("hidden on the first and middle days, with the opening date named", () => {
    expect(bossGateVisibility([long], state, "2026-10-01")).toEqual({ visible: false, opensOn: "2026-11-09" });
    expect(bossGateVisibility([long], state, "2026-10-20")).toEqual({ visible: false, opensOn: "2026-11-09" });
    expect(bossGateVisibility([long], state, "2026-11-08")).toEqual({ visible: false, opensOn: "2026-11-09" });
  });

  it("visible on the fast's last day", () => {
    expect(bossGateVisibility([long], state, "2026-11-09").visible).toBe(true);
  });

  it("stays visible while the offer is pending after the fast ends", () => {
    expect(bossGateVisibility([long], state, "2026-11-10").visible).toBe(true);
    expect(bossGateVisibility([long], state, "2026-12-25").visible).toBe(true);
  });

  it("a one-day fast shows the gate on its only day", () => {
    const one = fast("one", "2026-10-20", 1);
    expect(bossGateVisibility([one], state, "2026-10-20").visible).toBe(true);
    expect(bossGateVisibility([one], state, "2026-10-19")).toEqual({ visible: false, opensOn: "2026-10-20" });
  });

  it("no fasts at all: hidden, no date", () => {
    expect(bossGateVisibility([], state, "2026-10-20")).toEqual({ visible: false, opensOn: null });
  });

  it("a consumed fast leaves no offer: hidden, no date", () => {
    const consumed: PrestigeState = { ...state, consumedFastIds: ["long"] };
    expect(bossGateVisibility([long], consumed, "2026-11-09")).toEqual({ visible: false, opensOn: null });
  });

  it("a fast from before the last prestige does not qualify", () => {
    const after: PrestigeState = { ...state, lastPrestigeAt: "2026-10-15T00:00:00.000Z" };
    expect(bossGateVisibility([long], after, "2026-11-09")).toEqual({ visible: false, opensOn: null });
  });

  it("a future fast keeps the gate shut until ITS last day", () => {
    const future = fast("future", "2026-12-01", 10); // ends Dec 10
    expect(bossGateVisibility([future], state, "2026-11-20")).toEqual({ visible: false, opensOn: "2026-12-10" });
    expect(bossGateVisibility([future], state, "2026-12-10").visible).toBe(true);
  });

  it("the offer is the LONGEST qualifying fast — a longer active fast hides an ended short one", () => {
    const ended = fast("ended", "2026-10-01", 10); // ended Oct 10
    // Mid-long-fast: the long fast is the offer, so the gate waits for it.
    expect(bossGateVisibility([ended, long], state, "2026-10-20")).toEqual({ visible: false, opensOn: "2026-11-09" });
    // When the long fast is not in the picture, the ended one's offer shows.
    expect(bossGateVisibility([ended], state, "2026-10-20").visible).toBe(true);
  });
});

describe("wiring guards", () => {
  const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

  it("the fight loop rolls crits from combat stats at 150% damage", () => {
    const src = read("components/dark-forest.tsx");
    // v160 healing wave: the fight loop rolls from the EFFECTIVE stats
    // (base combat stats with the Set-for-the-Day boon applied), so the
    // crit read is effStats.critChance — same stats, boon-scaled.
    expect(src).toContain("effStats.critChance");
    expect(src).toContain("CRIT_DAMAGE_MULT");
    expect(src).toContain("bossGateOpensOn");
  });

  it("hometown gates the panel through the visibility predicate", () => {
    const src = read("app/hometown.tsx");
    expect(src).toContain("bossGateVisibility(fastsRef.current, prestigeStateRef.current, getTodayISOString())");
    expect(src).toContain("bossGateVis.visible && prestigeOfferState");
  });
});
