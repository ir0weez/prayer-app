// Farm interior: Sunny Acres. A red barn, crop rows, a fence, and the sun —
// richer at every level (bigger barn, more rows, windmill, silo, tractor).
// Villagers work the fields; "Help Harvest" grants coins + XP on a 1-hour
// cooldown. No emojis — SVG art and MaterialIcons only.

import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from "react-native-svg";
import { MaterialIcons } from "@expo/vector-icons";
import { awardCustomXP } from "@/lib/xp-engine";
import { scaledCoins, scaledXP } from "@/lib/hometown";
import { formatCooldown } from "@/lib/gathering-places";
import type { CustomPawn } from "@/lib/pawn";
import { PawnPreview } from "@/components/pawn-preview";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";
import { HarvestGame } from "@/components/harvest-game";
import { PlayCard } from "@/components/mini-game-scene";
import { useMiniGameHost } from "@/components/mini-game-host";
import {
  FigureName,
  GentleBob,
  SoftPulse,
  WorkingFigure,
  pickPeople,
} from "@/components/activity-figures";
import {
  InteriorActions,
  InteriorBanner,
  InteriorHeader,
  useInteriorData,
} from "@/components/interior-shell";

const BG = "#EAF6FB";
const SKY = "#BFE3F5";
const FIELD = "#8CC084";
const FIELD_DARK = "#6FA372";
const SOIL = "#8B5E34";
const BARN_RED = "#B3402E";
const BARN_DARK = "#8E2F22";
const TRIM = "#F5EDE0";
const TEXT_DIM = "#7A6A52";
const GREEN = "#5B8A5E";
const HARVEST_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const HARVEST_KEY = "prayercircle.interior.farm.harvest.v1";
const HARVEST_COINS: Record<number, number> = { 1: 50, 2: 100, 3: 200 };
const HARVEST_XP: Record<number, number> = { 1: 4, 2: 8, 3: 12 };
const FARM_TOOLS = ["agriculture", "eco", "water-drop", "grass"];

/** The sun, with a slow warm glow — and grand rotating rays at L3. */
function Sun({ grand = false }: { grand?: boolean }) {
  const rot = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!grand) return;
    const loop = Animated.loop(
      Animated.timing(rot, { toValue: 1, duration: 26000, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [rot, grand]);
  const spin = rot.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <View style={{ position: "absolute", top: 8, right: 16, alignItems: "center" }}>
      {grand && (
        <Animated.View style={{ position: "absolute", left: -9, top: -9, width: 76, height: 76, transform: [{ rotate: spin }] }}>
          <Svg width={76} height={76} viewBox="0 0 76 76">
            {Array.from({ length: 8 }).map((_, i) => (
              <G key={i} rotation={i * 45} origin="38, 38">
                <Rect x={35.5} y={1} width={5} height={15} rx={2.5} fill="#FCD34D" opacity={0.9} />
              </G>
            ))}
          </Svg>
        </Animated.View>
      )}
      <SoftPulse duration={2800}>
        <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: "#FDE68A", opacity: 0.55 }} />
      </SoftPulse>
      <View style={{ position: "absolute", top: 9 }}>
        <Svg width={40} height={40} viewBox="0 0 40 40">
          <Circle cx={20} cy={20} r={14} fill="#FBBF24" />
          <Circle cx={20} cy={20} r={10} fill="#FCD34D" />
        </Svg>
      </View>
    </View>
  );
}

/** A soft cartoon cloud. */
function Cloud({ left, top, scale = 1 }: { left: number; top: number; scale?: number }) {
  return (
    <View style={{ position: "absolute", left, top, opacity: 0.95 }}>
      <Svg width={90 * scale} height={34 * scale} viewBox="0 0 90 34">
        <Ellipse cx={30} cy={22} rx={22} ry={12} fill="#FFFFFF" />
        <Ellipse cx={55} cy={18} rx={20} ry={13} fill="#FFFFFF" />
        <Ellipse cx={70} cy={24} rx={14} ry={9} fill="#F1F5F9" />
      </Svg>
    </View>
  );
}

