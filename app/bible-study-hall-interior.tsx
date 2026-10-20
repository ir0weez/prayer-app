// Bible Study Hall interior: circles of tables with open Bibles, a wall
// cross and a verse banner overhead. This is where Bible Study schedule
// events gather the hero and the villagers (the church hosts until the
// hall is built). "Join the Study" grants XP + a few coins on a 1-hour
// cooldown — study is about wisdom, so XP leads.
// L1: two study circles, a small bookcase.
// L2: more circles, a taller bookcase, cushions on the chairs.
// L3: a library wall, a lectern, and a third circle.
// No emojis — SVG art and MaterialIcons only. Gentle sine-ease motion.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { G, Line, Path, Rect } from "react-native-svg";
import {
  InteriorActions,
  InteriorBanner,
  InteriorHeader,
  useInteriorData,
} from "@/components/interior-shell";
import { GentleBob, SoftPulse, StudyCircles, FigureName, pickPeople } from "@/components/activity-figures";
import { PawnPreview } from "@/components/pawn-preview";
import { formatCooldown } from "@/lib/gathering-places";
import { scaledCoins, scaledXP } from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";

const BG = "#FAF5EA";
const WOOD = "#A9713F";
const WOOD_DARK = "#7A5230";
const TEXT_DIM = "#A08B62";
const ACCENT = "#8A6D1C";
const BANNER_RED = "#7C2D3E";

const STUDY_COINS: Record<number, number> = { 1: 20, 2: 40, 3: 80 };
const STUDY_XP: Record<number, number> = { 1: 14, 2: 26, 3: 48 };
const COOLDOWN_MS = 60 * 60 * 1000;
const STUDY_KEY = "prayercircle.interior.biblestudy.join.v1";

/** Wall cross above the circles. */
function WallCross() {
  return (
    <Svg width={30} height={44} viewBox="0 0 30 44">
      <Rect x={12.6} y={2} width={4.8} height={40} rx={1.6} fill="#C9963C" stroke="#8A6D1C" strokeWidth={1.4} />
      <Rect x={4} y={12} width={22} height={4.8} rx={1.6} fill="#C9963C" stroke="#8A6D1C" strokeWidth={1.4} />
    </Svg>
  );
}

/** A hanging verse banner — cloth, a cross, and lines of verse. */
function VerseBanner() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={150} height={86} viewBox="0 0 150 86">
        <Line x1={6} y1={4} x2={144} y2={4} stroke={WOOD_DARK} strokeWidth={3} strokeLinecap="round" />
        <Rect x={18} y={6} width={114} height={72} rx={4} fill={BANNER_RED} stroke="#5E1F2D" strokeWidth={2} />
        <Path d="M18 68 L30 78 L42 68 L54 78 L66 68 L78 78 L90 68 L102 78 L114 68 L126 78 L132 70 L132 78 L18 78 Z" fill="#5E1F2D" opacity={0.55} />
        <Rect x={70} y={14} width={10} height={26} rx={2} fill="#F4D47C" />
        <Rect x={62} y={20} width={26} height={9} rx={2} fill="#F4D47C" />
        {[0, 1, 2].map((i) => (
          <Rect key={i} x={34} y={50 + i * 8} width={82} height={3.4} rx={1.7} fill="#F6E3C2" opacity={0.9} />
        ))}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 1 }}>“Thy word is a lamp unto my feet”</Text>
    </View>
  );
}

/** A bookcase of well-loved volumes. height grows with level. */
function Bookcase({ tall = false }: { tall?: boolean }) {
  const rows = tall ? 3 : 2;
  const spineColors = ["#B91C1C", "#1D4ED8", "#166534", "#C9963C", "#7C2D3E", "#2E7D74", "#8A5A2B", "#5B6B82"];
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={120} height={rows * 34 + 10} viewBox={`0 0 120 ${rows * 34 + 10}`}>
        <Rect x={3} y={3} width={114} height={rows * 34 + 4} rx={4} fill={WOOD} stroke={WOOD_DARK} strokeWidth={2.5} />
        {Array.from({ length: rows }).map((_, r) => (
          <G key={r}>
            <Rect x={8} y={8 + r * 34} width={104} height={26} fill="#8A5A2B" />
            {Array.from({ length: 9 }).map((_, i) => (
              <Rect
                key={i}
                x={11 + i * 11.2}
                y={11 + r * 34 + (i % 3)}
                width={7.6}
                height={20 - (i % 3) * 2}
                rx={1.2}
                fill={spineColors[(i + r * 3) % spineColors.length]}
              />
            ))}
            <Rect x={8} y={32 + r * 34} width={104} height={3.4} fill={WOOD_DARK} />
          </G>
        ))}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>{tall ? "Library wall" : "Bookcase"}</Text>
    </View>
  );
}

