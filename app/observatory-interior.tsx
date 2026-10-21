// Observatory interior: a dome under the open sky. A great telescope
// points through the slit, star charts cover the walls, and villagers
// stargaze from the gallery rail. The pawn charts a constellation.
// "Chart the Stars" grants XP on a 1-hour cooldown (no coins — the stars
// are their own reward).
// L1: small dome, chart table. L2: bigger telescope, planetarium globe.
// L3: grand observatory — twin telescopes, star map ceiling, brass orrery.
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
import { GentleBob, SoftPulse, StandingFigure, WorkingFigure, FigureName, pickPeople } from "@/components/activity-figures";
import { PawnPreview } from "@/components/pawn-preview";
import { formatCooldown } from "@/lib/gathering-places";
import { scaledXP } from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";
import { StarsGame } from "@/components/stars-game";
import { PlayCard } from "@/components/mini-game-scene";
import { useMiniGameHost } from "@/components/mini-game-host";

const BG = "#101828";
const DOME = "#1E293B";
const BRASS = "#C9963C";
const TEXT = "#E8EDF5";
const TEXT_DIM = "#8A94A8";
const ACCENT = "#7FA8C9";

const CHART_XP: Record<number, number> = { 1: 10, 2: 18, 3: 30 };
const COOLDOWN_MS = 60 * 60 * 1000;
const CHART_KEY = "prayercircle.interior.observatory.chart.v1";

/** Scattered stars for the night sky backdrop. */
function StarField({ count = 24, seed = 1 }: { count?: number; seed?: number }) {
  const stars: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < count; i++) {
    const x = ((i * 37 + seed * 53) % 300) / 300;
    const y = ((i * 61 + seed * 29) % 110) / 110;
    stars.push({ x, y, r: 1 + ((i * 7 + seed) % 3) * 0.8 });
  }
  return (
    <Svg width={320} height={120} viewBox="0 0 320 120" style={{ position: "absolute", top: 0, left: 0 }}>
      {stars.map((st, i) => (
        <Circle key={i} cx={st.x * 320} cy={st.y * 120} r={st.r} fill="#FDE68A" opacity={0.5 + (i % 3) * 0.2} />
      ))}
      {/* a small constellation */}
      <Path d="M230 30 L252 44 L246 66 L270 74" stroke="#7FA8C9" strokeWidth={1.2} fill="none" opacity={0.8} />
      {[230, 252, 246, 270].map((cx, i) => (
        <Circle key={i} cx={cx} cy={[30, 44, 66, 74][i]} r={2.4} fill="#FFFFFF" />
      ))}
    </Svg>
  );
}

/** The great telescope on its mount. */
function Telescope({ grand = false }: { grand?: boolean }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={150} height={110} viewBox="0 0 150 110">
        {/* mount */}
        <Path d="M75 108 L60 78 L90 78 Z" fill="#475569" stroke="#1E293B" strokeWidth={2} />
        <Circle cx={75} cy={76} r={9} fill={BRASS} stroke="#8A6D1C" strokeWidth={2} />
        {/* tube, angled up */}
        <G transform="rotate(-24 75 70)">
          <Rect x={30} y={58} width={90} height={22} rx={10} fill={grand ? "#334155" : "#475569"} stroke={BRASS} strokeWidth={2.5} />
          <Rect x={30} y={58} width={90} height={7} rx={3.5} fill="#64748B" opacity={0.7} />
          <Ellipse cx={122} cy={69} rx={7} ry={11} fill="#0F172A" stroke={BRASS} strokeWidth={2.5} />
          <Circle cx={122} cy={69} r={4} fill="#1E3A5A" />
          <Rect x={22} y={62} width={10} height={14} rx={3} fill="#1E293B" />
        </G>
        {/* eyepiece */}
        <Rect x={40} y={96} width={12} height={8} rx={3} fill={BRASS} stroke="#8A6D1C" strokeWidth={1.5} transform="rotate(-24 46 100)" />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Great telescope</Text>
    </View>
  );
}

