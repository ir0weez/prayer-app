// The Mountain and the mine inside it (v168; naming corrected v169;
// the Deep Descent v175).
//
// Jonathan's pitch (2026-10-21): "there needs to be a mountain at the
// top. Something that says 'safety'. Perhaps having [it] can bring you
// to a new map. Cave the mountain. One where you can mine and get gold
// and iron and diamonds. You need to upgrade your tools to get the
// more expensive stuff, and that will require prestiging... Think
// Minecraft, except obviously less explorable."
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
// the town map (components/great-peak.tsx); inside was the Dig Wall.
// v170 added danger and reward (cave-ins, rich veins, the still pool,
// picks sold at the Tool Shop). v172 added the Mouth — the setup area
// where ore sells and ONLY there — the haul multiplier, and satchel
// bags.
//
// v175 — THE DEEP DESCENT (Jonathan's design, 2026-10-22): the four
// bands become EIGHT STRATA of TEN LEVELS each — Stone, Coal, Copper,
// Iron, Silver, Gold, Diamond, The Deep: 80 levels down. Breaking two
// faces on your deepest opened level cracks open the next; opened
// levels stay open (prestige aside), trips start at the deepest, and
// moving among opened levels is free. Every block BROKEN costs one
// FLAME — the Dark Forest's energy (lib/forest-energy), one shared
// daily pool for both wilds; swings are free, and at zero flames the
// breaking swing is refused with the face's cracks kept. The old
// 24-faces-a-day cap is GONE: flames are the limiter now. Ore grows
// more valuable with depth (a stratum's entry price, rising ~9% per
// level within the stratum), picks gate the strata, and the deeper
// you CAN go the more the whole HOMETOWN earns — the Depth Blessing,
// +0.25% town income per level opened, capped at +20%.
//
// Standing rules carried through every version:
//  - Faces refresh by TIMESTAMP SETTLE — a mined-out face returns when
//    enough hours have passed, computed on open/render. NO background
//    timers anywhere in this system.
//  - Ore sells for coins through the canonical ledger ONLY, and only
//    at the Mouth (the screens call applyCoinsDelta from
//    lib/hometown) — this lib never touches the coins record.
//  - The pickaxe ladder climbs into prestige: Diamond waits behind
//    Begin Again (any prestige), the Crown Pick behind a Crown — read
//    from lib/prestige's own state, never a parallel flag.
//  - Prestige RESET (mirroring the gear precedent in performPrestige):
//    the whole mine starts over — Wood pick, Pockets, no depth, no
//    mining gear, satchel empty. Sell your ore before you Begin Again.
//  - Prayer stays the economy's engine; the mine is a supplement, and
//    banked coins and fasting hearts are never at risk underground —
//    a cave-in can only bury UNSOLD ore, spend the haul multiplier,
//    and hit the hero's forest HP (through lib/hero-health; the
//    screen applies it, this lib only decides the fall).

import AsyncStorage from "@react-native-async-storage/async-storage";
import { grantForestEnergy } from "./forest-energy";

export const MINE_KEY = "prayercircle.hometown.mine.v1";

/** The mine screen's title — plain and descriptive, on purpose.
 *  The mountain has no name; see the naming note at the top. */
export const MINE_TITLE = "The Mine";

// ---- Ore ------------------------------------------------------------------

export type OreKind = "stone" | "coal" | "copper" | "iron" | "silver" | "gold" | "diamond";

export const ORE_KINDS: OreKind[] = ["stone", "coal", "copper", "iron", "silver", "gold", "diamond"];

/** Coins paid per unit of ore — FLAT across its whole stratum
 *  (v343; the v175 per-level step is removed — see unitPriceFor).
 *  Diamond has two homes: the Diamond stratum at 120, and The
 *  Deep's diamonds at 220 (DEEP_DIAMOND_BASE_PRICE). */
export const ORE_PRICES: Record<OreKind, number> = {
  stone: 3,
  coal: 6,
  copper: 10,
  iron: 14,
  silver: 26,
  gold: 45,
  diamond: 120,
};

/** The Deep's diamonds start richer than the Diamond stratum's. */
export const DEEP_DIAMOND_BASE_PRICE = 220;

/** The flat prices ore sold for before v175 — a legacy satchel's
 *  pieces migrate at exactly these, so no stored value is lost. */
export const LEGACY_ORE_PRICES: Record<"iron" | "gold" | "diamond", number> = {
  iron: 12,
  gold: 45,
  diamond: 220,
};

/**
 * One stack of ore in the satchel: pieces of one kind, all priced at
 * the unit value of the level where they were broken. A piece's worth
 * is fixed when it leaves the rock — depth is priced at the break,
 * and the haul multiplier is applied later, at the Mouth's till.
 */
export type SatchelStack = {
  ore: OreKind;
  /** Coin value of ONE piece of this stack. */
  unit: number;
  count: number;
};

export type Satchel = SatchelStack[];

export function emptySatchel(): Satchel {
  return [];
}

/** Total coin value of the satchel's contents (face value, ×1). */
export function satchelValue(satchel: Satchel): number {
  return satchel.reduce((sum, s) => sum + s.unit * s.count, 0);
}

/** Total PIECES of ore in the satchel — what the carry capacity
 *  counts (a diamond takes the same room as a chunk of stone). */
export function satchelCount(satchel: Satchel): number {
  return satchel.reduce((sum, s) => sum + s.count, 0);
}

/** Pieces per ore kind — the satchel panels' display shape. */
export function satchelByKind(satchel: Satchel): Record<OreKind, number> {
  const out: Record<OreKind, number> = { stone: 0, coal: 0, copper: 0, iron: 0, silver: 0, gold: 0, diamond: 0 };
  for (const s of satchel) out[s.ore] += s.count;
  return out;
}

/** Add broken ore to the satchel, priced at the level it broke on. */
export function addYieldToSatchel(satchel: Satchel, y: Partial<Record<OreKind, number>>, level: number): Satchel {
  const next = satchel.map((s) => ({ ...s }));
  for (const k of ORE_KINDS) {
    const n = y[k] ?? 0;
    if (n <= 0) continue;
    const unit = unitPriceFor(k, level);
    const existing = next.find((s) => s.ore === k && s.unit === unit);
    if (existing) existing.count += n;
    else next.push({ ore: k, unit, count: n });
  }
  return next;
}

