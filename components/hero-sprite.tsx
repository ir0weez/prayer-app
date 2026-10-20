// The Hero — the 8-bit Dark Forest character.
//
// This module is the single source for how the Hero is drawn: the pixel
// sprite, equipped armor + weapon overlays, and the saved appearance's
// hair and beard (the same state lib/pawn + lib/gear hold, and the same
// state the barbershop and gear shops write). The Dark Forest battle, the
// town/city maps, schedule-event scenes and the interiors all render the
// Hero from here, so what Jonathan equips is what he sees — everywhere.

import { useEffect, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import {
  beardGrowthFor,
  type CustomPawn,
  type PawnAccessory,
  type PawnBeardStyle,
  type PawnBodyStyle,
  type PawnEyeStyle,
  type PawnHairStyle,
  type PawnMouthStyle,
} from "@/lib/pawn";
import { GEAR_BY_ID, defaultEquipped, loadEquipped, type EquippedGear, type GearItem } from "@/lib/gear";

/* ------------------------------------------------------------------ */
/* Pixel sprites: string art -> SVG rects. The authentic way.          */
/* ------------------------------------------------------------------ */

export function PixelSprite({
  art,
  palette,
  px,
}: {
  art: string[];
  palette: Record<string, string>;
  px: number;
}) {
  const w = art[0].length;
  const h = art.length;
  return (
    <Svg width={w * px} height={h * px} viewBox={`0 0 ${w} ${h}`}>
      {art.map((row, y) =>
        [...row].map((ch, x) => {
          if (ch === "." || ch === " ") return null;
          const fill = palette[ch];
          if (!fill) return null;
          return <Rect key={`${x}:${y}`} x={x} y={y} width={1.04} height={1.04} fill={fill} />;
        })
      )}
    </Svg>
  );
}

export const HERO_ART = [
  ".....KKKK.....",
  "....KHHHHK....",
  "....KHSSHK....",
  "....KSEESK....",
  "....KSSSSK....",
  ".....KSSK.....",
  "....KCCCCK....",
  "...KCCCCCCK...",
  "...KCCBBCCK...",
  "...KCCCCCCK...",
  "....KLLLK.....",
  "....KLLLK.....",
  "...KLLKKLLK...",
  "..............",
];

const HERO_HEAD_ROWS = HERO_ART.slice(0, 6);

/**
 * Torso + leg rows (rows 6-13) per creator body shape. The head rows never
 * change, so the hair / eyes / mouth / beard overlays stay aligned for every
 * shape — only the silhouette below the neck differs, and it reads at
 * thumbnail size: Round bulges in the middle on short legs, Tall is slim
 * with long legs, Stocky is wide at the shoulders with a wide stance.
 */
const HERO_BODY_ROWS: Record<PawnBodyStyle, string[]> = {
  pebble: HERO_ART.slice(6),
  round: [
    "....KCCCCK....",
    "..KCCCCCCCCK..",
    "..KCCCBBCCCK..",
    "..KCCCCCCCCK..",
    "....KLLLK.....",
    "...KLLKKLLK...",
    "..............",
    "..............",
  ],
  tall: [
    "....KCCCCK....",
    "....KCCCCK....",
    "....KCBBCK....",
    "....KCCCCK....",
    "....KLLLK.....",
    "....KLLLK.....",
    "....KLLLK.....",
    "...KLLKKLLK...",
  ],
  stocky: [
    "...KCCCCCCK...",
    "..KCCCCCCCCK..",
    "..KCCCBBCCCK..",
    "..KCCCCCCCCK..",
    "...KLLLLLK....",
    "...KLLLLLK....",
    "..KLLLKKLLLK..",
    "..............",
  ],
};

/** Sprite art for a creator body shape (pebble = the classic art). */
export function heroArtForBodyStyle(style: PawnBodyStyle = "pebble"): string[] {
  if (style === "pebble") return HERO_ART;
  return [...HERO_HEAD_ROWS, ...HERO_BODY_ROWS[style]];
}

/** Gentle pulsing halo for high-tier gear. Not flashy — a slow breathe. */
export function TierGlow({ color, size, left, top }: { color: string; size: number; left: number; top: number }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.34] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: "absolute", left, top, width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity }}
    />
  );
}

