// Custom pawn creator (Concept 2 — RPG style).
// A user-designed pawn: pebble body + face + accessory.
// Gear shops come later; this file owns the base pawn only.

import AsyncStorage from "@react-native-async-storage/async-storage";

export const CUSTOM_PAWN_STORAGE_KEY = "prayercircle.pawn.custom.v1";

export type PawnEyeStyle = "round" | "happy" | "sleepy" | "determined" | "starry";
export type PawnMouthStyle = "smile" | "open" | "flat" | "smirk";
export type PawnAccessory = "none" | "tophat" | "crown" | "halo" | "cap";
export type PawnGender = "male" | "female";
export type PawnHairStyle = "bald" | "short" | "medium" | "long" | "mohawk" | "bun";

export type CustomPawn = {
  id: string;
  name: string;
  bodyColor: string;
  eyeStyle: PawnEyeStyle;
  mouthStyle: PawnMouthStyle;
  accessory: PawnAccessory;
  gender: PawnGender;
  hairStyle: PawnHairStyle;
  /** Beard length (0-100) at the time of lastTrim. Grows +15/day for male pawns. */
  beardLength: number;
  /** ISO timestamp of the last trim (baseline for growth). */
  lastTrim: string;
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

export const PAWN_GENDERS: { id: PawnGender; label: string }[] = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
];

export const PAWN_HAIR_STYLES: { id: PawnHairStyle; label: string }[] = [
  { id: "bald", label: "Bald" },
  { id: "short", label: "Short" },
  { id: "medium", label: "Medium" },
  { id: "long", label: "Long" },
  { id: "mohawk", label: "Mohawk" },
  { id: "bun", label: "Bun" },
];

export const BEARD_GROWTH_PER_DAY = 15;
export const BEARD_MAX = 100;
export const BARBERSHOP_TRIM_COST = 5;

function isEyeStyle(v: unknown): v is PawnEyeStyle {
  return PAWN_EYE_STYLES.some((s) => s.id === v);
}
function isMouthStyle(v: unknown): v is PawnMouthStyle {
  return PAWN_MOUTH_STYLES.some((s) => s.id === v);
}
function isAccessory(v: unknown): v is PawnAccessory {
  return PAWN_ACCESSORIES.some((s) => s.id === v);
}
function isGender(v: unknown): v is PawnGender {
  return v === "male" || v === "female";
}
function isHairStyle(v: unknown): v is PawnHairStyle {
  return PAWN_HAIR_STYLES.some((s) => s.id === v);
}

export function defaultPawn(): CustomPawn {
  const now = new Date().toISOString();
  return {
    id: `pawn-${Date.now()}`,
    name: "",
    bodyColor: PAWN_BODY_COLORS[0],
    eyeStyle: "round",
    mouthStyle: "smile",
    accessory: "none",
    gender: "male",
    hairStyle: "short",
    beardLength: 0,
    lastTrim: now,
    createdAt: now,
  };
}

export function parseCustomPawn(value: unknown): CustomPawn | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Partial<CustomPawn>;
  if (typeof p.id !== "string") return null;
  const beardLength = typeof p.beardLength === "number" && isFinite(p.beardLength)
    ? Math.max(0, Math.min(BEARD_MAX, p.beardLength))
    : 0;
  return {
    id: p.id,
    name: typeof p.name === "string" ? p.name : "",
    bodyColor: typeof p.bodyColor === "string" && PAWN_BODY_COLORS.includes(p.bodyColor)
      ? p.bodyColor
      : PAWN_BODY_COLORS[0],
    eyeStyle: isEyeStyle(p.eyeStyle) ? p.eyeStyle : "round",
    mouthStyle: isMouthStyle(p.mouthStyle) ? p.mouthStyle : "smile",
    accessory: isAccessory(p.accessory) ? p.accessory : "none",
    gender: isGender(p.gender) ? p.gender : "male",
    hairStyle: isHairStyle(p.hairStyle) ? p.hairStyle : "short",
    beardLength,
    lastTrim: typeof p.lastTrim === "string" ? p.lastTrim : new Date().toISOString(),
    createdAt: typeof p.createdAt === "string" ? p.createdAt : new Date().toISOString(),
  };
}

/** Current beard length (0-100) for a pawn, including growth since last trim. Female pawns always return 0. */
export function beardGrowthFor(pawn: CustomPawn): number {
  if (pawn.gender !== "male") return 0;
  const last = new Date(pawn.lastTrim).getTime();
  if (!isFinite(last)) return Math.max(0, Math.min(BEARD_MAX, pawn.beardLength || 0));
  const days = Math.max(0, (Date.now() - last) / 86400000);
  return Math.max(0, Math.min(BEARD_MAX, (pawn.beardLength || 0) + days * BEARD_GROWTH_PER_DAY));
}

/** Trim the beard back to zero and reset the growth clock. */
export function trimBeard(pawn: CustomPawn): CustomPawn {
  return { ...pawn, beardLength: 0, lastTrim: new Date().toISOString() };
}

/** Friendly label for a beard length. */
export function beardLabel(length: number): string {
  if (length <= 0) return "Clean shaven";
  if (length <= 20) return "Just stubble";
  if (length <= 40) return "Trim needed";
  if (length <= 65) return "Getting shaggy";
  if (length <= 90) return "Getting wild";
  return "Wild!";
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