/** The barn — grows with the farm's level. */
function Barn({ level }: { level: number }) {
  if (level >= 3) {
    return (
      <Svg width={228} height={164} viewBox="0 0 230 165">
        <Polygon points="12,70 62,36 168,36 218,70" fill={BARN_DARK} />
        <Polygon points="62,36 115,18 168,36" fill="#7C281D" />
        {/* cupola */}
        <Rect x={105} y={2} width={20} height={20} fill={TRIM} />
        <Polygon points="101,4 115,-6 129,4" fill={BARN_DARK} />
        <Rect x={18} y={68} width={194} height={92} fill={BARN_RED} />
        <Rect x={18} y={68} width={8} height={92} fill={TRIM} />
        <Rect x={204} y={68} width={8} height={92} fill={TRIM} />
        {/* big double doors with braces */}
        <Rect x={88} y={104} width={54} height={56} fill="#5E3D22" />
        <Line x1={88} y1={104} x2={115} y2={160} stroke={TRIM} strokeWidth={3.5} />
        <Line x1={115} y1={104} x2={88} y2={160} stroke={TRIM} strokeWidth={3.5} />
        <Line x1={115} y1={104} x2={142} y2={160} stroke={TRIM} strokeWidth={3.5} />
        <Line x1={142} y1={104} x2={115} y2={160} stroke={TRIM} strokeWidth={3.5} />
        <Line x1={115} y1={104} x2={115} y2={160} stroke={TRIM} strokeWidth={3.5} />
        {/* loft + side windows */}
        <Rect x={46} y={78} width={20} height={18} fill="#F5E6D0" stroke={TRIM} strokeWidth={2.5} />
        <Rect x={164} y={78} width={20} height={18} fill="#F5E6D0" stroke={TRIM} strokeWidth={2.5} />
        <Rect x={105} y={78} width={20} height={18} fill="#F5E6D0" stroke={TRIM} strokeWidth={2.5} />
        <Rect x={34} y={118} width={16} height={16} fill="#F5E6D0" stroke={TRIM} strokeWidth={2.5} />
        <Rect x={180} y={118} width={16} height={16} fill="#F5E6D0" stroke={TRIM} strokeWidth={2.5} />
        {/* hanging flower baskets */}
        {[30, 200].map((bx) => (
          <G key={bx}>
            <Line x1={bx} y1={62} x2={bx} y2={72} stroke="#5E3D22" strokeWidth={2} />
            <Polygon points={`${bx - 8},72 ${bx + 8},72 ${bx + 5},82 ${bx - 5},82`} fill="#7A5230" />
            <Circle cx={bx - 5} cy={70} r={4.5} fill="#F472B6" />
            <Circle cx={bx + 2} cy={68} r={4.5} fill="#FBBF24" />
            <Circle cx={bx + 6} cy={72} r={4} fill="#F87171" />
            <Circle cx={bx - 1} cy={73} r={3.5} fill="#C084FC" />
          </G>
        ))}
      </Svg>
    );
  }
  if (level >= 2) {
    return (
      <Svg width={198} height={150} viewBox="0 0 200 150">
        <Polygon points="10,64 55,32 145,32 190,64" fill={BARN_DARK} />
        <Polygon points="55,32 100,16 145,32" fill="#7C281D" />
        {/* weathervane */}
        <Line x1={100} y1={16} x2={100} y2={2} stroke="#4B5563" strokeWidth={2.5} />
        <Polygon points="100,1 113,6 100,11" fill="#4B5563" />
        <Circle cx={100} cy={6} r={2.5} fill="#4B5563" />
        <Rect x={18} y={62} width={164} height={84} fill={BARN_RED} />
        <Rect x={18} y={62} width={8} height={84} fill={TRIM} />
        <Rect x={174} y={62} width={8} height={84} fill={TRIM} />
        {/* double doors */}
        <Rect x={78} y={96} width={44} height={50} fill="#5E3D22" />
        <Line x1={78} y1={96} x2={100} y2={146} stroke={TRIM} strokeWidth={3} />
        <Line x1={100} y1={96} x2={78} y2={146} stroke={TRIM} strokeWidth={3} />
        <Line x1={100} y1={96} x2={122} y2={146} stroke={TRIM} strokeWidth={3} />
        <Line x1={122} y1={96} x2={100} y2={146} stroke={TRIM} strokeWidth={3} />
        <Line x1={100} y1={96} x2={100} y2={146} stroke={TRIM} strokeWidth={3} />
        {/* loft windows */}
        <Rect x={48} y={72} width={18} height={16} fill="#F5E6D0" stroke={TRIM} strokeWidth={2.5} />
        <Rect x={134} y={72} width={18} height={16} fill="#F5E6D0" stroke={TRIM} strokeWidth={2.5} />
      </Svg>
    );
  }
  return (
    <Svg width={138} height={104} viewBox="0 0 140 105">
      <Polygon points="8,44 70,12 132,44" fill={BARN_DARK} />
      <Rect x={14} y={42} width={112} height={58} fill={BARN_RED} />
      <Rect x={14} y={42} width={6} height={58} fill={TRIM} />
      <Rect x={120} y={42} width={6} height={58} fill={TRIM} />
      <Rect x={62} y={50} width={16} height={14} fill="#F5E6D0" stroke={TRIM} strokeWidth={2} />
      <Rect x={58} y={72} width={24} height={28} fill="#5E3D22" />
      <Line x1={58} y1={72} x2={82} y2={100} stroke={TRIM} strokeWidth={3} />
      <Line x1={82} y1={72} x2={58} y2={100} stroke={TRIM} strokeWidth={3} />
    </Svg>
  );
}