/** Armor plates drawn over the pawn sprite. One look per tier. */
export function ArmorShapes({ armorId }: { armorId: string }) {
  switch (armorId) {
    case "cloth-guard":
      // Padded cloth: quilted shoulder pads and a stitched chest pad.
      return (
        <G>
          <Rect x={12} y={26} width={14} height={10} rx={4} fill="#C9B184" stroke="#A68B5B" strokeWidth={1} />
          <Rect x={39} y={26} width={14} height={10} rx={4} fill="#C9B184" stroke="#A68B5B" strokeWidth={1} />
          <Rect x={19} y={32} width={27} height={16} rx={4} fill="#D6C298" opacity={0.95} />
          <Rect x={19} y={37.5} width={27} height={1.4} fill="#B39267" />
          <Rect x={19} y={43} width={27} height={1.4} fill="#B39267" />
        </G>
      );
    case "iron-plate":
      // Forged steel: breastplate, pauldrons, helm band.
      return (
        <G>
          <Rect x={10} y={24} width={17} height={13} rx={6} fill="#9AA3B2" />
          <Rect x={10} y={24} width={17} height={4} rx={2} fill="#C3CAD6" />
          <Rect x={38} y={24} width={17} height={13} rx={6} fill="#9AA3B2" />
          <Rect x={38} y={24} width={17} height={4} rx={2} fill="#C3CAD6" />
          <Rect x={15} y={30} width={35} height={20} rx={4} fill="#8E97A6" />
          <Rect x={31} y={30} width={3} height={20} fill="#6B7280" />
          <Rect x={15} y={46} width={35} height={4} fill="#6B7280" />
          <Rect x={20} y={1} width={25} height={10} rx={5} fill="#9AA3B2" />
          <Rect x={31} y={9} width={3} height={9} fill="#6B7280" />
        </G>
      );
    case "chainmail-vest":
      // Interlocked rings: dark vest with ring links, mail skirt and coif shoulders.
      return (
        <G>
          <Rect x={12} y={27} width={14} height={9} rx={4} fill="#4A525E" />
          <Rect x={39} y={27} width={14} height={9} rx={4} fill="#4A525E" />
          <Rect x={15} y={30} width={35} height={20} rx={4} fill="#5B6470" />
          {[22, 30, 38, 46].map((cx) =>
            [36, 44].map((cy) => (
              <Circle key={`${cx}:${cy}`} cx={cx} cy={cy} r={2.4} fill="none" stroke="#39404B" strokeWidth={1.2} />
            ))
          )}
          <Rect x={20} y={50} width={25} height={9} rx={3} fill="#4A525E" />
        </G>
      );
    case "mithril-plate":
      // Light as faith: bright silver-blue plate with a soft shimmer halo.
      return (
        <G>
          <Rect x={10} y={24} width={17} height={13} rx={6} fill="#C7DFF5" />
          <Rect x={10} y={24} width={17} height={4} rx={2} fill="#F2F9FF" />
          <Rect x={38} y={24} width={17} height={13} rx={6} fill="#C7DFF5" />
          <Rect x={38} y={24} width={17} height={4} rx={2} fill="#F2F9FF" />
          <Rect x={15} y={30} width={35} height={20} rx={4} fill="#CFE4F7" />
          <Rect x={31} y={30} width={3} height={20} fill="#8FB8DD" />
          <Rect x={15} y={46} width={35} height={4} fill="#8FB8DD" />
          <Rect x={20} y={1} width={25} height={10} rx={5} fill="#CFE4F7" />
          <Rect x={24} y={3} width={17} height={2.4} rx={1.2} fill="#F2F9FF" />
          <Rect x={31} y={9} width={3} height={9} fill="#8FB8DD" />
        </G>
      );
    case "celestial-bulwark":
      // Heaven's shield: radiant gold plate, bright trim, glowing crest.
      return (
        <G>
          <Rect x={10} y={24} width={17} height={13} rx={6} fill="#F6DC8E" />
          <Rect x={10} y={24} width={17} height={4} rx={2} fill="#FFF6D9" />
          <Rect x={38} y={24} width={17} height={13} rx={6} fill="#F6DC8E" />
          <Rect x={38} y={24} width={17} height={4} rx={2} fill="#FFF6D9" />
          <Rect x={15} y={30} width={35} height={20} rx={4} fill="#F3D27A" />
          <Rect x={31} y={30} width={3} height={20} fill="#D9A93F" />
          <Rect x={15} y={46} width={35} height={4} fill="#D9A93F" />
          <Rect x={20} y={1} width={25} height={10} rx={5} fill="#F3D27A" />
          <Rect x={24} y={3} width={17} height={2.4} rx={1.2} fill="#FFF6D9" />
          <Rect x={31} y={9} width={3} height={9} fill="#D9A93F" />
        </G>
      );
    case "gilded-aegis":
      // Crown 1: dark steel under heavy gold trim, ruby crest.
      return (
        <G>
          <Rect x={10} y={24} width={17} height={13} rx={6} fill="#8A6D2F" />
          <Rect x={10} y={24} width={17} height={4} rx={2} fill="#F6C453" />
          <Rect x={38} y={24} width={17} height={13} rx={6} fill="#8A6D2F" />
          <Rect x={38} y={24} width={17} height={4} rx={2} fill="#F6C453" />
          <Rect x={15} y={30} width={35} height={20} rx={4} fill="#6E5626" />
          <Rect x={15} y={30} width={35} height={3.4} fill="#F6C453" />
          <Rect x={15} y={46} width={35} height={4} fill="#D4AF37" />
          <Rect x={31} y={30} width={3} height={20} fill="#D4AF37" />
          <Circle cx={32.5} cy={38} r={3.4} fill="#DC2626" />
          <Rect x={20} y={1} width={25} height={10} rx={5} fill="#8A6D2F" />
          <Rect x={24} y={3} width={17} height={2.4} rx={1.2} fill="#F6C453" />
        </G>
      );
    case "radiant-aegis":
      // Crown 2: bright silver-blue plate with a glowing core.
      return (
        <G>
          <Rect x={10} y={24} width={17} height={13} rx={6} fill="#BAE6FD" />
          <Rect x={10} y={24} width={17} height={4} rx={2} fill="#FFFFFF" />
          <Rect x={38} y={24} width={17} height={13} rx={6} fill="#BAE6FD" />
          <Rect x={38} y={24} width={17} height={4} rx={2} fill="#FFFFFF" />
          <Rect x={15} y={30} width={35} height={20} rx={4} fill="#E0F2FE" />
          <Rect x={31} y={30} width={3} height={20} fill="#7DD3FC" />
          <Rect x={15} y={46} width={35} height={4} fill="#7DD3FC" />
          <Circle cx={32.5} cy={38} r={4.4} fill="#FDE68A" />
          <Circle cx={32.5} cy={38} r={2.2} fill="#FFFFFF" />
          <Rect x={20} y={1} width={25} height={10} rx={5} fill="#BAE6FD" />
          <Rect x={24} y={3} width={17} height={2.4} rx={1.2} fill="#FFFFFF" />
          <Rect x={31} y={9} width={3} height={9} fill="#7DD3FC" />
        </G>
      );
    case "heavenly-aegis":
      // Crown 3: white and gold, a sun crest at the breast.
      return (
        <G>
          <Rect x={10} y={24} width={17} height={13} rx={6} fill="#FEF3C7" />
          <Rect x={10} y={24} width={17} height={4} rx={2} fill="#FFFFFF" />
          <Rect x={38} y={24} width={17} height={13} rx={6} fill="#FEF3C7" />
          <Rect x={38} y={24} width={17} height={4} rx={2} fill="#FFFFFF" />
          <Rect x={15} y={30} width={35} height={20} rx={4} fill="#FFFBEB" />
          <Rect x={15} y={30} width={35} height={3.4} fill="#F6C453" />
          <Rect x={15} y={46} width={35} height={4} fill="#F6C453" />
          <Circle cx={32.5} cy={38} r={4.6} fill="#FBBF24" />
          <Circle cx={32.5} cy={38} r={2.4} fill="#FFFBEB" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <Rect key={deg} x={31.9} y={31.6} width={1.2} height={3} fill="#F59E0B" transform={`rotate(${deg} 32.5 38)`} />
          ))}
          <Rect x={20} y={1} width={25} height={10} rx={5} fill="#FEF3C7" />
          <Rect x={24} y={3} width={17} height={2.4} rx={1.2} fill="#FFFFFF" />
          <Rect x={31} y={9} width={3} height={9} fill="#F6C453" />
        </G>
      );
    case "powers-aegis":
      // Crown 4: violet steel, pauldrons grown broad, a crest spike, amethyst heart.
      return (
        <G>
          <Rect x={8} y={23} width={20} height={15} rx={7} fill="#7C6AAE" />
          <Rect x={8} y={23} width={20} height={5} rx={2.5} fill="#C4B5FD" />
          <Rect x={37} y={23} width={20} height={15} rx={7} fill="#7C6AAE" />
          <Rect x={37} y={23} width={20} height={5} rx={2.5} fill="#C4B5FD" />
          <Rect x={14} y={29} width={37} height={22} rx={4} fill="#6D5E9E" />
          <Rect x={14} y={29} width={37} height={3.6} fill="#C4B5FD" />
          <Rect x={14} y={47} width={37} height={4} fill="#4C3F78" />
          <Rect x={31} y={29} width={3} height={22} fill="#4C3F78" />
          <Rect x={29.4} y={34} width={6.2} height={6.2} fill="#A855F7" transform="rotate(45 32.5 37.1)" />
          <Rect x={20} y={1} width={25} height={10} rx={5} fill="#7C6AAE" />
          <Rect x={24} y={3} width={17} height={2.4} rx={1.2} fill="#C4B5FD" />
          <Path d="M 29 -4 L 32.5 2 L 36 -4 L 34.4 3.4 L 30.6 3.4 Z" fill="#DDD6FE" />
          <Rect x={31} y={9} width={3} height={9} fill="#4C3F78" />
        </G>
      );
    case "virtues-aegis":
      // Crown 5: sea-silver plate, pauldron flares like small wings, wave trim.
      return (
        <G>
          <Path d="M 9 37 L 4 24 L 16 21 L 27 27 L 27 38 Z" fill="#5FA8A0" />
          <Path d="M 56 37 L 61 24 L 49 21 L 38 27 L 38 38 Z" fill="#5FA8A0" />
          <Rect x={10} y={25} width={17} height={12} rx={6} fill="#7FC4BB" />
          <Rect x={10} y={25} width={17} height={4} rx={2} fill="#CCFBF1" />
          <Rect x={38} y={25} width={17} height={12} rx={6} fill="#7FC4BB" />
          <Rect x={38} y={25} width={17} height={4} rx={2} fill="#CCFBF1" />
          <Rect x={15} y={30} width={35} height={21} rx={4} fill="#6DB3AA" />
          <Path d="M 15 40 Q 24 36 32.5 40 Q 41 44 50 40 L 50 44 Q 41 48 32.5 44 Q 24 40 15 44 Z" fill="#3E7C74" />
          <Rect x={15} y={47} width={35} height={4} fill="#3E7C74" />
          <Circle cx={32.5} cy={34.6} r={3} fill="#99F6E4" />
          <Rect x={20} y={1} width={25} height={10} rx={5} fill="#7FC4BB" />
          <Rect x={24} y={3} width={17} height={2.4} rx={1.2} fill="#CCFBF1" />
          <Rect x={31} y={9} width={3} height={9} fill="#3E7C74" />
        </G>
      );
    case "dominions-aegis":
      // Crown 6: midnight plate, a crowned helm, and the first cape.
      return (
        <G>
          <Rect x={5} y={30} width={8} height={33} rx={3} fill="#1E3A8A" />
          <Rect x={52} y={30} width={8} height={33} rx={3} fill="#1E3A8A" />
          <Rect x={9} y={23} width={19} height={14} rx={6} fill="#3D5A99" />
          <Rect x={9} y={23} width={19} height={4.6} rx={2.3} fill="#93C5FD" />
          <Rect x={37} y={23} width={19} height={14} rx={6} fill="#3D5A99" />
          <Rect x={37} y={23} width={19} height={4.6} rx={2.3} fill="#93C5FD" />
          <Rect x={14} y={29} width={37} height={22} rx={4} fill="#2C4A85" />
          <Rect x={14} y={29} width={37} height={3.6} fill="#93C5FD" />
          <Rect x={14} y={47} width={37} height={4} fill="#16294F" />
          <Rect x={31} y={29} width={3} height={22} fill="#16294F" />
          <Circle cx={32.5} cy={38} r={3.4} fill="#60A5FA" />
          <Circle cx={32.5} cy={38} r={1.6} fill="#DBEAFE" />
          <Rect x={20} y={2} width={25} height={9} rx={4} fill="#3D5A99" />
          {[22.5, 31, 39.5].map((x) => (
            <Path key={x} d={`M ${x} 3 L ${x + 1.5} -3.4 L ${x + 3} 3 Z`} fill="#F6C453" />
          ))}
          <Rect x={20} y={5.4} width={25} height={2} fill="#F6C453" />
          <Rect x={31} y={9} width={3} height={9} fill="#16294F" />
        </G>
      );
    case "thrones-aegis":
      // Crown 7: scarlet + gold, a tall judgment collar, a heavier cape.
      return (
        <G>
          <Rect x={13} y={4} width={39} height={24} rx={8} fill="#8C2B2B" />
          <Rect x={13} y={4} width={39} height={5} rx={2.5} fill="#F6C453" />
          <Rect x={4} y={30} width={9} height={35} rx={3} fill="#7F1D1D" />
          <Rect x={52} y={30} width={9} height={35} rx={3} fill="#7F1D1D" />
          <Rect x={8} y={23} width={20} height={15} rx={7} fill="#A83A32" />
          <Rect x={8} y={23} width={20} height={5} rx={2.5} fill="#FCA5A5" />
          <Rect x={37} y={23} width={20} height={15} rx={7} fill="#A83A32" />
          <Rect x={37} y={23} width={20} height={5} rx={2.5} fill="#FCA5A5" />
          <Rect x={14} y={29} width={37} height={22} rx={4} fill="#99302A" />
          <Rect x={14} y={29} width={37} height={3.6} fill="#F6C453" />
          <Rect x={14} y={47} width={37} height={4} fill="#5F1712" />
          <Rect x={31} y={29} width={3} height={22} fill="#5F1712" />
          <Rect x={29.2} y={33.8} width={6.6} height={6.6} fill="#DC2626" transform="rotate(45 32.5 37.1)" />
          <Rect x={30.6} y={35.6} width={3.8} height={3.8} fill="#FCA5A5" transform="rotate(45 32.5 37.5)" />
          <Rect x={21} y={8} width={23} height={8} rx={4} fill="#A83A32" />
          <Rect x={25} y={9.6} width={15} height={2.2} rx={1.1} fill="#F6C453" />
        </G>
      );
    case "cherubim-aegis":
      // Crown 8: rose-pearl plate with feathered wings folded over the shoulders.
      return (
        <G>
          {[0, 1, 2].map((i) => (
            <Path key={`l${i}`} d={`M ${14 - i * 2} ${30 + i * 5} L ${2 - i * 1.4} ${20 + i * 6} L ${12 - i} ${22 + i * 5} Z`} fill={i % 2 ? "#E7A8C4" : "#F9D3E3"} />
          ))}
          {[0, 1, 2].map((i) => (
            <Path key={`r${i}`} d={`M ${51 + i * 2} ${30 + i * 5} L ${63 + i * 1.4} ${20 + i * 6} L ${53 + i} ${22 + i * 5} Z`} fill={i % 2 ? "#E7A8C4" : "#F9D3E3"} />
          ))}
          <Rect x={10} y={24} width={18} height={13} rx={6} fill="#DB8FB4" />
          <Rect x={10} y={24} width={18} height={4.4} rx={2.2} fill="#FCE7F1" />
          <Rect x={37} y={24} width={18} height={13} rx={6} fill="#DB8FB4" />
          <Rect x={37} y={24} width={18} height={4.4} rx={2.2} fill="#FCE7F1" />
          <Rect x={15} y={30} width={35} height={21} rx={4} fill="#D67FA9" />
          <Rect x={15} y={30} width={35} height={3.4} fill="#FCE7F1" />
          <Rect x={15} y={47} width={35} height={4} fill="#A34A77" />
          <Circle cx={32.5} cy={38} r={4} fill="#F9A8D4" />
          <Circle cx={32.5} cy={38} r={2} fill="#FFF1F7" />
          <Rect x={20} y={1} width={25} height={10} rx={5} fill="#DB8FB4" />
          <Rect x={24} y={3} width={17} height={2.4} rx={1.2} fill="#FCE7F1" />
          <Rect x={31} y={9} width={3} height={9} fill="#A34A77" />
        </G>
      );
    case "seraphim-aegis":
      // Crown 9: burning white-gold, wings upon wings, a halo's ring.
      return (
        <G>
          {[0, 1, 2].map((i) => (
            <Path key={`l${i}`} d={`M ${13 - i * 2.4} ${27 + i * 6} L ${-1 - i * 1.6} ${15 + i * 7} L ${11 - i} ${19 + i * 6} Z`} fill={i % 2 ? "#FDE9B8" : "#FFF7DD"} />
          ))}
          {[0, 1, 2].map((i) => (
            <Path key={`r${i}`} d={`M ${52 + i * 2.4} ${27 + i * 6} L ${66 + i * 1.6} ${15 + i * 7} L ${54 + i} ${19 + i * 6} Z`} fill={i % 2 ? "#FDE9B8" : "#FFF7DD"} />
          ))}
          <Circle cx={32.5} cy={-3.4} r={6.4} fill="none" stroke="#FDE68A" strokeWidth={2} />
          <Rect x={9} y={23} width={19} height={14} rx={7} fill="#F6D98A" />
          <Rect x={9} y={23} width={19} height={5} rx={2.5} fill="#FFFFFF" />
          <Rect x={37} y={23} width={19} height={14} rx={7} fill="#F6D98A" />
          <Rect x={37} y={23} width={19} height={5} rx={2.5} fill="#FFFFFF" />
          <Rect x={14} y={29} width={37} height={22} rx={4} fill="#F3D27A" />
          <Rect x={14} y={29} width={37} height={3.6} fill="#FFFFFF" />
          <Rect x={14} y={47} width={37} height={4} fill="#D9A93F" />
          <Circle cx={32.5} cy={38} r={4.6} fill="#FBBF24" />
          <Circle cx={32.5} cy={38} r={2.4} fill="#FFFBEB" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <Rect key={deg} x={31.9} y={31.4} width={1.2} height={3.2} fill="#F59E0B" transform={`rotate(${deg} 32.5 38)`} />
          ))}
          <Rect x={20} y={1} width={25} height={10} rx={5} fill="#F6D98A" />
          <Rect x={24} y={3} width={17} height={2.4} rx={1.2} fill="#FFFFFF" />
          <Rect x={31} y={9} width={3} height={9} fill="#D9A93F" />
        </G>
      );
    case "dragonbone-plate":
      // Crown 10: bone-white plates, jagged bone trim, a horned helm.
      // The pinnacle — nothing about it is smooth.
      return (
        <G>
          <Path d="M 21 6 Q 6 2 4 -8 Q 12 -4 17 1 Q 20 3 21 6 Z" fill="#EDE3CB" />
          <Path d="M 44 6 Q 59 2 61 -8 Q 53 -4 48 1 Q 45 3 44 6 Z" fill="#EDE3CB" />
          <Path d="M 21 6 Q 10 4 7 -4" stroke="#CBBFA3" strokeWidth={1.6} fill="none" />
          <Path d="M 44 6 Q 55 4 58 -4" stroke="#CBBFA3" strokeWidth={1.6} fill="none" />
          <Rect x={19} y={0} width={27} height={11} rx={4} fill="#F5EFE0" />
          <Rect x={19} y={7.6} width={27} height={2} fill="#CBBFA3" />
          <Rect x={30.8} y={9} width={3.4} height={9} fill="#D9CDB0" />
          <Rect x={7} y={23} width={21} height={15} rx={5} fill="#EFE7D2" />
          <Rect x={7} y={23} width={21} height={4.6} rx={2.3} fill="#FBF7EA" />
          <Path d="M 8 38 L 14 33 L 19 38 L 24 33 L 27 38 Z" fill="#D9CDB0" />
          <Rect x={37} y={23} width={21} height={15} rx={5} fill="#EFE7D2" />
          <Rect x={37} y={23} width={21} height={4.6} rx={2.3} fill="#FBF7EA" />
          <Path d="M 38 38 L 43 33 L 48 38 L 53 33 L 57 38 Z" fill="#D9CDB0" />
          <Rect x={13} y={29} width={39} height={22} rx={4} fill="#F5EFE0" />
          <Rect x={13} y={29} width={39} height={3.4} fill="#FBF7EA" />
          <Rect x={13} y={46.6} width={39} height={4.4} fill="#D9CDB0" />
          <Path d="M 14 51 L 20 46.6 L 26 51 L 32.5 46.6 L 39 51 L 45 46.6 L 51 51 Z" fill="#CBBFA3" />
          <Rect x={31} y={29} width={3} height={22} fill="#D9CDB0" />
          <Path d="M 32.5 32 L 36.4 37.4 L 32.5 43.4 L 28.6 37.4 Z" fill="#E3D5B8" stroke="#B7A67F" strokeWidth={1} />
          <Circle cx={32.5} cy={37.4} r={1.7} fill="#8A6D2F" />
        </G>
      );
    default:
      // Unknown armor: plain steel plate, safe fallback.
      return (
        <G>
          <Rect x={15} y={30} width={35} height={20} rx={4} fill="#8E97A6" />
          <Rect x={31} y={30} width={3} height={20} fill="#6B7280" />
        </G>
      );
  }
}

