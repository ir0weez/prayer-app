// Flower Market interior: stalls of fresh blooms, the city's corner of color.
// Villagers browse the stalls with armfuls of flowers, pass under hanging
// baskets, and wheel the flower cart between the rows. The pawn gathers a
// bouquet alongside them.
// "Gather a Bouquet" grants coins + XP on a 1-hour cooldown.
// L1: two stalls with striped awnings and buckets of colorful flowers.
// L2: more stalls, hanging baskets, and a flower cart.
// L3: festival market — bunting overhead, a fountain planter centerpiece,
// and a flower arch at the gate.
// No emojis — SVG art and MaterialIcons only. Gentle sine-ease motion.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Ellipse, Line, Path, Polygon, Rect, G } from "react-native-svg";
import {
  InteriorActions,
  InteriorBanner,
  InteriorHeader,
  useInteriorData,
} from "@/components/interior-shell";
import { GentleBob, SoftPulse, StandingFigure, FigureName, pickPeople } from "@/components/activity-figures";
import { PawnPreview } from "@/components/pawn-preview";
import { formatCooldown } from "@/lib/gathering-places";
import { scaledCoins, scaledXP } from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";

const BG = "#FDF6EC";
const WOOD = "#8A5A2B";
const WOOD_DARK = "#5E3D22";
const TEXT_DIM = "#B08D9A";
const ACCENT = "#C2437A";
const LEAF = "#3E8E41";
const GOLD = "#C9963C";

/** Bloom colors that cycle through every bucket and stall. */
const BLOOMS = ["#E11D48", "#F59E0B", "#EC4899", "#8B5CF6", "#F97316", "#EAB308"];

const BOUQUET_COINS: Record<number, number> = { 1: 7, 2: 14, 3: 26 };
const BOUQUET_XP: Record<number, number> = { 1: 5, 2: 10, 3: 20 };
const COOLDOWN_MS = 60 * 60 * 1000;
const BOUQUET_KEY = "prayercircle.interior.flower-market.bouquet.v1";

/** A single flower head on a stem. */
function Bloom({ x, y, color, r = 5 }: { x: number; y: number; color: string; r?: number }) {
  return (
    <G>
      {[0, 72, 144, 216, 288].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return <Circle key={deg} cx={x + Math.cos(rad) * r} cy={y + Math.sin(rad) * r} r={r * 0.72} fill={color} />;
      })}
      <Circle cx={x} cy={y} r={r * 0.55} fill="#FDE68A" />
    </G>
  );
}

/** A market stall: striped awning, counter, and buckets of blooms. */
function FlowerStall({ awning, seed = 0 }: { awning: string; seed?: number }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={108} height={112} viewBox="0 0 108 112">
        {/* posts */}
        <Line x1={12} y1={30} x2={12} y2={102} stroke={WOOD_DARK} strokeWidth={4} />
        <Line x1={96} y1={30} x2={96} y2={102} stroke={WOOD_DARK} strokeWidth={4} />
        {/* striped awning */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Rect key={i} x={4 + i * 17} y={8} width={17} height={22} fill={i % 2 ? "#FFFFFF" : awning} stroke="#D8CFC0" strokeWidth={0.8} />
        ))}
        <Path d="M4 30 q8 8 17 0 q8 8 17 0 q8 8 17 0 q8 8 17 0 q8 8 17 0 q8 8 15 0" stroke={awning} strokeWidth={3} fill="none" />
        {/* stems rising from the buckets */}
        {[0, 1, 2, 3].map((i) => (
          <Line key={i} x1={28 + i * 18} y1={78} x2={26 + i * 18} y2={54} stroke={LEAF} strokeWidth={2.5} />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <Bloom key={i} x={26 + i * 18} y={50} color={BLOOMS[(seed + i) % BLOOMS.length]} />
        ))}
        {/* counter */}
        <Rect x={8} y={78} width={92} height={10} rx={3} fill={WOOD} stroke={WOOD_DARK} strokeWidth={2} />
        {/* buckets */}
        {[0, 1, 2].map((i) => (
          <G key={i}>
            <Path d={`M${20 + i * 30} 88 L${44 + i * 30} 88 L${41 + i * 30} 106 L${23 + i * 30} 106 Z`} fill="#9FB3C8" stroke="#64748B" strokeWidth={1.8} />
          </G>
        ))}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Fresh blooms</Text>
    </View>
  );
}

