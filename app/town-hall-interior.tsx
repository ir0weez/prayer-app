// Town Hall interior: the civic heart of town. Villagers gather in the
// grand hall for the assembly, the notice board carries the town's news,
// and the pawn takes a seat among neighbors.
// "Attend Assembly" grants XP on a 1-hour cooldown (no coins — civic duty
// is its own reward).
// L1: hall, podium, notice board. L2: banners, gallery rail, more seats.
// L3: grand civic hall — great seal, tall banners, chandelier, marble.
// No emojis — SVG art and MaterialIcons only. Gentle sine-ease motion.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Line, Path, Polygon, Rect } from "react-native-svg";
import {
  InteriorActions,
  InteriorBanner,
  InteriorHeader,
  useInteriorData,
} from "@/components/interior-shell";
import { GentleBob, SeatedFigure, SoftPulse, StandingFigure, FigureName, pickPeople } from "@/components/activity-figures";
import { PawnPreview } from "@/components/pawn-preview";
import { formatCooldown } from "@/lib/gathering-places";
import { scaledXP } from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";

const BG = "#F2EEE4";
const STONE = "#D6CDBB";
const STONE_DARK = "#8A7F6A";
const TEXT_DIM = "#A0977F";
const ACCENT = "#1D4ED8";
const GOLD = "#C9963C";
const BLUE = "#1D4ED8";

const ASSEMBLY_XP: Record<number, number> = { 1: 12, 2: 22, 3: 40 };
const COOLDOWN_MS = 60 * 60 * 1000;
const ASSEMBLY_KEY = "prayercircle.interior.townhall.assembly.v1";

/** The speaker's podium with the town seal. */
function Podium({ grand = false }: { grand?: boolean }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <Svg width={110} height={grand ? 110 : 96} viewBox="0 0 110 110">
        <Polygon points="35,96 75,96 68,60 42,60" fill={grand ? "#9A8B6F" : STONE} stroke={STONE_DARK} strokeWidth={2.5} />
        <Rect x={30} y={52} width={50} height={12} rx={4} fill={grand ? "#8A7F6A" : STONE_DARK} />
        {/* town seal */}
        <Circle cx={55} cy={32} r={20} fill={grand ? GOLD : "#EFE9DC"} stroke={grand ? "#8A6D1C" : STONE_DARK} strokeWidth={2.5} />
        <Circle cx={55} cy={32} r={13} fill="none" stroke={grand ? "#8A6D1C" : STONE_DARK} strokeWidth={1.5} />
        <Path d="M55 22 L55 42 M45 32 L65 32" stroke={grand ? "#8A6D1C" : STONE_DARK} strokeWidth={2} />
        <Circle cx={55} cy={32} r={4} fill={grand ? "#8A6D1C" : STONE_DARK} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Podium</Text>
    </View>
  );
}

/** The notice board, pinned with town news. */
function NoticeBoard({ level }: { level: number }) {
  const notes = level >= 3 ? 8 : level >= 2 ? 6 : 4;
  const colors = ["#FDE68A", "#FBCFE8", "#BAE6FD", "#D9F99D"];
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <Svg width={130} height={110} viewBox="0 0 130 110">
        <Rect x={6} y={6} width={118} height={92} rx={6} fill="#8A5A2B" stroke="#5E3D22" strokeWidth={2.5} />
        <Rect x={12} y={12} width={106} height={80} rx={4} fill="#EFE3C8" />
        {Array.from({ length: notes }).map((_, i) => {
          const cx = 26 + (i % 4) * 26;
          const cy = 28 + Math.floor(i / 4) * 32;
          return (
            <g key={i}>
              <Rect x={cx - 10} y={cy - 8} width={20} height={16} rx={2} fill={colors[i % colors.length]} stroke="#00000022" strokeWidth={1} transform={`rotate(${(i % 2 ? -6 : 6)} ${cx} ${cy})`} />
              <Circle cx={cx} cy={cy - 8} r={2.2} fill="#B91C1C" />
            </g>
          );
        })}
        {level >= 3 && <Rect x={6} y={6} width={118} height={10} rx={5} fill={GOLD} stroke="#8A6D1C" strokeWidth={1.5} />}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Notice board</Text>
    </View>
  );
}

/** Tall civic banners (L2+). */
function CivicBanners({ grand = false }: { grand?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 6 }}>
      {[BLUE, grand ? GOLD : "#B91C1C"].map((c, i) => (
        <Svg key={i} width={44} height={110} viewBox="0 0 44 110" style={{ marginHorizontal: 10 }}>
          <Line x1={22} y1={0} x2={22} y2={14} stroke={STONE_DARK} strokeWidth={4} />
          <Path d="M6 14 h32 v80 l-16 -12 l-16 12 Z" fill={c} stroke="#00000033" strokeWidth={1.5} />
          <Circle cx={22} cy={44} r={8} fill="#FFFFFF" opacity={0.85} />
          <Path d="M22 38 L22 50 M16 44 L28 44" stroke={c} strokeWidth={2} />
        </Svg>
      ))}
    </View>
  );
}

