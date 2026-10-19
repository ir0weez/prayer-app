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
const HARVEST_COINS: Record<number, number> = { 1: 5, 2: 10, 3: 20 };
const HARVEST_XP: Record<number, number> = { 1: 4, 2: 8, 3: 12 };
const FARM_TOOLS = ["agriculture", "eco", "water-drop", "grass"];

/** The sun, with a slow warm glow. */
function Sun() {
  return (
    <View style={{ position: "absolute", top: 8, right: 16, alignItems: "center" }}>
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

/** A simple wooden fence across the field. */
function Fence() {
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

export default function FarmInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
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
      ? "A grand farmstead — great barn with silo, six crop rows, windmill, and tractor."
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
            <Sun />
            {level >= 2 && (
              <>
                <Cloud left={16} top={12} />
                <Cloud left={150} top={32} scale={0.7} />
              </>
            )}
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 56, paddingHorizontal: 10 }}>
              {level >= 3 && <Silo />}
              <Barn level={level} />
              {level >= 2 && <Windmill />}
            </View>
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", paddingBottom: 8, marginTop: 2 }}>
              {level >= 2 && <HayBale />}
              {level >= 2 && <View style={{ width: 26 }} />}
              {level >= 2 && <HayBale />}
              {level >= 3 && <View style={{ width: 20 }} />}
              {level >= 3 && <Tractor />}
            </View>
          </View>

          {/* fields */}
          <View style={{ backgroundColor: FIELD, paddingTop: 10, paddingBottom: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
              <MaterialIcons name="grass" size={14} color="#2F5A2E" />
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#2F5A2E", marginLeft: 4, letterSpacing: 1 }}>THE FIELDS</Text>
            </View>
            {Array.from({ length: rowCount }).map((_, i) => (
              <CropRow key={i} wheat={i % 2 === 1} />
            ))}
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
            <Fence />
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
            handleUpgrade(level >= 2 ? "A silo, six crop rows, and a tractor." : "A bigger barn, four crop rows, and a windmill.")
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Lend a hand in the fields once an hour for fresh coins and XP.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Walking out to the farm…</Text>}
      </ScrollView>
    </View>
  );
}
