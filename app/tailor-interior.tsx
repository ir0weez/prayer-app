// Tailor interior: cut and sewn to measure. Villagers sew at tables, bolts
// of fabric lean against the walls, a fitting room stands in the corner,
// and the pawn helps stitch a seam.
// "Help Sew" grants coins + XP on a 1-hour cooldown.
// L1: one sewing table, fabric shelf. L2: two tables, fitting room, rug.
// L3: grand atelier — three tables, mannequins, chandelier, gold trim.
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
import { GentleBob, SoftPulse, StandingFigure, WorkingFigure, FigureName, pickPeople } from "@/components/activity-figures";
import { PawnPreview } from "@/components/pawn-preview";
import { formatCooldown } from "@/lib/gathering-places";
import { scaledCoins, scaledXP } from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";
import { NeedleGame } from "@/components/needle-game";
import { PlayCard } from "@/components/mini-game-scene";
import { useMiniGameHost } from "@/components/mini-game-host";

const BG = "#F6F0F8";
const FABRIC = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#A855F7"];
const TEXT_DIM = "#A08BB5";
const ACCENT = "#7C3AED";
const GOLD = "#C9963C";

const SEW_COINS: Record<number, number> = { 1: 40, 2: 90, 3: 160 };
const SEW_XP: Record<number, number> = { 1: 3, 2: 6, 3: 12 };
const COOLDOWN_MS = 60 * 60 * 1000;
const SEW_KEY = "prayercircle.interior.tailor.sew.v1";

/** A sewing table with machine, fabric, and a pin cushion. */
function SewingTable({ machine = "#6B7280" }: { machine?: string }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <Svg width={120} height={76} viewBox="0 0 120 76">
        {/* table */}
        <Rect x={6} y={44} width={108} height={8} rx={3} fill="#8A5A2B" stroke="#5E3D22" strokeWidth={1.5} />
        <Rect x={12} y={52} width={7} height={20} fill="#5E3D22" />
        <Rect x={101} y={52} width={7} height={20} fill="#5E3D22" />
        {/* sewing machine */}
        <Rect x={40} y={24} width={40} height={20} rx={6} fill={machine} stroke="#374151" strokeWidth={1.5} />
        <Rect x={72} y={18} width={8} height={10} rx={2} fill="#374151" />
        <Line x1={76} y1={28} x2={76} y2={42} stroke="#374151" strokeWidth={2.5} />
        <Rect x={34} y={40} width={18} height={4} fill="#9CA3AF" />
        {/* fabric under the needle */}
        <Path d="M20 44 q10 -8 20 0 l0 4 q-10 6 -20 0 Z" fill="#F472B6" />
        {/* pin cushion */}
        <Ellipse cx={100} cy={38} rx={10} ry={7} fill="#EF4444" stroke="#991B1B" strokeWidth={1.5} />
        <Line x1={96} y1={32} x2={94} y2={24} stroke="#FDE68A" strokeWidth={2} strokeLinecap="round" />
        <Line x1={102} y1={32} x2={104} y2={25} stroke="#FDE68A" strokeWidth={2} strokeLinecap="round" />
        {/* spool */}
        <Rect x={18} y={26} width={10} height={16} rx={2} fill="#3B82F6" stroke="#1D4ED8" strokeWidth={1} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Sewing table</Text>
    </View>
  );
}

/** Bolts of fabric leaning on the shelf. */
function FabricShelf({ level }: { level: number }) {
  const bolts = level >= 3 ? 7 : level >= 2 ? 5 : 3;
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <View
        style={{
          borderRadius: 6,
          backgroundColor: "#6D4C9E",
          borderWidth: 2,
          borderColor: level >= 3 ? GOLD : "#4C2F75",
          paddingHorizontal: 8,
          paddingVertical: 6,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-end", minHeight: 44, justifyContent: "center" }}>
          {Array.from({ length: bolts }).map((_, i) => (
            <View
              key={i}
              style={{
                width: 14,
                height: 34 + (i % 3) * 8,
                borderRadius: 4,
                backgroundColor: FABRIC[i % FABRIC.length],
                marginHorizontal: 2,
                borderWidth: 1,
                borderColor: "rgba(0,0,0,0.15)",
              }}
            />
          ))}
        </View>
        <View style={{ height: 4, backgroundColor: level >= 3 ? GOLD : "#4C2F75", borderRadius: 2, marginTop: 4 }} />
      </View>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Fabric shelf</Text>
    </View>
  );
}

/** A fitting room with a curtain and mirror (L2+). */
function FittingRoom({ level }: { level: number }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <Svg width={96} height={110} viewBox="0 0 96 110">
        <Rect x={6} y={4} width={84} height={100} rx={6} fill={level >= 3 ? "#F8FAFC" : "#EDE9FE"} stroke={level >= 3 ? GOLD : "#6D4C9E"} strokeWidth={2.5} />
        <Rect x={16} y={14} width={30} height={80} rx={4} fill="#BEE3F8" stroke="#7FA8C9" strokeWidth={1.5} />
        <Line x1={31} y1={14} x2={31} y2={94} stroke="#7FA8C9" strokeWidth={1} opacity={0.6} />
        {/* curtain, half-drawn */}
        <Path d="M52 14 q6 40 2 80 l32 0 q-4 -40 0 -80 Z" fill={level >= 3 ? "#A31621" : "#8B5CF6"} opacity={0.9} />
        <Path d="M58 20 q3 30 1 66 M72 20 q3 30 1 66" stroke="#00000022" strokeWidth={2} fill="none" />
        <Circle cx={52} cy={14} r={4} fill={level >= 3 ? GOLD : "#6D4C9E"} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Fitting room</Text>
    </View>
  );
}

