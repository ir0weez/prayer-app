// The Mouth and the mine's money (v172; the Descent v175).
//
// Jonathan's design: the cave mouth is the mine's porch — you relax
// by the hearth, check your pick, and Sell comes home to the Mouth.
// Ore is ONLY sold here. How much a load fetches depends on how deep
// the trip went (the haul multiplier, raised by the deepest STRATUM
// broken since the last sell — or the last cave-in).
//
// v175 made the satchel price-aware: every piece remembers the level
// it broke at, so a deep haul is worth more piece for piece. And the
// carrier ladder grew teeth: Pockets hold 5 — five — and it climbs
// through backpacks and carts to a Crown Vault Hauler holding 240.
//
// These tests pin:
//  - the haul ladder by stratum (×1 → ×3 cap) and its formatting;
//  - sell math over priced stacks, rounding ONCE at ×multiplier;
//  - the carry ladder, its order and gates, and the full-carrier
//    refusal (a breaking face always pays in full, over the cap);
//  - the gear shelf's purchase rules (Lantern/Gloves/Boots/Charm/
//    Tinderbox) and the Tinderbox's morning flames;
//  - migration: no legacy carrier owner ever ends up holding less;
//  - the screen contracts: sell lives at the Mouth (through the coin
//    ledger alone) and the cave only SENDS you there.

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

import { loadForestEnergy } from "../forest-energy";
import {
  MAX_BAG_TIER,
  SATCHEL_BAGS,
  STRATUM_MULTIPLIERS,
  applySellAll,
  bagPurchaseCheck,
  defaultMineState,
  faceIndexFor,
  formatHaulMultiplier,
  gearPurchaseCheck,
  hasMiningGear,
  isRichFace,
  mineTap,
  mineTodayString,
  parseMineState,
  satchelCapacity,
  satchelCount,
  satchelIsFull,
  satchelLoad,
  satchelValue,
  settleTinderboxBonus,
  stratumMultiplier,
  tinderboxDue,
  type MineGates,
  type MineState,
} from "../mountain";

const HOUR = 60 * 60 * 1000;
const T0 = new Date(2026, 9, 21, 12, 0, 0).getTime();

const NO_GATES: MineGates = { totalPrestiges: 0, crowns: 0 };
const CROWNED: MineGates = { totalPrestiges: 2, crowns: 1 };

function stateWith(pickTier: number, now: number = T0): MineState {
  return { ...defaultMineState(now), pickTier, bagTier: 8 };
}

/** Break a face completely (fixed rolls); returns the end state. */
function breakFace(state: MineState, faceIndex: number, now: number = T0, roll = 0.1): MineState {
  let s = state;
  for (let i = 0; i < 12; i++) {
    const r = mineTap(s, faceIndex, now, roll);
    s = r.state;
    if (r.outcome.kind === "broke") return s;
    if (r.outcome.kind !== "hit") throw new Error(`unexpected outcome ${r.outcome.kind}`);
  }
  throw new Error("face never broke");
}

/** Find a rich face on a level of the given stratum (any near day). */
function findRichFace(stratumIndex: number): { face: number; at: number } {
  const first = faceIndexFor(stratumIndex * 10 + 1, 0);
  for (let d = 0; d < 60; d++) {
    const at = T0 + d * 24 * HOUR;
    const day = mineTodayString(at);
    for (let f = first; f < first + 30; f++) {
      if (isRichFace(f, day)) return { face: f, at };
    }
  }
  throw new Error("no rich face found");
}

beforeEach(() => {
  store.clear();
});

