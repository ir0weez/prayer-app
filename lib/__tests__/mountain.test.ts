// The Mountain and its mine (v168; naming corrected v169;
// the Deep Descent v175).
//
// Jonathan's pitch (2026-10-21): a mountain at the top of the town
// that says "safety", a cave you can mine for iron, gold and diamonds,
// tools you upgrade to reach the expensive stuff, the top of the
// ladder behind prestiging. v175 (his design, 2026-10-22) descends:
// eight strata of ten levels each, flames for every block broken,
// ore priced by the depth it broke at, and a Depth Blessing on the
// whole town's income.
//
// These tests pin the mine's rules (lib/mountain):
//  - the 80 levels: strata, level math, faces per level;
//  - settle math: mined-out faces return after their stratum's
//    regrow hours (2h at Stone scaling to 6h in the Deep), computed
//    from timestamps (NO background timers);
//  - the descent: two distinct faces broken on the deepest level
//    opens the next; opened levels persist;
//  - flames: the breaking swing — and only the breaking swing — is
//    refused at zero flames, the face's cracks kept;
//  - tier gating and the longer pick ladder (Copper/Silver rungs;
//    Diamond behind prestige, Crown Pick behind a Crown);
//  - ore value: stratum entry prices rising ~9% per level down;
//  - the Depth Blessing math (+0.25%/level, capped +20%);
//  - legacy migration: a v168–v174 record walks in whole;
//  - storage round-trip, and the prestige reset (gear precedent).

import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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
  FACE_COUNT,
  MAX_LEVEL,
  MINE_KEY,
  MINE_STRATA,
  ORE_PRICES,
  PICKAXES,
  brokenSlotCount,
  clampLevel,
  defaultMineState,
  depthBlessingBonus,
  depthBlessingBonusForLevels,
  depthBlessingMultiplierForLevels,
  effectiveHits,
  faceIndexFor,
  faceReadyAt,
  firstLevelOfStratum,
  levelForFace,
  levelInStratum,
  loadMineState,
  mineTap,
  mineTodayString,
  parseMineState,
  pickGateMet,
  pickPurchaseCheck,
  resetMineForPrestige,
  satchelByKind,
  satchelCount,
  satchelValue,
  saveMineState,
  settleMineState,
  stratumForLevel,
  stratumIndexForFace,
  stratumIndexForLevel,
  unitPriceFor,
  yieldForFace,
  type MineGates,
  type MineState,
} from "../mountain";

const HOUR = 60 * 60 * 1000;
// A fixed "now": midday local, so day boundaries never wobble.
const T0 = new Date(2026, 9, 21, 12, 0, 0).getTime();

const NO_GATES: MineGates = { totalPrestiges: 0, crowns: 0 };
const PRESTIGED: MineGates = { totalPrestiges: 1, crowns: 0 };
const CROWNED: MineGates = { totalPrestiges: 2, crowns: 1 };

function stateWith(pickTier: number, now: number = T0): MineState {
  // A roomy carrier by default: capacity is pinned in its own tests.
  return { ...defaultMineState(now), pickTier, bagTier: 8 };
}

/** Tap a face until it breaks (with a fixed roll); returns the end state. */
function mineOut(state: MineState, faceIndex: number, now: number, roll = 0.1): MineState {
  let s = state;
  for (let i = 0; i < 12; i++) {
    const r = mineTap(s, faceIndex, now, roll);
    s = r.state;
    if (r.outcome.kind === "broke") return s;
    if (r.outcome.kind !== "hit") throw new Error(`unexpected outcome ${r.outcome.kind}`);
  }
  throw new Error("face never broke");
}

beforeEach(() => {
  store.clear();
});