// ---- Strata and levels (v175) ----------------------------------------------

export type MineStratum = {
  id: string;
  name: string;
  /** The ore this stratum's rock carries. */
  ore: OreKind;
  /** Pickaxe tier required to dig this stratum at all. */
  requiredPick: number;
  /** Taps to break a face with an exactly-tiered pick. */
  hits: number;
  /** Hours a mined-out face takes to settle back — scaling with
   *  depth, 2h at Stone to 6h in The Deep (the shipped mine's
   *  2/3/4/6-by-band pattern, interpolated across the eight strata). */
  regrowHours: number;
  /** Collapse chance per hit on an already-cracked face (0 = stable). */
  collapseChance: number;
  /** The stratum's paper color (the band behind the faces). */
  color: string;
  /** The rock faces' paper color. */
  faceColor: string;
  /** The ore flecks showing in the rock. */
  fleckColor: string;
};

export const LEVELS_PER_STRATUM = 10;
export const STRATA_COUNT = 8;
export const MAX_LEVEL = LEVELS_PER_STRATUM * STRATA_COUNT; // 80

export const MINE_STRATA: MineStratum[] = [
  { id: "stone",   name: "Stone",   ore: "stone",   requiredPick: 0, hits: 2, regrowHours: 2,   collapseChance: 0,    color: "#9A9AA5", faceColor: "#B4B4BE", fleckColor: "#8D8D99" },
  { id: "coal",    name: "Coal",    ore: "coal",    requiredPick: 0, hits: 2, regrowHours: 2.6, collapseChance: 0,    color: "#55555F", faceColor: "#6E6E7A", fleckColor: "#26262E" },
  { id: "copper",  name: "Copper",  ore: "copper",  requiredPick: 1, hits: 3, regrowHours: 3.1, collapseChance: 0,    color: "#7D5A44", faceColor: "#9C7248", fleckColor: "#F0A35E" },
  { id: "iron",    name: "Iron",    ore: "iron",    requiredPick: 2, hits: 3, regrowHours: 3.7, collapseChance: 0,    color: "#7D6A63", faceColor: "#96837A", fleckColor: "#C96F3F" },
  { id: "silver",  name: "Silver",  ore: "silver",  requiredPick: 3, hits: 4, regrowHours: 4.3, collapseChance: 0,    color: "#6E7A8C", faceColor: "#8B98AC", fleckColor: "#E8EEF7" },
  { id: "gold",    name: "Gold",    ore: "gold",    requiredPick: 4, hits: 4, regrowHours: 4.9, collapseChance: 0.12, color: "#5C4A72", faceColor: "#77648F", fleckColor: "#FBBF24" },
  { id: "diamond", name: "Diamond", ore: "diamond", requiredPick: 5, hits: 5, regrowHours: 5.4, collapseChance: 0.16, color: "#3A4A6B", faceColor: "#54688C", fleckColor: "#9BE8F5" },
  { id: "deep",    name: "The Deep", ore: "diamond", requiredPick: 6, hits: 5, regrowHours: 6,  collapseChance: 0.2,  color: "#2A1A33", faceColor: "#453257", fleckColor: "#9BE8F5" },
];

export const FACES_PER_LEVEL = 3;
export const FACE_COUNT = MAX_LEVEL * FACES_PER_LEVEL; // 240

/** Clamp any number into a legal level (1..80). */
export function clampLevel(level: number): number {
  const n = Math.floor(level);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, MAX_LEVEL);
}

/** Stratum index (0..7) of a level (1..80). */
export function stratumIndexForLevel(level: number): number {
  return Math.floor((clampLevel(level) - 1) / LEVELS_PER_STRATUM);
}

/** The level's position inside its stratum (1..10). */
export function levelInStratum(level: number): number {
  return ((clampLevel(level) - 1) % LEVELS_PER_STRATUM) + 1;
}

/** The first level of a stratum (Stone 1, Coal 11, …, The Deep 71). */
export function firstLevelOfStratum(stratumIndex: number): number {
  const i = Math.min(Math.max(Math.floor(stratumIndex) || 0, 0), STRATA_COUNT - 1);
  return i * LEVELS_PER_STRATUM + 1;
}

export function stratumForLevel(level: number): MineStratum {
  return MINE_STRATA[stratumIndexForLevel(level)];
}

/** Global face index of a level's slot (slot 0..2). */
export function faceIndexFor(level: number, slot: number): number {
  const s = Math.min(Math.max(Math.floor(slot) || 0, 0), FACES_PER_LEVEL - 1);
  return (clampLevel(level) - 1) * FACES_PER_LEVEL + s;
}

/** The level a global face index belongs to (1..80). */
export function levelForFace(faceIndex: number): number {
  const i = Math.min(Math.max(Math.floor(faceIndex) || 0, 0), FACE_COUNT - 1);
  return Math.floor(i / FACES_PER_LEVEL) + 1;
}

/** The slot (0..2) of a global face index within its level. */
export function slotForFace(faceIndex: number): number {
  const i = Math.min(Math.max(Math.floor(faceIndex) || 0, 0), FACE_COUNT - 1);
  return i % FACES_PER_LEVEL;
}

/** Stratum index of a global face index. */
export function stratumIndexForFace(faceIndex: number): number {
  return stratumIndexForLevel(levelForFace(faceIndex));
}

// ---- Ore value (v175; v343 flat) ----------------------------------------------

/**
 * What ONE piece of `ore` broken on `level` is worth: the ore's
 * FLAT base price — 3/6/10/14/26/45/120 down the ladder, and the
 * Deep's diamonds from their own richer base (220). v343 removed
 * the +9%-per-level step (LEVEL_VALUE_STEP): the same ore must be
 * worth the same money wherever it broke; depth pays through the
 * HAUL multiplier instead. Stacks already in a satchel keep the
 * unit value they were stamped with — stored data is untouched.
 * (`level` stays in the signature for its callers.)
 */
export function unitPriceFor(ore: OreKind, level: number): number {
  const base =
    ore === "diamond" && stratumIndexForLevel(level) === 7 ? DEEP_DIAMOND_BASE_PRICE : ORE_PRICES[ore];
  return Math.round(base);
}

