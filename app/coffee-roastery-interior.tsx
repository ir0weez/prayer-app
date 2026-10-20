// Coffee Roastery interior: copper, burlap, and the smell of fresh roast.
// Villagers sip at the tasting counter while the roaster turns, bean sacks
// lean by the wall, and the day's roast goes up on the chalkboard. The pawn
// tastes the roast alongside them.
// "Taste the Roast" grants coins + XP on a 1-hour cooldown.
// L1: a roaster machine with a chimney, bean sacks, a small tasting counter.
// L2: a bigger roaster, shelves of bean bags, a chalkboard menu.
// L3: grand roastery — a copper roaster centerpiece, a long communal table,
// string lights, and a pastries case.
// No emojis — SVG art and MaterialIcons only. Gentle sine-ease motion.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Ellipse, Line, Path, Rect, G } from "react-native-svg";
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

const BG = "#F6F0E8";
const WOOD = "#8A5A2B";
const WOOD_DARK = "#5E3D22";
const TEXT_DIM = "#A08B78";
const ACCENT = "#6F4E37";
const COPPER = "#B87333";
const COPPER_DARK = "#8A5225";
const BURLAP = "#C8A876";

const TASTING_COINS: Record<number, number> = { 1: 7, 2: 14, 3: 26 };
const TASTING_XP: Record<number, number> = { 1: 5, 2: 10, 3: 20 };
const COOLDOWN_MS = 60 * 60 * 1000;
const TASTING_KEY = "prayercircle.interior.coffee-roastery.tasting.v1";

/** The roaster: turning drum, hopper, chimney, and a warm firebox glow. */
function Roaster({ grand = false }: { grand?: boolean }) {
  const W = grand ? 150 : 118;
  const H = grand ? 140 : 118;
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* chimney */}
        <Rect x={W * 0.62} y={2} width={12} height={H * 0.3} fill="#6B7280" stroke="#4B5563" strokeWidth={2} />
        <Ellipse cx={W * 0.62 + 6} cy={4} rx={9} ry={3.5} fill="#4B5563" />
        {/* hopper cone */}
        <Path d={`M${W * 0.3} ${H * 0.3} L${W * 0.62} ${H * 0.3} L${W * 0.52} ${H * 0.44} L${W * 0.4} ${H * 0.44} Z`} fill={grand ? COPPER : "#9CA3AF"} stroke={grand ? COPPER_DARK : "#6B7280"} strokeWidth={2} />
        {/* drum */}
        <Rect x={W * 0.14} y={H * 0.44} width={W * 0.64} height={H * 0.3} rx={12} fill={grand ? COPPER : "#78716C"} stroke={grand ? COPPER_DARK : "#57534E"} strokeWidth={2.5} />
        <Circle cx={W * 0.46} cy={H * 0.59} r={H * 0.09} fill={grand ? "#8A5225" : "#57534E"} stroke="#3E2A18" strokeWidth={2} />
        <Circle cx={W * 0.46} cy={H * 0.59} r={H * 0.035} fill="#F5F0E6" />
        {/* cooling tray */}
        <Ellipse cx={W * 0.46} cy={H * 0.82} rx={W * 0.3} ry={H * 0.05} fill="#4B5563" stroke="#374151" strokeWidth={2} />
        {/* beans in the tray */}
        {[0.25, 0.4, 0.55, 0.68].map((fx, i) => (
          <Ellipse key={i} cx={W * fx} cy={H * 0.8} rx={4} ry={3} fill="#4A2E1B" transform={`rotate(${i * 40 - 40} ${W * fx} ${H * 0.8})`} />
        ))}
        {/* legs + firebox glow */}
        <Line x1={W * 0.22} y1={H * 0.86} x2={W * 0.22} y2={H * 0.97} stroke="#374151" strokeWidth={4} />
        <Line x1={W * 0.7} y1={H * 0.86} x2={W * 0.7} y2={H * 0.97} stroke="#374151" strokeWidth={4} />
        <Ellipse cx={W * 0.46} cy={H * 0.78} rx={W * 0.14} ry={H * 0.028} fill="#F97316" opacity={0.55} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>{grand ? "The copper roaster" : "The roaster"}</Text>
    </View>
  );
}

