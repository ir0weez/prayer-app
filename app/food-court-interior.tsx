// Food court interior: food stalls with different cuisines and shared
// tables. Villagers line up at the stalls and sit down to eat together;
// the pawn shares a meal at a table. "Share a Meal" costs 3 coins, grants
// 12 XP, on a 1-hour cooldown.
// L1: 2 stalls, few tables. L2: 3 stalls, more tables, plants.
// L3: a gourmet food hall — six cuisines with a kitchen crew, a glass dessert
// case, a grand centerpiece planter, glowing pendant lights, string lights,
// a fountain drink station, and warm checker floors with gold trim.
// No emojis — SVG art and MaterialIcons only. Gentle sine-ease motion.

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Ellipse, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import {
  InteriorActions,
  InteriorBanner,
  InteriorHeader,
  useInteriorData,
} from "@/components/interior-shell";
import { FigureName, GentleBob, SeatedFigure, SoftPulse, StandingFigure, pickPeople } from "@/components/activity-figures";
import { PawnPreview } from "@/components/pawn-preview";
import { formatCooldown } from "@/lib/gathering-places";
import { scaledXP } from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";

const BG = "#FBF6EC";
const TEXT = "#3A2E1E";
const TEXT_DIM = "#96805F";
const ACCENT = "#D35400";
const ACCENT_DARK = "#A04000";
const TEAL = "#0E7C86";

const MEAL_COST = 3;
const MEAL_XP = 12;
const COOLDOWN_MS = 60 * 60 * 1000;
const MEAL_KEY = "prayercircle.interior.foodcourt.meal.v1";

type Stall = { name: string; icon: string; color: string; dark: string };

const STALLS: Stall[] = [
  { name: "Tacos", icon: "fastfood", color: "#D35400", dark: "#A04000" },
  { name: "Noodles", icon: "ramen-dining", color: "#0E7C86", dark: "#0A5A62" },
  { name: "Pizza", icon: "local-pizza", color: "#C0392B", dark: "#922B21" },
  { name: "Sweets", icon: "icecream", color: "#8E44AD", dark: "#6C3483" },
  { name: "Sushi", icon: "rice-bowl", color: "#0E7490", dark: "#0A4A5A" },
  { name: "BBQ", icon: "kebab-dining", color: "#92400E", dark: "#6B2D08" },
];

/** A food stall with an awning, menu board, and counter. */
function FoodStall({ stall }: { stall: Stall }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 5 }}>
      {/* awning */}
      <Svg width={104} height={28} viewBox="0 0 104 28">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Rect key={i} x={i * 17.5} y={0} width={17.5} height={28} rx={3} fill={i % 2 === 0 ? stall.color : "#FFFFFF"} stroke={stall.dark} strokeWidth={1} />
        ))}
      </Svg>
      <View
        style={{
          width: 108,
          backgroundColor: "#FFFDF7",
          borderWidth: 2,
          borderColor: stall.dark,
          borderTopWidth: 0,
          borderBottomLeftRadius: 8,
          borderBottomRightRadius: 8,
          paddingVertical: 6,
          alignItems: "center",
        }}
      >
        <MaterialIcons name={stall.icon as any} size={20} color={stall.color} />
        <Text style={{ fontSize: 10, fontWeight: "800", color: TEXT, marginTop: 2 }}>{stall.name}</Text>
        {/* menu board */}
        <View style={{ width: 84, backgroundColor: "#1F2937", borderRadius: 4, paddingVertical: 3, marginTop: 4, alignItems: "center" }}>
          <View style={{ width: 60, height: 3, backgroundColor: "#D1D5DB", borderRadius: 1.5, marginBottom: 2 }} />
          <View style={{ width: 48, height: 3, backgroundColor: "#9CA3AF", borderRadius: 1.5 }} />
        </View>
        {/* counter shelf */}
        <View style={{ width: 92, height: 5, backgroundColor: stall.dark, borderRadius: 2, marginTop: 5 }} />
      </View>
    </View>
  );
}

/** String lights strung across the court — L3 only. */
function StringLights() {
  return (
    <Svg width={330} height={40} viewBox="0 0 330 40">
      <Line x1={0} y1={2} x2={110} y2={26} stroke="#6B4A2F" strokeWidth={2.5} />
      <Line x1={110} y1={26} x2={220} y2={26} stroke="#6B4A2F" strokeWidth={2.5} />
      <Line x1={220} y1={26} x2={330} y2={2} stroke="#6B4A2F" strokeWidth={2.5} />
      {[28, 55, 82, 137, 165, 192, 247, 275, 302].map((cx, i) => {
        const cy = i < 3 ? 12 + i * 4.6 : i < 6 ? 26 : 26 - (i - 6) * 7.5;
        return (
          <g key={cx}>
            <Line x1={cx} y1={cy - 6} x2={cx} y2={cy} stroke="#6B4A2F" strokeWidth={1.5} />
            <Circle cx={cx} cy={cy + 4} r={4.5} fill="#FFE9A8" stroke="#C9963C" strokeWidth={1} />
          </g>
        );
      })}
    </Svg>
  );
}

