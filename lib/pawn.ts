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

export const HAIR_MAX = 100;
/**
 * Rider G weekly growth cycle (Jonathan, 2026-10-21): hair and beard
 * grow out over ONE WEEK without a cut. Day 0 (the day of the cut /
 * trim) is fresh; each day is a visible step longer; day 6 is FULLY
 * grown — the barbershop's "trim needed / needs a cut" state — and
 * growth plateaus there (no overgrowth, no penalty) until the next
 * cut resets the cycle to day 0. The ramp is driven by DAYS SINCE
 * TRIM, not by the weekday: a cut must visibly reset growth (that is
 * the system's core verb), so "Saturday = fully grown" is the cadence
 * Jonathan experiences when cuts land on the week's rhythm, while a
 * mid-week cut simply starts its own 7-day cycle. 100 / 6 per day
 * makes day 6 land exactly on full.
 */
export const GROWTH_FULL_DAYS = 6;
export const HAIR_GROWTH_PER_DAY = 100 / GROWTH_FULL_DAYS;
export const BEARD_GROWTH_PER_DAY = 100 / GROWTH_FULL_DAYS;

/**
 * Pure growth ramp: the growth value (0-100) after `days` days since
 * a cut, on top of the length stored at that cut (`base`). Linear —
 * every day adds the same visible step — strictly increasing on
 * days 0..6, exactly 100 at day 6, and flat (plateau, no overgrowth)
 * beyond. `rateMult` is the devotion growth boost (1 = none).
 */
export function growthValueForDays(days: number, base = 0, rateMult = 1): number {
  const d = Math.max(0, days);
  // HAIR_ and BEARD_GROWTH_PER_DAY are the same weekly rate by design.
  const grown = d * HAIR_GROWTH_PER_DAY * Math.max(0, rateMult);
  return Math.max(0, Math.min(HAIR_MAX, base + grown));
}

/* ------------------------------------------------------------------ */
/* Rider F — the growth -> beard-SHAPE ramp. Rendering a beard used to */
/* jump cut -> full in one step (a `> 2` gate plus one scaled         */
/* ellipse). This pure helper turns a style + a growth value (0-100)  */
/* into near-continuous shape parameters: stubble deepening -> short  */
/* boxed -> filling cheeks -> full -> long (tapered chin). Every      */
/* field is piecewise-linear between keyframes, so coverage is        */
/* monotonic in growth and no single growth point adds more than a    */
/* whisper of area. Coordinates are FACE-LOCAL: the face is a circle  */
/* of radius 1 centered on (0, 0), +y down. Containment contract:     */
/* |x| <= 1 always, the beard never rises above y = 0.15 (below the   */
/* nose), and the chin may extend below the face circle only as a     */
/* TAPER (chinWidthFrac <= jawWidthFrac) down to BEARD_MAX_BOTTOM.    */
/* ------------------------------------------------------------------ */

export type BeardGrowthStage = "bare" | "stubble" | "short" | "filling" | "full" | "long";
export type BeardFamily = "none" | "mustache" | "goatee" | "full";

export type BeardShape = {
  visible: boolean;
  stage: BeardGrowthStage;
  family: BeardFamily;
  /** Approximate covered fraction of the lower face, 0..1. Monotonic
   *  non-decreasing in growth; a +1 growth step never adds > 0.02. */
  coverage: number;
  /** Fill opacity — stubble is a shadow, not a solid mass. */
  opacity: number;
  /** Half-width of the jaw mass, in face radii (<= 0.95). */
  jawWidthFrac: number;
  /** How far coverage has risen up the cheeks, 0..1 (goatee: 0, the
   *  cheeks stay bare by definition). */
  cheekRiseFrac: number;
  /** Chin extension below the chin line (0.82 radii), in face radii. */
  chinDropFrac: number;
  /** Half-width at the chin tip — the taper (<= jawWidthFrac). */
  chinWidthFrac: number;
  /** Mustache half-width / thickness, in face radii. */
  mustacheWidthFrac: number;
  mustacheThickFrac: number;
  /** Face-local bounds of everything the shape may draw. */
  bounds: { left: number; right: number; top: number; bottom: number };
};

