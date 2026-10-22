// The Mouth and the haul (v172) — Jonathan, 2026-10-22: tapping the
// peak should land at a setup area (relax, check tools, sell ore)
// before the cave, and the cave itself should push its luck: no
// selling underground, a multiplier on every depth, and a satchel
// with a real size.
//
// These tests pin:
//  - the haul multiplier ladder by deepest band broken, that it
//    never steps back down, and that a mere crack doesn't raise it;
//  - the sell: multiplier applied (whole coins), satchel emptied,
//    multiplier banked back to ×1 — and the sell living at the
//    Mouth only (source pins: the cave has no sell path at all);
//  - a cave-in spending the multiplier along with v170's burial;
//  - rich veins stacking UNDER the haul multiplier (vein doubles
//    the face, the haul multiplies the satchel);
//  - satchel capacity: a full bag refuses the swing and the face
//    takes NO damage; a breaking face always pays in full; bigger
//    bags bought one rung at a time, the top one behind the Crown;
//  - legacy migration: v170 records gain bag ×1 defaults, and an
//    over-cap legacy satchel is kept whole but cannot grow;
//  - the peak → Mouth → cave routing, and Relax as pure scene
//    state (it may not touch storage, the ledger, or health).

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
  BAND_MULTIPLIERS,
  FACES_PER_BAND,
  MAX_BAG_TIER,
  ORE_PRICES,
  SATCHEL_BAGS,
  applySellAll,
  bagFor,
  bagPurchaseCheck,
  bandMultiplier,
  defaultMineState,
  formatHaulMultiplier,
  haulValue,
  isRichFace,
  loadMineState,
  mineTap,
  mineTodayString,
  parseMineState,
  resetMineForPrestige,
  satchelCapacity,
  satchelCount,
  satchelIsFull,
  saveMineState,
  yieldForFace,
  type MineState,
} from "../mountain";

// A fixed "now": midday local, so day boundaries never wobble.
const T0 = new Date(2026, 9, 21, 12, 0, 0).getTime();

function stateWith(pickTier: number, now: number = T0): MineState {
  return { ...defaultMineState(now), pickTier };
}

/** Tap a face until it breaks (fixed rolls, no collapse, no pool). */
function mineOut(
  state: MineState,
  faceIndex: number,
  now: number,
  roll = 0.1
): { state: MineState; outcome: ReturnType<typeof mineTap>["outcome"] } {
  let s = state;
  for (let i = 0; i < 12; i++) {
    const r = mineTap(s, faceIndex, now, roll, 1, 1);
    s = r.state;
    if (r.outcome.kind === "broke") return { state: s, outcome: r.outcome };
    if (r.outcome.kind !== "hit") throw new Error(`unexpected outcome ${r.outcome.kind}`);
  }
  throw new Error("face never broke");
}

/** Crack a face once (its first hit), collapse roll disabled. */
function crack(state: MineState, faceIndex: number, now: number = T0): MineState {
  const r = mineTap(state, faceIndex, now, 0.1, 1);
  if (r.outcome.kind !== "hit") throw new Error(`expected a hit, got ${r.outcome.kind}`);
  return r.state;
}

/** Find a day (from T0 forward) with a rich face in the band. */
function findRich(bandIndex: number): { now: number; faceIndex: number } {
  for (let k = 0; k < 90; k++) {
    const now = new Date(2026, 9, 21 + k, 12, 0, 0).getTime();
    const day = mineTodayString(now);
    for (let slot = 0; slot < FACES_PER_BAND; slot++) {
      const faceIndex = bandIndex * FACES_PER_BAND + slot;
      if (isRichFace(faceIndex, day)) return { now, faceIndex };
    }
  }
  throw new Error("no rich face found in 90 days");
}

beforeEach(() => {
  store.clear();
});

