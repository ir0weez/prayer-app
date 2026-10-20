// Embassy interior: flags of many lands. Diplomats gather around the
// great round table, translators lean in, gifts are exchanged, and the
// pawn greets the delegations.
// "Exchange Greetings" grants coins + XP on a 1-hour cooldown.
// L1: round table, two flags. L2: gift display, more flags, balcony.
// L3: grand embassy — great seal, five flags, fountain court, gold trim.
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
import { GentleBob, SeatedFigure, SoftPulse, StandingFigure, FigureName, pickPeople } from "@/components/activity-figures";
import { PawnPreview } from "@/components/pawn-preview";
import { formatCooldown } from "@/lib/gathering-places";
import { scaledCoins, scaledXP } from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";

const BG = "#EFF1F6";
const FLAG_COLORS = ["#B91C1C", "#1D4ED8", "#16A34A", "#F59E0B", "#7C3AED"];
const TEXT_DIM = "#8A99AD";
const ACCENT = "#1D4ED8";
const GOLD = "#C9963C";

const GREET_COINS: Record<number, number> = { 1: 70, 2: 140, 3: 280 };
const GREET_XP: Record<number, number> = { 1: 5, 2: 10, 3: 20 };
const COOLDOWN_MS = 60 * 60 * 1000;
const GREET_KEY = "prayercircle.interior.embassy.greet.v1";

/** A standing flag of a delegation. */
function DelegationFlag({ color, tall = false }: { color: string; tall?: boolean }) {
  const H = tall ? 130 : 104;
  return (
    <View style={{ alignItems: "center", marginHorizontal: 5 }}>
      <Svg width={44} height={H} viewBox={`0 0 44 ${H}`}>
        <Line x1={6} y1={2} x2={6} y2={H - 4} stroke="#5E5646" strokeWidth={3.5} />
        <Circle cx={6} cy={2} r={3.5} fill={GOLD} />
        <Polygon points={`6,8 40,${14 + (tall ? 4 : 0)} 6,${20 + (tall ? 8 : 0)}`} fill={color} stroke="#00000033" strokeWidth={1.5} />
        <Rect x={2} y={H - 8} width={10} height={6} rx={2} fill="#5E5646" />
      </Svg>
    </View>
  );
}

/** The great round table where delegations meet. */
function RoundTable({ level }: { level: number }) {
  return (
    <View style={{ alignItems: "center", marginTop: 8 }}>
      <Svg width={230} height={96} viewBox="0 0 230 96">
        {/* chairs hint */}
        {[30, 200].map((cx) => (
          <G key={cx}>
            <Rect x={cx - 16} y={52} width={32} height={10} rx={5} fill="#6B4A2F" />
            <Rect x={cx - 4} y={62} width={8} height={22} fill="#4E3421" />
          </G>
        ))}
        {/* table */}
        <Ellipse cx={115} cy={52} rx={82} ry={24} fill={level >= 3 ? "#9A6B35" : "#8A5A2B"} stroke={level >= 3 ? GOLD : "#5E3D22"} strokeWidth={2.5} />
        <Ellipse cx={115} cy={46} rx={82} ry={24} fill={level >= 3 ? "#B9834F" : "#A9713F"} stroke={level >= 3 ? GOLD : "#5E3D22"} strokeWidth={2.5} />
        <Ellipse cx={115} cy={46} rx={60} ry={16} fill="#F8FAFC" opacity={0.16} />
        {/* documents + seal */}
        <Rect x={88} y={36} width={26} height={16} rx={2} fill="#F8FAFC" stroke="#94A3B8" strokeWidth={1.5} />
        <Rect x={118} y={38} width={26} height={14} rx={2} fill="#F8FAFC" stroke="#94A3B8" strokeWidth={1.5} />
        <Circle cx={115} cy={46} r={9} fill={level >= 3 ? GOLD : "#B91C1C"} stroke={level >= 3 ? "#8A6D1C" : "#7A1020"} strokeWidth={1.5} />
        <Path d="M115 41 L115 51 M110 46 L120 46" stroke="#FFFFFF" strokeWidth={1.8} />
        {/* little flags on the table */}
        <Line x1={60} y1={46} x2={60} y2={24} stroke="#5E5646" strokeWidth={2.5} />
        <Polygon points="60,24 76,28 60,32" fill={FLAG_COLORS[0]} />
        <Line x1={170} y1={46} x2={170} y2={24} stroke="#5E5646" strokeWidth={2.5} />
        <Polygon points="170,24 186,28 170,32" fill={FLAG_COLORS[1]} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>The round table</Text>
    </View>
  );
}