describe("haul multiplier — depth pays, per stratum (v175)", () => {
  it("the ladder runs ×1 at Stone to a ×3 cap in the Diamond country and the Deep", () => {
    expect(STRATUM_MULTIPLIERS).toEqual([1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3]);
    expect(stratumMultiplier(0)).toBe(1);
    expect(stratumMultiplier(7)).toBe(3);
    expect(stratumMultiplier(99)).toBe(3); // clamped at the cap
  });

  it("the label drops trailing zeros it doesn't need", () => {
    expect(STRATUM_MULTIPLIERS.map(formatHaulMultiplier)).toEqual([
      "1", "1.25", "1.5", "1.75", "2", "2.5", "3", "3",
    ]);
    expect(formatHaulMultiplier(1)).toBe("1");
    expect(formatHaulMultiplier(3)).toBe("3");
  });

  it("breaking a face raises the rate to ITS stratum — cracking does not", () => {
    const cracked = mineTap(stateWith(0), faceIndexFor(11, 0), T0, 0.1).state; // Coal face, one hit (Wood pick: 2 hits)
    expect(cracked.haulMultiplier).toBe(1);
    const broken = breakFace(cracked, faceIndexFor(11, 0));
    expect(broken.haulMultiplier).toBe(1.25); // Coal
  });

  it("each deeper stratum raises it further; shallow rock never steps it down", () => {
    let s = stateWith(7);
    s = breakFace(s, faceIndexFor(21, 0)); // Copper
    expect(s.haulMultiplier).toBe(1.5);
    s = breakFace(s, faceIndexFor(41, 0)); // Silver
    expect(s.haulMultiplier).toBe(2);
    s = breakFace(s, faceIndexFor(61, 0)); // Diamond
    expect(s.haulMultiplier).toBe(3);
    s = breakFace(s, faceIndexFor(71, 0)); // the Deep — already at the cap
    expect(s.haulMultiplier).toBe(3);
    s = breakFace(s, faceIndexFor(1, 0)); // back up top for stone
    expect(s.haulMultiplier).toBe(3); // never steps down
  });

  it("selling spends the rate: a fresh trip starts again at ×1", () => {
    const s = breakFace(stateWith(7), faceIndexFor(61, 0));
    expect(s.haulMultiplier).toBe(3);
    const sold = applySellAll(s);
    expect(sold.coins).toBeGreaterThan(0);
    expect(sold.state.haulMultiplier).toBe(1);
    expect(sold.state.satchel).toEqual([]);
  });
});

describe("sell math — priced stacks, rounded once (v175)", () => {
  it("face value sums piece × the price where it broke", () => {
    const s: MineState = {
      ...defaultMineState(T0),
      satchel: [
        { ore: "iron", unit: 12, count: 10 }, // legacy-priced iron
        { ore: "gold", unit: 45, count: 2 },
        { ore: "diamond", unit: 220, count: 1 },
      ],
    };
    expect(satchelValue(s.satchel)).toBe(120 + 90 + 220);
    expect(applySellAll(s).coins).toBe(430); // at ×1
  });

  it("the multiplier applies to the whole load, rounded once at the till", () => {
    const s: MineState = {
      ...defaultMineState(T0),
      satchel: [{ ore: "gold", unit: 45, count: 1 }],
      haulMultiplier: 1.5,
    };
    expect(applySellAll(s).coins).toBe(68); // round(45 × 1.5) = round(67.5)
  });

  it("deep ore sells deep: a rich Deep cluster at the ×3 rate", () => {
    const { face, at } = findRichFace(7);
    let s = stateWith(6, at); // Diamond pick
    s = breakFace(s, face, at);
    expect(s.haulMultiplier).toBe(3);
    // Rich Deep: a 2-diamond cluster, plus the Diamond pick's +1 bonus =
    // 3 pieces, priced at the level where they broke (≥ the 220 base).
    const diamonds = s.satchel.find((st) => st.ore === "diamond");
    expect(diamonds?.count).toBe(3);
    expect(diamonds?.unit).toBeGreaterThanOrEqual(220);
    expect(applySellAll(s).coins).toBe(satchelValue(s.satchel) * 3);
  });

  it("an empty satchel sells for nothing and changes nothing", () => {
    const s = defaultMineState(T0);
    const sold = applySellAll(s);
    expect(sold.coins).toBe(0);
    expect(sold.state).toBe(s); // same object — no churn
  });
});