/** A lectern with an open Bible (L3). */
function Lectern() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={76} height={92} viewBox="0 0 76 92">
        {/* open book on the slanted top */}
        <Path d="M38 8 C31 3.6, 19 3.2, 10 6 L10 24 C19 21.2, 31 21.6, 38 26 C45 21.6, 57 21.2, 66 24 L66 6 C57 3.2, 45 3.6, 38 8 Z" fill="#FFF8E7" stroke="#C9963C" strokeWidth={2} />
        <Line x1={38} y1={8} x2={38} y2={26} stroke="#C9963C" strokeWidth={1.6} />
        <Line x1={16} y1={10} x2={32} y2={8.4} stroke="#B8AE99" strokeWidth={1.4} />
        <Line x1={16} y1={15} x2={32} y2={13.4} stroke="#B8AE99" strokeWidth={1.4} />
        <Line x1={44} y1={8.4} x2={60} y2={10} stroke="#B8AE99" strokeWidth={1.4} />
        <Line x1={44} y1={13.4} x2={60} y2={15} stroke="#B8AE99" strokeWidth={1.4} />
        {/* stand */}
        <Path d="M30 30 L46 30 L42 62 L34 62 Z" fill={WOOD} stroke={WOOD_DARK} strokeWidth={2} />
        <Rect x={20} y={62} width={36} height={7} rx={2.5} fill={WOOD_DARK} />
        <Rect x={26} y={76} width={24} height={10} rx={3} fill={WOOD} stroke={WOOD_DARK} strokeWidth={1.6} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Lectern</Text>
    </View>
  );
}

export default function BibleStudyHallInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastJoin, setLastJoin] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STUDY_KEY).catch(() => null);
      setLastJoin(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastJoin + COOLDOWN_MS - Date.now());
  // The circles fill with the people you've prayed for — study is shared.
  const circlePeople = pickPeople(people, `biblestudy|${building?.id ?? "hall"}|circles`, level >= 3 ? 14 : level >= 2 ? 10 : 6);

  const levelBlurb =
    level >= 3
      ? "A full study hall — a library wall, a lectern, and circles deep in the Word."
      : level >= 2
        ? "A warm hall — more circles around the tables, and a taller bookcase."
        : "A simple hall — two circles of chairs, open Bibles, and a bookcase.";

  const handleJoin = async () => {
    if (remaining > 0) {
      Alert.alert("Still studying", `The circle is mid-passage.\n\nJoin again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(STUDY_COINS[level] ?? 20);
    const xp = scaledXP(STUDY_XP[level] ?? 14);
    const t = Date.now();
    setLastJoin(t);
    await AsyncStorage.setItem(STUDY_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `biblestudy-join-${t}`).catch(() => undefined);
    Alert.alert("In the Word together", `You pull up a chair, open your Bible, and the discussion finds its thread.\n\n+${c.toFixed(2)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="menu-book" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="auto-stories"
          iconColor={ACCENT}
          title="Bible Study Hall"
          blurb={`Circles of tables, open Bibles, and a verse banner overhead. ${levelBlurb}`}
          accent="#EFE3C4"
        />

        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#EFE3C4",
            overflow: "hidden",
            backgroundColor: level >= 3 ? "#FFFDF6" : "#FDFAF1",
          }}
        >
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="bible-study-hall" />

          {/* wall: cross + verse banner */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-start", marginTop: 14, gap: 26 }}>
            <View style={{ marginTop: 16 }}>
              <WallCross />
            </View>
            <VerseBanner />
            <View style={{ marginTop: 16 }}>
              <WallCross />
            </View>
          </View>

          {/* the hero at the head of the room, book open */}
          {pawn && (
            <View style={{ alignItems: "center", marginTop: 6 }}>
              <GentleBob delay={350}>
                <View style={{ alignItems: "center" }}>
                  <SoftPulse duration={2000}>
                    <MaterialIcons name="menu-book" size={16} color={ACCENT} style={{ marginBottom: 1 }} />
                  </SoftPulse>
                  <PawnPreview pawn={pawn} size={46} />
                  <FigureName name={pawn.name} color={ACCENT} />
                </View>
              </GentleBob>
            </View>
          )}

          {/* study circles */}
          <View style={{ marginTop: 4, minHeight: 90 }}>
            {circlePeople.length > 0 ? (
              <StudyCircles people={circlePeople} maxPerCircle={level >= 2 ? 7 : 6} bookColor="#C9963C" accent={TEXT_DIM} />
            ) : (
              <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", paddingHorizontal: 28, marginTop: 16 }}>
                The chairs are set in circles. Pray for people today and they'll gather here to study with you.
              </Text>
            )}
          </View>

          {/* bookcase / library wall + lectern */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 6 }}>
            <Bookcase tall={level >= 3} />
            {level >= 3 && <Lectern />}
            {level >= 2 && level < 3 && <Bookcase />}
          </View>

          {/* worn wood floor */}
          <View style={{ height: 22, backgroundColor: "#E8D9B8", marginTop: 10 }}>
            <View style={{ height: 3, backgroundColor: "#D9C08E" }} />
            <View style={{ flexDirection: "row", marginTop: 7, marginHorizontal: 16 }}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={{ flex: 1, height: 5, backgroundColor: i % 2 ? "#E0CCA0" : "#E8D9B8" }} />
              ))}
            </View>
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Join the Study"}
          onPrimary={handleJoin}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "A library wall, a lectern, and room for a third circle." : "More circles around the tables, and a taller bookcase."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Join the study once an hour. The circles are always set.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Setting out the chairs…</Text>}
      </ScrollView>
    </View>
  );
}