/** A display of exchanged gifts (L2+). */
function GiftDisplay({ level }: { level: number }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <Svg width={130} height={84} viewBox="0 0 130 84">
        <Rect x={6} y={56} width={118} height={22} rx={4} fill="#6B4A2F" stroke="#4E3421" strokeWidth={2} />
        {/* gift boxes */}
        <Rect x={16} y={30} width={28} height={26} rx={3} fill={FLAG_COLORS[3]} stroke="#8A6D1C" strokeWidth={1.5} />
        <Line x1={30} y1={30} x2={30} y2={56} stroke="#FDE68A" strokeWidth={4} />
        <Line x1={16} y1={42} x2={44} y2={42} stroke="#FDE68A" strokeWidth={4} />
        <Rect x={52} y={38} width={24} height={18} rx={3} fill={FLAG_COLORS[1]} stroke="#1E3A8A" strokeWidth={1.5} />
        <Line x1={64} y1={38} x2={64} y2={56} stroke="#BAE6FD" strokeWidth={3.5} />
        {/* a fine vase */}
        <Path d="M96 56 C92 46, 96 40, 102 38 C108 40, 112 46, 108 56 Z" fill={level >= 3 ? GOLD : "#7FA8C9"} stroke={level >= 3 ? "#8A6D1C" : "#3D5A76"} strokeWidth={1.5} />
        <Ellipse cx={102} cy={38} rx={6} ry={2.5} fill={level >= 3 ? "#8A6D1C" : "#3D5A76"} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Exchanged gifts</Text>
    </View>
  );
}

/** The great seal of friendship (L3). */
function GreatSeal() {
  return (
    <View style={{ alignItems: "center", marginTop: 6 }}>
      <Svg width={110} height={110} viewBox="0 0 110 110">
        <Circle cx={55} cy={55} r={44} fill="#1D4ED8" stroke={GOLD} strokeWidth={4} />
        <Circle cx={55} cy={55} r={34} fill="none" stroke={GOLD} strokeWidth={2} opacity={0.8} />
        {/* two hands clasped, simplified */}
        <Path d="M35 55 q10 -12 20 -4 q10 -8 20 4" stroke="#FFFFFF" strokeWidth={5} fill="none" strokeLinecap="round" />
        <Path d="M40 62 q15 10 30 0" stroke="#FFFFFF" strokeWidth={5} fill="none" strokeLinecap="round" />
        {/* stars around */}
        {[0, 60, 120, 180, 240, 300].map((a) => {
          const rad = (a * Math.PI) / 180;
          return <Circle key={a} cx={55 + 27 * Math.cos(rad)} cy={55 + 27 * Math.sin(rad)} r={2.6} fill={GOLD} />;
        })}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Seal of friendship</Text>
    </View>
  );
}

