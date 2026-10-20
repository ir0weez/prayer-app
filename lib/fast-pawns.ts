import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PawnAccessory, PawnEyeStyle, PawnHairStyle } from "@/lib/pawn";

export type FastPawnId =
  | "pebble" | "ring" | "heart" | "star" | "sketch" | "moon"
  | "flame" | "lightning" | "drop" | "diamond" | "leaf" | "chess"
  | "crown" | "prayer" | "fish" | "dove" | "comet" | "shield"
  | "neon" | "sun"
  | "pebble-mossy" | "pebble-slate" | "pebble-ember" | "pebble-frost"
  | "pebble-crystal" | "pebble-sand" | "pebble-ocean" | "pebble-golden"
  | "pebble-shadow" | "pebble-rainbow" | "pebble-diamond";

export type FastPawnDef = {
  id: FastPawnId;
  name: string;
  /** XP level requirement (ignored when prayerStreak is set). */
  level: number;
  /** Personal prayer streak requirement — takes precedence over level when set. */
  prayerStreak?: number;
};

const PAWN_STORAGE_KEY = "prayercircle.fastPawn.v1";
const PAWN_NAME_KEY = "prayercircle.pawnName.v1";
const PAWN_PET_UNLOCKED_KEY = "prayercircle.pawnPetUnlocked.v1";

export const FAST_PAWNS: FastPawnDef[] = [
  { id: "pebble", name: "Pebble", level: 1 },
  { id: "ring", name: "Ring", level: 5 },
  { id: "heart", name: "Heart", level: 8 },
  { id: "star", name: "Star", level: 10 },
  { id: "sketch", name: "Sketch", level: 12 },
  { id: "moon", name: "Moon", level: 15 },
  { id: "flame", name: "Flame", level: 20 },
  { id: "lightning", name: "Lightning", level: 25 },
  { id: "drop", name: "Drop", level: 30 },
  { id: "diamond", name: "Diamond", level: 35 },
  { id: "leaf", name: "Leaf", level: 40 },
  { id: "chess", name: "Chess", level: 45 },
  { id: "crown", name: "Crown", level: 50 },
  { id: "prayer", name: "Prayer", level: 0, prayerStreak: 50 },
  { id: "fish", name: "Fish", level: 60 },
  { id: "dove", name: "Dove", level: 70 },
  { id: "comet", name: "Comet", level: 75 },
  { id: "shield", name: "Shield", level: 85 },
  { id: "neon", name: "Neon", level: 90 },
  { id: "sun", name: "Sun", level: 100 },
  { id: "pebble-mossy", name: "Mossy Pebble", level: 3 },
  { id: "pebble-slate", name: "Slate Pebble", level: 7 },
  { id: "pebble-sand", name: "Sandy Pebble", level: 14 },
  { id: "pebble-ocean", name: "Ocean Pebble", level: 22 },
  { id: "pebble-ember", name: "Ember Pebble", level: 33 },
  { id: "pebble-frost", name: "Frost Pebble", level: 48 },
  { id: "pebble-crystal", name: "Crystal Pebble", level: 65 },
  { id: "pebble-golden", name: "Golden Pebble", level: 80 },
  { id: "pebble-shadow", name: "Shadow Pebble", level: 0 },
  { id: "pebble-rainbow", name: "Rainbow Pebble", level: 0 },
  { id: "pebble-diamond", name: "Diamond Pebble", level: 0 },
];

/**
 * How each unlockable board piece dresses the Hero. The pieces are little
 * hero figures now (the old pawn shapes are retired): each keeps its name,
 * unlock condition and signature colors — expressed as the hero's tunic,
 * hair, skin, eyes and accessory. When a caller passes its own color (the
 * board / picker theme), that color wins for the tunic.
 */
export type FastPawnHeroStyle = {
  tunic: string;
  hair: string;
  hairStyle: PawnHairStyle;
  skin?: string;
  eyeStyle?: PawnEyeStyle;
  accessory?: PawnAccessory;
};