describe("the haul multiplier — the deepest band worked sets the rate", () => {
  it("the ladder: Stone ×1, Iron ×1.5, Gold ×2, The Deep ×3", () => {
    expect(BAND_MULTIPLIERS).toEqual([1, 1.5, 2, 3]);
    expect([0, 1, 2, 3].map(bandMultiplier)).toEqual([1, 1.5, 2, 3]);
    expect([1, 1.5, 2, 3].map(formatHaulMultiplier)).toEqual(["1", "1.5", "2", "3"]);
  });

  it("breaking a face raises the haul to that band's rate, rung by rung", () => {
    let s = stateWith(5);
    expect(s.haulMultiplier).toBe(1);
    s = mineOut(s, 0, T0).state; // a Stone face
    expect(s.haulMultiplier).toBe(1);
    s = mineOut(s, FACES_PER_BAND, T0).state; // an Iron face
    expect(s.haulMultiplier).toBe(1.5);
    s = mineOut(s, 2 * FACES_PER_BAND, T0).state; // a Gold face
    expect(s.haulMultiplier).toBe(2);
    s = mineOut(s, 3 * FACES_PER_BAND, T0).state; // a Deep face
    expect(s.haulMultiplier).toBe(3);
  });

  it("it never steps back down: shallow work after deep work keeps the deep rate", () => {
    let s = stateWith(5);
    s = mineOut(s, 3 * FACES_PER_BAND, T0).state; // the Deep first
    expect(s.haulMultiplier).toBe(3);
    s = mineOut(s, 1, T0).state; // then a Stone face
    expect(s.haulMultiplier).toBe(3);
    s = mineOut(s, FACES_PER_BAND + 1, T0).state; // then Iron
    expect(s.haulMultiplier).toBe(3);
  });

  it("a mere crack raises nothing — the face has to BREAK", () => {
    const s = crack(stateWith(5), 3 * FACES_PER_BAND); // a Deep face, cracked
    expect(s.haulMultiplier).toBe(1);
  });
});

describe("selling at the Mouth — the multiplier banks, then resets", () => {
  it("haulValue is face value at the multiplier, in whole coins", () => {
    const loaded = { ...stateWith(0), satchel: { iron: 10, gold: 2, diamond: 1 } }; // 430 face
    expect(haulValue({ ...loaded, haulMultiplier: 1 })).toBe(430);
    expect(haulValue({ ...loaded, haulMultiplier: 2 })).toBe(860);
    expect(haulValue({ ...loaded, haulMultiplier: 3 })).toBe(1290);
    // Whole coins at ×1.5: one gold (45) pays 68, not 67.5.
    const oneGold = { ...stateWith(0), satchel: { iron: 0, gold: 1, diamond: 0 }, haulMultiplier: 1.5 };
    expect(haulValue(oneGold)).toBe(68);
  });

  it("applySellAll pays the multiplied total, empties the bag, resets to ×1", () => {
    const s = { ...stateWith(0), satchel: { iron: 10, gold: 2, diamond: 1 }, haulMultiplier: 2 };
    const { state, coins } = applySellAll(s);
    expect(coins).toBe(860);
    expect(state.satchel).toEqual({ iron: 0, gold: 0, diamond: 0 });
    expect(state.haulMultiplier).toBe(1);
    // Selling twice pays once, and an empty bag can't spend a rate.
    expect(applySellAll(state).coins).toBe(0);
  });

  it("a mined-out Deep run sells its whole story at ×3", () => {
    // A guaranteed-plain Deep face, worked with the Gold pick: the
    // plain table pays exactly one diamond.
    const plainDeep = [0, 1, 2]
      .map((slot) => 3 * FACES_PER_BAND + slot)
      .find((f) => !isRichFace(f, mineTodayString(T0)))!;
    const s = mineOut(stateWith(3), plainDeep, T0, 0.1).state;
    expect(s.satchel).toEqual({ iron: 0, gold: 0, diamond: 1 });
    expect(s.haulMultiplier).toBe(3);
    expect(applySellAll(s).coins).toBe(ORE_PRICES.diamond * 3);
  });
});

