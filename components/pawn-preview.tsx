import type { CustomPawn } from "@/lib/pawn";
import type { GearItem } from "@/lib/gear";
import { HeroForPawn, type HeroContext } from "@/components/hero-sprite";

/**
 * The player's character: the 8-bit Hero in his normal clothes — the
 * equipped outfit/tunic with the saved appearance's hair, beard and
 * body shape. Every surface that shows the character renders this
 * (maps, interiors, profile, creator and barbershop previews) — there
 * is no other renderer.
 *
 * GEAR RULE (Jonathan, 2026-10-21): armor and weapons exist ONLY in
 * the Dark Forest. This preview defaults to the "world" context
 * (clothes only — no armor pieces, no weapon in hand). A surface must
 * pass context="forest" explicitly to gear him, and only Dark Forest
 * surfaces may. (The Dark Forest's own combat render composes its
 * geared hero inside dark-forest.tsx and doesn't come through here.)
 * An explicitly previewed CLOTHES item (equippedGear) is part of the
 * world look and applies in both contexts — a clothes-shop fitting
 * room previews outfits, never armor or weapons, through here.
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
  /** Weapon rotation — the Dark Forest holds the blade at 8° at rest. */
  weaponAngle?: string;
  /** Gear context — see HeroContext. Defaults to "world" (clothes). */
  context?: HeroContext;
}) {
  const clothesItem = equippedGear && equippedGear.type === "clothes" ? equippedGear : null;
  return <HeroForPawn pawn={pawn} size={size} clothesItem={clothesItem} weaponAngle={weaponAngle} context={context} />;
}
