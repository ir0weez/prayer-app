// The Mountain and the mine inside it (v168; naming corrected v169).
//
// Jonathan's pitch (2026-10-21): "there needs to be a mountain at the
// top. Something that says 'safety'. Perhaps having [it] can bring you
// to a new map. Cave the mountain. One where you can mine and get gold
// and iron and diamonds. You need to upgrade your tools to get the more
// expensive stuff, and that will require prestiging... Think Minecraft,
// except obviously less explorable."
//
// NAMING (his correction, 2026-10-22): "When I said the cave should
// say safety, I meant the vibe should feel safe." That word is the
// intended FEELING — refuge, shelter, welcome — never a literal name.
// v168 etched the word into the arch and named the place; v169 took
// the word back out. The mountain and its mine carry NO name beyond
// the plain description below, and the safe feeling is rendered in
// the art (warm light at the cave mouth, a hearth glow inside).
// Future builds must not re-add the word as a name anywhere here.
//
// Design approved from the mockups the same day: the Great Peak crowns
// the town map (components/great-peak.tsx); inside is the Dig Wall — four strata
// of tappable rock faces (Stone / Iron / Gold / The Deep). This lib is
// the mine's whole logic: pure functions over a small stored record.
//
// Rules carried from the spec and his standing orders:
//  - Faces refresh by TIMESTAMP SETTLE — a mined-out face returns when
//    enough hours have passed, computed on open/render. There are NO
//    background timers anywhere in this system.
//  - A daily cap on faces mined, like the mini-games' caps. Prayer
//    stays the economy's engine: ore prices are tuned as a supplement,
//    well under what buildings and villagers bring in.
//  - Ore sells for coins through the canonical ledger ONLY (the screen
//    calls applyCoinsDelta from lib/hometown) — this lib never touches
//    the coins record.
//  - The pickaxe ladder climbs into prestige: Diamond waits behind
//    Begin Again (any prestige), the Crown Pick behind a Crown — read
//    from lib/prestige's own state, never a parallel flag.
//  - Prestige RESET (mirroring the gear precedent in performPrestige):
//    the pickaxe ladder starts over at Wood and the satchel empties.
//    Sell your ore before you Begin Again.
//
// v170 — danger and reward (Jonathan's picks, 2026-10-22): the Gold
// band and the Deep are UNSTABLE — a cracked face there can come down
// on the next hit (cave-in: the face is lost, part of the unsold
// satchel is buried, and the hero takes an HP hit through
// lib/hero-health — the screen applies it; this lib only decides the
// fall). Any face can hide a RICH VEIN (deterministic per face per
// day, revealed at the first crack, paying double — a cluster of
// diamonds in the Deep). And breaking a Deep face can reveal the
// STILL POOL: drink for a full heal or a forest blessing till
// midnight (lib/hero-needs' pool boon). His guardrails hold: banked
// coins are never touched, fasting hearts are never involved, and a
// collapse that would drop the hero to zero wakes him at home at the
// defeat floor instead — the screen runs that path via hero-health.
//
// v172 — the Mouth and the haul (Jonathan, 2026-10-22): the peak now
// opens on the cave MOUTH — a setup area above ground (relax by the
// hearth, check the pick, sell the satchel) — and only from there
// does the hero step into the cave. Selling moved OUT of the cave
// entirely: ore converts to coins at the Mouth and nowhere else.
// The push-your-luck heart of it is the HAUL MULTIPLIER: breaking a
// face raises the haul to that band's multiplier (Stone ×1, Iron
// ×1.5, Gold ×2, The Deep ×3) — the deepest band worked since the
// last sell — and the whole satchel sells at that rate at the Mouth.
// A cave-in spends the promise: the multiplier falls back to ×1
// along with everything else v170 already took. And the satchel
// itself has a size now: BAGS cap how many pieces of ore it holds,
// bought one tier at a time at the Mouth counter — a full bag ends
// the digging until it's hauled up and sold, which is the rhythm
// the whole loop now breathes to.

import AsyncStorage from "@react-native-async-storage/async-storage";

