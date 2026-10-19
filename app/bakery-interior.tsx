// Bakery interior: brick ovens with glowing fire, bread racks, and a wooden
// counter. L1: one oven and a plain counter. L2: two ovens, bread racks, and
// hanging lamps. L3: three ovens, a pastry case, chandelier, and tiled floor.
// A baker villager works the ovens while shoppers browse; "Help Bake" grants
// coins + XP on a 1-hour cooldown. No emojis — SVG art and MaterialIcons only.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Circle, Ellipse, Line, Path, Polygon, Rect } from "react-native-svg";
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

/** One brick oven with a softly pulsing fire in its mouth. `compact` narrows it so three fit at L3. */
function Oven({ compact = false }: { compact?: boolean }) {
  const W = compact ? 104 : 120;
  const H = compact ? 132 : 150;
  const fx = W / 120;
  const fy = H / 150;
  return (
    <View style={{ width: W, marginHorizontal: compact ? 3 : 5, alignItems: "center" }}>
      <Svg width={W} height={H} viewBox="0 0 120 150">
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
        {/* brass nameplate at L3 */}
        {compact && <Rect x={46} y={58} width={28} height={10} rx={3} fill={GOLD} stroke="#8A6D1C" strokeWidth={1.5} />}
        {/* arched mouth */}
        <Path d="M38 132 L38 92 Q60 68 82 92 L82 132 Z" fill="#2E1A12" />
        {/* stone base */}
        <Rect x={2} y={132} width={116} height={10} rx={4} fill="#6B5B4C" />
      </Svg>
      {/* fire glow inside the mouth */}
      <View style={{ position: "absolute", left: 42 * fx, top: 96 * fy }}>
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

/** A grand five-light chandelier with crystal drops (L3). */
function Chandelier() {
  const lamps = [8, 33, 58, 83, 108];
  return (
    <View style={{ alignItems: "center", width: 130 }}>
      <SoftPulse duration={2400}>
        <Svg width={130} height={92} viewBox="0 0 130 92">
          {/* warm glow */}
          <Ellipse cx={65} cy={52} rx={58} ry={34} fill="#FFD166" opacity={0.3} />
          <Rect x={63.5} y={0} width={3} height={14} fill={WOOD_DARK} />
          <Circle cx={65} cy={18} r={5} fill={GOLD} stroke="#8A6D1C" strokeWidth={1.5} />
          {/* ornate curved bar */}
          <Path d="M6 44 Q65 66 124 44" stroke={GOLD} strokeWidth={5} fill="none" strokeLinecap="round" />
          <Line x1={65} y1={22} x2={65} y2={52} stroke={GOLD} strokeWidth={4} />
          {lamps.map((cx, i) => {
            const t = i / (lamps.length - 1);
            const y = 44 + 44 * t * (1 - t) * 0.9 - 4;
            return (
              <g key={cx}>
                <Line x1={cx} y1={y - 22} x2={cx} y2={y - 2} stroke={WOOD_DARK} strokeWidth={2.5} />
                <Polygon points={`${cx - 8},${y - 2} ${cx + 8},${y - 2} ${cx + 5},${y + 12} ${cx - 5},${y + 12}`} fill="#FFF3D6" stroke={GOLD} strokeWidth={1.5} />
                <Ellipse cx={cx} cy={y + 2} rx={4} ry={5} fill="#FFE9A8" />
                <Line x1={cx} y1={y + 12} x2={cx} y2={y + 20} stroke="#BFDCEF" strokeWidth={1.5} />
                <Circle cx={cx} cy={y + 24} r={3.2} fill="#DFF2FD" stroke="#9FB3C8" strokeWidth={1} />
              </g>
            );
          })}
          {/* hanging center crystal */}
          <Line x1={65} y1={56} x2={65} y2={70} stroke="#BFDCEF" strokeWidth={1.5} />
          <Circle cx={65} cy={75} r={5} fill="#DFF2FD" stroke="#9FB3C8" strokeWidth={1.2} />
        </Svg>
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

/** The wooden shop counter — marble with gold trim and a floral centerpiece at L3. */
function Counter({ level = 1 }: { level?: number }) {
  const marble = level >= 3;
  return (
    <View style={{ width: "92%", alignSelf: "center", marginTop: marble ? 26 : 2 }}>
      {marble && (
        <View style={{ position: "absolute", top: -24, alignSelf: "center", alignItems: "center", zIndex: 1 }}>
          <Svg width={60} height={30} viewBox="0 0 60 30">
            <Rect x={25} y={14} width={10} height={16} rx={4} fill="#B08968" stroke="#7A5230" strokeWidth={1.5} />
            <Line x1={30} y1={14} x2={30} y2={6} stroke="#2F6B31" strokeWidth={2} />
            <Line x1={30} y1={14} x2={24} y2={8} stroke="#2F6B31" strokeWidth={2} />
            <Line x1={30} y1={14} x2={36} y2={8} stroke="#2F6B31" strokeWidth={2} />
            <Circle cx={30} cy={4} r={5} fill="#F472B6" />
            <Circle cx={23} cy={7} r={4} fill="#FBBF24" />
            <Circle cx={37} cy={7} r={4} fill="#C084FC" />
          </Svg>
        </View>
      )}
      <View style={{ height: 15, borderRadius: 7, backgroundColor: marble ? "#F7F3EA" : "#B07A45", borderWidth: 2, borderColor: marble ? GOLD : WOOD_DARK }}>
        {marble && (
          <Svg width={120} height={12} viewBox="0 0 120 12" style={{ position: "absolute" }}>
            <Path d="M4 8 C30 2 60 11 90 5 C100 3 110 6 118 4" stroke="#D8D2C4" strokeWidth={1.8} fill="none" />
          </Svg>
        )}
      </View>
      <View style={{ height: 56, backgroundColor: WOOD, borderLeftWidth: 3, borderRightWidth: 3, borderBottomWidth: 3, borderColor: marble ? GOLD : WOOD_DARK, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, flexDirection: "row", justifyContent: "space-evenly" }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ width: 56, marginVertical: 10, borderWidth: 2, borderColor: marble ? GOLD : WOOD_DARK, borderRadius: 4, opacity: 0.7 }} />
        ))}
      </View>
    </View>
  );
}

