// Prestige Badges — the Boss Gate.
//
// Before any "Begin Again" (lib/prestige.ts) the player must defeat the
// current boss in the Dark Forest. Victory earns that boss's badge —
// PERMANENT, never reset by prestige — and clears the Boss Gate for the
// current prestige offer. There are ten bosses, one per forest zone lord,
// and ten badges. Each badge carries a perk that empowers gear or the
// economy (Jonathan's design: "the armor and weapons have bonuses because
// of the badge you collect; each badge makes the deep forest a little
// easier").
//
// After all ten badges, further prestiges re-face the Throne Usurper,
// stronger each time ("Deepened").
//
// Badge ownership lives in the prestige state (lib/prestige.ts) — this
// module holds the catalog, the boss ladder, and a sync in-memory cache
// (same pattern as lib/gear's boost cache) so hot paths — combatStats,
// awardCustomXP, the hometown coin ledger — can read perks synchronously.

import { demonForWave } from "./dark-forest";

export type BadgeId =
  | "gloaming"
  | "mist"
  | "ember"
  | "frost"
  | "bloodmoon"
  | "fen"
  | "ashen"
  | "violet"
  | "gilded"
  | "throne";

export type BadgeMotif =
  | "root"
  | "wave"
  | "flame"
  | "antler"
  | "moon"
  | "crown"
  | "swirl"
  | "eye"
  | "coin-sun"
  | "throne";

export type BadgeDef = {
  id: BadgeId;
  /** The badge's name. */
  name: string;
  /** The boss who guards it. */
  bossName: string;
  /** The boss's title/epithet (shown in the Boss Gate panel and HUD). */
  bossTitle: string;
  /** Forest zone index (0-14) this boss lords over — also its scenery. */
  zoneIndex: number;
  /** Human-readable perk, shown in the badge case and the Boss Gate. */
  perk: string;
  motif: BadgeMotif;
  /** Medallion + motif colors. */
  primary: string;
  secondary: string;
  /** Boss sprite palette (demon body / eyes / horns). */
  body: string;
  eye: string;
  horn: string;
};

// ---- Perk magnitudes (single source of truth) ----

/** Gloaming Badge: every gear stat +10%. */
export const GLOAMING_GEAR_MULT = 1.1;
/** Mist Badge: Dark Forest coin rewards +15%. */
export const MIST_FOREST_COIN_MULT = 1.15;
/** Ember Badge: weapon attack +15%. */
export const EMBER_WEAPON_MULT = 1.15;
/** Frost Badge: armor defense +15%. */
export const FROST_ARMOR_MULT = 1.15;
/** Bloodmoon Badge: +10% coins from all hometown grants. */
export const BLOODMOON_COIN_MULT = 1.1;
/** Fen Badge: gear max HP +20%. */
export const FEN_HP_MULT = 1.2;
/** Ashen Badge: +10% XP from all grants. */
export const ASHEN_XP_MULT = 1.1;
/** Violet Badge: mini-game payouts +15%. */
export const VIOLET_MINIGAME_MULT = 1.15;
/** Gilded Badge: building income +10%. */
export const GILDED_INCOME_MULT = 1.1;
/** Throne Badge: every gear stat +25%. */
export const THRONE_GEAR_MULT = 1.25;