/** A hanging basket of trailing flowers (L2+). */
function HangingBasket({ seed = 0 }: { seed?: number }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 10 }}>
      <Svg width={64} height={76} viewBox="0 0 64 76">
        <Line x1={32} y1={0} x2={14} y2={34} stroke={WOOD_DARK} strokeWidth={2} />
        <Line x1={32} y1={0} x2={50} y2={34} stroke={WOOD_DARK} strokeWidth={2} />
        <Line x1={32} y1={0} x2={32} y2={34} stroke={WOOD_DARK} strokeWidth={2} />
        {/* trailing vines */}
        <Path d="M16 40 q-4 12 2 20" stroke={LEAF} strokeWidth={2} fill="none" />
        <Path d="M48 40 q4 12 -2 20" stroke={LEAF} strokeWidth={2} fill="none" />
        {/* basket */}
        <Path d="M10 34 L54 34 L46 56 L18 56 Z" fill={WOOD} stroke={WOOD_DARK} strokeWidth={2} />
        <Bloom x={20} y={30} color={BLOOMS[seed % BLOOMS.length]} r={4.5} />
        <Bloom x={32} y={26} color={BLOOMS[(seed + 2) % BLOOMS.length]} r={4.5} />
        <Bloom x={44} y={30} color={BLOOMS[(seed + 4) % BLOOMS.length]} r={4.5} />
        <Bloom x={18} y={58} color={BLOOMS[(seed + 1) % BLOOMS.length]} r={3.5} />
        <Bloom x={46} y={58} color={BLOOMS[(seed + 3) % BLOOMS.length]} r={3.5} />
      </Svg>
    </View>
  );
}

/** A flower cart with big wheels (L2+). */
function FlowerCart() {
  return (
    <View style={{ alignItems: "center", marginTop: 6 }}>
      <Svg width={130} height={84} viewBox="0 0 130 84">
        {/* blooms piled on the bed */}
        {[0, 1, 2, 3, 4].map((i) => (
          <Bloom key={i} x={28 + i * 19} y={30} color={BLOOMS[(i * 2) % BLOOMS.length]} r={5.5} />
        ))}
        {[0, 1, 2].map((i) => (
          <Line key={i} x1={36 + i * 28} y1={36} x2={36 + i * 28} y2={48} stroke={LEAF} strokeWidth={2.5} />
        ))}
        {/* cart bed */}
        <Rect x={12} y={44} width={106} height={14} rx={4} fill={WOOD} stroke={WOOD_DARK} strokeWidth={2} />
        {/* handles */}
        <Line x1={118} y1={48} x2={128} y2={40} stroke={WOOD_DARK} strokeWidth={3} strokeLinecap="round" />
        {/* wheels */}
        <Circle cx={34} cy={68} r={11} fill="none" stroke={WOOD_DARK} strokeWidth={3.5} />
        <Circle cx={96} cy={68} r={11} fill="none" stroke={WOOD_DARK} strokeWidth={3.5} />
        <Circle cx={34} cy={68} r={2.5} fill={WOOD_DARK} />
        <Circle cx={96} cy={68} r={2.5} fill={WOOD_DARK} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>The flower cart</Text>
    </View>
  );
}

