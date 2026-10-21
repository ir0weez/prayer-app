// Museum interior: exhibits and artifacts telling the town's story.
// Villagers wander the galleries — ancient pottery, a great fossil, star
// maps, and paintings. The pawn tours the halls with them.
// "Tour the Halls" grants coins + XP on a 1-hour cooldown.
// L1: two galleries, rope barriers. L2: fossil hall, more exhibits.
// L3: grand museum — great fossil centerpiece, glass dome, gold frames.
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
import { PaperRoomScene, type PaperCastEntry } from "@/components/paper-room";
import { PAPER_ROOMS } from "@/lib/paper-rooms";
import { formatCooldown } from "@/lib/gathering-places";
import { scaledCoins, scaledXP,
  formatCoins,
} from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";

const BG = "#F2EFE8";
const STONE = "#D6CDBB";
const STONE_DARK = "#8A7F6A";
const TEXT_DIM = "#A0977F";
const ACCENT = "#5B6B8C";
const GOLD = "#C9963C";

const TOUR_COINS: Record<number, number> = { 1: 70, 2: 140, 3: 260 };
const TOUR_XP: Record<number, number> = { 1: 5, 2: 10, 3: 20 };
const COOLDOWN_MS = 60 * 60 * 1000;
const TOUR_KEY = "prayercircle.interior.museum.tour.v1";

export default function MuseumInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const [lastTour, setLastTour] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(TOUR_KEY).catch(() => null);
      setLastTour(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastTour + COOLDOWN_MS - Date.now());
  const touring = pickPeople(people, `museum|${building?.id ?? "museum"}|tour`, 4);
  const docent = pickPeople(people, `museum|${building?.id ?? "museum"}|docent`, 1)[0];

  const cast: PaperCastEntry[] = [
    ...touring.map((person) => ({ person, pose: "stand" as const })),
    ...(docent ? [{ person: docent, pose: "stand" as const }] : []),
  ];

  const levelBlurb =
    level >= 3
      ? "A grand museum — tall display cases, gold-framed masters, and warm pendant light."
      : level >= 2
        ? "A fine museum — artifact cases and painted galleries."
        : "A humble gallery — two exhibits in glass cases, and stories on the walls.";

  const handleTour = async () => {
    if (remaining > 0) {
      Alert.alert("The halls are quiet", `You have seen every gallery for now.\n\nTour again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(TOUR_COINS[level] ?? 7);
    const xp = scaledXP(TOUR_XP[level] ?? 5);
    const t = Date.now();
    setLastTour(t);
    await AsyncStorage.setItem(TOUR_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `museum-tour-${t}`).catch(() => undefined);
    Alert.alert("Halls Toured", `You wander the galleries — every artifact a reminder of how far the town has come.\n\n+${formatCoins(c)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="museum" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="account-balance"
          iconColor={ACCENT}
          title="Museum"
          blurb={`Exhibits and artifacts telling the town's story. ${levelBlurb}`}
          accent="#DCD4BE"
        />

        {/* museum scene — paper cutout */}
        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["museum"]} level={level} cast={cast} pawn={pawn} pawnPose="stand" width={sceneWidth} />
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Tour the Halls"}
          onPrimary={handleTour}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "The Great Fossil, a glass dome, and gold-framed masters." : "The fossil hall, artifact cases, and painted galleries."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Tour the halls once an hour. Remember where you came from.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Opening the galleries…</Text>}
      </ScrollView>
    </View>
  );
}
