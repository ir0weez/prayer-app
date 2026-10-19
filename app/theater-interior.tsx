// Theater / amphitheater interior: the villagers and the pawn watching a show.
// The stage animation themes itself to the movie event's title + notes:
// scary movie night -> haunted house, moon, bats, flickering light.
// Generic movie animation when no theme keyword matches.
// No emojis — SVG art and MaterialIcons only. Gentle fades, no bounce.

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Ellipse, Line, Path, Polygon, Rect } from "react-native-svg";
import {
  BUILDINGS,
  COINS_STORAGE_KEY,
  TOWN_STORAGE_KEY,
  parseCoins,
  parseTown,
  prayedTodayPeople,
  scaledCoins,
  scaledXP,
  upgradeCostFor,
  type HometownCoins,
  type PlacedBuilding,
  type PrayedPerson,
} from "@/lib/hometown";
import {
  SHOW_COINS,
  SHOW_XP,
  formatCooldown,
  saveLastShow,
  showMsRemaining,
} from "@/lib/gathering-places";
import { awardCustomXP } from "@/lib/xp-engine";
import { getActiveScheduleActivity, movieThemeForTitle, type MovieThemeKind } from "@/lib/schedule-sync";
import { loadCustomPawn, type CustomPawn } from "@/lib/pawn";
import { PawnPreview } from "@/components/pawn-preview";
import { GentleBob, SoftPulse, FigureName, WatchingFigure, pickPeople } from "@/components/activity-figures";
import { getHolidaySeason, getSeason } from "@/lib/seasons";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";

const BG = "#141021"; // night theater
const CARD = "#221B36";
const GOLD = "#E0A63F";
const FLAME = "#FF9A3D";
const TEXT = "#F2EAD8";
const TEXT_DIM = "#A99BC4";

// ---------- curtains + stage dressing by level ----------
// L1: simple dark curtains. L2: velvet + gold trim. L3: grand velvet, gold trim,
// tassels, lit braziers and banners flanking the screen.
function TheaterDressing({ level }: { level: number }) {
  const curtainColor = level >= 2 ? "#8E2A44" : "#5E1E2C";
  const trim = level >= 2;
  const curtain = (key: string) => (
    <View key={key} style={{ alignItems: "center" }}>
      <View
        style={{
          width: 26,
          height: level >= 3 ? 140 : 120,
          backgroundColor: curtainColor,
          borderBottomLeftRadius: 13,
          borderBottomRightRadius: 13,
          opacity: 0.95,
          borderLeftWidth: trim ? 2 : 0,
          borderRightWidth: trim ? 2 : 0,
          borderBottomWidth: trim ? 2 : 0,
          borderColor: GOLD,
        }}
      />
      {level >= 3 && (
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: GOLD, marginTop: -5 }} />
      )}
    </View>
  );
  const brazier = (key: string) => (
    <View key={key} style={{ alignItems: "center", position: "absolute", top: 118, ...(key === "bl" ? { left: 14 } : { right: 14 }) }}>
      <View style={{ width: 26, height: 20, borderRadius: 6, backgroundColor: FLAME, opacity: 0.9 }} />
      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "#FFD97A", marginTop: -18 }} />
      <View style={{ width: 12, height: 30, backgroundColor: "#3A2A1C", marginTop: 2 }} />
      <View style={{ width: 30, height: 6, borderRadius: 3, backgroundColor: "#3A2A1C", marginTop: 1 }} />
      <View style={{ width: 44, height: 22, borderRadius: 11, backgroundColor: FLAME, opacity: 0.25, marginTop: -52 }} />
    </View>
  );
  const banner = (key: string) => (
    <View key={key} style={{ alignItems: "center", position: "absolute", top: 8, ...(key === "bnl" ? { left: 52 } : { right: 52 }) }}>
      <View
        style={{
          width: 40,
          height: 84,
          backgroundColor: "#7A2438",
          borderWidth: 2,
          borderColor: GOLD,
          borderTopLeftRadius: 4,
          borderTopRightRadius: 4,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialIcons name="theater-comedy" size={20} color={GOLD} />
      </View>
      <View
        style={{
          width: 0, height: 0,
          borderLeftWidth: 20, borderRightWidth: 20, borderTopWidth: 12,
          borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: "#7A2438",
        }}
      />
    </View>
  );
  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 8, paddingTop: 8 }}>
        {[0, 1, 2, 3, 4].map((i) => curtain(`l${i}`))}
        <View style={{ flex: 1 }} />
        {[0, 1, 2, 3, 4].map((i) => curtain(`r${i}`))}
      </View>
      {level >= 3 && brazier("bl")}
      {level >= 3 && brazier("br")}
      {level >= 3 && banner("bnl")}
      {level >= 3 && banner("bnr")}
    </View>
  );
}

