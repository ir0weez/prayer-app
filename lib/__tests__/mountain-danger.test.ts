// The mine, dangerous and generous (v170; the Descent v175) —
// Jonathan's picks: cave-ins with a real HP hit, rich veins, the
// still pool, and picks sold at the Tool Shop where tools belong.
//
// v175 moved the danger down: cave-ins start at the Gold stratum
// (12%), worsen through Diamond (16%) to the Deep (20%); the still
// pool surfaces only in the Deep; and the Mining Gear shelf softens
// the mountain — Braced Gloves bury a third instead of a half, Cave
// Boots halve the HP bite, the Prospector's Charm sometimes finds
// one more piece, the Miner's Lantern shows rich veins early.
//
// These tests pin:
//  - cave-ins: cracked faces only, from the Gold stratum down, the
//    first crack NEVER falls; a collapse spends the haul rate, buries
//    half the satchel (a third with gloves), destroys the face, and
//    counts as mined;
//  - hero HP: the shared forest health record, 20% of max (10% with
//    boots), 0 HP wakes at home on 10%; healing/pray/pool untouched;
//  - rich veins: deterministic per face per day, ~15%, paying double
//    — in the Deep, a 2–3 diamond cluster;
//  - the still pool: Deep only, ~10% of Deep breaks, one at a time,
//    survives the trip out, drink = full heal OR the pool boon;
//  - the charm and lantern wiring;
//  - the Tool Shop contract: picks (all eight) are BOUGHT there.

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
  BOOTS_CAVE_IN_DAMAGE_PCT,
  POOL_REVEAL_CHANCE,
  RICH_FACE_CHANCE,
  burySatchel,
  collapseChanceFor,
  defaultMineState,
  faceIndexFor,
  isRichFace,
  isUnstableStratum,
  mineTap,
  mineTodayString,
  parseMineState,
  richYieldForFace,
  satchelCount,
  satchelValue,
  spendPool,
  unitPriceFor,
  yieldForFace,
  type MineState,
} from "../mountain";
import {
  HERO_HEALTH_KEY,
  applyCaveInDamage,
  defaultHeroHealthState,
  healToFull,
  loadHeroHealthRaw,
  saveHeroHealth,
  settleHealth,
} from "../hero-health";
import {
  POOL_BOON_ATK_PCT,
  POOL_BOON_HP_PCT,
  defaultNeedsState,
  grantPoolBoon,
  heroNeedsDayStr,
  poolBoonFor,
} from "../hero-needs";

const HOUR = 60 * 60 * 1000;
const T0 = new Date(2026, 9, 21, 12, 0, 0).getTime();

const GOLD_FACE = faceIndexFor(51, 0); // Gold stratum, level 51
const DIAMOND_FACE = faceIndexFor(61, 0); // Diamond stratum, level 61
const DEEP_FACE = faceIndexFor(71, 0); // the Deep, level 71

function stateWith(pickTier: number, now: number = T0): MineState {
  return { ...defaultMineState(now), pickTier, bagTier: 8 };
}

/** Crack a face once (guaranteed no collapse: rock below Gold, or a
 *  benign roll) and return the state with the face left cracked. */
function crack(state: MineState, faceIndex: number, now: number = T0): MineState {
  const r = mineTap(state, faceIndex, now, 0.99);
  if (r.outcome.kind !== "hit") throw new Error(`expected a crack, got ${r.outcome.kind}`);
  return r.state;
}

/** Work a face down to a single hit left, collapse rolls benign. */
function workDown(state: MineState, faceIndex: number, now: number = T0): MineState {
  let s = state;
  for (let i = 0; i < 12; i++) {
    if ((s.faces[faceIndex].hitsLeft ?? Infinity) <= 1) return s;
    const r = mineTap(s, faceIndex, now, 0.99);
    s = r.state;
    if (r.outcome.kind !== "hit") throw new Error(`expected a hit, got ${r.outcome.kind}`);
  }
  throw new Error("face never wore down");
}

beforeEach(() => {
  store.clear();
});