/** Rows of assembly seats. */
function SeatRows({ level }: { level: number }) {
  const rows = level >= 3 ? 3 : 2;
  return (
    <View style={{ alignItems: "center", marginTop: 6, marginBottom: 4 }}>
      {Array.from({ length: rows }).map((_, r) => (
        <View key={r} style={{ flexDirection: "row", marginTop: 4 }}>
          {[0, 1, 2, 3, 4].map((c) => (
            <View key={c} style={{ width: 30, height: 14, borderRadius: 5, backgroundColor: level >= 3 ? "#8A7F6A" : "#B8AE99", borderWidth: 1.5, borderColor: STONE_DARK, marginHorizontal: 3 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

export default function TownHallInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastAssembly, setLastAssembly] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(ASSEMBLY_KEY).catch(() => null);
      setLastAssembly(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastAssembly + COOLDOWN_MS - Date.now());
  const seated = pickPeople(people, `townhall|${building?.id ?? "townhall"}|seated`, 4);
  const speaker = pickPeople(people, `townhall|${building?.id ?? "townhall"}|speaker`, 1)[0];
  const reading = pickPeople(people, `townhall|${building?.id ?? "townhall"}|board`, 1)[0];

  const levelBlurb =
    level >= 3
      ? "A grand civic hall — the great seal in gold, tall banners, and marble underfoot."
      : level >= 2
        ? "A proud hall — civic banners, a gallery rail, and rows of seats."
        : "A humble hall — a podium, a notice board, and neighbors gathering.";

  const handleAssembly = async () => {
    if (remaining > 0) {
      Alert.alert("The hall is quiet", `The assembly has adjourned for now.\n\nAttend again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const xp = scaledXP(ASSEMBLY_XP[level] ?? 12);
    const t = Date.now();
    setLastAssembly(t);
    await AsyncStorage.setItem(ASSEMBLY_KEY, String(t)).catch(() => undefined);
    addCoins(0);
    awardCustomXP(xp, `townhall-assembly-${t}`).catch(() => undefined);
    Alert.alert("Assembly Attended", `You take your seat as the town gathers — every voice heard, every neighbor seen.\n\n+${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="account-balance" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="gavel"
          iconColor={ACCENT}
          title="Town Hall"
          blurb={`The civic heart of town. ${levelBlurb}`}
          accent="#DCD4BE"
        />

        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#DCD4BE",
            overflow: "hidden",
            backgroundColor: level >= 3 ? "#F5F1E6" : "#F1ECE0",
          }}
        >
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="town-hall" />
          {level >= 2 && <CivicBanners grand={level >= 3} />}

          {/* podium + speaker */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8 }}>
            <Podium grand={level >= 3} />
            {speaker && (
              <GentleBob delay={250}>
                <StandingFigure person={speaker} delay={250} icon="campaign" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
            <NoticeBoard level={level} />
          </View>
          {reading && (
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 2, marginRight: 40 }}>
              <StandingFigure person={reading} delay={600} icon="newspaper" iconColor={ACCENT} showLabel />
            </View>
          )}

          {/* assembly seating: pawn among neighbors */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 6, minHeight: 84 }}>
            {seated[0] && (
              <GentleBob delay={150}>
                <SeatedFigure person={seated[0]} delay={150} chairColor="#B8AE99" chairBorder={STONE_DARK} />
              </GentleBob>
            )}
            {seated[1] && (
              <GentleBob delay={350}>
                <SeatedFigure person={seated[1]} delay={350} chairColor="#B8AE99" chairBorder={STONE_DARK} />
              </GentleBob>
            )}
            {pawn && (
              <GentleBob delay={550}>
                <View style={{ alignItems: "center", marginHorizontal: 6 }}>
                  <SoftPulse duration={1800}>
                    <MaterialIcons name="how-to-vote" size={15} color={ACCENT} style={{ marginBottom: 1 }} />
                  </SoftPulse>
                  <PawnPreview pawn={pawn} size={44} />
                  <FigureName name={pawn.name} color="#1D4ED8" />
                </View>
              </GentleBob>
            )}
            {seated[2] && (
              <GentleBob delay={750}>
                <SeatedFigure person={seated[2]} delay={750} chairColor="#B8AE99" chairBorder={STONE_DARK} />
              </GentleBob>
            )}
            {level >= 3 && seated[3] && (
              <GentleBob delay={950}>
                <SeatedFigure person={seated[3]} delay={950} chairColor="#B8AE99" chairBorder={STONE_DARK} />
              </GentleBob>
            )}
          </View>

          <SeatRows level={level} />

          {/* marble floor */}
          <View style={{ height: 26, backgroundColor: level >= 3 ? "#E3DCCB" : "#D6CDBB", marginTop: 6 }}>
            <View style={{ height: 3, backgroundColor: level >= 3 ? GOLD : "#B8AE99" }} />
            {level >= 3 && <View style={{ height: 4, backgroundColor: GOLD, opacity: 0.5, marginTop: 6, marginHorizontal: 80, borderRadius: 2 }} />}
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Attend Assembly"}
          onPrimary={handleAssembly}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "A grand civic hall — the great seal in gold, tall banners, marble underfoot." : "Civic banners, a gallery rail, and rows of seats for the town."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Attend the assembly once an hour. Good neighbors make a good town — pure XP.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Calling the meeting to order…</Text>}
      </ScrollView>
    </View>
  );
}
