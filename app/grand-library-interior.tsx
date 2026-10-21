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
import { Alert, ScrollView, Text, useWindowDimensions, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  InteriorActions,
  InteriorBanner,
  InteriorHeader,
  useInteriorData,
} from "@/components/interior-shell";
import { pickPeople } from "@/components/activity-figures";
import { PaperRoomScene } from "@/components/paper-room";
import { PAPER_ROOMS } from "@/lib/paper-rooms";

import { formatCooldown } from "@/lib/gathering-places";
import { scaledXP } from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";

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

  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const cast = [
    ...reading.map((person) => ({ person, pose: "seated" as const })),
    ...(browsing ? [{ person: browsing, pose: "stand" as const }] : []),
  ];

  const levelBlurb =
    level >= 3
      ? "A grand library — floor-to-ceiling stacks and tall arched windows."
      : level >= 2
        ? "A fine library — tall stacks and pendant lamps."
        : "A humble hall of books — two shelf walls, hushed and warm.";

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

        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["grand-library"]} level={level} cast={cast} pawn={pawn} pawnPose="seated" width={sceneWidth} />
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