/** A burlap bean sack, open at the top with beans showing. */
function BeanSack({ label }: { label: string }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={58} height={72} viewBox="0 0 58 72">
        <Path d="M14 22 C10 40, 12 56, 16 66 L42 66 C46 56, 48 40, 44 22 Z" fill={BURLAP} stroke="#9A7D4E" strokeWidth={2} />
        {/* folded rim */}
        <Path d="M14 22 C20 16, 38 16, 44 22 C38 27, 20 27, 14 22 Z" fill="#A98F5F" stroke="#9A7D4E" strokeWidth={1.8} />
        {/* beans */}
        {[0, 1, 2, 3].map((i) => (
          <Ellipse key={i} cx={22 + i * 5} cy={21} rx={3.4} ry={2.4} fill="#4A2E1B" transform={`rotate(${i * 45 - 50} ${22 + i * 5} 21)`} />
        ))}
        {/* stitched label */}
        <Rect x={20} y={38} width={18} height={13} rx={2} fill="#F5F0E6" stroke="#9A7D4E" strokeWidth={1.2} strokeDasharray="3 2" />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

/** A tasting counter with cups and gentle steam. */
function TastingCounter({ wide = false }: { wide?: boolean }) {
  const W = wide ? 200 : 150;
  return (
    <View style={{ alignItems: "center", marginTop: 8 }}>
      <Svg width={W} height={64} viewBox={`0 0 ${W} 64`}>
        {/* steam curls */}
        {[0.22, 0.5, 0.78].map((fx, i) => (
          <Path key={i} d={`M${W * fx} 18 q4 -6 0 -12 q-4 -5 1 -10`} stroke="#C9BBA6" strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.9} />
        ))}
        {/* cups */}
        {[0.22, 0.5, 0.78].map((fx, i) => (
          <G key={i}>
            <Path d={`M${W * fx - 10} 22 L${W * fx + 10} 22 L${W * fx + 7} 36 L${W * fx - 7} 36 Z`} fill="#FFFFFF" stroke="#9CA3AF" strokeWidth={1.8} />
            <Path d={`M${W * fx + 10} 25 q7 3 0 8`} stroke="#9CA3AF" strokeWidth={1.8} fill="none" />
            <Rect x={W * fx - 8} y={24} width={16} height={4} fill={ACCENT} />
          </G>
        ))}
        {/* counter */}
        <Rect x={4} y={38} width={W - 8} height={10} rx={3} fill={WOOD} stroke={WOOD_DARK} strokeWidth={2} />
        <Rect x={12} y={48} width={W - 24} height={12} fill={WOOD_DARK} opacity={0.85} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Tasting counter</Text>
    </View>
  );
}

/** Shelves of bean bags (L2+). */
function BeanShelves() {
  return (
    <View style={{ alignItems: "center", marginTop: 8 }}>
      <Svg width={170} height={78} viewBox="0 0 170 78">
        {[10, 44].map((y, row) => (
          <G key={row}>
            <Rect x={8} y={y + 22} width={154} height={5} fill={WOOD} stroke={WOOD_DARK} strokeWidth={1.5} />
            {[0, 1, 2, 3].map((i) => (
              <G key={i}>
                <Rect x={18 + i * 38} y={y + 2} width={26} height={20} rx={3} fill={i % 2 ? BURLAP : "#A98F5F"} stroke="#7A6238" strokeWidth={1.5} />
                <Rect x={24 + i * 38} y={y + 8} width={14} height={8} rx={1.5} fill="#F5F0E6" />
                <Ellipse cx={31 + i * 38} cy={y + 12} rx={2.6} ry={1.9} fill="#4A2E1B" />
              </G>
            ))}
          </G>
        ))}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Beans by origin</Text>
    </View>
  );
}

/** A chalkboard menu (L2+). */
function Chalkboard() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={86} height={96} viewBox="0 0 86 96">
        <Rect x={4} y={4} width={78} height={72} rx={4} fill="#26332B" stroke={WOOD_DARK} strokeWidth={3} />
        {/* chalk writing */}
        <Line x1={16} y1={20} x2={62} y2={20} stroke="#F8FAFC" strokeWidth={2.5} strokeLinecap="round" opacity={0.9} />
        <Line x1={16} y1={34} x2={70} y2={34} stroke="#E5E7EB" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
        <Line x1={16} y1={46} x2={56} y2={46} stroke="#E5E7EB" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
        <Line x1={16} y1={58} x2={66} y2={58} stroke="#E5E7EB" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
        {/* chalk cup doodle */}
        <Path d="M62 52 L74 52 L72 64 L64 64 Z" fill="none" stroke="#FDE68A" strokeWidth={1.8} />
        {/* easel legs */}
        <Line x1={22} y1={76} x2={14} y2={94} stroke={WOOD_DARK} strokeWidth={3.5} strokeLinecap="round" />
        <Line x1={64} y1={76} x2={72} y2={94} stroke={WOOD_DARK} strokeWidth={3.5} strokeLinecap="round" />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Today's roast</Text>
    </View>
  );
}

