// v448 — Keep Me Occupied takes four CHANCE games (Jonathan
// picked Coin Call and Higher or Lower from the chance-games
// drawings, then Scratch Card and Three Reels from the follow-up
// list). Same laws as every round before them:
//   1. The ladder climbs past Order Up in pick order — Coin Call
//      300,000, Higher or Lower 350,000, Scratch Card 400,000,
//      Three Reels 450,000; the pool registry stays in ladder
//      order; the deal never deals a locked game.
//   2. The standing chance rule: a game can never touch the coins
//      already in his purse — only the pot built inside a round
//      is ever at risk, and banking is always his call.
//   3. Coin Call's ladder math (60 × ×1/×2/×3/×5/×8, top-out
//      auto-bank +100, wrong call loses the pot, bank only after
//      a correct call) and its XP tally (18 a call, +30 a bank)
//      riding as the bust consolation.
//   4. Higher or Lower's awards (40, 50, 60, 70, 80, 80…), aces
//      wild and double, ties push, bank only after a correct
//      call.
//   5. Scratch generation invariants: every card holds exactly
//      one trio value or none; about 7 in 10 cards win; the
//      1,000 trio is rare but real. Reveal/win detection is pure.
//   6. Three Reels' payout table (pair 30; hearts 150, stars
//      250, bells 400, coins the 1,000 jackpot) and the
//      three-pull run limit.
//   7. Wave data is STILL never persisted (the v397 whitelist) —
//      the progression tests elsewhere hold that pin for the
//      whole layer; here the four register, price, and buy
//      through the same store shape.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
const writtenKeys: string[] = [];
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      writtenKeys.push(k);
      store.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => { store.delete(k); }),
    multiSet: vi.fn(async () => {}),
    multiGet: vi.fn(async (keys: string[]) => keys.map((k) => [k, store.get(k) ?? null])),
    getAllKeys: vi.fn(async () => [...store.keys()]),
    clear: vi.fn(async () => { store.clear(); }),
  },
}));

import {
  KMO_DEFAULT_UNLOCKED,
  KMO_PROGRESSION_KEY,
  isItemUnlocked,
  loadKmoProgression,
  parseKmoProgression,
  unlockGame,
  unlockPrice,
} from "../kmo-progression";
import {
  COIN_MULTIPLIERS,
  COIN_TOP_BONUS,
  KMO_POOL,
  REELS_PAIR_POINTS,
  REELS_PULLS_PER_RUN,
  REELS_TRIPLE_POINTS,
  SCRATCH_PANELS,
  SCRATCH_VALUES,
  coinAwardForStep,
  coinBank,
  coinFlip,
  coinPayout,
  coinPick,
  coinStart,
  dealItem,
  hlAwardForStreak,
  hlBank,
  hlCall,
  hlCardName,
  hlNewDeck,
  hlPayout,
  hlRankLabel,
  hlStart,
  hlSuitGlyph,
  reelsDraw,
  reelsPayout,
  reelsSettlePull,
  reelsStart,
  scratchFromLayout,
  scratchLayout,
  scratchNext,
  scratchReveal,
  scratchScore,
  scratchStart,
  scratchTrioIn,
  type HlCard,
  type HlState,
} from "../keep-me-occupied";
import { applyCoinsDelta } from "../hometown";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const NEW_GAMES = ["coin-call", "higher-or-lower", "scratch-card", "three-reels"] as const;

beforeEach(() => {
  store.clear();
  writtenKeys.length = 0;
});

// ─── 1. Registration and the ladder ──────────────────────────────────────────

