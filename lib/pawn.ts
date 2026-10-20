// Custom pawn creator (Concept 2 — RPG style).
// A user-designed pawn: pebble body + face + accessory.
// Gear shops come later; this file owns the base pawn only.

import AsyncStorage from "@react-native-async-storage/async-storage";

export const CUSTOM_PAWN_STORAGE_KEY = "prayercircle.pawn.custom.v1";

export type PawnEyeStyle = "round" | "happy" | "sleepy" | "determined" | "starry";
export type PawnMouthStyle = "smile" | "open" | "flat" | "smirk";
export type PawnAccessory = "none" | "tophat" | "crown" | "halo" | "cap";
export type PawnGender = "male" | "female";
export type PawnHairStyle = "bald" | "short" | "medium" | "long" | "mohawk" | "bun" | "bob" | "ponytail" | "braid" | "pixie" | "fade" | "buzz" | "curly" | "dreads" | "pompadour" | "sidepart" | "pigtails" | "highbun" | "wavy" | "lob" | "laurel" | "coronet" | "glorymane";

export type PawnBodyStyle = "pebble" | "round" | "tall" | "stocky";

export const PAWN_BODY_STYLES: { id: PawnBodyStyle; name: string }[] = [
  { id: "pebble", name: "Pebble" },
  { id: "round", name: "Round" },
  { id: "tall", name: "Tall" },
  { id: "stocky", name: "Stocky" },
];

export const HAIR_GROWTH_PER_DAY = 12;
export const HAIR_MAX = 100;
export const BEARD_GROWTH_PER_DAY = 12;

export type PawnBeardStyle = "none" | "full" | "goatee" | "mustache" | "gilded" | "radiant" | "heavenly";

export const PAWN_BEARD_STYLES: { id: PawnBeardStyle; name: string; cost: number; description: string; minShopLevel: 1 | 2 | 3; unlockPrestige?: number }[] = [
  { id: "none", name: "Clean Shaven", cost: 0, description: "No beard, ever.", minShopLevel: 1 },
  { id: "full", name: "Full Beard", cost: 0, description: "The classic. Grows wild if you let it.", minShopLevel: 1 },
  { id: "goatee", name: "Goatee", cost: 15, description: "Chin patch. Sharp and deliberate.", minShopLevel: 2 },
  { id: "mustache", name: "Mustache", cost: 15, description: "Upper lip only. Distinguished.", minShopLevel: 3 },
  // Prestige styles — free to wear once the Crown is earned.
  { id: "gilded", name: "Gilded Beard", cost: 0, description: "A full beard bound with a band of gold.", minShopLevel: 1, unlockPrestige: 1 },
  { id: "radiant", name: "Radiant Beard", cost: 0, description: "Full and bright, with light at the edges.", minShopLevel: 1, unlockPrestige: 2 },
  { id: "heavenly", name: "Heavenly Beard", cost: 0, description: "Long, white, and glorious — the elder's crown.", minShopLevel: 1, unlockPrestige: 3 },
];

export const BEARD_STYLES_STORAGE_KEY = "prayercircle.pawn.beardstyles.v1";

export async function loadOwnedBeardStyles(): Promise<PawnBeardStyle[]> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem(BEARD_STYLES_STORAGE_KEY);
    if (!raw) return ["none", "full"];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return ["none", "full"];
    const valid = arr.filter((s): s is PawnBeardStyle => PAWN_BEARD_STYLES.some((b) => b.id === s));
    if (!valid.includes("none")) valid.push("none");
    if (!valid.includes("full")) valid.push("full");
    return valid;
  } catch { return ["none", "full"]; }
}

export async function saveOwnedBeardStyles(styles: PawnBeardStyle[]): Promise<void> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.setItem(BEARD_STYLES_STORAGE_KEY, JSON.stringify(styles));
  } catch {}
}

/** 75% off style prices until first prestige (new-player discount). */
export async function styleDiscountMult(): Promise<number> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem("prayercircle.hometown.prestige.v1");
    const level = raw ? parseInt(raw, 10) || 0 : 0;
    return level === 0 ? 0.25 : 1;
  } catch { return 1; }
}

/** Discounted price for a style (rounded up, min 1 if original cost > 0). */
export function discountedStylePrice(cost: number, mult: number): number {
  if (cost <= 0) return 0;
  return Math.max(1, Math.ceil(cost * mult));
}

/**
 * Level of the placed barbershop across all maps (0 when none placed).
 * Better styles unlock as the barbershop is upgraded.
 */
export async function shopLevelFor(type: "barbershop"): Promise<number> {
  const { shopBuildingLevel } = await import("@/lib/hometown");
  return shopBuildingLevel(type);
}