/** Fountain drink station — L3 only. */
function DrinkStation() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={70} height={84} viewBox="0 0 70 84">
        <Rect x={6} y={40} width={58} height={36} rx={6} fill={TEAL} stroke={ACCENT_DARK} strokeWidth={2} />
        <Rect x={6} y={40} width={58} height={10} rx={5} fill="#12A3AF" />
        {/* taps */}
        {[20, 35, 50].map((cx) => (
          <g key={cx}>
            <Rect x={cx - 4} y={50} width={8} height={12} rx={3} fill="#0A5A62" />
            <Circle cx={cx} cy={66} r={3.5} fill="#BEE3F8" />
          </g>
        ))}
        <Rect x={10} y={18} width={50} height={22} rx={6} fill="#EAF6F7" stroke={ACCENT_DARK} strokeWidth={2} />
        <SvgText x={35} y={33} fontSize={10} fontWeight="800" fill={TEAL} textAnchor="middle">DRINKS</SvgText>
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Drinks</Text>
    </View>
  );
}

/** A shared table: villagers seated behind a tabletop, plates in front. */
function DiningTable({
  diners,
  tableColor = "#B0724A",
}: {
  diners: ReactNode[];
  tableColor?: string;
}) {
  if (diners.length === 0) return null;
  return (
    <View style={{ alignItems: "center", marginHorizontal: 10, marginBottom: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>{diners}</View>
      {/* tabletop in front of the diners */}
      <View style={{ marginTop: -18, alignItems: "center" }}>
        <View style={{ width: 30 + diners.length * 44, height: 12, borderRadius: 6, backgroundColor: tableColor, borderWidth: 1.5, borderColor: "#7A5230" }} />
        {/* plates */}
        <View style={{ flexDirection: "row", marginTop: -9 }}>
          {diners.map((_, i) => (
            <View key={i} style={{ marginHorizontal: 14 }}>
              <View style={{ width: 20, height: 8, borderRadius: 10, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D6CFC0", alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: 9, height: 5, borderRadius: 4, backgroundColor: ACCENT, opacity: 0.85 }} />
              </View>
            </View>
          ))}
        </View>
        <View style={{ width: 10, height: 16, backgroundColor: "#7A5230", borderRadius: 2, marginTop: 2 }} />
      </View>
    </View>
  );
}

/** Potted plant. */
function Plant() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#5B8A5E" }} />
      <View style={{ width: 22, height: 24, borderRadius: 14, backgroundColor: "#6FA372", marginTop: -16 }} />
      <View style={{ width: 24, height: 18, borderRadius: 4, backgroundColor: "#B0724A", marginTop: -4 }} />
    </View>
  );
}

/** A chef from the kitchen crew — L3 only. */
function StallChef({ color, delay = 0 }: { color: string; delay?: number }) {
  return (
    <View style={{ alignItems: "center" }}>
      <GentleBob delay={delay} amount={1.5}>
        <Svg width={42} height={66} viewBox="0 0 42 66">
          {/* chef hat */}
          <Circle cx={21} cy={11} r={9} fill="#FFFFFF" stroke="#CBD5E1" strokeWidth={1.5} />
          <Rect x={13} y={17} width={16} height={5} fill="#FFFFFF" stroke="#CBD5E1" strokeWidth={1.5} />
          {/* head */}
          <Circle cx={21} cy={28} r={7} fill="#F5C99B" />
          {/* body + apron */}
          <Rect x={12} y={35} width={18} height={24} rx={6} fill={color} />
          <Rect x={16} y={35} width={10} height={24} fill="#FFFFFF" opacity={0.85} />
          {/* arms */}
          <Rect x={6} y={38} width={6} height={14} rx={3} fill={color} />
          <Rect x={30} y={38} width={6} height={14} rx={3} fill={color} />
        </Svg>
      </GentleBob>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Chef</Text>
    </View>
  );
}

/** Warm pendant lights over the dining hall — L3 only. */
function PendantLight({ delay = 0 }: { delay?: number }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 14 }}>
      <View style={{ width: 3, height: 22, backgroundColor: "#6B4A2F" }} />
      <SoftPulse duration={2100 + delay}>
        <Svg width={40} height={24} viewBox="0 0 40 24">
          <Path d="M20 2 L34 18 L6 18 Z" fill={ACCENT} />
          <Ellipse cx={20} cy={20} rx={11} ry={3.5} fill="#FFE9A8" opacity={0.9} />
        </Svg>
      </SoftPulse>
    </View>
  );
}