describe("v448 registration", () => {
  it("all four are in the pool with their titles, chips, and verbs", () => {
    const expected: Record<string, { title: string; verb: string }> = {
      "coin-call": { title: "Coin Call", verb: "called the coin" },
      "higher-or-lower": { title: "Higher or Lower", verb: "played Higher or Lower" },
      "scratch-card": { title: "Scratch Card", verb: "scratched the card" },
      "three-reels": { title: "Three Reels", verb: "pulled the reels" },
    };
    for (const id of NEW_GAMES) {
      const item = KMO_POOL.find((i) => i.id === id)!;
      expect(item, id).toBeDefined();
      expect(item.kind).toBe("game");
      expect(item.chip).toBe("DEALT · A GAME");
      expect(item.title).toBe(expected[id].title);
      expect(item.verb).toBe(expected[id].verb);
    }
  });

  it("the ladder climbs past Order Up in pick order: 300k, 350k, 400k, 450k", () => {
    expect(unlockPrice("coin-call")).toBe(300000);
    expect(unlockPrice("higher-or-lower")).toBe(350000);
    expect(unlockPrice("scratch-card")).toBe(400000);
    expect(unlockPrice("three-reels")).toBe(450000);
    // Shelf order IS ladder order: the four stand after Order Up,
    // before the dig, prices climbing.
    const ids = KMO_POOL.map((i) => i.id);
    expect(ids.slice(-6)).toEqual(["coin-call", "higher-or-lower", "scratch-card", "three-reels", "word-dig", "chapter"]);
    const prices = KMO_POOL.filter((i) => i.kind === "game")
      .map((i) => unlockPrice(i.id))
      .filter((p): p is number => p != null);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(prices[prices.length - 1]).toBe(450000);
  });

  it("fresh store: the four are locked; a stored unlock list keeps them", () => {
    const fresh = parseKmoProgression(null);
    for (const id of NEW_GAMES) expect(isItemUnlocked(fresh, id)).toBe(false);
    const parsed = parseKmoProgression({ unlocked: ["coin-call", "scratch-card", "three-reels"], best: {} });
    for (const id of ["coin-call", "scratch-card", "three-reels"]) expect(parsed.unlocked).toContain(id);
  });

  it("buying Three Reels spends 450,000 from the shared purse and persists", async () => {
    await applyCoinsDelta(500000, "none");
    const result = await unlockGame("three-reels");
    expect(result).toMatchObject({ owned: true, bought: true, balance: 50000 });
    expect((await loadKmoProgression()).unlocked).toContain("three-reels");
    const raw = JSON.parse(store.get(KMO_PROGRESSION_KEY)!);
    expect(Object.keys(raw).sort()).toEqual(["best", "unlocked"]);
  });

  it("the deal never deals a locked chance game; with everything unlocked, they all appear", () => {
    const rng = lcg(448);
    const seen = new Set<string>();
    for (let i = 0; i < 4000; i++) seen.add(dealItem(rng, undefined, KMO_DEFAULT_UNLOCKED).id);
    for (const id of NEW_GAMES) expect(seen.has(id)).toBe(false);
    expect(seen.has("chapter")).toBe(true);

    const all = KMO_POOL.filter((i) => i.kind === "game").map((i) => i.id);
    const rng2 = lcg(449);
    const seenAll = new Set<string>();
    for (let i = 0; i < 12000; i++) seenAll.add(dealItem(rng2, undefined, all).id);
    for (const id of NEW_GAMES) expect(seenAll.has(id)).toBe(true);
  });
});

// ─── 2. Coin Call ────────────────────────────────────────────────────────────

const HEADS = () => 0.1;
const TAILS = () => 0.9;