export const MINE_KEY = "prayercircle.hometown.mine.v1";

/** The mine screen's title — plain and descriptive, on purpose.
 *  The mountain has no name; see the naming note at the top. */
export const MINE_TITLE = "The Mine";

// ---- Ore ----------------------------------------------------------------

export type OreKind = "iron" | "gold" | "diamond";

export const ORE_KINDS: OreKind[] = ["iron", "gold", "diamond"];

/** Coins paid per unit of ore when the satchel is sold. */
export const ORE_PRICES: Record<OreKind, number> = {
  iron: 12,
  gold: 45,
  diamond: 220,
};

export type Satchel = Record<OreKind, number>;

export function emptySatchel(): Satchel {
  return { iron: 0, gold: 0, diamond: 0 };
}

/** Total coin value of a satchel's contents (at face value, ×1). */
export function satchelValue(satchel: Satchel): number {
  return ORE_KINDS.reduce((sum, k) => sum + (satchel[k] || 0) * ORE_PRICES[k], 0);
}

/** Total PIECES of ore in the satchel — what the bag's capacity
 *  counts (a diamond takes the same room as a fleck of iron). */
export function satchelCount(satchel: Satchel): number {
  return ORE_KINDS.reduce((sum, k) => sum + (satchel[k] || 0), 0);
}

// ---- Strata ---------------------------------------------------------------

export type MineBand = {
  id: string;
  name: string;
  /** Pickaxe tier required to mine this band at all. */
  requiredPick: number;
  /** Taps to break a face with an exactly-tiered pick. */
  hits: number;
  /** Hours a mined-out face takes to settle back. */
  regrowHours: number;
  /** The stratum's paper color (the band behind the faces). */
  color: string;
  /** The rock faces' paper color. */
  faceColor: string;
};

export const MINE_BANDS: MineBand[] = [
  { id: "stone", name: "Stone", requiredPick: 0, hits: 2, regrowHours: 2, color: "#9A9AA5", faceColor: "#B4B4BE" },
  { id: "iron", name: "Iron", requiredPick: 1, hits: 3, regrowHours: 3, color: "#7D6A63", faceColor: "#96837A" },
  { id: "gold", name: "Gold", requiredPick: 2, hits: 4, regrowHours: 4, color: "#5C4A72", faceColor: "#77648F" },
  { id: "deep", name: "The Deep", requiredPick: 3, hits: 5, regrowHours: 6, color: "#2A1A33", faceColor: "#453257" },
];

export const FACES_PER_BAND = 3;
export const FACE_COUNT = MINE_BANDS.length * FACES_PER_BAND;

/** Faces that may be broken per day (the mini-game-style daily cap). */
export const DAILY_FACE_CAP = 24;

// ---- The haul multiplier (v172) -----------------------------------------

/** What a band does to the haul: the deeper the rock you've broken
 *  since the last sell, the more the WHOLE satchel is worth when it
 *  finally sells at the Mouth — Stone pays face value, the Deep
 *  triples it. Indexed by band (same order as MINE_BANDS). */
export const BAND_MULTIPLIERS: number[] = [1, 1.5, 2, 3];

export function bandMultiplier(bandIndex: number): number {
  const i = Math.min(Math.max(Math.floor(bandIndex) || 0, 0), BAND_MULTIPLIERS.length - 1);
  return BAND_MULTIPLIERS[i];
}

/** "×1.5" without the trailing-zero noise: 1, 1.5, 2, 3. */
export function formatHaulMultiplier(m: number): string {
  return m % 1 === 0 ? String(m) : m.toFixed(1);
}

/** What the satchel in hand sells for at the Mouth: face value at
 *  the current haul multiplier, rounded to whole coins (the app's
 *  coin display is whole numbers everywhere). */
export function haulValue(state: MineState): number {
  return Math.round(satchelValue(state.satchel) * state.haulMultiplier);
}

// ---- Satchel bags (v172) --------------------------------------------------

