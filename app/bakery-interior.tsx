// Bakery interior: brick ovens with glowing fire, bread racks, and a wooden
// counter. L1: one oven and a plain counter. L2: two ovens, bread racks, and
// hanging lamps. L3: three ovens, a pastry case, chandelier, and tiled floor.
// A baker villager works the ovens while shoppers browse; "Help Bake" grants
// coins + XP on a 1-hour cooldown. No emojis — SVG art and MaterialIcons only.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Ellipse, Line, Path, Polygon, Rect } from "react-native-svg";
import { MaterialIcons } from "@expo/vector-icons";
import { awardCustomXP } from "@/lib/xp-engine";
import { scaledCoins, scaledXP } from "@/lib/hometown";
import { formatCooldown } from "@/lib/gathering-places";
import type { CustomPawn } from "@/lib/pawn";
import { PawnPreview } from "@/components/pawn-preview";
import {
  FigureName,
  GentleBob,
  SoftPulse,
  StandingFigure,
  WorkingFigure,
  pickPeople,
} from "@/components/activity-figures";
import {
  InteriorActions,
  InteriorBanner,
  InteriorHeader,
  useInteriorData,
} from "@/components/interior-shell";

const BG = "#F7F1E8";
const CARD_BG = "#FFFDF9";
const WALL = "#F3E4D3";
const BRICK = "#A84E32";
const BRICK_DARK = "#7C3A24";
const WOOD = "#8B5E34";
const WOOD_DARK = "#5E3D22";
const GOLD = "#D97706";
const TEXT_DIM = "#8A7360";
const BAKE_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const BAKE_KEY = "prayercircle.interior.bakery.bake.v1";
const BAKE_COINS: Record<number, number> = { 1: 4, 2: 8, 3: 14 };
const BAKE_XP: Record<number, number> = { 1: 3, 2: 6, 3: 10 };

/** One brick oven with a softly pulsing fire in its mouth. */
function Oven() {
  return (
    <View style={{ width: 120, marginHorizontal: 5, alignItems: "center" }}>
      <Svg width={120} height={150} viewBox="0 0 120 150">
        {/* chimney */}
        <Rect x={48} y={0} width={24} height={26} fill={BRICK_DARK} />
        <Rect x={44} y={22} width={32} height={6} fill={BRICK} />
        {/* body */}
        <Rect x={8} y={26} width={104} height={106} rx={10} fill={BRICK} />
        {/* brick courses */}
        <Line x1={8} y1={52} x2={112} y2={52} stroke={BRICK_DARK} strokeWidth={2} opacity={0.6} />
        <Line x1={8} y1={78} x2={112} y2={78} stroke={BRICK_DARK} strokeWidth={2} opacity={0.6} />
        <Line x1={8} y1={104} x2={112} y2={104} stroke={BRICK_DARK} strokeWidth={2} opacity={0.6} />
        <Line x1={42} y1={26} x2={42} y2={52} stroke={BRICK_DARK} strokeWidth={2} opacity={0.6} />
        <Line x1={78} y1={52} x2={78} y2={78} stroke={BRICK_DARK} strokeWidth={2} opacity={0.6} />
        <Line x1={42} y1={78} x2={42} y2={104} stroke={BRICK_DARK} strokeWidth={2} opacity={0.6} />
        <Line x1={78} y1={104} x2={78} y2={132} stroke={BRICK_DARK} strokeWidth={2} opacity={0.6} />
        {/* arched mouth */}
        <Path d="M38 132 L38 92 Q60 68 82 92 L82 132 Z" fill="#2E1A12" />
        {/* stone base */}
        <Rect x={2} y={132} width={116} height={10} rx={4} fill="#6B5B4C" />
      </Svg>
      {/* fire glow inside the mouth */}
      <View style={{ position: "absolute", left: 42, top: 96 }}>
        <SoftPulse duration={1400}>
          <Svg width={36} height={30} viewBox="0 0 36 30">
            <Ellipse cx={18} cy={20} rx={14} ry={10} fill="#FF9A3D" opacity={0.9} />
            <Ellipse cx={18} cy={18} rx={8} ry={7} fill="#FFD166" />
            <Path d="M18 4 q4.5 7 0 13 q-4.5 -6 0 -13" fill="#FF6B35" />
          </Svg>
        </SoftPulse>
      </View>
    </View>
  );
}

