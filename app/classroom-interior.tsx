// Classroom interior: a bright classroom — desks, a board, villagers
// learning. L1: four desks, a plain board. L2: six desks, a wall map, a
// bookshelf. L3: eight desks, a smart board, a reading corner, and plants.
// "Join the Lesson" grants XP on a 1-hour cooldown. No emojis — SVG art and
// MaterialIcons only.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Circle, G, Rect } from "react-native-svg";
import { MaterialIcons } from "@expo/vector-icons";
import { formatCooldown } from "@/lib/gathering-places";
import { awardCustomXP } from "@/lib/xp-engine";
import { PawnPreview } from "@/components/pawn-preview";
import {
  useInteriorData,
  InteriorHeader,
  InteriorBanner,
  InteriorActions,
} from "@/components/interior-shell";
import {
  SoftPulse,
  SeatedFigure,
  pickPeople,
  FigureName,
} from "@/components/activity-figures";

const BG = "#EFF6FF"; // bright morning
const CARD = "#FFFFFF";
const WOOD = "#C08A4E";
const WOOD_DARK = "#8B5E34";
const ACCENT = "#2563EB";
const ACCENT_DARK = "#1E40AF";
const TEXT = "#1E3A5F";
const TEXT_DIM = "#6B8CA8";

const LESSON_KEY = "prayercircle.interior.classroom.lesson.v1";
const LESSON_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const LESSON_XP: Record<1 | 2 | 3, number> = { 1: 10, 2: 18, 3: 30 };

/** The board at the front — plain chalkboard, or glowing smart board at L3. */
function Board({ level }: { level: number }) {
  if (level >= 3) {
    return (
      <View style={{ alignItems: "center" }}>
        <Svg width={220} height={110} viewBox="0 0 220 110">
          <Rect x={0} y={0} width={220} height={110} rx={8} fill="#1E3A5F" />
          <Rect x={6} y={6} width={208} height={98} rx={5} fill="#E0F2FE" />
        </Svg>
        <View style={{ position: "absolute", top: 6, alignItems: "center" }}>
          <SoftPulse duration={2000}>
            <Svg width={208} height={98} viewBox="0 0 208 98">
              {/* lesson slide: sun + hills + big letter */}
              <Circle cx={170} cy={26} r={14} fill="#FBBF24" />
              <Rect x={10} y={62} width={188} height={30} fill="#86EFAC" opacity={0.8} />
              <Rect x={30} y={30} width={60} height={40} rx={4} fill={ACCENT} opacity={0.85} />
              <Rect x={100} y={40} width={70} height={6} rx={3} fill="#1E3A5F" opacity={0.5} />
              <Rect x={100} y={52} width={50} height={6} rx={3} fill="#1E3A5F" opacity={0.35} />
            </Svg>
          </SoftPulse>
        </View>
        <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 4 }}>Smart board</Text>
      </View>
    );
  }
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={200} height={104} viewBox="0 0 200 104">
        <Rect x={0} y={0} width={200} height={104} rx={8} fill={WOOD_DARK} />
        <Rect x={8} y={8} width={184} height={88} rx={4} fill="#3E5C4B" />
        {/* chalk lesson lines */}
        <Rect x={22} y={22} width={120} height={5} rx={2.5} fill="#F8FAFC" opacity={0.85} />
        <Rect x={22} y={34} width={90} height={5} rx={2.5} fill="#F8FAFC" opacity={0.6} />
        <Rect x={22} y={46} width={104} height={5} rx={2.5} fill="#F8FAFC" opacity={0.6} />
        <Rect x={140} y={58} width={36} height={28} rx={4} fill="none" stroke="#F8FAFC" strokeWidth={2.5} opacity={0.8} />
        <Circle cx={44} cy={72} r={10} fill="none" stroke="#F8FAFC" strokeWidth={2.5} opacity={0.8} />
      </Svg>
      <View style={{ width: 180, height: 6, borderRadius: 3, backgroundColor: WOOD, marginTop: -4 }} />
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Chalkboard</Text>
    </View>
  );
}