export const BADGES: BadgeDef[] = [
  {
    id: "gloaming",
    name: "Gloaming Badge",
    bossName: "Thicketmaw",
    bossTitle: "the Rootbound",
    zoneIndex: 0,
    perk: "All gear stats +10%",
    motif: "root",
    primary: "#84CC16",
    secondary: "#3F6212",
    body: "#365314",
    eye: "#FDE68A",
    horn: "#A3E635",
  },
  {
    id: "mist",
    name: "Mist Badge",
    bossName: "Veilmother",
    bossTitle: "of the Mists",
    zoneIndex: 1,
    perk: "Dark Forest coin rewards +15%",
    motif: "wave",
    primary: "#7DD3FC",
    secondary: "#0369A1",
    body: "#334155",
    eye: "#E0F2FE",
    horn: "#BAE6FD",
  },
  {
    id: "ember",
    name: "Ember Badge",
    bossName: "Cindermaw",
    bossTitle: "the Ever-Burning",
    zoneIndex: 2,
    perk: "Weapon attack +15%",
    motif: "flame",
    primary: "#FB923C",
    secondary: "#C2410C",
    body: "#7C2D12",
    eye: "#FDE047",
    horn: "#FED7AA",
  },
  {
    id: "frost",
    name: "Frost Badge",
    bossName: "The Pale Stag",
    bossTitle: "Lord of the Long Night",
    zoneIndex: 3,
    perk: "Armor defense +15%",
    motif: "antler",
    primary: "#A5F3FC",
    secondary: "#0E7490",
    body: "#164E63",
    eye: "#ECFEFF",
    horn: "#F0FDFF",
  },
  {
    id: "bloodmoon",
    name: "Bloodmoon Badge",
    bossName: "Sanguine",
    bossTitle: "the Moon Drinker",
    zoneIndex: 4,
    perk: "+10% coins from every hometown grant",
    motif: "moon",
    primary: "#F87171",
    secondary: "#991B1B",
    body: "#450A0A",
    eye: "#FBBF24",
    horn: "#FECACA",
  },
  {
    id: "fen",
    name: "Fen Badge",
    bossName: "Fenrot",
    bossTitle: "the Sunken King",
    zoneIndex: 5,
    perk: "Gear max HP +20%",
    motif: "crown",
    primary: "#34D399",
    secondary: "#065F46",
    body: "#022C22",
    eye: "#FDE047",
    horn: "#A7F3D0",
  },
  {
    id: "ashen",
    name: "Ashen Badge",
    bossName: "Ashveil",
    bossTitle: "the Grey Silence",
    zoneIndex: 6,
    perk: "+10% XP from all grants",
    motif: "swirl",
    primary: "#D1D5DB",
    secondary: "#6B7280",
    body: "#1F2937",
    eye: "#FCA5A5",
    horn: "#E5E7EB",
  },
  {
    id: "violet",
    name: "Violet Badge",
    bossName: "The Violet Oracle",
    bossTitle: "Eye of the Deep Dark",
    zoneIndex: 7,
    perk: "Mini-game payouts +15%",
    motif: "eye",
    primary: "#C4B5FD",
    secondary: "#6D28D9",
    body: "#2E1065",
    eye: "#F0ABFC",
    horn: "#DDD6FE",
  },
  {
    id: "gilded",
    name: "Gilded Badge",
    bossName: "The Gilded Regent",
    bossTitle: "Keeper of the Fallen Kingdom",
    zoneIndex: 8,
    perk: "Building income +10%",
    motif: "coin-sun",
    primary: "#FCD34D",
    secondary: "#B45309",
    body: "#451A03",
    eye: "#FEF3C7",
    horn: "#FDE68A",
  },
  {
    id: "throne",
    name: "Throne Badge",
    bossName: "The Throne Usurper",
    bossTitle: "the First Darkness",
    zoneIndex: 9,
    perk: "All gear stats +25%",
    motif: "throne",
    primary: "#F8FAFC",
    secondary: "#475569",
    body: "#020617",
    eye: "#F8FAFC",
    horn: "#94A3B8",
  },
];

export const BADGE_BY_ID: Record<BadgeId, BadgeDef> = Object.fromEntries(
  BADGES.map((b) => [b.id, b])
) as Record<BadgeId, BadgeDef>;

export function isBadgeId(value: unknown): value is BadgeId {
  return typeof value === "string" && value in BADGE_BY_ID;
}

/** Sanitize an unknown list into owned badge ids, in ladder order. */
export function sanitizeBadgeIds(value: unknown): BadgeId[] {
  if (!Array.isArray(value)) return [];
  const owned = new Set(value.filter(isBadgeId));
  return BADGES.filter((b) => owned.has(b.id)).map((b) => b.id);
}

/**
 * The boss a player faces next: the (owned count)th badge on the ladder.
 * Once all ten are earned it is always the Throne Usurper again, Deepened
 * by the number of times he has already been beaten.
 */
export function nextBoss(ownedBadges: string[], throneVictories: number): { badge: BadgeDef; deepened: number } {
  const count = BADGES.filter((b) => ownedBadges.includes(b.id)).length;
  if (count >= BADGES.length) {
    return { badge: BADGES[BADGES.length - 1], deepened: Math.max(1, Math.floor(throneVictories) || 1) };
  }
  return { badge: BADGES[count], deepened: 0 };
}