/** Weapon drawn in the pawn's hand (10x56 viewBox, same swing anchor as before). */
export function WeaponShapes({ weaponId }: { weaponId: string }) {
  switch (weaponId) {
    case "wooden-staff":
      return (
        <G>
          <Rect x={3} y={2} width={4} height={48} rx={2} fill="#8B5A2B" />
          <Circle cx={5} cy={5} r={4.5} fill="#A16207" />
          <Rect x={3} y={18} width={4} height={3} fill="#5C3D1E" />
          <Rect x={3} y={30} width={4} height={3} fill="#5C3D1E" />
        </G>
      );
    case "iron-sword":
      return (
        <G>
          <Rect x={3} y={0} width={4} height={40} fill="#94A3B8" />
          <Rect x={4.2} y={2} width={1.6} height={36} fill="#64748B" />
          <Rect x={0} y={40} width={10} height={4} fill="#57534C" />
          <Rect x={3} y={44} width={4} height={12} fill="#292524" />
          <Circle cx={5} cy={54} r={2.5} fill="#57534C" />
        </G>
      );
    case "dawnblade":
      return (
        <G>
          <Rect x={3} y={0} width={4} height={40} fill="#FDE68A" />
          <Rect x={4} y={2} width={2} height={36} fill="#FBBF24" />
          <Rect x={0} y={40} width={10} height={4} fill="#B45309" />
          <Rect x={3} y={44} width={4} height={12} fill="#451A03" />
        </G>
      );
    case "runeblade":
      return (
        <G>
          <Rect x={3} y={0} width={4} height={40} fill="#BFDBFE" />
          {[6, 14, 22, 30].map((y) => (
            <Rect key={y} x={3.5} y={y} width={3} height={2} fill="#1D4ED8" />
          ))}
          <Rect x={0} y={40} width={10} height={4} fill="#1E3A8A" />
          <Rect x={3} y={44} width={4} height={12} fill="#0F172A" />
        </G>
      );
    case "seraphim-edge":
      return (
        <G>
          <Rect x={3} y={0} width={4} height={40} fill="#FFFBEA" />
          <Rect x={4} y={2} width={2} height={36} fill="#FDE047" />
          <Rect x={0} y={40} width={10} height={4} fill="#F59E0B" />
          <Rect x={3} y={44} width={4} height={12} fill="#78350F" />
          <Circle cx={5} cy={54} r={2.5} fill="#FBBF24" />
        </G>
      );
    case "gilded-blade":
      return (
        <G>
          <Rect x={3} y={0} width={4} height={40} fill="#F6C453" />
          <Rect x={4} y={2} width={2} height={36} fill="#FDE68A" />
          <Rect x={0} y={40} width={10} height={4} fill="#92400E" />
          <Rect x={3} y={44} width={4} height={12} fill="#451A03" />
          <Circle cx={5} cy={54} r={2.5} fill="#DC2626" />
        </G>
      );
    case "radiant-blade":
      return (
        <G>
          <Rect x={3} y={0} width={4} height={40} fill="#E0F2FE" />
          <Rect x={4} y={2} width={2} height={36} fill="#FFFFFF" />
          <Circle cx={5} cy={20} r={2.4} fill="#FDE68A" />
          <Rect x={0} y={40} width={10} height={4} fill="#0369A1" />
          <Rect x={3} y={44} width={4} height={12} fill="#0C2D48" />
          <Circle cx={5} cy={54} r={2.5} fill="#7DD3FC" />
        </G>
      );
    case "heavenly-blade":
      return (
        <G>
          <Rect x={3} y={0} width={4} height={40} fill="#FFFFFF" />
          <Rect x={4} y={2} width={2} height={36} fill="#FDE68A" />
          <Rect x={0} y={40} width={10} height={4} fill="#F59E0B" />
          <Rect x={3} y={44} width={4} height={12} fill="#78350F" />
          <Circle cx={5} cy={53} r={3.4} fill="none" stroke="#FDE68A" strokeWidth={1.4} />
        </G>
      );
    case "powers-blade":
      return (
        <G>
          <Rect x={2.6} y={0} width={4.8} height={40} fill="#C4B5FD" />
          <Rect x={3.8} y={2} width={2.4} height={36} fill="#7C6AAE" />
          <Circle cx={5} cy={18} r={2} fill="#A855F7" />
          <Rect x={0} y={40} width={10} height={4} fill="#F6C453" />
          <Rect x={3} y={44} width={4} height={12} fill="#2E1065" />
          <Rect x={4} y={52} width={2} height={4} fill="#C4B5FD" />
        </G>
      );
    case "virtues-blade":
      return (
        <G>
          <Rect x={2.8} y={0} width={4.4} height={40} fill="#99F6E4" />
          <Path d="M 4 2 Q 6 10 4 18 Q 2 26 4 34" stroke="#0F766E" strokeWidth={1.6} fill="none" />
          <Rect x={0} y={40} width={10} height={4} fill="#0F766E" />
          <Rect x={3} y={44} width={4} height={12} fill="#04211D" />
          <Circle cx={5} cy={54} r={2.5} fill="#5EEAD4" />
        </G>
      );
    case "dominions-blade":
      return (
        <G>
          <Rect x={2.8} y={0} width={4.4} height={40} fill="#93C5FD" />
          <Rect x={3.9} y={2} width={2.2} height={36} fill="#1E3A8A" />
          {[0, 3.5, 6.5].map((dx) => (
            <Path key={dx} d={`M ${0.6 + dx} 40 L ${2.1 + dx} 35.4 L ${3.6 + dx} 40 Z`} fill="#F6C453" />
          ))}
          <Rect x={0} y={40} width={10} height={3.4} fill="#B8912C" />
          <Rect x={3} y={43.4} width={4} height={12.6} fill="#0B1B3A" />
          <Circle cx={5} cy={53.6} r={2.4} fill="#60A5FA" />
        </G>
      );
    case "thrones-blade":
      return (
        <G>
          <Rect x={2.6} y={0} width={4.8} height={40} fill="#FCA5A5" />
          <Rect x={3.8} y={2} width={2.4} height={36} fill="#B91C1C" />
          <Rect x={-1} y={40} width={12} height={4.4} fill="#F6C453" />
          <Circle cx={5} cy={42.2} r={1.8} fill="#DC2626" />
          <Rect x={3} y={44.4} width={4} height={11.6} fill="#450A0A" />
          <Rect x={4} y={52.6} width={2} height={3.4} fill="#F6C453" />
        </G>
      );
    case "cherubim-blade":
      return (
        <G>
          <Rect x={2.8} y={0} width={4.4} height={40} fill="#FBCFE8" />
          <Rect x={3.9} y={2} width={2.2} height={36} fill="#F472B6" />
          <Path d="M 0 40 Q -3.4 34 0.4 31.4 L 2.6 38 Z" fill="#F9D3E3" />
          <Path d="M 10 40 Q 13.4 34 9.6 31.4 L 7.4 38 Z" fill="#F9D3E3" />
          <Rect x={0.6} y={40} width={8.8} height={3.6} fill="#DB8FB4" />
          <Rect x={3} y={43.6} width={4} height={12.4} fill="#500F2E" />
          <Circle cx={5} cy={54} r={2.5} fill="#F9A8D4" />
        </G>
      );
    case "seraphim-blade":
      return (
        <G>
          <Rect x={2.8} y={0} width={4.4} height={40} fill="#FFFFFF" />
          <Rect x={3.9} y={2} width={2.2} height={36} fill="#FDE68A" />
          {[8, 18, 28].map((y) => (
            <G key={y}>
              <Path d={`M 2.8 ${y} L -0.6 ${y - 3.4} L 2.8 ${y + 2.6} Z`} fill="#FFF3C4" />
              <Path d={`M 7.2 ${y} L 10.6 ${y - 3.4} L 7.2 ${y + 2.6} Z`} fill="#FFF3C4" />
            </G>
          ))}
          <Rect x={0} y={40} width={10} height={4} fill="#F59E0B" />
          <Rect x={3} y={44} width={4} height={12} fill="#78350F" />
          <Circle cx={5} cy={53.4} r={3.2} fill="none" stroke="#FDE68A" strokeWidth={1.4} />
        </G>
      );
    case "dragonbone-blade":
      // Bone-white and serrated — a rib of the old dragon, still hungry.
      return (
        <G>
          <Path d="M 3 0 L 7.4 0 L 7.4 8 L 5.6 10 L 7.4 13 L 5.6 15.6 L 7.4 19 L 5.6 21.6 L 7.4 25 L 5.6 27.6 L 7.4 31 L 5.6 33.6 L 7 40 L 3 40 Z" fill="#F5EFE0" />
          <Rect x={3.6} y={2} width={1.8} height={36} fill="#D9CDB0" />
          <Path d="M 0.4 40 Q 0 33 3 31.6 L 3.4 40 Z" fill="#EDE3CB" />
          <Path d="M 9.6 40 Q 10 33 7 31.6 L 6.6 40 Z" fill="#EDE3CB" />
          <Rect x={0.4} y={40} width={9.2} height={3.4} fill="#CBBFA3" />
          <Rect x={3} y={43.4} width={4} height={12.6} fill="#4A3F28" />
          <Path d="M 3.4 56 L 5 51.4 L 6.6 56 Z" fill="#F5EFE0" />
        </G>
      );
    case "steel-sword":
    default:
      return (
        <G>
          <Rect x={3} y={0} width={4} height={40} fill="#CBD5E1" />
          <Rect x={3} y={0} width={2} height={40} fill="#F1F5F9" />
          <Rect x={0} y={40} width={10} height={4} fill="#92400E" />
          <Rect x={3} y={44} width={4} height={12} fill="#451A03" />
        </G>
      );
  }
}

