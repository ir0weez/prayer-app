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

/** Entrance arch — grander stone + gold for the City Market Hall. */
function EntranceArch({ grand }: { grand: boolean }) {
  const pillar = grand ? "#9AA5B1" : WOOD;
  const cap = grand ? "#D9A441" : WOOD_DARK;
  const W = grand ? 250 : 210;
  const H = grand ? 104 : 88;
  return (
    <View style={{ alignItems: "center", marginTop: 10 }}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* pillars */}
        <Rect x={10} y={26} width={grand ? 20 : 16} height={H - 26} fill={pillar} />
        <Rect x={W - (grand ? 30 : 26)} y={26} width={grand ? 20 : 16} height={H - 26} fill={pillar} />
        {/* caps */}
        <Rect x={6} y={16} width={grand ? 28 : 24} height={11} rx={3} fill={cap} />
        <Rect x={W - (grand ? 34 : 30)} y={16} width={grand ? 28 : 24} height={11} rx={3} fill={cap} />
        {/* arch beam */}
        <Path d={`M20 30 Q ${W / 2} ${grand ? -4 : 4} ${W - 20} 30`} stroke={grand ? "#B98A2F" : "#A9713F"} strokeWidth={grand ? 13 : 10} fill="none" />
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

/** One market stall with a striped awning and produce baskets. */
function Stall({ colors, produce }: { colors: { a: string; b: string }; produce: string[] }) {
  return (
    <View style={{ width: 152, alignItems: "center", margin: 6 }}>
      {/* striped awning */}
      <View style={{ flexDirection: "row", width: 152, height: 26, borderTopLeftRadius: 6, borderTopRightRadius: 6, overflow: "hidden", borderWidth: 2, borderColor: WOOD_DARK, borderBottomWidth: 0 }}>
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

/** A gently sparkling plaza fountain (L2+). */
function Fountain() {
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
  const stallCount = level >= 3 ? 6 : level >= 2 ? 4 : 2;

  const levelBlurb =
    level >= 3
      ? "A grand bazaar — six stalls, a sparkling fountain, banners, and lights."
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
      <InteriorHeader icon="storefront" iconColor={BRONZE} title={buildingName} coins={coins} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner icon="shopping-basket" iconColor={BRONZE} title={buildingName} blurb={levelBlurb} accent="#D9C4A5" />

        {/* market plaza scene */}
        <View style={{ marginHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: "#D9C4A5", overflow: "hidden", backgroundColor: PLAZA }}>
          <EntranceArch grand={isCityMarket} />
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
            </View>
          )}
          {/* stalls */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: 8, paddingHorizontal: 4 }}>
            {Array.from({ length: stallCount }).map((_, i) => (
              <Stall key={i} colors={STALL_COLORS[i % STALL_COLORS.length]} produce={PRODUCE_SETS[i % PRODUCE_SETS.length]} />
            ))}
          </View>
          {/* fountain */}
          {level >= 2 && <Fountain />}
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
            handleUpgrade(level >= 2 ? "Six stalls, banners, and string lights." : "Four stalls around a plaza fountain.")
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