/** Ornate checkerboard tile floor with gold diamond inlay (L3). */
function TiledFloor() {
  return (
    <View style={{ marginTop: 8 }}>
      {[0, 1, 2].map((r) => (
        <View key={r} style={{ flexDirection: "row" }}>
          {Array.from({ length: 14 }).map((_, c) => (
            <View key={c} style={{ flex: 1, height: 13, backgroundColor: (r + c) % 2 === 0 ? "#EFE6D2" : "#C9B896", alignItems: "center", justifyContent: "center" }}>
              {r === 1 && (r + c) % 2 === 0 && (
                <View style={{ width: 7, height: 7, backgroundColor: GOLD, transform: [{ rotate: "45deg" }], opacity: 0.85 }} />
              )}
            </View>
          ))}
        </View>
      ))}
      <View style={{ height: 4, backgroundColor: GOLD, opacity: 0.7 }} />
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

/** A warm golden wall sconce (L3). */
function WallSconce() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 12 }}>
      <Svg width={26} height={42} viewBox="0 0 26 42">
        <Rect x={11} y={16} width={4} height={20} fill={GOLD} />
        <Polygon points="4,2 22,2 17,16 9,16" fill={GOLD} stroke="#8A6D1C" strokeWidth={1.5} />
        <Ellipse cx={13} cy={9} rx={5} ry={6} fill="#FFE9A8" />
        <Rect x={7} y={36} width={12} height={4} rx={2} fill="#8A6D1C" />
      </Svg>
      <SoftPulse duration={2100}>
        <View style={{ width: 32, height: 11, borderRadius: 5.5, backgroundColor: "#FFD166", opacity: 0.4, marginTop: -16 }} />
      </SoftPulse>
    </View>
  );
}

/** Gold-trimmed artisan plaque (L3). */
function BakeryPlaque() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 4 }}>
      <View style={{ backgroundColor: "#3B2A1A", borderRadius: 10, paddingHorizontal: 18, paddingVertical: 7, borderWidth: 2.5, borderColor: GOLD }}>
        <Text style={{ color: "#F4D47C", fontWeight: "800", fontSize: 12, letterSpacing: 3 }}>ARTISAN BAKERY</Text>
      </View>
    </View>
  );
}

/** A string of mini loaves hung across the bakehouse (L3). */
function BreadGarland({ width = 330 }: { width?: number }) {
  return (
    <Svg width={width} height={30} viewBox={`0 0 ${width} 30`}>
      <Path d={`M0 4 Q ${width / 2} 28 ${width} 4`} stroke={WOOD_DARK} strokeWidth={2} fill="none" />
      {Array.from({ length: 7 }).map((_, i) => {
        const t = (i + 1) / 8;
        const x = width * t;
        const y = 4 + 48 * t * (1 - t);
        return (
          <g key={i}>
            <Line x1={x} y1={y} x2={x} y2={y + 5} stroke={WOOD_DARK} strokeWidth={1.5} />
            <Ellipse cx={x} cy={y + 10} rx={7.5} ry={5} fill="#D9A45B" stroke="#A9713F" strokeWidth={1.2} />
            <Path d={`M${x - 3} ${y + 9} l3 -2.5 M${x + 1} ${y + 9} l3 -2.5`} stroke="#A9713F" strokeWidth={1.2} strokeLinecap="round" />
          </g>
        );
      })}
    </Svg>
  );
}

