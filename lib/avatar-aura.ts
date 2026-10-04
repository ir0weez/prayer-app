import type { StyleProp, ViewStyle } from "react-native";
import type { ShinyAvatarId } from "@/lib/avatar-system";
import { BOOK_AVATAR_AURAS } from "./book-avatar-aura";

export type AvatarAuraStyle = "rays" | "rings" | "stained-glass" | "embers" | "stars" | "dust" | "radiant" | "prismatic";

export type AvatarAuraDefinition = {
  id: string;
  label: string;
  glowColor: string;
  secondaryColor: string;
  accentColors: string[];
  style: AvatarAuraStyle;
  ringCount: number;
};

export const AVATAR_AURAS: Record<ShinyAvatarId, AvatarAuraDefinition> = {
  "lion-shiny": { id: "lion-shiny", label: "Dawn Lion", glowColor: "#F5B942", secondaryColor: "#FFD978", accentColors: ["#FFE8A3", "#F59E0B"], style: "rays", ringCount: 1 },
  "dragon-shiny": { id: "dragon-shiny", label: "Triune Dragon", glowColor: "#D9A441", secondaryColor: "#FFE4A3", accentColors: ["#FFF1C2", "#B87918"], style: "rings", ringCount: 3 },
  "parrot-shiny": { id: "parrot-shiny", label: "Psalm Parrot", glowColor: "#3B82F6", secondaryColor: "#10B981", accentColors: ["#8B5CF6", "#F472B6", "#34D399"], style: "stained-glass", ringCount: 1 },
  "fox-shiny": { id: "fox-shiny", label: "Ember Fox", glowColor: "#EA580C", secondaryColor: "#FDBA74", accentColors: ["#FED7AA", "#C2410C"], style: "embers", ringCount: 1 },
  "eagle-shiny": { id: "eagle-shiny", label: "Covenant Eagle", glowColor: "#0EA5E9", secondaryColor: "#BAE6FD", accentColors: ["#E0F2FE", "#0284C7"], style: "rays", ringCount: 1 },
  "camel-shiny": { id: "camel-shiny", label: "Desert Camel", glowColor: "#D97706", secondaryColor: "#FDE68A", accentColors: ["#FEF3C7", "#B45309"], style: "dust", ringCount: 1 },
  "dove-shiny": { id: "dove-shiny", label: "Manna Dove", glowColor: "#F8FAFC", secondaryColor: "#E0E7FF", accentColors: ["#FFFFFF", "#C7D2FE"], style: "radiant", ringCount: 1 },
  "tiger-shiny": { id: "tiger-shiny", label: "Burning Bush Tiger", glowColor: "#F97316", secondaryColor: "#DC2626", accentColors: ["#FBBF24", "#FB7185"], style: "embers", ringCount: 1 },
  "owl-shiny": { id: "owl-shiny", label: "Heavens Owl", glowColor: "#4567A8", secondaryColor: "#CBD5E1", accentColors: ["#FFFFFF", "#93C5FD"], style: "stars", ringCount: 1 },
  "kangaroo-shiny": { id: "kangaroo-shiny", label: "Wilderness Kangaroo", glowColor: "#C89B3C", secondaryColor: "#F4D58D", accentColors: ["#FFE7A8", "#D6A84F"], style: "dust", ringCount: 1 },
  "bull-shiny": { id: "bull-shiny", label: "Armor of God Bull", glowColor: "#FFF8D6", secondaryColor: "#F4D77B", accentColors: ["#FFFFFF", "#FFEAA7"], style: "radiant", ringCount: 1 },
  "prayercircle-shiny": { id: "prayercircle-shiny", label: "Mr. Prayer Circle", glowColor: "#E5E7EB", secondaryColor: "#C4B5FD", accentColors: ["#F472B6", "#60A5FA", "#34D399", "#FBBF24"], style: "prismatic", ringCount: 2 },
  "upper-room-shiny": { id: "upper-room-shiny", label: "Upper Room", glowColor: "#FFD700", secondaryColor: "#FFA500", accentColors: ["#FFD700", "#FFA500"], style: "rays", ringCount: 2 },
  "carmels-fire-shiny": { id: "carmels-fire-shiny", label: "Carmel's Fire", glowColor: "#FF4500", secondaryColor: "#FFD700", accentColors: ["#FF4500", "#FFD700"], style: "embers", ringCount: 2 },
  "nehemiahs-watch-shiny": { id: "nehemiahs-watch-shiny", label: "Nehemiah's Watch", glowColor: "#4169E1", secondaryColor: "#87CEEB", accentColors: ["#4169E1", "#87CEEB"], style: "rings", ringCount: 2 },
  "midnight-hymn-shiny": { id: "midnight-hymn-shiny", label: "Midnight Hymn", glowColor: "#9370DB", secondaryColor: "#BA55D3", accentColors: ["#9370DB", "#BA55D3"], style: "stars", ringCount: 2 },
  "wilderness-prayer-shiny": { id: "wilderness-prayer-shiny", label: "Wilderness Prayer", glowColor: "#D2691E", secondaryColor: "#F4A460", accentColors: ["#D2691E", "#F4A460"], style: "dust", ringCount: 2 },
  "lords-prayer-shiny": { id: "lords-prayer-shiny", label: "Lord's Prayer", glowColor: "#FFD700", secondaryColor: "#FFFFFF", accentColors: ["#FFD700", "#FFFFFF"], style: "radiant", ringCount: 2 },
  "cloud-witnesses-shiny": { id: "cloud-witnesses-shiny", label: "Cloud of Witnesses", glowColor: "#87CEEB", secondaryColor: "#FFFFFF", accentColors: ["#87CEEB", "#FFFFFF"], style: "rings", ringCount: 3 },
  "esthers-courage-shiny": { id: "esthers-courage-shiny", label: "Esther's Courage", glowColor: "#FF69B4", secondaryColor: "#FFD700", accentColors: ["#FF69B4", "#FFD700"], style: "rays", ringCount: 2 },
  "daniels-resolve-shiny": { id: "daniels-resolve-shiny", label: "Daniel's Resolve", glowColor: "#4169E1", secondaryColor: "#FFD700", accentColors: ["#4169E1", "#FFD700"], style: "rings", ringCount: 2 },
  "ninevehs-mercy-shiny": { id: "ninevehs-mercy-shiny", label: "Nineveh's Mercy", glowColor: "#20B2AA", secondaryColor: "#87CEEB", accentColors: ["#20B2AA", "#87CEEB"], style: "dust", ringCount: 2 },
  "elijahs-strength-shiny": { id: "elijahs-strength-shiny", label: "Elijah's Strength", glowColor: "#FF4500", secondaryColor: "#FFD700", accentColors: ["#FF4500", "#FFD700"], style: "embers", ringCount: 2 },
  "sinais-glory-shiny": { id: "sinais-glory-shiny", label: "Sinai's Glory", glowColor: "#FFD700", secondaryColor: "#FFA500", accentColors: ["#FFD700", "#FFA500"], style: "radiant", ringCount: 3 },
};