/** A wall map (L2+). */
function WallMap() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={64} height={76} viewBox="0 0 64 76">
        <Rect x={4} y={8} width={56} height={60} rx={4} fill="#F5E9C8" stroke={WOOD_DARK} strokeWidth={2.5} />
        <Rect x={4} y={0} width={56} height={8} rx={4} fill={WOOD_DARK} />
        <Rect x={12} y={16} width={22} height={14} rx={6} fill="#7FB069" />
        <Rect x={36} y={24} width={14} height={18} rx={6} fill="#7FB069" />
        <Rect x={16} y={38} width={12} height={20} rx={6} fill="#7FB069" />
        <Rect x={40} y={48} width={12} height={10} rx={5} fill="#7FB069" />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Map</Text>
    </View>
  );
}

/** A small classroom bookshelf (L2+). */
function ClassShelf() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={52} height={70} viewBox="0 0 52 70">
        <Rect x={0} y={0} width={52} height={70} rx={5} fill={WOOD} />
        <Rect x={5} y={5} width={42} height={60} fill="#6B4A2F" />
        {[0, 1, 2].map((r) => (
          <G key={r}>
            {[0, 1, 2, 3, 4].map((b) => (
              <Rect
                key={b}
                x={8 + b * 8}
                y={10 + r * 20}
                width={6}
                height={14 - ((r + b) % 3)}
                rx={1}
                fill={["#2563EB", "#DC2626", "#059669", "#F59E0B", "#7C3AED"][(r + b) % 5]}
              />
            ))}
            <Rect x={7} y={24 + r * 20} width={38} height={2.5} fill={WOOD} />
          </G>
        ))}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Shelf</Text>
    </View>
  );
}

/** A student desk. */
function Desk({ seed = 0 }: { seed?: number }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={74} height={46} viewBox="0 0 74 46">
        <Rect x={0} y={6} width={74} height={12} rx={5} fill={WOOD} />
        <Rect x={0} y={6} width={74} height={5} rx={2.5} fill="#D9A96B" />
        <Rect x={8} y={18} width={7} height={26} rx={3} fill={WOOD_DARK} />
        <Rect x={59} y={18} width={7} height={26} rx={3} fill={WOOD_DARK} />
        {/* pencil and paper on the desk */}
        <Rect x={20} y={8} width={18} height={8} rx={1.5} fill="#FFFFFF" stroke="#CBD5E1" strokeWidth={1} />
        <Rect x={46} y={9} width={12} height={3} rx={1.5} fill="#F59E0B" transform={`rotate(${-12 + seed * 4} 52 10)`} />
      </Svg>
    </View>
  );
}

/** A reading corner with rug and cushions (L3). */
function ReadingCorner() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={120} height={54} viewBox="0 0 120 54">
        <Circle cx={60} cy={30} r={24} fill="#BFDBFE" />
        <Circle cx={60} cy={30} r={17} fill="#DBEAFE" />
        <Rect x={26} y={38} width={20} height={10} rx={5} fill={ACCENT} opacity={0.8} />
        <Rect x={74} y={38} width={20} height={10} rx={5} fill="#7C3AED" opacity={0.8} />
        {/* little book pile */}
        <Rect x={52} y={8} width={16} height={5} rx={2} fill="#DC2626" />
        <Rect x={54} y={13} width={13} height={5} rx={2} fill="#059669" />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Reading corner</Text>
    </View>
  );
}

/** A potted plant (L3). */
function Plant() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={40} height={62} viewBox="0 0 40 62">
        <Circle cx={20} cy={16} r={13} fill="#4D7C4D" />
        <Circle cx={14} cy={12} r={8} fill="#5B8A5B" />
        <Circle cx={26} cy={12} r={8} fill="#5B8A5B" />
        <Rect x={17} y={28} width={6} height={12} fill="#6B4A2F" />
        <Rect x={10} y={38} width={20} height={22} rx={4} fill="#B0724A" />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Plant</Text>
    </View>
  );
}