/** A glass dessert display case — L3 only. */
function DessertCase() {
  return (
    <View style={{ alignItems: "center" }}>
      <SoftPulse duration={1800}>
        <Svg width={122} height={64} viewBox="0 0 122 64">
          <Rect x={2} y={32} width={118} height={30} rx={5} fill="#6B2D08" />
          <Rect x={6} y={4} width={110} height={32} rx={5} fill="#FFF7E0" opacity={0.4} stroke={ACCENT} strokeWidth={2} />
          <Rect x={10} y={20} width={102} height={3} fill={ACCENT} opacity={0.6} />
          {/* treats */}
          <Circle cx={30} cy={29} r={7} fill="#F472B6" />
          <Rect x={50} y={22} width={14} height={10} rx={2} fill="#FBBF24" />
          <Circle cx={84} cy={29} r={7} fill="#8E44AD" />
          <Rect x={22} y={42} width={78} height={12} rx={3} fill="#F5D6B8" />
        </Svg>
      </SoftPulse>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Dessert case</Text>
    </View>
  );
}

/** A grand centerpiece planter — L3 only. */
function CenterpiecePlanter() {
  return (
    <View style={{ alignItems: "center" }}>
      <GentleBob amount={1.5}>
        <Svg width={56} height={72} viewBox="0 0 56 72">
          <Path d="M28 52 C28 38 28 30 28 20" stroke="#5B8A5E" strokeWidth={4} fill="none" />
          <Path d="M28 26 C18 20 11 20 5 26 C13 30 21 32 28 32" fill="#6FA372" />
          <Path d="M28 26 C38 20 45 20 51 26 C43 30 35 32 28 32" fill="#5B8A5E" />
          <Circle cx={28} cy={16} r={6} fill="#E07A5F" />
          <Circle cx={21} cy={22} r={4} fill="#E0A63F" />
          <Circle cx={35} cy={22} r={4} fill="#C9758A" />
        </Svg>
      </GentleBob>
      <View style={{ width: 32, height: 18, borderRadius: 4, backgroundColor: ACCENT_DARK, marginTop: -4 }} />
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Centerpiece</Text>
    </View>
  );
}

