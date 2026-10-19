// Grand Library interior: towering shelves of wisdom. Villagers read in
// quiet nooks, ladders lean against the stacks, a great reading table
// anchors the hall, and the pawn studies deep.
// "Deep Study" grants XP on a 1-hour cooldown (no coins — wisdom is its
// own reward).
// L1: two shelf walls, reading table. L2: taller stacks, gallery rail,
// globe. L3: grand library — floor-to-ceiling stacks, great dome window,
// brass lamps, rare-books case.
// No emojis — SVG art and MaterialIcons only. Gentle sine-ease motion.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
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

const BG = "#EDE6D3";
const WOOD = "#6B4A2F";
const WOOD_DARK = "#4E3421";
const TEXT_DIM = "#9A8B6B";
const ACCENT = "#8A5A2B";
const GOLD = "#C9963C";

const STUDY_XP: Record<number, number> = { 1: 20, 2: 35, 3: 60 };
const COOLDOWN_MS = 60 * 60 * 1000;
const STUDY_KEY = "prayercircle.interior.grandlibrary.study.v1";

const SPINE_COLORS = ["#B4232F", "#1D4ED8", "#16A34A", "#B45309", "#7C3AED", "#0E7490"];

/** A towering bookshelf wall. `tall` = number of shelf rows. */
function ShelfWall({ tall, lux = false }: { tall: number; lux?: boolean }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <View
        style={{
          borderRadius: 6,
          backgroundColor: WOOD,
          borderWidth: 2.5,
          borderColor: lux ? GOLD : WOOD_DARK,
          paddingHorizontal: 6,
          paddingVertical: 5,
        }}
      >
        {Array.from({ length: tall }).map((_, r) => (
          <View key={r}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", minHeight: 26, justifyContent: "center" }}>
              {Array.from({ length: 6 }).map((_, i) => {
                const idx = (r * 6 + i) % SPINE_COLORS.length;
                return (
                  <View
                    key={i}
                    style={{
                      width: 11,
                      height: 18 + ((r + i) % 3) * 5,
                      backgroundColor: SPINE_COLORS[idx],
                      marginHorizontal: 1.5,
                      borderTopLeftRadius: 2,
                      borderTopRightRadius: 2,
                      borderWidth: 1,
                      borderColor: "rgba(0,0,0,0.2)",
                    }}
                  />
                );
              })}
            </View>
            <View style={{ height: 4, backgroundColor: lux ? GOLD : WOOD_DARK, borderRadius: 2, marginTop: 2, marginBottom: r === tall - 1 ? 0 : 3 }} />
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Stacks</Text>
    </View>
  );
}

/** The great reading table with lamps and open books. */
function ReadingTable({ level }: { level: number }) {
  return (
    <View style={{ alignItems: "center", marginTop: 8 }}>
      <Svg width={220} height={84} viewBox="0 0 220 84">
        <Rect x={10} y={44} width={200} height={12} rx={5} fill={WOOD} stroke={WOOD_DARK} strokeWidth={2.5} />
        <Rect x={20} y={56} width={10} height={24} fill={WOOD_DARK} />
        <Rect x={190} y={56} width={10} height={24} fill={WOOD_DARK} />
        {/* open books */}
        <Path d="M50 44 q14 -8 28 0 q14 -8 28 0 l0 -14 q-14 -8 -28 0 q-14 -8 -28 0 Z" fill="#F8FAFC" stroke="#94A3B8" strokeWidth={1.5} />
        <Line x1={78} y1={32} x2={78} y2={42} stroke="#94A3B8" strokeWidth={1.5} />
        <Path d="M130 44 q10 -6 20 0 q10 -6 20 0 l0 -12 q-10 -6 -20 0 q-10 -6 -20 0 Z" fill="#F8FAFC" stroke="#94A3B8" strokeWidth={1.5} />
        {/* brass lamps */}
        {[36, 184].map((cx) => (
          <g key={cx}>
            <Line x1={cx} y1={44} x2={cx} y2={24} stroke={GOLD} strokeWidth={3} />
            <Path d={`M${cx - 12} 24 h24 l-4 -10 h-16 Z`} fill={level >= 3 ? GOLD : "#E8B44C"} stroke="#8A6D1C" strokeWidth={1.5} />
            <Circle cx={cx} cy={28} r={4} fill="#FFF7D6" />
          </g>
        ))}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Reading table</Text>
    </View>
  );
}

/** A rolling ladder against the stacks. */
function StackLadder() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={54} height={96} viewBox="0 0 54 96">
        <Line x1={12} y1={4} x2={6} y2={92} stroke={WOOD_DARK} strokeWidth={5} strokeLinecap="round" />
        <Line x1={42} y1={4} x2={48} y2={92} stroke={WOOD_DARK} strokeWidth={5} strokeLinecap="round" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Line key={i} x1={11 - i * 1.2} y1={18 + i * 15} x2={43 + i * 1.2} y2={18 + i * 15} stroke={WOOD} strokeWidth={4} strokeLinecap="round" />
        ))}
        <Circle cx={27} cy={90} r={5} fill="#6B7280" />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Ladder</Text>
    </View>
  );
}

