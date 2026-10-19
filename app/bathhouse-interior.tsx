// Bathhouse interior: steam and warm pools for the weary. Villagers soak
// in tiled pools, rest on stone benches, and breathe the warm mist. The
// pawn rests in the waters too.
// "Rest in the Waters" grants a few coins + XP on a 1-hour cooldown.
// L1: one pool, bench. L2: two pools, columns, ferns.
// L3: grand bathhouse — three pools, waterfall, mosaics, skylight.
// No emojis — SVG art and MaterialIcons only. Gentle sine-ease motion.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";
import {
  InteriorActions,
  InteriorBanner,
  InteriorHeader,
  useInteriorData,
} from "@/components/interior-shell";
import { GentleBob, SeatedFigure, SoftPulse, SwimmingFigure, FigureName, pickPeople } from "@/components/activity-figures";
import { PawnPreview } from "@/components/pawn-preview";
import { formatCooldown } from "@/lib/gathering-places";
import { scaledCoins, scaledXP } from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";

const BG = "#EDF6FA";
const TILE = "#7DD3FC";
const TILE_DARK = "#0369A1";
const TEXT_DIM = "#7FA3B8";
const ACCENT = "#0284C7";

const REST_COINS: Record<number, number> = { 1: 3, 2: 6, 3: 12 };
const REST_XP: Record<number, number> = { 1: 4, 2: 8, 3: 16 };
const COOLDOWN_MS = 60 * 60 * 1000;
const REST_KEY = "prayercircle.interior.bathhouse.rest.v1";

/** Rising steam wisps. */
function Steam({ x = 0 }: { x?: number }) {
  return (
    <View style={{ position: "absolute", top: -46, left: x }}>
      <GentleBob delay={x * 7} amount={4}>
        <Svg width={120} height={60} viewBox="0 0 120 60">
          <Path d="M20 56 C16 44, 26 40, 22 30 C19 22, 24 18, 24 12" fill="none" stroke="#E0F2FE" strokeWidth={5} strokeLinecap="round" opacity={0.85} />
          <Path d="M52 56 C48 46, 58 42, 54 32 C51 25, 56 20, 56 14" fill="none" stroke="#F0F9FF" strokeWidth={5} strokeLinecap="round" opacity={0.8} />
          <Path d="M84 56 C80 46, 90 42, 86 32" fill="none" stroke="#E0F2FE" strokeWidth={5} strokeLinecap="round" opacity={0.75} />
        </Svg>
      </GentleBob>
    </View>
  );
}

/** A tiled soaking pool with rippling water. */
function SoakPool({ wide = false, mosaic = false }: { wide?: boolean; mosaic?: boolean }) {
  const W = wide ? 200 : 150;
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6, position: "relative" }}>
      <Steam x={wide ? 40 : 15} />
      <Svg width={W} height={76} viewBox={`0 0 ${W} 76`}>
        {/* tile rim */}
        <Rect x={4} y={8} width={W - 8} height={60} rx={14} fill={mosaic ? "#0EA5E9" : "#38BDF8"} stroke={TILE_DARK} strokeWidth={3} />
        {/* water */}
        <Ellipse cx={W / 2} cy={38} rx={W / 2 - 14} ry={24} fill="#7DD3FC" />
        <Ellipse cx={W / 2} cy={36} rx={W / 2 - 24} ry={17} fill="#BAE6FD" opacity={0.85} />
        {/* ripples */}
        <Path d={`M${W / 2 - 40} 36 q8 -5 16 0 q8 5 16 0`} stroke="#FFFFFF" strokeWidth={2} fill="none" opacity={0.9} strokeLinecap="round" />
        <Path d={`M${W / 2 - 10} 44 q8 -5 16 0 q8 5 16 0`} stroke="#E0F2FE" strokeWidth={1.6} fill="none" opacity={0.9} strokeLinecap="round" />
        {mosaic && (
          <g>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Circle key={i} cx={20 + i * ((W - 40) / 5)} cy={64} r={4} fill="#FDE68A" opacity={0.9} />
            ))}
          </g>
        )}
        {/* mosaic band */}
        <Rect x={4} y={58} width={W - 8} height={10} rx={5} fill={TILE_DARK} opacity={0.55} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Warm pool</Text>
    </View>
  );
}

/** A stone bench with folded towels. */
function RestBench() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={110} height={56} viewBox="0 0 110 56">
        <Rect x={8} y={30} width={94} height={12} rx={5} fill="#CBD5E1" stroke="#64748B" strokeWidth={2} />
        <Rect x={16} y={42} width={10} height={12} fill="#94A3B8" />
        <Rect x={84} y={42} width={10} height={12} fill="#94A3B8" />
        {/* folded towels */}
        <Rect x={20} y={16} width={28} height={12} rx={5} fill="#F8FAFC" stroke="#94A3B8" strokeWidth={1.5} />
        <Rect x={54} y={18} width={24} height={10} rx={5} fill="#BAE6FD" stroke="#7FA8C9" strokeWidth={1.5} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Rest bench</Text>
    </View>
  );
}