/** The lowest point (face-local) any beard may reach: the chin line
 *  (0.82) plus the longest tapered drop (heavenly, 0.62). */
export const BEARD_MAX_BOTTOM = 1.44;

export function beardStageFor(growth: number): BeardGrowthStage {
  if (growth <= 0) return "bare";
  if (growth < 18) return "stubble";
  if (growth < 40) return "short";
  if (growth < 65) return "filling";
  if (growth < 90) return "full";
  return "long";
}

type BeardKeys = {
  coverage: number;
  opacity: number;
  jaw: number;
  cheek: number;
  drop: number;
  chinW: number;
  mw: number;
  mth: number;
};
const BEARD_KEY_GROWTH = [0, 15, 35, 60, 85, 100] as const;
const BEARD_KEYS: Record<Exclude<BeardFamily, "none">, BeardKeys[]> = {
  full: [
    { coverage: 0, opacity: 0, jaw: 0, cheek: 0, drop: 0, chinW: 0, mw: 0, mth: 0 },
    { coverage: 0.16, opacity: 0.38, jaw: 0.68, cheek: 0.18, drop: 0.04, chinW: 0.55, mw: 0.5, mth: 0.09 },
    { coverage: 0.36, opacity: 0.75, jaw: 0.78, cheek: 0.45, drop: 0.14, chinW: 0.52, mw: 0.62, mth: 0.13 },
    { coverage: 0.6, opacity: 0.95, jaw: 0.86, cheek: 0.72, drop: 0.26, chinW: 0.48, mw: 0.72, mth: 0.17 },
    { coverage: 0.83, opacity: 1, jaw: 0.91, cheek: 0.92, drop: 0.36, chinW: 0.44, mw: 0.8, mth: 0.2 },
    { coverage: 1, opacity: 1, jaw: 0.93, cheek: 1, drop: 0.42, chinW: 0.42, mw: 0.84, mth: 0.22 },
  ],
  goatee: [
    { coverage: 0, opacity: 0, jaw: 0, cheek: 0, drop: 0, chinW: 0, mw: 0, mth: 0 },
    { coverage: 0.05, opacity: 0.4, jaw: 0.34, cheek: 0, drop: 0.06, chinW: 0.3, mw: 0.45, mth: 0.09 },
    { coverage: 0.11, opacity: 0.78, jaw: 0.38, cheek: 0, drop: 0.18, chinW: 0.32, mw: 0.58, mth: 0.13 },
    { coverage: 0.17, opacity: 0.95, jaw: 0.4, cheek: 0, drop: 0.32, chinW: 0.33, mw: 0.68, mth: 0.17 },
    { coverage: 0.21, opacity: 1, jaw: 0.42, cheek: 0, drop: 0.44, chinW: 0.34, mw: 0.76, mth: 0.2 },
    { coverage: 0.24, opacity: 1, jaw: 0.43, cheek: 0, drop: 0.5, chinW: 0.34, mw: 0.8, mth: 0.22 },
  ],
  mustache: [
    { coverage: 0, opacity: 0, jaw: 0, cheek: 0, drop: 0, chinW: 0, mw: 0, mth: 0 },
    { coverage: 0.04, opacity: 0.42, jaw: 0, cheek: 0, drop: 0, chinW: 0, mw: 0.5, mth: 0.1 },
    { coverage: 0.08, opacity: 0.8, jaw: 0, cheek: 0, drop: 0, chinW: 0, mw: 0.64, mth: 0.15 },
    { coverage: 0.11, opacity: 0.95, jaw: 0, cheek: 0, drop: 0, chinW: 0, mw: 0.74, mth: 0.19 },
    { coverage: 0.13, opacity: 1, jaw: 0, cheek: 0, drop: 0, chinW: 0, mw: 0.8, mth: 0.22 },
    { coverage: 0.14, opacity: 1, jaw: 0, cheek: 0, drop: 0, chinW: 0, mw: 0.84, mth: 0.24 },
  ],
};