/** Soft glow color for magic-tier weapons. Null for plain steel. */
export function weaponGlowColor(weaponId: string | null): string | null {
  if (weaponId === "dawnblade") return "#FBBF24";
  if (weaponId === "runeblade") return "#60A5FA";
  if (weaponId === "seraphim-edge") return "#FDE047";
  if (weaponId === "gilded-blade") return "#F6C453";
  if (weaponId === "radiant-blade") return "#BAE6FD";
  if (weaponId === "heavenly-blade") return "#FFFFFF";
  if (weaponId === "powers-blade") return "#C4B5FD";
  if (weaponId === "virtues-blade") return "#5EEAD4";
  if (weaponId === "dominions-blade") return "#93C5FD";
  if (weaponId === "thrones-blade") return "#FCA5A5";
  if (weaponId === "cherubim-blade") return "#FBCFE8";
  if (weaponId === "seraphim-blade") return "#FEF08A";
  if (weaponId === "dragonbone-blade") return "#F5EFE0";
  return null;
}

/** Halo color for an armor, or null. Shared by the town hero + the forest. */
export function armorGlowColor(armorId: string | null): string | null {
  if (!armorId) return null;
  return HERO_GLOW_ARMORS[armorId] ?? null;
}

export function HeroHair({ style, color }: { style: PawnHairStyle; color: string }) {
  const cap = <Rect x={20} y={0} width={25} height={9} rx={4} fill={color} />;
  switch (style) {
    case "bald":
      return null;
    case "laurel":
      return (
        <G>
          {cap}
          {[22, 27, 32, 37, 42].map((x, i) => (
            <Circle key={x} cx={x + 1.5} cy={i === 2 ? 0.6 : 1.6} r={2.1} fill={i % 2 ? "#D4AF37" : "#F6C453"} />
          ))}
          <Rect x={20} y={4.6} width={25} height={1.6} fill="#B8912C" />
        </G>
      );
    case "coronet":
      return (
        <G>
          {cap}
          <Rect x={20} y={1.4} width={25} height={3} fill="#F6C453" />
          {[23, 31, 39].map((x) => (
            <Rect key={x} x={x} y={-2.6} width={4} height={4.6} rx={1.6} fill="#FDE68A" />
          ))}
          {[25, 33, 41].map((x) => (
            <Circle key={x} cx={x} cy={2.9} r={1.1} fill="#FFFFFF" />
          ))}
        </G>
      );
    case "glorymane":
      return (
        <G>
          {cap}
          <Rect x={17.6} y={4} width={5} height={34} rx={2.4} fill={color} />
          <Rect x={42.4} y={4} width={5} height={34} rx={2.4} fill={color} />
          <Rect x={18.6} y={6} width={1.6} height={28} fill="#FDE68A" opacity={0.85} />
          <Rect x={44.8} y={6} width={1.6} height={28} fill="#FDE68A" opacity={0.85} />
          <Rect x={28} y={0} width={2} height={6} fill="#FFFFFF" opacity={0.65} />
          <Rect x={36} y={0} width={2} height={6} fill="#FFFFFF" opacity={0.65} />
        </G>
      );
    case "long":
    case "lob":
    case "wavy":
      return (
        <G>
          {cap}
          <Rect x={18} y={4} width={4.6} height={26} rx={2.2} fill={color} />
          <Rect x={42.4} y={4} width={4.6} height={26} rx={2.2} fill={color} />
        </G>
      );
    case "braid":
      return (
        <G>
          {cap}
          {[0, 1, 2, 3].map((i) => (
            <Rect key={i} x={43.4 - (i % 2) * 1.2} y={6 + i * 6.4} width={4.6} height={5.4} rx={2} fill={color} />
          ))}
        </G>
      );
    case "ponytail":
      return (
        <G>
          {cap}
          <Circle cx={45} cy={3} r={2.6} fill={color} />
          <Rect x={43.4} y={4} width={4.4} height={22} rx={2.2} fill={color} />
        </G>
      );
    case "pigtails":
      return (
        <G>
          {cap}
          <Rect x={16.8} y={3} width={4.4} height={20} rx={2.2} fill={color} />
          <Rect x={43.8} y={3} width={4.4} height={20} rx={2.2} fill={color} />
        </G>
      );
    case "bun":
    case "highbun":
      return (
        <G>
          {cap}
          <Circle cx={32.5} cy={-1.4} r={4.2} fill={color} />
        </G>
      );
    case "mohawk":
      return <Rect x={29.4} y={-4} width={6.2} height={12} rx={2.6} fill={color} />;
    case "curly":
      return (
        <G>
          {cap}
          <Circle cx={25} cy={0.4} r={3.6} fill={color} />
          <Circle cx={32.5} cy={-0.8} r={4} fill={color} />
          <Circle cx={40} cy={0.4} r={3.6} fill={color} />
        </G>
      );
    case "dreads":
      return (
        <G>
          {cap}
          {[18.4, 23, 42, 46.6].map((x) => (
            <Rect key={x} x={x} y={4} width={3.4} height={22} rx={1.6} fill={color} />
          ))}
        </G>
      );
    case "pompadour":
      return (
        <G>
          {cap}
          <Rect x={24} y={-3.4} width={17} height={6.4} rx={3} fill={color} transform="rotate(-7 32.5 0)" />
        </G>
      );
    case "bob":
      return (
        <G>
          <Rect x={19} y={0} width={27} height={11} rx={4.6} fill={color} />
          <Rect x={18.4} y={6} width={4} height={12} rx={2} fill={color} />
          <Rect x={42.6} y={6} width={4} height={12} rx={2} fill={color} />
        </G>
      );
    default:
      // short / medium / fade / buzz / pixie / sidepart — the neat cap.
      return cap;
  }
}

