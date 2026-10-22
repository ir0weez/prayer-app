// The mine, dangerous and generous (v170) — Jonathan's picks
// (2026-10-22): cave-ins with a real HP hit, rich veins, the still
// pool, and picks sold at the Tool Shop where tools belong.
//
// These tests pin:
//  - collapse only ever threatens CRACKED faces in the unstable
//    bands (Gold / The Deep) — never Stone, never Iron, never a
//    face's first hit — at the shipped chances per band;
//  - the burial math (half the unsold satchel, rounded down), the
//    face's destruction and regrow, and the trip-ending outcome;
//  - the hero HP hit through lib/hero-health: 20% of max, and a hit
//    that would zero him waking him at home at the defeat floor;
//  - rich veins: deterministic per face per day, revealed at the
//    first crack, paying double — a 2–3 diamond cluster in the Deep;
//  - the still pool: Deep breaks reveal it, one pool at a time, it
//    stays until drunk, and the pool boon (forest blessing till
//    midnight) reads through lib/hero-needs in the boon's own shape;
//  - the Tool Shop shelf: picks are bought there (source pins) and
//    the mine strip no longer sells — both read the one mine record.

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
  FACES_PER_BAND,
  MINE_BANDS,
  burySatchel,
  collapseChanceFor,
  defaultMineState,
  faceReadyAt,
  faceRumbles,
  isRichFace,
  isUnstableBand,
  loadMineState,
  mineTap,
  mineTodayString,
  parseMineState,
  richYieldForFace,
  saveMineState,
  settleMineState,
  spendPool,
  yieldForFace,
  type MineState,
} from "../mountain";
import {
  CAVE_IN_DAMAGE_PCT,
  applyCaveInDamage,
  defaultHeroHealthState,
  healToFull,
} from "../hero-health";
import {
  POOL_BOON_ATK_PCT,
  POOL_BOON_HP_PCT,
  combineBoons,
  defaultNeedsState,
  grantPoolBoon,
  heroNeedsDayStr,
  poolBoonFor,
  settleNeeds,
} from "../hero-needs";

const HOUR = 60 * 60 * 1000;
// A fixed "now": midday local, so day boundaries never wobble.
const T0 = new Date(2026, 9, 21, 12, 0, 0).getTime();

function stateWith(pickTier: number, now: number = T0): MineState {
  return { ...defaultMineState(now), pickTier };
}