function lerpKeys(keys: BeardKeys[], growth: number): BeardKeys {
  const g = Math.max(0, Math.min(100, growth));
  let i = 0;
  while (i < BEARD_KEY_GROWTH.length - 2 && g > BEARD_KEY_GROWTH[i + 1]) i++;
  const g0 = BEARD_KEY_GROWTH[i];
  const g1 = BEARD_KEY_GROWTH[i + 1];
  const t = g1 === g0 ? 0 : (g - g0) / (g1 - g0);
  const a = keys[i];
  const b = keys[i + 1];
  const mix = (x: number, y: number) => x + (y - x) * t;
  return {
    coverage: mix(a.coverage, b.coverage),
    opacity: mix(a.opacity, b.opacity),
    jaw: mix(a.jaw, b.jaw),
    cheek: mix(a.cheek, b.cheek),
    drop: mix(a.drop, b.drop),
    chinW: mix(a.chinW, b.chinW),
    mw: mix(a.mw, b.mw),
    mth: mix(a.mth, b.mth),
  };
}

/**
 * The beard shape for a style at a growth value (0-100). Pure and
 * deterministic. Style "none" (or growth 0) is truly bare. The
 * prestige full-family styles share the full ramp; "heavenly" wears
 * it longer and more tapered, as befits the elder's crown.
 */
export function beardShapeFor(style: PawnBeardStyle, growth: number): BeardShape {
  const g = Math.max(0, Math.min(100, growth));
  const family: BeardFamily =
    style === "none" || g <= 0
      ? "none"
      : style === "mustache"
        ? "mustache"
        : style === "goatee"
          ? "goatee"
          : "full";
  if (family === "none") {
    return {
      visible: false,
      stage: "bare",
      family,
      coverage: 0,
      opacity: 0,
      jawWidthFrac: 0,
      cheekRiseFrac: 0,
      chinDropFrac: 0,
      chinWidthFrac: 0,
      mustacheWidthFrac: 0,
      mustacheThickFrac: 0,
      bounds: { left: 0, right: 0, top: 0, bottom: 0 },
    };
  }
  const k = lerpKeys(BEARD_KEYS[family], g);
  const dropScale = style === "heavenly" ? 1.45 : 1;
  const chinDropFrac = Math.min(k.drop * dropScale, BEARD_MAX_BOTTOM - 0.82);
  const chinWidthFrac = Math.min(k.chinW, k.jaw);
  const halfW = Math.max(k.jaw, family === "mustache" ? k.mw : 0);
  return {
    visible: true,
    stage: beardStageFor(g),
    family,
    coverage: k.coverage,
    opacity: k.opacity,
    jawWidthFrac: k.jaw,
    cheekRiseFrac: k.cheek,
    chinDropFrac,
    chinWidthFrac,
    mustacheWidthFrac: k.mw,
    mustacheThickFrac: k.mth,
    bounds: {
      left: -halfW,
      right: halfW,
      top: 0.3,
      bottom: family === "mustache" ? 0.3 + k.mth : 0.82 + chinDropFrac,
    },
  };
}

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
    if (level > 0) return 1;
    // Any prestige ends the discount — including a sub-Crown devotion
    // prestige, which doesn't raise the Crown level key.
    const prog = await AsyncStorage.getItem("prayercircle.hometown.prestige-days.v1");
    if (prog) {
      try {
        const parsed = JSON.parse(prog);
        if (parsed && typeof parsed.totalPrestiges === "number" && parsed.totalPrestiges > 0) return 1;
      } catch {}
    }
    return 0.25;
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
  /** Beard length (0-100) at the time of lastTrim. Grows on the
   *  Rider G weekly ramp (full at day 6) for male pawns. */
  beardLength: number;
  /** ISO timestamp of the last trim (baseline for growth). */
  lastTrim: string;
  beardStyle: PawnBeardStyle;
  /** Hair color (hex). */
  hairColor: string;
  /** Hair length (0-100) at the time of lastHaircut. Grows on the
   *  Rider G weekly ramp (full at day 6). */
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