describe("v448 Coin Call", () => {
  it("the ladder pays 60 × the rung: 60, 120, 180, 300, 480", () => {
    expect(COIN_MULTIPLIERS).toEqual([1, 2, 3, 5, 8]);
    expect([0, 1, 2, 3, 4].map(coinAwardForStep)).toEqual([60, 120, 180, 300, 480]);
  });

  it("right calls climb and fill the pot; the ×8 call tops out and auto-banks +100", () => {
    let s = coinStart();
    const pots: number[] = [];
    for (let i = 0; i < 5; i++) {
      s = coinFlip(s, HEADS);
      pots.push(s.pot);
    }
    expect(pots).toEqual([60, 180, 360, 660, 1240]); // last includes the +100 top bonus
    expect(COIN_TOP_BONUS).toBe(100);
    expect(s.over).toBe(true);
    expect(s.topped).toBe(true);
    expect(s.outcome).toBe("banked");
    expect(coinPayout(s)).toBe(1240);
    expect(s.xp).toBe(5 * 18 + 30);
    // A resolved round takes no more flips.
    expect(coinFlip(s, HEADS)).toBe(s);
  });

  it("a wrong call busts: the pot is gone, the XP tally is the consolation", () => {
    let s = coinStart();
    s = coinFlip(s, HEADS);
    s = coinFlip(s, HEADS);
    expect(s.pot).toBe(180);
    s = coinFlip(s, TAILS);
    expect(s.over).toBe(true);
    expect(s.outcome).toBe("busted");
    // Not the pot — the consolation is the tally: 18 a right call.
    expect(coinPayout(s)).toBe(36);
    expect(coinPayout(s)).not.toBe(s.pot);
    // Busting on the very first flip pays nothing at all.
    const first = coinFlip(coinStart(), TAILS);
    expect(coinPayout(first)).toBe(0);
  });

  it("switching the call works while live; the called side is what the flip is judged on", () => {
    let s = coinPick(coinStart(), "tails");
    expect(s.pick).toBe("tails");
    s = coinFlip(s, TAILS); // lands tails — right for a tails call
    expect(s.step).toBe(1);
    expect(s.pot).toBe(60);
  });

  it("banking needs a correct call first, then pays the pot and ends the round", () => {
    const fresh = coinStart();
    expect(coinBank(fresh)).toBe(fresh); // nothing to bank yet
    let s = coinFlip(fresh, HEADS);
    s = coinFlip(s, HEADS);
    const banked = coinBank(s);
    expect(banked.over).toBe(true);
    expect(banked.outcome).toBe("banked");
    expect(banked.topped).toBe(false);
    expect(coinPayout(banked)).toBe(180);
    expect(banked.xp).toBe(2 * 18 + 30);
    // While live, nothing is payable.
    expect(coinPayout(s)).toBe(0);
  });
});

// ─── 3. Higher or Lower ──────────────────────────────────────────────────────

function hlState(current: HlCard, deck: HlCard[], extra: Partial<HlState> = {}): HlState {
  return {
    over: false,
    outcome: null,
    deck,
    current,
    lastDrawn: null,
    lastResult: null,
    lastAward: 0,
    streak: 0,
    correct: 0,
    pot: 0,
    xp: 0,
    ...extra,
  };
}
const card = (rank: number, suit: HlCard["suit"] = "spades"): HlCard => ({ rank, suit });
const NO_RNG = () => 0.5; // only used if the deck runs dry

