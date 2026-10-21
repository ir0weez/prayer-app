// Prestige — "Begin Again".
//
// Prestige can be taken when a fast ends (an end-of-fast prompt offers it),
// or at any time from the Hometown "Begin Again" button while a qualifying
// fast — one started since the last prestige — is active or finished. The
// reward depends on THAT fast's length:
//
//   under 40 days  -> +5% permanent income bonus ("devotion")
//   40-364 days    -> +25% permanent income bonus ("devotion")
//   365+ days      -> a Crown: income x2 (multiplicative), the City exists,
//                     and the Crown gear tiers unlock
//
// Sub-Crown bonuses accumulate in a persistent devotion bonus. The total
// income multiplier is (1 + devotionBonus) x 2^crowns, wired into the same
// accrual chain as the other blessings.
//
// The Crown level lives in the long-standing integer key
// "prayercircle.hometown.prestige.v1" (read by the profile badge and the
// barbershop's new-player discount). The rest of the prestige state lives
// in the progress key; the pre-tier shape ({countedFastIds,
// totalCompletedFastDays}) migrates forward with devotion 0 and no last
// prestige, so the longest fast on record simply becomes the offer.
//
// The City does not exist until the first Crown: at 0 Crowns the city map
// is not rendered at all — no exceptions, including saves that unlocked
// it before this rule (their city building data is kept, just
// inaccessible until prestige >= 1 and the unlock is paid again).
//
// Prestige ALSO requires the Boss Gate: the current boss in the Dark
// Forest (lib/badges.ts) must be beaten before an offer can be taken.
// Victory earns a permanent badge and clears the gate for that offer.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFastEndDate, type PersonalFast } from "./prayercircle-fasting";
import {
  CITY_PLOTS_STORAGE_KEY,
  COINS_STORAGE_KEY,
  MAP_UNLOCKED_KEY,
  TOWN_STORAGE_KEY,
  emptyTownState,
  parseCoins,
  parseUnlockedMaps,
  type HometownCoins,
  type TownMapId,
  type TownState,
} from "./hometown";
import { GEAR_EQUIPPED_KEY, GEAR_INVENTORY_KEY, defaultEquipped } from "./gear";
import { sanitizeBadgeIds, type BadgeId } from "./badges";

export const PRESTIGE_LEVEL_KEY = "prayercircle.hometown.prestige.v1";
export const PRESTIGE_PROGRESS_KEY = "prayercircle.hometown.prestige-days.v1";

/** Permanent income bonus from prestiging a fast under 40 days. */
export const DEVOTION_SMALL_FAST_BONUS = 0.05;
/** Permanent income bonus from prestiging a 40-364 day fast. */
export const DEVOTION_FAST_BONUS = 0.25;
/** Fast length (days) that earns a Crown instead of a devotion bonus. */
export const CROWN_MIN_FAST_DAYS = 365;
/** Fast length (days) that earns the full devotion bonus instead of the small one. */
export const DEVOTION_MIN_FAST_DAYS = 40;

/** One-time coin cost to unlock the City once it exists (prestige >= 1). */
export const CITY_UNLOCK_COST = 50000;

// ---- Crowns (the level key) ----

