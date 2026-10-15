import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type FastPawnId =
  | "pebble" | "ring" | "heart" | "star" | "sketch" | "moon"
  | "flame" | "lightning" | "drop" | "diamond" | "leaf" | "chess"
  | "crown" | "prayer" | "fish" | "dove" | "comet" | "shield"
  | "neon" | "sun";

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
];

export function isPawnUnlocked(pawn: FastPawnDef, level: number, prayerStreak = 0): boolean {
  if (pawn.prayerStreak != null) return prayerStreak >= pawn.prayerStreak;
  return level >= pawn.level;
}

/** Short unlock-condition label for the picker ("Lv 10" or "50-day prayer streak"). */
export function pawnUnlockLabel(pawn: FastPawnDef): string {
  if (pawn.prayerStreak != null) return `${pawn.prayerStreak}-day prayer streak`;
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