describe("the carry ladder — Pockets hold five (v175 addendum)", () => {
  it("nine rungs from Pockets to the Crown Vault Hauler", () => {
    expect(SATCHEL_BAGS.map((b) => b.name)).toEqual([
      "Pockets", "Canvas Satchel", "Sturdy Satchel", "Miner's Backpack",
      "Framed Pack", "Hand Cart", "Rail Cart", "Deep Haul Wagon", "Crown Vault Hauler",
    ]);
    expect(SATCHEL_BAGS.map((b) => b.capacity)).toEqual([5, 10, 18, 30, 45, 70, 110, 160, 240]);
    expect(SATCHEL_BAGS.map((b) => b.cost)).toEqual([0, 150, 500, 1500, 4000, 10000, 25000, 60000, 120000]);
    expect(MAX_BAG_TIER).toBe(8);
    expect(satchelCapacity(defaultMineState(T0))).toBe(5); // Pockets
    expect(satchelCapacity({ ...defaultMineState(T0), bagTier: 8 })).toBe(240);
  });

  it("bought one rung at a time; the Vault Hauler waits for a Crown", () => {
    expect(bagPurchaseCheck(0, 1, NO_GATES)).toEqual({ ok: true, cost: 150 });
    expect(bagPurchaseCheck(0, 2, NO_GATES)).toEqual({ ok: false, reason: "order" });
    expect(bagPurchaseCheck(1, 1, NO_GATES)).toEqual({ ok: false, reason: "owned" });
    expect(bagPurchaseCheck(7, 8, NO_GATES)).toEqual({ ok: false, reason: "crown" });
    expect(bagPurchaseCheck(7, 8, CROWNED)).toEqual({ ok: true, cost: 120000 });
  });

  it("a full carrier refuses the next swing entirely — the face is untouched", () => {
    const pockets: MineState = {
      ...defaultMineState(T0),
      satchel: [{ ore: "stone", unit: 3, count: 5 }], // Pockets: full at five
    };
    expect(satchelIsFull(pockets)).toBe(true);
    const r = mineTap(pockets, 0, T0, 0.1);
    expect(r.outcome).toEqual({ kind: "full" });
    expect(r.state.faces[0]).toEqual({ hitsLeft: null, minedAt: null });
  });

  it("but a breaking face always pays in full, even past the cap", () => {
    const nearly: MineState = {
      ...defaultMineState(T0),
      satchel: [{ ore: "stone", unit: 3, count: 4 }], // one pocket free
    };
    // A generous Stone break pays 2 pieces (roll 0.9) — the load lands at
    // 6 pieces in 5-capacity Pockets, because the rock never short-pays.
    const s = breakFace(nearly, 0, T0, 0.9);
    expect(satchelCount(s.satchel)).toBe(6);
    expect(satchelIsFull(s)).toBe(true);
    // …and NOW the next swing is refused.
    expect(mineTap(s, 1, T0, 0.1).outcome).toEqual({ kind: "full" });
  });

  it("migration: no legacy owner ends up holding less than they could", () => {
    // Old Canvas Satchel held 20 → the new Sturdy Satchel (18) would be a
    // LOSS, so he lands on the Miner's Backpack (30).
    expect(parseMineState({ pickTier: 0, bagTier: 0, satchel: {}, faces: [] }, T0).bagTier).toBe(3);
    // Old Miner's Pack held 45 → the Framed Pack (45) matches it exactly.
    expect(parseMineState({ pickTier: 0, bagTier: 2, satchel: {}, faces: [] }, T0).bagTier).toBe(4);
    // Old Crown Haul held 120 → the Deep Haul Wagon (160).
    expect(parseMineState({ pickTier: 0, bagTier: 4, satchel: {}, faces: [] }, T0).bagTier).toBe(7);
  });
});

