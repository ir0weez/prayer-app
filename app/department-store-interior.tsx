// Department store interior: a grand multi-department store with an
// escalator, department signs, and shoppers. Villagers shop in departments
// and ride the escalator; the pawn greets by the directory.
// "Greet Shoppers" grants coins + XP on a 1-hour cooldown.
// L1: 2 departments, plain. L2: 3 departments, directory sign, plants.
// L3: a true luxury emporium — six departments, a jewelry salon with a glowing
// display case, velvet ropes, marble columns, a grand chandelier, banners,
// and marble underfoot.
// No emojis — SVG art and MaterialIcons only. Gentle sine-ease motion.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from "react-native-svg";
import {
  InteriorActions,
  InteriorBanner,
  InteriorHeader,
  useInteriorData,
} from "@/components/interior-shell";
import { FigureName, GentleBob, SoftPulse, StandingFigure, pickPeople } from "@/components/activity-figures";
import { PawnPreview } from "@/components/pawn-preview";
import { formatCooldown } from "@/lib/gathering-places";
import { scaledCoins, scaledXP } from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";

const BG = "#F4F1EA";
const TEXT = "#2C2A33";
const TEXT_DIM = "#8A8794";
const ACCENT = "#7C3AED";
const ACCENT_DARK = "#5B21B6";
const GOLD = "#C9963C";

const GREET_COINS: Record<number, number> = { 1: 60, 2: 120, 3: 220 };
const GREET_XP: Record<number, number> = { 1: 6, 2: 12, 3: 20 };
const COOLDOWN_MS = 60 * 60 * 1000;
const GREET_KEY = "prayercircle.interior.deptstore.greet.v1";

type Dept = { name: string; icon: string; color: string };

const DEPTS: Dept[] = [
  { name: "Clothing", icon: "checkroom", color: "#7C3AED" },
  { name: "Home", icon: "home", color: "#0E7C86" },
  { name: "Toys", icon: "toys", color: "#D96C47" },
  { name: "Electronics", icon: "tv", color: "#2563EB" },
  { name: "Jewelry", icon: "diamond", color: "#C9963C" },
  { name: "Cosmetics", icon: "spa", color: "#EC4899" },
];

/** Escalator with steps; shoppers ride on it. */
function Escalator({ level }: { level: number }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={110} height={120} viewBox="0 0 110 120">
        {/* railings */}
        <Line x1={14} y1={112} x2={84} y2={16} stroke={level >= 3 ? GOLD : "#9CA3AF"} strokeWidth={5} strokeLinecap="round" />
        <Line x1={30} y1={112} x2={100} y2={16} stroke={level >= 3 ? GOLD : "#9CA3AF"} strokeWidth={5} strokeLinecap="round" />
        {/* steps */}
        {[0, 1, 2, 3, 4].map((i) => {
          const x = 22 + i * 13;
          const y = 96 - i * 17;
          return (
            <G key={i}>
              <Rect x={x} y={y} width={16} height={7} rx={2} fill="#6B7280" stroke="#4B5563" strokeWidth={1} />
            </G>
          );
        })}
        {/* balustrade glass */}
        <Line x1={20} y1={104} x2={90} y2={8} stroke="#D1D5DB" strokeWidth={2} opacity={0.7} />
        <Line x1={34} y1={104} x2={104} y2={8} stroke="#D1D5DB" strokeWidth={2} opacity={0.7} />
        {/* base + top */}
        <Rect x={4} y={108} width={42} height={10} rx={3} fill={level >= 3 ? GOLD : "#9CA3AF"} />
        <Rect x={76} y={4} width={32} height={10} rx={3} fill={level >= 3 ? GOLD : "#9CA3AF"} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Escalator</Text>
    </View>
  );
}