/** A chart table with an unfurled star map. */
function ChartTable() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={130} height={80} viewBox="0 0 130 80">
        <Rect x={10} y={44} width={110} height={8} rx={3} fill="#5E3D22" />
        <Rect x={16} y={52} width={8} height={22} fill="#4E2F16" />
        <Rect x={106} y={52} width={8} height={22} fill="#4E2F16" />
        {/* unfurled chart */}
        <Path d="M24 44 q26 -10 52 0 q26 10 52 0 l0 -30 q-26 10 -52 0 q-26 -10 -52 0 Z" fill="#F8FAFC" stroke="#94A3B8" strokeWidth={2} />
        <Circle cx={60} cy={24} r={2.5} fill={BRASS} />
        <Circle cx={84} cy={20} r={2} fill={BRASS} />
        <Circle cx={102} cy={28} r={2.5} fill={BRASS} />
        <Path d="M60 24 L84 20 L102 28" stroke={BRASS} strokeWidth={1.2} />
        <Circle cx={46} cy={30} r={1.8} fill="#94A3B8" />
        <Circle cx={116} cy={22} r={1.8} fill="#94A3B8" />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Star charts</Text>
    </View>
  );
}

/** A brass orrery — sun and planets on arms (L3). */
function Orrery() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={120} height={96} viewBox="0 0 120 96">
        <Ellipse cx={60} cy={84} rx={34} ry={7} fill="#475569" stroke="#1E293B" strokeWidth={2} />
        <Rect x={56} y={60} width={8} height={24} fill="#8A6D1C" />
        <Circle cx={60} cy={48} r={11} fill="#FBBF24" stroke="#B45309" strokeWidth={2} />
        <Line x1={60} y1={48} x2={30} y2={40} stroke={BRASS} strokeWidth={2} />
        <Circle cx={28} cy={39} r={5} fill="#7FA8C9" stroke="#3D5A76" strokeWidth={1.5} />
        <Line x1={60} y1={48} x2={92} y2={58} stroke={BRASS} strokeWidth={2} />
        <Circle cx={94} cy={59} r={6.5} fill="#D96C47" stroke="#8A3D06" strokeWidth={1.5} />
        <Line x1={60} y1={48} x2={60} y2={22} stroke={BRASS} strokeWidth={2} />
        <Circle cx={60} cy={20} r={4} fill="#C4B5FD" stroke="#6D4C9E" strokeWidth={1.5} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Orrery</Text>
    </View>
  );
}

/** A planetarium globe on a stand (L2+). */
function PlanetGlobe() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={80} height={96} viewBox="0 0 80 96">
        <Path d="M40 88 L28 70 L52 70 Z" fill="#475569" stroke="#1E293B" strokeWidth={2} />
        <Circle cx={40} cy={44} r={22} fill="#1E3A5A" stroke={BRASS} strokeWidth={2.5} />
        <Path d="M20 38 q12 -8 24 -2 q10 5 14 -4" stroke="#7FA8C9" strokeWidth={2} fill="none" />
        <Path d="M22 52 q14 6 28 0" stroke="#7FA8C9" strokeWidth={2} fill="none" />
        <Circle cx={52} cy={36} r={2.2} fill="#FDE68A" />
        <Circle cx={30} cy={50} r={2.2} fill="#FDE68A" />
        <Ellipse cx={40} cy={44} rx={28} ry={8} fill="none" stroke={BRASS} strokeWidth={2} transform="rotate(-18 40 44)" />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Star globe</Text>
    </View>
  );
}