/** Tap a face until it breaks (fixed rolls); returns the end state. */
function mineOut(
  state: MineState,
  faceIndex: number,
  now: number,
  roll = 0.1,
  poolRoll = 1
): { state: MineState; outcome: ReturnType<typeof mineTap>["outcome"] } {
  let s = state;
  for (let i = 0; i < 12; i++) {
    const r = mineTap(s, faceIndex, now, roll, 1, poolRoll);
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

describe("cave-ins — only the deep bands, only cracked faces", () => {
  it("the unstable bands are Gold and The Deep, at the shipped chances", () => {
    expect(MINE_BANDS.map((_, i) => isUnstableBand(i))).toEqual([false, false, true, true]);
    expect(collapseChanceFor(0)).toBe(0);
    expect(collapseChanceFor(1)).toBe(0);
    expect(collapseChanceFor(2)).toBe(0.12);
    expect(collapseChanceFor(3)).toBe(0.2);
  });

  it("Stone and Iron faces NEVER collapse, even cracked with the worst roll", () => {
    for (const faceIndex of [0, FACES_PER_BAND]) {
      const pick = faceIndex === 0 ? 0 : 1;
      const crackedState = crack(stateWith(pick), faceIndex);
      const r = mineTap(crackedState, faceIndex, T0, 0.1, 0);
      // The tap lands or breaks the face — it never falls.
      expect(r.outcome.kind).not.toBe("collapse");
    }
    // Iron has hits to spare, so the tap is a plain hit.
    const iron = mineTap(crack(stateWith(1), FACES_PER_BAND), FACES_PER_BAND, T0, 0.1, 0);
    expect(iron.outcome.kind).toBe("hit");
  });

  it("a face's FIRST hit can never bring it down — the crack is the warning", () => {
    const r = mineTap(stateWith(3), 9, T0, 0.1, 0); // a Deep face, worst roll
    expect(r.outcome.kind).toBe("hit");
    if (r.outcome.kind === "hit") expect(r.outcome.rumbling).toBe(true);
  });

  it("a hit in a stable band reports no rumble", () => {
    const r = mineTap(stateWith(0), 0, T0, 0.1, 0);
    expect(r.outcome).toMatchObject({ kind: "hit", rumbling: false });
  });

  it("the rumble warning reads on cracked unstable faces only", () => {
    const gold = crack(stateWith(2), 6);
    expect(faceRumbles(gold, 6)).toBe(true);
    expect(faceRumbles(stateWith(2), 6)).toBe(false); // uncracked: quiet
    const stone = crack(stateWith(0), 0);
    expect(faceRumbles(stone, 0)).toBe(false); // cracked but stable rock
  });

  it("a cracked Gold face falls at the Gold chance — and not above it", () => {
    const crackedState = crack(stateWith(2), 6);
    const falls = mineTap(crackedState, 6, T0, 0.1, 0);
    expect(falls.outcome.kind).toBe("collapse");
    const holds = mineTap(crackedState, 6, T0, 0.1, 0.15); // 0.15 ≥ 0.12
    expect(holds.outcome.kind).toBe("hit");
  });

  it("the Deep is shakier: a roll that spares Gold still drops the Deep", () => {
    const crackedDeep = crack(stateWith(3), 9);
    const r = mineTap(crackedDeep, 9, T0, 0.1, 0.15); // 0.15 < 0.20
    expect(r.outcome.kind).toBe("collapse");
    const holds = mineTap(crackedDeep, 9, T0, 0.1, 0.25);
    expect(holds.outcome.kind).toBe("hit");
  });

  it("even the BREAKING hit can fall — no yield, the face is just gone", () => {
    let s = stateWith(3);
    // Gold pick on the Deep: 5 hits. Work it down to one hit left.
    for (let i = 0; i < 4; i++) s = crack(s, 9);
    expect(s.faces[9].hitsLeft).toBe(1);
    const r = mineTap(s, 9, T0, 0.1, 0);
    expect(r.outcome.kind).toBe("collapse");
    expect(r.state.satchel).toEqual({ iron: 0, gold: 0, diamond: 0 });
    expect(r.state.faces[9].minedAt).toBe(T0);
  });

  it("a collapse buries half the unsold satchel (rounded down) and counts the face for the day", () => {
    const loaded = { ...crack(stateWith(2), 6), satchel: { iron: 5, gold: 3, diamond: 1 } };
    const r = mineTap(loaded, 6, T0, 0.1, 0);
    expect(r.outcome).toEqual({
      kind: "collapse",
      buried: { iron: 2, gold: 1, diamond: 0 },
      bandIndex: 2,
    });
    expect(r.state.satchel).toEqual({ iron: 3, gold: 2, diamond: 1 });
    expect(r.state.minedToday).toBe(loaded.minedToday + 1);
    // The destroyed face regrows on its band's normal clock (Gold: 4h).
    expect(faceReadyAt(r.state.faces[6], 6)).toBe(T0 + MINE_BANDS[2].regrowHours * HOUR);
    const back = settleMineState(r.state, T0 + 4 * HOUR);
    expect(back.faces[6]).toEqual({ hitsLeft: null, minedAt: null });
  });

  it("burySatchel splits cleanly, and an empty satchel buries nothing", () => {
    expect(burySatchel({ iron: 5, gold: 3, diamond: 1 })).toEqual({
      kept: { iron: 3, gold: 2, diamond: 1 },
      buried: { iron: 2, gold: 1, diamond: 0 },
    });
    expect(burySatchel({ iron: 0, gold: 0, diamond: 0 })).toEqual({
      kept: { iron: 0, gold: 0, diamond: 0 },
      buried: { iron: 0, gold: 0, diamond: 0 },
    });
  });
});

describe("the HP hit — through the one hero HP store", () => {
  it("a cave-in costs 20% of max HP", () => {
    expect(CAVE_IN_DAMAGE_PCT).toBe(0.2);
    const s = { ...defaultHeroHealthState(T0), hp: 200 };
    const hit = applyCaveInDamage(s, 200, T0);
    expect(hit.damage).toBe(40);
    expect(hit.wokeAtHome).toBe(false);
    expect(hit.state.hp).toBe(160);
  });

  it("a hit that would zero him wakes him at home at the defeat floor instead", () => {
    const s = { ...defaultHeroHealthState(T0), hp: 30 };
    const hit = applyCaveInDamage(s, 200, T0); // 30 − 40 ≤ 0
    expect(hit.wokeAtHome).toBe(true);
    expect(hit.state.hp).toBe(20); // ceil(10% of 200) — wakeAfterDefeat's floor
  });

  it("a brand-new hero (hp null) is hit from full, like the forest treats him", () => {
    const hit = applyCaveInDamage(defaultHeroHealthState(T0), 100, T0);
    expect(hit.state.hp).toBe(80);
    expect(hit.wokeAtHome).toBe(false);
  });

  it("the pool's full heal mends to max WITHOUT spending a hospital heal", () => {
    const s = { ...defaultHeroHealthState(T0), hp: 30, hospitalHealsUsed: 1 };
    const healed = healToFull(s, 200, T0);
    expect(healed.hp).toBe(200);
    expect(healed.hospitalHealsUsed).toBe(1); // the pool is not the hospital
  });
});

describe("rich veins — deterministic, revealed at the crack, paying double", () => {
  it("the same face on the same day is rich (or not) every time you ask", () => {
    for (let f = 0; f < 12; f++) {
      expect(isRichFace(f, "2026-10-21")).toBe(isRichFace(f, "2026-10-21"));
    }
    // And across 90 days the rate is in a sane band around 15%.
    let rich = 0;
    for (let k = 0; k < 90; k++) {
      const day = mineTodayString(new Date(2026, 9, 21 + k, 12).getTime());
      for (let f = 0; f < 12; f++) if (isRichFace(f, day)) rich++;
    }
    const rate = rich / (90 * 12);
    expect(rate).toBeGreaterThan(0.08);
    expect(rate).toBeLessThan(0.24);
  });

  it("a rich face pays double the plain table", () => {
    const { now, faceIndex } = findRich(0); // a rich Stone face
    const { state, outcome } = mineOut(stateWith(0, now), faceIndex, now, 0.1);
    expect(outcome).toMatchObject({ kind: "broke", rich: true });
    expect(state.satchel.iron).toBe(2 * (yieldForFace(0, 0, 0.1).iron ?? 0));
  });

  it("a plain face pays the plain table and says so", () => {
    const plain = [0, 1, 2].find((f) => !isRichFace(f, mineTodayString(T0)))!;
    const { outcome } = mineOut(stateWith(0), plain, T0, 0.1);
    expect(outcome).toMatchObject({ kind: "broke", rich: false });
  });

  it("a rich Deep face wakes a diamond cluster — 2 or 3 by the roll, prestige bonus on top", () => {
    expect(richYieldForFace(3, 3, 0.1)).toEqual({ diamond: 2 });
    expect(richYieldForFace(3, 3, 0.5)).toEqual({ diamond: 3 });
    expect(richYieldForFace(3, 4, 0.1)).toEqual({ diamond: 3 }); // Diamond pick +1
    expect(richYieldForFace(3, 3, 0.9)).toEqual({ gold: 4 }); // gold branch doubles too
    const { now, faceIndex } = findRich(3);
    const { state, outcome } = mineOut(stateWith(3, now), faceIndex, now, 0.1);
    expect(outcome).toMatchObject({ kind: "broke", rich: true });
    expect(state.satchel.diamond).toBe(2);
  });
});

describe("the still pool — the Deep's mercy", () => {
  it("breaking a Deep face with the reveal roll shows the pool there", () => {
    const { state, outcome } = mineOut(stateWith(3), 10, T0, 0.1, 0);
    expect(outcome).toMatchObject({ kind: "broke", poolRevealed: true });
    expect(state.poolFace).toBe(10);
  });

  it("only the Deep reveals it — Gold breaks stay dry", () => {
    const { outcome } = mineOut(stateWith(2), 6, T0, 0.1, 0);
    expect(outcome).toMatchObject({ kind: "broke", poolRevealed: false });
  });

  it("one pool at a time: while one shows, no second reveal", () => {
    const first = mineOut(stateWith(3), 10, T0, 0.1, 0).state;
    const second = mineOut(first, 11, T0, 0.1, 0);
    expect(second.outcome).toMatchObject({ kind: "broke", poolRevealed: false });
    expect(second.state.poolFace).toBe(10);
  });

  it("it stays until used — settle and a new day do not clear it", () => {
    const revealed = mineOut(stateWith(3), 10, T0, 0.1, 0).state;
    const later = settleMineState(revealed, T0 + 30 * HOUR);
    expect(later.poolFace).toBe(10);
  });

  it("drinking spends it (spendPool), and a later break can reveal it again", () => {
    const revealed = mineOut(stateWith(3), 10, T0, 0.1, 0).state;
    const spent = spendPool(revealed);
    expect(spent.poolFace).toBeNull();
    expect(spendPool(spent)).toBe(spent); // no-op, same object
    const again = mineOut(spent, 11, T0, 0.1, 0);
    expect(again.state.poolFace).toBe(11);
  });

  it("the pool face round-trips storage; legacy and corrupt records read null", async () => {
    const s = { ...stateWith(3), poolFace: 11 };
    await saveMineState(s);
    expect((await loadMineState(T0)).poolFace).toBe(11);
    // A v168/v169 record has no poolFace key at all.
    const legacy = parseMineState({ pickTier: 3, satchel: { iron: 1 }, faces: [], day: "2026-10-21", minedToday: 0 }, T0);
    expect(legacy.poolFace).toBeNull();
    expect(legacy.pickTier).toBe(3);
    // A pool claimed outside the Deep is not a pool.
    expect(parseMineState({ poolFace: 4 }, T0).poolFace).toBeNull();
    expect(parseMineState({ poolFace: 99 }, T0).poolFace).toBeNull();
  });

  it("the blessing reads in the boon's own shape and stacks with Set for the Day", () => {
    const day = heroNeedsDayStr(T0);
    const idle = defaultNeedsState(day);
    expect(poolBoonFor(idle)).toEqual({ active: false, hpPct: 0, atkPct: 0 });
    const blessed = grantPoolBoon(idle, T0);
    expect(blessed.poolBoonActive).toBe(true);
    expect(poolBoonFor(blessed)).toEqual({
      active: true,
      hpPct: POOL_BOON_HP_PCT,
      atkPct: POOL_BOON_ATK_PCT,
    });
    expect(POOL_BOON_HP_PCT).toBe(0.15);
    expect(POOL_BOON_ATK_PCT).toBe(0.1);
    const stacked = combineBoons(
      { active: true, hpPct: 0.1, atkPct: 0.05 },
      poolBoonFor(blessed)
    );
    expect(stacked.active).toBe(true);
    expect(stacked.hpPct).toBeCloseTo(0.25);
    expect(stacked.atkPct).toBeCloseTo(0.15);
    // Midnight is the expiry: the next day's fresh record has no blessing.
    const tomorrow = settleNeeds(blessed, T0 + 24 * HOUR);
    expect(tomorrow.poolBoonActive).toBe(false);
  });

  it("the forest and the hospital read the stacked boon (source pins)", () => {
    const forest = readFileSync(join(process.cwd(), "components/dark-forest.tsx"), "utf8");
    expect(forest).toContain("boonFor(settledNeeds, house)");
    expect(forest).toContain("poolBoonFor(settledNeeds)");
    const hospital = readFileSync(join(process.cwd(), "app/hospital-interior.tsx"), "utf8");
    expect(hospital).toContain("boonFor(needs, house)");
    expect(hospital).toContain("poolBoonFor(needs)");
  });
});

describe("picks moved to the Tool Shop (v170)", () => {
  it("the Tool Shop sells the ladder through the one mine record", () => {
    const shop = readFileSync(join(process.cwd(), "app/gear-shop.tsx"), "utf8");
    expect(shop).toContain("Mountain Picks");
    expect(shop).toContain('shopType === "tool"');
    // One ladder state: the shop loads and saves lib/mountain's record.
    expect(shop).toContain("loadMineState");
    expect(shop).toContain("saveMineState");
    expect(shop).toContain("pickPurchaseCheck");
    // One ledger: purchases deduct through applyCoinsDelta.
    expect(shop).toContain("applyCoinsDelta");
    // The town-coin tools stay in their own list, untouched above it:
    // the picks section renders after the gear items.
    expect(shop.indexOf("Mountain Picks", shop.indexOf("items.map"))).toBeGreaterThan(-1);
  });

  it("the mine strip is status only — no buying left in the mine", () => {
    const screen = readFileSync(join(process.cwd(), "app/mine-interior.tsx"), "utf8");
    expect(screen).not.toContain("pickPurchaseCheck");
    expect(screen).not.toContain("handleBuyPick");
    expect(screen).toContain("Sold at the Tool Shop");
    expect(screen).toContain("Tool Shop");
    // ...and the danger/reward wiring is on the screen.
    expect(screen).toContain("applyCaveInDamage");
    expect(screen).toContain("healToFull");
    expect(screen).toContain("grantPoolBoon");
    expect(screen).toContain("faceRumbles");
  });

  it("a v169 save's ladder carries over — the shop and the mine read the same record", async () => {
    const s = { ...stateWith(4), satchel: { iron: 2, gold: 1, diamond: 0 } };
    await saveMineState(s);
    const loaded = await loadMineState(T0);
    expect(loaded.pickTier).toBe(4); // Diamond pick owned since v168 stays owned
    expect(loaded.satchel).toEqual({ iron: 2, gold: 1, diamond: 0 });
  });
});