/** Department sign hanging from the ceiling. */
function DeptSign({ dept }: { dept: Dept }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <View style={{ width: 3, height: 14, backgroundColor: "#9CA3AF" }} />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: dept.color,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderWidth: 2,
          borderColor: "rgba(0,0,0,0.15)",
        }}
      >
        <MaterialIcons name={dept.icon as any} size={16} color="#FFFFFF" />
        <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 12, marginLeft: 6 }}>{dept.name}</Text>
      </View>
      {/* rack of goods below the sign */}
      <View style={{ flexDirection: "row", marginTop: 6 }}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              width: 14,
              height: i % 2 === 0 ? 20 : 15,
              borderRadius: 3,
              backgroundColor: ["#E8B44C", "#7FB069", "#D96C47"][i],
              marginHorizontal: 2,
              borderWidth: 1,
              borderColor: "rgba(0,0,0,0.1)",
            }}
          />
        ))}
      </View>
    </View>
  );
}

/** Directory sign — L2+. */
function Directory() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={64} height={92} viewBox="0 0 64 92">
        <Rect x={28} y={54} width={8} height={34} fill="#6B7280" />
        <Rect x={14} y={84} width={36} height={6} rx={3} fill="#4B5563" />
        <Rect x={6} y={4} width={52} height={52} rx={6} fill="#1F2937" stroke={GOLD} strokeWidth={3} />
        <Rect x={12} y={12} width={24} height={5} rx={2.5} fill={GOLD} />
        <Rect x={12} y={22} width={34} height={5} rx={2.5} fill="#6B7280" />
        <Rect x={12} y={32} width={28} height={5} rx={2.5} fill="#6B7280" />
        <Rect x={12} y={42} width={32} height={5} rx={2.5} fill="#6B7280" />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Directory</Text>
    </View>
  );
}

/** Grand chandelier — L3 only. */
function GrandChandelier() {
  return (
    <SoftPulse duration={2800}>
      <Svg width={130} height={84} viewBox="0 0 130 84">
        <Line x1={65} y1={0} x2={65} y2={18} stroke="#6B5B2A" strokeWidth={3} />
        <Ellipse cx={65} cy={44} rx={46} ry={12} fill="#8A6D1C" />
        <Ellipse cx={65} cy={41} rx={46} ry={10} fill={GOLD} />
        <Ellipse cx={65} cy={52} rx={30} ry={8} fill="#8A6D1C" opacity={0.6} />
        {[30, 48, 66, 84, 102].map((cx) => (
          <G key={cx}>
            <Rect x={cx - 3} y={22} width={6} height={18} rx={3} fill="#FDECC8" />
            <Circle cx={cx} cy={19} r={5.5} fill="#FFF7D6" />
          </G>
        ))}
        <Circle cx={65} cy={56} r={7} fill="#E8B44C" />
      </Svg>
    </SoftPulse>
  );
}

/** Promotional banner hanging between departments — L3 only. */
function PromoBanner({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 4 }}>
      <View style={{ width: 3, height: 10, backgroundColor: "#9CA3AF" }} />
      <View style={{ backgroundColor: color, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 }}>
        <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 10 }}>{text}</Text>
      </View>
    </View>
  );
}

/** Potted plant for the grand concourse. */
function Plant() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#5B8A5E" }} />
      <View style={{ width: 22, height: 24, borderRadius: 14, backgroundColor: "#6FA372", marginTop: -16 }} />
      <View style={{ width: 24, height: 18, borderRadius: 4, backgroundColor: "#B0724A", marginTop: -4 }} />
    </View>
  );
}

/** A glowing jewelry display case — L3 only. */
function JewelryCase() {
  return (
    <View style={{ alignItems: "center" }}>
      <SoftPulse duration={1700}>
        <Svg width={112} height={66} viewBox="0 0 112 66">
          <Rect x={2} y={32} width={108} height={32} rx={5} fill="#4B2E14" />
          <Rect x={6} y={4} width={100} height={32} rx={5} fill="#E0F2FE" opacity={0.4} stroke={GOLD} strokeWidth={2} />
          <Rect x={10} y={20} width={92} height={3} fill={GOLD} opacity={0.6} />
          {/* jewels on velvet */}
          {[
            { x: 30, c: "#F472B6" }, { x: 56, c: "#22D3EE" }, { x: 82, c: "#A78BFA" },
          ].map(({ x, c }) => (
            <G key={x}>
              <Ellipse cx={x} cy={30} rx={9} ry={4} fill="#7C2D12" opacity={0.7} />
              <Circle cx={x} cy={22} r={7} fill={c} />
              <Circle cx={x - 2} cy={19.5} r={2} fill="#FFFFFF" opacity={0.85} />
            </G>
          ))}
        </Svg>
      </SoftPulse>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Fine jewelry</Text>
    </View>
  );
}