/** A three-tier cake stand with celebration cakes (L3). */
function CakeStand() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={88} height={106} viewBox="0 0 88 106">
        <Rect x={10} y={98} width={68} height={6} rx={3} fill={GOLD} stroke="#8A6D1C" strokeWidth={1.5} />
        <Rect x={41.5} y={22} width={5} height={76} fill={GOLD} stroke="#8A6D1C" strokeWidth={1} />
        {/* bottom tier */}
        <Ellipse cx={44} cy={90} rx={31} ry={6.5} fill="#E8DCC8" stroke={GOLD} strokeWidth={2} />
        <Rect x={18} y={74} width={52} height={14} rx={5} fill="#F4A7C3" />
        <Circle cx={30} cy={72} r={3} fill="#C0392B" />
        <Circle cx={44} cy={70} r={3} fill="#C0392B" />
        <Circle cx={58} cy={72} r={3} fill="#C0392B" />
        {/* middle tier */}
        <Ellipse cx={44} cy={60} rx={23} ry={5.5} fill="#E8DCC8" stroke={GOLD} strokeWidth={2} />
        <Rect x={25} y={46} width={38} height={12} rx={5} fill="#FFF3D6" stroke="#D9A45B" strokeWidth={1.5} />
        <Circle cx={44} cy={43} r={3.5} fill="#8B5E34" />
        {/* top tier */}
        <Ellipse cx={44} cy={32} rx={15} ry={4.5} fill="#E8DCC8" stroke={GOLD} strokeWidth={2} />
        <Rect x={32} y={20} width={24} height={10} rx={4} fill="#C084FC" />
        <Circle cx={44} cy={17} r={3.5} fill="#FDE68A" stroke="#8A6D1C" strokeWidth={1} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Celebration cakes</Text>
    </View>
  );
}

/** A chalkboard menu in a gold frame (L3). */
function MenuBoard() {
  const items: [string, string][] = [["Sourdough", "4"], ["Croissant", "3"], ["Eclair", "5"], ["Danish", "4"]];
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <View style={{ width: 100, borderRadius: 8, backgroundColor: "#2E2A24", borderWidth: 5, borderColor: GOLD, paddingHorizontal: 8, paddingVertical: 7 }}>
        <Text style={{ color: "#FDE68A", fontWeight: "800", fontSize: 10, textAlign: "center", letterSpacing: 2 }}>MENU</Text>
        <View style={{ height: 1.5, backgroundColor: "#5B5348", marginVertical: 5 }} />
        {items.map(([name, price]) => (
          <View key={name} style={{ flexDirection: "row", justifyContent: "space-between", marginVertical: 1.5 }}>
            <Text style={{ color: "#F5EDE0", fontSize: 8.5 }}>{name}</Text>
            <Text style={{ color: "#FDE68A", fontSize: 8.5, fontWeight: "700" }}>{price}</Text>
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Today's menu</Text>
    </View>
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
      ? "A grand artisan patisserie — three brass-trimmed ovens, celebration cakes, a full pastry case, golden sconces, and a crystal chandelier."
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
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="bakery" />
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
          {/* artisan sign + sconces at L3 */}
          {level >= 3 && (
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", backgroundColor: WALL, paddingTop: 10 }}>
              <WallSconce />
              <BakeryPlaque />
              <WallSconce />
            </View>
          )}
          {/* ovens */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: level >= 3 ? 2 : 8, paddingHorizontal: 6, backgroundColor: WALL, paddingBottom: 10 }}>
            <Oven compact={level >= 3} />
            {level >= 2 && <Oven compact={level >= 3} />}
            {level >= 3 && <Oven compact={level >= 3} />}
          </View>
          {level >= 3 && (
            <View style={{ alignItems: "center", backgroundColor: WALL, paddingBottom: 4 }}>
              <BreadGarland />
            </View>
          )}
          {/* rack + cake stand */}
          {level >= 2 && (
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 10 }}>
              <BreadRack />
              {level >= 3 && <CakeStand />}
            </View>
          )}
          {/* pastry case + menu at L3 */}
          {level >= 3 && (
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 10 }}>
              <PastryDisplay />
              <MenuBoard />
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
          <Counter level={level} />
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
            handleUpgrade(level >= 2 ? "Celebration cakes, a chalkboard menu, golden sconces, and a crystal chandelier." : "A second oven, bread racks, and hanging lamps.")
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