describe("strata and levels — the Deep Descent", () => {
  it("eight strata of ten levels, Stone on top, the Deep at the bottom", () => {
    expect(MINE_STRATA.map((s) => s.name)).toEqual([
      "Stone", "Coal", "Copper", "Iron", "Silver", "Gold", "Diamond", "The Deep",
    ]);
    expect(MAX_LEVEL).toBe(80);
    expect(FACE_COUNT).toBe(240);
    expect(firstLevelOfStratum(0)).toBe(1);
    expect(firstLevelOfStratum(7)).toBe(71);
  });

  it("level math: stratum, position, and face addressing agree", () => {
    expect(stratumIndexForLevel(1)).toBe(0);
    expect(stratumIndexForLevel(10)).toBe(0);
    expect(stratumIndexForLevel(11)).toBe(1);
    expect(stratumIndexForLevel(80)).toBe(7);
    expect(levelInStratum(31)).toBe(1);
    expect(levelInStratum(40)).toBe(10);
    expect(faceIndexFor(31, 0)).toBe(90);
    expect(faceIndexFor(71, 2)).toBe(212);
    expect(levelForFace(212)).toBe(71);
    expect(stratumIndexForFace(212)).toBe(7);
    expect(stratumForLevel(51).name).toBe("Gold");
    expect(clampLevel(0)).toBe(1);
    expect(clampLevel(900)).toBe(80);
  });

  it("each stratum's gate is the pick the ladder climbs to", () => {
    expect(MINE_STRATA.map((s) => s.requiredPick)).toEqual([0, 0, 1, 2, 3, 4, 5, 6]);
    expect(MINE_STRATA.map((s) => s.hits)).toEqual([2, 2, 3, 3, 4, 4, 5, 5]);
  });
});

describe("settle — timestamps, never timers", () => {
  it("a mined-out Stone face returns exactly after its 2 regrow hours", () => {
    const mined = mineOut(stateWith(0), 0, T0); // a Stone face, level 1
    expect(mined.faces[0].minedAt).toBe(T0);
    expect(faceReadyAt(mined.faces[0], 0)).toBe(T0 + 2 * HOUR);
    const early = settleMineState(mined, T0 + 2 * HOUR - 1);
    expect(early.faces[0].minedAt).toBe(T0); // not yet
    const ready = settleMineState(mined, T0 + 2 * HOUR);
    expect(ready.faces[0]).toEqual({ hitsLeft: null, minedAt: null });
  });

  it("regrow scales with depth: a Deep face takes the full 6 hours", () => {
    const deepFace = faceIndexFor(71, 0);
    const mined = mineOut(stateWith(6), deepFace, T0); // Diamond pick in the Deep
    expect(faceReadyAt(mined.faces[deepFace], deepFace)).toBe(T0 + 6 * HOUR);
    const at4h = settleMineState(mined, T0 + 4 * HOUR);
    expect(at4h.faces[deepFace].minedAt).toBe(T0); // shallower rock would be back
    const at6h = settleMineState(mined, T0 + 6 * HOUR);
    expect(at6h.faces[deepFace].minedAt).toBeNull();
  });

  it("mid-mountain rock lands between: Copper is whole again between 3 and 3.2 hours", () => {
    const copperFace = faceIndexFor(21, 0);
    const mined = mineOut(stateWith(1), copperFace, T0);
    expect(settleMineState(mined, T0 + 3 * HOUR).faces[copperFace].minedAt).toBe(T0);
    expect(settleMineState(mined, T0 + 3.2 * HOUR).faces[copperFace].minedAt).toBeNull();
  });

  it("a cracked (unfinished) face does NOT heal on settle", () => {
    const tapped = mineTap(stateWith(0), 0, T0, 0.1).state;
    expect(tapped.faces[0].hitsLeft).toBe(1);
    const later = settleMineState(tapped, T0 + 48 * HOUR);
    expect(later.faces[0].hitsLeft).toBe(1);
    expect(later.faces[0].minedAt).toBeNull();
  });

  it("the daily counter rolls over on a new day, satchel and pick kept", () => {
    const s = { ...stateWith(2), minedToday: 9, satchel: [{ ore: "iron" as const, unit: 14, count: 4 }] };
    const tomorrow = T0 + 24 * HOUR;
    const settled = settleMineState(s, tomorrow);
    expect(settled.day).toBe(mineTodayString(tomorrow));
    expect(settled.minedToday).toBe(0);
    expect(settled.satchel).toEqual([{ ore: "iron", unit: 14, count: 4 }]);
    expect(settled.pickTier).toBe(2);
  });

  it("settle with nothing to do returns the same object (no churn saves)", () => {
    const s = stateWith(1);
    expect(settleMineState(s, T0 + 30 * 60 * 1000)).toBe(s);
  });

  it("tapping a resting face reports when it will be whole", () => {
    const mined = mineOut(stateWith(0), 1, T0);
    const r = mineTap(mined, 1, T0 + HOUR, 0.1);
    expect(r.outcome).toEqual({ kind: "resting", readyAt: T0 + 2 * HOUR });
    expect(r.state.satchel).toEqual(mined.satchel); // no double-dip
  });
});