/** One golden loaf. */
function Loaf() {
  return (
    <Svg width={30} height={17} viewBox="0 0 30 17">
      <Ellipse cx={15} cy={10} rx={13} ry={7} fill="#D9A45B" />
      <Ellipse cx={15} cy={8} rx={10} ry={4.5} fill="#E4B96E" />
      <Path d="M9 8 l3.5 -3 M15 7 l3.5 -3" stroke="#A9713F" strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

/** Wooden bread rack with three shelves of loaves (L2+). */
function BreadRack() {
  const shelves = [22, 60, 98];
  return (
    <View style={{ width: 104, height: 128, marginHorizontal: 8 }}>
      <Svg width={104} height={128} viewBox="0 0 104 128" style={{ position: "absolute" }}>
        <Rect x={4} y={0} width={9} height={128} rx={3} fill={WOOD_DARK} />
        <Rect x={91} y={0} width={9} height={128} rx={3} fill={WOOD_DARK} />
        {shelves.map((y) => (
          <Rect key={y} x={4} y={y} width={96} height={9} rx={3} fill={WOOD} />
        ))}
      </Svg>
      {shelves.map((y) => (
        <View key={y} style={{ position: "absolute", top: y - 15, left: 0, right: 0, flexDirection: "row", justifyContent: "space-evenly" }}>
          <Loaf />
          <Loaf />
        </View>
      ))}
    </View>
  );
}

/** A hanging lamp with a warm glow (L2+). */
function HangingLamp() {
  return (
    <View style={{ alignItems: "center", width: 44 }}>
      <View style={{ width: 3, height: 30, backgroundColor: WOOD_DARK }} />
      <Svg width={40} height={24} viewBox="0 0 40 24">
        <Polygon points="8,0 32,0 38,18 2,18" fill={WOOD} />
        <Rect x={14} y={18} width={12} height={4} fill="#FBBF24" />
      </Svg>
      <SoftPulse duration={2200}>
        <View style={{ width: 36, height: 12, borderRadius: 6, backgroundColor: "#FFD166", opacity: 0.45, marginTop: -8 }} />
      </SoftPulse>
    </View>
  );
}

/** Small lamp shade for the chandelier bar. */
function MiniLamp() {
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: 2.5, height: 14, backgroundColor: WOOD_DARK }} />
      <Svg width={30} height={18} viewBox="0 0 30 18">
        <Polygon points="6,0 24,0 29,14 1,14" fill={WOOD} />
        <Rect x={11} y={14} width={8} height={3} fill="#FBBF24" />
      </Svg>
    </View>
  );
}

/** A grand three-light chandelier (L3). */
function Chandelier() {
  return (
    <View style={{ alignItems: "center", width: 120 }}>
      <View style={{ width: 3, height: 16, backgroundColor: WOOD_DARK }} />
      <View style={{ width: 116, height: 8, borderRadius: 4, backgroundColor: WOOD, borderWidth: 1.5, borderColor: WOOD_DARK }} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", width: 104, marginTop: -2 }}>
        <MiniLamp />
        <MiniLamp />
        <MiniLamp />
      </View>
      <SoftPulse duration={2000}>
        <View style={{ width: 110, height: 16, borderRadius: 8, backgroundColor: "#FFD166", opacity: 0.32, marginTop: -20 }} />
      </SoftPulse>
    </View>
  );
}

/** Glass pastry display case (L3). */
function PastryDisplay() {
  const pastries = ["#F4A7C3", "#8B5E34", "#FFF3D6", "#C0392B"];
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8, marginBottom: 2 }}>
      <View style={{ width: 150, height: 66, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.6)", borderWidth: 3, borderColor: "#C9B896", flexDirection: "row", alignItems: "flex-end", justifyContent: "space-evenly", paddingBottom: 8, paddingHorizontal: 8 }}>
        {pastries.map((c, i) => (
          <View key={i} style={{ alignItems: "center" }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c, borderWidth: 1.5, borderColor: "rgba(0,0,0,0.08)" }} />
            <View style={{ width: 26, height: 6, borderRadius: 3, backgroundColor: "#E8DCC8", marginTop: 2 }} />
          </View>
        ))}
      </View>
      <View style={{ width: 158, height: 9, borderRadius: 4, backgroundColor: WOOD_DARK }} />
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Pastry case</Text>
    </View>
  );
}

/** The wooden shop counter. */
function Counter() {
  return (
    <View style={{ width: "92%", alignSelf: "center", marginTop: 2 }}>
      <View style={{ height: 15, borderRadius: 7, backgroundColor: "#B07A45", borderWidth: 2, borderColor: WOOD_DARK }} />
      <View style={{ height: 56, backgroundColor: WOOD, borderLeftWidth: 3, borderRightWidth: 3, borderBottomWidth: 3, borderColor: WOOD_DARK, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, flexDirection: "row", justifyContent: "space-evenly" }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ width: 56, marginVertical: 10, borderWidth: 2, borderColor: WOOD_DARK, borderRadius: 4, opacity: 0.7 }} />
        ))}
      </View>
    </View>
  );
}

/** Checkerboard tile floor (L3). */
function TiledFloor() {
  return (
    <View style={{ marginTop: 8 }}>
      {[0, 1].map((r) => (
        <View key={r} style={{ flexDirection: "row" }}>
          {Array.from({ length: 14 }).map((_, c) => (
            <View key={c} style={{ flex: 1, height: 14, backgroundColor: (r + c) % 2 === 0 ? "#E8DCC8" : "#C9B896" }} />
          ))}
        </View>
      ))}
    </View>
  );
}