export default function ObservatoryInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const stars = useMiniGameHost("stars", addCoins);
  const [lastChart, setLastChart] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(CHART_KEY).catch(() => null);
      setLastChart(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastChart + COOLDOWN_MS - Date.now());
  const stargazers = pickPeople(people, `observatory|${building?.id ?? "observatory"}|gaze`, 3);
  const charting = pickPeople(people, `observatory|${building?.id ?? "observatory"}|chart`, 1)[0];

  const levelBlurb =
    level >= 3
      ? "A grand observatory — twin telescopes, a star-mapped dome, and a brass orrery."
      : level >= 2
        ? "A fine observatory — a great telescope, a star globe, and chart tables."
        : "A humble dome — a small telescope and the whole night sky above.";

  const handleChart = async () => {
    if (remaining > 0) {
      Alert.alert("The sky is mapped", `The current charts are drying on the table.\n\nChart new stars in about ${formatCooldown(remaining)}.`);
      return;
    }
    const xp = scaledXP(CHART_XP[level] ?? 10);
    const t = Date.now();
    setLastChart(t);
    await AsyncStorage.setItem(CHART_KEY, String(t)).catch(() => undefined);
    addCoins(0);
    awardCustomXP(xp, `observatory-chart-${t}`).catch(() => undefined);
    Alert.alert("Stars Charted", `You trace a new constellation — "He counts the number of the stars; He calls them all by name."\n\n+${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="star" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="star"
          iconColor={ACCENT}
          title="Observatory"
          blurb={`A dome under the open sky. ${levelBlurb}`}
          accent="#26354D"
        />

        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#26354D",
            overflow: "hidden",
            backgroundColor: level >= 3 ? "#16233A" : "#141F33",
            position: "relative",
          }}
        >
          <StarField count={level >= 3 ? 34 : 22} seed={level} />
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="observatory" />

          {/* telescopes */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8 }}>
            <Telescope grand={level >= 3} />
            {level >= 3 && <Telescope />}
          </View>

          {/* stargazers */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8, minHeight: 84 }}>
            {stargazers[0] && (
              <GentleBob delay={150}>
                <StandingFigure person={stargazers[0]} delay={150} icon="star" iconColor="#FDE68A" showLabel />
              </GentleBob>
            )}
            {pawn && (
              <GentleBob delay={400}>
                <View style={{ alignItems: "center", marginHorizontal: 8 }}>
                  <SoftPulse duration={1800}>
                    <MaterialIcons name="visibility" size={15} color={ACCENT} style={{ marginBottom: 1 }} />
                  </SoftPulse>
                  <PawnPreview pawn={pawn} size={44} />
                  <FigureName name={pawn.name} color="#7FA8C9" />
                </View>
              </GentleBob>
            )}
            {stargazers[1] && (
              <GentleBob delay={650}>
                <StandingFigure person={stargazers[1]} delay={650} icon="nights-stay" iconColor="#FDE68A" showLabel />
              </GentleBob>
            )}
            {level >= 3 && stargazers[2] && (
              <GentleBob delay={900}>
                <StandingFigure person={stargazers[2]} delay={900} icon="star" iconColor="#FDE68A" showLabel />
              </GentleBob>
            )}
          </View>

          {/* instruments */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 10 }}>
            <ChartTable />
            {level >= 2 && <PlanetGlobe />}
            {level >= 3 && <Orrery />}
          </View>
          {charting && (
            <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 4 }}>
              <WorkingFigure person={charting} delay={500} icon="map" iconColor={ACCENT} showLabel />
            </View>
          )}

          {/* gallery rail */}
          <View style={{ marginTop: 10, marginBottom: 4, marginHorizontal: 20 }}>
            <View style={{ height: 6, backgroundColor: "#475569", borderRadius: 3 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginHorizontal: 10 }}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={{ width: 4, height: 16, backgroundColor: "#475569", borderRadius: 2 }} />
              ))}
            </View>
          </View>
          <View style={{ height: 26, backgroundColor: "#0B1220" }}>
            <View style={{ height: 3, backgroundColor: "#1E293B" }} />
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Chart the Stars"}
          onPrimary={handleChart}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "Twin telescopes, a star-mapped dome, and a brass orrery." : "A great telescope, a star globe, and wider chart tables."
            )
          }
        />
        <PlayCard
          icon="star"
          title="Play: Chart the Stars"
          blurb="Constellations light star by star — tap them in order and draw the chart."
          playsLeft={stars.playsLeft}
          cap={stars.cap}
          accent={ACCENT}
          onPlay={() => stars.setPlaying(true)}
        />
        {stars.playing && <StarsGame accent={ACCENT} onComplete={stars.handleComplete} onExit={() => stars.setPlaying(false)} />}
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Chart the stars once an hour. The heavens declare His glory — pure XP.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Opening the dome…</Text>}
      </ScrollView>
    </View>
  );
}
