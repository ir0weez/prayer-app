// Opera House interior: velvet and gold, the hush before the overture.
// Singers perform on the grand stage, the orchestra tunes in the pit,
// and villagers fill the box seats. The pawn attends from the front row.
// "Attend the Opera" grants coins + XP on a 1-hour cooldown.
// L1: stage, curtains, few seats. L2: boxes, chandelier, orchestra pit.
// L3: grand opera house — golden proscenium, full orchestra, royal box.
// No emojis — SVG art and MaterialIcons only. Gentle sine-ease motion.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Ellipse, Line, Path, Rect } from "react-native-svg";
import {
  InteriorActions,
  InteriorBanner,
  InteriorHeader,
  useInteriorData,
} from "@/components/interior-shell";
import { GentleBob, SingingFigure, SoftPulse, WatchingFigure, FigureName, pickPeople } from "@/components/activity-figures";
import { PawnPreview } from "@/components/pawn-preview";
import { formatCooldown } from "@/lib/gathering-places";
import { scaledCoins, scaledXP } from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";

const BG = "#F7ECEE";
const VELVET = "#A31621";
const VELVET_DARK = "#7A1020";
const GOLD = "#C9963C";
const TEXT_DIM = "#A08787";
const ACCENT = "#B4232F";

const OPERA_COINS: Record<number, number> = { 1: 8, 2: 16, 3: 30 };
const OPERA_XP: Record<number, number> = { 1: 6, 2: 12, 3: 22 };
const COOLDOWN_MS = 60 * 60 * 1000;
const OPERA_KEY = "prayercircle.interior.operahouse.attend.v1";

/** The grand proscenium stage with curtains. */
function GrandStage({ level }: { level: number }) {
  const W = level >= 3 ? 300 : 260;
  return (
    <View style={{ alignItems: "center", marginTop: 8 }}>
      <Svg width={W} height={130} viewBox={`0 0 ${W} 130`}>
        {/* proscenium arch */}
        <Rect x={6} y={4} width={W - 12} height={76} rx={10} fill="#2B2118" stroke={level >= 3 ? GOLD : "#5E3D22"} strokeWidth={level >= 3 ? 4 : 2.5} />
        {/* golden inner trim at L3 */}
        {level >= 3 && <Rect x={16} y={14} width={W - 32} height={56} rx={8} fill="none" stroke={GOLD} strokeWidth={2} opacity={0.8} />}
        {/* curtains */}
        <Path d={`M10 8 q30 34 12 72 L10 80 Z`} fill={VELVET} stroke={VELVET_DARK} strokeWidth={1.5} />
        <Path d={`M${W - 10} 8 q-30 34 -12 72 L${W - 10} 80 Z`} fill={VELVET} stroke={VELVET_DARK} strokeWidth={1.5} />
        <Rect x={10} y={8} width={W - 20} height={12} rx={6} fill={VELVET_DARK} />
        {/* stage floor */}
        <Rect x={4} y={80} width={W - 8} height={16} rx={4} fill="#8A5A2B" stroke="#5E3D22" strokeWidth={2} />
        <Rect x={4} y={96} width={W - 8} height={12} rx={4} fill="#5E3D22" />
        {/* footlights */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <g key={i}>
            <Circle cx={28 + i * ((W - 56) / 5)} cy={80} r={5.5} fill="#FDE68A" stroke="#8A6D1C" strokeWidth={1.5} />
          </g>
        ))}
        {/* spotlight beams */}
        <Path d={`M${W / 2 - 60} 8 L${W / 2 - 20} 80 L${W / 2 - 44} 80 Z`} fill="#FFF7D6" opacity={0.18} />
        <Path d={`M${W / 2 + 60} 8 L${W / 2 + 20} 80 L${W / 2 + 44} 80 Z`} fill="#FFF7D6" opacity={0.18} />
      </Svg>
    </View>
  );
}