/** A rare-books glass case (L3). */
function RareBooksCase() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={110} height={88} viewBox="0 0 110 88">
        <Rect x={8} y={58} width={94} height={24} rx={4} fill={WOOD} stroke={WOOD_DARK} strokeWidth={2} />
        <Rect x={8} y={8} width={94} height={52} rx={6} fill="#D9EDF5" opacity={0.5} stroke={GOLD} strokeWidth={2.5} />
        {/* ancient tomes inside */}
        <Rect x={26} y={32} width={14} height={24} rx={2} fill="#7A1020" stroke={GOLD} strokeWidth={1.5} />
        <Rect x={44} y={28} width={16} height={28} rx={2} fill="#1E3A5A" stroke={GOLD} strokeWidth={1.5} />
        <Rect x={64} y={34} width={12} height={22} rx={2} fill="#4E3421" stroke={GOLD} strokeWidth={1.5} />
        <Line x1={20} y1={16} x2={40} y2={52} stroke="#FFFFFF" strokeWidth={4} opacity={0.5} strokeLinecap="round" />
        <Rect x={8} y={4} width={94} height={6} rx={3} fill={GOLD} stroke="#8A6D1C" strokeWidth={1.5} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Rare books</Text>
    </View>
  );
}

export default function GrandLibraryInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastStudy, setLastStudy] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STUDY_KEY).catch(() => null);
      setLastStudy(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastStudy + COOLDOWN_MS - Date.now());
  const reading = pickPeople(people, `grandlibrary|${building?.id ?? "grandlibrary"}|read`, 4);
  const browsing = pickPeople(people, `grandlibrary|${building?.id ?? "grandlibrary"}|browse`, 1)[0];

  const levelBlurb =
    level >= 3
      ? "A grand library — floor-to-ceiling stacks, a great dome window, and the rare-books case."
      : level >= 2
        ? "A fine library — tall stacks, a gallery rail, and lamplit tables."
        : "A humble hall of books — two shelf walls and a quiet reading table.";

  const handleStudy = async () => {
    if (remaining > 0) {
      Alert.alert("The page is marked", `Your place is saved with a ribbon.\n\nStudy deep again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const xp = scaledXP(STUDY_XP[level] ?? 20);
    const t = Date.now();
    setLastStudy(t);
    await AsyncStorage.setItem(STUDY_KEY, String(t)).catch(() => undefined);
    addCoins(0);
    awardCustomXP(xp, `grandlibrary-study-${t}`).catch(() => undefined);
    Alert.alert("Deep Study", `You lose yourself in the stacks — wisdom settles like dust in sunbeams.\n\n+${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="local-library" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="menu-book"
          iconColor={ACCENT}
          title="Grand Library"
          blurb={`Towering shelves of wisdom. ${levelBlurb}`}
          accent="#DED2B4"
        />

        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#DED2B4",
            overflow: "hidden",
            backgroundColor: level >= 3 ? "#F2ECDB" : "#EFE7D2",
          }}
        >
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="grand-library" />

          {/* stacks */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8 }}>
            <ShelfWall tall={level >= 3 ? 5 : level >= 2 ? 4 : 3} lux={level >= 3} />
            <StackLadder />
            <ShelfWall tall={level >= 3 ? 5 : level >= 2 ? 4 : 3} lux={level >= 3} />
            {level >= 3 && <RareBooksCase />}
          </View>

          {/* readers */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8, minHeight: 84 }}>
            {reading[0] && (
              <GentleBob delay={150}>
                <SeatedFigure person={reading[0]} delay={150} chairColor="#6B4A2F" chairBorder={WOOD_DARK} />
              </GentleBob>
            )}
            {reading[1] && (
              <GentleBob delay={350}>
                <SeatedFigure person={reading[1]} delay={350} chairColor="#6B4A2F" chairBorder={WOOD_DARK} />
              </GentleBob>
            )}
            {pawn && (
              <GentleBob delay={550}>
                <View style={{ alignItems: "center", marginHorizontal: 6 }}>
                  <SoftPulse duration={1800}>
                    <MaterialIcons name="menu-book" size={15} color={ACCENT} style={{ marginBottom: 1 }} />
                  </SoftPulse>
                  <PawnPreview pawn={pawn} size={44} />
                  <FigureName name={pawn.name} color="#8A5A2B" />
                </View>
              </GentleBob>
            )}
            {reading[2] && (
              <GentleBob delay={750}>
                <SeatedFigure person={reading[2]} delay={750} chairColor="#6B4A2F" chairBorder={WOOD_DARK} />
              </GentleBob>
            )}
            {level >= 3 && reading[3] && (
              <GentleBob delay={950}>
                <StandingFigure person={reading[3]} delay={950} icon="local-library" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
          </View>

          <ReadingTable level={level} />
          {browsing && (
            <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 2 }}>
              <StandingFigure person={browsing} delay={500} icon="search" iconColor={ACCENT} showLabel />
            </View>
          )}

          {/* gallery rail at L2+ */}
          {level >= 2 && (
            <View style={{ marginTop: 8, marginHorizontal: 20 }}>
              <View style={{ height: 6, backgroundColor: WOOD, borderRadius: 3 }} />
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginHorizontal: 12 }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <View key={i} style={{ width: 4, height: 18, backgroundColor: WOOD, borderRadius: 2 }} />
                ))}
              </View>
            </View>
          )}

          {/* parquet floor */}
          <View style={{ height: 26, backgroundColor: "#C8AE7E", marginTop: 8 }}>
            <View style={{ height: 3, backgroundColor: "#B39668" }} />
            <View style={{ flexDirection: "row", marginTop: 5, marginHorizontal: 30 }}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={{ flex: 1, height: 10, backgroundColor: i % 2 ? "#B39668" : "#C8AE7E", borderWidth: 0.5, borderColor: "#A08660" }} />
              ))}
            </View>
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Deep Study"}
          onPrimary={handleStudy}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "Floor-to-ceiling stacks, a great dome window, and the rare-books case." : "Taller stacks, a gallery rail, and lamplit tables."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Study deep once an hour. Of making many books there is no end — pure XP.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Finding your shelf…</Text>}
      </ScrollView>
    </View>
  );
}