describe("cave-ins — only the deep rock falls (v175)", () => {
  it("the unstable strata are Gold and below, at 12 / 16 / 20 percent", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(isUnstableStratum)).toEqual([
      false, false, false, false, false, true, true, true,
    ]);
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(collapseChanceFor)).toEqual([0, 0, 0, 0, 0, 0.12, 0.16, 0.2]);
    expect(collapseChanceFor(5)).toBe(0.12);
    expect(collapseChanceFor(6)).toBe(0.16);
    expect(collapseChanceFor(7)).toBe(0.2);
    expect(collapseChanceFor(3)).toBe(0);
  });

  it("stable rock NEVER falls, whatever the roll — Stone through Silver are safe to crack", () => {
    for (const face of [faceIndexFor(1, 0), faceIndexFor(21, 0), faceIndexFor(41, 0)]) {
      const pick = face < 30 ? 0 : face < 90 ? 1 : 3;
      const cracked = crack(stateWith(pick), face);
      const r = mineTap(cracked, face, T0, 0.99, 0); // the worst collapse roll there is
      expect(r.outcome.kind).not.toBe("collapse");
    }
  });

  it("the FIRST crack on a face never falls — the warning is always free", () => {
    const r = mineTap(stateWith(6), DEEP_FACE, T0, 0.99, 0);
    expect(r.outcome.kind).toBe("hit");
    if (r.outcome.kind === "hit") expect(r.outcome.rumbling).toBe(true);
  });

  it("a cracked Gold face falls at its 12%: roll 0 falls, roll 0.15 holds", () => {
    const cracked = crack(stateWith(4), GOLD_FACE);
    expect(mineTap(cracked, GOLD_FACE, T0, 0.99, 0).outcome.kind).toBe("collapse");
    expect(mineTap(cracked, GOLD_FACE, T0, 0.99, 0.15).outcome.kind).toBe("hit");
  });

  it("Diamond falls at 16% — a roll that spares Gold (0.14) brings Diamond down", () => {
    const crackedD = crack(stateWith(5), DIAMOND_FACE);
    expect(mineTap(crackedD, DIAMOND_FACE, T0, 0.99, 0.14).outcome.kind).toBe("collapse");
    expect(mineTap(crackedD, DIAMOND_FACE, T0, 0.99, 0.18).outcome.kind).toBe("hit");
    const crackedG = crack(stateWith(4), GOLD_FACE);
    expect(mineTap(crackedG, GOLD_FACE, T0, 0.99, 0.14).outcome.kind).toBe("hit");
  });

  it("the Deep falls at 20% — a roll that spares Diamond (0.18) brings the Deep down", () => {
    const cracked = crack(stateWith(6), DEEP_FACE);
    expect(mineTap(cracked, DEEP_FACE, T0, 0.99, 0.18).outcome.kind).toBe("collapse");
    expect(mineTap(cracked, DEEP_FACE, T0, 0.99, 0.25).outcome.kind).toBe("hit");
  });

  it("the breaking hit can be the one that falls — and then the face pays nothing", () => {
    const worn = workDown(stateWith(6), DEEP_FACE);
    expect(worn.faces[DEEP_FACE].hitsLeft).toBe(1);
    const r = mineTap(worn, DEEP_FACE, T0, 0.99, 0);
    expect(r.outcome.kind).toBe("collapse");
    expect(r.state.satchel).toEqual([]);
    expect(r.state.faces[DEEP_FACE].minedAt).toBe(T0); // destroyed, resting
    expect(r.state.minedToday).toBe(worn.minedToday + 1); // counts as mined
  });

  it("a collapse buries half of every kind, spends the haul rate, and regrows deep-slow", () => {
    let s: MineState = {
      ...stateWith(4),
      satchel: [
        { ore: "iron", unit: 14, count: 5 },
        { ore: "gold", unit: 45, count: 3 },
        { ore: "diamond", unit: 120, count: 1 },
      ],
      haulMultiplier: 3,
    };
    s = crack(s, GOLD_FACE);
    const r = mineTap(s, GOLD_FACE, T0, 0.99, 0);
    expect(r.outcome.kind).toBe("collapse");
    if (r.outcome.kind === "collapse") {
      expect(r.outcome.buried.iron).toBe(2);
      expect(r.outcome.buried.gold).toBe(1);
      expect(r.outcome.buried.diamond).toBe(0); // a lone piece is never buried
      expect(r.outcome.stratumIndex).toBe(5);
    }
    expect(satchelCount(r.state.satchel)).toBe(3 + 2 + 1); // kept: 3 iron, 2 gold, 1 diamond
    expect(satchelValue(r.state.satchel)).toBe(3 * 14 + 2 * 45 + 120);
    expect(r.state.haulMultiplier).toBe(1); // the rate is spent
    // Gold rock regrows at its stratum's pace: whole between 4 and 5 hours.
    expect(r.state.faces[GOLD_FACE].minedAt).toBe(T0);
  });

  it("burySatchel rounds the burial DOWN per kind — a lone piece is never buried", () => {
    const satchel = [
      { ore: "iron" as const, unit: 14, count: 5 },
      { ore: "diamond" as const, unit: 220, count: 1 },
    ];
    const { kept, buried } = burySatchel(satchel);
    expect(buried).toMatchObject({ iron: 2, diamond: 0 });
    expect(kept).toEqual([
      { ore: "iron", unit: 14, count: 3 },
      { ore: "diamond", unit: 220, count: 1 },
    ]);
  });
});

