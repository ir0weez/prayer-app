// Market interior: an open-air market plaza with striped stalls and fresh
// produce. Serves both "market" and "city-market" — the City Market Hall gets
// a grander stone entrance arch. L1: two stalls. L2: four stalls and a
// fountain. L3: six stalls, fountain, bunting banners, and string lights.
// Villagers shop the stalls; "Browse the Stalls" grants coins + XP on a
// 1-hour cooldown. No emojis — SVG art and MaterialIcons only.

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
  pickPeople,
} from "@/components/activity-figures";
import {
  InteriorActions,
  InteriorBanner,
  InteriorHeader,
  useInteriorData,
} from "@/components/interior-shell";

const BG = "#FBF7EF";
const PLAZA = "#F3EAD8";
const STONE = "#C9BFAE";
const WOOD = "#8B5E34";
const WOOD_DARK = "#5E3D22";
const BRONZE = "#B45309";
const GOLD = "#C9963C";
const TEXT = "#4A3B28";
const TEXT_DIM = "#8A7A5F";
const BROWSE_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const BROWSE_KEY = "prayercircle.interior.market.browse.v1";
const BROWSE_COINS: Record<number, number> = { 1: 4, 2: 8, 3: 15 };
const BROWSE_XP: Record<number, number> = { 1: 3, 2: 6, 3: 10 };
const STALL_COLORS = [
  { a: "#C0392B", b: "#F5EDE0" },
  { a: "#0E7C86", b: "#F5EDE0" },
  { a: "#D97706", b: "#FFF7E6" },
  { a: "#6D28D9", b: "#F5EDE0" },
  { a: "#15803D", b: "#F5EDE0" },
  { a: "#B45309", b: "#FFF7E6" },
];
const PRODUCE_SETS = [
  ["#E2725B", "#F2B544", "#7FB069"],
  ["#C0392B", "#E8912D", "#A8C686"],
  ["#8E44AD", "#F2B544", "#E2725B"],
];

/** Entrance arch — grander stone + gold for the City Market Hall; flags and a flower garland at L3. */
function EntranceArch({ grand, festive = false }: { grand: boolean; festive?: boolean }) {
  const pillar = grand ? "#9AA5B1" : WOOD;
  const cap = grand ? "#D9A441" : WOOD_DARK;
  const W = grand ? 250 : 210;
  const H = grand ? 104 : 88;
  const apexY = grand ? -4 : 4;
  // points along the arch beam for the flower garland
  const garland = Array.from({ length: 9 }).map((_, i) => {
    const t = 0.12 + (i / 8) * 0.76;
    const mt = 1 - t;
    return {
      x: mt * mt * 20 + 2 * mt * t * (W / 2) + t * t * (W - 20),
      y: mt * mt * 30 + 2 * mt * t * apexY + t * t * 30,
      c: ["#F472B6", "#FBBF24", "#F87171"][i % 3],
    };
  });
  return (
    <View style={{ alignItems: "center", marginTop: 10 }}>
      <Svg width={W} height={festive ? H + 26 : H} viewBox={`0 0 ${W} ${festive ? H + 26 : H}`}>
        {festive && (
          <g>
            {/* pennant flags */}
            <Line x1={W / 2 - 60} y1={26} x2={W / 2 - 60} y2={2} stroke={WOOD_DARK} strokeWidth={2.5} />
            <Polygon points={`${W / 2 - 60},2 ${W / 2 - 34},9 ${W / 2 - 60},16`} fill="#C0392B" />
            <Line x1={W / 2 + 60} y1={26} x2={W / 2 + 60} y2={2} stroke={WOOD_DARK} strokeWidth={2.5} />
            <Polygon points={`${W / 2 + 60},2 ${W / 2 + 86},9 ${W / 2 + 60},16`} fill="#0E7C86" />
          </g>
        )}
        {/* pillars */}
        <Rect x={10} y={26} width={grand ? 20 : 16} height={H - 26} fill={pillar} />
        <Rect x={W - (grand ? 30 : 26)} y={26} width={grand ? 20 : 16} height={H - 26} fill={pillar} />
        {/* caps */}
        <Rect x={6} y={16} width={grand ? 28 : 24} height={11} rx={3} fill={cap} />
        <Rect x={W - (grand ? 34 : 30)} y={16} width={grand ? 28 : 24} height={11} rx={3} fill={cap} />
        {/* arch beam */}
        <Path d={`M20 30 Q ${W / 2} ${apexY} ${W - 20} 30`} stroke={grand ? "#B98A2F" : "#A9713F"} strokeWidth={grand ? 13 : 10} fill="none" />
        {/* flower garland along the beam */}
        {festive &&
          garland.map((g, i) => (
            <g key={i}>
              <Circle cx={g.x} cy={g.y - 7} r={5} fill={g.c} />
              <Circle cx={g.x} cy={g.y - 7} r={2} fill="#FDE68A" />
            </g>
          ))}
        {grand && (
          <>
            <Line x1={W / 2 - 42} y1={36} x2={W / 2 - 42} y2={50} stroke={WOOD_DARK} strokeWidth={2} />
            <Circle cx={W / 2 - 42} cy={57} r={7} fill="#FFE9A8" stroke="#B98A2F" strokeWidth={2} />
            <Line x1={W / 2 + 42} y1={36} x2={W / 2 + 42} y2={50} stroke={WOOD_DARK} strokeWidth={2} />
            <Circle cx={W / 2 + 42} cy={57} r={7} fill="#FFE9A8" stroke="#B98A2F" strokeWidth={2} />
          </>
        )}
      </Svg>
    </View>
  );
}