/** Grain silo (L3). */
function Silo() {
  return (
    <Svg width={60} height={128} viewBox="0 0 64 130" style={{ marginRight: 8 }}>
      <Rect x={8} y={26} width={48} height={104} fill="#CBD5E1" />
      <Path d="M8 28 Q32 -6 56 28 Z" fill="#94A3B8" />
      <Line x1={8} y1={52} x2={56} y2={52} stroke="#94A3B8" strokeWidth={2} />
      <Line x1={8} y1={78} x2={56} y2={78} stroke="#94A3B8" strokeWidth={2} />
      <Line x1={8} y1={104} x2={56} y2={104} stroke="#94A3B8" strokeWidth={2} />
      <Rect x={26} y={92} width={12} height={38} fill="#64748B" />
    </Svg>
  );
}

/** Windmill with slowly turning blades (L2+). Gentle linear spin, no bounce. */
function Windmill() {
  const rot = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rot, { toValue: 1, duration: 16000, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [rot]);
  const spin = rot.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <View style={{ alignItems: "center", width: 76, marginLeft: 10 }}>
      <Animated.View style={{ width: 70, height: 70, transform: [{ rotate: spin }] }}>
        <Svg width={70} height={70} viewBox="0 0 70 70">
          {[0, 90, 180, 270].map((a) => (
            <G key={a} rotation={a} origin="35, 35">
              <Polygon points="35,31 60,8 64,13 38,39" fill="#A8B4C0" />
            </G>
          ))}
          <Circle cx={35} cy={35} r={6} fill="#64748B" />
          <Circle cx={35} cy={35} r={2.5} fill="#E2E8F0" />
        </Svg>
      </Animated.View>
      <Svg width={48} height={84} viewBox="0 0 48 84" style={{ marginTop: -36 }}>
        <Polygon points="14,84 34,84 26,10 22,10" fill="#C9C2B6" />
        <Line x1={18} y1={66} x2={30} y2={66} stroke="#8A857B" strokeWidth={2.5} />
        <Line x1={20} y1={48} x2={28} y2={48} stroke="#8A857B" strokeWidth={2.5} />
        <Line x1={22} y1={30} x2={26} y2={30} stroke="#8A857B" strokeWidth={2.5} />
        <Rect x={14} y={2} width={20} height={12} rx={4} fill="#78716C" />
      </Svg>
    </View>
  );
}