/** Velvet-rope stanchions for the grand concourse — L3 only. */
function VelvetRope() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 4 }}>
      <Svg width={120} height={60} viewBox="0 0 120 60">
        <Path d="M14 12 C40 34 80 34 106 12" stroke="#B91C1C" strokeWidth={5} fill="none" strokeLinecap="round" />
        {[14, 106].map((x) => (
          <G key={x}>
            <Circle cx={x} cy={8} r={4} fill={GOLD} />
            <Rect x={x - 2.5} y={8} width={5} height={38} fill={GOLD} />
            <Rect x={x - 12} y={44} width={24} height={7} rx={3.5} fill="#8A6D1C" />
          </G>
        ))}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>VIP entrance</Text>
    </View>
  );
}

/** A marble column for the grand concourse — L3 only. */
function MarbleColumn() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={30} height={132} viewBox="0 0 30 132">
        <Rect x={2} y={0} width={26} height={9} rx={2} fill={GOLD} />
        <Rect x={6} y={9} width={18} height={110} fill="#F5F3FF" stroke="#DDD6FE" strokeWidth={1} />
        <Rect x={10} y={9} width={4} height={110} fill="#EDE9FE" />
        <Rect x={18} y={9} width={4} height={110} fill="#EDE9FE" opacity={0.6} />
        <Rect x={2} y={119} width={26} height={13} rx={2} fill={GOLD} />
      </Svg>
    </View>
  );
}