export default function FoodCourtInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastMeal, setLastMeal] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(MEAL_KEY).catch(() => null);
      setLastMeal(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastMeal + COOLDOWN_MS - Date.now());
  const stalls = STALLS.slice(0, level >= 3 ? 6 : level >= 2 ? 3 : 2);
  const diners = pickPeople(people, `food|${building?.id ?? "food"}|dine`, level >= 3 ? 8 : 6);
  const inLine = pickPeople(people, `food|${building?.id ?? "food"}|line`, level >= 3 ? 3 : 2);

  const tableA = diners.slice(0, level >= 3 ? 4 : level >= 2 ? 3 : 2);
  const tableB = level >= 3 ? diners.slice(4, 8) : [];

  const levelBlurb =
    level >= 3
      ? "A gourmet food hall — six cuisines, a kitchen crew, a dessert case, glowing pendants, and drinks all around."
      : level >= 2
        ? "A bustling court — three stalls, plenty of tables, and plants."
        : "A simple court — two stalls and a couple of shared tables.";

  const handleMeal = async () => {
    if (remaining > 0) {
      Alert.alert("Still full", `Everyone's enjoying their meal.\n\nCome back in about ${formatCooldown(remaining)}.`);
      return;
    }
    if (coins.balance < MEAL_COST) {
      Alert.alert("Not enough coins", `A shared meal costs ${MEAL_COST.toFixed(2)} coins. You have ${coins.balance.toFixed(2)}.`);
      return;
    }
    const xp = scaledXP(MEAL_XP);
    const t = Date.now();
    setLastMeal(t);
    await AsyncStorage.setItem(MEAL_KEY, String(t)).catch(() => undefined);
    addCoins(-MEAL_COST);
    awardCustomXP(xp, `food-meal-${t}`).catch(() => undefined);
    Alert.alert("Shared Meal", `You buy a round of food and eat together with the villagers.\n\n-${MEAL_COST.toFixed(2)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="fastfood" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="restaurant"
          iconColor={ACCENT}
          title="Food Court"
          blurb={`Hungry shoppers gather here. ${levelBlurb}`}
          accent="#F5D6B8"
        />

        {/* food court scene */}
        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#F5D6B8",
            overflow: "hidden",
            backgroundColor: level >= 3 ? "#FFFDF6" : "#FDF6E9",
          }}
        >
          {level >= 3 && (
            <View style={{ alignItems: "center", marginTop: 4 }}>
              <StringLights />
            </View>
          )}

          {/* glowing pendant lights over the hall at L3 */}
          {level >= 3 && (
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-start", marginTop: 2 }}>
              <PendantLight />
              <PendantLight delay={450} />
              <PendantLight delay={900} />
            </View>
          )}

          {/* kitchen crew at L3 */}
          {level >= 3 && (
            <View style={{ flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end", paddingHorizontal: 44, marginTop: 8 }}>
              <StallChef color={STALLS[0].color} />
              <StallChef color={STALLS[2].color} delay={300} />
              <StallChef color={STALLS[5].color} delay={600} />
            </View>
          )}

          {/* stalls */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-start", flexWrap: "wrap", marginTop: 6 }}>
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="food-court" />
            {stalls.map((s) => (
              <FoodStall key={s.name} stall={s} />
            ))}
          </View>

          {/* lines at the stalls */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8, minHeight: 74 }}>
            {inLine[0] && (
              <GentleBob delay={200}>
                <StandingFigure person={inLine[0]} delay={200} icon="fastfood" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
            {inLine[1] && (
              <GentleBob delay={450}>
                <StandingFigure person={inLine[1]} delay={450} icon="ramen-dining" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
            {level >= 3 && inLine[2] && (
              <GentleBob delay={700}>
                <StandingFigure person={inLine[2]} delay={700} icon="local-pizza" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
            {level >= 2 && <Plant />}
          </View>

          {/* dining tables */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 6, flexWrap: "wrap" }}>
            <DiningTable
              diners={tableA.map((p, i) => (
                <GentleBob key={p.id} delay={i * 250}>
                  <SeatedFigure person={p} delay={i * 250} chairColor="#8B5E34" chairBorder="#5E3D22" />
                </GentleBob>
              ))}
            />
            {tableB.length > 0 && (
              <DiningTable
                tableColor="#9A6238"
                diners={tableB.map((p, i) => (
                  <GentleBob key={p.id} delay={i * 250 + 400}>
                    <SeatedFigure person={p} delay={i * 250 + 400} chairColor="#7A5230" chairBorder="#4E3418" />
                  </GentleBob>
                ))}
              />
            )}
          </View>

          {/* L3: dessert case + centerpiece between the tables and the pawn */}
          {level >= 3 && (
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8, paddingHorizontal: 12 }}>
              <DessertCase />
              <View style={{ width: 18 }} />
              <CenterpiecePlanter />
            </View>
          )}

          {/* the pawn shares a meal */}
          {pawn && (
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 6 }}>
              <GentleBob delay={600}>
                <View style={{ alignItems: "center" }}>
                  <SoftPulse duration={2000}>
                    <MaterialIcons name="restaurant" size={15} color={ACCENT} style={{ marginBottom: 1 }} />
                  </SoftPulse>
                  <PawnPreview pawn={pawn} size={46} />
                  <FigureName name={pawn.name} color="#D35400" />
                </View>
              </GentleBob>
              {level >= 3 && <DrinkStation />}
            </View>
          )}

          {/* floor: plain wood at L1, tile at L2, warm checker at L3 */}
          <View style={{ marginTop: 8 }}>
            <View style={{ height: 26, backgroundColor: level >= 3 ? "#F0DFC0" : level >= 2 ? "#E2D2B4" : "#CBAF82", flexDirection: "row" }}>
              {level >= 3 &&
                Array.from({ length: 12 }).map((_, i) => (
                  <View key={i} style={{ flex: 1, height: 26, backgroundColor: i % 2 === 0 ? "#F0DFC0" : "#E0C89E" }} />
                ))}
            </View>
            <View style={{ height: 3, backgroundColor: level >= 3 ? "#C9963C" : "#C0A67E" }} />
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Share a Meal (3 coins)"}
          onPrimary={handleMeal}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "Six cuisines, a kitchen crew, a dessert case, glowing pendants, and warm checker floors." : "Three stalls, more tables, and greenery."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Sharing a meal costs 3 coins and grants 12 XP, once an hour.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Setting the tables…</Text>}
      </ScrollView>
    </View>
  );
}