// ---- The haul multiplier (v172, strata ladder v175; v343 bands) --------------

/** What a stratum does to the haul: the deeper the rock you've broken
 *  since the last sell, the more the WHOLE satchel is worth when it
 *  finally sells at the Mouth. v343: the ladder is the settled four
 *  bands — ×1 / ×1.5 / ×2 / ×3 — mapped across the eight strata in
 *  pairs (the old eight-step 1→3 ladder drifted from the spec).
 *  Indexed by stratum. */
export const STRATUM_MULTIPLIERS: number[] = [1, 1, 1.5, 1.5, 2, 2, 3, 3];

export function stratumMultiplier(stratumIndex: number): number {
  const i = Math.min(Math.max(Math.floor(stratumIndex) || 0, 0), STRATUM_MULTIPLIERS.length - 1);
  return STRATUM_MULTIPLIERS[i];
}

/** "×1.5" without trailing-zero noise: 1, 1.5, 2, 3 (v343 bands). */
export function formatHaulMultiplier(m: number): string {
  return String(Math.round(m * 100) / 100);
}

/** What the satchel in hand sells for at the Mouth: face value at
 *  the current haul multiplier, rounded to whole coins (the app's
 *  coin display is whole numbers everywhere). */
export function haulValue(state: MineState): number {
  return Math.round(satchelValue(state.satchel) * state.haulMultiplier);
}

// ---- The carry ladder (v175, replacing the v172 bags) -------------------------

/** The ladder's gates read the same prestige facts as the picks. */
export type PickGate = "none" | "prestige" | "crown";

export type SatchelBag = {
  tier: number;
  name: string;
  /** Total ore PIECES it holds. */
  capacity: number;
  /** Coin cost to buy (0 = the starter, owned from the beginning). */
  cost: number;
  gate: PickGate;
};

/** The carry ladder, sold one tier at a time at the Mouth counter —
 *  Jonathan's v175 shape: pockets at the top of the mountain, carts
 *  and wagons as the hauls grow. A full carrier is the mine's natural
 *  clock: when it fills, the trip is over — haul it up and sell. */
export const SATCHEL_BAGS: SatchelBag[] = [
  { tier: 0, name: "Pockets", capacity: 5, cost: 0, gate: "none" },
  { tier: 1, name: "Canvas Satchel", capacity: 10, cost: 150, gate: "none" },
  { tier: 2, name: "Sturdy Satchel", capacity: 18, cost: 500, gate: "none" },
  { tier: 3, name: "Miner's Backpack", capacity: 30, cost: 1500, gate: "none" },
  { tier: 4, name: "Framed Pack", capacity: 45, cost: 4000, gate: "none" },
  { tier: 5, name: "Hand Cart", capacity: 70, cost: 10000, gate: "none" },
  { tier: 6, name: "Rail Cart", capacity: 110, cost: 25000, gate: "none" },
  { tier: 7, name: "Deep Haul Wagon", capacity: 160, cost: 60000, gate: "none" },
  { tier: 8, name: "Crown Vault Hauler", capacity: 240, cost: 120000, gate: "crown" },
];

export const MAX_BAG_TIER = SATCHEL_BAGS.length - 1;

export function bagFor(tier: number): SatchelBag {
  const t = Math.min(Math.max(Math.floor(tier) || 0, 0), MAX_BAG_TIER);
  return SATCHEL_BAGS[t];
}

/** How many pieces the hero's current carrier holds. */
export function satchelCapacity(state: MineState): number {
  return bagFor(state.bagTier).capacity;
}

/** A full carrier refuses the next swing — mining resumes only once
 *  the satchel is sold down below capacity at the Mouth. (A face
 *  that BREAKS always pays in full, so a satchel can sit a few
 *  pieces over its cap right after a rich break; it's still full.) */
export function satchelIsFull(state: MineState): boolean {
  return satchelCount(state.satchel) >= satchelCapacity(state);
}

export type SatchelLoad = "room" | "nearly" | "full";

/** How full the carrier rides, in the three states the cave speaks
 *  for its heads-up (v198): "room" while there's space to spare;
 *  "nearly" in the last stretch — three or fewer slots free AND at
 *  least three-fifths full, so little Pockets (5) don't cry wolf
 *  from the first stone and the Crown Vault Hauler (240) warns only
 *  at the true end of its room; "full" at — or past — capacity,
 *  where satchelIsFull refuses the next swing. A display state only:
 *  the gate itself is satchelIsFull, untouched, and nothing here
 *  moves a single piece of ore. */
export function satchelLoad(state: MineState): SatchelLoad {
  const count = satchelCount(state.satchel);
  const cap = satchelCapacity(state);
  if (count >= cap) return "full";
  if (cap - count <= 3 && count * 5 >= cap * 3) return "nearly";
  return "room";
}

export type BagPurchaseCheck =
  | { ok: true; cost: number }
  | { ok: false; reason: "owned" | "order" | "crown" };

/** Validate buying carrier `tier` while owning `ownedTier`: one rung
 *  at a time, and the Crown Vault Hauler reads the same Crown gate
 *  as the Crown Pick (lib/prestige's state, via MineGates). */
export function bagPurchaseCheck(ownedTier: number, tier: number, gates: MineGates): BagPurchaseCheck {
  if (tier <= ownedTier) return { ok: false, reason: "owned" };
  if (tier > ownedTier + 1) return { ok: false, reason: "order" };
  if (bagFor(tier).gate === "crown" && (gates.crowns || 0) < 1) {
    return { ok: false, reason: "crown" };
  }
  return { ok: true, cost: bagFor(tier).cost };
}

// ---- Pickaxes (v175: Copper and Silver rungs join the ladder) -----------------

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
  { tier: 2, name: "Copper Pick", cost: 600, color: "#D97E4A", gate: "none" },
  { tier: 3, name: "Iron Pick", cost: 1200, color: "#7E8CA3", gate: "none" },
  { tier: 4, name: "Silver Pick", cost: 2800, color: "#C7CCD6", gate: "none" },
  { tier: 5, name: "Gold Pick", cost: 5000, color: "#F2B33D", gate: "none" },
  { tier: 6, name: "Diamond Pick", cost: 25000, color: "#9BE8F5", gate: "prestige" },
  { tier: 7, name: "Crown Pick", cost: 100000, color: "#C9963C", gate: "crown" },
];