/** Slow drifting motion for ambient elements (bats, snow, clouds). */
function Drift({ children, fromX = 0, toX = 0, fromY = 0, toY = 0, duration = 6000, delay = 0 }: {
  children: React.ReactNode; fromX?: number; toX?: number; fromY?: number; toY?: number; duration?: number; delay?: number;
}) {
  const d = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    const t = setTimeout(() => {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(d, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(d, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
      loop.start();
    }, delay);
    return () => { clearTimeout(t); loop?.stop(); };
  }, [d, duration, delay]);
  return (
    <Animated.View style={{
      transform: [
        { translateX: d.interpolate({ inputRange: [0, 1], outputRange: [fromX, toX] }) },
        { translateY: d.interpolate({ inputRange: [0, 1], outputRange: [fromY, toY] }) },
      ],
    }}>
      {children}
    </Animated.View>
  );
}

/** Flicker for the haunted-house window light. */
function Flicker({ children }: { children: React.ReactNode }) {
  const f = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(f, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(f, { toValue: 0.2, duration: 180, useNativeDriver: true }),
        Animated.timing(f, { toValue: 0.9, duration: 420, useNativeDriver: true }),
        Animated.timing(f, { toValue: 0.3, duration: 260, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [f]);
  return <Animated.View style={{ opacity: f }}>{children}</Animated.View>;
}

function Bat({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.6} viewBox="0 0 22 13">
      <Path d="M1 8 Q6 1 11 7 Q16 1 21 8 Q16 5 13 9 Q11 11 9 9 Q6 5 1 8 Z" fill="#0B0B12" />
    </Svg>
  );
}

// ---------- themed stage scenes (each ~ the movie screen) ----------

function HorrorStage() {
  return (
    <Svg width="100%" height={150} viewBox="0 0 320 150" preserveAspectRatio="xMidYMid slice">
      <Rect x={0} y={0} width={320} height={150} fill="#0A0A14" />
      {/* full moon */}
      <Circle cx={252} cy={38} r={26} fill="#F4EFD8" opacity={0.95} />
      <Circle cx={244} cy={32} r={5} fill="#DCD6BC" opacity={0.7} />
      <Circle cx={260} cy={44} r={4} fill="#DCD6BC" opacity={0.7} />
      {/* haunted house silhouette */}
      <Rect x={36} y={70} width={90} height={60} fill="#050508" />
      <Polygon points="36,70 81,44 126,70" fill="#050508" />
      <Rect x={70} y={100} width={22} height={30} fill="#050508" />
      <Polygon points="118,96 140,80 140,110 118,110" fill="#050508" />
      <Rect x={126} y={52} width={10} height={26} fill="#050508" />
      {/* flickering window */}
      <Rect x={52} y={84} width={14} height={18} fill="#FFB84D" opacity={0.85} />
      <Rect x={96} y={84} width={14} height={18} fill="#FFB84D" opacity={0.5} />
      {/* dead tree */}
      <Path d="M170 130 L176 96 L168 78 M176 96 L190 84 M176 104 L164 92" stroke="#050508" strokeWidth={6} fill="none" strokeLinecap="round" />
      {/* ground fog */}
      <Ellipse cx={80} cy={136} rx={110} ry={12} fill="#3B3B52" opacity={0.5} />
      <Ellipse cx={230} cy={140} rx={90} ry={10} fill="#3B3B52" opacity={0.4} />
    </Svg>
  );
}

function ComedyStage() {
  return (
    <Svg width="100%" height={150} viewBox="0 0 320 150" preserveAspectRatio="xMidYMid slice">
      <Rect x={0} y={0} width={320} height={150} fill="#FFF3D6" />
      <Circle cx={70} cy={60} r={26} fill="#FFD97A" />
      <Circle cx={62} cy={55} r={4} fill="#7A4A12" /><Circle cx={78} cy={55} r={4} fill="#7A4A12" />
      <Path d="M58 68 Q70 78 82 68" stroke="#7A4A12" strokeWidth={4} fill="none" strokeLinecap="round" />
      <Circle cx={230} cy={70} r={22} fill="#FFB84D" />
      <Circle cx={223} cy={65} r={3.4} fill="#7A4A12" /><Circle cx={237} cy={65} r={3.4} fill="#7A4A12" />
      <Path d="M220 76 Q230 84 240 76" stroke="#7A4A12" strokeWidth={3.4} fill="none" strokeLinecap="round" />
      {/* confetti */}
      {[30, 90, 150, 210, 270].map((x, i) => (
        <Rect key={i} x={x} y={18 + (i % 3) * 26} width={8} height={5} rx={1.5} fill={["#E0A63F", "#7FB069", "#7DD3FC", "#F472B6"][i % 4]} transform={`rotate(${i * 24} ${x} ${30 + (i % 3) * 26})`} />
      ))}
      <Rect x={0} y={130} width={320} height={20} fill="#F5DFA8" />
    </Svg>
  );
}

function ActionStage() {
  return (
    <Svg width="100%" height={150} viewBox="0 0 320 150" preserveAspectRatio="xMidYMid slice">
      <Rect x={0} y={0} width={320} height={150} fill="#1A0E08" />
      {/* speed lines */}
      {[20, 45, 70, 95, 120].map((y, i) => (
        <Rect key={i} x={0} y={y} width={320} height={3} fill="#FF9A3D" opacity={0.35 - (i % 3) * 0.08} />
      ))}
      {/* city skyline */}
      {[0, 40, 80, 130, 175, 220, 265].map((x, i) => (
        <Rect key={i} x={x} y={70 + (i % 3) * 12} width={38} height={80} fill="#0D0D12" />
      ))}
      {/* explosion burst */}
      <Polygon points="160,30 172,62 205,52 182,74 210,92 176,92 178,124 160,100 142,124 144,92 110,92 138,74 115,52 148,62" fill="#FFB84D" opacity={0.95} />
      <Polygon points="160,52 168,70 188,66 174,78 186,92 168,88 160,104 152,88 134,92 146,78 132,66 152,70" fill="#FFE9B8" />
      <Rect x={0} y={138} width={320} height={12} fill="#0D0D12" />
    </Svg>
  );
}

function RomanceStage() {
  return (
    <Svg width="100%" height={150} viewBox="0 0 320 150" preserveAspectRatio="xMidYMid slice">
      <Rect x={0} y={0} width={320} height={150} fill="#3B1F2E" />
      <Circle cx={160} cy={120} r={70} fill="#F472B6" opacity={0.35} />
      <Circle cx={160} cy={120} r={46} fill="#F9A8D4" opacity={0.4} />
      {/* two figures on a hill */}
      <Path d="M0 150 Q120 96 320 150 Z" fill="#241019" />
      <Circle cx={148} cy={104} r={9} fill="#F2C9A0" /><Rect x={140} y={112} width={16} height={20} rx={6} fill="#7C3A4E" />
      <Circle cx={172} cy={104} r={9} fill="#E8B088" /><Rect x={164} y={112} width={16} height={20} rx={6} fill="#4E5E7C" />
    </Svg>
  );
}

function ChristmasStage() {
  return (
    <Svg width="100%" height={150} viewBox="0 0 320 150" preserveAspectRatio="xMidYMid slice">
      <Rect x={0} y={0} width={320} height={150} fill="#0F2437" />
      {/* tree */}
      <Polygon points="160,18 118,80 202,80" fill="#1F6B3A" />
      <Polygon points="160,44 108,104 212,104" fill="#26804A" />
      <Polygon points="160,70 98,128 222,128" fill="#2E9E5B" />
      <Rect x={152} y={128} width={16} height={14} fill="#6B4A2B" />
      <Circle cx={160} cy={14} r={7} fill="#FFD97A" />
      {[140, 180, 150, 170, 130].map((x, i) => (
        <Circle key={i} cx={x} cy={52 + i * 13} r={4} fill={["#F472B6", "#7DD3FC", "#FFD97A"][i % 3]} />
      ))}
      {/* snow ground */}
      <Ellipse cx={160} cy={146} rx={170} ry={12} fill="#EAF4FB" />
    </Svg>
  );
}

function WesternStage() {
  return (
    <Svg width="100%" height={150} viewBox="0 0 320 150" preserveAspectRatio="xMidYMid slice">
      <Rect x={0} y={0} width={320} height={150} fill="#F5C86E" />
      <Circle cx={160} cy={66} r={30} fill="#FFF3D0" />
      {/* mesas */}
      <Polygon points="0,110 60,84 120,84 90,110" fill="#B45309" opacity={0.75} />
      <Polygon points="200,110 260,78 320,78 300,110" fill="#B45309" opacity={0.75} />
      {/* cacti */}
      <Rect x={40} y={92} width={10} height={34} rx={5} fill="#3F7048" />
      <Rect x={268} y={96} width={10} height={30} rx={5} fill="#3F7048" />
      <Rect x={0} y={110} width={320} height={40} fill="#D99A4E" />
    </Svg>
  );
}

function ScifiStage() {
  return (
    <Svg width="100%" height={150} viewBox="0 0 320 150" preserveAspectRatio="xMidYMid slice">
      <Rect x={0} y={0} width={320} height={150} fill="#050514" />
      <Circle cx={240} cy={44} r={30} fill="#7DD3FC" opacity={0.85} />
      <Ellipse cx={240} cy={44} rx={52} ry={10} fill="none" stroke="#BAE6FD" strokeWidth={3} opacity={0.8} transform="rotate(-18 240 44)" />
      {/* rocket */}
      <Polygon points="70,60 82,34 94,60" fill="#E2E8F0" />
      <Rect x={70} y={60} width={24} height={30} fill="#CBD5E1" />
      <Polygon points="70,70 58,84 70,80" fill="#F87171" />
      <Polygon points="94,70 106,84 94,80" fill="#F87171" />
      <Polygon points="74,92 82,108 90,92" fill="#FFB84D" />
      <Rect x={0} y={132} width={320} height={18} fill="#0B0B1A" />
    </Svg>
  );
}

function MusicalStage() {
  return (
    <Svg width="100%" height={150} viewBox="0 0 320 150" preserveAspectRatio="xMidYMid slice">
      <Rect x={0} y={0} width={320} height={150} fill="#2A1040" />
      {/* stage */}
      <Rect x={60} y={104} width={200} height={16} rx={4} fill="#6B4A2B" />
      {/* performer silhouette */}
      <Circle cx={160} cy={66} r={12} fill="#0B0612" />
      <Rect x={148} y={78} width={24} height={28} rx={8} fill="#0B0612" />
      {/* spotlight cones */}
      <Polygon points="110,0 150,0 160,104 100,104" fill="#FFE9B8" opacity={0.22} />
      <Polygon points="210,0 170,0 160,104 220,104" fill="#FFE9B8" opacity={0.22} />
    </Svg>
  );
}

function KidsStage() {
  return (
    <Svg width="100%" height={150} viewBox="0 0 320 150" preserveAspectRatio="xMidYMid slice">
      <Rect x={0} y={0} width={320} height={150} fill="#BFE6F5" />
      {/* rainbow */}
      {[64, 56, 48, 40].map((r, i) => (
        <Path key={i} d={`M40 130 A ${r} ${r} 0 0 1 ${40 + r * 2} 130`} stroke={["#F87171", "#FFB84D", "#7DD3FC", "#7FB069"][i]} strokeWidth={9} fill="none" />
      ))}
      {/* sun */}
      <Circle cx={262} cy={34} r={22} fill="#FFD97A" />
      {/* clouds */}
      <Ellipse cx={70} cy={40} rx={26} ry={12} fill="#FFFFFF" opacity={0.95} />
      <Ellipse cx={250} cy={90} rx={30} ry={13} fill="#FFFFFF" opacity={0.9} />
      <Rect x={0} y={128} width={320} height={22} fill="#8FCB7E" />
    </Svg>
  );
}

function DramaStage() {
  return (
    <Svg width="100%" height={150} viewBox="0 0 320 150" preserveAspectRatio="xMidYMid slice">
      <Rect x={0} y={0} width={320} height={150} fill="#101418" />
      {/* single spotlight */}
      <Polygon points="140,0 180,0 210,130 110,130" fill="#E8E4D8" opacity={0.28} />
      {/* lone figure */}
      <Circle cx={160} cy={82} r={11} fill="#1F2937" />
      <Rect x={149} y={93} width={22} height={30} rx={8} fill="#1F2937" />
      <Ellipse cx={160} cy={132} rx={40} ry={8} fill="#E8E4D8" opacity={0.25} />
    </Svg>
  );
}

function GenericStage() {
  return (
    <Svg width="100%" height={150} viewBox="0 0 320 150" preserveAspectRatio="xMidYMid slice">
      <Rect x={0} y={0} width={320} height={150} fill="#0D0D16" />
      {/* projector beam */}
      <Polygon points="300,120 320,100 40,20 40,60" fill="#FFF7D6" opacity={0.16} />
      {/* film strip */}
      <Rect x={30} y={30} width={260} height={52} rx={6} fill="#1F2937" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Rect key={i} x={44 + i * 42} y={40} width={30} height={32} rx={3} fill={["#7DD3FC", "#F9A8D4", "#7FB069", "#FFD97A", "#C4B5FD", "#FCA5A5"][i]} opacity={0.9} />
      ))}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
        <Rect key={`t${i}`} x={36 + i * 22} y={32} width={10} height={6} rx={1.5} fill="#0D0D16" />
      ))}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
        <Rect key={`b${i}`} x={36 + i * 22} y={74} width={10} height={6} rx={1.5} fill="#0D0D16" />
      ))}
    </Svg>
  );
}

