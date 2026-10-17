// Custom pawn creator (Concept 2 — RPG style).
// A user-designed pawn: pebble body + face + accessory.
// Gear shops come later; this file owns the base pawn only.

import AsyncStorage from "@react-native-async-storage/async-storage";

export const CUSTOM_PAWN_STORAGE_KEY = "prayercircle.pawn.custom.v1";

export type PawnEyeStyle = "round" | "happy" | "sleepy" | "determined" | "starry";
export type PawnMouthStyle = "smile" | "open" | "flat" | "smirk";
export type PawnAccessory = "none" | "tophat" | "crown" | "halo" | "cap";

export type CustomPawn = {
  id: string;
  name: string;
  bodyColor: string;
  eyeStyle: PawnEyeStyle;
  mouthStyle: PawnMouthStyle;
  accessory: PawnAccessory;
  createdAt: string;
};

export const PAWN_BODY_COLORS: string[] = [
  "#7C5CFF", // violet
  "#F59E0B", // amber
  "#10B981", // emerald
  "#EC4899", // pink
  "#3B82F6", // blue
  "#EF4444", // red
  "#14B8A6", // teal
  "#6B7280", // slate
];

export const PAWN_EYE_STYLES: { id: PawnEyeStyle; label: string }[] = [
  { id: "round", label: "Round" },
  { id: "happy", label: "Happy" },
  { id: "sleepy", label: "Sleepy" },
  { id: "determined", label: "Determined" },
  { id: "starry", label: "Starry" },
];

export const PAWN_MOUTH_STYLES: { id: PawnMouthStyle; label: string }[] = [
  { id: "smile", label: "Smile" },
  { id: "open", label: "Open" },
  { id: "flat", label: "Flat" },
  { id: "smirk", label: "Smirk" },
];

export const PAWN_ACCESSORIES: { id: PawnAccessory; label: string }[] = [
  { id: "none", label: "None" },
  { id: "tophat", label: "Top Hat" },
  { id: "crown", label: "Crown" },
  { id: "halo", label: "Halo" },
  { id: "cap", label: "Cap" },
];

function isEyeStyle(v: unknown): v is PawnEyeStyle {
  return PAWN_EYE_STYLES.some((s) => s.id === v);
}
function isMouthStyle(v: unknown): v is PawnMouthStyle {
  return PAWN_MOUTH_STYLES.some((s) => s.id === v);
}
function isAccessory(v: unknown): v is PawnAccessory {
  return PAWN_ACCESSORIES.some((s) => s.id === v);
}

export function defaultPawn(): CustomPawn {
  return {
    id: `pawn-${Date.now()}`,
    name: "",
    bodyColor: PAWN_BODY_COLORS[0],
    eyeStyle: "round",
    mouthStyle: "smile",
    accessory: "none",
    createdAt: new Date().toISOString(),
  };
}

export function parseCustomPawn(value: unknown): CustomPawn | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Partial<CustomPawn>;
  if (typeof p.id !== "string") return null;
  return {
    id: p.id,
    name: typeof p.name === "string" ? p.name : "",
    bodyColor: typeof p.bodyColor === "string" && PAWN_BODY_COLORS.includes(p.bodyColor)
      ? p.bodyColor
      : PAWN_BODY_COLORS[0],
    eyeStyle: isEyeStyle(p.eyeStyle) ? p.eyeStyle : "round",
    mouthStyle: isMouthStyle(p.mouthStyle) ? p.mouthStyle : "smile",
    accessory: isAccessory(p.accessory) ? p.accessory : "none",
    createdAt: typeof p.createdAt === "string" ? p.createdAt : new Date().toISOString(),
  };
}

export async function loadCustomPawn(): Promise<CustomPawn | null> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_PAWN_STORAGE_KEY);
    if (!raw) return null;
    return parseCustomPawn(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function saveCustomPawn(pawn: CustomPawn): Promise<void> {
  await AsyncStorage.setItem(CUSTOM_PAWN_STORAGE_KEY, JSON.stringify(pawn));
}