/** Festival bunting strung overhead (L3). */
function Bunting() {
  return (
    <View style={{ alignItems: "center", marginTop: 4 }}>
      <Svg width={280} height={36} viewBox="0 0 280 36">
        <Path d="M4 4 Q140 34 276 4" stroke={WOOD_DARK} strokeWidth={1.8} fill="none" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const x = 22 + i * 32;
          const y = 10 + Math.sin((i / 7) * Math.PI) * 9;
          return <Polygon key={i} points={`${x},${y} ${x + 16},${y + 1} ${x + 8},${y + 15}`} fill={BLOOMS[i % BLOOMS.length]} stroke="#FFFFFF" strokeWidth={0.8} />;
        })}
      </Svg>
    </View>
  );
}

/** A fountain planter centerpiece ringed with flowers (L3). */
function FountainPlanter() {
  return (
    <View style={{ alignItems: "center", marginTop: 8 }}>
      <SoftPulse duration={2600}>
        <Svg width={170} height={96} viewBox="0 0 170 96">
          {/* water arcs */}
          <Path d="M85 22 Q66 34 60 52" stroke="#7DD3FC" strokeWidth={2.5} fill="none" opacity={0.85} />
          <Path d="M85 22 Q104 34 110 52" stroke="#7DD3FC" strokeWidth={2.5} fill="none" opacity={0.85} />
          <Path d="M85 22 Q85 38 85 52" stroke="#7DD3FC" strokeWidth={2} fill="none" opacity={0.7} />
          {/* center spout */}
          <Rect x={80} y={18} width={10} height={26} rx={3} fill="#9FB3C8" stroke="#64748B" strokeWidth={1.8} />
          <Circle cx={85} cy={16} r={5} fill="#BAE6FD" stroke="#64748B" strokeWidth={1.5} />
          {/* basin */}
          <Ellipse cx={85} cy={58} rx={62} ry={13} fill="#BAE6FD" stroke="#64748B" strokeWidth={2} />
          <Ellipse cx={85} cy={55} rx={54} ry={9} fill="#7DD3FC" opacity={0.7} />
          <Rect x={30} y={58} width={110} height={14} fill="#D8CFC0" stroke="#A89E8C" strokeWidth={1.8} />
          {/* flowers ringing the basin */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Bloom key={i} x={34 + i * 20} y={82} color={BLOOMS[i % BLOOMS.length]} r={4.5} />
          ))}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Line key={i} x1={34 + i * 20} y1={86} x2={34 + i * 20} y2={92} stroke={LEAF} strokeWidth={2} />
          ))}
        </Svg>
      </SoftPulse>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Fountain planter</Text>
    </View>
  );
}

/** A flower arch marking the festival gate (L3). */
function FlowerArch() {
  return (
    <View style={{ alignItems: "center", marginTop: 6 }}>
      <Svg width={180} height={96} viewBox="0 0 180 96">
        <Path d="M22 94 L22 44 Q22 12 90 12 Q158 12 158 44 L158 94" stroke={LEAF} strokeWidth={5} fill="none" strokeLinecap="round" />
        <Path d="M22 94 L22 44 Q22 12 90 12 Q158 12 158 44 L158 94" stroke={WOOD_DARK} strokeWidth={1.5} fill="none" opacity={0.4} />
        {[
          [22, 60], [24, 34], [44, 18], [70, 13], [96, 13], [122, 16], [144, 26], [157, 48], [157, 72],
        ].map(([x, y], i) => (
          <Bloom key={i} x={x} y={y} color={BLOOMS[i % BLOOMS.length]} r={4.5} />
        ))}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>The flower arch</Text>
    </View>
  );
}