/** One market stall with a striped awning and produce baskets. `premium` adds gold trim and a hanging lantern. */
function Stall({ colors, produce, premium = false }: { colors: { a: string; b: string }; produce: string[]; premium?: boolean }) {
  const trim = premium ? "#C9963C" : WOOD_DARK;
  return (
    <View style={{ width: 152, alignItems: "center", margin: 6 }}>
      {/* striped awning */}
      <View style={{ flexDirection: "row", width: 152, height: 26, borderTopLeftRadius: 6, borderTopRightRadius: 6, overflow: "hidden", borderWidth: 2.5, borderColor: trim, borderBottomWidth: 0 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: i % 2 === 0 ? colors.a : colors.b }} />
        ))}
      </View>
      {/* scalloped valance */}
      <View style={{ flexDirection: "row", width: 152 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={{ flex: 1, height: 9, backgroundColor: i % 2 === 0 ? colors.a : colors.b, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }} />
        ))}
      </View>
      {/* hanging lantern on premium stalls */}
      {premium && (
        <View style={{ alignItems: "center", marginTop: -2 }}>
          <View style={{ width: 2, height: 8, backgroundColor: WOOD_DARK }} />
          <SoftPulse duration={2200}>
            <Svg width={26} height={30} viewBox="0 0 26 30">
              <Rect x={10} y={0} width={6} height={4} fill={WOOD_DARK} />
              <Ellipse cx={13} cy={15} rx={11} ry={11} fill="#C0392B" stroke={GOLD} strokeWidth={1.5} />
              <Line x1={13} y1={4} x2={13} y2={26} stroke="#F4D47C" strokeWidth={1.5} opacity={0.8} />
              <Rect x={10} y={26} width={6} height={4} fill={WOOD_DARK} />
            </Svg>
          </SoftPulse>
        </View>
      )}
      {/* posts */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", width: 142 }}>
        <View style={{ width: 6, height: 58, backgroundColor: WOOD }} />
        <View style={{ width: 6, height: 58, backgroundColor: WOOD }} />
      </View>
      {/* table + produce */}
      <View style={{ width: 152, marginTop: -52, alignItems: "center" }}>
        <View style={{ width: 142, height: 10, borderRadius: 3, backgroundColor: "#A9713F", borderWidth: 1.5, borderColor: WOOD_DARK }} />
        <View style={{ flexDirection: "row", marginTop: 5 }}>
          {produce.map((c, i) => (
            <View key={i} style={{ alignItems: "center", marginHorizontal: 4 }}>
              <View style={{ flexDirection: "row" }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c }} />
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c, marginLeft: -4 }} />
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c, marginLeft: -4 }} />
              </View>
              <View style={{ width: 34, height: 10, borderRadius: 3, backgroundColor: WOOD, marginTop: -3 }} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/** A gently sparkling plaza fountain (L2+) — a grand two-tier fountain with gold trim at L3. */