export function HeroBeard({ style, length, color }: { style: PawnBeardStyle; length: number; color: string }) {
  if (style === "none" || length <= 2) return null;
  const growth = Math.max(0, Math.min(100, length)) / 100;
  if (style === "mustache") {
    return <Rect x={24.5} y={23.4} width={16} height={2.6 + growth * 1.6} rx={1.3} fill={color} />;
  }
  if (style === "goatee") {
    return <Rect x={27.5} y={25} width={10} height={4 + growth * 9} rx={3} fill={color} />;
  }
  const heavenly = style === "heavenly";
  const fill = heavenly ? "#E8E4DA" : color;
  const h = (5 + growth * 11) * (heavenly ? 1.45 : 1);
  return (
    <G>
      <Rect x={21} y={23.6} width={23} height={h} rx={6} fill={fill} />
      {style === "gilded" && <Rect x={24} y={23.6 + h - 3.4} width={17} height={2.2} rx={1.1} fill="#D4AF37" />}
      {style === "radiant" && (
        <G>
          <Rect x={24.6} y={25.4} width={1.8} height={h - 3.4} fill="#FDE68A" opacity={0.9} />
          <Rect x={38.6} y={25.4} width={1.8} height={h - 3.4} fill="#FDE68A" opacity={0.9} />
        </G>
      )}
      {heavenly && (
        <G>
          <Rect x={31.4} y={25.2} width={2.2} height={h - 3} fill="#FFFFFF" opacity={0.8} />
          <Rect x={25} y={23.6 + h - 3} width={15} height={2} rx={1} fill="#D4AF37" opacity={0.85} />
        </G>
      )}
    </G>
  );
}