/** Reset owned styles on prestige (back to defaults). */
export async function resetOwnedStyles(): Promise<void> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.setItem(HAIR_STYLES_STORAGE_KEY, JSON.stringify(["bald", "short"]));
    await AsyncStorage.setItem(BEARD_STYLES_STORAGE_KEY, JSON.stringify(["none", "full"]));
  } catch {}
}

export type CustomPawn = {
  id: string;
  name: string;
  bodyColor: string;
  eyeStyle: PawnEyeStyle;
  mouthStyle: PawnMouthStyle;
  accessory: PawnAccessory;
  gender: PawnGender;
  hairStyle: PawnHairStyle;
  bodyStyle: PawnBodyStyle;
  /** Beard length (0-100) at the time of lastTrim. Grows +15/day for male pawns. */
  beardLength: number;
  /** ISO timestamp of the last trim (baseline for growth). */
  lastTrim: string;
  beardStyle: PawnBeardStyle;
  /** Hair color (hex). */
  hairColor: string;
  /** Hair length (0-100) at the time of lastHaircut. Grows +12/day. */
  hairLength: number;
  /** ISO timestamp of the last haircut (baseline for growth). */
  lastHaircut: string;
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

export type HairStyleGender = "male" | "female" | "both";

export const PAWN_HAIR_STYLES: { id: PawnHairStyle; label: string; cost: number; description: string; gender: HairStyleGender; minShopLevel: 1 | 2 | 3; unlockPrestige?: number }[] = [
  { id: "bald", label: "Bald", cost: 0, description: "Clean and simple.", gender: "both", minShopLevel: 1 },
  { id: "short", label: "Short", cost: 0, description: "Neat and tidy.", gender: "both", minShopLevel: 1 },
  { id: "medium", label: "Medium", cost: 10, description: "A bit of length on the sides.", gender: "male", minShopLevel: 2 },
  { id: "long", label: "Long", cost: 20, description: "Flowing locks.", gender: "male", minShopLevel: 2 },
  { id: "mohawk", label: "Mohawk", cost: 25, description: "Bold strip down the middle.", gender: "male", minShopLevel: 3 },
  { id: "bun", label: "Bun", cost: 25, description: "Top knot. Stylish.", gender: "male", minShopLevel: 3 },
  { id: "bob", label: "Bob", cost: 15, description: "Chin-length bob.", gender: "female", minShopLevel: 1 },
  { id: "ponytail", label: "Ponytail", cost: 20, description: "High ponytail.", gender: "female", minShopLevel: 2 },
  { id: "braid", label: "Braid", cost: 25, description: "Long braid.", gender: "female", minShopLevel: 2 },
  { id: "pixie", label: "Pixie", cost: 15, description: "Short pixie cut.", gender: "female", minShopLevel: 1 },
  { id: "fade", label: "Fade", cost: 15, description: "Short sides, longer on top.", gender: "male", minShopLevel: 1 },
  { id: "buzz", label: "Buzz Cut", cost: 15, description: "Very short all over.", gender: "male", minShopLevel: 1 },
  { id: "curly", label: "Curly", cost: 20, description: "Round curly top.", gender: "male", minShopLevel: 2 },
  { id: "sidepart", label: "Side Part", cost: 20, description: "Neat side sweep.", gender: "male", minShopLevel: 2 },
  { id: "dreads", label: "Dreadlocks", cost: 30, description: "Hanging locks.", gender: "male", minShopLevel: 3 },
  { id: "pompadour", label: "Pompadour", cost: 30, description: "Swept up high in front.", gender: "male", minShopLevel: 3 },
  { id: "pigtails", label: "Pigtails", cost: 15, description: "Two side ponytails.", gender: "female", minShopLevel: 1 },
  { id: "lob", label: "Lob", cost: 15, description: "Long bob, shoulder length.", gender: "female", minShopLevel: 1 },
  { id: "wavy", label: "Wavy", cost: 20, description: "Shoulder-length waves.", gender: "female", minShopLevel: 2 },
  { id: "highbun", label: "High Bun", cost: 20, description: "Bun piled high on top.", gender: "female", minShopLevel: 2 },
  // Prestige styles — free to wear once the Crown is earned.
  { id: "laurel", label: "Laurel Crown", cost: 0, description: "A victor's laurel, woven with gold.", gender: "both", minShopLevel: 1, unlockPrestige: 1 },
  { id: "coronet", label: "Radiant Coronet", cost: 0, description: "A shining coronet — light at every point.", gender: "both", minShopLevel: 1, unlockPrestige: 2 },
  { id: "glorymane", label: "Glory Mane", cost: 0, description: "A flowing mane streaked with glory.", gender: "both", minShopLevel: 1, unlockPrestige: 3 },
];

export const PAWN_HAIR_COLORS: { id: string; name: string }[] = [
  { id: "#111827", name: "Black" },
  { id: "#5C3D2E", name: "Brown" },
  { id: "#D4A54C", name: "Blonde" },
  { id: "#8B3A3A", name: "Auburn" },
  { id: "#6B7280", name: "Grey" },
  { id: "#7C3AED", name: "Purple" },
];

export const HAIR_STYLES_STORAGE_KEY = "prayercircle.pawn.hairstyles.v1";

export async function loadOwnedHairStyles(): Promise<PawnHairStyle[]> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem(HAIR_STYLES_STORAGE_KEY);
    if (!raw) return ["bald", "short"];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return ["bald", "short"];
    const valid = arr.filter((s): s is PawnHairStyle => PAWN_HAIR_STYLES.some((h) => h.id === s));
    if (!valid.includes("bald")) valid.push("bald");
    if (!valid.includes("short")) valid.push("short");
    return valid;
  } catch { return ["bald", "short"]; }
}