function Fountain({ grand = false }: { grand?: boolean }) {
  if (grand) {
    return (
      <View style={{ alignItems: "center", marginVertical: 10 }}>
        <SoftPulse duration={2400}>
          <Svg width={170} height={150} viewBox="0 0 170 150">
            {/* gold medallion base */}
            <Ellipse cx={85} cy={136} rx={72} ry={12} fill="none" stroke={GOLD} strokeWidth={3} />
            <Ellipse cx={85} cy={136} rx={60} ry={9} fill="#7DD3FC" opacity={0.5} />
            {/* lower basin */}
            <Ellipse cx={85} cy={122} rx={58} ry={14} fill="#9AA5B1" />
            <Ellipse cx={85} cy={120} rx={58} ry={14} fill="none" stroke={GOLD} strokeWidth={3} />
            <Ellipse cx={85} cy={120} rx={48} ry={10} fill="#7DD3FC" />
            <Ellipse cx={85} cy={118} rx={38} ry={7} fill="#BAE6FD" />
            {/* column */}
            <Polygon points="78,60 92,60 89,120 81,120" fill="#9AA5B1" />
            <Line x1={78} y1={80} x2={92} y2={80} stroke={GOLD} strokeWidth={2} />
            {/* upper tier */}
            <Ellipse cx={85} cy={58} rx={30} ry={9} fill="#9AA5B1" />
            <Ellipse cx={85} cy={56} rx={30} ry={9} fill="none" stroke={GOLD} strokeWidth={2.5} />
            <Ellipse cx={85} cy={56} rx={22} ry={6.5} fill="#7DD3FC" />
            <Ellipse cx={85} cy={54} rx={14} ry={4} fill="#BAE6FD" />
            {/* obelisk + gold orb */}
            <Polygon points="80,56 90,56 85,26" fill="#9AA5B1" />
            <Circle cx={85} cy={20} r={8} fill={GOLD} stroke="#8A6D1C" strokeWidth={2} />
            {/* water arcs */}
            <Path d="M85 50 Q60 34 46 18 M85 50 Q85 30 85 12 M85 50 Q110 34 124 18" stroke="#BAE6FD" strokeWidth={3.5} fill="none" strokeLinecap="round" />
            {/* sparkles */}
            <Circle cx={46} cy={18} r={2.5} fill="#FFFFFF" />
            <Circle cx={124} cy={18} r={2.5} fill="#FFFFFF" />
            <Circle cx={60} cy={98} r={2} fill="#FFFFFF" opacity={0.9} />
            <Circle cx={110} cy={98} r={2} fill="#FFFFFF" opacity={0.9} />
          </Svg>
        </SoftPulse>
      </View>
    );
  }
  return (
    <View style={{ alignItems: "center", marginVertical: 10 }}>
      <SoftPulse duration={2400}>
        <Svg width={110} height={96} viewBox="0 0 110 96">
          <Ellipse cx={55} cy={84} rx={46} ry={12} fill="#7DD3FC" />
          <Ellipse cx={55} cy={82} rx={36} ry={9} fill="#BAE6FD" />
          <Polygon points="50,44 60,44 58,84 52,84" fill="#9AA5B1" />
          <Ellipse cx={55} cy={40} rx={22} ry={7} fill="#7DD3FC" />
          <Ellipse cx={55} cy={38} rx={15} ry={4.5} fill="#BAE6FD" />
          <Path d="M55 34 Q40 20 30 8 M55 34 Q55 18 55 6 M55 34 Q70 20 80 8" stroke="#BAE6FD" strokeWidth={3} fill="none" strokeLinecap="round" />
        </Svg>
      </SoftPulse>
    </View>
  );
}