describe("Mining Gear at work — gloves and the charm (v175)", () => {
  it("Braced Gloves bury a third instead of a half", () => {
    const satchel = [{ ore: "iron" as const, unit: 14, count: 5 }];
    expect(burySatchel(satchel, 1 / 3).buried).toMatchObject({ iron: 1 });
    let s: MineState = { ...stateWith(4), gear: ["gloves"], satchel: [...satchel] };
    s = crack(s, GOLD_FACE);
    const r = mineTap(s, GOLD_FACE, T0, 0.99, 0);
    expect(r.outcome.kind).toBe("collapse");
    if (r.outcome.kind === "collapse") expect(r.outcome.buried.iron).toBe(1);
    expect(satchelCount(r.state.satchel)).toBe(4);
  });

  it("the Prospector's Charm finds one more piece on a lucky break — only when owned", () => {
    // Plain (non-rich) Stone faces for today, so the counts below are
    // the plain yield — a rich face pays double and would muddy them.
    const day = mineTodayString(T0);
    const plain: number[] = [];
    for (let f = 0; f < 30 && plain.length < 3; f++) {
      if (!isRichFace(f, day)) plain.push(f);
    }
    expect(plain.length).toBe(3);
    const withCharm: MineState = { ...stateWith(0), gear: ["charm"] };
    const crackedCharm = mineTap(withCharm, plain[0], T0, 0.1).state; // crack
    const r = mineTap(crackedCharm, plain[0], T0, 0.1, 1, 1, { charmRoll: 0 });
    expect(r.outcome.kind).toBe("broke");
    if (r.outcome.kind === "broke") expect(r.outcome.charmBonus).toBe(true);
    expect(satchelCount(r.state.satchel)).toBe(2); // 1 stone + the charm's extra
    // An unlucky charm roll finds nothing extra.
    const cracked2 = mineTap(withCharm, plain[1], T0, 0.1).state;
    const r2 = mineTap(cracked2, plain[1], T0, 0.1, 1, 1, { charmRoll: 0.5 });
    expect(r2.outcome.kind).toBe("broke");
    if (r2.outcome.kind === "broke") expect(r2.outcome.charmBonus).toBe(false);
    expect(satchelCount(r2.state.satchel)).toBe(1);
    // And without the charm, even a perfect roll adds nothing.
    const cracked3 = mineTap(stateWith(0), plain[2], T0, 0.1).state;
    const r3 = mineTap(cracked3, plain[2], T0, 0.1, 1, 1, { charmRoll: 0 });
    expect(satchelCount(r3.state.satchel)).toBe(1);
  });
});