/* ------------------------------------------------------------------ */
/* Face + accessory overlays (creator appearance, in the 65x70 box).   */
/* The sprite's own eyes are two adjacent pixels at art cols 6-7,      */
/* rows 3 -> overlay x 30-40, y 15-20; face centre x = 35. The eye     */
/* styles repaint that band with skin first, then draw their pattern.  */
/* ------------------------------------------------------------------ */

const FACE_INK = "#1F2937";

export function HeroEyes({ style, skin }: { style: PawnEyeStyle; skin: string }) {
  const patch = <Rect x={29} y={14.4} width={12} height={6.4} fill={skin} />;
  switch (style) {
    case "round":
      return (
        <G>
          {patch}
          <Rect x={31} y={15.6} width={3} height={4} rx={0.9} fill={FACE_INK} />
          <Rect x={36} y={15.6} width={3} height={4} rx={0.9} fill={FACE_INK} />
          <Rect x={31.7} y={16.2} width={1.1} height={1.1} fill="#FFFFFF" />
          <Rect x={36.7} y={16.2} width={1.1} height={1.1} fill="#FFFFFF" />
        </G>
      );
    case "happy":
      return (
        <G>
          {patch}
          <Path d="M30.6 18.8 L32.5 16.6 L34.4 18.8" stroke={FACE_INK} strokeWidth={1.6} strokeLinecap="round" fill="none" />
          <Path d="M35.6 18.8 L37.5 16.6 L39.4 18.8" stroke={FACE_INK} strokeWidth={1.6} strokeLinecap="round" fill="none" />
        </G>
      );
    case "sleepy":
      return (
        <G>
          {patch}
          <Rect x={30.4} y={17.6} width={4.2} height={1.4} rx={0.7} fill={FACE_INK} />
          <Rect x={35.4} y={17.6} width={4.2} height={1.4} rx={0.7} fill={FACE_INK} />
        </G>
      );
    case "determined":
      return (
        <G>
          {patch}
          <Path d="M30.2 15 L34.8 16.6" stroke={FACE_INK} strokeWidth={1.7} strokeLinecap="round" />
          <Path d="M39.8 15 L35.2 16.6" stroke={FACE_INK} strokeWidth={1.7} strokeLinecap="round" />
          <Rect x={31.3} y={17.4} width={2.5} height={2.5} fill={FACE_INK} />
          <Rect x={36.2} y={17.4} width={2.5} height={2.5} fill={FACE_INK} />
        </G>
      );
    case "starry":
      return (
        <G>
          {patch}
          {[32.5, 37.5].map((cx) => (
            <G key={cx}>
              <Rect x={cx - 0.7} y={15} width={1.4} height={5} fill="#F59E0B" />
              <Rect x={cx - 2.2} y={16.8} width={4.4} height={1.4} fill="#F59E0B" />
            </G>
          ))}
        </G>
      );
  }
}

