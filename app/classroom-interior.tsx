// Classroom interior: a bright classroom — desks, a board, villagers
// learning. L1: four desks, a plain board. L2: six desks, a wall map, a
// bookshelf. L3: a premier academy — eight desks, a glowing smart board,
// academy pennant flags, hanging pendant lights, a Wall of Honor, a science
// corner, a cozy reading corner, and plants everywhere.
// "Join the Lesson" grants XP on a 1-hour cooldown. No emojis — SVG art and
// MaterialIcons only.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, useWindowDimensions, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { formatCooldown } from "@/lib/gathering-places";
import { awardCustomXP } from "@/lib/xp-engine";
import {
  useInteriorData,
  InteriorHeader,
  InteriorBanner,
  InteriorActions,
} from "@/components/interior-shell";
import { pickPeople } from "@/components/activity-figures";
import { PaperRoomScene } from "@/components/paper-room";
import { PAPER_ROOMS } from "@/lib/paper-rooms";

import { VerseGame } from "@/components/verse-game";
import { PlayCard } from "@/components/mini-game-scene";
import { useMiniGameHost } from "@/components/mini-game-host";
import {
  getCachedSchoolPerks,
  refreshSchoolPerksCache,
  type SchoolPerks,
} from "@/lib/school-perks";

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

export default function ClassroomInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastLesson, setLastLesson] = useState(0);
  const [schoolPerks, setSchoolPerks] = useState<SchoolPerks | null>(null);

  // Complete the Verse, hosted here in the Scripture Classroom — shared
  // host (components/mini-game-host.ts): the same daily cap and payout
  // pipeline as the Bible Study Hall in town, including this classroom's
  // own verse multiplier (+10/25/40% by level).
  const verse = useMiniGameHost("verse", addCoins, {
    perkMult: () => getCachedSchoolPerks().verseMult,
  });

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(LESSON_KEY);
        setLastLesson(raw ? parseInt(raw, 10) || 0 : 0);
      } catch {}
    })();
    refreshSchoolPerksCache().then(setSchoolPerks).catch(() => undefined);
  }, []);
  const remaining = Math.max(0, lastLesson + LESSON_COOLDOWN_MS - Date.now());
  const lessonXp = LESSON_XP[level];
  const deskCount = level >= 3 ? 8 : level >= 2 ? 6 : 4;
  const learners = pickPeople(people, `classroom|${building?.id ?? "cls"}`, deskCount);

  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const levelBlurb =
    level >= 3
      ? "A premier academy — rows of desks, pendant lights, and plants in the corners."
      : level >= 2
        ? "A growing classroom — more desks and a rug underfoot."
        : "A simple classroom — a few desks, ready for the lesson.";

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

        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["classroom"]} level={level} cast={learners.map((person) => ({ person, pose: "seated" as const }))} pawn={pawn} pawnPose="seated" width={sceneWidth} />
        </View>
        {learners.length === 0 && !pawn && (
          <Text style={{ color: TEXT_DIM, fontSize: 12, fontStyle: "italic", textAlign: "center", marginTop: 8, marginBottom: 4 }}>
            The desks are empty — class hasn't started.
          </Text>
        )}

                <InteriorActions
          primaryLabel={remaining > 0 ? `Next lesson in ${formatCooldown(remaining)}` : "Join the Lesson"}
          onPrimary={handleLesson}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() => handleUpgrade("A smart board, a reading corner, room for more learners.")}
        />

        <PlayCard
          icon="quiz"
          title="Play: Complete the Verse"
          blurb={`A verse with one word missing — can you complete it? Eight rounds, and wisdom pays best.${schoolPerks && schoolPerks.verseMult > 1 ? ` This classroom lifts verse rewards +${Math.round((schoolPerks.verseMult - 1) * 100)}%.` : ""}`}
          playsLeft={verse.playsLeft}
          cap={verse.cap}
          accent={ACCENT}
          onPlay={() => verse.setPlaying(true)}
        />
        {verse.playing && (
          <VerseGame accent={ACCENT} onComplete={verse.handleComplete} onExit={() => verse.setPlaying(false)} />
        )}

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Sharpening pencils…</Text>}
      </ScrollView>
    </View>
  );
}