describe("hero HP — the cave-in bite (v170 rules, boots added v175)", () => {
  it("a cave-in takes 20% of MAX hp off the shared forest health", () => {
    const s = { ...defaultHeroHealthState(T0), hp: 180 };
    const hurt = applyCaveInDamage(s, 200, T0);
    expect(hurt.damage).toBe(40);
    expect(hurt.state.hp).toBe(140);
    expect(hurt.wokeAtHome).toBe(false);
  });

  it("Cave Boots halve the bite to 10% of max", () => {
    const s = { ...defaultHeroHealthState(T0), hp: 180 };
    const hurt = applyCaveInDamage(s, 200, T0, BOOTS_CAVE_IN_DAMAGE_PCT);
    expect(BOOTS_CAVE_IN_DAMAGE_PCT).toBe(0.1);
    expect(hurt.damage).toBe(20);
    expect(hurt.state.hp).toBe(160);
  });

  it("0 HP wakes at home on 10% — the run is over, nothing else is taken", () => {
    const s = { ...defaultHeroHealthState(T0), hp: 15 };
    const hurt = applyCaveInDamage(s, 200, T0);
    expect(hurt.wokeAtHome).toBe(true);
    expect(hurt.state.hp).toBe(20);
  });

  it("the bite persists in the stored record — only the ~4-hour mend gives health back", async () => {
    await saveHeroHealth({ ...defaultHeroHealthState(T0), hp: 60 });
    const raw = await loadHeroHealthRaw();
    expect(raw.hp).toBe(60);
    expect(JSON.parse(store.get(HERO_HEALTH_KEY)!).hp).toBe(60);
    // The forest's own settle doesn't invent health either: inside
    // the first tick, nothing has mended yet.
    const within = settleHealth({ ...defaultHeroHealthState(T0), hp: 60 }, T0 + 59 * 60 * 1000, 200, 0);
    expect(within.state.hp).toBe(60);
    // RE-BASED (v343): the mend is one tick every ~4 hours at 5% of
    // max (the v177 hourly 10% is reverted) — one tick on, 60 → 70
    // of 200, and that mend is the only free heal there is.
    const settled = settleHealth({ ...defaultHeroHealthState(T0), hp: 60 }, T0 + 4 * HOUR, 200, 0);
    expect(settled.state.hp).toBe(70);
  });

  it("healToFull still tops the hero off completely (the pool's drink)", () => {
    const s = { ...defaultHeroHealthState(T0), hp: 3 };
    expect(healToFull(s, 175, T0).hp).toBe(175);
  });
});

describe("rich veins — hidden seams of double ore (v170, Deep cluster v175)", () => {
  it("whether a face is rich is deterministic per face per day", () => {
    const day = mineTodayString(T0);
    for (let f = 0; f < 240; f++) {
      expect(isRichFace(f, day)).toBe(isRichFace(f, day));
    }
    expect(RICH_FACE_CHANCE).toBe(0.15);
  });

  it("roughly one face in seven is rich across many days", () => {
    let rich = 0;
    let total = 0;
    for (let d = 0; d < 30; d++) {
      const day = mineTodayString(T0 + d * 24 * HOUR);
      for (let f = 0; f < 240; f++) {
        total++;
        if (isRichFace(f, day)) rich++;
      }
    }
    const rate = rich / total;
    expect(rate).toBeGreaterThan(0.08);
    expect(rate).toBeLessThan(0.24);
  });

  it("a rich face pays exactly double, same ores", () => {
    expect(richYieldForFace(1, 0, 0.1)).toEqual({ stone: 2 });
    expect(richYieldForFace(31, 2, 0.1)).toEqual({ iron: 4 });
    expect(richYieldForFace(51, 4, 0.1)).toEqual({ gold: 2 });
    expect(yieldForFace(51, 4, 0.1)).toEqual({ gold: 1 }); // the plain seam, for scale
  });

  it("a rich Deep face pays a diamond CLUSTER — two or three, before pick bonuses", () => {
    expect(richYieldForFace(71, 6, 0.1)).toEqual({ diamond: 3 }); // 2 cluster + Diamond pick
    expect(richYieldForFace(71, 6, 0.5)).toEqual({ diamond: 4 }); // 3 cluster + Diamond pick
    expect(richYieldForFace(71, 6, 0.9)).toEqual({ gold: 6 }); // the gold seam doubles too
    expect(unitPriceFor("diamond", 71)).toBe(220);
  });

  it("an ordinary (non-rich) crack does NOT announce itself — the lantern changes that, not the math", () => {
    const r = mineTap(stateWith(0), 0, T0, 0.1);
    expect(r.outcome.kind).toBe("hit");
    if (r.outcome.kind === "hit") expect(r.outcome.rumbling).toBe(false); // Stone never rumbles
  });
});