describe("v448 Higher or Lower", () => {
  it("awards run 40, 50, 60, 70, 80, then hold at the 80 cap", () => {
    expect([1, 2, 3, 4, 5, 6, 9].map(hlAwardForStreak)).toEqual([40, 50, 60, 70, 80, 80, 80]);
  });

  it("the deck is a full 52, all distinct; labels and glyphs read right", () => {
    const deck = hlNewDeck(lcg(12));
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((c) => `${c.rank}-${c.suit}`)).size).toBe(52);
    expect(hlRankLabel(11)).toBe("J");
    expect(hlRankLabel(12)).toBe("Q");
    expect(hlRankLabel(13)).toBe("K");
    expect(hlRankLabel(14)).toBe("A");
    expect(hlRankLabel(7)).toBe("7");
    expect(hlSuitGlyph("hearts")).toBe("♥");
    expect(hlCardName(card(12, "hearts"))).toBe("Q of hearts");
    const start = hlStart(lcg(13));
    expect(start.deck).toHaveLength(51);
    expect(start.current).toBeDefined();
  });

  it("a right call pays and grows the streak; the drawn card becomes the showing card", () => {
    let s = hlState(card(7, "hearts"), [card(9, "clubs")]);
    s = hlCall(s, "higher", NO_RNG);
    expect(s.lastResult).toBe("right");
    expect(s.lastAward).toBe(40);
    expect(s.streak).toBe(1);
    expect(s.pot).toBe(40);
    expect(s.current.rank).toBe(9);
    // The streak climbs the award ladder on the next right call.
    s = { ...s, deck: [card(4, "diamonds")] };
    s = hlCall(s, "lower", NO_RNG);
    expect(s.lastAward).toBe(50);
    expect(s.pot).toBe(90);
  });

  it("an ace is wild: right either way, double the call's award — even off an ace", () => {
    let s = hlState(card(13, "spades"), [card(14, "diamonds")]);
    s = hlCall(s, "lower", NO_RNG); // an ace against a king, called lower — still right
    expect(s.lastResult).toBe("right");
    expect(s.lastAward).toBe(80); // 2 × 40
    expect(s.pot).toBe(80);
    // Ace off an ace is wild too, not a push.
    let t = hlState(card(14, "clubs"), [card(14, "hearts")]);
    t = hlCall(t, "higher", NO_RNG);
    expect(t.lastResult).toBe("right");
    expect(t.lastAward).toBe(80);
  });

  it("a tie pushes: no pay, the streak holds, the new card shows", () => {
    let s = hlState(card(7, "hearts"), [card(9, "clubs")]);
    s = hlCall(s, "higher", NO_RNG); // streak 1, pot 40
    s = { ...s, deck: [card(9, "diamonds")] };
    s = hlCall(s, "lower", NO_RNG); // 9 off 9 — a push, not a miss
    expect(s.lastResult).toBe("push");
    expect(s.lastAward).toBe(0);
    expect(s.streak).toBe(1);
    expect(s.correct).toBe(1);
    expect(s.pot).toBe(40);
    expect(s.current.suit).toBe("diamonds");
    expect(s.over).toBe(false);
  });

  it("a wrong call busts: the pot is gone, the XP tally is the consolation", () => {
    let s = hlState(card(7, "hearts"), [card(9, "clubs")]);
    s = hlCall(s, "higher", NO_RNG);
    s = { ...s, deck: [card(3, "clubs")] };
    s = hlCall(s, "higher", NO_RNG); // 3 off 9, called higher — wrong
    expect(s.over).toBe(true);
    expect(s.outcome).toBe("busted");
    expect(hlPayout(s)).toBe(15); // 15 for the one right call — not the 40 pot
  });

  it("banking needs a correct call first, then pays the pot", () => {
    const fresh = hlState(card(7), [card(9)]);
    expect(hlBank(fresh)).toBe(fresh);
    let s = hlCall(fresh, "higher", NO_RNG);
    const banked = hlBank(s);
    expect(banked.outcome).toBe("banked");
    expect(hlPayout(banked)).toBe(40);
    expect(banked.xp).toBe(15 + 25);
    expect(hlPayout(s)).toBe(0); // live rounds pay nothing yet
  });

  it("an empty pile reshuffles silently instead of ending the round", () => {
    const s = hlState(card(7), []);
    const next = hlCall(s, "higher", lcg(21));
    expect(next.deck).toHaveLength(51); // drew one off a fresh 52
    expect(next.lastResult).not.toBeNull();
  });
});

// ─── 4. Scratch Card ─────────────────────────────────────────────────────────

