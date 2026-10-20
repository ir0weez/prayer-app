// Carpenter's Workshop interior: the smell of sawdust and fresh-cut pine.
// Villagers saw and hammer at workbenches, planks and finished furniture
// stack the walls, and the pawn helps build.
// "Help Build" grants coins + XP on a 1-hour cooldown.
// L1: one bench, hand tools. L2: two benches, log rack, hanging lamp.
// L3: grand timber hall, three benches, tool wall, skylight.
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

const BG = "#F5EBD7";
const WOOD = "#A9713F";
const WOOD_DARK = "#7A5230";
const WOOD_DEEP = "#5E3D22";
const TEXT_DIM = "#9A7B55";
const ACCENT = "#92400E";

const BUILD_COINS: Record<number, number> = { 1: 50, 2: 100, 3: 180 };
const BUILD_XP: Record<number, number> = { 1: 4, 2: 8, 3: 14 };
const COOLDOWN_MS = 60 * 60 * 1000;
const BUILD_KEY = "prayercircle.interior.carpenter.build.v1";

/** A workbench with a half-built chair and a saw resting on it. */
function Workbench({ tint = WOOD }: { tint?: string }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <Svg width={128} height={72} viewBox="0 0 128 72">
        {/* half-built chair */}
        <Rect x={46} y={8} width={36} height={6} rx={3} fill={WOOD_DEEP} />
        <Rect x={48} y={14} width={5} height={22} fill={WOOD_DEEP} />
        <Rect x={75} y={14} width={5} height={22} fill={WOOD_DEEP} />
        {/* bench top */}
        <Rect x={6} y={34} width={116} height={12} rx={4} fill={tint} stroke={WOOD_DEEP} strokeWidth={2} />
        <Line x1={6} y1={40} x2={122} y2={40} stroke={WOOD_DEEP} strokeWidth={1} opacity={0.5} />
        {/* legs */}
        <Rect x={14} y={46} width={8} height={22} fill={WOOD_DEEP} />
        <Rect x={106} y={46} width={8} height={22} fill={WOOD_DEEP} />
        {/* saw */}
        <Path d="M84 30 L112 18 L114 24 L86 36 Z" fill="#D1D5DB" stroke="#6B7280" strokeWidth={1.5} />
        <Rect x={78} y={28} width={12} height={8} rx={3} fill={WOOD_DEEP} transform="rotate(-24 84 32)" />
        {/* wood shavings */}
        <Path d="M28 32 q4 -4 8 0 q4 4 8 0" stroke="#E8B44C" strokeWidth={2} fill="none" strokeLinecap="round" />
        <Path d="M52 33 q4 -3 8 0" stroke="#E8B44C" strokeWidth={2} fill="none" strokeLinecap="round" />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Workbench</Text>
    </View>
  );
}

/** Stacked lumber against the wall. */
function LumberStack() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <Svg width={70} height={80} viewBox="0 0 70 80">
        {[0, 1, 2, 3].map((r) => (
          <G key={r}>
            {[0, 1, 2].map((c) => (
              <G key={c}>
                <Rect x={8 + c * 18} y={56 - r * 14} width={16} height={12} rx={2} fill={r % 2 ? "#C69A63" : "#B9834F"} stroke={WOOD_DEEP} strokeWidth={1.5} />
                <Circle cx={16 + c * 18} cy={62 - r * 14} r={3} fill="#E8D2A8" />
              </G>
            ))}
          </G>
        ))}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Lumber</Text>
    </View>
  );
}

/** A wall of hand tools — saws, hammers, squares (L3). */
function ToolWall() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <Svg width={150} height={64} viewBox="0 0 150 64">
        <Rect x={4} y={4} width={142} height={56} rx={6} fill={WOOD_DEEP} />
        {/* hanging saw */}
        <Path d="M22 14 L44 14 L42 40 L20 40 Z" fill="#D1D5DB" stroke="#6B7280" strokeWidth={1.5} />
        <Rect x={30} y={40} width={6} height={12} rx={3} fill={WOOD} />
        {/* hammer */}
        <Rect x={62} y={12} width={5} height={34} rx={2} fill={WOOD} />
        <Rect x={52} y={10} width={26} height={10} rx={3} fill="#6B7280" />
        {/* square */}
        <Path d="M96 12 h22 v6 h-16 v26 h-6 Z" fill="#E8B44C" stroke="#8A6D1C" strokeWidth={1.5} />
        {/* chisels */}
        <Rect x={126} y={14} width={4} height={24} fill="#9CA3AF" />
        <Rect x={124} y={36} width={8} height={10} rx={3} fill={WOOD} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Tool wall</Text>
    </View>
  );
}