describe("the descent — two faces open the way down", () => {
  it("one broken face is not enough; the second distinct face opens the next level", () => {
    let s = mineOut(stateWith(0), 0, T0);
    expect(s.deepestLevel).toBe(1);
    expect(brokenSlotCount(s, 1)).toBe(1);
    let opened: number | null = null;
    let cur = s;
    for (let i = 0; i < 12; i++) {
      const r = mineTap(cur, 1, T0, 0.1);
      cur = r.state;
      if (r.outcome.kind === "broke") {
        opened = r.outcome.levelOpened;
        break;
      }
    }
    expect(opened).toBe(2);
    expect(cur.deepestLevel).toBe(2);
    expect(brokenSlotCount(cur, 1)).toBe(2);
  });

  it("re-breaking the SAME face after it regrows does not double-count", () => {
    let s = mineOut(stateWith(0), 0, T0); // slot 0 broken
    s = settleMineState(s, T0 + 2 * HOUR); // the face is whole again
    s = mineOut(s, 0, T0 + 2 * HOUR); // same slot, broken again
    expect(brokenSlotCount(s, 1)).toBe(1);
    expect(s.deepestLevel).toBe(1); // still waiting on a second face
  });

  it("opened levels stay open — breaking shallow rock never closes the deep", () => {
    let s = stateWith(7);
    s = mineOut(s, faceIndexFor(1, 0), T0);
    s = mineOut(s, faceIndexFor(1, 1), T0);
    expect(s.deepestLevel).toBe(2);
    s = mineOut(s, faceIndexFor(2, 0), T0);
    expect(s.deepestLevel).toBe(2); // one slot on level 2
    s = mineOut(s, faceIndexFor(1, 2), T0); // back up top for the third Stone face
    expect(s.deepestLevel).toBe(2);
  });

  it("there is no daily face cap anymore — flames are the limiter", () => {
    const s = { ...stateWith(0), minedToday: 500 };
    const r = mineTap(s, 0, T0, 0.1);
    expect(r.outcome.kind).toBe("hit");
  });
});

describe("flames — one per block broken (v175)", () => {
  it("at zero flames the BREAKING swing is refused and the face keeps its cracks", () => {
    const cracked = mineTap(stateWith(0), 0, T0, 0.1).state; // Stone: 1 hit left
    expect(cracked.faces[0].hitsLeft).toBe(1);
    const r = mineTap(cracked, 0, T0, 0.1, 1, 1, { flamesOk: false });
    expect(r.outcome).toEqual({ kind: "noflames" });
    expect(r.state.faces[0].hitsLeft).toBe(1); // the crack is exactly as it was
    expect(r.state.satchel).toEqual([]);
    expect(r.state.minedToday).toBe(cracked.minedToday);
  });

  it("swings that don't break are free — a fresh face can still be cracked flameless", () => {
    const r = mineTap(stateWith(0), 0, T0, 0.1, 1, 1, { flamesOk: false });
    expect(r.outcome.kind).toBe("hit"); // Stone takes 2 hits; this one lands free
  });

  it("a one-hit face at zero flames is refused whole — untouched", () => {
    // Crown pick on Stone: effective hits = 1, so the first swing IS the break.
    const r = mineTap(stateWith(7), 0, T0, 0.1, 1, 1, { flamesOk: false });
    expect(r.outcome).toEqual({ kind: "noflames" });
    expect(r.state.faces[0]).toEqual({ hitsLeft: null, minedAt: null });
  });

  it("with a flame available the same swing breaks and pays", () => {
    const cracked = mineTap(stateWith(0), 0, T0, 0.1).state;
    const r = mineTap(cracked, 0, T0, 0.1, 1, 1, { flamesOk: true });
    expect(r.outcome.kind).toBe("broke");
    expect(satchelCount(r.state.satchel)).toBeGreaterThan(0);
  });
});