/** The themed movie screen, with ambient animation overlays.
 *  Frame richness follows the building level: L1 plain, L2 gold, L3 ornate. */
function ThemedScreen({ theme, level = 1 }: { theme: MovieThemeKind; level?: number }) {
  const scene = (() => {
    switch (theme) {
      case "horror": return <HorrorStage />;
      case "comedy": return <ComedyStage />;
      case "action": return <ActionStage />;
      case "romance": return <RomanceStage />;
      case "christmas": return <ChristmasStage />;
      case "western": return <WesternStage />;
      case "scifi": return <ScifiStage />;
      case "musical": return <MusicalStage />;
      case "kids": return <KidsStage />;
      case "drama": return <DramaStage />;
      default: return <GenericStage />;
    }
  })();
  return (
    <View style={{ alignItems: "center" }}>
      {/* ornate side columns at L3 */}
      {level >= 3 && (
        <View style={{ position: "absolute", left: -6, top: -8, bottom: -8, width: 14, zIndex: 2 }}>
          <View style={{ flex: 1, backgroundColor: GOLD, borderRadius: 7, borderWidth: 1, borderColor: "#8B5E34" }} />
          <View style={{ width: 20, height: 10, borderRadius: 5, backgroundColor: GOLD, marginLeft: -3, marginTop: 4 }} />
          <View style={{ width: 20, height: 10, borderRadius: 5, backgroundColor: GOLD, marginLeft: -3, marginTop: 4 }} />
        </View>
      )}
      {level >= 3 && (
        <View style={{ position: "absolute", right: -6, top: -8, bottom: -8, width: 14, zIndex: 2 }}>
          <View style={{ flex: 1, backgroundColor: GOLD, borderRadius: 7, borderWidth: 1, borderColor: "#8B5E34" }} />
          <View style={{ width: 20, height: 10, borderRadius: 5, backgroundColor: GOLD, marginLeft: -3, marginTop: 4 }} />
          <View style={{ width: 20, height: 10, borderRadius: 5, backgroundColor: GOLD, marginLeft: -3, marginTop: 4 }} />
        </View>
      )}
    <View style={{
      borderRadius: 12,
      overflow: "hidden",
      borderWidth: level >= 3 ? 5 : 3,
      borderColor: level >= 2 ? GOLD : "#3A2E55",
      backgroundColor: "#000",
      width: "100%",
    }}>
      {scene}
      {/* ambient overlays per theme */}
      {theme === "horror" && (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, height: 70 }}>
          <Drift fromX={-30} toX={60} duration={7000}><View style={{ position: "absolute", left: 60, top: 18 }}><Bat /></View></Drift>
          <Drift fromX={40} toX={-50} duration={9000} delay={1200}><View style={{ position: "absolute", left: 200, top: 40 }}><Bat size={16} /></View></Drift>
          <View style={{ position: "absolute", left: 52, top: 84, width: 14, height: 18 }}>
            <Flicker><View style={{ width: 14, height: 18, backgroundColor: "#FFB84D" }} /></Flicker>
          </View>
        </View>
      )}
      {theme === "christmas" && (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
          {[40, 120, 200, 280].map((x, i) => (
            <Drift key={i} fromY={-14} toY={150} duration={5000 + i * 900} delay={i * 700}>
              <View style={{ position: "absolute", left: x, top: 0, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#FFFFFF", opacity: 0.9 }} />
            </Drift>
          ))}
        </View>
      )}
      {theme === "romance" && (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, height: 90 }}>
          {[70, 160, 240].map((x, i) => (
            <Drift key={i} fromY={10} toY={-40} duration={4200} delay={i * 900}>
              <SoftPulse duration={1600}>
                <MaterialIcons name="favorite" size={16} color="#F9A8D4" style={{ position: "absolute", left: x, top: 60 }} />
              </SoftPulse>
            </Drift>
          ))}
        </View>
      )}
      {theme === "scifi" && (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, height: 80 }}>
          {[50, 130, 300].map((x, i) => (
            <SoftPulse key={i} duration={1200 + i * 400}>
              <View style={{ position: "absolute", left: x, top: 14 + i * 16, width: 4, height: 4, borderRadius: 2, backgroundColor: "#FFFFFF" }} />
            </SoftPulse>
          ))}
        </View>
      )}
      {(theme === "musical" || theme === "comedy") && (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, height: 70 }}>
          {[90, 200].map((x, i) => (
            <Drift key={i} fromY={8} toY={-30} duration={3600} delay={i * 1100}>
              <SoftPulse duration={1400}>
                <MaterialIcons name="music-note" size={18} color="#FFE9B8" style={{ position: "absolute", left: x, top: 46 }} />
              </SoftPulse>
            </Drift>
          ))}
        </View>
      )}
    </View>
    </View>
  );
}

