// Apartment Complex interior: a warm lobby. Villagers check their mail and
// chat in the lounge. L1: a simple lobby. L2: a bulletin board, plants, a
// cozy lounge. L3: luxury residences — marble underfoot, grand entrance
// doors, a brushed-gold elevator, a gilt gallery wall, a concierge desk, a
// grand chandelier, a garden view, a lounge hearth, and tall lobby palms.
// "Visit Neighbors" grants XP + a few coins on a 1-hour
// cooldown. No emojis — SVG art and MaterialIcons only.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, useWindowDimensions, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useInteriorData,
  InteriorHeader,
  InteriorBanner,
  InteriorActions,
} from "@/components/interior-shell";
import { pickPeople } from "@/components/activity-figures";
import { PaperRoomScene, type PaperCastEntry } from "@/components/paper-room";
import { PAPER_ROOMS } from "@/lib/paper-rooms";
import { formatCooldown } from "@/lib/gathering-places";
import { awardCustomXP } from "@/lib/xp-engine";

const BG = "#FBF3E8"; // warm cream
const CARD = "#FFFFFF";
const TERRA = "#B4593A"; // terracotta
const TERRA_DARK = "#8C3F28";
const WOOD = "#8B5E34";
const WOOD_DARK = "#5E3D22";
const GREEN = "#5B8A5E";
const GREEN_LIGHT = "#6FA372";
const TEXT = "#3A2E26";
const TEXT_DIM = "#9A8874";
const COOLDOWN_MS = 60 * 60 * 1000;
const STORAGE_KEY = "prayercircle.interior.apartments.neighbors.v1";
const COINS_BY_LEVEL = [20, 40, 80];
const XP_BY_LEVEL = [8, 14, 22];

export default function ApartmentsInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const [lastVisit, setLastVisit] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setLastVisit(Number(raw) || 0);
      } catch {}
    })();
  }, []);

  const remaining = Math.max(0, COOLDOWN_MS - (Date.now() - lastVisit));
  const neighbors = pickPeople(people, `apartments|${building?.id ?? "apartments"}`, 3);
  const coinsGain = COINS_BY_LEVEL[level - 1];
  const xpGain = XP_BY_LEVEL[level - 1];

  const cast: PaperCastEntry[] = neighbors.map((person, i) => ({
    person,
    pose: i === 0 ? ("stand" as const) : ("seated" as const),
  }));

  const levelBlurb =
    level >= 3
      ? "Luxury residences — quilted beds, pendant light, and neighbors gathered in the lounge."
      : level >= 2
        ? "Plants by the door, a rug in the lounge, friendly faces."
        : "A simple lobby where neighbors wave hello.";

  const handleVisit = async () => {
    if (remaining > 0) {
      Alert.alert("Good neighbor", `You've made all your rounds.\n\nVisit again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const t = Date.now();
    setLastVisit(t);
    await AsyncStorage.setItem(STORAGE_KEY, String(t)).catch(() => undefined);
    addCoins(coinsGain);
    await awardCustomXP(xpGain, `apartments-visit-${t}`).catch(() => undefined);
    Alert.alert(
      "Visit Neighbors",
      `You knock on doors, share news, and lend a hand.\n\n+${xpGain} XP  ·  +${coinsGain} coins`
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="apartment" iconColor={TERRA} title={buildingName} coins={coins} bg={BG} textColor={TEXT} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="people"
          iconColor={TERRA}
          title="A neighborhood, not just a building"
          blurb={`Everyone knows everyone here. ${levelBlurb}`}
          accent="#EFDCC8"
        />

        {/* apartments scene — paper cutout */}
        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["apartments"]} level={level} cast={cast} pawn={pawn} pawnPose="stand" width={sceneWidth} />
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `More visits in ${formatCooldown(remaining)}` : "Visit Neighbors"}
          onPrimary={handleVisit}
          primaryColor={TERRA}
          level={level}
          onUpgrade={() => handleUpgrade(level + 1 >= 3 ? "Marble floors, a grand entrance, an elevator, a gallery wall, a concierge, and a lounge hearth." : "A bulletin board, plants, and a cozy lounge.")}
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          A visit brings the community closer — and earns XP. Refreshes in an hour.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Tidying the lobby…</Text>}
      </ScrollView>
    </View>
  );
}