describe("tier gating and the pick ladder", () => {
  it("the Wood pick cannot touch the Copper stratum", () => {
    const copperFace = faceIndexFor(21, 0);
    const r = mineTap(stateWith(0), copperFace, T0, 0.1);
    expect(r.outcome).toEqual({ kind: "locked", requiredPick: 1 });
    expect(r.state.faces[copperFace].hitsLeft).toBeNull();
  });

  it("each gate names the pick the ladder climbs to", () => {
    // Iron stratum needs the Copper pick (tier 2).
    const ironFace = faceIndexFor(31, 0);
    expect(mineTap(stateWith(1), ironFace, T0, 0.1).outcome).toEqual({ kind: "locked", requiredPick: 2 });
    expect(mineTap(stateWith(2), ironFace, T0, 0.1).outcome.kind).toBe("hit");
    // The Deep needs the Diamond pick (tier 6).
    const deepFace = faceIndexFor(71, 0);
    expect(mineTap(stateWith(5), deepFace, T0, 0.1).outcome).toEqual({ kind: "locked", requiredPick: 6 });
    expect(mineTap(stateWith(6), deepFace, T0, 0.1).outcome.kind).toBe("hit");
  });

  it("a pick above the gate digs faster — one hit saved per tier, minimum one", () => {
    expect(effectiveHits(stratumForLevel(1), 0)).toBe(2); // Stone, at gate
    expect(effectiveHits(stratumForLevel(1), 7)).toBe(1); // Crown pick: floored at 1
    expect(effectiveHits(stratumForLevel(21), 1)).toBe(3); // Copper, at gate
    expect(effectiveHits(stratumForLevel(21), 3)).toBe(1); // two tiers above
    expect(effectiveHits(stratumForLevel(71), 6)).toBe(5); // the Deep, at gate
    expect(effectiveHits(stratumForLevel(71), 7)).toBe(4); // Crown pick saves one
  });

  it("the ladder is bought one rung at a time, Copper and Silver included", () => {
    expect(pickPurchaseCheck(0, 1, NO_GATES)).toEqual({ ok: true, cost: 250 });
    expect(pickPurchaseCheck(1, 2, NO_GATES)).toEqual({ ok: true, cost: 600 });
    expect(pickPurchaseCheck(2, 3, NO_GATES)).toEqual({ ok: true, cost: 1200 });
    expect(pickPurchaseCheck(3, 4, NO_GATES)).toEqual({ ok: true, cost: 2800 });
    expect(pickPurchaseCheck(4, 5, NO_GATES)).toEqual({ ok: true, cost: 5000 });
    expect(pickPurchaseCheck(0, 2, NO_GATES)).toEqual({ ok: false, reason: "order" });
    expect(pickPurchaseCheck(2, 2, NO_GATES)).toEqual({ ok: false, reason: "owned" });
  });

  it("the Diamond pick requires a prestige — any prestige", () => {
    expect(pickGateMet(6, NO_GATES)).toBe(false);
    expect(pickGateMet(6, PRESTIGED)).toBe(true);
    expect(pickPurchaseCheck(5, 6, NO_GATES)).toEqual({ ok: false, reason: "prestige" });
    expect(pickPurchaseCheck(5, 6, PRESTIGED)).toEqual({ ok: true, cost: 25000 });
  });

  it("the Crown Pick requires a Crown, not just a prestige", () => {
    expect(pickGateMet(7, PRESTIGED)).toBe(false);
    expect(pickGateMet(7, CROWNED)).toBe(true);
    expect(pickPurchaseCheck(6, 7, PRESTIGED)).toEqual({ ok: false, reason: "crown" });
    expect(pickPurchaseCheck(6, 7, CROWNED)).toEqual({ ok: true, cost: 100000 });
  });

  it("the ladder tops out at the Crown Pick, eight rungs", () => {
    expect(PICKAXES.map((p) => p.name)).toEqual([
      "Wood Pick", "Stone Pick", "Copper Pick", "Iron Pick",
      "Silver Pick", "Gold Pick", "Diamond Pick", "Crown Pick",
    ]);
    expect(PICKAXES.map((p) => p.cost)).toEqual([0, 250, 600, 1200, 2800, 5000, 25000, 100000]);
    expect(PICKAXES.map((p) => p.gate)).toEqual([
      "none", "none", "none", "none", "none", "none", "prestige", "crown",
    ]);
  });
});