/** Triangle bunting strung across the plaza (L3). */
function Bunting({ width = 340 }: { width?: number }) {
  const flags = ["#C0392B", "#D97706", "#0E7C86", "#6D28D9", "#15803D"];
  return (
    <Svg width={width} height={38} viewBox={`0 0 ${width} 38`}>
      <Path d={`M0 4 Q ${width / 2} 34 ${width} 4`} stroke={WOOD} strokeWidth={2.5} fill="none" />
      {Array.from({ length: 9 }).map((_, i) => {
        const t = (i + 1) / 10;
        const x = width * t;
        const y = 4 + 60 * t * (1 - t);
        return <Polygon key={i} points={`${x - 8},${y} ${x + 8},${y} ${x},${y + 14}`} fill={flags[i % flags.length]} />;
      })}
    </Svg>
  );
}

/** A string of softly glowing market lights (L3). */
function StringLights({ width = 340 }: { width?: number }) {
  return (
    <SoftPulse duration={2600}>
      <Svg width={width} height={30} viewBox={`0 0 ${width} 30`}>
        <Path d={`M0 4 Q ${width / 2} 28 ${width} 4`} stroke={WOOD_DARK} strokeWidth={2} fill="none" />
        {Array.from({ length: 11 }).map((_, i) => {
          const t = (i + 1) / 12;
          const x = width * t;
          const y = 4 + 48 * t * (1 - t);
          return <Circle key={i} cx={x} cy={y + 4} r={3.6} fill="#FFE9A8" />;
        })}
      </Svg>
    </SoftPulse>
  );
}

/** The player's pawn, browsing the stalls. */
function PawnShopper({ pawn }: { pawn: CustomPawn | null }) {
  if (!pawn) return null;
  return (
    <GentleBob delay={300} amount={2}>
      <View style={{ alignItems: "center", marginHorizontal: 7 }}>
        <FigureName name={pawn.name} color="#6B4A2B" />
        <SoftPulse duration={2000}>
          <MaterialIcons name="shopping-bag" size={15} color={BRONZE} style={{ marginBottom: 1 }} />
        </SoftPulse>
        <View style={{ borderWidth: 2, borderColor: "#E0A63F", borderRadius: 22, padding: 1, backgroundColor: "rgba(224,166,63,0.12)" }}>
          <PawnPreview pawn={pawn} size={36} />
        </View>
      </View>
    </GentleBob>
  );
}

/** A string of glowing paper lanterns (L3). */
function LanternString({ width = 340 }: { width?: number }) {
  const colors = ["#C0392B", "#D97706", "#0E7C86", "#6D28D9", "#15803D"];
  return (
    <SoftPulse duration={3000}>
      <Svg width={width} height={44} viewBox={`0 0 ${width} 44`}>
        <Path d={`M0 4 Q ${width / 2} 30 ${width} 4`} stroke={WOOD_DARK} strokeWidth={2} fill="none" />
        {Array.from({ length: 7 }).map((_, i) => {
          const t = (i + 1) / 8;
          const x = width * t;
          const y = 4 + 52 * t * (1 - t);
          return (
            <g key={i}>
              <Line x1={x} y1={y} x2={x} y2={y + 6} stroke={WOOD_DARK} strokeWidth={1.5} />
              <Ellipse cx={x} cy={y + 15} rx={9} ry={10} fill={colors[i % colors.length]} opacity={0.92} />
              <Ellipse cx={x} cy={y + 15} rx={4} ry={6} fill="#FFE9A8" opacity={0.55} />
              <Rect x={x - 3} y={y + 4} width={6} height={3} fill={WOOD_DARK} />
              <Rect x={x - 3} y={y + 24} width={6} height={3} fill={WOOD_DARK} />
            </g>
          );
        })}
      </Svg>
    </SoftPulse>
  );
}