describe("a cave-in spends the multiplier (on top of v170's burial)", () => {
  it("the surviving satchel drops back to ×1", () => {
    const loaded = {
      ...crack(stateWith(3), 3 * FACES_PER_BAND),
      satchel: { iron: 4, gold: 2, diamond: 1 },
      haulMultiplier: 3,
    };
    const r = mineTap(loaded, 3 * FACES_PER_BAND, T0, 0.1, 0); // worst roll: it falls
    expect(r.outcome.kind).toBe("collapse");
    expect(r.state.haulMultiplier).toBe(1);
    expect(haulValue(r.state)).toBe(
      2 * ORE_PRICES.iron + 1 * ORE_PRICES.gold + 1 * ORE_PRICES.diamond // the kept half, at ×1
    );
  });
});

describe("rich veins stack under the haul multiplier", () => {
  it("a rich Deep face: the vein clusters the diamonds, the haul triples the lot", () => {
    const { now, faceIndex } = findRich(3);
    const { state, outcome } = mineOut(stateWith(3, now), faceIndex, now, 0.1);
    expect(outcome).toMatchObject({ kind: "broke", rich: true });
    expect(state.satchel.diamond).toBe(2); // the rich cluster (v170)
    expect(state.haulMultiplier).toBe(3); // the Deep's rate (v172)
    expect(applySellAll(state).coins).toBe(2 * ORE_PRICES.diamond * 3);
  });

  it("a rich Stone face doubles its iron; the haul stays at face value", () => {
    const { now, faceIndex } = findRich(0);
    const { state } = mineOut(stateWith(0, now), faceIndex, now, 0.1);
    expect(state.satchel.iron).toBe(2 * (yieldForFace(0, 0, 0.1).iron ?? 0));
    expect(state.haulMultiplier).toBe(1);
    expect(haulValue(state)).toBe(state.satchel.iron * ORE_PRICES.iron);
  });
});

