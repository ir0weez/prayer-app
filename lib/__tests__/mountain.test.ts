// The Mountain and its mine (v168; naming corrected v169).
//
// Jonathan's pitch (2026-10-21): a mountain at the top of the town
// that says "safety", a cave you can mine for iron, gold and diamonds,
// tools you upgrade to reach the expensive stuff, the top of the
// ladder behind prestiging. Design approved from mockups the same
// day: the Great Peak on the town map + the Dig Wall inside.
//
// These tests pin the mine's rules (lib/mountain):
//  - settle math: mined-out faces return after their band's regrow
//    hours, computed from timestamps (NO background timers), and the
//    daily counter rolls over at a new day;
//  - tier gating: a face above your pick cannot be mined; the
//    Diamond pick requires a prestige, the Crown Pick a Crown — read
//    from prestige's own state, never a parallel flag;
//  - the daily face cap;
//  - sell-all empties the satchel for exactly its ledger value;
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
  DAILY_FACE_CAP,
  FACE_COUNT,
  FACES_PER_BAND,
  MINE_BANDS,
  MINE_KEY,
  ORE_PRICES,
  PICKAXES,
  applySellAll,
  bandIndexForFace,
  defaultMineState,
  effectiveHits,
  faceReadyAt,
  loadMineState,
  mineTap,
  mineTodayString,
  parseMineState,
  pickGateMet,
  pickPurchaseCheck,
  resetMineForPrestige,
  satchelValue,
  saveMineState,
  settleMineState,
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
  return { ...defaultMineState(now), pickTier };
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

describe("bands and faces", () => {
  it("has four strata of three faces, stone on top, the Deep at the bottom", () => {
    expect(MINE_BANDS.map((b) => b.name)).toEqual(["Stone", "Iron", "Gold", "The Deep"]);
    expect(FACE_COUNT).toBe(12);
    expect(bandIndexForFace(0)).toBe(0);
    expect(bandIndexForFace(FACES_PER_BAND)).toBe(1);
    expect(bandIndexForFace(FACE_COUNT - 1)).toBe(3);
  });

  it("each band needs the pick named for the rock above the starter", () => {
    expect(MINE_BANDS.map((b) => b.requiredPick)).toEqual([0, 1, 2, 3]);
  });

  it("a stronger pick cracks lesser rock faster, never below one tap", () => {
    expect(effectiveHits(MINE_BANDS[0], 0)).toBe(2);
    expect(effectiveHits(MINE_BANDS[0], 5)).toBe(1); // capped at 2 saved
    expect(effectiveHits(MINE_BANDS[3], 3)).toBe(5);
    expect(effectiveHits(MINE_BANDS[3], 5)).toBe(3);
  });
});