export const MAX_PICK_TIER = PICKAXES.length - 1;

export function pickaxeFor(tier: number): Pickaxe {
  const t = Math.min(Math.max(Math.floor(tier) || 0, 0), MAX_PICK_TIER);
  return PICKAXES[t];
}

/** The prestige facts the ladders' gates read — taken from
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

/** Taps to break a face of the stratum with the given pick: a pick
 *  ABOVE the stratum's gate digs faster — one hit saved per tier
 *  above the gate (v175 addendum) — never below 1. */
export function effectiveHits(stratum: MineStratum, pickTier: number): number {
  const saved = Math.max(pickTier - stratum.requiredPick, 0);
  return Math.max(1, stratum.hits - saved);
}

// ---- Mining gear (v175 addendum) ----------------------------------------------

export type MiningGearId = "lantern" | "gloves" | "boots" | "charm" | "tinderbox";

export type MiningGearItem = {
  id: MiningGearId;
  name: string;
  cost: number;
  gate: PickGate;
  /** One line for the Mouth's shelf: what it does in the cave. */
  blurb: string;
};

/** The Mining Gear shelf at the Mouth: one-time purchases, permanent
 *  until prestige, each bending one of the cave's rules. */
export const MINING_GEAR: MiningGearItem[] = [
  { id: "lantern", name: "Miner's Lantern", cost: 2000, gate: "none", blurb: "Rich veins glow faintly through the rock — before the first crack." },
  { id: "gloves", name: "Braced Gloves", cost: 3500, gate: "none", blurb: "A cave-in buries a third of the satchel instead of half." },
  { id: "boots", name: "Cave Boots", cost: 4500, gate: "none", blurb: "A cave-in costs a tenth of the hero's strength instead of a fifth." },
  { id: "charm", name: "Prospector's Charm", cost: 6000, gate: "none", blurb: "One break in five yields an extra piece of ore." },
  { id: "tinderbox", name: "Tinderbox", cost: 15000, gate: "prestige", blurb: "Three extra flames kindle every morning, spent like the forest's own." },
];

export const MINING_GEAR_IDS: MiningGearId[] = MINING_GEAR.map((g) => g.id);

/** Cave-in damage with Cave Boots on (the plain fall costs
 *  CAVE_IN_DAMAGE_PCT = 0.2 in lib/hero-health). */
export const BOOTS_CAVE_IN_DAMAGE_PCT = 0.1;

/** Fraction of each unsold ore a cave-in buries with Braced Gloves
 *  (the plain fall buries CAVE_IN_BURIAL_FRACTION = 1/2). */
export const GLOVES_BURIAL_FRACTION = 1 / 3;

/** Chance the Prospector's Charm adds +1 piece to a broken block. */
export const CHARM_CHANCE = 0.2;

/** Bonus flames the Tinderbox kindles each morning. */
export const TINDERBOX_FLAMES = 3;

export function miningGearFor(id: MiningGearId): MiningGearItem {
  return MINING_GEAR.find((g) => g.id === id) ?? MINING_GEAR[0];
}

export function hasMiningGear(state: MineState, id: MiningGearId): boolean {
  return state.gear.includes(id);
}

export type GearPurchaseCheck =
  | { ok: true; cost: number }
  | { ok: false; reason: "owned" | "prestige" | "crown" };

/** Validate buying a gear piece: not twice, and the Tinderbox reads
 *  the prestige gate like the Diamond Pick does. (Gear is a shelf,
 *  not a ladder — any order.) */
export function gearPurchaseCheck(state: MineState, id: MiningGearId, gates: MineGates): GearPurchaseCheck {
  if (hasMiningGear(state, id)) return { ok: false, reason: "owned" };
  const item = miningGearFor(id);
  if (item.gate === "prestige" && (gates.totalPrestiges || 0) < 1) return { ok: false, reason: "prestige" };
  if (item.gate === "crown" && (gates.crowns || 0) < 1) return { ok: false, reason: "crown" };
  return { ok: true, cost: item.cost };
}

// ---- Danger and reward ----------------------------------------------------------

/** Strata whose rock is unstable: Gold, Diamond, and The Deep. The
 *  danger lives where the money is — the five strata above Gold
 *  never come down. */
export function isUnstableStratum(stratumIndex: number): boolean {
  const i = Math.min(Math.max(Math.floor(stratumIndex) || 0, 0), STRATA_COUNT - 1);
  return MINE_STRATA[i].collapseChance > 0;
}

/** Collapse chance for each hit on an ALREADY-CRACKED face in an
 *  unstable stratum. The first crack is the warning (the rock
 *  groans); every hit after it is the player's own gamble. */
export function collapseChanceFor(stratumIndex: number): number {
  const i = Math.min(Math.max(Math.floor(stratumIndex) || 0, 0), STRATA_COUNT - 1);
  return MINE_STRATA[i].collapseChance;
}

/** Fraction of each unsold ore a cave-in buries (rounded down per
 *  stack). The banked coins are never touched — only what's still in
 *  the satchel is at risk. */
export const CAVE_IN_BURIAL_FRACTION = 0.5;

/** Split a satchel into what a cave-in leaves and what it buries
 *  (buried counted per ore kind, for the cave's report). */