/** A dress form / mannequin (L3). */
function DressForm() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <Svg width={60} height={110} viewBox="0 0 60 110">
        <Line x1={30} y1={64} x2={30} y2={100} stroke="#4B5563" strokeWidth={4} />
        <Line x1={16} y1={100} x2={44} y2={100} stroke="#4B5563" strokeWidth={4} strokeLinecap="round" />
        <Circle cx={30} cy={12} r={5} fill="#D6A87C" />
        <Line x1={30} y1={17} x2={30} y2={26} stroke="#D6A87C" strokeWidth={6} />
        <Path d="M30 26 C20 26, 16 36, 18 48 L14 66 L46 66 L42 48 C44 36, 40 26, 30 26 Z" fill="#7C3AED" stroke="#4C2F75" strokeWidth={2} />
        <Path d="M18 48 L42 48" stroke="#4C2F75" strokeWidth={1.5} strokeDasharray="4 3" />
        {/* measuring tape draped */}
        <Path d="M24 30 q-4 18 2 34" stroke="#FDE68A" strokeWidth={3} fill="none" />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Dress form</Text>
    </View>
  );
}

export default function TailorInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const needle = useMiniGameHost("needle", addCoins);
  const [lastSew, setLastSew] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(SEW_KEY).catch(() => null);
      setLastSew(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastSew + COOLDOWN_MS - Date.now());
  const sewing = pickPeople(people, `tailor|${building?.id ?? "tailor"}|sew`, 3);
  const fitting = pickPeople(people, `tailor|${building?.id ?? "tailor"}|fit`, 1)[0];

  const levelBlurb =
    level >= 3
      ? "A grand atelier — three tables, dress forms, and a chandelier over fine cloth."
      : level >= 2
        ? "A fine shop — two tables, a fitting room, and bolts of bright fabric."
        : "A humble shop — one table, sharp scissors, and cloth waiting to be cut.";

  const handleSew = async () => {
    if (remaining > 0) {
      Alert.alert("The seam is pressing", `The villagers are finishing the current garment.\n\nHelp sew again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(SEW_COINS[level] ?? 4);
    const xp = scaledXP(SEW_XP[level] ?? 3);
    const t = Date.now();
    setLastSew(t);
    await AsyncStorage.setItem(SEW_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `tailor-sew-${t}`).catch(() => undefined);
    Alert.alert("A Straight Seam", `You guide the cloth under the needle — the seam runs true.\n\n+${c.toFixed(2)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="content-cut" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="checkroom"
          iconColor={ACCENT}
          title="Tailor"
          blurb={`Clothes cut and sewn to measure. ${levelBlurb}`}
          accent="#E4D7F5"
        />

        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#E4D7F5",
            overflow: "hidden",
            backgroundColor: level >= 3 ? "#FAF5FF" : "#F7F2FC",
          }}
        >
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="tailor" />

          {/* sewing tables */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8 }}>
            <SewingTable />
            {level >= 2 && <SewingTable machine="#4B5563" />}
            {level >= 3 && <SewingTable machine="#8A6D1C" />}
          </View>

          {/* villagers sewing */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8, minHeight: 84 }}>
            {sewing[0] && (
              <GentleBob delay={150}>
                <WorkingFigure person={sewing[0]} delay={150} icon="content-cut" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
            {pawn && (
              <GentleBob delay={400}>
                <View style={{ alignItems: "center", marginHorizontal: 8 }}>
                  <SoftPulse duration={1800}>
                    <MaterialIcons name="straighten" size={15} color={ACCENT} style={{ marginBottom: 1 }} />
                  </SoftPulse>
                  <PawnPreview pawn={pawn} size={44} />
                  <FigureName name={pawn.name} color="#7C3AED" />
                </View>
              </GentleBob>
            )}
            {sewing[1] && (
              <GentleBob delay={650}>
                <WorkingFigure person={sewing[1]} delay={650} icon="content-cut" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
            {level >= 3 && sewing[2] && (
              <GentleBob delay={900}>
                <WorkingFigure person={sewing[2]} delay={900} icon="content-cut" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
          </View>

          {/* fabric + fitting */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 10 }}>
            <FabricShelf level={level} />
            {level >= 2 && <FittingRoom level={level} />}
            {level >= 3 && <DressForm />}
          </View>
          {fitting && level >= 2 && (
            <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 4 }}>
              <StandingFigure person={fitting} delay={500} icon="checkroom" iconColor={ACCENT} showLabel />
            </View>
          )}

          {/* thread-strewn floor */}
          <View style={{ height: 26, backgroundColor: "#D9CDE8", marginTop: 10 }}>
            <View style={{ height: 3, backgroundColor: "#C4B3DC" }} />
            <View style={{ height: 3, backgroundColor: "#EF4444", opacity: 0.5, marginTop: 5, marginHorizontal: 60, borderRadius: 2 }} />
            <View style={{ height: 3, backgroundColor: "#3B82F6", opacity: 0.5, marginTop: 3, marginHorizontal: 100, borderRadius: 2 }} />
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Help Sew"}
          onPrimary={handleSew}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "A grand atelier — three tables, dress forms, and a chandelier." : "A second table, a fitting room, and brighter bolts of fabric."
            )
          }
        />
        <PlayCard
          icon="content-cut"
          title="Play: Thread the Needle"
          blurb="The thread swings past the needle's eye — thread it as it crosses."
          playsLeft={needle.playsLeft}
          cap={needle.cap}
          accent={ACCENT}
          onPlay={() => needle.setPlaying(true)}
        />
        {needle.playing && <NeedleGame accent={ACCENT} onComplete={needle.handleComplete} onExit={() => needle.setPlaying(false)} />}
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Help sew once an hour. Every stitch is measured twice.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Threading the needle…</Text>}
      </ScrollView>
    </View>
  );
}