/** The orchestra pit with tiny instruments (L2+). */
function OrchestraPit({ level }: { level: number }) {
  const players = level >= 3 ? 5 : 3;
  return (
    <View style={{ alignItems: "center", marginTop: -4 }}>
      <Svg width={220} height={40} viewBox="0 0 220 40">
        <Rect x={10} y={6} width={200} height={28} rx={10} fill="#1F2937" stroke="#374151" strokeWidth={2} />
        {Array.from({ length: players }).map((_, i) => (
          <g key={i}>
            <Circle cx={40 + i * 36} cy={16} r={7} fill="#D6A87C" />
            <Rect x={33 + i * 36} y={22} width={14} height={8} rx={3} fill="#7A5230" />
            {/* tiny violin */}
            <Ellipse cx={52 + i * 36} cy={24} rx={7} ry={5} fill="#8A5A2B" stroke="#5E3D22" strokeWidth={1.2} transform={`rotate(-20 ${52 + i * 36} 24)`} />
            <Line x1={56 + i * 36} y1={20} x2={66 + i * 36} y2={12} stroke="#5E3D22" strokeWidth={2} />
          </g>
        ))}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Orchestra pit</Text>
    </View>
  );
}

/** Box seats along the sides (L2+). */
function BoxSeats({ level }: { level: number }) {
  const boxes = level >= 3 ? 3 : 2;
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginHorizontal: 18, marginTop: 6 }}>
      {[0, 1].map((side) => (
        <View key={side} style={{ alignItems: "center" }}>
          {Array.from({ length: boxes }).map((_, i) => (
            <View key={i} style={{ width: 52, height: 26, borderRadius: 6, backgroundColor: VELVET, borderWidth: 2, borderColor: level >= 3 ? GOLD : VELVET_DARK, marginBottom: 6, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 36, height: 10, borderRadius: 4, backgroundColor: VELVET_DARK, opacity: 0.7 }} />
            </View>
          ))}
          <Text style={{ fontSize: 8, color: TEXT_DIM }}>Boxes</Text>
        </View>
      ))}
    </View>
  );
}

/** The grand chandelier (L2+, grander at L3). */
function OperaChandelier({ grand = false }: { grand?: boolean }) {
  const drops = grand ? 7 : 5;
  return (
    <View style={{ alignItems: "center" }}>
      <SoftPulse duration={2800}>
        <Svg width={grand ? 170 : 130} height={grand ? 96 : 76} viewBox={`0 0 ${grand ? 170 : 130} ${grand ? 96 : 76}`}>
          <Ellipse cx={(grand ? 170 : 130) / 2} cy={(grand ? 96 : 76) / 2} rx={70} ry={36} fill="#FFE9A8" opacity={0.25} />
          <Line x1={(grand ? 170 : 130) / 2} y1={0} x2={(grand ? 170 : 130) / 2} y2={12} stroke="#8A6D1C" strokeWidth={4} />
          <Ellipse cx={(grand ? 170 : 130) / 2} cy={50} rx={grand ? 56 : 42} ry={12} fill="none" stroke={GOLD} strokeWidth={4} />
          {Array.from({ length: drops }).map((_, i) => {
            const cx = 25 + i * ((grand ? 120 : 80) / (drops - 1));
            return (
              <g key={i}>
                <Line x1={(grand ? 170 : 130) / 2} y1={14} x2={cx} y2={50} stroke={GOLD} strokeWidth={2.5} />
                <Circle cx={cx} cy={46} r={4.5} fill="#FFF7D6" />
                <Line x1={cx} y1={62} x2={cx} y2={72} stroke="#BFDCEF" strokeWidth={1.5} />
                <Circle cx={cx} cy={76} r={3.5} fill="#DFF2FD" stroke="#9FB3C8" strokeWidth={1} />
              </g>
            );
          })}
        </Svg>
      </SoftPulse>
    </View>
  );
}