describe("mining, yields, and depth pricing", () => {
  it("breaking a Stone face pays stone into the satchel, priced at its level", () => {
    const s = mineOut(stateWith(0), 0, T0, 0.1);
    expect(s.satchel).toEqual([{ ore: "stone", unit: 3, count: 1 }]);
    expect(s.minedToday).toBe(1);
    expect(s.faces[0].minedAt).toBe(T0);
  });

  it("the yield table: each stratum pays its own ore", () => {
    expect(yieldForFace(1, 0, 0.1)).toEqual({ stone: 1 });
    expect(yieldForFace(1, 0, 0.9)).toEqual({ stone: 2 });
    expect(yieldForFace(11, 0, 0.1)).toEqual({ coal: 2 });
    expect(yieldForFace(11, 0, 0.9)).toEqual({ coal: 3 });
    expect(yieldForFace(21, 1, 0.1)).toEqual({ copper: 2 });
    expect(yieldForFace(31, 2, 0.9)).toEqual({ iron: 3 });
    expect(yieldForFace(41, 3, 0.1)).toEqual({ silver: 1 });
    expect(yieldForFace(41, 3, 0.9)).toEqual({ silver: 2 });
    expect(yieldForFace(51, 4, 0.1)).toEqual({ gold: 1 });
    expect(yieldForFace(61, 5, 0.1)).toEqual({ diamond: 1 });
  });

  it("the prestige picks earn their keep in the Deep", () => {
    expect(yieldForFace(71, 6, 0.1)).toEqual({ diamond: 2 }); // Diamond pick bonus
    expect(yieldForFace(71, 7, 0.1)).toEqual({ diamond: 2 }); // Crown pick, same bonus
    expect(yieldForFace(71, 6, 0.9)).toEqual({ gold: 3 }); // gold seam + Diamond bonus
    expect(yieldForFace(71, 7, 0.9)).toEqual({ gold: 4 }); // both bonuses
    expect(yieldForFace(51, 7, 0.1)).toEqual({ gold: 2 }); // Crown bonus in the gold stratum
    expect(yieldForFace(61, 6, 0.1)).toEqual({ diamond: 2 }); // Diamond pick in its own stratum
  });

  it("unit prices: stratum entry, rising ~9% a level to ≈×1.81 at the tenth", () => {
    expect(ORE_PRICES).toEqual({ stone: 3, coal: 6, copper: 10, iron: 14, silver: 26, gold: 45, diamond: 120 });
    expect(unitPriceFor("stone", 1)).toBe(3);
    expect(unitPriceFor("iron", 31)).toBe(14); // Iron's first level
    expect(unitPriceFor("iron", 40)).toBe(25); // Iron's tenth: round(14 × 1.81)
    expect(unitPriceFor("gold", 60)).toBe(81); // round(45 × 1.81)
    expect(unitPriceFor("coal", 20)).toBe(11); // round(6 × 1.81)
  });

  it("the diamond ladder is continuous: Diamond stratum tops out where the Deep begins", () => {
    expect(unitPriceFor("diamond", 61)).toBe(120);
    expect(unitPriceFor("diamond", 70)).toBe(217); // round(120 × 1.81)
    expect(unitPriceFor("diamond", 71)).toBe(220); // the Deep's own base
    expect(unitPriceFor("diamond", 80)).toBe(398); // round(220 × 1.81) — the richest rock there is
  });

  it("ore broken deeper is worth more IN the satchel, not just on paper", () => {
    const shallow = mineOut(stateWith(3), faceIndexFor(31, 0), T0, 0.1);
    expect(shallow.satchel).toEqual([{ ore: "iron", unit: 14, count: 2 }]);
    expect(satchelValue(shallow.satchel)).toBe(28);
    const deep = mineOut(stateWith(3), faceIndexFor(40, 0), T0, 0.1);
    expect(deep.satchel).toEqual([{ ore: "iron", unit: 25, count: 2 }]);
    expect(satchelByKind(deep.satchel).iron).toBe(2);
  });
});