export const FAST_PAWN_HERO_STYLES: Record<FastPawnId, FastPawnHeroStyle> = {
  pebble: { tunic: "#FFD54F", hair: "#6B4423", hairStyle: "short" },
  ring: { tunic: "#F59E0B", hair: "#111827", hairStyle: "short" },
  heart: { tunic: "#EF4444", hair: "#7F1D1D", hairStyle: "medium" },
  star: { tunic: "#FBBF24", hair: "#F59E0B", hairStyle: "curly", eyeStyle: "starry" },
  sketch: { tunic: "#9CA3AF", hair: "#374151", hairStyle: "sidepart" },
  moon: { tunic: "#6366F1", hair: "#1E1B4B", hairStyle: "medium", eyeStyle: "sleepy" },
  flame: { tunic: "#F97316", hair: "#DC2626", hairStyle: "mohawk" },
  lightning: { tunic: "#1F2937", hair: "#FDE047", hairStyle: "mohawk" },
  drop: { tunic: "#3B82F6", hair: "#1D4ED8", hairStyle: "fade" },
  diamond: { tunic: "#A5F3FC", hair: "#BAE6FD", hairStyle: "bun", skin: "#F8FAFC" },
  leaf: { tunic: "#22C55E", hair: "#166534", hairStyle: "wavy" },
  chess: { tunic: "#111827", hair: "#F9FAFB", hairStyle: "short" },
  crown: { tunic: "#7C3AED", hair: "#111827", hairStyle: "short", accessory: "crown" },
  prayer: { tunic: "#F5F5F4", hair: "#78716C", hairStyle: "long", eyeStyle: "happy", accessory: "halo" },
  fish: { tunic: "#0EA5E9", hair: "#0369A1", hairStyle: "fade" },
  dove: { tunic: "#F8FAFC", hair: "#CBD5E1", hairStyle: "long", eyeStyle: "happy" },
  comet: { tunic: "#8B5CF6", hair: "#DDD6FE", hairStyle: "ponytail" },
  shield: { tunic: "#64748B", hair: "#334155", hairStyle: "buzz" },
  neon: { tunic: "#EC4899", hair: "#22D3EE", hairStyle: "mohawk" },
  sun: { tunic: "#FBBF24", hair: "#F59E0B", hairStyle: "curly", eyeStyle: "happy", accessory: "halo" },
  "pebble-mossy": { tunic: "#65A30D", hair: "#3F6212", hairStyle: "curly" },
  "pebble-slate": { tunic: "#64748B", hair: "#334155", hairStyle: "short" },
  "pebble-sand": { tunic: "#D9A441", hair: "#92400E", hairStyle: "medium" },
  "pebble-ocean": { tunic: "#0284C7", hair: "#075985", hairStyle: "wavy" },
  "pebble-ember": { tunic: "#EA580C", hair: "#7C2D12", hairStyle: "mohawk" },
  "pebble-frost": { tunic: "#E0F2FE", hair: "#7DD3FC", hairStyle: "long", skin: "#F8FAFC" },
  "pebble-crystal": { tunic: "#C084FC", hair: "#E9D5FF", hairStyle: "bun" },
  "pebble-golden": { tunic: "#F59E0B", hair: "#B45309", hairStyle: "short", accessory: "crown" },
  "pebble-shadow": { tunic: "#1F2937", hair: "#030712", hairStyle: "long", skin: "#9CA3AF" },
  "pebble-rainbow": { tunic: "#FACC15", hair: "#111827", hairStyle: "curly", eyeStyle: "happy" },
  "pebble-diamond": { tunic: "#F0FDFA", hair: "#99F6E4", hairStyle: "bun", skin: "#F8FAFC" },
};

/** Rainbow-striped sprite art for the Rainbow Pebble hero (letters R/O/Y/G/U/V
 * are palette keys — see RAINBOW_HERO_PALETTE). */
export const RAINBOW_HERO_ART: string[] = [
  ".....KKKK.....",
  "....KHHHHK....",
  "....KHSSHK....",
  "....KSEESK....",
  "....KSSSSK....",
  ".....KSSK.....",
  "....KRRRRK....",
  "...KOOOOOOK...",
  "...KYBBBBYK...",
  "...KGGGGGGK...",
  "....KUUUK.....",
  "....KUUUK.....",
  "...KVVKKVVK...",
  "..............",
];

export const RAINBOW_HERO_PALETTE: Record<string, string> = {
  R: "#EF4444",
  O: "#F97316",
  Y: "#FACC15",
  G: "#22C55E",
  U: "#3B82F6",
  V: "#8B5CF6",
};

export function isPawnUnlocked(pawn: FastPawnDef, level: number, prayerStreak = 0, ownedShopIds: string[] = []): boolean {
  if (pawn.prayerStreak != null) return prayerStreak >= pawn.prayerStreak;
  // Level 0 with no prayerStreak = shop-exclusive; check ownership
  if (pawn.level === 0) {
    const shopId = `pawn-${pawn.id.replace("pebble-", "")}`;
    return ownedShopIds.includes(shopId);
  }
  return level >= pawn.level;
}

/** Short unlock-condition label for the picker ("Lv 10" or "50-day prayer streak"). */
export function pawnUnlockLabel(pawn: FastPawnDef): string {
  if (pawn.prayerStreak != null) return `${pawn.prayerStreak}-day prayer streak`;
  if (pawn.level === 0) return "Town Shop";
  return `Lv ${pawn.level}`;
}

export function getPawnDef(id: string): FastPawnDef {
  return FAST_PAWNS.find((p) => p.id === id) ?? FAST_PAWNS[0];
}

/** Loads/persists the selected fasting pawn. Defaults to "pebble". */
export function useFastPawn() {
  const [pawnId, setPawnIdState] = useState<FastPawnId>("pebble");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(PAWN_STORAGE_KEY)
      .then((raw) => {
        if (!active) return;
        if (raw && FAST_PAWNS.some((p) => p.id === raw)) setPawnIdState(raw as FastPawnId);
        setHydrated(true);
      })
      .catch(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const setPawnId = useCallback((id: FastPawnId) => {
    setPawnIdState(id);
    AsyncStorage.setItem(PAWN_STORAGE_KEY, id).catch(() => undefined);
  }, []);

  return { pawnId, setPawnId, hydrated };
}


/** Pawn companion name, stored persistently. */
export function usePawnName() {
  const [name, setNameState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(PAWN_NAME_KEY)
      .then((raw) => {
        if (!active) return;
        if (raw) setNameState(raw);
        setHydrated(true);
      })
      .catch(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const setName = useCallback((n: string) => {
    const trimmed = n.trim().slice(0, 20);
    setNameState(trimmed || null);
    if (trimmed) AsyncStorage.setItem(PAWN_NAME_KEY, trimmed).catch(() => undefined);
    else AsyncStorage.removeItem(PAWN_NAME_KEY).catch(() => undefined);
  }, []);

  return { name, setName, hydrated };
}


/** Pawn pet unlock — earned at 40-day streak, kept forever. */
export function usePawnPetUnlocked() {
  const [unlocked, setUnlockedState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(PAWN_PET_UNLOCKED_KEY)
      .then((raw) => {
        if (!active) return;
        if (raw === "1") setUnlockedState(true);
        setHydrated(true);
      })
      .catch(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const unlock = useCallback(() => {
    setUnlockedState(true);
    AsyncStorage.setItem(PAWN_PET_UNLOCKED_KEY, "1").catch(() => undefined);
  }, []);

  return { unlocked, unlock, hydrated };
}