export type SatchelBag = {
  tier: number;
  name: string;
  /** Total ore PIECES the bag holds. */
  capacity: number;
  /** Coin cost to buy (0 = the starter, owned from the beginning). */
  cost: number;
  /** The top bag belongs to the Crown, like the Crown Pick. */
  gate: PickGate;
};

/** The bag ladder, sold one tier at a time at the Mouth counter.
 *  A full bag is the mine's natural clock: when it fills, the trip
 *  is over — haul it up, sell, and the multiplier banks with it. */
export const SATCHEL_BAGS: SatchelBag[] = [
  { tier: 0, name: "Canvas Bag", capacity: 20, cost: 0, gate: "none" },
  { tier: 1, name: "Sturdy Bag", capacity: 30, cost: 750, gate: "none" },
  { tier: 2, name: "Miner's Pack", capacity: 45, cost: 3000, gate: "none" },
  { tier: 3, name: "Deep Haul Satchel", capacity: 70, cost: 12000, gate: "none" },
  { tier: 4, name: "Crown Haul Bag", capacity: 120, cost: 50000, gate: "crown" },
];

export const MAX_BAG_TIER = SATCHEL_BAGS.length - 1;

export function bagFor(tier: number): SatchelBag {
  const t = Math.min(Math.max(Math.floor(tier) || 0, 0), MAX_BAG_TIER);
  return SATCHEL_BAGS[t];
}

/** How many pieces the hero's current bag holds. */
export function satchelCapacity(state: MineState): number {
  return bagFor(state.bagTier).capacity;
}

/** A full bag refuses the next swing — mining resumes only once
 *  the satchel is sold down below capacity at the Mouth. (A face
 *  that BREAKS always pays in full, so a satchel can sit a few
 *  pieces over its cap right after a rich break; it's still full.) */
export function satchelIsFull(state: MineState): boolean {
  return satchelCount(state.satchel) >= satchelCapacity(state);
}

export type BagPurchaseCheck =
  | { ok: true; cost: number }
  | { ok: false; reason: "owned" | "order" | "crown" };

/** Validate buying bag `tier` while owning `ownedTier`: one rung
 *  at a time, and the Crown Haul Bag reads the same Crown gate as
 *  the Crown Pick (lib/prestige's state, via MineGates). */
export function bagPurchaseCheck(ownedTier: number, tier: number, gates: MineGates): BagPurchaseCheck {
  if (tier <= ownedTier) return { ok: false, reason: "owned" };
  if (tier > ownedTier + 1) return { ok: false, reason: "order" };
  if (bagFor(tier).gate === "crown" && (gates.crowns || 0) < 1) {
    return { ok: false, reason: "crown" };
  }
  return { ok: true, cost: bagFor(tier).cost };
}

// ---- Danger and reward (v170) ----------------------------------------------

/** Band indexes whose rock is unstable: Gold (2) and The Deep (3).
 *  Stone and Iron never come down — the danger lives where the
 *  money is. */
export function isUnstableBand(bandIndex: number): boolean {
  return bandIndex === 2 || bandIndex === 3;
}

/** Collapse chance for each hit on an ALREADY-CRACKED face in an
 *  unstable band. The first crack is the warning (the rock groans);
 *  every hit after it is the player's own gamble. */
export const COLLAPSE_CHANCE: Record<number, number> = { 2: 0.12, 3: 0.2 };

export function collapseChanceFor(bandIndex: number): number {
  return COLLAPSE_CHANCE[bandIndex] ?? 0;
}

/** Fraction of each unsold ore a cave-in buries (rounded down per
 *  kind). The banked coins are never touched — only what's still in
 *  the satchel is at risk. */
export const CAVE_IN_BURIAL_FRACTION = 0.5;

/** Split a satchel into what a cave-in leaves and what it buries. */
export function burySatchel(satchel: Satchel): { kept: Satchel; buried: Satchel } {
  const kept = emptySatchel();
  const buried = emptySatchel();
  for (const k of ORE_KINDS) {
    buried[k] = Math.floor((satchel[k] || 0) * CAVE_IN_BURIAL_FRACTION);
    kept[k] = (satchel[k] || 0) - buried[k];
  }
  return { kept, buried };
}