/** String lights strung across the grand roastery (L3). */
function StringLights() {
  return (
    <View style={{ alignItems: "center", marginTop: 4 }}>
      <SoftPulse duration={2400}>
        <Svg width={280} height={40} viewBox="0 0 280 40">
          <Path d="M4 4 Q140 36 276 4" stroke={WOOD_DARK} strokeWidth={1.8} fill="none" />
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
            const x = 18 + i * 30;
            const y = 9 + Math.sin((i / 8) * Math.PI) * 11;
            return (
              <G key={i}>
                <Line x1={x} y1={y} x2={x} y2={y + 5} stroke={WOOD_DARK} strokeWidth={1.5} />
                <Circle cx={x} cy={y + 10} r={4.5} fill="#FFE9A8" stroke="#C9963C" strokeWidth={1.2} />
              </G>
            );
          })}
          <Ellipse cx={140} cy={18} rx={130} ry={16} fill="#FFE9A8" opacity={0.16} />
        </Svg>
      </SoftPulse>
    </View>
  );
}

/** A long communal table with benches and cups (L3). */
function CommunalTable() {
  return (
    <View style={{ alignItems: "center", marginTop: 8 }}>
      <Svg width={250} height={62} viewBox="0 0 250 62">
        {/* cups along the table */}
        {[0.14, 0.34, 0.54, 0.74, 0.9].map((fx, i) => (
          <G key={i}>
            <Path d={`M${250 * fx - 7} 14 L${250 * fx + 7} 14 L${250 * fx + 5} 24 L${250 * fx - 5} 24 Z`} fill="#FFFFFF" stroke="#9CA3AF" strokeWidth={1.5} />
            <Path d={`M${250 * fx} 10 q3 -4 0 -7`} stroke="#C9BBA6" strokeWidth={1.6} fill="none" strokeLinecap="round" />
          </G>
        ))}
        {/* tabletop + legs */}
        <Rect x={8} y={24} width={234} height={9} rx={3} fill={WOOD} stroke={WOOD_DARK} strokeWidth={2} />
        <Rect x={26} y={33} width={7} height={20} fill={WOOD_DARK} />
        <Rect x={217} y={33} width={7} height={20} fill={WOOD_DARK} />
        {/* benches */}
        <Rect x={30} y={44} width={190} height={6} rx={3} fill={WOOD} stroke={WOOD_DARK} strokeWidth={1.5} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>The long table</Text>
    </View>
  );
}

/** A glass pastries case (L3). */
function PastriesCase() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={96} height={70} viewBox="0 0 96 70">
        {/* glass dome case */}
        <Rect x={8} y={14} width={80} height={34} rx={6} fill="#D9EDF5" opacity={0.45} stroke="#9FB3C8" strokeWidth={2} />
        <Line x1={18} y1={20} x2={30} y2={42} stroke="#FFFFFF" strokeWidth={3} opacity={0.5} strokeLinecap="round" />
        {/* pastries */}
        <Ellipse cx={28} cy={40} rx={9} ry={6} fill="#D97706" stroke="#92400E" strokeWidth={1.5} />
        <Path d="M22 38 q6 -6 12 0" stroke="#92400E" strokeWidth={1.5} fill="none" />
        <Ellipse cx={50} cy={40} rx={9} ry={6} fill="#B45309" stroke="#7A3606" strokeWidth={1.5} />
        <Circle cx={70} cy={38} r={7} fill="#F59E0B" stroke="#92400E" strokeWidth={1.5} />
        <Circle cx={70} cy={38} r={2.5} fill="#7A3606" />
        {/* base */}
        <Rect x={4} y={48} width={88} height={10} rx={3} fill={WOOD} stroke={WOOD_DARK} strokeWidth={2} />
        <Rect x={12} y={58} width={72} height={7} fill={WOOD_DARK} opacity={0.85} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Pastries</Text>
    </View>
  );
}