describe("the still pool — Deep water (v170, moved to the Deep v175)", () => {
  it("a Deep break can reveal the pool; shallower breaks never do", () => {
    expect(POOL_REVEAL_CHANCE).toBe(0.1);
    const deep = mineTap(workDown(stateWith(6), DEEP_FACE), DEEP_FACE, T0, 0.99, 1, 0);
    expect(deep.outcome.kind).toBe("broke");
    if (deep.outcome.kind === "broke") expect(deep.outcome.poolRevealed).toBe(true);
    expect(deep.state.poolFace).toBe(DEEP_FACE);
    const gold = mineTap(workDown(stateWith(4), GOLD_FACE), GOLD_FACE, T0, 0.99, 1, 0);
    expect(gold.state.poolFace).toBeNull();
  });

  it("only one pool at a time, and it stays until someone drinks", () => {
    const first = mineTap(workDown(stateWith(6), DEEP_FACE), DEEP_FACE, T0, 0.99, 1, 0).state;
    expect(first.poolFace).toBe(DEEP_FACE);
    const secondFace = faceIndexFor(71, 1);
    const second = mineTap(workDown({ ...first }, secondFace), secondFace, T0, 0.99, 1, 0).state;
    expect(second.poolFace).toBe(DEEP_FACE); // still the first pool
  });

  it("spending the pool clears it; a stored pool outside the Deep is rejected", () => {
    const withPool: MineState = { ...stateWith(6), poolFace: DEEP_FACE };
    expect(spendPool(withPool).poolFace).toBeNull();
    expect(spendPool(spendPool(withPool)).poolFace).toBeNull(); // already spent — no-op
    expect(parseMineState({ ...withPool, poolFace: faceIndexFor(41, 0) }, T0).poolFace).toBeNull();
    expect(parseMineState({ ...withPool, poolFace: faceIndexFor(75, 2) }, T0).poolFace).toBe(faceIndexFor(75, 2));
  });

  it("the pool boon: +15% HP and +10% attack for the rest of the day, from hero-needs", () => {
    const needs = defaultNeedsState(heroNeedsDayStr(T0));
    expect(poolBoonFor(needs)).toEqual({ active: false, hpPct: 0, atkPct: 0 });
    const blessed = grantPoolBoon(needs, T0);
    expect(poolBoonFor(blessed)).toEqual({ active: true, hpPct: POOL_BOON_HP_PCT, atkPct: POOL_BOON_ATK_PCT });
    expect(POOL_BOON_HP_PCT).toBe(0.15);
    expect(POOL_BOON_ATK_PCT).toBe(0.1);
  });
});

describe("the Tool Shop — picks are bought where tools belong", () => {
  const shop = readFileSync(join(process.cwd(), "app/gear-shop.tsx"), "utf8");
  const cave = readFileSync(join(process.cwd(), "app/mine-interior.tsx"), "utf8");

  it("the Tool Shop sells the whole ladder, Copper and Silver included", () => {
    expect(shop).toContain("Mountain Picks");
    expect(shop).toContain("PICKAXES");
    expect(shop).toContain("pickPurchaseCheck");
    const lib = readFileSync(join(process.cwd(), "lib/mountain.ts"), "utf8");
    expect(lib).toContain("Copper Pick");
    expect(lib).toContain("Silver Pick");
  });

  it("the cave sells no picks — it points at the shop and shows the worn pick's name", () => {
    expect(cave).not.toContain("pickPurchaseCheck");
    expect(cave).not.toContain("handleBuyPick");
    expect(cave).toContain("sold at the Tool Shop");
    expect(cave).toContain("pickaxeFor(mine.pickTier).name");
  });

  it("the cave wires the danger in: damage, wake-up, the pool's two gifts, the lantern's glow", () => {
    expect(cave).toContain("applyCaveInDamage");
    expect(cave).toContain("healToFull");
    expect(cave).toContain("grantPoolBoon");
    expect(cave).toContain("faceRumbles");
    expect(cave).toContain("richFaint"); // the Lantern shows rich veins before the crack
  });

  it("a v169 save walks into the new mine whole: Diamond Pick kept, ore kept at old prices", () => {
    const parsed = parseMineState(
      { pickTier: 4, satchel: { iron: 2, gold: 1, diamond: 0 }, faces: [], day: "2026-10-21", minedToday: 0, haulMultiplier: 1 },
      T0
    );
    expect(parsed.pickTier).toBe(6); // old tier 4 = Diamond Pick = new tier 6
    expect(parsed.satchel).toEqual([
      { ore: "iron", unit: 12, count: 2 },
      { ore: "gold", unit: 45, count: 1 },
    ]);
  });
});