/** FNV-1a hash → 32-bit seed (the same pattern as lib/surprise-visitors). */
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mulberry32 seeded RNG (same pattern as lib/surprise-visitors). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Chance a face hides a rich vein on a given day. */
export const RICH_FACE_CHANCE = 0.15;

/**
 * Whether a face hides a rich vein on `day` — deterministic per face
 * per day (seeded by face + date, like the day's other quiet rolls),
 * so every render agrees and the vein is revealed the moment the
 * face first cracks.
 */
export function isRichFace(faceIndex: number, day: string): boolean {
  return mulberry32(hashStr(`mine|rich:${day}:${faceIndex}`))() < RICH_FACE_CHANCE;
}

/** Chance that breaking a Deep face reveals the still pool (only
 *  while no unspent pool is already showing). */
export const POOL_REVEAL_CHANCE = 0.1;

/** Which band a face index (0..FACE_COUNT-1, top band first) belongs to. */
export function bandIndexForFace(faceIndex: number): number {
  const i = Math.min(Math.max(Math.floor(faceIndex) || 0, 0), FACE_COUNT - 1);
  return Math.floor(i / FACES_PER_BAND);
}

/** Taps to break a face of the band with the given pick: a stronger
 *  pick cracks lesser rock faster (up to 2 taps saved), never below 1. */
export function effectiveHits(band: MineBand, pickTier: number): number {
  const saved = Math.min(Math.max(pickTier - band.requiredPick, 0), 2);
  return Math.max(1, band.hits - saved);
}

// ---- Pickaxes ---------------------------------------------------------------

export type PickGate = "none" | "prestige" | "crown";

export type Pickaxe = {
  tier: number;
  name: string;
  /** Coin cost to buy (0 = the starter, owned from the beginning). */
  cost: number;
  /** Paper color of the pick's head. */
  color: string;
  gate: PickGate;
};

export const PICKAXES: Pickaxe[] = [
  { tier: 0, name: "Wood Pick", cost: 0, color: "#B98A52", gate: "none" },
  { tier: 1, name: "Stone Pick", cost: 250, color: "#9C93AC", gate: "none" },
  { tier: 2, name: "Iron Pick", cost: 1200, color: "#7E8CA3", gate: "none" },
  { tier: 3, name: "Gold Pick", cost: 5000, color: "#F2B33D", gate: "none" },
  { tier: 4, name: "Diamond Pick", cost: 25000, color: "#9BE8F5", gate: "prestige" },
  { tier: 5, name: "Crown Pick", cost: 100000, color: "#C9963C", gate: "crown" },
];

export const MAX_PICK_TIER = PICKAXES.length - 1;

export function pickaxeFor(tier: number): Pickaxe {
  const t = Math.min(Math.max(Math.floor(tier) || 0, 0), MAX_PICK_TIER);
  return PICKAXES[t];
}

/** The prestige facts the ladder's gates read — taken from
 *  lib/prestige's own state (totalPrestiges + the Crown level key). */
export type MineGates = {
  /** Total Begin Agains taken, any tier. */
  totalPrestiges: number;
  /** Crowns held (the prestige level). */
  crowns: number;
};

/** Whether the gate on a pick tier is satisfied. */
export function pickGateMet(tier: number, gates: MineGates): boolean {
  const gate = pickaxeFor(tier).gate;
  if (gate === "prestige") return (gates.totalPrestiges || 0) >= 1;
  if (gate === "crown") return (gates.crowns || 0) >= 1;
  return true;
}

export type PickPurchaseCheck =
  | { ok: true; cost: number }
  | { ok: false; reason: "owned" | "order" | "prestige" | "crown" };

/** Validate buying `tier` while owning `ownedTier`: the ladder is
 *  climbed one rung at a time, and the top two rungs are gated. */