export function burySatchel(
  satchel: Satchel,
  fraction: number = CAVE_IN_BURIAL_FRACTION
): { kept: Satchel; buried: Record<OreKind, number> } {
  const f = Math.min(Math.max(fraction, 0), 1);
  const kept: Satchel = [];
  const buried: Record<OreKind, number> = { stone: 0, coal: 0, copper: 0, iron: 0, silver: 0, gold: 0, diamond: 0 };
  for (const s of satchel) {
    const b = Math.floor(s.count * f);
    buried[s.ore] += b;
    if (s.count - b > 0) kept.push({ ore: s.ore, unit: s.unit, count: s.count - b });
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
 * face first cracks — or earlier, by the Miner's Lantern's glow.
 */
export function isRichFace(faceIndex: number, day: string): boolean {
  return mulberry32(hashStr(`mine|rich:${day}:${faceIndex}`))() < RICH_FACE_CHANCE;
}

/** Chance that breaking a Deep face reveals the still pool (only
 *  while no unspent pool is already showing). */
export const POOL_REVEAL_CHANCE = 0.1;

// ---- The Depth Blessing (v175) --------------------------------------------------

/** Town income bonus per level opened beneath the mountain. */
export const DEPTH_BLESSING_PER_LEVEL = 0.0025;

/** The blessing's ceiling: the whole 80 levels opened = +20%. */
export const DEPTH_BLESSING_MAX = 0.2;

/** The blessing as a bonus fraction for a count of opened levels. */
export function depthBlessingBonusForLevels(openedLevels: number): number {
  const n = Math.min(Math.max(Math.floor(openedLevels) || 0, 0), MAX_LEVEL);
  return Math.min(DEPTH_BLESSING_MAX, DEPTH_BLESSING_PER_LEVEL * n);
}

/** The blessing as a multiplier for a count of opened levels —
 *  lib/hometown's income paths multiply by this. */
export function depthBlessingMultiplierForLevels(openedLevels: number): number {
  return 1 + depthBlessingBonusForLevels(openedLevels);
}

/** The blessing the mine's own depth currently grants the town. */
export function depthBlessingBonus(state: MineState): number {
  return depthBlessingBonusForLevels(state.deepestLevel);
}

export function depthBlessingMultiplier(state: MineState): number {
  return 1 + depthBlessingBonus(state);
}

// ---- State ------------------------------------------------------------------------

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
  /** FACE_COUNT faces, level by level, top of the mountain first. */
  faces: MineFaceState[];
  /** Day the daily counter belongs to, YYYY-MM-DD (local). */
  day: string;
  /** Faces broken today (a record now — flames, not a cap, limit
   *  the digging since v175). */
  minedToday: number;
  /** Face index (in The Deep) where the still pool is showing,
   *  revealed and not yet drunk — or null. It stays until used:
   *  settle and day rollovers never clear it. */
  poolFace: number | null;
  /** The carry ladder tier owned (a SATCHEL_BAGS tier). */
  bagTier: number;
  /** The haul multiplier: the deepest stratum's STRATUM_MULTIPLIERS
   *  value broken since the last sell or cave-in. Sells multiply
   *  by it; a cave-in spends it back to ×1. */
  haulMultiplier: number;
  /** The deepest level opened (1..80). Opened levels stay open;
   *  a trip starts here. (v175) */
  deepestLevel: number;
  /** Per-level bitmask of face SLOTS broken (bit s = slot s has been
   *  broken at least once) — the frontier count that opens the next
   *  level down: 2 distinct slots broken on the deepest level.
   *  (Regrown faces keep their bit: the way down stays cracked.) */
  brokenSlots: Record<string, number>;
  /** Mining Gear owned (v175 addendum) — one-time purchases,
   *  permanent until prestige. */
  gear: MiningGearId[];
  /** Day the Tinderbox bonus was last kindled, YYYY-MM-DD (local);
   *  "" = never. */
  tinderboxDay: string;
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
    deepestLevel: 1,
    brokenSlots: {},
    gear: [],
    tinderboxDay: "",
  };
}

