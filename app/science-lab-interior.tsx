// Science Lab interior (School Campus): benches and glass that grow with
// level — L1 one bench with flasks, L2 a jar shelf and a microscope, L3 a
// greenhouse window full of growing things. "Run an Experiment" grants
// coins + XP on a 1-hour cooldown. While the Science Lab stands, Garden
// Tending records an extra flower per completed session (lib/school-perks.ts).
// No emojis — SVG art and MaterialIcons only.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";
import { formatCooldown } from "@/lib/gathering-places";
import { awardCustomXP } from "@/lib/xp-engine";
import { scaledCoins, scaledXP } from "@/lib/hometown";
import { PawnPreview } from "@/components/pawn-preview";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";
import {
  useInteriorData,
  InteriorHeader,
  InteriorBanner,
  InteriorActions,
} from "@/components/interior-shell";
import { FigureName, SoftPulse } from "@/components/activity-figures";

const BG = "#EFFAF6";
const WOOD = "#8B5E34";
const ACCENT = "#0F766E";
const ACCENT_DARK = "#115E59";
const TEXT_DIM = "#6B8F88";

const EXPERIMENT_KEY = "prayercircle.interior.sciencelab.experiment.v1";
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const ACTION_COINS: Record<1 | 2 | 3, number> = { 1: 14, 2: 26, 3: 44 };
const ACTION_XP: Record<1 | 2 | 3, number> = { 1: 12, 2: 20, 3: 34 };

const LIQUIDS = ["#38BDF8", "#F472B6", "#A3E635", "#FBBF24"];

/** A lab bench with flasks and beakers. */
function Bench({ seed = 0, microscope = false }: { seed?: number; microscope?: boolean }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={150} height={86} viewBox="0 0 150 86">
        {/* vessels on the bench */}
        <Rect x={14} y={26} width={13} height={24} rx={2} fill="#E0F2FE" stroke={ACCENT_DARK} strokeWidth={1.4} />
        <Rect x={14} y={36} width={13} height={14} fill={LIQUIDS[seed % 4]} opacity={0.85} />
        <Path d="M44 50 L52 28 L60 50 Z" fill="#E0F2FE" stroke={ACCENT_DARK} strokeWidth={1.4} />
        <Path d="M47.5 42 L56.5 42 L60 50 L44 50 Z" fill={LIQUIDS[(seed + 1) % 4]} opacity={0.85} />
        <Circle cx={52} cy={45} r={1.8} fill="#FFFFFF" opacity={0.8} />
        <Rect x={70} y={32} width={15} height={18} rx={2} fill="#E0F2FE" stroke={ACCENT_DARK} strokeWidth={1.4} />
        <Rect x={70} y={40} width={15} height={10} fill={LIQUIDS[(seed + 2) % 4]} opacity={0.85} />
        {microscope ? (
          <G>
            <Rect x={104} y={40} width={18} height={4} rx={2} fill="#1F2937" />
            <Rect x={112} y={18} width={4} height={24} fill="#1F2937" />
            <Rect x={105} y={11} width={18} height={9} rx={3} fill="#334155" />
          </G>
        ) : (
          <G>
            <Rect x={102} y={22} width={11} height={28} rx={2} fill="#E0F2FE" stroke={ACCENT_DARK} strokeWidth={1.4} />
            <Rect x={102} y={34} width={11} height={16} fill={LIQUIDS[(seed + 3) % 4]} opacity={0.85} />
            <Circle cx={107.5} cy={40} r={1.6} fill="#FFFFFF" opacity={0.8} />
          </G>
        )}
        {/* bench */}
        <Rect x={4} y={50} width={142} height={8} rx={3} fill={WOOD} />
        <Rect x={12} y={58} width={7} height={24} fill="#6B4A2F" />
        <Rect x={131} y={58} width={7} height={24} fill="#6B4A2F" />
      </Svg>
    </View>
  );
}

/** A shelf of specimen jars (L2+). */
function JarShelf() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={104} height={64} viewBox="0 0 104 64">
        <Rect x={0} y={0} width={104} height={64} rx={5} fill={WOOD} />
        <Rect x={5} y={5} width={94} height={54} fill="#5E4630" />
        {[0, 1, 2, 3].map((i) => (
          <G key={i}>
            <Rect x={11 + i * 23} y={16} width={16} height={26} rx={3} fill="#E0F2FE" opacity={0.92} />
            <Rect x={11 + i * 23} y={26} width={16} height={16} rx={3} fill={LIQUIDS[i % 4]} opacity={0.75} />
            <Rect x={12 + i * 23} y={11} width={14} height={5} rx={2} fill="#94A3B8" />
          </G>
        ))}
        <Rect x={8} y={44} width={88} height={3} fill={WOOD} />
        <Rect x={8} y={8} width={88} height={3} fill={WOOD} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Specimens</Text>
    </View>
  );
}