// ---- Boss stats ----

export type BossDef = {
  badgeId: BadgeId;
  name: string;
  title: string;
  /** Display name for the re-fight ("The Throne Usurper, Deepened ×2"). */
  displayName: string;
  hp: number;
  attack: number;
  coins: number;
  xp: number;
  zoneIndex: number;
  deepened: number;
};

/**
 * Boss combat stats.
 *
 * The design anchor is demonForWave(25 + 12 * bossIndex) with HP x3, but
 * raw wave stats are exponential (HP x1.24 per wave, attack x1.14) while
 * gear grows ~x1.35 per prestige tier — taken literally, boss 1 would
 * have 15,480 HP and 139 attack against a best pre-Crown hero dealing
 * ~67 a strike and dying in two hits, and it only gets worse up the
 * ladder. So the ladder is compressed to the same anchor points the raw
 * formula gives at the low end (boss 1 ≈ a wave-16 demon's HP x3) and
 * grown at gear pace:
 *
 *   hp     = round(2300 * 1.38^bossIndex * 1.60^deepened)
 *   attack = round(  30 * 1.35^bossIndex * 1.35^deepened)
 *
 * A hero wearing the current prestige tier's gear, with the badges
 * earned so far, wins in roughly 30 strikes and survives — with the
 * once-per-battle prayer — with effort. Coin/XP rewards DO come straight
 * from the reference demon (demonForWave(25 + 12 * bossIndex)).
 */
export function bossForBadge(badge: BadgeDef, badgeIndex: number, deepened: number): BossDef {
  const ref = demonForWave(25 + 12 * badgeIndex);
  const d = Math.max(0, Math.floor(deepened) || 0);
  return {
    badgeId: badge.id,
    name: badge.bossName,
    title: badge.bossTitle,
    displayName: d > 0 ? `${badge.bossName}, Deepened ×${d}` : badge.bossName,
    hp: Math.round(2300 * Math.pow(1.38, badgeIndex) * Math.pow(1.6, d)),
    attack: Math.round(30 * Math.pow(1.35, badgeIndex) * Math.pow(1.35, d)),
    coins: Math.round(ref.coins * (1 + d)),
    xp: Math.round(ref.xp * (1 + d)),
    zoneIndex: badge.zoneIndex,
    deepened: d,
  };
}

/** The boss gate for a player: the next boss + its full combat def. */
export function bossGateFor(ownedBadges: string[], throneVictories: number): BossDef {
  const { badge, deepened } = nextBoss(ownedBadges, throneVictories);
  return bossForBadge(badge, BADGES.indexOf(badge), deepened);
}

// ---- Gear multipliers from badges (used by lib/gear combatStats) ----

export type BadgeGearMultipliers = {
  /** Gloaming + Throne: multiplies every gear stat. */
  all: number;
  /** Ember: weapon attack only. */
  weaponAttack: number;
  /** Frost: armor defense only. */
  armorDefense: number;
  /** Fen: max HP only. */
  maxHp: number;
};

export function badgeGearMultipliers(ownedBadges: string[]): BadgeGearMultipliers {
  const has = (id: BadgeId) => ownedBadges.includes(id);
  return {
    all: (has("gloaming") ? GLOAMING_GEAR_MULT : 1) * (has("throne") ? THRONE_GEAR_MULT : 1),
    weaponAttack: has("ember") ? EMBER_WEAPON_MULT : 1,
    armorDefense: has("frost") ? FROST_ARMOR_MULT : 1,
    maxHp: has("fen") ? FEN_HP_MULT : 1,
  };
}

// ---- Sync cache for hot paths (same pattern as lib/gear's boost cache) ----

let cachedBadges: string[] = [];

export function getCachedBadges(): string[] {
  return cachedBadges;
}

export function setCachedBadges(ids: string[]): void {
  cachedBadges = sanitizeBadgeIds(ids) as string[];
}

export function hasCachedBadge(id: BadgeId): boolean {
  return cachedBadges.includes(id);
}

/** Reload the cache from the prestige state (dynamic import: no cycles). */
export async function refreshBadgeCache(): Promise<string[]> {
  try {
    const { loadPrestigeState } = await import("./prestige");
    const state = await loadPrestigeState();
    cachedBadges = state.badges;
  } catch {}
  return cachedBadges;
}