export function pickPurchaseCheck(ownedTier: number, tier: number, gates: MineGates): PickPurchaseCheck {
  if (tier <= ownedTier) return { ok: false, reason: "owned" };
  if (tier > ownedTier + 1) return { ok: false, reason: "order" };
  const gate = pickaxeFor(tier).gate;
  if (gate === "prestige" && !pickGateMet(tier, gates)) return { ok: false, reason: "prestige" };
  if (gate === "crown" && !pickGateMet(tier, gates)) return { ok: false, reason: "crown" };
  return { ok: true, cost: pickaxeFor(tier).cost };
}

// ---- State ------------------------------------------------------------------

export type MineFaceState = {
  /** Taps remaining before the face breaks; null = untouched (full). */
  hitsLeft: number | null;
  /** When the face was mined out (ms epoch); null = not mined out. */
  minedAt: number | null;
};

export type MineState = {
  /** The best pickaxe owned (a PICKAXES tier). */
  pickTier: number;
  satchel: Satchel;
  /** FACE_COUNT faces, top band first. */
  faces: MineFaceState[];
  /** Day the daily counter belongs to, YYYY-MM-DD (local). */
  day: string;
  /** Faces broken today, against DAILY_FACE_CAP. */
  minedToday: number;
  /** Face index (in The Deep) where the still pool is showing,
   *  revealed and not yet drunk — or null. It stays until used:
   *  settle and day rollovers never clear it. */
  poolFace: number | null;
  /** The satchel bag owned (a SATCHEL_BAGS tier, v172). */
  bagTier: number;
  /** The haul multiplier (v172): the deepest band's BAND_MULTIPLIERS
   *  value broken since the last sell or cave-in. Sells multiply
   *  by it; a cave-in spends it back to ×1. */
  haulMultiplier: number;
};