export default function ClassroomInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastLesson, setLastLesson] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(LESSON_KEY);
        setLastLesson(raw ? parseInt(raw, 10) || 0 : 0);
      } catch {}
    })();
  }, []);

  void addCoins;
  const remaining = Math.max(0, lastLesson + LESSON_COOLDOWN_MS - Date.now());
  const lessonXp = LESSON_XP[level];
  const deskCount = level >= 3 ? 8 : level >= 2 ? 6 : 4;
  const learners = pickPeople(people, `classroom|${building?.id ?? "cls"}`, deskCount);

  const levelBlurb =
    level >= 3
      ? "A wonderful classroom — smart board, reading corner, and plants."
      : level >= 2
        ? "A growing classroom — a wall map, a bookshelf, more desks."
        : "A simple classroom — a few desks and a chalkboard.";

  const handleLesson = async () => {
    if (remaining > 0) {
      Alert.alert("Class Dismissed", `The lesson is over for now.\n\nJoin the next lesson in about ${formatCooldown(remaining)}.`);
      return;
    }
    const t = Date.now();
    setLastLesson(t);
    await AsyncStorage.setItem(LESSON_KEY, String(t)).catch(() => undefined);
    await awardCustomXP(lessonXp, `classroom-lesson-${t}`).catch(() => undefined);
    Alert.alert("A Good Lesson", `You take notes and ask a great question.\n\n+${lessonXp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="school" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="school"
          iconColor={ACCENT}
          title="Today's Lesson"
          blurb={`Join the lesson — worth +${lessonXp} XP. ${levelBlurb}`}
          accent="#BFDBFE"
        />

        {/* classroom scene — richer with level */}
        <View style={{ marginHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: "#BFDBFE", overflow: "hidden", backgroundColor: "#F8FBFF" }}>
          {/* front of the room */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", paddingTop: 12, paddingHorizontal: 10 }}>
            {level >= 2 && <WallMap />}
            <View style={{ marginHorizontal: level >= 2 ? 10 : 0 }}>
              <Board level={level} />
            </View>
            {level >= 2 && <ClassShelf />}
          </View>

          {/* desks with learners */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "flex-end", paddingTop: 12, paddingHorizontal: 6 }}>
            {Array.from({ length: deskCount }).map((_, i) => {
              const learner = learners[i];
              return (
                <View key={i} style={{ alignItems: "center", marginHorizontal: 4, marginBottom: 6 }}>
                  {learner && (
                    <View style={{ marginBottom: -6 }}>
                      <SeatedFigure person={learner} delay={i * 160} chairColor="#8B5E34" chairBorder="#5E3D22" backH={26} backW={38} />
                    </View>
                  )}
                  <Desk seed={i} />
                </View>
              );
            })}
            {learners.length === 0 && !pawn && (
              <Text style={{ color: TEXT_DIM, fontSize: 12, fontStyle: "italic", marginVertical: 8 }}>
                The desks are empty — class hasn't started.
              </Text>
            )}
          </View>

          {/* the pawn at a desk */}
          {pawn && (
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 4 }}>
              <View style={{ alignItems: "center", marginHorizontal: 8 }}>
                <FigureName name={pawn.name} color={ACCENT_DARK} />
                <PawnPreview pawn={pawn} size={50} />
              </View>
              <Desk seed={7} />
              <Text style={{ fontSize: 10, color: TEXT_DIM, marginLeft: 6, marginBottom: 12 }}>Front row</Text>
            </View>
          )}

          {/* L3 extras: reading corner + plants */}
          {level >= 3 && (
            <View style={{ flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end", paddingHorizontal: 20, paddingBottom: 6 }}>
              <Plant />
              <ReadingCorner />
              <Plant />
            </View>
          )}

          {/* floor */}
          <View style={{ height: 26, backgroundColor: "#DCE9F7" }}>
            <View style={{ height: 3, backgroundColor: "#C8D9EF" }} />
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Next lesson in ${formatCooldown(remaining)}` : "Join the Lesson"}
          onPrimary={handleLesson}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() => handleUpgrade("A smart board, a reading corner, room for more learners.")}
        />

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Sharpening pencils…</Text>}
      </ScrollView>
    </View>
  );
}