/** Pixel mouth under the eyes (the beard, drawn after, covers it when worn). */
export function HeroMouth({ style }: { style: PawnMouthStyle }) {
  switch (style) {
    case "smile":
      return <Path d="M31.8 22.6 Q35 25.6 38.2 22.6" stroke={FACE_INK} strokeWidth={1.5} strokeLinecap="round" fill="none" />;
    case "open":
      return <Rect x={33.3} y={22.2} width={3.4} height={4.2} rx={1.7} fill={FACE_INK} />;
    case "flat":
      return <Rect x={32.4} y={23.6} width={5.2} height={1.4} rx={0.7} fill={FACE_INK} />;
    case "smirk":
      return <Path d="M32 23.8 Q35.8 25.2 38.4 22.4" stroke={FACE_INK} strokeWidth={1.5} strokeLinecap="round" fill="none" />;
  }
}

/** Worn accessories from the creator, drawn over the hair (centred on the
 * hair cap at x 32.5, kept inside the top of the box so nothing clips). */
export function HeroAccessory({ kind }: { kind: PawnAccessory }) {
  switch (kind) {
    case "none":
      return null;
    case "tophat":
      return (
        <G>
          <Rect x={23} y={0} width={17} height={4.6} fill="#111827" />
          <Rect x={23} y={3.2} width={17} height={1.5} fill="#DC2626" />
          <Rect x={18.5} y={4.6} width={26} height={1.8} fill="#111827" />
        </G>
      );
    case "crown":
      return (
        <G>
          <Path d="M22 4.4 L22 0.8 L26 2.8 L30.5 0.4 L35 2.8 L39 0.8 L43 4.4 Z" fill="#FBBF24" />
          <Rect x={22} y={4.4} width={21} height={1.8} fill="#F59E0B" />
          <Circle cx={32.5} cy={3.4} r={1.2} fill="#EF4444" />
        </G>
      );
    case "halo":
      return <Ellipse cx={32.5} cy={2.2} rx={9.5} ry={2.3} stroke="#FDE68A" strokeWidth={1.8} fill="none" />;
    case "cap":
      return (
        <G>
          <Path d="M20.5 6.5 Q32.5 -3.5 44.5 6.5 Z" fill="#DC2626" />
          <Rect x={36} y={5.6} width={11} height={2.1} rx={1} fill="#991B1B" />
        </G>
      );
  }
}

/* ------------------------------------------------------------------ */
/* The Hero figure                                                     */
/* ------------------------------------------------------------------ */

/** Native coordinate box the forest hero is drawn in. */
export const HERO_BOX_W = 65;
export const HERO_BOX_H = 70;

/** Halo color for top-tier armors (matches the Dark Forest scene). */
const HERO_GLOW_ARMORS: Record<string, string> = {
  "mithril-plate": "#BFDBFE",
  "radiant-aegis": "#BFDBFE",
  "celestial-bulwark": "#FDE68A",
  "gilded-aegis": "#FDE68A",
  "heavenly-aegis": "#FFFFFF",
  "powers-aegis": "#C4B5FD",
  "virtues-aegis": "#5EEAD4",
  "dominions-aegis": "#93C5FD",
  "thrones-aegis": "#FCA5A5",
  "cherubim-aegis": "#FBCFE8",
  "seraphim-aegis": "#FFFFFF",
  "dragonbone-plate": "#F5EFE0",
};

export type HeroFigureProps = {
  tunicColor: string;
  armorId?: string | null;
  weaponId?: string | null;
  hairStyle?: PawnHairStyle;
  hairColor?: string;
  beardStyle?: PawnBeardStyle;
  /** Current beard growth 0-100 (lib/pawn beardGrowthFor). */
  beardLength?: number;
  /** Rendered width in the hero's native 65-unit box (height scales along). */
  size?: number;
  /** Weapon rotation (the Dark Forest swing passes its animated value). */
  weaponAngle?: string;
  /** Creator body shape — swaps the torso/leg sprite rows (head unchanged). */
  bodyStyle?: PawnBodyStyle;
  /** Creator eye style — pixel pattern repainted over the sprite's eyes. */
  eyeStyle?: PawnEyeStyle;
  /** Creator mouth style — pixel mouth under the eyes. */
  mouthStyle?: PawnMouthStyle;
  /** Creator accessory worn over the hair (top hat / crown / halo / cap). */
  accessory?: PawnAccessory;
  /** Skin tone for the sprite's face (palette S). */
  skinColor?: string;
  /** Full sprite-art override (themed board pieces, e.g. rainbow stripes). */
  artOverride?: string[];
  /** Extra palette entries for characters used by artOverride. */
  paletteExtra?: Record<string, string>;
};