export default function CoffeeRoasteryInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastTasting, setLastTasting] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(TASTING_KEY).catch(() => null);
      setLastTasting(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastTasting + COOLDOWN_MS - Date.now());
  const sippers = pickPeople(people, `coffeeroastery|${building?.id ?? "coffee-roastery"}|sip`, 4);
  const roasterHand = pickPeople(people, `coffeeroastery|${building?.id ?? "coffee-roastery"}|roast`, 1)[0];

  const levelBlurb =
    level >= 3
      ? "A grand roastery — the copper roaster at its heart, a long communal table, string lights, and warm pastries."
      : level >= 2
        ? "A growing roastery — a bigger roaster, shelves of beans, and the chalkboard menu."
        : "A humble roastery — one roaster, leaning bean sacks, and a small tasting counter.";

  const handleTasting = async () => {
    if (remaining > 0) {
      Alert.alert("The next batch is roasting", `First crack takes a little while.\n\nTaste the roast again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(TASTING_COINS[level] ?? 7);
    const xp = scaledXP(TASTING_XP[level] ?? 5);
    const t = Date.now();
    setLastTasting(t);
    await AsyncStorage.setItem(TASTING_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `coffeeroastery-tasting-${t}`).catch(() => undefined);
    Alert.alert("Roast Tasted", `Dark, warm, a little sweet at the finish — the roaster nods, pleased.\n\n+${c.toFixed(2)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="coffee" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="local-cafe"
          iconColor={ACCENT}
          title="Coffee Roastery"
          blurb={`The roaster hums and the tasting counter is warm. ${levelBlurb}`}
          accent="#E7D8C8"
        />

        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#E7D8C8",
            overflow: "hidden",
            backgroundColor: level >= 3 ? "#FBF5EB" : "#F8F1E6",
          }}
        >
          {level >= 3 && <StringLights />}
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="coffee-roastery" />

          {/* roaster + sacks */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8 }}>
            <BeanSack label="Green beans" />
            <Roaster grand={level >= 3} />
            <BeanSack label="House blend" />
          </View>

          {level >= 2 && (
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 4 }}>
              <BeanShelves />
              <Chalkboard />
            </View>
          )}

          {/* sippers at the counter */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8, minHeight: 84 }}>
            {sippers[0] && (
              <GentleBob delay={150}>
                <StandingFigure person={sippers[0]} delay={150} icon="coffee" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
            {pawn && (
              <GentleBob delay={400}>
                <View style={{ alignItems: "center", marginHorizontal: 8 }}>
                  <SoftPulse duration={1800}>
                    <MaterialIcons name="coffee" size={15} color={ACCENT} style={{ marginBottom: 1 }} />
                  </SoftPulse>
                  <PawnPreview pawn={pawn} size={44} />
                  <FigureName name={pawn.name} color="#6F4E37" />
                </View>
              </GentleBob>
            )}
            {sippers[1] && (
              <GentleBob delay={650}>
                <StandingFigure person={sippers[1]} delay={650} icon="coffee" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
            {level >= 3 && sippers[2] && (
              <GentleBob delay={900}>
                <StandingFigure person={sippers[2]} delay={900} icon="bakery-dining" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
          </View>

          <TastingCounter wide={level >= 2} />
          {level >= 3 && <CommunalTable />}
          {level >= 3 && (
            <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 4 }}>
              <PastriesCase />
            </View>
          )}
          {roasterHand && (
            <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 4 }}>
              <StandingFigure person={roasterHand} delay={500} icon="whatshot" iconColor={COPPER} showLabel />
            </View>
          )}

          {/* warm wood floor */}
          <View style={{ height: 26, backgroundColor: WOOD, marginTop: 10 }}>
            <View style={{ height: 3, backgroundColor: WOOD_DARK }} />
            <View style={{ flexDirection: "row", marginTop: 6, marginHorizontal: 24 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <View key={i} style={{ flex: 1, height: 8, backgroundColor: i % 2 ? "#7A5230" : WOOD, borderWidth: 0.5, borderColor: WOOD_DARK }} />
              ))}
            </View>
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Taste the Roast"}
          onPrimary={handleTasting}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "A grand roastery — copper roaster, long communal table, and string lights." : "A bigger roaster, shelves of bean bags, and a chalkboard menu."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Taste the roast once an hour. Good coffee takes its time.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Firing up the roaster…</Text>}
      </ScrollView>
    </View>
  );
}