/** A wooden flower cart with bright bouquets (L3). */
function FlowerCart() {
  const bouquets = ["#F472B6", "#FBBF24", "#F87171"];
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <Svg width={132} height={96} viewBox="0 0 132 96">
        {/* bouquets */}
        {bouquets.map((c, i) => {
          const x = 36 + i * 30;
          return (
            <g key={i}>
              <Line x1={x} y1={44} x2={x} y2={28} stroke="#2F6B31" strokeWidth={2.5} />
              <Circle cx={x - 5} cy={24} r={7} fill={c} />
              <Circle cx={x + 5} cy={22} r={7} fill={c} opacity={0.85} />
              <Circle cx={x} cy={18} r={6} fill={c} />
              <Circle cx={x} cy={21} r={2.5} fill="#FDE68A" />
            </g>
          );
        })}
        {/* cart bed */}
        <Polygon points="14,48 118,48 108,74 24,74" fill="#8B5E34" stroke="#5E3D22" strokeWidth={2} />
        <Line x1={20} y1={56} x2={112} y2={56} stroke="#5E3D22" strokeWidth={2} />
        <Line x1={24} y1={64} x2={108} y2={64} stroke="#5E3D22" strokeWidth={2} />
        {/* wheels */}
        <Circle cx={36} cy={80} r={13} fill="#5E3D22" />
        <Circle cx={36} cy={80} r={6} fill="#A9713F" />
        <Circle cx={96} cy={80} r={13} fill="#5E3D22" />
        <Circle cx={96} cy={80} r={6} fill="#A9713F" />
        {/* handle */}
        <Line x1={118} y1={52} x2={130} y2={40} stroke="#5E3D22" strokeWidth={4} strokeLinecap="round" />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Flower cart</Text>
    </View>
  );
}

/** A neatly trimmed topiary in a terracotta pot (L3). */
function PottedTopiary() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <Svg width={52} height={84} viewBox="0 0 52 84">
        <Polygon points="26,4 44,46 8,46" fill="#3E8E41" />
        <Polygon points="26,4 36,46 16,46" fill="#4C9A50" />
        <Circle cx={26} cy={14} r={5} fill="#4C9A50" />
        <Rect x={23} y={46} width={6} height={12} fill="#5E3D22" />
        <Polygon points="12,58 40,58 35,80 17,80" fill="#B45309" stroke="#7A3D06" strokeWidth={1.5} />
        <Rect x={10} y={54} width={32} height={6} rx={3} fill="#7A3D06" />
      </Svg>
    </View>
  );
}