describe("the Mining Gear shelf (v175 addendum)", () => {
  it("five one-time pieces; the Tinderbox waits for a prestige", () => {
    const bare = defaultMineState(T0);
    expect(gearPurchaseCheck(bare, "lantern", NO_GATES)).toEqual({ ok: true, cost: 2000 });
    expect(gearPurchaseCheck(bare, "gloves", NO_GATES)).toEqual({ ok: true, cost: 3500 });
    expect(gearPurchaseCheck(bare, "boots", NO_GATES)).toEqual({ ok: true, cost: 4500 });
    expect(gearPurchaseCheck(bare, "charm", NO_GATES)).toEqual({ ok: true, cost: 6000 });
    expect(gearPurchaseCheck(bare, "tinderbox", NO_GATES)).toEqual({ ok: false, reason: "prestige" });
    expect(gearPurchaseCheck(bare, "tinderbox", { totalPrestiges: 1, crowns: 0 })).toEqual({ ok: true, cost: 15000 });
    const withLantern: MineState = { ...bare, gear: ["lantern"] };
    expect(gearPurchaseCheck(withLantern, "lantern", NO_GATES)).toEqual({ ok: false, reason: "owned" });
    expect(hasMiningGear({ ...defaultMineState(T0), gear: ["boots"] }, "boots")).toBe(true);
    expect(hasMiningGear(defaultMineState(T0), "boots")).toBe(false);
  });

  it("the Tinderbox kindles +3 bonus flames once a day, through the forest's own pool", async () => {
    const today = mineTodayString(T0);
    const withBox: MineState = { ...defaultMineState(T0), gear: ["tinderbox"] };
    expect(tinderboxDue(withBox, today)).toBe(true);
    const before = (await loadForestEnergy()).energy;
    const stamped = await settleTinderboxBonus(withBox, today);
    expect(stamped.tinderboxDay).toBe(today);
    const after = (await loadForestEnergy()).energy;
    expect(after - before).toBe(3); // exactly the box's three flames, in the shared pool
    // Same day again: not due, and the settle is a no-op.
    expect(tinderboxDue(stamped, today)).toBe(false);
    expect(await settleTinderboxBonus(stamped, today)).toBe(stamped);
    expect((await loadForestEnergy()).energy).toBe(after);
    // No box, no kindling.
    const plain = defaultMineState(T0);
    expect(await settleTinderboxBonus(plain, today)).toBe(plain);
  });
});

describe("screen contracts — the Mouth is where ore becomes coins", () => {
  const cave = readFileSync(join(process.cwd(), "app/mine-interior.tsx"), "utf8");
  const mouth = readFileSync(join(process.cwd(), "app/mine-mouth.tsx"), "utf8");
  const hometown = readFileSync(join(process.cwd(), "app/hometown.tsx"), "utf8");

  it("the peak routes to the Mouth; the Mouth is where the cave is entered", () => {
    expect(hometown).toContain('router.push("/mine-mouth")');
    expect(mouth).toContain('router.push("/mine-interior")');
  });

  it("selling happens at the Mouth, through the coin ledger alone", () => {
    expect(mouth).toContain("applySellAll");
    expect(mouth).toContain("applyCoinsDelta");
    // The cave sells NOTHING anymore — it only sends you home to sell.
    expect(cave).not.toContain("applySellAll");
    expect(cave).not.toContain("applyCoinsDelta");
    expect(cave).toContain("Sell at the Mouth");
  });

  it("the cave spends flames on the break and shows the trip's haul rate", () => {
    expect(cave).toContain("spendForestEnergy");
    expect(cave).toContain("noflames");
    expect(cave).toContain("stratumMultiplier(");
    expect(cave).toContain("Haul ×");
  });

  it("the flame row burns in the cave header and at the Mouth (v177 visualizer)", () => {
    // The shared row (the forest's own flames) with the bonus tint,
    // and the cave wires the break's snuff through it.
    expect(cave).toContain("EnergyFlames");
    expect(cave).toContain("bonusTint");
    expect(cave).toContain("setSnuff");
    expect(mouth).toContain("EnergyFlames");
    expect(mouth).toContain("bonusTint");
    const forest = readFileSync(join(process.cwd(), "components/dark-forest.tsx"), "utf8");
    expect(forest).toContain('from "@/components/energy-flames"');
  });

  it("the Mouth shows flames today and the Depth Blessing, and sells the gear", () => {
    expect(mouth).toContain("loadForestEnergy");
    expect(mouth).toContain("Depth Blessing");
    expect(mouth).toContain("gearPurchaseCheck");
    expect(mouth).toContain("settleTinderboxBonus");
  });

  it("Relax stays pure pleasure: no storage, no ledger, no health writes in the relax path", () => {
    const relaxAt = mouth.indexOf("useRelax");
    expect(relaxAt).toBeGreaterThan(-1);
    const relaxBlock = mouth.slice(relaxAt, mouth.indexOf("export default"));
    expect(relaxBlock).not.toContain("AsyncStorage");
    expect(relaxBlock).not.toContain("applyCoinsDelta");
    expect(relaxBlock).not.toContain("applyCaveInDamage");
    expect(relaxBlock).not.toContain("saveMineState");
    // …and the button is wired to exactly that.
    expect(mouth).toContain("Relax by the hearth");
  });

  it("the Mouth's panels carry no Safety name anywhere (v169 rule)", () => {
    expect(mouth).not.toContain("Safety");
    expect(cave).not.toContain("Safety");
  });
});