function cleanCount(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

function cleanFaces(raw: unknown, count: number): MineFaceState[] {
  return Array.from({ length: count }, (_, i) => {
    const f = Array.isArray(raw) ? (raw[i] as Partial<MineFaceState> | undefined) : undefined;
    if (!f || typeof f !== "object") return { hitsLeft: null, minedAt: null };
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
}

function cleanStacks(raw: unknown): Satchel {
  if (!Array.isArray(raw)) return [];
  const out: Satchel = [];
  for (const s of raw as Array<Partial<SatchelStack>>) {
    if (!s || typeof s !== "object") continue;
    if (!ORE_KINDS.includes(s.ore as OreKind)) continue;
    const count = cleanCount(s.count);
    const unit = typeof s.unit === "number" && Number.isFinite(s.unit) && s.unit > 0 ? Math.round(s.unit) : 0;
    if (count <= 0 || unit <= 0) continue;
    const existing = out.find((x) => x.ore === s.ore && x.unit === unit);
    if (existing) existing.count += count;
    else out.push({ ore: s.ore as OreKind, unit, count });
  }
  return out;
}

function cleanBrokenSlots(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const level = Number(k);
    if (!Number.isFinite(level) || level < 1 || level > MAX_LEVEL) continue;
    const bits = typeof v === "number" && Number.isFinite(v) ? Math.floor(v) & 0b111 : 0;
    if (bits > 0) out[String(Math.floor(level))] = bits;
  }
  return out;
}

function cleanGear(raw: unknown): MiningGearId[] {
  if (!Array.isArray(raw)) return [];
  return MINING_GEAR_IDS.filter((id) => (raw as unknown[]).includes(id));
}

function cleanHaulMultiplier(v: unknown): number {
  return typeof v === "number" && STRATUM_MULTIPLIERS.includes(v) ? v : 1;
}

// ---- Legacy migration (records written before v175) --------------------------

/** The v168–v174 bands, in order, and the v175 stratum each became. */
const LEGACY_BAND_STRATA = [0, 3, 5, 7]; // Stone→Stone, Iron→Iron, Gold→Gold, Deep→The Deep
const LEGACY_FACE_COUNT = 12;
const LEGACY_FACES_PER_BAND = 3;
/** Old pick tier → new pick tier (Copper and Silver rungs inserted). */
const LEGACY_PICK_TIERS = [0, 1, 3, 5, 6, 7];
/** Old bag tier → new carry tier with EQUAL-OR-BETTER capacity:
 *  Canvas 20 → Backpack 30, Sturdy 30 → Backpack 30, Pack 45 →
 *  Framed 45, Deep Haul 70 → Hand Cart 70, Crown Haul 120 → Wagon 160. */
const LEGACY_BAG_TIERS = [3, 3, 4, 5, 7];
const LEGACY_BAG_CAPACITIES = [20, 30, 45, 70, 120];
const LEGACY_PICK_GATES = [0, 1, 2, 3]; // band → old pick tier it required

/** A record is legacy when it predates the Descent: no depth field. */
function isLegacyRecord(v: Partial<MineState> & Record<string, unknown>): boolean {
  return typeof v.deepestLevel !== "number";
}

/**
 * Bring a pre-v175 record down the new mountain whole:
 *  - the pick maps to the same NAMED pick on the longer ladder;
 *  - the bag maps to the carry tier of equal-or-better capacity —
 *    never less than was paid for;
 *  - the satchel's pieces keep their exact old values as stacks;
 *  - each old band's faces land on the first level of the stratum
 *    that band became, cracks and regrow clocks intact;
 *  - the deepest opened level is the first level of the deepest
 *    stratum he had reached — by face work, or by the pick he
 *    carried (its gate already let him stand there);
 *  - the still pool, if showing, moves to the Deep's first level.
 */
function migrateLegacyState(v: Partial<MineState> & Record<string, unknown>, nowMs: number): MineState {
  const base = defaultMineState(nowMs);
  const oldPick = Math.min(Math.max(Math.floor(typeof v.pickTier === "number" ? v.pickTier : 0) || 0, 0), LEGACY_PICK_TIERS.length - 1);
  const pickTier = LEGACY_PICK_TIERS[oldPick];

  const oldBag = Math.min(Math.max(Math.floor(typeof v.bagTier === "number" ? v.bagTier : 0) || 0, 0), LEGACY_BAG_TIERS.length - 1);
  let bagTier = LEGACY_BAG_TIERS[oldBag];
  // Equal-or-better by CAPACITY, not just by table: a hand-edited or
  // future old tier still lands on a carrier that holds at least
  // what the old one did.
  const oldCapacity = LEGACY_BAG_CAPACITIES[oldBag] ?? 0;
  while (bagTier < MAX_BAG_TIER && SATCHEL_BAGS[bagTier].capacity < oldCapacity) bagTier++;

  const legacySatchel = (v.satchel ?? {}) as Partial<Record<"iron" | "gold" | "diamond", number>>;
  const satchel: Satchel = [];
  for (const k of ["iron", "gold", "diamond"] as const) {
    const count = cleanCount(legacySatchel[k]);
    if (count > 0) satchel.push({ ore: k, unit: LEGACY_ORE_PRICES[k], count });
  }

  const faces = cleanFaces(null, FACE_COUNT);
  const oldFaces = cleanFaces(v.faces, LEGACY_FACE_COUNT);
  let deepestStratum = 0;
  const brokenSlots: Record<string, number> = {};
  for (let b = 0; b < LEGACY_BAND_STRATA.length; b++) {
    const stratum = LEGACY_BAND_STRATA[b];
    const level = firstLevelOfStratum(stratum);
    let touched = LEGACY_PICK_GATES[b] <= oldPick;
    for (let s = 0; s < LEGACY_FACES_PER_BAND; s++) {
      const oldFace = oldFaces[b * LEGACY_FACES_PER_BAND + s];
      faces[faceIndexFor(level, s)] = oldFace;
      if (oldFace.minedAt != null || oldFace.hitsLeft != null) touched = true;
      if (oldFace.minedAt != null) {
        brokenSlots[String(level)] = (brokenSlots[String(level)] ?? 0) | (1 << s);
      }
    }
    if (touched) deepestStratum = Math.max(deepestStratum, stratum);
  }

  const oldPool = typeof v.poolFace === "number" && Number.isFinite(v.poolFace) ? Math.floor(v.poolFace) : null;
  const poolFace =
    oldPool != null && oldPool >= 9 && oldPool < LEGACY_FACE_COUNT
      ? faceIndexFor(firstLevelOfStratum(7), oldPool - 9)
      : null;

  return {
    ...base,
    pickTier,
    bagTier,
    satchel,
    faces,
    day: typeof v.day === "string" && v.day ? v.day : base.day,
    minedToday: cleanCount(v.minedToday),
    poolFace,
    haulMultiplier: cleanHaulMultiplier(v.haulMultiplier),
    deepestLevel: firstLevelOfStratum(deepestStratum),
    brokenSlots,
  };
}

export function parseMineState(value: unknown, nowMs: number = Date.now()): MineState {
  const base = defaultMineState(nowMs);
  if (!value || typeof value !== "object") return base;
  const v = value as Partial<MineState> & Record<string, unknown>;
  if (isLegacyRecord(v)) return migrateLegacyState(v, nowMs);
  const poolFace =
    typeof v.poolFace === "number" && Number.isFinite(v.poolFace) &&
    Math.floor(v.poolFace) >= 0 && Math.floor(v.poolFace) < FACE_COUNT &&
    stratumIndexForFace(Math.floor(v.poolFace)) === 7
      ? Math.floor(v.poolFace)
      : null;
  return {
    pickTier: Math.min(Math.max(Math.floor(typeof v.pickTier === "number" ? v.pickTier : 0) || 0, 0), MAX_PICK_TIER),
    satchel: cleanStacks(v.satchel),
    faces: cleanFaces(v.faces, FACE_COUNT),
    day: typeof v.day === "string" && v.day ? v.day : base.day,
    minedToday: cleanCount(v.minedToday),
    poolFace,
    bagTier: Math.min(Math.max(Math.floor(typeof v.bagTier === "number" ? v.bagTier : 0) || 0, 0), MAX_BAG_TIER),
    haulMultiplier: cleanHaulMultiplier(v.haulMultiplier),
    deepestLevel: clampLevel(typeof v.deepestLevel === "number" ? v.deepestLevel : 1),
    brokenSlots: cleanBrokenSlots(v.brokenSlots),
    gear: cleanGear(v.gear),
    tinderboxDay: typeof v.tinderboxDay === "string" ? v.tinderboxDay : "",
  };
}

// ---- Settle ---------------------------------------------------------------------

/** When a mined-out face returns (ms epoch). */
export function faceReadyAt(face: MineFaceState, faceIndex: number): number | null {
  if (face.minedAt == null) return null;
  const stratum = MINE_STRATA[stratumIndexForFace(faceIndex)];
  return face.minedAt + stratum.regrowHours * 60 * 60 * 1000;
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

/** Whether the pick can dig the stratum this face sits in at all. */
export function canPickFace(state: MineState, faceIndex: number): boolean {
  return state.pickTier >= MINE_STRATA[stratumIndexForFace(faceIndex)].requiredPick;
}

/** The rumble warning: a CRACKED face in an unstable stratum (Gold,
 *  Diamond, The Deep). It shows from the first crack, so the collapse
 *  risk on the next hit is never a surprise. */
export function faceRumbles(state: MineState, faceIndex: number): boolean {
  return isUnstableStratum(stratumIndexForFace(faceIndex)) && faceStatus(state, faceIndex) === "cracked";
}

/** How many DISTINCT faces of `level` have been broken (0..3) — the
 *  frontier count; two opens the way down. */
export function brokenSlotCount(state: MineState, level: number): number {
  const bits = state.brokenSlots[String(clampLevel(level))] ?? 0;
  return (bits & 1 ? 1 : 0) + (bits & 2 ? 1 : 0) + (bits & 4 ? 1 : 0);
}

/** Drink the still pool: the pool is spent and fades; the face under
 *  it keeps its own lifecycle (it was mined out when it broke). The
 *  drink's EFFECT (full heal / forest blessing) is the screen's work,
 *  through lib/hero-health and lib/hero-needs. */
export function spendPool(state: MineState): MineState {
  if (state.poolFace == null) return state;
  return { ...state, poolFace: null };
}

// ---- Mining -----------------------------------------------------------------------

/** Ore from one broken face. `roll` is a [0,1) random kept as a
 *  parameter so the table is testable without seeding Math.random. */
export function yieldForFace(level: number, pickTier: number, roll: number): Partial<Record<OreKind, number>> {
  const r = Math.min(Math.max(roll, 0), 0.999999);
  switch (stratumIndexForLevel(level)) {
    case 0: // Stone — common rock, honestly priced
      return { stone: r >= 0.75 ? 2 : 1 };
    case 1: // Coal — seams run thick
      return { coal: r >= 0.6 ? 3 : 2 };
    case 2: // Copper
      return { copper: r >= 0.6 ? 3 : 2 };
    case 3: // Iron — the working stratum
      return { iron: r >= 0.6 ? 3 : 2 };
    case 4: // Silver — thinner seams, richer metal
      return { silver: r >= 0.65 ? 2 : 1 };
    case 5: // Gold — seams of gold, richer under the Crown Pick
      return { gold: (r >= 0.65 ? 2 : 1) + (pickTier >= 7 ? 1 : 0) };
    case 6: // Diamond — single stones, doubled under a Diamond-grade pick
      return { diamond: (r >= 0.8 ? 2 : 1) + (pickTier >= 6 ? 1 : 0) };
    default: // The Deep — diamonds sleep here; gold fills the other seams
      if (r < 0.55) {
        return { diamond: 1 + (pickTier >= 6 ? 1 : 0) };
      }
      return { gold: 2 + (pickTier >= 6 ? 1 : 0) + (pickTier >= 7 ? 1 : 0) };
  }
}

/** What one face pays, rich vein applied: everything doubles, and a
 *  rich face in The Deep that was sleeping on diamonds wakes a whole
 *  cluster (2–3, by the same roll) instead of a single stone. The
 *  prestige picks' own bonuses ride on top, as before. */
export function richYieldForFace(level: number, pickTier: number, roll: number): Partial<Record<OreKind, number>> {
  const base = yieldForFace(level, pickTier, roll);
  if (stratumIndexForLevel(level) === 7 && (base.diamond ?? 0) > 0) {
    const pickBonus = pickTier >= 6 ? 1 : 0;
    return { diamond: (roll >= 0.5 ? 3 : 2) + pickBonus };
  }
  const out: Partial<Record<OreKind, number>> = {};
  for (const k of ORE_KINDS) {
    const v = base[k];
    if (v) out[k] = v * 2;
  }
  return out;
}

export type MineTapOutcome =
  | { kind: "hit"; hitsLeft: number; rumbling: boolean }
  | { kind: "broke"; yield: Partial<Record<OreKind, number>>; rich: boolean; poolRevealed: boolean; levelOpened: number | null; charmBonus: boolean }
  | { kind: "collapse"; buried: Record<OreKind, number>; stratumIndex: number }
  | { kind: "locked"; requiredPick: number }
  | { kind: "resting"; readyAt: number }
  | { kind: "full" }
  | { kind: "noflames" };

export type MineTapExtra = {
  /** Whether a flame is available for a BREAK on this tap (v175).
   *  The screen reads lib/forest-energy and spends the flame itself
   *  when the outcome is "broke"; this flag only lets the tap REFUSE
   *  the breaking swing at zero flames — the face keeps its cracks
   *  and nothing is damaged or rolled. Defaults to true so plain
   *  callers (and tests of the rock itself) stay safe. */
  flamesOk?: boolean;
  /** The Prospector's Charm roll (v175): below CHARM_CHANCE on a
   *  break, +1 piece. Defaults to 1 (never triggers). */
  charmRoll?: number;
};

/**
 * One tap on a face. Settles first (timestamps, never timers), then:
 * locked when the pick is under the stratum's gate, resting while a
 * mined-out face regrows, full when the carrier has no room (the
 * swing is refused before it can damage anything) — else a hit, and
 * the breaking hit pays the yield into the satchel, priced at this
 * level, and raises the haul multiplier to the stratum's rate.
 *
 * Flames (v175): a break costs 1 flame from the forest's pool. The
 * lib never touches that store — the screen passes `flamesOk` and
 * spends on a "broke" outcome. A breaking tap with no flame is
 * refused whole ("noflames"): no hit lands, no collapse rolls, the
 * face keeps exactly the cracks it had.
 *
 * Descent (v175): a break marks the face's slot on its level; the
 * second DISTINCT slot broken on the deepest opened level opens the
 * next level down (outcome.levelOpened).
 *
 * Danger (v170): a hit on an ALREADY-CRACKED face in an unstable
 * stratum first rolls `collapseRoll` against the stratum's collapse
 * chance — a fall destroys the face (normal regrow), buries part of
 * the unsold satchel (half, or a third with Braced Gloves), spends
 * the haul multiplier, and ends the trip (the screen applies the
 * hero's HP hit). The breaking hit rolls the same way: the gamble
 * lasts until the face is down. `collapseRoll`/`poolRoll` default
 * to 1 (never triggers) so plain callers stay safe; both are
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
  poolRoll: number = 1,
  extra: MineTapExtra = {}
): { state: MineState; outcome: MineTapOutcome } {
  const state = settleMineState(stateIn, nowMs);
  const idx = Math.min(Math.max(Math.floor(faceIndex) || 0, 0), FACE_COUNT - 1);
  const level = levelForFace(idx);
  const stratumIndex = stratumIndexForLevel(level);
  const stratum = MINE_STRATA[stratumIndex];
  const face = state.faces[idx];

  if (state.pickTier < stratum.requiredPick) {
    return { state, outcome: { kind: "locked", requiredPick: stratum.requiredPick } };
  }
  if (face.minedAt != null) {
    return { state, outcome: { kind: "resting", readyAt: faceReadyAt(face, idx) ?? nowMs } };
  }
  // A full carrier refuses the swing outright: no damage, no roll —
  // the pick never leaves his shoulder. Haul the satchel up to the
  // Mouth and sell before digging again.
  if (satchelIsFull(state)) {
    return { state, outcome: { kind: "full" } };
  }

  const max = effectiveHits(stratum, state.pickTier);
  const current = face.hitsLeft ?? max;
  const hitsLeft = current - 1;

  // Flames (v175): the breaking swing — and only the breaking swing —
  // costs a flame. With none left it is refused before anything
  // moves: the rock keeps its cracks, the gamble never rolls.
  if (hitsLeft <= 0 && extra.flamesOk === false) {
    return { state, outcome: { kind: "noflames" } };
  }

  // Cave-in: only a face already carrying cracks can come down, and
  // only in the unstable strata. The first crack was the warning.
  // The fall spends the haul multiplier too: whatever the deep rock
  // promised, the satchel that survives sells at ×1.
  if (face.hitsLeft != null && collapseRoll < collapseChanceFor(stratumIndex)) {
    const fraction = hasMiningGear(state, "gloves") ? GLOVES_BURIAL_FRACTION : CAVE_IN_BURIAL_FRACTION;
    const { kept, buried } = burySatchel(state.satchel, fraction);
    const faces = state.faces.slice();
    faces[idx] = { hitsLeft: null, minedAt: nowMs };
    return {
      state: { ...state, faces, satchel: kept, minedToday: state.minedToday + 1, haulMultiplier: 1 },
      outcome: { kind: "collapse", buried, stratumIndex },
    };
  }

  if (hitsLeft > 0) {
    const faces = state.faces.slice();
    faces[idx] = { hitsLeft, minedAt: null };
    return {
      state: { ...state, faces },
      outcome: { kind: "hit", hitsLeft, rumbling: isUnstableStratum(stratumIndex) },
    };
  }

  const rich = isRichFace(idx, state.day);
  const y = rich
    ? richYieldForFace(level, state.pickTier, roll)
    : yieldForFace(level, state.pickTier, roll);
  // The Prospector's Charm (v175): one break in five finds a piece more.
  let charmBonus = false;
  if (hasMiningGear(state, "charm") && (extra.charmRoll ?? 1) < CHARM_CHANCE) {
    const kind = ORE_KINDS.find((k) => (y[k] ?? 0) > 0);
    if (kind) {
      y[kind] = (y[kind] ?? 0) + 1;
      charmBonus = true;
    }
  }
  const satchel = addYieldToSatchel(state.satchel, y, level);
  const faces = state.faces.slice();
  faces[idx] = { hitsLeft: null, minedAt: nowMs };

  // The Descent: this slot counts toward opening the way down.
  const slot = slotForFace(idx);
  const bits = (state.brokenSlots[String(level)] ?? 0) | (1 << slot);
  const brokenSlots = { ...state.brokenSlots, [String(level)]: bits };
  let deepestLevel = state.deepestLevel;
  let levelOpened: number | null = null;
  if (level === state.deepestLevel && state.deepestLevel < MAX_LEVEL) {
    const count = (bits & 1 ? 1 : 0) + (bits & 2 ? 1 : 0) + (bits & 4 ? 1 : 0);
    if (count >= 2) {
      deepestLevel = state.deepestLevel + 1;
      levelOpened = deepestLevel;
    }
  }

  const poolRevealed =
    stratumIndex === 7 && state.poolFace == null && poolRoll < POOL_REVEAL_CHANCE;
  return {
    state: {
      ...state,
      faces,
      satchel,
      minedToday: state.minedToday + 1,
      poolFace: poolRevealed ? idx : state.poolFace,
      brokenSlots,
      deepestLevel,
      // Breaking deep rock raises the whole haul: the multiplier
      // tracks the deepest stratum broken since the last sell or
      // cave-in, and never steps back down on its own.
      haulMultiplier: Math.max(state.haulMultiplier, stratumMultiplier(stratumIndex)),
    },
    outcome: { kind: "broke", yield: y, rich, poolRevealed, levelOpened, charmBonus },
  };
}

// ---- Selling ------------------------------------------------------------------------

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

// ---- The Tinderbox (v175) --------------------------------------------------------------

/** Whether this morning's Tinderbox flames are still unkindled:
 *  the box is owned and today's date isn't stamped yet. */
export function tinderboxDue(state: MineState, today: string = mineTodayString()): boolean {
  return hasMiningGear(state, "tinderbox") && state.tinderboxDay !== today;
}

/**
 * Kindle the morning's Tinderbox flames: +TINDERBOX_FLAMES bonus
 * energy through the forest-energy bonus store — spent like the
 * diner coffee's, gone at midnight. Stamps the day on the mine
 * record and persists it, so a morning grants exactly once however
 * many times the mine is opened. (Called by the mine screens on
 * refresh; returns the state to keep.)
 */
export async function settleTinderboxBonus(state: MineState, today: string = mineTodayString()): Promise<MineState> {
  if (!tinderboxDue(state, today)) return state;
  await grantForestEnergy(TINDERBOX_FLAMES);
  const next = { ...state, tinderboxDay: today };
  await saveMineState(next);
  return next;
}

// ---- Storage ------------------------------------------------------------------------------

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
 * owned gear resets, so does the mine — back to the Wood pick and
 * Pockets, the satchel empty, every face whole, no depth opened, no
 * mining gear, the haul multiplier at ×1 — all of it rides the
 * default state. Called by lib/prestige's performPrestige.
 */
export async function resetMineForPrestige(nowMs: number = Date.now()): Promise<void> {
  await saveMineState(defaultMineState(nowMs));
}
