// Library interior: a quiet grand library — tall shelves, study tables,
// villagers studying. L1: two shelves, one table. L2: four shelves, two
// tables, a globe. L3: a true grand library — towering shelves with rolling
// ladders, stone columns, grand windows, a chandelier, banker's lamps on every
// table, a plush reading nook, and a red-carpet runner. "Study" grants XP on
// a 1-hour cooldown — bigger than the bookstore (school building).
// No emojis — SVG art and MaterialIcons only.

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


const BG = "#F1EFE7"; // quiet parchment
const CARD = "#FFFFFF";
const WOOD = "#7A5A38";
const WOOD_DARK = "#4E3A24";
const ACCENT = "#2E7D32";
const ACCENT_DARK = "#1B5E20";
const TEXT = "#3E332A";
const TEXT_DIM = "#8A7B68";

const STUDY_KEY = "prayercircle.interior.library.study.v1";
const STUDY_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const STUDY_XP: Record<1 | 2 | 3, number> = { 1: 12, 2: 22, 3: 38 };

const SPINE_COLORS = ["#1B5E20", "#37474F", "#5D4037", "#6A1B9A", "#0D47A1", "#B71C1C", "#827717", "#4E342E"];

export default function LibraryInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastStudy, setLastStudy] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STUDY_KEY);
        setLastStudy(raw ? parseInt(raw, 10) || 0 : 0);
      } catch {}
    })();
  }, []);

  void addCoins;
  const remaining = Math.max(0, lastStudy + STUDY_COOLDOWN_MS - Date.now());
  const studyXp = STUDY_XP[level];
  const studiers = pickPeople(people, `library|${building?.id ?? "lib"}`, level >= 3 ? 5 : level >= 2 ? 4 : 2);

  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const levelBlurb =
    level >= 3
      ? "A true grand library — towering shelves and pendant lamps over the tables."
      : level >= 2
        ? "A growing reading room — more shelves, and a rug underfoot."
        : "A quiet corner — a couple of shelves and a good book.";

  const handleStudy = async () => {
    if (remaining > 0) {
      Alert.alert("Rest Your Eyes", `The books aren't going anywhere.\n\nStudy again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const t = Date.now();
    setLastStudy(t);
    await AsyncStorage.setItem(STUDY_KEY, String(t)).catch(() => undefined);
    await awardCustomXP(studyXp, `library-study-${t}`).catch(() => undefined);
    Alert.alert("Deep Study", `You lose yourself in a good book.\n\n+${studyXp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="local-library" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="local-library"
          iconColor={ACCENT}
          title="The Reading Hall"
          blurb={`Quiet study earns wisdom — worth +${studyXp} XP. ${levelBlurb}`}
          accent="#D8E4D4"
        />

        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["library"]} level={level} cast={studiers.map((person) => ({ person, pose: "seated" as const }))} pawn={pawn} pawnPose="seated" width={sceneWidth} />
        </View>
        {studiers.length === 0 && !pawn && (
          <Text style={{ color: TEXT_DIM, fontSize: 12, fontStyle: "italic", textAlign: "center", marginTop: 8, marginBottom: 4 }}>
            Only the turning of pages.
          </Text>
        )}

                <InteriorActions
          primaryLabel={remaining > 0 ? `Next study in ${formatCooldown(remaining)}` : "Study"}
          onPrimary={handleStudy}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() => handleUpgrade("More shelves, more tables, deeper wisdom.")}
        />

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Shhh… opening the library…</Text>}
      </ScrollView>
    </View>
  );
}
