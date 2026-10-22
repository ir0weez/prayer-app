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

/** Total coin value of a satchel's contents. */
export function satchelValue(satchel: Satchel): number {
  return ORE_KINDS.reduce((sum, k) => sum + (satchel[k] || 0) * ORE_PRICES[k], 0);
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

export type MineTapOutcome =
  | { kind: "hit"; hitsLeft: number }
  | { kind: "broke"; yield: Partial<Satchel> }
  | { kind: "locked"; requiredPick: number }
  | { kind: "resting"; readyAt: number }
  | { kind: "cap" };

/**
 * One tap on a face. Settles first (timestamps, never timers), then:
 * locked when the pick is under the band's tier, resting while a
 * mined-out face regrows, cap when the day's faces are spent — else a
 * hit, and the breaking hit pays the yield into the satchel.
 */
export function mineTap(
  stateIn: MineState,
  faceIndex: number,
  nowMs: number,
  roll: number
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

  const max = effectiveHits(band, state.pickTier);
  const current = face.hitsLeft ?? max;
  const hitsLeft = current - 1;

  if (hitsLeft > 0) {
    const faces = state.faces.slice();
    faces[idx] = { hitsLeft, minedAt: null };
    return { state: { ...state, faces }, outcome: { kind: "hit", hitsLeft } };
  }

  const y = yieldForFace(bandIndex, state.pickTier, roll);
  const satchel: Satchel = {
    iron: state.satchel.iron + (y.iron ?? 0),
    gold: state.satchel.gold + (y.gold ?? 0),
    diamond: state.satchel.diamond + (y.diamond ?? 0),
  };
  const faces = state.faces.slice();
  faces[idx] = { hitsLeft: null, minedAt: nowMs };
  return {
    state: { ...state, faces, satchel, minedToday: state.minedToday + 1 },
    outcome: { kind: "broke", yield: y },
  };
}

// ---- Selling ------------------------------------------------------------------

/** Empty the satchel; returns the coin total for the ledger. */
export function applySellAll(state: MineState): { state: MineState; coins: number } {
  const coins = satchelValue(state.satchel);
  if (coins <= 0) return { state, coins: 0 };
  return { state: { ...state, satchel: emptySatchel() }, coins };
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
 * every face whole. Called by lib/prestige's performPrestige.
 */
export async function resetMineForPrestige(nowMs: number = Date.now()): Promise<void> {
  await saveMineState(defaultMineState(nowMs));
}