/** A greenhouse window with growing plants (L3). */
function Greenhouse() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={132} height={86} viewBox="0 0 132 86">
        <Rect x={2} y={2} width={128} height={82} rx={6} fill="#E0F2FE" stroke={ACCENT_DARK} strokeWidth={2.5} />
        <Line x1={66} y1={2} x2={66} y2={84} stroke={ACCENT_DARK} strokeWidth={2} />
        <Line x1={2} y1={43} x2={130} y2={43} stroke={ACCENT_DARK} strokeWidth={2} />
        {/* sun */}
        <Circle cx={104} cy={20} r={9} fill="#FBBF24" />
        {/* plants on the sills */}
        {[22, 48, 84, 110].map((x, i) => (
          <G key={x}>
            <Path d={`M${x} 76 C ${x - 6} ${64 - (i % 2) * 4}, ${x - 2} 62, ${x} ${58 - (i % 2) * 5} C ${x + 2} 62, ${x + 6} ${64 - (i % 2) * 4}, ${x} 76 Z`} fill="#4D7C4D" />
            <Rect x={x - 6} y={76} width={12} height={7} rx={2} fill="#B0724A" />
          </G>
        ))}
        <Rect x={6} y={80} width={120} height={3} fill={ACCENT} opacity={0.5} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Greenhouse window</Text>
    </View>
  );
}

/** An element chart on the wall (L2+). */
function ElementChart() {
  const colors = ["#FCA5A5", "#FDBA74", "#FDE68A", "#A3E635", "#6EE7B7", "#67E8F9", "#93C5FD", "#C4B5FD", "#F0ABFC", "#FDA4AF"];
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={84} height={58} viewBox="0 0 84 58">
        <Rect x={0} y={0} width={84} height={58} rx={4} fill="#FFFFFF" stroke={ACCENT_DARK} strokeWidth={1.6} />
        {[0, 1, 2, 3].map((r) =>
          [0, 1, 2, 3, 4, 5].map((c) => (
            <Rect key={`${r}-${c}`} x={5 + c * 12.4} y={6 + r * 12} width={10} height={10} rx={2} fill={colors[(r * 6 + c) % colors.length]} opacity={0.85} />
          ))
        )}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Elements</Text>
    </View>
  );
}

export default function ScienceLabInteriorScreen() {
  const { coins, building, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastAction, setLastAction] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(EXPERIMENT_KEY);
        setLastAction(raw ? parseInt(raw, 10) || 0 : 0);
      } catch {}
    })();
  }, []);

  void building;
  const remaining = Math.max(0, lastAction + COOLDOWN_MS - Date.now());
  const actionCoins = scaledCoins(ACTION_COINS[level]);
  const actionXp = scaledXP(ACTION_XP[level]);

  const levelBlurb =
    level >= 3
      ? "A living lab — two benches, a microscope, and a greenhouse window where things are always growing."
      : level >= 2
        ? "A jar shelf and an element chart have joined the bench — real science happens here now."
        : "One bench, a few flasks, and big questions.";

  const handleAction = async () => {
    if (remaining > 0) {
      Alert.alert("Still Bubbling", `The last experiment is still settling.\n\nRun the next one in about ${formatCooldown(remaining)}.`);
      return;
    }
    const t = Date.now();
    setLastAction(t);
    await AsyncStorage.setItem(EXPERIMENT_KEY, String(t)).catch(() => undefined);
    addCoins(actionCoins);
    await awardCustomXP(actionXp, `sciencelab-experiment-${t}`).catch(() => undefined);
    Alert.alert("It Worked!", `The solution turns the exact color the book promised. Creation, carefully watched, teaches.\n\n+${actionCoins.toFixed(2)} coins, +${actionXp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="science" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="science"
          iconColor={ACCENT}
          title="The Lab"
          blurb={`Run an experiment — worth +${actionCoins.toFixed(2)} coins, +${actionXp} XP. ${levelBlurb}`}
          accent="#99F6E4"
        />

        <View style={{ marginHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: "#99F6E4", overflow: "hidden", backgroundColor: "#FAFDFB" }}>
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="science-lab" />

          {/* wall: element chart + specimen shelf */}
          {(level >= 2) && (
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-start", marginTop: 12, gap: 22 }}>
              <ElementChart />
              <JarShelf />
            </View>
          )}

          {level >= 3 && (
            <View style={{ alignItems: "center", marginTop: 10 }}>
              <Greenhouse />
            </View>
          )}

          {/* benches */}
          <View style={{ alignItems: "center", marginTop: 12, gap: 4 }}>
            <Bench seed={1} microscope={level >= 2} />
            {level >= 3 && <Bench seed={3} />}
          </View>

          {/* the hero, mid-experiment */}
          {pawn && (
            <View style={{ alignItems: "center", marginTop: 6 }}>
              <SoftPulse duration={2300}>
                <FigureName name={pawn.name} color={ACCENT_DARK} />
              </SoftPulse>
              <PawnPreview pawn={pawn} size={48} />
            </View>
          )}

          {/* tile floor */}
          <View style={{ height: 22, backgroundColor: "#D9EDE6", marginTop: 10 }}>
            <View style={{ height: 3, backgroundColor: ACCENT }} />
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Next experiment in ${formatCooldown(remaining)}` : "Run an Experiment"}
          onPrimary={handleAction}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() => handleUpgrade(level + 1 >= 3 ? "A second bench and a greenhouse window." : "A specimen shelf, an element chart, and a microscope.")}
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          While the Science Lab stands, Garden Tending records an extra flower in every completed session.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Washing the beakers…</Text>}
      </ScrollView>
    </View>
  );
}
