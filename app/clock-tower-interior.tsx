// Clock Tower interior: gears and pendulums, the city's heartbeat.
// Villagers oil the great gears, the pendulum swings below, and the
// winding crank waits for a strong arm. The pawn winds the clock.
// "Wind the Clock" grants coins + XP on a 1-hour cooldown.
// L1: gear room, one pendulum. L2: bigger gears, winding crank, oil cans.
// L3: the grand works — great wheel, twin pendulums, brass everywhere.
// No emojis — SVG art and MaterialIcons only. Gentle sine-ease motion.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Line, Path, Rect, G } from "react-native-svg";
import {
  InteriorActions,
  InteriorBanner,
  InteriorHeader,
  useInteriorData,
} from "@/components/interior-shell";
import { GentleBob, SoftPulse, StandingFigure, WorkingFigure, FigureName, pickPeople } from "@/components/activity-figures";
import { PawnPreview } from "@/components/pawn-preview";
import { formatCooldown } from "@/lib/gathering-places";
import { scaledCoins, scaledXP } from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";

const BG = "#ECE7DB";
const BRASS = "#C9963C";
const BRASS_DARK = "#8A6D1C";
const STEEL = "#8A7F6A";
const TEXT_DIM = "#A0977F";
const ACCENT = "#8A6D1C";

const WIND_COINS: Record<number, number> = { 1: 60, 2: 120, 3: 240 };
const WIND_XP: Record<number, number> = { 1: 5, 2: 10, 3: 18 };
const COOLDOWN_MS = 60 * 60 * 1000;
const WIND_KEY = "prayercircle.interior.clocktower.wind.v1";

/** A toothed gear. `teeth` spokes, brass or steel. */
function Gear({ size, cx, cy, teeth = 8, brass = true, spin = 0 }: { size: number; cx: number; cy: number; teeth?: number; brass?: boolean; spin?: number }) {
  const r = size / 2;
  const color = brass ? BRASS : STEEL;
  const dark = brass ? BRASS_DARK : "#5E5646";
  return (
    <G transform={`rotate(${spin} ${cx} ${cy})`}>
      {Array.from({ length: teeth }).map((_, i) => {
        const a = (i * 360) / teeth;
        const rad = (a * Math.PI) / 180;
        const x1 = cx + (r - 7) * Math.cos(rad);
        const y1 = cy + (r - 7) * Math.sin(rad);
        const x2 = cx + (r + 2) * Math.cos(rad);
        const y2 = cy + (r + 2) * Math.sin(rad);
        return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={6} strokeLinecap="round" />;
      })}
      <Circle cx={cx} cy={cy} r={r - 6} fill="none" stroke={color} strokeWidth={7} />
      <Circle cx={cx} cy={cy} r={r - 14} fill="none" stroke={color} strokeWidth={3} opacity={0.7} />
      {Array.from({ length: 4 }).map((_, i) => {
        const a = (i * 90 + 45) * (Math.PI / 180);
        return <Line key={i} x1={cx} y1={cy} x2={cx + (r - 14) * Math.cos(a)} y2={cy + (r - 14) * Math.sin(a)} stroke={dark} strokeWidth={3} />;
      })}
      <Circle cx={cx} cy={cy} r={5} fill={dark} />
    </G>
  );
}

/** The great gear wall. */
function GearWall({ level }: { level: number }) {
  return (
    <View style={{ alignItems: "center", marginTop: 8 }}>
      <Svg width={300} height={level >= 3 ? 190 : 150} viewBox={`0 0 300 ${level >= 3 ? 190 : 150}`}>
        <Rect x={4} y={4} width={292} height={(level >= 3 ? 190 : 150) - 8} rx={10} fill="#3F3A32" stroke="#2B2721" strokeWidth={2.5} />
        <Gear size={110} cx={90} cy={75} teeth={10} spin={12} />
        <Gear size={70} cx={180} cy={100} teeth={8} brass={false} spin={-20} />
        <Gear size={46} cx={240} cy={60} teeth={8} spin={30} />
        {level >= 2 && <Gear size={60} cx={60} cy={130} teeth={8} brass={false} spin={-12} />}
        {level >= 3 && <Gear size={52} cx={220} cy={145} teeth={8} spin={22} />}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>The great works</Text>
    </View>
  );
}

/** A swinging pendulum (in a glass-front case). */
function Pendulum({ tall = false }: { tall?: boolean }) {
  const H = tall ? 150 : 120;
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <Svg width={90} height={H} viewBox={`0 0 90 ${H}`}>
        <Rect x={4} y={4} width={82} height={H - 8} rx={8} fill="#D9EDF5" opacity={0.4} stroke={BRASS} strokeWidth={2.5} />
        <Line x1={45} y1={12} x2={45} y2={H - 44} stroke={BRASS_DARK} strokeWidth={4} />
        <Circle cx={45} cy={H - 34} r={16} fill={BRASS} stroke={BRASS_DARK} strokeWidth={2.5} />
        <Circle cx={45} cy={H - 34} r={8} fill="none" stroke={BRASS_DARK} strokeWidth={1.5} />
        <Rect x={30} y={6} width={30} height={8} rx={3} fill={BRASS_DARK} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Pendulum</Text>
    </View>
  );
}