/**
 * The Hero at any size: pixel sprite + armor + hair/beard + weapon,
 * laid out exactly as in the Dark Forest and scaled from the native box.
 */
export function HeroFigure({
  tunicColor,
  armorId,
  weaponId,
  hairStyle = "short",
  hairColor = "#111827",
  beardStyle = "none",
  beardLength = 0,
  size = HERO_BOX_W,
  weaponAngle,
  bodyStyle = "pebble",
  eyeStyle,
  mouthStyle,
  accessory = "none",
  skinColor = "#F5D0A9",
  artOverride,
  paletteExtra,
}: HeroFigureProps) {
  const k = size / HERO_BOX_W;
  const palette = { K: "#1F2937", H: "#6B4423", S: skinColor, E: "#1F2937", C: tunicColor, B: "#4A3728", L: "#374151", ...paletteExtra };
  const glow = armorId ? HERO_GLOW_ARMORS[armorId] : undefined;
  const glowColor = weaponId ? weaponGlowColor(weaponId) : null;
  return (
    <View style={{ width: size, height: HERO_BOX_H * k }}>
      {glow && <TierGlow color={glow} size={104 * k} left={-20 * k} top={-17 * k} />}
      <PixelSprite art={artOverride ?? heroArtForBodyStyle(bodyStyle)} palette={palette} px={5 * k} />
      {armorId && (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0 }}>
          <Svg width={size} height={HERO_BOX_H * k} viewBox="0 0 65 70">
            <ArmorShapes armorId={armorId} />
          </Svg>
        </View>
      )}
      {/* the saved appearance's own hair + beard — the hero is your character */}
      <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0 }}>
        <Svg width={size} height={HERO_BOX_H * k} viewBox="0 0 65 70">
          {eyeStyle && <HeroEyes style={eyeStyle} skin={skinColor} />}
          {mouthStyle && <HeroMouth style={mouthStyle} />}
          <HeroHair style={hairStyle} color={hairColor} />
          <HeroBeard style={beardStyle} length={beardLength} color={hairColor} />
          <HeroAccessory kind={accessory} />
        </Svg>
      </View>
      {weaponId && (
        <View style={{ position: "absolute", left: 58 * k, top: 34 * k, transform: weaponAngle ? [{ rotate: weaponAngle }] : undefined }}>
          {glowColor && <TierGlow color={glowColor} size={36 * k} left={-13 * k} top={6 * k} />}
          <Svg width={10 * k} height={56 * k} viewBox="0 0 10 56">
            <WeaponShapes weaponId={weaponId} />
          </Svg>
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Equipped gear (shared, briefly cached so crowds of previews agree)  */
/* ------------------------------------------------------------------ */

let equippedCache: { at: number; promise: Promise<EquippedGear> } | null = null;

function loadEquippedCached(): Promise<EquippedGear> {
  const now = Date.now();
  if (!equippedCache || now - equippedCache.at > 4000) {
    equippedCache = { at: now, promise: loadEquipped().catch(() => defaultEquipped()) };
  }
  return equippedCache.promise;
}

/** The player's equipped gear (null until loaded). */
export function useEquippedGear(): EquippedGear | null {
  const [equipped, setEquipped] = useState<EquippedGear | null>(null);
  useEffect(() => {
    let live = true;
    loadEquippedCached().then((e) => {
      if (live) setEquipped(e);
    });
    return () => {
      live = false;
    };
  }, []);
  return equipped;
}

/**
 * The Hero for a saved appearance: tunic from the equipped clothes (or an
 * explicitly previewed clothes item), armor + weapon from equipped gear,
 * hair + beard (with live growth) from the appearance itself.
 */
export function HeroForPawn({
  pawn,
  size = HERO_BOX_W,
  clothesItem,
}: {
  pawn: CustomPawn;
  size?: number;
  clothesItem?: GearItem | null;
}) {
  const equipped = useEquippedGear();
  const clothes = clothesItem ?? (equipped?.clothes ? GEAR_BY_ID[equipped.clothes] : null);
  const tunicColor = clothes?.visual.bodyColor ?? pawn.bodyColor;
  const beardLength = pawn.gender === "male" ? beardGrowthFor(pawn) : 0;
  return (
    <HeroFigure
      tunicColor={tunicColor}
      armorId={equipped?.armor ?? null}
      weaponId={equipped?.weapon ?? null}
      hairStyle={pawn.hairStyle}
      hairColor={pawn.hairColor || "#111827"}
      beardStyle={pawn.beardStyle}
      beardLength={beardLength}
      size={size}
      bodyStyle={pawn.bodyStyle}
      eyeStyle={pawn.eyeStyle}
      mouthStyle={pawn.mouthStyle}
      accessory={pawn.accessory}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Storage-free thumbnail for option grids (creator, barbershop,       */
/* board-piece pickers): the hero with an explicit appearance, no      */
/* equipped armor/weapon, so the option being picked is what reads.    */
/* ------------------------------------------------------------------ */

export type HeroThumbnailProps = {
  /** Tile size (the full figure's width, or the crop box when headOnly). */
  size?: number;
  tunicColor: string;
  skinColor?: string;
  hairStyle?: PawnHairStyle;
  hairColor?: string;
  beardStyle?: PawnBeardStyle;
  beardLength?: number;
  eyeStyle?: PawnEyeStyle;
  mouthStyle?: PawnMouthStyle;
  accessory?: PawnAccessory;
  bodyStyle?: PawnBodyStyle;
  /** Crop to the head + beard (face-option tiles: eyes, mouth, hair, beard). */
  headOnly?: boolean;
  artOverride?: string[];
  paletteExtra?: Record<string, string>;
};

export function HeroThumbnail({
  size = 56,
  headOnly,
  tunicColor,
  skinColor,
  hairStyle,
  hairColor,
  beardStyle,
  beardLength,
  eyeStyle,
  mouthStyle,
  accessory,
  bodyStyle,
  artOverride,
  paletteExtra,
}: HeroThumbnailProps) {
  const figure = (
    <HeroFigure
      tunicColor={tunicColor}
      skinColor={skinColor}
      hairStyle={hairStyle}
      hairColor={hairColor}
      beardStyle={beardStyle}
      beardLength={beardLength}
      eyeStyle={eyeStyle}
      mouthStyle={mouthStyle}
      accessory={accessory}
      bodyStyle={bodyStyle}
      artOverride={artOverride}
      paletteExtra={paletteExtra}
      size={headOnly ? size * 1.38 : size}
    />
  );
  if (!headOnly) return figure;
  return (
    <View style={{ width: size, height: size, overflow: "hidden", alignItems: "center" }}>
      {figure}
    </View>
  );
}