/**
 * Resolve a growth-clock anchor (`lastTrim` / `lastHaircut`) from a
 * stored pawn record. A stored anchor is honored only when it is a
 * string that parses to a real date.
 *
 * The failure this replaces (Jonathan's missing beard, 2026-10-21):
 * the ORIGINAL pawn format predates the growth system entirely — it
 * stored no `lastTrim` at all. Parse used to substitute "now" for a
 * missing anchor, and because that substitution lived only in the
 * parsed copy, EVERY load of a legacy record re-anchored the trim
 * clock to the moment of loading: days-since-trim was always 0, the
 * stored base length is 0, so growth computed 0 forever and a hero
 * whose style said "full beard" stood permanently clean-shaven.
 *
 * An unreadable anchor now falls back to the hero's creation date —
 * he has been growing since he was made, and the weekly ramp caps at
 * full, so a long-time hero wears his style's beard in full. If even
 * `createdAt` is unreadable, anchor one full growth cycle in the
 * past: fully grown, never zero. A man who picked a beard style
 * HAS a beard.
 */
function growthAnchorFor(stored: unknown, storedCreatedAt: unknown): string {
  if (typeof stored === "string" && isFinite(new Date(stored).getTime())) return stored;
  if (typeof storedCreatedAt === "string" && isFinite(new Date(storedCreatedAt).getTime())) return storedCreatedAt;
  return new Date(Date.now() - (GROWTH_FULL_DAYS + 1) * 86400000).toISOString();
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
    lastTrim: growthAnchorFor(p.lastTrim, p.createdAt),
    hairColor: typeof p.hairColor === "string" && PAWN_HAIR_COLORS.some((c) => c.id === p.hairColor) ? p.hairColor : "#111827",
    hairLength: typeof p.hairLength === "number" && isFinite(p.hairLength) ? Math.max(0, Math.min(HAIR_MAX, p.hairLength)) : 0,
    lastHaircut: growthAnchorFor(p.lastHaircut, p.createdAt),
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
  // Unreadable anchor (a record parse could not repair): the beard
  // has had all the time in the world — fully grown, never the old
  // fallback of the stored base length (0 for every legacy save,
  // which is what left styled heroes permanently clean-shaven).
  if (!isFinite(last)) return BEARD_MAX;
  const days = Math.max(0, (Date.now() - last) / 86400000);
  // Rider G: days-since-trim on the weekly ramp (full at day 6).
  return growthValueForDays(days, pawn.beardLength || 0, 1 + cachedGrowthMult);
}

/** Trim the beard back to zero and reset the growth clock. */
export function trimBeard(pawn: CustomPawn): CustomPawn {
  return { ...pawn, beardLength: 0, lastTrim: new Date().toISOString() };
}

/** Current hair length (0-100), including growth since last haircut. */
export function hairGrowthFor(pawn: CustomPawn): number {
  const last = new Date(pawn.lastHaircut).getTime();
  // Same unreadable-anchor rule as the beard: fully grown, never 0.
  if (!isFinite(last)) return HAIR_MAX;
  const days = Math.max(0, (Date.now() - last) / 86400000);
  // Rider G: hair rides the same days-since-cut weekly ramp as the
  // beard (full at day 6, plateau after) — one cycle, one helper.
  return growthValueForDays(days, pawn.hairLength || 0, 1 + cachedGrowthMult);
}

/** Cut hair back to zero and reset the growth clock. */
export function cutHair(pawn: CustomPawn): CustomPawn {
  return { ...pawn, hairLength: 0, lastHaircut: new Date().toISOString() };
}

/** Friendly label for a hair length. Rider G alignment: the
 *  "Needs a cut" state IS full growth (100, reached at day 6) — no
 *  earlier rung claims it. */
export function hairLabel(length: number): string {
  if (length <= 0) return "Fresh cut";
  if (length <= 35) return "Just growing";
  if (length <= 70) return "Getting shaggy";
  if (length < 100) return "Long — nearly grown out";
  return "Needs a cut";
}

/** Friendly label for a beard length. Rider G alignment: "Trim
 *  needed" lands exactly at full growth (100), like the hair. */
export function beardLabel(length: number): string {
  if (length <= 0) return "Clean shaven";
  if (length <= 35) return "Just stubble";
  if (length <= 70) return "Getting shaggy";
  if (length < 100) return "Getting wild";
  return "Trim needed";
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
