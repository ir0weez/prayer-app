// Museum interior: exhibits and artifacts telling the town's story.
// Villagers wander the galleries — ancient pottery, a great fossil, star
// maps, and paintings. The pawn tours the halls with them.
// "Tour the Halls" grants coins + XP on a 1-hour cooldown.
// L1: two galleries, rope barriers. L2: fossil hall, more exhibits.
// L3: grand museum — great fossil centerpiece, glass dome, gold frames.
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

const BG = "#F2EFE8";
const STONE = "#D6CDBB";
const STONE_DARK = "#8A7F6A";
const TEXT_DIM = "#A0977F";
const ACCENT = "#5B6B8C";
const GOLD = "#C9963C";

const TOUR_COINS: Record<number, number> = { 1: 70, 2: 140, 3: 260 };
const TOUR_XP: Record<number, number> = { 1: 5, 2: 10, 3: 20 };
const COOLDOWN_MS = 60 * 60 * 1000;
const TOUR_KEY = "prayercircle.interior.museum.tour.v1";

/** A framed painting on the gallery wall. */
function Painting({ w = 90, h = 70, art }: { w?: number; h?: number; art: "hills" | "sea" | "stars" }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <Svg width={w + 16} height={h + 16} viewBox={`0 0 ${w + 16} ${h + 16}`}>
        <Rect x={2} y={2} width={w + 12} height={h + 12} rx={4} fill={GOLD} stroke="#8A6D1C" strokeWidth={2.5} />
        <Rect x={8} y={8} width={w} height={h} fill="#F8FAFC" />
        {art === "hills" && (
          <G>
            <Rect x={8} y={8} width={w} height={h * 0.55} fill="#BAE6FD" />
            <Path d={`M8 ${8 + h * 0.7} L${8 + w * 0.35} ${8 + h * 0.3} L${8 + w * 0.6} ${8 + h * 0.65} L${8 + w} ${8 + h * 0.4} L${8 + w} ${8 + h} L8 ${8 + h} Z`} fill="#3E8E41" />
            <Circle cx={8 + w * 0.75} cy={8 + h * 0.25} r={h * 0.12} fill="#FDE68A" />
          </G>
        )}
        {art === "sea" && (
          <G>
            <Rect x={8} y={8} width={w} height={h * 0.5} fill="#7DD3FC" />
            <Rect x={8} y={8 + h * 0.5} width={w} height={h * 0.5} fill="#0E7490" />
            <Path d={`M${8 + w * 0.2} ${8 + h * 0.55} q10 -6 20 0 l-4 10 h-14 Z`} fill="#8A5A2B" />
            <Path d={`M${8 + w * 0.3} ${8 + h * 0.55} L${8 + w * 0.3} ${8 + h * 0.3} L${8 + w * 0.55} ${8 + h * 0.55} Z`} fill="#F8FAFC" />
          </G>
        )}
        {art === "stars" && (
          <G>
            <Rect x={8} y={8} width={w} height={h} fill="#0F172A" />
            {[[0.25, 0.3], [0.5, 0.2], [0.7, 0.45], [0.4, 0.6], [0.65, 0.7]].map(([fx, fy], i) => (
              <Circle key={i} cx={8 + w * fx} cy={8 + h * fy} r={2.2} fill="#FDE68A" />
            ))}
            <Path d={`M${8 + w * 0.25} ${8 + h * 0.3} L${8 + w * 0.5} ${8 + h * 0.2} L${8 + w * 0.7} ${8 + h * 0.45}`} stroke="#7FA8C9" strokeWidth={1.2} fill="none" />
          </G>
        )}
      </Svg>
    </View>
  );
}