export default function EmbassyInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastGreet, setLastGreet] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(GREET_KEY).catch(() => null);
      setLastGreet(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastGreet + COOLDOWN_MS - Date.now());
  const delegates = pickPeople(people, `embassy|${building?.id ?? "embassy"}|delegate`, 4);
  const translator = pickPeople(people, `embassy|${building?.id ?? "embassy"}|translate`, 1)[0];
  const flagCount = level >= 3 ? 5 : level >= 2 ? 3 : 2;

  const levelBlurb =
    level >= 3
      ? "A grand embassy — the great seal, five flags, and gifts from every land."
      : level >= 2
        ? "A fine embassy — three delegations' flags and gifts exchanged."
        : "A humble embassy — two flags, one round table, open doors.";

  const handleGreet = async () => {
    if (remaining > 0) {
      Alert.alert("The delegations rest", `All greetings have been exchanged for now.\n\nGreet again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(GREET_COINS[level] ?? 7);
    const xp = scaledXP(GREET_XP[level] ?? 5);
    const t = Date.now();
    setLastGreet(t);
    await AsyncStorage.setItem(GREET_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `embassy-greet-${t}`).catch(() => undefined);
    Alert.alert("Greetings Exchanged", `You welcome each delegation in turn — "Blessed are the peacemakers."\n\n+${c.toFixed(2)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="flag" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="handshake"
          iconColor={ACCENT}
          title="Embassy"
          blurb={`Flags of many lands. ${levelBlurb}`}
          accent="#D5E0F0"
        />

        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#D5E0F0",
            overflow: "hidden",
            backgroundColor: level >= 3 ? "#F4F6FB" : "#F1F4F9",
          }}
        >
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="embassy" />

          {/* delegation flags */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8 }}>
            {Array.from({ length: flagCount }).map((_, i) => (
              <DelegationFlag key={i} color={FLAG_COLORS[i % FLAG_COLORS.length]} tall={level >= 3} />
            ))}
          </View>

          {level >= 3 && <GreatSeal />}
          <RoundTable level={level} />

          {/* delegates around the table */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8, minHeight: 84 }}>
            {delegates[0] && (
              <GentleBob delay={150}>
                <SeatedFigure person={delegates[0]} delay={150} chairColor="#6B4A2F" chairBorder="#4E3421" />
              </GentleBob>
            )}
            {delegates[1] && (
              <GentleBob delay={350}>
                <SeatedFigure person={delegates[1]} delay={350} chairColor="#6B4A2F" chairBorder="#4E3421" />
              </GentleBob>
            )}
            {pawn && (
              <GentleBob delay={550}>
                <View style={{ alignItems: "center", marginHorizontal: 6 }}>
                  <SoftPulse duration={1800}>
                    <MaterialIcons name="handshake" size={15} color={ACCENT} style={{ marginBottom: 1 }} />
                  </SoftPulse>
                  <PawnPreview pawn={pawn} size={44} />
                  <FigureName name={pawn.name} color="#1D4ED8" />
                </View>
              </GentleBob>
            )}
            {delegates[2] && (
              <GentleBob delay={750}>
                <SeatedFigure person={delegates[2]} delay={750} chairColor="#6B4A2F" chairBorder="#4E3421" />
              </GentleBob>
            )}
            {level >= 3 && delegates[3] && (
              <GentleBob delay={950}>
                <SeatedFigure person={delegates[3]} delay={950} chairColor="#6B4A2F" chairBorder="#4E3421" />
              </GentleBob>
            )}
          </View>

          {level >= 2 && (
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8 }}>
              <GiftDisplay level={level} />
              {translator && (
                <StandingFigure person={translator} delay={500} icon="translate" iconColor={ACCENT} showLabel />
              )}
            </View>
          )}

          {/* polished floor */}
          <View style={{ height: 26, backgroundColor: "#C9D4E2", marginTop: 10 }}>
            <View style={{ height: 3, backgroundColor: level >= 3 ? GOLD : "#A9B8CC" }} />
            <View style={{ height: 5, backgroundColor: "#FFFFFF", opacity: 0.35, marginTop: 5, marginHorizontal: 90, borderRadius: 3 }} />
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Exchange Greetings"}
          onPrimary={handleGreet}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "A grand embassy — the great seal, five flags, gifts from every land." : "Three delegations' flags and a display of exchanged gifts."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Exchange greetings once an hour. Blessed are the peacemakers.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Raising the flags…</Text>}
      </ScrollView>
    </View>
  );
}