/** The winding crank the pawn turns. */
function WindingCrank() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <Svg width={100} height={96} viewBox="0 0 100 96">
        <Rect x={36} y={30} width={28} height={40} rx={6} fill="#57534E" stroke="#2B2721" strokeWidth={2.5} />
        <Circle cx={50} cy={50} r={10} fill="none" stroke={BRASS} strokeWidth={4} />
        <Line x1={50} y1={50} x2={78} y2={34} stroke={BRASS} strokeWidth={5} strokeLinecap="round" />
        <Circle cx={80} cy={32} r={7} fill={BRASS_DARK} />
        <Rect x={30} y={70} width={40} height={10} rx={4} fill="#2B2721" />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Winding crank</Text>
    </View>
  );
}

/** Oil cans and tools on a shelf (L2+). */
function OilShelf() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <Svg width={120} height={70} viewBox="0 0 120 70">
        <Rect x={4} y={52} width={112} height={8} rx={3} fill="#5E5646" />
        {[0, 1, 2].map((i) => (
          <G key={i}>
            <Path d={`M${24 + i * 34} 52 l4 -18 h12 l4 18 Z`} fill={BRASS} stroke={BRASS_DARK} strokeWidth={1.5} />
            <Line x1={34 + i * 34} y1={34} x2={42 + i * 34} y2={26} stroke={BRASS_DARK} strokeWidth={3} />
            <Circle cx={43 + i * 34} cy={25} r={2.5} fill={BRASS_DARK} />
          </G>
        ))}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Oil cans</Text>
    </View>
  );
}

export default function ClockTowerInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastWind, setLastWind] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(WIND_KEY).catch(() => null);
      setLastWind(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastWind + COOLDOWN_MS - Date.now());
  const oiling = pickPeople(people, `clocktower|${building?.id ?? "clocktower"}|oil`, 3);
  const watching = pickPeople(people, `clocktower|${building?.id ?? "clocktower"}|watch`, 1)[0];

  const levelBlurb =
    level >= 3
      ? "The grand works — the great wheel, twin pendulums, and brass everywhere."
      : level >= 2
        ? "A fine works — bigger gears, the winding crank, and oil at hand."
        : "A humble gear room — turning wheels and one steady pendulum.";

  const handleWind = async () => {
    if (remaining > 0) {
      Alert.alert("The clock is wound", `The gears turn true and steady.\n\nWind it again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(WIND_COINS[level] ?? 6);
    const xp = scaledXP(WIND_XP[level] ?? 5);
    const t = Date.now();
    setLastWind(t);
    await AsyncStorage.setItem(WIND_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `clocktower-wind-${t}`).catch(() => undefined);
    Alert.alert("Clock Wound", `You turn the great crank — the tower's heartbeat steadies over downtown.\n\n+${c.toFixed(2)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="schedule" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="access-time"
          iconColor={ACCENT}
          title="Clock Tower"
          blurb={`Gears and pendulums — the city's heartbeat. ${levelBlurb}`}
          accent="#DED2B4"
        />

        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#DED2B4",
            overflow: "hidden",
            backgroundColor: level >= 3 ? "#F0EBDD" : "#EDE8D8",
          }}
        >
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="clock-tower" />

          <GearWall level={level} />

          {/* villagers oiling the works */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8, minHeight: 84 }}>
            {oiling[0] && (
              <GentleBob delay={150}>
                <WorkingFigure person={oiling[0]} delay={150} icon="build" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
            {pawn && (
              <GentleBob delay={400}>
                <View style={{ alignItems: "center", marginHorizontal: 8 }}>
                  <SoftPulse duration={1800}>
                    <MaterialIcons name="autorenew" size={15} color={ACCENT} style={{ marginBottom: 1 }} />
                  </SoftPulse>
                  <PawnPreview pawn={pawn} size={44} />
                  <FigureName name={pawn.name} color="#8A6D1C" />
                </View>
              </GentleBob>
            )}
            {oiling[1] && (
              <GentleBob delay={650}>
                <WorkingFigure person={oiling[1]} delay={650} icon="handyman" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
            {level >= 3 && oiling[2] && (
              <GentleBob delay={900}>
                <WorkingFigure person={oiling[2]} delay={900} icon="build" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
          </View>

          {/* pendulums + crank */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 10 }}>
            <Pendulum tall={level >= 3} />
            <WindingCrank />
            {level >= 2 && <OilShelf />}
            {level >= 3 && <Pendulum />}
          </View>
          {watching && (
            <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 4 }}>
              <StandingFigure person={watching} delay={500} icon="schedule" iconColor={ACCENT} showLabel />
            </View>
          )}

          {/* riveted floor */}
          <View style={{ height: 26, backgroundColor: "#B8AE99", marginTop: 10 }}>
            <View style={{ height: 3, backgroundColor: "#A89E8C" }} />
            <View style={{ flexDirection: "row", marginTop: 7, marginHorizontal: 40 }}>
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#8A7F6A", marginHorizontal: 8 }} />
              ))}
            </View>
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Wind the Clock"}
          onPrimary={handleWind}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "The grand works — the great wheel, twin pendulums, brass everywhere." : "Bigger gears, the winding crank, and oil at hand."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Wind the clock once an hour. Time, like grace, keeps moving.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Oiling the gears…</Text>}
      </ScrollView>
    </View>
  );
}