describe("satchel capacity — the bag is the trip's clock", () => {
  it("the bag ladder: sizes, prices, and the Crown's claim on the top", () => {
    expect(SATCHEL_BAGS.map((b) => b.name)).toEqual([
      "Canvas Bag",
      "Sturdy Bag",
      "Miner's Pack",
      "Deep Haul Satchel",
      "Crown Haul Bag",
    ]);
    expect(SATCHEL_BAGS.map((b) => b.capacity)).toEqual([20, 30, 45, 70, 120]);
    expect(SATCHEL_BAGS.map((b) => b.cost)).toEqual([0, 750, 3000, 12000, 50000]);
    expect(SATCHEL_BAGS.map((b) => b.gate)).toEqual(["none", "none", "none", "none", "crown"]);
    expect(MAX_BAG_TIER).toBe(4);
    expect(satchelCount({ iron: 3, gold: 2, diamond: 1 })).toBe(6); // pieces, not value
  });

  it("a full bag refuses the swing — and the face takes NO damage", () => {
    const s = { ...stateWith(0), satchel: { iron: 20, gold: 0, diamond: 0 } }; // Canvas cap
    expect(satchelIsFull(s)).toBe(true);
    const r = mineTap(s, 0, T0, 0.1, 0); // even a collapse-begging roll
    expect(r.outcome).toEqual({ kind: "full" });
    expect(r.state.faces[0]).toEqual({ hitsLeft: null, minedAt: null });
    expect(r.state.minedToday).toBe(s.minedToday);
    expect(r.state.satchel).toEqual(s.satchel);
  });

  it("one piece of room left still swings", () => {
    const s = { ...stateWith(0), satchel: { iron: 19, gold: 0, diamond: 0 } };
    const r = mineTap(s, 0, T0, 0.1);
    expect(r.outcome.kind).toBe("hit");
    expect(r.state.faces[0].hitsLeft).toBe(1);
  });

  it("a breaking face always pays in full — even past the cap — then the bag is full", () => {
    const s = { ...stateWith(0), satchel: { iron: 19, gold: 0, diamond: 0 } };
    const broken = mineOut(s, 0, T0, 0.9); // Stone pays at least 2 at this roll
    expect(satchelCount(broken.state.satchel)).toBeGreaterThan(20); // over the Canvas cap, all kept
    const next = mineTap(broken.state, 1, T0, 0.1);
    expect(next.outcome).toEqual({ kind: "full" });
  });

  it("a bigger bag digs longer: 25 pieces is room to spare in a Sturdy Bag", () => {
    const s = { ...stateWith(0), bagTier: 1, satchel: { iron: 25, gold: 0, diamond: 0 } };
    expect(satchelCapacity(s)).toBe(30);
    expect(satchelIsFull(s)).toBe(false);
    expect(mineTap(s, 0, T0, 0.1).outcome.kind).toBe("hit");
  });

  it("bag purchases climb one rung at a time; the top rung reads the Crown gate", () => {
    const noCrown = { totalPrestiges: 0, crowns: 0 };
    const crowned = { totalPrestiges: 1, crowns: 1 };
    expect(bagPurchaseCheck(0, 1, noCrown)).toEqual({ ok: true, cost: 750 });
    expect(bagPurchaseCheck(1, 2, noCrown)).toEqual({ ok: true, cost: 3000 });
    expect(bagPurchaseCheck(2, 3, noCrown)).toEqual({ ok: true, cost: 12000 });
    expect(bagPurchaseCheck(0, 2, noCrown)).toEqual({ ok: false, reason: "order" });
    expect(bagPurchaseCheck(1, 1, noCrown)).toEqual({ ok: false, reason: "owned" });
    expect(bagPurchaseCheck(4, 4, crowned)).toEqual({ ok: false, reason: "owned" });
    expect(bagPurchaseCheck(3, 4, noCrown)).toEqual({ ok: false, reason: "crown" });
    expect(bagPurchaseCheck(3, 4, crowned)).toEqual({ ok: true, cost: 50000 });
    expect(bagFor(4).name).toBe("Crown Haul Bag");
  });
});

describe("legacy records — v170 saves walk into v172 whole", () => {
  it("a v170 record (no bag, no multiplier) defaults to Canvas and ×1, ladder intact", () => {
    const legacy = parseMineState(
      { pickTier: 4, satchel: { iron: 2, gold: 1, diamond: 0 }, faces: [], day: "2026-10-21", minedToday: 3, poolFace: null },
      T0
    );
    expect(legacy.pickTier).toBe(4); // the Diamond Pick bought in v170 stays bought
    expect(legacy.bagTier).toBe(0);
    expect(legacy.haulMultiplier).toBe(1);
  });

  it("an over-cap legacy satchel is KEPT whole — grandfathered — but cannot grow", () => {
    const legacy = parseMineState({ satchel: { iron: 25, gold: 0, diamond: 0 } }, T0);
    expect(satchelCount(legacy.satchel)).toBe(25); // nothing confiscated
    expect(satchelIsFull(legacy)).toBe(true);
    const r = mineTap({ ...legacy, pickTier: 0 }, 0, T0, 0.1);
    expect(r.outcome).toEqual({ kind: "full" }); // blocked until sold down
    // …and selling it pays every grandfathered piece.
    expect(applySellAll({ ...legacy, pickTier: 0 }).coins).toBe(25 * ORE_PRICES.iron);
  });

  it("corrupt v172 fields fall back to the starter bag and ×1", () => {
    const parsed = parseMineState({ bagTier: 99, haulMultiplier: 7 }, T0);
    expect(parsed.bagTier).toBe(MAX_BAG_TIER); // clamped, like the pick ladder
    expect(parsed.haulMultiplier).toBe(1); // 7 is not a rung on the ladder
    expect(parseMineState({ bagTier: -2, haulMultiplier: 2.5 }, T0).bagTier).toBe(0);
    expect(parseMineState({ haulMultiplier: 1.5 }, T0).haulMultiplier).toBe(1.5); // a real rung survives
  });

  it("bag and multiplier round-trip storage", async () => {
    const s = { ...stateWith(2), bagTier: 2, haulMultiplier: 2 };
    await saveMineState(s);
    const loaded = await loadMineState(T0);
    expect(loaded.bagTier).toBe(2);
    expect(loaded.haulMultiplier).toBe(2);
  });

  it("Begin Again hands back the starter bag and a ×1 haul with the Wood pick", async () => {
    const rich = {
      ...stateWith(5),
      bagTier: 3,
      haulMultiplier: 3,
      satchel: { iron: 40, gold: 9, diamond: 3 },
    };
    await saveMineState(rich);
    await resetMineForPrestige(T0);
    const loaded = await loadMineState(T0);
    expect(loaded.pickTier).toBe(0);
    expect(loaded.bagTier).toBe(0);
    expect(loaded.haulMultiplier).toBe(1);
  });
});