/** Finished furniture display (L2+). */
function FinishedGoods({ level }: { level: number }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <Svg width={110} height={72} viewBox="0 0 110 72">
        {/* chair */}
        <Rect x={10} y={30} width={30} height={6} rx={3} fill={WOOD_DEEP} />
        <Rect x={12} y={36} width={5} height={28} fill={WOOD_DEEP} />
        <Rect x={33} y={36} width={5} height={28} fill={WOOD_DEEP} />
        <Rect x={12} y={10} width={5} height={22} fill={WOOD_DEEP} />
        <Rect x={10} y={8} width={30} height={6} rx={3} fill={WOOD_DEEP} />
        {/* small table */}
        <Rect x={58} y={40} width={40} height={6} rx={3} fill={level >= 3 ? "#C9963C" : WOOD} stroke={level >= 3 ? "#8A6D1C" : "none"} />
        <Rect x={62} y={46} width={6} height={20} fill={WOOD_DEEP} />
        <Rect x={88} y={46} width={6} height={20} fill={WOOD_DEEP} />
        {level >= 3 && <Circle cx={78} cy={34} r={7} fill="#C9963C" stroke="#8A6D1C" strokeWidth={1.5} />}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Finished goods</Text>
    </View>
  );
}

export default function CarpenterInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastBuild, setLastBuild] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(BUILD_KEY).catch(() => null);
      setLastBuild(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastBuild + COOLDOWN_MS - Date.now());
  const sawing = pickPeople(people, `carpenter|${building?.id ?? "carpenter"}|saw`, 2);
  const hammering = pickPeople(people, `carpenter|${building?.id ?? "carpenter"}|hammer`, 1)[0];
  const browsing = pickPeople(people, `carpenter|${building?.id ?? "carpenter"}|browse`, 1)[0];

  const levelBlurb =
    level >= 3
      ? "A grand timber hall — three benches, a tool wall, and a skylight over the sawdust."
      : level >= 2
        ? "A busy workshop — two benches, stacked lumber, and a warm hanging lamp."
        : "A humble workshop — one bench, hand tools, and the smell of fresh pine.";

  const handleBuild = async () => {
    if (remaining > 0) {
      Alert.alert("The glue is drying", `The villagers are finishing the current piece.\n\nHelp build again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(BUILD_COINS[level] ?? 5);
    const xp = scaledXP(BUILD_XP[level] ?? 4);
    const t = Date.now();
    setLastBuild(t);
    await AsyncStorage.setItem(BUILD_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `carpenter-build-${t}`).catch(() => undefined);
    Alert.alert("Well Built", `You plane a board true and help raise a sturdy chair.\n\n+${c.toFixed(2)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="handyman" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="carpenter"
          iconColor={ACCENT}
          title="Carpenter's Workshop"
          blurb={`Saws and hammers ring through the shop. ${levelBlurb}`}
          accent="#EAD3A8"
        />

        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#EAD3A8",
            overflow: "hidden",
            backgroundColor: level >= 3 ? "#F8EFDD" : "#F3E7CE",
          }}
        >
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="carpenter" />

          {/* skylight glow at L3 */}
          {level >= 3 && (
            <View style={{ alignItems: "center", marginTop: 6 }}>
              <Svg width={120} height={26} viewBox="0 0 120 26">
                <Rect x={30} y={2} width={60} height={18} rx={6} fill="#BEE3F8" stroke={WOOD_DEEP} strokeWidth={2.5} />
                <Line x1={60} y1={2} x2={60} y2={20} stroke={WOOD_DEEP} strokeWidth={2} />
                <Circle cx={74} cy={9} r={5} fill="#FFF7D6" />
              </Svg>
            </View>
          )}

          {/* workbenches */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 6 }}>
            <Workbench />
            {level >= 2 && <Workbench tint="#B9834F" />}
            {level >= 3 && <Workbench tint="#C69A63" />}
          </View>

          {/* villagers at work */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8, minHeight: 84 }}>
            {sawing[0] && (
              <GentleBob delay={150}>
                <WorkingFigure person={sawing[0]} delay={150} icon="handyman" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
            {pawn && (
              <GentleBob delay={400}>
                <View style={{ alignItems: "center", marginHorizontal: 8 }}>
                  <SoftPulse duration={1800}>
                    <MaterialIcons name="hardware" size={15} color={ACCENT} style={{ marginBottom: 1 }} />
                  </SoftPulse>
                  <PawnPreview pawn={pawn} size={44} />
                  <FigureName name={pawn.name} color="#92400E" />
                </View>
              </GentleBob>
            )}
            {sawing[1] && (
              <GentleBob delay={650}>
                <WorkingFigure person={sawing[1]} delay={650} icon="construction" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
            {level >= 3 && hammering && (
              <GentleBob delay={900}>
                <WorkingFigure person={hammering} delay={900} icon="handyman" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
          </View>

          {/* side goods */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8 }}>
            <LumberStack />
            {level >= 2 && <FinishedGoods level={level} />}
            {level >= 3 && <ToolWall />}
          </View>
          {browsing && level >= 2 && (
            <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 4 }}>
              <StandingFigure person={browsing} delay={500} icon="chair" iconColor={ACCENT} showLabel />
            </View>
          )}

          <View style={{ height: 26, backgroundColor: "#C89B62", marginTop: 10 }}>
            <View style={{ height: 3, backgroundColor: "#B08A54" }} />
            <View style={{ height: 4, backgroundColor: "#E8B44C", opacity: 0.35, marginTop: 5, marginHorizontal: 40, borderRadius: 2 }} />
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Help Build"}
          onPrimary={handleBuild}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "A grand timber hall — three benches, a wall of hand tools, and a skylight." : "A second bench, stacked lumber, and finished goods on display."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Help build once an hour. Finer tools mean finer furniture.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Sweeping the sawdust…</Text>}
      </ScrollView>
    </View>
  );
}