export default function DepartmentStoreInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastGreet, setLastGreet] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(GREET_KEY).catch(() => null);
      setLastGreet(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastGreet + COOLDOWN_MS - Date.now());
  const depts = DEPTS.slice(0, level >= 3 ? 6 : level >= 2 ? 3 : 2);
  const shoppers = pickPeople(people, `dept|${building?.id ?? "dept"}|shop`, level >= 3 ? 7 : 5);
  const onEscalator = pickPeople(people, `dept|${building?.id ?? "dept"}|esc`, 2);
  const extraShopper = level >= 3 ? shoppers[6] : shoppers[3];

  const levelBlurb =
    level >= 3
      ? "A true luxury emporium — six departments, a jewelry salon, velvet ropes, marble columns, and marble underfoot."
      : level >= 2
        ? "A fine department store — three departments, a directory, and greenery."
        : "A modest shop — two departments, but everything's neatly stocked.";

  const handleGreet = async () => {
    if (remaining > 0) {
      Alert.alert("Shoppers are browsing", `Everyone's finding what they need.\n\nCome back in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(GREET_COINS[level] ?? 6);
    const xp = scaledXP(GREET_XP[level] ?? 6);
    const t = Date.now();
    setLastGreet(t);
    await AsyncStorage.setItem(GREET_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `dept-greet-${t}`).catch(() => undefined);
    Alert.alert("Warm Welcome", `You greet every shopper with a smile.\n\n+${c.toFixed(2)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="shopping-bag" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="store"
          iconColor={ACCENT}
          title="Department Store"
          blurb={`Everything under one roof. ${levelBlurb}`}
          accent="#DDD6FE"
        />

        {/* grand store scene */}
        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#DDD6FE",
            overflow: "hidden",
            backgroundColor: level >= 3 ? "#FAF7FF" : "#F7F5F1",
          }}
        >
          {level >= 3 && <GrandChandelier />}
          {level >= 3 && (
            <View style={{ flexDirection: "row", justifyContent: "center", marginTop: -4 }}>
              <PromoBanner text="SALE" color="#D96C47" />
              <PromoBanner text="NEW ARRIVALS" color={ACCENT} />
              <PromoBanner text="WELCOME" color="#0E7C86" />
            </View>
          )}

          {/* escalator with riders */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8 }}>
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="department-store" />
            <Escalator level={level} />
            <View style={{ flexDirection: "row", alignItems: "flex-end", marginLeft: 6 }}>
              {onEscalator.map((p, i) => (
                <GentleBob key={p.id} delay={i * 300}>
                  <StandingFigure person={p} delay={i * 300} icon={i === 0 ? "shopping-bag" : "shopping-cart"} iconColor={ACCENT} showLabel />
                </GentleBob>
              ))}
              {onEscalator.length === 0 && level >= 1 && (
                <GentleBob delay={200}>
                  <View style={{ alignItems: "center", marginHorizontal: 6 }}>
                    <SoftPulse duration={1800}>
                      <MaterialIcons name="escalator" size={16} color={ACCENT} style={{ marginBottom: 2 }} />
                    </SoftPulse>
                    {pawn && <PawnPreview pawn={pawn} size={44} />}
                    {pawn && <FigureName name={pawn.name} color="#7C3AED" />}
                  </View>
                </GentleBob>
              )}
            </View>
          </View>

          {/* departments */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start", marginTop: 10 }}>
            {depts.map((d, i) => (
              <View key={d.name} style={{ alignItems: "center", margin: 4 }}>
                <DeptSign dept={d} />
                {shoppers[i] && (
                  <GentleBob delay={i * 220}>
                    <StandingFigure person={shoppers[i]} delay={i * 220} icon="shopping-bag" iconColor={d.color} showLabel />
                  </GentleBob>
                )}
              </View>
            ))}
          </View>

          {/* L3 luxury concourse: marble columns, jewelry salon, velvet ropes */}
          {level >= 3 && (
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 10 }}>
              <MarbleColumn />
              <JewelryCase />
              <VelvetRope />
              <MarbleColumn />
            </View>
          )}

          {/* pawn greeting by the directory */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8 }}>
            {level >= 2 && <Directory />}
            {pawn && onEscalator.length > 0 && (
              <GentleBob delay={500}>
                <View style={{ alignItems: "center", marginHorizontal: 10 }}>
                  <SoftPulse duration={2000}>
                    <MaterialIcons name="waving-hand" size={16} color={ACCENT} style={{ marginBottom: 2 }} />
                  </SoftPulse>
                  <PawnPreview pawn={pawn} size={46} />
                  <FigureName name={pawn.name} color="#7C3AED" />
                </View>
              </GentleBob>
            )}
            {level >= 2 && <Plant />}
            {level >= 3 && <Plant />}
            {extraShopper && (
              <GentleBob delay={700}>
                <StandingFigure person={extraShopper} delay={700} icon="shopping-cart" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
          </View>

          {/* marble floor at L3, polished stone at L2, plain at L1 */}
          <View style={{ height: 26, marginTop: 8, backgroundColor: level >= 3 ? "#EDE9FE" : level >= 2 ? "#D6D3D1" : "#C9C4BB" }}>
            <View style={{ height: 3, backgroundColor: level >= 3 ? "#DDD6FE" : "#B8B4AC" }} />
            {level >= 3 && (
              <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 5 }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <View key={i} style={{ width: 40, height: 8, backgroundColor: "#F5F3FF", marginHorizontal: 3, borderRadius: 2, opacity: 0.8, borderBottomWidth: 2, borderBottomColor: GOLD }} />
                ))}
              </View>
            )}
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Greet Shoppers"}
          onPrimary={handleGreet}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "Six departments, a jewelry salon, velvet ropes, marble columns, and marble floors." : "Three departments, a directory sign, and plants."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Greet shoppers once an hour. Bigger stores draw bigger crowds.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Opening the store…</Text>}
      </ScrollView>
    </View>
  );
}