/** A round hay bale (L2+). */
function HayBale() {
  return (
    <Svg width={44} height={32} viewBox="0 0 44 32">
      <Rect x={4} y={8} width={36} height={20} rx={9} fill="#E3B94E" />
      <Ellipse cx={22} cy={18} rx={14} ry={7} fill="#D4A03C" />
      <Path d="M10 13 q6 -2 12 0 M10 23 q6 2 12 0" stroke="#B4832A" strokeWidth={1.5} fill="none" />
    </Svg>
  );
}

/** A little farm tractor (L3). */
function Tractor() {
  return (
    <Svg width={118} height={68} viewBox="0 0 120 70">
      <Circle cx={32} cy={50} r={18} fill="#1F2937" />
      <Circle cx={32} cy={50} r={8} fill="#9CA3AF" />
      <Circle cx={94} cy={54} r={11} fill="#1F2937" />
      <Circle cx={94} cy={54} r={5} fill="#9CA3AF" />
      <Rect x={20} y={28} width={58} height={16} rx={3} fill="#2F7D32" />
      <Rect x={76} y={34} width={26} height={12} rx={3} fill="#2F7D32" />
      <Rect x={26} y={8} width={28} height={22} rx={3} fill="#374151" />
      <Rect x={30} y={12} width={20} height={13} rx={2} fill="#BFE3F5" />
      <Rect x={86} y={12} width={5} height={24} fill="#4B5563" />
      <Line x1={58} y1={30} x2={66} y2={22} stroke="#1F2937" strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

/** One crop plant — wheat rows get golden heads, veggie rows get tomatoes. */
function CropPlant({ wheat = false }: { wheat?: boolean }) {
  const leaf = wheat ? "#C9A227" : "#3E8E41";
  const stem = wheat ? "#A88420" : "#2F6B31";
  return (
    <Svg width={18} height={26} viewBox="0 0 18 26">
      <Line x1={9} y1={26} x2={9} y2={12} stroke={stem} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M9 18 Q3 16 2 9 Q8 11 9 15 Z" fill={leaf} />
      <Path d="M9 14 Q15 12 16 5 Q10 7 9 11 Z" fill={leaf} />
      {wheat ? (
        <Ellipse cx={9} cy={8} rx={3.5} ry={5} fill="#E3B94E" />
      ) : (
        <Circle cx={9} cy={10} r={2.8} fill="#E2725B" />
      )}
    </Svg>
  );
}

/** One tilled row with plants. */
function CropRow({ wheat = false }: { wheat?: boolean }) {
  return (
    <View style={{ alignItems: "center", marginVertical: 2 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <CropPlant key={i} wheat={wheat} />
        ))}
      </View>
      <View style={{ width: "88%", height: 9, borderRadius: 4.5, backgroundColor: SOIL, marginTop: -3, opacity: 0.95 }} />
    </View>
  );
}

/** A simple wooden fence across the field — a white picket fence with flower boxes at L3. */
function Fence({ level = 1 }: { level?: number }) {
  if (level >= 3) {
    return (
      <View style={{ marginTop: 8 }}>
        {/* flower boxes peeking above the pickets */}
        <View style={{ flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 40, marginBottom: -12, zIndex: 1 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ alignItems: "center" }}>
              <View style={{ flexDirection: "row" }}>
                {["#F472B6", "#FBBF24", "#F87171", "#C084FC"].map((c, j) => (
                  <View key={j} style={{ width: 11, height: 11, borderRadius: 5.5, backgroundColor: c, marginHorizontal: 1, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" }} />
                ))}
              </View>
              <View style={{ width: 52, height: 11, borderRadius: 3, backgroundColor: "#7A5230", borderWidth: 1.5, borderColor: "#5E3D22", marginTop: 1 }} />
            </View>
          ))}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10 }}>
          {Array.from({ length: 13 }).map((_, i) => (
            <View key={i} style={{ alignItems: "center" }}>
              <View style={{ width: 9, height: 9, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D8D2C4", transform: [{ rotate: "45deg" }], marginBottom: -5 }} />
              <View style={{ width: 9, height: 32, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D8D2C4", borderRadius: 2 }} />
            </View>
          ))}
        </View>
        <View style={{ position: "absolute", top: 22, left: 0, right: 0, height: 6, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#D8D2C4" }} />
        <View style={{ position: "absolute", top: 36, left: 0, right: 0, height: 6, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#D8D2C4" }} />
      </View>
    );
  }
  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10 }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <View key={i} style={{ width: 8, height: 34, backgroundColor: SOIL, borderRadius: 2 }} />
        ))}
      </View>
      <View style={{ position: "absolute", top: 8, left: 0, right: 0, height: 5, backgroundColor: "#A9713F" }} />
      <View style={{ position: "absolute", top: 20, left: 0, right: 0, height: 5, backgroundColor: "#A9713F" }} />
    </View>
  );
}

/** The player's pawn, out in the field helping. */
function PawnFigure({ pawn }: { pawn: CustomPawn | null }) {
  if (!pawn) return null;
  return (
    <GentleBob delay={250} amount={2}>
      <View style={{ alignItems: "center", marginHorizontal: 7 }}>
        <FigureName name={pawn.name} color="#2F5A2E" />
        <SoftPulse duration={2000}>
          <MaterialIcons name="agriculture" size={15} color="#B45309" style={{ marginBottom: 1 }} />
        </SoftPulse>
        <View style={{ borderWidth: 2, borderColor: "#E0A63F", borderRadius: 22, padding: 1, backgroundColor: "rgba(255,255,255,0.35)" }}>
          <PawnPreview pawn={pawn} size={36} />
        </View>
      </View>
    </GentleBob>
  );
}

/** Wooden entrance arch with a farm sign and hanging flower baskets (L3). */
function EntranceSign() {
  return (
    <View style={{ alignItems: "center", marginTop: 48 }}>
      <Svg width={252} height={66} viewBox="0 0 252 66">
        <Rect x={8} y={20} width={11} height={46} rx={3} fill="#5E3D22" />
        <Rect x={233} y={20} width={11} height={46} rx={3} fill="#5E3D22" />
        <Path d="M13 24 Q126 -10 239 24" stroke="#5E3D22" strokeWidth={9} fill="none" strokeLinecap="round" />
        <Rect x={66} y={8} width={120} height={32} rx={9} fill="#7A5230" stroke="#C9963C" strokeWidth={2.5} />
        {/* hanging baskets */}
        {[52, 200].map((bx) => (
          <G key={bx}>
            <Line x1={bx} y1={20} x2={bx} y2={30} stroke="#5E3D22" strokeWidth={2} />
            <Polygon points={`${bx - 7},30 ${bx + 7},30 ${bx + 4},39 ${bx - 4},39`} fill="#7A5230" />
            <Circle cx={bx - 4} cy={28} r={4} fill="#F472B6" />
            <Circle cx={bx + 3} cy={27} r={4} fill="#FBBF24" />
            <Circle cx={bx} cy={31} r={3.5} fill="#F87171" />
          </G>
        ))}
      </Svg>
      <View style={{ position: "absolute", top: 13 }}>
        <Text style={{ color: "#FDECC8", fontWeight: "800", fontSize: 14, letterSpacing: 3 }}>SUNNY ACRES</Text>
      </View>
    </View>
  );
}

/** A row of colorful flowers along the barn (L3). */
function FlowerBed() {
  const flowers = ["#F472B6", "#FBBF24", "#C084FC", "#F87171", "#60A5FA", "#F472B6", "#FBBF24", "#34D399"];
  return (
    <View style={{ alignItems: "center", paddingVertical: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        {flowers.map((c, i) => (
          <View key={i} style={{ alignItems: "center", marginHorizontal: 7 }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: c, borderWidth: 1.5, borderColor: "rgba(0,0,0,0.08)" }} />
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#FDE68A", marginTop: -12 }} />
            <View style={{ width: 3, height: 15, backgroundColor: "#2F6B31", marginTop: -4 }} />
          </View>
        ))}
      </View>
      <View style={{ width: 300, height: 9, borderRadius: 4.5, backgroundColor: SOIL, marginTop: -2, borderWidth: 1, borderColor: "#6B4423" }} />
    </View>
  );
}

/** A little butterfly drifting over the flowers (L3). */
function Butterfly({ left, top, delay, color = "#C084FC" }: { left: number; top: number; delay: number; color?: string }) {
  return (
    <View style={{ position: "absolute", left, top }}>
      <GentleBob delay={delay} amount={5}>
        <Svg width={22} height={17} viewBox="0 0 22 17">
          <Ellipse cx={7} cy={8.5} rx={5.5} ry={7} fill={color} />
          <Ellipse cx={15} cy={8.5} rx={5.5} ry={7} fill={color} opacity={0.75} />
          <Rect x={10} y={4} width={2.4} height={10} rx={1.2} fill="#4A3B28" />
        </Svg>
      </GentleBob>
    </View>
  );
}

/** A tall row of sunflowers (L3). */
function SunflowerRow() {
  return (
    <View style={{ alignItems: "center", marginVertical: 2 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Svg key={i} width={26} height={54} viewBox="0 0 26 54">
            <Line x1={13} y1={54} x2={13} y2={22} stroke="#2F6B31" strokeWidth={3} strokeLinecap="round" />
            <Path d="M13 42 Q5 40 4 32 Q11 34 13 39 Z" fill="#3E8E41" />
            <Path d="M13 46 Q21 44 22 36 Q15 38 13 43 Z" fill="#357A38" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
              <G key={a} rotation={a} origin="13, 13">
                <Ellipse cx={13} cy={5} rx={3.4} ry={6.5} fill="#FBBF24" />
              </G>
            ))}
            <Circle cx={13} cy={13} r={6} fill="#7C4A1E" />
            <Circle cx={13} cy={13} r={3} fill="#5E3A15" />
          </Svg>
        ))}
      </View>
      <View style={{ width: "80%", height: 9, borderRadius: 4.5, backgroundColor: SOIL, marginTop: -3, opacity: 0.95 }} />
    </View>
  );
}

