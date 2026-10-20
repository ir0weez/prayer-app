// The Badge Case — prestige boss badges as SVG medallions.
//
// Ten badges, one per Dark Forest boss (lib/badges.ts). Earned badges
// render in full color with their unique motif; unearned ones are dark
// silhouettes naming the boss who guards them. Badges are PERMANENT —
// prestige never takes them.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { BADGES, type BadgeDef } from "@/lib/badges";

/** The motif glyph, drawn in a 48x48 box centered on the medallion. */
function MotifGlyph({ badge, color }: { badge: BadgeDef; color: string }) {
  const s = color;
  switch (badge.motif) {
    case "root":
      return (
        <Svg width={26} height={26} viewBox="0 0 48 48">
          <Path d="M24 6 L24 20" stroke={s} strokeWidth={4} strokeLinecap="round" />
          <Path d="M24 20 Q14 26 12 38" stroke={s} strokeWidth={3.6} fill="none" strokeLinecap="round" />
          <Path d="M24 20 Q24 30 24 40" stroke={s} strokeWidth={3.6} fill="none" strokeLinecap="round" />
          <Path d="M24 20 Q34 26 36 38" stroke={s} strokeWidth={3.6} fill="none" strokeLinecap="round" />
          <Circle cx={24} cy={8} r={4} fill={s} />
        </Svg>
      );
    case "wave":
      return (
        <Svg width={26} height={26} viewBox="0 0 48 48">
          <Path d="M6 18 Q14 10 24 18 Q34 26 42 18" stroke={s} strokeWidth={4} fill="none" strokeLinecap="round" />
          <Path d="M6 30 Q14 22 24 30 Q34 38 42 30" stroke={s} strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.65} />
        </Svg>
      );
    case "flame":
      return (
        <Svg width={26} height={26} viewBox="0 0 48 48">
          <Path
            d="M24 4 C27 12 36 17 36 29 A12 12 0 1 1 12 29 C12 20 18 16 20 10 C22 13 23 15 24 17 C25 12 24 8 24 4 Z"
            fill={s}
          />
          <Path d="M24 24 C26 28 29 30 29 34 A5 5 0 1 1 19 34 C19 29 22 27 24 24 Z" fill="#FFF7ED" opacity={0.85} />
        </Svg>
      );
    case "antler":
      return (
        <Svg width={26} height={26} viewBox="0 0 48 48">
          <Path d="M16 40 L14 22 L8 14 M14 22 L6 22 M14 22 L13 8" stroke={s} strokeWidth={3.6} fill="none" strokeLinecap="round" />
          <Path d="M32 40 L34 22 L40 14 M34 22 L42 22 M34 22 L35 8" stroke={s} strokeWidth={3.6} fill="none" strokeLinecap="round" />
          <Circle cx={24} cy={36} r={5} fill={s} />
        </Svg>
      );
    case "moon":
      return (
        <Svg width={26} height={26} viewBox="0 0 48 48">
          <Path d="M30 5 A18 18 0 1 0 30 43 A14 14 0 1 1 30 5 Z" fill={s} />
          <Circle cx={36} cy={12} r={2.2} fill={s} />
          <Circle cx={41} cy={22} r={1.6} fill={s} />
        </Svg>
      );
    case "crown":
      return (
        <Svg width={26} height={26} viewBox="0 0 48 48">
          <Path d="M8 36 L6 16 L17 26 L24 10 L31 26 L42 16 L40 36 Z" fill={s} />
          <Circle cx={24} cy={30} r={3} fill="#0B0F0C" opacity={0.35} />
        </Svg>
      );
    case "swirl":
      return (
        <Svg width={26} height={26} viewBox="0 0 48 48">
          <Path
            d="M24 24 m-3 0 a3 3 0 1 1 6 0 a7 7 0 1 1 -7 -7 a11 11 0 1 1 11 11 a15 15 0 1 1 -15 -15"
            stroke={s}
            strokeWidth={3.2}
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      );
    case "eye":
      return (
        <Svg width={26} height={26} viewBox="0 0 48 48">
          <Path d="M4 24 Q24 6 44 24 Q24 42 4 24 Z" fill="none" stroke={s} strokeWidth={3.6} />
          <Circle cx={24} cy={24} r={8} fill={s} />
          <Circle cx={24} cy={24} r={3.2} fill="#0B0F0C" opacity={0.55} />
        </Svg>
      );
    case "coin-sun":
      return (
        <Svg width={26} height={26} viewBox="0 0 48 48">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <Path
              key={deg}
              d="M24 2 L26.4 9 L21.6 9 Z"
              fill={s}
              transform={`rotate(${deg} 24 24)`}
            />
          ))}
          <Circle cx={24} cy={24} r={10.5} fill={s} />
          <Circle cx={24} cy={24} r={6.4} fill="none" stroke="#0B0F0C" strokeWidth={2} opacity={0.3} />
        </Svg>
      );
    case "throne":
      return (
        <Svg width={26} height={26} viewBox="0 0 48 48">
          <Path d="M14 42 L14 10 Q14 5 19 5 L29 5 Q34 5 34 10 L34 42 L29 42 L29 26 L19 26 L19 42 Z" fill={s} />
          <Circle cx={24} cy={14} r={3.4} fill="#0B0F0C" opacity={0.35} />
        </Svg>
      );
  }
}

/** One medallion: ring + disc + motif. Grey silhouette when unearned. */
export function BadgeMedallion({ badge, earned, size = 64 }: { badge: BadgeDef; earned: boolean; size?: number }) {
  const ring = earned ? badge.primary : "#3F3F46";
  const disc = earned ? badge.secondary : "#27272A";
  const glyph = earned ? "#FFFFFF" : "#52525B";
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Circle cx={32} cy={32} r={30} fill={ring} />
        <Circle cx={32} cy={32} r={24.5} fill={disc} />
        <Circle cx={32} cy={32} r={24.5} fill="none" stroke={earned ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.08)"} strokeWidth={1.6} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.glyphWrap]}>
        <MotifGlyph badge={badge} color={glyph} />
      </View>
    </View>
  );
}

/** The full case: all ten badges in ladder order. */
export function BadgeCase({ ownedBadges }: { ownedBadges: string[] }) {
  return (
    <View style={styles.grid}>
      {BADGES.map((badge) => {
        const earned = ownedBadges.includes(badge.id);
        return (
          <View key={badge.id} style={[styles.slot, !earned && styles.slotDim]}>
            <BadgeMedallion badge={badge} earned={earned} />
            <Text style={[styles.name, !earned && styles.nameDim]} numberOfLines={1}>
              {badge.name}
            </Text>
            <Text style={styles.sub} numberOfLines={2}>
              {earned ? badge.perk : `Defeat ${badge.bossName}`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  glyphWrap: { alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 14 },
  slot: { width: "31%", alignItems: "center" },
  slotDim: { opacity: 0.75 },
  name: { marginTop: 6, fontSize: 11.5, fontWeight: "800", color: "#1C1917", textAlign: "center" },
  nameDim: { color: "#78716C" },
  sub: { marginTop: 1, fontSize: 10, lineHeight: 13, color: "#78716C", textAlign: "center" },
});