const THEME_LABELS: Record<MovieThemeKind, string> = {
  horror: "Scary movie night",
  comedy: "Comedy night",
  action: "Action night",
  romance: "Romance night",
  christmas: "Christmas movie night",
  western: "Western night",
  scifi: "Sci-fi night",
  musical: "Musical night",
  kids: "Family movie night",
  drama: "Drama night",
  generic: "Movie night",
};

// ---------- main screen ----------

export default function TheaterInteriorScreen() {
  const router = useRouter();
  const { buildingId } = useLocalSearchParams<{ buildingId?: string }>();
  const { width } = useWindowDimensions();
  const [coins, setCoins] = useState<HometownCoins>({ balance: 0, lifetimeEarned: 0 });
  const [building, setBuilding] = useState<PlacedBuilding | null>(null);
  const [people, setPeople] = useState<PrayedPerson[]>([]);
  const [pawn, setPawn] = useState<CustomPawn | null>(null);
  const [activity, setActivity] = useState<{ title: string; notes?: string } | null>(null);
  const [lastShow, setLastShow] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [coinsRaw, townRaw] = await Promise.all([
          AsyncStorage.getItem(COINS_STORAGE_KEY),
          AsyncStorage.getItem(TOWN_STORAGE_KEY),
        ]);
        setCoins(parseCoins(coinsRaw ? JSON.parse(coinsRaw) : {}));
        if (townRaw && buildingId) {
          const town = parseTown(JSON.parse(townRaw));
          outer: for (const mapId of Object.keys(town.maps) as Array<keyof typeof town.maps>) {
            const found = town.maps[mapId].buildings.find((b) => b.id === buildingId);
            if (found) { setBuilding(found); break outer; }
          }
        }
        setPeople(await prayedTodayPeople());
        const p = await loadCustomPawn().catch(() => null);
        if (p) setPawn(p);
        const act = await getActiveScheduleActivity().catch(() => null);
        if (act && act.kind === "amphitheater") setActivity({ title: act.title, notes: act.notes });
        const raw = await AsyncStorage.getItem("prayercircle.hometown.amphitheater-show.v1").catch(() => null);
        setLastShow(raw ? parseInt(raw, 10) || 0 : 0);
      } catch {}
      setLoaded(true);
    })();
  }, [buildingId]);

  const coinsRef = useRef(coins);
  useEffect(() => { coinsRef.current = coins; }, [coins]);

  const addCoins = useCallback((delta: number) => {
    setCoins((prev) => {
      const next = {
        balance: Math.round((prev.balance + delta) * 100) / 100,
        lifetimeEarned: delta > 0 ? Math.round((prev.lifetimeEarned + delta) * 100) / 100 : prev.lifetimeEarned,
      };
      AsyncStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const theme: MovieThemeKind = movieThemeForTitle(activity?.title ?? "", activity?.notes);
  const level = Math.min(Math.max(building?.level || 1, 1), 3);
  const def = building ? BUILDINGS[building.type as keyof typeof BUILDINGS] : null;
  const name = def?.name ?? "Amphitheater";

  // audience: up to 15 villagers in 3 rows, pawn front and center
  const audience = pickPeople(people, `theater|${buildingId ?? "amp"}`, 15);
  const rows: PrayedPerson[][] = [[], [], []];
  audience.forEach((p, i) => rows[i % 3].push(p));

  const remaining = showMsRemaining(lastShow);

  const handleAttend = () => {
    if (remaining > 0) {
      Alert.alert("Next show", `The villagers are rehearsing — music drifts across the city.\n\nNext show in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(SHOW_COINS[level] ?? 10);
    const xp = scaledXP(SHOW_XP[level] ?? 15);
    const t = Date.now();
    setLastShow(t);
    saveLastShow(t).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `amphitheater-show-${t}`).catch(() => undefined);
    Alert.alert(THEME_LABELS[theme], `The lights dim, the crowd settles in…\n\n+${c.toFixed(2)} coins, +${xp} XP.`);
  };

  const handleUpgrade = () => {
    if (level >= 3 || !buildingId) return;
    const cost = upgradeCostFor(building?.type as any, (level + 1) as 2 | 3);
    if (coinsRef.current.balance < cost) {
      Alert.alert("Not enough coins", `You need ${cost.toFixed(2)} coins. You have ${coinsRef.current.balance.toFixed(2)}.`);
      return;
    }
    addCoins(-cost);
    (async () => {
      try {
        const townRaw = await AsyncStorage.getItem(TOWN_STORAGE_KEY);
        if (!townRaw) return;
        const town = parseTown(JSON.parse(townRaw));
        for (const mapId of Object.keys(town.maps) as Array<keyof typeof town.maps>) {
          const b = town.maps[mapId].buildings.find((x) => x.id === buildingId);
          if (b) { b.level = (level + 1) as 2 | 3; break; }
        }
        await AsyncStorage.setItem(TOWN_STORAGE_KEY, JSON.stringify(town));
        setBuilding((prev) => (prev ? { ...prev, level: (level + 1) as 2 | 3 } : prev));
        Alert.alert(name, `Upgraded to level ${level + 1}! ${level + 1 >= 3 ? "The grand stage glows — braziers lit, banners flying." : "A bigger stage, more voices."}`);
      } catch {}
    })();
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 48, paddingHorizontal: 16, paddingBottom: 12 }}>
        <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
          <MaterialIcons name="arrow-back" size={24} color={TEXT} />
        </Pressable>
        <MaterialIcons name="theater-comedy" size={26} color={GOLD} style={{ marginLeft: 4 }} />
        <Text style={{ marginLeft: 8, fontSize: 20, fontWeight: "800", color: TEXT }}>{name}</Text>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: CARD, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "#3A2E55" }}>
          <MaterialIcons name="monetization-on" size={15} color={GOLD} />
          <Text style={{ marginLeft: 5, fontWeight: "700", color: TEXT }}>{coins.balance.toFixed(2)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* theme banner */}
        <View style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 16, backgroundColor: CARD, borderWidth: 1, borderColor: GOLD, padding: 12, flexDirection: "row", alignItems: "center" }}>
          <MaterialIcons name="movie" size={24} color={GOLD} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={{ color: TEXT, fontWeight: "800", fontSize: 15 }}>{THEME_LABELS[theme]}</Text>
            <Text style={{ color: TEXT_DIM, fontSize: 12, marginTop: 2 }}>
              {activity ? `"${activity.title}"${activity.notes ? ` — ${activity.notes}` : ""}` : "The marquee glows — tonight's show is about to begin."}
            </Text>
          </View>
        </View>

        {/* the screen + audience */}
        <View style={{ marginHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: "#3A2E55", overflow: "hidden", backgroundColor: "#0B0817" }}>
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="theater" />
          {/* curtains + stage dressing by level */}
          <TheaterDressing level={level} />
          <View style={{ paddingHorizontal: 12, marginTop: -104 }}>
            <ThemedScreen theme={theme} level={level} />
          </View>

          {/* audience rows */}
          <View style={{ paddingVertical: 14, paddingHorizontal: 8 }}>
            {rows[2].length > 0 && (
              <View style={{ flexDirection: "row", justifyContent: "center", flexWrap: "wrap", marginBottom: 10, opacity: 0.75 }}>
                {rows[2].map((p, i) => <WatchingFigure key={p.id} person={p} delay={i * 120} />)}
              </View>
            )}
            {rows[1].length > 0 && (
              <View style={{ flexDirection: "row", justifyContent: "center", flexWrap: "wrap", marginBottom: 10, opacity: 0.88 }}>
                {rows[1].map((p, i) => <WatchingFigure key={p.id} person={p} delay={i * 120} />)}
              </View>
            )}
            {/* front row: the pawn front and center */}
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", flexWrap: "wrap" }}>
              {rows[0].slice(0, 2).map((p, i) => <WatchingFigure key={p.id} person={p} delay={i * 120} />)}
              {pawn && (
                <GentleBob delay={300}>
                  <View style={{ alignItems: "center", marginHorizontal: 8 }}>
                    <FigureName name={pawn.name} />
                    <View style={{ borderWidth: 2, borderColor: GOLD, borderRadius: 26, padding: 2, backgroundColor: "rgba(224,166,63,0.12)" }}>
                      <PawnPreview pawn={pawn} size={44} />
                    </View>
                    {/* seat */}
                    <View style={{ width: 52, height: 8, borderRadius: 4, backgroundColor: "#4A2C2A", marginTop: 2 }} />
                  </View>
                </GentleBob>
              )}
              {rows[0].slice(2).map((p, i) => <WatchingFigure key={p.id} person={p} delay={(i + 2) * 120} />)}
            </View>
            {audience.length === 0 && !pawn && (
              <Text style={{ color: TEXT_DIM, fontSize: 13, fontStyle: "italic", textAlign: "center", marginVertical: 12 }}>
                The seats are empty. Pray for someone today and they'll take a seat.
              </Text>
            )}
          </View>
        </View>

        {/* actions */}
        <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 16 }}>
          <Pressable
            onPress={handleAttend}
            style={{ flex: 1, backgroundColor: GOLD, borderRadius: 14, paddingVertical: 13, alignItems: "center", marginRight: 8 }}
          >
            <Text style={{ color: "#241811", fontWeight: "800", fontSize: 15 }}>
              {remaining > 0 ? `Next show in ${formatCooldown(remaining)}` : "Attend the Show"}
            </Text>
          </Pressable>
          {level < 3 && (
            <Pressable onPress={handleUpgrade} style={{ backgroundColor: CARD, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16, alignItems: "center", borderWidth: 1, borderColor: GOLD }}>
              <Text style={{ color: GOLD, fontWeight: "800", fontSize: 14 }}>Upgrade</Text>
            </Pressable>
          )}
        </View>
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          {level >= 3 ? "The grand stage glows — music, stories, and light fill the night air."
            : level >= 2 ? "A bigger stage, more voices — the whole city seems to lean in."
            : "A simple stage, honest music. The villagers gather close."}
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Dimming the lights…</Text>}
      </ScrollView>
    </View>
  );
}