describe("v448 Scratch Card generation", () => {
  it("every dealt card: nine panels, values from the table, at most one trio value", () => {
    const rng = lcg(4480);
    for (let n = 0; n < 2000; n++) {
      const layout = scratchLayout(rng);
      expect(layout).toHaveLength(SCRATCH_PANELS);
      for (const v of layout) expect(SCRATCH_VALUES).toContain(v);
      const counts = new Map<number, number>();
      for (const v of layout) counts.set(v, (counts.get(v) ?? 0) + 1);
      const trios = [...counts.values()].filter((c) => c >= 3);
      expect(trios.length).toBeLessThanOrEqual(1);
      for (const c of counts.values()) expect(c).toBeLessThanOrEqual(3);
      // The trio detector agrees with the counts.
      const trio = scratchTrioIn(layout);
      if (trios.length === 0) expect(trio).toBeNull();
      else expect(counts.get(trio!)).toBeGreaterThanOrEqual(3);
    }
  });

  it("about seven cards in ten win; duds are real, the 1,000 trio is rare but lands", () => {
    const rng = lcg(4481);
    let winners = 0;
    let thousand = 0;
    let small = 0;
    let twoFifty = 0;
    const total = 4000;
    for (let n = 0; n < total; n++) {
      const trio = scratchTrioIn(scratchLayout(rng));
      if (trio != null) {
        winners++;
        if (trio === 1000) thousand++;
        if (trio === 25 || trio === 50) small++;
        if (trio === 250) twoFifty++;
      }
    }
    expect(winners / total).toBeGreaterThan(0.6);
    expect(winners / total).toBeLessThan(0.8);
    expect(thousand).toBeGreaterThan(0); // ~1 card in 25 — over 4,000 cards it must show
    expect(thousand / total).toBeLessThan(0.08);
    expect(small).toBeGreaterThan(twoFifty); // 25/50 most often, 250 rare
  });

  it("the two-trio guard pays the higher value", () => {
    // Generation can never build this card — the guard is belt and braces.
    expect(scratchTrioIn([100, 100, 100, 250, 250, 250, 25, 50, 25])).toBe(250);
    expect(scratchTrioIn([25, 25, 50, 50, 100, 100, 250, 250, 1000])).toBeNull();
  });
});

describe("v448 Scratch Card play", () => {
  const WINNING = [250, 25, 50, 250, 25, 100, 50, 25, 1000]; // trio: the three 25s at 1, 4, 7
  const DUD = [25, 25, 50, 50, 100, 100, 250, 250, 1000]; // nothing three times

  it("the card resolves on the THIRD matching panel, pays the trio, and banks into the session score", () => {
    let s = scratchFromLayout(WINNING);
    s = scratchReveal(s, 1);
    expect(s.resolved).toBe(false);
    s = scratchReveal(s, 4);
    expect(s.resolved).toBe(false);
    s = scratchReveal(s, 0); // a 250 — no resolution
    expect(s.resolved).toBe(false);
    s = scratchReveal(s, 7); // the third 25
    expect(s.resolved).toBe(true);
    expect(s.won).toBe(25);
    expect(scratchScore(s)).toBe(25);
    // Revealing a dead panel twice, or after resolution, changes nothing.
    expect(scratchReveal(s, 7)).toBe(s);
  });

  it("a dud resolves on the ninth panel and pays nothing", () => {
    let s = scratchFromLayout(DUD);
    for (let i = 0; i < 8; i++) {
      s = scratchReveal(s, i);
      expect(s.resolved).toBe(false);
    }
    s = scratchReveal(s, 8);
    expect(s.resolved).toBe(true);
    expect(s.won).toBeNull();
    expect(scratchScore(s)).toBe(0);
  });

  it("the next card waits for resolution, then deals fresh with the score carried over", () => {
    let s = scratchFromLayout(WINNING);
    expect(scratchNext(s, lcg(3))).toBe(s); // still live — no new card yet
    s = scratchReveal(scratchReveal(scratchReveal(s, 1), 4), 7);
    const next = scratchNext(s, lcg(4));
    expect(next.cards).toBe(2);
    expect(next.score).toBe(25);
    expect(next.resolved).toBe(false);
    expect(next.revealed.every((r) => !r)).toBe(true);
    expect(next.layout).toHaveLength(SCRATCH_PANELS);
    const started = scratchStart(lcg(5));
    expect(started.cards).toBe(1);
    expect(started.score).toBe(0);
  });
});

// ─── 5. Three Reels ──────────────────────────────────────────────────────────