export default function MarketInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastBrowse, setLastBrowse] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(BROWSE_KEY)
      .then((raw) => setLastBrowse(raw ? parseInt(raw, 10) || 0 : 0))
      .catch(() => undefined);
  }, []);

  const isCityMarket = building?.type === "city-market";
  const remaining = Math.max(0, lastBrowse + BROWSE_COOLDOWN_MS - Date.now());
  const shoppers = pickPeople(people, `market|${building?.id ?? "market"}`, 5);
  const stallCount = level >= 3 ? 8 : level >= 2 ? 4 : 2;

  const levelBlurb =
    level >= 3
      ? "A grand bazaar — eight stalls with lanterns, a tiered golden fountain, a flower cart, banners, and lights."
      : level >= 2
        ? "A lively market — four stalls gathered around the plaza fountain."
        : "A humble market — two stalls under the morning sun.";

  const handleBrowse = async () => {
    if (remaining > 0) {
      Alert.alert("Stalls are restocking", `New deals will arrive in about ${formatCooldown(remaining)}.`);
      return;
    }
    const t = Date.now();
    setLastBrowse(t);
    await AsyncStorage.setItem(BROWSE_KEY, String(t)).catch(() => undefined);
    const c = scaledCoins(BROWSE_COINS[level] ?? 4);
    const xp = scaledXP(BROWSE_XP[level] ?? 3);
    addCoins(c);
    awardCustomXP(xp, `market-browse-${t}`).catch(() => undefined);
    Alert.alert("A good browse", `You wander the stalls and find a few treasures.\n\n+${c.toFixed(2)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="market" />
      <InteriorHeader icon="storefront" iconColor={BRONZE} title={buildingName} coins={coins} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner icon="shopping-basket" iconColor={BRONZE} title={buildingName} blurb={levelBlurb} accent="#D9C4A5" />

        {/* market plaza scene */}
        <View style={{ marginHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: "#D9C4A5", overflow: "hidden", backgroundColor: PLAZA }}>
          <EntranceArch grand={isCityMarket} festive={level >= 3} />
          {/* wooden sign */}
          <View style={{ alignItems: "center", marginTop: 2 }}>
            <View style={{ backgroundColor: WOOD, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 5, borderWidth: 2, borderColor: WOOD_DARK }}>
              <Text style={{ color: "#FFF7E6", fontWeight: "800", fontSize: 13 }}>{buildingName}</Text>
            </View>
          </View>
          {level >= 3 && (
            <View style={{ alignItems: "center", marginTop: 6 }}>
              <Bunting />
              <StringLights />
              <LanternString />
            </View>
          )}
          {/* stalls */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: 8, paddingHorizontal: 4 }}>
            {Array.from({ length: stallCount }).map((_, i) => (
              <Stall key={i} colors={STALL_COLORS[i % STALL_COLORS.length]} produce={PRODUCE_SETS[i % PRODUCE_SETS.length]} premium={level >= 3 && (i === 0 || i === 4)} />
            ))}
          </View>
          {/* fountain */}
          {level >= 2 && <Fountain grand={level >= 3} />}
          {/* flower cart with topiaries at L3 */}
          {level >= 3 && (
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 2 }}>
              <PottedTopiary />
              <FlowerCart />
              <PottedTopiary />
            </View>
          )}
          {/* shoppers */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
            <MaterialIcons name="shopping-basket" size={14} color="#6B4A2B" />
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#6B4A2B", marginLeft: 4, letterSpacing: 1 }}>THE CROWD</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", flexWrap: "wrap", marginTop: 4, paddingHorizontal: 8 }}>
            {pawn && <PawnShopper pawn={pawn} />}
            {shoppers.map((p, i) => (
              <StandingFigure key={p.id} person={p} delay={i * 170} icon={i % 2 === 0 ? "shopping-basket" : "shopping-bag"} iconColor={BRONZE} />
            ))}
            {shoppers.length === 0 && !pawn && (
              <Text style={{ color: "#6B4A2B", fontSize: 12, fontStyle: "italic" }}>The plaza is quiet today.</Text>
            )}
          </View>
          {/* cobblestone strip */}
          <View style={{ height: 24, backgroundColor: STONE, marginTop: 8 }}>
            <View style={{ height: 3, backgroundColor: "#B3A88F" }} />
            <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 5 }}>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <View key={i} style={{ width: 22, height: 8, borderRadius: 4, backgroundColor: "#D8CDB6" }} />
              ))}
            </View>
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Browse the Stalls"}
          onPrimary={handleBrowse}
          primaryColor={BRONZE}
          level={level}
          onUpgrade={() =>
            handleUpgrade(level >= 2 ? "Eight stalls, a tiered golden fountain, lanterns, and a flower cart." : "Four stalls around a plaza fountain.")
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Browse the stalls once an hour for fresh coins and XP.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Opening the market…</Text>}
      </ScrollView>
    </View>
  );
}