export async function saveOwnedHairStyles(styles: PawnHairStyle[]): Promise<void> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.setItem(HAIR_STYLES_STORAGE_KEY, JSON.stringify(styles));
  } catch {}
}

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
    bodyStyle: "pebble",
    beardStyle: "full",
    beardLength: 0,
    lastTrim: now,
    hairLength: 0,
    hairColor: "#111827",
    lastHaircut: now,
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
    bodyStyle: ["pebble", "round", "tall", "stocky"].includes(p.bodyStyle as string) ? (p.bodyStyle as PawnBodyStyle) : "pebble",
    beardStyle: PAWN_BEARD_STYLES.some((b) => b.id === p.beardStyle) ? (p.beardStyle as PawnBeardStyle) : "full",
    beardLength,
    lastTrim: typeof p.lastTrim === "string" ? p.lastTrim : new Date().toISOString(),
    hairColor: typeof p.hairColor === "string" && PAWN_HAIR_COLORS.some((c) => c.id === p.hairColor) ? p.hairColor : "#111827",
    hairLength: typeof p.hairLength === "number" && isFinite(p.hairLength) ? Math.max(0, Math.min(HAIR_MAX, p.hairLength)) : 0,
    lastHaircut: typeof p.lastHaircut === "string" ? p.lastHaircut : new Date().toISOString(),
    createdAt: typeof p.createdAt === "string" ? p.createdAt : new Date().toISOString(),
  };
}

/** Devotion growth multiplier (cached; call refreshStatBoostCache() to warm). */
let cachedGrowthMult = 0;
export function setCachedGrowthMult(mult: number): void {
  cachedGrowthMult = mult;
}
try {
  // Warm lazily without creating an import cycle (character-stats never imports pawn).
  import("./character-stats").then((m) => {
    cachedGrowthMult = m.getCachedStatBoosts().growthMult;
  }).catch(() => {});
} catch {}

/** Current beard length (0-100) for a pawn, including growth since last trim. Female pawns always return 0. */
export function beardGrowthFor(pawn: CustomPawn): number {
  if (pawn.gender !== "male") return 0;
  const last = new Date(pawn.lastTrim).getTime();
  if (!isFinite(last)) return Math.max(0, Math.min(BEARD_MAX, pawn.beardLength || 0));
  const days = Math.max(0, (Date.now() - last) / 86400000);
  const rate = BEARD_GROWTH_PER_DAY * (1 + cachedGrowthMult);
  return Math.max(0, Math.min(BEARD_MAX, (pawn.beardLength || 0) + days * rate));
}

/** Trim the beard back to zero and reset the growth clock. */
export function trimBeard(pawn: CustomPawn): CustomPawn {
  return { ...pawn, beardLength: 0, lastTrim: new Date().toISOString() };
}

/** Current hair length (0-100), including growth since last haircut. */
export function hairGrowthFor(pawn: CustomPawn): number {
  const last = new Date(pawn.lastHaircut).getTime();
  if (!isFinite(last)) return Math.max(0, Math.min(HAIR_MAX, pawn.hairLength || 0));
  const days = Math.max(0, (Date.now() - last) / 86400000);
  const rate = HAIR_GROWTH_PER_DAY * (1 + cachedGrowthMult);
  return Math.max(0, Math.min(HAIR_MAX, (pawn.hairLength || 0) + days * rate));
}

/** Cut hair back to zero and reset the growth clock. */
export function cutHair(pawn: CustomPawn): CustomPawn {
  return { ...pawn, hairLength: 0, lastHaircut: new Date().toISOString() };
}

/** Friendly label for a hair length. */
export function hairLabel(length: number): string {
  if (length <= 0) return "Fresh cut";
  if (length <= 20) return "Just growing";
  if (length <= 45) return "Getting shaggy";
  if (length <= 75) return "Needs a cut";
  return "Wild hair!";
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
