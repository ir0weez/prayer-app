import { memo } from "react";
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
import { HeroForPawn, HeroThumbnail, type HeroContext } from "@/components/hero-sprite";
import { PAPER_HERO_H, PaperHeroFigure } from "@/components/paper-interior";

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
  // Scale fix (v160): size is the figure's HEIGHT — unit derives from
  // the hero's 17-unit height, so he renders exactly size tall (the old
  // width-derived unit made him ~1.545x size).
  return <PaperHeroFigure pawn={effPawn} unit={size / PAPER_HERO_H} />;
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
  // Scale fix (v160): same height-derived base as PawnPreview (height
  // = size); headOnly keeps its 1.38 enlargement against that corrected
  // base, and the size x size clip below crops the overflow to the head.
  const figure = <PaperHeroFigure pawn={pawn} unit={(headOnly ? size * 1.38 : size) / PAPER_HERO_H} />;
  if (!headOnly) return figure;
  return (
    <View style={{ width: size, height: size, overflow: "hidden", alignItems: "center" }}>
      {figure}
    </View>
  );
}

// ─── FastPawnShape — relocated from the deleted board file (v280) ──
// The Town Shop's three "Hero Skins" (Shadow / Rainbow / Diamond
// Pebble) are little Hero figures in the skin's colors, rendered
// through here. The board pawn system that originally owned this
// table — the 24-piece catalog, its unlock conditions, the picker,
// the Prayer pawn — was deleted with the board in v280 (Jonathan,
// Oct 26: "Why would we keep it?"). What survives is only the
// presentation the shop still needs: the base pebble's style and
// the three purchasable variants. Unknown ids fall back to the
// base pebble, exactly as getPawnDef did.
type ShopPawnHeroStyle = {
  tunic: string;
  hair: string;
  hairStyle: PawnHairStyle;
  skin?: string;
  eyeStyle?: PawnEyeStyle;
  accessory?: PawnAccessory;
};

const SHOP_PAWN_HERO_STYLES: Record<string, ShopPawnHeroStyle> = {
  pebble: { tunic: "#FFD54F", hair: "#6B4423", hairStyle: "short" },
  "pebble-shadow": { tunic: "#1F2937", hair: "#030712", hairStyle: "long", skin: "#9CA3AF" },
  "pebble-rainbow": { tunic: "#FACC15", hair: "#111827", hairStyle: "curly", eyeStyle: "happy" },
  "pebble-diamond": { tunic: "#F0FDFA", hair: "#99F6E4", hairStyle: "bun", skin: "#F8FAFC" },
};

/** Rainbow-striped sprite art for the Rainbow Pebble hero (letters R/O/Y/G/U/V
 * are palette keys — see RAINBOW_HERO_PALETTE). */
const RAINBOW_HERO_ART: string[] = [
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

const RAINBOW_HERO_PALETTE: Record<string, string> = {
  R: "#EF4444",
  O: "#F97316",
  Y: "#FACC15",
  G: "#22C55E",
  U: "#3B82F6",
  V: "#8B5CF6",
};

export const FastPawnShape = memo(function FastPawnShape({
  id,
  size = 20,
  color,
}: {
  id: string;
  size?: number;
  color?: string;
}) {
  const hs = SHOP_PAWN_HERO_STYLES[id] ?? SHOP_PAWN_HERO_STYLES.pebble;
  const rainbow = id === "pebble-rainbow";
  return (
    <HeroThumbnail
      size={size}
      tunicColor={rainbow ? hs.tunic : color ?? hs.tunic}
      skinColor={hs.skin}
      hairStyle={hs.hairStyle}
      hairColor={hs.hair}
      eyeStyle={hs.eyeStyle ?? "round"}
      mouthStyle="smile"
      accessory={hs.accessory ?? "none"}
      artOverride={rainbow ? RAINBOW_HERO_ART : undefined}
      paletteExtra={rainbow ? RAINBOW_HERO_PALETTE : undefined}
    />
  );
});
