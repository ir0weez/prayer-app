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
import Svg, { Circle, G, Rect } from "react-native-svg";
import { beardGrowthFor, type CustomPawn, type PawnBeardStyle, type PawnHairStyle } from "@/lib/pawn";
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
  return null;
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
}: HeroFigureProps) {
  const k = size / HERO_BOX_W;
  const palette = { K: "#1F2937", H: "#6B4423", S: "#F5D0A9", E: "#1F2937", C: tunicColor, B: "#4A3728", L: "#374151" };
  const glow = armorId ? HERO_GLOW_ARMORS[armorId] : undefined;
  const glowColor = weaponId ? weaponGlowColor(weaponId) : null;
  return (
    <View style={{ width: size, height: HERO_BOX_H * k }}>
      {glow && <TierGlow color={glow} size={104 * k} left={-20 * k} top={-17 * k} />}
      <PixelSprite art={HERO_ART} palette={palette} px={5 * k} />
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
          <HeroHair style={hairStyle} color={hairColor} />
          <HeroBeard style={beardStyle} length={beardLength} color={hairColor} />
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
    />
  );
}