/** A friendly scarecrow watching the fields (L3). */
function Scarecrow() {
  return (
    <View style={{ position: "absolute", right: 8, top: 52 }}>
      <GentleBob delay={500} amount={1.5}>
        <Svg width={54} height={78} viewBox="0 0 54 78">
          <Line x1={27} y1={16} x2={27} y2={78} stroke="#5E3D22" strokeWidth={4} />
          <Line x1={9} y1={32} x2={45} y2={32} stroke="#5E3D22" strokeWidth={4} />
          {/* straw hat */}
          <Polygon points="13,10 41,10 27,0" fill="#C9A227" />
          <Rect x={11} y={8} width={32} height={5} rx={2.5} fill="#A88420" />
          {/* burlap head */}
          <Circle cx={27} cy={17} r={9} fill="#E8C98A" />
          <Circle cx={24} cy={16} r={1.4} fill="#4A3B28" />
          <Circle cx={30} cy={16} r={1.4} fill="#4A3B28" />
          <Path d="M23 21 q4 3 8 0" stroke="#4A3B28" strokeWidth={1.5} fill="none" />
          {/* patchwork shirt */}
          <Rect x={13} y={26} width={28} height={22} rx={4} fill="#B3402E" />
          <Rect x={13} y={26} width={12} height={22} fill="#0E7C86" opacity={0.85} />
          {/* straw hands and feet */}
          <Line x1={9} y1={32} x2={4} y2={28} stroke="#E3B94E" strokeWidth={3} strokeLinecap="round" />
          <Line x1={45} y1={32} x2={50} y2={28} stroke="#E3B94E" strokeWidth={3} strokeLinecap="round" />
          <Line x1={24} y1={78} x2={20} y2={73} stroke="#E3B94E" strokeWidth={3} strokeLinecap="round" />
          <Line x1={30} y1={78} x2={34} y2={73} stroke="#E3B94E" strokeWidth={3} strokeLinecap="round" />
        </Svg>
      </GentleBob>
    </View>
  );
}