export function parsePrestigeLevel(raw: string | null | undefined): number {
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export async function loadPrestigeLevel(): Promise<number> {
  try {
    return parsePrestigeLevel(await AsyncStorage.getItem(PRESTIGE_LEVEL_KEY));
  } catch {
    return 0;
  }
}

export async function savePrestigeLevel(level: number): Promise<void> {
  try {
    await AsyncStorage.setItem(PRESTIGE_LEVEL_KEY, String(Math.max(0, Math.floor(level) || 0)));
  } catch {}
}

/** Income multiplier from Crowns alone: Crown 1 = x2, Crown 2 = x4, ... */
export function prestigeMultiplier(level: number): number {
  const lv = Math.max(0, Math.floor(level) || 0);
  return Math.pow(2, lv);
}

/** Total permanent income multiplier: devotion bonus, multiplied by Crowns. */
export function totalPrestigeMultiplier(crowns: number, devotionBonus: number): number {
  const devotion = Math.max(0, devotionBonus || 0);
  return (1 + devotion) * prestigeMultiplier(crowns);
}

// ---- Tiers ----

export type PrestigeTierKind = "devotion-small" | "devotion" | "crown";

export type PrestigeTier = {
  kind: PrestigeTierKind;
  /** Fractional permanent income bonus for devotion tiers (0 for a Crown). */
  bonus: number;
};

/** The prestige reward a fast of the given length grants. */
export function tierForFastLength(durationDays: number): PrestigeTier {
  const d = Math.max(0, Math.floor(durationDays) || 0);
  if (d >= CROWN_MIN_FAST_DAYS) return { kind: "crown", bonus: 0 };
  if (d >= DEVOTION_MIN_FAST_DAYS) return { kind: "devotion", bonus: DEVOTION_FAST_BONUS };
  return { kind: "devotion-small", bonus: DEVOTION_SMALL_FAST_BONUS };
}

// ---- Prestige state (the progress key) ----

export type PrestigeState = {
  /** Accumulated permanent income bonus from sub-Crown prestiges (0.30 = +30%). */
  devotionBonus: number;
  /** ISO timestamp of the last prestige (null when never). */
  lastPrestigeAt: string | null;
  /** Fasts already consumed by a prestige — each fast grants its reward once. */
  consumedFastIds: string[];
  /** Fasts the end-of-fast prompt has already been shown for. */
  promptedFastIds: string[];
  /** Total prestiges taken, all tiers. */
  totalPrestiges: number;
  /** Boss badges earned — PERMANENT, never reset by prestige. */
  badges: BadgeId[];
  /** The offer fastId whose Boss Gate has been cleared (null = gate shut). */
  bossClearedFastId: string | null;
  /** Times the Throne Usurper has been beaten (drives his Deepened form). */
  throneVictories: number;
};

export function emptyPrestigeState(): PrestigeState {
  return {
    devotionBonus: 0,
    lastPrestigeAt: null,
    consumedFastIds: [],
    promptedFastIds: [],
    totalPrestiges: 0,
    badges: [],
    bossClearedFastId: null,
    throneVictories: 0,
  };
}

export function parsePrestigeState(value: unknown): PrestigeState {
  if (!value || typeof value !== "object") return emptyPrestigeState();
  const v = value as Partial<PrestigeState>;
  // Legacy shape ({countedFastIds, totalCompletedFastDays}) carries none of
  // the new fields, so it migrates to the defaults: no devotion, no last
  // prestige — past fasts become eligible offers under the tier rules, and
  // Crowns (stored separately) are untouched.
  return {
    devotionBonus:
      typeof v.devotionBonus === "number" && v.devotionBonus > 0 ? v.devotionBonus : 0,
    lastPrestigeAt: typeof v.lastPrestigeAt === "string" ? v.lastPrestigeAt : null,
    consumedFastIds: Array.isArray(v.consumedFastIds)
      ? v.consumedFastIds.filter((x): x is string => typeof x === "string")
      : [],
    promptedFastIds: Array.isArray(v.promptedFastIds)
      ? v.promptedFastIds.filter((x): x is string => typeof x === "string")
      : [],
    totalPrestiges:
      typeof v.totalPrestiges === "number" && v.totalPrestiges > 0
        ? Math.floor(v.totalPrestiges)
        : 0,
    badges: sanitizeBadgeIds(v.badges),
    bossClearedFastId: typeof v.bossClearedFastId === "string" ? v.bossClearedFastId : null,
    throneVictories:
      typeof v.throneVictories === "number" && v.throneVictories > 0
        ? Math.floor(v.throneVictories)
        : 0,
  };
}

export async function loadPrestigeState(): Promise<PrestigeState> {
  try {
    const raw = await AsyncStorage.getItem(PRESTIGE_PROGRESS_KEY);
    if (!raw) return emptyPrestigeState();
    return parsePrestigeState(JSON.parse(raw));
  } catch {
    return emptyPrestigeState();
  }
}

export async function savePrestigeState(state: PrestigeState): Promise<void> {
  try {
    await AsyncStorage.setItem(PRESTIGE_PROGRESS_KEY, JSON.stringify(state));
  } catch {}
}

/** Record that the end-of-fast prompt was shown for a fast (shown once per fast). */
export async function markFastPrompted(fastId: string): Promise<void> {
  const state = await loadPrestigeState();
  if (state.promptedFastIds.includes(fastId)) return;
  await savePrestigeState({ ...state, promptedFastIds: [...state.promptedFastIds, fastId] });
}

// ---- The offer: the longest fast started since the last prestige ----

export type PrestigeOffer = {
  fastId: string;
  durationDays: number;
  kind: PrestigeTierKind;
  /** Fractional permanent income bonus for devotion tiers (0 for a Crown). */
  bonus: number;
};

/** When a fast started (ISO). createdAt is a timestamp; startDate is a day. */
function fastStartedAt(fast: PersonalFast): string {
  if (typeof fast.createdAt === "string" && fast.createdAt) return fast.createdAt;
  return typeof fast.startDate === "string" ? fast.startDate : "";
}

/**
 * A fast qualifies when it started since the last prestige (or no prestige
 * has happened yet) and hasn't already been consumed by one.
 */
export function fastQualifiesForPrestige(fast: PersonalFast, state: PrestigeState): boolean {
  if (!fast || typeof fast.id !== "string") return false;
  if (state.consumedFastIds.includes(fast.id)) return false;
  if (!state.lastPrestigeAt) return true;
  const started = fastStartedAt(fast);
  if (!started) return false;
  const startedMs = Date.parse(started);
  const prestigeMs = Date.parse(state.lastPrestigeAt);
  if (!Number.isFinite(startedMs) || !Number.isFinite(prestigeMs)) return started >= state.lastPrestigeAt;
  return startedMs >= prestigeMs;
}

/** The current prestige offer: the tier of the longest qualifying fast. */
export function prestigeOffer(fasts: PersonalFast[], state: PrestigeState): PrestigeOffer | null {
  if (!Array.isArray(fasts)) return null;
  let best: PersonalFast | null = null;
  for (const fast of fasts) {
    if (!fastQualifiesForPrestige(fast, state)) continue;
    if (!best || (fast.durationDays || 0) > (best.durationDays || 0)) best = fast;
  }
  if (!best) return null;
  const tier = tierForFastLength(best.durationDays || 0);
  return { fastId: best.id, durationDays: best.durationDays || 0, kind: tier.kind, bonus: tier.bonus };
}

/**
 * Whether the City map exists for this player: it appears ONLY after the
 * first Crown (prestige >= 1) and its 50,000-coin unlock — no exceptions
 * for saves that unlocked it earlier. Their city building data is NOT
 * deleted; the map is simply inaccessible until both conditions hold.
 */
export function cityExists(prestigeLevel: number): boolean {
  return prestigeLevel >= 1;
}

// ---- The Boss Gate ----

/** Whether the Boss Gate is cleared for this offer (boss beaten). */
export function offerBossCleared(state: PrestigeState, offer: PrestigeOffer | null): boolean {
  return !!offer && state.bossClearedFastId === offer.fastId;
}

export type BossGateVisibility = {
  /** Whether the Boss Gate panel shows in the Dark Forest. */
  visible: boolean;
  /**
   * ISO date (YYYY-MM-DD) the gate opens — the offer fast's final day —
   * when an offer exists but its time hasn't come. Null when there is no
   * offer at all (nothing to wait for).
   */
  opensOn: string | null;
};

/**
 * When the Dark Forest may show the Boss Gate. Jonathan's rule: the boss
 * stays hidden until the fast reaches its LAST DAY — then the gate shows
 * for that final day and stays up while the offer is pending (fast ended,
 * prestige unclaimed), until he prestiges or a longer new fast becomes
 * the offer. Mid-fast the gate is hidden; opensOn names the date it opens.
 *
 * "Last day" uses the fast's own calendar math (getFastEndDate: startDate
 * + durationDays - 1, the same day the fast itself counts as its final
 * day), compared as ISO day strings against local today.
 */
export function bossGateVisibility(
  fasts: PersonalFast[],
  state: PrestigeState,
  todayIso: string
): BossGateVisibility {
  const offer = prestigeOffer(fasts, state);
  if (!offer) return { visible: false, opensOn: null };
  const fast = Array.isArray(fasts) ? fasts.find((f) => f.id === offer.fastId) : undefined;
  if (!fast) return { visible: false, opensOn: null };
  const endDate = getFastEndDate(fast);
  // today >= the fast's final day: either the last day itself (the fast
  // is still running) or any day after (the offer stands pending).
  if (todayIso >= endDate) return { visible: true, opensOn: endDate };
  return { visible: false, opensOn: endDate };
}

/**
 * Record a Dark Forest boss victory: the badge is earned (permanently —
 * prestige never takes badges), the Throne Usurper deepens, and the Boss
 * Gate for the CURRENT offer (if any) is cleared. Returns the new state.
 */
export async function recordBossVictory(
  fasts: PersonalFast[],
  badgeId: BadgeId
): Promise<PrestigeState> {
  const state = await loadPrestigeState();
  const badges = state.badges.includes(badgeId)
    ? state.badges
    : sanitizeBadgeIds([...state.badges, badgeId]);
  const offer = prestigeOffer(fasts, state);
  const next: PrestigeState = {
    ...state,
    badges,
    throneVictories:
      badgeId === "throne" ? state.throneVictories + 1 : state.throneVictories,
    bossClearedFastId: offer ? offer.fastId : state.bossClearedFastId,
  };
  await savePrestigeState(next);
  return next;
}

// ---- Performing a prestige ----

export type PerformPrestigeResult = {
  kind: PrestigeTierKind;
  /** The fast whose length set the tier. */
  durationDays: number;
  crowns: number;
  devotionBonus: number;
  town: TownState;
  coins: HometownCoins;
  unlockedMaps: TownMapId[];
};

/**
 * Perform "Begin Again" for the current offer (the longest fast started
 * since the last prestige). Returns null when there is no offer — OR when
 * the offer's Boss Gate has not been cleared (the Dark Forest boss must
 * be beaten first; see recordBossVictory).
 *
 * REWARD (by that fast's length): under 40 days +5% devotion, 40-364 days
 * +25% devotion, 365+ days a Crown (level +1). The fast is consumed — it
 * cannot grant a second prestige.
 *
 * RESET: every building on BOTH maps (plots back to run start), building
 * stock, purchased city plots, the spendable coin balance, the City
 * unlock (bought again at the post-prestige price), and ALL owned +
 * equipped gear (weapons, armor, purchased clothing) — the gear resets
 * too. Crown-gated hairstyles and beards are NOT gear: they belong to the
 * Crown and stay.
 * KEPT: lifetime earnings (milestones), prayer streak, XP/level,
 * collections, Garden of Remembrance, prayer villagers, villager data,
 * barbershop styles, the other map unlocks, fast progress — and BADGES,
 * which are permanent and never reset.
 */
export async function performPrestige(fasts: PersonalFast[]): Promise<PerformPrestigeResult | null> {
  const state = await loadPrestigeState();
  const offer = prestigeOffer(fasts, state);
  if (!offer) return null;
  // The Boss Gate: no prestige until the current boss is beaten.
  if (!offerBossCleared(state, offer)) return null;

  let crowns = await loadPrestigeLevel();
  let devotionBonus = state.devotionBonus;
  if (offer.kind === "crown") {
    crowns += 1;
    await savePrestigeLevel(crowns);
  } else {
    devotionBonus = Math.round((devotionBonus + offer.bonus) * 100) / 100;
  }
  await savePrestigeState({
    devotionBonus,
    lastPrestigeAt: new Date().toISOString(),
    consumedFastIds: [...state.consumedFastIds, offer.fastId],
    promptedFastIds: state.promptedFastIds,
    totalPrestiges: state.totalPrestiges + 1,
    // Badges are permanent — prestige never takes them. The gate re-shuts
    // for the next offer.
    badges: state.badges,
    bossClearedFastId: null,
    throneVictories: state.throneVictories,
  });

  let coins: HometownCoins = { balance: 0, lifetimeEarned: 0 };
  try {
    const raw = await AsyncStorage.getItem(COINS_STORAGE_KEY);
    const prev = parseCoins(raw ? JSON.parse(raw) : {});
    coins = { balance: 0, lifetimeEarned: prev.lifetimeEarned };
    await AsyncStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(coins));
  } catch {}

  const town = emptyTownState();
  try {
    await AsyncStorage.setItem(TOWN_STORAGE_KEY, JSON.stringify(town));
  } catch {}

  try {
    await AsyncStorage.setItem(CITY_PLOTS_STORAGE_KEY, JSON.stringify([]));
  } catch {}

  // The gear resets too: owned + equipped weapons, armor and clothing.
  try {
    await AsyncStorage.setItem(GEAR_INVENTORY_KEY, JSON.stringify([]));
    await AsyncStorage.setItem(GEAR_EQUIPPED_KEY, JSON.stringify(defaultEquipped()));
  } catch {}

  let unlockedMaps: TownMapId[] = ["town"];
  try {
    const raw = await AsyncStorage.getItem(MAP_UNLOCKED_KEY);
    unlockedMaps = parseUnlockedMaps(raw ? JSON.parse(raw) : null).filter((id) => id !== "city");
    await AsyncStorage.setItem(MAP_UNLOCKED_KEY, JSON.stringify(unlockedMaps));
  } catch {}

  return {
    kind: offer.kind,
    durationDays: offer.durationDays,
    crowns,
    devotionBonus,
    town,
    coins,
    unlockedMaps,
  };
}