describe("the Depth Blessing — the deeper he can go, the more the town earns", () => {
  it("+0.25% per level opened, capped at +20% for the whole mountain", () => {
    expect(depthBlessingBonusForLevels(0)).toBe(0);
    expect(depthBlessingBonusForLevels(1)).toBeCloseTo(0.0025, 10);
    expect(depthBlessingBonusForLevels(40)).toBeCloseTo(0.1, 10);
    expect(depthBlessingBonusForLevels(80)).toBeCloseTo(0.2, 10);
    expect(depthBlessingBonusForLevels(800)).toBeCloseTo(0.2, 10); // clamped
    expect(depthBlessingMultiplierForLevels(40)).toBeCloseTo(1.1, 10);
    expect(depthBlessingMultiplierForLevels(80)).toBeCloseTo(1.2, 10);
  });

  it("the blessing reads the mine's own deepest level", () => {
    const s = { ...stateWith(0), deepestLevel: 44 };
    expect(depthBlessingBonus(s)).toBeCloseTo(0.11, 10);
  });
});

describe("storage round-trip", () => {
  it("save then load returns the same mine — depth, gear, stacks and all", async () => {
    const s = {
      ...mineOut(stateWith(2), 0, T0, 0.9),
      deepestLevel: 25,
      gear: ["lantern" as const],
      brokenSlots: { "1": 3 },
    };
    await saveMineState(s);
    const loaded = await loadMineState(T0);
    expect(loaded).toEqual(s);
    expect(JSON.parse(store.get(MINE_KEY)!).pickTier).toBe(2);
  });

  it("a first-ever load is the starter mine: Wood pick, Pockets, level 1, empty satchel", async () => {
    const loaded = await loadMineState(T0);
    expect(loaded.pickTier).toBe(0);
    expect(loaded.bagTier).toBe(0);
    expect(loaded.deepestLevel).toBe(1);
    expect(loaded.gear).toEqual([]);
    expect(loaded.satchel).toEqual([]);
    expect(loaded.faces).toHaveLength(FACE_COUNT);
  });

  it("load settles: a face mined out yesterday is whole this morning", async () => {
    const mined = mineOut(stateWith(0, T0 - 24 * HOUR), 0, T0 - 24 * HOUR);
    await saveMineState(mined);
    const loaded = await loadMineState(T0);
    expect(loaded.faces[0].minedAt).toBeNull();
  });

  it("corrupt stored shapes parse back to a safe mine", () => {
    const parsed = parseMineState(
      { deepestLevel: 30, pickTier: 99, satchel: [{ ore: "iron", unit: 14, count: 2 }, { ore: "unobtanium", unit: 5, count: 9 }, { ore: "gold", unit: -3, count: 2 }], faces: "nope", minedToday: -1, gear: ["lantern", "jetpack"] },
      T0
    );
    expect(parsed.pickTier).toBe(7); // clamped to the ladder's top
    expect(parsed.satchel).toEqual([{ ore: "iron", unit: 14, count: 2 }]); // only the sane stack survives
    expect(parsed.faces).toHaveLength(FACE_COUNT);
    expect(parsed.minedToday).toBe(0);
    expect(parsed.deepestLevel).toBe(30);
    expect(parsed.gear).toEqual(["lantern"]);
    expect(parseMineState(null, T0).pickTier).toBe(0);
    expect(parseMineState("garbage", T0).faces).toHaveLength(FACE_COUNT);
  });
});