/** Used only for the personal profile when its active avatar is a regular pack avatar or photo. */
export const PERSONAL_PROFILE_AURA: AvatarAuraDefinition = {
  id: "lion-shiny",
  label: "Personal Avatar",
  glowColor: "#8557D9",
  secondaryColor: "#B99AF2",
  accentColors: ["#D9C7FF", "#A78BFA"],
  style: "rays",
  ringCount: 1,
};

export const PERSONAL_PROFILE_AURA_TIERS: Record<"purple" | "bronze" | "silver" | "gold", AvatarAuraDefinition> = {
  purple: PERSONAL_PROFILE_AURA,
  bronze: { id: "personal-bronze", label: "Bronze", glowColor: "#CD7F32", secondaryColor: "#F0B27A", accentColors: ["#FFE0B2", "#A95C20"], style: "rays", ringCount: 1 },
  silver: { id: "personal-silver", label: "Silver", glowColor: "#A8B0BA", secondaryColor: "#E5E7EB", accentColors: ["#FFFFFF", "#CBD5E1"], style: "rays", ringCount: 1 },
  gold: { id: "personal-gold", label: "Gold", glowColor: "#D4AF37", secondaryColor: "#FFE9A6", accentColors: ["#FFF8D6", "#B8860B"], style: "rays", ringCount: 1 },
};

export function getPersonalProfileAuraTier(level: number): "purple" | "bronze" | "silver" | "gold" {
  const safeLevel = Math.max(1, Math.floor(level));
  if (safeLevel >= 50) return "gold";
  if (safeLevel >= 26) return "silver";
  if (safeLevel >= 3) return "bronze";
  return "purple";
}

export function getPersonalProfileAura(avatarAsset?: string, auraId?: string, level = 1): AvatarAuraDefinition {
  return getAvatarAura(avatarAsset, auraId) ?? PERSONAL_PROFILE_AURA_TIERS[getPersonalProfileAuraTier(level)];
}

export function getAvatarAura(avatarAsset?: string, auraId?: string): AvatarAuraDefinition | undefined {
  // The aura belongs to the active avatar, never to a stale persisted auraId.
  // This prevents a previously selected shiny aura from appearing around a
  // regular pack avatar or an uploaded profile photo.
  const candidate = (avatarAsset || "").replace(/^avatar-/, "").replace(/\.webp$/, "") as ShinyAvatarId;
  return AVATAR_AURAS[candidate] ?? BOOK_AVATAR_AURAS[candidate];
}

export function getAvatarAuraId(avatarAsset?: string): string | undefined {
  return getAvatarAura(avatarAsset)?.id;
}

export function auraWashColor(aura: AvatarAuraDefinition | undefined, alpha = "18") {
  return aura ? `${aura.glowColor}${alpha}` : undefined;
}

export function auraRingStyle(aura: AvatarAuraDefinition | undefined, size: number, animated: boolean): StyleProp<ViewStyle> {
  if (!aura) return undefined;
  return {
    position: "absolute",
    left: animated ? -5 : -3,
    top: animated ? -5 : -3,
    width: size + (animated ? 10 : 6),
    height: size + (animated ? 10 : 6),
    borderRadius: (size + (animated ? 10 : 6)) / 2,
    borderWidth: 2,
    borderColor: aura.glowColor,
    shadowColor: aura.glowColor,
    shadowOpacity: animated ? 0.8 : 0.65,
    shadowRadius: animated ? 10 : 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: animated ? 8 : 4,
  };
}