describe("settle — timestamps, never timers", () => {
  it("a mined-out face returns exactly after its band's regrow hours", () => {
    const mined = mineOut(stateWith(0), 0, T0); // a Stone face
    const face = mined.faces[0];
    expect(face.minedAt).toBe(T0);
    expect(faceReadyAt(face, 0)).toBe(T0 + 2 * HOUR);

    const early = settleMineState(mined, T0 + 2 * HOUR - 1);
    expect(early.faces[0].minedAt).toBe(T0); // not yet
    const ready = settleMineState(mined, T0 + 2 * HOUR);
    expect(ready.faces[0]).toEqual({ hitsLeft: null, minedAt: null });
  });

  it("deeper faces take longer to settle back", () => {
    const mined = mineOut(stateWith(3), 11, T0); // a Deep face, Gold pick
    expect(faceReadyAt(mined.faces[11], 11)).toBe(T0 + 6 * HOUR);
    const at4h = settleMineState(mined, T0 + 4 * HOUR);
    expect(at4h.faces[11].minedAt).toBe(T0); // gold band would be back; the Deep is not
  });

  it("a cracked (unfinished) face does NOT heal on settle", () => {
    const tapped = mineTap(stateWith(0), 0, T0, 0.1).state;
    expect(tapped.faces[0].hitsLeft).toBe(1);
    const later = settleMineState(tapped, T0 + 48 * HOUR);
    // Same day-rollover aside, the crack stays exactly where he left it.
    expect(later.faces[0].hitsLeft).toBe(1);
    expect(later.faces[0].minedAt).toBeNull();
  });

  it("the daily counter rolls over on a new day, satchel and pick kept", () => {
    const s = { ...stateWith(2), minedToday: 9, satchel: { iron: 4, gold: 1, diamond: 0 } };
    const tomorrow = T0 + 24 * HOUR;
    const settled = settleMineState(s, tomorrow);
    expect(settled.day).toBe(mineTodayString(tomorrow));
    expect(settled.minedToday).toBe(0);
    expect(settled.satchel).toEqual({ iron: 4, gold: 1, diamond: 0 });
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

describe("tier gating", () => {
  it("the Wood pick cannot touch the Iron band", () => {
    const r = mineTap(stateWith(0), FACES_PER_BAND, T0, 0.1); // first Iron face
    expect(r.outcome).toEqual({ kind: "locked", requiredPick: 1 });
    expect(r.state.faces[FACES_PER_BAND].hitsLeft).toBeNull();
  });

  it("each pick opens exactly its own band", () => {
    for (let pick = 0; pick <= 3; pick++) {
      const face = pick * FACES_PER_BAND;
      const r = mineTap(stateWith(pick), face, T0, 0.1);
      expect(r.outcome.kind).toBe("hit");
    }
    // ...and the Gold pick still cannot skip the ladder's meaning:
    // it mines the Deep (its band) but the Deep stays the Deep.
    const deep = mineTap(stateWith(3), 11, T0, 0.1);
    expect(deep.outcome.kind).toBe("hit");
  });

  it("the ladder is bought one rung at a time", () => {
    expect(pickPurchaseCheck(0, 1, NO_GATES)).toEqual({ ok: true, cost: 250 });
    expect(pickPurchaseCheck(0, 2, NO_GATES)).toEqual({ ok: false, reason: "order" });
    expect(pickPurchaseCheck(2, 2, NO_GATES)).toEqual({ ok: false, reason: "owned" });
    expect(pickPurchaseCheck(2, 3, NO_GATES)).toEqual({ ok: true, cost: 5000 });
  });

  it("the Diamond pick requires a prestige — any prestige", () => {
    expect(pickGateMet(4, NO_GATES)).toBe(false);
    expect(pickGateMet(4, PRESTIGED)).toBe(true);
    expect(pickPurchaseCheck(3, 4, NO_GATES)).toEqual({ ok: false, reason: "prestige" });
    expect(pickPurchaseCheck(3, 4, PRESTIGED)).toEqual({ ok: true, cost: 25000 });
  });

  it("the Crown Pick requires a Crown, not just a prestige", () => {
    expect(pickGateMet(5, PRESTIGED)).toBe(false);
    expect(pickGateMet(5, CROWNED)).toBe(true);
    expect(pickPurchaseCheck(4, 5, PRESTIGED)).toEqual({ ok: false, reason: "crown" });
    expect(pickPurchaseCheck(4, 5, CROWNED)).toEqual({ ok: true, cost: 100000 });
  });

  it("the ladder tops out at the Crown Pick", () => {
    expect(PICKAXES.map((p) => p.name)).toEqual([
      "Wood Pick",
      "Stone Pick",
      "Iron Pick",
      "Gold Pick",
      "Diamond Pick",
      "Crown Pick",
    ]);
    expect(PICKAXES.map((p) => p.gate)).toEqual(["none", "none", "none", "none", "prestige", "crown"]);
  });
});

describe("mining and yields", () => {
  it("breaking a Stone face pays iron into the satchel", () => {
    const s = mineOut(stateWith(0), 0, T0, 0.1);
    expect(s.satchel.iron).toBe(1);
    expect(s.minedToday).toBe(1);
    expect(s.faces[0].minedAt).toBe(T0);
  });

  it("the yield table: richer bands, richer ore", () => {
    expect(yieldForFace(0, 0, 0.1)).toEqual({ iron: 1 });
    expect(yieldForFace(0, 0, 0.9)).toEqual({ iron: 2 });
    expect(yieldForFace(1, 1, 0.1)).toEqual({ iron: 2 });
    expect(yieldForFace(1, 1, 0.9)).toEqual({ iron: 3 });
    expect(yieldForFace(2, 2, 0.1)).toEqual({ gold: 1 });
    expect(yieldForFace(2, 2, 0.9)).toEqual({ gold: 2 });
    expect(yieldForFace(3, 3, 0.1)).toEqual({ diamond: 1 });
    expect(yieldForFace(3, 3, 0.9)).toEqual({ gold: 2 });
  });

  it("the prestige picks earn their keep in the Deep", () => {
    expect(yieldForFace(3, 4, 0.1)).toEqual({ diamond: 2 }); // Diamond pick
    expect(yieldForFace(3, 5, 0.1)).toEqual({ diamond: 2 }); // Crown pick
    expect(yieldForFace(3, 5, 0.9)).toEqual({ gold: 4 }); // both bonuses
    expect(yieldForFace(2, 5, 0.1)).toEqual({ gold: 2 }); // Crown bonus in the gold band
  });

  it("the daily cap stops mining at the cap, kindly", () => {
    const s = { ...stateWith(5), minedToday: DAILY_FACE_CAP };
    const r = mineTap(s, 0, T0, 0.1);
    expect(r.outcome).toEqual({ kind: "cap" });
    expect(r.state.faces[0].hitsLeft).toBeNull();
  });

  it("a new day lifts the cap (settle runs inside the tap)", () => {
    const s = { ...stateWith(0, T0 - 24 * HOUR), minedToday: DAILY_FACE_CAP };
    const r = mineTap(s, 0, T0, 0.1);
    expect(r.outcome.kind).toBe("hit");
    expect(r.state.day).toBe(mineTodayString(T0));
  });
});

describe("sell all", () => {
  it("values the satchel at the ore prices and empties it", () => {
    const s = { ...stateWith(0), satchel: { iron: 10, gold: 2, diamond: 1 } };
    expect(satchelValue(s.satchel)).toBe(10 * ORE_PRICES.iron + 2 * ORE_PRICES.gold + ORE_PRICES.diamond);
    const { state, coins } = applySellAll(s);
    expect(coins).toBe(430);
    expect(state.satchel).toEqual({ iron: 0, gold: 0, diamond: 0 });
    // Selling twice pays once.
    expect(applySellAll(state).coins).toBe(0);
  });

  it("ore sells through the ledger: the mine screen's only coin path", () => {
    const screen = readFileSync(join(process.cwd(), "app/mine-interior.tsx"), "utf8");
    expect(screen).toContain("applyCoinsDelta");
    // The canonical-ledger rule (v167): no screen writes the coins
    // record directly.
    expect(screen).not.toContain("COINS_STORAGE_KEY");
    expect(screen).not.toContain("setItem(COINS");
  });
});

describe("storage round-trip", () => {
  it("save then load returns the same mine", async () => {
    const s = mineOut(stateWith(2), 0, T0, 0.9);
    await saveMineState(s);
    const loaded = await loadMineState(T0);
    expect(loaded).toEqual(s);
    expect(JSON.parse(store.get(MINE_KEY)!).pickTier).toBe(2);
  });

  it("a first-ever load is the starter mine: Wood pick, empty satchel", async () => {
    const loaded = await loadMineState(T0);
    expect(loaded.pickTier).toBe(0);
    expect(loaded.satchel).toEqual({ iron: 0, gold: 0, diamond: 0 });
    expect(loaded.faces).toHaveLength(FACE_COUNT);
  });

  it("load settles: a face mined out yesterday is whole this morning", async () => {
    const mined = mineOut(stateWith(0, T0 - 24 * HOUR), 0, T0 - 24 * HOUR);
    await saveMineState(mined);
    const loaded = await loadMineState(T0);
    expect(loaded.faces[0].minedAt).toBeNull();
  });

  it("corrupt stored shapes parse back to a safe mine", () => {
    const parsed = parseMineState({ pickTier: 99, satchel: { iron: -3, gold: 2.7 }, faces: "nope", minedToday: -1 }, T0);
    expect(parsed.pickTier).toBe(5); // clamped to the ladder's top
    expect(parsed.satchel).toEqual({ iron: 0, gold: 2, diamond: 0 });
    expect(parsed.faces).toHaveLength(FACE_COUNT);
    expect(parsed.minedToday).toBe(0);
    expect(parseMineState(null, T0).pickTier).toBe(0);
    expect(parseMineState("garbage", T0).faces).toHaveLength(FACE_COUNT);
  });
});

describe("prestige reset — the gear precedent", () => {
  it("Begin Again restarts the ladder at Wood and empties the satchel", async () => {
    const rich = { ...stateWith(5), satchel: { iron: 40, gold: 9, diamond: 3 }, minedToday: 7 };
    await saveMineState(rich);
    await resetMineForPrestige(T0);
    const loaded = await loadMineState(T0);
    expect(loaded.pickTier).toBe(0);
    expect(loaded.satchel).toEqual({ iron: 0, gold: 0, diamond: 0 });
    expect(loaded.minedToday).toBe(0);
    expect(loaded.faces.every((f) => f.minedAt === null && f.hitsLeft === null)).toBe(true);
  });

  it("performPrestige actually calls the mine reset", () => {
    const src = readFileSync(join(process.cwd(), "lib/prestige.ts"), "utf8");
    expect(src).toContain("resetMineForPrestige()");
  });
});

describe("the mountain on the town map", () => {
  it("the Great Peak is mounted on the town map only, and opens the mine", () => {
    const src = readFileSync(join(process.cwd(), "app/hometown.tsx"), "utf8");
    expect(src).toContain('activeMap === "town"');
    expect(src).toContain("GreatPeakArt");
    expect(src).toContain('router.push("/mine-interior")');
    // Town only: the peak must not leak onto city or school — the one
    // render is gated on the town map.
    const peakAt = src.indexOf("<GreatPeakArt");
    const gateAt = src.lastIndexOf('activeMap === "town"', peakAt);
    expect(gateAt).toBeGreaterThan(-1);
    expect(peakAt - gateAt).toBeLessThan(600);
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
    // the entrance shaft carries the same warm welcome inside
    expect(screen).toContain("PaperGlowDisc");
    expect(screen).toContain("PaperPulse");
  });
});
