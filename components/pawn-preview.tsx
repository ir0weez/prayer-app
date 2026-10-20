import type { CustomPawn } from "@/lib/pawn";
import type { GearItem } from "@/lib/gear";
import { HeroForPawn } from "@/components/hero-sprite";

/**
 * The player's character: the 8-bit Hero — the Dark Forest character
 * wearing the equipped armor, weapon and clothes, with the saved
 * appearance's hair, beard, body shape, eyes, mouth and accessory.
 * Every surface that shows the character renders this (maps, interiors,
 * profile, creator and barbershop previews) — there is no other renderer.
 */
export function PawnPreview({
  pawn,
  size = 120,
  equippedGear,
}: {
  pawn: CustomPawn;
  size?: number;
  equippedGear?: GearItem | null;
}) {
  const clothesItem = equippedGear && equippedGear.type === "clothes" ? equippedGear : null;
  return <HeroForPawn pawn={pawn} size={size} clothesItem={clothesItem} />;
}