describe("v448 Three Reels", () => {
  it("the payout table: any pair 30, triples by the mark, coins the jackpot", () => {
    expect(REELS_TRIPLE_POINTS).toEqual({ heart: 150, star: 250, bell: 400, coin: 1000 });
    // A pair in any seat pays 30 — and a triple is never just a pair.
    expect(reelsPayout(["coin", "coin", "star"])).toBe(REELS_PAIR_POINTS);
    expect(reelsPayout(["coin", "star", "coin"])).toBe(30);
    expect(reelsPayout(["star", "coin", "coin"])).toBe(30);
    expect(reelsPayout(["heart", "heart", "heart"])).toBe(150);
    expect(reelsPayout(["star", "star", "star"])).toBe(250);
    expect(reelsPayout(["bell", "bell", "bell"])).toBe(400);
    expect(reelsPayout(["coin", "coin", "coin"])).toBe(1000);
    expect(reelsPayout(["coin", "heart", "star"])).toBe(0);
    expect(reelsPayout(["coin", "heart"])).toBe(0); // malformed pays nothing
  });

  it("a run is three pulls: scores accumulate, the jackpot flags, then it takes no more", () => {
    let s = reelsStart();
    s = reelsSettlePull(s, ["coin", "coin", "star"]);
    expect(s.pulls).toBe(1);
    expect(s.score).toBe(30);
    expect(s.over).toBe(false);
    s = reelsSettlePull(s, ["bell", "heart", "star"]);
    expect(s.score).toBe(30);
    s = reelsSettlePull(s, ["coin", "coin", "coin"]);
    expect(s.pulls).toBe(REELS_PULLS_PER_RUN);
    expect(s.over).toBe(true);
    expect(s.score).toBe(1030);
    expect(s.jackpot).toBe(true);
    expect(s.lastPayout).toBe(1000);
    expect(reelsSettlePull(s, ["bell", "bell", "bell"])).toBe(s); // a settled run takes no fourth pull
  });

  it("draws always land on the four marks", () => {
    const rng = lcg(4482);
    for (let n = 0; n < 500; n++) {
      const marks = reelsDraw(rng);
      expect(marks).toHaveLength(3);
      for (const mark of marks) expect(["coin", "heart", "star", "bell"]).toContain(mark);
    }
  });
});

// ─── 6. The wiring ───────────────────────────────────────────────────────────

describe("v448 wiring", () => {
  it("the three run games carry the shared run-end card; Scratch settles as a session game", () => {
    for (const file of ["coin-call", "higher-or-lower", "three-reels"]) {
      const src = read(`components/keep-me-occupied/${file}.tsx`);
      expect(src, file).toContain("RunEndCard");
      expect(src, file).toContain("onRunEnd");
    }
    const scratch = read("components/keep-me-occupied/scratch-card.tsx");
    expect(scratch).toContain("onScore");
    expect(scratch).not.toContain("RunEndCard");
    // No game component grew its own coin HUD or storage hand.
    for (const file of ["coin-call", "higher-or-lower", "scratch-card", "three-reels"]) {
      const src = read(`components/keep-me-occupied/${file}.tsx`);
      expect(src, file).not.toContain("formatCoins");
      expect(src, file).not.toContain("loadCoinsRecord");
      expect(src, file).not.toContain("AsyncStorage");
    }
  });

  it("the screen wires all four; the shelf imports none of them", () => {
    const screen = read("app/keep-me-occupied.tsx");
    for (const name of ["CoinCallGame", "HigherOrLowerGame", "ScratchCardGame", "ThreeReelsGame"]) {
      expect(screen, name).toContain(name);
    }
    for (const id of NEW_GAMES) expect(screen, id).toContain(`"${id}"`);
    const shelf = read("components/keep-me-occupied/games-shelf.tsx");
    for (const name of ["CoinCallGame", "HigherOrLowerGame", "ScratchCardGame", "ThreeReelsGame"]) {
      expect(shelf, name).not.toContain(name);
    }
  });
});