export default function OperaHouseInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastOpera, setLastOpera] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(OPERA_KEY).catch(() => null);
      setLastOpera(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastOpera + COOLDOWN_MS - Date.now());
  const singers = pickPeople(people, `operahouse|${building?.id ?? "operahouse"}|sing`, level >= 3 ? 3 : 2);
  const audience = pickPeople(people, `operahouse|${building?.id ?? "operahouse"}|watch`, 3);

  const levelBlurb =
    level >= 3
      ? "A grand opera house — golden proscenium, full orchestra, and the royal box."
      : level >= 2
        ? "A fine opera house — box seats, a chandelier, and the orchestra pit."
        : "A humble stage — velvet curtains, a few singers, and an eager crowd.";

  const handleOpera = async () => {
    if (remaining > 0) {
      Alert.alert("Intermission", `The curtain will rise again soon.\n\nAttend the next performance in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(OPERA_COINS[level] ?? 8);
    const xp = scaledXP(OPERA_XP[level] ?? 6);
    const t = Date.now();
    setLastOpera(t);
    await AsyncStorage.setItem(OPERA_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `operahouse-attend-${t}`).catch(() => undefined);
    Alert.alert("Bravo!", `The final aria soars — the hall erupts in applause.\n\n+${c.toFixed(2)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="theater-comedy" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="music-note"
          iconColor={ACCENT}
          title="Opera House"
          blurb={`Velvet and gold, the hush before the overture. ${levelBlurb}`}
          accent="#F3D9D9"
        />

        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#F3D9D9",
            overflow: "hidden",
            backgroundColor: level >= 3 ? "#FBF1F1" : "#F8EAEA",
          }}
        >
          {level >= 2 && <OperaChandelier grand={level >= 3} />}
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="opera-house" />

          <GrandStage level={level} />

          {/* singers on stage */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: -36, minHeight: 92, zIndex: 2 }}>
            {singers.map((p, i) => (
              <GentleBob key={p.id} delay={150 + i * 250}>
                <SingingFigure person={p} delay={150 + i * 250} showLabel={i === 0} />
              </GentleBob>
            ))}
          </View>

          {level >= 2 && <OrchestraPit level={level} />}
          {level >= 2 && <BoxSeats level={level} />}

          {/* audience: pawn + villagers watching */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8, minHeight: 80 }}>
            {audience[0] && <WatchingFigure person={audience[0]} delay={200} />}
            {pawn && (
              <GentleBob delay={450}>
                <View style={{ alignItems: "center", marginHorizontal: 6 }}>
                  <SoftPulse duration={1800}>
                    <MaterialIcons name="theater-comedy" size={15} color={ACCENT} style={{ marginBottom: 1 }} />
                  </SoftPulse>
                  <PawnPreview pawn={pawn} size={44} />
                  <FigureName name={pawn.name} color="#B4232F" />
                </View>
              </GentleBob>
            )}
            {audience[1] && <WatchingFigure person={audience[1]} delay={650} />}
            {level >= 3 && audience[2] && <WatchingFigure person={audience[2]} delay={850} />}
          </View>

          {/* seat rows */}
          <View style={{ alignItems: "center", marginTop: 4, marginBottom: 6 }}>
            {[0, 1].map((r) => (
              <View key={r} style={{ flexDirection: "row", marginTop: 3 }}>
                {[0, 1, 2, 3, 4, 5].map((c) => (
                  <View key={c} style={{ width: 26, height: 12, borderRadius: 4, backgroundColor: VELVET, borderWidth: 1, borderColor: VELVET_DARK, marginHorizontal: 2 }} />
                ))}
              </View>
            ))}
          </View>

          <View style={{ height: 26, backgroundColor: "#C89B8B" }}>
            <View style={{ height: 3, backgroundColor: "#B08070" }} />
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Attend the Opera"}
          onPrimary={handleOpera}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "A grand opera house — golden proscenium, full orchestra, royal box." : "Box seats, a chandelier, and the orchestra pit."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Attend the opera once an hour. Every performance ends in applause.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Raising the curtain…</Text>}
      </ScrollView>
    </View>
  );
}
