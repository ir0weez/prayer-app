import { View } from "react-native";
import type {
  CustomPawn,
  PawnAccessory,
  PawnBeardStyle,
  PawnBodyStyle,
  PawnEyeStyle,
  PawnGender,
  PawnHairStyle,
  PawnMouthStyle,
} from "@/lib/pawn";
import type { GearItem } from "@/lib/gear";
import { HeroForPawn, type HeroContext } from "@/components/hero-sprite";
import { PAPER_HERO_W, PaperHeroFigure } from "@/components/paper-interior";

/**
 * The player's character in the WORLD: a PAPER figure in his normal
 * clothes — the equipped outfit/tunic with the saved appearance's
 * hair, live-grown beard and body color (Jonathan's hero paper sweep,
 * 2026-10-21: "make my hero match the paper everywhere except for the
 * dark forest"). Every world surface that shows the character renders
 * through here (profile, creator, barbershop, interiors, board token).
 *
 * GEAR RULE (2026-10-21): armor and weapons exist ONLY in the Dark
 * Forest, and the chunky PIXEL hero lives there too — dark-forest.tsx
 * composes its own geared pixel hero and never comes through here.
 * The context="forest" branch below exists only to keep this API
 * honest; no caller uses it. An explicitly previewed CLOTHES item
 * (equippedGear) is part of the world look — a fitting room previews
 * outfits by recoloring the paper hero's clothes, never armor or
 * weapons.
 */
export function PawnPreview({
  pawn,
  size = 120,
  equippedGear,
  weaponAngle,
  context = "world",
}: {
  pawn: CustomPawn;
  size?: number;
  equippedGear?: GearItem | null;
  /** Weapon rotation — forest only; the paper hero carries no weapon. */
  weaponAngle?: string;
  /** Gear context — see HeroContext. Defaults to "world" (paper). */
  context?: HeroContext;
}) {
  if (context === "forest") {
    const clothesItem = equippedGear && equippedGear.type === "clothes" ? equippedGear : null;
    return <HeroForPawn pawn={pawn} size={size} clothesItem={clothesItem} weaponAngle={weaponAngle} context={context} />;
  }
  const clothesItem = equippedGear && equippedGear.type === "clothes" ? equippedGear : null;
  const bodyColor = clothesItem?.visual.bodyColor ?? pawn.bodyColor;
  const effPawn = bodyColor === pawn.bodyColor ? pawn : { ...pawn, bodyColor };
  return <PaperHeroFigure pawn={effPawn} unit={size / PAPER_HERO_W} />;
}

/**
 * Paper counterpart of HeroThumbnail for the creator/barbershop
 * option grids: a paper hero head/figure previewing one appearance
 * choice (hair style/color, beard style/length, tunic color). The
 * paper hero has a single face, so eye/mouth/accessory props are
 * accepted for call-site compatibility but do not change the paper
 * face — those choices still apply to the Dark Forest pixel hero,
 * where they render. Skin tone is the paper figure's fixed skin.
 */
export function PaperHeroThumbnail({
  size = 56,
  headOnly,
  tunicColor = "#7C5CFF",
  hairStyle = "short",
  hairColor = "#6B4423",
  beardStyle = "none",
  beardLength = 0,
  bodyStyle = "pebble",
  gender = "male",
}: {
  size?: number;
  headOnly?: boolean;
  tunicColor?: string;
  skinColor?: string;
  hairStyle?: PawnHairStyle;
  hairColor?: string;
  beardStyle?: PawnBeardStyle;
  beardLength?: number;
  eyeStyle?: PawnEyeStyle;
  mouthStyle?: PawnMouthStyle;
  accessory?: PawnAccessory;
  bodyStyle?: PawnBodyStyle;
  gender?: PawnGender;
}) {
  const now = new Date().toISOString();
  const pawn: CustomPawn = {
    id: "paper-thumbnail",
    name: "Hero",
    bodyColor: tunicColor,
    eyeStyle: "round",
    mouthStyle: "smile",
    accessory: "none",
    gender,
    hairStyle,
    bodyStyle,
    beardLength,
    lastTrim: now,
    beardStyle,
    hairColor,
    hairLength: 0,
    lastHaircut: now,
    createdAt: now,
  };
  const figure = <PaperHeroFigure pawn={pawn} unit={(headOnly ? size * 1.38 : size) / PAPER_HERO_W} />;
  if (!headOnly) return figure;
  return (
    <View style={{ width: size, height: size, overflow: "hidden", alignItems: "center" }}>
      {figure}
    </View>
  );
}