/** A pottery artifact on a pedestal, behind rope. */
function ArtifactCase({ label }: { label: string }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <Svg width={90} height={120} viewBox="0 0 90 120">
        {/* pedestal */}
        <Rect x={28} y={84} width={34} height={28} fill={STONE} stroke={STONE_DARK} strokeWidth={2} />
        <Rect x={22} y={78} width={46} height={8} rx={2} fill={STONE_DARK} />
        {/* glass case */}
        <Rect x={18} y={14} width={54} height={66} rx={6} fill="#D9EDF5" opacity={0.45} stroke="#9FB3C8" strokeWidth={2.5} />
        {/* ancient pot */}
        <Path d="M38 66 C34 56, 38 48, 45 46 C52 48, 56 56, 52 66 Z" fill="#B45309" stroke="#7A3606" strokeWidth={2} />
        <Ellipse cx={45} cy={46} rx={7} ry={3} fill="#7A3606" />
        <Line x1={20} y1={22} x2={36} y2={70} stroke="#FFFFFF" strokeWidth={3} opacity={0.5} strokeLinecap="round" />
      </Svg>
      {/* rope barrier */}
      <Svg width={120} height={22} viewBox="0 0 120 22">
        <Line x1={6} y1={4} x2={6} y2={20} stroke={GOLD} strokeWidth={3} />
        <Line x1={114} y1={4} x2={114} y2={20} stroke={GOLD} strokeWidth={3} />
        <Path d="M6 8 Q60 24 114 8" stroke="#B91C1C" strokeWidth={3} fill="none" />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

/** The great fossil — a long-necked skeleton (L2+). */
function GreatFossil({ grand = false }: { grand?: boolean }) {
  const W = grand ? 260 : 200;
  return (
    <View style={{ alignItems: "center", marginTop: 8 }}>
      <Svg width={W} height={110} viewBox={`0 0 ${W} 110`}>
        {/* body */}
        <Path d={`M${W * 0.25} 70 Q${W * 0.5} 55 ${W * 0.7} 70`} stroke="#E8E0CE" strokeWidth={10} fill="none" strokeLinecap="round" />
        {/* long neck rising */}
        <Path d={`M${W * 0.7} 70 Q${W * 0.78} 40 ${W * 0.72} 18`} stroke="#E8E0CE" strokeWidth={8} fill="none" strokeLinecap="round" />
        {/* head */}
        <Ellipse cx={W * 0.72} cy={14} rx={12} ry={8} fill="#E8E0CE" />
        {/* tail */}
        <Path d={`M${W * 0.25} 70 Q${W * 0.15} 74 ${W * 0.08} 66`} stroke="#E8E0CE" strokeWidth={7} fill="none" strokeLinecap="round" />
        {/* ribs */}
        {[0.35, 0.42, 0.49, 0.56, 0.63].map((fx, i) => (
          <Line key={i} x1={W * fx} y1={64} x2={W * fx} y2={84} stroke="#D6CDBB" strokeWidth={3} />
        ))}
        {/* legs */}
        <Line x1={W * 0.38} y1={70} x2={W * 0.38} y2={100} stroke="#E8E0CE" strokeWidth={9} strokeLinecap="round" />
        <Line x1={W * 0.58} y1={70} x2={W * 0.58} y2={100} stroke="#E8E0CE" strokeWidth={9} strokeLinecap="round" />
        {/* mount base */}
        <Rect x={W * 0.3} y={98} width={W * 0.36} height={8} rx={4} fill={STONE_DARK} />
        {grand && (
          <G>
            <Circle cx={W * 0.5} cy={20} r={4} fill={GOLD} />
            <Path d={`M${W * 0.5} 26 L${W * 0.5} 52`} stroke={GOLD} strokeWidth={1.5} strokeDasharray="4 3" />
          </G>
        )}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>The Great Fossil</Text>
    </View>
  );
}

export default function MuseumInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastTour, setLastTour] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(TOUR_KEY).catch(() => null);
      setLastTour(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastTour + COOLDOWN_MS - Date.now());
  const touring = pickPeople(people, `museum|${building?.id ?? "museum"}|tour`, 4);
  const docent = pickPeople(people, `museum|${building?.id ?? "museum"}|docent`, 1)[0];

  const levelBlurb =
    level >= 3
      ? "A grand museum — the Great Fossil, a glass dome, and gold-framed masters."
      : level >= 2
        ? "A fine museum — the fossil hall, artifact cases, and painted galleries."
        : "A humble gallery — two exhibits, rope barriers, and stories on the walls.";

  const handleTour = async () => {
    if (remaining > 0) {
      Alert.alert("The halls are quiet", `You have seen every gallery for now.\n\nTour again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(TOUR_COINS[level] ?? 7);
    const xp = scaledXP(TOUR_XP[level] ?? 5);
    const t = Date.now();
    setLastTour(t);
    await AsyncStorage.setItem(TOUR_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `museum-tour-${t}`).catch(() => undefined);
    Alert.alert("Halls Toured", `You wander the galleries — every artifact a reminder of how far the town has come.\n\n+${c.toFixed(2)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="museum" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="account-balance"
          iconColor={ACCENT}
          title="Museum"
          blurb={`Exhibits and artifacts telling the town's story. ${levelBlurb}`}
          accent="#DCD4BE"
        />

        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#DCD4BE",
            overflow: "hidden",
            backgroundColor: level >= 3 ? "#F5F1E8" : "#F1ECE0",
          }}
        >
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="museum" />

          {/* gallery wall */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8 }}>
            <Painting art="hills" />
            <Painting art="sea" />
            {level >= 3 && <Painting art="stars" w={100} />}
          </View>

          {level >= 2 && <GreatFossil grand={level >= 3} />}

          {/* villagers touring */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8, minHeight: 84 }}>
            {touring[0] && (
              <GentleBob delay={150}>
                <StandingFigure person={touring[0]} delay={150} icon="visibility" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
            {pawn && (
              <GentleBob delay={400}>
                <View style={{ alignItems: "center", marginHorizontal: 8 }}>
                  <SoftPulse duration={1800}>
                    <MaterialIcons name="museum" size={15} color={ACCENT} style={{ marginBottom: 1 }} />
                  </SoftPulse>
                  <PawnPreview pawn={pawn} size={44} />
                  <FigureName name={pawn.name} color="#5B6B8C" />
                </View>
              </GentleBob>
            )}
            {touring[1] && (
              <GentleBob delay={650}>
                <StandingFigure person={touring[1]} delay={650} icon="photo" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
            {level >= 3 && touring[2] && (
              <GentleBob delay={900}>
                <StandingFigure person={touring[2]} delay={900} icon="visibility" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
          </View>

          {/* artifact cases */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 10 }}>
            <ArtifactCase label="Ancient vessel" />
            {level >= 2 && <ArtifactCase label="Star chart" />}
            {level >= 3 && <ArtifactCase label="First bell" />}
          </View>
          {docent && (
            <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 4 }}>
              <StandingFigure person={docent} delay={500} icon="record-voice-over" iconColor={ACCENT} showLabel />
            </View>
          )}

          {/* marble floor */}
          <View style={{ height: 26, backgroundColor: "#D6CDBB", marginTop: 10 }}>
            <View style={{ height: 3, backgroundColor: "#B8AE99" }} />
            <View style={{ flexDirection: "row", marginTop: 6, marginHorizontal: 40 }}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={{ flex: 1, height: 8, backgroundColor: i % 2 ? "#B8AE99" : "#D6CDBB", borderWidth: 0.5, borderColor: "#A89E8C" }} />
              ))}
            </View>
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Tour the Halls"}
          onPrimary={handleTour}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "The Great Fossil, a glass dome, and gold-framed masters." : "The fossil hall, artifact cases, and painted galleries."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Tour the halls once an hour. Remember where you came from.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Opening the galleries…</Text>}
      </ScrollView>
    </View>
  );
}