/** A waterfall feature (L3). */
function Waterfall() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={90} height={110} viewBox="0 0 90 110">
        <Rect x={10} y={4} width={70} height={18} rx={6} fill="#78716C" stroke="#57534E" strokeWidth={2} />
        <Path d="M22 22 L22 92 M36 22 L36 96 M50 22 L50 92 M64 22 L64 96" stroke="#7DD3FC" strokeWidth={9} strokeLinecap="round" opacity={0.85} />
        <Path d="M29 22 L29 94 M43 22 L43 94 M57 22 L57 94" stroke="#BAE6FD" strokeWidth={4} strokeLinecap="round" opacity={0.9} />
        <Ellipse cx={45} cy={98} rx={34} ry={8} fill="#7DD3FC" opacity={0.7} />
        <Rect x={6} y={92} width={78} height={12} rx={6} fill="#38BDF8" stroke={TILE_DARK} strokeWidth={2} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Waterfall</Text>
    </View>
  );
}

/** A potted fern (L2+). */
function Fern() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={54} height={76} viewBox="0 0 54 76">
        <Path d="M14 52 L40 52 L36 72 L18 72 Z" fill="#B45309" stroke="#7A3606" strokeWidth={1.5} />
        {[0, 1, 2, 3, 4].map((i) => (
          <Path key={i} d={`M27 ${50 - i * 2} q${-18 + i * 4} -14 ${-8 + i * 5} -26 M27 ${50 - i * 2} q${18 - i * 4} -14 ${8 - i * 5} -26`} stroke="#2F8F4E" strokeWidth={3.5} fill="none" strokeLinecap="round" />
        ))}
      </Svg>
    </View>
  );
}

export default function BathhouseInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastRest, setLastRest] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(REST_KEY).catch(() => null);
      setLastRest(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastRest + COOLDOWN_MS - Date.now());
  const soaking = pickPeople(people, `bathhouse|${building?.id ?? "bathhouse"}|soak`, 3);
  const resting = pickPeople(people, `bathhouse|${building?.id ?? "bathhouse"}|bench`, 1)[0];

  const levelBlurb =
    level >= 3
      ? "A grand bathhouse — three mosaic pools, a waterfall, and steam in the skylight."
      : level >= 2
        ? "A fine bathhouse — two warm pools, stone columns, and potted ferns."
        : "A humble bathhouse — one warm pool, a stone bench, and rising steam.";

  const handleRest = async () => {
    if (remaining > 0) {
      Alert.alert("The waters settle", `You are already refreshed.\n\nRest again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(REST_COINS[level] ?? 3);
    const xp = scaledXP(REST_XP[level] ?? 4);
    const t = Date.now();
    setLastRest(t);
    await AsyncStorage.setItem(REST_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `bathhouse-rest-${t}`).catch(() => undefined);
    Alert.alert("Refreshed", `You sink into the warm water and let the weariness go.\n\n+${c.toFixed(2)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="waves" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="spa"
          iconColor={ACCENT}
          title="Bathhouse"
          blurb={`Steam and warm pools for the weary. ${levelBlurb}`}
          accent="#CDEBF7"
        />

        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#CDEBF7",
            overflow: "hidden",
            backgroundColor: level >= 3 ? "#F2FAFE" : "#EEF7FC",
          }}
        >
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="bathhouse" />

          {/* pools */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 14 }}>
            <SoakPool mosaic={level >= 3} />
            {level >= 2 && <SoakPool />}
            {level >= 3 && <SoakPool wide mosaic />}
          </View>

          {/* villagers soaking */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8, minHeight: 70 }}>
            {soaking[0] && <SwimmingFigure person={soaking[0]} delay={150} />}
            {pawn && (
              <GentleBob delay={400}>
                <View style={{ alignItems: "center", marginHorizontal: 6 }}>
                  <SoftPulse duration={1800}>
                    <MaterialIcons name="spa" size={15} color={ACCENT} style={{ marginBottom: 1 }} />
                  </SoftPulse>
                  <PawnPreview pawn={pawn} size={44} />
                  <FigureName name={pawn.name} color="#0284C7" />
                </View>
              </GentleBob>
            )}
            {soaking[1] && <SwimmingFigure person={soaking[1]} delay={650} />}
            {level >= 3 && soaking[2] && <SwimmingFigure person={soaking[2]} delay={900} />}
          </View>

          {/* benches, ferns, waterfall */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8 }}>
            <RestBench />
            {resting && (
              <GentleBob delay={300}>
                <SeatedFigure person={resting} delay={300} chairColor="#CBD5E1" chairBorder="#64748B" />
              </GentleBob>
            )}
            {level >= 2 && <Fern />}
            {level >= 2 && <Fern />}
            {level >= 3 && <Waterfall />}
          </View>

          {/* tiled floor */}
          <View style={{ height: 26, backgroundColor: "#BAE6FD", marginTop: 10 }}>
            <View style={{ height: 3, backgroundColor: "#7DD3FC" }} />
            <View style={{ flexDirection: "row", marginTop: 6, marginHorizontal: 20 }}>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <View key={i} style={{ flex: 1, height: 8, backgroundColor: i % 2 ? "#7DD3FC" : "#BAE6FD", borderWidth: 0.5, borderColor: "#38BDF8" }} />
              ))}
            </View>
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Rest in the Waters"}
          onPrimary={handleRest}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "Three mosaic pools, a waterfall, and steam rising to a skylight." : "A second pool, stone columns, and potted ferns."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Rest in the waters once an hour. Come out new.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Heating the pools…</Text>}
      </ScrollView>
    </View>
  );
}