describe("the Mouth — routing, the one till, and rest that touches nothing", () => {
  it("the peak opens on the Mouth; the cave is entered from the Mouth", () => {
    const town = readFileSync(join(process.cwd(), "app/hometown.tsx"), "utf8");
    expect(town).toContain('router.push("/mine-mouth")');
    expect(town).not.toContain('router.push("/mine-interior")');
    const mouth = readFileSync(join(process.cwd(), "app/mine-mouth.tsx"), "utf8");
    expect(mouth).toContain('router.push("/mine-interior")'); // Enter the Cave
    expect(mouth).toContain('"/gear-shop?type=tool"'); // the tool check's jump
    expect(mouth).toContain("GreatPeakArt"); // the peak's own entrance art
    expect(mouth).toContain("MINE_TITLE");
  });

  it("the Mouth keeps the naming rule: the feeling is rendered, never spelled", () => {
    const mouth = readFileSync(join(process.cwd(), "app/mine-mouth.tsx"), "utf8");
    expect(mouth).not.toContain("Safety");
    expect(mouth).toContain("PaperSeatedHero"); // rest has a figure, not a label
    expect(mouth).toContain("PaperHeroFigure");
  });

  it("selling lives at the Mouth ONLY — the cave has no sell path at all", () => {
    const cave = readFileSync(join(process.cwd(), "app/mine-interior.tsx"), "utf8");
    expect(cave).not.toContain("applySellAll");
    expect(cave).not.toContain("Sell all");
    expect(cave).not.toContain("applyCoinsDelta");
    // …the cave points up the shaft instead, and shows its workings:
    expect(cave).toContain("Sell at the Mouth");
    expect(cave).toContain("Haul ×");
    expect(cave).toContain("bandMultiplier(bandIndex)"); // every band wears its rate
    expect(cave).toContain("Your bag is full — haul it up to the Mouth.");
  });

  it("RELAX is pure scene state: no storage, no ledger, no health", () => {
    const mouth = readFileSync(join(process.cwd(), "app/mine-mouth.tsx"), "utf8");
    const start = mouth.indexOf("function useRelax");
    expect(start).toBeGreaterThan(-1);
    const hook = mouth.slice(start, mouth.indexOf("BreathingSeat", start));
    expect(hook).toContain("useState");
    expect(hook).not.toContain("save");
    expect(hook).not.toContain("applyCoinsDelta");
    expect(hook).not.toContain("AsyncStorage");
    expect(hook).not.toContain("setItem");
    expect(hook).not.toContain("load");
    // And the seated rest breathes on the kit's terms, in the screen:
    expect(mouth).toContain("Easing.inOut(Easing.sin)");
    expect(mouth).toContain("useNativeDriver: true");
  });
});