describe("legacy migration — v168–v174 records walk down the new mountain whole", () => {
  it("the pick maps to the same NAMED pick on the longer ladder", () => {
    // Old tier 2 was the Iron Pick; with Copper inserted it is tier 3 now.
    expect(parseMineState({ pickTier: 2, satchel: {}, faces: [] }, T0).pickTier).toBe(3);
    // Old tier 4 was the Diamond Pick — tier 6 now, still owned.
    expect(parseMineState({ pickTier: 4, satchel: {}, faces: [] }, T0).pickTier).toBe(6);
    expect(parseMineState({ pickTier: 0, satchel: {}, faces: [] }, T0).pickTier).toBe(0);
  });

  it("the satchel's pieces keep their exact old values as stacks", () => {
    const parsed = parseMineState({ pickTier: 0, satchel: { iron: 4, gold: 1, diamond: 2 }, faces: [] }, T0);
    expect(parsed.satchel).toEqual([
      { ore: "iron", unit: 12, count: 4 },
      { ore: "gold", unit: 45, count: 1 },
      { ore: "diamond", unit: 220, count: 2 },
    ]);
    expect(satchelValue(parsed.satchel)).toBe(4 * 12 + 45 + 2 * 220); // not a coin lost
  });

  it("old band faces land on the first level of the stratum they became", () => {
    const faces: { hitsLeft: number | null; minedAt: number | null }[] = Array.from({ length: 12 }, () => ({ hitsLeft: null, minedAt: null }));
    faces[3] = { hitsLeft: null, minedAt: T0 }; // first Iron band face, mined out
    faces[10] = { hitsLeft: 2, minedAt: null }; // a Deep face, cracked
    const parsed = parseMineState({ pickTier: 3, satchel: {}, faces, day: "2026-10-21", minedToday: 1 }, T0);
    expect(parsed.faces).toHaveLength(FACE_COUNT);
    expect(parsed.faces[faceIndexFor(31, 0)].minedAt).toBe(T0); // Iron band → Iron stratum, level 31
    expect(parsed.faces[faceIndexFor(71, 1)].hitsLeft).toBe(2); // Deep band → the Deep, level 71
  });

  it("the deepest opened level is the deepest stratum he had reached — by work or by pick", () => {
    // A Gold-pick owner (old tier 3) could stand in the Deep: level 71.
    expect(parseMineState({ pickTier: 3, satchel: {}, faces: [] }, T0).deepestLevel).toBe(71);
    // An Iron-pick owner (old tier 2) gated the Gold band: level 51.
    expect(parseMineState({ pickTier: 2, satchel: {}, faces: [] }, T0).deepestLevel).toBe(51);
    // A Wood-pick starter has only the top: level 1.
    expect(parseMineState({ pickTier: 0, satchel: {}, faces: [] }, T0).deepestLevel).toBe(1);
  });

  it("a showing still pool moves to the Deep's first level; the haul rate survives", () => {
    const parsed = parseMineState({ pickTier: 3, satchel: {}, faces: [], poolFace: 10, haulMultiplier: 2 }, T0);
    expect(parsed.poolFace).toBe(faceIndexFor(71, 1));
    expect(parsed.haulMultiplier).toBe(2); // a rung on the new ladder too (Silver)
  });
});