/** The player's pawn, helping behind the counter. */
function PawnBaker({ pawn }: { pawn: CustomPawn | null }) {
  if (!pawn) return null;
  return (
    <GentleBob delay={300} amount={2}>
      <View style={{ alignItems: "center", marginHorizontal: 7 }}>
        <FigureName name={pawn.name} color="#5B4326" />
        <SoftPulse duration={2000}>
          <MaterialIcons name="bakery-dining" size={15} color={GOLD} style={{ marginBottom: 1 }} />
        </SoftPulse>
        <View style={{ borderWidth: 2, borderColor: "#E0A63F", borderRadius: 22, padding: 1, backgroundColor: "rgba(224,166,63,0.12)" }}>
          <PawnPreview pawn={pawn} size={36} />
        </View>
      </View>
    </GentleBob>
  );
}

export default function BakeryInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastBake, setLastBake] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(BAKE_KEY)
      .then((raw) => setLastBake(raw ? parseInt(raw, 10) || 0 : 0))
      .catch(() => undefined);
  }, []);

  const remaining = Math.max(0, lastBake + BAKE_COOLDOWN_MS - Date.now());
  const baker = pickPeople(people, `bakery-baker|${building?.id ?? "bakery"}`, 1)[0];
  const shoppers = pickPeople(people, `bakery-shoppers|${building?.id ?? "bakery"}`, 3);

  const levelBlurb =
    level >= 3
      ? "A grand bakehouse — three brick ovens, a full pastry case, and a chandelier."
      : level >= 2
        ? "A cozy bakery — two brick ovens, bread racks, and hanging lamps."
        : "A humble bakery — one brick oven and a plain wooden counter.";

  const handleBake = async () => {
    if (remaining > 0) {
      Alert.alert("Ovens are resting", `The next batch will be ready in about ${formatCooldown(remaining)}.`);
      return;
    }
    const t = Date.now();
    setLastBake(t);
    await AsyncStorage.setItem(BAKE_KEY, String(t)).catch(() => undefined);
    const c = scaledCoins(BAKE_COINS[level] ?? 4);
    const xp = scaledXP(BAKE_XP[level] ?? 3);
    addCoins(c);
    awardCustomXP(xp, `bakery-bake-${t}`).catch(() => undefined);
    Alert.alert("Fresh from the oven", `You help shape the loaves and pull them golden from the oven.\n\n+${c.toFixed(2)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="bakery-dining" iconColor={GOLD} title={buildingName} coins={coins} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner icon="cake" iconColor={GOLD} title={buildingName} blurb={levelBlurb} accent="#D9C4A5" />

        {/* bakery scene */}
        <View style={{ marginHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: "#D9C4A5", overflow: "hidden", backgroundColor: CARD_BG }}>
          {/* ceiling beam */}
          <View style={{ height: 12, backgroundColor: WOOD_DARK }} />
          {/* lamps */}
          {level >= 2 && (
            <View style={{ flexDirection: "row", justifyContent: "space-around", alignItems: "flex-start", paddingHorizontal: 24, backgroundColor: WALL, paddingBottom: 2 }}>
              <HangingLamp />
              {level >= 3 ? <Chandelier /> : <View style={{ width: 44 }} />}
              <HangingLamp />
            </View>
          )}
          {/* ovens */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8, paddingHorizontal: 6, backgroundColor: WALL, paddingBottom: 10 }}>
            <Oven />
            {level >= 2 && <Oven />}
            {level >= 3 && <Oven />}
          </View>
          {/* rack + pastry case */}
          {level >= 2 && (
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 10 }}>
              <BreadRack />
              {level >= 3 && <PastryDisplay />}
            </View>
          )}
          {/* baker + pawn behind the counter */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 10 }}>
            {baker && <WorkingFigure person={baker} delay={120} icon="bakery-dining" iconColor={GOLD} showLabel />}
            {pawn && <PawnBaker pawn={pawn} />}
            {!baker && !pawn && (
              <Text style={{ color: TEXT_DIM, fontSize: 12, fontStyle: "italic" }}>The bakery is quiet today.</Text>
            )}
          </View>
          <Counter />
          {/* shoppers at the counter */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", flexWrap: "wrap", marginTop: 8, paddingHorizontal: 8 }}>
            {shoppers.map((p, i) => (
              <StandingFigure key={p.id} person={p} delay={i * 180} icon="shopping-basket" iconColor={GOLD} />
            ))}
          </View>
          {/* floor */}
          {level >= 3 ? <TiledFloor /> : <View style={{ height: 20, backgroundColor: "#C8A06A", marginTop: 8 }} />}
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Help Bake"}
          onPrimary={handleBake}
          primaryColor={GOLD}
          level={level}
          onUpgrade={() =>
            handleUpgrade(level >= 2 ? "A third oven, a pastry case, and a chandelier." : "A second oven, bread racks, and hanging lamps.")
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Help with the baking once an hour for fresh coins and XP.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Warming up the ovens…</Text>}
      </ScrollView>
    </View>
  );
}