/** A wooden crate of shiny apples (L3). */
function AppleCrate() {
  return (
    <Svg width={54} height={42} viewBox="0 0 54 42" style={{ marginHorizontal: 6 }}>
      <Circle cx={15} cy={13} r={7.5} fill="#C0392B" />
      <Circle cx={28} cy={11} r={7.5} fill="#D64533" />
      <Circle cx={41} cy={13} r={7.5} fill="#C0392B" />
      <Circle cx={13} cy={11} r={2} fill="#F1948A" opacity={0.8} />
      <Circle cx={26} cy={9} r={2} fill="#F1948A" opacity={0.8} />
      <Path d="M28 4 q2 -3 5 -4" stroke="#2F6B31" strokeWidth={2} fill="none" />
      <Rect x={4} y={17} width={46} height={23} rx={3} fill="#8B5E34" stroke="#5E3D22" strokeWidth={2} />
      <Line x1={4} y1={26} x2={50} y2={26} stroke="#5E3D22" strokeWidth={2} />
      <Line x1={4} y1={33} x2={50} y2={33} stroke="#5E3D22" strokeWidth={2} />
    </Svg>
  );
}

export default function FarmInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const harvest = useMiniGameHost("harvest", addCoins);
  const [lastHarvest, setLastHarvest] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(HARVEST_KEY)
      .then((raw) => setLastHarvest(raw ? parseInt(raw, 10) || 0 : 0))
      .catch(() => undefined);
  }, []);

  const remaining = Math.max(0, lastHarvest + HARVEST_COOLDOWN_MS - Date.now());
  const workers = pickPeople(people, `farm|${building?.id ?? "farm"}`, 4);
  const rowCount = level >= 3 ? 6 : level >= 2 ? 4 : 2;

  const levelBlurb =
    level >= 3
      ? "A grand estate farm — great barn with flower baskets, a Sunny Acres arch, sunflower rows, a scarecrow, and a white picket fence."
      : level >= 2
        ? "A thriving farm — a bigger barn, four crop rows, and a windmill."
        : "A humble homestead — a small barn and two rows of crops.";

  const handleHarvest = async () => {
    if (remaining > 0) {
      Alert.alert("Crops are growing", `The next harvest will be ready in about ${formatCooldown(remaining)}.`);
      return;
    }
    const t = Date.now();
    setLastHarvest(t);
    await AsyncStorage.setItem(HARVEST_KEY, String(t)).catch(() => undefined);
    const c = scaledCoins(HARVEST_COINS[level] ?? 5);
    const xp = scaledXP(HARVEST_XP[level] ?? 4);
    addCoins(c);
    awardCustomXP(xp, `farm-harvest-${t}`).catch(() => undefined);
    Alert.alert("Harvest gathered", `You lend a hand and bring in the harvest.\n\n+${c.toFixed(2)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="farm" />
      <InteriorHeader icon="agriculture" iconColor={GREEN} title={buildingName} coins={coins} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner icon="eco" iconColor={GREEN} title={buildingName} blurb={levelBlurb} accent="#C9A86A" />

        {/* farm scene */}
        <View style={{ marginHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: "#C9A86A", overflow: "hidden" }}>
          {/* sky + barn */}
          <View style={{ backgroundColor: SKY }}>
            <Sun grand={level >= 3} />
            {level >= 2 && (
              <>
                <Cloud left={16} top={12} />
                <Cloud left={150} top={32} scale={0.7} />
              </>
            )}
            {level >= 3 && <EntranceSign />}
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: level >= 3 ? 4 : 56, paddingHorizontal: 10 }}>
              {level >= 3 && <Silo />}
              <Barn level={level} />
              {level >= 2 && <Windmill />}
            </View>
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", paddingBottom: 8, marginTop: 2 }}>
              {level >= 2 && <HayBale />}
              {level >= 2 && <View style={{ width: 26 }} />}
              {level >= 2 && <HayBale />}
              {level >= 3 && <AppleCrate />}
              {level >= 3 && <View style={{ width: 14 }} />}
              {level >= 3 && <Tractor />}
            </View>
          </View>

          {/* fields */}
          <View style={{ backgroundColor: FIELD, paddingTop: 10, paddingBottom: 2 }}>
            {level >= 3 && <FlowerBed />}
            {level >= 3 && <Scarecrow />}
            {level >= 3 && <Butterfly left={46} top={64} delay={200} color="#C084FC" />}
            {level >= 3 && <Butterfly left={252} top={88} delay={900} color="#F9A8D4" />}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
              <MaterialIcons name="grass" size={14} color="#2F5A2E" />
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#2F5A2E", marginLeft: 4, letterSpacing: 1 }}>THE FIELDS</Text>
            </View>
            {Array.from({ length: rowCount }).map((_, i) => (
              <CropRow key={i} wheat={i % 2 === 1} />
            ))}
            {level >= 3 && <SunflowerRow />}
            {/* villagers working the rows */}
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", flexWrap: "wrap", marginTop: 8, paddingHorizontal: 8 }}>
              {pawn && <PawnFigure pawn={pawn} />}
              {workers.map((p, i) => (
                <WorkingFigure key={p.id} person={p} delay={i * 180} icon={FARM_TOOLS[i % FARM_TOOLS.length]} iconColor="#B45309" />
              ))}
              {workers.length === 0 && !pawn && (
                <Text style={{ color: "#2F5A2E", fontSize: 12, fontStyle: "italic" }}>The fields are quiet today.</Text>
              )}
            </View>
            <Fence level={level} />
          </View>

          {/* ground strip */}
          <View style={{ height: 22, backgroundColor: FIELD_DARK }}>
            <View style={{ height: 3, backgroundColor: "#5B8A5E" }} />
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Help Harvest"}
          onPrimary={handleHarvest}
          primaryColor={GREEN}
          level={level}
          onUpgrade={() =>
            handleUpgrade(level >= 2 ? "A Sunny Acres arch, sunflower rows, flower beds, a scarecrow, and a white picket fence." : "A bigger barn, four crop rows, and a windmill.")
          }
        />
        <PlayCard
          icon="agriculture"
          title="Play: Harvest Rows"
          blurb="Rows ripen one by one — gather them in their golden moment."
          playsLeft={harvest.playsLeft}
          cap={harvest.cap}
          accent={GREEN}
          onPlay={() => harvest.setPlaying(true)}
        />
        {harvest.playing && <HarvestGame accent={GREEN} onComplete={harvest.handleComplete} onExit={() => harvest.setPlaying(false)} />}
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Lend a hand in the fields once an hour for fresh coins and XP.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Walking out to the farm…</Text>}
      </ScrollView>
    </View>
  );
}