export default function FlowerMarketInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastBouquet, setLastBouquet] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(BOUQUET_KEY).catch(() => null);
      setLastBouquet(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastBouquet + COOLDOWN_MS - Date.now());
  const browsers = pickPeople(people, `flowermarket|${building?.id ?? "flower-market"}|browse`, 4);
  const florist = pickPeople(people, `flowermarket|${building?.id ?? "flower-market"}|florist`, 1)[0];

  const levelBlurb =
    level >= 3
      ? "A festival market — bunting overhead, a fountain planter, and a flower arch at the gate."
      : level >= 2
        ? "A bustling market — more stalls, hanging baskets, and the flower cart rolling through."
        : "A small market — two striped stalls and buckets of the day's freshest blooms.";

  const handleBouquet = async () => {
    if (remaining > 0) {
      Alert.alert("The stalls are picked over", `The growers are cutting the next harvest.\n\nGather a bouquet again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(BOUQUET_COINS[level] ?? 7);
    const xp = scaledXP(BOUQUET_XP[level] ?? 5);
    const t = Date.now();
    setLastBouquet(t);
    await AsyncStorage.setItem(BOUQUET_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `flowermarket-bouquet-${t}`).catch(() => undefined);
    Alert.alert("Bouquet Gathered", `Armful of color, wrapped in paper — someone in town is about to smile.\n\n+${c.toFixed(2)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="local-florist" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="storefront"
          iconColor={ACCENT}
          title="Flower Market"
          blurb={`Stalls of fresh blooms — the city's corner of color. ${levelBlurb}`}
          accent="#F6D3E0"
        />

        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#F6D3E0",
            overflow: "hidden",
            backgroundColor: level >= 3 ? "#FFF9EE" : "#FDF3E3",
          }}
        >
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="flower-market" />
          {level >= 3 && <Bunting />}
          {level >= 3 && <FlowerArch />}

          {level >= 2 && (
            <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 4 }}>
              <HangingBasket seed={1} />
              <HangingBasket seed={4} />
              {level >= 3 && <HangingBasket seed={2} />}
            </View>
          )}

          {/* stalls */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 6 }}>
            <FlowerStall awning={ACCENT} seed={0} />
            <FlowerStall awning="#3E8E41" seed={3} />
          </View>
          {level >= 2 && (
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 4 }}>
              <FlowerStall awning={GOLD} seed={2} />
              {level >= 3 && <FlowerStall awning="#7C3AED" seed={5} />}
            </View>
          )}

          {/* browsers with bouquets */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8, minHeight: 84 }}>
            {browsers[0] && (
              <GentleBob delay={150}>
                <StandingFigure person={browsers[0]} delay={150} icon="local-florist" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
            {pawn && (
              <GentleBob delay={400}>
                <View style={{ alignItems: "center", marginHorizontal: 8 }}>
                  <SoftPulse duration={1800}>
                    <MaterialIcons name="local-florist" size={15} color={ACCENT} style={{ marginBottom: 1 }} />
                  </SoftPulse>
                  <PawnPreview pawn={pawn} size={44} />
                  <FigureName name={pawn.name} color="#C2437A" />
                </View>
              </GentleBob>
            )}
            {browsers[1] && (
              <GentleBob delay={650}>
                <StandingFigure person={browsers[1]} delay={650} icon="shopping-basket" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
            {level >= 3 && browsers[2] && (
              <GentleBob delay={900}>
                <StandingFigure person={browsers[2]} delay={900} icon="local-florist" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
          </View>

          {level >= 3 && <FountainPlanter />}
          {level >= 2 && <FlowerCart />}
          {florist && (
            <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 4 }}>
              <StandingFigure person={florist} delay={500} icon="yard" iconColor={LEAF} showLabel />
            </View>
          )}

          {/* sun-warmed cobbles */}
          <View style={{ height: 26, backgroundColor: "#E8DCC4", marginTop: 10 }}>
            <View style={{ height: 3, backgroundColor: "#CBB894" }} />
            <View style={{ flexDirection: "row", marginTop: 6, marginHorizontal: 40 }}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: i % 2 ? "#DCCBA6" : "#E8DCC4", borderWidth: 0.5, borderColor: "#C4B28C" }} />
              ))}
            </View>
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Gather a Bouquet"}
          onPrimary={handleBouquet}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "A festival market — bunting, a fountain planter, and a flower arch." : "More stalls, hanging baskets, and a flower cart."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Gather a bouquet once an hour. Fresh flowers, honestly priced.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Opening the stalls…</Text>}
      </ScrollView>
    </View>
  );
}