export function mineTodayString(nowMs: number = Date.now()): string {
  const d = new Date(nowMs);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function defaultMineState(nowMs: number = Date.now()): MineState {
  return {
    pickTier: 0,
    satchel: emptySatchel(),
    faces: Array.from({ length: FACE_COUNT }, () => ({ hitsLeft: null, minedAt: null })),
    day: mineTodayString(nowMs),
    minedToday: 0,
    poolFace: null,
    bagTier: 0,
    haulMultiplier: 1,
  };
}

function cleanCount(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

export function parseMineState(value: unknown, nowMs: number = Date.now()): MineState {
  const base = defaultMineState(nowMs);
  if (!value || typeof value !== "object") return base;
  const v = value as Partial<MineState>;
  const faces: MineFaceState[] = base.faces.map((fresh, i) => {
    const f = Array.isArray(v.faces) ? (v.faces[i] as Partial<MineFaceState> | undefined) : undefined;
    if (!f || typeof f !== "object") return fresh;
    return {
      hitsLeft:
        typeof f.hitsLeft === "number" && Number.isFinite(f.hitsLeft) && f.hitsLeft >= 1
          ? Math.floor(f.hitsLeft)
          : null,
      minedAt:
        typeof f.minedAt === "number" && Number.isFinite(f.minedAt) && f.minedAt > 0
          ? f.minedAt
          : null,
    };
  });
  const poolFace =
    typeof v.poolFace === "number" && Number.isFinite(v.poolFace) &&
    Math.floor(v.poolFace) >= 0 && Math.floor(v.poolFace) < FACE_COUNT &&
    bandIndexForFace(Math.floor(v.poolFace)) === 3
      ? Math.floor(v.poolFace)
      : null;
  // v172 fields: a v170-era record carries neither — the bag is the
  // starter Canvas and the haul stands at ×1. A legacy satchel that
  // already holds more than the Canvas Bag's 20 is KEPT whole
  // (grandfathered); it just can't grow until it's sold down.
  const haulMultiplier =
    typeof v.haulMultiplier === "number" && BAND_MULTIPLIERS.includes(v.haulMultiplier)
      ? v.haulMultiplier
      : 1;
  return {
    pickTier: Math.min(Math.max(Math.floor(typeof v.pickTier === "number" ? v.pickTier : 0) || 0, 0), MAX_PICK_TIER),
    satchel: {
      iron: cleanCount(v.satchel?.iron),
      gold: cleanCount(v.satchel?.gold),
      diamond: cleanCount(v.satchel?.diamond),
    },
    faces,
    day: typeof v.day === "string" && v.day ? v.day : base.day,
    minedToday: cleanCount(v.minedToday),
    poolFace,
    bagTier: Math.min(Math.max(Math.floor(typeof v.bagTier === "number" ? v.bagTier : 0) || 0, 0), MAX_BAG_TIER),
    haulMultiplier,
  };
}

// ---- Settle -----------------------------------------------------------------

/** When a mined-out face returns (ms epoch). */
export function faceReadyAt(face: MineFaceState, faceIndex: number): number | null {
  if (face.minedAt == null) return null;
  const band = MINE_BANDS[bandIndexForFace(faceIndex)];
  return face.minedAt + band.regrowHours * 60 * 60 * 1000;
}

/**
 * Settle a state to `nowMs` with NO timers: a new day zeroes the daily
 * counter, and every mined-out face whose regrow hours have elapsed is
 * whole again. Returns the SAME object when nothing changed, so callers
 * can cheaply decide whether to persist.
 */
export function settleMineState(state: MineState, nowMs: number): MineState {
  let next = state;
  const today = mineTodayString(nowMs);
  if (next.day !== today) {
    next = { ...next, day: today, minedToday: 0 };
  }
  let facesChanged = false;
  const faces = next.faces.map((face, i) => {
    if (face.minedAt == null) return face;
    const readyAt = faceReadyAt(face, i);
    if (readyAt != null && nowMs >= readyAt) {
      facesChanged = true;
      return { hitsLeft: null, minedAt: null };
    }
    return face;
  });
  if (facesChanged) next = { ...next, faces };
  return next;
}

/** A face's display status at `nowMs` (after settle). */
export type FaceStatus = "ready" | "cracked" | "resting";

export function faceStatus(state: MineState, faceIndex: number): FaceStatus {
  const face = state.faces[faceIndex];
  if (!face) return "ready";
  if (face.minedAt != null) return "resting";
  if (face.hitsLeft != null) return "cracked";
  return "ready";
}

/** Whether the pick can mine this band at all. */
export function canPickBand(state: MineState, faceIndex: number): boolean {
  return state.pickTier >= MINE_BANDS[bandIndexForFace(faceIndex)].requiredPick;
}

/** The rumble warning: a CRACKED face in an unstable band (Gold /
 *  The Deep). It shows from the first crack, so the collapse risk on
 *  the next hit is never a surprise. */
export function faceRumbles(state: MineState, faceIndex: number): boolean {
  return isUnstableBand(bandIndexForFace(faceIndex)) && faceStatus(state, faceIndex) === "cracked";
}

/** Drink the still pool: the pool is spent and fades; the face under
 *  it keeps its own lifecycle (it was mined out when it broke). The
 *  drink's EFFECT (full heal / forest blessing) is the screen's work,
 *  through lib/hero-health and lib/hero-needs. */
export function spendPool(state: MineState): MineState {
  if (state.poolFace == null) return state;
  return { ...state, poolFace: null };
}

// ---- Mining -----------------------------------------------------------------

/** Ore from one broken face. `roll` is a [0,1) random kept as a
 *  parameter so the table is testable without seeding Math.random. */
export function yieldForFace(bandIndex: number, pickTier: number, roll: number): Partial<Satchel> {
  const r = Math.min(Math.max(roll, 0), 0.999999);
  switch (bandIndex) {
    case 0: // Stone — iron flecks in common rock
      return { iron: r >= 0.75 ? 2 : 1 };
    case 1: // Iron — the working band
      return { iron: r >= 0.6 ? 3 : 2 };
    case 2: { // Gold — seams of gold, richer under the Crown Pick
      const gold = (r >= 0.65 ? 2 : 1) + (pickTier >= 5 ? 1 : 0);
      return { gold };
    }
    default: { // The Deep — diamonds sleep here
      if (r < 0.55) {
        return { diamond: 1 + (pickTier >= 4 ? 1 : 0) };
      }
      return { gold: 2 + (pickTier >= 4 ? 1 : 0) + (pickTier >= 5 ? 1 : 0) };
    }
  }
}

/** What one face pays, rich vein applied: everything doubles, and a
 *  rich face in The Deep that was sleeping on diamonds wakes a whole
 *  cluster (2–3, by the same roll) instead of a single stone. The
 *  prestige picks' own bonuses ride on top, as before. */
export function richYieldForFace(bandIndex: number, pickTier: number, roll: number): Partial<Satchel> {
  const base = yieldForFace(bandIndex, pickTier, roll);
  if (bandIndex === 3 && (base.diamond ?? 0) > 0) {
    const pickBonus = pickTier >= 4 ? 1 : 0;
    return { diamond: (roll >= 0.5 ? 3 : 2) + pickBonus };
  }
  const out: Partial<Satchel> = {};
  for (const k of ORE_KINDS) {
    const v = base[k];
    if (v) out[k] = v * 2;
  }
  return out;
}

export type MineTapOutcome =
  | { kind: "hit"; hitsLeft: number; rumbling: boolean }
  | { kind: "broke"; yield: Partial<Satchel>; rich: boolean; poolRevealed: boolean }
  | { kind: "collapse"; buried: Satchel; bandIndex: number }
  | { kind: "locked"; requiredPick: number }
  | { kind: "resting"; readyAt: number }
  | { kind: "cap" }
  | { kind: "full" };

/**
 * One tap on a face. Settles first (timestamps, never timers), then:
 * locked when the pick is under the band's tier, resting while a
 * mined-out face regrows, cap when the day's faces are spent, full
 * when the satchel bag has no room left (v172 — the swing is refused
 * before it can damage anything) — else a hit, and the breaking hit
 * pays the yield into the satchel and raises the haul multiplier to
 * the band's rate.
 *
 * Danger (v170): a hit on an ALREADY-CRACKED face in an unstable band
 * first rolls `collapseRoll` against the band's collapse chance — a
 * fall destroys the face (normal regrow), buries part of the unsold
 * satchel, and ends the trip (the screen applies the hero's HP hit
 * and carries him out). The breaking hit rolls the same way: the
 * gamble lasts until the face is down. `collapseRoll`/`poolRoll`
 * default to 1 (never triggers) so plain callers stay safe; both are
 * parameters for the same reason `roll` is.
 *
 * Reward (v170): a rich face (isRichFace for the settled day) pays
 * richYieldForFace; breaking a Deep face rolls `poolRoll` for the
 * still pool when none is showing.
 */
export function mineTap(
  stateIn: MineState,
  faceIndex: number,
  nowMs: number,
  roll: number,
  collapseRoll: number = 1,
  poolRoll: number = 1
): { state: MineState; outcome: MineTapOutcome } {
  const state = settleMineState(stateIn, nowMs);
  const idx = Math.min(Math.max(Math.floor(faceIndex) || 0, 0), FACE_COUNT - 1);
  const bandIndex = bandIndexForFace(idx);
  const band = MINE_BANDS[bandIndex];
  const face = state.faces[idx];

  if (state.pickTier < band.requiredPick) {
    return { state, outcome: { kind: "locked", requiredPick: band.requiredPick } };
  }
  if (face.minedAt != null) {
    return { state, outcome: { kind: "resting", readyAt: faceReadyAt(face, idx) ?? nowMs } };
  }
  if (state.minedToday >= DAILY_FACE_CAP) {
    return { state, outcome: { kind: "cap" } };
  }
  // A full bag refuses the swing outright (v172): no damage, no
  // collapse roll — the pick never leaves his shoulder. Haul the
  // satchel up to the Mouth and sell before digging again.
  if (satchelIsFull(state)) {
    return { state, outcome: { kind: "full" } };
  }

  // Cave-in: only a face already carrying cracks can come down, and
  // only in the unstable bands. The first crack was the warning.
  // The fall spends the haul multiplier too (v172): whatever the
  // deep rock promised, the satchel that survives sells at ×1.
  if (face.hitsLeft != null && collapseRoll < collapseChanceFor(bandIndex)) {
    const { kept, buried } = burySatchel(state.satchel);
    const faces = state.faces.slice();
    faces[idx] = { hitsLeft: null, minedAt: nowMs };
    return {
      state: { ...state, faces, satchel: kept, minedToday: state.minedToday + 1, haulMultiplier: 1 },
      outcome: { kind: "collapse", buried, bandIndex },
    };
  }

  const max = effectiveHits(band, state.pickTier);
  const current = face.hitsLeft ?? max;
  const hitsLeft = current - 1;

  if (hitsLeft > 0) {
    const faces = state.faces.slice();
    faces[idx] = { hitsLeft, minedAt: null };
    return {
      state: { ...state, faces },
      outcome: { kind: "hit", hitsLeft, rumbling: isUnstableBand(bandIndex) },
    };
  }

  const rich = isRichFace(idx, state.day);
  const y = rich
    ? richYieldForFace(bandIndex, state.pickTier, roll)
    : yieldForFace(bandIndex, state.pickTier, roll);
  const satchel: Satchel = {
    iron: state.satchel.iron + (y.iron ?? 0),
    gold: state.satchel.gold + (y.gold ?? 0),
    diamond: state.satchel.diamond + (y.diamond ?? 0),
  };
  const faces = state.faces.slice();
  faces[idx] = { hitsLeft: null, minedAt: nowMs };
  const poolRevealed =
    bandIndex === 3 && state.poolFace == null && poolRoll < POOL_REVEAL_CHANCE;
  return {
    state: {
      ...state,
      faces,
      satchel,
      minedToday: state.minedToday + 1,
      poolFace: poolRevealed ? idx : state.poolFace,
      // Breaking deep rock raises the whole haul (v172): the
      // multiplier tracks the deepest band broken since the last
      // sell or cave-in, and never steps back down on its own.
      haulMultiplier: Math.max(state.haulMultiplier, bandMultiplier(bandIndex)),
    },
    outcome: { kind: "broke", yield: y, rich, poolRevealed },
  };
}

// ---- Selling ------------------------------------------------------------------

/**
 * Empty the satchel at the Mouth counter — the ONLY place ore
 * becomes coins (v172; the cave itself sells nothing). The total is
 * the satchel's face value at the haul multiplier, rounded to whole
 * coins, and selling banks the run: the multiplier resets to ×1
 * for the next descent. Returns the coin total for the ledger.
 */
export function applySellAll(state: MineState): { state: MineState; coins: number } {
  const coins = haulValue(state);
  if (coins <= 0) return { state, coins: 0 };
  return { state: { ...state, satchel: emptySatchel(), haulMultiplier: 1 }, coins };
}

// ---- Storage ------------------------------------------------------------------

export async function saveMineState(state: MineState): Promise<void> {
  try {
    await AsyncStorage.setItem(MINE_KEY, JSON.stringify(state));
  } catch {}
}

/** Load, settle to now, and persist when the settle changed anything —
 *  so a stored record is never older than its own timestamps say. */
export async function loadMineState(nowMs: number = Date.now()): Promise<MineState> {
  let parsed: MineState;
  try {
    const raw = await AsyncStorage.getItem(MINE_KEY);
    parsed = parseMineState(raw ? JSON.parse(raw) : null, nowMs);
  } catch {
    parsed = defaultMineState(nowMs);
  }
  const settled = settleMineState(parsed, nowMs);
  if (settled !== parsed) await saveMineState(settled);
  return settled;
}

/**
 * The prestige reset, mirroring the gear precedent in performPrestige:
 * owned gear resets, so does the pickaxe — back to Wood, satchel empty,
 * every face whole, and (v172) the bag back to the starter Canvas
 * with the haul multiplier at ×1 — all of it rides the default state.
 * Called by lib/prestige's performPrestige.
 */
export async function resetMineForPrestige(nowMs: number = Date.now()): Promise<void> {
  await saveMineState(defaultMineState(nowMs));
}