describe("prestige reset — the gear precedent", () => {
  it("Begin Again restarts EVERYTHING: Wood pick, Pockets, no depth, no gear, empty satchel", async () => {
    const rich = {
      ...stateWith(7),
      bagTier: 8,
      deepestLevel: 80,
      gear: ["lantern" as const, "tinderbox" as const],
      satchel: [{ ore: "diamond" as const, unit: 398, count: 3 }],
      minedToday: 7,
      haulMultiplier: 3,
    };
    await saveMineState(rich);
    await resetMineForPrestige(T0);
    const loaded = await loadMineState(T0);
    expect(loaded.pickTier).toBe(0);
    expect(loaded.bagTier).toBe(0);
    expect(loaded.deepestLevel).toBe(1);
    expect(loaded.gear).toEqual([]);
    expect(loaded.satchel).toEqual([]);
    expect(loaded.haulMultiplier).toBe(1);
    expect(loaded.minedToday).toBe(0);
    expect(loaded.faces.every((f) => f.minedAt === null && f.hitsLeft === null)).toBe(true);
  });

  it("performPrestige actually calls the mine reset", () => {
    const src = readFileSync(join(process.cwd(), "lib/prestige.ts"), "utf8");
    expect(src).toContain("resetMineForPrestige()");
  });
});

describe("the mountain on the town map", () => {
  it("the Mine stands on the town's street only, and opens the mine", () => {
    // v291 re-base: the Great Peak banner above the old grid
    // retired — the Mine is now a place ON the Wide Street (its
    // rock face at the street's east end), and the street renders
    // on the town map only. Its door opens on the Mouth, as the
    // peak's tap did; the cave is entered from there.
    const src = readFileSync(join(process.cwd(), "app/hometown.tsx"), "utf8");
    expect(src).toContain('activeMap === "town"');
    expect(src).not.toContain("GreatPeakArt");
    // v172: the mine opens on the Mouth; the cave is entered from there.
    expect(src).toContain('router.push("/mine-mouth")');
    expect(src).not.toContain('router.push("/mine-interior")');
    // The place itself: derived on the street, drawn in paper.
    const street = readFileSync(join(process.cwd(), "lib/wide-street.ts"), "utf8");
    expect(street).toContain('kind: "mine"');
    const art = readFileSync(join(process.cwd(), "components/street-places-art.tsx"), "utf8");
    expect(art).toContain("MineArt");
    // And the mine's place carries no name but its own — "Safety"
    // is never a name or label (v169 holds on the street too).
    expect(art).not.toContain("Safety");
    expect(art).not.toContain("SAFETY");
  });

  it("the peak carries NO name — the safe feeling is rendered, not spelled (v169)", () => {
    const src = readFileSync(join(process.cwd(), "components/great-peak.tsx"), "utf8");
    // his correction (2026-10-22): "safety" is a vibe, not a name —
    // the etched word must never come back
    expect(src).not.toContain("SAFETY");
    expect(src).not.toContain("SvgText");
    expect(src).not.toContain("Safety");
    expect(src).toContain("PaperCanvas");
    expect(src).toContain("night"); // day/night treatment is wired
    // the arch stays, plain carved stone with its trim lines
    expect(src).toContain("ARCH_TRIM");
    // a carved flame MOTIF (an image, not words) sits in the arch
    expect(src).toContain("CARVE");
    // the shelter rendering: hearth glow breathing just inside the
    // entrance + warm light pooled on the ground in front of it
    expect(src).toContain("PaperPulse");
    expect(src).toContain("PaperGlowDisc");
    expect(src).toContain("HEARTH");
  });

  it("the mine screen titles itself from the shared constants — plainly, no name", () => {
    const lib = readFileSync(join(process.cwd(), "lib/mountain.ts"), "utf8");
    expect(lib).toContain('MINE_TITLE = "The Mine"');
    expect(lib).not.toContain('MOUNTAIN_NAME = "Safety"');
    expect(lib).not.toContain('"Safety"');
    const screen = readFileSync(join(process.cwd(), "app/mine-interior.tsx"), "utf8");
    expect(screen).toContain("MINE_TITLE");
    expect(screen).not.toContain("Inside Safety");
    // the entrance shaft carries the same warm welcome inside —
    // v199: the shaft scene (components/mine-descent) draws the
    // surface strip now, and its mouth carries the glow
    const scene = readFileSync(join(process.cwd(), "components/mine-descent.tsx"), "utf8");
    expect(scene).toContain("PaperGlowDisc");
    expect(scene).toContain("PaperPulse");
  });
});