describe("the satchel heads-up (v198) — the load speaks before it stops him", () => {
  /** A mine state riding a given carrier with a given piece count. */
  function loadState(bagTier: number, count: number): MineState {
    return {
      ...defaultMineState(T0),
      bagTier,
      satchel: count > 0 ? [{ ore: "stone", unit: 3, count }] : [],
    };
  }

  it("three states, and 'full' is exactly the old gate — nothing moved", () => {
    for (const tier of [0, 1, 2, 4, 8]) {
      const cap = SATCHEL_BAGS[tier].capacity;
      for (let n = 0; n <= cap + 2; n++) {
        expect(satchelLoad(loadState(tier, n)) === "full").toBe(satchelIsFull(loadState(tier, n)));
      }
    }
  });

  it("Pockets (5): no wolf from the first stones — nearly only at three-fifths and the last slots", () => {
    expect(satchelLoad(loadState(0, 0))).toBe("room");
    expect(satchelLoad(loadState(0, 2))).toBe("room"); // 3 free, but not yet three-fifths full
    expect(satchelLoad(loadState(0, 3))).toBe("nearly");
    expect(satchelLoad(loadState(0, 4))).toBe("nearly");
    expect(satchelLoad(loadState(0, 5))).toBe("full");
    expect(satchelLoad(loadState(0, 6))).toBe("full"); // past the cap after a rich break
  });

  it("the warning band is the last three slots at every rung of the ladder", () => {
    expect(satchelLoad(loadState(1, 6))).toBe("room"); // Canvas 10: three-fifths, but 4 free
    expect(satchelLoad(loadState(1, 7))).toBe("nearly");
    expect(satchelLoad(loadState(1, 10))).toBe("full");
    expect(satchelLoad(loadState(2, 14))).toBe("room"); // Sturdy 18: 4 free
    expect(satchelLoad(loadState(2, 15))).toBe("nearly");
    expect(satchelLoad(loadState(8, 200))).toBe("room"); // Vault Hauler 240: deep in room
    expect(satchelLoad(loadState(8, 236))).toBe("room"); // 4 free — still room
    expect(satchelLoad(loadState(8, 237))).toBe("nearly");
    expect(satchelLoad(loadState(8, 240))).toBe("full");
  });

  it("the cave screen renders the three states — and no shortcut with them", () => {
    const cave = readFileSync(join(process.cwd(), "app/mine-interior.tsx"), "utf8");
    // v199: the treatments moved with the faces — the faces' quiet
    // lives in the shaft's wall (components/mine-faces) and the
    // plain line in the descent scene (components/mine-descent),
    // under the faces of the level he stands on. The readouts and
    // the one load state stayed in the cave screen.
    const facesWall = readFileSync(join(process.cwd(), "components/mine-faces.tsx"), "utf8");
    const scene = readFileSync(join(process.cwd(), "components/mine-descent.tsx"), "utf8");
    // One load state, computed from the lib, drives every treatment.
    expect(cave).toContain("satchelLoad(mine)");
    expect(cave).toContain("bagLoad={bagLoad}");
    // Near-full: both count readouts warm to the cave's amber.
    expect(cave).toContain('bagLoad === "nearly" ? "#FB923C"');
    expect(cave).toContain('bagLoad === "nearly" ? " — nearly full."');
    // Full: the faces sit quiet — stopped, not merely gated — and
    // the pool, no dig face, is never dimmed for it.
    expect(facesWall).toContain('!isPool && bagLoad === "full" ? 0.4');
    // Full: the plain line under his faces in the shaft, gated on
    // full alone, in the cave-in rose — and it adds no button of
    // any kind.
    expect(scene).toContain("satchelFull && (");
    expect(scene).toContain("Satchel full — sell at the Mouth to keep digging.");
    const stripAt = scene.indexOf("Satchel full — sell at the Mouth to keep digging.");
    const strip = scene.slice(scene.lastIndexOf("{/*", stripAt), stripAt);
    expect(strip).not.toContain("onPress");
    expect(strip).not.toContain("router.");
  });
});
