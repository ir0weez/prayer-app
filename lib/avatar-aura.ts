import type { StyleProp, ViewStyle } from "react-native";
import type { ShinyAvatarId } from "@/lib/avatar-system";

export type AvatarAuraStyle = "rays" | "rings" | "stained-glass" | "embers" | "stars" | "dust" | "radiant" | "prismatic";

export type AvatarAuraDefinition = {
  id: ShinyAvatarId;
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
  "tiger-shiny": { id: "tiger-shiny", label: "Burning Bush Tiger", glowColor: "#F97316", secondaryColor: "#DC2626", accentColors: ["#FBBF24", "#FB7185"], style: "embers", ringCount: 1 },
  "owl-shiny": { id: "owl-shiny", label: "Heavens Owl", glowColor: "#4567A8", secondaryColor: "#CBD5E1", accentColors: ["#FFFFFF", "#93C5FD"], style: "stars", ringCount: 1 },
  "kangaroo-shiny": { id: "kangaroo-shiny", label: "Wilderness Kangaroo", glowColor: "#C89B3C", secondaryColor: "#F4D58D", accentColors: ["#FFE7A8", "#D6A84F"], style: "dust", ringCount: 1 },
  "bull-shiny": { id: "bull-shiny", label: "Armor of God Bull", glowColor: "#FFF8D6", secondaryColor: "#F4D77B", accentColors: ["#FFFFFF", "#FFEAA7"], style: "radiant", ringCount: 1 },
  "prayercircle-shiny": { id: "prayercircle-shiny", label: "Mr. Prayer Circle", glowColor: "#E5E7EB", secondaryColor: "#C4B5FD", accentColors: ["#F472B6", "#60A5FA", "#34D399", "#FBBF24"], style: "prismatic", ringCount: 2 },
};

export function getAvatarAura(avatarAsset?: string, auraId?: string): AvatarAuraDefinition | undefined {
  const candidate = (auraId || avatarAsset || "").replace(/^avatar-/, "").replace(/\.webp$/, "") as ShinyAvatarId;
  return AVATAR_AURAS[candidate];
}

export function getAvatarAuraId(avatarAsset?: string): ShinyAvatarId | undefined {
  return getAvatarAura(avatarAsset)?.id;
}

export function auraWashColor(aura: AvatarAuraDefinition | undefined, alpha = "18") {
  return aura ? `${aura.glowColor}${alpha}` : undefined;
}

export function auraRingStyle(aura: AvatarAuraDefinition | undefined, size: number, animated: boolean): StyleProp<ViewStyle> {
  if (!aura) return undefined;
  return {
    position: "absolute",
    width: size + (animated ? 10 : 6),
    height: size + (animated ? 10 : 6),
    borderRadius: (size + (animated ? 10 : 6)) / 2,
    borderWidth: animated ? 2 : 1.5,
    borderColor: aura.glowColor,
    shadowColor: aura.glowColor,
    shadowOpacity: animated ? 0.8 : 0.35,
    shadowRadius: animated ? 10 : 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: animated ? 6 : 2,
  };
}
